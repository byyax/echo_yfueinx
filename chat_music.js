// ===== 音乐系统 =====
// 曲库 = 内置曲目（听书节选 / 歌单，走模拟播放 + 计时歌词）+ 本地导入 mp3（IndexedDB，退出不丢）
// 歌词：内置曲目自带时间轴；本地歌可以导入 .lrc，跟音频逐句对齐。

const MUSIC_LIBRARY = [
  // —— 听书/节选：有正文，可以当"朗读"来听 ——
  {
    kind: 'book', title: '小王子 · 如果你驯养了我', artist: '圣埃克苏佩里',
    lines: [
      { t: 1, text: '对我而言，你只是一个小男孩' },
      { t: 7, text: '和成千上万个小男孩一样' },
      { t: 13, text: '我不需要你，你也不需要我' },
      { t: 19, text: '但如果你驯养了我' },
      { t: 25, text: '我们就会彼此需要' },
      { t: 31, text: '你就是我的独一无二' }
    ]
  },
  {
    kind: 'book', title: '小王子 · 会笑的星星', artist: '圣埃克苏佩里',
    lines: [
      { t: 1, text: '夜里你抬头看星星的时候' },
      { t: 8, text: '因为我住在其中一颗上面' },
      { t: 15, text: '因为我在那颗星星上笑' },
      { t: 22, text: '所以对你来说，就像所有星星都在笑' },
      { t: 30, text: '你就会拥有会笑的星星' }
    ]
  },
  {
    kind: 'book', title: '莎士比亚 · 十四行诗', artist: '第 18 首',
    lines: [
      { t: 1, text: '我能否把你比作夏天' },
      { t: 7, text: '你比夏天更可爱，也更温婉' },
      { t: 13, text: '狂风会摇落五月的花蕾' },
      { t: 19, text: '夏天的期限又总是太短' },
      { t: 25, text: '只要人还能呼吸，眼睛还能看见' },
      { t: 32, text: '这首诗就让你与时间同在' }
    ]
  },
  {
    kind: 'book', title: '哈姆雷特 · 生存还是毁灭', artist: '莎士比亚',
    lines: [
      { t: 1, text: '生存还是毁灭' },
      { t: 6, text: '这是一个值得考虑的问题' },
      { t: 12, text: '是默默忍受命运的暴虐' },
      { t: 18, text: '还是挺身反抗无边的苦恼' }
    ]
  },
  {
    kind: 'book', title: '飞鸟集 · 生如夏花', artist: '泰戈尔',
    lines: [
      { t: 1, text: '生如夏花之绚烂' },
      { t: 6, text: '死如秋叶之静美' },
      { t: 11, text: '世界以痛吻我' },
      { t: 16, text: '我要它报之以歌' },
      { t: 22, text: '如果你因错过太阳而流泪' },
      { t: 28, text: '那么你也将错过群星' }
    ]
  },

  // —— 歌单（没有歌词，导入同名 mp3 / .lrc 后就能真播真唱）——
  { kind: 'song', title: "글쎄 (I Don't Know)", artist: 'SEVENTEEN', src: 'music/SEVENTEEN - 글쎄.mp3' },
  { kind: 'song', title: '雪化作泪滴 (Old Tape)', artist: 'Cheeze / Trazzy / 雾明' },
  { kind: 'song', title: 'My Lady (Chinese Ver.)', artist: 'EXO' },
  { kind: 'song', title: '달빛 (月光)', artist: 'GOT7', src: 'music/GOT7 - 달빛.mp3' },
  { kind: 'song', title: 'Mr. "Broken Heart"（"心碎"先生）', artist: '松下優也' },
  { kind: 'song', title: '明知故犯', artist: 'Max李玄' },
  { kind: 'song', title: '无意', artist: '加木 / Demxntia' },
  { kind: 'song', title: '茉莉', artist: 'JBcob林泽贤 / 张泳浩' },
  { kind: 'song', title: 'Boy In Luv', artist: 'BTS (防弹少年团)', src: 'music/BTS (防弹少年团) - Boy In Luv.mp3' },
  { kind: 'song', title: 'I NEED U', artist: 'BTS (防弹少年团)', src: 'music/BTS (防弹少年团) - I NEED U.mp3' },
  { kind: 'song', title: '都市问题', artist: 'Capper / LEGGO' },
  { kind: 'song', title: 'Bedroom Trip', artist: 'Luke Christopher' },
  { kind: 'song', title: 'Too Late', artist: 'After 7' },
  { kind: 'song', title: 'My Love', artist: 'Dok2 / 朴宰范', src: 'music/Dok2 朴宰范 - My Love.mp3' },
  { kind: 'song', title: '121', artist: 'ICE杨长青 / 邹沛沛' }
];

