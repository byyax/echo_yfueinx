let currentPayInput = '', pendingMoneyData = null, moneyType = '';
document.getElementById('toolRed').onclick = () => { closePanels(); moneyType='redpacket'; document.getElementById('moneyTitle').textContent='发红包'; document.getElementById('moneyModal').classList.add('show'); };
document.getElementById('toolTrans').onclick = () => { closePanels(); moneyType='transfer'; document.getElementById('moneyTitle').textContent='转账'; document.getElementById('moneyModal').classList.add('show'); };

const giftDB = {
  food: [{ name: '奶茶', price: 15, icon: '🧋' }, { name: '炸鸡', price: 35, icon: '🍗' }, { name: '小蛋糕', price: 60, icon: '🍰' }],
  daily: [{ name: '抽纸', price: 10, icon: '🧻' }, { name: '水杯', price: 50, icon: '🥛' }, { name: '玩偶', price: 80, icon: '🧸' }],
  formal: [{ name: '红玫瑰', price: 99, icon: '🌹' }, { name: '围巾', price: 200, icon: '🧣' }, { name: '项链', price: 500, icon: '📿' }]
};
document.getElementById('toolGift').onclick = () => { closePanels(); document.getElementById('giftModal').classList.add('show'); renderGiftList('food'); };
document.querySelectorAll('.gift-tabs button').forEach(btn => {
  btn.onclick = (e) => {
    document.querySelectorAll('.gift-tabs button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active'); renderGiftList(e.target.dataset.type);
  };
});
function renderGiftList(type) {
  const list = document.getElementById('giftList'); list.innerHTML = '';
  giftDB[type].forEach(g => {
    list.innerHTML += `<div class="gift-card" onclick="buyGift('${g.name}', ${g.price}, '${g.icon}')"><div class="gift-icon">${g.icon}</div><div class="gift-name">${g.name}</div><div class="gift-price">¥${g.price}</div></div>`;
  });
}
window.buyGift = (name, price, icon) => {
  document.getElementById('giftModal').classList.remove('show');
  sendMessage({ name: `送了 ${name}`, isOpened: false }, 'gift', true);
  setTimeout(randomReply, 1000);
};
document.getElementById('closeGiftModal').onclick = () => document.getElementById('giftModal').classList.remove('show');

document.addEventListener('keydown', (e) => {
  const passModal = document.getElementById('passModal');
  if (!passModal.classList.contains('show')) return;
  if (e.key >= '0' && e.key <= '9') pressKey(e.key);
  else if (e.key === 'Backspace') pressKey('del');
  else if (e.key === 'Enter') document.getElementById('confirmMoney').click();
  else if (e.key === 'Escape') document.getElementById('cancelPay').click();
});

document.getElementById('cancelMoney').onclick = () => document.getElementById('moneyModal').classList.remove('show');
document.getElementById('confirmMoney').onclick = () => {
  const amount = document.getElementById('moneyAmount').value, note = document.getElementById('moneyNote').value;
  if (!amount || isNaN(amount)) return alert('请输入金额');
  pendingMoneyData = { amount, note, isOpened: false }; 
  document.getElementById('moneyModal').classList.remove('show');
  if (moneyType === 'transfer') { 
    if (!payPassword) { showToast('首次使用，请先设置6位密码'); openKeyboard(); } else { openKeyboard(); } 
  } else { 
    sendMessage(pendingMoneyData, moneyType, true); 
    setTimeout(randomReply, 1000); 
  }
};

function openKeyboard() { currentPayInput = ''; updateDots(); document.getElementById('passModal').classList.add('show'); }
function updateDots() { const dots = document.getElementById('payDots'); dots.innerHTML = ''; for (let i = 0; i < 6; i++) { const d = document.createElement('div'); if (i < currentPayInput.length) d.classList.add('filled'); dots.appendChild(d); } }
const kb = document.getElementById('keyboard'); if(kb){ kb.innerHTML = ''; for (let i = 1; i <= 9; i++) kb.innerHTML += `<button onclick="pressKey('${i}')">${i}</button>`; kb.innerHTML += `<button style="visibility:hidden;"></button><button onclick="pressKey('0')">0</button><button onclick="pressKey('del')">⌫</button>`; }
window.pressKey = (k) => {
  if (k === 'del') currentPayInput = currentPayInput.slice(0, -1); else if (currentPayInput.length < 6) currentPayInput += k;
  updateDots();
  if (currentPayInput.length === 6) {
    setTimeout(() => {
      if (!payPassword) {
        payPassword = currentPayInput; localStorage.setItem('pay_password', payPassword);
        showToast('密码设置成功'); document.getElementById('passModal').classList.remove('show');
        if (pendingMoneyData) { sendMessage(pendingMoneyData, moneyType, true); setTimeout(randomReply, 1000); }
      } else if (currentPayInput === payPassword) {
        showToast('转账成功'); document.getElementById('passModal').classList.remove('show');
        if (pendingMoneyData) { sendMessage(pendingMoneyData, moneyType, true); setTimeout(randomReply, 1000); }
      } else { showToast('密码错误'); currentPayInput = ''; updateDots(); }
    }, 200);
  }
};
document.getElementById('cancelPay').onclick = () => document.getElementById('passModal').classList.remove('show');