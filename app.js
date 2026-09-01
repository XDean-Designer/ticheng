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
    dismissOverlays();
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
    if (id === 'screen-comm2-staff') {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.getFlow === 'function') {
        return g.Comm2StaffDemo.getFlow();
      }
      return 'comm2-staff-3';
    }
    if (id === 'screen-emp-list') return 'staff-list';
    if (id === 'screen-emp-roles') return 'staff-roles';
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
    if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.dismissMask === 'function') g.Comm2StaffDemo.dismissMask();
  }

  var STAFF_FLOW_IDS = [
    'staff-list',
    'staff-roles',
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

  function wireSalaryListBack() {
    var back = document.getElementById('empSalaryListBack');
    if (!back || back.dataset.wired === '1') return;
    back.dataset.wired = '1';
    back.addEventListener('click', function () {
      g.openHub();
    });
  }

  function wireStaffListBack() {
    var back = document.getElementById('empStaffListBack');
    if (!back || back.dataset.wired === '1') return;
    back.dataset.wired = '1';
    back.addEventListener('click', function () {
      /* 独立包：列表返回留在员工列表（无工作台） */
      if (g.EmployeeDemo && typeof g.EmployeeDemo.openList === 'function') g.EmployeeDemo.openList();
      else g.showOnlyScreen('screen-emp-list');
      setNavHighlight('staff-list');
    });
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
        if (mask.id === 'comm2StaffSheetMask' && g.Comm2StaffDemo && typeof g.Comm2StaffDemo.close === 'function') {
          g.Comm2StaffDemo.close();
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
    },
    'comm2-staff': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.open === 'function') g.Comm2StaffDemo.open(3);
      else g.showOnlyScreen('screen-comm2-staff');
    },
    'comm2-staff-3': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.open === 'function') g.Comm2StaffDemo.open(3);
      else g.showOnlyScreen('screen-comm2-staff');
    },
    'comm2-staff-2': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.open === 'function') g.Comm2StaffDemo.open(2);
      else g.showOnlyScreen('screen-comm2-staff');
    },
    'comm2-staff-1': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.open === 'function') g.Comm2StaffDemo.open(1);
      else g.showOnlyScreen('screen-comm2-staff');
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
    wireStaffListBack();
    wireSalaryListBack();
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
