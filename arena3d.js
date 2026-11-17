// Metro Jang 3D: WebGL arena and articulated, volumetric fighters.
// The existing fight simulation remains authoritative; this module only renders it.
'use strict';

const Arena3D = (() => {
  if (!window.THREE) return { ready: false, show() {}, update() {}, blood() {} };
  const T = THREE, W3 = 16, fighters = [null, null], drops = [], stains = [], bursts = [];
  const projectiles = new Map(), pickups = new Map(), ringFx = new Map();
  let camX = 0, camZ = 11;
  const _zAxis = new T.Vector3(0, 0, 1);
  let renderer, scene, camera, stage, stageKey = '', active = false, lastFrame = -1, light, backdropTexture = null;
  let portraitRenderer, portraitScene, portraitCamera;
  const portraitModels = new Map();
  const realTemplates = Object.create(null);
  const modelKind = def => def.female && realTemplates.female ? 'female' : def.top ? 'suited' : 'man';
  let animSrc = null; // CC0 jang animatsiyalari manbasi (faqat skelet)
  function loadRealModels() {
    if (!window.MetroGLTF || !window.MetroModelData) return;
    const loader = new MetroGLTF.GLTFLoader();
    for (const kind of ['man', 'suited', 'female']) {
      const raw = MetroModelData[kind];
      if (!raw) continue;
      try {
        const bytes = Uint8Array.from(atob(raw), ch => ch.charCodeAt(0));
        loader.parse(bytes.buffer, '', gltf => {
          realTemplates[kind] = gltf;
          if (portraitScene) for (const model of portraitModels.values()) portraitScene.remove(model.root);
          portraitModels.clear();
        }, () => {});
      } catch (e) { /* Procedural fighter remains available. */ }
    }
    if (window.MetroAnimData) try {
      const bytes = Uint8Array.from(atob(window.MetroAnimData), ch => ch.charCodeAt(0));
      loader.parse(bytes.buffer, '', gltf => { animSrc = gltf; }, () => {});
    } catch (e) { /* animatsiyasiz ham ishlaydi */ }
  }
  // Har jangchining kiyimi: suyaklarga biriktirilgan shim, ko'ylak/kurtka, kamar, qo'lqop, soch, poyabzal
  function dress(rig, nodeOf, def) {
    const dark = !!def.shadow, M = c => clothMat(dark ? '#0d0b14' : c);
    const Y = new T.Vector3(0, 1, 0);
    const seg = (bn, rw, f0, f1, m, taper = 1) => {
      const R = rig[bn]; if (!R) return;
      const L = R.len * (f1 - f0), rr = rw * R.k;
      const mesh = new T.Mesh(new T.CylinderGeometry(rr * taper, rr, L, 14), m);
      mesh.quaternion.setFromUnitVectors(Y, R.childDir); mesh.position.copy(R.childDir).multiplyScalar(R.len * (f0 + f1) / 2);
      mesh.castShadow = true; R.node.add(mesh);
    };
    const ball = (node, k, rw, m, up = 0, sy = 1) => {
      if (!node) return; const mesh = new T.Mesh(sphere, m); mesh.scale.set(rw * k, rw * k * sy, rw * k); mesh.position.set(0, up * k, 0); mesh.castShadow = true; node.add(mesh);
    };
    const full = def.jacket || def.hoodie;
    const shortsM = M(def.shorts || '#222833'), topM = def.top ? M(def.top) : null, trimM = M(def.trim || '#bda674'), gloveM = new T.MeshPhysicalMaterial({ color: dark ? '#1a0f2a' : def.gloves || '#2a2a2a', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, normalMap: skinNormal, normalScale: new T.Vector2(0.25, 0.25) });
    for (const sd of ['_l', '_r']) {
      if (full) { seg('thigh' + sd, 0.092, 0, 1, shortsM, 0.85); seg('calf' + sd, 0.07, 0, 0.95, shortsM, 0.85); ball(nodeOf('foot' + sd), rig['calf' + sd] ? rig['calf' + sd].k : 1, 0.07, M('#1b1b1b'), 0.03, 0.6); }
      else seg('thigh' + sd, 0.1, 0, 0.5, shortsM, 0.92);
      if (full && topM) { seg('upperarm' + sd, 0.06, 0, 1, topM, 0.9); seg('lowerarm' + sd, 0.05, 0, 0.8, topM, 0.9); }
      ball(nodeOf('hand' + sd), rig['lowerarm' + sd] ? rig['lowerarm' + sd].k : 1, 0.068, gloveM, 0.06);
    }
    seg('spine_01', 0.165, -0.1, 0.45, full ? trimM : shortsM);
    if (topM) {
      if (full) { seg('spine_01', 0.16, 0.3, 1, topM); seg('spine_02', 0.165, 0, 1, topM); seg('spine_03', 0.17, 0, 1, topM, 0.85); }
      else seg('spine_03', 0.165, 0, 0.75, topM);
    }
    const hk = rig.neck_01 ? rig.neck_01.k : 1, head = nodeOf('head');
    if (def.hairStyle !== 'bald') ball(head, hk, 0.112, M(def.hairStyle === 'cap' ? (def.capColor || '#22303f') : def.hair || '#1b1b1b'), 0.11, 0.62);
    if (def.hairStyle === 'long' || def.hairStyle === 'ponytail') ball(head, hk, 0.07, M(def.hair || '#1b1b1b'), 0.02, 2.2);
    if (def.beard) ball(head, hk, 0.085, M(def.hair || '#1b1b1b'), 0.0, 0.7);
    if (def.band || def.bandana) ball(head, hk, 0.118, M(def.bandana || def.trim), 0.1, 0.25);
    if (def.shadow || def.glow) { const l = new T.PointLight(def.shadow ? '#9a50ff' : def.glow, 3, 4); head && head.add(l); }
  }

  function makeRealFighter(def, parent) {
    const template = realTemplates[modelKind(def)];
    if (!template || !window.MetroGLTF) return null;
    const root = new T.Group();
    const body = MetroGLTF.clone(template.scene);
    root.add(body); root.scale.setScalar((def.size || 1) * 2.0); parent.add(root);
    const bones = Object.create(null);
    body.traverse(node => {
      if (node.isBone) bones[node.name] = { node, base: node.rotation.clone() };
      if (node.isMesh) {
        node.castShadow = true; node.receiveShadow = true;
        node.material = Array.isArray(node.material) ? node.material.map(m => m.clone()) : node.material.clone();
        if (!Array.isArray(node.material) && node.geometry.attributes.uv) { const old = node.material; node.material = skinMat(old.color ? old.color.clone() : '#c08a60', { map: old.map || null }); }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of materials) {
          if (m.color) m.color.set(def.shadow ? '#1a1626' : new T.Color(def.skin || '#c08a60').lerp(new T.Color('#f2d2bd'), 0.25));
          if (def.shadow && m.emissive) { m.emissive.set('#2a0f45'); m.emissiveIntensity = 0.6; }
          m.side = T.DoubleSide;
        }
      }
    });
    // Suyaklarni o'yin skeletiga yo'nalish bo'yicha moslash uchun tinch holat ma'lumotlari
    root.scale.setScalar(1); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);
    // MakeHuman eksportida qolib ketgan yordamchi geometriya (yubka, kolgotka, yo'naltiruvchi chiziqlar) oyoqlar orasida
    // "yubka" bo'lib cho'zilardi: asosiy tanadan alohida, katta bo'laklarni ko'rinmaydigan qilamiz.
    body.traverse(m => {
      if (!m.isSkinnedMesh || !m.geometry.index || m.geometry.userData.helpersOff !== undefined) return;
      const geo = m.geometry, pos = geo.attributes.position, ix = geo.index, n = pos.count, par = new Int32Array(n);
      for (let i = 0; i < n; i++) par[i] = i;
      const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }, join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
      const seen = new Map(), v = new T.Vector3();
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i); const k = Math.round(v.x * 2000) + ',' + Math.round(v.y * 2000) + ',' + Math.round(v.z * 2000); if (seen.has(k)) join(i, seen.get(k)); else seen.set(k, i); }
      for (let t = 0; t < ix.count; t += 3) { join(ix.getX(t), ix.getX(t + 1)); join(ix.getX(t), ix.getX(t + 2)); }
      const comps = new Map();
      for (let i = 0; i < n; i++) {
        const r = find(i); let c = comps.get(r); if (!c) comps.set(r, c = { n: 0, lo: new T.Vector3(1e9, 1e9, 1e9), hi: new T.Vector3(-1e9, -1e9, -1e9) });
        v.fromBufferAttribute(pos, i); c.n++; c.lo.min(v); c.hi.max(v);
      }
      const list = [...comps.entries()].sort((a, b) => b[1].n - a[1].n), main = list[0][1];
      if (main.hi.y - main.lo.y < 1.2) { geo.userData.helpersOff = 0; return; } // butun tana bitta bo'lak emas: tegmaymiz
      const drop = new Set(list.slice(1).filter(([, c]) => c.hi.y - c.lo.y > 0.25).map(([r]) => r));
      if (!drop.size) { geo.userData.helpersOff = 0; return; }
      const keep = [];
      for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t); if (!drop.has(find(a))) keep.push(a, ix.getX(t + 1), ix.getX(t + 2)); }
      geo.setIndex(keep); geo.userData.helpersOff = drop.size;
    });
    const nodeOf = n => { const b = bones[n] || bones[n[0].toUpperCase() + n.slice(1)]; return b && b.node; }, wp = n => nodeOf(n).getWorldPosition(new T.Vector3());
    const rig = Object.create(null);
    for (const [b, c] of [['spine_01', 'spine_02'], ['spine_02', 'spine_03'], ['spine_03', 'neck_01'], ['neck_01', 'head'],
      ['upperarm_l', 'lowerarm_l'], ['lowerarm_l', 'hand_l'], ['upperarm_r', 'lowerarm_r'], ['lowerarm_r', 'hand_r'],
      ['thigh_l', 'calf_l'], ['calf_l', 'foot_l'], ['thigh_r', 'calf_r'], ['calf_r', 'foot_r']]) {
      const bn = nodeOf(b), cn = nodeOf(c); if (!bn || !cn) continue;
      const loc = bn.worldToLocal(cn.getWorldPosition(new T.Vector3())), lenW = bn.getWorldPosition(new T.Vector3()).distanceTo(cn.getWorldPosition(new T.Vector3()));
      rig[b] = { node: bn, restQ: bn.quaternion.clone(), len: loc.length(), k: loc.length() / (lenW || 1), childDir: loc.clone().normalize() };
    }
    const legLen = nodeOf('thigh_l') && nodeOf('foot_l') ? wp('thigh_l').distanceTo(wp('calf_l')) + wp('calf_l').distanceTo(wp('foot_l')) : 0.9;
    const pelvis = nodeOf('pelvis') || (nodeOf('spine_01') && nodeOf('spine_01').parent);
    const fwd = nodeOf('foot_l') && nodeOf('ball_l') ? Math.sign(wp('ball_l').z - wp('foot_l').z) || 1 : 1;
    dress(rig, nodeOf, def);
    return { root, body, bones, rig, legLen, pelvis, fwd, real: Object.keys(rig).length >= 10,
      def, lastHp: 100 * (def.hpMul || 1), pose: {}, motion: 0 };
  }
  const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.67, metalness: 0.08, ...extra });
  // Kodda yasalgan detal teksturalari: teri g'ovaklari, mato to'qimasi, yumshoq nur, qon dog'i
  function canvasTex(size, draw, normal) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); draw(x, size);
    if (normal) { // balandlik xaritasidan normal xarita
      const src = x.getImageData(0, 0, size, size), out = x.createImageData(size, size), h = (i, j) => src.data[(((j + size) % size) * size + ((i + size) % size)) * 4] / 255;
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const dx = (h(i - 1, j) - h(i + 1, j)) * normal, dy = (h(i, j - 1) - h(i, j + 1)) * normal, l = Math.hypot(dx, dy, 1), o = (j * size + i) * 4;
        out.data[o] = (dx / l * 0.5 + 0.5) * 255; out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[o + 3] = 255;
      }
      x.putImageData(out, 0, 0);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  const rnd = (() => { let a = 1234567; return () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
  const skinNormal = canvasTex(256, (x, n) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = 100 + rnd() * 70 | 0; x.fillStyle = `rgba(${v},${v},${v},0.5)`; x.beginPath(); x.arc(rnd() * n, rnd() * n, 0.6 + rnd() * 1.6, 0, 7); x.fill(); }
  }, 2.2);
  skinNormal.repeat.set(10, 10);
  const clothNormal = canvasTex(128, (x, n) => {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const w = ((i >> 2) + (j >> 2)) % 2 ? Math.sin(i * 0.8) : Math.sin(j * 0.8), v = 128 + w * 60 + (rnd() - 0.5) * 30 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, j, 1, 1); }
  }, 1.4);
  clothNormal.repeat.set(5, 5);
  const softTex = canvasTex(64, (x, n) => { const gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, n, n); });
  const splatTex = [0, 1, 2].map(() => canvasTex(128, (x, n) => {
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(n / 2, n / 2, n * 0.22, 0, 7); x.fill();
    for (let i = 0; i < 14; i++) { const a = rnd() * 7, d = n * (0.12 + rnd() * 0.25), rr = n * (0.03 + rnd() * 0.08); x.beginPath(); x.arc(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, rr, 0, 7); x.fill(); }
    for (let i = 0; i < 20; i++) { const a = rnd() * 7, d = n * (0.3 + rnd() * 0.17); x.beginPath(); x.arc(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, 1 + rnd() * 2.5, 0, 7); x.fill(); }
  }));
  const skinMat = (color, extra = {}) => new T.MeshPhysicalMaterial({ color, roughness: 0.52, metalness: 0, sheen: 0.45, sheenColor: new T.Color('#ff9a85'), sheenRoughness: 0.55,
    clearcoat: 0.12, clearcoatRoughness: 0.5, normalMap: skinNormal, normalScale: new T.Vector2(0.22, 0.22), ...extra });
  const clothMat = (color, extra = {}) => new T.MeshPhysicalMaterial({ color, roughness: 0.92, metalness: 0, sheen: 1, sheenColor: new T.Color(color).lerp(new T.Color('#ffffff'), 0.35), sheenRoughness: 0.8,
    normalMap: clothNormal, normalScale: new T.Vector2(0.6, 0.6), ...extra });
  const black = mat('#111218'), white = mat('#e7e8dd');
  const bloodMat = new T.MeshPhysicalMaterial({ color: '#4d0207', roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
  const sphere = new T.SphereGeometry(1, 12, 9), dropGeo = new T.SphereGeometry(0.055, 8, 6), stainGeo = new T.PlaneGeometry(1, 1);
  const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
  };
  function orb(parent, sx, sy, sz, material, x, y, z) {
    const m = new T.Mesh(sphere, material); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = true; parent.add(m); return m;
  }
  function limb(parent, length, rTop, rBottom, material, x, y, z) {
    const pivot = new T.Group(); pivot.position.set(x, y, z); parent.add(pivot);
    const m = new T.Mesh(new T.CylinderGeometry(rTop, rBottom, length, 10), material);
    m.position.y = -length / 2; m.castShadow = true; pivot.add(m);
    return pivot;
  }
  function sign(text, color, width = 4.8) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 200;
    const q = c.getContext('2d'); q.fillStyle = '#111a29'; q.fillRect(0, 0, 1024, 200);
    q.strokeStyle = color; q.lineWidth = 14; q.strokeRect(10, 10, 1004, 180);
    q.fillStyle = '#fff'; q.font = 'bold 82px Arial'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(text, 512, 102, 950);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(width, width * 200 / 1024), new T.MeshBasicMaterial({ map: tex }));
    return m;
  }
  function makeFighter(def, parent = scene) {
    const realistic = makeRealFighter(def, parent);
    if (realistic) return realistic;
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const skin = mat(def.skin || '#bb8b68'), cloth = mat(def.top || def.shorts || '#313747'), shorts = mat(def.shorts || '#212a3c');
    const gloves = mat(def.gloves || '#31313d'), trim = mat(def.trim || '#bda674', { metalness: 0.28 }), hair = mat(def.hair || '#17171b');
    const skinOrCloth = def.top ? cloth : skin;
    const chest = new T.Mesh(new T.CylinderGeometry(0.47, 0.34, 1.12, 18), skinOrCloth);
    chest.position.y = 2.12; chest.scale.z = 0.72; chest.castShadow = true; body.add(chest);
    orb(body, 0.46, 0.17, 0.31, skinOrCloth, 0, 2.66, 0);
    orb(body, 0.39, 0.27, 0.29, shorts, 0, 1.44, 0);
    body.add(box(0.72, 0.07, 0.52, trim, 0, 1.67, 0));
    const neck = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 0.27, 12), skin);
    neck.position.y = 2.83; body.add(neck);
    orb(body, 0.285, 0.365, 0.265, skin, 0, 3.21, 0);
    orb(body, 0.25, 0.13, 0.245, skin, 0.065, 3.01, 0); // jaw
    orb(body, 0.075, 0.12, 0.045, skin, -0.05, 3.21, 0.26); // ear
    orb(body, 0.058, 0.085, 0.068, skin, 0.275, 3.18, 0.02); // nose
    orb(body, 0.024, 0.018, 0.012, black, 0.17, 3.30, 0.205);
    body.add(box(0.12, 0.025, 0.025, hair, 0.17, 3.37, 0.21)); // brow
    body.add(box(0.11, 0.018, 0.018, mat('#553a32'), 0.18, 3.08, 0.19)); // mouth
    if (def.hairStyle !== 'bald') {
      orb(body, 0.275, 0.105, 0.27, hair, -0.015, 3.54, 0);
      if (def.hairStyle === 'long' || def.hairStyle === 'ponytail') orb(body, 0.18, 0.34, 0.20, hair, -0.20, 3.17, -0.09);
      if (def.hairStyle === 'mohawk') body.add(box(0.13, 0.20, 0.40, hair, -0.02, 3.62, 0));
    }
    if (def.beard) orb(body, 0.21, 0.09, 0.23, hair, 0.06, 2.99, 0);
    if (def.bandana || def.band) body.add(box(0.65, 0.1, 0.65, mat(def.bandana || def.trim), 0, 3.39, 0));
    if (def.hoodie) orb(body, 0.37, 0.38, 0.35, cloth, -0.14, 3.28, -0.1);
    if (def.weapon === 'chain') {
      const chain = mat('#9ca7b3', { metalness: 0.78 });
      for (let i = 0; i < 5; i++) orb(body, 0.07, 0.1, 0.07, chain, 0.46 + i * 0.09, 1.7 - i * 0.12, 0.4);
    }
    if (def.weapon === 'baton' || def.weapon === 'wrench') body.add(box(0.10, 0.9, 0.10, mat('#78838d', { metalness: 0.7 }), -0.46, 1.85, 0.38));
    const arms = [], legs = [];
    for (const z of [-0.35, 0.35]) {
      const shoulder = limb(body, 0.60, 0.20, 0.17, skinOrCloth, 0, 2.67, z);
      const elbow = limb(shoulder, 0.54, 0.17, 0.13, skin, 0, -0.60, 0);
      orb(elbow, 0.145, 0.18, 0.14, gloves, 0.025, -0.57, 0);
      orb(body, 0.22, 0.22, 0.22, skinOrCloth, 0, 2.67, z);
      arms.push({ shoulder, elbow });
      const thigh = limb(body, 0.71, 0.29, 0.22, shorts, z * 0.72, 1.31, z * 0.45);
      const shin = limb(thigh, 0.65, 0.21, 0.14, skin, 0, -0.71, 0);
      shin.add(box(0.47, 0.22, 0.34, black, 0.15, -0.67, 0));
      legs.push({ thigh, shin });
    }
    const accent = mat(def.glow || def.trim || '#d0aa58', { emissive: def.glow || '#000000', emissiveIntensity: def.glow ? 0.26 : 0 });
    body.add(box(0.98, 0.045, 0.60, accent, 0, 2.37, 0));
    root.scale.setScalar(def.size || 1); parent.add(root);
    return { root, body, arms, legs, def, lastHp: 100 * (def.hpMul || 1), pose: {}, motion: 0 };
  }
  function clearStage() {
    if (stage) scene.remove(stage);
    for (const d of drops) scene.remove(d.mesh); drops.length = 0;
    for (const s of stains) scene.remove(s.mesh); stains.length = 0;
    for (const b of bursts) scene.remove(b.mesh); bursts.length = 0;
    for (const map of [projectiles, pickups, ringFx]) { for (const m of map.values()) scene.remove(m); map.clear(); }
    stage = new T.Group(); scene.add(stage);
  }
  // 3D bekat: ustunlar, qandillar (haqiqiy yorug'lik bilan), platforma chiziqlari, yaltiroq pol
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d');
    const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,210,0.5)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  function build3dStation(st) {
    const X = px => px / 80 - 8;
    const colM = mat(st.col ? st.col[0] : '#d8d0c0', { roughness: 0.22, metalness: 0.18 }), capM = mat(st.accent || '#c79a2c', { roughness: 0.35, metalness: 0.4 });
    for (const px of [110, 350, 930, 1170]) for (const z of [-1.9]) {
      const c = new T.Mesh(new T.CylinderGeometry(0.3, 0.34, 6.2, 24), colM); c.position.set(X(px), 3.1, z); c.castShadow = true; c.receiveShadow = true; stage.add(c);
      stage.add(box(0.95, 0.28, 0.95, capM, X(px), 6.1, z)); stage.add(box(0.9, 0.24, 0.9, capM, X(px), 0.12, z));
    }
    const lampM = new T.MeshStandardMaterial({ color: st.lamp || '#fff2c4', emissive: st.lamp || '#fff2c4', emissiveIntensity: 2.2 });
    for (const px of [250, 640, 1030]) {
      const gx = X(px), grp = new T.Group(); grp.position.set(gx, 4.9, -0.6);
      for (let i = 0; i < 8; i++) { const b = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), lampM); b.position.set(Math.cos(i * 0.785) * 0.42, Math.sin(i * 1.7) * 0.06, Math.sin(i * 0.785) * 0.42); grp.add(b); }
      const ring = new T.Mesh(new T.TorusGeometry(0.42, 0.025, 6, 28), capM); ring.rotation.x = Math.PI / 2; grp.add(ring);
      const rod = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 1.6, 6), mat('#444')); rod.position.y = 0.8; grp.add(rod);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: st.lamp || '#fff2c4', blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
      glow.scale.set(2.6, 2.6, 1); grp.add(glow);
      const pl = new T.PointLight(st.lamp || '#fff2c4', 9 * (1 - (st.dim || 0)), 9, 1.6); pl.position.y = -0.3; grp.add(pl);
      stage.add(grp);
    }
    // platforma chetidagi sariq ogohlantirish chizig'i (orqa tomonda) va yaltiroq pol plitalari
    stage.add(box(17, 0.04, 0.22, mat('#d8b400', { roughness: 0.4 }), 0, 0.02, -2.75));
    const tileM = mat(st.floor ? st.floor[1] : '#333', { roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.35 });
    for (let x = -8; x <= 8; x += 1.6) stage.add(box(0.02, 0.005, 6, tileM, x, 0.01, 0));
  }

  function buildStage(g) {
    clearStage();
    const train = g.train, st = g.station || {}, accent = train ? '#48b5d7' : st.accent || '#a8cfff';
    // fon: o'yinning o'zida kodda chizilgan bekat (har bekatning o'z ko'rinishi), surat ishlatilmaydi
    backdropTexture = null;
    if (!train && st.id) {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
      drawStation(c.getContext('2d'), st, 0, null, true);
      backdropTexture = new T.CanvasTexture(c); backdropTexture.colorSpace = T.SRGBColorSpace;
    }
    scene.background = train ? new T.Color('#17232e') : backdropTexture || new T.Color(st.wall ? st.wall[1] : '#182137');
    scene.fog = train ? new T.Fog('#17232e', 20, 38) : null;
    const floorMat = mat(train ? '#4c6269' : st.floor ? st.floor[0] : '#606a70', { metalness: 0.24 });
    stage.add(box(17, 0.35, train ? 7 : 6, floorMat, 0, -0.18, 0));
    const edge = mat(accent, { emissive: accent, emissiveIntensity: 0.18 });
    stage.add(box(17, 0.08, 0.18, edge, 0, 0.03, 2.5));
    const wall = mat(train ? '#28445a' : st.wall ? st.wall[0] : '#28394e', { metalness: 0.2 });
    if (train || !backdropTexture) stage.add(box(17, 5.7, 0.34, wall, 0, 2.7, -3.1));
    const dark = mat('#101921', { metalness: 0.42 });
    if (train) {
      for (let x = -7.5; x <= 7.5; x += 3.75) {
        stage.add(box(0.10, 4.8, 0.12, edge, x, 2.45, 1.0));
        stage.add(box(2.75, 1.55, 0.05, dark, x + 1.85, 2.9, -2.91));
        stage.add(box(2.5, 1.3, 0.04, mat('#456680', { metalness: 0.6 }), x + 1.85, 2.95, -2.87));
      }
      stage.add(box(17, 0.18, 7, wall, 0, 5.0, 0));
      for (const x of [-5.5, 5.5]) stage.add(box(2.3, 0.7, 0.75, mat('#306a81'), x, 0.48, -1.7));
    } else if (!backdropTexture) {
      const steel = mat('#8f9da6', { metalness: 0.78, roughness: 0.28 });
      const glass = mat('#263f52', { metalness: 0.42, roughness: 0.18, emissive: '#233c51', emissiveIntensity: 0.3 });
      stage.add(box(16.4, 2.45, 0.36, steel, 0, 1.95, -2.78));
      stage.add(box(16.4, 0.32, 0.39, mat('#254c78', { metalness: 0.5 }), 0, 1.15, -2.55));
      for (let x = -7.2; x <= 7.2; x += 2.4) {
        stage.add(box(1.45, 0.92, 0.04, glass, x, 2.42, -2.54));
        stage.add(box(1.52, 0.05, 0.07, dark, x, 2.91, -2.5));
        stage.add(box(0.05, 0.94, 0.07, dark, x - 0.75, 2.42, -2.5));
        stage.add(box(0.05, 0.94, 0.07, dark, x + 0.75, 2.42, -2.5));
      }
      for (let x = -7.7; x <= 7.7; x += 4.0) {
        stage.add(box(0.55, 4.8, 0.65, wall, x, 2.4, -2.3));
        stage.add(box(0.72, 0.12, 0.8, edge, x, 4.7, -2.3));
      }
      stage.add(box(17, 0.14, 0.2, edge, 0, 4.78, -2.5));
      const board = sign(st.name || 'METRO JANG', accent);
      board.position.set(0, 3.8, -2.88); stage.add(board);
      for (const z of [-4.1, -4.7]) stage.add(box(17, 0.08, 0.1, mat('#a8aeb2', { metalness: 0.78 }), 0, -0.12, z));
    }
    if (!train && st.id) build3dStation(st);
    light.color.set(accent);
    stageKey = train ? 'train' : st.id || 'metro';
  }
  function syncFighter(model, f, g, dt) {
    if (model.def.id !== f.def.id || (!!realTemplates[modelKind(f.def)] && !model.real)) {
      scene.remove(model.root); model = makeFighter(f.def); fighters[f.side] = model;
    }
    const x = (f.x / 1280 - 0.5) * W3, y = Math.max(0, (650 - f.y) / 93);
    model.root.position.set(x, y, f.side ? -0.15 : 0.15);
    if (model.real) {
      model.root.scale.setScalar((f.def.size || 1) * 2.0);
      model.root.rotation.y = (f.face || 1) > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else model.root.scale.x = (f.def.size || 1) * (f.face || 1);
    model.body.visible = f.state !== 'gone' && !f.hidden;
    const P = f.state === 'finA' && f.finPose ? f.finPose : f.targetPose(g);
    const smooth = f.state === 'finA' ? 0.7 : 0.34;
    for (const k of ['lean','ua1','la1','ua2','la2','th1','sh1','th2','sh2','rot']) model.pose[k] = (model.pose[k] || 0) + ((P[k] || 0) - (model.pose[k] || 0)) * smooth;
    const p = model.pose;
    if (model.real) return retarget(model, f, g);
    if (false) {
      const clip = f.state === 'walk' ? 'walk' : f.state === 'win' ? 'wave' : 'idle';
      if (clip !== model.action && model.actions[clip]) {
        if (model.actions[model.action]) model.actions[model.action].fadeOut(0.18);
        model.actions[clip].reset().fadeIn(0.18).play(); model.action = clip;
      }
      model.mixer.update(1 / 60);
      const poseBone = (name, axis, value) => {
        const b = model.bones[name]; if (b) b.node.rotation[axis] += value;
      };
      poseBone('spine_01', 'z', -(p.lean || 0) * 0.24);
      poseBone('spine_03', 'z', -(p.lean || 0) * 0.17);
      poseBone('upperarm_l', 'x', -0.45 - (p.ua1 || 0) * 0.50);
      poseBone('lowerarm_l', 'x', -0.28 - Math.max(0, (p.la1 || 0) - (p.ua1 || 0)) * 0.35);
      poseBone('upperarm_r', 'x', -0.45 - (p.ua2 || 0) * 0.50);
      poseBone('lowerarm_r', 'x', -0.28 - Math.max(0, (p.la2 || 0) - (p.ua2 || 0)) * 0.35);
      poseBone('thigh_l', 'x', (p.th1 || 0) * 0.48);
      poseBone('calf_l', 'x', -((p.sh1 || 0) - (p.th1 || 0)) * 0.40);
      poseBone('thigh_r', 'x', (p.th2 || 0) * 0.48);
      poseBone('calf_r', 'x', -((p.sh2 || 0) - (p.th2 || 0)) * 0.40);
      model.body.rotation.z = (p.rot || 0) - (p.lean || 0) * 0.18;
      model.body.position.y = f.state === 'down' || f.state === 'gbot' ? -0.15 : 0;
      if (f.hp < model.lastHp - 0.1 && g.phase !== 'intro') blood(f.x, f.y, Math.min(12, Math.ceil((model.lastHp - f.hp) * 0.8)));
      model.lastHp = f.hp;
      return model;
    }
    model.body.rotation.z = (p.rot || 0) - (p.lean || 0) * 0.34;
    model.arms[0].shoulder.rotation.z = p.ua1 || 0; model.arms[0].elbow.rotation.z = (p.la1 || 0) - (p.ua1 || 0);
    model.arms[1].shoulder.rotation.z = p.ua2 || 0; model.arms[1].elbow.rotation.z = (p.la2 || 0) - (p.ua2 || 0);
    model.legs[0].thigh.rotation.z = p.th1 || 0; model.legs[0].shin.rotation.z = (p.sh1 || 0) - (p.th1 || 0);
    model.legs[1].thigh.rotation.z = p.th2 || 0; model.legs[1].shin.rotation.z = (p.sh2 || 0) - (p.th2 || 0);
    if (f.state === 'idle' || f.state === 'walk') model.body.position.y = Math.sin(g.t * (f.state === 'walk' ? 0.28 : 0.075)) * (f.state === 'walk' ? 0.045 : 0.018);
    else model.body.position.y = 0;
    model.body.scale.setScalar(f.flash > 0 ? 1.025 : 1);
    if (f.hp < model.lastHp - 0.1 && g.phase !== 'intro') blood(f.x, f.y, Math.min(12, Math.ceil((model.lastHp - f.hp) * 0.8)));
    model.lastHp = f.hp;
    return model;
  }
  // O'yin skeletidagi bo'g'imlar (2D chizish bilan aynan bir xil hisob), 3D birliklarda
  function joints2D(f) {
    const d = f.def, s = d.size || 1, P = f.pose, face = f.face || 1;
    const L = { th: 46 * s, sh: 44 * s, to: 62 * s, ua: 32 * s, fa: 30 * s, hd: 17 * s };
    const limb = (p, a, len) => [p[0] + Math.sin(a) * len * face, p[1] + Math.cos(a) * len];
    const p = { hip: [0, 0] };
    p.neck = [Math.sin(P.lean) * L.to * face, -Math.cos(P.lean) * L.to];
    p.head = [p.neck[0] + Math.sin(P.lean) * (L.hd + 4) * face, p.neck[1] - Math.cos(P.lean) * (L.hd + 4)];
    p.sh = [p.neck[0] - Math.sin(P.lean) * 7 * face, p.neck[1] + Math.cos(P.lean) * 7];
    p.el1 = limb(p.sh, P.ua1, L.ua); p.ha1 = limb(p.el1, P.la1, L.fa);
    p.el2 = limb(p.sh, P.ua2, L.ua); p.ha2 = limb(p.el2, P.la2, L.fa);
    p.kn1 = limb(p.hip, P.th1, L.th); p.ft1 = limb(p.kn1, P.sh1, L.sh);
    p.kn2 = limb(p.hip, P.th2, L.th); p.ft2 = limb(p.kn2, P.sh2, L.sh);
    const th = (P.rot || 0) * face; let maxY = -999;
    for (const k in p) { if (th) { const [a, b] = p[k], c = Math.cos(th), sn = Math.sin(th); p[k] = [a * c - b * sn, a * sn + b * c]; } if (k !== 'head') maxY = Math.max(maxY, p[k][1]); }
    maxY = Math.max(maxY, p.head[1] + L.hd - 6);
    const hx = f.x, hy = f.y - maxY - 7 - (P.lift || 0), out = {};
    for (const k in p) out[k] = new T.Vector3((hx + p[k][0]) / 80 - 8, (650 - (hy + p[k][1])) / 80, 0);
    return out;
  }
  const _q = new T.Quaternion(), _q2 = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3();
  function retarget(model, f, g) {
    // 2D bilan bir xil silliq poza
    const P = f.state === 'finA' && f.finPose ? f.finPose : f.targetPose(g), k0 = f.state === 'finA' ? 0.7 : f.poseK ? f.poseK() : 0.34;
    for (const k of ['lean', 'ua1', 'la1', 'ua2', 'la2', 'th1', 'sh1', 'th2', 'sh2', 'rot', 'lift']) {
      if (k === 'rot' && (f.state === 'thrown' || (f.curSp && f.curSp.kind === 'flip' && f.state === 'special'))) model.pose.rot = P.rot || 0;
      else model.pose[k] = (model.pose[k] || 0) + ((P[k] || 0) - (model.pose[k] || 0)) * k0;
    }
    const J = joints2D({ def: f.def, pose: model.pose, face: f.face, x: f.x, y: f.y });
    const face = f.face || 1, size = f.def.size || 1, z = f.side ? -0.25 : 0.25;
    model.root.scale.setScalar((90 * size / 80) / model.legLen);
    model.root.rotation.set(0, face > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
    model.root.position.set(0, 0, z);
    for (const k in model.rig) model.rig[k].node.quaternion.copy(model.rig[k].restQ);
    model.root.updateMatrixWorld(true);
    // tos suyagini o'yindagi son-bel nuqtasiga qo'yish
    const pw = model.pelvis.getWorldPosition(new T.Vector3());
    model.root.position.add(_v2.copy(J.hip).sub(pw)); model.root.position.z = z;
    model.root.updateMatrixWorld(true);
    // kamera tomondagi qo'l-oyoq = o'yindagi "old" (1), orqadagisi = "orqa" (2)
    const near = face > 0 ? '_r' : '_l', far = face > 0 ? '_l' : '_r';
    const chain = [['spine_01', 'hip', 'neck'], ['spine_02', 'hip', 'neck'], ['spine_03', 'hip', 'neck'], ['neck_01', 'neck', 'head'],
      ['upperarm' + near, 'sh', 'el1'], ['lowerarm' + near, 'el1', 'ha1'], ['upperarm' + far, 'sh', 'el2'], ['lowerarm' + far, 'el2', 'ha2'],
      ['thigh' + near, 'hip', 'kn1'], ['calf' + near, 'kn1', 'ft1'], ['thigh' + far, 'hip', 'kn2'], ['calf' + far, 'kn2', 'ft2']];
    for (const [bn, a, b] of chain) {
      const R = model.rig[bn]; if (!R) continue;
      const want = _v.copy(J[b]).sub(J[a]); if (want.lengthSq() < 1e-8) continue; want.normalize();
      R.node.parent.getWorldQuaternion(_q).invert(); want.applyQuaternion(_q);   // ota-ona fazosiga o'tkazish
      const restDir = _v2.copy(R.childDir).applyQuaternion(R.restQ);            // tinch holatdagi yo'nalish
      _q2.setFromUnitVectors(restDir, want); R.node.quaternion.copy(_q2.multiply(R.restQ));
      R.node.updateMatrixWorld(true);
    }
    applyClip(model, f, face);
    // zarbaga og'ir reaksiya: bosh va tana orqaga siltanadi, keyin prujina kabi qaytadi
    if (f.hp < model.lastHp - 0.1) model.jv = (model.jv || 0) + Math.min(0.9, (model.lastHp - f.hp) * 0.09);
    model.jv = ((model.jv || 0) - (model.jx || 0) * 0.22) * 0.8; model.jx = (model.jx || 0) + model.jv;
    if (Math.abs(model.jx) > 0.002) {
      _q.setFromAxisAngle(_zAxis, face * model.jx * 0.55);
      for (const [bn, w] of [['spine_02', 0.5], ['spine_03', 0.6], ['neck_01', 1]]) {
        const R = model.rig[bn]; if (!R) continue;
        const pq = R.node.parent.getWorldQuaternion(new T.Quaternion()), qw = new T.Quaternion().slerpQuaternions(new T.Quaternion(), _q, w);
        R.node.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq)); R.node.updateMatrixWorld(true);
      }
      model.root.position.x -= face * model.jx * 0.18;
    }
    // nafas olish: turganda ko'krak sekin ko'tarilib tushadi
    if (model.rig.spine_03 && (f.state === 'idle' || f.state === 'walk')) model.rig.spine_03.node.scale.setScalar(1 + Math.sin(g.t * 0.07 + f.side) * 0.012);
    else if (model.rig.spine_03) model.rig.spine_03.node.scale.setScalar(1);
    const hr = Math.max(0, f.hp / (f.maxHp || 100));
    if (model.hurtLevel === undefined || Math.abs(model.hurtLevel - hr) > 0.04) {
      model.hurtLevel = hr;
      model.body.traverse(n => { if (n.isMesh && n.material && n.material.emissive && !f.def.shadow) { n.material.emissive.setRGB((1 - hr) * 0.1, 0, 0); n.material.emissiveIntensity = 1; } });
    }
    model.body.visible = f.state !== 'gone' && !f.hidden;
    if (f.hp < model.lastHp - 0.1 && g.phase !== 'intro') { blood(f.x, f.y, Math.min(12, Math.ceil((model.lastHp - f.hp) * 0.8))); if (model.lastHp - f.hp >= 3) woundMark(model); }
    if (f.hp >= (f.maxHp || 100) - 0.01 && model.wounds && model.wounds.length) { for (const w of model.wounds) w.parent && w.parent.remove(w); model.wounds = []; }
    model.lastHp = f.hp;
    return model;
  }
  const woundM = new T.MeshPhysicalMaterial({ color: '#4a0108', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  function woundMark(model) {
    if (!model.rig || (Store.d.settings && Store.d.settings.blood === false)) return;
    model.wounds = model.wounds || []; if (model.wounds.length >= 16) return;
    const names = ['neck_01', 'spine_03', 'spine_02', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'], R = model.rig[names[Math.random() * names.length | 0]];
    if (!R) return;
    const m = new T.Mesh(sphere, woundM), r = (0.035 + Math.random() * 0.03) * R.k;
    m.scale.set(r, r * 0.5, r);
    m.position.copy(R.childDir).multiplyScalar(R.len * Math.random()).add(new T.Vector3((Math.random() - .5), 0, (Math.random() - .5)).multiplyScalar(0.12 * R.k));
    R.node.add(m); model.wounds.push(m);
  }

  // Haqiqiy (mocap) animatsiya: o'yin holatiga mos klipni tanlab, uning suyak yo'nalishlarini modelga ko'chiradi
  const SRC = { spine_01: ['DEF-spine.001', 'DEF-spine.002'], spine_02: ['DEF-spine.002', 'DEF-spine.003'], spine_03: ['DEF-spine.003', 'DEF-neck'], neck_01: ['DEF-neck', 'DEF-head'],
    upperarm_l: ['DEF-upper_arm.L', 'DEF-forearm.L'], lowerarm_l: ['DEF-forearm.L', 'DEF-hand.L'], upperarm_r: ['DEF-upper_arm.R', 'DEF-forearm.R'], lowerarm_r: ['DEF-forearm.R', 'DEF-hand.R'],
    thigh_l: ['DEF-thigh.L', 'DEF-shin.L'], calf_l: ['DEF-shin.L', 'DEF-foot.L'], thigh_r: ['DEF-thigh.R', 'DEF-shin.R'], calf_r: ['DEF-shin.R', 'DEF-foot.R'] };
  const UPPER = ['spine_01', 'spine_02', 'spine_03', 'neck_01', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r'];
  function clipFor(f) {
    if (f.state === 'attack' && f.atk) {
      const p = Math.min(1, f.af / (f.atk.start + f.atk.act + f.atk.rec));
      if (f.atkName === 'jab' || f.atkName === 'cjab') return ['Punch_Jab', p, UPPER];
      if (f.atkName === 'cross' || f.atkName === 'body') return ['Punch_Cross', p, UPPER];
    }
    if (f.state === 'hit') return [f.atkId % 2 ? 'Hit_Head' : 'Hit_Chest', Math.min(1, f.t / Math.max(8, f.stun || 15)), UPPER];
    if (f.state === 'idle') return ['Punch_Enter', 1, UPPER];
    if (f.state === 'jump') return ['Jump_Loop', (f.t % 40) / 40, null];
    return null;
  }
  function applyClip(model, f, face) {
    if (!animSrc) return;
    const c = clipFor(f); if (!c) return;
    if (!model.src) {
      const root = animSrc.scene.clone(true), mixer = new T.AnimationMixer(root), actions = {}, nodes = {};
      for (const clip of animSrc.animations) actions[clip.name] = mixer.clipAction(clip);
      root.traverse(n => { nodes[n.name] = n; });
      root.updateMatrixWorld(true);
      const ft = nodes['DEF-foot.L'], toe = nodes['DEF-toe.L'];
      const fwd = ft && toe ? Math.sign(toe.getWorldPosition(new T.Vector3()).z - ft.getWorldPosition(new T.Vector3()).z) || 1 : 1;
      model.src = { root, mixer, actions, nodes, fwd, cur: null };
    }
    const S = model.src, [name, p, bonesList] = c, act = S.actions[name]; if (!act) return;
    if (S.cur !== name) { S.mixer.stopAllAction(); act.reset(); act.play(); act.setEffectiveWeight(1); S.cur = name; }
    act.paused = true; act.time = Math.min(0.999, p) * act.getClip().duration; S.mixer.update(0);
    S.root.rotation.set(0, (face > 0 ? Math.PI / 2 : -Math.PI / 2) + (S.fwd !== model.fwd ? Math.PI : 0), 0);
    S.root.updateMatrixWorld(true);
    for (const tb of bonesList || Object.keys(SRC)) {
      const R = model.rig[tb], pair = SRC[tb]; if (!R || !pair) continue;
      const a = S.nodes[pair[0]], b = S.nodes[pair[1]]; if (!a || !b) continue;
      const want = b.getWorldPosition(_v).sub(a.getWorldPosition(_v2)); if (want.lengthSq() < 1e-10) continue; want.normalize();
      R.node.parent.getWorldQuaternion(_q).invert(); want.applyQuaternion(_q);
      const restDir = _v2.copy(R.childDir).applyQuaternion(R.restQ);
      _q2.setFromUnitVectors(restDir, want); R.node.quaternion.copy(_q2.multiply(R.restQ)); R.node.updateMatrixWorld(true);
    }
  }

  function blood(x, y, count = 8) {
    if (!scene || !active) return;
    const px = (x / 1280 - 0.5) * W3, py = 2.0 + Math.max(0, (650 - y) / 93);
    for (let i = 0; i < Math.ceil(count * 0.7) + 2; i++) {
      const mesh = new T.Mesh(dropGeo, bloodMat), s0 = 0.12 + Math.random() * 0.4;
      mesh.position.set(px, py, Math.random() * 0.4); mesh.scale.setScalar(s0);
      scene.add(mesh);
      drops.push({ mesh, s0, vx: (Math.random() - 0.5) * 0.11, vy: Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.1, life: 80 });
    }
    // qon tumani (mayda purkalish)
    for (let i = 0; i < 2; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#5a0207', transparent: true, opacity: 0.35, depthWrite: false }));
      sp.position.set(px + (Math.random() - 0.5) * 0.3, py + (Math.random() - 0.5) * 0.3, 0.6); sp.scale.setScalar(0.35 + Math.min(count, 10) * 0.03);
      scene.add(sp); bursts.push({ mesh: sp, mist: true, life: 22 });
    }
  }
  function impact(meta, x, y) {
    if (!scene || !active) return;
    const px = (x / 1280 - 0.5) * W3, py = 2.0 + Math.max(0, (650 - y) / 93);
    const color = meta.color || '#ff4545';
    const ring = new T.Mesh(new T.TorusGeometry(0.55, 0.06, 6, 24), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 }));
    ring.position.set(px, py, 1.2); scene.add(ring); bursts.push({ mesh: ring, ring: true, life: 28 });
    const n = meta.style === 'flash' || meta.style === 'shadow' ? 28 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + Math.random() * 0.3;
      const mesh = new T.Mesh(new T.OctahedronGeometry(0.06 + Math.random() * 0.1), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      mesh.position.set(px, py, Math.random() * 0.5 + 0.3); scene.add(mesh);
      bursts.push({ mesh, vx: Math.cos(a) * (meta.style === 'slam' ? 0.18 : 0.11), vy: Math.sin(a) * 0.11, life: 32 });
    }
  }
  function tickBlood() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]; d.mesh.position.x += d.vx; d.mesh.position.y += d.vy; d.mesh.position.z += d.vz; d.vy -= 0.012; d.life--;
      const sp = Math.hypot(d.vx, d.vy); d.mesh.scale.set(d.s0, d.s0 * (1 + sp * 14), d.s0); d.mesh.rotation.z = Math.atan2(d.vy, d.vx) - Math.PI / 2;
      if (d.mesh.position.y <= 0.08 || d.life <= 0) {
        if (d.mesh.position.y <= 0.08 && stains.length < 140) {
          const m = new T.Mesh(stainGeo, new T.MeshPhysicalMaterial({ color: '#3f0105', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, alphaMap: splatTex[stains.length % 3], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
          m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); m.position.set(d.mesh.position.x, 0.012 + stains.length * 0.0001, d.mesh.position.z);
          const full = 0.12 + d.s0 * 0.7 + Math.random() * 0.1; m.scale.setScalar(full * 0.3);
          stage.add(m); stains.push({ mesh: m, life: 1500, full });
        }
        scene.remove(d.mesh); drops.splice(i, 1);
      }
    }
    for (let i = stains.length - 1; i >= 0; i--) {
      const st = stains[i], sc = st.mesh.scale.x; if (sc < st.full) st.mesh.scale.setScalar(sc + (st.full - sc) * 0.08); // ko'lmak asta yoyiladi
      if (st.life < 60) st.mesh.material.opacity = st.life / 60;
      if (--st.life <= 0) { stage.remove(st.mesh); st.mesh.material.dispose(); stains.splice(i, 1); }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      if (b.mist) { b.mesh.scale.multiplyScalar(1.03); b.mesh.position.y -= 0.004; b.mesh.material.opacity = b.life / 60; if (--b.life <= 0) { scene.remove(b.mesh); b.mesh.material.dispose(); bursts.splice(i, 1); } continue; }
      b.life--;
      if (b.ring) b.mesh.scale.setScalar(1 + (28 - b.life) * 0.10);
      else { b.mesh.position.x += b.vx; b.mesh.position.y += b.vy; b.vy -= 0.003; b.mesh.rotation.z += 0.18; }
      b.mesh.material.opacity = Math.max(0, b.life / 32);
      if (b.life <= 0) { scene.remove(b.mesh); bursts.splice(i, 1); }
    }
  }
  function syncEffects(g) {
    const sync = (map, source, make, place) => {
      const live = new Set(source);
      for (const [item, mesh] of map) if (!live.has(item)) { scene.remove(mesh); map.delete(item); }
      for (const item of source) {
        let mesh = map.get(item);
        if (!mesh) { mesh = make(item); scene.add(mesh); map.set(item, mesh); }
        place(mesh, item);
      }
    };
    sync(projectiles, g.projs || [], p => {
      const color = p.kind === 'orb' ? p.color || '#9fdfff' : p.kind === 'gust' ? '#c1efff' : '#e4c594';
      const m = new T.Mesh(p.kind === 'orb' ? new T.SphereGeometry(0.30, 12, 9) : new T.TorusGeometry(0.38, 0.08, 6, 14),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      return m;
    }, (m, p) => { m.position.set((p.x / 1280 - 0.5) * W3, p.kind === 'orb' ? 2.15 : 0.38, 0.9); m.rotation.y += 0.08; });
    sync(pickups, g.items || [], it => {
      const color = it.kind === 'kastet' ? '#c9ced6' : it.kind === 'nunchaku' ? '#a7a5a0' : '#99602f';
      const m = new T.Mesh(new T.BoxGeometry(0.52, 0.13, 0.16), mat(color, { metalness: 0.45 })); m.castShadow = true; return m;
    }, (m, it) => m.position.set((it.x / 1280 - 0.5) * W3, 0.14 + Math.sin(g.t * 0.12) * 0.04, 0.9));
    sync(ringFx, g.rings || [], r => new T.Sprite(new T.SpriteMaterial({ map: softTex, color: r.color === '#fff' ? '#ffe9c8' : r.color, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false })),
      (m, r) => { m.position.set((r.x / 1280 - 0.5) * W3, 2 + (650 - r.y) / 93, 1.3); m.scale.setScalar(0.4 + (14 - r.life) * 0.06 * Math.min(2, r.r / 60)); m.material.opacity = (r.life / 14) * 0.7; });
  }
  function resize() {
    if (!renderer) return;
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    const w = Math.round(1280 * s), h = Math.round(720 * s);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    renderer.domElement.style.left = Math.round((innerWidth - w) / 2) + 'px';
    renderer.domElement.style.top = Math.round((innerHeight - h) / 2) + 'px';
  }
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Store.d.settings.quality === 0 ? 1 : 1.5));
    renderer.shadowMap.enabled = Store.d.settings.quality !== 0; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.id = 'arena3d'; renderer.domElement.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:0';
    document.getElementById('game').appendChild(renderer.domElement);
    scene = new T.Scene(); camera = new T.PerspectiveCamera(38, 1280 / 720, 0.1, 80);
    camera.position.set(0, 3.7, 14.2); camera.lookAt(0, 2.15, 0);
    scene.add(new T.HemisphereLight('#c9ddff', '#27202a', 0.7));
    try { // atrof yorug'ligi: shiftdagi iliq chiroqlar va yon tomondagi sovuq nur aks etadigan xona
      const env = new T.Scene(), room = new T.Mesh(new T.BoxGeometry(30, 12, 30), new T.MeshBasicMaterial({ color: '#1d1b1f', side: T.BackSide })); env.add(room);
      const panel = (c, w, h, x, y, z, ry, rx) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); };
      for (let i = -2; i <= 2; i++) panel('#ffe2b0', 2.2, 2.2, i * 5, 5.9, 0, 0, Math.PI / 2);
      panel('#7fa6d8', 10, 4, -14.9, 2, 0, Math.PI / 2); panel('#ffd2a0', 8, 3, 0, 2, 14.9, Math.PI);
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; if ('environmentIntensity' in scene) scene.environmentIntensity = 0.55; pm.dispose();
    } catch (e) { /* atrof yorug'liksiz ham ishlaydi */ }
    const key = new T.DirectionalLight('#fff1d7', 2.6); key.position.set(-5, 11, 7); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3; key.shadow.camera.left = -12; key.shadow.camera.right = 12;
    key.shadow.camera.top = 9; key.shadow.camera.bottom = -9; scene.add(key);
    light = new T.PointLight('#80c6ff', 16, 25); light.position.set(4, 5, 2); scene.add(light);
    const rim = new T.DirectionalLight('#9fc8ff', 1.6); rim.position.set(0, 6, -9); scene.add(rim);
    loadRealModels();
    resize(); addEventListener('resize', resize);
  } catch (e) { if (renderer) renderer.dispose(); renderer = null; }
  return {
    get ready() { return !!renderer; },
    portrait(cv, def) {
      if (!renderer) return false;
      try {
        if (!portraitRenderer) {
          portraitRenderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
          portraitRenderer.setSize(200, 230, false);
          portraitScene = new T.Scene(); portraitScene.background = new T.Color('#152238');
          portraitScene.add(new T.HemisphereLight('#fff3df', '#273149', 2.2));
          const lamp = new T.DirectionalLight('#ffffff', 2); lamp.position.set(-3, 7, 7); portraitScene.add(lamp);
          portraitCamera = new T.PerspectiveCamera(38, 200 / 230, 0.1, 30);
          portraitCamera.position.set(3.5, 3.3, 8); portraitCamera.lookAt(0, 2.0, 0);
        }
        const id = def.id + ':' + def.top + ':' + def.shorts;
        let model = portraitModels.get(id);
        if (!model) { model = makeFighter(def, portraitScene); portraitModels.set(id, model); }
        portraitScene.add(model.root);
        portraitRenderer.render(portraitScene, portraitCamera);
        const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
        c.drawImage(portraitRenderer.domElement, 0, 0, cv.width, cv.height);
        portraitScene.remove(model.root);
        return true;
      } catch (e) { return false; }
    },
    setQuality(high) { if (!renderer) return; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 1.5 : 1)); renderer.shadowMap.enabled = !!high; renderer.shadowMap.needsUpdate = true; resize(); },
    show(on) { active = !!on && !!renderer; if (renderer) renderer.domElement.style.display = active ? 'block' : 'none'; },
    blood, impact,
    update(g) {
      if (!renderer) return;
      this.show(true);
      const key = g.train ? 'train' : g.station && g.station.id;
      if (stageKey !== key) buildStage(g);
      for (const f of [g.f1, g.f2]) {
        if (!fighters[f.side]) fighters[f.side] = makeFighter(f.def);
        syncFighter(fighters[f.side], f, g);
      }
      syncEffects(g);
      if (lastFrame !== g.t) { tickBlood(); lastFrame = g.t; }
      const shake = g.phase === 'finisher' && g.phaseT > 90 && g.phaseT < 135 ? 0.1 : (g.shake || 0) * 0.004;
      // kamera jangchilarga ergashadi va masofaga qarab yaqinlashadi
      const mx = ((g.f1.x + g.f2.x) / 2) / 80 - 8, dist = Math.abs(g.f1.x - g.f2.x) / 80;
      const fin = g.phase === 'finisher' && g.phaseT > 25 && g.phaseT < 140;
      if (g.punchIn > 0) g.punchIn--;
      const tz = (fin ? 6.2 : Math.max(7.4, Math.min(11.5, 5.6 + dist * 0.9))) - (g.punchIn > 0 ? 1.4 : 0) - (g.xray ? 2.5 : 0), tx = Math.max(-4.2, Math.min(4.2, fin && g.finLoser ? g.finLoser.x / 80 - 8 : mx));
      camX += (tx - camX) * 0.08; camZ += (tz - camZ) * (g.punchIn > 0 || g.xray ? 0.25 : 0.06);
      camera.position.set(camX + (Math.random() - 0.5) * shake + (fin ? Math.sin(g.phaseT * 0.02) * 1.5 : 0), 2.3 + camZ * 0.08, camZ);
      camera.lookAt(camX, 1.35, 0);
      renderer.render(scene, camera);
    },
  };
})();
