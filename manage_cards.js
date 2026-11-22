let currentLib = 'text', currentTagId = 'all', selected = new Set();
let currentMainLib = 'cards';
let query = '';
let editingItemId = null;
let isBatchMode = false;
const tagBarEl = document.getElementById('tagBar');
const batchToggleBtn = document.getElementById('batchToggleBtn');
const batchActions = document.getElementById('batchActions');
const listEl = document.getElementById('cardList');
const pageCardsEl = document.getElementById('pageCards');

// 实现手指在字卡栏上下滑动也能滑动下方列表的功能
if (pageCardsEl) {
  let startY = 0;
  let startScrollTop = 0;
  pageCardsEl.addEventListener('touchstart', (e) => {
    if (e.target.closest('.main-lib-nav') || e.target.closest('.lib-nav-wrapper') || e.target.closest('.tag-bar') || e.target.closest('.card-toolbar')) {
      startY = e.touches[0].clientY;
      startScrollTop = listEl.scrollTop;
    } else {
      startY = 0;
    }
  }, { passive: true });
  
  pageCardsEl.addEventListener('touchmove', (e) => {
    if (startY > 0 && listEl) {
      const currentY = e.touches[0].clientY;
      const diff = startY - currentY;
      listEl.scrollTop = startScrollTop + diff;
    }
  }, { passive: true });
}

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
  tagBtn.onclick = () => { renderTagManager(); const modal = document.getElementById('tagManagerModal'); if (modal) modal.classList.add('show'); };
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

