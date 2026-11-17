// Metro Jang — o'yin sikli (Phaser 3), raundlar, bot, HUD va menyular.
'use strict';

let ctx = null; // Phaser CanvasTexture konteksti (create() da o'rnatiladi)
const ui = document.getElementById('ui');

// ---------- Klaviatura ----------
// Ikki o'yinchining tugmalari bir-biridan alohida: 1P klaviaturaning chap qismi, 2P o'ng qismi.
const KEYMAP = {
  p1: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
        punch: ['KeyF'], heavy: ['KeyG'], kick: ['KeyH'], block: ['KeyR'], grab: ['KeyT'], special: ['KeyY'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
        punch: ['KeyJ', 'Numpad1'], heavy: ['KeyK', 'Numpad2'], kick: ['KeyL', 'Numpad3'], block: ['KeyI', 'Numpad0'], grab: ['KeyO', 'Numpad4'], special: ['KeyP', 'Numpad5'] },
};
const DEFAULT_KEYS = JSON.parse(JSON.stringify(KEYMAP));
// saqlangan tugma sozlamalari (har harakatning birinchi tugmasi almashtiriladi)
for (const pl of ['p1', 'p2']) for (const a in (Store.d.keys && Store.d.keys[pl]) || {}) KEYMAP[pl][a][0] = Store.d.keys[pl][a];
function removeDuplicateAliases() {
  const primaries = new Set(['p1', 'p2'].flatMap(pl => Object.values(KEYMAP[pl]).map(codes => codes[0])));
  for (const pl of ['p1', 'p2']) for (const a in KEYMAP[pl]) {
    KEYMAP[pl][a] = [KEYMAP[pl][a][0], ...KEYMAP[pl][a].slice(1).filter(code => !primaries.has(code))];
  }
}
removeDuplicateAliases();
function keyLabel(code) {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('Space', 'Probel');
}
const KEYNAME = { p1: { get special() { return keyLabel(KEYMAP.p1.special[0]); } }, p2: { get special() { return keyLabel(KEYMAP.p2.special[0]); } } };
const keys = {}, pressed = {};
function audioStart() { Sfx.init(); Sfx.setVolumes(Store.d.settings.sfx, Store.d.settings.music); if (!Music.current) Music.play(App.inFight ? (Game.musicName || 'fight') : 'menu'); }
addEventListener('keydown', e => {
  audioStart();
  if (App.remap) { // tugmani qayta sozlash rejimi
    e.preventDefault();
    if (e.code !== 'Escape' && !['KeyM', 'KeyB'].includes(e.code)) {
      const { pl, a } = App.remap;
      for (const p2 of ['p1', 'p2']) for (const b in KEYMAP[p2]) if (KEYMAP[p2][b][0] === e.code && !(p2 === pl && b === a)) KEYMAP[p2][b][0] = KEYMAP[pl][a][0];
      KEYMAP[pl][a][0] = e.code;
      removeDuplicateAliases();
      Store.d.keys = { p1: {}, p2: {} };
      for (const p2 of ['p1', 'p2']) for (const b in KEYMAP[p2]) Store.d.keys[p2][b] = KEYMAP[p2][b][0];
      Store.save(); Sfx.confirm();
    }
    App.remap = null; remapMenu(App.remapFrom); return;
  }
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (App.inFight && /^(Arrow|Space)/.test(e.code)) e.preventDefault();
  if (e.code === 'Escape' && App.inFight && Game.phase !== 'over' && !e.repeat) { togglePause(); return; }
  if (e.code === 'KeyM' && !e.repeat) toggleMute();
  if (Replay.play && App.inFight) { if (e.code === 'Digit1') Replay.speed = 1; if (e.code === 'Digit2') Replay.speed = 2; if (e.code === 'Digit4') Replay.speed = 4; if (e.code === 'KeyP') screenshot(); }
  if (e.code === 'KeyV' && !e.repeat && App.inFight && Game.opts.mode === 'practice') App.frameView = !App.frameView;
  if (e.code === 'KeyB' && !e.repeat && App.inFight && !Game.paused && Game.opts.mode === 'practice') Game.resetPractice();
  if (!App.inFight || Game.paused) menuKey(e);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (App.inFight && !Game.paused && Game.phase === 'fight') togglePause(); });
addEventListener('pointerdown', () => audioStart());

function readHuman(map, pad) {
  const inp = { held: {}, press: {} };
  for (const a in map) for (const c of map[a]) { if (keys[c]) inp.held[a] = true; if (pressed[c]) inp.press[a] = true; }
  if (pad !== undefined) { const gp = Pads.get(pad); Object.assign(inp.held, gp.held); Object.assign(inp.press, gp.press); }
  return inp;
}
const EMPTY = { held: {}, press: {} };

// ---------- Bot ----------
// learn — o'yinchi uslubiga qanchalik moslashadi; punish — blokdan keyin qarshi hujum ehtimoli
const LEVELS = {
  oson:  { name: 'Oson',     react: 30, aggr: .35, block: .15, mash: .07, grab: .12, special: .06, fin: .35, learn: .1,  punish: .1 },
  orta:  { name: "O'rtacha", react: 16, aggr: .55, block: .4,  mash: .15, grab: .2,  special: .1,  fin: .75, learn: .35, punish: .4 },
  qiyin: { name: 'Qiyin',    react: 8,  aggr: .8,  block: .62, mash: .28, grab: .28, special: .16, fin: 1,   learn: .6,  punish: .8 },
};

class Bot {
  constructor(lv) { this.p = LEVELS[lv]; this.lv = lv; this.reset(); this.told = false; }
  reset() { this.q = []; this.cool = 40; this.lastSig = ''; this.react = -1; this.defT = 0; this.defHold = null; this.gcool = 20; this.finTried = false; this.punished = -1; this.aaJump = -1; }

  // o'yinchi qaysi usullarni ko'p ishlatayotganini hisoblaydi
  style(o) {
    const u = o.usage, tot = Object.values(u).reduce((a, b) => a + b, 0);
    if (tot < 8) return null;
    return { tot, light: u.light / tot, heavy: u.heavy / tot, kick: u.kick / tot, low: u.low / tot, grabby: (u.grab + u.shoot) / tot, jumpy: u.jump / tot };
  }

  read(f, o, g) {
    if (!this.pm) { // jangchi xarakteri va moslashuvchan qiyinlik
      this.pm = Object.assign({}, this.p);
      const ai = f.def.ai || {};
      for (const k of ['aggr', 'block', 'grab', 'special', 'punish']) this.pm[k] = Math.max(0, (this.pm[k] || 0) + (ai[k] || 0));
      this.pm.keep = ai.keep || 0;
      const streak = Math.min(5, g.opts.streak !== undefined ? g.opts.streak : (Store.d.streak || 0));
      if (streak && this.lv !== 'oson') { this.pm.react += streak * 2; this.pm.block = Math.max(0.05, this.pm.block - streak * 0.05); this.pm.punish *= 1 - streak * 0.1; }
      this.p = this.pm;
    }
    const inp = { held: {}, press: {} }, p = this.p, R = Math.random;
    const toward = o.x > f.x ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
    const dist = Math.abs(o.x - f.x), G = g.grapple;
    if (G) {
      this.q = []; this.defT = 0;
      if (G.d === f) { if (R() < p.mash) inp.press[['punch', 'kick', 'grab', 'block'][R() * 4 | 0]] = true; }
      else if (G.a === f && --this.gcool <= 0) {
        this.gcool = p.react + (R() * 14 | 0);
        if (G.type === 'clinch') { const r = R(); inp.press[r < .45 ? 'punch' : r < .75 ? 'grab' : 'kick'] = true; }
        else if (G.type === 'ground') inp.press[(R() < .3 && f.st > 40) ? 'grab' : 'punch'] = true;
        else if (R() < .5) inp.press.grab = true;
      }
      return inp;
    }
    if (g.phase === 'tugat') {
      if (g.finWinner === f) {
        if (dist > 150) inp.held[toward] = true;
        else if (!this.finTried && g.phaseT > 45) { this.finTried = true; inp.press[R() < p.fin ? 'special' : 'kick'] = true; }
      }
      return inp;
    }
    if (g.phase !== 'fight') { this.reset(); return inp; }
    if (f.state === 'hit' && f.meter >= 50 && R() < p.punish * 0.06) { inp.press.block = true; return inp; }
    if (f.meter >= 100 && dist < 190 && f.state === 'idle' && R() < p.aggr * 0.04) { this.q = []; inp.held.heavy = true; inp.press.special = true; return inp; }

    const sty = this.style(o);
    if (sty && !this.told && this.lv !== 'oson' && sty.tot >= 14 && Math.max(sty.light, sty.heavy, sty.kick, sty.grabby, sty.jumpy) > 0.42) {
      this.told = true; g.say("Bot uslubingizni o'rganyapti...", f.x, GROUND - 260, '#ff9b9b', 18);
    }

    // 1) himoya: raqib hujumini sezish (o'yinchi ko'p ishlatgan zarbani yaxshiroq bloklaydi)
    const atkState = ['attack', 'jatk', 'special', 'shoot', 'grab'].includes(o.state);
    const sig = o.state + '#' + o.atkId;
    if (atkState && sig !== this.lastSig && dist < 200) {
      this.react = Math.round(p.react * (0.5 + R() * 0.6));
      const kind = o.state === 'attack' || o.state === 'jatk' ? o.atk.kind : o.state;
      this.threat = { grab: o.state === 'grab', shoot: o.state === 'shoot', low: kind === 'low', sig, kind };
    }
    this.lastSig = sig;
    if (this.react >= 0 && this.react-- === 0 && this.threat.sig === sig) {
      let chance = p.block;
      if (sty) chance += p.learn * ((sty[this.threat.kind] || 0) + (this.threat.shoot || this.threat.grab ? sty.grabby : 0));
      if (R() < Math.min(0.95, chance)) {
        this.q = [];
        if (this.threat.grab) { this.defT = 0; this.q = [{ d: 0, press: 'punch' }]; }
        else if (this.threat.shoot) { this.defHold = { down: true, block: true }; this.defT = 22; }
        else { this.defHold = this.threat.low ? { down: true, block: true } : { block: true }; this.defT = 18; }
      }
    }
    if (this.defT > 0) { this.defT--; Object.assign(inp.held, this.defHold); return inp; }

    // 2) blokdan keyin jazolash: raqib zarbadan keyin ochiq qolganda
    if (o.state === 'attack' && o.af >= o.atk.start + o.atk.act && dist < 95 && this.punished !== o.atkId && f.state !== 'attack') {
      this.punished = o.atkId;
      if (R() < p.punish) this.q = [{ d: 0, press: o.atk.heavy ? 'heavy' : 'punch' }];
    }
    // 3) ko'p sakraydigan o'yinchiga pastdan musht (havodagini urish)
    if (o.state === 'jump' && dist < 190 && this.aaJump !== o.t0Jump) {
      this.aaJump = o.t0Jump;
      if (R() < 0.1 + (sty ? sty.jumpy * 2 * p.learn : 0) + p.aggr * 0.2) this.q = [{ d: Math.max(0, 14 - p.react / 2) | 0, held: { down: true }, press: 'heavy' }];
    }

    if (this.q.length) {
      const a = this.q[0];
      Object.assign(inp.held, a.held || {});
      if (a.d > 0) a.d--; else { if (a.press) inp.press[a.press] = true; this.q.shift(); }
      return inp;
    }
    if (--this.cool > 0) return inp;
    this.cool = Math.round(p.react * (0.6 + R()));
    const canSp = f.st >= 30 && f.specialCd <= 0;
    const spAt = d => { // masofaga mos maxsus usul: 0 — Maxsus, 1 — Pastga+Maxsus
      const RANGED = { proj: [150, 999], stomp: [150, 999], gust: [130, 999], lash: [110, 230], dive: [130, 280], dash: [120, 260] };
      for (let i = 0; i < f.def.specials.length; i++) { const k = f.def.specials[i].kind, rg = RANGED[k] || [0, 105]; if (d >= rg[0] && d <= rg[1]) return i; }
      return -1;
    };
    const spPress = i => i === 1 ? [{ d: 0, held: { down: true }, press: 'special' }] : i === 2 ? [{ d: 0, held: { [away]: true }, press: 'special' }] : [{ d: 0, press: 'special' }];
    // masofani saqlash: har jangchining qulay masofasi bor; ushlashni yaxshi ko'radigan o'yinchidan uzoqroq turadi
    const pref = f.def.pref + (p.keep || 0) + (sty && sty.grabby > 0.22 ? 90 * p.learn : 0);
    if (f.st < 20) { this.q = [{ d: 25, held: { [away]: true } }]; return inp; }
    if (o.state === 'down' || o.state === 'getup') { this.q = [{ d: 12, held: { [R() < .5 ? away : toward]: true } }]; return inp; }
    if (dist < pref - 30 && R() < 0.3 + p.learn * 0.4) { this.q = [{ d: 10, held: { [away]: true } }]; return inp; }
    if (dist > 220) {
      if (canSp && spAt(dist) >= 0 && R() < p.special * 2.5) this.q = spPress(spAt(dist));
      else if (R() < .05) this.q = [{ d: 0, held: { [toward]: true }, press: 'up' }, { d: 10, held: { [toward]: true }, press: 'kick' }];
      else this.q = [{ d: 22, held: { [toward]: true } }];
    } else if (dist > 118) {
      const r = R();
      if (r < p.grab * 0.6) this.q = [{ d: 2, held: { [toward]: true } }, { d: 1, held: { down: true }, press: 'grab' }];
      else if (canSp && spAt(dist) >= 0 && r < p.grab * 0.6 + p.special * 1.5) this.q = spPress(spAt(dist));
      else if (r < 0.75) this.q = [{ d: 14, held: { [toward]: true } }];
      else this.q = [{ d: 14, held: { block: true } }];
    } else {
      if (R() > p.aggr) { this.q = R() < .5 ? [{ d: 16, held: { block: true } }] : [{ d: 14, held: { [away]: true } }]; return inp; }
      const r = R();
      if (this.weights) { // Ruh boti: o'yinchi qaysi usullarni ko'p ishlatgan bo'lsa, shuni tanlaydi
        const w = this.weights, opts = [['light', [{ d: 0, press: 'punch' }, { d: 9, press: 'punch' }]], ['heavy', [{ d: 0, press: 'heavy' }]], ['kick', [{ d: 0, press: 'kick' }]], ['low', [{ d: 0, held: { down: true }, press: 'kick' }]], ['grab', [{ d: 0, press: 'grab' }]]];
        let x = R() * opts.reduce((a2, o2) => a2 + w[o2[0]], 0);
        for (const [k, q] of opts) { x -= w[k]; if (x <= 0) { this.q = q.map(e => Object.assign({}, e)); return inp; } }
      }
      if (r < .2) this.q = [{ d: 0, press: 'punch' }, { d: 9, press: 'punch' }, { d: 12, press: 'heavy' }];
      else if (r < .32) this.q = [{ d: 0, press: 'punch' }, { d: 9, press: 'heavy' }, { d: 17, press: 'kick' }];
      else if (r < .44) this.q = [{ d: 0, press: 'kick' }];
      else if (r < .52) this.q = [{ d: 0, held: { down: true }, press: 'kick' }];
      else if (r < .6) this.q = [{ d: 0, press: 'heavy' }];
      else if (r < .6 + p.grab && dist < 95) this.q = [{ d: 0, press: 'grab' }];
      else if (canSp && spAt(dist) >= 0 && r < .6 + p.grab + p.special * 2) this.q = spPress(spAt(dist));
      else this.q = [{ d: 0, press: 'punch' }];
    }
    return inp;
  }
}

