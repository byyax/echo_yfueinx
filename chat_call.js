let callTimer = null, callSeconds = 0, callTimeout = null;
let callDirection = 'out'; // 'in' = 他打给我, 'out' = 我打给他
const callWidget = document.getElementById('callWidget');
const callLargeView = document.getElementById('callLargeView');
const callSmallView = document.getElementById('callSmallView');
const appContainer = document.getElementById('appContainer');

const callAvatar = document.getElementById('callAvatar');
const callAvatarSmall = document.getElementById('callAvatarSmall');
const callNameLarge = document.getElementById('callNameLarge');
const callNameSmall = document.getElementById('callNameSmall');
const callStatusLarge = document.getElementById('callStatusLarge');
const callTimeLarge = document.getElementById('callTimeLarge');
const callTimeSmall = document.getElementById('callTimeSmall');

const incomingActions = document.getElementById('incomingActions');
const callMuteBtn = document.getElementById('callMuteBtn');
const callVideoBtn = document.getElementById('callVideoBtn');
const callHangupBtn = document.getElementById('callHangupBtn');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');

// 铃声 / 接通挂断音：走 chat_sound.js 的 audio 文件
function playRingtone() {
  if (typeof playSfx === 'function') playSfx('callRequest');
}
function stopRingtone() {
  if (typeof stopSfx === 'function') stopSfx('callRequest');
}
function playCallTone() {
  if (typeof playSfx === 'function') playSfx('callTone');
}

