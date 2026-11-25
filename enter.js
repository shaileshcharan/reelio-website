/* REELIO: enter screen, countdown and background music. Loaded before the page content. */
/* music + enter gate. Runs early so the countdown can hold before its CSS wipe (1.86s). Browsers only allow sound
   after the visitor interacts, so: try autoplay; if refused, the countdown ends on an Enter button and that tap starts it. */
(() => {
  const d = document, root = d.documentElement, a = d.getElementById('bgm'), btn = d.querySelector('.snd'), leader = d.querySelector('.leader');
  let enterDone; window.reelioEntered = new Promise(r => (enterDone = r));
  if (!a || !btn) { setTimeout(enterDone, 1860); return; }
  const LEVEL = 0.4, KEY = 'reelio-sound';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let want = 'on'; try { if (localStorage.getItem(KEY) === 'off') want = 'off'; } catch (e) {}
  let gain = null, ctx = null, raf = 0, playing = false, entered = false;
  // iPhones ignore element volume, so there the sound runs through a Web Audio gain node to stay at 40%
  a.volume = 0.5; const volLocked = Math.abs(a.volume - 0.5) > 0.01; a.volume = 0;
  const setVol = v => { if (gain) gain.gain.value = v; else a.volume = Math.max(0, Math.min(1, v)); };
  const getVol = () => (gain ? gain.gain.value : a.volume);
  function fade(to, ms, done) {
    cancelAnimationFrame(raf); const from = getVol(), t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / ms); setVol(from + (to - from) * k * (2 - k)); if (k < 1) raf = requestAnimationFrame(step); else if (done) done(); };
    raf = requestAnimationFrame(step);
  }
  function useWebAudio() {
    if (gain || !volLocked) return;
    try { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); const src = ctx.createMediaElementSource(a); gain = ctx.createGain(); gain.gain.value = 0; src.connect(gain).connect(ctx.destination); a.volume = 1; } catch (e) { gain = null; }
  }
  function show(state) { btn.dataset.state = state; const on = state === 'on'; btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Mute music' : 'Play music'); }
  function pop() { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  const evs = ['pointerdown', 'keydown', 'touchend'];
  function unlock(e) { if (e.target && e.target.closest && e.target.closest('.snd,.leader')) return; if (want === 'on' && !playing) start(true); }
  const arm = () => evs.forEach(n => addEventListener(n, unlock, { capture: true, passive: true }));
  const disarm = () => evs.forEach(n => removeEventListener(n, unlock, { capture: true }));
  function start(gesture) {
    if (gesture) useWebAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    setVol(0);
    const p = a.play();
    p.then(() => { playing = true; show('on'); disarm(); fade(LEVEL, 1200); }, () => { playing = false; if (want === 'on') show('idle'); });
    return p;
  }
  function stop() { playing = false; show('off'); fade(0, 350, () => { if (!playing) a.pause(); }); }
  btn.addEventListener('click', () => {
    pop();
    if (playing) { want = 'off'; stop(); } else { want = 'on'; start(true); }
    try { localStorage.setItem(KEY, want); } catch (e) {}
  });
  d.addEventListener('visibilitychange', () => {
    if (d.hidden) { if (playing) { a.pause(); a.dataset.resume = '1'; } }
    else if (a.dataset.resume) { delete a.dataset.resume; a.play().catch(() => {}); }
  });
  a.addEventListener('error', () => { playing = false; show('off'); });

  /* ---- enter gate ---- */
  const enterBtn = d.querySelector('.leader-enter'), quiet = d.querySelector('.leader-quiet');
  const block = e => { if (root.classList.contains('gated') && !entered) { e.preventDefault(); e.stopPropagation(); } };
  function enter(withSound) {
    if (entered) return; entered = true;
    if (withSound) { want = 'on'; start(true); }
    else { want = 'off'; show('off'); try { localStorage.setItem(KEY, 'off'); } catch (e) {} }
    root.classList.add('entering'); enterDone();
    setTimeout(() => { if (leader) leader.hidden = true; root.classList.remove('gated', 'gate-ready', 'entering'); }, 850);
  }
  function openGate() {
    root.classList.add('gate-ready');
    if (enterBtn) { enterBtn.tabIndex = 0; enterBtn.focus({ preventScroll: true }); }
    if (quiet) quiet.tabIndex = 0;
  }
  function noGate() { root.classList.remove('gated'); setTimeout(enterDone, 1860); }   // plain countdown, CSS wipes it

  if (want === 'off') { show('off'); noGate(); return; }
  show('idle'); arm();
  if (reduce || !leader) { start(false).catch(() => {}); enterDone(); return; }   // no countdown: start on first interaction
  root.classList.add('gated');                        // hold the countdown so it can turn into the Enter button
  ['wheel', 'touchmove'].forEach(n => leader.addEventListener(n, block, { passive: false }));
  leader.addEventListener('click', e => enter(!(quiet && quiet.contains(e.target))));   // a tap during the countdown enters straight away
  addEventListener('keydown', e => { if (root.classList.contains('gated') && !entered && !(e.target === quiet)) { if (e.key === 'Tab' || e.key === 'Shift') return; e.preventDefault(); enter(true); } });
  let refused = false;
  start(false).catch(() => { refused = true; });
  setTimeout(() => {
    if (entered) return;
    if (refused) openGate();                          // sound needs a tap: show Enter
    else { entered = true; root.classList.add('entering'); enterDone(); setTimeout(() => { if (leader) leader.hidden = true; root.classList.remove('gated', 'entering'); }, 850); }
  }, 1800);
})();