class PracticeBot extends Bot {
  constructor() { super('oson'); }
  read() { return EMPTY; }
}

// ---------- O'yin holati ----------
const Game = {
  phase: 'off', paused: false, t: 0, cam: null,
  f1: null, f2: null, projs: [], parts: [], texts: [], grapple: null,
  shake: 0, hitstop: 0, slowmo: 0, ann: null, rings: [], ghosts: [], flash: 0, superFlash: 0, superSeq: null, musicName: 'fight',

  camShake(ms, k) { if (this.cam && App.inFight && Store.d.settings.shake) this.cam.shake(ms, k); },
  get vsBot() { return this.opts.vsBot !== undefined ? this.opts.vsBot : (this.opts.mode === 'sp' || this.opts.mode === 'story'); },
  get need() { return this.opts.need || 2; },
  ring(x, y, color, r) { this.rings.push({ x, y, color, r, life: 14 }); },
  dust(x, n = 8) { for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - .5) * 40, y: GROUND - 2, vx: (Math.random() - .5) * 4, vy: -Math.random() * 2, life: 22 + Math.random() * 10, color: 'rgba(200,190,170,0.7)', r: 4 + Math.random() * 5 }); },
  afterimage(f) { this.ghosts.push({ x: f.x, y: f.y, face: f.face, pose: Object.assign({}, f.pose), def: f.def, life: 12 }); },

  start(opts) {
    if (opts.seed === undefined) opts.seed = Rng.orig() * 1e9 | 0;
    Rng.seed(opts.seed); Rng.enter();
    try { this._start(opts); } finally { Rng.exit(); }
    Replay.begin(opts); this.matchFrames = 0;
  },

  _start(opts) {
    this.opts = opts;
    MIN_X = 70; MAX_X = W - 70;
    this.f1 = new Fighter(opts.p1, 0, opts.c1);
    this.f2 = new Fighter(opts.p2, 1, opts.c2, opts.p1.id === opts.p2.id);
    this.order = shuffle(STATIONS.slice());
    this.stIdx = 0; this.round = 1; this.paused = false; this.nextTrain = false;
    if (opts.tag) Modes.tagInit(this);
    if (opts.first === 'arvoh') this.order = [GHOST];
    else if (opts.first === 'train') this.nextTrain = true;
    else if (opts.first) { const st = STATIONS.find(s => s.id === opts.first); this.order = [st].concat(shuffle(STATIONS.filter(s => s !== st))); }
    this.beginRound();
  },

  beginRound() {
    this.train = this.nextTrain;
    if (this.train) { this.station = null; MIN_X = 150; MAX_X = W - 150; this.wet = null; }
    else {
      this.station = this.order[this.stIdx++ % this.order.length];
      MIN_X = this.station.minX; MAX_X = this.station.maxX; this.wet = this.station.wet || null;
    }
    if (this.opts.tag) { for (const side of [0, 1]) { const T = side ? this.opts.tag.t2 : this.opts.tag.t1, cur = side ? this.f2 : this.f1; if (FIGHTERS[T[0]].id !== cur.def.id && fIdx(cur.def.id) !== T[0]) { const nf = new Fighter(FIGHTERS[T[0]], side, cur.ctrl, side === 1 && T[0] === this.opts.tag.t1[0]); nf.wins = cur.wins; if (side) this.f2 = nf; else this.f1 = nf; } } Modes.tagInit(this); }
    for (const f of [this.f1, this.f2]) { const w = f.wins; f.reset(); f.wins = w; }
    if (this.round === 1 && this.opts.startHp) { this.f1.hp = this.f1.hpTrail = Math.min(this.f1.maxHp, this.opts.startHp); }
    this.projs = []; this.parts = []; this.texts = []; this.grapple = null; this.rings = []; this.ghosts = []; this.superSeq = null;
    this.timer = (this.opts.roundTime || Store.d.settings.roundTime) * 60; this.phase = 'intro'; this.phaseT = 0;
    this.musicName = this.station && this.station.id === 'arvoh' ? 'boss' : this.train ? 'train' : this.station && Music.has(this.station.id) ? this.station.id : 'fight'; Music.play(this.musicName); Music.setIntensity(0);
    this.bgTrain = null; this.bgTrainT = 400 + Math.random() * 500;
    this.items = []; this.itemT = 600 + Math.random() * 600; this.crowd = null;
    this.lurchT = 320 + Math.random() * 200; this.lurchVis = 0;
    this.fin = null; this.finWinner = null; this.banner = null;
    for (const f of [this.f1, this.f2]) if (f.ctrl instanceof Bot) f.ctrl.reset();
    Sfx.rumble(this.train);
    if (this.train) {
      Sfx.horn();
      const nxt = this.order[this.stIdx % this.order.length].name;
      this.announce(`Eshiklar yopiladi. Keyingi bekat — «${nxt}».`);
    } else {
      Sfx.chime();
      this.announce(`«${this.station.name}» bekati. ${this.station.desc}.`);
    }
  },

  announce(text) { this.ann = { text, t: 0 }; },

  say(text, x, y, color = '#fff', size = 22) {
    this.texts.push({ text, x: clamp(x, 170, W - 170), y, color, size, life: 70 });
  },

  sparks(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 18 + Math.random() * 14, color, r: 2 + Math.random() * 3 });
    }
  },

  onKO(vic, att, method) {
    if (this.phase !== 'fight' && this.phase !== 'tugat') return;
    if (this.opts.mode === 'practice') {
      this.resetPractice();
      this.say('Nokaut! Mashq davom etadi.', W / 2, 220, '#6dff8a', 28);
      return;
    }
    this.grapple = null; this.superSeq = null;
    if (this.opts.tag && Modes.tagOnKO(this, vic, att)) return;
    if (this.phase === 'fight' && att.wins + 1 >= this.need) {
      this.phase = 'tugat'; this.phaseT = 0; this.finWinner = att; this.finLoser = vic;
      vic.set('dizzy'); vic.y = GROUND; vic.vy = 0; vic.vx = 0; vic.invuln = 0;
      if (att.state !== 'jump' && att.state !== 'jatk') att.set('idle');
      this.slowmo = 30; Sfx.gong(); Sfx.say('Tugat uni!'); Sfx.voice('ko', vic.def.size > 1.05 ? 0.75 : 1);
      this.say(method === 'taslim' ? 'TASLIM!' : 'NOKAUT!', W / 2, 250, '#ff5a5a', 44);
      return;
    }
    this.endRound(att, vic, method);
  },

  resetPractice() {
    if (this.opts.mode !== 'practice') return;
    this.grapple = null; this.projs = [];
    this.f1.reset(); this.f2.reset();
    this.timer = 60 * 60;
    const K = a => keyLabel(KEYMAP.p1[a][0]); this.announce(`Mashq: ${K('punch')}/${K('heavy')}/${K('kick')} — zarbalar, ${K('block')} — blok, ${K('grab')} — ushlash. B — qayta tiklash.`);
  },

  endRound(att, vic, method) {
    this.phase = 'ko'; this.phaseT = 0; this.roundWinner = att; this.grapple = null;
    if (vic) {
      if (vic.airborne) { vic.koFall = true; if (vic.state !== 'air') vic.set('air'); } else vic.set('ko');
    }
    if (att) att.wins++;
    // botga qarshi: raundni yutqazsangiz, keyingi raund harakatdagi poyezdda
    if (this.vsBot && att && !this.opts.noTrain) this.nextTrain = att === this.f2;
    this.slowmo = att ? 50 : 0;
    if (att) { Sfx.ko(); Sfx.voice('ko'); Sfx.say(method === 'taslim' ? 'Taslim' : method === 'vaqt' ? 'Vaqt tugadi' : 'Nokaut'); } else { Sfx.gong(); Sfx.say('Durang'); }
    const big = method === 'taslim' ? 'TASLIM!' : method === 'vaqt' ? 'VAQT TUGADI!' : method === 'durang' ? 'DURANG!' : 'NOKAUT!';
    let sub = att ? att.def.name + ' raundni yutdi' : 'Jon teng — hech kimga ochko berilmadi';
    if (method === 'vaqt') sub = att.def.name + " — joni ko'proq qoldi, raund unga";
    this.banner = { text: big, sub, color: att ? '#ff5a5a' : '#ffc531', t: 0 };
  },

  startFinisher(kind = 'train') {
    const w = this.finWinner, l = this.finLoser;
    this.phase = 'finisher'; this.phaseT = 0;
    this.fin = { dir: l.x >= w.x ? 1 : -1, train: null, kind, meta: FINISHERS[w.def.id] };
    w.face = this.fin.dir; l.face = -this.fin.dir;
    Sfx.special();
    if (!(w.ctrl instanceof Bot)) { Store.d.stats.finishers++; }
  },

  // "Do'stlik choyi" — zo'ravonliksiz, kulgili yakun: g'olib raqibiga choy uzatadi
  teaStep() {
    const w = this.finWinner, l = this.finLoser, t = this.phaseT;
    if (t === 1) { this.banner = { text: "DO'STLIK CHOYI", sub: w.def.name + ' raqibiga choy uzatdi', color: '#6dff8a', t: 0 }; Sfx.chime(); }
    if (t < 30) { const tx = l.x - this.fin.dir * 95; w.x += (tx - w.x) * 0.15; w.set('idle'); }
    if (t === 30) { w.set('finA'); w.finPose = POSES.cast; this.say('Marhamat, choy iching!', w.x, GROUND - 260, '#ffe9a6', 24); }
    if (t === 70) { l.set('idle'); l.finPose = null; this.say('Rahmat, aka... yutqazdim.', l.x, GROUND - 260, '#ffffff', 22); }
    if (t > 70 && t % 6 === 0) this.sparks(w.x + this.fin.dir * 40, GROUND - 200, 6, ['#ffde59', '#6dff8a', '#7fc4ff', '#ff8cc6'][t % 4]);
    if (t === 120) { w.set('win'); Sfx.win(); }
    if (t >= 190) { w.wins++; this.roundWinner = w; this.matchOver(); }
  },

  // "Oxirgi bekat" — yakunlovchi zarba sahnasi
  finisherStep() {
    if (this.fin && this.fin.kind === 'tea') return this.teaStep();
    const F = this.fin, w = this.finWinner, l = this.finLoser, t = this.phaseT, dir = F.dir;
    if (Arena3D.ready && F.meta) {
      if (t < 25) { w.x += (l.x - dir * 95 - w.x) * 0.18; w.set('idle'); }
      if (t === 25) { this.banner = { text: F.meta.name, sub: w.def.name + ' — shaxsiy yakuniy zarba', color: F.meta.color, t: 0 }; Sfx.say(F.meta.name); }
      if (t >= 30 && t < 90 && (t - 30) % 12 === 0) {
        const i = ((t - 30) / 12) | 0;
        w.set('finA'); w.finPose = POSES[F.meta.moves[i]] || POSES.punch;
        l.flash = 5; l.x += dir * (F.meta.style === 'dash' ? 12 : 5);
        Sfx.hit(1.1); Arena3D.blood(l.x, l.y, 5 + i * 2);
        this.shake = 6; this.camShake(80, 0.004);
      }
      if (t === 92) {
        w.finPose = POSES[F.meta.moves[4]] || POSES.upper;
        l.set('fin'); l.vx = dir * (F.meta.style === 'slam' || F.meta.style === 'grapple' ? 3 : 11);
        l.vy = F.meta.style === 'rise' || F.meta.style === 'dive' ? -17 : -8;
        Arena3D.impact(F.meta, l.x, l.y); Arena3D.blood(l.x, l.y, 34);
        this.shake = 20; this.camShake(320, 0.012); Sfx.finish(F.meta.style);
      }
      if (t > 92 && t < 138 && l.state === 'fin') {
        l.x = clamp(l.x + l.vx, MIN_X, MAX_X); l.vy += 0.48; l.y = Math.min(GROUND, l.y + l.vy);
        if (t === 120) Arena3D.blood(l.x, l.y, 16);
      }
      if (t === 140) l.set('gone');
      if (t === 150) { w.set('win'); Sfx.win(); }
      if (t >= 210) { w.wins++; this.roundWinner = w; this.matchOver(); }
      return;
    }
    if (t < 25) { const tx = l.x - dir * 72; w.x += (tx - w.x) * 0.2; w.set('idle'); }
    if (t === 25 && F.kind === 'rail') this.banner = { text: 'UCHINCHI RELS!', sub: w.def.name + ' — yakunlovchi zarba', color: '#7fe3ff', t: 0 };
    else if (t === 25) this.banner = { text: 'OXIRGI BEKAT!', sub: w.def.name + ' — yakunlovchi zarba', color: '#ffc531', t: 0 };
    if (t >= 30 && t < 90 && (t - 30) % 12 === 0) {
      const poses = [POSES.punch, POSES.cross, POSES.upper, POSES.kick, POSES.hook];
      w.set('finA'); w.finPose = poses[((t - 30) / 12) | 0];
      l.flash = 5; l.x += dir * 6; this.shake = 10; this.camShake(90, 0.005);
      Sfx.hit(1.2); this.sparks(l.x - dir * 10, GROUND - 130, 16, '#ffd27a');
    }
    if (F.kind === 'rail' && t >= 92) {
      if (t === 92) { w.finPose = POSES.upper; l.set('fin'); l.vx = 0; l.vy = -12; Sfx.heavy(); Sfx.zap(); this.camShake(300, 0.012); }
      if (l.state === 'fin') { l.vy += 0.4; l.y = Math.min(GROUND - 40, l.y + l.vy); if (t % 4 === 0) { Sfx.zap(); this.flash = 2; this.sparks(l.x, l.y - 100, 10, '#7fe3ff'); } }
      F.bolts = t < 140;
      if (t === 140) { l.set('gone'); this.ring(l.x, GROUND - 100, '#7fe3ff', 160); this.flash = 6; }
      if (t === 150) { w.set('win'); Sfx.win(); }
      if (t >= 210) { w.wins++; this.roundWinner = w; this.matchOver(); }
      return;
    }
    if (t === 92) {
      w.finPose = POSES.round; this.shake = 20; this.camShake(300, 0.012); Sfx.heavy(); Sfx.horn();
      l.set('fin'); l.vx = dir * 15; l.vy = -9;
      this.sparks(l.x, GROUND - 120, 30, '#ffd27a');
      F.train = { x: dir > 0 ? W + 60 : -1700, v: -dir * 55 };
      Sfx.trainPass();
    }
    if (l.state === 'fin') { l.x += l.vx; l.vy += 0.5; l.y = Math.min(GROUND, l.y + l.vy); }
    if (F.train) {
      F.train.x += F.train.v;
      const front = dir > 0 ? F.train.x : F.train.x + 1640;
      if ((dir > 0 && front < l.x + 40) || (dir < 0 && front > l.x - 40)) l.set('gone');
    }
    if (t === 150) { w.set('win'); Sfx.win(); }
    if (t >= 210) { w.wins++; this.roundWinner = w; this.matchOver(); }
  },

  matchOver() {
    this.phase = 'over'; this.phaseT = 0;
    const w = this.f1.wins >= this.need ? this.f1 : this.f2.wins >= this.need ? this.f2 : null;
    this.winner = w;
    const sp = this.vsBot;
    syncCorner(); if (!this.opts.replay) { Replay.end(w ? w.side : -1); Records.note(this, w); } this.recordStats(w); Modes.recordGhost(this); Modes.reward(this, w);
    if (!w) { this.banner = { text: 'DURANG!', sub: "5 raunddan keyin ham g'olib aniqlanmadi", color: '#ffc531', t: 0 }; Sfx.gong(); return; }
    w.set('win');
    if (sp) this.banner = w === this.f1 ? { text: "G'ALABA!", sub: w.def.name + ' yutdi', color: '#6dff8a', t: 0 } : { text: "MAG'LUBIYAT", sub: w.def.name + ' yutdi', color: '#ff5a5a', t: 0 };
    else this.banner = { text: "G'ALABA!", sub: (w.side + 1) + "-o'yinchi: " + w.def.name, color: '#6dff8a', t: 0 };
    if (sp && w !== this.f1) Sfx.lose(); else Sfx.win();
  },

  recordStats(w) {
    const S = Store.d.stats, m = this.opts.mode;
    for (const f of [this.f1, this.f2]) if (!(f.ctrl instanceof Bot)) { S.supers += f.stats.supers; S.bestCombo = Math.max(S.bestCombo, f.stats.maxCombo); }
    if (m === 'sp' || m === 'story') {
      S.matches++; const won = w === this.f1; won ? S.wins++ : S.losses++;
      Store.d.streak = won ? 0 : (Store.d.streak || 0) + 1;
      const pf = S.perFighter[this.f1.def.id] = S.perFighter[this.f1.def.id] || { w: 0, l: 0 }; won ? pf.w++ : pf.l++;
    }
    Store.save();
  },

  superStep() {
    const S = this.superSeq, a = S.a, d = S.d; S.t++;
    d.x = clamp(a.x + a.face * 70, MIN_X, MAX_X); d.y = GROUND; d.face = -a.face;
    if (S.t % 10 === 0 && S.t <= 50) {
      a.finPose = [POSES.punch, POSES.cross, POSES.kickh, POSES.hook, POSES.upper][S.t / 10 - 1];
      d.flash = 5; this.shake = 8; Sfx.hit(1.2); this.sparks(d.x - a.face * 10, GROUND - 130, 14, '#d7a6ff'); this.ring(d.x, GROUND - 130, '#d7a6ff', 70);
      if (dealDamage(this, a, d, 4 * a.def.power)) { this.superSeq = null; return; }
    }
    if (S.t === 50) { this.xray = { t: 50, x: d.x, y: GROUND - 150 * d.def.size, kind: a.def.id.length % 3 }; this.slowmo = 40; Sfx.heavy(); Sfx.say('Suyak sindi!'); }
    if (S.t >= 62) {
      this.superSeq = null; a.set('idle'); a.finPose = null;
      d.set('air'); d.vy = -13; d.vx = a.face * 10; d.y = GROUND - 1; Sfx.heavy(); this.camShake(260, 0.01); this.flash = 5;
      dealDamage(this, a, d, 8 * a.def.power);
    }
  },

  update() {
    if (this.phase === 'off' || this.paused) return;
    Rng.enter();
    try { this.matchFrames++; this._update(); } finally { Rng.exit(); }
  },

  _update() {
    this.t++;
    if (this.banner) this.banner.t++;
    if (this.ann && ++this.ann.t > 260) this.ann = null;
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.94; p.life--; }
    this.parts = this.parts.filter(p => p.life > 0 && p.y < GROUND + 10);
    for (const tx of this.texts) { tx.y -= 0.6; tx.life--; }
    this.texts = this.texts.filter(tx => tx.life > 0);
    if (this.shake > 0) { this.shake *= 0.85; if (this.shake < 0.5) this.shake = 0; }
    if (this.lurchVis > 0) this.lurchVis--;
    if (this.flash > 0) this.flash--; if (this.superFlash > 0) this.superFlash--;
    for (const r of this.rings) r.life--; this.rings = this.rings.filter(r => r.life > 0);
    for (const gh of this.ghosts) gh.life--; this.ghosts = this.ghosts.filter(gh => gh.life > 0);
    for (const f of [this.f1, this.f2]) if (f.meter >= 100 && !f.toldMeter && !(f.ctrl instanceof Bot)) { f.toldMeter = true; this.say("SOYA KUCHI TO'LA! Kuchli + Maxsus", f.side ? W - 260 : 260, 160, '#d7a6ff', 22); }
    Music.setIntensity(this.phase === 'fight' && this.opts.mode !== 'practice' && (this.f1.hp / this.f1.maxHp < 0.3 || this.f2.hp / this.f2.maxHp < 0.3));
    this.envStep();

    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.slowmo > 0) { this.slowmo--; if (this.slowmo % 2) return; }

    const f1 = this.f1, f2 = this.f2;
    if (Replay.play) Replay.play.cur = Replay.play.idx++;
    const i1 = this.inputFor(f1, f2), i2 = this.inputFor(f2, f1);
    Replay.frame(i1, i2);
    for (const k in pressed) delete pressed[k];
    if (this.superSeq) { this.superStep(); return; }
    this.phaseT++;

    if (this.phase === 'intro') {
      // raund oldidan qahramonlar bir-biriga gap otadi
      if (this.round === 1 && (this.phaseT === 8 || this.phaseT === 58)) {
        const f = this.phaseT === 8 ? f1 : f2, o = f === f1 ? f2 : f1, L = INTRO_LINES[f.def.id] || INTRO_LINES._;
        this.say(L[(o.def.id.length + f.side) % L.length].replace('{o}', o.def.name), f.x, GROUND - 270, f.side ? '#ffb3b3' : '#b3dcff', 20);
      }
      if (this.phaseT === 2) Sfx.say(this.round > 3 ? "Qo'shimcha raund" : this.round === 3 && f1.wins === 1 && f2.wins === 1 ? 'Hal qiluvchi raund' : this.round + '-raund');
      if (this.phaseT === 110) { Sfx.gong(); Sfx.say('Jang!'); }
      if (this.phaseT >= 160) this.phase = 'fight';
    } else if (this.phase === 'fight') {
      if (this.opts.mode === 'practice') this.timer = 60 * 60;
      else if (--this.timer <= 0) {
        this.timer = 0;
        const d = f1.hp / f1.maxHp - f2.hp / f2.maxHp;
        if (Math.abs(d) < 0.005) this.endRound(null, null, 'durang');
        else { const w = d > 0 ? f1 : f2; this.endRound(w, w === f1 ? f2 : f1, 'vaqt'); }
      }
    } else if (this.phase === 'tugat') {
      const w = this.finWinner, l = this.finLoser;
      const wi = w === f1 ? i1 : i2;
      if (wi.press.special && Math.abs(w.x - l.x) < 260 && !w.airborne && w.state !== 'attack') { this.startFinisher(wi.held.up ? 'tea' : wi.held.down ? 'rail' : 'train'); return; }
      if (this.phaseT >= 260) this.endRound(w, l, 'nokaut');
    } else if (this.phase === 'finisher') {
      this.finisherStep(); return;
    } else if (this.phase === 'ko') {
      if (this.phaseT === 70 && this.roundWinner) this.roundWinner.set('win');
      if (this.phaseT >= 170) {
        if (f1.wins >= this.need || f2.wins >= this.need || this.round >= 5) this.matchOver();
        else { this.round++; this.beginRound(); }
        return;
      }
    } else if (this.phase === 'over') {
      if (this.phaseT === 150) this.opts.onEnd(this.winner ? this.winner.side : -1);
      return;
    }

    if (this.grapple) grappleStep(this, this.grapple.a === f1 ? i1 : i2, this.grapple.d === f1 ? i1 : i2);
    if (this.opts.tag) { Modes.tagStep(this, this.f1, i1); Modes.tagStep(this, this.f2, i2); }
    for (const [f, o, i] of [[this.f1, this.f2, i1], [this.f2, this.f1, i2]]) {
      const was = f.state; f.step(i, o, this);
      if (f.state === 'jump' && was !== 'jump') f.t0Jump = this.t;
    }
    this.projStep();
    Tutorial.step(this);
    this.itemStep();
    this.pushApart(this.f1, this.f2);
  },

  // Muhit: fon poyezdi va shamol, vagonning silkinishi
  envStep() {
    if (this.phase !== 'fight' && this.phase !== 'intro') return;
    const fs = [this.f1, this.f2];
    if (!this.train) {
      if (this.bgTrain) {
        this.bgTrain.x += 22;
        if (this.bgTrain.x > W + 1500) this.bgTrain = null;
        else if (this.station.wind && this.phase === 'fight' && this.bgTrain.x > -900 && this.bgTrain.x < W) {
          for (const f of fs) if (!f.airborne && !NOHIT.has(f.state) && !this.grapple) f.x = clamp(f.x + (f.state === 'block' || f.crouching ? 0.4 : 1.1), MIN_X, MAX_X);
        }
      } else if (--this.bgTrainT <= 0) {
        this.bgTrain = { x: -1500, dir: 1 };
        this.bgTrainT = (this.station.wind ? 500 : 1000) + Math.random() * 700;
        Sfx.trainPass(); Sfx.chime();
        this.announce(this.station.wind ? 'Diqqat! Poyezd yaqinlashmoqda — kuchli shamol!' : 'Diqqat! Poyezd yaqinlashmoqda. Platforma chetidan uzoqlashing.');
      }
    } else {
      if (this.t % 55 === 0) Sfx.clack();
      if (this.phase === 'fight' && --this.lurchT <= 0) {
        this.lurchT = 330 + Math.random() * 240; this.lurchVis = 40;
        const dir = Math.random() < 0.5 ? -1 : 1;
        Sfx.thud(); Sfx.clack(); this.camShake(250, 0.006); this.shake = 8;
        this.say(dir > 0 ? 'Poyezd silkindi! →' : '← Poyezd silkindi!', W / 2, 170, '#ffde59', 26);
        for (const f of fs) {
          if (f.airborne || NOHIT.has(f.state) || this.grapple) continue;
          const steady = f.state === 'block' || f.crouching;
          f.vx += dir * (steady ? 3 : 8);
          if (!steady && (f.state === 'idle' || f.state === 'walk')) { f.set('hit'); f.stun = 12; }
        }
      }
    }
  },

  itemStep() {
    if (this.phase !== 'fight' || this.opts.mode === 'online') return;
    if (--this.itemT <= 0 && this.items.length < 1) {
      const kinds = Object.keys(ITEMS);
      this.items.push({ kind: kinds[Math.random() * kinds.length | 0], x: MIN_X + 60 + Math.random() * (MAX_X - MIN_X - 120), y: -40, vy: 0 });
      this.itemT = 900 + Math.random() * 900; this.announce('Platformaga qurol tushdi! Ustiga borib Ushlash tugmasini bosing.');
    }
    for (const it of this.items) { if (it.y < GROUND - 8) { it.vy += 0.6; it.y = Math.min(GROUND - 8, it.y + it.vy); } }
  },

  inputFor(f, o) {
    if (this.phase !== 'fight' && this.phase !== 'tugat') { if (f.ctrl instanceof Bot) f.ctrl.read(f, o, this); return EMPTY; }
    if (this.phase === 'tugat' && f === this.finLoser) return EMPTY;
    if (f.ctrl && f.ctrl.replay) return Replay.input(f);
    if (f.ctrl && f.ctrl.net) return Online.input(f);
    if (App.tutorial && f.side === 1) return Tutorial.botInput(this);
    if (f.ctrl instanceof Bot) return f.ctrl.read(f, o, this);
    const inp = readHuman(f.ctrl, this.opts.vsBot === false || this.opts.mode === '2p' ? f.side : 0);
    if (this.opts.ban && f.side === 0) for (const b of this.opts.ban) { delete inp.held[b]; delete inp.press[b]; }
    return inp;
  },

  projStep() {
    for (const p of this.projs) {
      p.x += p.dir * (p.speed || 9); p.life--;
      const o = p.owner === this.f1 ? this.f2 : this.f1;
      const jumped = o.airborne && o.y < GROUND - 70;
      if (Math.abs(o.x - p.x) < 40 && !jumped && o.invuln <= 0 && !NOHIT.has(o.state) && !this.grapple && !o.hidden) {
        p.life = 0;
        applyHit(p.owner, o, { dmg: p.dmg || 12, kb: p.kb || 8, kd: p.kd, heavy: p.kind !== 'orb', stun: p.stun || 20 }, this);
      }
      for (const q of this.projs) if (q !== p && q.owner !== p.owner && q.life > 0 && p.life > 0 && Math.abs(q.x - p.x) < 30) { q.life = p.life = 0; this.ring(p.x, GROUND - 100, '#fff', 90); Sfx.zap(); }
      if (this.t % 3 === 0) this.sparks(p.x, p.kind === 'orb' ? p.y : GROUND - 5, 2, p.kind === 'orb' ? p.color : p.kind === 'gust' ? '#e6f6ff' : '#c9a77a');
    }
    this.projs = this.projs.filter(p => p.life > 0 && p.x > MIN_X - 40 && p.x < MAX_X + 40);
  },

  pushApart(a, b) {
    if (this.grapple || a.state === 'thrown' || b.state === 'thrown' || a.state === 'gone' || b.state === 'gone') return;
    if (Math.abs(a.y - b.y) > 90) return;
    const dx = b.x - a.x, min = 52;
    if (Math.abs(dx) < min) {
      const push = (min - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      a.x = clamp(a.x - s * push, MIN_X, MAX_X); b.x = clamp(b.x + s * push, MIN_X, MAX_X);
      if (Math.abs(b.x - a.x) < min - 1) { if (a.x <= MIN_X + 1 || a.x >= MAX_X - 1) b.x = clamp(a.x + s * min, MIN_X, MAX_X); else a.x = clamp(b.x - s * min, MIN_X, MAX_X); }
    }
  },

  // ---------- Chizish ----------
  render() {
    if (Arena3D.ready) {
      ctx.clearRect(0, 0, W, H);
      Arena3D.update(this);
      if (this.opts.mode === 'practice' && App.frameView) drawFrameData(this);
      if (this.flash) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.06})`; ctx.fillRect(0, 0, W, H); }
      this.hud();
      return;
    }
    ctx.save();
    if (this.shake && Store.d.settings.shake) ctx.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
    if (this.train) {
      ctx.save();
      const sway = Math.sin(this.t * 0.03) * 0.007 + (this.lurchVis ? Math.sin(this.lurchVis * 0.5) * 0.012 * this.lurchVis / 40 : 0);
      ctx.translate(W / 2, H / 2); ctx.rotate(sway); ctx.translate(-W / 2, -H / 2 + Math.sin(this.t * 0.37) * 1.5);
      drawTrain(ctx, this.t);
    } else { drawStation(ctx, this.station, this.t, this.bgTrain); drawCrowd(this); }

    for (const p of this.projs) drawProj(p, this.t);
    for (const it of this.items || []) {
      const I = ITEMS[it.kind]; ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(0.3);
      ctx.fillStyle = 'rgba(255,222,89,' + (0.3 + Math.sin(this.t * 0.2) * 0.2) + ')'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = I.color; ctx.lineWidth = it.kind === 'kastet' ? 4 : 7;
      if (it.kind === 'kastet') { ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); }
      ctx.restore();
    }
    for (const gh of this.ghosts) { ctx.globalAlpha = gh.life / 24; drawBody(ctx, Object.assign({}, gh.def, { shadow: true, glow: gh.def.glow || '#d7a6ff' }), gh.pose, gh.x, gh.y, gh.face, false, 0, false, false); ctx.globalAlpha = 1; }
    if (this.phase === 'finisher') { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.65, this.phaseT / 40)})`; ctx.fillRect(0, 0, W, H); }
    const G = this.grapple;
    let order = [this.f1, this.f2];
    if (G) order = [G.d, G.a];
    else if (this.f1.state === 'attack' || this.f1.state === 'special') order = [this.f2, this.f1];
    for (const f of order) f.draw(ctx, this);
    for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.life / 12); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
    ctx.globalAlpha = 1;
    // bekat yorug'ligi (xira / miltillovchi)
    for (const r of this.rings) { ctx.strokeStyle = r.color; ctx.globalAlpha = r.life / 14; ctx.lineWidth = 3 + r.life / 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1 - r.life / 16), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    if (this.station && this.station.fog) {
      for (let i = 0; i < 4; i++) { const fx = ((this.t * (0.4 + i * 0.15) + i * 400) % (W + 600)) - 300; const fg = ctx.createRadialGradient(fx, 600, 10, fx, 600, 320); fg.addColorStop(0, 'rgba(120,80,170,0.22)'); fg.addColorStop(1, 'rgba(120,80,170,0)'); ctx.fillStyle = fg; ctx.fillRect(fx - 320, 280, 640, 440); }
    }
    if (this.station && this.station.dim) {
      let a = this.station.dim;
      if (this.station.flicker && this.t % 400 < 14 && (this.t >> 1) % 2) a += 0.25;
      ctx.fillStyle = `rgba(0,4,20,${a})`; ctx.fillRect(0, 0, W, H);
    }
    if (this.fin && this.fin.train) drawFinTrain(ctx, this.fin.train.x, this.fin.dir);
    if (this.fin && this.fin.bolts) {
      const l = this.finLoser; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 3; ctx.shadowColor = '#7fe3ff'; ctx.shadowBlur = 12;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); let bx = l.x + (Math.random() - .5) * 80, by = GROUND; ctx.moveTo(bx, by); for (let j = 0; j < 6; j++) { bx += (Math.random() - .5) * 40; by -= 40; ctx.lineTo(bx, by); } ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    if (this.opts.mode === 'practice' && App.frameView) drawFrameData(this);
    if (this.train) ctx.restore();
    ctx.restore();
    // vinyetka, zarba chaqnashi, Soya zarbasi qorong'iligi
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (this.flash) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.06})`; ctx.fillRect(0, 0, W, H); }
    if (this.superFlash || this.superSeq) { ctx.fillStyle = `rgba(40,0,70,${this.superSeq ? 0.35 : this.superFlash / 80})`; ctx.fillRect(0, 0, W, H); for (const f of [this.f1, this.f2]) if (this.superSeq && (f === this.superSeq.a || f === this.superSeq.d)) f.draw(ctx, this); }
    this.hud();
  },

  // X-ray: Soya zarbasining oxirida suyak yorilishi ko'rinadi
  drawXray() {
    const X = this.xray; if (!X) return;
    if (--X.t <= 0) { this.xray = null; return; }
    const p = (typeof Arena3D !== 'undefined' && Arena3D.ready && Arena3D.toScreen) ? Arena3D.toScreen(X.x, X.y) : { x: X.x, y: X.y };
    const a = Math.min(1, X.t / 12), r = 120;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(clamp(p.x, 150, W - 150), clamp(p.y, 150, H - 150));
    ctx.fillStyle = 'rgba(5,10,25,0.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    if (X.kind === 0) { ctx.beginPath(); ctx.arc(0, -10, 48, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-26, 30); ctx.lineTo(26, 30); ctx.stroke(); ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(-18, -14, 9, 0, Math.PI * 2); ctx.arc(18, -14, 9, 0, Math.PI * 2); ctx.fill(); }
    else if (X.kind === 1) { for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-60, i * 22); ctx.quadraticCurveTo(0, i * 22 - 18, 60, i * 22); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, 60); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(-70, 0, 12, 0, Math.PI * 2); ctx.arc(70, 0, 12, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, -55); ctx.lineTo(8, -20); ctx.lineTo(-6, 5); ctx.lineTo(14, 40); ctx.stroke();
    ctx.fillStyle = '#ff3b3b'; ctx.font = 'bold italic 34px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SUYAK SINDI!', 0, r + 38);
    ctx.restore();
  },

  hud() {
    this.drawXray();
    const f1 = this.f1, f2 = this.f2;
    bar(40, f1, false); bar(W - 40, f2, true);
    if (this.opts.tag && this.bench) Modes.tagHud(this);
    Tutorial.hud(this);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; roundRect(ctx, W / 2 - 46, 18, 92, 64, 10); ctx.fill();
    ctx.strokeStyle = '#ffc531'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = this.timer < 600 ? '#ff6b6b' : '#fff';
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.opts.mode === 'practice' ? '∞' : Math.ceil(this.timer / 60), W / 2, 52);
    ctx.font = '13px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ddd';
    ctx.fillText((this.opts.mode === 'practice' ? 'MASHQ • ' : this.round > 3 ? "Qo'shimcha raund • " : this.round + '-raund • ') + (this.train ? 'POYEZD' : this.station.name), W / 2, 96);
    const G = this.grapple;
    if (G) {
      const d = G.d, x = clamp(d.x, 120, W - 120), y = GROUND - 250;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 80, y, 160, 16);
      ctx.fillStyle = '#5ad1ff'; ctx.fillRect(x - 78, y + 2, 156 * Math.min(1, G.esc / 100), 12);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
      const label = { clinch: 'Klinch', ground: 'Parter (yerda)', choke: "Bo'g'ish!" }[G.type];
      ctx.fillText(label + ' — qutulish', x, y - 12);
      if (!(d.ctrl instanceof Bot) && (this.t >> 3) % 2) { ctx.fillStyle = '#ffde59'; ctx.fillText('Tugmalarni tez-tez bosing!', x, y + 32); }
    }
    for (const tx of this.texts) {
      ctx.globalAlpha = Math.min(1, tx.life / 20);
      ctx.font = `bold ${tx.size}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    // e'lon (metro diktori)
    if (this.ann) {
      const a = Math.max(0, Math.min(1, this.ann.t / 15, (260 - this.ann.t) / 20));
      ctx.globalAlpha = a; ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
      const w = ctx.measureText(this.ann.text).width + 70;
      ctx.fillStyle = 'rgba(10,20,40,0.85)'; roundRect(ctx, W / 2 - w / 2, H - 56, w, 38, 19); ctx.fill();
      ctx.strokeStyle = '#3fa9ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3fa9ff'; ctx.beginPath(); ctx.arc(W / 2 - w / 2 + 24, H - 37, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(this.ann.text, W / 2 - w / 2 + 42, H - 36);
      ctx.textAlign = 'center'; ctx.globalAlpha = 1;
    }
    if (this.phase === 'intro') {
      const t = this.phaseT;
      if (t < 110) {
        const deciding = this.round === 3 && f1.wins === 1 && f2.wins === 1;
        const title = this.round > 3 ? "QO'SHIMCHA RAUND" : deciding ? 'HAL QILUVCHI RAUND' : this.round + '-RAUND';
        bigText(title, '#ffc531', Math.min(1, t / 15),
          this.train ? (this.round === 1 ? 'Harakatdagi poyezd vagoni' : 'Raqib ortingizdan poyezdga chiqdi — jang vagonda davom etadi!') : 'Bekat: ' + this.station.name);
      } else bigText('JANG!', '#ff4d4d', 1 + Math.max(0, (120 - t) / 20));
    }
    if (this.phase === 'tugat' && (this.t >> 4) % 2 === 0) {
      const w = this.finWinner;
      bigText('TUGAT UNI!', '#ff3b3b', 1, w.ctrl instanceof Bot ? '' :
        'Yaqin turib Maxsus (' + KEYNAME[w.side === 0 ? 'p1' : 'p2'].special + ') — "Oxirgi bekat", Pastga + Maxsus — "Uchinchi rels"');
    }
    if (this.banner && (this.phase === 'ko' || this.phase === 'finisher' || this.phase === 'over')) {
      const b = this.banner; bigText(b.text, b.color, Math.min(1, b.t / 10), b.sub);
    }
    if (this.paused) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); }
  },
};

