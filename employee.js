/* salary standalone shim */
(function (g) {
  if (!g.INPUT_LIMITS) {
    g.INPUT_LIMITS = {
      PERSON_NAME: 20, REMARK_SHORT: 200, MONEY_MAX: 999999.99,
      YEARS_EXP_MAX: 50, PCT_MAX: 100, PHONE: 11, SCHEME_NAME: 20
    };
  }
  if (typeof g.formatMoneyLimitLabel !== 'function') {
    g.formatMoneyLimitLabel = function () { return '999,999.99'; };
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== EMPLOYEE MODULE JS ==== */
(function () {
  'use strict';

  var GENDERS = ['男', '女'];
  var AGE_BANDS = ['18-23岁', '24-30岁', '30以上'];
  var DEFAULT_ROLES = ['美容师', '美甲师', '美发师', '美睫师', '学徒', '店主', '店长', '助理', '前台'];
  var ROLE_NAME_MAX = 6;
  /** 能力点元数据：prototype 标明原型是否已有对应交互 */
  var PERM_CAP_META = {
    bill: { label: '开单', prototype: 'supported' },
    settle: { label: '结算', prototype: 'supported' },
    flowView: { label: '查看流水单', prototype: 'supported' },
    priceListView: { label: '查看价目表', prototype: 'supported' },
    priceListCreate: { label: '改动价目表', prototype: 'supported' },
    cardItemView: { label: '查看卡项', prototype: 'supported' },
    cardItemCreate: { label: '改动会员卡', prototype: 'supported' },
    billChangePrice: { label: '开单改价', prototype: 'partial' },
    cardIssue: { label: '办新卡', prototype: 'supported' },
    cardRecharge: { label: '充值', prototype: 'supported' },
    cardRenew: { label: '续费/续次', prototype: 'supported' },
    cardExtend: { label: '延期会员卡', prototype: 'supported' },
    cardRefund: { label: '退卡', prototype: 'supported' },
    cardDelete: { label: '删除卡', prototype: 'unsupported' },
    cardBackfill: { label: '补录卡', prototype: 'unsupported' },
    staffCreate: { label: '创建员工', prototype: 'supported' },
    achCommSet: { label: '业绩/提成设置', prototype: 'supported' },
    memberDelete: { label: '删除会员', prototype: 'unsupported' },
    memberPhoneView: { label: '查看顾客手机号', prototype: 'unsupported' },
    memberPhoneEdit: { label: '编辑顾客手机号', prototype: 'unsupported' },
    audienceCreate: { label: '创建顾客分群', prototype: 'unsupported' },
    mallManage: { label: '管理商城商品、项目', prototype: 'unsupported' },
    mallReport: { label: '查看商城收益报表', prototype: 'unsupported' },
    hqEnter: { label: '进入总部', prototype: 'unsupported' },
    stockAudit: { label: '审核库存记录', prototype: 'unsupported' },
  };
  var PERM_CAP_KEYS = Object.keys(PERM_CAP_META);
  function permCapsAll(on) {
    var o = {};
    PERM_CAP_KEYS.forEach(function (k) { o[k] = !!on; });
    return o;
  }
  function permCapsOf(allowKeys) {
    var o = permCapsAll(false);
    (allowKeys || []).forEach(function (k) { if (o.hasOwnProperty(k)) o[k] = true; });
    return o;
  }
  /**
   * 五档权限身份（截图配置；店主全开）
   * staff.perm / session 使用 name 字段
   */
  var PERM_DEFS = [
    {
      id: 'owner',
      name: '店主',
      hint: '全店最高权限 · 全部能力开启',
      unique: true,
      createSelectable: false,
      caps: permCapsAll(true),
    },
    {
      id: 'partner',
      name: '合伙人',
      hint: '适用于门店老板合伙人',
      unique: false,
      createSelectable: true,
      caps: permCapsOf([
        'bill', 'settle', 'flowView',
        'priceListView', 'priceListCreate',
        'cardItemView', 'cardItemCreate',
        'staffCreate',
        'mallManage', 'mallReport',
        'achCommSet',
      ]),
      denies: ['hqEnter', 'stockAudit'],
      /* 权限说明弹窗文案（单店模式不展示「不能进入总部」） */
      helpLines: [
        { on: true, text: '开单、结算、查看流水单' },
        { on: true, text: '创建价目表' },
        { on: true, text: '创建卡项' },
        { on: true, text: '创建员工' },
        { on: true, text: '管理商城商品、项目' },
        { on: true, text: '查看商城收益报表' },
        { on: false, text: '不能审核库存记录' },
      ],
    },
    {
      id: 'manager',
      name: '店长',
      hint: '适用于店长',
      unique: false,
      createSelectable: true,
      caps: permCapsOf([
        'bill', 'settle', 'flowView',
        'priceListView', 'priceListCreate',
        'cardItemView', 'cardItemCreate',
        'staffCreate',
      ]),
      denies: ['memberDelete', 'memberPhoneView', 'memberPhoneEdit'],
      helpLines: [
        { on: true, text: '开单、结算、查看流水单' },
        { on: true, text: '创建价目表' },
        { on: true, text: '创建卡项' },
        { on: true, text: '创建员工' },
        { on: false, text: '不能删除会员' },
        { on: false, text: '不能查看或编辑顾客手机号' },
      ],
    },
    {
      id: 'senior',
      name: '高级店员',
      hint: '适用于总监、特殊店员',
      unique: false,
      createSelectable: true,
      caps: permCapsOf([
        'bill', 'settle', 'flowView',
        'priceListView', 'cardItemView',
        'billChangePrice',
        'cardExtend', 'cardRefund',
        'cardIssue', 'cardRecharge', 'cardRenew',
      ]),
      denies: ['staffCreate', 'memberDelete', 'audienceCreate'],
      helpLines: [
        { on: true, text: '开单、结算、查看流水单' },
        { on: true, text: '查看价目表、卡项' },
        { on: true, text: '开单可以改价' },
        { on: true, text: '可以延期会员卡或退卡' },
        { on: false, text: '不能创建员工' },
        { on: false, text: '不能删除会员' },
        { on: false, text: '不能创建顾客分群' },
      ],
    },
    {
      id: 'clerk',
      name: '店员',
      hint: '适用于技师、助理',
      unique: false,
      createSelectable: true,
      caps: permCapsOf([
        'bill', 'settle',
        'priceListView', 'cardItemView',
        'cardIssue', 'cardRecharge', 'cardRenew',
      ]),
      denies: ['billChangePrice', 'memberDelete', 'cardDelete', 'cardBackfill', 'cardExtend', 'cardRefund'],
      helpLines: [
        { on: true, text: '开单、结算' },
        { on: true, text: '查看价目表、卡项' },
        { on: true, text: '给顾客办新卡、充值、续费' },
        { on: false, text: '不能开单改价' },
        { on: false, text: '不能删除会员' },
        { on: false, text: '不能删除卡、补录卡、延期卡、退卡' },
      ],
    },
  ];
  var PERMS = PERM_DEFS.map(function (d) { return d.name; });
  /** 敏感权限：个人级 Switch 覆盖角色默认（改角色时重置为默认） */
  var SENSITIVE_PERM_DEFS = [
    { key: 'staffLogin', label: '员工端登录', hint: '关闭后不可登录员工端 App，账号仍可由店主端管理' },
    { key: 'memberPhoneView', label: '查看顾客手机号', hint: '关闭后手机号中间四位打码' },
    { key: 'memberStatsView', label: '查看会员数及办卡明细', hint: '含看板统计、办卡/充卡流水与经营报表' },
    { key: 'customerListView', label: '查看客户列表', hint: '与会员统计独立控制' },
    { key: 'cardRefund', label: '退卡', hint: '会员卡退卡操作' },
    { key: 'billVoid', label: '单据作废', hint: '含挂单作废；作废后关联业绩/提成回滚' },
    { key: 'cardOps', label: '卡相关操作（办卡/充卡）', hint: '办卡、充卡、续次、延期（不含退卡）' },
    { key: 'orderHold', label: '挂单', hint: '不可创建或操作任何挂单' },
    { key: 'viewOthersBill', label: '查看他人开单', hint: '本店全部员工开单/流水只读' },
    { key: 'cashierBill', label: '收银开单', hint: '进入收银台并完成结账' },
    { key: 'debtManage', label: '欠款/还款', hint: '登记欠款与收款还款' },
    { key: 'viewOthersPerf', label: '查看他人业绩', hint: '关闭后仅可看本人业绩；改提成仍仅店主/合伙人/店长' },
  ];
  function shouldShowSensitivePerms(permName) {
    var p = normalizePermName(permName || '');
    if (!p) return false;
    return p !== '店主';
  }
  function sensitivePermsAll(on) {
    var o = {};
    SENSITIVE_PERM_DEFS.forEach(function (d) { o[d.key] = !!on; });
    return o;
  }
  function sensitivePermsExcept(offKeys) {
    var o = sensitivePermsAll(true);
    (offKeys || []).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = false; });
    return o;
  }
  function sensitivePermsOnly(onKeys) {
    var o = sensitivePermsAll(false);
    (onKeys || []).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = true; });
    return o;
  }
  /** 各角色敏感权限 Switch 默认值（改角色时重置为此表；个人覆盖存 staff.sensitivePerms） */
  var SENSITIVE_PERM_ROLE_DEFAULTS = {
    '店主': sensitivePermsAll(true),
    '合伙人': sensitivePermsExcept(['viewOthersPerf']),
    '店长': sensitivePermsExcept(['memberPhoneView', 'viewOthersPerf']),
    '高级店员': sensitivePermsExcept(['memberPhoneView', 'memberStatsView', 'viewOthersBill', 'debtManage', 'viewOthersPerf']),
    '店员': sensitivePermsOnly(['staffLogin', 'customerListView', 'cardOps', 'orderHold', 'cashierBill']),
  };
  function defaultSensitivePermsForRole(permName) {
    var p = normalizePermName(permName);
    var tpl = SENSITIVE_PERM_ROLE_DEFAULTS[p] || SENSITIVE_PERM_ROLE_DEFAULTS['店员'];
    var o = {};
    SENSITIVE_PERM_DEFS.forEach(function (d) { o[d.key] = !!tpl[d.key]; });
    return o;
  }
  function mergeSensitivePerms(stored, permName) {
    var base = defaultSensitivePermsForRole(permName);
    if (!stored || typeof stored !== 'object') return base;
    SENSITIVE_PERM_DEFS.forEach(function (d) {
      if (typeof stored[d.key] === 'boolean') base[d.key] = stored[d.key];
    });
    return base;
  }
  function cloneSensitivePerms(src) {
    var o = {};
    SENSITIVE_PERM_DEFS.forEach(function (d) { o[d.key] = !!(src && src[d.key]); });
    return o;
  }
  function syncSensitiveCollapse(open) {
    var root = $('empSensitiveCollapse');
    var body = $('empSensitiveBody');
    var toggle = $('empSensitiveToggle');
    if (!root || !body) return;
    var on = !!open;
    root.classList.toggle('is-open', on);
    body.classList.toggle('hidden', !on);
    if (toggle) toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function renderSensitivePermsSection() {
    var collapseEl = $('empSensitiveCollapse');
    var cardEl = $('empSensitivePermsCard');
    if (!collapseEl || !cardEl) return;
    var permRaw = $('empFPerm') ? $('empFPerm').textContent : '';
    var perm = permRaw && permRaw !== '请选择员工角色' ? normalizePermName(permRaw) : '';
    var show = (state.formMode === 'edit' || state.formMode === 'refine') && perm && shouldShowSensitivePerms(perm);
    collapseEl.classList.toggle('hidden', !show);
    if (!show) return;
    if (!state.formSensitivePerms) {
      var s = state.currentStaffId ? staffById(state.currentStaffId) : null;
      state.formSensitivePerms = mergeSensitivePerms(s && s.sensitivePerms, perm);
    }
    cardEl.innerHTML = SENSITIVE_PERM_DEFS.map(function (d) {
      var on = !!state.formSensitivePerms[d.key];
      return '<div class="emp-sensitive-row">' +
        '<span class="emp-sensitive-row__lbl">' + esc(d.label) + '</span>' +
        '<button type="button" class="pay-meta-switch' + (on ? ' on' : '') + '" data-sensitive-key="' + d.key + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + esc(d.label) + '"></button>' +
        '</div>';
    }).join('');
  }
  function resetSensitivePermsForRole(permName) {
    state.formSensitivePerms = defaultSensitivePermsForRole(normalizePermName(permName));
    renderSensitivePermsSection();
  }
  var sessionPermName = '店主';
  var sessionStaffId = 'st0';

  function getPermDef(name) {
    return PERM_DEFS.find(function (d) { return d.name === name || d.id === name; }) || PERM_DEFS[0];
  }
  function normalizePermName(name) {
    var d = PERM_DEFS.find(function (x) { return x.name === name || x.id === name; });
    return d ? d.name : '店员';
  }
  function getSessionPermName() {
    return normalizePermName(sessionPermName || '店主');
  }
  function setSessionPermName(name) {
    sessionPermName = normalizePermName(name);
    syncDemoPermButtons();
    if (typeof syncCatalogWriteChrome === 'function') syncCatalogWriteChrome();
    if (typeof syncCardWriteChrome === 'function') syncCardWriteChrome();
    return sessionPermName;
  }
  function sessionStaffPool() {
    var list = (window.EmployeeStore && Array.isArray(window.EmployeeStore.staff))
      ? window.EmployeeStore.staff.filter(function (s) { return s.status === '在岗'; })
      : [];
    return list.length ? list : [{ id: 'st0', name: '顾清扬', short: '顾', perm: '店主', role: '店主' }];
  }
  /** 演示侧栏：每个权限角色固定留一人 */
  var DEMO_SESSION_STAFF_BY_PERM = {
    '店主': 'st0',
    '店长': 'st2',
    '高级店员': 'st1',
    '店员': 'st3',
  };
  function demoSessionStaffReps() {
    var all = sessionStaffPool();
    return PERM_DEFS.map(function (d) {
      var preferId = DEMO_SESSION_STAFF_BY_PERM[d.name];
      var hit = preferId ? all.find(function (s) { return s.id === preferId; }) : null;
      if (!hit) hit = all.find(function (s) { return s.perm === d.name; }) || null;
      return hit;
    }).filter(Boolean);
  }
  function getSessionStaff() {
    var pool = sessionStaffPool();
    var hit = pool.find(function (s) { return s.id === sessionStaffId; });
    if (hit) return hit;
    return pool[0] || null;
  }
  function getSessionStaffId() {
    var s = getSessionStaff();
    if (s && s.id !== sessionStaffId) sessionStaffId = s.id;
    return s ? s.id : null;
  }
  function setSessionStaffId(id, opts) {
    var pool = sessionStaffPool();
    var hit = pool.find(function (s) { return s.id === id; }) || pool[0] || null;
    if (!hit) return null;
    sessionStaffId = hit.id;
    var syncPerm = !(opts && opts.syncPerm === false);
    if (syncPerm && hit.perm) setSessionPermName(hit.perm);
    else syncDemoPermButtons();
    syncDemoStaffButtons();
    return sessionStaffId;
  }
  function syncDemoStaffButtons() {
    var root = document.getElementById('demoStaffBtns');
    if (!root) return;
    var cur = getSessionStaffId();
    var staff = getSessionStaff();
    root.innerHTML = demoSessionStaffReps().map(function (s) {
      var label = s.short || s.name;
      return '<button type="button" data-demo-staff="' + s.id + '"' +
        (s.id === cur ? ' class="on"' : '') +
        ' title="' + esc(s.name + (s.perm ? ' · ' + s.perm : '')) + '">' +
        esc(label) + '</button>';
    }).join('');
    var hint = document.getElementById('demoStaffHint');
    if (hint && staff) {
      hint.textContent = '每权限角色一人。当前开单人：' + staff.name +
        (staff.perm ? ' · 「' + staff.perm + '」' : '') +
        '。切换后同步权限，开单落单写入订单。';
    }
  }
  function hasPerm(cap, permName) {
    var def = getPermDef(permName || getSessionPermName());
    return !!(def && def.caps && def.caps[cap]);
  }
  function renderPermHelpBody() {
    var root = $('empPermHelpBody');
    if (!root) return;
    /* 原型：黑底白勾 / 红底白横杠；店主不展示（创建员工不可选） */
    var iconOn = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#1A1A1A"/><path d="M4.6 8.2l2.2 2.2 4.6-4.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var iconOff = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#E53935"/><path d="M4.5 8h7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
    root.innerHTML = PERM_DEFS.filter(function (d) {
      return d.id !== 'owner' && Array.isArray(d.helpLines) && d.helpLines.length;
    }).map(function (d) {
      var items = d.helpLines.map(function (line) {
        var on = !!line.on;
        return '<li class="emp-perm-help__item ' + (on ? 'is-on' : 'is-off') + '">' +
          '<span class="emp-perm-help__mark" aria-hidden="true">' + (on ? iconOn : iconOff) + '</span>' +
          '<span>' + esc(line.text) + '</span></li>';
      }).join('');
      return '<section class="emp-perm-help__role">' +
        '<div class="emp-perm-help__titles">' +
          '<h4>' + esc(d.name) + '</h4>' +
          (d.hint ? '<p class="emp-perm-help__hint">(' + esc(d.hint) + ')</p>' : '') +
        '</div>' +
        '<ul class="emp-perm-help__list" role="list">' + items + '</ul></section>';
    }).join('');
  }
  function openPermHelpDialog() {
    renderPermHelpBody();
    openEmpDialog('empPermHelpMask');
  }
  function requirePerm(cap, msg) {
    if (hasPerm(cap)) return true;
    var meta = PERM_CAP_META[cap];
    var label = meta ? meta.label : '执行此操作';
    var tip = msg || ('当前为「' + getSessionPermName() + '」，无法' + label);
    if (typeof showToast === 'function') showToast(tip, true);
    else if (typeof toast === 'function') toast(tip, true);
    return false;
  }
  function requireCatalogWrite(msg) {
    return requirePerm('priceListCreate', msg || ('当前为「' + getSessionPermName() + '」，无法改动价目表'));
  }
  function requireCardWrite(msg) {
    return requirePerm('cardItemCreate', msg || ('当前为「' + getSessionPermName() + '」，无法改动会员卡'));
  }
  function syncDemoPermButtons() {
    var root = document.getElementById('demoPermBtns');
    if (!root) return;
    var cur = getSessionPermName();
    root.innerHTML = PERM_DEFS.map(function (d) {
      return '<button type="button" data-demo-perm="' + d.name + '"' + (d.name === cur ? ' class="on"' : '') + '>' + d.name + '</button>';
    }).join('');
    var hint = document.getElementById('demoPermHint');
    if (hint) {
      var def = getPermDef(cur);
      hint.textContent = '当前：' + cur + (def.hint ? ' · ' + def.hint : '') + '。切换后按矩阵校验；window.RTBPerm 可供开发调用。';
    }
  }
  window.RTBPerm = {
    defs: PERM_DEFS,
    caps: PERM_CAP_META,
    keys: PERM_CAP_KEYS.slice(),
    getSession: getSessionPermName,
    setSession: setSessionPermName,
    getSessionStaffId: getSessionStaffId,
    getSessionStaff: getSessionStaff,
    setSessionStaffId: setSessionStaffId,
    getDef: getPermDef,
    has: hasPerm,
    require: requirePerm,
    requireCatalogWrite: requireCatalogWrite,
    requireCardWrite: requireCardWrite,
    normalize: normalizePermName,
  };

  var STATUSES = [
    { value: '在岗', label: '在岗' },
    { value: '休假', label: '休假' },
    { value: '离职', label: '离职（注销账号）' },
  ];
  var RULE_OPTS = ['按实收金额', '按耗卡金额', '按售价', '不计算业绩', '按原价金额'];
  var ADV_RULE_DEFS = [
    { id: 'ar4', label: '消耗赠送金额', options: ['按卡耗金额计算', '不计算业绩'], defaultValue: '按卡耗金额计算' },
    { id: 'ar5', label: '赠送项目（产品）', options: ['按原价计算', '不计算业绩'], defaultValue: '按原价计算' },
    { id: 'ar9', label: '免单', options: ['计算业绩和提成', '计算业绩，不计算提成', '不计算业绩提成'], defaultValue: '计算业绩和提成' },
    { id: 'ar7', label: '抵用券', options: ['按原价计算', '不计算业绩'], defaultValue: '按原价计算' },
    { id: 'arMall', label: '商城订单', options: ['按售价计算', '不计算业绩'], defaultValue: '按售价计算' },
  ];
  var ADV_RULE_VALUE_MIGRATE = {
    '按耗卡金额': '按卡耗金额计算',
    '按卡耗金额': '按卡耗金额计算',
    '按原价金额': '按原价计算',
    '按售价': '按原价计算',
    '不计算业绩与提成': '不计算业绩提成',
    '业绩与提成都计算': '计算业绩和提成',
  };
  var CALC_MODES = [
    { id: 'avg', label: '平均分配' },
    { id: 'station', label: '按工位分配' },
  ];
  var CALC_MODE_GROUPS = [
    { key: 'labor', label: '劳动业绩', storeKey: 'calcModeLabor' },
    { key: 'sales', label: '产品业绩', storeKey: 'calcModeSales' },
    { key: 'card', label: '办卡业绩', storeKey: 'calcModeCard' },
  ];
  var STAFF_STATION_DEFS = [
    { id: 'senior', defaultLabel: '大工' },
    { id: 'mid', defaultLabel: '中工' },
    { id: 'junior', defaultLabel: '小工' },
  ];
  var STATION_NAME_MAX = 3;
  var ACH_STATION_IDS = STAFF_STATION_DEFS.map(function (d) { return d.id; });

  /* 业绩设置 · 简单模式：两种模式 + 可编辑字段（选择即生效，可随时进进阶设置细调） */
  var ACH_SIMPLE_TEMPLATES = [
    {
      id: 'avg',
      title: '平均分配',
      sub: '一起干的，业绩平分',
      calcMode: 'avg',
      fields: [
        { key: 'des', label: '点客业绩' },
        { key: 'non', label: '散客业绩' },
        { key: 'base', label: '计算基数', select: true },
        { key: 'free', label: '免单算业绩', toggle: true },
      ],
    },
    {
      id: 'station',
      title: '按工位分配',
      sub: '大工多分，小工少分',
      calcMode: 'station',
      fields: [
        { key: 'station', station: 'senior', label: '大工' },
        { key: 'station', station: 'mid', label: '中工' },
        { key: 'station', station: 'junior', label: '小工' },
        { key: 'base', label: '计算基数', select: true },
        { key: 'free', label: '免单算业绩', toggle: true },
      ],
    },
  ];
  var ACH_SIMPLE_ADV_DEFAULTS = {
    ar4: '按卡耗金额计算',
    ar5: '按原价计算',
    ar9: '计算业绩和提成',
    ar7: '按原价计算',
  };
  var ACH_SIMPLE_RATE_OPTS = [60, 70, 80, 90, 100];

  var state = {
    currentStaffId: null,
    formMode: 'create',
    achTab: 'labor',
    achCatId: null,
    salaryMonth: '2026-08',
    commDetailScope: 'month',
    commDetailDay: null,
    commDetailBoundMonth: null,
    commDetailCalDraftScope: 'month',
    commDetailCalDraftDay: null,
    commDetailCalYear: null,
    commDetailCalMonth: null,
    commDetailViewer: 'owner',
    commDetailFilter: 'all',
    commEditViewed: {},
    commEditCursor: -1,
    commEditCursorKey: null,
    commLineEditId: null,
    commLineActId: null,
    payCycleDraft: null,
    payCycleReturnScreen: null,
    rewardDraft: null,
    editingRewardId: null,
    rewardDetailStaffId: null,
    rewardFormReturn: 'salary',
    rewardStaffPicking: false,
    achEdit: null,
    achSimpleTemplate: null,
    achSimpleEditTarget: null,
    achSimpleAdvReturn: false,
    achSimpleMianDan: {},
    achSimpleBase: {},
    calcModePending: null,
    ruleEditIdx: null,
    schemeMenuId: null,
    schemeDraftName: '',
    schemeDraftType: null,
    editingSchemeId: null,
    ladderExpandIdx: null,
    ladderSettingsCollapsed: true,
    ladderFoldHintFlashed: false,
    ladderFlashIdx: null,
    assignSchemeId: null,
    assignSelected: {},
    assignReturnScreen: 'screen-emp-comm',
    scopeDraft: null,
    scopeType: 'project',
    scopeGroupId: 'all',
    scopeBaseline: null,
    scopePurpose: 'ladder',
    itemCommEdit: null,
    formAvatar: '',
    formSwordTitle: '',
    leaveConfirmSource: 'form',
    formSwordTitleMode: 'none',
    formSwordId: null,
    formSchemeId: null,
    avatarDraft: '',
    cropSrc: '',
    swordTitleDraft: '',
    swordTitleMode: 'none',
    swordTitleBatch: 0,
    swordDraftId: null,
    wired: false,
    staffDragSuppressClick: false,
    roleDragSuppressClick: false,
    roleEditMode: null,
    roleEditOldName: '',
    roleEditSource: 'picker',
  };

  var ALBUM_DEMO_PHOTOS = [
    'assets/emp-avatars/man-a.jpg',
    'assets/emp-avatars/man-b.jpg',
    'assets/emp-avatars/man-c.jpg',
    'assets/emp-avatars/man-d.jpg',
    'assets/emp-avatars/man-e.jpg',
    'assets/emp-avatars/woman-a.jpg',
    'assets/emp-avatars/woman-b.jpg',
    'assets/emp-avatars/woman-c.jpg',
    'assets/emp-avatars/woman-d.jpg',
    'assets/emp-avatars/woman-e.jpg',
  ];

  var SWORD_TITLE_BATCHES = [
    ['青峰寒剑', '踏雪无痕剑', '凌霄天外飞剑'],
    ['九天玄雷灭世诛魔圣剑', '碧落黄泉剑', '一剑开天门'],
    ['霜华断水剑', '流光逐影剑', '赤焰焚空剑'],
  ];

  var SWORD_ICONS = (function () {
    var list = [];
    for (var i = 1; i <= 63; i++) {
      list.push({ id: 'sw' + i, src: 'assets/emp-swords/' + i + '.png', name: '宝剑' + i });
    }
    return list;
  })();

  window.EmployeeStore = {
    shopName: '尚剪造型空间(卓越版体验店)',
    payCycle: { mode: 'calendar', settleDay: 25, payDayOfMonth: 7, payDayManual: false },
    albumPhotos: ALBUM_DEMO_PHOTOS.slice(),
    swords: SWORD_ICONS,
    /* 办卡支付成功后写入的演示业绩分摊日志（正式环境由办卡业绩引擎落库） */
    cardIssueAchLogs: [],
    /* 员工业绩提成逐条明细（含待确认草稿） key = month:staffId */
    commLines: {},
    roles: DEFAULT_ROLES.slice(),
    staff: [
      { id: 'st0', name: '顾清扬', short: '顾', gender: '男', ageBand: '30以上', yearsExp: 12, role: '店主', phone: '18600186000', incomplete: false, status: '在岗', baseSalary: 5000, perm: '店主', scheme: '顾问标准提成', schemeId: 'c2_advisor', avatar: 'assets/emp-avatars/man-e.jpg', swordTitle: '流光逐影剑', swordId: 'sw11' },
      { id: 'st1', name: '林屿森', short: '森', gender: '男', ageBand: '24-30岁', yearsExp: 5, role: '美容师', phone: '13800138001', incomplete: false, status: '在岗', baseSalary: 4000, perm: '高级店员', scheme: '顾问标准提成、卡付劳动专项', schemeId: 'c2_advisor', schemeIds: ['c2_advisor', 'c2_cardpay'], avatar: 'assets/emp-avatars/man-a.jpg', swordTitle: '青峰寒剑', swordId: 'sw1' },
      { id: 'st2', name: '何苏叶', short: '叶', gender: '女', ageBand: '30以上', yearsExp: 8, role: '店长', phone: '13900139002', incomplete: false, status: '在岗', baseSalary: 5000, perm: '店长', scheme: '顾问标准提成', schemeId: 'c2_advisor', avatar: 'assets/emp-avatars/woman-a.jpg', swordTitle: '九天玄雷灭世诛魔圣剑', swordId: 'sw2' },
      { id: 'st3', name: '阿Ken', short: 'Ken', gender: '男', ageBand: '24-30岁', yearsExp: 3, role: '美容师', phone: '13900139003', incomplete: false, status: '在岗', baseSalary: 3500, perm: '店员', scheme: '顾问标准提成、卡付劳动专项', schemeId: 'c2_advisor', schemeIds: ['c2_advisor', 'c2_cardpay'], avatar: 'assets/emp-avatars/man-b.jpg', swordTitle: '踏雪无痕剑', swordId: 'sw3' },
      { id: 'st4', name: 'Lisa', short: 'Lisa', gender: '女', ageBand: '18-23岁', yearsExp: 1, role: '美甲师', phone: '13700137004', incomplete: false, status: '在岗', baseSalary: 3200, perm: '店员', scheme: '资深技师综合方案', schemeId: 'c2_flagship', avatar: 'assets/emp-avatars/woman-b.jpg', swordTitle: '', swordId: 'sw7' },
    ],
    salary: {
      /* 合理门店量级：月劳动约 0.6–2.2 万；提成约业绩的 8–15%；合计=底薪+提成+奖惩 */
      '2026-06': {
        st0: { base: 5000, labor: 14600, sales: 1005, issue: 6770, card: 6770, consume: 3384, commission: 1850, reward: 300, deduct: 0, total: 7150 },
        st1: { base: 4000, labor: 9576, sales: 503, issue: 5076, card: 5076, consume: 1269, commission: 1200, reward: 200, deduct: 50, total: 5350 },
        st2: { base: 5000, labor: 6688, sales: 410, issue: 2068, card: 2068, consume: 1034, commission: 844, reward: 500, deduct: 0, total: 6344 },
        st3: { base: 3500, labor: 6992, sales: 428, issue: 2162, card: 2162, consume: 1081, commission: 883, reward: 100, deduct: 50, total: 4433 },
        st4: { base: 3200, labor: 4053, sales: 149, issue: 1504, card: 1504, consume: 752, commission: 786, reward: 150, deduct: 0, total: 4136 },
      },
      '2026-07': {
        st0: { base: 5000, labor: 15523, sales: 1069, issue: 7200, card: 7200, consume: 3600, commission: 1968, reward: 200, deduct: 0, total: 7168 },
        st1: { base: 4000, labor: 10187, sales: 535, issue: 5400, card: 5400, consume: 1350, commission: 1276, reward: 300, deduct: 100, total: 5476 },
        st2: { base: 5000, labor: 7115, sales: 436, issue: 2200, card: 2200, consume: 1100, commission: 898, reward: 200, deduct: 0, total: 6098 },
        st3: { base: 3500, labor: 7438, sales: 455, issue: 2300, card: 2300, consume: 1150, commission: 939, reward: 150, deduct: 100, total: 4489 },
        st4: { base: 3200, labor: 4312, sales: 158, issue: 1600, card: 1600, consume: 800, commission: 837, reward: 80, deduct: 50, total: 4067 },
      },
      '2026-08': {
        st0: { base: 5000, labor: 16454, sales: 1133, issue: 7632, card: 7632, consume: 3816, commission: 2086, reward: 400, deduct: 0, total: 7486 },
        st1: { base: 4000, labor: 10798, sales: 567, issue: 5724, card: 5724, consume: 1431, commission: 1353, reward: 250, deduct: 50, total: 5553 },
        st2: { base: 5000, labor: 7542, sales: 462, issue: 2332, card: 2332, consume: 1166, commission: 952, reward: 300, deduct: 0, total: 6252 },
        st3: { base: 3500, labor: 7884, sales: 482, issue: 2438, card: 2438, consume: 1219, commission: 995, reward: 100, deduct: 0, total: 4595 },
        st4: { base: 3200, labor: 4571, sales: 168, issue: 1696, card: 1696, consume: 848, commission: 887, reward: 120, deduct: 30, total: 4177 },
      },
    },
    rewards: {
      '2026-06': [
        { id: 'rw01', staffId: 'st0', title: '月度优秀店主奖', amount: 300, type: 'reward', date: '2026.06.28' },
        { id: 'rw02', staffId: 'st1', title: '月度销冠奖励', amount: 200, type: 'reward', date: '2026.06.26' },
        { id: 'rw03', staffId: 'st1', title: '迟到扣款', amount: -50, type: 'deduct', date: '2026.06.15' },
        { id: 'rw04', staffId: 'st2', title: '店长管理津贴', amount: 500, type: 'reward', date: '2026.06.29' },
        { id: 'rw05', staffId: 'st3', title: '好评返现', amount: 100, type: 'reward', date: '2026.06.21' },
        { id: 'rw06', staffId: 'st3', title: '工位卫生扣款', amount: -50, type: 'deduct', date: '2026.06.12' },
        { id: 'rw07', staffId: 'st4', title: '新人进步奖', amount: 150, type: 'reward', date: '2026.06.25' },
      ],
      '2026-07': [
        { id: 'rw08', staffId: 'st0', title: '业绩标兵奖', amount: 200, type: 'reward', date: '2026.07.28' },
        { id: 'rw09', staffId: 'st1', title: '月度销冠奖励', amount: 300, type: 'reward', date: '2026.07.27' },
        { id: 'rw10', staffId: 'st1', title: '客诉扣款', amount: -100, type: 'deduct', date: '2026.07.20' },
        { id: 'rw11', staffId: 'st2', title: '带教奖励', amount: 200, type: 'reward', date: '2026.07.25' },
        { id: 'rw12', staffId: 'st3', title: '服务之星奖', amount: 150, type: 'reward', date: '2026.07.24' },
        { id: 'rw13', staffId: 'st3', title: '迟到扣款', amount: -100, type: 'deduct', date: '2026.07.08' },
        { id: 'rw14', staffId: 'st4', title: '好评返现', amount: 80, type: 'reward', date: '2026.07.22' },
        { id: 'rw15', staffId: 'st4', title: '旷工扣款', amount: -50, type: 'deduct', date: '2026.07.11' },
      ],
      '2026-08': [
        { id: 'rw16', staffId: 'st0', title: '门店综合奖', amount: 400, type: 'reward', date: '2026.08.29' },
        { id: 'rw17', staffId: 'st1', title: '卡项销售奖', amount: 250, type: 'reward', date: '2026.08.26' },
        { id: 'rw18', staffId: 'st1', title: '迟到扣款', amount: -50, type: 'deduct', date: '2026.08.13' },
        { id: 'rw19', staffId: 'st2', title: '月度优秀店长', amount: 300, type: 'reward', date: '2026.08.28' },
        { id: 'rw20', staffId: 'st3', title: '抖音好评奖', amount: 100, type: 'reward', date: '2026.08.23' },
        { id: 'rw21', staffId: 'st4', title: '满勤奖', amount: 120, type: 'reward', date: '2026.08.27' },
        { id: 'rw22', staffId: 'st4', title: '迟到扣款', amount: -30, type: 'deduct', date: '2026.08.06' },
      ],
    },
    rewardRules: [
      { id: 'rr1', name: '月度销冠', amount: 200, type: 'reward' },
      { id: 'rr2', name: '好评返现', amount: 50, type: 'reward' },
      { id: 'rr3', name: '迟到扣款', amount: -50, type: 'deduct' },
    ],
    ach: {
      labor: { cats: [], items: {} },
      sales: { cats: [], items: {} },
      card: {
        baseMode: '按实收金额',
        incomeTypes: {},
        cats: [],
        items: {},
      },
    },
    advRules: [
      { id: 'ar4', label: '消耗赠送金额', value: '按卡耗金额计算' },
      { id: 'ar5', label: '赠送项目（产品）', value: '按原价计算' },
      { id: 'ar9', label: '免单', value: '计算业绩和提成' },
      { id: 'ar7', label: '抵用券', value: '按原价计算' },
      { id: 'arMall', label: '商城订单', value: '按售价计算' },
    ],
    calcMode: 'station',
    calcModeLabor: 'station',
    calcModeSales: 'avg',
    calcModeCard: 'station',
    stationMap: { senior: '大工', mid: '中工', junior: '小工' },
    schemes: [
      { id: 'sch1', name: '标准方案', type: 'item',
        categoryDefaults: {
          labor: { valueMode: 'pct', designated: 10, nonDesignated: 10, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          sales: { valueMode: 'pct', designated: 8, nonDesignated: 8, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          issue: { valueMode: 'pct', designated: 5, nonDesignated: 5, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          card: { valueMode: 'pct', designated: 3, nonDesignated: 3, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
        },
        items: [],
        assigned: ['st0', 'st1', 'st2', 'st3', 'st4'] },
      { id: 'sch2', name: '阶梯激励', type: 'ladder', scopeMode: 'all',
        ladderCalcMode: 'top',
        ladderPayTypes: { cash: true, memberCard: true, groupBuy: true },
        scope: { projectIds: [], productIds: [], cardIds: [] },
        ladder: [
          { min: 0, max: 10000, pct: 8, mode: 'pct' },
          { min: 10000, max: 30000, pct: 12, mode: 'pct' },
          { min: 30000, max: null, pct: 15, mode: 'pct' },
        ],
        assigned: ['st1'] },
      { id: 'sch3', name: '学徒方案', type: 'item',
        categoryDefaults: {
          labor: { valueMode: 'pct', designated: 8, nonDesignated: 8, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          sales: { valueMode: 'pct', designated: 5, nonDesignated: 5, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          issue: { valueMode: 'pct', designated: 0, nonDesignated: 0, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
          card: { valueMode: 'pct', designated: 0, nonDesignated: 0, designatedAmt: 0, nonDesignatedAmt: 0, byPayType: false },
        },
        items: [
          {
            kind: 'project',
            refId: 'p19',
            groupId: 'g_proj_wash',
            name: '洗头',
            valueMode: 'amount',
            designated: 0,
            nonDesignated: 0,
            designatedAmt: 8,
            nonDesignatedAmt: 8,
            byPayType: false,
            payTypes: {
              memberCard: { designated: 0, nonDesignated: 0, designatedAmt: 8, nonDesignatedAmt: 8 },
              cash: { designated: 0, nonDesignated: 0, designatedAmt: 8, nonDesignatedAmt: 8 },
              groupBuy: { designated: 0, nonDesignated: 0, designatedAmt: 8, nonDesignatedAmt: 8 },
            },
          },
        ],
        assigned: [] },
    ],
  };
  syncAllStaffSchemeFields();

  function $(id) { return document.getElementById(id); }
  function toast(msg, isErr) {
    if (typeof showToast === 'function') showToast(msg, isErr);
  }
  function nav(id) {
    if (typeof setFlowNavHighlight === 'function') setFlowNavHighlight(id);
  }
  function showScreen(id) {
    if (typeof showOnlyScreen === 'function') showOnlyScreen(id);
  }
  function openEmpDialog(id) { var el = $(id); if (el) el.classList.add('show'); }
  function closeEmpDialog(id) { var el = $(id); if (el) el.classList.remove('show'); }
  function openEmpAchInfoHelp(title, html) {
    var titleEl = $('empAchInfoHelpTitle');
    var bodyEl = $('empAchInfoHelpBody');
    if (titleEl) titleEl.textContent = title || '说明';
    if (bodyEl) bodyEl.innerHTML = html || '';
    openEmpDialog('empAchInfoHelpMask');
  }
  function openMask(id) { var el = $(id); if (el) el.classList.add('open'); }
  function closeMask(id) { var el = $(id); if (el) el.classList.remove('open'); }
  function closeAllEmpMasks() {
    ['empMonthMask', 'empCommDateMask', 'empCommLineEditMask', 'empCommEditLogMask', 'empCommLineConsentMask', 'empCommLineActMask',
      'empRuleMask', 'empSchemeMenuMask', 'empTypeSheetMask',
      'empAchEditMask', 'empRoleMask', 'empPermMask', 'empStatusMask', 'empDetailStatusMask', 'empSchemePickMask',
      'empGenderMask', 'empAgeBandMask', 'empAvatarActionMask', 'empAlbumMask', 'empCropMask',
      'empSwordTitleMask', 'empSwordMask', 'empScopeSelectedMask', 'empItemCommEditMask', 'achSimpleRateMask', 'empRewardStaffMask'].forEach(closeMask);
    ['empHelpMask', 'empAchHelpMask', 'empPermHelpMask', 'empNameDialogMask', 'empRoleNameMask', 'empRoleDelConfirmMask', 'empLeaveConfirmMask', 'empCalcModeConfirmMask', 'empSchemeTypeMask', 'empLadderCalcHelpMask', 'empAchInfoHelpMask', 'empLadderResetConfirmMask'].forEach(closeEmpDialog);
  }
  function fmtMoney(n) {
    return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function monthLabel(key) {
    var p = String(key || '').split('-');
    return p[0] + '年' + p[1] + '月';
  }
  function shiftMonth(key, delta) {
    var d = new Date(key + '-01');
    d.setMonth(d.getMonth() + delta);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  function defaultPayDayFromSettle(settleDay) {
    var s = Math.min(30, Math.max(1, Math.round(Number(settleDay) || 25)));
    var raw = s + 12;
    return raw <= 30 ? raw : raw - 30;
  }

  function ensurePayCycle() {
    var store = window.EmployeeStore;
    if (!store.payCycle) store.payCycle = { mode: 'calendar', settleDay: 25 };
    var pc = store.payCycle;
    if (pc.mode !== 'custom') pc.mode = 'calendar';
    var d = Math.round(Number(pc.settleDay) || 25);
    if (d < 1) d = 1;
    if (d > 28) d = 28;
    pc.settleDay = d;
    if (!pc.payDayManual) {
      pc.payDayOfMonth = defaultPayDayFromSettle(d);
    } else {
      var p = Math.round(Number(pc.payDayOfMonth) || defaultPayDayFromSettle(d));
      if (p < 1) p = 1;
      if (p > 30) p = 30;
      pc.payDayOfMonth = p;
    }
    return pc;
  }

  function canEditPayDay() {
    var n = getSessionPermName();
    return n === '店主' || n === '合伙人';
  }

  function payDayLabel(pc) {
    pc = pc || ensurePayCycle();
    return '发薪日 ' + (pc.payDayOfMonth || defaultPayDayFromSettle(pc.settleDay)) + '日';
  }

  /** 提成分列：项目净值 / 产品 / 办卡 / 充卡 / 快消 */
  function salaryCommSplit(staffId) {
    var labor = 0, sales = 0, issue = 0, card = 0, quick = 0;
    getCommLines(staffId).forEach(function (ln) {
      var c = Number(ln.comm) || 0;
      if (ln.kind === 'quick') quick += c;
      else if (ln.kind === 'product') sales += c;
      else if (ln.kind === 'card' || ln.kind === 'issue') issue += c;
      else if (ln.kind === 'recharge' || ln.kind === 'consume') card += c;
      else labor += c;
    });
    /* 演示数据里办卡多标为 card/issue，充卡较少：把 consume 作充卡；若全无充卡则办卡/充卡格用 issue+card */
    return {
      labor: roundMoney2(labor),
      sales: roundMoney2(sales),
      issue: roundMoney2(issue),
      card: roundMoney2(card),
      issueCard: roundMoney2(issue + card),
      quick: roundMoney2(quick),
      total: roundMoney2(labor + sales + issue + card + quick)
    };
  }

  function salaryCatIcon(key) {
    var paths = {
      labor: 'M8.4 7.2h7.2M8.4 10.8h7.2M8.4 14.4H12M6.6 2.4h10.8A2.4 2.4 0 0 1 19.8 4.8v14.4a2.4 2.4 0 0 1-2.4 2.4H6.6A2.4 2.4 0 0 1 4.2 19.2V4.8A2.4 2.4 0 0 1 6.6 2.4z',
      sales: 'M20.44 7.75H3.56M14.5 11.5h-5M20.5 8.25V18.4A2.1 2.1 0 0 1 18.4 20.5H5.6A2.1 2.1 0 0 1 3.5 18.4V8.25l1.68-3.87A1.7 1.7 0 0 1 6.7 3.5h10.68a1.7 1.7 0 0 1 1.52.88L20.5 8.25z',
      issue: 'M3 9.3h18M6.6 13.5h3M4.8 5.1h14.4A2.4 2.4 0 0 1 21.6 7.5v9a2.4 2.4 0 0 1-2.4 2.4H4.8A2.4 2.4 0 0 1 2.4 16.5v-9A2.4 2.4 0 0 1 4.8 5.1z',
      quick: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z'
    };
    var d = paths[key] || paths.labor;
    return '<span class="emp-salary-card__cell-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg></span>';
  }

  function canEditCommission() {
    var n = getSessionPermName();
    return (n === '店主' || n === '合伙人') && state.commDetailViewer !== 'staff';
  }

  function mapPayChannelKey(channel) {
    var c = String(channel || '');
    if (c.indexOf('卡') >= 0) return 'card';
    if (c.indexOf('团') >= 0) return 'group';
    if (c.indexOf('签') >= 0 || c.indexOf('欠') >= 0) return 'sign';
    return 'cash';
  }

  function salaryAchByPay(staffId) {
    var cash = 0, card = 0, group = 0, sign = 0;
    getCommLines(staffId).forEach(function (ln) {
      var a = Number(ln.ach) || 0;
      var k = mapPayChannelKey(ln.channel);
      if (k === 'card') card += a;
      else if (k === 'group') group += a;
      else if (k === 'sign') sign += a;
      else cash += a;
    });
    /* 演示：若无签单通道，从现金拆出约 8% 作签单 */
    if (sign === 0 && cash > 0) {
      sign = roundMoney2(cash * 0.08);
      cash = roundMoney2(cash - sign);
    }
    var total = roundMoney2(cash + card + group + sign);
    return { cash: roundMoney2(cash), card: roundMoney2(card), group: roundMoney2(group), sign: roundMoney2(sign), total: total };
  }

  function salaryServiceSales(staffId) {
    var svcCnt = 0, svcAmt = 0, cardCnt = 0, cardAmt = 0;
    getCommLines(staffId).forEach(function (ln) {
      var paid = roundMoney2((Number(ln.price) || 0) * 0.92);
      var k = ln.kind;
      if (k === 'project' || k === 'quick') {
        svcCnt += 1;
        svcAmt += paid;
      } else if (k === 'card' || k === 'issue' || k === 'recharge' || k === 'consume') {
        cardCnt += 1;
        cardAmt += paid;
      }
    });
    return {
      serviceCount: svcCnt,
      serviceAmt: roundMoney2(svcAmt),
      salesCount: cardCnt,
      salesAmt: roundMoney2(cardAmt)
    };
  }

  /** 莫兰迪色：列表三行 / 业绩四通道 / 提成五类 */
  var MORANDI = {
    base: '#A8B5A2',
    commission: '#B5A6C4',
    reward: '#D4B896',
    cash: '#C4A484',
    cardPay: '#8FA3B8',
    group: '#A8B5A2',
    sign: '#C9A9A6',
    labor: '#C4A484',
    sales: '#8FA3B8',
    issue: '#B5A6C4',
    card: '#C9A9A6',
    quick: '#D4B896'
  };

  /** 组内最大值满分；无灰槽；0 显示 3px 占位 */
  function renderRatioBarsHtml(items) {
    var max = 0;
    (items || []).forEach(function (it) {
      max = Math.max(max, Math.abs(Number(it.value) || 0));
    });
    return (items || []).map(function (it) {
      var v = Number(it.value) || 0;
      var abs = Math.abs(v);
      var pct = max > 0 && abs > 0 ? Math.round((abs / max) * 100) : 0;
      var zeroCls = (max > 0 && abs <= 0) ? ' is-zero' : '';
      var widthStyle = zeroCls ? '' : ('width:' + pct + '%;');
      var color = it.color || MORANDI.labor;
      return '<div class="emp-pay-bar"><span class="emp-pay-bar__lbl">' + esc(it.label) + '</span>' +
        '<div class="emp-pay-bar__track"><div class="emp-pay-bar__fill' + zeroCls + '" style="' + widthStyle + 'background:' + color + '"></div></div>' +
        '<span class="emp-pay-bar__val emp-num">' + fmtMoney(v) + '</span></div>';
    }).join('');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function formatYmd(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }
  function parseYmd(s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function isCustomPeriodKey(key) {
    return String(key || '').indexOf('~') >= 0;
  }
  function daysInMonth(y, m0) {
    return new Date(y, m0 + 1, 0).getDate();
  }
  function settleDayInMonth(y, m0, settleDay) {
    return Math.min(Number(settleDay) || 25, daysInMonth(y, m0));
  }
  function customPeriodEndingIn(y, m0, settleDay) {
    var endDom = settleDayInMonth(y, m0, settleDay);
    var end = new Date(y, m0, endDom);
    var py = y;
    var pm = m0 - 1;
    if (pm < 0) { pm = 11; py--; }
    var prevEndDom = settleDayInMonth(py, pm, settleDay);
    var start = new Date(py, pm, prevEndDom);
    start.setDate(start.getDate() + 1);
    return formatYmd(start) + '~' + formatYmd(end);
  }
  function periodParts(key) {
    if (isCustomPeriodKey(key)) {
      var se = String(key).split('~');
      return { start: se[0], end: se[1], kind: 'custom' };
    }
    var p = String(key || '2026-07').split('-');
    var y = Number(p[0]);
    var m = Number(p[1]);
    var last = daysInMonth(y, m - 1);
    return {
      start: y + '-' + pad2(m) + '-01',
      end: y + '-' + pad2(m) + '-' + pad2(last),
      kind: 'calendar',
      monthKey: y + '-' + pad2(m),
    };
  }
  function shortMd(ymd) {
    var p = String(ymd).split('-');
    return Number(p[1]) + '.' + pad2(Number(p[2]));
  }
  function periodLabel(key) {
    var parts = periodParts(key);
    if (parts.kind === 'calendar') return monthLabel(parts.monthKey || key);
    var end = parts.end.split('-');
    return Number(end[1]) + '期 · ' + shortMd(parts.start) + '–' + shortMd(parts.end);
  }
  function periodRangeText(key) {
    var parts = periodParts(key);
    return shortMd(parts.start) + '–' + shortMd(parts.end);
  }
  function payCycleModeLabel(pc) {
    pc = pc || ensurePayCycle();
    if (pc.mode === 'custom') return '每月' + pc.settleDay + '日结';
    return '自然月';
  }
  function getPeriodContaining(date) {
    var pc = ensurePayCycle();
    var dt = date || new Date();
    if (pc.mode !== 'custom') {
      return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1);
    }
    var y = dt.getFullYear();
    var m = dt.getMonth();
    var d = dt.getDate();
    var endDom = settleDayInMonth(y, m, pc.settleDay);
    if (d <= endDom) return customPeriodEndingIn(y, m, pc.settleDay);
    var ny = y;
    var nm = m + 1;
    if (nm > 11) { nm = 0; ny++; }
    return customPeriodEndingIn(ny, nm, pc.settleDay);
  }
  function shiftPeriod(key, delta) {
    var pc = ensurePayCycle();
    if (pc.mode !== 'custom' && !isCustomPeriodKey(key)) return shiftMonth(key, delta);
    var parts = periodParts(key);
    var end = parseYmd(parts.end);
    var y = end.getFullYear();
    var m = end.getMonth() + (Number(delta) || 0);
    while (m > 11) { m -= 12; y++; }
    while (m < 0) { m += 12; y--; }
    return customPeriodEndingIn(y, m, pc.settleDay);
  }
  function calendarMonthForPeriod(periodKey) {
    return periodParts(periodKey).end.slice(0, 7);
  }
  function syncSalaryPeriodToCycle() {
    var pc = ensurePayCycle();
    var cur = state.salaryMonth || getPeriodContaining(new Date());
    if (pc.mode === 'calendar') {
      if (isCustomPeriodKey(cur)) state.salaryMonth = calendarMonthForPeriod(cur);
      else if (!/^\d{4}-\d{2}$/.test(String(cur))) state.salaryMonth = getPeriodContaining(new Date());
    } else if (!isCustomPeriodKey(cur)) {
      var p = String(cur).split('-');
      state.salaryMonth = customPeriodEndingIn(Number(p[0]), Number(p[1]) - 1, pc.settleDay);
    } else {
      var end = parseYmd(periodParts(cur).end);
      state.salaryMonth = customPeriodEndingIn(end.getFullYear(), end.getMonth(), pc.settleDay);
    }
  }
  function ensurePeriodDataBucket(mapName, periodKey) {
    var store = window.EmployeeStore;
    if (!store[mapName]) store[mapName] = {};
    if (store[mapName][periodKey]) return;
    var fb = calendarMonthForPeriod(periodKey);
    if (isCustomPeriodKey(periodKey) && store[mapName][fb]) {
      store[mapName][periodKey] = JSON.parse(JSON.stringify(store[mapName][fb]));
    } else {
      store[mapName][periodKey] = mapName === 'rewards' ? [] : {};
    }
  }
  function staffById(id) {
    return window.EmployeeStore.staff.find(function (s) { return s.id === id; });
  }
  function swordById(id) {
    return (window.EmployeeStore.swords || []).find(function (s) { return s.id === id; });
  }
  function checkSvg12() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  }
  function syncFormAvatarPreview() {
    var el = $('empFAvatarPreview');
    if (!el) return;
    var url = state.formAvatar || '';
    var existing = el.querySelector('img');
    if (url) {
      el.classList.add('has-img');
      if (existing) {
        existing.src = url;
      } else {
        el.insertAdjacentHTML('afterbegin', '<img src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">');
      }
    } else {
      el.classList.remove('has-img');
      if (existing) existing.remove();
    }
  }
  function syncFormSwordFields() {
    var titleEl = $('empFSwordTitle');
    var swordEl = $('empFSword');
    var thumb = $('empFSwordThumb');
    if (titleEl) {
      var t = state.formSwordTitle || '';
      titleEl.textContent = t || '请选择';
      titleEl.classList.toggle('has-val', !!t);
    }
    var sw = state.formSwordId ? swordById(state.formSwordId) : null;
    if (swordEl) {
      swordEl.textContent = sw ? sw.name : '请选择';
      swordEl.classList.toggle('has-val', !!sw);
      swordEl.classList.toggle('hidden', !!sw);
    }
    if (thumb) {
      if (sw) {
        thumb.classList.remove('hidden');
        thumb.innerHTML = '<img src="' + esc(sw.src) + '" alt="">';
      } else {
        thumb.classList.add('hidden');
        thumb.innerHTML = '';
      }
    }
  }
  function openAvatarAction() {
    openMask('empAvatarActionMask');
  }
  function openAlbumPicker(fromCamera) {
    closeMask('empAvatarActionMask');
    state.avatarDraft = state.formAvatar || '';
    if (fromCamera) toast('已调用相机（演示），请从相册选一张');
    renderAlbumGrid();
    openMask('empAlbumMask');
  }
  function renderAlbumGrid() {
    var grid = $('empAlbumGrid');
    if (!grid) return;
    var photos = window.EmployeeStore.albumPhotos || ALBUM_DEMO_PHOTOS;
    grid.innerHTML = photos.map(function (url) {
      var on = url === state.avatarDraft ? ' is-on' : '';
      return '<button type="button" class="emp-album-pick' + on + '" data-album-url="' + esc(url) + '">' +
        '<img src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' +
        '<span class="emp-album-pick__check" aria-hidden="true">' + checkSvg12() + '</span></button>';
    }).join('');
  }
  function openCrop(src) {
    state.cropSrc = src;
    closeMask('empAlbumMask');
    ['empCropBg', 'empCropCircle', 'empCropPreview'].forEach(function (id) {
      var img = $(id);
      if (img) img.src = src;
    });
    openMask('empCropMask');
  }
  function applyCroppedAvatar() {
    if (!state.cropSrc) { toast('请先选择照片'); return; }
    state.formAvatar = state.cropSrc;
    syncFormAvatarPreview();
    closeMask('empCropMask');
    toast('头像已更新');
  }
  function openSwordTitlePicker() {
    state.swordTitleDraft = state.formSwordTitle || '';
    state.swordTitleMode = state.formSwordTitleMode || (state.formSwordTitle ? 'preset' : 'none');
    if (state.swordTitleMode === 'custom') {
      state.swordTitleDraft = swordCustomPrefix(state.formSwordTitle || state.swordTitleDraft);
    } else if (!state.formSwordTitle) {
      state.swordTitleMode = 'none';
    } else {
      state.swordTitleMode = 'preset';
    }
    renderSwordTitleList();
    openMask('empSwordTitleMask');
  }
  function swordCustomPrefix(raw) {
    var s = String(raw || '').trim();
    if (/剑$/.test(s)) s = s.slice(0, -1);
    return s.slice(0, 6);
  }
  function renderSwordTitleList() {
    var root = $('empSwordTitleList');
    if (!root) return;
    var batch = SWORD_TITLE_BATCHES[state.swordTitleBatch % SWORD_TITLE_BATCHES.length] || [];
    var radio = function (on) {
      return '<span class="emp-sword-radio">' + (on ? checkSvg12() : '') + '</span>';
    };
    var customVal = state.swordTitleMode === 'custom' ? swordCustomPrefix(state.swordTitleDraft) : '';
    var html = '';
    html += '<button type="button" class="emp-sword-title-item' + (state.swordTitleMode === 'none' ? ' is-on' : '') + '" data-sword-title-mode="none">' +
      '<span class="emp-sword-title-item__main"><span class="emp-sword-title-item__name">暂不选择</span></span>' + radio(state.swordTitleMode === 'none') + '</button>';
    html += '<button type="button" class="emp-sword-title-item' + (state.swordTitleMode === 'custom' ? ' is-on' : '') + '" data-sword-title-mode="custom">' +
      '<span class="emp-sword-title-item__main"><span class="emp-sword-title-item__name">自定义剑号</span>' +
      '<div class="emp-sword-title-item__sub">称号需以「剑」字结尾，最多7个字</div></span>' +
      '<span class="emp-sword-title-item__field">' +
      '<input class="emp-sword-title-item__input" id="empSwordCustomInput" type="text" maxlength="6" placeholder="请输入" value="' +
      esc(customVal) + '" autocomplete="off" />' +
      '<span class="emp-sword-title-item__suffix" aria-hidden="true">剑</span></span>' +
      radio(state.swordTitleMode === 'custom') + '</button>';
    batch.forEach(function (name) {
      var on = state.swordTitleMode === 'preset' && state.swordTitleDraft === name;
      html += '<button type="button" class="emp-sword-title-item' + (on ? ' is-on' : '') + '" data-sword-title-mode="preset" data-sword-title="' + esc(name) + '">' +
        '<span class="emp-sword-title-item__main"><span class="emp-sword-title-item__name">' + esc(name) + '</span></span>' + radio(on) + '</button>';
    });
    root.innerHTML = html;
  }
  function confirmSwordTitle() {
    if (state.swordTitleMode === 'none') {
      state.formSwordTitle = '';
      state.formSwordTitleMode = 'none';
    } else if (state.swordTitleMode === 'custom') {
      var input = $('empSwordCustomInput');
      var prefix = swordCustomPrefix(input ? input.value : state.swordTitleDraft);
      if (!prefix) { toast('请输入自定义剑号'); return; }
      if (prefix.length > 6) { toast('最多 7 个字'); return; }
      state.formSwordTitle = prefix + '剑';
      state.formSwordTitleMode = 'custom';
    } else {
      if (!state.swordTitleDraft) { toast('请选择剑号'); return; }
      state.formSwordTitle = state.swordTitleDraft;
      state.formSwordTitleMode = 'preset';
    }
    syncFormSwordFields();
    closeMask('empSwordTitleMask');
  }
  function openSwordPicker() {
    state.swordDraftId = state.formSwordId || null;
    renderSwordGrid();
    openMask('empSwordMask');
  }
  function renderSwordGrid() {
    var grid = $('empSwordGrid');
    var more = $('empSwordMore');
    if (!grid) return;
    var list = window.EmployeeStore.swords || SWORD_ICONS;
    if (more) more.textContent = '上滑查看更多 · 共' + list.length + '个';
    grid.innerHTML = list.map(function (item) {
      var on = item.id === state.swordDraftId ? ' is-on' : '';
      return '<button type="button" class="emp-sword-pick' + on + '" data-sword-id="' + esc(item.id) + '" aria-label="' + esc(item.name) + '">' +
        '<span class="emp-sword-pick__icon"><img src="' + esc(item.src) + '" alt=""></span>' +
        '<span class="emp-sword-pick__check" aria-hidden="true">' + checkSvg12() + '</span></button>';
    }).join('');
  }
  function confirmSword() {
    state.formSwordId = state.swordDraftId;
    syncFormSwordFields();
    closeMask('empSwordMask');
  }
  function empAvatarHtml(s, cls) {
    var klass = 'emp-avatar' + (cls ? ' ' + cls : '');
    if (s && s.avatar) {
      return '<div class="' + klass + '"><img src="' + esc(s.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>';
    }
    var fallback = (s && (s.short || s.name)) ? String(s.short || s.name).slice(0, 1) : '';
    return '<div class="' + klass + '">' + esc(fallback) + '</div>';
  }
  function ensureRoles() {
    var store = window.EmployeeStore;
    if (!store.roles || !store.roles.length) store.roles = DEFAULT_ROLES.slice();
    return store.roles;
  }
  function getRoles() {
    return ensureRoles().slice();
  }
  function countStaffWithRole(roleName) {
    return (window.EmployeeStore.staff || []).filter(function (s) { return s.role === roleName; }).length;
  }
  function findStaffByPerm(perm) {
    return (window.EmployeeStore.staff || []).find(function (s) { return s.perm === perm; }) || null;
  }
  function findOtherStaffWithRole(roleName, exceptId) {
    return (window.EmployeeStore.staff || []).find(function (s) {
      return s.role === roleName && s.id !== exceptId;
    }) || null;
  }
  function isUniqueStaffRole(roleName) {
    return roleName === '店主' || roleName === '店长';
  }
  function uniqueRoleTakenMessage(roleName) {
    if (roleName === '店主') return '本店已有店主，不可重复设置';
    if (roleName === '店长') return '本店已有店长，不可重复设置';
    return '该职位已有人担任';
  }
  /** 创建不可选店主；编辑时仅现任店主（或尚无店主）可选店主 */
  function getFormPermOptions() {
    return PERM_DEFS.filter(function (d) {
      if (d.name === '店主') {
        if (state.formMode === 'create') return false;
        var owner = findStaffByPerm('店主');
        return !owner || owner.id === state.currentStaffId;
      }
      return true;
    }).map(function (d) { return d.name; });
  }
  function renderPermPickerList(current) {
    var root = $('empPermList');
    if (!root) return;
    var opts = getFormPermOptions();
    var cur = (!current || current === '请选择员工权限' || current === '请选择员工角色') ? '' : normalizePermName(current);
    var owner = findStaffByPerm('店主');
    var showOwnerLocked = state.formMode === 'create' || (owner && owner.id !== state.currentStaffId);
    root.innerHTML = PERM_DEFS.map(function (d) {
      if (d.name === '店主' && showOwnerLocked) {
        return '<div class="emp-picker-opt is-disabled" aria-disabled="true">' + esc(d.name) +
          '<span class="emp-picker-opt__hint">每店仅一位，创建/非店主不可选</span></div>';
      }
      if (opts.indexOf(d.name) < 0) return '';
      return '<button type="button" class="emp-picker-opt' + (d.name === cur ? ' on' : '') +
        '" data-perm-val="' + esc(d.name) + '">' + esc(d.name) +
        (d.hint ? '<span class="emp-picker-opt__hint">' + esc(d.hint) + '</span>' : '') +
        '</button>';
    }).join('');
  }
  function renderRolePickerList(current) {
    var root = $('empRoleList');
    if (!root) return;
    var roles = getRoles();
    var cur = current === '请选择' ? '' : (current || '');
    var exceptId = state.formMode === 'create' ? null : state.currentStaffId;
    root.innerHTML = roles.map(function (name) {
      var on = name === cur;
      var taken = isUniqueStaffRole(name) ? findOtherStaffWithRole(name, exceptId) : null;
      var disabled = !!taken;
      var hint = disabled
        ? ('<span class="emp-role-pick-row__main-hint">已由 ' + esc(taken.name) + ' 担任</span>')
        : '';
      return '<div class="emp-role-pick-row">' +
        '<button type="button" class="emp-role-pick-row__main' + (on ? ' on' : '') + (disabled ? ' is-disabled' : '') +
        '" data-role-val="' + esc(name) + '"' + (disabled ? ' data-role-taken="1" aria-disabled="true"' : '') + '>' +
        esc(name) + hint + '</button>' +
        '<button type="button" class="emp-role-pick-row__edit" data-role-edit="' + esc(name) + '" aria-label="修改名称">' +
        '<span>修改名称</span>' + navChevHtml() + '</button></div>';
    }).join('');
  }
  function renderRoleManageList() {
    var root = $('empRoleManageList');
    if (!root) return;
    var roles = getRoles();
    root.innerHTML = roles.map(function (name) {
      var n = countStaffWithRole(name);
      return '<div class="emp-role-manage-row" data-role-manage="' + esc(name) + '">' +
        '<button type="button" class="emp-row__drag" data-role-drag="' + esc(name) + '" aria-label="拖动排序">' +
        empDragHandleIconHtml() + '</button>' +
        '<div class="emp-role-manage-row__main">' +
        '<span class="emp-role-manage-row__name">' + esc(name) + '</span>' +
        '<span class="emp-role-manage-row__sub">' + (n ? ('已分配 ' + n + ' 人') : '暂无员工') + '</span></div>' +
        '<span class="emp-role-manage-row__act"><span>修改名称</span>' + navChevHtml() + '</span></div>';
    }).join('') || '<div class="empty-cart" style="padding:32px 16px">暂无职位，请添加</div>';
  }

  function commitRoleOrderFromDom() {
    var root = $('empRoleManageList');
    if (!root) return;
    var names = Array.prototype.map.call(
      root.querySelectorAll('.emp-role-manage-row[data-role-manage]:not(.is-drag-placeholder)'),
      function (r) { return r.dataset.roleManage; }
    ).filter(Boolean);
    var roles = ensureRoles();
    if (!names.length || names.length !== roles.length) return;
    var ordered = names.filter(function (n) { return roles.indexOf(n) >= 0; });
    if (ordered.length !== roles.length) return;
    window.EmployeeStore.roles = ordered;
    refreshRoleUiAfterChange();
  }

  var EMP_ROLE_LONG_PRESS_MS = 400;
  var EMP_ROLE_MOVE_PX = 8;

  function wireRoleManageListDrag() {
    var root = $('empRoleManageList');
    if (!root || root.dataset.dragWired === '1') return;
    root.dataset.dragWired = '1';

    var pressTimer = null;
    var dragging = false;
    var activePointerId = null;
    var startX = 0;
    var startY = 0;
    var dragRow = null;
    var placeholder = null;
    var grabOffsetY = 0;

    function clearPress() {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }

    function updatePlaceholder(clientY) {
      if (!placeholder || !root) return;
      var slots = Array.prototype.slice.call(root.querySelectorAll('.emp-role-manage-row:not(.is-dragging)'));
      var insertBefore = null;
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        if (slot === placeholder) continue;
        var rect = slot.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          insertBefore = slot;
          break;
        }
      }
      if (insertBefore) root.insertBefore(placeholder, insertBefore);
      else root.appendChild(placeholder);
    }

    function endDrag(commit) {
      clearPress();
      if (!dragging) {
        activePointerId = null;
        dragRow = null;
        return;
      }
      root.classList.remove('is-reordering');
      if (dragRow && placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragRow, placeholder);
      }
      if (placeholder && placeholder.parentNode) placeholder.remove();
      if (dragRow) {
        dragRow.classList.remove('is-dragging');
        dragRow.style.cssText = '';
        try { dragRow.releasePointerCapture(activePointerId); } catch (_) {}
      }
      dragging = false;
      activePointerId = null;
      dragRow = null;
      placeholder = null;
      if (commit) {
        commitRoleOrderFromDom();
        state.roleDragSuppressClick = true;
        setTimeout(function () { state.roleDragSuppressClick = false; }, 0);
      }
    }

    function startDrag(row) {
      if (dragging || !row || !root.contains(row)) return;
      dragging = true;
      clearPress();
      state.roleDragSuppressClick = true;
      dragRow = row;
      var rect = row.getBoundingClientRect();
      var listRect = root.getBoundingClientRect();
      placeholder = document.createElement('div');
      placeholder.className = 'emp-role-manage-row is-drag-placeholder';
      placeholder.style.height = rect.height + 'px';
      row.parentNode.insertBefore(placeholder, row);
      root.classList.add('is-reordering');
      row.classList.add('is-dragging');
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.width = rect.width + 'px';
      row.style.top = (rect.top - listRect.top + root.scrollTop) + 'px';
      row.style.zIndex = '20';
      grabOffsetY = startY - rect.top;
      try { row.setPointerCapture(activePointerId); } catch (_) {}
      if (navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
      }
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var row = e.target.closest('[data-role-manage]');
      if (!row || !root.contains(row)) return;
      var fromHandle = !!e.target.closest('[data-role-drag]');
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      clearPress();
      if (fromHandle) {
        e.preventDefault();
        startDrag(row);
        return;
      }
      pressTimer = setTimeout(function () {
        pressTimer = null;
        startDrag(row);
      }, EMP_ROLE_LONG_PRESS_MS);
    });

    root.addEventListener('pointermove', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging && pressTimer && (Math.abs(dx) > EMP_ROLE_MOVE_PX || Math.abs(dy) > EMP_ROLE_MOVE_PX)) {
        clearPress();
        return;
      }
      if (!dragging || !dragRow) return;
      e.preventDefault();
      var listRect = root.getBoundingClientRect();
      var rowH = dragRow.offsetHeight || 72;
      var nextTop = e.clientY - listRect.top + root.scrollTop - grabOffsetY;
      var maxTop = Math.max(0, root.scrollHeight - rowH);
      if (nextTop < 0) nextTop = 0;
      if (nextTop > maxTop) nextTop = maxTop;
      dragRow.style.top = nextTop + 'px';
      updatePlaceholder(e.clientY);
    });

    root.addEventListener('pointerup', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      endDrag(dragging);
    });
    root.addEventListener('pointercancel', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      endDrag(false);
    });
  }
  function openRoleManage() {
    renderRoleManageList();
    showScreen('screen-emp-roles');
    nav('staff-roles');
  }
  function openRoleNameDialog(mode, oldName, source) {
    state.roleEditMode = mode;
    state.roleEditOldName = oldName || '';
    state.roleEditSource = source || 'picker';
    var titleEl = $('empRoleNameTitle');
    var input = $('empRoleNameInput');
    var hint = $('empRoleNameHint');
    var delBtn = $('empRoleNameDelete');
    if (titleEl) titleEl.textContent = mode === 'add' ? '添加职位' : '编辑职位名称';
    if (input) {
      input.value = mode === 'rename' ? (oldName || '') : '';
      input.setAttribute('maxlength', String(ROLE_NAME_MAX));
      input.placeholder = '最多 ' + ROLE_NAME_MAX + ' 个字';
    }
    if (hint) {
      if (mode === 'rename') {
        var n = countStaffWithRole(oldName);
        if (n > 0) {
          hint.textContent = '将同步更新已选该职位的 ' + n + ' 名员工';
          hint.classList.remove('hidden');
        } else {
          hint.textContent = '';
          hint.classList.add('hidden');
        }
      } else {
        hint.textContent = '';
        hint.classList.add('hidden');
      }
    }
    if (delBtn) delBtn.classList.toggle('hidden', mode !== 'rename');
    openEmpDialog('empRoleNameMask');
    setTimeout(function () { input?.focus(); input?.select(); }, 50);
  }
  function refreshRoleUiAfterChange() {
    renderRolePickerList($('empFRole') ? $('empFRole').textContent : '');
    if (!$('screen-emp-roles')?.classList.contains('hidden')) renderRoleManageList();
    if (!$('screen-emp-list')?.classList.contains('hidden')) renderStaffList();
    if (state.currentStaffId && !$('screen-emp-detail')?.classList.contains('hidden')) {
      renderStaffDetail(state.currentStaffId);
    }
  }
  function commitRoleNameDialog() {
    var name = ($('empRoleNameInput')?.value || '').trim();
    if (!name) { toast('请输入职位名称'); return; }
    if (name.length > ROLE_NAME_MAX) { toast('职位名称不超过 ' + ROLE_NAME_MAX + ' 个字'); return; }
    var roles = ensureRoles();
    if (state.roleEditMode === 'add') {
      if (roles.indexOf(name) >= 0) { toast('该职位已存在'); return; }
      roles.push(name);
      closeEmpDialog('empRoleNameMask');
      toast('已添加职位');
      if (state.roleEditSource === 'picker') {
        $('empFRole').textContent = name;
        $('empFRole').classList.add('has-val');
      }
      refreshRoleUiAfterChange();
      return;
    }
    var oldName = state.roleEditOldName;
    if (!oldName) return;
    if (name === oldName) {
      closeEmpDialog('empRoleNameMask');
      return;
    }
    if (roles.indexOf(name) >= 0) { toast('该职位已存在'); return; }
    var idx = roles.indexOf(oldName);
    if (idx < 0) { toast('职位不存在', true); return; }
    roles[idx] = name;
    (window.EmployeeStore.staff || []).forEach(function (s) {
      if (s.role === oldName) s.role = name;
    });
    if ($('empFRole') && $('empFRole').textContent === oldName) {
      $('empFRole').textContent = name;
      $('empFRole').classList.add('has-val');
    }
    closeEmpDialog('empRoleNameMask');
    toast('职位已更新');
    refreshRoleUiAfterChange();
  }
  function staffRoleLabel(s) {
    return (s && s.role) ? s.role : '未设置';
  }
  function openRoleDelConfirm() {
    var oldName = state.roleEditOldName;
    if (!oldName) return;
    var n = countStaffWithRole(oldName);
    var body = $('empRoleDelConfirmBody');
    var title = $('empRoleDelConfirmTitle');
    if (title) title.textContent = '确认删除「' + oldName + '」？';
    if (body) {
      body.textContent = n > 0
        ? ('有 ' + n + ' 名员工使用该职位，删除后其职位将变为「未设置」。')
        : '删除后不可恢复。';
    }
    closeEmpDialog('empRoleNameMask');
    openEmpDialog('empRoleDelConfirmMask');
  }
  function closeRoleDelConfirm(reopenEdit) {
    closeEmpDialog('empRoleDelConfirmMask');
    if (reopenEdit && state.roleEditOldName) {
      openRoleNameDialog('rename', state.roleEditOldName, state.roleEditSource || 'page');
    }
  }
  function confirmDeleteRole() {
    var oldName = state.roleEditOldName;
    if (!oldName) {
      closeEmpDialog('empRoleDelConfirmMask');
      return;
    }
    var roles = ensureRoles();
    var idx = roles.indexOf(oldName);
    if (idx < 0) {
      closeEmpDialog('empRoleDelConfirmMask');
      toast('职位不存在', true);
      return;
    }
    roles.splice(idx, 1);
    var cleared = 0;
    (window.EmployeeStore.staff || []).forEach(function (s) {
      if (s.role === oldName) {
        s.role = '';
        cleared += 1;
      }
    });
    if ($('empFRole') && $('empFRole').textContent === oldName) {
      $('empFRole').textContent = '请选择';
      $('empFRole').classList.remove('has-val');
    }
    state.roleEditOldName = '';
    closeEmpDialog('empRoleDelConfirmMask');
    toast(cleared > 0 ? ('职位已删除，已清空 ' + cleared + ' 名员工的职位') : '职位已删除');
    refreshRoleUiAfterChange();
  }
  function deleteRoleFromDialog() {
    if (!state.roleEditOldName) return;
    openRoleDelConfirm();
  }

  function schemeById(id) {
    var C = window.Comm2Demo;
    if (C && typeof C.getSchemes === 'function') {
      var found = (C.getSchemes() || []).find(function (s) { return s.id === id; });
      if (found) return found;
    }
    return (window.EmployeeStore.schemes || []).find(function (s) { return s.id === id; });
  }

  /** 员工所在全部提成方案（优先提成设置链路 Comm2 的 assigneeIds；回退旧模型 assigned） */
  function schemesAssignedToStaff(staffId) {
    var C = window.Comm2Demo;
    if (C && typeof C.getSchemes === 'function') {
      return (C.getSchemes() || []).filter(function (sch) {
        return (sch.assigneeIds || []).indexOf(staffId) >= 0;
      });
    }
    return (window.EmployeeStore.schemes || []).filter(function (sch) {
      return (sch.assigned || []).indexOf(staffId) >= 0;
    });
  }

  function syncStaffSchemeFields(st) {
    if (!st) return;
    var list = schemesAssignedToStaff(st.id);
    st.schemeIds = list.map(function (s) { return s.id; });
    if (!list.length) {
      st.scheme = '暂未分配';
      st.schemeId = null;
      return;
    }
    st.schemeId = list[0].id;
    st.scheme = list.length === 1
      ? list[0].name
      : list.map(function (s) { return s.name; }).join('、');
  }

  /** 员工已分配方案名（优先 Comm2） */
  function staffSchemeNames(staffId) {
    var C = window.Comm2Demo;
    if (C && typeof C.getSchemes === 'function') {
      return (C.getSchemes() || []).filter(function (sch) {
        return (sch.assigneeIds || []).indexOf(staffId) >= 0;
      }).map(function (sch) { return sch.name || ''; }).filter(Boolean);
    }
    return schemesAssignedToStaff(staffId).map(function (sch) { return sch.name || ''; }).filter(Boolean);
  }

  /** 名字下方方案胶囊：一方案一胶囊；无方案显示「未分配」 */
  function staffSchemePillsHtml(staffId) {
    var names = staffSchemeNames(staffId);
    if (!names.length) {
      return '<div class="emp-scheme-pills"><span class="emp-scheme-pill">未分配</span></div>';
    }
    return '<div class="emp-scheme-pills">' + names.map(function (n) {
      return '<span class="emp-scheme-pill" title="' + esc(n) + '">' + esc(n) + '</span>';
    }).join('') + '</div>';
  }

  function syncAllStaffSchemeFields() {
    (window.EmployeeStore.staff || []).forEach(syncStaffSchemeFields);
  }

  /** 阶梯档：按合计业绩命中区间 */
  function ladderTierForTotal(sch, totalPerf) {
    var tiers = sch && sch.ladder ? sch.ladder : [];
    var n = Number(totalPerf) || 0;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      var min = Number(t.min) || 0;
      var max = (t.max == null || t.max === '') ? Infinity : Number(t.max);
      if (n >= min && (max === Infinity ? true : n < max || (i === tiers.length - 1 && n <= max))) {
        return t;
      }
    }
    return tiers.length ? tiers[tiers.length - 1] : null;
  }

  function ladderCoversCategory(sch, cat) {
    if (!sch || sch.type !== 'ladder') return false;
    if (!sch.scopeMode || sch.scopeMode === 'all') return true;
    var scope = sch.scope || {};
    if (cat === 'labor') return !!(scope.projectIds && scope.projectIds.length);
    if (cat === 'sales') return !!(scope.productIds && scope.productIds.length);
    if (cat === 'issue' || cat === 'card') return !!(scope.cardIds && scope.cardIds.length);
    return false;
  }

  var LADDER_PAY_TYPE_DEFS = [
    { key: 'cash', label: '现金' },
    { key: 'memberCard', label: '卡付' },
    { key: 'groupBuy', label: '团购' },
  ];

  function ensureLadderScheme(sch) {
    if (!sch || sch.type !== 'ladder') return sch;
    ensureSchemeScope(sch);
    if (sch.ladderCalcMode !== 'progressive') sch.ladderCalcMode = 'top';
    if (!sch.ladderPayTypes || typeof sch.ladderPayTypes !== 'object') {
      sch.ladderPayTypes = { cash: true, memberCard: true, groupBuy: true };
    }
    LADDER_PAY_TYPE_DEFS.forEach(function (def) {
      if (sch.ladderPayTypes[def.key] == null) sch.ladderPayTypes[def.key] = true;
    });
    return sch;
  }

  function formatLadderPayTypesShort(sch) {
    ensureLadderScheme(sch);
    var labels = LADDER_PAY_TYPE_DEFS.filter(function (d) { return sch.ladderPayTypes[d.key]; }).map(function (d) { return d.label; });
    return labels.length ? labels.join('/') : '未选渠道';
  }

  function ladderLineCat(line) {
    if (line.kind === 'product') return 'sales';
    if (line.kind === 'card') return 'issue';
    return 'labor';
  }

  function ladderLineInScope(sch, line) {
    if (!ladderCoversCategory(sch, ladderLineCat(line))) return false;
    if (!sch.scopeMode || sch.scopeMode === 'all') return true;
    var scope = sch.scope || {};
    var refId = line.refId;
    if (line.kind === 'product') return !!(scope.productIds && scope.productIds.indexOf(refId) >= 0);
    if (line.kind === 'card') return !!(scope.cardIds && scope.cardIds.indexOf(refId) >= 0);
    return !!(scope.projectIds && scope.projectIds.indexOf(refId) >= 0);
  }

  function ladderLineMatchesPayType(sch, line) {
    ensureLadderScheme(sch);
    return !!sch.ladderPayTypes[payTypeKeyForChannel(line.channel)];
  }

  function ladderLineEligible(sch, line) {
    return ladderLineMatchesPayType(sch, line) && ladderLineInScope(sch, line);
  }

  function calcLadderTopTierComm(sch, totalAch) {
    var tier = ladderTierForTotal(sch, totalAch);
    if (!tier) return 0;
    if (normalizeCommMode(tier.mode) === 'amount') return Number(tier.pct) || 0;
    return Math.round(totalAch * (Number(tier.pct) || 0) / 100 * 100) / 100;
  }

  function calcLadderProgressiveComm(sch, totalAch) {
    var tiers = sch.ladder || [];
    var n = Math.max(0, Number(totalAch) || 0);
    if (!n || !tiers.length) return 0;
    var hitTier = ladderTierForTotal(sch, n);
    if (hitTier && normalizeCommMode(hitTier.mode) === 'amount') return Number(hitTier.pct) || 0;
    var sum = 0;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (normalizeCommMode(t.mode) === 'amount') continue;
      var min = Number(t.min) || 0;
      var max = (t.max == null || t.max === '') ? Infinity : Number(t.max);
      if (n <= min) break;
      var segEnd = Math.min(n, max === Infinity ? n : max);
      var width = segEnd - min;
      if (width > 0) sum += width * (Number(t.pct) || 0) / 100;
    }
    return Math.round(sum * 100) / 100;
  }

  function calcLadderTotalComm(sch, totalAch) {
    ensureLadderScheme(sch);
    var n = Math.max(0, Number(totalAch) || 0);
    if (!n) return 0;
    if (sch.ladderCalcMode === 'progressive') return calcLadderProgressiveComm(sch, n);
    return calcLadderTopTierComm(sch, n);
  }

  function allocateProportionalComm(lines, totalComm, weightFn) {
    if (!lines.length || !totalComm) return lines.map(function () { return 0; });
    var weights = lines.map(weightFn);
    var totalW = weights.reduce(function (s, w) { return s + w; }, 0);
    if (!totalW) return lines.map(function () { return 0; });
    var out = [];
    var used = 0;
    for (var i = 0; i < lines.length; i++) {
      if (i === lines.length - 1) {
        out.push(roundMoney2(totalComm - used));
      } else {
        var amt = roundMoney2(totalComm * weights[i] / totalW);
        out.push(amt);
        used = roundMoney2(used + amt);
      }
    }
    return out;
  }

  function ensureLadderAllocation(staffId, linesOverride) {
    if (!window._ladderAllocCache) window._ladderAllocCache = {};
    if (!linesOverride && window._ladderAllocCache[staffId]) return window._ladderAllocCache[staffId];
    var result = {};
    var lines = linesOverride || getCommLines(staffId);
    lines.forEach(function (ln) { result[ln.id] = 0; });
    var schemes = schemesAssignedToStaff(staffId).filter(function (s) { return s.type === 'ladder'; });
    schemes.forEach(function (sch) {
      ensureLadderScheme(sch);
      var eligible = lines.filter(function (ln) { return ladderLineEligible(sch, ln); });
      var totalAch = eligible.reduce(function (s, ln) { return s + (Number(ln.ach) || 0); }, 0);
      if (!totalAch) return;
      var totalComm = calcLadderTotalComm(sch, totalAch);
      if (!totalComm) return;
      var amts = allocateProportionalComm(eligible, totalComm, function (ln) { return Number(ln.ach) || 0; });
      eligible.forEach(function (ln, idx) {
        result[ln.id] = Math.max(result[ln.id] || 0, amts[idx]);
      });
    });
    if (!linesOverride) window._ladderAllocCache[staffId] = result;
    return result;
  }

  function renderLadderSettings(sch) {
    ensureLadderScheme(sch);
    var segEl = $('empLadderCalcModeSeg');
    if (segEl) {
      var curMode = sch.ladderCalcMode === 'progressive' ? 'progressive' : 'top';
      segEl.innerHTML = [
        { id: 'top', label: '全额最高档' },
        { id: 'progressive', label: '每段不同档' },
      ].map(function (m) {
        var on = m.id === curMode;
        return '<button type="button" class="emp-ach-calc-seg__btn' + (on ? ' on' : '') +
          '" data-ladder-calc-mode="' + m.id + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' + esc(m.label) + '</button>';
      }).join('');
    }
    var cycleVal = $('empLadderPayCycleVal');
    if (cycleVal) cycleVal.textContent = payCycleModeLabel();
    var chipsEl = $('empLadderPayTypeChips');
    if (chipsEl) {
      chipsEl.innerHTML = LADDER_PAY_TYPE_DEFS.map(function (def) {
        var on = !!sch.ladderPayTypes[def.key];
        return '<button type="button" class="emp-ladder-pay-chip' + (on ? ' on' : '') +
          '" data-ladder-pay-type="' + def.key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(def.label) + '</button>';
      }).join('');
    }
    syncLadderSettingsFold(sch);
  }

  function syncLadderSettingsFold(sch) {
    ensureLadderScheme(sch);
    var fold = $('empLadderSettingsFold');
    var sumEl = $('empLadderSettingsSum');
    var toggle = $('empLadderSettingsToggle');
    var actionLbl = $('empLadderSettingsActionLbl');
    var screen = $('screen-emp-comm-ladder');
    var collapsed = state.ladderSettingsCollapsed !== false;
    var editing = state.ladderExpandIdx != null;
    if (fold) fold.classList.toggle('is-collapsed', collapsed);
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if (actionLbl) actionLbl.textContent = collapsed ? '展开' : '收起';
    if (screen) {
      screen.classList.toggle('is-ladder-editing', !!editing);
      screen.classList.remove('is-fold-collapsed');
    }
    if (!sumEl) return;
    var calcLbl = sch.ladderCalcMode === 'progressive' ? '每段不同档' : '全额最高档';
    var payLbl = formatLadderPayTypesShort(sch);
    var cycleLbl = payCycleModeLabel();
    var scopeLbl = sch.scopeMode === 'custom' ? '自定义范围' : '全部适用';
    sumEl.textContent = [calcLbl, payLbl, cycleLbl, scopeLbl].filter(Boolean).join(' · ');
  }

  function flashLadderFoldHintOnce() {
    if (state.ladderFoldHintFlashed) return;
    if (state.ladderSettingsCollapsed === false) return;
    var btn = $('empLadderSettingsToggle');
    if (!btn) return;
    state.ladderFoldHintFlashed = true;
    btn.classList.add('is-hint-pulse');
    setTimeout(function () { btn.classList.remove('is-hint-pulse'); }, 2400);
  }

  function readLadderSettingsFromDom(sch) {
    ensureLadderScheme(sch);
    var modeBtn = document.querySelector('#empLadderCalcModeSeg [data-ladder-calc-mode].on');
    sch.ladderCalcMode = modeBtn && modeBtn.dataset.ladderCalcMode === 'progressive' ? 'progressive' : 'top';
    LADDER_PAY_TYPE_DEFS.forEach(function (def) {
      var chip = document.querySelector('#empLadderPayTypeChips [data-ladder-pay-type="' + def.key + '"]');
      sch.ladderPayTypes[def.key] = !!(chip && chip.classList.contains('on'));
    });
    return sch;
  }

  function validateLadderPayTypes(sch) {
    ensureLadderScheme(sch);
    var any = LADDER_PAY_TYPE_DEFS.some(function (d) { return sch.ladderPayTypes[d.key]; });
    return any ? '' : '请至少选择一种提成类型';
  }

  function openPayCycleFromLadder() {
    state.payCycleReturnScreen = 'screen-emp-comm-ladder';
    openPayCycleSettings();
  }

  function returnFromPayCycleSettings() {
    var ret = state.payCycleReturnScreen;
    state.payCycleReturnScreen = null;
    if (ret === 'screen-emp-comm-ladder') {
      var sch = schemeById(state.editingSchemeId);
      if (sch && sch.type === 'ladder') renderLadderSettings(sch);
      showScreen('screen-emp-comm-ladder');
      nav('staff-comm-ladder');
      return;
    }
    openSalary();
  }

  /** 消费类型键：行/消费来源映射到提成设置的 payTypes 键 */
  function payTypeKeyForChannel(channel) {
    var c = String(channel || '');
    if (c.indexOf('团购') >= 0) return 'groupBuy';
    if (c.indexOf('储值') >= 0 || c.indexOf('会员') >= 0 || c.indexOf('卡') >= 0) return 'memberCard';
    return 'cash';
  }

  /** 找按项覆盖：同一分类下 refId 或名称命中 */
  function findItemOverride(sch, cat, lineCtx) {
    if (!sch || sch.type !== 'item' || sch.itemOverridesEnabled === false) return null;
    if (!lineCtx || !Array.isArray(sch.items) || !sch.items.length) return null;
    var kindMap = { labor: 'project', sales: 'product', issue: 'card', card: 'card' };
    var wantKind = kindMap[cat];
    var name = String(lineCtx.name || '');
    var refId = String(lineCtx.refId || '');
    for (var i = 0; i < sch.items.length; i++) {
      var it = sch.items[i];
      if (it.kind !== wantKind) continue;
      if (refId && it.refId && String(it.refId) === refId) return it;
      if (name && it.name && String(it.name) === name) return it;
    }
    return null;
  }

  /** 单方案对某一计算项算出的提成金额（元）；lineCtx 提供单行上下文（name/refId/channel/isWalkIn/adv） */
  function schemeCategoryCommAmount(sch, cat, baseAmt, totalPerf, lineCtx) {
    if (!sch) return 0;
    var base = Math.max(0, Number(baseAmt) || 0);
    if (lineCtx && lineCtx.adv === 'none') return 0;
    if (sch.type === 'ladder') {
      if (!ladderCoversCategory(sch, cat)) return 0;
      var tier = ladderTierForTotal(sch, totalPerf);
      if (!tier) return 0;
      if (normalizeCommMode(tier.mode) === 'amount') {
        /* 固定金额阶梯：整笔只记在劳动项，避免四类各算一次 */
        return cat === 'labor' ? (Number(tier.pct) || 0) : 0;
      }
      return Math.round(base * (Number(tier.pct) || 0) / 100 * 100) / 100;
    }
    var rule = findItemOverride(sch, cat, lineCtx);
    if (!rule) {
      if (sch.categoryDefaultsEnabled === false) return 0;
      rule = sch.categoryDefaults && sch.categoryDefaults[cat];
      /* 提成设置链路方案：defaults[cat].rule 结构 */
      if (!rule && sch.defaults && sch.defaults[cat]) rule = sch.defaults[cat].rule || sch.defaults[cat];
    }
    if (!rule) return 0;
    rule = mergeItemCommRule(rule);
    var walkIn = !!(lineCtx && lineCtx.isWalkIn);
    if (rule.byPayType && rule.payTypes) {
      var payKey = payTypeKeyForChannel(lineCtx && lineCtx.channel);
      var pb = rule.payTypes[payKey] || rule.payTypes.cash;
      if (pb) {
        if (rule.valueMode === 'amount') {
          return Math.max(0, Number(walkIn ? pb.nonDesignatedAmt : pb.designatedAmt) || 0);
        }
        return Math.round(base * (Number(walkIn ? pb.nonDesignated : pb.designated) || 0) / 100 * 100) / 100;
      }
    }
    if (rule.valueMode === 'amount') {
      return Math.max(0, Number(walkIn ? rule.nonDesignatedAmt : rule.designatedAmt) || 0);
    }
    return Math.round(base * (Number(walkIn ? rule.nonDesignated : rule.designated) || 0) / 100 * 100) / 100;
  }

  /**
   * 多方案重叠：劳动/产品/办卡/充卡分别取「提成金额最高」的一条，再累加；禁止同项重复计入。
   * bases: { labor, sales, issue, card|consume }
   */
  function calcStaffCommissionFromSchemes(staffId, bases) {
    var schemes = schemesAssignedToStaff(staffId);
    if (!schemes.length) return 0;
    var labor = Number(bases.labor) || 0;
    var sales = Number(bases.sales) || 0;
    var issue = Number(bases.issue) || 0;
    var card = Number(bases.consume != null ? bases.consume : bases.card) || 0;
    var totalPerf = labor + sales + issue + card;
    var cats = [
      { key: 'labor', base: labor },
      { key: 'sales', base: sales },
      { key: 'issue', base: issue },
      { key: 'card', base: card },
    ];
    var sum = 0;
    cats.forEach(function (c) {
      var best = 0;
      var has = false;
      schemes.forEach(function (sch) {
        var amt = schemeCategoryCommAmount(sch, c.key, c.base, totalPerf);
        if (!has || amt > best) { best = amt; has = true; }
      });
      if (has) sum += best;
    });
    return Math.round(sum * 100) / 100;
  }

  function refreshStaffCommissionRow(staffId, d) {
    if (!d) return d;
    d.commission = sumCommLines(staffId);
    var rewardNet = (Number(d.reward) || 0) - (Number(d.deduct) || 0);
    d.total = calcSalaryTotal(d.base, d.commission, rewardNet);
    return d;
  }

  /** 提成明细行之和 = 该员工本期提成（与明细页完全一致） */
  function sumCommLines(staffId) {
    return getCommLines(staffId).reduce(function (s, l) {
      return s + (Number(l.comm) || 0);
    }, 0);
  }

  /** 单行提成：固定比例走按项规则；阶梯比例按周期合计后分摊到行 */
  function calcLineCommission(line, staffId) {
    var schemes = schemesAssignedToStaff(staffId);
    if (!schemes.length) return 0;
    var cat = line.kind === 'product' ? 'sales' : (line.kind === 'card' ? 'issue' : 'labor');
    if ((cat === 'issue' || cat === 'card') && getCardAchBaseMode() === '不计算业绩') return 0;
    var ladderComm = 0;
    if (schemes.some(function (s) { return s.type === 'ladder'; })) {
      ladderComm = (ensureLadderAllocation(staffId)[line.id]) || 0;
    }
    var base;
    if (cat === 'labor' || cat === 'sales') {
      var tabBase = getTabAchBaseMode(cat);
      if (tabBase === '不计算业绩') return Math.round(ladderComm * 100) / 100;
      base = tabBase === '按售价'
        ? Math.max(0, Number(line.price) || 0)
        : Math.max(0, Number(line.ach) || 0);
    } else {
      base = Math.max(0, Number(line.ach) || 0);
    }
    if (!base) return Math.round(ladderComm * 100) / 100;
    var baseRow = ensureSalaryBaseRow(state.salaryMonth, staffId);
    var totalPerf = 0;
    if (baseRow) {
      totalPerf = (Number(baseRow.labor) || 0) + (Number(baseRow.sales) || 0) +
        (Number(baseRow.issue) || 0) + (Number(baseRow.consume != null ? baseRow.consume : baseRow.card) || 0);
    }
    base = applyAchCost(cat, base);
    var lineCtx = {
      name: line.name,
      refId: line.refId,
      channel: line.channel,
      isWalkIn: !!line.isWalkIn,
      adv: lineCommRuleForAdv(line),
    };
    var itemBest = 0;
    var itemHas = false;
    schemes.forEach(function (sch) {
      if (sch.type === 'ladder') return;
      var amt = schemeCategoryCommAmount(sch, cat, base, totalPerf, lineCtx);
      if (!itemHas || amt > itemBest) { itemBest = amt; itemHas = true; }
    });
    var best = itemHas ? itemBest : 0;
    if (ladderComm > best) best = ladderComm;
    return Math.round(best * 100) / 100;
  }

  /** 基础设置口径对单行的约束：不参与提成则返回 'none' */
  function lineCommRuleForAdv(line) {
    var adv = window.EmployeeStore && window.EmployeeStore.advRules;
    if (!Array.isArray(adv)) return '';
    function val(label, fallback) {
      var r = adv.find(function (x) { return x && x.label === label; });
      return r ? r.value : fallback;
    }
    if (line.isFreeOrder && val('免单', '计算业绩和提成') !== '计算业绩和提成') return 'none';
    if (line.isGift && val('赠送项目（产品）', '按原价计算') === '不计算业绩') return 'none';
    if (line.isCoupon && val('抵用券', '按原价计算') === '不计算业绩') return 'none';
    if (line.isConsumeGift && val('消耗赠送金额', '按卡耗金额计算') === '不计算业绩') return 'none';
    return '';
  }

  /** 业绩设置的成本扣减：实收扣成本/售价扣成本/固定成本 */
  function applyAchCost(cat, base) {
    var ach = window.EmployeeStore && window.EmployeeStore.ach;
    if (!ach) return base;
    var bucket = cat === 'sales' ? ach.sales : (cat === 'issue' || cat === 'card' ? ach.card : ach.labor);
    if (!bucket) return base;
    var scheme = bucket.defaultScheme;
    if (!scheme && cat === 'card' && bucket.incomeTypes) scheme = bucket.incomeTypes.open;
    if (!scheme) return base;
    var mode = scheme.costMode || 'off';
    var v = Number(base) || 0;
    if (mode === 'receipt' || mode === 'price') {
      return Math.max(0, Math.round(v * (100 - (Number(scheme.costPct) || 0)) / 100 * 100) / 100);
    }
    if (mode === 'fixed') {
      return Math.max(0, Math.round((v - (Number(scheme.costFixed) || 0)) * 100) / 100);
    }
    return base;
  }

  function getAdvRuleValue(label, fallback) {
    var adv = window.EmployeeStore && window.EmployeeStore.advRules;
    if (!Array.isArray(adv)) return fallback;
    var r = adv.find(function (x) { return x && x.label === label; });
    return r ? r.value : fallback;
  }

  /** 基础设置四条口径的可见条目（薪资列表顶部 chip 展示，改配置即可见） */
  function advToneItems() {
    var labels = ['免单', '消耗赠送金额', '赠送项目（产品）', '抵用券'];
    var out = [];
    labels.forEach(function (label) {
      var v = getAdvRuleValue(label, '');
      if (v) out.push({ label: label, value: v });
    });
    return out;
  }

  function advToneSummaryText() {
    return advToneItems().map(function (it) { return it.label + '：' + it.value; }).join(' · ');
  }

  /** 薪资 hero 卡：口径规则以独立 chip 呈现，与结算周期分层展示 */
  function renderToneChips() {
    var chipsEl = $('empToneChips');
    if (!chipsEl) return;
    chipsEl.innerHTML = advToneItems().map(function (it) {
      return '<span class="emp-tone-chip"><span class="emp-tone-chip__lbl">' + esc(it.label) + '</span>' + esc(it.value) + '</span>';
    }).join('');
  }

  /** 从提成设置 Comm2 同步员工方案名（演示数据同源） */
  function syncStaffSchemeFromComm2() {
    var C = window.Comm2Demo;
    if (!C || typeof C.getSchemes !== 'function') return;
    var schemes = C.getSchemes() || [];
    (window.EmployeeStore.staff || []).forEach(function (st) {
      var list = schemes.filter(function (sch) {
        return (sch.assigneeIds || []).indexOf(st.id) >= 0;
      });
      st.schemeIds = list.map(function (x) { return x.id; });
      if (!list.length) {
        st.scheme = '暂未分配';
        st.schemeId = null;
        return;
      }
      st.schemeId = list[0].id;
      st.scheme = list.length === 1
        ? list[0].name
        : list.map(function (x) { return x.name; }).join('、');
    });
  }

  /** 方案/分配变更后重算；保留已手工改过的提成值与留痕 */
  function invalidateCommLineCache() {
    var store = window.EmployeeStore;
    if (!store) return;
    syncStaffSchemeFromComm2();
    var cl = store.commLines || {};
    var preserved = {};
    Object.keys(cl).forEach(function (key) {
      preserved[key] = {};
      (cl[key] || []).forEach(function (ln) {
        if (ln.commManual || (ln.commEditLogs && ln.commEditLogs.length)) {
          var mk = ln.comm2TrialId || ln.refId || ln.name;
          preserved[key][mk] = {
            comm: ln.comm,
            logs: (ln.commEditLogs || []).slice(),
            editedBy: ln.editedBy || null,
            commManual: true
          };
        }
      });
    });
    store.commLines = {};
    window._ladderAllocCache = {};
    window._commManualPreserve = preserved;
    var bucket = store.salary && store.salary[state.salaryMonth];
    var staffIds = bucket ? Object.keys(bucket) : [];
    if (!staffIds.length) {
      staffIds = (store.staff || []).map(function (x) { return x.id; });
    }
    staffIds.forEach(function (sid) {
      var row = genSalaryIfMissing(state.salaryMonth, sid);
      if (row) refreshStaffCommissionRow(sid, row);
    });
    window._commManualPreserve = null;
    if (!$('screen-emp-salary')?.classList.contains('hidden')) renderSalaryList();
  }

  function ensureSalaryBaseRow(monthKey, staffId) {
    var store = window.EmployeeStore;
    ensurePeriodDataBucket('salary', monthKey);
    var st = staffById(staffId);
    if (!st) return null;
    if (store.salary[monthKey][staffId]) {
      var existing = normalizeSalaryRow(store.salary[monthKey][staffId]);
      existing.base = st.baseSalary || 0;
      return existing;
    }
    /* 无种子月份：按角色生成合理区间，提成由明细行计算（明细行之和） */
    var role = st.role || '';
    var seed = (parseInt(String(monthKey).replace(/-/g, ''), 10) || 0) + (staffId.charCodeAt(2) || 0) * 17;
    var labor = 0;
    var sales = 0;
    var issue = 0;
    if (role === '前台') {
      labor = 0; sales = 0; issue = 0;
    } else if (role === '学徒') {
      labor = 2200 + (seed % 1400);
      sales = 120 + (seed % 200);
      issue = 0;
    } else if (role === '美甲师' || role === '美睫师') {
      labor = 6000 + (seed % 4500);
      sales = 600 + (seed % 900);
      issue = 200 + (seed % 500);
    } else if (role === '店主' || role === '店长') {
      labor = 16000 + (seed % 9000);
      sales = 3000 + (seed % 2500);
      issue = 4000 + (seed % 4000);
    } else {
      /* 美容师 / 美发师等 */
      labor = 11000 + (seed % 12000);
      sales = 1200 + (seed % 1600);
      issue = 1200 + (seed % 2800);
    }
    if (!(st.baseSalary > 0) && role !== '前台' && role !== '学徒') {
      /* 信息未完善：保留少量可演示业绩 */
      labor = Math.round(labor * 0.45);
      sales = Math.round(sales * 0.4);
      issue = Math.round(issue * 0.35);
    }
    var consume = issue ? Math.round(issue * 0.3) : 0;
    var reward = seed % 7 === 0 ? 100 : 0;
    var deduct = seed % 11 === 0 ? 50 : 0;
    var base = st.baseSalary || 0;
    var row = {
      base: base, labor: labor, sales: sales, issue: issue, consume: consume, card: issue,
      commission: 0, reward: reward, deduct: deduct, total: base,
    };
    store.salary[monthKey][staffId] = row;
    return row;
  }

  function genSalaryIfMissing(monthKey, staffId) {
    var base = ensureSalaryBaseRow(monthKey, staffId);
    if (!base) return null;
    return refreshStaffCommissionRow(staffId, base);
  }

  function normalizeSalaryRow(d) {
    if (!d) return d;
    if (d.issue == null && d.card != null) d.issue = d.card;
    if (d.consume == null) d.consume = Math.round(Number(d.card || d.issue || 0) * 0.35);
    return d;
  }

  function calcSalaryTotal(base, commission, rewardNet) {
    return Math.round(((Number(base) || 0) + (Number(commission) || 0) + (Number(rewardNet) || 0)) * 100) / 100;
  }

  function empDragHandleIconHtml() {
    return '<svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">' +
      '<circle cx="6" cy="4.5" r="1.35"/><circle cx="12" cy="4.5" r="1.35"/>' +
      '<circle cx="6" cy="9" r="1.35"/><circle cx="12" cy="9" r="1.35"/>' +
      '<circle cx="6" cy="13.5" r="1.35"/><circle cx="12" cy="13.5" r="1.35"/>' +
      '</svg>';
  }

  function renderStaffList() {
    var root = $('empListRoot');
    if (!root) return;
    root.innerHTML = window.EmployeeStore.staff.map(function (s) {
      var refine = s.incomplete
        ? '<button type="button" class="emp-refine-btn" data-emp-refine="' + s.id + '">去完善</button>'
        : '';
      var subParts = [s.gender, staffRoleLabel(s)].filter(Boolean);
      var sub = subParts.length
        ? subParts.join(' · ')
        : (s.incomplete ? '信息未完善' : '');
      var st = s.status || '在岗';
      var statusTag = (st === '在岗' || st === '休假' || st === '离职')
        ? '<span class="emp-row__status emp-row__status--' + empStatusChipMod(st) + '">' + esc(st) + '</span>'
        : '';
      return '<div class="emp-row" data-staff-id="' + s.id + '">' +
        '<button type="button" class="emp-row__drag" data-emp-drag="' + s.id + '" aria-label="拖动排序">' +
        empDragHandleIconHtml() + '</button>' +
        empAvatarHtml(s) +
        '<div class="emp-row__main">' +
        '<div class="emp-row__name"><span class="emp-row__name-text">' + esc(s.name) + '</span>' + statusTag + '</div>' +
        (sub ? '<div class="emp-row__sub">' + esc(sub) + '</div>' : '') +
        '</div>' + refine + navChevHtml() + '</div>';
    }).join('');
  }

  function commitStaffOrderFromDom() {
    var root = $('empListRoot');
    if (!root) return;
    var ids = Array.prototype.map.call(
      root.querySelectorAll('.emp-row[data-staff-id]:not(.is-drag-placeholder)'),
      function (r) { return r.dataset.staffId; }
    ).filter(Boolean);
    var staff = window.EmployeeStore.staff || [];
    var ordered = ids.map(function (id) {
      return staff.find(function (s) { return s.id === id; });
    }).filter(Boolean);
    if (ordered.length !== staff.length) return;
    window.EmployeeStore.staff = ordered;
  }

  var EMP_LIST_LONG_PRESS_MS = 400;
  var EMP_LIST_MOVE_PX = 8;

  function wireStaffListDrag() {
    var root = $('empListRoot');
    if (!root || root.dataset.dragWired === '1') return;
    root.dataset.dragWired = '1';

    var pressTimer = null;
    var dragging = false;
    var activePointerId = null;
    var startX = 0;
    var startY = 0;
    var dragRow = null;
    var placeholder = null;
    var grabOffsetY = 0;

    function clearPress() {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }

    function updatePlaceholder(clientY) {
      if (!placeholder || !root) return;
      var slots = Array.prototype.slice.call(root.querySelectorAll('.emp-row:not(.is-dragging)'));
      var insertBefore = null;
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        if (slot === placeholder) continue;
        var rect = slot.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          insertBefore = slot;
          break;
        }
      }
      if (insertBefore) root.insertBefore(placeholder, insertBefore);
      else root.appendChild(placeholder);
    }

    function endDrag(commit) {
      clearPress();
      if (!dragging) {
        activePointerId = null;
        dragRow = null;
        return;
      }
      root.classList.remove('is-reordering');
      if (dragRow && placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragRow, placeholder);
      }
      if (placeholder && placeholder.parentNode) placeholder.remove();
      if (dragRow) {
        dragRow.classList.remove('is-dragging');
        dragRow.style.cssText = '';
        try { dragRow.releasePointerCapture(activePointerId); } catch (_) {}
      }
      dragging = false;
      activePointerId = null;
      dragRow = null;
      placeholder = null;
      if (commit) {
        commitStaffOrderFromDom();
        state.staffDragSuppressClick = true;
        setTimeout(function () { state.staffDragSuppressClick = false; }, 0);
      }
    }

    function startDrag(row) {
      if (dragging || !row || !root.contains(row)) return;
      dragging = true;
      clearPress();
      state.staffDragSuppressClick = true;
      dragRow = row;
      var rect = row.getBoundingClientRect();
      var listRect = root.getBoundingClientRect();
      placeholder = document.createElement('div');
      placeholder.className = 'emp-row is-drag-placeholder';
      placeholder.style.height = rect.height + 'px';
      row.parentNode.insertBefore(placeholder, row);
      root.classList.add('is-reordering');
      row.classList.add('is-dragging');
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.width = rect.width + 'px';
      row.style.top = (rect.top - listRect.top + root.scrollTop) + 'px';
      row.style.zIndex = '20';
      grabOffsetY = startY - rect.top;
      try { row.setPointerCapture(activePointerId); } catch (_) {}
      if (navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
      }
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('[data-emp-refine]')) return;
      var row = e.target.closest('[data-staff-id]');
      if (!row || !root.contains(row)) return;
      var fromHandle = !!e.target.closest('[data-emp-drag]');
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      clearPress();
      if (fromHandle) {
        e.preventDefault();
        startDrag(row);
        return;
      }
      pressTimer = setTimeout(function () {
        pressTimer = null;
        startDrag(row);
      }, EMP_LIST_LONG_PRESS_MS);
    });

    root.addEventListener('pointermove', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging && pressTimer && (Math.abs(dx) > EMP_LIST_MOVE_PX || Math.abs(dy) > EMP_LIST_MOVE_PX)) {
        clearPress();
        return;
      }
      if (!dragging || !dragRow) return;
      e.preventDefault();
      var listRect = root.getBoundingClientRect();
      var rowH = dragRow.offsetHeight || 72;
      var nextTop = e.clientY - listRect.top + root.scrollTop - grabOffsetY;
      var maxTop = Math.max(0, root.scrollHeight - rowH);
      if (nextTop < 0) nextTop = 0;
      if (nextTop > maxTop) nextTop = maxTop;
      dragRow.style.top = nextTop + 'px';
      updatePlaceholder(e.clientY);
    });

    root.addEventListener('pointerup', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      endDrag(dragging);
    });
    root.addEventListener('pointercancel', function (e) {
      if (activePointerId == null || e.pointerId !== activePointerId) return;
      endDrag(false);
    });
  }

  function empStatusChipMod(status) {
    if (status === '休假') return 'leave';
    if (status === '离职') return 'quit';
    return 'active';
  }
  function empStatusChipHtml(status) {
    var st = status || '在岗';
    var mod = empStatusChipMod(st);
    return '<button type="button" class="emp-status-chip emp-status-chip--' + mod +
      '" data-emp-status-chip aria-label="调整状态：' + esc(st) + '">' +
      esc(st) +
      '<svg class="emp-status-chip__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>';
  }

  function renderStaffDetail(id) {
    var s = staffById(id);
    var body = $('empDetailBody');
    if (!s || !body) return;
    state.currentStaffId = id;
    var sw = s.swordId ? swordById(s.swordId) : null;
    /* 薪资可见范围：店员/高级店员仅自己；店长不包含店主/合伙人；店主/合伙人全部可见 */
    var hideSalary = !canViewSalaryOf(s);
    body.innerHTML =
      '<div class="emp-detail-head">' +
      empAvatarHtml(s) +
      '<div class="emp-detail-head__text"><div class="emp-detail-head__name">' + esc(s.name) + '</div>' +
      '<div class="emp-detail-head__meta">' +
      '<span class="emp-detail-head__role">' + esc(staffRoleLabel(s)) + '</span>' +
      empStatusChipHtml(s.status) +
      '</div></div></div>' +
      '<div class="emp-card emp-detail-card">' +
      row('剑号', s.swordTitle || '暂未选择') +
      swordDetailRow(sw) +
      row('性别', s.gender || '未填写') +
      row('年龄段', s.ageBand || '未填写') +
      row('从业年限', (s.yearsExp != null && s.yearsExp !== '') ? (s.yearsExp + ' 年') : '未填写') +
      row('员工手机号', s.phone || '未填写') +
      row('头衔', staffRoleLabel(s)) +
      row('角色', s.perm) +
      (hideSalary
        ? '<div class="form-row is-readonly"><span class="label">薪资信息</span>' +
          '<span class="form-row__trail"><span class="value has-val">当前权限不可见</span></span></div>'
        : row('基本工资', s.baseSalary ? fmtMoney(s.baseSalary) + ' 元' : '0 元') +
          row('提成方案', s.scheme)) +
      '</div>';
  }

  function swordDetailRow(sw) {
    var thumb = (sw && sw.src)
      ? '<span class="emp-form-sword-thumb"><img src="' + esc(sw.src) + '" alt="" loading="lazy"></span>'
      : '<span class="value has-val">暂未选择</span>';
    return '<div class="form-row"><span class="label">宝剑</span>' +
      '<span class="form-row__trail">' + thumb + '</span></div>';
  }

  function row(label, val, readonly) {
    var ro = readonly ? ' is-readonly' : '';
    return '<div class="form-row' + ro + '"><span class="label">' + label + '</span>' +
      '<span class="form-row__trail"><span class="value has-val">' + esc(String(val)) + '</span></span></div>';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function navChevHtml() {
    return '<span class="ui-nav-chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></span>';
  }

  function openForm(mode, staffId) {
    syncStaffSchemeFromComm2();
    state.formMode = mode;
    state.currentStaffId = staffId || null;
    var s = staffId ? staffById(staffId) : null;
    var title = mode === 'create' ? '创建员工' : (mode === 'refine' ? '完善员工信息' : '编辑员工');
    $('empFormTitle').textContent = title;
    $('empFormTip').classList.toggle('hidden', mode !== 'refine');
    $('empFName').value = s ? s.name : '';
    $('empFGender').textContent = s && s.gender ? s.gender : '请选择';
    $('empFGender').classList.toggle('has-val', !!(s && s.gender));
    $('empFAgeBand').textContent = s && s.ageBand ? s.ageBand : '请选择';
    $('empFAgeBand').classList.toggle('has-val', !!(s && s.ageBand));
    $('empFYears').value = s && s.yearsExp != null ? s.yearsExp : '';
    $('empFRole').textContent = s && s.role ? s.role : '请选择';
    $('empFRole').classList.toggle('has-val', !!(s && s.role));
    $('empFPhone').value = s ? s.phone : '';
    if (s && s.perm) {
      $('empFPerm').textContent = s.perm;
      $('empFPerm').classList.add('has-val');
    } else {
      $('empFPerm').textContent = '请选择员工角色';
      $('empFPerm').classList.remove('has-val');
    }
    $('empFStatus').textContent = s ? s.status : '在岗';
    $('empFStatus').classList.add('has-val');
    var statusRow = $('empRowStatus');
    if (statusRow) statusRow.classList.toggle('hidden', mode === 'create');
    /* 性别/年龄段/从业年限：仅编辑/完善时显示，且平铺不折叠；创建时不显示 */
    var moreRoot = $('empFormMore');
    var moreBody = $('empFormMoreBody');
    var moreToggle = $('empFormMoreToggle');
    if (moreRoot) moreRoot.classList.toggle('hidden', mode === 'create');
    if (moreBody) moreBody.classList.toggle('hidden', mode === 'create');
    if (moreToggle) moreToggle.classList.toggle('hidden', mode !== 'create');
    $('empFBase').value = s && s.baseSalary ? s.baseSalary : '';
    if (s) syncStaffSchemeFields(s);
    $('empFScheme').textContent = s ? s.scheme : '暂未分配';
    $('empFScheme').classList.toggle('has-val', !!(s && s.scheme && s.scheme !== '暂未分配'));
    state.formSchemeId = s && s.schemeId ? s.schemeId : null;
    state.formAvatar = s && s.avatar ? s.avatar : '';
    state.formSwordTitle = s && s.swordTitle ? s.swordTitle : '';
    state.formSwordTitleMode = s && s.swordTitle ? (s.swordTitleMode || 'preset') : 'none';
    state.formSwordId = s && s.swordId ? s.swordId : null;
    state.formSensitivePerms = null;
    syncSensitiveCollapse(false);
    syncFormAvatarPreview();
    syncFormSwordFields();
    renderSensitivePermsSection();
    showScreen('screen-emp-form');
    nav(mode === 'create' ? 'staff-create' : (mode === 'refine' ? 'staff-refine' : 'staff-detail'));
  }

  function saveForm() {
    var name = $('empFName').value.trim();
    if (!name) { toast('请输入员工姓名'); return; }
    if (name.length > INPUT_LIMITS.PERSON_NAME) { toast('员工姓名最多 ' + INPUT_LIMITS.PERSON_NAME + ' 字', true); return; }
    var phone = $('empFPhone').value.trim().replace(/\D/g, '');
    if (!phone) { toast('请输入员工手机号'); return; }
    if (!isValidCnMobile(phone)) { toast('请输入正确的手机号', true); return; }
    $('empFPhone').value = phone;
    var gender = $('empFGender').textContent;
    if (gender === '请选择') gender = '';
    var ageBand = $('empFAgeBand').textContent;
    if (ageBand === '请选择') ageBand = '';
    var role = $('empFRole').textContent;
    if (role === '请选择') { toast('请选择头衔'); return; }
    var perm = $('empFPerm').textContent;
    if (!perm || perm === '请选择员工角色') { toast('请选择员工角色'); return; }
    if (state.formMode === 'create' && perm === '店主') {
      toast('新建员工不可设为店主', true);
      return;
    }
    perm = normalizePermName(perm);
    if (PERM_DEFS.every(function (d) { return d.name !== perm; })) {
      toast('请选择有效的角色身份', true);
      return;
    }
    if (perm === '店主') {
      var owner = findStaffByPerm('店主');
      if (owner && owner.id !== state.currentStaffId) {
        toast('本店已有店主（' + owner.name + '）', true);
        return;
      }
    }
    if (isUniqueStaffRole(role)) {
      var roleTaken = findOtherStaffWithRole(role, state.formMode === 'create' ? null : state.currentStaffId);
      if (roleTaken) {
        toast(uniqueRoleTakenMessage(role), true);
        return;
      }
    }
    var yearsRaw = $('empFYears').value.trim();
    var yearsExp = yearsRaw === '' ? 0 : parseInt(yearsRaw, 10);
    if (isNaN(yearsExp) || yearsExp < 0) { toast('请输入有效从业年限'); return; }
    if (yearsExp > INPUT_LIMITS.YEARS_EXP_MAX) { toast('从业年限不能超过 ' + INPUT_LIMITS.YEARS_EXP_MAX + ' 年', true); return; }
    var baseRaw = $('empFBase').value.trim();
    if (baseRaw === '') { toast('请输入员工基本工资'); return; }
    var baseSalary = parseFloat(baseRaw);
    if (!Number.isFinite(baseSalary) || baseSalary < 0) { toast('请输入有效基本工资', true); return; }
    if (baseSalary > INPUT_LIMITS.MONEY_MAX) { toast('金额不能超过 ' + formatMoneyLimitLabel(), true); return; }
    var store = window.EmployeeStore;
    var schemeText = $('empFScheme').textContent;
    var schemeId = state.formSchemeId || null;
    if (!schemeId || schemeText === '暂未分配') {
      schemeId = null;
      schemeText = '暂未分配';
    }
    var payload = {
      name: name,
      short: name.length > 2 ? name.slice(-1) : name.slice(0, 2),
      gender: gender,
      ageBand: ageBand,
      yearsExp: yearsExp,
      role: role,
      phone: phone,
      perm: perm,
      status: $('empFStatus').textContent,
      baseSalary: clampMoneyNumber(baseSalary),
      incomplete: false,
      avatar: state.formAvatar || '',
      swordTitle: state.formSwordTitle || '',
      swordTitleMode: state.formSwordTitleMode || 'none',
      swordId: state.formSwordId || null,
      scheme: schemeText || '暂未分配',
      schemeId: schemeId,
    };
    if (shouldShowSensitivePerms(perm) && state.formSensitivePerms) {
      payload.sensitivePerms = cloneSensitivePerms(state.formSensitivePerms);
    }
    function syncSchemeAssigned(staffId) {
      var C = window.Comm2Demo;
      var comm2Schemes = (C && typeof C.getSchemes === 'function') ? (C.getSchemes() || []) : [];
      comm2Schemes.forEach(function (sch) {
        if (!sch.assigneeIds) sch.assigneeIds = [];
        var idx = sch.assigneeIds.indexOf(staffId);
        if (!schemeId) {
          /* 暂未分配：清空该员工在全部方案中的绑定 */
          if (idx >= 0) sch.assigneeIds.splice(idx, 1);
        } else if (sch.id === schemeId && idx < 0) {
          /* 选中某一方案：仅追加，不踢出其它方案 */
          sch.assigneeIds.push(staffId);
        }
      });
      /* 兼容旧模型（员工管理旧提成设置页） */
      (window.EmployeeStore.schemes || []).forEach(function (sch) {
        if (!sch.assigned) sch.assigned = [];
        var idx = sch.assigned.indexOf(staffId);
        if (!schemeId) {
          if (idx >= 0) sch.assigned.splice(idx, 1);
        } else if (sch.id === schemeId && idx < 0) {
          sch.assigned.push(staffId);
        }
      });
      syncStaffSchemeFromComm2();
      syncStaffSchemeFields(staffById(staffId));
    }
    if (state.formMode === 'create') {
      var nid = 'st' + Date.now();
      store.staff.push(Object.assign({ id: nid }, payload));
      syncSchemeAssigned(nid);
      toast('员工已添加');
      openList();
    } else {
      var s = staffById(state.currentStaffId);
      if (!s) return;
      Object.assign(s, payload);
      if (state.formMode === 'refine') s.incomplete = false;
      syncSchemeAssigned(s.id);
      toast('已保存');
      renderStaffDetail(s.id);
      showScreen('screen-emp-detail');
      nav('staff-detail');
    }
  }

  var SALARY_ROW_BARS = {
    base: '#A8B5A2',
    commission: '#B5A6C4',
    reward: '#D4B896',
    labor: '#C4A484',
    sales: '#8FA3B8',
    card: '#C9A9A6'
  };

  function salaryRowHtml(opts) {
    var value = Number(opts.value) || 0;
    var pct = Math.max(0, Math.min(100, Number(opts.pct) || 0));
    var detail = opts.detail;
    var role = opts.role === 'ref' ? 'ref' : 'pay';
    var rowClass = 'emp-salary-card__row emp-salary-card__row--' + role + (detail ? ' emp-salary-card__row--link' : '');
    var attrs = detail
      ? ' data-salary-detail="' + esc(detail.staffId) + '" data-detail-kind="' + esc(detail.kind) + '" role="button"'
      : '';
    var chev = detail
      ? navChevHtml()
      : '<span class="emp-salary-card__row-chev" aria-hidden="true"></span>';
    var isNeg = value < 0;
    var display = isNeg ? ('-' + fmtMoney(Math.abs(value))) : fmtMoney(value);
    var valClass = 'emp-salary-card__row-val' + (isNeg ? ' is-neg' : '');
    var meterColor = opts.color || SALARY_ROW_BARS.base;
    var fillCls = 'emp-salary-card__meter-fill' + (pct <= 0 && opts.showZeroDot ? ' is-zero' : '');
    var fillStyle = pct <= 0 && opts.showZeroDot
      ? ('background:' + meterColor)
      : ('width:' + pct + '%;background:' + meterColor);
    return '<div class="' + rowClass + '"' + attrs + '>' +
      '<span class="emp-salary-card__row-label">' + esc(opts.label) + '</span>' +
      '<span class="emp-salary-card__meter" aria-hidden="true">' +
      '<span class="' + fillCls + '" style="' + fillStyle + '"></span>' +
      '</span>' +
      '<span class="' + valClass + '">' + display + '</span>' +
      chev +
      '</div>';
  }

  function renderSalaryList() {
    var list = $('empSalaryList');
    var lbl = $('empMonthLabel');
    var sumEl = $('empSalaryStoreTotal');
    var sumLbl = $('empSalaryStoreTotalLbl');
    var settleVal = $('empSettleDaySummaryVal');
    var payVal = $('empPayDaySummaryVal');
    if (!list) return;
    syncStaffSchemeFromComm2();
    syncSalaryPeriodToCycle();
    var mk = state.salaryMonth;
    var pc = ensurePayCycle();
    if (lbl) lbl.innerHTML = periodLabel(mk) + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    var staffOnly = isStaffSelfViewer();
    if (sumLbl) sumLbl.textContent = staffOnly ? '我的薪酬' : '合计薪酬';
    if (settleVal) settleVal.textContent = pc.settleDay + '日';
    if (payVal) payVal.textContent = '每月' + (pc.payDayOfMonth || defaultPayDayFromSettle(pc.settleDay)) + '日';
    var pool = salaryVisibleStaff();
    var storeTotal = 0;
    list.innerHTML = pool.map(function (s) {
      var d = genSalaryIfMissing(mk, s.id);
      var commission = Number(d.commission) || 0;
      var rwTot = rewardTotalsForStaff(mk, s.id);
      var rewardNet = rwTot.net;
      var baseAmt = Number(d.base) || 0;
      var total = calcSalaryTotal(baseAmt, commission, rewardNet);
      d.total = total;
      storeTotal += total;
      var split = salaryCommSplit(s.id);
      var meterMax = Math.max(Math.abs(baseAmt), Math.abs(commission), Math.abs(rewardNet), 0);
      function rowPct(v) {
        var a = Math.abs(Number(v) || 0);
        if (meterMax <= 0) return 0;
        if (a <= 0) return 0;
        return Math.round((a / meterMax) * 100);
      }
      return '<div class="emp-salary-card" data-salary-staff="' + s.id + '">' +
        '<div class="emp-salary-card__top"><div class="emp-salary-card__who">' + empAvatarHtml(s, 'emp-avatar--sm') + '<span class="emp-salary-card__name">' + esc(s.name) + '</span></div>' +
        '<div class="emp-salary-card__total-wrap"><span class="emp-salary-card__total-lbl">合计</span><span class="emp-salary-card__total-line"><span class="emp-salary-card__total">' + fmtMoney(total) + '</span>' + navChevHtml() + '</span></div></div>' +
        '<div class="emp-salary-card__rows">' +
        salaryRowHtml({ label: '基本工资', value: baseAmt, pct: rowPct(baseAmt), color: MORANDI.base, showZeroDot: meterMax > 0 }) +
        salaryRowHtml({ label: '提成合计', value: commission, pct: rowPct(commission), color: MORANDI.commission, showZeroDot: meterMax > 0 }) +
        salaryRowHtml({
          label: '奖惩合计', value: rewardNet, pct: rowPct(rewardNet), color: MORANDI.reward, showZeroDot: meterMax > 0,
          detail: { staffId: s.id, kind: 'reward' }
        }) +
        '</div>' +
        '<div class="emp-salary-card__split" aria-hidden="true"></div>' +
        '<div class="emp-salary-card__grid">' +
        '<button type="button" class="emp-salary-card__cell" data-salary-detail="' + esc(s.id) + '" data-detail-kind="comm">' + salaryCatIcon('labor') + '<div class="emp-salary-card__cell-main"><span class="emp-salary-card__cell-lbl">项目</span><span class="emp-salary-card__cell-val">' + fmtMoney(split.labor) + '</span></div></button>' +
        '<button type="button" class="emp-salary-card__cell" data-salary-detail="' + esc(s.id) + '" data-detail-kind="comm">' + salaryCatIcon('sales') + '<div class="emp-salary-card__cell-main"><span class="emp-salary-card__cell-lbl">产品</span><span class="emp-salary-card__cell-val">' + fmtMoney(split.sales) + '</span></div></button>' +
        '<button type="button" class="emp-salary-card__cell" data-salary-detail="' + esc(s.id) + '" data-detail-kind="comm">' + salaryCatIcon('issue') + '<div class="emp-salary-card__cell-main"><span class="emp-salary-card__cell-lbl">办卡/充卡</span><span class="emp-salary-card__cell-val">' + fmtMoney(split.issueCard) + '</span></div></button>' +
        '<button type="button" class="emp-salary-card__cell" data-salary-detail="' + esc(s.id) + '" data-detail-kind="comm">' + salaryCatIcon('quick') + '<div class="emp-salary-card__cell-main"><span class="emp-salary-card__cell-lbl">快速消费</span><span class="emp-salary-card__cell-val">' + fmtMoney(split.quick) + '</span></div></button>' +
        navChevHtml() +
        '</div></div>';
    }).join('');
    if (sumEl) sumEl.textContent = fmtMoney(storeTotal);
  }

  function storeActiveStaff() {
    return window.EmployeeStore.staff.filter(function (s) { return s.status === '在岗'; });
  }

  /** 薪资查看范围：店员/高级店员仅自己；店长可见店长/高级店员/店员；店主/合伙人可见全部在岗员工 */
  function canViewSalaryOf(s) {
    if (!s) return false;
    var name = getSessionPermName();
    if (name === '店员' || name === '高级店员') {
      return s.id === getSessionStaffId();
    }
    if (name === '店长') {
      var p = s.perm || '店员';
      return p === '店长' || p === '高级店员' || p === '店员';
    }
    return true;
  }
  function salaryVisibleStaff() {
    var all = storeActiveStaff();
    var name = getSessionPermName();
    if (name === '店员' || name === '高级店员') {
      var me = getSessionStaffId();
      return all.filter(function (s) { return s.id === me; });
    }
    if (name === '店长') {
      return all.filter(function (s) {
        var p = s.perm || '店员';
        return p === '店长' || p === '高级店员' || p === '店员';
      });
    }
    return all;
  }

  /** 店员 / 高级店员仅可查看自己的薪资信息 */
  function isStaffSelfViewer() {
    var name = getSessionPermName();
    return name === '店员' || name === '高级店员';
  }

  function payChannelDefs() {
    return [
      { key: 'cash', label: '现金' },
      { key: 'card', label: '卡付' },
      { key: 'group', label: '团购' },
      { key: 'sign', label: '签单' },
    ];
  }

  function commCatDefs() {
    return [
      { key: 'labor', label: '项目' },
      { key: 'sales', label: '产品' },
      { key: 'issue', label: '办卡' },
      { key: 'card', label: '充卡' },
      { key: 'quick', label: '快速消费' },
    ];
  }

  function shiftYmd(ymd, delta) {
    var d = parseYmd(ymd);
    d.setDate(d.getDate() + (Number(delta) || 0));
    return formatYmd(d);
  }

  function todayYmd() {
    return formatYmd(new Date());
  }

  function resetCommDetailScope() {
    state.commDetailScope = 'month';
    state.commDetailDay = null;
    state.commDetailBoundMonth = state.salaryMonth;
  }

  function ensureCommDetailScopeBound() {
    if (state.commDetailBoundMonth !== state.salaryMonth) resetCommDetailScope();
  }

  function formatCommDayShort(ymd) {
    var p = String(ymd || '').split('-');
    if (p.length < 3) return ymd || '';
    return Number(p[1]) + '月' + Number(p[2]) + '日';
  }

  function formatCommDetailScopeLabel() {
    ensureCommDetailScopeBound();
    if (state.commDetailScope !== 'day' || !state.commDetailDay) {
      return isCustomPeriodKey(state.salaryMonth) ? '本期全部' : '本月全部';
    }
    var ymd = state.commDetailDay;
    var today = todayYmd();
    if (ymd === today) return '今天';
    if (ymd === shiftYmd(today, -1)) return '昨天';
    return formatCommDayShort(ymd);
  }

  function formatCommDayListHead(ymd) {
    var today = todayYmd();
    var label = formatCommDayShort(ymd);
    if (ymd === today) label += ' · 今天';
    else if (ymd === shiftYmd(today, -1)) label += ' · 昨天';
    return label;
  }

  function roundMoney2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function ensureCommLineStore() {
    if (!window.EmployeeStore.commLines) window.EmployeeStore.commLines = {};
    return window.EmployeeStore.commLines;
  }

  function commLinesStoreKey(staffId) {
    return state.salaryMonth + ':' + staffId;
  }

  function mapComm2PayLabel(pay, isSign) {
    if (isSign) return '经理签单';
    if (pay === 'memberCard') return '卡付';
    if (pay === 'groupBuy') return '团购';
    return '现金类';
  }

  function mapComm2Kind(tl) {
    if (tl.kind === 'quick' || tl.refId === 'quick') return 'quick';
    if (tl.cat === 'sales' || tl.kind === 'product') return 'product';
    if (tl.cat === 'issue' || (tl.kind === 'card' && tl.cardRole === 'issue')) return 'card';
    if (tl.cat === 'card') return 'recharge';
    return 'project';
  }

  function getComm2TrialLines() {
    if (window.Comm2Demo && typeof window.Comm2Demo.getTrialLines === 'function') {
      return window.Comm2Demo.getTrialLines().map(function (x) { return Object.assign({}, x); });
    }
    return [
      { id: 'tl1', name: '开卡 · 尊享组合卡', cat: 'issue', kind: 'card', refId: 'demo_vip_combo', cardRole: 'issue', pay: 'cash', list: 2000, paid: 2000, designated: true },
      { id: 'tl3', name: '深层补水护理', cat: 'labor', kind: 'project', refId: 'p21', pay: 'memberCard', list: 268, paid: 268, designated: true },
      { id: 'tl5', name: '剑琅玻尿酸精华液', cat: 'sales', kind: 'product', refId: 'pd19', pay: 'memberCard', list: 198, paid: 198, designated: true },
      { id: 'tl8', name: '快速消费', cat: 'labor', kind: 'quick', refId: 'quick', pay: 'cash', list: 98, paid: 98, designated: true },
      { id: 'tl2', name: '充卡 · 老客续充', cat: 'card', pay: 'cash', list: 1000, paid: 1000, designated: true }
    ];
  }

  /** 演示业绩行画像：按员工差异化（金额系数、频次、类别分布），让提成/业绩各有梯度 */
  function demoStaffLineProfile(staffId) {
    var map = {
      st0: { factor: 1.8, laborR: 8, salesR: 3, issueR: 2, cardR: 2 },
      st1: { factor: 1.35, laborR: 7, salesR: 2, issueR: 2, cardR: 1 },
      st2: { factor: 1.1, laborR: 6, salesR: 2, issueR: 1, cardR: 1 },
      st3: { factor: 1.15, laborR: 6, salesR: 2, issueR: 1, cardR: 1 },
      st4: { factor: 0.8, laborR: 5, salesR: 1, issueR: 1, cardR: 1 },
    };
    return map[staffId] || { factor: 1, laborR: 5, salesR: 2, issueR: 1, cardR: 1 };
  }

  function buildSeedCommLines(staffId) {
    ensureSalaryBaseRow(state.salaryMonth, staffId);
    var C = window.Comm2Demo;
    var assigned = (C && typeof C.schemesForStaff === 'function') ? C.schemesForStaff(staffId) : [];
    if (!assigned.length) {
      var row0 = ensureSalaryBaseRow(state.salaryMonth, staffId);
      if (row0) {
        row0.labor = 0; row0.sales = 0; row0.issue = 0; row0.card = 0; row0.consume = 0;
      }
      return [];
    }
    var parts = periodParts(state.salaryMonth);
    var mkNum = parseInt(String(state.salaryMonth).replace(/\D/g, ''), 10) || 0;
    var monthJitter = 1 + ((mkNum % 13) - 6) / 100;
    var prof = demoStaffLineProfile(staffId);
    var trialLines = getComm2TrialLines();
    var laborIds = ['tl3', 'tl4', 'tl6', 'tl7', 'tl8', 'tl9'];
    var salesIds = ['tl5'];
    var issueIds = ['tl1'];
    var cardIds = ['tl2'];
    function repeatOf(id) {
      if (laborIds.indexOf(id) >= 0) return prof.laborR;
      if (salesIds.indexOf(id) >= 0) return prof.salesR;
      if (issueIds.indexOf(id) >= 0) return prof.issueR;
      if (cardIds.indexOf(id) >= 0) return prof.cardR;
      return 1;
    }
    var spanDays = Math.max(1, Math.round((parseYmd(parts.end).getTime() - parseYmd(parts.start).getTime()) / 86400000) + 1);
    var times = ['上午 10:18', '上午 11:05', '下午 14:20', '下午 15:40', '下午 16:01', '下午 17:22', '晚上 19:08', '晚上 20:15', '晚上 21:30'];
    var lines = [];
    var seq = 0;
    trialLines.forEach(function (tl) {
      var reps = repeatOf(tl.id);
      for (var r = 0; r < reps; r++) {
        var price = Number(tl.list) || 0;
        if (price > 0) {
          var jitter = 1 + (((seq * 7) % 11) - 5) / 100;
          price = Math.round(price * prof.factor * monthJitter * jitter);
        }
        var off = Math.round((((seq * 13) % 100) / 100) * (spanDays - 1));
        var ymd = shiftYmd(parts.start, off);
        var isSign = !!tl.sign;
        lines.push({
          id: 'cl-' + staffId + '-' + state.salaryMonth + '-' + tl.id + '-' + r,
          staffId: staffId,
          ymd: ymd,
          orderTime: times[seq % times.length],
          name: tl.name,
          kind: mapComm2Kind(tl),
          refId: tl.refId || null,
          price: price,
          channel: mapComm2PayLabel(tl.pay, isSign),
          isWalkIn: false,
          isFreeOrder: false,
          isGift: false,
          isCoupon: false,
          isConsumeGift: false,
          ach: roundMoney2(price),
          comm: 0,
          status: 'effective',
          pending: null,
          rejectReason: null,
          commEditLogs: [],
          comm2TrialId: tl.id,
          _trial: Object.assign({}, tl, { list: price, paid: isSign ? 0 : price })
        });
        seq++;
      }
    });
    return finalizeSeedCommLines(lines, staffId);
  }

  function finalizeSeedCommLines(lines, staffId) {
    if (!window._ladderAllocCache) window._ladderAllocCache = {};
    var C = window.Comm2Demo;
    var trialPayload = lines.map(function (ln) {
      return ln._trial || {
        id: ln.comm2TrialId,
        name: ln.name,
        cat: ln.kind === 'product' ? 'sales' : (ln.kind === 'card' || ln.kind === 'issue' ? 'issue' : (ln.kind === 'recharge' ? 'card' : 'labor')),
        kind: ln.kind === 'recharge' ? 'card' : ln.kind,
        refId: ln.refId,
        pay: ln.channel === '卡付' ? 'memberCard' : (ln.channel === '团购' ? 'groupBuy' : 'cash'),
        list: ln.price,
        paid: ln.price,
        designated: true,
        sign: ln.channel === '经理签单'
      };
    });
    var trial = (C && typeof C.calcStaffTrial === 'function')
      ? C.calcStaffTrial(staffId, trialPayload)
      : null;
    if (!window._ladderAllocCache) window._ladderAllocCache = {};
    if (!trial) {
      window._ladderAllocCache[staffId] = ensureLadderAllocation(staffId, lines);
    }
    var key = commLinesStoreKey(staffId);
    var manuals = (window._commManualPreserve && window._commManualPreserve[key]) || {};
    var seededEdit = false;
    lines.forEach(function (ln, idx) {
      var formula = 0;
      if (trial && trial.rows && trial.rows[idx]) formula = roundMoney2(trial.rows[idx].amount || 0);
      else formula = roundMoney2(calcLineCommission(ln, staffId));
      ln.comm = formula;
      delete ln._trial;
      var mk = ln.comm2TrialId || ln.refId || ln.name;
      var man = manuals[mk];
      if (man) {
        ln.comm = man.comm;
        ln.commEditLogs = man.logs || [];
        ln.editedBy = man.editedBy;
        ln.commManual = true;
        return;
      }
      /* 演示：第一笔有公式提成的行预置一条已生效留痕 */
      if (!seededEdit && formula > 0 && staffId === 'st1') {
        var to = roundMoney2(formula + 5);
        ln.commEditLogs = [{
          from: formula,
          to: to,
          by: '店主',
          byName: '顾清扬',
          at: todayYmd() + ' 10:22',
          reason: '活动价补差'
        }];
        ln.comm = to;
        ln.editedBy = { by: '店主', byName: '顾清扬' };
        ln.commManual = true;
        seededEdit = true;
      }
    });
    /* 回写薪资行业绩分列 */
    var row = ensureSalaryBaseRow(state.salaryMonth, staffId);
    if (row) {
      var labor = 0, sales = 0, issue = 0, consume = 0;
      lines.forEach(function (ln) {
        var a = Number(ln.ach) || 0;
        if (ln.kind === 'product') sales += a;
        else if (ln.kind === 'card' || ln.kind === 'issue') issue += a;
        else if (ln.kind === 'recharge' || ln.kind === 'consume') consume += a;
        else labor += a;
      });
      row.labor = roundMoney2(labor);
      row.sales = roundMoney2(sales);
      row.issue = roundMoney2(issue);
      row.card = roundMoney2(issue);
      row.consume = roundMoney2(consume);
    }
    return lines;
  }

  function getCommLines(staffId) {
    var store = ensureCommLineStore();
    var key = commLinesStoreKey(staffId);
    if (!store[key]) store[key] = buildSeedCommLines(staffId);
    return store[key];
  }

  function findCommLine(staffId, lineId) {
    return getCommLines(staffId).find(function (l) { return l.id === lineId; }) || null;
  }

  function countPendingCommLines(staffId) {
    return getCommLines(staffId).filter(function (l) { return l.status === 'pending'; }).length;
  }

  function demoCommDetail(staffId) {
    var lines = getCommLines(staffId);
    var achTotal = 0;
    var commTotal = 0;
    var dayMap = {};
    lines.forEach(function (ln) {
      achTotal += Number(ln.ach) || 0;
      commTotal += Number(ln.comm) || 0;
      if (!dayMap[ln.ymd]) {
        dayMap[ln.ymd] = {
          ymd: ln.ymd,
          date: ln.ymd.slice(5),
          ach: 0,
          comm: 0,
          lines: [],
        };
      }
      dayMap[ln.ymd].ach += Number(ln.ach) || 0;
      dayMap[ln.ymd].comm += Number(ln.comm) || 0;
      dayMap[ln.ymd].lines.push(ln);
    });
    achTotal = roundMoney2(achTotal);
    commTotal = roundMoney2(commTotal);
    var achPay = salaryAchByPay(staffId);
    var split = salaryCommSplit(staffId);
    var ach = {
      cash: achPay.cash,
      card: achPay.card,
      group: achPay.group,
      sign: achPay.sign,
    };
    var comm = {
      labor: split.labor,
      sales: split.sales,
      issue: split.issue,
      card: split.card,
      quick: split.quick,
    };
    var days = Object.keys(dayMap).sort().reverse().map(function (k) {
      var day = dayMap[k];
      day.ach = roundMoney2(day.ach);
      day.comm = roundMoney2(day.comm);
      day.lines.sort(function (a, b) {
        if (a.orderTime === b.orderTime) return (a.name || '').localeCompare(b.name || '');
        return String(b.orderTime).localeCompare(String(a.orderTime));
      });
      return day;
    });
    return {
      achTotal: achPay.total || achTotal,
      commTotal: split.total || commTotal,
      ach: ach,
      comm: comm,
      days: days,
      lines: lines,
      pendingCount: 0,
      serviceSales: salaryServiceSales(staffId),
    };
  }

  function commDetailDataDayKeys(staffId) {
    return demoCommDetail(staffId).days
      .map(function (day) { return day.ymd; })
      .filter(Boolean)
      .sort();
  }

  function commDetailNavState(staffId) {
    var keys = commDetailDataDayKeys(staffId);
    if (!keys.length) return { canPrev: false, canNext: false };
    ensureCommDetailScopeBound();
    if (state.commDetailScope !== 'day' || !state.commDetailDay) {
      return { canPrev: true, canNext: true };
    }
    var i = keys.indexOf(state.commDetailDay);
    if (i < 0) return { canPrev: true, canNext: true };
    return { canPrev: i > 0, canNext: i < keys.length - 1 };
  }

  function shiftCommDetailScopedDay(staffId, dir) {
    var keys = commDetailDataDayKeys(staffId);
    if (!keys.length) return;
    ensureCommDetailScopeBound();
    if (state.commDetailScope !== 'day' || !state.commDetailDay) {
      state.commDetailScope = 'day';
      state.commDetailDay = dir > 0 ? keys[keys.length - 1] : keys[0];
      state.commDetailBoundMonth = state.salaryMonth;
      return;
    }
    var i = keys.indexOf(state.commDetailDay);
    if (i < 0) {
      state.commDetailDay = dir > 0 ? keys[keys.length - 1] : keys[0];
      return;
    }
    var ni = i + dir;
    if (ni < 0 || ni >= keys.length) return;
    state.commDetailDay = keys[ni];
  }

  function openCommDetailDateSheet() {
    ensureCommDetailScopeBound();
    state.commDetailCalDraftScope = state.commDetailScope === 'day' ? 'day' : 'month';
    state.commDetailCalDraftDay = state.commDetailScope === 'day' ? state.commDetailDay : null;
    var parts = periodParts(state.salaryMonth);
    var anchor = state.commDetailCalDraftDay || parts.end;
    var p = parseYmd(anchor);
    state.commDetailCalYear = p.getFullYear();
    state.commDetailCalMonth = p.getMonth();
    var quickMonth = document.querySelector('#empCommDateQuick [data-emp-comm-quick="month"]');
    if (quickMonth) quickMonth.textContent = isCustomPeriodKey(state.salaryMonth) ? '本期全部' : '本月全部';
    renderCommDetailCalendar();
    openMask('empCommDateMask');
  }

  function renderCommDetailCalendar() {
    var cal = $('empCommDateCal');
    if (!cal) return;
    var parts = periodParts(state.salaryMonth);
    var minK = parts.start;
    var maxK = parts.end;
    var minP = parseYmd(minK);
    var maxP = parseYmd(maxK);
    var y = state.commDetailCalYear;
    var m = state.commDetailCalMonth;
    if (y == null || m == null) {
      y = maxP.getFullYear();
      m = maxP.getMonth();
      state.commDetailCalYear = y;
      state.commDetailCalMonth = m;
    }
    var canPrev = !(y === minP.getFullYear() && m === minP.getMonth());
    var canNext = !(y === maxP.getFullYear() && m === maxP.getMonth());
    var chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    var chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var draftScope = state.commDetailCalDraftScope;
    var selected = draftScope === 'day' ? state.commDetailCalDraftDay : null;
    var todayK = todayYmd();
    var dataKeys = {};
    if (state.currentStaffId) {
      commDetailDataDayKeys(state.currentStaffId).forEach(function (k) { dataKeys[k] = true; });
    }
    var cells = [];
    var i;
    for (i = 0; i < firstDow; i++) cells.push('<span class="flow-balance-cal__day is-muted" aria-hidden="true"></span>');
    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + '-' + pad2(m + 1) + '-' + pad2(d);
      var disabled = key < minK || key > maxK;
      var cls = [
        'flow-balance-cal__day',
        disabled ? 'is-disabled' : '',
        selected && key === selected ? 'is-selected' : '',
        key === todayK ? 'is-today' : '',
        dataKeys[key] ? 'is-has-data' : '',
      ].filter(Boolean).join(' ');
      cells.push('<button type="button" class="' + cls + '" data-emp-comm-cal-day="' + key + '" ' +
        (disabled ? 'disabled' : '') + ' aria-label="' + key + '"><span class="flow-balance-cal__day-num">' + d + '</span></button>');
    }
    cal.innerHTML =
      '<div class="flow-balance-cal__nav">' +
      '<button type="button" class="flow-balance-cal__nav-btn" data-emp-comm-cal-nav="-1" aria-label="上一月" ' + (canPrev ? '' : 'disabled') + '>' + chevL + '</button>' +
      '<div class="flow-balance-cal__title">' + y + '年' + (m + 1) + '月</div>' +
      '<button type="button" class="flow-balance-cal__nav-btn" data-emp-comm-cal-nav="1" aria-label="下一月" ' + (canNext ? '' : 'disabled') + '>' + chevR + '</button>' +
      '</div>' +
      '<div class="flow-balance-cal__weekdays">' + weekdays.map(function (w) { return '<div class="flow-balance-cal__wd">' + w + '</div>'; }).join('') + '</div>' +
      '<div class="flow-balance-cal__grid">' + cells.join('') + '</div>';
    var quick = $('empCommDateQuick');
    if (quick) {
      quick.querySelectorAll('[data-emp-comm-quick]').forEach(function (btn) {
        var q = btn.dataset.empCommQuick;
        var on = false;
        if (q === 'month') on = draftScope === 'month';
        else if (q === 'today') on = draftScope === 'day' && selected === todayK;
        else if (q === 'yesterday') on = draftScope === 'day' && selected === shiftYmd(todayK, -1);
        btn.classList.toggle('is-on', on);
        if (q === 'today' || q === 'yesterday') {
          var k = q === 'yesterday' ? shiftYmd(todayK, -1) : todayK;
          var out = k < minK || k > maxK;
          btn.classList.toggle('is-disabled', out);
          btn.removeAttribute('disabled');
          btn.setAttribute('aria-disabled', out ? 'true' : 'false');
        } else {
          btn.classList.remove('is-disabled');
          btn.removeAttribute('disabled');
          btn.setAttribute('aria-disabled', 'false');
        }
      });
    }
    var hint = $('empCommDateHint');
    if (hint) {
      hint.textContent = '仅可查本结算周期（' + periodRangeText(state.salaryMonth) + '）';
    }
  }

  function shiftCommDetailCalMonth(delta) {
    var parts = periodParts(state.salaryMonth);
    var minP = parseYmd(parts.start);
    var maxP = parseYmd(parts.end);
    var y = state.commDetailCalYear;
    var m = state.commDetailCalMonth + delta;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    if (y < minP.getFullYear() || (y === minP.getFullYear() && m < minP.getMonth())) {
      y = minP.getFullYear(); m = minP.getMonth();
    }
    if (y > maxP.getFullYear() || (y === maxP.getFullYear() && m > maxP.getMonth())) {
      y = maxP.getFullYear(); m = maxP.getMonth();
    }
    state.commDetailCalYear = y;
    state.commDetailCalMonth = m;
    renderCommDetailCalendar();
  }

  function confirmCommDetailDateDraft() {
    if (state.commDetailCalDraftScope === 'day' && state.commDetailCalDraftDay) {
      state.commDetailScope = 'day';
      state.commDetailDay = state.commDetailCalDraftDay;
    } else {
      state.commDetailScope = 'month';
      state.commDetailDay = null;
    }
    state.commDetailBoundMonth = state.salaryMonth;
    closeMask('empCommDateMask');
    if (state.currentStaffId) renderSalaryDetail(state.currentStaffId);
  }

  function rewardTypeBadgeHtml(type) {
    var isDeduct = type === 'deduct';
    return '<span class="emp-reward-badge' + (isDeduct ? ' emp-reward-badge--deduct' : ' emp-reward-badge--reward') + '" aria-hidden="true">' +
      (isDeduct ? '扣' : '奖') + '</span>';
  }

  /** 与开单记账 / 流水 flowTypeTag 一致：项蓝·产红·卡绿·快=闪电图标 */
  function empTypeTagHtml(kind) {
    var text = '项';
    var cls = 'flow-type-tag';
    if (kind === 'product') { text = '产'; cls += ' flow-type-tag--product'; }
    else if (kind === 'card' || kind === 'issue' || kind === 'recharge') { text = '卡'; cls += ' flow-type-tag--card'; }
    else if (kind === 'quick') {
      return '<span class="flow-type-tag--quick-icon" aria-label="快速消费" title="快速消费">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M6 1H12.5455L8.54545 6.25H14L5.27273 16L7.09091 8.875H2L6 1Z" fill="#FF8A3D"/></svg></span>';
    }
    return '<span class="' + cls + '">' + text + '</span>';
  }

  /** 开单时间展示：取 HH:mm（演示数据形如「下午 14:20」） */
  function formatCommLineTime(orderTime) {
    var s = String(orderTime || '');
    var m = s.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : s;
  }

  var COMM_LINE_EDIT_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.4486 6.9516L17.0486 10.5516M4.44868 19.5516L8.81467 18.6719C9.04644 18.6252 9.25926 18.511 9.4264 18.3438L19.2001 8.56478C19.6687 8.09592 19.6684 7.33593 19.1994 6.86747L17.1289 4.7994C16.6601 4.33113 15.9005 4.33145 15.4321 4.80011L5.65745 14.5802C5.49063 14.7471 5.37673 14.9594 5.32999 15.1907L4.44868 19.5516Z"/></svg>';

  /** 较上期：红↑ 升 / 绿↓ 降；持平不显示 */
  function empTrendHtml(curr, prev) {
    var c = Number(curr) || 0;
    var p = Number(prev) || 0;
    if (c === p) return '';
    if (c > p) {
      return '<span class="emp-comm-trend emp-comm-trend--up" title="较上期上升" aria-label="较上期上升">' +
        '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 2.2L10.5 9.2H1.5L6 2.2z"/></svg></span>';
    }
    return '<span class="emp-comm-trend emp-comm-trend--down" title="较上期下降" aria-label="较上期下降">' +
      '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 9.8L1.5 2.8h9L6 9.8z"/></svg></span>';
  }

  function empPrevMonthComm(staffId, monthKey) {
    var prevMk = shiftPeriod(monthKey, -1);
    var prev = genSalaryIfMissing(prevMk, staffId);
    if (!prev) return { ach: 0, comm: 0 };
    var labor = Number(prev.labor) || 0;
    var commission = prev.commission != null
      ? Number(prev.commission)
      : Math.round(labor * 0.1 * 100) / 100;
    return { ach: labor, comm: commission };
  }

  function renderChannelsHtml(map) {
    return '<div class="emp-comm-channels">' + payChannelDefs().map(function (ch) {
      return '<div class="emp-comm-channel">' +
        '<span class="emp-comm-channel__lbl">' + esc(ch.label) + '</span>' +
        '<span class="emp-comm-channel__val">' + fmtMoney(map[ch.key] || 0) + '</span></div>';
    }).join('') + '</div>';
  }

  function syncCommViewerToggleBtn() {
    var btn = $('empCommViewerToggle');
    if (!btn) return;
    /* 店员/高级店员锁定员工视角；店主/店长等可切换演示员工视角 */
    if (isStaffSelfViewer()) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
    var isStaff = state.commDetailViewer === 'staff';
    btn.textContent = isStaff ? '店主视角' : '员工视角';
  }

  function openCommLineEditSheet(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln) return;
    if (!canEditCommission()) {
      if (ln.commEditLogs && ln.commEditLogs.length) openCommEditLogSheet(lineId);
      else toast('仅店主/合伙人可调整提成', true);
      return;
    }
    state.commLineEditId = lineId;
    var meta = $('empCommLineEditMeta');
    if (meta) {
      meta.innerHTML = '<strong>' + esc(ln.name) + '</strong> · ' + esc(ln.orderTime);
    }
    var achEl = $('empCommLineEditAch');
    var commIn = $('empCommLineEditComm');
    var reasonIn = $('empCommLineEditReason');
    if (achEl) achEl.textContent = fmtMoney(ln.ach);
    if (commIn) commIn.value = String(ln.comm);
    if (reasonIn) reasonIn.value = '';
    var okBtn = $('empCommLineEditOk');
    if (okBtn) okBtn.textContent = '保存生效';
    openMask('empCommLineEditMask');
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs($('empCommLineEditMask'));
  }

  function focusCommLineEditInput() {
    var commIn = $('empCommLineEditComm');
    if (!commIn) return;
    if (typeof openAmountKeypad === 'function') openAmountKeypad(commIn);
    else commIn.focus();
  }

  function openCommEditLogSheet(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln) return;
    state.commLineEditId = lineId;
    var body = $('empCommEditLogBody');
    var logs = (ln.commEditLogs || []).slice().reverse();
    if (body) {
      if (!logs.length) {
        body.innerHTML = '<div class="emp-comm-empty">暂无修改记录</div>';
      } else {
        body.innerHTML = logs.map(function (log) {
          return '<div class="emp-comm-edit-log">' +
            '<div class="emp-comm-edit-log__row"><span>提成</span><span class="emp-num">' +
            fmtMoney(log.from) + ' → ' + fmtMoney(log.to) + '</span></div>' +
            '<div class="emp-comm-edit-log__meta">' + esc(log.byName || log.by || '') +
            (log.at ? ' · ' + esc(log.at) : '') + '</div>' +
            (log.reason ? '<div class="emp-comm-edit-log__reason">' + esc(log.reason) + '</div>' : '') +
            '</div>';
        }).join('') +
          '<p class="emp-comm-edit-hint" style="margin-top:12px">该调整已生效。如有疑问请线下与店主核实。</p>';
      }
    }
    openMask('empCommEditLogMask');
  }

  function submitCommLineEdit() {
    var sid = state.currentStaffId;
    var ln = sid && state.commLineEditId ? findCommLine(sid, state.commLineEditId) : null;
    if (!ln) return;
    if (!canEditCommission()) {
      toast('仅店主/合伙人可调整提成', true);
      return;
    }
    var commRaw = ($('empCommLineEditComm') || {}).value;
    var reason = String(($('empCommLineEditReason') || {}).value || '').trim();
    var comm = roundMoney2(commRaw);
    if (!String(commRaw || '').trim() || Number.isNaN(Number(commRaw))) {
      toast('请输入有效提成金额', true);
      return;
    }
    if (comm < 0) {
      toast('金额不能为负', true);
      return;
    }
    if (comm === ln.comm) {
      toast('金额未变化', true);
      return;
    }
    var sessionStaff = getSessionStaff() || {};
    var me = getSessionPermName();
    if (!ln.commEditLogs) ln.commEditLogs = [];
    ln.commEditLogs.push({
      from: ln.comm,
      to: comm,
      by: me,
      byName: sessionStaff.name || '',
      at: todayYmd() + ' ' + pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes()),
      reason: reason || ''
    });
    ln.comm = comm;
    ln.commManual = true;
    ln.status = 'effective';
    ln.pending = null;
    ln.editedBy = { by: me, byName: sessionStaff.name || '' };
    ln.rejectReason = null;
    var row = genSalaryIfMissing(state.salaryMonth, sid);
    if (row) refreshStaffCommissionRow(sid, row);
    closeMask('empCommLineEditMask');
    state.commLineEditId = null;
    toast('已修改，直接生效');
    renderSalaryDetail(sid);
    if ($('screen-emp-pay-detail') && !$('screen-emp-pay-detail').classList.contains('hidden')) {
      renderEmpPayDetail(sid);
    }
  }

  function withdrawCommLinePending(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln || ln.status !== 'pending') return;
    ln.status = 'effective';
    ln.pending = null;
    closeMask('empCommLineActMask');
    state.commLineActId = null;
    toast('已撤回调整');
    renderSalaryDetail(sid);
  }

  function openCommLineConsentSheet(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln || !ln.pending) return;
    state.commLineActId = lineId;
    var canConfirm = canUserConfirmPending(ln);
    var isStaffFlow = ln.pending.confirmRole === 'staff';
    var title = $('empCommLineConsentTitle');
    if (title) {
      if (canConfirm) {
        title.textContent = isStaffFlow ? '确认上级调整' : (ln.pending.confirmRole === 'ownerNoManager' ? '确认店长调整' : '确认员工调整');
      } else {
        title.textContent = '待确认详情';
      }
    }
    var body = $('empCommLineConsentBody');
    if (body) {
      var editor = (ln.pending.byName || ln.pending.by)
        ? '<div class="emp-comm-line__editor">修改人：' + esc(ln.pending.byName || '') +
          (ln.pending.byName && ln.pending.by ? ' · ' : '') + esc(ln.pending.by || '') + '</div>'
        : '';
      body.innerHTML =
        '<div class="emp-comm-edit-meta"><strong>' + esc(ln.name) + '</strong> · ' + esc(ln.orderTime) +
        '<br>售价 ' + fmtMoney(ln.price) + ' · ' + esc(ln.channel) + '</div>' +
        '<div class="emp-comm-consent-diff">' +
        '<div class="emp-comm-consent-diff__box"><div class="emp-comm-consent-diff__lbl">业绩</div>' +
        '<div class="emp-comm-consent-diff__from">' + fmtMoney(ln.pending.prevAch != null ? ln.pending.prevAch : ln.ach) + '</div>' +
        '<div class="emp-comm-consent-diff__to">' + fmtMoney(ln.pending.ach) + '</div></div>' +
        '<div class="emp-comm-consent-diff__box"><div class="emp-comm-consent-diff__lbl">提成</div>' +
        '<div class="emp-comm-consent-diff__from">' + fmtMoney(ln.pending.prevComm != null ? ln.pending.prevComm : ln.comm) + '</div>' +
        '<div class="emp-comm-consent-diff__to">' + fmtMoney(ln.pending.comm) + '</div></div></div>' +
        editor +
        '<div class="emp-comm-line__reason">原因：' + esc(ln.pending.reason || '—') + '</div>';
    }
    var foot = $('empCommLineConsentFoot');
    var rejectBtn = $('empCommLineConsentReject');
    var okBtn = $('empCommLineConsentOk');
    if (canConfirm) {
      if (foot) foot.classList.remove('hidden');
      if (rejectBtn) rejectBtn.classList.remove('hidden');
      if (okBtn) { okBtn.classList.remove('hidden'); okBtn.textContent = '同意生效'; }
    } else {
      if (rejectBtn) rejectBtn.classList.add('hidden');
      if (okBtn) { okBtn.classList.remove('hidden'); okBtn.textContent = '关闭'; }
    }
    openMask('empCommLineConsentMask');
  }

  function approveCommLinePending(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln || !ln.pending) return;
    ln.ach = roundMoney2(ln.pending.ach);
    ln.comm = roundMoney2(ln.pending.comm);
    ln.pending = null;
    ln.status = 'effective';
    ln.rejectReason = null;
    closeMask('empCommLineConsentMask');
    state.commLineActId = null;
    toast('已同意，调整已生效');
    renderSalaryDetail(sid);
  }

  function rejectCommLinePending(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln || !ln.pending) return;
    ln.rejectReason = ln.pending.reason || '';
    ln.pending = null;
    ln.status = 'rejected';
    closeMask('empCommLineConsentMask');
    state.commLineActId = null;
    toast('已驳回，仍按原金额计入');
    renderSalaryDetail(sid);
  }

  function canUserConfirmPending(ln) {
    if (!ln || !ln.pending) return false;
    var role = ln.pending.confirmRole;
    if (role === 'staff') {
      return state.commDetailViewer === 'staff';
    }
    var me = getSessionPermName();
    if (role === 'ownerNoManager') return me === '店主' || me === '合伙人';
    return me === '店主' || me === '合伙人' || me === '店长';
  }

  function isPendingInitiator(ln) {
    if (!ln || !ln.pending) return false;
    return ln.pending.initiatorId != null && ln.pending.initiatorId === getSessionStaffId();
  }

  function handleCommLineTap(lineId) {
    var sid = state.currentStaffId;
    var ln = sid ? findCommLine(sid, lineId) : null;
    if (!ln) return;
    if (canEditCommission()) {
      openCommLineEditSheet(lineId);
      return;
    }
    if (ln.commEditLogs && ln.commEditLogs.length) openCommEditLogSheet(lineId);
    else toast('提成明细只读');
  }

  function renderCommLineCard(ln) {
    var hasLog = ln.commEditLogs && ln.commEditLogs.length;
    var editedTag = hasLog
      ? '<span class="emp-comm-line__edited-tag" data-comm-edit-log="' + esc(ln.id) + '" role="button" tabindex="0" aria-label="查看修改记录">有修改</span>'
      : '';
    var editedCls = hasLog ? ' is-edited' : '';
    var editBtn = canEditCommission()
      ? '<span class="emp-comm-line__edit" data-comm-edit="' + esc(ln.id) + '" role="button" tabindex="0" aria-label="修改提成">' + COMM_LINE_EDIT_SVG + '</span>'
      : '';
    return '<button type="button" class="emp-comm-line' + editedCls + '" data-comm-line="' + esc(ln.id) + '">' +
      editedTag +
      '<div class="emp-comm-line__top"><div class="emp-comm-line__name">' + empTypeTagHtml(ln.kind) +
      '<span>' + esc(ln.name) + '</span></div>' +
      '<span class="emp-comm-line__time">' + esc(formatCommLineTime(ln.orderTime)) + '</span></div>' +
      '<div class="emp-comm-line__vals">' +
      '<div class="emp-comm-line__val"><span class="emp-comm-line__val-lbl">业绩</span>' +
      '<span class="emp-comm-line__val-num">' + fmtMoney(ln.ach) + '</span></div>' +
      '<div class="emp-comm-line__val"><span class="emp-comm-line__val-lbl">提成</span>' +
      '<span class="emp-comm-line__val-num">' + fmtMoney(ln.comm) + '</span>' + editBtn + '</div>' +
      '</div></button>';
  }

  /* ==== 员工视角 · 提成被店主/合伙人修改提醒 banner ==== */
  var COMM_EDIT_BANNER_BELL_SVG = '<svg class="emp-comm-edit-banner__bell" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.33333 20.0909C10.041 20.6562 10.9755 21 12 21C13.0245 21 13.959 20.6562 14.6667 20.0909M4.50763 17.1818C4.08602 17.1818 3.85054 16.5194 4.10557 16.1514C4.69736 15.2975 5.26855 14.0451 5.26855 12.537L5.29296 10.3517C5.29296 6.29145 8.29581 3 12 3C15.7588 3 18.8058 6.33993 18.8058 10.4599L18.7814 12.537C18.7814 14.0555 19.3329 15.3147 19.9006 16.169C20.1458 16.5379 19.9097 17.1818 19.4933 17.1818H4.50763Z"/></svg>';
  var COMM_EDIT_BANNER_CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function isOwnerEditedLine(ln) {
    return !!(ln && ln.commEditLogs && ln.commEditLogs.length &&
      ln.commEditLogs.some(function (log) {
        return log.by === '店主' || log.by === '合伙人';
      }));
  }

  /** 当前员工本月被店主/合伙人修改过的提成行，按页面顺序（日期新→旧，同日按展示顺序） */
  function commEditedPageOrder(staffId) {
    var out = [];
    demoCommDetail(staffId).days.forEach(function (day) {
      day.lines.forEach(function (ln) {
        if (isOwnerEditedLine(ln)) out.push(ln);
      });
    });
    return out;
  }

  function commEditBannerHtml(days) {
    var flagged = [];
    (days || []).forEach(function (day) {
      day.lines.forEach(function (ln) {
        if (isOwnerEditedLine(ln)) flagged.push(ln);
      });
    });
    var unviewed = flagged.filter(function (ln) { return !state.commEditViewed[ln.id]; });
    if (!unviewed.length) return '';
    return '<div class="emp-comm-edit-banner" id="empCommEditBanner" role="status">' +
      COMM_EDIT_BANNER_BELL_SVG +
      '<span class="emp-comm-edit-banner__text">您有 <strong class="emp-comm-edit-banner__count">' + unviewed.length + '</strong> 条提成被店主修改</span>' +
      '<button type="button" class="emp-comm-edit-banner__go" id="empCommEditBannerGo">去查看</button>' +
      '<button type="button" class="emp-comm-edit-banner__close" id="empCommEditBannerClose" aria-label="关闭">' + COMM_EDIT_BANNER_CLOSE_SVG + '</button>' +
      '</div>';
  }

  function commEditBannerGo() {
    var staffId = state.currentStaffId;
    if (!staffId) return;
    var all = commEditedPageOrder(staffId);
    if (!all.length) return;
    var key = state.salaryMonth + ':' + staffId;
    if (state.commEditCursorKey !== key) { state.commEditCursorKey = key; state.commEditCursor = -1; }
    state.commEditCursor = (state.commEditCursor + 1) % all.length;
    var ln = all[state.commEditCursor];
    state.commEditViewed[ln.id] = true;
    var needRender = state.commDetailScope !== 'day' || state.commDetailDay !== ln.ymd;
    if (needRender) {
      state.commDetailScope = 'day';
      state.commDetailDay = ln.ymd;
      state.commDetailBoundMonth = state.salaryMonth;
      renderSalaryDetail(staffId);
    }
    var card = document.querySelector('#empSalaryDetailBody [data-comm-line="' + ln.id + '"]');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('is-flash');
      setTimeout(function () { card.classList.remove('is-flash'); }, 1800);
    }
    if (!needRender) {
      /* 原位更新 banner：未查看数归零则移除 */
      var unviewed = commEditedPageOrder(staffId).filter(function (l) { return !state.commEditViewed[l.id]; });
      var banner = $('empCommEditBanner');
      if (!unviewed.length) {
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
      } else if (banner) {
        var strong = banner.querySelector('.emp-comm-edit-banner__count');
        if (strong) strong.textContent = String(unviewed.length);
      }
    }
  }

  function renderSalaryDetail(staffId) {
    var s = staffById(staffId);
    var body = $('empSalaryDetailBody');
    if (!s || !body) return;
    state.currentStaffId = staffId;
    ensureCommDetailScopeBound();
    if (!state.commDetailFilter || state.commDetailFilter === 'pending' || state.commDetailFilter === 'rejected') {
      state.commDetailFilter = 'all';
    }
    var selfOnly = isStaffSelfViewer();
    if (!canViewSalaryOf(s)) {
      var first = salaryVisibleStaff()[0];
      staffId = selfOnly ? getSessionStaffId() : (first ? first.id : getSessionStaffId());
      s = staffById(staffId);
      if (!s || !body) return;
      state.currentStaffId = staffId;
    }
    state.commDetailViewer = selfOnly ? 'staff' : (state.commDetailViewer || 'owner');
    if (selfOnly) state.commDetailViewer = 'staff';
    $('empSalaryDetailTitle').textContent = selfOnly ? '我的业绩提成明细' : '员工业绩提成明细';
    syncCommViewerToggleBtn();
    var data = demoCommDetail(staffId);
    var mk = state.salaryMonth;
    var prev = empPrevMonthComm(staffId, mk);
    var scopeIsDay = state.commDetailScope === 'day' && state.commDetailDay;
    var days = data.days.slice();
    if (scopeIsDay) {
      days = days.filter(function (day) { return day.ymd === state.commDetailDay; });
    }
    var achTotal = scopeIsDay
      ? days.reduce(function (sum, day) { return sum + (Number(day.ach) || 0); }, 0)
      : data.achTotal;
    var commTotal = scopeIsDay
      ? days.reduce(function (sum, day) { return sum + (Number(day.comm) || 0); }, 0)
      : data.commTotal;
    if (scopeIsDay) {
      var dayRaw = data.days.find(function (day) { return day.ymd === state.commDetailDay; });
      achTotal = dayRaw ? dayRaw.ach : 0;
      commTotal = dayRaw ? dayRaw.comm : 0;
    }
    var sumTitle = scopeIsDay
      ? (formatCommDayShort(state.commDetailDay) + ' 当日合计')
      : (isCustomPeriodKey(mk) ? '本期汇总' : '本月汇总');
    var trendAch = scopeIsDay ? '' : empTrendHtml(achTotal, prev.ach);
    var trendComm = scopeIsDay ? '' : empTrendHtml(commTotal, prev.comm);
    var achBars = scopeIsDay ? '' : (
      '<div class="emp-pay-stat" style="margin:0;padding:12px 0 0;box-shadow:none">' +
      renderRatioBarsHtml([
        { label: '现金', value: data.ach.cash, color: MORANDI.cash },
        { label: '卡付', value: data.ach.card, color: MORANDI.cardPay },
        { label: '团购', value: data.ach.group, color: MORANDI.group },
        { label: '签单', value: data.ach.sign, color: MORANDI.sign },
      ]) + '</div>'
    );
    var commBars = scopeIsDay ? '' : (
      '<div class="emp-pay-stat" style="margin:0;padding:12px 0 0;box-shadow:none">' +
      renderRatioBarsHtml([
        { label: '项目', value: data.comm.labor, color: MORANDI.labor },
        { label: '产品', value: data.comm.sales, color: MORANDI.sales },
        { label: '办卡', value: data.comm.issue, color: MORANDI.issue },
        { label: '充卡', value: data.comm.card, color: MORANDI.card },
        { label: '快消', value: data.comm.quick, color: MORANDI.quick },
      ]) + '</div>'
    );
    var navState = commDetailNavState(staffId);
    var chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    var chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    var daysHtml = days.map(function (day) {
      var linesHtml = day.lines.map(renderCommLineCard).join('');
      return '<div class="emp-comm-day">' +
        '<div class="emp-comm-day__head">' +
        '<div class="emp-comm-day__head-top">' +
        '<span class="emp-comm-day__date-pill">' + esc(formatCommDayListHead(day.ymd)) + '</span>' +
        '</div></div>' + linesHtml + '</div>';
    }).join('');
    if (!daysHtml) {
      daysHtml = '<div class="emp-comm-empty">' + (scopeIsDay ? '当日暂无提成明细' : '本周期暂无提成明细') + '</div>';
    }
    var bannerHtml = (state.commDetailViewer === 'staff') ? commEditBannerHtml(data.days) : '';
    body.innerHTML =
      bannerHtml +
      '<div class="emp-comm-detail-head">' + empAvatarHtml(s, 'emp-avatar--md') +
      '<div class="emp-comm-detail-head__meta"><div class="emp-comm-detail-head__name">' + esc(s.name) + '</div>' +
      staffSchemePillsHtml(s.id) + '</div>' +
      '<div class="emp-comm-detail-date">' +
      '<button type="button" class="emp-comm-detail-date__nav" id="empCommDetailPrev" aria-label="上一有数据日"' + (navState.canPrev ? '' : ' disabled') + '>' + chevL + '</button>' +
      '<button type="button" class="emp-comm-detail-date__btn" id="empCommDetailDateBtn" aria-label="选择查询日期">' +
      '<span class="emp-comm-detail-date__label">' + esc(formatCommDetailScopeLabel()) + '</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<button type="button" class="emp-comm-detail-date__nav" id="empCommDetailNext" aria-label="下一有数据日"' + (navState.canNext ? '' : ' disabled') + '>' + chevR + '</button>' +
      '</div></div>' +
      '<div class="emp-comm-sum">' +
      '<div class="emp-comm-sum__head"><span class="emp-comm-sum__title">' + esc(sumTitle) + '</span>' +
      '<span class="emp-comm-sum__unit">(单位：元)</span></div>' +
      '<div class="emp-comm-sum__block"><div class="emp-comm-sum__label-row">' +
      '<span class="emp-comm-sum__label"><span class="emp-comm-sum__bar emp-comm-sum__bar--ach"></span>业绩</span>' +
      '<span class="emp-comm-sum__amt-wrap"><span class="emp-comm-sum__amt">' + fmtMoney(achTotal) + '</span>' +
      trendAch + '</span></div>' + achBars + '</div>' +
      '<div class="emp-comm-sum__block"><div class="emp-comm-sum__label-row">' +
      '<span class="emp-comm-sum__label"><span class="emp-comm-sum__bar emp-comm-sum__bar--comm"></span>提成</span>' +
      '<span class="emp-comm-sum__amt-wrap"><span class="emp-comm-sum__amt">' + fmtMoney(commTotal) + '</span>' +
      trendComm + '</span></div>' + commBars + '</div></div>' +
      daysHtml;
  }

  function openEmpPayDetail(staffId) {
    closeAllEmpMasks();
    var sid = staffId || state.currentStaffId || (salaryVisibleStaff()[0] && salaryVisibleStaff()[0].id);
    if (!sid) { openSalary(); return; }
    state.currentStaffId = sid;
    renderEmpPayDetail(sid);
    showScreen('screen-emp-pay-detail');
    nav('staff-pay-detail');
  }

  function renderEmpPayDetail(staffId) {
    var s = staffById(staffId);
    var body = $('empPayDetailBody');
    if (!s || !body) return;
    state.currentStaffId = staffId;
    syncSalaryPeriodToCycle();
    var mk = state.salaryMonth;
    var d = genSalaryIfMissing(mk, s.id);
    var commission = Number(d.commission) || 0;
    var rwTot = rewardTotalsForStaff(mk, s.id);
    var rewardNet = rwTot.net;
    var baseAmt = Number(d.base) || 0;
    var total = calcSalaryTotal(baseAmt, commission, rewardNet);
    d.total = total;
    var achPay = salaryAchByPay(staffId);
    var split = salaryCommSplit(staffId);
    var svc = salaryServiceSales(staffId);
    var rewards = rewardMonthItems(mk).filter(function (r) { return r.staffId === staffId; })
      .sort(function (a, b) { return String(b.date || b.at || '').localeCompare(String(a.date || a.at || '')); })
      .slice(0, 5);
    var rwHtml = rewards.length
      ? rewards.map(function (r) {
          var amt = Number(r.amount) || 0;
          var isDeduct = r.type === 'deduct' || amt < 0;
          return '<div class="emp-pay-rw-item"><div class="emp-pay-rw-item__main">' +
            '<div class="emp-pay-rw-item__top">' +
            '<span class="emp-pay-rw-item__date">' + esc(r.date || r.at || '') + '</span>' +
            '<span class="emp-rw-badge emp-rw-badge--' + (isDeduct ? 'deduct' : 'reward') + '">' +
            (isDeduct ? '扣' : '奖') + '</span></div>' +
            '<div class="emp-pay-rw-item__note">' + esc(r.title || r.note || r.reason || '') + '</div></div>' +
            '<span class="emp-pay-rw-item__amt' + (amt < 0 ? ' is-deduct' : '') + '">' +
            (amt >= 0 ? '+' : '') + fmtMoney(amt) + '</span></div>';
        }).join('')
      : '<div class="emp-pay-rw-empty">本期暂无奖惩</div>';
    body.innerHTML =
      '<div class="emp-pay-detail">' +
      '<div class="emp-pay-detail__head">' + empAvatarHtml(s, 'emp-avatar--md') +
      '<div class="emp-pay-detail__meta"><div class="emp-pay-detail__name">' + esc(s.name) + '</div>' +
      staffSchemePillsHtml(s.id) + '</div>' +
      '<button type="button" class="emp-month-pill" id="empPayDetailMonth">' + periodLabel(mk) +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button></div>' +
      '<div class="emp-pay-detail__card"><div class="emp-pay-detail__card-row">' +
      '<div class="emp-pay-detail__card-lbl">当月合计薪资</div>' +
      '<div class="emp-pay-detail__card-amt emp-num">' + fmtMoney(total) + '</div></div>' +
      '<div class="emp-pay-detail__tri">' +
      '<div class="emp-pay-detail__tri-item"><div class="emp-pay-detail__tri-lbl">基本薪资</div><div class="emp-pay-detail__tri-val emp-num">' + fmtMoney(baseAmt) + '</div></div>' +
      '<div class="emp-pay-detail__tri-item"><div class="emp-pay-detail__tri-lbl">提成总计</div><div class="emp-pay-detail__tri-val emp-num">' + fmtMoney(commission) + '</div></div>' +
      '<div class="emp-pay-detail__tri-item"><div class="emp-pay-detail__tri-lbl">奖惩总计</div><div class="emp-pay-detail__tri-val emp-num' + (rewardNet < 0 ? ' is-neg' : '') + '">' +
      (rewardNet > 0 ? '+' : '') + fmtMoney(rewardNet) + '</div></div></div></div>' +
      '<div class="emp-pay-stat"><div class="emp-pay-stat__title">业绩统计</div>' +
      '<div class="emp-pay-stat__total"><span class="emp-pay-stat__total-lbl">总计</span>' +
      '<span class="emp-pay-stat__total-amt emp-num">¥' + fmtMoney(achPay.total) + '</span></div>' +
      renderRatioBarsHtml([
        { label: '现金', value: achPay.cash, color: MORANDI.cash },
        { label: '卡付', value: achPay.card, color: MORANDI.cardPay },
        { label: '团购', value: achPay.group, color: MORANDI.group },
        { label: '签单', value: achPay.sign, color: MORANDI.sign },
      ]) + '</div>' +
      '<div class="emp-pay-stat"><div class="emp-pay-stat__title">提成统计</div>' +
      '<div class="emp-pay-stat__total"><span class="emp-pay-stat__total-lbl">总计</span>' +
      '<span class="emp-pay-stat__total-amt emp-num">¥' + fmtMoney(split.total) + '</span></div>' +
      renderRatioBarsHtml([
        { label: '项目', value: split.labor, color: MORANDI.labor },
        { label: '产品', value: split.sales, color: MORANDI.sales },
        { label: '办卡', value: split.issue, color: MORANDI.issue },
        { label: '充卡', value: split.card, color: MORANDI.card },
        { label: '快速消费', value: split.quick, color: MORANDI.quick },
      ]) + '</div>' +
      '<div class="emp-pay-svc">' +
      '<div class="emp-pay-svc__box"><div class="emp-pay-svc__title">服务</div>' +
      '<div class="emp-pay-svc__row"><span>人次</span><strong>' + svc.serviceCount + '</strong></div>' +
      '<div class="emp-pay-svc__row"><span>金额</span><strong>¥' + fmtMoney(svc.serviceAmt) + '</strong></div></div>' +
      '<div class="emp-pay-svc__box"><div class="emp-pay-svc__title">售卡</div>' +
      '<div class="emp-pay-svc__row"><span>数量</span><strong>' + svc.salesCount + '</strong></div>' +
      '<div class="emp-pay-svc__row"><span>金额</span><strong>¥' + fmtMoney(svc.salesAmt) + '</strong></div></div></div>' +
      '<div class="emp-pay-stat"><div class="emp-pay-rw-head"><span class="emp-pay-rw-head__t">奖惩明细</span>' +
      '<button type="button" class="emp-inline-link" id="empPayDetailAllRewards">查看全部</button></div>' +
      rwHtml + '</div></div>';
  }

  function line(lbl, val) {
    return '<div class="emp-detail-line"><span class="emp-detail-line__lbl">' + lbl + '</span>' +
      '<span class="emp-detail-line__val">' + fmtMoney(val) + '</span></div>';
  }

  function rewardMonthItems(monthKey) {
    ensurePeriodDataBucket('rewards', monthKey);
    return (window.EmployeeStore.rewards[monthKey] || []).slice();
  }

  function rewardTotalsForStaff(monthKey, staffId) {
    var reward = 0;
    var deduct = 0;
    rewardMonthItems(monthKey).forEach(function (r) {
      if (r.staffId !== staffId) return;
      var amt = Number(r.amount) || 0;
      if (amt >= 0) reward += amt;
      else deduct += Math.abs(amt);
    });
    return { reward: reward, deduct: deduct, net: reward - deduct };
  }

  function draftRewardStaffIds() {
    var d = state.rewardDraft || {};
    if (Array.isArray(d.staffIds) && d.staffIds.length) return d.staffIds.slice();
    return d.staffId ? [d.staffId] : [];
  }

  function openRewardStaffPick() {
    syncRewardDraftFromForm();
    if (!state.rewardStaffSel) state.rewardStaffSel = {};
    var keep = draftRewardStaffIds();
    Object.keys(state.rewardStaffSel).forEach(function (k) { delete state.rewardStaffSel[k]; });
    keep.forEach(function (id) { state.rewardStaffSel[id] = true; });
    renderRewardStaffPickList();
    openMask('empRewardStaffMask');
  }

  function renderRewardStaffPickList() {
    var root = $('empRewardStaffList');
    if (!root) return;
    var sel = state.rewardStaffSel || {};
    root.innerHTML = storeActiveStaff().map(function (s) {
      var on = !!sel[s.id];
      return '<button type="button" class="emp-assign-card' + (on ? ' on' : '') + '"' +
        ' data-reward-staff-tog="' + esc(s.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        empAvatarHtml(s) +
        '<span class="emp-assign-card__meta"><span class="emp-assign-card__name">' + esc(s.name) + '</span>' +
        '<span class="emp-assign-card__role">' + esc(s.role || '未设置职位') + '</span></span>' +
        '<span class="emp-assign-card__check" aria-hidden="true">' + (on ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : '') + '</span></button>';
    }).join('') || '<div style="padding:32px 16px;text-align:center;color:var(--text-sec);font-size:13px">暂无在岗员工</div>';
    syncRewardStaffPickCount();
  }

  function syncRewardStaffPickCount() {
    var sel = state.rewardStaffSel || {};
    var n = Object.keys(sel).filter(function (k) { return sel[k]; }).length;
    var el = $('empRewardStaffCount');
    if (el) el.textContent = '已选 ' + n + ' 人';
  }

  function applyRewardStaffPick() {
    var sel = state.rewardStaffSel || {};
    var ids = Object.keys(sel).filter(function (k) { return sel[k]; });
    if (!state.rewardDraft) state.rewardDraft = {};
    state.rewardDraft.staffIds = ids;
    state.rewardDraft.staffId = ids.length ? ids[0] : '';
    closeMask('empRewardStaffMask');
    renderRewards();
  }

  function resetSchemePickSheetChrome() {
    state.rewardStaffPicking = false;
    var head = document.querySelector('#empSchemePickMask .picker-head');
    if (head) head.textContent = '选择提成方案';
    var gotoBtn = $('empSchemePickGoto');
    if (gotoBtn) gotoBtn.style.display = '';
  }

  function ensureRewardDraft(opts) {
    opts = opts || {};
    var p = (state.salaryMonth || '2026-07').split('-');
    var today = p[0] + '.' + String(parseInt(p[1], 10)) + '.30';
    if (opts.item) {
      state.editingRewardId = opts.item.id;
      state.rewardDraft = {
        date: opts.item.date || today,
        staffId: opts.item.staffId || '',
        staffIds: opts.item.staffId ? [opts.item.staffId] : [],
        type: opts.item.type === 'deduct' || opts.item.amount < 0 ? 'deduct' : 'reward',
        amount: Math.abs(Number(opts.item.amount) || 0),
        note: opts.item.title || '',
      };
    } else {
      state.editingRewardId = null;
      var keepIds = opts.staffId ? [opts.staffId] : draftRewardStaffIds();
      state.rewardDraft = {
        date: today,
        staffId: keepIds.length ? keepIds[0] : '',
        staffIds: keepIds,
        type: 'reward',
        amount: '',
        note: '',
      };
    }
  }

  function renderRewards() {
    var keepStaff = state.rewardDraft && state.rewardDraft.staffId;
    if (state.editingRewardId) {
      var editItem = rewardMonthItems(state.salaryMonth).find(function (r) { return r.id === state.editingRewardId; });
      ensureRewardDraft(editItem ? { item: editItem } : {});
    } else if (!state.rewardDraft) {
      ensureRewardDraft({ staffId: keepStaff || '' });
    }
    var draft = state.rewardDraft || {};
    var form = $('empRewardForm');
    var recent = $('empRewardRecent');
    var titleEl = $('empRewardsTitle');
    if (titleEl) titleEl.textContent = state.editingRewardId ? '编辑奖惩' : '设奖惩';
    if (!form) return;
    var staffIds = draftRewardStaffIds();
    var staffNames = staffIds.map(function (id) { var s = staffById(id); return s ? s.name : ''; }).filter(Boolean);
    var staffLabel = staffNames.length ? staffNames.join('、') : '请选择员工';
    var chev = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    form.innerHTML =
      '<div class="emp-reward-form__row"><span class="emp-reward-form__lbl">日期</span><div class="emp-reward-form__field">' +
      '<button type="button" class="emp-reward-form__select" id="empRewardDateBtn"><span>' + esc(draft.date || '') + '</span>' + chev + '</button></div></div>' +
      '<div class="emp-reward-form__row"><span class="emp-reward-form__lbl">员工</span><div class="emp-reward-form__field">' +
      '<button type="button" class="emp-reward-form__select' + (staffNames.length ? '' : ' is-placeholder') + '" id="empRewardStaffBtn"><span>' + esc(staffLabel) + '</span>' + chev + '</button></div></div>' +
      '<div class="emp-reward-form__row"><span class="emp-reward-form__lbl"></span><div class="emp-reward-form__field"><div class="emp-reward-form__radios">' +
      '<button type="button" class="emp-reward-radio' + (draft.type !== 'deduct' ? ' is-on' : '') + '" data-reward-type="reward"><span class="emp-reward-radio__dot"></span>奖励</button>' +
      '<button type="button" class="emp-reward-radio' + (draft.type === 'deduct' ? ' is-on' : '') + '" data-reward-type="deduct"><span class="emp-reward-radio__dot"></span>扣除</button>' +
      '</div></div></div>' +
      '<div class="emp-reward-form__row"><span class="emp-reward-form__lbl">金额</span><div class="emp-reward-form__field"><div class="emp-reward-form__amt-wrap">' +
      '<input type="number" id="empRewardAmount" class="input-amount" inputmode="decimal" min="0" max="999999.99" step="0.01" placeholder="请输入奖惩金额" value="' +
      (draft.amount === '' || draft.amount == null ? '' : esc(String(draft.amount))) + '" /><span class="emp-reward-form__unit">元</span></div></div></div>' +
      '<div class="emp-reward-form__row emp-reward-form__row--note"><span class="emp-reward-form__lbl">备注</span><div class="emp-reward-form__field">' +
      '<textarea class="emp-reward-form__note" id="empRewardNote" maxlength="200" placeholder="请输入备注">' + esc(draft.note || '') + '</textarea></div></div>';
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs(form);

    if (recent) {
      var items = rewardMonthItems(state.salaryMonth).slice(0, 5);
      recent.innerHTML = '<div class="emp-reward-recent__title">' + periodLabel(state.salaryMonth) + ' 最近记录</div><div class="emp-card" style="margin:0;padding:0;overflow:hidden">' +
        (items.length ? items.map(function (r) {
          var ss = staffById(r.staffId);
          var sign = r.amount >= 0 ? '+' : '';
          var rType = r.type || (r.amount < 0 ? 'deduct' : 'reward');
          return '<div class="emp-reward-item">' +
            '<span class="emp-reward-item__main">' + rewardTypeBadgeHtml(rType) +
            '<span class="emp-reward-item__title">' + esc((ss ? ss.name + ' · ' : '') + r.title) + '</span></span>' +
            '<span class="emp-reward-item__amt' + (r.amount < 0 ? ' is-deduct' : '') + '">' +
            sign + fmtMoney(r.amount) + '</span></div>';
        }).join('') : '<div class="emp-reward-item"><span class="emp-reward-item__title" style="color:var(--text-sec)">本月暂无记录</span></div>') +
        '</div>';
    }
  }

  function syncRewardDraftFromForm() {
    if (!state.rewardDraft) state.rewardDraft = {};
    var amtInput = $('empRewardAmount');
    var noteInput = $('empRewardNote');
    if (amtInput) state.rewardDraft.amount = amtInput.value;
    if (noteInput) state.rewardDraft.note = noteInput.value.trim();
  }

  function saveRewardDraft() {
    syncRewardDraftFromForm();
    var draft = state.rewardDraft || {};
    var staffIds = draftRewardStaffIds();
    if (!staffIds.length) { toast('请选择员工', true); return false; }
    var amt = Math.abs(parseFloat(draft.amount));
    if (!amt || isNaN(amt)) { toast('请输入奖惩金额', true); return false; }
    if (amt > INPUT_LIMITS.MONEY_MAX) { toast('金额不能超过 ' + formatMoneyLimitLabel(), true); return false; }
    var note = String(draft.note || '').trim();
    if (!note) { toast('请输入备注', true); return false; }
    if (note.length > INPUT_LIMITS.REMARK_SHORT) { toast('备注最多 ' + INPUT_LIMITS.REMARK_SHORT + ' 字', true); return false; }
    draft.note = note;
    var signed = draft.type === 'deduct' ? -amt : amt;
    if (!window.EmployeeStore.rewards[state.salaryMonth]) window.EmployeeStore.rewards[state.salaryMonth] = [];
    var list = window.EmployeeStore.rewards[state.salaryMonth];
    if (state.editingRewardId) {
      var hit = list.find(function (r) { return r.id === state.editingRewardId; });
      if (hit) {
        hit.staffId = staffIds[0];
        hit.title = draft.note;
        hit.amount = signed;
        hit.type = draft.type === 'deduct' ? 'deduct' : 'reward';
        hit.date = draft.date;
      }
      toast('已更新奖惩记录');
    } else {
      staffIds.forEach(function (sid) {
        list.unshift({
          id: 'rw' + Date.now().toString(36) + sid,
          staffId: sid,
          title: draft.note,
          amount: signed,
          type: draft.type === 'deduct' ? 'deduct' : 'reward',
          date: draft.date,
        });
      });
      toast(staffIds.length > 1 ? ('奖惩已保存给 ' + staffIds.length + ' 名员工') : '奖惩已保存');
    }
    state.editingRewardId = null;
    state.rewardDraft = null;
    if (state.rewardStaffSel) {
      Object.keys(state.rewardStaffSel).forEach(function (k) { delete state.rewardStaffSel[k]; });
    }
    return true;
  }

  function renderRewardDetail(staffId) {
    var s = staffById(staffId);
    var body = $('empRewardDetailBody');
    if (!s || !body) return;
    if (!canViewSalaryOf(s)) {
      var first = salaryVisibleStaff()[0];
      staffId = first ? first.id : getSessionStaffId();
      s = staffById(staffId);
      if (!s || !body) return;
    }
    state.rewardDetailStaffId = staffId;
    var mk = state.salaryMonth;
    var p = mk.split('-');
    var monthTxt = p[0] + '.' + String(parseInt(p[1], 10)) + '奖惩明细';
    var items = rewardMonthItems(mk).filter(function (r) { return r.staffId === staffId; });
    var listHtml = items.length ? items.map(function (r) {
      var isDeduct = r.type === 'deduct' || r.amount < 0;
      return '<div class="emp-rw-item" data-reward-id="' + esc(r.id) + '">' +
        '<div class="emp-rw-item__top">' +
        '<span class="emp-rw-item__date">' + esc(r.date || '') + '</span>' +
        '<span class="emp-rw-badge emp-rw-badge--' + (isDeduct ? 'deduct' : 'reward') + '">' + (isDeduct ? '扣' : '奖') + '</span>' +
        '<span class="emp-rw-item__amt">' + fmtMoney(r.amount) + '</span></div>' +
        '<div class="emp-rw-item__note">' + esc(r.title || '') + '</div>' +
        '<div class="emp-rw-item__acts">' +
        '<button type="button" class="emp-rw-item__act" data-reward-edit="' + esc(r.id) + '">编辑</button>' +
        '<button type="button" class="emp-rw-item__act is-muted" data-reward-del="' + esc(r.id) + '">删除</button>' +
        '</div></div>';
    }).join('') : '<div class="emp-rw-empty">本月暂无奖惩记录</div>';
    body.innerHTML =
      '<div class="emp-rw-detail-head">' + empAvatarHtml(s, 'emp-avatar--md') +
      '<div class="emp-rw-detail-head__meta"><div class="emp-rw-detail-head__name">' + esc(s.name) + '</div></div>' +
      '<div class="emp-rw-detail-head__sub">' + esc(monthTxt) + '</div></div>' +
      '<div class="emp-rw-list">' + listHtml + '</div>';
  }

  function deleteRewardById(id) {
    var list = window.EmployeeStore.rewards[state.salaryMonth] || [];
    window.EmployeeStore.rewards[state.salaryMonth] = list.filter(function (r) { return r.id !== id; });
    toast('已删除');
    if (state.rewardDetailStaffId) renderRewardDetail(state.rewardDetailStaffId);
  }


  function getAchData() {
    return window.EmployeeStore.ach[state.achTab];
  }

  var CARD_ACH_TYPE_DEFS = [
    { key: 'open', label: '开卡' },
    { key: 'recharge', label: '充值' },
    { key: 'renew', label: '续次' },
    { key: 'extend', label: '延期' },
  ];

  function cloneAchStationPair(src, fallback) {
    src = src || {};
    fallback = fallback || {};
    function num(v, fb, def) {
      if (!isNaN(Number(v))) return Number(v);
      if (!isNaN(Number(fb))) return Number(fb);
      return def;
    }
    return {
      designated: num(src.designated, fallback.designated, 100),
      nonDesignated: num(src.nonDesignated, fallback.nonDesignated, 100),
      designatedAmt: num(src.designatedAmt, fallback.designatedAmt, 0),
      nonDesignatedAmt: num(src.nonDesignatedAmt, fallback.nonDesignatedAmt, 0),
    };
  }

  function cloneAchScheme(src) {
    src = src || {};
    var designated = !isNaN(Number(src.designated)) ? Number(src.designated) : 100;
    var nonDesignated = !isNaN(Number(src.nonDesignated)) ? Number(src.nonDesignated) : 100;
    var designatedAmt = !isNaN(Number(src.designatedAmt)) ? Number(src.designatedAmt) : (!isNaN(Number(src.fixedAmount)) ? Number(src.fixedAmount) : 0);
    var nonDesignatedAmt = !isNaN(Number(src.nonDesignatedAmt)) ? Number(src.nonDesignatedAmt) : (!isNaN(Number(src.fixedAmount)) ? Number(src.fixedAmount) : 0);
    var flat = {
      designated: designated,
      nonDesignated: nonDesignated,
      designatedAmt: designatedAmt,
      nonDesignatedAmt: nonDesignatedAmt,
    };
    var stations = {};
    ACH_STATION_IDS.forEach(function (id) {
      stations[id] = cloneAchStationPair(src.stations && src.stations[id], flat);
    });
    return {
      valueMode: src.valueMode === 'amount' ? 'amount' : 'pct',
      designated: designated,
      nonDesignated: nonDesignated,
      designatedAmt: designatedAmt,
      nonDesignatedAmt: nonDesignatedAmt,
      stations: stations,
      costMode: (['receipt', 'price', 'fixed'].indexOf(src.costMode) >= 0) ? src.costMode : 'off',
      costPct: !isNaN(Number(src.costPct)) ? Number(src.costPct) : 0,
      costFixed: !isNaN(Number(src.costFixed)) ? Number(src.costFixed) : 0,
    };
  }

  function ensureAchStations(scheme) {
    return cloneAchScheme(scheme);
  }

  function syncAchFlatFromStation(scheme, stationId) {
    scheme = ensureAchStations(scheme);
    var sid = stationId || 'senior';
    var pair = scheme.stations[sid] || scheme.stations.senior;
    scheme.designated = pair.designated;
    scheme.nonDesignated = pair.nonDesignated;
    scheme.designatedAmt = pair.designatedAmt;
    scheme.nonDesignatedAmt = pair.nonDesignatedAmt;
    return scheme;
  }

  function syncAchStationsFromFlat(scheme) {
    scheme = ensureAchStations(scheme);
    var flat = {
      designated: scheme.designated,
      nonDesignated: scheme.nonDesignated,
      designatedAmt: scheme.designatedAmt,
      nonDesignatedAmt: scheme.nonDesignatedAmt,
    };
    ACH_STATION_IDS.forEach(function (id) {
      scheme.stations[id] = cloneAchStationPair(flat, flat);
    });
    return scheme;
  }

  function stationShortLabel(roleId) {
    var label = getStationLabel(roleId);
    return label ? String(label).charAt(0) : '?';
  }

  function formatAchPairCompact(pair, valueMode) {
    pair = pair || {};
    if (valueMode === 'amount') {
      var a = Number(pair.designatedAmt) || 0;
      var b = Number(pair.nonDesignatedAmt) || 0;
      if (a === b) return '¥' + a;
      return '¥' + a + '/' + b;
    }
    return String(pair.designated != null ? pair.designated : '—') + '/' +
      String(pair.nonDesignated != null ? pair.nonDesignated : '—');
  }

  function defaultAchScheme() {
    return cloneAchScheme({ valueMode: 'pct', designated: 100, nonDesignated: 100, costMode: 'off' });
  }

  function mergeAchScheme(old, fallback) {
    var base = cloneAchScheme(fallback || defaultAchScheme());
    if (!old) return base;
    return cloneAchScheme(Object.assign({}, base, old));
  }

  function collectPrevAchPcts(bucket) {
    var map = Object.create(null);
    if (!bucket || !bucket.items) return map;
    Object.keys(bucket.items).forEach(function (catId) {
      (bucket.items[catId] || []).forEach(function (it) {
        if (!it) return;
        if (it.id) map['id:' + it.id] = it;
        if (it.name) map['name:' + it.name] = it;
      });
    });
    return map;
  }

  var ACH_SIMPLE_TIMES_CAT_ID = 'ach_simple_times';
  var ACH_UNGROUPED_CAT = { labor: 'ach_ungrouped_lc', sales: 'ach_ungrouped_sc', card: 'ach_ungrouped_card' };

  function makeLaborSalesAchItem(p, prev, defaultScheme) {
    var old = prev['id:' + p.id] || prev['name:' + p.name];
    var scheme = mergeAchScheme(old, defaultScheme);
    return Object.assign({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      isSimpleTimesAch: !!p.isSimpleTimesAch,
    }, scheme);
  }

  /** 方案A：通用规则 → 自定义管理分组 → 独立计次卡 → 未分组 */
  function buildAchBucketFromCatalog(list, prevBucket, idPrefix, opts) {
    opts = opts || {};
    var prev = collectPrevAchPcts(prevBucket);
    var rulesId = idPrefix === 'sc' ? 'sales_rules' : 'labor_rules';
    var bucket = opts.bucket || (idPrefix === 'sc' ? 'product' : 'project');
    var ungroupedId = idPrefix === 'sc' ? ACH_UNGROUPED_CAT.sales : ACH_UNGROUPED_CAT.labor;
    var defaultScheme = ensureAchStations(mergeAchScheme(
      prevBucket && prevBucket.defaultScheme,
      defaultAchScheme()
    ));
    var cats = [{ id: rulesId, name: '通用规则' }];
    var items = {};
    items[rulesId] = [];

    var visible = (list || []).filter(function (p) { return p && p.id && !p.hidden && !p.isSimpleTimesAch; });
    var byId = Object.create(null);
    visible.forEach(function (p) {
      byId[p.id] = makeLaborSalesAchItem(p, prev, defaultScheme);
    });

    var assigned = Object.create(null);
    var customGroups = (typeof getCustomCatalogGroups === 'function' ? getCustomCatalogGroups(bucket) : []) || [];
    customGroups.forEach(function (g) {
      if (!g || !g.id) return;
      var row = [];
      (g.itemIds || []).forEach(function (id) {
        if (!byId[id] || assigned[id]) return;
        row.push(byId[id]);
        assigned[id] = true;
      });
      if (!row.length) return;
      cats.push({ id: g.id, name: g.name || '未命名分组' });
      items[g.id] = row;
    });

    var simpleList = opts.simpleTimesList || [];
    if (simpleList.length) {
      cats.push({ id: ACH_SIMPLE_TIMES_CAT_ID, name: '独立计次卡' });
      items[ACH_SIMPLE_TIMES_CAT_ID] = simpleList.map(function (p) {
        return makeLaborSalesAchItem(p, prev, defaultScheme);
      });
    }

    var ungrouped = visible.filter(function (p) { return !assigned[p.id]; }).map(function (p) { return byId[p.id]; });
    if (ungrouped.length) {
      cats.push({ id: ungroupedId, name: '未分组' });
      items[ungroupedId] = ungrouped;
    }

    return {
      cats: cats,
      items: items,
      defaultScheme: defaultScheme,
      /* 计入基数：默认按实收金额；与办卡业绩 baseMode 口径一致 */
      baseMode: (prevBucket && prevBucket.baseMode) || '按实收金额',
    };
  }

  function getAchCardTemplates() {
    if (typeof getActiveTemplates === 'function') {
      var live = getActiveTemplates();
      if (live && live.length) {
        return live.map(function (t) {
          var recharge = t.recharge != null ? Number(t.recharge) : (Number(t.price) || 0);
          return {
            id: t.id,
            name: t.name,
            price: recharge,
            face: t.face != null ? Number(t.face) : recharge,
            giftAmount: t.giftAmount != null ? Number(t.giftAmount) : 0,
            cardColor: t.cardColor || 'brand_red',
            benefits: t.benefits || {},
            simpleTimesMode: !!t.simpleTimesMode,
          };
        });
      }
    }
    if (typeof window.__billingGetCardTemplates === 'function') {
      var list = window.__billingGetCardTemplates();
      if (list && list.length) return list;
    }
    return [];
  }

  function cardAchApplicableTypes(benefits) {
    benefits = benefits || {};
    var keys = ['open'];
    if (benefits.balance) keys.push('recharge');
    if (benefits.timesOrValidity || benefits.products) keys.push('renew');
    if (benefits.timesOrValidity || benefits.projectDiscount || benefits.products) keys.push('extend');
    return keys;
  }

  function ensureCardIncomeTypes(prev) {
    prev = prev || {};
    var src = prev.incomeTypes || {};
    var out = {};
    CARD_ACH_TYPE_DEFS.forEach(function (def) {
      var legacy = null;
      if (def.key === 'open' && (prev.defaultDesignated != null || prev.defaultNonDesignated != null)) {
        legacy = {
          designated: prev.defaultDesignated,
          nonDesignated: prev.defaultNonDesignated,
        };
      }
      var sch = mergeAchScheme(src[def.key] || legacy, defaultAchScheme());
      /* 办卡通用规则仅按比例；历史 amount 收敛 */
      sch.valueMode = 'pct';
      out[def.key] = sch;
    });
    return out;
  }

  function ensureCardAchDefaults(prev) {
    prev = prev || {};
    return {
      baseMode: prev.baseMode || '按实收金额',
      incomeTypes: ensureCardIncomeTypes(prev),
      cats: [],
      items: {},
    };
  }

  function getCardAchBaseMode() {
    var card = window.EmployeeStore && window.EmployeeStore.ach && window.EmployeeStore.ach.card;
    return (card && card.baseMode) || '按实收金额';
  }

  /* 劳动/产品业绩「计入基数」：通用规则口径，默认按实收金额 */
  function getTabAchBaseMode(tab) {
    var bucket = window.EmployeeStore && window.EmployeeStore.ach && window.EmployeeStore.ach[tab];
    return (bucket && bucket.baseMode) || '按实收金额';
  }

  function syncCardBaseToAdvRule() {
    /* 「计入基数」是办卡提成的唯一口径来源：calcLineCommission 直接读取 ach.card.baseMode，
       此处与基础设置口径保持同一事实源；缓存失效由调用方 invalidateCommLineCache() 负责。 */
  }

  function buildCardAchBucket(prevCard) {
    var card = ensureCardAchDefaults(prevCard);
    var prev = collectPrevAchPcts(prevCard);
    var list = getAchCardTemplates();
    var byId = Object.create(null);
    list.forEach(function (t) {
      var old = prev['id:' + t.id] || prev['name:' + t.name] || {};
      var benefits = t.benefits || {};
      var typeKeys = cardAchApplicableTypes(benefits);
      var types = {};
      typeKeys.forEach(function (k) {
        var fromOld = (old.types && old.types[k]) || null;
        var fromDefault = card.incomeTypes[k];
        types[k] = mergeAchScheme(fromOld, fromDefault);
      });
      byId[t.id] = {
        id: t.id,
        name: t.name,
        price: Number(t.price) || 0,
        cardColor: t.cardColor || 'brand_red',
        benefits: benefits,
        simpleTimesMode: !!t.simpleTimesMode,
        typeKeys: typeKeys,
        types: types,
        designated: types.open ? types.open.designated : card.incomeTypes.open.designated,
        nonDesignated: types.open ? types.open.nonDesignated : card.incomeTypes.open.nonDesignated,
      };
    });
    var cats = [{ id: 'card_rules', name: '通用规则' }];
    var items = { card_rules: [] };
    var assigned = Object.create(null);

    var groups = (typeof ensureCardGroups === 'function' ? ensureCardGroups() : []) || [];
    groups.forEach(function (g) {
      if (!g || !g.id) return;
      var row = [];
      (g.itemIds || []).forEach(function (id) {
        var it = byId[id];
        if (!it || it.simpleTimesMode || assigned[id]) return;
        row.push(it);
        assigned[id] = true;
      });
      if (!row.length) return;
      cats.push({ id: g.id, name: g.name || '未命名分组' });
      items[g.id] = row;
    });

    var simpleRows = list.filter(function (t) { return t.simpleTimesMode && byId[t.id]; }).map(function (t) {
      assigned[t.id] = true;
      return byId[t.id];
    });
    if (simpleRows.length) {
      cats.push({ id: ACH_SIMPLE_TIMES_CAT_ID, name: '独立计次卡' });
      items[ACH_SIMPLE_TIMES_CAT_ID] = simpleRows;
    }

    var ungrouped = list.filter(function (t) { return byId[t.id] && !assigned[t.id]; }).map(function (t) { return byId[t.id]; });
    if (ungrouped.length) {
      cats.push({ id: ACH_UNGROUPED_CAT.card, name: '未分组' });
      items[ACH_UNGROUPED_CAT.card] = ungrouped;
    }

    card.cats = cats;
    card.items = items;
    return card;
  }

  function getAllCardAchTplItems(card) {
    card = card || (window.EmployeeStore && window.EmployeeStore.ach && window.EmployeeStore.ach.card);
    if (!card || !card.items) return [];
    var seen = Object.create(null);
    var out = [];
    Object.keys(card.items).forEach(function (catId) {
      if (catId === 'card_rules') return;
      (card.items[catId] || []).forEach(function (it) {
        if (!it || !it.id || seen[it.id]) return;
        seen[it.id] = true;
        out.push(it);
      });
    });
    return out;
  }

  function getSimpleTimesAchProjects() {
    if (typeof ensureDemoFilled === 'function') {
      try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    }
    var tpls = (typeof getActiveTemplates === 'function' ? getActiveTemplates() : []) || [];
    var out = [];
    (tpls || []).forEach(function (t) {
      if (!t || !t.simpleTimesMode || t.shelved) return;
      var total = Math.max(1, Number(t.simpleTimesQty) || Number((t.projectItems || [])[0] && (t.projectItems || [])[0].purchaseQty) || 1);
      var paid = (typeof getTemplatePurchaseAmount === 'function')
        ? getTemplatePurchaseAmount(t)
        : (Number(t.recharge) || Number(t.price) || 0);
      out.push({
        id: 'st_' + t.id,
        name: t.simpleTimesProjectName || t.name,
        price: Math.round((paid / total) * 100) / 100,
        category: '独立计次卡',
        isSimpleTimesAch: true,
      });
    });
    return out;
  }

  function syncAchFromCatalog() {
    if (typeof ensureDemoFilled === 'function') {
      try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    }
    var projects = (typeof getCatalogProjects === 'function' ? getCatalogProjects() : []) || [];
    var products = (typeof getCatalogProducts === 'function' ? getCatalogProducts() : []) || [];
    if (!projects.length && typeof seedProjectCatalog === 'function') projects = seedProjectCatalog();
    if (!products.length && typeof seedProductCatalog === 'function') products = seedProductCatalog();
    var prev = window.EmployeeStore.ach || {};
    window.EmployeeStore.ach = {
      labor: buildAchBucketFromCatalog(projects, prev.labor, 'lc', {
        bucket: 'project',
        simpleTimesList: getSimpleTimesAchProjects(),
      }),
      sales: buildAchBucketFromCatalog(products, prev.sales, 'sc', {
        bucket: 'product',
        simpleTimesList: [],
      }),
      card: buildCardAchBucket(prev.card),
    };
    applyDemoApprenticeAchOverrides();
  }

  /** 学徒演示口径：洗头无业绩（提成由「学徒方案」按单 ¥8 计）；其余项目/产品保持默认业绩 */
  function applyDemoApprenticeAchOverrides() {
    var labor = window.EmployeeStore.ach && window.EmployeeStore.ach.labor;
    if (!labor || !labor.items) return;
    Object.keys(labor.items).forEach(function (catId) {
      (labor.items[catId] || []).forEach(function (it) {
        if (it.id !== 'p19' && it.name !== '洗头') return;
        it.valueMode = 'pct';
        it.designated = 0;
        it.nonDesignated = 0;
        it.designatedAmt = 0;
        it.nonDesignatedAmt = 0;
        it.costMode = 'off';
        it.stations = {
          senior: { designated: 0, nonDesignated: 0, designatedAmt: 0, nonDesignatedAmt: 0 },
          mid: { designated: 0, nonDesignated: 0, designatedAmt: 0, nonDesignatedAmt: 0 },
          junior: { designated: 0, nonDesignated: 0, designatedAmt: 0, nonDesignatedAmt: 0 },
        };
      });
    });
  }

  function formatAchSchemeShort(scheme, tabKind) {
    scheme = ensureAchStations(scheme || defaultAchScheme());
    var kind = tabKind || state.achTab || 'labor';
    if (getAchCalcMode(kind) === 'station') {
      return ACH_STATION_IDS.map(function (id) {
        return stationShortLabel(id) + ' ' + formatAchPairCompact(scheme.stations[id], scheme.valueMode);
      }).join(' · ');
    }
    if (scheme.valueMode === 'amount') {
      var a = Number(scheme.designatedAmt) || 0;
      var b = Number(scheme.nonDesignatedAmt) || 0;
      if (a === b) return '¥' + a;
      return '¥' + a + ' / ¥' + b;
    }
    return String(scheme.designated) + '% / ' + String(scheme.nonDesignated) + '%';
  }

  function renderAchCapBtn(opts) {
    opts = opts || {};
    var isAmt = !!opts.isAmt;
    var val = opts.value;
    var kind = opts.kind === 'non' ? 'non' : 'des';
    var label = kind === 'non' ? '散客' : '点客';
    var attrs = '';
    if (opts.itemId) attrs += ' data-ach-cap-item="' + esc(opts.itemId) + '"';
    if (opts.typeKey) attrs += ' data-ach-cap-type="' + esc(opts.typeKey) + '"';
    if (opts.stationId) attrs += ' data-ach-cap-station="' + esc(opts.stationId) + '"';
    if (opts.cardDefault) attrs += ' data-ach-cap-card-default="1"';
    if (opts.tabDefault) attrs += ' data-ach-cap-tab-default="1"';
    var valHtml = isAmt
      ? '<em>¥</em>' + esc(String(val))
      : esc(String(val)) + '<em>%</em>';
    return '<button type="button" class="emp-ach-cap emp-ach-cap--' + kind + '"' + attrs + '>' +
      '<span class="emp-ach-cap__label">' + label + '</span>' +
      '<span class="emp-ach-cap__val">' + valHtml + '</span></button>';
  }

  function renderAchTwinCapsHtml(scheme, opts) {
    opts = opts || {};
    scheme = ensureAchStations(scheme || defaultAchScheme());
    var isAmt = scheme.valueMode === 'amount';
    var stationMode = !!opts.stationMode;
    if (stationMode) {
      return '<div class="emp-ach-twins emp-ach-twins--stations">' +
        ACH_STATION_IDS.map(function (id) {
          var pair = scheme.stations[id] || {};
          var des = isAmt ? (Number(pair.designatedAmt) || 0) : (Number(pair.designated) || 0);
          var non = isAmt ? (Number(pair.nonDesignatedAmt) || 0) : (Number(pair.nonDesignated) || 0);
          return '<div class="emp-ach-twins__station">' +
            '<span class="emp-ach-twins__station-name"><i aria-hidden="true"></i>' + esc(getStationLabel(id)) + '</span>' +
            '<div class="emp-ach-twins__pair">' +
            renderAchCapBtn({ kind: 'des', value: des, isAmt: isAmt, itemId: opts.itemId, typeKey: opts.typeKey, stationId: id, cardDefault: opts.cardDefault, tabDefault: opts.tabDefault }) +
            renderAchCapBtn({ kind: 'non', value: non, isAmt: isAmt, itemId: opts.itemId, typeKey: opts.typeKey, stationId: id, cardDefault: opts.cardDefault, tabDefault: opts.tabDefault }) +
            '</div></div>';
        }).join('') + '</div>';
    }
    var des = isAmt ? (Number(scheme.designatedAmt) || 0) : (Number(scheme.designated) || 0);
    var non = isAmt ? (Number(scheme.nonDesignatedAmt) || 0) : (Number(scheme.nonDesignated) || 0);
    return '<div class="emp-ach-twins"><div class="emp-ach-twins__pair">' +
      renderAchCapBtn({ kind: 'des', value: des, isAmt: isAmt, itemId: opts.itemId, typeKey: opts.typeKey, cardDefault: opts.cardDefault, tabDefault: opts.tabDefault }) +
      renderAchCapBtn({ kind: 'non', value: non, isAmt: isAmt, itemId: opts.itemId, typeKey: opts.typeKey, cardDefault: opts.cardDefault, tabDefault: opts.tabDefault }) +
      '</div></div>';
  }

  function renderAchEditPad(opts) {
    var isAmt = !!opts.isAmt;
    var id = opts.inputId;
    var val = opts.value;
    var kind = opts.kind === 'non' ? 'non' : 'des';
    var label = kind === 'non' ? '散客' : '点客';
    var stepField = isAmt ? (kind === 'non' ? 'nonAmt' : 'desAmt') : (kind === 'non' ? 'non' : 'des');
    return '<div class="emp-ach-pad emp-ach-pad--' + kind + '">' +
      '<div class="emp-ach-pad__label">' + label + (isAmt ? ' · ¥' : ' · %') + '</div>' +
      '<div class="emp-ach-pad__ctrl">' +
      '<button type="button" class="emp-ach-pad__step" data-ach-step="' + stepField + '" data-ach-dir="-1" aria-label="减少">−</button>' +
      '<div class="emp-ach-pad__input-wrap' + (isAmt ? ' has-prefix' : '') + '">' +
      (isAmt ? '<span class="emp-ach-pad__unit is-prefix">¥</span>' : '') +
      '<input type="number" id="' + id + '" class="issue-extend-custom-input" inputmode="decimal" min="0"' +
      (isAmt ? ' step="1"' : ' max="100" step="1"') +
      ' value="' + esc(String(val)) + '" aria-label="' + label + '" />' +
      (isAmt ? '' : '<span class="emp-ach-pad__unit">%</span>') +
      '</div>' +
      '<button type="button" class="emp-ach-pad__step" data-ach-step="' + stepField + '" data-ach-dir="1" aria-label="增加">+</button>' +
      '</div></div>';
  }

  function formatAchCostShort(scheme) {
    scheme = scheme || defaultAchScheme();
    if (scheme.costMode === 'receipt') return '扣成本·实收' + (Number(scheme.costPct) || 0) + '%';
    if (scheme.costMode === 'price') return '扣成本·售价' + (Number(scheme.costPct) || 0) + '%';
    if (scheme.costMode === 'fixed') return '扣成本·¥' + (Number(scheme.costFixed) || 0);
    return '';
  }

  function cardTypeLabel(key) {
    var def = CARD_ACH_TYPE_DEFS.find(function (d) { return d.key === key; });
    return def ? def.label : key;
  }

  function getAchCommonRulesCatId(tab) {
    return tab === 'sales' ? 'sales_rules' : 'labor_rules';
  }

  function isAchCommonRulesCat(catId, tab) {
    tab = tab || state.achTab;
    return !!catId && catId === getAchCommonRulesCatId(tab) && (tab === 'labor' || tab === 'sales');
  }

  function getAchTabDefaultScheme(tab) {
    var bucket = window.EmployeeStore.ach && window.EmployeeStore.ach[tab];
    var sch = ensureAchStations(mergeAchScheme(bucket && bucket.defaultScheme, defaultAchScheme()));
    /* S1 M1：项目/产品通用规则仅按比例；历史 amount 收敛并写回 */
    if (sch.valueMode === 'amount') {
      sch.valueMode = 'pct';
      if (bucket) bucket.defaultScheme = cloneAchScheme(sch);
    } else {
      sch.valueMode = 'pct';
    }
    return sch;
  }

  function isAchTabDefaultEdit() {
    return !!(state.achEdit && state.achEdit.kind === 'tabDefault');
  }

  /* 项目/产品/办卡「通用规则」业绩取值仅按比例；单项/单独设卡才可选固定金额 */
  function isAchPctOnlyEdit() {
    return !!(state.achEdit && (state.achEdit.kind === 'tabDefault' || state.achEdit.kind === 'cardDefault'));
  }

  function renderAchCalcModeSegHtml(kind) {
    ensureCalcModes();
    var cur = getAchCalcMode(kind);
    var opts = CALC_MODES.map(function (m) {
      var on = m.id === cur;
      return '<button type="button" class="emp-ach-calc-seg__btn' + (on ? ' on' : '') +
        '" data-calc-kind="' + esc(kind) + '" data-calc-mode="' + m.id +
        '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' + esc(m.label) + '</button>';
    }).join('');
    return '<div class="emp-ach-calc-block">' +
      '<div class="emp-ach-calc-block__title"><span class="emp-ach-title-row">计算模式' +
      '<button type="button" class="emp-ach-info-btn" data-ach-info-help="calcMode" aria-label="计算模式说明">?</button>' +
      '</span></div>' +
      '<div class="emp-ach-calc-seg" role="radiogroup" aria-label="计算模式">' + opts + '</div></div>';
  }

  function renderTabAchRulesHtml(tab, data) {
    var sch = ensureAchStations((data && data.defaultScheme) || getAchTabDefaultScheme(tab));
    var stationOn = getAchCalcMode(tab) === 'station';
    var cost = formatAchCostShort(sch);
    var noun = tab === 'sales' ? '产品' : '项目';
    var chev = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    return '<div class="emp-ach-card-rules">' +
      renderAchCalcModeSegHtml(tab) +
      '<button type="button" class="emp-ach-rule-row" data-tab-ach-base="' + esc(tab) + '">' +
      '<span>计入基数</span>' +
      '<span class="emp-ach-rule-row__val has-val">' + esc(getTabAchBaseMode(tab)) + chev + '</span></button>' +
      '<div class="emp-ach-income-block emp-ach-income-block--solo">' +
      '<div class="emp-ach-income-block__title"><span class="emp-ach-title-row">默认业绩方案' +
      '<button type="button" class="emp-ach-info-btn" data-ach-info-help="tabDefault" data-ach-info-noun="' + esc(noun) + '" aria-label="默认业绩方案说明">?</button>' +
      '</span></div>' +
      '<div class="emp-ach-income-cards emp-ach-income-cards--1">' +
      '<div class="emp-ach-income-card" data-ach-tab-default="' + esc(tab) + '">' +
      '<button type="button" class="emp-ach-income-card__head" data-ach-tab-default="' + esc(tab) + '">' +
      '<span class="emp-ach-income-card__label"><span>默认方案</span>' + navChevHtml() + '</span></button>' +
      renderAchTwinCapsHtml(sch, { stationMode: stationOn, tabDefault: true }) +
      (cost ? '<span class="emp-ach-income-card__sub">' + esc(cost) + '</span>' : '') +
      '</div></div></div></div>';
  }

  function renderCardAchRulesHtml(card) {
    var chev = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    var incomeTypes = ensureCardIncomeTypes(card);
    card.incomeTypes = incomeTypes;
    var html = '<div class="emp-ach-card-rules">' +
      renderAchCalcModeSegHtml('card') +
      '<button type="button" class="emp-ach-rule-row" data-card-ach-base>' +
      '<span>计入基数</span>' +
      '<span class="emp-ach-rule-row__val has-val">' + esc(card.baseMode || '按实收金额') + chev + '</span></button>' +
      '<div class="emp-ach-income-block">' +
      '<div class="emp-ach-income-block__title"><span class="emp-ach-title-row">默认收入比例' +
      '<button type="button" class="emp-ach-info-btn" data-ach-info-help="cardIncome" aria-label="默认收入比例说明">?</button>' +
      '</span></div>' +
      '<div class="emp-ach-income-cards emp-ach-income-cards--4">' +
      CARD_ACH_TYPE_DEFS.map(function (def) {
        var sch = incomeTypes[def.key] || defaultAchScheme();
        var cost = formatAchCostShort(sch);
        return '<div class="emp-ach-income-card" data-card-income-type="' + def.key + '">' +
          '<button type="button" class="emp-ach-income-card__head" data-card-income-type="' + def.key + '">' +
          '<span class="emp-ach-income-card__label"><span>' + esc(def.label) + '</span>' + navChevHtml() + '</span></button>' +
          renderAchTwinCapsHtml(sch, { stationMode: getAchCalcMode('card') === 'station', typeKey: def.key, cardDefault: true }) +
          (cost ? '<span class="emp-ach-income-card__sub">' + esc(cost) + '</span>' : '') +
          '</div>';
      }).join('') +
      '</div></div></div>';
    return html;
  }

  function fmtAchPrice(n) {
    var v = Number(n);
    if (isNaN(v)) return '¥0';
    return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function renderAchEditBody(scheme) {
    scheme = ensureAchStations(scheme);
    var pctOnly = isAchPctOnlyEdit();
    var isAmt = pctOnly
      ? false
      : ((state.achEdit && state.achEdit.valueMode === 'amount') || scheme.valueMode === 'amount');
    var cost = (state.achEdit && state.achEdit.costMode) || scheme.costMode || 'off';
    var tabKind = (state.achEdit && state.achEdit.tab) || state.achTab || 'labor';
    var stationMode = getAchCalcMode(tabKind) === 'station';
    var stationId = (state.achEdit && state.achEdit.stationId) || 'senior';
    var pair = stationMode ? (scheme.stations[stationId] || scheme.stations.senior) : scheme;
    var html = '';
    if (stationMode) {
      html += '<div class="emp-ach-edit-section"><div class="emp-ach-edit-section__title">选择工位</div>' +
        '<div class="emp-ach-station-segs" role="tablist" aria-label="工位">';
      ACH_STATION_IDS.forEach(function (id) {
        var on = id === stationId;
        var label = getStationLabel(id);
        html += '<button type="button" class="emp-ach-station-seg' + (on ? ' on' : '') +
          '" data-ach-edit-station="' + esc(id) + '" role="tab" aria-selected="' + (on ? 'true' : 'false') + '">' +
          '<span class="emp-ach-station-seg__dot" aria-hidden="true"></span>' +
          esc(label) + '</button>';
      });
      html += '</div>' +
        '<p class="emp-ach-edit-station-tip">开单选该工位时，按下方点客/散客计算业绩</p></div>';
    }
    html += '<div class="emp-ach-edit-section"><div class="emp-ach-edit-section__title">业绩取值</div>';
    if (pctOnly) {
      html += '<p class="emp-ach-edit-value-only">按比例</p></div>';
    } else {
      html += '<div class="emp-ach-edit-radios" role="radiogroup" aria-label="业绩取值">' +
        '<label class="emp-ach-edit-radio" data-ach-value-mode="pct">' +
        '<input type="radio" name="empAchValueMode" value="pct"' + (!isAmt ? ' checked' : '') + ' />按比例</label>' +
        '<label class="emp-ach-edit-radio" data-ach-value-mode="amount">' +
        '<input type="radio" name="empAchValueMode" value="amount"' + (isAmt ? ' checked' : '') + ' />固定金额</label>' +
        '</div></div>';
    }
    html += '<div class="emp-ach-pads" id="empAchEditValueFields">';
    if (isAmt) {
      html += renderAchEditPad({ kind: 'des', isAmt: true, inputId: 'empAchEditDesAmt', value: pair.designatedAmt });
      html += renderAchEditPad({ kind: 'non', isAmt: true, inputId: 'empAchEditNonAmt', value: pair.nonDesignatedAmt });
    } else {
      html += renderAchEditPad({ kind: 'des', isAmt: false, inputId: 'empAchEditDes', value: pair.designated });
      html += renderAchEditPad({ kind: 'non', isAmt: false, inputId: 'empAchEditNon', value: pair.nonDesignated });
    }
    html += '</div>';
    if (stationMode) {
      html += '<button type="button" class="emp-ach-apply-stations" id="empAchApplyStations">应用到全部工位</button>';
    }
    html += '<div class="emp-ach-edit-section"><div class="emp-ach-edit-section__title">扣除成本</div>' +
      '<div class="emp-ach-edit-chips emp-ach-edit-chips--cost" role="radiogroup" aria-label="扣除成本">' +
      '<button type="button" class="emp-ach-edit-chip' + (cost === 'off' ? ' on' : '') + '" data-ach-cost-mode="off">不扣除</button>' +
      '<button type="button" class="emp-ach-edit-chip' + (cost === 'receipt' ? ' on' : '') + '" data-ach-cost-mode="receipt">实收比例</button>' +
      '<button type="button" class="emp-ach-edit-chip' + (cost === 'price' ? ' on' : '') + '" data-ach-cost-mode="price">售价比例</button>' +
      '<button type="button" class="emp-ach-edit-chip' + (cost === 'fixed' ? ' on' : '') + '" data-ach-cost-mode="fixed">固定成本</button>' +
      '</div></div>';
    html += '<div class="emp-ach-edit-fields emp-ach-edit-fields--inline" id="empAchEditCostFields">';
    if (cost === 'receipt' || cost === 'price') {
      html += '<div class="emp-ach-edit-field"><label><span>成本比例</span><input type="number" id="empAchEditCostPct" class="input-amount" inputmode="decimal" min="0" max="100" step="0.1" value="' + esc(String(scheme.costPct)) + '" aria-label="成本比例" /></label></div>';
    } else if (cost === 'fixed') {
      html += '<div class="emp-ach-edit-field"><label><span>固定成本</span><input type="number" id="empAchEditCostFixed" class="input-amount" inputmode="decimal" min="0" step="0.01" value="' + esc(String(scheme.costFixed)) + '" aria-label="固定成本" /></label></div>';
    }
    html += '</div>';
    html += '<p class="emp-ach-edit-hint">有扣除成本时，先按实收或售价减去成本再计算业绩。</p>';
    return html;
  }

  function revealAchEditCostField() {
    var fields = $('empAchEditCostFields');
    if (!fields || !fields.children.length) return;
    requestAnimationFrame(function () {
      var input = fields.querySelector('input');
      var target = input || fields;
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
      }
    });
  }

  function flushAchEditStationFromDom(opts) {
    opts = opts || {};
    var strict = !!opts.strict;
    if (!state.achEdit || !state.achEdit.draft) return { ok: true };
    var draft = ensureAchStations(state.achEdit.draft);
    if (isAchTabDefaultEdit()) {
      state.achEdit.valueMode = 'pct';
      draft.valueMode = 'pct';
    } else {
      draft.valueMode = state.achEdit.valueMode === 'amount' ? 'amount' : 'pct';
    }
    draft.costMode = state.achEdit.costMode || 'off';
    var tabKind = state.achEdit.tab || state.achTab || 'labor';
    var stationMode = getAchCalcMode(tabKind) === 'station';
    var sid = state.achEdit.stationId || 'senior';
    var pair = stationMode ? draft.stations[sid] : draft;
    if (draft.valueMode === 'amount') {
      var desAmtEl = $('empAchEditDesAmt');
      var nonAmtEl = $('empAchEditNonAmt');
      if (desAmtEl) {
        var desAmt = parseFloat(desAmtEl.value);
        if (strict && (isNaN(desAmt) || desAmt < 0)) return { error: '请输入有效的点客金额' };
        if (!isNaN(desAmt)) pair.designatedAmt = desAmt;
      }
      if (nonAmtEl) {
        var nonAmt = parseFloat(nonAmtEl.value);
        if (strict && (isNaN(nonAmt) || nonAmt < 0)) return { error: '请输入有效的散客金额' };
        if (!isNaN(nonAmt)) pair.nonDesignatedAmt = nonAmt;
      }
      if (!stationMode) {
        draft.designatedAmt = pair.designatedAmt;
        draft.nonDesignatedAmt = pair.nonDesignatedAmt;
      }
    } else {
      var desEl = $('empAchEditDes');
      var nonEl = $('empAchEditNon');
      if (desEl) {
        var des = parseFloat(desEl.value);
        if (strict && (isNaN(des) || des < 0 || des > 100)) return { error: '点客比例需在 0–100' };
        if (!isNaN(des)) pair.designated = des;
      }
      if (nonEl) {
        var non = parseFloat(nonEl.value);
        if (strict && (isNaN(non) || non < 0 || non > 100)) return { error: '散客比例需在 0–100' };
        if (!isNaN(non)) pair.nonDesignated = non;
      }
      if (!stationMode) {
        draft.designated = pair.designated;
        draft.nonDesignated = pair.nonDesignated;
      }
    }
    if (draft.costMode === 'receipt' || draft.costMode === 'price') {
      var costPctEl = $('empAchEditCostPct');
      if (costPctEl) {
        draft.costPct = parseFloat(costPctEl.value);
        if (strict && (isNaN(draft.costPct) || draft.costPct < 0 || draft.costPct > 100)) {
          return { error: '成本比例需在 0–100' };
        }
      }
    } else if (draft.costMode === 'fixed') {
      var costFixedEl = $('empAchEditCostFixed');
      if (costFixedEl) {
        draft.costFixed = parseFloat(costFixedEl.value);
        if (strict && (isNaN(draft.costFixed) || draft.costFixed < 0)) {
          return { error: '请输入有效的固定成本' };
        }
      }
    } else {
      draft.costMode = 'off';
      draft.costPct = 0;
      draft.costFixed = 0;
    }
    if (stationMode) {
      syncAchFlatFromStation(draft, 'senior');
    } else {
      syncAchStationsFromFlat(draft);
    }
    state.achEdit.draft = draft;
    return { ok: true, scheme: draft };
  }

  function readAchEditSchemeFromDom() {
    var flushed = flushAchEditStationFromDom({ strict: true });
    if (flushed.error) return { error: flushed.error };
    var scheme = ensureAchStations((state.achEdit && state.achEdit.draft) || defaultAchScheme());
    return { scheme: cloneAchScheme(scheme) };
  }

  function syncAchEditFoot() {
    var solo = !!(state.achEdit && state.achEdit.kind === 'tabDefault');
    var saveBtn = $('empAchEditSave');
    var copyBtn = $('empAchEditSaveCopy');
    var foot = saveBtn && saveBtn.closest('.picker-foot');
    if (copyBtn) copyBtn.classList.toggle('hidden', solo);
    if (saveBtn) {
      saveBtn.classList.toggle('secondary', !solo);
      saveBtn.textContent = '保存';
    }
    if (foot) {
      foot.classList.toggle('picker-foot--row', true);
      foot.classList.toggle('picker-foot--solo', solo);
    }
  }

  function openAchSchemeEditor(opts) {
    opts = opts || {};
    var scheme = ensureAchStations(mergeAchScheme(opts.scheme));
    var tab = opts.tab || state.achTab;
    var kind = opts.kind || 'item';
    if (kind === 'tabDefault' || kind === 'cardDefault') scheme.valueMode = 'pct';
    state.achEdit = {
      kind: kind,
      itemId: opts.itemId || null,
      typeKey: opts.typeKey || null,
      catId: opts.catId || state.achCatId,
      tab: tab,
      valueMode: (kind === 'tabDefault' || kind === 'cardDefault') ? 'pct' : scheme.valueMode,
      costMode: scheme.costMode,
      title: opts.title || '业绩方案',
      stationId: opts.stationId || 'senior',
      draft: scheme,
    };
    $('empAchEditTitle').textContent = state.achEdit.title;
    $('empAchEditBody').innerHTML = renderAchEditBody(scheme);
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs($('empAchEditBody'));
    syncAchEditFoot();
    openMask('empAchEditMask');
  }

  function refreshAchEditBody() {
    if (!state.achEdit) return;
    flushAchEditStationFromDom();
    var draft = ensureAchStations(state.achEdit.draft || defaultAchScheme());
    draft.valueMode = state.achEdit.valueMode;
    draft.costMode = state.achEdit.costMode;
    state.achEdit.draft = draft;
    $('empAchEditBody').innerHTML = renderAchEditBody(draft);
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs($('empAchEditBody'));
  }

  function applyAchEditToAllStations() {
    if (!state.achEdit) return;
    var flushed = flushAchEditStationFromDom({ strict: true });
    if (flushed.error) { toast(flushed.error, true); return; }
    if (!window.confirm('将当前工位的点客/散客应用到大工、中工、小工全部工位？')) return;
    var draft = ensureAchStations(state.achEdit.draft);
    var sid = state.achEdit.stationId || 'senior';
    var src = cloneAchStationPair(draft.stations[sid], draft.stations[sid]);
    ACH_STATION_IDS.forEach(function (id) {
      draft.stations[id] = cloneAchStationPair(src, src);
    });
    syncAchFlatFromStation(draft, 'senior');
    state.achEdit.draft = draft;
    $('empAchEditBody').innerHTML = renderAchEditBody(draft);
    toast('已应用到全部工位');
  }

  function applySchemeToItem(item, scheme) {
    Object.assign(item, cloneAchScheme(scheme));
  }

  function saveAchEdit(copyToGroup) {
    if (!state.achEdit) return;
    var parsed = readAchEditSchemeFromDom();
    if (parsed.error) { toast(parsed.error, true); return; }
    var scheme = parsed.scheme;
    var edit = state.achEdit;
    var copied = 0;

    if (edit.kind === 'tabDefault') {
      var tabKey = edit.tab === 'sales' ? 'sales' : 'labor';
      var bucket = window.EmployeeStore.ach[tabKey];
      if (!bucket) { toast('未找到业绩数据', true); return; }
      scheme.valueMode = 'pct';
      bucket.defaultScheme = cloneAchScheme(scheme);
    } else if (edit.kind === 'cardDefault') {
      var card = window.EmployeeStore.ach.card || ensureCardAchDefaults();
      card.incomeTypes = ensureCardIncomeTypes(card);
      scheme.valueMode = 'pct';
      card.incomeTypes[edit.typeKey] = cloneAchScheme(scheme);
      window.EmployeeStore.ach.card = card;
      if (copyToGroup) {
        getAllCardAchTplItems(card).forEach(function (it) {
          if (!it.types) it.types = {};
          if ((it.typeKeys || []).indexOf(edit.typeKey) < 0) return;
          it.types[edit.typeKey] = cloneAchScheme(scheme);
          copied += 1;
        });
      }
    } else if (edit.kind === 'cardType') {
      var info = findAchItem(edit.itemId);
      if (!info || !info.item) { toast('未找到卡模板', true); return; }
      if (!info.item.types) info.item.types = {};
      info.item.types[edit.typeKey] = cloneAchScheme(scheme);
      if (edit.typeKey === 'open') {
        info.item.designated = scheme.designated;
        info.item.nonDesignated = scheme.nonDesignated;
      }
      if (copyToGroup) {
        var groupCatId = edit.catId || info.catId;
        var siblings = (window.EmployeeStore.ach.card.items && window.EmployeeStore.ach.card.items[groupCatId]) || [];
        siblings.forEach(function (it) {
          if (!it || it.id === info.item.id) return;
          if ((it.typeKeys || []).indexOf(edit.typeKey) < 0) return;
          if (!it.types) it.types = {};
          it.types[edit.typeKey] = cloneAchScheme(scheme);
          copied += 1;
        });
      }
    } else {
      var itemInfo = findAchItem(edit.itemId);
      if (!itemInfo) { toast('未找到项目', true); return; }
      applySchemeToItem(itemInfo.item, scheme);
      if (copyToGroup) {
        var groupItems = (window.EmployeeStore.ach[itemInfo.tab].items[itemInfo.catId]) || [];
        groupItems.forEach(function (it) {
          if (it.id === itemInfo.item.id) return;
          applySchemeToItem(it, scheme);
          copied += 1;
        });
      }
    }

    closeMask('empAchEditMask');
    state.achEdit = null;
    renderAch();
    invalidateCommLineCache();
    if (copyToGroup) toast(copied ? ('已保存并复制到本组 ' + copied + ' 项') : '已保存（本组暂无其他项）');
    else toast('业绩方案已保存');
  }

  function openTabDefaultEditor(tab, stationId) {
    tab = tab === 'sales' ? 'sales' : 'labor';
    openAchSchemeEditor({
      kind: 'tabDefault',
      tab: tab,
      catId: getAchCommonRulesCatId(tab),
      scheme: getAchTabDefaultScheme(tab),
      title: '通用规则 · 默认方案',
      stationId: stationId || 'senior',
    });
  }

  function openAchItemEditor(itemId, stationId) {
    var info = findAchItem(itemId);
    if (!info) return;
    openAchSchemeEditor({
      kind: 'item',
      itemId: itemId,
      catId: info.catId,
      tab: info.tab,
      scheme: info.item,
      title: info.item.name,
      stationId: stationId || 'senior',
    });
  }

  function openCardIncomeTypeEditor(typeKey, stationId) {
    var card = window.EmployeeStore.ach.card || ensureCardAchDefaults();
    card.incomeTypes = ensureCardIncomeTypes(card);
    openAchSchemeEditor({
      kind: 'cardDefault',
      typeKey: typeKey,
      tab: 'card',
      scheme: card.incomeTypes[typeKey],
      title: '默认 · ' + cardTypeLabel(typeKey),
      stationId: stationId || 'senior',
    });
  }

  function openCardItemTypeEditor(itemId, typeKey, stationId) {
    var info = findAchItem(itemId);
    if (!info || !info.item) return;
    var sch = (info.item.types && info.item.types[typeKey]) || defaultAchScheme();
    var catId = (state.achTab === 'card' && state.achCatId && state.achCatId !== 'card_rules')
      ? state.achCatId
      : info.catId;
    openAchSchemeEditor({
      kind: 'cardType',
      itemId: itemId,
      typeKey: typeKey,
      catId: catId,
      tab: 'card',
      scheme: sch,
      title: info.item.name + ' · ' + cardTypeLabel(typeKey),
      stationId: stationId || 'senior',
    });
  }

  /* 业绩卡列表卡头：纯色，取卡头渐变最右侧色值 */
  function cardTplFaceSolid(colorKey) {
    var theme = typeof getCardTheme === 'function' ? getCardTheme(colorKey) : null;
    var grad = (theme && theme.gradient) || '';
    var stops = grad.match(/#(?:[0-9A-Fa-f]{3,8})\b/g);
    if (stops && stops.length) return stops[stops.length - 1];
    return (theme && theme.accent) || '#EED1C3';
  }

  function renderCardTplListHtml(cardItems) {
    var filtered = cardItems || [];
    if (!filtered.length) {
      return '<div class="empty-cart" style="padding:24px 16px">本组暂无卡模板</div>';
    }
    return '<div class="emp-ach-card-section">按模板权益设置</div><div class="emp-ach-tpl-list">' + filtered.map(function (it) {
      var keys = it.typeKeys || cardAchApplicableTypes(it.benefits);
      var faceBg = cardTplFaceSolid(it.cardColor);
      var stationOnCard = getAchCalcMode('card') === 'station';
      var rows = keys.map(function (k) {
        var sch = (it.types && it.types[k]) || defaultAchScheme();
        var cost = formatAchCostShort(sch);
        return '<div class="emp-ach-tpl-row' + (stationOnCard ? ' emp-ach-tpl-row--stations' : '') + '" data-ach-card-type="' + k + '" role="button" tabindex="0" aria-label="' + esc(cardTypeLabel(k)) + '">' +
          '<span class="emp-ach-tpl-row__label">' + esc(cardTypeLabel(k)) + '</span>' +
          '<div class="emp-ach-tpl-row__trail">' +
          renderAchTwinCapsHtml(sch, { itemId: it.id, typeKey: k, stationMode: stationOnCard }) +
          (cost ? '<span class="emp-ach-tpl-row__cost">' + esc(cost) + '</span>' : '') +
          '</div></div>';
      }).join('');
      return '<article class="emp-ach-tpl-card" data-ach-item="' + esc(it.id) + '">' +
        '<div class="emp-ach-tpl-face" style="background:' + esc(faceBg) + '">' +
        '<div class="emp-ach-tpl-face__name">' + esc(it.name) + '</div>' +
        '<div class="emp-ach-tpl-face__price">' + fmtAchPrice(it.price) + '</div>' +
        '</div>' +
        '<div class="emp-ach-tpl-rows">' + rows + '</div>' +
        '</article>';
    }).join('') + '</div>';
  }

  function renderAch() {
    var isBase = state.achTab === 'base';
    var listWrap = $('empAchListWrap');
    var basePanel = $('empAchBasePanel');
    if (listWrap) listWrap.classList.toggle('hidden', isBase);
    if (basePanel) basePanel.classList.toggle('hidden', !isBase);
    document.querySelectorAll('#empAchTabs .page-tabs__item').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.achTab === state.achTab);
      btn.setAttribute('aria-selected', btn.dataset.achTab === state.achTab ? 'true' : 'false');
    });
    if (isBase) {
      renderAdv();
      return;
    }
    syncAchFromCatalog();
    var data = getAchData();
    var catsEl = $('empAchCats');
    var itemsEl = $('empAchItems');
    if (!data || !catsEl || !itemsEl) return;
    if (!state.achCatId || !data.cats.some(function (c) { return c.id === state.achCatId; })) {
      state.achCatId = data.cats[0] ? data.cats[0].id : null;
    }
    catsEl.innerHTML = data.cats.map(function (c) {
      return '<button type="button" class="emp-ach-cat' + (c.id === state.achCatId ? ' on' : '') +
        '" data-ach-cat="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');

    if (state.achTab === 'card' && state.achCatId === 'card_rules') {
      itemsEl.innerHTML = renderCardAchRulesHtml(data);
      itemsEl.classList.remove('is-tpl-list');
    } else if ((state.achTab === 'labor' || state.achTab === 'sales') && isAchCommonRulesCat(state.achCatId, state.achTab)) {
      itemsEl.innerHTML = renderTabAchRulesHtml(state.achTab, data);
      itemsEl.classList.remove('is-tpl-list');
    } else if (state.achTab === 'card') {
      var cardItems = (state.achCatId && data.items[state.achCatId]) || [];
      itemsEl.innerHTML = renderCardTplListHtml(cardItems);
      itemsEl.classList.add('is-tpl-list');
    } else {
      var items = (state.achCatId && data.items[state.achCatId]) || [];
      itemsEl.innerHTML = items.map(function (it) {
        var cost = formatAchCostShort(it);
        return '<div class="emp-ach-item" data-ach-item="' + it.id + '" role="button" tabindex="0">' +
          '<div class="emp-ach-item__main">' +
          '<span class="emp-ach-item__name">' + esc(it.name) + '</span>' +
          '<span class="emp-ach-item__price">' + fmtAchPrice(it.price) + '</span>' +
          '</div>' +
          '<div class="emp-ach-item__trail">' +
          renderAchTwinCapsHtml(it, { itemId: it.id, stationMode: stationOn }) +
          (cost ? '<span class="emp-ach-item__cost">' + esc(cost) + '</span>' : '') +
          '</div></div>';
      }).join('') || '<div class="empty-cart" style="padding:24px 16px">暂无项目</div>';
      itemsEl.classList.remove('is-tpl-list');
    }
  }

  function ensureAdvRules() {
    var prevById = {};
    var prevByLabel = {};
    (window.EmployeeStore.advRules || []).forEach(function (r) {
      if (!r) return;
      if (r.id) prevById[r.id] = r;
      if (r.label) prevByLabel[r.label] = r;
    });
    window.EmployeeStore.advRules = ADV_RULE_DEFS.map(function (def) {
      var prev = prevById[def.id] || prevByLabel[def.label] || null;
      var raw = prev ? String(prev.value || '') : '';
      var migrated = ADV_RULE_VALUE_MIGRATE[raw] || raw;
      var value = def.options.indexOf(migrated) >= 0 ? migrated : def.defaultValue;
      return {
        id: def.id,
        label: def.label,
        value: value,
      };
    });
    return window.EmployeeStore.advRules;
  }

  function advRuleOptsForLabel(label) {
    var def = ADV_RULE_DEFS.find(function (d) { return d.label === label; });
    return def ? def.options.slice() : [];
  }

  function ensureCalcModes() {
    var store = window.EmployeeStore;
    if (!store) return;
    var legacy = store.calcMode === 'station' ? 'station' : 'avg';
    if (store.calcModeLabor !== 'avg' && store.calcModeLabor !== 'station') {
      store.calcModeLabor = legacy;
    }
    if (store.calcModeSales !== 'avg' && store.calcModeSales !== 'station') {
      store.calcModeSales = (store.calcModeSales === 'station' || store.calcModeSales === 'avg')
        ? store.calcModeSales
        : legacy;
    }
    if (store.calcModeCard !== 'avg' && store.calcModeCard !== 'station') {
      store.calcModeCard = legacy;
    }
    store.calcMode = store.calcModeLabor;
  }

  function getAchCalcMode(kind) {
    ensureCalcModes();
    var store = window.EmployeeStore || {};
    if (kind === 'sales') return store.calcModeSales === 'station' ? 'station' : 'avg';
    if (kind === 'card') return store.calcModeCard === 'station' ? 'station' : 'avg';
    return store.calcModeLabor === 'station' ? 'station' : 'avg';
  }

  function setAchCalcMode(kind, mode, opts) {
    ensureCalcModes();
    var next = mode === 'station' ? 'station' : 'avg';
    var prev = getAchCalcMode(kind);
    var store = window.EmployeeStore;
    if (!store) return;
    if (kind === 'sales') store.calcModeSales = next;
    else if (kind === 'card') store.calcModeCard = next;
    else {
      store.calcModeLabor = next;
      store.calcMode = next;
    }
    if (opts && opts.skipMigrate) return;
    if (prev !== next) {
      if (next === 'station') migrateAchKindToStation(kind);
      else migrateAchKindToAvg(kind);
    }
  }

  function snapshotAchKind(kind) {
    var bucket = window.EmployeeStore && window.EmployeeStore.ach && window.EmployeeStore.ach[kind];
    if (!bucket) return null;
    try { return JSON.parse(JSON.stringify(bucket)); } catch (e) { return null; }
  }

  function restoreAchKind(kind, snap) {
    if (!window.EmployeeStore || !window.EmployeeStore.ach || !snap) return;
    window.EmployeeStore.ach[kind] = JSON.parse(JSON.stringify(snap));
  }

  function calcModeGroupLabel(kind) {
    var g = CALC_MODE_GROUPS.find(function (x) { return x.key === kind; });
    return (g && g.label) || '业绩';
  }

  function closeCalcModeConfirm(revert) {
    var pending = state.calcModePending;
    if (revert && pending) {
      restoreAchKind(pending.kind, pending.achSnapshot);
      setAchCalcMode(pending.kind, pending.prevMode, { skipMigrate: true });
    }
    state.calcModePending = null;
    closeEmpDialog('empCalcModeConfirmMask');
    if (revert) {
      if (typeof renderAdv === 'function') renderAdv();
      renderAch();
    }
  }

  function openCalcModeConfirm(kind, prevMode, nextMode) {
    var label = calcModeGroupLabel(kind);
    var titleEl = $('empCalcModeConfirmTitle');
    var bodyEl = $('empCalcModeConfirmBody');
    var okEl = $('empCalcModeConfirmOk');
    if (nextMode === 'station') {
      if (titleEl) titleEl.textContent = '切换为按工位分配？';
      if (bodyEl) {
        bodyEl.textContent = '「' + label + '」改为按工位分配后，开单需选择工位；可在业绩设置中为各工位分别配置点客/散客方案。';
      }
      if (okEl) okEl.textContent = '确定';
    } else {
      if (titleEl) titleEl.textContent = '切换为平均分配？';
      if (bodyEl) {
        bodyEl.textContent = '「' + label + '」改为平均分配后，开单无需选择工位；该类型下各工位方案将合并为统一配置。';
      }
      if (okEl) okEl.textContent = '确定';
    }
    state.calcModePending = {
      kind: kind,
      prevMode: prevMode,
      nextMode: nextMode,
      achSnapshot: snapshotAchKind(kind)
    };
    /* 先确认再生效：弹窗确认前不修改任何数据 */
    openEmpDialog('empCalcModeConfirmMask');
  }

  function confirmCalcModeAndGoAch() {
    var pending = state.calcModePending;
    if (!pending) {
      closeEmpDialog('empCalcModeConfirmMask');
      return;
    }
    setAchCalcMode(pending.kind, pending.nextMode);
    state.achTab = pending.kind;
    if (pending.kind === 'card') state.achCatId = 'card_rules';
    else state.achCatId = getAchCommonRulesCatId(pending.kind);
    state.calcModePending = null;
    closeEmpDialog('empCalcModeConfirmMask');
    renderAch();
    openAch();
  }

  function walkAchSchemes(kind, fn) {
    var bucket = window.EmployeeStore.ach && window.EmployeeStore.ach[kind];
    if (!bucket) return;
    if (kind === 'card') {
      var types = ensureCardIncomeTypes(bucket);
      Object.keys(types).forEach(function (k) { fn(types[k]); });
      bucket.incomeTypes = types;
      var seenTpl = Object.create(null);
      Object.keys(bucket.items || {}).forEach(function (catId) {
        (bucket.items[catId] || []).forEach(function (it) {
          if (!it) return;
          if (it.id) {
            if (seenTpl[it.id]) return;
            seenTpl[it.id] = true;
          }
          if (it.types) {
            Object.keys(it.types).forEach(function (tk) { fn(it.types[tk]); });
          } else {
            fn(it);
          }
        });
      });
      return;
    }
    if (bucket.defaultScheme) {
      bucket.defaultScheme = ensureAchStations(mergeAchScheme(bucket.defaultScheme, defaultAchScheme()));
      fn(bucket.defaultScheme);
    }
    Object.keys(bucket.items || {}).forEach(function (catId) {
      (bucket.items[catId] || []).forEach(function (it) { fn(it); });
    });
  }

  function migrateAchKindToStation(kind) {
    walkAchSchemes(kind, function (scheme) {
      var next = syncAchStationsFromFlat(ensureAchStations(scheme));
      Object.assign(scheme, next);
    });
  }

  function migrateAchKindToAvg(kind) {
    walkAchSchemes(kind, function (scheme) {
      var next = syncAchFlatFromStation(ensureAchStations(scheme), 'senior');
      Object.assign(scheme, next);
    });
  }

  function ensureStationMap() {
    var store = window.EmployeeStore;
    if (!store) return { senior: '大工', mid: '中工', junior: '小工' };
    if (!store.stationMap || typeof store.stationMap !== 'object') store.stationMap = {};
    STAFF_STATION_DEFS.forEach(function (def) {
      var raw = String(store.stationMap[def.id] == null ? '' : store.stationMap[def.id]).trim();
      if (!raw) raw = def.defaultLabel;
      if (raw.length > STATION_NAME_MAX) raw = raw.slice(0, STATION_NAME_MAX);
      store.stationMap[def.id] = raw;
    });
    return store.stationMap;
  }

  function getStationLabel(roleId) {
    var map = ensureStationMap();
    var def = STAFF_STATION_DEFS.find(function (d) { return d.id === roleId; });
    return (map && map[roleId]) || (def && def.defaultLabel) || '';
  }

  function getStationLabels() {
    ensureStationMap();
    return STAFF_STATION_DEFS.map(function (def) {
      return { id: def.id, label: getStationLabel(def.id), defaultLabel: def.defaultLabel };
    });
  }

  function setStationLabel(roleId, name) {
    ensureStationMap();
    var def = STAFF_STATION_DEFS.find(function (d) { return d.id === roleId; });
    if (!def || !window.EmployeeStore) return { ok: false, error: '工位不存在' };
    var next = String(name == null ? '' : name).trim();
    if (!next) return { ok: false, error: '工位名称不能为空', fallback: def.defaultLabel };
    if (next.length > STATION_NAME_MAX) {
      next = next.slice(0, STATION_NAME_MAX);
    }
    window.EmployeeStore.stationMap[roleId] = next;
    return { ok: true, value: next };
  }

  function resetStationMapToDefault() {
    if (!window.EmployeeStore) return;
    window.EmployeeStore.stationMap = {};
    STAFF_STATION_DEFS.forEach(function (def) {
      window.EmployeeStore.stationMap[def.id] = def.defaultLabel;
    });
  }

  function validateStationMapForSave() {
    ensureStationMap();
    for (var i = 0; i < STAFF_STATION_DEFS.length; i++) {
      var def = STAFF_STATION_DEFS[i];
      var name = String((window.EmployeeStore.stationMap || {})[def.id] || '').trim();
      if (!name) return '请填写「' + def.defaultLabel + '」映射名称';
      if (name.length > STATION_NAME_MAX) return '工位名称不得多于' + STATION_NAME_MAX + '个字';
    }
    return '';
  }

  function renderAdv() {
    var rulesEl = $('empAdvRules');
    var stationEl = $('empStationMap');
    if (!rulesEl || !stationEl) return;
    var rules = ensureAdvRules();
    ensureStationMap();
    rulesEl.innerHTML = rules.map(function (r) {
      var opts = advRuleOptsForLabel(r.label);
      var optsHtml = opts.map(function (o) {
        var on = o === r.value;
        return '<button type="button" class="emp-adv-rule-opt' + (on ? ' on' : '') + '" data-adv-rule-id="' + esc(r.id) + '" data-adv-rule-val="' + esc(o) + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
          '<span class="emp-adv-rule-opt__lbl">' + esc(o) + '</span>' +
          '<span class="emp-adv-rule-opt__radio" aria-hidden="true"></span></button>';
      }).join('');
      return '<div class="emp-adv-rule-block" role="radiogroup" aria-label="' + esc(r.label) + '">' +
        '<p class="emp-adv-rule-block__title">' + esc(r.label) + '</p>' +
        optsHtml +
        '</div>';
    }).join('');
    stationEl.innerHTML = STAFF_STATION_DEFS.map(function (def) {
      var val = getStationLabel(def.id);
      return '<div class="emp-station-map-row">' +
        '<span class="emp-station-map-row__lbl">' + esc(def.defaultLabel) + '</span>' +
        '<span class="emp-station-map-row__verb">改名称为</span>' +
        '<div class="emp-station-map-row__field">' +
        '<input type="text" class="emp-station-map-row__input" data-station-id="' + esc(def.id) + '" value="' + esc(val) + '" maxlength="' + STATION_NAME_MAX + '" placeholder="请输入" autocomplete="off" aria-label="' + esc(def.defaultLabel) + '改名称为">' +
        '<span class="emp-station-map-row__hint">不超过' + STATION_NAME_MAX + '个字</span>' +
        '</div></div>';
    }).join('');
  }

  function commSchemeIconSvg(type) {
    var key = type === 'ladder' ? 'ladder' : 'item';
    return '<img class="emp-comm-icon" src="assets/comm/' + key + '.svg" alt="" width="40" height="40" draggable="false" />';
  }

  function renderCommList() {
    var root = $('empCommList');
    if (!root) return;
    ensureAllCommSchemes();
    root.innerHTML = window.EmployeeStore.schemes.map(function (sch) {
      var typeLabel = sch.type === 'ladder' ? '阶梯比例' : '固定比例';
      var ruleText;
      if (sch.type === 'ladder') {
        ensureLadderScheme(sch);
        var ladder = sch.ladder || [];
        var first = ladder[0] ? formatCommUnitValue(ladder[0].pct, ladder[0].mode) : formatCommUnitValue(0, 'pct');
        var last = ladder.length ? formatCommUnitValue(ladder[ladder.length - 1].pct, ladder[ladder.length - 1].mode) : first;
        var calcLbl = sch.ladderCalcMode === 'progressive' ? '每段不同档' : '全额最高档';
        var payLbl = formatLadderPayTypesShort(sch);
        ruleText = calcLbl + ' · ' + payLbl + ' · ' + ladder.length + ' 档 · ' + first + ' → ' + last;
      } else {
        ensureItemScheme(sch);
        var n = (sch.items && sch.items.length) || 0;
        ruleText = '分类默认 · 单项覆盖 ' + n + ' 项';
      }
      var ruleParts = String(ruleText || '').split(' · ').filter(Boolean);
      var ruleValHtml = ruleParts.map(function (part, pi) {
        return '<span class="emp-comm-card__rule-part">' + (pi ? ' · ' : '') + esc(part) + '</span>';
      }).join('');
      var assignedIds = sch.assigned || [];
      var assignedN = assignedIds.length;
      var assignedText;
      if (!assignedN) {
        assignedText = '去分配';
      } else {
        var names = assignedIds.map(function (sid) {
          var st = staffById(sid);
          return st ? st.name : '';
        }).filter(Boolean);
        if (names.length <= 2) assignedText = names.join('、') || (assignedN + ' 人');
        else assignedText = names.slice(0, 2).join('、') + ' 等' + assignedN + '人';
      }
      return '<div class="emp-comm-card" data-scheme-id="' + sch.id + '">' +
        '<button type="button" class="emp-comm-card__edit" data-scheme-edit="' + sch.id + '" aria-label="编辑方案 ' + esc(sch.name) + '">' +
        '<div class="emp-comm-card__top">' +
        '<div class="emp-comm-card__who">' +
        '<span class="emp-comm-card__icon">' + commSchemeIconSvg(sch.type) + '</span>' +
        '<div class="emp-comm-card__title-wrap">' +
        '<div class="emp-comm-card__name">' + esc(sch.name) + '</div>' +
        '<div class="emp-comm-card__type">' + esc(typeLabel) + '</div>' +
        '</div></div></div>' +
        '<div class="emp-comm-card__rule"><span class="emp-comm-card__rule-lbl">提成规则</span><span class="emp-comm-card__rule-val">' + ruleValHtml + '</span></div>' +
        '</button>' +
        '<button type="button" class="emp-comm-card__menu" data-scheme-menu="' + sch.id + '" aria-label="更多">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>' +
        '<button type="button" class="emp-comm-card__assign' + (assignedN ? '' : ' is-muted') + '" data-scheme-assign="' + sch.id + '" aria-label="分配员工">' +
        '<span>已分配</span>' +
        '<span class="emp-comm-card__assign-val"><span>' + esc(assignedText) + '</span>' + navChevHtml() + '</span>' +
        '</button></div>';
    }).join('') || '<div class="empty-cart" style="padding:32px 16px">暂无提成方案</div>';
  }

  function normalizeCommMode(mode) {
    return mode === 'amount' ? 'amount' : 'pct';
  }
  function formatCommUnitValue(val, mode) {
    var n = Number(val);
    if (!Number.isFinite(n)) n = 0;
    return normalizeCommMode(mode) === 'amount' ? ('¥' + n) : (n + '%');
  }
  function parseCommInputValue(raw) {
    if (raw == null) return NaN;
    var s = String(raw).trim().replace(/[￥¥%\s,]/g, '');
    if (s === '') return NaN;
    return parseFloat(s);
  }
  function formatCommInputDisplay(val, mode) {
    var n = typeof val === 'number' ? val : parseCommInputValue(val);
    if (!Number.isFinite(n)) return '';
    var s = String(n);
    return normalizeCommMode(mode) === 'amount' ? ('¥' + s) : (s + '%');
  }
  function rawCommInputDisplay(val) {
    var n = typeof val === 'number' ? val : parseCommInputValue(val);
    return Number.isFinite(n) ? String(n) : '';
  }
  function blurCommNumInput(el) {
    if (!el) return;
    var mode = normalizeCommMode(el.dataset.commNumMode || el.dataset.ladderPctMode);
    var n = parseCommInputValue(el.value);
    if (!Number.isFinite(n)) { el.value = ''; return; }
    if (n < 0) n = 0;
    if (mode === 'pct' && n > INPUT_LIMITS.PCT_MAX) {
      n = INPUT_LIMITS.PCT_MAX;
      toast('比例需在 0–100%', true);
    } else if (mode === 'amount' && n > INPUT_LIMITS.MONEY_MAX) {
      n = INPUT_LIMITS.MONEY_MAX;
      toast('金额不能超过 ' + formatMoneyLimitLabel(), true);
    }
    /* 阶梯凹槽旁已有 %/¥ 后缀，输入框只保留数字 */
    if (el.closest('.emp-ladder-reward') || el.dataset.commNumBare === '1') {
      el.value = rawCommInputDisplay(n);
      return;
    }
    el.value = formatCommInputDisplay(n, mode);
  }
  function focusCommNumInput(el) {
    if (!el) return;
    el.value = rawCommInputDisplay(el.value);
    try { el.select(); } catch (err) { /* ignore */ }
  }
  function setCommBlockMode(kind, mode) {
    var block = document.querySelector('.emp-comm-block[data-comm-kind="' + kind + '"]');
    if (!block) return;
    var m = normalizeCommMode(mode);
    block.querySelectorAll('input[type="radio"]').forEach(function (r) {
      r.checked = r.value === m;
    });
    block.querySelectorAll('[data-comm-input]').forEach(function (el) {
      el.classList.toggle('hidden', el.dataset.commInput !== m);
    });
  }
  function readCommBlockMode(kind) {
    var block = document.querySelector('.emp-comm-block[data-comm-kind="' + kind + '"]');
    if (!block) return 'pct';
    var checked = block.querySelector('input[type="radio"]:checked');
    return normalizeCommMode(checked && checked.value);
  }
  function readCommBlockValue(kind) {
    var mode = readCommBlockMode(kind);
    var idMap = {
      labor: { pct: 'empCommLaborPct', amount: 'empCommLaborAmt' },
      sales: { pct: 'empCommSalesPct', amount: 'empCommSalesAmt' },
      issue: { pct: 'empCommIssuePct', amount: 'empCommIssueAmt' },
      card: { pct: 'empCommCardPct', amount: 'empCommCardAmt' },
    };
    var ids = idMap[kind];
    if (!ids) return { mode: mode, value: 0 };
    var el = $(ids[mode]);
    var n = parseCommInputValue(el && el.value);
    return { mode: mode, value: Number.isFinite(n) ? n : 0 };
  }
  function fillCommBlockValue(kind, value, mode) {
    var idMap = {
      labor: { pct: 'empCommLaborPct', amount: 'empCommLaborAmt' },
      sales: { pct: 'empCommSalesPct', amount: 'empCommSalesAmt' },
      issue: { pct: 'empCommIssuePct', amount: 'empCommIssueAmt' },
      card: { pct: 'empCommCardPct', amount: 'empCommCardAmt' },
    };
    var ids = idMap[kind];
    if (!ids) return;
    var pctEl = $(ids.pct);
    var amtEl = $(ids.amount);
    if (pctEl) pctEl.value = formatCommInputDisplay(value, 'pct');
    if (amtEl) amtEl.value = formatCommInputDisplay(value, 'amount');
    setCommBlockMode(kind, mode);
  }

  function ensureSchemeScope(sch) {
    if (!sch) return sch;
    if (sch.scopeMode !== 'custom') sch.scopeMode = 'all';
    if (!sch.scope || typeof sch.scope !== 'object') {
      sch.scope = { projectIds: [], productIds: [], cardIds: [] };
    }
    ['projectIds', 'productIds', 'cardIds'].forEach(function (k) {
      if (!Array.isArray(sch.scope[k])) sch.scope[k] = [];
    });
    return sch;
  }
  function cloneScopeDraft(sch) {
    ensureSchemeScope(sch);
    return {
      mode: sch.scopeMode === 'custom' ? 'custom' : 'all',
      projectIds: (sch.scope.projectIds || []).slice(),
      productIds: (sch.scope.productIds || []).slice(),
      cardIds: (sch.scope.cardIds || []).slice(),
    };
  }
  function scopeIdsKey(type) {
    if (type === 'product') return 'productIds';
    if (type === 'card') return 'cardIds';
    return 'projectIds';
  }
  function scopeSelectedSet(type) {
    var draft = state.scopeDraft || { projectIds: [], productIds: [], cardIds: [] };
    var ids = draft[scopeIdsKey(type)] || [];
    var map = {};
    ids.forEach(function (id) { map[id] = true; });
    return map;
  }
  function scopeTotalSelected(draft) {
    draft = draft || state.scopeDraft || {};
    return (draft.projectIds || []).length + (draft.productIds || []).length + (draft.cardIds || []).length;
  }
  function scopeSummaryHtml(sch) {
    ensureSchemeScope(sch);
    var preview;
    if (sch.scopeMode !== 'custom') {
      preview = '全部适用';
    } else {
      var p = (sch.scope.projectIds || []).length;
      var d = (sch.scope.productIds || []).length;
      var c = (sch.scope.cardIds || []).length;
      var parts = [];
      if (p) parts.push('项目 ' + p);
      if (d) parts.push('产品 ' + d);
      if (c) parts.push('卡 ' + c);
      preview = parts.length ? parts.join(' · ') : '未选择任何项';
    }
    return '<span class="emp-ladder-nav-ctl__val has-val">' + esc(preview) + '</span>' +
      '<svg class="emp-ladder-nav-ctl__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  }
  var SIMPLE_TIMES_SCOPE_GROUP_ID = 'g_simple_times';

  function getScopeSimpleTimesItems() {
    if (typeof getSimpleTimesAchProjects !== 'function') return [];
    return (getSimpleTimesAchProjects() || []).map(function (p) {
      return {
        id: p.id,
        name: p.name || '未命名',
        sub: '¥' + (p.price != null ? p.price : 0),
        isSimpleTimes: true,
      };
    });
  }

  function getScopeCatalogItems(type) {
    if (type === 'card') {
      var cards = [];
      if (typeof getActiveTemplates === 'function') {
        cards = getActiveTemplates().slice();
      }
      if (typeof getShelvedTemplates === 'function') {
        getShelvedTemplates().forEach(function (t) {
          if (!cards.some(function (x) { return x.id === t.id; })) cards.push(t);
        });
      }
      return cards.map(function (t) {
        return {
          id: t.id,
          name: t.name || '未命名卡',
          sub: t.shelved ? '已下架' : ('面值 ¥' + (t.recharge || 0)),
        };
      });
    }
    var list = [];
    if (type === 'product' && typeof getCatalogProducts === 'function') list = getCatalogProducts();
    else if (typeof getCatalogProjects === 'function') list = getCatalogProjects();
    var out = (list || []).filter(function (it) { return !it.hidden; }).map(function (it) {
      return {
        id: it.id,
        name: it.name || '未命名',
        sub: '¥' + (it.price != null ? it.price : 0),
      };
    });
    if (type === 'project') {
      getScopeSimpleTimesItems().forEach(function (st) {
        if (!out.some(function (x) { return x.id === st.id; })) out.push(st);
      });
    }
    return out;
  }
  function getScopeGroups(type) {
    if (type === 'card') {
      return (typeof ensureCardGroups === 'function') ? (ensureCardGroups() || []) : [];
    }
    var groups = [];
    if (typeof getCustomCatalogGroups === 'function') {
      groups = (getCustomCatalogGroups(type === 'product' ? 'product' : 'project') || []).slice();
    }
    if (type === 'project') {
      var stItems = getScopeSimpleTimesItems();
      if (stItems.length) {
        groups = groups.filter(function (g) { return g && g.id !== SIMPLE_TIMES_SCOPE_GROUP_ID; });
        groups.push({
          id: SIMPLE_TIMES_SCOPE_GROUP_ID,
          name: '独立计次卡',
          itemIds: stItems.map(function (it) { return it.id; }),
          system: true,
        });
      }
    }
    return groups;
  }
  function scopeVisibleItems(type, groupId) {
    var items = getScopeCatalogItems(type);
    if (!groupId || groupId === 'all') return items;
    if (type === 'project' && groupId === SIMPLE_TIMES_SCOPE_GROUP_ID) {
      return items.filter(function (it) { return !!it.isSimpleTimes || String(it.id || '').indexOf('st_') === 0; });
    }
    var g = getScopeGroups(type).find(function (x) { return x.id === groupId; });
    if (!g) return items;
    var set = {};
    (g.itemIds || []).forEach(function (id) { set[id] = true; });
    return items.filter(function (it) { return set[it.id]; });
  }
  function scopeCheckHtml(stateName) {
    if (stateName === 'on') return '<span class="emp-scope-check is-on" aria-hidden="true">' + checkSvg12() + '</span>';
    if (stateName === 'partial') return '<span class="emp-scope-check is-partial" aria-hidden="true"></span>';
    return '<span class="emp-scope-check" aria-hidden="true"></span>';
  }
  function syncScopeAllToggleUi() {
    var draft = state.scopeDraft;
    var isAll = !draft || draft.mode === 'all';
    var toggle = $('empScopeAllToggle');
    var custom = $('empScopeCustom');
    var sub = $('empScopeAllSub');
    if (toggle) {
      toggle.classList.toggle('on', isAll);
      toggle.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    }
    if (custom) custom.classList.toggle('is-disabled', isAll);
    if (sub) {
      sub.textContent = isAll
        ? '开启后不限项目/产品/会员卡，按全部业绩合计分档'
        : '已关闭，请按类型勾选计入阶梯的业绩来源';
    }
  }
  function renderScopeGroupChips() {
    var bar = $('empScopeGroupBar');
    var scroll = $('empScopeGroupScroll');
    if (!bar || !scroll) return;
    var type = state.scopeType || 'project';
    var groups = getScopeGroups(type);
    if (!groups.length) {
      bar.classList.add('hidden');
      scroll.innerHTML = '';
      return;
    }
    bar.classList.remove('hidden');
    var gid = state.scopeGroupId || 'all';
    if (type === 'card' && typeof getActiveCardGroupId === 'function') {
      gid = getActiveCardGroupId('empScope') || 'all';
      state.scopeGroupId = gid;
    }
    if (gid !== 'all' && !groups.some(function (g) { return g.id === gid; })) {
      gid = 'all';
      state.scopeGroupId = 'all';
    }
    var tabs = [{ id: 'all', name: '全部' }].concat(groups.map(function (g) {
      return { id: g.id, name: g.name };
    }));
    scroll.innerHTML = tabs.map(function (t) {
      var on = t.id === gid;
      return '<button type="button" class="catalog-group-tab' + (on ? ' on' : '') + '" data-scope-group="' + esc(t.id) + '" role="tab" aria-selected="' + (on ? 'true' : 'false') + '">' +
        '<span class="catalog-group-tab__face"><span class="catalog-group-tab__label"><span class="catalog-group-tab__label-text">' + esc(t.name) + '</span></span></span>' +
        '</button>';
    }).join('');
    if (typeof wirePickGroupScrollPan === 'function') wirePickGroupScrollPan(scroll);
    requestAnimationFrame(function () {
      var onEl = scroll.querySelector('.catalog-group-tab.on');
      if (onEl && typeof ensureGroupTabFullyVisible === 'function') ensureGroupTabFullyVisible(scroll, onEl);
    });
  }
  function renderScopeCount() {
    var el = $('empScopeCount');
    if (!el) return;
    var n = scopeTotalSelected(state.scopeDraft);
    el.innerHTML = '已选 <strong>' + n + '</strong> 项' + navChevHtml();
  }
  function isScopeVisibleAllSelected() {
    if (!state.scopeDraft || state.scopeDraft.mode === 'all') return false;
    var visible = scopeVisibleItems(state.scopeType, state.scopeGroupId);
    if (!visible.length) return false;
    var selected = scopeSelectedSet(state.scopeType);
    return visible.every(function (it) { return selected[it.id]; });
  }
  function syncScopeSelectAllBtn() {
    var btn = $('empScopeSelectAll');
    if (!btn) return;
    btn.textContent = isScopeVisibleAllSelected() ? '全不选' : '全选';
  }
  function renderScopeList() {
    var root = $('empScopeList');
    if (!root) return;
    var type = state.scopeType || 'project';
    var gid = state.scopeGroupId || 'all';
    var selected = scopeSelectedSet(type);
    var items = scopeVisibleItems(type, gid);
    if (!items.length) {
      root.innerHTML = '<div class="emp-scope-empty">暂无' + (type === 'product' ? '产品' : type === 'card' ? '会员卡' : '项目') + '</div>';
      renderScopeCount();
      syncScopeSelectAllBtn();
      return;
    }
    if (gid === 'all') {
      var groups = getScopeGroups(type);
      var used = {};
      var html = '';
      groups.forEach(function (g) {
        var members = items.filter(function (it) { return (g.itemIds || []).indexOf(it.id) >= 0; });
        if (!members.length) return;
        members.forEach(function (it) { used[it.id] = true; });
        var onN = members.filter(function (it) { return selected[it.id]; }).length;
        var chk = onN === 0 ? 'off' : (onN === members.length ? 'on' : 'partial');
        html += '<div class="emp-scope-sec" data-scope-sec="' + esc(g.id) + '">' +
          '<div class="emp-scope-sec__head" data-scope-group-toggle="' + esc(g.id) + '">' +
          scopeCheckHtml(chk) +
          '<span class="emp-scope-sec__name">' + esc(g.name) + '</span>' +
          '<span class="emp-scope-sec__meta">' + onN + '/' + members.length + '</span>' +
          '<button type="button" class="emp-scope-sec__action" data-scope-group-pick="' + esc(g.id) + '">选本组</button>' +
          '</div>' +
          members.map(function (it) {
            var on = !!selected[it.id];
            return '<button type="button" class="emp-scope-item' + (on ? ' on' : '') + '" data-scope-item="' + esc(it.id) + '">' +
              '<span class="emp-scope-item__meta"><span class="emp-scope-item__name">' + esc(it.name) + '</span>' +
              '<span class="emp-scope-item__sub">' + esc(it.sub) + '</span></span>' +
              scopeCheckHtml(on ? 'on' : 'off') + '</button>';
          }).join('') + '</div>';
      });
      var rest = items.filter(function (it) { return !used[it.id]; });
      if (rest.length) {
        var onR = rest.filter(function (it) { return selected[it.id]; }).length;
        var chkR = onR === 0 ? 'off' : (onR === rest.length ? 'on' : 'partial');
        html += '<div class="emp-scope-sec" data-scope-sec="__other">' +
          '<div class="emp-scope-sec__head" data-scope-group-toggle="__other">' +
          scopeCheckHtml(chkR) +
          '<span class="emp-scope-sec__name">其他</span>' +
          '<span class="emp-scope-sec__meta">' + onR + '/' + rest.length + '</span>' +
          '<button type="button" class="emp-scope-sec__action" data-scope-group-pick="__other">选本组</button>' +
          '</div>' +
          rest.map(function (it) {
            var on = !!selected[it.id];
            return '<button type="button" class="emp-scope-item' + (on ? ' on' : '') + '" data-scope-item="' + esc(it.id) + '">' +
              '<span class="emp-scope-item__meta"><span class="emp-scope-item__name">' + esc(it.name) + '</span>' +
              '<span class="emp-scope-item__sub">' + esc(it.sub) + '</span></span>' +
              scopeCheckHtml(on ? 'on' : 'off') + '</button>';
          }).join('') + '</div>';
      }
      root.innerHTML = html || '<div class="emp-scope-empty">暂无数据</div>';
    } else {
      root.innerHTML = items.map(function (it) {
        var on = !!selected[it.id];
        return '<button type="button" class="emp-scope-item' + (on ? ' on' : '') + '" data-scope-item="' + esc(it.id) + '" style="border-radius:12px;border:1.5px solid ' + (on ? 'var(--brand)' : '#EDEDED') + ';">' +
          '<span class="emp-scope-item__meta"><span class="emp-scope-item__name">' + esc(it.name) + '</span>' +
          '<span class="emp-scope-item__sub">' + esc(it.sub) + '</span></span>' +
          scopeCheckHtml(on ? 'on' : 'off') + '</button>';
      }).join('');
    }
    renderScopeCount();
    syncScopeSelectAllBtn();
  }
  function renderScopeScreen() {
    syncScopeAllToggleUi();
    document.querySelectorAll('.emp-scope-type-tab').forEach(function (btn) {
      var on = btn.dataset.scopeType === state.scopeType;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderScopeGroupChips();
    renderScopeList();
  }
  function openLadderScopeEditor() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || sch.type !== 'ladder') return;
    ensureSchemeScope(sch);
    state.scopePurpose = 'ladder';
    state.scopeDraft = cloneScopeDraft(sch);
    state.scopeBaseline = JSON.stringify(state.scopeDraft);
    state.scopeType = 'project';
    state.scopeGroupId = 'all';
    var title = document.querySelector('#screen-emp-comm-scope .title');
    if (title) title.textContent = '使用范围';
    var allCard = document.querySelector('#screen-emp-comm-scope .emp-scope-all-card');
    if (allCard) allCard.classList.remove('hidden');
    renderScopeScreen();
    showScreen('screen-emp-comm-scope');
    nav('staff-comm-scope');
  }
  function isScopeDraftDirty() {
    return JSON.stringify(state.scopeDraft || {}) !== (state.scopeBaseline || '');
  }
  function applyScopeDraftToScheme() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || !state.scopeDraft) return;
    ensureSchemeScope(sch);
    var draft = state.scopeDraft;
    if (draft.mode === 'all') {
      sch.scopeMode = 'all';
      sch.scope = { projectIds: [], productIds: [], cardIds: [] };
    } else {
      sch.scopeMode = 'custom';
      sch.scope = {
        projectIds: (draft.projectIds || []).slice(),
        productIds: (draft.productIds || []).slice(),
        cardIds: (draft.cardIds || []).slice(),
      };
      if (!scopeTotalSelected(draft)) {
        toast('自定义范围请至少勾选一项，或开启全部适用', true);
        return false;
      }
    }
    return true;
  }
  function toggleScopeItem(id) {
    if (!state.scopeDraft || state.scopeDraft.mode === 'all') return;
    var key = scopeIdsKey(state.scopeType);
    var list = state.scopeDraft[key] || [];
    var idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(id);
    state.scopeDraft[key] = list;
    state.scopeDraft.mode = 'custom';
    renderScopeList();
  }
  function setScopeIdsForVisible(mode) {
    if (!state.scopeDraft || state.scopeDraft.mode === 'all') return;
    var key = scopeIdsKey(state.scopeType);
    var visible = scopeVisibleItems(state.scopeType, state.scopeGroupId).map(function (it) { return it.id; });
    var set = {};
    (state.scopeDraft[key] || []).forEach(function (id) { set[id] = true; });
    if (mode === true || mode === 'all') {
      visible.forEach(function (id) { set[id] = true; });
    } else if (mode === 'clear') {
      visible.forEach(function (id) { set[id] = false; });
    } else {
      visible.forEach(function (id) { set[id] = !set[id]; });
    }
    state.scopeDraft[key] = Object.keys(set).filter(function (id) { return set[id]; });
    state.scopeDraft.mode = 'custom';
    renderScopeList();
  }
  function pickScopeGroup(groupId) {
    if (!state.scopeDraft || state.scopeDraft.mode === 'all') return;
    var type = state.scopeType;
    var key = scopeIdsKey(type);
    var members;
    if (groupId === '__other') {
      var groups = getScopeGroups(type);
      var used = {};
      groups.forEach(function (g) { (g.itemIds || []).forEach(function (id) { used[id] = true; }); });
      members = getScopeCatalogItems(type).filter(function (it) { return !used[it.id]; }).map(function (it) { return it.id; });
    } else {
      var g = getScopeGroups(type).find(function (x) { return x.id === groupId; });
      var all = {};
      getScopeCatalogItems(type).forEach(function (it) { all[it.id] = true; });
      members = ((g && g.itemIds) || []).filter(function (id) { return all[id]; });
    }
    var set = {};
    (state.scopeDraft[key] || []).forEach(function (id) { set[id] = true; });
    var allOn = members.length && members.every(function (id) { return set[id]; });
    members.forEach(function (id) { set[id] = !allOn; });
    state.scopeDraft[key] = Object.keys(set).filter(function (id) { return set[id]; });
    state.scopeDraft.mode = 'custom';
    renderScopeList();
  }
  function renderScopeSelectedSheet() {
    var root = $('empScopeSelectedList');
    if (!root || !state.scopeDraft) return;
    var draft = state.scopeDraft;
    var blocks = [
      { type: 'project', title: '项目', ids: draft.projectIds || [] },
      { type: 'product', title: '产品', ids: draft.productIds || [] },
      { type: 'card', title: '会员卡', ids: draft.cardIds || [] },
    ];
    var html = '';
    blocks.forEach(function (b) {
      if (!b.ids.length) return;
      var map = {};
      getScopeCatalogItems(b.type).forEach(function (it) { map[it.id] = it; });
      html += '<div class="emp-scope-sheet-sec-title">' + b.title + ' · ' + b.ids.length + '</div>';
      b.ids.forEach(function (id) {
        var it = map[id];
        html += '<div class="emp-scope-sheet-row" data-scope-sheet-type="' + b.type + '" data-scope-sheet-id="' + esc(id) + '">' +
          '<span class="emp-scope-sheet-row__name">' + esc(it ? it.name : id) + '</span>' +
          '<button type="button" class="emp-scope-sheet-row__del" data-scope-sheet-del>移除</button></div>';
      });
    });
    root.innerHTML = html || '<div class="emp-scope-empty">暂未勾选</div>';
  }

  var ITEM_COMM_PAY_DEFS = [
    { key: 'memberCard', label: '会员卡' },
    { key: 'cash', label: '现金' },
    { key: 'groupBuy', label: '团购' },
  ];
  var ITEM_COMM_CAT_DEFS = [
    { key: 'labor', label: '项目提成' },
    { key: 'sales', label: '产品提成' },
    { key: 'issue', label: '办卡提成' },
    { key: 'card', label: '充卡提成' },
  ];
  var ITEM_COMM_CARD_HELP_HTML = '<p>「充卡」指顾客持有会员卡后，因<strong>充值、续次、延期</strong>等操作产生的营业收入所对应的提成口径。</p>';
  function defaultItemCommPayBlock() {
    return { designated: 10, nonDesignated: 8, designatedAmt: 0, nonDesignatedAmt: 0 };
  }
  function defaultItemCommRule() {
    return {
      valueMode: 'pct',
      designated: 10,
      nonDesignated: 8,
      designatedAmt: 0,
      nonDesignatedAmt: 0,
      byPayType: false,
      payTypes: {
        memberCard: defaultItemCommPayBlock(),
        cash: defaultItemCommPayBlock(),
        groupBuy: defaultItemCommPayBlock(),
      },
    };
  }
  function ruleFromFlatPct(pct, mode) {
    mode = normalizeCommMode(mode);
    var n = Number(pct);
    if (!Number.isFinite(n)) n = 0;
    var rule = defaultItemCommRule();
    rule.valueMode = mode;
    rule.byPayType = false;
    if (mode === 'amount') {
      rule.designatedAmt = n;
      rule.nonDesignatedAmt = n;
      rule.designated = 0;
      rule.nonDesignated = 0;
    } else {
      rule.designated = n;
      rule.nonDesignated = n;
      rule.designatedAmt = 0;
      rule.nonDesignatedAmt = 0;
    }
    ITEM_COMM_PAY_DEFS.forEach(function (def) {
      var block = defaultItemCommPayBlock();
      if (mode === 'amount') {
        block.designatedAmt = n;
        block.nonDesignatedAmt = n;
        block.designated = 0;
        block.nonDesignated = 0;
      } else {
        block.designated = n;
        block.nonDesignated = n;
      }
      rule.payTypes[def.key] = block;
    });
    return mergeItemCommRule(rule);
  }
  function defaultCategoryDefaults() {
    return {
      labor: ruleFromFlatPct(10, 'pct'),
      sales: ruleFromFlatPct(8, 'pct'),
      issue: ruleFromFlatPct(5, 'pct'),
      card: ruleFromFlatPct(3, 'pct'),
    };
  }
  function ensureCategoryDefaults(sch) {
    if (!sch) return sch;
    var base = defaultCategoryDefaults();
    var src = sch.categoryDefaults && typeof sch.categoryDefaults === 'object' ? sch.categoryDefaults : {};
    sch.categoryDefaults = {};
    ITEM_COMM_CAT_DEFS.forEach(function (def) {
      sch.categoryDefaults[def.key] = mergeItemCommRule(src[def.key] || base[def.key]);
      sch.categoryDefaults[def.key].byPayType = !!sch.categoryDefaults[def.key].byPayType;
    });
    return sch;
  }
  function migrateSingleSchemeToItem(sch) {
    if (!sch || sch.type !== 'single') return sch;
    sch.type = 'item';
    if (!Array.isArray(sch.items)) sch.items = [];
    sch.categoryDefaults = {
      labor: ruleFromFlatPct(sch.laborPct, sch.laborMode),
      sales: ruleFromFlatPct(sch.salesPct, sch.salesMode),
      issue: ruleFromFlatPct(sch.issuePct != null ? sch.issuePct : sch.cardPct, sch.issueMode || sch.cardMode),
      card: ruleFromFlatPct(sch.cardPct, sch.cardMode),
    };
    return ensureItemScheme(sch);
  }
  function ensureAllCommSchemes() {
    var list = window.EmployeeStore && window.EmployeeStore.schemes;
    if (!list) return;
    list.forEach(function (sch) {
      if (sch.type === 'single') migrateSingleSchemeToItem(sch);
      else if (sch.type === 'item') ensureItemScheme(sch);
      else if (sch.type === 'ladder') ensureLadderScheme(sch);
    });
  }
  function mergeItemCommRule(src) {
    var base = defaultItemCommRule();
    if (!src || typeof src !== 'object') return base;
    base.valueMode = normalizeCommMode(src.valueMode);
    base.designated = Number(src.designated); if (!Number.isFinite(base.designated)) base.designated = 10;
    base.nonDesignated = Number(src.nonDesignated); if (!Number.isFinite(base.nonDesignated)) base.nonDesignated = 8;
    base.designatedAmt = Number(src.designatedAmt); if (!Number.isFinite(base.designatedAmt)) base.designatedAmt = 0;
    base.nonDesignatedAmt = Number(src.nonDesignatedAmt); if (!Number.isFinite(base.nonDesignatedAmt)) base.nonDesignatedAmt = 0;
    base.byPayType = !!src.byPayType;
    base.payTypes = base.payTypes || {};
    ITEM_COMM_PAY_DEFS.forEach(function (def) {
      var p = (src.payTypes && src.payTypes[def.key]) || {};
      var block = defaultItemCommPayBlock();
      block.designated = Number(p.designated); if (!Number.isFinite(block.designated)) block.designated = base.designated;
      block.nonDesignated = Number(p.nonDesignated); if (!Number.isFinite(block.nonDesignated)) block.nonDesignated = base.nonDesignated;
      block.designatedAmt = Number(p.designatedAmt); if (!Number.isFinite(block.designatedAmt)) block.designatedAmt = base.designatedAmt;
      block.nonDesignatedAmt = Number(p.nonDesignatedAmt); if (!Number.isFinite(block.nonDesignatedAmt)) block.nonDesignatedAmt = base.nonDesignatedAmt;
      base.payTypes[def.key] = block;
    });
    return base;
  }
  function ensureItemScheme(sch) {
    if (!sch) return sch;
    if (!Array.isArray(sch.items)) sch.items = [];
    sch.items = sch.items.map(function (it) {
      var rule = mergeItemCommRule(it);
      return Object.assign({}, rule, {
        kind: it.kind === 'product' ? 'product' : (it.kind === 'card' ? 'card' : 'project'),
        refId: it.refId || it.id,
        groupId: it.groupId || null,
        name: it.name || '',
      });
    });
    if (sch.categoryDefaultsEnabled == null) sch.categoryDefaultsEnabled = true;
    if (sch.itemOverridesEnabled == null) sch.itemOverridesEnabled = true;
    ensureCategoryDefaults(sch);
    return sch;
  }
  function syncItemSecSwitches(sch) {
    if (!sch) return;
    ensureItemScheme(sch);
    var catOn = sch.categoryDefaultsEnabled !== false;
    var ovOn = sch.itemOverridesEnabled !== false;
    var catSw = $('empItemCatEnabled');
    var ovSw = $('empItemOverrideEnabled');
    var catSec = $('empItemSecCatBlock');
    var ovSec = $('empItemSecOverrideBlock');
    if (catSw) {
      catSw.classList.toggle('on', catOn);
      catSw.setAttribute('aria-pressed', catOn ? 'true' : 'false');
    }
    if (ovSw) {
      ovSw.classList.toggle('on', ovOn);
      ovSw.setAttribute('aria-pressed', ovOn ? 'true' : 'false');
    }
    if (catSec) catSec.classList.toggle('is-disabled', !catOn);
    if (ovSec) ovSec.classList.toggle('is-disabled', !ovOn);
  }
  function formatItemCommPairShort(des, non, isAmt) {
    if (isAmt) return '点客 ¥' + des + ' · 散客 ¥' + non;
    return '点客 ' + des + '% · 散客 ' + non + '%';
  }
  function formatItemCommRuleShort(rule) {
    rule = mergeItemCommRule(rule);
    var isAmt = rule.valueMode === 'amount';
    if (rule.byPayType) {
      return ITEM_COMM_PAY_DEFS.map(function (def) {
        var block = (rule.payTypes && rule.payTypes[def.key]) || defaultItemCommPayBlock();
        var des = isAmt ? (Number(block.designatedAmt) || 0) : (Number(block.designated) || 0);
        var non = isAmt ? (Number(block.nonDesignatedAmt) || 0) : (Number(block.nonDesignated) || 0);
        return def.label + ' ' + formatItemCommPairShort(des, non, isAmt);
      }).join('；');
    }
    if (isAmt) {
      return formatItemCommPairShort(rule.designatedAmt, rule.nonDesignatedAmt, true);
    }
    return formatItemCommPairShort(rule.designated, rule.nonDesignated, false);
  }
  function renderItemCommByPaySummaryHtml(rule) {
    rule = mergeItemCommRule(rule);
    var isAmt = rule.valueMode === 'amount';
    return '<div class="emp-item-comm-pay-sum" aria-label="区分消费类型摘要">' +
      ITEM_COMM_PAY_DEFS.map(function (def) {
        var block = (rule.payTypes && rule.payTypes[def.key]) || defaultItemCommPayBlock();
        var des = isAmt ? (Number(block.designatedAmt) || 0) : (Number(block.designated) || 0);
        var non = isAmt ? (Number(block.nonDesignatedAmt) || 0) : (Number(block.nonDesignated) || 0);
        return '<div class="emp-item-comm-pay-sum__row">' +
          '<span class="emp-item-comm-pay-sum__name">' + esc(def.label) + '</span>' +
          '<span class="emp-item-comm-pay-sum__val">' + esc(formatItemCommPairShort(des, non, isAmt)) + '</span>' +
          '</div>';
      }).join('') +
      '</div>';
  }
  function resolveItemCommMeta(kind, refId) {
    var items = getScopeCatalogItems(kind === 'product' ? 'product' : (kind === 'card' ? 'card' : 'project'));
    var hit = items.find(function (it) { return it.id === refId; });
    var groupId = null;
    if (kind !== 'card') {
      var groups = getScopeGroups(kind);
      for (var i = 0; i < groups.length; i++) {
        if ((groups[i].itemIds || []).indexOf(refId) >= 0) { groupId = groups[i].id; break; }
      }
    }
    return {
      name: hit ? hit.name : (refId || '未命名'),
      sub: hit ? hit.sub : '',
      groupId: groupId,
    };
  }
  function kindLabel(kind) {
    return kind === 'product' ? '产品' : (kind === 'card' ? '会员卡' : '项目');
  }
  function renderCommTwinCapsHtml(rule) {
    rule = mergeItemCommRule(rule);
    if (rule.byPayType) {
      return renderItemCommByPaySummaryHtml(rule);
    }
    var isAmt = rule.valueMode === 'amount';
    var des = isAmt ? (Number(rule.designatedAmt) || 0) : (Number(rule.designated) || 0);
    var non = isAmt ? (Number(rule.nonDesignatedAmt) || 0) : (Number(rule.nonDesignated) || 0);
    var desVal = isAmt ? ('¥' + des) : (des + '<em>%</em>');
    var nonVal = isAmt ? ('¥' + non) : (non + '<em>%</em>');
    return '<div class="emp-ach-twins"><div class="emp-ach-twins__pair">' +
      '<span class="emp-ach-cap emp-ach-cap--des emp-ach-cap--static" aria-hidden="true">' +
      '<span class="emp-ach-cap__label">点客</span>' +
      '<span class="emp-ach-cap__val">' + desVal + '</span></span>' +
      '<span class="emp-ach-cap emp-ach-cap--non emp-ach-cap--static" aria-hidden="true">' +
      '<span class="emp-ach-cap__label">散客</span>' +
      '<span class="emp-ach-cap__val">' + nonVal + '</span></span>' +
      '</div></div>';
  }
  function renderItemCatDefaults(sch) {
    var root = $('empItemCatDefaults');
    if (!root) return;
    ensureItemScheme(sch);
    var shortName = { labor: '项目', sales: '产品', issue: '办卡', card: '充卡' };
    root.innerHTML = '<div class="emp-ach-income-cards emp-ach-income-cards--4">' +
      ITEM_COMM_CAT_DEFS.map(function (def) {
        var rule = sch.categoryDefaults[def.key] || defaultItemCommRule();
        var title = shortName[def.key] || def.label;
        var infoBtn = def.key === 'card'
          ? '<button type="button" class="emp-ladder-info-btn" data-item-cat-info="card" aria-label="充卡说明">?</button>'
          : '';
        return '<div class="emp-ach-income-card" data-item-cat-key="' + esc(def.key) + '" role="button" tabindex="0" aria-label="' + esc(def.label) + '">' +
          '<span class="emp-ach-income-card__label">' +
          '<span class="emp-ach-income-card__label-main"><span>' + esc(title) + '</span>' + infoBtn + '</span>' +
          navChevHtml() + '</span>' +
          renderCommTwinCapsHtml(rule) +
          '</div>';
      }).join('') +
      '</div>';
  }
  function renderItemCommList(sch) {
    var root = $('empItemCommList');
    if (!root) return;
    ensureItemScheme(sch);
    if (!sch.items.length) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = sch.items.map(function (it, idx) {
      var meta = resolveItemCommMeta(it.kind, it.refId);
      var name = it.name || meta.name;
      return '<div class="emp-item-row" data-item-comm-idx="' + idx + '">' +
        '<button type="button" class="emp-item-row__main" data-item-comm-edit="' + idx + '">' +
        '<span class="emp-item-row__text">' +
        '<span class="emp-item-row__name">' + esc(name) + '<span style="color:var(--text-sec);font-weight:400;margin-left:6px;font-size:12px;">' + esc(kindLabel(it.kind)) + '</span></span>' +
        '<span class="emp-item-row__sub">' + esc(formatItemCommRuleShort(it)) + '</span></span>' +
        navChevHtml() + '</button>' +
        '<button type="button" class="emp-item-row__del" data-item-comm-del="' + idx + '" aria-label="移除">×</button></div>';
    }).join('');
  }
  function openItemCommEditor(id) {
    var sch = schemeById(id);
    if (!sch) return;
    if (sch.type === 'single') migrateSingleSchemeToItem(sch);
    if (sch.type !== 'item') return;
    ensureItemScheme(sch);
    state.editingSchemeId = id;
    $('empCommItemTitle').textContent = sch.name;
    syncItemSecSwitches(sch);
    renderItemCatDefaults(sch);
    renderItemCommList(sch);
    showScreen('screen-emp-comm-item');
    nav('staff-comm-item');
  }
  function syncItemCommEditFoot() {
    var copyBtn = $('empItemCommEditSaveCopy');
    var isCat = !!(state.itemCommEdit && state.itemCommEdit.catKey);
    if (copyBtn) copyBtn.classList.toggle('hidden', isCat);
  }
  function openItemCatDefaultEditor(catKey) {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || sch.type !== 'item') return;
    ensureItemScheme(sch);
    var def = ITEM_COMM_CAT_DEFS.find(function (d) { return d.key === catKey; });
    if (!def) return;
    state.itemCommEdit = {
      idx: null,
      catKey: catKey,
      rule: mergeItemCommRule(sch.categoryDefaults[catKey]),
      kind: 'category',
      refId: null,
      groupId: null,
    };
    if (catKey === 'card') {
      $('empItemCommEditTitle').innerHTML = esc(def.label) + ' · 分类默认' +
        '<button type="button" class="emp-ladder-info-btn" data-item-cat-info="card" aria-label="充卡说明">?</button>';
    } else {
      $('empItemCommEditTitle').textContent = def.label + ' · 分类默认';
    }
    $('empItemCommEditBody').innerHTML = renderItemCommEditBody();
    syncItemCommEditFoot();
    openMask('empItemCommEditMask');
  }
  function itemCommFieldHtml(prefix, rule, isAmt, muted) {
    rule = mergeItemCommRule(rule);
    var desKey = isAmt ? 'designatedAmt' : 'designated';
    var nonKey = isAmt ? 'nonDesignatedAmt' : 'nonDesignated';
    var desVal = isAmt ? rule.designatedAmt : rule.designated;
    var nonVal = isAmt ? rule.nonDesignatedAmt : rule.nonDesignated;
    var mode = isAmt ? 'amount' : 'pct';
    var desLbl = isAmt ? '点客金额' : '点客比例';
    var nonLbl = isAmt ? '散客金额' : '散客比例';
    var disAttr = muted ? ' readonly tabindex="-1" aria-disabled="true"' : '';
    return '<div class="emp-item-comm-twins" role="group" aria-label="点客与散客">' +
      '<div class="emp-item-comm-cap emp-item-comm-cap--des">' +
      '<span class="emp-item-comm-cap__label">' + esc(desLbl) + '</span>' +
      '<div class="emp-item-comm-cap__field">' +
      (isAmt ? '<span class="emp-item-comm-cap__unit">¥</span>' : '') +
      '<input class="emp-comm-num" type="text" data-item-field="' + prefix + desKey + '" value="' + esc(formatCommInputDisplay(desVal, mode)) + '" placeholder="请输入" inputmode="decimal" data-comm-num-mode="' + mode + '" autocomplete="off" aria-label="' + esc(desLbl) + '"' + disAttr + ' />' +
      (isAmt ? '' : '<span class="emp-item-comm-cap__unit">%</span>') +
      '</div></div>' +
      '<div class="emp-item-comm-cap emp-item-comm-cap--non">' +
      '<span class="emp-item-comm-cap__label">' + esc(nonLbl) + '</span>' +
      '<div class="emp-item-comm-cap__field">' +
      (isAmt ? '<span class="emp-item-comm-cap__unit">¥</span>' : '') +
      '<input class="emp-comm-num" type="text" data-item-field="' + prefix + nonKey + '" value="' + esc(formatCommInputDisplay(nonVal, mode)) + '" placeholder="请输入" inputmode="decimal" data-comm-num-mode="' + mode + '" autocomplete="off" aria-label="' + esc(nonLbl) + '"' + disAttr + ' />' +
      (isAmt ? '' : '<span class="emp-item-comm-cap__unit">%</span>') +
      '</div></div>' +
      '</div>';
  }
  function renderItemCommEditBody() {
    var edit = state.itemCommEdit;
    if (!edit) return '';
    var rule = mergeItemCommRule(edit.rule);
    var isAmt = rule.valueMode === 'amount';
    var html = '';
    html += '<div class="emp-ach-edit-section"><div class="emp-ach-edit-section__title">提成取值</div>' +
      '<div class="emp-ach-edit-chips" role="radiogroup" aria-label="提成取值">' +
      '<button type="button" class="emp-ach-edit-chip' + (!isAmt ? ' on' : '') + '" data-item-value-mode="pct">按比例 %</button>' +
      '<button type="button" class="emp-ach-edit-chip' + (isAmt ? ' on' : '') + '" data-item-value-mode="amount">固定金额 ¥</button>' +
      '</div></div>';
    html += '<div class="emp-ach-edit-fields emp-ach-edit-fields--twins' + (rule.byPayType ? ' is-muted' : '') +
      '" id="empItemCommBaseFields"' + (rule.byPayType ? ' aria-disabled="true"' : '') + '>' +
      itemCommFieldHtml('base.', rule, isAmt, !!rule.byPayType) + '</div>';
    html += '<div class="emp-item-comm-switch-row"><span class="emp-item-comm-switch-row__lbl">区分消费类型</span>' +
      '<button type="button" class="switch' + (rule.byPayType ? ' on' : '') + '" id="empItemByPayTypeSwitch" aria-pressed="' + (rule.byPayType ? 'true' : 'false') + '" aria-label="区分消费类型"></button></div>';
    html += '<div class="emp-item-comm-pay' + (rule.byPayType ? '' : ' hidden') + '" id="empItemPayTypeBlocks">';
    ITEM_COMM_PAY_DEFS.forEach(function (def) {
      var block = rule.payTypes[def.key] || defaultItemCommPayBlock();
      html += '<div class="emp-item-comm-pay__title">' + esc(def.label) + '</div>' +
        '<div class="emp-ach-edit-fields emp-ach-edit-fields--twins">' + itemCommFieldHtml('pay.' + def.key + '.', Object.assign({}, rule, block), isAmt, false) + '</div>';
    });
    html += '</div>';
    return html;
  }
  function readItemCommEditFromDom() {
    var edit = state.itemCommEdit;
    if (!edit) return { error: '无编辑数据' };
    var rule = mergeItemCommRule(edit.rule);
    var mode = normalizeCommMode(rule.valueMode);
    function readPair(prefix) {
      var desEl = document.querySelector('#empItemCommEditBody [data-item-field="' + prefix + (mode === 'amount' ? 'designatedAmt' : 'designated') + '"]');
      var nonEl = document.querySelector('#empItemCommEditBody [data-item-field="' + prefix + (mode === 'amount' ? 'nonDesignatedAmt' : 'nonDesignated') + '"]');
      var des = parseCommInputValue(desEl && desEl.value);
      var non = parseCommInputValue(nonEl && nonEl.value);
      if (!Number.isFinite(des) || des < 0) return { error: '请输入有效的点客' + (mode === 'amount' ? '金额' : '比例') };
      if (!Number.isFinite(non) || non < 0) return { error: '请输入有效的散客' + (mode === 'amount' ? '金额' : '比例') };
      if (mode === 'pct' && (des > 100 || non > 100)) return { error: '比例需在 0–100%' };
      return { des: des, non: non };
    }
    var base = readPair('base.');
    if (base.error) return base;
    if (mode === 'amount') {
      rule.designatedAmt = base.des;
      rule.nonDesignatedAmt = base.non;
    } else {
      rule.designated = base.des;
      rule.nonDesignated = base.non;
    }
    rule.byPayType = !!rule.byPayType;
    if (rule.byPayType) {
      for (var i = 0; i < ITEM_COMM_PAY_DEFS.length; i++) {
        var key = ITEM_COMM_PAY_DEFS[i].key;
        var pair = readPair('pay.' + key + '.');
        if (pair.error) return { error: ITEM_COMM_PAY_DEFS[i].label + '：' + pair.error };
        if (!rule.payTypes[key]) rule.payTypes[key] = defaultItemCommPayBlock();
        if (mode === 'amount') {
          rule.payTypes[key].designatedAmt = pair.des;
          rule.payTypes[key].nonDesignatedAmt = pair.non;
        } else {
          rule.payTypes[key].designated = pair.des;
          rule.payTypes[key].nonDesignated = pair.non;
        }
      }
    }
    rule.valueMode = mode;
    return { rule: rule };
  }
  function openItemCommRuleEditor(idx) {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || sch.type !== 'item') return;
    ensureItemScheme(sch);
    var it = sch.items[idx];
    if (!it) return;
    var meta = resolveItemCommMeta(it.kind, it.refId);
    state.itemCommEdit = {
      idx: idx,
      catKey: null,
      rule: mergeItemCommRule(it),
      kind: it.kind,
      refId: it.refId,
      groupId: it.groupId || meta.groupId,
    };
    $('empItemCommEditTitle').textContent = (it.name || meta.name) + ' · 提成';
    $('empItemCommEditBody').innerHTML = renderItemCommEditBody();
    syncItemCommEditFoot();
    openMask('empItemCommEditMask');
  }
  function saveItemCommEdit(copyToGroup) {
    var parsed = readItemCommEditFromDom();
    if (parsed.error) { toast(parsed.error, true); return; }
    var sch = schemeById(state.editingSchemeId);
    if (!sch || !state.itemCommEdit) return;
    ensureItemScheme(sch);
    if (state.itemCommEdit.catKey) {
      sch.categoryDefaults[state.itemCommEdit.catKey] = mergeItemCommRule(parsed.rule);
      closeMask('empItemCommEditMask');
      state.itemCommEdit = null;
      renderItemCatDefaults(sch);
      toast('分类默认已保存');
      return;
    }
    var idx = state.itemCommEdit.idx;
    var it = sch.items[idx];
    if (!it) return;
    Object.assign(it, parsed.rule);
    var copied = 0;
    if (copyToGroup) {
      var gid = it.groupId || state.itemCommEdit.groupId;
      sch.items.forEach(function (other, i) {
        if (i === idx) return;
        if (other.kind !== it.kind) return;
        if (it.kind === 'card') {
          Object.assign(other, mergeItemCommRule(parsed.rule));
          copied += 1;
          return;
        }
        var otherMeta = resolveItemCommMeta(other.kind, other.refId);
        var otherGid = other.groupId || otherMeta.groupId;
        if (gid && otherGid === gid) {
          Object.assign(other, mergeItemCommRule(parsed.rule));
          copied += 1;
        }
      });
    }
    closeMask('empItemCommEditMask');
    state.itemCommEdit = null;
    renderItemCommList(sch);
    invalidateCommLineCache();
    if (copyToGroup) toast(copied ? ('已保存并复制到本组 ' + copied + ' 项') : '已保存（本组暂无其他项）');
    else toast('已保存');
  }
  function openItemSchemePick() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || sch.type !== 'item') return;
    ensureItemScheme(sch);
    state.scopePurpose = 'item';
    state.scopeDraft = {
      mode: 'custom',
      projectIds: sch.items.filter(function (it) { return it.kind === 'project'; }).map(function (it) { return it.refId; }),
      productIds: sch.items.filter(function (it) { return it.kind === 'product'; }).map(function (it) { return it.refId; }),
      cardIds: sch.items.filter(function (it) { return it.kind === 'card'; }).map(function (it) { return it.refId; }),
    };
    state.scopeBaseline = JSON.stringify(state.scopeDraft);
    state.scopeType = 'project';
    state.scopeGroupId = 'all';
    var title = document.querySelector('#screen-emp-comm-scope .title');
    if (title) title.textContent = '添加提成项目';
    var allCard = document.querySelector('#screen-emp-comm-scope .emp-scope-all-card');
    if (allCard) allCard.classList.add('hidden');
    renderScopeScreen();
    syncScopeAllToggleUi();
    var custom = $('empScopeCustom');
    if (custom) custom.classList.remove('is-disabled');
    showScreen('screen-emp-comm-scope');
    nav('staff-comm-item-pick');
  }
  function applyItemPickDraftToScheme() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || !state.scopeDraft) return false;
    ensureItemScheme(sch);
    var draft = state.scopeDraft;
    var prevMap = {};
    sch.items.forEach(function (it) { prevMap[it.kind + ':' + it.refId] = it; });
    var next = [];
    function pushKind(kind, ids) {
      (ids || []).forEach(function (id) {
        var key = kind + ':' + id;
        if (prevMap[key]) {
          next.push(prevMap[key]);
          return;
        }
        var meta = resolveItemCommMeta(kind, id);
        next.push(Object.assign(defaultItemCommRule(), {
          kind: kind,
          refId: id,
          groupId: meta.groupId,
          name: meta.name,
        }));
      });
    }
    pushKind('project', draft.projectIds);
    pushKind('product', draft.productIds);
    pushKind('card', draft.cardIds);
    sch.items = next;
    return true;
  }

  function createCommSchemeAndOpen(type, name) {
    var id = 'sch' + Date.now();
    if (type !== 'ladder' && type !== 'item') type = 'item';
    var sch = { id: id, name: name, type: type, assigned: [] };
    if (type === 'item') {
      sch.items = [];
      sch.categoryDefaults = defaultCategoryDefaults();
      sch.categoryDefaultsEnabled = true;
      sch.itemOverridesEnabled = true;
    } else {
      sch.ladder = [
        { min: 0, max: 10000, pct: 8, mode: 'pct' },
        { min: 10000, max: 30000, pct: 12, mode: 'pct' },
        { min: 30000, max: null, pct: 15, mode: 'pct' },
      ];
      sch.ladderCalcMode = 'top';
      sch.ladderPayTypes = { cash: true, memberCard: true, groupBuy: true };
      sch.scopeMode = 'all';
      sch.scope = { projectIds: [], productIds: [], cardIds: [] };
    }
    window.EmployeeStore.schemes.push(sch);
    state.editingSchemeId = id;
    state.schemeDraftType = null;
    state.schemeDraftName = '';
    openCommEditor(id);
    renderCommList();
    return sch;
  }

  function openCreateSchemeTypeDialog() {
    state.schemeDraftName = '';
    state.schemeDraftType = null;
    state.editingSchemeId = null;
    openEmpDialog('empSchemeTypeMask');
  }

  function openCommEditor(id) {
    var sch = schemeById(id);
    if (!sch) return;
    if (sch.type === 'single') migrateSingleSchemeToItem(sch);
    state.editingSchemeId = id;
    if (sch.type === 'ladder') {
      ensureLadderScheme(sch);
      if (!sch.ladder || !sch.ladder.length) {
        sch.ladder = [
          { min: 0, max: 10000, pct: 8, mode: 'pct' },
          { min: 10000, max: 30000, pct: 12, mode: 'pct' },
          { min: 30000, max: null, pct: 15, mode: 'pct' },
        ];
      }
      state.ladderExpandIdx = null;
      state.ladderSettingsCollapsed = true;
      state.ladderFlashIdx = null;
      $('empCommLadderTitle').textContent = sch.name;
      renderLadderSettings(sch);
      renderLadder(sch);
      flashLadderFoldHintOnce();
      var scopeEntry = $('empLadderScopeEntry');
      if (scopeEntry) scopeEntry.innerHTML = scopeSummaryHtml(sch);
      showScreen('screen-emp-comm-ladder');
      nav('staff-comm-ladder');
      return;
    }
    openItemCommEditor(id);
  }

  function fmtLadderAxis(n) {
    if (n == null || n === '') return '及以上';
    var v = Number(n);
    if (!Number.isFinite(v)) return '—';
    if (v === 0) return '0';
    if (Math.abs(v) >= 10000) {
      var w = v / 10000;
      if (Math.abs(w - Math.round(w)) < 1e-6) return String(Math.round(w)) + '万';
      return (Math.round(w * 10) / 10) + '万';
    }
    return String(Math.round(v));
  }

  function ladderTierWeight(tier) {
    var mode = normalizeCommMode(tier && tier.mode);
    var v = Number(tier && tier.pct);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (mode === 'pct') return Math.min(100, v);
    return Math.min(100, Math.max(8, v / 50));
  }

  function ladderTierHeights(tiers) {
    var editing = state.ladderExpandIdx != null;
    var minH = editing ? 32 : 40;
    var spanH = editing ? 40 : 56;
    var weights = (tiers || []).map(ladderTierWeight);
    var maxW = Math.max.apply(null, weights.concat([1]));
    return weights.map(function (w) {
      return Math.round(minH + (w / maxW) * spanH);
    });
  }

  function ladderMidDemoAmount(sch) {
    var tiers = sch && sch.ladder ? sch.ladder : [];
    if (!tiers.length) return 15000;
    var midIdx = Math.max(0, Math.ceil(tiers.length / 2) - 1);
    var t = tiers[midIdx];
    var min = Number(t.min) || 0;
    if (t.max != null && Number.isFinite(Number(t.max)) && Number(t.max) > min) {
      return Math.round((min + Number(t.max)) / 2);
    }
    var prev = midIdx > 0 ? tiers[midIdx - 1] : null;
    var prevSpan = 10000;
    if (prev && prev.max != null && Number.isFinite(Number(prev.max))) {
      prevSpan = Math.max(1000, Number(prev.max) - (Number(prev.min) || 0));
    }
    return Math.round(min + prevSpan / 2);
  }

  function ladderDemoHitIndex(sch, demoAmt) {
    var demo = demoAmt != null ? Number(demoAmt) : ladderMidDemoAmount(sch);
    var tiers = sch && sch.ladder ? sch.ladder : [];
    if (!tiers.length) return -1;
    for (var i = 0; i < tiers.length; i++) {
      var min = Number(tiers[i].min) || 0;
      var max = tiers[i].max == null ? Infinity : Number(tiers[i].max);
      if (!(max > min)) max = Infinity;
      if (demo >= min && demo < max) return i;
      if (tiers[i].max == null && demo >= min) return i;
    }
    return tiers.length - 1;
  }

  function fmtLadderRangeLabel(tier) {
    var minLbl = fmtLadderAxis(tier.min || 0);
    if (tier.max == null) return minLbl + '及以上';
    return minLbl + '–' + fmtLadderAxis(tier.max);
  }

  function ladderTierFlex(tiers) {
    var spans = (tiers || []).map(function (t) {
      if (t.max == null) return null;
      var span = Number(t.max) - Number(t.min);
      return Number.isFinite(span) && span > 0 ? span : 1;
    });
    var finite = spans.filter(function (s) { return s != null; });
    var avg = finite.length ? finite.reduce(function (a, b) { return a + b; }, 0) / finite.length : 10000;
    var norms = spans.map(function (s) { return s == null ? avg : s; });
    var total = norms.reduce(function (a, b) { return a + b; }, 0) || 1;
    return norms.map(function (n) {
      return Math.max(0.18, n / total);
    });
  }

  function ladderTierRewardLabel(tier) {
    var mode = normalizeCommMode(tier && tier.mode);
    var v = Number(tier && tier.pct);
    if (!Number.isFinite(v)) v = 0;
    if (mode === 'amount') return '¥' + fmtMoney(v);
    return String(v) + '%';
  }

  function syncLadderLinkedMins(sch) {
    if (!sch || !sch.ladder) return;
    for (var s = 1; s < sch.ladder.length; s++) {
      var prevMax = sch.ladder[s - 1].max;
      if (prevMax != null && Number.isFinite(Number(prevMax))) {
        sch.ladder[s].min = Number(prevMax);
      }
    }
  }

  function flashLadderStep(idx) {
    state.ladderFlashIdx = idx;
    var step = document.querySelector('#empLadderStairs [data-ladder-step="' + idx + '"]');
    if (step) {
      step.classList.remove('is-flash');
      void step.offsetWidth;
      step.classList.add('is-flash');
    }
    setTimeout(function () {
      if (state.ladderFlashIdx === idx) state.ladderFlashIdx = null;
      var el = document.querySelector('#empLadderStairs [data-ladder-step="' + idx + '"]');
      if (el) el.classList.remove('is-flash');
    }, 480);
  }

  function renderLadderExpand(sch, i) {
    var expand = $('empLadderExpand');
    if (!expand) return;
    if (i == null || i < 0 || !sch.ladder || i >= sch.ladder.length) {
      expand.classList.add('hidden');
      expand.innerHTML = '';
      return;
    }
    var tier = sch.ladder[i];
    var maxVal = tier.max == null ? '' : tier.max;
    var mode = normalizeCommMode(tier.mode);
    var val = tier.pct != null ? tier.pct : 0;
    var pctDisp = rawCommInputDisplay(val);
    var amtDisp = rawCommInputDisplay(val);
    var minLinked = i > 0;
    expand.classList.remove('hidden');
    expand.innerHTML =
      '<div class="emp-ladder-expand__head">' +
      '<span class="emp-ladder-expand__title">第 ' + (i + 1) + ' 档</span>' +
      '<button type="button" class="emp-ladder-expand__done" data-ladder-expand-done>完成</button>' +
      '</div>' +
      '<div class="emp-ladder-block">' +
      '<div class="emp-ladder-block__title">业绩范围' + (minLinked ? '（下限自动衔接上一档）' : '') + '</div>' +
      '<div class="emp-ladder-well emp-ladder-bounds">' +
      '<input type="number" class="input-amount" data-ladder-min="' + i + '" value="' + (tier.min || 0) + '"' +
      (minLinked ? ' readonly' : '') +
      ' inputmode="decimal" aria-label="区间下限"' + (minLinked ? ' title="与上一档上限自动衔接"' : '') + ' />' +
      '<span class="emp-ladder-bounds-sep" aria-hidden="true">—</span>' +
      '<input type="number" class="input-amount" data-ladder-max="' + i + '" value="' + maxVal + '" placeholder="及以上" inputmode="decimal" aria-label="区间上限" />' +
      '</div></div>' +
      '<div class="emp-ladder-block">' +
      '<div class="emp-ladder-block__title">提成方式</div>' +
      '<div class="emp-ladder-mode-seg" role="radiogroup" aria-label="第' + (i + 1) + '档提成方式">' +
      '<button type="button" class="emp-ladder-mode-seg__btn' + (mode === 'pct' ? ' on' : '') +
      '" data-ladder-mode="' + i + '" data-ladder-mode-val="pct" aria-pressed="' + (mode === 'pct' ? 'true' : 'false') + '">按比例</button>' +
      '<button type="button" class="emp-ladder-mode-seg__btn' + (mode === 'amount' ? ' on' : '') +
      '" data-ladder-mode="' + i + '" data-ladder-mode-val="amount" aria-pressed="' + (mode === 'amount' ? 'true' : 'false') + '">固定金额</button>' +
      '</div></div>' +
      '<div class="emp-ladder-block">' +
      '<div class="emp-ladder-well emp-ladder-reward' + (mode === 'pct' ? '' : ' hidden') + '" data-ladder-input="pct" data-ladder-idx="' + i + '">' +
      '<span class="emp-ladder-reward__lbl">提成比例</span>' +
      '<div class="emp-ladder-reward__field">' +
      '<input class="emp-comm-num" type="text" data-ladder-pct="' + i + '" data-comm-num-mode="pct" data-comm-num-bare="1" value="' + esc(pctDisp) + '" placeholder="请输入" inputmode="decimal" autocomplete="off" aria-label="提成比例" />' +
      '<span class="emp-ladder-reward__unit">%</span>' +
      '</div></div>' +
      '<div class="emp-ladder-well emp-ladder-reward' + (mode === 'amount' ? '' : ' hidden') + '" data-ladder-input="amount" data-ladder-idx="' + i + '">' +
      '<span class="emp-ladder-reward__lbl">提成金额</span>' +
      '<div class="emp-ladder-reward__field">' +
      '<input class="emp-comm-num" type="text" data-ladder-amt="' + i + '" data-comm-num-mode="amount" data-comm-num-bare="1" value="' + esc(amtDisp) + '" placeholder="请输入" inputmode="decimal" autocomplete="off" aria-label="提成金额" />' +
      '<span class="emp-ladder-reward__unit">¥</span>' +
      '</div></div>' +
      '</div>';
    if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs(expand);
  }

  function renderLadderStairs(sch) {
    var stairs = $('empLadderStairs');
    var demoEl = $('empLadderModeDemo');
    if (!stairs || !sch.ladder) return;
    ensureLadderScheme(sch);
    var tiers = sch.ladder;
    var heights = ladderTierHeights(tiers);
    var flexes = ladderTierFlex(tiers);
    var expandIdx = state.ladderExpandIdx;
    var progressive = sch.ladderCalcMode === 'progressive';
    var demoAmt = ladderMidDemoAmount(sch);
    var hitIdx = ladderDemoHitIndex(sch, demoAmt);
    var delSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
    stairs.innerHTML = tiers.map(function (tier, i) {
      var open = tier.max == null;
      var on = expandIdx === i;
      var flash = state.ladderFlashIdx === i;
      var reward = ladderTierRewardLabel(tier);
      var canDel = tiers.length > 1;
      var rangeLbl = fmtLadderRangeLabel(tier);
      var cls = 'emp-ladder-step' +
        (on ? ' is-on' : '') +
        (open ? ' is-open' : '') +
        (flash ? ' is-flash' : '');
      return '<div class="' + cls + '" data-ladder-step="' + i + '" role="listitem" style="flex:' + flexes[i].toFixed(3) + ' 1 0;">' +
        '<span class="emp-ladder-step__range">' + esc(rangeLbl) + '</span>' +
        (canDel ? '<button type="button" class="emp-ladder-step__del" data-ladder-del="' + i + '" aria-label="删除第' + (i + 1) + '档">' + delSvg + '</button>' : '') +
        '<button type="button" class="emp-ladder-step__bar" data-ladder-step-tap="' + i + '" aria-label="第' + (i + 1) + '档 ' + esc(reward) + ' ' + esc(rangeLbl) + '" style="height:' + heights[i] + 'px;">' +
        '<span class="emp-ladder-step__val">' + esc(reward) + '</span>' +
        '<span class="emp-ladder-step__lbl">第' + (i + 1) + '档</span>' +
        '</button></div>';
    }).join('');
    if (demoEl) {
      var segs = tiers.map(function (tier, i) {
        var active = progressive ? (hitIdx >= 0 && i <= hitIdx) : (i === hitIdx);
        return '<span class="emp-ladder-mode-demo__seg' + (active ? ' is-active' : ' is-muted') +
          '" style="flex:' + flexes[i].toFixed(3) + ' 1 0;" title="' + esc(fmtLadderRangeLabel(tier)) + '"></span>';
      }).join('');
      demoEl.className = 'emp-ladder-mode-demo' + (progressive ? ' is-progressive' : ' is-top');
      demoEl.innerHTML =
        '<div class="emp-ladder-mode-demo__head">' +
        '<span class="emp-ladder-mode-demo__title">计算方式示意</span>' +
        '<span class="emp-ladder-mode-demo__ex">例：业绩 ' + esc(fmtLadderAxis(demoAmt)) + '</span>' +
        '</div>' +
        '<div class="emp-ladder-mode-demo__track">' + segs + '</div>' +
        '<p class="emp-ladder-mode-demo__note">' +
        (progressive ? '每段不同档：各段分别计算后再加总' : '全额最高档：整笔按命中档计算') +
        '</p>';
    }
  }

  function renderLadder(sch) {
    if (!sch || !sch.ladder) return;
    syncLadderLinkedMins(sch);
    if (state.ladderExpandIdx != null && state.ladderExpandIdx >= sch.ladder.length) {
      state.ladderExpandIdx = sch.ladder.length ? sch.ladder.length - 1 : null;
    }
    renderLadderStairs(sch);
    renderLadderExpand(sch, state.ladderExpandIdx);
    syncLadderSettingsFold(sch);
  }

  function resetLadderTiers() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch) return;
    sch.ladder = [{ min: 0, max: 10000, pct: 1, mode: 'pct' }];
    state.ladderExpandIdx = 0;
    renderLadder(sch);
    flashLadderStep(0);
    toast('已重置为一档（业绩 0–10000，提成 1%）');
  }

  function commitLadderExpandFromDom() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || !sch.ladder) return null;
    var i = state.ladderExpandIdx;
    if (i == null || i < 0 || i >= sch.ladder.length) return sch.ladder;
    var minEl = document.querySelector('#empLadderExpand [data-ladder-min="' + i + '"]');
    var maxEl = document.querySelector('#empLadderExpand [data-ladder-max="' + i + '"]');
    var modeBtn = document.querySelector('#empLadderExpand [data-ladder-mode="' + i + '"].on');
    var mode = normalizeCommMode(modeBtn && modeBtn.dataset.ladderModeVal);
    var pctEl = mode === 'amount'
      ? document.querySelector('#empLadderExpand [data-ladder-amt="' + i + '"]')
      : document.querySelector('#empLadderExpand [data-ladder-pct="' + i + '"]');
    var min = parseFloat(minEl && minEl.value);
    var maxRaw = maxEl && maxEl.value;
    var max = maxRaw === '' || maxRaw == null ? null : parseFloat(maxRaw);
    var pct = parseCommInputValue(pctEl && pctEl.value);
    if (!Number.isFinite(min)) min = Number(sch.ladder[i].min) || 0;
    if (maxRaw !== '' && maxRaw != null && !Number.isFinite(max)) max = sch.ladder[i].max;
    if (!Number.isFinite(pct)) pct = Number(sch.ladder[i].pct) || 0;
    if (i > 0 && sch.ladder[i - 1].max != null) min = sch.ladder[i - 1].max;
    sch.ladder[i] = { min: min, max: max, pct: pct, mode: mode };
    syncLadderLinkedMins(sch);
    return sch.ladder;
  }

  function syncLadderLinkedMinsFromDom() {
    commitLadderExpandFromDom();
  }

  function readLadderDraftFromDom() {
    var sch = schemeById(state.editingSchemeId);
    if (!sch || !sch.ladder) return null;
    commitLadderExpandFromDom();
    return sch.ladder.map(function (t) {
      return {
        min: Number(t.min) || 0,
        max: t.max == null ? null : Number(t.max),
        pct: Number(t.pct) || 0,
        mode: normalizeCommMode(t.mode),
      };
    });
  }

  function validateLadderTiers(tiers) {
    if (!tiers || !tiers.length) return '请至少保留一档';
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (t.min < 0) return '区间金额不能为负';
      if (t.pct < 0) return '提成数值不能为负';
      if (normalizeCommMode(t.mode) === 'pct' && t.pct > 100) return '提成比例需在 0–100%';
      if (t.max != null && !(t.max > t.min)) return '第 ' + (i + 1) + ' 档上限须大于下限';
      if (i > 0) {
        var prev = tiers[i - 1];
        if (prev.max == null) return '仅末档可设为「及以上」';
        if (t.min !== prev.max) return '档位需连续：第 ' + (i + 1) + ' 档下限应等于上一档上限';
      }
    }
    return '';
  }
  function openAssignStaff(schemeId, returnScreen) {
    var sch = schemeById(schemeId);
    if (!sch) return;
    state.assignSchemeId = schemeId;
    state.assignReturnScreen = returnScreen || 'screen-emp-comm';
    state.assignSelected = {};
    (sch.assigned || []).forEach(function (id) { state.assignSelected[id] = true; });
    renderAssignList();
    showScreen('screen-emp-comm-assign');
    nav('staff-comm-assign');
  }

  function renderAssignList() {
    var root = $('empAssignList');
    var countEl = $('empAssignCount');
    if (!root) return;
    var list = storeActiveStaff();
    var selectedN = Object.keys(state.assignSelected).filter(function (k) { return state.assignSelected[k]; }).length;
    if (countEl) countEl.textContent = '已选 ' + selectedN + ' 人';
    root.innerHTML = list.map(function (s) {
      var on = !!state.assignSelected[s.id];
      return '<button type="button" class="emp-assign-card' + (on ? ' on' : '') + '" data-assign-id="' + s.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        empAvatarHtml(s) +
        '<span class="emp-assign-card__meta"><span class="emp-assign-card__name">' + esc(s.name) + '</span>' +
        '<span class="emp-assign-card__role">' + esc(s.role || '未设置职位') + '</span></span>' +
        '<span class="emp-assign-card__check" aria-hidden="true">' + (on ? checkSvg12() : '') + '</span></button>';
    }).join('') || '<div class="empty-cart" style="padding:32px 16px">暂无在岗员工</div>';
  }

  function applyAssignSelection() {
    var sch = schemeById(state.assignSchemeId);
    if (!sch) return;
    var ids = Object.keys(state.assignSelected).filter(function (k) { return state.assignSelected[k]; });
    /* 只改当前方案的 assigned；不把员工从其它方案踢出 */
    sch.assigned = ids;
    syncAllStaffSchemeFields();
    invalidateCommLineCache();
    toast(ids.length ? ('已更新分配 · ' + ids.length + ' 人') : '已清空本方案分配');
  }

  function getFreeOrderRule() {
    ensureAdvRules();
    var r = (window.EmployeeStore.advRules || []).find(function (x) { return x.label === '免单'; });
    return r ? r.value : '计算业绩和提成';
  }

  function renderMonthPicker() {
    var root = $('empMonthList');
    if (!root) return;
    syncSalaryPeriodToCycle();
    var head = document.querySelector('#empMonthMask .picker-head');
    if (head) head.textContent = ensurePayCycle().mode === 'custom' ? '选择结算期' : '选择月份';
    var months = [];
    var cur = state.salaryMonth;
    for (var i = -3; i <= 3; i++) months.push(shiftPeriod(cur, i));
    root.innerHTML = months.map(function (m) {
      var sub = ensurePayCycle().mode === 'custom'
        ? '<span class="emp-month-opt__sub">' + periodRangeText(m) + '</span>'
        : '';
      return '<button type="button" class="emp-month-opt' + (m === state.salaryMonth ? ' on' : '') +
        '" data-month="' + m + '"><span class="emp-month-opt__main">' + periodLabel(m) + '</span>' + sub + '</button>';
    }).join('');
  }

  function renderStatusPickerList(current) {
    var root = $('empStatusList');
    if (!root) return;
    var cur = current || '在岗';
    var opts = state.formMode === 'create'
      ? STATUSES.filter(function (o) { return o.value !== '离职'; })
      : STATUSES;
    root.innerHTML = opts.map(function (o) {
      return '<button type="button" class="emp-picker-opt' + (o.value === cur ? ' on' : '') +
        '" data-status-val="' + esc(o.value) + '">' + esc(o.label) + '</button>';
    }).join('');
  }

  function applyFormStatus(value) {
    $('empFStatus').textContent = value;
    $('empFStatus').classList.add('has-val');
  }

  function openLeaveConfirm(source) {
    state.leaveConfirmSource = source === 'detail' ? 'detail' : 'form';
    $('empLeaveConfirmMask')?.classList.add('show');
  }

  function closeLeaveConfirm() {
    $('empLeaveConfirmMask')?.classList.remove('show');
  }

  function statusToast(value) {
    if (value === '休假') return '已设为休假';
    if (value === '离职') return '已标记注销';
    return '已恢复在岗';
  }

  function applyStaffStatus(value) {
    var s = staffById(state.currentStaffId);
    if (!s) return;
    s.status = value;
    if (state.currentStaffId) renderStaffDetail(state.currentStaffId);
    renderStaffList();
    toast(statusToast(value));
  }

  function closeDetailStatusSheet() {
    closeMask('empDetailStatusMask');
  }

  function openDetailStatusSheet() {
    var s = staffById(state.currentStaffId);
    if (!s) return;
    var sub = $('empDetailStatusSub');
    if (sub) sub.textContent = s.name || '';
    var list = $('empDetailStatusList');
    if (!list) return;
    var cur = s.status || '在岗';
    var opts = [
      { value: '在岗', label: '设为在岗' },
      { value: '休假', label: '设为休假' },
    ];
    list.innerHTML = opts.map(function (o) {
      var cls = 'catalog-action-item' + (o.value === cur ? ' is-on' : '');
      return '<button type="button" class="' + cls + '" data-detail-status="' + esc(o.value) + '">' +
        esc(o.label) + (o.value === cur ? '<span style="margin-left:8px;font-size:12px;opacity:.65">当前</span>' : '') +
        '</button>';
    }).join('');
    openMask('empDetailStatusMask');
  }

  function handleDetailStatusPick(value) {
    closeDetailStatusSheet();
    var s = staffById(state.currentStaffId);
    if (!s) return;
    if (value === s.status) return;
    if (value !== '在岗' && value !== '休假') return;
    applyStaffStatus(value);
  }

  function renderPickerList(id, opts, current, attr) {
    var root = $(id);
    if (!root) return;
    root.innerHTML = opts.map(function (o) {
      return '<button type="button" class="emp-picker-opt' + (o === current ? ' on' : '') +
        '" data-' + attr + '="' + esc(o) + '">' + esc(o) + '</button>';
    }).join('');
  }

  function renderSchemePickList() {
    var root = $('empSchemePickList');
    if (!root) return;
    var curId = state.formSchemeId || '';
    var schemes = (window.Comm2Demo && typeof window.Comm2Demo.getSchemes === 'function')
      ? (window.Comm2Demo.getSchemes() || [])
      : (window.EmployeeStore.schemes || []);
    var rows = [{ id: '', name: '暂未分配', sub: '清空该员工全部方案绑定' }].concat(
      schemes.map(function (sch) {
        var n = (sch.assigneeIds || sch.assigned || []).length;
        return { id: sch.id, name: sch.name, sub: '已分配 ' + n + ' 人 · 可叠加' };
      })
    );
    root.innerHTML = rows.map(function (r) {
      return '<button type="button" class="emp-picker-opt' + (r.id === curId ? ' on' : '') +
        '" data-scheme-pick="' + esc(r.id) + '">' +
        '<span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0">' +
        '<span>' + esc(r.name) + '</span>' +
        (r.sub ? '<span style="font-size:12px;color:var(--text-sec);font-weight:400">' + esc(r.sub) + '</span>' : '') +
        '</span></button>';
    }).join('');
  }

  function applySchemePick(id) {
    if (!id) {
      state.formSchemeId = null;
      $('empFScheme').textContent = '暂未分配';
      $('empFScheme').classList.remove('has-val');
      return;
    }
    var sch = schemeById(id);
    if (!sch) return;
    state.formSchemeId = sch.id;
    var labels = [sch.name];
    if (state.currentStaffId && state.formMode !== 'create') {
      schemesAssignedToStaff(state.currentStaffId).forEach(function (s) {
        if (s.id !== sch.id) labels.push(s.name);
      });
    }
    $('empFScheme').textContent = labels.join('、');
    $('empFScheme').classList.add('has-val');
  }

  function openSchemePickSheet() {
    resetSchemePickSheetChrome();
    renderSchemePickList();
    var mask = $('empSchemePickMask');
    if (!mask) {
      toast('提成方案选择暂不可用', true);
      return;
    }
    mask.classList.add('open');
  }

  function openList() {
    closeAllEmpMasks();
    renderStaffList();
    showScreen('screen-emp-list');
    nav('staff-list');
  }

  function openSalary() {
    closeAllEmpMasks();
    syncStaffSchemeFromComm2();
    syncSalaryPeriodToCycle();
    renderSalaryList();
    showScreen('screen-emp-salary');
    nav('staff-salary');
  }

  /** 结算周期设置页：每月结算日 pie-chart-02 / 每月发薪日钱包图标 */
  function payCycleLabelIco(kind) {
    if (kind === 'settle') {
      return '<span class="emp-pay-cycle-day__ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4353 21.8825C16.4253 21.8825 20.4706 17.8372 20.4706 12.8471H11.4353L11.4353 3.81182C6.44527 3.81179 2.4 7.85706 2.4 12.8471C2.4 17.8372 6.44524 21.8825 11.4353 21.8825Z"/><path d="M15.3882 2.11754V8.80713H21.6V8.3293C21.6 4.89864 18.8189 2.11754 15.3882 2.11754Z"/></svg></span>';
    }
    var fill = kind === 'pay';
    var d = 'M7.72937 19.512C7.20498 19.6853 6.92036 20.2509 7.09367 20.7753C7.26697 21.2997 7.83256 21.5843 8.35695 21.411L8.04316 20.4615L7.72937 19.512ZM13.8622 20.8462L13.7722 19.8502V19.8502L13.8622 20.8462ZM17.3536 20.0769L17.7891 20.9771H17.7891L17.3536 20.0769ZM20.6897 17.0681L19.9153 16.4354V16.4354L20.6897 17.0681ZM18.408 15.1854L19.1121 15.8955V15.8955L18.408 15.1854ZM16.8715 16.7087L17.5756 17.4188V17.4188L16.8715 16.7087ZM12.6984 16.3846C12.1461 16.3846 11.6984 16.8323 11.6984 17.3846C11.6984 17.9369 12.1461 18.3846 12.6984 18.3846V17.3846V16.3846ZM20.335 14.9962L19.7836 15.8305V15.8305L20.335 14.9962ZM9.22402 14.4915L9.66816 15.3875H9.66816L9.22402 14.4915ZM13.4001 14.1128L13.6611 13.1475H13.6611L13.4001 14.1128ZM15.0309 14.5538L14.7699 15.5191H14.7699L15.0309 14.5538ZM15.5476 16.4829L14.8435 15.7727V15.7727L15.5476 16.4829ZM13.934 16.6745C13.5418 17.0633 13.5391 17.6965 13.9279 18.0887C14.3168 18.4809 14.9499 18.4836 15.3421 18.0948L14.6381 17.3846L13.934 16.6745ZM8.04316 20.4615L8.35695 21.411C8.4545 21.3788 8.67974 21.3518 9.10006 21.3815C9.50005 21.4098 9.96832 21.4794 10.5079 21.5634C11.5286 21.7224 12.8321 21.9433 13.9521 21.8421L13.8622 20.8462L13.7722 19.8502C12.9526 19.9242 11.9284 19.7605 10.8156 19.5872C10.2883 19.5051 9.73824 19.4216 9.24113 19.3865C8.76435 19.3528 8.21371 19.352 7.72937 19.512L8.04316 20.4615ZM13.8622 20.8462L13.9521 21.8421C15.4538 21.7065 16.2079 21.7421 17.7891 20.9771L17.3536 20.0769L16.9181 19.1767C15.7223 19.7553 15.3478 19.7079 13.7722 19.8502L13.8622 20.8462ZM17.3536 20.0769L17.7891 20.9771C19.219 20.2853 20.6284 18.7238 21.4642 17.7007L20.6897 17.0681L19.9153 16.4354C19.0698 17.4704 17.9056 18.699 16.9181 19.1767L17.3536 20.0769ZM18.408 15.1854L17.7039 14.4753L16.1675 15.9986L16.8715 16.7087L17.5756 17.4188L19.1121 15.8955L18.408 15.1854ZM15.2257 17.3846V16.3846H12.6984V17.3846V18.3846H15.2257V17.3846ZM16.8715 16.7087L16.1675 15.9986C15.9191 16.2448 15.5805 16.3846 15.2257 16.3846V17.3846V18.3846C16.1054 18.3846 16.9509 18.0382 17.5756 17.4188L16.8715 16.7087ZM20.335 14.9962L20.8864 14.162C19.8866 13.5011 18.5558 13.6307 17.7039 14.4753L18.408 15.1854L19.1121 15.8955C19.2897 15.7194 19.572 15.6906 19.7836 15.8305L20.335 14.9962ZM20.6897 17.0681L21.4642 17.7007C22.4053 16.5487 22.046 14.9284 20.8864 14.162L20.335 14.9962L19.7836 15.8305C20.0394 15.9995 20.0448 16.2769 19.9153 16.4354L20.6897 17.0681ZM3.77587 13.5385V14.5385H6.87935V13.5385V12.5385H3.77587V13.5385ZM7.65522 14.3077H6.65522V21.2308H7.65522H8.65522V14.3077H7.65522ZM6.87935 22V21H3.77587V22V23H6.87935V22ZM3 21.2308H4V14.3077H3H2V21.2308H3ZM3.77587 22V21C3.89153 21 4 21.0952 4 21.2308H3H2C2 22.216 2.80321 23 3.77587 23V22ZM7.65522 21.2308H6.65522C6.65522 21.0952 6.76369 21 6.87935 21V22V23C7.85201 23 8.65522 22.216 8.65522 21.2308H7.65522ZM6.87935 13.5385V14.5385C6.76369 14.5385 6.65522 14.4432 6.65522 14.3077H7.65522H8.65522C8.65522 13.3225 7.85202 12.5385 6.87935 12.5385V13.5385ZM3.77587 13.5385V12.5385C2.8032 12.5385 2 13.3225 2 14.3077H3H4C4 14.4432 3.89153 14.5385 3.77587 14.5385V13.5385ZM8.04316 15.0769L8.4873 15.9729L9.66816 15.3875L9.22402 14.4915L8.77987 13.5956L7.59901 14.181L8.04316 15.0769ZM11.6529 13.9231V14.9231H11.9711V13.9231V12.9231H11.6529V13.9231ZM13.4001 14.1128L13.1391 15.0781L14.7699 15.5191L15.0309 14.5538L15.2919 13.5884L13.6611 13.1475L13.4001 14.1128ZM15.5476 16.4829L14.8435 15.7727L13.934 16.6745L14.6381 17.3846L15.3421 18.0948L16.2517 17.193L15.5476 16.4829ZM15.0309 14.5538L14.7699 15.5191C14.8963 15.5533 14.922 15.6949 14.8435 15.7727L15.5476 16.4829L16.2517 17.193C17.4369 16.0179 16.8897 14.0205 15.2919 13.5884L15.0309 14.5538ZM11.9711 13.9231V14.9231C12.3657 14.9231 12.7585 14.9752 13.1391 15.0781L13.4001 14.1128L13.6611 13.1475C13.1102 12.9985 12.5419 12.9231 11.9711 12.9231V13.9231ZM9.22402 14.4915L9.66816 15.3875C10.284 15.0822 10.9635 14.9231 11.6529 14.9231V13.9231V12.9231C10.6559 12.9231 9.67231 13.1532 8.77987 13.5956L9.22402 14.4915ZM17.7415 8.15385H16.7415C16.7415 9.29281 15.8079 10.2308 14.6381 10.2308V11.2308V12.2308C16.8962 12.2308 18.7415 10.4136 18.7415 8.15385H17.7415ZM14.6381 11.2308V10.2308C13.4682 10.2308 12.5346 9.29281 12.5346 8.15385H11.5346H10.5346C10.5346 10.4136 12.3799 12.2308 14.6381 12.2308V11.2308ZM11.5346 8.15385H12.5346C12.5346 7.01488 13.4682 6.07692 14.6381 6.07692V5.07692V4.07692C12.3799 4.07692 10.5346 5.89414 10.5346 8.15385H11.5346ZM14.6381 5.07692V6.07692C15.8079 6.07692 16.7415 7.01488 16.7415 8.15385H17.7415H18.7415C18.7415 5.89414 16.8962 4.07692 14.6381 4.07692V5.07692ZM11.5346 8.15385V7.15385C10.3647 7.15385 9.43109 6.21589 9.43109 5.07692H8.43109H7.43109C7.43109 7.33663 9.2764 9.15385 11.5346 9.15385V8.15385ZM8.43109 5.07692H9.43109C9.43109 3.93796 10.3647 3 11.5346 3V2V1C9.2764 1 7.43109 2.81722 7.43109 5.07692H8.43109ZM11.5346 2V3C12.7044 3 13.6381 3.93796 13.6381 5.07692H14.6381H15.6381C15.6381 2.81722 13.7927 1 11.5346 1V2Z';
    return '<span class="emp-pay-cycle-day__ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round') + '><path d="' + d + '"/></svg></span>';
  }

  function openPayCycleSettings() {
    closeAllEmpMasks();
    var pc = ensurePayCycle();
    state.payCycleDraft = {
      mode: pc.mode,
      settleDay: pc.settleDay,
      payDayOfMonth: pc.payDayOfMonth || defaultPayDayFromSettle(pc.settleDay),
      payDayManual: !!pc.payDayManual
    };
    renderPayCycleSettings();
    showScreen('screen-emp-pay-cycle');
    nav('staff-pay-cycle');
  }

  function renderPayCycleSettings() {
    var root = $('empPayCycleBody');
    if (!root) return;
    var draft = state.payCycleDraft || { mode: 'calendar', settleDay: 25, payDayOfMonth: 7, payDayManual: false };
    var day = Math.min(28, Math.max(1, Number(draft.settleDay) || 25));
    draft.settleDay = day;
    if (!draft.payDayManual) {
      draft.payDayOfMonth = defaultPayDayFromSettle(day);
    } else {
      draft.payDayOfMonth = Math.min(30, Math.max(1, Number(draft.payDayOfMonth) || defaultPayDayFromSettle(day)));
    }
    var payDay = draft.payDayOfMonth;
    var canEditPay = canEditPayDay();
    var previewKey = draft.mode === 'custom'
      ? (function () {
          var d = new Date();
          var y = d.getFullYear();
          var m = d.getMonth();
          var dom = d.getDate();
          var endDom = settleDayInMonth(y, m, day);
          if (dom <= endDom) return customPeriodEndingIn(y, m, day);
          var ny = y; var nm = m + 1;
          if (nm > 11) { nm = 0; ny++; }
          return customPeriodEndingIn(ny, nm, day);
        })()
      : (new Date().getFullYear() + '-' + pad2(new Date().getMonth() + 1));
    var previewParts = periodParts(previewKey);
    var settleBlock = draft.mode === 'custom'
      ? ('<div class="emp-card emp-pay-cycle-day">' +
        '<div class="emp-pay-cycle-day__lbl">' + payCycleLabelIco('settle') + '每月结算日</div>' +
        '<div class="emp-pay-cycle-day__ctrl">' +
        '<button type="button" class="emp-pay-cycle-step" data-pay-cycle-day-delta="-1" aria-label="减少"' + (canEditPay ? '' : ' disabled') + '>−</button>' +
        '<span class="emp-pay-cycle-day__val"><span class="emp-num" id="empPayCycleDayVal">' + day + '</span> 日</span>' +
        '<button type="button" class="emp-pay-cycle-step" data-pay-cycle-day-delta="1" aria-label="增加"' + (canEditPay ? '' : ' disabled') + '>+</button>' +
        '</div>' +
        '<p class="emp-pay-cycle-day__tip">可选 1–28 日；大月小月均按当月实际天数截断。</p>' +
        '<div class="emp-pay-cycle-preview">' +
        '<div class="emp-pay-cycle-preview__lbl">当前结算周期</div>' +
        '<div class="emp-pay-cycle-preview__row">' +
        '<div class="emp-pay-cycle-preview__val">' + shortMd(previewParts.start) + ' – ' + shortMd(previewParts.end) + '</div>' +
        '<div class="emp-pay-cycle-preview__sub">每月' + day + '日结</div>' +
        '</div></div></div>')
      : '';
    var payBlock =
      '<div class="emp-card emp-pay-cycle-day">' +
      '<div class="emp-pay-cycle-day__lbl">' + payCycleLabelIco('pay') + '每月发薪日</div>' +
      '<div class="emp-pay-cycle-day__ctrl">' +
      '<button type="button" class="emp-pay-cycle-step" data-pay-day-delta="-1" aria-label="减少"' + (canEditPay ? '' : ' disabled') + '>−</button>' +
      '<span class="emp-pay-cycle-day__val"><span class="emp-num" id="empPayDayVal">' + payDay + '</span> 日</span>' +
      '<button type="button" class="emp-pay-cycle-step" data-pay-day-delta="1" aria-label="增加"' + (canEditPay ? '' : ' disabled') + '>+</button>' +
      '</div>' +
      '<p class="emp-pay-cycle-day__tip">' +
      (canEditPay
        ? (draft.payDayManual
          ? '已手动设置。短月若无该日则发至月末。'
          : '默认按结算日 +12（30 日制）推算；改结算日会自动重算。')
        : '仅店主/合伙人可修改发薪日。') +
      '</p>' +
      (canEditPay && draft.payDayManual
        ? '<button type="button" class="emp-inline-link" data-pay-day-reset style="margin-top:8px">恢复默认</button>'
        : '') +
      '</div>';
    root.innerHTML =
      '<div class="emp-card emp-pay-cycle-card">' +
      '<button type="button" class="emp-pay-cycle-opt' + (draft.mode === 'calendar' ? ' on' : '') + '" data-pay-cycle-mode="calendar"' + (canEditPay ? '' : ' disabled') + '>' +
      '<span class="emp-pay-cycle-opt__radio" aria-hidden="true"></span>' +
      '<span class="emp-pay-cycle-opt__main"><span class="emp-pay-cycle-opt__title">自然月</span>' +
      '<span class="emp-pay-cycle-opt__desc">每月 1 日–月末</span></span></button>' +
      '<button type="button" class="emp-pay-cycle-opt' + (draft.mode === 'custom' ? ' on' : '') + '" data-pay-cycle-mode="custom"' + (canEditPay ? '' : ' disabled') + '>' +
      '<span class="emp-pay-cycle-opt__radio" aria-hidden="true"></span>' +
      '<span class="emp-pay-cycle-opt__main"><span class="emp-pay-cycle-opt__title">自定义结算日</span>' +
      '<span class="emp-pay-cycle-opt__desc">上月结算日次日–本月结算日</span></span></button>' +
      '</div>' + settleBlock + payBlock;
  }

  function savePayCycleSettings() {
    if (!canEditPayDay()) {
      toast('仅店主/合伙人可修改结算周期', true);
      return;
    }
    var draft = state.payCycleDraft || { mode: 'calendar', settleDay: 25 };
    var pc = ensurePayCycle();
    pc.mode = draft.mode === 'custom' ? 'custom' : 'calendar';
    pc.settleDay = Math.min(28, Math.max(1, Number(draft.settleDay) || 25));
    pc.payDayManual = !!draft.payDayManual;
    if (pc.payDayManual) {
      pc.payDayOfMonth = Math.min(30, Math.max(1, Number(draft.payDayOfMonth) || defaultPayDayFromSettle(pc.settleDay)));
    } else {
      pc.payDayOfMonth = defaultPayDayFromSettle(pc.settleDay);
    }
    syncSalaryPeriodToCycle();
    toast(pc.mode === 'custom'
      ? ('已设为每月' + pc.settleDay + '日结 · ' + payDayLabel(pc))
      : ('已设为自然月结算 · ' + payDayLabel(pc)));
    returnFromPayCycleSettings();
  }

  /* ==== 业绩设置 · 简单模式 ==== */
  function getAchSimpleTemplate() {
    if (state.achSimpleTemplate) return state.achSimpleTemplate;
    ensureCalcModes();
    var store = window.EmployeeStore || {};
    if (store.calcModeLabor === 'station') return 'station';
    return 'avg';
  }

  function getAchSimpleScheme() {
    try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    syncAchFromCatalog();
    var bucket = window.EmployeeStore.ach && window.EmployeeStore.ach.labor;
    var sch = (bucket && bucket.defaultScheme) || defaultAchScheme();
    return ensureAchStations(sch);
  }

  function getAchSimpleMianDan(tplId) {
    if (tplId && state.achSimpleMianDan && state.achSimpleMianDan[tplId] != null) {
      return !!state.achSimpleMianDan[tplId];
    }
    /* 独立记忆：未显式设置时默认免单计入业绩（与 ar9 默认值一致） */
    return true;
  }

  function getAchSimpleBase(tplId) {
    if (tplId && state.achSimpleBase && state.achSimpleBase[tplId]) {
      return state.achSimpleBase[tplId];
    }
    return '按实收金额';
  }
  function setAchSimpleBase(tplId, val) {
    state.achSimpleBase = state.achSimpleBase || {};
    state.achSimpleBase[tplId] = val;
    renderAchSimple();
  }

  /* 简单模式 · 图标（内联 SVG，零依赖） */
  function achSimpleCheckSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  }
  function achSimpleChevSvg(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  }
  function achSimpleIconAvg() {
    return '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="achAvgGrad" x1="5.5" y1="3.66667" x2="38.5" y2="40.3333" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#F090B8"/><stop offset="1" stop-color="#FFB096"/></linearGradient></defs>' +
      '<path d="M31.1667 0H12.8333C5.74568 0 0 5.74568 0 12.8333V31.1667C0 38.2543 5.74568 44 12.8333 44H31.1667C38.2543 44 44 38.2543 44 31.1667V12.8333C44 5.74568 38.2543 0 31.1667 0Z" fill="url(#achAvgGrad)"/>' +
      '<path d="M36.6809 22.1858C36.675 22.1773 36.6721 22.1687 36.6692 22.1601L33.1488 12.7259C33.1196 12.6516 33.1781 12.5716 33.2601 12.5716H35.5065C35.5709 12.5716 35.6236 12.5202 35.6236 12.4573C35.6236 11.983 35.4274 11.5573 35.1082 11.2459C34.7889 10.9345 34.3496 10.7431 33.8664 10.7431H23.4108C23.1531 10.7431 22.9422 10.5373 22.9422 10.2859V8.93165C22.9422 8.43165 22.5381 8.01165 22.0255 8.00023C21.759 7.99451 21.5159 8.09737 21.3402 8.2688C21.1704 8.43451 21.0649 8.66308 21.0649 8.9145V10.2859C21.0649 10.5373 20.8541 10.7431 20.5963 10.7431H10.173C9.20358 10.7431 8.41576 11.5116 8.41576 12.4573C8.41576 12.4888 8.4304 12.5173 8.4509 12.5373C8.4714 12.5573 8.50069 12.5716 8.53291 12.5716H10.6943C10.7763 12.5716 10.832 12.6516 10.8056 12.7259L7.28234 22.1601C7.27355 22.183 7.26477 22.2058 7.25305 22.2287C6.88989 22.9572 6.91039 23.8115 7.36142 24.4915C7.71286 25.0201 8.15803 25.4915 8.67934 25.8886C9.76004 26.7086 11.16 27.2029 12.6917 27.2029C15.0757 27.2029 17.1434 26.0058 18.1743 24.2487C18.5521 23.6058 18.5052 22.8258 18.1157 22.1887C18.1098 22.1801 18.1069 22.1715 18.104 22.163L14.5807 12.7259C14.5514 12.6516 14.61 12.5716 14.692 12.5716H18.2563C19.8085 12.5716 21.0679 13.8002 21.0679 15.3145V31.9886C21.0679 32.6629 20.5641 33.24 19.8817 33.3429C18.0249 33.6229 16.5078 34.2257 15.6761 35H28.8055C27.9094 34.1686 26.2283 33.5372 24.1811 33.2857C23.4753 33.2 22.9452 32.6172 22.9452 31.9257V15.3145C22.9452 13.8002 24.2045 12.5716 25.7567 12.5716H29.2859C29.3679 12.5716 29.4235 12.6516 29.3971 12.7259L25.871 22.1601C25.8651 22.1744 25.8592 22.1887 25.8505 22.203C25.4609 22.9001 25.4463 23.7344 25.8739 24.4087C26.9341 26.0772 28.9491 27.2029 31.2598 27.2029C33.6409 27.2029 35.7056 26.0086 36.7365 24.2572C37.1202 23.6087 37.0704 22.823 36.6809 22.1858ZM16.2794 22.6287H9.10401L12.5833 13.303C12.6214 13.203 12.7649 13.203 12.803 13.303L16.2794 22.6287ZM27.6926 22.6287L31.1602 13.3316C31.1983 13.2316 31.3418 13.2316 31.3799 13.3316L34.8475 22.6287H27.6926Z" fill="white"/>' +
      '</svg>';
  }
  function achSimpleIconStation() {
    return '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="achStationGrad" x1="7.33333" y1="3.66667" x2="36.6667" y2="40.3333" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#F0A070"/><stop offset="1" stop-color="#F0D488"/></linearGradient></defs>' +
      '<path d="M31.1667 0H12.8333C5.74568 0 0 5.74568 0 12.8333V31.1667C0 38.2543 5.74568 44 12.8333 44H31.1667C38.2543 44 44 38.2543 44 31.1667V12.8333C44 5.74568 38.2543 0 31.1667 0Z" fill="url(#achStationGrad)"/>' +
      '<path d="M12.6401 23.392H30.3589L32.7738 28.3618H10.2261L12.6401 23.392ZM13.4464 21.7359L15.8598 16.7668H27.1396L29.5544 21.7359H13.4465H13.4464ZM16.6655 15.1108L21.0934 6H21.9081L26.3345 15.111H16.6655L16.6655 15.1108ZM33.5797 30.0189L36 35H7L9.4204 30.0189H33.5797Z" fill="white"/>' +
      '</svg>';
  }
  function achSimpleIconAdv() {
    return '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="achAdvGrad" x1="7.33333" y1="3.66667" x2="36.6667" y2="40.3333" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#E387FF"/><stop offset="1" stop-color="#70B4F0"/></linearGradient></defs>' +
      '<path d="M31.1667 0H12.8333C5.74568 0 0 5.74568 0 12.8333V31.1667C0 38.2543 5.74568 44 12.8333 44H31.1667C38.2543 44 44 38.2543 44 31.1667V12.8333C44 5.74568 38.2543 0 31.1667 0Z" fill="url(#achAdvGrad)"/>' +
      '<path d="M34.1935 19.3269L31.9355 18.8285C31.7548 18.2848 31.529 17.7411 31.2581 17.1974L32.4774 15.1586C32.929 14.4337 33.1548 13.3463 32.4774 12.6667L31.2581 11.4434C30.9419 11.1262 30.4903 10.9903 30.0387 10.9903C29.5871 10.9903 29.0903 11.1262 28.729 11.3981L26.7419 12.6667C26.2452 12.3948 25.7032 12.1683 25.1613 11.9871L24.6645 9.72168C24.529 8.90615 23.8065 8 22.8129 8H21.0516C20.1032 8 19.5161 8.90615 19.2903 9.76699L18.7484 12.0324C18.1613 12.2136 17.5742 12.4854 17.0323 12.7573L15 11.4887C14.729 11.1262 14.2323 10.9903 13.7806 10.9903C13.329 10.9903 12.8774 11.1262 12.5613 11.4887L11.3419 12.712C10.6645 13.3916 10.8903 14.479 11.3419 15.2039L12.6065 17.3333C12.3806 17.8317 12.1548 18.3301 11.9742 18.8285L9.71613 19.3269C8.90323 19.4628 8 20.1877 8 21.1845V22.9515C8 23.9029 8.90323 24.4919 9.76129 24.7184L12.0194 25.3074C12.1548 25.8058 12.3806 26.2589 12.6065 26.712L11.3419 28.8414C10.8903 29.5663 10.6645 30.6537 11.3419 31.3333L12.5613 32.5566C12.8774 32.8285 13.329 32.9644 13.7806 32.9644C14.2323 32.9644 14.729 32.8285 15.0903 32.5566L17.1226 31.2427C17.6645 31.5146 18.2516 31.7864 18.8387 31.9676L19.3806 34.233C19.5613 35.0485 20.1484 36 21.1419 36H22.9032C23.8516 36 24.5742 35.0939 24.7548 34.2783L25.2516 32.0129C25.7935 31.8317 26.3355 31.6052 26.8323 31.3333L28.8194 32.6019C29.1806 32.8285 29.6323 33.0097 30.129 33.0097C30.5806 33.0097 31.0323 32.8738 31.3484 32.5113L32.5677 31.288C33.2452 30.6084 33.0194 29.521 32.5677 28.7961L31.3484 26.7573C31.5742 26.2589 31.8 25.7605 31.9806 25.2621L34.2387 24.6731C35.0516 24.4919 36 23.9029 36 22.9061V21.1392C35.9548 20.1877 35.0516 19.4628 34.1935 19.3269ZM22 26.2136C19.6516 26.2136 17.7548 24.3107 17.7548 22C17.7548 19.6893 19.6516 17.7864 22 17.7864C24.3484 17.7864 26.2452 19.6893 26.2452 22C26.2452 24.3107 24.3032 26.2136 22 26.2136Z" fill="white"/>' +
      '</svg>';
  }

  /* 字段值读取：返回 { des, non } 或布尔（免单） */
  function getAchSimpleFieldValue(tplId, field) {
    if (field.toggle) return getAchSimpleMianDan(tplId);
    var sch = getAchSimpleScheme();
    if (field.station) {
      var pair = (sch.stations && sch.stations[field.station]) || sch.stations.senior;
      return { des: Number(pair.designated), non: Number(pair.nonDesignated) };
    }
    return {
      des: field.key === 'des' ? Number(sch.designated) : Number(sch.nonDesignated),
      non: null,
    };
  }

  function renderAchSimpleField(tplId, field) {
    var label = esc(field.label);
    if (field.toggle) {
      var on = getAchSimpleFieldValue(tplId, field);
      return '<button type="button" class="ach-simple-field is-toggle" data-ach-simple-field="' + tplId + ':' + field.key + '">' +
        '<span class="ach-simple-field__label">' + label + '</span>' +
        '<span class="ach-simple-switch' + (on ? ' is-on' : '') + '" aria-hidden="true"></span>' +
        '</button>';
    }
    if (field.select) {
      var cur = getAchSimpleBase(tplId);
      var opts = ['按售价', '按实收金额'];
      var seg = opts.map(function (o) {
        var on = o === cur;
        return '<button type="button" class="ach-simple-base-seg__btn' + (on ? ' on' : '') +
          '" data-ach-simple-base="' + esc(o) + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
          esc(o) + '</button>';
      }).join('');
      return '<div class="ach-simple-field is-base" data-ach-simple-field="' + tplId + ':' + field.key + '">' +
        '<span class="ach-simple-field__label">' + label + '</span>' +
        '<div class="ach-simple-base-seg" role="radiogroup" aria-label="' + label + '">' + seg + '</div>' +
        '</div>';
    }
    var val = getAchSimpleFieldValue(tplId, field);
    var valText;
    if (field.station) {
      valText = String(val.des) + '% · ' + String(val.non) + '%';
    } else {
      valText = String(val.des) + '%';
    }
    var fieldKey = field.station || field.key;
    return '<button type="button" class="ach-simple-field" data-ach-simple-field="' + tplId + ':' + fieldKey + '">' +
      '<span class="ach-simple-field__label">' + label + '</span>' +
      '<span class="ach-simple-field__val">' + valText + '</span>' +
      achSimpleChevSvg('ach-simple-field__chev') +
      '</button>';
  }

  function renderAchSimple() {
    var listEl = $('achSimpleList');
    if (!listEl) return;
    var active = getAchSimpleTemplate();
    var advOn = !!state.achSimpleAdvReturn;
    var modesHtml = ACH_SIMPLE_TEMPLATES.map(function (t) {
      var on = t.id === active && !advOn;
      var fieldsHtml = t.fields.map(function (f) {
        return renderAchSimpleField(t.id, f);
      }).join('');
      var iconHtml = t.id === 'station' ? achSimpleIconStation() : achSimpleIconAvg();
      return '<div role="button" tabindex="0" class="ach-simple-card' + (on ? ' is-on' : '') + '" data-ach-simple-tpl="' + t.id + '">' +
        '<span class="ach-simple-card__head">' +
        '<span class="ach-simple-card__icon" aria-hidden="true">' + iconHtml + '</span>' +
        '<span class="ach-simple-card__text">' +
        '<span class="ach-simple-card__title">' + esc(t.title) + '</span>' +
        '<span class="ach-simple-card__sub">' + esc(t.sub) + '</span>' +
        '</span>' +
        '<span class="ach-simple-card__radio" aria-hidden="true">' + achSimpleCheckSvg() + '</span>' +
        '</span>' +
        '<span class="ach-simple-card__fields">' + fieldsHtml + '</span>' +
        '</div>';
    }).join('');
    var advHtml = '<button type="button" class="ach-simple-adv' + (advOn ? ' is-on' : '') + '" data-ach-simple-adv>' +
      '<span class="ach-simple-adv__icon" aria-hidden="true">' + achSimpleIconAdv() + '</span>' +
      '<span class="ach-simple-adv__main">' +
      '<span class="ach-simple-adv__title">进阶设置</span>' +
      '<span class="ach-simple-adv__sub">需要更精细化的设置，点击这里</span>' +
      '</span>' +
      '<span class="ach-simple-adv__chev" aria-hidden="true">' + achSimpleChevSvg('ach-simple-adv__chev-svg') + '</span>' +
      '</button>';
    listEl.innerHTML = modesHtml + advHtml;
  }

  function applyAchSimpleTemplate(id, silent) {
    var tpl = ACH_SIMPLE_TEMPLATES.find(function (t) { return t.id === id; });
    if (!tpl) return;
    try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    syncAchFromCatalog();
    ensureCalcModes();
    ['labor', 'sales', 'card'].forEach(function (kind) {
      setAchCalcMode(kind, tpl.calcMode);
    });
    if (typeof invalidateCommLineCache === 'function') invalidateCommLineCache();
    state.achSimpleTemplate = id;
    state.achSimpleAdvReturn = false;
    /* 切换选中方案后，把该方案自己的免单设置同步到全局计算规则 */
    syncAchSimpleMianDanToGlobal(id);
    renderAchSimple();
    if (!silent) toast('已启用「' + tpl.title + '」');
  }

  function openAchSimpleRateEdit(tplId, fieldKey) {
    state.achSimpleEditTarget = { tplId: tplId, key: fieldKey };
    renderAchSimpleRateSheet();
    openMask('achSimpleRateMask');
  }

  function achSimpleRateTickLabel(tickIndex) {
    var i = Math.max(0, Math.min(20, tickIndex | 0));
    return (i * 5) + '%';
  }

  function renderAchSimpleRateSheet() {
    var target = state.achSimpleEditTarget;
    if (!target) return;
    var tpl = ACH_SIMPLE_TEMPLATES.find(function (t) { return t.id === target.tplId; });
    var titleEl = $('achSimpleRateTitle');
    var descEl = $('achSimpleRateDesc');
    var bodyEl = $('achSimpleRateBody');
    if (!tpl || !titleEl || !descEl || !bodyEl) return;
    var field = tpl.fields.find(function (f) {
      return (f.station || f.key) === target.key && !f.toggle;
    });
    if (!field) return;
    var sch = getAchSimpleScheme();
    var curDes, curNon;
    if (field.station) {
      var pair = (sch.stations && sch.stations[field.station]) || sch.stations.senior;
      curDes = Number(pair.designated);
      curNon = Number(pair.nonDesignated);
      titleEl.textContent = getStationLabel(field.station) + '业绩比例';
      descEl.textContent = '开单时按所选工位，点客与散客分别按该比例计入业绩。';
    } else {
      curDes = field.key === 'des' ? Number(sch.designated) : Number(sch.nonDesignated);
      curNon = null;
      titleEl.textContent = field.key === 'des' ? '点客业绩比例' : '散客业绩比例';
      descEl.textContent = field.key === 'des' ? '点客按该比例计入业绩。' : '散客按该比例计入业绩。';
    }
    function rulerGroup(label, cur) {
      var tick = Math.max(0, Math.min(20, Math.round(Number(cur) / 5)));
      var rulerHtml = buildSnapRulerHtml({
        tickIndex: tick,
        tickMax: 20,
        labeledTicks: [
          { tick: 0, text: '0%' },
          { tick: 10, text: '50%' },
          { tick: 20, text: '100%' }
        ],
        dataAttr: 'data-ach-simple-rate-role',
        dataValue: label
      });
      return '<div class="ach-simple-rate__group" data-ruler-stack="' + label + '">' +
        '<div class="ach-simple-rate__group-head">' +
        '<span class="ach-simple-rate__group-label">' + label + '</span>' +
        '<span class="ach-simple-rate__group-val" data-ruler-live>' + achSimpleRateTickLabel(tick) + '</span>' +
        '</div>' + rulerHtml + '</div>';
    }
    var html;
    if (field.station) {
      html = rulerGroup('点客', curDes) + rulerGroup('散客', curNon);
    } else {
      html = rulerGroup(field.key === 'des' ? '点客' : '散客', curDes);
    }
    bodyEl.innerHTML = html;
    bodyEl.querySelectorAll('.discount-ruler').forEach(function (el) {
      var role = el.dataset.achSimpleRateRole;
      wireSnapRuler(el, null, achSimpleRateTickLabel, function () {
        var tick = parseInt(el.dataset.tick, 10) || 0;
        applyAchSimpleRate(tick * 5, role);
      });
    });
  }

  function applyAchSimpleRate(pct, role) {
    pct = Number(pct);
    if (!isFinite(pct) || pct < 0) return;
    if (pct > 100) pct = 100;
    var target = state.achSimpleEditTarget;
    if (!target) return;
    var isStation = ['senior', 'mid', 'junior'].indexOf(target.key) >= 0;
    var flatKey = target.key === 'des' ? 'designated' : 'nonDesignated';
    var isDes = role === '点客';
    try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    syncAchFromCatalog();
    ['labor', 'sales', 'card'].forEach(function (kind) {
      walkAchSchemes(kind, function (scheme) {
        if (scheme.valueMode === 'amount') return;
        if (isStation) {
          if (!scheme.stations || !scheme.stations[target.key]) return;
          if (isDes) scheme.stations[target.key].designated = pct;
          else scheme.stations[target.key].nonDesignated = pct;
        } else {
          scheme[flatKey] = pct;
          if (scheme.stations) {
            ACH_STATION_IDS.forEach(function (sid) {
              if (scheme.stations[sid]) scheme.stations[sid][flatKey] = pct;
            });
          }
        }
      });
    });
    applyDemoApprenticeAchOverrides();
    if (typeof invalidateCommLineCache === 'function') invalidateCommLineCache();
    renderAchSimple();
  }

  function finishAchSimpleRate() {
    closeMask('achSimpleRateMask');
    toast('已更新');
  }

  function syncAchSimpleMianDanToGlobal(tplId) {
    var on = getAchSimpleMianDan(tplId);
    try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    var rules = ensureAdvRules();
    rules.forEach(function (r) {
      if (r.id === 'ar9') r.value = on ? '计算业绩和提成' : '不计算业绩提成';
    });
    window.EmployeeStore.advRules = rules;
    if (typeof invalidateCommLineCache === 'function') invalidateCommLineCache();
  }

  function applyAchSimpleMianDan(tplId, on) {
    on = !!on;
    if (tplId) {
      state.achSimpleMianDan = state.achSimpleMianDan || {};
      state.achSimpleMianDan[tplId] = on;
      /* 仅当前选中的方案才会写入全局计算规则，另一个卡片的开关互不影响 */
      if (getAchSimpleTemplate() === tplId) syncAchSimpleMianDanToGlobal(tplId);
    } else {
      syncAchSimpleMianDanToGlobal(tplId);
    }
    renderAchSimple();
    toast(on ? '免单已计入业绩' : '免单不计入业绩');
  }

  function backAchToSimple() {
    state.achSimpleAdvReturn = true;
    openAchSimple(true);
  }

  function openAchSimple(keepAdvOn) {
    if (!requirePerm('achCommSet')) return;
    closeAllEmpMasks();
    if (!keepAdvOn) state.achSimpleAdvReturn = false;
    try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    syncAchFromCatalog();
    /* 进入页面默认选中「平均分配」：仅首次进入（本会话未选择过模板、非从进阶返回）时应用，不打扰提示 */
    if (!keepAdvOn && !state.achSimpleTemplate) applyAchSimpleTemplate('avg', true);
    renderAchSimple();
    showScreen('screen-emp-ach-simple');
    nav('staff-ach');
  }

  function openAch() {
    if (!requirePerm('achCommSet')) return;
    closeAllEmpMasks();
    if (typeof ensureDemoFilled === 'function') {
      try { ensureDemoFilled(); } catch (e) { /* ignore */ }
    }
    if (!state.achTab || state.achTab === 'base') state.achTab = 'labor';
    if (state.achTab === 'card' && !state.achCatId) state.achCatId = 'card_rules';
    if ((state.achTab === 'labor' || state.achTab === 'sales') && !state.achCatId) {
      state.achCatId = getAchCommonRulesCatId(state.achTab);
    }
    renderAch();
    showScreen('screen-emp-ach');
    nav('staff-ach');
  }

  function openAchBase() {
    if (!requirePerm('achCommSet')) return;
    closeAllEmpMasks();
    state.achTab = 'base';
    renderAch();
    showScreen('screen-emp-ach');
    nav('staff-ach-adv');
  }

  function openComm() {
    if (!requirePerm('achCommSet')) return;
    closeAllEmpMasks();
    ensureAllCommSchemes();
    renderCommList();
    showScreen('screen-emp-comm');
    nav('staff-comm');
  }

  function openRankToast() {
    toast('业绩排行后续开放');
  }

  function getBillingStaffPool() {
    return window.EmployeeStore.staff
      .filter(function (s) { return s.status === '在岗'; })
      .map(function (s) {
        return { id: s.id, name: s.name, short: s.short, avatar: s.avatar || '', role: s.role || '' };
      });
  }

  function backWorkbench() {
    closeAllEmpMasks();
    if (typeof openWorkbench === 'function') openWorkbench();
    else { showScreen('screen-workbench'); nav('workbench'); }
  }

  function patchWorkbench() {
    /* workbench tiles wired in launchWorkbenchTile switch in demo.html */
  }

  function patchFlowNav() {
    if (typeof FLOW_NAV === 'undefined') return false;
    Object.assign(FLOW_NAV, {
      'staff-list': openList,
      'staff-roles': openRoleManage,
      'staff-detail': function () { if (state.currentStaffId) { renderStaffDetail(state.currentStaffId); showScreen('screen-emp-detail'); nav('staff-detail'); } else openList(); },
      'staff-create': function () { openForm('create'); },
      'staff-refine': function () { openForm('refine', state.currentStaffId || 'st2'); },
      'staff-salary': openSalary,
      'staff-pay-detail': function () {
        var id = state.currentStaffId || (salaryVisibleStaff()[0] && salaryVisibleStaff()[0].id);
        openEmpPayDetail(id);
      },
      'staff-pay-cycle': openPayCycleSettings,
      'staff-salary-detail': function () {
        var id = state.currentStaffId || (salaryVisibleStaff()[0] && salaryVisibleStaff()[0].id);
        if (id) {
          state.commDetailViewer = 'owner';
          state.commDetailFilter = 'all';
          resetCommDetailScope();
          renderSalaryDetail(id);
          showScreen('screen-emp-salary-detail');
          nav('staff-salary-detail');
        } else openSalary();
      },
      'staff-reward-detail': function () {
        var id = state.rewardDetailStaffId || state.currentStaffId || (salaryVisibleStaff()[0] && salaryVisibleStaff()[0].id);
        if (id) { renderRewardDetail(id); showScreen('screen-emp-reward-detail'); nav('staff-reward-detail'); }
        else openSalary();
      },
      'staff-rewards': function () {
        state.rewardFormReturn = 'salary';
        if (!state.editingRewardId) { state.rewardDraft = null; ensureRewardDraft({}); }
        renderRewards();
        showScreen('screen-emp-rewards');
        nav('staff-rewards');
      },
      'staff-ach': openAchSimple,
      'staff-ach-adv': openAchBase,
      'staff-comm': openComm,
      'staff-comm-create': function () { openCreateSchemeTypeDialog(); showScreen('screen-emp-comm'); nav('staff-comm-create'); },
      'staff-comm-single': function () {
        var id = state.editingSchemeId || 'sch1';
        openCommEditor(id);
      },
      'staff-comm-ladder': function () { var id = state.editingSchemeId || 'sch2'; openCommEditor(id); },
      'staff-comm-item': function () {
        var id = state.editingSchemeId;
        if (!id || !schemeById(id) || schemeById(id).type !== 'item') {
          var found = (window.EmployeeStore.schemes || []).find(function (s) { return s.type === 'item'; });
          id = found ? found.id : id;
        }
        if (id) openItemCommEditor(id);
        else openComm();
      },
      'staff-comm-item-pick': function () {
        state.editingSchemeId = state.editingSchemeId || ((window.EmployeeStore.schemes || []).find(function (s) { return s.type === 'item'; }) || {}).id;
        if (state.editingSchemeId) openItemSchemePick();
        else openComm();
      },
      'staff-comm-scope': function () {
        state.editingSchemeId = state.editingSchemeId || 'sch2';
        openLadderScopeEditor();
      },
      'staff-comm-assign': function () { openAssignStaff(state.assignSchemeId || state.editingSchemeId || 'sch1', 'screen-emp-comm'); },
    });
    if (typeof FLOW_MAP_GROUPS !== 'undefined' && !FLOW_MAP_GROUPS.some(function (g) { return g.title === '员工'; })) {
      FLOW_MAP_GROUPS.push({
        title: '员工',
        nodes: [
          { id: 'staff-list', label: '员工管理', screen: 'screen-emp-list' },
          { id: 'staff-roles', label: '职位管理', screen: 'screen-emp-roles' },
          { id: 'staff-detail', label: '员工详情', screen: 'screen-emp-detail' },
          { id: 'staff-create', label: '创建员工', screen: 'screen-emp-form' },
          { id: 'staff-refine', label: '完善员工', screen: 'screen-emp-form' },
          { id: 'staff-salary', label: '员工薪资', screen: 'screen-emp-salary' },
          { id: 'staff-pay-detail', label: '员工薪资明细', screen: 'screen-emp-pay-detail' },
          { id: 'staff-pay-cycle', label: '结算周期', screen: 'screen-emp-pay-cycle' },
          { id: 'staff-salary-detail', label: '员工业绩提成明细', screen: 'screen-emp-salary-detail' },
          { id: 'staff-reward-detail', label: '奖惩明细', screen: 'screen-emp-reward-detail' },
          { id: 'staff-rewards', label: '设奖惩', screen: 'screen-emp-rewards' },
          { id: 'staff-ach', label: '业绩设置', screen: 'screen-emp-ach' },
          { id: 'staff-ach-adv', label: '基础设置', screen: 'screen-emp-ach' },
          { id: 'staff-comm', label: '提成设置', screen: 'screen-emp-comm' },
          { id: 'staff-comm-create', label: '新建方案', screen: 'screen-emp-comm' },
          { id: 'staff-comm-item', label: '固定比例', screen: 'screen-emp-comm-item' },
          { id: 'staff-comm-ladder', label: '阶梯比例', screen: 'screen-emp-comm-ladder' },
          { id: 'staff-comm-item-pick', label: '添加提成项目', screen: 'screen-emp-comm-scope' },
          { id: 'staff-comm-scope', label: '使用范围', screen: 'screen-emp-comm-scope' },
          { id: 'staff-comm-assign', label: '分配员工', screen: 'screen-emp-comm-assign' },
        ],
      });
      if (typeof renderFlowMap === 'function') renderFlowMap();
    }
    // 已存在「员工」分组时，补齐新增节点
    if (typeof FLOW_MAP_GROUPS !== 'undefined') {
      var empGroup = FLOW_MAP_GROUPS.find(function (g) { return g.title === '员工'; });
      if (empGroup && empGroup.nodes) {
        [['staff-comm-item', '固定比例', 'screen-emp-comm-item'],
          ['staff-roles', '职位管理', 'screen-emp-roles'],
          ['staff-comm-item-pick', '添加提成项目', 'screen-emp-comm-scope'],
          ['staff-comm-scope', '使用范围', 'screen-emp-comm-scope'],
          ['staff-comm-assign', '分配员工', 'screen-emp-comm-assign'],
          ['staff-reward-detail', '奖惩明细', 'screen-emp-reward-detail'],
          ['staff-pay-cycle', '结算周期', 'screen-emp-pay-cycle'],
          ['staff-pay-detail', '员工薪资明细', 'screen-emp-pay-detail']].forEach(function (item) {
          if (!empGroup.nodes.some(function (n) { return n.id === item[0]; })) {
            empGroup.nodes.push({ id: item[0], label: item[1], screen: item[2] });
          }
        });
        empGroup.nodes = empGroup.nodes.filter(function (n) {
          return n.id !== 'staff-card-share' && n.id !== 'staff-comm-single' &&
            n.id !== 'staff-salary-detail-pending' && n.id !== 'staff-salary-detail-staff';
        });
        empGroup.nodes.forEach(function (n) {
          if (n.id === 'staff-salary-detail') n.label = '员工业绩提成明细';
          if (n.id === 'staff-pay-detail') n.label = '员工薪资明细';
          if (n.id === 'staff-ach-adv') {
            n.label = '基础设置';
            n.screen = 'screen-emp-ach';
          }
          if (n.id === 'staff-comm-item') n.label = '固定比例';
        });
        if (typeof renderFlowMap === 'function') renderFlowMap();
      }
    }
    return true;
  }

  function findAchItem(itemId) {
    var found = null;
    var preferred = null;
    var store = window.EmployeeStore.ach;
    var preferCat = state.achTab === 'card' ? state.achCatId : null;
    ['labor', 'sales', 'card'].forEach(function (tab) {
      var data = store[tab];
      if (!data || !data.items) return;
      Object.keys(data.items).forEach(function (catId) {
        (data.items[catId] || []).forEach(function (it) {
          if (it.id !== itemId) return;
          var hit = { tab: tab, catId: catId, item: it };
          if (!found) found = hit;
          if (preferCat && catId === preferCat) preferred = hit;
        });
      });
    });
    return preferred || found;
  }

  function wire() {
    if (state.wired) return;
    state.wired = true;
    patchWorkbench();
    patchFlowNav();

    document.querySelectorAll('[data-emp-back]').forEach(function (btn) {
      var scr = btn.closest('.screen');
      if (scr && scr.id === 'screen-emp-ach') {
        btn.addEventListener('click', backAchToSimple);
      } else {
        btn.addEventListener('click', backWorkbench);
      }
    });
    $('empFormBack')?.addEventListener('click', function () {
      if (state.formMode === 'create') openList();
      else if (state.currentStaffId) { renderStaffDetail(state.currentStaffId); showScreen('screen-emp-detail'); nav('staff-detail'); }
      else openList();
    });
    /* 同属性可能有多个返回键，必须 querySelectorAll，勿用 querySelector */
    document.querySelectorAll('[data-emp-back-list]').forEach(function (btn) {
      btn.addEventListener('click', openList);
    });
    document.querySelectorAll('[data-emp-back-salary]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var scr = btn.closest('.screen');
        if (scr && scr.id === 'screen-emp-rewards' && state.rewardFormReturn === 'detail' && state.rewardDetailStaffId) {
          state.editingRewardId = null;
          state.rewardDraft = null;
          renderRewardDetail(state.rewardDetailStaffId);
          showScreen('screen-emp-reward-detail');
          nav('staff-reward-detail');
          return;
        }
        if (scr && scr.id === 'screen-emp-reward-detail' && state.currentStaffId) {
          openEmpPayDetail(state.currentStaffId);
          return;
        }
        openSalary();
      });
    });
    $('empCommDetailBack')?.addEventListener('click', function () {
      if (state.currentStaffId) openEmpPayDetail(state.currentStaffId);
      else openSalary();
    });
    document.querySelectorAll('[data-emp-back-comm]').forEach(function (btn) {
      btn.addEventListener('click', openComm);
    });

    $('empBtnAddStaff')?.addEventListener('click', function () {
      if (!requirePerm('staffCreate')) return;
      openForm('create');
    });
    $('empBtnEditDetail')?.addEventListener('click', function () {
      if (!requirePerm('staffCreate')) return;
      openForm('edit', state.currentStaffId);
    });
    $('empBtnSaveForm')?.addEventListener('click', saveForm);

    wireStaffListDrag();
    wireRoleManageListDrag();
    $('empListRoot')?.addEventListener('click', function (e) {
      if (state.staffDragSuppressClick) {
        state.staffDragSuppressClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.target.closest('[data-emp-drag]')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var refine = e.target.closest('[data-emp-refine]');
      if (refine) { e.stopPropagation(); openForm('refine', refine.dataset.empRefine); return; }
      var row = e.target.closest('[data-staff-id]');
      if (row) { renderStaffDetail(row.dataset.staffId); showScreen('screen-emp-detail'); nav('staff-detail'); }
    });

    $('empRowRole')?.addEventListener('click', function () {
      renderRolePickerList($('empFRole').textContent);
      openMask('empRoleMask');
    });
    $('empBtnManageRoles')?.addEventListener('click', openRoleManage);
    $('empBtnAddRolePage')?.addEventListener('click', function () {
      openRoleNameDialog('add', '', 'page');
    });
    $('empBtnAddRoleSheet')?.addEventListener('click', function () {
      openRoleNameDialog('add', '', 'picker');
    });
    $('empRoleManageList')?.addEventListener('click', function (e) {
      if (state.roleDragSuppressClick) {
        state.roleDragSuppressClick = false;
        return;
      }
      if (e.target.closest('[data-role-drag]')) return;
      var row = e.target.closest('[data-role-manage]');
      if (!row) return;
      openRoleNameDialog('rename', row.dataset.roleManage, 'page');
    });
    $('empRoleNameCancel')?.addEventListener('click', function () { closeEmpDialog('empRoleNameMask'); });
    $('empRoleNameOk')?.addEventListener('click', commitRoleNameDialog);
    $('empRoleNameDelete')?.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      deleteRoleFromDialog();
    });
    $('empRoleNameMask')?.addEventListener('click', function (e) {
      if (e.target === $('empRoleNameMask')) closeEmpDialog('empRoleNameMask');
    });
    $('empRoleDelConfirmCancel')?.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeRoleDelConfirm(true);
    });
    $('empRoleDelConfirmOk')?.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      confirmDeleteRole();
    });
    $('empRoleDelConfirmMask')?.addEventListener('click', function (e) {
      if (e.target === $('empRoleDelConfirmMask')) closeRoleDelConfirm(true);
      var ok = e.target.closest('#empRoleDelConfirmOk');
      if (ok) {
        e.preventDefault();
        e.stopPropagation();
        confirmDeleteRole();
        return;
      }
      var cancel = e.target.closest('#empRoleDelConfirmCancel');
      if (cancel) {
        e.preventDefault();
        e.stopPropagation();
        closeRoleDelConfirm(true);
      }
    });
    $('empRoleNameInput')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commitRoleNameDialog(); }
    });
    $('empRowGender')?.addEventListener('click', function () {
      renderPickerList('empGenderList', GENDERS, $('empFGender').textContent, 'gender-val');
      openMask('empGenderMask');
    });
    $('empRowAgeBand')?.addEventListener('click', function () {
      renderPickerList('empAgeBandList', AGE_BANDS, $('empFAgeBand').textContent, 'age-val');
      openMask('empAgeBandMask');
    });
    $('empRowAvatar')?.addEventListener('click', openAvatarAction);
    $('empFAvatarPreview')?.addEventListener('click', function (e) {
      e.stopPropagation();
      openAvatarAction();
    });
    $('empAvatarActionClose')?.addEventListener('click', function () { closeMask('empAvatarActionMask'); });
    $('empAvatarFromAlbum')?.addEventListener('click', function () { openAlbumPicker(false); });
    $('empAvatarFromCamera')?.addEventListener('click', function () { openAlbumPicker(true); });
    $('empAlbumClose')?.addEventListener('click', function () { closeMask('empAlbumMask'); });
    $('empAlbumGrid')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-album-url]');
      if (!btn) return;
      state.avatarDraft = btn.dataset.albumUrl;
      renderAlbumGrid();
      openCrop(btn.dataset.albumUrl);
    });
    $('empCropCancel')?.addEventListener('click', function () {
      closeMask('empCropMask');
      openMask('empAlbumMask');
    });
    $('empCropDone')?.addEventListener('click', applyCroppedAvatar);

    $('empRowSwordTitle')?.addEventListener('click', openSwordTitlePicker);
    $('empSwordTitleClose')?.addEventListener('click', function () { closeMask('empSwordTitleMask'); });
    $('empSwordTitleRefresh')?.addEventListener('click', function () {
      state.swordTitleBatch = (state.swordTitleBatch + 1) % SWORD_TITLE_BATCHES.length;
      if (state.swordTitleMode === 'preset') state.swordTitleDraft = '';
      renderSwordTitleList();
      toast('已换一批剑号');
    });
    $('empSwordTitleList')?.addEventListener('click', function (e) {
      if (e.target.closest('.emp-sword-title-item__field')) {
        if (state.swordTitleMode !== 'custom') {
          state.swordTitleMode = 'custom';
          var fieldInp = $('empSwordCustomInput');
          state.swordTitleDraft = fieldInp ? swordCustomPrefix(fieldInp.value) : '';
          renderSwordTitleList();
        }
        setTimeout(function () {
          var focusInp = $('empSwordCustomInput');
          if (focusInp) focusInp.focus();
        }, 0);
        return;
      }
      var btn = e.target.closest('[data-sword-title-mode]');
      if (!btn) return;
      state.swordTitleMode = btn.dataset.swordTitleMode;
      if (state.swordTitleMode === 'none') state.swordTitleDraft = '';
      if (state.swordTitleMode === 'preset') state.swordTitleDraft = btn.dataset.swordTitle || '';
      if (state.swordTitleMode === 'custom') {
        var inp = $('empSwordCustomInput');
        state.swordTitleDraft = inp ? swordCustomPrefix(inp.value) : '';
      }
      renderSwordTitleList();
      if (state.swordTitleMode === 'custom') {
        var focusInp2 = $('empSwordCustomInput');
        if (focusInp2) focusInp2.focus();
      }
    });
    $('empSwordTitleList')?.addEventListener('input', function (e) {
      if (e.target.id !== 'empSwordCustomInput') return;
      state.swordTitleMode = 'custom';
      state.swordTitleDraft = swordCustomPrefix(e.target.value);
      if (e.target.value !== state.swordTitleDraft) e.target.value = state.swordTitleDraft;
      document.querySelectorAll('#empSwordTitleList .emp-sword-title-item').forEach(function (el) {
        var on = el.dataset.swordTitleMode === 'custom';
        el.classList.toggle('is-on', on);
        var radio = el.querySelector('.emp-sword-radio');
        if (radio) radio.innerHTML = on ? checkSvg12() : '';
      });
    });
    $('empSwordTitleConfirm')?.addEventListener('click', confirmSwordTitle);

    $('empRowSword')?.addEventListener('click', openSwordPicker);
    $('empSwordClose')?.addEventListener('click', function () { closeMask('empSwordMask'); });
    $('empSwordGrid')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sword-id]');
      if (!btn) return;
      state.swordDraftId = btn.dataset.swordId;
      renderSwordGrid();
    });
    $('empSwordConfirm')?.addEventListener('click', confirmSword);

    $('empRowScheme')?.addEventListener('click', function () {
      openSchemePickSheet();
    });
    $('empSchemePickList')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-scheme-pick]');
      if (!btn) return;
      applySchemePick(btn.dataset.schemePick || '');
      closeMask('empSchemePickMask');
    });
    $('empSchemePickCancel')?.addEventListener('click', function () {
      resetSchemePickSheetChrome();
      closeMask('empSchemePickMask');
    });
    $('empRewardStaffList')?.addEventListener('click', function (e) {
      var card = e.target.closest('[data-reward-staff-tog]');
      if (!card) return;
      var id = card.dataset.rewardStaffTog;
      if (!state.rewardStaffSel) state.rewardStaffSel = {};
      state.rewardStaffSel[id] = !state.rewardStaffSel[id];
      renderRewardStaffPickList();
    });
    $('empRewardStaffSelectAll')?.addEventListener('click', function () {
      state.rewardStaffSel = {};
      storeActiveStaff().forEach(function (s) { state.rewardStaffSel[s.id] = true; });
      renderRewardStaffPickList();
    });
    $('empRewardStaffClear')?.addEventListener('click', function () {
      state.rewardStaffSel = {};
      renderRewardStaffPickList();
    });
    $('empRewardStaffOk')?.addEventListener('click', applyRewardStaffPick);
    $('empRewardStaffCancel')?.addEventListener('click', function () { closeMask('empRewardStaffMask'); });
    $('empRewardStaffMask')?.addEventListener('click', function (e) {
      if (e.target === $('empRewardStaffMask')) closeMask('empRewardStaffMask');
    });
    $('empSchemePickMask')?.addEventListener('click', function (e) {
      if (e.target === $('empSchemePickMask')) {
        resetSchemePickSheetChrome();
        closeMask('empSchemePickMask');
      }
    });
    $('empSchemePickGoto')?.addEventListener('click', function () {
      resetSchemePickSheetChrome();
      closeMask('empSchemePickMask');
      /* 独立原型：旧「提成方案」页未迁入，跳转左侧提成设置列表 */
      if (typeof window.Comm2Demo !== 'undefined' && typeof window.Comm2Demo.openList === 'function') {
        window.Comm2Demo.openList();
        if (typeof setFlowNavHighlight === 'function') setFlowNavHighlight('comm2-list');
      } else {
        toast('请用左侧「提成设置」管理方案', true);
      }
    });
    $('empPermInfo')?.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPermHelpDialog();
    });
    $('empPermHelpOk')?.addEventListener('click', function () { closeEmpDialog('empPermHelpMask'); });
    $('empPermHelpMask')?.addEventListener('click', function (e) {
      if (e.target === $('empPermHelpMask')) closeEmpDialog('empPermHelpMask');
    });
    $('empRowPerm')?.addEventListener('click', function () {
      var cur = $('empFPerm').textContent;
      if (cur === '请选择员工权限' || cur === '请选择员工角色') cur = '';
      renderPermPickerList(cur);
      openMask('empPermMask');
    });
    $('empSensitiveToggle')?.addEventListener('click', function () {
      var body = $('empSensitiveBody');
      if (!body) return;
      syncSensitiveCollapse(body.classList.contains('hidden'));
    });
    $('empSensitivePermsCard')?.addEventListener('click', function (e) {
      var sw = e.target.closest('[data-sensitive-key]');
      if (!sw || !state.formSensitivePerms) return;
      var key = sw.dataset.sensitiveKey;
      if (!key || !state.formSensitivePerms.hasOwnProperty(key)) return;
      var on = !state.formSensitivePerms[key];
      state.formSensitivePerms[key] = on;
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('empRowStatus')?.addEventListener('click', function () {
      renderStatusPickerList($('empFStatus').textContent);
      openMask('empStatusMask');
    });

    ['empRoleList', 'empPermList', 'empGenderList', 'empAgeBandList'].forEach(function (listId) {
      $(listId)?.addEventListener('click', function (e) {
        if (listId === 'empRoleList') {
          var editBtn = e.target.closest('[data-role-edit]');
          if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            openRoleNameDialog('rename', editBtn.dataset.roleEdit, 'picker');
            return;
          }
          var pickBtn = e.target.closest('[data-role-val]');
          if (!pickBtn) return;
          if (pickBtn.dataset.roleTaken === '1' || pickBtn.classList.contains('is-disabled')) {
            toast(uniqueRoleTakenMessage(pickBtn.dataset.roleVal), true);
            return;
          }
          $('empFRole').textContent = pickBtn.dataset.roleVal;
          $('empFRole').classList.add('has-val');
          closeMask('empRoleMask');
          return;
        }
        var btn = e.target.closest('button');
        if (!btn) return;
        if (listId === 'empPermList') {
          $('empFPerm').textContent = btn.dataset.permVal;
          $('empFPerm').classList.add('has-val');
          resetSensitivePermsForRole(btn.dataset.permVal);
          closeMask('empPermMask');
        }
        if (listId === 'empGenderList') {
          $('empFGender').textContent = btn.dataset.genderVal;
          $('empFGender').classList.add('has-val');
          closeMask('empGenderMask');
        }
        if (listId === 'empAgeBandList') {
          $('empFAgeBand').textContent = btn.dataset.ageVal;
          $('empFAgeBand').classList.add('has-val');
          closeMask('empAgeBandMask');
        }
      });
    });
    $('empStatusList')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-status-val]');
      if (!btn) return;
      var val = btn.dataset.statusVal;
      closeMask('empStatusMask');
      if (val === '离职') {
        openLeaveConfirm('form');
        return;
      }
      applyFormStatus(val);
    });
    $('empLeaveConfirmCancel')?.addEventListener('click', closeLeaveConfirm);
    $('empLeaveConfirmOk')?.addEventListener('click', function () {
      if (state.leaveConfirmSource === 'detail') {
        applyStaffStatus('离职');
        closeLeaveConfirm();
        return;
      }
      applyFormStatus('离职');
      closeLeaveConfirm();
      toast('已标记注销，保存后生效');
    });
    $('empLeaveConfirmMask')?.addEventListener('click', function (e) {
      if (e.target === $('empLeaveConfirmMask')) closeLeaveConfirm();
    });
    $('empRoleCancel')?.addEventListener('click', function () { closeMask('empRoleMask'); });
    $('empPermCancel')?.addEventListener('click', function () { closeMask('empPermMask'); });
    $('empStatusCancel')?.addEventListener('click', function () { closeMask('empStatusMask'); });
    $('empDetailStatusCancel')?.addEventListener('click', closeDetailStatusSheet);
    $('empDetailStatusMask')?.addEventListener('click', function (e) {
      if (e.target.id === 'empDetailStatusMask') closeDetailStatusSheet();
    });
    $('empDetailStatusList')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-detail-status]');
      if (!btn) return;
      handleDetailStatusPick(btn.dataset.detailStatus);
    });
    $('empDetailBody')?.addEventListener('click', function (e) {
      if (!e.target.closest('[data-emp-status-chip]')) return;
      openDetailStatusSheet();
    });
    $('empGenderCancel')?.addEventListener('click', function () { closeMask('empGenderMask'); });
    $('empAgeBandCancel')?.addEventListener('click', function () { closeMask('empAgeBandMask'); });

    $('empMonthLabel')?.addEventListener('click', function () { renderMonthPicker(); openMask('empMonthMask'); });
    $('empMonthList')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-month]');
      if (!btn) return;
      state.salaryMonth = btn.dataset.month;
      closeMask('empMonthMask');
      resetCommDetailScope();
      renderSalaryList();
      if (state.currentStaffId && !$('screen-emp-pay-detail')?.classList.contains('hidden')) {
        renderEmpPayDetail(state.currentStaffId);
      }
      if (state.currentStaffId && !$('screen-emp-salary-detail')?.classList.contains('hidden')) {
        renderSalaryDetail(state.currentStaffId);
      }
      if (state.rewardDetailStaffId && !$('screen-emp-reward-detail')?.classList.contains('hidden')) {
        renderRewardDetail(state.rewardDetailStaffId);
      }
      if (!$('screen-emp-rewards')?.classList.contains('hidden')) {
        renderRewards();
      }
    });
    $('empMonthCancel')?.addEventListener('click', function () { closeMask('empMonthMask'); });

    $('empPayCycleEntry')?.addEventListener('click', function () { openPayCycleSettings(); });
    $('empToneToggle')?.addEventListener('click', function () {
      var box = $('empSalarySummary');
      if (!box) return;
      var open = box.classList.toggle('is-tones-open');
      var btn = $('empToneToggle');
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('empPayCycleBack')?.addEventListener('click', function () { returnFromPayCycleSettings(); });
    $('empPayCycleSave')?.addEventListener('click', function () { savePayCycleSettings(); });
    $('empPayCycleBody')?.addEventListener('click', function (e) {
      if (!canEditPayDay()) {
        if (e.target.closest('[data-pay-cycle-mode],[data-pay-cycle-day-delta],[data-pay-day-delta],[data-pay-day-reset]')) {
          toast('仅店主/合伙人可修改', true);
        }
        return;
      }
      var modeBtn = e.target.closest('[data-pay-cycle-mode]');
      if (modeBtn) {
        if (!state.payCycleDraft) state.payCycleDraft = { mode: 'calendar', settleDay: 25, payDayManual: false };
        state.payCycleDraft.mode = modeBtn.dataset.payCycleMode === 'custom' ? 'custom' : 'calendar';
        renderPayCycleSettings();
        return;
      }
      var step = e.target.closest('[data-pay-cycle-day-delta]');
      if (step) {
        if (!state.payCycleDraft) state.payCycleDraft = { mode: 'custom', settleDay: 25, payDayManual: false };
        var next = (Number(state.payCycleDraft.settleDay) || 25) + Number(step.dataset.payCycleDayDelta);
        if (next < 1) next = 1;
        if (next > 28) next = 28;
        state.payCycleDraft.settleDay = next;
        state.payCycleDraft.mode = 'custom';
        if (!state.payCycleDraft.payDayManual) {
          state.payCycleDraft.payDayOfMonth = defaultPayDayFromSettle(next);
        }
        renderPayCycleSettings();
        return;
      }
      var payStep = e.target.closest('[data-pay-day-delta]');
      if (payStep) {
        if (!state.payCycleDraft) state.payCycleDraft = { mode: 'calendar', settleDay: 25 };
        var pd = (Number(state.payCycleDraft.payDayOfMonth) || defaultPayDayFromSettle(state.payCycleDraft.settleDay || 25)) +
          Number(payStep.dataset.payDayDelta);
        if (pd < 1) pd = 1;
        if (pd > 30) pd = 30;
        state.payCycleDraft.payDayOfMonth = pd;
        state.payCycleDraft.payDayManual = true;
        renderPayCycleSettings();
        return;
      }
      if (e.target.closest('[data-pay-day-reset]')) {
        if (!state.payCycleDraft) return;
        state.payCycleDraft.payDayManual = false;
        state.payCycleDraft.payDayOfMonth = defaultPayDayFromSettle(state.payCycleDraft.settleDay || 25);
        renderPayCycleSettings();
      }
    });

    $('empBtnRewardsSet')?.addEventListener('click', function () {
      state.editingRewardId = null;
      state.rewardDraft = null;
      state.rewardFormReturn = 'salary';
      ensureRewardDraft({});
      renderRewards();
      showScreen('screen-emp-rewards');
      nav('staff-rewards');
    });

    $('empBtnRewardSave')?.addEventListener('click', function () {
      var returnTo = state.rewardFormReturn;
      var detailId = state.rewardDetailStaffId;
      if (!saveRewardDraft()) return;
      renderSalaryList();
      if (returnTo === 'detail' && detailId) {
        renderRewardDetail(detailId);
        showScreen('screen-emp-reward-detail');
        nav('staff-reward-detail');
      } else {
        showScreen('screen-emp-salary');
        nav('staff-salary');
      }
    });

    $('empRewardForm')?.addEventListener('click', function (e) {
      if (e.target.closest('#empRewardStaffBtn')) {
        openRewardStaffPick();
        return;
      }
      if (e.target.closest('#empRewardDateBtn')) {
        toast('演示固定为结算月日期');
        return;
      }
      var typeBtn = e.target.closest('[data-reward-type]');
      if (typeBtn) {
        syncRewardDraftFromForm();
        if (!state.rewardDraft) state.rewardDraft = {};
        state.rewardDraft.type = typeBtn.dataset.rewardType === 'deduct' ? 'deduct' : 'reward';
        renderRewards();
      }
    });

    $('empRewardDetailBody')?.addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-reward-edit]');
      if (editBtn) {
        var item = rewardMonthItems(state.salaryMonth).find(function (r) { return r.id === editBtn.dataset.rewardEdit; });
        if (!item) return;
        ensureRewardDraft({ item: item });
        state.rewardFormReturn = 'detail';
        renderRewards();
        showScreen('screen-emp-rewards');
        nav('staff-rewards');
        return;
      }
      var delBtn = e.target.closest('[data-reward-del]');
      if (delBtn) {
        if (!window.confirm('确定删除该奖惩记录？')) return;
        deleteRewardById(delBtn.dataset.rewardDel);
        renderSalaryList();
      }
    });

    $('empSalaryDetailBody')?.addEventListener('click', function (e) {
      if (e.target.closest('#empCommEditBannerGo')) {
        commEditBannerGo();
        return;
      }
      if (e.target.closest('#empCommEditBannerClose')) {
        var bn = $('empCommEditBanner');
        if (bn && bn.parentNode) bn.parentNode.removeChild(bn);
        return;
      }
      if (e.target.closest('#empCommDetailDateBtn')) {
        openCommDetailDateSheet();
        return;
      }
      if (e.target.closest('#empCommDetailPrev')) {
        if (!state.currentStaffId) return;
        shiftCommDetailScopedDay(state.currentStaffId, -1);
        renderSalaryDetail(state.currentStaffId);
        return;
      }
      if (e.target.closest('#empCommDetailNext')) {
        if (!state.currentStaffId) return;
        shiftCommDetailScopedDay(state.currentStaffId, 1);
        renderSalaryDetail(state.currentStaffId);
        return;
      }
      var logBtn = e.target.closest('[data-comm-edit-log]');
      if (logBtn) {
        e.stopPropagation();
        openCommEditLogSheet(logBtn.dataset.commEditLog);
        return;
      }
      var editBtn = e.target.closest('[data-comm-edit]');
      if (editBtn) {
        e.stopPropagation();
        openCommLineEditSheet(editBtn.dataset.commEdit);
        return;
      }
      var lineBtn = e.target.closest('[data-comm-line]');
      if (lineBtn) {
        handleCommLineTap(lineBtn.dataset.commLine);
      }
    });

    $('empPayDetailBody')?.addEventListener('click', function (e) {
      if (e.target.closest('#empPayDetailMonth')) {
        renderMonthPicker();
        openMask('empMonthMask');
        return;
      }
      if (e.target.closest('#empPayDetailAllRewards')) {
        var sid = state.currentStaffId;
        if (sid) {
          renderRewardDetail(sid);
          showScreen('screen-emp-reward-detail');
          nav('staff-reward-detail');
        }
      }
    });

    $('empCommViewerToggle')?.addEventListener('click', function () {
      state.commDetailViewer = state.commDetailViewer === 'staff' ? 'owner' : 'staff';
      state.commDetailFilter = 'all';
      if (state.currentStaffId) renderSalaryDetail(state.currentStaffId);
      else syncCommViewerToggleBtn();
    });

    $('empCommLineEditCancel')?.addEventListener('click', function () {
      closeMask('empCommLineEditMask');
      state.commLineEditId = null;
    });
    $('empCommLineEditOk')?.addEventListener('click', function () { submitCommLineEdit(); });
    $('empCommLineEditFocus')?.addEventListener('click', function (e) {
      e.preventDefault();
      focusCommLineEditInput();
    });
    $('empCommEditLogClose')?.addEventListener('click', function () {
      closeMask('empCommEditLogMask');
    });
    $('empCommEditLogMask')?.addEventListener('click', function (e) {
      if (e.target === $('empCommEditLogMask')) closeMask('empCommEditLogMask');
    });
    $('empCommLineConsentReject')?.addEventListener('click', function () {
      var ln = state.commLineActId && state.currentStaffId
        ? findCommLine(state.currentStaffId, state.commLineActId) : null;
      if (!ln || !canUserConfirmPending(ln)) {
        closeMask('empCommLineConsentMask');
        return;
      }
      if (state.commLineActId) rejectCommLinePending(state.commLineActId);
    });
    $('empCommLineConsentOk')?.addEventListener('click', function () {
      var ln = state.commLineActId && state.currentStaffId
        ? findCommLine(state.currentStaffId, state.commLineActId) : null;
      if (!ln || !canUserConfirmPending(ln)) {
        closeMask('empCommLineConsentMask');
        state.commLineActId = null;
        return;
      }
      if (state.commLineActId) approveCommLinePending(state.commLineActId);
    });
    $('empCommLineActCancel')?.addEventListener('click', function () {
      closeMask('empCommLineActMask');
      state.commLineActId = null;
    });
    $('empCommLineActEdit')?.addEventListener('click', function () {
      var id = state.commLineActId;
      closeMask('empCommLineActMask');
      if (id) openCommLineEditSheet(id);
    });
    $('empCommLineActWithdraw')?.addEventListener('click', function () {
      if (state.commLineActId) withdrawCommLinePending(state.commLineActId);
    });

    $('empCommDateCancel')?.addEventListener('click', function () { closeMask('empCommDateMask'); });
    $('empCommDateOk')?.addEventListener('click', function () { confirmCommDetailDateDraft(); });
    $('empCommDateQuick')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-emp-comm-quick]');
      if (!btn) return;
      var q = btn.dataset.empCommQuick;
      var parts = periodParts(state.salaryMonth);
      if (q === 'month') {
        state.commDetailCalDraftScope = 'month';
        state.commDetailCalDraftDay = null;
        confirmCommDetailDateDraft();
        return;
      }
      var k = q === 'yesterday' ? shiftYmd(todayYmd(), -1) : todayYmd();
      if (k < parts.start || k > parts.end) {
        toast((q === 'yesterday' ? '昨天' : '今天') + '不在本结算周期内', true);
        return;
      }
      state.commDetailCalDraftScope = 'day';
      state.commDetailCalDraftDay = k;
      var p = parseYmd(k);
      state.commDetailCalYear = p.getFullYear();
      state.commDetailCalMonth = p.getMonth();
      confirmCommDetailDateDraft();
    });
    $('empCommDateCal')?.addEventListener('click', function (e) {
      var navBtn = e.target.closest('[data-emp-comm-cal-nav]');
      if (navBtn && !navBtn.disabled) {
        shiftCommDetailCalMonth(Number(navBtn.dataset.empCommCalNav));
        return;
      }
      var dayBtn = e.target.closest('[data-emp-comm-cal-day]');
      if (!dayBtn || dayBtn.disabled) return;
      state.commDetailCalDraftScope = 'day';
      state.commDetailCalDraftDay = dayBtn.dataset.empCommCalDay;
      renderCommDetailCalendar();
    });

    $('empSalaryList')?.addEventListener('click', function (e) {
      var link = e.target.closest('[data-salary-detail]');
      if (link) {
        e.stopPropagation();
        var sid = link.dataset.salaryDetail;
        var kind = link.dataset.detailKind;
        if (kind === 'reward') {
          renderRewardDetail(sid);
          showScreen('screen-emp-reward-detail');
          nav('staff-reward-detail');
          return;
        }
        resetCommDetailScope();
        state.commDetailViewer = isStaffSelfViewer() ? 'staff' : 'owner';
        state.commDetailFilter = 'all';
        renderSalaryDetail(sid);
        showScreen('screen-emp-salary-detail');
        nav('staff-salary-detail');
        return;
      }
      var card = e.target.closest('[data-salary-staff]');
      if (!card) return;
      openEmpPayDetail(card.dataset.salaryStaff);
    });

    document.body.addEventListener('click', function (e) {
      if (e.target.id === 'empBtnViewRewards') {
        var sid = state.currentStaffId || state.rewardDetailStaffId;
        if (sid) {
          renderRewardDetail(sid);
          showScreen('screen-emp-reward-detail');
          nav('staff-reward-detail');
        } else {
          state.editingRewardId = null;
          state.rewardDraft = null;
          state.rewardFormReturn = 'salary';
          ensureRewardDraft({});
          renderRewards();
          showScreen('screen-emp-rewards');
          nav('staff-rewards');
        }
      }
    });

    $('empAchTabs')?.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-ach-tab]');
      if (!tab) return;
      state.achTab = tab.dataset.achTab;
      if (state.achTab === 'base') {
        renderAch();
        nav('staff-ach-adv');
        return;
      }
      if (state.achTab === 'card') state.achCatId = 'card_rules';
      else if (state.achTab === 'labor' || state.achTab === 'sales') state.achCatId = getAchCommonRulesCatId(state.achTab);
      else state.achCatId = null;
      renderAch();
      nav('staff-ach');
    });
    $('empAchCats')?.addEventListener('click', function (e) {
      var cat = e.target.closest('[data-ach-cat]');
      if (!cat) return;
      state.achCatId = cat.dataset.achCat;
      renderAch();
    });
    $('empAchItems')?.addEventListener('click', function (e) {
      var infoBtn = e.target.closest('[data-ach-info-help]');
      if (infoBtn) {
        e.stopPropagation();
        var helpKind = infoBtn.dataset.achInfoHelp;
        if (helpKind === 'calcMode') {
          openEmpAchInfoHelp('计算模式说明',
            '<p><strong>平均分配：</strong>开单无需选择工位，多人平分业绩。</p>' +
            '<p><strong>按工位分配：</strong>开单需选择工位，并可分工位配置点客/散客。</p>');
        } else if (helpKind === 'tabDefault') {
          var noun = infoBtn.dataset.achInfoNoun || '项目';
          openEmpAchInfoHelp('默认业绩方案说明',
            '<p>新建' + esc(noun) + '默认沿用此方案；已单独设置的' + noun + '不受影响。</p>');
        } else if (helpKind === 'cardIncome') {
          openEmpAchInfoHelp('默认收入比例说明',
            '<p>按卡模板权益展示开卡/充值/续次/延期的默认收入比例与计入基数。</p>');
        }
        return;
      }
      var calcBtn = e.target.closest('[data-calc-kind][data-calc-mode]');
      if (calcBtn) {
        e.stopPropagation();
        if (state.calcModePending) return;
        var kind = calcBtn.dataset.calcKind;
        var next = calcBtn.dataset.calcMode === 'station' ? 'station' : 'avg';
        var prev = getAchCalcMode(kind);
        if (prev === next) return;
        openCalcModeConfirm(kind, prev, next);
        return;
      }
      var cap = e.target.closest('.emp-ach-cap');
      if (cap) {
        e.stopPropagation();
        var stationId = cap.dataset.achCapStation || undefined;
        if (cap.dataset.achCapTabDefault) {
          openTabDefaultEditor(state.achTab, stationId);
          return;
        }
        if (cap.dataset.achCapCardDefault && cap.dataset.achCapType) {
          openCardIncomeTypeEditor(cap.dataset.achCapType, stationId);
          return;
        }
        if (cap.dataset.achCapType && cap.dataset.achCapItem) {
          openCardItemTypeEditor(cap.dataset.achCapItem, cap.dataset.achCapType, stationId);
          return;
        }
        if (cap.dataset.achCapItem) {
          openAchItemEditor(cap.dataset.achCapItem, stationId);
          return;
        }
      }
      if (e.target.closest('[data-card-ach-base]')) {
        state.ruleEditIdx = 'card_base';
        $('empRuleTitle').textContent = '计入基数';
        var curBase = (window.EmployeeStore.ach.card && window.EmployeeStore.ach.card.baseMode) || '按实收金额';
        var baseOpts = ['按实收金额', '按售价', '不计算业绩'];
        $('empRuleList').innerHTML = baseOpts.map(function (o) {
          return '<button type="button" class="emp-rule-opt' + (o === curBase ? ' on' : '') +
            '" data-rule-val="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('');
        openMask('empRuleMask');
        return;
      }
      var tabBaseBtn = e.target.closest('[data-tab-ach-base]');
      if (tabBaseBtn) {
        var tabKind = tabBaseBtn.dataset.tabAchBase;
        state.ruleEditIdx = tabKind + '_base';
        $('empRuleTitle').textContent = '计入基数';
        var curTabBase = getTabAchBaseMode(tabKind);
        $('empRuleList').innerHTML = ['按实收金额', '按售价', '不计算业绩'].map(function (o) {
          return '<button type="button" class="emp-rule-opt' + (o === curTabBase ? ' on' : '') +
            '" data-rule-val="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('');
        openMask('empRuleMask');
        return;
      }
      var tabDefaultHead = e.target.closest('[data-ach-tab-default]');
      if (tabDefaultHead) {
        openTabDefaultEditor(tabDefaultHead.dataset.achTabDefault || state.achTab);
        return;
      }
      var incomeHead = e.target.closest('.emp-ach-income-card__head[data-card-income-type]');
      if (incomeHead) {
        openCardIncomeTypeEditor(incomeHead.dataset.cardIncomeType);
        return;
      }
      var incomeType = e.target.closest('[data-card-income-type]');
      if (incomeType && !e.target.closest('.emp-ach-cap')) {
        openCardIncomeTypeEditor(incomeType.dataset.cardIncomeType);
        return;
      }
      var cardType = e.target.closest('[data-ach-card-type]');
      if (cardType) {
        var cardRow = cardType.closest('[data-ach-item]');
        if (cardRow) openCardItemTypeEditor(cardRow.dataset.achItem, cardType.dataset.achCardType);
        return;
      }
      var itemRow = e.target.closest('[data-ach-item]');
      if (itemRow && state.achTab !== 'card' && !isAchCommonRulesCat(state.achCatId, state.achTab)) {
        openAchItemEditor(itemRow.dataset.achItem);
      }
    });
    $('empBtnAchHelp')?.addEventListener('click', function () { openEmpDialog('empAchHelpMask'); });
    $('empAchHelpOk')?.addEventListener('click', function () { closeEmpDialog('empAchHelpMask'); });
    $('empAchHelpMask')?.addEventListener('click', function (e) {
      if (e.target === $('empAchHelpMask')) closeEmpDialog('empAchHelpMask');
    });
    /* 业绩设置 · 简单模式 */
    $('achSimpleList')?.addEventListener('click', function (e) {
      var advBtn = e.target.closest('[data-ach-simple-adv]');
      if (advBtn) {
        state.achSimpleAdvReturn = true;
        syncAchSimpleMianDanToGlobal(getAchSimpleTemplate());
        openAch();
        return;
      }
      var fieldBtn = e.target.closest('[data-ach-simple-field]');
      if (fieldBtn) {
        var ref = fieldBtn.dataset.achSimpleField;
        var idx = ref.indexOf(':');
        var fTpl = ref.slice(0, idx);
        var fKey = ref.slice(idx + 1);
        var tplDef = ACH_SIMPLE_TEMPLATES.find(function (t) { return t.id === fTpl; });
        var field = tplDef && tplDef.fields.find(function (f) { return (f.station || f.key) === fKey; });
        /* 需先选中卡片，才能编辑其字段：未选中时点击字段只做选中 */
        var visuallyOn = !state.achSimpleAdvReturn && getAchSimpleTemplate() === fTpl;
        if (!visuallyOn) {
          applyAchSimpleTemplate(fTpl);
          return;
        }
        if (field && field.toggle) {
          applyAchSimpleMianDan(fTpl, !getAchSimpleMianDan(fTpl));
          return;
        }
        if (field && field.select) {
          var baseOpt = e.target.closest('[data-ach-simple-base]');
          if (baseOpt) setAchSimpleBase(fTpl, baseOpt.dataset.achSimpleBase);
          return;
        }
        openAchSimpleRateEdit(fTpl, fKey);
        return;
      }
      var tpl = e.target.closest('[data-ach-simple-tpl]');
      if (tpl) applyAchSimpleTemplate(tpl.dataset.achSimpleTpl);
    });
    $('achSimpleDone')?.addEventListener('click', backWorkbench);
    $('achSimpleRateClose')?.addEventListener('click', function () { closeMask('achSimpleRateMask'); });
    $('achSimpleRateDone')?.addEventListener('click', finishAchSimpleRate);
    $('empAchEditBody')?.addEventListener('click', function (e) {
      var stepBtn = e.target.closest('[data-ach-step]');
      if (stepBtn && state.achEdit) {
        var field = stepBtn.dataset.achStep;
        var dir = parseInt(stepBtn.dataset.achDir, 10) || 0;
        var idMap = { des: 'empAchEditDes', non: 'empAchEditNon', desAmt: 'empAchEditDesAmt', nonAmt: 'empAchEditNonAmt' };
        var input = $(idMap[field]);
        if (!input) return;
        var step = (field === 'desAmt' || field === 'nonAmt') ? 1 : 1;
        var cur = parseFloat(input.value);
        if (isNaN(cur)) cur = 0;
        var next = cur + dir * step;
        if (field === 'des' || field === 'non') {
          if (next < 0) next = 0;
          if (next > 100) next = 100;
        } else {
          if (next < 0) next = 0;
        }
        input.value = String(next);
        return;
      }
      var stBtn = e.target.closest('[data-ach-edit-station]');
      if (stBtn && state.achEdit) {
        var flushed = flushAchEditStationFromDom();
        if (flushed.error) { toast(flushed.error, true); return; }
        state.achEdit.stationId = stBtn.dataset.achEditStation;
        refreshAchEditBody();
        return;
      }
      if (e.target.closest('#empAchApplyStations')) {
        applyAchEditToAllStations();
        return;
      }
      var vm = e.target.closest('[data-ach-value-mode]');
      if (vm && state.achEdit) {
        if (isAchPctOnlyEdit()) return;
        var nextMode = vm.dataset.achValueMode;
        if (state.achEdit.valueMode === nextMode) return;
        flushAchEditStationFromDom();
        state.achEdit.valueMode = nextMode;
        refreshAchEditBody();
        return;
      }
      var cm = e.target.closest('[data-ach-cost-mode]');
      if (cm && state.achEdit) {
        var nextCost = cm.dataset.achCostMode;
        if (state.achEdit.costMode === nextCost) return;
        flushAchEditStationFromDom();
        state.achEdit.costMode = nextCost;
        refreshAchEditBody();
        if (nextCost === 'receipt' || nextCost === 'price' || nextCost === 'fixed') {
          revealAchEditCostField();
        }
      }
    });
    $('empAchEditSave')?.addEventListener('click', function () { saveAchEdit(false); });
    $('empAchEditSaveCopy')?.addEventListener('click', function () { saveAchEdit(true); });
    $('empAchEditMask')?.addEventListener('click', function (e) {
      if (e.target === $('empAchEditMask')) {
        closeMask('empAchEditMask');
        state.achEdit = null;
      }
    });

    $('empAdvRules')?.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-adv-rule-id][data-adv-rule-val]');
      if (!opt) return;
      ensureAdvRules();
      var rule = (window.EmployeeStore.advRules || []).find(function (r) { return r.id === opt.dataset.advRuleId; });
      if (!rule) return;
      var next = opt.dataset.advRuleVal;
      if (!next || next === rule.value) return;
      rule.value = next;
      renderAdv();
      invalidateCommLineCache();
      toast('「' + rule.label + '」已设为「' + next + '」');
    });
    $('empRuleList')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-rule-val]');
      if (btn == null || state.ruleEditIdx == null) return;
      if (state.ruleEditIdx === 'card_base') {
        var card = window.EmployeeStore.ach.card || ensureCardAchDefaults();
        card.baseMode = btn.dataset.ruleVal;
        window.EmployeeStore.ach.card = card;
        syncCardBaseToAdvRule();
        closeMask('empRuleMask');
        state.ruleEditIdx = null;
        renderAch();
        invalidateCommLineCache();
        toast('计入基数已更新');
        return;
      }
      if (state.ruleEditIdx === 'labor_base' || state.ruleEditIdx === 'sales_base') {
        var tabKind = state.ruleEditIdx === 'labor_base' ? 'labor' : 'sales';
        var bucket = window.EmployeeStore.ach[tabKind];
        if (bucket) {
          bucket.baseMode = btn.dataset.ruleVal;
          closeMask('empRuleMask');
          state.ruleEditIdx = null;
          renderAch();
          invalidateCommLineCache();
          toast('计入基数已更新');
        }
        return;
      }
      closeMask('empRuleMask');
      state.ruleEditIdx = null;
    });
    $('empRuleCancel')?.addEventListener('click', function () { closeMask('empRuleMask'); });
    $('empCalcModeConfirmCancel')?.addEventListener('click', function () {
      closeCalcModeConfirm(true);
    });
    $('empCalcModeConfirmOk')?.addEventListener('click', confirmCalcModeAndGoAch);
    $('empCalcModeConfirmMask')?.addEventListener('click', function (e) {
      if (e.target === $('empCalcModeConfirmMask')) closeCalcModeConfirm(true);
    });
    $('empStationMap')?.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-station-id]');
      if (!inp) return;
      var raw = String(inp.value || '');
      if (raw.length > STATION_NAME_MAX) {
        inp.value = raw.slice(0, STATION_NAME_MAX);
        toast('工位名称不得多于' + STATION_NAME_MAX + '个字', true);
      }
    });
    $('empStationMap')?.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-station-id]');
      if (!inp) return;
      var res = setStationLabel(inp.dataset.stationId, inp.value);
      if (!res.ok) {
        inp.value = res.fallback || getStationLabel(inp.dataset.stationId);
        if (res.error) toast(res.error, true);
        return;
      }
      inp.value = res.value;
      toast('工位名称已更新');
    });
    $('empBtnStationMapReset')?.addEventListener('click', function () {
      resetStationMapToDefault();
      renderAdv();
      toast('已恢复为默认工位名称');
    });

    $('empCommList')?.addEventListener('click', function (e) {
      var menu = e.target.closest('[data-scheme-menu]');
      if (menu) {
        e.stopPropagation();
        state.schemeMenuId = menu.dataset.schemeMenu;
        var sch = schemeById(state.schemeMenuId);
        $('empSchemeMenuTitle').textContent = sch ? sch.name : '提成方案';
        openMask('empSchemeMenuMask');
        return;
      }
      var assignBtn = e.target.closest('[data-scheme-assign]');
      if (assignBtn) {
        e.stopPropagation();
        openAssignStaff(assignBtn.dataset.schemeAssign, 'screen-emp-comm');
        return;
      }
      var editBtn = e.target.closest('[data-scheme-edit]');
      if (editBtn) {
        openCommEditor(editBtn.dataset.schemeEdit);
        return;
      }
    });

    $('empSchemeMenuMask')?.addEventListener('click', function (e) {
      var act = e.target.closest('[data-scheme-act]');
      if (!act) return;
      var id = state.schemeMenuId;
      var sch = schemeById(id);
      closeMask('empSchemeMenuMask');
      if (act.dataset.schemeAct === 'cancel') return;
      if (!sch) return;
      if (act.dataset.schemeAct === 'rename') {
        $('empNameDialogTitle').textContent = '重命名方案';
        $('empNameDialogInput').value = sch.name;
        $('empNameDialogOk').textContent = '确定';
        state.schemeDraftName = '';
        state.schemeDraftType = null;
        state.editingSchemeId = id;
        openEmpDialog('empNameDialogMask');
        return;
      }
      if (act.dataset.schemeAct === 'copy') {
        var copy = JSON.parse(JSON.stringify(sch));
        copy.id = 'sch' + Date.now();
        copy.name = sch.name + ' 副本';
        copy.assigned = [];
        window.EmployeeStore.schemes.push(copy);
        invalidateCommLineCache();
        toast('方案已复制');
        renderCommList();
        return;
      }
      if (act.dataset.schemeAct === 'delete') {
        window.EmployeeStore.schemes = window.EmployeeStore.schemes.filter(function (s) { return s.id !== id; });
        syncAllStaffSchemeFields();
        invalidateCommLineCache();
        toast('方案已删除');
        renderCommList();
      }
    });

    $('empBtnAddScheme')?.addEventListener('click', openCreateSchemeTypeDialog);
    function closeSchemeTypeDialog() {
      closeEmpDialog('empSchemeTypeMask');
    }
    $('empSchemeTypeCancel')?.addEventListener('click', closeSchemeTypeDialog);
    $('empSchemeTypeMask')?.addEventListener('click', function (e) {
      if (e.target === $('empSchemeTypeMask')) closeSchemeTypeDialog();
      var tile = e.target.closest('[data-scheme-type]');
      if (!tile || !e.currentTarget.contains(tile)) return;
      var type = tile.dataset.schemeType;
      if (!type) return;
      state.schemeDraftType = type;
      state.schemeDraftName = '';
      state.editingSchemeId = null;
      closeSchemeTypeDialog();
      $('empNameDialogTitle').textContent = '新建提成方案';
      $('empNameDialogInput').value = '';
      $('empNameDialogOk').textContent = '创建';
      openEmpDialog('empNameDialogMask');
      setTimeout(function () { $('empNameDialogInput')?.focus(); }, 50);
    });
    $('empNameDialogCancel')?.addEventListener('click', function () {
      closeEmpDialog('empNameDialogMask');
      state.schemeDraftType = null;
    });
    $('empNameDialogOk')?.addEventListener('click', function () {
      var name = $('empNameDialogInput').value.trim();
      if (!name) { toast('请输入方案名称'); return; }
      closeEmpDialog('empNameDialogMask');
      /* 重命名：有 editingSchemeId 且无草稿类型 */
      if (state.editingSchemeId && !state.schemeDraftType) {
        var schRename = schemeById(state.editingSchemeId);
        if (schRename) { schRename.name = name; invalidateCommLineCache(); toast('已重命名'); renderCommList(); }
        return;
      }
      if (!state.schemeDraftType) { toast('请先选择方案类型', true); return; }
      createCommSchemeAndOpen(state.schemeDraftType, name);
    });
    $('empNameDialogMask')?.addEventListener('click', function (e) {
      if (e.target === $('empNameDialogMask')) {
        closeEmpDialog('empNameDialogMask');
        state.schemeDraftType = null;
      }
    });

    $('empTypeSheetMask')?.addEventListener('click', function (e) {
      if (e.target.id === 'empTypeCancel') closeMask('empTypeSheetMask');
    });

    $('empBtnCommHelp')?.addEventListener('click', function () { openEmpDialog('empHelpMask'); });
    $('empHelpOk')?.addEventListener('click', function () { closeEmpDialog('empHelpMask'); });
    $('empHelpMask')?.addEventListener('click', function (e) {
      if (e.target === $('empHelpMask')) closeEmpDialog('empHelpMask');
    });

    $('empLadderScopeEntry')?.addEventListener('click', function () {
      if (state.editingSchemeId) openLadderScopeEditor();
    });
    $('empScopeBack')?.addEventListener('click', function () {
      if (isScopeDraftDirty() && !window.confirm(state.scopePurpose === 'item' ? '放弃本次选择？' : '放弃本次范围修改？')) return;
      if (state.scopePurpose === 'item') {
        openItemCommEditor(state.editingSchemeId);
        return;
      }
      openCommEditor(state.editingSchemeId);
    });
    $('empScopeOk')?.addEventListener('click', function () {
      if (state.scopePurpose === 'item') {
        if (!applyItemPickDraftToScheme()) return;
        invalidateCommLineCache();
        toast('已更新提成项目');
        openItemCommEditor(state.editingSchemeId);
        return;
      }
      if (!applyScopeDraftToScheme()) return;
      invalidateCommLineCache();
      toast('使用范围已更新');
      openCommEditor(state.editingSchemeId);
    });
    $('empBtnAddItemComm')?.addEventListener('click', function () {
      var sch = schemeById(state.editingSchemeId);
      if (!sch || sch.itemOverridesEnabled === false) {
        toast('请先开启按项覆盖');
        return;
      }
      openItemSchemePick();
    });
    function bindItemSecSwitch(btnId, flagKey) {
      $(btnId)?.addEventListener('click', function () {
        var sch = schemeById(state.editingSchemeId);
        if (!sch || sch.type !== 'item') return;
        ensureItemScheme(sch);
        sch[flagKey] = !(sch[flagKey] !== false);
        syncItemSecSwitches(sch);
      });
    }
    bindItemSecSwitch('empItemCatEnabled', 'categoryDefaultsEnabled');
    bindItemSecSwitch('empItemOverrideEnabled', 'itemOverridesEnabled');
    $('empItemCatDefaults')?.addEventListener('click', function (e) {
      var info = e.target.closest('[data-item-cat-info]');
      if (info) {
        e.preventDefault();
        e.stopPropagation();
        openEmpAchInfoHelp('充卡说明', ITEM_COMM_CARD_HELP_HTML);
        return;
      }
      var sch = schemeById(state.editingSchemeId);
      if (sch && sch.categoryDefaultsEnabled === false) return;
      var btn = e.target.closest('[data-item-cat-key]');
      if (!btn) return;
      openItemCatDefaultEditor(btn.dataset.itemCatKey);
    });
    $('empItemCatDefaults')?.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('[data-item-cat-info]')) return;
      var btn = e.target.closest('[data-item-cat-key]');
      if (!btn) return;
      e.preventDefault();
      openItemCatDefaultEditor(btn.dataset.itemCatKey);
    });
    $('empItemCommEditTitle')?.addEventListener('click', function (e) {
      if (!e.target.closest('[data-item-cat-info]')) return;
      e.preventDefault();
      e.stopPropagation();
      openEmpAchInfoHelp('充卡说明', ITEM_COMM_CARD_HELP_HTML);
    });
    $('empItemCommList')?.addEventListener('click', function (e) {
      var schGuard = schemeById(state.editingSchemeId);
      if (schGuard && schGuard.itemOverridesEnabled === false) return;
      var del = e.target.closest('[data-item-comm-del]');
      if (del) {
        var dIdx = parseInt(del.dataset.itemCommDel, 10);
        var dSch = schemeById(state.editingSchemeId);
        if (!dSch || !Array.isArray(dSch.items) || !Number.isFinite(dIdx)) return;
        dSch.items.splice(dIdx, 1);
        renderItemCommList(dSch);
        return;
      }
      var editBtn = e.target.closest('[data-item-comm-edit]');
      if (editBtn) {
        var eIdx = parseInt(editBtn.dataset.itemCommEdit, 10);
        if (Number.isFinite(eIdx)) openItemCommRuleEditor(eIdx);
      }
    });
    $('empBtnSaveItemComm')?.addEventListener('click', function () {
      var sch = schemeById(state.editingSchemeId);
      if (!sch || sch.type !== 'item') return;
      ensureItemScheme(sch);
      toast('固定比例已保存');
      openComm();
    });
    $('empItemCommEditSave')?.addEventListener('click', function () { saveItemCommEdit(false); });
    $('empItemCommEditSaveCopy')?.addEventListener('click', function () { saveItemCommEdit(true); });
    $('empItemCommEditMask')?.addEventListener('click', function (e) {
      if (e.target === $('empItemCommEditMask')) {
        closeMask('empItemCommEditMask');
        state.itemCommEdit = null;
        return;
      }
      var modeBtn = e.target.closest('[data-item-value-mode]');
      if (modeBtn && state.itemCommEdit) {
        var nextMode = normalizeCommMode(modeBtn.dataset.itemValueMode);
        var parsedQuick = readItemCommEditFromDom();
        if (!parsedQuick.error) state.itemCommEdit.rule = parsedQuick.rule;
        state.itemCommEdit.rule.valueMode = nextMode;
        $('empItemCommEditBody').innerHTML = renderItemCommEditBody();
        return;
      }
      if (e.target.closest('#empItemByPayTypeSwitch') && state.itemCommEdit) {
        var parsedSw = readItemCommEditFromDom();
        if (!parsedSw.error) state.itemCommEdit.rule = parsedSw.rule;
        state.itemCommEdit.rule.byPayType = !state.itemCommEdit.rule.byPayType;
        $('empItemCommEditBody').innerHTML = renderItemCommEditBody();
      }
    });
    $('empItemCommEditBody')?.addEventListener('focusin', function (e) {
      var inp = e.target.closest('input.emp-comm-num');
      if (inp) focusCommNumInput(inp);
    });
    $('empItemCommEditBody')?.addEventListener('focusout', function (e) {
      var inp = e.target.closest('input.emp-comm-num');
      if (inp) blurCommNumInput(inp);
    });
    $('empScopeAllToggle')?.addEventListener('click', function () {
      if (!state.scopeDraft) return;
      var nextAll = state.scopeDraft.mode !== 'all';
      state.scopeDraft.mode = nextAll ? 'all' : 'custom';
      syncScopeAllToggleUi();
      if (!nextAll) renderScopeList();
    });
    document.querySelectorAll('.emp-scope-type-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.scopeType = btn.dataset.scopeType || 'project';
        if (state.scopeType === 'card' && typeof getActiveCardGroupId === 'function') {
          state.scopeGroupId = getActiveCardGroupId('empScope') || 'all';
        } else {
          state.scopeGroupId = 'all';
        }
        renderScopeScreen();
      });
    });
    $('empScopeGroupScroll')?.addEventListener('click', function (e) {
      var scroll = $('empScopeGroupScroll');
      if (scroll && scroll.classList.contains('is-panning')) return;
      var chip = e.target.closest('[data-scope-group]');
      if (!chip) return;
      state.scopeGroupId = chip.dataset.scopeGroup || 'all';
      if (state.scopeType === 'card' && typeof setActiveCardGroupId === 'function') {
        setActiveCardGroupId('empScope', state.scopeGroupId);
      }
      renderScopeGroupChips();
      renderScopeList();
      syncScopeSelectAllBtn();
    });
    $('empScopeSelectAll')?.addEventListener('click', function () {
      if (state.scopeDraft && state.scopeDraft.mode === 'all') {
        state.scopeDraft.mode = 'custom';
        syncScopeAllToggleUi();
      }
      if (isScopeVisibleAllSelected()) setScopeIdsForVisible('clear');
      else setScopeIdsForVisible(true);
    });
    $('empScopeInvert')?.addEventListener('click', function () {
      if (state.scopeDraft && state.scopeDraft.mode === 'all') {
        state.scopeDraft.mode = 'custom';
        syncScopeAllToggleUi();
      }
      setScopeIdsForVisible(false);
    });
    $('empScopeCount')?.addEventListener('click', function () {
      renderScopeSelectedSheet();
      openMask('empScopeSelectedMask');
    });
    $('empScopeSelectedClose')?.addEventListener('click', function () { closeMask('empScopeSelectedMask'); });
    $('empScopeSelectedDone')?.addEventListener('click', function () { closeMask('empScopeSelectedMask'); });
    $('empScopeSelectedList')?.addEventListener('click', function (e) {
      var del = e.target.closest('[data-scope-sheet-del]');
      if (!del) return;
      var row = del.closest('[data-scope-sheet-id]');
      if (!row || !state.scopeDraft) return;
      var type = row.dataset.scopeSheetType;
      var id = row.dataset.scopeSheetId;
      var key = scopeIdsKey(type);
      state.scopeDraft[key] = (state.scopeDraft[key] || []).filter(function (x) { return x !== id; });
      state.scopeDraft.mode = 'custom';
      renderScopeSelectedSheet();
      renderScopeList();
      syncScopeAllToggleUi();
    });
    $('empScopeList')?.addEventListener('click', function (e) {
      if (state.scopeDraft && state.scopeDraft.mode === 'all') return;
      var pick = e.target.closest('[data-scope-group-pick]');
      if (pick) {
        e.preventDefault();
        e.stopPropagation();
        pickScopeGroup(pick.dataset.scopeGroupPick);
        return;
      }
      var head = e.target.closest('[data-scope-group-toggle]');
      if (head) {
        pickScopeGroup(head.dataset.scopeGroupToggle);
        return;
      }
      var item = e.target.closest('[data-scope-item]');
      if (item) toggleScopeItem(item.dataset.scopeItem);
    });

    $('empLadderSettingsToggle')?.addEventListener('click', function () {
      state.ladderSettingsCollapsed = !state.ladderSettingsCollapsed;
      var sch = schemeById(state.editingSchemeId);
      if (sch) {
        syncLadderSettingsFold(sch);
        renderLadderStairs(sch);
      }
    });

    $('empBtnAddLadderTier')?.addEventListener('click', function () {
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      var draft = readLadderDraftFromDom() || sch.ladder || [];
      var last = draft[draft.length - 1];
      if (last && last.max == null) {
        last.max = (Number(last.min) || 0) + 10000;
      }
      var nextMin = last && last.max != null ? last.max : (last ? (Number(last.min) || 0) + 10000 : 0);
      draft.push({
        min: nextMin,
        max: null,
        pct: last ? last.pct : 8,
        mode: last ? normalizeCommMode(last.mode) : 'pct',
      });
      sch.ladder = draft;
      state.ladderExpandIdx = draft.length - 1;
      renderLadder(sch);
      flashLadderStep(state.ladderExpandIdx);
      toast('已添加第 ' + draft.length + ' 档');
    });

    $('empBtnResetLadderTiers')?.addEventListener('click', function () {
      openEmpDialog('empLadderResetConfirmMask');
    });
    $('empLadderResetConfirmCancel')?.addEventListener('click', function () {
      closeEmpDialog('empLadderResetConfirmMask');
    });
    $('empLadderResetConfirmOk')?.addEventListener('click', function () {
      closeEmpDialog('empLadderResetConfirmMask');
      resetLadderTiers();
    });
    $('empLadderResetConfirmMask')?.addEventListener('click', function (e) {
      if (e.target === $('empLadderResetConfirmMask')) closeEmpDialog('empLadderResetConfirmMask');
      if (e.target.closest('#empLadderResetConfirmOk')) {
        closeEmpDialog('empLadderResetConfirmMask');
        resetLadderTiers();
      }
      if (e.target.closest('#empLadderResetConfirmCancel')) closeEmpDialog('empLadderResetConfirmMask');
    });

    $('empLadderStairs')?.addEventListener('click', function (e) {
      var delBtn = e.target.closest('[data-ladder-del]');
      if (delBtn) {
        e.stopPropagation();
        var schDel = schemeById(state.editingSchemeId);
        if (!schDel || !schDel.ladder || schDel.ladder.length <= 1) return;
        commitLadderExpandFromDom();
        var draft = schDel.ladder.slice();
        var idxDel = parseInt(delBtn.dataset.ladderDel, 10);
        draft.splice(idxDel, 1);
        schDel.ladder = draft;
        syncLadderLinkedMins(schDel);
        if (state.ladderExpandIdx === idxDel) state.ladderExpandIdx = null;
        else if (state.ladderExpandIdx != null && state.ladderExpandIdx > idxDel) state.ladderExpandIdx -= 1;
        renderLadder(schDel);
        toast('已删除第 ' + (idxDel + 1) + ' 档');
        return;
      }
      var tap = e.target.closest('[data-ladder-step-tap]');
      if (!tap) return;
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      commitLadderExpandFromDom();
      var idx = parseInt(tap.dataset.ladderStepTap, 10);
      if (state.ladderExpandIdx === idx) {
        flashLadderStep(idx);
        return;
      }
      state.ladderExpandIdx = idx;
      renderLadder(sch);
      toast('正在编辑第 ' + (idx + 1) + ' 档');
    });

    $('empLadderExpand')?.addEventListener('change', function (e) {
      var maxInp = e.target.closest('[data-ladder-max]');
      if (!maxInp) return;
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      commitLadderExpandFromDom();
      renderLadderStairs(sch);
    });
    $('empLadderExpand')?.addEventListener('click', function (e) {
      var done = e.target.closest('[data-ladder-expand-done]');
      if (done) {
        var schDone = schemeById(state.editingSchemeId);
        if (!schDone) return;
        commitLadderExpandFromDom();
        var errDone = validateLadderTiers(schDone.ladder);
        if (errDone) { toast(errDone, true); return; }
        var doneIdx = state.ladderExpandIdx;
        state.ladderExpandIdx = null;
        renderLadder(schDone);
        if (doneIdx != null) flashLadderStep(doneIdx);
        toast('第 ' + ((doneIdx != null ? doneIdx : 0) + 1) + ' 档已更新');
        return;
      }
      var modeBtn = e.target.closest('[data-ladder-mode-val]');
      if (modeBtn) {
        var panel = $('empLadderExpand');
        if (!panel) return;
        var m = normalizeCommMode(modeBtn.dataset.ladderModeVal);
        var idx = modeBtn.dataset.ladderMode;
        var pctEl = panel.querySelector('[data-ladder-pct="' + idx + '"]');
        var amtEl = panel.querySelector('[data-ladder-amt="' + idx + '"]');
        var src = m === 'amount' ? pctEl : amtEl;
        var dst = m === 'amount' ? amtEl : pctEl;
        if (src && dst) {
          var n = parseCommInputValue(src.value);
          dst.value = Number.isFinite(n) ? rawCommInputDisplay(n) : '';
        }
        panel.querySelectorAll('[data-ladder-mode-val]').forEach(function (btn) {
          var on = btn.dataset.ladderModeVal === m;
          btn.classList.toggle('on', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        panel.querySelectorAll('[data-ladder-input]').forEach(function (el) {
          el.classList.toggle('hidden', el.dataset.ladderInput !== m);
        });
        commitLadderExpandFromDom();
        var schMode = schemeById(state.editingSchemeId);
        if (schMode) renderLadderStairs(schMode);
        return;
      }
    });
    $('empLadderExpand')?.addEventListener('input', function (e) {
      var maxInp = e.target.closest('[data-ladder-max]');
      if (maxInp) {
        commitLadderExpandFromDom();
        var schMax = schemeById(state.editingSchemeId);
        if (schMax) renderLadderStairs(schMax);
        return;
      }
      var pctInp = e.target.closest('[data-ladder-pct], [data-ladder-amt]');
      if (!pctInp) return;
      var idx = pctInp.dataset.ladderPct != null ? pctInp.dataset.ladderPct : pctInp.dataset.ladderAmt;
      var other = pctInp.dataset.ladderPct != null
        ? document.querySelector('#empLadderExpand [data-ladder-amt="' + idx + '"]')
        : document.querySelector('#empLadderExpand [data-ladder-pct="' + idx + '"]');
      if (other) {
        var nVal = parseCommInputValue(pctInp.value);
        other.value = Number.isFinite(nVal) ? String(nVal) : '';
      }
      commitLadderExpandFromDom();
      var schPct = schemeById(state.editingSchemeId);
      if (schPct) renderLadderStairs(schPct);
    });
    $('empLadderExpand')?.addEventListener('focusin', function (e) {
      var inp = e.target.closest('input.emp-comm-num');
      if (inp) focusCommNumInput(inp);
    });
    $('empLadderExpand')?.addEventListener('focusout', function (e) {
      var inp = e.target.closest('input.emp-comm-num');
      if (!inp) return;
      blurCommNumInput(inp);
      var idx = inp.dataset.ladderPct != null ? inp.dataset.ladderPct : inp.dataset.ladderAmt;
      var other = inp.dataset.ladderPct != null
        ? document.querySelector('#empLadderExpand [data-ladder-amt="' + idx + '"]')
        : document.querySelector('#empLadderExpand [data-ladder-pct="' + idx + '"]');
      if (!other) return;
      var n = parseCommInputValue(inp.value);
      other.value = Number.isFinite(n) ? rawCommInputDisplay(n) : '';
    });

    $('empBtnSaveLadder')?.addEventListener('click', function () {
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      readLadderSettingsFromDom(sch);
      var payErr = validateLadderPayTypes(sch);
      if (payErr) { toast(payErr, true); return; }
      var tiers = readLadderDraftFromDom();
      var err = validateLadderTiers(tiers);
      if (err) { toast(err, true); return; }
      sch.ladder = tiers;
      invalidateCommLineCache();
      toast('阶梯比例已保存');
      openComm();
    });

    $('empLadderCalcModeSeg')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ladder-calc-mode]');
      if (!btn) return;
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      sch.ladderCalcMode = btn.dataset.ladderCalcMode === 'progressive' ? 'progressive' : 'top';
      renderLadderSettings(sch);
      renderLadderStairs(sch);
      toast(sch.ladderCalcMode === 'progressive' ? '已切换为每段不同档' : '已切换为全额最高档');
    });
    $('empLadderPayTypeChips')?.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-ladder-pay-type]');
      if (!chip) return;
      var sch = schemeById(state.editingSchemeId);
      if (!sch) return;
      ensureLadderScheme(sch);
      var key = chip.dataset.ladderPayType;
      sch.ladderPayTypes[key] = !sch.ladderPayTypes[key];
      renderLadderSettings(sch);
    });
    $('empLadderPayCycleEntry')?.addEventListener('click', function () { openPayCycleFromLadder(); });
    $('empLadderCalcInfo')?.addEventListener('click', function () { openEmpDialog('empLadderCalcHelpMask'); });
    $('empLadderTierInfo')?.addEventListener('click', function () {
      openEmpAchInfoHelp('业绩分档说明',
        '<p>把周期合计业绩画成<strong>台阶</strong>：业绩落在哪一阶，就按那一阶的提成计算。</p>' +
        '<p>相邻档自动衔接；末档上限留空表示「及以上」。</p>' +
        '<p>点台阶可展开设置该档的业绩范围与提成。</p>');
    });
    $('empLadderCalcHelpOk')?.addEventListener('click', function () { closeEmpDialog('empLadderCalcHelpMask'); });
    $('empLadderCalcHelpMask')?.addEventListener('click', function (e) {
      if (e.target === $('empLadderCalcHelpMask')) closeEmpDialog('empLadderCalcHelpMask');
    });
    $('empAchInfoHelpOk')?.addEventListener('click', function () { closeEmpDialog('empAchInfoHelpMask'); });
    $('empAchInfoHelpMask')?.addEventListener('click', function (e) {
      if (e.target === $('empAchInfoHelpMask')) closeEmpDialog('empAchInfoHelpMask');
    });

    $('empAssignBack')?.addEventListener('click', function () {
      openComm();
    });
    $('empAssignSelectAll')?.addEventListener('click', function () {
      storeActiveStaff().forEach(function (s) { state.assignSelected[s.id] = true; });
      renderAssignList();
    });
    $('empAssignClear')?.addEventListener('click', function () {
      state.assignSelected = {};
      renderAssignList();
    });
    $('empAssignList')?.addEventListener('click', function (e) {
      var row = e.target.closest('[data-assign-id]');
      if (!row) return;
      var id = row.dataset.assignId;
      state.assignSelected[id] = !state.assignSelected[id];
      renderAssignList();
    });
    $('empBtnAssignOk')?.addEventListener('click', function () {
      applyAssignSelection();
      openComm();
    });

    syncAchFromCatalog();
    setSessionStaffId(sessionStaffId || 'st0');
    syncDemoPermButtons();
    syncDemoStaffButtons();
    document.getElementById('demoStaffBtns')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-demo-staff]');
      if (!btn) return;
      setSessionStaffId(btn.dataset.demoStaff);
      var s = getSessionStaff();
      toast('已切换登录员工「' + (s ? s.name : '') + '」· 权限「' + getSessionPermName() + '」');
    });
    document.getElementById('demoPermBtns')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-demo-perm]');
      if (!btn) return;
      setSessionPermName(btn.dataset.demoPerm);
      toast('已切换为「' + getSessionPermName() + '」权限演示');
    });
  }

  window.EmployeeDemo = {
    openList: openList,
    openRoleManage: openRoleManage,
    openSalary: openSalary,
    openPayCycleSettings: openPayCycleSettings,
    openAch: openAch,
    openAchSimple: openAchSimple,
    openComm: openComm,
    openRankToast: openRankToast,
    getBillingStaffPool: getBillingStaffPool,
    getFreeOrderRule: getFreeOrderRule,
    getAchCalcMode: getAchCalcMode,
    getStationLabel: getStationLabel,
    getStationLabels: getStationLabels,
    invalidateCommLineCache: invalidateCommLineCache,
    syncStaffSchemeFromComm2: syncStaffSchemeFromComm2,
    resetSchemePickSheetChrome: resetSchemePickSheetChrome,
    wire: wire,
    getSessionPerm: getSessionPermName,
    setSessionPerm: setSessionPermName,
    getSessionStaffId: getSessionStaffId,
    getSessionStaff: getSessionStaff,
    setSessionStaffId: setSessionStaffId,
    hasPerm: hasPerm,
    requirePerm: requirePerm,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  var flowPatchTimer = setInterval(function () {
    if (patchFlowNav()) clearInterval(flowPatchTimer);
  }, 200);
  setTimeout(function () { clearInterval(flowPatchTimer); }, 10000);
})();
/* ==== /EMPLOYEE MODULE JS ==== */
