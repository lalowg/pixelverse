// PIXELVERSE — page orchestration: HUD, level select, lore panel, discovery, fallback, sections.
import { LOCATIONS, TIMES, TIME_LABEL } from './data.js';
import { initSections } from './sections.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) root.classList.add('reduced');

const hero = $('#world');
const stage = $('#stage');
const lore = $('#lore');
const markerEls = Object.fromEntries($$('.marker').map((m) => [m.dataset.loc, m]));
const levelEls = Object.fromEntries($$('.level').map((b) => [b.dataset.loc, b]));
const byId = Object.fromEntries(LOCATIONS.map((L) => [L.id, L]));

let scene = null;
let selected = null;
let timeIdx = 0;
let motionOn = !reduced;
let formCtl = null;
let toastTimer = 0;

// ---------- persistence (session only, optional) ----------
const store = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } }
};
const found = new Set(store.get('pv-found', []).filter((id) => byId[id]));

// ---------- sky dressing ----------
function drawSky() {
  const sun = $('[data-sun]');
  if (sun) {
    let r = '';
    for (let y = 2; y < 38; y++) {
      if (y > 22 && y % 3 === 0) continue; // horizon slits
      const half = Math.floor(Math.sqrt(Math.max(0, 18 * 18 - (y - 20) * (y - 20))));
      if (half > 0) r += `<rect x="${20 - half}" y="${y}" width="${half * 2}" height="1"/>`;
    }
    sun.innerHTML = `<g fill="currentColor">${r}</g>`;
  }
  const stars = $('.sky-stars');
  if (stars) {
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = (i * 137.5) % 100, y = (i * 61.8) % 72, big = i % 9 === 0;
      s += `<i style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;animation-delay:${(-(i % 7) * 0.7).toFixed(1)}s"${big ? ' class="b"' : ''}></i>`;
    }
    stars.innerHTML = s;
  }
}

// ---------- HUD state ----------
function announce(msg) { const a = $('[data-announce]'); if (a) { a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 30); } }

function toast(html) {
  const t = $('[data-toast]');
  t.innerHTML = html;
  t.hidden = false;
  t.classList.remove('is-in');
  void t.offsetWidth;
  t.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 6500);
}

function renderProgress() {
  $$('[data-found]').forEach((el) => { el.textContent = String(found.size); });
  $$('[data-pip]').forEach((p) => p.classList.toggle('on', found.has(p.dataset.pip)));
  LOCATIONS.forEach((L) => {
    levelEls[L.id]?.classList.toggle('is-found', found.has(L.id));
    markerEls[L.id]?.classList.toggle('is-found', found.has(L.id));
  });
}

function discover(id) {
  if (found.has(id)) return;
  found.add(id);
  store.set('pv-found', [...found]);
  renderProgress();
  if (found.size === LOCATIONS.length && !store.get('pv-ach', false)) {
    store.set('pv-ach', true);
    scene?.celebrate();
    hero.classList.add('is-charted');
    toast('<p class="t-k">Achievement unlocked</p><p class="t-v">Cartographer</p><p class="t-d">You charted every corner of The Drift. The crystal in the Quiet Ring is glowing for you.</p>');
  } else {
    toast(`<p class="t-k">Location discovered</p><p class="t-v">${byId[id].name}</p><p class="t-d">${found.size} of ${LOCATIONS.length} charted</p>`);
  }
}

function fillLore(L) {
  $('[data-lore="no"]', lore).textContent = L.no;
  $('[data-lore="biome"]', lore).textContent = L.biome;
  $('[data-lore="name"]', lore).textContent = L.name;
  $('[data-lore="lore"]', lore).textContent = L.lore;
  $('[data-lore="hook"]', lore).textContent = L.hook;
  $('[data-lore="facts"]', lore).innerHTML = L.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  lore.style.setProperty('--accent', L.accent);
}

