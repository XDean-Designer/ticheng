'use strict';
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

const PROJ_DEMO_IMG_POOL = [];

const CATALOG_SYS_HIDDEN_GROUP = {
  project: { id: 'g_sys_hidden_project', name: '隐藏', system: true },
  product: { id: 'g_sys_hidden_product', name: '隐藏', system: true },
};

function seedProjectCatalog() {
  const list = [
    { id: 'p1', name: '时尚洗吹', price: 58, duration: 60, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p2', name: '精致剪发', price: 98, duration: 45, onSale: true, bookable: true, category: '剪发' },
    { id: 'p3', name: '洗剪吹', price: 68, duration: 60, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p4', name: '儿童剪发', price: 48, duration: 55, onSale: true, bookable: true, category: '剪发' },
    { id: 'p5', name: '女士造型', price: 128, duration: 45, onSale: true, bookable: true, category: '造型' },
    { id: 'p6', name: '染发', price: 358, duration: 120, onSale: true, bookable: true, category: '烫染' },
    { id: 'p7', name: '漂发', price: 288, duration: 120, onSale: true, bookable: true, category: '烫染' },
    { id: 'p8', name: '烫发', price: 398, duration: 150, onSale: true, bookable: true, category: '烫染' },
    { id: 'p9', name: '摩根烫', price: 458, duration: 150, onSale: true, bookable: false, category: '烫染' },
    { id: 'p10', name: '电棒烫', price: 428, duration: 150, onSale: true, bookable: true, category: '烫染' },
    { id: 'p11', name: '深层滋养', price: 198, duration: 75, onSale: true, bookable: true, category: '护理' },
    { id: 'p12', name: '蛋白矫正', price: 598, duration: 120, onSale: true, bookable: true, category: '护理' },
    { id: 'p13', name: '头疗', price: 138, duration: 50, onSale: true, bookable: true, category: '护理' },
    { id: 'p14', name: '接发', price: 888, duration: 180, onSale: false, bookable: false, category: '造型' },
    { id: 'p15', name: '头皮护理', price: 168, duration: 60, onSale: true, bookable: true, category: '护理' },
    { id: 'p16', name: '挑染', price: 198, duration: 90, onSale: true, bookable: true, category: '烫染' },
    { id: 'p17', name: '时尚造型', price: 128, duration: 45, onSale: true, bookable: true, category: '造型' },
    { id: 'p18', name: '暖色漂褪', price: 328, duration: 120, onSale: true, bookable: false, category: '烫染' },
    { id: 'p19', name: '洗头', price: 28, duration: 20, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p20', name: '面部清洁护理', price: 168, duration: 60, onSale: true, bookable: true, category: '美容' },
    { id: 'p21', name: '深层补水护理', price: 268, duration: 75, onSale: true, bookable: true, category: '美容' },
    { id: 'p22', name: '美白淡斑护理', price: 398, duration: 90, onSale: true, bookable: true, category: '美容' },
    { id: 'p23', name: '手部基础美甲', price: 98, duration: 45, onSale: true, bookable: true, category: '美甲' },
    { id: 'p24', name: '猫眼甲油胶', price: 158, duration: 60, onSale: true, bookable: true, category: '美甲' },
    { id: 'p25', name: '卸甲重做', price: 68, duration: 40, onSale: true, bookable: false, category: '美甲' },
    { id: 'p26', name: '开花嫁接睫毛', price: 288, duration: 90, onSale: true, bookable: true, category: '美睫' },
    { id: 'p27', name: '美睫补嫁', price: 128, duration: 45, onSale: true, bookable: true, category: '美睫' },
  ].map(p => ({
    ...p,
    images: [],
    hasImage: false,
    boundToCard: false,
    boundToCoupon: false,
    boundToMall: false,
    hidden: false,
    boundTemplateIds: [],
    boundTemplateId: null,
    boundTemplateNames: [],
  }));
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  if (byId.p16) byId.p16.boundToCoupon = true;
  if (byId.p9) byId.p9.boundToMall = true;
  if (byId.p13) { byId.p13.hidden = true; byId.p13.bookable = false; }
  if (byId.p5) { byId.p5.hidden = true; byId.p5.bookable = false; }
  /* Figma 305:325 · 绑卡详情默认展开多图，右侧可看出渐隐 */
  if (byId.p4) {
    byId.p4.images = PROJ_DEMO_IMG_POOL.slice(0, 4);
    byId.p4.hasImage = true;
  }
  if (byId.p15) {
    byId.p15.images = [PROJ_DEMO_IMG_POOL[0]];
    byId.p15.hasImage = true;
  }
  return list;
}

function seedProductCatalog() {
  const list = [
    { id: 'pd1', name: '剑琅修护洗发水', spec: '500ml', price: 128, onSale: true, category: '洗护' },
    { id: 'pd2', name: '剑琅滋养护发素', spec: '500ml', price: 98, onSale: true, category: '洗护' },
    { id: 'pd3', name: '剑琅头皮护理精华', spec: '100ml', price: 168, onSale: true, category: '护理' },
    { id: 'pd4', name: '剑琅造型发蜡', spec: '80g', price: 88, onSale: true, category: '造型' },
    { id: 'pd5', name: '剑琅染发护色套装', spec: '', price: 198, onSale: true, category: '烫染' },
    { id: 'pd6', name: '剑琅免洗喷雾', spec: '150ml', price: 68, onSale: true, category: '护理' },
    { id: 'pd7', name: '剑琅儿童温和洗发水', spec: '300ml', price: 78, onSale: false, category: '洗护' },
    { id: 'pd8', name: '剑琅控油洗发水', spec: '400ml', price: 118, onSale: true, category: '洗护' },
    { id: 'pd9', name: '剑琅柔顺发膜', spec: '200ml', price: 148, onSale: true, category: '护理' },
    { id: 'pd10', name: '剑琅护发精油', spec: '50ml', price: 158, onSale: true, category: '护理' },
    { id: 'pd11', name: '剑琅哑光发泥', spec: '100g', price: 78, onSale: true, category: '造型' },
    { id: 'pd12', name: '剑琅定型喷雾', spec: '300ml', price: 88, onSale: true, category: '造型' },
    { id: 'pd13', name: '剑琅漂后修护乳', spec: '250ml', price: 138, onSale: true, category: '烫染' },
    { id: 'pd14', name: '剑琅护色洗发水', spec: '500ml', price: 138, onSale: true, category: '烫染' },
    { id: 'pd15', name: '剑琅儿童护发素', spec: '250ml', price: 68, onSale: true, category: '洗护' },
    { id: 'pd16', name: '剑琅头皮清洁泥', spec: '120g', price: 128, onSale: true, category: '护理' },
    { id: 'pd17', name: '剑琅旅行装洗护套', spec: '', price: 88, onSale: true, category: '洗护' },
    { id: 'pd18', name: '剑琅烫后还原霜', spec: '200ml', price: 118, onSale: false, category: '烫染' },
    { id: 'pd19', name: '剑琅玻尿酸精华液', spec: '30ml', price: 198, onSale: true, category: '美容' },
    { id: 'pd20', name: '剑琅补水面膜', spec: '5片', price: 88, onSale: true, category: '美容' },
    { id: 'pd21', name: '剑琅甲油胶套装', spec: '12色', price: 168, onSale: true, category: '美甲' },
    { id: 'pd22', name: '剑琅指缘护理油', spec: '15ml', price: 58, onSale: true, category: '美甲' },
    { id: 'pd23', name: '剑琅睫毛胶水', spec: '5ml', price: 78, onSale: true, category: '美睫' },
    { id: 'pd24', name: '剑琅美睫卸除液', spec: '50ml', price: 48, onSale: true, category: '美睫' },
  ].map(p => ({
    ...p,
    boundToCard: false,
    boundToCoupon: false,
    boundToMall: false,
    hidden: false,
    boundTemplateIds: [],
    boundTemplateId: null,
    boundTemplateNames: [],
  }));
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  if (byId.pd6) byId.pd6.boundToCoupon = true;
  if (byId.pd11) byId.pd11.boundToMall = true;
  if (byId.pd17) byId.pd17.hidden = true;
  if (byId.pd4) byId.pd4.hidden = true;
  return list;
}

function seedCatalogGroups() {
  return {
    project: [
      { id: 'g_proj_wash', name: '洗吹', itemIds: ['p1', 'p3', 'p19'] },
      { id: 'g_proj_tang', name: '烫染', itemIds: ['p6', 'p7', 'p8', 'p9', 'p10', 'p16', 'p18'] },
      { id: 'g_proj_care', name: '护理', itemIds: ['p11', 'p12', 'p13', 'p15'] },
      { id: 'g_proj_cut', name: '剪发造型', itemIds: ['p2', 'p4', 'p5', 'p14', 'p17'] },
      { id: 'g_proj_beauty', name: '美容', itemIds: ['p20', 'p21', 'p22'] },
      { id: 'g_proj_nail', name: '美甲', itemIds: ['p23', 'p24', 'p25'] },
      { id: 'g_proj_lash', name: '美睫', itemIds: ['p26', 'p27'] },
      { id: 'g_proj_empty', name: '待配置', itemIds: [] },
      { id: CATALOG_SYS_HIDDEN_GROUP.project.id, name: '隐藏', system: true, itemIds: ['p13', 'p5'] },
    ],
    product: [
      { id: 'g_prod_wash', name: '洗护', itemIds: ['pd1', 'pd2', 'pd7', 'pd8', 'pd14', 'pd15', 'pd17'] },
      { id: 'g_prod_care', name: '头皮护理', itemIds: ['pd3', 'pd6', 'pd9', 'pd10', 'pd16'] },
      { id: 'g_prod_style', name: '造型', itemIds: ['pd4', 'pd11', 'pd12'] },
      { id: 'g_prod_color', name: '烫染护理', itemIds: ['pd5', 'pd13', 'pd14', 'pd18'] },
      { id: 'g_prod_beauty', name: '美容', itemIds: ['pd19', 'pd20'] },
      { id: 'g_prod_nail', name: '美甲', itemIds: ['pd21', 'pd22'] },
      { id: 'g_prod_lash', name: '美睫', itemIds: ['pd23', 'pd24'] },
      { id: 'g_prod_kids', name: '儿童专区', itemIds: ['pd7', 'pd15'] },
      { id: 'g_prod_empty', name: '待配置', itemIds: [] },
      { id: CATALOG_SYS_HIDDEN_GROUP.product.id, name: '隐藏', system: true, itemIds: ['pd17', 'pd4'] },
    ],
  };
}

function emptyCatalogGroups() {
  return { project: [], product: [] };
}

function isCatalogSystemGroup(g) {
  return !!g?.system;
}

function getCatalogItemsForBucket(bucket) {
  return bucket === 'product' ? getCatalogProducts() : getCatalogProjects();
}

function ensureSystemHiddenGroups() {
  ['project', 'product'].forEach(bucket => {
    const groups = getCatalogGroupsForBucket(bucket);
    const meta = CATALOG_SYS_HIDDEN_GROUP[bucket];
    let sys = groups.find(g => g.id === meta.id);
    if (!sys) {
      sys = { id: meta.id, name: meta.name, system: true, itemIds: [] };
      groups.push(sys);
    } else {
      sys.system = true;
      sys.name = meta.name;
    }
    sys.itemIds = getCatalogItemsForBucket(bucket).filter(p => p.hidden).map(p => p.id);
  });
}

function getCustomCatalogGroups(bucket) {
  ensureSystemHiddenGroups();
  return getCatalogGroupsForBucket(bucket).filter(g => !g.system);
}

function getCatalogProducts() { return state.productCatalog || []; }

function getCatalogGroupsForBucket(bucket) {
  const key = bucket || getCatalogGroupBucket();
  if (!state.catalogGroups) state.catalogGroups = emptyCatalogGroups();
  if (!Array.isArray(state.catalogGroups[key])) state.catalogGroups[key] = [];
  return state.catalogGroups[key];
}

function findCatalogGroupById(id, bucket) {
  if (!id || id === 'all') return null;
  return getCatalogGroupsForBucket(bucket).find(g => g.id === id) || null;
}

function getCatalogProjects() { return state.projectCatalog || []; }

const DEMO_TANG_GROUP_MEMBER_PRICES = {
  '烫发': { tickIndex: 17 },
  '染发': { mode: 'fixed', amount: '299' },
  '漂发': { mode: 'fixed', amount: '238' },
  '摩根烫': { tickIndex: 16 },
  '电棒烫': { mode: 'fixed', amount: '368' },
  '挑染': { tickIndex: 16 },
  '暖色漂褪': { tickIndex: 16 },
};

/** 价目「洗吹」分组 · 会员价 */
const DEMO_WASH_GROUP_MEMBER_PRICES = {
  '时尚洗吹': { tickIndex: 16 },
  '洗剪吹': { tickIndex: 16 },
  '洗头': { tickIndex: 17 },
};

const QUICK_TEMPLATES = [
  {
    id: 'vip_combo',
    title: '尊享组合',
    desc: '均值·面值+洗吹/剪发/护理次+烫染折+产品',
    icon: '',
    preset: {
      name: '尊享组合卡',
      audience: ['all'],
      recharge: '2000',
      giftAmount: '500',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: true, timesOrValidity: true, products: true, projectDiscount: true, balanceCanBuyProducts: false },
      projectItems: [
        { id: 'demo_vip_wash_blow', name: '时尚洗吹', purchaseQty: 8, giftQty: 0, unlimited: false },
        { id: 'demo_vip_wash', name: '洗剪吹', purchaseQty: 10, giftQty: 0, unlimited: false },
        { id: 'demo_vip_fine_cut', name: '精致剪发', purchaseQty: 5, giftQty: 1, unlimited: false },
        { id: 'demo_vip_style', name: '时尚造型', purchaseQty: 2, giftQty: 0, unlimited: false },
        { id: 'demo_vip_deep_nourish', name: '深层滋养', purchaseQty: 3, giftQty: 0, unlimited: false },
        { id: 'demo_vip_scalp', name: '头皮护理', purchaseQty: 2, giftQty: 0, unlimited: false },
      ],
      productItems: [
        { id: 'demo_vip_pd_shampoo', name: '剑琅修护洗发水', qty: 2 },
        { id: 'demo_vip_pd_mud', name: '剑琅哑光发泥', qty: 1 },
        { id: 'demo_vip_pd_oil', name: '剑琅护发精油', qty: 1 },
      ],
      memberPrices: { ...DEMO_TANG_GROUP_MEMBER_PRICES },
      cardColor: 'peach',
      cardDesc: '演示用·分组取样：洗吹/剪发造型/护理计次 + 烫染全组折扣 + 可见产品；不含隐藏项',
    },
  },
  {
    id: 'new_first',
    title: '新客首开',
    desc: '均值·纯面值 · 消耗折算',
    icon: '',
    preset: {
      name: '新客首开卡',
      audience: ['new_first'],
      recharge: '300',
      giftAmount: '50',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: true, timesOrValidity: false, projectDiscount: false },
      cardColor: 'mint',
      cardDesc: '演示用·均值纯面值：m3 接近耗尽，m5 零消耗对照',
    },
  },
  {
    id: 'old_renew',
    title: '老客续充',
    desc: '均值·面值+洗吹分组折扣',
    icon: '',
    preset: {
      name: '老客续充卡',
      audience: ['old_renew'],
      recharge: '1000',
      giftAmount: '200',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: true, timesOrValidity: false, projectDiscount: true },
      memberPrices: { ...DEMO_WASH_GROUP_MEMBER_PRICES },
      cardColor: 'haze',
      cardDesc: '演示用·面值+洗吹分组折扣（时尚洗吹/洗剪吹/洗头）；退卡/延期可看延期费用',
    },
  },
  {
    id: 'kids_times',
    title: '儿童10次',
    desc: '已下架·纯次数 · 仅已持卡',
    icon: '',
    preset: {
      name: '儿童10次剪发',
      audience: ['kids'],
      recharge: '498',
      benefits: { balance: false, timesOrValidity: true, projectDiscount: false },
      validityKey: '6m', validityMonths: 6,
      projectItems: [{ id: 'demo_kids', name: '儿童剪发', purchaseQty: 10, giftQty: 0, unlimited: false }],
      cardColor: 'teal',
      cardDesc: '演示用·已下架：列表「已下架」Tab；办卡入口锁定，可管理已持卡',
    },
  },
  {
    id: 'perm_color_discount',
    title: '烫染会员价',
    desc: '均值·烫染分组折扣 · 对照减值',
    icon: '',
    preset: {
      name: '烫染会员价卡',
      audience: ['all'],
      recharge: '599',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: false, projectDiscount: true },
      memberPrices: { ...DEMO_TANG_GROUP_MEMBER_PRICES },
      cardColor: 'taro',
      cardDesc: '演示用·烫染分组全部在售项折扣；可与「减值烫染卡」对照；含延期费用',
    },
  },
  {
    id: 'retail_perm_color',
    title: '减值烫染',
    desc: '减值·烫染分组折扣 · 对照均值',
    icon: '',
    preset: {
      name: '减值烫染卡',
      audience: ['all'],
      recharge: '599',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: false, projectDiscount: true },
      memberPrices: { ...DEMO_TANG_GROUP_MEMBER_PRICES },
      cardColor: 'purple',
      usagePolicy: { refundRule: 'retail', performanceRule: 'retail' },
      cardDesc: '演示用·权益同烫染会员价卡（烫染全组），仅用卡策略为减值',
    },
  },
  {
    id: 'year_wash',
    title: '洗吹12次',
    desc: '均值·洗吹分组计次 · 含赠送',
    icon: '',
    preset: {
      name: '洗吹12次卡',
      audience: ['all'],
      recharge: '888',
      benefits: { balance: false, timesOrValidity: true, projectDiscount: false },
      validityKey: '1y', validityMonths: 12,
      projectItems: [
        { id: 'demo_wash', name: '时尚洗吹', purchaseQty: 12, giftQty: 0, unlimited: false },
        { id: 'demo_wash_cut_gift', name: '洗剪吹', purchaseQty: 0, giftQty: 2, unlimited: false },
      ],
      cardColor: 'milk',
      cardDesc: '演示用·洗吹分组：时尚洗吹×12 + 赠洗剪吹×2；不含护理跨组赠送',
    },
  },
  {
    id: 'retail_policy',
    title: '减值策略',
    desc: '减值·纯次数 · 对照儿童卡均值',
    icon: '',
    preset: {
      name: '减值策略演示卡',
      audience: ['all'],
      recharge: '498',
      benefits: { balance: false, timesOrValidity: true, projectDiscount: false },
      validityKey: '6m', validityMonths: 6,
      projectItems: [{ id: 'demo_retail_kids', name: '儿童剪发', purchaseQty: 10, giftQty: 0, unlimited: false }],
      cardColor: 'brand_red',
      usagePolicy: { refundRule: 'retail', performanceRule: 'retail' },
      cardDesc: '演示用·减值次数：权益同儿童10次（上架版）；与均值儿童卡对照退卡金额',
    },
  },
  {
    id: 'lifetime_balance',
    title: '永久储值',
    desc: '永久有效·纯面值 · 无延期',
    icon: '',
    preset: {
      name: '永久储值卡',
      audience: ['all'],
      recharge: '1000',
      giftAmount: '100',
      validityKey: 'permanent',
      benefits: { balance: true, timesOrValidity: false, projectDiscount: false },
      cardColor: 'teal',
      cardDesc: '演示用·永久有效：持卡无卡级到期日，退卡/延期 Tab 不展示延期',
    },
  },
  {
    id: 'home_care_pack',
    title: '居家洗护包',
    desc: '纯产品 · 洗护+头皮护理可见项',
    icon: '',
    preset: {
      name: '居家洗护包',
      audience: ['all'],
      recharge: '399',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: false, products: true, projectDiscount: false, balanceCanBuyProducts: false },
      productItems: [
        { id: 'demo_care_shampoo', name: '剑琅修护洗发水', qty: 1 },
        { id: 'demo_care_cond', name: '剑琅滋养护发素', qty: 1 },
        { id: 'demo_care_serum', name: '剑琅头皮护理精华', qty: 1 },
        { id: 'demo_care_mask', name: '剑琅柔顺发膜', qty: 1 },
      ],
      cardColor: 'gold',
      cardDesc: '演示用·产品分组取样：洗护+头皮护理；不含隐藏「造型发蜡」',
    },
  },
  {
    id: 'care_pack',
    title: '护理体验包',
    desc: '均值·护理分组计次',
    icon: '',
    preset: {
      name: '护理体验包',
      audience: ['all'],
      recharge: '598',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: true, products: false, projectDiscount: false, balanceCanBuyProducts: false },
      projectItems: [
        { id: 'demo_care_nourish', name: '深层滋养', purchaseQty: 3, giftQty: 0, unlimited: false },
        { id: 'demo_care_scalp', name: '头皮护理', purchaseQty: 2, giftQty: 0, unlimited: false },
        { id: 'demo_care_protein', name: '蛋白矫正', purchaseQty: 1, giftQty: 0, unlimited: false },
      ],
      cardColor: 'mint',
      cardDesc: '演示用·护理分组可见项计次；不含隐藏「头疗」',
    },
  },
  {
    id: 'unlimited_wash',
    title: '洗吹不限次',
    desc: '洗吹分组·不限次 · Step3 专用公式',
    icon: '',
    preset: {
      name: '洗吹不限次卡',
      audience: ['all'],
      recharge: '1288',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: true, products: false, projectDiscount: false, balanceCanBuyProducts: false },
      projectItems: [
        { id: 'demo_unlim_blow', name: '时尚洗吹', purchaseQty: 0, giftQty: 0, unlimited: true },
        { id: 'demo_unlim_cut', name: '洗剪吹', purchaseQty: 0, giftQty: 0, unlimited: true },
        { id: 'demo_unlim_shampoo', name: '洗头', purchaseQty: 0, giftQty: 0, unlimited: true },
      ],
      cardColor: 'blue',
      cardDesc: '演示用·洗吹分组三项不限次；Step3/退卡按已过天数摊销',
    },
  },
  {
    id: 'shared_cut_pool',
    title: '剪发造型共计',
    desc: '共计池 · 剪发造型可见项',
    icon: '',
    preset: {
      name: '剪发造型共计10次卡',
      audience: ['all'],
      recharge: '698',
      validityKey: '6m', validityMonths: 6,
      benefits: { balance: false, timesOrValidity: true, products: false, projectDiscount: false, balanceCanBuyProducts: false },
      projectItems: [
        { id: 'demo_shared_fine', name: '精致剪发', purchaseQty: 10, giftQty: 0, unlimited: false, qtyScope: 'shared', sharedGroupId: 'demo_shared_cut' },
        { id: 'demo_shared_kids', name: '儿童剪发', purchaseQty: 10, giftQty: 0, unlimited: false, qtyScope: 'shared', sharedGroupId: 'demo_shared_cut' },
        { id: 'demo_shared_style', name: '时尚造型', purchaseQty: 10, giftQty: 0, unlimited: false, qtyScope: 'shared', sharedGroupId: 'demo_shared_cut' },
      ],
      cardColor: 'brand_red',
      cardDesc: '演示用·剪发造型可见项共计池（不含隐藏「女士造型」/未上架「接发」）',
    },
  },

  {
    id: 'face_care_times',
    title: '面部护理次卡',
    desc: '独立计次 · 美容名义',
    icon: '',
    preset: {
      name: '面部护理10次卡',
      audience: ['all'],
      recharge: '1980',
      giftAmount: '0',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: false, timesOrValidity: true, products: false, projectDiscount: false, balanceCanBuyProducts: false },
      simpleTimesMode: true,
      simpleTimesQty: 10,
      simpleTimesProjectName: '面部护理10次卡',
      projectItems: [
        { id: 'demo_face_care_st', name: '面部护理10次卡', purchaseQty: 10, giftQty: 0, unlimited: false },
      ],
      cardColor: 'brand_red',
      cardDesc: '演示用·独立计次：名义项目=卡名，不进价目表',
    },
  },
  {
    id: 'cut_style_times',
    title: '剪发造型次卡',
    desc: '独立计次 · 剪发名义',
    icon: '',
    preset: {
      name: '剪发造型10次卡',
      audience: ['all'],
      recharge: '680',
      giftAmount: '0',
      validityKey: '6m', validityMonths: 6,
      benefits: { balance: false, timesOrValidity: true, products: false, projectDiscount: false, balanceCanBuyProducts: false },
      simpleTimesMode: true,
      simpleTimesQty: 10,
      simpleTimesProjectName: '剪发造型10次卡',
      projectItems: [
        { id: 'demo_cut_style_st', name: '剪发造型10次卡', purchaseQty: 10, giftQty: 0, unlimited: false },
      ],
      cardColor: 'peach',
      cardDesc: '演示用·独立计次：名义项目=卡名，不进价目表',
    },
  },
  {
    id: 'editable_demo',
    title: '可编辑演示',
    desc: '无持卡 · 详情可进编辑',
    icon: '',
    preset: {
      name: '可编辑演示卡',
      audience: ['all'],
      recharge: '500',
      giftAmount: '80',
      validityKey: '1y', validityMonths: 12,
      benefits: { balance: true, timesOrValidity: false, projectDiscount: false },
      cardColor: 'teal',
      cardDesc: '演示用：当前有效为 0，详情页「编辑」可正常进入修改全流程',
    },
  },
];

