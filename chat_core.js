const chatEl = document.getElementById('chat');
const msgInput = document.getElementById('msgInput');
let currentQuote = null;
let isTyping = false; // 正在输入状态

function applyChatSettings() {
  const titleEl = document.getElementById('chatTitle'); if(titleEl) titleEl.textContent = chatSettings.otherName;
  // 壁纸挂在整页上：播放器/工具面板开合只推动气泡，背景不会跟着放大缩小
  const pageEl = document.getElementById('pageChat');
  if (pageEl) pageEl.style.backgroundImage = chatSettings.wallpaper ? `url(${chatSettings.wallpaper})` : 'none';
  if (chatEl) chatEl.style.backgroundImage = 'none';
  const sigEl = document.getElementById('signatureBar'); if(sigEl) sigEl.textContent = chatSettings.signature;
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

// ===== 气泡菜单相关 =====
let bubbleMenuCtx = null;

function getQuoteDisplayText(content, type) {
  if (type === 'image') return '[图片]';
  if (type === 'redpacket') return '[红包] ' + (content.note || '');
  if (type === 'musicshare') return '[歌曲] ' + (content.name || '');
  if (type === 'musicinvite') return '[一起听歌] ' + (content.name || '');
  if (type === 'transfer') return '[转账] ¥' + (content.amount || '0.00');
  if (type === 'gift') return '[礼物] ' + (content.name || content.val || '');
  if (type === 'interact') return '[互动] ' + (content.name || '');
  if (type === 'location') return '[位置] ' + (content.val || '');
  if (type === 'audio') return '[语音]';
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
  const msg = chatHistory.find(m => m.time === time && m.role === 'me');
  if (!msg || !msg.content || msg.content.isOpened) return;
  msg.content.isOpened = true;
  saveAllData();
  if (typeof refreshMood === 'function') refreshMood();

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
      if (title && typeof playSongByTitle === 'function') playSongByTitle(title);
    };
  }
  
  modal.classList.add('show');
}

