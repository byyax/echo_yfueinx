let currentPayInput = '', pendingMoneyData = null, moneyType = '';
document.getElementById('toolRed').onclick = () => { closePanels(); moneyType='redpacket'; document.getElementById('moneyTitle').textContent='发红包'; document.getElementById('moneyAmount').value=''; document.getElementById('moneyNote').value=''; document.getElementById('moneyModal').classList.add('show'); };
document.getElementById('toolTrans').onclick = () => { closePanels(); moneyType='transfer'; document.getElementById('moneyTitle').textContent='转账'; document.getElementById('moneyAmount').value=''; document.getElementById('moneyNote').value=''; document.getElementById('moneyModal').classList.add('show'); };

// ===== 礼物商城：价位 × 类型 双维度筛选 =====
// 数据驱动：加礼物只需往 GIFT_ITEMS 加一行；价位页签由 price 自动归档
const GIFT_TYPES = [
  { id: 'all', label: '全部' },
  { id: 'couple', label: '❤️ 情侣' },
  { id: 'food', label: '🍱 餐饮' },
  { id: 'daily', label: '🧸 日用' },
  { id: 'digital', label: '🎧 数码' },
  { id: 'sport', label: '🏂 运动户外' },
  { id: 'scent', label: '🧴 香氛美妆' }
];
const GIFT_TIERS = [
  { id: 'cheap', label: '平价 (0-50)', max: 50 },
  { id: 'mid', label: '中档 (50-300)', min: 50, max: 300 },
  { id: 'formal', label: '正式 (300-1500)', min: 300, max: 1500 },
  { id: 'luxury', label: '奢侈 (1500+)', min: 1500 }
];
const GIFT_ITEMS = [
  // 情侣（单人/双人都算）
  { name: '一支红玫瑰', price: 15, icon: '🌹', type: 'couple' },
  { name: '手写情书一封', price: 9, icon: '✉️', type: 'couple' },
  { name: '一束迷你小花束', price: 35, icon: '💐', type: 'couple' },
  { name: '高品质巧克力礼盒', price: 156, icon: '🍫', type: 'couple' },
  { name: '情侣对杯', price: 88, icon: '☕', type: 'couple' },
  { name: '情侣钥匙扣一对', price: 45, icon: '🔑', type: 'couple' },
  { name: '情侣手机壳一对', price: 78, icon: '📱', type: 'couple' },
  { name: '恋爱手账本', price: 66, icon: '📔', type: 'couple' },
  { name: '定制情侣插画', price: 199, icon: '🎨', type: 'couple' },
  { name: '星空投影灯', price: 129, icon: '🌠', type: 'couple' },
  { name: '定制星空图', price: 268, icon: '🌌', type: 'couple' },
  { name: '双人电影约会票', price: 120, icon: '🎬', type: 'couple' },
  { name: '摩天轮双人票', price: 160, icon: '🎡', type: 'couple' },
  { name: '水族馆双人票', price: 240, icon: '🐬', type: 'couple' },
  { name: '日落兜风约会', price: 200, icon: '🌇', type: 'couple' },
  { name: '情侣项链一对', price: 520, icon: '💞', type: 'couple' },
  { name: '玉石小吊坠', price: 980, icon: '💎', type: 'couple' },
  { name: '情侣对表', price: 1899, icon: '⌚', type: 'couple' },
  { name: '小众设计师首饰', price: 2600, icon: '💍', type: 'couple' },
  { name: '双人度假民宿套餐', price: 3800, icon: '🏖️', type: 'couple' },
  // 餐饮
  { name: '一杯奶茶', price: 15, icon: '🧋', type: 'food' },
  { name: '一小盒手工水果糖', price: 16, icon: '🍬', type: 'food' },
  { name: '小蛋糕', price: 35, icon: '🍰', type: 'food' },
  { name: '炸鸡一份', price: 35, icon: '🍗', type: 'food' },
  { name: '罐装冷泡果茶包', price: 36, icon: '🍵', type: 'food' },
  { name: '奶茶+小蛋糕组合', price: 46, icon: '🧁', type: 'food' },
  { name: '夜宵小套餐', price: 58, icon: '🍜', type: 'food' },
  { name: '高品质咖啡豆礼盒', price: 145, icon: '☕', type: 'food' },
  { name: '精致单人西餐简餐', price: 168, icon: '🍝', type: 'food' },
  { name: '刺身拼盘', price: 288, icon: '🍣', type: 'food' },
  { name: '双人火锅外卖套餐', price: 328, icon: '🍲', type: 'food' },
  // 日用
  { name: '可爱毛绒发圈套装', price: 22, icon: '🎀', type: 'daily' },
  { name: '一支香薰蜡烛', price: 28, icon: '🕯️', type: 'daily' },
  { name: '润唇膏', price: 32, icon: '💄', type: 'daily' },
  { name: '毛绒玩偶', price: 88, icon: '🧸', type: 'daily' },
  { name: '恒温保温杯', price: 139, icon: '🥤', type: 'daily' },
  { name: '精装画册', price: 168, icon: '📚', type: 'daily' },
  { name: '沐浴身体护理套装', price: 189, icon: '🧴', type: 'daily' },
  { name: '针织小围巾', price: 230, icon: '🧣', type: 'daily' },
  { name: '遮光真丝眼罩+枕套', price: 240, icon: '😴', type: 'daily' },
  { name: '皮质笔记本+钢笔套装', price: 620, icon: '🖋️', type: 'daily' },
  { name: '品牌香薰扩香摆件', price: 560, icon: '🌺', type: 'daily' },
  { name: '羊毛质感披肩', price: 860, icon: '🧥', type: 'daily' },
  { name: '品牌包包', price: 4200, icon: '👜', type: 'daily' },
  // 数码
  { name: '智能手环', price: 299, icon: '⌚', type: 'digital' },
  { name: '有线头戴小耳机', price: 269, icon: '🎧', type: 'digital' },
  { name: '便携蓝牙音箱', price: 189, icon: '🔊', type: 'digital' },
  { name: '机械键盘', price: 399, icon: '⌨️', type: 'digital' },
  { name: '拍立得相机+相纸', price: 750, icon: '📷', type: 'digital' },
  { name: '降噪耳机', price: 1199, icon: '🎧', type: 'digital' },
  { name: '高端腕表', price: 6800, icon: '⌚', type: 'digital' },
  // 运动户外（攀岩/滑雪/冲浪/健身/打球）
  { name: '运动护腕', price: 35, icon: '💪', type: 'sport' },
  { name: '攀岩馆单次票', price: 88, icon: '🧗', type: 'sport' },
  { name: '篮球', price: 199, icon: '🏀', type: 'sport' },
  { name: '健身房月卡', price: 300, icon: '🏋️', type: 'sport' },
  { name: '冲浪体验课', price: 388, icon: '🏄', type: 'sport' },
  { name: '徒步双肩包', price: 450, icon: '🎒', type: 'sport' },
  { name: '滑雪场门票', price: 480, icon: '🏂', type: 'sport' },
  // 香氛美妆
  { name: '小众调香小样礼盒', price: 128, icon: '🧴', type: 'scent' },
  { name: '男士淡香水', price: 460, icon: '🧴', type: 'scent' },
  { name: '品牌淡香水(玫瑰香)', price: 780, icon: '🌸', type: 'scent' }
];