function resetSmallViewPosition() {
  if (!callSmallView) return;
  callSmallView.className = 'call-small-view';
  callSmallView.style.right = '20px';
  callSmallView.style.bottom = '80px';
  callSmallView.style.left = 'auto';
  callSmallView.style.top = 'auto';
  callSmallView.style.transform = 'translate(0, 0)';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// ===== 通话后的混合回复 =====
// 字卡概率：未接/挂断 40%（60% 内置），通话结束/取消 50%。
// 字卡库为空时自动退回内置句子。
const CALL_REPLY_LINES = {
  missed_in: [
    '怎么没接电话呀',
    '在忙吗？看到回我一下',
    '刚刚给你打电话了',
    '手机没在身边吗',
    '方便的时候回拨给我'
  ],
  missed_out: [
    '刚才在忙，没接到',
    '手机放远了，抱歉',
    '看到未接来电了，怎么啦',
    '刚刚不方便接，现在可以',
    '我错过了什么吗'
  ],
  rejected_other: [
    '刚刚不方便接',
    '在忙，晚点打给你',
    '怎么啦，突然打电话',
    '现在有点事，稍后说',
    '嗯？找我'
  ],
  rejected_me: [
    '怎么挂啦',
    '不方便接吗',
    '在忙的话跟我说一声',
    '刚想跟你说点事',
    '好吧，那晚点再说'
  ],
  completed: [
    '刚挂就开始想你了',
    '刚才好像没说够',
    '下次再聊一会儿',
    '听到你声音就安心了',
    '挂得有点快'
  ],
  cancelled: [
    '怎么取消了',
    '还没接通就挂啦',
    '是不方便吗',
    '有事的话直接说',
    '我还在呢'
  ]
};
const CALL_REPLY_CARD_RATE = {
  missed_in: 0.4,
  missed_out: 0.4,
  rejected_other: 0.4,
  rejected_me: 0.4,
  completed: 0.5,
  cancelled: 0.5
};
const CALL_REPLY_EMOJI = ['😌', '🥺', '😭', '😶', '😔', '🙂'];

function scheduleCallReply(stateKey) {
  const pool = CALL_REPLY_LINES[stateKey];
  if (!pool || !pool.length) return;
  const delay = 1400 + Math.random() * 2200;
  setTimeout(() => {
    const cardRate = CALL_REPLY_CARD_RATE[stateKey] == null ? 0.4 : CALL_REPLY_CARD_RATE[stateKey];
    if (typeof sendRandomTextCardReply === 'function' && Math.random() < cardRate) {
      if (sendRandomTextCardReply({ quoteChance: 0.05 })) return;
    }
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (Math.random() < 0.42) {
      line += ' ' + CALL_REPLY_EMOJI[Math.floor(Math.random() * CALL_REPLY_EMOJI.length)];
    }
    if (typeof sendMessage === 'function') sendMessage(line, 'text', false);
  }, delay);
}

function startCallTimer() {
  callSeconds = 0;
  callTimeLarge.style.display = 'block';
  callTimeLarge.textContent = '00:00';
  callTimeSmall.textContent = '00:00';
  if (callTimer) clearInterval(callTimer);
  callTimer = setInterval(() => {
    callSeconds++; 
    const timeStr = formatDuration(callSeconds);
    callTimeLarge.textContent = timeStr; 
    callTimeSmall.textContent = timeStr;
  }, 1000);
}

function initCallUI(isIncoming) {
  const callAv = chatSettings.otherAvatar || 'icons/icon-heart-192.png';
  callAvatar.src = callAv;
  callAvatarSmall.src = callAv;
  [callAvatar, callAvatarSmall].forEach(el => {
    if (!el) return;
    el.classList.toggle('default-heart-avatar', !chatSettings.otherAvatar);
  });
  callNameLarge.textContent = chatSettings.otherName;
  callNameSmall.textContent = chatSettings.otherName;
  
  callLargeView.style.display = 'flex';
  callSmallView.style.display = 'none';
  resetSmallViewPosition();
  
  callMuteBtn.style.visibility = 'hidden';
  callVideoBtn.style.visibility = 'hidden';
  callTimeLarge.style.display = 'none';
  
  if (isIncoming) {
    callStatusLarge.textContent = '邀请你语音通话...';
    callHangupBtn.style.display = 'none';
    incomingActions.style.display = 'flex';
  } else {
    callStatusLarge.textContent = '正在呼叫...';
    callHangupBtn.style.display = 'flex';
    incomingActions.style.display = 'none';
  }
}

function endCall(state, who) {
  if (callTimer) clearInterval(callTimer);
  if (callTimeout) clearTimeout(callTimeout);
  stopRingtone();
  if (state === 'completed' || state === 'cancelled') playCallTone();

  callWidget.style.display = 'none';
  resetSmallViewPosition();
  
  // 通话记录用气泡呈现（更有存在感，跟微信一致）
  // 五种主要情况：他打给我未接 / 我打给他未接 / 他挂断我的 / 我挂断他的 / 通话结束
  let bubbleText = '', bubbleIsMe = null, callStateKey = '';
  if (state === 'completed') {
    bubbleText = `通话结束 ${formatDuration(callSeconds)}`;
    bubbleIsMe = (callDirection === 'in'); // 他打给我 -> 我是被叫 -> 我这边发
    callStateKey = 'completed';
  } else if (state === 'rejected') {
    if (who === 'me') {
      bubbleText = '已挂断';                 // 他打给我，我没接就挂了
      callStateKey = 'rejected_me';
    } else {
      bubbleText = '对方已挂断';             // 我打给他，他没接就挂了
      callStateKey = 'rejected_other';
    }
    bubbleIsMe = (who === 'me');
  } else if (state === 'cancelled') {
    bubbleText = '已取消';
    bubbleIsMe = (who === 'me');
    callStateKey = 'cancelled';
  } else if (state === 'unanswered') {
    if (callDirection === 'in') {
      bubbleText = '未接来电';               // 他打给我，铃声响完我没接
      bubbleIsMe = true;
      callStateKey = 'missed_in';
    } else {
      bubbleText = '对方未接来电';           // 我打给他，铃声响完他没接
      bubbleIsMe = false;
      callStateKey = 'missed_out';
    }
  }

  if (bubbleText) {
    const time = Date.now();
    const content = { val: bubbleText, callState: callStateKey };
    chatHistory.push({ role: bubbleIsMe ? 'me' : 'other', type: 'call', content, time });
    saveAllData();
    addMessageDOM(content, bubbleIsMe, 'call', time);
    lastInteractionTime = Date.now();
  }

  // 这通电话也会影响他的心情
  if (typeof moodAfterCall === 'function') moodAfterCall(state, who);
  // 通话记录本身也是“最后一条消息”：没有事件情绪时，普通情绪按规则收起
  if (typeof refreshMood === 'function') refreshMood(false);

  // 电话之后，他有一条混合回复：内置句子或字卡库
  if (callStateKey) scheduleCallReply(callStateKey);
}

// 发起通话（我打给他）
const toolCall = document.getElementById('toolCall');
if(toolCall) toolCall.onclick = () => {
  closePanels(); 
  callDirection = 'out';
  callWidget.style.display = 'flex';
  initCallUI(false);
  playRingtone();

  // 等待对方接通：15% 在忙接不到，10% 拒接，其余接通
  const roll = Math.random();
  const isBusy = roll < 0.15;
  const willReject = !isBusy && roll < 0.25;
  const waitMs = 2500 + Math.random() * 3000;
  callTimeout = setTimeout(() => {
    if (callWidget.style.display !== 'flex') return;
    if (isBusy) { endCall('unanswered', 'other'); return; }
    if (willReject) { endCall('rejected', 'other'); return; }
    stopRingtone();
    playCallTone();
    callStatusLarge.textContent = '通话中...';
    callTimeLarge.style.display = 'block';
    callMuteBtn.style.visibility = 'visible';
    callVideoBtn.style.visibility = 'visible';
    startCallTimer();
  }, waitMs);
};

// 触发来电（对方打给我）
function triggerIncomingCall() {
  if (callWidget.style.display === 'flex') return; // 正在通话中不触发
  callDirection = 'in';
  callWidget.style.display = 'flex';
  initCallUI(true);
  playRingtone();
  
  // 30秒没人接就自动挂断
  callTimeout = setTimeout(() => {
    if (callWidget.style.display === 'flex' && incomingActions.style.display !== 'none') {
      endCall('unanswered', 'other');
    }
  }, 30000);
}

// 随机来电：每 5 分钟掷一次 4% 概率（平均 2 小时左右一次）
setInterval(() => {
  if (Math.random() < 0.04) triggerIncomingCall();
}, 5 * 60 * 1000);

// 接听按钮
if(acceptCallBtn) acceptCallBtn.onclick = () => {
  stopRingtone();
  playCallTone();
  if (callTimeout) clearTimeout(callTimeout);
  incomingActions.style.display = 'none';
  callHangupBtn.style.display = 'flex';
  callStatusLarge.textContent = '通话中...';
  callTimeLarge.style.display = 'block';
  callMuteBtn.style.visibility = 'visible';
  callVideoBtn.style.visibility = 'visible';
  startCallTimer();
};

// 拒接按钮
if(rejectCallBtn) rejectCallBtn.onclick = () => {
  endCall('rejected', 'me');
};

// 挂断按钮（通用）
if(callHangupBtn) callHangupBtn.onclick = () => {
  if (callTimeLarge.style.display === 'none') {
    endCall('cancelled', 'me'); // 还没接通就挂了
  } else {
    endCall('completed', 'me'); // 通话中挂了
  }
};

// 大小窗切换
const minimizeBtn = document.getElementById('callMinimizeBtn');
if (minimizeBtn) {
  minimizeBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    callLargeView.style.display = 'none';
    callSmallView.style.display = 'flex';
    callSmallView.style.cssText = 'display: flex !important; position: absolute !important; right: 20px !important; bottom: 80px !important; left: auto !important; top: auto !important; transform: translate(0, 0) !important; z-index: 99999 !important;';
  });
}