function bar(x, f, right) {
  const w = 500, y = 24, x0 = right ? x - w : x;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x0 - 4, y - 4, w + 8, 34);
  ctx.fillStyle = '#4a0d0d'; ctx.fillRect(x0, y, w, 26);
  const tw = w * f.hpTrail / f.maxHp, hw = w * f.hp / f.maxHp;
  ctx.fillStyle = '#e8a23a'; ctx.fillRect(right ? x - tw : x0, y, tw, 26);
  const hr = f.hp / f.maxHp; ctx.fillStyle = hr > 0.5 ? '#3fd46b' : hr > 0.25 ? '#f2c94c' : '#ff4b4b';
  ctx.fillRect(right ? x - hw : x0, y, hw, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(right ? x - hw : x0, y, hw, 8);
  const sw = 300 * f.st / 100;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(right ? x - 304 : x0 - 2, y + 34, 304, 12);
  ctx.fillStyle = f.st < 20 ? '#ff9b4b' : '#4fb8ff'; ctx.fillRect(right ? x - sw : x0, y + 36, sw, 8);
  ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff';
  ctx.lineWidth = 4; ctx.strokeStyle = '#000';
  const nm = f.def.name + (f.ctrl instanceof Bot ? ' (bot)' : '');
  ctx.strokeText(nm, x, y + 74); ctx.fillText(nm, x, y + 74);
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#9fd3ff';
  ctx.fillText('NAFAS', right ? x - 312 : x0 + 312, y + 45);
  // Soya kuchi shkalasi (2 bo'lak: 50 — uzish, 100 — Soya zarbasi)
  const mw = 220, mx = right ? x - 304 - mw - 60 : x0 + 304 + 60, mm = mw * f.meter / 100;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(mx - 2, y + 34, mw + 4, 12);
  ctx.fillStyle = f.meter >= 100 ? (Game.t >> 3) % 2 ? '#e2b8ff' : '#b46bff' : '#7d3cc4'; ctx.fillRect(right ? mx + mw - mm : mx, y + 36, mm, 8);
  ctx.fillStyle = '#000'; ctx.fillRect(mx + mw / 2 - 1, y + 34, 2, 12);
  ctx.fillStyle = '#d7a6ff'; ctx.fillText('SOYA', right ? mx - 8 : mx + mw + 8, y + 45);
  for (let i = 0; i < 2; i++) {
    const cx = right ? x - w + 20 + i * 26 : x + w - 20 - i * 26;
    ctx.beginPath(); ctx.arc(cx, y + 62, 9, 0, Math.PI * 2);
    ctx.fillStyle = f.wins > i ? '#ffc531' : 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.strokeStyle = '#ffc531'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.textAlign = 'center';
}

function bigText(text, color, scale, sub) {
  text = T(text);
  ctx.save(); ctx.translate(W / 2, 300); ctx.scale(scale, scale);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold italic 84px Impact, "Arial Black", sans-serif';
  ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
  if (sub) {
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(sub, W / 2, 370);
    ctx.fillStyle = '#fff'; ctx.fillText(sub, W / 2, 370);
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// Mashq: zarba masofasi, tana chegarasi va kadrlar ma'lumoti (V tugmasi)
function drawFrameData(g) {
  for (const f of [g.f1, g.f2]) {
    const h = 210 * f.def.size;
    ctx.strokeStyle = 'rgba(80,200,255,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(f.x - 30 * f.def.size, f.y - h, 60 * f.def.size, h);
    if (f.state === 'attack' && f.atk) {
      const A = f.atk, active = f.af >= A.start && f.af < A.start + A.act;
      const reach = A.arm ? (f.item ? ITEMS[f.item.kind].reach : f.def.reach || 1) : 1;
      ctx.fillStyle = active ? 'rgba(255,60,60,0.35)' : 'rgba(255,200,60,0.18)';
      const rx = f.face > 0 ? f.x : f.x - A.range * f.def.size * reach;
      ctx.fillRect(rx, A.low ? GROUND - 60 : f.y - 170, A.range * f.def.size * reach, A.low ? 60 : 110);
    }
  }
  const f = g.f1, A = f.atk;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(20, 140, 330, 120);
  ctx.fillStyle = '#9fd3ff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
  if (A) {
    const adv = (9 + (A.heavy ? 6 : 0)) - A.rec;
    ctx.fillText(`Zarba: ${f.atkName}`, 30, 162);
    ctx.fillText(`Boshlanish ${A.start} • Faol ${A.act} • Tiklanish ${A.rec}`, 30, 184);
    ctx.fillText(`Zarar ${A.dmg} • Masofa ${A.range} • Nafas ${A.st}`, 30, 206);
    ctx.fillStyle = adv >= 0 ? '#6dff8a' : '#ff8c8c'; ctx.fillText(`Blokda: ${adv >= 0 ? '+' : ''}${adv} kadr ${adv < -5 ? '(xavfli)' : '(xavfsiz)'}`, 30, 228);
  } else ctx.fillText('Zarba bering — ma\'lumot shu yerda chiqadi', 30, 162);
  ctx.fillStyle = '#ccc'; ctx.fillText('V — ko\'rinishni yoqish/o\'chirish', 30, 250);
  ctx.textAlign = 'center';
}

// fondagi yo'lovchilar (jang boshlansa chetga qochadi) va "keyingi poyezd" tablosi
function drawCrowd(g) {
  if (!g.crowd) g.crowd = Array.from({ length: 7 }, (_, i) => ({ x: 120 + i * 170, side: i < 3.5 ? -1 : 1, col: ['#3a4a6a', '#6a3a3a', '#3a6a4a', '#5a4a2a', '#4a3a6a', '#2a5a6a', '#6a5a3a'][i], h: 0.5 + Math.random() * 0.12, ph: Math.random() * 6 }));
  for (const p of g.crowd) {
    const target = g.phase === 'intro' ? p.x : (p.side < 0 ? 30 + (p.x % 60) : W - 30 - (p.x % 60));
    p.cx = p.cx === undefined ? p.x : p.cx + (target - p.cx) * 0.02;
    const y = 520, s = p.h, bob = Math.sin(g.t * 0.1 + p.ph) * (Math.abs(target - p.cx) > 5 ? 3 : 0.5);
    ctx.fillStyle = p.col; ctx.globalAlpha = 0.75;
    ctx.fillRect(p.cx - 10 * s, y - 120 * s + bob, 20 * s, 60 * s);
    ctx.beginPath(); ctx.arc(p.cx, y - 132 * s + bob, 11 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(p.cx - 9 * s, y - 60 * s, 7 * s, 60 * s); ctx.fillRect(p.cx + 2 * s, y - 60 * s, 7 * s, 60 * s);
    if (p.ph > 4) { ctx.fillStyle = '#9ff'; ctx.fillRect(p.cx + 8 * s, y - 120 * s + bob, 5, 8); }
    ctx.globalAlpha = 1;
  }
  // tablo
  const secs = Math.max(0, Math.ceil((g.bgTrain ? 0 : g.bgTrainT) / 60));
  ctx.fillStyle = '#111'; ctx.fillRect(W - 300, 132, 200, 34); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.strokeRect(W - 300, 132, 200, 34);
  ctx.fillStyle = '#ffb000'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
  ctx.fillText(g.bgTrain ? 'POYEZD KELYAPTI' : 'KEYINGI: ' + String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'), W - 200, 154);
}

function drawProj(p, t) {
  if (p.kind === 'orb') {
    const gr = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, p.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.dir * 70, p.y); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (p.kind === 'gust') {
    ctx.strokeStyle = 'rgba(220,240,255,0.75)'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) { const yy = GROUND - 40 - i * 40; ctx.beginPath(); ctx.arc(p.x - p.dir * i * 8, yy, 24 + (t % 10), p.dir > 0 ? -1.2 : 1.9, p.dir > 0 ? 1.2 : 4.3); ctx.stroke(); }
  } else {
    ctx.strokeStyle = 'rgba(230,200,150,0.8)'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x - p.dir * i * 14, GROUND, 18 + i * 8, Math.PI, Math.PI * 2); ctx.stroke(); }
  }
}

function drawFinTrain(c, x, dir) {
  const len = 1640, y = 250;
  c.fillStyle = '#2f5d8f'; c.fillRect(x, y, len, 420);
  c.fillStyle = '#e3edf7'; c.fillRect(x, y + 260, len, 26);
  c.fillStyle = '#ffe9a6';
  for (let i = 0; i < 9; i++) c.fillRect(x + 60 + i * 180, y + 50, 120, 120);
  c.fillStyle = '#111'; c.fillRect(x, y + 380, len, 40);
  const nose = dir > 0 ? x : x + len;
  const lg = c.createRadialGradient(nose, y + 200, 10, nose, y + 200, 500);
  lg.addColorStop(0, 'rgba(255,255,230,0.95)'); lg.addColorStop(1, 'rgba(255,255,230,0)');
  c.fillStyle = lg; c.fillRect(nose - 500, y - 300, 1000, 1000);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Menyular ----------
const App = { inFight: false, mode: 'sp', level: 'orta', p1: 0, p2: 1, ladder: [], pos: 0, chapter: 0 };
const roster = () => FIGHTERS.filter(f => !f.boss || Store.d.unlocked.soya);
const fIdx = id => FIGHTERS.findIndex(f => f.id === id);

function screen(html, mount) {
  ui.innerHTML = '<div class="screen">' + translateHtml(html) + '</div>';
  ui.style.display = 'flex';
  if (mount) mount(ui);
  const first = ui.querySelector('[autofocus]') || ui.querySelector('.btn');
  if (first) first.focus();
  syncCorner();
}
function hideScreen() { ui.style.display = 'none'; ui.innerHTML = ''; syncCorner(); }

function menuKey(e) {
  const btns = [...ui.querySelectorAll('.btn')];
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement);
  const next = { ArrowDown: 1, ArrowRight: 1, KeyS: 1, KeyD: 1, ArrowUp: -1, ArrowLeft: -1, KeyW: -1, KeyA: -1 }[e.code];
  if (next) { e.preventDefault(); btns[(i + next + btns.length) % btns.length].focus(); Sfx.select(); }
  else if ((e.code === 'KeyF' || e.code === 'KeyJ') && i >= 0) btns[i].click();
  else if (e.code === 'Escape') { const b = ui.querySelector('[data-back]'); if (b) b.click(); }
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  Sfx.init(); Sfx.confirm();
  if (b.closest('#corner')) b.blur();
  ACTIONS[b.dataset.act](b.dataset.v);
});

const ACTIONS = {
  menu: () => mainMenu(),
  sp: () => { App.mode = 'sp'; difficultyMenu(); },
  story: () => storyMenu(),
  storyNew: () => { Store.d.story = { chapter: 0, done: false, version: 2 }; Store.save(); App.mode = 'story'; App.chapter = 0; difficultyMenu(); },
  storyCont: () => { App.mode = 'story'; App.chapter = Store.d.story.chapter; difficultyMenu(); },
  settings: v => settingsMenu(v),
  stats: () => statsMenu(),
  moves: v => movesMenu(v),
  set: v => { const [k, val] = v.split(':'); Store.d.settings[k] = k === 'shake' || k === 'voice' ? val === '1' : isNaN(+val) ? val : +val; Store.save(); if (k === 'quality') Arena3D.setQuality(Store.d.settings.quality !== 0); settingsMenu(ui.querySelector('[data-from]') ? ui.querySelector('[data-from]').dataset.from : 'menu'); },
  resetStats: () => { Store.resetStats(); statsMenu(); },
  dlg: () => Dialog.next(),
  modes: () => Modes.menu(),
  tourney: () => Tourney.setup(),
  tourneyStart: () => Tourney.start(),
  tourneyFight: () => Tourney.fight(),
  replays: () => Replay.menu(),
  replayGo: v => Replay.start(+v),
  records: () => Records.show(),
  shot: () => screenshot(),
  online: () => Online.menu(),
  onHost: () => Online.host(),
  onJoin: () => Online.joinScreen(),
  onAccept: () => Online.accept(),
  onConnect: () => Online.connect(),
  onPick: v => Online.pick(+v),
  tutorial: () => Tutorial.start(),
  tower: () => { App.mode = 'tower'; App.level = 'orta'; selectMenu(0); },
  daily: () => Modes.dailyStart(),
  ghost: () => Modes.ghostMenu(),
  ghostGo: v => Modes.ghostGo(v),
  tagMenu: () => Modes.tagMenu(),
  tagGo: v => Modes.tagGo(v),
  shop: () => Modes.shop(),
  buy: v => Modes.buy(v),
  wear: v => Modes.wear(v),
  remapMenu: v => remapMenu(v),
  rosterPage: v => selectMenu(+ui.querySelector('.sel').dataset.step, +v),
  remap: v => { const [pl, a] = v.split(':'); App.remap = { pl, a }; const b = ui.querySelector(`[data-v="${v}"]`); if (b) b.textContent = '...'; },
  remapReset: () => { for (const pl of ['p1', 'p2']) for (const a in KEYMAP[pl]) KEYMAP[pl][a] = [...DEFAULT_KEYS[pl][a]]; Store.d.keys = null; Store.save(); remapMenu(App.remapFrom); },
  practice: () => { App.mode = 'practice'; selectMenu(0); },
  mp: () => { App.mode = '2p'; selectMenu(0); },
  controls: v => controlsMenu(v),
  mute: () => toggleMute(),
  level: v => { App.level = v; selectMenu(0); },
  storyGo: () => storyFight(),
  storyNext: () => storyChapter(),
  pick: v => {
    const step = +ui.querySelector('.sel').dataset.step;
    if (Modes.onPick(+v)) return;
    if (step === 0) { App.p1 = +v; if (App.mode === '2p') selectMenu(1); else if (App.mode === 'practice') { App.p2 = (App.p1 + 1) % FIGHTERS.length; versus(); } else if (App.mode === 'story') storyChapter(); else startLadder(); }
    else { App.p2 = +v; versus(); }
  },
  go: () => startFight(),
  next: () => versus(),
  retry: () => versus(),
  rematch: () => versus(),
  restart: () => { quitFight(); startFight(); },
  resume: () => togglePause(),
  pause: () => togglePause(),
  quit: () => { quitFight(); mainMenu(); },
};

function toggleMute() {
  Sfx.toggleMute(); syncCorner();
  const mb = ui.querySelector('[data-act=mute]');
  if (mb) mb.textContent = 'Ovoz: ' + (Sfx.muted ? "o'chiq" : 'yoqilgan') + ' (M)';
}

// burchakdagi doimiy tugmalar: ovoz va pauza
function syncCorner() {
  const m = document.getElementById('bMute'), p = document.getElementById('bPause');
  if (!m) return;
  m.textContent = Sfx.muted ? "Ovoz o'chiq" : 'Ovoz yoqiq';
  p.style.display = App.inFight && !Game.paused && Game.phase !== 'over' ? '' : 'none';
}

function mainMenu() {
  App.inFight = false; Game.phase = 'off'; Game.paused = false; Sfx.rumble(false); Music.play('menu');
  screen(`
    <div class="logo">METRO <span>JANG</span></div>
    <div class="tag">Toshkent metrosidan ilhomlangan bekatlardagi shiddatli janglar</div>
    <div class="menu">
      <button class="btn" data-act="story" autofocus>Hikoya — "Qora Halqa"</button>
      <button class="btn" data-act="sp">Arkada — botga qarshi</button>
      <button class="btn" data-act="mp">Ikki kishi — bitta klaviaturada</button>
      <button class="btn" data-act="practice">Mashq rejimi — kombolarni o'rganish</button>
      <button class="btn${Store.d.tutorialDone ? '' : ' glow'}" data-act="tutorial">O'rganish — qadamma-qadam</button>
      <button class="btn" data-act="modes">Boshqa rejimlar — minora, 2v2, turnir, onlayn...</button>
      <div class="row">
        <button class="btn small" data-act="controls" data-v="menu">Boshqaruv</button>
        <button class="btn small" data-act="moves" data-v="menu">Usullar</button>
        <button class="btn small" data-act="settings" data-v="menu">Sozlamalar</button>
        <button class="btn small" data-act="stats">Statistika</button>
        <button class="btn small" data-act="records">Rekordlar</button>
        <button class="btn small" data-act="shop">Do'kon (${Store.d.coins || 0})</button>
      </div>
    </div>
    <div class="foot">Menyuda: strelkalar / WASD va Enter (geympad: krestovina va A). Jangda: Esc — pauza, M — ovoz.</div>`);
}

function difficultyMenu() {
  screen(`
    <h1>Qiyinlik darajasi</h1>
    <div class="menu">
      <button class="btn" data-act="level" data-v="oson">Oson <small>— bot sekin, kam himoyalanadi</small></button>
      <button class="btn" data-act="level" data-v="orta" autofocus>O'rtacha <small>— bloklaydi, uslubingizni o'rganadi</small></button>
      <button class="btn" data-act="level" data-v="qiyin">Qiyin <small>— tez, xatolaringizni jazolaydi</small></button>
      <button class="btn small" data-act="menu" data-back>Orqaga</button>
    </div>`);
}

function selectMenu(step, page = 0) {
  const who = App.mode !== '2p' ? (App.mode === 'story' ? 'Hikoya qahramonini tanlang' : 'Jangchingizni tanlang') : (step === 0 ? "1-o'yinchi" : "2-o'yinchi") + ': jangchini tanlang';
  const choices = roster(), pages = Math.ceil(choices.length / 5);
  page = Math.max(0, Math.min(page, pages - 1));
  const cards = choices.slice(page * 5, page * 5 + 5).map(d => { const i = fIdx(d.id); return `
    <button class="btn card" data-act="pick" data-v="${i}" ${i === (step ? App.p2 : App.p1) ? 'autofocus' : ''}>
      <canvas width="150" height="150" data-f="${i}"></canvas>
      <b>${d.name}</b><i>${d.title}</i>
      <div class="stats">${['Kuch', 'Tezlik', 'Chidam'].map((n, k) => `<span>${n}</span><em style="--v:${d.stats[k] * 20}%"></em>`).join('')}</div>
      <div class="spc"><b>${d.specials[0].name}</b> • <b>${d.specials[1].name}</b></div>
    </button>`; }).join('');
  screen(`<h1 class="sel" data-step="${step}">${who}</h1>
    <div class="cards">${cards}</div>
    <div class="row">${Array.from({ length: pages }, (_, i) => `<button class="btn small ${i === page ? 'on' : ''}" data-act="rosterPage" data-v="${i}">${i + 1}-sahifa</button>`).join('')}</div>
    <button class="btn small" data-act="${step ? 'mp' : (App.mode === 'sp' ? 'sp' : App.mode === 'story' ? 'story' : 'menu')}" data-back>Orqaga</button>`,
    root => root.querySelectorAll('canvas[data-f]').forEach(cv => portrait(cv, FIGHTERS[+cv.dataset.f], step === 1 && +cv.dataset.f === App.p1)));
}

function portrait(cv, def, alt) {
  const c = cv.getContext('2d');
  const d = Object.assign({}, def, alt ? def.alt : {});
  if (Arena3D.portrait(cv, d)) return;
  const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, def.boss ? '#2a1240' : '#1d2b4a'); g.addColorStop(1, '#0b0f1a');
  c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  const sc = Math.min(cv.width / 200, cv.height / 230);
  c.save(); c.translate((cv.width - 200 * sc) / 2, 0); c.scale(sc, sc); c.translate(0, 220 - GROUND);
  const P = Object.assign({ lift: 0 }, POSES.idle);
  drawBody(c, d, P, 100, GROUND, 1, false, 0, false, true);
  drawBody(c, d, P, 100, GROUND, 1, false, 0, false, false);
  c.restore();
}

