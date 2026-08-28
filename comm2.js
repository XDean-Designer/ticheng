/* ==== comm2 · 实验版提成设置（可整模块删除） ==== */
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
    avg: '开单不分工位，按点客/散客统一提成',
    station: '大/中/小工在分类里分别设提成'
  };
  var COMM2_QUICK_OV_ID = 'ov_sys_quick';
  var COMM2_QUICK_REF = 'quick';
  var COMM2_STAFF_IDS = ['st1', 'st2', 'st3', 'st4', 'st5'];
  var COMM2_STAFF_FALLBACK = {
    st1: '林屿森', st2: '何苏叶', st3: '阿Ken', st4: 'Lisa', st5: '张明'
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
    if (typeof openWorkbench === 'function') openWorkbench();
    else show('screen-workbench');
  }
  function openDialog(id) { var el = $(id); if (el) el.classList.add('show'); }
  function closeDialog(id) { var el = $(id); if (el) el.classList.remove('show'); }
  function openSheet(id) { var el = $(id); if (el) el.classList.add('open'); }
  function closeSheet(id) { var el = $(id); if (el) el.classList.remove('open'); }

  function defaultPair() {
    return { designated: 10, nonDesignated: 10, designatedAmt: 0, nonDesignatedAmt: 0 };
  }
  function defaultCatRule(stationIds) {
    var ids = stationIds || COMM2_STATIONS.map(function (s) { return s.id; });
    var stations = {};
    ids.forEach(function (id) { stations[id] = defaultPair(); });
    return Object.assign(defaultPair(), { valueMode: 'pct', stations: stations });
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
    ids.forEach(function (sid) {
      if (!rule.stations[sid]) rule.stations[sid] = defaultPair();
    });
    ['designated', 'nonDesignated', 'designatedAmt', 'nonDesignatedAmt'].forEach(function (k) {
      if (!Number.isFinite(Number(rule[k]))) rule[k] = defaultPair()[k];
    });
    return rule;
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
      line.name === '快速消费' ||
      line.category === '快速消费';
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
      existing.title = '快速消费';
      existing.targets = [{ kind: 'project', refId: COMM2_QUICK_REF, name: '快速消费' }];
      ensurePayScopeBlock(existing);
      existing.rule = ensureCat(existing.rule, ids);
      return existing;
    }
    var snap = cloneBlockSnapshot(sch.defaults.labor, ids);
    var row = {
      id: COMM2_QUICK_OV_ID,
      system: true,
      belongCat: 'labor',
      title: '快速消费',
      payScope: snap.payScope,
      baseMode: snap.baseMode,
      pickMode: snap.pickMode,
      rule: snap.rule,
      targets: [{ kind: 'project', refId: COMM2_QUICK_REF, name: '快速消费' }]
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
    return sch;
  }
  function catRulePct(des, non, stationMap) {
    var r = defaultCatRule();
    r.designated = des;
    r.nonDesignated = non;
    COMM2_STATIONS.forEach(function (s) {
      if (stationMap && stationMap[s.id]) {
        r.stations[s.id] = {
          designated: stationMap[s.id][0],
          nonDesignated: stationMap[s.id][1],
          designatedAmt: 0,
          nonDesignatedAmt: 0
        };
      } else {
        r.stations[s.id] = { designated: des, nonDesignated: non, designatedAmt: 0, nonDesignatedAmt: 0 };
      }
    });
    return r;
  }
  function catRuleAmt(desAmt, nonAmt) {
    var r = defaultCatRule();
    r.valueMode = 'amount';
    r.designatedAmt = desAmt;
    r.nonDesignatedAmt = nonAmt;
    COMM2_STATIONS.forEach(function (s) {
      r.stations[s.id] = { designated: 0, nonDesignated: 0, designatedAmt: desAmt, nonDesignatedAmt: nonAmt };
    });
    return r;
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
        rule: s.rule || catRulePct(10, 10)
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
        rule: catRulePct(18, 15),
        targets: [{ kind: 'project', refId: 'p21', name: '深层补水护理' }]
      }),
      overrideRow({
        id: 'ov_flagship_combo',
        belongCat: 'labor',
        title: '染发、烫发、剑琅玻尿酸精华液',
        payScope: ['cash', 'memberCard', 'groupBuy'],
        rule: catRulePct(20, 15),
        targets: [
          { kind: 'project', refId: 'p6', name: '染发' },
          { kind: 'project', refId: 'p8', name: '烫发' },
          { kind: 'product', refId: 'pd19', name: '剑琅玻尿酸精华液' }
        ]
      }),
      overrideRow({
        id: 'ov_flagship_vip_issue',
        belongCat: 'issue',
        title: '尊享组合卡 · 办卡',
        payScope: ['cash', 'groupBuy'],
        rule: catRulePct(12, 10),
        targets: [{ kind: 'card', refId: 'demo_vip_combo', name: '尊享组合卡', cardRole: 'issue' }]
      }),
      overrideRow({
        id: 'ov_flagship_groupbuy',
        belongCat: 'labor',
        title: '团购体验',
        payScope: ['groupBuy'],
        rule: catRuleAmt(5, 5),
        targets: [{ kind: 'project', refId: 'p19', name: '洗头' }]
      }),
      overrideRow({
        id: 'ov_flagship_tang',
        belongCat: 'labor',
        title: '烫染',
        payScope: ['cash', 'memberCard'],
        pickMode: 'station',
        rule: catRulePct(10, 10, { senior: [20, 15], mid: [15, 12], junior: [10, 10] }),
        targets: [{ kind: 'group', refId: 'g_proj_tang', name: '烫染', groupKind: 'project' }]
      })
    ];
    return [
      defaultScheme({
        id: 'c2_advisor',
        name: '顾问标准提成',
        defaults: buildDefaults({
          labor: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(12, 10) },
          sales: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(10, 10) },
          issue: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0, 0) },
          card: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0, 0) }
        }),
        overrides: [],
        assigneeIds: ['st1', 'st2']
      }),
      defaultScheme({
        id: 'c2_cardpay',
        name: '卡付劳动专项',
        defaults: buildDefaults({
          labor: { payScope: ['memberCard'], rule: catRulePct(3, 3) },
          sales: { payScope: ['memberCard'], rule: catRulePct(3, 3) },
          issue: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0, 0) },
          card: { payScope: ['cash', 'memberCard', 'groupBuy'], rule: catRulePct(0, 0) }
        }),
        overrides: [],
        assigneeIds: ['st3']
      }),
      defaultScheme({
        id: 'c2_flagship',
        name: '资深技师综合方案',
        defaults: buildDefaults({
          labor: {
            payScope: ['cash', 'memberCard'],
            pickMode: 'station',
            rule: catRulePct(10, 10, { senior: [15, 12], mid: [12, 10], junior: [8, 8] })
          },
          sales: {
            payScope: ['cash', 'memberCard', 'groupBuy'],
            baseMode: 'paid',
            rule: catRulePct(10, 10)
          },
          issue: {
            payScope: ['cash', 'groupBuy'],
            rule: catRulePct(15, 12)
          },
          card: {
            payScope: ['cash'],
            rule: catRulePct(8, 8)
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
  function fmtVal(v, isAmt) {
    return isAmt ? ('¥' + v) : (v + '%');
  }
  function formatPairFlat(rule, isAmt) {
    rule = ensureCat(rule);
    var des = pairVal(rule, isAmt, 'designated', 'designatedAmt');
    var non = pairVal(rule, isAmt, 'nonDesignated', 'nonDesignatedAmt');
    return '点客' + fmtVal(des, isAmt) + '·散客' + fmtVal(non, isAmt);
  }
  function formatPairFlatHtml(rule, isAmt) {
    rule = ensureCat(rule);
    var des = pairVal(rule, isAmt, 'designated', 'designatedAmt');
    var non = pairVal(rule, isAmt, 'nonDesignated', 'nonDesignatedAmt');
    return '<span class="comm2-cat__lbl">点客</span><strong>' + fmtVal(des, isAmt) + '</strong>' +
      '<span class="comm2-cat__dot">·</span>' +
      '<span class="comm2-cat__lbl">散客</span><strong>' + fmtVal(non, isAmt) + '</strong>';
  }
  function formatStationPair(sch, st, isAmt) {
    var des = pairVal(st, isAmt, 'designated', 'designatedAmt');
    var non = pairVal(st, isAmt, 'nonDesignated', 'nonDesignatedAmt');
    return fmtVal(des, isAmt) + '·' + fmtVal(non, isAmt);
  }
  function formatBlockSummary(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var isAmt = block.rule.valueMode === 'amount';
    if (block.pickMode === 'station') {
      return getStationIds(sch).map(function (sid) {
        return stationLabel(sch, sid) + ' ' + formatStationPair(sch, block.rule.stations[sid] || defaultPair(), isAmt);
      }).join('；');
    }
    return formatPairFlat(block.rule, isAmt);
  }
  function formatBlockSummaryHtml(sch, block) {
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var isAmt = block.rule.valueMode === 'amount';
    if (block.pickMode === 'station') {
      return getStationIds(sch).map(function (sid) {
        var st = block.rule.stations[sid] || defaultPair();
        return '<div class="comm2-rule-card__params-row"><span>' + esc(stationLabel(sch, sid)) + '</span><strong>' + esc(formatStationPair(sch, st, isAmt)) + '</strong></div>';
      }).join('');
    }
    return '<div class="comm2-rule-card__params-row comm2-rule-card__params-row--flat"><span>提成参数</span><strong>' + formatPairFlatHtml(block.rule, isAmt) + '</strong></div>';
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

  function schemeOwningStaff(staffId, exceptSchemeId) {
    for (var i = 0; i < store.schemes.length; i++) {
      var s = store.schemes[i];
      if (exceptSchemeId && s.id === exceptSchemeId) continue;
      if ((s.assigneeIds || []).indexOf(staffId) >= 0) return s;
    }
    return null;
  }

  function enforceExclusiveAssignees(showTip) {
    var seen = {};
    var cleaned = false;
    store.schemes.forEach(function (s) {
      normalizeScheme(s);
      s.assigneeIds = (s.assigneeIds || []).filter(function (id) {
        if (seen[id]) { cleaned = true; return false; }
        seen[id] = true;
        return true;
      });
    });
    if (cleaned && showTip && !store._assigneeCleanedToast) {
      store._assigneeCleanedToast = true;
      toast('已按一人一方案自动整理');
    }
    return cleaned;
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
    tip.innerHTML = '<span class="comm2-unassigned__text">还有 <strong>' + ids.length + '</strong> 人未分配提成</span>' +
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
    var menuSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';
    root.innerHTML = store.schemes.map(function (s) {
      var n = (s.assigneeIds || []).length;
      var assignLabel = n ? s.assigneeIds.map(comm2StaffName).join(' · ') : '未分配';
      var parts = formatSchemeRuleParts(s);
      var ruleHtml = parts.map(function (p, i) {
        return '<span class="emp-comm-card__rule-part">' + (i ? ' · ' : '') + esc(p) + '</span>';
      }).join('');
      var scopeTags = '';
      return '<div class="emp-comm-card comm2-scheme" data-comm2-card="' + esc(s.id) + '">' +
        '<button type="button" class="emp-comm-card__edit" data-comm2-open="' + esc(s.id) + '">' +
        '<div class="emp-comm-card__top"><div class="emp-comm-card__who">' +
        '<span class="emp-comm-card__icon" aria-hidden="true"><img src="assets/workbench/commission.png" alt="" width="40" height="40"></span>' +
        '<span class="emp-comm-card__title-wrap">' +
        '<span class="emp-comm-card__name">' + esc(s.name) + '</span>' +
        '</span></div></div>' +
        '<div class="emp-comm-card__rule"><span class="emp-comm-card__rule-lbl">提成规则</span>' +
        '<span class="emp-comm-card__rule-val">' + ruleHtml + '</span></div></button>' +
        '<button type="button" class="emp-comm-card__assign" data-comm2-assign="' + esc(s.id) + '">' +
        '<span>已分配</span><span class="emp-comm-card__assign-val">' + esc(assignLabel) + '</span></button>' +
        '<button type="button" class="emp-comm-card__menu" data-comm2-menu="' + esc(s.id) + '" aria-label="更多">' + menuSvg + '</button></div>';
    }).join('');
  }

  function twinHtml(prefix, pair, isAmt, aria) {
    pair = pair || defaultPair();
    var desKey = isAmt ? 'designatedAmt' : 'designated';
    var nonKey = isAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    var desVal = pair[desKey];
    var nonVal = pair[nonKey];
    var desLbl = isAmt ? '点客金额' : '点客比例';
    var nonLbl = isAmt ? '散客金额' : '散客比例';
    return '<div class="comm2-twins" role="group" aria-label="' + esc(aria || '点客与散客') + '">' +
      '<div class="comm2-cap comm2-cap--des"><span class="comm2-cap__label">' + esc(desLbl) + '</span>' +
      '<div class="comm2-cap__field">' +
      (isAmt ? '<span class="comm2-cap__unit">¥</span>' : '') +
      '<input class="input-amount" type="text" data-comm2-field="' + prefix + desKey + '" value="' + esc(desVal) + '" inputmode="decimal" aria-label="' + esc(desLbl) + '" />' +
      (isAmt ? '' : '<span class="comm2-cap__unit">%</span>') +
      '</div></div>' +
      '<div class="comm2-cap comm2-cap--non"><span class="comm2-cap__label">' + esc(nonLbl) + '</span>' +
      '<div class="comm2-cap__field">' +
      (isAmt ? '<span class="comm2-cap__unit">¥</span>' : '') +
      '<input class="input-amount" type="text" data-comm2-field="' + prefix + nonKey + '" value="' + esc(nonVal) + '" inputmode="decimal" aria-label="' + esc(nonLbl) + '" />' +
      (isAmt ? '' : '<span class="comm2-cap__unit">%</span>') +
      '</div></div></div>';
  }

  function flashEl(el) {
    if (!el) return;
    el.classList.add('is-flash');
    setTimeout(function () { el.classList.remove('is-flash'); }, 700);
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

  function barScopeCapsulesHtml(block) {
    ensurePayScopeBlock(block);
    var labels = payScopeLabelsBlock(block);
    if (!labels.length) return '<span class="comm2-rule-bar__cap is-empty">—</span>';
    return labels.map(function (lab) {
      return '<span class="comm2-rule-bar__cap">' + esc(lab) + '</span>';
    }).join('');
  }

  function barBaseShort(block) {
    if (block.rule && block.rule.valueMode === 'amount') return '固定';
    return block.baseMode === 'paid' ? '实收' : '原价';
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
      '<button type="button" class="comm2-base-seg__btn' + (isStation ? ' on comm2-base-seg__btn--station' : '') + '" data-comm2-sheet-pick="station">' +
      '<span class="comm2-base-seg__lbl">按工位分配</span>' +
      (isStation ? '<span class="comm2-base-seg__gear" aria-hidden="true">' + gearSvg() + '</span>' : '') +
      '</button></div>';
  }

  function barStationParamsHtml(sch, block) {
    var parts = formatBlockSummary(sch, block).split('；').filter(function (s) { return s.trim(); });
    if (parts.length <= 1) return esc(parts[0] || formatBlockSummary(sch, block));
    return parts.map(function (seg) {
      return '<span class="comm2-rule-bar__param-seg">' + esc(seg.trim()) + '</span>';
    }).join('');
  }

  function barParamsHtml(sch, block) {
    if (block.pickMode !== 'station') return esc(formatBlockSummary(sch, block));
    return barStationParamsHtml(sch, block);
  }

  function renderRuleCard(sch, opts) {
    var block = opts.block;
    var target = opts.target;
    var title = opts.title;
    var iconKey = opts.iconKey || 'labor';
    var isOv = !!opts.deletable;
    var isStation = block.pickMode === 'station';
    var isAmt = !!(block.rule && block.rule.valueMode === 'amount');
    var baseCls = isAmt ? 'is-fixed' : (block.baseMode === 'paid' ? 'is-paid' : 'is-list');
    var vmodeHtml = '<div class="comm2-rule-bar__vmode" role="radiogroup" aria-label="提成参数（评审切换）">' +
      '<button type="button" class="comm2-rule-bar__vmode-btn' + (!isAmt ? ' on' : '') + '" data-comm2-bar-valmode="pct">比例%</button>' +
      '<button type="button" class="comm2-rule-bar__vmode-btn' + (isAmt ? ' on' : '') + '" data-comm2-bar-valmode="amount">固定¥</button></div>';
    var delBtn = isOv
      ? '<button type="button" class="comm2-rule-bar__del" data-comm2-override-del="' + esc(opts.ovId) + '" aria-label="删除">' + trashSvg() + '</button>'
      : '';
    return '<article class="comm2-rule-bar' + (isOv ? ' is-override' : ' is-default') + (isStation ? ' is-station' : '') + '" data-comm2-rule-card="' + esc(target) + '">' +
      '<button type="button" class="comm2-rule-bar__main" data-comm2-card-open="' + esc(target) + '">' +
      '<div class="comm2-rule-bar__row1">' +
      '<h2 class="comm2-rule-bar__title">' + catIconSvg(iconKey) +
      (isOv
        ? '<span class="comm2-rule-bar__title-txt" title="' + esc(title) + '">' + esc(title) + '</span>'
        : esc(title)) +
      '</h2>' +
      '<div class="comm2-rule-bar__caps" aria-label="提成范围">' + barScopeCapsulesHtml(block) + '</div>' +
      '</div>' +
      '<div class="comm2-rule-bar__row2">' +
      '<span class="comm2-rule-bar__base ' + baseCls + '">' + esc(barBaseShort(block)) + '</span>' +
      '<span class="comm2-rule-bar__params">' + barParamsHtml(sch, block) + '</span>' +
      chevSvg() +
      '</div></button>' +
      vmodeHtml +
      delBtn + '</article>';
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
      title: '快速消费',
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

  // 规则卡上「比例 ↔ 固定」评审切换（标签「固定」随提成参数显示）
  function setBarValMode(target, mode) {
    var sch = editing();
    var block = sch ? getCardBlock(sch, target) : null;
    if (!block) return;
    var rule = ensureCat(block.rule, getStationIds(sch));
    var want = mode === 'amount' ? 'amount' : 'pct';
    if (rule.valueMode === want) return;
    rule.valueMode = want;
    var seedStation = function (st) {
      if (want === 'amount') {
        // 未设固定金额时按当前比例示意
        if (!(Number(st.designatedAmt) || 0) && !(Number(st.nonDesignatedAmt) || 0)) {
          st.designatedAmt = Math.round(Number(st.designated) || 0);
          st.nonDesignatedAmt = Math.round(Number(st.nonDesignated) || 0);
        }
      } else if ((Number(st.designatedAmt) || 0) || (Number(st.nonDesignatedAmt) || 0)) {
        // 未设比例（默认 10/10）时按当前金额示意
        if (Number(st.designated) === 10 && Number(st.nonDesignated) === 10) {
          st.designated = Math.round(Number(st.designatedAmt) || 0);
          st.nonDesignated = Math.round(Number(st.nonDesignatedAmt) || 0);
        }
      }
    };
    if (block.pickMode === 'station') {
      getStationIds(sch).forEach(function (sid) {
        seedStation(rule.stations[sid] || (rule.stations[sid] = defaultPair()));
      });
    } else {
      seedStation(rule);
    }
    block.rule = rule;
    markDirty();
    renderEditCards(sch);
    maybeRefreshOpenCardSheet();
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
    enforceExclusiveAssignees(true);
    renderList();
    show('screen-comm2-list');
    goNav('comm2-list');
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

  /* ==== 试算引擎：按行 payScope 过滤 → 一人一方案计提 ==== */

  var COMM2_TRIAL_LINES = [
    { id: 'tl1', name: '开卡 · 尊享组合卡', cat: 'issue', kind: 'card', refId: 'demo_vip_combo', cardRole: 'issue', pay: 'cash', list: 2000, paid: 2000, designated: true },
    { id: 'tl2', name: '充卡 · 老客续充', cat: 'card', pay: 'cash', list: 1000, paid: 1000, designated: true },
    { id: 'tl3', name: '深层补水护理', cat: 'labor', kind: 'project', refId: 'p21', pay: 'memberCard', list: 268, paid: 268, designated: true },
    { id: 'tl4', name: '染发', cat: 'labor', kind: 'project', refId: 'p6', pay: 'cash', list: 358, paid: 358, designated: true, station: 'senior' },
    { id: 'tl5', name: '剑琅玻尿酸精华液', cat: 'sales', kind: 'product', refId: 'pd19', pay: 'memberCard', list: 198, paid: 198, designated: true },
    { id: 'tl6', name: '团购体验 · 洗头', cat: 'labor', kind: 'project', refId: 'p19', pay: 'groupBuy', list: 28, paid: 28, designated: false },
    { id: 'tl7', name: '卡付 · 时尚洗吹', cat: 'labor', kind: 'project', refId: 'p1', pay: 'memberCard', list: 58, paid: 58, designated: false },
    { id: 'tl8', name: '快速消费', cat: 'labor', kind: 'quick', refId: 'quick', pay: 'cash', list: 98, paid: 98, designated: true }
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
        /* 快速消费：业务上是项目覆盖项；开单行可能是 kind=quick */
        if (t.kind === 'project' && t.refId === COMM2_QUICK_REF && isQuickLine(line)) return ov;
        if (t.kind === line.kind && t.refId === line.refId) return ov;
      }
    }
    if (isQuickLine(line)) return ensureSystemQuickOverride(sch);
    return sch.defaults[cat] || sch.defaults.labor;
  }

  function lineBaseAmount(block, line) {
    return block.baseMode === 'paid' ? (Number(line.paid) || 0) : (Number(line.list) || 0);
  }

  function schemeLineAmount(sch, line) {
    normalizeScheme(sch);
    var block = resolveLineBlock(sch, line);
    ensurePayScopeBlock(block);
    if (!block.payScope[line.pay]) return { amount: 0, skipped: 'scope', rateLabel: '' };
    var rule = ensureCat(block.rule, getStationIds(sch));
    var isAmt = rule.valueMode === 'amount';
    var pair = rule;
    if (block.pickMode === 'station') {
      var stId = line.station || getStationIds(sch)[0];
      pair = rule.stations[stId] || defaultPair();
    }
    var rate = line.designated
      ? pairVal(pair, isAmt, 'designated', 'designatedAmt')
      : pairVal(pair, isAmt, 'nonDesignated', 'nonDesignatedAmt');
    var base = lineBaseAmount(block, line);
    var amount = isAmt ? rate : Math.round(base * rate) / 100;
    return {
      amount: amount,
      skipped: '',
      rateLabel: isAmt ? ('¥' + rate) : (rate + '%'),
      base: base
    };
  }

  function calcStaffTrial(staffId, lines) {
    var schemes = schemesForStaff(staffId);
    var rows = (lines || COMM2_TRIAL_LINES).map(function (line) {
      var cands = [];
      schemes.forEach(function (sch) {
        var r = schemeLineAmount(sch, line);
        if (r.skipped) {
          cands.push({ schemeId: sch.id, schemeName: sch.name, amount: 0, skipped: r.skipped, rateLabel: '—', note: '支付方式不在范围' });
          return;
        }
        cands.push({
          schemeId: sch.id,
          schemeName: sch.name,
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
        if (!winner || c.amount > winner.amount) winner = c;
      });
      return {
        line: line,
        cands: cands,
        winner: winner,
        amount: winner ? winner.amount : 0
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
    if (input) input.value = mode === 'rename' && sch ? sch.name : '';
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

  function pickItemConfigured(sch, type, itemId, cardRole) {
    var covered = coveredTargetKeys(sch);
    var ikey = type === 'card'
      ? ('card:' + itemId + ':' + (cardRole || 'issue'))
      : ('item:' + type + ':' + itemId);
    if (covered[ikey]) return true;
    return comm2Groups(type).some(function (g) {
      var gkey = 'group:' + type + ':' + g.id;
      return covered[gkey] && (g.itemIds || []).indexOf(itemId) >= 0;
    });
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
      var owner = schemeOwningStaff(s.id, store._assignId);
      var locked = !!owner;
      var on = !locked && !!sel[s.id];
      if (locked && sel[s.id]) delete sel[s.id];
      return '<button type="button" class="emp-assign-card' + (on ? ' on' : '') + (locked ? ' is-locked' : '') + '"' +
        (locked ? ' disabled' : '') +
        ' data-comm2-assign-tog="' + esc(s.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
        (locked ? ' aria-disabled="true"' : '') + '>' +
        comm2AvatarHtml(s) +
        '<span class="emp-assign-card__meta"><span class="emp-assign-card__name">' + esc(s.name) + '</span>' +
        '<span class="emp-assign-card__role">' +
        (locked ? ('已在「' + esc(owner.name) + '」') : esc(s.role || '未设置职位')) +
        '</span></span>' +
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
      if (!schemeOwningStaff(sid, id)) store._assignSel[sid] = true;
    });
    renderComm2Assign();
    openSheet('comm2AssignMask');
  }

  function applyComm2Assign() {
    var sch = schemeById(store._assignId);
    if (!sch) return;
    var ids = Object.keys(store._assignSel || {}).filter(function (k) { return store._assignSel[k]; });
    for (var i = 0; i < ids.length; i++) {
      var owner = schemeOwningStaff(ids[i], sch.id);
      if (owner) {
        toast(comm2StaffName(ids[i]) + ' 已在「' + owner.name + '」', true);
        return;
      }
    }
    sch.assigneeIds = ids;
    closeSheet('comm2AssignMask');
    toast(ids.length ? ('已分配 ' + ids.length + ' 人') : '已清空分配');
    renderList();
  }

  function gearSvg() {
    return '<svg class="comm2-base-seg__gear-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
      '</svg>';
  }

  function sheetRowHtml(lbl, ctrlHtml, cls) {
    return '<div class="comm2-sheet-row' + (cls ? ' ' + cls : '') + '">' +
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
    var isAmt = store._sheetMode === 'amount';
    var modeHtml = '<div class="comm2-sheet-mode comm2-sheet-mode--inline comm2-sheet-ctrl" role="radiogroup" aria-label="提成取值">' +
      '<button type="button" class="comm2-sheet-mode__btn' + (!isAmt ? ' on' : '') + '" data-comm2-valmode="pct">按比例 %</button>' +
      '<button type="button" class="comm2-sheet-mode__btn' + (isAmt ? ' on' : '') + '" data-comm2-valmode="amount">固定金额 ¥</button></div>';
    var html = sheetRowHtml('提成参数', modeHtml, 'comm2-sheet-row--params-head');
    html += '<div class="comm2-sheet-params-body">';
    if (block.pickMode === 'station') {
      getStationIds(sch).forEach(function (sid) {
        var st = rule.stations[sid] || defaultPair();
        html += '<div class="comm2-sheet-station comm2-sheet-station--compact">' +
          '<div class="comm2-sheet-station__name"><i class="comm2-sheet-station__dot" aria-hidden="true"></i>' +
          esc(stationLabel(sch, sid)) + '</div>' +
          twinHtml('st.' + sid + '.', st, isAmt, stationLabel(sch, sid)) + '</div>';
      });
    } else {
      html += twinHtml('base.', rule, isAmt, '点客散客');
    }
    html += '</div>';
    return html;
  }

  function renderCardSheetBody(sch, block, opts) {
    opts = opts || {};
    ensurePayScopeBlock(block);
    block.rule = ensureCat(block.rule, getStationIds(sch));
    var html = sheetRowHtml('提成范围', '<div class="comm2-rule-card__scope comm2-sheet-scope">' + sheetScopeChipsHtml(block) + '</div>') +
      sheetRowHtml('计算基数', sheetSegHtml('base', block)) +
      sheetRowHtml('分配模式', sheetSegHtml('pick', block));
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
    var opts = {};
    if (store._sheetContext === 'pick' && store._pickType === 'card') opts.showCardRole = true;
    body.innerHTML = renderCardSheetBody(sch, block, opts);
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs(body);
  }

  function openCardSheet(target) {
    var sch = editing();
    if (!sch) return;
    var block = getCardBlock(sch, target);
    if (!block) return;
    block.rule = ensureCat(block.rule, getStationIds(sch));
    store._sheetContext = 'edit';
    store._cardTarget = target;
    var p = parseCardTarget(target);
    var title = p.type === 'default'
      ? ((COMM2_CATS.find(function (c) { return c.key === p.id; }) || {}).label || '')
      : (block.title || '覆盖');
    store._sheetMode = block.rule.valueMode === 'amount' ? 'amount' : 'pct';
    var titleEl = $('comm2CatSheetTitle');
    var body = $('comm2CatSheetBody');
    if (titleEl) titleEl.textContent = title;
    refreshCardSheetBody();
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.add('open');
  }

  function openPickSettingsSheet() {
    var sch = editing();
    var b = store._pickBundle;
    if (!sch || !b || !b.targets.length) { toast('请先选择规则项', true); return; }
    store._sheetContext = 'pick';
    store._cardTarget = null;
    b.rule = ensureCat(b.rule, getStationIds(sch));
    store._sheetMode = b.rule.valueMode === 'amount' ? 'amount' : 'pct';
    var titleEl = $('comm2CatSheetTitle');
    if (titleEl) titleEl.textContent = '添加规则项 · 设置';
    refreshCardSheetBody();
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.add('open');
  }

  function closeCatSheet() {
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    if (store._sheetContext === 'pick') return;
    store._cardTarget = null;
    store._sheetContext = null;
  }

  function applySheetPairs(block, sch, rule, isAmt) {
    if (block.pickMode === 'station') {
      var ids = getStationIds(sch);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var got = readPairFromPrefix('st.' + id + '.', isAmt);
        if (got.error) return stationLabel(sch, id) + '：' + got.error;
        rule.stations[id] = Object.assign(rule.stations[id] || defaultPair(), got.pair);
      }
    } else {
      var base = readPairFromPrefix('base.', isAmt);
      if (base.error) return base.error;
      Object.assign(rule, base.pair);
    }
    return null;
  }

  function savePickSheet() {
    var sch = editing();
    var b = store._pickBundle;
    if (!sch || !b) { closeCatSheet(); return; }
    if (payScopeCountBlock(b) < 1) { toast('至少选一种支付方式', true); return; }
    var isAmt = store._sheetMode === 'amount';
    var rule = ensureCat(b.rule, getStationIds(sch));
    rule.valueMode = isAmt ? 'amount' : 'pct';
    var err = applySheetPairs(b, sch, rule, isAmt);
    if (err) { toast(err, true); return; }
    b.rule = rule;
    if (!sch.overrides) sch.overrides = [];
    sch.overrides.push({
      id: 'ov_' + Date.now(),
      belongCat: b.belongCat,
      title: b.targets.map(function (t) { return t.name; }).join('、'),
      payScope: JSON.parse(JSON.stringify(b.payScope)),
      baseMode: b.baseMode,
      pickMode: b.pickMode,
      rule: JSON.parse(JSON.stringify(b.rule)),
      targets: b.targets.slice()
    });
    markDirty();
    store._sheetContext = null;
    store._pickSel = {};
    store._pickBundle = null;
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    openEdit(store.editingId);
    toast('已添加规则项');
  }

  function saveCatSheet() {
    var sch = editing();
    if (!sch) { closeCatSheet(); return; }
    if (store._sheetContext === 'pick') { savePickSheet(); return; }
    if (!store._cardTarget) { closeCatSheet(); return; }
    var cardTarget = store._cardTarget;
    var block = getCardBlock(sch, cardTarget);
    if (!block) { closeCatSheet(); return; }
    var isAmt = store._sheetMode === 'amount';
    var rule = ensureCat(block.rule, getStationIds(sch));
    rule.valueMode = isAmt ? 'amount' : 'pct';
    var err = applySheetPairs(block, sch, rule, isAmt);
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

  function readPairFromPrefix(prefix, isAmt) {
    var desKey = isAmt ? 'designatedAmt' : 'designated';
    var nonKey = isAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    var desEl = document.querySelector('#comm2CatSheetBody [data-comm2-field="' + prefix + desKey + '"]');
    var nonEl = document.querySelector('#comm2CatSheetBody [data-comm2-field="' + prefix + nonKey + '"]');
    var des = parseFloat(desEl && desEl.value);
    var non = parseFloat(nonEl && nonEl.value);
    if (!Number.isFinite(des) || des < 0) return { error: '请输入有效的点客' + (isAmt ? '金额' : '比例') };
    if (!Number.isFinite(non) || non < 0) return { error: '请输入有效的散客' + (isAmt ? '金额' : '比例') };
    if (!isAmt && (des > 100 || non > 100)) return { error: '比例需在 0–100%' };
    var o = defaultPair();
    if (isAmt) { o.designatedAmt = des; o.nonDesignatedAmt = non; }
    else { o.designated = des; o.nonDesignated = non; }
    return { pair: o };
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
          sub: t.shelved ? '已下架' : ('面值 ¥' + (t.recharge || 0))
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
        sub: '¥' + (it.price != null ? it.price : 0)
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

  function coveredTargetKeys(sch) {
    var out = {};
    (sch.overrides || []).forEach(function (ov) {
      (ov.targets || []).forEach(function (t) {
        if (t.kind === 'group') out['group:' + (t.groupKind || 'project') + ':' + t.refId] = true;
        else if (t.kind === 'card') out['card:' + t.refId + ':' + (t.cardRole || 'issue')] = true;
        else out['item:' + t.kind + ':' + t.refId] = true;
      });
    });
    return out;
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
    var cnt = $('comm2PickCount');
    if (cnt) cnt.innerHTML = '已选 <strong>' + n + '</strong> 项';
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
    var covered = coveredTargetKeys(sch);
    var groups = comm2Groups(type);
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var gkey = 'group:' + type + ':' + g.id;
      if ((covered[gkey] || sel[gkey]) && (g.itemIds || []).indexOf(itemId) >= 0) return true;
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
    var covered = coveredTargetKeys(sch);
    var sel = store._pickSel || {};
    var gid = store._pickGroup;
    var html = '';
    if (gid && gid !== 'all' && type !== 'card') {
      var g = comm2Groups(type).find(function (x) { return x.id === gid; });
      if (g) {
        var gkey = 'group:' + type + ':' + g.id;
        var gOn = !!sel[gkey];
        var gCov = !!covered[gkey];
        html += '<div class="comm2-pick-item-wrap comm2-pick-group-row' + (gOn ? ' on' : '') + (gCov ? ' is-configured' : '') + '">' +
          '<button type="button" class="comm2-pick-item' + (gOn ? ' on' : '') + (gCov ? ' disabled is-configured' : '') + '" data-comm2-pick-group-item="' + esc(g.id) + '"' + (gCov ? ' disabled' : '') + '>' +
          pickCheckHtml(gOn, gCov) +
          '<span class="comm2-pick-item__text"><span class="comm2-pick-item__name">整类 · ' + esc(g.name) + '</span></span></button></div>';
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
        var configured = pickItemConfigured(sch, type, it.id, store._pickBundle && store._pickBundle.cardRole);
        var blocked = pickItemBlocked(sch, type, it.id, sel);
        var disabled = configured || blocked;
        return '<div class="comm2-pick-item-wrap' + (on ? ' on' : '') + (configured ? ' is-configured' : '') + '">' +
          '<button type="button" class="comm2-pick-item' + (on ? ' on' : '') + (disabled ? ' disabled' : '') + (configured ? ' is-configured' : '') + '" data-comm2-pick-item="' + esc(it.id) + '"' + (disabled ? ' disabled' : '') + '>' +
          pickCheckHtml(on, configured) +
          '<span class="comm2-pick-item__text">' +
          '<span class="comm2-pick-item__name">' + esc(it.name) + '</span>' +
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
    if (coveredTargetKeys(sch)[key]) return;
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
    if (coveredTargetKeys(sch)[key]) return;
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
    var mask = $('comm2CatSheetMask');
    if (mask) mask.classList.remove('open');
    openEdit(store.editingId);
  }

  function openRulePick() {
    var sch = editing();
    if (!sch) return;
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
    var sch = editing();
    var ov = sch && (sch.overrides || []).find(function (o) { return o.id === id; });
    if (isQuickOverride(ov)) { toast('系统规则不可删除', true); return; }
    store._overrideDelId = id;
    openDialog('comm2OverrideDelMask');
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
          '<input type="text" maxlength="4" data-comm2-station-input="' + esc(sid) + '" value="' + esc(stationLabel(sch, sid)) + '" />' +
          '<div class="comm2-station-sheet-edit__acts">' +
          '<button type="button" class="comm2-station-sheet-edit__reset" data-comm2-station-reset="' + esc(sid) + '"' + (isStationDefault(sch, sid) ? ' disabled' : '') + '>恢复为默认</button>' +
          '<button type="button" class="comm2-station-sheet-edit__ok" data-comm2-station-ok="' + esc(sid) + '">确定</button></div></div>';
      } else {
        html += '<div class="comm2-station-sheet-row">' +
          '<span class="comm2-station-sheet-row__name">' + esc(stationLabel(sch, sid)) + '</span>' +
          '<span class="comm2-station-sheet-row__acts">' +
          '<button type="button" data-comm2-rename="' + esc(sid) + '">改名</button>' +
          '<button type="button" class="danger" data-comm2-station-del="' + esc(sid) + '"' + (ids.length <= 1 ? ' disabled' : '') + '>删除</button>' +
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

  function addStationRow() {
    toast('不可新增工位', true);
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
    enforceExclusiveAssignees(true);

    $('comm2ListBack') && $('comm2ListBack').addEventListener('click', backWb);
    $('comm2EditBack') && $('comm2EditBack').addEventListener('click', requestComm2Exit);
    $('comm2UnassignedTip') && $('comm2UnassignedTip').addEventListener('click', openUnassignedDialog);
    $('comm2UnassignedOk') && $('comm2UnassignedOk').addEventListener('click', function () { closeDialog('comm2UnassignedMask'); });
    $('comm2UnassignedMask') && $('comm2UnassignedMask').addEventListener('click', function (e) {
      if (e.target === $('comm2UnassignedMask')) closeDialog('comm2UnassignedMask');
    });
    $('comm2HelpBtn') && $('comm2HelpBtn').addEventListener('click', function () { openDialog('comm2HelpMask'); });
    $('comm2HelpOk') && $('comm2HelpOk').addEventListener('click', function () { closeDialog('comm2HelpMask'); });
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
      if (badOv) { toast((isQuickOverride(badOv) ? '「快速消费」' : ('覆盖规则「' + (badOv.title || '未命名') + '」')) + '至少选一种支付方式', true); return; }
      if (store._draft) {
        store.schemes.unshift(store._draft);
        store._draft = null;
        store._snapshot = null;
        store._dirty = false;
      } else {
        store._snapshot = null;
        store._dirty = false;
      }
      toast('提成方案已保存（实验）');
      openList();
    });

    $('comm2EditCards') && $('comm2EditCards').addEventListener('click', function (e) {
      var delBtn = e.target.closest('[data-comm2-override-del]');
      if (delBtn) { requestOverrideDelete(delBtn.getAttribute('data-comm2-override-del')); return; }
      var vmodeBtn = e.target.closest('[data-comm2-bar-valmode]');
      if (vmodeBtn) {
        var vmodeTarget = e.target.closest('[data-comm2-rule-card]');
        setBarValMode(
          vmodeTarget ? vmodeTarget.getAttribute('data-comm2-rule-card') : null,
          vmodeBtn.getAttribute('data-comm2-bar-valmode')
        );
        return;
      }
      var openBtn = e.target.closest('[data-comm2-card-open]');
      if (openBtn) openCardSheet(openBtn.getAttribute('data-comm2-card-open'));
    });

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
    $('comm2NameCancel') && $('comm2NameCancel').addEventListener('click', function () { closeDialog('comm2NameMask'); });
    $('comm2NameOk') && $('comm2NameOk').addEventListener('click', applyComm2Name);
    $('comm2NameMask') && $('comm2NameMask').addEventListener('click', function (e) {
      if (e.target === $('comm2NameMask')) closeDialog('comm2NameMask');
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

    /* 分配员工 sheet */
    $('comm2AssignList') && $('comm2AssignList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-comm2-assign-tog]');
      if (!btn || btn.disabled || btn.classList.contains('is-locked')) return;
      var id = btn.getAttribute('data-comm2-assign-tog');
      if (schemeOwningStaff(id, store._assignId)) {
        toast('该员工已分配到其他方案', true);
        return;
      }
      if (!store._assignSel) store._assignSel = {};
      store._assignSel[id] = !store._assignSel[id];
      renderComm2Assign();
    });
    $('comm2AssignSelectAll') && $('comm2AssignSelectAll').addEventListener('click', function () {
      if (!store._assignSel) store._assignSel = {};
      comm2StaffPool().forEach(function (s) {
        if (schemeOwningStaff(s.id, store._assignId)) return;
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
    $('comm2StationAdd') && $('comm2StationAdd').addEventListener('click', addStationRow);
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
        if (!val) { toast('名称不能为空', true); return; }
        if (!sch.stationLabels[okId]) sch.stationLabels[okId] = {};
        sch.stationLabels[okId].label = val;
        store._stationEditId = null;
        markDirty();
        renderStationSheet();
        renderEditCards(sch);
        maybeRefreshOpenCardSheet();
        return;
      }
      var rst = e.target.closest('[data-comm2-station-reset]');
      if (rst && !rst.disabled) {
        var rstId = rst.getAttribute('data-comm2-station-reset');
        if (sch.stationLabels[rstId]) delete sch.stationLabels[rstId].label;
        store._stationEditId = null;
        markDirty();
        renderStationSheet();
        renderEditCards(sch);
        maybeRefreshOpenCardSheet();
        return;
      }
      var del = e.target.closest('[data-comm2-station-del]');
      if (del && !del.disabled) deleteStationRow(del.getAttribute('data-comm2-station-del'));
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
        var mode = pickBtn.getAttribute('data-comm2-sheet-pick');
        var sch = editing();
        var block = sch ? getSheetBlock(sch) : null;
        if (mode === 'station' && block && block.pickMode === 'station') {
          openStationSheet();
          return;
        }
        setSheetPick(mode);
        return;
      }
      var cardRoleBtn = e.target.closest('[data-comm2-sheet-card-role]');
      if (cardRoleBtn) { setSheetCardRole(cardRoleBtn.getAttribute('data-comm2-sheet-card-role')); return; }
      var btn = e.target.closest('[data-comm2-valmode]');
      if (!btn) return;
      store._sheetMode = btn.getAttribute('data-comm2-valmode') === 'amount' ? 'amount' : 'pct';
      refreshCardSheetBody();
    });

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
    $('comm2PickSelectAll') && $('comm2PickSelectAll').addEventListener('click', function () {
      var sch = editing();
      if (!sch || !store._pickBundle) return;
      var type = store._pickType || 'project';
      var covered = coveredTargetKeys(sch);
      pickVisibleItems().forEach(function (it) {
        var key = type === 'card'
          ? ('card:' + it.id + ':' + store._pickBundle.cardRole)
          : ('item:' + type + ':' + it.id);
        if (covered[key]) return;
        store._pickSel[key] = type === 'card'
          ? { kind: 'card', refId: it.id, name: it.name, cardRole: store._pickBundle.cardRole }
          : { kind: type, refId: it.id, name: it.name };
      });
      rebuildPickTargets();
      store._pickBundle.belongCat = pickBelongCat(type, store._pickBundle.cardRole);
      renderPickScreen();
    });
    $('comm2PickInvert') && $('comm2PickInvert').addEventListener('click', function () {
      var sch = editing();
      if (!sch || !store._pickBundle) return;
      var type = store._pickType || 'project';
      var visible = pickVisibleItems();
      var prefix = type === 'card' ? ('card:') : ('item:' + type + ':');
      visible.forEach(function (it) {
        var key = type === 'card'
          ? ('card:' + it.id + ':' + store._pickBundle.cardRole)
          : ('item:' + type + ':' + it.id);
        if (store._pickSel[key]) delete store._pickSel[key];
        else if (!coveredTargetKeys(sch)[key]) {
          store._pickSel[key] = type === 'card'
            ? { kind: 'card', refId: it.id, name: it.name, cardRole: store._pickBundle.cardRole }
            : { kind: type, refId: it.id, name: it.name };
        }
      });
      rebuildPickTargets();
      renderPickScreen();
    });
  }

  window.Comm2Demo = { openList: openList, openEdit: openEdit, wire: wire, calcStaffTrial: calcStaffTrial };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();