function getShelvedTemplates() {
  return state.templates
    .filter(t => t.shelved)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function getActiveTemplates() {
  return state.templates
    .filter(t => !t.shelved)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function seedCardGroups() {
  return [
    { id: 'cg_combo', name: '组合储值', itemIds: ['demo_vip_combo', 'demo_old_renew', 'demo_lifetime_balance', 'demo_editable'] },
    { id: 'cg_times', name: '次卡套餐', itemIds: ['demo_year_wash', 'demo_unlimited_wash', 'demo_shared_cut_pool', 'demo_care_pack', 'demo_kids_times'] },
    { id: 'cg_discount', name: '会员价/烫染', itemIds: ['demo_perm_color_discount', 'demo_retail_perm_color', 'demo_retail_policy'] },
    { id: 'cg_product', name: '产品权益', itemIds: ['demo_home_care_pack'] },
    { id: 'cg_new', name: '新客活动', itemIds: ['demo_new_first'] },
    { id: 'cg_empty', name: '待配置', itemIds: [] },
  ];
}

function ensureCardGroups() {
  if (!Array.isArray(state.cardGroups)) state.cardGroups = [];
  return state.cardGroups;
}

g.getCatalogProjects = getCatalogProjects;
g.getCatalogProducts = getCatalogProducts;
g.getActiveTemplates = getActiveTemplates;
g.getShelvedTemplates = getShelvedTemplates;
g.getCustomCatalogGroups = getCustomCatalogGroups;
g.ensureCardGroups = ensureCardGroups;
g.EmployeeStore = { staff: [
  { id:'st1', name:'林屿森', short:'森', status:'在岗', role:'美容师', avatar:'assets/emp-avatars/man-a.jpg' },
  { id:'st2', name:'何苏叶', short:'叶', status:'在岗', role:'店长', avatar:'assets/emp-avatars/woman-a.jpg' },
  { id:'st3', name:'阿Ken', short:'Ken', status:'在岗', role:'美容师', avatar:'assets/emp-avatars/man-b.jpg' },
  { id:'st4', name:'Lisa', short:'Lisa', status:'在岗', role:'美甲师', avatar:'assets/emp-avatars/woman-b.jpg' },
  { id:'st5', name:'张明', short:'张', status:'在岗', role:'美发师', avatar:'assets/emp-avatars/man-c.jpg' },
  { id:'st6', name:'李华', short:'李', status:'在岗', role:'美发师', avatar:'assets/emp-avatars/man-a.jpg' },
  { id:'st7', name:'王芳', short:'王', status:'在岗', role:'美甲师', avatar:'assets/emp-avatars/woman-b.jpg' },
  { id:'st8', name:'陈强', short:'陈', status:'在岗', role:'美发师', avatar:'assets/emp-avatars/man-c.jpg' },
  { id:'st9', name:'赵敏', short:'赵', status:'休假', role:'前台', avatar:'assets/emp-avatars/woman-a.jpg' },
  { id:'st10', name:'周杰', short:'周', status:'在岗', role:'美发师', avatar:'assets/emp-avatars/man-b.jpg' },
]};
g.EmployeeDemo = { getBillingStaffPool: function () {
  return g.EmployeeStore.staff.filter(function (s) { return s.status === '在岗'; })
    .map(function (s) { return { id:s.id, name:s.name, short:s.short, avatar:s.avatar||'', role:s.role||'' }; });
}};
initComm2Seed();
})(typeof window !== 'undefined' ? window : globalThis);
