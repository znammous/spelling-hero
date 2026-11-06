// حفظ ملفات الأطفال وقوائم الكلمات على الجهاز نفسه
const Store = (() => {
  const KEY = 'spelling-hero-v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const blank = () => ({ profiles: [], current: null, lists: [], wins: [], deleted: {}, settings: Object.assign({}, DEFAULT_SETTINGS), settingsAt: 0, pin: '', muted: false, linked: false });
  let lastSaved = {};
  let onSave = () => {};
  const snap = x => JSON.stringify(Object.assign({}, x, { updatedAt: 0 }));
  const shared = st => JSON.stringify([st.settings, st.pin]);
  function remember(st) {
    lastSaved = { '@settings': shared(st) };
    st.profiles.forEach(p => { lastSaved[p.id] = snap(p); });
    st.lists.forEach(l => { lastSaved[l.id] = snap(l); });
  }

  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.profiles)) {
        s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings);
        s.lists = s.lists || [];
        s.wins = s.wins || [];
        s.deleted = s.deleted || {};
        s.settingsAt = s.settingsAt || 0;
        s.profiles.forEach(p => { p.updatedAt = p.updatedAt || p.created || 0; });
        s.lists.forEach(l => { l.updatedAt = l.updatedAt || l.created || 0; });
        return s;
      }
    } catch (e) { /* ملف تالف: نبدأ من جديد */ }
    return blank();
  }

  const write = () => {
    try { localStorage.setItem(KEY, JSON.stringify(api.state)); return true; } catch (e) { return false; }
  };
  const api = {
    state: read(),
    uid,
    // يختم وقت التعديل على كل ما تغيّر منذ آخر حفظ، ثم يحفظ ويُعلم المزامنة
    save() {
      const st = api.state;
      const now = Date.now();
      let changed = false;
      st.profiles.concat(st.lists).forEach(x => {
        const v = snap(x);
        if (v !== lastSaved[x.id]) { x.updatedAt = now; lastSaved[x.id] = v; changed = true; }
      });
      const v = shared(st);
      if (v !== lastSaved['@settings']) { st.settingsAt = now; lastSaved['@settings'] = v; changed = true; }
      const ok = write();
      if (changed) onSave();
      return ok;
    },
    onSave(fn) { onSave = fn; },
    // ما يُرفع للسحابة: الأبطال والقوائم والفائزون والإعدادات (الصوت والبطل الحالي خاصّان بكل جهاز)
    exportData() {
      const st = api.state;
      return { profiles: st.profiles, lists: st.lists, wins: st.wins, settings: st.settings, pin: st.pin, settingsAt: st.settingsAt, deleted: st.deleted };
    },
    // يدمج نسخة السحابة مع نسخة الجهاز: الأحدث تعديلاً يفوز لكل بطل وكل قائمة.
    // يعيد { changed: تغيّر شيء هنا، push: عند هذا الجهاز ما ليس في السحابة }
    merge(remote) {
      const st = api.state;
      const now = Date.now();
      let changed = false, push = false;
      const rProfiles = remote.profiles || [];
      const rLists = remote.lists || [];
      const rDeleted = remote.deleted || {};
      const progress = p => Object.values(Object.assign({}, p.worlds, p.free))
        .reduce((n, w) => n + Object.values(w.facts || {}).reduce((m, f) => m + (f.seen || 0), 0), 0);

      // أول ربط لهذا الجهاز: بطل بنفس الاسم على الجهازين يصبح واحداً، ويبقى صاحب التقدّم الأكبر
      if (!st.linked) {
        st.profiles.forEach(p => {
          if (rProfiles.some(r => r.id === p.id)) return;
          const twin = rProfiles.find(r => r.name.trim() === p.name.trim() && !(rDeleted[r.id] >= r.updatedAt));
          if (!twin) return;
          if (progress(p) > progress(twin)) { rDeleted[twin.id] = now; p.updatedAt = now; }
          else st.deleted[p.id] = now;
        });
        st.linked = true;
        changed = true;
      }

      Object.keys(rDeleted).forEach(id => {
        if (!(st.deleted[id] >= rDeleted[id])) { st.deleted[id] = rDeleted[id]; changed = true; }
      });
      Object.keys(st.deleted).forEach(id => { if (!(rDeleted[id] >= st.deleted[id])) push = true; });

      [[rProfiles, 'profiles'], [rLists, 'lists']].forEach(([rows, key]) => {
        rows.forEach(r => {
          const local = st[key].find(x => x.id === r.id);
          if (!local) { st[key].push(r); changed = true; }
          else if (r.updatedAt > local.updatedAt) {
            // نعدّل الكائن نفسه حتى تبقى أي إشارة إليه في اللعبة صحيحة
            Object.keys(local).forEach(k => delete local[k]);
            Object.assign(local, r);
            changed = true;
          } else if (local.updatedAt > r.updatedAt) push = true;
        });
        const before = st[key].length;
        st[key] = st[key].filter(x => !(st.deleted[x.id] >= x.updatedAt));
        if (st[key].length !== before) changed = true;
        st[key].forEach(x => { if (!rows.some(r => r.id === x.id)) push = true; });
      });
      if (st.current && !api.current()) st.current = null;

      const rWins = remote.wins || [];
      rWins.forEach(w => { if (!st.wins.some(x => x.id === w.id)) { st.wins.push(w); changed = true; } });
      st.wins.forEach(w => { if (!rWins.some(x => x.id === w.id)) push = true; });
      st.wins.sort((a, b) => a.at - b.at);
      st.wins = st.wins.slice(-MAX_WINS);

      if ((remote.settingsAt || 0) > st.settingsAt) {
        st.settings = Object.assign({}, DEFAULT_SETTINGS, remote.settings);
        st.pin = remote.pin || '';
        st.settingsAt = remote.settingsAt;
        changed = true;
      } else if (st.settingsAt > (remote.settingsAt || 0)) push = true;

      if (changed) { remember(st); write(); }
      return { changed, push };
    },
    current() { return api.state.profiles.find(p => p.id === api.state.current) || null; },
    addProfile(name, avatar) {
      const p = {
        id: uid(), name, avatar, coins: 0, items: [], world: 'ar', worlds: {}, free: {},
        days: {}, perfect: 0, examPerfect: 0, freeRounds: 0, created: Date.now(), updatedAt: 0,
      };
      api.state.profiles.push(p);
      api.state.current = p.id;
      api.save();
      return p;
    },
    removeProfile(id) {
      api.state.profiles = api.state.profiles.filter(p => p.id !== id);
      api.state.deleted[id] = Date.now();
      if (api.state.current === id) api.state.current = null;
      api.save();
    },
    addList(name) {
      const l = { id: uid(), name, words: [], chunk: 0, created: Date.now(), updatedAt: 0 };
      api.state.lists.unshift(l);
      api.save();
      return l;
    },
    list(id) { return api.state.lists.find(l => l.id === id) || null; },
    removeList(id) {
      api.state.lists = api.state.lists.filter(l => l.id !== id);
      api.state.deleted[id] = Date.now();
      api.state.profiles.forEach(p => {
        if (p.free) delete p.free[id];
        Object.values(p.days || {}).forEach(d => { d.mistakes = (d.mistakes || []).filter(m => m.src !== 'list:' + id); });
      });
      api.save();
    },
    backup() { return JSON.stringify({ app: 'spelling-hero', version: 1, state: api.state }, null, 2); },
    restore(text) {
      const o = JSON.parse(text);
      if (!o || o.app !== 'spelling-hero' || !o.state || !Array.isArray(o.state.profiles)) throw new Error('bad');
      api.state = Object.assign(blank(), o.state);
      api.state.settings = Object.assign({}, DEFAULT_SETTINGS, o.state.settings);
      remember(api.state);
      api.save();
      onSave();
    },
  };
  remember(api.state);
  return api;
})();
