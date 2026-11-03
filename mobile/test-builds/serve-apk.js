const http = require('http');
const fs = require('fs');

const file = 'D:\\9jobs-App\\mobile\\test-builds\\9jobs-admob-test-debug.apk';
const path = '/9jobs-admob-test-debug.apk';

const server = http.createServer((request, response) => {
  if (request.url !== path) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const stat = fs.statSync(file);
  response.writeHead(200, {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Length': stat.size,
    'Content-Disposition': 'attachment; filename=9jobs-admob-test-debug.apk',
  });

  if (request.method !== 'HEAD') {
    fs.createReadStream(file).pipe(response);
  } else {
    response.end();
  }
});

server.listen(8090, '0.0.0.0');
setTimeout(() => server.close(), 30 * 60 * 1000);
