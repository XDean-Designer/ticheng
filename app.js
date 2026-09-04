/* comm2 standalone shell — nav, toast, deep links, capture */
(function (g) {
  'use strict';

  var toastTimer = null;
  var navCurrent = 'hub';

  g.showToast = function (msg, isWarn) {
    var el = document.getElementById('toastMsg');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-multiline', String(msg || '').length > 18);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, isWarn ? 2600 : 2000);
  };

  g.showOnlyScreen = function (id) {
    document.querySelectorAll('#frame .screen').forEach(function (el) {
      el.classList.add('hidden');
    });
    var target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    syncNavFromScreen(id);
  };

  g.openHub = function () {
    try { dismissOverlays(); } catch (e) {}
    g.showOnlyScreen('screen-hub');
    setNavHighlight('hub');
  };

  g.openWorkbench = function () {
    g.openHub();
  };

  function screenToFlow(id) {
    if (id === 'screen-hub') return 'hub';
    if (id === 'screen-comm2-list') return 'comm2-list';
    if (id === 'screen-comm2-edit') return 'comm2-edit';
    if (id === 'screen-comm2-pick') return 'comm2-pick';
    if (id === 'screen-emp-list') return 'staff-list';
    if (id === 'screen-emp-roles') return 'staff-roles';
    if (id === 'screen-emp-role-perms') return 'staff-role-perms';
    if (id === 'screen-emp-role-perm-edit') return 'staff-role-perm-edit';
    if (id === 'screen-emp-detail') return 'staff-detail';
    if (id === 'screen-emp-form') {
      if (g.__staffFormFlow) return g.__staffFormFlow;
      return 'staff-create';
    }
    if (id === 'screen-emp-salary') return 'staff-salary';
    if (id === 'screen-emp-pay-detail') return 'staff-pay-detail';
    if (id === 'screen-emp-pay-cycle') return 'staff-pay-cycle';
    if (id === 'screen-emp-salary-detail') {
      if (g.__salaryDetailFlow) return g.__salaryDetailFlow;
      return 'staff-salary-detail';
    }
    if (id === 'screen-emp-rewards') return 'staff-rewards';
    if (id === 'screen-emp-reward-detail') return 'staff-reward-detail';
    return null;
  }

  function syncNavFromScreen(screenId) {
    var flow = screenToFlow(screenId);
    if (flow) setNavHighlight(flow);
  }

  function setNavHighlight(flowId) {
    navCurrent = flowId || navCurrent;
    document.querySelectorAll('.site-nav .nav-item[data-flow]').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.flow === navCurrent);
    });
  }
  g.setNavHighlight = setNavHighlight;
  g.setFlowNavHighlight = setNavHighlight;

  function dismissOverlays() {
    /* no-op: 选工位演示已下线 */
  }

  var STAFF_FLOW_IDS = [
    'staff-list',
    'staff-roles',
    'staff-role-perms',
    'staff-role-perm-edit',
    'staff-detail',
    'staff-create',
    'staff-refine'
  ];

  var SALARY_FLOW_IDS = [
    'staff-salary',
    'staff-pay-detail',
    'staff-pay-cycle',
    'staff-salary-detail',
    'staff-salary-detail-pending',
    'staff-salary-detail-staff',
    'staff-rewards',
    'staff-reward-detail'
  ];

  function wrapEmployeeFlows(ids, flag) {
    ids.forEach(function (id) {
      var prev = g.FLOW_NAV[id];
      if (typeof prev !== 'function' || prev[flag]) return;
      var wrapped = function () {
        dismissOverlays();
        if (id === 'staff-create' || id === 'staff-refine') g.__staffFormFlow = id;
        else if (id.indexOf('staff-') === 0 && id.indexOf('salary') < 0 && id.indexOf('reward') < 0 && id.indexOf('pay-') < 0) {
          g.__staffFormFlow = null;
        }
        if (id.indexOf('salary-detail') >= 0) g.__salaryDetailFlow = id;
        else if (SALARY_FLOW_IDS.indexOf(id) >= 0) g.__salaryDetailFlow = null;
        prev();
        setNavHighlight(id);
      };
      wrapped[flag] = true;
      g.FLOW_NAV[id] = wrapped;
    });
  }

  function wrapSalaryFlows() {
    wrapEmployeeFlows(SALARY_FLOW_IDS, '__salaryWrapped');
  }

  function wrapStaffFlows() {
    wrapEmployeeFlows(STAFF_FLOW_IDS, '__staffWrapped');
  }

  /* 返回 → 功能入口：document 级事件委托（capture），不依赖元素绑定时机，
     覆盖手机预览等环境下单个按钮事件未绑上/被覆盖的情况 */
  function wireBackToHub() {
    if (g.__backToHubWired === '1') return;
    g.__backToHubWired = '1';
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      var hit = t.closest('#empStaffListBack, #empSalaryListBack, #comm2ListBack');
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof g.__empComm2BackHook === 'function' && g.__empComm2BackHook()) return;
      g.openHub();
    }, true);
  }

  function wireHub() {
    var root = document.getElementById('screen-hub');
    if (!root || root.dataset.wired === '1') return;
    root.dataset.wired = '1';
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-hub-go]');
      if (!btn) return;
      var go = btn.getAttribute('data-hub-go');
      if (go === 'comm2') {
        if (g.FLOW_NAV['comm2-list']) g.FLOW_NAV['comm2-list']();
        else if (g.Comm2Demo && typeof g.Comm2Demo.openList === 'function') g.Comm2Demo.openList();
        else g.showOnlyScreen('screen-comm2-list');
        return;
      }
      if (go === 'staff') {
        if (g.FLOW_NAV['staff-list']) g.FLOW_NAV['staff-list']();
        else if (g.EmployeeDemo && typeof g.EmployeeDemo.openList === 'function') g.EmployeeDemo.openList();
        else g.showOnlyScreen('screen-emp-list');
        return;
      }
      if (go === 'salary') {
        if (g.FLOW_NAV['staff-salary']) g.FLOW_NAV['staff-salary']();
        else if (g.EmployeeDemo && typeof g.EmployeeDemo.openSalary === 'function') g.EmployeeDemo.openSalary();
        else g.showOnlyScreen('screen-emp-salary');
      }
    });
  }

  /** 所有底部 sheet：点遮罩空白收起（居中 dialog 不处理） */
  function wirePickerMaskOutsideClose() {
    document.querySelectorAll('.picker-mask').forEach(function (mask) {
      if (mask.dataset.outsideClose === '1') return;
      mask.dataset.outsideClose = '1';
      mask.addEventListener('click', function (e) {
        if (e.target !== mask) return;
        if (!mask.classList.contains('open')) return;
        if (mask.id === 'amountKeypadMask') {
          if (typeof g.closeAmountKeypad === 'function') g.closeAmountKeypad();
          else mask.classList.remove('open');
          return;
        }
        if (mask.id === 'comm2CatSheetMask' && g.Comm2Demo && typeof g.Comm2Demo.closeCatSheet === 'function') {
          g.Comm2Demo.closeCatSheet();
          return;
        }
        if (mask.id === 'empSchemePickMask' && g.EmployeeDemo && typeof g.EmployeeDemo.resetSchemePickSheetChrome === 'function') {
          g.EmployeeDemo.resetSchemePickSheetChrome();
        }
        mask.classList.remove('open');
      });
    });
  }

  g.FLOW_NAV = {
    'hub': function () {
      g.openHub();
    },
    'comm2-list': function () {
      dismissOverlays();
      if (g.Comm2Demo) g.Comm2Demo.openList();
      else g.showOnlyScreen('screen-comm2-list');
    },
    'comm2-edit': function () {
      dismissOverlays();
      if (g.Comm2Demo) g.Comm2Demo.openEdit('c2_advisor');
      else g.showOnlyScreen('screen-comm2-edit');
    },
    'comm2-pick': function () {
      dismissOverlays();
      if (!g.Comm2Demo) { g.showOnlyScreen('screen-comm2-pick'); return; }
      g.Comm2Demo.openEdit('c2_flagship');
      setTimeout(function () {
        var btn = document.getElementById('comm2BtnAddRule');
        if (btn) btn.click();
      }, 80);
    }
  };

  function getFlowDeepLinkId() {
    return new URLSearchParams(location.search).get('flow');
  }

  function isComm2AdvisorCapture() {
    return new URLSearchParams(location.search).get('capture') === 'comm2-advisor';
  }

  function applyComm2AdvisorCapture() {
    document.documentElement.classList.add('figma-capture-comm2-advisor');
    var run = function () {
      if (g.Comm2Demo && typeof g.Comm2Demo.openEdit === 'function') {
        g.Comm2Demo.openEdit('c2_advisor');
        return true;
      }
      return false;
    };
    if (!run()) {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (run() || tries > 60) clearInterval(timer);
      }, 50);
    }
  }

  function applyFlowDeepLink(flowId) {
    if (!flowId || !g.FLOW_NAV[flowId]) {
      console.warn('[flow] unknown:', flowId);
      return false;
    }
    if (new URLSearchParams(location.search).get('capture') === '1') {
      document.documentElement.classList.add('prd-capture');
      document.querySelector('.site-nav') && (document.querySelector('.site-nav').style.display = 'none');
      document.querySelector('.stage') && (document.querySelector('.stage').style.marginLeft = '0');
    }
    g.FLOW_NAV[flowId]();
    setNavHighlight(flowId);
    return true;
  }

  /* ==== run-to-figma 抓取路由：?view=desktop&capture=<key> ==== */
  function runCaptureSteps(steps) {
    var i = 0;
    function next() {
      if (i >= steps.length) return;
      var s = steps[i++];
      setTimeout(function () {
        try { s.run(); } catch (e) { console.warn('[capture] step error:', e); }
        next();
      }, s.wait == null ? 30 : s.wait);
    }
    next();
  }

  function getFigmaCaptureKey() {
    var v = new URLSearchParams(location.search).get('capture');
    return v && v !== '1' && v !== 'comm2-advisor' ? v : '';
  }

  function applyFigmaCapture(key) {
    document.documentElement.classList.add('figma-capture');
    /* 桌面浏览器中的 390×844 画板：强制桌面壳（保留假状态栏与底部安全区），
       避免窄视口把页面切到 view-mobile 全幅手机预览模式 */
    document.documentElement.classList.add('view-desktop');
    document.documentElement.classList.remove('view-mobile');
    document.documentElement.style.removeProperty('--app-h');
    document.documentElement.style.removeProperty('--app-w');
    document.documentElement.style.removeProperty('--app-top');
    document.documentElement.style.removeProperty('--app-left');
    var step = function (run, wait) { return { run: run, wait: wait }; };
    function go(flowId, wait) {
      return step(function () {
        if (g.FLOW_NAV && typeof g.FLOW_NAV[flowId] === 'function') g.FLOW_NAV[flowId]();
        else console.warn('[capture] unknown flow:', flowId);
      }, wait == null ? 60 : wait);
    }
    function click(sel, wait) {
      return step(function () {
        var el = document.querySelector(sel);
        if (el) el.click();
        else console.warn('[capture] missing click target:', sel);
      }, wait == null ? 60 : wait);
    }
    function openFlagshipEdit() {
      return step(function () {
        if (g.Comm2Demo && typeof g.Comm2Demo.openEdit === 'function') g.Comm2Demo.openEdit('c2_flagship');
      }, 60);
    }
    function openListThen(firstSel, extra) {
      var out = [go('comm2-list', 60), click(firstSel, 220)];
      return (extra || []).length ? out.concat(extra) : out;
    }

    var routes = {
      /* 全屏页面 */
      'hub': [go('hub', 60)],
      'comm2-list': [go('comm2-list', 60)],
      'comm2-edit': [openFlagshipEdit()],
      'comm2-pick': [go('comm2-pick', 60)],
      'emp-list': [go('staff-list', 60)],
      'emp-roles': [go('staff-roles', 60)],
      'emp-role-perms': [go('staff-role-perms', 60)],
      'emp-role-perm-edit': [go('staff-role-perms', 60), click('#empRolePermList [data-role-perm]', 240)],
      'emp-detail': [go('staff-list', 60), click('#empListRoot [data-staff-id]', 240)],
      'emp-form-create': [go('staff-create', 60)],
      'emp-empty-role': [go('staff-empty-role', 60)],
      'emp-empty-scheme': [go('staff-empty-scheme', 60)],
      'emp-salary': [go('staff-salary', 60)],
      'emp-pay-detail': [go('staff-salary', 60), click('#empSalaryList .emp-salary-card', 260)],
      'emp-pay-cycle': [go('staff-pay-cycle', 60)],
      'emp-salary-detail': [go('staff-salary', 60), click('#empSalaryList [data-detail-kind="comm"]', 260)],
      'emp-rewards': [go('staff-rewards', 60)],
      'emp-reward-detail': [go('staff-salary', 60), click('#empSalaryList [data-detail-kind="reward"]', 260)],

      /* 提成设置弹层 */
      'comm2-cat-sheet': [openFlagshipEdit(), click('#comm2EditCards [data-comm2-card-open]', 260)],
      'comm2-assign': openListThen('#comm2List [data-comm2-assign]'),
      'comm2-menu': openListThen('#comm2List [data-comm2-menu]'),
      'comm2-name': openListThen('#comm2List [data-comm2-menu]', [click('#comm2MenuMask [data-comm2-menu-act="rename"]', 240)]),
      'comm2-delete': openListThen('#comm2List [data-comm2-menu]', [click('#comm2MenuMask [data-comm2-menu-act="delete"]', 240)]),
      'comm2-unsaved': [openFlagshipEdit(), click('#comm2EditCards [data-comm2-bar-base-toggle]', 240), click('#comm2EditBack', 200)],
      'comm2-override-del': [openFlagshipEdit(), click('#comm2EditCards [data-comm2-swipe-del]', 260)],
      'comm2-help': [go('comm2-list', 60), click('#comm2HelpBtn', 220)],
      'comm2-unassigned': [go('comm2-list', 60), click('#comm2UnassignedTip', 220)],

      /* 员工弹层 */
      'emp-role-pick': [go('staff-refine', 60), click('#empRowRole', 240)],
      'emp-role-name': [go('staff-roles', 60), click('#empBtnAddRolePage', 240)],
      'emp-perm-pick': [go('staff-refine', 60), click('#empRowPerm', 240)],
      'emp-perm-help': [go('staff-refine', 60), click('#empPermInfo', 240)],
      'emp-status': [go('staff-refine', 60), click('#empRowStatus', 240)],
      'emp-detail-status': [go('staff-list', 60), click('#empListRoot [data-staff-id]', 240), click('[data-emp-status-chip]', 200)],
      'emp-staff-field': [go('staff-list', 60), click('#empListRoot [data-staff-id]', 240), click('[data-detail-edit="name"]', 200)],

      /* 薪资弹层 */
      'emp-month': [go('staff-salary', 60), click('#empMonthLabel', 260)],
      'emp-comm-date': [go('staff-salary', 60), click('#empSalaryList [data-detail-kind="comm"]', 260), click('#empCommDetailDateBtn', 220)],
      'emp-line-edit': [go('staff-salary', 60), click('#empSalaryList [data-detail-kind="comm"]', 260), click('#empSalaryDetailBody [data-comm-edit]', 220)],
      'emp-keypad': [go('staff-salary', 60), click('#empSalaryList [data-detail-kind="comm"]', 260), click('#empSalaryDetailBody [data-comm-edit]', 220), click('#empCommLineEditComm', 240)],
      'emp-scheme-pick': [go('staff-refine', 60), click('#empRowScheme', 240)],
      'emp-reward-staff': [go('staff-rewards', 60), click('#empRewardStaffBtn', 260)]
    };

    var steps = routes[key];
    if (!steps) { console.warn('[capture] unknown key:', key); return; }
    runCaptureSteps(steps);
  }

  function wireSiteNav() {
    document.querySelectorAll('.site-nav .nav-item[data-flow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.flow;
        if (id && g.FLOW_NAV[id]) g.FLOW_NAV[id]();
      });
    });
    // PRD 入口为原生 <a href="PRD-%E6%8F%90…html">，勿改回 button + location.assign（Cursor 内置浏览器常点击无反应）
  }

  function wireViewShell() {
    var apply = g.__comm2ApplyViewShell;
    var syncH = g.__comm2SyncAppHeight;
    if (typeof apply === 'function') apply();
    else if (typeof syncH === 'function') syncH();

    var mq = window.matchMedia('(max-width: 760px)');
    var onChange = function () {
      if (typeof apply === 'function') apply();
      else if (typeof syncH === 'function') syncH();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);

    var onViewport = function () {
      if (typeof syncH === 'function') syncH();
      else if (typeof apply === 'function') apply();
    };
    window.addEventListener('resize', onViewport);
    window.addEventListener('orientationchange', function () {
      setTimeout(onViewport, 50);
      setTimeout(onViewport, 300);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewport);
      window.visualViewport.addEventListener('scroll', onViewport);
    }
  }

  function isMobileView() {
    return document.documentElement.classList.contains('view-mobile');
  }

  function boot() {
    wireViewShell();
    wireSiteNav();
    wireHub();
    wireBackToHub();
    wrapStaffFlows();
    wrapSalaryFlows();
    wirePickerMaskOutsideClose();
    if (typeof wireAmountKeypadControls === 'function') wireAmountKeypadControls();

    if (isComm2AdvisorCapture()) {
      applyComm2AdvisorCapture();
      return;
    }

    var flow = getFlowDeepLinkId();
    if (flow && applyFlowDeepLink(flow)) return;

    var captureKey = getFigmaCaptureKey();
    if (captureKey) {
      applyFigmaCapture(captureKey);
      return;
    }

    /* 手机默认功能入口；桌面默认提成方案列表 */
    if (isMobileView()) {
      g.openHub();
      return;
    }

    if (g.Comm2Demo && typeof g.Comm2Demo.openList === 'function') {
      g.Comm2Demo.openList();
    } else {
      g.showOnlyScreen('screen-comm2-list');
    }
    setNavHighlight('comm2-list');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(boot, 0);
    });
  } else setTimeout(boot, 0);
})(window);
