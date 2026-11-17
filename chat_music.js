// ===== 音乐系统：控制条 + 签名栏歌词滚动 + 本地 mp3 导入真实播放 =====
// 预置歌单为模拟播放（无音频文件，滚动歌词）；导入的本地 mp3 走 <audio> 真实播放。
// 想加预置歌：往 MUSIC_PLAYLIST 加 { title, artist, lyrics: [...] } 即可。
const MUSIC_PLAYLIST = [
  {
    title: '晚风告白',
    artist: '陆昀霏的歌单',
    lyrics: [
      '晚风吹过操场的角落',
      '你回头笑的样子我记了好久',
      '想把整个夏天都送给你',
      '汽水 晚风 还有心动的我',
      '如果你也刚好喜欢我',
      '就让这首歌替我说'
    ]
  },
  {
    title: '攀岩日记',
    artist: '单曲循环中',
    lyrics: [
      '指尖抠住小小的岩点',
      '心跳声大得像鼓点',
      '再往上一点 再往上一点',
      '山顶的风替我欢呼了一遍',
      '摔下来的时候也没在怕的',
      '因为知道有人在下面接着'
    ]
  },
  {
    title: '凌晨四点的海',
    artist: '冲浪特辑',
    lyrics: [
      '天亮之前海是深蓝色的',
      '浪打过来的时候我什么都不想',
      '咸咸的风吹乱头发',
      '这一刻世界只剩下海和我',
      '等日出把海面染成金色',
      '拍张照发给你 说早安'
    ]
  },
  {
    title: '滑雪场的信',
    artist: '冬日限定',
    lyrics: [
      '雪板划过白色的山坡',
      '呼出的白气像在写信',
      '手套里的手有点冰',
      '但想到你就暖烘烘的',
      '下次带你一起来好不好',
      '我教你 摔了我接着'
    ]
  },
  {
    title: '碎碎念',
    artist: '给你的歌',
    lyrics: [
      '今天吃饭的时候想到你',
      '路过球场的时候想到你',
      '手机一亮就希望是你',
      '怎么办 到处都是你',
      '这首歌没什么大道理',
      '就是想说 我好喜欢你'
    ]
  }
];

const musicBar = document.getElementById('musicBar');
const musicTitleEl = document.getElementById('musicTitle');
const musicArtistEl = document.getElementById('musicArtist');
const musicPlayBtn = document.getElementById('musicPlayBtn');
const musicPrevBtn = document.getElementById('musicPrevBtn');
const musicNextBtn = document.getElementById('musicNextBtn');
const musicCloseBtn = document.getElementById('musicCloseBtn');
const musicAddBtn = document.getElementById('musicAddBtn');
const musicFileInput = document.getElementById('musicFileInput');
const signatureBarEl = document.getElementById('signatureBar');
const signatureWrapperEl = document.querySelector('.signature-wrapper');

let musicIndex = 0;
let musicPlaying = false;
let musicBarOpen = false;
let lyricLine = 0;
let lyricTimer = null;
let savedSignatureText = '';
const musicAudio = new Audio();
musicAudio.preload = 'metadata';

function currentSong() { return MUSIC_PLAYLIST[musicIndex]; }
function isLocalSong(song) { return !!(song && song.src); }

function updateMusicBarUI() {
  const song = currentSong();
  if (musicTitleEl) musicTitleEl.textContent = song.title;
  if (musicArtistEl) musicArtistEl.textContent = `${song.artist} · ${musicIndex + 1}/${MUSIC_PLAYLIST.length}`;
  if (musicPlayBtn) musicPlayBtn.textContent = musicPlaying ? '⏸' : '▶';
  if (musicBar) musicBar.classList.toggle('playing', musicPlaying);
}

// ===== 签名栏歌词/歌名展示 =====
function renderSignatureLine(text) {
  if (!signatureBarEl) return;
  signatureBarEl.textContent = `🎵 ${text}`;
  signatureBarEl.classList.remove('lyric-scroll');
  void signatureBarEl.offsetWidth;
  signatureBarEl.classList.add('lyric-scroll');
}

