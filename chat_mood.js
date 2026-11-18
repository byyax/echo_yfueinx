// ===== 情绪池：他此刻的状态，做成一个小气泡挂在最新一条消息下面 =====
// 十种情绪：平静 / 开心 / 激动 / 亲密 / 吃醋 / 烦躁 / 伤心 / 不安 / 隐忍 / 期待。
// 分三个状态层：日常 / 等他回（1 分钟内）/ 久未回（1 分钟以上，越久越平静），
// 每层再按权重抽具体情绪；红包、标签、亲密互动会临时改权重。

const MOOD_POOLS = {
  calm: {
    tone: 'mood-calm',
    pairs: [
      ['平静', '在忙'], ['松弛', '发呆'], ['安稳', '听歌'],
      ['淡然', '刷手机'], ['安静', '忙自己的']
    ]
  },
  happy: {
    tone: 'mood-happy',
    pairs: [
      ['开心', '在线'], ['偷笑', '摸鱼'], ['雀跃', '喝奶茶'],
      ['满足', '看你聊天'], ['得意', '等你夸']
    ]
  },
  excited: {
    tone: 'mood-excited',
    pairs: [
      ['激动', '想见你'], ['兴奋', '睡不着'],
      ['心跳快', '上头'], ['坐不住', '等不及']
    ]
  },
  intimate: {
    tone: 'mood-intimate',
    pairs: [
      ['心跳', '漏拍'], ['耳热', '想靠近'], ['贪心', '再抱会'],
      ['回味', '刚才'], ['眷恋', '不想停']
    ]
  },
  jealous: {
    tone: 'mood-jealous',
    pairs: [
      ['吃醋', '不说'], ['泛酸', '装没事'], ['占有欲', '上来'],
      ['闷着', '不吭声'], ['在意', '那个名字']
    ]
  },
  irritated: {
    tone: 'mood-irritated',
    pairs: [
      ['烦躁', '坐不住'], ['闷火', '不想说话'],
      ['没耐心', '一点就炸'], ['别扭', '别惹我']
    ]
  },
  sad: {
    tone: 'mood-sad',
    pairs: [
      ['失落', '安静'], ['委屈', '想被哄'],
      ['难过', '不说话'], ['鼻酸', '忍住']
    ]
  },
  anxious: {
    tone: 'mood-anxious',
    pairs: [
      ['不安', '数秒'], ['焦急', '等回复'],
      ['慌张', '看手机'], ['坐不住', '转圈']
    ],
    spin: true, tail: '转圈'
  },
  restrained: {
    tone: 'mood-restrained',
    pairs: [
      ['隐忍', '没事'], ['嘴硬', '其实在意'],
      ['克制', '不追问'], ['装没事', '心里翻涌']
    ]
  },
  waiting: {
    tone: 'mood-waiting',
    pairs: [
      ['期待', '等你'], ['耐心', '守着'],
      ['惦记', '偷看'], ['张望', '看手机']
    ],
    pulse: true
  }
};

// 消息里的情绪关键词。先匹配到什么就用什么。
const MOOD_SENTIMENT = [
  {
    tier: 'intimate',
    pairs: [['心跳', '快了'], ['耳热', '想靠近']],
    words: ['亲亲', '抱抱', '想抱', '想亲', '吻', '贴贴', '想要你', '赖着你'],
    emoji: /[😘💋💕💗💞🥰]/
  },
  {
    tier: 'jealous',
    pairs: [['泛酸', '装没事'], ['吃醋', '不说']],
    words: ['吃醋', '嫉妒', '她是谁', '那个女生', '谁啊', '凭什么'],
    emoji: /[😒😑🙄]/
  },
  {
    tier: 'happy',
    pairs: [['开心', '在线'], ['雀跃', '看你聊天'], ['满足', '偷笑']],
    words: ['开心', '高兴', '哈哈', '嘿嘿', '太好了', '好耶', '快乐', '舒服', '幸福', '喜欢你', '想你', '么么', '好棒'],
    emoji: /[😀😁😄😊🥰😍🤗😘💕❤🥳✨]/
  },
  {
    tier: 'excited',
    pairs: [['激动', '想见你'], ['兴奋', '睡不着']],
    words: ['好想见你', '激动', '兴奋', '等不及', '期待'],
    emoji: /[🤩😆🥳]/
  },
  {
    tier: 'sad',
    pairs: [['低落', '安静'], ['委屈', '想被哄'], ['难过', '不说话']],
    words: ['难过', '伤心', '委屈', '想哭', '哭了', '好累', '疲惫', '失望', '孤独', '不想说话', '失眠', '低落'],
    emoji: /[😭😢🥺😞😔😣💔]/
  },
  {
    tier: 'irritated',
    pairs: [['烦躁', '不想说话'], ['生气', '别惹我']],
    words: ['着急', '急死', '快点', '怎么还不', '生气', '讨厌', '气死', '不理你', '烦死了', '好烦', '哼'],
    emoji: /[😤😡🤬😠]/
  }
];
// 说这几句的时候，大概率不是真的没事
const MOOD_DENIAL_WORDS = ['没事', '还好', '没关系', '随便', '算了吧', '不想说', '无所谓'];

