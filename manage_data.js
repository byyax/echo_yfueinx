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

// --- 导出功能 ---
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
  textArea.select();
  textArea.setSelectionRange(0, 999999); // 针对手机端
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textArea.value).then(() => {
        showToast('复制成功！请去备忘录粘贴保存');
      }).catch(() => {
        document.execCommand('copy');
        showToast('复制成功！');
      });
    } else {
      document.execCommand('copy');
      showToast('复制成功！');
    }
  } catch (err) {
    showToast('请手动长按文本框全选复制');
  }
};

document.getElementById('exportData').onclick = () => {
  showExportModal({ tags, contents, myEmojis, chatSettings, chatHistory, locLibrary, pokeLibrary, signatureLibrary });
};
document.getElementById('exportCardsOnly').onclick = () => {
  showExportModal({ tags, contents, locLibrary, pokeLibrary, signatureLibrary });
};
document.getElementById('exportChatOnly').onclick = () => {
  showExportModal({ chatHistory });
};
document.getElementById('exportSettingsOnly').onclick = () => {
  showExportModal({ chatSettings });
};


// --- 导入功能 ---
let importType = 'all';

document.getElementById('importAllBtn').onclick = () => { importType = 'all'; document.getElementById('importDataModal').classList.add('show'); };
document.getElementById('importCardsBtn').onclick = () => { importType = 'cards'; document.getElementById('importDataModal').classList.add('show'); };
document.getElementById('importChatBtn').onclick = () => { importType = 'chat'; document.getElementById('importDataModal').classList.add('show'); };
document.getElementById('importSettingsBtn').onclick = () => { importType = 'settings'; document.getElementById('importDataModal').classList.add('show'); };

document.getElementById('parseImportBtn').onclick = () => {
  const rawText = document.getElementById('importDataText').value.trim();
  if (!rawText) return showToast('请先粘贴数据');
  
  try {
    const data = JSON.parse(rawText);
    
    // 简易校验
    if (importType === 'all' && !data.chatHistory && !data.contents) throw new Error('数据格式不匹配');
    
    showToast('正在恢复数据...');
    
    if (importType === 'all') {
      if (data.tags) tags = data.tags; 
      if (data.contents) contents = data.contents; 
      if (data.myEmojis) myEmojis = data.myEmojis;
      if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
      if (data.chatHistory) chatHistory = data.chatHistory; 
      if (data.locLibrary) locLibrary = data.locLibrary; 
      if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; 
      if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
    } else if (importType === 'cards') {
      if (data.tags) tags = data.tags; 
      if (data.contents) contents = data.contents; 
      if (data.locLibrary) locLibrary = data.locLibrary; 
      if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; 
      if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
    } else if (importType === 'chat') {
      if (data.chatHistory) chatHistory = data.chatHistory;
    } else if (importType === 'settings') {
      if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
    }
    
    saveAllData(); 
    
    document.getElementById('importDataModal').classList.remove('show');
    showToast('导入成功！正在刷新...');
    
    setTimeout(() => {
      if (typeof applyChatSettings === 'function') applyChatSettings();
      if (chatEl && typeof chatHistory !== 'undefined') {
        chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
        chatHistory.forEach(msg => addMessageDOM(msg.content, msg.role === 'me', msg.type, msg.time));
      }
      switchPage('pageManager');
    }, 1000);

  } catch (err) {
    console.error(err);
    showToast('导入失败：格式错误或数据不完整');
  }
};