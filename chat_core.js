const chatEl = document.getElementById('chat');
const msgInput = document.getElementById('msgInput');
let currentQuote = null;

function applyChatSettings() {
  const titleEl = document.getElementById('chatTitle'); if(titleEl) titleEl.textContent = chatSettings.otherName;
  if(chatEl) chatEl.style.backgroundImage = chatSettings.wallpaper ? `url(${chatSettings.wallpaper})` : 'none';
  const sigEl = document.getElementById('signatureBar'); if(sigEl) sigEl.textContent = chatSettings.signature;
}

function getTimeStr(time) { const d = new Date(time); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; }

// ===== 气泡菜单相关 =====
let bubbleMenuCtx = null;

function getQuoteDisplayText(content, type) {
  if (type === 'image') return '[图片]';
  if (type === 'redpacket') return '[红包] ' + (content.note || '');
  if (type === 'transfer') return '[转账] ¥' + (content.amount || '0.00');
  if (type === 'gift') return '[礼物] ' + (content.name || content.val || '');
  if (type === 'location') return '[位置] ' + (content.val || '');
  return (content && content.val !== undefined && content.val !== null) ? String(content.val) : '';
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

// ===== 自动接收我发出的红包/转账/礼物 =====
function autoReceiveMyCard(time) {
  const msg = chatHistory.find(m => m.time === time && m.role === 'me');
  if (!msg || !msg.content || msg.content.isOpened) return;
  msg.content.isOpened = true;
  saveAllData();

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
    if (icon) { icon.textContent = '🎀'; icon.className = 'card-icon grey'; }
    if (title) title.textContent = msg.content.name || '礼物';
    if (bottom) bottom.textContent = '已拆开';
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
  
  mAmount.style.display = 'none';
  btn.textContent = '拆开';
  
  if (type === 'redpacket') {
    mTitle.textContent = '🧧 恭喜发财';
    mIcon.textContent = '🧧';
    mName.textContent = msg.content.note || '给你发了一个红包';
    btn.onclick = () => {
      mIcon.textContent = '💰';
      mAmount.textContent = `¥${msg.content.amount || '0.00'}`;
      mAmount.style.display = 'block';
      btn.textContent = '开心收下';
      btn.onclick = () => finishOpenCard(time, type);
    };
  } else if (type === 'gift') {
    mTitle.textContent = '🎁 收到礼物';
    mIcon.textContent = '🎁';
    mName.textContent = '对方送了你一个神秘礼物';
    btn.onclick = () => {
      mIcon.textContent = '🎀';
      mName.textContent = msg.content.name || msg.content.val || '神秘礼物';
      btn.textContent = '开心收下';
      btn.onclick = () => finishOpenCard(time, type);
    };
  } else if (type === 'transfer') {
    finishOpenCard(time, type);
    return;
  }
  
  modal.classList.add('show');
}

function finishOpenCard(time, type) {
  document.getElementById('giftOpenModal').classList.remove('show');
  const msg = chatHistory.find(m => m.time === time && m.role === 'other');
  if (msg) { msg.content.isOpened = true; saveAllData(); }
  
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
    } else if (type === 'gift') {
      if (icon) { icon.textContent = '🎀'; icon.className = 'card-icon grey'; }
      if (title) title.textContent = msg.content.name || '礼物';
      if (bottom) bottom.textContent = '已拆开';
    }
  }
  showToast('已收取');
}

