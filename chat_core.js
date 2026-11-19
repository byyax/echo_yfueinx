const chatEl = document.getElementById('chat');
const msgInput = document.getElementById('msgInput');
let currentQuote = null;
let isTyping = false; // 正在输入状态
let offlineAutoReplyTimer = null;
let offlineReturnTimer = null;
let offlineReturnDue = 0;

function refreshAvatarDOM() {
  document.querySelectorAll('.avatar.other').forEach(av => {
    if (chatSettings.otherAvatar) {
      av.classList.remove('heart-avatar');
      av.innerHTML = `<img src="${chatSettings.otherAvatar}">`;
    } else {
      av.classList.add('heart-avatar');
      av.innerHTML = `<img src="icons/icon-heart-192.png" class="default-heart-avatar" alt="">`;
    }
  });
  document.querySelectorAll('.avatar.me').forEach(av => {
    if (chatSettings.myAvatar) av.innerHTML = `<img src="${chatSettings.myAvatar}">`;
    else av.textContent = chatSettings.myName.charAt(0);
  });
}

// 个性签名：短签名跟着字数自然变宽；偏长先缩小字号；仍然放不下才缓慢左右滚动。
function setSignatureText(text) {
  const el = document.getElementById('signatureBar');
  if (!el || el.classList.contains('lyric-bubble')) return;
  const value = String(text == null ? '' : text).trim() || '这个人很懒，什么都没留下';
  el.classList.remove('sig-long', 'sig-xlong', 'sig-scroll');
  el.style.removeProperty('--sig-shift');
  el.style.removeProperty('--sig-marquee-dur');
  el.title = value;
  el.textContent = '';
  const span = document.createElement('span');
  span.className = 'signature-text';
  span.textContent = value;
  el.appendChild(span);

  const overflows = () => span.scrollWidth > span.clientWidth + 1;
  if (overflows()) el.classList.add('sig-long');
  if (overflows()) el.classList.add('sig-xlong');
  if (overflows()) {
    el.classList.add('sig-scroll');
    const shift = Math.max(8, span.scrollWidth - span.clientWidth + 4);
    el.style.setProperty('--sig-shift', `-${shift}px`);
    el.style.setProperty('--sig-marquee-dur', `${Math.min(14, Math.max(7, 4 + shift / 26))}s`);
  }
}

let _sigMeasureTimer = null;
function remeasureSignatureSoon() {
  if (_sigMeasureTimer) clearTimeout(_sigMeasureTimer);
  _sigMeasureTimer = setTimeout(() => {
    _sigMeasureTimer = null;
    setSignatureText(chatSettings.signature);
  }, 120);
}
window.addEventListener('resize', remeasureSignatureSoon);
window.addEventListener('app-revealed', remeasureSignatureSoon);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(remeasureSignatureSoon).catch(() => {});
}

function applyChatSettings() {
  const titleEl = document.getElementById('chatTitle'); if(titleEl) titleEl.textContent = chatSettings.otherName;
  // 壁纸挂在整页上：播放器/工具面板开合只推动气泡，背景不会跟着放大缩小
  const pageEl = document.getElementById('pageChat');
  if (pageEl) pageEl.style.backgroundImage = chatSettings.wallpaper ? `url(${chatSettings.wallpaper})` : 'none';
  if (chatEl) chatEl.style.backgroundImage = 'none';
  const sigEl = document.getElementById('signatureBar');
  if (sigEl && !sigEl.classList.contains('lyric-bubble')) setSignatureText(chatSettings.signature);
  refreshTimeLabels();
  refreshAvatarDOM();
}

function getTimeStr(time) {
  const d = new Date(time);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const useSec = chatSettings.timeFormat === 'hms';
  if (chatSettings.hourFormat === '12') {
    const ap = h < 12 ? 'am' : 'pm';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    const hh = h12.toString().padStart(2, '0');
    return useSec ? `${hh}:${m}:${s}${ap}` : `${hh}:${m}${ap}`;
  }
  const hh = h.toString().padStart(2, '0');
  return useSec ? `${hh}:${m}:${s}` : `${hh}:${m}`;
}

// 改了时间格式后，把已经画出来的时间就地重刷，不用重新进页面
function refreshTimeLabels() {
  if (!chatEl) return;
  chatEl.querySelectorAll('.bubble').forEach(b => {
    const t = Number(b.dataset.msgTime || 0);
    if (!t) return;
    if (!b.parentElement) return;
    const label = b.parentElement.querySelector('.bubble-time');
    if (label) label.textContent = getTimeStr(t);
  });
}

// ===== 气泡菜单相关 =====
let bubbleMenuCtx = null;

function getQuoteDisplayText(content, type) {
  if (type === 'image') return '[图片]';
  if (type === 'redpacket') return '[红包] ' + (content.note || '');
  if (type === 'musicshare') return '[歌曲] ' + (content.name || '');
  if (type === 'musicinvite') return '[一起听歌] ' + (content.name || '');
  if (type === 'transfer') return '[转账] ¥' + (content.amount || '0.00') + (content.note ? ' ' + content.note : '');
  if (type === 'gift') return '[礼物] ' + (content.name || content.val || '');
  if (type === 'interact') return '[互动] ' + (content.name || '');
  if (type === 'location') return '[位置] ' + (content.val || '');
  if (type === 'audio') return '[语音]';
  if (type === 'call') return '[通话] ' + (content.val || '');
  return (content && content.val !== undefined && content.val !== null) ? String(content.val) : '';
}

// 礼物图标映射：优先用礼物自带的图标，否则按名字关键词猜，自定义礼物固定蝴蝶结
function getGiftIcon(content) {
  if (content && content.icon) return content.icon;
  const name = (content && (content.name || content.val)) || '';
  const map = [
    ['奶茶', '🧋'], ['蛋糕', '🍰'], ['玫瑰', '🌹'], ['花束', '💐'], ['巧克力', '🍫'],
    ['毛绒', '🧸'], ['玩具', '🧸'], ['蜡烛', '🕯️'], ['香薰', '🕯️'], ['糖', '🍬'],
    ['发圈', '🎀'], ['果茶', '🍵'], ['贴纸', '🏷️'], ['润唇', '💄'], ['香水', '🧴'],
    ['手链', '📿'], ['咖啡', '☕'], ['围巾', '🧣'], ['画册', '📚'], ['门票', '🎫'],
    ['耳机', '🎧'], ['腰痛', '🔥'], ['钢笔', '🖋️'], ['披肩', '🧥'], ['相机', '📷'],
    ['吊坠', '💎'], ['腕表', '⌚'], ['包包', '👜'], ['首饰', '💍'], ['民宿', '🏖️'],
    ['西餐', '🍝'], ['火锅', '🍲'], ['刺身', '🍣'], ['沐浴', '🧴'], ['眼罩', '😴'],
    ['保温杯', '🥤'], ['亲亲', '😘'], ['夜宵', '🍜']
  ];
  for (const [k, v] of map) { if (name.includes(k)) return v; }
  return (content && content.custom) ? '🎀' : '🎁';
}

