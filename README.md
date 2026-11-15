# Metro Jang

Toshkent metrosidan ilhomlangan xayoliy bekatlarda bo'ladigan original 3D jang o'yini.
Brauzerda ishlaydi: Phaser 3 jang qoidalarini boshqaradi, Three.js esa 3D bekat va jangchilarni chizadi. Internet yoki hisob kerak emas.

## 4-versiya: 3D jang sahnasi

- Bekatlar va metro vagoni hajmli 3D sahna; harakatlanuvchi bo'g'inli jangchilar, yoritish, soyalar, 3D portretlar.
- Zarbalarda qon tomchilari va polda izlar paydo bo'ladi. Har bir jangchining o'z nomi, harakat ketma-ketligi va effektiga ega yakuniy zarbasi bor; to'liq ro'yxat "Usullar" menyusida.
- Snaryadlar, qurollar va qaytarish halqalari 3D sahnada ko'rinadi. Sozlamalarda 3D grafika sifatini pasaytirish mumkin.
- WebGL ishlamasa, o'yin avvalgi 2D ko'rinishda davom etadi. WebGL rejimida teksturali, suyakli MakeHuman 3D odam modellari ishlatiladi; ular o'yindagi harakatlarga mos boshqariladi. Modellar va yuklagich internetsiz ishlashi uchun fayllarga kiritilgan. Har bir qahramonning tashqi ko'rinishi rang va o'lcham bilan farqlanadi; individual yuz skanlari va studiya animatsiyalari hali yo'q.
- Bekat foni o'yinning o'zida kodda chiziladi (har bekatning o'z ko'rinishi) — tashqi surat ishlatilmaydi. Jangchilar 3D modellari o'yin skeletiga bo'g'imma-bo'g'im moslanadi va har biri o'z kiyimida.

## 2-versiya: yangi imkoniyatlar

