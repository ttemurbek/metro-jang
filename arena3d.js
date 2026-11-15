// Metro Jang 3D: WebGL arena and articulated, volumetric fighters.
// The existing fight simulation remains authoritative; this module only renders it.
'use strict';

const Arena3D = (() => {
  if (!window.THREE) return { ready: false, show() {}, update() {}, blood() {} };
  const T = THREE, W3 = 16, fighters = [null, null], drops = [], stains = [], bursts = [];
  const projectiles = new Map(), pickups = new Map(), ringFx = new Map();
  let camX = 0, camZ = 11;
  let renderer, scene, camera, stage, stageKey = '', active = false, lastFrame = -1, light, backdropTexture = null;
  let portraitRenderer, portraitScene, portraitCamera;
  const portraitModels = new Map();
  const realTemplates = Object.create(null);
  const modelKind = def => def.top ? 'suited' : 'man';
  function loadRealModels() {
    if (!window.MetroGLTF || !window.MetroModelData) return;
    const loader = new MetroGLTF.GLTFLoader();
    for (const kind of ['man', 'suited']) {
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
  }
  // Har jangchining kiyimi: suyaklarga biriktirilgan shim, ko'ylak/kurtka, kamar, qo'lqop, soch, poyabzal
  function dress(rig, nodeOf, def) {
    const dark = !!def.shadow, M = c => mat(dark ? '#0d0b14' : c, { roughness: 0.85 });
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
    const shortsM = M(def.shorts || '#222833'), topM = def.top ? M(def.top) : null, trimM = M(def.trim || '#bda674'), gloveM = mat(dark ? '#1a0f2a' : def.gloves || '#2a2a2a', { roughness: 0.35 });
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
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of materials) {
          if (m.color) m.color.set(def.shadow ? '#1a1626' : new T.Color(def.skin || '#c08a60').lerp(new T.Color('#ffffff'), 0.35));
          if (def.shadow && m.emissive) { m.emissive.set('#2a0f45'); m.emissiveIntensity = 0.6; }
          m.side = T.DoubleSide;
        }
      }
    });
    // Suyaklarni o'yin skeletiga yo'nalish bo'yicha moslash uchun tinch holat ma'lumotlari
    root.scale.setScalar(1); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);
    const nodeOf = n => bones[n] && bones[n].node, wp = n => nodeOf(n).getWorldPosition(new T.Vector3());
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
    dress(rig, nodeOf, def);
    return { root, body, bones, rig, legLen, pelvis, real: Object.keys(rig).length >= 10,
      def, lastHp: 100 * (def.hpMul || 1), pose: {}, motion: 0 };
  }
  const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.67, metalness: 0.08, ...extra });
  const black = mat('#111218'), white = mat('#e7e8dd'), bloodMat = new T.MeshStandardMaterial({ color: '#8e0611', roughness: 0.34 });
  const sphere = new T.SphereGeometry(1, 12, 9), dropGeo = new T.SphereGeometry(0.055, 6, 5);
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
  function buildStage(g) {
    clearStage();
    const train = g.train, st = g.station || {}, accent = train ? '#48b5d7' : st.accent || '#a8cfff';
    // fon: o'yinning o'zida kodda chizilgan bekat (har bekatning o'z ko'rinishi), surat ishlatilmaydi
    backdropTexture = null;
    if (!train && st.id) {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
      drawStation(c.getContext('2d'), st, 0, null);
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
    const P = f.state === 'finA' && f.finPose ? f.finPose : f.targetPose(g), k0 = f.state === 'finA' ? 0.7 : 0.34;
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
    model.body.visible = f.state !== 'gone' && !f.hidden;
    if (f.hp < model.lastHp - 0.1 && g.phase !== 'intro') blood(f.x, f.y, Math.min(12, Math.ceil((model.lastHp - f.hp) * 0.8)));
    model.lastHp = f.hp;
    return model;
  }

  function blood(x, y, count = 8) {
    if (!scene || !active) return;
    const px = (x / 1280 - 0.5) * W3, py = 2.0 + Math.max(0, (650 - y) / 93);
    for (let i = 0; i < count; i++) {
      const mesh = new T.Mesh(dropGeo, bloodMat);
      mesh.position.set(px, py, Math.random() * 0.4); mesh.scale.setScalar(0.6 + Math.random() * 1.4);
      scene.add(mesh);
      drops.push({ mesh, vx: (Math.random() - 0.5) * 0.15, vy: Math.random() * 0.17, vz: (Math.random() - 0.5) * 0.1, life: 75 });
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
      if (d.mesh.position.y <= 0.08 || d.life <= 0) {
        if (d.mesh.position.y <= 0.08 && stains.length < 70) {
          const m = new T.Mesh(new T.CircleGeometry(0.05 + Math.random() * 0.08, 9), bloodMat);
          m.rotation.x = -Math.PI / 2; m.position.set(d.mesh.position.x, 0.015, d.mesh.position.z);
          stage.add(m); stains.push({ mesh: m, life: 600 });
        }
        scene.remove(d.mesh); drops.splice(i, 1);
      }
    }
    for (let i = stains.length - 1; i >= 0; i--) if (--stains[i].life <= 0) { stage.remove(stains[i].mesh); stains.splice(i, 1); }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life--;
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
    sync(ringFx, g.rings || [], r => new T.Mesh(new T.TorusGeometry(0.55, 0.045, 6, 24),
      new T.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.8 })),
      (m, r) => { m.position.set((r.x / 1280 - 0.5) * W3, 2 + (650 - r.y) / 93, 1.3); m.scale.setScalar(Math.max(0.2, (14 - r.life) / 7)); m.material.opacity = r.life / 14; });
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
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.id = 'arena3d'; renderer.domElement.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:0';
    document.getElementById('game').appendChild(renderer.domElement);
    scene = new T.Scene(); camera = new T.PerspectiveCamera(38, 1280 / 720, 0.1, 80);
    camera.position.set(0, 3.7, 14.2); camera.lookAt(0, 2.15, 0);
    scene.add(new T.HemisphereLight('#c9ddff', '#27202a', 2.0));
    const key = new T.DirectionalLight('#fff1d7', 2.4); key.position.set(-5, 11, 7); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -12; key.shadow.camera.right = 12;
    key.shadow.camera.top = 9; key.shadow.camera.bottom = -9; scene.add(key);
    light = new T.PointLight('#80c6ff', 16, 25); light.position.set(4, 5, 2); scene.add(light);
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
      const tz = fin ? 6.2 : Math.max(7.4, Math.min(11.5, 5.6 + dist * 0.9)), tx = Math.max(-4.2, Math.min(4.2, fin && g.finLoser ? g.finLoser.x / 80 - 8 : mx));
      camX += (tx - camX) * 0.08; camZ += (tz - camZ) * 0.06;
      camera.position.set(camX + (Math.random() - 0.5) * shake + (fin ? Math.sin(g.phaseT * 0.02) * 1.5 : 0), 2.3 + camZ * 0.08, camZ);
      camera.lookAt(camX, 1.35, 0);
      renderer.render(scene, camera);
    },
  };
})();
