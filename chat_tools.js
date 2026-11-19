// 加号面板：两页，横向滑动；电脑滚轮翻页，底部两个小点可点
(function initToolPager() {
  const pager = document.getElementById('toolPager');
  const dots = Array.from(document.querySelectorAll('#toolDots i'));
  if (!pager || !dots.length) return;
  let page = 0;
  let wheelLock = 0;

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle('active', i === page));
  }
  function goTo(i, smooth) {
    page = Math.max(0, Math.min(dots.length - 1, i));
    const left = page * pager.clientWidth;
    if (smooth && pager.scrollTo) pager.scrollTo({ left, behavior: 'smooth' });
    else pager.scrollLeft = left;
    updateDots();
  }

  pager.addEventListener('scroll', () => {
    if (!pager.clientWidth) return;
    const i = Math.round(pager.scrollLeft / pager.clientWidth);
    if (i !== page && i >= 0 && i < dots.length) { page = i; updateDots(); }
  }, { passive: true });
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i, true)));
  pager.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const now = Date.now();
    if (now - wheelLock < 450) return;
    wheelLock = now;
    goTo(page + (e.deltaY > 0 ? 1 : -1), true);
  }, { passive: false });

  const plusBtn = document.getElementById('plusBtn');
  if (plusBtn) plusBtn.addEventListener('click', () => setTimeout(() => goTo(page, false), 320));
  window.addEventListener('resize', () => { if (pager.clientWidth) goTo(page, false); });
})();

const toolImg = document.getElementById('toolImg');
if(toolImg) toolImg.onclick = () => document.getElementById('imageInput').click();

const imgInput = document.getElementById('imageInput');
if(imgInput) imgInput.onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  compressImage(file, 800).then(base64 => { if (!base64) return showToast('这张动图太大啦，发不出去'); sendMessage(base64, 'image', true); closePanels(); setTimeout(randomReply, getRandomDelay()); });
  e.target.value = '';
};

// 拍照：手机上会直接调相机，电脑上退回选文件
const toolCamera = document.getElementById('toolCamera');
const cameraInput = document.getElementById('cameraInput');
if (toolCamera && cameraInput) {
  toolCamera.onclick = () => { closePanels(); cameraInput.click(); };
  cameraInput.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    compressImage(file, 900).then(base64 => {
      if (!base64) return showToast('这张照片太大啦，换个角度再拍');
      sendMessage(base64, 'image', true);
      setTimeout(randomReply, getRandomDelay());
    });
    e.target.value = '';
  };
}

const toolLoc = document.getElementById('toolLoc');
if(toolLoc) toolLoc.onclick = () => { 
  closePanels(); if(locLibrary.length === 0) return showToast('位置库是空的');
  sendMessage('你在哪呀？', 'text', true);
  setTimeout(() => {
    const sendLocation = () => {
      const loc = locLibrary[Math.floor(Math.random() * locLibrary.length)];
      sendMessage(loc.val, 'location', false);
    };
    if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
      if (typeof noteOfflineNudge === 'function') noteOfflineNudge(1);
      if (typeof scheduleOfflineReturn === 'function') scheduleOfflineReturn();
    }
    const waitOnline = (typeof whenOtherOnline === 'function') ? whenOtherOnline : (cb => cb());
    waitOnline(sendLocation);
  }, getRandomDelay());
};

// 双击头像仍是原来的拍一拍；这里加号面板的“互动”弹出肢体互动选择
const toolPat = document.getElementById('toolPat');
if(toolPat) toolPat.onclick = () => {
  closePanels();
  renderInteractGrid();
  const modal = document.getElementById('interactModal');
  if (modal) modal.classList.add('show');
};

function renderInteractGrid() {
  const grid = document.getElementById('interactGrid');
  if (!grid) return;
  grid.innerHTML = '';
  interactLibrary.forEach(it => {
    const card = document.createElement('div');
    card.className = 'interact-card';
    card.innerHTML = `<div class="it-icon">${it.icon}</div><div class="it-name">${it.name}</div><div class="it-hint">发送互动请求</div>`;
    card.onclick = () => {
      document.getElementById('interactModal').classList.remove('show');
      sendInteract(it);
    };
    grid.appendChild(card);
  });
}

// 老数据没有 replies 字段时的兜底
const REPLY_FALLBACK = {
  '摸摸头': ['嘿嘿，被你摸到啦~', '再摸一会儿', '头交给你了'],
  '戳戳脸': ['别戳啦，痒~', '轻一点啦', '脸都被你戳软了'],
  '抱抱': ['（一把抱住你）', '抱紧点', '再抱一会儿'],
  '贴贴': ['（凑过来贴贴）', '再贴一会儿', '别嫌我黏'],
  '捏捏脸': ['哎呀脸都要捏红啦', '手下留情', '再捏就变形了'],
  '举高高': ['哇——飞起来啦！', '再来一次', '放我下来啦']
};

