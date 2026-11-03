// Read-only preflight. Never imports records or accesses another spreadsheet.
const fs = require('node:fs/promises');
const jwt = require('jsonwebtoken');
const { createHash } = require('node:crypto');

const DUPLICATE_SPREADSHEET_ID = '1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU';
const READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EXPECTED_HEADERS = ['Candidate', 'Applied Date', 'Serial No', 'Position', 'Company', 'Company URL', 'Job Link', 'Recruiter', 'Contact', 'Email', 'Message', 'Source Row'];

async function requestJson(url, options = {}, dependencies = {}) {
  const fetcher = dependencies.fetch || fetch;
  const wait = dependencies.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; attempt < 4; attempt++) {
    let response;
    try {
      response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch {
      if (attempt === 3) throw new Error('Google request failed or timed out; no records were imported');
      await wait(500 * 2 ** attempt);
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await response.arrayBuffer();
      await wait(500 * 2 ** attempt);
      continue;
    }
    // Do not include upstream bodies, request headers, or private cell values in errors.
    if (!response.ok) throw new Error(`Google returned HTTP ${response.status}; check read-only account access`);
    try { return await response.json(); }
    catch { throw new Error('Google returned invalid JSON'); }
  }
}

function assertSource(spreadsheetId) {
  if (spreadsheetId !== DUPLICATE_SPREADSHEET_ID) {
    throw new Error('Only the explicitly approved Duplicate Spreadsheet ID is allowed');
  }
}

