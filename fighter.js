// Metro Jang — jangchilar, harakatlar, zarbalar, maxsus usullar, Soya kuchi va kurash.
'use strict';

// Har jangchida 2 ta maxsus usul (Maxsus va Pastga+Maxsus) va o'z shaxsiy kombosi bor.
const FIGHTERS = [
  { id: 'boron', name: "Bo'ron", title: "Og'ir vazn polvon", size: 1.12, speed: 3.1, power: 1.2, pref: 85, stats: [5, 2, 5],
    specials: [{ name: 'Yer silkinishi', kind: 'stomp', desc: "Yerni tepib, zarba to'lqinini yuboradi" },
               { name: "Ayiq quchog'i", kind: 'hug', desc: 'Yaqindan ushlab, siqib ezadi' },
               { name: 'Polvon yugurishi', kind: 'dash', desc: 'Yelkasi bilan yugurib uradi' }], ai: { aggr: .1, grab: .1 },
    chains: { heavy: { heavy: 'hammer' } }, sig: "Polvon bolg'asi: Kuchli → Kuchli",
    skin: '#b97d55', hair: '#151515', hairStyle: 'bald', beard: true, top: null, shorts: '#8b1e1e', gloves: '#1d1d1d', trim: '#f0c040',
    alt: { shorts: '#2d5a27', gloves: '#5a3b12', trim: '#ffffff' } },
  { id: 'chaqmoq', name: 'Chaqmoq', title: 'Tezkor tepkichi', size: 0.95, speed: 4.6, power: 0.9, pref: 125, stats: [3, 5, 3],
    specials: [{ name: 'Chaqmoq tepki', kind: 'dash', desc: 'Chaqmoqdek otilib tepadi' },
               { name: 'Qaychi tepki', kind: 'scissor', desc: 'Sakrab, yuqoridan tepadi — faqat tik blok' },
               { name: 'Qanotli tepki', kind: 'flip', desc: 'Salto tepki — havodagini uradi' }], ai: { aggr: .15, block: -.1 },
    chains: { kick: { kick: 'kick2' }, kick2: { kick: 'round' } }, sig: 'Uch chaqmoq: Tepish → Tepish → Tepish',
    skin: '#e2b48a', hair: '#3a1d0c', hairStyle: 'ponytail', top: '#f2c200', shorts: '#151515', gloves: '#f2c200', trim: '#ffffff',
    alt: { top: '#e0458a', gloves: '#e0458a', shorts: '#3b2a63' } },
  { id: 'temir', name: 'Temir', title: "Po'lat mushtli bokschi", size: 1.0, speed: 3.8, power: 1.05, pref: 100, stats: [4, 4, 4],
    specials: [{ name: 'Temir musht', kind: 'upper', desc: 'Pastdan kuchli musht, raqibni havoga otadi' },
               { name: 'Kontr', kind: 'counter', desc: 'Himoya holati: urilsa, darhol qaytaradi' },
               { name: 'Pulemyot', kind: 'whirl', desc: 'Ketma-ket tez mushtlar' }], ai: { punish: .15 },
    chains: { cross: { punch: 'body' }, body: { heavy: 'upper' } }, sig: 'Bokschi seriyasi: Yengil → Yengil → Yengil → Kuchli',
    skin: '#9f6a45', hair: '#202020', hairStyle: 'short', top: null, shorts: '#1f4aa8', gloves: '#c9ced6', trim: '#e33333', band: true,
    alt: { shorts: '#7a1f9e', gloves: '#e3b23c', trim: '#ffffff' } },
  { id: 'shamol', name: 'Shamol', title: 'Kurash ustasi', size: 1.02, speed: 4.0, power: 1.0, pref: 80, stats: [4, 4, 4],
    specials: [{ name: 'Girdob', kind: 'spin', desc: 'Ushlab, boshi uzra aylantirib uradi' },
               { name: "Shamol to'lqini", kind: 'gust', desc: "Raqibni uzoqqa itaruvchi to'lqin" },
               { name: "Belbog' qisqichi", kind: 'hug', desc: 'Belidan ushlab, siqib yiqitadi' }], ai: { grab: .15 },
    chains: { kick: { grab: 'trip' } }, sig: 'Kurash chalishi: Tepish → Ushlash',
    skin: '#d6a274', hair: '#262626', hairStyle: 'short', top: '#2a62b8', jacket: true, shorts: '#f2f2f2', gloves: '#2a62b8', trim: '#d4372b',
    alt: { top: '#2f8f4e', gloves: '#2f8f4e', trim: '#f2c200' } },
  { id: 'lochin', name: 'Lochin', title: 'Havo ustasi', size: 0.98, speed: 4.4, power: 0.95, pref: 115, stats: [3, 5, 3],
    specials: [{ name: "Lochin sho'ng'ishi", kind: 'dive', desc: "Havoga sakrab, qiya sho'ng'ib tepadi" },
               { name: 'Qanot', kind: 'flip', desc: 'Orqaga salto tepki — havodagini uradi' },
               { name: 'Chaqmoq qadam', kind: 'teleport', desc: 'Bir zumda raqib orqasiga o\'tadi' }], ai: { aggr: .1 },
    chains: { jab: { kick: 'kick' }, kick: { heavy: 'flipk' } }, sig: 'Lochin changali: Yengil → Tepish → Kuchli',
    skin: '#c9946a', hair: '#1c1c1c', hairStyle: 'mohawk', top: null, shorts: '#6b1d1d', gloves: '#e8e8e8', trim: '#ff7a1a', bandana: '#d62828',
    alt: { shorts: '#1d3b6b', bandana: '#2f8f4e', trim: '#ffffff' } },
  { id: 'zanjir', name: 'Zanjir', title: "Ko'cha jangchisi", size: 1.04, speed: 3.6, power: 1.05, pref: 140, stats: [4, 3, 4],
    reach: 1.3, weapon: 'chain',
    specials: [{ name: 'Zanjir qamchi', kind: 'lash', desc: 'Uzoqdan urib, raqibni yaqin tortadi' },
               { name: 'Temir girdob', kind: 'whirl', desc: 'Zanjirni aylantirib, ketma-ket uradi' },
               { name: 'Zanjir zarbasi', kind: 'overhead', desc: 'Zanjirni yuqoridan tushiradi — faqat tik blok' }], ai: { keep: 40 },
    chains: { heavy: { kick: 'chainsweep' } }, sig: 'Temir halqa: Kuchli → Tepish',
    skin: '#c08a60', hair: '#2b2b2b', hairStyle: 'short', top: '#3a3a3a', hoodie: true, shorts: '#4a4a52', gloves: '#2a2a2a', trim: '#b0b0b0',
    alt: { top: '#6b2d2d', shorts: '#2d3d4a', trim: '#f2c200' } },
  { id: 'nur', name: 'Nur', title: "Yorug'lik sehrgari", size: 0.96, speed: 4.2, power: 0.92, pref: 200, stats: [3, 4, 3],
    specials: [{ name: "Nur o'qi", kind: 'proj', desc: "Yorug'lik o'qi — sakrab qochish mumkin", color: '#7ff0ff' },
               { name: 'Chaqnash', kind: 'teleport', desc: "Yo'qolib, raqib orqasida paydo bo'ladi" },
               { name: "Nur to'lqini", kind: 'gust', desc: "Yorug'lik to'lqini raqibni itaradi" }], ai: { keep: 60, special: .08 },
    chains: { cjab: { heavy: 'upper' } }, sig: 'Nur zinapoyasi: Egilib yengil → Kuchli',
    skin: '#e8c09a', hair: '#f3f3f3', hairStyle: 'bun', top: '#18a8a8', jacket: true, shorts: '#f4f4f4', gloves: '#18a8a8', trim: '#ffe36b', glow: '#7ff0ff',
    alt: { top: '#8a3ec9', gloves: '#8a3ec9', glow: '#d7a6ff' } },
  { id: 'qorovul', name: 'Qorovul', title: 'Metro qo\'riqchisi', size: 1.1, speed: 3.0, power: 1.15, pref: 95, stats: [5, 2, 4],
    reach: 1.12, weapon: 'baton',
    specials: [{ name: 'Hushtak', kind: 'whistle', desc: "Qulog'ni teshuvchi hushtak — raqib gangib qoladi" },
               { name: 'Dubinka', kind: 'overhead', desc: "Yuqoridan og'ir zarba — faqat tik blok" },
               { name: "Qalqon to'qnashuvi", kind: 'dash', desc: 'Yelka bilan oldinga otiladi' }], ai: { block: .15, aggr: -.1 },
    chains: { heavy: { heavy: 'baton2' } }, sig: "Tartib o'rnatish: Kuchli → Kuchli",
    skin: '#a87650', hair: '#1a1a1a', hairStyle: 'cap', top: '#2c3e57', jacket: true, shorts: '#22303f', gloves: '#111111', trim: '#e3b23c',
    alt: { top: '#4b3b2a', shorts: '#3a2e22' } },
  { id: 'sher', name: 'Sher', title: 'Aralash jang ustasi', size: 1.03, speed: 3.75, power: 1.06, pref: 82, stats: [4, 4, 5],
    specials: [{ name: 'Ikki oyoq', kind: 'takedown', desc: "Masofani yopib, raqibni parterga olib tushadi" },
               { name: 'Tirsak zarbasi', kind: 'elbow', desc: 'Yaqindan tez tirsak, sakrayotgan raqibga ham tegadi' }],
    chains: { jab: { heavy: 'body' }, body: { heavy: 'elbow' } }, sig: 'Sher bosimi: Yengil → Kuchli → Kuchli',
    skin: '#ad7652', hair: '#1c1614', hairStyle: 'short', beard: true, top: '#214237', shorts: '#182f28', gloves: '#d5b465', trim: '#d5b465',
    alt: { top: '#572d28', shorts: '#34201d', gloves: '#f0e1bd' } },
  { id: 'tuman', name: 'Tuman', title: "Soya yo'li jangchisi", size: 0.96, speed: 4.5, power: 0.94, pref: 118, stats: [3, 5, 4],
    specials: [{ name: 'Tuman qadami', kind: 'veil', desc: "Bir lahza yo'qolib, raqib ortidan zarba beradi" },
               { name: 'Teskari tepki', kind: 'flip', desc: 'Orqaga sakrab, yaqin hujumni qaytaradi' }],
    chains: { cjab: { kick: 'kick2' }, kick2: { heavy: 'shadowkick' } }, sig: 'Tuman izi: Egilib yengil → Tepish → Kuchli',
    skin: '#b79581', hair: '#161622', hairStyle: 'long', bandana: '#9f80d8', top: '#312c49', hoodie: true, shorts: '#1d1b2c', gloves: '#7d65ad', trim: '#9f80d8', glow: '#aa92ec',
    alt: { top: '#223d43', shorts: '#182b31', gloves: '#55bfc3', bandana: '#55bfc3', glow: '#80d6d9' } },
  { id: 'navbatchi', name: 'Navbatchi', title: 'Bekat navbatchisi', size: 0.97, speed: 4.1, power: 0.95, pref: 150, stats: [3, 4, 4],
    reach: 1.25, weapon: 'flag', ai: { keep: 30, block: .1 },
    specials: [{ name: 'Bayroq qamchi', kind: 'lash', desc: 'Signal bayrog\'i bilan uzoqdan uradi va tortadi' },
               { name: 'Signal', kind: 'whistle', desc: 'Keskin hushtak — raqib gangib qoladi' },
               { name: 'Navbat almashinuvi', kind: 'flip', desc: 'Salto bilan havodagini uradi' }],
    chains: { jab: { heavy: 'heavy' }, heavy: { heavy: 'hammer' } }, sig: "Qat'iy tartib: Yengil → Kuchli → Kuchli",
    skin: '#e0b088', hair: '#2a1a10', hairStyle: 'cap', capColor: '#b3261e', top: '#b3261e', jacket: true, shorts: '#1f2633', gloves: '#f2f2f2', trim: '#f2c200',
    alt: { top: '#1f5fa8', capColor: '#1f5fa8' } },
  { id: 'kalit', name: 'Kalit', title: 'Depo chilangari', size: 1.08, speed: 3.2, power: 1.12, pref: 95, stats: [5, 2, 4],
    reach: 1.15, weapon: 'wrench', ai: { aggr: .05, grab: .05 },
    specials: [{ name: 'Gayka kalit', kind: 'overhead', desc: "Og'ir kalit bilan yuqoridan uradi" },
               { name: 'Rels titrashi', kind: 'stomp', desc: "Yerga urib, to'lqin yuboradi" },
               { name: 'Qisqich', kind: 'hug', desc: 'Ushlab, siqib ezadi' }],
    chains: { heavy: { kick: 'round' }, kick: { heavy: 'hammer' } }, sig: "Ta'mir: Tepish → Kuchli",
    skin: '#b0805a', hair: '#3a3a3a', hairStyle: 'short', beard: true, top: '#e07a1a', jacket: true, shorts: '#2c3a4f', gloves: '#3a3a3a', trim: '#cfcfcf',
    alt: { top: '#3d7a3d' } },
  { id: 'tulpor', name: "Tulpor", title: 'Tez oyoqli chavandoz', size: 1.0, speed: 4.3, power: 1.0, pref: 120, stats: [4, 4, 3],
    ai: { aggr: .12 },
    specials: [{ name: 'Tulpor chopishi', kind: 'dash', desc: "Otdek otilib, tepib o'tadi" },
               { name: 'Uloq tepki', kind: 'scissor', desc: 'Sakrab yuqoridan tepadi — faqat tik blok' },
               { name: "Bo'ron aylanishi", kind: 'whirl', desc: 'Aylanib, ketma-ket tepadi' }],
    chains: { kick: { kick: 'kick2' }, kick2: { heavy: 'flipk' } }, sig: 'Chavandoz: Tepish → Tepish → Kuchli',
    skin: '#c7956b', hair: '#1b1b1b', hairStyle: 'short', top: '#5b2a86', jacket: true, shorts: '#2b2b2b', gloves: '#5b2a86', trim: '#e3b23c', band: true,
    alt: { top: '#1f6f5c', gloves: '#1f6f5c' } },
  { id: 'uchqun', name: 'Uchqun', title: 'Skeytbordchi', size: 0.92, speed: 4.8, power: 0.88, pref: 170, stats: [2, 5, 3],
    ai: { keep: 50, aggr: .05 },
    specials: [{ name: 'Uchqun otish', kind: 'proj', desc: "Uchqunli o'q — sakrab qochish mumkin", color: '#ffb347' },
               { name: 'Doska zarbasi', kind: 'dash', desc: "Skeytda sirpanib, urib o'tadi" },
               { name: 'Kickflip', kind: 'flip', desc: 'Havoda aylanib tepadi' }],
    chains: { jab: { kick: 'kick' }, kick: { kick: 'kick2' } }, sig: 'Tryuk: Yengil → Tepish → Tepish',
    skin: '#e6b98f', hair: '#c46a1a', hairStyle: 'mohawk', top: '#18a8a8', hoodie: true, shorts: '#3a3a52', gloves: '#ffb347', trim: '#ffffff',
    alt: { top: '#d62828' } },
  { id: 'soya', name: 'Soya', title: 'Qora Halqa xo\'jayini', size: 1.06, speed: 4.2, power: 1.12, pref: 150, stats: [5, 4, 5], hpMul: 1.3,
    boss: true, shadow: true,
    specials: [{ name: "Soya o'qi", kind: 'proj', desc: "Qora alanga o'qi", color: '#b46bff' },
               { name: 'Soya qadami', kind: 'teleport', desc: "Soyaga aylanib, orqangizda paydo bo'ladi" },
               { name: "Soya bolg'asi", kind: 'stomp', desc: "Yerni yorib, soya to'lqinini yuboradi" }], ai: { aggr: .05, block: .05, punish: .1 },
    chains: { jab: { kick: 'kick' }, kick: { heavy: 'hook' } }, sig: 'Soya tishi: Yengil → Tepish → Kuchli',
    skin: '#101018', hair: '#05050a', hairStyle: 'long', top: null, shorts: '#08080e', gloves: '#1a0f2a', trim: '#b46bff', glow: '#b46bff',
    alt: {} },
];
for (const f of FIGHTERS) { f.special = f.specials[0]; f.special2 = f.specials[1]; }

