let tags = JSON.parse(localStorage.getItem('chat_tags')) || [{ id: 'unclassified', name: '未分类', color: '#8c8c8c' }];
let contents = JSON.parse(localStorage.getItem('chat_contents')) || [
  { id: 'c_init_1', type: 'text', val: '我爱你', tagId: 'unclassified' },
  { id: 'c_init_2', type: 'text', val: '我好想你', tagId: 'unclassified' },
  { id: 'c_init_3', type: 'text', val: '今天天气不错', tagId: 'unclassified' },
  { id: 'c_init_4', type: 'text', val: '你吃饭了吗', tagId: 'unclassified' },
  { id: 'c_init_5', type: 'text', val: '我一直在等着你', tagId: 'unclassified' },
  { id: 'c_init_6', type: 'text', val: '你来了', tagId: 'unclassified' },
  { id: 'c_init_e1', type: 'emoji', val: '🥺', tagId: 'unclassified' },
  { id: 'c_init_e2', type: 'emoji', val: '🥰', tagId: 'unclassified' }
];
let myEmojis = JSON.parse(localStorage.getItem('my_emojis')) || [];
let chatSettings = JSON.parse(localStorage.getItem('chat_settings')) || {};
let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
let payPassword = localStorage.getItem('pay_password') || null;

