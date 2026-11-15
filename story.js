// Metro Jang — hikoya rejimi: "Qora Halqa" (original syujet).
'use strict';

// Har bob: bekat, raqib (FIGHTERS id), suhbat. {hero} — o'yinchi tanlagan jangchi nomi.
const STORY = {
  title: 'Qora Halqa',
  intro: [
    ['Hikoyachi', "Yarim tunda, oxirgi poyezd ketgach, Toshkent metrosi uxlamaydi. Yer ostida yashirin liga — \"Qora Halqa\" — o'z janglarini boshlaydi."],
    ['Hikoyachi', "Har bir mag'lub jangchining soyasi g'oyib bo'ladi. Ularni oxirgi marta Arvoh bekat tomon ketayotganini ko'rishgan."],
    ['{hero}', "Akamning soyasi ham o'g'irlangan. Qora jeton menga keldi. Endi navbat meniki."],
  ],
  chapters: [
    { station: 'kosmo', foe: 'qorovul', title: "1-bob: Yopiq eshiklar",
      lines: [['Qorovul', "Metro yopiq! Kim seni kiritdi? Bu jeton... demak, sen ham o'shalardansan."], ['{hero}', "Yo'limdan qoch, qorovul. Menga Qora Halqa kerak."], ['Qorovul', "Avval mendan o'tib ko'r!"]],
      after: [['Qorovul', "Kuchli ekansan... Ular Paxtakorda yig'iladi. Ehtiyot bo'l, pol doim ho'l."]] },
    { station: 'paxta', foe: 'zanjir', title: "2-bob: Temir zanjir",
      lines: [['Zanjir', "Yangi jeton egasi? Qora Halqada joy faqat bitta odamga yetadi."], ['{hero}', "Unda bittasi men bo'laman."]],
      after: [['Zanjir', "Bu zanjirni Soyaning odamlari menga taqishgan edi... Poyezdga chiq — Lochin seni kutyapti."]] },
    { station: 'train', foe: 'lochin', title: "3-bob: Tungi poyezd",
      lines: [['Lochin', "Bu poyezd hech qayerda to'xtamaydi. Yo yutasan, yo tunnelda qolasan."], ['{hero}', "Men to'xtash niyatida emasman."]],
      after: [['Lochin', "Uning ko'zlari... binafsha rangda porlaydi. Navoiyda Nur seni kutadi, u Soyani ko'rgan yagona odam."]] },
    { station: 'navoiy', foe: 'nur', title: "4-bob: Yorug'lik va soya",
      lines: [['Nur', "Soya yorug'likdan qo'rqadi, lekin men yetarlicha kuchli emasman. Seni sinab ko'raman."], ['{hero}', "Sinovga tayyorman."]],
      after: [['Nur', "Sen tayyorsan. Mustaqillik maydonidan keyin tunnel Arvoh bekatga olib boradi. Oxirgi qo'riqchi u yerda."]] },
    { station: 'mustaq', foe: 'boron', title: "5-bob: Oxirgi qo'riqchi",
      lines: [['{foe}', "Soya menga akangning soyasini qaytarishni va'da qilgan edi... Lekin buning uchun seni to'xtatishim kerak."], ['{hero}', "U hech kimga hech narsa qaytarmaydi. Uyg'on!"]],
      after: [['{foe}', "Kechir... Soya o'g'irlangan soyalarni Sherga qo'riqlatyapti. U Bodomzorda. Avval akangning izini top."]] },
    { station: 'bodom', foe: 'sher', title: "6-bob: Halqa qoidasi",
      lines: [['Sher', "Bu yerda afsun emas, masofa va nafas yutadi. Soyani izlasang, avval men bilan haqiqiy jang qil."],
              ['{hero}', "Menga unvon kerak emas. Akamni qaytaraman."],
              ['Sher', "Unda shoshma. Har bir zarbangdan keyin himoyang ochiq qoladi."]],
      after: [['Sher', "Endi tushunding: kuchning o'zi yetmaydi. Soya Tuman orqali soyalarni tungi poyezdga tashiydi. Bor, lekin tuzoqqa tushma."]] },
    { station: 'train', foe: 'tuman', title: "7-bob: Tuman ichidagi iz",
      lines: [['Tuman', "Men yo'qolgan soyalarni ko'rdim. Sening akangning soyasi hali tirik, ammo Arvoh bekatda qamalgan."],
              ['{hero}', "Unda nega Soyaga xizmat qilyapsan?"],
              ['Tuman', "Chunki o'zimnikini ham qaytarishim kerak. Meni yengsang, eshikni ochaman."]],
      after: [['Tuman', "Yutding. Oxirgi eshik tunnelning narigi tomonida. Soya sening g'azabingdan foydalanadi — jangda aqlingni yo'qotma."]] },
    { station: 'arvoh', foe: 'soya', title: "Final: Arvoh bekat",
      lines: [['Soya', "Ko'p soyalarni yig'dim. Sening soyang esa eng kuchlisi bo'ladi."], ['{hero}', "Bugun bu bekat yopiladi. Abadiy."], ['Soya', "Unda kel... va soyang bilan xayrlash!"]],
      after: [['Hikoyachi', "Soya yiqildi. Arvoh bekatda binafsha chiroqlar birin-ketin o'chdi va o'g'irlangan soyalar o'z egalariga qaytdi."],
              ['{hero}', "Aka, uyga ketdik. Ertaga birinchi poyezd odatdagidek yuradi."],
              ['Hikoyachi', "Qora Halqa tarqaldi. Ammo yer ostida yangi jetonlar hali ham aylanib yuribdi... SOYA endi tanlash ekranida ochiq."]] },
  ],
};

