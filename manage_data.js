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

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
document.getElementById('exportData').onclick = () => downloadJSON({ tags, contents, myEmojis, chatSettings, chatHistory, locLibrary, pokeLibrary, signatureLibrary }, '全部数据.json');
document.getElementById('exportCardsOnly').onclick = () => downloadJSON({ tags, contents, locLibrary, pokeLibrary, signatureLibrary }, '字卡与表情库.json');
document.getElementById('exportChatOnly').onclick = () => downloadJSON({ chatHistory }, '聊天记录.json');
document.getElementById('exportSettingsOnly').onclick = () => downloadJSON({ chatSettings }, '聊天设置.json');

const importFile = document.getElementById('importFile');
let importType = 'all';

document.getElementById('importAllBtn').onclick = () => { importType = 'all'; importFile.click(); };
document.getElementById('importCardsBtn').onclick = () => { importType = 'cards'; importFile.click(); };
document.getElementById('importChatBtn').onclick = () => { importType = 'chat'; importFile.click(); };
document.getElementById('importSettingsBtn').onclick = () => { importType = 'settings'; importFile.click(); };

// 优化后的导入逻辑
importFile.onchange = (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  
  // 检查文件大小，如果超过 4MB，手机端极大概率会崩溃
  if (file.size > 4 * 1024 * 1024) {
    showToast('⚠️ 文件过大，手机导入可能会闪退，建议在电脑端导入或精简数据。');
    // 这里不 return，继续尝试导入，但给用户提示
  }

  showToast('正在读取文件，请稍候...');
  const reader = new FileReader();
  
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      
      showToast('正在解析并保存数据...');
      
      if (importType === 'all') {
        if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.myEmojis) myEmojis = data.myEmojis;
        if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
        if (data.chatHistory) chatHistory = data.chatHistory; if (data.locLibrary) locLibrary = data.locLibrary; 
        if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
      } else if (importType === 'cards') {
        if (data.tags) tags = data.tags; if (data.contents) contents = data.contents; if (data.locLibrary) locLibrary = data.locLibrary; 
        if (data.pokeLibrary) pokeLibrary = data.pokeLibrary; if (data.signatureLibrary) signatureLibrary = data.signatureLibrary;
      } else if (importType === 'chat') {
        if (data.chatHistory) chatHistory = data.chatHistory;
      } else if (importType === 'settings') {
        if (data.chatSettings) chatSettings = Object.assign(chatSettings, data.chatSettings);
      }
      
      saveAllData(); 
      showToast('导入成功！正在刷新...');
      
      // 不使用 location.reload()，改为安全刷新
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
      showToast('导入失败：文件格式不正确或内存不足'); 
    }
  };
  
  reader.onerror = () => { showToast('读取文件失败'); };
  reader.readAsText(file); 
  e.target.value = '';
};