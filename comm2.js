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

  /** 「额外」参数卡：「顾客指定」命中时在提成之上叠加；右上角 × 关闭顾客指定 */
  function extraCapHtml(prefix, rule, opts) {
    opts = opts || {};
    rule = rule || defaultPair();
    var isAmt = extraIsAmt(rule);
    var cancelBtn = opts.hideCancel
      ? ''
      : '<button type="button" class="comm2-extra-close" data-comm2-extra="off" aria-label="关闭顾客指定提成">' + extraCloseSvg() + '</button>';
    return capCardHtml({
      variant: 'comm2-cap--extra',
      title: '额外',
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
  /** 不分工位：开顾客指定 → 两列「普通 / 顾客指定」（带静态列头，对照按工位）；
      未开顾客指定 → 提成卡 + 虚线卡并排（**无列头**） */
  function commissionParamsHtml(prefix, rule, extraSplit, aria) {
    if (!extraSplit) {
      return '<div class="comm2-extra-row comm2-extra-row--pair" role="group" aria-label="' + esc(aria || '提成参数') + '">' +
        nonCapHtml(prefix, rule) + extraAddCardHtml() + '</div>';
    }
    return '<div class="comm2-sheet-avg-cols" role="group" aria-label="' + esc(aria || '提成与顾客指定') + '">' +
      '<div class="comm2-sheet-station comm2-sheet-station--compact">' +
        sheetColNameHtml('普通', false) +
        '<div class="comm2-extra-row comm2-extra-row--solo">' + nonCapHtml(prefix, rule) + '</div>' +
      '</div>' +
      '<div class="comm2-sheet-station comm2-sheet-station--compact">' +
        sheetColNameHtml('顾客指定', true) +
        '<div class="comm2-extra-row comm2-extra-row--solo">' + extraCapHtml(prefix, rule) + '</div>' +
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
    var title = $('comm2EditTitle');
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

  /* ==== 试算引擎：按行 payScope 过滤 → 多方案候选 → 金额取高（并列按方案列表顺序） ==== */

  var COMM2_TRIAL_LINES = [
    { id: 'tl1', name: '开卡 · 尊享组合卡', cat: 'issue', kind: 'card', refId: 'demo_vip_combo', cardRole: 'issue', pay: 'cash', list: 2000, paid: 2000, extra: true },
    { id: 'tl2', name: '充卡 · 老客续充', cat: 'card', pay: 'cash', list: 1000, paid: 1000, extra: true },
    { id: 'tl3', name: '深层补水护理', cat: 'labor', kind: 'project', refId: 'p21', pay: 'memberCard', list: 268, paid: 268, extra: true },
    { id: 'tl4', name: '染发', cat: 'labor', kind: 'project', refId: 'p6', pay: 'cash', list: 358, paid: 358, extra: true, station: 'senior' },
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
     若该开单为顾客指定且已开启顾客指定提成，再叠加 rule 级顾客指定值（见 lineExtraAmount / lineExtraLabel）。 */
  function lineRateMeta(sch, block, rule, line) {
    if (block.pickMode === 'station') {
      var stId = line.station || getStationIds(sch)[0];
      var st = rule.stations[stId] || defaultStationPair();
      var sAmt = stationIsAmt(st);
      return { rate: stationNonVal(st, sAmt), isAmt: sAmt };
    }
    var nAmt = nonIsAmt(rule);
    return { rate: pairVal(rule, nAmt, 'nonDesignated', 'nonDesignatedAmt'), isAmt: nAmt };
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
      var metaS = lineRateMeta(sch, block, ruleS, line);
      var rateS = metaS.rate;
      var isAmtS = metaS.isAmt;
      var baseS = block.baseMode === 'paid' ? 0 : (Number(line.list) || 0);
      var extraS = lineExtraAmount(ruleS, line, baseS, 1);
      var extraLblS = lineExtraLabel(ruleS, line);
      var sepS = extraLblS ? ' + ' : '';
      var amountS = isAmtS ? rateS : Math.round(baseS * rateS) / 100;
      amountS = Math.round((amountS + extraS) * 100) / 100;
      if (!isAmtS && baseS <= 0 && extraS <= 0) {
        return { amount: 0, skipped: 'sign', rateLabel: rateS + '%', base: 0 };
      }
      return {
        amount: amountS,
        skipped: '',
        rateLabel: (isAmtS ? ('¥' + fmtMoney(rateS)) : (rateS + '%')) + sepS + extraLblS,
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
    var rate = meta.rate;
    var isAmt = meta.isAmt;
    var ratio = totalPaid > 0 ? (inScope / totalPaid) : 0;
    var extraLbl = lineExtraLabel(rule, line);
    var sep = extraLbl ? ' + ' : '';
    if (isAmt) {
      var amtFixed = Math.round(rate * ratio * 100) / 100;
      var amtTotal = Math.round((amtFixed + lineExtraAmount(rule, line, inScope, ratio)) * 100) / 100;
      return {
        amount: amtTotal,
        skipped: '',
        rateLabel: '¥' + fmtMoney(rate) + sep + extraLbl,
        base: inScope
      };
    }
    var base = lineBaseAmount(block, line);
    var amount = Math.round(base * rate) / 100;
    amount = Math.round((amount + lineExtraAmount(rule, line, base, ratio)) * 100) / 100;
    return {
      amount: amount,
      skipped: '',
      rateLabel: rate + '%' + sep + extraLbl,
      base: base
    };
  }

  function calcStaffTrial(staffId, lines) {
    /* schemes 顺序 = store.schemes 列表顺序，并列时先出现者胜出 */
    var schemes = schemesForStaff(staffId);
    var rows = (lines || COMM2_TRIAL_LINES).map(function (line) {
      var cands = [];
      schemes.forEach(function (sch, schIdx) {
        var r = schemeLineAmount(sch, line);
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

  function sheetRowHtml(lbl, ctrlHtml, cls, attrs) {
    return '<div class="comm2-sheet-row' + (cls ? ' ' + cls : '') + '"' + (attrs || '') + '>' +
      '<span class="comm2-sheet-row__lbl">' + esc(lbl) + '</span>' +
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
      sheetRowHtml('计算基数', sheetSegHtml('base', block));
    html += sheetRowHtml('分配模式', sheetSegHtml('pick', block));
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
 * 四态采集（对照 §4.5.1 / §6.7.1，整行勾选卡）：
 *   按工位+开顾客指定 → 整行 4 张：大工/中工/小工 +「顾客指定」（工位单选，顾客指定可叠加）
 *   按工位+未开       → 整行 3 张工位卡（单选）
 *   不分工位+开       → 整行 2 张：「普通」/「顾客指定」（二选一）
 *   不分工位+未开     → 点选即勾选（无展开、无勾选卡）
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
  var SP_SPRING = 'cubic-bezier(.34,1.3,.64,1)';
  var SP_EXPAND_MS = 380;

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
    freshTick: null,
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

  function spEnsureState() {
    var row = spState.row;
    if (!Array.isArray(row.staffIds)) row.staffIds = [];
    if (!row.staffRoles || typeof row.staffRoles !== 'object') row.staffRoles = {};
    if (!row.staffExtra || typeof row.staffExtra !== 'object') row.staffExtra = {};
    if (!row.staffChosen || typeof row.staffChosen !== 'object') row.staffChosen = {};
    Object.keys(row.staffRoles).forEach(function (sid) {
      if (row.staffIds.indexOf(sid) < 0) delete row.staffRoles[sid];
    });
    Object.keys(row.staffChosen).forEach(function (sid) {
      if (row.staffIds.indexOf(sid) < 0) delete row.staffChosen[sid];
    });
    /* staffExtra **不随「未选」清空**：按工位模式下「先勾顾客指定、等工位」的待选态，
       收起后要保留（下次展开仍是勾选态）；工位则一律由用户手点，不自动带默认工位。 */
    row.staffIds.forEach(function (sid) {
      if (typeof row.staffExtra[sid] !== 'boolean') row.staffExtra[sid] = false;
      if (typeof row.staffChosen[sid] !== 'boolean') row.staffChosen[sid] = false;
    });
    /* 规则未开「顾客指定」：丢弃勾选记忆，避免把待选态的残留带成脏数据 */
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
  /** 展开后的选项（交互四态 · q13-A）：
     按工位 + 顾客指定 → 3 工位 + 「顾客指定」（工位单选，「顾客指定」可与任一工位同时被选）
     按工位（未开）  → 3 工位
     不分工位 + 顾客指定 → 「普通」/「顾客指定」
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
      out.push({ key: 'plain', kind: 'plain', label: '普通' });
      out.push({ key: 'extra', kind: 'extra', label: '顾客指定' });
    }
    return out;
  }
  function spOptionChecked(sid, opt) {
    if (!opt) return false;
    var row = spState.row;
    if (opt.kind === 'extra') {
      /* 「顾客指定」：勾选态独立于员工是否已选（按工位时可先勾、等工位） */
      return row.staffExtra[sid] === true;
    }
    if (opt.kind === 'plain') return !!row.staffChosen[sid] && row.staffExtra[sid] !== true;
    /* 工位：必须由用户点击才会勾选（不再自动带默认工位） */
    return !!row.staffChosen[sid] && row.staffRoles[sid] === opt.key;
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
  /** 卡片/入口摘要：工位名（顾客指定时叠加「· 顾客指定」）/「顾客指定」/「普通」；态4无摘要 */
  function spSummaryText(sid) {
    var row = spState.row;
    var chosen = !!row.staffChosen[sid];
    var extra = row.staffExtra[sid] === true;
    if (spNeedStation()) {
      var role = (chosen && row.staffRoles[sid]) ? spStationLabel(row.staffRoles[sid]) : '';
      if (!role) return '';
      return (extra && spNeedExtra()) ? (role + ' · 顾客指定') : role;
    }
    if (spNeedExtra()) {
      if (!chosen) return '';
      return extra ? '顾客指定' : '普通';
    }
    return '';
  }
  /** 卡片第三行：态4（不分工位+未开顾客指定）选中后仍灰字头衔；其余选中显示红色摘要 */
  function spCardPickLineHtml(st, done) {
    var jobTitle = spJobTitleHtml(st);
    if (!done) return jobTitle;
    if (!spNeedsPick()) return jobTitle;
    var sum = spSummaryText(st.id);
    if (!sum) return jobTitle;
    return '<div class="staff-card__title staff-card__title--pick">' + spEsc(sum) + '</div>';
  }

  /* —— 勾选动效门控：点勾选控件后「快速变红 120ms → 勾从左到右画出 220ms」，取消反序播放；
     卡片的收起 / 展开都必须等动效播完。动效期间的新交互**抢断**当前动效（q4-C）：
     立即落定进行中的动效，再执行新交互，不排队。 —— */
  var SP_CHECK_RED_MS = 120;
  var SP_CHECK_DRAW_MS = 220;
  var SP_CHECK_MS = SP_CHECK_RED_MS + SP_CHECK_DRAW_MS;
  var spGate = { until: 0, timer: 0, pending: null };

  function spGateBusy() { return Date.now() < spGate.until; }
  function spGateElapsed(ms) { return spReduceMotion() ? 0 : ms; }
  /** 抢断：把进行中的动效立即落定（结果态由随后的重绘直接呈现），并放行新交互 */
  function spGateFlush() {
    if (spGate.timer) { clearTimeout(spGate.timer); spGate.timer = 0; }
    var fn = spGate.pending;
    spGate.pending = null;
    spGate.until = 0;
    if (!fn) return;
    try { fn(); } catch (e) { /* ignore */ }
  }
  /** 只占位等待（展开 Morph 动效播完前不接受收起） */
  function spGateHoldOnly(ms) {
    var wait = spGateElapsed(ms);
    if (!wait) return;
    spGate.until = Math.max(spGate.until, Date.now() + wait);
  }
  /** 等动效播完再执行一次状态变更（收起 / 展开）；被抢断则立即执行 */
  function spGateAfter(ms, apply) {
    var wait = spGateElapsed(ms);
    if (!wait) { spGate.until = 0; apply(); return; }
    spGate.until = Date.now() + wait;
    spGate.pending = apply;
    spGate.timer = setTimeout(function () {
      spGate.timer = 0;
      spGate.pending = null;
      spGate.until = 0;
      apply();
    }, wait);
  }
  /** 动效期间的交互：抢断后立即执行（q4-C：点击不丢失，也不等动效播完） */
  function spIntend(fn) {
    if (spGateBusy()) spGateFlush();
    fn();
    return true;
  }

  /** 播放勾选控件动效：on = 变红 + 画勾；off = 收勾 + 褪红（反序） */
  function spPlayCheck(el, on) {
    if (!el || spReduceMotion()) return;
    el.classList.remove('is-draw', 'is-undraw');
    void el.offsetWidth;
    el.classList.add(on ? 'is-draw' : 'is-undraw');
  }
  function spOptBoxEl(sid, key) {
    var root = spEl('comm2StaffSheetRoot');
    if (!root || !sid || !key) return null;
    var btn = root.querySelector('[data-staff-opt="' + key + '"][data-staff-id="' + sid + '"]');
    return btn ? btn.querySelector('.staff-opt__box') : null;
  }
  function spTickEl(sid) {
    var root = spEl('comm2StaffSheetRoot');
    if (!root || !sid) return null;
    return root.querySelector('[data-staff-tick][data-staff-id="' + sid + '"]');
  }
  /** iOS 风格卡片抖动：提醒「工位是必选项、不可点掉」（q1-C：只抖动，不出 toast） */
  function spShakeOpt(sid, key) {
    var root = spEl('comm2StaffSheetRoot');
    if (!root || !sid || !key || spReduceMotion()) return;
    var btn = root.querySelector('[data-staff-opt="' + key + '"][data-staff-id="' + sid + '"]');
    if (!btn) return;
    btn.classList.remove('is-shake');
    void btn.offsetWidth;
    btn.classList.add('is-shake');
    var stop = function () { btn.classList.remove('is-shake'); };
    btn.addEventListener('animationend', stop, { once: true });
    setTimeout(stop, 560);
  }

  /** 选中员工（计入已选）；roleId 为空 = 不分工位（无工位） */
  function spSelectStaff(sid, roleId) {
    var row = spState.row;
    if (row.staffIds.indexOf(sid) < 0) row.staffIds.push(sid);
    row.staffChosen[sid] = true;
    if (roleId) row.staffRoles[sid] = roleId;
    else delete row.staffRoles[sid];
    spState.freshTick = sid;
  }
  /** 取消员工选择（保留「顾客指定」勾选记忆，供「先勾顾客指定、等工位」的待选态使用） */
  function spDropStaff(sid) {
    var row = spState.row;
    row.staffIds = row.staffIds.filter(function (x) { return x !== sid; });
    row.staffChosen[sid] = false;
    delete row.staffRoles[sid];
  }

  /** 应用一次勾选结果（动效播完后调用）。
      按工位：工位为**必选项** —— 未点工位不算已选；「顾客指定」可先勾、保持展开等工位。 */
  function spApplyOptionToggle(sid, key) {
    if (!sid || !key) return;
    spEnsureState();
    var row = spState.row;
    var opt = spOptionByKey(key);
    if (!opt) return;
    var checked = spOptionChecked(sid, opt);
    var keepOpen = false;

    if (opt.kind === 'extra') {
      if (checked) {
        /* 取消「顾客指定」：不分工位 → 退回「普通」并收起（员工仍为已选）；
           按工位 → 已有工位则退回仅工位并收起；尚无工位（待选态）则**保持展开**等工位（员工仍未选） */
        row.staffExtra[sid] = false;
        if (spNeedStation()) {
          if (!spStaffIsChosen(sid)) { spDropStaff(sid); keepOpen = true; }
        } else if (!spStaffIsChosen(sid)) {
          spDropStaff(sid);
        }
      } else {
        row.staffExtra[sid] = true;
        if (spNeedStation() && !row.staffRoles[sid]) {
          spDropStaff(sid);
          keepOpen = true;                    /* 等工位：保持展开 */
        } else {
          spSelectStaff(sid, spNeedStation() ? row.staffRoles[sid] : null);
        }
      }
    } else if (opt.kind === 'plain') {
      row.staffExtra[sid] = false;
      if (checked) spDropStaff(sid);          /* 取消「普通」→ 取消该员工选择 */
      else spSelectStaff(sid, null);
    } else if (checked) {
      /* 工位不可点掉（q1-C）：已在 spTapOption 抖动提醒，这里兜底不动状态 */
      return;
    } else {
      spSelectStaff(sid, key);                /* 工位单选：勾新的即替换旧的 */
    }

    spState.edit = keepOpen ? { staffId: sid, splitting: false, opened: true } : null;
    spHaptic();
    spRedraw();
  }

  /** 点展开态选项卡：勾选 / 取消勾选；勾选动效播完才收起或展开（新交互会抢断当前动效） */
  function spTapOption(sid, key) {
    if (!sid || !key) return;
    if (!spState.edit || spState.edit.staffId !== sid) return;
    if (spGateBusy()) spGateFlush();                 /* q4-C：抢断进行中的动效 */
    var opt = spOptionByKey(key);
    if (!opt) return;
    var checked = spOptionChecked(sid, opt);
    /* 工位是必选项：再点已勾选的工位**不取消**，改用 iOS 抖动动效提醒（q1-C） */
    if (checked && opt.kind === 'role') { spShakeOpt(sid, key); spHaptic(); return; }
    /* 切换工位：旧勾先反序收回，再画新勾（q3） */
    var prevKey = opt.kind === 'role' ? spState.row.staffRoles[sid] : null;
    var prevBox = (prevKey && prevKey !== key) ? spOptBoxEl(sid, prevKey) : null;
    if (prevBox) {
      spPlayCheck(prevBox, false);
      var nextBox = spOptBoxEl(sid, key);
      var delay = spGateElapsed(SP_CHECK_MS);
      if (delay) setTimeout(function () { spPlayCheck(nextBox, true); }, delay);
      else spPlayCheck(nextBox, true);
      spGateAfter(SP_CHECK_MS * 2, function () { spApplyOptionToggle(sid, key); });
      return;
    }
    spPlayCheck(spOptBoxEl(sid, key), !checked);
    spGateAfter(SP_CHECK_MS, function () { spApplyOptionToggle(sid, key); });
  }

  /** 收缩态员工卡右侧「取消选择」：反序播放动效后再取消 */
  function spUntickStaff(sid, tickEl) {
    if (!sid) return;
    if (spGateBusy()) spGateFlush();                 /* q4-C：抢断 */
    spPlayCheck(tickEl || spTickEl(sid), false);
    spGateAfter(SP_CHECK_MS, function () { spRemoveStaff(sid); });
  }

  /** 态4（不分工位 + 未开顾客指定）：点卡片即勾选（勾选控件画出）/ 已选再点即取消 */
  function spToggleStaff(sid) {
    if (!sid) return;
    spEnsureState();
    if (spStaffIsChosen(sid)) { spUntickStaff(sid, null); return; }
    spState.row.staffExtra[sid] = false;
    spSelectStaff(sid, null);
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
  function spCardOrigin(index) {
    var col = index % 3;
    if (col === 0) return 'left center';
    if (col === 2) return 'right center';
    return 'center center';
  }

  /** 展开态：整行横向平铺 N 个卡片按钮；每张右上角一个勾选控件（未勾选 → 空心） */
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
    var tickSvg = SP_CHECK_SVG;
    var cards = pool.map(function (st, index) {
      var done = it.staffIds.indexOf(st.id) >= 0;
      var isEdit = !!(edit && edit.staffId === st.id);
      var dim = !!(edit && !isEdit);
      var origin = spCardOrigin(index);
      var originSide = index % 3 === 0 ? 'left' : index % 3 === 2 ? 'right' : 'center';
      var body = '';
      if (isEdit) {
        body = spOptionsPanelHtml(st.id);
      } else {
        body = spAvatarHtml(st) +
          '<div class="staff-card__name">' + spEsc(st.name) + '</div>' +
          spCardPickLineHtml(st, done);
      }
      /* 勾选控件（右侧、稍放大）：仅已勾选显示；点它取消选择。
         freshTick = 刚被选中的员工 → 勾从左到右画出（与选项卡上的动效衔接） */
      var fresh = spState.freshTick === st.id;
      var tickBtn = (done && !isEdit)
        ? '<button type="button" class="staff-card__tick' + (fresh ? ' is-draw' : '') + '" data-staff-tick data-staff-id="' + spEsc(st.id) +
          '" aria-pressed="true" aria-label="取消选择 ' + spEsc(st.name) + '">' + tickSvg + '</button>'
        : '';
      if (isEdit) {
        return '<div class="staff-card is-editing' + (done ? ' is-done' : '') + (edit.splitting ? ' is-splitting' : '') +
          (edit.opened ? ' is-opened' : '') + '"' +
          ' style="--staff-origin:' + origin + '"' +
          ' data-origin="' + originSide + '"' +
          ' data-staff-card data-staff-id="' + spEsc(st.id) + '">' +
          '<div class="staff-card__panel" data-face="opts">' + body + '</div>' +
          '</div>';
      }
      return '<div class="staff-card' + (done ? ' is-done' : '') + (dim ? ' is-dim' : '') + '"' +
        ' style="--staff-origin:' + origin + '"' +
        ' data-origin="' + originSide + '"' +
        ' data-staff-card data-staff-id="' + spEsc(st.id) + '">' +
        tickBtn +
        '<button type="button" class="staff-card__panel" data-staff-card-hit data-staff-id="' + spEsc(st.id) + '" aria-label="' + spEsc(st.name) + '">' +
        body +
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

    /* 已展开卡片的重绘（勾选态更新）：不重播入场动画，直接落位 */
    var alreadyOpen = editing.classList.contains('is-opened');
    editing.style.zIndex = '6';
    if (reduce || alreadyOpen) {
      editing.classList.add('is-expanding');
      applyFinalLayout(false);
      if (alreadyOpen && !reduce) {
        requestAnimationFrame(function () {
          if (grid._staffMorphToken !== token) return;
          editing.style.transition = springTrans;
        });
      }
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
        }, spReduceMotion() ? 0 : 420);
      }
      /* 刚画完勾的标记只用于这一次渲染，清掉后重绘即回到静态已勾选态 */
      if (spState.freshTick) {
        setTimeout(function () { spState.freshTick = null; }, spReduceMotion() ? 0 : 620);
      }
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
    if (!needS && needE) return '可多选员工；点卡片后勾选「普通」或「顾客指定」（顾客指定提成另计）。';
    if (needS && !needE) return '可多选员工；点卡片后勾选工位（' + spStationLabelsJoined() + '），工位单选。';
    return '可多选员工；点卡片后勾选工位（' + spStationLabelsJoined() + '），工位单选；「顾客指定」可与任一工位同时勾选，顾客指定提成叠加。';
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
    spState.freshTick = null;
    spRenderSheet();
    var mask = spEl('comm2StaffSheetMask');
    if (mask) mask.classList.add('open');
  }
  function spCloseSheet() {
    var mask = spEl('comm2StaffSheetMask');
    if (mask) mask.classList.remove('open');
    spState.edit = null;
    spState.freshTick = null;
    spRenderScreen();
  }

  function spOpen() {
    spState.edit = null;
    spState.freshTick = null;
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
    spState.edit = { staffId: sid, splitting: true, opened: false };
    spHaptic();
    spGateHoldOnly(SP_EXPAND_MS);   /* 展开 Morph 动效播完前不接受收起（点击排队） */
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
      if (!inSheet && !inScreen) return;

      if (t.closest('[data-staff-scrim]')) {
        spIntend(function () {
          spState.edit = null;
          spRedraw();
        });
        return;
      }

      var sumDel = t.closest('[data-staff-summary-del]');
      if (sumDel) {
        e.preventDefault(); e.stopPropagation();
        spRemoveStaff(sumDel.getAttribute('data-staff-id'));
        return;
      }

      /* 勾选控件（右侧）：反序播放动效后取消选择 */
      var tickBtn = t.closest('[data-staff-tick]');
      if (tickBtn) {
        e.preventDefault(); e.stopPropagation();
        spUntickStaff(tickBtn.getAttribute('data-staff-id'), tickBtn);
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
          spIntend(function () {
            spState.edit = null;
            spHaptic();
            spRedraw();
          });
          return;
        }
        spIntend(function () { spEnterEdit(hSid); });
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
