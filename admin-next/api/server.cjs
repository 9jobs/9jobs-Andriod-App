const path = require('node:path');
const fs = require('node:fs');
const next = require('next');

const embeddedAdminPrefix = '/admin/website-admin';
let applicationsPromise;

async function getApplications() {
  if (!applicationsPromise) {
    const agreementsAdmin = next({
      dev: false,
      dir: path.join(process.cwd(), 'website-admin'),
    });

    applicationsPromise = agreementsAdmin.prepare().then(() => agreementsAdmin.getRequestHandler());
  }

  return applicationsPromise;
}

async function withRequestUrl(req, url, handler) {
  const originalUrl = req.url;
  req.url = url;
  try {
    return await handler();
  } finally {
    req.url = originalUrl;
  }
}

function splitUrl(url) {
  const queryIndex = url.indexOf('?');
  return queryIndex === -1
    ? [url, '']
    : [url.slice(0, queryIndex), url.slice(queryIndex)];
}

function agreementsUrl(url) {
  const [pathname, query] = splitUrl(url);
  const rest = pathname.slice(embeddedAdminPrefix.length) || '/';

  if (rest === '/api' || rest.startsWith('/api/')) return `${rest}${query}`;
  if (rest === '/_next' || rest.startsWith('/_next/')) {
    return `${embeddedAdminPrefix}${rest}${query}`;
  }

  return `${rest === '/' ? '/admin' : `/admin${rest}`}${query}`;
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveAdminStatic(req, res, pathname) {
  const publicDir = path.join(process.cwd(), 'public');
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const relativePath = path.posix.normalize(requestedPath).replace(/^\/+/, '');
  const filePath = path.join(publicDir, relativePath);

  // Only expose files bundled in public; all Admin SPA paths use its existing shell.
  if (filePath.startsWith(publicDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes[path.extname(filePath)] || 'application/octet-stream');
    res.setHeader('Cache-Control', relativePath.startsWith('_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    return fs.createReadStream(filePath).pipe(res);
  }

  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes['.html']);
    res.setHeader('Cache-Control', 'no-cache');
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.statusCode = 404;
  return res.end('Not Found');
}

module.exports = async (req, res) => {
  const agreements = await getApplications();
  const incomingUrl = req.url || '/';
  const rewriteUrl = new URL(incomingUrl, 'http://localhost');
  let requestUrl = incomingUrl;

  if (rewriteUrl.pathname === '/api/server') {
    const kind = rewriteUrl.searchParams.get('kind');
    const routePath = rewriteUrl.searchParams.get('path') || '';
    const originalQuery = new URLSearchParams(rewriteUrl.searchParams);
    originalQuery.delete('kind');
    originalQuery.delete('path');
    const query = originalQuery.size ? `?${originalQuery}` : '';

    if (kind === 'embedded') requestUrl = `${embeddedAdminPrefix}/${routePath}${query}`;
    if (kind === 'agreements') requestUrl = `/agreements/${routePath}${query}`;
    if (kind === 'fortnight-agreements') requestUrl = `/fortnight-agreements/${routePath}${query}`;
    if (kind === 'billing') requestUrl = `/billing/${routePath}${query}`;
  }
  const [pathname] = splitUrl(requestUrl);

  if (pathname === embeddedAdminPrefix || pathname.startsWith(`${embeddedAdminPrefix}/`)) {
    return withRequestUrl(req, agreementsUrl(requestUrl), () => agreements(req, res));
  }

  // Signing and billing emails are generated from the agreements service and
  // continue to use their existing public paths on the App Admin domain.
  if (
    pathname.startsWith('/agreements/') ||
    pathname.startsWith('/fortnight-agreements/') ||
    pathname.startsWith('/billing/')
  ) {
    return agreements(req, res);
  }

  return serveAdminStatic(req, res, pathname);
};