function showBubbleMenu(x, y, content, isMe, type, time, rowEl) {
  bubbleMenuCtx = { content, isMe, type, time, rowEl };
  const menu = document.getElementById('bubbleMenu');
  if (!menu) return;
  menu.classList.add('show');
  const rect = menu.getBoundingClientRect();
  const menuW = rect.width || 140;
  const menuH = rect.height || 92;
  let left = x, top = y;
  if (left + menuW > window.innerWidth - 10) left = window.innerWidth - menuW - 10;
  if (top + menuH > window.innerHeight - 10) top = window.innerHeight - menuH - 10;
  if (left < 10) left = 10;
  if (top < 10) top = 10;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function hideBubbleMenu() {
  const menu = document.getElementById('bubbleMenu');
  if (menu) menu.classList.remove('show');
  bubbleMenuCtx = null;
}

// 滚动定位到引用的消息：整行短促闪一下
function scrollToMessage(time) {
  const target = document.querySelector(`.bubble[data-msg-time="${time}"]`);
  if (!target) return;
  const row = target.closest('.row') || target;
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.remove('flash-row');
  void row.offsetWidth;
  row.classList.add('flash-row');
  setTimeout(() => row.classList.remove('flash-row'), 700);
}

// ===== 自动接收我发出的红包/转账/礼物 =====
function autoReceiveMyCard(time) {
  // 离线时不要“自动已收”，等他上线后再处理。
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
    if (typeof whenOtherOnline === 'function') whenOtherOnline(() => autoReceiveMyCard(time));
    return;
  }
  const msg = chatHistory.find(m => m.time === time && m.role === 'me');
  if (!msg || !msg.content || msg.content.isOpened) return;
  msg.content.isOpened = true;
  saveAllData();
  if (typeof moodAfterOpen === 'function') moodAfterOpen(msg.type, msg.content);
  else if (typeof refreshMood === 'function') refreshMood();

  const bubble = document.querySelector(`.bubble[data-msg-time="${time}"]`);
  if (!bubble) return;
  
  bubble.classList.add('opened');
  
  const bottom = bubble.querySelector('.card-bottom');
  const icon = bubble.querySelector('.card-icon');
  const title = bubble.querySelector('.card-info h4');
  const subtitle = bubble.querySelector('.card-info p');

  if (msg.type === 'transfer') {
    if (icon) { icon.textContent = '✅'; icon.className = 'card-icon grey'; }
    if (subtitle) subtitle.textContent = '已收款';
    if (bottom) bottom.textContent = '已收款';
  } else if (msg.type === 'redpacket') {
    if (icon) { icon.textContent = '🧧'; icon.className = 'card-icon grey'; }
    if (title) title.textContent = `¥${msg.content.amount || '0.00'}`;
    if (bottom) bottom.textContent = '已领取';
  } else if (msg.type === 'gift') {
    if (icon) { icon.textContent = getGiftIcon(msg.content); icon.className = 'card-icon grey'; }
    if (title) title.textContent = msg.content.name || '礼物';
    if (bottom) bottom.textContent = '已拆开';
  } else if (msg.type === 'interact') {
    if (icon) { icon.textContent = msg.content.icon || '💞'; icon.className = 'card-icon grey'; }
    if (subtitle) subtitle.textContent = '已接受';
    if (bottom) bottom.textContent = '已接受';
  }
}

// ===== 点击收取对方卡片 =====
function openOtherCard(time, type) {
  const msg = chatHistory.find(m => m.time === time && m.role === 'other');
  if (!msg || !msg.content || msg.content.isOpened) return;
  
  const modal = document.getElementById('giftOpenModal');
  const mIcon = document.getElementById('giftOpenIcon');
  const mTitle = document.getElementById('giftOpenTitle');
  const mName = document.getElementById('giftOpenName');
  const mAmount = document.getElementById('giftOpenAmount');
  const btn = document.getElementById('confirmOpenGiftBtn');
  const closeBtn = document.getElementById('closeGiftOpenBtn');
  
  mAmount.style.display = 'none';
  const isMoney = (type === 'redpacket' || type === 'transfer');
  mTitle.style.color = isMoney ? '#fa5151' : 'var(--primary-dark)';
  // 红包/转账保留红色；礼物、互动、一起听等按钮跟随主题色。
  btn.classList.toggle('danger', isMoney);
  btn.textContent = '拆开';
  closeBtn.style.display = 'block';
  closeBtn.textContent = '暂时不领';

  closeBtn.onclick = () => modal.classList.remove('show');
  
  if (type === 'redpacket') {
    mTitle.textContent = '🧧 恭喜发财';
    mIcon.textContent = '🧧';
    mName.textContent = msg.content.note || '给你发了一个红包';
    btn.onclick = () => {
      mIcon.textContent = '💰';
      mAmount.textContent = `¥${msg.content.amount || '0.00'}`;
      mAmount.style.display = 'block';
      btn.textContent = '开心收下';
      closeBtn.style.display = 'none';
      btn.onclick = () => finishOpenCard(time, type);
    };
  } else if (type === 'gift') {
    mTitle.textContent = '🎁 收到礼物';
    mIcon.textContent = '🎁';
    mName.textContent = '对方送了你一个神秘礼物';
    btn.onclick = () => {
      const giftName = msg.content.name || msg.content.val || '神秘礼物';
      const giftEmoji = getGiftIcon(msg.content);
      mIcon.textContent = giftEmoji;
      mName.textContent = giftName;
      btn.textContent = '开心收下';
      closeBtn.style.display = 'none';
      btn.onclick = () => finishOpenCard(time, type);
    };
  } else if (type === 'transfer') {
    finishOpenCard(time, type);
    return;
  } else if (type === 'interact') {
    mTitle.textContent = `${msg.content.icon || '💞'} ${msg.content.name || '互动请求'}`;
    mIcon.textContent = msg.content.icon || '💞';
    mName.textContent = `对方想要${msg.content.name || '互动'}`;
    btn.textContent = '接受';
    btn.onclick = () => finishOpenCard(time, type);
  } else if (type === 'musicinvite') {
    mTitle.textContent = '🎧 一起听歌';
    mIcon.textContent = '🎧';
    mName.textContent = msg.content.name ? `想和你一起听《${msg.content.name}》` : '想和你一起听首歌';
    btn.textContent = '好呀';
    closeBtn.textContent = '下次吧';
    btn.onclick = () => {
      finishOpenCard(time, type);
      let title = msg.content.name;
      // 没指定歌名就是"一起听歌"，随手放一首
      if (!title && typeof pickRandomSong === 'function') {
        const s = pickRandomSong();
        title = s && s.title;
      }
      if (!title || typeof playSongByTitle !== 'function') return;
      // 已经在听同一首就不重播，只把播放器叫出来
      const same = typeof findSongIndexByTitle === 'function'
        && typeof musicIndex !== 'undefined'
        && findSongIndexByTitle(title) === musicIndex;
      if (same && typeof musicPlaying !== 'undefined' && musicPlaying) {
        openMusicBar();
        updateMusicBarUI();
        return;
      }
      playSongByTitle(title);
    };
  }
  
  modal.classList.add('show');
}

function finishOpenCard(time, type) {
  document.getElementById('giftOpenModal').classList.remove('show');
  const msg = chatHistory.find(m => m.time === time && m.role === 'other');
  if (msg) { msg.content.isOpened = true; saveAllData(); }
  if (typeof moodAfterOpen === 'function') moodAfterOpen(type, msg && msg.content);
  else if (typeof refreshMood === 'function') refreshMood();
  
  const bubble = document.querySelector(`.bubble[data-msg-time="${time}"]`);
  if (bubble) {
    bubble.classList.add('opened');
    const bottom = bubble.querySelector('.card-bottom');
    const icon = bubble.querySelector('.card-icon');
    const title = bubble.querySelector('.card-info h4');
    const subtitle = bubble.querySelector('.card-info p');
    
    if (type === 'transfer') {
      if (icon) { icon.textContent = '✅'; icon.className = 'card-icon grey'; }
      if (subtitle) subtitle.textContent = '已收款';
      if (bottom) bottom.textContent = '已收款';
    } else if (type === 'redpacket') {
      if (icon) { icon.textContent = '🧧'; icon.className = 'card-icon grey'; }
      if (title) title.textContent = `¥${msg.content.amount || '0.00'}`;
      if (bottom) bottom.textContent = '已领取';
    } else if (type === 'interact') {
      if (icon) { icon.textContent = msg.content.icon || '💞'; icon.className = 'card-icon grey'; }
      if (subtitle) subtitle.textContent = '已接受';
      if (bottom) bottom.textContent = '已接受';
    } else if (type === 'musicinvite') {
      if (icon) { icon.textContent = '🎧'; icon.className = 'card-icon grey'; }
      if (bottom) bottom.textContent = '已接受';
    } else if (type === 'gift') {
      const giftName = msg.content.name || '礼物';
      const giftEmoji = getGiftIcon(msg.content);
      if (icon) { icon.textContent = giftEmoji; icon.className = 'card-icon grey'; }
      if (title) title.textContent = giftName;
      if (bottom) bottom.textContent = '已拆开';
    }
  }
  showToast('已收取');
}

