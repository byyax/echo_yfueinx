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

// ===== 界面配色：点一下即时预览，保存后记住 =====
let paletteFilter = 'all';

function renderPaletteGrid() {
  const box = document.getElementById('paletteGrid');
  if (!box) return;
  const list = (typeof PALETTES !== 'undefined') ? PALETTES : [];
  let cur = chatSettings.palette || 'olive';
  // 旧版本存下的配色可能已经删掉了，退回默认的橄榄绿
  if (!list.some(p => p.id === cur)) { cur = 'olive'; chatSettings.palette = cur; }
  let groups = (typeof PALETTE_GROUPS !== 'undefined') ? PALETTE_GROUPS : [{ id: 'all', label: '' }];
  if (paletteFilter !== 'all') groups = groups.filter(g => g.id === paletteFilter);
  box.innerHTML = '';
  groups.forEach(g => {
    const items = list.filter(p => (p.group || 'all') === g.id);
    if (!items.length) return;
    if (g.label) {
      const h = document.createElement('div');
      h.className = 'pal-group-title';
      h.textContent = g.label;
      box.appendChild(h);
    }
    items.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-item' + (p.id === cur ? ' active' : '');
      btn.innerHTML = `<span class="pal-dots"><i style="background:${p.main}"></i><i style="background:${p.deep}"></i><i style="background:${p.dot || p.bubble}"></i></span><span class="pal-name">${p.name}</span>`;
      btn.onclick = () => {
        chatSettings.palette = p.id;
        if (typeof applyPalette === 'function') applyPalette(p.id);
        box.querySelectorAll('.palette-item').forEach(o => o.classList.remove('active'));
        btn.classList.add('active');
        markSettingsDirty();
      };
      box.appendChild(btn);
    });
  });
}
const paletteFilterEl = document.getElementById('paletteFilter');
if (paletteFilterEl) {
  paletteFilterEl.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      paletteFilter = btn.dataset.pgroup || 'all';
      paletteFilterEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      renderPaletteGrid();
    };
  });
}
renderPaletteGrid();

// ===== 修复5：头像/壁纸先暂存，点右上角保存才真正生效 =====
let pendingSettings = null; // { otherAvatar, myAvatar, wallpaper } 未保存的暂存
let settingsDirty = false;

function markSettingsDirty() { settingsDirty = true; }

// 配色区展开 / 收起
const paletteScrollEl = document.getElementById('paletteScroll');
const paletteExpandBtn = document.getElementById('paletteExpandBtn');
if (paletteScrollEl && paletteExpandBtn) {
  paletteExpandBtn.onclick = () => {
    const expanded = paletteScrollEl.classList.toggle('expanded');
    paletteExpandBtn.textContent = expanded ? '收起' : '展开';
  };
}

// 文件选择：显示"已选择"之类的状态
function setFileLabel(inputId, text) {
  const el = document.getElementById(inputId + 'Name');
  if (el) el.textContent = text;
}
function fileLabel(value, name) {
  if (!value) return '';
  return name ? '已选择 · ' + name : '已选择';
}
function refreshFileLabels() {
  setFileLabel('setOtherAvatar', fileLabel(chatSettings.otherAvatar, chatSettings.otherAvatarName));
  setFileLabel('setMyAvatar', fileLabel(chatSettings.myAvatar, chatSettings.myAvatarName));
  setFileLabel('setWallpaper', fileLabel(chatSettings.wallpaper, chatSettings.wallpaperName));
}
refreshFileLabels();

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
        pendingSettings.wallpaperName = file.name || '';
        setFileLabel('setWallpaper', file.name ? '已选择 · ' + file.name : '已选择');
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

// 恢复默认头像 / 壁纸：先暂存，点保存后才生效
const resetAvatarsBtn = document.getElementById('resetAvatars');
if (resetAvatarsBtn) {
  resetAvatarsBtn.onclick = () => {
    showConfirm('恢复默认头像', '将清除你和对方的自定义头像，恢复默认显示。确定吗？', () => {
      if (!pendingSettings) pendingSettings = {};
      pendingSettings.otherAvatar = '';
      pendingSettings.otherAvatarName = '';
      pendingSettings.myAvatar = '';
      pendingSettings.myAvatarName = '';
      setFileLabel('setOtherAvatar', '');
      setFileLabel('setMyAvatar', '');
      markSettingsDirty();
      showToast('已恢复默认头像，点击保存后生效');
    });
  };
}
const resetWallpaperBtn = document.getElementById('resetWallpaper');
if (resetWallpaperBtn) {
  resetWallpaperBtn.onclick = () => {
    showConfirm('恢复默认壁纸', '将清除当前聊天壁纸，恢复默认背景。确定吗？', () => {
      if (!pendingSettings) pendingSettings = {};
      pendingSettings.wallpaper = '';
      pendingSettings.wallpaperName = '';
      setFileLabel('setWallpaper', '');
      markSettingsDirty();
      showToast('已恢复默认壁纸，点击保存后生效');
    });
  };
}