let locLibrary = JSON.parse(localStorage.getItem('loc_library')) || [
  { id: 'l1', val: '我在DR世界' },
  { id: 'l2', val: '我在CR世界' },
  { id: 'l3', val: '在你身边(CR)' },
  { id: 'l4', val: '在忙(DR)' },
  { id: 'l5', val: '我在外出(DR)' },
  { id: 'l6', val: '正在来找你(DR-CR)' },
  { id: 'l7', val: '在工作(DR)' }
];
let pokeLibrary = JSON.parse(localStorage.getItem('poke_library')) || [{id: 'p1', val: '戳了戳你的脸'}, {id: 'p2', val: '拍了拍你的肩'}];
let signatureLibrary = JSON.parse(localStorage.getItem('signature_library')) || [
  {id: 's1', val: '我喜欢夏天和你淋雨。'},
  {id: 's2', val: '想见你的心情，无数次令我心碎。'},
  {id: 's3', val: 'You are the one。'}
];
// 每个互动动作可以配几句不同的回应，发送时随机挑一句
const INTERACT_REPLIES = {
  '摸摸头': ['嗯……再摸一会儿也行', '被你摸得都困了', '头只能你摸，别人不行', '乖，换我摸摸你', '再摸就真困了', '手借你一会儿'],
  '戳戳脸': ['别戳啦，痒~', '你再戳，我可就亲回去了', '戳一下要给钱的', '脸都被你戳软了', '戳轻点', '再戳脸要红了'],
  '抱抱': ['（一把抱住你）', '抱紧点，别松手', '你身上好香', '再抱十秒', '先别动，让我抱会儿', '抱一下就好'],
  '贴贴': ['（凑过来贴贴）', '贴这么近，还让不让人学习了', '行吧，今天格外黏你', '（把下巴搁在你肩上）', '再贴一会儿', '别嫌我黏'],
  '捏捏脸': ['哎呀脸都要捏红啦', '捏坏了你负责', '再捏我就咬你', '轻点，脸都被你捏变形了', '脸要变形了', '手下留情'],
  '举高高': ['哇——飞起来啦！', '再来一次，我还想飞', '举你一点都不费劲', '转一圈？', '放我下来啦', '再来一次']
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

// 对方离线回来的文案，按离线原因分类；上线时优先抽对应分类。
const OFFLINE_REPLY_POOLS = {
  sleep: [
    '不好意思，我睡着了..',
    '刚刚睡着了，让你久等了',
    '我的声音还有点哑，刚睡醒',
    '睡过头了，刚看到消息',
    '刚醒，手机放枕头边没听到'
  ],
  work: [
    '我才忙完回来，我好想你',
    '刚刚在忙，让你久等了',
    '我回来了，刚忙完',
    '刚刚临时有事下线了，现在我回来了',
    '忙完了，终于能看手机'
  ],
  phone_off: [
    '刚刚没看手机，怎么啦？',
    '手机放远了，刚拿到',
    '手机关机了，刚才没接到电话',
    '刚上线，我把你的消息看完了',
    '刚才没看到，现在在呢'
  ],
  generic: [
    '立刻朝你飞奔过来',
    '我回来了',
    '刚上线，我把你的消息看完了',
    '刚刚没看手机，怎么啦？'
  ]
};
// 兼容旧调试代码和兜底用；实际选择走 pickOfflineReturnLine()。
let offlineReplyLines = Array.from(new Set([].concat(
  OFFLINE_REPLY_POOLS.sleep,
  OFFLINE_REPLY_POOLS.work,
  OFFLINE_REPLY_POOLS.phone_off,
  OFFLINE_REPLY_POOLS.generic
)));

function pickWeightedOfflineLine(pools, preferred, genericKey) {
  const rows = [];
  Object.keys(pools).forEach(key => {
    const weight = key === preferred ? 3 : (key === genericKey ? 1 : 0.6);
    (pools[key] || []).forEach(line => rows.push({ line, weight }));
  });
  if (!rows.length) return '';
  const total = rows.reduce((sum, x) => sum + x.weight, 0);
  let r = Math.random() * total;
  for (const row of rows) {
    r -= row.weight;
    if (r <= 0) return row.line;
  }
  return rows[0].line;
}
function pickOfflineReturnLine(reason) {
  return pickWeightedOfflineLine(OFFLINE_REPLY_POOLS, reason || 'generic', 'generic');
}

if (locLibrary.length > 0 && typeof locLibrary[0] === 'string') locLibrary = locLibrary.map((v, i) => ({ id: 'l_'+i, val: v }));
if (pokeLibrary.length > 0 && typeof pokeLibrary[0] === 'string') pokeLibrary = pokeLibrary.map((v, i) => ({ id: 'p_'+i, val: v }));
if (signatureLibrary.length > 0 && typeof signatureLibrary[0] === 'string') signatureLibrary = signatureLibrary.map((v, i) => ({ id: 's_'+i, val: v }));

// ===== 界面配色：白天完整应用；黑夜模式的气泡按主色轻微着色 =====
const PALETTES = [
  // 单色：一个主色走到底
  { id: 'olive',     name: '橄榄绿',   group: 'plain', main: '#A4C639', deep: '#6B8E23', bg: '#ffffff', bubble: '#B8DE86' },
  { id: 'sakura',    name: '樱花粉',   group: 'plain', main: '#F09CAD', deep: '#C2607A', bg: '#ffffff', bubble: '#F8CBD7' },
  { id: 'mist',      name: '雾蓝',     group: 'plain', main: '#6B8FB5', deep: '#4A6A8A', bg: '#ffffff', bubble: '#C9DDF5' },
  { id: 'taro',      name: '香芋紫',   group: 'plain', main: '#9B8AC4', deep: '#6F5E9E', bg: '#ffffff', bubble: '#DCD3F2' },
  { id: 'caramel',   name: '焦糖奶咖', group: 'plain', main: '#B08B6E', deep: '#967A64', bg: '#ffffff', bubble: '#E3D8C4' },
  { id: 'lemon',     name: '柠檬黄',   group: 'plain', main: '#D9B23A', deep: '#A8862A', bg: '#ffffff', bubble: '#F3E3A8' },
  // 其他：模拟常用社交软件的配色
  { id: 'wechat',    name: '微信',     group: 'social', main: '#07C160', deep: '#059A4C', bg: '#EDEDED', bubble: '#95EC69' },
  { id: 'telegram',  name: 'Telegram', group: 'social', main: '#3390EC', deep: '#2481CC', bg: '#E6EBEE', bubble: '#EFFDDE' },
  { id: 'qq',        name: 'QQ',       group: 'social', main: '#12B7F5', deep: '#0E9FD8', bg: '#F2F3F5', bubble: '#0099FF' },
  { id: 'line',      name: 'LINE',     group: 'social', main: '#06C755', deep: '#05A948', bg: '#8CA0B3', bubble: '#8DE055' },
  { id: 'whatsapp',  name: 'WhatsApp', group: 'social', main: '#25D366', deep: '#128C7E', bg: '#ECE5DD', bubble: '#DCF8C6' },
  { id: 'imessage',  name: 'iMessage', group: 'social', main: '#007AFF', deep: '#0062CC', bg: '#FFFFFF', bubble: '#E9E9EB' },
  // 撞色：按钮一个色，气泡另一个色
  { id: 'matcha',    name: '樱花抹茶', group: 'clash', main: '#E0798F', deep: '#B25A6E', bg: '#F7E3EB', bubble: '#CDE3B4', dot: 'linear-gradient(135deg, #FFE0E8 50%, #CDE3B4 50%)' },
  { id: 'mintpeach', name: '蜜桃薄荷', group: 'clash', main: '#E9906C', deep: '#C4703F', bg: '#FBE7DC', bubble: '#B9EBD8', dot: 'linear-gradient(135deg, #FFE0D2 50%, #B9EBD8 50%)' },
  { id: 'saltlemon', name: '海盐柠檬', group: 'clash', main: '#3F97B0', deep: '#2C7489', bg: '#E2F1F7', bubble: '#F3E3A8', dot: 'linear-gradient(135deg, #D9EEF5 50%, #F3E3A8 50%)' },
  { id: 'berry',     name: '莓果奶油', group: 'clash', main: '#A6335C', deep: '#750D37', bg: '#F5DFE9', bubble: '#E3D8C4', dot: 'linear-gradient(135deg, #F2D6E2 50%, #E3D8C4 50%)' },
  { id: 'creamint',  name: '奶油薄荷', group: 'clash', main: '#4FA98A', deep: '#2E8B6A', bg: '#F2E5CE', bubble: '#B9EBD8', dot: 'linear-gradient(135deg, #F3E4C8 50%, #B9EBD8 50%)' },
  { id: 'sunblue',   name: '落日橘蓝', group: 'clash', main: '#E07B39', deep: '#B55B22', bg: '#FAE3CE', bubble: '#BFD8F2', dot: 'linear-gradient(135deg, #FAD8BC 50%, #BFD8F2 50%)' },
  { id: 'matcocoa',  name: '抹茶可可', group: 'clash', main: '#7A9A4E', deep: '#5C7A38', bg: '#EDE3CD', bubble: '#E5D3BC', dot: 'linear-gradient(135deg, #E8D6C3 50%, #DDEBCB 50%)' },
  { id: 'seagrape',  name: '海盐葡萄', group: 'clash', main: '#5F8FA8', deep: '#436E86', bg: '#DFECF4', bubble: '#DCCBF0', dot: 'linear-gradient(135deg, #D9E8F1 50%, #DCCBF0 50%)' },
  { id: 'sakugreen', name: '樱花墨绿', group: 'clash', main: '#D9738A', deep: '#AF5369', bg: '#F4E3DD', bubble: '#C9DFC2', dot: 'linear-gradient(135deg, #F7DCE4 50%, #C9DFC2 50%)' },
  { id: 'spring',    name: '春樱野草', group: 'clash', main: '#6E9A5A', deep: '#4C7A3E', bg: '#F6EAE6', bubble: '#CDE3B4', me: '#FAD7DF', dot: 'linear-gradient(135deg, #FAD7DF 50%, #CDE3B4 50%)' },
  { id: 'peachmint', name: '桃气薄荷', group: 'clash', main: '#E0798F', deep: '#B25A6E', bg: '#FCEBE3', bubble: '#B9EBD8', me: '#FFD8C7', dot: 'linear-gradient(135deg, #FFD8C7 50%, #B9EBD8 50%)' },
  // 科技：黑白灰银，低饱和、强对比
  { id: 'graphite',  name: '石墨灰',   group: 'tech',  main: '#4A4F57', deep: '#2E3238', bg: '#F2F3F5', bubble: '#D9DEE4' },
  { id: 'silver',    name: '银灰',     group: 'tech',  main: '#8A929C', deep: '#5F676F', bg: '#F7F8FA', bubble: '#E2E6EA' },
  { id: 'mono',      name: '极简黑白', group: 'tech',  main: '#1F2328', deep: '#000000', bg: '#FAFAFA', bubble: '#E6E8EA' },
  { id: 'techblue',  name: '科技蓝灰', group: 'tech',  main: '#5A6B7B', deep: '#37454F', bg: '#F1F5F8', bubble: '#DCE6EE' },
  // 渐变：气泡本身是渐变
  { id: 'sunset',    name: '晚霞渐变', group: 'grad',  main: '#E9715E', deep: '#C24F3E', bg: '#fff8f5', bubble: '#FFD3A8', dot: 'linear-gradient(135deg, #FFD9A8, #FFB0B8)' },
  { id: 'bluepink',  name: '蓝粉渐变', group: 'grad',  main: '#7B93C4', deep: '#5B6F9E', bg: '#f8fafd', bubble: '#C9DDF5', dot: 'linear-gradient(135deg, #C9DDF5, #F7CBD7)' },
  { id: 'aurora',    name: '极光渐变', group: 'grad',  main: '#7C6BA8', deep: '#5C4E86', bg: '#F6F4FB', bubble: '#D9CBF4', dot: 'linear-gradient(135deg, #D9CBF4, #BFE8E3)' },
  { id: 'rosegold',  name: '玫瑰金',   group: 'grad',  main: '#C97A7E', deep: '#A2545A', bg: '#FDF5F2', bubble: '#F7CBCB', dot: 'linear-gradient(135deg, #F7CBCB, #F4DDB2)' },
  { id: 'ocean',     name: '深海渐变', group: 'grad',  main: '#4E7FA8', deep: '#35617F', bg: '#F2F8FC', bubble: '#C4E3F6', dot: 'linear-gradient(135deg, #C4E3F6, #A5DCEA)' },
  { id: 'lilacpeach',name: '丁香蜜桃', group: 'grad',  main: '#A27FB8', deep: '#7C5C96', bg: '#FBF6FB', bubble: '#E6D6F6', dot: 'linear-gradient(135deg, #E6D6F6, #FFD9C9)' },
  { id: 'mintlime',  name: '薄荷青柠', group: 'grad',  main: '#5E9E7E', deep: '#417A5F', bg: '#F4FAF6', bubble: '#C9EDD9', dot: 'linear-gradient(135deg, #C9EDD9, #E6F4B9)' },
  { id: 'candypink', name: '糖果粉紫', group: 'grad',  main: '#D171A0', deep: '#A8507C', bg: '#FDF3F9', bubble: '#FFD2E4', dot: 'linear-gradient(135deg, #FFD2E4, #E4C9F6)' }
];
// 删掉的旧配色自动回到默认，避免设置里残留一个不存在的 id
if (!PALETTES.some(p => p.id === chatSettings.palette)) chatSettings.palette = 'olive';
const PALETTE_GROUPS = [
  { id: 'plain', label: '单色' },
  { id: 'clash', label: '撞色' },
  { id: 'grad',  label: '渐变' },
  { id: 'tech',  label: '科技' },
  { id: 'social', label: '其他' }
];

if (!chatSettings.otherName) chatSettings.otherName = '小云';
if (!chatSettings.myName) chatSettings.myName = '你';
if (!chatSettings.signature) chatSettings.signature = '我喜欢夏天和你淋雨。';
// 拍一拍：迁移新字段（原来是 myPat/hisPat，现在是 myPatAction + myPatSuffix）
if (!chatSettings.myPatAction) chatSettings.myPatAction = '拍了拍';
if (chatSettings.myPatSuffix === undefined) chatSettings.myPatSuffix = '的后背';
if (chatSettings.replyDelay === undefined) chatSettings.replyDelay = 0.5;
if (chatSettings.replyCount === undefined) chatSettings.replyCount = 1;
if (chatSettings.sigTimer === undefined || chatSettings.sigTimer < 15) chatSettings.sigTimer = 15;
if (chatSettings.autoReplyTime === undefined) chatSettings.autoReplyTime = 0;
if (chatSettings.autoReplyCount === undefined) chatSettings.autoReplyCount = 1;
if (chatSettings.moodEnabled === undefined) chatSettings.moodEnabled = true;
if (chatSettings.showTyping === undefined) chatSettings.showTyping = true;
if (chatSettings.readReceipts === undefined) chatSettings.readReceipts = false;
if (chatSettings.notifications === undefined) chatSettings.notifications = false;
// 开场动画是否跟随当前配色；关闭时固定使用默认绿色
if (chatSettings.bootTint === undefined) chatSettings.bootTint = true;

// 半夜判定：00:00–05:00。只用于熬夜情绪和夜间离线概率，不改变白天作息。
function isLateNightHour() {
  const h = new Date().getHours();
  return h >= 0 && h < 5;
}
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

let saveAllDataTimer = null;
let saveAllDataPending = false;

function lastHistoryTime(list) {
  for (let i = (list || []).length - 1; i >= 0; i--) {
    const m = list[i];
    if (m && m.time) return m.time;
  }
  return 0;
}
function historyKeyOf(m) {
  const c = (m && m.content) || {};
  return [m && m.time, m && m.role, m && m.type, c.val, c.name, c.amount].join('|');
}
function mergeHistoryLists(current, incoming) {
  const map = new Map();
  (current || []).forEach(m => { if (m) map.set(historyKeyOf(m), m); });
  (incoming || []).forEach(m => { if (m) map.set(historyKeyOf(m), m); });
  return Array.from(map.values()).sort((a, b) => (a.time || 0) - (b.time || 0));
}

let lastStorageWarnAt = 0;
function warnStorageProblem() {
  const now = Date.now();
  if (now - lastStorageWarnAt < 30000) return;
  lastStorageWarnAt = now;
  if (typeof showToast === 'function') {
    showToast('本地存储已满，最近的消息可能没有保存；请先导出备份并清理记录');
  }
}
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    warnStorageProblem();
    return false;
  }
}

