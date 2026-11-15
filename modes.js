// Metro Jang — qo'shimcha rejimlar: Minora, Kunlik sinov, 2v2 juftlik, Ruh boti, Do'kon (tangalar va kiyim ranglari).
'use strict';

// ---------- Kiyim ranglari (rang aylantirish) ----------
function hueShift(hex, deg) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  h = (h + deg / 360) % 1; if (s < 0.12) { s = 0.55; }
  const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const to = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + to(f(p, q, h + 1 / 3)) + to(f(p, q, h)) + to(f(p, q, h - 1 / 3));
}
const SKINS = [{ name: 'Asl', deg: 0 }, { name: 'Tungi', deg: 150 }, { name: 'Oltin', deg: 60 }, { name: 'Zumrad', deg: 230 }];
const SKIN_COST = 40;

const Modes = {
  skinned(def) {
    const k = (Store.d.skin || {})[def.id] || 0;
    if (!k) return def;
    const d = Object.assign({}, def), deg = SKINS[k].deg;
    for (const key of ['top', 'shorts', 'gloves', 'trim', 'bandana', 'capColor']) if (d[key]) d[key] = hueShift(d[key], deg);
    return d;
  },
  coins(n, why) { Store.d.coins = (Store.d.coins || 0) + n; Store.save(); if (why) Game.say(`+${n} tanga — ${why}`, W / 2, 140, '#ffde59', 22); },

  // ---------- Rejimlar menyusi ----------
  menu() {
    const dd = Modes.daily(), done = Store.d.dailyDone === dd.date;
    screen(`<h1>Boshqa rejimlar</h1>
      <div class="menu">
        <button class="btn" data-act="tower" autofocus>Minora — 10 qavat <small>(eng yaxshisi: ${Store.d.bestTower || 0})</small></button>
        <button class="btn" data-act="daily">Kunlik sinov <small>— ${done ? 'bajarildi ✓' : dd.rule.text + ' (+50 tanga)'}</small></button>
        <button class="btn" data-act="tagMenu">Juftlik jangi — 2 ga 2</button>
        <button class="btn" data-act="ghost">Ruh jangi <small>— o'z uslubingizdagi botga qarshi</small></button>
        <button class="btn" data-act="tourney">Turnir — 4 yoki 8 kishi</button>
        <button class="btn" data-act="online">Onlayn — do'st bilan</button>
        <button class="btn" data-act="replays">Takroriy ko'rish</button>
        <button class="btn small" data-act="menu" data-back>Orqaga</button>
      </div>`);
  },

  // ---------- Minora ----------
  towerStart(pick) {
    App.mode = 'tower'; App.p1 = pick;
    App.tower = { floor: 0, hp: null, foes: shuffle(roster().map(f => fIdx(f.id)).filter(i => i !== pick)).concat(shuffle(roster().map(f => fIdx(f.id)))).slice(0, 10) };
    App.p2 = App.tower.foes[0]; versus();
  },
  // ---------- Kunlik sinov ----------
  RULES: [
    { id: 'kicks', text: 'Faqat tepish bilan yuting', ban: ['punch', 'heavy'] },
    { id: 'noblock', text: 'Bloksiz yuting', ban: ['block'] },
    { id: 'half', text: 'Yarim jon bilan yuting', startHp: 0.5 },
    { id: 'fast', text: '30 soniyali raundlarda yuting', roundTime: 30 },
    { id: 'nospecial', text: 'Maxsus usullarsiz yuting', ban: ['special'] },
    { id: 'grap', text: 'Kurashchi: ushlashsiz yuting', ban: ['grab'] },
  ],
  daily() {
    const d = new Date(), date = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    let h = 0; for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const ros = FIGHTERS.filter(f => !f.boss);
    return { date, rule: this.RULES[h % this.RULES.length], p1: fIdx(ros[h % ros.length].id), p2: fIdx(ros[(h >> 4) % ros.length].id === ros[h % ros.length].id ? ros[(h % ros.length + 1) % ros.length].id : ros[(h >> 4) % ros.length].id) };
  },
  dailyStart() {
    const dd = this.daily(); App.mode = 'daily'; App.p1 = dd.p1; App.p2 = dd.p2; App.level = 'orta'; versus();
  },
  // ---------- Ruh boti ----------
  recordGhost(g) {
    for (const f of [g.f1, g.f2]) {
      if (f.ctrl instanceof Bot) continue;
      const gh = Store.d.ghost = Store.d.ghost || { usage: {}, matches: 0, fighter: f.def.id };
      for (const k in f.usage) gh.usage[k] = (gh.usage[k] || 0) + f.usage[k];
      gh.matches++; gh.fighter = f.def.id;
    }
  },
  ghostBot(data) {
    const b = new Bot('qiyin'), u = data.usage || {}, tot = Object.values(u).reduce((a, c) => a + c, 0) || 1;
    b.weights = { light: (u.light || 1) / tot, heavy: (u.heavy || 1) / tot, kick: (u.kick || 1) / tot, low: (u.low || 1) / tot, grab: ((u.grab || 0) + (u.shoot || 0) + 1) / tot, special: (u.special || 1) / tot };
    b.p = Object.assign({}, b.p, { grab: Math.min(.5, b.weights.grab * 2), special: Math.min(.3, b.weights.special) });
    return b;
  },
  ghostMenu() {
    const gh = Store.d.ghost;
    const code = gh ? btoa(unescape(encodeURIComponent(JSON.stringify({ u: gh.usage, f: gh.fighter, m: gh.matches })))) : '';
    screen(`<h1>Ruh jangi</h1>
      <div class="tag">Ruh — janglaringizdan o'rganilgan bot: qaysi zarbalarni ko'p ishlatsangiz, u ham shunday jang qiladi.
      ${gh ? `Hozirgi ruhingiz: ${gh.matches} jang, jangchi — ${(FIGHTERS.find(f => f.id === gh.fighter) || {}).name}.` : 'Avval bir nechta jang o\'ynang.'}</div>
      <div class="ctl set"><label>Ruh kodingiz (do'stingizga yuboring):<textarea readonly id="ghCode">${code}</textarea></label>
      <label>Do'stingizning ruh kodi:<textarea id="ghIn" placeholder="Kodni shu yerga qo'ying"></textarea></label></div>
      <div class="menu">${gh ? '<button class="btn" data-act="ghostGo" data-v="mine" autofocus>O\'z ruhimga qarshi</button>' : ''}
      <button class="btn" data-act="ghostGo" data-v="friend">Do'st ruhiga qarshi</button>
      <button class="btn small" data-act="modes" data-back>Orqaga</button></div>`);
  },
  ghostGo(which) {
    let data = Store.d.ghost && { usage: Store.d.ghost.usage, fighter: Store.d.ghost.fighter };
    if (which === 'friend') {
      try { const j = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('ghIn').value.trim())))); data = { usage: j.u, fighter: j.f }; }
      catch (e) { return Game.say && alertBox("Kod noto'g'ri. Butun kodni nusxalab qo'ying."); }
    }
    if (!data) return;
    App.mode = 'ghost'; App.ghostData = data; App.p2 = Math.max(0, fIdx(data.fighter)); selectMenu(0);
  },
  // ---------- Juftlik 2v2 ----------
  tagMenu() {
    screen(`<h1>Juftlik jangi — 2 ga 2</h1>
      <div class="tag">Har tomonda ikki jangchi. <b>Blok + Ushlash</b> — sherik bilan almashish (5 soniyada bir marta). Biri yiqilsa, sherigi chiqadi.</div>
      <div class="menu"><button class="btn" data-act="tagGo" data-v="bot" autofocus>Botlar juftligiga qarshi</button>
      <button class="btn" data-act="tagGo" data-v="2p">Ikki kishi (har biri 2 tadan)</button>
      <button class="btn small" data-act="modes" data-back>Orqaga</button></div>`);
  },
  tagGo(v) { App.mode = 'tag'; App.tag2p = v === '2p'; App.tagPicks = []; selectMenu(0); },
  // tanlash ekranida qo'shimcha rejimlar
  onPick(i) {
    if (App.mode === 'tower') { this.towerStart(i); return true; }
    if (App.mode === 'ghost') { App.p1 = i; versus(); return true; }
    if (App.mode === 'tag') {
      App.tagPicks.push(i);
      const need = App.tag2p ? 4 : 2;
      if (App.tagPicks.length < need) { selectMenu(App.tag2p && App.tagPicks.length >= 2 ? 1 : 0); ui.querySelector('h1').textContent = (App.tagPicks.length >= 2 ? "2-o'yinchi" : "1-o'yinchi") + `: ${App.tagPicks.length % 2 + 1}-jangchini tanlang`; return true; }
      if (!App.tag2p) { const rest = shuffle(roster().map(f => fIdx(f.id)).filter(x => !App.tagPicks.includes(x))); App.tagPicks.push(rest[0], rest[1]); }
      App.p1 = App.tagPicks[0]; App.p2 = App.tagPicks[2]; versus(); return true;
    }
    return false;
  },
  versusSub() {
    if (App.mode === 'tower') return `Minora: ${App.tower.floor + 1}-qavat / 10 • Bitta raund • Jon keyingi qavatga o'tadi`;
    if (App.mode === 'daily') return 'Kunlik sinov: ' + this.daily().rule.text;
    if (App.mode === 'ghost') return 'Ruh jangi: raqib sizning uslubingizda jang qiladi';
    if (App.mode === 'tag') return `Juftlik: ${App.tagPicks.slice(0, 2).map(i => FIGHTERS[i].name).join(' + ')} qarshi ${App.tagPicks.slice(2).map(i => FIGHTERS[i].name).join(' + ')} • Blok+Ushlash — almashish`;
    return null;
  },
  extraOpts(o) {
    const m = App.mode;
    if (m === 'tower') { o.need = 1; o.startHp = App.tower.hp; o.vsBot = true; o.c2 = new Bot(App.tower.floor < 5 ? 'orta' : 'qiyin'); }
    if (m === 'daily') { const r = this.daily().rule; o.ban = r.ban; o.startHp = r.startHp ? r.startHp * 100 : null; o.roundTime = r.roundTime; o.vsBot = true; o.c2 = new Bot('orta'); }
    if (m === 'ghost') { o.vsBot = true; o.c2 = this.ghostBot(App.ghostData); }
    if (m === 'tag') {
      o.tag = { t1: [App.tagPicks[0], App.tagPicks[1]], t2: [App.tagPicks[2], App.tagPicks[3]] };
      o.vsBot = !App.tag2p; o.c2 = App.tag2p ? KEYMAP.p2 : new Bot(App.level || 'orta');
    }
    return o;
  },
  afterMatch(side) {
    const m = App.mode, pName = FIGHTERS[App.p1].name;
    if (m === 'tower') {
      if (side === 0) {
        App.tower.floor++; Store.d.bestTower = Math.max(Store.d.bestTower || 0, App.tower.floor); this.coins(3);
        App.tower.hp = Math.min(Game.f1.maxHp, Game.f1.hp + Game.f1.maxHp * 0.35);
        if (App.tower.floor >= 10) { this.coins(60); return screen(`<h1 class="win">Minora zabt etildi!</h1><div class="tag">${pName} 10 qavatning hammasidan o'tdi. +60 tanga.</div><div class="menu"><button class="btn" data-act="menu" autofocus>Bosh menyu</button></div>`), true; }
        App.p2 = App.tower.foes[App.tower.floor];
        return screen(`<h1 class="win">${App.tower.floor}-qavat o'tildi</h1><div class="tag">Jon 35% tiklandi. Keyingi raqib: <b>${FIGHTERS[App.p2].name}</b></div>
          <div class="menu"><button class="btn" data-act="next" autofocus>Keyingi qavat</button><button class="btn small" data-act="menu" data-back>Chiqish</button></div>`), true;
      }
      return screen(`<h1 class="lose">Minora tugadi</h1><div class="tag">${App.tower.floor} ta qavat o'tildi. Eng yaxshi natija: ${Store.d.bestTower || 0}.</div>
        <div class="menu"><button class="btn" data-act="tower" autofocus>Qaytadan</button><button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`), true;
    }
    if (m === 'daily') {
      const dd = this.daily();
      if (side === 0 && Store.d.dailyDone !== dd.date) { Store.d.dailyDone = dd.date; this.coins(50); }
      return screen(`<h1 class="${side === 0 ? 'win' : 'lose'}">${side === 0 ? 'Sinov bajarildi!' : 'Sinov bajarilmadi'}</h1>
        <div class="tag">${dd.rule.text}${side === 0 ? ' — +50 tanga' : ''}. Ertaga yangi sinov.</div>
        <div class="menu">${side === 0 ? '' : '<button class="btn" data-act="daily" autofocus>Qayta urinish</button>'}<button class="btn small" data-act="menu" data-back ${side === 0 ? 'autofocus' : ''}>Bosh menyu</button></div>`), true;
    }
    if (m === 'ghost' || m === 'tag') {
      return screen(`<h1 class="${side === 0 ? 'win' : 'lose'}">${side === 0 ? "G'alaba!" : "Mag'lubiyat"}</h1>
        <div class="tag">${m === 'tag' ? (side === 0 ? '1-juftlik' : '2-juftlik') + " g'olib bo'ldi" : (side === 0 ? 'Ruhingizni yengdingiz!' : 'Ruhingiz kuchliroq chiqdi.')}</div>
        <div class="menu"><button class="btn" data-act="rematch" autofocus>Qayta jang</button><button class="btn small" data-act="menu" data-back>Bosh menyu</button></div>`), true;
    }
    return false;
  },
  reward(g, w) {
    if (!w || w.ctrl instanceof Bot || !g.vsBot) return;
    const lv = { oson: 5, orta: 10, qiyin: 15 }[App.level] || 10;
    this.coins(lv, "g'alaba");
  },

  // ---------- 2v2: almashish ----------
  tagInit(g) {
    const T = g.opts.tag;
    g.bench = [{ def: FIGHTERS[T.t1[1]], hp: null }, { def: FIGHTERS[T.t2[1]], hp: null }];
    g.tagCd = [0, 0];
  },
  swap(g, side, forced) {
    const cur = side ? g.f2 : g.f1, b = g.bench[side];
    if (!b || b.hp === 0 || (!forced && g.tagCd[side] > 0) || g.grapple) return false;
    const nf = new Fighter(b.def, side, cur.ctrl, side === 1 && g.f1.def.id === b.def.id);
    nf.wins = cur.wins; nf.meter = cur.meter; nf.x = cur.x; nf.face = cur.face;
    if (b.hp !== null) nf.hp = nf.hpTrail = b.hp;
    g.bench[side] = { def: FIGHTERS[fIdx(cur.def.id)], hp: Math.max(0, cur.hp) };
    if (side) g.f2 = nf; else g.f1 = nf;
    nf.invuln = 40; nf.y = GROUND - 200; nf.vy = 2; nf.set('jump');
    g.tagCd[side] = 300; Sfx.whoosh(); g.ring(nf.x, GROUND - 120, '#ffde59', 100);
    g.say((forced ? 'Sherik kirdi: ' : 'Almashish: ') + nf.def.name, nf.x, GROUND - 260, '#ffde59', 26);
    if (nf.ctrl instanceof Bot) nf.ctrl.pm = null;
    return true;
  },
  tagStep(g, f, inp) {
    const side = f.side;
    if (g.tagCd[side] > 0) g.tagCd[side]--;
    let want = inp.held.block && inp.press.grab;
    if (f.ctrl instanceof Bot && f.hp / f.maxHp < 0.3 && g.bench[side].hp !== 0 && (g.bench[side].hp === null || g.bench[side].hp > 40) && Math.random() < 0.01) want = true;
    if (want && (f.state === 'idle' || f.state === 'block' || f.state === 'walk') && g.phase === 'fight') this.swap(g, side, false);
  },
  tagOnKO(g, vic) {
    const side = vic.side, b = g.bench[side];
    if (!b || b.hp === 0) return false;
    vic.hp = 0; this.swap(g, side, true);
    g.bench[side].hp = 0; // yiqilgan jangchi chiqib ketdi
    return true;
  },
  tagHud(g) {
    for (const side of [0, 1]) {
      const b = g.bench[side]; if (!b) continue;
      const x = side ? W - 40 - 160 : 40, y = 118, mh = 100 * (b.def.hpMul || 1), hp = b.hp === null ? mh : b.hp;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 2, y - 2, 164, 14);
      ctx.fillStyle = hp > 0 ? '#3fd46b' : '#555'; ctx.fillRect(side ? x + 160 - 160 * hp / mh : x, y, 160 * hp / mh, 10);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = side ? 'right' : 'left';
      ctx.fillText('Sherik: ' + b.def.name + (g.tagCd[side] > 0 ? ' (' + Math.ceil(g.tagCd[side] / 60) + ')' : ''), side ? x + 160 : x, y + 26);
    }
    ctx.textAlign = 'center';
  },

  // ---------- Do'kon ----------
  shop() {
    const own = Store.d.owned = Store.d.owned || {}, skin = Store.d.skin = Store.d.skin || {};
    const rows = roster().map(f => `<tr><td><b>${f.name}</b></td>${SKINS.map((s, k) => {
      const key = f.id + ':' + k, has = k === 0 || own[key], on = (skin[f.id] || 0) === k;
      return `<td><button class="btn small ${on ? 'on' : ''}" data-act="${has ? 'wear' : 'buy'}" data-v="${key}" style="border-left:6px solid ${hueShift(f.top || f.shorts, s.deg)}">${s.name}${has ? (on ? ' ✓' : '') : ' — ' + SKIN_COST}</button></td>`;
    }).join('')}</tr>`).join('');
    screen(`<h1>Do'kon</h1><div class="tag">Tangalar: <b>${Store.d.coins || 0}</b> • G'alaba, minora va kunlik sinov uchun beriladi</div>
      <div class="ctl moveslist"><table>${rows}</table></div>
      <button class="btn small" data-act="menu" data-back autofocus>Orqaga</button>`);
  },
  buy(key) {
    if ((Store.d.coins || 0) < SKIN_COST) { Sfx.block(); return alertBox('Tangalar yetmaydi. Botlarni yenging yoki kunlik sinovni bajaring.'); }
    Store.d.coins -= SKIN_COST; Store.d.owned[key] = true; this.wear(key);
  },
  wear(key) { const [id, k] = key.split(':'); Store.d.skin[id] = +k; Store.save(); this.shop(); },
};

function alertBox(text) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  document.getElementById('overlay').appendChild(el); setTimeout(() => el.remove(), 2600);
}
