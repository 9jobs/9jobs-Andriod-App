const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register');
const { createApp } = require('../src/app');

test('the database adapter route exists and rejects unauthenticated access before database work', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/database/query`;
    for (const authorization of [undefined, 'Bearer invalid-token']) {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
        body: JSON.stringify({ table: 'profiles', method: 'GET' }),
      });
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /Unauthorized/);
    }
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
});
