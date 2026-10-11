// PIXELVERSE — procedural miniature world ("The Drift").
// Pure scene-graph construction: no renderer, no DOM requirements (textures are optional).
import * as THREE from 'three';
import { LOCATIONS } from './data.js';

export const PAL = {
  void: 0x0D0B2A, ink: 0x140F38, pink: 0xFF5DA2, pinkLt: 0xFFA3CC, lilac: 0xB79CFF, cyan: 0x5DF2FF,
  sun: 0xFFE45D, grass: 0x34C7B4, grassLt: 0x86EDD3, grassDk: 0x1E9A97, soil: 0x6A3A78,
  rock1: 0x3D2F88, rock2: 0x2C226A, rock3: 0x4C3BA2, rock4: 0x221B56, stone: 0xCFC8EE,
  stoneDk: 0x8F87C4, white: 0xF7F3FF, wood: 0x96506F, lava: 0xFFB547, path: 0xF6D2E2, water: 0x5DF2FF
};

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- materials ----------
let GRADIENT = null;
function gradientMap() {
  if (GRADIENT) return GRADIENT;
  const data = new Uint8Array([60, 128, 200, 255]);
  GRADIENT = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  GRADIENT.minFilter = THREE.NearestFilter;
  GRADIENT.magFilter = THREE.NearestFilter;
  GRADIENT.generateMipmaps = false;
  GRADIENT.needsUpdate = true;
  return GRADIENT;
}

const cache = new Map();
function toon(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts });
  m.flatShading = true;
  cache.set(key, m);
  return m;
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x120D33, side: THREE.BackSide });
const NO_HIT = () => {};

function mesh(geo, mat, cast = true, receive = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// inverted-hull ink line, thickness roughly constant regardless of object size
function outline(m, t = 0.035) {
  m.geometry.computeBoundingSphere();
  const r = Math.max(m.geometry.boundingSphere.radius, 0.05);
  const o = new THREE.Mesh(m.geometry, OUTLINE);
  o.scale.setScalar(1 + t / r);
  o.raycast = NO_HIT;
  m.add(o);
  return m;
}

// radial jitter shared by every island stratum so silhouettes stay coherent
function jitter(a, amp, k) {
  return 1 + amp * (Math.sin(a * 3 + k) * 0.5 + Math.sin(a * 5 + k * 1.7) * 0.32 + Math.sin(a * 11 + k * 0.6) * 0.18);
}
function jitterGeo(geo, amp, k) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) < 1e-4) continue;
    const f = jitter(Math.atan2(z, x), amp, k);
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const ISLAND_R = 6.0, ISLAND_AMP = 0.06, ISLAND_K = 1.3;
export function edgeRadius(a) { return ISLAND_R * jitter(a, ISLAND_AMP, ISLAND_K); }
function polar(r, deg, y = 0) { const a = deg * DEG; return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); }

// ---------- textures (browser only) ----------
function stripeTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#5DF2FF'; g.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 3 ? 'rgba(255,255,255,0.55)' : 'rgba(30,120,200,0.45)';
    g.fillRect((i * 7) % 28, (i * 37) % 128, 3 + (i % 3), 30 + (i * 11) % 40);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function fadeTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#888'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