// 语音消息播放：同一条再点一次是暂停/继续，换一条才重新播放。
let _voiceAudio = null;
let _voiceEl = null;
function playVoice(el, src) {
  const icon = el.querySelector('.voice-play');
  // 点正在播放的同一条：暂停；再点：从暂停位置继续。
  if (_voiceAudio && _voiceEl === el) {
    if (_voiceAudio.paused) {
      const p = _voiceAudio.play();
      if (icon) icon.textContent = '⏸';
      if (p && p.catch) p.catch(() => { if (icon) icon.textContent = '▶'; });
    } else {
      _voiceAudio.pause();
      if (icon) icon.textContent = '▶';
    }
    return;
  }
  // 换一条：先停掉上一条。
  if (_voiceAudio) { try { _voiceAudio.pause(); } catch (e) {} }
  const oldIcon = _voiceEl && _voiceEl.querySelector('.voice-play');
  if (oldIcon) oldIcon.textContent = '▶';
  _voiceAudio = null;
  _voiceEl = null;
  if (!src) return;
  const audio = new Audio(src);
  _voiceAudio = audio;
  _voiceEl = el;
  if (icon) icon.textContent = '⏸';
  audio.onplay = () => { if (icon) icon.textContent = '⏸'; };
  audio.onpause = () => { if (icon && !audio.ended) icon.textContent = '▶'; };
  audio.onended = () => {
    if (icon) icon.textContent = '▶';
    if (_voiceAudio === audio) { _voiceAudio = null; _voiceEl = null; }
  };
  audio.onerror = () => {
    if (icon) icon.textContent = '▶';
    if (_voiceAudio === audio) { _voiceAudio = null; _voiceEl = null; }
    showToast('这段语音放不出来');
  };
  const p = audio.play();
  if (p && p.catch) p.catch(() => {
    if (icon) icon.textContent = '▶';
    if (_voiceAudio === audio) { _voiceAudio = null; _voiceEl = null; }
  });
}

// 首屏只渲染最近一部分消息；向上加载时每次多补一批，避免手机一次性创建几千条 DOM。
const CHAT_RENDER_INITIAL = 200;
const CHAT_RENDER_STEP = 200;
let chatRenderStart = 0;

function renderChatHistoryWindow(limit, opts) {
  if (!chatEl || typeof chatHistory === 'undefined') return;
  const preserveScroll = !!(opts && opts.preserveScroll);
  const oldHeight = chatEl.scrollHeight;
  const oldTop = chatEl.scrollTop;
  const total = chatHistory.length;
  const size = Math.max(0, Math.min(total, limit || CHAT_RENDER_INITIAL));
  const start = Math.max(0, total - size);
  chatRenderStart = start;

  chatEl.innerHTML = '<div class="sys">你已添加对方为好友，现在可以开始聊天了</div>';
  if (start > 0) {
    const earlier = document.createElement('button');
    earlier.type = 'button';
    earlier.className = 'load-earlier';
    earlier.textContent = `加载更早的 ${start} 条消息`;
    earlier.onclick = () => {
      const visibleCount = chatHistory.length - chatRenderStart;
      renderChatHistoryWindow(visibleCount + CHAT_RENDER_STEP, { preserveScroll: true });
    };
    chatEl.appendChild(earlier);
  }

  window.__deferChatScroll = true;
  try {
    chatHistory.slice(start).forEach(msg => {
      addMessageDOM(msg.content, msg.role === 'me', msg.role === 'system' ? 'sys' : msg.type, msg.time);
    });
  } finally {
    window.__deferChatScroll = false;
    if (preserveScroll) chatEl.scrollTop = oldTop + (chatEl.scrollHeight - oldHeight);
    else chatEl.scrollTop = chatEl.scrollHeight;
  }
  // 重绘会移除情绪槽；这里补回来，避免「加载更早」或清空/导入后情绪池失踪。
  if (typeof refreshMood === 'function') refreshMood(false);
}

