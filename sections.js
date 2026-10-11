// PIXELVERSE — below-the-fold sections: isometric pipeline, pixel covers, class select, save form.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- pixel renderer (row-run merged rects) ----------
export function pixelSVG(w, h, colorAt, cls = '') {
  let out = '';
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = colorAt(x, y);
      let run = 1;
      while (x + run < w && colorAt(x + run, y) === c) run++;
      if (c) out += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">${out}</svg>`;
}

const SPRITE_PAL = { k: '#120D33', s: '#E8A57E', t: '#8D5A3B', p: '#FF5DA2', c: '#5DF2FF', y: '#FFE45D', w: '#F7F3FF', v: '#5A45C2', b: '#96506F', g: '#34C7B4', o: '#FFB547', l: '#B79CFF' };
const SPRITES = {
  worldsmith: ['................', '.....kkkkkk.....', '....kyyyyyyk....', '...kyyyyyyyyk...', '..kkkkkkkkkkkk..', '....kssssssk....', '....kskssksk....', '....kssssssk....', '.....ksppsk.....', '...kkkccccckk...', '..kccckccckcck..', '..ksckccccckskkk', '..kskcccccckkggk', '...kkvvvvvvkkggk', '....kvvkkvvk.kkk', '....kkk..kkk....'],
  lorekeeper: ['......kkkk......', '.....kllllk.....', '....kllllllk....', '...kllkkkkllk...', '...klkttttklk...', '...klktkktklk...', '...klkttttklk...', '...kllkttkllk...', '..kllllkkllllk..', '..kllllllllllk..', '..kllkwwwwkllk..', '..klkwwkwwwklk..', '..klkwwkwwwklk..', '..kllkkkkkkllk..', '...klllllllllk..', '...kkkkkkkkkkk..'],
  tinker: ['................', '.....kkkkkk.....', '....kooooook....', '...kkkkkkkkkk...', '...kcckkkkcck...', '...kcwkkkkwck...', '....kssssssk....', '....kssssssk....', '.....ksppsk.....', '...kkkvvvvvkk.kk', '..kvvkvvvvvkkkwk', '..ksvkvyyvvksskk', '..kskvvvvvvkskk.', '...kkbbbbbbkk...', '....kbbkkbbk....', '....kkk..kkk....'],
  bard: ['..........yy....', '.........yyk....', '....kkkkkkk.....', '...kpppppppk....', '..kkkkkkkkkkk...', '....kssssssk....', '....kskssksk....', '....kssssssk....', '.....kssssk.....', '...kkggggggkk...', '..kggkbbbbkggk..', '..ksgkbkkbkgsk..', '..kskbbbbbbksk..', '...kkkbbbbkkk...', '....kggkkggk....', '....kkk..kkk....']
};
export function sprite(name, cls = 'sprite-svg') {
  const rows = SPRITES[name];
  return pixelSVG(16, 16, (x, y) => SPRITE_PAL[rows[y][x]] || null, cls);
}