// ---------- island ----------
function buildIsland(lite) {
  const g = new THREE.Group();
  const seg = 18;
  const layers = [
    // [rTop, rBot, height, color, segments, amp]
    [ISLAND_R, ISLAND_R * 1.008, 0.34, PAL.grass, seg, ISLAND_AMP],
    [ISLAND_R * 1.008, ISLAND_R * 0.93, 0.55, PAL.soil, seg, ISLAND_AMP],
    [ISLAND_R * 0.93, 4.5, 1.05, PAL.rock3, 15, 0.08],
    [4.5, 3.1, 1.25, PAL.rock1, 13, 0.1],
    [3.1, 1.6, 1.35, PAL.rock2, 11, 0.12]
  ];
  let y = 0;
  layers.forEach(([rt, rb, h, col, s, amp], i) => {
    const geo = jitterGeo(new THREE.CylinderGeometry(rt, rb, h, s, 1), amp, ISLAND_K + i * 0.15);
    const m = mesh(geo, toon(col), i > 0, true);
    m.position.y = y - h / 2;
    m.userData.terrain = true;
    g.add(m);
    y -= h;
  });
  const tipGeo = jitterGeo(new THREE.ConeGeometry(1.6, 1.9, 9), 0.12, 2.2);
  tipGeo.rotateX(Math.PI);
  const tip = mesh(tipGeo, toon(PAL.rock4));
  tip.position.y = y - 0.95;
  g.add(tip);

  // strata seams: thin glowing veins
  const vein = new THREE.MeshBasicMaterial({ color: PAL.pink, transparent: true, opacity: 0.55 });
  [[-0.9, ISLAND_R * 0.932], [-1.95, 4.52]].forEach(([vy, vr]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(vr, 0.025, 4, 60), vein);
    t.rotation.x = Math.PI / 2; t.position.y = vy; t.raycast = NO_HIT;
    g.add(t);
  });

  // hanging crystals under the island
  const crystalMat = toon(PAL.cyan, { emissive: PAL.cyan, emissiveIntensity: 0.55 });
  const r = rng(7);
  const n = lite ? 5 : 9;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, rad = 1.2 + r() * 2.6;
    const c = mesh(new THREE.OctahedronGeometry(0.18 + r() * 0.2, 0), crystalMat, false, false);
    c.scale.y = 2.2 + r();
    const depth = -1.5 - (4.4 - rad) * 0.95 - r() * 0.4;
    c.position.set(Math.cos(a) * rad, depth, Math.sin(a) * rad);
    c.raycast = NO_HIT;
    g.add(c);
  }
  // roots
  const rootMat = toon(PAL.soil);
  for (let i = 0; i < (lite ? 6 : 12); i++) {
    const a = r() * TAU, rad = ISLAND_R * 0.9 * jitter(a, ISLAND_AMP, ISLAND_K);
    const len = 0.4 + r() * 0.9;
    const root = mesh(new THREE.ConeGeometry(0.06, len, 4), rootMat, false, false);
    root.rotation.x = Math.PI;
    root.position.set(Math.cos(a) * rad, -0.9 - len / 2, Math.sin(a) * rad);
    root.raycast = NO_HIT;
    g.add(root);
  }

  // surface dressing: knolls, boulders, stepping-stone paths, signpost plaza
  const knollMat = toon(PAL.grassLt);
  [[4.75, 31, 0.78], [4.75, 92, 0.7], [4.75, 152, 0.74], [4.75, 212, 0.66], [4.75, 272, 0.7], [4.75, 332, 0.62]].forEach(([rad, deg, s]) => {
    const k = mesh(new THREE.IcosahedronGeometry(s, 0), knollMat);
    k.scale.set(1, 0.32, 1);
    k.position.copy(polar(rad, deg, -0.05));
    g.add(k);
  });
  const boulderMat = toon(PAL.stone);
  for (let i = 0; i < 9; i++) {
    const a = r() * 360, rad = 1.5 + r() * 4;
    if (LOCATIONS.some((L) => Math.abs(((a - L.angle + 540) % 360) - 180) < 22 && Math.abs(rad - L.r) < L.tile + 0.4)) continue;
    const b = outline(mesh(new THREE.DodecahedronGeometry(0.14 + r() * 0.16, 0), boulderMat), 0.02);
    b.position.copy(polar(rad, a, 0.06));
    g.add(b);
  }
  const stoneMat = toon(PAL.path);
  LOCATIONS.forEach((L) => {
    const steps = Math.round((L.r - L.tile - 0.9) / 0.42);
    for (let i = 0; i <= steps; i++) {
      const rad = 0.95 + i * 0.42;
      const st = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 6), stoneMat, false, true);
      st.position.copy(polar(rad, L.angle + Math.sin(i * 1.7) * 4, 0.012));
      st.rotation.y = i;
      g.add(st);
    }
  });
  const plaza = mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.06, 12), toon(PAL.path), false, true);
  plaza.position.y = 0.02;
  g.add(plaza);
  const post = outline(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.0, 6), toon(PAL.wood)), 0.02);
  post.position.y = 0.52;
  g.add(post);
  [[0.82, 30, PAL.pink], [0.64, 150, PAL.cyan], [0.48, 260, PAL.sun]].forEach(([py, deg, col]) => {
    const arm = new THREE.Group();
    const board = outline(mesh(new THREE.BoxGeometry(0.42, 0.11, 0.03), toon(col)), 0.02);
    board.position.x = 0.2;
    arm.add(board);
    arm.position.y = py;
    arm.rotation.y = -deg * DEG;
    g.add(arm);
  });
  return g;
}