// Stansiyada paydo bo'ladigan qurollar (Maxsus emas — Ushlash bilan olinadi)
const ITEMS = {
  tayoq: { name: 'Tayoq', reach: 1.35, dmg: 1.15, color: '#8a5a2b' },
  kastet: { name: 'Kastet', reach: 1.0, dmg: 1.4, color: '#c9ced6' },
  nunchaku: { name: 'Nunchaku', reach: 1.2, dmg: 1.2, color: '#2b2b2b' },
};

// Zarbalar: start/act/rec — kadrlar (60 kadr = 1 soniya), st — nafas narxi
const ATK = {
  jab:   { start: 4, act: 4, rec: 9,  dmg: 4,  range: 82,  stun: 15, kb: 3,  st: 3,  pose: 'punch', kind: 'light', arm: true },
  cross: { start: 5, act: 4, rec: 12, dmg: 5,  range: 86,  stun: 18, kb: 4,  st: 4,  pose: 'cross', kind: 'light', arm: true },
  body:  { start: 5, act: 4, rec: 12, dmg: 6,  range: 80,  stun: 20, kb: 2,  st: 5,  pose: 'body',  kind: 'light', arm: true },
  cjab:  { start: 4, act: 4, rec: 10, dmg: 3,  range: 80,  stun: 14, kb: 2,  st: 3,  pose: 'cjab',  kind: 'low', low: true, arm: true },
  heavy: { start: 11, act: 5, rec: 20, dmg: 11, range: 94, stun: 24, kb: 9,  st: 14, pose: 'heavyp', kind: 'heavy', heavy: true, arm: true },
  hook:  { start: 7, act: 5, rec: 20, dmg: 11, range: 90,  stun: 0,  kb: 11, st: 10, pose: 'hook',  kind: 'heavy', kd: true, heavy: true, combo: 'Metro zanjiri', arm: true },
  hammer:{ start: 9, act: 5, rec: 20, dmg: 13, range: 86,  stun: 0,  kb: 6,  st: 10, pose: 'hammer', kind: 'heavy', kd: true, heavy: true, combo: "Polvon bolg'asi", arm: true },
  baton2:{ start: 10, act: 5, rec: 22, dmg: 14, range: 96, stun: 0,  kb: 8,  st: 10, pose: 'hammer', kind: 'heavy', kd: true, heavy: true, high: true, combo: "Tartib o'rnatish", arm: true },
  upper: { start: 7, act: 4, rec: 18, dmg: 9,  range: 74,  stun: 0,  kb: 3,  st: 12, pose: 'upper', kind: 'heavy', launch: true, anti: true, arm: true },
  kick:  { start: 8, act: 5, rec: 15, dmg: 8,  range: 106, stun: 20, kb: 7,  st: 7,  pose: 'kick',  kind: 'kick' },
  kick2: { start: 6, act: 4, rec: 13, dmg: 6,  range: 104, stun: 20, kb: 5,  st: 5,  pose: 'kickh', kind: 'kick' },
  round: { start: 7, act: 5, rec: 18, dmg: 12, range: 108, stun: 0,  kb: 10, st: 8,  pose: 'round', kind: 'kick', kd: true, heavy: true, combo: "Bo'ron tepki" },
  flipk: { start: 6, act: 6, rec: 18, dmg: 12, range: 96,  stun: 0,  kb: 5,  st: 9,  pose: 'round', kind: 'kick', launch: true, heavy: true, combo: 'Lochin changali' },
  trip:  { start: 6, act: 5, rec: 18, dmg: 8,  range: 96,  stun: 0,  kb: 3,  st: 7,  pose: 'sweep', kind: 'low', kd: true, low: true, combo: 'Kurash chalishi' },
  chainsweep: { start: 9, act: 6, rec: 20, dmg: 11, range: 128, stun: 0, kb: 4, st: 9, pose: 'sweep', kind: 'low', kd: true, low: true, heavy: true, combo: 'Temir halqa', arm: true },
  elbow: { start: 6, act: 4, rec: 18, dmg: 11, range: 72, stun: 0, kb: 7, st: 9, pose: 'hook', kind: 'heavy', kd: true, heavy: true, anti: true, combo: 'Sher bosimi', arm: true },
  shadowkick: { start: 7, act: 5, rec: 20, dmg: 11, range: 112, stun: 0, kb: 9, st: 10, pose: 'kickh', kind: 'kick', kd: true, heavy: true, high: true, combo: 'Tuman izi' },
  sweep: { start: 8, act: 5, rec: 18, dmg: 6,  range: 112, stun: 0,  kb: 3,  st: 7,  pose: 'sweep', kind: 'low', kd: true, low: true },
  jkick: { start: 3, act: 12, rec: 2, dmg: 8,  range: 96,  stun: 20, kb: 6,  st: 6,  pose: 'jkick', kind: 'kick', high: true },
};
const CHAIN = { jab: { punch: 'cross', heavy: 'heavy' }, cross: { heavy: 'hook' }, heavy: { kick: 'round' }, cjab: { kick: 'sweep' } };
function chainsFor(def, name) { return Object.assign({}, CHAIN[name], def.chains && def.chains[name]); }

