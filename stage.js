// Metro Jang — bekatlar va harakatdagi poyezd sahnalari (hammasi kodda chiziladi).
'use strict';

const W = 1280, H = 720, GROUND = 650;

const STATIONS = [
  { id: 'chorsu', name: 'CHORSU', wall: ['#e8dcc4', '#bba783'], tile: '#d9c9a8', col: ['#2f6fb0', '#1c4a7a'],
    floor: ['#7a6a52', '#3e3428'], lamp: '#ffe7a8', deco: 'dome', chand: 'tier', accent: '#2f6fb0',
    minX: 170, maxX: 1110, barrier: 'crates', desc: "Bozor yashiklari platformani toraytirgan" },
  { id: 'mingorik', name: "MING O'RIK", wall: ['#fbe6cf', '#e0b98f'], tile: '#f0d3b2', col: ['#f6e7d4', '#cfa77c'],
    floor: ['#8a6a4a', '#4a3524'], lamp: '#fff2dc', deco: 'apricot', chand: 'globe', accent: '#e07a1a',
    minX: 80, maxX: 1200, wet: [300, 520], desc: "Keng platforma, chap tomonda ho'l pol" },
  { id: 'yunus', name: 'YUNUSOBOD', wall: ['#c9ccd1', '#8d9299'], tile: '#b4b8be', col: ['#9aa0a8', '#5d636b'],
    floor: ['#5a5d63', '#2c2e32'], lamp: '#fff8e0', deco: 'construction', chand: 'ring', accent: '#f2c200',
    minX: 240, maxX: 1040, barrier: 'repair', dim: 0.1, desc: "Qurilish: tor platforma, to'siqlarga urilish xavfli" },
  { id: 'depo', name: 'DEPO', wall: ['#3a3f47', '#1d2025'], tile: '#4a5059', col: ['#5a6068', '#2a2e33'],
    floor: ['#3a3a3a', '#181818'], lamp: '#ffd27a', deco: 'depot', chand: 'ring', accent: '#d62828',
    minX: 60, maxX: 1220, dim: 0.18, wind: true, desc: "Poyezdlar deposi: juda keng, manyovr qiluvchi vagonlar shamol hosil qiladi" },
  { id: 'kosmo', name: 'KOSMONAVTLAR', wall: ['#16305e', '#0d1d3d'], tile: '#24477f', col: ['#1b3f7a', '#3f74c4'],
    floor: ['#2b2d38', '#15161d'], lamp: '#bfe1ff', deco: 'medallion', chand: 'ring', accent: '#7fc4ff',
    minX: 70, maxX: 1210, dim: 0.3, flicker: true, desc: 'Keng platforma, xira va miltillovchi chiroqlar' },
  { id: 'navoiy', name: 'ALISHER NAVOIY', wall: ['#efe3c8', '#cdb994'], tile: '#e2d3b2', col: ['#f4ecdc', '#c9b892'],
    floor: ['#8a7a63', '#4e4335'], lamp: '#ffe7a8', deco: 'arch', chand: 'tier', accent: '#1f5fa8',
    minX: 250, maxX: 1030, barrier: 'marble', desc: "Tor platforma: marmar to'siqqa urilish og'riqli" },
  { id: 'paxta', name: 'PAXTAKOR', wall: ['#e9efe7', '#b8c7b3'], tile: '#d3dfcf', col: ['#ddd2bd', '#a69a83'],
    floor: ['#5e6b5a', '#2e362c'], lamp: '#fff6dc', deco: 'cotton', chand: 'cotton', accent: '#2f7d3a',
    minX: 150, maxX: 1130, wet: [500, 780], desc: "O'rtada ho'l pol: sirpanib ketish oson" },
  { id: 'mustaq', name: 'MUSTAQILLIK MAYDONI', wall: ['#f6f3ee', '#cfc7bb'], tile: '#e7e1d6', col: ['#ffffff', '#c7bfb1'],
    floor: ['#6f655a', '#352f29'], lamp: '#fff2c4', deco: 'gold', chand: 'crystal', accent: '#c79a2c',
    minX: 90, maxX: 1190, wind: true, desc: "Poyezdlar tez-tez o'tadi: shamol jangchilarni suradi" },
  { id: 'bodom', name: 'BODOMZOR', wall: ['#f3dbe0', '#c9a1ab'], tile: '#e8c7cf', col: ['#b9737f', '#7d4450'],
    floor: ['#6a4b52', '#33242a'], lamp: '#fff0f3', deco: 'blossom', chand: 'globe', accent: '#b03a5b',
    minX: 190, maxX: 1090, barrier: 'repair', dim: 0.12, desc: "Ta'mirlash to'siqlari platformani toraytirgan" },
];

