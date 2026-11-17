const delaySlider = document.getElementById('setReplyDelay');
if(delaySlider) delaySlider.oninput = function() { document.getElementById('delayText').textContent = parseFloat(this.value).toFixed(1) + ' 分钟'; };

const countSlider = document.getElementById('setReplyCount');
if(countSlider) countSlider.oninput = function() { document.getElementById('countText').textContent = this.value + ' 条'; };

const sigSlider = document.getElementById('setSigTimer');
if(sigSlider) sigSlider.oninput = function() { document.getElementById('sigTimeText').textContent = this.value + ' 分钟'; };

const arTimeSlider = document.getElementById('setAutoReplyTime');
if(arTimeSlider) arTimeSlider.oninput = function() { document.getElementById('autoReplyTimeText').textContent = this.value + ' 分钟'; };

const arCountSlider = document.getElementById('setAutoReplyCount');
if(arCountSlider) arCountSlider.oninput = function() { document.getElementById('autoReplyCountText').textContent = this.value + ' 条'; };

function updatePatPreview() {
  const actionInput = document.getElementById('setMyPatAction');
  const suffixInput = document.getElementById('setMyPatSuffix');
  const previewEl = document.getElementById('patPreviewText');
  if (!previewEl) return;
  const myName = (document.getElementById('setMyName')?.value.trim()) || chatSettings.myName || '你';
  const otherName = (document.getElementById('setOtherName')?.value.trim()) || chatSettings.otherName || '对方';
  const action = (actionInput?.value.trim()) || '拍了拍';
  const suffix = (suffixInput?.value.trim()) || '';
  previewEl.textContent = `${myName} ${action} ${otherName}${suffix ? ' ' + suffix : ''}`;
}

const setMyNameInput = document.getElementById('setMyName');
if (setMyNameInput) setMyNameInput.addEventListener('input', (e) => {
  const show = document.getElementById('patMyNameShow');
  if (show) show.textContent = e.target.value.trim() || '你';
  updatePatPreview();
});
const setOtherNameInput = document.getElementById('setOtherName');
if (setOtherNameInput) setOtherNameInput.addEventListener('input', (e) => {
  const show = document.getElementById('patOtherNameShow');
  if (show) show.textContent = e.target.value.trim() || '对方';
  updatePatPreview();
});
const setPatActionInput = document.getElementById('setMyPatAction');
if (setPatActionInput) setPatActionInput.addEventListener('input', updatePatPreview);
const setPatSuffixInput = document.getElementById('setMyPatSuffix');
if (setPatSuffixInput) setPatSuffixInput.addEventListener('input', updatePatPreview);

document.querySelectorAll('.theme-option').forEach(opt => {
  opt.onclick = () => {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const themeName = opt.dataset.bubbleTheme;
    document.documentElement.setAttribute('data-bubble-theme', themeName);
    chatSettings.bubbleTheme = themeName;
  };
});

// ===== 修复5：头像/壁纸先暂存，点右上角保存才真正生效 =====
let pendingSettings = null; // { otherAvatar, myAvatar, wallpaper } 未保存的暂存
let settingsDirty = false;

function markSettingsDirty() { settingsDirty = true; }

function bindAvatarUpload(inputId, settingKey) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (settingKey === 'wallpaper') {
    // 壁纸不裁剪，但也先暂存
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!pendingSettings) pendingSettings = {};
        pendingSettings.wallpaper = ev.target.result;
        markSettingsDirty();
        showToast('壁纸已选择，记得点右上角保存');
      };
      reader.readAsDataURL(file);
      input.value = '';
    };
    return;
  }
  input.onchange = (e) => startCrop(e, settingKey);
}
bindAvatarUpload('setOtherAvatar', 'otherAvatar');
bindAvatarUpload('setMyAvatar', 'myAvatar');
bindAvatarUpload('setWallpaper', 'wallpaper');

// ===== 裁剪弹窗逻辑（方形/圆形；裁剪框最大范围=原图短边，拉条用于放大） =====
let cropTargetKey = '';
let cropShape = 'square';
const cropContainer = document.getElementById('cropContainer');
const cropImgEl = document.getElementById('cropImage');
const cropZoom = document.getElementById('cropZoom');
const cropWindowEl = document.getElementById('cropWindow');
let cropState = { x: 0, y: 0, scale: 1, baseScale: 1 };
let cropDragging = false, cropStartX = 0, cropStartY = 0;
const CROP_BOX = 260, CROP_WIN = 200, CROP_PAD = (CROP_BOX - CROP_WIN) / 2;