function tierOfGift(price) {
  for (const t of GIFT_TIERS) {
    if ((t.min === undefined || price > t.min) && (t.max === undefined || price <= t.max)) return t.id;
  }
  return 'luxury';
}

const giftList = document.getElementById('giftList');
const giftHomeEl = document.getElementById('giftHome');
const giftShopArea = document.getElementById('giftShopArea');
const giftCustomArea = document.getElementById('giftCustomArea');
const giftModalTitle = document.getElementById('giftModalTitle');

// 首页双卡 -> 商城 / 自定义 两个分支视图；返回用右下浮动气泡
const giftBackFab = document.getElementById('giftBackFab');
function showGiftView(view) {
  if (giftHomeEl) giftHomeEl.style.display = view === 'home' ? 'flex' : 'none';
  if (giftShopArea) giftShopArea.classList.toggle('show', view === 'shop');
  if (giftCustomArea) giftCustomArea.classList.toggle('show', view === 'custom');
  if (giftBackFab) giftBackFab.style.display = view === 'home' ? 'none' : 'flex';
  if (giftModalTitle) giftModalTitle.textContent = view === 'shop' ? '礼物商城' : (view === 'custom' ? '自定义礼物' : '挑选礼物');
}

const giftHomeShopBtn = document.getElementById('giftHomeShop');
if (giftHomeShopBtn) giftHomeShopBtn.onclick = () => {
  showGiftView('shop');
  currentTier = 'all'; currentType = 'all';
  renderTierTabs(); renderTypeTabs(); renderGiftList();
};
const giftHomeCustomBtn = document.getElementById('giftHomeCustom');
if (giftHomeCustomBtn) giftHomeCustomBtn.onclick = () => {
  showGiftView('custom');
  const input = document.getElementById('customGiftInput');
  if (input) setTimeout(() => input.focus(), 120);
};
if (giftBackFab) giftBackFab.onclick = () => showGiftView('home');

