// ===== 图片/语音数据：统计 / 导出时剔除 / 单独清理 =====
function isMediaData(v) { return typeof v === 'string' && (v.indexOf('data:image') === 0 || v.indexOf('data:audio') === 0); }

function mediaBytesOf(history) {
  let bytes = 0;
  (history || []).forEach(m => {
    const v = m && m.content && m.content.val;
    if (isMediaData(v)) bytes += Math.floor(v.length * 0.75);
  });
  return bytes;
}
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(0, Math.round(bytes / 1024)) + ' KB';
}

// 把图片/语音换成占位文字，其余字段原样保留
function stripMedia(history) {
  return (history || []).map(m => {
    if (!m || !m.content) return m;
    if ((m.type === 'image' || m.type === 'audio') && isMediaData(m.content.val)) {
      const label = m.type === 'audio' ? '[语音已省略]' : '[图片已省略]';
      return Object.assign({}, m, {
        type: 'text',
        content: Object.assign({}, m.content, { val: label })
      });
    }
    return m;
  });
}

function exportWithMedia() {
  try { return localStorage.getItem('export_media') !== '0'; } catch (e) { return true; }
}

// ===== 备份提醒：只在你打开数据管理时提醒，不在主界面打扰 =====
const BACKUP_LAST_KEY = 'echo_last_export_at';
const BACKUP_PROMPT_KEY = 'echo_backup_prompt_at';
function markBackupDone() {
  try { localStorage.setItem(BACKUP_LAST_KEY, String(Date.now())); } catch (e) {}
}
function backupReminderOnEnter() {
  let last = 0, prompted = 0;
  try {
    last = parseInt(localStorage.getItem(BACKUP_LAST_KEY) || '0', 10) || 0;
    prompted = parseInt(localStorage.getItem(BACKUP_PROMPT_KEY) || '0', 10) || 0;
  } catch (e) {}
  // 一天最多提醒一次
  if (Date.now() - prompted < 24 * 60 * 60 * 1000) return;
  const days = last ? Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000)) : -1;
  if (last && days < 7) return;
  try { localStorage.setItem(BACKUP_PROMPT_KEY, String(Date.now())); } catch (e) {}
  const head = last ? `距离上次备份已经 ${days} 天了。` : '你还没有备份过聊天数据。';
  setTimeout(() => {
    showConfirm('要备份一下吗', `${head} 数据只存在这台设备里，清理浏览器或换设备都可能丢失。现在导出全部数据吗？`, () => {
      performExport('all');
      markBackupDone();
    });
  }, 350);
}

const menuData = document.getElementById('menuData');
if(menuData) menuData.onclick = () => {
  switchPage('pageData');
  let totalSize = 0;
  for (let key in localStorage) { if (localStorage.hasOwnProperty(key)) totalSize += (localStorage[key].length + key.length) * 2; }
  document.getElementById('dataSize').textContent = (totalSize / 1024).toFixed(1) + ' KB';
  document.getElementById('dataMsgCount').textContent = chatHistory.length + ' 条';
  document.getElementById('dataCardCount').textContent = (contents.length + locLibrary.length + pokeLibrary.length + signatureLibrary.length) + ' 项';
  const mediaEl = document.getElementById('dataMediaSize');
  if (mediaEl) mediaEl.textContent = formatSize(mediaBytesOf(chatHistory));
  const exportSw = document.getElementById('setExportMedia');
  if (exportSw) exportSw.checked = exportWithMedia();
  backupReminderOnEnter();
};

const exportMediaSwitch = document.getElementById('setExportMedia');
if (exportMediaSwitch) {
  exportMediaSwitch.onchange = () => {
    try { localStorage.setItem('export_media', exportMediaSwitch.checked ? '1' : '0'); } catch (e) {}
    showToast(exportMediaSwitch.checked ? '导出会带上图片' : '导出会跳过图片');
  };
}