// 修复：字卡严格查重功能（提示具体重复的内容）
document.getElementById('checkDuplicateBtn').onclick = () => {
  const textCards = contents.filter(c => c.type === 'text');
  const seen = new Set();
  const dupIds = [];
  const dupTexts = [];
  
  textCards.forEach(c => {
    if (seen.has(c.val)) {
      dupIds.push(c.id);
      if (!dupTexts.includes(c.val)) dupTexts.push(c.val);
    } else {
      seen.add(c.val);
    }
  });

  if (dupIds.length === 0) {
    showToast('当前无重复内容 ✨');
  } else {
    const preview = dupTexts.slice(0, 3).map(t => `「${t}」`).join('、');
    const more = dupTexts.length > 3 ? ` 等 ${dupTexts.length} 组` : '';
    showConfirm('发现重复', `检测到 ${dupIds.length} 条重复字卡：${preview}${more}\n是否删除？（保留最早的一条）`, () => {
      contents = contents.filter(c => !dupIds.includes(c.id));
      saveAllData();
      refreshCardsUI();
      showToast('已清除重复字卡');
    });
  }
};

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
    const importCardsBtn = document.getElementById('importCardsBtn');
    if (importCardsBtn) importCardsBtn.style.display = currentLib === 'text' ? 'inline-block' : 'none';

    if (currentLib === 'image') {
      list.className = 'card-list image-grid'; // 网格布局
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
      
      if (item.type === 'image') {
        row.innerHTML = `<img src="${item.val}">`;
        
        // 表情包删除逻辑：长按显示叉号，或者批量管理显示复选框
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
          
          // 长按逻辑
          let pressTimer;
          const startPress = (e) => {
            pressTimer = setTimeout(() => {
              document.querySelectorAll('.image-grid .card-item').forEach(el => el.classList.remove('show-delete'));
              row.classList.add('show-delete');
            }, 600);
          };
          const cancelPress = () => clearTimeout(pressTimer);
          
          row.onmousedown = startPress; row.onmouseup = cancelPress; row.onmouseleave = cancelPress;
          row.ontouchstart = startPress; row.ontouchend = cancelPress; row.ontouchmove = cancelPress;
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

function updateAddModalHint() {
  const hint = document.getElementById('addModalHint');
  if (!hint) return;
  if (currentLib === 'signature') {
    hint.innerHTML = '建议单条 8–20 个字，24 个字以内效果最佳；<br>更长会自动缩小字号，缓慢左右滚动。';
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
    hint.textContent = '';
  }
}

document.getElementById('openAddModal').onclick = () => {
  editingItemId = null; document.getElementById('editItemId').value = '';
  const amt = document.getElementById('addModalTitle'); amt.textContent = `添加 ${currentLib === 'text' ? '字卡' : currentLib}`;
  const taa = document.getElementById('textAddArea'); taa.style.display = currentLib === 'image' ? 'none' : 'block';
  const saa = document.getElementById('stickerAddArea'); saa.style.display = currentLib === 'image' ? 'block' : 'none';
  const textarea = document.getElementById('newCardsText'); textarea.value = '';

  const addTagRow = document.getElementById('addTagRow');
  if (addTagRow) addTagRow.style.display = (currentLib === 'text') ? 'flex' : 'none';

  if(currentLib === 'pat') textarea.placeholder = '格式：动作，用 [我] 和 [他] 代替。\n例如：捏了捏[我]的脸';
  else if(currentLib === 'signature') textarea.placeholder = '一行一条签名，后台会自动轮换';
  else textarea.placeholder = '一行一条，自动过滤完全相同的重复项';
  updateAddModalHint();
  document.getElementById('addModal').classList.add('show');
};

function openEditModal(item) {
  editingItemId = item.id; document.getElementById('editItemId').value = item.id;
  document.getElementById('addModalTitle').textContent = `编辑内容`;
  document.getElementById('textAddArea').style.display = 'block'; document.getElementById('stickerAddArea').style.display = 'none';
  document.getElementById('newCardsText').value = item.val; 
  
  const addTagRow = document.getElementById('addTagRow');
  if (addTagRow) addTagRow.style.display = (currentLib === 'text') ? 'flex' : 'none';
  if (currentLib === 'text') {
    const tagSelect = document.getElementById('contentTagSelect');
    if (tagSelect) tagSelect.value = item.tagId || 'unclassified';
  }
  updateAddModalHint();
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
      // 严格全字匹配
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
    for (let i = 0; i < files.length; i++) { const base64 = await compressImage(files[i]); if (!base64) { showToast('有动图太大，已跳过'); continue; } contents.push({ id: 'c_'+timestamp+i, type: 'image', val: base64, tagId: 'unclassified' }); addedCount++; } 
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

// ===== 导入文字字卡：只追加，不覆盖现有字卡 =====
function cardImportText(item) {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const value = item.val != null ? item.val
    : item.text != null ? item.text
    : item.content != null ? item.content
    : item.value != null ? item.value
    : item['内容'];
  return value == null ? '' : String(value).trim();
}

function cardImportCategory(item, tagMap) {
  if (!item || typeof item !== 'object') return '';
  const direct = item.category != null ? item.category
    : item.tagName != null ? item.tagName
    : item.tag != null ? item.tag
    : item['分类'] != null ? item['分类']
    : item['标签'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const tagId = item.tagId != null ? item.tagId : item.tag;
  if (tagId && tagMap && tagMap[tagId]) return tagMap[tagId];
  return '';
}

function cardsFromJSON(data) {
  const out = [];
  const tagMap = {};
  const pushItem = item => {
    if (item && typeof item === 'object' && item.type && item.type !== 'text') return;
    const text = cardImportText(item);
    if (!text) return;
    out.push({ text, category: cardImportCategory(item, tagMap) });
  };

  if (Array.isArray(data)) { data.forEach(pushItem); return out; }
  if (!data || typeof data !== 'object') return out;

  if (Array.isArray(data.tags)) {
    data.tags.forEach(t => { if (t && t.id) tagMap[t.id] = String(t.name || t.id); });
  }
  const list = Array.isArray(data.contents) ? data.contents
    : Array.isArray(data.cards) ? data.cards
    : Array.isArray(data.items) ? data.items : null;
  if (list) { list.forEach(pushItem); return out; }

  // 单条对象：{ val: '内容', category: '分类' }
  pushItem(data);
  return out;
}

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function cardsFromDelimited(lines, delimiter) {
  const rows = lines.map(line => delimiter === '\t' ? line.split('\t') : parseCSVLine(line));
  if (!rows.length) return [];
  const first = rows[0].map(x => String(x || '').trim().toLowerCase());
  const catHeader = first.findIndex(x => /^(category|tag|分类|标签)$/.test(x));
  const textHeader = first.findIndex(x => /^(text|content|val|value|内容)$/.test(x));
  const hasHeader = catHeader >= 0 || textHeader >= 0;
  const out = [];
  for (let i = hasHeader ? 1 : 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(Boolean)) continue;
    let category = '';
    let text = '';
    if (hasHeader) {
      category = catHeader >= 0 ? String(row[catHeader] || '').trim() : '';
      text = textHeader >= 0
        ? String(row[textHeader] || '').trim()
        : row.slice(catHeader + 1).join(',').trim();
    } else if (row.length > 1) {
      category = String(row[0] || '').trim();
      text = row.slice(1).join(delimiter === '\t' ? '\t' : ',').trim();
    } else {
      text = String(row[0] || '').trim();
    }
    if (text) out.push({ text, category });
  }
  return out;
}

function cardsFromTextLines(lines) {
  const out = [];
  lines.forEach(raw => {
    let line = String(raw || '').replace(/\r$/, '');
    if (!line.trim()) return;
    let category = '';
    let text = line.trim();
    const tab = line.indexOf('\t');
    if (tab >= 0) {
      category = line.slice(0, tab).trim();
      text = line.slice(tab + 1).trim();
    } else {
      const bar = line.indexOf('|');
      if (bar >= 0) {
        category = line.slice(0, bar).trim();
        text = line.slice(bar + 1).trim();
      }
    }
    if (text) out.push({ text, category });
  });
  return out;
}

function parseCardImport(text, filename) {
  const raw = String(text || '').replace(/^﻿/, '');
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const ext = String(filename || '').split('.').pop().toLowerCase();
  if (ext === 'json' || trimmed[0] === '[' || trimmed[0] === '{') {
    return cardsFromJSON(JSON.parse(trimmed));
  }
  const lines = raw.split(/\r?\n/);
  if (ext === 'csv') return cardsFromDelimited(lines, ',');
  if (ext === 'tsv') return cardsFromDelimited(lines, '\t');
  return cardsFromTextLines(lines);
}

function previewTextCardImport(items) {
  const existing = new Set(contents.filter(c => c && c.type === 'text').map(c => String(c.val)));
  const seen = new Set();
  const categories = new Set();
  let add = 0, skip = 0;
  items.forEach(item => {
    const text = String(item && item.text || '').trim();
    if (!text) return;
    const category = String(item && item.category || '').trim();
    if (category) categories.add(category);
    if (existing.has(text) || seen.has(text)) { skip++; return; }
    seen.add(text);
    add++;
  });
  return { add, skip, categories: Array.from(categories) };
}

function applyTextCardImport(items) {
  const timestamp = Date.now();
  const tagByName = new Map();
  tags.forEach(t => { if (t && t.name) tagByName.set(String(t.name).trim(), t.id); });
  const existing = new Set(contents.filter(c => c && c.type === 'text').map(c => String(c.val)));
  const seen = new Set();
  let added = 0, skipped = 0, newTags = 0;

  items.forEach((item, idx) => {
    const text = String(item && item.text || '').trim();
    if (!text) return;
    if (existing.has(text) || seen.has(text)) { skipped++; return; }
    seen.add(text);

    const category = String(item && item.category || '').trim();
    let tagId = 'unclassified';
    if (category) {
      if (tagByName.has(category)) {
        tagId = tagByName.get(category);
      } else {
        const id = 't_imp_' + timestamp + '_' + newTags;
        const colors = (typeof TAG_COLORS !== 'undefined' && TAG_COLORS.length) ? TAG_COLORS : ['#8c8c8c'];
        tags.push({ id, name: category, color: colors[newTags % colors.length] });
        tagByName.set(category, id);
        tagId = id;
        newTags++;
      }
    }
    contents.push({ id: 'c_imp_' + timestamp + '_' + idx, type: 'text', val: text, tagId });
    added++;
  });

  if (added) {
    saveAllData();
    currentLib = 'text';
    currentTagId = 'all';
    refreshCardsUI();
  }
  return { added, skipped, newTags };
}

const importCardsBtn = document.getElementById('importCardsBtn');
const importCardsInput = document.getElementById('importCardsInput');
if (importCardsBtn && importCardsInput) {
  importCardsBtn.onclick = () => importCardsInput.click();
  importCardsInput.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let items;
      try {
        items = parseCardImport(reader.result, file.name);
      } catch (err) {
        console.warn('[cards] import parse failed', err);
        return showToast('导入失败：JSON 格式不正确');
      }
      if (!items.length) return showToast('没有找到文字字卡');
      const preview = previewTextCardImport(items);
      if (!preview.add) return showToast(`没有可新增的字卡，${preview.skip} 条已存在`);
      const catText = preview.categories.length
        ? `\n识别到分类：${preview.categories.slice(0, 6).join('、')}${preview.categories.length > 6 ? ' 等' : ''}`
        : '';
      showConfirm('导入文字字卡',
        `共读取 ${items.length} 条，预计新增 ${preview.add} 条${preview.skip ? `，跳过 ${preview.skip} 条重复` : ''}。${catText}\n只会追加文字字卡，不会覆盖现有字卡。`,
        () => {
          const result = applyTextCardImport(items);
          const parts = [`已导入 ${result.added} 条字卡`];
          if (result.newTags) parts.push(`新建 ${result.newTags} 个分类`);
          if (result.skipped) parts.push(`跳过 ${result.skipped} 条重复`);
          showToast(parts.join('，'));
        });
    };
    reader.onerror = () => showToast('文件读取失败，请重试');
    reader.readAsText(file, 'utf-8');
  };
}

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
// 修复：标签调色盘扩充为 24 色，色差更大，只保留一个深灰
const TAG_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db',
  '#9b59b6', '#fd79a8', '#00cec9', '#6c5ce7', '#ff7675', '#fab1a0',
  '#ffeaa7', '#55efc4', '#81ecec', '#74b9ff', '#a29bfe', '#fd79c8',
  '#e17055', '#00b894', '#0984e3', '#d63031', '#b2bec3', '#2d3436'
];
let editingTagId = null, pickingColor = '';