// ---------- location dioramas ----------
function tileFor(L, lift) {
  // a plug of island that rises with the location when it is selected
  const t = new THREE.Group();
  const top = mesh(new THREE.CylinderGeometry(L.tile, L.tile * 0.97, 0.16, 12), toon(PAL.grass), false, true);
  top.position.y = -0.07;
  const under = mesh(new THREE.CylinderGeometry(L.tile * 0.97, L.tile * 0.35, 0.9, 10), toon(PAL.rock3), false, false);
  under.position.y = -0.6;
  const soil = mesh(new THREE.CylinderGeometry(L.tile * 0.975, L.tile * 0.96, 0.12, 12), toon(PAL.soil), false, false);
  soil.position.y = -0.2;
  t.add(top, soil, under);
  under.visible = soil.visible = lift; // revealed only while lifted
  t.userData.underside = [under, soil];
  return t;
}

function lighthouse(L, ctx) {
  const g = new THREE.Group();
  const base = outline(mesh(new THREE.DodecahedronGeometry(0.8, 0), toon(PAL.stoneDk)));
  base.scale.set(1.25, 0.45, 1.1);
  base.position.y = 0.12;
  g.add(base);
  let y = 0.35;
  for (let i = 0; i < 4; i++) {
    const r0 = 0.46 - i * 0.055, r1 = r0 - 0.055, h = 0.55;
    const seg = outline(mesh(new THREE.CylinderGeometry(r1, r0, h, 10), toon(i % 2 ? PAL.white : PAL.pink)), 0.03);
    seg.position.y = y + h / 2;
    g.add(seg);
    y += h;
  }
  const gallery = outline(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 10), toon(PAL.ink)), 0.02);
  gallery.position.y = y + 0.04;
  const lantern = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), ctx.mats.lantern, false, false);
  lantern.position.y = y + 0.25;
  const roof = outline(mesh(new THREE.ConeGeometry(0.3, 0.34, 8), toon(PAL.pink)), 0.025);
  roof.position.y = y + 0.59;
  g.add(gallery, lantern, roof);

  const pivot = new THREE.Group();
  pivot.position.y = y + 0.25;
  const beamGeo = new THREE.ConeGeometry(0.75, 5.5, 18, 1, true);
  beamGeo.translate(0, -2.75, 0);
  beamGeo.rotateZ(Math.PI / 2);
  for (let k = 0; k < 2; k++) {
    const b = new THREE.Mesh(beamGeo, ctx.mats.beam);
    b.rotation.y = k * Math.PI;
    b.raycast = NO_HIT;
    pivot.add(b);
  }
  g.add(pivot);
  const lamp = new THREE.PointLight(PAL.sun, 0, 7, 1.6);
  lamp.position.y = y + 0.3;
  g.add(lamp);
  ctx.lamps.push(lamp);
  ctx.tick.push((t, dt) => { pivot.rotation.y += dt * 0.7; });
  return g;
}

function tree(col, s, r) {
  const t = new THREE.Group();
  const trunk = outline(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.36, 5), toon(PAL.wood)), 0.02);
  trunk.position.y = 0.18;
  const c1 = outline(mesh(new THREE.ConeGeometry(0.42, 0.72, 6), toon(col)), 0.03);
  c1.position.y = 0.62;
  const c2 = outline(mesh(new THREE.ConeGeometry(0.3, 0.56, 6), toon(col)), 0.03);
  c2.position.y = 0.98;
  c2.rotation.y = r() * 2;
  t.add(trunk, c1, c2);
  t.scale.setScalar(s);
  t.rotation.y = r() * TAU;
  return t;
}

function forest(L, ctx) {
  const g = new THREE.Group();
  const r = rng(11);
  const cols = [PAL.pink, PAL.pinkLt, PAL.lilac, PAL.pink, PAL.grassDk];
  const n = ctx.lite ? 7 : 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.5, rad = i === 0 ? 0 : 0.45 + r() * 0.85;
    const tr = tree(cols[i % cols.length], 0.7 + r() * 0.6 + (i === 0 ? 0.4 : 0), r);
    tr.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    g.add(tr);
  }
  // mushrooms
  for (let i = 0; i < 4; i++) {
    const a = r() * TAU, rad = 0.9 + r() * 0.4;
    const cap = outline(mesh(new THREE.SphereGeometry(0.09, 6, 4, 0, TAU, 0, Math.PI / 2), toon(PAL.sun)), 0.015);
    cap.position.set(Math.cos(a) * rad, 0.09, Math.sin(a) * rad);
    g.add(cap);
  }
  // fireflies
  const count = ctx.lite ? 16 : 28;
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = r() * TAU, rad = r() * 1.4;
    base.set([Math.cos(a) * rad, 0.3 + r() * 1.3, Math.sin(a) * rad], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const flies = new THREE.Points(geo, ctx.mats.fireflies);
  flies.raycast = NO_HIT;
  g.add(flies);
  ctx.tick.push((t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      p.setXYZ(i, base[i * 3] + Math.sin(t * 0.7 + i) * 0.12, base[i * 3 + 1] + Math.sin(t * 1.3 + i * 2.1) * 0.15, base[i * 3 + 2] + Math.cos(t * 0.6 + i) * 0.12);
    }
    p.needsUpdate = true;
  });
  return g;
}

