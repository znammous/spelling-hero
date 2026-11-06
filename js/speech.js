// نطق الكلمات: تسجيل بصوت ولي الأمر أو المعلّم أولاً، ثم صوت الجهاز
const Speech = (() => {
  let voices = [];
  let db = null;
  let recSet = {};
  let mr = null;
  let recKey = null;
  let recTimer = null;
  let onRecChange = () => {};

  const synth = window.speechSynthesis;
  function loadVoices() { if (synth) voices = synth.getVoices() || []; }
  if (synth) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 800);
  }
  const voicesFor = lang => voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(lang));
  function pick(lang) {
    const s = Store.state.settings;
    const want = lang === 'ar' ? s.voiceAr : s.voiceEn;
    const list = voicesFor(lang);
    return list.find(v => v.name === want) || list[0] || null;
  }

  // ───── التسجيلات في IndexedDB ─────
  function open(cb) {
    if (db) return cb(db);
    try {
      const r = indexedDB.open('spellingHeroRec', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec');
      r.onsuccess = () => { db = r.result; cb(db); };
      r.onerror = () => cb(null);
    } catch (e) { cb(null); }
  }
  function loadKeys(cb) {
    open(d => {
      if (!d) return cb && cb();
      const q = d.transaction('rec').objectStore('rec').getAllKeys();
      q.onsuccess = () => { recSet = {}; (q.result || []).forEach(k => { recSet[k] = true; }); cb && cb(); };
      q.onerror = () => cb && cb();
    });
  }
  function playRec(key, done) {
    open(d => {
      if (!d) return done && done(false);
      const q = d.transaction('rec').objectStore('rec').get(key);
      q.onsuccess = () => {
        if (!q.result) return done && done(false);
        const url = URL.createObjectURL(q.result);
        const a = new Audio(url);
        a.onended = () => { URL.revokeObjectURL(url); done && done(true); };
        a.play().catch(() => done && done(false));
      };
      q.onerror = () => done && done(false);
    });
  }
  function delRec(key) {
    open(d => {
      if (!d) return;
      const t = d.transaction('rec', 'readwrite');
      t.objectStore('rec').delete(key);
      t.oncomplete = () => { delete recSet[key]; onRecChange(); };
    });
  }
  function stopRec() {
    clearTimeout(recTimer);
    if (mr && mr.state === 'recording') mr.stop();
  }
  function toggleRec(key) {
    if (mr && mr.state === 'recording') { stopRec(); return Promise.resolve('stopped'); }
    if (!navigator.mediaDevices || !window.MediaRecorder) return Promise.reject(new Error('unsupported'));
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const chunks = [];
      const rec = new MediaRecorder(stream);
      mr = rec;
      recKey = key;
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        mr = null;
        open(d => {
          if (!d) { onRecChange(); return; }
          const t = d.transaction('rec', 'readwrite');
          t.objectStore('rec').put(blob, recKey);
          t.oncomplete = () => { recSet[recKey] = true; onRecChange(); };
          t.onerror = () => onRecChange();
        });
      };
      rec.start();
      recTimer = setTimeout(stopRec, 5000);   // أقصى مدة 5 ثوانٍ
      onRecChange();
      return 'started';
    });
  }

  // ───── النطق ─────
  function tts(text, lang) {
    if (!synth) return false;
    if (!voices.length) loadVoices();
    const v = pick(lang);
    if (lang === 'ar' && !v) return false;   // لا صوت عربي: لا ننطق كلاماً خاطئاً
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v ? v.lang : 'en-US';
      if (v) u.voice = v;
      u.rate = Store.state.settings.rate;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function say(word) {
    if (!Store.state.settings.speak) return;
    if (recSet[word.t]) { playRec(word.t); return; }
    tts(word.t, word.lang);
  }
  // هل يستطيع الطفل سماع هذه الكلمة؟ إن لم يستطع فلا تُملى سماعاً فقط
  function can(word) {
    if (!Store.state.settings.speak) return false;
    if (recSet[word.t]) return true;
    if (!synth) return false;
    if (!voices.length) loadVoices();
    return word.lang === 'ar' ? voicesFor('ar').length > 0 : voicesFor('en').length > 0;
  }

  return {
    say, can, tts, voicesFor, loadVoices, loadKeys, playRec, delRec, toggleRec,
    hasRec: k => !!recSet[k],
    isRecording: k => !!(mr && mr.state === 'recording' && recKey === k),
    onChange: fn => { onRecChange = fn; },
    stop() { stopRec(); if (synth) synth.cancel(); },
  };
})();
