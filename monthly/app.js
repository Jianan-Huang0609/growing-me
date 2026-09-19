(async function () {
  'use strict';
  const Model = window.MonthlyLifeGrid;
  const Ledger = window.LifeCompassLedger;
  const STORAGE_KEY = 'growing-me-life-grid-monthly-v1';
  const STARTER_STORAGE_KEY = 'growing-me-life-grid-starter-v1';
  const LEDGER_STORAGE_KEY = 'growing-me-life-compass-ledger-v1';
  const PUBLIC_SKILL_URL = 'https://github.com/Jianan-Huang0609/growing-me-life-grid-starter/tree/main/skills/growing-me-life-grid-monthly';
  const TEACHING_EXAMPLE_URL = '../examples/teaching-life-grid-monthly.json';
  const LOCAL_SYNC_INTERVAL_MS = 1500;
  const urlParams = new URLSearchParams(window.location.search);
  const requestedMode = urlParams.get('mode');
  const experienceMode = requestedMode === 'personal'
    ? 'personal'
    : requestedMode === 'blank'
      ? 'blank'
      : 'example';
  const publicDemoMode = experienceMode === 'example';
  const blankTemplateMode = experienceMode === 'blank';
  const isolatedPreviewMode = publicDemoMode;
  const experimentalLedgerMode = experienceMode === 'personal' && urlParams.get('experimental') === 'ledger';

  async function loadTeachingExample() {
    const response = await fetch(TEACHING_EXAMPLE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`教学案例加载失败（HTTP ${response.status}）`);
    const example = await response.json();
    Model.assertCanonicalMonthly(example);
    return Model.normalizeMonthly(example);
  }

  const DEMO = publicDemoMode ? await loadTeachingExample() : null;
  const requestedDemoRoomId = urlParams.get('room');
  const requestedDemoDirectionId = urlParams.get('direction');
  let data = publicDemoMode
    ? Model.clone(DEMO)
    : blankTemplateMode
      ? (loadStarter() || Model.blankData())
      : Model.blankData();
  let compassLedger = Ledger.blankLedger();
  let browserFallbackLoaded = false;
  let localFileMode = false;
  let localFileRevision = -1;
  let localFileSignature = '';
  let localFileSyncing = false;
  let localFileSyncTimer = null;
  let currentDimensionId = publicDemoMode && data.dimensions.some(item => item.id === requestedDemoRoomId)
    ? requestedDemoRoomId
    : null;
  let dimensionLayer = 'directions';
  let activeView = urlParams.get('view') === 'rooms' ? 'rooms' : 'grid';
  let pendingImport = null;
  let focusedRoomId = null;
  let corridorEntered = false;
  let corridorActiveId = null;
  let corridorFrame = 0;
  let corridorSavedScrollY = 0;
  let corridorTrigger = null;
  let corridorPointerX = 0;
  let corridorLook = 0;
  let corridorTargetProgress = 0;
  let corridorCurrentProgress = 0;
  let roomJourneyFrame = 0;
  let roomJourneyTarget = 0;
  let roomJourneyCurrent = 0;
  let activeWorkbench = null;
  let directionWorkbenchTrigger = null;
  let directionWorkbenchReturn = null;
  let workbenchTransitioningToTodo = false;
  const corridorDoorButtons = new Map();
  const corridorStops = [0.075, 0.195, 0.315, 0.435, 0.555, 0.675, 0.795, 0.915];
  const defaultSceneIds = ['career-route', 'creator-gallery', 'ai-constellation', 'health-vitals', 'love-book', 'finance-ledger', 'life-cabinet', 'family-album'];
  const roomSceneThemes = {
    'career-route': { layout: 'route', art: 'career.png', label: '成长山路 · 阶段路标', hint: '沿山路看见每一段能力积累与下一处路标' },
    'creator-gallery': { layout: 'gallery', art: 'influence.png', label: '创作画廊 · 胶片灯塔', hint: '让作品沿胶片展开，也让灯塔照见真实受众' },
    'ai-constellation': { layout: 'constellation', art: 'learning.png', label: '思考实验台 · 知识电路', hint: '把输入、判断、验证与输出接成可以运行的知识电路' },
    'health-vitals': { layout: 'vitals', art: 'health.png', label: '生命树 · 能量花园', hint: '从根系恢复、树干力量到树冠活力逐层生长' },
    'love-book': { layout: 'book', art: 'love.png', label: '共同生活之书 · 连续之门', hint: '翻开共同章节，也一次次推开关系里的下一扇门' },
    'finance-ledger': { layout: 'ledger', art: 'finance.png', label: '财富账本 · 选择之桥', hint: '一边记清现实，一边逐段搭起通往选择权的桥' },
    'life-cabinet': { layout: 'cabinet', art: 'business.png', label: '生活屋 · 收藏剖面', hint: '从每扇窗看见爱好、朋友、日常与珍藏' },
    'family-album': { layout: 'album', art: 'community.png', label: '关系圆桌 · 记忆相册', hint: '围桌看见彼此的关系，也让共同记忆沿时间展开' }
  };
  const constellationPositions = [[16,28],[39,17],[70,24],[84,49],[70,76],[42,82],[16,65],[48,48]];
  const cabinetPositions = [[18,29],[43,28],[70,29],[83,50],[68,70],[43,70],[18,70],[50,50]];
  const treePositions = [[28,78],[70,78],[34,61],[65,59],[24,43],[76,42],[39,25],[62,20]];
  const tablePositions = [[18,32],[38,19],[62,19],[82,32],[84,68],[62,81],[38,81],[16,68]];

  function sceneForDimension(dimension, index) {
    const sceneId = roomSceneThemes[dimension?.scene_id] ? dimension.scene_id : defaultSceneIds[index % defaultSceneIds.length];
    return { id: sceneId, ...roomSceneThemes[sceneId] };
  }

  function sceneMetaphorMarkup(layout) {
    const eightPieces = Array.from({ length: 8 }, (_, index) => `<i>${String(index + 1).padStart(2, '0')}</i>`).join('');
    const botanicalLeaves = [
      [382,150,-32,1],[424,126,-18,.88],[466,145,16,.94],[506,108,-6,.82],[546,134,19,.94],[586,154,34,.86],[628,184,43,.82],
      [302,222,-50,.82],[338,204,-32,.94],[372,228,-12,.86],[316,260,-42,.8],[354,280,-22,.92],[392,258,9,.86],
      [426,208,-25,.94],[464,188,-10,.82],[500,202,11,1],[536,188,-8,.9],[570,214,22,.9],
      [604,222,30,.92],[642,232,40,.86],[680,254,52,.88],[710,282,58,.76],[670,298,38,.84],[626,276,18,.92],
      [316,318,-54,.78],[352,342,-38,.86],[392,316,-18,.9],[430,338,-4,.82],[470,300,14,.92],[518,310,-8,.88],[564,330,26,.84],[610,350,42,.78],
      [408,172,-28,.7],[486,162,8,.7],[554,166,22,.72],[602,190,35,.68],[366,246,-24,.72],[444,250,5,.7],[542,248,18,.72],[650,262,38,.68]
    ].map(([x,y,rotate,scale], index) => `<ellipse class="tree-leaf tree-leaf-${(index % 3) + 1}" cx="${x}" cy="${y}" rx="${19 * scale}" ry="${8 * scale}" transform="rotate(${rotate} ${x} ${y})"></ellipse>`).join('');
    const scenes = {
      route: `<svg class="route-map" viewBox="0 0 1000 720" preserveAspectRatio="none"><path d="M70 650 C145 610 128 520 235 500 S360 430 405 365 S530 330 575 250 S720 230 760 145 S875 120 945 55"></path>${[[70,650],[235,500],[405,365],[575,250],[760,145],[945,55]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="10"></circle>`).join('')}</svg><div class="route-signs">${eightPieces}</div>`,
      gallery: `<div class="gallery-film">${eightPieces}</div><div class="gallery-lighthouse"><span></span></div><div class="gallery-beam"></div>`,
      constellation: `<div class="lab-instrument"><span class="lab-corner lab-corner-a"></span><span class="lab-corner lab-corner-b"></span><svg class="lab-circuit" viewBox="0 0 1000 720" preserveAspectRatio="none"><path d="M80 124 H250 V244 H390 M610 244 H750 V124 H920"></path><path d="M80 596 H250 V478 H390 M610 478 H750 V596 H920"></path><path d="M164 316 H330 M670 316 H836 M164 404 H330 M670 404 H836"></path>${[[80,124],[250,244],[390,244],[610,244],[750,124],[920,124],[80,596],[250,478],[390,478],[610,478],[750,596],[920,596],[164,316],[330,316],[670,316],[836,316],[164,404],[330,404],[670,404],[836,404]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="7"></circle>`).join('')}</svg><div class="lab-core"><span class="lab-orbit lab-orbit-one"></span><span class="lab-orbit lab-orbit-two"></span><strong>?</strong><small>LEARN · TEST · SYNTHESIZE</small></div><div class="lab-modules">${eightPieces}</div><div class="lab-readout"><span>QUESTION / JUDGMENT</span><i></i><i></i><i></i></div></div><div class="lab-bench"><span class="lab-bench-line"></span><div class="lab-controls"><i></i><i></i><i></i><i></i><i></i></div></div>`,
      vitals: `<svg class="life-tree botanical-tree" viewBox="0 0 760 760" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="treeTrunkGradient" x1="0" x2="1"><stop offset="0" stop-color="#5b3b24"></stop><stop offset=".46" stop-color="#b07a43"></stop><stop offset=".72" stop-color="#7b5030"></stop><stop offset="1" stop-color="#3f291d"></stop></linearGradient><linearGradient id="treeRootGradient" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#d2a55f"></stop><stop offset="1" stop-color="#745035"></stop></linearGradient><radialGradient id="treeHalo"><stop offset="0" stop-color="#86bd82" stop-opacity=".22"></stop><stop offset="1" stop-color="#86bd82" stop-opacity="0"></stop></radialGradient></defs><ellipse class="tree-halo" cx="500" cy="252" rx="250" ry="230"></ellipse><path class="tree-soil-line" d="M96 584 C240 566 520 572 708 586"></path><g class="tree-roots"><path d="M474 546 C414 596 302 614 174 690 M490 548 C438 626 420 678 382 734 M512 548 C522 630 510 688 530 742 M530 548 C594 616 632 662 706 704 M462 554 C360 572 278 564 112 620 M540 556 C616 574 664 604 742 638 M480 562 C406 584 358 606 292 662 M530 566 C580 600 594 642 626 724"></path></g><path class="tree-trunk" d="M443 570 C464 510 456 452 466 390 C478 318 492 256 508 208 C530 276 548 340 544 408 C540 472 562 524 576 570 C544 588 480 590 443 570 Z"></path><g class="tree-branches"><path d="M496 388 C452 338 398 282 338 244 M508 360 C482 306 458 232 426 180 M523 358 C552 304 590 258 648 218 M533 408 C584 370 628 328 688 304 M484 430 C442 398 402 372 348 354"></path></g><g class="tree-twigs"><path d="M404 288 C370 270 344 238 302 222 M430 300 C406 258 386 226 338 204 M466 278 C456 236 446 206 424 126 M486 270 C482 224 484 182 506 108 M532 278 C552 234 568 194 586 154 M564 294 C610 270 650 256 710 282 M450 350 C410 334 372 328 316 318 M554 342 C584 336 608 340 650 350"></path></g><g class="tree-canopy-wash"><path d="M278 286 C270 176 358 98 460 126 C520 52 664 108 658 204 C750 236 716 374 614 386 C554 448 418 424 382 372 C310 390 250 352 278 286 Z"></path></g><g class="tree-leaves">${botanicalLeaves}</g><g class="tree-growth-rings"><ellipse cx="510" cy="566" rx="49" ry="13"></ellipse><ellipse cx="510" cy="566" rx="31" ry="8"></ellipse><ellipse cx="510" cy="566" rx="14" ry="4"></ellipse></g><g class="tree-vital-nodes"><circle cx="426" cy="180" r="6"></circle><circle cx="648" cy="218" r="6"></circle><circle cx="338" cy="244" r="6"></circle></g></svg>`,
      book: `<div class="door-sequence">${Array.from({ length: 6 }, (_, index) => `<i style="--door-index:${index}"><span>${index + 1}</span></i>`).join('')}</div>`,
      ledger: `<div class="bridge-ledger-lines"></div><div class="choice-bridge">${eightPieces}</div>`,
      cabinet: `<div class="house-cutaway"><span class="house-roof"></span><div class="house-windows">${eightPieces}</div><span class="house-cabinet"></span></div>`,
      album: `<svg class="family-links" viewBox="0 0 1000 720" preserveAspectRatio="none"><path d="M500 360 L275 205 M500 360 L715 195 M500 360 L790 470 M500 360 L260 520"></path></svg><div class="family-table"></div><div class="family-people">${Array.from({ length: 6 }, (_, index) => `<i style="--person-index:${index}"></i>`).join('')}</div><div class="album-stack"><i></i><i></i><i></i></div>`
    };
    return `<div class="scene-metaphor scene-metaphor-${layout}" aria-hidden="true">${scenes[layout] || ''}</div>`;
  }

  const byId = id => document.getElementById(id);
  const statusLabels = { planned: '准备做', doing: '进行中', done: '已完成', paused: '暂时放下' };
  const directionStatusLabels = { raw: '待梳理', candidate: '待确认', confirmed: '已确认', retired: '已放下' };
  const directionStatusText = status => publicDemoMode
    ? (status === 'candidate' ? '示例候选' : '示例方向')
    : (directionStatusLabels[status] || '待梳理');

  function load() {
    if (experienceMode !== 'personal') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = Model.normalizeMonthly(JSON.parse(raw));
      return saved.meta.visibility === 'demo' ? null : saved;
    }
    catch (_) { return null; }
  }
  function loadStarter() {
    try {
      const raw = localStorage.getItem(STARTER_STORAGE_KEY);
      if (!raw) return null;
      const saved = Model.normalizeMonthly(JSON.parse(raw));
      return saved.meta.visibility === 'demo' ? null : saved;
    } catch (_) { return null; }
  }
  function persist() {
    if (publicDemoMode || localFileMode) return false;
    try {
      const key = blankTemplateMode ? STARTER_STORAGE_KEY : STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
    catch (_) { showToast('当前浏览器无法保存，请先导出备份'); return false; }
  }
  function loadCompassLedger() {
    if (!experimentalLedgerMode) return Ledger.blankLedger();
    try {
      const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
      return raw ? Ledger.normalizeLedger(JSON.parse(raw)) : Ledger.blankLedger();
    } catch (_) {
      return Ledger.blankLedger();
    }
  }
  function persistCompassLedger() {
    if (!experimentalLedgerMode) return;
    try { localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(compassLedger)); }
    catch (_) { showToast('当前浏览器无法保存人生账本，请先导出备份'); }
  }
  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 3200);
  }
  function setLocalSyncStatus(state, message, detail = '') {
    const status = byId('localSyncStatus');
    if (!status) return;
    status.hidden = false;
    status.dataset.state = state;
    status.querySelector('strong').textContent = message;
    status.querySelector('small').textContent = detail;
  }
  function activateLocalFileMode() {
    if (localFileMode) return;
    localFileMode = true;
    document.body.classList.add('local-file-mode');
    byId('importButton').title = '本地同步模式中，请让 coding agent 更新私人地图文件';
    byId('importButton').disabled = true;
    byId('clearButton').title = '本地同步模式不会从网页清空私人地图';
    byId('clearButton').disabled = true;
  }
  async function syncPrivateMap() {
    if (localFileSyncing) return localFileMode;
    localFileSyncing = true;
    const previousData = data;
    try {
      const response = await fetch('/api/life-grid', { cache: 'no-store' });
      if (response.status === 404) {
        if (!browserFallbackLoaded) {
          browserFallbackLoaded = true;
          data = load() || Model.blankData();
          compassLedger = loadCompassLedger();
          render();
          setLocalSyncStatus('browser', '浏览器本地模式', '当前页面没有连接私人文件；导入与导出只保存在这个浏览器。');
        }
        return false;
      }
      if (!response.ok) {
        if (response.status === 422) {
          activateLocalFileMode();
          setLocalSyncStatus('error', '本地地图有格式错误', '仍显示上次合法版本；修复文件后会自动恢复。');
          return true;
        }
        if (localFileMode) setLocalSyncStatus('error', '本地地图暂时无法读取', `HTTP ${response.status}；仍显示上次合法版本。`);
        return localFileMode;
      }
      const payload = await response.json();
      const incoming = Model.normalizeMonthly(payload);
      const incomingSignature = JSON.stringify(incoming);
      activateLocalFileMode();
      if (incoming.meta.revision !== localFileRevision || incomingSignature !== localFileSignature) {
        data = incoming;
        localFileRevision = incoming.meta.revision;
        localFileSignature = incomingSignature;
        currentDimensionId = data.dimensions.some(item => item.id === currentDimensionId) ? currentDimensionId : null;
        render();
      }
      setLocalSyncStatus('synced', `本地 Skill 同步 · R${localFileRevision}`, '对话确认后由 coding agent 写入；网页会自动刷新。');
      return true;
    } catch (_) {
      data = previousData;
      if (localFileMode) setLocalSyncStatus('error', '本地同步暂时中断', '仍显示上次合法版本；服务恢复后会自动重连。');
      return localFileMode;
    } finally {
      localFileSyncing = false;
    }
  }
  async function startPrivateFileSync() {
    if (experienceMode !== 'personal' || !/^https?:$/.test(window.location.protocol)) return;
    const connected = await syncPrivateMap();
    if (connected && !localFileSyncTimer) localFileSyncTimer = setInterval(syncPrivateMap, LOCAL_SYNC_INTERVAL_MS);
  }
  function stripCodeFence(text) {
    const trimmed = String(text || '').trim();
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1] : trimmed;
  }
  function download(filename, content, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.append(field); field.select();
      const copied = document.execCommand('copy');
      field.remove();
      return copied;
    }
  }
  const receiptKindLabels = { fact: '事实', metric: '指标', feedback: '反馈', output: '产出', decision: '决定', plan: '计划' };
  const receiptStateLabels = { candidate: '待你确认', accepted: '已收进账本', dismissed: '已忽略' };
  const reviewStateLabels = { candidate: '候选答卷', confirmed: '你已确认', rejected: '已退回' };
  const evidenceStateLabels = { 'user-stated': '用户陈述', 'artifact-linked': '已有产物', verified: '已核验', unverified: '待核验' };

  function domainTitle(domainId) {
    return data.dimensions.find(item => item.id === domainId)?.title || domainId || '全局';
  }

  function compassEmpty(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'compass-empty';
    paragraph.textContent = message;
    return paragraph;
  }

  function compassAction(label, onClick, primary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button${primary ? ' button-primary' : ''}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderCompassBoards() {
    const list = byId('compassBoardList');
    list.replaceChildren();
    slots(data.dimensions).forEach((dimension, index) => {
      const card = document.createElement('article');
      card.className = `compass-board${dimension ? '' : ' is-empty'}`;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('h4');
      const body = document.createElement('p');
      const status = document.createElement('small');
      if (!dimension) {
        title.textContent = '还没聊到的板块';
        body.textContent = '保持空白，不为凑数创建领域 AI。';
        status.textContent = '尚未建立审查镜头';
      } else {
        const receipts = compassLedger.receipts.filter(item => item.domain_id === dimension.id && item.state !== 'dismissed');
        const accepted = receipts.filter(item => item.state === 'accepted').length;
        const candidates = receipts.filter(item => item.state === 'candidate').length;
        title.textContent = dimension.title || `板块 ${index + 1}`;
        body.textContent = dimension.support_factors?.length
          ? `${dimension.support_factors.length} 个长期方向，不等于 ${dimension.support_factors.length} 个待办。`
          : '长期方向仍待继续共创。';
        status.textContent = `${accepted} 条正式证据 · ${candidates} 条待确认`;
      }
      card.append(number, title, body, status);
      list.append(card);
    });
  }

  function renderCompassReviews() {
    const list = byId('compassReviewList');
    list.replaceChildren();
    const reviews = compassLedger.reviews.slice().reverse();
    if (!reviews.length) {
      list.append(compassEmpty('还没有 AI 答卷。领域 AI 应先收集真实证据，再提交“发生了什么、还差什么、下一步聚焦什么”。'));
      return;
    }
    reviews.forEach(review => {
      const article = document.createElement('article');
      article.className = 'compass-review';
      article.dataset.state = review.state;
      const head = document.createElement('div');
      head.className = 'compass-item-head';
      const title = document.createElement('strong');
      title.textContent = `${review.domain_id ? domainTitle(review.domain_id) : '人生总盘'} · ${review.period}`;
      const badge = document.createElement('span');
      badge.textContent = reviewStateLabels[review.state];
      head.append(title, badge);
      const summary = document.createElement('p');
      summary.textContent = review.summary;
      const detail = document.createElement('dl');
      [
        ['观察到的变化', review.observed_change || '尚未写明'],
        ['仍有差距', review.gap || '尚未写明'],
        ['下一步焦点', review.next_focus || '尚未写明']
      ].forEach(([label, value]) => {
        const item = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        detail.append(item);
      });
      article.append(head, summary, detail);
      if (review.state === 'candidate') {
        const actions = document.createElement('div');
        actions.className = 'compass-item-actions';
        actions.append(
          compassAction('退回答卷', () => {
            compassLedger = Ledger.resolveReview(compassLedger, review.review_id, 'rejected');
            persistCompassLedger(); renderCompass(); showToast('已退回这份候选答卷；人生方向没有被改写');
          }),
          compassAction('确认这份答卷', () => {
            compassLedger = Ledger.resolveReview(compassLedger, review.review_id, 'confirmed');
            persistCompassLedger(); renderCompass(); showToast('已确认这份阶段答卷；长期方向仍需单独确认才能修改');
          }, true)
        );
        article.append(actions);
      }
      list.append(article);
    });
  }

  function renderCompassReceipts() {
    const list = byId('compassReceiptList');
    list.replaceChildren();
    const receipts = compassLedger.receipts.slice().reverse();
    if (!receipts.length) {
      list.append(compassEmpty('还没有领域回执。项目完成、真实反馈、数据变化或一次重要判断，都可以由 AI 整理成候选回执。'));
      return;
    }
    receipts.forEach(receipt => {
      const article = document.createElement('article');
      article.className = 'compass-receipt';
      article.dataset.state = receipt.state;
      const head = document.createElement('div');
      head.className = 'compass-item-head';
      const title = document.createElement('strong');
      title.textContent = `${domainTitle(receipt.domain_id)} · ${receiptKindLabels[receipt.kind] || receipt.kind}`;
      const badge = document.createElement('span');
      badge.textContent = receiptStateLabels[receipt.state];
      head.append(title, badge);
      const summary = document.createElement('p');
      summary.textContent = receipt.summary;
      const meta = document.createElement('p');
      meta.className = 'compass-receipt-meta';
      meta.textContent = `${receipt.occurred_at.slice(0, 10)} · ${evidenceStateLabels[receipt.evidence_status] || receipt.evidence_status} · 来源 ${receipt.source_ref}${receipt.sensitivity === 'sensitive' ? ' · 仅本地' : ''}`;
      article.append(head, summary, meta);
      if (receipt.state === 'candidate') {
        const actions = document.createElement('div');
        actions.className = 'compass-item-actions';
        actions.append(
          compassAction('忽略', () => {
            compassLedger = Ledger.resolveReceipt(compassLedger, receipt.receipt_id, 'dismissed');
            persistCompassLedger(); renderCompass(); showToast('已忽略这条候选回执');
          }),
          compassAction('收进账本', () => {
            compassLedger = Ledger.resolveReceipt(compassLedger, receipt.receipt_id, 'accepted');
            persistCompassLedger(); renderCompass(); showToast('这条真实回执已进入本地人生账本');
          }, true)
        );
        article.append(actions);
      }
      list.append(article);
    });
  }

  function renderCompass() {
    compassLedger = Ledger.normalizeLedger(compassLedger);
    const pendingReceipts = compassLedger.receipts.filter(item => item.state === 'candidate').length;
    const pendingReviews = compassLedger.reviews.filter(item => item.state === 'candidate').length;
    byId('compassRevision').textContent = `R${compassLedger.meta.revision}`;
    byId('compassPendingCount').textContent = pendingReceipts || pendingReviews
      ? `${pendingReceipts} 条回执 · ${pendingReviews} 份答卷待确认`
      : '没有待确认内容';
    renderCompassBoards();
    renderCompassReviews();
    renderCompassReceipts();
  }

  function openCompass() {
    renderCompass();
    byId('compassDialog').showModal();
  }

  function stageCompassPayload(rawText) {
    const payload = JSON.parse(stripCodeFence(rawText));
    const receipts = Array.isArray(payload) ? payload : (Array.isArray(payload.receipts) ? payload.receipts : (payload.receipt_id ? [payload] : []));
    const review = !Array.isArray(payload) ? (payload.review || (payload.review_id ? payload : null)) : null;
    if (!receipts.length && !review) throw new Error('没有找到可暂存的领域回执或 AI 答卷');
    let stagedReceipts = [];
    if (receipts.length) {
      const result = Ledger.stageReceipts(compassLedger, receipts, data);
      compassLedger = result.ledger;
      stagedReceipts = result.staged;
    }
    let stagedReview = false;
    if (review) {
      const result = Ledger.stageReview(compassLedger, review, data);
      compassLedger = result.ledger;
      stagedReview = result.staged;
    }
    persistCompassLedger();
    renderCompass();
    return { staged_receipts: stagedReceipts, staged_review: stagedReview, revision: compassLedger.meta.revision };
  }

  function registerSiteTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = tool => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); }
      catch (_) {}
    };
    register({
      name: 'read_life_compass',
      title: '读取人生罗盘',
      description: '读取当前页面中的人生愿景、八个板块、长期方向、非敏感领域回执和 AI 答卷。不会返回用户原话、完整聊天或敏感回执正文。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() { return Ledger.snapshot(data, compassLedger); }
    });
    register({
      name: 'stage_life_evidence',
      title: '暂存领域回执',
      description: '把项目结果、反馈或观察作为候选领域回执暂存到当前页面。只创建待用户确认的候选，不会修改人生方向或把计划标成完成。',
      inputSchema: {
        type: 'object',
        properties: {
          receipts: {
            type: 'array', minItems: 1, maxItems: 12,
            items: {
              type: 'object',
              properties: {
                receipt_id: { type: 'string' }, occurred_at: { type: 'string' }, domain_id: { type: 'string' }, direction_id: { type: 'string' },
                kind: { type: 'string', enum: ['fact', 'metric', 'feedback', 'output', 'decision', 'plan'] }, summary: { type: 'string' }, source_ref: { type: 'string' },
                project_refs: { type: 'array', items: { type: 'string' } }, evidence_status: { type: 'string', enum: ['user-stated', 'artifact-linked', 'verified', 'unverified'] },
                impact: { type: 'string', enum: ['toward', 'unchanged', 'away', 'unknown'] }, gap: { type: 'string' }, next_action: { type: 'string' }, sensitivity: { type: 'string', enum: ['normal', 'sensitive'] }
              },
              required: ['receipt_id', 'occurred_at', 'domain_id', 'kind', 'summary', 'source_ref', 'evidence_status', 'impact'],
              additionalProperties: false
            }
          }
        },
        required: ['receipts'], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const result = Ledger.stageReceipts(compassLedger, input?.receipts, data);
        compassLedger = result.ledger;
        persistCompassLedger(); renderCompass();
        if (!byId('compassDialog').open) openCompass();
        showToast(result.staged.length ? `${result.staged.length} 条 AI 回执等待你确认` : '这些回执已经存在，没有重复写入');
        return { status: 'candidate', staged_receipt_ids: result.staged, revision: result.revision };
      }
    });
    register({
      name: 'stage_life_review',
      title: '暂存 AI 答卷',
      description: '根据账本里已经存在的证据，生成一份待用户确认的阶段答卷。不能确认答卷，也不能直接修改长期方向。',
      inputSchema: {
        type: 'object',
        properties: {
          review_id: { type: 'string' }, period: { type: 'string' }, domain_id: { type: 'string' }, evidence_ids: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'string' } },
          summary: { type: 'string' }, observed_change: { type: 'string' }, gap: { type: 'string' }, next_focus: { type: 'string' }, sensitivity: { type: 'string', enum: ['normal', 'sensitive'] }
        },
        required: ['review_id', 'period', 'evidence_ids', 'summary'], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const result = Ledger.stageReview(compassLedger, input, data);
        compassLedger = result.ledger;
        persistCompassLedger(); renderCompass();
        if (!byId('compassDialog').open) openCompass();
        showToast(result.staged ? 'AI 候选答卷等待你确认' : '这份答卷已经存在，没有重复写入');
        return { status: 'candidate', review_id: input.review_id, staged: result.staged, revision: result.revision };
      }
    });
  }
  function slots(items) {
    return Array.from({ length: 8 }, (_, index) => items[index] || null);
  }
  function directionProgress(directions = []) {
    if (publicDemoMode) return directions.length
      ? { short: `${directions.length} 个示例方向`, long: `${directions.length} 个公开虚构示例方向` }
      : { short: '演示空房间', long: '公开演示空房间' };
    const confirmed = directions.filter(direction => direction.status === 'confirmed').length;
    const candidates = directions.filter(direction => direction.status === 'candidate').length;
    if (!directions.length) return { short: '第二层待共创', long: '第二层仍待共同梳理' };
    if (confirmed === directions.length) return { short: `${confirmed}/${directions.length} 已确认`, long: `${confirmed} / ${directions.length} 个长期方向已确认` };
    if (candidates) return { short: `${candidates} 个候选待确认`, long: `${candidates} 个候选方向等待确认` };
    return { short: `${confirmed}/${directions.length} 已确认`, long: `${confirmed} / ${directions.length} 个长期方向已确认` };
  }
  function openDemoPreview(roomId, directionId = '') {
    const demoUrl = new URL(window.location.href);
    demoUrl.searchParams.delete('demo');
    demoUrl.searchParams.set('mode', 'example');
    demoUrl.searchParams.set('view', 'grid');
    demoUrl.searchParams.set('room', roomId);
    demoUrl.searchParams.delete('action');
    if (directionId) demoUrl.searchParams.set('direction', directionId);
    else demoUrl.searchParams.delete('direction');
    window.location.assign(demoUrl.href);
  }
  function card({ index, title, body, foot, center = false, empty = false, demoPreview = false, onClick }) {
    const element = document.createElement(onClick ? 'button' : 'article');
    if (onClick) element.type = 'button';
    element.className = `grid-card${center ? ' is-center' : ''}${empty ? ' is-empty' : ''}${demoPreview ? ' is-demo-preview' : ''}`;
    element.innerHTML = `<span class="grid-index">${center ? 'CENTER' : String(index).padStart(2, '0')}</span><h3></h3><p></p><span class="card-foot"></span>`;
    element.querySelector('h3').textContent = title;
    element.querySelector('p').textContent = body;
    element.querySelector('.card-foot').textContent = foot;
    if (onClick) element.addEventListener('click', onClick);
    return element;
  }
  function renderRootGrid() {
    const grid = byId('gridCanvas');
    grid.innerHTML = '';
    const dimensionSlots = slots(data.dimensions);
    const layout = [0, 1, 2, 7, 'center', 3, 6, 5, 4];
    layout.forEach(slotIndex => {
      const item = slotIndex === 'center' ? 'center' : dimensionSlots[slotIndex];
      if (slotIndex === 'center') {
        const centerFoot = publicDemoMode ? '公开虚构示例' : (data.center.status === 'confirmed' ? '已确认方向' : (data.center.status === 'candidate' ? '候选愿景待确认' : '等待对话'));
        grid.append(card({ index: 0, center: true, title: data.center.title || '我想要的生活与成长', body: data.center.desired_state || '先从一个真实困惑聊起，方向会慢慢出现。', foot: centerFoot }));
      } else if (item) {
        const actualIndex = slotIndex + 1;
        const directions = item.support_factors || [];
        const foot = `${directionProgress(directions).short} →`;
        grid.append(card({ index: actualIndex, title: item.title || `维度 ${actualIndex}`, body: item.desired_state || item.summary || '已经有线索，继续聊清楚这个方向。', foot, onClick: () => { currentDimensionId = item.id; dimensionLayer = 'directions'; render(); } }));
      } else {
        grid.append(card({
          index: slotIndex + 1,
          title: '等待对话形成',
          body: blankTemplateMode ? '这里还没有答案。先从一个真实的普通日子说起。' : '没有谈到的生活领域会继续留白。',
          foot: '空白不是欠缺',
          empty: true
        }));
      }
    });
    byId('breadcrumbs').textContent = '人生总盘';
    byId('backToRootButton').hidden = true;
    byId('dimensionLayerSwitch').hidden = true;
    byId('contextLabel').textContent = '当前月份';
    byId('activePeriodLabel').textContent = Model.periodLabel(data.meta.active_period);
  }
  function renderDimensionGrid(dimension) {
    const grid = byId('gridCanvas');
    const period = Model.getActivePeriod(data, dimension.id);
    grid.innerHTML = '';
    const showingDirections = dimensionLayer === 'directions';
    const layerItems = showingDirections ? (dimension.support_factors || []) : (period?.todos || []);
    const layerSlots = slots(layerItems);
    byId('dimensionLayerSwitch').hidden = false;
    document.querySelectorAll('.layer-button').forEach(button => {
      const on = button.dataset.layer === dimensionLayer;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    byId('contextLabel').textContent = showingDirections ? '当前层级' : '当前月份';
    byId('activePeriodLabel').textContent = showingDirections ? '长期努力方向' : (period?.label || Model.periodLabel(data.meta.active_period));
    const layout = [0, 1, 2, 7, 'center', 3, 6, 5, 4];
    layout.forEach(slotIndex => {
      const item = slotIndex === 'center' ? 'center' : layerSlots[slotIndex];
      if (slotIndex === 'center') {
        const directionCount = dimension.support_factors?.length || 0;
        const confirmedCount = dimension.support_factors?.filter(direction => direction.status === 'confirmed').length || 0;
        const foot = showingDirections
          ? (publicDemoMode ? `${directionCount} 个示例方向` : (directionCount ? `${confirmedCount}/${directionCount} 已确认` : '等待继续对话'))
          : (period?.label || Model.periodLabel(data.meta.active_period));
        grid.append(card({ center: true, title: dimension.title, body: dimension.desired_state || '这个房间的方向仍在形成。', foot }));
      } else if (item) {
        const actualIndex = slotIndex + 1;
        if (showingDirections) {
          grid.append(card({
            index: actualIndex,
            title: item.title,
            body: item.desired_state || item.summary || '这个方向已经出现，继续把它说具体。',
            foot: `${directionStatusText(item.status)} · 打开 →`,
            onClick: event => openDirectionWorkbench(dimension.id, item.id, event.currentTarget, 0)
          }));
        } else {
          grid.append(card({ index: actualIndex, title: item.title, body: item.plan || item.done_definition || '打开补充具体计划与真实记录。', foot: `${statusLabels[item.status]} · ${item.records.length} 条记录`, onClick: () => isolatedPreviewMode ? showToast('教学案例与空白模板均为只读；切换到“我的地图”后再记录') : openTodoDialog(dimension.id, item) }));
        }
      } else {
        const index = slotIndex + 1;
        if (showingDirections) {
          grid.append(card({
            index,
            title: '这个方向还没有出现',
            body: '有真实线索时再让它进入地图，不为了填满而命名。',
            foot: '等待继续对话',
            empty: true
          }));
        } else {
          grid.append(card({ index, title: '这个月还可以留白', body: '有真正想推进的事时再增加，不为了填满而制造待办。', foot: '+ 添加本月事项', empty: true, onClick: () => openTodoDialog(dimension.id, null) }));
        }
      }
    });
    byId('breadcrumbs').innerHTML = '';
    const crumb = document.createElement('button');
    crumb.type = 'button'; crumb.textContent = '人生总盘'; crumb.addEventListener('click', () => { currentDimensionId = null; render(); });
    byId('breadcrumbs').append(crumb, document.createTextNode(` / ${dimension.title}`));
    byId('backToRootButton').hidden = false;
  }
  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function setRoomBackdropAccessibility(hidden) {
    [document.querySelector('.topbar'), document.querySelector('.workspace-head'), byId('corridorTrack')]
      .filter(Boolean)
      .forEach(element => {
        element.inert = hidden;
        if (hidden) element.setAttribute('aria-hidden', 'true');
        else element.removeAttribute('aria-hidden');
      });
  }
  function corridorMetrics() {
    const track = byId('corridorTrack');
    const stage = byId('corridorStage');
    const top = window.scrollY + track.getBoundingClientRect().top;
    return { top, range: Math.max(1, track.offsetHeight - stage.offsetHeight) };
  }
  function corridorProgressValue() {
    const metrics = corridorMetrics();
    return clamp((window.scrollY - metrics.top) / metrics.range);
  }
  function scheduleCorridorUpdate() {
    if (corridorFrame) return;
    corridorFrame = requestAnimationFrame(updateCorridor);
  }
  function updateCorridor() {
    corridorFrame = 0;
    const stage = byId('corridorStage');
    if (!stage || activeView !== 'rooms' || !corridorEntered || focusedRoomId) return;
    const reduced = prefersReducedMotion();
    corridorTargetProgress = reduced ? 0 : corridorProgressValue();
    corridorCurrentProgress = reduced
      ? 0
      : corridorCurrentProgress + ((corridorTargetProgress - corridorCurrentProgress) * 0.11);
    const progress = corridorCurrentProgress;
    const mobile = window.innerWidth < 640;
    let nearest = null;

    corridorDoorButtons.forEach((button, dimensionId) => {
      const index = data.dimensions.findIndex(item => item.id === dimensionId);
      if (index < 0) return;
      if (reduced) {
        button.classList.add('is-static');
        button.classList.remove('is-active', 'is-near', 'is-passed');
        button.setAttribute('aria-current', 'false');
        button.setAttribute('aria-label', `进入房间：${data.dimensions[index].title}`);
        return;
      }

      const relative = corridorStops[index] - progress;
      const depth = clamp(1 - (relative / 0.29));
      const passed = relative < -0.025 ? clamp((-relative - 0.025) / 0.105) : 0;
      const arriving = clamp(1 - Math.abs(relative) / 0.105);
      const enteringScale = 0.1 + Math.pow(depth, 1.72) * 0.92;
      const scale = enteringScale + (passed * 0.52);
      const side = index % 2 === 0 ? -1 : 1;
      const horizontal = side * (3.5 + Math.pow(depth, 1.18) * (mobile ? 11 : 28));
      const vertical = -8 + depth * (mobile ? 11 : 13);
      const appear = clamp((0.34 - relative) / 0.075);
      const opacity = appear * (1 - passed);
      const turn = side * (17 - depth * 10);

      button.classList.remove('is-static');
      button.classList.toggle('is-near', arriving > 0.34);
      button.classList.toggle('is-passed', passed > 0.08);
      button.style.setProperty('--door-x', `${horizontal}vw`);
      button.style.setProperty('--door-y', `${vertical}vh`);
      button.style.setProperty('--door-scale', scale.toFixed(4));
      button.style.setProperty('--door-opacity', opacity.toFixed(4));
      button.style.setProperty('--door-turn', `${turn.toFixed(2)}deg`);
      button.style.setProperty('--door-color', arriving.toFixed(4));
      button.style.setProperty('--door-mask', `${((1 - arriving) * 100).toFixed(2)}%`);
      button.style.zIndex = String(Math.round(depth * 100));

      const distance = Math.abs(relative);
      if (!nearest || distance < nearest.distance) nearest = { index, dimensionId, distance, side, arriving };
    });

    corridorActiveId = nearest && nearest.distance <= 0.052 ? nearest.dimensionId : null;
    corridorDoorButtons.forEach((button, dimensionId) => {
      const active = dimensionId === corridorActiveId;
      const dimension = data.dimensions.find(item => item.id === dimensionId);
      const canEnter = reduced || active;
      button.classList.toggle('is-active', active);
      button.tabIndex = reduced || active ? 0 : -1;
      button.setAttribute('aria-current', active ? 'step' : 'false');
      button.setAttribute('aria-label', `${canEnter ? '推门进入' : '走近'}房间：${dimension?.title || ''}`);
      const action = button.querySelector('.door-action');
      if (action) action.textContent = canEnter ? '推门进入 →' : '继续靠近';
    });

    const glanceTarget = nearest ? (-nearest.side * nearest.arriving * 2.5) + (corridorPointerX * 0.7) : corridorPointerX * 0.7;
    const glanceSpeed = Math.abs(glanceTarget) < Math.abs(corridorLook) ? 0.13 : 0.055;
    corridorLook += (glanceTarget - corridorLook) * (reduced ? 1 : glanceSpeed);
    stage.style.setProperty('--camera-look', `${corridorLook.toFixed(3)}deg`);
    stage.style.setProperty('--corridor-travel', `${Math.round(progress * 1680)}px`);
    byId('corridorProgressBar').style.width = `${Math.round(progress * 100)}%`;

    if (!nearest) return;
    const dimension = data.dimensions[nearest.index];
    byId('corridorRoomCount').textContent = `房间 · ${String(nearest.index + 1).padStart(2, '0')} / ${String(data.dimensions.length).padStart(2, '0')}`;
    byId('corridorRoomTitle').textContent = corridorActiveId ? `现在可以进入「${dimension.title}」` : `正在靠近「${dimension.title}」`;
    if (Math.abs(corridorTargetProgress - corridorCurrentProgress) > 0.00015 || Math.abs(glanceTarget - corridorLook) > 0.002) scheduleCorridorUpdate();
  }
  function roomJourneyRange() {
    const focus = byId('roomFocus');
    return Math.max(1, focus.scrollHeight - focus.clientHeight);
  }
  function scheduleRoomJourneyUpdate() {
    if (roomJourneyFrame) return;
    roomJourneyFrame = requestAnimationFrame(updateRoomJourney);
  }
  function travelToRoomStop(step) {
    const stage = byId('roomStage');
    if (!stage) return;
    const lastStep = Number(stage.dataset.lastStep || 1);
    const top = roomJourneyRange() * (clamp(step, 0, lastStep) / lastStep);
    byId('roomFocus').scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  function updateRoomJourney() {
    roomJourneyFrame = 0;
    if (!focusedRoomId) return;
    const focus = byId('roomFocus');
    const stage = byId('roomStage');
    if (!stage) return;
    const nodes = [...stage.querySelectorAll('.room-direction-object')];
    const monthlyStep = nodes.length + 1;
    const exitStep = nodes.length + 2;
    const lastStep = Math.max(2, exitStep);
    const reduced = prefersReducedMotion();
    const mobile = window.innerWidth < 640;
    roomJourneyTarget = clamp(focus.scrollTop / roomJourneyRange());
    roomJourneyCurrent = reduced
      ? roomJourneyTarget
      : roomJourneyCurrent + ((roomJourneyTarget - roomJourneyCurrent) * 0.12);
    const phase = roomJourneyCurrent * lastStep;
    const nearestStep = Math.max(0, Math.min(lastStep, Math.round(phase)));
    const activeStep = nearestStep;
    const layout = stage.dataset.layout || 'gallery';
    const hero = stage.querySelector('.room-hero');
    const heroPresence = clamp(1 - phase / 0.88);
    hero?.style.setProperty('--hero-presence', heroPresence.toFixed(4));

    nodes.forEach((node, index) => {
      const distance = (index + 1) - phase;
      const absolute = Math.abs(distance);
      const active = clamp(1 - absolute / 0.72);
      const lane = ((index % 3) - 1);
      let x = 0;
      let y = 0;
      let scale = 1;
      let opacity = clamp(1.25 - absolute / 1.65);
      let rotate = lane * 1.8;
      let rotateY = 0;

      if (layout === 'route') {
        const side = index % 2 === 0 ? -1 : 1;
        x = mobile ? distance * 84 : side * 20 + distance * 28;
        y = mobile ? 0 : ((index % 4) - 1.5) * 4 - distance * 7;
        scale = 0.62 + active * 0.44;
        opacity = 0.12 + active * 0.88;
        rotate = side * 1.2;
      } else if (layout === 'gallery') {
        x = distance * (mobile ? 86 : 43);
        y = lane * (mobile ? 5 : 9) + Math.min(absolute, 1.4) * 2;
        scale = 0.64 + active * 0.42;
        rotate = lane * 2.4 - distance * 1.8;
      } else if (layout === 'constellation') {
        const point = constellationPositions[index % constellationPositions.length];
        const settle = mobile ? active : active * 0.58;
        x = (point[0] - 50) * (1 - settle);
        y = (point[1] - 50) * (1 - settle);
        scale = 0.48 + active * 0.62;
        opacity = 0.2 + active * 0.8;
        rotate = (index % 2 ? 1 : -1) * (1 - active) * 4;
      } else if (layout === 'vitals') {
        const point = treePositions[index % treePositions.length];
        const settle = mobile ? active : active * 0.7;
        x = (point[0] - 50) * (1 - settle);
        y = (point[1] - 50) * (1 - settle);
        scale = 0.54 + active * 0.52;
        opacity = 0.16 + active * 0.84;
        rotate = 0;
      } else if (layout === 'book') {
        const side = index % 2 === 0 ? -1 : 1;
        x = mobile ? distance * 82 : side * 19 + distance * 25;
        y = (index % 4 < 2 ? -1 : 1) * (mobile ? 2 : 4);
        scale = 0.72 + active * 0.34;
        rotate = side * 0.7;
        rotateY = clamp(distance, -1.2, 1.2) * -48 + side * 5;
        opacity = clamp(1.18 - absolute / 1.25);
      } else if (layout === 'ledger') {
        const side = index % 2 === 0 ? -1 : 1;
        x = mobile ? distance * 84 : side * 22 + distance * 13;
        y = distance * (mobile ? 7 : 32);
        scale = 0.68 + active * 0.36;
        opacity = clamp(1.14 - absolute / 1.18);
        rotate = side * 0.9;
        rotateY = clamp(distance, -1, 1) * -13;
      } else if (layout === 'cabinet') {
        const point = cabinetPositions[index % cabinetPositions.length];
        const settle = mobile ? active : active * 0.72;
        x = (point[0] - 50) * (1 - settle);
        y = (point[1] - 50) * (1 - settle);
        scale = 0.56 + active * 0.5;
        opacity = 0.18 + active * 0.82;
        rotate = ((index % 3) - 1) * (1 - active) * 2;
      } else if (layout === 'album') {
        const point = tablePositions[index % tablePositions.length];
        const settle = mobile ? active : active * 0.82;
        x = (point[0] - 50) * (1 - settle);
        y = (point[1] - 50) * (1 - settle);
        scale = 0.56 + active * 0.5;
        opacity = 0.2 + active * 0.8;
        rotate = (index % 2 ? 2 : -2) * (1 - active);
      } else {
        const side = index % 2 === 0 ? -1 : 1;
        x = mobile ? distance * 84 : side * 18 + distance * 18;
        y = ((index % 3) - 1) * (mobile ? 3 : 6) + Math.min(absolute, 1.3) * 2;
        scale = 0.66 + active * 0.4;
        opacity = clamp(1.2 - absolute / 1.35);
        rotate = side * 4 + distance * 2.2;
      }

      node.style.setProperty('--node-x', `${x.toFixed(3)}vw`);
      node.style.setProperty('--node-y', `${y.toFixed(3)}vh`);
      node.style.setProperty('--node-scale', scale.toFixed(4));
      node.style.setProperty('--node-opacity', opacity.toFixed(4));
      node.style.setProperty('--node-rotate', `${rotate.toFixed(3)}deg`);
      node.style.setProperty('--node-rotate-y', `${rotateY.toFixed(3)}deg`);
      node.style.setProperty('--node-active', active.toFixed(4));
      node.classList.toggle('is-active', activeStep === index + 1);
      node.setAttribute('aria-current', activeStep === index + 1 ? 'step' : 'false');
      node.tabIndex = reduced || activeStep === index + 1 ? 0 : -1;
    });

    const monthly = stage.querySelector('.room-monthly-dock');
    const monthlyDistance = monthlyStep - phase;
    const monthlyPresence = clamp(1 - Math.abs(monthlyDistance) / 0.32);
    const monthlyActive = reduced || activeStep === monthlyStep;
    monthly?.style.setProperty('--monthly-presence', monthlyPresence.toFixed(4));
    monthly?.classList.toggle('is-active', monthlyActive);
    if (monthly) {
      if (monthlyActive) {
        monthly.removeAttribute('inert');
        monthly.removeAttribute('aria-hidden');
      } else {
        monthly.setAttribute('inert', '');
        monthly.setAttribute('aria-hidden', 'true');
      }
    }
    const exitPortal = stage.querySelector('.room-exit-portal');
    const exitDistance = exitStep - phase;
    const exitPresence = clamp(1 - Math.abs(exitDistance) / 0.42);
    const exitActive = reduced || activeStep === exitStep;
    exitPortal?.style.setProperty('--exit-presence', exitPresence.toFixed(4));
    exitPortal?.classList.toggle('is-active', exitActive);
    if (exitPortal) {
      if (exitActive) {
        exitPortal.removeAttribute('inert');
        exitPortal.removeAttribute('aria-hidden');
      } else {
        exitPortal.setAttribute('inert', '');
        exitPortal.setAttribute('aria-hidden', 'true');
      }
    }
    const empty = stage.querySelector('.room-empty-space');
    if (empty) empty.style.setProperty('--empty-presence', clamp(1 - Math.abs(0.62 - phase) / 0.38).toFixed(4));

    stage.querySelectorAll('.room-waypoint').forEach((button, index) => {
      button.classList.toggle('is-active', index === activeStep);
      button.setAttribute('aria-current', index === activeStep ? 'step' : 'false');
    });
    const readout = stage.querySelector('.room-scene-readout strong');
    const counter = stage.querySelector('.room-scene-readout span');
    const updateReadoutText = (element, value) => {
      if (element && element.textContent !== value) element.textContent = value;
    };
    if (activeStep === 0) {
      updateReadoutText(counter, '入口');
      updateReadoutText(readout, stage.dataset.sceneLabel);
    } else if (activeStep <= nodes.length) {
      const direction = data.dimensions.find(item => item.id === focusedRoomId)?.support_factors?.[activeStep - 1];
      updateReadoutText(counter, `${String(activeStep).padStart(2, '0')} / ${String(nodes.length).padStart(2, '0')}`);
      updateReadoutText(readout, direction?.title || '仍待共创的方向');
    } else if (activeStep === monthlyStep) {
      updateReadoutText(counter, 'NOW');
      updateReadoutText(readout, '这个月正在发生');
    } else {
      updateReadoutText(counter, 'EXIT');
      updateReadoutText(readout, '从这里回到人生长廊');
    }
    stage.style.setProperty('--room-progress', roomJourneyCurrent.toFixed(4));
    stage.querySelector('.room-scene-progress span')?.style.setProperty('width', `${Math.round(roomJourneyCurrent * 100)}%`);
    if (Math.abs(roomJourneyTarget - roomJourneyCurrent) > 0.00015) scheduleRoomJourneyUpdate();
  }
  function enterCorridor({ focus = true } = {}) {
    corridorEntered = true;
    const stage = byId('corridorStage');
    const entry = byId('corridorEntry');
    stage.classList.add('has-entered');
    entry.classList.add('is-opening');
    entry.setAttribute('aria-hidden', 'true');
    corridorTargetProgress = corridorProgressValue();
    corridorCurrentProgress = corridorTargetProgress;
    const finish = () => {
      entry.hidden = true;
      if (focus) stage.focus({ preventScroll: true });
      scheduleCorridorUpdate();
    };
    if (prefersReducedMotion()) finish(); else setTimeout(finish, 760);
  }
  function travelToRoom(dimensionId) {
    const index = data.dimensions.findIndex(item => item.id === dimensionId);
    if (index < 0) return;
    if (prefersReducedMotion()) {
      openRoomFocus(dimensionId, corridorDoorButtons.get(dimensionId));
      return;
    }
    if (!corridorEntered) enterCorridor({ focus: false });
    const metrics = corridorMetrics();
    window.scrollTo({ top: metrics.top + metrics.range * corridorStops[index], behavior: 'smooth' });
    byId('corridorMap').hidden = true;
    byId('corridorMapButton').setAttribute('aria-expanded', 'false');
  }
  function renderRooms() {
    const doors = byId('corridorDoors');
    const map = byId('corridorMap');
    const stage = byId('corridorStage');
    const entry = byId('corridorEntry');
    doors.innerHTML = '';
    map.innerHTML = '';
    corridorDoorButtons.clear();

    data.dimensions.forEach((dimension, index) => {
      const directions = dimension.support_factors || [];
      const progress = directionProgress(directions);
      const scene = sceneForDimension(dimension, index);
      const art = `url('../assets/module-art-v2/${scene.art || 'core.png'}')`;
      const door = document.createElement('button');
      door.type = 'button';
      door.tabIndex = -1;
      door.className = 'corridor-door';
      door.dataset.roomId = dimension.id;
      door.dataset.sceneId = scene.id;
      door.style.setProperty('--room-art', art);
      door.innerHTML = `<span class="door-frame"><span class="door-leaf door-leaf-left"></span><span class="door-leaf door-leaf-right"></span><span class="door-art"></span><span class="door-number">${String(index + 1).padStart(2, '0')}</span><strong class="door-title"></strong><span class="door-status"></span><span class="door-handle" aria-hidden="true"></span><span class="door-action">继续靠近</span></span>`;
      door.querySelector('.door-title').textContent = dimension.title;
      door.querySelector('.door-status').textContent = progress.short;
      door.setAttribute('aria-label', `走近房间：${dimension.title}`);
      door.addEventListener('click', () => {
        if (prefersReducedMotion() || corridorActiveId === dimension.id) openRoomFocus(dimension.id, door);
        else travelToRoom(dimension.id);
      });
      doors.append(door);
      corridorDoorButtons.set(dimension.id, door);

      const mapButton = document.createElement('button');
      mapButton.type = 'button';
      mapButton.className = `corridor-map-room is-${dimension.status || 'raw'}`;
      mapButton.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong></strong><small></small>`;
      mapButton.querySelector('strong').textContent = dimension.title;
      mapButton.querySelector('small').textContent = progress.short;
      mapButton.addEventListener('click', () => travelToRoom(dimension.id));
      map.append(mapButton);
    });

    if (!data.dimensions.length) {
      doors.innerHTML = '<div class="corridor-empty">地图里还没有房间。先通过对话聊出第一个方向。</div>';
      map.innerHTML = '<div class="corridor-empty">还没有可以前往的房间。</div>';
    }
    const staticMode = prefersReducedMotion();
    corridorEntered = corridorEntered || staticMode;
    stage.classList.toggle('has-entered', corridorEntered);
    entry.hidden = corridorEntered && !staticMode;
    entry.classList.toggle('is-opening', corridorEntered && !staticMode);
    if (staticMode) entry.removeAttribute('aria-hidden');
    else if (corridorEntered) entry.setAttribute('aria-hidden', 'true');
    else entry.removeAttribute('aria-hidden');
    if (focusedRoomId) {
      corridorTrigger = corridorDoorButtons.get(focusedRoomId) || corridorTrigger;
      renderRoomFocus(focusedRoomId);
    }
    scheduleCorridorUpdate();
  }
  function renderRoomFocus(dimensionId) {
    const dimension = data.dimensions.find(item => item.id === dimensionId);
    if (!dimension) { exitRoomFocus(); return; }
    const index = data.dimensions.indexOf(dimension) + 1;
    const period = Model.getActivePeriod(data, dimension.id);
    const directions = dimension.support_factors || [];
    const scene = sceneForDimension(dimension, index - 1);
    const roomFocus = byId('roomFocus');
    roomFocus.style.setProperty('--focus-art', `url('../assets/module-art-v2/${scene.art || 'core.png'}')`);
    roomFocus.dataset.roomId = dimensionId;
    roomFocus.dataset.sceneId = scene.id;
    roomFocus.dataset.layout = scene.layout;
    const focus = byId('roomFocusContent');
    const monthlyStep = directions.length + 1;
    const exitStep = directions.length + 2;
    const lastStep = exitStep;
    focus.innerHTML = `<div class="room-journey room-layout-${scene.layout}" style="--room-height:${Math.max(4, directions.length + 3) * 82}svh"><div class="room-stage" id="roomStage" tabindex="-1"><div class="room-space" aria-hidden="true"><span class="room-space-plane room-space-plane-one"></span><span class="room-space-plane room-space-plane-two"></span><span class="room-space-orbit room-space-orbit-one"></span><span class="room-space-orbit room-space-orbit-two"></span></div>${sceneMetaphorMarkup(scene.layout)}<header class="room-hero"><span class="room-number"></span><p class="eyebrow">${publicDemoMode ? '公开虚构演示 · ' : ''}你已经走进这个生活房间</p><h3 tabindex="-1"></h3><p class="focus-desired"></p><div class="room-hero-art" aria-hidden="true"></div><div class="room-hero-cue"><span></span><strong></strong></div></header><div class="room-direction-scene" aria-label="这个房间的长期方向"></div><div class="room-empty-space" hidden><span>这里还没有被替你填满</span><strong>第二层待继续共创</strong><p>有真实线索时再让一个方向出现。</p></div><section class="room-monthly-dock" aria-label="这个月正在发生" aria-hidden="true" inert><div class="room-monthly-head"><div><p class="eyebrow period-eyebrow"></p><h4>这个月正在发生</h4><p>长期方向和月度行动分开保存；这里只放当月真正要推进的事。</p></div><button class="button button-primary focus-add" type="button">+ 添加一件事</button></div><div class="room-focus-tasks"></div></section><section class="room-exit-portal" aria-label="离开这个房间" aria-hidden="true" inert><span>END OF THIS ROOM</span><h4>这一程先到这里</h4><p>回到长廊时，你会停在刚才的房门前，可以从这里继续走。</p><button class="button room-exit-button" type="button">走出房间 · 回到这扇门前 →</button></section><nav class="room-waypoints" aria-label="房间内快速导航"></nav><div class="room-scene-readout" aria-live="polite"><span>入口</span><strong></strong><div class="room-scene-progress" aria-hidden="true"><span></span></div></div><p class="room-scroll-hint">继续滚动；终点可以直接离开</p></div></div>`;
    const stage = focus.querySelector('.room-stage');
    stage.dataset.layout = scene.layout;
    stage.dataset.lastStep = String(lastStep);
    stage.dataset.sceneLabel = scene.label;
    focus.querySelector('.room-number').textContent = String(index).padStart(2, '0');
    focus.querySelector('h3').textContent = dimension.title;
    focus.querySelector('.focus-desired').textContent = dimension.desired_state || '这个方向仍在形成。';
    focus.querySelector('.room-hero-cue span').textContent = scene.label;
    focus.querySelector('.room-hero-cue strong').textContent = scene.hint;
    focus.querySelector('.room-scene-readout strong').textContent = scene.label;
    focus.querySelector('.period-eyebrow').textContent = period?.label || Model.periodLabel(data.meta.active_period);
    const focusAdd = focus.querySelector('.focus-add');
    focusAdd.hidden = isolatedPreviewMode;
    if (!isolatedPreviewMode) focusAdd.addEventListener('click', () => openTodoDialog(dimension.id, null));
    focus.querySelector('.room-exit-button').addEventListener('click', exitRoomFocus);
    const overviewButton = byId('roomOverviewButton');
    overviewButton.hidden = !directions.length;
    overviewButton.dataset.directionId = directions[0]?.id || '';
    overviewButton.querySelector('strong').textContent = `${directions.length} 个方向 · 随时查看`;
    const directionScene = focus.querySelector('.room-direction-scene');
    const waypoints = focus.querySelector('.room-waypoints');
    const introWaypoint = document.createElement('button');
    introWaypoint.type = 'button'; introWaypoint.className = 'room-waypoint is-active'; introWaypoint.setAttribute('aria-label', `回到「${dimension.title}」房间入口`); introWaypoint.setAttribute('aria-current', 'step');
    introWaypoint.addEventListener('click', () => travelToRoomStop(0));
    waypoints.append(introWaypoint);
    if (!directions.length) focus.querySelector('.room-empty-space').hidden = false;
    directions.forEach(direction => {
      const directionIndex = directions.indexOf(direction);
      const point = constellationPositions[directionIndex % constellationPositions.length];
      const object = document.createElement('button');
      object.type = 'button';
      object.className = `room-direction-object is-${direction.status || 'raw'}`;
      object.dataset.nodeIndex = String(directionIndex);
      object.dataset.directionId = direction.id;
      object.style.setProperty('--base-x', `${point[0]}%`);
      object.style.setProperty('--base-y', `${point[1]}%`);
      object.innerHTML = '<span class="room-object-symbol" aria-hidden="true"></span><span class="room-object-index"></span><span class="room-object-status"></span><h4></h4><p></p><span class="room-object-open">打开方向工作台 →</span>';
      object.querySelector('.room-object-index').textContent = `${String(directionIndex + 1).padStart(2, '0')} / ${String(directions.length).padStart(2, '0')}`;
      object.querySelector('.room-object-status').textContent = directionStatusText(direction.status);
      object.querySelector('h4').textContent = direction.title;
      object.querySelector('p').textContent = direction.desired_state || '这个方向的细节仍待继续共创。';
      object.setAttribute('aria-label', `打开方向工作台：${direction.title}，${directionStatusText(direction.status)}`);
      object.addEventListener('click', () => {
        openDirectionWorkbench(dimension.id, direction.id, object, roomFocus.scrollTop);
      });
      directionScene.append(object);

      const waypoint = document.createElement('button');
      waypoint.type = 'button'; waypoint.className = 'room-waypoint'; waypoint.setAttribute('aria-label', `查看第 ${directionIndex + 1} 个方向：${direction.title}`);
      waypoint.addEventListener('click', () => travelToRoomStop(directionIndex + 1));
      waypoints.append(waypoint);
    });
    const monthlyWaypoint = document.createElement('button');
    monthlyWaypoint.type = 'button'; monthlyWaypoint.className = 'room-waypoint'; monthlyWaypoint.setAttribute('aria-label', `查看${period?.label || Model.periodLabel(data.meta.active_period)}的行动`);
    monthlyWaypoint.addEventListener('click', () => travelToRoomStop(monthlyStep));
    waypoints.append(monthlyWaypoint);
    const exitWaypoint = document.createElement('button');
    exitWaypoint.type = 'button'; exitWaypoint.className = 'room-waypoint'; exitWaypoint.setAttribute('aria-label', '前往房间出口');
    exitWaypoint.addEventListener('click', () => travelToRoomStop(exitStep));
    waypoints.append(exitWaypoint);
    const tasks = focus.querySelector('.room-focus-tasks');
    const todos = period?.todos || [];
    if (!todos.length) tasks.innerHTML = '<div class="empty-hint">本月还没有内容。可以继续留白，也可以添加第一件真正想推进的事。</div>';
    todos.forEach(todo => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'room-focus-task';
      button.innerHTML = '<strong></strong><span class="focus-plan"></span><span class="focus-meta"></span>';
      button.querySelector('strong').textContent = todo.title;
      button.querySelector('.focus-plan').textContent = todo.plan || todo.done_definition;
      button.querySelector('.focus-meta').textContent = `${statusLabels[todo.status]} · ${todo.records.length} 条${publicDemoMode ? '虚构示例' : '真实'}记录`;
      button.addEventListener('click', () => openTodoDialog(dimension.id, todo));
      tasks.append(button);
    });
    scheduleRoomJourneyUpdate();
  }
  function workbenchEmpty(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'workbench-empty';
    paragraph.textContent = message;
    return paragraph;
  }
  function resolveDirectionWorkbenchReturnTrigger(context) {
    if (context?.kind === 'overview') return byId('roomOverviewButton');
    return [...document.querySelectorAll('.room-direction-object')].find(node => node.dataset.directionId === context?.directionId) || null;
  }
  function openDirectionWorkbench(dimensionId, directionId, trigger = null, savedRoomScrollTop = null, returnContext = null) {
    const dimension = data.dimensions.find(item => item.id === dimensionId);
    const direction = dimension?.support_factors?.find(item => item.id === directionId);
    if (!dimension || !direction) return;
    const dialog = byId('directionWorkbenchDialog');
    const linkedTodos = Model.getTodosForDirection(data, dimensionId, directionId);
    const evidence = linkedTodos.flatMap(todo => todo.records.map(record => ({ ...record, todo_title: todo.title })));
    activeWorkbench = { dimensionId, directionId };
    if (!dialog.open) {
      const roomScrollTop = Number(savedRoomScrollTop ?? byId('roomFocus').scrollTop);
      const externalTrigger = trigger && !dialog.contains(trigger) ? trigger : null;
      const triggerKind = externalTrigger?.classList.contains('room-overview-button') ? 'overview' : 'direction';
      directionWorkbenchReturn = returnContext || {
        kind: triggerKind,
        directionId: triggerKind === 'direction' ? (externalTrigger?.dataset.directionId || directionId) : '',
        scrollTop: roomScrollTop
      };
      directionWorkbenchReturn.scrollTop = roomScrollTop;
      directionWorkbenchTrigger = externalTrigger
        || resolveDirectionWorkbenchReturnTrigger(directionWorkbenchReturn)
        || directionWorkbenchTrigger;
      dialog.dataset.roomScrollTop = String(roomScrollTop);
      directionWorkbenchTrigger?.focus?.({ preventScroll: true });
    }
    byId('directionWorkbenchContext').textContent = `${publicDemoMode ? '公开虚构演示 · ' : ''}${dimension.title} · 长期方向`;
    byId('directionWorkbenchTitle').textContent = direction.title;
    byId('directionWorkbenchStatus').textContent = directionStatusText(direction.status);
    byId('directionWorkbenchGoal').textContent = direction.desired_state || direction.summary || '这一项的目标还没有记录，待继续共创。';
    byId('directionWorkbenchBaseline').textContent = direction.anti_vision || '尚未记录。之后可以补充这个方向最不希望滑向的状态。';
    const operatingLoop = direction.operating_loop || {};
    byId('directionWorkbenchInput').textContent = operatingLoop.input || '把真实经历、观察和新信息带进来。';
    byId('directionWorkbenchPractice').textContent = operatingLoop.practice || '只保留能够稳定重复、又真正靠近目标的实践。';
    byId('directionWorkbenchOutput').textContent = operatingLoop.output || '形成一个可以被看见、使用或验证的结果。';
    byId('directionWorkbenchReview').textContent = operatingLoop.review ? `${operatingLoop.review}回看一次，再决定继续或调整。` : '确认真实变化，再决定继续或调整。';
    byId('directionWorkbenchCadence').textContent = operatingLoop.practice
      ? `${operatingLoop.practice}${operatingLoop.review ? `；${operatingLoop.review}回看。` : '。'}`
      : '尚未记录。之后只留下能稳定重复、又真正靠近目标的行动。';
    byId('directionWorkbenchProjects').textContent = linkedTodos.length
      ? `${linkedTodos.length} 件本月行动正在承接这个方向；打开下方行动可以继续追加真实记录。`
      : (operatingLoop.output
        ? `本月未选为重点。长期可见输出是：${operatingLoop.output}`
        : '本月还没有把它选为重点。它可以继续安静存在，不代表落后。');
    byId('addDirectionTodoButton').hidden = isolatedPreviewMode;

    const directionNav = byId('directionWorkbenchNav');
    directionNav.replaceChildren();
    dimension.support_factors.forEach((item, index) => {
      const itemTodos = Model.getTodosForDirection(data, dimensionId, item.id);
      const recordCount = itemTodos.reduce((sum, todo) => sum + todo.records.length, 0);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `direction-nav-item${item.id === directionId ? ' is-active' : ''}`;
      button.setAttribute('aria-current', item.id === directionId ? 'page' : 'false');
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('strong');
      title.textContent = item.title;
      const meta = document.createElement('small');
      meta.textContent = itemTodos.length || recordCount
        ? `${itemTodos.length} 件本月行动 · ${recordCount} 条记录`
        : `${directionStatusText(item.status)} · 尚未关联行动`;
      button.append(number, title, meta);
      button.addEventListener('click', () => openDirectionWorkbench(dimensionId, item.id, button));
      directionNav.append(button);
    });

    const evidenceList = byId('directionWorkbenchEvidence');
    evidenceList.replaceChildren();
    if (!evidence.length) {
      evidenceList.append(workbenchEmpty(operatingLoop.evidence
        ? `前进证据：${operatingLoop.evidence}`
        : '还没有回流记录。完成、反馈、数据或复盘都可以成为证据。'));
    } else {
      evidence.slice(-4).reverse().forEach(record => {
        const item = document.createElement('article');
        item.className = 'workbench-evidence-item';
        const meta = document.createElement('span');
        meta.textContent = `${record.date} · ${record.todo_title}`;
        const text = document.createElement('p');
        text.textContent = record.text;
        item.append(meta, text);
        evidenceList.append(item);
      });
    }

    const actionList = byId('directionWorkbenchActions');
    actionList.replaceChildren();
    if (!linkedTodos.length) {
      actionList.append(workbenchEmpty('这个方向还没有绑定本月行动。可以继续留白，也可以只增加一件真正要推进的事。'));
    } else {
      linkedTodos.forEach(todo => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'workbench-action';
        const title = document.createElement('strong');
        title.textContent = todo.title;
        const meta = document.createElement('span');
        meta.textContent = `${statusLabels[todo.status]} · ${todo.records.length} 条${publicDemoMode ? '虚构示例' : '真实'}记录`;
        const plan = document.createElement('p');
        plan.textContent = todo.plan || todo.done_definition || '没有补充计划说明。';
        button.append(title, plan, meta);
        if (isolatedPreviewMode) {
          button.classList.add('is-readonly');
          button.setAttribute('aria-disabled', 'true');
        } else {
          button.addEventListener('click', () => {
            workbenchTransitioningToTodo = true;
            dialog.close();
            openTodoDialog(dimensionId, todo, directionId, true, directionWorkbenchReturn);
          });
        }
        actionList.append(button);
      });
    }
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => byId('closeDirectionWorkbenchButton').focus({ preventScroll: true }));
  }
  function openRoomFocus(dimensionId, trigger = null) {
    if (focusedRoomId) return;
    clearTimeout(openRoomFocus.timer);
    corridorSavedScrollY = window.scrollY;
    corridorTrigger = trigger || corridorDoorButtons.get(dimensionId) || byId('corridorStage');
    const stage = byId('corridorStage');
    const door = corridorDoorButtons.get(dimensionId);
    const portal = door?.getBoundingClientRect();
    const roomFocus = byId('roomFocus');
    roomFocus.style.setProperty('--portal-x', `${portal ? portal.left + portal.width / 2 : window.innerWidth / 2}px`);
    roomFocus.style.setProperty('--portal-y', `${portal ? portal.top + portal.height / 2 : window.innerHeight / 2}px`);
    stage.classList.add('is-entering-room');
    door?.classList.add('is-opening');

    const finish = () => {
      focusedRoomId = dimensionId;
      renderRoomFocus(dimensionId);
      roomFocus.hidden = false;
      resetRoomJourneyToEntrance(roomFocus);
      document.body.classList.add('room-is-open');
      requestAnimationFrame(() => {
        resetRoomJourneyToEntrance(roomFocus);
        roomFocus.classList.add('is-open');
        byId('exitRoomButton').focus({ preventScroll: true });
        setRoomBackdropAccessibility(true);
        scheduleRoomJourneyUpdate();
      });
      stage.classList.remove('is-entering-room');
    };
    openRoomFocus.timer = setTimeout(finish, prefersReducedMotion() ? 0 : 620);
  }
  function resetRoomJourneyToEntrance(focus) {
    roomJourneyTarget = 0;
    roomJourneyCurrent = 0;
    focus.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    focus.scrollTop = 0;
  }
  function exitRoomFocus() {
    clearTimeout(openRoomFocus.timer);
    const previousRoomId = focusedRoomId;
    const focus = byId('roomFocus');
    if (!previousRoomId || focus.classList.contains('is-closing')) return;
    byId('roomOverviewButton').hidden = true;
    focus.classList.remove('is-open');
    focus.classList.add('is-closing');
    const finish = () => {
      cancelAnimationFrame(roomJourneyFrame);
      roomJourneyFrame = 0;
      focusedRoomId = null;
      resetRoomJourneyToEntrance(focus);
      focus.hidden = true;
      focus.classList.remove('is-closing');
      document.body.classList.remove('room-is-open');
      setRoomBackdropAccessibility(false);
      corridorDoorButtons.get(previousRoomId)?.classList.remove('is-opening');
      window.scrollTo({ top: corridorSavedScrollY, behavior: 'auto' });
      scheduleCorridorUpdate();
      requestAnimationFrame(() => corridorTrigger?.focus?.({ preventScroll: true }));
    };
    setTimeout(finish, prefersReducedMotion() ? 0 : 360);
  }
  function render() {
    byId('pageTitle').textContent = data.meta.title || '我的人生地图';
    if (blankTemplateMode) byId('progressiveFlow').innerHTML = data.dimensions.length
      ? '<strong>当前浏览器中的地图</strong><span>查看长期方向</span><b aria-hidden="true">→</b><span>继续与 AI 校准</span><b aria-hidden="true">→</b><span>导出备份</span>'
      : '<strong>从空白开始</strong><span>复制 Skill 对话</span><b aria-hidden="true">→</b><span>确认自己的方向</span><b aria-hidden="true">→</b><span>本地同步或手动导入</span>';
    const shapedRooms = data.dimensions.filter(dimension => dimension.support_factors?.length).length;
    byId('mapSummary').textContent = publicDemoMode
      ? '进入任意房间，打开一个长期方向，看看它怎样承接少量行动与后续记录。'
      : blankTemplateMode
        ? data.dimensions.length
          ? '这里呈现你导入到当前浏览器的地图。可以查看两层九宫格和房间；重要内容请导出备份。'
          : '这里没有预设人生答案。复制给 Coding Agent，从一个普通但理想的日子开始；手动导入只暂存在当前浏览器。'
        : data.dimensions.length
        ? `${data.dimensions.length} 个人生板块已经落位，${shapedRooms} 个房间正在形成第二层。未完成的位置会继续保留。`
        : localFileMode
          ? '空白网站已连接本地私人地图；和 coding agent 对话后，这里会自动长出来。'
          : '这张网站已经是你的空白人生地图。复制 Skill 开始聊；每确认一部分，就把本轮结果导回来，让房间一点点亮起来。';
    const current = data.dimensions.find(item => item.id === currentDimensionId);
    if (current) renderDimensionGrid(current); else { currentDimensionId = null; renderRootGrid(); }
    renderRooms();
  }
  function openTodoDialog(dimensionId, todo, directionId = todo?.direction_id || '', returnToWorkbench = false, returnContext = null) {
    if (isolatedPreviewMode) {
      showToast('教学案例与空白模板均为只读；切换到“我的地图”后再记录');
      return;
    }
    if (localFileMode) {
      showToast('这里由本地私人地图控制；请在对话里告诉 coding agent 要记录什么');
      return;
    }
    const dimension = data.dimensions.find(item => item.id === dimensionId);
    if (!dimension) return;
    const direction = dimension.support_factors?.find(item => item.id === directionId);
    byId('todoContext').textContent = direction
      ? `${dimension.title} · ${direction.title} · ${Model.periodLabel(data.meta.active_period)}`
      : `${dimension.title} · ${Model.periodLabel(data.meta.active_period)}`;
    byId('todoDialogTitle').textContent = todo ? '更新计划与记录' : '添加一件具体的事';
    byId('todoId').value = todo?.id || '';
    byId('todoDirectionId').value = direction?.id || '';
    byId('todoDirectionLink').hidden = !direction;
    byId('todoDirectionLink').textContent = direction ? `这件事会回到长期方向「${direction.title}」下面。` : '';
    byId('todoTitle').value = todo?.title || '';
    byId('todoPlan').value = todo?.plan || '';
    byId('todoDone').value = todo?.done_definition || '';
    byId('todoStatus').value = todo?.status || 'planned';
    byId('todoRecord').value = '';
    byId('todoForm').dataset.dimensionId = dimensionId;
    if (returnToWorkbench && direction) {
      byId('todoForm').dataset.returnToDimensionId = dimensionId;
      byId('todoForm').dataset.returnToDirectionId = direction.id;
      byId('todoForm').dataset.returnRoomScrollTop = byId('directionWorkbenchDialog').dataset.roomScrollTop || String(byId('roomFocus').scrollTop);
      byId('todoForm').dataset.returnTriggerKind = returnContext?.kind || 'direction';
      byId('todoForm').dataset.returnTriggerDirectionId = returnContext?.directionId || direction.id;
    } else {
      delete byId('todoForm').dataset.returnToDimensionId;
      delete byId('todoForm').dataset.returnToDirectionId;
      delete byId('todoForm').dataset.returnRoomScrollTop;
      delete byId('todoForm').dataset.returnTriggerKind;
      delete byId('todoForm').dataset.returnTriggerDirectionId;
    }
    byId('todoDialog').showModal();
  }

  async function copySkill() {
    const handoff = [
      '请使用 Growing Me 月度人生地图 Skill，陪我通过对话形成自己的两层人生地图。',
      '',
      '请先完整读取仓库中的 AGENTS.md 与 skills/growing-me-life-grid-monthly/SKILL.md；仓库尚未克隆时，先指导我克隆。',
      '有本地文件权限时，运行 ./start，使用 personal 入口和 private/life-grid-monthly.json。',
      '从欢迎语和未来三到五年的一个普通理想日开始，每次只问一个问题。保留我的原话；AI 提炼先标 candidate，只有我明确确认后才写入。',
      '每次写入前展示确切变更，重读最新 revision，校验并从私人文件回读；网站只是这份文件的只读呈现。',
      '未聊到的内容继续留白，64 个方向不是 64 项待办；全局每月只选 1–3 个重点。',
      '如果你确实无法访问本地文件：完成访谈并等我确认后，再交付一份符合 Schema 的完整 JSON，供我手工导入 Blank 页面。该导入只保存在当前浏览器，请提醒我导出备份；不要声称它与 Personal 自动同步。',
      '',
      '仓库内找不到 Skill 时，再读取公开版本：',
      PUBLIC_SKILL_URL,
    ].join('\n');
    const copied = await copyText(handoff);
    if (copied) {
      showToast('已复制给 Coding Agent 的启动指令');
      return;
    }
    window.open(PUBLIC_SKILL_URL, '_blank', 'noopener,noreferrer');
    showToast('浏览器未允许复制，已打开公开 Skill');
  }
  function openImport() {
    if (localFileMode) {
      showToast('本地 Skill 同步已开启；请让 coding agent 更新 private/life-grid-monthly.json');
      return;
    }
    if (isolatedPreviewMode) {
      const privateUrl = new URL(window.location.href);
      privateUrl.searchParams.delete('demo');
      privateUrl.searchParams.set('mode', 'personal');
      privateUrl.searchParams.set('action', 'import');
      window.location.assign(privateUrl.href);
      return;
    }
    pendingImport = null;
    byId('importText').value = '';
    byId('fileInput').value = '';
    byId('importMessage').hidden = true;
    byId('importPreview').hidden = true;
    byId('confirmImportButton').hidden = true;
    byId('importDialog').showModal();
  }

  function closeAdvancedTools() {
    byId('advancedTools')?.removeAttribute('open');
  }
  function previewImport(rawText) {
    try {
      const parsed = JSON.parse(stripCodeFence(rawText));
      pendingImport = Model.importData(parsed);
      const incoming = pendingImport.data;
      if (blankTemplateMode && incoming.meta.visibility === 'demo') {
        throw new Error('这是虚构教学案例，不能导入空白起点。请导入你自己的地图 JSON。');
      }
      const directionCount = incoming.dimensions.reduce((sum, dimension) => sum + (dimension.support_factors?.length || 0), 0);
      const confirmedDirectionCount = incoming.dimensions.reduce((sum, dimension) => sum + (dimension.support_factors?.filter(direction => direction.status === 'confirmed').length || 0), 0);
      const todoCount = incoming.dimensions.reduce((sum, dimension) => sum + (Model.getActivePeriod(incoming, dimension.id)?.todos.length || 0), 0);
      const message = byId('importMessage');
      message.hidden = false;
      message.classList.remove('is-error');
      if (pendingImport.migration) {
        message.textContent = `检测到旧版长期支撑资料：已保留 ${pendingImport.migration.preserved_count} 项为历史参考，本月待办仍为空。`;
      } else {
        message.textContent = '资料格式可以使用。确认后才会替换当前月度地图。';
      }
      const preview = byId('importPreview');
      preview.hidden = false;
      preview.innerHTML = '';
      const lines = [
        `地图：${incoming.meta.title}`,
        `人生维度：${incoming.dimensions.length} 个（其余位置保持空白）`,
        `长期方向：${directionCount} 项（${confirmedDirectionCount} 项已确认）`,
        `当前月份：${Model.periodLabel(incoming.meta.active_period)}`,
        `本月事项：${todoCount} 项`
      ];
      if (pendingImport.migration) lines.push('迁移规则：长期支撑因素不会自动变成月度事项');
      lines.forEach(line => { const p = document.createElement('p'); p.textContent = line; preview.append(p); });
      byId('confirmImportButton').hidden = false;
    } catch (error) {
      pendingImport = null;
      const message = byId('importMessage');
      message.hidden = false; message.classList.add('is-error'); message.textContent = `无法导入：${error.message}`;
      byId('importPreview').hidden = true;
      byId('confirmImportButton').hidden = true;
    }
  }

  function applyActiveView(nextView, { move = false } = {}) {
    activeView = nextView;
    document.querySelectorAll('.view-button').forEach(item => { const on = item.dataset.view === activeView; item.classList.toggle('is-active', on); item.setAttribute('aria-pressed', String(on)); });
    byId('gridView').hidden = activeView !== 'grid'; byId('gridView').classList.toggle('is-active', activeView === 'grid');
    byId('roomsView').hidden = activeView !== 'rooms'; byId('roomsView').classList.toggle('is-active', activeView === 'rooms');
    if (activeView === 'rooms') {
      requestAnimationFrame(() => {
        if (move) byId('corridorTrack').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        scheduleCorridorUpdate();
      });
    } else if (move) {
      requestAnimationFrame(() => byId('gridView').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }));
    }
  }
  document.querySelectorAll('.view-button').forEach(button => button.addEventListener('click', () => applyActiveView(button.dataset.view, { move: true })));
  document.querySelectorAll('.layer-button').forEach(button => button.addEventListener('click', () => {
    dimensionLayer = button.dataset.layer;
    render();
  }));
  byId('backToRootButton').addEventListener('click', () => { currentDimensionId = null; dimensionLayer = 'directions'; render(); });
  byId('enterCorridorButton').addEventListener('click', () => enterCorridor());
  byId('corridorGridButton').addEventListener('click', () => applyActiveView('grid', { move: true }));
  byId('corridorMapButton').addEventListener('click', () => {
    const map = byId('corridorMap');
    map.hidden = !map.hidden;
    byId('corridorMapButton').setAttribute('aria-expanded', String(!map.hidden));
    if (!map.hidden) map.querySelector('button')?.focus({ preventScroll: true });
  });
  byId('corridorStage').addEventListener('pointermove', event => {
    if (prefersReducedMotion()) return;
    corridorPointerX = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    scheduleCorridorUpdate();
  });
  byId('corridorStage').addEventListener('pointerleave', () => { corridorPointerX = 0; scheduleCorridorUpdate(); });
  byId('roomFocus').addEventListener('scroll', scheduleRoomJourneyUpdate, { passive: true });
  byId('exitRoomButton').addEventListener('click', exitRoomFocus);
  byId('roomOverviewButton').addEventListener('click', () => {
    const overviewButton = byId('roomOverviewButton');
    if (!focusedRoomId || !overviewButton.dataset.directionId) return;
    openDirectionWorkbench(focusedRoomId, overviewButton.dataset.directionId, overviewButton, byId('roomFocus').scrollTop);
  });
  byId('closeDirectionWorkbenchButton').addEventListener('click', () => byId('directionWorkbenchDialog').close());
  byId('closeDirectionWorkbenchFooterButton').addEventListener('click', () => byId('directionWorkbenchDialog').close());
  byId('addDirectionTodoButton').addEventListener('click', () => {
    const context = activeWorkbench ? { ...activeWorkbench } : null;
    if (!context) return;
    workbenchTransitioningToTodo = true;
    byId('directionWorkbenchDialog').close();
    openTodoDialog(context.dimensionId, null, context.directionId, true, directionWorkbenchReturn);
  });
  byId('directionWorkbenchDialog').addEventListener('close', () => {
    const dialog = byId('directionWorkbenchDialog');
    const returnContext = directionWorkbenchReturn;
    const savedScrollTop = Number(returnContext?.scrollTop ?? dialog.dataset.roomScrollTop ?? 0);
    const transitioningToTodo = workbenchTransitioningToTodo;
    activeWorkbench = null;
    const restoreRoomPosition = () => {
      if (!focusedRoomId) return;
      byId('roomFocus').scrollTop = savedScrollTop;
      roomJourneyTarget = clamp(savedScrollTop / roomJourneyRange());
      roomJourneyCurrent = roomJourneyTarget;
      scheduleRoomJourneyUpdate();
    };
    requestAnimationFrame(() => {
      restoreRoomPosition();
      requestAnimationFrame(() => {
        restoreRoomPosition();
        if (!transitioningToTodo) {
          const currentTrigger = resolveDirectionWorkbenchReturnTrigger(returnContext);
          (currentTrigger || directionWorkbenchTrigger)?.focus?.({ preventScroll: true });
        }
      });
    });
    directionWorkbenchReturn = null;
    workbenchTransitioningToTodo = false;
  });
  byId('closeImportButton').addEventListener('click', () => byId('importDialog').close());
  byId('cancelImportButton').addEventListener('click', () => byId('importDialog').close());
  byId('closeTodoButton').addEventListener('click', () => byId('todoDialog').close());
  byId('cancelTodoButton').addEventListener('click', () => byId('todoDialog').close());
  byId('compassButton').addEventListener('click', () => {
    closeAdvancedTools();
    openCompass();
  });
  byId('closeCompassButton').addEventListener('click', () => byId('compassDialog').close());
  byId('closeCompassFooterButton').addEventListener('click', () => byId('compassDialog').close());
  byId('toggleCompassImportButton').addEventListener('click', () => {
    const panel = byId('compassImportPanel');
    panel.hidden = !panel.hidden;
    byId('toggleCompassImportButton').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) byId('compassImportText').focus();
  });
  byId('cancelCompassImportButton').addEventListener('click', () => {
    byId('compassImportPanel').hidden = true;
    byId('toggleCompassImportButton').setAttribute('aria-expanded', 'false');
    byId('toggleCompassImportButton').focus();
  });
  byId('stageCompassImportButton').addEventListener('click', () => {
    try {
      const result = stageCompassPayload(byId('compassImportText').value);
      byId('compassImportText').value = '';
      byId('compassImportPanel').hidden = true;
      byId('toggleCompassImportButton').setAttribute('aria-expanded', 'false');
      const count = result.staged_receipts.length + (result.staged_review ? 1 : 0);
      showToast(count ? `${count} 项 AI 内容已暂存，等待你确认` : '这些内容已经存在，没有重复写入');
    } catch (error) { showToast(error.message); }
  });
  byId('exportCompassButton').addEventListener('click', () => {
    download('life-compass-private-ledger.json', `${JSON.stringify(compassLedger, null, 2)}\n`);
    showToast('已导出本设备的人生账本备份');
  });
  byId('todoDialog').addEventListener('close', () => {
    const form = byId('todoForm');
    const returnToDimensionId = form.dataset.returnToDimensionId;
    const returnToDirectionId = form.dataset.returnToDirectionId;
    const returnRoomScrollTop = Number(form.dataset.returnRoomScrollTop || 0);
    const returnTriggerKind = form.dataset.returnTriggerKind;
    const returnTriggerDirectionId = form.dataset.returnTriggerDirectionId;
    delete form.dataset.returnToDimensionId;
    delete form.dataset.returnToDirectionId;
    delete form.dataset.returnRoomScrollTop;
    delete form.dataset.returnTriggerKind;
    delete form.dataset.returnTriggerDirectionId;
    if (returnToDimensionId && returnToDirectionId && focusedRoomId === returnToDimensionId) {
      requestAnimationFrame(() => {
        openDirectionWorkbench(returnToDimensionId, returnToDirectionId, null, returnRoomScrollTop, {
          kind: returnTriggerKind || 'direction',
          directionId: returnTriggerDirectionId || returnToDirectionId,
          scrollTop: returnRoomScrollTop
        });
        byId('roomFocus').scrollTop = returnRoomScrollTop;
        requestAnimationFrame(() => { byId('roomFocus').scrollTop = returnRoomScrollTop; });
      });
    }
  });
  byId('copySkillButton').addEventListener('click', copySkill);
  byId('importButton').addEventListener('click', openImport);
  byId('loadDemoButton').addEventListener('click', () => {
    closeAdvancedTools();
    if (!publicDemoMode) {
      const demoUrl = new URL(window.location.href);
      demoUrl.searchParams.delete('demo');
      demoUrl.searchParams.set('mode', 'example');
      demoUrl.searchParams.set('view', activeView);
      window.location.assign(demoUrl.href);
      return;
    }
    data = Model.normalizeMonthly(DEMO);
    compassLedger = Ledger.blankLedger();
    currentDimensionId = null;
    dimensionLayer = 'directions';
    render();
    showToast('已重置完整虚构演示；私人地图没有变化');
  });
  byId('clearButton').addEventListener('click', () => {
    closeAdvancedTools();
    if (localFileMode) {
      showToast('本地同步模式不会从网页清空地图；请在对话中确认后再由 agent 修改');
      return;
    }
    if (publicDemoMode) {
      data = Model.normalizeMonthly(DEMO); currentDimensionId = null; dimensionLayer = 'directions'; render(); showToast('已重置演示；私人地图没有变化');
      return;
    }
    if (blankTemplateMode) {
      localStorage.removeItem(STARTER_STORAGE_KEY);
      data = Model.blankData(); currentDimensionId = null; dimensionLayer = 'directions'; render(); showToast('已清空并回到可直接使用的起点');
      return;
    }
    if (!window.confirm('重新开始会清空这个独立试验版在当前浏览器中的内容。要先导出备份吗？')) return;
    data = Model.blankData(); currentDimensionId = null; dimensionLayer = 'directions'; persist(); render(); showToast('已重新开始；现有 v7 的保存内容未受影响');
  });
  byId('exportButton').addEventListener('click', () => {
    const filename = publicDemoMode
      ? 'growing-me-complete-example.json'
      : blankTemplateMode
        ? 'growing-me-blank-template.json'
        : 'life-grid-monthly.json';
    download(filename, `${JSON.stringify(data, null, 2)}\n`);
    showToast(publicDemoMode ? '已导出虚构教学案例' : blankTemplateMode ? '已导出空白模板' : '已导出月度地图备份');
  });
  byId('fileInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    byId('importText').value = await file.text();
    previewImport(byId('importText').value);
  });
  byId('previewImportButton').addEventListener('click', () => previewImport(byId('importText').value));
  byId('confirmImportButton').addEventListener('click', () => {
    if (localFileMode) {
      byId('importDialog').close();
      showToast('本地 Skill 同步已接管地图；这份导入没有写入');
      return;
    }
    if (!pendingImport) return;
    data = pendingImport.data; currentDimensionId = null; dimensionLayer = 'directions';
    const saved = persist();
    render();
    byId('importDialog').close();
    showToast(saved
      ? pendingImport.migration ? '旧资料已作为长期参考保留；没有生成任何月度待办' : '地图已导入并保存在当前浏览器'
      : '地图已显示，但当前浏览器未能保存；请立即导出备份');
    pendingImport = null;
  });
  byId('todoForm').addEventListener('submit', event => {
    event.preventDefault();
    if (localFileMode) {
      byId('todoDialog').close();
      showToast('本地 Skill 同步已接管地图；请把这条记录告诉 coding agent');
      return;
    }
    const dimensionId = event.currentTarget.dataset.dimensionId;
    const savedRoomScrollTop = focusedRoomId
      ? Number(event.currentTarget.dataset.returnRoomScrollTop || byId('roomFocus').scrollTop)
      : null;
    const period = Model.getActivePeriod(data, dimensionId);
    const existing = period?.todos.find(item => item.id === byId('todoId').value);
    const todo = {
      ...(existing || {}),
      id: byId('todoId').value || undefined,
      direction_id: byId('todoDirectionId').value || undefined,
      title: byId('todoTitle').value.trim(),
      plan: byId('todoPlan').value.trim(),
      done_definition: byId('todoDone').value.trim(),
      status: byId('todoStatus').value,
      provenance: existing?.provenance || 'user-confirmed',
      records: existing?.records || []
    };
    try {
      data = Model.upsertTodo(data, dimensionId, todo, byId('todoRecord').value);
      persist(); render();
      if (savedRoomScrollTop !== null && focusedRoomId) {
        byId('roomFocus').scrollTop = savedRoomScrollTop;
        roomJourneyTarget = clamp(savedRoomScrollTop / roomJourneyRange());
        roomJourneyCurrent = roomJourneyTarget;
        scheduleRoomJourneyUpdate();
      }
      byId('todoDialog').close(); showToast('计划与记录已保存，两种视图已经同步');
    } catch (error) { showToast(error.message); }
  });
  document.addEventListener('keydown', event => {
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (byId('todoDialog').open || byId('importDialog').open || byId('directionWorkbenchDialog').open || byId('compassDialog').open) return;
    if (focusedRoomId) {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitRoomFocus();
        return;
      }
      const roomDistance = { ArrowDown: 120, ArrowUp: -120, PageDown: window.innerHeight * 0.72, PageUp: -window.innerHeight * 0.72 }[event.key];
      if (roomDistance !== undefined && !prefersReducedMotion()) {
        event.preventDefault();
        byId('roomFocus').scrollBy({ top: roomDistance, behavior: 'smooth' });
      } else if (event.key === 'Home') {
        event.preventDefault(); travelToRoomStop(0);
      } else if (event.key === 'End') {
        event.preventDefault(); travelToRoomStop(Number(byId('roomStage')?.dataset.lastStep || 1));
      }
      return;
    }
    if (activeView !== 'rooms' || !corridorEntered || focusedRoomId) return;
    if (event.key === 'Escape' && !byId('corridorMap').hidden) {
      byId('corridorMap').hidden = true;
      byId('corridorMapButton').setAttribute('aria-expanded', 'false');
      byId('corridorMapButton').focus({ preventScroll: true });
      return;
    }
    const distance = { ArrowDown: 120, ArrowUp: -120, PageDown: window.innerHeight * 0.72, PageUp: -window.innerHeight * 0.72, ' ': window.innerHeight * 0.42 }[event.key];
    if (distance !== undefined && !prefersReducedMotion()) {
      event.preventDefault();
      window.scrollBy({ top: distance, behavior: 'smooth' });
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && corridorActiveId && event.target === byId('corridorStage')) {
      event.preventDefault();
      openRoomFocus(corridorActiveId, corridorDoorButtons.get(corridorActiveId));
    }
  });
  window.addEventListener('scroll', scheduleCorridorUpdate, { passive: true });
  window.addEventListener('resize', () => { scheduleCorridorUpdate(); scheduleRoomJourneyUpdate(); }, { passive: true });
  document.body.classList.add(`experience-${experienceMode}`);
  byId('brandLink').href = `?mode=${experienceMode}&view=grid`;
  byId('experienceModeLabel').textContent = experienceMode === 'example' ? '完整教学案例' : experienceMode === 'blank' ? '空白模板' : '我的私人地图';
  byId('experienceSourceLabel').textContent = experienceMode === 'example'
    ? '数据源：独立虚构教学案例'
    : experienceMode === 'blank'
      ? '数据源：空白起点与当前浏览器导入'
      : '数据源：本机私人文件或当前浏览器';
  byId('workspaceEyebrow').textContent = publicDemoMode
    ? '虚构示例 · 从长期方向到行动记录'
    : blankTemplateMode
      ? '从一次真正的对话开始'
      : '你的私人地图 · 由确认过的内容逐步长成';
  byId('brandSubtitle').textContent = publicDemoMode
    ? '完整教学案例'
    : blankTemplateMode
      ? '空白起点'
      : '我的私人地图';
  byId('progressiveFlow').innerHTML = publicDemoMode
    ? '<strong>这个案例怎样运转</strong><span>长期方向</span><b aria-hidden="true">→</b><span>少量本月行动</span><b aria-hidden="true">→</b><span>示例记录回到方向</span>'
    : blankTemplateMode
      ? '<strong>从空白开始</strong><span>复制 Skill 对话</span><b aria-hidden="true">→</b><span>确认自己的方向</span><b aria-hidden="true">→</b><span>本地同步或手动导入</span>'
      : '<strong>私人地图在本机</strong><span>运行 ./start</span><b aria-hidden="true">→</b><span>和 AI 逐问确认</span><b aria-hidden="true">→</b><span>本地文件自动刷新</span>';
  byId('directionWorkbenchEvidenceHeading').textContent = publicDemoMode ? '示例记录' : '真实证据';
  byId('directionWorkbenchFooterText').textContent = publicDemoMode
    ? '本案例的行动与记录均为虚构，只展示方向如何在日常中持续更新。'
    : '这里只收真实发生的内容；未聊清的部分会继续留白。';
  if (isolatedPreviewMode) {
    document.body.classList.toggle('public-demo-mode', publicDemoMode);
    byId('demoBanner').hidden = false;
    byId('demoBannerTitle').textContent = publicDemoMode ? '虚构案例 · 非真人资料' : '可以直接开始使用的空白版';
    byId('demoBannerText').textContent = publicDemoMode
      ? '8 个房间、64 个方向及 3 件本月重点，只用于说明结构与运行方式。'
      : '复制 Skill 开始对话；有本地文件权限时使用 Personal，手动导入只暂存在当前浏览器。未谈到的内容继续留白。';
    byId('loadDemoButton').textContent = publicDemoMode ? '重置完整教学案例' : '打开完整教学案例';
  }
  if (publicDemoMode) {
    byId('importButton').hidden = true;
    byId('exportButton').textContent = '导出案例';
    byId('advancedTools').hidden = true;
  }
  if (blankTemplateMode) byId('advancedTools').hidden = true;
  byId('compassButton').hidden = !experimentalLedgerMode;
  render();
  if (experimentalLedgerMode) registerSiteTools();
  applyActiveView(activeView, { move: activeView === 'rooms' });
  if (publicDemoMode && requestedDemoDirectionId) {
    const requestedRoom = data.dimensions.find(item => item.id === requestedDemoRoomId);
    const requestedDirectionExists = requestedRoom?.support_factors?.some(item => item.id === requestedDemoDirectionId);
    if (requestedDirectionExists) {
      requestAnimationFrame(() => openDirectionWorkbench(requestedDemoRoomId, requestedDemoDirectionId, null, 0));
    }
  }
  startPrivateFileSync();
  if (experienceMode === 'personal' && urlParams.get('action') === 'import') {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('action');
    window.history.replaceState({}, '', cleanUrl.href);
    requestAnimationFrame(openImport);
  }
})();
