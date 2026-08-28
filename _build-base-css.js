/**
 * Rebuild base.css from demo.html using complete line ranges (no mid-rule cuts).
 */
const fs = require('fs');
const path = require('path');

const demoPath = 'd:/RTB优化工程/card/demo.html';
const outPath = path.join(__dirname, 'base.css');
const lines = fs.readFileSync(demoPath, 'utf8').split(/\r?\n/);

const ranges = [
  [32, 52],       // :root
  [207, 265],     // .phone typography + .screen.hidden
  [267, 535],     // page chrome, page-body, bottom-bar, btn-main
  [1230, 1244],   // toast
  [1279, 1283],   // ui-nav-chev
  [1345, 1397],   // picker-mask / sheet / foot
  [1749, 1783],   // amount keypad
  [2607, 2615],   // figma capture comm2-advisor
  [2826, 2979],   // catalog-group tabs (comm2 pick)
  [3607, 3687],   // catalog-action menu sheet
  [4182, 4219],   // picker-sheet--menu overrides
  [4350, 4382],   // dialog
  [5999, 6009],   // title--with-help
  [6133, 6220],   // emp-ach-edit (cat sheet body)
  [6556, 6650],   // emp-comm-card
  [6997, 6998],   // dialog--emp-help h4
  [7376, 7426],   // emp-assign
  [7513, 7525],   // emp-help + dialog--emp-help
  [7550, 7554],   // emp-name-dialog-input
];

function extract(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

const header = `/* comm2 standalone · shared UI extracted from card/demo.html */\n\n`;
const phoneAlias = `
/* Standalone shell: .phone-inner acts as .phone */
.phone-inner.phone,
#frame.phone-shell {
  width: var(--phone-w);
  height: var(--phone-h);
  overflow: hidden;
  position: relative;
  background: var(--bg-page);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.phone-inner .picker-mask,
.phone-inner .dialog-mask {
  position: absolute;
  inset: 0;
}
.phone-inner .toast-msg {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}
`;

const body = ranges.map(([a, b]) => `/* demo L${a}-${b} */\n${extract(a, b)}`).join('\n\n');
const css = header + phoneAlias + '\n' + body + '\n';

fs.writeFileSync(outPath, css, 'utf8');

// Brace balance check (ignore strings/comments roughly)
let depth = 0;
let i = 0;
const s = css;
while (i < s.length) {
  const c = s[i];
  if (c === '/' && s[i + 1] === '*') {
    i += 2;
    while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
    i += 2;
    continue;
  }
  if (c === '"' || c === "'") {
    const q = c;
    i++;
    while (i < s.length && s[i] !== q) {
      if (s[i] === '\\') i++;
      i++;
    }
    i++;
    continue;
  }
  if (c === '{') depth++;
  if (c === '}') depth--;
  i++;
}
if (depth !== 0) {
  console.error('Brace imbalance:', depth);
  process.exit(1);
}
console.log('base.css OK, lines:', css.split('\n').length, 'depth:', depth);