function select(id, { focusPanel = false } = {}) {
  if (id === selected && id) { if (focusPanel) $('#lore-name').focus({ preventScroll: true }); return; }
  const prev = selected;
  selected = id;
  if (scene) scene.select(id);
  $$('.fb-loc').forEach((g) => g.classList.toggle('is-active', g.dataset.loc === id));
  Object.entries(levelEls).forEach(([k, b]) => { if (k === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  Object.entries(markerEls).forEach(([k, m]) => m.classList.toggle('is-active', k === id));
  hero.toggleAttribute('data-selected', !!id);
  if (id) {
    const L = byId[id];
    fillLore(L);
    lore.hidden = false;
    lore.classList.remove('is-in');
    void lore.offsetWidth;
    lore.classList.add('is-in');
    discover(id);
    announce(`${L.name} opened. Location ${Number(L.no)} of 6, ${L.biome}.`);
    formCtl?.syncFirst();
    if (focusPanel) $('#lore-name').focus({ preventScroll: true });
  } else {
    lore.hidden = true;
    announce('Back to the full view of The Drift.');
    if (prev && lore.contains(document.activeElement)) levelEls[prev]?.focus({ preventScroll: true });
  }
}

function step(dir) {
  const i = LOCATIONS.findIndex((L) => L.id === selected);
  const j = (i + dir + LOCATIONS.length) % LOCATIONS.length;
  select(LOCATIONS[j].id);
}

// ---------- controls ----------
function setTime(i) {
  timeIdx = i;
  const name = TIMES[i];
  hero.dataset.time = name;
  $('[data-time-label]').textContent = TIME_LABEL[name];
  const next = TIME_LABEL[TIMES[(i + 1) % TIMES.length]];
  $('[data-act="time"]').setAttribute('aria-label', `Time of day: ${TIME_LABEL[name]}. Switch to ${next}`);
  scene?.setTime(name);
}

function setMotion(on) {
  motionOn = on;
  root.classList.toggle('is-paused', !on);
  const b = $('[data-act="motion"]');
  b.setAttribute('aria-pressed', String(!on));
  $('[data-motion-label]').textContent = on ? 'Pause motion' : 'Play motion';
  scene?.setMotion(on);
}

function bindControls() {
  $$('.ctl').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'left') scene?.rotate(-1);
    if (a === 'right') scene?.rotate(1);
    if (a === 'zoomin') scene?.zoom(1);
    if (a === 'zoomout') scene?.zoom(-1);
    if (a === 'reset') { if (selected) select(null); else scene?.reset(); }
    if (a === 'time') setTime((timeIdx + 1) % TIMES.length);
    if (a === 'motion') setMotion(!motionOn);
  }));
  Object.values(levelEls).forEach((b) => b.addEventListener('click', (e) => select(b.dataset.loc, { focusPanel: e.detail === 0 })));
  Object.values(markerEls).forEach((m) => m.addEventListener('click', (e) => select(m.dataset.loc, { focusPanel: e.detail === 0 })));
  $('[data-lore-close]').addEventListener('click', () => select(null));
  $$('[data-lore-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.loreStep))));

  stage.addEventListener('keydown', (e) => {
    if (e.target !== stage || !scene) return;
    const map = { ArrowLeft: () => scene.rotate(-1), ArrowRight: () => scene.rotate(1), ArrowUp: () => scene.tilt(-1), ArrowDown: () => scene.tilt(1), '+': () => scene.zoom(1), '=': () => scene.zoom(1), '-': () => scene.zoom(-1), '_': () => scene.zoom(-1) };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  });
  hero.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-6]$/.test(e.key)) { e.preventDefault(); select(LOCATIONS[Number(e.key) - 1].id); }
    if (e.key === 'Escape' && selected) { e.preventDefault(); const was = selected; select(null); if (document.activeElement === document.body) levelEls[was]?.focus(); }
  });
}

// ---------- 3D or fallback ----------
function useFallback(fbMod) {
  root.classList.add('no-webgl');
  const host = $('#world-fallback');
  host.hidden = false;
  const fbStage = fbMod.renderFallback(host);
  const markers = $('#markers');
  fbStage.appendChild(markers);
  LOCATIONS.forEach((L) => {
    const p = fbMod.project(L);
    const el = markerEls[L.id];
    el.style.transform = '';
    el.style.left = `${(p.x / 10).toFixed(2)}%`;
    el.style.top = `${((p.y - (L.id === 'cinder' ? 120 : L.id === 'beacon' ? 150 : 95)) / 8).toFixed(2)}%`;
  });
  $$('.fb-loc', fbStage).forEach((g) => g.addEventListener('click', () => select(g.dataset.loc)));
  $$('[data-act="left"],[data-act="right"],[data-act="zoomin"],[data-act="zoomout"]').forEach((b) => { b.hidden = true; });
  $('#stage-help').textContent = 'An illustrated floating island. Use the location pins or the level select list to open each location; number keys 1 to 6 also work, and Escape returns to the full view.';
}

async function initWorld() {
  let sceneMod = null;
  const canvas = $('#world-canvas');
  try {
    const probe = document.createElement('canvas');
    const ok = !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')));
    if (ok) sceneMod = await import('./scene.js');
  } catch (err) { sceneMod = null; }
  if (sceneMod) {
    try {
      scene = sceneMod.createScene({
        canvas, host: stage, markerEls, reduced,
        onSelect: (id) => select(id),
        onHover: (id) => Object.entries(markerEls).forEach(([k, m]) => m.classList.toggle('is-hover', k === id)),
        onFail: async () => { scene = null; canvas.hidden = true; useFallback(await import('./fallback.js')); }
      });
      root.classList.add('has-webgl');
      if (!motionOn) scene.setMotion(false);
      if (selected) scene.select(selected);
      return;
    } catch (err) { scene = null; }
  }
  canvas.hidden = true;
  useFallback(await import('./fallback.js'));
}

// ---------- chrome ----------
function initChrome() {
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const btn = $('[data-menu-btn]'), menu = $('#menu');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); root.classList.remove('menu-open'); };
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
    if (open) $('a', menu).focus();
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
  addEventListener('resize', () => { if (innerWidth >= 980 && !menu.hidden) close(); });

  // stepped "pixel" reveals for headings and cards
  const els = $$('.h2, .kicker, .pipe-card, .slot-panel, .quest, .class-card, .save-form, .roll');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  els.forEach((e) => e.classList.add('rv'));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}

drawSky();
renderProgress();
bindControls();
setTime(0);
setMotion(motionOn);
initChrome();
formCtl = initSections({ reduced, getSelected: () => selected });
requestAnimationFrame(() => hero.classList.add('is-ready'));
initWorld();
