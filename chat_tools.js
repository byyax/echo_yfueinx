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
    const loc = locLibrary[Math.floor(Math.random() * locLibrary.length)];
    sendMessage(loc.val, 'location', false);
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
  '摸摸头': ['嘿嘿，被你摸到啦~'],
  '戳戳脸': ['别戳啦，痒~'],
  '抱抱': ['（一把抱住你）'],
  '贴贴': ['（凑过来贴贴）'],
  '捏捏脸': ['哎呀脸都要捏红啦'],
  '举高高': ['哇——飞起来啦！']
};

function sendInteract(it) {
  sendMessage({ name: it.name, icon: it.icon, val: `想${it.name}`, isOpened: false, interact: true }, 'interact', true);
  // 对方回应：同一个动作，回话从它自己的词库里随机挑
  setTimeout(() => {
    const pool = (it.replies && it.replies.length) ? it.replies : REPLY_FALLBACK[it.name];
    const text = (pool && pool.length)
      ? pool[Math.floor(Math.random() * pool.length)]
      : `（接受了你的${it.name}）`;
    sendMessage(text, 'text', false);
  }, 1500 + Math.random() * 1500);
}

const closeInteractBtn = document.getElementById('closeInteractBtn');
if (closeInteractBtn) closeInteractBtn.onclick = () => document.getElementById('interactModal').classList.remove('show');

// ===== 录音：支持麦克风才显示入口（file:// 下大多数浏览器会拒绝）=====
const toolVoiceEl = document.getElementById('toolVoice');
const voiceCanRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
let voiceRecorder = null, voiceStream = null, voiceChunks = [], voiceStartAt = 0, voiceTimerId = null, voiceDiscard = false;

if (toolVoiceEl && voiceCanRecord) toolVoiceEl.style.display = 'flex';

function stopVoiceStream() {
  if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null; }
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

async function startVoice() {
  if (!voiceCanRecord) return;
  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.add('show');
  const hintEl = document.getElementById('voiceHint');
  const timerEl = document.getElementById('voiceTimer');
  if (hintEl) hintEl.textContent = '正在打开麦克风…';
  if (timerEl) timerEl.textContent = '00:00';

  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    closeVoiceModal();
    showToast('麦克风打不开（权限或 https 限制）');
    return;
  }
  voiceChunks = [];
  voiceDiscard = false;
  try {
    voiceRecorder = new MediaRecorder(voiceStream);
  } catch (e) {
    stopVoiceStream();
    closeVoiceModal();
    showToast('这个浏览器不支持录音');
    return;
  }

  voiceRecorder.ondataavailable = (e) => { if (e.data && e.data.size) voiceChunks.push(e.data); };
  voiceRecorder.onstop = () => {
    stopVoiceStream();
    stopVoiceTimer();
    const dur = Math.round((Date.now() - voiceStartAt) / 1000);
    if (voiceDiscard || !voiceChunks.length) { closeVoiceModal(); return; }
    const blob = new Blob(voiceChunks, { type: (voiceChunks[0] && voiceChunks[0].type) || 'audio/webm' });
    if (blob.size > 1.6 * 1024 * 1024) { closeVoiceModal(); showToast('这段太长了，存不下'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      closeVoiceModal();
      sendMessage({ val: reader.result, dur: Math.max(1, dur) }, 'audio', true);
      setTimeout(randomReply, getRandomDelay());
    };
    reader.readAsDataURL(blob);
  };

  voiceStartAt = Date.now();
  voiceRecorder.start();
  if (hintEl) hintEl.textContent = '正在录音，点「发送」结束';
  voiceTimerId = setInterval(() => {
    const s = Math.round((Date.now() - voiceStartAt) / 1000);
    if (timerEl) timerEl.textContent = voiceClock(s);
    if (s >= 60 && voiceRecorder && voiceRecorder.state === 'recording') {
      if (hintEl) hintEl.textContent = '最长 60 秒，已自动停止';
      voiceRecorder.stop();
    }
  }, 250);
}

function cancelVoice() {
  voiceDiscard = true;
  if (voiceRecorder && voiceRecorder.state !== 'inactive') voiceRecorder.stop();
  else { stopVoiceStream(); stopVoiceTimer(); closeVoiceModal(); }
}

if (toolVoiceEl) toolVoiceEl.onclick = () => { closePanels(); startVoice(); };
const voiceSendBtn = document.getElementById('voiceSendBtn');
if (voiceSendBtn) voiceSendBtn.onclick = () => {
  if (voiceRecorder && voiceRecorder.state === 'recording') voiceRecorder.stop();
  else closeVoiceModal();
};
const voiceCancelBtn = document.getElementById('voiceCancelBtn');
if (voiceCancelBtn) voiceCancelBtn.onclick = cancelVoice;
window.cancelVoice = cancelVoice;