// 运行时歌单：内置在前，本地导入追加在后
const MUSIC_PLAYLIST = MUSIC_LIBRARY.map(s => Object.assign({}, s));

const musicBar = document.getElementById('musicBar');
const musicTitleEl = document.getElementById('musicTitle');
const musicArtistEl = document.getElementById('musicArtist');
const musicPlayBtn = document.getElementById('musicPlayBtn');
const musicPrevBtn = document.getElementById('musicPrevBtn');
const musicNextBtn = document.getElementById('musicNextBtn');
const musicCloseBtn = document.getElementById('musicCloseBtn');
const musicAddBtn = document.getElementById('musicAddBtn');
const musicModeBtn = document.getElementById('musicModeBtn');
const musicFileInput = document.getElementById('musicFileInput');
const signatureBarEl = document.getElementById('signatureBar');
const signatureWrapperEl = document.querySelector('.signature-wrapper');

let musicIndex = 0;
let musicPlaying = false;
let musicBarOpen = false;
let savedSignatureText = '';

// 播放模式：list 列表循环 / one 单曲循环 / shuffle 随机
const PLAY_MODES = ['list', 'one', 'shuffle'];
const PLAY_MODE_LABEL = { list: '列表循环', one: '单曲循环', shuffle: '随机播放' };
const PLAY_MODE_ICON = { list: '🔁', one: '🔂', shuffle: '🔀' };
let playMode = 'list';
try { playMode = localStorage.getItem('echo_play_mode') || 'list'; } catch (e) {}
if (PLAY_MODES.indexOf(playMode) < 0) playMode = 'list';

function applyPlayModeUI() {
  if (!musicModeBtn) return;
  musicModeBtn.textContent = PLAY_MODE_ICON[playMode];
  musicModeBtn.title = PLAY_MODE_LABEL[playMode];
}
function cyclePlayMode() {
  playMode = PLAY_MODES[(PLAY_MODES.indexOf(playMode) + 1) % PLAY_MODES.length];
  try { localStorage.setItem('echo_play_mode', playMode); } catch (e) {}
  applyPlayModeUI();
  showToast(PLAY_MODE_LABEL[playMode]);
}

// 播放时钟（模拟曲目走虚拟时间，本地歌走 audio.currentTime）
let simTime = 0;
let clockTimer = null;
let lyricLines = [];
let lyricIdx = -1;
let lyricTitle = '';

const musicAudio = new Audio();
musicAudio.preload = 'metadata';

function currentSong() { return MUSIC_PLAYLIST[musicIndex] || null; }
function isLocalSong(song) { return !!(song && song.src); }

// 曲库列表 / 播放器上显示歌词状态
function lyricBadge(song) {
  const lines = lyricsFor(song);
  if (!lines.length) return '';
  return lines.some(l => l.tr) ? ' · 双语' : ' · 有词';
}

function updateMusicBarUI() {
  const song = currentSong();
  if (!song) {
    if (musicTitleEl) musicTitleEl.textContent = '还没有歌';
    if (musicArtistEl) musicArtistEl.textContent = '点 ＋ 导入本地 mp3';
    if (musicPlayBtn) musicPlayBtn.textContent = '▶';
    if (musicBar) musicBar.classList.remove('playing');
    return;
  }
  if (musicTitleEl) musicTitleEl.textContent = song.title;
  if (musicArtistEl) {
    const tag = song.trackId ? '本地导入' : (song.src ? '本地文件' : (song.kind === 'book' ? '听书' : '歌单'));
    musicArtistEl.textContent = `${song.artist} · ${tag}${lyricBadge(song)} · ${musicIndex + 1}/${MUSIC_PLAYLIST.length}`;
  }
  if (musicPlayBtn) musicPlayBtn.textContent = musicPlaying ? '⏸' : '▶';
  if (musicBar) musicBar.classList.toggle('playing', musicPlaying);
}

