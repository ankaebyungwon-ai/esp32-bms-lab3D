/* ── 순환 여정 파노라마: 한 장의 긴 풍경을 카메라가 지나간다 ──
   장면 11개(0~10). 10번은 1번(양극재 공장)과 같은 그림이라, 끝에서 1번으로 몰래 돌아가 끊김 없이 반복된다. */
const SV = 'http://www.w3.org/2000/svg';
const SW = 1400, GY = 660, NST = 11, VH = 900;
const FONT = 'font-family="Noto Sans KR, Outfit, sans-serif"';
const P = { forest: '#2D6A4F', deep: '#1B4332', leaf: '#95D5B2', mint: '#74C69D', sun: '#FFD60A', gold: '#E9B200', cream: '#F0F4EF', wall: '#FBF8EF', roof: '#E6DFC8' };

const lbl = (x, y, t, o = {}) => {
  const fs = o.fs || 22, w = Math.round([...t].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? fs * 1.02 : fs * .6), 0) + fs * 1.3), h = fs * 1.8;
  return `<g class="lbl"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${o.bg || '#ffffff'}" stroke="${o.st || P.forest}" stroke-width="2.5"/><text x="${x}" y="${y + fs * .36}" text-anchor="middle" ${FONT} font-size="${fs}" font-weight="700" fill="${o.fg || P.deep}">${t}</text></g>`;
};
const tree = (x, y, s = 1, k = 0) => {
  const c = ['#2D6A4F', '#40916C', '#52B788'][k % 3];
  return `<g class="sway" style="animation-delay:-${(x % 5).toFixed(1)}s"><rect x="${x - 5 * s}" y="${y - 62 * s}" width="${10 * s}" height="${62 * s}" rx="${3 * s}" fill="#7A5C3E"/><circle cx="${x}" cy="${y - 84 * s}" r="${38 * s}" fill="${c}"/><circle cx="${x - 27 * s}" cy="${y - 60 * s}" r="${26 * s}" fill="${c}"/><circle cx="${x + 27 * s}" cy="${y - 62 * s}" r="${28 * s}" fill="#52B788"/><circle cx="${x - 9 * s}" cy="${y - 104 * s}" r="${18 * s}" fill="#74C69D"/></g>`;
};
const bush = (x, y, s = 1) => `<g><circle cx="${x}" cy="${y - 14 * s}" r="${20 * s}" fill="#40916C"/><circle cx="${x + 22 * s}" cy="${y - 10 * s}" r="${15 * s}" fill="#52B788"/><circle cx="${x - 20 * s}" cy="${y - 9 * s}" r="${13 * s}" fill="#74C69D"/></g>`;
const flowers = (x, y, n = 5) => Array.from({ length: n }, (_, i) => `<circle cx="${x + i * 14}" cy="${y - 6 - (i % 2) * 6}" r="4" fill="${i % 2 ? '#FFD60A' : '#FFFFFF'}"/>`).join('');
const panel = (x, y, w = 70) => `<g><line x1="${x + w * .45}" y1="${y}" x2="${x + w * .45}" y2="${y + 26}" stroke="#7D8C84" stroke-width="4"/><polygon points="${x},${y} ${x + w},${y} ${x + w - 16},${y - 34} ${x - 16},${y - 34}" fill="#24476B" stroke="#DCE7F2" stroke-width="2"/><line x1="${x - 8}" y1="${y - 17}" x2="${x + w - 8}" y2="${y - 17}" stroke="#8FB3D9" stroke-width="1.5"/><line x1="${x + w * .33}" y1="${y}" x2="${x + w * .33 - 16}" y2="${y - 34}" stroke="#8FB3D9" stroke-width="1.5"/><line x1="${x + w * .66}" y1="${y}" x2="${x + w * .66 - 16}" y2="${y - 34}" stroke="#8FB3D9" stroke-width="1.5"/><polygon points="${x + w - 30},${y - 30} ${x + w - 20},${y - 30} ${x + w - 26},${y - 22}" fill="#fff" opacity=".55"/></g>`;
const garden = (x, y, w) => { let s = `<rect x="${x}" y="${y - 10}" width="${w}" height="12" rx="6" fill="#7A9E5A"/>`; for (let i = 0; i < w; i += 34) s += `<circle cx="${x + i + 14}" cy="${y - 14}" r="${14 + (i % 3) * 3}" fill="${i % 68 ? '#52B788' : '#40916C'}"/>`; return s; };
const bubbles = (x, y, w, h, c = '#ffffff') => Array.from({ length: 6 }, (_, i) => `<circle class="bub" cx="${(x + w * (.15 + i * .14)).toFixed(0)}" cy="${y + h - 8}" r="${4 + (i % 3) * 2}" fill="${c}" opacity=".8" style="--h:${-(h * .8).toFixed(0)}px;animation-delay:-${(i * .45).toFixed(2)}s"/>`).join('');
function tank(x, y, w, h, liq, o = {}) {
  let s = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * .1}" fill="url(#metal)" stroke="#94A39A" stroke-width="2.5"/>`;
  s += `<ellipse cx="${x + w / 2}" cy="${y + 2}" rx="${w / 2}" ry="${w * .1}" fill="#EEF3EF" stroke="#94A39A" stroke-width="2.5"/>`;
  s += `<rect x="${x + w * .2}" y="${y + h * .28}" width="${w * .6}" height="${h * .55}" rx="10" fill="#E9F0EC" stroke="#94A39A"/>`;
  s += `<rect x="${x + w * .2 + 4}" y="${y + h * .4}" width="${w * .6 - 8}" height="${h * .43 - 4}" rx="7" fill="${liq}"/>`;
  s += bubbles(x + w * .2, y + h * .4, w * .6, h * .43, o.bc || '#ffffff');
  if (o.stir) s += `<rect x="${x + w / 2 - 3}" y="${y - 30}" width="6" height="${h * .55}" fill="#5B6B63"/><rect x="${x + w / 2 - 22}" y="${y - 52}" width="44" height="26" rx="5" fill="#3E5249"/><g class="spin" style="animation-duration:1.4s"><rect x="${x + w / 2 - w * .22}" y="${y + h * .62 - 4}" width="${w * .44}" height="8" rx="4" fill="#3E5249"/><rect x="${x + w / 2 - 4}" y="${y + h * .62 - w * .16}" width="8" height="${w * .32}" rx="4" fill="#3E5249"/></g>`;
  s += [.18, .9].map(f => `<rect x="${x - 3}" y="${y + h * f}" width="${w + 6}" height="7" rx="3" fill="#B7C3BB"/>`).join('');
  s += `<rect x="${x + w * .15}" y="${y + h}" width="10" height="16" fill="#7D8C84"/><rect x="${x + w * .85 - 10}" y="${y + h}" width="10" height="16" fill="#7D8C84"/>`;
  if (o.gauge) s += `<circle cx="${x + w - 16}" cy="${y + h * .16}" r="11" fill="#fff" stroke="#5B6B63" stroke-width="2"/><line x1="${x + w - 16}" y1="${y + h * .16}" x2="${x + w - 9}" y2="${y + h * .16 - 6}" stroke="#D64545" stroke-width="2.5"/>`;
  return s + '</g>';
}
const pipe = (pts, c = '#A7B5AC', w = 10) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="${w * .3}" stroke-linejoin="round" stroke-linecap="round" transform="translate(-1,-2)"/>`;
const flow = (pts, c) => `<polyline class="flowline" points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="6 12" stroke-linecap="round"/>`;
function conveyor(x, y, w, item, k = 4, dur = 6) {
  let s = `<g><rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="#3E4A44"/><rect x="${x + 4}" y="${y + 3}" width="${w - 8}" height="4" rx="2" fill="#6B7A72"/>`;
  for (let i = 18; i < w - 10; i += 46) s += `<circle cx="${x + i}" cy="${y + 8}" r="5" fill="#9AA79F"/>`;
  s += `<rect x="${x + 16}" y="${y + 16}" width="8" height="${GY - y - 16}" fill="#7D8C84"/><rect x="${x + w - 24}" y="${y + 16}" width="8" height="${GY - y - 16}" fill="#7D8C84"/>`;
  for (let i = 0; i < k; i++) s += `<g class="belt" style="--d:${w - 70}px;animation-duration:${dur}s;animation-delay:-${(dur * i / k).toFixed(2)}s">${item(x + 10, y)}</g>`;
  return s + '</g>';
}
const bag = c => (x, y) => `<path d="M${x + 6},${y} q-4,-30 6,-44 h36 q10,14 6,44 z" fill="${c}" stroke="#00000022" stroke-width="2"/><rect x="${x + 14}" y="${y - 50}" width="28" height="9" rx="3" fill="#C9B98F"/><rect x="${x + 14}" y="${y - 28}" width="28" height="12" rx="3" fill="#ffffff" opacity=".7"/>`;
const cellItem = (x, y) => `<rect x="${x}" y="${y - 40}" width="44" height="40" rx="4" fill="url(#pouch)" stroke="#8D9AA3" stroke-width="2"/><rect x="${x + 8}" y="${y - 48}" width="9" height="10" fill="#C9CED6"/><rect x="${x + 27}" y="${y - 48}" width="9" height="10" fill="#C98A5B"/>`;
const packItem = (x, y) => `<rect x="${x}" y="${y - 30}" width="62" height="30" rx="6" fill="#2D6A4F" stroke="#1B4332" stroke-width="2"/><rect x="${x + 6}" y="${y - 24}" width="50" height="6" rx="3" fill="#95D5B2"/><rect x="${x + 22}" y="${y - 14}" width="18" height="8" rx="2" fill="#FFD60A"/>`;
const crystal = c => (x, y) => `<polygon points="${x + 4},${y} ${x + 14},${y - 26} ${x + 26},${y - 8} ${x + 34},${y - 32} ${x + 46},${y}" fill="${c}" stroke="#00000030" stroke-width="2"/><polygon points="${x + 14},${y - 26} ${x + 18},${y - 6} ${x + 26},${y - 8}" fill="#ffffff" opacity=".45"/>`;
function car(x, y, s = 1, col = '#2D6A4F') {
  return `<g><path d="M${x},${y - 22 * s} q4,-26 30,-30 l40,-22 q14,-6 30,-6 h70 q20,0 34,14 l22,18 q30,4 34,24 v20 h-230 z" fill="${col}" stroke="#163A2B" stroke-width="2.5"/>`
    + `<path d="M${x + 76},${y - 72 * s} h66 q12,0 20,10 l14,14 h-112 z" fill="#D9F0F2" stroke="#163A2B" stroke-width="2"/><line x1="${x + 132}" y1="${y - 72 * s}" x2="${x + 132}" y2="${y - 48 * s}" stroke="#163A2B" stroke-width="2"/>`
    + `<rect x="${x + 50}" y="${y - 10 * s}" width="130" height="12" rx="4" fill="#FFD60A" stroke="#B88E00" stroke-width="1.5"/>`
    + [x + 46, x + 186].map(cx => `<g class="spin" style="animation-duration:.7s"><circle cx="${cx}" cy="${y + 4}" r="24" fill="#22302A"/><circle cx="${cx}" cy="${y + 4}" r="12" fill="#C8D2CC"/><rect x="${cx - 2}" y="${y - 18}" width="4" height="44" fill="#22302A"/></g>`).join('')
    + `<circle cx="${x + 226}" cy="${y - 26}" r="6" fill="#FFF4B0"/></g>`;
}
function truck(x, y, c = '#40916C') {
  return `<g><rect x="${x}" y="${y - 70}" width="150" height="62" rx="8" fill="${c}" stroke="#1B4332" stroke-width="2.5"/><rect x="${x + 12}" y="${y - 58}" width="126" height="10" rx="4" fill="#ffffff" opacity=".55"/><path d="M${x + 152},${y - 8} v-46 h36 q14,0 22,18 l12,10 v18 z" fill="#F4F1E6" stroke="#1B4332" stroke-width="2.5"/><rect x="${x + 160}" y="${y - 46}" width="26" height="18" rx="3" fill="#BFE3E6"/>`
    + [x + 34, x + 120, x + 192].map(cx => `<g class="spin" style="animation-duration:.8s"><circle cx="${cx}" cy="${y}" r="18" fill="#22302A"/><circle cx="${cx}" cy="${y}" r="8" fill="#C8D2CC"/><rect x="${cx - 2}" y="${y - 14}" width="4" height="28" fill="#22302A"/></g>`).join('') + '</g>';
}
function building(x, y, w, h, o = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${o.wall || P.wall}" stroke="#D8CFB4" stroke-width="3"/>`;
  s += `<rect x="${x - 12}" y="${y - 14}" width="${w + 24}" height="18" rx="6" fill="${P.roof}" stroke="#D0C6A8" stroke-width="2"/>`;
  if (o.solar) for (let i = 0; i + 80 < w; i += 92) s += panel(x + 20 + i, y - 16, 72);
  else s += garden(x - 4, y - 14, w + 8);
  if (o.sign) s += lbl(x + w / 2, y + 34, o.sign, { fs: 20, bg: P.forest, fg: '#fff', st: P.deep });
  return s;
}
function tower(x, y, w, h, o = {}) {   // 녹색 도시 건물 (창문 + 베란다 정원)
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${o.c || '#F7F1E1'}" stroke="#D8CFB4" stroke-width="3"/>`;
  for (let r = 0; r * 70 + 50 < h - 30; r++) {
    for (let c = 0; c * 46 + 40 < w; c++) s += `<rect x="${x + 16 + c * 46}" y="${y + 30 + r * 70}" width="30" height="40" rx="6" fill="#CFE9EC" stroke="#B6CFC9"/>`;
    s += `<rect x="${x - 6}" y="${y + 74 + r * 70}" width="${w + 12}" height="8" rx="4" fill="#C9B98F"/>` + garden(x - 2, y + 74 + r * 70, w + 4).replace(/r="(\d+)"/g, (m, v) => `r="${Math.round(v * .55)}"`);
  }
  s += o.solar ? Array.from({ length: Math.max(1, Math.floor(w / 80)) }, (_, i) => panel(x + 14 + i * 80, y - 2, 60)).join('') : garden(x, y + 2, w);
  return s;
}

