// ===== 情绪池：他此刻的状态，做成一个小气泡挂在最新一条消息下面 =====
// 四档：常态 / 等待 / 着急 / 低落。
// 平时按概率抽；通话结束、消息里出现明显情绪词时，会临时换成对应的心情（事件优先）。
// 你一回消息、一领东西，他立刻切回日常状态。

const MOOD_POOLS = {
  normal: {
    tone: 'tier-normal',
    pairs: [
      ['开心', '在线'], ['放松', '发呆'], ['满足', '听歌'],
      ['偷笑', '摸鱼'], ['雀跃', '喝奶茶'], ['平静', '放空'],
      ['激动', '想找你'], ['开心', '看你聊天']
    ]
  },
  waiting: {
    tone: 'tier-waiting',
    pairs: [
      ['期待', '等待'], ['耐心', '等你'], ['张望', '看手机'],
      ['惦记', '偷看'], ['放心', '守着']
    ]
  },
  anxious: {
    tone: 'tier-anxious',
    pairs: [
      ['焦急', '等待'], ['委屈', '张望'], ['急躁', '盯屏'],
      ['不安', '数秒'], ['慌张', '等你']
    ],
    tail: '转圈'
  },
  sad: {
    tone: 'tier-sad',
    pairs: [
      ['失落', '安静'], ['委屈', '不说话'], ['低落', '发呆'],
      ['嘴硬', '其实不开心'], ['逞强', '不想解释']
    ]
  }
};

