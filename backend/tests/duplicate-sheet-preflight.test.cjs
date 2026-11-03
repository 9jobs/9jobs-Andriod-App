const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { DUPLICATE_SPREADSHEET_ID, READONLY_SCOPE, EXPECTED_HEADERS, assertSource, createReadOnlyClient, inspectValues, requestJson } = require('../scripts/inspect-duplicate-sheet.cjs');

test('source allowlist rejects missing IDs and every other spreadsheet before network access', async () => {
  for (const id of [undefined, '', 'other-spreadsheet']) assert.throws(() => assertSource(id), /approved Duplicate/);
  let calls = 0;
  await assert.rejects(createReadOnlyClient({ spreadsheetId: 'other-spreadsheet' }, { fetch: () => { calls++; } }), /approved Duplicate/);
  assert.equal(calls, 0);
});

test('service account requests only readonly scope and only the approved two source tabs', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const credentials = { type: 'service_account', client_email: 'fixture@example.invalid', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://untrusted.invalid' };
  const calls = [];
  const client = await createReadOnlyClient({ spreadsheetId: DUPLICATE_SPREADSHEET_ID, credentials }, {
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return Response.json({ access_token: 'unit-test-token', token_type: 'Bearer' });
      return Response.json({});
    },
  });
  const payload = jwt.verify(new URLSearchParams(calls[0].options.body).get('assertion'), publicKey, { algorithms: ['RS256'], audience: 'https://oauth2.googleapis.com/token' });
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(payload.scope, READONLY_SCOPE);
  assert.equal(payload.iss, credentials.client_email);
  await client.metadata(); await client.allJobs(); await client.candidateIndex();
  assert.equal(calls.length, 4);
  for (const { url, options } of calls.slice(1)) {
    assert.ok(url.startsWith(`https://sheets.googleapis.com/v4/spreadsheets/${DUPLICATE_SPREADSHEET_ID}`));
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
  }
  assert.match(decodeURIComponent(calls[2].url), /'All_Jobs'!A:L/);
  assert.match(decodeURIComponent(calls[3].url), /'Candidate_Index'!A:D/);
  assert.deepEqual(Object.keys(client).sort(), ['allJobs', 'candidateIndex', 'metadata']);
});

test('schema mismatch and empty source fail closed without an import', () => {
  const index = { values: [['Candidate (click name)', 'Total Jobs']] };
  for (const values of [[], [EXPECTED_HEADERS], [['unexpected'], ['value']]]) {
    assert.throws(() => inspectValues({ values }, index), /empty|headers/);
  }
});

