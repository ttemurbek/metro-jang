// Metro Jang — interaktiv o'rgatish: har qadam bajarilganda keyingisiga o'tadi.
'use strict';

const Tutorial = {
  steps: [
    { text: k => `Yuring: ${k('left')} / ${k('right')}`, done: g => Math.abs(g.f1.x - g.tut.x0) > 120 },
    { text: k => `Sakrang: ${k('up')}`, done: g => g.f1.state === 'jump' },
    { text: k => `Egiling: ${k('down')}`, done: g => g.f1.state === 'crouch' },
    { text: k => `Raqibga yaqinlashib yengil zarba bering: ${k('punch')}`, done: g => g.f1.atkName === 'jab' && g.f1.hitDone },
    { text: k => `Kombo "Metro zanjiri": ${k('punch')} → ${k('punch')} → ${k('heavy')} (zarbalar tegishi kerak)`, done: g => g.f1.atkName === 'hook' && g.f1.hitDone },
    { text: k => `Raqib hujum qiladi — ${k('block')} ni bosib turib bloklang`, done: g => g.f1.state === 'blockstun', bot: 'attack' },
    { text: k => `Yaqin borib ushlang (klinch): ${k('grab')}`, done: g => g.grapple && g.grapple.a === g.f1 },
    { text: k => `Maxsus usul: ${k('special')}  (Pastga + ${k('special')} — ikkinchisi)`, done: g => g.f1.state === 'special' },
    { text: k => `Soya kuchi to'la! ${k('heavy')} ni bosib turib ${k('special')} — Soya zarbasi`, done: g => g.f1.state === 'super', meter: true },
  ],
  start() { App.tutorial = true; App.mode = 'practice'; App.p1 = 2; App.p2 = 3; startFight(); Game.tut = { i: 0, x0: Game.f1.x, ok: 0 }; },
  step(g) {
    if (!App.tutorial || !g.tut || g.phase !== 'fight') return;
    const T = g.tut, st = this.steps[T.i];
    if (!st) return;
    if (st.meter) g.f1.meter = 100;
    if (T.ok > 0) { if (--T.ok === 0) { T.i++; T.x0 = g.f1.x; if (!this.steps[T.i]) this.finish(); } return; }
    if (st.done(g)) { T.ok = 50; Sfx.confirm(); g.say('Zo\'r! ✓', W / 2, 220, '#6dff8a', 34); }
  },
  botInput(g) { // o'rgatishdagi raqib faqat blok qadamida hujum qiladi
    const st = App.tutorial && g.tut && this.steps[g.tut.i];
    const inp = { held: {}, press: {} };
    if (st && st.bot === 'attack') {
      const dx = g.f1.x - g.f2.x;
      if (Math.abs(dx) > 100) inp.held[dx > 0 ? 'right' : 'left'] = true; else if (g.t % 50 === 0) inp.press.punch = true;
    }
    return inp;
  },
  hud(g) {
    if (!App.tutorial || !g.tut) return;
    const st = this.steps[g.tut.i]; if (!st) return;
    const k = a => keyLabel(KEYMAP.p1[a][0]);
    ctx.fillStyle = 'rgba(10,20,40,0.88)'; roundRect(ctx, W / 2 - 360, 120, 720, 64, 14); ctx.fill();
    ctx.strokeStyle = '#ffc531'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffc531'; ctx.font = 'bold 16px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`O'rganish ${g.tut.i + 1}/${this.steps.length}`, W / 2, 140);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Trebuchet MS", sans-serif'; ctx.fillText(st.text(k), W / 2, 168);
  },
  finish() {
    App.tutorial = false; quitFight();
    Store.d.tutorialDone = true; Store.save(); Modes.coins(20);
    screen(`<h1 class="win">O'rganish tugadi!</h1><div class="tag">Endi siz yurish, kombo, blok, ushlash, maxsus usul va Soya zarbasini bilasiz. +20 tanga.</div>
      <div class="menu"><button class="btn" data-act="story" autofocus>Hikoyani boshlash</button><button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`);
  },
};
