// ===== 后台：音乐管理 =====
// 曲库增删、配歌词、试听都在这里；数据来自 chat_music.js 的 MUSIC_PLAYLIST

const musicManageAddBtn = document.getElementById('musicManageAdd');
const musicManageFileInput = document.getElementById('musicManageFile');

if (musicManageAddBtn && musicManageFileInput) {
  musicManageAddBtn.onclick = () => musicManageFileInput.click();
  musicManageFileInput.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    importMusicFiles(files, { autoPlay: false });
  };
}

function renderMusicManageList() {
  const box = document.getElementById('musicManageList');
  if (!box) return;
  const list = (typeof MUSIC_PLAYLIST !== 'undefined') ? MUSIC_PLAYLIST : [];
  const cur = (typeof getMusicIndex === 'function') ? getMusicIndex() : 0;
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="music-empty">曲库是空的，点右上角「＋ 导入」选几首 mp3</div>';
    return;
  }
  list.forEach((s, i) => {
    const hasLyric = (typeof lyricsFor === 'function') && lyricsFor(s).length > 0;
    const lyricTag = (typeof lyricBadge === 'function') ? lyricBadge(s) : (hasLyric ? ' · 有词' : '');
    const badge = s.trackId ? '本地' : (s.kind === 'book' ? '听书' : '歌单');
    const row = document.createElement('div');
    row.className = 'mm-row' + (i === cur ? ' active' : '');
    row.innerHTML = `
      <span class="mm-index">${i + 1}</span>
      <div class="mm-main">
        <div class="mm-title">${escapeHtml(s.title)}</div>
        <div class="mm-sub"><span class="mi-badge">${badge}</span>${escapeHtml(s.artist || '未知')}${escapeHtml(lyricTag)}</div>
      </div>`;
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