let currentTier = 'all'; // 价位维度
let currentType = 'all'; // 类型维度

// 价位页签
function renderTierTabs() {
  const tabs = document.getElementById('giftTierTabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  const tiers = [{ id: 'all', label: '全部价位' }].concat(GIFT_TIERS);
  tiers.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t.label;
    if (t.id === currentTier) btn.classList.add('active');
    btn.onclick = () => { currentTier = t.id; renderTierTabs(); renderGiftList(); };
    tabs.appendChild(btn);
  });
}

// 类型页签
function renderTypeTabs() {
  const tabs = document.getElementById('giftTypeTabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  GIFT_TYPES.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t.label;
    if (t.id === currentType) btn.classList.add('active');
    btn.onclick = () => { currentType = t.id; renderTypeTabs(); renderGiftList(); };
    tabs.appendChild(btn);
  });
}

// 电脑端滚轮也能横向滑动分类
['giftTierTabs', 'giftTypeTabs'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if (el.scrollWidth - el.clientWidth <= 0) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });
});

document.getElementById('toolGift').onclick = () => { 
  closePanels(); 
  document.getElementById('giftModal').classList.add('show'); 
  showGiftView('home');
};

function renderGiftList() {
  giftList.innerHTML = '';
  let items = GIFT_ITEMS;
  if (currentType !== 'all') items = items.filter(g => g.type === currentType);
  if (currentTier !== 'all') items = items.filter(g => tierOfGift(g.price) === currentTier);
  if (items.length === 0) {
    giftList.innerHTML = '<div class="gift-empty">这个组合下暂时没有礼物<br>换个分类看看？</div>';
    return;
  }
  items.forEach((g, i) => {
    const idx = GIFT_ITEMS.indexOf(g);
    giftList.innerHTML += `<div class="gift-card" onclick="buyGiftByIdx(${idx})"><div class="gift-icon">${g.icon}</div><div class="gift-name">${g.name}</div><div class="gift-price">¥${g.price}</div></div>`;
  });
}

window.buyGiftByIdx = (idx) => {
  const g = GIFT_ITEMS[idx];
  if (!g) return;
  document.getElementById('giftModal').classList.remove('show');
  // 带上图标，拆开后才能显示对应的礼物图标
  sendMessage({ name: g.name, icon: g.icon, price: g.price, isOpened: false }, 'gift', true);
  setTimeout(randomReply, 1000);
};