async function createReadOnlyClient({ spreadsheetId, credentials, registryProtocol = false, candidateSheetIds = [] }, dependencies = {}) {
  assertSource(spreadsheetId);
  if (credentials?.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
    throw new Error('A server-side Google service-account credential is required');
  }
  // Pin the token destination rather than trusting token_uri inside a JSON file.
  const assertion = jwt.sign({ scope: READONLY_SCOPE }, credentials.private_key, {
    algorithm: 'RS256', issuer: credentials.client_email, audience: TOKEN_URL, expiresIn: 3600,
  });
  const token = await requestJson(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  }, dependencies);
  if (!token.access_token || String(token.token_type).toLowerCase() !== 'bearer') throw new Error('Google did not issue a bearer access token');
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  async function get(path) {
    return requestJson(root + path, { method: 'GET', headers: { Authorization: `Bearer ${token.access_token}` } }, dependencies);
  }
  const client = {
    metadata: () => get('?fields=spreadsheetId,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))'),
    // Deliberately no generic range, spreadsheet, write, Drive, or candidate-tab method.
    allJobs: () => get('/values/' + encodeURIComponent("'All_Jobs'!A:L") + '?valueRenderOption=FORMATTED_VALUE'),
    candidateIndex: () => get('/values/' + encodeURIComponent("'Candidate_Index'!A:D") + '?valueRenderOption=FORMATTED_VALUE'),
  };
  if (candidateSheetIds.length) {
    if (!candidateSheetIds.every(id=>/^\d+$/.test(String(id)))) throw new Error('Numeric candidate sheet allowlist required');
    client.candidateIndexLinks = () => get('?ranges='+encodeURIComponent("'Candidate_Index'!A:D")+'&includeGridData=true&fields=sheets(properties(sheetId,title),data(startRow,rowData(values(hyperlink,note,userEnteredValue,textFormatRuns))))');
    client.candidateView = async sheetId => {
      if (!candidateSheetIds.map(String).includes(String(sheetId))) throw new Error('Unapproved candidate sheet ID');
      const metadata = await get('?fields=sheets.properties(sheetId,title)');
      const sheet = metadata.sheets?.find(item => String(item.properties.sheetId) === String(sheetId));
      if (!sheet || ['All_Jobs','Candidate_Index','Client_Registry'].includes(sheet.properties.title)) throw new Error('Candidate view required');
      const name = sheet.properties.title.replace(/'/g,"''");
      return get('?ranges='+encodeURIComponent("'"+name+"'!A:L")+'&includeGridData=true&fields=sheets(properties(sheetId,title),developerMetadata,data(startRow,startColumn,rowData(values(formattedValue,hyperlink,note,userEnteredValue,textFormatRuns))))');
    };
    // Quota-conscious multi-range GET. IDs must have been selected from Candidate_Index links.
    client.candidateViews = async sheetIds => {
      if(!Array.isArray(sheetIds)||!sheetIds.length||sheetIds.length>10||sheetIds.some(id=>!candidateSheetIds.map(String).includes(String(id))))throw new Error('Unapproved candidate batch');
      const metadata=await client.metadata();
      const ranges=sheetIds.map(id=>{
        const sheet=metadata.sheets?.find(s=>String(s.properties.sheetId)===String(id));
        if(!sheet||['All_Jobs','Candidate_Index','Client_Registry'].includes(sheet.properties.title))throw new Error('Candidate view required');
        return 'ranges='+encodeURIComponent("'"+sheet.properties.title.replace(/'/g,"''")+"'!A:L");
      });
      return get('?'+ranges.join('&')+'&includeGridData=true&fields=sheets(properties(sheetId,title),data(startRow,rowData(values(formattedValue,hyperlink))))');
    };
  }
  if (registryProtocol) {
    const range = (name,columns) => get('/values/'+encodeURIComponent("'"+name+"'!A:"+columns)+'?valueRenderOption=FORMATTED_VALUE');
    client.registry = () => range('Client_Registry','G');
    client.syncManifest = () => range('Client_Sync_Manifest','F');
    client.syncLog = () => range('Client_Sync_Log','F');
    client.syncPart = name => {
      if (!/^_9JOBS_DATA_g_[a-f0-9]{32}_\d+$/.test(name)) throw new Error('Unapproved protocol tab');
      return range(name,'L');
    };
  }
  return client;
}

function inspectValues(allJobs, candidateIndex) {
  const rows = allJobs?.values;
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('All_Jobs is empty; no import is allowed');
  if (JSON.stringify(rows[0]) !== JSON.stringify(EXPECTED_HEADERS)) throw new Error('All_Jobs headers differ from the inspected schema; review before importing');
  const indexRows = candidateIndex?.values;
  if (!Array.isArray(indexRows) || indexRows[0]?.[0] !== 'Candidate (click name)' || indexRows[0]?.[1] !== 'Total Jobs') {
    throw new Error('Candidate_Index headers differ from the inspected schema');
  }
  const counts = new Map();
  const identities = new Set();
  const sourceRowKeys = new Set();
  const contentKeys = new Set();
  const fingerprints = [];
  let sourceRowCollisions = 0, exactContentDuplicates = 0, missingJobLinks = 0, missingSourceRows = 0;
  const dateFormats = { dayMonthYearWithSlash: 0, other: 0 };
  let nonemptyRows = 0, incompleteRows = 0, identityCollisions = 0;
  for (const row of rows.slice(1)) {
    if (!row.some(cell => String(cell ?? '').trim())) continue;
    nonemptyRows++;
    const [candidate, , serial, position, company] = row.map(cell => String(cell ?? '').trim());
    if (!candidate || !serial || !position || !company) incompleteRows++;
    if (candidate) counts.set(candidate, (counts.get(candidate) || 0) + 1);
    // Diagnostic only: this is NOT an approved identity or an import/upsert key.
    const identity = JSON.stringify([candidate, serial]);
    if (identities.has(identity)) identityCollisions++;
    identities.add(identity);
    const sourceRow = String(row[11] ?? '').trim();
    const sourceRowKey = JSON.stringify([candidate, sourceRow]);
    if (sourceRowKeys.has(sourceRowKey)) sourceRowCollisions++;
    sourceRowKeys.add(sourceRowKey);
    if (!sourceRow) missingSourceRows++;
    if (!String(row[6] ?? '').trim()) missingJobLinks++;
    const content = JSON.stringify(Array.from({ length: 11 }, (_, i) => String(row[i] ?? '')));
    if (contentKeys.has(content)) exactContentDuplicates++;
    contentKeys.add(content);
    fingerprints.push(createHash('sha256').update(content).digest('hex'));
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(row[1] ?? ''))) dateFormats.dayMonthYearWithSlash++;
    else dateFormats.other++;
  }
  const seenCandidates = new Set();
  let duplicateIndexNames = 0, mismatchedIndexCounts = 0, indexCandidates = 0;
  for (const row of indexRows.slice(1)) {
    const name = String(row[0] ?? '').trim();
    if (!name) continue;
    indexCandidates++;
    if (seenCandidates.has(name)) duplicateIndexNames++;
    seenCandidates.add(name);
    if (Number(String(row[1] ?? '').replace(/,/g, '')) !== (counts.get(name) || 0)) mismatchedIndexCounts++;
  }
  const missingFromIndex = [...counts.keys()].filter(name => !seenCandidates.has(name)).length;
  return {
    headers: rows[0], sourceRecords: nonemptyRows, candidateLabels: counts.size, indexCandidates,
    incompleteRows, candidateSerialCollisions: identityCollisions, duplicateIndexNames,
    mismatchedIndexCounts, missingFromIndex, importedRecords: 0,
    candidateSourceRowCollisions: sourceRowCollisions, missingSourceRows, missingJobLinks,
    exactContentDuplicates, dateFormats,
    // Diagnostic snapshot fingerprint only: includes duplicate multiplicities,
    // ignores source row numbers/order, and is never used as a business-record ID.
    contentFingerprint: createHash('sha256').update(fingerprints.sort().join('\n')).digest('hex'),
    indexCountsMatch: mismatchedIndexCounts === 0 && missingFromIndex === 0 && duplicateIndexNames === 0,
    // No names, contacts, email addresses, messages, tokens or source rows are printed.
    importEnabled: false,
    pending: ['approved immutable candidate/record identities', 'verified account mapping', 'source refresh completion protocol'],
  };
}

