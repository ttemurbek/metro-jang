// Metro Jang — Web Audio API bilan yasalgan oddiy ovoz effektlari (fayl yo'q).
'use strict';
const _arnd = Math.random; // simulyatsiya urug'idan mustaqil

const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null, rumble = null, musicBus = null;
  let muted = false, sfxVol = 0.8, musVol = 0.5;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.55 * sfxVol;
    master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = muted ? 0 : 0.35 * musVol; musicBus.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function ready() { return ac && ac.state === 'running'; }

  function env(g, t0, vol, att, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function noise(dur, freq, q, vol, type = 'bandpass', freqTo = null, delay = 0) {
    if (!ready()) return;
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
    const g = ac.createGain();
    env(g, t0, vol, 0.005, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, _arnd()); src.stop(t0 + dur + 0.05);
  }

  function tone(freq, dur, type = 'sine', vol = 0.3, freqTo = null, delay = 0) {
    if (!ready()) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
    const g = ac.createGain();
    env(g, t0, vol, 0.01, dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  return {
    init,
    get muted() { return muted; },
    get ctx() { return ac; }, get musicBus() { return musicBus; }, get noise() { return noiseBuf; },
    setVolumes(s, m) { sfxVol = s; musVol = m; this.apply(); },
    apply() { if (master) master.gain.value = muted ? 0 : 0.55 * sfxVol; if (musicBus) musicBus.gain.value = muted ? 0 : 0.35 * musVol; },
    toggleMute() { muted = !muted; this.apply(); return muted; },
    zap() { tone(900, 0.25, 'sawtooth', 0.12, 200); noise(0.2, 3000, 2, 0.1, 'bandpass', 600); },
    whistle() { tone(2900, 0.5, 'sine', 0.25, 3100); tone(2950, 0.5, 'square', 0.04); },
    superStart() { tone(110, 0.8, 'sawtooth', 0.25, 440); noise(0.6, 300, 1, 0.3, 'bandpass', 4000); tone(55, 0.9, 'sine', 0.5); },
    hit(power = 1) {
      noise(0.08 + 0.05 * power, 900, 0.8, 0.5 * power, 'lowpass', 200);
      tone(120 * (1.3 - power * 0.2), 0.12, 'sine', 0.5 * power, 50);
    },
    heavy() {
      noise(0.25, 600, 0.7, 0.7, 'lowpass', 80);
      tone(90, 0.3, 'triangle', 0.6, 35);
    },
    finish(style) {
      this.heavy();
      const profile = {
        slam: [65, 36, 0.65], rise: [240, 720, 0.5], spin: [380, 150, 0.6],
        dive: [190, 55, 0.5], cut: [950, 260, 0.35], flash: [1200, 340, 0.7],
        grapple: [105, 45, 0.55], shadow: [120, 42, 0.85], dash: [320, 100, 0.42],
      }[style] || [130, 50, 0.5];
      tone(profile[0], profile[2], style === 'flash' ? 'triangle' : 'sawtooth', 0.18, profile[1]);
      noise(0.24, style === 'cut' ? 2200 : 520, 1, 0.24, 'bandpass', 180);
      this.voice('ko', style === 'shadow' ? 0.72 : 1);
    },
    block() { noise(0.05, 2500, 3, 0.25); tone(700, 0.05, 'square', 0.06, 400); },
    whoosh() { noise(0.16, 500, 1.5, 0.12, 'bandpass', 2400); },
    grab() { noise(0.12, 300, 1, 0.3, 'lowpass', 120); tone(200, 0.08, 'triangle', 0.15, 120); },
    thud() { tone(70, 0.35, 'sine', 0.7, 30); noise(0.2, 300, 0.5, 0.4, 'lowpass', 60); },
    ko() {
      tone(110, 1.2, 'sawtooth', 0.25, 40);
      tone(55, 1.4, 'sine', 0.6, 30);
      noise(0.8, 400, 0.6, 0.4, 'lowpass', 50);
    },
    gong() {
      [196, 293, 392].forEach((f, i) => tone(f, 1.6, 'sine', 0.22 / (i + 1), f * 0.97));
      noise(0.4, 1200, 2, 0.1, 'bandpass', 300);
    },
    chime() { // metro bekat signali (ikki notali)
      tone(988, 0.5, 'sine', 0.18);
      tone(784, 0.7, 'sine', 0.18, null, 0.35);
    },
    horn() {
      tone(220, 1.0, 'sawtooth', 0.12); tone(277, 1.0, 'sawtooth', 0.1);
    },
    trainPass() { noise(2.2, 200, 0.4, 0.35, 'lowpass', 900); },
    parry() { tone(1200, 0.12, 'triangle', 0.15, 2400); noise(0.08, 4000, 4, 0.15); },
    select() { tone(660, 0.07, 'square', 0.07); },
    confirm() { tone(523, 0.08, 'square', 0.08); tone(784, 0.12, 'square', 0.08, null, 0.07); },
    stomp() { tone(50, 0.6, 'sine', 0.8, 25); noise(0.5, 200, 0.4, 0.6, 'lowpass', 40); },
    special() { tone(300, 0.35, 'sawtooth', 0.15, 900); noise(0.3, 800, 1, 0.2, 'bandpass', 3000); },
    choke() { noise(0.3, 250, 4, 0.12, 'bandpass', 180); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'square', 0.08, null, i * 0.12)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.15, null, i * 0.18)); },
    // Poyezd ichidagi uzluksiz shovqin
    rumble(on) {
      if (!ac) return;
      if (on && !rumble) {
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
        const g = ac.createGain(); g.gain.value = 0.18;
        src.connect(f); f.connect(g); g.connect(master); src.start();
        rumble = { src, g };
      } else if (!on && rumble) {
        rumble.src.stop(); rumble = null;
      }
    },
    // sintez qilingan ovozlar: hayqiriq, og'riq, yiqilish
    voice(kind, pitch = 1) {
      if (!ready()) return;
      const t0 = ac.currentTime, o = ac.createOscillator(), f1 = ac.createBiquadFilter(), g = ac.createGain();
      const base = { kiai: 190, hurt: 230, ko: 160, win: 210 }[kind] * pitch, dur = { kiai: 0.22, hurt: 0.16, ko: 0.7, win: 0.5 }[kind];
      o.type = 'sawtooth'; o.frequency.setValueAtTime(base * 1.2, t0); o.frequency.exponentialRampToValueAtTime(base * (kind === 'ko' ? 0.5 : 0.8), t0 + dur);
      f1.type = 'bandpass'; f1.frequency.value = kind === 'hurt' ? 900 : 700; f1.Q.value = 3;
      env(g, t0, kind === 'ko' ? 0.22 : 0.16, 0.02, dur);
      o.connect(f1); f1.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
      noise(dur * 0.8, 1200, 1.5, 0.05);
    },
    say(text) { // diktor: brauzerning nutq sintezi (bo'lsa)
      if (muted || !window.speechSynthesis || !Store.d.settings.voice) return;
      const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices();
      const v = vs.find(x => /^uz/i.test(x.lang)) || vs.find(x => /^tr/i.test(x.lang)) || vs.find(x => /^ru/i.test(x.lang));
      if (v) u.voice = v; u.rate = 0.95; u.pitch = 0.7; u.volume = sfxVol;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    },
    clack() { noise(0.06, 1800, 2, 0.12); noise(0.06, 1800, 2, 0.1, 'bandpass', null, 0.12); },
  };
})();
