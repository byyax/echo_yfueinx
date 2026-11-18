// ===== 后台：音乐管理 =====
// 曲库增删、排序、配歌词、试听都在这里；数据来自 chat_music.js 的 MUSIC_PLAYLIST

const musicManageAddBtn = document.getElementById('musicManageAdd');
const musicManageFileInput = document.getElementById('musicManageFile');
const musicBatchToggle = document.getElementById('musicBatchToggle');
const musicBatchActions = document.getElementById('musicBatchActions');
const musicSelectAllBtn = document.getElementById('musicSelectAll');
const musicMoveUpBtn = document.getElementById('musicMoveUp');
const musicMoveDownBtn = document.getElementById('musicMoveDown');
const musicBatchDeleteBtn = document.getElementById('musicBatchDelete');
const musicTipToggle = document.getElementById('musicTipToggle');
const musicCountLabel = document.getElementById('musicCountLabel');
const musicTipEl = document.getElementById('musicManageTip');
const musicRestoreHiddenBtn = document.getElementById('musicRestoreHidden');

let musicBatchMode = false;
const musicSelected = new Set();

if (musicManageAddBtn && musicManageFileInput) {
  musicManageAddBtn.onclick = () => musicManageFileInput.click();
  musicManageFileInput.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    importMusicFiles(files, { autoPlay: false });
  };
}

function updateMusicBatchUI() {
  const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
  if (musicCountLabel) {
    musicCountLabel.textContent = musicBatchMode
      ? `已选 ${musicSelected.size} / ${list.length}`
      : `共 ${list.length} 首`;
  }
  if (musicRestoreHiddenBtn) {
    const hidden = (typeof readHiddenMusic === 'function') ? readHiddenMusic() : [];
    musicRestoreHiddenBtn.style.display = hidden.length ? 'inline-block' : 'none';
  }
}

function setMusicBatchMode(on) {
  musicBatchMode = !!on;
  musicSelected.clear();
  if (musicBatchToggle) {
    musicBatchToggle.textContent = musicBatchMode ? '取消管理' : '批量管理';
    musicBatchToggle.classList.toggle('primary', musicBatchMode);
  }
  if (musicBatchActions) musicBatchActions.style.display = musicBatchMode ? 'flex' : 'none';
  if (!musicBatchMode) {
    const result = document.getElementById('musicCheckResult');
    if (result) result.classList.remove('show');
  }
  renderMusicManageList();
}

if (musicBatchToggle) {
  musicBatchToggle.onclick = () => setMusicBatchMode(!musicBatchMode);
}

if (musicTipToggle && musicTipEl) {
  musicTipToggle.onclick = () => {
    const show = !musicTipEl.classList.contains('show');
    musicTipEl.classList.toggle('show', show);
    musicTipToggle.textContent = show ? '收起说明' : '说明';
  };
}

if (musicSelectAllBtn) {
  musicSelectAllBtn.onclick = () => {
    const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
    if (!list.length) return;
    if (musicSelected.size === list.length) musicSelected.clear();
    else list.forEach(s => musicSelected.add(s));
    renderMusicManageList();
  };
}

function moveSelectedMusic(dir) {
  const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
  if (!musicSelected.size) return showToast('请先勾选要移动的歌曲');
  const playing = list[musicIndex];

  if (dir < 0) {
    for (let i = 1; i < list.length; i++) {
      if (musicSelected.has(list[i]) && !musicSelected.has(list[i - 1])) {
        const tmp = list[i - 1]; list[i - 1] = list[i]; list[i] = tmp;
      }
    }
  } else {
    for (let i = list.length - 2; i >= 0; i--) {
      if (musicSelected.has(list[i]) && !musicSelected.has(list[i + 1])) {
        const tmp = list[i + 1]; list[i + 1] = list[i]; list[i] = tmp;
      }
    }
  }

  if (playing) {
    const idx = list.indexOf(playing);
    if (idx >= 0) musicIndex = idx;
  }
  saveMusicOrder();
  updateMusicBarUI();
  renderMusicList();
  renderMusicManageList();
}