// Hikoyaning so'nggi bekati: hech qachon ochilmagan, tashlab ketilgan bekat
const GHOST = { id: 'arvoh', name: 'ARVOH BEKAT', wall: ['#2a2238', '#0c0912'], tile: '#3a2f4c', col: ['#3a3348', '#15111d'],
  floor: ['#241d2e', '#0b0910'], lamp: '#d7a6ff', deco: 'ghost', chand: 'broken', accent: '#5b2a86',
  minX: 110, maxX: 1170, dim: 0.22, flicker: true, fog: true, desc: "Hech qachon ochilmagan bekat. Bu yerda soyalar yashaydi" };

function grad(ctx, y0, y1, a, b) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}

function drawStation(ctx, st, t, bgTrain, wallOnly) {
  // shift
  ctx.fillStyle = grad(ctx, 0, 130, '#111', st.wall[1]);
  ctx.fillRect(0, 0, W, 130);
  // gumbazsimon shift qovurg'alari
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3;
  for (let x = -40; x < W + 80; x += 130) {
    ctx.beginPath(); ctx.moveTo(x, 130); ctx.quadraticCurveTo(x + 65, 40, x + 130, 130); ctx.stroke();
  }
  // orqa devor
  ctx.fillStyle = grad(ctx, 130, 410, st.wall[0], st.wall[1]);
  ctx.fillRect(0, 130, W, 280);
  // kafel
  ctx.strokeStyle = st.tile; ctx.lineWidth = 1;
  for (let y = 140; y < 410; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let y = 140, r = 0; y < 410; y += 22, r++) {
    for (let x = (r % 2) * 22; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 22); ctx.stroke(); }
  }
  drawDeco(ctx, st, t);
  // bekat nomi taxtasi
  const sw = Math.max(380, st.name.length * 26 + 80);
  const sx = W / 2 - sw / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx + 6, 176, sw, 74);
  ctx.fillStyle = st.accent; ctx.fillRect(sx, 170, sw, 74);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(sx + 5, 175, sw - 10, 64);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif'; ctx.fillText(st.name, W / 2, 200);
  ctx.font = '15px "Trebuchet MS", sans-serif'; ctx.fillText('bekati', W / 2, 228);
  // M belgisi
  ctx.beginPath(); ctx.arc(sx - 40, 207, 26, 0, Math.PI * 2); ctx.fillStyle = '#d42a2a'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('M', sx - 40, 209);

  if (wallOnly) { // 3D rejim: devor + yo'l chuquri; ustun va qandillar 3D'da quriladi
    ctx.fillStyle = '#0b0b0e'; ctx.fillRect(0, 410, W, H - 410);
    ctx.fillStyle = '#3b3b40'; ctx.fillRect(0, 440, W, 4); ctx.fillRect(0, 456, W, 4);
    return;
  }
  // yo'l (relslar) chuquri
  ctx.fillStyle = '#0b0b0e'; ctx.fillRect(0, 410, W, 58);
  ctx.fillStyle = '#3b3b40';
  ctx.fillRect(0, 440, W, 4); ctx.fillRect(0, 456, W, 4);
  ctx.fillStyle = '#1d1d22';
  for (let x = (t * 0) % 40; x < W; x += 40) ctx.fillRect(x, 445, 18, 16);
  if (bgTrain) drawPassingTrain(ctx, bgTrain, st);
  // platforma chekkasi
  ctx.fillStyle = '#d8b400'; ctx.fillRect(0, 466, W, 8);
  ctx.fillStyle = '#9a8000'; ctx.fillRect(0, 474, W, 3);
  // pol (perspektiva bilan)
  ctx.fillStyle = grad(ctx, 477, H, st.floor[0], st.floor[1]);
  ctx.fillRect(0, 477, W, H - 477);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath(); ctx.moveTo(W / 2 + i * 60, 477); ctx.lineTo(W / 2 + i * 150, H); ctx.stroke();
  }
  for (let y = 490, s = 12; y < H; y += s, s *= 1.25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // ustunlar
  for (const cx of [110, 350, 930, 1170]) drawColumn(ctx, st, cx);
  // qandillar
  for (let i = 0; i < 4; i++) drawChandelier(ctx, st, 250 + i * 260, t);
  drawProps(ctx, st, t);
  // polda yorug'lik aksi
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(250 + i * 260, 600, 110, 22, 0, 0, Math.PI * 2); ctx.fill(); }
}

