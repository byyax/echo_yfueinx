function switchPage(pageId) {
  // 离开聊天页时，别让录音在后台继续跑
  if (pageId !== 'pageChat' && typeof cancelVoice === 'function') cancelVoice();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId); if(el) el.classList.add('active');
}

const themeToggleBtn = document.getElementById('themeToggleBtn');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (themeToggleBtn) setIconText(themeToggleBtn, '☀️');
}
// 颜色混合：t 是 b 的占比，用来从主色推黑夜模式和启动页的配色
function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return { r: 164, g: 198, b: 57 };
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}
function hexToHue(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  let h;
  if (max === rn) h = ((gn - bn) / (max - min)) % 6;
  else if (max === gn) h = (bn - rn) / (max - min) + 2;
  else h = (rn - gn) / (max - min) + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
function applyDarkPalette(main, dayIconFilter) {
  const root = document.documentElement;
  const primary = mixHex(main, '#202326', 0.52);
  const primaryDark = mixHex(main, '#ffffff', 0.18);
  const primaryLight = mixHex(main, '#1b1d1f', 0.18);
  const rgb = hexToRgb(primary);
  const hue = Math.round((hexToHue(main) - 35 + 360) % 360);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
  root.style.setProperty('--primary-dark', primaryDark);
  root.style.setProperty('--primary-light', primaryLight);
  // 普通图标仍用适合黑夜的亮度；默认爱心单独使用白天同一套滤镜。
  root.style.setProperty('--icon-filter', `grayscale(1) sepia(1) saturate(2.8) hue-rotate(${hue}deg) brightness(0.95)`);
  if (dayIconFilter) root.style.setProperty('--heart-avatar-filter', dayIconFilter);
}

// 黑夜模式下读取白天配色规则里的 --icon-filter。
// 做法是同步移除 data-theme（不会真正绘制），让白天的 CSS 规则生效后读计算值。
function readDayIconFilter() {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== 'dark') return '';
  const inline = root.style.getPropertyValue('--icon-filter');
  let value = '';
  try {
    root.removeAttribute('data-theme');
    root.style.removeProperty('--icon-filter');
    value = getComputedStyle(root).getPropertyValue('--icon-filter').trim();
  } finally {
    root.setAttribute('data-theme', 'dark');
    if (inline) root.style.setProperty('--icon-filter', inline);
  }
  return value;
}
function clearDarkPalette() {
  const s = document.documentElement.style;
  ['--primary', '--primary-rgb', '--primary-dark', '--primary-light', '--icon-filter', '--heart-avatar-filter'].forEach(k => s.removeProperty(k));
}
function applyBootTint(main) {
  const root = document.documentElement;
  root.style.setProperty('--boot-bg1', mixHex(main, '#ffffff', 0.92));
  root.style.setProperty('--boot-bg2', mixHex(main, '#ffffff', 0.86));
  root.style.setProperty('--boot-bg3', mixHex(main, '#ffffff', 0.80));
  root.style.setProperty('--boot-name', mixHex(main, '#1f2a12', 0.55));
  root.style.setProperty('--boot-sub', mixHex(main, '#6b7280', 0.45));
  root.style.setProperty('--boot-accent', main);
  root.style.setProperty('--boot-accent-light', mixHex(main, '#ffffff', 0.40));
  root.style.setProperty('--boot-accent-soft', mixHex(main, '#ffffff', 0.75));
  root.style.setProperty('--boot-dark1', mixHex(main, '#141414', 0.82));
  root.style.setProperty('--boot-dark2', mixHex(main, '#1c1c1c', 0.90));
  root.style.setProperty('--boot-dark3', '#141414');
  root.style.setProperty('--boot-dark-name', mixHex(main, '#ffffff', 0.55));
  root.style.setProperty('--boot-dark-sub', mixHex(main, '#ffffff', 0.28));
}