// Pozalar: burchaklar "pastga" yo'nalishdan, musbat = yuz tomonga
const POSES = {
  idle:   { lean: .12, ua1: .55, la1: 2.7, ua2: .35, la2: 2.9, th1: .35, sh1: .05, th2: -.3, sh2: -.05, rot: 0 },
  walk:   { lean: .15, ua1: .55, la1: 2.7, ua2: .35, la2: 2.9, th1: .35, sh1: .05, th2: -.3, sh2: -.05, rot: 0 },
  crouch: { lean: .4, ua1: .8, la1: 2.6, ua2: .55, la2: 2.8, th1: 1.35, sh1: -.2, th2: .5, sh2: -1.3, rot: 0 },
  block:  { lean: -.05, ua1: 1.1, la1: 3.05, ua2: .95, la2: 3.1, th1: .3, sh1: .05, th2: -.3, sh2: -.05, rot: 0 },
  cblock: { lean: .3, ua1: 1.1, la1: 3.0, ua2: .95, la2: 3.05, th1: 1.35, sh1: -.2, th2: .5, sh2: -1.3, rot: 0 },
  punch:  { lean: .25, ua1: 1.57, la1: 1.6, ua2: .35, la2: 2.9, th1: .45, sh1: .1, th2: -.45, sh2: -.1, rot: 0 },
  cross:  { lean: .4, ua1: .5, la1: 2.7, ua2: 1.57, la2: 1.6, th1: .5, sh1: .1, th2: -.5, sh2: -.15, rot: 0 },
  body:   { lean: .65, ua1: 1.3, la1: 1.45, ua2: .5, la2: 2.8, th1: .75, sh1: -.05, th2: -.6, sh2: -.25, rot: 0 },
  cjab:   { lean: .45, ua1: 1.5, la1: 1.55, ua2: .55, la2: 2.8, th1: 1.35, sh1: -.2, th2: .5, sh2: -1.3, rot: 0 },
  heavyp: { lean: .6, ua1: .4, la1: 2.6, ua2: 1.62, la2: 1.62, th1: .75, sh1: .05, th2: -.65, sh2: -.25, rot: 0 },
  hook:   { lean: .5, ua1: 1.9, la1: 1.1, ua2: .3, la2: 2.8, th1: .55, sh1: .1, th2: -.5, sh2: -.15, rot: 0 },
  hammer: { lean: .55, ua1: 1.4, la1: 1.0, ua2: 1.3, la2: 1.05, th1: .6, sh1: .05, th2: -.55, sh2: -.2, rot: 0 },
  raise:  { lean: -.25, ua1: 2.9, la1: 3.0, ua2: 2.7, la2: 3.0, th1: .35, sh1: .05, th2: -.35, sh2: -.05, rot: 0 },
  upper:  { lean: .05, ua1: 1.3, la1: 3.0, ua2: .4, la2: 2.8, th1: .6, sh1: -.1, th2: -.4, sh2: -.3, rot: 0 },
  kick:   { lean: -.3, ua1: .7, la1: 2.6, ua2: .3, la2: 2.6, th1: 1.6, sh1: 1.6, th2: -.15, sh2: 0, rot: 0 },
  kickh:  { lean: -.4, ua1: .8, la1: 2.4, ua2: .2, la2: 2.4, th1: 2.1, sh1: 2.3, th2: -.1, sh2: 0, rot: 0 },
  round:  { lean: -.45, ua1: 1.0, la1: 2.0, ua2: -.3, la2: 1.0, th1: 1.85, sh1: 2.0, th2: -.1, sh2: 0, rot: 0 },
  sweep:  { lean: .6, ua1: .3, la1: .3, ua2: -.3, la2: -.2, th1: 1.6, sh1: 1.55, th2: .9, sh2: -1.5, rot: 0 },
  jump:   { lean: .1, ua1: .9, la1: 2.4, ua2: .6, la2: 2.6, th1: 1.0, sh1: -.5, th2: .2, sh2: -1.2, rot: 0 },
  jkick:  { lean: -.2, ua1: .9, la1: 2.4, ua2: .4, la2: 2.0, th1: 1.3, sh1: 1.35, th2: .3, sh2: -1.1, rot: 0 },
  dive:   { lean: .5, ua1: -.4, la1: .2, ua2: -.7, la2: -.2, th1: 1.0, sh1: .9, th2: .3, sh2: -1.0, rot: .5 },
  hit:    { lean: -.4, ua1: .2, la1: 1.0, ua2: -.3, la2: .6, th1: .2, sh1: .1, th2: -.4, sh2: -.2, rot: 0 },
  air:    { lean: -.6, ua1: -.6, la1: -.4, ua2: -1.0, la2: -.8, th1: .6, sh1: .2, th2: .2, sh2: -.3, rot: -.6 },
  down:   { lean: 0, ua1: -.4, la1: -.2, ua2: -.8, la2: -.5, th1: .1, sh1: 0, th2: -.1, sh2: 0, rot: -1.57, lift: 9 },
  getup:  { lean: .4, ua1: .6, la1: 2.0, ua2: .2, la2: 1.0, th1: 1.3, sh1: -.4, th2: .6, sh2: -1.4, rot: 0 },
  grab:   { lean: .35, ua1: 1.5, la1: 1.8, ua2: 1.4, la2: 1.9, th1: .45, sh1: .1, th2: -.45, sh2: -.1, rot: 0 },
  clinchA:{ lean: .45, ua1: 1.45, la1: 2.3, ua2: 1.35, la2: 2.2, th1: .4, sh1: .1, th2: -.45, sh2: -.15, rot: 0 },
  clinchD:{ lean: .35, ua1: 1.2, la1: 2.6, ua2: 1.0, la2: 2.6, th1: .3, sh1: .05, th2: -.4, sh2: -.1, rot: 0 },
  knee:   { lean: .55, ua1: 1.45, la1: 2.3, ua2: 1.35, la2: 2.2, th1: 1.5, sh1: -.1, th2: -.3, sh2: -.05, rot: 0 },
  shoot:  { lean: 1.05, ua1: 1.6, la1: 1.6, ua2: 1.5, la2: 1.5, th1: 1.0, sh1: -.4, th2: -.7, sh2: -.4, rot: 0 },
  gtop:   { lean: .25, ua1: .9, la1: 2.5, ua2: .7, la2: 2.6, th1: 1.3, sh1: -1.55, th2: 1.1, sh2: -1.6, rot: 0 },
  pound:  { lean: .6, ua1: 1.1, la1: .4, ua2: .7, la2: 2.6, th1: 1.3, sh1: -1.55, th2: 1.1, sh2: -1.6, rot: 0 },
  chokeT: { lean: .75, ua1: 1.3, la1: 2.2, ua2: 1.2, la2: 2.1, th1: 1.3, sh1: -1.55, th2: 1.1, sh2: -1.6, rot: 0 },
  gbot:   { lean: 0, ua1: 1.1, la1: 2.8, ua2: .9, la2: 2.9, th1: .7, sh1: -.4, th2: .4, sh2: -.6, rot: -1.57, lift: 9 },
  chokeB: { lean: 0, ua1: 2.2, la1: 2.9, ua2: 2.0, la2: 3.0, th1: .9, sh1: .3, th2: .3, sh2: -.2, rot: -1.45, lift: 9 },
  stomp1: { lean: -.1, ua1: 1.2, la1: 2.0, ua2: -.5, la2: .4, th1: 1.7, sh1: .2, th2: 0, sh2: 0, rot: 0 },
  stomp2: { lean: .3, ua1: .3, la1: .5, ua2: -.3, la2: .2, th1: .8, sh1: -.1, th2: -.7, sh2: -.3, rot: 0 },
  dash:   { lean: -.2, ua1: .2, la1: .4, ua2: -.4, la2: .1, th1: 1.62, sh1: 1.62, th2: -.4, sh2: -.2, rot: 0 },
  charge: { lean: .5, ua1: .3, la1: 2.0, ua2: .3, la2: 2.6, th1: 1.2, sh1: -.3, th2: .4, sh2: -1.2, rot: 0 },
  spin:   { lean: -.2, ua1: 2.6, la1: 3.0, ua2: 2.5, la2: 3.0, th1: .4, sh1: 0, th2: -.4, sh2: 0, rot: 0 },
  cast:   { lean: .3, ua1: 1.55, la1: 1.55, ua2: 1.45, la2: 1.5, th1: .55, sh1: .05, th2: -.5, sh2: -.15, rot: 0 },
  stance: { lean: -.1, ua1: 1.3, la1: 2.4, ua2: .2, la2: 2.9, th1: .45, sh1: .05, th2: -.5, sh2: -.1, rot: 0 },
  thrown: { lean: 0, ua1: 2.6, la1: 2.8, ua2: 2.3, la2: 2.9, th1: .5, sh1: .3, th2: -.2, sh2: 0, rot: 0 },
  dizzy:  { lean: -.2, ua1: .1, la1: .2, ua2: -.1, la2: .1, th1: .25, sh1: .1, th2: -.25, sh2: -.05, rot: 0 },
  win:    { lean: -.05, ua1: 2.9, la1: 3.1, ua2: .3, la2: 2.9, th1: .25, sh1: 0, th2: -.25, sh2: 0, rot: 0 },
};

const POSE_KEYS = ['lean', 'ua1', 'la1', 'ua2', 'la2', 'th1', 'sh1', 'th2', 'sh2', 'rot', 'lift'];
const NOHIT = new Set(['down', 'getup', 'ko', 'gone', 'fin', 'thrown', 'held', 'superHit']);
const GRABBABLE = new Set(['idle', 'walk', 'crouch', 'block', 'blockstun', 'attack', 'grab', 'shootmiss']);
let MIN_X = 70, MAX_X = W - 70; // bekatga qarab o'zgaradi (platforma kengligi)

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

class Fighter {
  constructor(def, side, ctrl, altColors) {
    this.def = Object.assign({}, def, altColors ? def.alt : {});
    this.side = side; this.ctrl = ctrl;
    this.wins = 0; this.maxHp = 100 * (def.hpMul || 1);
    this.usage = { light: 0, heavy: 0, kick: 0, low: 0, grab: 0, shoot: 0, jump: 0, special: 0 };
    this.stats = { hits: 0, maxCombo: 0, supers: 0 };
    this.meter = 0;
    this.reset();
  }

  reset() {
    const mid = (MIN_X + MAX_X) / 2;
    this.x = this.side === 0 ? mid - 230 : mid + 230;
    this.y = GROUND; this.vx = 0; this.vy = 0;
    this.face = this.side === 0 ? 1 : -1;
    this.hp = this.maxHp; this.hpTrail = this.maxHp; this.st = 100;
    this.state = 'idle'; this.t = 0; this.stun = 0;
    this.atk = null; this.af = 0; this.hitDone = false; this.atkId = 0; this.atkName = '';
    this.combo = 0; this.rep = { name: '', n: 0, t: 0 }; this.buf = null;
    this.invuln = 0; this.flash = 0; this.specialCd = 0; this.crouching = false;
    this.parryT = 0; this.parryCd = 0; this.bounced = false; this.lastAtt = null;
    this.pose = Object.assign({ lift: 0 }, POSES.idle);
    this.thrower = null; this.curSp = null; this.hidden = false; this.trail = []; this.item = null; this.wallJumped = false;
  }

  get airborne() { return this.y < GROUND - 0.5; }
  set(s) { if (this.state !== s) { this.state = s; this.t = 0; this.bounced = false; } }
  use(k) { this.usage[k]++; }
  gainMeter(v) { this.meter = Math.min(100, this.meter + v); }