// ---------- pixel cover art ----------
const hash = (x, y, s = 1) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const band = (y, stops, x) => { // dithered vertical bands
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, c0] = stops[i], [y1] = stops[i + 1];
    if (y < y1) return y === y1 - 1 && (x + y) % 2 ? stops[i + 1][1] : c0;
  }
  return stops[stops.length - 1][1];
};
const COVERS = [
  (x, y) => { // Driftlight
    const W = 48;
    const dx = x - 24, dy = y - 17;
    if (y > 13 && y < 22 && Math.abs(dx) < 9 - Math.max(0, y - 17) * 0.4 && dx * dx + dy * dy < 64) {
      if (y >= 19 && y % 2 === 1) return '#FF5DA2';
      return y < 16 ? '#FFE45D' : '#FFB547';
    }
    const islandTop = 21;
    const half = 13 - (y - islandTop) * 1.6;
    if (y === islandTop && Math.abs(x - 22) < 13) return '#5DF2FF';
    if (y > islandTop && Math.abs(x - 22) < half) return y - islandTop < 2 ? '#5A45C2' : y - islandTop < 4 ? '#3D2F88' : '#2C226A';
    if (x === 31 && y > 14 && y < islandTop) return y % 2 ? '#FF5DA2' : '#F7F3FF';
    if (x === 31 && y === 14) return '#FFE45D';
    if (y === 14 && x > 31 && x < 40 && (x + y) % 2) return '#FFE45D';
    if (x === 33 && y > islandTop && y < 30 && (y % 3)) return '#5DF2FF';
    if (y < 14 && hash(x, y, 3) > 0.965) return '#F7F3FF';
    return band(y, [[0, '#0D0B2A'], [6, '#1C1650'], [11, '#3A1F6B'], [16, '#6B2A73'], [22, '#2A1659'], [30, '#0D0B2A']], x);
  },
  (x, y) => { // Undertide
    if (y < 5) return y === 4 ? ((x % 4 < 2) ? '#5DF2FF' : '#B9FBFF') : band(y, [[0, '#1C1650'], [3, '#2A2A80']], x);
    const towers = [[6, 3, 12], [12, 2, 17], [30, 4, 10], [37, 3, 15], [43, 2, 19]];
    for (const [tx, tw, top] of towers) {
      if (x >= tx && x < tx + tw && y >= top) return (y + x) % 5 === 0 && y > top + 1 ? '#FFE45D' : '#0B2A40';
      if (x >= tx && x < tx + tw && y === top - 1 && tw > 2) return '#0B2A40';
    }
    const lanterns = [[20, 14], [24, 19], [17, 22], [27, 12]];
    for (const [lx, ly] of lanterns) {
      const d = Math.abs(x - lx) + Math.abs(y - ly);
      if (d === 0) return '#FFE45D';
      if (d === 1) return '#FFB547';
      if (d === 2 && (x + y) % 2) return '#1E6F7A';
    }
    if (hash(x, y, 7) > 0.97) return '#5DF2FF';
    if (y > 27) return (x + y) % 3 ? '#08202F' : '#0B2A40';
    return band(y, [[5, '#145a78'], [10, '#0F4462'], [17, '#0B3350'], [24, '#08243A'], [30, '#061826']], x);
  },
  (x, y) => { // Neon Orchard
    const domeCx = 24, domeCy = 18, r = 12;
    const dx = x - domeCx, dy = y - domeCy;
    const inDome = dy <= 0 && dx * dx + dy * dy <= r * r;
    if (inDome) {
      if (dx * dx + dy * dy > (r - 1) * (r - 1)) return '#5DF2FF';
      if (x % 6 === 0 || (y % 5 === 0)) return '#2A7C8C';
      const fruit = [[19, 12, '#FF5DA2'], [27, 10, '#FFE45D'], [23, 15, '#FF5DA2'], [30, 15, '#FFE45D'], [16, 16, '#FFE45D']];
      for (const [fx, fy, c] of fruit) if (Math.abs(x - fx) + Math.abs(y - fy) <= 1) return c;
      if (y > 14 && (x * 7 + y) % 4 === 0) return '#34C7B4';
      return '#13304A';
    }
    if (y >= 18 && y < 20 && x > 9 && x < 39) return '#5A45C2';
    const sky = [[0, 2, 30], [3, 5, 22], [8, 4, 26], [39, 4, 21], [43, 5, 25]];
    for (const [bx, bw, top] of sky) if (x >= bx && x < bx + bw && y >= top) return (x + y * 2) % 4 === 0 && y < 29 ? '#FFE45D' : '#1C1650';
    if (y >= 20) return (x + y) % 5 === 0 ? '#FF5DA2' : '#221B56';
    if (hash(x, y, 9) > 0.975) return '#F7F3FF';
    return band(y, [[0, '#0D0B2A'], [8, '#1C1650'], [14, '#3A1F6B'], [20, '#5A2A7C']], x);
  },
  (x, y) => { // Empty slot
    const plus = (Math.abs(x - 24) < 2 && Math.abs(y - 15) < 7) || (Math.abs(y - 15) < 2 && Math.abs(x - 24) < 7);
    if (plus) return '#FFE45D';
    const n = hash(x >> 1, y >> 1, 13);
    return n > 0.82 ? '#2C2670' : '#161244';
  }
];
export const cover = (i) => pixelSVG(48, 30, COVERS[i], 'cover-svg');