function persistAllDataNow() {
  if (saveAllDataTimer) { clearTimeout(saveAllDataTimer); saveAllDataTimer = null; }
  if (!saveAllDataPending) return;
  saveAllDataPending = false;

  // 删除、清空、导入是有意修改历史，不能又被旧存档合并回来。
  const skipHistoryMerge = window.__skipHistoryMerge === true;
  window.__skipHistoryMerge = false;

  // 多开页面时，旧页面不能拿自己落后的 chatHistory 覆盖新页面刚保存的消息。
  if (!skipHistoryMerge) {
    try {
      const storedRaw = localStorage.getItem('chat_history');
      if (storedRaw) {
        const stored = JSON.parse(storedRaw);
        if (Array.isArray(stored) && lastHistoryTime(stored) > lastHistoryTime(chatHistory)) {
          chatHistory = mergeHistoryLists(chatHistory, stored);
        }
      }
    } catch (e) {}
  }

  let historyJson = '[]';
  try { historyJson = JSON.stringify(chatHistory); } catch (e) { warnStorageProblem(); }

  safeSetItem('chat_tags', JSON.stringify(tags));
  safeSetItem('chat_contents', JSON.stringify(contents));
  safeSetItem('my_emojis', JSON.stringify(myEmojis));
  safeSetItem('chat_settings', JSON.stringify(chatSettings));
  const historySaved = safeSetItem('chat_history', historyJson);
  safeSetItem('loc_library', JSON.stringify(locLibrary));
  safeSetItem('poke_library', JSON.stringify(pokeLibrary));
  safeSetItem('signature_library', JSON.stringify(signatureLibrary));
  safeSetItem('interact_library', JSON.stringify(interactLibrary));

  // localStorage 正常时低频备份；写满时立刻写 IndexedDB，避免这一段消息彻底丢。
  if (historySaved) scheduleChatHistoryBackup();
  else writeChatHistoryBackup();
}