function addMessageDOM(content, isMe, type = 'text', time = Date.now()) {
  try {
    if(!chatEl) return;
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
      bubble.appendChild(quoteDiv);
    }

    const bodyDiv = document.createElement('div');
    if (type === 'image') {
      bubble.classList.add('img-bubble');
      const img = document.createElement('img'); img.src = content.val;
      img.onclick = () => { document.getElementById('previewImg').src = content.val; document.getElementById('imagePreviewModal').classList.add('show'); };
      bodyDiv.appendChild(img);
    } else if (type === 'pat') {
      bubble.style.background = 'transparent'; bubble.style.boxShadow = 'none'; bubble.style.fontSize = '12px'; bubble.style.color = '#888';
      bodyDiv.textContent = content.val;
    } else if (type === 'location' || type === 'redpacket' || type === 'transfer' || type === 'gift') {
      bubble.classList.add('special-card');
      if (content.isOpened) bubble.classList.add('opened');
      
      let icon = '', title = '', colorClass = '', subTitle = '';
      if(type === 'location') { icon = '📍'; title = content.val || '位置'; colorClass = 'loc'; subTitle = '位置信息'; }
      if(type === 'redpacket') { 
        icon = content.isOpened ? '🧧' : '🧧'; 
        title = content.isOpened ? `¥${content.amount || '0.00'}` : (content.note || '恭喜发财'); 
        colorClass = content.isOpened ? 'grey' : 'red'; 
        subTitle = '微信红包'; 
      }
      if(type === 'transfer') { 
        icon = content.isOpened ? '✅' : '💰'; 
        title = `¥${content.amount || '0.00'}`; 
        colorClass = content.isOpened ? 'grey' : 'trans'; 
        subTitle = content.isOpened ? '已收款' : '转账'; 
      }
      if(type === 'gift') { 
        icon = content.isOpened ? '🎀' : '🎁'; 
        title = content.isOpened ? (content.name || '礼物') : (content.name || content.val || '礼物'); 
        colorClass = content.isOpened ? 'grey' : 'red'; 
        subTitle = '礼物'; 
      }
      
      let bottomText = '';
      if (type === 'location') bottomText = '位置信息';
      else if (content.isOpened) {
        if (type === 'transfer') bottomText = '已收款';
        else if (type === 'redpacket') bottomText = '已领取';
        else if (type === 'gift') bottomText = '已拆开';
      } else if (!isMe) {
        bottomText = '点击拆开';
      } else {
        bottomText = '等待对方查看';
      }
      
      bodyDiv.innerHTML = `<div class="card-top"><div class="card-icon ${colorClass}">${icon}</div><div class="card-info"><h4>${title}</h4><p>${subTitle}</p></div></div><div class="card-bottom">${bottomText}</div>`;
      
      if (!isMe && !content.isOpened && type !== 'location') {
        bodyDiv.onclick = () => openOtherCard(time, type);
      }
    } else {
      const textVal = (content.val === undefined || content.val === null) ? '' : String(content.val);
      bodyDiv.textContent = textVal;
      if (textVal.length <= 4 && /\p{Emoji}/u.test(textVal)) { bubble.style.fontSize = '30px'; bubble.style.background = 'transparent'; bubble.style.padding = '0'; }
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
    bubble.ondblclick = () => startQuote(content, isMe ? chatSettings.myName : chatSettings.otherName, getQuoteDisplayText(content, type));

    const timeStr = document.createElement('div'); timeStr.className = 'bubble-time'; timeStr.textContent = getTimeStr(time);
    wrap.appendChild(bubble); wrap.appendChild(timeStr);
    row.appendChild(avatar); row.appendChild(wrap); chatEl.appendChild(row);
    chatEl.scrollTop = chatEl.scrollHeight;
  } catch (err) { console.error("渲染错误", err); }
}

function startQuote(contentObj, sender, text) {
  currentQuote = { sender, text };
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
  if (isMePatting) {
    setTimeout(() => { 
      const reactions = ['干嘛呀~', '嘿嘿', '怎么啦？', '戳我干嘛']; 
      sendMessage(reactions[Math.floor(Math.random() * reactions.length)], 'text', false); 
    }, 1000);
  }
}

function getRandomDelay() { return Math.floor(Math.random() * ((chatSettings.replyDelay || 1) * 60 * 1000)); }