// ===== 歌词 =====
// 支持双语：同一个时间戳写两行（第一行原文、第二行译文），或者单独导入一份 .zh.lrc。
function parseLRC(text) {
  const raw = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const tags = line.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g);
    if (!tags) return;
    const body = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!body) return;
    tags.forEach(tag => {
      const p = tag.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/);
      if (!p) return;
      const ms = p[3] ? parseInt(p[3].padEnd(3, '0'), 10) : 0;
      raw.push({ t: parseInt(p[1], 10) * 60 + parseInt(p[2], 10) + ms / 1000, text: body });
    });
  });
  raw.sort((a, b) => a.t - b.t);

  // 时间戳几乎相同的第二行，认作译文
  const out = [];
  raw.forEach(item => {
    const last = out[out.length - 1];
    if (last && Math.abs(last.t - item.t) < 0.35 && !last.tr && last.text !== item.text) {
      last.tr = item.text;
    } else {
      out.push({ t: item.t, text: item.text, tr: null });
    }
  });
  return out;
}

function lyricsFor(song) {
  if (!song) return [];
  if (song.lines && song.lines.length) return song.lines;
  let raw = null;
  try { raw = localStorage.getItem('echo_lyric_' + song.title); } catch (e) {}
  // 自己导入的歌词优先；没有就用随项目带的内置歌词
  if (!raw && typeof BUILTIN_LYRICS !== 'undefined') raw = BUILTIN_LYRICS[song.title] || null;
  if (!raw) return [];
  if (!song._lyr || song._lyrRaw !== raw) {
    song._lyrRaw = raw;
    song._lyr = parseLRC(raw);
  }
  return song._lyr || [];
}

function currentPlayTime() {
  const song = currentSong();
  if (isLocalSong(song)) return musicAudio.currentTime || 0;
  return simTime;
}

function renderLyricLine(text, dur, translation) {
  if (!signatureBarEl) return;
  const twoLine = !!(translation && translation !== text);
  signatureBarEl.classList.toggle('two-line', twoLine);
  if (twoLine) {
    signatureBarEl.innerHTML = '';
    const main = document.createElement('span'); main.className = 'lyric-main'; main.textContent = translation;
    const orig = document.createElement('span'); orig.className = 'lyric-orig'; orig.textContent = text;
    signatureBarEl.appendChild(main);
    signatureBarEl.appendChild(orig);
  } else {
    signatureBarEl.textContent = text;
  }
  signatureBarEl.style.setProperty('--line-dur', Math.max(1.2, dur || 4) + 's');
  signatureBarEl.classList.remove('lyric-scroll');
  void signatureBarEl.offsetWidth;
  signatureBarEl.classList.add('lyric-scroll');
}

function renderMusicModeTitle(song) {
  if (!signatureBarEl) return;
  signatureBarEl.classList.remove('two-line');
  signatureBarEl.textContent = song ? song.title : '';
  signatureBarEl.classList.remove('lyric-scroll');
  void signatureBarEl.offsetWidth;
  signatureBarEl.classList.add('lyric-scroll');
}

function lyricTick() {
  if (!lyricLines.length) return;
  const t = currentPlayTime();
  let idx = -1;
  for (let i = 0; i < lyricLines.length; i++) {
    if (lyricLines[i].t <= t + 0.08) idx = i; else break;
  }
  if (idx === lyricIdx) return;
  lyricIdx = idx;
  if (idx >= 0) {
    const cur = lyricLines[idx];
    const next = lyricLines[idx + 1];
    renderLyricLine(cur.text, next ? next.t - cur.t : 4.5, cur.tr);
  }
}

