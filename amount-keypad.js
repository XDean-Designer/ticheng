/* amountKeypad — extracted for comm2 standalone */
(function (g) {
  'use strict';

  var INPUT_LIMITS = { MONEY_MAX: 999999.99, MONEY_INT_DIGITS: 6, VALIDITY_DAY_MAX: 3650 };
  var kpState = {
    amountKeypadTarget: null,
    amountKeypadBuffer: '',
    amountKeypadMode: 'decimal',
    amountKeypadReplacePending: false,
    amountKeypadOriginalValue: ''
  };

  function formatMoneyLimitLabel() { return '999,999.99'; }

  function moneyBufferExceedsLimit(buf, mode) {
    var s = String(buf || '').trim();
    if (!s || s === '.' || s === '0.') return false;
    if (mode === 'integer') {
      var n = parseInt(s, 10);
      return Number.isFinite(n) && n > INPUT_LIMITS.VALIDITY_DAY_MAX;
    }
    var intPart = s.split('.')[0].replace(/^0+(?=\d)/, '') || '0';
    if (intPart.length > INPUT_LIMITS.MONEY_INT_DIGITS) return true;
    var num = parseFloat(s);
    return Number.isFinite(num) && num > INPUT_LIMITS.MONEY_MAX;
  }

  function clampNonNegativeAmountInput(el) {
    if (!el) return;
    var s = String(el.value || '').replace(/[^\d.]/g, '');
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) { el.value = ''; return; }
    if (n > INPUT_LIMITS.MONEY_MAX) el.value = String(INPUT_LIMITS.MONEY_MAX);
  }

  function clampIntegerAmountInput(el) {
    if (!el) return;
    var n = parseInt(String(el.value || '').replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 0) { el.value = ''; return; }
    if (n > INPUT_LIMITS.VALIDITY_DAY_MAX) el.value = String(INPUT_LIMITS.VALIDITY_DAY_MAX);
  }

  function getAmountKeypadMode(el) {
    return el.classList.contains('issue-extend-custom-input') ? 'integer' : 'decimal';
  }

  function updateAmountKeypadDisplay() {
    var disp = document.getElementById('amountKeypadDisplay');
    if (!disp) return;
    var buf = kpState.amountKeypadBuffer || '';
    var ph = (kpState.amountKeypadTarget && kpState.amountKeypadTarget.placeholder) || '请输入';
    if (!buf) {
      disp.textContent = ph;
      disp.classList.add('is-empty');
    } else {
      disp.textContent = buf;
      disp.classList.remove('is-empty');
    }
  }

  function renderAmountKeypadKeys() {
    var grid = document.getElementById('amountKeypadGrid');
    if (!grid) return;
    var isInt = kpState.amountKeypadMode === 'integer';
    var keys = isInt
      ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'delete']
      : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'];
    grid.innerHTML = keys.map(function (k) {
      if (k === null) return '<span class="amount-keypad-key is-spacer" aria-hidden="true"></span>';
      var label = k === 'delete' ? '⌫' : k;
      var cls = k === 'delete' ? 'amount-keypad-key amount-keypad-key--delete' : 'amount-keypad-key';
      return '<button type="button" class="' + cls + '" data-key="' + k + '">' + label + '</button>';
    }).join('');
    grid.querySelectorAll('[data-key]').forEach(function (btn) {
      btn.onclick = function () { appendAmountKeypadKey(btn.dataset.key); };
    });
  }

  function appendAmountKeypadKey(key) {
    if (kpState.amountKeypadReplacePending) {
      kpState.amountKeypadReplacePending = false;
      if (key === 'delete') { kpState.amountKeypadBuffer = ''; updateAmountKeypadDisplay(); return; }
      if (key === '.') {
        if (kpState.amountKeypadMode === 'integer') return;
        kpState.amountKeypadBuffer = '0.';
        updateAmountKeypadDisplay();
        return;
      }
      kpState.amountKeypadBuffer = key;
      updateAmountKeypadDisplay();
      return;
    }
    var buf = kpState.amountKeypadBuffer || '';
    var next = buf;
    if (key === 'delete') next = buf.slice(0, -1);
    else if (key === '.') {
      if (kpState.amountKeypadMode === 'integer' || buf.includes('.')) return;
      next = buf ? buf + '.' : '0.';
    } else {
      if (kpState.amountKeypadMode === 'decimal' && buf.includes('.')) {
        var frac = buf.split('.')[1] || '';
        if (frac.length >= 2) return;
      }
      next = (buf === '0' && key !== '.') ? key : buf + key;
    }
    if (key !== 'delete' && moneyBufferExceedsLimit(next, kpState.amountKeypadMode)) {
      if (typeof g.showToast === 'function') {
        g.showToast(kpState.amountKeypadMode === 'integer'
          ? ('不能超过 ' + INPUT_LIMITS.VALIDITY_DAY_MAX)
          : ('金额不能超过 ' + formatMoneyLimitLabel()), true);
      }
      return;
    }
    kpState.amountKeypadBuffer = next;
    updateAmountKeypadDisplay();
  }

  function openAmountKeypad(el) {
    if (!el || el.disabled) return;
    kpState.amountKeypadTarget = el;
    kpState.amountKeypadMode = getAmountKeypadMode(el);
    var normalized = el.value != null ? String(el.value) : '';
    kpState.amountKeypadOriginalValue = normalized;
    kpState.amountKeypadBuffer = normalized;
    kpState.amountKeypadReplacePending = !!normalized;
    var titleEl = document.getElementById('amountKeypadTitle');
    if (titleEl) {
      var aria = el.getAttribute && el.getAttribute('aria-label');
      if (aria) titleEl.textContent = aria;
      else titleEl.textContent = kpState.amountKeypadMode === 'integer' ? '输入天数' : '输入金额';
    }
    updateAmountKeypadDisplay();
    renderAmountKeypadKeys();
    var mask = document.getElementById('amountKeypadMask');
    if (mask) mask.classList.add('open');
  }

  function closeAmountKeypad() {
    var mask = document.getElementById('amountKeypadMask');
    if (mask) mask.classList.remove('open');
    kpState.amountKeypadTarget = null;
    kpState.amountKeypadBuffer = '';
    kpState.amountKeypadReplacePending = false;
    kpState.amountKeypadOriginalValue = '';
  }

  function confirmAmountKeypad() {
    var el = kpState.amountKeypadTarget;
    if (!el) { closeAmountKeypad(); return; }
    var buf = (kpState.amountKeypadBuffer || '').trim();
    if (!buf) { closeAmountKeypad(); return; }
    if (moneyBufferExceedsLimit(buf, kpState.amountKeypadMode)) {
      if (kpState.amountKeypadMode === 'integer') buf = String(INPUT_LIMITS.VALIDITY_DAY_MAX);
      else buf = String(INPUT_LIMITS.MONEY_MAX);
    }
    el.value = buf;
    if (kpState.amountKeypadMode === 'decimal') clampNonNegativeAmountInput(el);
    else clampIntegerAmountInput(el);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    closeAmountKeypad();
  }

  function wireAmountKeypadInputs(root) {
    (root || document).querySelectorAll('.input-amount, .mp-fixed-input, .issue-extend-custom-input').forEach(function (el) {
      if (el.dataset.noAmountKeypad != null) return;
      if (el.dataset.amountKeypadWired) return;
      el.dataset.amountKeypadWired = '1';
      el.setAttribute('readonly', 'readonly');
      el.addEventListener('click', function (e) {
        if (el.disabled) return;
        e.preventDefault();
        openAmountKeypad(el);
      });
      el.addEventListener('focus', function (e) {
        if (el.disabled) return;
        e.preventDefault();
        el.blur();
        openAmountKeypad(el);
      });
    });
  }

  function wireAmountKeypadControls() {
    var cancel = document.getElementById('btnAmountKeypadCancel');
    var ok = document.getElementById('btnAmountKeypadOk');
    var mask = document.getElementById('amountKeypadMask');
    if (cancel) cancel.addEventListener('click', closeAmountKeypad);
    if (ok) ok.addEventListener('click', confirmAmountKeypad);
    if (mask) {
      mask.dataset.outsideClose = '1';
      mask.addEventListener('click', function (e) {
        if (e.target === mask) closeAmountKeypad();
      });
    }
  }

  g.openAmountKeypad = openAmountKeypad;
  g.closeAmountKeypad = closeAmountKeypad;
  g.wireAmountKeypadInputs = wireAmountKeypadInputs;
  g.wireAmountKeypadControls = wireAmountKeypadControls;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAmountKeypadControls);
  } else wireAmountKeypadControls();
})(typeof window !== 'undefined' ? window : globalThis);
