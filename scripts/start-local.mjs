import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const LOOPBACK_HOST = '127.0.0.1';
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_DIR = path.resolve(MODULE_DIR, '..');
const require = createRequire(import.meta.url);
const MonthlyLifeGrid = require('../monthly/model.js');

function validateLifeGrid(data) {
  return MonthlyLifeGrid.assertCanonicalMonthly(data);
}

async function initializePrivateFile(privateFile, templateFile) {
  const templateText = await fs.readFile(templateFile, 'utf8');
  const initialData = JSON.parse(templateText);
  const initializedAt = new Date().toISOString();
  initialData.meta.active_period = initializedAt.slice(0, 7);
  initialData.meta.updated_at = initializedAt;
  initialData.meta.revision = 0;
  validateLifeGrid(initialData);
  const initializedText = `${JSON.stringify(initialData, null, 2)}\n`;
  await fs.mkdir(path.dirname(privateFile), { recursive: true });
  try {
    await fs.writeFile(privateFile, initializedText, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
}

function sendJson(response, statusCode, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.zip', 'application/zip'],
]);

function resolveStaticPath(projectDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
  } catch {
    return null;
  }
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some((segment) => {
    const normalized = segment.toLowerCase();
    return normalized === 'private' || normalized === '.git' || segment === '..';
  })) return null;
  const relativePath = segments.join(path.sep) || 'index.html';
  const filePath = path.resolve(projectDir, relativePath);
  if (filePath !== projectDir && !filePath.startsWith(`${projectDir}${path.sep}`)) return null;
  return filePath;
}

function isPathWithin(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

async function realPathIfPresent(filePath) {
  try {
    return await fs.realpath(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function serveStaticFile(request, response, projectDir, pathname, staticBoundary) {
  let filePath = resolveStaticPath(projectDir, pathname);
  if (!filePath) return false;
  try {
    const initialStat = await fs.stat(filePath);
    if (initialStat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
    const realFilePath = await fs.realpath(filePath);
    if (!isPathWithin(staticBoundary.root, realFilePath)) return false;
    if (staticBoundary.blocked.some((blockedPath) => isPathWithin(blockedPath, realFilePath))) return false;
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'Content-Length': body.length,
    });
    response.end(request.method === 'HEAD' ? undefined : body);
    return true;
  } catch {
    return false;
  }
}

async function handleRequest(request, response, { projectDir, privateFile, staticBoundary }) {
  let requestUrl;
  try {
    requestUrl = new URL(request.url || '/', `http://${LOOPBACK_HOST}`);
  } catch {
    sendJson(response, 400, { error: 'Bad request' });
    return;
  }

  if (requestUrl.pathname === '/api/life-grid') {
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const data = JSON.parse(await fs.readFile(privateFile, 'utf8'));
      validateLifeGrid(data);
      sendJson(response, 200, data);
    } catch {
      sendJson(response, 422, { error: '私人地图格式无效；修复文件后会自动恢复同步。' });
    }
    return;
  }

  if ((request.method === 'GET' || request.method === 'HEAD') && await serveStaticFile(request, response, projectDir, requestUrl.pathname, staticBoundary)) {
    return;
  }
  sendJson(response, 404, { error: 'Not found' });
}

export async function createLocalServer(options = {}) {
  const projectDir = path.resolve(options.projectDir || DEFAULT_PROJECT_DIR);
  const privateFile = path.resolve(options.privateFile || path.join(projectDir, 'private/life-grid-monthly.json'));
  const templateFile = path.resolve(options.templateFile || path.join(projectDir, 'templates/blank-life-grid-monthly.json'));
  await initializePrivateFile(privateFile, templateFile);
  const staticRoot = await fs.realpath(projectDir);
  const blockedCandidates = [path.join(projectDir, 'private'), path.join(projectDir, '.git'), privateFile];
  const blockedRoots = (await Promise.all(blockedCandidates.map(realPathIfPresent))).filter(Boolean);
  const staticBoundary = { root: staticRoot, blocked: [...new Set(blockedRoots)] };

  const server = http.createServer((request, response) => {
    handleRequest(request, response, { projectDir, privateFile, staticBoundary }).catch(() => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(response, 500, { error: 'Local server error' });
    });
  });
  server.privateFile = privateFile;
  return server;
}

export async function startLocalServer(options = {}) {
  const server = await createLocalServer(options);
  const port = options.port === undefined ? 4178 : Number(options.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口必须是 0 到 65535 之间的整数');

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, LOOPBACK_HOST);
  });

  const address = server.address();
  return {
    server,
    privateFile: server.privateFile,
    url: `http://${LOOPBACK_HOST}:${address.port}`,
  };
}

async function runFromCommandLine() {
  const configuredPort = process.argv[2] ?? process.env.LIFE_GRID_PORT;
  const running = await startLocalServer({ port: configuredPort === undefined ? 4178 : configuredPort });
  console.log(`Life Grid 已启动：${running.url}/monthly/?mode=personal`);
  console.log(`私人地图：${running.privateFile}`);

  const stop = () => running.server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runFromCommandLine().catch((error) => {
    console.error(`Life Grid 启动失败：${error.message}`);
    process.exitCode = 1;
  });
}
