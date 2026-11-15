// Metro Jang — takroriy ko'rish (replay), skrinshot, tillar (uz/ru/en), turnir, rekordlar.
'use strict';

// ---------- Urug'li tasodif: simulyatsiya takrorlanishi uchun (replay va onlayn) ----------
const Rng = (() => {
  const orig = Math.random; let s = 1, on = false;
  const seeded = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    orig,
    seed(v) { s = v | 0; },
    enter() { if (!on) { on = true; Math.random = seeded; } },
    exit() { if (on) { on = false; Math.random = orig; } },
  };
})();

// Kirishni ixcham songa aylantirish
const BITS = ['left', 'right', 'up', 'down', 'punch', 'heavy', 'kick', 'block', 'grab', 'special'];
function encInp(inp) { let m = 0; BITS.forEach((b, i) => { if (inp.held[b]) m |= 1 << i; if (inp.press[b]) m |= 1 << (i + 10); }); return m; }
function decInp(m) { const inp = { held: {}, press: {} }; BITS.forEach((b, i) => { if (m & (1 << i)) inp.held[b] = true; if (m & (1 << (i + 10))) inp.press[b] = true; }); return inp; }

// ---------- Replay ----------
const Replay = {
  rec: null, play: null, speed: 1,
  begin(opts) {
    if (opts.replay) return;
    this.rec = { seed: opts.seed, date: new Date().toLocaleString(), opts: {
      mode: opts.mode, p1: opts.p1.id, p2: opts.p2.id, need: opts.need, startHp: opts.startHp, ban: opts.ban, roundTime: opts.roundTime || Store.d.settings.roundTime,
      tag: opts.tag, first: opts.first, noTrain: opts.noTrain, vsBot: opts.vsBot, level: opts.c2 instanceof Bot ? opts.c2.lv : null, streak: Store.d.streak || 0,
      ghost: opts.c2 && opts.c2.weights ? App.ghostData : null, practice: opts.mode === 'practice' }, frames: [] };
  },
  frame(i1, i2) { if (this.rec && !this.play) this.rec.frames.push([encInp(i1), encInp(i2)]); },
  end(winSide) {
    if (!this.rec || this.play || this.rec.opts.practice || this.rec.frames.length < 200) return;
    this.rec.result = winSide;
    const list = Store.d.replays = (Store.d.replays || []);
    list.unshift(this.rec); Store.d.replays = list.slice(0, 3); Store.save(); this.rec = null;
  },
  menu() {
    const list = Store.d.replays || [];
    const rows = list.map((r, i) => `<button class="btn" data-act="replayGo" data-v="${i}">${r.date} — ${(FIGHTERS.find(f => f.id === r.opts.p1) || {}).name} qarshi ${(FIGHTERS.find(f => f.id === r.opts.p2) || {}).name}</button>`).join('');
    screen(`<h1>Takroriy ko'rish</h1><div class="tag">Oxirgi 3 ta jang saqlanadi. Ko'rish paytida: 1/2/4 — tezlik, P — skrinshot, Esc — chiqish.</div>
      <div class="menu">${rows || '<div class="note">Hali saqlangan jang yo\'q</div>'}<button class="btn small" data-act="modes" data-back ${rows ? '' : 'autofocus'}>Orqaga</button></div>`);
  },
  start(i) {
    const r = (Store.d.replays || [])[i]; if (!r) return;
    const o = r.opts; this.play = { r, idx: 0 }; this.speed = 1;
    App.mode = o.mode; App.inFight = true; hideScreen();
    const ctl = side => (side === 1 && o.vsBot) ? (o.ghost ? Modes.ghostBot(o.ghost) : new Bot(o.level || 'orta')) : { replay: true, side };
    Game.start({ mode: o.mode, p1: FIGHTERS[fIdx(o.p1)], p2: FIGHTERS[fIdx(o.p2)], need: o.need, startHp: o.startHp, ban: o.ban, roundTime: o.roundTime, tag: o.tag,
      first: o.first, noTrain: o.noTrain, vsBot: o.vsBot, streak: o.streak, seed: r.seed, replay: true,
      c1: ctl(0), c2: ctl(1), onEnd: () => { this.play = null; App.inFight = false; Sfx.rumble(false); this.menu(); } });
  },
  input(f) { const P = this.play; if (!P) return EMPTY; const fr = P.r.frames[P.cur] || [0, 0]; return decInp(fr[f.side]); },
};