// Har bir qahramon uchun alohida yakun
const ENDINGS = {
  boron: [['Hikoyachi', "Bo'ron polvonlar maktabini ochdi. Endi yer osti janglari o'rniga bolalar gilamda kurash o'rganadi."]],
  chaqmoq: [['Hikoyachi', "Chaqmoq oxirgi poyezddan oldin bekatdan bekatga yugurib o'tadi — u endi metro shaharidagi eng tez qo'riqchi."]],
  temir: [['Hikoyachi', "Temir qo'lqoplarini ilib qo'ydi. Arvoh bekat o'rnida boks zali ochildi."]],
  shamol: [['Hikoyachi', "Shamol kurash belbog'ini akasining soyasiga bog'ladi: endi u hech qachon g'oyib bo'lmaydi."]],
  lochin: [['Hikoyachi', "Lochin tunnellar ustidagi tomlardan shaharni kuzatadi. Yangi jeton paydo bo'lsa, birinchi u biladi."]],
  zanjir: [['Hikoyachi', "Zanjir o'z zanjirini metro tagiga ko'mdi. Endi uning qo'llari faqat boshqalarni ko'tarish uchun."]],
  nur: [['Hikoyachi', "Nur Arvoh bekatning har bir burchagini yoritdi. U yerda endi soya qolmadi — faqat yorug'lik."]],
  qorovul: [['Hikoyachi', "Qorovul hushtagini cholib, eshiklarni ochdi: \"Birinchi poyezd, marhamat!\" Bekat yana xalqniki."]],
  sher: [['Hikoyachi', "Sher yer osti ligasini haqiqiy qoidali sport turiga aylantirdi: hakam, raund va hurmat bilan."]],
  tuman: [['Hikoyachi', "Tuman o'z soyasini qaytarib oldi va birinchi marta quyosh nurida o'z aksini ko'rdi."]],
  navbatchi: [['Hikoyachi', "Navbatchi bayrog'ini ko'tardi: Arvoh bekat endi rasmiy xaritada. Uning nomi — \"Ozodlik\"."]],
  kalit: [['Hikoyachi', "Kalit Soyaning eski vagonini ta'mirlab, uni muzeyga aylantirdi. Kirish bepul."]],
  tulpor: [['Hikoyachi', "Tulpor tunnellardan otdek chopib chiqdi va ko'kpar maydoniga qaytdi — endi u g'alabani tog'larga olib boradi."]],
  uchqun: [['Hikoyachi', "Uchqun Arvoh bekat devorlariga graffiti chizdi: oldin bu yerda soyalar bo'lgan, endi — ranglar."]],
  soya: [['Hikoyachi', "Soya o'z soyasini yo'qotdi. Endi u o'zini yorug'likda qayta topishi kerak."]],
};
