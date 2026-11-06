// حفظ ملفات الأطفال وقوائم الكلمات على الجهاز نفسه
const Store = (() => {
  const KEY = 'spelling-hero-v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const blank = () => ({ profiles: [], current: null, lists: [], settings: Object.assign({}, DEFAULT_SETTINGS), pin: '', muted: false });

  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.profiles)) {
        s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings);
        s.lists = s.lists || [];
        return s;
      }
    } catch (e) { /* ملف تالف: نبدأ من جديد */ }
    return blank();
  }

  const api = {
    state: read(),
    uid,
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(api.state)); return true; } catch (e) { return false; }
    },
    current() { return api.state.profiles.find(p => p.id === api.state.current) || null; },
    addProfile(name, avatar) {
      const p = {
        id: uid(), name, avatar, coins: 0, items: [], world: 'ar', worlds: {}, free: {},
        days: {}, perfect: 0, examPerfect: 0, freeRounds: 0, created: Date.now(),
      };
      api.state.profiles.push(p);
      api.state.current = p.id;
      api.save();
      return p;
    },
    removeProfile(id) {
      api.state.profiles = api.state.profiles.filter(p => p.id !== id);
      if (api.state.current === id) api.state.current = null;
      api.save();
    },
    addList(name) {
      const l = { id: uid(), name, words: [], chunk: 0, created: Date.now() };
      api.state.lists.unshift(l);
      api.save();
      return l;
    },
    list(id) { return api.state.lists.find(l => l.id === id) || null; },
    removeList(id) {
      api.state.lists = api.state.lists.filter(l => l.id !== id);
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
      api.save();
    },
  };
  return api;
})();