function screenshot() {
  const c = document.querySelector('#game canvas'); if (!c) return;
  const a = document.createElement('a'); a.download = 'metro-jang-' + Date.now() + '.png'; a.href = c.toDataURL('image/png'); a.click();
  alertBox('Skrinshot saqlandi');
}

// ---------- Tillar ----------
const I18N = {
  ru: {
    'Hikoya — "Qora Halqa"': 'История — «Чёрное Кольцо»', 'Arkada — botga qarshi': 'Аркада — против бота', 'Ikki kishi — bitta klaviaturada': 'Двое — на одной клавиатуре',
    "Mashq rejimi — kombolarni o'rganish": 'Тренировка — изучение комбо', "O'rganish — qadamma-qadam": 'Обучение — шаг за шагом', 'Boshqa rejimlar — minora, 2v2, turnir, onlayn...': 'Другие режимы — башня, 2×2, турнир, онлайн...',
    'Boshqaruv': 'Управление', 'Usullar': 'Приёмы', 'Sozlamalar': 'Настройки', 'Statistika': 'Статистика', "Do'kon": 'Магазин', 'Rekordlar': 'Рекорды',
    'Toshkent metrosidan ilhomlangan bekatlardagi shiddatli janglar': 'Яростные бои на станциях, вдохновлённых Ташкентским метро',
    'Qiyinlik darajasi': 'Сложность', 'Oson': 'Легко', "O'rtacha": 'Средне', 'Qiyin': 'Сложно', 'Orqaga': 'Назад', 'Bosh menyu': 'Главное меню',
    'Pauza': 'Пауза', 'Davom etish': 'Продолжить', 'Jangni qayta boshlash': 'Начать бой заново', "Bosh menyuga chiqish": 'Выйти в меню', "Usullar ro'yxati": 'Список приёмов',
    'Jangni boshlash': 'Начать бой', 'qarshi': 'против', "G'alaba!": 'Победа!', "Mag'lubiyat": 'Поражение', 'Qayta urinish': 'Ещё раз', 'Revansh': 'Реванш',
    'Keyingi jang': 'Следующий бой', 'Jangchingizni tanlang': 'Выберите бойца', 'Boshqa rejimlar': 'Другие режимы', 'Til': 'Язык',
    'Musiqa balandligi': 'Громкость музыки', 'Effektlar balandligi': 'Громкость эффектов', 'Raund vaqti': 'Время раунда', 'Ekran silkinishi': 'Тряска экрана', 'Diktor ovozi': 'Голос диктора',
    'Yoqiq': 'Вкл', "O'chiq": 'Выкл', 'Tugmalarni sozlash': 'Настройка клавиш',
    'JANG!': 'БОЙ!', 'NOKAUT!': 'НОКАУТ!', 'TASLIM!': 'СДАЧА!', "G'ALABA!": 'ПОБЕДА!', "MAG'LUBIYAT": 'ПОРАЖЕНИЕ', 'TUGAT UNI!': 'ДОБЕЙ!', 'DURANG!': 'НИЧЬЯ!',
    'VAQT TUGADI!': 'ВРЕМЯ!', 'OXIRGI BEKAT!': 'КОНЕЧНАЯ!', 'UCHINCHI RELS!': 'ТРЕТИЙ РЕЛЬС!', 'HAL QILUVCHI RAUND': 'РЕШАЮЩИЙ РАУНД', "QO'SHIMCHA RAUND": 'ДОП. РАУНД', '-RAUND': '-Й РАУНД',
  },
  en: {
    'Hikoya — "Qora Halqa"': 'Story — "Black Ring"', 'Arkada — botga qarshi': 'Arcade — vs bot', 'Ikki kishi — bitta klaviaturada': 'Two players — one keyboard',
    "Mashq rejimi — kombolarni o'rganish": 'Practice — learn combos', "O'rganish — qadamma-qadam": 'Tutorial — step by step', 'Boshqa rejimlar — minora, 2v2, turnir, onlayn...': 'More modes — tower, 2v2, tournament, online...',
    'Boshqaruv': 'Controls', 'Usullar': 'Moves', 'Sozlamalar': 'Settings', 'Statistika': 'Stats', "Do'kon": 'Shop', 'Rekordlar': 'Records',
    'Toshkent metrosidan ilhomlangan bekatlardagi shiddatli janglar': 'Brutal fights in stations inspired by the Tashkent metro',
    'Qiyinlik darajasi': 'Difficulty', 'Oson': 'Easy', "O'rtacha": 'Normal', 'Qiyin': 'Hard', 'Orqaga': 'Back', 'Bosh menyu': 'Main menu',
    'Pauza': 'Pause', 'Davom etish': 'Resume', 'Jangni qayta boshlash': 'Restart fight', "Bosh menyuga chiqish": 'Quit to menu', "Usullar ro'yxati": 'Move list',
    'Jangni boshlash': 'Start fight', 'qarshi': 'vs', "G'alaba!": 'Victory!', "Mag'lubiyat": 'Defeat', 'Qayta urinish': 'Try again', 'Revansh': 'Rematch',
    'Keyingi jang': 'Next fight', 'Jangchingizni tanlang': 'Choose your fighter', 'Boshqa rejimlar': 'More modes', 'Til': 'Language',
    'Musiqa balandligi': 'Music volume', 'Effektlar balandligi': 'Effects volume', 'Raund vaqti': 'Round time', 'Ekran silkinishi': 'Screen shake', 'Diktor ovozi': 'Announcer voice',
    'Yoqiq': 'On', "O'chiq": 'Off', 'Tugmalarni sozlash': 'Key bindings',
    'JANG!': 'FIGHT!', 'NOKAUT!': 'KNOCKOUT!', 'TASLIM!': 'SUBMISSION!', "G'ALABA!": 'VICTORY!', "MAG'LUBIYAT": 'DEFEAT', 'TUGAT UNI!': 'FINISH HIM!', 'DURANG!': 'DRAW!',
    'VAQT TUGADI!': 'TIME OVER!', 'OXIRGI BEKAT!': 'LAST STOP!', 'UCHINCHI RELS!': 'THIRD RAIL!', 'HAL QILUVCHI RAUND': 'FINAL ROUND', "QO'SHIMCHA RAUND": 'EXTRA ROUND', '-RAUND': ' ROUND',
  },
};
function T(text) {
  const L = I18N[Store.d.settings.lang]; if (!L || !text) return text;
  if (L[text]) return L[text];
  const m = /^(\d+)-RAUND$/.exec(text); if (m) return Store.d.settings.lang === 'en' ? 'ROUND ' + m[1] : m[1] + L['-RAUND'];
  return text;
}
function translateHtml(html) {
  const L = I18N[Store.d.settings.lang]; if (!L) return html;
  const keys = Object.keys(L).sort((a, b) => b.length - a.length);
  for (const k of keys) if (k.length > 3 || k === 'Til') html = html.split('>' + k + '<').join('>' + L[k] + '<').split('>' + k + ' <').join('>' + L[k] + ' <');
  return html;
}