// ---------- isometric build-up for the pipeline ----------
const U = 18, VH = 9, ZH = 20;
const P = (x, y, z) => [(x - y) * U, (x + y) * VH - z * ZH];
const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * f)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
const STROKE = 'stroke="#120D33" stroke-width="1.4" stroke-linejoin="round"';
function box(x0, y0, z0, x1, y1, z1, col, topCol) {
  const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  const right = [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)];
  const left = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
  return `<polygon points="${right.map(pt).join(' ')}" fill="${shade(col, 0.78)}" ${STROKE}/>` +
    `<polygon points="${left.map(pt).join(' ')}" fill="${shade(col, 0.6)}" ${STROKE}/>` +
    `<polygon points="${top.map(pt).join(' ')}" fill="${topCol || col}" ${STROKE}/>`;
}
const LAYERS = [[0, 3.25, '#34C7B4'], [-1, 2.95, '#6A3A78'], [-2, 2.25, '#4C3BA2'], [-3, 1.5, '#3D2F88'], [-4, 0.75, '#2C226A']];
const inMask = (x, y, R) => Math.hypot(x, y) <= R + (((x * 7 + y * 13) % 3 + 3) % 3 === 0 ? -0.55 : 0);

function isoStage(stage) {
  const items = [];
  const add = (x, y, z, svg) => items.push({ k: (x + y) * 100 + z * 2, svg });
  const pond = new Set(['2,1', '2,2', '1,2']);
  const path = new Set(['0,0', '1,0', '0,1', '-1,1', '1,-1', '-1,2', '2,0']);
  const cells = (z, R) => { if (stage === 1) return [[0, 0]]; const out = []; for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) if (inMask(x, y, R)) out.push([x, y]); return out; };
  const solid = new Set();
  const layers = stage === 1 ? [[0, 0.2, '#34C7B4'], [-1, 0.2, '#6A3A78']] : LAYERS;
  layers.forEach(([z, R]) => cells(z, R).forEach(([x, y]) => solid.add(`${x},${y},${z}`)));
  layers.forEach(([z, R, col]) => cells(z, R).forEach(([x, y]) => {
    if (solid.has(`${x + 1},${y},${z}`) && solid.has(`${x},${y + 1},${z}`) && solid.has(`${x},${y},${z + 1}`)) return;
    let top = null;
    if (z === 0 && stage >= 3 && pond.has(`${x},${y}`)) top = '#5DF2FF';
    if (z === 0 && stage >= 6 && path.has(`${x},${y}`)) top = '#FFE45D';
    add(x, y, z, box(x, y, z, x + 1, y + 1, z + 1, col, top));
  }));
  if (stage >= 3) {
    // waterfall over the +x edge of the pond
    const f = [P(3, 2.15, 1), P(3, 2.85, 1), P(3.15, 2.85, -4.5), P(3.15, 2.15, -4.5)];
    add(3, 2, 2, `<polygon points="${f.map(pt).join(' ')}" fill="url(#iso-fall)"/>`);
    [[-2, -2, '#FF5DA2', 1], [-3, -1, '#FFA3CC', 0.85], [-1, -3, '#B79CFF', 0.9], [-2, 0, '#FF5DA2', 0.75], [-3, 1, '#B79CFF', 0.7]].forEach(([x, y, c, s]) => {
      const [bx, by] = P(x + 0.5, y + 0.5, 1);
      const h = 40 * s, w = 13 * s;
      add(x, y, 1, `<rect x="${(bx - 2).toFixed(1)}" y="${(by - 8).toFixed(1)}" width="4" height="8" fill="#96506F" ${STROKE}/>` +
        `<polygon points="${pt([bx - w, by - 7])} ${pt([bx + w, by - 7])} ${pt([bx, by - h])}" fill="${c}" ${STROKE}/>` +
        `<polygon points="${pt([bx, by - 7])} ${pt([bx + w, by - 7])} ${pt([bx, by - h])}" fill="${shade(c, 0.8)}"/>`);
    });
  }
  if (stage >= 4) {
    [[2, -2, '#FF5DA2'], [3, -1, '#5DF2FF']].forEach(([x, y, roof]) => {
      const a = P(x + 0.5, y + 0.5, 1.95), r1 = P(x + 0.88, y + 0.12, 1.55), r2 = P(x + 0.88, y + 0.88, 1.55), r3 = P(x + 0.12, y + 0.88, 1.55);
      add(x, y, 1, box(x + 0.15, y + 0.15, 1, x + 0.85, y + 0.85, 1.55, '#F7F3FF') +
        `<polygon points="${pt(a)} ${pt(r1)} ${pt(r2)}" fill="${shade(roof, 0.8)}" ${STROKE}/><polygon points="${pt(a)} ${pt(r2)} ${pt(r3)}" fill="${roof}" ${STROKE}/>`);
    });
    const [hx, hy] = P(1.5, -2.2, 2.55);
    let blades = '';
    for (let i = 0; i < 4; i++) blades += `<g transform="rotate(${45 + i * 90} ${hx.toFixed(1)} ${hy.toFixed(1)})"><rect x="${(hx - 1.5).toFixed(1)}" y="${(hy - 26).toFixed(1)}" width="3" height="26" fill="#96506F"/><rect x="${(hx + 1.5).toFixed(1)}" y="${(hy - 24).toFixed(1)}" width="7" height="16" fill="${i % 2 ? '#FFE45D' : '#F7F3FF'}" ${STROKE}/></g>`;
    const a = P(1.5, -2.5, 3.1), b1 = P(1.78, -2.78, 2.6), b2 = P(1.78, -2.22, 2.6), b3 = P(1.22, -2.22, 2.6);
    add(1, -3, 1, box(1.22, -2.78, 1, 1.78, -2.22, 2.6, '#F7F3FF') + `<polygon points="${pt(a)} ${pt(b1)} ${pt(b2)}" fill="#D94A8A" ${STROKE}/><polygon points="${pt(a)} ${pt(b2)} ${pt(b3)}" fill="#FF5DA2" ${STROKE}/>` + `<g class="iso-blades">${blades}</g>`);
  }
  if (stage >= 5) {
    [[-3, 2, 2.4], [-2, 3, 1.5], [-1, 2, 2.2], [-2, 1, 2.0]].forEach(([x, y, h]) => {
      if (!inMask(x, y, 3.25)) return;
      add(x, y, 1, box(x + 0.32, y + 0.32, 1, x + 0.68, y + 0.68, h, '#CFC8EE'));
    });
    const [cx, cy] = P(-1.5, 2.5, 3.4);
    add(-1, 3, 6, `<ellipse cx="${cx.toFixed(1)}" cy="${(cy + 4).toFixed(1)}" rx="18" ry="5" fill="none" stroke="#FF5DA2" stroke-width="2.4"/>` +
      `<polygon points="${pt([cx, cy - 16])} ${pt([cx + 9, cy + 2])} ${pt([cx, cy + 20])} ${pt([cx - 9, cy + 2])}" fill="#5DF2FF" ${STROKE}/><polygon points="${pt([cx, cy - 16])} ${pt([cx + 9, cy + 2])} ${pt([cx, cy + 2])}" fill="#B9FBFF"/>`);
  }
  if (stage >= 6) {
    const [px, py] = P(0.5, 0.5, 1);
    const hero = ['.kkk.', 'kyyyk', '.kkk.', 'kpppk', '.ppp.', '.k.k.'];
    let s = '';
    hero.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') s += `<rect x="${(px - 7.5 + i * 3).toFixed(1)}" y="${(py - 19 + j * 3).toFixed(1)}" width="3" height="3" fill="${{ k: '#120D33', y: '#E8A57E', p: '#FF5DA2' }[ch]}"/>`; }));
    add(0, 0, 3, `<g shape-rendering="crispEdges">${s}</g>`);
    const [fx, fy] = P(2.5, 0.5, 1);
    add(2, 0, 2, `<rect x="${(fx - 1).toFixed(1)}" y="${(fy - 30).toFixed(1)}" width="2" height="30" fill="#120D33"/><polygon points="${pt([fx + 1, fy - 30])} ${pt([fx + 15, fy - 25])} ${pt([fx + 1, fy - 20])}" fill="#FF5DA2" ${STROKE}/>`);
  }
  if (stage === 1) {
    const [sx, sy] = P(0.5, 0.5, 1);
    add(0, 0, 3, `<circle cx="${sx}" cy="${sy - 10}" r="3" fill="#FFE45D"/><circle cx="${sx}" cy="${sy - 10}" r="9" fill="none" stroke="#FFE45D" stroke-width="1.2" opacity=".5"/>`);
  }
  items.sort((a, b) => a.k - b.k);
  return items.map((i) => i.svg).join('');
}
export function iso(stage) {
  return `<svg class="iso-svg" viewBox="-150 -110 300 240" aria-hidden="true" focusable="false">
    <defs><linearGradient id="iso-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5DF2FF"/><stop offset="1" stop-color="#5DF2FF" stop-opacity="0"/></linearGradient></defs>
    ${isoStage(stage)}</svg>`;
}