function startLyricSession() {
  const song = currentSong();
  if (!signatureBarEl || !signatureWrapperEl) return;
  savedSignatureText = chatSettings.signature || savedSignatureText;
  signatureWrapperEl.classList.add('music-mode');
  signatureBarEl.classList.add('lyric-bubble');
  lyricIdx = -1;
  lyricLines = lyricsFor(song);
  lyricTitle = song ? song.title : '';
  // 先亮歌名，第一句时间点到了再切歌词
  renderMusicModeTitle(song);
  if (lyricLines.length) lyricTick();
}

function stopLyricSession() {
  if (signatureBarEl) {
    signatureBarEl.classList.remove('lyric-scroll', 'lyric-bubble', 'two-line');
    signatureBarEl.style.removeProperty('--line-dur');
    signatureBarEl.textContent = savedSignatureText || chatSettings.signature || '这个人很懒，什么都没留下';
  }
  if (signatureWrapperEl) signatureWrapperEl.classList.remove('music-mode');
  lyricLines = [];
  lyricIdx = -1;
}

// ===== 时钟：驱动模拟播放和歌词同步 =====
function stopClock() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
}
function startClock() {
  stopClock();
  clockTimer = setInterval(() => {
    if (!musicPlaying) return;
    const song = currentSong();
    if (!song) return;
    if (isLocalSong(song)) {
      lyricTick();
      return;
    }
    simTime += 0.2;
    lyricTick();
    const total = lyricLines.length ? lyricLines[lyricLines.length - 1].t + 5 : 30;
    if (simTime >= total) autoAdvance();
  }, 200);
}

// ===== 播放控制 =====
function loadAudioForCurrent() {
  const song = currentSong();
  if (!song) return;
  if (isLocalSong(song)) {
    if (musicAudio.getAttribute('src') !== song.src) musicAudio.src = song.src;
  } else {
    musicAudio.removeAttribute('src');
    try { musicAudio.load(); } catch (e) {}
    musicAudio.pause();
  }
}

function rememberSong() {
  const song = currentSong();
  if (!song) return;
  try { localStorage.setItem('echo_last_song', song.title); } catch (e) {}
}

function musicPlay() {
  const song = currentSong();
  if (!song) return showToast('歌单是空的，先导入一首吧');
  musicPlaying = true;
  simTime = 0;
  loadAudioForCurrent();
  if (isLocalSong(song)) musicAudio.play().catch(() => {});
  startLyricSession();
  startClock();
  updateMusicBarUI();
  rememberSong();
}

function musicPause() {
  musicPlaying = false;
  musicAudio.pause();
  stopClock();
  stopLyricSession();
  updateMusicBarUI();
}

