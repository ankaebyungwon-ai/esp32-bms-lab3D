/* 센서 모듈 그림 — 센서 40종 페이지와 가상 실험실이 함께 씁니다 */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ───────── 모듈 그림 (SVG) ─────────
const PCB = { black: ['#1d2330', '#2c3446'], red: ['#b3262e', '#cf3c41'], blue: ['#1f4f9a', '#2d63b8'], green: ['#1f6b45', '#2b8259'] };
export function modGeom(s) {
  if (s.glyph === 'ultra') return { x: 14, y: 52, w: 210, h: 92 };
  if (s.glyph === 'relay') return { x: 70, y: 46, w: 170, h: 104 };
  if (s.glyph === 'cup') return { x: 30, y: 52, w: 120, h: 92, two: true };
  if (s.wide) return { x: 60, y: 50, w: 220, h: 96 };
  if (s.pins.length >= 5) return { x: 80, y: 48, w: 180, h: 100 };
  return { x: 100, y: 48, w: 140, h: 100 };
}
function glyphSvg(s, cx, cy) {
  const g = s.glyph;
  const leg = (x, y, n = 3, gap = 5, len = 14) => Array.from({ length: n }, (_, i) => `<line x1="${x + (i - (n - 1) / 2) * gap}" y1="${y}" x2="${x + (i - (n - 1) / 2) * gap}" y2="${y + len}" stroke="#c9ccd2" stroke-width="1.6"/>`).join('');
  const dome = (r, id, fill = '#ffffffcc') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#9aa3b5" stroke-width="1.5" id="${id}"/><ellipse cx="${cx - r * .35}" cy="${cy - r * .4}" rx="${r * .25}" ry="${r * .15}" fill="#fff" opacity=".7"/>`;
  switch (g) {
    case 'ultra': return [-1, 1].map(d => `<circle cx="${cx + d * 50}" cy="${cy}" r="27" fill="#c9cdd3" stroke="#7d848f" stroke-width="2"/><circle cx="${cx + d * 50}" cy="${cy}" r="20" fill="url(#mesh)"/>`).join('') + `<rect x="${cx - 9}" y="${cy - 26}" width="18" height="9" rx="2" fill="#d9dde3"/>`;
    case 'pir': return `<circle cx="${cx}" cy="${cy}" r="32" fill="#f4f4f0" stroke="#bbb" stroke-width="2"/>${[0, 45, 90, 135].map(a => `<line x1="${cx - 30 * Math.cos(a * Math.PI / 180)}" y1="${cy - 30 * Math.sin(a * Math.PI / 180)}" x2="${cx + 30 * Math.cos(a * Math.PI / 180)}" y2="${cy + 30 * Math.sin(a * Math.PI / 180)}" stroke="#ddd"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="#ddd"/>`;
    case 'accel': return `<rect x="${cx - 15}" y="${cy - 15}" width="30" height="30" rx="3" fill="#15181f"/><circle cx="${cx - 9}" cy="${cy - 9}" r="2" fill="#666"/><text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="9" fill="#cfe0f5" font-family="JetBrains Mono">X Y Z</text>`;
    case 'probe': return `<path d="M${cx - 10} ${cy + 8} v-14 a10 10 0 0 1 20 0 v14 z" fill="#121418"/>${leg(cx, cy + 8)}`;
    case 'spring': return `<rect x="${cx - 22}" y="${cy - 8}" width="44" height="16" rx="8" fill="#8f949c" stroke="#5f646c"/><path d="M${cx - 16} ${cy} ${Array.from({ length: 8 }, (_, i) => `l2 ${i % 2 ? 5 : -5} l2 ${i % 2 ? -5 : 5}`).join(' ')}" fill="none" stroke="#e7e7e7" stroke-width="1.2"/>`;
    case 'hall': return `<rect x="${cx - 7}" y="${cy - 9}" width="14" height="12" rx="1.5" fill="#121418"/>${leg(cx, cy + 3, 3, 4, 12)}`;
    case 'button': return `<rect x="${cx - 16}" y="${cy - 16}" width="32" height="32" rx="3" fill="#2a2f39" stroke="#555c68"/><circle cx="${cx}" cy="${cy}" r="10" fill="#111" stroke="#666" id="gBtn"/>`;
    case 'irled': return `<circle cx="${cx}" cy="${cy}" r="22" fill="#b46bff" opacity="0" id="gGlow"/>${dome(11, 'gDome', '#cfd8ff')}${leg(cx, cy + 11, 2, 6, 10)}`;
    case 'buzzer': return `<circle cx="${cx}" cy="${cy}" r="22" fill="#15171c" stroke="#3a3f4a" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="4" fill="#3a3f4a"/><g id="gWaves" opacity="0" fill="none" stroke="#f6c047" stroke-width="2"><path d="M${cx + 28} ${cy - 12} q8 12 0 24"/><path d="M${cx + 36} ${cy - 18} q12 18 0 36"/></g>`;
    case 'piezo': return `<circle cx="${cx}" cy="${cy}" r="21" fill="#15171c" stroke="#3a3f4a" stroke-width="2"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="#888" font-weight="700">+</text><g id="gWaves" opacity="0" fill="none" stroke="#f6c047" stroke-width="2"><path d="M${cx + 27} ${cy - 12} q8 12 0 24"/><path d="M${cx + 35} ${cy - 18} q12 18 0 36"/></g>`;
    case 'laser': return `<rect x="${cx - 24}" y="${cy - 8}" width="40" height="16" rx="3" fill="#c9a24a" stroke="#8a6d2a"/><rect x="${cx + 16}" y="${cy - 5}" width="6" height="10" fill="#7a5f22"/>`;
    case 'smd': return `<rect x="${cx - 14}" y="${cy - 14}" width="28" height="28" rx="3" fill="#f2f2ee" stroke="#bbb"/><circle cx="${cx}" cy="${cy}" r="9" fill="#ddd" id="gDome"/>`;
    case 'slot': return `<rect x="${cx - 22}" y="${cy - 22}" width="14" height="38" rx="2" fill="#16181d"/><rect x="${cx + 8}" y="${cy - 22}" width="14" height="38" rx="2" fill="#16181d"/><rect x="${cx - 22}" y="${cy + 10}" width="44" height="8" fill="#16181d"/>`;
    case 'led': case 'led2': case 'flash': return `<circle cx="${cx}" cy="${cy}" r="26" fill="#fff" opacity="0" id="gGlow"/>${dome(g === 'led2' && s.n === 13 ? 9 : 13, 'gDome', '#eef0f4')}${leg(cx, cy + 12, g === 'led' ? 4 : g === 'flash' ? 2 : 3, 4, 10)}`;
    case 'therm': return `<circle cx="${cx}" cy="${cy}" r="6" fill="#121418"/>${leg(cx, cy + 5, 2, 5, 14)}`;
    case 'ntc': return `<circle cx="${cx - 18}" cy="${cy}" r="6" fill="#121418"/>${leg(cx - 18, cy + 5, 2, 5, 14)}<rect x="${cx + 4}" y="${cy - 9}" width="22" height="18" rx="2" fill="#1b1d22"/><text x="${cx + 15}" y="${cy + 4}" text-anchor="middle" font-size="7" fill="#aaa" font-family="JetBrains Mono">393</text>`;
    case 'dht': return `<rect x="${cx - 18}" y="${cy - 24}" width="36" height="44" rx="3" fill="#3b8de0" stroke="#1f63a8"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${cx - 12 + (i % 3) * 9}" y="${cy - 18 + Math.floor(i / 3) * 9}" width="6" height="5" rx="1" fill="#1f63a8"/>`).join('')}`;
    case 'mercury': return `<g id="gTube"><rect x="${cx - 22}" y="${cy - 7}" width="44" height="14" rx="7" fill="#e8eef5cc" stroke="#9aa3b5"/><circle cx="${cx - 12}" cy="${cy}" r="5" fill="#c6cbd2" stroke="#7d848f" id="gBlob"/></g>`;
    case 'ldr': return `<circle cx="${cx}" cy="${cy}" r="14" fill="#e6a35c" stroke="#a86a2a"/><path d="M${cx - 9} ${cy - 6} h14 v4 h-14 v4 h14 v4 h-14" fill="none" stroke="#7a3d12" stroke-width="1.6"/>${leg(cx, cy + 13, 2, 6, 10)}`;
    case 'relay': return `<rect x="${cx - 52}" y="${cy - 26}" width="78" height="48" rx="3" fill="#1d5fd0" stroke="#123f8f"/><text x="${cx - 13}" y="${cy - 2}" text-anchor="middle" font-size="9" fill="#dce8ff" font-family="JetBrains Mono">5VDC</text><text x="${cx - 13}" y="${cy + 10}" text-anchor="middle" font-size="7" fill="#b5ccf5" font-family="JetBrains Mono">10A 30VDC</text><rect x="${cx + 32}" y="${cy - 28}" width="22" height="54" rx="2" fill="#1e9e55"/>${[0, 1, 2].map(i => `<circle cx="${cx + 43}" cy="${cy - 18 + i * 18}" r="5" fill="#cfd3d8" stroke="#888"/>`).join('')}`;
    case 'ball': return `<rect x="${cx - 13}" y="${cy - 16}" width="26" height="30" rx="4" fill="#2a2d33" stroke="#555"/><circle cx="${cx}" cy="${cy}" r="5" fill="#b7bcc4" id="gBlob"/>`;
    case 'reed': return `<rect x="${cx - 30}" y="${cy - 6}" width="60" height="12" rx="6" fill="#e8eef5cc" stroke="#9aa3b5"/><line x1="${cx - 30}" y1="${cy}" x2="${cx + 3}" y2="${cy - 1}" stroke="#7d848f" stroke-width="2"/><line x1="${cx + 30}" y1="${cy}" x2="${cx - 3}" y2="${cy + 1}" stroke="#7d848f" stroke-width="2" id="gReed"/>`;
    case 'irrecv': return `<path d="M${cx - 12} ${cy + 12} v-18 a12 12 0 0 1 24 0 v18 z" fill="#14161a"/><circle cx="${cx}" cy="${cy - 6}" r="5" fill="#2a2d33"/>${leg(cx, cy + 12, 3, 5, 10)}<g id="gWaves" opacity="0" fill="none" stroke="#b46bff" stroke-width="2"><path d="M${cx + 22} ${cy - 16} q8 12 0 24"/><path d="M${cx + 30} ${cy - 22} q12 18 0 36"/></g>`;
    case 'joy': return `<rect x="${cx - 30}" y="${cy - 30}" width="60" height="60" rx="6" fill="#2b2f37" stroke="#555"/><circle cx="${cx}" cy="${cy}" r="22" fill="#1b1e24"/><circle cx="${cx}" cy="${cy}" r="14" fill="url(#cap)" id="gCap"/>`;
    case 'flame': return `<circle cx="${cx}" cy="${cy}" r="9" fill="#111" stroke="#444"/>${leg(cx, cy + 8, 2, 5, 12)}`;
    case 'knock': return `<rect x="${cx - 16}" y="${cy - 11}" width="32" height="22" rx="5" fill="#9aa0a8" stroke="#666"/><circle cx="${cx}" cy="${cy}" r="4" fill="#666"/>`;
    case 'obstacle': return `<circle cx="${cx - 12}" cy="${cy}" r="8" fill="#dfe6ff" stroke="#999"/><circle cx="${cx + 12}" cy="${cy}" r="8" fill="#14161a"/>`;
    case 'touch': return `<path d="M${cx} ${cy + 16} v-22 a6 6 0 1 1 0.1 0" fill="none" stroke="#c9cdd3" stroke-width="4"/><circle cx="${cx}" cy="${cy - 12}" r="6" fill="#c9cdd3"/>`;
    case 'micbig': return `<circle cx="${cx}" cy="${cy}" r="18" fill="#c6c9ce" stroke="#7d848f" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="12" fill="#2a2d33"/>`;
    case 'mic': return `<circle cx="${cx}" cy="${cy}" r="10" fill="#c6c9ce" stroke="#7d848f" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="6" fill="#2a2d33"/>`;
    case 'heart': return `<circle cx="${cx - 14}" cy="${cy}" r="7" fill="#dfe6ff" stroke="#999"/><circle cx="${cx + 14}" cy="${cy}" r="7" fill="#14161a"/><path d="M${cx} ${cy - 14} c-4 -6 -12 -3 -10 3 c1 4 10 10 10 10 c0 0 9 -6 10 -10 c2 -6 -6 -9 -10 -3z" fill="#d62f2f" opacity=".25" id="gHeart"/>`;
    case 'track': return `<rect x="${cx - 16}" y="${cy - 10}" width="32" height="20" rx="2" fill="#1d2b55"/><circle cx="${cx - 7}" cy="${cy}" r="5" fill="#9ab"/><circle cx="${cx + 7}" cy="${cy}" r="5" fill="#111"/>`;
    case 'encoder': return `<rect x="${cx - 18}" y="${cy - 18}" width="36" height="36" rx="3" fill="#a7adb6" stroke="#666"/><g id="gKnob"><circle cx="${cx}" cy="${cy}" r="13" fill="#2a2d33"/><rect x="${cx - 2}" y="${cy - 13}" width="4" height="9" fill="#f6c047"/></g>`;
    default: return '';
  }
}
/* opt.circuit: 핀 간격 20 고정, 다리를 opt.leg만큼 길게, 핀 위치를 opt.pins에 기록
   opt.legsUp: 핀이 위쪽으로 (아래 보드에 꽂을 때) · opt.noScene: 소품 없이 · opt.uid: 한 그림에 모듈 여러 개일 때 id 구분 */
