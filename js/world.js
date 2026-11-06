// عالم حروفة: المظهر اللطيف والأرنبة «حروفة». لكل بطل عالمه (p.look)، والافتراضي عالم حروفة.
// لا تتغير الكلمات ولا المعرّفات، فيبقى التقدّم المحفوظ كما هو؛ تتغير الأسماء والرموز المعروضة فقط.
const World = (() => {
  const CUTE = 'cute', CLASSIC = 'classic';
  const lookOf = p => (p && p.look === CLASSIC ? CLASSIC : CUTE);
  const isCute = () => lookOf(Store.current()) === CUTE;

  // تُقرأ الخاصية حسب عالم البطل الحالي، فتبقى شاشات اللعبة كما هي
  function dress(obj, cute) {
    Object.keys(cute).forEach(k => {
      const plain = obj[k];
      Object.defineProperty(obj, k, { enumerable: true, configurable: true, get: () => (isCute() ? cute[k] : plain) });
    });
  }
  const dressById = (list, map) => list.forEach(x => { if (map[x.id]) dress(x, map[x.id]); });

  dressById(AR_REGIONS.concat(EN_REGIONS), {
    ar2: { name: 'درب المدود', icon: '🌸' },
    ar3: { icon: '🍓' },
    ar4: { name: 'خيمة التاء والهاء', icon: '⛺' },
    ar5: { name: 'تلة الشمس والقمر', icon: '🌤️' },
    ar6: { name: 'بيت الشدّة', icon: '🏡' },
    ar7: { name: 'بركة التنوين', icon: '🪷' },
    ar8: { name: 'قوس لام الألف', icon: '🌈' },
    ar9: { name: 'بستان الحروف المتشابهة', icon: '🌷' },
    ar10: { icon: '🐚' },
    ar11: { name: 'عشّ الهمزة المتوسطة', icon: '🪺', animal: { emoji: '🐑', name: 'الخروف' } },
    ar12: { name: 'حقل الهمزة المتطرفة', icon: '🌻', animal: { emoji: '🦔', name: 'القنفذ' } },
    ar13: { name: 'سحابة الألف اللينة', icon: '☁️', animal: { emoji: '🦢', name: 'البجعة' } },
    en1: { name: 'حديقة الحروف القصيرة', icon: '🌷' },
    en2: { name: 'قارب الحرفين', icon: '⛵' },
    en3: { name: 'صدفة الأصوات المزدوجة' },
    en5: { name: 'جدول الأحرف المتحركة', icon: '💧' },
    en6: { icon: '🌻' },
    en7: { name: 'قرية الكلمات الشائعة', icon: '🏡' },
    en9: { name: 'تقويم الأيام والشهور', icon: '📅' },
    en10: { name: 'بيت الحروف الصامتة', icon: '🏡', animal: { emoji: '🦋', name: 'الفراشة' } },
    en12: { name: 'سحابة الأبطال', icon: '☁️', animal: { emoji: '🐱', name: 'القطة' } },
  });
  dressById(WORLDS, { ar: { name: 'بستان الضاد' }, en: { name: 'بستان الأبجدية' } });
  dressById(ITEMS, {
    pencil: { name: 'قلم حروفة' },
    cape: { emoji: '🧣', name: 'وشاح حروفة' },
    shield: { emoji: '☂️', name: 'مظلة الحروف' },
    rocket: { emoji: '🎈', name: 'منطاد السرعة' },
    castle: { emoji: '🏡', name: 'بيت حروفة' },
  });
  [
    { emoji: '🌱', name: 'برعم الحروف' },
    { emoji: '✏️', name: 'صديق الحروف' },
    { emoji: '📖', name: 'صديق القاموس' },
    { emoji: '🌸', name: 'زهرة الإملاء' },
    { emoji: '🌈', name: 'رفيق الكلمات' },
    { emoji: '⭐', name: 'نجم الإملاء' },
    { emoji: '🏆', name: 'نجم النجوم' },
    { emoji: '👑', name: 'أسطورة الإملاء' },
  ].forEach((r, i) => dress(RANKS[i], r));

  // ───── الأرنبة حروفة: رسم أصلي يعمل بدون إنترنت ─────
  const EYES = {
    happy: '<circle cx="46" cy="76" r="6.5" fill="#4a2b45"/><circle cx="74" cy="76" r="6.5" fill="#4a2b45"/><circle cx="48.2" cy="73.6" r="2.3" fill="#fff"/><circle cx="76.2" cy="73.6" r="2.3" fill="#fff"/>',
    cheer: '<path d="M39 78q7-10 14 0M67 78q7-10 14 0" fill="none" stroke="#4a2b45" stroke-width="4" stroke-linecap="round"/>',
    oops: '<circle cx="46" cy="76" r="5" fill="#4a2b45"/><circle cx="74" cy="76" r="5" fill="#4a2b45"/><circle cx="47.6" cy="74.4" r="1.7" fill="#fff"/><circle cx="75.6" cy="74.4" r="1.7" fill="#fff"/><path d="M38 66l11-3M82 66l-11-3" stroke="#b97f63" stroke-width="3" stroke-linecap="round"/>',
  };
  const MOUTH = {
    happy: '<path d="M53 90q3.5 4.5 7 0q3.5 4.5 7 0" fill="none" stroke="#4a2b45" stroke-width="2.6" stroke-linecap="round"/>',
    cheer: '<path d="M51 89h18q-1 11-9 11t-9-11z" fill="#c2456d"/><rect x="55.5" y="89" width="9" height="4.6" rx="1.2" fill="#fff"/>',
    oops: '<circle cx="60" cy="93" r="3.4" fill="#c2456d"/>',
  };
  const svg = (mood = 'happy') => `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#b97f63" stroke-width="3">
      <ellipse cx="42" cy="32" rx="13" ry="30" fill="#ffe6c7" transform="rotate(-8 42 32)"/>
      <path d="M68 52C66 26 74 8 88 8c11 0 13 14 22 22 6 6 2 16-7 14-9-2-13-6-17-3-3 3-3 8-3 13z" fill="#ffe6c7"/>
    </g>
    <ellipse cx="42" cy="34" rx="6.5" ry="21" fill="#ffb9d0" transform="rotate(-8 42 34)"/>
    <path d="M75 46c0-17 5-30 13-30 6 0 8 10 15 17 3 3 1 5-2 4-9-2-16-5-20-2-3 2-4 6-6 11z" fill="#ffb9d0"/>
    <ellipse cx="60" cy="130" rx="27" ry="19" fill="#ffe6c7" stroke="#b97f63" stroke-width="3"/>
    <g transform="rotate(24 100 118)"><rect x="94" y="92" width="12" height="38" rx="2" fill="#ffc93c" stroke="#b97f63" stroke-width="2.4"/><path d="M94 92l6-11 6 11z" fill="#fff0dc" stroke="#b97f63" stroke-width="2.4" stroke-linejoin="round"/><rect x="94" y="126" width="12" height="7" rx="2" fill="#ff8fb3" stroke="#b97f63" stroke-width="2.4"/></g>
    <ellipse cx="60" cy="78" rx="39" ry="33" fill="#ffe6c7" stroke="#b97f63" stroke-width="3"/>
    <path d="M30 104q30 14 60 0l2 9q-32 15-64 0z" fill="#2fb5ad" stroke="#1c8580" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M38 113l-6 19 13-5 3-11z" fill="#2fb5ad" stroke="#1c8580" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="33" cy="87" rx="7.5" ry="5" fill="#ffb9d0" opacity=".85"/><ellipse cx="87" cy="87" rx="7.5" ry="5" fill="#ffb9d0" opacity=".85"/>
    ${EYES[mood] || EYES.happy}
    <path d="M56.5 84.5h7l-3.5 4z" fill="#f0719a"/>
    ${MOUTH[mood] || MOUTH.happy}
  </svg>`;
  const bunny = (mood, cls = '') => `<span class="bunny ${cls}" aria-hidden="true">${svg(mood)}</span>`;

  const TIPS = [
    'هيا نتعلم كلمة جديدة اليوم!',
    'كل كلمة تتقنها تجعلني أقفز فرحاً!',
    'الخطأ صديق التعلّم، فلنحاول مرة أخرى.',
    'اسمع الكلمة جيداً ثم اكتبها بهدوء.',
    'خطوة صغيرة كل يوم تصنع بطلاً كبيراً.',
  ];
  const STREAK_TIP = n => `${n} أيام متتالية! أنا فخورة بك جداً.`;

  function paint() {
    const cute = isCute();
    document.documentElement.dataset.theme = cute ? CUTE : CLASSIC;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = cute ? '#ffdce9' : '#4b2a7b';
  }

  let reactTimer;
  // تتفاعل حروفة مع إجابة الطفل ثم تعود لابتسامتها
  function react(ok) {
    const b = document.getElementById('buddy');
    if (!b) return;
    clearTimeout(reactTimer);
    b.innerHTML = bunny(ok ? 'cheer' : 'oops', ok ? 'hop' : 'sway');
    reactTimer = setTimeout(() => { const x = document.getElementById('buddy'); if (x) x.innerHTML = bunny('happy'); }, 1200);
  }

  // سحب وقلوب ونجوم فوق الخلفية الموجودة
  const addScenery = () => {
    let h = '';
    [[10, 150, -4, 46], [30, 100, -24, 62], [62, 190, -12, 54]].forEach(c => {
      h += `<span class="cloud" style="top:${c[0]}%;--w:${c[1]}px;animation-delay:${c[2]}s;animation-duration:${c[3]}s"></span>`;
    });
    [['💗', 'top:16%;right:7%', 26, 0], ['⭐', 'top:38%;right:90%', 24, -2], ['🌸', 'top:74%;right:8%', 30, -1], ['💗', 'top:88%;right:62%', 22, -3]].forEach(s => {
      h += `<span class="sparkle" style="${s[1]};font-size:${s[2]}px;animation-delay:${s[3]}s">${s[0]}</span>`;
    });
    document.getElementById('bg').insertAdjacentHTML('beforeend', h);
  };
  addScenery();
  paint();

  return {
    CUTE, CLASSIC, lookOf, isCute, paint, react, bunny,
    // صورة حروفة للرسم على canvas؛ ترجع null إن تعذّر تحميلها فتُرسم البطاقة بدونها
    bunnyImage: mood => new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(mood).replace('<svg ', '<svg width="480" height="600" '));
    }),
    preview(look) { document.documentElement.dataset.theme = look; },
    logo: plain => (isCute() ? bunny('cheer', 'logo-bunny') : plain),
    // جملة تشجيع ثابتة طوال اليوم حتى لا تتبدل عند إعادة رسم الشاشة
    greeting(streak) {
      if (!isCute()) return '';
      const tip = streak >= 3 ? STREAK_TIP(streak) : TIPS[new Date().getDate() % TIPS.length];
      return `<div class="bunny-talk">${bunny('happy', 'talk-bunny')}<p><b>حروفة:</b> ${tip}</p></div>`;
    },
    buddy: () => (isCute() ? `<div class="buddy" id="buddy">${bunny('happy')}</div>` : ''),
    resultFace(plain, good) { return isCute() ? bunny(good ? 'cheer' : 'happy', 'result-bunny') : plain; },
    lookPicker(look) {
      const opt = (v, ic, t, d) => `<button type="button" class="look-opt ${look === v ? 'selected' : ''}" data-act="pickLook" data-arg="${v}"><span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
      return `<div class="label">اختر عالمك</div><div class="look-pick">
        ${opt(CUTE, bunny('happy', 'look-bunny'), 'عالم حروفة', 'ألوان فاتحة وأرنبة لطيفة')}
        ${opt(CLASSIC, '🦸', 'عالم الأبطال', 'ألوان داكنة ومغامرة')}
      </div>`;
    },
  };
})();