function musicGoto(delta) {
  if (!MUSIC_PLAYLIST.length) return;
  musicIndex = (musicIndex + delta + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
  simTime = 0;
  if (musicPlaying) {
    loadAudioForCurrent();
    if (isLocalSong(currentSong())) musicAudio.play().catch(() => {});
    startLyricSession();
  }
  updateMusicBarUI();
  rememberSong();
  renderMusicList();
}

function scrollChatToBottomSoon() {
  const chatEl = document.getElementById('chat');
  if (!chatEl) return;
  setTimeout(() => { chatEl.scrollTop = chatEl.scrollHeight; }, 360);
}

function openMusicBar() {
  if (musicBarOpen) { updateMusicBarUI(); return; }
  musicBarOpen = true;
  if (musicBar) musicBar.classList.add('show');
  updateMusicBarUI();
  scrollChatToBottomSoon();
}
function closeMusicBar() {
  musicBarOpen = false;
  musicPause();
  if (musicBar) musicBar.classList.remove('show');
  scrollChatToBottomSoon();
  hideMusicList();
}

// 一首放完：按当前模式决定重播、随机还是下一首
function autoAdvance() {
  if (playMode === 'one') {
    simTime = 0;
    if (isLocalSong(currentSong())) {
      try { musicAudio.currentTime = 0; } catch (e) {}
      musicAudio.play().catch(() => {});
    }
    startLyricSession();
    return;
  }
  if (playMode === 'shuffle' && MUSIC_PLAYLIST.length > 1) {
    let idx = musicIndex;
    while (idx === musicIndex) idx = Math.floor(Math.random() * MUSIC_PLAYLIST.length);
    musicIndex = idx;
    simTime = 0;
    if (musicPlaying) {
      loadAudioForCurrent();
      if (isLocalSong(currentSong())) musicAudio.play().catch(() => {});
      startLyricSession();
    }
    updateMusicBarUI();
    rememberSong();
    renderMusicList();
    return;
  }
  musicGoto(1);
}

musicAudio.addEventListener('ended', autoAdvance);
let audioErrorAt = 0;
musicAudio.addEventListener('error', () => {
  const song = currentSong();
  if (!song || !isLocalSong(song)) return;
  musicPlaying = false;
  updateMusicBarUI();
  if (Date.now() - audioErrorAt > 4000) {
    audioErrorAt = Date.now();
    showToast('这首歌读不出来了，换一首试试');
  }
});

// ===== 对外：按歌名播放 / 随机挑一首 / 分享 =====
function playSongByTitle(title) {
  if (!title) return;
  const key = String(title);
  let idx = MUSIC_PLAYLIST.findIndex(s => s.title === key);
  if (idx < 0) idx = MUSIC_PLAYLIST.findIndex(s => s.title.indexOf(key) >= 0 || key.indexOf(s.title) >= 0);
  if (idx < 0) idx = 0;
  musicIndex = idx;
  openMusicBar();
  musicPlay();
}
function pickRandomSong() {
  if (!MUSIC_PLAYLIST.length) return null;
  return MUSIC_PLAYLIST[Math.floor(Math.random() * MUSIC_PLAYLIST.length)];
}
function shareSongToChat(i) {
  const s = MUSIC_PLAYLIST[i];
  if (!s) return;
  sendMessage({ name: s.title, artist: s.artist, val: s.title }, 'musicshare', true);
  hideMusicList();
  showToast('已分享到聊天');
}
function inviteTogether(i) {
  const s = MUSIC_PLAYLIST[i];
  if (!s) return;
  sendMessage({ name: s.title, artist: s.artist }, 'musicinvite', true);
  hideMusicList();
  showToast('邀请已发出');
  setTimeout(() => sendMessage('好呀，一起听。', 'text', false), 1600 + Math.random() * 1400);
}

// ===== 本地 mp3：IndexedDB 持久化 =====
const MUSIC_DB = 'echo_music';
const MUSIC_STORE = 'tracks';
let musicDBPromise = null;

function getMusicDB() {
  if (!musicDBPromise) {
    musicDBPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('no-indexeddb')); return; }
      const req = indexedDB.open(MUSIC_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MUSIC_STORE)) db.createObjectStore(MUSIC_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return musicDBPromise;
}
function dbGetAll() {
  return getMusicDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readonly');
    const q = tx.objectStore(MUSIC_STORE).getAll();
    q.onsuccess = () => resolve(q.result || []);
    q.onerror = () => reject(q.error);
  }));
}
function dbPut(record) {
  return getMusicDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readwrite');
    tx.objectStore(MUSIC_STORE).put(record);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  }));
}
function dbDelete(id) {
  return getMusicDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readwrite');
    tx.objectStore(MUSIC_STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  })).catch(() => {});
}

function isAudioFile(f) {
  return /^audio\//.test(f.type || '') || /\.(mp3|m4a|wav|flac|ogg|aac|opus)$/i.test(f.name || '');
}

