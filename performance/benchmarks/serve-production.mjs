import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const v4 = process.argv.includes('--upstream-v4');
const port = v4 ? 3000 : 5173;
const upstreamPort = v4 ? 8081 : process.argv.includes('--upstream-v3') ? 18083 : process.argv.includes('--upstream-v2') ? 18082 : 8080;
const root = await realpath(fileURLToPath(new URL('../../dist/watchwise/browser/', import.meta.url)));
const index = resolve(root, 'index.html');
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const insideBuild = (path) => path.startsWith(root + sep);

async function hashBuild(directory, hash) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await hashBuild(path, hash);
    } else if (entry.isFile()) {
      const digest = createHash('sha256');
      for await (const chunk of createReadStream(path)) digest.update(chunk);
      hash.update(relative(root, path).split(sep).join('/') + '\0' + digest.digest('hex') + '\n');
    } else {
      throw Error('Unexpected entry in the Angular build.');
    }
  }
}

await stat(index);
const hash = createHash('sha256');
await hashBuild(root, hash);
const build = hash.digest('hex');
if (process.argv[2] === '--hash') {
  console.log(build);
  process.exit(0);
}

function proxy(req, res) {
  const upstream = request({
    hostname: host, port: upstreamPort, path: req.url, method: req.method, headers: req.headers,
  }, (response) => {
    res.writeHead(response.statusCode, response.headers);
    response.on('error', () => res.destroy());
    response.pipe(res);
  });
  upstream.setTimeout(60_000, () => upstream.destroy());
  upstream.on('error', () => {
    if (res.headersSent) res.destroy();
    else res.writeHead(502).end();
  });
  res.on('close', () => upstream.destroy());
  req.on('error', () => upstream.destroy());
  req.pipe(upstream);
}

async function serve(req, res) {
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) {
    res.writeHead(400).end();
    return;
  }
  if (!req.url?.startsWith('/') || req.url.startsWith('//')) {
    res.writeHead(400).end();
    return;
  }
  const pathname = decodeURIComponent(req.url.split('?')[0]);
  if (/^\/api\/v1(?:\/|$)/.test(pathname)) {
    proxy(req, res);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  const path = resolve(root, '.' + pathname);
  if (path !== root && !insideBuild(path)) {
    res.writeHead(400).end();
    return;
  }
  const file = await realpath(path).catch((error) => {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  });
  let target = file && insideBuild(file) && (await stat(file)).isFile() ? file : null;
  if (!target && !pathname.startsWith('/api/') && !extname(pathname) &&
      req.headers.accept?.includes('text/html')) target = index;
  if (!target) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': contentTypes[extname(target)] ?? 'application/octet-stream',
    'content-length': (await stat(target)).size,
    'cache-control': 'no-cache',
    'x-watchwise-build': build,
    'x-watchwise-upstream': String(upstreamPort),
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(target).on('error', () => res.destroy()).pipe(res);
}

createServer((req, res) => {
  serve(req, res).catch((error) => {
    if (res.headersSent) res.destroy();
    else res.writeHead(error instanceof URIError ? 400 : 500).end();
  });
}).listen(port, host, () => console.log('WatchWise estático em http://localhost:5173 · SHA-256 ' + build));