// ---------- content ----------
const SLOTS = [
  { title: 'Driftlight', genre: 'Exploration · Island-keeping', text: 'A gentle exploration game about keeping a wandering archipelago together. Light the beacons, wind the mills, wake the Crown and decide which islands are worth the journey.', meta: [['Status', 'In development'], ['World', 'The Drift'], ['Players', 'Solo'], ['Platforms', 'To be announced']], cta: ['Explore The Drift', '#world'] },
  { title: 'Undertide', genre: 'Exploration · Cartography', text: 'A drowned city lit only by the lanterns you carry. Map its streets between tides and learn why its people chose the sea over the shore.', meta: [['Status', 'Pre-production'], ['World', 'Saltmere'], ['Players', 'Solo or pair'], ['Platforms', 'To be announced']], cta: ['See how worlds are made', '#pipeline'] },
  { title: 'Neon Orchard', genre: 'Cosy farming · Night market', text: 'Grow impossible fruit in a rooftop greenhouse above a city that never sleeps, then trade it at a night market that only opens when it rains.', meta: [['Status', 'Prototype'], ['World', 'Lantern District'], ['Players', 'Solo'], ['Platforms', 'To be announced']], cta: ['Meet the crafts', '#crafts'] },
  { title: 'Empty slot', genre: 'New game', text: 'This slot is waiting for a world nobody has imagined yet. The quickest way to help shape one is to play the worlds we are building now.', meta: [['Status', 'Empty'], ['World', 'Unknown'], ['Players', 'You'], ['Platforms', 'Anywhere']], cta: ['Join the playtest', '#playtest'] }
];
const CLASSES = [
  { id: 'worldsmith', name: 'Worldsmith', role: 'Environment and level design', text: 'Shapes the ground you walk on. Worldsmiths block out every island in grey boxes and walk it at player height for days before anyone is allowed to paint it.', abilities: [['Terraform', 'Sculpts a mountain range before lunch.'], ['Sightline', 'Knows where your eye lands before you do.'], ['Shortcut sense', 'Hides the quick way home behind the scenic one.']], tool: 'Grey boxes and a very long walk' },
  { id: 'lorekeeper', name: 'Lorekeeper', role: 'Narrative and world history', text: 'Keeps the island’s memory. Lorekeepers write centuries of history most players never read, so every ruin, road and rumour feels like it was there first.', abilities: [['Deep time', 'Writes the history before the story.'], ['True names', 'Names places people want to say out loud.'], ['Foreshadow', 'Plants answers long before the question.']], tool: 'A notebook of unanswered questions' },
  { id: 'tinker', name: 'Tinker', role: 'Systems and engineering', text: 'Makes the world tick. Tinkers build the rules that run when nobody is watching: weather, wind, creature routines and the great clock under Gearwind.', abilities: [['Clockwork', 'Systems that keep running when you look away.'], ['Fail-soft', 'Bugs that break gracefully into features.'], ['Frame budget', 'Forty windmills for the price of four.']], tool: 'A wrench and a profiler' },
  { id: 'bard', name: 'Bard', role: 'Audio and music', text: 'Gives the island its voice. Bards score the wind, the hum of Hushwood and the silence of the Quiet Ring, so you could find your way with your eyes closed.', abilities: [['Leitmotif', 'Every place gets a tune you hum later.'], ['Soundscape', 'Layers that shift with the time of day.'], ['Rest', 'Knows exactly when to stop playing.']], tool: 'A lute, a field recorder and patience' }
];