function controlsMenu(back) {
  const K = (pl, a) => keyLabel(KEYMAP[pl][a][0]);
  const row = (a, k1, k2) => `<tr><td>${a}</td><td><kbd>${k1}</kbd></td><td><kbd>${k2}</kbd></td></tr>`;
  screen(`<h1>Boshqaruv</h1>
    <div class="ctl">
      <table>
        <tr><th>Harakat</th><th>1-o'yinchi</th><th>2-o'yinchi</th></tr>
        ${row("Chapga / o'ngga", K('p1', 'left') + ' / ' + K('p1', 'right'), K('p2', 'left') + ' / ' + K('p2', 'right'))}
        ${['up', 'down', 'punch', 'heavy', 'kick', 'block', 'grab', 'special'].map(a => row(ACTION_NAMES[a], K('p1', a), K('p2', a))).join('')}
        <tr><td colspan="3" class="note">2-o'yinchi uchun raqamli klaviatura ham ishlaydi: 1, 2, 3, 0, 4, 5</td></tr>
      </table>
      <div class="moves">
        <h3>Kombolar (zarba tekkanda keyingisini bosing)</h3>
        <p><b>Metro zanjiri:</b> Yengil → Yengil → Kuchli (yiqitadi)</p>
        <p><b>Bo'ron tepki:</b> Yengil → Kuchli → Tepish (yiqitadi)</p>
        <p><b>Pastdan:</b> Egilib yengil → Tepish (oyoqdan chalish)</p>
        <h3>Himoya va qarshi hujum</h3>
        <p><b>Blok</b> zararni deyarli to'xtatadi. Zarba tegishidan sal oldin bosilgan blok — <b>qaytarish</b>: raqib ochilib qoladi.</p>
        <p>Past zarbalar egilib bloklanadi, sakrab tepish — tik turib. Hujum boshlanayotganda yoki kuchli zarbadan keyin urilgan raqib qo'shimcha zarar oladi.</p>
        <p>Bir xil zarbani tinimsiz takrorlash uning kuchini kamaytiradi va nafasni tez yeydi.</p>
        <h3>Kurash</h3>
        <p><b>Ushlash</b> yaqindan — klinch: Zarba — tizza, Tepish — uloqtirish, Ushlash — yerga yiqitish. Yerda: Zarba — yuqoridan urish, Ushlash — bo'g'ish.</p>
        <p><b>Egilish + Ushlash</b> — ikki oyoqqa sho'ng'ish; <b>Egilish + Blok</b> uni qaytaradi. Ushlanganda tugmalarni tez bosib qutuling.</p>
        <p><b>Egilib kuchli zarba</b> — raqibni havoga otadi. <b>Oxirgi bekat:</b> "TUGAT UNI!" chiqqanda yaqinlashib Maxsus tugma.</p>
        <h3>Maxsus usullar va Soya kuchi</h3>
        <p><b>Maxsus</b> — 1-usul, <b>Pastga + Maxsus</b> — 2-usul. Zarba tekkanda Maxsus bilan bekor qilish mumkin.</p>
        <p><b>Yakunlar:</b> "TUGAT UNI!" paytida Maxsus — qahramonning o'z yakuni, Pastga+Maxsus — "Uchinchi rels", Yuqoriga+Maxsus — "Do'stlik choyi".</p>
        <p><b>Harakat buyruqlari:</b> ↓↘→ + zarba = 1-maxsus usul, →↓↘ + zarba = 2-usul, ↓↙← + zarba = 3-usul. Kamroq kuch sarflaydi va kombo ichida ham ishlaydi.</p>
        <p><b>Kuchaytirilgan maxsus usul:</b> Blok + Maxsus (Soya kuchining uchdan biri) — 1.5 barobar kuchli.</p>
        <p><b>Soya kuchi</b> (binafsha shkala) zarba berib/olib to'ladi. To'la bo'lsa: <b>Kuchli + Maxsus</b> — Soya zarbasi. Yarmi bilan: urilib turganda <b>Blok</b> — zanjirni uzish.</p>
        <p><b>Geympad:</b> X — yengil, Y — kuchli, A — tepish, B — ushlash, RB/RT — blok, LB/LT — maxsus, Start — pauza.</p>
      </div>
    </div>
    <button class="btn small" data-act="${back === 'pause' ? 'resume' : 'menu'}" data-back autofocus>Orqaga</button>`);
}

