// server/server.js
// Node.js server – serves static client files + WebSocket

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(CLIENT_DIR, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.on('message', message => {
    // Handle incoming messages
  });
  ws.send('Connected to Elite 2D server');
});

server.listen(PORT, () => {
  console.log(`Elite 2D running at http://localhost:${PORT}`);
});