/* ── 장면 11개 ── */
const SCN = [];
SCN[0] = () => {   // 원료: 리튬 염호 + 니켈·코발트 광산
  let s = '';
  const ponds = [['#D6F1EA', 0], ['#B4E4D9', 1], ['#8FD5C8', 2], ['#6CC7B8', 3]];
  ponds.forEach(([c, i]) => { const x = 120 + i * 130, y = GY - 20; s += `<polygon points="${x},${y} ${x + 120},${y} ${x + 170},${y - 70} ${x + 50},${y - 70}" fill="${c}" stroke="#FFFFFF" stroke-width="7"/><polygon points="${x + 28},${y - 18} ${x + 98},${y - 18} ${x + 112},${y - 36} ${x + 42},${y - 36}" fill="#ffffff" opacity=".35" class="shimmer" style="animation-delay:-${i}s"/>`; });
  s += `<rect x="460" y="${GY - 150}" width="90" height="60" rx="6" fill="#F7F1E1" stroke="#D8CFB4" stroke-width="3"/>` + panel(468, GY - 152, 70);
  s += lbl(380, GY - 190, '리튬 염호 · 증발 연못');
  // 광산: 계단식 노천 광산
  const mx = 780;
  s += `<path d="M${mx},${GY} L${mx + 60},${GY - 150} L${mx + 480},${GY - 150} L${mx + 560},${GY} Z" fill="#C9A77C"/>`;
  [0, 1, 2].forEach(i => { s += `<path d="M${mx + 40 + i * 30},${GY - 120 + i * 40} L${mx + 520 - i * 30},${GY - 120 + i * 40}" stroke="#A9865D" stroke-width="12" stroke-linecap="round"/>`; });
  s += `<path d="M${mx + 140},${GY - 30} q130,-50 260,0" fill="#8C6A47"/>`;
  // 굴착기
  const ex = mx + 330;
  s += `<rect x="${ex}" y="${GY - 230}" width="90" height="50" rx="8" fill="#FFD60A" stroke="#9C7A00" stroke-width="3"/><rect x="${ex + 60}" y="${GY - 222}" width="24" height="22" rx="3" fill="#CFE9EC"/><rect x="${ex - 6}" y="${GY - 182}" width="104" height="22" rx="11" fill="#3E4A44"/>`;
  s += `<g class="dig" style="transform-origin:${ex + 10}px ${GY - 220}px"><path d="M${ex + 10},${GY - 220} L${ex - 80},${GY - 290} L${ex - 130},${GY - 220}" fill="none" stroke="#E2B800" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/><path d="M${ex - 150},${GY - 226} h44 l-8,30 h-30 z" fill="#5B6B63"/></g>`;
  s += `<g class="drive" style="--d:420px;animation-duration:9s">${truck(mx - 200, GY + 40, '#B07D3A')}<path d="M${mx - 190},${GY - 30} q40,-30 130,-26 q10,4 10,24 z" fill="#7C8C9C"/><circle cx="${mx - 160}" cy="${GY - 40}" r="10" fill="#5F8C78"/><circle cx="${mx - 120}" cy="${GY - 44}" r="9" fill="#3D5A80"/></g>`;
  s += lbl(mx + 280, GY - 300, '니켈 · 코발트 광산');
  s += tree(60, GY, 1.1, 0) + tree(700, GY, .9, 1) + tree(1360, GY, 1.2, 2) + bush(640, GY + 4) + flowers(30, GY + 20, 6);
  return s;
};
SCN[1] = () => {   // 양극재 공장
  let s = building(150, GY - 400, 1100, 400, { solar: true, sign: '양극재 공장' });
  s += `<rect x="170" y="${GY - 330}" width="1060" height="320" rx="8" fill="#FDFDF8"/>`;
  s += pipe([[40, GY - 300], [200, GY - 300], [200, GY - 260]], '#9FC8B5', 12) + flow([[40, GY - 300], [200, GY - 300]], '#2D9C6B');
  s += lbl(110, GY - 345, '금속 용액', { fs: 18 });
  s += tank(230, GY - 290, 150, 270, '#7CC9A4', { stir: true, gauge: true });
  s += lbl(305, GY - 360 + 30, '전구체 반응기', { fs: 20 });
  s += pipe([[380, GY - 120], [470, GY - 120], [470, GY - 170]], '#A7B5AC', 10);
  s += `<rect x="460" y="${GY - 230}" width="80" height="120" rx="10" fill="#E7EDE9" stroke="#94A39A" stroke-width="2.5"/><rect x="474" y="${GY - 210}" width="52" height="30" rx="5" fill="#C9D6CE"/>`;
  s += lbl(500, GY - 260, '건조', { fs: 18 });
  // 롤러 하스 소성로
  s += `<rect x="570" y="${GY - 220}" width="430" height="120" rx="16" fill="#E5E1D6" stroke="#B8AE96" stroke-width="3"/>`;
  for (let i = 0; i < 5; i++) s += `<rect class="glow" x="${590 + i * 82}" y="${GY - 196}" width="64" height="44" rx="8" fill="url(#hot)" style="animation-delay:-${(i * .3).toFixed(1)}s"/>`;
  s += `<rect x="560" y="${GY - 100}" width="450" height="14" rx="7" fill="#7D8C84"/>` + Array.from({ length: 9 }, (_, i) => `<circle cx="${580 + i * 52}" cy="${GY - 93}" r="6" fill="#B7C3BB"/>`).join('');
  s += lbl(785, GY - 250, '소성로 · 리튬과 함께 굽기', { fs: 20 });
  s += conveyor(1030, GY - 150, 200, bag('#4A4F57'), 3, 5.5);
  s += lbl(1130, GY - 230, '양극재(CAM)', { fs: 20 });
  s += tree(80, GY, 1, 2) + tree(1320, GY, 1.1, 0) + bush(1270, GY + 6, .9) + flowers(60, GY + 22, 5);
  return s;
};
SCN[2] = () => {   // 셀 공장
  let s = building(120, GY - 420, 1160, 420, { sign: '셀 공장' });
  s += `<rect x="140" y="${GY - 350}" width="1120" height="340" rx="8" fill="#FDFDF8"/>`;
  // 코팅 라인: 풀림 롤 → 코터 → 건조로 → 압연 → 감김 롤
  const ry = GY - 200;
  s += `<g class="spin" style="animation-duration:3s"><circle cx="200" cy="${ry}" r="46" fill="#C9CED6" stroke="#8D9AA3" stroke-width="3"/><circle cx="200" cy="${ry}" r="14" fill="#5B6B63"/><rect x="198" y="${ry - 46}" width="4" height="92" fill="#8D9AA3"/></g>`;
  s += `<path d="M200,${ry - 46} L640,${ry - 46}" stroke="#B9BEC6" stroke-width="5"/><path class="web" d="M250,${ry - 46} L640,${ry - 46}" stroke="#2F3A36" stroke-width="6" stroke-dasharray="20 10"/>`;
  s += `<rect x="270" y="${ry - 80}" width="60" height="30" rx="6" fill="#5B6B63"/><rect x="290" y="${ry - 56}" width="20" height="12" fill="#2F3A36"/>`;
  s += `<rect x="350" y="${ry - 92}" width="230" height="90" rx="12" fill="#F1E7D3" stroke="#C9B98F" stroke-width="3"/>` + [0, 1, 2].map(i => `<rect class="glow" x="${364 + i * 72}" y="${ry - 34}" width="58" height="18" rx="5" fill="url(#hot)" opacity=".6" style="animation-delay:-${i * .4}s"/>`).join('');
  s += [ry - 64, ry - 28].map(cy => `<g class="spin" style="animation-duration:1.2s"><circle cx="640" cy="${cy}" r="22" fill="#C9CED6" stroke="#5B6B63" stroke-width="3"/><rect x="638" y="${cy - 22}" width="4" height="44" fill="#5B6B63"/></g>`).join('');
  s += `<g class="spin" style="animation-duration:3s;animation-direction:reverse"><circle cx="730" cy="${ry - 46}" r="40" fill="#3A4541" stroke="#5B6B63" stroke-width="3"/><rect x="728" y="${ry - 86}" width="4" height="80" fill="#8D9AA3"/></g><path d="M660,${ry - 46} L730,${ry - 86}" stroke="#2F3A36" stroke-width="5"/>`;
  s += lbl(470, ry - 130, '코팅 · 건조 · 압연', { fs: 20 });
  // 적층기
  s += `<rect x="810" y="${GY - 260}" width="140" height="230" rx="12" fill="#E7EDE9" stroke="#94A39A" stroke-width="2.5"/><g class="press"><rect x="850" y="${GY - 250}" width="60" height="70" rx="6" fill="#5B6B63"/><rect x="840" y="${GY - 184}" width="80" height="10" rx="3" fill="#2F3A36"/></g>`;
  s += Array.from({ length: 7 }, (_, i) => `<rect x="836" y="${GY - 70 - i * 8}" width="88" height="6" rx="2" fill="${i % 2 ? '#2F3A36' : '#C98A5B'}"/>`).join('');
  s += lbl(880, GY - 290, '적층 · 조립', { fs: 20 });
  // 화성 랙
  s += `<rect x="980" y="${GY - 300}" width="190" height="270" rx="10" fill="#EEF2EE" stroke="#94A39A" stroke-width="2.5"/>`;
  for (let r = 0; r < 4; r++) { s += `<rect x="990" y="${GY - 240 + r * 58}" width="170" height="6" fill="#B7C3BB"/>`; for (let c = 0; c < 5; c++) s += `<rect x="${996 + c * 33}" y="${GY - 278 + r * 58}" width="24" height="36" rx="3" fill="url(#pouch)" stroke="#8D9AA3"/><circle class="blink" cx="${1008 + c * 33}" cy="${GY - 286 + r * 58}" r="4" fill="${(r + c) % 3 ? '#52B788' : '#FFD60A'}" style="animation-delay:-${((r * 5 + c) * .23).toFixed(2)}s"/>`; }
  s += lbl(1075, GY - 330, '화성 · 첫 충전', { fs: 20 });
  s += conveyor(1180, GY - 110, 200, cellItem, 3, 5);
  s += tree(60, GY, 1, 1) + bush(1330, GY + 6) + flowers(40, GY + 22, 4);
  return s;
};
SCN[3] = () => {   // 모듈·팩 조립
  let s = building(160, GY - 380, 1080, 380, { solar: true, sign: '팩 조립' });
  s += `<rect x="180" y="${GY - 310}" width="1040" height="300" rx="8" fill="#FDFDF8"/>`;
  s += conveyor(200, GY - 120, 260, cellItem, 4, 6);
  s += lbl(330, GY - 200, '셀', { fs: 20 });
  // 로봇 팔
  const bx = 560, by = GY - 40;
  s += `<rect x="${bx - 40}" y="${by - 20}" width="80" height="34" rx="8" fill="#3E5249"/><g class="arm" style="transform-origin:${bx}px ${by - 20}px"><rect x="${bx - 12}" y="${by - 190}" width="24" height="176" rx="12" fill="#FFD60A" stroke="#9C7A00" stroke-width="2"/><circle cx="${bx}" cy="${by - 190}" r="16" fill="#3E5249"/><g class="arm2" style="transform-origin:${bx}px ${by - 190}px"><rect x="${bx}" y="${by - 202}" width="150" height="24" rx="12" fill="#FFD60A" stroke="#9C7A00" stroke-width="2"/><rect x="${bx + 138}" y="${by - 196}" width="16" height="44" rx="4" fill="#3E5249"/><rect x="${bx + 120}" y="${by - 156}" width="52" height="28" rx="5" fill="#2D6A4F" stroke="#1B4332" stroke-width="2"/></g></g>`;
  // 팩 트레이
  const tx = 760, ty = GY - 110;
  s += `<rect x="${tx}" y="${ty}" width="380" height="90" rx="12" fill="#C9D3CC" stroke="#7D8C84" stroke-width="3"/>`;
  for (let i = 0; i < 4; i++) s += `<rect class="${i === 3 ? 'drop' : ''}" x="${tx + 16 + i * 88}" y="${ty + 12}" width="78" height="56" rx="6" fill="#2D6A4F" stroke="#1B4332" stroke-width="2"/><rect x="${tx + 24 + i * 88}" y="${ty + 20}" width="62" height="8" rx="3" fill="#95D5B2"/>`;
  s += `<rect x="${tx + 150}" y="${ty - 26}" width="80" height="24" rx="5" fill="#1F7A4D" stroke="#0E3D27" stroke-width="2"/>` + [0, 1, 2].map(i => `<rect x="${tx + 160 + i * 22}" y="${ty - 20}" width="14" height="12" fill="#22302A"/>`).join('') + `<circle class="blink" cx="${tx + 222}" cy="${ty - 14}" r="4" fill="#52B788"/>`;
  s += lbl(tx + 190, ty - 70, '모듈 + BMS → 배터리팩', { fs: 20 });
  s += tree(80, GY, 1.1, 0) + tree(1320, GY, 1, 2) + flowers(1250, GY + 20, 5);
  return s;
};
SCN[4] = () => {   // 전기차: 솔라펑크 도시
  let s = tower(80, GY - 420, 220, 420, { solar: true }) + tower(330, GY - 330, 180, 330) + tower(980, GY - 380, 200, 380, { solar: true, c: '#F3EEDD' }) + tower(1210, GY - 300, 170, 300);
  // 충전소
  s += `<rect x="560" y="${GY - 180}" width="300" height="16" rx="8" fill="#E6DFC8"/>` + panel(580, GY - 182, 80) + panel(690, GY - 182, 80) + `<rect x="590" y="${GY - 164}" width="10" height="164" fill="#B7AE93"/><rect x="820" y="${GY - 164}" width="10" height="164" fill="#B7AE93"/>`;
  s += `<rect x="640" y="${GY - 120}" width="50" height="110" rx="10" fill="#2D6A4F" stroke="#1B4332" stroke-width="2.5"/><rect x="650" y="${GY - 108}" width="30" height="22" rx="4" fill="#B7E4C7"/><path class="blink" d="M668,${GY - 106} l-8,12 h8 l-4,10 l12,-14 h-8 l4,-8 z" fill="#FFD60A"/>`;
  s += `<path d="M690,${GY - 70} q40,10 60,50" fill="none" stroke="#22302A" stroke-width="5"/>`;
  s += car(700, GY + 2, 1, '#52B788');
  s += lbl(710, GY - 230, '충전하며 수년간 주행', { fs: 20 });
  s += `<g class="drive" style="--d:1200px;animation-duration:7s">${car(-120, GY + 76, 1, '#2D6A4F')}</g>`;
  s += tree(540, GY, 1, 1) + tree(930, GY, .9, 2) + bush(320, GY + 6) + flowers(860, GY + 20, 6);
  return s;
};
SCN[5] = () => {   // 수명 진단
  let s = building(220, GY - 360, 760, 360, { sign: '배터리 진단 센터' });
  s += `<rect x="240" y="${GY - 290}" width="720" height="280" rx="8" fill="#FDFDF8"/>`;
  s += `<rect x="290" y="${GY - 110}" width="330" height="18" rx="6" fill="#B7AE93"/><rect x="300" y="${GY - 92}" width="14" height="92" fill="#9C9479"/><rect x="596" y="${GY - 92}" width="14" height="92" fill="#9C9479"/>`;
  s += `<rect x="330" y="${GY - 180}" width="250" height="70" rx="10" fill="#2D6A4F" stroke="#1B4332" stroke-width="3"/>` + [0, 1, 2, 3].map(i => `<rect x="${344 + i * 58}" y="${GY - 168}" width="48" height="12" rx="4" fill="#95D5B2"/>`).join('');
  s += `<path d="M580,${GY - 150} q60,-10 90,-60" fill="none" stroke="#D64545" stroke-width="5"/><path d="M580,${GY - 132} q70,0 100,-60" fill="none" stroke="#22302A" stroke-width="5"/>`;
  // 충방전 시험기 + SOH 계기판
  s += `<rect x="660" y="${GY - 270}" width="260" height="260" rx="14" fill="#E7EDE9" stroke="#94A39A" stroke-width="3"/><rect x="680" y="${GY - 250}" width="220" height="150" rx="10" fill="#10261C"/>`;
  s += `<path d="M710,${GY - 130} A80,80 0 0 1 870,${GY - 130}" fill="none" stroke="#2B4A3A" stroke-width="16"/><path d="M710,${GY - 130} A80,80 0 0 1 836,${GY - 194}" fill="none" stroke="#52B788" stroke-width="16"/>`;
  s += `<g class="needle" style="transform-origin:790px ${GY - 130}px"><line x1="790" y1="${GY - 130}" x2="790" y2="${GY - 198}" stroke="#FFD60A" stroke-width="5" stroke-linecap="round"/></g><circle cx="790" cy="${GY - 130}" r="8" fill="#FFD60A"/>`;
  s += `<text x="790" y="${GY - 108}" text-anchor="middle" ${FONT} font-size="22" font-weight="800" fill="#B7E4C7">SOH 72%</text>`;
  s += [0, 1, 2].map(i => `<circle class="blink" cx="${700 + i * 26}" cy="${GY - 70}" r="7" fill="${['#52B788', '#FFD60A', '#52B788'][i]}" style="animation-delay:-${i * .5}s"/>`).join('');
  s += lbl(830, GY - 300, '잔존용량(SOH) 진단', { fs: 20 });
  // 갈림길 표지판
  s += `<rect x="1000" y="${GY - 230}" width="12" height="230" fill="#7A5C3E"/>`;
  s += `<path d="M1012,${GY - 220} h150 l26,24 l-26,24 h-150 z" fill="#52B788" stroke="#1B4332" stroke-width="2.5"/><text x="1084" y="${GY - 188}" text-anchor="middle" ${FONT} font-size="21" font-weight="800" fill="#0E2F20">재사용 →</text>`;
  s += `<path d="M1012,${GY - 150} h150 l26,24 l-26,24 h-150 z" fill="#FFD60A" stroke="#7A5E00" stroke-width="2.5"/><text x="1084" y="${GY - 118}" text-anchor="middle" ${FONT} font-size="21" font-weight="800" fill="#4A3A00">재활용 →</text>`;
  s += tree(110, GY, 1.1, 2) + tree(1330, GY, 1, 0) + bush(1240, GY + 6) + flowers(140, GY + 22, 5);
  return s;
};
SCN[6] = () => {   // 재사용 ESS: 태양광 + 풍력 + 컨테이너 ESS
  let s = '';
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) s += panel(80 + i * 90 + r * 40, GY - 60 + r * 46, 78);
  const wx = 1180;
  s += `<polygon points="${wx - 10},${GY} ${wx + 10},${GY} ${wx + 5},${GY - 380} ${wx - 5},${GY - 380}" fill="#F4F1E6" stroke="#C9C1A6" stroke-width="2"/>`;
  s += `<g class="spin" style="animation-duration:5s">` + [0, 120, 240].map(a => `<path d="M${wx},${GY - 380} q-14,-60 0,-150 q14,90 0,150 z" fill="#FFFFFF" stroke="#B9B39C" stroke-width="2" transform="rotate(${a} ${wx} ${GY - 380})"/>`).join('') + `<circle cx="${wx}" cy="${GY - 380}" r="14" fill="#E6DFC8" stroke="#B9B39C"/></g>`;
  // 컨테이너 ESS (문 열림)
  const cx = 700, cy = GY - 190;
  s += `<rect x="${cx}" y="${cy}" width="380" height="190" rx="10" fill="#2D6A4F" stroke="#1B4332" stroke-width="3"/>` + Array.from({ length: 9 }, (_, i) => `<rect x="${cx + 12 + i * 41}" y="${cy + 12}" width="6" height="166" fill="#25573F"/>`).join('');
  s += `<rect x="${cx + 120}" y="${cy + 20}" width="200" height="160" rx="6" fill="#F4F6F2" stroke="#1B4332" stroke-width="2"/>`;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += `<rect x="${cx + 132 + c * 62}" y="${cy + 30 + r * 37}" width="54" height="28" rx="4" fill="#40916C" stroke="#1B4332"/><circle class="blink" cx="${cx + 176 + c * 62}" cy="${cy + 38 + r * 37}" r="4" fill="#B7E4C7" style="animation-delay:-${((r * 3 + c) * .3).toFixed(1)}s"/>`;
  s += `<polygon points="${cx + 320},${cy + 20} ${cx + 372},${cy + 4} ${cx + 372},${cy + 196} ${cx + 320},${cy + 180}" fill="#40916C" stroke="#1B4332" stroke-width="2"/>`;
  s += flow([[560, GY - 40], [cx, GY - 40]], '#FFD60A') + flow([[cx + 380, GY - 120], [wx - 30, GY - 120]], '#FFD60A');
  s += lbl(cx + 190, cy - 40, '재사용 ESS · 남는 전기를 저장', { fs: 20 });
  s += tree(640, GY, .9, 1) + tree(1340, GY, 1, 2) + bush(1100, GY + 6) + flowers(560, GY + 22, 6);
  return s;
};
SCN[7] = () => {   // 방전 · 해체
  let s = building(130, GY - 400, 1130, 400, { solar: true, sign: '재활용 센터 · 전처리' });
  s += `<rect x="150" y="${GY - 330}" width="1090" height="320" rx="8" fill="#FDFDF8"/>`;
  s += `<g class="drive" style="--d:180px;animation-duration:8s">${truck(-40, GY + 40, '#52B788')}</g>`;
  // 방전 캐비닛
  s += `<rect x="190" y="${GY - 280}" width="300" height="250" rx="12" fill="#E7EDE9" stroke="#94A39A" stroke-width="3"/>`;
  for (let r = 0; r < 3; r++) s += `<rect x="210" y="${GY - 260 + r * 76}" width="200" height="58" rx="8" fill="#2D6A4F" stroke="#1B4332" stroke-width="2"/><rect class="drain" x="222" y="${GY - 248 + r * 76}" width="176" height="12" rx="5" fill="#FFD60A" style="animation-delay:-${r * .9}s"/>`;
  s += `<rect x="420" y="${GY - 260}" width="50" height="210" rx="8" fill="#3E5249"/>` + [0, 1, 2].map(i => `<path class="blink" d="M${445},${GY - 240 + i * 70} l-8,14 h9 l-5,12 l14,-17 h-9 l5,-9 z" fill="#FFD60A" style="animation-delay:-${i * .3}s"/>`).join('');
  s += lbl(340, GY - 310, '방전 · 남은 전기 빼기', { fs: 20 });
  // 해체 로봇 + 열린 팩
  const px = 600, py = GY - 120;
  s += `<rect x="${px}" y="${py}" width="330" height="100" rx="12" fill="#C9D3CC" stroke="#7D8C84" stroke-width="3"/>` + [0, 1, 2].map(i => `<rect x="${px + 16 + i * 104}" y="${py + 14}" width="92" height="64" rx="6" fill="#2D6A4F" stroke="#1B4332" stroke-width="2"/>`).join('');
  s += `<g class="lift"><rect x="${px + 120}" y="${py - 90}" width="92" height="64" rx="6" fill="#40916C" stroke="#1B4332" stroke-width="2"/></g>`;
  s += `<rect x="${px + 156}" y="${GY - 380}" width="20" height="150" fill="#5B6B63"/><rect x="${px + 100}" y="${GY - 392}" width="132" height="18" rx="6" fill="#3E5249"/><g class="lift"><rect x="${px + 140}" y="${GY - 240}" width="52" height="26" rx="6" fill="#FFD60A" stroke="#9C7A00" stroke-width="2"/></g>`;
  s += `<rect x="${px + 330 + 40}" y="${GY - 70}" width="200" height="60" rx="10" fill="#D9E3DC" stroke="#7D8C84" stroke-width="2"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${px + 384 + i * 30}" y="${GY - 112 + (i % 2) * 6}" width="24" height="44" rx="3" fill="url(#pouch)" stroke="#8D9AA3"/>`).join('');
  s += lbl(px + 470, GY - 200, '해체 · 팩 → 모듈 → 셀', { fs: 20 });
  s += tree(1320, GY, 1.1, 0) + bush(70, GY + 8) + flowers(1220, GY + 22, 5);
  return s;
};
SCN[8] = () => {   // 파쇄 · 선별 → 블랙매스
  let s = building(120, GY - 420, 1160, 420, { sign: '파쇄 · 선별' });
  s += `<rect x="140" y="${GY - 350}" width="1120" height="340" rx="8" fill="#FDFDF8"/>`;
  s += conveyor(160, GY - 290, 230, cellItem, 3, 4);
  // 파쇄기
  const sx = 420;
  s += `<polygon points="${sx},${GY - 330} ${sx + 220},${GY - 330} ${sx + 180},${GY - 250} ${sx + 40},${GY - 250}" fill="#C9D3CC" stroke="#7D8C84" stroke-width="3"/>`;
  s += `<rect x="${sx + 30}" y="${GY - 250}" width="160" height="110" rx="10" fill="#5B6B63" stroke="#3E4A44" stroke-width="3"/>`;
  s += [[sx + 78, 1], [sx + 142, -1]].map(([cx, d]) => `<g class="spin" style="animation-duration:1.1s;${d < 0 ? 'animation-direction:reverse' : ''}"><circle cx="${cx}" cy="${GY - 196}" r="30" fill="#9AA79F" stroke="#E7EDE9" stroke-width="10" stroke-dasharray="8 7"/><circle cx="${cx}" cy="${GY - 196}" r="8" fill="#3E4A44"/></g>`).join('');
  s += Array.from({ length: 5 }, (_, i) => `<rect class="fall" x="${sx + 70 + i * 18}" y="${GY - 140}" width="10" height="10" rx="2" fill="${['#9AA4AE', '#C98A5B', '#2A2A2A', '#BFC5CC', '#2A2A2A'][i]}" style="animation-delay:-${(i * .25).toFixed(2)}s"/>`).join('');
  s += lbl(sx + 110, GY - 370, '파쇄', { fs: 20 });
  // 진동 체
  s += `<g class="shake"><rect x="${sx + 20}" y="${GY - 110}" width="300" height="40" rx="8" fill="#B7C3BB" stroke="#7D8C84" stroke-width="3"/>` + Array.from({ length: 12 }, (_, i) => `<line x1="${sx + 36 + i * 24}" y1="${GY - 104}" x2="${sx + 36 + i * 24}" y2="${GY - 76}" stroke="#7D8C84" stroke-width="2"/>`).join('') + '</g>';
  s += lbl(sx + 170, GY - 30, '선별 · 체질', { fs: 18 });
  // 세 갈래 출구
  const outs = [['플라스틱', '#E9EDF1', '#B7C0C9', 820], ['구리 · 알루미늄', '#E8B07C', '#C0C6CC', 960], ['블랙매스', '#1F1F1F', '#3A3A3A', 1110]];
  outs.forEach(([t, c1, c2, x]) => {
    s += `<rect x="${x - 60}" y="${GY - 120}" width="120" height="110" rx="12" fill="#E7EDE9" stroke="#94A39A" stroke-width="3"/>`;
    s += `<path d="M${x - 46},${GY - 22} q46,-${t === '블랙매스' ? 92 : 60} 92,0 z" fill="${c1}"/>` + (t === '블랙매스' ? '' : `<path d="M${x - 30},${GY - 30} l14,-16 l12,10 l16,-18 l10,22 z" fill="${c2}"/>`);
    s += lbl(x, GY - 150, t, { fs: t === '블랙매스' ? 22 : 18, bg: t === '블랙매스' ? '#1B1B1B' : '#ffffff', fg: t === '블랙매스' ? '#FFD60A' : P.deep, st: t === '블랙매스' ? '#000' : P.forest });
  });
  s += Array.from({ length: 6 }, (_, i) => `<circle class="fall2" cx="${1090 + (i % 3) * 18}" cy="${GY - 250}" r="5" fill="#111" style="animation-delay:-${(i * .3).toFixed(1)}s"/>`).join('');
  s += pipe([[sx + 320, GY - 90], [760, GY - 90], [760, GY - 200], [1110, GY - 200], [1110, GY - 260]], '#A7B5AC', 10);
  s += tree(60, GY, 1, 0) + bush(1330, GY + 6) + flowers(40, GY + 22, 4);
  return s;
};
SCN[9] = () => {   // 습식제련: 침출 → 용매추출 → 결정화
  let s = building(80, GY - 430, 1240, 430, { solar: true, sign: '습식제련' });
  s += `<rect x="100" y="${GY - 360}" width="1200" height="350" rx="8" fill="#FDFDF8"/>`;
  s += tank(130, GY - 280, 120, 260, '#3C3C3C', { stir: true, bc: '#9BE3C3' }) + tank(270, GY - 280, 120, 260, '#4A6B5A', { stir: true, gauge: true, bc: '#CFF5E1' });
  s += lbl(260, GY - 330, '침출 · 산에 녹이기', { fs: 20 });
  // 믹서-세틀러
  const mx = 430;
  for (let i = 0; i < 4; i++) {
    const x = mx + i * 105;
    s += `<rect x="${x}" y="${GY - 170}" width="92" height="120" rx="10" fill="#E7EDE9" stroke="#94A39A" stroke-width="2.5"/><rect x="${x + 8}" y="${GY - 128}" width="76" height="34" rx="5" fill="#F3E3A1"/><rect x="${x + 8}" y="${GY - 94}" width="76" height="36" rx="5" fill="${['#7CC9A4', '#E7A3BE', '#F2C4D3', '#E8EEF3'][i]}"/>`;
    s += `<rect x="${x + 42}" y="${GY - 212}" width="8" height="70" fill="#5B6B63"/><g class="spin" style="animation-duration:1s"><rect x="${x + 26}" y="${GY - 146}" width="40" height="8" rx="4" fill="#3E5249"/></g>`;
  }
  s += lbl(mx + 205, GY - 250, '용매추출 · 금속별로 분리', { fs: 20 });
  s += pipe([[390, GY - 60], [mx, GY - 60]], '#A7B5AC', 8);
  // 결정화 → 제품
  const items = [['황산니켈', '#3FA34D'], ['황산코발트', '#C2185B'], ['황산망간', '#F4A6C0'], ['탄산리튬', '#F7F7F2']];
  items.forEach(([t, c], i) => {
    const x = 880 + i * 104;
    s += `<rect x="${x}" y="${GY - 240}" width="86" height="120" rx="12" fill="#E9F0EC" stroke="#94A39A" stroke-width="2.5"/><rect x="${x + 10}" y="${GY - 200}" width="66" height="70" rx="8" fill="${c}" opacity=".35"/>` + crystal(c)(x + 20, GY - 140);
    s += `<g class="pop" style="animation-delay:-${(i * .5).toFixed(1)}s">${crystal(c)(x + 20, GY - 30)}</g>`;
    s += `<text x="${x + 43}" y="${GY - 252}" text-anchor="middle" ${FONT} font-size="17" font-weight="800" fill="${P.deep}">${t}</text>`;
  });
  s += lbl(1040, GY - 300, '결정화 · 배터리급 원료', { fs: 20 });
  s += conveyor(870, GY - 12 - 4, 430, crystal('#3FA34D'), 0, 5);
  s += flow([[1240, GY + 40], [1400, GY + 40]], '#2D9C6B');
  s += tree(40, GY, 1, 2) + flowers(1310, GY + 22, 5);
  return s;
};
SCN[10] = () => SCN[1]().replace('양극재 공장', '다시 양극재 공장으로') + lbl(700, GY - 470, '↺ 순환 한 바퀴', { fs: 24, bg: '#FFD60A', fg: '#3A2E00', st: '#B88E00' });

