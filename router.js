function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId); if(el) el.classList.add('active');
}

// --- 主题与颜色初始化 ---
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
const menuCards = document.getElementById('menuCards'); if(menuCards) menuCards.onclick = () => { switchPage('pageCards'); refreshCardsUI(); };
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

  document.getElementById('setReplyDelay').value = chatSettings.replyDelay;
  document.getElementById('delayText').textContent = chatSettings.replyDelay.toFixed(1) + ' 分钟';
  document.getElementById('setReplyCount').value = chatSettings.replyCount; document.getElementById('countText').textContent = chatSettings.replyCount + ' 条';
  document.getElementById('setSigTimer').value = chatSettings.sigTimer; document.getElementById('sigTimeText').textContent = chatSettings.sigTimer + ' 分钟';
  document.getElementById('setAutoReplyTime').value = chatSettings.autoReplyTime; document.getElementById('autoReplyTimeText').textContent = chatSettings.autoReplyTime + ' 分钟';
  document.getElementById('setAutoReplyCount').value = chatSettings.autoReplyCount; document.getElementById('autoReplyCountText').textContent = chatSettings.autoReplyCount + ' 条';
};
const backFromSettings = document.getElementById('backFromSettings'); if(backFromSettings) backFromSettings.onclick = () => switchPage('pageManager');
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
applyChatSettings();
initStatusBar();