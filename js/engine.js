// محرك الإملاء: الكلمات، مقارنة الإجابات، اختيار الكلمة حسب نقاط ضعف الطفل، الإتقان وفتح المناطق، ورحلة اليوم
const Engine = (() => {
  const HARAKAT = /[ً-ْٰـ]/g;
  const S = () => Store.state.settings;
  const shuffle = a => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const any = a => a[Math.floor(Math.random() * a.length)];
  const detectLang = s => (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s) ? 'ar' : 'en');
  const strip = s => String(s).replace(HARAKAT, '');
  const letters = t => Array.from(strip(t).replace(/\s+/g, ''));

  function normalize(s, lang) {
    s = String(s).trim().replace(/\s+/g, ' ');
    if (lang === 'ar') {
      if (S().ignoreTashkeel) s = strip(s);
      if (S().lenientHamza) s = s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
    } else if (!S().strictCase) s = s.toLowerCase();
    return s;
  }
  const same = (user, word) => normalize(user, word.lang) === normalize(word.t, word.lang);

  // هل تكفي لوحة المفاتيح لكتابة هذه الكلمة؟ وإلا فتبقى في ترتيب الحروف
  const KEYS_AR = /^[ء-يًٌٍَُِّْ\s]+$/;
  const KEYS_EN = /^[A-Za-z'\-\s]+$/;
  const keyable = w => (w.lang === 'ar' ? KEYS_AR : KEYS_EN).test(w.t);

  // محاذاة ما كتبه الطفل مع الكلمة الصحيحة: أين أخطأ بالضبط؟
  function align(user, word) {
    const a = Array.from(normalize(user, word.lang));
    const b = Array.from(normalize(word.t, word.lang));
    const shown = Array.from(word.lang === 'ar' && S().ignoreTashkeel ? strip(word.t) : word.t.trim().replace(/\s+/g, ' '));
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    const ops = [];
    let i = a.length, j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) { ops.unshift({ c: shown[j - 1] || b[j - 1], k: 'ok' }); i--; j--; }
      else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.unshift({ c: shown[j - 1] || b[j - 1], u: a[i - 1], k: 'sub' }); i--; j--; }
      else if (j > 0 && d[i][j] === d[i][j - 1] + 1) { ops.unshift({ c: shown[j - 1] || b[j - 1], k: 'miss' }); j--; }
      else { ops.unshift({ c: a[i - 1], k: 'extra' }); i--; }
    }
    return { ops, dist: d[a.length][b.length] };
  }

  // ───── الكلمات ─────
  const parse = (str, r, src, lang) => {
    const [t, e, m] = str.split('|');
    return { t, e: e || '', m: m || '', lang, src, tip: r.tip, focus: r.focus || '', region: r.id };
  };
  const world = id => WORLDS.find(w => w.id === id);
  const regionWords = (w, r) => r.words.map(x => parse(x, r, w, w === 'ar' ? 'ar' : 'en'));

  // فهرس الكلمات: يترجم كلمات الوضع الحر ويعطيها رمزها إن وُجدت في الخطط أو القاموس
  const INDEX = {};
  WORLDS.forEach(w => w.regions.forEach(r => regionWords(w.id, r).forEach(x => {
    INDEX[strip(x.t).toLowerCase()] = { e: x.e, m: x.m };
    if (!x.m.includes(' ')) { const k = x.m.toLowerCase(); if (!INDEX[k]) INDEX[k] = { e: x.e, m: x.t }; }
  })));
  Object.keys(DICT).forEach(k => {
    if (!INDEX[k]) INDEX[k] = { e: '', m: DICT[k] };
    const ar = strip(DICT[k]);
    if (!INDEX[ar]) INDEX[ar] = { e: '', m: k };
  });
  const lookup = t => INDEX[strip(String(t).trim()).toLowerCase()] || null;

  const listWord = (l, x) => {
    const found = lookup(x.t);
    return { t: x.t, e: x.e || (found && found.e) || '', m: x.h || (found && found.m) || '', lang: x.lang || detectLang(x.t),
      src: 'list:' + l.id, tip: '', focus: '', region: l.id };
  };
  const listWords = l => l.words.map(x => listWord(l, x));
  const chunks = l => {
    const all = listWords(l);
    if (!l.chunk || all.length <= l.chunk) return [all];
    const out = [];
    for (let i = 0; i < all.length; i += l.chunk) out.push(all.slice(i, i + l.chunk));
    return out;
  };
  function findWord(src, t) {
    if (src.startsWith('list:')) {
      const l = Store.list(src.slice(5));
      const x = l && l.words.find(w => w.t === t);
      return x ? listWord(l, x) : null;
    }
    const w = world(src);
    for (const r of w.regions) {
      const hit = regionWords(src, r).find(x => x.t === t);
      if (hit) return hit;
    }
    return null;
  }

  // ───── التقدم ─────
  function state(p, src) {
    if (src.startsWith('list:')) {
      const id = src.slice(5);
      p.free = p.free || {};
      return p.free[id] || (p.free[id] = { facts: {}, bestRace: 0, examBest: null });
    }
    p.worlds = p.worlds || {};
    return p.worlds[src] || (p.worlds[src] = { unlocked: 1, animals: [], facts: {}, bestRace: 0, examBest: null });
  }
  const fact = (p, word) => {
    const f = state(p, word.src).facts;
    return f[word.t] || (f[word.t] = { box: 0, seen: 0, right: 0, wrong: 0 });
  };
  const peekBox = (p, word) => { const f = state(p, word.src).facts[word.t]; return f ? f.box : 0; };
  const mastery = (p, words) => (words.length ? words.filter(w => peekBox(p, w) >= CONFIG.masteredBox).length / words.length : 0);
  const current = p => world(p.world) || WORLDS[0];

  // السلّم التدريجي لكل كلمة: رتّب الحروف ← أكمل الناقص ← اكتبها وحدك
  function stageFor(p, word, mode) {
    const box = peekBox(p, word);
    if (!keyable(word)) return letters(word.t).length < 2 ? 'tile' : (box >= 1 ? 'fill' : 'tile');
    if (mode === 'exam' || mode === 'review' || mode === 'retry') return 'write';
    const n = letters(word.t).length;
    if (box <= 0) return n >= 2 ? 'tile' : 'write';
    if (box === 1) return n >= 2 ? 'fill' : 'write';
    return 'write';
  }

  function record(p, q, ok, helped) {
    const f = fact(p, q.word);
    f.seen++;
    f.last = Date.now();
    if (ok) {
      f.right++;
      if (!helped) {
        if (q.stage === 'write') f.box = Math.min(CONFIG.maxBox, Math.max(f.box + 1, CONFIG.masteredBox));
        else if (q.stage === 'fill') f.box = Math.max(f.box, 2);
        else f.box = Math.max(f.box, 1);
      }
    } else {
      f.wrong++;
      f.box = Math.max(0, f.box - 1);
    }
  }

  // اختيار الكلمة: الأضعف لها فرصة أكبر، ولا تتكرر الكلمة مرتين متتاليتين
  function pick(p, pool, lastT) {
    const cands = pool.length > 1 ? pool.filter(w => w.t !== lastT) : pool;
    const weights = cands.map(w => {
      const f = state(p, w.src).facts[w.t];
      return (CONFIG.maxBox + 1 - (f ? f.box : 0)) ** 2 + (!f || !f.seen ? 4 : 0);
    });
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cands.length; i++) { x -= weights[i]; if (x <= 0) return cands[i]; }
    return cands[cands.length - 1];
  }

  // حروف السؤال: كلمة ناقصة حرفاً مع خيارات متشابهة
  function fillData(word) {
    const ls = letters(word.t);
    let idx = ls.map((c, i) => (word.focus.includes(c) ? i : -1)).filter(i => i >= 0);
    if (word.lang === 'ar' && /^ال/.test(ls.join('')) && word.focus === 'ل') idx = [1];
    if (!idx.length) idx = ls.map((_, i) => i).filter(i => ls.length < 3 || i > 0);
    const at = any(idx);
    const right = ls[at];
    const lower = right.toLowerCase();
    const set = new Set(Array.from(CONFUSE[lower] || CONFUSE[right] || ''));
    set.delete(right); set.delete(lower);
    const fallback = word.lang === 'ar' ? 'بتثجحدرزسشعفقكلمنهوي' : 'abcdefgilmnoprstuvy';
    let extra = shuffle(Array.from(fallback)).filter(c => c !== lower && c !== right);
    while (set.size < 3 && extra.length) set.add(extra.shift());
    const wrong = shuffle(Array.from(set)).slice(0, 3);
    return { at, right, ls, choices: shuffle([right, ...wrong]) };
  }

  // حروف الترتيب: حروف الكلمة مخلوطة، ومعها حرفان مشتِّتان
  function tileData(word, distract) {
    const ls = letters(word.t);
    const extra = [];
    if (distract) {
      const pool = Array.from(new Set(ls.flatMap(c => Array.from(CONFUSE[c.toLowerCase()] || CONFUSE[c] || '')))).filter(c => !ls.includes(c));
      extra.push(...shuffle(pool).slice(0, Math.min(2, Math.ceil(ls.length / 3))));
    }
    let tiles = shuffle([...ls, ...extra]);
    if (!extra.length && ls.length > 1 && tiles.join('') === ls.join('')) tiles = tiles.slice().reverse();
    return { ls, tiles };
  }

  // ───── المناطق والأحداث ─────
  function progress(p) {
    const events = [];
    WORLDS.forEach(w => {
      const st = state(p, w.id);
      w.regions.forEach((r, i) => {
        if (i >= st.unlocked) return;
        if (mastery(p, regionWords(w.id, r)) < CONFIG.unlockAt) return;
        if (!st.animals.includes(r.id)) {
          st.animals.push(r.id);
          p.coins += COINS.animal;
          events.push({ type: 'animal', region: r, world: w });
        }
        if (i + 1 === st.unlocked && st.unlocked < w.regions.length) {
          st.unlocked++;
          p.coins += COINS.unlock;
          events.push({ type: 'unlock', region: w.regions[i + 1], world: w });
        }
      });
    });
    return events;
  }

  // ───── رحلة اليوم ─────
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function today(p) {
    p.days = p.days || {};
    const k = dayKey();
    if (!p.days[k]) {
      p.days[k] = { secs: 0, asked: 0, right: 0, done: {}, mistakes: [], chest: false };
      const keys = Object.keys(p.days).sort();
      keys.slice(0, Math.max(0, keys.length - 90)).forEach(x => delete p.days[x]);
    }
    return p.days[k];
  }
  function streak(p) {
    const days = p.days || {};
    const played = k => days[k] && days[k].asked > 0;
    const d = new Date();
    if (!played(dayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (played(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function addAnswer(p, q, ok, ms, given) {
    const t = today(p);
    t.secs += Math.min(ms, CONFIG.idleCapMs) / 1000;
    t.asked++;
    if (ok) t.right++;
    else if (!t.mistakes.some(m => m.src === q.word.src && m.t === q.word.t)) t.mistakes.push({ src: q.word.src, t: q.word.t, given: given || '' });
  }
  const clearMistake = (p, word) => {
    const t = today(p);
    t.mistakes = t.mistakes.filter(m => !(m.src === word.src && m.t === word.t));
  };
  const reviewWords = p => today(p).mistakes.map(m => findWord(m.src, m.t)).filter(Boolean);
  const STATIONS = [
    { id: 'warmup', icon: '🏕️', name: 'الإحماء', desc: 'خمس كلمات خفيفة' },
    { id: 'review', icon: '📝', name: 'المراجعة', desc: 'كلمات أخطأت فيها' },
    { id: 'race', icon: '🏃', name: 'السباق', desc: 'تحدَّ نفسك' },
  ];
  // المراجعة تُحسب منجزة إذا لم يكن هناك أخطاء: لا نطلب من الطفل محطة فارغة
  const stationDone = (p, id) => !!today(p).done[id] || (id === 'review' && !!today(p).done.warmup && !today(p).mistakes.length);
  const nextStation = p => STATIONS.find(s => !stationDone(p, s.id)) || null;
  const chestReady = p => !today(p).chest && STATIONS.every(s => stationDone(p, s.id));
  function openChest(p) {
    const t = today(p);
    t.chest = true;
    const left = RARE_ITEMS.filter(i => !p.items.includes(i.id));
    const reward = { coins: COINS.chestMin + Math.floor(Math.random() * (COINS.chestMax - COINS.chestMin + 1)), item: null };
    if (left.length && Math.random() < CONFIG.chestRareChance) {
      reward.item = any(left);
      p.items.push(reward.item.id);
    }
    p.coins += reward.coins;
    return reward;
  }

  // ───── الإحصاءات ─────
  function allFacts(p) {
    const out = [];
    Object.entries(p.worlds || {}).forEach(([src, st]) => Object.entries(st.facts).forEach(([t, f]) => out.push({ src, t, f })));
    Object.entries(p.free || {}).forEach(([id, st]) => Object.entries(st.facts).forEach(([t, f]) => out.push({ src: 'list:' + id, t, f })));
    return out;
  }
  function stats(p) {
    const facts = allFacts(p);
    const best = Math.max(0, ...WORLDS.map(w => state(p, w.id).bestRace));
    const worldDone = id => state(p, id).animals.length >= world(id).regions.length;
    return {
      mastered: facts.filter(x => x.f.box >= CONFIG.masteredBox).length,
      seen: facts.filter(x => x.f.seen > 0).length,
      right: facts.reduce((n, x) => n + x.f.right, 0),
      wrong: facts.reduce((n, x) => n + x.f.wrong, 0),
      streak: streak(p), best,
      perfect: p.perfect || 0, examPerfect: p.examPerfect || 0, freeRounds: p.freeRounds || 0,
      arDone: worldDone('ar'), enDone: worldDone('en'),
      secs: Object.values(p.days || {}).reduce((n, d) => n + (d.secs || 0), 0),
    };
  }
  const tricky = (p, n = 8) => allFacts(p)
    .filter(x => x.f.wrong > 0 && x.f.box < CONFIG.masteredBox)
    .sort((a, b) => b.f.wrong - a.f.wrong)
    .map(x => findWord(x.src, x.t)).filter(Boolean).slice(0, n);
  const rankFor = best => RANKS.filter(r => best >= r.min).pop();
  const raceGoal = best => Math.max(8, best + 2);
  const racePool = (p, id) => {
    const w = world(id);
    return w.regions.slice(0, state(p, id).unlocked).flatMap(r => regionWords(id, r));
  };

  return {
    shuffle, any, detectLang, strip, letters, normalize, same, keyable, align,
    world, regionWords, lookup, listWords, chunks, findWord,
    state, fact, peekBox, mastery, current, stageFor, record, pick, fillData, tileData, progress,
    today, streak, addAnswer, clearMistake, reviewWords, STATIONS, stationDone, nextStation, chestReady, openChest,
    stats, tricky, rankFor, raceGoal, racePool,
  };
})();
