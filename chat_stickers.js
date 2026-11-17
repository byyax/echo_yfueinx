const stickerPanel = document.getElementById('stickerPanel');
const myStickerList = document.getElementById('myStickerList');
const hisStickerList = document.getElementById('hisStickerList');
let isEditingMyStickers = false;

const plusBtn = document.getElementById('plusBtn');
if(plusBtn) plusBtn.onclick = () => { if(stickerPanel) stickerPanel.classList.remove('show'); const tp = document.getElementById('toolPanel'); if(tp) tp.classList.toggle('show'); };

const sendStickerBtn = document.getElementById('sendStickerBtn');
if(sendStickerBtn) sendStickerBtn.onclick = () => { 
  const tp = document.getElementById('toolPanel'); if(tp) tp.classList.remove('show'); 
  if(stickerPanel) { if(stickerPanel.classList.contains('show')) stickerPanel.classList.remove('show'); else { renderStickers(); stickerPanel.classList.add('show'); } }
};

document.querySelectorAll('.sticker-nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.sticker-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sticker-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active'); const target = document.getElementById(`tab-${btn.dataset.tab}`); if(target) target.classList.add('active');
  };
});

const manageMyStickersBtn = document.getElementById('manageMyStickersBtn');
if(manageMyStickersBtn) manageMyStickersBtn.onclick = function() {
  isEditingMyStickers = !isEditingMyStickers;
  this.textContent = isEditingMyStickers ? '完成' : '批量管理';
  this.classList.toggle('primary'); renderStickers();
};

let pressTimer;
function startPress(e, index) { 
  pressTimer = setTimeout(() => { 
    showConfirm('删除表情包', '确定删除这个表情包吗？', () => {
      myEmojis.splice(index, 1); saveAllData(); renderStickers();
    });
  }, 800); 
}
function cancelPress() { clearTimeout(pressTimer); }

function renderStickers() {
  try {
    const emojiList = document.getElementById('emojiList');
    if (emojiList) {
      const commonEmojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','👂','👃','🧠','👀','👁','👅','👄','💋','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🌹','🌸','🌺','🌻','🌼','🌷','🌱','🌿','🍀','🎉','🎊','🎁','🧧','💰','💳','📱','💻','⌚','📷','🎵','🎶','🔥','⭐','🌟','✨','⚡','💥','💫','🌈','☀️','🌙','⛅','☁️','🌧️','❄️','⛄','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥝','🍍','🥥','🍅','🥑','🍆','🥕','🌽','🌶️','🥔','🍠','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🧇','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️'];
      emojiList.innerHTML = commonEmojis.map(e => `<span>${e}</span>`).join('');
      emojiList.querySelectorAll('span').forEach(span => { span.onclick = () => { const mi = document.getElementById('msgInput'); if(mi) { mi.value += span.textContent; mi.focus(); } }; });
    }
    if (myStickerList) {
      myStickerList.innerHTML = '';
      if (!isEditingMyStickers) {
        const addBtn = document.createElement('div'); addBtn.className = 'sticker-add-btn'; addBtn.textContent = '＋';
        const fileInput = document.createElement('input'); 
        fileInput.type = 'file'; 
        fileInput.accept = 'image/*'; 
        fileInput.multiple = true; // 支持多选
        fileInput.style.display = 'none';
        
        addBtn.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => { 
          const files = e.target.files; 
          if (!files || files.length === 0) return; 
          for(let i=0; i<files.length; i++) {
            const base64 = await compressImage(files[i], 300); 
            myEmojis.push(base64); 
          }
          saveAllData(); 
          renderStickers(); 
        };
        myStickerList.appendChild(addBtn); myStickerList.appendChild(fileInput);
      }
      myEmojis.forEach((src, index) => {
        const img = document.createElement('img'); img.className = 'sticker-item'; img.src = src;
        if (isEditingMyStickers) { 
          img.style.opacity = '0.7'; 
          img.onclick = () => { 
            showConfirm('删除表情包', '确定删除该表情包？', () => { myEmojis.splice(index, 1); saveAllData(); renderStickers(); });
          }; 
        } 
        else {
          img.onmousedown = (e) => startPress(e, index); img.onmouseup = cancelPress; img.onmouseleave = cancelPress;
          img.ontouchstart = (e) => startPress(e, index); img.ontouchend = cancelPress;
          img.onclick = () => { if(pressTimer) clearTimeout(pressTimer); sendMessage(src, 'image', true); if(stickerPanel) stickerPanel.classList.remove('show'); setTimeout(randomReply, getRandomDelay()); };
        }
        myStickerList.appendChild(img);
      });
    }
    if (hisStickerList) {
      hisStickerList.innerHTML = '';
      const hisImgs = contents.filter(c => c.type === 'image');
      if (hisImgs.length === 0) hisStickerList.innerHTML = '<div style="color:#999;font-size:13px;grid-column:1/-1;text-align:center;padding:20px;">他的表情库是空的，去后台添加吧~</div>';
      else hisImgs.forEach(imgData => {
        const img = document.createElement('img'); img.className = 'sticker-item'; img.src = imgData.val;
        img.onclick = () => { sendMessage(imgData.val, 'image', true); if(stickerPanel) stickerPanel.classList.remove('show'); setTimeout(randomReply, getRandomDelay()); };
        hisStickerList.appendChild(img);
      });
    }
  } catch (e) { console.error("renderStickers Error", e); }
}