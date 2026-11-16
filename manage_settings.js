// 滑块实时显示
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

// 拍一拍实时预览
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

// 气泡主题选择实时预览
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.onclick = () => {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const themeName = opt.dataset.bubbleTheme;
    document.documentElement.setAttribute('data-bubble-theme', themeName);
    chatSettings.bubbleTheme = themeName;
  };
});

// 头像/壁纸上传
function bindAvatarUpload(inputId, settingKey) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await compressImage(file, 400);
    chatSettings[settingKey] = base64;
    saveAllData();
    showToast('图片已保存');
  };
}
bindAvatarUpload('setOtherAvatar', 'otherAvatar');
bindAvatarUpload('setMyAvatar', 'myAvatar');
bindAvatarUpload('setWallpaper', 'wallpaper');

// 保存按钮
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
    saveAllData();
    applyChatSettings();
    showToast('保存成功');
    switchPage('pageManager');
  };
}