function house(w, d, h, roofCol, ctx) {
  const g = new THREE.Group();
  const body = outline(mesh(new THREE.BoxGeometry(w, h, d), toon(PAL.white)), 0.025);
  body.position.y = h / 2;
  const roof = outline(mesh(new THREE.ConeGeometry(0.72, 0.5, 4), toon(roofCol)), 0.025);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w * 0.98, 1, d * 0.98);
  roof.position.y = h + 0.25;
  const win = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), ctx.mats.window, false, false);
  win.position.set(w * 0.2, h * 0.6, d / 2 + 0.011);
  const door = mesh(new THREE.BoxGeometry(0.13, 0.22, 0.02), toon(PAL.wood), false, false);
  door.position.set(-w * 0.18, 0.11, d / 2 + 0.011);
  g.add(body, roof, win, door);
  return g;
}

function windmill(scale, ctx, speed) {
  const g = new THREE.Group();
  const tower = outline(mesh(new THREE.CylinderGeometry(0.22, 0.36, 1.4, 6), toon(PAL.white)), 0.03);
  tower.position.y = 0.7;
  const cap = outline(mesh(new THREE.ConeGeometry(0.3, 0.36, 6), toon(PAL.pink)), 0.03);
  cap.position.y = 1.58;
  const win = mesh(new THREE.BoxGeometry(0.1, 0.14, 0.02), ctx.mats.window, false, false);
  win.position.set(0, 0.85, 0.3);
  const hub = new THREE.Group();
  hub.position.set(0, 1.35, 0.3);
  const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.03);
  bladeGeo.translate(0, 0.5, 0);
  const sailGeo = new THREE.BoxGeometry(0.2, 0.6, 0.015);
  sailGeo.translate(0.13, 0.62, 0);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.add(mesh(bladeGeo, toon(PAL.wood), true, false), mesh(sailGeo, toon(i % 2 ? PAL.sun : PAL.white), true, false));
    arm.rotation.z = i * Math.PI / 2;
    hub.add(arm);
  }
  g.add(tower, cap, win, hub);
  g.scale.setScalar(scale);
  ctx.tick.push((t, dt) => { hub.rotation.z += dt * speed; });
  return g;
}

function village(L, ctx) {
  const g = new THREE.Group();
  const out = L.angle * DEG;
  const face = Math.PI / 2 - out; // local +z faces away from the centre
  [[-0.55, 0.45, 0.55, 0.5, 0.5, PAL.pink], [0.35, 0.75, 0.5, 0.45, 0.42, PAL.cyan], [0.75, -0.15, 0.6, 0.48, 0.55, PAL.sun], [-0.2, -0.75, 0.46, 0.44, 0.4, PAL.pink]]
    .forEach(([x, z, w, d, h, c]) => {
      const hs = house(w, d, h, c, ctx);
      hs.position.set(x, 0, z);
      hs.rotation.y = face + Math.atan2(x, z) * 0.15;
      g.add(hs);
    });
  const big = windmill(1, ctx, 1.1);
  big.position.set(-0.1, 0, 0.05);
  big.rotation.y = face;
  const small = windmill(0.62, ctx, -1.6);
  small.position.set(-0.95, 0, -0.45);
  small.rotation.y = face + 0.4;
  const third = windmill(0.5, ctx, 1.9);
  third.position.set(1.05, 0, 0.55);
  third.rotation.y = face - 0.3;
  g.add(big, small, third);
  // fence of posts
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI + out + Math.PI * 0.5;
    const p = mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), toon(PAL.wood), false, true);
    p.position.set(Math.cos(a) * 1.45, 0.08, Math.sin(a) * 1.45);
    g.add(p);
  }
  return g;
}

