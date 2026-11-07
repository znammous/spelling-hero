// الألعاب الجماعية: سباق الحروف، شدّ الحبل، مبارزة العقول، وتحدّي العقل الفردي
// على جهاز واحد الأسئلة بالضغط فقط (الشاشة لا تتسع للوحتي مفاتيح، ولا يُشغَّل صوتان معاً)،
// وعلى عدة أجهزة يسمع كل طفل ويكتب على جهازه
const Group = (() => {
  let C = null;              // ما تعطيه app.js: render, go, toast, ask, Screens, Actions ...
  let duel = null;           // سباق أو شدّ حبل جارٍ
  let brain = null;          // تحدّي عقل أو مبارزة جارية
  let netPending = null;     // دعوة على عدة أجهزة قبل أن تبدأ: { id, role, pid, words }
  let lastWin = null;
  let duelPicks = [];
  let duelLand = 'ar';
  let duelMode = 'net';      // 'net' عدة أجهزة (الافتراضي) | 'local' جهاز واحد
  let duelKind = 'race';
  let duelLayoutId = null;
  let brainPicks = null;     // ألعاب المبارزة والتحدّي
  let pairing = null;        // رمز انضمام جهاز يعرضه ولي الأمر: { code, exp, kid, ready }
  let pendingKid = null;     // صاحب الجهاز الذي انضم، ننتظر وصول ملفه بالمزامنة
  let scanStream = null;

  const $ = id => document.getElementById(id);
  const ALL = 'all';
  const MAX_PLAYERS = 4;
  const MAX_LOCAL = 2;
  const ROPE_LEAD = 10;
  const ROPE_SECONDS = 120;
  const INVITE_MS = 2 * 60 * 1000;
  const ONLINE_MS = 75 * 1000;
  const KINDS = {
    race: { icon: '🏃', name: 'سباق الحروف', what: 'السباق', invite: 'لسباق الحروف', max: MAX_PLAYERS },
    brain: { icon: '🧠', name: 'مبارزة العقول', what: 'المبارزة', invite: 'لمبارزة العقول', max: MAX_PLAYERS },
    rope: { icon: '🪢', name: 'شدّ الحبل', what: 'الشدّ', invite: 'لشدّ الحبل', max: 2 },
  };
  const LAYOUTS = [
    { id: 'face', name: 'متقابلان', hint: 'التابلت على الطاولة بينكما' },
    { id: 'side', name: 'جنباً إلى جنب', hint: 'متجاوران أمام الشاشة' },
    { id: 'stack', name: 'فوق وتحت', hint: 'كلاهما بنفس الاتجاه' },
  ];
  const kindOf = d => KINDS[(d && d.kind) || 'race'] || KINDS.race;
  const layout = () => duelLayoutId || (matchMedia('(orientation: landscape)').matches ? 'side' : 'face');
  const DEVICE = (() => {
    try {
      let id = localStorage.getItem('spelling-hero-device');
      if (!id) localStorage.setItem('spelling-hero-device', id = Math.random().toString(36).slice(2, 10));
      return id;
    } catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();
  const myPath = `players.${DEVICE}`;
  const kid = id => Store.state.profiles.find(p => p.id === id);

  // ───── الخطط والقوائم ─────
  const isList = id => String(id).startsWith('list:');
  const landName = id => {
    if (id === ALL) return '🌍 كل الخطط';
    if (isList(id)) { const l = Store.list(id.slice(5)); return `✍️ ${l ? l.name : 'قائمة كلمات'}`; }
    const w = Engine.world(id);
    return w ? `${w.icon} ${w.short}` : '';
  };
  const kidLands = land => (land === ALL ? WORLDS.map(w => w.id) : [land]);
  // inline: كلمات القائمة كما كتبها صاحب الدعوة، حتى لو لم تصل القائمة إلى هذا الجهاز بعد
  function wordsOf(p, src, inline) {
    if (!isList(src)) return Engine.racePool(p, src);
    const l = Store.list(src.slice(5));
    return Engine.listWords(l || { id: src.slice(5), words: inline || [] });
  }
  const poolsFor = (p, land, inline) => Object.fromEntries(kidLands(land).map(src => [src, wordsOf(p, src, inline)]));
  const landUsable = id => (isList(id) ? !!Store.list(id.slice(5)) && Store.list(id.slice(5)).words.length > 0 : true);
  function duelGoal(p, land = duelLand) {
    const ws = kidLands(land);
    return Math.max(8, Math.round(ws.reduce((n, w) => n + Engine.state(p, w).bestRace, 0) / ws.length) + 2);
  }
  const duelSide = (p, inline) => {
    const ws = kidLands(duelLand);
    return { p, ws, land: duelLand, pools: poolsFor(p, duelLand, inline), goal: duelGoal(p),
      q: null, right: 0, wrong: 0, locked: true, reachedAt: 0, last: null };
  };
  const allBrain = () => Brain.GAMES.map(G => G.id);
  const brainChoice = () => (brainPicks && brainPicks.length ? brainPicks : (brainPicks = allBrain()));

  // ───── الشاشات ─────
  function kindsInfo() {
    if (duelKind === 'rope') return `حبل واحد بينكما، وكل إجابة صحيحة تشدّه نحوك خطوة. <b>من يشدّ الحبل ${C.ltr(ROPE_LEAD)} خطوات إلى جهته يفوز، أو من يكون الحبل في جهته بعد ${C.ltr(ROPE_SECONDS)} ثانية!</b>`;
    if (duelKind === 'brain') return `الألعاب التي تختارونها، ${C.ltr(Brain.DUEL_SECONDS)} ثانية لكل منها، والصعوبة تتكيّف مع كل لاعب. <b>الفائز من يكسب ألعاباً أكثر!</b>`;
    return `كل واحد يُسأل بمستواه، وجزيرته على بُعد أفضل نتيجة له وكلمتين. <b>الأول من يصل إلى جزيرته أولاً!</b>`;
  }
  const brainPickGrid = (ids, act, how) => `<div class="bpick">
      <button class="bpick-all ${ids.length === Brain.GAMES.length ? 'on' : ''}" data-act="${act}" data-arg="all">${ids.length === Brain.GAMES.length ? '☑️ إلغاء الكل' : '✅ اختر الكل'}</button>
      ${Brain.GAMES.map(G => `<button class="bpick-g ${ids.includes(G.id) ? 'on' : ''}" data-act="${act}" data-arg="${G.id}">
        <span>${G.icon}</span><b>${G.name}</b>${how ? `<small>${G.how}</small>` : ''}</button>`).join('')}
    </div>`;

  const Screens = {
    groupSetup() {
      const list = Store.state.profiles;
      const net = duelMode === 'net';
      const n = duelPicks.length;
      const canNet = Sync.duel.ready();
      if (!landUsable(duelLand)) duelLand = 'ar';
      const brainKind = duelKind === 'brain';
      const canStart = n >= 2 && (!brainKind || brainChoice().length);
      const lands = [...WORLDS.map(w => w.id), ALL, ...Store.state.lists.filter(l => l.words.length).map(l => 'list:' + l.id)];
      C.render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="camp">→ رجوع</button>
          <h2 class="topbar-title">🤝 العب مع إخوتك</h2><span></span>
        </header>
        <div class="world-switch">
          <button class="${net ? 'on' : ''}" data-act="setDuelMode" data-arg="net">🌐 عدة أجهزة</button>
          <button class="${net ? '' : 'on'}" data-act="setDuelMode" data-arg="local">📱 جهاز واحد</button>
        </div>
        <div class="world-switch">${Object.entries(KINDS).map(([k, x]) => `<button class="${k === duelKind ? 'on' : ''}" data-act="setDuelKind" data-arg="${k}">${x.icon} ${x.name}</button>`).join('')}</div>
        <div class="card">
          <h2>📚 الكلمات <small>${C.esc(landName(duelLand))}</small></h2>
          <div class="chips">${lands.map(id => `<button class="land-chip ${id === duelLand ? 'on' : ''}" data-act="setDuelLand" data-arg="${C.esc(id)}">${C.esc(landName(id))}</button>`).join('')}</div>
        </div>
        ${brainKind ? `<div class="card"><h2>🎮 الألعاب</h2>${brainPickGrid(brainChoice(), 'brainToggle')}</div>` : ''}
        ${net ? `${onlineStrip()}<button class="btn gold wide" data-act="netHost" ${n === 1 && canNet && (!brainKind || brainChoice().length) ? '' : 'disabled'}>📨 أرسل الدعوة</button>` : ''}
        <button class="btn green wide" data-act="go" data-arg="winners">🏆 سجل الفائزين</button>
        <p class="hint">${net ? 'اختر نفسك' : `اختر لاعبَين (${C.ltr(`${n}/${MAX_LOCAL}`)})`}</p>
        <div class="avatars">${list.map(p => `<button class="avatar-card ${duelPicks.includes(p.id) ? 'picked' : ''}" style="--c:${C.kidColor(p)}" data-act="duelPick" data-arg="${p.id}">
          <span class="face">${p.avatar}</span><b>${C.esc(p.name)}</b>${duelKind === 'race' ? `<small>🏝️ هدفه ${C.ltr(duelGoal(p))}</small>` : ''}</button>`).join('')}</div>
        ${net ? '' : `<div class="card"><h2>📱 شكل الشاشة</h2>
          <div class="world-switch light">${LAYOUTS.map(l => `<button class="${l.id === layout() ? 'on' : ''}" data-act="setLayout" data-arg="${l.id}">${l.name}</button>`).join('')}</div>
          <p class="muted small-note">${LAYOUTS.find(l => l.id === layout()).hint}</p></div>
          <button class="btn pink wide" data-act="startLocal" ${canStart ? '' : 'disabled'}>${KINDS[duelKind].icon} ابدأ ${KINDS[duelKind].what}</button>`}
        <div class="card"><p>${kindsInfo()}</p>
          <p class="muted">${net
            ? (canNet ? `يقبل إخوتك الدعوة على أجهزتهم (${KINDS[duelKind].max === 2 ? 'لاعبان فقط' : `حتى ${C.ltr(KINDS[duelKind].max)} لاعبين`}). كل طفل يسمع الكلمة ويكتبها على جهازه.`
              : '⚠️ اربط الأجهزة بحساب العائلة أولاً، مع اتصال بالإنترنت: لوحة ولي الأمر ← البيانات.')
            : 'ضعا الجهاز بينكما. الأسئلة هنا بالضغط فقط، ولا صوت فيها حتى لا يختلط صوتان.'}</p>
          ${net && !canNet ? '<button class="btn soft wide" data-act="openParent">☁️ لوحة ولي الأمر</button>' : ''}
        </div>
      </section>`);
    },

    netWait(role) {
      const d = Sync.duel.data();
      const players = d && netPending && d.id === netPending.id ? activePlayers(d) : [];
      const host = role === 'host';
      const K = kindOf(d || { kind: duelKind });
      const synced = Sync.duel.synced();
      const conn = host ? (synced ? '' : '📡 جارٍ الاتصال… يظهر المنضمون فور عودته')
        : (synced && players.some(x => x.device === DEVICE) && d.players[d.host] ? `✅ وصل انضمامك إلى ${C.esc(d.players[d.host].name)}` : '📡 جارٍ إرسال انضمامك…');
      C.render(`<section class="screen group-center net-wait">
        <div class="big-emoji wait-spin">⏳</div>
        <h1 class="group-title">${host ? 'بانتظار المتسابقين…' : `بانتظار بدء ${K.what}…`}</h1>
        <p class="hint">${host ? `افتح اللعبة على الأجهزة الأخرى واضغط «انضم» (${K.max === 2 ? 'لاعبان فقط' : `حتى ${C.ltr(K.max)} لاعبين`}).` : `تبدأ ${K.what} عندما يضغط صاحب الدعوة «ابدأ».`}</p>
        <div class="net-players">${players.map(x => `<span>${x.avatar}<b>${C.esc(x.name)}</b></span>`).join('')}</div>
        ${conn ? `<p class="hint small-note">${conn}</p>` : ''}
        ${onlineStrip()}
        ${host ? '<button class="btn soft wide" data-act="netShare">🔗 شارك رابط الدعوة</button>' : ''}
        ${host ? `<button class="btn green wide" data-act="netStart" ${players.length >= 2 ? '' : 'disabled'}>🏁 ابدأ ${K.what} (${C.ltr(players.length)})</button>` : ''}
        <button class="btn red wide" data-act="netCancel">✕ إلغاء</button>
      </section>`);
    },

    netJoin(d) {
      const taken = activePlayers(d);
      const avail = Store.state.profiles.filter(p => !taken.some(x => x.pid === p.id));
      const me = avail.find(p => p.id === Store.state.current);
      const others = avail.filter(p => p !== me);
      const host = d.players[d.host];
      const K = kindOf(d);
      C.render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="camp">→ رجوع</button>
          <h2 class="topbar-title">${K.icon} دعوة ${K.invite}</h2><span></span>
        </header>
        <div class="card group-center">
          <p>${host.avatar} <b>${C.esc(host.name)}</b> يدعوك ${K.invite} ${K.icon} في ${C.esc(d.landName || landName(d.world))}!${me ? '' : ' من أنت؟'}</p>
          <div class="net-players">${taken.map(x => `<span>${x.avatar}<b>${C.esc(x.name)}</b></span>`).join('')}</div>
        </div>
        ${me ? `<button class="btn green wide" data-act="netJoin" data-arg="${me.id}">✅ اقبل باسم ${me.avatar} ${C.esc(me.name)}</button>
        ${others.length ? `<p class="hint">لست ${C.esc(me.name)}؟ اختر اسمك:</p>` : ''}` : ''}
        <div class="avatars">${others.map(p => `<button class="avatar-card" style="--c:${C.kidColor(p)}" data-act="netJoin" data-arg="${p.id}"><span class="face">${p.avatar}</span><b>${C.esc(p.name)}</b></button>`).join('')}</div>
      </section>`);
    },

    duel() {
      const rope = duel.kind === 'rope';
      const them = i => (duel.net ? duel.net.opps : duel.sides.filter((_, j) => j !== i).map(x => x.p)).map(x => x.avatar).join('');
      const track = (s, i) => (rope
        ? `<div class="track rope"><span class="rend me">${s.p.avatar}</span><span class="rend them">${them(i)}</span><span id="dKnot${i}" class="knot" style="--k:0"></span></div>`
        : `<div class="track river"><span class="goal">🏝️</span><span id="dWalker${i}" class="walker" style="--p:0">${s.p.avatar}</span></div>`);
      const half = (s, i) => `<div class="duel-half" data-side="${i}">
        <div class="duel-head"><b>${s.p.avatar} ${C.esc(s.p.name)}</b><span class="chip">✅ <b id="dScore${i}">0</b></span></div>
        ${track(s, i)}
        <div class="prompt dprompt" id="dQ${i}"></div>
        <div class="feedback dfb" id="dFb${i}"></div>
        <div class="pad" id="dPad${i}"></div>
      </div>`;
      const mid = `<div class="duel-mid"><button class="chip" data-act="exitDuel" aria-label="خروج">✕</button>
        <div class="timebar gt"><i id="timebar"></i><span id="timeText">${duelSeconds()}</span></div></div>`;
      if (duel.net) {
        C.render(`<section class="duel net">${mid}
          ${duel.net.opps.map((o, j) => `<div class="opp"><b>${o.avatar} ${C.esc(o.name)}</b>
            ${rope ? '' : `<div class="track river"><span class="goal">🏝️</span><span id="oWalker${j}" class="walker" style="--p:0">${o.avatar}</span></div>`}
            <span class="chip">✅ <b id="oScore${j}">0</b></span></div>`).join('')}
          ${half(duel.sides[0], 0)}</section>`);
      } else {
        C.render(`<section class="duel ${layout()}">${half(duel.sides[0], 0)}${mid}${half(duel.sides[1], 1)}</section>`);
      }
      document.body.classList.add('bgrest');
    },

    duelResults(res) {
      const medals = ['🥇', '🥈', '🥉'];
      const firsts = res.sides.filter(x => x.place === 1);
      const title = res.winner ? `فاز ${res.winner.p.avatar} ${C.esc(res.winner.p.name)}!` : firsts.length > 1 ? 'تعادل! 🤝' : 'انتهى التحدي';
      const card = x => `<div class="card duel-card ${x === res.winner ? 'won' : ''}">
        <div class="place">${x.place ? medals[x.place - 1] || C.ltr(x.place) : ''}</div>
        <div class="big-emoji">${x.p.avatar}</div><b class="dname">${C.esc(x.p.name)}</b>
        <div class="stats">
          ${x.wins == null || x.gone ? '' : `<div><b>${C.ltr(`${x.wins}/${x.won.length}`)}</b><span>👑 ألعاب</span></div>`}
          <div><b>${x.right}</b><span>صحيحة</span></div>
          ${x.wrong == null ? '' : `<div><b>${x.wrong}</b><span>خاطئة</span></div>`}
          ${x.coins == null ? '' : `<div><b>${C.ltr('+' + x.coins)}</b><span>🪙</span></div>`}
        </div>
        <small class="muted">${C.esc(x.out || (x.reachedAt ? '🏝️ وصل إلى جزيرته' : x.goal ? `🏝️ ${x.right}/${x.goal}` : ''))}</small>
        ${(x.banners || []).map(t => `<div class="banner">${t}</div>`).join('')}
      </div>`;
      lastWin = res.winner ? logWin(res) : null;
      C.nav.cur = 'groupSetup';
      C.render(`<section class="screen group-results">
        <div class="big-emoji">${res.winner ? '🏆' : '🤝'}</div>
        <h1 class="group-title">${title}</h1>
        <p class="hint">${C.esc(res.note || (res.winner && res.winner.reachedAt ? 'وصل إلى جزيرته أولاً' : res.winner ? 'الأقرب إلى جزيرته' : 'نفس النتيجة'))}</p>
        <div class="duel-cards">${res.sides.map(card).join('')}</div>
        ${res.chart ? brainChart(res.chart) : ''}
        <button class="btn pink wide" data-act="${res.again}">${res.againLabel || '⚔️ جولة أخرى'}</button>
        ${res.winner ? `<div class="row"><button class="btn soft" data-act="winnerShot">📸 صورة الفائز</button><button class="btn soft" data-act="certShow">🖨️ الشهادة</button></div>` : ''}
        <button class="btn gold wide" data-act="go" data-arg="winners">🏆 سجل الفائزين</button>
        <button class="btn soft wide" data-act="go" data-arg="camp">🏠 الرئيسية</button>
      </section>`);
    },

    winners() {
      const wins = Store.state.wins.slice().reverse();
      const tally = {};
      wins.forEach(x => { const t = tally[x.name] || (tally[x.name] = { name: x.name, avatar: x.avatar, n: 0 }); t.n++; });
      const top = Object.values(tally).sort((a, b) => b.n - a.n);
      C.render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="go" data-arg="groupSetup">→ رجوع</button>
          <h2 class="topbar-title">🏆 سجل الفائزين</h2><span></span></header>
        ${wins.length ? `<div class="card win-tally">${top.map((t, i) => `<div class="win-champ ${i === 0 ? 'first' : ''}"><span>${t.avatar}</span><b>${C.esc(t.name)}</b><small>👑 ${C.ltr(t.n)} ${t.n === 1 ? 'فوز' : 'انتصارات'}</small></div>`).join('')}</div>
        ${wins.map(x => `<div class="card win-row"><span class="win-av">${x.avatar}</span>
          <div class="win-info"><b>${C.esc(x.name)} <small>بطل ${C.esc(x.kind)}</small></b><small>${C.esc(x.land)} · ${winDate(x.at)}</small>
          ${x.vs && x.vs.length ? `<small>ضد ${x.vs.map(C.esc).join(' و')}</small>` : ''}</div>
          <button class="wbtn" data-act="certShow" data-arg="${x.id}" aria-label="الشهادة">🖨️</button>
          <button class="wbtn" data-act="winnerShot" data-arg="${x.id}" aria-label="الصورة">📸</button></div>`).join('')}`
        : '<div class="card empty"><span>🌱</span><p>لا يوجد فائزون بعد. كل من يفوز في تحدٍّ جماعي يُسجَّل هنا مع شهادته.</p></div>'}
      </section>`);
    },

    brainSetup() {
      const ids = brainChoice();
      const mins = Math.max(1, Math.round(ids.length * (Brain.SECONDS + 3) / 60));
      C.render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="go" data-arg="camp">→ رجوع</button>
          <h2 class="topbar-title">🧠 تحدّي العقل</h2><span></span></header>
        <p class="hint">ألعاب إملاء قصيرة من الكلمات التي وصلت إليها، وتصعب كلما أجبت صحيحاً.</p>
        <div class="card"><h2>🎮 اختر ألعابك</h2>${brainPickGrid(ids, 'brainToggle', true)}</div>
        <button class="btn gold wide" data-act="brainStart" ${ids.length ? '' : 'disabled'}>ابدأ ▶ ${ids.length ? `(${C.ltr(ids.length)} · نحو ${C.ltr(mins)} د)` : ''}</button>
        ${Store.state.profiles.length > 1 ? '<button class="btn green wide" data-act="brainInvite">⚔️ ادعُ إخوتك لمبارزة العقول</button>' : ''}
      </section>`);
    },

    brain() {
      const b = brain;
      const G = Brain.game(b.ids[b.g]);
      const games = b.sides[0].games;
      const steps = `<div class="brain-steps">${b.ids.map(Brain.game).map((x, i) => `<span class="${i < b.g ? 'done' : i === b.g ? 'on' : ''}">${i < b.g ? games[i].medal : x.icon}</span>`).join('')}</div>`;
      if (b.phase === 'intro') {
        C.render(`<section class="screen brain">
          <header class="topbar"><button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
            <h2 class="topbar-title">🧠 تحدّي العقل</h2><div class="chip">${C.ltr(`${b.g + 1}/${b.ids.length}`)}</div></header>
          ${steps}
          <div class="card group-center"><div class="big-emoji">${G.icon}</div><h2>${G.name}</h2><p>${G.how}</p>
            <p class="muted">${C.ltr(Brain.SECONDS)} ثانية، وتصعب كلما أجبت صحيحاً</p>
            <button class="btn gold wide" data-act="brainGo">ابدأ ▶</button></div>
        </section>`);
      } else {
        C.render(`<section class="screen brain bplay">
          <header class="topbar"><button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
            <h2 class="topbar-title">${G.icon} ${G.name}</h2><div class="chip">🧠 <b id="bScore0">0</b></div></header>
          ${steps}
          <div class="timebar gt"><i id="timebar"></i><span id="timeText">${Brain.SECONDS}</span></div>
          <div class="brain-lv" id="bLv0"></div>
          <div class="brain-stage" id="bStage0"></div>
          <div id="bFb0" class="feedback"></div>
        </section>`);
      }
      document.body.classList.add('bgrest');
    },

    brainDuel() {
      const G = Brain.game(brain.ids[brain.g]);
      const half = (s, i) => `<div class="duel-half bhalf" data-side="${i}">
        <div class="duel-head"><b>${s.p.avatar} ${C.esc(s.p.name)}</b><span class="chip">✅ <b id="bScore${i}">0</b></span></div>
        <div class="brain-lv" id="bLv${i}"></div>
        <div class="brain-stage" id="bStage${i}"></div>
        <div class="feedback dfb" id="bFb${i}"></div>
      </div>`;
      const mid = `<div class="duel-mid"><button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
        <span class="bmid">${G.icon}</span><div class="timebar gt"><i id="timebar"></i><span id="timeText">${Brain.DUEL_SECONDS}</span></div></div>`;
      if (brain.net) C.render(`<section class="duel brain net">${mid}<div id="bOpps" class="opps-mini">${brainOpps()}</div>${half(brain.sides[0], 0)}</section>`);
      else C.render(`<section class="duel brain ${layout()}">${half(brain.sides[0], 0)}${mid}${half(brain.sides[1], 1)}</section>`);
      document.body.classList.add('bgrest');
    },

    brainResults(s) {
      C.nav.cur = 'brainSetup';
      C.render(`<section class="screen group-results">
        <div class="big-emoji">🧠</div>
        <h1 class="group-title">نتيجتك: ${C.ltr(s.points)} نقطة</h1>
        ${s.best ? `<p class="hint">أفضل نتيجة: ${C.ltr(s.best)}</p>` : ''}
        ${s.newRecord ? '<div class="banner">🏅 رقم قياسي جديد!</div>' : ''}
        <div class="card">${s.games.map(g => { const G = Brain.game(g.id); return `<div class="brow"><span>${G.icon} ${G.name}</span><b>${g.medal} ${C.ltr(g.points)}</b><small>✅ ${g.right} · المستوى ${C.ltr(g.top)}</small></div>`; }).join('')}</div>
        <div class="chip coins inline">🪙 +${s.coins}</div>
        <button class="btn pink wide" data-act="brainStart">🔁 العب مرة أخرى</button>
        <button class="btn soft wide" data-act="go" data-arg="camp">🏠 الرئيسية</button>
      </section>`);
    },

    join(code) {
      C.render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="go" data-arg="profiles">→ رجوع</button>
          <h2 class="topbar-title">📱 انضم إلى العائلة</h2><span></span></header>
        <div class="card group-center">
          <p>افتح <b>لوحة ولي الأمر ← البيانات</b> على جهاز ولي الأمر، ثم «أضف جهازاً»، وامسح الرمز أو اكتبه هنا.</p>
          <div class="scan-box" id="scanBox" hidden><video id="scanVideo" playsinline muted></video></div>
          <button class="btn green wide" data-act="scanJoin" id="scanBtn">📷 امسح رمز QR</button>
          <div class="addrow top8"><input id="joinInput" type="text" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr" value="${C.esc(code || '')}">
          <button class="btn gold" data-act="joinFamily">انضم</button></div>
        </div>
      </section>`);
    },
  };

  // ───── سجل الفائزين والشهادة ─────
  const winDate = at => new Date(at).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  function logWin(res) {
    if (res.logged) return res.logged;
    const w = res.winner;
    // على عدة أجهزة كل جهاز يسجّل الفوز نفسه: المعرّف من رقم التحدي حتى لا تضاعفه المزامنة
    const known = res.netId && Store.state.wins.find(x => x.id === res.netId);
    if (known) { res.logged = known; return known; }
    const entry = {
      id: res.netId || Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(),
      name: w.p.name, avatar: w.p.avatar, right: w.right, wrong: w.wrong == null ? null : w.wrong,
      kind: res.chart ? KINDS.brain.name : res.rope ? KINDS.rope.name : KINDS.race.name,
      land: landName(duelLand), note: res.note || (w.reachedAt ? 'وصل إلى جزيرته أولاً' : 'الأقرب إلى جزيرته'),
      vs: res.sides.filter(x => x !== w).map(x => x.p.name),
    };
    Store.state.wins.push(entry);
    Store.state.wins = Store.state.wins.slice(-MAX_WINS);
    Store.save();
    res.logged = entry;
    return entry;
  }
  const winById = id => (id ? Store.state.wins.find(x => x.id === id) : lastWin);
  let shot = null;
  async function winnerShot(win) {
    if (!win || document.querySelector('.shot-layer')) return;
    const blob = await WinnerCard.draw({ ...win, date: winDate(win.at) });
    if (!blob) { C.toast('تعذّر إنشاء الصورة'); return; }
    const file = new File([blob], `بطل-الإملاء-${win.name}.png`, { type: 'image/png' });
    shot = { url: URL.createObjectURL(blob), file };
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    document.body.insertAdjacentHTML('beforeend', `<div class="shot-layer"><div class="shot-box">
      <img src="${shot.url}" alt="بطاقة تهنئة ${C.esc(win.name)}">
      <div class="row">${canShare ? '<button class="btn pink" data-act="shareShot">📤 مشاركة</button>' : ''}<button class="btn green" data-act="saveShot">💾 حفظ الصورة</button></div>
      <button class="chip dark" data-act="closeShot">✖ إغلاق</button></div></div>`);
  }
  function closeShot() {
    document.querySelector('.shot-layer')?.remove();
    if (shot) URL.revokeObjectURL(shot.url);
    shot = null;
  }
  function certShow(win) {
    if (!win || document.querySelector('.shot-layer')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="shot-layer cert-layer"><div class="shot-box">
      <div class="win-cert"><div class="win-cert-frame">
        <small>🦸 أبطال الإملاء 🦸</small><h1>شهادة بطل</h1>
        <p>تُمنح هذه الشهادة بكل فخر إلى</p>
        <div class="win-cert-name">${win.avatar} ${C.esc(win.name)}</div>
        <p>تقديراً للفوز في <b>«${C.esc(win.kind)}»</b> في ${C.esc(win.land)}</p>
        <p class="muted">${C.esc(win.note)} · ✅ ${C.ltr(win.right)} إجابة صحيحة${win.vs && win.vs.length ? ` · ضد ${win.vs.map(C.esc).join(' و')}` : ''}</p>
        <div class="win-cert-foot"><div><b>${winDate(win.at)}</b><small>التاريخ</small></div><span>🏆</span><div><b>&nbsp;</b><small>توقيع ولي الأمر</small></div></div>
      </div></div>
      <div class="row no-print"><button class="btn green" data-act="certPrint">🖨️ طباعة</button><button class="btn soft" data-act="closeShot">✖ إغلاق</button></div>
    </div></div>`);
  }

  // ───── السباق وشدّ الحبل ─────
  const duelSeconds = () => (duel && duel.kind === 'rope' ? ROPE_SECONDS : CONFIG.raceSeconds);
  const alive = () => {
    if (duel && !document.querySelector('.duel')) abortDuel();
    return !!duel;
  };
  function startLocal(kind) {
    const players = duelPicks.map(kid);
    if (players.length < 2 || players.some(p => !p)) { Screens.groupSetup(); return; }
    Sound.unlock();
    C.nav.cur = 'duel';
    if (kind === 'brain') { startBrainDuel(players); return; }
    duel = { kind, sides: players.map(p => duelSide(p)), timer: null, timeouts: [] };
    Screens.duel();
    countdown(3);
  }
  function countdown(n) {
    if (!alive()) return;
    if (n === 0) {
      Sound.play('go');
      const total = duelSeconds() * 1000;
      duel.endsAt = performance.now() + total;
      duel.t0 = performance.now();
      duel.timer = setInterval(() => {
        if (!alive()) return;
        const left = duel.endsAt - performance.now();
        $('timebar').style.setProperty('--t', Math.max(0, left / total));
        $('timebar').classList.toggle('hurry', left <= 10000);
        $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
        if (left <= 0) finishDuel();
      }, 100);
      duel.sides.forEach((_, i) => nextQ(i));
      return;
    }
    Sound.play('tick');
    duel.sides.forEach((_, i) => { $(`dQ${i}`).innerHTML = `<div class="wordbox"><span class="count">${n}</span></div>`; });
    duel.timeouts.push(setTimeout(() => countdown(n - 1), 800));
  }
  function abortDuel() {
    if (!duel) return;
    if (duel.net) {
      clearTimeout(duel.net.waitT);
      if (!duel.net.finished) Sync.duel.update({ [`${myPath}.left`]: true }).catch(() => {});
    }
    clearInterval(duel.timer);
    duel.timeouts.forEach(clearTimeout);
    duel = null;
    document.body.classList.remove('bgrest');
  }

  function nextQ(i) {
    const s = duel.sides[i];
    const net = !!duel.net;
    const src = Engine.any(s.ws);
    const word = Engine.pick(s.p, s.pools[src], s.last);
    s.last = word.t;
    let stage = Engine.stageFor(s.p, word, 'race');
    if (stage === 'write' && !net) stage = 'spot';
    const q = { word, stage, input: '', picked: [], start: performance.now(), hidden: false, caps: false };
    s.q = q;
    s.locked = false;
    const box = () => $(`dW${i}`);
    const clue = word.e || word.m;
    $(`dFb${i}`).innerHTML = '';
    $(`dQ${i}`).innerHTML = `<div class="prompt-top"><span class="pic">${word.e || (word.lang === 'ar' ? '📝' : '🔤')}</span><span class="meaning" dir="auto">${C.esc(word.m)}</span></div>
      <div class="wordbox" id="dW${i}" dir="${C.wdir(word)}"></div>`;
    const hide = (label = '••••') => {
      if (!duel || s.q !== q) return;
      q.hidden = true;
      if (box()) { box().classList.add('hidden-word'); box().textContent = label; }
    };
    const showWord = ms => {
      box().innerHTML = `<span>${C.wordHTML(word)}</span>`;
      duel.timeouts.push(setTimeout(hide, ms));
    };
    if (stage === 'fill') {
      Object.assign(q, Engine.fillData(word));
      box().innerHTML = C.fillHTML(word, q.at);
      $(`dPad${i}`).innerHTML = choicePad(i, q.choices);
    } else if (stage === 'tile') {
      Object.assign(q, Engine.tileData(word, false));
      showWord(1800);
      $(`dPad${i}`).innerHTML = `<div class="answer" id="dA${i}" dir="${C.wdir(word)}"></div><div class="tiles" dir="${C.wdir(word)}">${q.tiles.map((c, k) => `<button class="tile" data-dtile="${i}:${k}">${C.esc(c)}</button>`).join('')}</div>
        <button class="btn soft small" data-dback="${i}">⌫ تراجع</button>`;
      drawAnswer(i);
    } else if (stage === 'spot') {
      // أي كتابة صحيحة؟ يدلّ عليها الرمز والمعنى، وإن لم يوجدا تظهر الكلمة لحظة
      q.choices = Engine.shuffle([Brain.plain(word), ...Brain.wrongs(word, 3, 3)]);
      q.right = Brain.plain(word);
      const pad = () => { if (duel && s.q === q) $(`dPad${i}`).innerHTML = choicePad(i, q.choices, true); };
      if (clue) { box().classList.add('hidden-word'); box().textContent = 'أي كتابة صحيحة؟'; pad(); }
      else { $(`dPad${i}`).innerHTML = ''; showWord(1400); duel.timeouts.push(setTimeout(pad, 1400)); }
    } else {
      // الكتابة: على عدة أجهزة فقط، فلكل طفل لوحته وصوته
      $(`dPad${i}`).innerHTML = `<div class="answer" id="dA${i}" dir="${C.wdir(word)}"></div>${C.keyboard(word, false).replace(/data-key=/g, 'data-dkey=')}`;
      drawAnswer(i);
      if (Engine.peekBox(s.p, word) >= CONFIG.audioOnlyBox && Speech.can(word)) hide('🔊 استمع واكتب');
      else showWord(2000);
    }
    if (net) setTimeout(() => { if (duel && s.q === q) Speech.say(word); }, 120);
  }
  const choicePad = (i, choices, wide) => `<div class="choices ${wide ? 'wide' : ''}">${choices.map((c, k) => `<button class="choice" data-dchoice="${i}:${k}">${C.esc(c)}</button>`).join('')}</div>`;
  function drawAnswer(i) {
    const s = duel.sides[i];
    const q = s.q;
    const el = $(`dA${i}`);
    if (!el) return;
    if (q.stage === 'tile') {
      const left = q.ls.length - q.picked.length;
      el.innerHTML = `<span>${C.esc(q.picked.map(k => q.tiles[k]).join(''))}</span>${left > 0 ? `<i class="rest">${'•'.repeat(left)}</i>` : ''}`;
    } else el.innerHTML = q.input ? C.esc(q.input) : `<i class="rest">${q.word.lang === 'ar' ? 'اكتب هنا' : 'type here'}</i>`;
  }
  function tapTile(i, k) {
    if (!alive()) return;
    const s = duel.sides[i];
    if (s.locked || !s.q || s.q.stage !== 'tile' || s.q.picked.includes(k)) return;
    const q = s.q;
    q.picked.push(k);
    document.querySelector(`[data-dtile="${i}:${k}"]`).disabled = true;
    Sound.play('tap');
    drawAnswer(i);
    if (q.picked.length < q.ls.length) return;
    const typed = q.picked.map(x => q.tiles[x]).join('');
    const target = q.ls.join('');
    const ok = Store.state.settings.strictCase ? typed === target : typed.toLowerCase() === target.toLowerCase();
    answerQ(i, ok, typed);
  }
  function tapBack(i) {
    if (!alive()) return;
    const s = duel.sides[i];
    if (s.locked || !s.q || s.q.stage !== 'tile' || !s.q.picked.length) return;
    const k = s.q.picked.pop();
    document.querySelector(`[data-dtile="${i}:${k}"]`).disabled = false;
    Sound.play('del');
    drawAnswer(i);
  }
  function tapChoice(i, k, el) {
    if (!alive()) return;
    const s = duel.sides[i];
    if (s.locked || !s.q || !s.q.choices) return;
    const q = s.q;
    const c = q.choices[k];
    const ok = c === q.right;
    document.querySelectorAll(`[data-dchoice^="${i}:"]`).forEach((b, x) => {
      if (q.choices[x] === q.right) b.classList.add('right');
      else if (b === el) b.classList.add('wrong');
    });
    answerQ(i, ok, q.stage === 'spot' ? c : q.ls.map((x, n) => (n === q.at ? c : x)).join(''));
  }
  function typeKey(k) {
    if (!alive() || !duel.net) return;
    const s = duel.sides[0];
    if (s.locked || !s.q || s.q.stage !== 'write') return;
    const q = s.q;
    if (k === 'ok') {
      if (!q.input.trim()) return;
      answerQ(0, Engine.same(q.input, q.word), q.input);
      return;
    }
    if (k === 'del') { q.input = Array.from(q.input).slice(0, -1).join(''); Sound.play('del'); }
    else if (k === 'shift') {
      q.caps = !q.caps;
      $('dPad0').innerHTML = `<div class="answer" id="dA0" dir="ltr"></div>${C.keyboard(q.word, q.caps).replace(/data-key=/g, 'data-dkey=')}`;
    } else if (Array.from(q.input).length < 40) { q.input += q.caps ? k.toUpperCase() : k; Sound.play('tap'); }
    if (!q.hidden) { q.hidden = true; const b = $('dW0'); if (b) { b.classList.add('hidden-word'); b.textContent = '••••'; } }
    drawAnswer(0);
  }
  function answerQ(i, ok, given) {
    const s = duel.sides[i];
    const q = s.q;
    s.locked = true;
    // اختيار الكتابة الصحيحة لا يكفي للإتقان: الإتقان بالكتابة وحدها
    Engine.record(s.p, { word: q.word, stage: q.stage === 'spot' ? 'fill' : q.stage }, ok, false);
    Engine.addAnswer(s.p, q, ok, performance.now() - q.start, given);
    const box = $(`dW${i}`);
    if (ok) {
      s.right++;
      Sound.play('right');
      if (s.right >= s.goal && !s.reachedAt) s.reachedAt = performance.now();
      $(`dFb${i}`).innerHTML = '<span class="good">✅</span>';
    } else {
      s.wrong++;
      Sound.play('wrong');
      if (box) { box.classList.remove('hidden-word'); box.innerHTML = `<span>${C.wordHTML(q.word)}</span>`; }
      $(`dFb${i}`).innerHTML = '<span class="bad">❌ هكذا تُكتب</span>';
    }
    $(`dScore${i}`).textContent = s.right;
    if (duel.kind === 'rope') {
      if (duel.net) netPush(false);
      if (ropeDraw()) { finishDuel(); return; }
    } else {
      $(`dWalker${i}`).style.setProperty('--p', Math.min(s.right / s.goal, 1));
      if (duel.net) netPush(false);
    }
    duel.timeouts.push(setTimeout(() => { if (alive()) nextQ(i); }, ok ? 350 : 1200));
  }
  function ropeDraw() {
    const rights = duel.net ? [duel.sides[0].right, ...duel.net.opps.map(o => o.right || 0)] : duel.sides.map(x => x.right);
    const pull = rights[0] - (rights[1] || 0);
    duel.sides.forEach((_, i) => {
      const el = $(`dKnot${i}`);
      if (el) el.style.setProperty('--k', Math.max(-1, Math.min(1, (i ? -pull : pull) / ROPE_LEAD)));
    });
    return Math.abs(pull) >= ROPE_LEAD;
  }
  function settle(x, won, rope) {
    const before = x.p.coins;
    x.banners = [];
    x.p.coins += x.right * COINS.perCorrect + (won ? COINS.duelWin : 0);
    if (!rope && x.land !== ALL) {
      const st = Engine.state(x.p, x.land);
      const oldRank = Engine.rankFor(Engine.stats(x.p).best);
      if (x.right > st.bestRace) {
        if (st.bestRace > 0) { x.banners.push('🏅 رقم قياسي جديد!'); x.p.coins += COINS.record; }
        st.bestRace = x.right;
      }
      const rank = Engine.rankFor(Engine.stats(x.p).best);
      if (rank.min > oldRank.min) x.banners.push(`${rank.emoji} رتبة جديدة: ${rank.name}`);
    }
    if (!rope) Engine.today(x.p).done.race = true;
    Engine.progress(x.p).forEach(e => x.banners.push(C.eventBanner(e)));
    x.coins = x.p.coins - before;
  }
  function rankSides(list, rope) {
    const key = x => (rope ? [0, -x.right] : x.reachedAt ? [0, x.reachedAt] : [1, -(x.right / x.goal)]);
    const cmp = (a, b) => { const [p, q] = [key(a), key(b)]; return p[0] - q[0] || p[1] - q[1]; };
    const sorted = list.slice().sort(cmp);
    sorted.forEach((x, i) => { x.place = i && cmp(sorted[i - 1], x) === 0 ? sorted[i - 1].place : i + 1; });
    return sorted;
  }
  const soleWinner = ranked => {
    const firsts = ranked.filter(x => x.place === 1);
    return ranked.length >= 2 && firsts.length === 1 ? firsts[0] : null;
  };
  function ropeNote(ranked, winner) {
    const lead = ranked.length >= 2 ? ranked[0].right - ranked[1].right : 0;
    ranked.forEach(x => { x.out = x.out || (x === winner ? '🪢 الحبل في جهته' : '💪 شدّ بقوة'); });
    return !winner ? 'الحبل في المنتصف تماماً' : lead >= ROPE_LEAD ? 'شدّ الحبل كله إلى جهته!' : 'الحبل في جهته عند انتهاء الوقت';
  }
  function finishDuel() {
    if (duel.net) { netFinish(); return; }
    const { sides, kind } = duel;
    const t0 = duel.t0;
    abortDuel();
    const rope = kind === 'rope';
    sides.forEach(x => { if (x.reachedAt) x.reachedAt -= t0; });
    const ranked = rankSides(sides, rope);
    const winner = soleWinner(ranked);
    sides.forEach(x => settle(x, x === winner, rope));
    Store.save();
    Sound.play('win');
    if (winner) C.confetti();
    Screens.duelResults({ sides: ranked, winner, rope, again: 'startAgain', note: rope ? ropeNote(ranked, winner) : '', againLabel: rope ? '🪢 جولة أخرى' : '🏃 سباق آخر' });
  }

  // ───── عدة أجهزة ─────
  // مستند واحد للتحدي: كل جهاز يكتب تقدّم طفله في players.{معرّف الجهاز} ويقرأ تقدّم الآخرين
  const activePlayers = d => Object.values((d && d.players) || {}).filter(x => !x.left).sort((a, b) => a.joinedAt - b.joinedAt);
  const netPlayer = p => ({
    device: DEVICE, pid: p.id, name: p.name, avatar: p.avatar, goal: duelGoal(p), joinedAt: Date.now(),
    right: 0, reachedMs: 0, done: false, left: false, brain: [], g: 0,
  });
  const inviteFor = d => !!(d && d.state === 'waiting' && d.players && d.host !== DEVICE && d.players[d.host] &&
    !activePlayers(d).some(x => x.device === DEVICE) && activePlayers(d).length < kindOf(d).max && Date.now() - d.createdAt < INVITE_MS);
  const othersDone = n => n.opps.every(o => o.done || o.left);

  function netHost() {
    const p = kid(duelPicks[0]);
    if (!p) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const list = isList(duelLand) ? Store.list(duelLand.slice(5)) : null;
    const kind = duelKind;
    netPending = { id, role: 'host', pid: p.id, words: list ? list.words : null };
    C.nav.cur = 'netWait';
    Screens.netWait('host');
    const games = kind === 'brain' ? Brain.pickGames(brainChoice()) : null;
    Sync.duel.set({ id, kind, world: duelLand, landName: landName(duelLand), ...(games ? { games } : {}), ...(list ? { words: list.words } : {}), state: 'waiting', createdAt: Date.now(), host: DEVICE, players: { [DEVICE]: netPlayer(p) } })
      .catch(() => {
        netPending = null;
        C.toast('⚠️ تعذّر إرسال الدعوة. تأكد من الإنترنت وتسجيل الدخول.', 5000);
        C.go('groupSetup');
      });
  }
  function netJoin(pid) {
    const d = Sync.duel.data();
    const p = kid(pid);
    if (!p || !inviteFor(d)) { C.toast('انتهت الدعوة أو اكتمل العدد'); C.go('camp'); return; }
    duelLand = d.world || 'ar';
    duelKind = d.kind || 'race';
    netPending = { id: d.id, role: 'guest', pid, words: d.words || null };
    C.nav.cur = 'netWait';
    Screens.netWait('guest');
    Sync.duel.update({ [myPath]: netPlayer(p) }).catch(() => {
      netPending = null;
      C.toast('⚠️ تعذّر الانضمام. تأكد من الإنترنت.', 5000);
      C.go('camp');
    });
  }
  function netStart() {
    const d = Sync.duel.data();
    if (!netPending || netPending.role !== 'host' || !d || d.id !== netPending.id || activePlayers(d).length < 2) return;
    Sync.duel.update({ state: 'running' }).catch(() => {});
    d.kind === 'brain' ? startNetBrain(d) : startNetDuel(d);
  }
  function netShare() {
    const d = Sync.duel.data();
    if (!netPending || !d || d.id !== netPending.id) return;
    const K = kindOf(d);
    const url = `${location.origin}${location.pathname}#duel=${d.id}`;
    const text = `${K.icon} ${d.players[d.host].name} يدعوك ${K.invite} في أبطال الإملاء!`;
    if (navigator.share) { navigator.share({ title: 'أبطال الإملاء', text, url }).catch(() => {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(`${text}\n${url}`) : Promise.reject())
      .then(() => C.toast('📋 نُسخ الرابط، الصقه في المحادثة'), () => C.toast(url, 6000));
  }
  function netCancel() {
    if (netPending) {
      Sync.duel.update(netPending.role === 'host' ? { state: 'cancelled' } : { [`${myPath}.left`]: true }).catch(() => {});
      netPending = null;
    }
    C.go('groupSetup');
  }
  function startNetDuel(d) {
    duelLand = d.world || 'ar';
    const { pid, words } = netPending;
    netPending = null;
    const p = kid(pid);
    const opps = activePlayers(d).filter(x => x.device !== DEVICE).slice(0, kindOf(d).max - 1).map(x => Object.assign({}, x));
    if (!p || !opps.length) { C.go('camp'); return; }
    Sound.unlock();
    C.nav.cur = 'duel';
    duel = { kind: d.kind === 'rope' ? 'rope' : 'race', sides: [duelSide(p, words)], net: { id: d.id, opps, finished: false }, timer: null, timeouts: [] };
    Screens.duel();
    countdown(3);
  }
  function netPush(final) {
    const n = duel.net, s = duel.sides[0], t0 = duel.t0;
    const send = () => {
      n.pushT = null;
      const data = { [`${myPath}.right`]: s.right, [`${myPath}.reachedMs`]: s.reachedAt ? Math.round(s.reachedAt - t0) : 0 };
      if (final) data[`${myPath}.done`] = true;
      Sync.duel.update(data).catch(() => {});
    };
    if (final) { clearTimeout(n.pushT); send(); return; }
    if (!n.pushT) n.pushT = setTimeout(send, 600);
  }
  const waitLock = () => {
    const box = document.createElement('div');
    box.className = 'duel-lock';
    box.innerHTML = '<div class="card group-center"><div class="big-emoji wait-spin">⏳</div><h2>بانتظار نتائج المنافسين…</h2></div>';
    document.querySelector('.duel').appendChild(box);
  };
  function netFinish() {
    const n = duel.net;
    clearInterval(duel.timer);
    duel.timeouts.forEach(clearTimeout);
    duel.sides[0].locked = true;
    n.finished = true;
    netPush(true);
    waitLock();
    n.waitT = setTimeout(netResolve, 8000);
    if (othersDone(n)) netResolve();
  }
  function netResolve() {
    if (!duel || !duel.net) return;
    const n = duel.net, s = duel.sides[0], t0 = duel.t0, rope = duel.kind === 'rope';
    abortDuel();
    if (s.reachedAt) s.reachedAt -= t0;
    const others = n.opps.map(o => ({
      p: { avatar: o.avatar, name: o.name }, right: o.right || 0, goal: o.goal, reachedAt: o.reachedMs || 0, coins: null, banners: [],
      out: o.left ? '🏳️ انسحب قبل النهاية' : !o.done ? '📡 انقطع اتصاله' : '',
    }));
    const gone = others.filter(x => x.out);
    const ranked = rankSides([s, ...others.filter(x => !x.out)], rope);
    const winner = soleWinner(ranked);
    settle(s, winner === s, rope);
    Store.save();
    Sound.play('win');
    if (winner) C.confetti();
    Screens.duelResults({
      netId: n.id, sides: ranked.concat(gone), winner, rope, again: 'startAgain', againLabel: rope ? '🪢 جولة أخرى' : '🏃 سباق آخر',
      note: ranked.length < 2 ? 'لم يُكمل المنافسون التحدي، فلا فائز هذه المرة' : rope ? ropeNote(ranked, winner) : '',
    });
  }

  // ───── من المتصل الآن والدعوات ─────
  const onlineOthers = () => {
    const d = netPending && Sync.duel.data();
    const seen = new Set(d && d.id === netPending.id ? activePlayers(d).map(x => x.pid) : []);
    return Object.entries(Sync.online.data())
      .filter(([dev, x]) => dev !== DEVICE && x && x.at && Date.now() - x.at < ONLINE_MS)
      .map(([, x]) => x).sort((a, b) => b.at - a.at)
      .filter(x => !seen.has(x.pid) && seen.add(x.pid));
  };
  const onlineInner = () => {
    const list = onlineOthers();
    return list.length ? `<b>🟢 متصل الآن:</b> ${list.map(x => `<span>${C.esc(x.avatar)} ${C.esc(x.name)}${x.busy ? ' 🎮' : ''}</span>`).join('')}` : '';
  };
  function onlineStrip() {
    const inner = onlineInner();
    return `<div class="online-strip" id="onlineStrip" ${inner ? '' : 'hidden'}>${inner}</div>`;
  }
  function refreshOnline() {
    const el = $('onlineStrip');
    if (!el) return;
    const inner = onlineInner();
    el.innerHTML = inner;
    el.hidden = !inner;
  }
  const busy = () => !!(duel || brain || netPending || (C && C.inRound()));
  function beat() {
    const p = Store.current();
    if (!p) return;
    Sync.online.beat(DEVICE, document.visibilityState === 'hidden' ? { at: 0 }
      : { pid: p.id, name: p.name, avatar: p.avatar, at: Date.now(), busy: busy() });
  }
  const inviteBar = document.createElement('div');
  let inviteTimer;
  function showInvite(d) {
    const ok = inviteFor(d) && !busy() && inviteBar.dataset.dismissed !== d.id;
    inviteBar.hidden = !ok;
    clearTimeout(inviteTimer);
    if (!ok) return;
    const host = d.players[d.host];
    const K = kindOf(d);
    inviteBar.innerHTML = `<span>${K.icon} ${host.avatar} <b>${C.esc(host.name)}</b> يدعوك ${K.invite}!</span>
      <button class="btn gold small" data-invite="join">انضم</button>
      <button class="chip dark" data-invite="no" aria-label="تجاهل">✕</button>`;
    inviteTimer = setTimeout(() => showInvite(Sync.duel.data()), d.createdAt + INVITE_MS - Date.now());
  }
  let linkDuel = '', linkTimer;
  function openLinkDuel(d) {
    if (!linkDuel || !d || busy()) return;
    if (d.id !== linkDuel && Date.now() - d.createdAt > INVITE_MS) return;
    const id = linkDuel;
    linkDuel = '';
    clearTimeout(linkTimer);
    if (d.id === id && d.host === DEVICE) return;
    if (d.id === id && inviteFor(d)) { inviteBar.hidden = true; Screens.netJoin(d); }
    else C.toast('انتهت الدعوة أو اكتمل العدد', 3500);
  }
  function fromHash() {
    const j = location.hash.match(/join=([0-9A-Za-z]{8})/);
    if (j) {
      history.replaceState(history.state, '', location.pathname + location.search);
      C.go('join', j[1].toUpperCase());
      return true;
    }
    const m = location.hash.match(/duel=([0-9a-z]{6,20})/);
    if (!m) return false;
    history.replaceState(history.state, '', location.pathname + location.search);
    linkDuel = m[1];
    clearTimeout(linkTimer);
    linkTimer = setTimeout(() => {
      if (!linkDuel) return;
      linkDuel = '';
      C.toast(Sync.duel.ready() ? 'انتهت الدعوة' : '⚠️ افتح الرابط على جهاز مرتبط بحساب العائلة ومتصل بالإنترنت', 5000);
    }, 15000);
    openLinkDuel(Sync.duel.data());
    return true;
  }
  function onDuelDoc(d) {
    showInvite(d);
    openLinkDuel(d);
    if (netPending) {
      if (!document.querySelector('.net-wait')) { netPending = null; return; }
      if (!d || d.id !== netPending.id) return;
      if (d.state === 'cancelled') { netPending = null; C.toast('أُلغيت الدعوة'); C.go('camp'); return; }
      if (d.state === 'running') {
        if (activePlayers(d).some(x => x.device === DEVICE)) d.kind === 'brain' ? startNetBrain(d) : startNetDuel(d);
        else { netPending = null; C.toast('بدأ التحدي قبل انضمامك'); C.go('camp'); }
        return;
      }
      // ضاع انضمامنا مع انقطاع الاتصال: نرسله مرة أخرى
      const me = d.players && d.players[DEVICE];
      if (netPending.role === 'guest' && Sync.duel.synced() && (!me || me.left) && !(netPending.retryAt > Date.now() - 5000)) {
        const p = kid(netPending.pid);
        netPending.retryAt = Date.now();
        if (p) Sync.duel.update({ [myPath]: netPlayer(p) }).catch(() => {});
      }
      Screens.netWait(netPending.role);
      return;
    }
    if (brain && brain.net && d && d.id === brain.net.id) { netBrainUpdate(d); return; }
    if (!duel || !duel.net || !d || d.id !== duel.net.id) return;
    const n = duel.net;
    n.opps.forEach((o, j) => {
      const x = d.players && d.players[o.device];
      if (!x) return;
      if (x.left && !o.left && !n.finished) C.toast(`🏳️ انسحب ${x.name}`, 3000);
      Object.assign(o, x);
      if ($(`oWalker${j}`)) $(`oWalker${j}`).style.setProperty('--p', Math.min(x.right / x.goal, 1));
      if ($(`oScore${j}`)) $(`oScore${j}`).textContent = x.right;
    });
    if (n.finished && othersDone(n)) { netResolve(); return; }
    if (duel.kind === 'rope' && !n.finished && (ropeDraw() || n.opps.every(o => o.done || o.left))) finishDuel();
  }

  // ───── تحدّي العقل ومبارزة العقول ─────
  function brainSideFor(p, land, ids, inline) {
    const srcs = kidLands(land);
    const pools = poolsFor(p, land, inline);
    return {
      p, land, srcs, P: Object.values(pools).flat(), q: null, locked: true,
      games: ids.map(id => {
        const lv = Math.max(1, Math.min(...srcs.map(x => Brain.state(p, x).lv[id] || 1)) - 1);
        return { id, lv, top: lv, streak: 0, right: 0, wrong: 0, points: 0, medal: '', won: false };
      }),
    };
  }
  const brainAlive = () => {
    if (brain && !document.querySelector('.brain')) abortBrain();
    return !!brain;
  };
  function abortBrain() {
    if (!brain) return;
    if (brain.net) {
      clearTimeout(brain.net.waitT);
      clearTimeout(brain.net.pushT);
      if (!brain.net.finished) Sync.duel.update({ [`${myPath}.left`]: true }).catch(() => {});
    }
    clearInterval(brain.timer);
    brain.timeouts.forEach(clearTimeout);
    if (brain.t0) brain.sides.forEach(s => { Engine.today(s.p).secs += (performance.now() - brain.t0) / 1000; });
    brain = null;
    document.body.classList.remove('bgrest');
    Store.save();
  }
  function startBrain() {
    const p = Store.current();
    abortBrain();
    const ids = Brain.pickGames(brainChoice());
    if (!ids.length) return;
    Sound.unlock();
    C.nav.cur = 'duel';
    brain = { duel: false, g: 0, ids, phase: 'intro', sides: [brainSideFor(p, p.world || 'ar', ids)], timer: null, timeouts: [] };
    Screens.brain();
  }
  function startBrainDuel(players) {
    abortBrain();
    const ids = Brain.pickGames(brainChoice());
    if (!ids.length) { Screens.groupSetup(); return; }
    brain = { duel: true, g: 0, ids, phase: 'play', sides: players.map(p => brainSideFor(p, duelLand, ids)), timer: null, timeouts: [] };
    brainGo();
  }
  function brainGo() {
    if (!brain) return;
    const b = brain;
    b.phase = 'play';
    b.sides.forEach(s => { s.locked = true; });
    b.duel ? Screens.brainDuel() : Screens.brain();
    b.sides.forEach((_, i) => brainLevel(i));
    const G = Brain.game(b.ids[b.g]);
    const tick = n => {
      if (!brainAlive()) return;
      if (n === 0) {
        Sound.play('go');
        const total = (b.duel ? Brain.DUEL_SECONDS : Brain.SECONDS) * 1000;
        b.t0 = b.t0 || performance.now();
        b.endsAt = performance.now() + total;
        b.timer = setInterval(() => {
          if (!brainAlive()) return;
          const left = b.endsAt - performance.now();
          $('timebar').style.setProperty('--t', Math.max(0, left / total));
          $('timebar').classList.toggle('hurry', left <= 10000);
          $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
          if (left <= 0) brainEndGame();
        }, 100);
        b.sides.forEach((_, i) => brainNext(i));
        return;
      }
      Sound.play('tick');
      b.sides.forEach((_, i) => {
        $(`bStage${i}`).innerHTML = `${b.duel ? `<div class="bgame">${G.icon} ${G.name}<small>${G.how}</small></div>` : ''}<div class="wordbox"><span class="count">${n}</span></div>`;
      });
      b.timeouts.push(setTimeout(() => tick(n - 1), 800));
    };
    tick(3);
  }
  function brainLevel(i) {
    const g = brain.sides[i].games[brain.g];
    $(`bLv${i}`).innerHTML = `المستوى ${'⭐'.repeat(g.lv)}<span class="dim">${'⭐'.repeat(5 - g.lv)}</span>`;
    $(`bScore${i}`).textContent = brain.duel ? g.right : g.points;
  }
  const clueHTML = w => `<div class="prompt-top"><span class="pic">${w.e || ''}</span><span class="meaning" dir="auto">${C.esc(w.m)}</span></div>`;
  const wordCard = (w, s) => `<span dir="${C.wdir(w)}">${C.esc(s)}</span>`;
  function brainNext(i) {
    if (!brainAlive()) return;
    const b = brain;
    const s = b.sides[i];
    const g = s.games[b.g];
    const cap = b.duel && !b.net ? 6 : 8;
    let id = g.id;
    let q = Brain.make[id](s.P, g.lv, cap);
    if (!q) { id = 'cmp'; q = Brain.make.cmp(s.P, g.lv); }
    q.id = id;
    s.q = q;
    $(`bFb${i}`).textContent = '';
    const stage = $(`bStage${i}`);
    const bt = (k, html, cls = 'bcard') => `<button class="${cls}" data-bt="${i}:${k}">${html}</button>`;
    if (id === 'cmp') {
      stage.innerHTML = `${clueHTML(q.w)}<div class="scale">${q.options.map((o, k) => bt(k, wordCard(q.w, o.s), 'pan')).join('<span class="fulcrum">⚖️</span>')}</div>`;
    } else if (id === 'pick') {
      q.got = 0;
      stage.innerHTML = `<div class="target">اضغط كل كلمة مكتوبة صحيحاً</div><div class="bcards">${q.cards.map((c, k) => bt(k, wordCard(c.w, c.s))).join('')}</div>`;
    } else if (id === 'arr') {
      stage.innerHTML = `${clueHTML(q.w)}<div class="wordbox" id="bW${i}" dir="${C.wdir(q.w)}">${C.esc(Brain.plain(q.w))}</div><div class="bchoices wide" id="bC${i}"></div>`;
      b.timeouts.push(setTimeout(() => {
        if (brain !== b || s.q !== q || s.locked) return;
        const w = $(`bW${i}`);
        w.classList.add('hidden-word');
        w.textContent = '؟';
        $(`bC${i}`).innerHTML = q.options.map((o, k) => bt(k, wordCard(q.w, o.s), 'bchoice')).join('');
      }, q.flash));
    } else if (id === 'miss') {
      stage.innerHTML = `${clueHTML(q.w)}<div class="wordbox" dir="${C.wdir(q.w)}"><span>${q.ls.map((c, k) => (k === q.at ? '<i class="monkey">🐒</i>' : C.esc(c))).join('')}</span></div>
        <div class="bchoices">${q.choices.map((c, k) => bt(k, C.esc(c), 'bchoice')).join('')}</div>`;
    } else if (id === 'tf') {
      stage.innerHTML = `${clueHTML(q.w)}<div class="wordbox rock" dir="${C.wdir(q.w)}">${C.esc(q.s)}</div>
        <div class="bchoices two">${bt(0, '✅ صحيحة', 'bchoice')}${bt(1, '❌ خطأ', 'bchoice')}</div>`;
    } else if (id === 'seq') {
      stage.innerHTML = `${clueHTML(q.w)}<div class="wordbox" dir="${C.wdir(q.w)}"><span>${C.esc(q.prefix)}<i class="paw">🐾</i></span></div>
        <div class="bchoices">${q.options.map((c, k) => bt(k, C.esc(c), 'bchoice')).join('')}</div>`;
    } else if (id === 'pair') {
      s.sel = null;
      q.got = 0;
      const clue = x => `${x.w.e || ''} <small dir="auto">${C.esc(x.w.m)}</small>`;
      stage.innerHTML = `<div class="target">صِل كل صورة بكلمتها</div><div class="pairs">
        <div class="pcol">${q.left.map(x => bt(`L${x.id}`, clue(x))).join('')}</div>
        <div class="pcol">${q.right.map(x => bt(`R${x.id}`, wordCard(x.w, Brain.plain(x.w)))).join('')}</div></div>`;
    } else if (id === 'ord') {
      q.step = 0;
      q.built = '';
      stage.innerHTML = `${clueHTML(q.w)}<div class="answer" id="bA${i}" dir="${C.wdir(q.w)}"><i class="rest">${'•'.repeat(q.ls.length)}</i></div>
        <div class="tiles" dir="${C.wdir(q.w)}">${q.tiles.map((c, k) => bt(k, C.esc(c), 'tile')).join('')}</div>`;
    }
    s.locked = false;
  }
  function brainTap(i, k, el) {
    if (!brainAlive() || brain.phase !== 'play') return;
    const s = brain.sides[i];
    if (!s || s.locked || !s.q) return;
    const q = s.q;
    if (q.id === 'cmp' || q.id === 'arr') {
      const o = q.options[Number(k)];
      el.classList.add(o.ok ? 'right' : 'wrong');
      brainAnswer(i, o.ok);
    } else if (q.id === 'miss') {
      const ok = q.choices[Number(k)] === q.right;
      el.classList.add(ok ? 'right' : 'wrong');
      brainAnswer(i, ok);
    } else if (q.id === 'seq') {
      const ok = q.options[Number(k)] === q.right;
      el.classList.add(ok ? 'right' : 'wrong');
      brainAnswer(i, ok);
    } else if (q.id === 'tf') {
      const ok = (Number(k) === 0) === q.isRight;
      el.classList.add(ok ? 'right' : 'wrong');
      brainAnswer(i, ok);
    } else if (q.id === 'pick') {
      const c = q.cards[Number(k)];
      if (!c.ok) { el.classList.add('wrong'); brainAnswer(i, false); return; }
      el.classList.add('right');
      el.disabled = true;
      Sound.play('tap');
      if (++q.got >= q.need) brainAnswer(i, true);
    } else if (q.id === 'ord') {
      const c = q.tiles[Number(k)];
      if (c !== q.ls[q.step]) { el.classList.add('wrong'); brainAnswer(i, false); return; }
      el.disabled = true;
      q.step++;
      q.built += c;
      Sound.play('tap');
      const left = q.ls.length - q.step;
      $(`bA${i}`).innerHTML = `<span>${C.esc(q.built)}</span>${left ? `<i class="rest">${'•'.repeat(left)}</i>` : ''}`;
      if (!left) brainAnswer(i, true);
    } else if (q.id === 'pair') {
      const col = k[0];
      const id = Number(k.slice(1));
      if (!s.sel || s.sel.col === col) {
        if (s.sel) s.sel.el.classList.remove('sel');
        s.sel = { col, id, el };
        el.classList.add('sel');
        return;
      }
      if (s.sel.id !== id) { el.classList.add('wrong'); s.sel.el.classList.add('wrong'); s.sel = null; brainAnswer(i, false); return; }
      [el, s.sel.el].forEach(x => { x.classList.remove('sel'); x.classList.add('right'); x.disabled = true; });
      s.sel = null;
      Sound.play('tap');
      if (++q.got >= q.left.length) brainAnswer(i, true);
    }
  }
  function brainAnswer(i, ok) {
    const b = brain;
    const s = b.sides[i];
    const g = s.games[b.g];
    s.locked = true;
    Brain.step(g, ok);
    Sound.play(ok ? 'right' : 'wrong');
    $(`bFb${i}`).textContent = ok ? ['رائع! 🎉', 'صحيح! ⭐', 'ممتاز! 🌟', 'أحسنت! 👏'][g.right % 4] : 'لا بأس، ركّز في التالي 💪';
    brainLevel(i);
    if (b.net) netBrainPush(false);
    b.timeouts.push(setTimeout(() => brainNext(i), ok ? 450 : 1300));
  }
  function brainEndGame() {
    const b = brain;
    clearInterval(b.timer);
    b.timeouts.forEach(clearTimeout);
    b.timeouts = [];
    b.sides.forEach(s => { s.locked = true; });
    const games = b.sides.map(s => s.games[b.g]);
    games.forEach(g => { g.medal = Brain.medal(g.points); });
    let note;
    if (b.net) note = `✅ ${games[0].right} إجابة صحيحة`;
    else if (b.duel) {
      const top = Math.max(...games.map(g => g.right));
      if (top > 0) games.forEach(g => { g.won = g.right === top; });
      const won = b.sides.filter(s => s.games[b.g].won);
      note = won.length === 1 ? `👑 ${won[0].p.avatar} ${won[0].p.name} فاز باللعبة` : won.length ? '🤝 تعادل في هذه اللعبة' : '';
    } else note = `${games[0].medal} ${games[0].points} نقطة`;
    if (++b.g < b.ids.length) {
      Sound.play('coin');
      if (note) C.toast(note, 1800);
      if (b.net) netBrainPush(false);
      if (b.duel) {
        b.phase = 'wait';
        b.timeouts.push(setTimeout(() => { if (brainAlive()) brainGo(); }, 2000));
      } else {
        b.phase = 'intro';
        Screens.brain();
      }
      return;
    }
    b.net ? netBrainFinish() : b.duel ? finishBrainDuel() : finishBrain();
  }
  const keepLevels = s => { s.srcs.forEach(src => { const st = Brain.state(s.p, src); s.games.forEach(g => { st.lv[g.id] = g.lv; }); }); };
  function finishBrain() {
    const s = brain.sides[0];
    abortBrain();
    const p = s.p;
    const before = p.coins;
    const st = Brain.state(p, s.land);
    const points = s.games.reduce((n, g) => n + g.points, 0);
    const right = s.games.reduce((n, g) => n + g.right, 0);
    p.coins += right * COINS.perCorrect + COINS.roundDone;
    const newRecord = points > st.best && st.best > 0;
    if (points > st.best) { st.best = points; p.coins += COINS.record; }
    keepLevels(s);
    Store.save();
    Sound.play(newRecord ? 'win' : 'coin');
    if (newRecord) C.confetti();
    Screens.brainResults({ points, best: st.best, games: s.games, newRecord, coins: p.coins - before });
  }
  function rankBrain(list) {
    const cmp = (a, b) => b.wins - a.wins || b.right - a.right;
    const sorted = list.slice().sort(cmp);
    sorted.forEach((x, i) => { x.place = i && cmp(sorted[i - 1], x) === 0 ? sorted[i - 1].place : i + 1; });
    return sorted;
  }
  function brainChart({ ids, rows }) {
    const top = Math.max(1, ...rows.flatMap(r => [...r.per, ...(r.perW || [])]));
    return `<div class="card bchart"><h2>📊 لعبة بلعبة</h2>
      <div class="bchart-key"><span><i class="good"></i>صحيحة</span><span><i class="bad"></i>خاطئة</span></div>
      ${ids.map((id, j) => `<div class="bchart-game"><h4>${Brain.game(id).icon} ${Brain.game(id).name}</h4>
        ${rows.map(r => `<div class="bchart-row"><span class="who">${r.p.avatar} ${C.esc(r.p.name)} ${r.won[j] ? '👑' : ''}</span><div class="bars">
          <div class="bbar good"><i style="width:${(r.per[j] / top) * 100}%"></i><b>${r.per[j]}</b></div>
          ${r.perW ? `<div class="bbar bad"><i style="width:${(r.perW[j] / top) * 100}%"></i><b>${r.perW[j]}</b></div>` : ''}
        </div></div>`).join('')}</div>`).join('')}
    </div>`;
  }
  function finishBrainDuel() {
    const b = brain;
    abortBrain();
    const list = b.sides.map(s => ({
      p: s.p, s, wins: s.games.filter(g => g.won).length, right: s.games.reduce((n, g) => n + g.right, 0),
      per: s.games.map(g => g.right), perW: s.games.map(g => g.wrong), won: s.games.map(g => g.won), banners: [],
    }));
    const ranked = rankBrain(list);
    const winner = soleWinner(ranked);
    list.forEach(x => {
      const before = x.p.coins;
      x.p.coins += x.right * COINS.perCorrect + (x === winner ? COINS.duelWin : 0);
      keepLevels(x.s);
      x.coins = x.p.coins - before;
      x.wrong = x.perW.reduce((a, c) => a + c, 0);
      x.out = b.ids.map((id, j) => `${Brain.game(id).icon} ${x.s.games[j].won ? '👑' : ''}${x.s.games[j].right}`).join(' · ');
    });
    Store.save();
    Sound.play('win');
    if (winner) C.confetti();
    Screens.duelResults({
      sides: ranked, winner, again: 'startAgain', againLabel: '🧠 مبارزة أخرى', chart: { ids: b.ids, rows: ranked },
      note: winner ? `فاز بـ ${winner.wins} من ${b.ids.length} ألعاب` : 'نفس عدد الألعاب والإجابات الصحيحة',
    });
  }
  function startNetBrain(d) {
    duelLand = d.world || 'ar';
    const { pid, words } = netPending;
    netPending = null;
    const p = kid(pid);
    const opps = activePlayers(d).filter(x => x.device !== DEVICE).slice(0, MAX_PLAYERS - 1).map(x => Object.assign({}, x));
    if (!p || !opps.length) { C.go('camp'); return; }
    abortBrain();
    Sound.unlock();
    C.nav.cur = 'duel';
    const ids = (d.games || []).filter(id => Brain.GAMES.some(G => G.id === id));
    brain = { duel: true, g: 0, ids, phase: 'play', sides: [brainSideFor(p, duelLand, ids, words)], timer: null, timeouts: [], net: { id: d.id, opps, finished: false } };
    brainGo();
  }
  const brainOpps = () => brain.net.opps.map(o => {
    const got = o.brain || [];
    const g = Math.min(o.g || 0, brain.ids.length - 1);
    const st = o.left ? '🏳️' : o.done ? `🏁 ${C.ltr(got.reduce((a, x) => a + (x || 0), 0))}` : `${Brain.game(brain.ids[g]).icon} ${C.ltr(got[g] || 0)}`;
    return `<div class="opp mini-opp"><b>${o.avatar} ${C.esc(o.name)}</b><span>${st}</span></div>`;
  }).join('');
  function netBrainPush(final) {
    const n = brain.net;
    const s = brain.sides[0];
    const b = brain;
    const send = () => {
      n.pushT = null;
      const data = { [`${myPath}.brain`]: s.games.map(g => g.right), [`${myPath}.brainW`]: s.games.map(g => g.wrong), [`${myPath}.g`]: Math.min(b.g, b.ids.length - 1) };
      if (final) data[`${myPath}.done`] = true;
      Sync.duel.update(data).catch(() => {});
    };
    if (final) { clearTimeout(n.pushT); send(); return; }
    if (!n.pushT) n.pushT = setTimeout(send, 600);
  }
  function netBrainUpdate(d) {
    const n = brain.net;
    n.opps.forEach(o => {
      const x = d.players && d.players[o.device];
      if (!x) return;
      if (x.left && !o.left && !n.finished) C.toast(`🏳️ انسحب ${x.name}`, 3000);
      Object.assign(o, x);
    });
    if ($('bOpps')) $('bOpps').innerHTML = brainOpps();
    if (n.finished && othersDone(n)) netBrainResolve();
  }
  function netBrainFinish() {
    const n = brain.net;
    n.finished = true;
    brain.phase = 'wait';
    netBrainPush(true);
    waitLock();
    n.waitT = setTimeout(netBrainResolve, 15000);
    if (othersDone(n)) netBrainResolve();
  }
  function netBrainResolve() {
    if (!brain || !brain.net) return;
    const b = brain;
    const s = b.sides[0];
    const n = b.net;
    abortBrain();
    const mine = { p: s.p, s, per: s.games.map(g => g.right), perW: s.games.map(g => g.wrong), banners: [] };
    const others = n.opps.map(o => ({
      p: { avatar: o.avatar, name: o.name }, per: b.ids.map((_, j) => (o.brain || [])[j] || 0), coins: null, banners: [],
      perW: o.brainW ? b.ids.map((_, j) => o.brainW[j] || 0) : null,
      gone: o.left ? '🏳️ انسحب قبل النهاية' : !o.done ? '📡 انقطع اتصاله' : '',
    }));
    const playing = [mine, ...others.filter(x => !x.gone)];
    b.ids.forEach((id, j) => {
      const top = Math.max(...playing.map(x => x.per[j]));
      playing.forEach(x => { x.won = x.won || []; x.won[j] = top > 0 && x.per[j] === top; });
    });
    playing.concat(others).forEach(x => {
      x.won = x.won || [];
      x.wins = x.won.filter(Boolean).length;
      x.right = x.per.reduce((a, c) => a + c, 0);
      x.wrong = x.perW ? x.perW.reduce((a, c) => a + c, 0) : null;
      x.out = x.gone || b.ids.map((id, j) => `${Brain.game(id).icon} ${x.won[j] ? '👑' : ''}${x.per[j]}`).join(' · ');
    });
    const ranked = rankBrain(playing);
    const winner = soleWinner(ranked);
    const before = s.p.coins;
    s.p.coins += mine.right * COINS.perCorrect + (winner === mine ? COINS.duelWin : 0);
    keepLevels(s);
    mine.coins = s.p.coins - before;
    Store.save();
    Sound.play('win');
    if (winner) C.confetti();
    Screens.duelResults({
      netId: n.id, sides: ranked.concat(others.filter(x => x.gone)), winner, again: 'startAgain', againLabel: '🧠 مبارزة أخرى',
      chart: ranked.length > 1 ? { ids: b.ids, rows: ranked } : null,
      note: ranked.length < 2 ? 'لم يُكمل المنافسون المبارزة، فلا فائز هذه المرة' : winner ? `فاز بـ ${winner.wins} من ${b.ids.length} ألعاب` : 'نفس عدد الألعاب والإجابات الصحيحة',
    });
  }

  // ───── ربط الأجهزة ─────
  function pairBox() {
    const k = kid(pairing.kid);
    const who = k ? `${k.avatar} ${C.esc(k.name)}` : 'الجهاز المشترك';
    const qr = qrcode(0, 'M');
    qr.addData(`${location.origin}${location.pathname}#join=${pairing.code}`);
    qr.make();
    return `<div class="pair-box ${pairing.ready ? '' : 'pending'}">
      <p>على جهاز ${who}: افتح اللعبة ← «جهاز طفل؟ انضم برمز» ثم امسح الرمز أو اكتبه</p>
      <div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <b class="pair-code" dir="ltr">${pairing.code.slice(0, 4)}-${pairing.code.slice(4)}</b>
      <small class="muted">${pairing.ready ? '✅ جاهز · صالح لعشر دقائق' : '⏳ جارٍ تفعيل الرمز…'}</small>
      <button class="link-btn dark" data-act="cancelPair">إلغاء</button>
    </div>`;
  }
  function devicesBox() {
    const who = id => { const k = kid(id); return k ? `${k.avatar} ${C.esc(k.name)}` : '👨‍👩‍👧 مشترك'; };
    const list = Sync.devices();
    const rows = list.length
      ? list.map(d => `<div class="switchrow"><span>${who(d.kid)} <small class="muted">· ${C.esc(d.name || 'جهاز')}</small></span><button class="mini" data-act="removeDevice" data-arg="${d.id}">فصل</button></div>`).join('')
      : '<p class="muted">لا توجد أجهزة أطفال مرتبطة بعد.</p>';
    const add = pairing && pairing.exp > Date.now() ? pairBox()
      : `<p class="lbl">➕ أضف جهازاً لـ</p><div class="chips">${Store.state.profiles.map(k => `<button class="land-chip" data-act="pairDevice" data-arg="${k.id}">${k.avatar} ${C.esc(k.name)}</button>`).join('')}
        <button class="land-chip" data-act="pairDevice" data-arg="">👨‍👩‍👧 جهاز مشترك</button></div>`;
    return `<h3 class="sub-h">📱 أجهزة الأطفال</h3>${rows}${add}`;
  }
  function syncCard() {
    const st = Sync.status();
    const when = Sync.lastSync() ? new Date(Sync.lastSync()).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' }) : '';
    let body;
    if (st === 'loading') body = '<p class="muted">جارٍ التحميل…</p>';
    else if (st === 'unavailable') body = '<p class="muted">الربط يحتاج فتح اللعبة من رابطها على الإنترنت. اللعبة تعمل وتحفظ على هذا الجهاز.</p>';
    else if (st === 'out') body = `<p class="muted">سجّل دخولك بحساب Google ليظهر تقدّم الأطفال وقوائمهم نفسها على كل الأجهزة، ولتعمل الدعوات بينها.</p>
      <button class="btn green wide" data-act="syncIn">تسجيل الدخول بحساب Google</button>`;
    else {
      const label = { syncing: '⏳ جارٍ المزامنة…', offline: '📴 بدون اتصال — تُرفع التعديلات عند عودة الإنترنت', ok: `✅ متزامن${when ? ` · آخر مزامنة ${when}` : ''}`, error: '⚠️ تعذّرت المزامنة' }[st] || '';
      body = Sync.role() === 'device'
        ? `<p>${label}</p><p class="muted">📱 هذا الجهاز مرتبط بحساب العائلة برمز من ولي الأمر.</p>${ownerBox()}<button class="link-btn dark" data-act="syncOut">فصل هذا الجهاز عن العائلة</button>`
        : `<p>${label}</p><p class="muted" dir="ltr">${C.esc(Sync.email())}</p>${devicesBox()}<button class="link-btn dark" data-act="syncOut">تسجيل الخروج من هذا الجهاز</button>`;
    }
    return `<div class="card" id="syncCard"><h2>☁️ المزامنة بين الأجهزة</h2>${body}</div>`;
  }
  // صاحب الجهاز يدخل ملفه مباشرة، وبقية الأبطال يحتاجون رمزهم السري
  function ownerBox() {
    const own = Store.state.owner;
    return `<p class="lbl">👤 صاحب هذا الجهاز</p><div class="chips">${Store.state.profiles.map(k =>
      `<button class="land-chip ${own === k.id ? 'on' : ''}" data-act="setOwner" data-arg="${k.id}">${k.avatar} ${C.esc(k.name)}</button>`).join('')}
      <button class="land-chip ${own ? '' : 'on'}" data-act="setOwner" data-arg="">👨‍👩‍👧 جهاز مشترك</button></div>`;
  }
  const refreshSync = () => { const el = $('syncCard'); if (el) el.outerHTML = syncCard(); };
  function stopScan() {
    if (scanStream) scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  const loadJsQR = () => (window.jsQR ? Promise.resolve() : new Promise((ok, fail) => {
    const sc = document.createElement('script');
    sc.src = 'js/vendor/jsQR.js';
    sc.onload = ok;
    sc.onerror = fail;
    document.head.appendChild(sc);
  }));
  async function startScan() {
    if (scanStream) return;
    try {
      const [stream] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }), loadJsQR()]);
      scanStream = stream;
    } catch (e) { C.toast('📷 تعذّر فتح الكاميرا. اكتب الرمز بدلاً من ذلك.', 4000); return; }
    const video = $('scanVideo');
    if (!video) { stopScan(); return; }
    $('scanBox').hidden = false;
    $('scanBtn').hidden = true;
    video.srcObject = scanStream;
    video.play().catch(() => {});
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (!scanStream || !document.body.contains(video)) { stopScan(); return; }
      if (video.readyState >= 2 && video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        const m = hit && hit.data.match(/join=([0-9A-Z]{8})/i);
        if (m) { Sound.play('right'); joinWith(m[1].toUpperCase()); return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function joinWith(code) {
    stopScan();
    if (Sync.status() === 'loading') { C.toast('⏳ لحظة، جارٍ الاتصال…'); return; }
    if (Sync.status() === 'unavailable' || !navigator.onLine) { C.toast('📡 الانضمام يحتاج اتصالاً بالإنترنت'); return; }
    C.toast('⏳ جارٍ الانضمام…');
    Sync.join(code, /iPad|Tablet|Android/i.test(navigator.userAgent) ? 'تابلت' : 'جهاز').then(k => {
      pendingKid = k || null;
      Store.state.owner = k || '';
      Store.save();
      C.toast('✅ انضم الجهاز إلى العائلة');
      applyPendingKid();
      C.go('profiles', null, true);
    }).catch(e => {
      const msg = { expired: '⚠️ الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً من ولي الأمر.', 'signed-in': 'هذا الجهاز مسجّل بحساب Google بالفعل.', network: '📡 تعذّر الاتصال، تأكد من الإنترنت' }[e.message];
      // نُظهر رمز الخطأ ليسهل معرفة السبب إن تكرّر
      C.toast(msg || `⚠️ تعذّر الانضمام (${e.code || e.message || 'خطأ'})`, 5000);
    });
  }
  function applyPendingKid() {
    if (pendingKid && kid(pendingKid)) {
      Store.state.current = pendingKid;
      pendingKid = null;
      Store.save();
      return true;
    }
    return false;
  }

  // ───── الأزرار ─────
  const Actions = {
    groupOpen() {
      const p = Store.current();
      duelKind = 'race';
      duelLand = (p && p.world) || 'ar';
      duelPicks = p ? [p.id] : [];
      duelMode = 'net';
      C.go('groupSetup');
    },
    setDuelMode(m) { duelMode = m; if (m === 'net') duelPicks = duelPicks.slice(0, 1); Screens.groupSetup(); },
    setDuelKind(k) { duelKind = k; Screens.groupSetup(); },
    setDuelLand(id) { duelLand = id; Screens.groupSetup(); },
    setLayout(id) { duelLayoutId = id; Screens.groupSetup(); },
    duelPick(id) {
      if (duelPicks.includes(id)) duelPicks = duelPicks.filter(x => x !== id);
      else if (duelMode === 'net') duelPicks = [id];
      else duelPicks = [...duelPicks, id].slice(-MAX_LOCAL);
      Screens.groupSetup();
    },
    startLocal() { startLocal(duelKind); },
    startAgain() {
      if (duelMode === 'local' && duelPicks.length >= 2) startLocal(duelKind);
      else C.go('groupSetup');
    },
    netHost,
    netJoin,
    netStart,
    netShare,
    netCancel,
    exitDuel() {
      C.ask('إيقاف التحدي؟', 'لن تُحسب النتيجة.', 'إيقاف').then(ok => {
        if (!ok || !duel) return;
        abortDuel();
        Store.save();
        C.go('groupSetup');
      });
    },
    exitBrain() {
      C.ask('إيقاف اللعبة؟', 'لن تُحسب النتيجة.', 'إيقاف').then(ok => {
        if (!ok || !brain) return;
        const wasDuel = brain.duel;
        abortBrain();
        C.go(wasDuel ? 'groupSetup' : 'brainSetup');
      });
    },
    brainOpen() { C.go('brainSetup'); },
    brainToggle(id) {
      const cur = brainChoice();
      if (id === 'all') brainPicks = cur.length === Brain.GAMES.length ? [] : allBrain();
      else brainPicks = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      if (!brainPicks.length) { brainPicks = []; }
      C.nav.cur === 'groupSetup' ? Screens.groupSetup() : Screens.brainSetup();
    },
    brainStart() { startBrain(); },
    brainGo() { brainGo(); },
    brainInvite() {
      const p = Store.current();
      duelKind = 'brain';
      duelLand = p.world || 'ar';
      duelPicks = [p.id];
      C.go('groupSetup');
    },
    winnerShot(id) { winnerShot(winById(id)); },
    certShow(id) { certShow(winById(id)); },
    certPrint() { document.body.classList.add('printing-cert'); window.print(); document.body.classList.remove('printing-cert'); },
    closeShot,
    shareShot() { if (shot) navigator.share({ files: [shot.file], title: 'أبطال الإملاء' }).catch(() => {}); },
    saveShot() {
      if (!shot) return;
      const a = document.createElement('a');
      a.href = shot.url;
      a.download = shot.file.name;
      a.click();
    },
    syncIn() { Sync.signIn().catch(e => { if (e.code !== 'auth/popup-closed-by-user') C.toast('تعذّر تسجيل الدخول'); }); },
    syncOut() {
      const device = Sync.role() === 'device';
      C.ask(device ? 'فصل هذا الجهاز؟' : 'تسجيل الخروج؟', 'يبقى التقدّم محفوظاً على هذا الجهاز لكن لن يُزامَن.', 'تأكيد', true).then(ok => { if (ok) Sync.signOut(); });
    },
    pairDevice(k) {
      const { code, exp, ready } = Sync.createCode(k);
      pairing = { code, exp, kid: k, ready: false };
      refreshSync();
      const mine = () => pairing && pairing.code === code;
      ready.then(() => { if (mine()) { pairing.ready = true; refreshSync(); } })
        .catch(() => { if (mine()) { pairing = null; refreshSync(); C.toast('⚠️ تعذّر إنشاء الرمز. تأكد من الإنترنت.'); } });
      setTimeout(() => { if (mine()) { pairing = null; refreshSync(); } }, exp - Date.now() + 500);
    },
    cancelPair() { pairing = null; refreshSync(); },
    setOwner(id) { Store.state.owner = id || ''; Store.save(); refreshSync(); },
    removeDevice(id) {
      C.ask('فصل هذا الجهاز؟', 'لن يستطيع الوصول إلى بيانات العائلة بعد ذلك.', 'فصل', true).then(ok => {
        if (ok) Sync.removeDevice(id).then(() => C.toast('تم فصل الجهاز')).catch(() => C.toast('⚠️ تعذّر فصل الجهاز'));
      });
    },
    joinFamily() {
      const code = ($('joinInput').value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (code.length !== 8) { C.toast('الرمز 8 أحرف وأرقام ✏️'); $('joinInput').focus(); return; }
      joinWith(code);
    },
    scanJoin() { startScan(); },
  };

  function install(ctx) {
    C = ctx;
    Object.assign(C.Screens, Screens);
    Object.assign(C.Actions, Actions);
    inviteBar.className = 'invite-bar';
    inviteBar.hidden = true;
    document.body.appendChild(inviteBar);
    inviteBar.addEventListener('click', e => {
      const d = Sync.duel.data();
      if (e.target.closest('[data-invite=join]') && inviteFor(d)) { inviteBar.hidden = true; C.nav.cur = 'netJoin'; Screens.netJoin(d); }
      else if (e.target.closest('[data-invite=no]')) { inviteBar.dataset.dismissed = d ? d.id : ''; inviteBar.hidden = true; }
    });
    document.addEventListener('click', e => {
      const key = e.target.closest('[data-dkey]');
      if (key) { typeKey(key.dataset.dkey); return; }
      const tile = e.target.closest('[data-dtile]');
      if (tile) { const [i, k] = tile.dataset.dtile.split(':').map(Number); tapTile(i, k); return; }
      const back = e.target.closest('[data-dback]');
      if (back) { tapBack(Number(back.dataset.dback)); return; }
      const ch = e.target.closest('[data-dchoice]');
      if (ch) { const [i, k] = ch.dataset.dchoice.split(':').map(Number); tapChoice(i, k, ch); return; }
      const bt = e.target.closest('[data-bt]');
      if (bt && !bt.disabled) { const [i, k] = bt.dataset.bt.split(':'); brainTap(Number(i), k, bt); }
    });
    // لوحة مفاتيح اللابتوب في الكتابة على عدة أجهزة
    document.addEventListener('keydown', e => {
      if (!duel || !duel.net || !$('modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = duel.sides[0];
      if (!s.q || s.locked || s.q.stage !== 'write') return;
      if (e.key === 'Enter') { e.preventDefault(); typeKey('ok'); } else if (e.key === 'Backspace') { e.preventDefault(); typeKey('del'); } else if (e.key.length === 1) { e.preventDefault(); typeKey(e.key); }
    });
    Sync.duel.on(onDuelDoc);
    Sync.online.on(refreshOnline);
    Sync.onUpdate(changed => {
      if (!beat.done && Sync.duel.ready()) { beat.done = true; beat(); }
      // صاحب الجهاز: جهاز انضم قبل هذا الإصدار يأخذه من سجلّه، والجهاز المفصول يعود جهازاً عادياً
      const mk = Sync.memberKid();
      if (Sync.role() === 'device' && mk && !Store.state.owner) { Store.state.owner = mk; Store.save(); }
      if (Sync.status() === 'out' && Store.state.owner) { Store.state.owner = ''; Store.save(); }
      refreshSync();
      if (C.nav.cur === 'groupSetup' && !busy() && !document.querySelector('.group-results') && !changed) {
        const btn = document.querySelector('[data-act=netHost]');
        if (btn) btn.disabled = !(duelPicks.length === 1 && Sync.duel.ready() && (duelKind !== 'brain' || brainChoice().length));
      }
      if (!changed || busy()) return;
      const hadKid = applyPendingKid();
      if (hadKid && C.nav.cur === 'profiles') { C.go('camp', null, true); return; }
      // لا نعيد الرسم أثناء الكتابة في نموذج
      if (['profiles', 'camp', 'free', 'heroes', 'shop', 'map'].includes(C.nav.cur) && !document.querySelector('.group-results')) {
        const y = window.scrollY;
        C.redraw();
        window.scrollTo(0, y);
      }
    });
    setInterval(() => { beat(); refreshOnline(); }, 30 * 1000);
    setInterval(() => { if (netPending && document.querySelector('.net-wait')) Sync.duel.refresh(); }, 4000);
    document.addEventListener('visibilitychange', () => {
      beat();
      if (document.visibilityState === 'visible' && netPending && document.querySelector('.net-wait')) Sync.duel.refresh();
    });
    window.addEventListener('hashchange', fromHash);
    Sync.start();
  }

  return {
    install, fromHash, syncCard,
    active: () => !!(duel || brain),
    exit: () => (duel ? Actions.exitDuel() : Actions.exitBrain()),
    groupBtn: () => (Store.state.profiles.length < 2 ? '' : `<button class="group-btn" data-act="groupOpen">
      <span class="group-icon">🤝</span><span class="group-info"><b>العب مع إخوتك</b><small>${Object.values(KINDS).map(x => `${x.icon} ${x.name}`).join(' · ')}</small></span><span>‹</span></button>`),
  };
})();
