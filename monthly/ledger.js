(function (root) {
  'use strict';

  const VERSION = '1.0.0-compass-ledger';
  const RECEIPT_KINDS = ['fact', 'metric', 'feedback', 'output', 'decision', 'plan'];
  const EVIDENCE_STATES = ['user-stated', 'artifact-linked', 'verified', 'unverified'];
  const IMPACT_STATES = ['toward', 'unchanged', 'away', 'unknown'];
  const ITEM_STATES = ['candidate', 'accepted', 'dismissed'];
  const REVIEW_STATES = ['candidate', 'confirmed', 'rejected'];
  const SENSITIVITY_STATES = ['normal', 'sensitive'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

  function text(value, label, { required = false, max = 500 } = {}) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (required && !normalized) throw new Error(`${label}不能为空`);
    if (normalized.length > max) throw new Error(`${label}不能超过 ${max} 个字符`);
    return normalized;
  }

  function uniqueStrings(value, label, maxItems = 8) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error(`${label}必须是数组`);
    if (value.length > maxItems) throw new Error(`${label}最多包含 ${maxItems} 项`);
    const normalized = value.map(item => text(item, label, { required: true, max: 300 }));
    return [...new Set(normalized)];
  }

  function enumValue(value, allowed, fallback, label) {
    const normalized = value || fallback;
    if (!allowed.includes(normalized)) throw new Error(`${label}不合法`);
    return normalized;
  }

  function blankLedger() {
    return {
      meta: {
        version: VERSION,
        revision: 0,
        updated_at: now(),
        storage: 'device-local'
      },
      receipts: [],
      reviews: []
    };
  }

  function normalizeLedger(raw) {
    const ledger = blankLedger();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ledger;
    ledger.meta.revision = Number.isInteger(raw.meta?.revision) && raw.meta.revision >= 0 ? raw.meta.revision : 0;
    ledger.meta.updated_at = typeof raw.meta?.updated_at === 'string' ? raw.meta.updated_at : ledger.meta.updated_at;
    ledger.receipts = Array.isArray(raw.receipts) ? raw.receipts.map(receipt => normalizeStoredReceipt(receipt)) : [];
    ledger.reviews = Array.isArray(raw.reviews) ? raw.reviews.map(review => normalizeStoredReview(review)) : [];
    const receiptIds = ledger.receipts.map(item => item.receipt_id);
    const reviewIds = ledger.reviews.map(item => item.review_id);
    if (new Set(receiptIds).size !== receiptIds.length) throw new Error('账本里的回执 id 不能重复');
    if (new Set(reviewIds).size !== reviewIds.length) throw new Error('账本里的答卷 id 不能重复');
    return ledger;
  }

  function compassIndex(compass) {
    const dimensions = Array.isArray(compass?.dimensions) ? compass.dimensions : [];
    const byDomain = new Map();
    dimensions.forEach(dimension => {
      const directionIds = new Set((dimension.support_factors || []).map(direction => direction.id));
      byDomain.set(dimension.id, { dimension, directionIds });
    });
    return byDomain;
  }

  function normalizeReceipt(receipt, compass) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('领域回执必须是对象');
    const index = compassIndex(compass);
    const domainId = text(receipt.domain_id, '板块 id', { required: true, max: 100 });
    const domain = index.get(domainId);
    if (!domain) throw new Error('领域回执关联了不存在的人生板块');
    const directionId = text(receipt.direction_id, '长期方向 id', { max: 120 });
    if (directionId && !domain.directionIds.has(directionId)) throw new Error('领域回执关联了不存在的长期方向');
    const occurredAt = text(receipt.occurred_at, '发生时间', { required: true, max: 40 });
    if (Number.isNaN(Date.parse(occurredAt))) throw new Error('发生时间必须是可识别的日期或时间');
    const normalized = {
      receipt_id: text(receipt.receipt_id, '回执 id', { required: true, max: 120 }),
      occurred_at: occurredAt,
      domain_id: domainId,
      kind: enumValue(receipt.kind, RECEIPT_KINDS, 'fact', '回执类型'),
      summary: text(receipt.summary, '事实摘要', { required: true, max: 500 }),
      source_ref: text(receipt.source_ref, '来源引用', { required: true, max: 300 }),
      project_refs: uniqueStrings(receipt.project_refs, '项目引用', 5),
      evidence_status: enumValue(receipt.evidence_status, EVIDENCE_STATES, 'unverified', '证据状态'),
      impact: enumValue(receipt.impact, IMPACT_STATES, 'unknown', '影响判断'),
      gap: text(receipt.gap, '差距', { max: 500 }),
      next_action: text(receipt.next_action, '下一步候选', { max: 500 }),
      sensitivity: enumValue(receipt.sensitivity, SENSITIVITY_STATES, 'normal', '敏感级别'),
      state: 'candidate',
      staged_at: now(),
      resolved_at: ''
    };
    if (directionId) normalized.direction_id = directionId;
    return normalized;
  }

  function normalizeStoredReceipt(receipt) {
    const normalized = {
      receipt_id: text(receipt.receipt_id, '回执 id', { required: true, max: 120 }),
      occurred_at: text(receipt.occurred_at, '发生时间', { required: true, max: 40 }),
      domain_id: text(receipt.domain_id, '板块 id', { required: true, max: 100 }),
      kind: enumValue(receipt.kind, RECEIPT_KINDS, 'fact', '回执类型'),
      summary: text(receipt.summary, '事实摘要', { required: true, max: 500 }),
      source_ref: text(receipt.source_ref, '来源引用', { required: true, max: 300 }),
      project_refs: uniqueStrings(receipt.project_refs, '项目引用', 5),
      evidence_status: enumValue(receipt.evidence_status, EVIDENCE_STATES, 'unverified', '证据状态'),
      impact: enumValue(receipt.impact, IMPACT_STATES, 'unknown', '影响判断'),
      gap: text(receipt.gap, '差距', { max: 500 }),
      next_action: text(receipt.next_action, '下一步候选', { max: 500 }),
      sensitivity: enumValue(receipt.sensitivity, SENSITIVITY_STATES, 'normal', '敏感级别'),
      state: enumValue(receipt.state, ITEM_STATES, 'candidate', '回执状态'),
      staged_at: text(receipt.staged_at, '暂存时间', { max: 40 }) || now(),
      resolved_at: text(receipt.resolved_at, '确认时间', { max: 40 })
    };
    const directionId = text(receipt.direction_id, '长期方向 id', { max: 120 });
    if (directionId) normalized.direction_id = directionId;
    return normalized;
  }

  function comparableReceipt(receipt) {
    const copy = clone(receipt);
    delete copy.state;
    delete copy.staged_at;
    delete copy.resolved_at;
    return JSON.stringify(copy);
  }

  function stageReceipts(ledgerInput, receiptInputs, compass) {
    if (!Array.isArray(receiptInputs) || !receiptInputs.length) throw new Error('至少需要一条领域回执');
    if (receiptInputs.length > 12) throw new Error('一次最多暂存 12 条领域回执');
    const ledger = normalizeLedger(ledgerInput);
    const staged = [];
    const existing = new Map(ledger.receipts.map(item => [item.receipt_id, item]));
    receiptInputs.forEach(input => {
      const receipt = normalizeReceipt(input, compass);
      const prior = existing.get(receipt.receipt_id);
      if (prior) {
        if (comparableReceipt(prior) !== comparableReceipt(receipt)) throw new Error(`回执 ${receipt.receipt_id} 与已有内容冲突`);
        return;
      }
      ledger.receipts.push(receipt);
      existing.set(receipt.receipt_id, receipt);
      staged.push(receipt.receipt_id);
    });
    if (staged.length) {
      ledger.meta.revision += 1;
      ledger.meta.updated_at = now();
    }
    return { ledger, staged, revision: ledger.meta.revision };
  }

  function resolveReceipt(ledgerInput, receiptId, resolution) {
    if (!['accepted', 'dismissed'].includes(resolution)) throw new Error('回执只能接受或忽略');
    const ledger = normalizeLedger(ledgerInput);
    const receipt = ledger.receipts.find(item => item.receipt_id === receiptId);
    if (!receipt) throw new Error('没有找到这条领域回执');
    if (receipt.state !== 'candidate') throw new Error('这条领域回执已经处理过');
    receipt.state = resolution;
    receipt.resolved_at = now();
    ledger.meta.revision += 1;
    ledger.meta.updated_at = receipt.resolved_at;
    return ledger;
  }

  function normalizeReview(review, ledger, compass) {
    if (!review || typeof review !== 'object' || Array.isArray(review)) throw new Error('AI 答卷必须是对象');
    const index = compassIndex(compass);
    const domainId = text(review.domain_id, '板块 id', { max: 100 });
    if (domainId && !index.has(domainId)) throw new Error('AI 答卷关联了不存在的人生板块');
    const evidenceIds = uniqueStrings(review.evidence_ids, '证据引用', 24);
    if (!evidenceIds.length) throw new Error('AI 答卷至少需要一条证据引用');
    const receiptIndex = new Map(ledger.receipts.map(item => [item.receipt_id, item]));
    evidenceIds.forEach(id => {
      const receipt = receiptIndex.get(id);
      if (!receipt) throw new Error(`AI 答卷引用了不存在的证据 ${id}`);
      if (domainId && receipt.domain_id !== domainId) throw new Error('单板块答卷不能引用其他板块的证据');
    });
    return {
      review_id: text(review.review_id, '答卷 id', { required: true, max: 120 }),
      period: text(review.period, '答卷周期', { required: true, max: 40 }),
      domain_id: domainId,
      evidence_ids: evidenceIds,
      summary: text(review.summary, '答卷摘要', { required: true, max: 800 }),
      observed_change: text(review.observed_change, '观察到的变化', { max: 800 }),
      gap: text(review.gap, '仍有差距', { max: 800 }),
      next_focus: text(review.next_focus, '下一步焦点', { max: 500 }),
      sensitivity: enumValue(review.sensitivity, SENSITIVITY_STATES, 'normal', '敏感级别'),
      state: 'candidate',
      base_revision: ledger.meta.revision,
      staged_at: now(),
      resolved_at: ''
    };
  }

  function normalizeStoredReview(review) {
    return {
      review_id: text(review.review_id, '答卷 id', { required: true, max: 120 }),
      period: text(review.period, '答卷周期', { required: true, max: 40 }),
      domain_id: text(review.domain_id, '板块 id', { max: 100 }),
      evidence_ids: uniqueStrings(review.evidence_ids, '证据引用', 24),
      summary: text(review.summary, '答卷摘要', { required: true, max: 800 }),
      observed_change: text(review.observed_change, '观察到的变化', { max: 800 }),
      gap: text(review.gap, '仍有差距', { max: 800 }),
      next_focus: text(review.next_focus, '下一步焦点', { max: 500 }),
      sensitivity: enumValue(review.sensitivity, SENSITIVITY_STATES, 'normal', '敏感级别'),
      state: enumValue(review.state, REVIEW_STATES, 'candidate', '答卷状态'),
      base_revision: Number.isInteger(review.base_revision) && review.base_revision >= 0 ? review.base_revision : 0,
      staged_at: text(review.staged_at, '暂存时间', { max: 40 }) || now(),
      resolved_at: text(review.resolved_at, '确认时间', { max: 40 })
    };
  }

  function comparableReview(review) {
    const copy = clone(review);
    delete copy.state;
    delete copy.base_revision;
    delete copy.staged_at;
    delete copy.resolved_at;
    return JSON.stringify(copy);
  }

  function stageReview(ledgerInput, reviewInput, compass) {
    const ledger = normalizeLedger(ledgerInput);
    const review = normalizeReview(reviewInput, ledger, compass);
    const prior = ledger.reviews.find(item => item.review_id === review.review_id);
    if (prior) {
      if (comparableReview(prior) !== comparableReview(review)) throw new Error(`答卷 ${review.review_id} 与已有内容冲突`);
      return { ledger, staged: false, revision: ledger.meta.revision };
    }
    ledger.reviews.push(review);
    ledger.meta.revision += 1;
    ledger.meta.updated_at = now();
    return { ledger, staged: true, revision: ledger.meta.revision };
  }

  function resolveReview(ledgerInput, reviewId, resolution) {
    if (!['confirmed', 'rejected'].includes(resolution)) throw new Error('答卷只能确认或退回');
    const ledger = normalizeLedger(ledgerInput);
    const review = ledger.reviews.find(item => item.review_id === reviewId);
    if (!review) throw new Error('没有找到这份 AI 答卷');
    if (review.state !== 'candidate') throw new Error('这份 AI 答卷已经处理过');
    review.state = resolution;
    review.resolved_at = now();
    ledger.meta.revision += 1;
    ledger.meta.updated_at = review.resolved_at;
    return ledger;
  }

  function snapshot(compass, ledgerInput) {
    const ledger = normalizeLedger(ledgerInput);
    const dimensions = Array.isArray(compass?.dimensions) ? compass.dimensions : [];
    return {
      ledger: {
        version: VERSION,
        revision: ledger.meta.revision,
        storage: ledger.meta.storage,
        pending_receipts: ledger.receipts.filter(item => item.state === 'candidate').length,
        pending_reviews: ledger.reviews.filter(item => item.state === 'candidate').length
      },
      center: {
        title: compass?.center?.title || '',
        desired_state: compass?.center?.desired_state || '',
        status: compass?.center?.status || 'raw'
      },
      domains: dimensions.map(dimension => {
        const receipts = ledger.receipts.filter(item => item.domain_id === dimension.id);
        return {
          domain_id: dimension.id,
          title: dimension.title,
          desired_state: dimension.desired_state || '',
          status: dimension.status || 'raw',
          directions: (dimension.support_factors || []).map(direction => ({
            direction_id: direction.id,
            title: direction.title,
            desired_state: direction.desired_state || '',
            status: direction.status || 'raw'
          })),
          evidence_counts: {
            accepted: receipts.filter(item => item.state === 'accepted').length,
            candidate: receipts.filter(item => item.state === 'candidate').length,
            sensitive_redacted: receipts.filter(item => item.sensitivity === 'sensitive').length
          }
        };
      }),
      recent_evidence: ledger.receipts
        .filter(item => item.sensitivity === 'normal' && item.state !== 'dismissed')
        .slice(-12)
        .reverse()
        .map(item => ({
          receipt_id: item.receipt_id,
          occurred_at: item.occurred_at,
          domain_id: item.domain_id,
          direction_id: item.direction_id,
          kind: item.kind,
          summary: item.summary,
          source_ref: item.source_ref,
          evidence_status: item.evidence_status,
          impact: item.impact,
          state: item.state
        })),
      reviews: ledger.reviews
        .filter(item => item.sensitivity === 'normal' && item.state !== 'rejected')
        .slice(-8)
        .reverse()
        .map(item => clone(item))
    };
  }

  const api = {
    VERSION,
    RECEIPT_KINDS,
    EVIDENCE_STATES,
    IMPACT_STATES,
    blankLedger,
    normalizeLedger,
    normalizeReceipt,
    stageReceipts,
    resolveReceipt,
    stageReview,
    resolveReview,
    snapshot,
    clone
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LifeCompassLedger = api;
})(typeof window === 'undefined' ? {} : window);
