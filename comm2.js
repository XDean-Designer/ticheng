/* ==== comm2 · 提成设置（可整模块删除） ==== */
(function () {
  'use strict';

  var COMM2_CATS = [
    { key: 'labor', label: '项目' },
    { key: 'sales', label: '产品' },
    { key: 'issue', label: '办卡' },
    { key: 'card', label: '充卡' }
  ];
  var COMM2_STATIONS = [
    { id: 'senior', defaultLabel: '大工' },
    { id: 'mid', defaultLabel: '中工' },
    { id: 'junior', defaultLabel: '小工' }
  ];
  var COMM2_PAY_SCOPE = [
    { key: 'cash', label: '现金' },
    { key: 'memberCard', label: '卡付' },
    { key: 'groupBuy', label: '团购' }
  ];
  var BASE_BRIEF = {
    list: '用开单原价加总',
    paid: '用开单实收加总'
  };
  var PICK_BRIEF = {
    avg: '开单不分工位，统一按提成计提；顾客指定可单独设置（叠加在原提成之上）',
    station: '固定大/中/小工，可改名，不可增减；改名全局同步'
  };
  var COMM2_QUICK_OV_ID = 'ov_sys_quick';
  var COMM2_QUICK_REF = 'quick';
  var COMM2_STAFF_IDS = ['st0', 'st1', 'st2', 'st3', 'st4'];
  var COMM2_STAFF_FALLBACK = {
    st0: '顾清扬', st1: '林屿森', st2: '何苏叶', st3: '阿Ken', st4: 'Lisa'
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(msg, isErr) {
    if (typeof showToast === 'function') showToast(msg, !!isErr, 2000);
  }
  function show(id) {
    if (typeof showOnlyScreen === 'function') showOnlyScreen(id);
    else {
      document.querySelectorAll('.screen').forEach(function (el) { el.classList.add('hidden'); });
      var el = $(id); if (el) el.classList.remove('hidden');
    }
  }
  function goNav(id) { if (typeof nav === 'function') nav(id); }
  function backWb() {
    if (typeof window.__empComm2BackHook === 'function' && window.__empComm2BackHook()) return;
    if (typeof openWorkbench === 'function') openWorkbench();
    else show('screen-workbench');
  }
  function openDialog(id) { var el = $(id); if (el) el.classList.add('show'); }
  function closeDialog(id) { var el = $(id); if (el) el.classList.remove('show'); }
  function openSheet(id) { var el = $(id); if (el) el.classList.add('open'); }
  function closeSheet(id) { var el = $(id); if (el) el.classList.remove('open'); }

  function defaultPair() {
    return {
      nonDesignated: 10, nonDesignatedAmt: 0, nonDesignatedValueMode: 'pct',
      extraValue: 0, extraAmt: 0, extraValueMode: 'pct'
    };
  }
  /* 按工位与「顾客指定」为「叠加」关系：工位仅承载「提成」；「顾客指定」的值为 rule 级全局单值，
     与工位无关，计提时**加在**该工位提成之上（不是替换）。
     stations 只存提成侧（nonDesignated / nonDesignatedAmt）+ 本工位 valueMode。 */
  function defaultStationPair() {
    return { nonDesignated: 10, nonDesignatedAmt: 0, valueMode: 'pct' };
  }
  function normalizeValueMode(v) {
    return v === 'amount' ? 'amount' : 'pct';
  }
  function isAmtMode(v) {
    return normalizeValueMode(v) === 'amount';
  }
  function nonIsAmt(rule) {
    return isAmtMode(rule && rule.nonDesignatedValueMode);
  }
  /** 「顾客指定」值是否按固定金额 */
  function extraIsAmt(rule) {
    return isAmtMode(rule && rule.extraValueMode);
  }
  /** 顾客指定值（比例 / 金额按各自 mode 读取） */
  function extraVal(rule, isAmt) {
    rule = rule || defaultPair();
    var amt = arguments.length > 1 ? !!isAmt : extraIsAmt(rule);
    return amt ? (Number(rule.extraAmt) || 0) : (Number(rule.extraValue) || 0);
  }
  function extraKey(isAmt) {
    return isAmt ? 'extraAmt' : 'extraValue';
  }
  function stationIsAmt(st) {
    return isAmtMode(st && st.valueMode);
  }
  /** 规则卡「固定」灰标：当前生效的全部取值均为固定金额时才显示 */
  function ruleAllAmount(rule, pickMode, stationIds) {
    rule = rule || defaultCatRule(stationIds);
    var ids = stationIds || COMM2_STATIONS.map(function (s) { return s.id; });
    if (pickMode === 'station') {
      for (var i = 0; i < ids.length; i++) {
        if (!stationIsAmt(rule.stations && rule.stations[ids[i]])) return false;
      }
    } else if (!nonIsAmt(rule)) {
      return false;
    }
    if (rule.extraSplit && !extraIsAmt(rule)) return false;
    return true;
  }
  /** 同步遗留字段 rule.valueMode（全量固定 → amount，否则 pct） */
  function syncLegacyValueMode(rule, pickMode, stationIds) {
    if (!rule) return rule;
    rule.valueMode = ruleAllAmount(rule, pickMode, stationIds) ? 'amount' : 'pct';
    return rule;
  }
  /* —— 旧模型字段迁移：点客（替换式）→ 顾客指定（叠加式）——
     旧：designated / designatedAmt / designatedValueMode / guestSplit
     新：extraValue / extraAmt / extraValueMode / extraSplit
     值不变，仅把「点客值」改解释为「顾客指定值」；旧按工位 3×2 正交时取首个工位的点客值。 */
  function legacyPairSplits(pair, isAmt) {
    pair = pair || {};
    var desKey = isAmt ? 'designatedAmt' : 'designated';
    var nonKey = isAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    if (pair[desKey] == null) return false;
    return Number(pair[desKey]) !== Number(pair[nonKey]);
  }
  function migrateExtraFields(rule, stationIds) {
    if (!rule || rule._ex1) return rule;
    var ids = stationIds || [];
    var isAmt = isAmtMode(rule.valueMode);
    var legacyFlag = rule.extraSplit != null ? rule.extraSplit : rule.guestSplit;
    var legacySplit = legacyFlag != null ? !!legacyFlag : legacyPairSplits(rule, isAmt);
    if (!legacySplit) {
      for (var i = 0; i < ids.length; i++) {
        if (legacyPairSplits(rule.stations && rule.stations[ids[i]], isAmt)) { legacySplit = true; break; }
      }
    }
    if (rule.extraValue == null) {
      rule.extraValue = Number.isFinite(Number(rule.designated)) ? Number(rule.designated) : 0;
    }
    if (rule.extraAmt == null) {
      rule.extraAmt = Number.isFinite(Number(rule.designatedAmt)) ? Number(rule.designatedAmt) : 0;
    }
    if (rule.extraValueMode == null) {
      rule.extraValueMode = normalizeValueMode(rule.designatedValueMode != null ? rule.designatedValueMode : rule.valueMode);
    }
    if (legacySplit && ids.length && rule.stations) {
      var first = rule.stations[ids[0]];
      var desKey = isAmt ? 'designatedAmt' : 'designated';
      if (first && first[desKey] != null && Number.isFinite(Number(first[desKey]))) {
        rule[isAmt ? 'extraAmt' : 'extraValue'] = Number(first[desKey]);
      }
    }
    if (legacySplit) rule.extraSplit = true;
    delete rule.guestSplit;
    delete rule.designated;
    delete rule.designatedAmt;
    delete rule.designatedValueMode;
    delete rule._gs2;
    rule._ex1 = true;
    return rule;
  }
  /* 旧：规则级单一 valueMode → 新：提成 / 顾客指定 / 各工位各自 valueMode */
  function migratePerValueModes(rule, stationIds) {
    if (!rule || rule._vm2) return rule;
    var legacy = normalizeValueMode(rule.valueMode);
    if (rule.nonDesignatedValueMode == null) rule.nonDesignatedValueMode = legacy;
    if (rule.designatedValueMode == null) rule.designatedValueMode = legacy;
    var ids = stationIds || [];
    if (!rule.stations) rule.stations = {};
    ids.forEach(function (sid) {
      var st = rule.stations[sid];
      if (!st) return;
      if (st.valueMode == null) st.valueMode = legacy;
    });
    rule._vm2 = true;
    return rule;
  }
  function applyExtraSplitFlag(rule, stationIds) {
    var ids = stationIds || COMM2_STATIONS.map(function (s) { return s.id; });
    migrateExtraFields(rule, ids);
    migratePerValueModes(rule, ids);
    rule.extraSplit = !!rule.extraSplit;
    /* 关闭「顾客指定」：顾客指定值归零（q2-A：不保留旧值，再次开启需重新输入） */
    if (!rule.extraSplit) {
      rule.extraValue = 0;
      rule.extraAmt = 0;
    }
    return rule;
  }
  function defaultCatRule(stationIds) {
    var ids = stationIds || COMM2_STATIONS.map(function (s) { return s.id; });
    var stations = {};
    ids.forEach(function (id) { stations[id] = defaultStationPair(); });
    return Object.assign(defaultPair(), {
      valueMode: 'pct',
      nonDesignatedValueMode: 'pct',
      extraValueMode: 'pct',
      extraValue: 0,
      extraAmt: 0,
      extraSplit: false,
      stations: stations,
      _ex1: true,
      _vm2: true
    });
  }
  function defaultStationLabels() {
    var o = {};
    COMM2_STATIONS.forEach(function (s) { o[s.id] = { label: s.defaultLabel }; });
    return o;
  }
  function getStationIds(sch) {
    if (!sch) return COMM2_STATIONS.map(function (s) { return s.id; });
    normalizeScheme(sch);
    return sch.stationIds && sch.stationIds.length ? sch.stationIds.slice() : COMM2_STATIONS.map(function (s) { return s.id; });
  }
  function stationDefaultLabel(id) {
    var def = COMM2_STATIONS.find(function (s) { return s.id === id; });
    if (def) return def.defaultLabel;
    var n = parseInt(String(id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? ('工位' + n) : id;
  }
  function ensureCat(rule, stationIds) {
    var ids = stationIds || COMM2_STATIONS.map(function (s) { return s.id; });
    rule = rule || defaultCatRule(ids);
    if (rule.valueMode !== 'amount') rule.valueMode = 'pct';
    if (!rule.stations) rule.stations = {};
    migratePerValueModes(rule, ids);
    migrateExtraFields(rule, ids);
    rule.nonDesignatedValueMode = normalizeValueMode(rule.nonDesignatedValueMode);
    rule.extraValueMode = normalizeValueMode(rule.extraValueMode);
    ids.forEach(function (sid) {
      var st = rule.stations[sid];
      if (!st) { rule.stations[sid] = defaultStationPair(); return; }
      if (!Number.isFinite(Number(st.nonDesignated))) st.nonDesignated = 10;
      if (!Number.isFinite(Number(st.nonDesignatedAmt))) st.nonDesignatedAmt = 0;
      st.valueMode = normalizeValueMode(st.valueMode);
    });
    ['nonDesignated', 'nonDesignatedAmt', 'extraValue', 'extraAmt'].forEach(function (k) {
      if (!Number.isFinite(Number(rule[k]))) rule[k] = defaultPair()[k];
    });
    return applyExtraSplitFlag(rule, ids);
  }
  function defaultPayScope() {
    return { cash: true, memberCard: true, groupBuy: true };
  }
  function payScopeCountBlock(block) {
    return payScopeLabelsBlock(block).length;
  }
  function payScopeLabelsBlock(block) {
    ensurePayScopeBlock(block);
    return COMM2_PAY_SCOPE.filter(function (d) { return !!block.payScope[d.key]; }).map(function (d) { return d.label; });
  }
  function ensurePayScopeBlock(block) {
    if (!block.payScope || typeof block.payScope !== 'object') block.payScope = defaultPayScope();
    COMM2_PAY_SCOPE.forEach(function (d) {
      if (block.payScope[d.key] == null) block.payScope[d.key] = true;
    });
    return block.payScope;
  }
  function defaultCardBlock(partial) {
    return Object.assign({
      payScope: defaultPayScope(),
      baseMode: 'list',
      pickMode: 'avg',
      rule: defaultCatRule()
    }, partial || {});
  }
  function kindToBelongCat(kind, cardRole) {
    if (kind === 'product') return 'sales';
    if (kind === 'card') return cardRole === 'card' ? 'card' : 'issue';
    return 'labor';
  }
  function isQuickOverride(ov) {
    if (!ov) return false;
    if (ov.system || ov.id === COMM2_QUICK_OV_ID) return true;
    return (ov.targets || []).some(function (t) {
      return t && t.kind === 'project' && t.refId === COMM2_QUICK_REF;
    });
  }

  function isQuickLine(line) {
    if (!line) return false;
    return line.kind === 'quick' ||
      line.refId === COMM2_QUICK_REF ||
      line.name === '快捷开单' ||
      line.category === '快捷开单';
  }

  function userOverrides(sch) {
    return (sch.overrides || []).filter(function (o) { return !isQuickOverride(o); });
  }

  function cloneBlockSnapshot(block, stationIds) {
    var src = block || defaultCardBlock();
    return {
      payScope: JSON.parse(JSON.stringify(ensurePayScopeBlock(src))),
      baseMode: src.baseMode || 'list',
      pickMode: src.pickMode || 'avg',
      rule: JSON.parse(JSON.stringify(ensureCat(src.rule, stationIds)))
    };
  }

  function ensureSystemQuickOverride(sch) {
    if (!sch) return null;
    if (!sch.defaults) sch.defaults = {};
    COMM2_CATS.forEach(function (c) {
      if (!sch.defaults[c.key]) sch.defaults[c.key] = defaultCardBlock();
    });
    if (!sch.overrides) sch.overrides = [];
    /* 勿调 getStationIds：其内部会 normalizeScheme → 再进本函数，形成死循环 */
    var ids = (sch.stationIds && sch.stationIds.length)
      ? sch.stationIds.slice()
      : COMM2_STATIONS.map(function (s) { return s.id; });
    var existing = sch.overrides.find(isQuickOverride);
    if (existing) {
      existing.system = true;
      existing.id = COMM2_QUICK_OV_ID;
      existing.belongCat = 'labor';
      existing.title = '快捷开单';
      existing.targets = [{ kind: 'project', refId: COMM2_QUICK_REF, name: '快捷开单' }];
      ensurePayScopeBlock(existing);
      existing.rule = ensureCat(existing.rule, ids);
      return existing;
    }
    var snap = cloneBlockSnapshot(sch.defaults.labor, ids);
    var row = {
      id: COMM2_QUICK_OV_ID,
      system: true,
      belongCat: 'labor',
      title: '快捷开单',
      payScope: snap.payScope,
      baseMode: snap.baseMode,
      pickMode: snap.pickMode,
      rule: snap.rule,
      targets: [{ kind: 'project', refId: COMM2_QUICK_REF, name: '快捷开单' }]
    };
    sch.overrides.unshift(row);
    return row;
  }

  function normalizeScheme(sch) {
    if (!sch) return sch;
    if (!sch._v3) {
      var stationIds = (sch.stationIds && sch.stationIds.length)
        ? sch.stationIds.slice()
        : COMM2_STATIONS.map(function (s) { return s.id; });
      var defaults = {};
      COMM2_CATS.forEach(function (c) {
        defaults[c.key] = defaultCardBlock({
          payScope: JSON.parse(JSON.stringify(sch.payScope || defaultPayScope())),
          baseMode: sch.baseMode || 'list',
          pickMode: sch.pickMode || 'avg',
          rule: ensureCat(sch.categories && sch.categories[c.key] ? sch.categories[c.key] : null, stationIds)
        });
      });
      var overrides = (sch.items || []).map(function (it, i) {
        return {
          id: 'ov_' + i + '_' + (sch.id || Date.now()),
          belongCat: kindToBelongCat(it.kind, it.cardRole),
          title: it.name || '未命名',
          payScope: JSON.parse(JSON.stringify(sch.payScope || defaultPayScope())),
          baseMode: sch.baseMode || 'list',
          pickMode: sch.pickMode || 'avg',
          rule: ensureCat(it.rule, stationIds),
          targets: [{ kind: it.kind, refId: it.refId, name: it.name || '未命名', cardRole: it.cardRole || (it.kind === 'card' ? 'issue' : undefined) }]
        };
      });
      sch.stationIds = stationIds;
      sch.stationLabels = sch.stationLabels || defaultStationLabels();
      sch.defaults = defaults;
      sch.overrides = overrides;
      sch._v3 = true;
      delete sch.payScope;
      delete sch.baseMode;
      delete sch.pickMode;
      delete sch.categories;
      delete sch.items;
    }
    if (!sch.stationIds || !sch.stationIds.length) {
      sch.stationIds = COMM2_STATIONS.map(function (s) { return s.id; });
    }
    if (!sch.stationLabels) sch.stationLabels = defaultStationLabels();
    ensureSystemQuickOverride(sch);
    delete sch.signComm;
    return sch;
  }
  /* 演示造数：不分工位 · 提成为 non%，顾客指定的值为 extra%（默认 0 = 未开顾客指定） */
  function catRulePct(non, extra) {
    var ids = COMM2_STATIONS.map(function (s) { return s.id; });
    var r = defaultCatRule();
    r.nonDesignated = Number(non) || 0;
    r.nonDesignatedAmt = 0;
    r.nonDesignatedValueMode = 'pct';
    r.extraValue = Number(extra) || 0;
    r.extraAmt = 0;
    r.extraValueMode = 'pct';
    r.extraSplit = (Number(extra) || 0) > 0;
    ids.forEach(function (sid) {
      r.stations[sid] = { nonDesignated: Number(non) || 0, nonDesignatedAmt: 0, valueMode: 'pct' };
    });
    r._ex1 = true;
    r._vm2 = true;
    return applyExtraSplitFlag(r, ids);
  }
  /* 演示造数：固定金额，提成 nonAmt 元，顾客指定 extraAmt 元 */
  function catRuleAmt(nonAmt, extraAmt) {
    var ids = COMM2_STATIONS.map(function (s) { return s.id; });
    var r = defaultCatRule();
    r.valueMode = 'amount';
    r.nonDesignatedValueMode = 'amount';
    r.extraValueMode = 'amount';
    r.nonDesignatedAmt = Number(nonAmt) || 0;
    r.extraAmt = Number(extraAmt) || 0;
    r.extraValue = 0;
    r.extraSplit = (Number(extraAmt) || 0) > 0;
    ids.forEach(function (sid) {
      r.stations[sid] = { nonDesignated: 0, nonDesignatedAmt: Number(nonAmt) || 0, valueMode: 'amount' };
    });
    r._ex1 = true;
    r._vm2 = true;
    return applyExtraSplitFlag(r, ids);
  }
  /* 演示造数：按工位，stations 仅存逐工位「提成」；「顾客指定」为 rule 级全局值（extraPct） */
  function catRuleStationPct(stationNonMap, extraPct) {
    var ids = COMM2_STATIONS.map(function (s) { return s.id; });
    var r = defaultCatRule();
    var firstNon = (stationNonMap && Number.isFinite(Number(stationNonMap[ids[0]])))
      ? Number(stationNonMap[ids[0]]) : 10;
    r.extraValue = Number.isFinite(Number(extraPct)) ? Number(extraPct) : 0;
    r.extraAmt = 0;
    r.nonDesignated = firstNon;
    r.nonDesignatedAmt = 0;
    r.nonDesignatedValueMode = 'pct';
    r.extraValueMode = 'pct';
    r.extraSplit = (Number(r.extraValue) || 0) > 0;
    ids.forEach(function (sid) {
      var non = (stationNonMap && Number.isFinite(Number(stationNonMap[sid])))
        ? Number(stationNonMap[sid]) : firstNon;
      r.stations[sid] = { nonDesignated: non, nonDesignatedAmt: 0, valueMode: 'pct' };
    });
    r._ex1 = true;
    r._vm2 = true;
    return applyExtraSplitFlag(r, ids);
  }
  function scopeOnly(keys) {
    return {
      cash: keys.indexOf('cash') >= 0,
      memberCard: keys.indexOf('memberCard') >= 0,
      groupBuy: keys.indexOf('groupBuy') >= 0
    };
  }
  function buildDefaults(spec) {
    var out = {};
    COMM2_CATS.forEach(function (c) {
      var s = spec[c.key];
      if (!s) { out[c.key] = defaultCardBlock(); return; }
      out[c.key] = defaultCardBlock({
        payScope: s.payScope ? scopeOnly(s.payScope) : defaultPayScope(),
        baseMode: s.baseMode || 'list',
        pickMode: s.pickMode || 'avg',
        rule: s.rule || catRulePct(10)
      });
    });
    return out;
  }
  function overrideRow(opts) {
    return {
      id: opts.id,
      belongCat: opts.belongCat,
      title: opts.title,
      payScope: scopeOnly(opts.payScope || ['cash', 'memberCard', 'groupBuy']),
      baseMode: opts.baseMode || 'list',
      pickMode: opts.pickMode || 'avg',
      rule: opts.rule,
      targets: opts.targets
    };
  }
  function seedDemoSchemes() {
    var flagshipOverrides = [
      overrideRow({
        id: 'ov_flagship_hydrate',
        belongCat: 'labor',
        title: '深层补水护理',
        payScope: ['cash', 'memberCard', 'groupBuy'],
        rule: catRulePct(15, 3),
        targets: [{ kind: 'project', refId: 'p21', name: '深层补水护理' }]
      }),
      overrideRow({
        id: 'ov_flagship_combo',
        belongCat: 'labor',
        title: '染发、烫发、剑琅玻尿酸精华液',
        payScope: ['cash', 'memberCard', 'groupBuy'],
        rule: catRulePct(15, 5),
        targets: [
          { kind: 'project', refId: 'p6', name: '染发' },
          { kind: 'project', refId: 'p8', name: '烫发' },
          { kind: 'product', refId: 'pd19', name: '剑琅玻尿酸精华液' }
        ]
      }),
      overrideRow({
        id: 'ov_flagship_vip_issue',
        belongCat: 'issue',
        title: '尊享组合卡',
        payScope: ['cash', 'groupBuy'],
        rule: catRulePct(10, 2),
        targets: [{ kind: 'card', refId: 'demo_vip_combo', name: '尊享组合卡', cardRole: 'issue' }]
      }),
      overrideRow({
        id: 'ov_flagship_groupbuy',
        belongCat: 'labor',
        title: '洗头',
        payScope: ['groupBuy'],
        rule: catRuleAmt(5, 2),
        targets: [{ kind: 'project', refId: 'p19', name: '洗头' }]
      }),
      overrideRow({
        id: 'ov_flagship_tang',
        belongCat: 'labor',
        title: '烫染',
        payScope: ['cash', 'memberCard'],
        pickMode: 'station',
        rule: catRuleStationPct({ senior: 15, mid: 12, junior: 10 }, 5),
        targets: [{ kind: 'group', refId: 'g_proj_tang', name: '烫染', groupKind: 'project' }]
      })
    ];
    return [
      defaultScheme({
        id: 'c2_advisor',
        name: '顾问标准提成',
        defaults: buildDefaults({
          labor: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(10, 2) },
          sales: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(10) },
          issue: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(5) },
          card: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(3) }
        }),
        overrides: [],
        assigneeIds: ['st0', 'st1', 'st2', 'st3']
      }),
      defaultScheme({
        id: 'c2_cardpay',
        name: '卡付劳动专项',
        defaults: buildDefaults({
          labor: { payScope: ['memberCard'], rule: catRulePct(3) },
          sales: { payScope: ['memberCard'], rule: catRulePct(3) },
          issue: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0) },
          card: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0) }
        }),
        overrides: [],
        /* 演示多方案：st1 同时在顾问方案 + 本方案，卡付行取高 */
        assigneeIds: ['st1', 'st3']
      }),
      defaultScheme({
        id: 'c2_flagship',
        name: '资深技师综合方案',
        defaults: buildDefaults({
          labor: {
            payScope: ['cash', 'memberCard'],
            pickMode: 'station',
            rule: catRuleStationPct({ senior: 12, mid: 10, junior: 8 }, 5)
          },
          sales: {
            payScope: ['cash', 'memberCard', 'groupBuy'],
            baseMode: 'paid',
            rule: catRulePct(10)
          },
          issue: {
            payScope: ['cash', 'groupBuy'],
            rule: catRulePct(12, 3)
          },
          card: {
            payScope: ['cash'],
            rule: catRulePct(8)
          }
        }),
        overrides: flagshipOverrides,
        assigneeIds: ['st4']
      })
    ];
  }

  function defaultsWith(map, payPartial) {
    var out = {};
    COMM2_CATS.forEach(function (c) {
      var rule = map[c.key] ? catRulePct(map[c.key][0], map[c.key][1]) : defaultCatRule();
      out[c.key] = defaultCardBlock({ rule: rule, payScope: payPartial ? JSON.parse(JSON.stringify(payPartial)) : defaultPayScope() });
    });
    return out;
  }

  function defaultScheme(partial) {
    var defaults = {};
    COMM2_CATS.forEach(function (c) { defaults[c.key] = defaultCardBlock(); });
    var sch = Object.assign({
      id: 'c2_' + Date.now(),
      name: '默认提成方案',
      stationIds: COMM2_STATIONS.map(function (s) { return s.id; }),
      stationLabels: defaultStationLabels(),
      defaults: defaults,
      overrides: [],
      assigneeIds: [],
      _v3: true
    }, partial || {});
    if (!sch.defaults) sch.defaults = defaults;
    if (!sch.overrides) sch.overrides = [];
    ensureSystemQuickOverride(sch);
    return sch;
  }

  var store = {
    schemes: seedDemoSchemes().map(function (s) { return normalizeScheme(s); }),
    editingId: null,
    _draft: null,
    _snapshot: null,
    _dirty: false,
    _catKey: null,
    _cardTarget: null,
    _overrideDelId: null,
    _pickSel: {},
    _pickBundle: null,
    _sheetMode: 'pct',
    _stationEditId: null,
    _stationFoldOpen: false,
    _pickType: 'project',
    _pickGroup: 'all',
    _sheetContext: null,
    _menuId: null,
    _nameMode: 'create',
    _assignId: null,
    _assignSel: {},
    _assigneeCleanedToast: false
  };

  function schemeById(id) {
    var sch = store.schemes.find(function (s) { return s.id === id; }) || null;
    return sch ? normalizeScheme(sch) : null;
  }
  function editing() {
    if (store._draft) return normalizeScheme(store._draft);
    return schemeById(store.editingId);
  }
  function pickModeLabel(mode) { return mode === 'station' ? '按工位' : '不分工位'; }
  function baseModeLabel(mode) { return mode === 'paid' ? '实收模式' : '原价模式'; }
  function stationLabel(sch, id) {
    var lab = sch.stationLabels && sch.stationLabels[id] && sch.stationLabels[id].label;
    return lab || stationDefaultLabel(id);
  }

  function comm2StaffName(id) {
    var pool = [];
    if (window.EmployeeDemo && typeof window.EmployeeDemo.getBillingStaffPool === 'function') {
      pool = window.EmployeeDemo.getBillingStaffPool() || [];
    }
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i].name || id;
    }
    return COMM2_STAFF_FALLBACK[id] || id;
  }

  function pairVal(rule, isAmt, pctKey, amtKey) {
    return isAmt ? (Number(rule[amtKey]) || 0) : (Number(rule[pctKey]) || 0);
  }
  function fmtMoney(n) {
    return typeof window.fmtMoney === 'function'
      ? window.fmtMoney(n)
      : Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtMoneyHtml(n) {
    return typeof window.fmtMoneyHtml === 'function' ? window.fmtMoneyHtml(n) : fmtMoney(n);
  }
  function fmtYenHtml(n) {
    return typeof window.fmtYenHtml === 'function' ? window.fmtYenHtml(n) : ('¥' + fmtMoneyHtml(n));
  }
  function fmtVal(v, isAmt) {
    return isAmt ? ('¥' + fmtMoney(v)) : (v + '%');
  }
  function fmtValHtml(v, isAmt) {
    return isAmt ? fmtYenHtml(v) : (v + '%');
  }
  /* 顾客指定值展示：+3% / +¥5（叠加在提成之上） */
  function formatExtraVal(rule, isAmt) {
    var amt = arguments.length > 1 ? !!isAmt : extraIsAmt(rule);
    return '+' + fmtVal(extraVal(rule, amt), amt);
  }
  function formatExtraValHtml(rule, isAmt) {
    var amt = arguments.length > 1 ? !!isAmt : extraIsAmt(rule);
    return '+' + fmtValHtml(extraVal(rule, amt), amt);
  }
  function formatPairFlat(rule, isAmt) {
    rule = ensureCat(rule);
    var nonAmt = arguments.length > 1 ? !!isAmt : nonIsAmt(rule);
    var non = pairVal(rule, nonAmt, 'nonDesignated', 'nonDesignatedAmt');
    if (!rule.extraSplit) return fmtVal(non, nonAmt);
    return fmtVal(non, nonAmt) + ' + 顾客指定 ' + formatExtraVal(rule);
  }
  function formatPairFlatHtml(rule, isAmt) {
    rule = ensureCat(rule);
    var nonAmt = arguments.length > 1 ? !!isAmt : nonIsAmt(rule);
    var non = pairVal(rule, nonAmt, 'nonDesignated', 'nonDesignatedAmt');
    var html = '<strong>' + fmtValHtml(non, nonAmt) + '</strong>';
    if (!rule.extraSplit) return html;
    return html +
      '<span class="comm2-rule-bar__p-sep" aria-hidden="true"></span>' +
      '<span class="comm2-rule-bar__p-tag" aria-hidden="true">顾客指定</span>' +
      '<strong>' + formatExtraValHtml(rule) + '</strong>';
  }
  /* 按工位时工位仅承载「提成」；顾客指定值由 rule 级全局值单独一段/一行 */
  function stationNonVal(st, isAmt) {
    st = st || defaultStationPair();
    var amt = arguments.length > 1 ? !!isAmt : stationIsAmt(st);
    return amt ? (Number(st.nonDesignatedAmt) || 0) : (Number(st.nonDesignated) || 0);
  }
  function formatStationPair(sch, st, isAmt) {
    var amt = arguments.length > 2 ? !!isAmt : stationIsAmt(st);
    return fmtVal(stationNonVal(st, amt), amt);
  }
  function formatStationPairHtml(sch, st, isAmt) {
    var amt = arguments.length > 2 ? !!isAmt : stationIsAmt(st);
    return fmtValHtml(stationNonVal(st, amt), amt);
  }
  /* 摘要（纯文本）：按工位 → 首工位同行追加「顾客指定」；不分工位 → 「提成 + 顾客指定」 */
  function formatBlockSummary(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var split = !!block.rule.extraSplit;
    if (block.pickMode === 'station') {
      var segs = getStationIds(sch).map(function (sid, idx) {
        var st = block.rule.stations[sid] || defaultStationPair();
        var seg = stationLabel(sch, sid) + ' ' + formatStationPair(sch, st);
        if (split && idx === 0) seg += ' 顾客指定' + formatExtraVal(block.rule);
        return seg;
      });
      return segs.join('；');
    }
    return formatPairFlat(block.rule);
  }
  function formatBlockSummaryHtml(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var split = !!block.rule.extraSplit;
    if (block.pickMode === 'station') {
      return getStationIds(sch).map(function (sid, idx) {
        var st = block.rule.stations[sid] || defaultStationPair();
        var extraHtml = (split && idx === 0)
          ? '<span class="comm2-rule-card__params-sub">顾客指定</span><strong>' + formatExtraValHtml(block.rule) + '</strong>'
          : '';
        return '<div class="comm2-rule-card__params-row"><span>' + esc(stationLabel(sch, sid)) + '</span><strong>' + formatStationPairHtml(sch, st) + '</strong>' + extraHtml + '</div>';
      }).join('');
    }
    return '<div class="comm2-rule-card__params-row comm2-rule-card__params-row--flat"><span>提成参数</span><strong>' + formatPairFlatHtml(block.rule) + '</strong></div>';
  }

  function kindLabel(kind) {
    return kind === 'product' ? '产品' : (kind === 'card' ? '会员卡' : '项目');
  }

  function trashSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>' +
      '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  }

  /* Stratis UI Icons · 线性：file-02 / box / card-02 / card-up */
  function catIconSvg(key) {
    var paths = {
      labor: 'M8.40022 7.20001H15.6002M8.40022 10.8H15.6002M8.40022 14.4H12.0002M6.59994 2.40001H17.4002C18.7257 2.40001 19.8002 3.47455 19.8002 4.80005L19.7999 19.2001C19.7999 20.5255 18.7253 21.6 17.3999 21.6L6.59983 21.6C5.27435 21.5999 4.19983 20.5254 4.19984 19.1999L4.19994 4.79999C4.19994 3.47451 5.27446 2.40001 6.59994 2.40001Z',
      sales: 'M20.4399 7.75H3.56006M14.5 11.5C12.4253 11.5 9.5 11.5 9.5 11.5M20.5 8.25164V18.375C20.5 19.5486 19.5486 20.5 18.375 20.5H5.625C4.4514 20.5 3.5 19.5486 3.5 18.375V8.25164C3.5 7.92175 3.57681 7.59638 3.72434 7.30132L5.1845 4.381C5.45447 3.84107 6.00632 3.5 6.60999 3.5H17.39C17.9937 3.5 18.5455 3.84107 18.8155 4.381L20.2757 7.30132C20.4232 7.59638 20.5 7.92175 20.5 8.25164Z',
      issue: 'M2.9996 9.29986H20.9996M6.5996 13.4999H9.5996M4.80006 5.10001H19.1997C20.5251 5.10001 21.5996 6.17369 21.5997 7.49914L21.5999 16.501C21.6 17.8265 20.5255 18.9 19.2 18.9L4.80029 18.8998C3.47485 18.8998 2.40035 17.8254 2.40032 16.4999L2.40006 7.50008C2.40002 6.17457 3.47455 5.10001 4.80006 5.10001Z',
      card: 'M14.1002 18.5786H4.50049C3.17503 18.5786 2.10053 17.5041 2.10049 16.1787L2.10023 7.17885C2.10019 5.85334 3.17472 4.77879 4.50023 4.77879H18.8997C20.2252 4.77879 21.2997 5.85268 21.2997 7.1782L21.2998 11.3788M2.69977 8.97864H20.6998M21.8998 16.1108L19.554 13.7786L17.0998 16.2212M19.554 13.7786L19.554 19.2212',
      quick: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z'
    };
    var d = paths[key] || paths.labor;
    return '<svg class="comm2-cat__ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  function formatSchemeRuleParts(sch) {
    normalizeScheme(sch);
    var n = userOverrides(sch).length;
    return ['5 项默认' + (n ? (' + ' + n + ' 条覆盖') : '')];
  }

  /** 员工除当前方案外，还出现在哪些方案（多方案可并存） */
  function schemesAlsoContainingStaff(staffId, exceptSchemeId) {
    var out = [];
    store.schemes.forEach(function (s) {
      if (exceptSchemeId && s.id === exceptSchemeId) return;
      if ((s.assigneeIds || []).indexOf(staffId) >= 0) out.push(s);
    });
    return out;
  }

  /** @deprecated 保留空实现以免外部误调；不再做一人一方案清洗 */
  function enforceExclusiveAssignees() {
    return false;
  }

  function assignedStaffSet() {
    var set = {};
    store.schemes.forEach(function (s) {
      (s.assigneeIds || []).forEach(function (id) { set[id] = true; });
    });
    return set;
  }

  function unassignedStaffIds() {
    var set = assignedStaffSet();
    return COMM2_STAFF_IDS.filter(function (id) { return !set[id]; });
  }

  function renderUnassignedTip() {
    var tip = $('comm2UnassignedTip');
    if (!tip) return;
    var ids = unassignedStaffIds();
    if (!ids.length) {
      tip.classList.add('hidden');
      tip.setAttribute('aria-hidden', 'true');
      return;
    }
    tip.classList.remove('hidden');
    tip.setAttribute('aria-hidden', 'false');
    tip.innerHTML =
      '<span class="comm2-unassigned__lead">' +
        '<span class="comm2-unassigned__ico" aria-hidden="true"></span>' +
        '<span class="comm2-unassigned__text">还有 <strong>' + ids.length + '</strong> 人未分配任何提成方案</span>' +
      '</span>' +
      '<span class="comm2-unassigned__chev" aria-hidden="true">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>';
  }

  function openUnassignedDialog() {
    var ids = unassignedStaffIds();
    if (!ids.length) return;
    var body = $('comm2UnassignedBody');
    if (body) {
      body.innerHTML = '<ul class="comm2-unassigned-list">' +
        ids.map(function (id) {
          return '<li>' + esc(comm2StaffName(id)) + '</li>';
        }).join('') + '</ul>';
    }
    openDialog('comm2UnassignedMask');
  }

  function renderList() {
    var root = $('comm2List');
    if (!root) return;
    renderUnassignedTip();
    if (!store.schemes.length) {
      root.innerHTML = '<p class="comm2-empty">还没有提成方案<br>点下方按钮添加</p>';
      return;
    }
    root.innerHTML = store.schemes.map(function (s) {
      var n = (s.assigneeIds || []).length;
      var assignLabel = n ? s.assigneeIds.map(comm2StaffName).join(' · ') : '请配置';
      var menuSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';
      var assignChev = '<span class="ui-nav-chev" aria-hidden="true">' + chevronSvg() + '</span>';
      return '<div class="emp-comm-card comm2-scheme" data-comm2-card="' + esc(s.id) + '">' +
        '<button type="button" class="emp-comm-card__edit" data-comm2-open="' + esc(s.id) + '">' +
        '<div class="emp-comm-card__top"><div class="emp-comm-card__who">' +
        '<span class="emp-comm-card__icon" aria-hidden="true"><img src="assets/workbench/commission.png" alt="" width="40" height="40"></span>' +
        '<span class="emp-comm-card__title-wrap">' +
        '<span class="emp-comm-card__name">' + esc(s.name) + '</span>' +
        /* 二十六次：本期仍按老规则跑 → 卡上明确标出「下期生效」，避免用户以为改动没生效 */
        (schemePendingNext(s) ? '<span class="comm2-scheme__badge">下期生效</span>' : '') +
        '</span></div></div></button>' +
        '<button type="button" class="emp-comm-card__assign" data-comm2-assign="' + esc(s.id) + '">' +
        '<span>已分配</span><span class="emp-comm-card__assign-val">' + esc(assignLabel) + assignChev + '</span></button>' +
        '<button type="button" class="emp-comm-card__menu" data-comm2-menu="' + esc(s.id) + '" aria-label="更多">' + menuSvg + '</button></div>';
    }).join('');
  }

  function chevronSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  }
  /** 卡内两段式胶囊「比例 / 金额」：整块为点击热区，点一次切换一次（右下角） */
  function capSegHtml(isAmt, modeKey) {
    var aria = isAmt ? '当前固定金额，点按切换为按比例' : '当前按比例，点按切换为固定金额';
    return '<button type="button" class="comm2-cap__seg" data-comm2-cap-mode="' + esc(modeKey) + '" aria-label="' + aria + '">' +
      '<span class="comm2-cap__seg-item' + (isAmt ? '' : ' is-on') + '">比例</span>' +
      '<span class="comm2-cap__seg-item' + (isAmt ? ' is-on' : '') + '">金额</span>' +
      '</button>';
  }
  /** 卡内底行：左=输入值，右=两段式胶囊 */
  function capRowHtml(fieldHtml, isAmt, modeKey) {
    return '<div class="comm2-cap__row">' + fieldHtml + capSegHtml(isAmt, modeKey) + '</div>';
  }
  /** 单张参数卡：卡头仅标题；底行 = 输入值 + 胶囊 */
  function capCardHtml(opts) {
    return '<div class="comm2-cap ' + opts.variant + (opts.extraClass ? (' ' + opts.extraClass) : '') + '">' +
      '<div class="comm2-cap__head"><span class="comm2-cap__title">' + esc(opts.title) + '</span>' +
      (opts.headExtra || '') + '</div>' +
      capRowHtml(capFieldHtml(opts.prefix, opts.fieldKey, opts.val, opts.isAmt, opts.title), opts.isAmt, opts.modeKey) +
      '</div>';
  }
  /** 输入行：单位只读展示（比例/金额切换走右下角胶囊）；
      金额模式：输入框吃掉剩余宽度（`--amt`），避免默认宽度把胶囊顶出卡片 */
  function capFieldHtml(prefix, fieldKey, val, isAmt, aria) {
    var ph = isAmt ? '请输入金额' : '请输入比例';
    return '<div class="comm2-cap__field' + (isAmt ? ' comm2-cap__field--amt' : '') + '">' +
      (isAmt ? '<span class="comm2-cap__unit">¥</span>' : '') +
      '<input class="input-amount" type="text" data-comm2-field="' + prefix + fieldKey + '" value="' + esc(val) + '" inputmode="decimal" placeholder="' + esc(ph) + '" aria-label="' + esc(aria) + '" />' +
      (isAmt ? '' : '<span class="comm2-cap__unit">%</span>') +
    '</div>';
  }
  /** 「提成」参数卡（按工位单参 / 不分工位） */
  function singleCapHtml(prefix, pair, title, opts) {
    opts = opts || {};
    pair = pair || defaultPair();
    var isAmt = opts.isAmt != null ? !!opts.isAmt : nonIsAmt(pair);
    var val = isAmt ? pair.nonDesignatedAmt : pair.nonDesignated;
    var fieldKey = isAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    return capCardHtml({
      variant: opts.asNon ? 'comm2-cap--non' : 'comm2-cap--single',
      title: title,
      prefix: prefix,
      fieldKey: fieldKey,
      val: val,
      isAmt: isAmt,
      modeKey: opts.modeKey || 'base.non',
      extraClass: opts.extraClass,
      headExtra: opts.headExtra
    });
  }

  function extraCloseSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  }

  /** 「指定」参数卡：「顾客指定」命中时在提成之上叠加；右上角 × 关闭顾客指定 */
  function extraCapHtml(prefix, rule, opts) {
    opts = opts || {};
    rule = rule || defaultPair();
    var isAmt = extraIsAmt(rule);
    var cancelBtn = opts.hideCancel
      ? ''
      : '<button type="button" class="comm2-extra-close" data-comm2-extra="off" aria-label="关闭顾客指定提成">' + extraCloseSvg() + '</button>';
    return capCardHtml({
      variant: 'comm2-cap--extra',
      title: '指定',
      prefix: prefix,
      fieldKey: extraKey(isAmt),
      val: extraVal(rule, isAmt),
      isAmt: isAmt,
      modeKey: 'base.extra',
      extraClass: opts.extraClass,
      headExtra: cancelBtn
    });
  }

  /** 未开顾客指定：与「提成」卡等比并排的虚线卡；点击即开启（文案 = 顾客指定提成） */
  function extraAddCardHtml() {
    return '<button type="button" class="comm2-extra-add" data-comm2-extra="on">' +
      '<span class="comm2-extra-add__txt">+ 顾客指定提成</span></button>';
  }

  /** 「提成」参数卡（不分工位主值；按工位各工位卡复用 singleCapHtml） */
  function nonCapHtml(prefix, rule) {
    var nonAmt = nonIsAmt(rule);
    var nonKey = nonAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    return capCardHtml({
      variant: 'comm2-cap--non',
      title: '提成',
      prefix: prefix,
      fieldKey: nonKey,
      val: rule[nonKey],
      isAmt: nonAmt,
      modeKey: 'base.non'
    });
  }
  /** 静态列头小标题（UI 同工位列头：圆点 + 13px；**不可编辑**、无改名图标） */
  function sheetColNameHtml(label, isExtra) {
    return '<div class="comm2-sheet-station__name is-static">' +
      '<i class="comm2-sheet-station__dot' + (isExtra ? ' comm2-sheet-station__dot--extra' : '') + '" aria-hidden="true"></i>' +
      '<span class="comm2-sheet-station__label">' + esc(label) + '</span></div>';
  }
  /** 不分工位：两行居左（第 1 行「提成」行 / 第 2 行「顾客指定」行），行结构与「按工位」一致 ——
      行标签为**静态**小标题（UI 同工位列头：圆点 + 13px，不可改名、无 edit-02）；
      卡宽 = 半宽「宽卡」（175px，**尺寸不变**），未开顾客指定时第 2 行为虚线卡「+ 顾客指定提成」 */
  function commissionParamsHtml(prefix, rule, extraSplit, aria) {
    return '<div class="comm2-sheet-avg-rows" role="group" aria-label="' + esc(aria || '提成与顾客指定') + '">' +
      '<div class="comm2-sheet-station comm2-sheet-station--compact comm2-sheet-station--avg">' +
        sheetColNameHtml('提成', false) +
        '<div class="comm2-extra-row comm2-extra-row--solo">' + nonCapHtml(prefix, rule) + '</div>' +
      '</div>' +
      '<div class="comm2-sheet-station comm2-sheet-station--compact comm2-sheet-station--avg">' +
        sheetColNameHtml('顾客指定', true) +
        '<div class="comm2-extra-row comm2-extra-row--solo">' +
          (extraSplit ? extraCapHtml(prefix, rule) : extraAddCardHtml()) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function flashEl(el) {
    if (!el) return;
    el.classList.add('is-flash');
    setTimeout(function () { el.classList.remove('is-flash'); }, 700);
  }

  /* ---- 比例输入框：宽度贴合数值（使 % 紧贴数字右侧） ---- */
  var _capMeasureCtx = null;
  function measureTextPx(text, font) {
    if (!_capMeasureCtx) {
      var cv = document.createElement('canvas');
      _capMeasureCtx = cv.getContext('2d');
    }
    _capMeasureCtx.font = font;
    return _capMeasureCtx.measureText(String(text == null ? '' : text)).width;
  }
  function syncCapFieldWidth(input) {
    if (!input || !input.style) return;
    var field = input.getAttribute('data-comm2-field') || '';
    /* 金额模式 ¥ 为前缀，输入框占满剩余宽度即可 */
    if (/Amt$/.test(field)) { input.style.width = ''; return; }
    var cs = window.getComputedStyle(input);
    var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var minW = measureTextPx('00', font);
    var valW = measureTextPx(input.value || '', font);
    input.style.width = Math.ceil(Math.max(minW, valW) + 1) + 'px';
  }
  function syncCapFieldWidths(root) {
    var scope = root || document;
    var list = scope.querySelectorAll ? scope.querySelectorAll('.comm2-cap__field input') : [];
    Array.prototype.forEach.call(list, syncCapFieldWidth);
  }

  function isStationDefault(sch, id) {
    var lab = sch.stationLabels && sch.stationLabels[id] && sch.stationLabels[id].label;
    return !lab || lab === stationDefaultLabel(id);
  }

  function parseCardTarget(t) {
    var p = String(t || '').split(':');
    return { type: p[0], id: p.slice(1).join(':') };
  }

  function getCardBlock(sch, target) {
    var p = parseCardTarget(target);
    if (p.type === 'default') return sch.defaults[p.id];
    if (p.type === 'override') return (sch.overrides || []).find(function (o) { return o.id === p.id; });
    return null;
  }

  function chevSvg() {
    return '<svg class="comm2-rule-bar__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  }

  function delCircleSvg() {
    return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M3 3l6 6M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  }

  /** 卡上工位短标：默认大工/中工/小工；未知工位用全称 */
  function stationShortLabel(sch, id) {
    var def = COMM2_STATIONS.find(function (s) { return s.id === id; });
    if (def && def.defaultLabel) return def.defaultLabel;
    var lab = stationLabel(sch, id);
    return lab ? String(lab) : '?';
  }

  function barScopeCapsulesHtml(block) {
    ensurePayScopeBlock(block);
    var labels = payScopeLabelsBlock(block);
    if (!labels.length) return '<span class="comm2-rule-bar__cap is-empty">—</span>';
    return labels.map(function (lab) {
      return '<span class="comm2-rule-bar__cap">' + esc(lab) + '</span>';
    }).join('');
  }

  function barBaseShort(block, sch) {
    var ids = sch ? getStationIds(sch) : null;
    if (block.rule && ruleAllAmount(block.rule, block.pickMode, ids)) return '固定';
    return block.baseMode === 'paid' ? '实收' : '原价';
  }

  /** 卡上：原价/实收 段控（可直接切换；全部取值为固定金额时为只读灰标「固定」） */
  function barBaseCtrlHtml(block, sch) {
    var ids = sch ? getStationIds(sch) : null;
    var isAmt = !!(block.rule && ruleAllAmount(block.rule, block.pickMode, ids));
    if (isAmt) {
      return '<span class="comm2-rule-bar__base is-fixed" aria-label="固定金额">固定</span>';
    }
    var isPaid = block.baseMode === 'paid';
    return '<div class="comm2-rule-bar__seg" role="radiogroup" aria-label="计算基数">' +
      '<button type="button" class="comm2-rule-bar__chip' + (!isPaid ? ' on' : '') +
      (!isPaid ? ' comm2-rule-bar__base is-list' : '') + '" data-comm2-card-base="list" role="radio" aria-checked="' + (!isPaid ? 'true' : 'false') + '">原价</button>' +
      '<button type="button" class="comm2-rule-bar__chip' + (isPaid ? ' on' : '') +
      (isPaid ? ' comm2-rule-bar__base is-paid' : '') + '" data-comm2-card-base="paid" role="radio" aria-checked="' + (isPaid ? 'true' : 'false') + '">实收</button></div>';
  }

  /** 卡上：现金/卡付/团购 chip（可直接点选；至少保留一种） */
  function barPayCtrlHtml(block) {
    ensurePayScopeBlock(block);
    return '<div class="comm2-rule-bar__scope-chips" role="group" aria-label="适用范围">' +
      COMM2_PAY_SCOPE.map(function (d) {
        var on = !!block.payScope[d.key];
        return '<button type="button" class="comm2-scope-chip' + (on ? ' on' : '') +
          '" data-comm2-card-scope="' + d.key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(d.label) + '</button>';
      }).join('') + '</div>';
  }

  /** 卡面右侧控件容器（无「基数」「范围」文字标签，靠控件形态区分） */
  function barFieldHtml(ctrlHtml) {
    return '<div class="comm2-rule-bar__field">' + ctrlHtml + '</div>';
  }

  function sheetScopeChipsHtml(block) {
    ensurePayScopeBlock(block);
    return COMM2_PAY_SCOPE.map(function (d) {
      var on = !!block.payScope[d.key];
      return '<button type="button" class="comm2-scope-chip' + (on ? ' on' : '') + '" data-comm2-sheet-scope="' + d.key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(d.label) + '</button>';
    }).join('');
  }

  function sheetSegHtml(kind, block) {
    if (kind === 'base') {
      return '<div class="comm2-rule-card__seg comm2-base-seg comm2-sheet-ctrl" role="radiogroup">' +
        '<button type="button" class="comm2-base-seg__btn' + (block.baseMode === 'list' ? ' on' : '') + '" data-comm2-sheet-base="list">原价模式</button>' +
        '<button type="button" class="comm2-base-seg__btn' + (block.baseMode === 'paid' ? ' on' : '') + '" data-comm2-sheet-base="paid">实收模式</button></div>';
    }
    var isStation = block.pickMode === 'station';
    return '<div class="comm2-rule-card__seg comm2-base-seg comm2-sheet-ctrl" role="radiogroup">' +
      '<button type="button" class="comm2-base-seg__btn' + (!isStation ? ' on' : '') + '" data-comm2-sheet-pick="avg">不分工位</button>' +
      '<button type="button" class="comm2-base-seg__btn' + (isStation ? ' on' : '') + '" data-comm2-sheet-pick="station">' +
      '<span class="comm2-base-seg__lbl">按工位分配</span>' +
      '</button></div>';
  }

  function barParamSegHtml(lbl, valHtml, opts) {
    opts = opts || {};
    var tag = opts.tag
      ? ('<span class="comm2-rule-bar__p-tag" aria-hidden="true">' + esc(opts.tag) + '</span>')
      : '';
    var lblHtml = lbl
      ? ('<span class="comm2-rule-bar__p-lbl">' + tag + esc(lbl) + '</span>')
      : '';
    return '<span class="comm2-rule-bar__param-seg' + (opts.extraClass ? (' ' + opts.extraClass) : '') + '">' +
      lblHtml +
      '<strong class="comm2-rule-bar__p-val">' + valHtml + '</strong></span>';
  }

  /* 按工位：3 工位竖排；「顾客指定」（叠加值）与首工位同行、间距 16 */
  function barStationParamsHtml(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var split = !!block.rule.extraSplit;
    var ids = getStationIds(sch);
    return ids.map(function (sid, idx) {
      var st = block.rule.stations[sid] || defaultStationPair();
      var stAmt = stationIsAmt(st);
      var seg = barParamSegHtml(stationShortLabel(sch, sid), fmtValHtml(stationNonVal(st, stAmt), stAmt));
      if (split && idx === 0) {
        var extraSeg = barParamSegHtml('顾客指定', formatExtraValHtml(block.rule));
        return '<span class="comm2-rule-bar__param-row">' + seg + extraSeg + '</span>';
      }
      return seg;
    }).join('');
  }

  function barParamsHtml(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    if (block.pickMode === 'station') return barStationParamsHtml(sch, block);
    var nonAmt = nonIsAmt(block.rule);
    var non = pairVal(block.rule, nonAmt, 'nonDesignated', 'nonDesignatedAmt');
    if (!block.rule.extraSplit) {
      return barParamSegHtml('提成', fmtValHtml(non, nonAmt), { extraClass: 'is-single' });
    }
    return '<span class="comm2-rule-bar__param-row">' +
      barParamSegHtml('提成', fmtValHtml(non, nonAmt)) +
      barParamSegHtml('顾客指定', formatExtraValHtml(block.rule)) +
      '</span>';
  }

  function titleCharCount(s) {
    return Array.from(String(s || '')).length;
  }

  /** 覆盖卡标题：整类优先，再按名称排序；1 项全名，2 项过长则「A等2项」，≥3「首项等N项」 */
  function buildOverrideTitle(targets) {
    var list = (targets || []).slice();
    function displayName(t) {
      if (!t) return '';
      if (t.kind === 'group') return '整类·' + (t.name || '');
      if (t.kind === 'card') return (t.name || '') + '·' + (t.cardRole === 'card' ? '充卡' : '办卡');
      return t.name || '';
    }
    list.sort(function (a, b) {
      var ag = a && a.kind === 'group' ? 0 : 1;
      var bg = b && b.kind === 'group' ? 0 : 1;
      if (ag !== bg) return ag - bg;
      return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'zh');
    });
    var names = list.map(displayName).filter(function (n) { return !!n; });
    if (!names.length) return '未命名';
    if (names.length === 1) return names[0];
    if (names.length === 2) {
      var joined = names[0] + '、' + names[1];
      if (titleCharCount(joined) > 12) return names[0] + '等2项';
      return joined;
    }
    return names[0] + '等' + names.length + '项';
  }

  /* Stratis UI Icons · 线性：edit-02（提成参数可编辑） */
  function editIconSvg() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M13.4486 6.9516L17.0486 10.5516M4.44868 19.5516L8.81467 18.6719C9.04644 18.6252 9.25926 18.511 9.4264 18.3438L19.2001 8.56478C19.6687 8.09592 19.6684 7.33593 19.1994 6.86747L17.1289 4.7994C16.6601 4.33113 15.9005 4.33145 15.4321 4.80011L5.65745 14.5802C5.49063 14.7471 5.37673 14.9594 5.32999 15.1907L4.44868 19.5516Z"/></svg>';
  }

  function renderRuleCard(sch, opts) {
    var block = opts.block;
    var target = opts.target;
    var title = opts.title;
    var iconKey = opts.iconKey || 'labor';
    var isOv = !!opts.deletable;
    var isStation = block.pickMode === 'station';
    var ovId = opts.ovId || '';
    var titleEllipsis = titleCharCount(title) > 6;
    var titleBlock = '<div class="comm2-rule-bar__title-hit">' +
      '<h2 class="comm2-rule-bar__title">' + catIconSvg(iconKey) +
      '<span class="comm2-rule-bar__title-txt' + (titleEllipsis ? ' is-ellipsis' : '') + '" title="' + esc(title) + '">' + esc(title) + '</span></h2></div>';
    /* 卡头：左图标+标题，右「＞」；卡头下方内容区：左提成参数 + 右两控件竖排 */
    var cardHtml = '<span class="comm2-rule-bar__accent" aria-hidden="true"></span>' +
      '<div class="comm2-rule-bar__head">' +
      titleBlock +
      '<span class="comm2-rule-bar__chev" aria-hidden="true">' + chevronSvg() + '</span>' +
      '</div>' +
      '<div class="comm2-rule-bar__body">' +
      '<div class="comm2-rule-bar__params" aria-label="提成参数">' + barParamsHtml(sch, block) + '</div>' +
      '<div class="comm2-rule-bar__side">' +
      barFieldHtml(barBaseCtrlHtml(block, sch)) +
      barFieldHtml(barPayCtrlHtml(block)) +
      '</div></div>';
    var card = '<article class="comm2-rule-bar' + (isOv ? ' is-override' : ' is-default') + (isStation ? ' is-station' : '') +
      (block.rule && block.rule.extraSplit ? ' is-extra-split' : '') +
      '" data-comm2-rule-card="' + esc(target) + '" data-comm2-card-open="' + esc(target) + '" role="button" tabindex="0" aria-label="编辑规则 ' + esc(title) + '"' +
      (isOv ? ' data-comm2-ov-id="' + esc(ovId) + '"' : '') + '>' +
      cardHtml +
      '</article>';
    if (!isOv) return card;
    return '<div class="comm2-rule-swipe-wrap" data-comm2-swipe-ov="' + esc(ovId) + '">' +
      '<button type="button" class="comm2-rule-swipe__trash" data-comm2-swipe-del="' + esc(ovId) + '" aria-label="删除规则项" tabindex="-1">' + trashSvg() + '</button>' +
      '<div class="comm2-rule-swipe">' + card + '</div></div>';
  }

  function renderEditCards(sch) {
    var root = $('comm2EditCards');
    if (!root) return;
    normalizeScheme(sch);
    var html = COMM2_CATS.map(function (c) {
      var block = sch.defaults[c.key];
      return renderRuleCard(sch, {
        block: block,
        target: 'default:' + c.key,
        title: c.label,
        iconKey: c.key,
        deletable: false
      });
    }).join('');
    var quick = ensureSystemQuickOverride(sch);
    html += renderRuleCard(sch, {
      block: quick,
      target: 'override:' + COMM2_QUICK_OV_ID,
      title: '快捷开单',
      iconKey: 'quick',
      deletable: false
    });
    html += userOverrides(sch).map(function (ov) {
      var iconKey = ov.belongCat || 'labor';
      return renderRuleCard(sch, {
        block: ov,
        target: 'override:' + ov.id,
        title: ov.title || '未命名',
        iconKey: iconKey,
        deletable: true,
        ovId: ov.id
      });
    }).join('');
    root.innerHTML = html;
  }

  function toggleBlockScope(block, key) {
    ensurePayScopeBlock(block);
    if (block.payScope[key]) {
      if (payScopeCountBlock(block) <= 1) { toast('至少选一种支付方式', true); return false; }
      block.payScope[key] = false;
    } else block.payScope[key] = true;
    return true;
  }

  function getSheetBlock(sch) {
    if (store._sheetContext === 'pick') return store._pickBundle;
    if (!sch || !store._cardTarget) return null;
    return getCardBlock(sch, store._cardTarget);
  }

  function toggleSheetScope(key) {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    if (!block || !toggleBlockScope(block, key)) return;
    if (store._sheetContext !== 'pick') markDirty();
    refreshCardSheetBody();
  }

  function setSheetBase(mode) {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    if (!block) return;
    block.baseMode = mode === 'paid' ? 'paid' : 'list';
    if (store._sheetContext !== 'pick') markDirty();
    refreshCardSheetBody();
  }

  function setSheetPick(mode) {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    if (!block) return;
    block.pickMode = mode === 'station' ? 'station' : 'avg';
    if (store._sheetContext !== 'pick') markDirty();
    refreshCardSheetBody();
  }

  /* ---- 卡面直接操作（不进 Sheet）：计算基数 / 适用范围 ---- */
  /** 卡上「原价/实收」切换；全部取值为固定金额（只读「固定」）时忽略 */
  function setCardBase(target, mode) {
    var sch = editing();
    var block = sch ? getCardBlock(sch, target) : null;
    if (!block) return;
    if (block.rule && ruleAllAmount(block.rule, block.pickMode, getStationIds(sch))) return;
    block.baseMode = mode === 'paid' ? 'paid' : 'list';
    markDirty();
    renderEditCards(sch);
  }

  /** 卡上「现金/卡付/团购」点选；至少保留一种（沿用 Sheet 校验与 toast） */
  function toggleCardScope(target, key) {
    var sch = editing();
    var block = sch ? getCardBlock(sch, target) : null;
    if (!block || !toggleBlockScope(block, key)) return;
    markDirty();
    renderEditCards(sch);
  }

  function setSheetCardRole(role) {
    var b = store._pickBundle;
    if (store._sheetContext !== 'pick' || !b) return;
    var newRole = role === 'card' ? 'card' : 'issue';
    if (b.cardRole === newRole) return;
    b.cardRole = newRole;
    b.belongCat = pickBelongCat('card', b.cardRole);
    (b.targets || []).forEach(function (t) {
      if (t.kind === 'card') t.cardRole = b.cardRole;
    });
    refreshCardSheetBody();
  }

  function renderEdit() {
    var sch = editing();
    if (!sch) return;
    /* 标题右侧有 ⓘ（信息增强），只覆盖文字节点，避免连带清掉按钮 */
    var title = $('comm2EditTitleText') || $('comm2EditTitle');
    if (title) title.textContent = sch.name;
    renderEditCards(sch);
  }

  function openList() {
    store.editingId = null;
    store._draft = null;
    store._snapshot = null;
    store._dirty = false;
    renderList();
    show('screen-comm2-list');
    goNav('comm2-list');
    maybeShowMigrationDialog();
  }

  function maybeShowMigrationDialog() {
    var q = new URLSearchParams(location.search).get('migrationResult');
    if (!q || store._migrationDialogShown) return;
    store._migrationDialogShown = true;
    if (q === 'match') openDialog('comm2MigrateMatchMask');
    else if (q === 'diff') openDialog('comm2MigrateDiffMask');
  }

  function openEdit(id) {
    var draft = store._draft && store._draft.id === id ? store._draft : null;
    var sch = draft || schemeById(id);
    if (!sch) return;
    if (draft) {
      store.editingId = id;
      renderEdit();
      show('screen-comm2-edit');
      goNav('comm2-edit');
      return;
    }
    if (!store._snapshot || store._snapshot.id !== id) {
      store._snapshot = JSON.parse(JSON.stringify(sch));
    }
    store.editingId = id;
    renderEdit();
    show('screen-comm2-edit');
    goNav('comm2-edit');
  }

  function markDirty() { store._dirty = true; }

  function leaveComm2Edit() {
    if (store._draft) {
      store._draft = null;
      store.editingId = null;
    } else if (store.editingId && store._snapshot) {
      var idx = store.schemes.findIndex(function (s) { return s.id === store.editingId; });
      if (idx >= 0) store.schemes[idx] = JSON.parse(JSON.stringify(store._snapshot));
    }
    openList();
  }

  function requestComm2Exit() {
    if (store._dirty || store._draft) { openDialog('comm2UnsavedMask'); return; }
    leaveComm2Edit();
  }

  /* ==== 二十六次：方案改动 → 本期提成是否重算（生效口径） ====

     规则：**已分配员工**的方案被改动（且改动**影响金额**）时，必须让用户明确选择本期怎么算。

     三种口径（详见 PRD §6.13）：
       recalc  = 本期全按新方案重算（本期已算好的行也重算；**人工改过的值仍保留**）
       forward = 算好的不动，从改动时刻起用新方案（**默认**）
       next    = 本期整期仍按老规则，下个结算周期起用新方案

     落地方式：
       · 方案本体存**新**规则；
       · 改动前的规则快照存 `sch._prev`（仅金额相关字段）；
       · `sch.effectiveMode` / `effectiveAt`（分界日，forward/recalc 用）/ `effectiveFrom`（生效期 key，next 用）。

     解析：`schForLine(sch, periodKey, ymd)` 返回该行应当使用的**规则集载体** ——
     可能是方案本身（用新规则），也可能是套了 `_prev` 口径的影子对象（用老规则）。
     试算链路（calcStaffTrial → schemeLineAmount）只需换掉传入的方案对象，其余逻辑零改动。
  */
  var COMM2_EFFECTIVE_DEFAULT = 'forward';
  var COMM2_EFFECTIVE_LABEL = { recalc: '本期重算', forward: '往新算', next: '下期生效' };

  /** 薪资侧「期」信息（跨模块读取；缺失时退化为自然月，保证 comm2 单独打开不报错） */
  function cmPeriodInfo(key) {
    var api = window.EmployeeDemo;
    if (api && typeof api.getPeriodInfo === 'function') {
      try { return api.getPeriodInfo(key); } catch (e) { /* fall through */ }
    }
    var k = String(key || '').slice(0, 10);
    return { key: key, label: key || '', range: '', start: k, end: k };
  }
  function cmCurrentPeriod() {
    var api = window.EmployeeDemo;
    if (api && typeof api.getCurrentPeriodInfo === 'function') {
      try { return api.getCurrentPeriodInfo(); } catch (e) { /* fall through */ }
    }
    return cmPeriodInfo(String(new Date().toISOString().slice(0, 10)));
  }
  function cmNextPeriod(key) {
    var api = window.EmployeeDemo;
    if (api && typeof api.nextPeriodInfo === 'function') {
      try { return api.nextPeriodInfo(key); } catch (e) { /* fall through */ }
    }
    return cmPeriodInfo(key);
  }
  function cmToday() { return new Date().toISOString().slice(0, 10); }

  /** 方案「影响金额」的字段指纹 —— 纯改名 / 改分配 / 改生效口径 都不算改动 */
  function schemeMoneyFingerprint(sch) {
    if (!sch) return '';
    normalizeScheme(sch);
    return JSON.stringify({
      defaults: sch.defaults,
      overrides: (sch.overrides || []).map(function (o) {
        return { targets: o.targets, payScope: o.payScope, baseMode: o.baseMode, pickMode: o.pickMode, rule: o.rule };
      }),
      stationIds: sch.stationIds,
      stationLabels: sch.stationLabels
    });
  }
  /** 改动是否**影响金额**（before/after 任一为空的场景一律视为有改动，宁可多问一次） */
  function schemeMoneyChanged(before, after) {
    if (!before || !after) return true;
    return schemeMoneyFingerprint(before) !== schemeMoneyFingerprint(after);
  }

  /** 从方案里抽出「规则集快照」（只留金额相关字段） */
  function schemeRuleSnapshot(sch) {
    if (!sch) return null;
    normalizeScheme(sch);
    return {
      defaults: JSON.parse(JSON.stringify(sch.defaults)),
      overrides: JSON.parse(JSON.stringify(sch.overrides || [])),
      stationIds: (sch.stationIds || []).slice(),
      stationLabels: JSON.parse(JSON.stringify(sch.stationLabels || {}))
    };
  }

  /** 该行应使用的规则集载体：老口径期间返回套了 `_prev` 的影子对象，其余返回方案本身 */
  function schForLine(sch, periodKey, ymd) {
    if (!sch) return sch;
    var prev = sch._prev;
    if (!prev) return sch;
    var mode = sch.effectiveMode || COMM2_EFFECTIVE_DEFAULT;
    var useOld = false;
    if (mode === 'recalc') {
      useOld = false;                                   /* 立即生效：本期也走新规则 */
    } else if (mode === 'next') {
      var from = sch.effectiveFrom;
      useOld = !!from && cmPeriodInfo(periodKey).end < cmPeriodInfo(from).end;
    } else {
      var at = sch.effectiveAt;
      useOld = !!at && String(ymd || '').slice(0, 10) < at;
    }
    if (!useOld) return sch;
    return Object.assign({}, sch, {
      defaults: prev.defaults,
      overrides: prev.overrides,
      stationIds: prev.stationIds || sch.stationIds,
      stationLabels: prev.stationLabels || sch.stationLabels
    });
  }

  /** 方案是否处于「下期生效」状态（列表页角标用） */
  function schemePendingNext(sch) {
    return !!sch && (sch.effectiveMode === 'next') && !!sch.effectiveFrom;
  }

  /* ==== 二十六次：改动重算弹窗 ====
     触发：**已分配员工**的方案被改动，且改动**影响金额**（纯改名 / 改分配 不弹）。
     口径：三个选项都不预置"跳过"，**必须选一项**才能完成保存（遮罩点击 / Esc 均无效）。 */
  var RECALC_OPTS = ['recalc', 'forward', 'next'];

  var recalcState = { sch: null, before: null, mode: COMM2_EFFECTIVE_DEFAULT };

  function recalcImpactHtml(sch) {
    var cur = cmCurrentPeriod();
    var lineN = 0;
    if (window.EmployeeDemo && typeof window.EmployeeDemo.countEffectiveCommLines === 'function') {
      try { lineN = window.EmployeeDemo.countEffectiveCommLines(sch.assigneeIds || []); } catch (e) { lineN = 0; }
    }
    return '<span class="comm2-recalc__impact-k">本期</span>' +
      '<span class="comm2-recalc__impact-v">' + esc(cur.range || cur.label) + '</span>' +
      '<span class="comm2-recalc__impact-sep" aria-hidden="true">·</span>' +
      '<span class="comm2-recalc__impact-k">已算好</span>' +
      '<span class="comm2-recalc__impact-v">' + lineN + ' 条</span>';
  }

  /** 三个选项的文案。区间/期名**动态注入**，让用户看到真实日期而不是抽象描述 */
  function recalcOptsHtml() {
    var cur = cmCurrentPeriod();
    var nxt = cmNextPeriod(cur.key);
    var title = {
      recalc: '本期全部重算',
      forward: '算好的不动，从现在起用新方案',
      next: '本期先不动，下期再用新方案'
    };
    var desc = {
      recalc: '本期（' + cur.range + '）已经算出来的提成，按新规则重算一遍 —— 金额会变',
      forward: '之前已经算出来的保持原样；从现在开始的新单子按新规则算',
      next: '本期（' + cur.range + '）整期还按老规则算，本次发薪不受影响；' + (nxt.label || '下期') + '起用新规则'
    };
    return RECALC_OPTS.map(function (mode) {
      var on = mode === recalcState.mode;
      return '<button type="button" class="comm2-recalc__opt' + (on ? ' on' : '') + '" data-comm2-recalc="' + mode + '"' +
        ' role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
        '<span class="comm2-recalc__radio" aria-hidden="true"></span>' +
        '<span class="comm2-recalc__main">' +
        '<span class="comm2-recalc__t">' + esc(title[mode]) + '</span>' +
        '<span class="comm2-recalc__d">' + esc(desc[mode]) + '</span>' +
        '</span></button>';
    }).join('');
  }

  function openRecalcDialog(sch, before) {
    recalcState.sch = sch;
    recalcState.before = before;
    recalcState.mode = COMM2_EFFECTIVE_DEFAULT;
    var staffN = (sch.assigneeIds || []).length;
    $('comm2RecalcTitle').textContent = '改「' + sch.name + '」后，提成怎么算？';
    $('comm2RecalcLead').textContent = '这个方案有 ' + staffN + ' 名员工在用，改动会影响他们本期已经算出来的提成。';
    $('comm2RecalcImpact').innerHTML = recalcImpactHtml(sch);
    $('comm2RecalcOpts').innerHTML = recalcOptsHtml();
    openDialog('comm2RecalcMask');
  }

  /** 把用户选的口径落到方案上：`_prev` 存**改动前**的规则快照 */
  function applyEffectiveChoice(sch, mode, before) {
    sch._prev = schemeRuleSnapshot(before);
    sch.effectiveMode = mode;
    if (mode === 'next') {
      sch.effectiveFrom = cmNextPeriod(cmCurrentPeriod().key).key;
      sch.effectiveAt = '';
    } else {
      sch.effectiveFrom = '';
      sch.effectiveAt = cmToday();
    }
  }

  /** 保存落库（弹窗选定后、或无需询问时走这里） */
  function commitSchemeSave() {
    if (store._draft) {
      store.schemes.unshift(store._draft);
      store._draft = null;
      store._snapshot = null;
      store._dirty = false;
    } else {
      store._snapshot = null;
      store._dirty = false;
    }
    toast('提成方案已保存');
    if (window.Comm2Demo && window.Comm2Demo.notifySalarySync) window.Comm2Demo.notifySalarySync();
    openList();
  }

  /* ==== 试算引擎：按行 payScope 过滤 → 多方案候选 → 金额取高（并列按方案列表顺序） ==== */

  var COMM2_TRIAL_LINES = [
    { id: 'tl1', name: '开卡 · 尊享组合卡', cat: 'issue', kind: 'card', refId: 'demo_vip_combo', cardRole: 'issue', pay: 'cash', list: 2000, paid: 2000, extra: true },
    { id: 'tl2', name: '充卡 · 老客续充', cat: 'card', pay: 'cash', list: 1000, paid: 1000, extra: true },
    { id: 'tl3', name: '深层补水护理', cat: 'labor', kind: 'project', refId: 'p21', pay: 'memberCard', list: 268, paid: 268, extra: true },
    { id: 'tl4', name: '染发', cat: 'labor', kind: 'project', refId: 'p6', pay: 'cash', list: 358, paid: 358, extra: true, stations: ['senior', 'mid'] },
    { id: 'tl4b', name: '染发 · 混合支付', cat: 'labor', kind: 'project', refId: 'p6', pay: 'cash', payParts: { cash: 40, memberCard: 60, groupBuy: 0 }, list: 100, paid: 100, extra: true, station: 'senior' },
    { id: 'tl5', name: '剑琅玻尿酸精华液', cat: 'sales', kind: 'product', refId: 'pd19', pay: 'memberCard', list: 198, paid: 198, extra: true },
    { id: 'tl6', name: '团购体验 · 洗头', cat: 'labor', kind: 'project', refId: 'p19', pay: 'groupBuy', list: 28, paid: 28, extra: false },
    { id: 'tl7', name: '卡付 · 时尚洗吹', cat: 'labor', kind: 'project', refId: 'p1', pay: 'memberCard', list: 58, paid: 58, extra: false },
    { id: 'tl8', name: '快捷开单', cat: 'labor', kind: 'quick', refId: 'quick', pay: 'cash', list: 98, paid: 98, extra: true },
    { id: 'tl9', name: '经理签单 · 深层补水护理', cat: 'labor', kind: 'project', refId: 'p21', sign: true, list: 268, paid: 0, extra: true }
  ];

  function schemesForStaff(staffId) {
    return store.schemes.filter(function (s) {
      return (s.assigneeIds || []).indexOf(staffId) >= 0;
    });
  }

  function lineInGroup(line, target, groupKind) {
    var g = comm2Groups(groupKind).find(function (x) { return x.id === target.refId; });
    if (!g || !g.itemIds) return false;
    return g.itemIds.indexOf(line.refId) >= 0;
  }

  function resolveLineBlock(sch, line) {
    normalizeScheme(sch);
    var cat = line.cat || 'labor';
    var overrides = sch.overrides || [];
    for (var i = 0; i < overrides.length; i++) {
      var ov = overrides[i];
      for (var j = 0; j < (ov.targets || []).length; j++) {
        var t = ov.targets[j];
        if (t.kind === 'group') {
          var gk = t.groupKind || (t.belongCat === 'sales' ? 'product' : 'project');
          if (lineInGroup(line, t, gk)) return ov;
          continue;
        }
        if (t.kind === 'card') {
          if (line.kind === 'card' && t.refId === line.refId) {
            if (t.cardRole && line.cardRole && t.cardRole !== line.cardRole) continue;
            return ov;
          }
          continue;
        }
        /* 快捷开单：业务上是项目覆盖项；开单行可能是 kind=quick */
        if (t.kind === 'project' && t.refId === COMM2_QUICK_REF && isQuickLine(line)) return ov;
        if (t.kind === line.kind && t.refId === line.refId) return ov;
      }
    }
    if (isQuickLine(line)) return ensureSystemQuickOverride(sch);
    return sch.defaults[cat] || sch.defaults.labor;
  }

  function linePayParts(line) {
    if (line && line.payParts && typeof line.payParts === 'object') {
      return {
        cash: Number(line.payParts.cash) || 0,
        memberCard: Number(line.payParts.memberCard) || 0,
        groupBuy: Number(line.payParts.groupBuy) || 0
      };
    }
    var o = { cash: 0, memberCard: 0, groupBuy: 0 };
    if (line && line.pay && o[line.pay] != null) o[line.pay] = Number(line.paid) || 0;
    return o;
  }

  function payPartsTotal(parts) {
    return (Number(parts.cash) || 0) + (Number(parts.memberCard) || 0) + (Number(parts.groupBuy) || 0);
  }

  function payPartsInScope(block, parts) {
    ensurePayScopeBlock(block);
    var sum = 0;
    COMM2_PAY_SCOPE.forEach(function (d) {
      if (block.payScope[d.key]) sum += Number(parts[d.key]) || 0;
    });
    return sum;
  }

  function lineBaseAmount(block, line) {
    var parts = linePayParts(line);
    var total = payPartsTotal(parts);
    var inScope = payPartsInScope(block, parts);
    if (block.baseMode === 'paid') return inScope;
    var list = Number(line.list) || 0;
    if (total <= 0) return 0;
    return Math.round(list * (inScope / total) * 100) / 100;
  }

  /* 费率取值口径（「顾客指定」= 在提成之上叠加该值，不再替换）：
     先取基础费率 → 按工位取该工位提成值（stations[sid].valueMode）/ 不分工位取 rule 级提成值（nonDesignatedValueMode）；
     若该开单为顾客指定且已开启顾客指定提成，再叠加 rule 级顾客指定值（见 lineExtraAmount / lineExtraLabel）。
     二十五次：按工位可多选 → 订单行 `stations: string[]`（旧单值 `station` 兼容包成数组）；
     提成侧金额 = Σ(各勾选工位金额)。 */
  /** 订单行「提成侧」是否被**明确勾选**（十七次新增口径）：
      `basePicked === false` → 开单侧**明确没有勾提成侧**（按工位 = 未点工位；不分工位 = 未勾「提成」）
        → **提成侧金额为 0，只发顾客指定提成**；
      `true` / **缺字段（历史订单行）** → 照常计提（此时未点工位仍按规则 7 回落 `stationIds[0]`，
        不会把旧数据误判成「提成 0」）。 */
  function lineBasePicked(line) {
    if (!line) return true;
    return line.basePicked !== false;
  }
  /** 订单行勾选的工位列表：优先 `stations[]`；旧单值 `station` 包成数组；
      二者皆无且需回落时 → `[stationIds[0]]`（仅 `basePicked !== false` 路径调用）。 */
  function lineStationIds(sch, line) {
    if (line && Array.isArray(line.stations) && line.stations.length) {
      var ids = getStationIds(sch);
      return ids.filter(function (id) { return line.stations.indexOf(id) >= 0; })
        .concat(line.stations.filter(function (id) { return ids.indexOf(id) < 0; }));
    }
    if (line && line.station) return [line.station];
    return [getStationIds(sch)[0]];
  }
  /** 单工位提成侧金额 + 标签片段（pct / amount 各自算） */
  function stationSidePiece(st, base, ratio) {
    var sAmt = stationIsAmt(st);
    var rate = stationNonVal(st, sAmt);
    if (sAmt) {
      return { amount: Math.round(rate * ratio * 100) / 100, label: '¥' + fmtMoney(rate), isAmt: true, rate: rate };
    }
    return { amount: Math.round(base * rate) / 100, label: rate + '%', isAmt: false, rate: rate };
  }
  function lineRateMeta(sch, block, rule, line) {
    /* 明确没勾提成侧 → 提成侧折 0（金额与标签都不出提成侧），顾客指定侧照旧叠加 */
    if (!lineBasePicked(line)) return { rate: 0, isAmt: false, none: true, pieces: [] };
    if (block.pickMode === 'station') {
      var stIds = lineStationIds(sch, line);
      var pieces = stIds.map(function (stId) {
        var st = rule.stations[stId] || defaultStationPair();
        return { stId: stId, st: st, isAmt: stationIsAmt(st), rate: stationNonVal(st, stationIsAmt(st)) };
      });
      /* 兼容旧调用方：单工位时仍暴露 rate / isAmt；多工位时 rate = 比例之和（仅全为 pct 时有意义） */
      var allPct = pieces.every(function (p) { return !p.isAmt; });
      var allAmt = pieces.every(function (p) { return p.isAmt; });
      var sumRate = pieces.reduce(function (s, p) { return s + p.rate; }, 0);
      return {
        rate: sumRate,
        isAmt: allAmt && !allPct ? true : (allPct ? false : false),
        mixed: !(allPct || allAmt),
        pieces: pieces,
        multi: pieces.length > 1
      };
    }
    var nAmt = nonIsAmt(rule);
    return { rate: pairVal(rule, nAmt, 'nonDesignated', 'nonDesignatedAmt'), isAmt: nAmt, pieces: [] };
  }
  /** 提成侧合计金额 + 标签（多工位 = 各工位金额相加；标签用 `12% + 10%`） */
  function lineBaseSide(sch, block, rule, line, base, ratio) {
    if (!lineBasePicked(line)) return { amount: 0, label: '' };
    if (block.pickMode === 'station') {
      var stIds = lineStationIds(sch, line);
      var total = 0;
      var labels = [];
      stIds.forEach(function (stId) {
        var st = rule.stations[stId] || defaultStationPair();
        var piece = stationSidePiece(st, base, ratio);
        total += piece.amount;
        labels.push(piece.label);
      });
      return { amount: Math.round(total * 100) / 100, label: labels.join(' + ') };
    }
    var nAmt = nonIsAmt(rule);
    var rate = pairVal(rule, nAmt, 'nonDesignated', 'nonDesignatedAmt');
    if (nAmt) {
      return { amount: Math.round(rate * ratio * 100) / 100, label: '¥' + fmtMoney(rate) };
    }
    return { amount: Math.round(base * rate) / 100, label: rate + '%' };
  }
  /** 顾客指定提成金额（叠加）：比例 → 基数×比例；金额 → 固定额按实收占比缩放 */
  function lineExtraAmount(rule, line, base, ratio) {
    if (!lineExtra(line) || !rule.extraSplit) return 0;
    var amt = extraIsAmt(rule);
    var v = extraVal(rule, amt);
    if (amt) return Math.round(v * ratio * 100) / 100;
    return Math.round(base * v) / 100;
  }
  /** 订单行「顾客指定」标记：新字段 `extra`，兼容旧字段 `designated` */
  function lineExtra(line) {
    if (!line) return false;
    if (typeof line.extra === 'boolean') return line.extra;
    return !!line.designated;
  }
  /** 「顾客指定」标签：顾客指定 3% / 顾客指定 ¥5 */
  function lineExtraLabel(rule, line) {
    if (!lineExtra(line) || !rule.extraSplit) return '';
    var amt = extraIsAmt(rule);
    return '顾客指定 ' + fmtVal(extraVal(rule, amt), amt);
  }

  function schemeLineAmount(sch, line) {
    normalizeScheme(sch);
    var block = resolveLineBlock(sch, line);
    ensurePayScopeBlock(block);
    /* 经理签单（实收=0）：不走三类适用范围；是否计提由命中块 baseMode 决定 */
    if (line.sign) {
      var ruleS = ensureCat(block.rule, getStationIds(sch));
      var baseS = block.baseMode === 'paid' ? 0 : (Number(line.list) || 0);
      var sideS = lineBaseSide(sch, block, ruleS, line, baseS, 1);
      var extraS = lineExtraAmount(ruleS, line, baseS, 1);
      var extraLblS = lineExtraLabel(ruleS, line);
      var baseLblS = sideS.label;
      var sepS = (baseLblS && extraLblS) ? ' + ' : '';
      var amountS = Math.round((sideS.amount + extraS) * 100) / 100;
      if (baseS <= 0 && extraS <= 0 && sideS.amount <= 0) {
        return { amount: 0, skipped: 'sign', rateLabel: baseLblS || '0%', base: 0 };
      }
      return {
        amount: amountS,
        skipped: '',
        rateLabel: baseLblS + sepS + extraLblS,
        base: baseS
      };
    }
    var parts = linePayParts(line);
    var totalPaid = payPartsTotal(parts);
    var inScope = payPartsInScope(block, parts);
    if (inScope <= 0) {
      return { amount: 0, skipped: 'scope', rateLabel: '' };
    }
    var rule = ensureCat(block.rule, getStationIds(sch));
    var meta = lineRateMeta(sch, block, rule, line);
    var ratio = totalPaid > 0 ? (inScope / totalPaid) : 0;
    var extraLbl = lineExtraLabel(rule, line);
    var basePct = lineBaseAmount(block, line);
    var side = lineBaseSide(sch, block, rule, line, basePct, ratio);
    /* 顾客指定比例侧：提成侧全为固定金额时沿用旧口径用 inScope 作基数；否则用 lineBaseAmount */
    var extraBase = (meta.isAmt && !meta.mixed) ? inScope : basePct;
    var extraAmt = lineExtraAmount(rule, line, extraBase, ratio);
    var baseLbl = side.label;
    var sep = (baseLbl && extraLbl) ? ' + ' : '';
    return {
      amount: Math.round((side.amount + extraAmt) * 100) / 100,
      skipped: '',
      rateLabel: baseLbl + sep + extraLbl,
      base: (meta.isAmt && !meta.mixed) ? inScope : basePct
    };
  }

  function calcStaffTrial(staffId, lines, periodKey) {
    /* schemes 顺序 = store.schemes 列表顺序，并列时先出现者胜出 */
    var schemes = schemesForStaff(staffId);
    /* 二十六次：按期解析 —— 该行可能仍走方案的**老口径**（`_prev`），由 schForLine 决定 */
    var pk = periodKey || cmCurrentPeriod().key;
    var rows = (lines || COMM2_TRIAL_LINES).map(function (line) {
      var cands = [];
      schemes.forEach(function (sch, schIdx) {
        var r = schemeLineAmount(schForLine(sch, pk, line.ymd), line);
        if (r.skipped) {
          cands.push({
            schemeId: sch.id, schemeName: sch.name, schemeIndex: schIdx,
            amount: 0, skipped: r.skipped, rateLabel: '—', note: r.skipped === 'sign' ? '实收模式下经理签单不计提成' : '支付方式不在范围'
          });
          return;
        }
        cands.push({
          schemeId: sch.id,
          schemeName: sch.name,
          schemeIndex: schIdx,
          amount: r.amount,
          skipped: '',
          rateLabel: r.rateLabel,
          base: r.base,
          note: ''
        });
      });
      var eligible = cands.filter(function (c) { return !c.skipped; });
      var winner = null;
      eligible.forEach(function (c) {
        /* 严格大于才替换 → 金额并列时保留列表中更靠前的方案 */
        if (!winner || c.amount > winner.amount) winner = c;
      });
      return {
        line: line,
        cands: cands,
        winner: winner,
        amount: winner ? winner.amount : 0,
        winnerSchemeId: winner ? winner.schemeId : null
      };
    });
    var total = rows.reduce(function (s, r) { return s + r.amount; }, 0);
    return { staffId: staffId, schemes: schemes, rows: rows, total: total };
  }

  /* ==== 方案卡配套：菜单 / 命名 / 复制 / 删除 / 分配 ==== */

  function openComm2Menu(id) {
    var sch = schemeById(id);
    if (!sch) return;
    store._menuId = id;
    var t = $('comm2MenuTitle');
    if (t) t.textContent = sch.name;
    openSheet('comm2MenuMask');
  }

  function openComm2NameDialog(mode, id) {
    store._nameMode = mode;
    store._menuId = id;
    var sch = id ? schemeById(id) : null;
    var title = $('comm2NameTitle');
    var input = $('comm2NameInput');
    var ok = $('comm2NameOk');
    if (title) title.textContent = mode === 'rename' ? '重命名方案' : '方案名称';
    if (input) {
      input.value = mode === 'rename' && sch ? sch.name : '';
      input.setAttribute('maxlength', '20');
      input.placeholder = '请输入方案名称';
    }
    if (ok) ok.textContent = mode === 'rename' ? '确定' : '创建';
    openDialog('comm2NameMask');
    setTimeout(function () { if (input) input.focus(); }, 60);
  }

  function applyComm2Name() {
    var input = $('comm2NameInput');
    var name = input ? String(input.value).trim() : '';
    if (!name) { toast('请输入方案名称', true); return; }
    closeDialog('comm2NameMask');
    if (store._nameMode === 'rename') {
      var sch = schemeById(store._menuId);
      if (!sch) return;
      sch.name = name;
      toast('方案已重命名');
      renderList();
    } else {
      var ns = defaultScheme({ name: name });
      store._draft = ns;
      store.editingId = null;
      store._snapshot = null;
      store._dirty = false;
      renderList();
      openEdit(ns.id);
    }
  }

  function copyComm2Scheme(id) {
    var sch = schemeById(id);
    if (!sch) return;
    var copy = JSON.parse(JSON.stringify(sch));
    copy.id = 'c2_' + Date.now();
    copy.name = sch.name + ' 副本';
    copy.assigneeIds = [];
    store.schemes.push(copy);
    toast('方案已复制');
    renderList();
  }

  function requestComm2Delete(id) {
    store._menuId = id;
    openDialog('comm2DeleteMask');
  }

  function confirmComm2Delete() {
    var id = store._menuId;
    closeDialog('comm2DeleteMask');
    store.schemes = store.schemes.filter(function (s) { return s.id !== id; });
    if (store.editingId === id) store.editingId = null;
    toast('方案已删除');
    renderList();
  }

  function comm2StaffPool() {
    var list = [];
    if (window.EmployeeDemo && typeof window.EmployeeDemo.getBillingStaffPool === 'function') {
      list = window.EmployeeDemo.getBillingStaffPool() || [];
    }
    if (!list.length) {
      list = Object.keys(COMM2_STAFF_FALLBACK).map(function (id) {
        return { id: id, name: COMM2_STAFF_FALLBACK[id], short: COMM2_STAFF_FALLBACK[id].slice(0, 1), role: '' };
      });
    }
    return list;
  }

  function comm2AvatarHtml(s) {
    if (s && s.avatar) {
      return '<div class="emp-avatar"><img src="' + esc(s.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>';
    }
    var ch = (s && (s.short || s.name)) ? String(s.short || s.name).slice(0, 1) : '';
    return '<div class="emp-avatar">' + esc(ch) + '</div>';
  }

  function comm2CheckSvg() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
  }

  function pickItemConfigured(sch, type, itemId, cardRole, excludeOvId) {
    var ikey = type === 'card'
      ? ('card:' + itemId + ':' + (cardRole || 'issue'))
      : ('item:' + type + ':' + itemId);
    if (coveredTargetCount(sch, ikey, excludeOvId) > 0) return true;
    return comm2Groups(type).some(function (g) {
      var gkey = 'group:' + type + ':' + g.id;
      return coveredTargetCount(sch, gkey, excludeOvId) > 0 && (g.itemIds || []).indexOf(itemId) >= 0;
    });
  }

  function pickItemCoverCount(sch, type, itemId, cardRole, excludeOvId) {
    var ikey = type === 'card'
      ? ('card:' + itemId + ':' + (cardRole || 'issue'))
      : ('item:' + type + ':' + itemId);
    var n = coveredTargetCount(sch, ikey, excludeOvId);
    comm2Groups(type).forEach(function (g) {
      var gkey = 'group:' + type + ':' + g.id;
      if ((g.itemIds || []).indexOf(itemId) >= 0) n += coveredTargetCount(sch, gkey, excludeOvId);
    });
    return n;
  }

  function pickCheckHtml(on, configured) {
    if (configured) {
      return '<span class="comm2-pick-item__check is-configured" aria-hidden="true">' + comm2CheckSvg() + '</span>';
    }
    if (on) {
      return '<span class="comm2-pick-item__check" aria-hidden="true">' + comm2CheckSvg() + '</span>';
    }
    return '<span class="comm2-pick-item__check" aria-hidden="true"></span>';
  }

  function syncComm2AssignCount() {
    var n = 0;
    var sel = store._assignSel || {};
    Object.keys(sel).forEach(function (k) { if (sel[k]) n++; });
    var el = $('comm2AssignCount');
    if (el) el.textContent = '已选 ' + n + ' 人';
  }

  function renderComm2Assign() {
    var sch = schemeById(store._assignId);
    var root = $('comm2AssignList');
    if (!sch || !root) return;
    var list = comm2StaffPool();
    var sel = store._assignSel || (store._assignSel = {});
    root.innerHTML = list.map(function (s) {
      var others = schemesAlsoContainingStaff(s.id, store._assignId);
      var on = !!sel[s.id];
      var roleHtml;
      if (others.length) {
        var names = others.map(function (o) { return esc(o.name); }).join('、');
        roleHtml = '<span class="emp-assign-card__role emp-assign-card__role--also" aria-label="也在其他方案：' + names + '">' +
          '<i class="emp-assign-card__also-ico" aria-hidden="true"></i>' +
          '<span class="emp-assign-card__also-names">' + names + '</span></span>';
      } else {
        roleHtml = '<span class="emp-assign-card__role">' + esc(s.role || '未设置头衔') + '</span>';
      }
      return '<button type="button" class="emp-assign-card' + (on ? ' on' : '') + (others.length ? ' has-others' : '') + '"' +
        ' data-comm2-assign-tog="' + esc(s.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        comm2AvatarHtml(s) +
        '<span class="emp-assign-card__meta"><span class="emp-assign-card__name">' + esc(s.name) + '</span>' +
        roleHtml + '</span>' +
        '<span class="emp-assign-card__check" aria-hidden="true">' + (on ? comm2CheckSvg() : '') + '</span></button>';
    }).join('') || '<div class="empty-cart" style="padding:32px 16px">暂无在岗员工</div>';
    syncComm2AssignCount();
  }

  function openComm2Assign(id) {
    var sch = schemeById(id);
    if (!sch) return;
    store._assignId = id;
    store._assignSel = {};
    (sch.assigneeIds || []).forEach(function (sid) {
      store._assignSel[sid] = true;
    });
    renderComm2Assign();
    openSheet('comm2AssignMask');
  }

  function applyComm2Assign() {
    var sch = schemeById(store._assignId);
    if (!sch) return;
    var ids = Object.keys(store._assignSel || {}).filter(function (k) { return store._assignSel[k]; });
    sch.assigneeIds = ids;
    closeSheet('comm2AssignMask');
    toast(ids.length ? ('已分配 ' + ids.length + ' 人') : '已清空分配');
    renderList();
    if (window.Comm2Demo && window.Comm2Demo.notifySalarySync) window.Comm2Demo.notifySalarySync();
  }

  function gearSvg() {
    return '<svg class="comm2-base-seg__gear-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
      '</svg>';
  }

  function sheetRowHtml(lbl, ctrlHtml, cls, attrs, helpKey) {
    /* helpKey：行标签后附 ⓘ（复用 .emp-ach-info-btn），点击说明见 §6.9；用 data-* 以便 Sheet 重渲染后仍走委派 */
    var lblHtml = esc(lbl) + (helpKey
      ? '<button type="button" class="emp-ach-info-btn comm2-sheet-row__help" data-comm2-sheet-help="' + esc(helpKey) +
        '" aria-label="' + esc(lbl) + '说明">?</button>'
      : '');
    return '<div class="comm2-sheet-row' + (cls ? ' ' + cls : '') + '"' + (attrs || '') + '>' +
      '<span class="comm2-sheet-row__lbl">' + lblHtml + '</span>' +
      '<div class="comm2-sheet-row__ctrl">' + ctrlHtml + '</div></div>';
  }

  function sheetCardRoleHtml(block) {
    var role = block.cardRole || 'issue';
    return '<div class="comm2-rule-card__seg comm2-base-seg comm2-sheet-ctrl" role="radiogroup">' +
      '<button type="button" class="comm2-base-seg__btn' + (role !== 'card' ? ' on' : '') + '" data-comm2-sheet-card-role="issue">办卡</button>' +
      '<button type="button" class="comm2-base-seg__btn' + (role === 'card' ? ' on' : '') + '" data-comm2-sheet-card-role="card">充卡</button></div>';
  }

  function renderRuleSheetBody(sch, block, rule) {
    rule = ensureCat(rule, getStationIds(sch));
    var extraSplit = !!rule.extraSplit;
    var hint = '<span class="comm2-sheet-params-hint">点「比例 / 金额」切换</span>';
    var html = sheetRowHtml('提成参数', hint, 'comm2-sheet-row--params-head', ' data-comm2-sheet-anchor="params"');
    html += '<div class="comm2-sheet-params-body" data-comm2-sheet-anchor="params-body">';
    if (block.pickMode === 'station') {
      var ids = getStationIds(sch);
      /* 第 1 行：3 工位并列一行；各仅 1 张「提成」卡 */
      html += '<div class="comm2-sheet-station-grid">';
      ids.forEach(function (sid) {
        var st = rule.stations[sid] || defaultStationPair();
        var editingName = store._stationInlineEditId === sid;
        html += '<div class="comm2-sheet-station comm2-sheet-station--compact">' +
          (editingName
            ? '<div class="comm2-sheet-station__name is-editing"><input type="text" class="comm2-sheet-station__input" maxlength="6" data-comm2-station-inline-input="' + esc(sid) + '" value="' + esc(stationLabel(sch, sid)) + '" /></div>'
            : '<button type="button" class="comm2-sheet-station__name" data-comm2-station-inline-edit="' + esc(sid) + '" aria-label="改名工位"><i class="comm2-sheet-station__dot" aria-hidden="true"></i><span class="comm2-sheet-station__label">' + esc(stationLabel(sch, sid)) + '</span><span class="comm2-sheet-station__edit" aria-hidden="true">' + editIconSvg() + '</span></button>') +
          '<div class="comm2-extra-row comm2-extra-row--solo">' +
          singleCapHtml('st.' + sid + '.', st, '提成', {
            asNon: extraSplit,
            isAmt: stationIsAmt(st),
            modeKey: 'st.' + sid
          }) +
          '</div></div>';
      });
      html += '</div>';
      /* 第 2 行：顾客指定（宽同单个工位卡）；顾客指定值叠加在工位提成之上；未开时为虚线卡 */
      html += '<div class="comm2-sheet-station comm2-sheet-station--compact is-extra">' +
        '<div class="comm2-sheet-station__name is-static"><i class="comm2-sheet-station__dot" aria-hidden="true"></i><span class="comm2-sheet-station__label">顾客指定</span></div>' +
        '<div class="comm2-extra-row comm2-extra-row--solo">' +
        (extraSplit ? extraCapHtml('base.', rule) : extraAddCardHtml()) +
        '</div></div>';
    } else {
      html += commissionParamsHtml('base.', rule, extraSplit, '提成');
    }
    html += '</div>';
    return html;
  }

  function renderCardSheetBody(sch, block, opts) {
    opts = opts || {};
    var variant = opts.variant || store._sheetVariant || 'full';
    ensurePayScopeBlock(block);
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var html = '';
    /* 仅全量 Sheet；params 变体已废弃，一律按 full 渲染 */
    html += sheetRowHtml('适用范围', '<div class="comm2-rule-card__scope comm2-sheet-scope">' + sheetScopeChipsHtml(block) + '</div>') +
      sheetRowHtml('计算基数', sheetSegHtml('base', block), null, null, 'base');
    html += sheetRowHtml('分配模式', sheetSegHtml('pick', block), null, null, 'pick');
    if (opts.showCardRole) {
      html += sheetRowHtml('会员卡', sheetCardRoleHtml(block));
    }
    html += renderRuleSheetBody(sch, block, block.rule);
    return html;
  }

  function refreshCardSheetBody() {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    var body = $('comm2CatSheetBody');
    if (!sch || !block || !body) return;
    var opts = { variant: store._sheetVariant || 'full' };
    if (store._sheetContext === 'pick' && store._pickType === 'card') opts.showCardRole = true;
    body.innerHTML = renderCardSheetBody(sch, block, opts);
    syncCapFieldWidths(body);
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs(body);
  }

  function openCardSheet(target, opts) {
    opts = opts || {};
    var sch = editing();
    if (!sch) return;
    var block = getCardBlock(sch, target);
    if (!block) return;
    block.rule = ensureCat(block.rule, getStationIds(sch));
    store._sheetContext = 'edit';
    store._cardTarget = target;
    store._sheetVariant = 'full';
    store._stationInlineEditId = null;
    var p = parseCardTarget(target);
    var title = p.type === 'default'
      ? ((COMM2_CATS.find(function (c) { return c.key === p.id; }) || {}).label || '')
      : (block.title || '覆盖');
    var titleEl = $('comm2CatSheetTitle');
    if (titleEl) titleEl.textContent = title;
    refreshCardSheetBody();
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.add('open');
    if (opts.focus === 'params') {
      var body = $('comm2CatSheetBody');
      if (!body) return;
      requestAnimationFrame(function () {
        var el = body.querySelector('[data-comm2-sheet-anchor="params"]') ||
          body.querySelector('.comm2-sheet-row--params-head');
        if (!el) return;
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        el.classList.add('is-flash-anchor');
        setTimeout(function () { el.classList.remove('is-flash-anchor'); }, 900);
      });
    }
  }

  /** 「顾客指定」开关：开 → 「额外」卡（默认 0，需自行填写）；关 → 顾客指定值归零 */
  function setSheetExtraSplit(on) {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    if (!sch || !block) return;
    flushSheetCapDraft(sch, block);
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var ids = getStationIds(sch);
    if (on) {
      block.rule.extraSplit = true;
      /* 开启时顾客指定值默认 0，与提成同 mode（叠加值，不跟提成数值） */
      if (block.pickMode === 'station') {
        var firstSt = block.rule.stations[ids[0]] || defaultStationPair();
        block.rule.extraValueMode = normalizeValueMode(firstSt.valueMode);
      } else {
        block.rule.extraValueMode = normalizeValueMode(block.rule.nonDesignatedValueMode);
      }
      if (extraIsAmt(block.rule)) block.rule.extraAmt = Number(block.rule.extraAmt) || 0;
      else block.rule.extraValue = Number(block.rule.extraValue) || 0;
    } else {
      block.rule.extraSplit = false;
      applyExtraSplitFlag(block.rule, ids);
    }
    refreshCardSheetBody();
  }

  /** @deprecated 卡面直改已移除，保留空实现防外部调用 */
  function toggleBarBase() {}
  function toggleBarScope() {}

  function openPickSettingsSheet() {
    var sch = editing();
    var b = store._pickBundle;
    if (!sch || !b || !b.targets.length) { toast('请先选择规则项', true); return; }
    store._sheetContext = 'pick';
    store._cardTarget = null;
    store._sheetVariant = 'full';
    b.rule = ensureCat(b.rule, getStationIds(sch));
    var titleEl = $('comm2CatSheetTitle');
    if (titleEl) titleEl.textContent = '添加规则项 · 设置';
    refreshCardSheetBody();
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.add('open');
  }

  function closeCatSheet() {
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    store._sheetVariant = 'full';
    if (store._sheetContext === 'pick') return;
    store._cardTarget = null;
    store._sheetContext = null;
  }

  function readSheetNum(prefix, key) {
    var el = document.querySelector('#comm2CatSheetBody [data-comm2-field="' + prefix + key + '"]');
    return parseFloat(el && el.value);
  }

  /** 切换 mode 前：把当前可见输入写回 rule（不校验，保留另一模式已存值） */
  function flushSheetCapDraft(sch, block) {
    if (!sch || !block) return;
    var rule = ensureCat(block.rule, getStationIds(sch));
    var ids = getStationIds(sch);
    function tryWrite(prefix, key, target) {
      var el = document.querySelector('#comm2CatSheetBody [data-comm2-field="' + prefix + key + '"]');
      if (!el) return;
      var n = parseFloat(el.value);
      if (Number.isFinite(n) && n >= 0) target[key] = n;
    }
    if (block.pickMode === 'station') {
      ids.forEach(function (sid) {
        if (!rule.stations[sid]) rule.stations[sid] = defaultStationPair();
        var st = rule.stations[sid];
        var amt = stationIsAmt(st);
        tryWrite('st.' + sid + '.', amt ? 'nonDesignatedAmt' : 'nonDesignated', st);
      });
    } else {
      var nAmt = nonIsAmt(rule);
      tryWrite('base.', nAmt ? 'nonDesignatedAmt' : 'nonDesignated', rule);
    }
    if (rule.extraSplit) {
      var eAmt = extraIsAmt(rule);
      tryWrite('base.', extraKey(eAmt), rule);
    }
    block.rule = rule;
  }

  /** 点单位切换：modeKey = 'base.non' | 'base.extra' | 'st.{sid}' */
  function toggleCapValueMode(modeKey) {
    var sch = editing();
    var block = sch ? getSheetBlock(sch) : null;
    if (!sch || !block || !modeKey) return;
    flushSheetCapDraft(sch, block);
    var rule = ensureCat(block.rule, getStationIds(sch));
    function flip(cur) {
      return isAmtMode(cur) ? 'pct' : 'amount';
    }
    if (modeKey === 'base.non') {
      rule.nonDesignatedValueMode = flip(rule.nonDesignatedValueMode);
    } else if (modeKey === 'base.extra') {
      rule.extraValueMode = flip(rule.extraValueMode);
    } else if (modeKey.indexOf('st.') === 0) {
      var sid = modeKey.slice(3);
      if (!rule.stations[sid]) rule.stations[sid] = defaultStationPair();
      rule.stations[sid].valueMode = flip(rule.stations[sid].valueMode);
    } else {
      return;
    }
    syncLegacyValueMode(rule, block.pickMode, getStationIds(sch));
    block.rule = rule;
    refreshCardSheetBody();
  }

  function applySheetPairs(block, sch, rule) {
    var extraSplit = !!rule.extraSplit;
    var ids = getStationIds(sch);
    if (extraSplit) {
      var eAmt = extraIsAmt(rule);
      var eKey = extraKey(eAmt);
      var g = readSheetNum('base.', eKey);
      if (!Number.isFinite(g) || g < 0) return '请输入有效的顾客指定' + (eAmt ? '金额' : '比例');
      if (!eAmt && g > 100) return '比例需在 0–100%';
      rule[eKey] = g;
    }
    if (block.pickMode === 'station') {
      for (var i = 0; i < ids.length; i++) {
        var sid = ids[i];
        if (!rule.stations[sid]) rule.stations[sid] = defaultStationPair();
        var st = rule.stations[sid];
        var sAmt = stationIsAmt(st);
        var nonKey = sAmt ? 'nonDesignatedAmt' : 'nonDesignated';
        var v = readSheetNum('st.' + sid + '.', nonKey);
        if (!Number.isFinite(v) || v < 0) return stationLabel(sch, sid) + '：请输入有效的提成' + (sAmt ? '金额' : '比例');
        if (!sAmt && v > 100) return stationLabel(sch, sid) + '：比例需在 0–100%';
        st[nonKey] = v;
      }
    } else {
      var nAmt = nonIsAmt(rule);
      var nKey = nAmt ? 'nonDesignatedAmt' : 'nonDesignated';
      var non = readSheetNum('base.', nKey);
      if (!Number.isFinite(non) || non < 0) return '请输入有效的提成' + (nAmt ? '金额' : '比例');
      if (!nAmt && non > 100) return '比例需在 0–100%';
      rule[nKey] = non;
    }
    if (!extraSplit) applyExtraSplitFlag(rule, ids);
    syncLegacyValueMode(rule, block.pickMode, ids);
    return null;
  }

  function savePickSheet() {
    var sch = editing();
    var b = store._pickBundle;
    if (!sch || !b) { closeCatSheet(); return; }
    if (payScopeCountBlock(b) < 1) { toast('至少选一种支付方式', true); return; }
    var rule = ensureCat(b.rule, getStationIds(sch));
    var err = applySheetPairs(b, sch, rule);
    if (err) { toast(err, true); return; }
    b.rule = rule;
    if (!sch.overrides) sch.overrides = [];
    var title = buildOverrideTitle(b.targets) || b.title || '未命名';
    if (store._editOverrideId) {
      var hit = sch.overrides.find(function (o) { return o.id === store._editOverrideId; });
      if (hit) {
        hit.targets = b.targets.slice();
        hit.title = title;
        hit.payScope = JSON.parse(JSON.stringify(b.payScope));
        hit.baseMode = b.baseMode;
        hit.pickMode = b.pickMode;
        hit.rule = JSON.parse(JSON.stringify(b.rule));
        hit.belongCat = b.belongCat;
        if (b.cardRole) hit.cardRole = b.cardRole;
      }
      store._editOverrideId = null;
      toast('已更新适用项');
    } else {
      sch.overrides.push({
        id: 'ov_' + Date.now(),
        belongCat: b.belongCat,
        title: title,
        payScope: JSON.parse(JSON.stringify(b.payScope)),
        baseMode: b.baseMode,
        pickMode: b.pickMode,
        rule: JSON.parse(JSON.stringify(b.rule)),
        targets: b.targets.slice()
      });
      toast('已添加规则项');
    }
    markDirty();
    store._sheetContext = null;
    store._pickSel = {};
    store._pickBundle = null;
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    openEdit(store.editingId);
  }

  function saveCatSheet() {
    var sch = editing();
    if (!sch) { closeCatSheet(); return; }
    if (store._sheetContext === 'pick') { savePickSheet(); return; }
    if (!store._cardTarget) { closeCatSheet(); return; }
    var cardTarget = store._cardTarget;
    var block = getCardBlock(sch, cardTarget);
    if (!block) { closeCatSheet(); return; }
    var rule = ensureCat(block.rule, getStationIds(sch));
    var err = applySheetPairs(block, sch, rule);
    if (err) { toast(err, true); return; }
    block.rule = rule;
    markDirty();
    closeCatSheet();
    renderEditCards(sch);
    flashEl(document.querySelector('[data-comm2-rule-card="' + cardTarget + '"]'));
    toast('已更新规则');
  }

  function maybeRefreshOpenCardSheet() {
    var mask = $('comm2CatSheetMask');
    if (mask && mask.classList.contains('open') && (store._cardTarget || store._sheetContext === 'pick')) refreshCardSheetBody();
  }

  /* ---- 添加规则项 / 选择页 ---- */
  function comm2Catalog(kind) {
    if (kind === 'card') {
      var out = [];
      if (typeof getActiveTemplates === 'function') out = getActiveTemplates().slice();
      if (typeof getShelvedTemplates === 'function') {
        getShelvedTemplates().forEach(function (t) {
          if (!out.some(function (x) { return x.id === t.id; })) out.push(t);
        });
      }
      return out.map(function (t) {
        return {
          id: t.id,
          name: t.name || '未命名卡',
          sub: t.shelved ? '已下架' : ('面值 ¥' + fmtMoney(t.recharge || 0))
        };
      });
    }
    var list = [];
    if (kind === 'product' && typeof getCatalogProducts === 'function') list = getCatalogProducts();
    else if (typeof getCatalogProjects === 'function') list = getCatalogProjects();
    return (list || []).filter(function (it) { return !it.hidden; }).map(function (it) {
      return {
        id: it.id,
        name: it.name || '未命名',
        sub: '¥' + fmtMoney(it.price != null ? it.price : 0)
      };
    });
  }

  function comm2Groups(kind) {
    var groups = [];
    if (kind === 'card') {
      if (typeof ensureCardGroups === 'function') groups = (ensureCardGroups() || []).slice();
    } else if (typeof getCustomCatalogGroups === 'function') {
      groups = (getCustomCatalogGroups(kind === 'product' ? 'product' : 'project') || []).slice();
    }
    return groups;
  }

  function resolveComm2ItemMeta(kind, refId) {
    var hit = comm2Catalog(kind).find(function (it) { return it.id === refId; });
    return { name: hit ? hit.name : (refId || '未命名'), sub: hit ? hit.sub : '' };
  }

  function coveredTargetKeys(sch, excludeOvId) {
    var out = {};
    (sch.overrides || []).forEach(function (ov) {
      if (excludeOvId && ov.id === excludeOvId) return;
      if (isQuickOverride(ov)) return;
      (ov.targets || []).forEach(function (t) {
        var key;
        if (t.kind === 'group') key = 'group:' + (t.groupKind || 'project') + ':' + t.refId;
        else if (t.kind === 'card') key = 'card:' + t.refId + ':' + (t.cardRole || 'issue');
        else key = 'item:' + t.kind + ':' + t.refId;
        out[key] = (out[key] || 0) + 1;
      });
    });
    return out;
  }

  /** 其它规则项卡片中该项出现次数（不含当前编辑卡 / 系统快消） */
  function coveredTargetCount(sch, key, excludeOvId) {
    var map = coveredTargetKeys(sch, excludeOvId);
    return map[key] || 0;
  }

  function pickBelongCat(type, cardRole) {
    if (type === 'product') return 'sales';
    if (type === 'card') return cardRole === 'card' ? 'card' : 'issue';
    return 'labor';
  }

  function initPickBundle(sch) {
    var type = store._pickType || 'project';
    var belong = pickBelongCat(type, 'issue');
    var ref = sch.defaults[belong] || defaultCardBlock();
    store._pickSel = {};
    store._pickBundle = {
      targets: [],
      payScope: JSON.parse(JSON.stringify(ref.payScope)),
      baseMode: ref.baseMode,
      pickMode: ref.pickMode,
      rule: JSON.parse(JSON.stringify(ensureCat(ref.rule, getStationIds(sch)))),
      belongCat: belong,
      cardRole: 'issue'
    };
  }

  function rebuildPickTargets() {
    var b = store._pickBundle;
    if (!b) return;
    b.targets = Object.keys(store._pickSel || {}).map(function (k) { return store._pickSel[k]; });
  }

  function pickVisibleItems() {
    var type = store._pickType || 'project';
    var items = comm2Catalog(type);
    var gid = store._pickGroup;
    if (!gid || gid === 'all') return items;
    var g = comm2Groups(type).find(function (x) { return x.id === gid; });
    if (!g) return items;
    var set = {};
    (g.itemIds || []).forEach(function (id) { set[id] = true; });
    return items.filter(function (it) { return set[it.id]; });
  }

  function syncPickCount() {
    var n = store._pickBundle && store._pickBundle.targets ? store._pickBundle.targets.length : 0;
    var ok = $('comm2PickOkCount');
    if (ok) ok.textContent = n ? '（' + n + '）' : '';
    var okBtn = $('comm2PickOk');
    if (okBtn) okBtn.disabled = n === 0;
  }

  function renderPickGroups() {
    var bar = $('comm2PickGroups');
    if (!bar) return;
    var type = store._pickType || 'project';
    var groups = comm2Groups(type);
    var tabs = [{ id: 'all', name: '全部' }].concat(groups.map(function (g) { return { id: g.id, name: g.name }; }));
    var gid = store._pickGroup;
    if (gid !== 'all' && !tabs.some(function (t) { return t.id === gid; })) gid = 'all';
    store._pickGroup = gid;
    bar.classList.toggle('hidden', tabs.length <= 1);
    bar.innerHTML = '<div class="catalog-group-segment"><div class="catalog-group-scroll">' +
      tabs.map(function (t) {
        return '<button type="button" class="catalog-group-tab' + (t.id === gid ? ' on' : '') + '" data-comm2-pick-group="' + esc(t.id) + '">' +
          '<span class="catalog-group-tab__face"><span class="catalog-group-tab__label">' + esc(t.name) + '</span></span></button>';
      }).join('') +
      '</div><div class="catalog-group-fade" aria-hidden="true"></div></div>';
  }

  function pickItemBlocked(sch, type, itemId, sel) {
    sel = sel || {};
    var groups = comm2Groups(type);
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var gkey = 'group:' + type + ':' + g.id;
      if (sel[gkey] && (g.itemIds || []).indexOf(itemId) >= 0) return true;
    }
    return false;
  }

  function clearGroupsContainingItem(type, itemId) {
    comm2Groups(type).forEach(function (g) {
      if ((g.itemIds || []).indexOf(itemId) >= 0) {
        delete store._pickSel['group:' + type + ':' + g.id];
      }
    });
  }

  function clearItemsInGroup(type, groupId) {
    var g = comm2Groups(type).find(function (x) { return x.id === groupId; });
    if (!g) return;
    (g.itemIds || []).forEach(function (id) {
      delete store._pickSel['item:' + type + ':' + id];
    });
  }

  function renderPickList() {
    var list = $('comm2PickList');
    if (!list) return;
    var sch = editing();
    if (!sch) return;
    var type = store._pickType || 'project';
    var items = pickVisibleItems();
    var sel = store._pickSel || {};
    var gid = store._pickGroup;
    var html = '';
    if (gid && gid !== 'all' && type !== 'card') {
      var g = comm2Groups(type).find(function (x) { return x.id === gid; });
      if (g) {
        var gkey = 'group:' + type + ':' + g.id;
        var gOn = !!sel[gkey];
        html += '<div class="comm2-pick-item-wrap comm2-pick-group-row' + (gOn ? ' on' : '') + '">' +
          '<button type="button" class="comm2-pick-item' + (gOn ? ' on' : '') + '" data-comm2-pick-group-item="' + esc(g.id) + '">' +
          pickCheckHtml(gOn, false) +
          '<span class="comm2-pick-item__text"><span class="comm2-pick-item__name-row"><span class="comm2-pick-item__name">整类 · ' + esc(g.name) + '</span>' +
          '</span></span></button></div>';
      }
    }
    if (!items.length && !html) {
      list.innerHTML = '<p class="comm2-pick-empty">该分类下暂无内容</p>';
    } else {
      html += items.map(function (it) {
        var ikey = type === 'card'
          ? ('card:' + it.id + ':' + (store._pickBundle && store._pickBundle.cardRole || 'issue'))
          : ('item:' + type + ':' + it.id);
        var on = !!sel[ikey];
        var blocked = pickItemBlocked(sch, type, it.id, sel);
        return '<div class="comm2-pick-item-wrap' + (on ? ' on' : '') + '">' +
          '<button type="button" class="comm2-pick-item' + (on ? ' on' : '') + (blocked ? ' disabled' : '') + '" data-comm2-pick-item="' + esc(it.id) + '"' + (blocked ? ' disabled' : '') + '>' +
          pickCheckHtml(on, false) +
          '<span class="comm2-pick-item__text">' +
          '<span class="comm2-pick-item__name-row"><span class="comm2-pick-item__name">' + esc(it.name) + '</span>' +
          '</span>' +
          (it.sub ? '<span class="comm2-pick-item__sub">' + esc(it.sub) + '</span>' : '') +
          '</span></button></div>';
      }).join('');
      list.innerHTML = html;
    }
    syncPickCount();
  }

  function renderPickScreen() {
    var bundleEl = $('comm2PickBundle');
    if (bundleEl) { bundleEl.innerHTML = ''; bundleEl.classList.add('hidden'); }
    var type = store._pickType || 'project';
    var typeBar = $('comm2PickTypes');
    if (typeBar) {
      typeBar.querySelectorAll('[data-comm2-pick-type]').forEach(function (btn) {
        var on = btn.getAttribute('data-comm2-pick-type') === type;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    renderPickGroups();
    renderPickList();
  }

  function togglePickItem(id) {
    var sch = editing();
    if (!sch || !store._pickBundle) return;
    var type = store._pickType || 'project';
    var meta = resolveComm2ItemMeta(type, id);
    var key = type === 'card'
      ? ('card:' + id + ':' + store._pickBundle.cardRole)
      : ('item:' + type + ':' + id);
    if (store._pickSel[key]) delete store._pickSel[key];
    else {
      clearGroupsContainingItem(type, id);
      store._pickSel[key] = type === 'card'
        ? { kind: 'card', refId: id, name: meta.name, cardRole: store._pickBundle.cardRole }
        : { kind: type, refId: id, name: meta.name };
    }
    rebuildPickTargets();
    store._pickBundle.belongCat = pickBelongCat(type, store._pickBundle.cardRole);
    renderPickScreen();
  }

  function togglePickGroup(groupId) {
    var sch = editing();
    if (!sch || !store._pickBundle) return;
    var type = store._pickType || 'project';
    var g = comm2Groups(type).find(function (x) { return x.id === groupId; });
    if (!g) return;
    var key = 'group:' + type + ':' + groupId;
    if (store._pickSel[key]) delete store._pickSel[key];
    else {
      clearItemsInGroup(type, groupId);
      store._pickSel[key] = { kind: 'group', refId: groupId, name: g.name, groupKind: type };
    }
    rebuildPickTargets();
    store._pickBundle.belongCat = type === 'product' ? 'sales' : 'labor';
    renderPickScreen();
  }

  function closeRulePick() {
    store._pickSel = {};
    store._pickBundle = null;
    store._sheetContext = null;
    store._editOverrideId = null;
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    openEdit(store.editingId);
  }

  function openRulePick() {
    var sch = editing();
    if (!sch) return;
    store._editOverrideId = null;
    store._pickType = 'project';
    store._pickGroup = 'all';
    store._sheetContext = null;
    initPickBundle(sch);
    var t = $('comm2PickScreenTitle');
    if (t) t.textContent = '添加规则项';
    renderPickScreen();
    show('screen-comm2-pick');
    goNav('comm2-pick');
  }

  function requestOverrideDelete(id) {
    softDeleteOverride(id);
  }

  var RULE_UNDO_MS = 2500;
  var _undoToastTimer = null;

  function hideUndoToast() {
    var el = $('toastMsg');
    if (!el) return;
    el.classList.remove('show', 'is-undo');
    el.innerHTML = '';
  }

  function showDeleteUndoToast() {
    var el = $('toastMsg');
    if (!el) {
      toast('已删除规则项');
      return;
    }
    el.innerHTML = '<span>已删除规则项</span><button type="button" class="comm2-toast-undo" id="comm2ToastUndo">撤销</button>';
    el.classList.add('show', 'is-undo');
    el.classList.remove('is-multiline');
    clearTimeout(_undoToastTimer);
    _undoToastTimer = setTimeout(function () {
      hideUndoToast();
      store._undoOverride = null;
    }, RULE_UNDO_MS);
    var btn = $('comm2ToastUndo');
    if (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        undoOverrideDelete();
      };
    }
  }

  function softDeleteOverride(id) {
    var sch = editing();
    if (!sch || !id) return;
    var list = sch.overrides || [];
    var idx = -1;
    var hit = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { idx = i; hit = list[i]; break; }
    }
    if (!hit) return;
    if (isQuickOverride(hit)) { toast('系统规则不可删除', true); return; }
    closeAllRuleSwipes();
    sch.overrides = list.slice(0, idx).concat(list.slice(idx + 1));
    store._undoOverride = null;
    markDirty();
    renderEditCards(sch);
    toast('已删除规则项');
  }

  function requestDeleteOverride(id) {
    var sch = editing();
    if (!sch || !id) return;
    var hit = (sch.overrides || []).find(function (o) { return o.id === id; });
    if (!hit) return;
    if (isQuickOverride(hit)) { toast('系统规则不可删除', true); return; }
    closeAllRuleSwipes();
    store._overrideDelId = id;
    openDialog('comm2OverrideDelMask');
  }

  /** 工位改名全局同步；不可新增 */
  function applyStationsGlobal(stationIds, stationLabels) {
    function applyOne(sch) {
      if (!sch) return;
      sch.stationIds = stationIds.slice();
      sch.stationLabels = JSON.parse(JSON.stringify(stationLabels || {}));
      function ensureBlock(b) {
        if (!b) return;
        b.rule = ensureCat(b.rule, stationIds);
      }
      COMM2_CATS.forEach(function (c) { ensureBlock(sch.defaults && sch.defaults[c.key]); });
      (sch.overrides || []).forEach(ensureBlock);
    }
    applyOne(store._draft);
    (store.schemes || []).forEach(applyOne);
  }

  function commitStationRename(sid, name) {
    var sch = editing();
    if (!sch || !sid) return;
    name = String(name || '').trim();
    if (!name) { toast('名称不能为空', true); return; }
    if (titleCharCount(name) > 6) { toast('工位名最多 6 个字', true); return; }
    if (!sch.stationLabels) sch.stationLabels = defaultStationLabels();
    if (!sch.stationLabels[sid]) sch.stationLabels[sid] = {};
    sch.stationLabels[sid].label = name;
    store._stationInlineEditId = null;
    applyStationsGlobal(getStationIds(sch), sch.stationLabels);
    markDirty();
    renderEditCards(sch);
    maybeRefreshOpenCardSheet();
  }

  function undoOverrideDelete() {
    var u = store._undoOverride;
    var sch = editing();
    clearTimeout(_undoToastTimer);
    hideUndoToast();
    store._undoOverride = null;
    if (!u || !sch || sch.id !== u.schemeId || !u.ov) return;
    var list = sch.overrides || (sch.overrides = []);
    var at = Math.min(Math.max(0, u.index), list.length);
    list.splice(at, 0, u.ov);
    markDirty();
    renderEditCards(sch);
    toast('已撤销删除');
  }

  function closeRuleCardMenus() {
    document.querySelectorAll('.comm2-rule-bar.is-menu-open').forEach(function (el) {
      el.classList.remove('is-menu-open');
    });
    document.querySelectorAll('.comm2-rule-swipe-wrap.is-menu-host, .comm2-rule-swipe.is-menu-host').forEach(function (el) {
      el.classList.remove('is-menu-host');
    });
  }

  function setRuleSwipeX(swipe, x, dragging) {
    if (!swipe) return;
    var wrap = swipe.closest('.comm2-rule-swipe-wrap') || swipe;
    var max = 72;
    var clamped = Math.max(-max, Math.min(0, x));
    if (dragging) wrap.classList.add('is-dragging');
    else wrap.classList.remove('is-dragging');
    swipe.style.transform = clamped ? ('translateX(' + clamped + 'px)') : '';
  }

  function snapRuleSwipe(swipe, open) {
    if (!swipe) return;
    var wrap = swipe.closest('.comm2-rule-swipe-wrap');
    swipe.classList.remove('is-dragging');
    if (wrap) wrap.classList.remove('is-dragging');
    swipe.style.transition = 'transform .22s cubic-bezier(.22,.82,.24,1)';
    if (open) {
      swipe.style.transform = 'translateX(-72px)';
      if (wrap) wrap.classList.add('is-open');
    } else {
      swipe.style.transform = '';
      if (wrap) wrap.classList.remove('is-open');
    }
    setTimeout(function () { swipe.style.transition = ''; }, 220);
  }

  function closeAllRuleSwipes(except) {
    document.querySelectorAll('.comm2-rule-swipe-wrap, .comm2-rule-swipe').forEach(function (el) {
      if (el === except || (except && el.contains(except))) return;
      var swipe = el.classList.contains('comm2-rule-swipe') ? el : el.querySelector('.comm2-rule-swipe');
      if (swipe) snapRuleSwipe(swipe, false);
    });
  }

  function flyOutAndDelete(swipe) {
    /* 改为吸附露出垃圾桶，由点击垃圾桶确认删除 */
    snapRuleSwipe(swipe, true);
  }

  function wireRuleCardGestures() {
    var root = $('comm2EditCards');
    if (!root || root._ruleGesturesWired) return;
    root._ruleGesturesWired = true;
    var st = null;

    function endGesture(e) {
      if (!st) return;
      var gesture = st;
      var doClick = !gesture.swiping && gesture.target && !(e && e.type === 'pointercancel');
      if (gesture.swiping && gesture.swipe && !gesture.swipe.classList.contains('is-exiting')) {
        var shouldOpen = gesture.dx <= -48 || (gesture.dx < -24 && gesture.vx < -0.35);
        var swipeEl = gesture.swipe;
        var moved = gesture.moved;
        snapRuleSwipe(swipeEl, shouldOpen);
        if (moved) store._gestureConsumed = true;
      }
      st = null;
      if (doClick) {
        try {
          gesture.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (err) { /* ignore */ }
      }
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('[data-comm2-swipe-del]')) {
        return;
      }
      var wrap = e.target.closest('.comm2-rule-swipe-wrap');
      var swipe = wrap ? wrap.querySelector('.comm2-rule-swipe') : e.target.closest('.comm2-rule-swipe');
      var card = e.target.closest('.comm2-rule-bar.is-override');
      if (!swipe && !card) {
        closeRuleCardMenus();
        closeAllRuleSwipes();
        return;
      }
      closeRuleCardMenus();
      st = {
        swipe: swipe,
        card: card || (swipe && swipe.querySelector('.comm2-rule-bar')),
        target: e.target,
        x0: e.clientX,
        y0: e.clientY,
        t0: Date.now(),
        dx: 0,
        vx: 0,
        moved: false,
        swiping: false,
        lastX: e.clientX,
        lastT: Date.now()
      };
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    root.addEventListener('pointermove', function (e) {
      if (!st) return;
      var dx = e.clientX - st.x0;
      var dy = e.clientY - st.y0;
      var now = Date.now();
      var dt = Math.max(1, now - st.lastT);
      st.vx = (e.clientX - st.lastX) / dt;
      st.lastX = e.clientX;
      st.lastT = now;
      st.dx = dx;
      if (!st.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        st.moved = true;
      }
      if (!st.swipe) return;
      if (!st.swiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        st.swiping = true;
        closeRuleCardMenus();
        closeAllRuleSwipes(st.swipe);
      }
      if (st.swiping) {
        setRuleSwipeX(st.swipe, dx, true);
      }
    });

    root.addEventListener('pointerup', endGesture);
    root.addEventListener('pointercancel', endGesture);
    root.addEventListener('contextmenu', function (e) {
      if (e.target.closest('.comm2-rule-bar.is-override, .comm2-rule-swipe')) {
        e.preventDefault();
      }
    });

    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest('#comm2EditCards, #comm2OverrideDelMask')) {
        return;
      }
      closeRuleCardMenus();
      closeAllRuleSwipes();
    }, true);
  }

  function confirmOverrideDelete() {
    var sch = editing();
    closeDialog('comm2OverrideDelMask');
    if (!sch || !store._overrideDelId) return;
    var delId = store._overrideDelId;
    var hit = (sch.overrides || []).find(function (o) { return o.id === delId; });
    if (isQuickOverride(hit)) {
      store._overrideDelId = null;
      toast('系统规则不可删除', true);
      return;
    }
    sch.overrides = (sch.overrides || []).filter(function (o) { return o.id !== delId; });
    store._overrideDelId = null;
    markDirty();
    renderEditCards(sch);
    toast('已删除规则项');
  }

  function scrubStationFromBlocks(sch, id) {
    function scrubBlock(b) {
      if (b && b.rule && b.rule.stations) delete b.rule.stations[id];
    }
    COMM2_CATS.forEach(function (c) { scrubBlock(sch.defaults[c.key]); });
    (sch.overrides || []).forEach(scrubBlock);
  }

  function renderStationSheet() {
    var sch = editing();
    var root = $('comm2StationSheet');
    if (!sch || !root) return;
    var ids = getStationIds(sch);
    var html = '';
    ids.forEach(function (sid) {
      if (store._stationEditId === sid) {
        html += '<div class="comm2-station-sheet-edit">' +
          '<input type="text" maxlength="6" data-comm2-station-input="' + esc(sid) + '" value="' + esc(stationLabel(sch, sid)) + '" />' +
          '<div class="comm2-station-sheet-edit__acts">' +
          '<button type="button" class="comm2-station-sheet-edit__reset" data-comm2-station-reset="' + esc(sid) + '"' + (isStationDefault(sch, sid) ? ' disabled' : '') + '>恢复为默认</button>' +
          '<button type="button" class="comm2-station-sheet-edit__ok" data-comm2-station-ok="' + esc(sid) + '">确定</button></div></div>';
      } else {
        html += '<div class="comm2-station-sheet-row">' +
          '<span class="comm2-station-sheet-row__name">' + esc(stationLabel(sch, sid)) + '</span>' +
          '<span class="comm2-station-sheet-row__acts">' +
          '<button type="button" data-comm2-rename="' + esc(sid) + '">改名</button>' +
          '</span></div>';
      }
    });
    root.innerHTML = html;
    var add = $('comm2StationAdd');
    if (add) {
      add.hidden = true;
      add.disabled = true;
    }
  }

  function openStationSheet() {
    store._stationEditId = null;
    renderStationSheet();
    openSheet('comm2StationMask');
  }

  function deleteStationRow(id) {
    var sch = editing();
    if (!sch || getStationIds(sch).length <= 1) return;
    if (!confirm('删除后，各规则卡上该工位的提成参数将一并清除，确定删除？')) return;
    sch.stationIds = sch.stationIds.filter(function (x) { return x !== id; });
    if (sch.stationLabels[id]) delete sch.stationLabels[id];
    scrubStationFromBlocks(sch, id);
    store._stationEditId = null;
    markDirty();
    renderStationSheet();
    renderEditCards(sch);
    maybeRefreshOpenCardSheet();
    toast('已删除工位');
  }

  function wire() {
    if (wire._done) return;
    wire._done = true;

    $('comm2ListBack') && $('comm2ListBack').addEventListener('click', backWb);
    $('comm2EditBack') && $('comm2EditBack').addEventListener('click', requestComm2Exit);
    $('comm2UnassignedTip') && $('comm2UnassignedTip').addEventListener('click', openUnassignedDialog);
    $('comm2UnassignedOk') && $('comm2UnassignedOk').addEventListener('click', function () { closeDialog('comm2UnassignedMask'); });
    $('comm2UnassignedMask') && $('comm2UnassignedMask').addEventListener('click', function (e) {
      if (e.target === $('comm2UnassignedMask')) closeDialog('comm2UnassignedMask');
    });
    $('comm2HelpBtn') && $('comm2HelpBtn').addEventListener('click', function () { openDialog('comm2HelpMask'); });
    $('comm2HelpOk') && $('comm2HelpOk').addEventListener('click', function () { closeDialog('comm2HelpMask'); });
    $('comm2MigrateMatchOk') && $('comm2MigrateMatchOk').addEventListener('click', function () { closeDialog('comm2MigrateMatchMask'); });
    $('comm2MigrateDiffLater') && $('comm2MigrateDiffLater').addEventListener('click', function () { closeDialog('comm2MigrateDiffMask'); });
    $('comm2MigrateDiffRecreate') && $('comm2MigrateDiffRecreate').addEventListener('click', function () {
      closeDialog('comm2MigrateDiffMask');
      openComm2NameDialog('create');
    });
    $('comm2HelpMask') && $('comm2HelpMask').addEventListener('click', function (e) {
      if (e.target === $('comm2HelpMask')) closeDialog('comm2HelpMask');
    });
    /* 方案编辑页标题右侧 ⓘ：提成怎么设、钱怎么算（PRD §6.9） */
    $('comm2EditHelpBtn') && $('comm2EditHelpBtn').addEventListener('click', function () { openDialog('comm2RuleHelpMask'); });
    $('comm2RuleHelpOk') && $('comm2RuleHelpOk').addEventListener('click', function () { closeDialog('comm2RuleHelpMask'); });
    $('comm2RuleHelpMask') && $('comm2RuleHelpMask').addEventListener('click', function (e) {
      if (e.target === $('comm2RuleHelpMask')) closeDialog('comm2RuleHelpMask');
    });
    /* 规则 Sheet 行标签后的 ⓘ：计算基数说明 / 分配模式说明（PRD §6.9，由 #comm2CatSheetBody 委派触发） */
    $('comm2BaseHelpOk') && $('comm2BaseHelpOk').addEventListener('click', function () { closeDialog('comm2BaseHelpMask'); });
    $('comm2BaseHelpMask') && $('comm2BaseHelpMask').addEventListener('click', function (e) {
      if (e.target === $('comm2BaseHelpMask')) closeDialog('comm2BaseHelpMask');
    });
    $('comm2PickHelpOk') && $('comm2PickHelpOk').addEventListener('click', function () { closeDialog('comm2PickHelpMask'); });
    $('comm2PickHelpMask') && $('comm2PickHelpMask').addEventListener('click', function (e) {
      if (e.target === $('comm2PickHelpMask')) closeDialog('comm2PickHelpMask');
    });
    $('comm2BtnAdd') && $('comm2BtnAdd').addEventListener('click', function () {
      openComm2NameDialog('create', null);
    });
    $('comm2BtnSave') && $('comm2BtnSave').addEventListener('click', function () {
      var sch = editing();
      if (!sch) return;
      var badCat = COMM2_CATS.find(function (c) { return payScopeCountBlock(sch.defaults[c.key]) < 1; });
      if (badCat) { toast('「' + badCat.label + '」至少选一种支付方式', true); return; }
      var badOv = (sch.overrides || []).find(function (o) { return payScopeCountBlock(o) < 1; });
      if (badOv) { toast((isQuickOverride(badOv) ? '「快捷开单」' : ('覆盖规则「' + (badOv.title || '未命名') + '」')) + '至少选一种支付方式', true); return; }
      /* 二十六次：已分配员工 + 改动影响金额 → 先问「本期提成怎么算」，选定后才落库 */
      var before = (store._snapshot && store._snapshot.id === sch.id) ? store._snapshot : null;
      if ((sch.assigneeIds || []).length > 0 && before && schemeMoneyChanged(before, sch)) {
        openRecalcDialog(sch, before);
        return;
      }
      commitSchemeSave();
    });

    /* 二十六次：改动重算弹窗 —— 点选即换（不关闭），「确定」才落库；遮罩/Esc 一律无效 */
    $('comm2RecalcOpts') && $('comm2RecalcOpts').addEventListener('click', function (e) {
      var hit = e.target.closest('[data-comm2-recalc]');
      if (!hit) return;
      recalcState.mode = hit.getAttribute('data-comm2-recalc');
      $('comm2RecalcOpts').innerHTML = recalcOptsHtml();
    });
    $('comm2RecalcOk') && $('comm2RecalcOk').addEventListener('click', function () {
      var sch = recalcState.sch;
      if (!sch) { closeDialog('comm2RecalcMask'); return; }
      applyEffectiveChoice(sch, recalcState.mode, recalcState.before);
      closeDialog('comm2RecalcMask');
      recalcState.sch = null;
      recalcState.before = null;
      commitSchemeSave();
    });

    $('comm2EditCards') && $('comm2EditCards').addEventListener('click', function (e) {
      var swipeDel = e.target.closest('[data-comm2-swipe-del]');
      if (swipeDel) {
        e.preventDefault(); e.stopPropagation();
        requestDeleteOverride(swipeDel.getAttribute('data-comm2-swipe-del'));
        return;
      }
      if (store._gestureConsumed) {
        store._gestureConsumed = false;
        e.preventDefault(); e.stopPropagation();
        return;
      }
      var baseHit = e.target.closest('[data-comm2-card-base]');
      if (baseHit) {
        e.preventDefault(); e.stopPropagation();
        setCardBase(baseHit.closest('[data-comm2-rule-card]').getAttribute('data-comm2-rule-card'), baseHit.getAttribute('data-comm2-card-base'));
        return;
      }
      var scopeHit = e.target.closest('[data-comm2-card-scope]');
      if (scopeHit) {
        e.preventDefault(); e.stopPropagation();
        toggleCardScope(scopeHit.closest('[data-comm2-rule-card]').getAttribute('data-comm2-rule-card'), scopeHit.getAttribute('data-comm2-card-scope'));
        return;
      }
      var openBtn = e.target.closest('[data-comm2-card-open]');
      if (openBtn) {
        e.preventDefault(); e.stopPropagation();
        openCardSheet(openBtn.getAttribute('data-comm2-card-open'), { variant: 'full' });
      }
    });
    $('comm2EditCards') && $('comm2EditCards').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      /* 卡上控件自行处理键盘激活，勿再打开 Sheet */
      if (e.target.closest('[data-comm2-card-base]') || e.target.closest('[data-comm2-card-scope]')) return;
      var openBtn = e.target.closest('[data-comm2-card-open]');
      if (!openBtn) return;
      e.preventDefault();
      openCardSheet(openBtn.getAttribute('data-comm2-card-open'), { variant: 'full' });
    });

    wireRuleCardGestures();

    $('comm2BtnAddRule') && $('comm2BtnAddRule').addEventListener('click', openRulePick);

    $('comm2List') && $('comm2List').addEventListener('click', function (e) {
      var open = e.target.closest('[data-comm2-open]');
      if (open) { openEdit(open.getAttribute('data-comm2-open')); return; }
      var assign = e.target.closest('[data-comm2-assign]');
      if (assign) { openComm2Assign(assign.getAttribute('data-comm2-assign')); return; }
      var menu = e.target.closest('[data-comm2-menu]');
      if (menu) openComm2Menu(menu.getAttribute('data-comm2-menu'));
    });

    /* 方案卡更多菜单 */
    $('comm2MenuMask') && $('comm2MenuMask').addEventListener('click', function (e) {
      if (e.target === $('comm2MenuMask')) { closeSheet('comm2MenuMask'); return; }
      var act = e.target.closest('[data-comm2-menu-act]');
      if (!act) return;
      var kind = act.getAttribute('data-comm2-menu-act');
      var id = store._menuId;
      if (kind === 'cancel') { closeSheet('comm2MenuMask'); return; }
      closeSheet('comm2MenuMask');
      if (kind === 'rename') openComm2NameDialog('rename', id);
      else if (kind === 'copy') copyComm2Scheme(id);
      else if (kind === 'delete') requestComm2Delete(id);
    });

    /* 命名弹窗（新建 / 重命名） */
    $('comm2NameCancel') && $('comm2NameCancel').addEventListener('click', function () {
      var input = $('comm2NameInput');
      if (input) {
        input.setAttribute('maxlength', '20');
        input.placeholder = '请输入方案名称';
      }
      closeDialog('comm2NameMask');
    });
    $('comm2NameOk') && $('comm2NameOk').addEventListener('click', applyComm2Name);
    $('comm2NameMask') && $('comm2NameMask').addEventListener('click', function (e) {
      if (e.target === $('comm2NameMask')) {
        var input = $('comm2NameInput');
        if (input) {
          input.setAttribute('maxlength', '20');
          input.placeholder = '请输入方案名称';
        }
        closeDialog('comm2NameMask');
      }
    });

    /* 删除确认 */
    $('comm2DeleteCancel') && $('comm2DeleteCancel').addEventListener('click', function () { closeDialog('comm2DeleteMask'); });
    $('comm2DeleteOk') && $('comm2DeleteOk').addEventListener('click', confirmComm2Delete);
    $('comm2DeleteMask') && $('comm2DeleteMask').addEventListener('click', function (e) {
      if (e.target === $('comm2DeleteMask')) closeDialog('comm2DeleteMask');
    });

    /* 未保存返回拦截 */
    $('comm2UnsavedCancel') && $('comm2UnsavedCancel').addEventListener('click', function () { closeDialog('comm2UnsavedMask'); });
    $('comm2UnsavedOk') && $('comm2UnsavedOk').addEventListener('click', function () {
      closeDialog('comm2UnsavedMask');
      leaveComm2Edit();
    });
    $('comm2UnsavedMask') && $('comm2UnsavedMask').addEventListener('click', function (e) {
      if (e.target === $('comm2UnsavedMask')) closeDialog('comm2UnsavedMask');
    });

    /* 分配员工 sheet（可多方案；副文用 file-multiple 图标 + 方案名） */
    $('comm2AssignList') && $('comm2AssignList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-comm2-assign-tog]');
      if (!btn) return;
      var id = btn.getAttribute('data-comm2-assign-tog');
      if (!store._assignSel) store._assignSel = {};
      store._assignSel[id] = !store._assignSel[id];
      renderComm2Assign();
    });
    $('comm2AssignSelectAll') && $('comm2AssignSelectAll').addEventListener('click', function () {
      if (!store._assignSel) store._assignSel = {};
      comm2StaffPool().forEach(function (s) {
        store._assignSel[s.id] = true;
      });
      renderComm2Assign();
    });
    $('comm2AssignClear') && $('comm2AssignClear').addEventListener('click', function () {
      store._assignSel = {};
      renderComm2Assign();
    });
    $('comm2AssignCancel') && $('comm2AssignCancel').addEventListener('click', function () { closeSheet('comm2AssignMask'); });
    $('comm2AssignOk') && $('comm2AssignOk').addEventListener('click', applyComm2Assign);
    $('comm2AssignMask') && $('comm2AssignMask').addEventListener('click', function (e) {
      if (e.target === $('comm2AssignMask')) closeSheet('comm2AssignMask');
    });

    $('comm2OverrideDelCancel') && $('comm2OverrideDelCancel').addEventListener('click', function () { closeDialog('comm2OverrideDelMask'); });
    $('comm2OverrideDelOk') && $('comm2OverrideDelOk').addEventListener('click', confirmOverrideDelete);
    $('comm2OverrideDelMask') && $('comm2OverrideDelMask').addEventListener('click', function (e) {
      if (e.target === $('comm2OverrideDelMask')) closeDialog('comm2OverrideDelMask');
    });

    $('comm2StationOk') && $('comm2StationOk').addEventListener('click', function () { closeSheet('comm2StationMask'); });
    $('comm2StationSheet') && $('comm2StationSheet').addEventListener('click', function (e) {
      var sch = editing();
      if (!sch) return;
      if (store._stationEditId != null) {
        var inEdit = e.target.closest('.comm2-station-sheet-edit');
        var renEarly = e.target.closest('[data-comm2-rename]');
        if (!inEdit && !renEarly) {
          store._stationEditId = null;
          renderStationSheet();
          return;
        }
      }
      var ren = e.target.closest('[data-comm2-rename]');
      if (ren) { store._stationEditId = ren.getAttribute('data-comm2-rename'); renderStationSheet(); return; }
      var ok = e.target.closest('[data-comm2-station-ok]');
      if (ok) {
        var okId = ok.getAttribute('data-comm2-station-ok');
        var input = document.querySelector('[data-comm2-station-input="' + okId + '"]');
        var val = input ? input.value.trim() : '';
        commitStationRename(okId, val);
        store._stationEditId = null;
        renderStationSheet();
        return;
      }
      var rst = e.target.closest('[data-comm2-station-reset]');
      if (rst && !rst.disabled) {
        var rstId = rst.getAttribute('data-comm2-station-reset');
        if (sch.stationLabels[rstId]) delete sch.stationLabels[rstId].label;
        store._stationEditId = null;
        applyStationsGlobal(getStationIds(sch), sch.stationLabels);
        markDirty();
        renderStationSheet();
        renderEditCards(sch);
        maybeRefreshOpenCardSheet();
        return;
      }
    });
    $('comm2StationSheet') && $('comm2StationSheet').addEventListener('focusin', function (e) {
      var input = e.target.closest('[data-comm2-station-input]');
      if (input) input.select();
    });

    $('comm2CatSheetBody') && $('comm2CatSheetBody').addEventListener('click', function (e) {
      var scopeBtn = e.target.closest('[data-comm2-sheet-scope]');
      if (scopeBtn) { toggleSheetScope(scopeBtn.getAttribute('data-comm2-sheet-scope')); return; }
      var baseBtn = e.target.closest('[data-comm2-sheet-base]');
      if (baseBtn) { setSheetBase(baseBtn.getAttribute('data-comm2-sheet-base')); return; }
      var pickBtn = e.target.closest('[data-comm2-sheet-pick]');
      if (pickBtn) {
        setSheetPick(pickBtn.getAttribute('data-comm2-sheet-pick'));
        return;
      }
      var stEdit = e.target.closest('[data-comm2-station-inline-edit]');
      if (stEdit) {
        store._stationInlineEditId = stEdit.getAttribute('data-comm2-station-inline-edit');
        refreshCardSheetBody();
        setTimeout(function () {
          var input = document.querySelector('[data-comm2-station-inline-input]');
          if (input) { input.focus(); input.select(); }
        }, 30);
        return;
      }
      var cardRoleBtn = e.target.closest('[data-comm2-sheet-card-role]');
      if (cardRoleBtn) { setSheetCardRole(cardRoleBtn.getAttribute('data-comm2-sheet-card-role')); return; }
      var guestBtn = e.target.closest('[data-comm2-extra]');
      if (guestBtn) {
        setSheetExtraSplit(guestBtn.getAttribute('data-comm2-extra') === 'on');
        return;
      }
      var modeToggle = e.target.closest('[data-comm2-cap-mode]');
      if (modeToggle) {
        toggleCapValueMode(modeToggle.getAttribute('data-comm2-cap-mode'));
        return;
      }
      /* 行标签后的 ⓘ：Sheet 重渲染后仍可点击（说明弹窗浮在 Sheet 之上，不关 Sheet） */
      var helpBtn = e.target.closest('[data-comm2-sheet-help]');
      if (helpBtn) {
        var helpKey = helpBtn.getAttribute('data-comm2-sheet-help');
        if (helpKey === 'base') openDialog('comm2BaseHelpMask');
        else if (helpKey === 'pick') openDialog('comm2PickHelpMask');
        return;
      }
    });
    $('comm2CatSheetBody') && $('comm2CatSheetBody').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var renameInput = e.target.closest('[data-comm2-station-inline-input]');
      if (renameInput) {
        e.preventDefault();
        commitStationRename(renameInput.getAttribute('data-comm2-station-inline-input'), renameInput.value);
      }
    });
    $('comm2CatSheetBody') && $('comm2CatSheetBody').addEventListener('focusout', function (e) {
      var renameInput = e.target.closest('[data-comm2-station-inline-input]');
      if (renameInput) {
        setTimeout(function () {
          if (store._stationInlineEditId !== renameInput.getAttribute('data-comm2-station-inline-input')) return;
          commitStationRename(renameInput.getAttribute('data-comm2-station-inline-input'), renameInput.value);
        }, 80);
      }
    });

    /* 金额键盘改动比例值后，同步输入框宽度（% 紧贴数值） */
    function onCapFieldValueChange(e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('input-amount')) return;
      if (!t.closest || !t.closest('.comm2-cap__field')) return;
      syncCapFieldWidth(t);
    }
    document.addEventListener('input', onCapFieldValueChange);
    document.addEventListener('change', onCapFieldValueChange);

    $('comm2CatSheetCancel') && $('comm2CatSheetCancel').addEventListener('click', closeCatSheet);
    $('comm2CatSheetOk') && $('comm2CatSheetOk').addEventListener('click', saveCatSheet);
    $('comm2CatSheetMask') && $('comm2CatSheetMask').addEventListener('click', function (e) {
      if (e.target === $('comm2CatSheetMask')) closeCatSheet();
    });

    $('comm2PickBack') && $('comm2PickBack').addEventListener('click', closeRulePick);
    $('comm2PickCancel') && $('comm2PickCancel').addEventListener('click', closeRulePick);
    $('comm2PickOk') && $('comm2PickOk').addEventListener('click', openPickSettingsSheet);
    $('comm2PickTypes') && $('comm2PickTypes').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-comm2-pick-type]');
      if (!btn) return;
      var sch = editing();
      if (!sch) return;
      store._pickType = btn.getAttribute('data-comm2-pick-type');
      store._pickGroup = 'all';
      initPickBundle(sch);
      renderPickScreen();
    });
    $('comm2PickGroups') && $('comm2PickGroups').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-comm2-pick-group]');
      if (!btn) return;
      store._pickGroup = btn.getAttribute('data-comm2-pick-group');
      renderPickScreen();
    });
    $('comm2PickList') && $('comm2PickList').addEventListener('click', function (e) {
      var gbtn = e.target.closest('[data-comm2-pick-group-item]');
      if (gbtn) { togglePickGroup(gbtn.getAttribute('data-comm2-pick-group-item')); return; }
      var itemBtn = e.target.closest('[data-comm2-pick-item]');
      if (itemBtn && !itemBtn.disabled) togglePickItem(itemBtn.getAttribute('data-comm2-pick-item'));
    });
  }

  window.Comm2Demo = {
    openList: openList,
    openEdit: openEdit,
    wire: wire,
    closeCatSheet: closeCatSheet,
    calcStaffTrial: calcStaffTrial,
    getSchemes: function () { return store.schemes; },
    getTrialLines: function () { return COMM2_TRIAL_LINES; },
    schemesForStaff: schemesForStaff,
    notifySalarySync: function () {
      if (window.EmployeeDemo && typeof window.EmployeeDemo.invalidateCommLineCache === 'function') {
        window.EmployeeDemo.invalidateCommLineCache();
      }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();


/* ==========================================================================
 * 关联页面 · 选择服务员工（提成设置 → 开单侧选人 UI/UX）
 *
 * 四态采集（对照 §4.5.1 / §6.7.1，整行勾选卡 · 十七次口径）：
 *   按工位+开顾客指定 → 整行 4 张：大工/中工/小工 +「顾客指定」
 *                        （工位之间**单选、可点掉、可全不选**；「顾客指定」**独立**可勾选，
 *                          不要求先选工位 —— 只勾它 = 只发顾客指定提成）
 *   按工位+未开       → 整行 3 张工位卡（单选）
 *   不分工位+开       → 整行 2 张：「提成」/「顾客指定」（**可叠加**，也可只勾「顾客指定」）
 *   不分工位+未开     → 点选即勾选（无展开、无勾选卡）
 * 「提成侧」与「顾客指定侧」两组参数**各自独立、可单选可叠加**；两侧都不勾 = 未选（唯一取消路径）。
 * 勾选后收缩为员工卡：显示摘要 + 右侧放大勾选控件（点它取消选择）；右上角 × 已删除
 * 动效：iOS 向 spring（cubic-bezier(.34,1.3,.64,1)）+ 按下 scale(.96) + vibrate(8)
 * ======================================================================== */
(function () {
  'use strict';

  var SP_CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  var SP_CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';

  var SP_SCHEME_DEFAULT = 'c2_flagship';
  var SP_ROLE_IDS = ['junior', 'mid', 'senior'];
  var SP_ROLE_DEFAULT = 'senior';
  var SP_GRID_GAP = 8;
  var SP_SPRING = 'cubic-bezier(.34,1.3,.64,1)';    /* iOS spring：展开 Morph */
  var SP_EASE_STD = 'cubic-bezier(.22,.82,.24,1)';  /* Apple 标准：收起 Morph（A2） */
  var SP_EXPAND_MS = 380;
  var SP_COLLAPSE_FALLBACK_MS = 220;              /* 与 CSS `--sp-collapse` 同源，读不到时兜底 */

  var SP_FALLBACK_STAFFS = [
    { id: 'st0', name: '顾清扬', short: '顾', role: '店主', avatar: 'assets/emp-avatars/man-e.jpg' },
    { id: 'st1', name: '林屿森', short: '森', role: '美容师', avatar: 'assets/emp-avatars/man-a.jpg' },
    { id: 'st2', name: '何苏叶', short: '叶', role: '店长', avatar: 'assets/emp-avatars/woman-a.jpg' },
    { id: 'st3', name: '阿Ken', short: 'Ken', role: '美容师', avatar: 'assets/emp-avatars/man-b.jpg' },
    { id: 'st4', name: 'Lisa', short: 'Lisa', role: '美甲师', avatar: 'assets/emp-avatars/woman-b.jpg' }
  ];

  var spSchemeId = SP_SCHEME_DEFAULT;

  var spState = {
    mode: 'station',
    extraSplit: true,
    edit: null,
    /* 本次交互**真的选中**了哪些员工 → 下一次渲染才播「回弹」（`is-pop`）；
       spAfterStaffPickerPaint 渲染后即清空，避免无关重绘（如再选别人）时重播 */
    freshDone: {},
    row: { id: '__comm2sp__', staffIds: [], staffRoles: {}, staffExtra: {}, staffChosen: {} }
  };

  var spVibrate = 8;

  function spEl(id) { return document.getElementById(id); }
  function spEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function spHaptic() {
    try { if (navigator.vibrate) navigator.vibrate(spVibrate); } catch (e) { /* ignore */ }
  }
  function spReduceMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function spScheme() {
    var list = (window.Comm2Demo && typeof window.Comm2Demo.getSchemes === 'function')
      ? window.Comm2Demo.getSchemes() : null;
    if (!list || !list.length) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === spSchemeId) return list[i];
    }
    return list[0];
  }
  function spStationLabel(roleId) {
    var sch = spScheme();
    var hit = sch && sch.stationLabels ? sch.stationLabels[roleId] : null;
    if (hit) {
      var label = typeof hit === 'string' ? hit : hit.label;
      if (label) return String(label);
    }
    if (roleId === 'senior') return '大工';
    if (roleId === 'mid') return '中工';
    if (roleId === 'junior') return '小工';
    return roleId;
  }
  function spStationLabelsJoined() {
    return spStationIds().map(spStationLabel).filter(Boolean).join('/');
  }
  /** 工位顺序：以方案 stationIds 为准（大工 / 中工 / 小工） */
  function spStationIds() {
    var sch = spScheme();
    if (sch && sch.stationIds && sch.stationIds.length) return sch.stationIds.slice();
    return ['senior', 'mid', 'junior'];
  }
  function spStaffPool() {
    var shared = (window.EmployeeDemo && typeof window.EmployeeDemo.getBillingStaffPool === 'function')
      ? window.EmployeeDemo.getBillingStaffPool() : null;
    if (shared && shared.length) {
      var seen = {};
      shared.forEach(function (s) { seen[s.id] = true; });
      return shared.concat(SP_FALLBACK_STAFFS.filter(function (s) { return !seen[s.id]; }));
    }
    return SP_FALLBACK_STAFFS.slice();
  }

  /* 提成侧在选人状态里的编码：`staffRoles[sid]` 统一存「**提成侧选择**」——
     按工位 = **工位 id 数组**（可多选，按 `stationIds` 序）；不分工位 = `[SP_PICK_AVG]`（哨兵，「提成」卡）。
     旧数据若仍是单值字符串，`spEnsureState` / `spRolesOf` 会自动包成数组。 */
  var SP_PICK_AVG = 'avg';

  /** 读提成侧选择为数组；旧单值字符串兼容包成 `[id]`；空 / 非法 → `[]` */
  function spRolesOf(sid) {
    var v = spState.row.staffRoles[sid];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === 'string' && v) return [v];
    return [];
  }
  /** 写提成侧：空数组则删键；按工位时按 `stationIds` 排序去重 */
  function spSetRoles(sid, roles) {
    var list = (roles || []).filter(Boolean);
    if (!list.length) {
      delete spState.row.staffRoles[sid];
      return;
    }
    if (list.indexOf(SP_PICK_AVG) >= 0) {
      spState.row.staffRoles[sid] = [SP_PICK_AVG];
      return;
    }
    var ordered = spStationIds().filter(function (id) { return list.indexOf(id) >= 0; });
    spState.row.staffRoles[sid] = ordered.length ? ordered : list.slice();
  }
  function spHasRole(sid, key) {
    return spRolesOf(sid).indexOf(key) >= 0;
  }

  function spEnsureState() {
    var row = spState.row;
    if (!Array.isArray(row.staffIds)) row.staffIds = [];
    if (!row.staffRoles || typeof row.staffRoles !== 'object') row.staffRoles = {};
    if (!row.staffExtra || typeof row.staffExtra !== 'object') row.staffExtra = {};
    if (!row.staffChosen || typeof row.staffChosen !== 'object') row.staffChosen = {};
    /* 三者一律「以 staffIds 为准」：不在已选名单里的残留全清掉。
       十七次起「只勾顾客指定、没选工位」**也是有效的单独分配、计入已选**，
       不再有「未选待选」需要跨收起保留的记忆，因此 staffExtra 一并按 staffIds 收敛。 */
    ['staffRoles', 'staffChosen', 'staffExtra'].forEach(function (k) {
      Object.keys(row[k]).forEach(function (sid) {
        if (row.staffIds.indexOf(sid) < 0) delete row[k][sid];
      });
    });
    /* 旧单值字符串 → 数组；空数组 / 非法值清掉 */
    Object.keys(row.staffRoles).forEach(function (sid) {
      var v = row.staffRoles[sid];
      if (typeof v === 'string' && v) row.staffRoles[sid] = [v];
      else if (!Array.isArray(v) || !v.length) delete row.staffRoles[sid];
      else row.staffRoles[sid] = v.filter(Boolean);
    });
    row.staffIds.forEach(function (sid) {
      if (typeof row.staffExtra[sid] !== 'boolean') row.staffExtra[sid] = false;
      if (typeof row.staffChosen[sid] !== 'boolean') row.staffChosen[sid] = false;
    });
    /* 规则未开「顾客指定」：丢弃勾选记忆，避免把残留带成脏数据 */
    if (!spNeedExtra()) {
      Object.keys(row.staffExtra).forEach(function (sid) { row.staffExtra[sid] = false; });
    }
  }
  function spNeedStation() { return spState.mode === 'station'; }
  function spNeedExtra() { return !!spState.extraSplit; }
  /** 是否需要「点卡片 → 展开选项」二次确认；否 = 点卡片即完成选择（点选即勾选） */
  function spNeedsPick() { return spNeedStation() || spNeedExtra(); }
  function spIsAvg() { return !spNeedStation(); }
  function spSheetOpen() {
    var mask = spEl('comm2StaffSheetMask');
    return !!(mask && mask.classList.contains('open'));
  }
  /** 展开后的选项（交互四态 · 二十五次：工位多选）：
     按工位 + 顾客指定 → 3 工位 + 「顾客指定」；**工位之间多选（可点掉、可全不选）**，
                          「顾客指定」独立可勾选，两者**互不排斥** —— 都不勾 = 未选。
     按工位（未开）  → 3 工位（多选）
     不分工位 + 顾客指定 → 「服务提成」/「顾客指定」；**两者可叠加**（先勾「服务提成」再勾「顾客指定」），
                          也可只勾「顾客指定」单独分配（只发顾客指定提成）。
     不分工位（未开）  → 无选项（点卡片即完成） */
  function spOptionList() {
    var out = [];
    if (spNeedStation()) {
      spStationIds().forEach(function (rid) {
        out.push({ key: rid, kind: 'role', label: spStationLabel(rid) });
      });
      if (spNeedExtra()) out.push({ key: 'extra', kind: 'extra', label: '顾客指定' });
      return out;
    }
    if (spNeedExtra()) {
      out.push({ key: SP_PICK_AVG, kind: 'plain', label: '服务提成' });
      out.push({ key: 'extra', kind: 'extra', label: '顾客指定' });
    }
    return out;
  }
  /** 选项勾选态：**提成侧（工位 / 提成）与顾客指定侧各自独立**，互不推导、互不排斥 */
  function spOptionChecked(sid, opt) {
    if (!opt) return false;
    var row = spState.row;
    if (opt.kind === 'extra') return row.staffExtra[sid] === true;
    if (opt.kind === 'plain') return spHasRole(sid, SP_PICK_AVG);
    /* 工位：必须由用户点击才会勾选（不预选默认工位）；可多选 */
    return spHasRole(sid, opt.key);
  }
  function spOptionByKey(key) {
    var list = spOptionList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return null;
  }
  function spStaffIsChosen(sid) {
    var row = spState.row;
    return !!row.staffChosen[sid] && row.staffIds.indexOf(sid) >= 0;
  }
  /** 「提成侧」是否已选（按工位 = 选了至少一个工位；不分工位 = 勾了「提成」） */
  function spBasePicked(sid) { return spRolesOf(sid).length > 0; }
  /** 只勾了「顾客指定」、**没有**任何提成侧选择 —— 合法状态：
      员工计入已选（发顾客指定提成），但提成侧金额为 0、摘要的提成位置显示「无工位」（按工位态）。 */
  function spExtraOnly(sid) {
    var row = spState.row;
    if (!spNeedExtra() || row.staffExtra[sid] !== true) return false;
    return !spBasePicked(sid) && row.staffIds.indexOf(sid) >= 0;
  }
  /** 摘要拆件（供纯文本 / 带样式两处共用）：
      按工位：工位名列表（`stations`，大→中→小序）+ 可选「顾客指定」/ 只有顾客指定 → 缺工位（`miss`）
      不分工位：`提成`（+「· 顾客指定」）/ 只有顾客指定 → 只有「顾客指定」 */
  function spSummaryParts(sid) {
    var row = spState.row;
    if (row.staffIds.indexOf(sid) < 0) return null;
    var extra = row.staffExtra[sid] === true && spNeedExtra();
    if (spNeedStation()) {
      var labels = spRolesOf(sid).map(function (rid) { return spStationLabel(rid); }).filter(Boolean);
      if (labels.length) return { miss: '', stations: labels, main: labels.join(' · '), extra: extra };
      return extra ? { miss: '无工位', stations: [], main: '', extra: true } : null;
    }
    if (spNeedExtra()) {
      if (spHasRole(sid, SP_PICK_AVG)) return { miss: '', stations: ['提成'], main: '提成', extra: extra };
      return extra ? { miss: '', stations: [], main: '', extra: true } : null;
    }
    return null;
  }
  /** 摘要纯文本（入口下方「已选员工」行用；仅已计入已选的员工会出现）：
      工位名 / 大工 · 中工 / 大工 · 中工 · 顾客指定 / 无工位 · 顾客指定 / 提成 / 提成 · 顾客指定 / 顾客指定 */
  function spSummaryText(sid) {
    var p = spSummaryParts(sid);
    if (!p) return '';
    if (p.miss) return p.miss + ' · 顾客指定';
    var out = [];
    if (p.main) out.push(p.main);
    if (p.extra) out.push('顾客指定');
    return out.join(' · ');
  }
  /** 卡片摘要（**带样式**）：
      · 十八次起「只勾顾客指定」**只画红字「顾客指定」**（缺工位信息只在入口摘要行保留）；
      · 二十五次补：工位 **固定两行拆分**——1～2 个工位同行；**3 个工位** → 上行「第 1·第 2」、下行「第 3」
        （大→中→小序，如 `大工 · 中工` / `小工`），**禁止省略号截断**；
      · 工位 > 1（或工位已拆成多行）且勾了顾客指定 → 「顾客指定」独占下一行；
        单行摘要在预留高度内**垂直居中**。 */
  function spStationPickLines(stations) {
    var esc = (stations || []).map(function (s) { return spEsc(s); });
    if (!esc.length) return [];
    if (esc.length <= 2) return [esc.join(' · ')];
    /* 固定拆分：前 2 个一行，其余每个各占一行（当前最多 3 工位 → 正好两行） */
    return [esc.slice(0, 2).join(' · ')].concat(esc.slice(2));
  }
  function spSummaryHtml(sid) {
    var p = spSummaryParts(sid);
    if (!p) return '';
    if (p.miss) return '<span class="staff-card__pick-x">顾客指定</span>';
    var stations = p.stations || [];
    var stationLines = spStationPickLines(stations);
    /* 单工位 + 顾客指定：仍同行 `大工 · 顾客指定` */
    if (stations.length === 1 && p.extra) {
      return stationLines[0] + ' · ' + spEsc('顾客指定');
    }
    var lines = stationLines.slice();
    if (p.extra) {
      if (!lines.length) return '<span class="staff-card__pick-x">顾客指定</span>';
      lines.push('<span class="staff-card__pick-x">顾客指定</span>');
    }
    if (!lines.length) return '';
    if (lines.length === 1) return lines[0];
    return '<div class="staff-card__pick-stack">' +
      lines.map(function (ln) {
        return '<div class="staff-card__pick-line">' + ln + '</div>';
      }).join('') +
      '</div>';
  }
  /** 卡片第三行：态4（不分工位+未开顾客指定）选中后仍灰字头衔；其余「已选」显示红色摘要 */
  function spCardPickLineHtml(st, done) {
    var jobTitle = spJobTitleHtml(st);
    if (!done) return jobTitle;
    if (!spNeedsPick()) return jobTitle;
    var sum = spSummaryHtml(st.id);
    if (!sum) return jobTitle;
    return '<div class="staff-card__title staff-card__title--pick">' + sum + '</div>';
  }

  /* —— 勾选动效门控 ——
     时长与 CSS **同源**（正向 `--sp-check-red` 变红 + `--sp-check-draw` 画勾 = 60ms + 110ms = 170ms；
     反向 `--sp-uncheck-draw` 收勾 + `--sp-uncheck-red` 褪红 = 55ms + 30ms = 85ms，恒为正向一半），
     改一处即可，避免 JS 与 CSS 对不齐。
     卡片的收起 / 展开**必须等动效真正播完**才发生：由 `animation.finished` 驱动 + 超时兜底，
     **不再用固定计时**（主线程卡顿时固定计时正是「没播完就收起」的根因）。
     动效期间的新交互**抢断**：先把进行中的勾**补画成终点态**再落定（q3-B）——勾不会停在半路。
     展开 Morph（380ms）另有**独立占位门**：Morph 播完前不收起；该门不受抢断清除。 —— */
  var SP_CHECK_RED_FALLBACK = 60;
  var SP_CHECK_DRAW_FALLBACK = 110;
  /* 反向（取消）动效 = 正向时长的一半 → 速度加快一倍：收勾 55ms + 褪红 30ms = 85ms。
     字面量常量与 CSS 的 `--sp-uncheck-*` 对应；`--sp-uncheck-*` 必须恒为 `--sp-check-*` 的 1/2 */
  var SP_UNCHECK_DRAW_FALLBACK = 55;
  var SP_UNCHECK_RED_FALLBACK = 30;

  function spCssMs(name, fallback) {
    try {
      var raw = String(getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim();
      var m = /^([\d.]+)(ms|s)$/.exec(raw);
      if (!m) return fallback;
      return m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
    } catch (e) { return fallback; }
  }
  /** 正向单轮勾选动效总时长 = 变红 + 画勾（与 CSS 变量同源） */
  function spCheckMs() {
    return spCssMs('--sp-check-red', SP_CHECK_RED_FALLBACK) +
      spCssMs('--sp-check-draw', SP_CHECK_DRAW_FALLBACK);
  }
  /** 反向（取消）单轮动效总时长 = 收勾 + 褪红（与 CSS 变量同源；恒为 spCheckMs() 的一半） */
  function spUncheckMs() {
    return spCssMs('--sp-uncheck-draw', SP_UNCHECK_DRAW_FALLBACK) +
      spCssMs('--sp-uncheck-red', SP_UNCHECK_RED_FALLBACK);
  }
  /** 取该方向的门控名义时长：on = 正向勾选 170ms；off = 反向取消 85ms */
  function spCheckMsFor(on) { return on ? spCheckMs() : spUncheckMs(); }

  var spGate = { checkUntil: 0, morphUntil: 0, timer: 0, floorTimer: 0, token: null };

  function spGateBusy() { return Date.now() < Math.max(spGate.checkUntil, spGate.morphUntil); }

  /** 勾选控件上正在跑的动效：盒子的红/白过渡 + 勾路径上的画勾 / 收勾 */
  function spCheckAnims(root) {
    var out = [];
    var push = function (el) {
      if (!el || typeof el.getAnimations !== 'function') return;
      el.getAnimations().forEach(function (a) { out.push(a); });
    };
    if (!root) return out;
    push(root);
    if (root.querySelector) push(root.querySelector('svg path'));
    return out;
  }
  /** 把进行中的勾**立即补画到终点**（抢断用：勾不会停在半路就收起） */
  function spSnapChecks() {
    var root = spEl('comm2StaffSheetRoot');
    if (!root || !root.querySelectorAll) return;
    Array.prototype.slice.call(root.querySelectorAll('.is-draw, .is-undraw')).forEach(function (el) {
      spCheckAnims(el).forEach(function (a) { try { a.finish(); } catch (e) { /* ignore */ } });
    });
  }

  /** 等动效**真正播完**再执行一次状态变更（收起 / 展开）。
     判定 = 「所有相关动画结束（animation.finished）」**且**「已过 minMs 名义时长」，
      两者取长者：真实动效被改慢时随之推后，取消（反序）时也不会在褪红还没结束就收起。
      被抢断则先补画勾再立即落定。 */
  function spGateAfter(roots, apply, minMs) {
    if (spReduceMotion()) { apply(); return null; }
    var list = Array.isArray(roots) ? roots : [roots];
    var floor = minMs || 0;
    var tok = { done: false };
    tok.fire = function () {
      if (tok.done) return;
      tok.done = true;
      if (spGate.token === tok) spGate.token = null;
      if (spGate.timer) { clearTimeout(spGate.timer); spGate.timer = 0; }
      if (spGate.floorTimer) { clearTimeout(spGate.floorTimer); spGate.floorTimer = 0; }
      spGate.checkUntil = 0;
      apply();
    };
    var anims = [];
    list.forEach(function (r) { spCheckAnims(r).forEach(function (a) { anims.push(a); }); });
    var animsDone = !anims.length;
    var floorDone = !floor;
    if (animsDone && floorDone) { tok.fire(); return tok; }
    var maybe = function () { if (animsDone && floorDone) tok.fire(); };
    spGate.token = tok;
    /* 兜底上限取**较长**的正向单轮（170ms）——反向取消更短（85ms），故 spCheckMs() 恒为上界 */
    var guard = Math.max(spCheckMs() + 300, floor + 300);
    spGate.checkUntil = Date.now() + guard;
    spGate.timer = setTimeout(tok.fire, guard);          /* 兜底：动画被取消 / 不触发也能落定 */
    if (!animsDone) {
      var left = anims.length;
      anims.forEach(function (a) {
        var one = function () { if (--left === 0) { animsDone = true; maybe(); } };
        try { a.finished.then(one, one); } catch (e) { one(); }
      });
    }
    if (!floorDone) {
      spGate.floorTimer = setTimeout(function () { spGate.floorTimer = 0; floorDone = true; maybe(); }, floor);
    }
    return tok;
  }

  /** 展开 Morph 占位门：Morph 播完前不接受收起（独立于勾选门控，抢断不清除） */
  function spGateHoldOnly(ms) {
    var wait = spReduceMotion() ? 0 : ms;
    if (!wait) return;
    spGate.morphUntil = Math.max(spGate.morphUntil, Date.now() + wait);
  }

  /* —— 收起动画（A2 / 十九次）——
     现状曾是**裸 innerHTML 重绘**（实测 2ms、无过渡）。现在让「已展开的那张卡」先把宽度与位移
     收回它自己的格子内、播完再重绘，即**展开 Morph 的镜像**，但更快更干脆（220ms / Apple 标准）：
       · 卡宽 gridW（332）→ cellW（105.33）、translateX(dx) → 0；
       · 同行其余卡片**淡入回**（摘掉 is-row-muted，各自 opacity 过渡）；
       · 4 张选项卡**整体淡出**（.staff-card.is-collapsing 下的 .staff-card__opts）；
       · 同时**下层头像卡面**（.staff-card__panel--base）**淡入** —— 两层交叉，
         避免「选项卡淡完 → 空卡 → 重绘后啪地跳出头像/姓名」的跳帧。
     时长与缓动由 CSS 变量 `--sp-collapse` / `--sp-ease-std` 给出，JS 读同一个变量（**同源**）。 */
  function spCollapseMs() {
    var root = document.documentElement;
    if (!root) return SP_COLLAPSE_FALLBACK_MS;
    var v = getComputedStyle(root).getPropertyValue('--sp-collapse');
    var n = parseFloat(v);
    return isNaN(n) ? SP_COLLAPSE_FALLBACK_MS : (v.indexOf('ms') > 0 ? n : n * 1000);
  }
  function spCollapseTarget() {
    var root = spEl('comm2StaffSheetRoot');
    if (!root) return null;
    var grid = root.querySelector('.staff-grid');
    if (!grid) return null;
    var card = grid.querySelector(':scope > .staff-card.is-editing');
    if (!card) return null;
    var cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .staff-card'));
    return { grid: grid, card: card, cards: cards };
  }
  /** 播放收起动画；播完（或无需播放）后调用 done()。done **只被调用一次**。 */
  function spCollapseMorph(done) {
    var t = spReduceMotion() ? null : spCollapseTarget();
    if (!t) { done(); return; }
    var gridW = t.grid.clientWidth;
    var idx = t.cards.indexOf(t.card);
    if (gridW <= 0 || idx < 0) { done(); return; }
    var cellW = (gridW - SP_GRID_GAP * 2) / 3;
    var col = idx % 3;
    var ms = spCollapseMs();
    var sec = (ms / 1000) + 's';
    var trans = 'transform ' + sec + ' ' + SP_EASE_STD + ', width ' + sec + ' ' + SP_EASE_STD;
    /* 同行其余卡片淡入回（淡出是瞬时的，淡入给 220ms 过渡，只在收起时挂内联过渡） */
    for (var i = 0; i < 3; i++) {
      var c = t.cards[idx - col + i];
      if (!c || c === t.card) continue;
      c.style.transition = 'opacity ' + sec + ' ' + SP_EASE_STD;
      c.classList.remove('is-row-muted');
    }
    t.card.classList.add('is-collapsing');
    t.card.style.zIndex = '6';
    t.card.style.transition = trans;
    void t.card.offsetWidth;                     /* 先落起始态（gridW / dx），再改目标值 */
    t.card.style.width = cellW + 'px';
    t.card.style.transform = 'translateX(0)';
    var fired = false;
    var finish = function () {
      if (fired) return;
      fired = true;
      t.card.style.transition = 'none';
      done();
    };
    t.card.addEventListener('transitionend', function (e) {
      if (e && e.propertyName === 'width') finish();
    });
    setTimeout(finish, ms + 40);                 /* 兜底：transition 被取消也能落定 */
  }

  /** 收起 / 展开员工卡：等**展开 Morph** 与**勾选动效**都播完再落定，然后重绘。
      同一时刻只认最后一次意图（后到的覆盖先到的），避免「先收起、随后又被旧意图展开」 */
  var spEditSeq = 0;
  function spEditChange(mutator, collapse) {
    var seq = ++spEditSeq;
    var commit = function () {
      mutator();
      spHaptic();
      spRedraw();
    };
    var attempt = function () {
      if (seq !== spEditSeq) return;                       /* 已被更新的意图取代 */
      var until = Math.max(spGate.checkUntil, spGate.morphUntil);
      var busy = spReduceMotion() ? 0 : Math.max(0, until - Date.now());
      if (busy > 0) { setTimeout(attempt, busy + 20); return; }
      /* 收起（且有展开卡）→ 先播反向 Morph，播完再重绘落定 */
      if (collapse && spCollapseTarget()) {
        spGateHoldOnly(spCollapseMs());
        spCollapseMorph(function () {
          if (seq !== spEditSeq) return;
          commit();
        });
        return;
      }
      commit();
    };
    var wait = spReduceMotion() ? 0 : Math.max(0, spGate.morphUntil - Date.now());
    if (wait > 0) setTimeout(attempt, wait); else attempt();
  }
  /** 落定展开态目标（null = 收起；对象 = 保持展开在该员工上）。
      收起走**反向 Morph 动画**（`collapse=true`）；展开由 `spEnterEdit` 走 A4 Morph。 */
  function spApplyEdit(next) {
    spEditChange(function () { spState.edit = next; }, next === null);
  }

  /** 抢断：先把进行中的勾补画成完整态，再立即落定本次状态变更（q3-B） */
  function spGateFlush() {
    var tok = spGate.token;
    if (spGate.timer) { clearTimeout(spGate.timer); spGate.timer = 0; }
    if (spGate.floorTimer) { clearTimeout(spGate.floorTimer); spGate.floorTimer = 0; }
    spGate.checkUntil = 0;
    spGate.token = null;
    spSnapChecks();
    if (tok) tok.fire();
  }
  /** 动效期间的交互：抢断后立即执行（点击不丢失） */
  function spIntend(fn) {
    if (spGateBusy()) spGateFlush();
    fn();
    return true;
  }

  /** 勾选控件的**宿主卡片**：展开态选项卡 → `.staff-opt`。反向（取消）时宿主一起标 `is-undraw`：
      整张选项卡的红色（红边 + 红投影）与勾选框**同节拍快速淡出** —— 否则红色只会在落定重绘那一帧硬切。
      注：十九次起收缩态员工卡不再有勾选控件，故原 `.staff-card` 分支已废止。 */
  function spCheckHost(el) {
    if (!el || typeof el.closest !== 'function') return null;
    return el.closest('.staff-opt');
  }
  /** 播放勾选控件动效：on = 变红 + 画勾；off = 收勾 + 褪红（反序，且宿主卡片红色同步快速淡出） */
  function spPlayCheck(el, on) {
    if (!el || spReduceMotion()) return;
    var host = spCheckHost(el);
    el.classList.remove('is-draw', 'is-undraw');
    if (host) host.classList.remove('is-undraw');
    void el.offsetWidth;
    el.classList.add(on ? 'is-draw' : 'is-undraw');
    if (!on && host) host.classList.add('is-undraw');
  }
  function spOptBoxEl(sid, key) {
    var root = spEl('comm2StaffSheetRoot');
    if (!root || !sid || !key) return null;
    var btn = root.querySelector('[data-staff-opt="' + key + '"][data-staff-id="' + sid + '"]');
    return btn ? btn.querySelector('.staff-opt__box') : null;
  }
  /** 选中员工（计入已选）。**本函数不动 `staffRoles`**：提成侧选择（工位 id / `SP_PICK_AVG`）
      由调用方先行写入，这样「只勾顾客指定、没有工位/提成」也能原样保留提成侧为空。
      十九次起收缩态员工卡不再有勾选控件，故取消 `fresh` 参数（勾只画在展开态选项卡上）。 */
  function spSelectStaff(sid) {
    var row = spState.row;
    if (row.staffIds.indexOf(sid) < 0) row.staffIds.push(sid);
    row.staffChosen[sid] = true;
    /* 选中即标记「一次性回弹」：下一次渲染播 staffDonePop（重绘不重播） */
    spState.freshDone[sid] = true;
  }
  /** 取消员工选择：提成侧与顾客指定侧**一并清掉**
      （十七次起不再需要保留「只勾顾客指定」的记忆 —— 那种状态本身就已经计入已选）。 */
  function spDropStaff(sid) {
    var row = spState.row;
    row.staffIds = row.staffIds.filter(function (x) { return x !== sid; });
    row.staffChosen[sid] = false;
    delete row.staffRoles[sid];
    delete row.staffExtra[sid];
  }

  /** 应用一次勾选结果（动效播完后调用）。
      展开态**点任一按钮都收起**；**提成侧与顾客指定侧各自独立、互不排斥**——
      · 提成侧按工位 = **工位多选**（可点掉、可全不选）；不分工位 =「提成」单卡可点掉；
      · 「顾客指定」：独立勾选，**不要求先有工位/提成** —— 只勾它也能单独分配（只发顾客指定提成）；
      · 两侧**都不勾** = 该员工未选（唯一被取消的路径）。
      加第二个工位需**再展开**卡片点选（每次点选项卡都立刻收起，见确认 3B/4B）。 */
  function spApplyOptionToggle(sid, key) {
    if (!sid || !key) return;
    spEnsureState();
    var row = spState.row;
    var opt = spOptionByKey(key);
    if (!opt) return;
    var checked = spOptionChecked(sid, opt);

    if (opt.kind === 'extra') {
      if (checked) {
        /* 取消「顾客指定」：还有提成侧 → 员工仍已选（只发提成侧）；否则两侧皆空 → 取消该员工 */
        row.staffExtra[sid] = false;
        if (!spBasePicked(sid)) spDropStaff(sid);
      } else {
        /* 勾「顾客指定」：**不要求工位/提成**，只勾它也是一次有效的单独分配 */
        row.staffExtra[sid] = true;
        spSelectStaff(sid);
      }
      /* 任一按钮点选后一律收起；收起必须等勾选动效播完（spGateAfter 驱动），Morph 未播完也不收起 */
      spApplyEdit(null);
      return;
    }

    if (opt.kind === 'plain') {
      /* 不分工位「提成」卡：仍为单卡开关 */
      if (checked) {
        spSetRoles(sid, []);
        if (row.staffExtra[sid] !== true) spDropStaff(sid);
      } else {
        spSetRoles(sid, [SP_PICK_AVG]);
        spSelectStaff(sid);
      }
      spApplyEdit(null);
      return;
    }

    /* 按工位：多选；再点已勾选 = 取消该工位；点新工位 = 追加（旧勾保留，无红色交接） */
    var roles = spRolesOf(sid);
    if (checked) {
      roles = roles.filter(function (r) { return r !== key; });
      spSetRoles(sid, roles);
      if (!roles.length && row.staffExtra[sid] !== true) spDropStaff(sid);
    } else {
      roles.push(key);
      spSetRoles(sid, roles);
      spSelectStaff(sid);
    }
    spApplyEdit(null);
  }

  /** 点展开态选项卡：勾选 / 取消勾选；收起等勾选动效**真正播完**才发生。
      二十五次起工位**多选**——点新工位只播该卡正向画勾，**不再**对旧工位做「红色交接」反序。 */
  function spTapOption(sid, key) {
    if (!sid || !key) return;
    if (!spState.edit || spState.edit.staffId !== sid) return;
    if (spGateBusy()) spGateFlush();                 /* q3-B：抢断，先把勾补画成完整态 */
    var opt = spOptionByKey(key);
    if (!opt) return;
    var checked = spOptionChecked(sid, opt);
    /* 单轮：勾选按正向时长（170ms）、取消按反向时长（85ms）——取消时整卡红色同步淡出 */
    spPlayCheck(spOptBoxEl(sid, key), !checked);
    spGateAfter(spOptBoxEl(sid, key), function () { spApplyOptionToggle(sid, key); }, spCheckMsFor(!checked));
  }

  /** 态4（不分工位 + 未开顾客指定）：点卡片即完成选择 / 已选再点即取消。
      该态没有选项卡，提成侧直接记 `SP_PICK_AVG`（= 取规则级「提成」值），也没有顾客指定侧。
      十九次起收缩态员工卡不再有勾选控件，故该态选中反馈 = 粉底 + 描边 + 头像粉圈 + 卡片回弹（`is-pop`）。 */
  function spToggleStaff(sid) {
    if (!sid) return;
    spEnsureState();
    if (spStaffIsChosen(sid)) { spRemoveStaff(sid); return; }
    spState.row.staffExtra[sid] = false;
    spSetRoles(sid, [SP_PICK_AVG]);
    spSelectStaff(sid);
    spState.edit = null;
    spHaptic();
    spRedraw();
  }

  function spJobTitleHtml(st) {
    var title = st && st.role ? String(st.role).trim() : '';
    if (!title) return '';
    return '<div class="staff-card__title">' + spEsc(title) + '</div>';
  }
  function spAvatarHtml(st) {
    if (st.avatar) {
      return '<img class="staff-card__avatar" src="' + spEsc(st.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }
    var letter = (st.short || st.name || '?').toString().slice(0, 2);
    return '<span class="staff-card__avatar staff-card__avatar--ph" aria-hidden="true">' + spEsc(letter) + '</span>';
  }
  /** 展开态：整行横向平铺 N 个卡片按钮；每张右上角一个勾选控件（未勾选 → 空心）
      注（二十一次）：卡片上的 `--staff-origin` / `data-origin` 已删除 —— 它们是「渲染了但 CSS 从未消费」
      的死属性（实测 `.staff-opt` 的 `transform-origin` 恒为自身中心，入场分裂走默认 `center center`）。 */
  function spOptionsPanelHtml(sid) {
    var opts = spOptionList();
    var box = '<span class="staff-opt__box" aria-hidden="true">' + SP_CHECK_SVG + '</span>';
    return '<div class="staff-card__opts" role="group" aria-label="选择工位或顾客指定">' +
      opts.map(function (o) {
        var on = spOptionChecked(sid, o);
        return '<button type="button" class="staff-opt' + (on ? ' is-on' : '') +
          (o.kind === 'extra' ? ' staff-opt--extra' : '') + '"' +
          ' data-staff-opt="' + spEsc(o.key) + '" data-staff-id="' + spEsc(sid) + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
          box +
          '<span class="staff-opt__txt">' + spEsc(o.label) + '</span>' +
          '</button>';
      }).join('') +
      '</div>';
  }

  function spRenderPickerHtml() {
    spEnsureState();
    var it = spState.row;
    var edit = spState.edit;
    var pool = spStaffPool();
    var cards = pool.map(function (st) {
      var isChosen = it.staffIds.indexOf(st.id) >= 0;    /* 计入已选（有工位/提成 → 有；只勾「顾客指定」→ 也有） */
      var done = isChosen;
      var isEdit = !!(edit && edit.staffId === st.id);
      var dim = !!(edit && !isEdit);
      /* 收缩态卡面（头像 / 姓名 / 摘要）：展开卡里也渲染一份，作为收起动画的**下层**（十九次 A2） */
      var baseBody = spAvatarHtml(st) +
        '<div class="staff-card__name">' + spEsc(st.name) + '</div>' +
        spCardPickLineHtml(st, done);
      if (isEdit) {
        return '<div class="staff-card is-editing' + (done ? ' is-done' : '') + (edit.splitting ? ' is-splitting' : '') + '"' +
          ' data-staff-card data-staff-id="' + spEsc(st.id) + '">' +
          '<div class="staff-card__panel" data-face="opts">' + spOptionsPanelHtml(st.id) + '</div>' +
          '<div class="staff-card__panel staff-card__panel--base" data-face="base" aria-hidden="true">' + baseBody + '</div>' +
          '</div>';
      }
      /* 收缩态员工卡：**不再有**右侧红勾（十九次）—— 取消入口 = 展开卡片取消勾选 / 入口摘要行 × */
      return '<div class="staff-card' + (done ? ' is-done' : '') + (isChosen && spState.freshDone[st.id] ? ' is-pop' : '') + (dim ? ' is-dim' : '') + '"' +
        ' data-staff-card data-staff-id="' + spEsc(st.id) + '">' +
        '<button type="button" class="staff-card__panel" data-staff-card-hit data-staff-id="' + spEsc(st.id) + '" aria-label="' + spEsc(st.name) + '">' +
        baseBody +
        '</button>' +
        '</div>';
    }).join('');
    return '<div class="detail-item__staff-block detail-item__staff-block--cards' + (edit ? ' is-picking' : '') + '">' +
      (edit ? '<button type="button" class="staff-card-scrim" data-staff-scrim aria-label="取消选择"></button>' : '') +
      '<div class="staff-grid' + (edit ? ' is-morphing' : '') + '">' + cards + '</div>' +
      '</div>';
  }

  /* 展开：被点卡片横向撑满整行（3 列宽），行内其余卡片淡出 */
  function spAnimateStaffMorphLayout(grid) {
    if (!grid) return;
    var token = (grid._staffMorphToken = (grid._staffMorphToken || 0) + 1);
    var cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .staff-card'));
    var editing = cards.filter(function (c) { return c.classList.contains('is-editing'); })[0];
    var reduce = spReduceMotion();

    cards.forEach(function (c) {
      c.classList.remove('is-expanding', 'is-row-muted');
      c.style.transition = 'none';
      c.style.transform = '';
      c.style.width = '';
      c.style.zIndex = '';
    });
    grid.classList.toggle('is-morphing', !!editing);

    if (!editing) {
      requestAnimationFrame(function () {
        if (grid._staffMorphToken !== token) return;
        cards.forEach(function (c) { c.style.transition = ''; });
      });
      return;
    }

    var gap = SP_GRID_GAP;
    var gridW = grid.clientWidth;
    if (gridW <= 0) return;
    var cellW = (gridW - gap * 2) / 3;
    var idx = cards.indexOf(editing);
    if (idx < 0) return;
    var col = idx % 3;
    var rowStart = idx - col;
    var dx = -(col * (cellW + gap));
    var springTrans = 'transform ' + (SP_EXPAND_MS / 1000) + 's ' + SP_SPRING + ', width ' + (SP_EXPAND_MS / 1000) + 's ' + SP_SPRING;

    var muteRow = function (on) {
      for (var i = 0; i < 3; i++) {
        var card = cards[rowStart + i];
        if (!card || card === editing) continue;
        card.classList.toggle('is-row-muted', on);
      }
    };
    var applyFinalLayout = function (withTransition) {
      editing.style.transition = withTransition === false ? 'none' : springTrans;
      editing.style.width = gridW + 'px';
      editing.style.transform = 'translateX(' + dx + 'px)';
      editing.style.zIndex = '6';
      muteRow(true);
    };

    /* 降级（`prefers-reduced-motion`）：不加过渡，直接落位 */
    editing.style.zIndex = '6';
    if (reduce) {
      editing.classList.add('is-expanding');
      applyFinalLayout(false);
      return;
    }
    editing.style.width = cellW + 'px';
    editing.style.transform = 'translateX(0)';
    void grid.offsetWidth;

    requestAnimationFrame(function () {
      if (grid._staffMorphToken !== token) return;
      editing.classList.add('is-expanding');
      applyFinalLayout();
    });
  }

  function spAfterStaffPickerPaint(root) {
    requestAnimationFrame(function () {
      var grid = root && root.querySelector ? root.querySelector('.staff-grid') : null;
      if (grid) spAnimateStaffMorphLayout(grid);
      if (spState.edit && spState.edit.splitting) {
        setTimeout(function () {
          if (spState.edit) spState.edit.splitting = false;
          /* 第 4 张卡延迟 105ms + 380ms ≈ 485ms 才播完：等它播完再摘掉类 */
          var el = root && root.querySelector ? root.querySelector('.staff-card.is-splitting') : null;
          if (el) el.classList.remove('is-splitting');
        }, spReduceMotion() ? 0 : 520);
      }
      /* 「回弹」（is-pop）是一次性标记：本次渲染已消费，立刻清空，后续重绘不再重播。
         （十九次起收缩态员工卡不再有勾选控件，故原 `freshTick` 标记与 `staffCheckIn` 勾弹入一并废止） */
      spState.freshDone = {};
    });
  }

  function spRenderSummaryHtml() {
    spEnsureState();
    var ids = spState.row.staffIds;
    if (!ids.length) return '';
    var pool = spStaffPool();
    var delSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var rows = ids.map(function (sid) {
      var st = null;
      for (var i = 0; i < pool.length; i++) { if (pool[i].id === sid) { st = pool[i]; break; } }
      var name = st ? st.name : sid;
      var job = (st && st.role) ? st.role : '';
      var meta = spSummaryText(sid);
      return '<div class="detail-staff-summary__row">' +
          '<div class="detail-staff-summary__main">' +
            '<span class="detail-staff-summary__name">' + spEsc(name) + '</span>' +
            (job ? '<span class="detail-staff-summary__role">' + spEsc(job) + '</span>' : '') +
            (meta ? '<span class="detail-staff-summary__meta">' + spEsc(meta) + '</span>' : '') +
          '</div>' +
          '<button type="button" class="detail-staff-summary__del" data-staff-summary-del data-staff-id="' + spEsc(sid) + '" aria-label="移除 ' + spEsc(name) + '">' + delSvg + '</button>' +
        '</div>';
    }).join('');
    return '<div class="detail-staff-summary">' + rows + '</div>';
  }

  function spRenderEntryHtml() {
    spEnsureState();
    var n = spState.row.staffIds.length;
    var val = n ? ('已选 ' + n + ' 人') : '未选择';
    return '<button type="button" class="detail-staff-entry" data-open-comm2-sp-staff>' +
        '<span class="detail-staff-entry__lbl">服务员工</span>' +
        '<span class="detail-staff-entry__val' + (n ? ' has-staff' : '') + '">' + spEsc(val) + '</span>' +
        '<span class="chev ui-icon" aria-hidden="true">' + SP_CHEV + '</span>' +
      '</button>' +
      spRenderSummaryHtml();
  }

  function spHintText() {
    var needS = spNeedStation();
    var needE = spNeedExtra();
    if (!needS && !needE) return '可多选员工；点卡片即完成选择。';
    if (!needS && needE) return '可多选员工；点卡片后勾选「提成」「顾客指定」（两者可同时勾选、提成叠加），' +
      '只勾「顾客指定」也可单独分配；点选后即收起。';
    if (needS && !needE) return '可多选员工；点卡片后勾选工位（' + spStationLabelsJoined() + '），工位可多选、点选后即收起，再点已勾选工位即取消；加选其它工位需再次展开。';
    return '可多选员工；点卡片后勾选工位（' + spStationLabelsJoined() + '），工位可多选、点选后即收起，再点已勾选工位即取消；加选其它工位需再次展开；' +
      '「顾客指定」可与任一工位同时勾选（提成叠加），也可以不选工位单独分配「顾客指定」——' +
      '此种情况只发顾客指定提成。';
  }

  function spRenderScreen() {
    var box = spEl('comm2SpBlock');
    if (!box) return;
    box.innerHTML = spRenderEntryHtml();
  }
  function spRenderSheet() {
    var root = spEl('comm2StaffSheetRoot');
    if (!root) return;
    var hint = spEl('comm2StaffSheetHint');
    if (hint) hint.textContent = spHintText();
    root.innerHTML = spRenderPickerHtml();
    spAfterStaffPickerPaint(root);
  }
  function spRedraw() {
    if (spSheetOpen()) { spRenderSheet(); return; }
    spRenderScreen();
  }

  function spOpenSheet() {
    spState.edit = null;
    spState.freshDone = {};          /* 开场不播回弹：已选员工的卡直接静态呈现 */
    spRenderSheet();
    var mask = spEl('comm2StaffSheetMask');
    if (mask) mask.classList.add('open');
  }
  function spCloseSheet() {
    var mask = spEl('comm2StaffSheetMask');
    if (mask) mask.classList.remove('open');
    spEditSeq++;                    /* 取消任何待落定的收起 / 展开 */
    spState.edit = null;
    spState.freshDone = {};
    spRenderScreen();
  }

  function spOpen() {
    spState.edit = null;
    spRenderScreen();
    if (window.showOnlyScreen) window.showOnlyScreen('screen-comm2-staff-pick');
  }
  function spSyncModeButtons() {
    var group = spEl('comm2StaffPickMode');
    if (group) {
      group.querySelectorAll('[data-comm2-sp-mode]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-comm2-sp-mode') === spState.mode);
      });
    }
    var extra = spEl('comm2StaffPickExtra');
    if (extra) {
      var on = spState.extraSplit ? '1' : '0';
      extra.querySelectorAll('[data-comm2-sp-extra]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-comm2-sp-extra') === on);
      });
    }
  }
  function spCurrentSchemeName() {
    var sch = spScheme();
    return sch && sch.name ? sch.name : '';
  }

  function spEnterEdit(sid) {
    spEnsureState();
    if (!spNeedsPick()) {
      /* 态4：点卡片即完成选择 / 已选再点即取消 */
      spToggleStaff(sid);
      return;
    }
    /* 展开态点**另一张**员工卡：先播**收起动画**把当前这张收回格子，再展开新的（十九次：全部收起路径统一播）。
       同一张卡再点 = 收起，由 wire() 的 staffHit 分支走 spApplyEdit(null)。 */
    if (spState.edit && spState.edit.staffId !== sid && spCollapseTarget()) {
      spEditChange(function () {
        spState.edit = { staffId: sid, splitting: true };
        spGateHoldOnly(SP_EXPAND_MS);   /* 新卡的展开 Morph 播完前不接受收起 */
      }, true);
      return;
    }
    spEditSeq++;                    /* 最新意图：取消任何待落定的收起 / 展开 */
    spState.edit = { staffId: sid, splitting: true };
    spHaptic();
    spGateHoldOnly(SP_EXPAND_MS);   /* 展开 Morph 动效播完前不接受收起 */
    spRedraw();
  }

  function wire() {
    if (window.Comm2Demo && typeof window.Comm2Demo.openEdit === 'function' && !window.Comm2Demo.__spTracked) {
      var origOpenEdit = window.Comm2Demo.openEdit;
      window.Comm2Demo.openEdit = function (id) {
        if (id) spSchemeId = id;
        return origOpenEdit.apply(this, arguments);
      };
      window.Comm2Demo.__spTracked = true;
    }

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || typeof t.closest !== 'function') return;

      if (t.closest('#comm2StaffPickBack')) {
        e.preventDefault();
        if (window.openHub) window.openHub();
        return;
      }

      var modeBtn = t.closest('[data-comm2-sp-mode]');
      if (modeBtn) {
        e.preventDefault();
        var mode = modeBtn.getAttribute('data-comm2-sp-mode') === 'station' ? 'station' : 'avg';
        if (mode !== spState.mode) {
          spState.mode = mode;
          spState.edit = null;
          spSyncModeButtons();
          spRedraw();
        }
        return;
      }

      var guestBtn = t.closest('[data-comm2-sp-extra]');
      if (guestBtn) {
        e.preventDefault();
        var gs = guestBtn.getAttribute('data-comm2-sp-extra') === '1';
        if (gs !== spState.extraSplit) {
          spState.extraSplit = gs;
          spState.edit = null;
          spSyncModeButtons();
          spRedraw();
        }
        return;
      }

      if (t.closest('[data-open-comm2-sp-staff]')) {
        e.preventDefault();
        spOpenSheet();
        return;
      }
      if (t.closest('#comm2StaffSheetDone')) {
        e.preventDefault();
        spIntend(spCloseSheet);
        return;
      }
      var mask = t.closest('#comm2StaffSheetMask');
      if (mask && t === mask) {
        spIntend(spCloseSheet);
        return;
      }

      var inSheet = t.closest('#comm2StaffSheetRoot');
      var inScreen = t.closest('#comm2SpBlock');
      if (!inSheet && !inScreen) return;   /* 标题 / 提示行 / 底部栏等「卡片区之外」：不收起（q4） */

      if (t.closest('[data-staff-scrim]')) {
        spIntend(function () { spApplyEdit(null); });
        return;
      }

      var sumDel = t.closest('[data-staff-summary-del]');
      if (sumDel) {
        e.preventDefault(); e.stopPropagation();
        spRemoveStaff(sumDel.getAttribute('data-staff-id'));
        return;
      }

      /* 展开态：点选项卡片任意处 = 勾选 / 取消勾选（动效播完才收起） */
      var optBtn = t.closest('[data-staff-opt]');
      if (optBtn) {
        e.preventDefault(); e.stopPropagation();
        var oSid = optBtn.getAttribute('data-staff-id');
        spTapOption(oSid, optBtn.getAttribute('data-staff-opt'));
        return;
      }

      var staffHit = t.closest('[data-staff-card-hit]');
      if (staffHit) {
        e.preventDefault();
        var hSid = staffHit.getAttribute('data-staff-id');
        if (spState.edit && spState.edit.staffId === hSid) {
          spIntend(function () { spApplyEdit(null); });
          return;
        }
        /* 展开态点另一张员工卡：收起当前 + 展开新的（q5） */
        spIntend(function () { spEnterEdit(hSid); });
        return;
      }

      /* 展开态兜底：服务员工卡片区内，凡不是「选项卡 / 勾选控件 / 摘要删除」的点击
         （编辑卡自身空白、选项行间隙、卡片区空白）一律**先等勾选动效播完、再收起**（q4） */
      if (spState.edit) {
        e.preventDefault();
        spIntend(function () { spApplyEdit(null); });
      }
    });

    spSyncModeButtons();
    spRenderScreen();
  }

  function spRemoveStaff(sid) {
    if (!sid) return;
    spEnsureState();
    spState.row.staffIds = spState.row.staffIds.filter(function (x) { return x !== sid; });
    delete spState.row.staffRoles[sid];
    delete spState.row.staffExtra[sid];
    delete spState.row.staffChosen[sid];
    if (spState.edit && spState.edit.staffId === sid) spState.edit = null;
    spHaptic();
    spRedraw();
  }

  window.Comm2StaffPick = {
    open: spOpen,
    closeSheet: spCloseSheet,
    dismiss: function () {
      var mask = spEl('comm2StaffSheetMask');
      if (mask) mask.classList.remove('open');
      spState.edit = null;
    },
    setMode: function (mode) {
      spState.mode = mode === 'station' ? 'station' : 'avg';
      spState.edit = null;
      spSyncModeButtons();
      spRenderScreen();
    },
    setExtraSplit: function (on) {
      spState.extraSplit = !!on;
      spState.edit = null;
      spSyncModeButtons();
      spRenderScreen();
    },
    /* 兼容旧抓取脚本命名 */
    setGuestSplit: function (on) { this.setExtraSplit(on); },
    getStaffCount: function () { return (spState.row.staffIds || []).length; },
    getSchemeName: spCurrentSchemeName
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
