/**
 * Build salary module assets from card/demo.html into 提成设置 standalone.
 */
const fs = require('fs');
const path = require('path');

const demoPath = 'd:/RTB优化工程/card/demo.html';
const outDir = __dirname;
const lines = fs.readFileSync(demoPath, 'utf8').split(/\r?\n/);

function extract(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

/* ---- CSS ---- */
const cssRanges = [
  [231, 238],
  [4710, 7823],      // full employee module CSS
  [8549, 8555],      // page-title-bar .emp-title-link
  [11441, 11522],    // flow-balance-cal + bill-date-quick
];
const css = [
  '/* salary / employee UI extracted from card/demo.html */',
  ...cssRanges.map(([a, b]) => `/* demo L${a}-${b} */\n${extract(a, b)}`),
].join('\n\n') + '\n';
fs.writeFileSync(path.join(outDir, 'salary.css'), css, 'utf8');

/* ---- HTML fragment ---- */
const htmlParts = [
  '<!-- ==== SALARY MODULE (from card employee) ==== -->',
  extract(15315, 15373),
  extract(15861, 15933),
  extract(16158, 16167), // empSchemePickMask for 设奖惩选员工
  '<!-- ==== /SALARY MODULE ==== -->',
];
const frag = htmlParts.join('\n\n') + '\n';
// salary list back: stay on salary (AAAA Q4)
const fragPatched = frag.replace(
  /(<div class="screen hidden" id="screen-emp-salary">[\s\S]*?<button type="button" class="back") data-emp-back/,
  '$1 id="empSalaryListBack"'
);
fs.writeFileSync(path.join(outDir, 'salary-fragment.html'), fragPatched, 'utf8');

/* ---- Employee JS with stubs ---- */
const shim = `/* salary standalone shim */
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

`;
const empJs = extract(34879, 43725);
fs.writeFileSync(path.join(outDir, 'employee.js'), shim + empJs + '\n', 'utf8');

console.log('salary.css lines', css.split('\n').length);
console.log('salary-fragment.html bytes', fragPatched.length);
console.log('employee.js lines', (shim + empJs).split('\n').length);