- **Hikoya rejimi "Qora Halqa"** — 8 bob, suhbatlar, oxirida xo'jayin **Soya** (Arvoh bekatda). Hikoya tugagach Soya barcha rejimlarda ochiladi. Progress saqlanadi; eski saqlangan final bobi o'z joyida qoladi.
- **14 jangchi + xo'jayin:** Bo'ron, Chaqmoq, Temir, Shamol, Lochin, Zanjir, Nur, Qorovul, Sher, Tuman, Navbatchi, Kalit, Tulpor, Uchqun va Soya.
- Har jangchida **2 ta maxsus usul** (Maxsus va Pastga + Maxsus) va **shaxsiy kombo** (to'liq ro'yxat: menyu → "Usullar").
- **Soya kuchi** shkalasi: to'lsa **Kuchli + Maxsus** — Soya zarbasi; yarmi bilan urilib turganda **Blok** — kombo zanjirini uzish.
- Zarba tekkanda maxsus usul bilan bekor qilish, uzun kombolarda zararning kamayishi.
- **Grafika:** soyali tanalar, mushaklar, qurollar, zarba izlari, halqa effektlari, chang, vinyetka, Arvoh bekat tumani.
- **Musiqa:** har rejim va bekat uchun original sharqona fon musiqasi (kodda sintez qilinadi).
- **Sozlamalar:** musiqa/effekt balandligi, raund vaqti (30/60/90), ekran silkinishi. **Statistika** saqlanadi.
- **Tugmalarni sozlash:** Sozlamalar → "Tugmalarni sozlash" (har ikki o'yinchi uchun, saqlanadi).
- **Geympad:** X — yengil, Y — kuchli, A — tepish, B — ushlash, RB/RT — blok, LB/LT — maxsus, Start — pauza.
- **Yangi usullar:** Sherning masofani yopib parterga olib tushishi va tirsak zarbasi; Tumanning yashirin qadami va "Tuman izi" kombosi. Jangchi tanlash sahifalarga bo'lingan.
- **Dinamik musiqa:** jangchilardan birining joni 30% dan kam qolganda ritm keskinlashadi.

## 3-versiya: 30 ta taklif

- **Jang:** 14 jangchi + Soya; har birida 3 ta maxsus usul (Maxsus, Pastga+Maxsus, Orqaga+Maxsus); qurollar platformaga tushadi (tayoq, kastet, nunchaku — ustiga borib Ushlash); devordan sakrash; yuzdagi jarohatlar; parterda tirsak (Kuchli), qo'l og'rig'i (Tepish), pastdan ag'darish (Ushlash); ikkinchi tugatish "Uchinchi rels" (Pastga+Maxsus); mashqda kadrlar ma'lumoti (V).
- **Bekatlar:** yana Chorsu, Ming o'rik, Yunusobod, Depo — har biri o'z to'sig'i va xususiyati bilan; fonda yo'lovchilar va "keyingi poyezd" tablosi.
- **Rejimlar:** O'rganish (qadamma-qadam), Minora (10 qavat), Kunlik sinov, Juftlik 2v2 (Blok+Ushlash — almashish), Ruh jangi (o'z uslubingizdagi bot, kodini do'stga yuborish mumkin), Turnir (4/8 kishi), Onlayn (WebRTC, kod almashish orqali), Takroriy ko'rish (oxirgi 3 jang, 1/2/4 — tezlik, P — skrinshot).
- **Mukofotlar:** tangalar va Do'kon (har jangchiga 3 ta qo'shimcha kiyim rangi), Rekordlar jadvali (shu kompyuterda).
- **Bot:** har jangchining o'z xarakteri; ketma-ket yutqazsangiz biroz yumshaydi.
- **Ovoz:** har bekatning o'z kuyi, sintez qilingan hayqiriqlar, diktor (brauzer nutq sintezi).
- **Qulaylik:** telefon/planshetda sensorli tugmalar, PWA (o'rnatish va oflayn), o'zbek/rus/ingliz tili (menyular va asosiy xabarlar).
- **Sifat:** `tests/mechanics.test.js` testlari, saytga joylash — `DEPLOY.md`.

## Ishga tushirish

1. `games/metro-jang/index.html` faylini Chrome, Edge, Firefox yoki Safari'da oching
   (faylni ikki marta bosish kifoya). macOS terminalida:

   ```bash
   open games/metro-jang/index.html
   ```

2. Ovoz birinchi tugma bosilganda yoqiladi (brauzer qoidasi).

Phaser 3.80.1 va Three.js 0.160.0 `lib/` ichida turibdi, shuning uchun o'yin internetsiz ham ochiladi. Three.js litsenziyasi `lib/THREE-LICENSE.txt` faylida.
Xohlasangiz oddiy statik server orqali ham ochish mumkin: `python3 -m http.server` (papka ichida), keyin `http://localhost:8000`.

## Tugmalar

| Harakat | 1-o'yinchi | 2-o'yinchi |
|---|---|---|
| Chapga / o'ngga | A / D | ← / → |
| Sakrash | W | ↑ |
| Egilish | S | ↓ |
| Yengil zarba | F | J (Num1) |
| Kuchli zarba | G | K (Num2) |
| Tepish | H | L (Num3) |
| Blok | R | I (Num0) |
| Ushlash | T | O (Num4) |
| Maxsus usul | Y | P (Num5) |

Umumiy: **Esc** — pauza (davom etish, jangni qayta boshlash, boshqaruv, ovoz, menyu), **M** — ovozni o'chirish/yoqish.
Mashq rejimida **B** — jangchilarni, jon va nafasni qayta tiklash.
Menyularda strelkalar yoki WASD va Enter ishlaydi; ekran burchagida ham "Pauza" va "Ovoz" tugmalari bor.

## Rejimlar

- **Botga qarshi** — Oson / O'rtacha / Qiyin. Raqiblarni ketma-ket yengish kerak.
  Bot masofani saqlaydi, bloklaydi, xatoingizdan keyin qarshi hujum qiladi va siz ko'p ishlatgan
  zarbalarni (yoki sakrash/ushlashni) eslab, ularga qarshi moslashadi.
  **Raundni yutqazsangiz, keyingi raund harakatdagi metro vagonida** bo'ladi: vagon tebranadi,
  vaqti-vaqti bilan silkinib jangchilarni suradi (blok yoki egilish ta'sirni kamaytiradi).
- **Ikki kishi** — bitta klaviaturada, internetsiz.
- **Mashq rejimi** — hujum qilmaydigan raqibda zarbalar, kombolar va ushlashni vaqt cheklovisiz sinash.
  Raqib nokaut bo'lsa, mashq avtomatik davom etadi. **B** jangchilarni darhol qayta tiklaydi.

Raqobat rejimlarida 3 raunddan 2 tasini yutgan g'olib. Har raund boshqa bekatda.
Vaqt (60 soniya) tugasa — joni ko'proq qolgan yutadi; jon teng bo'lsa — durang, hech kim ochko olmaydi
va qo'shimcha raund o'ynaladi (5 raunddan keyin ham g'olib bo'lmasa — o'yin durang).

## Bekatlar (har biri jangga ta'sir qiladi)

| Bekat | Xususiyati |
|---|---|
| Kosmonavtlar | Keng platforma, xira va miltillovchi chiroqlar |
| Alisher Navoiy | Tor platforma, marmar to'siqlar — devorga urilish qo'shimcha zarar beradi |
| Paxtakor | O'rtada ho'l pol — sirpanib, uzoqroq surilasiz |
| Mustaqillik maydoni | Poyezdlar tez-tez o'tadi, shamol jangchilarni suradi |
| Bodomzor | Ta'mirlash to'siqlari platformani toraytirgan |
| Poyezd vagoni | Faqat raund yutqazilganda; silkinish va tebranish |

Bekat nomi va "poyezd yaqinlashmoqda" kabi e'lonlar pastdagi tablodan chiqadi.

## Jang tizimi qisqacha

- **Jon** (yashil) va **nafas** (ko'k) chiziqlari. Kuchli zarba, tepish, ushlash va maxsus usul nafas sarflaydi;
  tinch turganda nafas tezroq tiklanadi. Nafas tugasa, blok buziladi.
- **Kombolar** (zarba tekkanda keyingisini bosing):
  Yengil → Yengil → Kuchli ("Metro zanjiri"), Yengil → Kuchli → Tepish ("Bo'ron tepki"), egilib Yengil → Tepish.
- **Qaytarish:** zarba tegishidan sal oldin Blok bosilsa, hujumchi ochilib qoladi.
- **Tinimsiz bosishga qarshi:** bir xil zarbani qayta-qayta takrorlash uning kuchini kamaytiradi va nafasni ko'proq yeydi.
- **Kurash:** klinch (tizza, uloqtirish, yerga yiqitish), yerda yuqoridan urish va bo'g'ish, ikki oyoqqa sho'ng'ish (Egilish + Ushlash) va uni qaytarish (Egilish + Blok).
- **Oxirgi bekat** — g'alaba zarbasi: "TUGAT UNI!" chiqqanda yaqinlashib Maxsus tugmani bosing.

## Fayllar

- `index.html` — sahifa va menyu uslublari
- `game.js` — Phaser sahnasi, o'yin sikli, raundlar, bot, HUD, menyular
- `fighter.js` — jangchilar, zarbalar, kombo, kurash
- `stage.js` — bekatlar va vagon (hammasi kodda chiziladi, rasm fayllari yo'q)
- `arena3d.js` — WebGL sahna, hajmli jangchilar va qon effektlari; `finishers.js` — jangchiga xos yakuniy zarbalar
- `audio.js` — Web Audio API bilan yasalgan ovozlar
- `story.js` — hikoya matni, `music.js` — fon musiqasi, `settings.js` — sozlamalar, saqlash, geympad
- `modes.js` — minora, kunlik sinov, 2v2, ruh boti, do'kon; `extra.js` — replay, tillar, turnir, rekordlar; `online.js` — onlayn jang; `tutorial.js`, `touch.js`, `sw.js` + `manifest.webmanifest` (PWA)
- `lib/phaser.min.js` — Phaser 3.80.1 (MIT litsenziyasi)
- `lib/three.min.js` — Three.js 0.160.0 (MIT litsenziyasi `lib/THREE-LICENSE.txt`)
