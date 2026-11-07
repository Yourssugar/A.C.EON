/* Короткие звуки синтезом, без файлов: щелчок лампы, тумблер, галетник, шорох страницы.
   AudioContext создаётся на первом действии посетителя, иначе браузер его не пустит. */

let ctx = null;
let muted = false;

function audio() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(a, seconds) {
  const buf = a.createBuffer(1, Math.round(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function burst({ freq = 2000, q = 1, gain = 0.2, attack = 0.002, decay = 0.05, type = 'bandpass', seconds = 0.12, delay = 0 }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, seconds);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + seconds);
}

export const sfx = {
  setMuted(v) { muted = v; },
  get muted() { return muted; },
  lamp() {
    burst({ freq: 3200, q: 2, gain: 0.25, decay: 0.03 });
    burst({ freq: 900, q: 1, gain: 0.12, decay: 0.06, delay: 0.012 });
  },
  toggle() {
    burst({ freq: 2600, q: 3, gain: 0.3, decay: 0.025 });
    burst({ freq: 600, q: 2, gain: 0.18, decay: 0.08, delay: 0.01 });
  },
  detent() {
    burst({ freq: 4200, q: 6, gain: 0.12, decay: 0.018 });
  },
  page() {
    // шорох: широкий шум с медленной атакой и плавным спадом
    burst({ freq: 1800, q: 0.6, gain: 0.07, attack: 0.08, decay: 0.32, seconds: 0.5 });
    burst({ freq: 5200, q: 0.8, gain: 0.03, attack: 0.04, decay: 0.2, seconds: 0.35, delay: 0.05 });
  },
  cover() {
    burst({ freq: 400, q: 0.7, gain: 0.12, attack: 0.15, decay: 0.5, seconds: 0.8 });
    burst({ freq: 1400, q: 1, gain: 0.05, attack: 0.1, decay: 0.4, seconds: 0.7, delay: 0.2 });
  }
};
