const menuData = document.getElementById('menuData');
if(menuData) menuData.onclick = () => { 
  switchPage('pageData'); 
  let totalSize = 0;
  for (let key in localStorage) { if (localStorage.hasOwnProperty(key)) totalSize += (localStorage[key].length + key.length) * 2; }
  document.getElementById('dataSize').textContent = (totalSize / 1024).toFixed(1) + ' KB';
  document.getElementById('dataMsgCount').textContent = chatHistory.length + ' 条';
  document.getElementById('dataCardCount').textContent = (contents.length + locLibrary.length + pokeLibrary.length + signatureLibrary.length) + ' 项';
};

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
  const str = JSON.stringify(dataObj, null, 2);
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
      navigator.clipboard.writeText(textArea.value).then(() => showToast('复制成功！请去备忘录粘贴保存'));
    } else {
      document.execCommand('copy'); showToast('复制成功！');
    }
  } catch (err) { showToast('请手动长按文本框全选复制'); }
};

function performExport(type) {
  let data = {}, filename = '';
  if (type === 'all') {
    data = { tags, contents, myEmojis, chatSettings, chatHistory, locLibrary, pokeLibrary, signatureLibrary };
    filename = '全部数据.json';
  } else if (type === 'cards') {
    data = { tags, contents, locLibrary, pokeLibrary, signatureLibrary };
    filename = '字卡与表情库.json';
  } else if (type === 'chat') {
    data = { chatHistory };
    filename = '聊天记录.json';
  } else if (type === 'settings') {
    data = { chatSettings };
    filename = '聊天设置.json';
  }

  if (currentDataMode === 'file') {
    downloadJSON(data, filename);
    showToast('文件已开始下载');
  } else {
    showExportModal(data);
  }
}


// ================= 导入功能 =================
const importFile = document.getElementById('importFile');
let currentImportType = 'all';

function triggerImport(type) {
  currentImportType = type;
  if (currentDataMode === 'file') {
    importFile.click();
  } else {
    document.getElementById('importDataModal').classList.add('show');
  }
}

function processImportedData(data) {
  let parsedItems = [];
  if (data.tags) parsedItems.push('标签');
  if (data.contents) parsedItems.push('字卡');
  if (data.chatSettings) parsedItems.push('设置');
  if (data.chatHistory) parsedItems.push('聊天记录');
  
  if (parsedItems.length === 0) return showToast('❌ 解析失败：这不是有效的数据格式');

  showToast(`正在导入：${parsedItems.join('、')}...`);

  if (currentImportType === 'all') {
    if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.myEmojis) myEmojis = data.myEmojis;
    if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
    if (data.chatHistory) chatHistory = data.chatHistory; if (data.locLibrary) locLibrary = data.locLibrary; 
    if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
  } else if (currentImportType === 'cards') {
    if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.locLibrary) locLibrary = data.locLibrary; 
    if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
  } else if (currentImportType === 'chat') {
    if (data.chatHistory) chatHistory = data.chatHistory;
  } else if (currentImportType === 'settings') {
    if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
  }
  
  saveAllData(); 
  
  setTimeout(() => {
    const modal = document.getElementById('importDataModal');
    if (modal) modal.classList.remove('show');
    showToast('✅ 导入成功！正在刷新...');
    setTimeout(() => {
      if (typeof applyChatSettings === 'function') applyChatSettings();
      if (chatEl && typeof chatHistory !== 'undefined') {
        chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
        chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.type, msg.time));
      }
      switchPage('pageManager');
    }, 500);
  }, 500);
}

// 文本导入确认按钮
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

// 文件导入
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