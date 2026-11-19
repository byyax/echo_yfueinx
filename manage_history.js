let currentHistoryTab = 'history';

// 切换顶部 tab
document.querySelectorAll('[data-historytab]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('[data-historytab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentHistoryTab = btn.dataset.historytab;
    const tabHistory = document.getElementById('historyTab-history');
    const tabCards = document.getElementById('historyTab-cards');
    if (currentHistoryTab === 'cards') {
      if (tabHistory) tabHistory.style.display = 'none';
      if (tabCards) tabCards.style.display = 'flex';
      renderCardStats();
    } else {
      if (tabCards) tabCards.style.display = 'none';
      if (tabHistory) tabHistory.style.display = 'flex';
      renderHistory();
    }
  };
});

// 监听日期选择，用来给外框变色和拉伸
document.getElementById('historyDateSearch').onchange = function() {
  const wrapper = document.getElementById('dateFilter');
  if (this.value) {
    this.classList.add('has-value');
    if (wrapper) wrapper.classList.add('has-value');
  } else {
    this.classList.remove('has-value');
    if (wrapper) wrapper.classList.remove('has-value');
  }
  renderHistory(this.value); 
};
document.getElementById('historyTextSearch').oninput = function() { renderHistory(); };

// 进入页面时自动重置刷新
(function watchHistoryPage() {
  const pageHistoryEl = document.getElementById('pageHistory');
  if (!pageHistoryEl) return;
  const obs = new MutationObserver(() => {
    if (pageHistoryEl.classList.contains('active')) {
      // 每次进入时，清空日期筛选和输入框，回到最新
      const dateInput = document.getElementById('historyDateSearch');
      if (dateInput) {
        dateInput.value = '';
        dateInput.classList.remove('has-value');
        const wrapper = document.getElementById('dateFilter');
        if (wrapper) wrapper.classList.remove('has-value');
      }
      const textInput = document.getElementById('historyTextSearch');
      if (textInput) textInput.value = '';
      
      if (currentHistoryTab === 'cards') renderCardStats();
      else renderHistory();
    }
  });
  obs.observe(pageHistoryEl, { attributes: true, attributeFilter: ['class'] });
})();

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderHistory(filterDate = '') {
  const keywordInput = document.getElementById('historyTextSearch');
  const keyword = keywordInput ? keywordInput.value.toLowerCase() : '';
  const list = document.getElementById('historyList'); if(!list) return; list.innerHTML = '';
  let filtered = chatHistory;
  
  if (filterDate) {
    filtered = filtered.filter(msg => {
      const d = new Date(msg.time);
      const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return str === filterDate;
    });
  }
  if (keyword) {
    filtered = filtered.filter(msg => {
      const c = msg.content;
      if (typeof c === 'string') return c.toLowerCase().includes(keyword);
      if (!c) return false;
      const text = [c.val, c.name, c.note, c.amount].filter(Boolean).join(' ').toLowerCase();
      return text.includes(keyword);
    });
  }

  if(filtered.length === 0) { list.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">没有记录</div>'; return; }

  let lastDateStr = '';
  filtered.forEach(msg => {
    const d = new Date(msg.time);
    const dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;

    if (dateStr !== lastDateStr) {
      list.innerHTML += `<div style="text-align:center; margin:18px 0 12px;"><span style="display:inline-block; background:var(--border-color); color:#6b7280; font-size:12px; padding:4px 14px; border-radius:12px;">${dateStr}</span></div>`;
      lastDateStr = dateStr;
    }

    const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    if (msg.role === 'system') {
      list.innerHTML += `<div style="text-align:center; font-size:12px; color:#999; margin:10px 0;">${escapeHtml(msg.content.val || msg.content)}</div>`;
    } else {
      const isMe = msg.role === 'me'; 
      let content = '';
      const c = msg.content || {};
      if (msg.type === 'text' || msg.type === 'pat') content = c.val || '';
      else if (msg.type === 'image') content = '[图片]';
      else if (msg.type === 'gift') content = c.name || c.val || '[礼物]';
      else if (msg.type === 'transfer') content = `[转账 ¥${c.amount || '0.00'}${c.note ? ' ' + c.note : ''}]`;
      else if (msg.type === 'redpacket') content = `[红包 ${c.note || ''}]`;
      else if (msg.type === 'location') content = c.val || '[位置]';
      else if (msg.type === 'interact') content = `[互动 ${c.name || ''}]`;
      else if (msg.type === 'call') content = `[通话] ${c.val || ''}`;
      else content = '[卡片]';
      
      const av = isMe ? chatSettings.myAvatar : chatSettings.otherAvatar;
      const avImg = av
        ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
        : (isMe
          ? escapeHtml(chatSettings.myName.charAt(0))
          : `<img src="icons/icon-heart-192.png" class="default-heart-avatar" style="width:84%;height:84%;object-fit:contain;">`);
      
      list.innerHTML += `<div style="display:flex; flex-direction:${isMe?'row-reverse':'row'}; margin-bottom:15px; gap:10px;">
          <div style="width:44px; height:44px; background:#ccc; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; flex-shrink:0;">${avImg}</div>
          <div style="max-width:70%; display:flex; flex-direction:column; align-items:${isMe?'flex-end':'flex-start'};">
            <div style="background:${isMe?'var(--bubble-me)':'var(--bubble-other)'}; padding:10px 14px; border-radius:16px; font-size:15px; color:var(--text-main); box-shadow:var(--shadow-sm); word-break:break-all;">${escapeHtml(content)}</div>
            <div style="font-size:10px; color:#999; margin-top:4px; padding:0 4px;">${timeStr}</div>
          </div>
        </div>`;
    }
  });

  // 渲染完成后自动滚动到底部（最新消息）
  setTimeout(() => {
    list.scrollTop = list.scrollHeight;
  }, 10);
}

function getCardStats(limit = 10) {
  const textCards = contents.filter(c => c.type === 'text' && c.val);
  if (textCards.length === 0) return [];
  const counts = new Map();
  textCards.forEach(c => counts.set(c.id, { val: c.val, count: 0 }));

  chatHistory.forEach(msg => {
    if (msg.role !== 'other' || msg.type !== 'text') return;
    const c = msg.content;
    const text = c && c.val !== undefined && c.val !== null ? String(c.val) : '';
    if (!text) return;
    let best = null;
    textCards.forEach(card => {
      if (text.includes(card.val)) {
        if (!best || card.val.length > best.val.length) best = card;
      }
    });
    if (best) counts.get(best.id).count++;
  });

  return Array.from(counts.values())
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function renderCardStats() {
  const list = document.getElementById('cardStatsList');
  if (!list) return;
  const stats = getCardStats(10);

  if (stats.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#999; padding:60px 20px; font-size:14px; line-height:1.6;">对方还没有发过字卡哦～<br>先去聊几句吧 💬</div>';
    return;
  }

  const total = stats.reduce((s, x) => s + x.count, 0);
  const maxCount = stats[0].count || 1;

  let html = `<div style="text-align:center; background:var(--card-bg); border-radius:14px; padding:14px; margin-bottom:14px; box-shadow:var(--shadow-sm);">
      <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">对方最常用字卡 TOP ${stats.length}</div>
      <div style="font-size:12px; color:#9ca3af;">共统计 ${total} 次发送</div>
    </div>`;

  stats.forEach((item, i) => {
    const percent = Math.max(6, Math.round((item.count / maxCount) * 100));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span style="color:#9ca3af;font-weight:600;">${i + 1}</span>`;
    html += `
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-rank">${medal}</div>
          <div class="stat-text">${escapeHtml(item.val)}</div>
          <div class="stat-count">${item.count} 次</div>
        </div>
        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${percent}%"></div></div>
      </div>`;
  });

  list.innerHTML = html;
}