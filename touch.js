// Metro Jang — telefon va planshet uchun ekrandagi sensorli tugmalar (1-o'yinchi).
'use strict';

const Touch = (() => {
  const isTouch = 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const BTNS = [
    ['left', '◀', 'pad', 20, 590], ['right', '▶', 'pad', 150, 590], ['up', '▲', 'pad', 85, 525], ['down', '▼', 'pad', 85, 655],
    ['punch', 'Yengil', 'act', 1000, 520], ['heavy', 'Kuchli', 'act', 1110, 470], ['kick', 'Tepish', 'act', 1000, 620],
    ['block', 'Blok', 'act', 1110, 570], ['grab', 'Ushlash', 'act', 890, 590], ['special', 'Maxsus', 'act', 890, 480],
  ];
  function code(a) { return KEYMAP.p1[a][0]; }
  function init() {
    if (!isTouch) return;
    const wrap = document.createElement('div'); wrap.id = 'touch';
    for (const [a, label, cls, x, y] of BTNS) {
      const b = document.createElement('div'); b.className = 'tbtn ' + cls; b.textContent = label;
      b.style.left = x + 'px'; b.style.top = (y - 60) + 'px';
      const down = e => { e.preventDefault(); audioStart(); if (!keys[code(a)]) pressed[code(a)] = true; keys[code(a)] = true; b.classList.add('on'); };
      const up = e => { e.preventDefault(); keys[code(a)] = false; b.classList.remove('on'); };
      b.addEventListener('touchstart', down, { passive: false }); b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
      b.addEventListener('mousedown', down); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up);
      wrap.appendChild(b);
    }
    document.getElementById('overlay').appendChild(wrap);
    setInterval(() => { wrap.style.display = App.inFight && !Game.paused ? 'block' : 'none'; }, 200);
  }
  return { init, isTouch };
})();
Touch.init();