function drawDeco(ctx, st, t) {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x = 90 + i * 220; if (Math.abs(x - W / 2) < 230) continue;
    const y = 300;
    if (st.deco === 'medallion') {
      ctx.fillStyle = '#0a1630'; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7fc4ff'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#d9ecff';
      star(ctx, x, y, 5, 22, 9); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 26, y - 20, 4, 0, Math.PI * 2); ctx.fill();
    } else if (st.deco === 'arch') {
      ctx.fillStyle = '#1f5fa8';
      ctx.beginPath(); ctx.moveTo(x - 46, 390); ctx.lineTo(x - 46, 290);
      ctx.quadraticCurveTo(x - 46, 240, x, 225); ctx.quadraticCurveTo(x + 46, 240, x + 46, 290);
      ctx.lineTo(x + 46, 390); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7d77a';
      ctx.beginPath(); ctx.moveTo(x - 32, 390); ctx.lineTo(x - 32, 295);
      ctx.quadraticCurveTo(x - 32, 258, x, 246); ctx.quadraticCurveTo(x + 32, 258, x + 32, 295);
      ctx.lineTo(x + 32, 390); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f5fa8'; star(ctx, x, 300, 8, 14, 7); ctx.fill();
    } else if (st.deco === 'cotton') {
      ctx.fillStyle = '#2f7d3a'; ctx.fillRect(x - 50, 260, 100, 110);
      ctx.fillStyle = '#fff';
      for (const [a, b] of [[-20, -18], [18, -10], [-5, 14], [24, 26], [-26, 30]]) {
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + a + Math.cos(k * 1.3) * 7, 315 + b + Math.sin(k * 1.3) * 7, 7, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (st.deco === 'gold') {
      ctx.strokeStyle = '#c79a2c'; ctx.lineWidth = 5;
      ctx.strokeRect(x - 50, 260, 100, 120);
      ctx.beginPath(); ctx.moveTo(x - 50, 320); ctx.lineTo(x, 270); ctx.lineTo(x + 50, 320); ctx.lineTo(x, 370); ctx.closePath(); ctx.stroke();
    } else if (st.deco === 'dome') {
      ctx.fillStyle = '#2f6fb0'; ctx.beginPath(); ctx.arc(x, 330, 46, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 46, 330, 92, 50);
      ctx.fillStyle = '#7fc4ff'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x - 30 + k * 12, 300 + Math.abs(k - 2.5) * 6, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 330, 46, Math.PI, 0); ctx.stroke();
    } else if (st.deco === 'apricot') {
      ctx.strokeStyle = '#6b3a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 395); ctx.lineTo(x, 300); ctx.lineTo(x - 30, 270); ctx.moveTo(x, 320); ctx.lineTo(x + 34, 280); ctx.stroke();
      ctx.fillStyle = '#2f7d3a'; for (const [a2, b2] of [[-30, 268], [34, 278], [0, 296], [-12, 280], [18, 262]]) { ctx.beginPath(); ctx.ellipse(x + a2, b2, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f2992e'; for (const [a2, b2] of [[-24, 274], [30, 284], [6, 300], [14, 266]]) { ctx.beginPath(); ctx.arc(x + a2, b2, 5, 0, Math.PI * 2); ctx.fill(); }
    } else if (st.deco === 'construction') {
      ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 50, 260 + k * 45); ctx.lineTo(x + 50, 260 + k * 45); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - 50, 250); ctx.lineTo(x - 50, 395); ctx.moveTo(x + 50, 250); ctx.lineTo(x + 50, 395); ctx.moveTo(x - 50, 260); ctx.lineTo(x + 50, 350); ctx.stroke();
    } else if (st.deco === 'depot') {
      ctx.fillStyle = '#5a1e1e'; ctx.fillRect(x - 70, 270, 140, 110); ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 55, 285, 40, 30); ctx.fillRect(x + 15, 285, 40, 30);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 70, 370, 140, 10);
    } else if (st.deco === 'ghost') {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 40, 250); ctx.lineTo(x - 10, 300); ctx.lineTo(x - 30, 340); ctx.lineTo(x + 5, 390); ctx.stroke();
      ctx.fillStyle = 'rgba(180,107,255,' + (0.35 + Math.sin(t * 0.04 + i) * 0.2) + ')';
      ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.fillText(['ᛟ', '✶', '☾', '◈', '✷', '☽'][i], x + 20, 320);
    } else if (st.deco === 'blossom') {
      ctx.strokeStyle = '#6b3a2a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 50, 390); ctx.quadraticCurveTo(x, 330, x + 40, 260); ctx.stroke();
      for (let k = 0; k < 6; k++) flower(ctx, x - 30 + k * 14, 360 - k * 18 + (k % 2) * 12, 8);
    }
  }
  ctx.restore();
}

