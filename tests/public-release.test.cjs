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

test('the public site links separate Example and Blank entries while Blank keeps its own storage', () => {
  const entry = read('public/index.html');
  const app = read('monthly/app.js');
  assert.match(entry, /monthly\/\?mode=example&amp;view=grid/);
  assert.match(app, /STARTER_STORAGE_KEY = 'growing-me-life-grid-starter-v1'/);
  assert.match(app, /if \(blankTemplateMode && incoming\.meta\.visibility === 'demo'\)/);
  assert.match(app, /const DEMO = publicDemoMode \? await loadTeachingExample\(\) : null/);
});

test('both public copy buttons use the same stand-alone interview Prompt', () => {
  const entry = read('public/index.html');
  const app = read('monthly/app.js');
  const html = read('monthly/index.html');
  const prompt = read('monthly/life-grid-monthly-prompt.md');
  assert.equal(prompt, read('skills/growing-me-life-grid-monthly/references/life-grid-monthly-prompt.md'));
  const start = prompt.indexOf('<!-- COPY_START -->');
  const end = prompt.indexOf('<!-- COPY_END -->');
  assert.ok(start >= 0 && end > start, 'the public Prompt must have one copyable body');
  const body = prompt.slice(start, end);
  assert.match(body, /如果你暂时访问不到仓库/);
  assert.match(body, /用自然的欢迎语开始/);
  assert.match(body, /一次只问我一个尚未回答的问题/);
  assert.match(entry, /monthly\/life-grid-monthly-prompt\.md/);
  assert.match(app, /PUBLIC_PROMPT_URL = '\.\/life-grid-monthly-prompt\.md'/);
  assert.match(app, /fetch\(PUBLIC_PROMPT_URL\)/);
  assert.match(entry, /COPY_START/);
  assert.match(app, /COPY_START/);
  assert.match(html, /id="copyPromptButton"[^>]*>复制访谈 Prompt/);
  assert.match(html, /id="getSkillLink"[^>]*>获取完整 Skill/);
  assert.doesNotMatch(app, /function copySkill\(/);
});

test('Example trial additions and edits leave the original and blank fixtures untouched', () => {
  const original = readJson('examples/teaching-life-grid-monthly.json');
  const originalSnapshot = Model.clone(original);
  const blank = readJson('templates/blank-life-grid-monthly.json');
  const blankSnapshot = Model.clone(blank);
  const room = original.dimensions.find(dimension => Model.getActivePeriod(original, dimension.id)?.todos.length < 8);
  assert.ok(room, 'the example needs a room with space for a trial action');
  const directionId = room.support_factors[0].id;
  const trialId = 'test-example-trial-action';

  const trial = Model.clone(original);
  const added = Model.upsertTodo(trial, room.id, {
    id: trialId,
    direction_id: directionId,
    title: '试填一件本月行动',
    plan: '先写下一个小步骤',
    done_definition: '能观察到结果',
    status: 'planned',
    provenance: 'user',
    records: []
  });
  const edited = Model.upsertTodo(added, room.id, {
    ...Model.getActivePeriod(added, room.id).todos.find(todo => todo.id === trialId),
    plan: '调整为另一小步骤',
    status: 'doing'
  }, '这是一条试填记录');

  const originalCount = Model.getActivePeriod(original, room.id).todos.length;
  assert.equal(Model.getActivePeriod(added, room.id).todos.length, originalCount + 1);
  assert.equal(Model.getActivePeriod(edited, room.id).todos.length, originalCount + 1);
  const action = Model.getActivePeriod(edited, room.id).todos.find(todo => todo.id === trialId);
  assert.equal(action.plan, '调整为另一小步骤');
  assert.equal(action.status, 'doing');
  assert.equal(action.records.at(-1).text, '这是一条试填记录');
  assert.ok(Model.getTodosForDirection(edited, room.id, directionId).some(todo => todo.id === trialId));
  assert.equal(Model.assertCanonicalMonthly(added), added);
  assert.equal(Model.assertCanonicalMonthly(edited), edited);
  assert.deepEqual(original, originalSnapshot);
  assert.deepEqual(trial, originalSnapshot);
  assert.deepEqual(blank, blankSnapshot);
  assert.equal(blank.dimensions.length, 0);
});

test('Example direction workbench fields can change in a canonical trial clone only', () => {
  const original = readJson('examples/teaching-life-grid-monthly.json');
  const originalSnapshot = Model.clone(original);
  const trial = Model.clone(original);
  const originalDirection = original.dimensions[0].support_factors[0];
  const direction = trial.dimensions[0].support_factors[0];
  const fields = {
    title: '试填后的长期方向',
    desired_state: '我想靠近的新状态',
    anti_vision: '我不想滑向的状态',
    operating_loop: {
      input: '收集输入',
      practice: '持续实践',
      output: '产出作品',
      evidence: '观察证据',
      review: '定期回看'
    }
  };
  Object.assign(direction, fields);

  const normalized = Model.normalizeMonthly(trial);
  const changedDirection = normalized.dimensions[0].support_factors[0];
  assert.equal(Model.assertCanonicalMonthly(normalized), normalized);
  assert.equal(normalized.meta.visibility, 'demo');
  assert.equal(changedDirection.id, originalDirection.id);
  for (const [field, value] of Object.entries(fields)) assert.deepEqual(changedDirection[field], value);
  assert.deepEqual(normalized.dimensions[0].periods, original.dimensions[0].periods);
  assert.deepEqual(original, originalSnapshot);
  assert.notDeepEqual(changedDirection, originalDirection);
});

test('Example trial stays in memory while reset and export use the original case', () => {
  const app = read('monthly/app.js');
  const html = read('monthly/index.html');
  assert.match(app, /let data = publicDemoMode\s*\? Model\.clone\(DEMO\)/);
  assert.match(app, /function persist\(\) \{\s*if \(publicDemoMode \|\| localFileMode\) return false;/);
  assert.match(app, /data = Model\.upsertTodo\(data, dimensionId, todo, byId\('todoRecord'\)\.value\);\s*if \(publicDemoMode\) trialEdited = true;\s*else persist\(\);/);
  assert.match(app, /function resetExampleTrial\(\) \{[\s\S]*?data = Model\.clone\(DEMO\);/);
  assert.match(app, /JSON\.stringify\(publicDemoMode \? DEMO : data, null, 2\)/);
  assert.match(app, /byId\('resetExampleButton'\)\.addEventListener\('click', resetExampleTrial\)/);
  assert.match(app, /byId\('todoTrialNotice'\)\.hidden = !publicDemoMode/);
  assert.match(app, /publicDemoMode \? '放进本页试填' : '保存'/);
  assert.match(html, /id="resetExampleButton"[^>]*>恢复原始案例<\/button>/);
  assert.match(html, /id="todoTrialNotice"[^>]*>[^<]*只在当前页面生效[^<]*刷新或恢复后消失[^<]*不会进入“导出原始案例”/);
});

test('direction workbench trial form is Example-only with no persistence call', () => {
  const app = read('monthly/app.js');
  const html = read('monthly/index.html');
  for (const id of [
    'directionEditDialog', 'directionEditForm', 'directionEditName', 'directionEditGoal',
    'directionEditBaseline', 'directionEditInput', 'directionEditPractice',
    'directionEditOutput', 'directionEditEvidence', 'directionEditReview'
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="editDirectionButton"[^>]*data-direction-field="title"/);
  assert.match(html, /修改只留在当前页面；刷新或恢复后回到原始虚构案例，导出不含试填/);
  assert.match(app, /function openDirectionEditDialog\([^)]*\) \{\s*if \(!publicDemoMode \|\| !activeWorkbench\) return;/);
  assert.match(app, /dialog\.querySelectorAll\('\[data-direction-field\]'\)\.forEach\(button => \{ button\.hidden = !publicDemoMode; \}\)/);
  const start = app.indexOf("byId('directionEditForm').addEventListener('submit'");
  const end = app.indexOf("byId('directionWorkbenchDialog').addEventListener('close'", start);
  assert.ok(start >= 0 && end > start, 'the direction submit handler must be present');
  const submitHandler = app.slice(start, end);
  assert.match(submitHandler, /if \(!publicDemoMode\) return;/);
  assert.match(submitHandler, /const next = Model\.clone\(data\)/);
  assert.match(submitHandler, /Model\.assertCanonicalMonthly\(next\);\s*data = Model\.normalizeMonthly\(next\);\s*trialEdited = true;/);
  assert.doesNotMatch(submitHandler, /persist\(|localStorage|fetch\(|\/api\//);
});
