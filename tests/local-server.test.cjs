const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Model = require('../monthly/model.js');

const project = path.resolve(__dirname, '..');
const serverModuleUrl = new URL(`file://${path.join(project, 'scripts/start-local.mjs')}`);

test('local server exposes testable create and start APIs', async () => {
  const localServer = await import(serverModuleUrl);
  assert.equal(typeof localServer.createLocalServer, 'function');
  assert.equal(typeof localServer.startLocalServer, 'function');
});

test('blank clone-first template is a valid private monthly map with revision zero', () => {
  const templatePath = path.join(project, 'templates/blank-life-grid-monthly.json');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const normalized = Model.normalizeMonthly(template);

  assert.equal(template.meta.visibility, 'private');
  assert.equal(template.meta.revision, 0);
  assert.equal(normalized.center.status, 'raw');
  assert.equal(normalized.center.desired_state, '');
  assert.deepEqual(normalized.dimensions, []);
});

test('fresh clone start initializes the private map and serves it only on loopback', async (t) => {
  const localServer = await import(serverModuleUrl);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'life-grid-local-'));
  const privateFile = path.join(sandbox, 'private/life-grid-monthly.json');
  const startedAt = Date.now();
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const running = await localServer.startLocalServer({
    projectDir: project,
    privateFile,
    templateFile: path.join(project, 'templates/blank-life-grid-monthly.json'),
    port: 0,
  });
  t.after(() => new Promise((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve())));

  assert.equal(running.server.address().address, '127.0.0.1');
  assert.equal(fs.existsSync(privateFile), true);
  const initialized = JSON.parse(fs.readFileSync(privateFile, 'utf8'));
  assert.equal(initialized.meta.active_period, new Date().toISOString().slice(0, 7));
  assert.equal(initialized.meta.revision, 0);
  assert.ok(Date.parse(initialized.meta.updated_at) >= startedAt - 1000);
  assert.ok(Date.parse(initialized.meta.updated_at) <= Date.now() + 1000);

  const response = await fetch(`${running.url}/api/life-grid`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(body, JSON.parse(fs.readFileSync(privateFile, 'utf8')));
  assert.doesNotThrow(() => Model.normalizeMonthly(body));
});

test('static site is served while private and git internals are never exposed', async (t) => {
  const localServer = await import(serverModuleUrl);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'life-grid-static-'));
  const privateFile = path.join(sandbox, 'private/life-grid-monthly.json');
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const running = await localServer.startLocalServer({
    projectDir: project,
    privateFile,
    templateFile: path.join(project, 'templates/blank-life-grid-monthly.json'),
    port: 0,
  });
  t.after(() => new Promise((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve())));

  const page = await fetch(`${running.url}/monthly/index.html`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /^text\/html/);
  assert.match(await page.text(), /<!doctype html>/i);

  for (const requestPath of ['/private/life-grid-monthly.json', '/private%2Flife-grid-monthly.json', '/PRIVATE/life-grid-monthly.json', '/.git/HEAD', '/.GIT/HEAD']) {
    const response = await fetch(`${running.url}${requestPath}`);
    assert.equal(response.status, 404, `${requestPath} must not be exposed`);
  }
});

test('static serving does not follow aliases into private or git data', async (t) => {
  const localServer = await import(serverModuleUrl);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'life-grid-alias-'));
  const projectFixture = path.join(sandbox, 'project');
  fs.mkdirSync(path.join(projectFixture, 'monthly'), { recursive: true });
  fs.mkdirSync(path.join(projectFixture, 'templates'), { recursive: true });
  fs.mkdirSync(path.join(projectFixture, 'private'), { recursive: true });
  fs.mkdirSync(path.join(projectFixture, '.git'), { recursive: true });
  fs.writeFileSync(path.join(projectFixture, 'monthly/index.html'), '<!doctype html><title>fixture</title>');
  fs.copyFileSync(path.join(project, 'templates/blank-life-grid-monthly.json'), path.join(projectFixture, 'templates/blank-life-grid-monthly.json'));
  fs.copyFileSync(path.join(project, 'templates/blank-life-grid-monthly.json'), path.join(projectFixture, 'private/life-grid-monthly.json'));
  fs.writeFileSync(path.join(projectFixture, '.git/HEAD'), 'ref: refs/heads/main\n');
  fs.symlinkSync(path.join(projectFixture, 'private'), path.join(projectFixture, 'map-alias'), 'dir');
  fs.symlinkSync(path.join(projectFixture, '.git'), path.join(projectFixture, 'git-alias'), 'dir');
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const running = await localServer.startLocalServer({ projectDir: projectFixture, port: 0 });
  t.after(() => new Promise((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve())));

  for (const requestPath of ['/map-alias/life-grid-monthly.json', '/git-alias/HEAD']) {
    const response = await fetch(`${running.url}${requestPath}`);
    assert.equal(response.status, 404, `${requestPath} must not escape the static boundary`);
  }
});

