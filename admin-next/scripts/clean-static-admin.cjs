const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(process.cwd(), 'public');

// These files are generated after Next.js builds. They must not exist before
// the next build because Next reserves the /_next route for its own assets.
fs.rmSync(path.join(publicDir, '_next'), { recursive: true, force: true });
fs.rmSync(path.join(publicDir, 'index.html'), { force: true });