function addMessageDOM(content, isMe, type = 'text', time = Date.now()) {
  try {
    if(!chatEl) return;
    // 系统提示（拍一拍、旧版拍一拍数据）：居中的灰色小字，不做成气泡
    if (type === 'sys' || type === 'pat') {
      const sys = document.createElement('div');
      sys.className = 'sys';
      sys.textContent = (content && content.val != null) ? content.val : '';
      chatEl.appendChild(sys);
      if (!window.__deferChatScroll) chatEl.scrollTop = chatEl.scrollHeight;
      return;
    }
    const row = document.createElement('div'); row.className = 'row' + (isMe ? ' me' : '');
    const avatar = document.createElement('div'); avatar.className = 'avatar ' + (isMe ? 'me' : 'other');
    const avatarUrl = isMe ? chatSettings.myAvatar : chatSettings.otherAvatar;
    if (avatarUrl) {
      avatar.innerHTML = `<img src="${avatarUrl}">`;
    } else if (!isMe) {
      // 对方没有上传头像时，用像素爱心作为默认头像，并跟随当前配色
      avatar.classList.add('heart-avatar');
      avatar.innerHTML = `<img src="icons/icon-heart-192.png" class="default-heart-avatar" alt="">`;
    } else {
      avatar.textContent = chatSettings.myName.charAt(0);
    }
    avatar.ondblclick = () => { if (!isMe) triggerPat(true); };
    
    const wrap = document.createElement('div'); wrap.className = 'bubble-wrap';
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    bubble.dataset.msgTime = time;
    
    if (content.quote) {
      const quoteDiv = document.createElement('div');
      quoteDiv.className = 'quote-box';
      quoteDiv.innerHTML = `<b>${content.quote.sender}:</b> ${content.quote.text}`;
      // 单击/双击引用框都回溯到原消息（双向通用；老数据没时间戳就按发送者+文本反查）
      const jumpToQuote = (e) => {
        e.stopPropagation();
        e.preventDefault();
        let t = content.quote.time;
        if (!t) {
          const wantOther = content.quote.sender === chatSettings.otherName;
          const found = chatHistory.find(m => (m.role === 'other') === wantOther && m.content && String(m.content.val || '') === String(content.quote.text || ''));
          if (found) t = found.time;
        }
        if (t) scrollToMessage(t);
        else showToast('找不到原消息了');
      };
      quoteDiv.onclick = jumpToQuote;
      quoteDiv.ondblclick = jumpToQuote;
      bubble.appendChild(quoteDiv);
    }

    const bodyDiv = document.createElement('div');
    if (type === 'image') {
      bubble.classList.add('img-bubble');
      const img = document.createElement('img');
      // 历史里的图片先不全部解码：手机上几十张 base64 图片同时解码会卡住首屏。
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = content.val;
      img.onclick = () => { document.getElementById('previewImg').src = content.val; document.getElementById('imagePreviewModal').classList.add('show'); };
      bodyDiv.appendChild(img);
    } else if (type === 'audio') {
      bubble.classList.add('voice-bubble');
      const dur = Math.max(1, Math.round(content.dur || 0));
      bodyDiv.className = 'voice-body';
      bodyDiv.innerHTML = `<span class="voice-play">▶</span><span class="voice-wave">${'<i></i>'.repeat(5)}</span><span class="voice-dur">${dur}″</span>`;
      bodyDiv.onclick = (e) => { e.stopPropagation(); playVoice(bodyDiv, content.val); };
    } else if (type === 'call') {
      // 通话记录：电话图标 + 结果文字，保留普通气泡的归属（我/对方）
      bubble.classList.add('call-bubble');
      const st = String(content.callState || '');
      const kind = st.indexOf('missed') === 0 ? 'missed'
        : st.indexOf('rejected') === 0 ? 'rejected'
        : st === 'cancelled' ? 'cancelled' : 'completed';
      bodyDiv.className = 'call-log ' + kind;
      const icon = document.createElement('span');
      icon.className = 'call-log-icon';
      icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.49a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.2 2.2z"/></svg>';
      const label = document.createElement('span');
      label.className = 'call-log-text';
      label.textContent = content.val || '';
      bodyDiv.appendChild(icon);
      bodyDiv.appendChild(label);
    } else if (type === 'location' || type === 'redpacket' || type === 'transfer' || type === 'gift' || type === 'interact' || type === 'musicshare' || type === 'musicinvite' || type === 'choice') {
      bubble.classList.add('special-card');
      if (content.isOpened) bubble.classList.add('opened');
      
      let icon = '', title = '', colorClass = '', subTitle = '';
      if(type === 'location') { icon = '📍'; title = content.val || '位置'; colorClass = 'loc'; subTitle = '位置信息'; }
      if(type === 'redpacket') {
        icon = content.isOpened ? '🧧' : '🧧';
        title = content.isOpened ? `¥${content.amount || '0.00'}` : '恭喜发财';
        colorClass = content.isOpened ? 'grey' : 'red';
        subTitle = '红包';
      }
      if(type === 'transfer') { 
        icon = content.isOpened ? '✅' : '💰'; 
        title = `¥${content.amount || '0.00'}`; 
        colorClass = content.isOpened ? 'grey' : 'trans'; 
        subTitle = content.isOpened ? '已收款' : '转账'; 
      }
      if(type === 'interact') {
        icon = content.isOpened ? (content.icon || '💞') : (content.icon || '💞');
        title = content.name || '互动';
        colorClass = content.isOpened ? 'grey' : 'interact';
        subTitle = content.isOpened ? '已接受' : '互动请求';
      }
      if(type === 'gift') {
        let gName = content.name || content.val || '神秘礼物';
        if (!isMe && !content.isOpened) gName = '神秘礼物'; // 对方送的一开始不暴露

        const gEmoji = content.isOpened ? getGiftIcon(content) : '🎁';

        icon = gEmoji;
        title = content.isOpened ? gName : '礼物';
        colorClass = content.isOpened ? 'grey' : 'gift'; // 礼物跟配色走，红包才保留红色
        subTitle = '礼物';
      }
      if (type === 'musicshare') {
        icon = '🎵';
        title = content.name || '一首歌';
        colorClass = 'music';
        subTitle = content.artist ? content.artist : '分享歌曲';
      }
      if (type === 'musicinvite') {
        icon = '🎧';
        title = '一起听歌';
        colorClass = 'music';
        subTitle = content.name ? `想和你听《${content.name}》` : '想和你一起听';
      }
      if (type === 'choice') {
        const opts = content.options || [];
        const pickN = Math.min(Math.max(1, content.pickCount || 1), opts.length || 1);
        icon = '☑️';
        title = content.title || '帮我选一下';
        colorClass = 'choice';
        subTitle = `${opts.length}选${pickN}`;
      }

      let bottomText = '';
      if (type === 'location') bottomText = '位置信息';
      else if (type === 'choice') bottomText = content.chosen ? '已选择 · 点击展开' : (isMe ? '等待对方选择 · 点击展开' : '点击展开');
      else if (type === 'musicshare') bottomText = content.isOpened ? '已播放' : '点击播放';
      else if (type === 'musicinvite') bottomText = content.isOpened ? '已接受' : (isMe ? '等待对方回应' : '点击接受');
      else if (type === 'transfer') bottomText = content.isOpened ? '已收款' : '未收款';
      else if (content.isOpened) {
        if (type === 'redpacket') bottomText = '已领取';
        else if (type === 'gift') bottomText = '已拆开';
        else if (type === 'interact') bottomText = '已接受';
      } else if (!isMe) {
        bottomText = type === 'interact' ? '点击接受' : '点击拆开';
      } else {
        bottomText = type === 'interact' ? '等待对方回应' : '等待对方查看';
      }
      
      bodyDiv.innerHTML = `<div class="card-top"><div class="card-icon ${colorClass}">${icon}</div><div class="card-info"><h4>${title}</h4><p>${subTitle}</p></div></div><div class="card-bottom">${bottomText}</div>`;

      // 推荐歌曲 / 红包 / 转账：卡片里带一句备注
      if ((type === 'musicshare' || type === 'redpacket' || type === 'transfer') && content.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'card-note';
        noteEl.textContent = content.note;
        const bottom = bodyDiv.querySelector('.card-bottom');
        if (bottom) bodyDiv.insertBefore(noteEl, bottom); else bodyDiv.appendChild(noteEl);
      }

      // 选择卡：选项默认收起，点卡片展开；选过的选项打勾
      if (type === 'choice') {
        bubble.classList.add('choice-card');
        const optsBox = document.createElement('div');
        optsBox.className = 'choice-options';
        const chosen = Array.isArray(content.chosen) ? content.chosen : [];
        (content.options || []).forEach((opt, i) => {
          const rowEl = document.createElement('div');
          rowEl.className = 'choice-opt' + (chosen.indexOf(opt.text) >= 0 ? ' picked' : '');
          const num = document.createElement('span');
          num.className = 'num';
          num.textContent = String(i + 1);
          const txt = document.createElement('span');
          txt.textContent = opt.text;
          rowEl.appendChild(num); rowEl.appendChild(txt);
          optsBox.appendChild(rowEl);
        });
        const bottomEl = bodyDiv.querySelector('.card-bottom');
        if (bottomEl) bodyDiv.insertBefore(optsBox, bottomEl); else bodyDiv.appendChild(optsBox);
        bodyDiv.onclick = () => bubble.classList.toggle('expanded');
      }

      if (type === 'musicshare') {
        bodyDiv.onclick = () => {
          if (typeof playSongByTitle === 'function') playSongByTitle(content.name);
          if (!content.isOpened) {
            content.isOpened = true;
            saveAllData();
            const bottom = bodyDiv.querySelector('.card-bottom');
            if (bottom) bottom.textContent = '已播放';
          }
          if (typeof moodAfterRecommendPlay === 'function') moodAfterRecommendPlay();
        };
      } else if (type !== 'choice' && !isMe && !content.isOpened && type !== 'location') {
        bodyDiv.onclick = () => openOtherCard(time, type);
      }
    } else {
      const textVal = (content.val === undefined || content.val === null) ? '' : String(content.val);
      if (content.autoReply) {
        const tag = document.createElement('span');
        tag.className = 'auto-reply-tag';
        tag.textContent = '[自动回复] ';
        bodyDiv.appendChild(tag);
        bodyDiv.appendChild(document.createTextNode(textVal));
      } else {
        bodyDiv.textContent = textVal;
      }
      
      // 只有"纯表情"才放大去气泡：数字/字母/中文都算正常消息，别被 \p{Emoji} 误吞
      const emojiOnly = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍️\s]+$/u.test(textVal)
        && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(textVal);
      if (textVal.length <= 12 && emojiOnly) {
        bubble.style.fontSize = '30px'; bubble.style.background = 'transparent'; bubble.style.padding = '0'; bubble.style.boxShadow = 'none'; 
      }
    }
    
    bubble.appendChild(bodyDiv);

    bubble.oncontextmenu = (e) => { e.preventDefault(); showBubbleMenu(e.clientX, e.clientY, content, isMe, type, time, row); };
    let bubblePressTimer = null;
    bubble.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      const cx = t ? t.clientX : 0, cy = t ? t.clientY : 0;
      bubblePressTimer = setTimeout(() => {
        window._suppressNextClick = true;
        setTimeout(() => { window._suppressNextClick = false; }, 500);
        showBubbleMenu(cx, cy, content, isMe, type, time, row);
        if (navigator.vibrate) navigator.vibrate(20);
      }, 550);
    }, { passive: true });
    bubble.addEventListener('touchend', () => clearTimeout(bubblePressTimer));
    bubble.addEventListener('touchmove', () => clearTimeout(bubblePressTimer));
    bubble.addEventListener('touchcancel', () => clearTimeout(bubblePressTimer));
    bubble.ondblclick = (e) => {
      if (e.target.closest && e.target.closest('.quote-box')) return; // 双击引用框是回溯，不是发起新引用
      startQuote(content, isMe ? chatSettings.myName : chatSettings.otherName, getQuoteDisplayText(content, type), time);
    };

    const timeStr = document.createElement('div'); timeStr.className = 'bubble-time'; timeStr.textContent = getTimeStr(time);
    if (chatSettings.readReceipts === true) {
      const unread = isMe ? (content.read === false) : (content.readByMe === false);
      const status = document.createElement('span');
      status.className = 'read-status' + (unread ? ' unread' : '');
      status.textContent = unread ? '未读' : '已读';
      timeStr.appendChild(status);
    }
    wrap.appendChild(bubble); wrap.appendChild(timeStr);
    row.appendChild(avatar); row.appendChild(wrap); chatEl.appendChild(row);
    // 批量重绘历史时先不逐条滚动，否则每条消息都会强制一次布局，手机端会明显卡顿。
    if (!window.__deferChatScroll) chatEl.scrollTop = chatEl.scrollHeight;
  } catch (err) { console.error("渲染错误", err); }
}