  step(inp, o, g) {
    const f = this;
    f.t++;
    if (f.flash > 0) f.flash--;
    if (f.invuln > 0) f.invuln--;
    if (f.specialCd > 0) f.specialCd--;
    if (f.parryT > 0) f.parryT--;
    if (f.parryCd > 0) f.parryCd--;
    if (f.rep.t > 0) f.rep.t--;
    if (f.item && --f.item.t <= 0) f.item = null;
    f.hpTrail += (f.hp - f.hpTrail) * 0.05;
    const regen = { idle: 0.45, crouch: 0.35, walk: 0.2, block: 0.08, jump: 0.1 }[f.state];
    if (regen) f.st = Math.min(100, f.st + regen);
    if (g.grapple && (g.grapple.a === f || g.grapple.d === f)) return;
    const free = f.state === 'idle' || f.state === 'walk' || f.state === 'crouch' || f.state === 'block';
    if (free && !f.airborne && o.state !== 'thrown') f.face = o.x > f.x ? 1 : -1;

    // Uzish: Soya kuchining yarmi evaziga zarbalar zanjirini uzish
    if (f.state === 'hit' && inp.press.block && f.meter >= 50 && g.phase === 'fight') {
      f.meter -= 50; f.set('idle'); f.invuln = 20;
      o.vx = o.face * -14; if (o.state === 'attack' || o.state === 'hit') { o.set('hit'); o.stun = 18; }
      Sfx.parry(); g.ring(f.x, GROUND - 120, '#b46bff', 90); g.say('UZISH!', f.x, GROUND - 250, '#d7a6ff', 30);
      return f.physics(g);
    }

    switch (f.state) {
      case 'idle': case 'walk': case 'crouch': case 'block':
        f.neutral(inp, o, g); break;
      case 'jump':
        if (inp.press.kick && !f.usedAir) { f.usedAir = true; f.startAtk('jkick', g, 'jatk'); }
        // devordan sakrash
        else if (inp.press.up && !f.wallJumped && (f.x <= MIN_X + 3 || f.x >= MAX_X - 3)) {
          f.wallJumped = true; f.vy = -13.5; f.vx = (f.x <= MIN_X + 3 ? 1 : -1) * 7.5; f.face = f.vx > 0 ? 1 : -1; f.usedAir = false;
          Sfx.whoosh(); g.sparks(f.x, f.y - 60, 6, '#ccc'); g.say('Devordan sakrash!', f.x, GROUND - 260, '#9cf', 18);
        }
        break;
      case 'attack': case 'jatk': {
        const A = f.atk; f.af++;
        if (f.af === A.start) Sfx.whoosh();
        if (f.af >= A.start && f.af < A.start + A.act && !f.hitDone) tryHit(f, o, A, g);
        const ch = f.state === 'attack' && chainsFor(f.def, f.atkName);
        if (ch) { for (const btn in ch) if (inp.press[btn]) f.buf = { btn, t: 10 }; if (inp.press.special) f.buf = { btn: 'special', t: 10 }; }
        if (f.buf && --f.buf.t <= 0) f.buf = null;
        if (ch && f.hitDone && f.af >= A.start + A.act && f.buf) {
          // zarba tekkandan keyin maxsus usul bilan bekor qilish ham mumkin
          if (f.buf.btn === 'special' && f.st >= 30 && f.specialCd <= 0) { f.buf = null; f.startSpecial(g, f.spIdx(inp)); break; }
          if (ch[f.buf.btn]) { const nx = ch[f.buf.btn]; f.buf = null; f.startAtk(nx, g, 'attack', true); if (f.atk !== A) break; }
        }
        if (f.state === 'attack' && f.af >= A.start + A.act + A.rec) f.set('idle');
        break;
      }
      case 'hit': if (f.t >= f.stun) f.set('idle'); break;
      case 'blockstun': if (f.t >= f.stun) f.set(inp.held.block ? 'block' : 'idle'); break;
      case 'down': if (f.t >= 48 && (g.phase === 'fight' || g.phase === 'practice')) { f.set('getup'); f.invuln = 26; } break;
      case 'getup': if (f.t >= 22) f.set('idle'); break;
      case 'grab':
        if (f.t === 5) {
          const dist = Math.abs(o.x - f.x);
          if (dist < 95 && !o.airborne && o.invuln <= 0 && GRABBABLE.has(o.state) && !g.grapple) {
            if (o.state === 'grab' && o.t <= 6) {
              f.set('hit'); f.stun = 12; o.set('hit'); o.stun = 12;
              f.vx = -f.face * 6; o.vx = -o.face * 6; Sfx.block(); g.say('Ushlash qaytarildi!', (f.x + o.x) / 2, 420, '#9cf');
            } else startGrapple(g, 'clinch', f, o);
          }
        }
        if (f.state === 'grab' && f.t >= 26) f.set('idle');
        break;
      case 'shoot':
        if (f.t < 18) {
          f.vx = f.face * 10.5;
          const dx = (o.x - f.x) * f.face;
          if (dx > 0 && dx < 72 && !o.airborne && o.invuln <= 0 && (GRABBABLE.has(o.state) || o.state === 'hit') && !g.grapple) {
            if (o.state === 'block' && o.crouching) {
              f.set('hit'); f.stun = 38; f.vx = -f.face * 3; o.st = Math.min(100, o.st + 10);
              Sfx.block(); g.say('Sprol! Yiqitish qaytarildi', o.x, 430, '#9cf');
            } else startGrapple(g, 'ground', f, o);
          }
        } else f.set('shootmiss');
        break;
      case 'shootmiss': if (f.t >= 26) f.set('idle'); break;
      case 'special': f.stepSpecial(o, g); break;
      case 'super': f.stepSuper(o, g); break;
      case 'thrown': {
        const a = f.thrower, p = Math.min(1, f.t / 34);
        f.x = clamp(a.x + a.face * Math.cos(Math.PI * p) * 70, MIN_X, MAX_X);
        f.y = GROUND - Math.sin(Math.PI * p) * 150;
        f.vx = 0; f.vy = 0;
        if (f.t >= 34) {
          f.y = GROUND; f.set('down'); g.shake = 14; Sfx.heavy(); g.dust(f.x);
          a.set('idle');
          dealDamage(g, a, f, 15 * a.def.power);
        }
        break;
      }
      case 'held': {
        const a = f.thrower;
        f.x = clamp(a.x + a.face * 46, MIN_X, MAX_X); f.vx = 0; f.face = -a.face;
        if (f.t >= 46) { f.set('down'); f.vx = a.face * 6; Sfx.thud(); g.dust(f.x); a.set('idle'); }
        break;
      }
      default: break; // dizzy, ko, win, fin, gone, air, superHit
    }
    f.physics(g);
  }

  neutral(inp, o, g) {
    const f = this;
    if (g.phase !== 'fight' && g.phase !== 'tugat') { f.set('idle'); f.vx = 0; return; }
    if (inp.press.block && f.parryCd <= 0) { f.parryT = 7; f.parryCd = 28; }
    // Soya zarbasi: Kuchli tugmani bosib turib Maxsus (shkala to'la bo'lsa)
    if (inp.press.special && (inp.held.heavy || inp.press.heavy) && f.meter >= 100) return f.startSuper(g);
    if (inp.press.special) {
      if (f.st >= 30 && f.specialCd <= 0) return f.startSpecial(g, f.spIdx(inp));
      return f.tired(g);
    }
    if (inp.press.grab && g.items) {
      const it = g.items.find(i => Math.abs(i.x - f.x) < 45);
      if (it && Math.abs(o.x - f.x) > 100) { g.items = g.items.filter(i => i !== it); f.item = { kind: it.kind, t: 900 }; Sfx.grab(); g.say(ITEMS[it.kind].name + ' olindi!', f.x, GROUND - 230, '#ffde59', 22); return; }
    }
    if (inp.press.grab) {
      if (inp.held.down) { if (f.st < 14) return f.tired(g); f.st -= 12; f.use('shoot'); f.set('shoot'); Sfx.whoosh(); return; }
      if (f.st < 8) return f.tired(g);
      f.st -= 6; f.use('grab'); f.set('grab'); return;
    }
    if (inp.press.heavy) return f.startAtk(inp.held.down ? 'upper' : 'heavy', g);
    if (inp.press.punch) return f.startAtk(inp.held.down ? 'cjab' : 'jab', g);
    if (inp.press.kick) return f.startAtk(inp.held.down ? 'sweep' : 'kick', g);
    const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
    if (inp.press.up && !inp.held.block) {
      f.use('jump'); f.set('jump'); f.usedAir = false; f.vy = -15.5; f.vx = dir * f.def.speed * 1.1; f.crouching = false;
      g.dust(f.x, 4); return;
    }
    if (inp.held.block) { f.set('block'); f.crouching = !!inp.held.down; f.vx = 0; return; }
    if (inp.held.down) { f.set('crouch'); f.crouching = true; f.vx = 0; return; }
    f.crouching = false;
    if (dir) { f.set('walk'); f.vx = dir * f.def.speed * (dir === f.face ? 1 : 0.75); }
    else f.set('idle');
  }

  spIdx(inp) { return inp.held.down ? 1 : inp.held[this.face > 0 ? 'left' : 'right'] ? 2 : 0; }

  tired(g) {
    if (g.t - (this.tiredAt || -99) > 45) { this.tiredAt = g.t; g.say('Nafas yetmayapti!', this.x, GROUND - 240, '#9fd3ff', 18); }
  }

  startAtk(name, g, state = 'attack', chained = false) {
    const A = ATK[name];
    if (!chained) {
      if (this.rep.name === name && this.rep.t > 0) this.rep.n++; else this.rep = { name, n: 0, t: 0 };
      this.rep.t = 70;
    }
    const cost = A.st * (1 + this.rep.n * 0.3);
    if (this.st < cost && A.st >= 7) return this.tired(g);
    if (this.rep.n === 3) g.say('Takror zarba kuchsizlanyapti', this.x, GROUND - 250, '#ccc', 16);
    this.buf = null;
    this.atk = A; this.af = 0; this.hitDone = false; this.atkId++; this.atkName = name;
    this.use(A.kind);
    this.st = Math.max(0, this.st - cost);
    if (state === 'attack') { this.set('attack'); this.t = 0; this.vx *= 0.3; } else this.state = state;
    if (A.heavy && Math.random() < 0.6) Sfx.voice('kiai', this.def.size > 1.05 ? 0.75 : this.def.size < 0.97 ? 1.3 : 1);
  }

  startSpecial(g, idx) {
    const sp = this.def.specials[idx] || this.def.specials[0];
    this.curSp = sp;
    this.st -= 30; this.specialCd = 70; this.hitDone = false; this.atkId++; this.use('special');
    this.set('special'); this.atkName = 'special'; this.hits = 0; Sfx.special(); Sfx.voice('kiai', this.def.size > 1.05 ? 0.75 : this.def.size < 0.97 ? 1.3 : 1);
    g.say(sp.name + '!', this.x, GROUND - 230, '#ffde59', 30);
  }

  startSuper(g) {
    this.meter = 0; this.curSp = { kind: 'super' }; this.hitDone = false; this.atkId++;
    this.set('super'); this.invuln = 16; this.stats.supers++;
    g.superFlash = 30; Sfx.superStart(); g.camShake(200, 0.006);
    g.say('SOYA ZARBASI!', this.x, GROUND - 260, '#d7a6ff', 36);
  }

  stepSuper(o, g) {
    const f = this, t = f.t;
    if (t >= 12 && t < 30 && !f.hitDone) {
      f.vx = f.face * 17;
      if (t % 3 === 0) g.afterimage(f);
      const dx = (o.x - f.x) * f.face;
      if (dx > -10 && dx < 80 && o.invuln <= 0 && !NOHIT.has(o.state) && !g.grapple) {
        f.hitDone = true; f.vx = 0;
        const blocked = (o.state === 'block' || o.state === 'blockstun') && (f.x - o.x) * o.face > 0;
        if (blocked) { applyHit(f, o, { dmg: 8, kb: 10, heavy: true }, g); }
        else { g.superSeq = { a: f, d: o, t: 0 }; o.set('superHit'); o.vx = 0; Sfx.heavy(); }
      }
    }
    if (t >= 30 && !g.superSeq) f.vx *= 0.7;
    if (t >= 48 && !g.superSeq) f.set('idle');
  }

