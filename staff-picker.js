/* 关联页面 · 选择员工
 * 卡片 UI/UX（含 morph 动效）自 开单页面/index.html 原样复制；
 * Sheet 壳（标题「选择员工」+ 完成）挂在独立灰底页 screen-comm2-staff 上。 */
(function (g) {
  'use strict';

  var STAFF_ROLE_OPTS = [
    { id: 'senior', label: '大工' },
    { id: 'mid', label: '中工' },
    { id: 'junior', label: '小工' }
  ];
  var STAFF_ROLE_PICK_ORDER = ['junior', 'mid', 'senior'];
  var STAFF_ROLE_DEFAULT = 'senior';

  // 与开单页面同一套演示员工 + 头像
  var STAFFS = [
    { id: 'st0', name: '顾清扬', short: '顾', role: '店主', avatar: 'assets/emp-avatars/man-e.jpg' },
    { id: 'st1', name: '林屿森', short: '森', role: '美容师', avatar: 'assets/emp-avatars/man-a.jpg' },
    { id: 'st2', name: '何苏叶', short: '叶', role: '店长', avatar: 'assets/emp-avatars/woman-a.jpg' },
    { id: 'st3', name: '阿Ken', short: 'Ken', role: '美容师', avatar: 'assets/emp-avatars/man-b.jpg' },
    { id: 'st4', name: 'Lisa', short: 'Lisa', role: '美甲师', avatar: 'assets/emp-avatars/woman-b.jpg' }
  ];

  var staffRow = { id: '__linked', staffIds: [], staffRoles: {}, staffDesignated: {} };
  var staffCardEdit = null;
  var prevFlow = 'comm2-list';

  function $id(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(msg, isWarn) {
    if (typeof showToast === 'function') showToast(msg, !!isWarn);
  }
  function staffRoleLabel(roleId) {
    var hit = STAFF_ROLE_OPTS.find(function (r) { return r.id === roleId; });
    return hit ? hit.label : '';
  }
  function ensureStaffState() {
    if (!Array.isArray(staffRow.staffIds)) staffRow.staffIds = [];
    if (!staffRow.staffRoles || typeof staffRow.staffRoles !== 'object') staffRow.staffRoles = {};
    if (!staffRow.staffDesignated || typeof staffRow.staffDesignated !== 'object') staffRow.staffDesignated = {};
    Object.keys(staffRow.staffRoles).forEach(function (sid) {
      if (staffRow.staffIds.indexOf(sid) < 0) delete staffRow.staffRoles[sid];
    });
    Object.keys(staffRow.staffDesignated).forEach(function (sid) {
      if (staffRow.staffIds.indexOf(sid) < 0) delete staffRow.staffDesignated[sid];
    });
    staffRow.staffIds.forEach(function (sid) {
      if (!staffRow.staffRoles[sid]) staffRow.staffRoles[sid] = STAFF_ROLE_DEFAULT;
      if (typeof staffRow.staffDesignated[sid] !== 'boolean') staffRow.staffDesignated[sid] = false;
    });
  }
  function staffCardOrigin(index) {
    var col = index % 3;
    if (col === 0) return 'left center';
    if (col === 2) return 'right center';
    return 'center center';
  }
  function staffPickSummaryText(sid) {
    var designated = staffRow.staffDesignated && staffRow.staffDesignated[sid] === true;
    var guest = designated ? '点客' : '散客';
    var role = staffRoleLabel(staffRow.staffRoles && staffRow.staffRoles[sid] ? staffRow.staffRoles[sid] : '');
    return role ? guest + '·' + role : guest;
  }
  function staffJobTitleHtml(st) {
    var title = st && st.role ? String(st.role).trim() : '';
    if (!title) return '';
    return '<div class="staff-card__title">' + escapeHtml(title) + '</div>';
  }
  function staffAvatarHtml(st) {
    if (st.avatar) {
      return '<img class="staff-card__avatar" src="' + st.avatar + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }
    var letter = (st.short || st.name || '?').toString().slice(0, 2);
    return '<span class="staff-card__avatar staff-card__avatar--ph" aria-hidden="true">' + escapeHtml(letter) + '</span>';
  }

  function renderStaffPickerHtml() {
    ensureStaffState();
    var edit = staffCardEdit;
    var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
    var clearSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var cards = STAFFS.map(function (st, index) {
      var done = staffRow.staffIds.indexOf(st.id) >= 0;
      var isEdit = !!(edit && edit.staffId === st.id);
      var dim = !!(edit && !isEdit);
      var origin = staffCardOrigin(index);
      var originSide = index % 3 === 0 ? 'left' : index % 3 === 2 ? 'right' : 'center';
      var body = '';
      var jobTitle = staffJobTitleHtml(st);
      if (isEdit && edit.face === 'designate') {
        body = '<div class="staff-card__split" role="group" aria-label="点客或散客">' +
          '<button type="button" class="staff-card__split-btn staff-card__split-btn--des" data-staff-opt-designate="1" data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '">点客</button>' +
          '<button type="button" class="staff-card__split-btn staff-card__split-btn--guest" data-staff-opt-designate="0" data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '">散客</button>' +
          '</div>';
      } else if (isEdit && edit.face === 'role') {
        var roleBtns = STAFF_ROLE_PICK_ORDER.map(function (rid) {
          return '<button type="button" class="staff-card__split-btn staff-card__split-btn--role" data-staff-opt-role="' + rid + '" data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '">' + escapeHtml(staffRoleLabel(rid)) + '</button>';
        }).join('');
        body = '<div class="staff-card__split staff-card__split--3" role="group" aria-label="选择工位">' + roleBtns + '</div>';
      } else {
        var pickLine = done
          ? '<div class="staff-card__title staff-card__title--pick">' + escapeHtml(staffPickSummaryText(st.id)) + '</div>'
          : jobTitle;
        body =
          (done ? '<span class="staff-card__check">' + checkSvg + '</span>' : '') +
          staffAvatarHtml(st) +
          '<div class="staff-card__name">' + escapeHtml(st.name) + '</div>' +
          pickLine;
      }
      var clearBtn = (done && !isEdit)
        ? '<button type="button" class="staff-card__clear" data-staff-clear data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '" aria-label="清空选择">' + clearSvg + '</button>'
        : '';
      if (isEdit) {
        return '<div class="staff-card is-editing' + (done ? ' is-done' : '') + '"' +
          ' style="--staff-origin:' + origin + '"' +
          ' data-origin="' + originSide + '"' +
          ' data-staff-card data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '">' +
          '<div class="staff-card__panel" data-face="' + edit.face + '">' + body + '</div>' +
          '</div>';
      }
      return '<div class="staff-card' + (done ? ' is-done' : '') + (dim ? ' is-dim' : '') + '"' +
        ' style="--staff-origin:' + origin + '"' +
        ' data-origin="' + originSide + '"' +
        ' data-staff-card data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '">' +
        clearBtn +
        '<button type="button" class="staff-card__panel" data-staff-card-hit data-cart-id="' + staffRow.id + '" data-staff-id="' + st.id + '" aria-label="' + escapeHtml(st.name) + '">' +
        body +
        '</button>' +
        '</div>';
    }).join('');
    return '<div class="detail-item__staff-block detail-item__staff-block--cards' + (edit ? ' is-picking' : '') + '">' +
      (edit ? '<button type="button" class="staff-card-scrim" data-staff-scrim aria-label="取消选择"></button>' : '') +
      '<div class="staff-grid' + (edit ? ' is-morphing' : '') + '">' + cards + '</div>' +
      '</div>';
  }

  /* ---- 自 开单页面/index.html 原样复制 ---- */
  function animateStaffMorphLayout(grid) {
    if (!grid) return;
    var token = (grid._staffMorphToken = (grid._staffMorphToken || 0) + 1);
    var cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .staff-card'));
    var editing = cards.find(function (c) { return c.classList.contains('is-editing'); });
    var reduce = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cards.forEach(function (c) {
      c.classList.remove('is-pinching', 'is-expanding');
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

    var gap = 8;
    var narrowW = 32;
    var gridW = grid.clientWidth;
    if (gridW <= 0) return;
    var cellW = (gridW - gap * 2) / 3;
    var face = editing.querySelector('[data-face]') ? editing.querySelector('[data-face]').getAttribute('data-face') : '';
    var editWFull = face === 'role' ? gridW : Math.min(gridW, cellW * 2 + gap);
    var editW = Math.max(cellW, Math.round(editWFull * (2 / 3)));
    var idx = cards.indexOf(editing);
    if (idx < 0) return;
    var col = idx % 3;
    var rowStart = idx - col;
    var natural = [0, cellW + gap, 2 * (cellW + gap)];
    var lefts = [natural[0], natural[1], natural[2]];
    if (col === 0) {
      lefts[0] = 0;
      lefts[1] = editW + gap;
      lefts[2] = editW + gap * 2 + cellW;
    } else if (col === 2) {
      lefts[2] = gridW - editW;
      lefts[1] = lefts[2] - gap - cellW;
      lefts[0] = lefts[1] - gap - cellW;
    } else {
      lefts[1] = (gridW - editW) / 2;
      lefts[0] = lefts[1] - gap - cellW;
      lefts[2] = lefts[1] + editW + gap;
    }
    var narrowDx = (cellW - narrowW) / 2;

    var applyFinalLayout = function () {
      for (var i = 0; i < 3; i++) {
        var card = cards[rowStart + i];
        if (!card) continue;
        var dx = lefts[i] - natural[i];
        var w = (i === col) ? editW : cellW;
        card.style.transition = 'transform .17s cubic-bezier(.22,.82,.24,1), width .17s cubic-bezier(.22,.82,.24,1)';
        card.style.width = w + 'px';
        card.style.transform = 'translateX(' + dx + 'px)';
        if (i === col) card.style.zIndex = '6';
      }
    };

    if (reduce) {
      editing.classList.add('is-expanding');
      applyFinalLayout();
      return;
    }

    editing.style.zIndex = '6';
    editing.classList.add('is-pinching');
    editing.style.width = cellW + 'px';
    editing.style.transform = 'translateX(0)';
    for (var i = 0; i < 3; i++) {
      if (i === col) continue;
      var card = cards[rowStart + i];
      if (!card) continue;
      card.style.width = cellW + 'px';
      card.style.transform = 'translateX(0)';
    }
    void grid.offsetWidth;

    requestAnimationFrame(function () {
      if (grid._staffMorphToken !== token) return;
      editing.style.transition = 'transform .09s cubic-bezier(.4,0,.2,1), width .09s cubic-bezier(.4,0,.2,1)';
      editing.style.width = narrowW + 'px';
      editing.style.transform = 'translateX(' + narrowDx + 'px)';

      var phaseDone = false;
      var runExpand = function () {
        if (phaseDone || grid._staffMorphToken !== token) return;
        phaseDone = true;
        editing.classList.remove('is-pinching');
        editing.classList.add('is-expanding');
        applyFinalLayout();
      };
      var onShrinkEnd = function (e) {
        if (e && e.target !== editing) return;
        if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'transform') return;
        editing.removeEventListener('transitionend', onShrinkEnd);
        runExpand();
      };
      editing.addEventListener('transitionend', onShrinkEnd);
      setTimeout(runExpand, 110);
    });
  }

  function afterStaffPickerPaint(root) {
    requestAnimationFrame(function () {
      var grid = root && root.querySelector('.staff-grid') ? root.querySelector('.staff-grid') : null;
      if (grid) animateStaffMorphLayout(grid);
    });
  }

  function renderStaffInto(root) {
    if (!root) return;
    root.innerHTML = renderStaffPickerHtml();
    afterStaffPickerPaint(root);
  }

  function staffRoot() {
    return document.querySelector('#comm2StaffSheetMask [data-staff-root]');
  }

  function dismissMask() {
    staffCardEdit = null;
    var mask = $id('comm2StaffSheetMask');
    if (mask) mask.classList.remove('open');
  }

  function open() {
    var on = document.querySelector('.site-nav .nav-item.on');
    var from = on ? on.getAttribute('data-flow') : 'comm2-list';
    if (from && from !== 'comm2-staff') prevFlow = from;
    staffCardEdit = null;
    // 每次打开重置为未选（演示）
    staffRow = { id: '__linked', staffIds: [], staffRoles: {}, staffDesignated: {} };
    if (typeof g.showOnlyScreen === 'function') g.showOnlyScreen('screen-comm2-staff');
    var mask = $id('comm2StaffSheetMask');
    if (mask) mask.classList.add('open');
    renderStaffInto(staffRoot());
    if (g.setNavHighlight) g.setNavHighlight('comm2-staff');
  }

  function close() {
    dismissMask();
    var flow = prevFlow || 'comm2-list';
    if (g.FLOW_NAV && typeof g.FLOW_NAV[flow] === 'function' && flow !== 'comm2-staff') {
      g.FLOW_NAV[flow]();
    } else if (typeof g.showOnlyScreen === 'function') {
      g.showOnlyScreen('screen-comm2-list');
    }
    if (g.setNavHighlight) g.setNavHighlight(flow);
  }

  document.addEventListener('click', function (e) {
    var root = e.target.closest('#comm2StaffSheetMask [data-staff-root]');
    if (!root) return;
    var rerender = function () { renderStaffInto(root); };

    if (e.target.closest('[data-staff-scrim]')) {
      staffCardEdit = null;
      rerender();
      return;
    }
    var staffClear = e.target.closest('[data-staff-clear]');
    if (staffClear) {
      e.preventDefault(); e.stopPropagation();
      var sid = staffClear.getAttribute('data-staff-id');
      ensureStaffState();
      staffRow.staffIds = staffRow.staffIds.filter(function (x) { return x !== sid; });
      delete staffRow.staffRoles[sid];
      delete staffRow.staffDesignated[sid];
      if (staffCardEdit && staffCardEdit.staffId === sid) staffCardEdit = null;
      rerender();
      return;
    }
    var designateOpt = e.target.closest('[data-staff-opt-designate]');
    if (designateOpt) {
      e.preventDefault(); e.stopPropagation();
      var dSid = designateOpt.getAttribute('data-staff-id');
      if (!staffCardEdit || staffCardEdit.staffId !== dSid) return;
      staffCardEdit.face = 'role';
      staffCardEdit.draftDesignated = designateOpt.getAttribute('data-staff-opt-designate') === '1';
      rerender();
      return;
    }
    var roleOpt = e.target.closest('[data-staff-opt-role]');
    if (roleOpt) {
      e.preventDefault(); e.stopPropagation();
      var rSid = roleOpt.getAttribute('data-staff-id');
      if (!staffCardEdit || staffCardEdit.staffId !== rSid) return;
      ensureStaffState();
      if (staffRow.staffIds.indexOf(rSid) < 0) staffRow.staffIds.push(rSid);
      staffRow.staffDesignated[rSid] = !!staffCardEdit.draftDesignated;
      staffRow.staffRoles[rSid] = roleOpt.getAttribute('data-staff-opt-role') || STAFF_ROLE_DEFAULT;
      staffCardEdit = null;
      rerender();
      return;
    }
    var staffHit = e.target.closest('[data-staff-card-hit]');
    if (staffHit) {
      e.preventDefault();
      var hitSid = staffHit.getAttribute('data-staff-id');
      if (staffCardEdit && staffCardEdit.staffId === hitSid) {
        staffCardEdit = null;
      } else {
        ensureStaffState();
        staffCardEdit = { staffId: hitSid, face: 'designate', draftDesignated: null };
      }
      rerender();
    }
  });

  function wire() {
    var okBtn = $id('comm2StaffOk');
    if (okBtn) okBtn.addEventListener('click', function () {
      toast('已选 ' + staffRow.staffIds.length + ' 人');
      close();
    });
    var mask = $id('comm2StaffSheetMask');
    if (mask) mask.addEventListener('click', function (e) {
      if (e.target === mask) close();
    });
  }

  g.Comm2StaffDemo = {
    open: open,
    close: close,
    dismissMask: dismissMask,
    render: function () { renderStaffInto(staffRoot()); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})(window);