function startQuote(contentObj, sender, text, timeVal) {
  currentQuote = { sender, text, time: timeVal || (contentObj && contentObj.time) };
  document.getElementById('quotePreview').style.display = 'flex';
  document.getElementById('quoteSender').textContent = `回复 ${sender}:`;
  document.getElementById('quoteText').textContent = text;
  document.getElementById('msgInput').focus();
}
document.getElementById('cancelQuoteBtn').onclick = () => {
  currentQuote = null;
  document.getElementById('quotePreview').style.display = 'none';
};

function markMyMessagesRead() {
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') return;
  let changed = false;
  chatHistory.forEach(m => {
    if (m && m.role === 'me' && m.content && m.content.read === false) {
      m.content.read = true;
      changed = true;
    }
  });
  if (changed) saveAllData();
  refreshReadReceiptUI();
}

function markHisMessagesRead() {
  let changed = false;
  chatHistory.forEach(m => {
    if (m && m.role === 'other' && m.content && m.content.readByMe === false) {
      m.content.readByMe = true;
      changed = true;
    }
  });
  if (changed) saveAllData();
  refreshReadReceiptUI();
}

function refreshReadReceiptUI() {
  document.querySelectorAll('.bubble[data-msg-time]').forEach(bubble => {
    const row = bubble.closest('.row');
    if (!row) return;
    const timeEl = bubble.parentElement && bubble.parentElement.querySelector('.bubble-time');
    if (!timeEl) return;
    let status = timeEl.querySelector('.read-status');
    if (chatSettings.readReceipts !== true) {
      if (status) status.remove();
      return;
    }
    const time = Number(bubble.dataset.msgTime);
    const isMine = row.classList.contains('me');
    const msg = chatHistory.find(m => m && m.time === time && (isMine ? m.role === 'me' : m.role === 'other'));
    if (!msg) {
      if (status) status.remove();
      return;
    }
    if (!status) {
      status = document.createElement('span');
      status.className = 'read-status';
      timeEl.appendChild(status);
    }
    const unread = isMine
      ? !!(msg.content && msg.content.read === false)
      : !!(msg.content && msg.content.readByMe === false);
    status.textContent = unread ? '未读' : '已读';
    status.classList.toggle('unread', unread);
  });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && chatSettings.readReceipts === true) markHisMessagesRead();
});
window.addEventListener('focus', () => {
  if (chatSettings.readReceipts === true) markHisMessagesRead();
});

function sendMessage(val, type = 'text', isMe = true, customQuote = null) {
  const time = Date.now();
  // 他发来消息时先收起“正在输入”，避免第二条消息到了、上一条还在转圈。
  if (!isMe && typeof hideTypingIndicator === 'function') hideTypingIndicator();
  // 我发消息时，如果对方仍处于 2G 或离线，每 5 秒提醒一次当前连接状态。
  if (isMe && typeof notifyConnectionState === 'function') notifyConnectionState(false);
  // 记录这段 2G 期间我确实发过消息；网络恢复时才有必要补一句“刚才太卡了”。
  if (isMe && typeof getOtherNetworkMode === 'function' && getOtherNetworkMode() === '2G' &&
      !(typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线')) {
    window.__slowNetworkHadUserMsg = true;
  }
  const isObj = val && typeof val === 'object';
  const content = isObj
    ? Object.assign({}, val, { val: val.val !== undefined ? val.val : '', isOpened: !!val.isOpened, quote: customQuote })
    : { val, isOpened: false, quote: customQuote };
  if (isObj && content.val === '' && content.name) content.val = content.name;
  if (chatSettings.readReceipts === true) {
    if (isMe) content.read = false;
    else content.readByMe = !document.hidden && document.hasFocus();
  }
  // 先写历史再画 DOM：即使某个气泡渲染出错，消息也不会从存档里消失。
  chatHistory.push({ role: isMe ? 'me' : 'other', type, content, time });
  saveAllData();
  addMessageDOM(content, isMe, type, time);
  if (!isMe) markMyMessagesRead();
  if (!isMe && typeof notifyIncomingMessage === 'function') notifyIncomingMessage(content, type);
  lastInteractionTime = Date.now();

  // 他还在输入时我插话：把输入提示留在最下面，避免它被挤到我的消息上方
  if (isMe && chatEl) {
    const typing = document.getElementById('typingIndicator');
    if (typing && typing.parentElement === chatEl) chatEl.appendChild(typing);
  }

  // 音效：收发消息一声轻响；他发来红包/礼物/转账换成两声铃
  if (isMe) {
    if (typeof playSfx === 'function') playSfx('send');
  } else if ((type === 'redpacket' || type === 'gift' || type === 'transfer') && typeof playReceiveChime === 'function') {
    playReceiveChime();
  } else {
    if (typeof playSfx === 'function') playSfx('send');
  }

  // 心情：普通消息按概率轻刷，关键词/特殊互动按各自概率触发
  if (typeof moodAfterMessage === 'function') moodAfterMessage(isMe, type, content);

  // 自己发言后，最后一条真实消息变成了“我”：普通情绪要立即收起。
  // 否则“对方正在输入”或新 DOM 插入时，watchChat 会把旧情绪气泡挪到我的消息下面。
  if (isMe && typeof refreshMood === 'function') refreshMood(false);

  // 互动的接受由 sendInteract()/finishMyInteraction() 负责；
  // 这里只自动处理红包、转账、礼物，避免离线时互动被“自动已接受”。
  if (isMe && (type === 'redpacket' || type === 'transfer' || type === 'gift')) {
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => autoReceiveMyCard(time), delay);
  }
}

// ===== 拍一拍 =====
function triggerPat(isMePatting) {
  let patText = '';
  let targetAvatar = null;

  if (isMePatting) {
    const action = (chatSettings.myPatAction || '拍了拍').trim();
    const suffix = (chatSettings.myPatSuffix || '').trim();
    patText = `${chatSettings.myName} ${action} ${chatSettings.otherName}${suffix ? ' ' + suffix : ''}`;
    const others = document.querySelectorAll('.avatar.other');
    if (others.length > 0) targetAvatar = others[others.length - 1];
  } else {
    if (pokeLibrary.length === 0) {
      patText = `${chatSettings.otherName} 拍了拍 ${chatSettings.myName}`;
    } else {
      const poke = pokeLibrary[Math.floor(Math.random() * pokeLibrary.length)].val
        .replace(/\[我\]/g, chatSettings.myName)
        .replace(/\[他\]/g, chatSettings.otherName);
      patText = `${chatSettings.otherName} ${poke}`;
    }
    const mines = document.querySelectorAll('.avatar.me');
    if (mines.length > 0) targetAvatar = mines[mines.length - 1];
  }

  if (targetAvatar) {
    targetAvatar.classList.add('shake');
    setTimeout(() => targetAvatar.classList.remove('shake'), 500);
  }

  chatHistory.push({ role: 'system', type: 'text', content: { val: patText }, time: Date.now() });
  saveAllData();
  const sys = document.createElement('div'); 
  sys.className = 'sys'; 
  sys.textContent = patText; 
  if(chatEl) {
    chatEl.appendChild(sys);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  // 普通情绪先藏起来，等下一次真实消息；事件情绪会居中显示
  if (typeof refreshMood === 'function') refreshMood(true);
  if (isMePatting) {
    const react = () => {
      const reactions = ['干嘛呀~', '嘿嘿', '怎么啦？', '戳我干嘛', '我在呢'];
      sendMessage(reactions[Math.floor(Math.random() * reactions.length)], 'text', false);
    };
    if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
      if (typeof noteOfflineNudge === 'function') noteOfflineNudge(1);
      if (typeof scheduleOfflineReturn === 'function') scheduleOfflineReturn();
      if (typeof whenOtherOnline === 'function') whenOtherOnline(react);
    } else {
      setTimeout(react, 1000);
    }
  }
}