  stepSpecial(o, g) {
    const f = this, sp = f.curSp, k = sp.kind, t = f.t, face = f.face;
    const dist = Math.abs(o.x - f.x);
    const canGrab = () => dist < 105 && !o.airborne && o.invuln <= 0 && (GRABBABLE.has(o.state) || o.state === 'hit') && !g.grapple;
    switch (k) {
      case 'stomp':
        if (t === 18) { Sfx.stomp(); g.shake = 14; g.camShake(160, 0.008); g.dust(f.x + face * 30, 10); g.projs.push({ kind: 'wave', x: f.x + face * 50, dir: face, owner: f, life: 75, speed: 9, dmg: 12, kd: true }); }
        if (t >= 42) f.set('idle'); break;
      case 'dash':
        if (t >= 8 && t < 26 && !f.hitDone) {
          f.vx = face * 15; if (t % 3 === 0) g.afterimage(f);
          tryHit(f, o, { dmg: 12, range: 78, stun: 0, kb: 13, kd: true, heavy: true }, g);
          if (f.hitDone) f.vx = 0;
        }
        if (t >= 40) f.set('idle'); break;
      case 'upper':
        if (t >= 12 && t < 19 && !f.hitDone) tryHit(f, o, { dmg: 15, range: 88, stun: 0, kb: 4, launch: true, heavy: true, anti: true }, g);
        if (t >= 42) f.set('idle'); break;
      case 'spin':
        if (t === 7 && canGrab()) { o.set('thrown'); o.thrower = f; f.hitDone = true; Sfx.grab(); }
        if (!f.hitDone && t >= 34) f.set('idle');
        if (f.hitDone && o.state !== 'thrown' && t > 10) f.set('idle');
        break;
      case 'hug':
        if (t === 6 && canGrab()) { o.set('held'); o.thrower = f; f.hitDone = true; Sfx.grab(); g.say("Quchoq!", o.x, GROUND - 230, '#ff8c5a'); }
        if (f.hitDone && o.state === 'held' && t % 10 === 0) { Sfx.hit(1); g.sparks(o.x, GROUND - 130, 8, '#ffd27a'); o.flash = 4; g.shake = 5; dealDamage(g, f, o, 3.2 * f.def.power); }
        if (!f.hitDone && t >= 32) f.set('idle');
        if (f.hitDone && o.state !== 'held' && t > 10) f.set('idle');
        break;
      case 'scissor':
        if (t === 6) { f.vy = -13; f.vx = face * 7; }
        if (t >= 12 && f.airborne && !f.hitDone) tryHit(f, o, { dmg: 12, range: 88, stun: 0, kb: 8, kd: true, heavy: true, high: true }, g);
        if (t > 8 && !f.airborne && t >= 30) f.set('idle'); break;
      case 'counter':
        if (t >= 46) f.set('idle'); break;
      case 'gust':
        if (t === 12) { Sfx.whoosh(); g.projs.push({ kind: 'gust', x: f.x + face * 50, dir: face, owner: f, life: 60, speed: 11, dmg: 5, kb: 16, stun: 22 }); }
        if (t >= 34) f.set('idle'); break;
      case 'dive':
        if (t === 4) { f.vy = -14; f.vx = face * 4; g.dust(f.x, 6); }
        if (t >= 16 && f.airborne) { f.vx = face * 11; f.vy = Math.max(f.vy, 9); if (!f.hitDone) tryHit(f, o, { dmg: 13, range: 82, stun: 0, kb: 9, kd: true, heavy: true, high: true, anti: true }, g); }
        if (t > 6 && !f.airborne && t >= 24) { if (t === 24 || f.t0Land === undefined) { g.dust(f.x, 8); f.t0Land = t; } if (t >= 40) { f.t0Land = undefined; f.set('idle'); } }
        break;
      case 'flip':
        if (t === 3) { f.vy = -11; f.vx = -face * 3; }
        if (t >= 4 && t < 18 && !f.hitDone) tryHit(f, o, { dmg: 11, range: 84, stun: 0, kb: 4, launch: true, heavy: true, anti: true }, g);
        if (t > 6 && !f.airborne && t >= 36) f.set('idle'); break;
      case 'lash':
        if (t >= 10 && t < 17 && !f.hitDone) {
          tryHit(f, o, { dmg: 9, range: 235, stun: 28, kb: -3, heavy: false }, g);
          if (f.hitDone && o.state === 'hit') { o.x = clamp(f.x + face * 85, MIN_X, MAX_X); g.say('Tortib oldi!', o.x, GROUND - 220, '#ccc'); }
        }
        if (t >= 38) f.set('idle'); break;
      case 'whirl':
        if (t >= 8 && t <= 44 && (t - 8) % 9 === 0) { f.hitDone = false; Sfx.whoosh(); tryHit(f, o, { dmg: 4, range: 115, stun: 14, kb: 2 }, g); }
        if (t >= 52) f.set('idle'); break;
      case 'proj':
        if (t === 12) { Sfx.zap(); g.projs.push({ kind: 'orb', x: f.x + face * 55, y: GROUND - 120 * f.def.size, dir: face, owner: f, life: 110, speed: 10, dmg: 10, kb: 6, stun: 20, color: sp.color }); }
        if (t >= 32) f.set('idle'); break;
      case 'teleport':
        if (t === 6) { f.hidden = true; f.invuln = 18; g.sparks(f.x, GROUND - 120, 16, f.def.glow || '#fff'); Sfx.zap(); }
        if (t === 18) {
          f.x = clamp(o.x - o.face * 75, MIN_X, MAX_X); if (Math.abs(f.x - o.x) < 50) f.x = clamp(o.x + o.face * 75, MIN_X, MAX_X);
          f.face = o.x > f.x ? 1 : -1; f.hidden = false; g.sparks(f.x, GROUND - 120, 16, f.def.glow || '#fff');
        }
        if (t >= 30) f.set('idle'); break;
      case 'whistle':
        if (t === 12) {
          Sfx.whistle(); g.ring(f.x + face * 40, GROUND - 170, '#fff', 170);
          if (dist < 210 && !o.airborne && o.invuln <= 0 && !NOHIT.has(o.state) && !g.grapple) {
            const blk = o.state === 'block';
            o.set('hit'); o.stun = blk ? 16 : 48; o.vx = 0;
            if (!blk) g.say('Gangib qoldi!', o.x, GROUND - 240, '#ffde59', 24);
          }
        }
        if (t >= 34) f.set('idle'); break;
      case 'overhead':
        if (t >= 16 && t < 21 && !f.hitDone) tryHit(f, o, { dmg: 14, range: 100, stun: 0, kb: 8, kd: true, heavy: true, high: true, arm: true }, g);
        if (t >= 42) f.set('idle'); break;
      case 'takedown':
        if (t >= 7 && t < 23 && !f.hitDone) {
          f.vx = face * 10;
          if (t % 4 === 0) g.dust(f.x, 2);
          if (canGrab()) { startGrapple(g, 'ground', f, o); f.hitDone = true; f.vx = 0; }
        }
        if (t >= 38 && !g.grapple) f.set('idle'); break;
      case 'elbow':
        if (t >= 8 && t < 14 && !f.hitDone) tryHit(f, o, ATK.elbow, g);
        if (t >= 34) f.set('idle'); break;
      case 'veil':
        if (t === 5) { f.hidden = true; f.invuln = 18; g.sparks(f.x, GROUND - 120, 14, f.def.glow); Sfx.whoosh(); }
        if (t === 17) {
          f.x = clamp(o.x - o.face * 80, MIN_X, MAX_X);
          f.face = o.x > f.x ? 1 : -1; f.hidden = false;
          g.sparks(f.x, GROUND - 120, 18, f.def.glow); g.afterimage(f);
        }
        if (t >= 20 && t < 27 && !f.hitDone) tryHit(f, o, { dmg: 7, range: 84, stun: 22, kb: 5, high: true }, g);
        if (t >= 40) f.set('idle'); break;
      default: if (t >= 30) f.set('idle');
    }
  }

  physics(g) {
    const f = this;
    const wet = g.wet && f.x > g.wet[0] && f.x < g.wet[1];
    const sk = f.curSp && f.state === 'special' ? f.curSp.kind : '';
    if (f.state !== 'walk' && f.state !== 'shoot' && !f.airborne && sk !== 'dash' && f.state !== 'super') f.vx *= wet ? 0.95 : 0.78;
    if (f.state === 'thrown' || f.state === 'superHit') return;
    f.x += f.vx;
    if (f.airborne || f.vy < 0) {
      f.vy += 0.8; f.y += f.vy;
      if (f.y >= GROUND) {
        f.y = GROUND; f.vy = 0; f.wallJumped = false;
        if (f.state === 'jump' || f.state === 'jatk') { f.set('idle'); f.vx = 0; g.dust(f.x, 4); }
        else if (f.state === 'air') { if (f.item) { g.say(ITEMS[f.item.kind].name + ' tushib ketdi', f.x, GROUND - 200, '#ccc', 16); f.item = null; } f.set(f.koFall ? 'ko' : 'down'); Sfx.thud(); g.shake = Math.max(g.shake, 6); g.dust(f.x, 12); }
        else if (f.state === 'hit') f.set('idle');
        else if (f.state === 'special') f.vx *= 0.3;
      }
    }
    if ((f.x <= MIN_X || f.x >= MAX_X) && (f.state === 'air' || f.state === 'hit') && Math.abs(f.vx) > 6 && !f.bounced && g.phase === 'fight') {
      f.bounced = true; f.vx = -f.vx * 0.45;
      Sfx.heavy(); g.shake = 12; g.camShake(140, 0.006);
      g.say('Devorga urildi!', f.x, GROUND - 220, '#ff8c5a', 24);
      g.sparks(f.x, GROUND - 120, 12, '#ddd');
      if (f.lastAtt) dealDamage(g, f.lastAtt, f, 4);
    }
    f.x = clamp(f.x, MIN_X, MAX_X);
  }