// ---------- Turnir ----------
const Tourney = {
  setup() {
    screen(`<h1>Turnir</h1><div class="tag">Ishtirokchilar ismini yozing (4 yoki 8 kishi). Har jang — bitta klaviaturada ikki kishi.</div>
      <div class="ctl set">${Array.from({ length: 8 }, (_, i) => `<input class="tname" placeholder="${i + 1}-o'yinchi${i >= 4 ? ' (ixtiyoriy)' : ''}" maxlength="14">`).join('')}</div>
      <div class="menu"><button class="btn" data-act="tourneyStart" autofocus>Jadvalni tuzish</button><button class="btn small" data-act="modes" data-back>Orqaga</button></div>`);
  },
  start() {
    let names = [...document.querySelectorAll('.tname')].map(i => i.value.trim()).filter(Boolean);
    if (names.length < 4) return alertBox('Kamida 4 ta ism kiriting');
    names = shuffle(names.slice(0, names.length >= 8 ? 8 : 4));
    App.tourney = { rounds: [names.map(n => n)], cur: 0, match: 0 };
    this.bracket();
  },
  pairs(list) { const out = []; for (let i = 0; i < list.length; i += 2) out.push([list[i], list[i + 1]]); return out; },
  bracket() {
    const TT = App.tourney, rnd = TT.rounds[TT.cur], pairs = this.pairs(rnd);
    const cols = TT.rounds.map((r, ri) => `<div class="bcol"><b>${ri === TT.rounds.length - 1 && r.length === 1 ? 'Chempion' : (r.length === 2 ? 'Final' : r.length + ' kishi')}</b>${r.map(n => `<div class="bname">${n}</div>`).join('')}</div>`).join('');
    if (rnd.length === 1) {
      return screen(`<h1 class="win">Turnir chempioni: ${rnd[0]}!</h1><div class="bracket">${cols}</div>
        <div class="menu"><button class="btn" data-act="menu" autofocus>Bosh menyu</button></div>`);
    }
    const [a, b] = pairs[TT.match];
    screen(`<h1>Turnir</h1><div class="bracket">${cols}</div>
      <div class="tag">Keyingi jang: <b>${a}</b> (1-o'yinchi) qarshi <b>${b}</b> (2-o'yinchi)</div>
      <div class="menu"><button class="btn" data-act="tourneyFight" autofocus>Jangchilarni tanlash</button><button class="btn small" data-act="menu" data-back>Turnirdan chiqish</button></div>`);
  },
  fight() { App.mode = '2p'; App.inTourney = true; selectMenu(0); },
  result(side) {
    const TT = App.tourney, rnd = TT.rounds[TT.cur], pair = this.pairs(rnd)[TT.match];
    const win = pair[side === 1 ? 1 : 0];
    if (!TT.rounds[TT.cur + 1]) TT.rounds[TT.cur + 1] = [];
    TT.rounds[TT.cur + 1].push(win);
    TT.match++;
    if (TT.match >= rnd.length / 2) { TT.cur++; TT.match = 0; }
    App.inTourney = false; this.bracket();
  },
};