// 界面配色：白天完整应用；黑夜模式用主色派生按钮色，并给气泡轻微着色
function applyPalette(id) {
  const p = (typeof PALETTES !== 'undefined' && PALETTES.find(x => x.id === id)) || { id: 'olive', main: '#A4C639' };
  const main = p.main || '#A4C639';
  document.documentElement.setAttribute('data-palette', p.id);
  document.documentElement.style.setProperty('--palette-main', main);
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    const dayIconFilter = readDayIconFilter();
    applyDarkPalette(main, dayIconFilter);
  } else {
    clearDarkPalette();
  }
  applyBootTint(main);
}
chatSettings.palette = chatSettings.palette || 'olive';
applyPalette(chatSettings.palette);

// 图标是否跟随配色（沿用配色里算好的滤镜）
function applyIconTint() {
  const mode = chatSettings.iconTint || 'off';
  const root = document.documentElement;
  root.classList.toggle('icon-tint', mode === 'tint');
  root.classList.toggle('icon-soft', mode === 'soft');
}
applyIconTint();

// 把工具 / 后台卡片里的 emoji 包一层，方便整体着色或换成自己画的图
(function wrapIconGlyphs() {
  const targets = document.querySelectorAll(
    '.tool-icon, .manager-card .icon, .nav-actions .icon-btn, .music-controls button, .inputbar .icon-btn'
  );
  targets.forEach(el => {
    if (el.id === 'openManagerBtn') return; // 这个按钮是纯文字的三点，不用染色
    if (el.firstElementChild) return;
    const txt = (el.textContent || '').trim();
    if (!txt) return;
    el.textContent = '';
    const span = document.createElement('span');
    span.className = 'icon-glyph';
    span.textContent = txt;
    el.appendChild(span);
  });
})();

if (themeToggleBtn) {
  themeToggleBtn.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      setIconText(themeToggleBtn, '🌙');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      setIconText(themeToggleBtn, '☀️');
    }
    // 黑夜/白天的主色不同，切换后重新套一次配色
    if (typeof applyPalette === 'function') applyPalette(chatSettings.palette || 'olive');
  };
}

const openManagerBtn = document.getElementById('openManagerBtn'); if(openManagerBtn) openManagerBtn.onclick = () => switchPage('pageManager');
const backFromManager = document.getElementById('backFromManager'); if(backFromManager) backFromManager.onclick = () => switchPage('pageChat');

// 音乐管理
const menuMusic = document.getElementById('menuMusic');
if (menuMusic) menuMusic.onclick = () => {
  switchPage('pageMusic');
  if (typeof renderMusicManageList === 'function') renderMusicManageList();
};
const backFromMusic = document.getElementById('backFromMusic');
if (backFromMusic) backFromMusic.onclick = () => switchPage('pageManager');