export function moduleSvg(s, opt = {}) {
  const G = modGeom(s), [c1, c2] = PCB[s.pcb] || PCB.black;
  const defs = `<defs><pattern id="mesh" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#8b9098"/><circle cx="2" cy="2" r="1.1" fill="#5c6068"/></pattern><radialGradient id="cap" cx=".4" cy=".35"><stop offset="0" stop-color="#5a6476"/><stop offset="1" stop-color="#151a24"/></radialGradient><linearGradient id="pcbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>`;
  const board = (x, y, w, h, pins, glyph, label) => {
    const gap = opt.circuit ? 20 : Math.min(pins.some(p => p.length > 2) ? 28 : 20, (w - 24) / Math.max(1, pins.length - 1 || 1));
    const up = !!opt.legsUp, legEnd = up ? y - opt.leg : y + h + (opt.circuit ? opt.leg : 16);
    const hy = up ? y + 6 : y + h - 13, ly = up ? y + 6 : y + h - 6;
    const px0 = x + w / 2 - gap * (pins.length - 1) / 2;
    const pinsSvg = pins.map((p, i) => { const px = px0 + gap * i; if (opt.pins) opt.pins.push({ x: px, y: legEnd, name: p }); return `<rect x="${px - 3.5}" y="${hy}" width="7" height="7" fill="#111" stroke="#e8c76a" stroke-width="1.5"/><line x1="${px}" y1="${ly}" x2="${px}" y2="${legEnd}" stroke="#d6b04d" stroke-width="${opt.circuit ? 3.2 : 2.4}"/>${opt.circuit ? '' : `<text x="${px}" y="${y + h + 30}" text-anchor="middle" font-size="${p.length > 4 ? 8 : 9.5}" font-family="JetBrains Mono" fill="#0e1932" font-weight="700">${esc(p)}</text>`}`; }).join('');
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="url(#pcbg)" stroke="#0005"/>${[[x + 7, y + 7], [x + w - 7, y + 7]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.2" fill="#f6f3e8" stroke="#bfb9a6"/>`).join('')}${glyph}<text x="${x + w - 10}" y="${y + h - 18}" text-anchor="end" font-size="8" font-family="JetBrains Mono" fill="#ffffff99">${esc(label)}</text>${pinsSvg}`;
  };
  const pinNames = s.pins.map(p => p.mod.replace(/ \(.+\)/, '').replace(/^A: |^B: /, ''));
  let body = '';
  if (G.two) {
    const pa = ['G', '+', 'S', 'L'];
    body = board(G.x, G.y, G.w, G.h, pa, cupGlyph(G.x + G.w / 2, G.y + 38, 'A'), 'A') + board(G.x + G.w + 40, G.y, G.w, G.h, pa, cupGlyph(G.x + G.w * 1.5 + 40, G.y + 38, 'B'), 'B');
  } else {
    const cx = G.x + G.w / 2 + (s.pot ? -14 : 0) + (s.glyph === 'relay' ? 0 : 0), cy = G.y + 40;
    let extra = '';
    if (s.pot) extra += `<rect x="${G.x + G.w - 32}" y="${G.y + 14}" width="20" height="20" rx="2" fill="#2f6fd6" stroke="#1a4a9a"/><circle cx="${G.x + G.w - 22}" cy="${G.y + 24}" r="6" fill="#e8eef5"/><path d="M${G.x + G.w - 26} ${G.y + 24} h8 M${G.x + G.w - 22} ${G.y + 20} v8" stroke="#555" stroke-width="1.5"/>`;
    const hasSig = ['din', 'cmp'].includes(s.cat) || s.key === 'relay' || s.key === 'irrx';
    if (hasSig) extra += `<circle cx="${G.x + 14}" cy="${G.y + 22}" r="3.6" fill="#33402f" id="ledSig"/><circle cx="${G.x + 14}" cy="${G.y + 34}" r="3.6" fill="#ff4d4d" id="ledPwr"/><text x="${G.x + 21}" y="${G.y + 25}" font-size="6.5" fill="#ffffff88" font-family="JetBrains Mono">L1</text><text x="${G.x + 21}" y="${G.y + 37}" font-size="6.5" fill="#ffffff88" font-family="JetBrains Mono">PWR</text>`;
    body = board(G.x, G.y, G.w, G.h, pinNames, glyphSvg(s, cx, cy) + extra, s.model.split(' ')[0]);
  }
  let out = defs + `<g id="scene">${opt.noScene ? '' : sceneSvg(s, G)}</g><g id="modg" style="transform-box:fill-box;transform-origin:center;transition:transform .15s">${body}</g>`;
  if (opt.uid) out = out.replace(/id="(mesh|cap|pcbg)"/g, `id="$1${opt.uid}"`).replace(/url\(#(mesh|cap|pcbg)\)/g, `url(#$1${opt.uid})`);
  return out;
}
function cupGlyph(cx, cy, n) { return `<rect x="${cx - 22}" y="${cy - 7}" width="26" height="12" rx="6" fill="#e8eef5cc" stroke="#9aa3b5"/><circle cx="${cx + 18}" cy="${cy}" r="11" fill="#fff" stroke="#9aa3b5" id="gCup${n}"/>`; }
function sceneSvg(s, G) { // 모듈 주변의 실험 소품 (자석, 벽, 불꽃, 팬 …)
  const R0 = G.x + G.w + 8, cy = G.y + 40;
  const k = s.key;
  if (['hall3144', 'minireed', 'reedcmp', 'linhall', 'anahall'].includes(k)) return `<g id="sMag"><rect x="0" y="${cy - 12}" width="34" height="24" rx="3" fill="#d62f2f"/><rect x="17" y="${cy - 12}" width="17" height="24" rx="0" fill="#2563c9"/><text x="8" y="${cy + 4}" font-size="11" fill="#fff" font-weight="700" id="sPoleA">S</text><text x="22" y="${cy + 4}" font-size="11" fill="#fff" font-weight="700" id="sPoleB">N</text></g>` + (k === 'hall3144' ? `<g id="sFan" transform="translate(${R0 + 48} ${cy})"><circle r="30" fill="none" stroke="#c9c2ad" stroke-dasharray="3 3"/><g id="sRotor">${[0, 120, 240].map(a => `<path d="M0 0 L${26 * Math.cos(a * Math.PI / 180)} ${26 * Math.sin(a * Math.PI / 180)} A26 26 0 0 1 ${26 * Math.cos((a + 50) * Math.PI / 180)} ${26 * Math.sin((a + 50) * Math.PI / 180)} Z" fill="#8a96aa"/>`).join('')}<circle r="5" fill="#333"/><rect x="-4" y="-30" width="8" height="8" fill="#d62f2f"/></g></g>` : '');
  if (k === 'ultrasonic') return `<rect id="sWall" x="300" y="20" width="14" height="150" fill="#b9b2a0"/><text id="sWallT" x="300" y="182" font-size="10" font-family="JetBrains Mono" fill="#5d6272"></text>`;
  if (k === 'obstacle') return `<rect id="sWall" x="300" y="${cy - 30}" width="12" height="60" rx="2" fill="#fff" stroke="#999"/>`;
  if (k === 'flame') return `<g id="sFlame"><path d="M0 0 c-10 -12 -2 -22 0 -32 c3 10 12 14 8 26 c-1 4 -4 6 -8 6z" fill="#ff8a1e"/><path d="M0 -2 c-5 -6 -1 -12 0 -18 c2 6 6 8 4 14 c-1 2 -2 4 -4 4z" fill="#ffe36b"/><rect x="-4" y="0" width="8" height="26" rx="2" fill="#6b7280"/></g><circle id="sSun" cx="320" cy="20" r="14" fill="#ffd34d" opacity="0"/>`;
  if (k === 'photointerrupter') return `<g transform="translate(${G.x + G.w / 2} ${cy - 2})"><g id="sDisc">${Array.from({ length: 20 }, (_, i) => `<rect x="-1.6" y="-36" width="3.2" height="7" fill="#f9f6ec" transform="rotate(${i * 18})"/>`).join('')}</g></g><g id="sDiscBack" opacity=".0"></g>`;
  if (['ds18b20', 'thermistor', 'ntccmp', 'dht11'].includes(k)) return `<g transform="translate(40 ${cy - 30})"><rect x="-6" y="0" width="12" height="70" rx="6" fill="#fff" stroke="#999"/><circle cx="0" cy="76" r="10" fill="#d62f2f" stroke="#999"/><rect id="sTherm" x="-3" y="66" width="6" height="0" fill="#d62f2f"/><text id="sThermT" x="0" y="102" text-anchor="middle" font-size="10" font-family="JetBrains Mono" fill="#0e1932"></text></g><g id="sHot" opacity="0"><path d="M${R0 + 10} ${cy + 10} q6 -10 0 -20 q-6 -10 0 -20" fill="none" stroke="#f07f12" stroke-width="2.5"/><path d="M${R0 + 24} ${cy + 10} q6 -10 0 -20 q-6 -10 0 -20" fill="none" stroke="#f07f12" stroke-width="2.5"/></g>`;
  if (k === 'ldr') return `<circle id="sSun" cx="40" cy="40" r="22" fill="#ffd34d" opacity=".5"/><g id="sHand" opacity="0"><ellipse cx="${G.x + G.w / 2}" cy="${cy - 26}" rx="44" ry="16" fill="#e7b48f"/></g>`;
  if (k === 'heartbeat') return `<g id="sFinger" opacity="1"><path d="M${G.x + G.w / 2 - 50} ${cy - 30} h80 a14 14 0 0 1 0 28 h-80 z" fill="#e7b48f" opacity=".85"/></g>`;
  if (['soundbig', 'soundmic'].includes(k)) return `<g id="sWaves" fill="none" stroke="#1e3a5c" stroke-width="2.5">${[0, 1, 2].map(i => `<path d="M${R0 + 14 + i * 12} ${cy - 14 - i * 6} q${10 + i * 2} ${14 + i * 6} 0 ${28 + i * 12}"/>`).join('')}</g>`;
  if (k === 'touch') return `<g id="sHand" opacity="0"><path d="M${G.x + G.w / 2 - 14} ${cy - 30} q-30 -20 -60 -10 l4 14 q24 -4 40 8 z" fill="#e7b48f"/></g>`;
  if (k === 'tracking') return `<rect x="0" y="${G.y + G.h + 36}" width="340" height="18" fill="#efeadc"/><rect id="sLine" x="160" y="${G.y + G.h + 36}" width="18" height="18" fill="#111"/>`;
  if (k === 'laser') return `<line id="sBeam" x1="${G.x + G.w / 2 + 22}" y1="${cy}" x2="340" y2="${cy}" stroke="#ff2a2a" stroke-width="3" opacity="0"/>`;
  if (k === 'irtx') return `<g id="sWaves" opacity="0" fill="none" stroke="#b46bff" stroke-width="2.5">${[0, 1, 2].map(i => `<path d="M${R0 + 6 + i * 12} ${cy - 14 - i * 6} q${10 + i * 2} ${14 + i * 6} 0 ${28 + i * 12}"/>`).join('')}</g>`;
  if (k === 'relay') return `<g transform="translate(14 ${cy - 34})" font-family="JetBrains Mono" font-size="9" fill="#0e1932"><text x="0" y="0">COM</text><text x="0" y="34">NO</text><text x="0" y="68">NC</text><circle cx="34" cy="-3" r="3" fill="#0e1932"/><circle cx="44" cy="31" r="3" fill="#0e1932"/><circle cx="44" cy="65" r="3" fill="#0e1932"/><line id="sArm" x1="34" y1="-3" x2="44" y2="65" stroke="#d62f2f" stroke-width="3" stroke-linecap="round"/></g>`;
  if (['accel', 'mercury', 'balltilt'].includes(k)) return `<line x1="0" y1="${G.y + G.h + 40}" x2="340" y2="${G.y + G.h + 40}" stroke="#d9d2bf" stroke-dasharray="4 4"/>`;
  return '';
}
export function updateModuleSvg(svg, s, e, o, last) { // svg(또는 모듈 그룹) 안의 모듈 그림을 시뮬레이션 상태로 갱신
  const v = (o && o.vis) || {};
  const q = id => svg.querySelector('#' + id);
  const set = (id, a, val) => { const el = q(id); if (el) el.setAttribute(a, val); };
  const sty = (id, val) => { const el = q(id); if (el) el.style.opacity = val; };
  const sig = o && o.led ? Object.values(o.led).some(Boolean) : false;
  set('ledSig', 'fill', sig ? '#4dff88' : '#33402f');
  const k = s.key, G = modGeom(s), cy = G.y + 40, R0 = G.x + G.w + 8;
  const mg = q('modg');
  if (mg) { let ang = 0; if (k === 'accel') ang = (v.roll || 0) * 0.6; if (k === 'mercury' || k === 'balltilt') ang = (v.ang || 0) * 0.6; if ((k === 'vibration' && e.shake) || (k === 'knock' && sig) || (k === 'accel' && e.shake)) mg.style.transform = `translate(${gauss() * 2}px, ${gauss() * 2}px) rotate(${ang}deg)`; else mg.style.transform = `rotate(${ang}deg)`; }
  if (q('gBlob') && v.ang != null) { const dx = clamp(v.ang / 90, -1, 1) * 12; if (k === 'mercury') set('gBlob', 'cx', G.x + G.w / 2 + dx * 1.3); else set('gBlob', 'cx', G.x + G.w / 2 + dx * 0.6); }
  if (q('sMag')) { const d = e.dist ?? 30; const x = R0 + 4 + d * 1.6; q('sMag').setAttribute('transform', `translate(${Math.min(x, 300)} 0)`); q('sMag').style.opacity = (k === 'hall3144' && e.mode === 'fan') ? 0 : 1; const sp = e.pole === 'N'; set('sPoleA', 'fill', '#fff'); const a = q('sPoleA'), b = q('sPoleB'); if (a) { a.textContent = sp ? 'N' : 'S'; b.textContent = sp ? 'S' : 'N'; } }
  if (q('sFan')) { q('sFan').style.opacity = e.mode === 'fan' ? 1 : 0; set('sRotor', 'transform', `rotate(${((v.rot || 0) % 1) * 360})`); }
  if (q('sDisc')) set('sDisc', 'transform', `rotate(${((v.rot || 0) % 1) * 360})`);
  if (k === 'ultrasonic') { const x = 232 + Math.min(e.dist, 420) / 420 * 92; set('sWall', 'x', x); const t = q('sWallT'); if (t) { t.setAttribute('x', Math.min(x - 10, 300)); t.textContent = `${Math.round(e.dist)}cm`; } set('sWall', 'fill', e.soft ? '#d9c7e8' : '#b9b2a0'); }
  if (k === 'obstacle') { const x = R0 + 2 + e.dist * 1.6; set('sWall', 'x', Math.min(x, 326)); set('sWall', 'fill', { 1: '#ffffff', 0.5: '#9aa0a8', 0.12: '#1b1d22' }[e.surf] || '#fff'); }
  if (k === 'flame') { const f = q('sFlame'); if (f) { f.setAttribute('transform', `translate(${Math.min(R0 + 14 + e.dist * 0.5, 325)} ${cy + 6})`); f.style.opacity = e.fire ? 1 : 0.12; } set('sSun', 'opacity', (e.sun || 0) / 100); }
  if (q('sTherm')) { const t = v.temp ?? last.temp_c ?? 25; const h = clamp((t + 10) / 100, 0, 1) * 64; set('sTherm', 'y', 66 - h + 6); set('sTherm', 'height', h); const tt = q('sThermT'); if (tt) tt.textContent = `${(+t).toFixed(1)}°`; sty('sHot', e.hot ? 1 : 0); }
  if (k === 'dht11') { const tt = q('sThermT'); if (tt && last.temp_c != null) tt.textContent = `${last.temp_c}° ${last.hum ?? ''}%`; }
  if (k === 'ldr') { const lux = v.lux ?? 100; set('sSun', 'opacity', clamp(Math.log10(lux + 1) / 3.6, 0.05, 1)); sty('sHand', e.cover ? 0.9 : 0); }
  if (k === 'heartbeat') { sty('sFinger', e.finger ? 1 : 0); set('gHeart', 'opacity', v.beat ? 0.95 : 0.2); }
  if (q('sWaves') && ['soundbig', 'soundmic'].includes(k)) q('sWaves').style.opacity = clamp(((v.db || 40) - 35) / 60, 0.05, 1);
  if (k === 'touch') sty('sHand', e.touch ? 0.95 : 0);
  if (k === 'tracking') set('sLine', 'x', G.x + G.w / 2 - 9 - (v.pos || 0) * 2.2);
  if (k === 'laser') set('sBeam', 'opacity', v.laser ? 0.95 : 0);
  if (k === 'irtx') { sty('sWaves', v.ir ? 1 : 0); set('gGlow', 'opacity', v.ir ? 0.45 : 0); }
  if (k === 'irrx') { const w = q('gWaves'); if (w) w.style.opacity = v.busy ? 1 : 0; }
  if (q('gWaves') && (k === 'passivebuzzer' || k === 'activebuzzer')) q('gWaves').style.opacity = v.tone ? 1 : 0;
  if (v.rgb && q('gDome')) { const [r, g, b] = v.rgb; const lit = r + g + b > 0; set('gDome', 'fill', lit ? `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)})` : '#eef0f4'); set('gGlow', 'fill', `rgb(${r},${g},${b})`); set('gGlow', 'opacity', lit ? 0.35 : 0); }
  if (k === 'flash7') { const H = ['#ff3b3b', '#ff9f1c', '#ffe14d', '#3bd16f', '#2ec4ff', '#4d6bff', '#c04dff']; set('gDome', 'fill', v.on ? H[v.hue] : '#eef0f4'); set('gGlow', 'fill', H[v.hue]); set('gGlow', 'opacity', v.on ? 0.35 : 0); }
  if (k === 'relay') set('sArm', 'x2', v.relay ? 44 : 44), set('sArm', 'y2', v.relay ? 31 : 65);
  if (k === 'joystick') { set('gCap', 'cx', G.x + G.w / 2 + (v.jx || 0) * 14); set('gCap', 'cy', cy + (v.jy || 0) * 14); }
  if (k === 'encoder') set('gKnob', 'transform', `rotate(${(last.count || 0) * 18} ${G.x + G.w / 2} ${cy})`);
  if (k === 'button') set('gBtn', 'fill', e.press ? '#f6c047' : '#111');
  if (k === 'magiccup') { const c = (n, b) => set('gCup' + n, 'fill', `rgb(255,${Math.round(255 - b * 0.35)},${Math.round(255 - b * 0.9)})`); c('A', v.la || 0); c('B', v.lb || 0); }
}
