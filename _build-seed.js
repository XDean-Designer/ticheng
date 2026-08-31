const fs = require('fs');
const path = require('path');

const demoPath = 'd:/RTB优化工程/card/demo.html';
const outPath = path.join(__dirname, 'seed-data.js');
const lines = fs.readFileSync(demoPath, 'utf8').split(/\r?\n/);

function extract(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

const body = [
  'const PROJ_DEMO_IMG_POOL = [];',
  extract(19229, 19232),
  extract(19267, 19399),
  extract(19447, 19474),
  extract(19759, 19759),
  extract(19829, 19834),
  extract(19856, 19859),
  extract(20501, 20501),
  extract(21354, 21678),
  extract(29091, 29101),
  extract(29492, 29506),
].join('\n\n');

const full = `'use strict';
(function (g) {
const state = {
  projectCatalog: [], productCatalog: [],
  catalogGroups: { project: [], product: [] },
  templates: [], cardGroups: [],
  activeCardGroupIdBySurface: { list: 'all', billing: 'all', empAch: 'all', empScope: 'all' },
};
function isProductCatalogTab() { return false; }
function buildDemoTemplates() {
  const now = Date.now();
  return QUICK_TEMPLATES.map((qt, i) => ({
    id: 'demo_' + qt.id,
    shelved: qt.id === 'kids_times',
    createdAt: now - i * 3600000,
    name: qt.preset.name,
  }));
}
function initComm2Seed() {
  if (!getCatalogProjects().length) state.projectCatalog = seedProjectCatalog();
  if (!getCatalogProducts().length) state.productCatalog = seedProductCatalog();
  if (!state.catalogGroups.project.length && !state.catalogGroups.product.length) state.catalogGroups = seedCatalogGroups();
  ensureSystemHiddenGroups();
  if (!state.templates.length) state.templates = buildDemoTemplates();
  if (!state.cardGroups.length) state.cardGroups = seedCardGroups();
}

${body}

g.getCatalogProjects = getCatalogProjects;
g.getCatalogProducts = getCatalogProducts;
g.getActiveTemplates = getActiveTemplates;
g.getShelvedTemplates = getShelvedTemplates;
g.getCustomCatalogGroups = getCustomCatalogGroups;
g.ensureCardGroups = ensureCardGroups;
g.EmployeeStore = { staff: [
  { id:'st0', name:'顾清扬', short:'顾', status:'在岗', role:'店主', avatar:'assets/emp-avatars/man-e.jpg' },
  { id:'st1', name:'林屿森', short:'森', status:'在岗', role:'美容师', avatar:'assets/emp-avatars/man-a.jpg' },
  { id:'st2', name:'何苏叶', short:'叶', status:'在岗', role:'店长', avatar:'assets/emp-avatars/woman-a.jpg' },
  { id:'st3', name:'阿Ken', short:'Ken', status:'在岗', role:'美容师', avatar:'assets/emp-avatars/man-b.jpg' },
  { id:'st4', name:'Lisa', short:'Lisa', status:'在岗', role:'美甲师', avatar:'assets/emp-avatars/woman-b.jpg' },
]};
g.EmployeeDemo = { getBillingStaffPool: function () {
  return g.EmployeeStore.staff.filter(function (s) { return s.status === '在岗'; })
    .map(function (s) { return { id:s.id, name:s.name, short:s.short, avatar:s.avatar||'', role:s.role||'' }; });
}};
initComm2Seed();
})(typeof window !== 'undefined' ? window : globalThis);
`;

fs.writeFileSync(outPath, full, 'utf8');
require('child_process').execSync('node --check "' + outPath + '"', { stdio: 'inherit' });
console.log('seed-data.js OK, lines:', full.split('\n').length);