// 使用手册
const menuManual = document.getElementById('menuManual');
if (menuManual) menuManual.onclick = () => switchPage('pageManual');
const backFromManual = document.getElementById('backFromManual');
if (backFromManual) backFromManual.onclick = () => switchPage('pageManager');
document.querySelectorAll('.manual-toc a').forEach(a => {
  a.onclick = (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
});

// 修复：每次点击进来自定义回复，强制刷新 UI
const menuCards = document.getElementById('menuCards'); 
if(menuCards) menuCards.onclick = () => { 
  switchPage('pageCards'); 
  // 重置状态
  currentLib = 'text'; 
  currentMainLib = 'cards';
  document.querySelectorAll('.main-lib-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.main-lib-btn[data-mainlib="cards"]').classList.add('active');
  
  const subLibNav = document.getElementById('subLibNav');
  if(subLibNav) subLibNav.innerHTML = `<button class="lib-btn active" data-lib="text">字卡</button><button class="lib-btn" data-lib="emoji">Emoji</button><button class="lib-btn" data-lib="image">表情包</button>`;
  
  if(typeof bindSubLibEvents === 'function') bindSubLibEvents();
  if(tagBarEl) tagBarEl.style.display = 'flex';
  
  if(typeof refreshCardsUI === 'function') refreshCardsUI(); 
};

const backToManagerFromCards = document.getElementById('backToManagerFromCards'); if(backToManagerFromCards) backToManagerFromCards.onclick = () => switchPage('pageManager');
const menuHistory = document.getElementById('menuHistory'); if(menuHistory) menuHistory.onclick = () => { switchPage('pageHistory'); };
const backToManagerFromHistory = document.getElementById('backToManagerFromHistory'); if(backToManagerFromHistory) backToManagerFromHistory.onclick = () => switchPage('pageManager');

const menuSettings = document.getElementById('menuSettings'); if(menuSettings) menuSettings.onclick = () => {
  switchPage('pageSettings');
  document.getElementById('setOtherName').value = chatSettings.otherName;
  document.getElementById('setMyName').value = chatSettings.myName;
  
  document.getElementById('setMyPatAction').value = chatSettings.myPatAction || '拍了拍';
  document.getElementById('setMyPatSuffix').value = chatSettings.myPatSuffix || '';
  const myShow = document.getElementById('patMyNameShow');
  const otherShow = document.getElementById('patOtherNameShow');
  if (myShow) myShow.textContent = chatSettings.myName || '你';
  if (otherShow) otherShow.textContent = chatSettings.otherName || '对方';
  if (typeof updatePatPreview === 'function') updatePatPreview();

  if (typeof renderPaletteGrid === 'function') renderPaletteGrid();

  if(chatSettings.timeFormat === 'hms') {
    document.querySelector('input[name="timeFormat"][value="hms"]').checked = true;
  } else {
    document.querySelector('input[name="timeFormat"][value="hm"]').checked = true;
  }
  if(chatSettings.hourFormat === '12') {
    document.querySelector('input[name="hourFormat"][value="12"]').checked = true;
  } else {
    document.querySelector('input[name="hourFormat"][value="24"]').checked = true;
  }
  if (typeof updateTimeChipLabels === 'function') updateTimeChipLabels();

  const typingBox = document.getElementById('setShowTyping');
  if (typingBox) typingBox.checked = chatSettings.showTyping !== false;
  const soundBox = document.getElementById('setSound');
  if (soundBox) soundBox.checked = chatSettings.sound !== false;
  const moodBox = document.getElementById('setMoodEnabled');
  if (moodBox) moodBox.checked = chatSettings.moodEnabled !== false;
  if (typeof renderIconTintSeg === 'function') renderIconTintSeg();
  if (typeof refreshFileLabels === 'function') refreshFileLabels();

  document.getElementById('setReplyDelay').value = chatSettings.replyDelay;
  document.getElementById('delayText').textContent = chatSettings.replyDelay.toFixed(1) + ' 分钟';
  document.getElementById('setReplyCount').value = chatSettings.replyCount; document.getElementById('countText').textContent = chatSettings.replyCount + ' 条';
  document.getElementById('setSigTimer').value = chatSettings.sigTimer; document.getElementById('sigTimeText').textContent = chatSettings.sigTimer + ' 分钟';
  document.getElementById('setAutoReplyTime').value = chatSettings.autoReplyTime; document.getElementById('autoReplyTimeText').textContent = chatSettings.autoReplyTime + ' 分钟';
  document.getElementById('setAutoReplyCount').value = chatSettings.autoReplyCount; document.getElementById('autoReplyCountText').textContent = chatSettings.autoReplyCount + ' 条';
};

const backFromSettings = document.getElementById('backFromSettings'); if(backFromSettings) backFromSettings.onclick = () => { if (typeof settingsExitGuard === 'function') settingsExitGuard(() => switchPage('pageManager')); else switchPage('pageManager'); };
const openTagManagerBtn = document.getElementById('openTagManagerBtn'); if(openTagManagerBtn) openTagManagerBtn.onclick = () => { renderTagManager(); document.getElementById('tagManagerModal').classList.add('show'); };
const pcToggleBtn = document.getElementById('pcToggleBtn'); if(pcToggleBtn) pcToggleBtn.onclick = () => document.getElementById('appContainer').classList.toggle('pc-mode');
const backFromData = document.getElementById('backFromData'); if(backFromData) backFromData.onclick = () => switchPage('pageManager');

function initStatusBar() {
  const netEl = document.getElementById('networkIcon'); const batEl = document.getElementById('batteryIcon');
  let isWifi = Math.random() < 0.7; let is5G = !isWifi && Math.random() < 0.8;
  if(netEl) netEl.textContent = isWifi ? '📶 WiFi' : (is5G ? '📶 5G' : '📶 2G');
  let battery = Math.floor(Math.random() * 80) + 20; let isCharging = false;
  function updateBat() {
    if(!batEl) return;
    if (isCharging) batEl.innerHTML = `⚡ <span style="color:#1890ff">${battery}%</span>`;
    else { let color = battery <= 10 ? 'red' : (battery <= 20 ? 'orange' : 'green'); batEl.innerHTML = `🔋 <span style="color:${color}">${battery}%</span>`; }
  }
  updateBat();
  setInterval(() => {
    if (Math.random() < 0.2) { let r = Math.random(); if(netEl) netEl.textContent = r < 0.5 ? '📶 WiFi' : (r < 0.9 ? '📶 5G' : '📶 2G'); }
    if (isCharging) { battery += Math.floor(Math.random() * 2) + 1; if (battery >= 100) { battery = 100; isCharging = false; } } 
    else { battery -= Math.floor(Math.random() * 2); if (battery <= 10) { isCharging = true; battery = 10; } }
    if (battery < 0) battery = 0; updateBat();
  }, 10000);
}

if(chatEl) {
  chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
  chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.role === 'system' ? 'sys' : msg.type, msg.time));
}
// ===== 仿微信状态引擎 =====
const STATUS_MAIN = [
  { id: 'online',   label: '在线',        color: 'st-green',  weight: 30 },
  { id: 'slacking', label: '在线-摸鱼中', color: 'st-green',  weight: 9 },
  { id: 'waiting',  label: '在线-等你消息', color: 'st-pink', weight: 7 },
  { id: 'dreaming', label: '在线-发呆中', color: 'st-grey',   weight: 6 },
  { id: 'happy',    label: '心情不错',    color: 'st-green',  weight: 6 },
  { id: 'hungry',   label: '在线-饥饿中', color: 'st-orange', weight: 6 },
  { id: 'working',  label: '工作中',      color: 'st-blue',   weight: 6 },
  { id: 'studying', label: '沉迷学习',    color: 'st-blue',   weight: 5 },
  { id: 'busy',     label: '忙碌中',      color: 'st-orange', weight: 5 },
  { id: 'play',     label: '找我玩',      color: 'st-pink',   weight: 4 },
  { id: 'bored',    label: '无聊',        color: 'st-grey',   weight: 4 },
  { id: 'music',    label: '听歌中',      color: 'st-pink',   weight: 4, icon: '🎧' },
  { id: 'gym',      label: '健身中',      color: 'st-purple', weight: 3, icon: '🏋️' },
  { id: 'eat',      label: '干饭中',      color: 'st-orange', weight: 3, icon: '🍚' },
  { id: 'sleepy',   label: '困了',        color: 'st-grey',   weight: 3, icon: '🥱' },
  { id: 'climb',    label: '攀岩中',      color: 'st-purple', weight: 2, icon: '🧗' },
  { id: 'ski',      label: '滑雪中',      color: 'st-blue',   weight: 2, icon: '🏂' },
  { id: 'sleep',    label: '睡觉中',      color: 'st-grey',   weight: 2, icon: '😴' },
  { id: 'trip',     label: '出差中',      color: 'st-blue',   weight: 1, icon: '✈️' },
  { id: 'offline',  label: '离线',        color: 'st-grey',   weight: 1 }
];
const STATUS_SUB = [
  { label: '攀岩中', icon: '🧗', weight: 7 }, { label: '滑雪中', icon: '🏂', weight: 5 },
  { label: '冲浪中', icon: '🏄', weight: 5 }, { label: '健身中', icon: '🏋️', weight: 7 },
  { label: '打球中', icon: '🏀', weight: 6 }, { label: '喝奶茶', icon: '🧋', weight: 7 },
  { label: '干饭中', icon: '🍚', weight: 6 }, { label: '听歌中', icon: '🎧', weight: 7 },
  { label: '发呆中', icon: '😶', weight: 5 }, { label: '吸猫中', icon: '🐱', weight: 5 },
  { label: '睡觉中', icon: '😴', weight: 4 }, { label: '出差中', icon: '✈️', weight: 3 },
  { label: '玩游戏', icon: '🎮', weight: 5 }, { label: '自拍中', icon: '🤳', weight: 4 },
  { label: '追剧中', icon: '📺', weight: 4 }, { label: '喝咖啡', icon: '☕', weight: 4 },
  { label: '赶作业', icon: '📚', weight: 3 }, { label: '洗头中', icon: '🧴', weight: 3 },
  { label: '逛超市', icon: '🛒', weight: 3 }, { label: '遛狗中', icon: '🐕', weight: 3 },
  { label: '修图中', icon: '🖼️', weight: 3 }, { label: '放空中', icon: '🫧', weight: 3 }
];

