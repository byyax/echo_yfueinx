// ===== 音效 =====
// 发消息 / 通话铃声 / 接通挂断 用 sound/ 里的 mp3；
// 收红包礼物用 WebAudio 合成的"叮咚"，不吵，也不用额外文件。

const SFX_FILES = {
  send:        { src: 'sound/send.mp3',         volume: 0.45 },
  callRequest: { src: 'sound/call-request.mp3', volume: 0.45, loop: true },
  callTone:    { src: 'sound/call-tone.mp3',    volume: 0.5 }
};

const _sfxPlayers = {};
let chimeCtx = null;
let audioUnlocked = false;

function soundEnabled() {
  return !(typeof chatSettings !== 'undefined' && chatSettings && chatSettings.sound === false);
}

function getSfx(name) {
  const cfg = SFX_FILES[name];
  if (!cfg) return null;
  let el = _sfxPlayers[name];
  if (!el) {
    el = new Audio(cfg.src);
    el.preload = 'auto';
    el.volume = cfg.volume != null ? cfg.volume : 0.5;
    el.loop = !!cfg.loop;
    _sfxPlayers[name] = el;
  }
  return el;
}

function playSfx(name) {
  if (!soundEnabled()) return;
  const el = getSfx(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
}

function stopSfx(name) {
  const el = _sfxPlayers[name];
  if (!el) return;
  try { el.pause(); el.currentTime = 0; } catch (e) {}
}

// 收到红包/礼物/转账：两声很轻的铃，A5 → D6
function playReceiveChime() {
  if (!soundEnabled()) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!chimeCtx) chimeCtx = new Ctx();
    if (chimeCtx.state === 'suspended') chimeCtx.resume();
    const t0 = chimeCtx.currentTime;
    [{ f: 880, d: 0 }, { f: 1174.66, d: 0.12 }].forEach(n => {
      const osc = chimeCtx.createOscillator();
      const gain = chimeCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0, t0 + n.d);
      gain.gain.linearRampToValueAtTime(0.075, t0 + n.d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + n.d + 0.55);
      osc.connect(gain);
      gain.connect(chimeCtx.destination);
      osc.start(t0 + n.d);
      osc.stop(t0 + n.d + 0.6);
    });
  } catch (e) {}
}

// 第一次触摸/点击时解锁音频，免得手机浏览器拦着不让播
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx && !chimeCtx) chimeCtx = new Ctx();
    if (chimeCtx && chimeCtx.state === 'suspended') chimeCtx.resume();
  } catch (e) {}
}
document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
document.addEventListener('keydown', unlockAudio, { once: true });

window.playSfx = playSfx;
window.stopSfx = stopSfx;
window.playReceiveChime = playReceiveChime;
