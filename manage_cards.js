let currentLib = 'text', currentTagId = 'all', selected = new Set();
let currentMainLib = 'cards';
let query = '';
let editingItemId = null;
let isBatchMode = false;
const tagBarEl = document.getElementById('tagBar');
const batchToggleBtn = document.getElementById('batchToggleBtn');
const batchActions = document.getElementById('batchActions');

if(tagBarEl) tagBarEl.addEventListener('wheel', (evt) => { evt.preventDefault(); tagBarEl.scrollLeft += evt.deltaY; });

if(batchToggleBtn) {
  batchToggleBtn.onclick = () => {
    isBatchMode = !isBatchMode;
    if (isBatchMode) {
      batchToggleBtn.textContent = '取消管理';
      batchToggleBtn.classList.add('primary');
      batchActions.style.display = 'flex';
    } else {
      batchToggleBtn.textContent = '批量管理';
      batchToggleBtn.classList.remove('primary');
      batchActions.style.display = 'none';
      selected.clear();
    }
    refreshCardsUI();
  };
}

const tagBtn = document.getElementById('openTagManagerBtn');
if(tagBtn) {
  tagBtn.onclick = () => { 
    renderTagManager(); 
    const modal = document.getElementById('tagManagerModal');
    if (modal) modal.classList.add('show');
  };
}
const closeTagManagerBtn = document.getElementById('closeTagManagerBtn');
if(closeTagManagerBtn) closeTagManagerBtn.onclick = () => document.getElementById('tagManagerModal').classList.remove('show');