function finishOpenCard(time, type) {
  document.getElementById('giftOpenModal').classList.remove('show');
  const msg = chatHistory.find(m => m.time === time && m.role === 'other');
  if (msg) { msg.content.isOpened = true; saveAllData(); }
  if (typeof refreshMood === 'function') refreshMood();
  
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

// 语音消息播放
let _voiceAudio = null;
function playVoice(el, src) {
  if (_voiceAudio) { try { _voiceAudio.pause(); } catch (e) {} _voiceAudio = null; }
  const icon = el.querySelector('.voice-play');
  if (icon) icon.textContent = '▶';
  if (!src) return;
  const audio = new Audio(src);
  _voiceAudio = audio;
  if (icon) icon.textContent = '⏸';
  audio.onended = () => { if (icon) icon.textContent = '▶'; };
  audio.onerror = () => { if (icon) icon.textContent = '▶'; showToast('这段语音放不出来'); };
  const p = audio.play();
  if (p && p.catch) p.catch(() => { if (icon) icon.textContent = '▶'; });
}

function addMessageDOM(content, isMe, type = 'text', time = Date.now()) {
  try {
    if(!chatEl) return;
    // 系统提示（通话记录、拍一拍这类）：居中的灰色小字，不做成气泡
    if (type === 'sys') {
      const sys = document.createElement('div');
      sys.className = 'sys';
      sys.textContent = (content && content.val != null) ? content.val : '';
      chatEl.appendChild(sys);
      chatEl.scrollTop = chatEl.scrollHeight;
      return;
    }
    const row = document.createElement('div'); row.className = 'row' + (isMe ? ' me' : '');
    const avatar = document.createElement('div'); avatar.className = 'avatar ' + (isMe ? 'me' : 'other');
    const avatarUrl = isMe ? chatSettings.myAvatar : chatSettings.otherAvatar;
    if (avatarUrl) { avatar.innerHTML = `<img src="${avatarUrl}">`; } 
    else { avatar.textContent = isMe ? chatSettings.myName.charAt(0) : chatSettings.otherName.charAt(0); }
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
      const img = document.createElement('img'); img.src = content.val;
      img.onclick = () => { document.getElementById('previewImg').src = content.val; document.getElementById('imagePreviewModal').classList.add('show'); };
      bodyDiv.appendChild(img);
    } else if (type === 'audio') {
      bubble.classList.add('voice-bubble');
      const dur = Math.max(1, Math.round(content.dur || 0));
      bodyDiv.className = 'voice-body';
      bodyDiv.innerHTML = `<span class="voice-play">▶</span><span class="voice-wave">${'<i></i>'.repeat(5)}</span><span class="voice-dur">${dur}″</span>`;
      bodyDiv.onclick = (e) => { e.stopPropagation(); playVoice(bodyDiv, content.val); };
    } else if (type === 'pat') {
      bubble.style.background = 'transparent'; bubble.style.boxShadow = 'none'; bubble.style.fontSize = '12px'; bubble.style.color = '#888';
      bodyDiv.textContent = content.val;
    } else if (type === 'location' || type === 'redpacket' || type === 'transfer' || type === 'gift' || type === 'interact' || type === 'musicshare' || type === 'musicinvite') {
      bubble.classList.add('special-card');
      if (content.isOpened) bubble.classList.add('opened');
      
      let icon = '', title = '', colorClass = '', subTitle = '';
      if(type === 'location') { icon = '📍'; title = content.val || '位置'; colorClass = 'loc'; subTitle = '位置信息'; }
      if(type === 'redpacket') { 
        icon = content.isOpened ? '🧧' : '🧧'; 
        title = content.isOpened ? `¥${content.amount || '0.00'}` : (content.note || '恭喜发财'); 
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
        colorClass = content.isOpened ? 'grey' : 'red';
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
      
      let bottomText = '';
      if (type === 'location') bottomText = '位置信息';
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

      // 推荐歌曲：卡片里带一句他说的话
      if (type === 'musicshare' && content.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'card-note';
        noteEl.textContent = content.note;
        const bottom = bodyDiv.querySelector('.card-bottom');
        if (bottom) bodyDiv.insertBefore(noteEl, bottom); else bodyDiv.appendChild(noteEl);
      }

      if (type === 'musicshare') {
        bodyDiv.onclick = () => { if (typeof playSongByTitle === 'function') playSongByTitle(content.name); };
      } else if (!isMe && !content.isOpened && type !== 'location') {
        bodyDiv.onclick = () => openOtherCard(time, type);
      }
    } else {
      const textVal = (content.val === undefined || content.val === null) ? '' : String(content.val);
      bodyDiv.textContent = textVal;
      
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
    wrap.appendChild(bubble); wrap.appendChild(timeStr);
    row.appendChild(avatar); row.appendChild(wrap); chatEl.appendChild(row);
    chatEl.scrollTop = chatEl.scrollHeight;
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

function sendMessage(val, type = 'text', isMe = true, customQuote = null) {
  const time = Date.now();
  const isObj = val && typeof val === 'object';
  const content = isObj
    ? Object.assign({}, val, { val: val.val !== undefined ? val.val : '', isOpened: !!val.isOpened, quote: customQuote })
    : { val, isOpened: false, quote: customQuote };
  if (isObj && content.val === '' && content.name) content.val = content.name;
  addMessageDOM(content, isMe, type, time);
  chatHistory.push({ role: isMe ? 'me' : 'other', type, content, time });
  saveAllData();
  lastInteractionTime = Date.now();
  if (typeof refreshMood === 'function') refreshMood();

  // 音效：收发消息一声轻响；他发来红包/礼物/转账换成两声铃
  if (isMe) {
    if (typeof playSfx === 'function') playSfx('send');
  } else if ((type === 'redpacket' || type === 'gift' || type === 'transfer') && typeof playReceiveChime === 'function') {
    playReceiveChime();
  } else {
    if (typeof playSfx === 'function') playSfx('send');
  }

  // 两边的语气都可能影响他的心情；只是"可能"，每次都重新掷概率
  if (type === 'text' && typeof analyzeMoodFromText === 'function') analyzeMoodFromText(content.val, isMe);

  if (isMe && (type === 'redpacket' || type === 'transfer' || type === 'gift' || type === 'interact')) {
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
  if (isMePatting) {
    setTimeout(() => { 
      const reactions = ['干嘛呀~', '嘿嘿', '怎么啦？', '戳我干嘛', '我在呢']; 
      sendMessage(reactions[Math.floor(Math.random()*reactions.length)], 'text', false); 
    }, 1000);
  }
}

function getRandomDelay() { return Math.floor(Math.random() * ((chatSettings.replyDelay || 1) * 60 * 1000)); }

function showTypingIndicator() {
  if(!chatEl) return;
  if (document.getElementById('typingIndicator')) return;
  const row = document.createElement('div');
  row.id = 'typingIndicator';
  row.className = 'row';
  const avatar = document.createElement('div'); avatar.className = 'avatar other';
  if (chatSettings.otherAvatar) avatar.innerHTML = `<img src="${chatSettings.otherAvatar}">`;
  else avatar.textContent = chatSettings.otherName.charAt(0);
  const wrap = document.createElement('div'); wrap.className = 'bubble-wrap';
  const bubble = document.createElement('div'); bubble.className = 'bubble typing-bubble';
  const label = document.createElement('span'); label.className = 'typing-label'; label.textContent = `${chatSettings.otherName} 正在输入`;
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

function randomReply() {
  // 新增 10% 概率触发拍一拍
  if (Math.random() < 0.1) {
    triggerPat(false);
    return;
  }

  // 他偶尔会分享一首歌，或者邀请你一起听
  if (Math.random() < 0.07 && typeof pickRandomSong === 'function') {
    const song = pickRandomSong();
    if (song) {
      if (Math.random() < 0.5) {
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
  if (r < 0.05) {
    const types = ['gift', 'redpacket', 'transfer'];
    const t = types[Math.floor(Math.random() * types.length)];
    
    // 对方随机送礼：直接读商城礼物库
    if (t === 'gift') {
      const all = (typeof GIFT_ITEMS !== 'undefined') ? GIFT_ITEMS : [];
      if (all.length > 0) {
        const g = all[Math.floor(Math.random() * all.length)];
        sendMessage({ name: g.name, icon: g.icon, price: g.price, val: `送了你${g.name}` }, 'gift', false);
      } else {
        sendMessage({ name: '神秘礼物', val: '送了你神秘礼物' }, 'gift', false);
      }
    }
    else if (t === 'redpacket') sendMessage({ amount: '52.00', note: '给你个小红包' }, 'redpacket', false);
    else if (t === 'transfer') sendMessage({ amount: '520.00', note: '拿去花' }, 'transfer', false);
    return;
  }

  const textCards = contents.filter(item => item.type === 'text');
  const imageCards = contents.filter(item => item.type === 'image');
  
  let quote = null;
  if (Math.random() < 0.3) {
    const recentMyMsgs = chatHistory.slice(-20).filter(m => m.role === 'me' && m.type === 'text');
    if (recentMyMsgs.length > 0) {
      const target = recentMyMsgs[Math.floor(Math.random() * recentMyMsgs.length)];
      quote = { sender: chatSettings.myName, text: target.content.val, time: target.time };
    }
  }

  if (imageCards.length > 0 && Math.random() < 0.2) { sendMessage(imageCards[Math.floor(Math.random() * imageCards.length)].val, 'image', false, quote); return; }
  if (textCards.length === 0) { sendMessage('（字卡库是空的）', 'text', false, quote); return; }
  
  let replyText = textCards[Math.floor(Math.random() * textCards.length)].val;
  
  const emojis = contents.filter(item => item.type === 'emoji');
  if (emojis.length > 0 && Math.random() < 0.3) {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)].val;
    replyText = replyText + ' ' + randomEmoji; 
  }
  
  sendMessage(replyText, 'text', false, quote);
}

// 处理正在输入的延迟
function simulateReplyWithDelay() {
  // 对方离线时：隔一阵才回来，并先回一句离线自动回复
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
    const extra = 90000 + Math.random() * 150000;
    setTimeout(() => {
      if (typeof setOtherOnline === 'function') setOtherOnline();
      const lines = (typeof offlineReplyLines !== 'undefined' && offlineReplyLines.length) ? offlineReplyLines : ['刚看到消息！怎么啦'];
      sendMessage(lines[Math.floor(Math.random() * lines.length)], 'text', false);
      setTimeout(randomReply, 1200 + Math.random() * 1500);
    }, extra);
    return;
  }
  const delay = getRandomDelay();
  const typingOn = chatSettings.showTyping !== false;
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

setInterval(() => {
  if (signatureLibrary.length > 0) {
    // 50% 概率触发签名更新
    if (Math.random() < 0.5) {
      chatSettings.signature = signatureLibrary[Math.floor(Math.random() * signatureLibrary.length)].val;
      saveAllData(); applyChatSettings();
    }
  }
}, (chatSettings.sigTimer || 5) * 60000); // 按照设置里的分钟数执行，每次有 50% 概率变

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
      if (idx > -1) { chatHistory.splice(idx, 1); saveAllData(); }
      if (ctx.rowEl && ctx.rowEl.parentNode) ctx.rowEl.remove();
      showToast('已删除');
    }
    bubbleMenuCtx = null;
  };
})();