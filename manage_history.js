let currentHistoryTab = 'history';
const HISTORY_PAGE_SIZE = 300;
let historyRenderLimit = HISTORY_PAGE_SIZE;

function resetHistoryRenderLimit() { historyRenderLimit = HISTORY_PAGE_SIZE; }

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
  resetHistoryRenderLimit();
  renderHistory(this.value);
};
document.getElementById('historyTextSearch').oninput = function() {
  resetHistoryRenderLimit();
  renderHistory();
};

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
      
      resetHistoryRenderLimit();
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

function renderHistory(filterDate = '', preserveScroll = false) {
  const dateInput = document.getElementById('historyDateSearch');
  if (!filterDate && dateInput) filterDate = dateInput.value;
  const keywordInput = document.getElementById('historyTextSearch');
  const keyword = keywordInput ? keywordInput.value.toLowerCase() : '';
  const list = document.getElementById('historyList'); if(!list) return;
  const prevScrollHeight = list.scrollHeight;
  const prevScrollTop = list.scrollTop;
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

  // 搜索始终针对全部记录；只是页面不一次性画几万条，避免手机卡死。
  const total = filtered.length;
  const start = Math.max(0, total - historyRenderLimit);
  const visible = filtered.slice(start);
  const parts = [];

  if (start > 0) {
    parts.push(`<div style="text-align:center; margin:8px 0 14px; font-size:12px; color:#9ca3af;">共 ${total} 条，已显示最近 ${visible.length} 条</div>`);
    parts.push(`<div style="text-align:center; margin:0 0 16px;"><button type="button" id="historyLoadEarlier" style="border:0; background:var(--border-color); color:var(--text-main); padding:9px 18px; border-radius:16px; font-size:13px; cursor:pointer;">显示更早的 ${start} 条</button></div>`);
  }

  let lastDateStr = '';
  visible.forEach(msg => {
    const d = new Date(msg.time);
    const dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;

    if (dateStr !== lastDateStr) {
      parts.push(`<div style="text-align:center; margin:18px 0 12px;"><span style="display:inline-block; background:var(--border-color); color:#6b7280; font-size:12px; padding:4px 14px; border-radius:12px;">${dateStr}</span></div>`);
      lastDateStr = dateStr;
    }

    const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    if (msg.role === 'system') {
      parts.push(`<div style="text-align:center; font-size:12px; color:#999; margin:10px 0;">${escapeHtml(msg.content.val || msg.content)}</div>`);
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

      parts.push(`<div style="display:flex; flex-direction:${isMe?'row-reverse':'row'}; margin-bottom:15px; gap:10px;">
          <div style="width:44px; height:44px; background:#ccc; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; flex-shrink:0;">${avImg}</div>
          <div style="max-width:70%; display:flex; flex-direction:column; align-items:${isMe?'flex-end':'flex-start'};">
            <div style="background:${isMe?'var(--bubble-me)':'var(--bubble-other)'}; padding:10px 14px; border-radius:16px; font-size:15px; color:var(--text-main); box-shadow:var(--shadow-sm); word-break:break-all;">${escapeHtml(content)}</div>
            <div style="font-size:10px; color:#999; margin-top:4px; padding:0 4px;">${timeStr}</div>
          </div>
        </div>`);
    }
  });

  list.innerHTML = parts.join('');

  const earlier = document.getElementById('historyLoadEarlier');
  if (earlier) {
    earlier.onclick = () => {
      historyRenderLimit += HISTORY_PAGE_SIZE;
      renderHistory(filterDate, true);
    };
  }

  setTimeout(() => {
    if (preserveScroll) list.scrollTop = prevScrollTop + (list.scrollHeight - prevScrollHeight);
    else list.scrollTop = list.scrollHeight;
  }, 10);
}

function normalizeCardText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

// 字卡可能被追加了一个 Emoji；统计旧消息时先把末尾 Emoji 去掉再比对。
function stripTrailingEmoji(value) {
  return normalizeCardText(value).replace(/\s*[\p{Extended_Pictographic}‍️\p{Emoji_Modifier}\p{Regional_Indicator}]+\s*$/u, '').trim();
}

function getCardStats(limit = 10) {
  const textCards = contents.filter(c => c && c.type === 'text' && c.val);
  if (textCards.length === 0) return [];

  const counts = new Map();
  const byId = new Map();
  const byText = new Map();
  textCards.forEach(c => {
    const item = { val: c.val, count: 0 };
    counts.set(c.id, item);
    byId.set(c.id, item);
    const text = normalizeCardText(c.val);
    if (text && !byText.has(text)) byText.set(text, item);
  });

  chatHistory.forEach(msg => {
    if (!msg || msg.role !== 'other' || msg.type !== 'text') return;
    const c = msg.content;
    const text = c && c.val !== undefined && c.val !== null ? String(c.val) : '';
    if (!text) return;

    // 新消息带 cardId 时直接按 id 统计，避免“好”“我”这类短卡误吞整句。
    let item = c && c.cardId ? byId.get(c.cardId) : null;
    if (!item) item = byText.get(normalizeCardText(text)) || null;
    if (!item) item = byText.get(stripTrailingEmoji(text)) || null;
    if (item) item.count++;
  });

  return Array.from(counts.values())
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// 如果用户在 IndexedDB 还没读完时已经打开了历史页，就绪后补画一次。
window.addEventListener('chat-data-ready', () => {
  const page = document.getElementById('pageHistory');
  if (!page || !page.classList.contains('active')) return;
  resetHistoryRenderLimit();
  if (currentHistoryTab === 'cards') renderCardStats();
  else renderHistory();
});

function renderCardStats() {
  const list = document.getElementById('cardStatsList');
  if (!list) return;
  const allStats = getCardStats(Number.MAX_SAFE_INTEGER);
  const stats = allStats.slice(0, 10);

  if (stats.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#999; padding:60px 20px; font-size:14px; line-height:1.6;">对方还没有发过字卡哦～<br>先去聊几句吧 💬</div>';
    return;
  }

  const total = allStats.reduce((s, x) => s + x.count, 0);
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