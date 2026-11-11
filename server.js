const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORTS = [8098, 8099];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

function handleRequest(req, res) {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    const safePath = path.normalize(path.join(ROOT, pathname));
    if (!safePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(safePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const isFrame = pathname.includes('/frames/');

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': isFrame ? 'public, max-age=31536000, immutable' : 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });

      fs.createReadStream(safePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

PORTS.forEach((port) => {
  const server = http.createServer(handleRequest);
  server.on('error', (err) => {
    console.log(`Port ${port} error:`, err.message);
  });
  server.listen(port, () => {
    console.log(`ZUKKO Ta'lim Markazi server running at http://localhost:${port}`);
  });
});