// 自定义礼物：自己打字送，图标固定蝴蝶结
const sendCustomGiftBtn = document.getElementById('sendCustomGiftBtn');
if (sendCustomGiftBtn) sendCustomGiftBtn.onclick = () => {
  const input = document.getElementById('customGiftInput');
  const val = input ? input.value.trim() : '';
  if (!val) return showToast('先写一下想送什么吧');
  document.getElementById('giftModal').classList.remove('show');
  sendMessage({ name: val, icon: '🎀', custom: true, isOpened: false }, 'gift', true);
  if (input) input.value = '';
  setTimeout(randomReply, 1000);
};

document.getElementById('closeGiftModal').onclick = () => document.getElementById('giftModal').classList.remove('show');

document.addEventListener('keydown', (e) => {
  const passModal = document.getElementById('passModal');
  if (!passModal.classList.contains('show')) return;
  if (e.key >= '0' && e.key <= '9') pressKey(e.key);
  else if (e.key === 'Backspace') pressKey('del');
  else if (e.key === 'Enter') document.getElementById('confirmMoney').click();
  else if (e.key === 'Escape') document.getElementById('cancelPay').click();
});

document.getElementById('cancelMoney').onclick = () => document.getElementById('moneyModal').classList.remove('show');
document.getElementById('confirmMoney').onclick = () => {
  const amount = document.getElementById('moneyAmount').value, note = document.getElementById('moneyNote').value;
  if (!amount || isNaN(amount)) return alert('请输入金额');
  pendingMoneyData = { amount, note, isOpened: false }; 
  document.getElementById('moneyAmount').value = ''; document.getElementById('moneyNote').value = '';
  document.getElementById('moneyModal').classList.remove('show');
  if (moneyType === 'transfer') { 
    if (!payPassword) { showToast('首次使用，请先设置6位密码'); openKeyboard(); } else { openKeyboard(); } 
  } else { 
    sendMessage(pendingMoneyData, moneyType, true); 
    setTimeout(randomReply, 1000); 
  }
};

function openKeyboard() { currentPayInput = ''; updateDots(); document.getElementById('passModal').classList.add('show'); }
function updateDots() { const dots = document.getElementById('payDots'); dots.innerHTML = ''; for (let i = 0; i < 6; i++) { const d = document.createElement('div'); if (i < currentPayInput.length) d.classList.add('filled'); dots.appendChild(d); } }
const kb = document.getElementById('keyboard'); if(kb){ kb.innerHTML = ''; for (let i = 1; i <= 9; i++) kb.innerHTML += `<button onclick="pressKey('${i}')">${i}</button>`; kb.innerHTML += `<button style="visibility:hidden;"></button><button onclick="pressKey('0')">0</button><button onclick="pressKey('del')">⌫</button>`; }
window.pressKey = (k) => {
  if (k === 'del') currentPayInput = currentPayInput.slice(0, -1); else if (currentPayInput.length < 6) currentPayInput += k;
  updateDots();
  if (currentPayInput.length === 6) {
    setTimeout(() => {
      if (!payPassword) {
        payPassword = currentPayInput; localStorage.setItem('pay_password', payPassword);
        showToast('密码设置成功'); document.getElementById('passModal').classList.remove('show');
        if (pendingMoneyData) { sendMessage(pendingMoneyData, moneyType, true); setTimeout(randomReply, 1000); }
      } else if (currentPayInput === payPassword) {
        showToast('转账成功'); document.getElementById('passModal').classList.remove('show');
        if (pendingMoneyData) { sendMessage(pendingMoneyData, moneyType, true); setTimeout(randomReply, 1000); }
      } else { showToast('密码错误'); currentPayInput = ''; updateDots(); }
    }, 200);
  }
};
document.getElementById('cancelPay').onclick = () => document.getElementById('passModal').classList.remove('show');
