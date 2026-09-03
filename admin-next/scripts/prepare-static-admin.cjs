const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const publicDir = path.join(root, 'public');
const nextStaticDir = path.join(root, '.next', 'static');
const appHtml = path.join(root, '.next', 'server', 'app', 'index.html');

// The host Admin is a static SPA. Publish its build output as static files so
// the single serverless function can be dedicated to Agreements/Invoices.
fs.mkdirSync(path.join(publicDir, '_next'), { recursive: true });
fs.cpSync(nextStaticDir, path.join(publicDir, '_next', 'static'), {
  recursive: true,
  force: true,
});
fs.copyFileSync(appHtml, path.join(publicDir, 'index.html'));