function startLadder() {
  App.ladder = shuffle(FIGHTERS.map((_, i) => i).filter(i => i !== App.p1));
  App.pos = 0; App.p2 = App.ladder[0];
  versus();
}

function versus() {
  const a = FIGHTERS[App.p1], b = FIGHTERS[App.p2];
  const sub = Modes.versusSub() || (App.mode === 'sp'
    ? `${App.pos + 1}-raqib / ${App.ladder.length} • Daraja: ${LEVELS[App.level].name} • Raundni yutqazsangiz, keyingisi poyezdda!`
    : App.mode === 'practice' ? 'Mashq rejimi • Raqib hujum qilmaydi • B — jangchilarni qayta tiklash • Esc — chiqish'
    : "Ikki o'yinchi • 3 raunddan 2 tasini yutgan g'olib");
  screen(`<div class="vs">
      <div><canvas width="200" height="230" id="va"></canvas><b>${a.name}</b></div>
      <div class="vsx">qarshi</div>
      <div><canvas width="200" height="230" id="vb"></canvas><b>${b.name}</b></div>
    </div><div class="tag">${sub}</div>
    <button class="btn" data-act="go" autofocus>Jangni boshlash</button>`,
    root => { portrait(root.querySelector('#va'), a, false); portrait(root.querySelector('#vb'), b, App.p1 === App.p2); });
}