// roving radio/tab helper
function roving(buttons, attr, onPick, vertical = false) {
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => onPick(i));
    b.addEventListener('keydown', (e) => {
      const next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
      let j = null;
      if (next) j = (i + next + buttons.length) % buttons.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = buttons.length - 1;
      if (j === null) return;
      e.preventDefault();
      onPick(j);
      buttons[j].focus();
    });
  });
}

function initSlots() {
  const tabs = $$('.slot');
  if (!tabs.length) return;
  const panel = $('#slot-panel');
  const pick = (i) => {
    const s = SLOTS[i];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', tabs[i].id);
    const cov = $('[data-cover]', panel);
    cov.innerHTML = cover(i);
    cov.setAttribute('aria-label', `Pixel-art cover for ${s.title}`);
    $('[data-slot-genre]', panel).textContent = s.genre;
    $('[data-slot-title]', panel).textContent = s.title;
    $('[data-slot-text]', panel).textContent = s.text;
    $('[data-slot-meta]', panel).innerHTML = s.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const cta = $('[data-slot-cta]', panel);
    cta.textContent = s.cta[0];
    cta.setAttribute('href', s.cta[1]);
    panel.classList.remove('is-swap');
    void panel.offsetWidth;
    panel.classList.add('is-swap');
  };
  roving(tabs, 'aria-selected', pick, true);
  tabs.forEach((t, i) => { const mini = document.createElement('span'); mini.className = 'sl-thumb'; mini.innerHTML = cover(i); t.prepend(mini); });
  pick(0);
}

