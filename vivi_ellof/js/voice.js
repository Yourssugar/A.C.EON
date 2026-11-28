/* Голос Архитектора: записанные фразы под события сцены.
   Файлы лежат в vivi_ellof/voice/, список в voice/voice.json: ["patrol_1.mp3", "lock_2.mp3", ...].
   Событие это имя файла до последнего _номер. Нет списка или нет файлов события: молчание.
   Звучит тихо, с отражением, музыка на это время приглушается. Между фразами не меньше 5 с,
   одна и та же фраза не повторяется подряд.

   createVoice(base, ver) -> { attach(sound), say(event, chance) }
   sound: контроллер из rift.js (ctx, voiceIn, duck) */

export function createVoice(base, ver) {
  let list = {}, sound = null, lastAt = -1e9, lastName = '', busy = false;
  const bufs = {}, cool = {};
  const COOL = { patrol: 25, idle: 40, pupil: 12, hear: 14, decoded: 10, suspect: 8, lock: 8, lost: 10 };

  fetch(new URL('voice/voice.json?v=' + ver, base).href)
    .then((r) => (r.ok ? r.json() : []))
    .then((names) => {
      (names || []).forEach((n) => {
        const ev = n.replace(/\.[a-z0-9]+$/i, '').replace(/_\d+$/, '');
        (list[ev] = list[ev] || []).push(n);
      });
    })
    .catch(() => {});

  async function load(name) {
    if (bufs[name]) return bufs[name];
    const r = await fetch(new URL('voice/' + name, base).href);
    const ab = await r.arrayBuffer();
    bufs[name] = await sound.ctx.decodeAudioData(ab);
    return bufs[name];
  }

  return {
    attach(s) { sound = s; },
    has(ev) { return !!(list[ev] && list[ev].length); },
    async say(ev, chance) {
      if (!sound || !sound.ctx || busy) return false;
      const names = list[ev];
      if (!names || !names.length) return false;
      if (chance !== undefined && Math.random() > chance) return false;
      const now = performance.now() / 1000;
      if (now - lastAt < 5 || (cool[ev] && now < cool[ev])) return false;
      let pick = names[(Math.random() * names.length) | 0];
      if (pick === lastName && names.length > 1) pick = names[(names.indexOf(pick) + 1) % names.length];
      busy = true; lastAt = now; lastName = pick;
      cool[ev] = now + (COOL[ev] || 0);
      try {
        const buf = await load(pick);
        const src = sound.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(sound.voiceIn);
        sound.duck(true);
        src.onended = () => { sound.duck(false); busy = false; };
        src.start();
        return true;
      } catch (e) { busy = false; return false; }
    }
  };
}