function startFight() {
  App.inFight = true;
  hideScreen();
  const sp = App.mode === 'sp' || App.mode === 'story';
  const ch = App.mode === 'story' ? STORY.chapters[App.chapter] : null;
  Game.start(Modes.extraOpts({
    mode: App.mode, p1: Modes.skinned(FIGHTERS[App.p1]), p2: FIGHTERS[App.p2], first: ch ? ch.station : null, noTrain: ch && ch.station === 'arvoh',
    c1: KEYMAP.p1, c2: sp ? new Bot(ch && ch.foe === 'soya' ? (App.level === 'oson' ? 'orta' : 'qiyin') : App.level) : App.mode === 'practice' ? new PracticeBot() : KEYMAP.p2,
    onEnd: side => { App.inFight = false; Sfx.rumble(false); afterMatch(side); },
  }));
  syncCorner();
}

function afterMatch(side) {
  if (App.inTourney) return side < 0 ? (App.inTourney = false, Tourney.bracket()) : Tourney.result(side);
  if (App.mode === 'online') return Online.after(side);
  const pName = FIGHTERS[App.p1].name, oName = FIGHTERS[App.p2].name;
  if (Modes.afterMatch(side)) return;
  if (App.mode === 'story') {
    if (side === 0) {
      const ch = STORY.chapters[App.chapter];
      App.chapter++; Store.d.story.chapter = App.chapter;
      const last = App.chapter >= STORY.chapters.length;
      if (last) { Store.d.story.done = true; Store.d.unlocked.soya = true; Store.d.story.chapter = 0; }
      Store.save();
      return Dialog.run(last ? ch.after.concat(ENDINGS[FIGHTERS[App.p1].id] || []) : ch.after, () => last
        ? screen(`<h1 class="win">Hikoya tugadi!</h1><div class="tag">${pName} Qora Halqani yengdi. <b>Soya</b> endi barcha rejimlarda ochiq.</div>
            <div class="menu"><button class="btn" data-act="menu" autofocus>Bosh menyu</button></div>`)
        : storyChapter());
    }
    return screen(`<h1 class="lose">Mag'lubiyat</h1><div class="tag">${oName} bu safar kuchliroq chiqdi. Bob qayta boshlanadi.</div>
      <div class="menu"><button class="btn" data-act="storyGo" autofocus>Qayta urinish</button>
      <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
  }
  if (side < 0) {
    return screen(`<h1>Durang!</h1><div class="tag">5 raunddan keyin ham g'olib aniqlanmadi.</div>
      <div class="menu"><button class="btn" data-act="retry" autofocus>Qayta jang</button>
      <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
  }
  if (App.mode === '2p') {
    const w = side === 0 ? pName : oName;
    return screen(`<h1 class="win">G'alaba!</h1><div class="tag">${side + 1}-o'yinchi (${w}) g'olib bo'ldi</div>
      <div class="menu"><button class="btn" data-act="rematch" autofocus>Revansh</button>
      <button class="btn" data-act="mp">Boshqa jangchilar</button>
      <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
  }
  if (side === 0) {
    App.pos++;
    if (App.pos >= App.ladder.length) {
      return screen(`<h1 class="win">Metro chempioni!</h1>
        <div class="tag">${pName} barcha raqiblarni yengdi. Metro sizniki!</div>
        <div class="menu"><button class="btn" data-act="sp" autofocus>Yana o'ynash</button>
        <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
    }
    App.p2 = App.ladder[App.pos];
    return screen(`<h1 class="win">G'alaba!</h1>
      <div class="tag">${oName} yengildi. Keyingi raqib: <b>${FIGHTERS[App.p2].name}</b></div>
      <div class="menu"><button class="btn" data-act="next" autofocus>Keyingi jang</button>
      <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
  }
  screen(`<h1 class="lose">Mag'lubiyat</h1>
    <div class="tag">${oName} bu safar kuchliroq chiqdi.</div>
    <div class="menu"><button class="btn" data-act="retry" autofocus>Qayta urinish</button>
    <button class="btn" data-act="sp">Boshqa daraja / jangchi</button>
    <button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
}

// ---------- Hikoya ----------
function storyMenu() {
  const c = Store.d.story;
  screen(`<h1>Hikoya: "${STORY.title}"</h1>
    <div class="tag">Yer osti ligasi metro bekatlarida jang qilib, o'g'irlangan soyalarni qaytaring. 6 bob, oxirida — xo'jayin.</div>
    <div class="menu">
      ${c.chapter > 0 ? `<button class="btn" data-act="storyCont" autofocus>Davom ettirish — ${STORY.chapters[c.chapter].title}</button>` : ''}
      <button class="btn" data-act="storyNew" ${c.chapter > 0 ? '' : 'autofocus'}>Yangi hikoya</button>
      <button class="btn small" data-act="menu" data-back>Orqaga</button>
    </div>`);
}
function storyFoe(id) {
  let i = fIdx(id);
  if (i === App.p1) i = fIdx(['temir', 'shamol', 'chaqmoq', 'boron'].find(x => fIdx(x) !== App.p1));
  return i;
}
function fill(text) { return text.replace(/\{hero\}/g, FIGHTERS[App.p1].name).replace(/\{foe\}/g, FIGHTERS[App.p2].name); }
function storyChapter() {
  const ch = STORY.chapters[App.chapter];
  App.p2 = storyFoe(ch.foe);
  const lines = (App.chapter === 0 ? STORY.intro : []).concat(ch.lines);
  Music.play('story');
  Dialog.run(lines, () => screen(`<h1>${ch.title}</h1>
    <div class="vs"><div><canvas width="200" height="230" id="va"></canvas><b>${FIGHTERS[App.p1].name}</b></div><div class="vsx">qarshi</div>
    <div><canvas width="200" height="230" id="vb"></canvas><b>${FIGHTERS[App.p2].name}</b></div></div>
    <div class="tag">Bekat: ${ch.station === 'train' ? 'Tungi poyezd' : ch.station === 'arvoh' ? GHOST.name : STATIONS.find(s => s.id === ch.station).name} • Daraja: ${LEVELS[App.level].name}</div>
    <button class="btn" data-act="storyGo" autofocus>Jangga!</button>`,
    root => { portrait(root.querySelector('#va'), FIGHTERS[App.p1]); portrait(root.querySelector('#vb'), FIGHTERS[App.p2]); }));
}
function storyFight() { startFight(); }

const Dialog = {
  lines: [], i: 0, done: null,
  run(lines, done) { this.lines = lines; this.i = 0; this.done = done; this.show(); },
  show() {
    if (this.i >= this.lines.length) return this.done();
    const [who0, text] = this.lines[this.i], who = fill(who0);
    const fi = FIGHTERS.findIndex(f => f.name === who);
    screen(`<div class="dlg">
      ${fi >= 0 ? `<canvas width="170" height="190" id="dp"></canvas>` : '<div class="narr">✶</div>'}
      <div class="dtext"><b>${who}</b><p>${fill(text)}</p></div></div>
      <button class="btn" data-act="dlg" autofocus>Davom (Enter)</button>`,
      root => { if (fi >= 0) portrait(root.querySelector('#dp'), FIGHTERS[fi]); });
  },
  next() { this.i++; this.show(); },
};

// ---------- Sozlamalar va statistika ----------
function settingsMenu(from = 'menu') {
  const S = Store.d.settings;
  const opt = (k, v, label) => `<button class="btn small ${S[k] === v ? 'on' : ''}" data-act="set" data-v="${k}:${v === true ? 1 : v === false ? 0 : v}">${label}</button>`;
  screen(`<h1 data-from="${from}">Sozlamalar</h1>
    <div class="ctl set">
      <label>Musiqa balandligi <input type="range" min="0" max="1" step="0.05" value="${S.music}" data-vol="music"></label>
      <label>Effektlar balandligi <input type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-vol="sfx"></label>
      <div>Raund vaqti: ${opt('roundTime', 30, '30 s')} ${opt('roundTime', 60, '60 s')} ${opt('roundTime', 90, '90 s')}</div>
      <div>Ekran silkinishi: ${opt('shake', true, 'Yoqiq')} ${opt('shake', false, "O'chiq")}</div>
      <div>3D grafika sifati: ${opt('quality', 1, 'Yuqori')} ${opt('quality', 0, 'Tezkor')}</div>
      <div>Diktor ovozi: ${opt('voice', true, 'Yoqiq')} ${opt('voice', false, "O'chiq")}</div>
      <div>Til: ${opt('lang', 'uz', "O'zbekcha")} ${opt('lang', 'ru', 'Русский')} ${opt('lang', 'en', 'English')}</div>
      <div><button class="btn small" data-act="remapMenu" data-v="${from}">Tugmalarni sozlash</button></div>
    </div>
    <button class="btn small" data-act="${from === 'pause' ? 'resume' : 'menu'}" data-back autofocus>Orqaga</button>`,
    root => root.querySelectorAll('[data-vol]').forEach(el => el.addEventListener('input', () => {
      S[el.dataset.vol] = +el.value; Store.save(); Sfx.setVolumes(S.sfx, S.music);
    })));
}
const ACTION_NAMES = { left: 'Chapga', right: "O'ngga", up: 'Sakrash', down: 'Egilish', punch: 'Yengil zarba', heavy: 'Kuchli zarba', kick: 'Tepish', block: 'Blok', grab: 'Ushlash', special: 'Maxsus' };
function remapMenu(from = 'menu') {
  App.remapFrom = from;
  const rows = Object.keys(ACTION_NAMES).map(a => `<tr><td>${ACTION_NAMES[a]}</td>${['p1', 'p2'].map(pl =>
    `<td><button class="btn small key" data-act="remap" data-v="${pl}:${a}">${keyLabel(KEYMAP[pl][a][0])}</button></td>`).join('')}</tr>`).join('');
  screen(`<h1>Tugmalarni sozlash</h1>
    <div class="tag" style="font-size:16px">Tugmani bosing, keyin yangi klaviatura tugmasini bosing. Band tugma almashtiriladi.</div>
    <div class="ctl"><table class="remap"><tr><th>Harakat</th><th>1-o'yinchi</th><th>2-o'yinchi</th></tr>${rows}</table></div>
    <div class="row"><button class="btn small" data-act="remapReset">Asl holatga qaytarish</button>
    <button class="btn small" data-act="settings" data-v="${from}" data-back autofocus>Orqaga</button></div>`);
}

function statsMenu() {
  const S = Store.d.stats;
  const rows = Object.entries(S.perFighter).map(([id, v]) => `<tr><td>${(FIGHTERS.find(f => f.id === id) || { name: id }).name}</td><td>${v.w}</td><td>${v.l}</td></tr>`).join('') || '<tr><td colspan="3" class="note">Hali jang yo\'q</td></tr>';
  screen(`<h1>Statistika</h1>
    <div class="ctl"><table>
      <tr><th>Ko'rsatkich</th><th></th></tr>
      <tr><td>Janglar (botga qarshi)</td><td>${S.matches}</td></tr><tr><td>G'alabalar</td><td>${S.wins}</td></tr><tr><td>Mag'lubiyatlar</td><td>${S.losses}</td></tr>
      <tr><td>"Oxirgi bekat" zarbalari</td><td>${S.finishers}</td></tr><tr><td>Soya zarbalari</td><td>${S.supers}</td></tr><tr><td>Eng uzun kombo</td><td>${S.bestCombo}</td></tr>
      <tr><td>Hikoya</td><td>${Store.d.story.done || Store.d.unlocked.soya ? 'Tugatilgan' : (Store.d.story.chapter + 1) + '-bob'}</td></tr>
    </table><table><tr><th>Jangchi</th><th>G'.</th><th>M.</th></tr>${rows}</table></div>
    <div class="menu"><button class="btn small" data-act="resetStats">Statistikani tozalash</button>
    <button class="btn small" data-act="menu" data-back autofocus>Orqaga</button></div>`);
}
function movesMenu(from = 'menu') {
  const rows = roster().map(d => `<tr><td><b>${d.name}</b></td><td>${d.specials[0].name}<br><small>${d.specials[0].desc}</small></td><td>${d.specials[1].name}<br><small>${d.specials[1].desc}</small></td><td>${d.sig}</td><td>${FINISHERS[d.id].name}</td></tr>`).join('');
  screen(`<h1>Usullar ro'yxati</h1>
    <div class="ctl moveslist"><table><tr><th>Jangchi</th><th>Maxsus</th><th>Pastga + Maxsus</th><th>Shaxsiy kombo</th><th>Yakuniy zarba</th></tr>${rows}</table></div>
    <div class="note">Umumiy: Yengil→Yengil→Kuchli • Yengil→Kuchli→Tepish • Kuchli+Maxsus — Soya zarbasi</div>
    <button class="btn small" data-act="${from === 'pause' ? 'resume' : 'menu'}" data-back autofocus>Orqaga</button>`);
}

function togglePause() {
  if (!App.inFight) return;
  Game.paused = !Game.paused;
  if (Game.paused) {
    screen(`<h1>Pauza</h1><div class="menu">
      <button class="btn" data-act="resume" autofocus data-back>Davom etish</button>
      <button class="btn small" data-act="shot">Skrinshot (P)</button>
      <button class="btn" data-act="restart">Jangni qayta boshlash</button>
      <button class="btn" data-act="controls" data-v="pause">Boshqaruv</button>
      <button class="btn" data-act="moves" data-v="pause">Usullar ro'yxati</button>
      <button class="btn" data-act="settings" data-v="pause">Sozlamalar</button>
      <button class="btn" data-act="mute">Ovoz: ${Sfx.muted ? "o'chiq" : 'yoqilgan'} (M)</button>
      <button class="btn small" data-act="quit">Bosh menyuga chiqish</button></div>`);
  } else hideScreen();
}

function quitFight() { Replay.play = null; App.tutorial = App.tutorial && Game.tut && Game.tut.i < Tutorial.steps.length && false; App.inFight = false; Game.paused = false; Game.phase = 'off'; Sfx.rumble(false); }

// ---------- UI qatlamini ekranga moslash ----------
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  document.getElementById('overlay').style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit); fit();

// ---------- Phaser 3: sahna, 60 FPS sikl, ekranga moslash, kamera silkinishi ----------
let acc = 0, menuT = 0;
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: W, height: H,
  backgroundColor: '#05070d', transparent: true,
  banner: false,
  input: { keyboard: false, mouse: false, touch: false },
  fps: { target: 60 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: {
    key: 'jang',
    create() {
      this.tex = this.textures.createCanvas('screen', W, H);
      ctx = this.tex.getContext();
      this.add.image(0, 0, 'screen').setOrigin(0, 0);
      Game.cam = this.cameras.main;
      mainMenu();
    },
    update(time, delta) {
      Pads.poll();
      const gp0 = Pads.get(0);
      if (Pads.any() && App.inFight && Game.phase !== 'over') togglePause();
      if (!App.inFight || Game.paused) {
        const nav = gp0.press.down || gp0.press.right ? 'ArrowDown' : gp0.press.up || gp0.press.left ? 'ArrowUp' : null;
        if (nav) menuKey({ code: nav, preventDefault() {} });
        if (gp0.press.kick && document.activeElement && document.activeElement.click) document.activeElement.click();
        if (gp0.press.grab) menuKey({ code: 'Escape', preventDefault() {} });
      }
      acc += Math.min(100, delta);
      while (acc >= 1000 / 60) {
        acc -= 1000 / 60;
        if (App.inFight) { if (App.mode === 'online') Online.tick(); else for (let k = 0; k < (Replay.play ? Replay.speed : 1); k++) Game.update(); } else menuT++;
      }
      if (App.inFight || Game.phase !== 'off') Game.render();
      else {
        Arena3D.show(false);
        drawStation(ctx, STATIONS[Math.floor(menuT / 480) % STATIONS.length], menuT, null);
        ctx.fillStyle = 'rgba(5,8,18,0.55)'; ctx.fillRect(0, 0, W, H);
      }
      this.tex.refresh();
    },
  },
});

// Raund oldidan gap otishlar (original iboralar)
const INTRO_LINES = {
  _: ['{o}, bugun bekatdan yayov ketasan!', 'Oxirgi poyezdga ulgurmaysan, {o}.'],
  boron: ['{o}, polvon bilan kurashga keldingmi?', 'Gilam ham, pol ham bir xil — yiqilasan!'],
  chaqmoq: ['Ko\'z ochib-yumguncha tugataman, {o}.', 'Meni ushlay olsang — sovg\'a beraman!'],
  temir: ['Qo\'lqoplarim tayyor, {o}.', 'Bir raund — bitta saboq.'],
  shamol: ['Kurash qoidasi: halol, lekin qattiq!', '{o}, belbog\'ingni mahkam bog\'la.'],
  lochin: ['Yuqoriga qara, {o} — men o\'sha yerdaman.', 'Lochin ovini qo\'ldan boy bermaydi.'],
  zanjir: ['Ko\'chada qoidalar yo\'q, {o}.', 'Zanjir uzilmaydi — sen uzilasan.'],
  nur: ['Yorug\'lik har doim yo\'l topadi.', '{o}, ko\'zingni qamashtiraman.'],
  qorovul: ['Fuqaro {o}, chiptangizni ko\'rsating!', 'Bekat yopiq. Sen uchun — abadiy.'],
  sher: ['Masofa, nafas, sabr — men uchtasini bilaman.', '{o}, parterda ko\'rishamiz.'],
  tuman: ['Meni ko\'rmaysan, {o}. Faqat sezasan.', 'Tuman tarqalganda sen yotgan bo\'lasan.'],
  navbatchi: ['Navbatim tugamaguncha hech kim o\'tmaydi!', 'Qizil signal, {o}. To\'xta!'],
  kalit: ['Sen ham ta\'mirga muhtojsan, {o}.', 'Gayka bo\'shabdi — tortib qo\'yaman.'],
  tulpor: ['Tulporni hech kim quvib yetmagan!', '{o}, chang-to\'zonimda qolasan.'],
  uchqun: ['Kickflip yoki kick-out — tanla, {o}!', 'Doskam tayyor, sen-chi?'],
  soya: ['Sening soyang allaqachon meniki, {o}.', 'Qorong\'ilikka xush kelibsan.'],
};
