// ===== 自定义图标（可选）=====
// 把自己画的图放进 icons/ 文件夹，然后在这里按元素 id 登记，例如：
//   'toolGift': 'icons/gift.png',
// 支持 png / svg / webp，建议正方形、透明底。
//
// id 对照：
//   工具栏：toolCamera 拍照、toolImg 图片、toolCall 语音通话、toolLoc 他在哪、
//           toolRed 红包、toolGift 送礼物、toolTrans 转账、toolPat 互动、
//           toolChoice 选择、toolMusic 音乐、toolVoice 录音
//   后台卡片：menuSettings 聊天设置、menuHistory 聊天记录、menuCards 自定义回复、
//             menuData 数据管理、menuMusic 音乐管理、menuManual 使用手册
//
// 留空就用现在的 emoji。登记的图标会自动继承"图标跟随配色"的滤镜。
const CUSTOM_ICONS = {
  // 'toolGift': 'icons/gift.png',
  // 'menuSettings': 'icons/settings.svg'
};

(function applyCustomIcons() {
  const ids = Object.keys(CUSTOM_ICONS);
  if (!ids.length) return;
  ids.forEach(id => {
    const host = document.getElementById(id);
    if (!host) return;
    const target = host.querySelector('.tool-icon, .icon');
    if (!target) return;
    const img = document.createElement('img');
    img.src = CUSTOM_ICONS[id];
    img.alt = '';
    img.className = 'custom-icon-img';
    target.textContent = '';
    target.appendChild(img);
  });
})();
