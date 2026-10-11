// PIXELVERSE — designed SVG diorama used when WebGL is unavailable (same locations, same HUD).
import { LOCATIONS } from './data.js';

const W = 1000, H = 800, CX = 500, CY = 360, RX = 370, RY = 165;
const INK = '#120D33';
export const VIEW_AZ = 220;

export function project(L) {
  // matches the 3D overview camera (azimuth 220deg): d = angle relative to the viewer
  const d = ((L.angle - VIEW_AZ) * Math.PI) / 180, k = L.r / 6;
  return { x: CX - Math.sin(d) * RX * k, y: CY + Math.cos(d) * RY * k };
}

function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const glyph = {
  beacon: () => `
    <polygon points="-34,6 34,6 26,-8 -26,-8" fill="#8F87C4" stroke="${INK}" stroke-width="2.5"/>
    <polygon class="fb-beam" points="0,-120 260,-160 260,-80" fill="#FFE45D" opacity=".18"/>
    <polygon points="-18,-8 18,-8 15,-40 -15,-40" fill="#FF5DA2" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="-15,-40 15,-40 12,-72 -12,-72" fill="#F7F3FF" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="-12,-72 12,-72 10,-100 -10,-100" fill="#FF5DA2" stroke="${INK}" stroke-width="2.5"/>
    <rect x="-15" y="-106" width="30" height="6" fill="${INK}"/>
    <rect x="-9" y="-128" width="18" height="22" fill="#FFE45D" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="-14,-128 14,-128 0,-148" fill="#FF5DA2" stroke="${INK}" stroke-width="2.5"/>`,
  hushwood: () => {
    const r = rnd(9); let s = '';
    const cols = ['#FF5DA2', '#FFA3CC', '#B79CFF', '#FF5DA2', '#1E9A97'];
    [[-46, -6], [40, -10], [-10, -22], [12, 8], [-36, 14], [52, 12], [0, -4]].forEach(([x, y], i) => {
      const h = 46 + r() * 30, w = 20 + r() * 8;
      s += `<g transform="translate(${x} ${y})"><rect x="-3" y="-10" width="6" height="12" fill="#96506F" stroke="${INK}" stroke-width="2"/>
        <polygon points="${-w},-8 ${w},-8 0,${-h}" fill="${cols[i % 5]}" stroke="${INK}" stroke-width="2.5"/>
        <polygon points="${-w * 0.7},${-h * 0.55} ${w * 0.7},${-h * 0.55} 0,${-h - 16}" fill="${cols[i % 5]}" stroke="${INK}" stroke-width="2.5"/></g>`;
    });
    for (let i = 0; i < 9; i++) s += `<circle class="fb-fly" cx="${-60 + r() * 120}" cy="${-20 - r() * 70}" r="2.6" fill="#FFE45D"/>`;
    return s;
  },
  gearwind: () => {
    const house = (x, y, w, roof) => `<g transform="translate(${x} ${y})"><rect x="${-w / 2}" y="-22" width="${w}" height="22" fill="#F7F3FF" stroke="${INK}" stroke-width="2.5"/>
      <polygon points="${-w / 2 - 4},-22 ${w / 2 + 4},-22 0,-42" fill="${roof}" stroke="${INK}" stroke-width="2.5"/><rect x="${w / 6}" y="-15" width="7" height="7" fill="#FFE45D"/></g>`;
    return `${house(-52, -4, 30, '#FF5DA2')}${house(44, -12, 26, '#5DF2FF')}${house(54, 14, 30, '#FFE45D')}${house(-30, 18, 24, '#FF5DA2')}
      <polygon points="-12,4 12,4 8,-66 -8,-66" fill="#F7F3FF" stroke="${INK}" stroke-width="2.5"/>
      <polygon points="-11,-66 11,-66 0,-82" fill="#FF5DA2" stroke="${INK}" stroke-width="2.5"/>
      <g class="fb-sails" transform="translate(0 -60)">
        <g><rect x="-2.5" y="-48" width="5" height="48" fill="#96506F"/><rect x="2.5" y="-44" width="12" height="30" fill="#FFE45D" stroke="${INK}" stroke-width="2"/></g>
        <g transform="rotate(90)"><rect x="-2.5" y="-48" width="5" height="48" fill="#96506F"/><rect x="2.5" y="-44" width="12" height="30" fill="#F7F3FF" stroke="${INK}" stroke-width="2"/></g>
        <g transform="rotate(180)"><rect x="-2.5" y="-48" width="5" height="48" fill="#96506F"/><rect x="2.5" y="-44" width="12" height="30" fill="#FFE45D" stroke="${INK}" stroke-width="2"/></g>
        <g transform="rotate(270)"><rect x="-2.5" y="-48" width="5" height="48" fill="#96506F"/><rect x="2.5" y="-44" width="12" height="30" fill="#F7F3FF" stroke="${INK}" stroke-width="2"/></g>
        <circle r="5" fill="${INK}"/></g>`;
  },
  cinder: () => `
    <circle class="fb-smoke" cx="6" cy="-128" r="14" fill="#CFC8EE" opacity=".7"/>
    <circle class="fb-smoke" cx="-10" cy="-156" r="18" fill="#CFC8EE" opacity=".45"/>
    <circle class="fb-smoke" cx="10" cy="-186" r="22" fill="#CFC8EE" opacity=".25"/>
    <polygon points="-92,10 92,10 30,-102 -30,-102" fill="#4C3BA2" stroke="${INK}" stroke-width="3"/>
    <polygon points="-92,10 -10,10 -24,-102 -30,-102" fill="#3D2F88"/>
    <ellipse cx="0" cy="-102" rx="30" ry="8" fill="#FFB547" stroke="${INK}" stroke-width="2.5"/>
    <path d="M12-96 L30-50 L22-20 M-14-96 L-26-60" stroke="#FFB547" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  skyfall: () => `
    <ellipse cx="-6" cy="-4" rx="46" ry="15" fill="#5DF2FF" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-16 6 L4 6 L6 30 L-18 30 Z" fill="#5DF2FF"/>
    <rect class="fb-fall" x="-19" y="28" width="26" height="320" fill="url(#fb-fall)"/>
    <path class="fb-fall-lines" d="M-12 40v60M-2 70v70M-8 150v50" stroke="#F7F3FF" stroke-width="2.5" opacity=".7"/>
    <circle cx="-56" cy="0" r="7" fill="#CFC8EE" stroke="${INK}" stroke-width="2"/><circle cx="36" cy="6" r="6" fill="#8F87C4" stroke="${INK}" stroke-width="2"/>`,
  ring: () => {
    let s = `<ellipse cx="0" cy="0" rx="72" ry="26" fill="#CFC8EE" stroke="${INK}" stroke-width="2.5"/>`;
    const hs = [60, 48, 22, 58, 52, 16, 44];
    const back = [], front = [];
    hs.forEach((h, i) => {
      const a = (i / 7) * Math.PI * 2, x = Math.cos(a) * 58, y = Math.sin(a) * 18;
      (y < 0 ? back : front).push(`<rect x="${x - 7}" y="${y - h}" width="14" height="${h}" fill="${i % 3 ? '#CFC8EE' : '#8F87C4'}" stroke="${INK}" stroke-width="2.5"/>`);
    });
    s += back.join('');
    s += `<g class="fb-crystal"><ellipse cx="0" cy="-70" rx="34" ry="10" fill="none" stroke="#FF5DA2" stroke-width="3"/>
      <polygon points="0,-104 14,-70 0,-36 -14,-70" fill="#5DF2FF" stroke="${INK}" stroke-width="2.5"/><polygon points="0,-104 14,-70 0,-70" fill="#B9FBFF"/></g>`;
    return s + front.join('');
  }
};

export function renderFallback(host) {
  const r = rnd(4);
  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="${['#F7F3FF', '#5DF2FF', '#FFA3CC', '#FFE45D'][i % 9 === 0 ? 1 + (i % 3) : 0]}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  // jagged underside strata
  const band = (y0, rx0, y1, rx1, fill) => {
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) { const a = Math.PI * (i / n); pts.push(`${(CX - Math.cos(a) * rx0).toFixed(1)},${(y0 + Math.sin(a) * RY * (rx0 / RX)).toFixed(1)}`); }
    for (let i = n; i >= 0; i--) { const a = Math.PI * (i / n); const j = (i % 2 ? 1 : -1) * 6; pts.push(`${(CX - Math.cos(a) * rx1 + j).toFixed(1)},${(y1 + Math.sin(a) * RY * (rx1 / RX) * 0.9).toFixed(1)}`); }
    return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  };
  const order = [...LOCATIONS].sort((a, b) => project(a).y - project(b).y);
  const locs = order.map((L) => { const p = project(L); return `<g class="fb-loc" data-loc="${L.id}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="fb-lift">${glyph[L.id]()}</g></g>`; }).join('');

  host.innerHTML = `
  <div class="fb-stage">
    <svg class="fb-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustrated floating island with six locations: a lighthouse, a pink forest, a windmill village, a small volcano, a waterfall pouring off the edge and a ring of standing stones.">
      <defs>
        <linearGradient id="fb-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C3BA2"/><stop offset="1" stop-color="#1A1446"/></linearGradient>
        <linearGradient id="fb-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5DF2FF"/><stop offset=".6" stop-color="#5DF2FF" stop-opacity=".4"/><stop offset="1" stop-color="#5DF2FF" stop-opacity="0"/></linearGradient>
        <radialGradient id="fb-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF5DA2" stop-opacity=".35"/><stop offset="1" stop-color="#FF5DA2" stop-opacity="0"/></radialGradient>
      </defs>
      <g>${stars}</g>
      <ellipse cx="${CX}" cy="${CY + 90}" rx="470" ry="300" fill="url(#fb-glow)"/>
      <g class="fb-islet"><ellipse cx="130" cy="560" rx="54" ry="20" fill="#34C7B4" stroke="${INK}" stroke-width="3"/><polygon points="78,560 182,560 130,650" fill="#3D2F88" stroke="${INK}" stroke-width="3"/></g>
      <g class="fb-islet"><ellipse cx="880" cy="150" rx="40" ry="15" fill="#34C7B4" stroke="${INK}" stroke-width="3"/><polygon points="842,150 918,150 880,214" fill="#3D2F88" stroke="${INK}" stroke-width="3"/></g>
      ${band(CY + 26, RX, CY + 120, RX * 0.76, '#4C3BA2')}
      ${band(CY + 120, RX * 0.76, CY + 230, RX * 0.5, '#3D2F88')}
      ${band(CY + 230, RX * 0.5, CY + 330, RX * 0.25, '#2C226A')}
      <polygon points="${CX - RX * 0.25},${CY + 330} ${CX + RX * 0.25},${CY + 330} ${CX + 8},${CY + 430}" fill="#221B56" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${CX}" cy="${CY + 26}" rx="${RX * 1.01}" ry="${RY * 1.01}" fill="#6A3A78" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="#34C7B4" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${CX}" cy="${CY - 6}" rx="${RX * 0.9}" ry="${RY * 0.84}" fill="#86EDD3" opacity=".25"/>
      <ellipse cx="${CX}" cy="${CY}" rx="40" ry="16" fill="#F6D2E2" stroke="${INK}" stroke-width="2"/>
      ${locs}
      <g class="fb-ship" transform="translate(800 250)"><ellipse rx="52" ry="22" fill="#FF5DA2" stroke="${INK}" stroke-width="3"/><rect x="-26" y="-4" width="52" height="8" fill="#FFE45D"/><rect x="-16" y="30" width="32" height="12" fill="#96506F" stroke="${INK}" stroke-width="2.5"/></g>
    </svg>
  </div>`;
  return host.querySelector('.fb-stage');
}