function getRandomDelay() {
  let delay = Math.floor(Math.random() * ((chatSettings.replyDelay || 1) * 60 * 1000));
  // 2G 在用户设置的随机延迟基础上额外加 10 秒，只做轻微拖慢。
  if (typeof getOtherNetworkMode === 'function' && getOtherNetworkMode() === '2G') delay += 10000;
  return delay;
}

// 当前这条消息之前（含当前）连续由我发出的消息数，用来判断“发了很多条”。
function countMyMessageStreak() {
  let count = 0;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (!m || !m.role) continue;
    if (m.role === 'system') continue;
    if (m.role === 'me') count++;
    else break;
  }
  return count;
}

function showTypingIndicator(labelText) {
  if(!chatEl) return;
  if (document.getElementById('typingIndicator')) return;
  const row = document.createElement('div');
  row.id = 'typingIndicator';
  row.className = 'row';
  const avatar = document.createElement('div'); avatar.className = 'avatar other';
  if (chatSettings.otherAvatar) {
    avatar.innerHTML = `<img src="${chatSettings.otherAvatar}">`;
  } else {
    avatar.classList.add('heart-avatar');
    avatar.innerHTML = `<img src="icons/icon-heart-192.png" class="default-heart-avatar" alt="">`;
  }
  const wrap = document.createElement('div'); wrap.className = 'bubble-wrap';
  const bubble = document.createElement('div'); bubble.className = 'bubble typing-bubble';
  const label = document.createElement('span'); label.className = 'typing-label'; label.textContent = labelText || `${chatSettings.otherName} 正在输入`;
  bubble.appendChild(label);
  for (let i = 0; i < 3; i++) { const d = document.createElement('span'); d.className = 'typing-dot'; bubble.appendChild(d); }
  wrap.appendChild(bubble); row.appendChild(avatar); row.appendChild(wrap);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

// 有内置回复的场景：抽字卡的比例
const HYBRID_TEXT_CARD_RATE = 0.7;       // 通用兜底
const HYBRID_INTERACT_CARD_RATE = 0.5;   // 互动：五五开
const HYBRID_MUSIC_CARD_RATE = 0.6;      // 推荐歌曲：字卡略多

// 2G 网络：进入文字回复分支后，内置慢网短句与字卡库的混合比例。
// 55% 说“卡死了”这类话，45% 正常抽字卡；拍一拍、音乐、礼物等事件仍按原概率触发。
const SLOW_NETWORK_BUILTIN_RATE = 0.55;
const SLOW_NETWORK_REPLIES = [
  '卡死了',
  '卡死了，消息转了半天',
  '网太差了，刚刚那条才发出去',
  '我这边卡得不行',
  '等一下，我网络好慢',
  '消息一直转圈',
  '刚发出去，卡死了',
  '这网慢得我想砸手机'
];

// 网络从 2G 恢复后，可能补一句“刚才太卡了”。有冷却，避免来回切换时刷屏。
const NETWORK_RECOVERY_REPLIES = [
  '刚才太卡了，现在终于好了',
  '刚刚网络卡死了，现在好了',
  '终于不卡了',
  '刚才一直转圈，现在恢复了',
  '网终于好了，刚才消息都发不出去',
  '卡了半天，现在能好好说话了'
];
const NETWORK_RECOVERY_CHANCE = 0.65;
const NETWORK_RECOVERY_COOLDOWN = 90000;
const NETWORK_RECOVERY_MIN_MS = 10000;

// 从自己的字卡里抽一条回复（互动、推荐歌曲的“混合模式”共用）
// 返回 false 表示字卡库为空，调用方可以退回固定内置回复。
function sendRandomTextCardReply(opts) {
  const options = opts || {};
  const textCards = contents.filter(item => item && item.type === 'text' && item.val);
  if (!textCards.length) return false;

  let quote = null;
  const quoteChance = options.quoteChance == null ? 0.2 : options.quoteChance;
  if (Math.random() < quoteChance) {
    const recent = chatHistory.slice(-20).filter(m => m.role === 'me' && m.type === 'text' && m.content);
    if (recent.length) {
      const target = recent[Math.floor(Math.random() * recent.length)];
      quote = { sender: chatSettings.myName, text: target.content.val, time: target.time };
    }
  }

  const picked = textCards[Math.floor(Math.random() * textCards.length)];
  if (typeof boostMoodFromCard === 'function') boostMoodFromCard(picked);
  let text = String(picked.val);
  const emojis = contents.filter(item => item && item.type === 'emoji' && item.val);
  if (emojis.length && Math.random() < 0.3) {
    text += ' ' + emojis[Math.floor(Math.random() * emojis.length)].val;
  }
  sendMessage({ val: text, autoReply: options.autoReply === true }, 'text', false, quote);
  return true;
}

let lastEmptyCardPromptAt = 0;
function promptEmptyCardLibrary() {
  const now = Date.now();
  if (now - lastEmptyCardPromptAt < 15000) return;
  lastEmptyCardPromptAt = now;
  if (typeof showConfirm === 'function') {
    showConfirm('字卡库为空', '请进入「自定义回复」添加字卡。是否现在前往？', () => {
      const btn = document.getElementById('menuCards');
      if (btn) btn.click();
    });
  } else if (typeof showToast === 'function') {
    showToast('字卡库为空，请进入自定义回复添加字卡');
  }
}

// 随机回复里的特殊事件概率。音乐总概率低于其他互动，且邀请只占其中约 1/3。
const RANDOM_PAT_CHANCE = 0.06;
const RANDOM_MUSIC_CHANCE = 0.03;
const RANDOM_MUSIC_INVITE_RATIO = 0.35; // 音乐事件中 35% 是邀请，约 1.05%
const RANDOM_MONEY_CHANCE = 0.05;
const RANDOM_IMAGE_CARD_CHANCE = 0.12;
const MUSIC_EVENT_COOLDOWN = 8 * 60 * 1000;

function hasRecentMusicEvent() {
  const cutoff = Date.now() - MUSIC_EVENT_COOLDOWN;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (!m || !m.time) continue;
    if (m.time < cutoff) break;
    if (m.type === 'musicshare' || m.type === 'musicinvite') return true;
  }
  return false;
}

function sendSlowNetworkBuiltinReply() {
  let line = SLOW_NETWORK_REPLIES[Math.floor(Math.random() * SLOW_NETWORK_REPLIES.length)];
  // 慢网已经够烦了，偶尔带一个无奈 emoji。
  if (Math.random() < 0.3) {
    line += ' ' + (Math.random() < 0.5 ? '😮‍💨' : '😤');
  }
  sendMessage(line, 'text', false);
}

// 网络从 2G 恢复后调用；是否真的发由 router.js 判断冷却和时长。
function sendNetworkRecoveryLine() {
  let line = NETWORK_RECOVERY_REPLIES[Math.floor(Math.random() * NETWORK_RECOVERY_REPLIES.length)];
  if (Math.random() < 0.35) {
    line += ' ' + (Math.random() < 0.5 ? '😮‍💨' : '🥺');
  }
  sendMessage(line, 'text', false);
}

