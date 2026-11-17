// Metro Jang — jang mexanikasi testlari (brauzersiz). Ishga tushirish: node --test games/metro-jang/tests/mechanics.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const noop = () => {};
  const ctx = {
    console, Math, JSON, Object, Array, Set, Map, Number, String, isNaN, parseInt,
    Sfx: new Proxy({}, { get: () => noop }),
    Store: { d: { settings: { roundTime: 60, shake: true } } },
    Bot: class Bot {},
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..');
  for (const f of ['stage.js', 'fighter.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^'use strict';/m, ''), ctx, { filename: f });
  vm.runInContext('this.API = { FIGHTERS, ATK, Fighter, applyHit, tryHit, startGrapple, grappleStep, chainsFor, GROUND, setX: (a, b) => { MIN_X = a; MAX_X = b; } };', ctx);
  return ctx.API;
}
const A = load();
function game() {
  return { phase: 'fight', t: 0, projs: [], items: null, grapple: null, kos: [],
    say() {}, sparks() {}, ring() {}, dust() {}, camShake() {}, afterimage() {},
    onKO(v, a, m) { this.kos.push([v, a, m]); } };
}
function pair(i = 2, j = 3) {
  const f1 = new A.Fighter(A.FIGHTERS[i], 0, {}), f2 = new A.Fighter(A.FIGHTERS[j], 1, {});
  f1.x = 500; f2.x = 580; f1.face = 1; f2.face = -1; return [f1, f2];
}
const none = { held: {}, press: {} };

test('zarba tegsa jon kamayadi va raqib zarbadan keyingi holatga o\'tadi', () => {
  const g = game(), [a, b] = pair();
  A.applyHit(a, b, A.ATK.jab, g);
  assert.ok(b.hp < b.maxHp); assert.strictEqual(b.state, 'hit');
});

test('blok zararni keskin kamaytiradi', () => {
  const g = game(), [a, b] = pair();
  b.set('block'); A.applyHit(a, b, A.ATK.heavy, g);
  assert.ok(b.maxHp - b.hp < A.ATK.heavy.dmg * 0.2); assert.strictEqual(b.state, 'blockstun');
});

test("past zarba tik turgan blokni yorib o'tadi, cho'kkalaganda to'xtaydi", () => {
  const g = game(), [a, b] = pair();
  b.set('block'); b.crouching = false; A.applyHit(a, b, A.ATK.sweep, g);
  assert.notStrictEqual(b.state, 'blockstun');
  const [c, d] = pair(); d.set('block'); d.crouching = true; A.applyHit(c, d, A.ATK.sweep, g);
  assert.strictEqual(d.state, 'blockstun');
});

test("o'z vaqtida blok — qaytarish: hujumchi ochilib qoladi", () => {
  const g = game(), [a, b] = pair();
  b.set('block'); b.parryT = 5; A.applyHit(a, b, A.ATK.jab, g);
  assert.strictEqual(a.state, 'hit'); assert.strictEqual(b.hp, b.maxHp);
});

test('bir xil zarbani takrorlash zararni kamaytiradi', () => {
  const g = game(), [a, b] = pair();
  a.startAtk('jab', g); A.applyHit(a, b, A.ATK.jab, g); const d1 = b.maxHp - b.hp;
  for (let k = 0; k < 4; k++) a.startAtk('jab', g);
  const [, c] = pair(); A.applyHit(a, c, A.ATK.jab, g); const d2 = c.maxHp - c.hp;
  assert.ok(d2 < d1, `${d2} < ${d1}`);
});

test("kombo zanjiri: jab → cross → hook", () => {
  const ch = A.chainsFor(A.FIGHTERS[0], 'jab');
  assert.strictEqual(ch.punch, 'cross'); assert.strictEqual(A.chainsFor(A.FIGHTERS[0], 'cross').heavy, 'hook');
});

test("jon tugasa onKO chaqiriladi", () => {
  const g = game(), [a, b] = pair(); b.hp = 1;
  A.applyHit(a, b, A.ATK.heavy, g);
  assert.strictEqual(g.kos.length, 1); assert.strictEqual(g.kos[0][0], b);
});

test("klinchdan tugmalarni bosib qutulish mumkin", () => {
  const g = game(), [a, b] = pair(); A.setX(70, 1210);
  A.startGrapple(g, 'clinch', a, b);
  const mash = { held: {}, press: { punch: true, kick: true } };
  for (let k = 0; k < 40 && g.grapple; k++) A.grappleStep(g, none, mash);
  assert.strictEqual(g.grapple, null); assert.strictEqual(b.state, 'idle');
});

test('har bir jangchida kamida 2 ta maxsus usul va shaxsiy kombo bor', () => {
  for (const f of A.FIGHTERS) { assert.ok(f.specials.length >= 2, f.id); assert.ok(f.sig, f.id); }
});

test('↓↘→ + zarba maxsus usulni chiqaradi, oddiy zarba esa yo\'q', () => {
  const g = game(), [a, b] = pair();
  const seq = [{ down: true }, { down: true, right: true }, { right: true }];
  for (const h of seq) for (let i = 0; i < 3; i++) a.step({ held: h, press: {} }, b, g);
  a.step({ held: { right: true }, press: { punch: true } }, b, g);
  assert.strictEqual(a.state, 'special');
  const [c, d] = pair();
  c.step({ held: {}, press: { punch: true } }, d, g);
  assert.strictEqual(c.state, 'attack');
});

test('havodagi kombo cheksiz davom etmaydi', () => {
  const g = game(), [a, b] = pair();
  b.y = A.GROUND - 120; b.state = 'air';
  for (let i = 0; i < 8; i++) { b.y = A.GROUND - 120; A.applyHit(a, b, A.ATK.jab, g); }
  assert.ok(b.jug >= 6); assert.ok(b.vy > -14);
});