async function main() {
  const path = require('node:path');
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env.sheets.local'), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const spreadsheetId = process.env.GOOGLE_DUPLICATE_SPREADSHEET_ID;
  assertSource(spreadsheetId);
  const credentialPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE;
  if (!credentialPath) throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE is required; keep the key outside the repository');
  let credentials;
  try { credentials = JSON.parse(await fs.readFile(credentialPath, 'utf8')); }
  catch { throw new Error('Could not read the server-side service-account file'); }
  const client = await createReadOnlyClient({ spreadsheetId, credentials });
  const metadata = await client.metadata();
  if (metadata.spreadsheetId !== spreadsheetId) throw new Error('Unexpected spreadsheet response');
  const tabs = metadata.sheets?.map(sheet => sheet.properties.title) || [];
  if (!tabs.includes('All_Jobs') || !tabs.includes('Candidate_Index')) throw new Error('Required source worksheets are missing');
  const [jobs, index] = await Promise.all([client.allJobs(), client.candidateIndex()]);
  console.log(JSON.stringify(inspectValues(jobs, index), null, 2));
}

module.exports = { DUPLICATE_SPREADSHEET_ID, READONLY_SCOPE, EXPECTED_HEADERS, assertSource, requestJson, createReadOnlyClient, inspectValues };
if (require.main === module) main().catch(error => {
  // Signing errors can contain library details; whitelist our public diagnostics.
  const message = /^(Only |A server-side |Google |All_Jobs |Candidate_Index |GOOGLE_|Could not read|Unexpected spreadsheet|Required source)/.test(error.message)
    ? error.message : 'Sheet inspection failed; verify server-side configuration';
  console.error(message);
  process.exitCode = 1;
});
