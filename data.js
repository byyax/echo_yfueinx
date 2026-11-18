let tags = JSON.parse(localStorage.getItem('chat_tags')) || [{ id: 'unclassified', name: '未分类', color: '#8c8c8c' }];
let contents = JSON.parse(localStorage.getItem('chat_contents')) || [];
let myEmojis = JSON.parse(localStorage.getItem('my_emojis')) || [];
let chatSettings = JSON.parse(localStorage.getItem('chat_settings')) || {};
let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
let payPassword = localStorage.getItem('pay_password') || null;

let locLibrary = JSON.parse(localStorage.getItem('loc_library')) || [{ id: 'l1', val: '我在DR世界' }, { id: 'l2', val: '我在CR世界' }];
let pokeLibrary = JSON.parse(localStorage.getItem('poke_library')) || [{id: 'p1', val: '捏了捏你的脸，并亲了你一口'}];
let signatureLibrary = JSON.parse(localStorage.getItem('signature_library')) || [{id: 's1', val: '今天心情不错'}, {id: 's2', val: '想吃小蛋糕'}];
// 每个互动动作可以配几句不同的回应，发送时随机挑一句
const INTERACT_REPLIES = {
  '摸摸头': ['嗯……再摸一会儿也行', '被你摸得都困了', '头只能你摸，别人不行', '乖，换我摸摸你'],
  '戳戳脸': ['别戳啦，痒~', '你再戳，我可就亲回去了', '戳一下要给钱的', '脸都被你戳软了'],
  '抱抱': ['（一把抱住你）', '抱紧点，别松手', '你身上好香', '再抱十秒'],
  '贴贴': ['（凑过来贴贴）', '贴这么近，还让不让人学习了', '行吧，今天格外黏你', '（把下巴搁在你肩上）'],
  '捏捏脸': ['哎呀脸都要捏红啦', '捏坏了你负责', '再捏我就咬你', '轻点，脸都被你捏变形了'],
  '举高高': ['哇——飞起来啦！', '再来一次，我还想飞', '举你一点都不费劲', '转一圈？']
};

let interactLibrary = JSON.parse(localStorage.getItem('interact_library')) || [
  { id: 'i1', name: '摸摸头', icon: '🖐️' },
  { id: 'i2', name: '戳戳脸', icon: '👉' },
  { id: 'i3', name: '抱抱', icon: '🤗' },
  { id: 'i4', name: '贴贴', icon: '💞' },
  { id: 'i5', name: '捏捏脸', icon: '🤏' },
  { id: 'i6', name: '举高高', icon: '🙌' }
];
// 老存档里没有 replies 的，按名字补上
interactLibrary.forEach(it => {
  if (!it) return;
  if (!it.replies || !it.replies.length) it.replies = INTERACT_REPLIES[it.name] || [];
});

// 对方离线时的自动回复（回来后会先发一句）
let offlineReplyLines = [
  '刚刚没看手机！怎么啦怎么啦',
  '呜我才回来， missed you～想我了吗',
  '刚忙完回来！你的消息我现在才看到',
  '回来啦回来啦！刚才手机不在身边',
  '嗨！我刚上线，看到你的消息立刻飞奔过来'
];

if (locLibrary.length > 0 && typeof locLibrary[0] === 'string') locLibrary = locLibrary.map((v, i) => ({ id: 'l_'+i, val: v }));
if (pokeLibrary.length > 0 && typeof pokeLibrary[0] === 'string') pokeLibrary = pokeLibrary.map((v, i) => ({ id: 'p_'+i, val: v }));
if (signatureLibrary.length > 0 && typeof signatureLibrary[0] === 'string') signatureLibrary = signatureLibrary.map((v, i) => ({ id: 's_'+i, val: v }));