// ===== 核心：对方随机回复逻辑（贴近真实） =====
function randomReply() {
  // 5% 的概率发送特殊卡片（红包/转账/礼物），95% 是文字
  const r = Math.random();
  if (r < 0.05) {
    const tRand = Math.random();
    let t = 'redpacket';
    if (tRand > 0.33 && tRand <= 0.66) t = 'gift';
    else if (tRand > 0.66) t = 'transfer';

    // 辅助函数：生成随机金额 (精确到 0.1)
    const getRandomAmount = (min, max) => (Math.random() * (max - min) + min).toFixed(1);
    
    // 辅助函数：生成随机备注（60% 概率为空，40% 概率有备注）
    const getRandomNote = (pool) => {
      if (Math.random() < 0.6) return ''; 
      return pool[Math.floor(Math.random() * pool.length)];
    };

    if (t === 'gift') {
      const gifts = ['一杯奶茶', '一束玫瑰', '一盒巧克力', '一个毛绒玩具', '一份夜宵'];
      const picked = gifts[Math.floor(Math.random() * gifts.length)];
      sendMessage({ name: picked, val: `送了你${picked}` }, 'gift', false);
      
    } else if (t === 'redpacket') {
      let amount = '';
      let note = '';
      
      // 彩蛋概率 3%
      if (Math.random() < 0.03) {
        const rpEggs = ['13.14', '52.00', '88.00', '99.99', '131.40', '520.00'];
        amount = rpEggs[Math.floor(Math.random() * rpEggs.length)];
        note = getRandomNote(['给你个大惊喜！', '我爱你', '遇到你真好', '拿去买点喜欢的']);
      } else {
        // 日常随机：10.0 ~ 200.0 之间
        amount = getRandomAmount(10.0, 200.0);
        note = getRandomNote(['拿去喝奶茶', '买点好吃的', '给你个小惊喜', '天天开心', '一点小心意', '买点喜欢的', '吃点好吃的']);
      }
      sendMessage({ amount, note }, 'redpacket', false);
      
    } else if (t === 'transfer') {
      let amount = '';
      let note = '';
      
      // 彩蛋概率 1%（霸总附体，极小概率触发大额）
      if (Math.random() < 0.01) {
        const transfers = [
          { amount: '520.00' },
          { amount: '888.00' },
          { amount: '1314.00' },
          { amount: '5200.00' },
          { amount: '5210.00' },
          { amount: '8888.00' },
          { amount: '52000.00' }
        ];
        const picked = transfers[Math.floor(Math.random() * transfers.length)];
        amount = picked.amount;
        note = getRandomNote(['拿去随便花', '别省着', '去买那个你一直想要的', '我爱你', '拿去买你喜欢的']);
      } else {
        // 日常随机：10.0 ~ 200.0 之间
        amount = getRandomAmount(10.0, 200.0);
        note = getRandomNote(['拿去买杯喝的', '买点喜欢的小玩意', '一点心意', '今天开心，分你一半', '吃点好吃的', '买点喜欢的', '我爱你']);
      }
      sendMessage({ amount, note }, 'transfer', false);
    }
    return;
  }

  // ===== 文字与表情包逻辑（95%） =====
  const textCards = contents.filter(item => item.type === 'text');
  const imageCards = contents.filter(item => item.type === 'image');
  
  let quote = null;
  if (Math.random() < 0.3) {
    const recentMyMsgs = chatHistory.slice(-20).filter(m => m.role === 'me' && m.type === 'text');
    if (recentMyMsgs.length > 0) {
      const target = recentMyMsgs[Math.floor(Math.random() * recentMyMsgs.length)];
      quote = { sender: chatSettings.myName, text: target.content.val };
    }
  }

  if (imageCards.length > 0 && Math.random() < 0.2) { sendMessage(imageCards[Math.floor(Math.random() * imageCards.length)].val, 'image', false, quote); return; }
  if (textCards.length === 0) { sendMessage('（字卡库是空的）', 'text', false, quote); return; }
  
  let replyText = textCards[Math.floor(Math.random() * textCards.length)].val;
  
  // Emoji 插入逻辑优化：只在末尾加，且概率降为 30%
  const emojis = contents.filter(item => item.type === 'emoji');
  if (emojis.length > 0 && Math.random() < 0.3) {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)].val;
    replyText = replyText + ' ' + randomEmoji; // 只加在后面
  }
  
  sendMessage(replyText, 'text', false, quote);
}

setInterval(() => {
  if (chatSettings.autoReplyTime > 0) {
    const now = Date.now();
    if (now - lastInteractionTime > chatSettings.autoReplyTime * 60 * 1000) {
      lastInteractionTime = now;
      let count = chatSettings.autoReplyCount || 1;
      for(let i=0; i<count; i++) { setTimeout(() => { randomReply(); }, i * 1500); }
    }
  }
}, 5000); 

setInterval(() => {
  if (signatureLibrary.length > 0) {
    const now = Date.now();
    if (now - lastSigUpdate > chatSettings.sigTimer * 60 * 1000) {
      chatSettings.signature = signatureLibrary[Math.floor(Math.random() * signatureLibrary.length)].val;
      lastSigUpdate = now; saveAllData(); applyChatSettings();
    }
  }
}, 10000);

const sendBtn = document.getElementById('sendBtn');
if(sendBtn) sendBtn.onclick = () => { 
  const text = msgInput.value.trim(); if (!text) return; 
  sendMessage(text, 'text', true, currentQuote); 
  msgInput.value = ''; 
  currentQuote = null;
  document.getElementById('quotePreview').style.display = 'none';
  closePanels(); setTimeout(randomReply, getRandomDelay()); 
};
const proactiveBtn = document.getElementById('proactiveBtn');
if(proactiveBtn) proactiveBtn.onclick = () => { 
  lastInteractionTime = Date.now();
  let count = chatSettings.replyCount || 1, delay = 0; 
  for (let i = 0; i < count; i++) { delay += getRandomDelay() + 1000; setTimeout(randomReply, delay); } 
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
    startQuote(ctx.content, ctx.isMe ? chatSettings.myName : chatSettings.otherName, getQuoteDisplayText(ctx.content, ctx.type));
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