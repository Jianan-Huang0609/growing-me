(function (root) {
  'use strict';
  const VERSION = '1.2.0-monthly';
  const TODO_STATUSES = ['planned', 'doing', 'done', 'paused'];
  const NODE_STATUSES = ['raw', 'candidate', 'confirmed', 'retired'];
  const SCENE_IDS = ['career-route', 'creator-gallery', 'ai-constellation', 'health-vitals', 'love-book', 'finance-ledger', 'life-cabinet', 'family-album'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const currentPeriod = () => new Date().toISOString().slice(0, 7);
  const periodLabel = period => {
    const [year, month] = String(period || currentPeriod()).split('-');
    return `${year} 年 ${Number(month)} 月`;
  };
  function blankData() {
    const period = currentPeriod();
    return {
      meta: { title: '我的人生地图', version: VERSION, revision: 0, updated_at: new Date().toISOString(), visibility: 'private', active_period: period },
      center: { title: '我想要的生活与成长', desired_state: '', source_quote: '', status: 'raw' },
      dimensions: []
    };
  }
  function normalizeOperatingLoop(loop = {}) {
    if (!loop || typeof loop !== 'object' || Array.isArray(loop)) return undefined;
    const normalized = clone(loop);
    for (const field of ['input', 'practice', 'output', 'evidence', 'review']) {
      if (typeof loop[field] === 'string' && loop[field].trim()) normalized[field] = loop[field];
      else delete normalized[field];
    }
    return Object.keys(normalized).length ? normalized : undefined;
  }
  function normalizeNode(node = {}) {
    const source = node && typeof node === 'object' && !Array.isArray(node) ? node : {};
    const normalized = {
      ...clone(source),
      title: typeof source.title === 'string' ? source.title : '',
      anti_vision: typeof source.anti_vision === 'string' ? source.anti_vision : '',
      desired_state: typeof source.desired_state === 'string' ? source.desired_state : '',
      summary: typeof source.summary === 'string' ? source.summary : '',
      source_quote: typeof source.source_quote === 'string' ? source.source_quote : '',
      status: NODE_STATUSES.includes(source.status) ? source.status : 'raw'
    };
    const operatingLoop = normalizeOperatingLoop(source.operating_loop);
    if (operatingLoop) normalized.operating_loop = operatingLoop;
    else delete normalized.operating_loop;
    return normalized;
  }
  function normalizeSupportFactor(factor = {}, index = 0, dimensionId = 'dimension') {
    const node = normalizeNode(factor);
    if (!node.title.trim()) throw new Error('长期方向必须先有用户确认或候选标题，不能自动命名');
    return {
      ...node,
      id: typeof factor.id === 'string' && factor.id ? factor.id : `${dimensionId}-direction-${index + 1}`,
      title: node.title
    };
  }
  function hasDirectionContent(factor = {}) {
    const node = normalizeNode(factor);
    return node.status !== 'raw' || [node.title, node.anti_vision, node.desired_state, node.summary, node.source_quote].some(value => value.trim());
  }
  function normalizeTodo(todo = {}) {
    const source = todo && typeof todo === 'object' && !Array.isArray(todo) ? todo : {};
    const normalized = {
      ...clone(source),
      id: typeof source.id === 'string' && source.id ? source.id : uid('todo'),
      title: typeof source.title === 'string' ? source.title : '',
      plan: typeof source.plan === 'string' ? source.plan : '',
      done_definition: typeof source.done_definition === 'string' ? source.done_definition : '',
      status: TODO_STATUSES.includes(source.status) ? source.status : 'planned',
      provenance: ['user', 'ai-candidate', 'user-confirmed'].includes(source.provenance) ? source.provenance : 'user-confirmed',
      records: Array.isArray(source.records) ? source.records.filter(Boolean).map(record => ({
        ...clone(record && typeof record === 'object' && !Array.isArray(record) ? record : {}),
        id: typeof record?.id === 'string' && record.id ? record.id : uid('record'),
        date: typeof record?.date === 'string' ? record.date : new Date().toISOString().slice(0, 10),
        text: typeof record?.text === 'string' ? record.text : ''
      })).filter(record => record.text.trim()) : []
    };
    if (typeof source.direction_id === 'string' && source.direction_id.trim()) normalized.direction_id = source.direction_id.trim();
    else delete normalized.direction_id;
    return normalized;
  }
  function normalizePeriod(period = {}, fallbackId) {
    const source = period && typeof period === 'object' && !Array.isArray(period) ? period : {};
    const id = typeof source.id === 'string' && /^\d{4}-\d{2}$/.test(source.id) ? source.id : fallbackId;
    return { ...clone(source), id, label: typeof source.label === 'string' && source.label ? source.label : periodLabel(id), todos: Array.isArray(source.todos) ? source.todos.slice(0, 8).map(normalizeTodo) : [] };
  }
  function normalizeMonthly(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('资料顶层必须是对象');
    const data = { ...clone(raw), ...blankData() };
    const active = typeof raw.meta?.active_period === 'string' && /^\d{4}-\d{2}$/.test(raw.meta.active_period) ? raw.meta.active_period : currentPeriod();
    const revision = Number.isInteger(raw.meta?.revision) && raw.meta.revision >= 0 ? raw.meta.revision : 0;
    data.meta = { ...data.meta, ...clone(raw.meta || {}), version: VERSION, revision, active_period: active };
    data.center = { ...normalizeNode(raw.center), title: normalizeNode(raw.center).title || '我想要的生活与成长' };
    const rawDimensions = Array.isArray(raw.dimensions) ? raw.dimensions : [];
    if (rawDimensions.length > 8) throw new Error('第一层最多包含 8 个维度');
    data.dimensions = rawDimensions.map((dimension, index) => {
      const node = normalizeNode(dimension);
      const dimensionId = typeof dimension.id === 'string' && dimension.id ? dimension.id : `dimension-${index + 1}`;
      const canonicalFactors = Array.isArray(dimension.support_factors) ? dimension.support_factors : [];
      const legacyFactors = Array.isArray(dimension.legacy_support_factors) ? dimension.legacy_support_factors : [];
      const hasCanonicalFactors = Object.prototype.hasOwnProperty.call(dimension, 'support_factors');
      const mayUseLegacyFallback = raw.meta?.version !== VERSION && !hasCanonicalFactors;
      const rawSupportFactors = mayUseLegacyFallback ? legacyFactors : canonicalFactors;
      if (rawSupportFactors.length > 8) throw new Error(`${node.title || `维度 ${index + 1}`}的长期方向最多包含 8 项`);
      const supportFactors = rawSupportFactors.filter(hasDirectionContent).map((factor, factorIndex) => normalizeSupportFactor(factor, factorIndex, dimensionId));
      const supportIds = supportFactors.map(item => item.id);
      if (new Set(supportIds).size !== supportIds.length) throw new Error(`${node.title || `维度 ${index + 1}`}的长期方向 id 不能重复`);
      const periods = Array.isArray(dimension.periods) ? dimension.periods.map(item => normalizePeriod(item, active)) : [];
      if (!periods.some(item => item.id === active)) periods.push(normalizePeriod({ id: active }, active));
      periods.forEach(period => period.todos.forEach(todo => {
        if (todo.direction_id && !supportIds.includes(todo.direction_id)) {
          throw new Error(`${node.title || `维度 ${index + 1}`}的月度事项关联了不存在的长期方向`);
        }
      }));
      return {
        ...clone(dimension),
        ...node,
        id: dimensionId,
        title: node.title,
        ...(SCENE_IDS.includes(dimension.scene_id) ? { scene_id: dimension.scene_id } : {}),
        support_factors: supportFactors,
        periods,
        legacy_support_factors: Array.isArray(dimension.legacy_support_factors) ? clone(dimension.legacy_support_factors) : []
      };
    });
    const ids = data.dimensions.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error('维度 id 不能重复');
    return data;
  }
  function assertObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} 必须是对象`);
  }
  function assertString(value, path, { nonempty = false } = {}) {
    if (typeof value !== 'string' || (nonempty && !value.trim())) throw new Error(`${path} 必须是${nonempty ? '非空' : ''}字符串`);
  }
  function assertArray(value, path) {
    if (!Array.isArray(value)) throw new Error(`${path} 必须是数组`);
  }
  function assertEnum(value, allowed, path) {
    if (!allowed.includes(value)) throw new Error(`${path} 值不合法`);
  }
  function assertUniqueIds(items, path) {
    const ids = items.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error(`${path} 的 id 不能重复`);
  }
  function assertDirection(node, path, { titleRequired = false } = {}) {
    assertObject(node, path);
    if (titleRequired) assertString(node.title, `${path}.title`, { nonempty: true });
    else if (node.title !== undefined) assertString(node.title, `${path}.title`);
    for (const field of ['anti_vision', 'desired_state', 'summary', 'source_quote']) {
      if (node[field] !== undefined) assertString(node[field], `${path}.${field}`);
    }
    assertEnum(node.status, NODE_STATUSES, `${path}.status`);
    if (node.operating_loop !== undefined) {
      assertObject(node.operating_loop, `${path}.operating_loop`);
      for (const field of ['input', 'practice', 'output', 'evidence', 'review']) {
        if (node.operating_loop[field] !== undefined) assertString(node.operating_loop[field], `${path}.operating_loop.${field}`);
      }
    }
  }
  function assertCanonicalMonthly(raw) {
    assertObject(raw, 'map');
    assertObject(raw.meta, 'meta');
    assertString(raw.meta.title, 'meta.title', { nonempty: true });
    if (raw.meta.version !== VERSION) throw new Error(`meta.version 必须是 ${VERSION}`);
    if (!Number.isInteger(raw.meta.revision) || raw.meta.revision < 0) throw new Error('meta.revision 必须是非负整数');
    assertString(raw.meta.active_period, 'meta.active_period');
    if (!/^\d{4}-\d{2}$/.test(raw.meta.active_period)) throw new Error('meta.active_period 必须使用 YYYY-MM');
    if (raw.meta.updated_at !== undefined) assertString(raw.meta.updated_at, 'meta.updated_at');
    if (raw.meta.visibility !== undefined) assertEnum(raw.meta.visibility, ['private', 'shared', 'demo'], 'meta.visibility');

    assertDirection(raw.center, 'center', { titleRequired: true });
    assertArray(raw.dimensions, 'dimensions');
    if (raw.dimensions.length > 8) throw new Error('dimensions 最多包含 8 项');
    raw.dimensions.forEach((dimension, dimensionIndex) => {
      const dimensionPath = `dimensions[${dimensionIndex}]`;
      assertDirection(dimension, dimensionPath, { titleRequired: true });
      assertString(dimension.id, `${dimensionPath}.id`, { nonempty: true });
      if (dimension.scene_id !== undefined) assertEnum(dimension.scene_id, SCENE_IDS, `${dimensionPath}.scene_id`);

      const factors = dimension.support_factors === undefined ? [] : dimension.support_factors;
      assertArray(factors, `${dimensionPath}.support_factors`);
      if (factors.length > 8) throw new Error(`${dimensionPath}.support_factors 最多包含 8 项`);
      factors.forEach((factor, factorIndex) => {
        const factorPath = `${dimensionPath}.support_factors[${factorIndex}]`;
        assertDirection(factor, factorPath, { titleRequired: true });
        assertString(factor.id, `${factorPath}.id`, { nonempty: true });
      });
      assertUniqueIds(factors, `${dimensionPath}.support_factors`);
      const factorIds = new Set(factors.map(factor => factor.id));

      assertArray(dimension.periods, `${dimensionPath}.periods`);
      dimension.periods.forEach((period, periodIndex) => {
        const periodPath = `${dimensionPath}.periods[${periodIndex}]`;
        assertObject(period, periodPath);
        assertString(period.id, `${periodPath}.id`, { nonempty: true });
        if (!/^\d{4}-\d{2}$/.test(period.id)) throw new Error(`${periodPath}.id 必须使用 YYYY-MM`);
        if (period.label !== undefined) assertString(period.label, `${periodPath}.label`);
        assertArray(period.todos, `${periodPath}.todos`);
        if (period.todos.length > 8) throw new Error(`${periodPath}.todos 最多包含 8 项`);
        period.todos.forEach((todo, todoIndex) => {
          const todoPath = `${periodPath}.todos[${todoIndex}]`;
          assertObject(todo, todoPath);
          assertString(todo.id, `${todoPath}.id`, { nonempty: true });
          assertString(todo.title, `${todoPath}.title`, { nonempty: true });
          assertEnum(todo.status, TODO_STATUSES, `${todoPath}.status`);
          if (todo.provenance !== undefined) assertEnum(todo.provenance, ['user', 'ai-candidate', 'user-confirmed'], `${todoPath}.provenance`);
          for (const field of ['plan', 'done_definition']) {
            if (todo[field] !== undefined) assertString(todo[field], `${todoPath}.${field}`);
          }
          if (todo.direction_id !== undefined) {
            assertString(todo.direction_id, `${todoPath}.direction_id`, { nonempty: true });
            if (!factorIds.has(todo.direction_id)) throw new Error(`${todoPath}.direction_id 必须指向同一人生房间的长期方向`);
          }
          assertArray(todo.records, `${todoPath}.records`);
          todo.records.forEach((record, recordIndex) => {
            const recordPath = `${todoPath}.records[${recordIndex}]`;
            assertObject(record, recordPath);
            assertString(record.id, `${recordPath}.id`, { nonempty: true });
            assertString(record.date, `${recordPath}.date`, { nonempty: true });
            assertString(record.text, `${recordPath}.text`, { nonempty: true });
          });
          assertUniqueIds(todo.records, `${todoPath}.records`);
        });
        assertUniqueIds(period.todos, `${periodPath}.todos`);
      });
      assertUniqueIds(dimension.periods, `${dimensionPath}.periods`);
      if (dimension.legacy_support_factors !== undefined) assertArray(dimension.legacy_support_factors, `${dimensionPath}.legacy_support_factors`);
    });
    assertUniqueIds(raw.dimensions, 'dimensions');

    // Reuse existing structural checks (for example room-local direction links)
    // only after all fields that normalization can repair have been asserted.
    normalizeMonthly(raw);
    return raw;
  }
  function migrateLegacy(raw) {
    const active = typeof raw?.meta?.active_period === 'string' && /^\d{4}-\d{2}$/.test(raw.meta.active_period)
      ? raw.meta.active_period
      : currentPeriod();
    const monthly = {
      ...clone(raw),
      meta: { ...clone(raw.meta || {}), version: VERSION, active_period: active, migrated_from: raw.meta?.version || 'legacy-v0' },
      center: normalizeNode(raw.center),
      dimensions: (Array.isArray(raw.dimensions) ? raw.dimensions : []).slice(0, 8).map((dimension, index) => ({
        ...clone(dimension),
        ...normalizeNode(dimension),
        id: typeof dimension.id === 'string' && dimension.id ? dimension.id : `dimension-${index + 1}`,
        support_factors: Array.isArray(dimension.support_factors) ? clone(dimension.support_factors) : [],
        periods: [{ id: active, label: periodLabel(active), todos: [] }],
        legacy_support_factors: Array.isArray(dimension.support_factors) ? clone(dimension.support_factors) : []
      }))
    };
    return { data: normalizeMonthly(monthly), migration: { kind: 'legacy-support-factors', preserved_count: monthly.dimensions.reduce((sum, item) => sum + item.legacy_support_factors.filter(hasDirectionContent).length, 0) } };
  }
  function importData(raw) {
    const legacy = raw?.meta?.version !== VERSION
      && Array.isArray(raw?.dimensions)
      && raw.dimensions.some(item => Array.isArray(item.support_factors))
      && !raw.dimensions.some(item => Array.isArray(item.periods));
    if (legacy) return migrateLegacy(raw);
    return { data: normalizeMonthly(raw), migration: null };
  }
  function getActivePeriod(data, dimensionId) {
    const dimension = data.dimensions.find(item => item.id === dimensionId);
    if (!dimension) return null;
    return dimension.periods.find(item => item.id === data.meta.active_period) || null;
  }
  function getTodosForDirection(data, dimensionId, directionId) {
    const period = getActivePeriod(data, dimensionId);
    if (!period || typeof directionId !== 'string' || !directionId) return [];
    return period.todos.filter(todo => todo.direction_id === directionId);
  }
  function upsertTodo(data, dimensionId, todoInput, recordText = '') {
    const next = normalizeMonthly(data);
    const dimension = next.dimensions.find(item => item.id === dimensionId);
    const period = getActivePeriod(next, dimensionId);
    if (!dimension || !period) throw new Error('没有找到这个人生房间');
    const todo = normalizeTodo(todoInput);
    if (!todo.title.trim()) throw new Error('请写下准备做什么');
    if (todo.direction_id && !dimension.support_factors.some(direction => direction.id === todo.direction_id)) {
      throw new Error('关联的长期方向不在这个人生房间里');
    }
    const existing = period.todos.findIndex(item => item.id === todo.id);
    if (recordText.trim()) todo.records.push({ id: uid('record'), date: new Date().toISOString().slice(0, 10), text: recordText.trim() });
    if (existing >= 0) period.todos[existing] = todo;
    else {
      if (period.todos.length >= 8) throw new Error('这个月已经有 8 项内容；先完成、合并或放下一项再增加');
      period.todos.push(todo);
    }
    next.meta.updated_at = new Date().toISOString();
    return next;
  }
  const api = { VERSION, TODO_STATUSES, NODE_STATUSES, SCENE_IDS, blankData, normalizeNode, normalizeSupportFactor, normalizeMonthly, assertCanonicalMonthly, importData, getActivePeriod, getTodosForDirection, upsertTodo, periodLabel, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MonthlyLifeGrid = api;
})(typeof window === 'undefined' ? {} : window);