function renderTagManager() {
  const list = document.getElementById('tagManageList'); if(!list) return; list.innerHTML = '';
  if (!tags || tags.length === 0) { list.innerHTML = '<div style="text-align: center; color: #999; margin-top: 20px;">暂无标签，请点击下方新建。</div>'; return; }
  tags.forEach(tag => {
    const row = document.createElement('div'); 
    row.style = "display:flex; justify-content:space-between; align-items:center; background:var(--bg-color); padding:12px 16px; border-radius:12px; margin-bottom:10px;";
    row.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span style="width:14px;height:14px;border-radius:50%;background:${tag.color}"></span><span>${tag.name}</span></div>`;
    const actions = document.createElement('div');
    if (tag.id !== 'unclassified') {
      const edit = document.createElement('button'); edit.textContent = '编辑'; edit.style = "background:none;border:none;cursor:pointer;color:#1890ff;margin-right:10px;font-size:14px;"; edit.onclick = () => openTagModal(true, tag.id);
      const del = document.createElement('button'); del.textContent = '删除'; del.style = "background:none;border:none;cursor:pointer;color:#ff4d4f;font-size:14px;";
      del.onclick = () => { showConfirm('删除标签', '删除该标签？字卡会归入未分类。', () => { tags = tags.filter(t => t.id !== tag.id); contents.forEach(c => { if(c.tagId === tag.id) c.tagId = 'unclassified'; }); saveAllData(); renderTagManager(); refreshCardsUI(); }); };
      actions.appendChild(edit); actions.appendChild(del);
    }
    row.appendChild(actions); list.appendChild(row);
  });
}
function openTagModal(isEdit, tagId) {
  editingTagId = isEdit ? tagId : null; const picker = document.getElementById('colorPicker'); if(!picker) return; picker.innerHTML = ''; 
  const tag = isEdit ? tags.find(t => t.id === tagId) : null;
  pickingColor = tag ? tag.color : TAG_COLORS[0];
  TAG_COLORS.forEach(color => {
    const swatch = document.createElement('div'); swatch.className = 'color-swatch'; swatch.style = `width:30px;height:30px;border-radius:50%;display:inline-block;margin:5px;cursor:pointer;background:${color};border:2px solid ${color===pickingColor?'#333':'transparent'}`;
    swatch.onclick = () => { document.querySelectorAll('.color-swatch').forEach(s=>s.style.border='2px solid transparent'); swatch.style.border = '2px solid #333'; pickingColor = color; };
    picker.appendChild(swatch);
  });
  document.getElementById('tagNameInput').value = tag ? tag.name : ''; document.getElementById('tagModal').classList.add('show');
}
document.getElementById('openCreateTagBtn').onclick = () => openTagModal(false);
document.getElementById('cancelTagBtn').onclick = () => document.getElementById('tagModal').classList.remove('show');
document.getElementById('saveTagBtn').onclick = () => {
  const name = document.getElementById('tagNameInput').value.trim(); if(!name) return showToast('请输入名字');
  if(editingTagId) { const t = tags.find(t=>t.id===editingTagId); t.name = name; t.color = pickingColor; } else { tags.push({ id: 't_'+Date.now(), name, color: pickingColor }); }
  saveAllData(); document.getElementById('tagModal').classList.remove('show'); renderTagManager(); refreshCardsUI();
};

document.querySelectorAll('.main-lib-btn').forEach(btn => {
  btn.onclick = (e) => {
    document.querySelectorAll('.main-lib-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active'); currentMainLib = e.target.dataset.mainlib;
    const subLibNav = document.getElementById('subLibNav');
    if (currentMainLib === 'cards') {
      subLibNav.innerHTML = `<button class="lib-btn active" data-lib="text">字卡</button><button class="lib-btn" data-lib="emoji">Emoji</button><button class="lib-btn" data-lib="image">表情包</button>`;
      currentLib = 'text';
    } else {
      subLibNav.innerHTML = `<button class="lib-btn active" data-lib="pat">拍一拍</button><button class="lib-btn" data-lib="signature">个性签名</button><button class="lib-btn" data-lib="location">对方位置</button>`;
      currentLib = 'pat';
    }
    bindSubLibEvents();
    currentTagId = 'all'; selected.clear(); query = ''; 
    const si = document.getElementById('searchInput'); if(si) si.value = '';
    if(isBatchMode) batchToggleBtn.click();
    refreshCardsUI();
  };
});

function bindSubLibEvents() {
  document.querySelectorAll('.lib-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.lib-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); currentLib = btn.dataset.lib;
      const isText = currentLib === 'text';
      if(tagBarEl) tagBarEl.style.display = isText ? 'flex' : 'none';
      const otm = document.getElementById('openTagManagerBtn'); if(otm) otm.style.display = isText ? 'inline-block' : 'none';
      currentTagId = 'all'; selected.clear(); query = ''; 
      const si = document.getElementById('searchInput'); if(si) si.value = '';
      if(isBatchMode) batchToggleBtn.click();
      refreshCardsUI();
    };
  });
}
bindSubLibEvents();

const searchInput = document.getElementById('searchInput');
if(searchInput) searchInput.oninput = () => { query = searchInput.value.trim(); refreshCardsUI(); };

function refreshCardsUI() {
  try {
    if (currentLib === 'text' && tagBarEl) {
      tagBarEl.innerHTML = `<div class="tag-item ${currentTagId === 'all' ? 'active' : ''}" onclick="currentTagId='all'; refreshCardsUI();">全部</div>`;
      tags.forEach(tag => {
        const el = document.createElement('div'); el.className = `tag-item ${currentTagId === tag.id ? 'active' : ''}`; el.textContent = tag.name;
        if (currentTagId === tag.id) el.style.backgroundColor = tag.color;
        el.onclick = () => { currentTagId = tag.id; refreshCardsUI(); }; tagBarEl.appendChild(el);
      });
      const cts = document.getElementById('contentTagSelect'); if(cts) cts.innerHTML = tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      const mts = document.getElementById('moveTagSelect'); if(mts) mts.innerHTML = tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }

    const list = document.getElementById('cardList'); if(!list) return; list.innerHTML = '';
    const countLabel = document.getElementById('countLabel');
    
    // 修复：表情包库的网格样式
    if (currentLib === 'image') {
      list.className = 'image-grid';
    } else {
      list.className = 'card-list';
    }

    let filtered = [];
    if (currentLib === 'location') filtered = [...locLibrary];
    else if (currentLib === 'pat') filtered = [...pokeLibrary];
    else if (currentLib === 'signature') filtered = [...signatureLibrary];
    else { 
      filtered = contents.filter(item => item.type === currentLib); 
      if (currentLib === 'text' && currentTagId !== 'all') filtered = filtered.filter(item => item.tagId === currentTagId); 
    }
    
    if (query) filtered = filtered.filter(item => item.type !== 'image' && item.val.toLowerCase().includes(query.toLowerCase()));

    if(countLabel) {
      let libNames = { text: '文字字卡', emoji: 'Emoji', image: '表情包', location: '位置', pat: '拍一拍', signature: '个性签名' };
      let currentName = libNames[currentLib] || '内容';
      if (currentLib === 'text' && currentTagId !== 'all') currentName = '该标签字卡';
      countLabel.textContent = query ? `找到 ${filtered.length} 项` : `${currentName} 共 ${filtered.length} 项`;
    }
    
    if (filtered.length === 0) { list.innerHTML = `<div style="text-align:center; color:#999; padding: 40px 0; grid-column:1/-1;">这里空空如也</div>`; return; }

    filtered.forEach(item => {
      const row = document.createElement('div'); row.className = 'card-item';
      
      // 渲染图片形式的卡片
      if (item.type === 'image') {
        row.innerHTML = `<img src="${item.val}">`;
        if (isBatchMode) {
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected.has(item.id);
          cb.onchange = () => { cb.checked ? selected.add(item.id) : selected.delete(item.id); };
          row.appendChild(cb);
        } else {
          const delBtn = document.createElement('button'); delBtn.className = 'delete-btn'; delBtn.textContent = '✕';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            showConfirm('删除表情包', '确定删除这个表情包吗？', () => {
              contents = contents.filter(c => c.id !== item.id); saveAllData(); refreshCardsUI();
            });
          };
          row.appendChild(delBtn);
        }
      } else {
        if (isBatchMode) {
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected.has(item.id);
          cb.style = "width:20px; height:20px; accent-color: var(--primary); cursor:pointer; margin-top:2px; flex-shrink:0;";
          cb.onchange = () => { cb.checked ? selected.add(item.id) : selected.delete(item.id); }; row.appendChild(cb);
        }
        const text = document.createElement('div'); text.className = 'text'; text.textContent = item.val; row.appendChild(text);
        const editBtn = document.createElement('button'); editBtn.innerHTML = '✏️'; editBtn.style = "background:none; border:none; cursor:pointer; font-size:16px; padding:5px; flex-shrink:0;"; editBtn.onclick = () => openEditModal(item); row.appendChild(editBtn);
      }
      list.appendChild(row);
    });
  } catch(e) { console.error("刷新界面出错:", e); }
}

// 修复：如果是非文字字卡，不显示分类下拉框
document.getElementById('openAddModal').onclick = () => {
  editingItemId = null; document.getElementById('editItemId').value = '';
  const amt = document.getElementById('addModalTitle'); amt.textContent = `添加 ${currentLib === 'text' ? '字卡' : currentLib}`;
  const taa = document.getElementById('textAddArea'); taa.style.display = currentLib === 'image' ? 'none' : 'block';
  const saa = document.getElementById('stickerAddArea'); saa.style.display = currentLib === 'image' ? 'block' : 'none';
  const textarea = document.getElementById('newCardsText'); textarea.value = '';
  
  // 隐藏分类
  const addTagRow = document.getElementById('addTagRow');
  if (addTagRow) addTagRow.style.display = (currentLib === 'text') ? 'flex' : 'none';

  if(currentLib === 'pat') textarea.placeholder = '格式：动作，用 [我] 和 [他] 代替。\n例如：捏了捏[我]的脸';
  else if(currentLib === 'signature') textarea.placeholder = '一行一条签名，后台会自动轮换';
  else textarea.placeholder = '一行一条，自动过滤重复项';
  document.getElementById('addModal').classList.add('show');
};

function openEditModal(item) {
  editingItemId = item.id; document.getElementById('editItemId').value = item.id;
  document.getElementById('addModalTitle').textContent = `编辑内容`;
  document.getElementById('textAddArea').style.display = 'block'; document.getElementById('stickerAddArea').style.display = 'none';
  document.getElementById('newCardsText').value = item.val; 
  
  // 隐藏分类
  const addTagRow = document.getElementById('addTagRow');
  if (addTagRow) addTagRow.style.display = (currentLib === 'text') ? 'flex' : 'none';
  
  document.getElementById('addModal').classList.add('show');
}

document.getElementById('cancelAdd').onclick = () => document.getElementById('addModal').classList.remove('show');
document.getElementById('saveAdd').onclick = async () => {
  const val = document.getElementById('newCardsText').value.trim();
  if (!val && currentLib !== 'image') return showToast('内容不能为空');
  const tagId = document.getElementById('contentTagSelect') ? document.getElementById('contentTagSelect').value : 'unclassified';
  const timestamp = Date.now();
  
  if (editingItemId) {
    if (currentLib === 'location') { const index = locLibrary.findIndex(i => i.id === editingItemId); if(index > -1) locLibrary[index].val = val; } 
    else if (currentLib === 'pat') { const index = pokeLibrary.findIndex(i => i.id === editingItemId); if(index > -1) pokeLibrary[index].val = val; } 
    else if (currentLib === 'signature') { const index = signatureLibrary.findIndex(i => i.id === editingItemId); if(index > -1) signatureLibrary[index].val = val; } 
    else { const index = contents.findIndex(i => i.id === editingItemId); if(index > -1) { contents[index].val = val; if (currentLib === 'text') contents[index].tagId = tagId; } }
    saveAllData(); document.getElementById('addModal').classList.remove('show'); refreshCardsUI(); showToast('修改成功'); return;
  }

  let addedCount = 0;
  let duplicateCount = 0;
  
  const processLines = (lines, type, targetArray) => {
    lines.forEach((line, i) => {
      const cleanLine = line.trim();
      if(!cleanLine) return;
      
      let isDuplicate = false;
      if (type === 'text' || type === 'emoji') {
        isDuplicate = contents.some(c => c.type === type && c.val === cleanLine);
      } else if (type === 'location') {
        isDuplicate = locLibrary.some(c => c.val === cleanLine);
      } else if (type === 'pat') {
        isDuplicate = pokeLibrary.some(c => c.val === cleanLine);
      } else if (type === 'signature') {
        isDuplicate = signatureLibrary.some(c => c.val === cleanLine);
      }
      
      if (isDuplicate) { duplicateCount++; } 
      else {
        if (type === 'text' || type === 'emoji') {
          contents.push({ id: 'c_'+timestamp+i, type: type, val: cleanLine, tagId: type==='text'?tagId:'unclassified' });
        } else {
          targetArray.push({ id: type.charAt(0)+'_'+timestamp+i, val: cleanLine });
        }
        addedCount++;
      }
    });
  };

  if (currentLib === 'location') processLines(val.split('\n'), 'location', locLibrary);
  else if (currentLib === 'pat') processLines(val.split('\n'), 'pat', pokeLibrary);
  else if (currentLib === 'signature') processLines(val.split('\n'), 'signature', signatureLibrary);
  else if (currentLib === 'text') processLines(val.split('\n'), 'text', null);
  else if (currentLib === 'emoji') processLines(val.split('\n'), 'emoji', null);
  else if (currentLib === 'image') { 
    const files = document.getElementById('newStickersInput').files; 
    for (let i = 0; i < files.length; i++) { const base64 = await compressImage(files[i]); contents.push({ id: 'c_'+timestamp+i, type: 'image', val: base64, tagId: 'unclassified' }); addedCount++; } 
  }
  
  saveAllData(); document.getElementById('newCardsText').value = ''; document.getElementById('addModal').classList.remove('show'); refreshCardsUI();
  
  if (addedCount > 0 && duplicateCount > 0) {
    showToast(`添加成功，已过滤 ${duplicateCount} 个重复的条目`);
  } else if (addedCount > 0) {
    showToast(`成功添加了 ${addedCount} 条`);
  } else if (duplicateCount > 0) {
    showToast(`添加失败，${duplicateCount} 个条目均已存在`);
  } else {
    showToast('内容为空，未添加');
  }
};

const selectAllBtn = document.getElementById('selectAllBtn');
if(selectAllBtn) selectAllBtn.onclick = () => {
  let filtered = [];
  if (currentLib === 'location') filtered = [...locLibrary];
  else if (currentLib === 'pat') filtered = [...pokeLibrary];
  else if (currentLib === 'signature') filtered = [...signatureLibrary];
  else { filtered = contents.filter(item => item.type === currentLib); if (currentLib === 'text' && currentTagId !== 'all') filtered = filtered.filter(item => item.tagId === currentTagId); }
  if(query) filtered = filtered.filter(item => item.type !== 'image' && item.val.toLowerCase().includes(query.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(item => selected.has(item.id));
  if (allSelected) filtered.forEach(item => selected.delete(item.id)); else filtered.forEach(item => selected.add(item.id));
  refreshCardsUI();
};

const batchDeleteBtn = document.getElementById('batchDeleteBtn');
if(batchDeleteBtn) batchDeleteBtn.onclick = () => {
  if(selected.size === 0) return showToast('请先勾选要删除的内容');
  showConfirm('确认删除', `确定删除选中的 ${selected.size} 项吗？此操作不可逆。`, () => {
    if (currentLib === 'location') locLibrary = locLibrary.filter(c => !selected.has(c.id)); 
    else if (currentLib === 'pat') pokeLibrary = pokeLibrary.filter(c => !selected.has(c.id)); 
    else if (currentLib === 'signature') signatureLibrary = signatureLibrary.filter(c => !selected.has(c.id)); 
    else contents = contents.filter(c => !selected.has(c.id));
    saveAllData(); selected.clear(); refreshCardsUI(); showToast('删除成功');
  });
};

document.getElementById('batchMoveBtn').onclick = () => { if(selected.size>0) document.getElementById('moveModal').classList.add('show'); };
document.getElementById('cancelMoveBtn').onclick = () => document.getElementById('moveModal').classList.remove('show');
document.getElementById('saveMoveBtn').onclick = () => {
  const target = document.getElementById('moveTagSelect').value; contents.forEach(c => { if(selected.has(c.id)) c.tagId = target; }); saveAllData(); selected.clear(); document.getElementById('moveModal').classList.remove('show'); refreshCardsUI();
};
const TAG_COLORS = ['#ff4d4f','#faad14','#52c41a','#1890ff','#722ed1','#eb2f96','#13c2c2','#f5222d','#fa8c16','#a0d911','#2f54eb','#fadb14','#d4b106','#8c8c8c','#595959','#000000'];
let editingTagId = null, pickingColor = '';