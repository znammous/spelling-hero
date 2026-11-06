// أصوات بسيطة تُولَّد داخل الجهاز بلا ملفات
const Sound = (() => {
  let ac = null;
  const NOTES = {
    right: [[660, .1], [880, .1], [1180, .12]],
    wrong: [[300, .14], [200, .18]],
    tap: [[720, .04]],
    del: [[420, .05]],
    coin: [[988, .08], [1319, .14]],
    win: [[523, .13], [659, .13], [784, .13], [1046, .22]],
    tick: [[620, .08]],
    go: [[880, .2]],
    open: [[520, .08], [660, .08], [880, .12]],
  };
  function unlock() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* لا صوت */ }
  }
  function play(name) {
    if (Store.state.muted || !NOTES[name]) return;
    unlock();
    if (!ac) return;
    let t = ac.currentTime;
    NOTES[name].forEach(([f, d]) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d;
    });
  }
  return { play, unlock };
})();