function volcano(L, ctx) {
  const g = new THREE.Group();
  const bodyGeo = jitterGeo(new THREE.CylinderGeometry(0.42, 1.6, 2.0, 9, 2, true), 0.08, 0.4);
  const bodyMat = toon(PAL.rock3, { side: THREE.DoubleSide });
  const body = outline(mesh(bodyGeo, bodyMat), 0.04);
  body.position.y = 1.0;
  const snowGeo = jitterGeo(new THREE.CylinderGeometry(0.44, 0.78, 0.55, 9, 1, true), 0.08, 0.4);
  const rim = mesh(snowGeo, toon(PAL.rock1, { side: THREE.DoubleSide }));
  rim.position.y = 1.74;
  const lava = mesh(new THREE.CircleGeometry(0.42, 9), ctx.mats.lava, false, false);
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = 1.86;
  g.add(body, rim, lava);
  // lava rivulets running down the slope
  [0.3, 2.4, 4.3].forEach((a, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    const riv = mesh(new THREE.BoxGeometry(0.1, 0.8 - i * 0.12, 0.05), ctx.mats.lava, false, false);
    riv.position.set(0.66, 1.42 - i * 0.08, 0);
    riv.rotation.z = 0.52;
    pivot.add(riv);
    g.add(pivot);
  });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1, b = outline(mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.06, 0), toon(PAL.rock2)), 0.02);
    b.position.set(Math.cos(a) * 1.55, 0.08, Math.sin(a) * 1.55);
    g.add(b);
  }
  const glow = new THREE.PointLight(0xFF8A3C, 2.2, 6, 1.5);
  glow.position.y = 2.3;
  g.add(glow);
  ctx.glow = glow;
  // smoke puffs
  const puffs = [];
  const n = ctx.lite ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshToonMaterial({ color: PAL.stone, gradientMap: gradientMap(), transparent: true, opacity: 0.8, depthWrite: false });
    m.flatShading = true;
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), m);
    p.raycast = NO_HIT;
    g.add(p);
    puffs.push(p);
  }
  const place = (t) => {
    puffs.forEach((p, i) => {
      const k = (t * 0.18 + i / n) % 1;
      p.position.set(Math.sin(k * 3 + i) * 0.28, 2.0 + k * 2.3, Math.cos(k * 2 + i) * 0.2);
      p.scale.setScalar(0.5 + k * 1.6);
      p.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.25)) * 0.75;
      p.rotation.set(k * 2, i, k);
    });
  };
  place(0.6);
  ctx.tick.push(place);
  return g;
}