  targetPose(g) {
    const f = this, s = f.state, G = g.grapple;
    if (G && G.a === f) {
      if (G.type === 'clinch') return G.actT > 0 ? POSES.knee : POSES.clinchA;
      if (G.type === 'choke' || G.type === 'armbar') return POSES.chokeT;
      return G.actT > 5 ? POSES.pound : POSES.gtop;
    }
    if (G && G.d === f) return G.type === 'clinch' ? POSES.clinchD : (G.type === 'choke' || G.type === 'armbar' ? POSES.chokeB : POSES.gbot);
    if (g.superSeq && g.superSeq.a === f) return f.finPose || POSES.punch;
    switch (s) {
      case 'walk': {
        const ph = Math.sin(f.t * 0.25 * (f.def.speed / 4));
        return Object.assign({}, POSES.walk, { th1: .35 + ph * .35, th2: -.3 - ph * .35, sh1: .05 - Math.max(0, ph) * .4, sh2: -.05 - Math.max(0, -ph) * .4, lean: .15 + Math.abs(ph) * .04 });
      }
      case 'idle': {
        const b = Math.sin(f.t * 0.08);
        return Object.assign({}, POSES.idle, { lean: .12 + b * .03, la1: 2.7 + b * .08, ua2: .35 - b * .05, th1: .35 + b * .03 });
      }
      case 'crouch': return POSES.crouch;
      case 'block': case 'blockstun': return f.crouching ? POSES.cblock : POSES.block;
      case 'attack': case 'jatk': return f.af < f.atk.start + f.atk.act ? (f.af < f.atk.start * 0.5 && f.atk.heavy ? POSES.charge : POSES[f.atk.pose]) : (f.state === 'jatk' ? POSES.jump : POSES.idle);
      case 'jump': return POSES.jump;
      case 'hit': case 'superHit': return POSES.hit;
      case 'air': return POSES.air;
      case 'down': case 'ko': case 'fin': case 'gone': return POSES.down;
      case 'getup': return POSES.getup;
      case 'grab': return POSES.grab;
      case 'shoot': case 'shootmiss': return POSES.shoot;
      case 'thrown': return Object.assign({}, POSES.thrown, { rot: -f.t * 0.2 });
      case 'held': return POSES.thrown;
      case 'dizzy': return Object.assign({}, POSES.dizzy, { lean: -.2 + Math.sin(f.t * 0.12) * .25 });
      case 'win': return POSES.win;
      case 'super': return f.t < 12 ? POSES.charge : f.hitDone ? POSES.cross : POSES.dash;
      case 'special': {
        const k = f.curSp.kind, t = f.t;
        if (k === 'stomp') return t < 18 ? POSES.stomp1 : POSES.stomp2;
        if (k === 'dash') return t < 8 ? POSES.charge : POSES.dash;
        if (k === 'upper') return t < 12 ? POSES.charge : POSES.upper;
        if (k === 'hug') return POSES.clinchA;
        if (k === 'scissor') return t < 6 ? POSES.crouch : POSES.jkick;
        if (k === 'counter') return POSES.stance;
        if (k === 'gust' || k === 'proj') return t < 10 ? POSES.charge : POSES.cast;
        if (k === 'dive') return t < 16 ? POSES.jump : f.airborne ? POSES.dive : POSES.crouch;
        if (k === 'flip') return Object.assign({}, POSES.kickh, { rot: f.airborne ? Math.min(1, t / 14) * -6.28 : 0 });
        if (k === 'lash') return t < 10 ? POSES.raise : POSES.punch;
        if (k === 'whirl') return Object.assign({}, POSES.spin, { ua1: 1.57, la1: 1.57 });
        if (k === 'teleport') return POSES.cast;
        if (k === 'veil') return t < 17 ? POSES.cast : POSES.punch;
        if (k === 'takedown') return POSES.shoot;
        if (k === 'elbow') return t < 8 ? POSES.charge : POSES.hook;
        if (k === 'whistle') return POSES.raise;
        if (k === 'overhead') return t < 16 ? POSES.raise : POSES.hammer;
        return POSES.spin;
      }
      case 'finA': return f.finPose || POSES.punch;
      default: return POSES.idle;
    }
  }

