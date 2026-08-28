/* comm2 standalone shell — nav, toast, deep links, capture */
(function (g) {
  'use strict';

  var toastTimer = null;
  var navCurrent = 'comm2-list';

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

  g.openWorkbench = function () {
    if (g.Comm2Demo && typeof g.Comm2Demo.openList === 'function') {
      g.Comm2Demo.openList();
    } else {
      g.showOnlyScreen('screen-comm2-list');
    }
    setNavHighlight('comm2-list');
  };

  function screenToFlow(id) {
    if (id === 'screen-comm2-list') return 'comm2-list';
    if (id === 'screen-comm2-edit') return 'comm2-edit';
    if (id === 'screen-comm2-pick') return 'comm2-pick';
    if (id === 'screen-comm2-staff') {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.getFlow === 'function') {
        return g.Comm2StaffDemo.getFlow();
      }
      return 'comm2-staff-3';
    }
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

  g.FLOW_NAV = {
    'comm2-list': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.dismissMask === 'function') g.Comm2StaffDemo.dismissMask();
      if (g.Comm2Demo) g.Comm2Demo.openList();
      else g.showOnlyScreen('screen-comm2-list');
    },
    'comm2-edit': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.dismissMask === 'function') g.Comm2StaffDemo.dismissMask();
      if (g.Comm2Demo) g.Comm2Demo.openEdit('c2_advisor');
      else g.showOnlyScreen('screen-comm2-edit');
    },
    'comm2-pick': function () {
      if (g.Comm2StaffDemo && typeof g.Comm2StaffDemo.dismissMask === 'function') g.Comm2StaffDemo.dismissMask();
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
    // Cursor 内置浏览器会拦截 target=_blank → about:blank#blocked；始终同页跳转
    var prd = document.getElementById('navPrdLink');
    if (prd) {
      prd.addEventListener('click', function () {
        var href = prd.getAttribute('data-prd-href') || 'prd.html';
        try {
          location.assign(new URL(href, location.href).href);
        } catch (err) {
          location.href = href;
        }
      });
    }
  }

  function boot() {
    wireSiteNav();
    wireAmountKeypadControls && wireAmountKeypadControls();

    if (isComm2AdvisorCapture()) {
      applyComm2AdvisorCapture();
      return;
    }

    var flow = getFlowDeepLinkId();
    if (flow && applyFlowDeepLink(flow)) return;

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