function falls(L, ctx) {
  const g = new THREE.Group();
  const a = L.angle * DEG;
  g.rotation.y = -a; // local +x points to the edge
  const edge = edgeRadius(a) - L.r;
  const pond = mesh(new THREE.CircleGeometry(0.62, 10), ctx.mats.waterFlat, false, true);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-0.45, 0.025, 0);
  const river = mesh(new THREE.PlaneGeometry(edge + 0.2, 0.42), ctx.mats.waterFlat, false, true);
  river.rotation.x = -Math.PI / 2;
  river.position.set((edge - 0.2) / 2, 0.026, 0);
  g.add(pond, river);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 7.5), ctx.mats.fall);
  sheet.rotation.y = Math.PI / 2;
  sheet.position.set(edge + 0.04, -3.73, 0);
  sheet.raycast = NO_HIT;
  const lip = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.46, 8, 1, false, 0, Math.PI / 2), ctx.mats.waterFlat, false, false);
  lip.rotation.x = Math.PI / 2;
  lip.position.set(edge - 0.08, -0.09, 0);
  g.add(sheet, lip);
  const r = rng(5);
  for (let i = 0; i < 7; i++) {
    const ang = r() * TAU, rad = 0.7 + r() * 0.35;
    const b = outline(mesh(new THREE.DodecahedronGeometry(0.1 + r() * 0.12, 0), toon(i % 2 ? PAL.stone : PAL.stoneDk)), 0.02);
    b.position.set(-0.45 + Math.cos(ang) * rad, 0.05, Math.sin(ang) * rad);
    g.add(b);
  }
  for (let i = 0; i < 6; i++) {
    const reed = mesh(new THREE.ConeGeometry(0.035, 0.42, 4), toon(PAL.grassLt), true, false);
    reed.position.set(-0.95 + r() * 0.3, 0.2, -0.45 + r() * 0.9);
    g.add(reed);
  }
  // spray drops falling past the edge
  const count = ctx.lite ? 14 : 26;
  const seeds = Array.from({ length: count }, () => [r(), r() - 0.5, r()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const drops = new THREE.Points(geo, ctx.mats.spray);
  drops.raycast = NO_HIT;
  g.add(drops);
  const tex = ctx.mats.fall.map;
  const place = (t) => {
    const p = geo.attributes.position;
    seeds.forEach(([s, z, d], i) => {
      const k = (t * 0.35 + s) % 1;
      p.setXYZ(i, edge + 0.12 + d * 0.25 + k * 0.4, -k * 6, z * 0.5);
    });
    p.needsUpdate = true;
    if (tex) tex.offset.y = t * 0.9;
  };
  place(0.3);
  ctx.tick.push(place);
  return g;
}

function ruins(L, ctx) {
  const g = new THREE.Group();
  const plat = outline(mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 14), toon(PAL.stone)), 0.025);
  plat.position.y = 0.06;
  g.add(plat);
  const heights = [1.35, 1.1, 0.5, 1.3, 1.2, 0.35, 1.0];
  heights.forEach((h, i) => {
    const a = (i / 7) * TAU;
    const p = outline(mesh(new THREE.BoxGeometry(0.22, h, 0.22), toon(i % 3 ? PAL.stone : PAL.stoneDk)), 0.025);
    p.position.set(Math.cos(a) * 0.95, 0.12 + h / 2, Math.sin(a) * 0.95);
    p.rotation.y = -a;
    g.add(p);
  });
  const lintel = outline(mesh(new THREE.BoxGeometry(0.85, 0.14, 0.24), toon(PAL.stoneDk)), 0.025);
  const a0 = (0 / 7) * TAU, a1 = (1 / 7) * TAU;
  lintel.position.set((Math.cos(a0) + Math.cos(a1)) / 2 * 0.95, 1.33, (Math.sin(a0) + Math.sin(a1)) / 2 * 0.95);
  lintel.rotation.y = -(a0 + a1) / 2 + Math.PI / 2;
  g.add(lintel);
  const crystal = outline(mesh(new THREE.OctahedronGeometry(0.3, 0), ctx.mats.crystal, false, false), 0.03);
  crystal.scale.y = 1.6;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.022, 6, 48), ctx.mats.halo);
  halo.raycast = NO_HIT;
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.016, 6, 40), ctx.mats.halo);
  halo2.raycast = NO_HIT;
  const holder = new THREE.Group();
  holder.add(crystal, halo, halo2);
  holder.position.y = 1.35;
  g.add(holder);
  const light = new THREE.PointLight(PAL.cyan, 1.4, 4.5, 1.6);
  light.position.y = 1.4;
  g.add(light);
  ctx.crystalLight = light;
  const place = (t) => {
    holder.position.y = 1.35 + Math.sin(t * 1.2) * 0.1;
    crystal.rotation.y = t * 0.8;
    halo.rotation.set(Math.PI / 2 + Math.sin(t * 0.5) * 0.4, t * 0.6, 0);
    halo2.rotation.set(Math.cos(t * 0.7) * 0.6, 0, t * 0.9);
  };
  place(0.4);
  ctx.tick.push(place);
  return g;
}

const BUILDERS = { beacon: lighthouse, hushwood: forest, gearwind: village, cinder: volcano, skyfall: falls, ring: ruins };

// ---------- ambient: airship, islets, clouds, stars ----------
function airship(ctx) {
  const g = new THREE.Group();
  const balloon = outline(mesh(new THREE.SphereGeometry(0.5, 12, 8), toon(PAL.pink)), 0.03);
  balloon.scale.set(1.9, 1, 1);
  const band = mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.16, 12, 1, true), toon(PAL.sun), false, false);
  band.rotation.z = Math.PI / 2;
  band.scale.set(1, 1, 1);
  const gond = outline(mesh(new THREE.BoxGeometry(0.55, 0.18, 0.26), toon(PAL.wood)), 0.025);
  gond.position.y = -0.62;
  const fin = outline(mesh(new THREE.BoxGeometry(0.34, 0.4, 0.04), toon(PAL.cyan)), 0.02);
  fin.position.set(-0.95, 0.1, 0);
  const fin2 = fin.clone();
  fin2.rotation.x = Math.PI / 2;
  const prop = new THREE.Group();
  prop.position.set(-0.4, -0.62, 0);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.BoxGeometry(0.02, 0.32, 0.05), toon(PAL.white), false, false);
    b.rotation.x = i * TAU / 3;
    prop.add(b);
  }
  [-0.3, 0.3].forEach((x) => {
    const rope = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 3), toon(PAL.ink), false, false);
    rope.position.set(x * 0.8, -0.42, 0);
    g.add(rope);
  });
  g.add(balloon, band, gond, fin, fin2, prop);
  g.traverse((o) => { o.raycast = NO_HIT; });
  const place = (t) => {
    const th = t * 0.09 + 1.2;
    g.position.set(Math.cos(th) * 9.2, 3.1 + Math.sin(t * 0.5) * 0.25, Math.sin(th) * 9.2);
    g.rotation.y = -th - Math.PI / 2;
    g.rotation.z = Math.sin(t * 0.7) * 0.05;
    prop.rotation.x = t * 12;
  };
  place(0);
  ctx.tick.push(place);
  return g;
}