let otherStatus = { main: STATUS_MAIN[0], sub: null };
let nextStatusChangeAt = 0;

function pickWeighted(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) { r -= x.weight; if (r <= 0) return x; }
  return list[0];
}

function renderOtherStatus() {
  const box = document.getElementById('statusPills');
  if (!box) return;
  box.innerHTML = '';
  const m = otherStatus.main;
  const mainPill = document.createElement('span');
  mainPill.className = `status-pill ${m.color}`;
  mainPill.innerHTML = `<span class="dot"></span>${m.icon ? `<span class="st-icon">${m.icon}</span>` : ''}${m.label}`;
  box.appendChild(mainPill);
  if (otherStatus.sub) {
    const subPill = document.createElement('span');
    subPill.className = `status-pill sub ${m.color}`;
    subPill.innerHTML = `<span class="st-icon">${otherStatus.sub.icon}</span>${otherStatus.sub.label}`;
    box.appendChild(subPill);
  }
}

function rollOtherStatus() {
  const list = STATUS_MAIN.map(s => (
    s.id === 'offline' && isLateNightHour()
      ? Object.assign({}, s, { weight: s.weight * 2.5 })
      : s
  ));
  otherStatus.main = pickWeighted(list);
  otherStatus.sub = (Math.random() < 0.45) ? pickWeighted(STATUS_SUB) : null;
  nextStatusChangeAt = Date.now() + (8 + Math.random() * 17) * 60 * 1000;
  renderOtherStatus();
}