function initClasses() {
  const btns = $$('.cls');
  if (!btns.length) return;
  btns.forEach((b) => { const a = $('.cls-ava', b); a.innerHTML = sprite(a.dataset.sprite); });
  const pick = (i) => {
    const c = CLASSES[i];
    btns.forEach((b, k) => { b.setAttribute('aria-checked', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    $('[data-cls-portrait]').innerHTML = sprite(c.id, 'sprite-svg big');
    $('[data-cls-role]').textContent = c.role;
    $('[data-cls-name]').textContent = c.name;
    $('[data-cls-text]').textContent = c.text;
    $('[data-cls-abilities]').innerHTML = c.abilities.map(([n, d]) => `<li><b>${n}</b><span>${d}</span></li>`).join('');
    $('[data-cls-tool]').textContent = c.tool;
    const card = $('.class-card');
    card.classList.remove('is-swap');
    void card.offsetWidth;
    card.classList.add('is-swap');
  };
  roving(btns, 'aria-checked', pick);
  pick(0);
}

function initPipeline(reduced) {
  $$('[data-iso]').forEach((el) => { el.innerHTML = iso(Number(el.dataset.iso)); });
  const sec = $('#pipeline'), track = $('[data-pipe-track]'), meter = $$('.pm-bar i'), val = $('[data-pipe-v]');
  if (!sec || !track) return;
  const cards = $$('.pipe-card', track);
  const wideQ = matchMedia('(min-width: 980px)');
  let dist = 0, active = -1;
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    meter.forEach((m, k) => m.classList.toggle('on', k <= i));
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
    if (val) val.textContent = `${i + 1}/6`;
  };
  const layout = () => {
    const pinned = !!(wideQ.matches && !reduced);
    sec.classList.toggle('is-pinned', pinned);
    if (!pinned) { sec.style.height = ''; track.style.transform = ''; return; }
    dist = Math.max(0, track.scrollWidth - track.clientWidth);
    sec.style.height = `${window.innerHeight + dist}px`;
    onScroll();
  };
  const onScroll = () => {
    if (!sec.classList.contains('is-pinned')) {
      // stacked / free-scrolling layout: the card nearest the viewport centre is active
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - innerHeight / 2) + Math.abs(r.left + r.width / 2 - innerWidth / 2); if (d < bd) { bd = d; best = k; } });
      setActive(best);
      return;
    }
    const r = sec.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, dist)));
    track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
    setActive(Math.min(cards.length - 1, Math.round(p * (cards.length - 1))));
  };
  addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', layout);
  wideQ.addEventListener('change', layout);
  layout();
  setActive(0);
}