// ===== 界面配色：只改变白天模式 =====
const PALETTES = [
  // 单色：一个主色走到底
  { id: 'olive',     name: '橄榄绿',   group: 'plain', main: '#A4C639', deep: '#6B8E23', bg: '#f7f9f5', bubble: '#B8DE86' },
  { id: 'sakura',    name: '樱花粉',   group: 'plain', main: '#F09CAD', deep: '#C2607A', bg: '#fdf7f9', bubble: '#F8CBD7' },
  { id: 'peach',     name: '蜜桃粉',   group: 'plain', main: '#EFA283', deep: '#C46D50', bg: '#fdf8f5', bubble: '#F9D3C3' },
  { id: 'mist',      name: '雾蓝',     group: 'plain', main: '#6B8FB5', deep: '#4A6A8A', bg: '#f6f9fc', bubble: '#C9DDF5' },
  { id: 'taro',      name: '香芋紫',   group: 'plain', main: '#9B8AC4', deep: '#6F5E9E', bg: '#faf8fe', bubble: '#DCD3F2' },
  { id: 'caramel',   name: '焦糖奶咖', group: 'plain', main: '#B08B6E', deep: '#967A64', bg: '#fbf7f2', bubble: '#E3D8C4' },
  { id: 'lemon',     name: '柠檬黄',   group: 'plain', main: '#D9B23A', deep: '#A8862A', bg: '#fdfbf0', bubble: '#F3E3A8' },
  { id: 'wechat',    name: '微信绿',   group: 'plain', main: '#07C160', deep: '#059A4C', bg: '#F3F3F3', bubble: '#95EC69' },
  // 撞色：按钮一个色，气泡另一个色
  { id: 'matcha',    name: '樱花抹茶', group: 'clash', main: '#E0798F', deep: '#B25A6E', bg: '#FBEEF2', bubble: '#CDE3B4' },
  { id: 'mintpeach', name: '蜜桃薄荷', group: 'clash', main: '#E9906C', deep: '#C4703F', bg: '#FDF0E9', bubble: '#B9EBD8' },
  { id: 'saltlemon', name: '海盐柠檬', group: 'clash', main: '#3F97B0', deep: '#2C7489', bg: '#ECF6FA', bubble: '#F3E3A8' },
  { id: 'berry',     name: '莓果奶油', group: 'clash', main: '#A6335C', deep: '#750D37', bg: '#FAEEF3', bubble: '#E3D8C4' },
  { id: 'creamint',  name: '奶油薄荷', group: 'clash', main: '#4FA98A', deep: '#2E8B6A', bg: '#F7EFDD', bubble: '#B9EBD8' },
  { id: 'milkstraw', name: '牛奶草莓', group: 'clash', main: '#E0708C', deep: '#B25068', bg: '#FBE8EC', bubble: '#FFD9E0' },
  { id: 'sunblue',   name: '落日橘蓝', group: 'clash', main: '#E07B39', deep: '#B55B22', bg: '#FDEFDF', bubble: '#BFD8F2' },
  { id: 'matcocoa',  name: '抹茶可可', group: 'clash', main: '#7A9A4E', deep: '#5C7A38', bg: '#F3EDDC', bubble: '#E5D3BC' },
  { id: 'seagrape',  name: '海盐葡萄', group: 'clash', main: '#5F8FA8', deep: '#436E86', bg: '#E9F3F8', bubble: '#DCCBF0' },
  { id: 'sakugreen', name: '樱花墨绿', group: 'clash', main: '#D9738A', deep: '#AF5369', bg: '#F9EEEA', bubble: '#C9DFC2' },
  { id: 'spring',    name: '春樱野草', group: 'clash', main: '#6E9A5A', deep: '#4C7A3E', bg: '#F7F2F0', bubble: '#CDE3B4', me: '#FAD7DF', dot: 'linear-gradient(135deg, #FAD7DF 50%, #CDE3B4 50%)' },
  { id: 'peachmint', name: '桃气薄荷', group: 'clash', main: '#E0798F', deep: '#B25A6E', bg: '#FFF7F3', bubble: '#B9EBD8', me: '#FFD8C7', dot: 'linear-gradient(135deg, #FFD8C7 50%, #B9EBD8 50%)' },
  // 科技：黑白灰银，低饱和、强对比
  { id: 'graphite',  name: '石墨灰',   group: 'tech',  main: '#4A4F57', deep: '#2E3238', bg: '#F2F3F5', bubble: '#D9DEE4' },
  { id: 'silver',    name: '银灰',     group: 'tech',  main: '#8A929C', deep: '#5F676F', bg: '#F7F8FA', bubble: '#E2E6EA' },
  { id: 'mono',      name: '极简黑白', group: 'tech',  main: '#1F2328', deep: '#000000', bg: '#FAFAFA', bubble: '#E6E8EA' },
  { id: 'techblue',  name: '科技蓝灰', group: 'tech',  main: '#5A6B7B', deep: '#37454F', bg: '#F1F5F8', bubble: '#DCE6EE' },
  // 渐变：气泡本身是渐变
  { id: 'sunset',    name: '晚霞渐变', group: 'grad',  main: '#E9715E', deep: '#C24F3E', bg: '#fff8f5', bubble: '#FFD3A8', dot: 'linear-gradient(135deg, #FFD9A8, #FFB0B8)' },
  { id: 'bluepink',  name: '蓝粉渐变', group: 'grad',  main: '#7B93C4', deep: '#5B6F9E', bg: '#f8fafd', bubble: '#C9DDF5', dot: 'linear-gradient(135deg, #C9DDF5, #F7CBD7)' }
];
const PALETTE_GROUPS = [
  { id: 'plain', label: '单色' },
  { id: 'clash', label: '撞色' },
  { id: 'grad',  label: '渐变' },
  { id: 'tech',  label: '科技' }
];

