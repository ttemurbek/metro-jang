const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const THREE = require(path.join(root, 'lib/three.min.js'));
THREE.WebGLRenderer = class {
  constructor() { this.domElement = { style: {} }; this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render() {}
  dispose() {}
};
const canvas = () => ({ width: 200, height: 230, getContext: () => ({
  fillRect() {}, strokeRect() {}, fillText() {}, clearRect() {}, drawImage() {},
}) });
const context = vm.createContext({
  window: { THREE }, THREE, console,
  localStorage: { getItem: () => null, setItem() {} },
  document: { createElement: canvas, getElementById: () => ({ appendChild() {} }) },
  addEventListener() {}, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
});
for (const name of ['settings.js', 'stage.js', 'fighter.js', 'finishers.js', 'arena3d.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name });
}

test('har bir jangchining o‘z yakuniy zarbasi va mavjud animatsiya pozalari bor', () => {
  const result = vm.runInContext(`({
    missing: FIGHTERS.filter(f => !FINISHERS[f.id]).map(f => f.id),
    invalid: Object.values(FINISHERS).flatMap(f => f.moves.filter(p => !POSES[p])),
    names: Object.values(FINISHERS).map(f => f.name)
  })`, context);
  assert.equal(result.missing.length, 0);
  assert.equal(result.invalid.length, 0);
  assert.equal(new Set(result.names).size, result.names.length);
});

test('3D bekat, poyezd, jangchilar, qon va portret kodlari ishlaydi', () => {
  const result = vm.runInContext(`(() => {
    const f1 = new Fighter(FIGHTERS[0], 0, {}), f2 = new Fighter(FIGHTERS[1], 1, {});
    const g = { f1, f2, train: false, station: STATIONS[0], t: 1, phase: 'fight', phaseT: 0, shake: 0, projs: [], items: [], rings: [] };
    Arena3D.update(g);
    Arena3D.blood(f2.x, f2.y, 6);
    Arena3D.impact(FINISHERS.boron, f2.x, f2.y);
    g.t++; Arena3D.update(g);
    g.train = true; g.station = null; g.t++; Arena3D.update(g);
    return { ready: Arena3D.ready, portrait: Arena3D.portrait(document.createElement('canvas'), FIGHTERS[0]) };
  })()`, context);
  assert.equal(result.ready, true);
  assert.equal(result.portrait, true);
});
