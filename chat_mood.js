// ===== 情绪池：他此刻的状态，做成一个小气泡挂在最新一条消息下面 =====
// 15 档情绪数据在 mood_pools.js；这里只负责抽签、权重、事件和渲染。
// 第一格永远是情绪，第二、三格是进一步状态 / 通用补充 / 另一条情绪。

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
    tier: 'anxiety',
    pairs: [['焦虑', '睡不着'], ['焦躁', '静不下来'], ['心神不宁', '想太多']],
    words: ['焦虑', '压力', '熬夜', '睡不着', '心神不宁', '静不下来'],
    emoji: /[😟😖😵‍💫]/
  },
  {
    tier: 'sleepy',
    pairs: [['困倦', '揉眼睛'], ['发困', '打了个哈欠'], ['困', '想睡']],
    words: ['好困', '困了', '困死', '想睡', '睡觉', '晚安', '没睡醒', '失眠'],
    emoji: /[😴🥱😪]/
  },
  {
    tier: 'playful',
    pairs: [['手痒', '想逗你'], ['坏笑', '打什么主意'], ['想闹', '等你接招']],
    words: ['无聊', '陪我玩', '逗你', '玩吗', '出来玩', '在干嘛'],
    emoji: /[😜🤪😏]/
  },
  {
    tier: 'thoughtful',
    pairs: [['惦记', '你在干嘛'], ['走神', '想起你'], ['出神', '盯着聊天框']],
    words: ['忙吗', '注意安全', '早点睡', '什么时候回来', '到家了吗'],
    emoji: /[💭]/
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
let moodBootReady = false; // 启动页完全退出前不画情绪，避免动画被启动页吃掉

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

// ===== 临时热度：事件把某个情绪顶上去，随后按剩余时间衰减 =====
const moodBoosts = {}; // tier -> { mul, start, until }

function boostMood(tier, mul, ms) {
  if (!MOOD_POOLS[tier]) return;
  const now = Date.now();
  const dur = ms || 5 * 60000;
  const capped = Math.min(8, Math.max(1, mul));
  const old = moodBoosts[tier];
  if (old && old.until > now) {
    old.mul = Math.min(8, Math.max(old.mul, capped));
    old.until = Math.max(old.until, now + dur);
    old.start = now;
  } else {
    moodBoosts[tier] = { mul: capped, start: now, until: now + dur };
  }
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
    const span = Math.max(1, b.until - (b.start || b.until));
    const remain = Math.max(0, Math.min(1, (b.until - now) / span));
    const factor = 1 + (b.mul - 1) * remain;
    w[tier] = (typeof w[tier] === 'number' ? w[tier] : 2) * factor;
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

// 他发来但还没被处理的特殊卡片：红包、礼物、互动、一起听、选择
function unopenedCardFromHim() {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (!m || m.role !== 'other' || !m.content) continue;
    if (m.type === 'choice') {
      if (!m.content.chosen || !m.content.chosen.length) return m;
      continue;
    }
    if (m.type === 'redpacket' || m.type === 'gift' || m.type === 'interact' || m.type === 'musicinvite') {
      if (!m.content.isOpened) return m;
    }
  }
  return null;
}

// ===== 权重：基础权重 + 临时热度 + 衰减 =====
function moodWeights() {
  const now = Date.now();
  const w = Object.assign({}, MOOD_BASE_WEIGHTS);

  // 未处理的卡片：等待、不安、吃醋上升，但平静不会被完全压掉
  const card = unopenedCardFromHim();
  if (card) {
    const waited = now - (card.time || now);
    const pressure = waited < 30000 ? 0.6 : (waited < 60000 ? 1 : (waited < 180000 ? 1.4 : 1.8));
    w.waiting += 7 * pressure;
    w.anxious += 5 * pressure;
    w.jealous += 3 * pressure;
    w.calm = Math.max(10, w.calm - 4 * pressure);
  }

  const last = lastRealMsg();
  const since = Math.max(lastInteractionTime || 0, last ? (last.time || 0) : 0);
  const idle = now - since;
  const patience = Math.max(60000, (chatSettings.replyDelay || 0.5) * 60000 * 1.5);
  const hisLast = !!last && last.role === 'other';

  if (hisLast) {
    if (idle < 25000) {
      w.waiting += 4; w.anxious += 3; w.happy += 2;
    } else if (idle < patience) {
      w.waiting += 8; w.anxious += 6; w.jealous += 3;
      w.calm = Math.max(12, w.calm - 3);
    } else if (idle < 5 * 60000) {
      w.waiting += 6; w.anxious += 8; w.jealous += 3; w.thoughtful += 2;
      w.calm = Math.max(12, w.calm - 2);
    } else if (idle < 15 * 60000) {
      w.waiting += 3; w.anxious += 4; w.thoughtful += 4;
      w.calm += 3;
    } else {
      // 久了会平静，但等待/惦记保留，不会归零
      w.waiting += 2; w.thoughtful += 5; w.calm += 8;
    }
  } else {
    w.calm += 2; w.happy += 2;
  }

  applyMoodBoosts(w);
  // 平静永远不压过一切
  if (w.calm > 32) w.calm = 32;
  if (w.waiting < 2) w.waiting = 2;
  return w;
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

// ===== 情绪路径：第一格情绪，第二、三格按分支生成 =====
const MOOD_REPEAT_PLUS_CHANCE = 0.04;  // 字面重复 开心+
const MOOD_EMOJI_CHANCE = 0.12;        // 第三格换成 emoji

function pickOtherTier(source, excludes) {
  const blocked = new Set(Array.isArray(excludes) ? excludes : [excludes]);
  blocked.add(source);
  const keys = Object.keys(MOOD_POOLS).filter(k => !blocked.has(k));
  if (!keys.length) return 'calm';
  const map = MOOD_TRANSITIONS[source] || {};
  let total = 0;
  const weights = keys.map(k => {
    const v = typeof map[k] === 'number' ? map[k] : 0.45;
    total += v;
    return v;
  });
  let r = Math.random() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

function pickMoodDepth() {
  const r = Math.random();
  if (r < 0.30) return 1;
  if (r < 0.70) return 2;
  return 3;
}

function buildMoodParts(tier, opts) {
  const options = opts || {};
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.calm;
  const depth = options.depth || pickMoodDepth();
  const first = pickFrom(pool.first) || '平静';
  const parts = [first];
  let secondSame = false;
  let secondTier = null;
  let repeatBase = '';

  // 刷新不一定三层都有：先决定这次要显示 1 / 2 / 3 段
  if (depth === 1) return parts;

  // 第二格
  const r2 = Math.random();
  if (r2 < 0.45) {
    secondSame = true;
    if (Math.random() < MOOD_REPEAT_PLUS_CHANCE) {
      repeatBase = first;
      parts.push(first + '+');
    } else {
      parts.push(pickFrom(pool.second));
    }
  } else if (r2 < 0.75) {
    parts.push(pickFrom(MOOD_SUPPLEMENTS));
  } else if (r2 < 0.90) {
    secondTier = pickOtherTier(tier);
    parts.push(pickFrom(MOOD_POOLS[secondTier].first));
  } else if (!options.refreshed) {
    let newTier = pickMoodTier(moodWeights());
    if (newTier === tier) newTier = pickOtherTier(tier);
    return buildMoodParts(newTier, { refreshed: true, depth: pickMoodDepth() });
  } else {
    parts.push(pickFrom(MOOD_SUPPLEMENTS));
  }

  if (depth === 2) return parts;

  // 第三格
  const r3 = Math.random();
  let thirdTier = null;
  if (secondSame) {
    if (r3 < 0.50) {
      if (repeatBase && Math.random() < 0.45) parts.push(repeatBase + '++');
      else parts.push(pickFrom(pool.third));
    } else if (r3 < 0.75) {
      parts.push(pickFrom(MOOD_SUPPLEMENTS));
    } else if (r3 < 0.95) {
      thirdTier = pickOtherTier(tier);
      parts.push(pickFrom(MOOD_POOLS[thirdTier].first));
    }
  } else if (secondTier) {
    if (r3 < 0.55) {
      parts.push(pickFrom(MOOD_POOLS[secondTier].second));
    } else if (r3 < 0.75) {
      parts.push(pickFrom(MOOD_SUPPLEMENTS));
    } else if (r3 < 0.90) {
      thirdTier = pickOtherTier(secondTier, [tier]);
      parts.push(pickFrom(MOOD_POOLS[thirdTier].first));
    }
  } else {
    if (r3 < 0.55) parts.push(pickFrom(pool.third));
    else if (r3 < 0.80) parts.push(pickFrom(MOOD_SUPPLEMENTS));
  }

  // emoji 只作为第三格候补，不绑定字面重复
  if (parts.length >= 2 && Math.random() < MOOD_EMOJI_CHANCE) {
    const emojiTier = thirdTier || secondTier || tier;
    const emojiPool = (MOOD_POOLS[emojiTier] || pool).emoji || [];
    if (emojiPool.length) {
      const em = pickFrom(emojiPool);
      if (parts.length >= 3) parts[2] = em;
      else parts.push(em);
    }
  }
  return parts;
}

function tierOfFirstText(text) {
  for (const k in MOOD_POOLS) {
    if (MOOD_POOLS[k].first.includes(text)) return k;
  }
  return null;
}

// 待机时给已有情绪加一格：只追加，不重画前面的内容
function nextMoodPart(tier, parts) {
  const pool = MOOD_POOLS[tier];
  if (!pool || !parts || parts.length >= 3) return null;
  if (parts.length === 1) {
    const r = Math.random();
    if (r < 0.45) {
      const first = parts[0];
      return Math.random() < MOOD_REPEAT_PLUS_CHANCE ? first + '+' : pickFrom(pool.second);
    }
    if (r < 0.75) return pickFrom(MOOD_SUPPLEMENTS);
    return pickFrom(MOOD_POOLS[pickOtherTier(tier)].first);
  }

  const p2 = parts[1];
  const base = p2.replace(/\+{1,2}$/, '');
  if (/\+{1,2}$/.test(p2)) {
    const r = Math.random();
    if (r < 0.45) return p2.endsWith('++') ? pickFrom(pool.third) : base + '++';
    if (r < 0.80) return pickFrom(pool.third);
    return pickFrom(MOOD_POOLS[pickOtherTier(tier)].first);
  }
  if (pool.second.includes(p2) || pool.third.includes(p2)) {
    const r = Math.random();
    if (r < 0.50) return pickFrom(pool.third);
    if (r < 0.75) return pickFrom(MOOD_SUPPLEMENTS);
    return pickFrom(MOOD_POOLS[pickOtherTier(tier)].first);
  }
  if (MOOD_SUPPLEMENTS.includes(p2)) {
    const r = Math.random();
    if (r < 0.55) return pickFrom(pool.third);
    if (r < 0.80) return pickFrom(MOOD_SUPPLEMENTS);
    return null;
  }
  const otherTier = tierOfFirstText(p2);
  if (otherTier) {
    const r = Math.random();
    if (r < 0.55) return pickFrom(MOOD_POOLS[otherTier].second);
    if (r < 0.75) return pickFrom(MOOD_SUPPLEMENTS);
    return pickFrom(MOOD_POOLS[pickOtherTier(otherTier, [tier])].first);
  }
  return Math.random() < 0.55 ? pickFrom(pool.third) : null;
}

function appendMoodPart(part) {
  const slot = ensureMoodSlot();
  const b = slot && slot.querySelector('.mood-bubble');
  if (!b || !part) return false;
  // 升档只追加新段：整颗气泡横向“长出来”，新段单独弹入，颜色保持不变。
  b.querySelectorAll('.mood-new').forEach(el => el.classList.remove('mood-new'));
  b.insertAdjacentHTML('beforeend', `<span class="mood-sep">|</span>` + moodPartHTML(part));
  let added = [];
  let last = b.lastElementChild;
  if (last && last.classList.contains('mood-anim')) {
    added.push(last);
    last = last.previousElementSibling;
  }
  if (last && last.classList.contains('mood-part')) added.push(last);
  const sep = last && last.previousElementSibling;
  if (sep && sep.classList.contains('mood-sep')) added.push(sep);
  added.forEach(el => el.classList.add('mood-new'));
  b.classList.remove('mood-pop', 'mood-switch', 'mood-upgrade');
  void b.offsetWidth;
  b.classList.add('mood-upgrade');
  placeMoodSlot(slot);
  return true;
}

// ===== 事件：通话 / 消息情绪，短暂压过概率 =====
function pushMoodEvent(tier, pair, ms, kind) {
  if (chatSettings.moodEnabled === false) return;
  moodEvent = {
    tier,
    pair: pair || buildMoodParts(tier),
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
  anxious:   { tier: 'waiting',    pairs: [['忐忑', '怕你生气'], ['小心', '在哄你']] },
  anxiety:   { tier: 'waiting',    pairs: [['担心', '想让你放松'], ['心疼', '别熬太晚']] }
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

// 网络差/离线时连发消息：等待和焦虑会随着消息数量上升。
function noteBadConnectionMessages() {
  const offline = typeof getOtherStatusMain === 'function' && getOtherStatusMain() === '离线';
  const slow = typeof getOtherNetworkMode === 'function' && getOtherNetworkMode() === '2G';
  if (!offline && !slow) return;
  const n = (typeof countMyMessageStreak === 'function') ? countMyMessageStreak() : 0;
  if (!n) return;
  window.__badConnectionMoodPending = true;
  const base = offline ? 1.1 : 0.7;
  boostMood('anxious', Math.min(6, base + n * 0.72), 10 * 60000);
  boostMood('waiting', Math.min(5, 0.4 + n * 0.58), 10 * 60000);
  if (n >= 4) boostMood('sad', Math.min(2.6, 0.8 + n * 0.18), 8 * 60000);
  if (offline && n >= 3) boostMood('restrained', 1.15, 7 * 60000);
}

// 离线回来：连着发了几条，决定他回来时更偏等待、担心还是慌。
function moodAfterOfflineReturn(count) {
  if (!count || chatSettings.moodEnabled === false) return;
  let tier = 'waiting';
  let pair;
  if (count >= 5) {
    tier = 'anxious';
    pair = pickFrom([
      ['焦急', '怎么发了这么多'],
      ['担心', '是不是出什么事了'],
      ['慌', '我刚刚没看到']
    ]);
    boostMood('anxious', 3.4, 10 * 60000);
    boostMood('waiting', 2.2, 8 * 60000);
    boostMood('sad', 1.5, 8 * 60000);
  } else if (count >= 2) {
    tier = 'waiting';
    pair = pickFrom([
      ['担心', '等很久了吧'],
      ['不安', '怎么突然发这么多'],
      ['心虚', '刚看到']
    ]);
    boostMood('waiting', 2.4, 8 * 60000);
    boostMood('anxious', 2.0, 8 * 60000);
  } else {
    pair = pickFrom([
      ['抱歉', '刚看到'],
      ['心虚', '没及时回你']
    ]);
    boostMood('waiting', 1.4, 6 * 60000);
  }
  pushMoodEvent(tier, pair, 4 * 60000, 'return');
}

// 聊天不是每句都换心情：普通消息按概率轻刷，特殊互动掷中才加权
function moodAfterMessage(isMe, type, content) {
  const text = (content && content.val != null) ? String(content.val) : '';

  if (isMe) noteBadConnectionMessages();
  else if (window.__badConnectionMoodPending) {
    // 2G/离线期间连发后，他终于回复时把等待/焦虑的情绪显示出来。
    window.__badConnectionMoodPending = false;
    refreshMood(true);
  }
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
  if (type === 'choice') {
    if (Math.random() < 0.55) {
      boostMood('playful', 2, 3 * 60000);
      boostMood('thoughtful', 1.6, 3 * 60000);
    }
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
  if (chatSettings.moodEnabled === false) return;
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

// ===== 熬夜：深夜登录 / 深夜长时间停留 =====
const LATE_NIGHT_KEY = 'echo_late_night_at';
let lateNightSince = 0;
let lastLateNightLongAt = 0;

function triggerLateNightMood() {
  const roll = Math.random();
  let tier = 'anxious';
  let pair;
  if (roll < 0.50) {
    tier = 'anxious';
    pair = pickFrom([
      ['担心', '你又在熬夜'],
      ['不安', '快去睡'],
      ['担心', '身体会吃不消']
    ]);
  } else if (roll < 0.80) {
    tier = 'anxiety';
    pair = pickFrom([
      ['焦虑', '熬夜不好'],
      ['焦躁', '几点了']
    ]);
  } else {
    tier = 'irritated';
    pair = pickFrom([
      ['生气', '你又不睡'],
      ['烦躁', '快去睡觉']
    ]);
  }
  boostMood('anxious', 2.4, 10 * 60000);
  boostMood('anxiety', 2.0, 10 * 60000);
  if (tier === 'irritated') boostMood('irritated', 1.8, 8 * 60000);
  pushMoodEvent(tier, pair, 5 * 60000, 'late');
}

// 深夜第一次进来：一晚最多一次
function maybeLateNightMood() {
  if (chatSettings.moodEnabled === false || !isLateNightHour()) return;
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let last = '';
  try { last = localStorage.getItem(LATE_NIGHT_KEY) || ''; } catch (e) {}
  if (last === key) return;
  try { localStorage.setItem(LATE_NIGHT_KEY, key); } catch (e) {}
  if (Math.random() < 0.75) triggerLateNightMood();
}

// 深夜在界面里停留超过 45 分钟：每隔一段时间再掷一次
function checkLateNightStay() {
  if (!isLateNightHour()) { lateNightSince = 0; return; }
  if (!lateNightSince) lateNightSince = Date.now();
  if (Date.now() - lateNightSince < 45 * 60000) return;
  if (Date.now() - lastLateNightLongAt < 45 * 60000) return;
  if (Math.random() < 0.35) {
    lastLateNightLongAt = Date.now();
    triggerLateNightMood();
  }
}

// 通话结束后他的心情：大部分会有反应，也留一点"没什么反应"的余地
function moodAfterCall(state, who) {
  if (Math.random() < 0.22) return;
  const dir = (typeof callDirection !== 'undefined') ? callDirection : 'out';
  const secs = (typeof callSeconds !== 'undefined') ? callSeconds : 0;
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const boost = (tier, mul, ms) => { if (typeof boostMood === 'function') boostMood(tier, mul, ms); };

  if (state === 'completed') {
    if (secs >= 60) {
      pushMoodEvent('happy', pick([['开心', '刚聊完'], ['满足', '还回味'], ['雀跃', '想再打']]), 4 * 60000, 'call');
      boost('happy', 1.45, 8 * 60000);
      boost('intimate', 1.25, 6 * 60000);
    } else {
      pushMoodEvent('waiting', pick([['舍不得', '挂太快'], ['疑惑', '这就挂了']]), 2 * 60000, 'call');
      boost('waiting', 1.2, 5 * 60000);
    }
  } else if (state === 'rejected') {
    if (who === 'me') {
      // 他打给我，我没接就挂了：他更容易失落、委屈
      pushMoodEvent('sad', pick([['失落', '被挂了'], ['委屈', '不接我电话']]), 4 * 60000, 'call');
      boost('sad', 1.4, 8 * 60000);
      boost('restrained', 1.15, 6 * 60000);
    } else {
      // 我打给他，他没接就挂了：他偏为难、心虚
      pushMoodEvent('waiting', pick([['为难', '先不接'], ['心虚', '没敢接']]), 3 * 60000, 'call');
      boost('waiting', 1.25, 6 * 60000);
      boost('anxious', 1.2, 6 * 60000);
    }
  } else if (state === 'unanswered') {
    if (dir === 'in') {
      // 他打给我，我没接到：他惦记、等你回拨
      pushMoodEvent('waiting', pick([['惦记', '等你回拨'], ['失落', '没接到你']]), 4 * 60000, 'call');
      boost('waiting', 1.45, 8 * 60000);
      boost('anxious', 1.3, 8 * 60000);
    } else {
      // 我打给他，他没接到：他抱歉、心虚
      pushMoodEvent('sad', pick([['抱歉', '在忙'], ['心虚', '没接到']]), 3 * 60000, 'call');
      boost('sad', 1.25, 6 * 60000);
      boost('anxious', 1.15, 5 * 60000);
    }
  } else if (state === 'cancelled') {
    pushMoodEvent('waiting', pick([['疑惑', '怎么挂了'], ['错愕', '刚接通就挂']]), 2 * 60000, 'call');
    boost('waiting', 1.2, 5 * 60000);
  }
}

// ===== 渲染 =====
function shouldShowMood(ev) {
  if (ev) return true; // 通话/情绪事件，就算最后一条是你发的也照显示
  const last = lastRealMsg();
  if (!last || last.role !== 'other') return false;
  const chatEl = document.getElementById('chat');
  if (!chatEl) return true;
  const lastEl = Array.from(chatEl.children)
    .filter(el => el !== moodSlotEl && !el.classList.contains('mood-slot'))
    .pop();
  // 拍一拍是系统灰字：普通情绪先藏着，等下一次真实消息
  if (lastEl && lastEl.classList.contains('sys')) return false;
  return true;
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
  const lastEl = Array.from(chatEl.children).filter(el => el !== slot).pop();
  // 事件情绪如果出现在拍一拍之后，居中放在系统灰字下面
  slot.classList.toggle('pat-mode', !!(lastEl && lastEl.classList.contains('sys')));
  if (chatEl.lastElementChild !== slot) chatEl.appendChild(slot);
  if (nearBottom) chatEl.scrollTop = chatEl.scrollHeight;
}

function moodPartHTML(part) {
  const text = (typeof part === 'string') ? part : ((part && part.text) || '');
  if (!text) return '';
  const plus = text.match(/^(.*?)(\+{1,2})$/);
  const isEmoji = /^\p{Extended_Pictographic}/u.test(text);
  let label = text;
  if (plus) {
    label = `${plus[1]}<span class="mood-plus">${plus[2]}</span>`;
  }
  let html = `<span class="mood-part${isEmoji ? ' mood-emoji' : ''}">${label}</span>`;
  const anim = MOOD_ANIM_BY_TEXT[text];
  if (anim) html += `<span class="mood-anim mood-${anim}"></span>`;
  return html;
}

function paintMoodBubble(tier, pair, mode) {
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.calm;
  const slot = ensureMoodSlot();
  if (!slot) return;
  let b = slot.querySelector('.mood-bubble');
  if (!b) {
    b = document.createElement('div');
    slot.appendChild(b);
  }
  b.className = 'mood-bubble ' + pool.tone;
  const parts = (pair || []).filter(Boolean)
    .map(moodPartHTML)
    .filter(Boolean)
    .join(`<span class="mood-sep">|</span>`);
  b.innerHTML = `<span class="mood-dot"></span>` + parts;
  b.querySelectorAll('.mood-part, .mood-sep, .mood-anim').forEach((el, i) => {
    el.style.animationDelay = (i * 0.07).toFixed(3) + 's';
  });
  b.classList.remove('mood-pop', 'mood-switch', 'mood-upgrade');
  void b.offsetWidth;
  // 切情绪：颜色和整颗气泡一起明显切换；同情绪刷新用较轻的 pop；首次出现用初始动画。
  if (mode === 'switch') b.classList.add('mood-switch');
  else if (mode === 'appear') b.classList.add('mood-pop');
  else b.classList.add('mood-pop');
  slot.classList.remove('hide');
  placeMoodSlot(slot);
}

// force=true：有新消息/通话/事件时立刻重抽；false：定期轻刷，同档位不闪
function refreshMood(force, idle) {
  if (!moodBootReady) return;
  const slot = ensureMoodSlot();
  if (!slot) return;
  if (chatSettings.moodEnabled === false) {
    moodEvent = null;
    slot.classList.add('hide');
    return;
  }

  let ev = activeMoodEvent();
  // 红包一直没领的时候，情绪让位给"等待/着急"；久别重逢和通话优先级更高
  if (ev && ev.kind !== 'call' && ev.kind !== 'return' && ev.kind !== 'late') {
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
    const prevTier = moodTier;
    moodTier = ev.tier;
    moodPair = ev.pair;
    moodShownAt = now;
    paintMoodBubble(ev.tier, ev.pair, prevTier ? (prevTier === ev.tier ? 'refresh' : 'switch') : 'appear');
    return;
  }

  // 情绪要有惯性：不是新消息/事件触发时，至少停留约 40 秒，避免七上八下
  if (!force && moodTier && (now - moodShownAt) < MOOD_MIN_HOLD) {
    slot.classList.remove('hide');
    placeMoodSlot(slot);
    return;
  }

  // 待机刷新：可能升一档，也可能切换情绪，也可能保持不变
  if (!force && idle && moodTier && moodPair) {
    const roll = Math.random();
    if (roll < 0.45) {
      const nextPart = nextMoodPart(moodTier, moodPair);
      if (nextPart && appendMoodPart(nextPart)) {
        moodPair = moodPair.concat(nextPart);
        moodShownAt = now;
        return;
      }
      // 已经三格或无法继续：保持现状
      moodShownAt = now;
      slot.classList.remove('hide');
      placeMoodSlot(slot);
      return;
    }
    if (roll < 0.70) {
      // 保持不变，只让它安静地待着
      moodShownAt = now;
      slot.classList.remove('hide');
      placeMoodSlot(slot);
      return;
    }
    // roll >= 0.70：切换情绪，走下面的重新抽取
  }

  const prevTier = moodTier;
  const tier = pickMoodTier(moodWeights());
  const pair = buildMoodParts(tier);
  moodTier = tier;
  moodPair = pair;
  moodShownAt = now;
  paintMoodBubble(tier, pair, prevTier ? (prevTier === tier ? 'refresh' : 'switch') : 'appear');
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
    if (Math.random() < moodTickChance()) refreshMood(false, true);
    scheduleMoodTick();
  }, moodTickDelay());
}
scheduleMoodTick();

markMoodSeen();

// 等启动页完全退出后再画第一枚情绪气泡，
// 这样进入页面时能看到“出现动画”，而不是动画已经在启动页后面播完了。
function startInitialMood() {
  if (moodBootReady) return;
  moodBootReady = true;
  maybeReunionMood();
  maybeLateNightMood();
  refreshMood(true);
}
(function waitForMoodBoot() {
  const splash = document.getElementById('bootScreen');
  if (window.__appRevealed || !splash || splash.style.display === 'none') {
    startInitialMood();
    return;
  }
  window.addEventListener('app-revealed', startInitialMood, { once: true });
  // 启动页脚本异常或被手动移除时的兜底
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (moodBootReady) { clearInterval(timer); return; }
    if (window.__appRevealed || !splash.isConnected || splash.style.display === 'none' || Date.now() - startedAt > 15000) {
      clearInterval(timer);
      startInitialMood();
    }
  }, 500);
})();

lateNightSince = isLateNightHour() ? Date.now() : 0;
setInterval(checkLateNightStay, 5 * 60000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) lateNightSince = 0;
  else if (isLateNightHour()) lateNightSince = Date.now();
});

// ===== 调试入口（只在 Console 使用，不影响正常聊天） =====
window.debugMoodSample = function(tier, count) {
  const key = MOOD_POOLS[tier] ? tier : 'happy';
  const n = Math.max(1, Math.min(2000, parseInt(count, 10) || 100));
  const rows = [];
  const lengths = { 1: 0, 2: 0, 3: 0 };
  let plus = 0, triplePlus = 0, emoji = 0;
  for (let i = 0; i < n; i++) {
    const parts = buildMoodParts(key);
    rows.push(parts);
    lengths[parts.length] = (lengths[parts.length] || 0) + 1;
    const text = parts.join('|');
    if (/\+{1}(?!\+)/.test(text)) plus++;
    if (/\+\+/.test(text)) triplePlus++;
    if (parts.some(p => /^\p{Extended_Pictographic}/u.test(p))) emoji++;
  }
  console.log(`[mood] ${key} 样本 ${n} 次`, { lengths, plus, triplePlus, emoji });
  console.table(rows.slice(0, 30).map((parts, i) => ({ '#': i + 1, 情绪: parts.join(' | ') })));
  return { rows, lengths, plus, triplePlus, emoji };
};
window.debugMoodWeights = function() {
  const w = moodWeights();
  console.table(Object.keys(w).map(k => ({ 情绪: k, 权重: Number(w[k].toFixed(2)) })));
  return w;
};
window.debugLateNightMood = triggerLateNightMood;

// 手动看特效：Console 里调用，不影响正常概率
window.debugMoodUpgrade = function() {
  if (!moodBootReady) return '启动页还没结束';
  if (!moodTier) refreshMood(true);
  if (!moodTier) return '当前没有显示情绪';
  const next = nextMoodPart(moodTier, moodPair || []);
  if (!next) return '当前已经是三格，无法继续升档';
  if (!appendMoodPart(next)) return '升档失败';
  moodPair = (moodPair || []).concat(next);
  return { tier: moodTier, pair: moodPair };
};
window.debugMoodSwitch = function(tier) {
  if (!moodBootReady) return '启动页还没结束';
  const from = moodTier;
  let key = MOOD_POOLS[tier] ? tier : '';
  if (!key) {
    const list = Object.keys(MOOD_POOLS).filter(k => k !== from);
    key = list[Math.floor(Math.random() * list.length)];
  }
  const pair = buildMoodParts(key);
  moodTier = key;
  moodPair = pair;
  moodShownAt = Date.now();
  paintMoodBubble(key, pair, 'switch');
  return { from, to: key, pair };
};

// 在线时每分钟续一次；离开页面后，时间就停在那一刻
setInterval(() => { if (!document.hidden) markMoodSeen(); }, 60000);
window.addEventListener('pagehide', markMoodSeen);