function initForm(getSelected) {
  const form = $('#save-form');
  if (!form) return;
  const done = $('[data-done]', form);
  const F = { name: $('#f-name'), email: $('#f-email'), platform: $('#f-platform'), ok: $('#f-ok'), first: $('#f-first') };
  const show = (id, msg) => {
    const err = $('#' + id + '-err');
    const input = id === 'f-style' ? null : $('#' + id);
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (id === 'f-style') $('.style-set').classList.toggle('is-invalid', !!msg);
  };
  const rules = {
    'f-name': () => (F.name.value.trim().length < 2 ? 'Enter a player name of at least two characters.' : ''),
    'f-email': () => { const v = F.email.value.trim(); if (!v) return 'Enter your email address.'; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email address doesn’t look complete, for example name@example.com.'; },
    'f-platform': () => (F.platform.value ? '' : 'Choose where you usually play.'),
    'f-style': () => (form.querySelector('input[name="style"]:checked') ? '' : 'Pick the play style closest to yours.'),
    'f-ok': () => (F.ok.checked ? '' : 'Please confirm you understand this is a demo.')
  };
  Object.keys(rules).forEach((id) => {
    const els = id === 'f-style' ? $$('input[name="style"]', form) : [$('#' + id)];
    els.forEach((el) => {
      el.addEventListener('change', () => show(id, rules[id]()));
      if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio') {
        el.addEventListener('blur', () => { if (el.value) show(id, rules[id]()); });
        el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') show(id, rules[id]()); });
      }
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    Object.keys(rules).forEach((id) => { const m = rules[id](); show(id, m); if (m && !first) first = id; });
    if (first) {
      const el = first === 'f-style' ? $('input[name="style"]', form) : $('#' + first);
      el.focus();
      return;
    }
    const first2 = F.first.options[F.first.selectedIndex].text;
    const name = F.name.value.trim();
    done.innerHTML = '';
    const h = document.createElement('p'); h.className = 'done-h'; h.textContent = 'Save file created';
    const card = document.createElement('div'); card.className = 'done-card';
    const rows = [['Player', name], ['Style', form.querySelector('input[name="style"]:checked').value], ['First stop', first2], ['Platform', F.platform.value]];
    card.innerHTML = rows.map(([k]) => `<p><span>${k}</span><b></b></p>`).join('');
    $$('b', card).forEach((b, i) => { b.textContent = rows[i][1]; });
    const note = document.createElement('p'); note.className = 'done-note';
    note.textContent = 'This save only exists in this browser tab. PIXELVERSE is a fictional studio and this is a portfolio demo: nothing was sent, stored or booked, and there is no real playtest.';
    const again = document.createElement('button'); again.type = 'button'; again.className = 'btn btn-ghost'; again.textContent = 'New save file';
    again.addEventListener('click', () => { form.reset(); done.hidden = true; form.classList.remove('is-done'); syncFirst(); F.name.focus(); });
    done.append(h, card, note, again);
    done.hidden = false;
    form.classList.add('is-done');
    done.focus();
  });
  const syncFirst = () => { const id = getSelected && getSelected(); if (id && F.first) F.first.value = id; };
  return { syncFirst };
}

export function initSections({ reduced, getSelected }) {
  initPipeline(reduced);
  initSlots();
  initClasses();
  const crystal = $('[data-crystal]');
  if (crystal) {
    const rows = ['......kk......', '.....kcck.....', '....kcwcck....', '...kcwcccck...', '..kcwcccccck..', '.kcwcccccccck.', 'kccccccccccbbk', '.kcccccccccbk.', '..kcccccccbk..', '...kcccccbk...', '....kcccbk....', '.....kcbk.....', '......kk......'];
    const pal = { k: '#120D33', c: '#5DF2FF', w: '#F7F3FF', b: '#2FA9C4' };
    crystal.innerHTML = pixelSVG(14, 13, (x, y) => pal[rows[y][x]] || null, 'crystal-svg');
  }
  return initForm(getSelected);
}