function star(ctx, x, y, n, r1, r2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = (i * Math.PI) / n - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function flower(ctx, x, y, r) {
  ctx.fillStyle = '#fff4f7';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.2566;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#e05d84'; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
}

function drawColumn(ctx, st, x) {
  const top = 120, bot = 520, w = 46;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - w / 2 + 8, top, w, bot - top);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, st.col[1]); g.addColorStop(0.45, st.col[0]); g.addColorStop(1, st.col[1]);
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, bot - top);
  // kapitel va asos
  ctx.fillStyle = st.accent;
  ctx.fillRect(x - w / 2 - 10, top, w + 20, 16);
  ctx.fillRect(x - w / 2 - 8, bot - 14, w + 16, 14);
  if (st.chand === 'ring') { // Kosmonavtlar: yorug' halqalar
    ctx.fillStyle = 'rgba(127,196,255,0.6)';
    for (let y = 170; y < 500; y += 70) ctx.fillRect(x - w / 2, y, w, 6);
  }
  if (st.deco === 'arch') {
    ctx.fillStyle = '#1f5fa8';
    for (let y = 150; y < 200; y += 12) ctx.fillRect(x - w / 2, y, w, 5);
  }
}

function drawChandelier(ctx, st, x, t) {
  const sway = Math.sin(t * 0.02 + x) * 1.5;
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sway, 60); ctx.stroke();
  const cx = x + sway, cy = 80;
  // nur
  const lg = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120);
  lg.addColorStop(0, 'rgba(255,240,200,0.35)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = st.lamp;
  if (st.chand === 'ring') {
    ctx.strokeStyle = st.lamp; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, cy, 40, 10, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i) * 40, cy + Math.sin(i) * 10, 5, 0, Math.PI * 2); ctx.fill(); }
  } else if (st.chand === 'tier') {
    ctx.fillStyle = '#c79a2c';
    ctx.fillRect(cx - 34, cy - 4, 68, 6); ctx.fillRect(cx - 22, cy + 16, 44, 5);
    ctx.fillStyle = st.lamp;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx + i * 11, cy - 10, 5, 0, Math.PI * 2); ctx.fill(); }
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx + i * 10, cy + 12, 4, 0, Math.PI * 2); ctx.fill(); }
  } else if (st.chand === 'cotton') {
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 0.9) * 18, cy + Math.sin(i * 0.9) * 12, 9, 0, Math.PI * 2); ctx.fill(); }
  } else if (st.chand === 'crystal') {
    for (let r = 0; r < 3; r++) for (let i = -3 + r; i <= 3 - r; i++) {
      const px = cx + i * 10, py = cy - 10 + r * 16;
      ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 8); ctx.lineTo(px - 5, py); ctx.closePath();
      ctx.fillStyle = (Math.floor(t / 8) + i + r) % 3 ? '#fffdf2' : '#bfe8ff'; ctx.fill();
    }
  } else if (st.chand === 'broken') {
    const on = (Math.floor(t / 6) + x) % 9 !== 0;
    ctx.fillStyle = on ? st.lamp : '#333';
    ctx.beginPath(); ctx.arc(cx + 8, cy + 18, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx + 8, cy + 10); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b03a5b'; ctx.lineWidth = 2; ctx.stroke();
  }
}