let moodSlotEl = null;
let moodTier = null;
let moodPair = null;
let moodShownAt = 0;
let moodEvent = null; // { tier, pair, until, kind }

// ===== 久别回来：记录上次在线时间 =====
const MOOD_SEEN_KEY = 'echo_mood_seen_at';
const MOOD_RETURN_KEY = 'echo_mood_return_at';

function readMoodStamp(key) {
  try { return Number(localStorage.getItem(key)) || 0; } catch (e) { return 0; }
}
function writeMoodStamp(key, v) {
  try { localStorage.setItem(key, String(v)); } catch (e) {}
}
const moodSeenAtBoot = readMoodStamp(MOOD_SEEN_KEY);
function markMoodSeen() { writeMoodStamp(MOOD_SEEN_KEY, Date.now()); }

// ===== 临时加权：标签里出现吃醋/亲密时，把对应情绪顶上去 =====
const moodBoosts = {}; // tier -> { mul, until }

function boostMood(tier, mul, ms) {
  if (!MOOD_POOLS[tier]) return;
  const now = Date.now();
  const old = moodBoosts[tier];
  if (old && old.until > now) old.mul = Math.max(old.mul, mul);
  else moodBoosts[tier] = { mul: mul, until: now + (ms || 5 * 60000) };
  refreshMood(true);
}

const MOOD_JEALOUS_WORDS = ['吃醋', '嫉妒', '占有', '泛酸', '醋'];
const MOOD_INTIMATE_WORDS = ['亲密', '亲亲', '亲吻', '拥抱', '抱抱', '贴贴', '暧昧', '性爱', 'sex', '🍎', '性'];

// 他随机抽到字卡时调用：看这张卡的标签和内容
function boostMoodFromCard(card) {
  if (!card) return;
  let tagName = '';
  if (card.tagId && typeof tags !== 'undefined') {
    const t = tags.find(x => x && x.id === card.tagId);
    if (t) tagName = t.name || '';
  }
  const text = String((card.val || '') + ' ' + tagName);
  if (MOOD_JEALOUS_WORDS.some(w => text.indexOf(w) >= 0)) {
    boostMood('jealous', 4, 5 * 60000);
  }
  if (MOOD_INTIMATE_WORDS.some(w => text.indexOf(w) >= 0)) {
    boostMood('intimate', 5, 5 * 60000);
    boostMood('excited', 1.8, 5 * 60000);
  }
}

function applyMoodBoosts(w) {
  const now = Date.now();
  for (const tier in moodBoosts) {
    const b = moodBoosts[tier];
    if (!b || b.until <= now) { delete moodBoosts[tier]; continue; }
    if (typeof w[tier] !== 'number') w[tier] = 2;
    w[tier] = w[tier] * b.mul;
  }
  return w;
}

function lastRealMsg() {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (m && m.role && m.role !== 'system') return m;
  }
  return null;
}

// 他发来但还没被领的红包/礼物
function unopenedCardFromHim() {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (!m || m.role !== 'other') continue;
    if ((m.type === 'redpacket' || m.type === 'gift') && m.content && !m.content.isOpened) return m;
  }
  return null;
}

