// Metro Jang — sozlamalar, saqlash (localStorage), statistika va geympad.
'use strict';

const Store = (() => {
  const KEY = 'metroJang.v1';
  const def = () => ({
    settings: { music: 0.5, sfx: 0.8, roundTime: 60, shake: true, voice: true, lang: 'uz', quality: 1 },
    stats: { matches: 0, wins: 0, losses: 0, finishers: 0, supers: 0, bestCombo: 0, perFighter: {} },
    story: { chapter: 0, done: false, version: 2 },
    unlocked: { soya: false },
  });
  let data = def();
  try { const raw = localStorage.getItem(KEY); if (raw) data = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* saqlash ishlamasa ham o'yin ishlayveradi */ }
  // Eski hikoyada 5-bob final edi; yangi ikki bob qo'shilganda davom etayotgan o'yinchi finalni yo'qotmasin.
  if (data.story && !data.story.version) {
    if (!data.story.done && data.story.chapter >= 5) data.story.chapter += 2;
    data.story.version = 2;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* saqlash ixtiyoriy */ }
  }
  return {
    get d() { return data; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* e'tiborsiz */ } },
    resetStats() { const k = def(); data.stats = k.stats; this.save(); },
    resetAll() { data = def(); this.save(); },
  };
})();

// Geympad: 1-geympad — 1-o'yinchi, 2-geympad — 2-o'yinchi (standart joylashuv)
const Pads = (() => {
  const prev = [{}, {}];
  const cur = [{ held: {}, press: {} }, { held: {}, press: {} }];
  // X — yengil, Y — kuchli, A — tepish, B — ushlash, RB/RT — blok, LB/LT — maxsus
  const MAP = { punch: [2], heavy: [3], kick: [0], grab: [1], block: [5, 7], special: [4, 6], up: [12], down: [13], left: [14], right: [15] };
  function poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < 2; i++) {
      const p = pads && pads[i], held = {}, press = {};
      if (p && p.connected) {
        for (const a in MAP) if (MAP[a].some(b => p.buttons[b] && p.buttons[b].pressed)) held[a] = true;
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (ax < -0.5) held.left = true; if (ax > 0.5) held.right = true;
        if (ay < -0.6) held.up = true; if (ay > 0.6) held.down = true;
        if (p.buttons[9] && p.buttons[9].pressed) held.start = true;
        for (const a in held) if (!prev[i][a]) press[a] = true;
      }
      prev[i] = held; cur[i] = { held, press };
    }
  }
  return { poll, get: i => cur[i], any: () => cur[0].press.start || cur[1].press.start };
})();