// 导入：加进歌单 → 写 IndexedDB；同名内置曲目会直接挂上音频，不再多出一条
async function importMusicFiles(files, opts) {
  const options = opts || {};
  const all = files || [];
  const lrcs = all.filter(f => /\.lrc$/i.test(f.name || ''));
  const audios = all.filter(isAudioFile);
  if (!audios.length && !lrcs.length) { showToast('没找到音频或歌词文件'); return 0; }

  // 先收歌词。名字里带 .zh / .cn / .trans 的当译文，跟原文按时间戳合到一起
  const isTransFile = f => /[._-](zh|cn|chs|chi|trans|tlyric)\.lrc$/i.test(f.name || '');
  const lyricBase = name => (name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[._-](zh|cn|chs|chi|trans|tlyric)$/i, '');

  // 文件名常带歌手前缀（"BTS - Boy In Luv"），尽量对回曲库里的歌名
  function resolveLyricKey(base) {
    const list = MUSIC_PLAYLIST || [];
    let best = null;
    list.forEach(s => {
      if (!s || !s.title) return;
      if (base === s.title) { best = s.title; return; }
      if ((base.endsWith(s.title) || base.includes(s.title)) && (!best || s.title.length > best.length)) best = s.title;
    });
    return best || base;
  }

  const mainTexts = new Map();
  const transTexts = new Map();
  for (const f of lrcs) {
    const key = resolveLyricKey(lyricBase(f.name));
    try {
      const text = await f.text();
      if (isTransFile(f)) transTexts.set(key, text);
      else mainTexts.set(key, text);
    } catch (e) {}
  }
  transTexts.forEach((trText, key) => {
    let baseText = mainTexts.get(key) || '';
    if (!baseText) { try { baseText = localStorage.getItem('echo_lyric_' + key) || ''; } catch (e) {} }
    if (!baseText && typeof BUILTIN_LYRICS !== 'undefined') baseText = BUILTIN_LYRICS[key] || '';
    if (!baseText) { showToast(`「${key}」还没有原文歌词，把原版 .lrc 一起选上`); return; }
    mainTexts.set(key, baseText + '\n' + trText);
  });

  let lyricCount = 0;
  mainTexts.forEach((text, key) => {
    if (!parseLRC(text).length) return;
    try { localStorage.setItem('echo_lyric_' + key, text); lyricCount++; } catch (e) {}
  });
  if (lyricCount) {
    MUSIC_PLAYLIST.forEach(s => { s._lyr = null; s._lyrRaw = null; });
    showToast(`已处理 ${lyricCount} 首歌词`);
  }
  if (!audios.length) {
    updateMusicBarUI(); renderMusicList();
    if (typeof renderMusicManageList === 'function') renderMusicManageList();
    return lyricCount;
  }

  let saved = 0, firstIndex = -1;
  for (const f of audios) {
    const title = (f.name || '本地音乐').replace(/\.[^.]+$/, '');
    const trackId = 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const url = URL.createObjectURL(f);
    // 文件名可能带歌手前缀，尽量挂到曲库里同名的空壳条目上，别多出一条
    let same = MUSIC_PLAYLIST.findIndex(s => s.title === title && !s.src);
    if (same < 0) same = MUSIC_PLAYLIST.findIndex(s => !s.src && (title.endsWith(s.title) || title.includes(s.title)));
    if (same >= 0) {
      MUSIC_PLAYLIST[same].src = url;
      MUSIC_PLAYLIST[same].trackId = trackId;
      if (firstIndex < 0) firstIndex = same;
    } else {
      MUSIC_PLAYLIST.push({ kind: 'song', title, artist: '本地导入', src: url, trackId });
      if (firstIndex < 0) firstIndex = MUSIC_PLAYLIST.length - 1;
    }
    try { await dbPut({ id: trackId, title, blob: f, addedAt: Date.now() }); saved++; }
    catch (err) {
      const s = MUSIC_PLAYLIST.find(x => x.trackId === trackId);
      if (s) { s.artist = '本地导入 · 本次有效'; delete s.trackId; }
    }
  }
  showToast(saved === audios.length ? `已导入 ${saved} 首，存进本地了` : `已导入 ${audios.length} 首，${audios.length - saved} 首只在本机本次有效`);
  if (firstIndex >= 0) musicIndex = firstIndex;
  if (options.autoPlay !== false) { openMusicBar(); musicPlay(); }
  updateMusicBarUI();
  renderMusicList();
  if (typeof renderMusicManageList === 'function') renderMusicManageList();
  return audios.length;
}