/* 배경: 먼 언덕(시차), 구름, 땅, 길 */
function backdrop(total) {
  let hills = '';
  const H = (y, amp, step, col) => { let d = `M-1200,${VH}`; for (let x = -1200; x <= total + 1200; x += step) d += ` L${x},${(y - amp * (.6 + .4 * Math.sin(x / 233) * Math.cos(x / 517))).toFixed(0)}`; return `<path d="${d} L${total + 1200},${VH} Z" fill="${col}"/>`; };
  hills += H(GY - 110, 120, 60, '#D3EAD9') + H(GY - 50, 80, 50, '#BBDFC6');
  for (let x = -800; x < total + 800; x += 900) hills += `<g transform="translate(${x + 300},${GY - 230})"><rect x="-6" y="0" width="12" height="160" fill="#E8E2CD"/><g class="spin" style="animation-duration:7s">${[0, 120, 240].map(a => `<path d="M0,0 q-6,-28 0,-70 q6,42 0,70 z" fill="#FFFFFF" opacity=".9" transform="rotate(${a})"/>`).join('')}</g></g>`;
  let clouds = '';
  for (let x = -600; x < total + 600; x += 760) clouds += `<g class="cloud" style="animation-delay:-${(x % 13)}s"><ellipse cx="${x}" cy="${120 + (x % 3) * 40}" rx="90" ry="28" fill="#fff" opacity=".85"/><ellipse cx="${x + 50}" cy="${105 + (x % 3) * 40}" rx="60" ry="30" fill="#fff" opacity=".9"/></g>`;
  const ground = `<rect x="-2000" y="${GY}" width="${total + 4000}" height="${VH - GY}" fill="url(#grass)"/><rect x="-2000" y="${GY + 58}" width="${total + 4000}" height="44" fill="#EDE6CF"/><line x1="-2000" y1="${GY + 80}" x2="${total + 2000}" y2="${GY + 80}" stroke="#D8CFB4" stroke-width="4" stroke-dasharray="40 30"/>`;
  return { hills, clouds, ground };
}

function buildPano(svg) {
  const total = SW * NST;
  const defs = `<defs>
    <linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#C9D3CC"/><stop offset=".45" stop-color="#F4F7F5"/><stop offset="1" stop-color="#AEBAB2"/></linearGradient>
    <linearGradient id="pouch" x1="0" x2="1"><stop offset="0" stop-color="#D8DDE3"/><stop offset=".5" stop-color="#F6F8FA"/><stop offset="1" stop-color="#B9C1C9"/></linearGradient>
    <linearGradient id="hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#FF9E3D"/></linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D8B8"/><stop offset="1" stop-color="#7FBF97"/></linearGradient>
  </defs>`;
  const bd = backdrop(total);
  let mid = '';
  for (let i = 0; i < NST; i++) mid += `<g transform="translate(${i * SW},0)" data-scene="${i}">${SCN[i]()}</g>`;
  svg.innerHTML = defs + `<g id="pBack">${bd.clouds}${bd.hills}</g>${bd.ground}<g id="pMid">${mid}</g>`;
  return { total };
}
const PANO = { SW, NST, VH, GY };