// Orqadagi yo'ldan o'tib ketuvchi poyezd
function drawPassingTrain(ctx, tr) {
  const len = 1400;
  for (let k = 0; k < 3; k++) {
    const x = tr.x + k * (len / 3) * tr.dir * -1;
    ctx.fillStyle = '#3d6b9e'; ctx.fillRect(x, 330, len / 3 - 10, 120);
    ctx.fillStyle = '#d7e4f2'; ctx.fillRect(x, 400, len / 3 - 10, 10);
    ctx.fillStyle = '#ffeaa0';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 20 + i * 88, 345, 60, 40);
  }
}

// Harakatdagi poyezd vagoni ichi
function drawTrain(ctx, t) {
  // tashqi tunnel (derazalar orqasida ko'rinadi)
  ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H);
  // vagon devori
  ctx.fillStyle = grad(ctx, 0, 520, '#c9d3d8', '#8e9ba3');
  ctx.fillRect(0, 60, W, 460);
  // derazalar
  for (let i = 0; i < 4; i++) {
    const wx = 70 + i * 300, wy = 150, ww = 230, wh = 170;
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.fillStyle = '#07080b'; ctx.fillRect(wx, wy, ww, wh);
    // tunnel kabellari
    ctx.strokeStyle = '#1b1e24'; ctx.lineWidth = 3;
    for (let c = 0; c < 3; c++) { ctx.beginPath(); ctx.moveTo(wx, wy + 40 + c * 14); ctx.lineTo(wx + ww, wy + 40 + c * 14); ctx.stroke(); }
    // tez o'tuvchi chiroqlar
    const sp = 38, gap = 520;
    for (let k = -1; k < 3; k++) {
      const lx = ((-(t * sp) % gap) + gap) % gap + k * gap - (i * 300);
      const px = ((lx % 1200) + 1200) % 1200 - 200 + wx;
      ctx.fillStyle = 'rgba(255,214,140,0.9)';
      ctx.fillRect(px, wy + 30, 160, 5);
      ctx.fillStyle = 'rgba(255,214,140,0.25)';
      ctx.fillRect(px - 40, wy + 20, 240, 25);
    }
    ctx.restore();
    ctx.strokeStyle = '#59646b'; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(wx + 20, wy); ctx.lineTo(wx + 70, wy); ctx.lineTo(wx + 10, wy + wh); ctx.lineTo(wx - 40, wy + wh); ctx.fill();
  }
  // shift va lampalar
  ctx.fillStyle = '#e9eef0'; ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = '#fffbe6';
  for (let i = 0; i < 5; i++) ctx.fillRect(60 + i * 270, 22, 180, 14);
  // yuqori tutqich va osilib turgan halqalar
  ctx.strokeStyle = '#b8c0c6'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(W, 100); ctx.stroke();
  const swing = Math.sin(t * 0.05) * 0.18;
  for (let i = 0; i < 14; i++) {
    const hx = 40 + i * 92;
    ctx.save(); ctx.translate(hx, 100); ctx.rotate(swing + Math.sin(i) * 0.03);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.stroke();
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 40, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // o'rindiqlar
  ctx.fillStyle = '#6b2f2f'; ctx.fillRect(0, 410, W, 60);
  ctx.fillStyle = '#8a3c3c'; ctx.fillRect(0, 405, W, 14);
  ctx.fillStyle = '#3d4246'; ctx.fillRect(0, 470, W, 22);
  // eshiklar va "eshikka suyanmang" yozuvi
  for (const dx of [20, 1170]) {
    ctx.fillStyle = '#a7b2b8'; ctx.fillRect(dx, 110, 90, 380);
    ctx.strokeStyle = '#59646b'; ctx.lineWidth = 3; ctx.strokeRect(dx, 110, 90, 380);
    ctx.beginPath(); ctx.moveTo(dx + 45, 110); ctx.lineTo(dx + 45, 490); ctx.stroke();
    ctx.fillStyle = '#07080b'; ctx.fillRect(dx + 10, 160, 28, 120); ctx.fillRect(dx + 52, 160, 28, 120);
  }
  ctx.fillStyle = '#d42a2a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ESHIKKA SUYANMANG', 65, 310); ctx.fillText('ESHIKKA SUYANMANG', 1215, 310);
  // marshrut chizig'i
  ctx.fillStyle = '#1f3a5c'; ctx.fillRect(400, 115, 480, 26);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('CHILONZOR  •  BODOMZOR  •  KOSMONAVTLAR  •  PAXTAKOR', 640, 133);
  // pol
  ctx.fillStyle = grad(ctx, 492, H, '#55595c', '#2a2c2e'); ctx.fillRect(0, 492, W, H - 492);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 492); ctx.lineTo(x - 80, H); ctx.stroke(); }
  // vertikal tutqichlar (oldinda, lekin jangchilarga xalaqit bermaydi)
  ctx.strokeStyle = '#d0d6da'; ctx.lineWidth = 7;
  for (const px of [180, 1100]) { ctx.beginPath(); ctx.moveTo(px, 100); ctx.lineTo(px, 520); ctx.stroke(); }
}

