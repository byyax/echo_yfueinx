const toolImg = document.getElementById('toolImg');
if(toolImg) toolImg.onclick = () => document.getElementById('imageInput').click();

const imgInput = document.getElementById('imageInput');
if(imgInput) imgInput.onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  compressImage(file, 800).then(base64 => { if (!base64) return showToast('这张动图太大啦，发不出去'); sendMessage(base64, 'image', true); closePanels(); setTimeout(randomReply, getRandomDelay()); });
  e.target.value = '';
};

const toolLoc = document.getElementById('toolLoc');
if(toolLoc) toolLoc.onclick = () => { 
  closePanels(); if(locLibrary.length === 0) return showToast('位置库是空的');
  sendMessage('你在哪呀？', 'text', true);
  setTimeout(() => {
    const loc = locLibrary[Math.floor(Math.random() * locLibrary.length)];
    sendMessage(loc.val, 'location', false);
  }, getRandomDelay());
};

// 双击头像仍是原来的拍一拍；这里加号面板的“互动”弹出肢体互动选择
const toolPat = document.getElementById('toolPat');
if(toolPat) toolPat.onclick = () => {
  closePanels();
  renderInteractGrid();
  const modal = document.getElementById('interactModal');
  if (modal) modal.classList.add('show');
};

function renderInteractGrid() {
  const grid = document.getElementById('interactGrid');
  if (!grid) return;
  grid.innerHTML = '';
  interactLibrary.forEach(it => {
    const card = document.createElement('div');
    card.className = 'interact-card';
    card.innerHTML = `<div class="it-icon">${it.icon}</div><div class="it-name">${it.name}</div><div class="it-hint">发送互动请求</div>`;
    card.onclick = () => {
      document.getElementById('interactModal').classList.remove('show');
      sendInteract(it);
    };
    grid.appendChild(card);
  });
}

function sendInteract(it) {
  sendMessage({ name: it.name, icon: it.icon, val: `想${it.name}`, isOpened: false, interact: true }, 'interact', true);
  // 对方回应：接受并回一个互动
  setTimeout(() => {
    const replies = {
      '摸摸头': '嘿嘿，被你摸到啦~',
      '戳戳脸': '别戳啦，痒~',
      '抱抱': '（一把抱住你）',
      '贴贴': '（凑过来贴贴）',
      '捏捏脸': '哎呀脸都要捏红啦',
      '举高高': '哇——飞起来啦！'
    };
    const text = replies[it.name] || `（接受了你的${it.name}）`;
    sendMessage(text, 'text', false);
  }, 1500 + Math.random() * 1500);
}

const closeInteractBtn = document.getElementById('closeInteractBtn');
if (closeInteractBtn) closeInteractBtn.onclick = () => document.getElementById('interactModal').classList.remove('show');