test('candidate view inspection is opt-in, rejects other tab IDs and retains GET-only scope', async () => {
  const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const calls=[];
  const client=await createReadOnlyClient({spreadsheetId:DUPLICATE_SPREADSHEET_ID,candidateSheetIds:['123'],credentials:{type:'service_account',client_email:'fixture@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})}}, {
    fetch:async(url,options)=>{calls.push({url,options});if(calls.length===1)return Response.json({access_token:'unit-only-token',token_type:'Bearer'});return Response.json({sheets:[{properties:{sheetId:123,title:'Approved candidate'}}]});},
  });
  await assert.rejects(client.candidateView('456'),/Unapproved/);
  assert.equal(calls.length,1);
  await client.candidateView('123');
  assert.equal(calls.length,3);
  assert.ok(calls.slice(1).every(c=>c.options.method==='GET'));
  assert.match(decodeURIComponent(calls[2].url),/'Approved candidate'!A:L/);
  assert.equal(client.write,undefined);
});

test('preflight counts identity and index problems without exposing candidate data', () => {
  const result = inspectValues({ values: [EXPECTED_HEADERS,
    ['Fixture Client', '28/01/2025', '1', 'Analyst', 'Fixture Co', '', '', '', '', 'private@example.invalid'],
    ['Fixture Client', '29/01/2025', '1', 'Analyst', 'Fixture Co'], [],
    ['Unindexed Fixture', '', '', '', ''],
  ] }, { values: [['Candidate (click name)', 'Total Jobs', '', '__9JOBS_AUTO_CANDIDATE_VIEW__'], ['Fixture Client', '2'], ['Fixture Client', '99']] });
  assert.equal(result.sourceRecords, 3);
  assert.equal(result.candidateLabels, 2);
  assert.equal(result.candidateSerialCollisions, 1);
  assert.equal(result.duplicateIndexNames, 1);
  assert.equal(result.mismatchedIndexCounts, 1);
  assert.equal(result.incompleteRows, 1);
  assert.equal(result.missingFromIndex, 1);
  assert.equal(result.importedRecords, 0);
  assert.equal(result.importEnabled, false);
  assert.doesNotMatch(JSON.stringify(result), /Fixture|private@example/);
});

test('transient failures retry with a bound; permission failures do not leak upstream data', async () => {
  let calls = 0;
  const waits = [];
  const value = await requestJson('https://sheets.googleapis.com', {}, { fetch: async () => ++calls < 3 ? new Response('private body', { status: 503 }) : Response.json({ ok: true }), wait: async ms => waits.push(ms) });
  assert.equal(value.ok, true); assert.equal(calls, 3); assert.deepEqual(waits, [500, 1000]);
  await assert.rejects(requestJson('https://sheets.googleapis.com', {}, { fetch: async () => new Response('private source details', { status: 403 }) }), error => error.message.includes('403') && !error.message.includes('private'));
  calls = 0;
  await assert.rejects(requestJson('https://sheets.googleapis.com', {}, { fetch: async () => { calls++; throw new Error('private credential'); }, wait: async () => {} }), /timed out/);
  assert.equal(calls, 4);
  calls=0;const limited=await requestJson('https://sheets.googleapis.com',{}, {fetch:async()=>++calls===1?new Response('private',{status:429}):Response.json({recovered:true}),wait:async()=>{}});
  assert.equal(limited.recovered,true);assert.equal(calls,2);
});

test('source reordering and changing row numbers preserve the content fingerprint without collapsing repeated records', () => {
  const first = ['Fixture', '28/01/2025', '1', 'Analyst', 'Company', '', '', '', '', '', '', '6'];
  const second = ['Fixture', '29/01/2025', '1', 'Analyst', 'Company', '', 'https://example.invalid/job', '', '', '', '', '7'];
  const index = { values: [['Candidate (click name)', 'Total Jobs'], ['Fixture', '3']] };
  const baseline = inspectValues({ values: [EXPECTED_HEADERS, first, second, [...first.slice(0, 11), '8']] }, index);
  const reordered = inspectValues({ values: [EXPECTED_HEADERS, [...first.slice(0, 11), '900'], [...first.slice(0, 11), '901'], [...second.slice(0, 11), '902']] }, index);
  assert.equal(baseline.contentFingerprint, reordered.contentFingerprint);
  assert.equal(baseline.sourceRecords, 3);
  assert.equal(baseline.exactContentDuplicates, 1);
  assert.equal(baseline.candidateSerialCollisions, 2);
  assert.equal(baseline.candidateSourceRowCollisions, 0);
  assert.equal(baseline.missingJobLinks, 2);
  assert.equal(baseline.indexCountsMatch, true);
  const changed = inspectValues({ values: [EXPECTED_HEADERS, first, second] }, index);
  assert.notEqual(baseline.contentFingerprint, changed.contentFingerprint);
  assert.equal(changed.indexCountsMatch, false);
});

test('preflight handles more than 35000 rows without using serial number as an identity', () => {
  const rows = Array.from({ length: 35089 }, (_, i) => ['Fixture', '2025-01-28', '1', 'Analyst', 'Company', '', '', '', '', '', '', String(i + 1)]);
  const result = inspectValues({ values: [EXPECTED_HEADERS, ...rows] }, { values: [['Candidate (click name)', 'Total Jobs'], ['Fixture', '35,089']] });
  assert.equal(result.sourceRecords, 35089);
  assert.equal(result.candidateSourceRowCollisions, 0);
  assert.equal(result.candidateSerialCollisions, 35088);
  assert.equal(result.exactContentDuplicates, 35088);
  assert.equal(result.dateFormats.other, 35089);
  assert.equal(result.indexCountsMatch, true);
  assert.equal(result.importedRecords, 0);
});

test('normalizing source row whitespace exposes ambiguous keys rather than silently overwriting', () => {
  const result = inspectValues({ values: [EXPECTED_HEADERS,
    ['Fixture', '28/01/2025', '1', 'Analyst', 'Company', '', '', '', '', '', '', '6'],
    ['Fixture ', '29/01/2025', '2', 'Other role', 'Other company', '', '', '', '', '', '', '6 '],
  ] }, { values: [['Candidate (click name)', 'Total Jobs'], ['Fixture', '2']] });
  assert.equal(result.candidateSourceRowCollisions, 1);
  assert.equal(result.exactContentDuplicates, 0);
  assert.equal(result.importEnabled, false);
});