  draw(ctx, g) {
    const f = this;
    if (f.state === 'gone' || f.hidden) return;
    const T = f.targetPose(g);
    const fast = f.state === 'attack' || f.state === 'special' || f.state === 'jatk' || f.state === 'finA' || f.state === 'super' || (g.superSeq && g.superSeq.a === f);
    const k = fast ? 0.55 : 0.3;
    for (const key of POSE_KEYS) {
      const tv = T[key] || 0;
      if (key === 'rot' && (f.state === 'thrown' || (f.curSp && f.curSp.kind === 'flip' && f.state === 'special'))) f.pose.rot = tv;
      else f.pose[key] += (tv - (f.pose[key] || 0)) * k;
    }
    const ring = f.side === 0 ? '#3fa9ff' : '#ff4b4b';
    ctx.strokeStyle = ring; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(f.x, GROUND + 4, 50 * f.def.size, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (f.state === 'special' && f.curSp && f.curSp.kind === 'takedown' && f.t < 23) {
      ctx.strokeStyle = 'rgba(255,200,80,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(f.x + f.face * 75, GROUND + 2, 66, 13, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (f.state === 'special' && f.curSp && f.curSp.kind === 'veil') {
      ctx.strokeStyle = 'rgba(170,146,236,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y - 115, 62 + Math.sin(g.t * 0.3) * 6, 0, Math.PI * 2); ctx.stroke();
    }
    // aura: Soya kuchi to'la yoki xo'jayin
    if (f.def.shadow || f.meter >= 100) {
      const col = f.def.shadow ? 'rgba(150,80,255,' : 'rgba(200,140,255,';
      const r = 95 + Math.sin(g.t * 0.15) * 8;
      const gr = ctx.createRadialGradient(f.x, f.y - 110, 10, f.x, f.y - 110, r * 1.4);
      gr.addColorStop(0, col + '0.28)'); gr.addColorStop(1, col + '0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y - 110, r * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    // zarba izi (harakat chizig'i)
    if (f.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < f.trail.length; i++) {
        const a = f.trail[i - 1], b = f.trail[i];
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.07})`; ctx.lineWidth = 4 + i * 3;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    drawBody(ctx, f.def, f.pose, f.x, f.y, f.face, f.flash > 0, f.t, f.airborne, true, f);
    const pts = drawBody(ctx, f.def, f.pose, f.x, f.y, f.face, f.flash > 0, f.t, f.airborne, false, f);
    const striking = (f.state === 'attack' && f.af >= f.atk.start - 2 && f.af < f.atk.start + f.atk.act) || f.state === 'super' || (f.state === 'special' && f.t > 8 && f.t < 26);
    if (striking && pts) {
      const cand = [pts.ha1, pts.ha2, pts.ft1];
      let best = cand[0]; for (const c of cand) if ((c[0] - f.x) * f.face > (best[0] - f.x) * f.face) best = c;
      f.trail.push(best); if (f.trail.length > 6) f.trail.shift();
    } else if (f.trail.length) f.trail.shift();
    if (f.parryT > 0) { ctx.strokeStyle = 'rgba(120,220,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x + f.face * 30, f.y - 140, 40, -1.2, 1.2); ctx.stroke(); }
    if (f.state === 'special' && f.curSp.kind === 'counter') { ctx.strokeStyle = 'rgba(255,220,120,' + (0.5 + Math.sin(f.t) * 0.3) + ')'; ctx.lineWidth = 3; ctx.strokeRect(f.x - 45, f.y - 220, 90, 220); }
    if (g.phase !== 'finisher' && !NOHIT.has(f.state) && !g.grapple) {
      const lbl = f.ctrl instanceof Bot ? (f.def.boss ? 'XO\'JAYIN' : 'BOT') : (f.side === 0 ? '1P' : '2P');
      const ty = f.y - 238 * f.def.size;
      ctx.fillStyle = ring; ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, f.x, ty);
      ctx.beginPath(); ctx.moveTo(f.x - 6, ty + 10); ctx.lineTo(f.x + 6, ty + 10); ctx.lineTo(f.x, ty + 17); ctx.fill();
    }
  }
}

function limb(p, a, L, face) { return [p[0] + Math.sin(a) * L * face, p[1] + Math.cos(a) * L]; }

// Tanani chizish. outline=true — aniq siluet uchun qora kontur. Qo'l/oyoq uchlarining koordinatalarini qaytaradi.
function drawBody(ctx, d, P, x, y, face, flash, t, airborne, outline, f) {
  const s = d.size, ow = outline ? 5 : 0;
  const L = { th: 46 * s, sh: 44 * s, to: 62 * s, ua: 32 * s, fa: 30 * s, hd: 17 * s };
  const p = {};
  p.hip = [0, 0];
  p.neck = [Math.sin(P.lean) * L.to * face, -Math.cos(P.lean) * L.to];
  p.head = [p.neck[0] + Math.sin(P.lean) * (L.hd + 4) * face, p.neck[1] - Math.cos(P.lean) * (L.hd + 4)];
  p.sh = [p.neck[0] - Math.sin(P.lean) * 7 * face, p.neck[1] + Math.cos(P.lean) * 7];
  p.el1 = limb(p.sh, P.ua1, L.ua, face); p.ha1 = limb(p.el1, P.la1, L.fa, face);
  p.el2 = limb(p.sh, P.ua2, L.ua, face); p.ha2 = limb(p.el2, P.la2, L.fa, face);
  p.kn1 = limb(p.hip, P.th1, L.th, face); p.ft1 = limb(p.kn1, P.sh1, L.sh, face);
  p.kn2 = limb(p.hip, P.th2, L.th, face); p.ft2 = limb(p.kn2, P.sh2, L.sh, face);
  const th = (P.rot || 0) * face;
  let maxY = -999;
  for (const key in p) {
    if (th) { const [a, b] = p[key], c = Math.cos(th), sn = Math.sin(th); p[key] = [a * c - b * sn, a * sn + b * c]; }
    if (key !== 'head') maxY = Math.max(maxY, p[key][1]);
  }
  maxY = Math.max(maxY, p.head[1] + L.hd - 6);
  const hx = x, hy = y - maxY - 7 - (P.lift || 0);

  if (!outline) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 4, 46 * s * (airborne ? 0.6 : 1), 9, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save(); ctx.translate(hx, hy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const sh = !!d.shadow;
  const C = (c, k = 1) => outline ? (sh ? '#2a0f45' : '#07080c') : flash ? '#ffffff' : (k === 1 ? c : shade(c, k));
  const seg = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w + ow; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  // yorug'lik tushgan tomon — silindrsimon hajm hissi
  const hl = (a, b, w, c) => { if (outline || flash || sh) return; ctx.strokeStyle = c; ctx.lineWidth = w * 0.32; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(a[0] - w * 0.18, a[1] - w * 0.2); ctx.lineTo(b[0] - w * 0.18, b[1] - w * 0.2); ctx.stroke(); ctx.globalAlpha = 1; };
  const dot = (q, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q[0], q[1], r + ow / 2, 0, Math.PI * 2); ctx.fill(); };
  const mid = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const light = c => shade(c, 1.35);
  const leg = (kn, ft, k) => {
    seg(p.hip, kn, 16 * s, C(d.skin, k)); seg(kn, ft, 13 * s, C(d.skin, k));
    hl(p.hip, kn, 16 * s, light(d.skin)); hl(kn, ft, 13 * s, light(d.skin));
    if (!outline) {
      seg(p.hip, mid(p.hip, kn, 0.55), 19 * s, C(d.shorts, k));
      if (d.jacket || d.hoodie) seg(p.hip, mid(p.hip, kn, 0.95), 17 * s, C(d.shorts, k));
      if (d.jacket || d.hoodie) seg(kn, mid(kn, ft, 0.85), 14 * s, C(d.shorts, k));
    }
    dot(ft, 7 * s, C(d.jacket || d.hoodie ? '#1b1b1b' : d.skin, k * 0.9));
  };
  const weapon = (el, ha, k) => {
    const wk = f && f.item ? f.item.kind : d.weapon;
    if (!wk || outline) return;
    const dx = ha[0] - el[0], dy = ha[1] - el[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    if (wk === 'kastet') { ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ha[0], ha[1], 10 * s, 0, Math.PI * 2); ctx.stroke(); return; }
    if (wk === 'nunchaku') {
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ha[0], ha[1]); ctx.lineTo(ha[0] + ux * 26, ha[1] + uy * 26); ctx.stroke();
      ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ha[0] + ux * 26, ha[1] + uy * 26); ctx.lineTo(ha[0] + ux * 34 + 4, ha[1] + uy * 34 + 6); ctx.stroke();
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ha[0] + ux * 34 + 4, ha[1] + uy * 34 + 6); ctx.lineTo(ha[0] + ux * 58 + 6, ha[1] + uy * 58 + 14); ctx.stroke(); return;
    }
    if (wk === 'flag') {
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3; const tx = ha[0] + ux * 50 * s, ty = ha[1] + uy * 50 * s;
      ctx.beginPath(); ctx.moveTo(ha[0], ha[1]); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = '#f2c200'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - uy * 18 + ux * 4, ty + ux * 18 + uy * 4 + Math.sin((t || 0) * 0.4) * 3); ctx.lineTo(tx - ux * 16, ty - uy * 16); ctx.fill();
      if (f && f.state === 'special' && f.curSp.kind === 'lash' && f.t >= 8 && f.t < 22) { ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + ux * 150, ty + uy * 150); ctx.stroke(); }
      return;
    }
    if (wk === 'baton' || wk === 'tayoq' || wk === 'wrench') {
      const wc = wk === 'tayoq' ? '#8a5a2b' : wk === 'wrench' ? '#9aa0a8' : '#111', wl = wk === 'tayoq' ? 62 : 44;
      ctx.strokeStyle = wc; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(ha[0] - ux * 6, ha[1] - uy * 6); ctx.lineTo(ha[0] + ux * wl * s, ha[1] + uy * wl * s); ctx.stroke();
      if (wk === 'wrench') { ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ha[0] + ux * wl * s, ha[1] + uy * wl * s, 8, 0, Math.PI * 1.5); ctx.stroke(); }
      return;
    }
    if (wk === 'baton') {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(ha[0] - ux * 6, ha[1] - uy * 6); ctx.lineTo(ha[0] + ux * 44 * s, ha[1] + uy * 44 * s); ctx.stroke();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ha[0] + ux * 6, ha[1] + uy * 6 - 2); ctx.lineTo(ha[0] + ux * 40 * s, ha[1] + uy * 40 * s - 2); ctx.stroke();
    } else {
      const ext = f && f.state === 'special' && f.curSp.kind === 'lash' && f.t >= 8 && f.t < 22 ? 190 : (f && f.state === 'attack' && f.atk.arm && f.af < f.atk.start + f.atk.act ? 55 : 26);
      const sag = ext > 60 ? 6 : 16;
      ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(ha[0], ha[1]);
      ctx.quadraticCurveTo(ha[0] + ux * ext * 0.5, ha[1] + uy * ext * 0.5 + sag, ha[0] + ux * ext, ha[1] + uy * ext + (ext > 60 ? 0 : 12));
      ctx.stroke(); ctx.setLineDash([]);
      dot([ha[0] + ux * ext, ha[1] + uy * ext + (ext > 60 ? 0 : 12)], 4, '#c8ccd2');
    }
    void k;
  };
  const arm = (el, ha, k, front) => {
    seg(p.sh, el, 12 * s, C(d.jacket || d.hoodie ? d.top : d.skin, k)); seg(el, ha, 11 * s, C(d.jacket || d.hoodie ? d.top : d.skin, k));
    hl(p.sh, el, 12 * s, light(d.jacket || d.hoodie ? d.top : d.skin));
    if (!outline && (d.jacket || d.hoodie)) { const w = mid(el, ha, 0.8); seg(w, ha, 11 * s, C(d.skin, k)); }
    dot(ha, 9 * s, C(d.gloves, k));
    if (front) weapon(el, ha, k);
  };
  leg(p.kn2, p.ft2, 0.72);
  arm(p.el2, p.ha2, 0.72, false);
  seg(p.hip, p.neck, 30 * s, C(d.skin));
  if (!outline) {
    if (!d.top && !sh && !flash) {
      // ko'krak va qorin mushaklari
      ctx.strokeStyle = shade(d.skin, 0.72); ctx.lineWidth = 2;
      const c1 = mid(p.hip, p.neck, 0.72), c0 = mid(p.hip, p.neck, 0.3);
      ctx.beginPath(); ctx.moveTo(c1[0] - 9 * s, c1[1] + 3); ctx.quadraticCurveTo(c1[0], c1[1] + 9, c1[0] + 9 * s, c1[1] + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1] + 6); ctx.stroke();
      hl(p.hip, p.neck, 30 * s, light(d.skin));
    }
    if (d.top) {
      if (d.jacket || d.hoodie) { seg(p.hip, mid(p.hip, p.neck, 1.0), 32 * s, C(d.top)); hl(p.hip, p.neck, 32 * s, light(d.top)); }
      else seg(mid(p.hip, p.neck, 0.55), mid(p.hip, p.neck, 0.92), 31 * s, C(d.top));
      if (d.hoodie) { const nk = mid(p.hip, p.neck, 1.05); ctx.fillStyle = C(shade(d.top, 0.8)); ctx.beginPath(); ctx.arc(nk[0] - face * 8, nk[1], 13 * s, 0, Math.PI * 2); ctx.fill(); }
      if (d.id === 'qorovul') { const b = mid(p.hip, p.neck, 0.7); dot([b[0] + face * 7, b[1]], 3.5, '#e3b23c'); }
    }
    seg(mid(p.hip, p.neck, -0.02), mid(p.hip, p.neck, 0.12), 31 * s, C(d.jacket ? d.trim : d.shorts));
    if (!d.jacket) seg(mid(p.hip, p.neck, 0.1), mid(p.hip, p.neck, 0.14), 31 * s, C(d.trim));
  }
  leg(p.kn1, p.ft1, 1);
  dot(p.head, L.hd, C(d.skin));
  if (!outline) {
    const [hx2, hy2] = p.head;
    ctx.save(); ctx.translate(hx2, hy2); ctx.rotate(th + Math.sin(P.lean) * 0.8 * face);
    ctx.fillStyle = C(d.hair);
    const hs = d.hairStyle;
    if (hs === 'short' || hs === 'ponytail' || hs === 'bun' || hs === 'long') {
      ctx.beginPath(); ctx.arc(0, -2, L.hd + 1, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.fillRect(-face * L.hd, -4, face * 7, 10);
    }
    if (hs === 'ponytail') {
      ctx.strokeStyle = C(d.hair); ctx.lineWidth = 7 * s;
      const sw = Math.sin((t || 0) * 0.2) * 6;
      ctx.beginPath(); ctx.moveTo(-face * L.hd * 0.8, -8); ctx.quadraticCurveTo(-face * (L.hd + 18), -4 + sw, -face * (L.hd + 14), 20 + sw); ctx.stroke();
    }
    if (hs === 'bun') { ctx.beginPath(); ctx.arc(-face * (L.hd - 2), -L.hd + 2, 8 * s, 0, Math.PI * 2); ctx.fill(); }
    if (hs === 'long') { ctx.strokeStyle = C(d.hair); ctx.lineWidth = 10 * s; const sw = Math.sin((t || 0) * 0.1) * 5; ctx.beginPath(); ctx.moveTo(-face * L.hd * 0.6, -6); ctx.quadraticCurveTo(-face * (L.hd + 12), 14 + sw, -face * (L.hd + 6), 34 + sw); ctx.stroke(); }
    if (hs === 'mohawk') { for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 3, -L.hd + 2); ctx.lineTo(i * 5, -L.hd - 9); ctx.lineTo(i * 5 + 3, -L.hd + 2); ctx.fill(); } }
    if (hs === 'cap') {
      ctx.fillStyle = C(d.capColor || '#22303f'); ctx.beginPath(); ctx.arc(0, -3, L.hd + 1, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(face > 0 ? 0 : -L.hd - 10, -5, L.hd + 10, 5); ctx.fillStyle = C('#e3b23c'); ctx.fillRect(-4, -L.hd + 2, 8, 5);
    }
    if (d.beard) { ctx.fillStyle = C(d.hair); ctx.beginPath(); ctx.arc(face * 3, 4, L.hd * 0.85, Math.PI * 0.05, Math.PI * 0.95); ctx.fill(); }
    if (d.band) { ctx.fillStyle = C(d.trim); ctx.fillRect(-L.hd, -9, L.hd * 2, 5); }
    if (d.bandana) { ctx.fillStyle = C(d.bandana); ctx.fillRect(-L.hd, -8, L.hd * 2, 6); ctx.beginPath(); ctx.moveTo(-face * L.hd, -6); ctx.lineTo(-face * (L.hd + 14), -2 + Math.sin((t || 0) * 0.3) * 3); ctx.lineTo(-face * L.hd, 0); ctx.fill(); }
    // jarohatlar: jon kamaygani sari ko'karish va tirnalish
    if (f && !sh && !flash) {
      const hr = f.hp / f.maxHp;
      if (hr < 0.6) { ctx.fillStyle = 'rgba(90,40,110,0.45)'; ctx.beginPath(); ctx.ellipse(face * 7 * s, 1, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
      if (hr < 0.35) { ctx.strokeStyle = 'rgba(150,30,30,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -6); ctx.stroke(); }
    }
    // ko'z: oddiy yoki porlovchi
    if (sh || d.glow && !flash) {
      ctx.fillStyle = d.glow || '#fff'; ctx.shadowColor = d.glow || '#fff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.ellipse(face * 8 * s, -3, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = flash ? '#fff' : '#111';
      ctx.beginPath(); ctx.arc(face * 8 * s, -3, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = flash ? '#fff' : shade(d.hair, 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(face * 4 * s, -8); ctx.lineTo(face * 12 * s, -7); ctx.stroke();
    }
    ctx.restore();
  }
  arm(p.el1, p.ha1, 1, true);
  ctx.restore();
  const w = q => [hx + q[0], hy + q[1]];
  return { ha1: w(p.ha1), ha2: w(p.ha2), ft1: w(p.ft1), ft2: w(p.ft2), head: w(p.head) };
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---------- Zarba va shikast ----------
function tryHit(f, o, A, g) {
  const dx = (o.x - f.x) * f.face;
  const reach = A.arm ? (f.item ? ITEMS[f.item.kind].reach : f.def.reach || 1) : 1;
  if (dx < -10 || dx > A.range * f.def.size * reach) return;
  if (o.invuln > 0 || NOHIT.has(o.state) || g.grapple || o.hidden) return;
  if (A.low && o.airborne) return;
  if (!f.airborne && o.y < GROUND - 110 && !A.anti) return;
  f.hitDone = true;
  applyHit(f, o, A, g);
}

function applyHit(f, o, A, g) {
  const facing = (f.x - o.x) * o.face > 0 || Math.abs(f.x - o.x) < 8;
  const hx = o.x - o.face * 10, hy = GROUND - (A.low ? 30 : 130) * o.def.size;
  o.lastAtt = f;
  // Temirning "Kontr" holati
  if (o.state === 'special' && o.curSp && o.curSp.kind === 'counter' && o.t < 34 && facing) {
    o.set('attack'); o.atk = ATK.hook; o.atkName = 'hook'; o.af = ATK.hook.start + ATK.hook.act; o.hitDone = true;
    g.say('KONTR!', o.x, GROUND - 250, '#ffde59', 32); g.hitstop = 10; g.flash = 4;
    applyHit(o, f, { dmg: 16, kb: 10, kd: true, heavy: true }, g);
    return 'counter';
  }
  const blocked = !A.unblockable && (o.state === 'block' || o.state === 'blockstun') && facing &&
    (!A.low || o.crouching) && (!A.high || !o.crouching);
  if (blocked) {
    if (o.parryT > 0 && !f.airborne) {
      o.parryT = 0; o.st = Math.min(100, o.st + 12); o.set('idle'); o.gainMeter(12);
      f.set('hit'); f.stun = 28; f.vx = -f.face * 3;
      Sfx.parry(); g.hitstop = 8; g.sparks(hx, hy, 14, '#7fe3ff'); g.ring(hx, hy, '#7fe3ff', 70);
      g.say('Qaytarish! Qarshi hujum qiling!', o.x, GROUND - 260, '#7fe3ff', 24);
      return 'parry';
    }
    o.hp = Math.max(1, o.hp - A.dmg * 0.12);
    o.st = Math.max(0, o.st - (A.heavy ? 10 : 5));
    o.set('blockstun'); o.t = 0; o.stun = 9 + (A.heavy ? 6 : 0);
    o.vx = f.face * (Math.abs(A.kb) * 0.6 + 2);
    o.gainMeter(3); f.gainMeter(2);
    Sfx.block(); g.sparks(hx, hy, 6, '#9cf');
    g.hitstop = 3;
    if (o.st <= 0) { o.set('hit'); o.stun = 40; g.say('Himoya buzildi!', o.x, GROUND - 230, '#f96'); }
    return 'block';
  }
  let dmg = A.dmg * f.def.power * (A.arm && f.item ? ITEMS[f.item.kind].dmg : 1);
  if (f.rep.n > 0 && f.atk === A) dmg *= Math.max(0.35, 1 - f.rep.n * 0.18);
  const counter = (o.state === 'attack' && o.af < o.atk.start) || (o.state === 'attack' && o.af >= o.atk.start + o.atk.act && o.atk.heavy);
  if (counter) { dmg *= 1.3; g.say('Qarshi zarba!', o.x, GROUND - 250, '#ffb347', 22); }
  const juggling = o.state === 'hit' || o.state === 'air';
  f.combo = juggling ? f.combo + 1 : 1;
  if (f.combo > 2) dmg *= Math.max(0.5, 1 - (f.combo - 2) * 0.1); // uzun kombolarda zarar kamayadi
  f.stats.hits++; f.stats.maxCombo = Math.max(f.stats.maxCombo, f.combo);
  if (A.combo) g.say(A.combo + '!', f.side === 0 ? 240 : W - 240, 200, '#ffde59', 30);
  else if (f.combo >= 3) g.say(f.combo + ' ZARBA KOMBO!', f.side === 0 ? 240 : W - 240, 200, '#ffde59', 30);
  o.flash = 5;
  g.hitstop = A.heavy ? 8 : 4;
  g.shake = Math.max(g.shake, A.heavy ? 10 : 4);
  if (A.heavy) { g.camShake(120, 0.006); g.flash = 3; }
  if (A.heavy) Sfx.heavy(); else Sfx.hit(Math.min(1.3, A.dmg / 8));
  g.sparks(hx, hy, A.heavy ? 18 : 9, '#ffd27a');
  g.ring(hx, hy, '#fff', A.heavy ? 80 : 45);
  f.gainMeter(dmg * 1.2); o.gainMeter(dmg * 0.9);
  if (A.launch || (o.airborne && !A.kd)) {
    o.set('air'); o.vy = A.launch ? -14 : -6; o.vx = f.face * (A.kb + 2); o.y = Math.min(o.y, GROUND - 1);
  } else if (A.kd) {
    o.set('air'); o.vy = -7; o.vx = f.face * A.kb; o.y = GROUND - 1;
  } else {
    o.set('hit'); o.t = 0; o.stun = A.stun || 18; o.vx = f.face * A.kb;
  }
  o.koFall = false;
  if (A.heavy || Math.random() < 0.35) Sfx.voice('hurt', o.def.size > 1.05 ? 0.75 : o.def.size < 0.97 ? 1.3 : 1);
  dealDamage(g, f, o, dmg);
  return 'hit';
}

function dealDamage(g, att, vic, dmg) {
  vic.hp -= dmg; vic.flash = Math.max(vic.flash, 5);
  if (vic.hp <= 0) { vic.hp = 0; g.onKO(vic, att, 'nokaut'); return true; }
  return false;
}

// ---------- Kurash: klinch, parter (yerda), bo'g'ish ----------
function startGrapple(g, type, a, d) {
  g.grapple = { type, a, d, t: 0, esc: 0, cd: 12, actT: 0 };
  a.vx = d.vx = 0; d.face = -a.face; d.crouching = false; a.crouching = false; d.vy = 0; d.y = GROUND;
  a.set(type === 'clinch' ? 'clinchA' : 'gtop'); d.set(type === 'clinch' ? 'clinchD' : 'gbot');
  if (type === 'ground') {
    Sfx.thud(); g.shake = 10; g.camShake(150, 0.007); g.say('Yiqitish!', d.x, GROUND - 200, '#ff8c5a', 30);
    g.dust(d.x, 14);
    dealDamage(g, a, d, 6 * a.def.power);
  } else { Sfx.grab(); g.say('Klinch!', (a.x + d.x) / 2, GROUND - 240, '#fff', 24); }
}

function countPress(inp) {
  let n = 0;
  for (const k of ['punch', 'heavy', 'kick', 'grab', 'block', 'special', 'left', 'right', 'up', 'down']) if (inp.press[k]) n++;
  return n;
}

function grappleStep(g, ia, id) {
  const G = g.grapple, a = G.a, d = G.d;
  G.t++; if (G.cd > 0) G.cd--; if (G.actT > 0) G.actT--;
  a.t++; d.t++;
  if (a.flash > 0) a.flash--; if (d.flash > 0) d.flash--;
  a.hpTrail += (a.hp - a.hpTrail) * 0.05; d.hpTrail += (d.hp - d.hpTrail) * 0.05;
  const mash = Math.min(2, countPress(id));
  if (G.type === 'clinch') {
    d.x = clamp(d.x, MIN_X + 20, MAX_X - 20);
    a.x = clamp(d.x - a.face * 56, MIN_X, MAX_X);
    d.x = a.x + a.face * 56;
    G.esc += mash * 10 * (0.6 + d.st / 250);
    if (G.esc >= 100 || G.t > 170) return endGrapple(g, 'break');
    if (G.cd === 0) {
      if (ia.press.punch || ia.press.heavy) {
        G.actT = 14; G.cd = 20; a.st = Math.max(0, a.st - 4); G.esc = Math.max(0, G.esc - 8);
        Sfx.hit(0.9); g.sparks(d.x, GROUND - 90, 8, '#ffd27a'); g.shake = 4; a.gainMeter(5);
        dealDamage(g, a, d, 5 * a.def.power);
      } else if (ia.press.kick) {
        g.grapple = null;
        d.x = clamp(a.x - a.face * 90, MIN_X, MAX_X);
        a.set('idle'); d.set('down'); Sfx.heavy(); g.shake = 12; g.camShake(150, 0.007);
        g.say('Uloqtirish!', d.x, GROUND - 200, '#ff8c5a', 30); g.dust(d.x, 14); a.gainMeter(10);
        dealDamage(g, a, d, 11 * a.def.power);
      } else if (ia.press.grab && a.st >= 10) {
        a.st -= 10; G.type = 'ground'; G.t = 0; G.esc *= 0.3; G.cd = 18;
        a.set('gtop'); d.set('gbot');
        Sfx.thud(); g.shake = 10; g.say('Yiqitish!', d.x, GROUND - 200, '#ff8c5a', 30); g.dust(d.x, 14);
        dealDamage(g, a, d, 6 * a.def.power);
      }
    }
    return;
  }
  d.x = clamp(d.x, MIN_X + 40, MAX_X - 40);
  a.x = d.x + a.face * 30;
  // pastdagi jangchi: qutulish yarmidan oshganda Ushlash — ag'darib olish
  if ((G.type === 'ground') && G.esc >= 50 && id.press.grab && G.t > 20) {
    G.a = d; G.d = a; G.esc = 0; G.t = 0; G.cd = 14; d.face = -d.face; a.face = -a.face;
    G.a.set('gtop'); G.d.set('gbot'); Sfx.thud(); g.say("Ag'darib oldi!", G.a.x, GROUND - 200, '#7fe3ff', 28); g.dust(G.a.x, 10);
    return;
  }
  if (G.type === 'ground') {
    G.esc += mash * 7 * (0.6 + d.st / 250);
    if (G.esc >= 100) return endGrapple(g, 'escape');
    if (G.t > 360) return endGrapple(g, 'ref');
    if (G.cd === 0) {
      if (ia.press.heavy && a.st >= 6) {
        G.actT = 14; G.cd = 24; a.st -= 6; G.esc = Math.max(0, G.esc - 8);
        Sfx.heavy(); g.shake = 7; g.sparks(d.x + a.face * 40, GROUND - 25, 12, '#ffd27a'); a.gainMeter(6); g.say('Tirsak!', d.x, GROUND - 160, '#ff8c5a', 20);
        dealDamage(g, a, d, 6.5 * a.def.power);
      } else if (ia.press.punch) {
        G.actT = 10; G.cd = 16; a.st = Math.max(0, a.st - 3); G.esc = Math.max(0, G.esc - 5);
        Sfx.hit(1); g.shake = 5; g.sparks(d.x + a.face * 40, GROUND - 25, 8, '#ffd27a'); a.gainMeter(4);
        dealDamage(g, a, d, 4 * a.def.power);
      } else if (ia.press.kick && a.st >= 20) {
        a.st -= 10; G.type = 'armbar'; G.t = 0; G.esc *= 0.5;
        g.say("Qo'l og'rig'i! Qutulish uchun tugmalarni bosing!", W / 2, 300, '#ff6b6b', 24);
      } else if (ia.press.grab && a.st >= 20) {
        a.st -= 10; G.type = 'choke'; G.t = 0; G.esc *= 0.5;
        g.say("Bo'g'ish! Qutulish uchun tugmalarni bosing!", W / 2, 300, '#ff6b6b', 24);
      }
    }
  } else if (G.type === 'armbar') {
    G.esc += mash * 6.5 * (0.6 + d.st / 250);
    if (ia.press.kick) G.esc = Math.max(0, G.esc - 3);
    a.st -= 0.25;
    if (G.t % 24 === 0) Sfx.choke();
    if (dealDamage(g, a, d, 0.24 * a.def.power)) return;
    if (G.esc >= 100) return endGrapple(g, 'escape');
    if (a.st <= 0) { a.st = 0; G.type = 'ground'; G.cd = 30; g.say('Nafas tugadi!', a.x, GROUND - 200, '#ccc'); }
  } else if (G.type === 'choke') {
    G.esc += mash * 5.5 * (0.6 + d.st / 250);
    if (ia.press.grab) G.esc = Math.max(0, G.esc - 3);
    a.st -= 0.22;
    if (G.t % 30 === 0) Sfx.choke();
    if (dealDamage(g, a, d, 0.2 * a.def.power)) return;
    if (G.esc >= 100) return endGrapple(g, 'escape');
    if (a.st <= 0) { a.st = 0; G.type = 'ground'; G.cd = 30; g.say('Nafas tugadi!', a.x, GROUND - 200, '#ccc'); }
  }
}

function endGrapple(g, why) {
  const G = g.grapple; if (!G) return;
  const { a, d } = G; g.grapple = null;
  if (why === 'break') {
    a.set('hit'); a.stun = 14; d.set('idle');
    a.vx = -a.face * 6; d.vx = -d.face * 6;
    g.say('Ajraldi!', d.x, GROUND - 230, '#9cf');
  } else if (why === 'escape' || why === 'ref') {
    a.set('idle'); a.vx = a.face * 7;
    d.set('getup'); d.invuln = 26;
    g.say(why === 'ref' ? 'Hakam: turinglar!' : 'Qutuldi!', d.x, GROUND - 200, '#9cf');
  }
}
