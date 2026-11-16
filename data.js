let tags = JSON.parse(localStorage.getItem('chat_tags')) || [{ id: 'unclassified', name: '未分类', color: '#8c8c8c' }];
let contents = JSON.parse(localStorage.getItem('chat_contents')) || [];
let myEmojis = JSON.parse(localStorage.getItem('my_emojis')) || [];
let chatSettings = JSON.parse(localStorage.getItem('chat_settings')) || {};
let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
let payPassword = localStorage.getItem('pay_password') || null;

let locLibrary = JSON.parse(localStorage.getItem('loc_library')) || [{ id: 'l1', val: '我在DR世界' }, { id: 'l2', val: '我在CR世界' }];
let pokeLibrary = JSON.parse(localStorage.getItem('poke_library')) || [{id: 'p1', val: '捏了捏你的脸，并亲了你一口'}];
let signatureLibrary = JSON.parse(localStorage.getItem('signature_library')) || [{id: 's1', val: '今天心情不错'}, {id: 's2', val: '想吃小蛋糕'}];

if (locLibrary.length > 0 && typeof locLibrary[0] === 'string') locLibrary = locLibrary.map((v, i) => ({ id: 'l_'+i, val: v }));
if (pokeLibrary.length > 0 && typeof pokeLibrary[0] === 'string') pokeLibrary = pokeLibrary.map((v, i) => ({ id: 'p_'+i, val: v }));
if (signatureLibrary.length > 0 && typeof signatureLibrary[0] === 'string') signatureLibrary = signatureLibrary.map((v, i) => ({ id: 's_'+i, val: v }));

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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}