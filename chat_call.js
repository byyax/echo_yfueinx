let callTimer = null, callSeconds = 0;
const callWidget = document.getElementById('callWidget');
const callLargeView = document.getElementById('callLargeView');
const callSmallView = document.getElementById('callSmallView');
const appContainer = document.getElementById('appContainer');

function resetSmallViewPosition() {
  if (!callSmallView) return;
  callSmallView.style.right = '20px';
  callSmallView.style.bottom = '80px';
  callSmallView.style.left = 'auto';
  callSmallView.style.top = 'auto';
  callSmallView.style.transform = 'translate(0, 0)';
}

const toolCall = document.getElementById('toolCall');
if(toolCall) toolCall.onclick = () => {
  closePanels(); 
  callWidget.style.display = 'block';
  callLargeView.style.display = 'flex'; 
  callSmallView.style.display = 'none';
  resetSmallViewPosition();
  
  callSeconds = 0; 
  document.getElementById('callTimeLarge').textContent = '00:00';
  document.getElementById('callTimeSmall').textContent = '00:00';
  document.getElementById('callNameLarge').textContent = chatSettings.otherName;
  document.getElementById('callNameSmall').textContent = chatSettings.otherName;
  if (chatSettings.otherAvatar) { 
    document.getElementById('callAvatar').src = chatSettings.otherAvatar; 
    document.getElementById('callAvatarSmall').src = chatSettings.otherAvatar; 
  }
  if (callTimer) clearInterval(callTimer);
  callTimer = setInterval(() => {
    callSeconds++; 
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0'); 
    const s = String(callSeconds % 60).padStart(2, '0');
    document.getElementById('callTimeLarge').textContent = `${m}:${s}`; 
    document.getElementById('callTimeSmall').textContent = `${m}:${s}`;
  }, 1000);
};

const callMuteBtn = document.getElementById('callMuteBtn');
if (callMuteBtn) callMuteBtn.onclick = () => {
  const on = callMuteBtn.classList.toggle('on');
  const icon = callMuteBtn.querySelector('.ctrl-icon');
  const label = callMuteBtn.querySelector('span');
  if (icon) icon.textContent = on ? '🔇' : '🎤';
  if (label) label.textContent = on ? '取消静音' : '静音';
  showToast(on ? '已静音' : '已取消静音');
};

const callVideoBtn = document.getElementById('callVideoBtn');
if (callVideoBtn) callVideoBtn.onclick = () => {
  const on = callVideoBtn.classList.toggle('on');
  const icon = callVideoBtn.querySelector('.ctrl-icon');
  const label = callVideoBtn.querySelector('span');
  if (icon) icon.textContent = on ? '🎥' : '📷';
  if (label) label.textContent = on ? '关闭摄像头' : '摄像头';
  showToast(on ? '摄像头已开启' : '摄像头已关闭');
};

function resetCallControls() {
  callSeconds = 0;
  const tl = document.getElementById('callTimeLarge'); if (tl) tl.textContent = '00:00';
  const ts = document.getElementById('callTimeSmall'); if (ts) ts.textContent = '00:00';
  [callMuteBtn, callVideoBtn].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('on');
    const icon = btn.querySelector('.ctrl-icon');
    const label = btn.querySelector('span');
    if (btn === callMuteBtn) { if (icon) icon.textContent = '🎤'; if (label) label.textContent = '静音'; }
    else { if (icon) icon.textContent = '📷'; if (label) label.textContent = '摄像头'; }
  });
}

function endCall() {
  if (callTimer) clearInterval(callTimer);
  callTimer = null;
  callWidget.style.display = 'none';
  if (callLargeView) callLargeView.style.display = 'flex';
  if (callSmallView) { callSmallView.style.display = 'none'; }
  resetSmallViewPosition();
  resetCallControls();
  showToast('通话已结束');
}
const hangupBtn = document.getElementById('callHangupBtn');
if (hangupBtn) hangupBtn.onclick = endCall;
const hangupSmallBtn = document.getElementById('callHangupSmallBtn');
if (hangupSmallBtn) hangupSmallBtn.onclick = endCall;

const minimizeBtn = document.getElementById('callMinimizeBtn');
if (minimizeBtn) {
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (callLargeView) callLargeView.style.display = 'none';
    if (callSmallView) {
      callSmallView.style.cssText = 'display: flex !important; position: absolute !important; right: 20px !important; bottom: 80px !important; left: auto !important; top: auto !important; transform: translate(0, 0) !important; z-index: 99999 !important;';
    }
  });
}

const maximizeBtn = document.getElementById('callMaximizeBtn');
if (maximizeBtn) {
  maximizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (callLargeView) callLargeView.style.display = 'flex';
    if (callSmallView) callSmallView.style.display = 'none';
    resetSmallViewPosition();
  });
}

// ===== 修复：使用 Pointer 事件来保证丝滑拖拽且不卡死 =====
let isDraggingCall = false, startX = 0, startY = 0;
const pipDragArea = document.querySelector('.pip-drag-area');

if(pipDragArea) {
  pipDragArea.addEventListener('pointerdown', (e) => {
    isDraggingCall = true;
    startX = e.clientX; startY = e.clientY;
    const rect = callSmallView.getBoundingClientRect();
    const appRect = appContainer.getBoundingClientRect();
    
    callSmallView.style.right = 'auto'; 
    callSmallView.style.bottom = 'auto';
    callSmallView.style.left = (rect.left - appRect.left) + 'px'; 
    callSmallView.style.top = (rect.top - appRect.top) + 'px';
    callSmallView.style.transition = 'none';
    
    // 捕获指针，防止拖到窗口外丢失事件
    pipDragArea.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none'; 
    document.body.style.touchAction = 'none'; // 阻止手机端下拉刷新/滚动
  });

  pipDragArea.addEventListener('pointermove', (e) => {
    if (!isDraggingCall) return;
    
    const dx = e.clientX - startX, dy = e.clientY - startY;
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
    
    callSmallView.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    const appW = appContainer.clientWidth;
    
    if (callSmallView.offsetLeft < 20) { 
      callSmallView.style.left = '0px'; 
      callSmallView.style.transform = 'translateX(-40%)'; 
    } 
    else if (callSmallView.offsetLeft + callSmallView.offsetWidth > appW - 20) { 
      callSmallView.style.left = (appW - callSmallView.offsetWidth) + 'px'; 
      callSmallView.style.transform = 'translateX(40%)'; 
    } 
    else { 
      callSmallView.style.transform = 'translateX(0)'; 
    }
  });
  
  pipDragArea.addEventListener('pointercancel', () => {
    isDraggingCall = false;
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
  });
}

if(callSmallView) {
  callSmallView.ondblclick = () => { callLargeView.style.display = 'flex'; callSmallView.style.display = 'none'; resetSmallViewPosition(); };
  callSmallView.onclick = () => { if (callSmallView.style.transform !== 'translateX(0)' && !isDraggingCall) callSmallView.style.transform = 'translateX(0)'; };
}