const clearMediaBtn = document.getElementById('clearMediaBtn');
if (clearMediaBtn) {
  clearMediaBtn.onclick = () => {
    const count = (chatHistory || []).filter(m => m && (m.type === 'image' || m.type === 'audio') && isMediaData((m.content || {}).val)).length;
    if (!count) return showToast('没有需要清理的图片或语音');
    const saved = mediaBytesOf(chatHistory);
    showConfirm('只清理图片/语音', `会移除 ${count} 条图片或语音（约 ${formatSize(saved)}），文字消息都保留。确定吗？`, () => {
      chatHistory = stripMedia(chatHistory);
      saveAllData();
      chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
      chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.role === 'system' ? 'sys' : msg.type, msg.time));
      if (document.getElementById('dataSize')) menuData.onclick();
      showToast(`已清理，腾出约 ${formatSize(saved)}`);
    });
  };
}

document.getElementById('clearHistoryBtn').onclick = () => {
  showConfirm('清空记录', '⚠️ 警告：确定清空所有聊天记录吗？此操作不可逆！', () => {
    chatHistory = []; saveAllData(); 
    chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>'; 
    showToast('聊天记录已清空');
  });
};
document.getElementById('clearAllBtn').onclick = () => {
  showConfirm('清空全部', '💥 警告：确定清空所有数据吗？此操作不可逆！', () => {
    localStorage.clear(); location.reload();
  });
};

// ================= 模式切换逻辑 =================
let currentDataMode = 'file'; // 'file' or 'text'
const modeFileBtn = document.getElementById('modeFileBtn');
const modeTextBtn = document.getElementById('modeTextBtn');

if (modeFileBtn && modeTextBtn) {
  modeFileBtn.onclick = () => {
    currentDataMode = 'file';
    modeFileBtn.classList.add('primary');
    modeTextBtn.classList.remove('primary');
    showToast('已切换到文件模式');
  };
  modeTextBtn.onclick = () => {
    currentDataMode = 'text';
    modeTextBtn.classList.add('primary');
    modeFileBtn.classList.remove('primary');
    showToast('已切换到文本模式');
  };
}


// ================= 导出功能 =================
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function showExportModal(dataObj) {
  // 压缩成一行，避免换行符在手机上引起问题
  const str = JSON.stringify(dataObj); 
  const textArea = document.getElementById('exportDataText');
  if (textArea) {
    textArea.value = str;
    document.getElementById('exportDataModal').classList.add('show');
  }
}

document.getElementById('copyExportBtn').onclick = () => {
  const textArea = document.getElementById('exportDataText');
  if (!textArea) return;
  textArea.select(); textArea.setSelectionRange(0, 999999); 
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textArea.value).then(() => { showToast('复制成功！请去备忘录粘贴保存'); markBackupDone(); });
    } else {
      document.execCommand('copy'); showToast('复制成功！'); markBackupDone();
    }
  } catch (err) { showToast('请手动长按文本框全选复制'); }
};