// ===== 概率：按场景给权重。数字加起来都是 100，方便你自己调 =====
function moodWeights() {
  const now = Date.now();
  let w;

  const card = unopenedCardFromHim();
  if (card) {
    const waited = now - (card.time || now);
    if (waited < 30000) {
      w = { calm: 15, waiting: 32, happy: 15, excited: 8, intimate: 5, jealous: 5, anxious: 6, restrained: 6, irritated: 4, sad: 4 };
    } else if (waited < 60000) {
      w = { calm: 10, waiting: 45, happy: 4, excited: 2, intimate: 2, jealous: 8, anxious: 12, restrained: 8, irritated: 5, sad: 4 };
    } else if (waited < 180000) {
      w = { calm: 8, waiting: 40, happy: 2, excited: 1, intimate: 1, jealous: 10, anxious: 18, restrained: 9, irritated: 6, sad: 5 };
    } else {
      w = { calm: 12, waiting: 20, happy: 2, excited: 1, intimate: 2, jealous: 12, anxious: 25, restrained: 12, irritated: 8, sad: 6 };
    }
    return applyMoodBoosts(w);
  }

  const last = lastRealMsg();
  // 从"我上次说话 / 打开页面"和"他那条消息"里取更晚的一个
  const since = Math.max(lastInteractionTime || 0, last ? (last.time || 0) : 0);
  const idle = now - since;
  const patience = Math.max(60000, (chatSettings.replyDelay || 0.5) * 60000 * 1.5);
  const hisLast = !!last && last.role === 'other';

  if (hisLast && idle > 15 * 60000) {
    // 很久没回：各自有个人空间，平静才是常态
    w = { calm: 48, waiting: 5, excited: 4, intimate: 5, jealous: 5, irritated: 3, sad: 4, anxious: 6, restrained: 8, happy: 12 };
  } else if (hisLast && idle > 5 * 60000) {
    w = { calm: 38, waiting: 6, excited: 3, intimate: 5, jealous: 8, irritated: 5, sad: 4, anxious: 12, restrained: 10, happy: 9 };
  } else if (hisLast && idle > patience) {
    w = { calm: 28, waiting: 8, excited: 4, intimate: 4, jealous: 10, irritated: 7, sad: 5, anxious: 18, restrained: 10, happy: 6 };
  } else if (hisLast && idle > 25000) {
    w = { calm: 20, waiting: 16, excited: 3, intimate: 3, jealous: 10, irritated: 7, sad: 5, anxious: 14, restrained: 10, happy: 12 };
  } else {
    // 日常：平静和开心为主，负面只是零星
    w = { calm: 26, waiting: 10, excited: 6, intimate: 5, jealous: 7, irritated: 6, sad: 5, anxious: 5, restrained: 10, happy: 20 };
  }
  return applyMoodBoosts(w);
}

function pickMoodTier(w) {
  let total = 0;
  for (const k in w) total += w[k];
  if (total <= 0) return 'calm';
  let r = Math.random() * total;
  for (const k in w) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return 'calm';
}

function pickFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

// ===== 事件：通话 / 消息情绪，短暂压过概率 =====
function pushMoodEvent(tier, pair, ms, kind) {
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.calm;
  moodEvent = {
    tier,
    pair: pair || pickFrom(pool.pairs),
    until: Date.now() + (ms || 180000),
    kind: kind || 'chat'
  };
  refreshMood(true);
}

function activeMoodEvent() {
  if (moodEvent && moodEvent.until <= Date.now()) { moodEvent = null; moodTier = null; }
  return moodEvent;
}

// 我说话时他的反应（只是有可能，不代表一定）
const MY_MOOD_REACTION = {
  happy:     { tier: 'happy',      pairs: [['开心', '被你感染'], ['放心', '看你开心']] },
  excited:   { tier: 'excited',    pairs: [['激动', '被你说得']] },
  intimate:  { tier: 'intimate',   pairs: [['心跳', '快了'], ['耳热', '被你撩到']] },
  jealous:   { tier: 'jealous',    pairs: [['泛酸', '不承认']] },
  sad:       { tier: 'waiting',    pairs: [['担心', '想哄你'], ['心疼', '不知道怎么哄']] },
  irritated: { tier: 'restrained', pairs: [['忍着', '不跟你吵']] },
  anxious:   { tier: 'waiting',    pairs: [['忐忑', '怕你生气'], ['小心', '在哄你']] }
};