// Bekatning jangga ta'sir qiluvchi narsalari: to'siqlar va ho'l pol
function drawProps(ctx, st, t) {
  if (st.barrier) {
    for (const [x0, x1] of [[0, st.minX - 28], [st.maxX + 28, W]]) {
      if (st.barrier === 'marble') {
        ctx.fillStyle = grad(ctx, 470, 660, '#f4ecdc', '#b9a988'); ctx.fillRect(x0, 500, x1 - x0, 170);
        ctx.fillStyle = '#1f5fa8'; ctx.fillRect(x0, 500, x1 - x0, 14);
        ctx.strokeStyle = 'rgba(120,100,70,0.5)'; ctx.lineWidth = 2;
        for (let x = x0 + 20; x < x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, 520); ctx.lineTo(x, 665); ctx.stroke(); }
      } else if (st.barrier === 'crates') {
        for (let x = x0; x < x1 - 10; x += 60) for (let k = 0; k < 2; k++) {
          ctx.fillStyle = k ? '#9a6b3a' : '#7d5228'; ctx.fillRect(x + 4, 600 - k * 56, 54, 54);
          ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, 600 - k * 56, 54, 54);
          ctx.beginPath(); ctx.moveTo(x + 4, 600 - k * 56); ctx.lineTo(x + 58, 654 - k * 56); ctx.stroke();
        }
      } else {
        for (let x = x0; x < x1; x += 70) {
          ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(x + 35, 590); ctx.lineTo(x + 55, 660); ctx.lineTo(x + 15, 660); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(x + 25, 620, 20, 8);
        }
        ctx.save(); ctx.beginPath(); ctx.rect(x0, 540, x1 - x0, 34); ctx.clip();
        for (let x = x0 - 40; x < x1; x += 40) { ctx.fillStyle = (x / 40) % 2 ? '#d62828' : '#fff'; ctx.beginPath(); ctx.moveTo(x, 574); ctx.lineTo(x + 20, 540); ctx.lineTo(x + 40, 540); ctx.lineTo(x + 20, 574); ctx.fill(); }
        ctx.restore();
      }
    }
  }
  if (st.wet) {
    const [a, b] = st.wet;
    ctx.fillStyle = 'rgba(150,210,255,0.22)';
    ctx.beginPath(); ctx.ellipse((a + b) / 2, 655, (b - a) / 2, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,255,' + (0.25 + Math.sin(t * 0.05) * 0.1) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse((a + b) / 2 - 40, 652, 60, 8, 0, 0, Math.PI * 2); ctx.stroke();
    // ogohlantirish belgisi
    const sx = b + 70;
    ctx.fillStyle = '#f2c200'; ctx.beginPath(); ctx.moveTo(sx - 26, 600); ctx.lineTo(sx, 520); ctx.lineTo(sx + 26, 600); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("POL", sx, 572); ctx.fillText("HO'L!", sx, 586);
  }
}
