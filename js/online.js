// جلب معنى الكلمة وإيموجي مناسب من الإنترنت حين لا يجدهما القاموس المحلي
const Online = (() => {
  const TR = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t';
  const EMOJI_DATA = 'https://cdn.jsdelivr.net/npm/emojibase-data@15.3.2/en/compact.json';
  let emojiList = null;   // تُحمَّل مرة واحدة عند أول حاجة

  async function translate(text, from, to) {
    const res = await fetch(`${TR}&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error('net');
    const j = await res.json();
    return (j[0] || []).map(x => x[0]).join('').trim();
  }

  async function loadEmoji() {
    if (!emojiList) {
      const res = await fetch(EMOJI_DATA);
      if (!res.ok) throw new Error('net');
      emojiList = (await res.json()).filter(x => x.group !== 2 && x.group !== 9);
    }
    return emojiList;
  }

  // أقرب إيموجي لكلمة إنجليزية: القائمة المحلية أولاً، ثم مطابقة الاسم أو الوسوم
  async function emojiFor(en) {
    const w = String(en || '').toLowerCase().trim();
    if (!w) return '';
    const words = w.split(/\s+/);
    for (const k of [w, words[words.length - 1], w.replace(/(es|s)$/, '')]) if (EMOJI[k]) return EMOJI[k];
    const list = await loadEmoji();
    const keys = [w, w.replace(/(es|s)$/, '')];
    let best = null, top = 0;
    for (const x of list) {
      const label = x.label.toLowerCase();
      const parts = label.split(/[\s:,]+/);
      let s = 0;
      for (const k of keys) {
        if (label === k) s = Math.max(s, 100);
        else if ((x.tags || []).includes(k)) s = Math.max(s, 60);
        else if (parts[parts.length - 1] === k) s = Math.max(s, 55);
      }
      if (!s) continue;
      if (x.group === 1) s -= 20;       // الأشخاص والأيدي أضعف دلالة على الأشياء
      s -= label.length / 10;
      if (s > top) { top = s; best = x; }
    }
    return best ? best.unicode : '';
  }

  // يكمل المعنى والإيموجي الناقصين لكلمة: { h, e } بحسب ما وُجد
  async function complete(w) {
    const lang = w.lang || Engine.detectLang(w.t);
    const out = {};
    let en = lang === 'en' ? w.t : '';
    if (!w.m) {
      out.h = lang === 'en' ? await translate(w.t, 'en', 'ar') : await translate(w.t, 'ar', 'en');
      if (lang === 'ar') en = out.h;
    } else if (lang === 'ar') en = w.m;
    if (!w.e && en) out.e = await emojiFor(en);
    if (out.h && out.h.toLowerCase() === String(w.t).toLowerCase()) delete out.h;   // لم تُترجم
    return out;
  }

  // يكمل كلمات القائمة الناقصة ويعيد عدد ما اكتمل
  async function fillList(l, onlyTexts) {
    let n = 0;
    const words = Engine.listWords(l);
    for (let i = 0; i < l.words.length; i++) {
      const x = l.words[i];
      const w = words[i];
      if (onlyTexts && !onlyTexts.includes(x.t)) continue;
      if (w.m && w.e) continue;
      try {
        const got = await complete(w);
        if (got.h && !x.h) x.h = got.h;
        if (got.e && !x.e) x.e = got.e;
        if (got.h || got.e) n++;
      } catch (e) { if (!navigator.onLine) break; }
    }
    if (n) Store.save();
    return n;
  }

  return { translate, emojiFor, complete, fillList };
})();
