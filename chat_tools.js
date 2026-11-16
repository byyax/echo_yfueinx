const toolImg = document.getElementById('toolImg');
if(toolImg) toolImg.onclick = () => document.getElementById('imageInput').click();

const imgInput = document.getElementById('imageInput');
if(imgInput) imgInput.onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  compressImage(file, 800).then(base64 => { sendMessage(base64, 'image', true); closePanels(); setTimeout(randomReply, getRandomDelay()); });
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

const toolPat = document.getElementById('toolPat');
if(toolPat) toolPat.onclick = () => { closePanels(); triggerPat(true); };