function islet(rad, seed, extra, ctx) {
  const g = new THREE.Group();
  const top = mesh(jitterGeo(new THREE.CylinderGeometry(rad, rad * 0.92, 0.28, 10), 0.1, seed), toon(PAL.grass));
  top.position.y = -0.14;
  const body = mesh(jitterGeo(new THREE.ConeGeometry(rad * 0.92, rad * 1.7, 8), 0.12, seed + 1), toon(PAL.rock1));
  body.rotation.x = Math.PI;
  body.position.y = -0.28 - rad * 0.85;
  g.add(top, body);
  const r = rng(seed * 100);
  if (extra === 'tree') { const t = tree(PAL.pinkLt, 0.8, r); g.add(t); const t2 = tree(PAL.lilac, 0.55, r); t2.position.set(rad * 0.45, 0, 0.2); g.add(t2); }
  if (extra === 'crystal') { const c = outline(mesh(new THREE.OctahedronGeometry(0.22, 0), ctx.mats.crystal), 0.02); c.scale.y = 1.8; c.position.y = 0.4; g.add(c); }
  if (extra === 'hut') { const h = house(0.45, 0.4, 0.38, PAL.sun, ctx); g.add(h); }
  g.traverse((o) => { o.raycast = NO_HIT; });
  return g;
}

function clouds(ctx) {
  const g = new THREE.Group();
  const r = rng(21);
  const mats = [toon(PAL.white), toon(PAL.pinkLt)];
  const n = ctx.lite ? 5 : 9;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    const parts = 3 + Math.floor(r() * 3);
    for (let k = 0; k < parts; k++) {
      const p = mesh(new THREE.IcosahedronGeometry(0.45 + r() * 0.4, 0), mats[(i + k) % 5 === 0 ? 1 : 0], false, false);
      p.position.set((k - parts / 2) * 0.55, r() * 0.25, (r() - 0.5) * 0.5);
      p.scale.y = 0.7;
      c.add(p);
    }
    const a = (i / n) * TAU + r() * 0.4, rad = 10 + r() * 4;
    c.position.set(Math.cos(a) * rad, -4 + r() * 7.5, Math.sin(a) * rad);
    c.rotation.y = -a;
    c.scale.setScalar(0.8 + r() * 0.9);
    g.add(c);
  }
  g.traverse((o) => { o.raycast = NO_HIT; });
  ctx.tick.push((t, dt) => { g.rotation.y += dt * 0.012; });
  return g;
}

function stars(ctx) {
  const n = ctx.lite ? 320 : 700;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const r = rng(99);
  const tints = [new THREE.Color(PAL.white), new THREE.Color(PAL.cyan), new THREE.Color(PAL.pinkLt), new THREE.Color(PAL.sun)];
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * TAU, rad = 55 + r() * 30;
    const s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * s * rad, u * rad * 0.8 + 6, Math.sin(th) * s * rad], i * 3);
    const c = tints[r() < 0.7 ? 0 : 1 + Math.floor(r() * 3)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, ctx.mats.stars);
  p.raycast = NO_HIT;
  return p;
}