function showLyricLine() {
  const song = currentSong();
  if (isLocalSong(song)) { renderSignatureLine(song.title); return; } // 本地歌无歌词，滚歌名
  renderSignatureLine(song.lyrics[lyricLine % song.lyrics.length]);
}

function startLyrics() {
  stopLyrics();
  if (!signatureBarEl || !signatureWrapperEl) return;
  savedSignatureText = chatSettings.signature || signatureBarEl.textContent;
  signatureWrapperEl.classList.add('music-mode');
  signatureBarEl.classList.add('lyric-bubble');
  lyricLine = 0;
  showLyricLine();
  const song = currentSong();
  lyricTimer = setInterval(() => { lyricLine++; showLyricLine(); }, isLocalSong(song) ? 6000 : 5000);
}

function stopLyrics() {
  if (lyricTimer) { clearInterval(lyricTimer); lyricTimer = null; }
  if (signatureBarEl) {
    signatureBarEl.classList.remove('lyric-scroll', 'lyric-bubble');
    signatureBarEl.textContent = savedSignatureText || chatSettings.signature || '这个人很懒，什么都没留下';
  }
  if (signatureWrapperEl) signatureWrapperEl.classList.remove('music-mode');
}

// ===== 播放控制 =====
function loadAudioForCurrent() {
  const song = currentSong();
  if (isLocalSong(song)) {
    if (musicAudio.src !== song.src) musicAudio.src = song.src;
  } else {
    musicAudio.removeAttribute('src');
    musicAudio.pause();
  }
}

function musicPlay() {
  musicPlaying = true;
  loadAudioForCurrent();
  if (isLocalSong(currentSong())) musicAudio.play().catch(() => {});
  startLyrics();
  updateMusicBarUI();
}
function musicPause() {
  musicPlaying = false;
  musicAudio.pause();
  stopLyrics();
  updateMusicBarUI();
}
function musicGoto(delta) {
  musicIndex = (musicIndex + delta + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
  lyricLine = 0;
  if (musicPlaying) {
    loadAudioForCurrent();
    if (isLocalSong(currentSong())) musicAudio.play().catch(() => {});
    startLyrics();
  }
  updateMusicBarUI();
}
function openMusicBar() {
  if (musicBarOpen) return;
  musicBarOpen = true;
  if (musicBar) musicBar.classList.add('show');
  updateMusicBarUI();
}
function closeMusicBar() {
  musicBarOpen = false;
  musicPause();
  if (musicBar) musicBar.classList.remove('show');
}

// 本地歌播完自动下一首
musicAudio.addEventListener('ended', () => musicGoto(1));

// 本地导入：选中文件追加进歌单（本次会话内有效，音频太大不写本地存储）
if (musicAddBtn && musicFileInput) {
  musicAddBtn.onclick = () => musicFileInput.click();
  musicFileInput.onchange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let added = 0;
    Array.from(files).forEach(f => {
      if (!/^audio\//.test(f.type || '') && !/\.(mp3|m4a|wav|flac|ogg|aac)$/i.test(f.name)) return;
      const name = f.name.replace(/\.[^.]+$/, '');
      MUSIC_PLAYLIST.push({ title: name, artist: '本地导入', src: URL.createObjectURL(f) });
      added++;
    });
    e.target.value = '';
    if (added > 0) {
      showToast(`已导入 ${added} 首本地音乐`);
      updateMusicBarUI();
    } else {
      showToast('没找到音频文件');
    }
  };
}

// 工具面板入口：打开控制条并直接播放
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

// 签名自动轮换期间别覆盖歌词：播放中只默默记下最新签名并恢复歌词显示
const _origApplyChatSettings = typeof applyChatSettings === 'function' ? applyChatSettings : null;
if (_origApplyChatSettings) {
  applyChatSettings = function() {
    _origApplyChatSettings();
    if (musicPlaying) {
      savedSignatureText = chatSettings.signature || savedSignatureText;
      if (signatureBarEl && signatureBarEl.classList.contains('lyric-bubble')) showLyricLine();
    }
  };
}