function markMyInteractAccepted(msg) {
  // 离线时绝不接受；调用方会继续等上线。
  if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') return false;
  if (!msg || !msg.content) return false;
  msg.content.isOpened = true;
  saveAllData();
  const bubble = document.querySelector(`.bubble[data-msg-time="${msg.time}"]`);
  if (bubble) {
    bubble.classList.add('opened');
    const icon = bubble.querySelector('.card-icon');
    const subtitle = bubble.querySelector('.card-info p');
    const bottom = bubble.querySelector('.card-bottom');
    if (icon) icon.className = 'card-icon grey';
    if (subtitle) subtitle.textContent = '已接受';
    if (bottom) bottom.textContent = '已接受';
  }
  return true;
}

function finishMyInteraction(msg, it) {
  if (!markMyInteractAccepted(msg)) {
    const waitOnline = (typeof whenOtherOnline === 'function') ? whenOtherOnline : (cb => cb());
    waitOnline(() => finishMyInteraction(msg, it));
    return;
  }
  if (!it) return;
  if (Math.random() < HYBRID_INTERACT_CARD_RATE && typeof sendRandomTextCardReply === 'function'
    && sendRandomTextCardReply({ quoteChance: 0.15 })) return;
  const pool = (it.replies && it.replies.length) ? it.replies : REPLY_FALLBACK[it.name];
  const text = (pool && pool.length)
    ? pool[Math.floor(Math.random() * pool.length)]
    : `（接受了你的${it.name}）`;
  sendMessage(text, 'text', false);
}

function sendInteract(it) {
  sendMessage({ name: it.name, icon: it.icon, val: `想${it.name}`, isOpened: false, interact: true }, 'interact', true);
  const sent = chatHistory[chatHistory.length - 1];
  // 对方离线时先不回应，等上线后再接受；同时会略微提高上线概率。
  setTimeout(() => {
    if (typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线') {
      if (typeof noteOfflineNudge === 'function') noteOfflineNudge(2);
      if (typeof scheduleOfflineReturn === 'function') scheduleOfflineReturn();
    }
    const waitOnline = (typeof whenOtherOnline === 'function') ? whenOtherOnline : (cb => cb());
    waitOnline(() => {
      const run = () => finishMyInteraction(sent, it);
      if (typeof enqueueOnlineReply === 'function') enqueueOnlineReply(run); else run();
    });
  }, 1500 + Math.random() * 1500);
}

const closeInteractBtn = document.getElementById('closeInteractBtn');
if (closeInteractBtn) closeInteractBtn.onclick = () => document.getElementById('interactModal').classList.remove('show');

// ===== 录音：支持麦克风才显示入口（file:// 下大多数浏览器会拒绝）=====
const toolVoiceEl = document.getElementById('toolVoice');
const voiceCanRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
let voiceRecorder = null, voiceStream = null, voiceChunks = [], voiceStartAt = 0, voiceTimerId = null;
let voicePhase = 'idle';   // idle / starting（等权限）/ recording / processing（停止后打包）
let voiceDiscard = false;
let voiceSession = 0;      // 每次开始 +1；取消后，挂起的权限回调看到号码不对就作废

if (toolVoiceEl && voiceCanRecord) toolVoiceEl.style.display = 'flex';

function stopVoiceStream() {
  if (voiceStream) {
    voiceStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    voiceStream = null;
  }
}
function stopVoiceTimer() {
  if (voiceTimerId) { clearInterval(voiceTimerId); voiceTimerId = null; }
}
function voiceClock(sec) {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}
function closeVoiceModal() {
  const m = document.getElementById('voiceModal');
  if (m) m.classList.remove('show');
}