if (!chatSettings.otherName) chatSettings.otherName = '陆昀霏';
if (!chatSettings.myName) chatSettings.myName = '你';
if (!chatSettings.signature) chatSettings.signature = '这个人很懒';
// 拍一拍：迁移新字段（原来是 myPat/hisPat，现在是 myPatAction + myPatSuffix）
if (!chatSettings.myPatAction) chatSettings.myPatAction = '拍了拍';
if (chatSettings.myPatSuffix === undefined) chatSettings.myPatSuffix = '的后背';
if (chatSettings.replyDelay === undefined) chatSettings.replyDelay = 0.5;
if (chatSettings.replyCount === undefined) chatSettings.replyCount = 1;
if (chatSettings.sigTimer === undefined) chatSettings.sigTimer = 5;
if (chatSettings.autoReplyTime === undefined) chatSettings.autoReplyTime = 0; 
if (chatSettings.autoReplyCount === undefined) chatSettings.autoReplyCount = 1;
if (chatSettings.showTyping === undefined) chatSettings.showTyping = true;
if (chatSettings.sound === undefined) chatSettings.sound = true;
if (!chatSettings.palette) chatSettings.palette = 'olive';
// 图标色调：off 原色 / soft 柔和降饱和 / tint 跟随配色
if (typeof chatSettings.iconTint !== 'string') chatSettings.iconTint = chatSettings.iconTint === true ? 'tint' : 'off';
if (!chatSettings.hourFormat) chatSettings.hourFormat = '24';

let lastSigUpdate = Date.now();
let lastInteractionTime = Date.now();

chatHistory.forEach(msg => {
  if (!msg) return;
  if (typeof msg.content === 'string') msg.content = { val: msg.content };
  if (!msg.content) msg.content = { val: '' };
  const c = msg.content;
  if (c.val && typeof c.val === 'object') {
    const inner = c.val;
    if (inner.amount !== undefined && c.amount === undefined) c.amount = inner.amount;
    if (inner.note !== undefined && c.note === undefined) c.note = inner.note;
    if (inner.name !== undefined && c.name === undefined) c.name = inner.name;
    if (inner.isOpened !== undefined) c.isOpened = c.isOpened || inner.isOpened;
    c.val = typeof inner.val === 'string' ? inner.val : (inner.name || '');
  }
  if (c.val === undefined || c.val === null) c.val = c.name || c.note || '';
});

function saveAllData() {
  localStorage.setItem('chat_tags', JSON.stringify(tags));
  localStorage.setItem('chat_contents', JSON.stringify(contents));
  localStorage.setItem('my_emojis', JSON.stringify(myEmojis));
  localStorage.setItem('chat_settings', JSON.stringify(chatSettings));
  localStorage.setItem('chat_history', JSON.stringify(chatHistory));
  localStorage.setItem('loc_library', JSON.stringify(locLibrary));
  localStorage.setItem('poke_library', JSON.stringify(pokeLibrary));
  localStorage.setItem('signature_library', JSON.stringify(signatureLibrary));
  localStorage.setItem('interact_library', JSON.stringify(interactLibrary));
}

function showToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2000); }

let confirmCallback = null;
function showConfirm(title, msg, callback) {
  const modal = document.getElementById('confirmModal');
  if (!modal) return; 
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  modal.classList.add('show');
  confirmCallback = callback;
}
window.addEventListener('DOMContentLoaded', () => {
  const cancelConfirm = document.getElementById('cancelConfirm');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  if (cancelConfirm) cancelConfirm.onclick = () => { document.getElementById('confirmModal').classList.remove('show'); confirmCallback = null; };
  if (confirmOkBtn) confirmOkBtn.onclick = () => { 
    document.getElementById('confirmModal').classList.remove('show'); 
    if (confirmCallback) confirmCallback(); 
    confirmCallback = null;
  };
});

function compressImage(file, maxSize = 400) {
  return new Promise(resolve => {
    const t = (file.type || '').toLowerCase();
    // 动图（GIF/WebP）不能用 canvas 压缩，否则丢动画、透明底变黑；直接原样读入
    if (t === 'image/gif' || t === 'image/webp') {
      if (file.size > 2.5 * 1024 * 1024) { resolve(null); return; } // 太大存不进本地存储
      const r = new FileReader();
      r.onload = e => resolve(e.target.result);
      r.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
        else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        // PNG 输出仍用 PNG，保住透明底；其余转 JPEG 省空间
        if (t === 'image/png') resolve(canvas.toDataURL('image/png'));
        else resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}