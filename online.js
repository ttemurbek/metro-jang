// Metro Jang — do'st bilan onlayn jang: WebRTC (server yo'q, kodlar qo'lda almashtiriladi) + lockstep sinxronlash.
// Har ikki kompyuter bir xil simulyatsiyani bir xil urug' (seed) va kirishlar bilan hisoblaydi.
'use strict';

const Online = {
  pc: null, ch: null, host: false, DELAY: 4,
  local: {}, remote: {}, frame: 0, myPick: null, theirPick: null, hashes: {},

  menu() {
    screen(`<h1>Onlayn jang</h1>
      <div class="tag">Server yoki akkaunt kerak emas. Bir kishi xona ochadi va kodni do'stiga yuboradi (Telegram va h.k.),
      do'sti javob kodini qaytaradi. Ulanish brauzerlar orasida to'g'ridan-to'g'ri bo'ladi (WebRTC).</div>
      <div class="menu"><button class="btn" data-act="onHost" autofocus>Xona ochish</button>
      <button class="btn" data-act="onJoin">Do'st xonasiga qo'shilish</button>
      <button class="btn small" data-act="modes" data-back>Orqaga</button></div>`);
  },
  newPc() {
    this.close();
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.onconnectionstatechange = () => { if (['failed', 'disconnected'].includes(this.pc.connectionState)) this.lost(); };
  },
  waitIce() { return new Promise(res => { if (this.pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 4000); this.pc.onicegatheringstatechange = () => { if (this.pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }; }); },
  pack(desc) { return btoa(unescape(encodeURIComponent(JSON.stringify(desc)))); },
  unpack(code) { return JSON.parse(decodeURIComponent(escape(atob(code.trim())))); },
  async host() {
    this.host = true; this.newPc();
    this.setupCh(this.pc.createDataChannel('jang', { ordered: true }));
    await this.pc.setLocalDescription(await this.pc.createOffer()); await this.waitIce();
    screen(`<h1>Xona ochildi</h1>
      <div class="ctl set"><label>1) Bu kodni do'stingizga yuboring:<textarea readonly onclick="this.select()">${this.pack(this.pc.localDescription)}</textarea></label>
      <label>2) Do'stingiz qaytargan javob kodini shu yerga qo'ying:<textarea id="ansIn"></textarea></label></div>
      <div class="menu"><button class="btn" data-act="onConnect" autofocus>Ulanish</button><button class="btn small" data-act="online" data-back>Orqaga</button></div>`);
  },
  async connect() {
    try { await this.pc.setRemoteDescription(this.unpack(document.getElementById('ansIn').value)); this.status('Ulanmoqda...'); }
    catch (e) { alertBox("Javob kodi noto'g'ri"); }
  },
  joinScreen() {
    this.host = false;
    screen(`<h1>Xonaga qo'shilish</h1>
      <div class="ctl set"><label>1) Do'stingiz yuborgan xona kodini qo'ying:<textarea id="offIn"></textarea></label></div>
      <div class="menu"><button class="btn" data-act="onAccept" autofocus>Javob kodini yaratish</button><button class="btn small" data-act="online" data-back>Orqaga</button></div>`);
  },
  async accept() {
    try {
      this.newPc(); this.pc.ondatachannel = e => this.setupCh(e.channel);
      await this.pc.setRemoteDescription(this.unpack(document.getElementById('offIn').value));
      await this.pc.setLocalDescription(await this.pc.createAnswer()); await this.waitIce();
      screen(`<h1>Javob kodi</h1>
        <div class="ctl set"><label>2) Bu kodni do'stingizga qaytaring va kuting:<textarea readonly onclick="this.select()">${this.pack(this.pc.localDescription)}</textarea></label></div>
        <div class="tag" id="onStat">Do'stingiz ulanishini kutyapmiz...</div><button class="btn small" data-act="online" data-back>Bekor qilish</button>`);
    } catch (e) { alertBox("Xona kodi noto'g'ri"); }
  },
  status(t) { const el = document.getElementById('onStat'); if (el) el.textContent = t; },
  setupCh(ch) {
    this.ch = ch;
    ch.onopen = () => { Sfx.confirm(); this.lobby(); };
    ch.onclose = () => this.lost();
    ch.onmessage = e => this.onMsg(JSON.parse(e.data));
  },
  send(o) { if (this.ch && this.ch.readyState === 'open') this.ch.send(JSON.stringify(o)); },
  lobby() {
    this.myPick = null; this.theirPick = null;
    App.mode = 'online';
    const cards = roster().filter(f => !f.boss).map(d => { const i = fIdx(d.id); return `<button class="btn card" data-act="onPick" data-v="${i}"><canvas width="150" height="150" data-f="${i}"></canvas><b>${d.name}</b><i>${d.title}</i></button>`; }).join('');
    screen(`<h1>Ulandi! Jangchingizni tanlang</h1><div class="tag" id="onStat">Siz — ${this.host ? "1-o'yinchi (chap)" : "2-o'yinchi (o'ng)"}. Boshqaruv: 1-o'yinchi tugmalari.</div>
      <div class="cards">${cards}</div>`, root => root.querySelectorAll('canvas[data-f]').forEach(cv => portrait(cv, FIGHTERS[+cv.dataset.f])));
  },
  pick(i) { this.myPick = i; this.send({ t: 'pick', i }); this.status("Raqib tanlashini kutyapmiz..."); this.tryStart(); },
  tryStart() {
    if (!this.host || this.myPick === null || this.theirPick === null) return;
    const seed = Rng.orig() * 1e9 | 0, rt = Store.d.settings.roundTime;
    this.send({ t: 'start', seed, p1: this.myPick, p2: this.theirPick, rt });
    this.begin(seed, this.myPick, this.theirPick, rt);
  },
  begin(seed, p1, p2, rt) {
    this.local = {}; this.remote = {}; this.frame = 0; this.hashes = {}; this.desync = false;
    for (let f = 0; f < this.DELAY; f++) { this.local[f] = 0; this.remote[f] = 0; }
    App.mode = 'online'; App.p1 = p1; App.p2 = p2; App.inFight = true; hideScreen();
    Game.start({ mode: 'online', p1: FIGHTERS[p1], p2: FIGHTERS[p2], seed, roundTime: rt, vsBot: false, c1: { net: true }, c2: { net: true },
      onEnd: side => { App.inFight = false; Sfx.rumble(false); afterMatch(side); } });
  },
  onMsg(m) {
    if (m.t === 'pick') { this.theirPick = m.i; this.tryStart(); }
    else if (m.t === 'start') this.begin(m.seed, m.p1, m.p2, m.rt);
    else if (m.t === 'in') this.remote[m.f] = m.m;
    else if (m.t === 'hash') { const mine = this.hashes[m.f]; if (mine !== undefined && mine !== m.h && !this.desync) { this.desync = true; Game.say('Sinxronlash buzildi — revansh tavsiya etiladi', W / 2, 200, '#ff8c5a', 20); } }
    else if (m.t === 'again') this.lobby();
  },
  // har kadrda: o'z kirishimni DELAY kadr oldinga yuboraman, ikkalasi kelgan kadrni hisoblayman
  tick() {
    if (Game.paused) return;
    const f = this.frame + this.DELAY;
    if (this.local[f] === undefined) {
      const m = encInp(readHuman(KEYMAP.p1, 0)); for (const k in pressed) delete pressed[k];
      this.local[f] = m; this.send({ t: 'in', f, m });
    }
    if (this.remote[this.frame] === undefined) { this.stall = (this.stall || 0) + 1; return; }
    this.stall = 0;
    const mine = this.local[this.frame], theirs = this.remote[this.frame];
    this.cur = this.host ? [mine, theirs] : [theirs, mine];
    Game.update();
    if (this.frame % 120 === 0) { const h = Math.round(Game.f1.hp * 10 + Game.f2.hp * 1000 + Game.f1.x + Game.f2.x * 7); this.hashes[this.frame] = h; this.send({ t: 'hash', f: this.frame, h }); }
    delete this.local[this.frame - 10]; delete this.remote[this.frame - 10];
    this.frame++;
  },
  input(f) { return decInp(this.cur ? this.cur[f.side] : 0); },
  after(side) {
    const me = this.host ? 0 : 1;
    screen(`<h1 class="${side === me ? 'win' : 'lose'}">${side < 0 ? 'Durang!' : side === me ? "G'alaba!" : "Mag'lubiyat"}</h1>
      <div class="menu"><button class="btn" data-act="onAgain" autofocus>Revansh (yangi tanlash)</button><button class="btn small" data-act="onQuit">Chiqish</button></div>`);
    ACTIONS.onAgain = () => { this.send({ t: 'again' }); this.lobby(); };
    ACTIONS.onQuit = () => { this.close(); mainMenu(); };
  },
  lost() { if (App.mode !== 'online') return; quitFight(); this.close(); screen(`<h1 class="lose">Ulanish uzildi</h1><div class="menu"><button class="btn" data-act="online" autofocus>Qayta ulanish</button><button class="btn small" data-act="menu">Bosh menyu</button></div>`); },
  close() { try { if (this.ch) this.ch.close(); if (this.pc) this.pc.close(); } catch (e) { /* e'tiborsiz */ } this.ch = null; this.pc = null; },
};