// 消息里的情绪关键词。先匹配到什么就用什么。
const MOOD_SENTIMENT = [
  {
    tier: 'normal',
    pairs: [['开心', '在线'], ['雀跃', '看你聊天'], ['满足', '偷笑']],
    words: ['开心', '高兴', '哈哈', '嘿嘿', '太好了', '好耶', '快乐', '舒服', '幸福', '喜欢你', '想你', '么么', '抱抱', '好棒'],
    emoji: /[😀😁😄😊🥰😍🤗😘💕❤🥳✨]/
  },
  {
    tier: 'sad',
    pairs: [['低落', '安静'], ['委屈', '想被哄'], ['难过', '不说话']],
    words: ['难过', '伤心', '委屈', '想哭', '哭了', '好累', '疲惫', '好烦', '失望', '算了', '孤独', '不想说话', '失眠', '低落'],
    emoji: /[😭😢🥺😞😔😣💔]/
  },
  {
    tier: 'anxious',
    pairs: [['急躁', '等你'], ['不安', '坐不住'], ['着急', '踱步']],
    words: ['着急', '急死', '快点', '怎么还不', '生气', '讨厌', '气死', '不理你', '烦死了', '哼'],
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

// ===== 概率：日常偏常态，等你回话才会慢慢变急 =====
function moodWeights() {
  const now = Date.now();
  const card = unopenedCardFromHim();
  if (card) {
    const waited = now - (card.time || now);
    if (waited < 30000) return { normal: 45, waiting: 50, anxious: 5 };
    if (waited < 60000) return { normal: 12, waiting: 76, anxious: 12 };
    if (waited < 180000) return { normal: 5, waiting: 80, anxious: 15 };
    return { normal: 4, waiting: 36, anxious: 60 };
  }
  const last = lastRealMsg();
  const idle = now - (lastInteractionTime || now);
  const patience = Math.max(60000, (chatSettings.replyDelay || 0.5) * 60000 * 1.5);
  if (last && last.role === 'other' && idle > patience) return { normal: 8, waiting: 32, anxious: 60 };
  if (last && last.role === 'other' && idle > 25000) return { normal: 40, waiting: 48, anxious: 12 };
  // 日常：真人大部分时间是常态，偶尔发呆或等你
  return { normal: 82, waiting: 13, anxious: 5 };
}

function pickMoodTier(w) {
  const total = w.normal + w.waiting + w.anxious;
  let r = Math.random() * total;
  if ((r -= w.normal) <= 0) return 'normal';
  if ((r -= w.waiting) <= 0) return 'waiting';
  return 'anxious';
}

function pickFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

// ===== 事件：通话 / 消息情绪，短暂压过概率 =====
function pushMoodEvent(tier, pair, ms, kind) {
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.normal;
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
  normal:  { tier: 'normal',  pairs: [['开心', '被你感染'], ['放心', '看你开心']] },
  sad:     { tier: 'waiting', pairs: [['担心', '想哄你'], ['心疼', '不知道怎么哄']] },
  anxious: { tier: 'waiting', pairs: [['忐忑', '怕你生气'], ['小心', '在哄你']] }
};

// 读一句话的情绪。关键词只是"可能"代表心情，所以每次都要掷一次骰子。
function analyzeMoodFromText(text, fromMe) {
  const t = String(text || '');
  if (!t) return;
  const denial = MOOD_DENIAL_WORDS.some(w => t.includes(w));
  let hit = null;
  for (const s of MOOD_SENTIMENT) {
    if (s.words.some(w => t.includes(w)) || (s.emoji && s.emoji.test(t))) { hit = s; break; }
  }

  if (fromMe) {
    // 我说"没事"，他可能会多想，但不是每次都当真
    if (denial && Math.random() < 0.45) {
      pushMoodEvent('waiting', ['不安', '是不是我说错话'], 2 * 60000);
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
    pushMoodEvent('sad', ['嘴硬', '其实不开心'], 3 * 60000);
    return;
  }
  if (!hit) return;
  // 关键词命中也只是"更可能"变，可能只是随口一说或者开玩笑
  if (Math.random() > 0.55) return;
  // 少量例外：嘴上开心，心里却拧着
  if (Math.random() < 0.12) {
    pushMoodEvent('sad', ['嘴硬', '不太开心'], 2 * 60000);
    return;
  }
  pushMoodEvent(hit.tier, pickFrom(hit.pairs), 2.5 * 60000);
}

// 通话结束后他的心情：大部分会有反应，也留一点"没什么反应"的余地
function moodAfterCall(state, who) {
  if (Math.random() < 0.22) return;
  const dir = (typeof callDirection !== 'undefined') ? callDirection : 'out';
  const secs = (typeof callSeconds !== 'undefined') ? callSeconds : 0;
  const pick = list => list[Math.floor(Math.random() * list.length)];

  if (state === 'completed') {
    if (secs >= 60) pushMoodEvent('normal', pick([['开心', '刚聊完'], ['满足', '还回味'], ['雀跃', '想再打']]), 4 * 60000, 'call');
    else pushMoodEvent('normal', pick([['舍不得', '挂太快'], ['疑惑', '这就挂了']]), 2 * 60000, 'call');
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
  const pool = MOOD_POOLS[tier] || MOOD_POOLS.normal;
  const slot = ensureMoodSlot();
  if (!slot) return;
  const b = document.createElement('div');
  b.className = 'mood-bubble ' + pool.tone;
  b.innerHTML = `<span class="mood-dot"></span>` +
    `<span class="mood-part">${pair[0]}</span>` +
    `<span class="mood-sep">|</span>` +
    `<span class="mood-part">${pair[1]}</span>`;
  if (tier === 'anxious') {
    b.insertAdjacentHTML('beforeend',
      `<span class="mood-sep">|</span><span class="mood-spin"></span><span class="mood-part">${pool.tail}</span>`);
  } else if (tier === 'waiting') {
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
  // 红包一直没领的时候，情绪让位给"等待/着急"
  if (ev && ev.kind !== 'call') {
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
  const fresh = tier === moodTier && moodPair && (now - moodShownAt) < 15000;
  if (!force && fresh) {
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

// 定期轻刷：每 12 秒重新掷一次概率，心情会慢慢变
setInterval(() => refreshMood(false), 12000);
setTimeout(() => refreshMood(true), 800);
window.addEventListener('load', () => refreshMood(true));