// 启动时把上次导入的歌接回歌单
(async function restoreLocalSongs() {
  let list = [];
  try { list = await dbGetAll(); } catch (e) { return; }
  if (!list.length) return;
  list.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  list.forEach(r => {
    if (!r || !r.blob) return;
    const url = URL.createObjectURL(r.blob);
    const rTitle = r.title || '';
    let same = MUSIC_PLAYLIST.findIndex(s => s.title === rTitle && !s.src);
    if (same < 0) same = MUSIC_PLAYLIST.findIndex(s => !s.src && rTitle && (rTitle.endsWith(s.title) || rTitle.includes(s.title)));
    if (same >= 0) {
      MUSIC_PLAYLIST[same].src = url;
      MUSIC_PLAYLIST[same].trackId = r.id;
    } else {
      MUSIC_PLAYLIST.push({ kind: 'song', title: r.title || '本地音乐', artist: '本地导入', src: url, trackId: r.id });
    }
  });
  let last = '';
  try { last = localStorage.getItem('echo_last_song') || ''; } catch (e) {}
  const hit = MUSIC_PLAYLIST.findIndex(s => s.title === last);
  if (hit >= 0) musicIndex = hit;
  updateMusicBarUI();
  renderMusicList();
  if (typeof renderMusicManageList === 'function') renderMusicManageList();
})();

function removeLocalTrack(i) {
  const song = MUSIC_PLAYLIST[i];
  if (!song || !song.trackId) return;
  MUSIC_PLAYLIST.splice(i, 1);
  if (i < musicIndex) musicIndex--;
  if (musicIndex >= MUSIC_PLAYLIST.length) musicIndex = 0;
  if (MUSIC_PLAYLIST.length === 0) musicPause();
  else if (musicPlaying) { loadAudioForCurrent(); if (isLocalSong(currentSong())) musicAudio.play().catch(() => {}); startLyricSession(); }
  dbDelete(song.trackId);
  updateMusicBarUI();
  renderMusicList();
  if (typeof renderMusicManageList === 'function') renderMusicManageList();
  showToast('已从曲库移除');
}

// ===== 歌词导入（.lrc）=====
let lrcTargetTitle = '';
const lrcFileInput = document.getElementById('lrcFileInput');
function pickLyricsFor(title) {
  if (!title) return;
  lrcTargetTitle = title;
  if (lrcFileInput) { lrcFileInput.value = ''; lrcFileInput.click(); }
}
if (lrcFileInput) {
  lrcFileInput.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseLRC(ev.target.result);
      if (!parsed.length) return showToast('这个文件里没读出歌词，换个 .lrc 试试');
      try { localStorage.setItem('echo_lyric_' + lrcTargetTitle, ev.target.result); } catch (err) { return showToast('歌词存不下了'); }
      const song = MUSIC_PLAYLIST.find(s => s.title === lrcTargetTitle);
      if (song) { song._lyr = null; song._lyrRaw = null; }
      showToast(`已导入 ${parsed.length} 句歌词`);
      if (musicPlaying && currentSong() && currentSong().title === lrcTargetTitle) { startLyricSession(); }
      renderMusicList();
      if (typeof renderMusicManageList === 'function') renderMusicManageList();
    };
    reader.readAsText(file, 'utf-8');
  };
}

