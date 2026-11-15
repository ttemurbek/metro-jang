// Metro Jang — protsedura bilan yaratiladigan original fon musiqasi (fayl yo'q).
// Sharqona "hijoz" lad (1, b2, 3, 4, 5, b6, b7), doira uslubidagi ritm, bas va kuy.
'use strict';
const _mrnd = Math.random;

const Music = (() => {
  const SCALE = [0, 1, 4, 5, 7, 8, 10];
  const TRACKS = {
    menu:  { bpm: 92,  root: 50, lead: 'triangle', dens: 0.35, drums: 'soft' },
    fight: { bpm: 132, root: 45, lead: 'square',   dens: 0.6,  drums: 'hard' },
    train: { bpm: 144, root: 47, lead: 'sawtooth', dens: 0.55, drums: 'hard' },
    boss:  { bpm: 120, root: 41, lead: 'sawtooth', dens: 0.7,  drums: 'boss' },
    story: { bpm: 80,  root: 52, lead: 'sine',     dens: 0.3,  drums: 'none' },
    // har bekatning o'z kuyi
    kosmo:    { bpm: 126, root: 44, lead: 'square',   dens: 0.5,  drums: 'hard' },
    navoiy:   { bpm: 112, root: 50, lead: 'pluck',    dens: 0.65, drums: 'soft' },
    paxta:    { bpm: 130, root: 47, lead: 'pluck',    dens: 0.55, drums: 'hard' },
    mustaq:   { bpm: 138, root: 45, lead: 'sawtooth', dens: 0.5,  drums: 'hard' },
    bodom:    { bpm: 104, root: 52, lead: 'pluck',    dens: 0.6,  drums: 'soft' },
    chorsu:   { bpm: 118, root: 49, lead: 'pluck',    dens: 0.7,  drums: 'hard' },
    mingorik: { bpm: 110, root: 51, lead: 'triangle', dens: 0.55, drums: 'soft' },
    yunus:    { bpm: 140, root: 43, lead: 'square',   dens: 0.45, drums: 'hard' },
    depo:     { bpm: 134, root: 42, lead: 'sawtooth', dens: 0.5,  drums: 'boss' },
  };
  let cur = null, timer = null, step = 0, next = 0, seq = null, intensity = 0;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function note(t, m, dur, type, vol) {
    if (type === 'pluck') { note(t, m, Math.min(dur, 0.35), 'triangle', vol * 1.4); note(t, m + 0.08, Math.min(dur, 0.25), 'sawtooth', vol * 0.35); return; }
    const ac = Sfx.ctx, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = type; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.value = type === 'sine' ? 4000 : 1800;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(Sfx.musicBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(t, kind, vol) {
    const ac = Sfx.ctx;
    if (kind === 'dum') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(Sfx.musicBus); o.start(t); o.stop(t + 0.3);
    } else {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = Sfx.noise; f.type = kind === 'tek' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'tek' ? 2200 : 7000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'tek' ? 0.09 : 0.04));
      s.connect(f); f.connect(g); g.connect(Sfx.musicBus); s.start(t, _mrnd()); s.stop(t + 0.12);
    }
  }
  // har trek uchun 4 taktli kuy bir marta tuziladi va takrorlanadi
  function build(tr) {
    let deg = 0; const mel = [];
    for (let i = 0; i < 64; i++) {
      if (_mrnd() < tr.dens || i % 8 === 0) { deg = Math.max(-2, Math.min(9, deg + [-2, -1, -1, 1, 1, 2, 0][_mrnd() * 7 | 0])); mel.push(deg); }
      else mel.push(null);
    }
    const prog = [0, 0, 5, 4].map(d => d);
    return { mel, prog };
  }
  function deg2midi(root, d) { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return root + 12 + o * 12 + SCALE[i]; }
  function tick() {
    const ac = Sfx.ctx; if (!ac || !cur) return;
    const tr = TRACKS[cur], spb = 60 / tr.bpm / 4;
    while (next < ac.currentTime + 0.25) {
      const i = step % 64, bar = (step >> 4) % 4, chordRoot = tr.root + SCALE[seq.prog[bar] % 7];
      const d = seq.mel[i];
      if (d !== null && tr.dens) note(next, deg2midi(tr.root, d), spb * 1.8, tr.lead, 0.09);
      if (i % 4 === 0) note(next, chordRoot - 12, spb * 3.5, 'sawtooth', 0.12);
      if (tr.drums !== 'none') {
        const p = i % 16;
        if (p === 0 || p === 6 || (tr.drums !== 'soft' && p === 10)) drum(next, 'dum', tr.drums === 'boss' ? 0.9 : 0.7);
        if (p === 4 || p === 12 || (tr.drums === 'hard' && (p === 14 || p === 15))) drum(next, 'tek', 0.35);
        if (tr.drums !== 'soft' && p % 2 === 0) drum(next, 'hat', 0.12);
        if (intensity && p === 8) drum(next, 'dum', 0.42);
        if (intensity && p % 2 === 1) drum(next, 'hat', 0.07);
      }
      if (intensity && i % 16 === 15) note(next, tr.root + 19, spb * 0.8, 'triangle', 0.035);
      next += spb; step++;
    }
  }
  return {
    play(name) {
      if (!Sfx.ctx || cur === name) return;
      cur = name; step = 0; seq = build(TRACKS[name]); next = Sfx.ctx.currentTime + 0.1;
      if (!timer) timer = setInterval(tick, 60);
    },
    setIntensity(value) { intensity = value ? 1 : 0; },
    stop() { cur = null; intensity = 0; },
    get current() { return cur; },
    has(name) { return !!TRACKS[name]; },
  };
})();