// 读一句话的情绪。关键词只是"可能"代表心情，所以每次都要掷一次骰子。
function analyzeMoodFromText(text, fromMe) {
  const t = String(text || '');
  if (!t) return;
  const denial = MOOD_DENIAL_WORDS.some(w => t.indexOf(w) >= 0);
  let hit = null;
  for (const s of MOOD_SENTIMENT) {
    if (s.words.some(w => t.indexOf(w) >= 0) || (s.emoji && s.emoji.test(t))) { hit = s; break; }
  }

  if (fromMe) {
    // 我说"没事"，他可能会多想，但不是每次都当真
    if (denial && Math.random() < 0.45) {
      pushMoodEvent('anxious', ['不安', '是不是我说错话'], 2 * 60000);
      return;
    }
    if (!hit) return;
    // 我发个哭脸也可能只是开玩笑，所以他只有四成会跟着担心
    if (Math.random() > 0.4) return;
    const react = MY_MOOD_REACTION[hit.tier];
    if (!react) return;
    pushMoodEvent(react.tier, pickFrom(react.pairs), 2.5 * 60000);
    return;
  }

  // 他说话：口是心非
  if (denial && Math.random() < 0.55) {
    pushMoodEvent('restrained', ['嘴硬', '其实在意'], 3 * 60000);
    return;
  }
  if (!hit) return;
  // 关键词命中也只是"更可能"变，可能只是随口一说或者开玩笑
  if (Math.random() > 0.55) return;
  // 少量例外：嘴上开心，心里却拧着
  if (Math.random() < 0.12) {
    pushMoodEvent('restrained', ['嘴硬', '不太开心'], 2 * 60000);
    return;
  }
  pushMoodEvent(hit.tier, pickFrom(hit.pairs), 2.5 * 60000);
}

// ===== 一条消息 / 一次互动对心情的影响 =====
function moodEmojiOnly(text) {
  if (!text) return false;
  try {
    return /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍️\s]+$/u.test(text)
      && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(text);
  } catch (e) { return false; }
}

// 聊天不是每句都换心情：普通消息按概率轻刷，特殊互动掷中才加权
function moodAfterMessage(isMe, type, content) {
  const text = (content && content.val != null) ? String(content.val) : '';

  if (type === 'text') analyzeMoodFromText(text, isMe);

  if (type === 'gift' || type === 'redpacket' || type === 'transfer') {
    if (Math.random() < 0.65) {
      boostMood('happy', 2.2, 3 * 60000);
      boostMood('excited', 1.5, 3 * 60000);
      if (!isMe) boostMood('waiting', 1.6, 3 * 60000);
    }
    return;
  }
  if (type === 'musicshare' || type === 'musicinvite') {
    if (Math.random() < 0.6) {
      boostMood('happy', 1.8, 4 * 60000);
      boostMood('intimate', 2.2, 4 * 60000);
      boostMood('excited', 1.5, 4 * 60000);
    }
    return;
  }
  if (type === 'interact') {
    if (Math.random() < 0.6) {
      const strong = /抱|贴|亲|吻|靠/.test((content && content.name) || '');
      boostMood('intimate', strong ? 3 : 1.8, 3 * 60000);
      if (strong) boostMood('excited', 1.4, 3 * 60000);
    }
    return;
  }
  if (type === 'location') {
    if (Math.random() < 0.35) boostMood('calm', 1.3, 2 * 60000);
    return;
  }

  let p = 0.3;
  if (type === 'text') p = isMe ? 0.3 : 0.42;
  else if (type === 'image' || type === 'audio') p = 0.2;
  if (type === 'text' && moodEmojiOnly(text)) p = 0.55;
  if (Math.random() < p) refreshMood(false);
}

// 拆红包 / 接受互动 / 接受一起听
function moodAfterOpen(type) {
  if (type === 'musicinvite') {
    if (Math.random() < 0.7) { boostMood('intimate', 2, 4 * 60000); boostMood('happy', 1.6, 4 * 60000); }
    return;
  }
  if (type === 'interact') {
    if (Math.random() < 0.6) boostMood('intimate', 2, 3 * 60000);
    return;
  }
  if (type === 'gift' || type === 'redpacket' || type === 'transfer') {
    if (Math.random() < 0.5) boostMood('happy', 1.8, 3 * 60000);
    return;
  }
  refreshMood(false);
}

