#!/usr/bin/env node
// Static preview server with SPA-style routing support.
// Usage: node server.js <root-dir> <port> [--spa-fallback]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const port = parseInt(process.argv[3], 10);
const spaFallback = process.argv.includes('--spa-fallback');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// Parse netlify-style _redirects file, if present.
function loadRedirects(rootDir) {
  const file = path.join(rootDir, '_redirects');
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => l.trim().split(/\s+/))
      .filter((parts) => parts.length >= 2)
      .map(([from, to, status]) => ({ from, to, status: status || '200' }));
  } catch (e) {
    return [];
  }
}

const redirects = loadRedirects(root);

function matchRedirect(urlPath) {
  for (const r of redirects) {
    // support simple wildcard like /* -> /index.html
    if (r.from === urlPath) return r;
    if (r.from.endsWith('*') && urlPath.startsWith(r.from.slice(0, -1))) return r;
  }
  return null;
}

function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (e) {
    return null;
  }
  const clean = decoded.split('?')[0];
  const normalized = path.normalize('/' + clean).replace(/\\/g, '/');
  if (normalized.includes('..')) return null;

  let p = path.join(root, normalized);
  try {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const idx = path.join(p, 'index.html');
      return fs.existsSync(idx) ? idx : null;
    }
    if (stat.isFile()) return p;
  } catch (e) {}

  // Try as clean URL -> <path>.html
  const htmlFile = path.join(root, normalized + '.html');
  try {
    if (fs.statSync(htmlFile).isFile()) return htmlFile;
  } catch (e) {}

  // Directory-style -> <path>/index.html
  const dirIdx = path.join(root, normalized, 'index.html');
  try {
    if (fs.statSync(dirIdx).isFile()) return dirIdx;
  } catch (e) {}

  if (spaFallback) {
    const idx = path.join(root, 'index.html');
    return fs.existsSync(idx) ? idx : null;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  let rd = matchRedirect(urlPath);
  // Follow netlify-style redirects internally (status 200 = rewrite, others = redirect)
  while (rd) {
    if (rd.status === '200') {
      // internal rewrite — attempt to resolve the target file now
      const targetPath = rd.to.startsWith('/') ? rd.to : '/' + rd.to;
      const targetFile = resolveFile(targetPath);
      if (targetFile) {
        const ext = path.extname(targetFile).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        return fs.createReadStream(targetFile).pipe(res);
      }
      // fall back to re-resolving from root next iteration
      const nextRd = matchRedirect(rd.to.startsWith('/') ? rd.to : '/' + rd.to);
      if (!nextRd) break;
      rd = nextRd;
    } else {
      res.writeHead(parseInt(rd.status, 10) || 302, {
        Location: rd.to.startsWith('/') ? rd.to : '/' + rd.to,
      });
      return res.end();
    }
  }

  let file = resolveFile(urlPath);
  const NO_CACHE = { 'Cache-Control': 'no-store' };
  if (!file) {
    // not found page
    const nf = path.join(root, '404.html');
    const fallbackNf = path.join(root, 'not-found.html');
    if (fs.existsSync(nf)) file = nf;
    else if (fs.existsSync(fallbackNf)) file = fallbackNf;
    else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...NO_CACHE });
      return res.end('404 Not Found');
    }
    res.writeHead(404, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', ...NO_CACHE });
    const buf = fs.readFileSync(file);
    return res.end(buf);
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', ...NO_CACHE });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} on http://0.0.0.0:${port}`);
});