// ---------- Rekordlar ----------
const Records = {
  note(g, w) {
    const R = Store.d.records = Store.d.records || { fastest: 0, fastestBy: '', bestCombo: 0, comboBy: '' };
    if (w && !(w.ctrl instanceof Bot) && g.vsBot) {
      const secs = Math.round(g.matchFrames / 60);
      if (!R.fastest || secs < R.fastest) { R.fastest = secs; R.fastestBy = w.def.name; }
    }
    for (const f of [g.f1, g.f2]) if (!(f.ctrl instanceof Bot) && f.stats.maxCombo > R.bestCombo) { R.bestCombo = f.stats.maxCombo; R.comboBy = f.def.name; }
    Store.save();
  },
  show() {
    const R = Store.d.records || {}, S = Store.d.stats;
    const top = Object.entries(S.perFighter || {}).sort((a, b) => b[1].w - a[1].w).slice(0, 5)
      .map(([id, v], i) => `<tr><td>${i + 1}. ${(FIGHTERS.find(f => f.id === id) || { name: id }).name}</td><td>${v.w} g'alaba</td></tr>`).join('');
    screen(`<h1>Rekordlar</h1><div class="tag">Shu kompyuterdagi eng yaxshi natijalar (server yo'q — internetga yuborilmaydi)</div>
      <div class="ctl"><table>
        <tr><td>Eng tez g'alaba (botga qarshi)</td><td>${R.fastest ? R.fastest + ' s — ' + R.fastestBy : '—'}</td></tr>
        <tr><td>Eng uzun kombo</td><td>${R.bestCombo ? R.bestCombo + ' zarba — ' + R.comboBy : '—'}</td></tr>
        <tr><td>Minorada eng baland qavat</td><td>${Store.d.bestTower || 0} / 10</td></tr>
        <tr><td>"Oxirgi bekat" zarbalari</td><td>${S.finishers}</td></tr>
        <tr><td>Tangalar</td><td>${Store.d.coins || 0}</td></tr>
      </table><table><tr><th>Eng ko'p yutgan jangchilar</th><th></th></tr>${top || "<tr><td class='note'>Hali jang yo'q</td></tr>"}</table></div>
      <button class="btn small" data-act="menu" data-back autofocus>Orqaga</button>`);
  },
};