function handleVoiceStop(session) {
  stopVoiceStream();
  stopVoiceTimer();
  voiceRecorder = null;
  voicePhase = 'processing';
  const dur = Math.round((Date.now() - voiceStartAt) / 1000);

  // 取消过、已经换了新录音、或者根本没录到东西：安静收场
  if (voiceDiscard || session !== voiceSession || !voiceChunks.length) {
    voicePhase = 'idle';
    closeVoiceModal();
    return;
  }

  const blob = new Blob(voiceChunks, { type: (voiceChunks[0] && voiceChunks[0].type) || 'audio/webm' });
  if (blob.size > 1.6 * 1024 * 1024) {
    voicePhase = 'idle';
    closeVoiceModal();
    showToast('这段太长了，存不下');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (voiceDiscard || session !== voiceSession) { voicePhase = 'idle'; closeVoiceModal(); return; }
    voicePhase = 'idle';
    closeVoiceModal();
    // 先让弹窗收起、界面喘一口气，再写进聊天记录
    setTimeout(() => {
      sendMessage({ val: reader.result, dur: Math.max(1, dur) }, 'audio', true);
      setTimeout(randomReply, getRandomDelay());
    }, 60);
  };
  reader.onerror = () => {
    voicePhase = 'idle';
    closeVoiceModal();
    showToast('语音保存失败，再试一次');
  };
  reader.readAsDataURL(blob);
}

async function startVoice() {
  if (!voiceCanRecord || voicePhase !== 'idle') return;
  voicePhase = 'starting';
  voiceDiscard = false;
  voiceChunks = [];
  const session = ++voiceSession;

  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.add('show');
  const hintEl = document.getElementById('voiceHint');
  const timerEl = document.getElementById('voiceTimer');
  if (hintEl) hintEl.textContent = '正在打开麦克风…';
  if (timerEl) timerEl.textContent = '00:00';

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (session === voiceSession) {
      voicePhase = 'idle';
      closeVoiceModal();
      showToast('麦克风打不开（权限或 https 限制）');
    }
    return;
  }

  // 等权限的这段时间里，用户可能已经点了取消/发送，或者切走了页面
  if (voiceDiscard || session !== voiceSession || voicePhase !== 'starting') {
    stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    return;
  }

  voiceStream = stream;
  let rec = null;
  try {
    rec = new MediaRecorder(stream, { audioBitsPerSecond: 24000 }); // 压低码率，60 秒也不会太大
  } catch (e) {
    try { rec = new MediaRecorder(stream); } catch (e2) { rec = null; }
  }
  if (!rec) {
    stopVoiceStream();
    voicePhase = 'idle';
    closeVoiceModal();
    showToast('这个浏览器不支持录音');
    return;
  }

  voiceRecorder = rec;
  voicePhase = 'recording';
  rec.ondataavailable = (e) => { if (e.data && e.data.size) voiceChunks.push(e.data); };
  rec.onstop = () => handleVoiceStop(session);

  voiceStartAt = Date.now();
  rec.start();
  if (hintEl) hintEl.textContent = '正在录音，点「发送」结束';
  voiceTimerId = setInterval(() => {
    const s = Math.round((Date.now() - voiceStartAt) / 1000);
    if (timerEl) timerEl.textContent = voiceClock(s);
    if (s >= 60 && rec.state === 'recording') {
      if (hintEl) hintEl.textContent = '最长 60 秒，已自动发送';
      voicePhase = 'processing';
      rec.stop();
    }
  }, 250);
}

function cancelVoice() {
  voiceSession++;        // 让所有挂起的权限/停止回调作废
  voiceDiscard = true;
  stopVoiceTimer();
  if (voiceRecorder && voiceRecorder.state === 'recording') {
    voicePhase = 'processing';
    try { voiceRecorder.stop(); } catch (e) {
      voiceRecorder = null; stopVoiceStream(); voicePhase = 'idle'; closeVoiceModal();
    }
  } else if (voicePhase === 'processing') {
    // 已经停了：标记丢弃，等 handleVoiceStop / FileReader 收尾；先把弹窗关掉
    closeVoiceModal();
  } else {
    stopVoiceStream();
    voicePhase = 'idle';
    closeVoiceModal();
  }
}

if (toolVoiceEl) toolVoiceEl.onclick = () => { closePanels(); startVoice(); };
const voiceSendBtn = document.getElementById('voiceSendBtn');
if (voiceSendBtn) voiceSendBtn.onclick = () => {
  if (voicePhase === 'recording' && voiceRecorder && voiceRecorder.state === 'recording') {
    voicePhase = 'processing';
    voiceRecorder.stop();
  } else if (voicePhase === 'starting') {
    cancelVoice();   // 还在等权限：直接取消，别再偷偷录
  }
};
const voiceCancelBtn = document.getElementById('voiceCancelBtn');
if (voiceCancelBtn) voiceCancelBtn.onclick = cancelVoice;

// 离开页面 / 切到别的 App 时一定松手，不留下后台录音
window.addEventListener('pagehide', cancelVoice);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (voicePhase === 'starting' || voicePhase === 'recording')) cancelVoice();
});
window.cancelVoice = cancelVoice;