function randomReply() {
  // 离线时不能从在线回复池里抽；改成离线自动回复并安排回来。
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
    if (typeof sendOfflineAutoReply === 'function') sendOfflineAutoReply();
    if (typeof scheduleOfflineReturn === 'function') scheduleOfflineReturn();
    return;
  }
  // 偶尔拍一拍（约每 17 条回复一次）
  if (Math.random() < RANDOM_PAT_CHANCE) {
    triggerPat(false);
    return;
  }

  // 偶尔分享一首歌，或者邀请你一起听；8 分钟内只出现一次音乐事件，避免连续听歌
  if (Math.random() < RANDOM_MUSIC_CHANCE && !hasRecentMusicEvent() && typeof pickRandomSong === 'function') {
    const song = pickRandomSong();
    if (song) {
      if (Math.random() >= RANDOM_MUSIC_INVITE_RATIO) {
        const notes = ['这首好听，听听看', '今天的单曲循环', '歌词写得很像我们', '心情不好就听这个', '突然想到你，就发你了'];
        sendMessage({
          name: song.title,
          artist: song.artist,
          val: song.title,
          note: notes[Math.floor(Math.random() * notes.length)]
        }, 'musicshare', false);
      } else {
        // 有时候只是想和你一起听歌，不指定哪一首
        const name = Math.random() < 0.5 ? song.title : '';
        sendMessage({ name, artist: song.artist }, 'musicinvite', false);
      }
      return;
    }
  }

  const r = Math.random();
  if (r < RANDOM_MONEY_CHANCE) {
    // 送礼 55% / 红包 30% / 转账 15%：礼物最常见，转账最少
    const tr = Math.random();
    const t = tr < 0.55 ? 'gift' : (tr < 0.85 ? 'redpacket' : 'transfer');

    // 对方随机送礼：按价位加权，便宜的多、贵的少
    if (t === 'gift') {
      const g = (typeof pickRandomGift === 'function') ? pickRandomGift() : null;
      if (g) {
        sendMessage({ name: g.name, icon: g.icon, price: g.price, val: `送了你${g.name}` }, 'gift', false);
      } else {
        sendMessage({ name: '神秘礼物', val: '送了你神秘礼物' }, 'gift', false);
      }
    }
    else if (t === 'redpacket') {
      sendMessage(typeof randomMoneyPayload === 'function' ? randomMoneyPayload('redpacket') : { amount: '52.00', note: '给你个小红包' }, 'redpacket', false);
    }
    else if (t === 'transfer') {
      sendMessage(typeof randomMoneyPayload === 'function' ? randomMoneyPayload('transfer') : { amount: '520.00', note: '拿去花' }, 'transfer', false);
    }
    return;
  }

  const textCards = contents.filter(item => item.type === 'text');
  const imageCards = contents.filter(item => item.type === 'image');
  
  let quote = null;
  if (Math.random() < 0.2) {
    const recentMyMsgs = chatHistory.slice(-20).filter(m => m.role === 'me' && m.type === 'text');
    if (recentMyMsgs.length > 0) {
      const target = recentMyMsgs[Math.floor(Math.random() * recentMyMsgs.length)];
      quote = { sender: chatSettings.myName, text: target.content.val, time: target.time };
    }
  }

  if (imageCards.length > 0 && Math.random() < RANDOM_IMAGE_CARD_CHANCE) { sendMessage(imageCards[Math.floor(Math.random() * imageCards.length)].val, 'image', false, quote); return; }

  // 2G：文字回复不再全部抽字卡，先按比例说一句“卡死了”这类慢网短句。
  if (typeof getOtherNetworkMode === 'function' && getOtherNetworkMode() === '2G' &&
      Math.random() < SLOW_NETWORK_BUILTIN_RATE) {
    sendSlowNetworkBuiltinReply();
    return;
  }

  if (textCards.length === 0) { promptEmptyCardLibrary(); return; }

  const pickedCard = textCards[Math.floor(Math.random() * textCards.length)];
  // 他抽到带"吃醋/嫉妒"或"亲密"标签的字卡时，接下来一段时间的心情会往那边偏
  if (typeof boostMoodFromCard === 'function') boostMoodFromCard(pickedCard);
  let replyText = pickedCard.val;
  
  const emojis = contents.filter(item => item.type === 'emoji');
  if (emojis.length > 0 && Math.random() < 0.3) {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)].val;
    replyText = replyText + ' ' + randomEmoji; 
  }
  
  sendMessage(replyText, 'text', false, quote);
}

// 离线自动回复：80% 内置句，20% 抽字卡库；都带 [自动回复] 标记。
const OFFLINE_AUTO_REPLIES = [
  '你要好好吃饭',
  '喝水了吗？记得多喝水',
  '睡不够就好好休息',
  '我马上就会回来了',
  '正在朝你飞奔而来...',
  '转人工'
];
const OFFLINE_AUTO_REPLY_DELAY = 2000;

function sendOfflineAutoReply() {
  if (typeof getOtherStatusMain !== 'function' || getOtherStatusMain() !== '离线') return;
  if (Math.random() < 0.2 && typeof sendRandomTextCardReply === 'function' &&
      sendRandomTextCardReply({ quoteChance: 0.08, autoReply: true })) return;
  const line = OFFLINE_AUTO_REPLIES[Math.floor(Math.random() * OFFLINE_AUTO_REPLIES.length)];
  sendMessage({ val: line, autoReply: true }, 'text', false);
}

// 你越主动找他（消息、互动、电话），他越容易提前上线；增幅有上限。
function noteOfflineNudge(weight) {
  window.__offlineNudges = Math.max(0, (window.__offlineNudges || 0) + (weight || 1));
}
function whenOtherOnline(callback, pollMs, maxMs) {
  const start = Date.now();
  const step = pollMs || 1500;
  const limit = maxMs || 15 * 60000;
  (function tick() {
    if (typeof getOtherStatusMain !== 'function' || getOtherStatusMain() !== '离线') { callback(); return; }
    if (Date.now() - start < limit) setTimeout(tick, step);
  })();
}

// 离线期间攒下的互动/邀请/选择卡，上线后按队列一条一条回应，避免同时弹出。
let onlineReplyQueue = [];
let onlineReplyBusy = false;
let onlineReplyDrainTimer = null;

function enqueueOnlineReply(task, priority) {
  if (typeof task !== 'function') return;
  if (priority) onlineReplyQueue.unshift(task);
  else onlineReplyQueue.push(task);
  drainOnlineReplyQueue();
}

function drainOnlineReplyQueue() {
  if (onlineReplyBusy || !onlineReplyQueue.length) return;
  const offline = typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线';
  const inCall = typeof callWidget !== 'undefined' && callWidget && callWidget.style.display === 'flex';
  if (offline || window.__offlineReturnGate || inCall) {
    if (onlineReplyDrainTimer) return;
    onlineReplyDrainTimer = setTimeout(() => {
      onlineReplyDrainTimer = null;
      drainOnlineReplyQueue();
    }, 1200);
    return;
  }
  onlineReplyBusy = true;
  const task = onlineReplyQueue.shift();
  try { task(); } catch (e) { console.error('[online-reply-queue]', e); }
  setTimeout(() => {
    onlineReplyBusy = false;
    drainOnlineReplyQueue();
  }, 1800 + Math.random() * 1600);
}
function completeOfflineReturn() {
  if (typeof getOtherStatusMain !== 'function' || getOtherStatusMain() !== '离线') return;
  const reason = window.__offlineReason || 'generic';
  const streak = (typeof countMyMessageStreak === 'function') ? countMyMessageStreak() : 0;
  if (typeof moodAfterOfflineReturn === 'function') moodAfterOfflineReturn(streak);
  const pickLine = (typeof pickOfflineReturnLine === 'function') ? pickOfflineReturnLine : null;
  let line = pickLine ? pickLine(reason) : '';
  if (!line) {
    const lines = (typeof offlineReplyLines !== 'undefined' && offlineReplyLines.length) ? offlineReplyLines : ['刚看到消息！怎么啦'];
    line = lines[Math.floor(Math.random() * lines.length)];
  }
  const offlineCall = (typeof takeOfflineCallNote === 'function') ? takeOfflineCallNote() : null;
  const offlineCallLine = (offlineCall && typeof offlineCallNoteLine === 'function')
    ? offlineCallNoteLine(offlineCall) : '';
  window.__offlineReturnGate = true;
  if (typeof setOtherOnline === 'function') setOtherOnline();
  window.__offlineReason = '';
  markMyMessagesRead();
  if (Math.random() < 0.55) line += ' ' + (Math.random() < 0.5 ? '😭' : '🥺');
  sendMessage(line, 'text', false);
  setTimeout(() => {
    window.__offlineReturnGate = false;
    if (offlineCallLine && typeof enqueueOnlineReply === 'function') {
      enqueueOnlineReply(() => sendMessage(offlineCallLine, 'text', false), true);
    }
    if (typeof drainOnlineReplyQueue === 'function') drainOnlineReplyQueue();
  }, 1800 + Math.random() * 1200);
  setTimeout(() => {
    // 有攒下来的互动时，先按队列一条条读，不再额外插一条随机回复。
    if (window.__offlineReturnGate) return;
    if (typeof onlineReplyQueue !== 'undefined' && onlineReplyQueue.length) return;
    randomReply();
  }, 1200 + Math.random() * 1500);
}
function scheduleOfflineReturn() {
  if (typeof getOtherStatusMain !== 'function' || getOtherStatusMain() !== '离线') return;
  const nudges = window.__offlineNudges || 0;
  // 最多把 90–240 秒缩短约 35%，仍然保留等待感。
  const reduction = Math.min(0.35, nudges * 0.05);
  const delay = Math.max(30000, (90000 + Math.random() * 150000) * (1 - reduction));
  const due = Date.now() + delay;
  if (offlineReturnTimer && due >= offlineReturnDue) return;
  if (offlineReturnTimer) clearTimeout(offlineReturnTimer);
  offlineReturnDue = due;
  offlineReturnTimer = setTimeout(() => {
    offlineReturnTimer = null;
    offlineReturnDue = 0;
    completeOfflineReturn();
  }, delay);
}
function resetOfflineReturnState() {
  if (offlineReturnTimer) { clearTimeout(offlineReturnTimer); offlineReturnTimer = null; }
  offlineReturnDue = 0;
  window.__offlineNudges = 0;
}

