// أبطال الإملاء — الشاشات والتفاعل
(() => {
  const app = document.getElementById('app');
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ltr = s => `<span dir="ltr">${s}</span>`;
  const bar = pct => `<span class="bar"><i style="width:${Math.round(Math.min(pct, 1) * 100)}%"></i></span>`;
  const S = () => Store.state.settings;
  const wdir = w => (w.lang === 'ar' ? 'rtl' : 'ltr');
  const allItems = () => ITEMS.concat(RARE_ITEMS);
  // الكلمة بتشكيلها: الحروف بلون النص والحركات بلون أفتح منه
  const lightMarks = s => esc(s).replace(/[\u064B-\u0652\u0670]+/g, m => `<span class="hk">${m}</span>`);
  const wordHTML = w => lightMarks(Engine.voweled(w));
  // كل حرف مع حركته، والحرف الناقص بلا حركة حتى لا يبقى لها مكان معلّق
  const fillHTML = (w, at) => {
    const clusters = Engine.voweled(w).replace(/\s+/g, '').match(/[^\u064B-\u0652\u0670\u0640][\u064B-\u0652\u0670\u0640]*/g);
    return `<span>${clusters.map((c, i) => (i === at ? '<b class="blank">؟</b>' : lightMarks(c))).join('')}</span>`;
  };
  const kidColor = p => KID_COLORS[Store.state.profiles.indexOf(p) % KID_COLORS.length];

  let round = null;       // الجولة الجارية
  let lastRound = null;   // لإعادة نفس الجولة من شاشة النتائج
  let lastResult = null;  // نتيجة آخر جولة: للشهادة وتدريب الأخطاء
  let newAvatar = AVATARS[0];
  let newLook = World.CUTE;
  let parentOK = false;   // فُتحت لوحة ولي الأمر بالرمز في هذه الزيارة
  let listEditing = null;  // القائمة المفتوحة للتعديل
  let kidPinShown = '';    // البطل الذي أظهر ولي الأمر رمزه
  let parentTab = 'kids';
  let parentKid = null;
  let pinState = null;    // { stage: 'enter'|'new'|'confirm', buf, first }

  // ───── التنقل: زر الرجوع في الجهاز يعود للشاشة السابقة ─────
  const nav = { cur: null, arg: null };
  const TABS = [
    { name: 'camp', icon: '🏠', label: 'الرئيسية' },
    { name: 'map', icon: '🗺️', label: 'الخطة' },
    { name: 'free', icon: '✍️', label: 'كلماتي' },
    { name: 'shop', icon: '🎒', label: 'المتجر' },
    { name: 'performance', icon: '📊', label: 'أدائي' },
    { name: 'heroes', icon: '🏆', label: 'الأبطال' },
  ];
  const TAB_SCREENS = new Set(TABS.map(t => t.name));
  const tabBar = () => `<nav class="tabbar">${TABS.map(t =>
    `<button class="tab ${nav.cur === t.name ? 'on' : ''}" data-act="go" data-arg="${t.name}"><span>${t.icon}</span><b>${t.label}</b></button>`).join('')}</nav>`;

  function render(html, keepScroll) {
    const tabs = !round && TAB_SCREENS.has(nav.cur) && !!Store.current();
    World.paint();
    document.body.classList.toggle('bgrest', !!round);
    document.body.classList.toggle('tabs', tabs);
    app.innerHTML = html + (tabs ? tabBar() : '');
    if (!keepScroll) window.scrollTo(0, 0);
  }
  function go(name, arg, replace) {
    nav.cur = name;
    nav.arg = arg === undefined ? null : arg;
    const st = { s: name, a: nav.arg };
    if (replace) history.replaceState(st, ''); else history.pushState(st, '');
    Screens[name](nav.arg);
  }
  const redraw = () => Screens[nav.cur](nav.arg);
  window.addEventListener('popstate', e => {
    if (!$('modal').hidden) { closeModal(); history.pushState({ s: nav.cur, a: nav.arg }, ''); return; }
    if (round) {
      history.pushState({ s: nav.cur, a: nav.arg }, '');
      Actions.exitRound();
      return;
    }
    if (Group.active()) {
      history.pushState({ s: nav.cur, a: nav.arg }, '');
      Group.exit();
      return;
    }
    const st = e.state || { s: Store.current() ? 'camp' : 'profiles', a: null };
    if (!Store.current() && !['profiles', 'newProfile', 'join', 'parent'].includes(st.s)) { nav.cur = 'profiles'; nav.arg = null; Screens.profiles(); return; }
    nav.cur = st.s;
    nav.arg = st.a;
    Screens[st.s](st.a);
  });

  let toastTimer;
  function toast(msg, ms = 2400) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ───── النوافذ ─────
  let modalResolve = null;
  function showModal(html) {
    $('modal').innerHTML = `<div class="card modal-card">${html}</div>`;
    $('modal').hidden = false;
  }
  function closeModal(value) {
    $('modal').hidden = true;
    $('modal').innerHTML = '';
    if (modalResolve) { const r = modalResolve; modalResolve = null; r(value); }
  }
  const ask = (title, text, yes = 'نعم', danger = false) => new Promise(res => {
    modalResolve = res;
    showModal(`<h2>${title}</h2><p class="muted">${text}</p>
      <div class="row"><button class="btn ${danger ? 'red' : 'pink'}" data-act="modalYes">${yes}</button>
      <button class="btn soft" data-act="modalNo">رجوع</button></div>`);
  });

  const subHeader = (title, back = 'camp', arg) => {
    const p = Store.current();
    return `<header class="topbar">
      <button class="chip" data-act="go" data-arg="${back}" ${arg ? `data-arg2="${esc(arg)}"` : ''}>→ رجوع</button>
      <h2 class="topbar-title">${title}</h2>
      ${p ? `<div class="chip coins">🪙 <b>${p.coins}</b></div>` : ''}
    </header>`;
  };

  const eventBanner = e => (e.type === 'unlock'
    ? `🔓 فتحت منطقة جديدة: ${e.region.icon} ${e.region.name}`
    : `🐾 اكتشفت حيواناً جديداً: ${e.region.animal.emoji} ${e.region.animal.name}`);

  function confetti() {
    const e = ['🎉', '⭐', '✨', '🎊', '🏅', '✏️', 'أ', 'A'];
    for (let i = 0; i < 26; i++) {
      setTimeout(() => {
        const d = document.createElement('div');
        d.className = 'confetti';
        d.textContent = e[Math.floor(Math.random() * e.length)];
        d.style.left = Math.random() * 100 + 'vw';
        d.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3200);
      }, i * 60);
    }
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ───── الشاشات ─────
  const Screens = {
    profiles() {
      const list = Store.state.profiles;
      render(`<section class="screen">
        <div class="hero-title">
          <div class="logo">${World.logo('🦸✏️📚')}</div>
          <h1>أبطال الإملاء</h1>
          <p>Spelling Heroes — مغامرة الكلمات بالعربية والإنجليزية</p>
        </div>
        ${list.length ? `<p class="hint">من سيلعب اليوم؟</p>
        <div class="avatars">${list.map(p => `<button class="avatar-card" style="--c:${kidColor(p)}" data-act="enter" data-arg="${p.id}">
          <span class="face">${p.avatar}</span><b>${esc(p.name)}</b></button>`).join('')}</div>` : ''}
        <button class="btn gold wide" data-act="newProfile">➕ ${list.length ? 'بطل جديد' : 'أنشئ بطلك وابدأ'}</button>
        ${Sync.role() === 'device' ? '' : '<button class="btn soft wide" data-act="go" data-arg="join">📱 جهاز طفل؟ انضم برمز من ولي الأمر</button>'}
        <button class="link-btn" data-act="openParent">👨‍👩‍👧 ولي الأمر</button>
      </section>`);
    },

    newProfile(edit) {
      const p = edit ? Store.current() : null;
      if (p) { newAvatar = p.avatar; newLook = World.lookOf(p); }
      render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="${p ? 'camp' : 'profiles'}">→ رجوع</button>
          <h2 class="topbar-title">${p ? 'تعديل بطلك' : 'بطل جديد'}</h2><span></span>
        </header>
        <div class="card form-card">
          <label for="pname">ما اسمك يا بطل؟</label>
          <input id="pname" type="text" maxlength="20" autocomplete="off" value="${p ? esc(p.name) : ''}" placeholder="اكتب اسمك هنا">
          <div class="label">اختر شخصيتك</div>
          <div class="avatar-grid">${AVATARS.map(a => `<button class="avatar-btn ${a === newAvatar ? 'selected' : ''}" data-act="pickAvatar" data-arg="${a}">${a}</button>`).join('')}</div>
          ${World.lookPicker(newLook)}
          <button class="btn pink wide" data-act="${p ? 'saveProfile' : 'createProfile'}">${p ? '✅ حفظ' : '🚀 هيا نبدأ'}</button>
          ${p ? `<button class="btn soft wide" data-act="changeKidPin">🔑 ${p.pin ? 'تغيير رمزي السري' : 'اختر رمزاً سرياً'}</button>` : ''}
        </div>
      </section>`);
    },

    // خيار البداية: خطة تدريجية أو كلمات يدخلها الطفل بنفسه
    start() {
      const p = Store.current();
      render(`<section class="screen">
        <div class="hero-title"><div class="logo">${p.avatar}</div><h1>أهلاً يا ${esc(p.name)}!</h1><p>كيف تحب أن تبدأ مغامرتك؟</p></div>
        <div class="start-grid">
          <button class="start-card" style="--c:#c2457d" data-act="beginFree">
            <span class="si">✍️</span><b>أدخل كلماتك</b><small>وضع حر: اكتب كلمات درسك أو واجبك، عربي أو English، وتدرّب عليها</small></button>
          ${WORLDS.map(w => `<button class="start-card" style="--c:${w.c}" data-act="beginWorld" data-arg="${w.id}">
            <span class="si">${w.icon}</span><b>${w.short}</b><small>${w.regions.length} مناطق بالتدريج، من الأسهل إلى الأصعب</small></button>`).join('')}
        </div>
        <p class="hint">يمكنك التبديل بينها في أي وقت 🙂</p>
      </section>`);
    },

    camp() {
      const p = Store.current();
      if (!p) return go('profiles', null, true);
      const st = Engine.stats(p);
      const rank = Engine.rankFor(st.best);
      const next = RANKS.find(r => r.min > st.best);
      const t = Engine.today(p);
      const nextSt = Engine.nextStation(p);
      const mins = Math.floor(t.secs / 60);
      const owned = allItems().filter(i => p.items.includes(i.id));
      const hard = Engine.tricky(p).length;
      render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="switchKid">🔄 تغيير</button>
          <div class="chip coins">🪙 <b>${p.coins}</b></div>
          <button class="chip" data-act="toggleMute" aria-label="الصوت">${Store.state.muted ? '🔇' : '🔊'}</button>
        </header>

        ${World.greeting(st.streak)}
        <div class="hello">
          <button class="big-avatar" data-act="editProfile" aria-label="تعديل">${p.avatar}<i>✏️</i></button>
          <div>
            <h1>أهلاً يا ${esc(p.name)}!</h1>
            <div class="rank-badge">${rank.emoji} ${rank.name}</div>
            <p>${next ? `لتصبح ${next.emoji} ${next.name}: ${ltr(next.min)} كلمة في سباق الحروف` : 'وصلت لأعلى رتبة! 🎉'}</p>
          </div>
        </div>

        ${Group.groupBtn()}

        <div class="stats-row">
          <div><b>${st.mastered}</b><span>كلمة متقنة</span></div>
          <div><b>${st.streak} 🔥</b><span>أيام متتالية</span></div>
          <div><b>${st.best}</b><span>أفضل سباق</span></div>
        </div>

        <div class="card">
          <h2>🧭 رحلة اليوم <small>${ltr(`${mins}/${S().goalMin}`)} دقيقة</small></h2>
          <div class="journey">
            ${Engine.STATIONS.map(s => {
              const done = Engine.stationDone(p, s.id);
              const cur = nextSt && nextSt.id === s.id;
              return `<button class="station ${done ? 'done' : ''} ${cur ? 'cur' : ''}" data-act="station" data-arg="${s.id}">
                <span>${done ? '✅' : s.icon}</span><b>${s.name}</b></button>`;
            }).join('')}
            <button class="station chest ${Engine.chestReady(p) ? 'cur' : ''} ${t.chest ? 'done' : ''}" data-act="openChest"><span>${t.chest ? '🎁' : '🧰'}</span><b>الكنز</b></button>
          </div>
        </div>

        <div class="section-title">🌍 اختر مغامرتك</div>
        <div class="start-grid">
          <button class="start-card" style="--c:#c2457d" data-act="go" data-arg="free">
            <span class="si">✍️</span><b>الوضع الحر</b><small>أدخل كلماتك وتدرّب عليها</small>
            <em>${Store.state.lists.length} قوائم</em></button>
          ${WORLDS.map(w => {
            const ws = Engine.state(p, w.id);
            const all = w.regions.flatMap(r => Engine.regionWords(w.id, r));
            const m = Engine.mastery(p, all);
            return `<button class="start-card" style="--c:${w.c}" data-act="openWorld" data-arg="${w.id}">
              <span class="si">${w.icon}</span><b>${w.short}</b><small>${w.name}</small>
              ${bar(m)}<em>${ltr(`${ws.unlocked}/${w.regions.length}`)} منطقة</em></button>`;
          }).join('')}
        </div>

        <div class="menu">
          <button class="big-btn gold" data-act="startRace"><span>🏃</span><b>سباق الحروف</b><small>${CONFIG.raceSeconds} ثانية من الكلمات</small></button>
          <button class="big-btn pink" data-act="brainOpen"><span>🧠</span><b>تحدّي العقل</b><small>${Brain.GAMES.length} ألعاب قصيرة</small></button>
          <button class="big-btn teal wide2" data-act="startTricky" ${hard ? '' : 'disabled'}><span>🎯</span><b>كلمات صعبة</b><small>${hard ? `${hard} تحتاج تدريباً` : 'لا توجد بعد'}</small></button>
        </div>

        ${owned.length ? `<div class="card"><h2>🎒 عدّة البطل</h2><div class="gear">${owned.map(i => `<span title="${i.name}">${i.emoji}</span>`).join('')}</div></div>` : ''}
        <button class="link-btn" data-act="openParent">👨‍👩‍👧 ولي الأمر والإعدادات</button>
      </section>`);
    },

    map(id) {
      const p = Store.current();
      if (id && Engine.world(id)) { p.world = id; Store.save(); }
      const w = Engine.current(p);
      const ws = Engine.state(p, w.id);
      let lastStage = 0;
      render(`<section class="screen">
        ${subHeader(`${w.icon} ${w.name}`)}
        <div class="world-switch">${WORLDS.map(x => `<button class="${x.id === w.id ? 'on' : ''}" data-act="switchWorld" data-arg="${x.id}">${x.icon} ${x.short}</button>`).join('')}</div>
        <p class="hint">${w.hint}</p>
        <div class="trail-map">
          ${w.regions.map((r, i) => {
            const locked = i >= ws.unlocked;
            const words = Engine.regionWords(w.id, r);
            const m = Engine.mastery(p, words);
            const found = ws.animals.includes(r.id);
            const head = r.stage !== lastStage ? `<div class="stage-head">${STAGES[r.stage].icon} ${STAGES[r.stage].name} <small>${STAGES[r.stage].note}</small></div>` : '';
            lastStage = r.stage;
            return `${head}<button class="region ${locked ? 'locked' : ''} ${found ? 'done' : ''}" style="--c:${w.c}" data-act="openRegion" data-arg="${r.id}">
              <span class="region-icon">${locked ? '🔒' : r.icon}</span>
              <span class="region-info"><b>${r.name}</b><small>${r.label} · إتقان ${ltr(Math.round(m * 100) + '%')}</small>${bar(m)}</span>
              <span class="region-animal ${found ? '' : 'hidden'}">${found ? r.animal.emoji : '🐾'}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`);
    },

    region(id) {
      const p = Store.current();
      const w = WORLDS.find(x => x.regions.some(r => r.id === id));
      const r = w.regions.find(x => x.id === id);
      const words = Engine.regionWords(w.id, r);
      const m = Engine.mastery(p, words);
      render(`<section class="screen">
        ${subHeader(`${r.icon} ${r.name}`, 'map')}
        <div class="card tip-card" style="--c:${w.c}">
          <h2>${r.label}</h2>
          <p>💡 ${r.tip}</p>
          ${bar(m)}<small class="muted">إتقان ${ltr(Math.round(m * 100) + '%')} — تفتح المنطقة التالية عند ${ltr(Math.round(CONFIG.unlockAt * 100) + '%')}</small>
        </div>
        <div class="menu">
          <button class="big-btn pink" data-act="startPractice" data-arg="${r.id}"><span>🎯</span><b>ابدأ التدريب</b><small>الكلمات تصعب بالتدريج</small></button>
          <button class="big-btn blue" data-act="startRegionExam" data-arg="${r.id}"><span>📝</span><b>اختبار إملاء</b><small>كل الكلمات بلا مساعدة</small></button>
        </div>
        <div class="card"><h2>📖 ادرس الكلمات أولاً</h2>
          <div class="word-grid">${words.map((x, i) => wordTile(p, x, i, r.id)).join('')}</div>
        </div>
      </section>`);
    },

    // ───── الوضع الحر ─────
    free() {
      const p = Store.current();
      const lists = Store.state.lists;
      render(`<section class="screen">
        ${subHeader('✍️ الوضع الحر')}
        <p class="hint">أدخل كلمات درسك أو واجبك وتدرّب عليها. اللغة تُكتشف تلقائياً، والمعنى والإيموجي من القاموس، ومن الإنترنت إن لم يجدهما.</p>
        <button class="btn gold wide" data-act="newList">➕ قائمة كلمات جديدة</button>
        <button class="btn soft wide" data-act="importList">📂 فتح ملف كلمات</button>
        <input type="file" id="fileInput" accept=".json,.txt,application/json,text/plain" hidden>
        ${lists.length ? `<div class="trail-map">${lists.map(l => {
          const words = Engine.listWords(l);
          const m = Engine.mastery(p, words);
          return `<button class="region full" style="--c:#c2457d" data-act="openList" data-arg="${l.id}">
            <span class="region-icon">📝</span>
            <span class="region-info"><b>${esc(l.name)}</b><small>${words.length} كلمة · إتقان ${ltr(Math.round(m * 100) + '%')}</small>${bar(m)}</span>
            <span class="region-animal">‹</span></button>`;
        }).join('')}</div>` : `<div class="card empty"><span>📭</span><p>لا توجد قوائم بعد. أنشئ أول قائمة واكتب كلماتك!</p></div>`}
      </section>`);
      $('fileInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); };
    },

    list(id) {
      const l = Store.list(id);
      if (!l) return go('free', null, true);
      const p = Store.current();
      // يفتح الطفل القائمة على التدريب مباشرة، والتعديل خلف زر (والقائمة الفارغة تُفتح للتعديل)
      const editing = listEditing === l.id || !l.words.length;
      render(`<section class="screen">
        ${subHeader(`📝 ${esc(l.name)}`, 'free')}
        <div id="listPlay">${listPlay(p, l)}</div>
        ${editing ? `<div class="card">
          <h2>✏️ تعديل القائمة</h2>
          <label class="lbl" for="lname">اسم القائمة</label>
          <input id="lname" type="text" maxlength="40" value="${esc(l.name)}" data-listname="${l.id}">
          <div style="height:12px"></div>
          <label class="lbl" for="newWord">أضف كلمة (عربي أو English)</label>
          <div class="addrow">
            <input id="newWord" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="مثال: مدرسة أو school">
            <button class="btn green" data-act="addWord" data-arg="${l.id}">➕</button>
          </div>
          <button class="btn soft wide small" data-act="bulkOpen" data-arg="${l.id}">📥 لصق قائمة كلمات</button>
          <p class="note">👀 لن تظهر الكلمة للطفل أثناء اللعب. سيظهر له: 🔊 النطق، والإيموجي، و📖 المعنى. راجعها هنا، وعدّل المعنى أو الإيموجي بزر ✏️.</p>
          <p class="muted small-note">🎤 اضغط المايكروفون لتسجيل نطق الكلمة بصوتك، فتسمعه اللعبة بدل صوت الجهاز.</p>
          <button class="btn soft wide small" data-act="fetchMeanings" data-arg="${l.id}">🌐 جلب المعاني والإيموجي الناقصة من الإنترنت</button>
          <div id="wordsBox" class="wordlist">${listRows(l)}</div>
          ${l.words.length ? `<button class="btn green wide top8" data-act="listEdit" data-arg="">✅ تمّ التعديل</button>` : ''}
        </div>
        <div class="row">
          <button class="btn soft" data-act="exportList" data-arg="${l.id}">💾 حفظ ملف</button>
          <button class="btn red" data-act="deleteList" data-arg="${l.id}">🗑️ حذف</button>
        </div>`
        : `<button class="btn soft wide" data-act="listEdit" data-arg="${l.id}">✏️ تعديل القائمة وكلماتها</button>`}
      </section>`);
      if (!editing) return;
      $('newWord').addEventListener('keydown', e => { if (e.key === 'Enter') Actions.addWord(l.id); });
      $('lname').addEventListener('change', e => { l.name = e.target.value.trim() || l.name; Store.save(); });
    },

    shop() {
      const p = Store.current();
      const card = (i, rare) => {
        const has = p.items.includes(i.id);
        return `<div class="sticker ${has ? 'got' : ''}">
          <div class="ic">${rare && !has ? '❔' : i.emoji}</div><div class="nm">${rare && !has ? 'قطعة نادرة' : i.name}</div>
          ${rare ? `<div class="ds">${has ? 'من كنز اليوم' : 'تأتي من الكنز'}</div>`
            : has ? '<div class="ds">✅ لديك</div>'
            : `<button class="mini" data-act="buy" data-arg="${i.id}" ${p.coins < i.price ? 'disabled' : ''}>🪙 ${i.price}</button>`}
        </div>`;
      };
      render(`<section class="screen">
        ${subHeader('🎒 متجر الأبطال')}
        <div class="card"><h2>عدّة البطل</h2><div class="stickers">${ITEMS.map(i => card(i)).join('')}</div></div>
        <div class="card"><h2>💎 قطع نادرة</h2><div class="stickers">${RARE_ITEMS.map(i => card(i, true)).join('')}</div></div>
      </section>`);
    },

    // أدائي: تقدّم الطفل وحده، بلا مقارنة بإخوته
    performance() {
      const p = Store.current();
      const s = Engine.stats(p);
      const t = Engine.today(p);
      const wk = week(p, 0), last = week(p, 1);
      const races = (p.races || []).slice(-12);
      const maxRace = Math.max(10, ...races.map(x => x.score));
      const avg = list => (list.length ? Math.round(list.reduce((n, x) => n + x.score, 0) / list.length) : null);
      const now = Date.now(), D = 864e5;
      const raceThis = avg((p.races || []).filter(x => now - x.at < 7 * D));
      const raceLast = avg((p.races || []).filter(x => now - x.at >= 7 * D && now - x.at < 14 * D));
      const lines = [];
      lines.push(wk.days ? `🔥 لعبت <b>${ltr(wk.days)}</b> ${wk.days === 1 ? 'يوماً' : 'أيام'} من آخر 7 أيام` : '🌱 العب قليلاً كل يوم لتبني سلسلة أيامك');
      if (wk.acc !== null) {
        lines.push(last.acc !== null && wk.acc > last.acc
          ? `📈 دقتك هذا الأسبوع ${ltr(wk.acc + '%')}، أفضل من الأسبوع الماضي (${ltr(last.acc + '%')})!`
          : `🎯 دقتك هذا الأسبوع ${ltr(wk.acc + '%')}${last.acc !== null ? ` (الأسبوع الماضي ${ltr(last.acc + '%')})` : ''}`);
      }
      if (raceThis !== null && raceLast !== null) {
        lines.push(raceThis > raceLast
          ? `🏃 أسرع من الأسبوع الماضي بـ <b>${ltr(raceThis - raceLast)}</b> كلمات في السباق!`
          : `🏃 متوسطك في السباق هذا الأسبوع ${ltr(raceThis)} (الأسبوع الماضي ${ltr(raceLast)})`);
      }
      const hard = Engine.tricky(p, 12);
      render(`<section class="screen">
        ${subHeader('📊 أدائي')}
        <div class="stats perf-stats">
          <div><b>🔥 ${ltr(s.streak)}</b><span>أيام متتالية</span></div>
          <div><b>⭐ ${ltr(s.mastered)}</b><span>كلمة متقنة</span></div>
          <div><b>🏃 ${ltr(s.best)}</b><span>أفضل سباق</span></div>
          <div><b>⏱️ ${ltr(Math.round(t.secs / 60))}</b><span>دقيقة اليوم</span></div>
        </div>
        <div class="card"><ul class="perf-lines">${lines.map(l => `<li>${l}</li>`).join('')}</ul></div>
        <div class="card"><h2>🏃 سباقاتي الأخيرة</h2>
          ${races.length ? `<div class="race-chart">${races.map(x => `<div class="col"><span>${ltr(x.score)}</span><i style="height:${Math.max(4, (x.score / maxRace) * 100)}%"></i></div>`).join('')}</div>
          <p class="muted center">من الأقدم (يمين) إلى الأحدث (يسار)</p>`
          : '<p class="muted">العب سباق الحروف لترى نتائجك هنا 🏃</p>'}
        </div>
        <div class="card"><h2>🎯 كلمات تحتاج تدريباً</h2>
          ${hard.length ? `<div class="chips">${hard.map(w => `<span class="w-chip" dir="${wdir(w)}">${wordHTML(w)}</span>`).join('')}</div>
            <button class="btn gold wide top8" data-act="startTricky">💪 تدرّب عليها الآن</button>`
          : '<p class="muted">لا توجد كلمات صعبة عليك الآن، أحسنت! 🌟</p>'}
        </div>
        <div class="card"><h2>🗺️ إتقاني في الخطة</h2>
          ${WORLDS.map(w => {
            const ws = Engine.state(p, w.id);
            // المناطق المفتوحة فقط، والمقفلة تُذكر بعددها
            const locked = w.regions.length - ws.unlocked;
            return `<h3 class="sub-h">${w.icon} ${w.short} <small>${ltr(`${ws.unlocked}/${w.regions.length}`)}</small></h3>
            ${w.regions.slice(0, ws.unlocked).map(r => {
              const m = Engine.mastery(p, Engine.regionWords(w.id, r));
              return `<div class="rep-row"><span>${r.icon} ${r.label}</span>${bar(m)}<b>${ltr(Math.round(m * 100) + '%')}</b></div>`;
            }).join('')}
            ${locked > 0 ? `<p class="muted perf-locked">🔒 ${ltr(locked)} ${locked === 1 ? 'منطقة تُفتح' : 'مناطق تُفتح'} عندما تتقن ما قبلها</p>` : ''}`;
          }).join('')}
        </div>
        ${freeReport(p, true)}
      </section>`);
    },

    heroes() {
      const p = Store.current();
      const rows = Store.state.profiles.map(k => ({ k, s: Engine.stats(k) })).sort((a, b) => b.s.mastered - a.s.mastered);
      const st = Engine.stats(p);
      const animals = WORLDS.flatMap(w => w.regions.map(r => ({ r, found: Engine.state(p, w.id).animals.includes(r.id) })));
      render(`<section class="screen">
        ${subHeader('🏆 لوحة الأبطال')}
        <div class="board">${rows.map(({ k, s }, i) => {
          const next = RANKS.find(r => r.min > s.best);
          const rank = Engine.rankFor(s.best);
          return `<div class="kid" style="--c:${kidColor(k)}">
            <div class="kid-head"><span class="kname">${k.avatar} ${esc(k.name)}</span>${i === 0 && s.mastered ? '<span class="crown">👑 المتصدّر</span>' : ''}</div>
            <div class="pts"><b>${s.mastered}</b> كلمة متقنة</div>
            ${bar(next ? s.best / next.min : 1)}
            <div class="kid-goal">${rank.emoji} ${rank.name}${next ? ` · التالية عند ${ltr(next.min)} في السباق` : ''}</div>
            <div class="stats"><div><b>${s.streak}</b><span>أيام متتالية</span></div><div><b>${s.best}</b><span>أفضل سباق</span></div><div><b>${k.coins}</b><span>عملات</span></div></div>
          </div>`;
        }).join('')}</div>
        <div class="card"><h2>🏅 شارات ${esc(p.name)}</h2>
          <div class="stickers">${BADGES.map(b => `<div class="sticker ${b.test(st) ? 'got' : 'locked'}"><div class="ic">${b.icon}</div><div class="nm">${b.name}</div><div class="ds">${b.desc}</div></div>`).join('')}</div>
        </div>
        <div class="card"><h2>🐾 حيوانات المغامرة <small>${ltr(`${animals.filter(a => a.found).length}/${animals.length}`)}</small></h2>
          <div class="stickers">${animals.map(a => `<div class="sticker ${a.found ? 'got' : 'locked'}"><div class="ic">${a.found ? a.r.animal.emoji : '🐾'}</div><div class="nm">${a.found ? a.r.animal.name : a.r.name}</div></div>`).join('')}</div>
        </div>
      </section>`);
    },

    // ───── الجولة ─────
    play() {
      const r = round;
      const p = Store.current();
      const race = r.mode === 'race';
      render(`<section class="screen play" dir="rtl">
        <header class="topbar">
          <button class="chip" data-act="exitRound" aria-label="خروج">✕</button>
          <h2 class="topbar-title">${r.title}</h2>
          <div class="chip">✅ <b id="score">0</b></div>
        </header>
        <div class="track ${race ? 'river' : 'trail'}">
          <span class="goal">${race ? '🏝️' : '💎'}</span>
          <span id="walker" class="walker" style="--p:0">${p.avatar}</span>
        </div>
        ${race ? `<div class="timebar"><i id="timebar"></i><span id="timeText">${CONFIG.raceSeconds}</span></div>`
          : `<div class="steps" id="steps">${'<i></i>'.repeat(Math.min(r.total, 30))}</div>`}
        <div class="prompt">
          ${World.buddy()}
          <div class="stamp" id="stamp"></div>
          <div class="prompt-top"><span class="pic" id="pic"></span><span class="meaning" id="meaning"></span></div>
          <div class="wordbox" id="wordBox" data-act="peek"></div>
          <div class="flashbar"><i id="flashFill"></i></div>
          <div class="tools" id="tools"></div>
        </div>
        <div class="answer" id="answer" aria-live="polite"></div>
        <div class="feedback" id="feedback"></div>
        <div class="pad" id="pad"></div>
      </section>`);
    },

    results(sum) {
      const pct = sum.asked ? Math.round((sum.right / sum.asked) * 100) : 0;
      const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;
      const p = Store.current();
      const titleEmoji = sum.mode === 'race' ? '🏁' : pct === 100 ? '🏆' : pct >= 60 ? '🎉' : '💪';
      const msg = sum.mode === 'race' ? `كتبت ${sum.right} كلمة صحيحة!`
        : pct === 100 ? 'جولة كاملة بلا أخطاء. أنت بطل!' : pct >= 60 ? 'أحسنت! تدرّب قليلاً على الأخطاء.' : 'لا بأس، كل بطل يتعلم من أخطائه!';
      render(`<section class="screen">
        <div class="card result-card" id="cert">
          <div class="cert-only cert-head">🦸 شهادة بطل الإملاء</div>
          <div class="big-emoji">${World.resultFace(titleEmoji, sum.mode === 'race' || pct >= 60)}</div>
          <h2>${esc(p.name)} ${p.avatar}</h2>
          <p class="cert-title">${sum.title}</p>
          <div class="stars">${sum.mode === 'race' ? '' : '⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</div>
          <div class="score-line"><b>${sum.right}</b>${sum.mode === 'race' ? ' كلمة' : ` من ${sum.asked}`}</div>
          <p>${msg}</p>
          ${sum.newRecord ? '<div class="banner">🏅 رقم قياسي جديد!</div>' : ''}
          ${sum.rankUp ? `<div class="banner">🎖️ رتبة جديدة: ${sum.rankUp.emoji} ${sum.rankUp.name}</div>` : ''}
          ${sum.events.map(e => `<div class="banner">${eventBanner(e)}</div>`).join('')}
          ${sum.station ? `<div class="banner">🧭 أنجزت محطة ${sum.station.name}</div>` : ''}
          <div class="chip coins inline no-print">🪙 +${sum.coins}</div>
          <div class="cert-only cert-date">${new Date().toLocaleDateString('ar-EG-u-nu-latn')} · أبطال الإملاء</div>
        </div>
        ${sum.mistakes.length ? `<div class="card no-print"><h2>📌 كلمات تحتاج تدريباً</h2>
          ${sum.mistakes.map(m => `<div class="mi"><button class="mini" data-act="sayText" data-arg="${esc(m.word.t)}" data-lang="${m.word.lang}">🔊</button>
            <div class="mi-body"><b dir="${wdir(m.word)}">${wordHTML(m.word)}</b>${m.word.m ? `<small> ${esc(m.word.m)}</small>` : ''}
            ${m.given ? diffTiles(m.given, m.word) : ''}</div></div>`).join('')}
        </div>` : ''}
        ${sum.chestReady ? '<button class="btn gold wide no-print" data-act="openChest">🧰 افتح كنز اليوم!</button>' : ''}
        <div class="no-print result-actions">
          ${sum.mistakes.length ? '<button class="btn pink wide" data-act="retryWrong">🎯 درّبني على أخطائي</button>' : ''}
          <button class="btn blue wide" data-act="again">🔁 العب مرة أخرى</button>
          <button class="btn soft wide" data-act="printCert">🖨️ طباعة الشهادة</button>
          <button class="btn soft wide" data-act="afterRound">✅ متابعة</button>
        </div>
      </section>`);
    },

    // ───── ولي الأمر ─────
    parent() {
      if (Store.state.pin && !parentOK) return go('profiles', null, true);
      const tabs = [['kids', '📊 التقارير'], ['settings', '⚙️ الإعدادات'], ['data', '💾 البيانات']];
      const body = parentTab === 'kids' ? parentKids() : parentTab === 'settings' ? parentSettings() : parentData();
      render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="leaveParent">→ خروج</button>
          <h2 class="topbar-title">👨‍👩‍👧 ولي الأمر</h2><span></span>
        </header>
        <div class="world-switch">${tabs.map(t => `<button class="${parentTab === t[0] ? 'on' : ''}" data-act="parentTab" data-arg="${t[0]}">${t[1]}</button>`).join('')}</div>
        ${body}
      </section>`);
      if (parentTab === 'settings') bindSettings();
      if (parentTab === 'data') $('backupFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFile(f); };
    },
  };

  // ───── أجزاء الشاشات ─────
  const dots = box => `<span class="box-dots">${[0, 1, 2].map(i => `<i class="${box > i ? 'on' : ''}"></i>`).join('')}</span>`;
  function wordTile(p, x, i, rid) {
    return `<div class="wtile">
      <span class="wi">${x.e}</span>
      <div class="wt" dir="${wdir(x)}">${wordHTML(x)}</div>
      <small>${esc(x.m)}</small>
      ${dots(Engine.peekBox(p, x))}
      <div class="wbtns"><button class="wbtn" data-act="sayWord" data-arg="${i}" data-region="${rid}">🔊</button>
      <button class="wbtn rec ${Speech.isRecording(x.t) ? 'on' : ''} ${Speech.hasRec(x.t) ? 'has' : ''}" data-act="recWord" data-arg="${esc(x.t)}">${Speech.isRecording(x.t) ? '⏹️' : '🎤'}</button></div>
    </div>`;
  }
  function listRows(l) {
    if (!l.words.length) return '<p class="muted center">لا توجد كلمات بعد. أضف كلمة لتبدأ 👆</p>';
    return Engine.listWords(l).map((w, i) => `<div class="witem">
      <span class="idx">${i + 1}</span>
      <div class="txt" dir="${wdir(w)}">${w.e ? `${w.e} ` : ''}${wordHTML(w)}${w.m ? `<small dir="auto">📖 ${esc(w.m)}</small>` : ''}</div>
      <span class="tag">${w.lang === 'ar' ? 'عربي' : 'EN'}</span>
      <button class="wbtn" data-act="sayIdx" data-arg="${i}" data-list="${l.id}">🔊</button>
      <button class="wbtn rec ${Speech.isRecording(w.t) ? 'on' : ''} ${Speech.hasRec(w.t) ? 'has' : ''}" data-act="recWord" data-arg="${esc(w.t)}">${Speech.isRecording(w.t) ? '⏹️' : '🎤'}</button>
      <button class="wbtn" data-act="editWord" data-arg="${i}" data-list="${l.id}" aria-label="تعديل">✏️</button>
      <button class="wbtn del" data-act="delWord" data-arg="${i}" data-list="${l.id}" aria-label="حذف">✕</button>
    </div>`).join('');
  }
  function listPlay(p, l) {
    if (!l.words.length) return '';
    const n = l.words.length;
    const groups = Engine.chunks(l);
    let open = 0;
    for (let i = 0; i < groups.length; i++) {
      open = i;
      if (Engine.mastery(p, groups[i]) < CONFIG.unlockAt) break;
    }
    const opts = [[0, 'كلها معاً'], [3, '3'], [5, '5'], [8, '8'], [10, '10']].filter(o => !o[0] || o[0] < n);
    const st = Engine.state(p, 'list:' + l.id);
    const many = Store.state.profiles.length > 1;
    return `<div class="card">
      <h2>🪜 التدريب التدريجي</h2>
      ${opts.length > 1 ? `<p class="lbl">كم كلمة تتدرّب عليها في كل مرة؟</p>
      <div class="chips chunk-chips">${opts.map(o => `<button class="land-chip ${(l.chunk || 0) === o[0] ? 'on' : ''}" data-act="setChunk" data-arg="${o[0]}" data-list="${l.id}">${o[0] ? `${o[1]} كلمات` : o[1]}</button>`).join('')}</div>` : ''}
      <div class="trail-map tight">${groups.map((g, i) => {
        const locked = groups.length > 1 && i > open;
        const m = Engine.mastery(p, g);
        const done = m >= CONFIG.unlockAt;
        // المجموعة التي عليها الدور تُلوَّن ويظهر عليها زر البدء بوضوح
        return `<button class="region full group-words ${locked ? 'locked' : done ? 'done' : 'now'}" style="--c:#c2457d" data-act="startListGroup" data-arg="${i}" data-list="${l.id}">
          <span class="region-icon">${locked ? '🔒' : m >= CONFIG.unlockAt ? '⭐' : '🎯'}</span>
          <span class="region-info"><b>${groups.length > 1 ? `المجموعة ${i + 1}` : 'تدرّب على كل الكلمات'} <small>${ltr(Math.round(m * 100) + '%')}</small></b>
          <span class="chips">${g.map(w => `<span class="w-chip" dir="${wdir(w)}">${wordHTML(w)}</span>`).join('')}</span>${bar(m)}</span>
          ${locked ? '' : `<span class="play-pill">${done ? '↻ مجدداً' : '▶ ابدأ'}</span>`}
        </button>`;
      }).join('')}</div>
    </div>
    <div class="card">
      <h2>🎮 العب بكلمات القائمة</h2>
      <div class="menu">
        <button class="big-btn blue" data-act="startListExam" data-arg="${l.id}"><span>📝</span><b>اختبار إملاء</b><small>${n} كلمة${st.examBest !== null && st.examBest !== undefined ? ` · الأفضل ${st.examBest}/${n}` : ''}</small></button>
        <button class="big-btn gold" data-act="startListRace" data-arg="${l.id}"><span>🏃</span><b>سباق</b><small>${st.bestRace ? `الأفضل ${st.bestRace}` : `${CONFIG.raceSeconds} ثانية`}</small></button>
        <button class="big-btn pink wide2" data-act="brainOpen" data-arg="${l.id}"><span>🧠</span><b>تحدّي العقل</b><small>${Brain.GAMES.length} ألعاب قصيرة</small></button>
      </div>
      ${many ? `<h3 class="sub-h">🤝 مع إخوتك</h3>
      <div class="menu">
        <button class="big-btn teal" data-act="playList" data-kind="brain" data-arg="${l.id}"><span>🧠</span><b>مبارزة العقول</b><small>من يفوز بأكثر الألعاب؟</small></button>
        <button class="big-btn gold" data-act="playList" data-kind="race" data-arg="${l.id}"><span>🏃</span><b>سباق الحروف</b><small>من يصل أولاً؟</small></button>
        <button class="big-btn blue wide2" data-act="playList" data-kind="rope" data-arg="${l.id}"><span>🪢</span><b>شدّ الحبل</b><small>لاعبان وجهاً لوجه</small></button>
      </div>` : ''}
    </div>`;
  }
  function refreshList(l) {
    if ($('wordsBox')) $('wordsBox').innerHTML = listRows(l);
    if ($('listPlay')) $('listPlay').innerHTML = listPlay(Store.current(), l);
  }
  Speech.onChange(() => {
    if (nav.cur === 'list') { const l = Store.list(nav.arg); if (l) refreshList(l); }
    if (nav.cur === 'region' && !round) Screens.region(nav.arg);
  });

  function diffTiles(given, word) {
    const { ops } = Engine.align(given, word);
    return `<div class="difft" dir="${wdir(word)}">${ops.map(o => `<span class="${o.k}">${o.c === ' ' ? '␣' : esc(o.c)}</span>`).join('')}</div>
      <small class="muted">كتبتَ: <span dir="${wdir(word)}">${esc(given)}</span></small>`;
  }

  // أيام اللعب ودقة الإجابات في أسبوع: 0 = آخر 7 أيام، 1 = السبعة التي قبلها
  function week(p, back) {
    const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let days = 0, asked = 0, right = 0;
    for (let i = back * 7; i < back * 7 + 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const x = (p.days || {})[key(d)];
      if (x && x.asked > 0) { days++; asked += x.asked; right += x.right; }
    }
    return { days, acc: asked ? Math.round((right / asked) * 100) : null };
  }
  // أداء الطفل في قوائم الوضع الحر: القوائم مشتركة بين الأبطال، ولكل طفل تقدّمه في كل قائمة
  function freeReport(k, self) {
    const lists = Store.state.lists.filter(l => l.words.length);
    if (!lists.length) return '';
    const rows = lists.map(l => {
      const words = Engine.listWords(l);
      const st = (k.free || {})[l.id] || { facts: {} };
      const facts = words.map(w => st.facts[w.t]).filter(Boolean);
      const seen = facts.filter(f => f.seen > 0).length;
      const right = facts.reduce((n, f) => n + (f.right || 0), 0);
      const wrong = facts.reduce((n, f) => n + (f.wrong || 0), 0);
      const hard = words.filter(w => { const f = st.facts[w.t]; return f && f.wrong > 0 && Engine.peekBox(k, w) < CONFIG.masteredBox; })
        .sort((a, b) => st.facts[b.t].wrong - st.facts[a.t].wrong).slice(0, 8);
      return { l, words, m: Engine.mastery(k, words), seen, acc: right + wrong ? Math.round((right / (right + wrong)) * 100) : null, st, hard };
    });
    const used = rows.filter(r => r.seen);
    const unused = rows.filter(r => !r.seen);
    return `<div class="card"><h2>${self ? '✍️ قوائمي' : '📝 القوائم الحرة'}</h2>
      ${used.length ? used.map(r => `<div class="free-rep">
        <div class="rep-row"><span><b>${esc(r.l.name)}</b></span>${bar(r.m)}<b>${ltr(Math.round(r.m * 100) + '%')}</b></div>
        <p class="free-rep-meta">${self ? 'تدرّبت' : 'تدرّب'} على ${ltr(`${r.seen}/${r.words.length}`)} كلمة
          ${r.acc !== null ? ` · دقة ${ltr(r.acc + '%')}` : ''}
          ${r.st.bestRace ? ` · أفضل سباق ${ltr(r.st.bestRace)}` : ''}
          ${r.st.examBest !== null && r.st.examBest !== undefined ? ` · أفضل اختبار ${ltr(`${r.st.examBest}/${r.words.length}`)}` : ''}</p>
        ${r.hard.length ? `<div class="chips">${r.hard.map(w => `<span class="w-chip" dir="${wdir(w)}">${wordHTML(w)}</span>`).join('')}</div>` : ''}
      </div>`).join('') : `<p class="muted">${self ? 'لم تتدرّب على أي قائمة بعد. افتح «كلماتي» وابدأ ✍️' : `لم يتدرّب ${esc(k.name)} على أي قائمة حرة بعد.`}</p>`}
      ${unused.length && used.length ? `<p class="muted free-rep-none">${self ? 'لم تتدرّب' : 'لم يتدرّب'} بعد على: ${unused.map(r => esc(r.l.name)).join('، ')}</p>` : ''}
    </div>`;
  }
  function parentKids() {
    const kids = Store.state.profiles;
    if (!kids.length) return '<div class="card empty"><span>🧒</span><p>لا يوجد أطفال بعد.</p></div>';
    if (!kids.some(k => k.id === parentKid)) parentKid = kids[0].id;
    const k = kids.find(x => x.id === parentKid);
    const s = Engine.stats(k);
    const acc = s.right + s.wrong ? Math.round((s.right / (s.right + s.wrong)) * 100) : 0;
    const hard = Engine.tricky(k, 12);
    return `<div class="world-switch">${kids.map(x => `<button class="${x.id === k.id ? 'on' : ''}" data-act="parentKid" data-arg="${x.id}">${x.avatar} ${esc(x.name)}</button>`).join('')}</div>
      <div class="card">
        <h2>${k.avatar} ${esc(k.name)}</h2>
        <div class="stats">
          <div><b>${s.mastered}</b><span>كلمة متقنة</span></div>
          <div><b>${ltr(acc + '%')}</b><span>دقة الإجابات</span></div>
          <div><b>${Math.round(s.secs / 60)}</b><span>دقيقة لعب</span></div>
        </div>
        ${WORLDS.map(w => {
          const ws = Engine.state(k, w.id);
          return `<h3 class="sub-h">${w.icon} ${w.short} <small>${ltr(`${ws.unlocked}/${w.regions.length}`)}</small></h3>
          ${w.regions.map((r, i) => {
            const m = Engine.mastery(k, Engine.regionWords(w.id, r));
            return `<div class="rep-row ${i >= ws.unlocked ? 'off' : ''}"><span>${r.icon} ${r.label}</span>${bar(m)}<b>${ltr(Math.round(m * 100) + '%')}</b></div>`;
          }).join('')}
          ${ws.unlocked < w.regions.length ? `<button class="mini" data-act="unlockAll" data-arg="${w.id}">🔓 فتح كل المناطق</button>` : ''}`;
        }).join('')}
      </div>
      ${freeReport(k)}
      <div class="card"><h2>🎯 كلمات تحتاج تدريباً</h2>
        ${hard.length ? `<div class="chips">${hard.map(w => `<span class="w-chip" dir="${wdir(w)}">${wordHTML(w)}</span>`).join('')}</div>` : '<p class="muted">لا توجد كلمات صعبة حتى الآن 👏</p>'}
      </div>
      <button class="btn red wide" data-act="deleteKid" data-arg="${k.id}">🗑️ حذف ملف ${esc(k.name)}</button>`;
  }

  function parentSettings() {
    const s = S();
    const opt = (v, t, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${t}</option>`;
    const voices = lang => {
      const list = Speech.voicesFor(lang);
      const cur = lang === 'ar' ? s.voiceAr : s.voiceEn;
      return list.length ? list.map(v => opt(esc(v.name), `${esc(v.name)} (${esc(v.lang)})`, cur)).join('') : '<option value="">لا يوجد صوت على هذا الجهاز</option>';
    };
    const noAr = !Speech.voicesFor('ar').length;
    return `<div class="card">
      <h2>✏️ طريقة الإملاء</h2>
      <label class="lbl">مدة إظهار الكلمة قبل إخفائها</label>
      <select data-set="flash" data-num="1">${opt(0, 'لا تُظهر (إملاء سماعي فقط)', s.flash)}${opt(2, '2 ثانية', s.flash)}${opt(3, '3 ثوانٍ', s.flash)}${opt(5, '5 ثوانٍ', s.flash)}${opt(8, '8 ثوانٍ', s.flash)}${opt(-1, 'تبقى ظاهرة (نسخ للمبتدئين)', s.flash)}</select>
      <p class="muted small-note">يطبَّق على تدريب الخطط فقط. الكلمة المتقنة جداً تُملى سماعاً تلقائياً، وإذا لم يتوفر صوت تُعرض بدل ذلك.</p>
      <p class="muted small-note">في الوضع الحر واختبار الإملاء لا تُعرض الكلمة: يسمع الطفل نطقها ويرى الإيموجي والمعنى فقط.</p>
      <label class="lbl">محاولات الكتابة لكل كلمة</label>
      <select data-set="tries" data-num="1">${[1, 2, 3].map(n => opt(n, n, s.tries)).join('')}</select>
      <label class="lbl">هدف اللعب اليومي</label>
      <select data-set="goalMin" data-num="1">${[10, 15, 20, 30].map(n => opt(n, n + ' دقيقة', s.goalMin)).join('')}</select>
    </div>
    <div class="card">
      <h2>🔍 التصحيح</h2>
      <label class="switchrow"><span>تجاهل التشكيل ( َ ُ ِ ّ )</span><input type="checkbox" data-set="ignoreTashkeel" ${s.ignoreTashkeel ? 'checked' : ''}></label>
      <label class="switchrow"><span>التساهل في الهمزات والتاء (أ إ آ = ا، ة = ه)</span><input type="checkbox" data-set="lenientHamza" ${s.lenientHamza ? 'checked' : ''}></label>
      <label class="switchrow"><span>مراعاة الأحرف الكبيرة في English</span><input type="checkbox" data-set="strictCase" ${s.strictCase ? 'checked' : ''}></label>
    </div>
    <div class="card">
      <h2>🔊 الصوت</h2>
      <label class="switchrow"><span>نطق الكلمات</span><input type="checkbox" data-set="speak" ${s.speak ? 'checked' : ''}></label>
      <label class="lbl">سرعة النطق</label>
      <select data-set="rate" data-num="1">${opt(0.6, 'بطيء', s.rate)}${opt(0.8, 'متوسط', s.rate)}${opt(1, 'عادي', s.rate)}</select>
      <label class="lbl">🗣️ الصوت العربي</label><select data-set="voiceAr">${voices('ar')}</select>
      <label class="lbl">🗣️ الصوت الإنجليزي</label><select data-set="voiceEn">${voices('en')}</select>
      <div class="row"><button class="btn soft" data-act="testVoice" data-arg="ar">🔊 اختبار العربي</button><button class="btn soft" data-act="testVoice" data-arg="en">🔊 Test English</button></div>
      ${noAr ? '<p class="note">⚠️ لا يوجد صوت عربي على هذا الجهاز. ثبّته من إعدادات اللغة والكلام في النظام، أو سجّل الكلمات بصوتك 🎤. وحتى ذلك الحين تُعرض الكلمة العربية بدل نطقها.</p>' : ''}
    </div>
    <div class="card">
      <h2>🔐 رمز ولي الأمر</h2>
      <button class="btn soft wide" data-act="setPin">${Store.state.pin ? 'تغيير الرمز' : 'إنشاء رمز'}</button>
      ${Store.state.pin ? '<button class="link-btn dark" data-act="clearPin">إزالة الرمز</button>' : ''}
    </div>
    ${kidPinsCard()}`;
  }
  function bindSettings() {
    app.querySelectorAll('[data-set]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.set;
        S()[k] = el.type === 'checkbox' ? el.checked : el.dataset.num ? Number(el.value) : el.value;
        Store.save();
        toast('✅ تم الحفظ', 1200);
      });
    });
  }
  function parentData() {
    return `<div class="card">
      <h2>💾 نسخة احتياطية</h2>
      <p class="muted">تحفظ الملفات والقوائم والتقدم في ملف واحد لنقلها إلى جهاز آخر. لا تشمل التسجيلات الصوتية.</p>
      <div class="row"><button class="btn blue" data-act="backup">💾 حفظ نسخة</button><button class="btn soft" data-act="restore">📂 استعادة</button></div>
      <input type="file" id="backupFile" accept=".json,application/json" hidden>
    </div>${Group.syncCard()}`;
  }

  function importFile(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result);
        let raw;
        let name = file.name.replace(/\.[^.]+$/, '');
        try {
          const o = JSON.parse(text);
          raw = o.words || o;
          name = o.name || name;
          if (!Array.isArray(raw)) throw new Error('bad');
        } catch (e) {
          if (/\.json$/i.test(file.name)) throw e;
          raw = splitWords(text);
        }
        const l = Store.addList(name);
        addParsed(l, raw.map(x => (typeof x === 'string' ? { t: x } : x)));
        if (!l.words.length) { Store.removeList(l.id); throw new Error('empty'); }
        toast(`✅ تم فتح ${l.words.length} كلمة`);
        go('list', l.id);
      } catch (e) { toast('❌ الملف غير صالح'); }
    };
    r.readAsText(file);
  }
  function restoreFile(file) {
    const r = new FileReader();
    r.onload = () => {
      ask('استعادة النسخة؟', 'ستحل بيانات الملف محل كل ما هو محفوظ على هذا الجهاز الآن.', 'استعادة', true).then(ok => {
        if (!ok) return;
        try {
          Store.restore(String(r.result));
          toast('✅ تمت الاستعادة');
          parentOK = false;
          go('profiles', null, true);
        } catch (e) { toast('❌ الملف غير صالح'); }
      });
    };
    r.readAsText(file);
  }
  // بعد إضافة كلمات: يكمل الناقص من معانٍ وإيموجي عبر الإنترنت دون أن يوقف اللعب
  function autoFill(l, texts) {
    if (!navigator.onLine || typeof Online === 'undefined') return;
    Online.fillList(l, texts).then(n => {
      if (!n) return;
      if (nav.cur === 'list' && nav.arg === l.id) refreshList(l);
      toast(`🌐 جُلب المعنى أو الإيموجي لـ ${n} كلمة. راجعها بزر ✏️`, 3000);
    });
  }
  function addParsed(l, items) {
    let n = 0;
    const added = [];
    items.forEach(x => {
      const t = String(x.t || '').trim();
      if (!t || l.words.some(w => w.t === t)) return;
      l.words.push({ t, lang: x.lang === 'ar' || x.lang === 'en' ? x.lang : Engine.detectLang(t), h: String(x.h || ''), e: String(x.e || '') });
      added.push(t);
      n++;
    });
    Store.save();
    if (added.length) autoFill(l, added);
    return n;
  }

  // ───── لوحة المفاتيح ─────
  const KB = {
    ar: [['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'], ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'], ['ذ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', 'د', 'ئ']],
    en: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"], ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-']],
  };
  const HARAKAT_KEYS = ['َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ً', 'ٌ', 'ٍ'];
  const keyBtn = (k, label = k, cls = '') => `<button class="k ${cls}" data-key="${esc(k)}">${label}</button>`;
  function keyboard(word, caps = round && round.q && round.q.caps) {
    const strictT = word.lang === 'ar' && !S().ignoreTashkeel && Engine.strip(Engine.voweled(word)) !== Engine.voweled(word);
    const shift = word.lang === 'en' && S().strictCase;
    const rows = KB[word.lang].map(r => `<div class="k-row">${r.map(k => keyBtn(k, caps ? k.toUpperCase() : k)).join('')}</div>`);
    const last = word.lang === 'ar'
      ? ['أ', 'إ', 'آ'].map(k => keyBtn(k)).join('') + keyBtn(' ', 'مسافة', 'space') + keyBtn('del', '⌫', 'util') + keyBtn('ok', '✓', 'ok')
      : (shift ? keyBtn('shift', '⇧', 'util') : '') + keyBtn(' ', 'space', 'space') + keyBtn('del', '⌫', 'util') + keyBtn('ok', '✓', 'ok');
    return `<div class="kb" dir="${word.lang === 'ar' ? 'rtl' : 'ltr'}">
      ${strictT ? `<div class="k-row">${HARAKAT_KEYS.map(k => keyBtn(k, 'ـ' + k, 'h')).join('')}</div>` : ''}
      ${rows.join('')}<div class="k-row">${last}</div></div>`;
  }

  // ───── بدء الجولات ─────
  function startRound(opts) {
    const p = Store.current();
    const pool = opts.pool.filter(Boolean);
    if (!pool.length) { toast('لا توجد كلمات لهذه الجولة'); return; }
    const mode = opts.mode;
    Sound.unlock();
    lastRound = opts;
    const queue = mode === 'exam' || mode === 'review' || mode === 'retry' ? Engine.shuffle(pool) : null;
    const total = queue ? queue.length : mode === 'race' ? 0 : opts.total || Math.min(CONFIG.practiceLength, Math.max(4, pool.length * 2));
    round = {
      mode, src: opts.src, pool, queue, total, title: opts.title,
      asked: 0, right: 0, cleared: 0, coins: 0, mistakes: [], q: null, locked: true, last: null,
      goal: mode === 'race' ? Engine.raceGoal(Engine.state(p, opts.src).bestRace) : 0,
      rankBefore: Engine.rankFor(Engine.stats(p).best),
    };
    Screens.play();
    if (mode === 'race') countdown(3); else nextQuestion();
  }

  function countdown(n) {
    if (!round) return;
    if (n === 0) {
      Sound.play('go');
      startTimer();
      nextQuestion();
      return;
    }
    Sound.play('tick');
    $('wordBox').innerHTML = `<span class="count">${n}</span>`;
    $('feedback').textContent = 'استعد...';
    round.timeout = setTimeout(() => countdown(n - 1), 800);
  }
  function startTimer() {
    const total = CONFIG.raceSeconds * 1000;
    round.endsAt = performance.now() + total;
    round.timer = setInterval(() => {
      const left = round.endsAt - performance.now();
      $('timebar').style.width = Math.max(0, (left / total) * 100) + '%';
      $('timebar').classList.toggle('hurry', left <= 10000);
      $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) finishRound();
    }, 100);
  }

  function flashFor(q) {
    const s = S();
    const can = Speech.can(q.word);
    const box = Engine.peekBox(Store.current(), q.word);
    const mode = round.mode;
    // الوضع الحر واختبار الإملاء: لا تُعرض الكلمة، يكفي نطقها أو معناها والإيموجي
    if (round.src.startsWith('list:') || mode === 'exam') return can || q.word.m ? 0 : 3;
    if (q.stage === 'write' && box >= CONFIG.audioOnlyBox && can) return 0;
    if (mode === 'race') return 2;
    if (s.flash === 0) return can ? 0 : 3;   // لا يُسمع الصوت: لا بد من رؤية الكلمة
    return s.flash;
  }

  function nextQuestion() {
    const r = round;
    if (!r) return;
    const p = Store.current();
    const word = r.queue ? r.queue.shift() : Engine.pick(p, r.pool, r.last);
    r.last = word.t;
    const stage = Engine.stageFor(p, word, r.mode);
    const q = { word, stage, input: '', attempt: 0, helped: false, hints: 0, copy: false, hidden: false, caps: false, start: performance.now(), picked: [] };
    r.q = q;
    r.locked = false;
    q.flash = stage === 'fill' ? -2 : flashFor(q);
    if (stage === 'tile') Object.assign(q, Engine.tileData(word, r.mode !== 'race'));
    if (stage === 'fill') Object.assign(q, Engine.fillData(word));
    clearInterval(r.flashTimer);

    $('stamp').className = 'stamp';
    $('feedback').innerHTML = '';
    $('pic').textContent = word.e || (word.lang === 'ar' ? '📝' : '🔤');
    $('meaning').textContent = word.m || '';
    $('meaning').dir = 'auto';
    const box = $('wordBox');
    box.dir = wdir(word);
    box.className = 'wordbox';
    $('answer').dir = wdir(word);
    $('answer').className = 'answer';

    if (stage === 'fill') {
      box.innerHTML = fillHTML(word, q.at);
      $('answer').hidden = true;
      $('pad').innerHTML = `<div class="choices">${q.choices.map(c => `<button class="choice" data-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
      $('flashFill').style.width = '0%';
    } else {
      $('answer').hidden = false;
      if (stage === 'tile') {
        $('pad').innerHTML = `<div class="tiles" dir="${wdir(word)}">${q.tiles.map((c, i) => `<button class="tile" data-tile="${i}">${esc(c)}</button>`).join('')}</div>
          <button class="btn soft small" data-act="tileBack">⌫ تراجع</button>`;
      } else {
        $('pad').innerHTML = keyboard(word);
      }
      updateAnswer();
      startFlash(q);
    }
    renderTools();
    setTimeout(() => { if (round && round.q === q) Speech.say(word); }, 120);
  }

  function startFlash(q) {
    const box = $('wordBox');
    const fill = $('flashFill');
    clearInterval(round.flashTimer);
    if (q.flash === 0) { hideWord(q); return; }
    box.innerHTML = `<span>${wordHTML(q.word)}</span>`;
    if (q.flash === -1) { fill.style.width = '100%'; return; }
    const total = q.flash * 1000;
    const start = Date.now();
    fill.style.width = '100%';
    round.flashTimer = setInterval(() => {
      const el = Date.now() - start;
      fill.style.width = Math.max(0, 100 - (el / total) * 100) + '%';
      if (el >= total) hideWord(q);
    }, 50);
  }
  function hideWord(q) {
    if (!round || round.q !== q) return;
    clearInterval(round.flashTimer);
    q.hidden = true;
    const box = $('wordBox');
    box.classList.add('hidden-word');
    box.textContent = hiddenText(q);
    $('flashFill').style.width = '0%';
    renderTools();
  }
  const hiddenText = q => (q.flash !== 0 ? '••••' : Speech.can(q.word) ? '🔊 استمع واكتب' : '📖 اكتب الكلمة حسب المعنى');
  const noPeek = r => r.mode === 'exam' || r.mode === 'race' || r.src.startsWith('list:');
  function renderTools() {
    const r = round;
    const q = r.q;
    if (!q) return;
    const can = Speech.can(q.word);
    let h = S().speak ? `<button class="tool" data-act="replay" ${can ? '' : 'disabled'}>🔊 استمع</button>` : '';
    if (q.copy) h += '<button class="tool" data-act="skipCopy">⏭️ التالي</button>';
    else if (r.mode !== 'exam' && r.mode !== 'race' && q.stage !== 'fill') {
      if (q.hidden && !noPeek(r)) h += '<button class="tool" data-act="peek">👁️ أرني</button>';
      if (q.stage === 'write') h += '<button class="tool" data-act="hint">💡 تلميح</button>';
    }
    $('tools').innerHTML = h;
  }
  function updateAnswer() {
    const q = round.q;
    const el = $('answer');
    if (q.stage === 'tile') {
      const left = q.ls.length - q.picked.length;
      el.innerHTML = `<span>${esc(q.picked.map(i => q.tiles[i]).join(''))}</span>${left > 0 ? `<i class="rest">${'•'.repeat(left)}</i>` : ''}`;
    } else {
      el.innerHTML = q.input ? esc(q.input) : `<i class="rest">${q.word.lang === 'ar' ? 'اكتب هنا' : 'type here'}</i>`;
    }
  }

  // ───── الإجابة ─────
  function typeKey(k) {
    const r = round;
    if (!r || r.locked || !r.q || r.q.stage !== 'write') return;
    const q = r.q;
    if (k === 'ok') return submitWrite();
    if (k === 'del') {
      q.input = Array.from(q.input).slice(0, -1).join('');
      Sound.play('del');
    } else if (k === 'shift') {
      q.caps = !q.caps;
      $('pad').innerHTML = keyboard(q.word);
      return;
    } else {
      if (Array.from(q.input).length >= 40) return;
      const ch = q.caps ? k.toUpperCase() : k;
      q.input += ch;
      if (q.caps) { q.caps = false; $('pad').innerHTML = keyboard(q.word); }
      Sound.play('tap');
    }
    // من يبدأ الكتابة تختفي عنه الكلمة: حتى لا تتحول إلى نسخ
    if (!q.copy && q.flash > 0 && !q.hidden) hideWord(q);
    updateAnswer();
    $('answer').classList.remove('shake');
  }
  function submitWrite() {
    const r = round;
    const q = r.q;
    if (!q.input.trim()) { $('answer').classList.add('shake'); setTimeout(() => $('answer') && $('answer').classList.remove('shake'), 400); return; }
    const ok = Engine.same(q.input, q.word);
    if (q.copy) {
      if (ok) {
        Sound.play('right');
        $('feedback').innerHTML = '<span class="good">👏 أحسنت، هكذا تُكتب!</span>';
        r.locked = true;
        r.timeout = setTimeout(afterAnswer, 800);
      } else {
        Sound.play('wrong');
        shake();
      }
      return;
    }
    if (ok) return finishQuestion(true, q.helped || q.attempt > 0);
    if (r.mode === 'race' || r.mode === 'exam') return finishQuestion(false);
    q.attempt++;
    if (q.attempt < S().tries) {
      Sound.play('wrong');
      shake();
      const near = Engine.align(q.input, q.word).dist <= 1;
      $('feedback').innerHTML = `<span class="bad">${near ? '🤏 قريب جداً! حرف واحد مختلف. حاول مرة أخرى' : '❌ غير مطابقة. استمع وحاول مرة أخرى'}</span>`;
      Speech.say(q.word);
      return;
    }
    finishQuestion(false);
  }
  function shake() {
    const a = $('answer');
    a.classList.remove('shake');
    void a.offsetWidth;
    a.classList.add('shake');
  }

  function finishQuestion(ok, helped) {
    const r = round;
    const q = r.q;
    const p = Store.current();
    r.locked = true;
    clearInterval(r.flashTimer);
    const given = q.stage === 'write' ? q.input : q.stage === 'tile' ? q.picked.map(i => q.tiles[i]).join('') : q.ls.map((c, i) => (i === q.at ? q.answerChoice : c)).join('');
    Engine.record(p, q, ok, helped);
    Engine.addAnswer(p, q, ok, performance.now() - q.start, given);
    r.asked++;
    if (ok) {
      r.right++;
      r.coins += q.stage === 'write' ? COINS.perWrite : COINS.perCorrect;
    } else {
      r.mistakes.push({ word: q.word, given });
    }
    $('score').textContent = r.right;

    // خطوات التقدم
    let progress;
    if (r.mode === 'race') progress = Math.min(r.right / r.goal, 1);
    else if (r.mode === 'review') {
      if (ok) {
        r.cleared++;
        Engine.clearMistake(p, q.word);
        const dot = $('steps').children[r.cleared - 1];
        if (dot) dot.className = 'right';
      } else r.queue.push(q.word);
      progress = r.cleared / r.total;
    } else {
      const dot = $('steps').children[r.asked - 1];
      if (dot) dot.className = r.mode === 'exam' ? 'done' : ok ? 'right' : 'wrong';
      progress = r.asked / r.total;
    }
    $('walker').style.setProperty('--p', progress);

    // في الاختبار لا يظهر التصحيح إلا في النهاية، مثل الإملاء الحقيقي
    if (r.mode === 'exam') {
      Sound.play('tap');
      $('feedback').innerHTML = '<span class="muted-on">✓ تم</span>';
      r.timeout = setTimeout(afterAnswer, 450);
      return;
    }

    const box = $('wordBox');
    box.classList.remove('hidden-word');
    box.innerHTML = `<span>${wordHTML(q.word)}</span>`;
    if (ok) {
      Sound.play('right');
      World.react(true);
      stamp(['ممتاز!', 'رائع!', 'أحسنت!', 'Great!'][r.right % 4], false);
      $('feedback').innerHTML = q.word.m
        ? `<div class="trbox"><span dir="${wdir(q.word)}">${q.word.e || ''} ${wordHTML(q.word)}</span><b>=</b><span dir="auto">${esc(q.word.m)}</span></div>`
        : `<span class="good">✅ ${wordHTML(q.word)}</span>`;
      r.timeout = setTimeout(afterAnswer, r.mode === 'race' ? 500 : q.word.m ? 1300 : 800);
      return;
    }
    Sound.play('wrong');
    World.react(false);
    stamp('حاول!', true);
    const tip = q.word.tip && r.mode !== 'race' ? `<small class="fb-tip">💡 ${esc(q.word.tip)}</small>` : '';
    $('feedback').innerHTML = `<span class="bad">الصحيح: <b dir="${wdir(q.word)}">${wordHTML(q.word)}</b></span>${q.stage === 'write' ? diffTiles(given, q.word) : ''}${tip}`;
    if (q.stage === 'write' && r.mode !== 'race') {
      // خطوة التصحيح: يكتب الكلمة الصحيحة وهي أمامه قبل أن ينتقل
      q.copy = true;
      q.input = '';
      r.locked = false;
      updateAnswer();
      $('answer').querySelector('.rest').textContent = q.word.lang === 'ar' ? 'انسخها صحيحة' : 'copy it correctly';
      renderTools();
      Speech.say(q.word);
      return;
    }
    Speech.say(q.word);
    r.timeout = setTimeout(afterAnswer, r.mode === 'race' ? 1100 : 2400);
  }
  function stamp(text, deny) {
    const s = $('stamp');
    s.textContent = text;
    s.className = 'stamp show' + (deny ? ' deny' : '');
  }
  function afterAnswer() {
    const r = round;
    if (!r) return;
    const over = r.queue ? !r.queue.length : r.mode !== 'race' && r.asked >= r.total;
    if (over) finishRound(); else nextQuestion();
  }

  function abortRound() {
    clearInterval(round.timer);
    clearInterval(round.flashTimer);
    clearTimeout(round.timeout);
    round = null;
    Speech.stop();
    Store.save();
  }

  function finishRound() {
    const r = round;
    abortRound();
    const p = Store.current();
    const coinsBefore = p.coins;
    const st = Engine.state(p, r.src);
    const sum = { mode: r.mode, title: r.title, right: r.right, asked: r.asked, mistakes: r.mistakes, events: [], src: r.src, newRecord: false, rankUp: null };
    p.coins += r.coins;
    if (r.mode !== 'race') p.coins += COINS.roundDone;
    const full = r.asked > 0 && r.right === r.asked;
    if (full && r.mode !== 'race' && r.mode !== 'review') { p.coins += COINS.perfect; p.perfect = (p.perfect || 0) + 1; }
    if (r.mode === 'race') {
      p.races = (p.races || []).concat({ at: Date.now(), score: r.right, src: r.src }).slice(-30);
      if (r.right > st.bestRace) {
        if (st.bestRace > 0) { sum.newRecord = true; p.coins += COINS.record; }
        st.bestRace = r.right;
      }
      const rank = Engine.rankFor(Engine.stats(p).best);
      if (rank.min > r.rankBefore.min) sum.rankUp = rank;
    }
    if (r.mode === 'exam') {
      st.examBest = Math.max(st.examBest === null || st.examBest === undefined ? 0 : st.examBest, r.right);
      if (full) p.examPerfect = (p.examPerfect || 0) + 1;
    }
    if (r.src && r.src.startsWith('list:') && r.asked) p.freeRounds = (p.freeRounds || 0) + 1;
    const t = Engine.today(p);
    if (r.mode === 'warmup' || r.mode === 'review' || r.mode === 'race') {
      if (!t.done[r.mode]) { t.done[r.mode] = true; sum.station = Engine.STATIONS.find(x => x.id === r.mode); }
    }
    sum.events = Engine.progress(p);
    sum.chestReady = Engine.chestReady(p);
    sum.coins = p.coins - coinsBefore;
    Store.save();
    lastResult = sum;
    const big = sum.events.length || sum.newRecord || sum.rankUp || (full && r.mode !== 'race');
    Sound.play(big ? 'win' : 'coin');
    if (big) confetti();
    Screens.results(sum);
  }

  // ───── الأزرار ─────
  const regionOf = id => {
    const w = WORLDS.find(x => x.regions.some(r => r.id === id));
    return { w, r: w.regions.find(x => x.id === id) };
  };
  const Actions = {
    modalYes() { closeModal(true); },
    modalNo() { closeModal(false); },
    go(arg, el) { go(arg, el && el.dataset.arg2); },
    newProfile() { newAvatar = AVATARS[0]; newLook = World.CUTE; go('newProfile'); },
    editProfile() { go('newProfile', '1'); },
    pickAvatar(a, el) {
      newAvatar = a;
      app.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      Sound.play('tap');
    },
    pickLook(look, el) {
      newLook = look;
      el.parentElement.querySelectorAll('.look-opt').forEach(b => b.classList.toggle('selected', b === el));
      World.preview(look);
    },
    createProfile() {
      const name = $('pname').value.trim();
      if (!name) { toast('اكتب اسمك أولاً 😊'); $('pname').focus(); return; }
      Store.addProfile(name, newAvatar);
      Store.current().look = newLook;
      Store.save();
      Sound.play('open');
      go('start');
    },
    saveProfile() {
      const name = $('pname').value.trim();
      if (!name) { toast('اكتب اسمك أولاً 😊'); return; }
      const p = Store.current();
      p.name = name; p.avatar = newAvatar; p.look = newLook;
      Store.save();
      go('camp');
    },
    // صاحب الجهاز يدخل مباشرة، وغيره يدخل برمزه السري (ومن لا رمز له يختار رمزاً أول مرة)
    enter(id) {
      const p = Store.state.profiles.find(x => x.id === id);
      if (!p) return;
      if (id === Store.state.owner) { enterKid(id); return; }
      pinState = { stage: p.pin ? 'enter' : 'new', buf: '', kid: id };
      pinModal();
    },
    // البطل يغيّر رمزه بنفسه: الرمز الحالي أولاً ثم الجديد مرتين
    changeKidPin() {
      const p = Store.current();
      if (!p) return;
      pinState = { stage: p.pin ? 'old' : 'new', buf: '', kid: p.id, change: true };
      pinModal();
    },
    switchKid() { Store.state.current = null; Store.save(); go('profiles'); },
    beginFree() { go('free'); },
    beginWorld(id) { Store.current().world = id; Store.save(); go('map', id); },
    openWorld(id) { go('map', id); },
    switchWorld(id) { go('map', id, true); },
    toggleMute() { Store.state.muted = !Store.state.muted; Store.save(); redraw(); },

    openRegion(id) {
      const { w, r } = regionOf(id);
      const i = w.regions.indexOf(r);
      if (i >= Engine.state(Store.current(), w.id).unlocked) {
        toast(`🔒 أتقن «${w.regions[Math.max(0, i - 1)].name}» أولاً`);
        return;
      }
      go('region', id);
    },
    startPractice(id) {
      const { w, r } = regionOf(id);
      startRound({ mode: 'practice', src: w.id, pool: Engine.regionWords(w.id, r), title: `${r.icon} ${r.name}` });
    },
    startRegionExam(id) {
      const { w, r } = regionOf(id);
      startRound({ mode: 'exam', src: w.id, pool: Engine.regionWords(w.id, r), title: `📝 اختبار: ${r.name}` });
    },
    startRace() {
      const p = Store.current();
      const w = Engine.current(p);
      startRound({ mode: 'race', src: w.id, pool: Engine.racePool(p, w.id), title: `🏃 سباق الحروف — ${w.short}` });
    },
    startTricky() {
      const p = Store.current();
      const words = Engine.tricky(p);
      if (!words.length) return;
      // الكلمات قد تأتي من مصادر مختلفة، وكل كلمة تعرف مصدرها
      startRound({ mode: 'retry', src: words[0].src, pool: words, title: '🎯 كلمات صعبة' });
    },
    station(id) {
      const p = Store.current();
      const w = Engine.current(p);
      if (id === 'warmup') startRound({ mode: 'warmup', src: w.id, pool: Engine.racePool(p, w.id), total: CONFIG.warmupLength, title: '🏕️ الإحماء' });
      else if (id === 'race') Actions.startRace();
      else {
        const words = Engine.reviewWords(p);
        if (!words.length) { toast('لا توجد أخطاء لمراجعتها اليوم 🎉'); return; }
        startRound({ mode: 'review', src: words[0].src, pool: words, title: '📝 المراجعة' });
      }
    },
    openChest() {
      const p = Store.current();
      if (!Engine.chestReady(p)) {
        toast(Engine.today(p).chest ? 'فتحت كنز اليوم! عُد غداً 🌙' : 'أكمل محطات رحلة اليوم لتفتح الكنز 🧭');
        return;
      }
      const reward = Engine.openChest(p);
      Store.save();
      Sound.play('win');
      confetti();
      showModal(`<div class="celebrate"><div class="burst"><span class="big">🎁</span></div>
        <p><b>كنز اليوم!</b></p><p>🪙 +${reward.coins}</p>
        ${reward.item ? `<p>قطعة نادرة: ${reward.item.emoji} ${reward.item.name}</p>` : ''}
        <button class="btn gold wide" data-act="closeModalRedraw">رائع!</button></div>`);
    },
    closeModalRedraw() { closeModal(); go('camp'); },

    // الجولة
    exitRound() {
      ask('الخروج من الجولة؟', 'ما كتبته من كلمات محفوظ، لكن لن تحصل على جائزة الجولة.', 'خروج').then(ok => {
        if (ok && round) { abortRound(); redraw(); }
      });
    },
    replay() { if (round && round.q) Speech.say(round.q.word); },
    peek() {
      const r = round;
      if (!r || r.locked || !r.q || r.q.copy || !r.q.hidden || noPeek(r)) return;
      const q = r.q;
      q.helped = true;   // نظرة واحدة تعني أن الإجابة لا تُحسب إتقاناً
      const box = $('wordBox');
      box.classList.remove('hidden-word');
      box.innerHTML = `<span>${wordHTML(q.word)}</span>`;
      clearTimeout(r.peekT);
      r.peekT = setTimeout(() => {
        if (round && round.q === q && !q.copy && !r.locked) {
          box.classList.add('hidden-word');
          box.textContent = hiddenText(q);
        }
      }, 1300);
    },
    hint() {
      const r = round;
      if (!r || r.locked || !r.q) return;
      const q = r.q;
      q.helped = true;
      q.hints++;
      const ls = Engine.letters(q.word.t);
      const shown = ls.slice(0, Math.min(q.hints, Math.max(1, ls.length - 1))).join('');
      $('feedback').innerHTML = `<span class="hint-line">💡 تبدأ بـ <b dir="${wdir(q.word)}">${esc(shown)}</b> — عدد الحروف: ${ltr(ls.length)}</span>`;
    },
    skipCopy() { if (round && round.q && round.q.copy) { round.locked = true; afterAnswer(); } },
    tileBack() {
      const r = round;
      if (!r || r.locked || !r.q || r.q.stage !== 'tile' || !r.q.picked.length) return;
      const i = r.q.picked.pop();
      app.querySelector(`[data-tile="${i}"]`).disabled = false;
      Sound.play('del');
      updateAnswer();
    },
    again() { if (lastRound) startRound(lastRound); },
    retryWrong() {
      if (!lastResult) return;
      const seen = new Set();
      const words = lastResult.mistakes.map(m => m.word).filter(w => (seen.has(w.t) ? false : seen.add(w.t)));
      startRound({ mode: 'retry', src: words[0].src, pool: words, title: '🎯 تدريب على الأخطاء' });
    },
    printCert() { window.print(); },
    afterRound() { redraw(); },
    sayText(t, el) { Speech.say({ t, lang: el.dataset.lang }); },
    sayWord(i, el) {
      const { w, r } = regionOf(el.dataset.region);
      Speech.say(Engine.regionWords(w.id, r)[Number(i)]);
    },
    sayIdx(i, el) {
      const l = Store.list(el.dataset.list);
      const word = Engine.listWords(l)[Number(i)];
      if (!Speech.can(word)) { toast('لا يوجد صوت لهذه اللغة على الجهاز. سجّلها بصوتك 🎤'); return; }
      Speech.say(word);
    },
    recWord(t) {
      Speech.toggleRec(t).then(state => { if (state === 'started') Sound.play('tick'); }).catch(e => {
        toast(e.message === 'unsupported' ? 'التسجيل غير مدعوم في هذا المتصفح' : 'لم يُسمح باستخدام المايكروفون 🎤');
      });
    },

    // الوضع الحر
    newList() {
      const n = Store.state.lists.length + 1;
      const l = Store.addList(`قائمتي ${n}`);
      go('list', l.id);
      $('newWord').focus();
    },
    openList(id) { go('list', id); },
    importList() { $('fileInput').click(); },
    addWord(id) {
      const l = Store.list(id);
      const input = $('newWord');
      const t = input.value.trim();
      if (!t) { input.focus(); return; }
      const items = splitWords(t);
      if (items.length && items.every(x => l.words.some(w => w.t === x.t))) { toast('هذه الكلمة موجودة في القائمة'); input.select(); return; }
      addParsed(l, items);
      input.value = '';
      input.focus();
      Sound.play('coin');
      refreshList(l);
    },
    fetchMeanings(id) {
      const l = Store.list(id);
      if (!navigator.onLine) { toast('📡 لا يوجد اتصال بالإنترنت'); return; }
      toast('🌐 جارٍ البحث…');
      Online.fillList(l).then(n => {
        refreshList(l);
        toast(n ? `✅ اكتملت ${n} كلمة` : 'لا توجد كلمات ناقصة، أو لم يُعثر على جديد');
      });
    },
    editWord(i, el) {
      const id = el.dataset.list;
      const open = () => editWordModal(id, Number(i));
      if (Store.state.pin && !wordsOK) { pinState = { stage: 'enter', buf: '', after: open }; pinModal(); return; }
      open();
    },
    saveWord(i, el) {
      const l = Store.list(el.dataset.list);
      const x = l && l.words[Number(i)];
      if (!x) return closeModal();
      x.h = $('editMeaning').value.trim();
      x.e = $('editEmoji').value.trim();
      Store.save();
      closeModal();
      refreshList(l);
      toast('✅ تم الحفظ');
    },
    webWord(i, el) {
      const l = Store.list(el.dataset.list);
      const x = l && l.words[Number(i)];
      if (!x) return;
      if (!navigator.onLine) { toast('📡 لا يوجد اتصال بالإنترنت'); return; }
      el.disabled = true;
      Online.complete({ t: x.t, lang: x.lang, m: '', e: '' }).then(got => {
        if (!$('editMeaning')) return;
        if (got.h) $('editMeaning').value = got.h;
        if (got.e) $('editEmoji').value = got.e;
        if (!got.h && !got.e) toast('لم يُعثر على نتيجة');
      }).catch(() => toast('❌ تعذّر الاتصال')).finally(() => { el.disabled = false; });
    },
    delWord(i, el) {
      const l = Store.list(el.dataset.list);
      l.words.splice(Number(i), 1);
      Store.save();
      refreshList(l);
    },
    bulkOpen(id) {
      showModal(`<h2>📥 لصق قائمة كلمات</h2>
        <p class="muted">كل كلمة في سطر أو مفصولة بأي رمز مثل ، - ـ / \\. يمكنك كتابة المعنى بعد علامة = مثل <span dir="ltr">school = مدرسة</span></p>
        <textarea id="bulkText" rows="7" dir="auto" placeholder="مدرسة&#10;شجرة&#10;school"></textarea>
        <div class="row"><button class="btn pink" data-act="bulkAdd" data-arg="${id}">إضافة</button><button class="btn soft" data-act="modalNo">رجوع</button></div>`);
      $('bulkText').focus();
    },
    bulkAdd(id) {
      const l = Store.list(id);
      const items = splitWords($('bulkText').value);
      const n = addParsed(l, items);
      closeModal();
      refreshList(l);
      toast(`✅ تمت إضافة ${n} كلمة`);
    },
    exportList(id) {
      const l = Store.list(id);
      download(`${l.name}.json`, JSON.stringify({ app: 'spelling-hero', version: 1, name: l.name, words: l.words }, null, 2));
    },
    deleteList(id) {
      ask('حذف القائمة؟', 'ستُحذف الكلمات وتقدّم الأطفال فيها.', 'حذف', true).then(ok => {
        if (ok) { Store.removeList(id); go('free', null, true); }
      });
    },
    listEdit(id) { listEditing = id || null; redraw(); },
    setChunk(v, el) {
      const l = Store.list(el.dataset.list);
      if (!l) return;
      l.chunk = Number(v);
      Store.save();
      refreshList(l);
    },
    startListGroup(i, el) {
      const l = Store.list(el.dataset.list);
      const groups = Engine.chunks(l);
      const p = Store.current();
      const idx = Number(i);
      if (idx > 0 && Engine.mastery(p, groups[idx - 1]) < CONFIG.unlockAt) { toast(`🔒 أتقن المجموعة ${idx} أولاً`); return; }
      startRound({ mode: 'practice', src: 'list:' + l.id, pool: groups[idx], title: groups.length > 1 ? `✍️ ${l.name} · ${idx + 1}` : `✍️ ${l.name}` });
    },
    startListExam(id) {
      const l = Store.list(id);
      startRound({ mode: 'exam', src: 'list:' + id, pool: Engine.listWords(l), title: `📝 اختبار: ${l.name}` });
    },
    startListRace(id) {
      const l = Store.list(id);
      startRound({ mode: 'race', src: 'list:' + id, pool: Engine.listWords(l), title: `🏃 سباق: ${l.name}` });
    },

    // المتجر
    buy(id) {
      const p = Store.current();
      const it = ITEMS.find(x => x.id === id);
      if (!it || p.coins < it.price || p.items.includes(id)) return;
      p.coins -= it.price;
      p.items.push(id);
      Store.save();
      Sound.play('coin');
      redraw();
    },

    // ولي الأمر
    openParent() {
      if (!Store.state.pin) { parentOK = true; go('parent'); return; }
      pinState = { stage: 'enter', buf: '' };
      pinModal();
    },
    leaveParent() { parentOK = false; kidPinShown = ''; go(Store.current() ? 'camp' : 'profiles'); },
    parentTab(t) { parentTab = t; kidPinShown = ''; Screens.parent(); },
    parentKid(id) { parentKid = id; Screens.parent(); },
    toggleKidPin(id) { kidPinShown = kidPinShown === id ? '' : id; parentInPlace(); },
    setKidPin(id) {
      const k = Store.state.profiles.find(x => x.id === id);
      const v = ($('kidPin-' + id).value || '').trim();
      if (!k) return;
      if (!/^[0-9]{4}$/.test(v)) { toast('الرمز 4 أرقام'); return; }
      k.pin = v;
      Store.save();
      kidPinShown = id;
      toast(`🔑 الرمز الجديد لـ${k.name}: ${v}`, 3500);
      parentInPlace();
    },
    unlockAll(w) {
      const k = Store.state.profiles.find(x => x.id === parentKid);
      Engine.state(k, w).unlocked = Engine.world(w).regions.length;
      Store.save();
      Screens.parent();
      toast('🔓 فُتحت كل المناطق');
    },
    deleteKid(id) {
      const k = Store.state.profiles.find(x => x.id === id);
      ask(`حذف ${esc(k.name)}؟`, 'سيُحذف ملفه وتقدّمه نهائياً من هذا الجهاز.', 'حذف', true).then(ok => {
        if (ok) { Store.removeProfile(id); Screens.parent(); }
      });
    },
    testVoice(lang) {
      if (!Speech.tts(lang === 'ar' ? 'مرحباً يا بطل. اكتب كلمة: مدرسة' : 'Hello hero! Please write the word: school', lang)) toast('لا يوجد صوت لهذه اللغة على هذا الجهاز');
    },
    setPin() { pinState = { stage: 'new', buf: '' }; pinModal(); },
    clearPin() {
      ask('إزالة الرمز؟', 'ستُفتح لوحة ولي الأمر بلا رمز.', 'إزالة', true).then(ok => {
        if (ok) { Store.state.pin = ''; Store.save(); Screens.parent(); }
      });
    },
    pinKey(k) {
      if (!pinState) return;
      if (k === 'del') pinState.buf = pinState.buf.slice(0, -1);
      else if (pinState.buf.length < 4) pinState.buf += k;
      if (pinState.buf.length < 4) { pinDots(); return; }
      const v = pinState.buf;
      if (pinState.kid) { kidPinKey(v); return; }
      if (pinState.stage === 'enter') {
        if (v === Store.state.pin && pinState.after) { const f = pinState.after; closeModal(); pinState = null; wordsOK = true; f(); }
        else if (v === Store.state.pin) { closeModal(); pinState = null; parentOK = true; go('parent'); }
        else { pinState.buf = ''; Sound.play('wrong'); $('pinTitle').textContent = '❌ رمز غير صحيح'; pinDots(); }
      } else if (pinState.stage === 'new') {
        pinState = { stage: 'confirm', first: v, buf: '' };
        pinModal();
      } else if (v === pinState.first) {
        Store.state.pin = v;
        Store.save();
        closeModal();
        pinState = null;
        toast('✅ تم حفظ الرمز');
        Screens.parent();
      } else {
        pinState = { stage: 'new', buf: '' };
        pinModal();
        $('pinTitle').textContent = '❌ لم يتطابق الرمز. أعد المحاولة';
      }
    },
    pinCancel() { closeModal(); pinState = null; },
    forgotPin() {
      if (pinState && pinState.kid) { toast('اطلب من ولي الأمر أن يريك رمزك من لوحته 👨‍👩‍👧', 3500); return; }
      const a = 12 + Math.floor(Math.random() * 7);
      const b = 13 + Math.floor(Math.random() * 7);
      showModal(`<h2>نسيت الرمز؟</h2><p class="muted">للتأكد أنك ولي الأمر، كم حاصل ${ltr(`${a} × ${b}`)}؟</p>
        <input id="forgotAns" type="text" inputmode="numeric" dir="ltr">
        <div class="row"><button class="btn pink" data-act="forgotCheck" data-arg="${a * b}">تأكيد</button><button class="btn soft" data-act="pinCancel">رجوع</button></div>`);
    },
    forgotCheck(v) {
      if ($('forgotAns').value.trim() !== v) { toast('إجابة غير صحيحة'); return; }
      Store.state.pin = '';
      Store.save();
      closeModal();
      pinState = null;
      parentOK = true;
      toast('أُزيل الرمز. يمكنك إنشاء رمز جديد من الإعدادات');
      go('parent');
    },
    backup() { download('spelling-hero-backup.json', Store.backup()); },
    restore() { $('backupFile').click(); },
  };

  // يقسم النص إلى كلمات: السطر الجديد وأي رمز بين الكلمات (، - ـ / \ | . ؛ ...) فاصل.
  // تبقى «=» لكتابة المعنى، والفاصلة العليا داخل الكلمة الإنجليزية (don't). الشرطة فاصل دائماً.
  // بلا lookbehind لأن متصفحات آيفون القديمة لا تفهمه فيتعطل الملف كله
  const WORD_SEP = /(?:[\n\r\t\u0640]|[^\p{L}\p{M}\p{N}\s=\uE000])+/u;
  function splitWords(text) {
    return String(text).replace(/([A-Za-z])['\u2019](?=[A-Za-z])/g, '$1\uE000')
      .split(WORD_SEP).map(x => x.replace(/\uE000/g, "'")).flatMap(parseLine);
  }
  function parseLine(s) {
    const [t, h] = String(s).split('=');
    const word = (t || '').trim();
    return word ? [{ t: word, h: (h || '').trim() }] : [];
  }
  // رموز الأبطال في إعدادات ولي الأمر: يراها ويغيّرها (والبطل يغيّر رمزه بنفسه من «تعديل بطلك»)
  function kidPinsCard() {
    const kids = Store.state.profiles;
    if (!kids.length) return '';
    return `<div class="card">
      <h2>🔑 رموز دخول الأبطال</h2>
      <p class="muted">يدخل كل بطل ملفه برمزه، وصاحب الجهاز يدخل ملفه مباشرة.</p>
      ${kids.map(k => `<div class="kid-pin-row">
        <div class="kid-pin-head"><b>${k.avatar} ${esc(k.name)}</b>
          <span>${k.pin ? ltr(kidPinShown === k.id ? k.pin : '••••') : '<small class="muted">لم يُختر بعد</small>'}
          ${k.pin ? `<button class="link-btn dark" data-act="toggleKidPin" data-arg="${k.id}">${kidPinShown === k.id ? '🙈 إخفاء' : '👁️ إظهار'}</button>` : ''}</span></div>
        <div class="row"><input id="kidPin-${k.id}" type="tel" inputmode="numeric" maxlength="4" autocomplete="off" dir="ltr" placeholder="رمز جديد من 4 أرقام">
          <button class="btn soft" data-act="setKidPin" data-arg="${k.id}">حفظ</button></div>
      </div>`).join('')}
      ${Store.state.pin ? '' : '<p class="note">⚠️ لوحة ولي الأمر بلا رمز، فيستطيع الأطفال فتحها ورؤية رموز إخوتهم. أنشئ رمزاً لها من بطاقة «رمز ولي الأمر» أعلاه.</p>'}
    </div>`;
  }
  // إعادة رسم لوحة ولي الأمر دون القفز إلى أعلى الصفحة
  function parentInPlace() {
    const y = window.scrollY;
    Screens.parent();
    window.scrollTo(0, y);
  }
  function enterKid(id) { Store.state.current = id; Store.save(); Sound.play('open'); go('camp'); }
  // رمز البطل: الدخول به، أو اختياره أول مرة ثم تأكيده
  function kidPinKey(v) {
    const p = Store.state.profiles.find(x => x.id === pinState.kid);
    if (!p) { closeModal(); pinState = null; return; }
    const change = !!pinState.change;
    if (pinState.stage === 'old') {
      if (v === p.pin) { pinState = { stage: 'new', buf: '', kid: p.id, change }; pinModal(); return; }
      pinState.buf = '';
      Sound.play('wrong');
      $('pinTitle').textContent = '❌ رمز غير صحيح';
      pinDots();
    } else if (pinState.stage === 'enter') {
      if (v === p.pin) { closeModal(); pinState = null; enterKid(p.id); return; }
      pinState.buf = '';
      Sound.play('wrong');
      $('pinTitle').textContent = '❌ رمز غير صحيح';
      pinDots();
    } else if (pinState.stage === 'new') {
      pinState = { stage: 'confirm', first: v, buf: '', kid: p.id, change };
      pinModal();
    } else if (v === pinState.first) {
      p.pin = v;
      closeModal();
      pinState = null;
      toast('🔑 حُفظ رمزك، تذكّره جيداً', 3000);
      if (change) { Store.save(); redraw(); } else enterKid(p.id);
    } else {
      pinState = { stage: 'new', buf: '', kid: p.id, change };
      pinModal();
      $('pinTitle').textContent = '❌ لم يتطابق الرمز. أعد المحاولة';
    }
  }
  let wordsOK = false;   // أدخل ولي الأمر رمزه لتعديل كلمات القوائم في هذه الزيارة
  function editWordModal(id, i) {
    const l = Store.list(id);
    const w = l && Engine.listWords(l)[i];
    if (!w) return;
    showModal(`<h2>✏️ <span dir="${wdir(w)}">${esc(w.t)}</span></h2>
      <p class="muted">هذا ما يراه الطفل بدل الكلمة أثناء اللعب، مع نطقها.</p>
      <label class="lbl" for="editEmoji">الإيموجي</label>
      <input id="editEmoji" type="text" maxlength="16" value="${esc(w.e)}" placeholder="مثال: 🚆" style="font-size:1.6em;text-align:center">
      <label class="lbl" for="editMeaning">المعنى</label>
      <input id="editMeaning" type="text" maxlength="60" dir="auto" value="${esc(w.m)}" placeholder="${w.lang === 'en' ? 'مثال: قطار' : 'example: train'}">
      <button class="btn soft wide small" data-act="webWord" data-arg="${i}" data-list="${id}">🌐 جلب من الإنترنت</button>
      <div class="row"><button class="btn pink" data-act="saveWord" data-arg="${i}" data-list="${id}">حفظ</button><button class="btn soft" data-act="modalNo">رجوع</button></div>`);
  }
  function pinModal() {
    const k = pinState.kid && Store.state.profiles.find(x => x.id === pinState.kid);
    const titles = k
      ? { old: `${k.avatar} أدخل رمزك الحالي`, enter: `${k.avatar} أدخل رمز ${esc(k.name)} السري`, new: `${k.avatar} اختر رمزاً سرياً من 4 أرقام يحمي ملف ${esc(k.name)} 🔒`, confirm: 'أعد إدخال الرمز للتأكيد' }
      : { enter: 'أدخل رمز ولي الأمر', new: 'اختر رمزاً من 4 أرقام', confirm: 'أعد إدخال الرمز' };
    showModal(`<h2 id="pinTitle">${titles[pinState.stage]}</h2>
      <div class="pin-dots" id="pinDots"></div>
      <div class="numpad" dir="ltr">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-act="pinKey" data-arg="${n}">${n}</button>`).join('')}
        <button class="key util" data-act="pinKey" data-arg="del">⌫</button>
        <button class="key" data-act="pinKey" data-arg="0">0</button>
        <button class="key util" data-act="pinCancel">✕</button>
      </div>
      ${pinState.stage === 'enter' || pinState.stage === 'old' ? '<button class="link-btn dark" data-act="forgotPin">نسيت الرمز</button>' : ''}`);
    pinDots();
  }
  function pinDots() {
    $('pinDots').innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < pinState.buf.length ? 'on' : ''}"></i>`).join('');
  }

  // ───── الأحداث ─────
  document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
  document.addEventListener('click', e => {
    const key = e.target.closest('[data-key]');
    if (key) return typeKey(key.dataset.key);
    const tile = e.target.closest('[data-tile]');
    if (tile) return pickTile(Number(tile.dataset.tile));
    const ch = e.target.closest('[data-choice]');
    if (ch) return chooseFill(ch.dataset.choice, ch);
    const b = e.target.closest('[data-act]');
    if (b && !b.disabled && Actions[b.dataset.act]) Actions[b.dataset.act](b.dataset.arg, b);
  });

  function pickTile(i) {
    const r = round;
    if (!r || r.locked || !r.q || r.q.stage !== 'tile') return;
    const q = r.q;
    if (q.picked.includes(i)) return;
    if (q.flash > 0 && !q.hidden) hideWord(q);
    q.picked.push(i);
    app.querySelector(`[data-tile="${i}"]`).disabled = true;
    Sound.play('tap');
    updateAnswer();
    if (q.picked.length < q.ls.length) return;
    const typed = q.picked.map(x => q.tiles[x]).join('');
    const target = q.ls.join('');
    const ok = S().strictCase ? typed === target : typed.toLowerCase() === target.toLowerCase();
    finishQuestion(ok, q.helped);
  }
  function chooseFill(c, el) {
    const r = round;
    if (!r || r.locked || !r.q || r.q.stage !== 'fill') return;
    const q = r.q;
    q.answerChoice = c;
    const ok = c === q.right;
    app.querySelectorAll('.choice').forEach(b => {
      if (b.dataset.choice === q.right) b.classList.add('right');
      else if (b === el) b.classList.add('wrong');
    });
    finishQuestion(ok, q.helped);
  }

  // لوحة مفاتيح اللابتوب
  document.addEventListener('keydown', e => {
    if (!round || !round.q || round.locked || !$('modal').hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const q = round.q;
    const k = e.key;
    if (q.stage === 'write') {
      if (k === 'Enter') { e.preventDefault(); typeKey('ok'); return; }
      if (k === 'Backspace') { e.preventDefault(); typeKey('del'); return; }
      if (k.length === 1 || k === ' ') {
        e.preventDefault();
        const isAr = Engine.detectLang(k) === 'ar';
        if (/\S/.test(k) && /[\p{L}]/u.test(k) && isAr !== (q.word.lang === 'ar')) { toast(q.word.lang === 'ar' ? 'غيّر لغة لوحة المفاتيح إلى العربية' : 'غيّر لغة لوحة المفاتيح إلى الإنجليزية'); return; }
        typeKey(k);
      }
    } else if (q.stage === 'tile') {
      if (k === 'Backspace') { e.preventDefault(); Actions.tileBack(); return; }
      if (k.length !== 1) return;
      const i = q.tiles.findIndex((c, x) => !q.picked.includes(x) && c.toLowerCase() === k.toLowerCase());
      if (i >= 0) pickTile(i);
    } else if (q.stage === 'fill') {
      const c = /^[1-4]$/.test(k) ? q.choices[Number(k) - 1] : q.choices.find(x => x.toLowerCase() === k.toLowerCase());
      if (c) {
        const el = Array.from(app.querySelectorAll('.choice')).find(b => b.dataset.choice === c);
        chooseFill(c, el);
      }
    }
  });

  // ───── التشغيل ─────
  Group.install({
    Screens, Actions, nav, render, go, redraw, toast, ask, confetti, esc, ltr, keyboard, wordHTML, fillHTML, wdir, kidColor, eventBanner,
    inRound: () => !!round,
  });
  Speech.loadKeys(() => { if (nav.cur === 'list' || nav.cur === 'region') redraw(); });
  go(Store.current() ? 'camp' : 'profiles', null, true);
  Group.fromHash();
})();