// ===== 裁剪弹窗逻辑（方形/圆形；裁剪框最大范围=原图短边，拉条用于放大） =====
let cropTargetKey = '';
let cropFileName = '';
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
  cropFileName = file.name || '';
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
  // 输出 400×400，头像放大时更清楚
  const OUT = 400;
  const canvas = document.createElement('canvas'); canvas.width = OUT; canvas.height = OUT; const ctx = canvas.getContext('2d');
  const sx = (CROP_PAD - cropState.x) / cropState.scale;
  const sy = (CROP_PAD - cropState.y) / cropState.scale;
  const sSize = CROP_WIN / cropState.scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cropImgEl, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
  let base64;
  if (cropShape === 'circle') {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath(); ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2); ctx.fill();
    base64 = canvas.toDataURL('image/png');
  } else {
    base64 = canvas.toDataURL('image/jpeg', 0.92);
  }
  if (!pendingSettings) pendingSettings = {};
  pendingSettings[cropTargetKey] = base64;
  pendingSettings[cropTargetKey + 'Name'] = cropFileName;
  const inputIdMap = { otherAvatar: 'setOtherAvatar', myAvatar: 'setMyAvatar' };
  if (inputIdMap[cropTargetKey]) {
    setFileLabel(inputIdMap[cropTargetKey], cropFileName ? '已选择 · ' + cropFileName : '已选择');
  }
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
    chatSettings.sigTimer = Math.max(15, parseInt(document.getElementById('setSigTimer').value) || 15);
    chatSettings.autoReplyTime = parseInt(document.getElementById('setAutoReplyTime').value) || 0;
    chatSettings.autoReplyCount = parseInt(document.getElementById('setAutoReplyCount').value) || 1;
    
    const timeRadio = document.querySelector('input[name="timeFormat"]:checked');
    if(timeRadio) chatSettings.timeFormat = timeRadio.value;

    const hourRadio = document.querySelector('input[name="hourFormat"]:checked');
    if(hourRadio) chatSettings.hourFormat = hourRadio.value;

    const typingBox = document.getElementById('setShowTyping');
    if (typingBox) chatSettings.showTyping = typingBox.checked;

    const soundBox = document.getElementById('setSound');
    if (soundBox) chatSettings.sound = soundBox.checked;

    const moodBox = document.getElementById('setMoodEnabled');
    if (moodBox) chatSettings.moodEnabled = moodBox.checked;

    // 暂存的图片正式写入
    if (pendingSettings) {
      if (pendingSettings.otherAvatar !== undefined) chatSettings.otherAvatar = pendingSettings.otherAvatar;
      if (pendingSettings.otherAvatarName !== undefined) chatSettings.otherAvatarName = pendingSettings.otherAvatarName;
      if (pendingSettings.myAvatar !== undefined) chatSettings.myAvatar = pendingSettings.myAvatar;
      if (pendingSettings.myAvatarName !== undefined) chatSettings.myAvatarName = pendingSettings.myAvatarName;
      if (pendingSettings.wallpaper !== undefined) chatSettings.wallpaper = pendingSettings.wallpaper;
      if (pendingSettings.wallpaperName !== undefined) chatSettings.wallpaperName = pendingSettings.wallpaperName;
      pendingSettings = null;
    }

    saveAllData();
    applyChatSettings();
    if (typeof refreshMood === 'function') refreshMood(true);
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
const soundBoxEl = document.getElementById('setSound');
if (soundBoxEl) soundBoxEl.addEventListener('change', markSettingsDirty);
const moodBoxEl = document.getElementById('setMoodEnabled');
if (moodBoxEl) moodBoxEl.addEventListener('change', markSettingsDirty);
// 图标色调：原色 / 柔和 / 跟随配色
const iconTintSeg = document.getElementById('iconTintSeg');
function renderIconTintSeg() {
  if (!iconTintSeg) return;
  const mode = chatSettings.iconTint || 'off';
  iconTintSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}
if (iconTintSeg) {
  iconTintSeg.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      chatSettings.iconTint = btn.dataset.mode;
      if (typeof applyIconTint === 'function') applyIconTint();
      renderIconTintSeg();
      markSettingsDirty();
    };
  });
}
renderIconTintSeg();
document.querySelectorAll('.theme-option').forEach(opt => opt.addEventListener('click', markSettingsDirty));