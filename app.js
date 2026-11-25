/* REELIO: all page interactions (3D hero, scroll animations, sections, contact form). */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hasG = !!window.gsap;
  const hasST = hasG && !!window.ScrollTrigger;
  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasST && !reduce) root.classList.add('js-gsap');

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  try { if (window.Lenis && !reduce) lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 }); } catch (e) { lenis = null; }
  let nativeVel = 0, lastY = scrollY;
  addEventListener('scroll', () => { nativeVel = scrollY - lastY; lastY = scrollY; }, { passive: true });
  const velocity = () => (lenis ? lenis.velocity : nativeVel);
  if (lenis) {
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    if (hasG) { gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const loop = t => { lenis.raf(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }

  const ticks = [];
  const onTick = fn => ticks.push(fn);
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    for (const fn of ticks) fn(dt, now);
    nativeVel *= 0.85;
  }
  if (hasG) gsap.ticker.add(() => frame(performance.now()));
  else { const loop = t => { frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

  /* ---------- menu + anchors ---------- */
  const menu = $('#menu'), menuBtn = $('.nav-menu');
  function openMenu() { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.querySelector('span').textContent = 'Close'; root.classList.add('menu-open'); lenis && lenis.stop(); const a = menu.querySelector('a'); a && a.focus(); }
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.querySelector('span').textContent = 'Menu'; root.classList.remove('menu-open'); lenis && lenis.start(); }
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); menuBtn.focus(); } });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = document.getElementById(id.slice(1)); if (!el) return;
    e.preventDefault(); closeMenu();
    if (lenis) lenis.scrollTo(el, { duration: 1.5 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  /* ---------- nav surface + progress segments ---------- */
  const nav = $('.nav');
  const surfaces = $$('[data-surface]');
  const segs = $$('.seg').map(s => ({ el: s, sec: document.getElementById(s.dataset.seg) }));
  const box = el => (el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el);
  onTick(() => {
    const y = 40; let on = 'red';
    for (const s of surfaces) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { on = s.dataset.surface; break; } }
    if (nav.dataset.on !== on) nav.dataset.on = on;
    const mid = innerHeight * 0.5;
    for (const s of segs) { if (!s.sec) continue; const r = box(s.sec).getBoundingClientRect(); s.el.style.setProperty('--p', clamp((mid - r.top) / r.height, 0, 1).toFixed(3)); }
  });

  /* ---------- clocks ---------- */
  const tcEl = $('#tc'); const t0 = performance.now(); let lastTC = '';
  const pad = n => String(n).padStart(2, '0');
  onTick((dt, now) => {
    if (!tcEl) return;
    const f = Math.floor((now - t0) / 1000 * 24);
    const s = `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
    if (s !== lastTC) { tcEl.textContent = s; lastTC = s; }
  });
  const istFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const tickIST = () => $$('.ist').forEach(el => (el.textContent = istFmt.format(new Date())));
  tickIST(); setInterval(tickIST, 15000);

  /* ---------- cursor ---------- */
  const cur = $('.cursor');
  if (fine && cur) {
    const lab = cur.querySelector('span');
    let x = -100, y = -100, cx = -100, cy = -100;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    document.addEventListener('pointerover', e => {
      const t = e.target;
      const s = t.closest('[data-surface]'); cur.dataset.on = s ? s.dataset.surface : 'red';
      const labelEl = t.closest('[data-cursor]');
      cur.classList.remove('is-link', 'is-label');
      if (t.closest('#gl')) { lab.textContent = hoverCard ? 'View' : 'Drag'; cur.classList.add('is-label'); }
      else if (labelEl) { lab.textContent = labelEl.dataset.cursor; cur.classList.add('is-label'); }
      else if (t.closest('a,button,label,[role="tab"]')) cur.classList.add('is-link');
    });
    onTick(() => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; });
  }
  let hoverCard = null;

  /* ---------- tabs ---------- */
  const tabs = $$('[role="tab"]');
  function selectTab(i) { tabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; const p = document.getElementById(t.getAttribute('aria-controls')); p.hidden = !on; if (on && hasG && !reduce) gsap.fromTo(p.children, { y: 14, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out' }); }); }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', e => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(n); tabs[n].focus(); }
    });
  });

  /* ---------- brief -> WhatsApp ---------- */
  const form = $('#brief'), send = $('#send'), bubble = $('#bubble');
  function compose() {
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim(), biz = String(fd.get('biz') || '').trim();
    const type = String(fd.get('type') || '').trim(), plan = String(fd.get('plan') || ''), msg = String(fd.get('msg') || '').trim();
    let t = 'Hi REELIO!';
    if (name) t += ` I'm ${name}${biz ? ` from ${biz}` : ''}.`; else if (biz) t += ` I'm writing from ${biz}.`;
    if (type) t += ` Our business: ${type}.`;
    t += plan ? ` I'm interested in ${plan}.` : ` I'd like to know which plan fits us.`;
    if (msg) t += `\n\n${msg}`;
    bubble.textContent = t;
    send.href = 'https://wa.me/919381894142?text=' + encodeURIComponent(t);
  }
  form.addEventListener('input', compose); form.addEventListener('change', compose);
  form.addEventListener('submit', e => { e.preventDefault(); send.click(); });
  compose();

  /* ---------- copy ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const lbl = b.querySelector('span'); const orig = lbl.textContent;
    const done = txt => { lbl.textContent = txt; b.classList.add('done'); setTimeout(() => { lbl.textContent = orig; b.classList.remove('done'); }, 1800); };
    const fallback = () => { const el = document.getElementById(b.dataset.target); if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } done('Selected'); };
    try { navigator.clipboard.writeText(b.dataset.copy).then(() => done('Copied'), fallback); } catch (e) { fallback(); }
  }));

  /* ---------- niche tilt ---------- */
  if (fine && !reduce) $$('[data-tilt]').forEach(c => {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; c.style.setProperty('--ry', (px * 14).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg'); });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
  });

  /* ---------- juniors' bake reel + on-set clips ---------- */
  (() => {
    const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const v = $('#jb-video'), reel = $('.jb-reel');
    const chips = $$('.jb-film li'), marks = [0, 2.03, 3.63, 5.23, 7.17];
    if (v && 'IntersectionObserver' in window) {
      v.addEventListener('timeupdate', () => {
        const t = v.currentTime; let k = 0; marks.forEach((m, i) => { if (t >= m) k = i; });
        chips.forEach((c, i) => c.classList.toggle('on', i === k));
        if (reel && v.duration) reel.style.setProperty('--prog', (t / v.duration).toFixed(3));
      });
      v.addEventListener('playing', () => { const p = reel && reel.querySelector('img.poster'); if (p) p.remove(); }, { once: true });
      if (motionOK) new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.35 }).observe(v);
    }
    const clips = $$('video[data-onset]');
    if (clips.length && motionOK && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { const c = e.target; if (e.isIntersecting) { if (c.preload === 'none') { c.preload = 'auto'; c.load(); } c.play().catch(() => {}); } else c.pause(); }), { threshold: 0.3 });
      clips.forEach(c => io.observe(c));
    }
    // mobile swipe strip: progress bar, counter and a one-time nudge so people know it scrolls
    const strip = $('.onset-strip'), swipe = $('.onset-swipe');
    if (strip && swipe) {
      const cards = $$('.onset-card', strip), bar = $('.onset-swipe-track', swipe), num = $('.onset-swipe-count b', swipe);
      const upd = () => {
        const max = strip.scrollWidth - strip.clientWidth; if (max <= 0) return;
        const p = Math.min(1, Math.max(0, strip.scrollLeft / max));
        bar.style.setProperty('--p', p.toFixed(3));
        num.textContent = String(Math.round(p * (cards.length - 1)) + 1).padStart(2, '0');
      };
      strip.addEventListener('scroll', upd, { passive: true }); upd();
      if (motionOK && 'IntersectionObserver' in window) {
        const nio = new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting || strip.scrollWidth <= strip.clientWidth || strip.scrollLeft > 4) return;
          nio.disconnect();
          strip.style.scrollSnapType = 'none';
          strip.scrollTo({ left: 90, behavior: 'smooth' });
          setTimeout(() => { strip.scrollTo({ left: 0, behavior: 'smooth' }); setTimeout(() => { strip.style.scrollSnapType = ''; }, 600); }, 650);
        }), { threshold: 0.6 });
        nio.observe(strip);
      }
    }
  })();

  /* ---------- services hover reel ---------- */
  const float = $('.svc-float');
  if (fine && float && hasG) {
    const imgs = $$('img', float);
    const qx = gsap.quickTo(float, 'x', { duration: 0.6, ease: 'power3' }), qy = gsap.quickTo(float, 'y', { duration: 0.6, ease: 'power3' });
    gsap.set(float, { xPercent: -50, yPercent: -50 });
    let lx = 0, cur = null, px = -1, py = -1, ticking = false;
    // show the card for one row, or hide it (row = null). Scrolling never fires pointerleave,
    // so the row under the pointer is re-checked on every scroll as well.
    const showFor = row => {
      if (row === cur) return; cur = row;
      if (row) { imgs.forEach((im, i) => im.classList.toggle('on', String(i) === row.dataset.img)); gsap.to(float, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' }); }
      else gsap.to(float, { opacity: 0, scale: 0.4, duration: 0.35, ease: 'power3.in', overwrite: 'auto' });
    };
    const rowAt = (x, y) => { if (x < 0) return null; const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.svc') : null; };
    const recheck = () => { ticking = false; showFor(rowAt(px, py)); };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(recheck); } };
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    if (lenis) lenis.on('scroll', onScroll);
    document.documentElement.addEventListener('pointerleave', () => { px = py = -1; showFor(null); });
    addEventListener('blur', () => showFor(null));
    $$('.svc').forEach(row => {
      row.addEventListener('pointerenter', e => { px = e.clientX; py = e.clientY; qx(e.clientX + 40); qy(e.clientY); showFor(row); });
      row.addEventListener('pointerleave', e => { const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.svc') : null; showFor(to); });
      row.addEventListener('pointermove', e => { qx(e.clientX + 40); qy(e.clientY); const v = e.clientX - lx; lx = e.clientX; gsap.to(float, { rotation: clamp(v * 0.6, -12, 12), duration: 0.5, overwrite: 'auto' }); });
    });
  }
  if (!fine && 'IntersectionObserver' in window) {
    const rows = $$('.svc');
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-on', e.isIntersecting)), { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach(r => io.observe(r));
  }

  /* ---------- statement words ---------- */
  function splitWords(el) { const out = []; [...el.childNodes].forEach(n => { if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) frag.append(p); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.append(s); out.push(s); } }); n.replaceWith(frag); } else if (n.nodeType === 1) out.push(...splitWords(n)); }); return out; }

  /* ---------- scroll choreography ---------- */
  function countUp(el) { const target = +el.dataset.count; const o = { v: 0 }; gsap.to(o, { v: target, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')) }); }
  if (hasST && !reduce) {
    const words = splitWords($('#statement'));
    gsap.fromTo(words, { opacity: 0.18 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top 82%', end: 'bottom 42%', scrub: true } });

    $$('.reveal').forEach(el => gsap.from(el, { yPercent: 22, skewY: 3, opacity: 0.35, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

    $$('.parallax').forEach(img => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    gsap.from('.reel', { y: 90, rotate: (i) => (i % 2 ? 3 : -3), duration: 1.3, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.reels', start: 'top 85%', once: true } });
    gsap.from('.svc', { y: 40, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '.svc-list', start: 'top 85%', once: true } });
    gsap.from('.plan', { y: 70, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.plans-grid', start: 'top 85%', once: true } });

    $$('[data-speed]').forEach(el => gsap.fromTo(el, { y: () => +el.dataset.speed * 40 }, { y: () => -el.dataset.speed * 40, ease: 'none', scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }));

    gsap.fromTo('.foot-logo', { yPercent: 24, scaleY: 1.25, transformOrigin: '50% 100%' }, { yPercent: 0, scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'top 30%', scrub: true } });
    gsap.to('.hero-top, .hero-bottom', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '45% top', scrub: true } });

    // marquee with scroll velocity
    const track = $('.marquee-track');
    const marq = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    let dir = 1;
    onTick(() => { const v = velocity(); if (Math.abs(v) > 0.3) dir = v > 0 ? 1 : -1; const target = dir * (1 + Math.min(Math.abs(v) * 0.35, 8)); marq.timeScale(marq.timeScale() + (target - marq.timeScale()) * 0.1); });

    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      root.classList.add('pin-ok');
      const wt = $('.work-track');
      const dist = () => Math.max(0, wt.scrollWidth - innerWidth);
      const tween = gsap.to(wt, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#work', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('[data-count]').forEach(el => ScrollTrigger.create({ trigger: el, containerAnimation: tween, start: 'left 92%', once: true, onEnter: () => countUp(el) }));
      $$('.panel-media img').forEach(img => gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      gsap.from('.phone', { y: 80, rotate: (i) => (i ? 6 : -6), ease: 'none', scrollTrigger: { trigger: '.panel-stats', containerAnimation: tween, start: 'left right', end: 'left 40%', scrub: true } });
      return () => root.classList.remove('pin-ok');
    });
    mm.add('(max-width: 899px)', () => {
      $$('[data-count]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => countUp(el) }));
    });
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- WebGL hero: a helix of reels around the wordmark ---------- */
  const hero = $('#top'), canvas = $('#gl'), logoEl = $('.hero-logo');
  function noGL() { root.classList.remove('gl'); root.classList.add('no-gl'); }
  function initGL() {
    if (!window.THREE) return noGL();
    const T = THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return noGL(); }
    if (!renderer.getContext()) return noGL();
    if (T.ColorManagement) T.ColorManagement.enabled = false;
    renderer.outputColorSpace = T.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    const css = getComputedStyle(root);
    const v3 = name => { const h = css.getPropertyValue(name).trim().replace('#', ''); return new T.Vector3(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255); };
    const RED = v3('--red'), HI = v3('--red-hi'), DEEP = v3('--crimson'), PAPER = v3('--paper');

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 0, 18);

    // background: drifting crimson noise
    const bgMat = new T.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uMouse: { value: new T.Vector2(0.5, 0.5) }, uA: { value: DEEP }, uB: { value: RED }, uC: { value: HI } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
        void main(){
          vec2 asp = vec2(uRes.x/uRes.y, 1.0);
          vec2 p = (vUv - 0.5) * asp;
          float t = uTime * 0.045;
          float n = fbm(p*1.5 + vec2(t, -t*0.6) + fbm(p*2.4 - t)*0.9);
          vec3 col = uB;
          col = mix(col, uC, smoothstep(0.56, 0.86, n) * 0.55);
          col = mix(col, uA, smoothstep(0.42, 0.12, n) * 0.6);
          float m = length((vUv - uMouse) * asp);
          col = mix(col, uC, smoothstep(0.55, 0.0, m) * 0.22);
          float vig = smoothstep(1.3, 0.2, length(p));
          col = mix(uA, col, 0.62 + 0.38*vig);
          col += (hash(vUv*uRes + fract(uTime*7.0)) - 0.5) * 0.045;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    const bg = new T.Mesh(new T.PlaneGeometry(2, 2), bgMat); bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

    const group = new T.Group(); scene.add(group);
    const tilt = new T.Group(); group.add(tilt);

    // logo plane, drawn from the traced brand paths
    const LW = 8, LH = LW * 330 / 1307;
    const lc = document.createElement('canvas'); lc.width = 2600; lc.height = Math.round(2600 * 330 / 1307);
    const lx = lc.getContext('2d'); lx.scale(lc.width / 1307, lc.height / 330); lx.fillStyle = '#fff';
    lx.fill(new Path2D($('#lp-l').getAttribute('d')), 'evenodd'); lx.fill(new Path2D($('#lp-o').getAttribute('d')), 'evenodd');
    const logoTex = new T.CanvasTexture(lc); logoTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const logoMat = new T.ShaderMaterial({
      transparent: true,
      uniforms: { uTex: { value: logoTex }, uVel: { value: 0 }, uOp: { value: 0 }, uTime: { value: 0 }, uC: { value: PAPER } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform float uVel; uniform float uOp; uniform float uTime; uniform vec3 uC;
        void main(){
          float s = uVel * 0.006;
          float r = texture2D(uTex, vUv + vec2(s, 0.0)).a;
          float g = texture2D(uTex, vUv).a;
          float b = texture2D(uTex, vUv - vec2(s, 0.0)).a;
          float a = max(max(r, g), b);
          if (a < 0.02) discard;
          vec3 col = mix(vec3(1.0, 0.55, 0.45), uC, g);
          gl_FragColor = vec4(col, a * uOp);
        }`
    });
    const logo = new T.Mesh(new T.PlaneGeometry(LW, LH), logoMat); group.add(logo);

    // reels
    const small = innerWidth < 760;
    const N = small ? 12 : 16;
    const STEP = Math.PI * 2 / 7.2;
    let R = 5.05, CW = 1.12, CH = CW * 16 / 9, PITCH = 0.46, cardK = 1;
    const cardVS = `varying vec2 vUv; uniform float uVel; uniform float uTime; uniform float uHover;
      void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.y * 3.14159) * uVel * 0.18 + sin(uv.y * 6.0 + uTime * 2.0) * 0.02 * uHover; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
    const cardFS = `precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform float uHover; uniform float uVel; uniform float uLoaded; uniform float uFade; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec2 uPt;
      float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(0.5625, 1.0);
        float d = sdBox(p, vec2(0.28125, 0.5), 0.034);
        float aa = fwidth(d) * 1.2;
        float alpha = 1.0 - smoothstep(-aa, aa, d);
        if (alpha < 0.01) discard;
        vec3 col;
        if (!gl_FrontFacing) {
          vec3 tb = texture2D(uTex, vec2(1.0 - vUv.x, vUv.y)).rgb;
          float lb = smoothstep(0.04, 0.96, dot(tb, vec3(0.299, 0.587, 0.114)));
          col = mix(uA, uB, lb * 0.9);
          col = mix(uA, col, uLoaded);
          vec2 q = vec2(abs(vUv.x - 0.5) * 0.5625, vUv.y);
          float holes = step(0.226, q.x) * step(q.x, 0.252) * step(0.42, fract(vUv.y * 15.0)) * step(fract(vUv.y * 15.0), 0.86);
          col = mix(col, uA * 0.55, holes);
        } else {
          float s = uVel * 0.01;
          vec3 tex = vec3(texture2D(uTex, vUv + vec2(s, 0.0)).r, texture2D(uTex, vUv).g, texture2D(uTex, vUv - vec2(s, 0.0)).b);
          float l = dot(tex, vec3(0.299, 0.587, 0.114));
          l = smoothstep(0.04, 0.96, l);
          vec3 duo = l < 0.5 ? mix(uA, uB, l * 2.0) : mix(uB, uC, (l - 0.5) * 2.0);
          float r = length((vUv - uPt) * vec2(0.5625, 1.0));
          float m = smoothstep(uHover * 1.25 - 0.08, uHover * 1.25, r);
          col = mix(tex, duo, m);
          col = mix(uA, col, uLoaded);
          float edge = 1.0 - smoothstep(-0.0105, -0.0075, d);
          col = mix(col, vec3(1.0), (1.0 - edge) * 0.85);
          col += (hash(vUv * 900.0 + fract(uTime * 3.0)) - 0.5) * 0.05;
        }
        gl_FragColor = vec4(col, alpha * uFade);
      }`;
    function bentGeo() {
      const g = new T.PlaneGeometry(CW, CH, 28, 1); const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), a = x / R; pos.setX(i, Math.sin(a) * R); pos.setZ(i, Math.cos(a) * R - R); }
      pos.needsUpdate = true; return g;
    }
    let geo = bentGeo();
    const loader = new T.TextureLoader();
    const blank = new T.DataTexture(new Uint8Array([138, 7, 19, 255]), 1, 1); blank.needsUpdate = true;
    const cards = [];
    for (let i = 0; i < N; i++) {
      const mat = new T.ShaderMaterial({
        transparent: true, side: T.DoubleSide, extensions: { derivatives: true },
        uniforms: { uTex: { value: blank }, uHover: { value: 0 }, uVel: { value: 0 }, uLoaded: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 }, uA: { value: DEEP }, uB: { value: RED }, uC: { value: PAPER }, uPt: { value: new T.Vector2(0.5, 0.5) } },
        vertexShader: cardVS, fragmentShader: cardFS
      });
      const pivot = new T.Group(); const mesh = new T.Mesh(geo, mat); mesh.position.z = R; mesh.userData.i = i;
      pivot.add(mesh); tilt.add(pivot);
      const c = { pivot, mesh, mat, hover: 0, hoverT: 0, intro: 0 };
      cards.push(c);
      loader.load(`r${String(i + 1).padStart(2, '0')}.jpg`, tex => {
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.minFilter = T.LinearMipmapLinearFilter;
        mat.uniforms.uTex.value = tex;
        if (hasG) gsap.to(mat.uniforms.uLoaded, { value: 1, duration: 0.8 }); else mat.uniforms.uLoaded.value = 1;
      });
    }

    // layout: map the hidden DOM wordmark to world space so the GL logo sits exactly where the h1 is
    let W = 1, H = 1, baseScale = 1, logoFront = false;
    function layout() {
      W = hero.clientWidth; H = hero.clientHeight;
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
      bgMat.uniforms.uRes.value.set(W, H);
      const vh = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2)); const wpp = vh / H;
      const r = logoEl.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      const cx = r.left + r.width / 2 - hr.left - W / 2, cy = r.top + r.height / 2 - hr.top - H / 2;
      group.position.set(cx * wpp, -cy * wpp, 0);
      baseScale = (r.width * wpp) / LW; group.scale.setScalar(baseScale);
      logoFront = W / H < 0.9;
      const k = W / H < 0.9 ? 1.55 : W / H < 1.25 ? 1.2 : 1;
      if (k !== cardK) { cardK = k; CW = 1.12 * k; CH = CW * 16 / 9; PITCH = 0.46 * k; const old = geo; geo = bentGeo(); cards.forEach(c => (c.mesh.geometry = geo)); old.dispose(); }
    }
    layout();
    let rq = 0; addEventListener('resize', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(layout); });

    // interaction
    const ndc = new T.Vector2(9, 9), mouse = new T.Vector2(0, 0), mouseS = new T.Vector2(0, 0);
    const ray = new T.Raycaster();
    let dragging = false, px = 0, dragVel = 0, pointerIn = false;
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      mouse.set(ndc.x, ndc.y); pointerIn = true;
      if (dragging) { const dx = e.clientX - px; px = e.clientX; dragVel += dx * 0.0045; }
    });
    canvas.addEventListener('pointerleave', () => { pointerIn = false; ndc.set(9, 9); });
    canvas.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    addEventListener('pointermove', e => { bgMat.uniforms.uMouse.value.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight); }, { passive: true });

    // visibility
    let visible = true;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

    // intro
    const intro = { v: reduce ? 1 : 0 };
    const startIntro = () => { if (hasG && !reduce) gsap.to(intro, { v: 1, duration: 2.4, ease: 'expo.out' }); else intro.v = 1; };
    (window.reelioEntered || new Promise(r => setTimeout(r, 1800))).then(() => setTimeout(startIntro, reduce ? 0 : 160));

    let phase = 0, time = 0, velS = 0;
    const easeBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let first = true;

    onTick(dt => {
      if (!visible && !first) return;
      time += dt;
      const v = velocity();
      velS += (clamp(Math.abs(v) / 18 + Math.abs(dragVel) * 1.2, 0, 3) - velS) * 0.1;
      const base = reduce ? 0 : 0.16;
      phase += dt * (base + dragVel) + (reduce ? 0 : v * 0.0022);
      dragVel *= Math.pow(0.08, dt);
      mouseS.lerp(mouse, 0.05);

      const hr = hero.getBoundingClientRect();
      const out = clamp(-hr.top / Math.max(1, hr.height), 0, 1);
      const iv = intro.v;
      const spin = (1 - iv) * -5.5;

      tilt.rotation.x = 0.2 + mouseS.y * -0.1 + out * 0.35;
      tilt.rotation.z = -0.1 + mouseS.x * 0.06;
      tilt.rotation.y = mouseS.x * 0.12;
      group.scale.setScalar(baseScale * (0.92 + 0.08 * iv));

      logoMat.uniforms.uOp.value = ss(0.15, 0.6, iv);
      logoMat.uniforms.uVel.value = velS;
      {
        const zl = logoFront ? R + 1.8 : 0, sc = group.scale.x, zw = zl * sc;
        const f = (camera.position.z - zw) / camera.position.z;
        logo.position.z = zl; logo.scale.setScalar(f);
        logo.position.x = -group.position.x * (1 - f) / sc;
        logo.position.y = -group.position.y * (1 - f) / sc + Math.sin(time * 0.8) * 0.04;
        logo.rotation.x = mouseS.y * -0.06; logo.rotation.y = mouseS.x * 0.09;
      }

      // hover test
      let hit = null;
      if (pointerIn && !dragging && iv > 0.9) {
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(cards.map(c => c.mesh), false);
        for (const h of hits) { const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(ray.ray.direction) < 0) { hit = h; break; } }
      }
      const hc = hit ? cards[hit.object.userData.i] : null;
      if (hc !== hoverCard) { hoverCard = hc; if (cur) { const lab = cur.querySelector('span'); if (cur.classList.contains('is-label') && lab && pointerIn) lab.textContent = hc ? 'View' : 'Drag'; } }
      if (hit) cards[hit.object.userData.i].mat.uniforms.uPt.value.copy(hit.uv);

      const span = N * PITCH;
      for (let i = 0; i < N; i++) {
        const c = cards[i];
        let u = (i + (phase + spin) / STEP) % N; if (u < 0) u += N;
        const th = u * STEP;
        const y = (u - N / 2) * PITCH;
        const e = Math.min(u, N - u);
        const fade = ss(0.0, 1.6, e);
        const ci = clamp(iv * 1.7 - (i / N) * 0.7, 0, 1);
        c.hoverT = c === hoverCard ? 1 : 0;
        c.hover += (c.hoverT - c.hover) * Math.min(1, dt * 7);
        c.pivot.rotation.y = th;
        c.pivot.position.y = y;
        const rr = R * (1 + out * 0.45);
        c.mesh.position.z = rr + c.hover * 0.35 + (1 - ci) * 3;
        const sc = Math.max(0.0001, fade * easeBack(ci) * (1 + c.hover * 0.06));
        c.mesh.scale.setScalar(sc);
        const u2 = c.mat.uniforms; u2.uHover.value = c.hover; u2.uVel.value = velS; u2.uTime.value = time; u2.uFade.value = 1;
      }
      bgMat.uniforms.uTime.value = time; logoMat.uniforms.uTime.value = time;
      renderer.render(scene, camera);
      if (first) { first = false; root.classList.add('gl'); }
    });

    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); noGL(); });
  }
  try { initGL(); } catch (e) { console.warn('[reelio] WebGL disabled:', e); noGL(); }
})();