function setCropShape(shape) {
  cropShape = shape;
  if (cropWindowEl) cropWindowEl.classList.toggle('circle', shape === 'circle');
  const sq = document.getElementById('cropShapeSquare');
  const ci = document.getElementById('cropShapeCircle');
  if (sq) sq.classList.toggle('primary', shape === 'square');
  if (ci) ci.classList.toggle('primary', shape === 'circle');
}
const cropShapeSquareBtn = document.getElementById('cropShapeSquare');
if (cropShapeSquareBtn) cropShapeSquareBtn.onclick = () => setCropShape('square');
const cropShapeCircleBtn = document.getElementById('cropShapeCircle');
if (cropShapeCircleBtn) cropShapeCircleBtn.onclick = () => setCropShape('circle');

function clampCrop() {
  const w = cropImgEl.naturalWidth * cropState.scale;
  const h = cropImgEl.naturalHeight * cropState.scale;
  cropState.x = Math.min(CROP_PAD, Math.max(CROP_PAD + CROP_WIN - w, cropState.x));
  cropState.y = Math.min(CROP_PAD, Math.max(CROP_PAD + CROP_WIN - h, cropState.y));
}
function applyCropTransform() {
  clampCrop();
  cropImgEl.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`;
}

function startCrop(event, settingKey) {
  const file = event.target.files[0]; if (!file) return;
  cropTargetKey = settingKey;
  const reader = new FileReader();
  reader.onload = (e) => {
    cropImgEl.src = e.target.result;
    cropImgEl.onload = () => {
      // 基础缩放：让原图短边正好铺满裁剪框，即裁剪框最大范围=原图短边
      cropState.baseScale = CROP_WIN / Math.min(cropImgEl.naturalWidth, cropImgEl.naturalHeight);
      cropZoom.value = 1;
      cropState.scale = cropState.baseScale;
      const w = cropImgEl.naturalWidth * cropState.scale;
      const h = cropImgEl.naturalHeight * cropState.scale;
      cropState.x = (CROP_BOX - w) / 2;
      cropState.y = (CROP_BOX - h) / 2;
      setCropShape(cropShape);
      applyCropTransform();
      document.getElementById('cropModal').classList.add('show');
    };
  };
  reader.readAsDataURL(file); event.target.value = '';
}

if (cropContainer) {
  cropContainer.onmousedown = cropContainer.ontouchstart = (e) => {
    cropDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY;
    cropStartX = cx - cropState.x; cropStartY = cy - cropState.y;
  };
  cropContainer.onmousemove = cropContainer.ontouchmove = (e) => {
    if (!cropDragging) return; e.preventDefault(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY;
    cropState.x = cx - cropStartX; cropState.y = cy - cropStartY; applyCropTransform();
  };
  cropContainer.onmouseup = cropContainer.ontouchend = cropContainer.onmouseleave = () => { cropDragging = false; };
}
if (cropZoom) cropZoom.oninput = function() {
  const oldW = cropImgEl.naturalWidth * cropState.scale;
  const oldH = cropImgEl.naturalHeight * cropState.scale;
  const cx = cropState.x + oldW / 2, cy = cropState.y + oldH / 2;
  cropState.scale = cropState.baseScale * parseFloat(this.value);
  const newW = cropImgEl.naturalWidth * cropState.scale;
  const newH = cropImgEl.naturalHeight * cropState.scale;
  cropState.x = cx - newW / 2; cropState.y = cy - newH / 2;
  applyCropTransform();
};

document.getElementById('cancelCrop').onclick = () => document.getElementById('cropModal').classList.remove('show');
document.getElementById('confirmCrop').onclick = () => {
  const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 300; const ctx = canvas.getContext('2d');
  const sx = (CROP_PAD - cropState.x) / cropState.scale;
  const sy = (CROP_PAD - cropState.y) / cropState.scale;
  const sSize = CROP_WIN / cropState.scale;
  ctx.drawImage(cropImgEl, sx, sy, sSize, sSize, 0, 0, 300, 300);
  let base64;
  if (cropShape === 'circle') {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath(); ctx.arc(150, 150, 150, 0, Math.PI * 2); ctx.fill();
    base64 = canvas.toDataURL('image/png');
  } else {
    base64 = canvas.toDataURL('image/jpeg', 0.9);
  }
  if (!pendingSettings) pendingSettings = {};
  pendingSettings[cropTargetKey] = base64;
  markSettingsDirty();
  document.getElementById('cropModal').classList.remove('show');
  showToast('已裁剪，点右上角保存后生效');
};

// ===== 保存 =====
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
if (saveSettingsBtn) {
  saveSettingsBtn.onclick = () => {
    chatSettings.otherName = (document.getElementById('setOtherName').value.trim()) || '对方';
    chatSettings.myName = (document.getElementById('setMyName').value.trim()) || '你';
    chatSettings.myPatAction = (document.getElementById('setMyPatAction').value.trim()) || '拍了拍';
    chatSettings.myPatSuffix = (document.getElementById('setMyPatSuffix').value.trim()) || '';
    chatSettings.replyDelay = parseFloat(document.getElementById('setReplyDelay').value) || 0.5;
    chatSettings.replyCount = parseInt(document.getElementById('setReplyCount').value) || 1;
    chatSettings.sigTimer = parseInt(document.getElementById('setSigTimer').value) || 5;
    chatSettings.autoReplyTime = parseInt(document.getElementById('setAutoReplyTime').value) || 0;
    chatSettings.autoReplyCount = parseInt(document.getElementById('setAutoReplyCount').value) || 1;
    
    const timeRadio = document.querySelector('input[name="timeFormat"]:checked');
    if(timeRadio) chatSettings.timeFormat = timeRadio.value;

    const hourRadio = document.querySelector('input[name="hourFormat"]:checked');
    if(hourRadio) chatSettings.hourFormat = hourRadio.value;

    const typingBox = document.getElementById('setShowTyping');
    if (typingBox) chatSettings.showTyping = typingBox.checked;

    // 暂存的图片正式写入
    if (pendingSettings) {
      if (pendingSettings.otherAvatar !== undefined) chatSettings.otherAvatar = pendingSettings.otherAvatar;
      if (pendingSettings.myAvatar !== undefined) chatSettings.myAvatar = pendingSettings.myAvatar;
      if (pendingSettings.wallpaper !== undefined) chatSettings.wallpaper = pendingSettings.wallpaper;
      pendingSettings = null;
    }

    saveAllData();
    applyChatSettings();
    settingsDirty = false;
    showToast('保存成功');
    switchPage('pageManager');
  };
}

// ===== 修复5：退出时若有未保存改动，弹窗询问 =====
function settingsExitGuard(doExit) {
  if (!settingsDirty) { doExit(); return; }
  const modal = document.getElementById('unsavedModal');
  if (!modal) { doExit(); return; }
  modal.classList.add('show');
  document.getElementById('unsavedSaveBtn').onclick = () => {
    modal.classList.remove('show');
    settingsDirty = false;
    if (saveSettingsBtn) saveSettingsBtn.click();
  };
  document.getElementById('unsavedDiscardBtn').onclick = () => {
    modal.classList.remove('show');
    settingsDirty = false;
    pendingSettings = null;
    doExit();
  };
  document.getElementById('unsavedStayBtn').onclick = () => modal.classList.remove('show');
}

const backFromSettingsBtn = document.getElementById('backFromSettings');
if (backFromSettingsBtn) backFromSettingsBtn.onclick = () => settingsExitGuard(() => switchPage('pageManager'));

// 页面上任何输入都标记为脏
['setOtherName','setMyName','setMyPatAction','setMyPatSuffix'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', markSettingsDirty);
});
['setReplyDelay','setReplyCount','setSigTimer','setAutoReplyTime','setAutoReplyCount'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', markSettingsDirty);
});
document.querySelectorAll('input[name="timeFormat"]').forEach(r => r.addEventListener('change', () => { markSettingsDirty(); updateTimeChipLabels(); }));
document.querySelectorAll('input[name="hourFormat"]').forEach(r => r.addEventListener('change', () => { markSettingsDirty(); updateTimeChipLabels(); }));

// 两个选项联动更新示例文案
function updateTimeChipLabels() {
  const withSec = (document.querySelector('input[name="timeFormat"]:checked') || {}).value === 'hms';
  const l12 = document.getElementById('hour12Label');
  const l24 = document.getElementById('hour24Label');
  if (l12) l12.textContent = withSec ? '12小时 (10:30:25am)' : '12小时 (10:30pm)';
  if (l24) l24.textContent = withSec ? '24小时 (22:30:25)' : '24小时 (22:30)';
}
const typingBoxEl = document.getElementById('setShowTyping');
if (typingBoxEl) typingBoxEl.addEventListener('change', markSettingsDirty);
document.querySelectorAll('.theme-option').forEach(opt => opt.addEventListener('click', markSettingsDirty));