// 连续发送/开关卡片时合并写入，避免每次都把整个聊天记录序列化一遍。
function saveAllData() {
  saveAllDataPending = true;
  if (saveAllDataTimer) return;
  saveAllDataTimer = setTimeout(() => {
    saveAllDataTimer = null;
    persistAllDataNow();
  }, 180);
}

// ===== 聊天记录第二层备份 =====
// localStorage 写满、被浏览器清理或多开页面互相覆盖时，IndexedDB 里还能留一份。
const CHAT_BACKUP_DB = 'echo_chat_backup';
const CHAT_BACKUP_STORE = 'history';
let chatBackupDbPromise = null;
let chatBackupTimer = null;

function openChatBackupDb() {
  if (!window.indexedDB) return Promise.reject(new Error('no-indexeddb'));
  if (chatBackupDbPromise) return chatBackupDbPromise;
  chatBackupDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CHAT_BACKUP_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHAT_BACKUP_STORE)) {
        db.createObjectStore(CHAT_BACKUP_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('backup-db-open-failed'));
  });
  return chatBackupDbPromise;
}

function writeChatHistoryBackup() {
  if (!window.indexedDB) return;
  const skipMerge = window.__skipBackupMerge === true;
  window.__skipBackupMerge = false;
  openChatBackupDb().then(db => {
    const tx = db.transaction(CHAT_BACKUP_STORE, 'readwrite');
    const store = tx.objectStore(CHAT_BACKUP_STORE);
    const get = store.get('latest');
    get.onsuccess = () => {
      const old = get.result;
      let outgoing = chatHistory;
      // 旧页面不要用落后的历史覆盖较新的备份；清空/导入/删除除外。
      if (!skipMerge && old && Array.isArray(old.history) && lastHistoryTime(old.history) > lastHistoryTime(outgoing)) {
        outgoing = mergeHistoryLists(outgoing, old.history);
      }
      store.put({ id: 'latest', history: outgoing, savedAt: Date.now() });
    };
  }).catch(() => {});
}