if (musicMoveUpBtn) musicMoveUpBtn.onclick = () => moveSelectedMusic(-1);
if (musicMoveDownBtn) musicMoveDownBtn.onclick = () => moveSelectedMusic(1);

if (musicBatchDeleteBtn) {
  musicBatchDeleteBtn.onclick = () => {
    if (!musicSelected.size) return showToast('请先勾选要删除的歌曲');
    const count = musicSelected.size;
    showConfirm('删除音乐', `确定删除选中的 ${count} 首吗？本地导入的音频也会一起移除。`, () => {
      const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
      const playing = list[musicIndex];
      const hidden = new Set((typeof readHiddenMusic === 'function') ? readHiddenMusic() : []);

      Array.from(musicSelected).forEach(s => {
        const idx = list.indexOf(s);
        if (idx < 0) return;
        if (s.trackId) {
          if (typeof dbDelete === 'function') dbDelete(s.trackId);
          // 内置曲目挂了本地音频时，把壳也一起隐藏，否则刷新后它又会回来
          const key = musicKey(s);
          if (key.indexOf('b:') === 0) hidden.add(key);
        } else {
          hidden.add(musicKey(s));
        }
        list.splice(idx, 1);
      });

      if (typeof writeHiddenMusic === 'function') writeHiddenMusic(Array.from(hidden));
      musicSelected.clear();

      if (!list.length) {
        musicIndex = 0;
        if (typeof musicPause === 'function') musicPause();
      } else if (playing && list.includes(playing)) {
        musicIndex = list.indexOf(playing);
      } else {
        if (typeof musicPause === 'function') musicPause();
        musicIndex = Math.min(musicIndex, list.length - 1);
        if (musicIndex < 0) musicIndex = 0;
      }

      saveMusicOrder();
      updateMusicBarUI();
      renderMusicList();
      renderMusicManageList();
      showToast(`已删除 ${count} 首；内置曲目可在「说明」里恢复`);
    });
  };
}

function restoreHiddenMusic() {
  if (typeof readHiddenMusic !== 'function') return;
  const hidden = readHiddenMusic();
  if (!hidden.length) return;
  const set = new Set(hidden);
  const source = (typeof MUSIC_LIBRARY !== 'undefined') ? MUSIC_LIBRARY : [];
  source.forEach(s => {
    const key = musicKey(s);
    if (set.has(key) && !MUSIC_PLAYLIST.some(x => musicKey(x) === key)) {
      MUSIC_PLAYLIST.push(Object.assign({}, s));
    }
  });
  writeHiddenMusic([]);
  applyMusicOrder();
  saveMusicOrder();
  updateMusicBarUI();
  renderMusicList();
  renderMusicManageList();
  showToast('已恢复隐藏的曲目');
}

if (musicRestoreHiddenBtn) musicRestoreHiddenBtn.onclick = restoreHiddenMusic;

// 检查所有带 src 的音频能不能读到，方便判断“文件没上传”还是“网络慢”
const musicCheckBtn = document.getElementById('musicCheckFiles');
const musicCheckResult = document.getElementById('musicCheckResult');
if (musicCheckBtn && musicCheckResult) {
  musicCheckBtn.onclick = async () => {
    musicCheckResult.classList.add('show');
    if (location.protocol === 'file:') {
      musicCheckResult.innerHTML = '<div class="bad">请用 https 网址打开后再检查。</div>';
      return;
    }
    const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST.filter(s => s.src) : [];
    if (!list.length) {
      musicCheckResult.textContent = '没有带音频文件的曲目。';
      return;
    }
    musicCheckBtn.disabled = true;
    musicCheckResult.innerHTML = '<div>正在检查…</div>';
    const bad = [];
    for (const s of list) {
      try {
        const isBlob = s.src.indexOf('blob:') === 0;
        const r = await fetch(s.src, isBlob ? { cache: 'no-store' } : { method: 'HEAD', cache: 'no-store' });
        if (r.body && r.body.cancel) { try { r.body.cancel(); } catch (e) {} }
        if (!r.ok) bad.push({ s, status: r.status });
      } catch (e) {
        bad.push({ s, status: '网络错误' });
      }
    }
    musicCheckBtn.disabled = false;
    if (!bad.length) {
      musicCheckResult.innerHTML = `<div class="ok">全部 ${list.length} 首音频都能读取。</div>`;
    } else {
      musicCheckResult.innerHTML = bad.map(x => `<div class="bad">${escapeHtml(x.s.title)}：读取失败（${x.status}）</div>`).join('');
    }
  };
}