// ---------- assemble ----------
export function buildWorld({ lite = false } = {}) {
  const stripe = stripeTexture(), fade = fadeTexture();
  if (stripe) stripe.repeat.set(1, 3);
  const mats = {
    lantern: toon(PAL.sun, { emissive: PAL.sun, emissiveIntensity: 0.9 }),
    window: new THREE.MeshBasicMaterial({ color: PAL.sun }),
    lava: new THREE.MeshBasicMaterial({ color: PAL.lava }),
    crystal: toon(PAL.cyan, { emissive: PAL.cyan, emissiveIntensity: 0.7 }),
    halo: new THREE.MeshBasicMaterial({ color: PAL.pink, transparent: true, opacity: 0.85 }),
    beam: new THREE.MeshBasicMaterial({ color: PAL.sun, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    fireflies: new THREE.PointsMaterial({ color: PAL.sun, size: 0.09, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    spray: new THREE.PointsMaterial({ color: PAL.white, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false }),
    stars: new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
    waterFlat: toon(PAL.water, { emissive: 0x1B6E9C, emissiveIntensity: 0.35 }),
    fall: new THREE.MeshBasicMaterial({ color: 0xffffff, map: stripe, alphaMap: fade, transparent: true, opacity: stripe ? 0.92 : 0.55, depthWrite: false, side: THREE.DoubleSide })
  };
  if (!stripe) mats.fall.color.set(PAL.water);
  const ctx = { lite, mats, tick: [], lamps: [], glow: null, crystalLight: null };

  const root = new THREE.Group();
  const island = buildIsland(lite);
  root.add(island);

  const locations = LOCATIONS.map((L) => {
    const group = new THREE.Group();
    group.position.copy(polar(L.r, L.angle));
    group.userData.locId = L.id;
    const tile = tileFor(L, false);
    group.add(tile);
    const content = BUILDERS[L.id](L, ctx);
    group.add(content);
    root.add(group);
    // selection ring on the island surface where the diorama lifts from
    const ring = new THREE.Mesh(new THREE.RingGeometry(L.tile * 1.02, L.tile * 1.14, 40), new THREE.MeshBasicMaterial({ color: PAL.cyan, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(polar(L.r, L.angle, 0.03));
    ring.raycast = NO_HIT;
    root.add(ring);
    return { L, id: L.id, group, tile, ring, lift: 0, vel: 0, target: 0, base: group.position.clone() };
  });

  const ship = airship(ctx);
  root.add(ship);
  const islets = [islet(1.2, 3, 'tree', ctx), islet(0.9, 4, 'crystal', ctx), islet(1.0, 6, 'hut', ctx)];
  [[-9.5, -1.6, 3.5], [8.2, -2.6, -5.2], [2.5, -3.9, 9.6]].forEach((p, i) => { islets[i].position.set(...p); root.add(islets[i]); });
  ctx.tick.push((t) => islets.forEach((s, i) => { s.position.y = [-1.6, -2.6, -3.9][i] + Math.sin(t * 0.6 + i * 2) * 0.22; s.rotation.y = t * 0.05 * (i % 2 ? -1 : 1); }));
  root.add(clouds(ctx));
  const sky = stars(ctx);
  root.add(sky);

  let time = 0;
  function update(dt, animate, snap = false) {
    if (animate) {
      time += dt;
      for (const f of ctx.tick) f(time, dt);
    }
    // spring-driven diorama lift (slight overshoot = "pop")
    locations.forEach((o) => {
      if (snap) { o.lift = o.target; o.vel = 0; } else {
        const k = 140, c = 15;
        const acc = k * (o.target - o.lift) - c * o.vel;
        o.vel += acc * Math.min(dt, 0.05);
        o.lift += o.vel * Math.min(dt, 0.05);
      }
      const l = Math.max(-0.2, o.lift);
      o.group.position.y = o.base.y + l * 0.95;
      o.group.scale.setScalar(1 + l * 0.22);
      o.group.rotation.y = (animate ? Math.sin(time * 0.8) * 0.06 * Math.max(0, l) : 0);
      const show = l > 0.04;
      o.tile.userData.underside.forEach((m) => { m.visible = show; });
      o.ring.material.opacity = Math.min(0.9, Math.max(0, o.target) * (0.55 + (animate ? Math.sin(time * 3) * 0.3 : 0.2)));
      o.ring.scale.setScalar(1 + (animate ? (time * 0.6) % 1 * 0.12 : 0));
    });
    return locations.some((o) => Math.abs(o.target - o.lift) > 0.002 || Math.abs(o.vel) > 0.002);
  }

  // hit-testing helper: walk up to the location group
  function locOf(obj) {
    let o = obj;
    while (o) { if (o.userData && o.userData.locId) return o.userData.locId; o = o.parent; }
    return null;
  }

  return { root, island, locations, update, locOf, mats, lamps: ctx.lamps, glow: ctx.glow, crystalLight: ctx.crystalLight, stars: sky, edgeRadius };
}