// 处理正在输入的延迟
function simulateReplyWithDelay() {
  // 对方离线时：先固定几秒自动回复，再过一阵才真正回来。
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
    if (offlineAutoReplyTimer) clearTimeout(offlineAutoReplyTimer);
    offlineAutoReplyTimer = setTimeout(() => {
      offlineAutoReplyTimer = null;
      sendOfflineAutoReply();
    }, OFFLINE_AUTO_REPLY_DELAY);

    noteOfflineNudge(1);
    scheduleOfflineReturn();
    return;
  }
  const delay = getRandomDelay();
  const typingOn = chatSettings.showTyping !== false;
  if (chatSettings.readReceipts === true) {
    const typingAt = typingOn ? Math.min(1000, delay / 2) : delay;
    setTimeout(markMyMessagesRead, Math.max(0, typingAt - 500));
  }
  if (delay > 2000 && typingOn) {
    setTimeout(showTypingIndicator, Math.min(1000, delay / 2));
    setTimeout(() => { hideTypingIndicator(); randomReply(); }, delay);
  } else {
    setTimeout(randomReply, delay);
  }
}

setInterval(() => {
  if (chatSettings.autoReplyTime > 0) {
    const now = Date.now();
    if (now - lastInteractionTime > chatSettings.autoReplyTime * 60 * 1000) {
      lastInteractionTime = now;
      let count = chatSettings.autoReplyCount || 1;
      for(let i=0; i<count; i++) { setTimeout(simulateReplyWithDelay, i * 1500); }
    }
  }
}, 5000); 

// ===== 个性签名：进站概率换一条，之后 15~30 分钟大概率换 =====
let signatureTimer = null;

function pickDifferentSignature() {
  const lib = (typeof signatureLibrary !== 'undefined' && signatureLibrary) ? signatureLibrary : [];
  if (!lib.length) return '';
  const pool = lib.filter(s => s && s.val && s.val !== chatSettings.signature);
  const list = pool.length ? pool : lib;
  const item = list[Math.floor(Math.random() * list.length)];
  return item && item.val ? item.val : '';
}

function changeSignatureNow() {
  const next = pickDifferentSignature();
  if (!next || next === chatSettings.signature) return false;
  chatSettings.signature = next;
  saveAllData();
  const sigEl = document.getElementById('signatureBar');
  if (sigEl && sigEl.classList.contains('lyric-bubble')) {
    if (typeof savedSignatureText !== 'undefined') savedSignatureText = next;
  } else {
    applyChatSettings();
  }
  return true;
}

function scheduleSignatureChange(delayMs) {
  if (signatureTimer) clearTimeout(signatureTimer);
  const base = Math.max(15, Number(chatSettings.sigTimer) || 15);
  const wait = (typeof delayMs === 'number') ? delayMs : (base + Math.random() * base) * 60000;
  signatureTimer = setTimeout(() => {
    if (Math.random() < 0.85) {
      changeSignatureNow();
      scheduleSignatureChange();
    } else {
      // 偶尔这一次不换，5~10 分钟后再试
      scheduleSignatureChange((5 + Math.random() * 5) * 60000);
    }
  }, wait);
}

// 进站：40% 概率先换一条
setTimeout(() => {
  if (Math.random() < 0.4) changeSignatureNow();
}, 1600);
scheduleSignatureChange();

const sendBtn = document.getElementById('sendBtn');
if(sendBtn) sendBtn.onclick = () => { 
  const text = msgInput.value.trim(); if (!text) return; 
  sendMessage(text, 'text', true, currentQuote); 
  msgInput.value = ''; 
  currentQuote = null;
  document.getElementById('quotePreview').style.display = 'none';
  closePanels(); simulateReplyWithDelay(); 
};
const proactiveBtn = document.getElementById('proactiveBtn');
if(proactiveBtn) proactiveBtn.onclick = () => { 
  lastInteractionTime = Date.now();
  let count = chatSettings.replyCount || 1, delay = 0; 
  for (let i = 0; i < count; i++) { delay += getRandomDelay() + 1000; setTimeout(simulateReplyWithDelay, delay); } 
};
if(msgInput) msgInput.onkeydown = e => { if (e.key === 'Enter') sendBtn.click(); };

function closePanels() { const tp = document.getElementById('toolPanel'); const sp = document.getElementById('stickerPanel'); if(tp) tp.classList.remove('show'); if(sp) sp.classList.remove('show'); }
const pageChatEl = document.getElementById('pageChat');
if(pageChatEl) pageChatEl.addEventListener('click', (e) => { if (!e.target.closest('.inputbar') && !e.target.closest('.tool-panel') && !e.target.closest('.sticker-panel') && !e.target.closest('.call-widget') && !e.target.closest('.bubble')) closePanels(); });

document.addEventListener('click', (e) => {
  if (window._suppressNextClick) { window._suppressNextClick = false; return; }
  const menu = document.getElementById('bubbleMenu');
  if (menu && menu.classList.contains('show') && !menu.contains(e.target)) hideBubbleMenu();
});

(function bindBubbleMenu() {
  const quoteBtn = document.getElementById('bubbleQuoteBtn');
  const delBtn = document.getElementById('bubbleDeleteBtn');
  const cancelDel = document.getElementById('cancelDeleteBubble');
  const confirmDel = document.getElementById('confirmDeleteBubble');

  if (quoteBtn) quoteBtn.onclick = (e) => {
    e.stopPropagation();
    const ctx = bubbleMenuCtx;
    if (!ctx) return;
    startQuote(ctx.content, ctx.isMe ? chatSettings.myName : chatSettings.otherName, getQuoteDisplayText(ctx.content, ctx.type), ctx.time);
    hideBubbleMenu();
  };

  if (delBtn) delBtn.onclick = (e) => {
    e.stopPropagation();
    if (!bubbleMenuCtx) return;
    const menu = document.getElementById('bubbleMenu');
    if (menu) menu.classList.remove('show');
    document.getElementById('deleteBubbleModal').classList.add('show');
  };

  if (cancelDel) cancelDel.onclick = () => {
    document.getElementById('deleteBubbleModal').classList.remove('show');
    bubbleMenuCtx = null;
  };

  if (confirmDel) confirmDel.onclick = () => {
    const ctx = bubbleMenuCtx;
    document.getElementById('deleteBubbleModal').classList.remove('show');
    if (ctx) {
      const idx = chatHistory.findIndex(m => m.time === ctx.time && m.role === (ctx.isMe ? 'me' : 'other'));
      if (idx > -1) { chatHistory.splice(idx, 1); window.__skipHistoryMerge = true; saveAllData(); }
      if (ctx.rowEl && ctx.rowEl.parentNode) ctx.rowEl.remove();
      showToast('已删除');
    }
    bubbleMenuCtx = null;
  };
})();