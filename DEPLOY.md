# Metro Jang — saytga joylash

O'yin oddiy statik fayllardan iborat (server kodi yo'q), shuning uchun istalgan statik hostingga qo'yish mumkin.
PWA (telefonga o'rnatish) va oflayn ishlash faqat `https://` manzilda ishlaydi.

## 1-variant: Netlify Drop (eng oson, hisob kerak)
1. https://app.netlify.com/drop sahifasini oching.
2. `games/metro-jang` papkasini sahifaga sudrab tashlang.
3. Berilgan havolani do'stlaringizga yuboring.

## 2-variant: GitHub Pages
1. O'yin papkasini alohida ommaviy repoga nusxalang (eClass reposi shaxsiy bo'lib qolsin):
   ```bash
   cp -R games/metro-jang ~/metro-jang && cd ~/metro-jang && git init && git add . && git commit -m "Metro Jang"
   ```
2. GitHub'da yangi repo oching, `git remote add origin ...` va `git push -u origin main`.
3. Repo → Settings → Pages → Branch: `main`, papka: `/ (root)` → Save.
4. Bir-ikki daqiqadan keyin o'yin `https://<foydalanuvchi>.github.io/metro-jang/` manzilida ochiladi.

## Testlar
```bash
node --test games/metro-jang/tests/mechanics.test.js
```
