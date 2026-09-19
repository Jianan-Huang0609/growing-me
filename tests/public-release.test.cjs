const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Model = require('../monthly/model.js');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = relative => JSON.parse(read(relative));

test('the teaching case is complete, fictional, and separate from the blank start', () => {
  const example = readJson('examples/teaching-life-grid-monthly.json');
  const blank = readJson('templates/blank-life-grid-monthly.json');
  assert.equal(Model.assertCanonicalMonthly(example), example);
  assert.equal(Model.assertCanonicalMonthly(blank), blank);
  assert.equal(example.meta.visibility, 'demo');
  assert.equal(example.dimensions.length, 8);
  assert.equal(example.dimensions.flatMap(room => room.support_factors).length, 64);
  assert.equal(example.dimensions.flatMap(room => room.periods.flatMap(period => period.todos)).length, 3);
  assert.equal(example.center.source_quote, '');
  assert.ok(example.dimensions.every(room => room.source_quote === ''));
  assert.ok(example.dimensions.flatMap(room => room.support_factors).every(direction => direction.source_quote === ''));
  assert.equal(blank.meta.visibility, 'private');
  assert.equal(blank.dimensions.length, 0);
  assert.equal(blank.center.status, 'raw');
});

test('the public site routes to the fictional example while blank import keeps its own storage', () => {
  const entry = read('public/index.html');
  const app = read('monthly/app.js');
  assert.match(entry, /monthly\/\?mode=example&amp;view=grid/);
  assert.match(app, /STARTER_STORAGE_KEY = 'growing-me-life-grid-starter-v1'/);
  assert.match(app, /if \(blankTemplateMode && incoming\.meta\.visibility === 'demo'\)/);
  assert.match(app, /const DEMO = publicDemoMode \? await loadTeachingExample\(\) : null/);
});