test('root start command is executable and delegates to the dependency-free server', () => {
  const startPath = path.join(project, 'start');
  const stat = fs.statSync(startPath);
  const script = fs.readFileSync(startPath, 'utf8');

  assert.notEqual(stat.mode & 0o111, 0);
  assert.match(script, /^#!\/bin\/sh/);
  assert.match(script, /scripts\/start-local\.mjs/);
});

test('API reports an invalid private edit as 422 and recovers on the next valid revision', async (t) => {
  const localServer = await import(serverModuleUrl);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'life-grid-recovery-'));
  const privateFile = path.join(sandbox, 'private/life-grid-monthly.json');
  const original = JSON.parse(fs.readFileSync(path.join(project, 'templates/blank-life-grid-monthly.json'), 'utf8'));
  original.meta.revision = 4;
  original.center.desired_state = '保留已有的私人内容';
  fs.mkdirSync(path.dirname(privateFile), { recursive: true });
  fs.writeFileSync(privateFile, `${JSON.stringify(original, null, 2)}\n`);
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const running = await localServer.startLocalServer({
    projectDir: project,
    privateFile,
    templateFile: path.join(project, 'templates/blank-life-grid-monthly.json'),
    port: 0,
  });
  t.after(() => new Promise((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve())));

  const before = await fetch(`${running.url}/api/life-grid`);
  assert.equal(before.status, 200);
  assert.equal((await before.json()).center.desired_state, '保留已有的私人内容');

  fs.writeFileSync(privateFile, '{ this is temporarily invalid JSON');
  const invalid = await fetch(`${running.url}/api/life-grid`);
  assert.equal(invalid.status, 422);
  assert.equal(invalid.headers.get('cache-control'), 'no-store');

  const repaired = structuredClone(original);
  repaired.meta.revision = 5;
  repaired.center.desired_state = '修复后自动恢复';
  fs.writeFileSync(privateFile, `${JSON.stringify(repaired, null, 2)}\n`);
  const after = await fetch(`${running.url}/api/life-grid`);
  assert.equal(after.status, 200);
  assert.equal((await after.json()).meta.revision, 5);
});

test('API returns 422 instead of normalizing invalid canonical private fields', async (t) => {
  const localServer = await import(serverModuleUrl);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'life-grid-canonical-'));
  const privateFile = path.join(sandbox, 'private/life-grid-monthly.json');
  const valid = JSON.parse(fs.readFileSync(path.join(project, 'monthly/sample-monthly-life-grid.json'), 'utf8'));
  valid.meta.revision = 3;
  fs.mkdirSync(path.dirname(privateFile), { recursive: true });
  fs.writeFileSync(privateFile, `${JSON.stringify(valid, null, 2)}\n`);
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const running = await localServer.startLocalServer({
    projectDir: project,
    privateFile,
    templateFile: path.join(project, 'templates/blank-life-grid-monthly.json'),
    port: 0,
  });
  t.after(() => new Promise((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve())));

  assert.equal((await fetch(`${running.url}/api/life-grid`)).status, 200);

  const invalidMaps = [
    (() => { const map = structuredClone(valid); map.meta.revision = -1; return map; })(),
    (() => { const map = structuredClone(valid); map.center.status = 'approved'; return map; })(),
    (() => { const map = structuredClone(valid); delete map.dimensions[0].id; return map; })(),
    (() => {
      const map = structuredClone(valid);
      const secondRoom = structuredClone(map.dimensions[0]);
      secondRoom.id = 'health';
      secondRoom.title = '健康';
      secondRoom.support_factors[0].id = 'health-energy';
      map.dimensions.push(secondRoom);
      map.dimensions[0].periods[0].todos[0].direction_id = 'health-energy';
      return map;
    })(),
  ];

  for (const invalid of invalidMaps) {
    fs.writeFileSync(privateFile, `${JSON.stringify(invalid, null, 2)}\n`);
    const response = await fetch(`${running.url}/api/life-grid`);
    assert.equal(response.status, 422);
  }

  fs.writeFileSync(privateFile, `${JSON.stringify(valid, null, 2)}\n`);
  assert.equal((await fetch(`${running.url}/api/life-grid`)).status, 200);
});

test('static build is an explicit allowlist and never copies private data', () => {
  const buildScript = fs.readFileSync(path.join(project, 'scripts/build-static.sh'), 'utf8');
  assert.match(buildScript, /for file in /);
  assert.doesNotMatch(buildScript, /cp[^\n]*private\//);
});
