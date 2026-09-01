/**
 * Build staff-management screens + masks from card/demo.html into 提成设置.
 * Scope: list / roles / detail / form + required pickers (no salary / ach / old-comm pages).
 */
const fs = require('fs');
const path = require('path');

const demoPath = 'd:/RTB优化工程/card/demo.html';
const outDir = __dirname;
const lines = fs.readFileSync(demoPath, 'utf8').split(/\r?\n/);

function extract(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

let screens = extract(15233, 15313);
screens = screens.replace(
  /<button type="button" class="back" data-emp-back aria-label="返回"/,
  '<button type="button" class="back" id="empStaffListBack" aria-label="返回"'
);

/* Masks: skip empSchemePickMask (already in salary fragment) and ach-only sheets */
const maskParts = [
  extract(16091, 16099),   // empPermHelpMask
  extract(16112, 16156),   // role / roleName / roleDel / perm
  extract(16169, 16203),   // status / detailStatus / leaveConfirm
  extract(16216, 16320),   // gender / age / avatar / album / crop / sword*
].join('\n\n');

/* Album sheet: ensure ≥34px bottom safe area */
let masks = maskParts.replace(
  /(<div class="emp-album-sheet__body">\s*<div class="emp-album-grid" id="empAlbumGrid"><\/div>\s*<\/div>)/,
  '$1\n    <div class="catalog-action-safe" aria-hidden="true"></div>'
);

const html = [
  '<!-- ==== STAFF MODULE (员工管理 from card employee) ==== -->',
  screens,
  '',
  masks,
  '',
  '<!-- ==== /STAFF MODULE ==== -->',
  '',
].join('\n');

fs.writeFileSync(path.join(outDir, 'staff-fragment.html'), html, 'utf8');
console.log('wrote staff-fragment.html', html.length, 'chars');

/* Copy emp-swords */
const srcSwords = 'd:/RTB优化工程/card/assets/emp-swords';
const dstSwords = path.join(outDir, 'assets', 'emp-swords');
fs.mkdirSync(dstSwords, { recursive: true });
let n = 0;
for (const name of fs.readdirSync(srcSwords)) {
  fs.copyFileSync(path.join(srcSwords, name), path.join(dstSwords, name));
  n += 1;
}
console.log('copied emp-swords:', n);

const staffIcon = 'd:/RTB优化工程/card/assets/workbench/staff.png';
if (fs.existsSync(staffIcon)) {
  const wb = path.join(outDir, 'assets', 'workbench');
  fs.mkdirSync(wb, { recursive: true });
  fs.copyFileSync(staffIcon, path.join(wb, 'staff.png'));
  console.log('copied workbench/staff.png');
}