// ===== 歌单面板 =====
const musicListModal = document.getElementById('musicListModal');
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function renderMusicList() {
  const box = document.getElementById('musicList');
  if (!box) return;
  box.innerHTML = '';
  if (!MUSIC_PLAYLIST.length) {
    box.innerHTML = '<div class="music-empty">还没有歌，点控制条上的 ＋ 导入本地 mp3</div>';
    return;
  }
  const tip = document.createElement('div');
  tip.className = 'music-tip';
  tip.textContent = '点歌名直接播放 ·「一起」邀请他听 ·「推荐」发到聊天';
  box.appendChild(tip);

  MUSIC_PLAYLIST.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'music-item' + (i === musicIndex ? ' active' : '');
    const badge = s.trackId ? '本地' : (s.kind === 'book' ? '听书' : '歌单');
    const hasLyric = lyricsFor(s).length > 0;
    item.innerHTML = `<span class="mi-index">${i === musicIndex && musicPlaying ? '▶' : i + 1}</span>
      <div class="mi-main">
        <div class="mi-title">${escapeHtml(s.title)}</div>
        <div class="mi-sub"><span class="mi-badge">${badge}</span>${escapeHtml(s.artist || '')}${escapeHtml(lyricBadge(s))}</div>
      </div>`;
    const lyricBtn = document.createElement('button');
    lyricBtn.className = 'mi-mini' + (hasLyric ? ' on' : '');
    lyricBtn.textContent = '词';
    lyricBtn.title = hasLyric ? '已有歌词，点击替换' : '导入 .lrc 歌词';
    lyricBtn.onclick = (ev) => { ev.stopPropagation(); pickLyricsFor(s.title); };
    item.appendChild(lyricBtn);
    const togetherBtn = document.createElement('button');
    togetherBtn.className = 'mi-mini';
    togetherBtn.textContent = '一起';
    togetherBtn.title = '邀请他一起听';
    togetherBtn.onclick = (ev) => { ev.stopPropagation(); inviteTogether(i); };
    item.appendChild(togetherBtn);
    const shareBtn = document.createElement('button');
    shareBtn.className = 'mi-mini';
    shareBtn.textContent = '推荐';
    shareBtn.title = '推荐给他（发到聊天）';
    shareBtn.onclick = (ev) => { ev.stopPropagation(); shareSongToChat(i); };
    item.appendChild(shareBtn);
    if (s.trackId) {
      const del = document.createElement('button');
      del.className = 'mi-mini danger';
      del.textContent = '🗑';
      del.title = '从曲库删除';
      del.onclick = (ev) => { ev.stopPropagation(); removeLocalTrack(i); };
      item.appendChild(del);
    }
    item.onclick = () => { musicIndex = i; musicPlay(); renderMusicList(); };
    box.appendChild(item);
  });
}
function openMusicList() {
  renderMusicList();
  if (musicListModal) musicListModal.classList.add('show');
}
function hideMusicList() {
  if (musicListModal) musicListModal.classList.remove('show');
}
const musicInfoEl = document.getElementById('musicInfo');
if (musicInfoEl) musicInfoEl.onclick = openMusicList;
const closeMusicListBtn = document.getElementById('closeMusicListBtn');
if (closeMusicListBtn) closeMusicListBtn.onclick = hideMusicList;
if (musicListModal) musicListModal.onclick = (e) => { if (e.target === musicListModal) hideMusicList(); };

// 控制条上的 ＋
if (musicAddBtn && musicFileInput) {
  musicAddBtn.onclick = () => musicFileInput.click();
  musicFileInput.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    importMusicFiles(files, { autoPlay: true });
  };
}

// 工具面板入口
const toolMusic = document.getElementById('toolMusic');
if (toolMusic) toolMusic.onclick = () => {
  closePanels();
  openMusicBar();
  if (!musicPlaying) musicPlay();
};

if (musicPlayBtn) musicPlayBtn.onclick = () => musicPlaying ? musicPause() : musicPlay();
if (musicPrevBtn) musicPrevBtn.onclick = () => musicGoto(-1);
if (musicNextBtn) musicNextBtn.onclick = () => musicGoto(1);
if (musicCloseBtn) musicCloseBtn.onclick = () => closeMusicBar();
if (musicModeBtn) musicModeBtn.onclick = cyclePlayMode;
applyPlayModeUI();

// 签名自动轮换期间别覆盖歌词
const _origApplyChatSettings = typeof applyChatSettings === 'function' ? applyChatSettings : null;
if (_origApplyChatSettings) {
  applyChatSettings = function() {
    _origApplyChatSettings();
    if (musicPlaying) {
      savedSignatureText = chatSettings.signature || savedSignatureText;
      if (signatureBarEl && signatureBarEl.classList.contains('lyric-bubble')) {
        if (lyricLines.length) lyricTick(); else renderMusicModeTitle(currentSong());
      }
    }
  };
}

window.playSongByTitle = playSongByTitle;
window.pickRandomSong = pickRandomSong;
window.importMusicFiles = importMusicFiles;
window.getMusicPlaylist = () => MUSIC_PLAYLIST;
window.getMusicIndex = () => musicIndex;
window.removeLocalTrack = removeLocalTrack;
window.pickLyricsFor = pickLyricsFor;
