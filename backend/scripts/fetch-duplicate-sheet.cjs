// Local, read-only source export. Does not import or publish private records.
const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { createReadOnlyClient, inspectValues, assertSource } = require('./inspect-duplicate-sheet.cjs');
const {readConsistentSource,readSample}=require('./sheet-source-consistency.cjs');

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.sheets.local'), quiet: true });
  const spreadsheetId = process.env.GOOGLE_DUPLICATE_SPREADSHEET_ID;
  assertSource(spreadsheetId);
  const credentialPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE;
  if (!credentialPath) throw new Error('Server-side credential file path is missing');
  let credentials;
  try { credentials = JSON.parse(await fs.readFile(credentialPath, 'utf8')); }
  catch { throw new Error('Server-side credential file could not be read'); }
  const client = await createReadOnlyClient({ spreadsheetId, credentials });
  const sample = process.argv.includes('--consistent') ? await readConsistentSource(client) : await readSample(client);
  const {allJobs,candidateIndex,diagnostics}=sample;
  const destination = path.resolve(__dirname, '../../.work/duplicate-sheet-data/latest.json');
  const output = {
    spreadsheetId, fetchedAt: new Date().toISOString(),
    purpose: 'Private local source export; not imported or published',
    sourceRefreshCompletionVerified: false,
    sourceValidation: sample.sourceValidation || null,
    allJobs: { range: allJobs.range, values: allJobs.values },
    candidateIndex: { range: candidateIndex.range, values: candidateIndex.values },
    diagnostics,
  };
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(output, null, 2), { flag: 'wx', mode: 0o600 });
    // Check the completed file before replacing the last successful fetch.
    const saved = JSON.parse(await fs.readFile(temporary, 'utf8'));
    if (inspectValues(saved.allJobs, saved.candidateIndex).contentFingerprint !== diagnostics.contentFingerprint) {
      throw new Error('Local export verification failed');
    }
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  console.log(JSON.stringify({
    fetchedAt: output.fetchedAt, recordsFetched: diagnostics.sourceRecords,
    candidateLabels: diagnostics.candidateLabels, indexCountsMatch: diagnostics.indexCountsMatch,
    consistentSample: sample.sourceValidation?.consistent || false,
    output: destination, bytes: (await fs.stat(destination)).size, importedRecords: 0,
  }, null, 2));
}

main().catch(() => {
  // Never print credentials or private upstream response bodies.
  console.error('Duplicate Sheet fetch failed; the last successful export was preserved. Check server-side configuration and access.');
  process.exitCode = 1;
});
