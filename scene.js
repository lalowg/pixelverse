// PIXELVERSE — renderer, camera flights, picking, HUD marker projection and time of day.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { LOCATIONS } from './data.js';

const TIME_PRESETS = {
  dusk: { sky: 0xFFB0D6, ground: 0x2A1E5C, hemi: 1.55, sun: 0xFFD08A, sunI: 2.7, sunPos: [8, 9, 7], rim: 0x5DF2FF, rimI: 1.3, lamp: 1.6, stars: 0.55, glow: 2.2 },
  night: { sky: 0x7180FF, ground: 0x120D33, hemi: 0.95, sun: 0xA9C6FF, sunI: 1.25, sunPos: [-7, 12, 5], rim: 0xFF5DA2, rimI: 1.1, lamp: 5.5, stars: 1.0, glow: 3.4 },
  dawn: { sky: 0xFFF0BD, ground: 0x4A2F6E, hemi: 1.9, sun: 0xFFE45D, sunI: 3.0, sunPos: [10, 5.5, -5], rim: 0xFF5DA2, rimI: 0.9, lamp: 0.0, stars: 0.18, glow: 1.6 }
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) { return false; }
}

export function createScene({ canvas, host, markerEls, reduced, onSelect, onHover, onFail }) {
  const small = Math.min(innerWidth, innerHeight) < 600 || innerWidth < 760;
  const lite = small || (navigator.hardwareConcurrency || 8) <= 4;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(small ? 42 : 34, 1, 0.1, 220);
  const world = buildWorld({ lite });
  scene.add(world.root);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = !lite;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(hemi, sun, sun.target, rim);

  const light = { cur: null, from: null, to: null, t: 1 };
  const snapshot = (p) => ({ sky: new THREE.Color(p.sky), ground: new THREE.Color(p.ground), hemi: p.hemi, sun: new THREE.Color(p.sun), sunI: p.sunI, sunPos: new THREE.Vector3(...p.sunPos), rim: new THREE.Color(p.rim), rimI: p.rimI, lamp: p.lamp, stars: p.stars, glow: p.glow });
  function applyLight(s) {
    hemi.color.copy(s.sky); hemi.groundColor.copy(s.ground); hemi.intensity = s.hemi;
    sun.color.copy(s.sun); sun.intensity = s.sunI; sun.position.copy(s.sunPos);
    rim.color.copy(s.rim); rim.intensity = s.rimI; rim.position.set(-s.sunPos.x, 4, -s.sunPos.z);
    world.lamps.forEach((l) => { l.intensity = s.lamp; });
    world.mats.beam.opacity = 0.05 + s.lamp * 0.03;
    world.mats.stars.opacity = s.stars;
    world.mats.window.color.setHex(0xFFE45D).multiplyScalar(0.55 + Math.min(1, s.lamp / 4) * 0.45);
    if (world.glow) world.glow.intensity = s.glow;
  }
  light.cur = snapshot(TIME_PRESETS.dusk);
  applyLight(light.cur);

  // camera rig
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.95;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 0.35;
  if (coarse) canvas.style.touchAction = 'pan-y'; // vertical swipes keep scrolling the page

  const overview = () => {
    const r = small ? 30 : 23;
    const az = (220 * Math.PI) / 180, pol = 1.08;
    return {
      target: new THREE.Vector3(0, -0.8, 0),
      pos: new THREE.Vector3(Math.sin(pol) * Math.cos(az) * r, Math.cos(pol) * r - 0.8, Math.sin(pol) * Math.sin(az) * r)
    };
  };
  const ov = overview();
  camera.position.copy(ov.pos);
  controls.target.copy(ov.target);

  let size = { w: 1, h: 1 };
  const shift = { x: 0, y: 0, tx: 0, ty: 0 };
  function applyView() {
    camera.aspect = size.w / size.h;
    camera.setViewOffset(size.w, size.h, -shift.x * size.w, shift.y * size.h, size.w, size.h);
    camera.updateProjectionMatrix();
  }
  function resize() {
    const r = host.getBoundingClientRect();
    size = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
    renderer.setSize(size.w, size.h, false);
    applyView();
    dirty = true;
  }

  // state
  let selected = null, hovered = null, motion = !reduced, visible = true, dirty = true, raf = 0, last = performance.now();
  let flight = null, lastInteract = performance.now();

  function setShiftTargets() {
    const wide = size.w >= 980;
    if (selected) { shift.tx = wide ? -0.02 : 0; shift.ty = wide ? 0 : 0.2; }
    else { shift.tx = wide ? 0.13 : 0; shift.ty = wide ? 0 : 0.02; }
    if (reduced) { shift.x = shift.tx; shift.y = shift.ty; applyView(); }
  }

  function flyTo(target, pos, dur = 1.4, arc = 1.6) {
    if (reduced || dur === 0) {
      controls.target.copy(target); camera.position.copy(pos); controls.update(); flight = null; dirty = true; return;
    }
    flight = { t: 0, dur, arc, t0: controls.target.clone(), t1: target.clone(), p0: camera.position.clone(), p1: pos.clone() };
    controls.enabled = false;
  }

  function focusFor(id) {
    const L = LOCATIONS.find((l) => l.id === id);
    const a = (L.angle * Math.PI) / 180;
    const c = new THREE.Vector3(Math.cos(a) * L.r, L.focusY * 1.22 + 0.95, Math.sin(a) * L.r);
    const elev = 0.44, d = L.dist * (size.w < 700 ? 1.3 : 1);
    // look from outside the island, nudged toward the current azimuth so flights feel continuous
    const camAz = Math.atan2(camera.position.z, camera.position.x);
    let diff = Math.atan2(Math.sin(camAz - a), Math.cos(camAz - a));
    const az = a + Math.max(-0.5, Math.min(0.5, diff * 0.35));
    const pos = new THREE.Vector3(c.x + Math.cos(az) * Math.cos(elev) * d, c.y + Math.sin(elev) * d, c.z + Math.sin(az) * Math.cos(elev) * d);
    return { target: c, pos };
  }

  function select(id, { fly = true } = {}) {
    selected = id;
    world.locations.forEach((o) => { o.target = o.id === id ? 1 : 0; });
    if (fly) {
      if (id) { const f = focusFor(id); flyTo(f.target, f.pos); }
      else { const o = overview(); flyTo(o.target, o.pos, 1.5, 2.4); }
    }
    controls.autoRotate = false;
    lastInteract = performance.now();
    setShiftTargets();
    dirty = true;
  }

  function orbitBy(dAz, dPol) {
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dAz;
    sph.phi = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, sph.phi + dPol));
    flyTo(controls.target.clone(), controls.target.clone().add(new THREE.Vector3().setFromSpherical(sph)), 0.55, 0);
    lastInteract = performance.now();
  }
  function zoomBy(f) {
    const off = camera.position.clone().sub(controls.target);
    const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * f));
    flyTo(controls.target.clone(), controls.target.clone().add(off.setLength(len)), 0.45, 0);
    lastInteract = performance.now();
  }

  function setTime(name) {
    const to = snapshot(TIME_PRESETS[name] || TIME_PRESETS.dusk);
    if (reduced) { light.cur = to; applyLight(to); light.t = 1; dirty = true; return; }
    light.from = { ...light.cur, sky: light.cur.sky.clone(), ground: light.cur.ground.clone(), sun: light.cur.sun.clone(), sunPos: light.cur.sunPos.clone(), rim: light.cur.rim.clone() };
    light.to = to; light.t = 0;
  }
  function stepLight(dt) {
    if (light.t >= 1) return false;
    light.t = Math.min(1, light.t + dt / 1.3);
    const k = easeInOut(light.t), f = light.from, t = light.to, c = light.cur;
    c.sky.copy(f.sky).lerp(t.sky, k); c.ground.copy(f.ground).lerp(t.ground, k); c.sun.copy(f.sun).lerp(t.sun, k);
    c.rim.copy(f.rim).lerp(t.rim, k); c.sunPos.copy(f.sunPos).lerp(t.sunPos, k);
    for (const key of ['hemi', 'sunI', 'rimI', 'lamp', 'stars', 'glow']) c[key] = f[key] + (t[key] - f[key]) * k;
    applyLight(c);
    return true;
  }

  // picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = world.locations.map((o) => o.group);
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, true).find((h) => h.object.visible);
    return hit ? world.locOf(hit.object) : null;
  }
  let down = null;
  let lastDown = -1e9;
  // the wheel only zooms after the visitor has engaged the island (or with Ctrl/Cmd), so page scrolling never gets trapped
  host.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey || performance.now() - lastDown < 4000)) e.stopPropagation();
  }, { capture: true, passive: true });
  canvas.addEventListener('pointerdown', (e) => { lastDown = performance.now(); down = { x: e.clientX, y: e.clientY, t: performance.now() }; lastInteract = performance.now(); controls.autoRotate = false; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    down = null;
    if (moved < 7 && quick) { const id = pick(e.clientX, e.clientY); if (id) onSelect(id); }
  });
  let hoverQueued = null;
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') hoverQueued = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerleave', () => { hoverQueued = null; setHover(null); });
  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = id ? 'pointer' : '';
    world.locations.forEach((o) => { if (o.id !== selected) o.target = o.id === id ? 0.14 : 0; });
    onHover && onHover(id);
    dirty = true;
  }
  controls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { lastInteract = performance.now(); controls.autoRotate = false; });

  // marker projection
  const v = new THREE.Vector3();
  const anchors = world.locations.map((o) => ({ o, L: o.L, el: markerEls[o.id] }));
  function placeMarkers() {
    const camXZ = new THREE.Vector2(camera.position.x, camera.position.z).normalize();
    const pol = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)).phi;
    anchors.forEach(({ o, L, el }) => {
      if (!el) return;
      v.set(0, L.anchorY, 0);
      o.group.localToWorld(v);
      const facing = new THREE.Vector2(v.x, v.z).normalize().dot(camXZ);
      const distToCam = v.distanceTo(camera.position);
      v.project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15;
      const behind = camera.position.y < -0.6 || (facing < -0.35 && pol > 0.95);
      el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * size.w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.h).toFixed(1)}px, 0)`;
      el.style.zIndex = String(100 - Math.round(distToCam));
      el.classList.toggle('is-behind', behind && o.id !== selected);
      el.classList.toggle('is-off', off);
    });
  }

  // loop
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (hoverQueued) { setHover(pick(hoverQueued[0], hoverQueued[1])); hoverQueued = null; }
    let busy = false;
    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.dur);
      const k = easeInOut(flight.t);
      controls.target.lerpVectors(flight.t0, flight.t1, k);
      camera.position.lerpVectors(flight.p0, flight.p1, k);
      camera.position.y += Math.sin(Math.PI * k) * flight.arc;
      if (flight.t >= 1) { flight = null; controls.enabled = true; }
      busy = true;
    }
    if (Math.abs(shift.x - shift.tx) > 0.0005 || Math.abs(shift.y - shift.ty) > 0.0005) {
      shift.x += (shift.tx - shift.x) * Math.min(1, dt * 4);
      shift.y += (shift.ty - shift.y) * Math.min(1, dt * 4);
      applyView();
      busy = true;
    }
    controls.autoRotate = motion && !selected && !flight && now - lastInteract > 5000;
    const ctrl = controls.update();
    const spring = world.update(dt, motion, reduced);
    const lit = stepLight(dt);
    if (motion || busy || ctrl || spring || lit || dirty) {
      renderer.render(scene, camera);
      placeMarkers();
      dirty = false;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting && !document.hidden;
    visible ? start() : stop();
  }, { threshold: 0.01 });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && host.getBoundingClientRect().bottom > 0;
    visible ? start() : stop();
  });
  new ResizeObserver(resize).observe(host);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); onFail && onFail(); });

  resize();
  setShiftTargets();
  shift.x = shift.tx; shift.y = shift.ty;
  applyView();
  controls.update();
  renderer.render(scene, camera);
  placeMarkers();
  start();

  return {
    select,
    rotate: (dir) => orbitBy(dir * 0.42, 0),
    tilt: (dir) => orbitBy(0, dir * 0.18),
    zoom: (dir) => zoomBy(dir > 0 ? 0.8 : 1.25),
    reset: () => select(null),
    setTime,
    setMotion: (on) => { motion = on; dirty = true; start(); },
    celebrate: () => { if (world.crystalLight) world.crystalLight.intensity = 3.2; world.mats.halo.color.setHex(0xFFE45D); dirty = true; },
    get selected() { return selected; }
  };
}