function getOtherStatusMain() { return otherStatus.main ? otherStatus.main.label : '在线'; }
function setOtherOnline() {
  otherStatus.main = STATUS_MAIN[0];
  otherStatus.sub = null;
  nextStatusChangeAt = Date.now() + (8 + Math.random() * 17) * 60 * 1000;
  renderOtherStatus();
}

// 进网站 30% 概率刷新一次状态；之后每 8~25 分钟窗口内按概率再变
(function initOtherStatus() {
  if (Math.random() < 0.3) { rollOtherStatus(); return; }
  otherStatus.main = STATUS_MAIN[0];
  otherStatus.sub = Math.random() < 0.3 ? pickWeighted(STATUS_SUB) : null;
  nextStatusChangeAt = Date.now() + (8 + Math.random() * 17) * 60 * 1000;
  renderOtherStatus();
})();
setInterval(() => { if (Date.now() >= nextStatusChangeAt) rollOtherStatus(); }, 60000);

applyChatSettings();
initStatusBar();

// ===== 弹窗回车确认：带确认键的弹窗统一支持 Enter =====
const ENTER_CONFIRM = {
  addModal: 'saveAdd',
  tagModal: 'saveTagBtn',
  moveModal: 'saveMoveBtn',
  confirmModal: 'confirmOkBtn',
  unsavedModal: 'unsavedSaveBtn',
  cropModal: 'confirmCrop',
  moneyModal: 'confirmMoney',
  importDataModal: 'parseImportBtn',
  giftOpenModal: 'confirmOpenGiftBtn',
  voiceModal: 'voiceSendBtn'
};

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'TEXTAREA') return; // 多行文本里的回车留给换行
  for (const modalId in ENTER_CONFIRM) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('show')) continue;
    const btn = document.getElementById(ENTER_CONFIRM[modalId]);
    if (btn && btn.offsetParent !== null) {
      e.preventDefault();
      btn.click();
    }
    return;
  }
});

// ===== 渲染完成信号：启动画面等到这里才淡出 =====
// 聊天记录、配色、状态栏都画完之后再置位。
// 以后如果加了更慢的初始化（比如批量加载图片），把这一行挪到它后面即可。
window.__appReady = true;
try { window.dispatchEvent(new Event('app-ready')); } catch (e) {}