// 久别回来：隔了很久再打开，他更容易是开心/想你
function maybeReunionMood() {
  if (!moodSeenAtBoot) return; // 第一次来，不装作久别重逢
  const now = Date.now();
  const last = lastRealMsg();
  const away = now - moodSeenAtBoot;
  const silence = last ? now - (last.time || now) : 0;
  const gap = Math.max(away, silence);
  if (gap < 30 * 60000) return;

  // 同一段久别只触发一次，2 小时内不重复
  const lastReturn = readMoodStamp(MOOD_RETURN_KEY);
  if (lastReturn && now - lastReturn < 2 * 3600000) return;

  let p = 0.5, tier = 'happy';
  let pairs = [['开心', '回来啦'], ['雀跃', '终于上线']];
  if (gap >= 12 * 3600000) {
    p = 0.88;
    tier = 'intimate';
    pairs = [['想你', '终于来了'], ['心跳', '见到你了'], ['眷恋', '别走了']];
  } else if (gap >= 3 * 3600000) {
    p = 0.7;
    tier = 'excited';
    pairs = [['激动', '可算来了'], ['开心', '等你半天']];
  }
  if (Math.random() > p) return;

  // 超过两天，偶尔嘴硬一下
  if (gap >= 48 * 3600000 && Math.random() < 0.2) {
    pushMoodEvent('restrained', ['嘴硬', '才不想你'], 4 * 60000, 'return');
  } else {
    pushMoodEvent(tier, pickFrom(pairs), 4 * 60000, 'return');
  }
  writeMoodStamp(MOOD_RETURN_KEY, now);
}

// 通话结束后他的心情：大部分会有反应，也留一点"没什么反应"的余地
function moodAfterCall(state, who) {
  if (Math.random() < 0.22) return;
  const dir = (typeof callDirection !== 'undefined') ? callDirection : 'out';
  const secs = (typeof callSeconds !== 'undefined') ? callSeconds : 0;
  const pick = list => list[Math.floor(Math.random() * list.length)];

  if (state === 'completed') {
    if (secs >= 60) pushMoodEvent('happy', pick([['开心', '刚聊完'], ['满足', '还回味'], ['雀跃', '想再打']]), 4 * 60000, 'call');
    else pushMoodEvent('waiting', pick([['舍不得', '挂太快'], ['疑惑', '这就挂了']]), 2 * 60000, 'call');
  } else if (state === 'rejected') {
    if (who === 'me') pushMoodEvent('sad', pick([['失落', '被挂了'], ['委屈', '不接我电话']]), 4 * 60000, 'call'); // 你拒接了他
    else pushMoodEvent('waiting', pick([['为难', '先不接'], ['心虚', '没敢接']]), 3 * 60000, 'call');              // 他拒接了你
  } else if (state === 'unanswered') {
    if (dir === 'in') pushMoodEvent('waiting', pick([['惦记', '等你回拨'], ['失落', '没接到你']]), 4 * 60000, 'call'); // 你没接到他的
    else pushMoodEvent('sad', pick([['抱歉', '在忙'], ['心虚', '没接到']]), 3 * 60000, 'call');                        // 他没接到你的
  } else if (state === 'cancelled') {
    pushMoodEvent('waiting', pick([['疑惑', '怎么挂了'], ['愣住', '刚接通就挂']]), 2 * 60000, 'call');                  // 你中途挂了
  }
}

// ===== 渲染 =====
function shouldShowMood(ev) {
  if (ev) return true; // 通话/情绪事件，就算最后一条是你发的也照显示
  const last = lastRealMsg();
  return !!last && last.role === 'other';
}

function ensureMoodSlot() {
  const chatEl = document.getElementById('chat');
  if (!chatEl) return null;
  if (moodSlotEl && moodSlotEl.isConnected && moodSlotEl.parentElement === chatEl) return moodSlotEl;
  moodSlotEl = document.createElement('div');
  moodSlotEl.id = 'moodSlot';
  moodSlotEl.className = 'mood-slot hide';
  chatEl.appendChild(moodSlotEl);
  return moodSlotEl;
}

function placeMoodSlot(slot) {
  const chatEl = document.getElementById('chat');
  if (!chatEl || !slot) return;
  const nearBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 180;
  if (chatEl.lastElementChild !== slot) chatEl.appendChild(slot);
  if (nearBottom) chatEl.scrollTop = chatEl.scrollHeight;
}

function paintMoodBubble(tier, pair) {
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.calm;
  const slot = ensureMoodSlot();
  if (!slot) return;
  const b = document.createElement('div');
  b.className = 'mood-bubble ' + pool.tone;
  b.innerHTML = `<span class="mood-dot"></span>` +
    `<span class="mood-part">${pair[0]}</span>` +
    `<span class="mood-sep">|</span>` +
    `<span class="mood-part">${pair[1]}</span>`;
  if (pool.spin) {
    b.insertAdjacentHTML('beforeend',
      `<span class="mood-sep">|</span><span class="mood-spin"></span><span class="mood-part">${pool.tail}</span>`);
  } else if (pool.pulse) {
    b.insertAdjacentHTML('beforeend', `<span class="mood-pulse"></span>`);
  }
  slot.innerHTML = '';
  slot.appendChild(b);
  slot.classList.remove('hide');
  placeMoodSlot(slot);
}

