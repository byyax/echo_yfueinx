// ===== 选择：写几个选项发过去，让他选一个或几个 =====
const CHOICE_MIN = 2;
const CHOICE_MAX = 10;

const choiceModal = document.getElementById('choiceModal');
const choiceOptionsEl = document.getElementById('choiceOptions');
const choiceTitleEl = document.getElementById('choiceTitle');
const choicePickEl = document.getElementById('choicePickCount');
const choiceAddBtn = document.getElementById('choiceAddOption');
const choiceSendBtn = document.getElementById('choiceSend');
const choiceCancelBtn = document.getElementById('choiceCancel');
const toolChoice = document.getElementById('toolChoice');

function addChoiceRow(value) {
  if (!choiceOptionsEl) return;
  const row = document.createElement('div');
  row.className = 'choice-option-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 40;
  input.placeholder = '选项内容';
  input.value = value || '';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'choice-del';
  del.textContent = '×';
  del.title = '删除这个选项';
  del.onclick = () => {
    if (choiceOptionsEl.querySelectorAll('.choice-option-row').length <= CHOICE_MIN) {
      showToast('至少留两个选项');
      return;
    }
    row.remove();
    syncChoicePickLimit();
    input.focus();
  };
  row.appendChild(input);
  row.appendChild(del);
  choiceOptionsEl.appendChild(row);
  syncChoicePickLimit();
  return input;
}

function syncChoicePickLimit() {
  if (!choiceOptionsEl || !choicePickEl) return;
  const count = choiceOptionsEl.querySelectorAll('.choice-option-row').length;
  choicePickEl.max = String(count);
  if (parseInt(choicePickEl.value, 10) > count) choicePickEl.value = String(count);
  if (parseInt(choicePickEl.value, 10) < 1) choicePickEl.value = '1';
  if (choiceAddBtn) choiceAddBtn.disabled = count >= CHOICE_MAX;
}

function openChoicePanel() {
  if (!choiceModal) return;
  choiceOptionsEl.innerHTML = '';
  choiceTitleEl.value = '';
  choicePickEl.value = '1';
  addChoiceRow('');
  addChoiceRow('');
  choiceModal.classList.add('show');
  setTimeout(() => {
    const first = choiceOptionsEl.querySelector('input');
    if (first) first.focus();
  }, 80);
}

if (toolChoice) toolChoice.onclick = () => {
  closePanels();
  openChoicePanel();
};

if (choiceAddBtn) choiceAddBtn.onclick = () => {
  const input = addChoiceRow('');
  if (input) input.focus();
};

if (choiceCancelBtn) choiceCancelBtn.onclick = () => choiceModal.classList.remove('show');
if (choiceModal) choiceModal.onclick = (e) => { if (e.target === choiceModal) choiceModal.classList.remove('show'); };

if (choiceSendBtn) choiceSendBtn.onclick = () => {
  const options = Array.from(choiceOptionsEl.querySelectorAll('input'))
    .map(inp => inp.value.trim())
    .filter(Boolean);
  if (options.length < CHOICE_MIN) return showToast('至少写两个选项');
  const seen = new Set();
  const unique = [];
  options.forEach(text => {
    if (seen.has(text)) return;
    seen.add(text);
    unique.push({ text: text });
  });
  const pick = Math.min(Math.max(1, parseInt(choicePickEl.value, 10) || 1), unique.length);
  const title = (choiceTitleEl.value || '').trim() || '帮我选一下';
  choiceModal.classList.remove('show');
  sendChoiceCard(title, unique, pick);
};

function sendChoiceCard(title, options, pickCount) {
  sendMessage({
    title: title,
    options: options,
    pickCount: pickCount,
    chosen: [],
    val: title
  }, 'choice', true);
  const sent = chatHistory[chatHistory.length - 1];
  if (!sent || !sent.time) return;
  // 等一小会儿，让他“想一想”
  scheduleChoiceReply(sent.time, 1200 + Math.random() * 1400);
}

function choiceReplyText(chosen) {
  return '我选' + chosen.map(o => o.text).join('，');
}

function applyChoiceChosen(msg, chosen) {
  if (!msg || !msg.content) return;
  msg.content.chosen = chosen.map(o => o.text);
  saveAllData();
  const bubble = document.querySelector(`.bubble[data-msg-time="${msg.time}"]`);
  if (!bubble) return;
  const bottom = bubble.querySelector('.card-bottom');
  if (bottom) bottom.textContent = '已选择 · 点击展开';
  const chosenTexts = msg.content.chosen;
  bubble.querySelectorAll('.choice-opt').forEach((row, i) => {
    const txtEl = row.querySelector('span:last-child');
    const txt = txtEl ? txtEl.textContent : '';
    row.classList.toggle('picked', chosenTexts.indexOf(txt) >= 0);
  });
}

function scheduleChoiceReply(time, delay) {
  const wait = Math.max(700, delay || 1500);
  setTimeout(() => {
    const msg = chatHistory.find(m => m.time === time && m.role === 'me' && m.type === 'choice');
    if (!msg || !msg.content || (msg.content.chosen && msg.content.chosen.length)) return;
    showTypingIndicator('思考中…');
    setTimeout(() => {
      hideTypingIndicator();
      const opts = (msg.content.options || []).slice();
      if (!opts.length) return;
      const want = Math.min(Math.max(1, msg.content.pickCount || 1), opts.length);
      // 洗牌后取前 want 个，再按原顺序排好
      const idx = opts.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
      }
      const chosen = idx.slice(0, want).sort((a, b) => a - b).map(i => opts[i]);
      applyChoiceChosen(msg, chosen);
      sendMessage(choiceReplyText(chosen), 'text', false);
    }, 900 + Math.random() * 900);
  }, wait);
}

// 页面重开后，如果上一条选择卡还没被选，过一会儿补上，别让它一直悬着
setTimeout(() => {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (!m || m.role !== 'me' || m.type !== 'choice') continue;
    if (m.content && (!m.content.chosen || !m.content.chosen.length) && Date.now() - (m.time || 0) > 30000) {
      scheduleChoiceReply(m.time, 1500);
    }
    break;
  }
}, 1200);
