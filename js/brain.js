// تحدّي العقل: ثماني ألعاب إملاء قصيرة يختار الطفل منها ما يريد، تُبنى من الكلمات التي وصل إليها
// كل لعبة تصعب مع الإجابات الصحيحة وتسهل مع الخطأ، والمستوى من 1 إلى 5
const Brain = (() => {
  const { shuffle, any, letters, strip, lookup, same } = Engine;
  const SECONDS = 60;        // مدة كل لعبة
  const DUEL_SECONDS = 45;   // مدة كل لعبة في مبارزة العقول
  const MAX_LV = 5;

  // pts = نقاط كل إجابة صحيحة لكل مستوى (اللعبة الأبطأ تعطي أكثر حتى تتقارب النتائج)
  const GAMES = [
    { id: 'cmp', icon: '⚖️', name: 'أيّهما صحيح؟', how: 'اضغط الكفّة التي كلمتها مكتوبة صحيحاً', pts: 6 },
    { id: 'pick', icon: '🧺', name: 'اجمع الصحيحة', how: 'اضغط كل البطاقات المكتوبة صحيحاً', pts: 15 },
    { id: 'arr', icon: '👀', name: 'عين الصقر', how: 'انظر إلى الكلمة قبل أن تختفي، ثم اختر كتابتها', pts: 10 },
    { id: 'miss', icon: '🐒', name: 'القرد الناقص', how: 'خبّأ القرد حرفاً من الكلمة. ما هو؟', pts: 10 },
    { id: 'tf', icon: '🪨', name: 'صحّ أم خطأ؟', how: 'هل الكلمة على الصخرة مكتوبة صحيحاً؟', pts: 4 },
    { id: 'seq', icon: '🐾', name: 'تتبّع الأثر', how: 'ما الحرف الذي يأتي بعد آثار الكلمة؟', pts: 10 },
    { id: 'pair', icon: '🔗', name: 'الأزواج', how: 'صِل كل صورة بكلمتها', pts: 12 },
    { id: 'ord', icon: '🔤', name: 'رتّب الحروف', how: 'اضغط حروف الكلمة بالترتيب الصحيح', pts: 12 },
  ];
  const game = id => GAMES.find(G => G.id === id) || GAMES[0];
  const pickGames = (ids = GAMES.map(G => G.id)) => shuffle(ids.filter(id => GAMES.some(G => G.id === id)));

  // ما يُحفظ لكل خطة أو قائمة: أفضل نتيجة، وآخر مستوى وصل إليه في كل لعبة
  function state(p, src) {
    const s = Engine.state(p, src);
    return s.brain || (s.brain = { best: 0, lv: {} });
  }

  const plain = w => strip(w.t).trim();

  // كتابة خاطئة للكلمة: تصغر الفروق مع ارتفاع المستوى، حتى لا يبقى إلا الحرف المتشابه
  function misspell(w, lv) {
    const base = Array.from(plain(w));
    const spots = base.map((c, i) => (c === ' ' ? -1 : i)).filter(i => i >= 0);
    const focus = spots.filter(i => w.focus && w.focus.includes(base[i]));
    const confuse = c => Array.from(CONFUSE[c.toLowerCase()] || CONFUSE[c] || '');
    const sub = a => {
      const opts = (focus.length ? focus : spots).filter(i => confuse(base[i]).length);
      if (!opts.length) return a;
      const i = any(opts);
      const r = a.slice();
      r[i] = any(confuse(base[i]));
      return r;
    };
    const del = a => { if (a.length < 4) return a; const r = a.slice(); r.splice(any(spots), 1); return r; };
    const dup = a => { const r = a.slice(); const i = any(spots); r.splice(i, 0, a[i]); return r; };
    const swap = a => {
      const r = a.slice();
      const i = Math.floor(Math.random() * Math.max(1, a.length - 1));
      if (r[i + 1] === undefined || r[i] === r[i + 1] || r[i] === ' ' || r[i + 1] === ' ') return a;
      [r[i], r[i + 1]] = [r[i + 1], r[i]];
      return r;
    };
    for (let t = 0; t < 30; t++) {
      let r = base;
      if (lv >= 3) r = sub(base);
      else if (lv === 2) r = any([sub, sub, swap, del])(base);
      else r = any([del, dup, swap, a => sub(sub(a))])(base);
      const s = r.join('');
      if (s && s !== base.join('') && !same(s, w) && !lookup(s)) return s;
    }
    // كلمة قصيرة بلا بديل مناسب: حرف مكرر
    return dup(base).join('');
  }
  // كتابات خاطئة مختلفة للكلمة نفسها
  function wrongs(w, lv, n) {
    const out = new Set();
    for (let t = 0; t < 40 && out.size < n; t++) out.add(misspell(w, t > 20 ? 1 : lv));
    return Array.from(out);
  }

  // الأقصر أولاً: المستويات الأولى من الكلمات القصيرة، ثم تتسع إلى كل الكلمات
  function wordFor(P, lv) {
    const list = P.slice().sort((a, b) => letters(a.t).length - letters(b.t).length);
    return any(list.slice(0, Math.max(2, Math.ceil(list.length * (0.4 + lv * 0.12)))));
  }
  const manyWords = (P, lv, n) => {
    const out = [];
    for (let t = 0; t < 60 && out.length < n; t++) {
      const w = wordFor(P, Math.max(lv, 3));
      if (!out.includes(w)) out.push(w);
    }
    return out;
  };

  const make = {
    cmp(P, lv) {
      const w = wordFor(P, lv);
      return { w, options: shuffle([{ s: plain(w), ok: true }, { s: misspell(w, lv), ok: false }]) };
    },
    pick(P, lv, cap = 8) {
      const n = Math.max(2, Math.floor(cap / 3));
      const words = manyWords(P, lv, cap);
      const cards = [];
      for (let i = 0; i < cap; i++) {
        const w = words[i % words.length];
        cards.push(i < n ? { w, s: plain(w), ok: true } : { w, s: misspell(w, lv), ok: false });
      }
      return { cards: shuffle(cards), need: n };
    },
    arr(P, lv) {
      const w = wordFor(P, lv);
      const options = shuffle([{ s: plain(w), ok: true }, ...wrongs(w, lv, 3).map(s => ({ s, ok: false }))]);
      return { w, options, flash: [2200, 1800, 1500, 1200, 900][lv - 1] };
    },
    miss(P, lv) {
      const w = wordFor(P, lv);
      return { w, ...Engine.fillData(w) };
    },
    tf(P, lv) {
      const w = wordFor(P, lv);
      const isRight = Math.random() < 0.5;
      return { w, s: isRight ? plain(w) : misspell(w, lv), isRight };
    },
    seq(P, lv) {
      const long = P.filter(x => letters(x.t).length >= 3);
      const w = wordFor(long.length ? long : P, lv);
      const ls = letters(w.t);
      const k = 1 + Math.floor(Math.random() * Math.max(1, ls.length - 1));
      const right = ls[Math.min(k, ls.length - 1)];
      const pool = new Set(Array.from(CONFUSE[right.toLowerCase()] || CONFUSE[right] || ''));
      pool.delete(right);
      const fallback = shuffle(Array.from(w.lang === 'ar' ? 'بتجدرسعفقلمنهو' : 'abdegilmnoprstu')).filter(c => c !== right);
      while (pool.size < 3 && fallback.length) pool.add(fallback.shift());
      return { w, prefix: ls.slice(0, k).join(''), right, options: shuffle([right, ...shuffle(Array.from(pool)).slice(0, 3)]) };
    },
    // تحتاج كلمات لها صورة أو معنى، وإلا تحل محلها «أيّهما صحيح؟»
    pair(P, lv) {
      const usable = P.filter(x => x.e || x.m);
      const seen = new Set();
      const pool = shuffle(usable).filter(x => {
        const key = `${x.e}|${x.m}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const n = lv >= 3 ? 4 : 3;
      if (pool.length < 2) return null;
      const words = pool.slice(0, n);
      return {
        left: shuffle(words.map((w, id) => ({ id, w }))),
        right: shuffle(words.map((w, id) => ({ id, w }))),
      };
    },
    ord(P, lv) {
      const long = P.filter(x => letters(x.t).length >= 3);
      const w = wordFor(long.length ? long : P, lv);
      const ls = letters(w.t);
      let tiles = shuffle(ls.slice());
      if (tiles.join('') === ls.join('') && ls.length > 1) tiles = tiles.reverse();
      return { w, ls, tiles };
    },
  };

  function step(g, ok) {
    if (ok) {
      g.right++;
      g.points += g.lv * game(g.id).pts;
      if (++g.streak >= 2) { g.lv = Math.min(MAX_LV, g.lv + 1); g.streak = 0; }
    } else {
      g.wrong++;
      g.streak = 0;
      g.lv = Math.max(1, g.lv - 1);
    }
    g.top = Math.max(g.top, g.lv);
  }

  // حدود الأوسمة للعبة من 60 ثانية
  const medal = pts => (pts >= 400 ? '🥇' : pts >= 240 ? '🥈' : pts >= 110 ? '🥉' : '🎖️');

  return { SECONDS, DUEL_SECONDS, GAMES, game, pickGames, state, plain, misspell, wrongs, make, step, medal };
})();