// force=true：有新消息/通话/事件时立刻重抽；false：定期轻刷，同档位不闪
function refreshMood(force) {
  const slot = ensureMoodSlot();
  if (!slot) return;

  let ev = activeMoodEvent();
  // 红包一直没领的时候，情绪让位给"等待/着急"；久别重逢和通话优先级更高
  if (ev && ev.kind !== 'call' && ev.kind !== 'return') {
    const card = unopenedCardFromHim();
    if (card && Date.now() - (card.time || 0) > 60000) ev = null;
  }
  if (!shouldShowMood(ev)) { slot.classList.add('hide'); return; }

  const now = Date.now();
  if (ev) {
    if (!force && moodTier === ev.tier && moodPair === ev.pair) {
      slot.classList.remove('hide');
      placeMoodSlot(slot);
      return;
    }
    moodTier = ev.tier;
    moodPair = ev.pair;
    moodShownAt = now;
    paintMoodBubble(ev.tier, ev.pair);
    return;
  }

  const tier = pickMoodTier(moodWeights());
  // 情绪要有惯性：不是新消息/事件触发时，至少停留 35 秒，避免七上八下
  if (!force && moodTier && (now - moodShownAt) < MOOD_MIN_HOLD) {
    slot.classList.remove('hide');
    placeMoodSlot(slot);
    return;
  }
  const pair = pickFrom(MOOD_POOLS[tier].pairs);
  moodTier = tier;
  moodPair = pair;
  moodShownAt = now;
  paintMoodBubble(tier, pair);
}

// 新消息插到末尾时，把情绪气泡重新挪到最后
(function watchChat() {
  const chatEl = document.getElementById('chat');
  if (!chatEl || !window.MutationObserver) return;
  new MutationObserver(() => {
    if (!moodSlotEl || !moodSlotEl.isConnected) return;
    if (moodSlotEl.classList.contains('hide')) return;
    if (chatEl.lastElementChild !== moodSlotEl) chatEl.appendChild(moodSlotEl);
  }).observe(chatEl, { childList: true });
})();

// ===== 刷新节奏：聊天靠消息触发，干等时越等越慢 =====
// 不是"到点必换"，每个 tick 只掷一次概率，更像真人：心情会停一会儿，再慢慢变。
const MOOD_MIN_HOLD = 40000; // 非事件情绪至少停留 40 秒

function moodIdleMs() {
  const last = lastRealMsg();
  const since = Math.max(lastInteractionTime || 0, last ? (last.time || 0) : 0);
  return Date.now() - since;
}

function moodTickDelay() {
  if (activeMoodEvent()) return 15000;
  const last = lastRealMsg();
  if (!last || last.role !== 'other') return 30000; // 最后一条是我发的：气泡本来就藏着
  const idle = moodIdleMs();
  if (idle < 60000) return 20000;       // 刚发完：20 秒考虑一次
  if (idle < 300000) return 40000;      // 1~5 分钟
  if (idle < 900000) return 60000;      // 5~15 分钟
  return 90000;                          // 15 分钟以上
}

function moodTickChance() {
  const last = lastRealMsg();
  if (!last || last.role !== 'other') return 0;
  const idle = moodIdleMs();
  if (idle < 60000) return 0.30;
  if (idle < 300000) return 0.25;
  if (idle < 900000) return 0.18;
  return 0.12;
}

let moodTickTimer = null;
function scheduleMoodTick() {
  if (moodTickTimer) clearTimeout(moodTickTimer);
  moodTickTimer = setTimeout(() => {
    if (Math.random() < moodTickChance()) refreshMood(false);
    scheduleMoodTick();
  }, moodTickDelay());
}
scheduleMoodTick();

markMoodSeen();
setTimeout(() => {
  maybeReunionMood();
  refreshMood(true);
}, 800);
window.addEventListener('load', () => refreshMood(true));

// 在线时每分钟续一次；离开页面后，时间就停在那一刻
setInterval(() => { if (!document.hidden) markMoodSeen(); }, 60000);
window.addEventListener('pagehide', markMoodSeen);