const maximizeBtn = document.getElementById('callMaximizeBtn');
if (maximizeBtn) {
  maximizeBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    callLargeView.style.display = 'flex';
    callSmallView.style.display = 'none';
    resetSmallViewPosition();
  });
}

const hangupSmallBtn = document.getElementById('callHangupSmallBtn');
if (hangupSmallBtn) hangupSmallBtn.onclick = () => {
  if (callTimeLarge.style.display === 'none') endCall('cancelled', 'me');
  else endCall('completed', 'me');
};

// 拖拽逻辑
let isDraggingCall = false, startX = 0, startY = 0, callMovedDist = 0;
const pipDragArea = document.querySelector('.pip-drag-area');

if(pipDragArea) {
  pipDragArea.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.small-btn')) return;
    isDraggingCall = true;
    callMovedDist = 0;
    startX = e.clientX; startY = e.clientY;
    const rect = callSmallView.getBoundingClientRect();
    const appRect = appContainer.getBoundingClientRect();
    
    callSmallView.style.right = 'auto'; callSmallView.style.bottom = 'auto';
    callSmallView.style.left = (rect.left - appRect.left) + 'px'; 
    callSmallView.style.top = (rect.top - appRect.top) + 'px';
    callSmallView.style.transition = 'none';
    
    pipDragArea.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none'; 
    document.body.style.touchAction = 'none'; 
  });

  pipDragArea.addEventListener('pointermove', (e) => {
    if (!isDraggingCall) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    callMovedDist += Math.abs(dx) + Math.abs(dy);
    startX = e.clientX; startY = e.clientY;
    
    let newLeft = callSmallView.offsetLeft + dx;
    let newTop = callSmallView.offsetTop + dy;
    
    const appW = appContainer.clientWidth;
    const appH = appContainer.clientHeight;
    const winW = callSmallView.offsetWidth;
    const winH = callSmallView.offsetHeight;
    
    newLeft = Math.max(10, Math.min(newLeft, appW - winW - 10));
    newTop = Math.max(10, Math.min(newTop, appH - winH - 10));
    
    callSmallView.style.left = newLeft + 'px'; 
    callSmallView.style.top = newTop + 'px';
  });

  pipDragArea.addEventListener('pointerup', (e) => {
    if (!isDraggingCall) return;
    isDraggingCall = false;
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
    pipDragArea.releasePointerCapture(e.pointerId);
    
    const appW = appContainer.clientWidth;

    // 单击（几乎没拖动）：椭圆<->头像球 形态切换，与贴边吸附同速同曲线
    if (callMovedDist < 6) {
      callSmallView.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
      const isSnapped = callSmallView.classList.contains('snap-left') || callSmallView.classList.contains('snap-right');
      if (isSnapped) {
        const wasRight = callSmallView.classList.contains('snap-right');
        callSmallView.classList.remove('snap-left', 'snap-right');
        const pillW = 178;
        let newLeft = wasRight ? appW - pillW - 20 : 20;
        newLeft = Math.max(10, Math.min(newLeft, appW - pillW - 10));
        callSmallView.style.left = newLeft + 'px';
        const appH = appContainer.clientHeight;
        callSmallView.style.top = Math.max(10, Math.min(callSmallView.offsetTop, appH - callSmallView.offsetHeight - 10)) + 'px';
      } else {
        const curLeft = callSmallView.offsetLeft;
        if (curLeft + 89 < appW / 2) { callSmallView.style.left = '0px'; callSmallView.classList.add('snap-left'); }
        else { callSmallView.style.left = (appW - 56) + 'px'; callSmallView.classList.add('snap-right'); }
      }
      return;
    }

    callSmallView.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    const currentLeft = callSmallView.offsetLeft;
    
    // 吸附逻辑
    if (currentLeft < 30) { 
      callSmallView.style.left = '0px'; 
      callSmallView.classList.add('snap-left');
    } 
    else if (currentLeft + callSmallView.offsetWidth > appW - 30) { 
      callSmallView.style.left = (appW - 56) + 'px'; // 56是宽度
      callSmallView.classList.add('snap-right');
    } 
    else { 
      callSmallView.classList.remove('snap-left', 'snap-right');
    }
  });
  
  pipDragArea.addEventListener('pointercancel', () => {
    isDraggingCall = false;
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
  });
}

// 静音/摄像头
if (callMuteBtn) callMuteBtn.onclick = () => {
  const on = callMuteBtn.classList.toggle('on');
  const icon = callMuteBtn.querySelector('.ctrl-icon');
  const label = callMuteBtn.querySelector('span');
  if (icon) icon.textContent = on ? '🔇' : '🎤';
  if (label) label.textContent = on ? '取消静音' : '静音';
};
if (callVideoBtn) callVideoBtn.onclick = () => {
  const on = callVideoBtn.classList.toggle('on');
  const icon = callVideoBtn.querySelector('.ctrl-icon');
  const label = callVideoBtn.querySelector('span');
  if (icon) icon.textContent = on ? '🎥' : '📷';
  if (label) label.textContent = on ? '关闭摄像头' : '摄像头';
};