function renderMusicManageList() {
  const box = document.getElementById('musicManageList');
  if (!box) return;
  const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
  const cur = (typeof getMusicIndex === 'function') ? getMusicIndex() : 0;

  // 清掉已经被删掉的选中项
  Array.from(musicSelected).forEach(s => { if (!list.includes(s)) musicSelected.delete(s); });

  box.innerHTML = '';
  updateMusicBatchUI();

  if (!list.length) {
    box.innerHTML = '<div class="music-empty">曲库是空的，点右上角「＋ 导入」选几首 mp3</div>';
    return;
  }

  list.forEach((s, i) => {
    const hasLyric = (typeof lyricsFor === 'function') && lyricsFor(s).length > 0;
    const lyricTag = (typeof lyricBadge === 'function') ? lyricBadge(s) : (hasLyric ? ' · 有词' : '');
    const badge = s.trackId ? '本地' : (s.kind === 'book' ? '听书' : '歌单');
    const row = document.createElement('div');
    row.className = 'mm-row' + (i === cur ? ' active' : '') + (musicBatchMode ? ' batch' : '');

    if (musicBatchMode) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'mm-check';
      cb.checked = musicSelected.has(s);
      cb.onclick = (ev) => ev.stopPropagation();
      cb.onchange = () => {
        if (cb.checked) musicSelected.add(s); else musicSelected.delete(s);
        updateMusicBatchUI();
      };
      row.appendChild(cb);
    }

    row.insertAdjacentHTML('beforeend', `
      <span class="mm-index">${i + 1}</span>
      <div class="mm-main">
        <div class="mm-title">${escapeHtml(s.title)}</div>
        <div class="mm-sub"><span class="mi-badge">${badge}</span>${escapeHtml(s.artist || '未知')}${escapeHtml(lyricTag)}</div>
      </div>`);

    if (musicBatchMode) {
      row.onclick = () => {
        if (musicSelected.has(s)) musicSelected.delete(s); else musicSelected.add(s);
        renderMusicManageList();
      };
      box.appendChild(row);
      return;
    }

    const playBtn = document.createElement('button');
    playBtn.className = 'mm-btn';
    playBtn.textContent = (i === cur && typeof musicPlaying !== 'undefined' && musicPlaying) ? '暂停' : '播放';
    playBtn.onclick = (ev) => {
      ev.stopPropagation();
      if (i === getMusicIndex() && typeof musicPlaying !== 'undefined' && musicPlaying) musicPause();
      else { musicIndex = i; openMusicBar(); musicPlay(); }
      renderMusicManageList();
    };
    const lyrBtn = document.createElement('button');
    lyrBtn.className = 'mm-btn' + (hasLyric ? ' on' : '');
    lyrBtn.textContent = '词';
    lyrBtn.title = hasLyric ? '已有歌词，点击替换' : '导入 .lrc 歌词';
    lyrBtn.onclick = (ev) => { ev.stopPropagation(); pickLyricsFor(s.title); };
    row.appendChild(playBtn);
    row.appendChild(lyrBtn);
    if (s.trackId) {
      const delBtn = document.createElement('button');
      delBtn.className = 'mm-btn danger';
      delBtn.textContent = '删';
      delBtn.onclick = (ev) => { ev.stopPropagation(); removeLocalTrack(i); };
      row.appendChild(delBtn);
    }
    row.onclick = () => { musicIndex = i; openMusicBar(); musicPlay(); renderMusicManageList(); };
    box.appendChild(row);
  });
}