// ===== 导出/导入辅助 =====
// 自己导入过的歌词都放在 localStorage 的 echo_lyric_歌名 里，一起打包
function collectCustomLyrics() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('echo_lyric_') === 0) out[k.slice('echo_lyric_'.length)] = localStorage.getItem(k);
    }
  } catch (e) {}
  return out;
}
function currentThemeName() {
  try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
function applyImportedTheme(name) {
  const dark = name === 'dark';
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  const btn = document.getElementById('themeToggleBtn');
  if (btn && typeof setIconText === 'function') setIconText(btn, dark ? '☀️' : '🌙');
}
// 导入完成后，把界面相关的设置重新套用一遍
function refreshAfterImport() {
  if (typeof applyPalette === 'function') applyPalette(chatSettings.palette || 'olive');
  if (typeof applyIconTint === 'function') applyIconTint();
  if (typeof applyChatSettings === 'function') applyChatSettings();
  if (typeof MUSIC_PLAYLIST !== 'undefined') {
    MUSIC_PLAYLIST.forEach(s => { s._lyr = null; s._lyrRaw = null; });
  }
}

function performExport(type) {
  let data = {}, filename = '';
  const historyForExport = exportWithMedia() ? chatHistory : stripMedia(chatHistory);
  if (type === 'all') {
    data = {
      tags, contents, myEmojis, chatSettings, chatHistory: historyForExport,
      locLibrary, pokeLibrary, signatureLibrary, interactLibrary,
      theme: currentThemeName(), lyrics: collectCustomLyrics()
    };
    filename = exportWithMedia() ? '全部数据.json' : '全部数据(无图).json';
  } else if (type === 'cards') {
    data = { tags, contents, locLibrary, pokeLibrary, signatureLibrary, interactLibrary };
    filename = '字卡与表情库.json';
  } else if (type === 'chat') {
    data = { chatHistory: historyForExport };
    filename = exportWithMedia() ? '聊天记录.json' : '聊天记录(无图).json';
  } else if (type === 'settings') {
    data = { chatSettings, theme: currentThemeName() };
    filename = '聊天设置.json';
  }

  if (currentDataMode === 'file') {
    downloadJSON(data, filename);
    showToast('文件已开始下载');
  } else {
    showExportModal(data);
  }
  markBackupDone();
}


// ================= 导入功能 =================
const importFile = document.getElementById('importFile');
let currentImportType = 'all';

function triggerImport(type) {
  currentImportType = type;
  if (currentDataMode === 'file') {
    // 加入 setTimeout 规避某些手机自带浏览器点击立刻闪退的 Bug
    setTimeout(() => {
      importFile.click();
    }, 100);
  } else {
    // 文本模式，纯粹展示输入框
    document.getElementById('importDataText').value = '';
    document.getElementById('importDataModal').classList.add('show');
  }
}

function processImportedData(data) {
  let parsedItems = [];
  if (data.tags) parsedItems.push('标签');
  if (data.contents) parsedItems.push('字卡');
  if (data.chatSettings) parsedItems.push('设置');
  if (data.chatHistory) parsedItems.push('聊天记录');
  if (data.theme) parsedItems.push('主题');
  if (data.lyrics && Object.keys(data.lyrics).length) parsedItems.push('歌词');
  
  if (parsedItems.length === 0) return showToast('❌ 解析失败：这不是有效的数据格式');

  showToast(`正在导入：${parsedItems.join('、')}...`);

  if (currentImportType === 'all') {
    if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.myEmojis) myEmojis = data.myEmojis;
    if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
    if (data.chatHistory) chatHistory = data.chatHistory; if (data.locLibrary) locLibrary = data.locLibrary;
    if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
    if (data.interactLibrary) interactLibrary = data.interactLibrary;
    if (data.theme) applyImportedTheme(data.theme);
    if (data.lyrics) {
      Object.keys(data.lyrics).forEach(t => {
        try { localStorage.setItem('echo_lyric_' + t, data.lyrics[t]); } catch (e) {}
      });
    }
  } else if (currentImportType === 'cards') {
    if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.locLibrary) locLibrary = data.locLibrary;
    if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
    if (data.interactLibrary) interactLibrary = data.interactLibrary;
  } else if (currentImportType === 'chat') {
    if (data.chatHistory) chatHistory = data.chatHistory;
  } else if (currentImportType === 'settings') {
    if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
    if (data.theme) applyImportedTheme(data.theme);
  }
  
  saveAllData(); 
  
  setTimeout(() => {
    const modal = document.getElementById('importDataModal');
    if (modal) modal.classList.remove('show');
    showToast('✅ 导入成功！正在刷新...');
    setTimeout(() => {
      refreshAfterImport();
      if (chatEl && typeof chatHistory !== 'undefined') {
        chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
        chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.role === 'system' ? 'sys' : msg.type, msg.time));
      }
      switchPage('pageManager');
    }, 500);
  }, 500);
}

// 1. 文本模式：粘贴完毕后点击“确认导入”
document.getElementById('parseImportBtn').onclick = () => {
  const rawText = document.getElementById('importDataText').value.trim();
  if (!rawText) return showToast('请先粘贴数据');
  try {
    const data = JSON.parse(rawText);
    processImportedData(data);
    document.getElementById('importDataText').value = '';
  } catch (err) {
    showToast('❌ 导入失败：格式错误，请确保复制了全部内容');
  }
};

// 2. 文件模式：选择 JSON 文件直接导入
if (importFile) {
  importFile.onchange = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        processImportedData(data);
      } catch (err) {
        showToast('❌ 导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file); e.target.value = ''; 
  };
}

// ================= 全局事件委托（统一绑定按钮） =================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const type = btn.dataset.type;
  
  if (action === 'export') performExport(type);
  else if (action === 'import') triggerImport(type);
});