function scheduleChatHistoryBackup() {
  if (chatBackupTimer) return;
  chatBackupTimer = setTimeout(() => {
    chatBackupTimer = null;
    writeChatHistoryBackup();
  }, 1200);
}

function clearChatHistoryBackup() {
  if (chatBackupTimer) { clearTimeout(chatBackupTimer); chatBackupTimer = null; }
  window.__skipBackupMerge = true;
  if (!window.indexedDB) return;
  openChatBackupDb().then(db => {
    const tx = db.transaction(CHAT_BACKUP_STORE, 'readwrite');
    tx.objectStore(CHAT_BACKUP_STORE).delete('latest');
  }).catch(() => {});
}

function restoreChatHistoryBackup() {
  if (!window.indexedDB) return;
  openChatBackupDb().then(db => {
    const tx = db.transaction(CHAT_BACKUP_STORE, 'readonly');
    const get = tx.objectStore(CHAT_BACKUP_STORE).get('latest');
    get.onsuccess = () => {
      const saved = get.result;
      const list = saved && saved.history;
      if (!Array.isArray(list) || !list.length) return;
      if (lastHistoryTime(list) <= lastHistoryTime(chatHistory)) return;
      chatHistory = mergeHistoryLists(chatHistory, list);
      saveAllData();
      if (window.__appRevealed && typeof renderChatHistoryWindow === 'function') {
        const keep = Math.max(200, chatHistory.length - (typeof chatRenderStart === 'number' ? chatRenderStart : 0));
        renderChatHistoryWindow(keep);
      }
    };
  }).catch(() => {});
}

setTimeout(restoreChatHistoryBackup, 900);

window.addEventListener('pagehide', persistAllDataNow);
window.addEventListener('beforeunload', persistAllDataNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistAllDataNow(); });

// 往按钮里放图标字符时，包一层 span，好让"图标色调"滤镜作用到它
function setIconText(el, glyph) {
  if (!el) return;
  el.innerHTML = '';
  const s = document.createElement('span');
  s.className = 'icon-glyph';
  s.textContent = glyph;
  el.appendChild(s);
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