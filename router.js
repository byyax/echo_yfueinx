function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId); if(el) el.classList.add('active');
}

const themeToggleBtn = document.getElementById('themeToggleBtn');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
}
if (!chatSettings.bubbleTheme) chatSettings.bubbleTheme = 'default';
document.documentElement.setAttribute('data-bubble-theme', chatSettings.bubbleTheme);

if (themeToggleBtn) {
  themeToggleBtn.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      themeToggleBtn.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeToggleBtn.textContent = '☀️';
    }
  };
}

const openManagerBtn = document.getElementById('openManagerBtn'); if(openManagerBtn) openManagerBtn.onclick = () => switchPage('pageManager');
const backFromManager = document.getElementById('backFromManager'); if(backFromManager) backFromManager.onclick = () => switchPage('pageChat');

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

  document.querySelectorAll('.theme-option').forEach(o => {
    if (o.dataset.bubbleTheme === (chatSettings.bubbleTheme || 'default')) o.classList.add('active');
    else o.classList.remove('active');
  });

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

  document.getElementById('setReplyDelay').value = chatSettings.replyDelay;
  document.getElementById('delayText').textContent = chatSettings.replyDelay.toFixed(1) + ' 分钟';
  document.getElementById('setReplyCount').value = chatSettings.replyCount; document.getElementById('countText').textContent = chatSettings.replyCount + ' 条';
  document.getElementById('setSigTimer').value = chatSettings.sigTimer; document.getElementById('sigTimeText').textContent = chatSettings.sigTimer + ' 分钟';
  document.getElementById('setAutoReplyTime').value = chatSettings.autoReplyTime; document.getElementById('autoReplyTimeText').textContent = chatSettings.autoReplyTime + ' 分钟';
  document.getElementById('setAutoReplyCount').value = chatSettings.autoReplyCount; document.getElementById('autoReplyCountText').textContent = chatSettings.autoReplyCount + ' 条';
};

const backFromSettings = document.getElementById('backFromSettings'); if(backFromSettings) backFromSettings.onclick = () => { if (typeof settingsExitGuard === 'function') settingsExitGuard(() => switchPage('pageManager')); else switchPage('pageManager'); };
const openTagManagerBtn = document.getElementById('openTagManagerBtn'); if(openTagManagerBtn) openTagManagerBtn.onclick = () => { renderTagManager(); document.getElementById('tagManagerModal').classList.add('show'); };
const backFromTags = document.getElementById('backFromTags'); if(backFromTags) backFromTags.onclick = () => switchPage('pageCards');
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
  chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.type, msg.time));
}
// ===== 仿微信状态引擎 =====
const STATUS_MAIN = [
  { id: 'online',   label: '在线',        color: 'st-green',  weight: 46 },
  { id: 'slacking', label: '在线-摸鱼中', color: 'st-green',  weight: 10 },
  { id: 'hungry',   label: '在线-饥饿中', color: 'st-orange', weight: 8 },
  { id: 'working',  label: '工作中',      color: 'st-blue',   weight: 8 },
  { id: 'studying', label: '沉迷学习',    color: 'st-blue',   weight: 6 },
  { id: 'busy',     label: '忙碌中',      color: 'st-orange', weight: 6 },
  { id: 'play',     label: '找我玩',      color: 'st-pink',   weight: 5 },
  { id: 'bored',    label: '无聊',        color: 'st-grey',   weight: 4 },
  { id: 'gym',      label: '健身中',      color: 'st-purple', weight: 3, icon: '🏋️' },
  { id: 'climb',    label: '攀岩中',      color: 'st-purple', weight: 2, icon: '🧗' },
  { id: 'sleep',    label: '睡觉中',      color: 'st-grey',   weight: 2, icon: '😴' },
  { id: 'offline',  label: '离线',        color: 'st-grey',   weight: 1 }
];
const STATUS_SUB = [
  { label: '攀岩中', icon: '🧗', weight: 8 }, { label: '滑雪中', icon: '🏂', weight: 6 },
  { label: '冲浪中', icon: '🏄', weight: 6 }, { label: '健身中', icon: '🏋️', weight: 8 },
  { label: '打球中', icon: '🏀', weight: 7 }, { label: '喝奶茶', icon: '🧋', weight: 8 },
  { label: '干饭中', icon: '🍚', weight: 7 }, { label: '听歌中', icon: '🎧', weight: 7 },
  { label: '发呆中', icon: '😶', weight: 5 }, { label: '吸猫中', icon: '🐱', weight: 5 },
  { label: '睡觉中', icon: '😴', weight: 4 }, { label: '出差中', icon: '✈️', weight: 3 },
  { label: '玩游戏', icon: '🎮', weight: 5 }, { label: '自拍中', icon: '🤳', weight: 4 }
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
  otherStatus.main = pickWeighted(STATUS_MAIN);
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