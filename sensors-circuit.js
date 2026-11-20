/* 센서 회로 엔진 v2 — 센서 40종(예시 회로)과 가상 실험실이 함께 씁니다
   배치: 3D 실습실과 같은 브레드보드 2장 + 가운데 ESP32 (USB 오른쪽)
     아래 보드(L): [− + 레일] F G H I J | A B C D E   (레일: + = 5V, − = GND)
     위 보드(R):   F G H I J | A B C D E [− + 레일]  (레일: + = 3V3, − = GND)
   모듈은 보드 밖에 두고 암-수 점퍼로 연결합니다 (3.3V 모듈 = 위 보드 위쪽, 5V 모듈·출력 = 아래 보드 아래쪽).
   선 정리: 모든 선을 가로·세로로만 그리고, 가로 구간은 보드 가운데 홈(채널)의 차선에, 위↔아래를 건너는 선은
   ESP32 왼쪽(안테나 쪽) 세로 통로에 한 줄씩 배정해 겹치지 않게 합니다.
   저항: 키트의 10kΩ·220Ω·330Ω 각 4개 안에서만 씁니다 (LED는 220Ω → 330Ω 순서, 분배기는 10kΩ). */
import { BOARDS } from './sensors-data.js';
import { moduleSvg, modGeom } from './sensors-draw.js';

const B = BOARDS.esp32;
export const COLX = {
  L: { '-': -25.5, '+': -24.5, F: -21.5, G: -20.5, H: -19.5, I: -18.5, J: -17.5, A: -14.5, B: -13.5, C: -12.5, D: -11.5, E: -10.5 },
  R: { F: -1.5, G: -0.5, H: 0.5, I: 1.5, J: 2.5, A: 5.5, B: 6.5, C: 7.5, D: 8.5, E: 9.5, '-': 12.5, '+': 13.5 },
};
export const ESP_L = { 19: '3V3', 18: 'EN', 17: 'VP', 16: 'VN', 15: 'GPIO34', 14: 'GPIO35', 13: 'GPIO32', 12: 'GPIO33', 11: 'GPIO25', 10: 'GPIO26', 9: 'GPIO27', 8: 'GPIO14', 7: 'GPIO12', 6: 'GND', 5: 'GPIO13', 4: 'D2', 3: 'D3', 2: 'CMD', 1: '5V' };
export const ESP_R = { 19: 'GND', 18: 'GPIO23', 17: 'GPIO22', 16: 'TX', 15: 'RX', 14: 'GPIO21', 13: 'GND', 12: 'GPIO19', 11: 'GPIO18', 10: 'GPIO5', 9: 'GPIO17', 8: 'GPIO16', 7: 'GPIO4', 6: 'GPIO0', 5: 'GPIO2', 4: 'GPIO15', 3: 'D1', 2: 'D0', 1: 'CLK' };
export const COLORS = { v5: '#d62f2f', gnd: '#1c1c1c', v3: '#f08a12', ana: '#1e9e55', dig: '#2563c9', ow: '#0f8f86', jmp: '#ececec' };
export const COLOR_KO = { v5: '빨강', gnd: '검정', v3: '주황', ana: '초록', dig: '파랑', ow: '청록', jmp: '흰색' };
export const NET_KO = { v5: '5V 전원', gnd: 'GND', v3: '3V3 전원', ana: '아날로그 신호', dig: '디지털 신호', ow: '1-Wire 데이터', jmp: '같은 신호 잇기' };
const RAIL_NET = { 'L+': '5V', 'L-': 'GND', 'R+': '3V3', 'R-': 'GND' };
export const BANDS = { '10k': ['#7a4a1d', '#111', '#f08a12'], '220': ['#d62f2f', '#d62f2f', '#7a4a1d'], '330': ['#f08a12', '#f08a12', '#7a4a1d'] };
export const BAND_KO = { '10k': '갈·검·주', '220': '빨·빨·갈', '330': '주·주·갈' };
export const RES_KO = { '10k': '10kΩ', '220': '220Ω', '330': '330Ω' };
export const RES_STOCK = { '10k': 4, '220': 4, '330': 4 };                 // 실습 키트 저항: 종류마다 4개
export const BMS_RES_USED = { '10k': 2, '220': 4, '330': 4 };              // BMS 보드: R1·R2 / RS1·RS2·RL2·RL3 / RL1·RGB 3
export const BMS_GPIO = { GPIO34: '5V 감시', GPIO35: '전류 션트', GPIO4: 'DS18B20', GPIO26: '릴레이', GPIO25: '부저', GPIO27: 'RGB R', GPIO14: 'RGB G', GPIO33: 'RGB B', GPIO13: '버튼', GPIO18: 'TFT SCL', GPIO23: 'TFT SDA', GPIO17: 'TFT CS', GPIO16: 'TFT DC', GPIO19: 'TFT RST' };

// ───────── 그림 좌표 ─────────
export const P = 10;
const X0 = 46, TOP = 176;                              // 63행의 x, 위 보드 + 레일의 y
export const VIEW = { w: 712, h: 672 };
export const VIEWBOX = '0 0 712 672';
export const xRow = r => X0 + (63 - r) * P;
export const yCol = c => TOP + (13.5 - c) * P;
export const MOD_K = P / 20;                           // 모듈 그림 축소 (모듈 핀 간격 20 → 구멍 간격 10)
const MOD_LEG = 24, PIN_TOP = 158, PIN_BOT = 602;     // 모듈 핀 끝의 y (보드 밖)
const RCH = [271, 266, 276, 261, 281, 291, 301, 311, 167];  // 위 보드 가운데 홈(+아래 줄 사이) 가로 차선, 마지막은 레일 바깥 예비
const LCH = [471, 466, 476, 461, 481, 451, 441, 584, 591];  // 아래 보드 가운데 홈 가로 차선, 마지막 둘은 레일 바깥 예비
const BUS_ROW0 = 24;                                   // ESP32 왼쪽 세로 통로 시작 행 (24행에서 왼쪽으로)
const RESERVED = { top: [[13, 13], [23, 30]], bot: [[23, 30]] };

export function parseHole(spec) {
  let m = spec.match(/^([LR])([+-])@(\d+)$/);
  if (m) return { kind: 'rail', board: m[1], sign: m[2], row: +m[3], x: xRow(+m[3]), y: yCol(COLX[m[1]][m[2]]) };
  m = spec.match(/^([LR])([A-J])(\d+)$/);
  if (m) { const b = m[1], c = m[2], r = +m[3]; return { kind: 'hole', board: b, col: c, row: r, x: xRow(r), y: yCol(COLX[b][c]), esp: espOf(b, c, r) }; }
  throw new Error('bad hole ' + spec);
}
function espOf(b, c, r) {
  if (r < 1 || r > 19) return null;
  if (b === 'L' && 'ABC'.includes(c)) return ESP_L[r];
  if (b === 'R' && 'GHIJ'.includes(c)) return ESP_R[r];
  return null;
}
const gpioName = n => n === 'VP' ? 'VP·GPIO36' : n === 'VN' ? 'VN·GPIO39' : n;
export function holeNice(spec) {
  const h = parseHole(spec), bd = h.board === 'L' ? '아래 보드' : '위 보드';
  if (h.kind === 'rail') return `${bd} ${h.sign === '+' ? '+' : '−'} 레일 (${RAIL_NET[h.board + h.sign]}) ${h.row}행`;
  return `${bd} ${h.col}${h.row}${h.esp ? ` (ESP32 ${gpioName(h.esp)} 줄)` : ''}`;
}
export function holeShort(spec) {
  const h = parseHole(spec);
  if (h.kind === 'rail') return `${RAIL_NET[h.board + h.sign]} 레일`;
  return `${h.board === 'L' ? '아래' : '위'} ${h.col}${h.row}${h.esp ? ' · ' + gpioName(h.esp).replace('GPIO', 'IO') : ''}`;
}
export function espHole(gpio) {
  const n = gpio === 'GPIO36' ? 'VP' : gpio === 'GPIO39' ? 'VN' : gpio;
  for (const [r, v] of Object.entries(ESP_L)) if (v === n) return 'LA' + r;
  for (const [r, v] of Object.entries(ESP_R)) if (v === n) return 'RJ' + r;
  throw new Error('no ESP pin ' + gpio);
}
const modName = p => p.mod.replace(/ \(.+\)/, '').replace(/^[AB]: /, '');
export const pinLabel = (I, i) => { const p = I.pins[i]; return `${p.grp ? '컵 ' + p.grp + ' ' : ''}${modName(p)} 핀`; };
export function epText(ep, I) { return ep.h ? holeNice(ep.h) : `모듈 ${pinLabel(I, ep.pin)}`; }
export function epShort(ep, I) { return ep.h ? holeShort(ep.h) : `모듈 ${modName(I.pins[ep.pin])}`; }

// ───────── 센서 분석 ─────────
export function netOfPin(p) {
  if (!p.esp) return null;
  if (p.esp === '3V3') return 'v3';
  if (p.esp === 'GND') return 'gnd';
  if (p.esp.startsWith('5V')) return 'v5';
  if (p.esp.startsWith('GPIO')) return 'sig';
  return null;
}
export function physPins(s) {
  if (s.key === 'magiccup') return [
    { mod: 'G', esp: 'GND', grp: 'A' }, { mod: '+', esp: '3V3', grp: 'A' }, { mod: 'S', sig: 'SA', esp: 'GPIO32', grp: 'A' }, { mod: 'L', sig: 'LA', esp: 'GPIO21', grp: 'A' },
    { mod: 'G', esp: 'GND', grp: 'B' }, { mod: '+', esp: '3V3', grp: 'B' }, { mod: 'S', sig: 'SB', esp: 'GPIO22', grp: 'B' }, { mod: 'L', sig: 'LB', esp: 'GPIO5', grp: 'B' }];
  return s.pins.map(p => ({ ...p }));
}
function initEnv(s) { const e = {}; for (const c of s.ctrls || []) { if (c.t === 'range') e[c.k] = c.def ?? c.min; else if (c.t === 'toggle') e[c.k] = !!c.def; else if (c.t === 'hold') e[c.k] = false; else if (c.t === 'select') e[c.k] = c.def ?? c.opts[0][0]; else if (c.t === 'pad') { e.jx = 0; e.jy = 0; } } return e; }
const CACHE = {};
export function analyze(s) { // 핀마다 필요한 종류(아날로그/입력/출력/입출력)와 모듈 크기
  if (CACHE[s.n]) return CACHE[s.n];
  const code = s.code(s, B);
  const cst = {}; for (const m of code.matchAll(/const int (\w+) = (\w+);/g)) cst[m[1]] = m[2];
  const setOf = re => new Set([...code.matchAll(re)].map(m => cst[m[1]]).filter(Boolean));
  const pull = setOf(/pinMode\((\w+), INPUT_PULLUP\)/g), outs = setOf(/pinMode\((\w+), OUTPUT\)/g);
  for (const m of code.matchAll(/IrSender\.begin\((\w+)\)/g)) outs.add(cst[m[1]]);
  const o = s.sim(initEnv(s), {}, { B, t: 0, dt: 0.05, noise: 0 }) || {};
  const analog = new Set(Object.entries(o.ch || {}).filter(([, c]) => c.k === 'a').map(([k]) => k));
  const pins = physPins(s), need = {};
  pins.forEach(p => { if (!p.sig) return; const num = p.esp.replace('GPIO', ''); need[p.sig] = analog.has(p.sig) ? 'ana' : outs.has(num) ? 'out' : (pull.has(num) || ['ds18b20', 'dht11'].includes(s.key)) ? 'io' : 'in'; });
  const lay = legsUp => { const ps = []; moduleSvg(s, { circuit: true, leg: MOD_LEG, legsUp, pins: ps, noScene: true }); return ps; };
  const G = modGeom(s);
  const leds = ['rgbsmd', 'dual3', 'dual5'].includes(s.key) ? pins.filter(p => p.sig).length : 0;
  return CACHE[s.n] = { analog, need, pins, layTop: lay(false), layBot: lay(true), bodyW: G.two ? G.w * 2 + 40 : G.w, needs5V: pins.some(p => p.esp && p.esp.startsWith('5V')), leds, divider: s.key === 'ultrasonic' };
}

// ───────── 핀 배정 ─────────
export const ADC1 = ['GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', 'GPIO32', 'GPIO33'];
export const IN_ONLY = new Set(['GPIO34', 'GPIO35', 'GPIO36', 'GPIO39']);
export const IO = ['GPIO21', 'GPIO22', 'GPIO5', 'GPIO23', 'GPIO19', 'GPIO18', 'GPIO17', 'GPIO16', 'GPIO4', 'GPIO13', 'GPIO14', 'GPIO27', 'GPIO26', 'GPIO25', 'GPIO15', 'GPIO32', 'GPIO33'];
export const ALL_GPIO = ['GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', ...IO];
export const NEED_KO = { ana: '아날로그 입력', in: '디지털 입력', out: '출력', io: '입출력(풀업·양방향)' };
function poolFor(need) {
  if (need === 'ana') return ADC1;
  if (need === 'in') return [...IO.filter(g => !ADC1.includes(g)), 'GPIO34', 'GPIO35', 'GPIO39', 'GPIO36', 'GPIO32', 'GPIO33'];
  return IO;
}

// ───────── 자리·저항 배정 ─────────
const LANES = {
  top: { name: '위 보드 위쪽', board: 'R', jack: 'E', pwr: 'D', res: ['D', 'C', 'B'], out: 'A', rails: { gnd: 'R-', v3: 'R+', v5: 'L+' }, lo: 2, hi: 62, pinY: PIN_TOP },
  bot: { name: '아래 보드 아래쪽', board: 'L', jack: 'F', pwr: 'G', res: ['G', 'H', 'I'], out: 'J', rails: { gnd: 'L-', v3: 'L+', v5: 'L+' }, lo: 8, hi: 62, pinY: PIN_BOT },
};
export const laneName = l => LANES[l].name;
function footprint(I, lane, tight) {
  const a = analyze(I.s), lay = lane === 'bot' ? a.layBot : a.layTop;
  const xs = lay.map(p => p.x), xmin = Math.min(...xs), span = (Math.max(...xs) - xmin) / 20;
  const half = Math.max(0, (a.bodyW / 20 - span) / 2), ext = a.divider ? 6 : a.leds ? a.leds + 2 : 0;
  return { lay, xmin, leftOff: Math.ceil(half), rightOff: span + Math.max(Math.ceil(half), ext) + (tight ? 0 : 1) };   // 보통은 이웃 모듈과 한 칸 띄움 (자리가 모자라면 붙여 놓기)
}
/* opts: { avoidBms: BMS가 쓰는 GPIO 피하기, bmsRes: BMS가 쓴 저항을 재고에서 빼기 }
   I: { id, s } → I.gpio, I.lane, I.start, I.fp, I.resv 를 채움 */
export function layoutAll(list, opts = {}) {
  const used = new Set(), occ = { top: RESERVED.top.slice(), bot: RESERVED.bot.slice() };
  const stock = { ...RES_STOCK }; if (opts.bmsRes) for (const k in BMS_RES_USED) stock[k] -= BMS_RES_USED[k];
  for (const I of list) {
    const a = analyze(I.s), s = I.s; I.gpio = {}; I.lane = null; I.resv = [];
    for (const p of a.pins) {
      if (!p.sig) continue;
      const blocked = g => opts.avoidBms && BMS_GPIO[g] && !(s.key === 'ds18b20' && g === 'GPIO4');
      const pool = poolFor(a.need[p.sig]), ok = g => !used.has(g) && !blocked(g);
      const g = pool.includes(p.esp) && ok(p.esp) ? p.esp : pool.find(ok);
      if (!g) return { fail: `${s.name}: ${modName(p)} 핀에 쓸 ${NEED_KO[a.need[p.sig]]} 핀이 남지 않았어요`, who: I };
      I.gpio[p.sig] = g; used.add(g);
    }
    if (a.divider) { if (stock['10k'] < 2) return { fail: `${s.name}: Echo 분배기에 10kΩ 2개가 필요한데 ${Math.max(0, stock['10k'])}개 남았어요 (키트 4개)`, who: I }; stock['10k'] -= 2; I.resv = ['10k', '10k']; }
    for (let j = 0; j < a.leds; j++) { const v = stock['220'] > 0 ? '220' : stock['330'] > 0 ? '330' : null; if (!v) return { fail: `${s.name}: LED 저항(220Ω·330Ω)이 모두 쓰였어요 (각 4개${opts.bmsRes ? ', BMS 보드가 이미 8개 사용' : ''})`, who: I }; stock[v]--; I.resv.push(v); }
    for (const tight of [false, true]) for (const lane of a.needs5V || s.isOut ? ['bot', 'top'] : ['top']) {
      if (I.lane) break;
      const fp = footprint(I, lane, tight), L = LANES[lane];
      for (let st = L.hi - fp.leftOff; st - fp.rightOff >= L.lo; st--) {
        const iv = [st - fp.rightOff, st + fp.leftOff];
        if (occ[lane].some(([x, y]) => !(iv[1] < x || iv[0] > y))) continue;
        occ[lane].push(iv); I.lane = lane; I.start = st; I.fp = fp; break;
      }
      if (I.lane) break;
    }
    if (!I.lane) return { fail: `${s.name}을(를) 놓을 자리가 브레드보드 옆에 남지 않았어요`, who: I };
  }
  const resUsed = {}; for (const k in RES_STOCK) resUsed[k] = RES_STOCK[k] - stock[k];
  return { ok: true, used, stock, resUsed };
}

// ───────── 선·저항 만들기 ─────────
export const BASE = [
  { id: 'b5v', t: 'wire', net: 'v5', a: { h: 'LA1' }, b: { h: 'L+@1' }, route: 'v', base: true, label: 'ESP32 5V → 아래 보드 + 레일' },
  { id: 'bg1', t: 'wire', net: 'gnd', a: { h: 'LA6' }, b: { h: 'L-@6' }, route: 'v', base: true, label: 'ESP32 GND → 아래 보드 − 레일' },
  { id: 'b3v', t: 'wire', net: 'v3', a: { h: 'LA19' }, b: { h: `R+@${BUS_ROW0}` }, route: 'base3', base: true, label: 'ESP32 3V3 → 위 보드 + 레일 (ESP32 왼쪽 통로)' },
  { id: 'bg2', t: 'wire', net: 'gnd', a: { h: 'RJ13' }, b: { h: 'R-@13' }, route: 'v', base: true, label: 'ESP32 GND → 위 보드 − 레일' },
];
export function buildItems(list) {
  for (const I of list) {
    const a = analyze(I.s), L = LANES[I.lane], s = I.s, bd = L.board, items = [];
    const W = (id, A, Bh, net, route, x = {}) => items.push({ id: `${I.id}-${id}`, t: 'wire', inst: I.id, a: A, b: Bh, net, route, ...x });
    const RZ = (id, A, Bh, val, role, x = {}) => items.push({ id: `${I.id}-${id}`, t: 'res', inst: I.id, a: A, b: Bh, val, role, ...x });
    I.pins = a.pins.map((p, i) => ({ ...p, row: I.start - Math.round((I.fp.lay[i].x - I.fp.xmin) / 20) }));
    I.pins.forEach(p => { p.net = netOfPin(p); if (I.lane === 'bot' && p.net === 'v3') { p.net = 'v5'; p.conv = true; } p.x = xRow(p.row); p.y = L.pinY; });
    items.push({ id: `${I.id}-mod`, t: 'module', inst: I.id, key: 'module' });
    const rmin = Math.min(...I.pins.map(p => p.row));
    I.pins.forEach((p, i) => {
      if (p.net === 'gnd' || p.net === 'v3' || p.net === 'v5') {
        if (I.lane === 'top' && p.net === 'v5') W('p' + i, { pin: i }, null, 'v5', 'v5bus', { key: 'power', pin: i });
        else W('p' + i, { pin: i }, { h: `${L.rails[p.net]}@${p.row}` }, p.net, 'v', { key: 'power', pin: i });
      }
    });
    let led = 0;
    I.pins.forEach((p, i) => {
      if (p.net !== 'sig') return;
      const g = I.gpio[p.sig], to = { h: espHole(g) }, net = s.key === 'ds18b20' ? 'ow' : a.analog.has(p.sig) ? 'ana' : 'dig', key = 'sig' + i;
      if (a.divider && p.sig === 'ECHO') {         // 5V Echo → 10kΩ/10kΩ → 약 2.5V
        const n = rmin - 2, gr = rmin - 5;
        W('j' + i, { pin: i }, { h: `${bd}${L.jack}${p.row}` }, 'dig', 'v', { key, pin: i });
        RZ('r1', `${bd}${L.res[2]}${p.row}`, `${bd}${L.res[2]}${n}`, I.resv[0], 'Echo 분배기 위쪽', { key });
        RZ('r2', `${bd}${L.res[1]}${n}`, `${bd}${L.res[1]}${gr}`, I.resv[1], 'Echo 분배기 아래쪽', { key });
        W('eg', { h: `${bd}${L.res[0]}${gr}` }, { h: `${L.rails.gnd}@${gr}` }, 'gnd', 'v', { key });
        W('s' + i, { h: `${bd}${L.out}${n}` }, to, net, 'esp', { key, sig: p.sig });
      } else if (a.leds) {                          // LED 색마다 전류 제한 저항
        const j = led++, n = rmin - 2 - j, col = L.res[j];
        W('j' + i, { pin: i }, { h: `${bd}${L.jack}${p.row}` }, net, 'v', { key, pin: i });
        RZ('c' + i, `${bd}${col}${p.row}`, `${bd}${col}${n}`, I.resv[j], `${modName(p)} 전류 제한`, { key });
        W('s' + i, { h: `${bd}${L.out}${n}` }, to, net, 'esp', { key, sig: p.sig });
      } else W('s' + i, { pin: i }, to, net, 'esp', { key, sig: p.sig, pin: i });
    });
    I.items = items;
  }
}

// ───────── 직각 배선 ─────────
function routeAll(list) {
  const ch = { R: { ys: RCH, occ: RCH.map(() => []) }, L: { ys: LCH, occ: LCH.map(() => []) } };
  const bus = Array.from({ length: 14 }, (_, k) => ({ x: xRow(BUS_ROW0) - 5 * k, row: k % 2 ? null : BUS_ROW0 + k / 2, used: k === 0 }));
  const track = (side, x1, x2, lo = -1e9, hi = 1e9) => {
    const c = ch[side], a = Math.min(x1, x2) - 4, b = Math.max(x1, x2) + 4, hit = o => o.filter(([p, q]) => !(b < p || a > q)).length;
    let i = c.occ.findIndex((o, k) => hit(o) === 0 && c.ys[k] > lo && c.ys[k] < hi), off = 0;
    if (i < 0) i = c.occ.findIndex(o => hit(o) === 0);
    if (i < 0) { i = 0; c.occ.forEach((o, k) => { if (hit(o) < hit(c.occ[i])) i = k; }); off = 2.5 * hit(c.occ[i]); }   // 차선이 다 차면 살짝 비켜 그림
    c.occ[i].push([a, b]); return c.ys[i] + off;
  };
  const takeBus = needRow => { const b = bus.find(s => !s.used && (!needRow || s.row)); if (!b) return bus[bus.length - 1]; b.used = true; return b; };
  const pos = (ep, I) => ep.h ? parseHole(ep.h) : { x: I.pins[ep.pin].x, y: I.pins[ep.pin].y, board: I.lane === 'top' ? 'R' : 'L' };
  const sideOf = (ep, I) => ep.h ? parseHole(ep.h).board : I.lane === 'top' ? 'R' : 'L';
  const yR3 = yCol(COLX.R['+']), yL5 = yCol(COLX.L['+']);
  const base3 = BASE.find(b => b.route === 'base3'); const A3 = parseHole(base3.a.h), t3 = track('L', A3.x, bus[0].x);
  base3.pts = [A3, { x: A3.x, y: t3 }, { x: bus[0].x, y: t3 }, { x: bus[0].x, y: yR3 }];
  BASE.filter(b => b.route === 'v').forEach(b => { b.pts = [parseHole(b.a.h), parseHole(b.b.h)]; });
  const wires = list.flatMap(I => I.items.filter(it => it.t === 'wire').map(it => [it, I]));
  wires.sort((p, q) => (p[0].route === 'esp' ? 1 : 0) - (q[0].route === 'esp' ? 1 : 0));
  // 같은 세로줄을 쓰는 '모듈 핀 선'과 'ESP32로 내려가는 선'이 겹치지 않게 차선 위아래 순서를 정함
  const espW = wires.filter(([it]) => it.route === 'esp').map(([it, I]) => ({ it, A: pos(it.a, I), Bx: parseHole(it.b.h).x, s1: sideOf(it.a, I), s2: parseHole(it.b.h).board }));
  const bounds = (w, side, role) => {
    let lo = -1e9, hi = 1e9;
    for (const o of espW) {
      if (o === w) continue;
      if (role === 'src' && o.s2 === side && Math.abs(o.Bx - w.A.x) < 0.5 && o.tgt != null) { if (side === 'R') hi = Math.min(hi, o.tgt); else lo = Math.max(lo, o.tgt); }
      if (role === 'tgt' && o.s1 === side && Math.abs(o.A.x - w.Bx) < 0.5 && o.src != null) { if (side === 'R') lo = Math.max(lo, o.src); else hi = Math.min(hi, o.src); }
    }
    return [lo, hi];
  };
  for (const [it, I] of wires) {
    const A = pos(it.a, I);
    if (it.route === 'v') { const Bp = pos(it.b, I); it.pts = Math.abs(A.x - Bp.x) < 0.5 ? [A, Bp] : [A, { x: A.x, y: (A.y + Bp.y) / 2 }, { x: Bp.x, y: (A.y + Bp.y) / 2 }, Bp]; continue; }
    if (it.route === 'v5bus') { const bs = takeBus(true), tt = track('R', A.x, bs.x); it.b = { h: `L+@${bs.row}` }; it.pts = [A, { x: A.x, y: tt }, { x: bs.x, y: tt }, { x: bs.x, y: yL5 }]; continue; }
    const Bp = parseHole(it.b.h), s1 = sideOf(it.a, I), s2 = Bp.board;
    const w = espW.find(e => e.it === it);
    if (s1 === s2) { const [l1, h1] = bounds(w, s1, 'src'), [l2, h2] = bounds(w, s1, 'tgt'); const t = track(s1, A.x, Bp.x, Math.max(l1, l2), Math.min(h1, h2)); w.src = w.tgt = t; it.pts = [A, { x: A.x, y: t }, { x: Bp.x, y: t }, Bp]; }
    else { const bs = takeBus(false), t1 = track(s1, A.x, bs.x, ...bounds(w, s1, 'src')); w.src = t1; const t2 = track(s2, bs.x, Bp.x, ...bounds(w, s2, 'tgt')); w.tgt = t2; it.pts = [A, { x: A.x, y: t1 }, { x: bs.x, y: t1 }, { x: bs.x, y: t2 }, { x: Bp.x, y: t2 }, Bp]; }
  }
}
function pathOf(pts, r = 4) { // 꺾이는 곳을 둥글게
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const l1 = Math.hypot(p.x - a.x, p.y - a.y), l2 = Math.hypot(b.x - p.x, b.y - p.y);
    if (l1 < 0.1 || l2 < 0.1) continue;
    const k = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${(p.x - (p.x - a.x) / l1 * k).toFixed(1)} ${(p.y - (p.y - a.y) / l1 * k).toFixed(1)} Q${p.x} ${p.y} ${(p.x + (b.x - p.x) / l2 * k).toFixed(1)} ${(p.y + (b.y - p.y) / l2 * k).toFixed(1)}`;
  }
  const z = pts[pts.length - 1]; return d + ` L${z.x} ${z.y}`;
}

// ───────── 그림 ─────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function holesFor(board) {
  const cols = COLX[board], x1 = xRow(63) - P / 2, x2 = xRow(1) + P / 2;
  return Object.values(cols).map(v => `<rect x="${x1}" y="${yCol(v) - P / 2}" width="${x2 - x1}" height="${P}" fill="url(#hp)"/>`).join('');
}
export function boardSvg(board) {
  const cols = COLX[board], vals = Object.values(cols), top = yCol(Math.max(...vals)) - P * 1.1, bot = yCol(Math.min(...vals)) + P * 1.1;
  const x1 = xRow(63) - P * 1.4, x2 = xRow(1) + P * 1.4, chY = (yCol(cols.J) + yCol(cols.A)) / 2;
  const railLine = (c, col, dy) => `<line x1="${x1 + 8}" x2="${x2 - 8}" y1="${yCol(c) + dy}" y2="${yCol(c) + dy}" stroke="${col}" stroke-width="1.3" opacity=".75"/>`;
  const dyP = board === 'R' ? -P * 0.75 : P * 0.75, dyM = board === 'R' ? P * 0.75 : -P * 0.75;
  let s = `<rect x="${x1}" y="${top}" width="${x2 - x1}" height="${bot - top}" rx="6" fill="#fbfaf6" stroke="#d8d2c2"/><rect x="${x1}" y="${chY - P * 0.7}" width="${x2 - x1}" height="${P * 1.4}" fill="#ece7da"/>`;
  s += railLine(cols['+'], '#d62f2f', dyP) + railLine(cols['-'], '#2563c9', dyM) + holesFor(board);
  for (const [c, v] of Object.entries(cols)) {
    const lab = c === '+' ? '+' : c === '-' ? '−' : c, col = c === '+' ? '#d62f2f' : c === '-' ? '#2563c9' : '#8a8d96';
    s += `<text x="${x1 + 5}" y="${yCol(v) + 3}" font-size="7.5" font-family="JetBrains Mono" font-weight="700" fill="${col}">${lab}</text><text x="${x2 - 5}" y="${yCol(v) + 3}" text-anchor="end" font-size="7.5" font-family="JetBrains Mono" font-weight="700" fill="${col}">${lab}</text>`;
  }
  for (let r = 5; r <= 60; r += 5) s += `<text x="${xRow(r)}" y="${chY + 3}" text-anchor="middle" font-size="6.5" font-family="JetBrains Mono" fill="#b8b2a0">${r}</text>`;
  return s;
}
export function espSvg(used) {
  const xa = xRow(22.8), xb = xRow(-1.2), ya = yCol(-0.75), yb = yCol(-12.25);
  let s = `<g class="esp"><rect x="${xa}" y="${ya}" width="${xb - xa}" height="${yb - ya}" rx="4" fill="#1d2330" stroke="#0b0f17"/>`;
  s += `<rect x="${xRow(22.4)}" y="${yCol(-3.2)}" width="${xRow(13.2) - xRow(22.4)}" height="${yCol(-9.8) - yCol(-3.2)}" rx="2" fill="#b9bec7" stroke="#7d848f"/><text x="${(xRow(22.4) + xRow(13.2)) / 2}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="8" font-family="JetBrains Mono" fill="#4b5262" font-weight="700">ESP32-WROOM</text>`;
  s += `<path d="M${xRow(22.6)} ${yCol(-3.6)} h-2 v14 h-2" fill="none" stroke="#d6b04d" stroke-width="1"/>`;
  s += `<rect x="${xRow(0.6)}" y="${yCol(-4.8)}" width="${xRow(-2) - xRow(0.6)}" height="${yCol(-8.2) - yCol(-4.8)}" rx="2" fill="#c9cdd3" stroke="#7d848f"/><text x="${xRow(5)}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="7" fill="#9fb1c6" font-family="JetBrains Mono">USB →</text>`;
  s += `<text x="${xRow(10)}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="7.5" fill="#cfe0f5" font-family="JetBrains Mono">DevKitC V4</text>`;
  const pin = (r, side) => {
    const name = side === 'L' ? ESP_L[r] : ESP_R[r], y = side === 'L' ? yCol(-11.5) : yCol(-1.5), x = xRow(r);
    const full = name === 'VP' ? 'GPIO36' : name === 'VN' ? 'GPIO39' : name, hit = used.has(full) || used.has(name), lab = name.replace('GPIO', '');
    return `<g class="ep${hit ? ' used' : ''}" data-esp="${esc(full)}"><title>ESP32 ${esc(name === 'VP' || name === 'VN' ? name + ' (' + full + ')' : name)} · ${side === 'L' ? '아래' : '위'} 보드 ${side === 'L' ? 'D' : 'F'}${r}</title><rect x="${x - 3.2}" y="${y - 3.2}" width="6.4" height="6.4" fill="#111" stroke="${hit ? '#fdd062' : '#d6b04d'}" stroke-width="${hit ? 2 : 1}"/><text x="${x}" y="${side === 'L' ? y - 8 : y + 12}" text-anchor="middle" font-size="${lab.length > 3 ? 5.6 : 6.4}" font-family="JetBrains Mono" font-weight="700" fill="${hit ? '#fdd062' : '#9fb1c6'}">${esc(lab)}</text></g>`;
  };
  for (let r = 1; r <= 19; r++) s += pin(r, 'L') + pin(r, 'R');
  return s + '</g>';
}
export function resSvg(it) {
  const A = parseHole(it.a), Bh = parseHole(it.b), y = A.y, xa = Math.min(A.x, Bh.x), xb = Math.max(A.x, Bh.x), mid = (xa + xb) / 2, w = Math.min(26, xb - xa - 6);
  const bands = BANDS[it.val] || BANDS['10k'];
  return `<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="#9aa0a3" stroke-width="1.8"/><circle cx="${xa}" cy="${y}" r="2" fill="#9aa0a3"/><circle cx="${xb}" cy="${y}" r="2" fill="#9aa0a3"/><rect x="${mid - w / 2}" y="${y - 4.2}" width="${w}" height="8.4" rx="4" fill="#e2cf9f" stroke="#b9a46e"/>${bands.map((c, i) => `<rect x="${mid - w / 2 + 4 + i * 4.2}" y="${y - 4.2}" width="2.4" height="8.4" fill="${c}"/>`).join('')}<rect x="${mid + w / 2 - 6}" y="${y - 4.2}" width="2.4" height="8.4" fill="#c9a24a"/>`;
}
function infoBox(list, info) { // BMDproject 배선도처럼 위쪽 정보 상자: 전원 레일 · 저항 · ESP32 핀 연결
  const ru = info.resUsed || { '10k': 0, '220': 0, '330': 0 }, bms = info.bmsRes ? BMS_RES_USED : null;
  const pins = list.flatMap(I => Object.entries(I.gpio).map(([sig, g]) => `${g.replace('GPIO', 'IO')} ← ${String(I.s.n).padStart(2, '0')} ${sig}`));
  // 한 칸에 5줄씩, 최대 3칸(15줄) — 넘치면 마지막 줄에 '… 외 n개'
  const shown = pins.length > 15 ? pins.slice(0, 14).concat(`… 외 ${pins.length - 14}개 (핀 배치 탭)`) : pins;
  const colP = []; for (let i = 0; i < shown.length; i += 5) colP.push(shown.slice(i, i + 5));
  const t = (x, y, s, o = '') => `<text x="${x}" y="${y}" font-size="8.6" font-family="Roboto Condensed, Noto Sans KR, sans-serif" fill="#2b3346"${o}>${esc(s)}</text>`;
  const h = (x, s) => `<text x="${x}" y="20" font-size="9.5" font-weight="700" font-family="Roboto Condensed, Noto Sans KR, sans-serif" fill="#0e1932">${esc(s)}</text>`;
  let g = `<g class="info"><rect x="6" y="5" width="700" height="78" rx="8" fill="#ffffff" stroke="#e1dccd"/>`;
  g += h(16, '전원 레일') + t(16, 35, '위 보드: + = 3V3 · − = GND') + t(16, 48, '아래 보드: + = 5V · − = GND') + t(16, 61, 'ESP32 5V·3V3·GND → 레일 (기본 선 4개)') + t(16, 74, '모듈은 보드 밖, 암-수 점퍼로 연결');
  g += h(212, '저항 (키트 10kΩ·220Ω·330Ω 각 4개)');
  ['10k', '220', '330'].forEach((k, i) => { const u = ru[k] + (bms ? bms[k] : 0), left = RES_STOCK[k] - u; g += t(212, 35 + i * 13, `${RES_KO[k]} (${BAND_KO[k]}): ${ru[k]}개 사용${bms ? ` + BMS ${bms[k]}` : ''} · 남음 ${left}`, left < 0 ? ' fill="#d62f2f"' : ''); });
  g += t(212, 74, info.note || 'LED 220Ω → 없으면 330Ω, Echo 분배 10kΩ×2', ' fill="#8a8d96"');
  g += h(446, 'ESP32 핀 연결');
  colP.forEach((c, ci) => c.forEach((s, i) => { g += t(446 + ci * 86, 34 + i * 10.4, s, s.startsWith('…') ? ' fill="#8a8d96" font-size="7.2"' : ' font-family="JetBrains Mono" font-size="7.6"'); }));
  if (!pins.length) g += t(446, 35, '센서를 연결하면 여기에 표시돼요', ' fill="#8a8d96"');
  return g + '</g>';
}

/* list: 배치가 끝난 센서들 · opts: { step, build, sel, info:{resUsed,bmsRes,note}, stepOf(item) } */
export function svgFor(list, opts = {}) {
  routeAll(list);
  const step = opts.step ?? Infinity, build = !!opts.build, stepOf = opts.stepOf || (() => 0);
  const cls = st => { if (!build) return 'it'; if (st > step) return 'it fut'; if (st === step) return 'it cur'; return step < 90 ? 'it done' : 'it'; };
  const used = new Set(list.flatMap(I => Object.values(I.gpio)));
  const defs = `<defs><pattern id="hp" width="${P}" height="${P}" patternUnits="userSpaceOnUse" x="${xRow(63) - P / 2}" y="0"><rect x="${P / 2 - 1.8}" y="${P / 2 - 1.8}" width="3.6" height="3.6" rx=".6" fill="#4a4f5a" opacity=".55"/></pattern><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const wireG = (it, I, st) => {
    const c = COLORS[it.net], A = it.pts[0], Z = it.pts[it.pts.length - 1];
    const title = it.base ? it.label : `${I.s.name} · ${COLOR_KO[it.net]} 선: ${epText(it.a, I)} → ${it.b ? epText(it.b, I) : ''}`;
    const lab = it.sig ? `<text class="vlab" x="${Z.x}" y="${Z.y + (Z.y > 400 ? -8 : 13) + (Math.round(Z.x / P) % 2 ? (Z.y > 400 ? -9 : 9) : 0)}" text-anchor="middle" font-size="8.5" font-family="JetBrains Mono" font-weight="700"></text>` : '';
    return `<g class="${it.base ? (build ? cls(st) + ' base' : 'it base') : cls(st)} wire${opts.sel && I && I.id === opts.sel ? ' sel' : ''}"${I ? ` data-inst="${I.id}"` : ''} data-item="${it.id}" data-step="${st}"${it.sig ? ` data-sig="${it.sig}"` : ''}><title>${esc(title)}</title><path class="w" d="${pathOf(it.pts)}" stroke="${c}" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>${it.a.h ? '' : `<circle cx="${A.x}" cy="${A.y}" r="2.2" fill="${c}"/>`}<circle cx="${A.x}" cy="${A.y}" r="2.6" fill="${it.a.h ? c : 'none'}" stroke="#fff" stroke-width=".8"/><circle cx="${Z.x}" cy="${Z.y}" r="2.6" fill="${c}" stroke="#fff" stroke-width=".8"/>${lab}</g>`;
  };
  let res = '', mods = '', wires = BASE.map(b => wireG(b, null, stepOf(b))).join('');
  for (const I of list) {
    const lay = I.fp.lay, i0 = lay.findIndex(p => p.x === I.fp.xmin), up = I.lane === 'bot';
    const tx = xRow(I.start) - MOD_K * lay[i0].x, ty = LANES[I.lane].pinY - MOD_K * lay[i0].y;
    const mi = I.items.find(i => i.t === 'module'), rows = I.pins.map(p => p.row);
    mods += `<g class="${cls(stepOf(mi))} inst${opts.sel === I.id ? ' sel' : ''}" data-inst="${I.id}" data-item="${mi.id}" data-step="${stepOf(mi)}"><title>${esc(I.s.name)} — ${esc(LANES[I.lane].name)}, ${Math.max(...rows)}~${Math.min(...rows)}행 앞</title><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${MOD_K})">${moduleSvg(I.s, { circuit: true, leg: MOD_LEG, legsUp: up, noScene: true, uid: I.id })}</g></g>`;
    for (const it of I.items) {
      if (it.t === 'res') res += `<g class="${cls(stepOf(it))} inst" data-inst="${I.id}" data-item="${it.id}" data-step="${stepOf(it)}"><title>${esc(RES_KO[it.val])} ${esc(it.role)} (${esc(BAND_KO[it.val])}) — ${esc(holeShort(it.a))} ↔ ${esc(holeShort(it.b))}</title>${resSvg(it)}</g>`;
      else if (it.t === 'wire') wires += wireG(it, I, stepOf(it));
    }
  }
  let tags = '';
  if (build && step < 90) {
    const seen = new Set();
    let ti = 0;
    const tag = (pt, text) => { const k = `${pt.x},${pt.y}`; if (seen.has(k)) return; seen.add(k); text = text.replace(/^(위|아래) (?=[A-J]\d+$)/, ''); const w = text.length * 5.4 + 10, base = pt.y < 200 ? -1 : pt.y > 560 ? 1 : pt.y < 420 ? 1 : -1, up = ti++ % 2 ? -base : base, y = pt.y + up * 13; tags += `<g class="tag"><rect x="${pt.x - w / 2}" y="${y - 7}" width="${w}" height="13" rx="6" fill="#13203a"/><text x="${pt.x}" y="${y + 2.5}" text-anchor="middle" font-size="8" font-family="Roboto Condensed, Noto Sans KR, sans-serif" font-weight="700" fill="#fdd062">${esc(text)}</text></g>`; };
    [...BASE.filter(b => stepOf(b) === step).map(b => [b, null]), ...list.flatMap(I => I.items.filter(i => stepOf(i) === step).map(i => [i, I]))].forEach(([it, I]) => {
      if (it.t === 'wire') { tag(it.pts[0], it.a.h ? holeShort(it.a.h) : epShort(it.a, I)); tag(it.pts[it.pts.length - 1], holeShort(it.b.h)); }
      if (it.t === 'res') { tag(parseHole(it.a), holeShort(it.a)); tag(parseHole(it.b), holeShort(it.b)); }
      if (it.t === 'module') I.pins.forEach((p, i) => tag({ x: p.x, y: p.y }, modName(p)));
    });
  }
  return defs + `<rect width="${VIEW.w}" height="${VIEW.h}" fill="#f3efe3"/>` + infoBox(list, opts.info || {}) + boardSvg('R') + boardSvg('L') + espSvg(used) + res + mods + wires + tags;
}

// ───────── 센서 40종: 한 센서의 예시 회로와 조립 단계 ─────────
export function exampleCircuit(s) {
  const I = { id: 'x', s };
  let lay = layoutAll([I], { avoidBms: true, bmsRes: false });
  if (lay.fail) lay = layoutAll([I], {});
  buildItems([I]);
  const a = analyze(s), its = I.items, steps = [], key2step = {};
  const add = (key, st) => { key2step[key] = steps.length; steps.push({ key, ...st }); };
  const bomRes = Object.entries(lay.resUsed).filter(([, n]) => n);
  const fm = its.filter(i => i.t === 'wire' && !i.a.h).length, mm = its.filter(i => i.t === 'wire' && i.a.h).length + BASE.length;
  add('prep', { short: '@준비물', title: '준비물 확인', kicker: '준비', desc: '키트에서 아래 부품을 꺼내 놓습니다. BMS 보드를 이미 만들었다면 그 위에 이 센서만 더하면 돼요.',
    bom: [['ESP32 DevKitC V4', '1개', 'BMS 실습과 같은 보드'], ['브레드보드 830홀', '2개', '가운데에 ESP32를 걸쳐 꽂음'], [`${s.name} (${s.model})`, s.key === 'magiccup' ? '2개' : '1개', `키트 ${String(s.n).padStart(2, '0')}번 · 보드 밖에 둠`], ['암-수(F-M) 점퍼선', `${fm}개`, '모듈 핀 → 보드'], ['수-수(M-M) 점퍼선', `${mm}개`, `기본 전원 선 ${BASE.length}개 포함`], ...bomRes.map(([v, n]) => [`저항 ${RES_KO[v]}`, `${n}개`, `색띠 ${BAND_KO[v]} · 키트 4개 중`]), ['USB 케이블', '1개', '데이터 전송이 되는 케이블']],
    tips: ['선 색을 지키면 실수가 줄어요: 빨강 = 5V, 주황 = 3V3, 검정 = GND, 파랑 = 디지털, 초록 = 아날로그, 청록 = 1-Wire.', '저항은 키트에 10kΩ·220Ω·330Ω이 4개씩 있어요. 이 회로가 쓰는 개수는 그림 위 정보 상자에 나와요.', ...(a.leds ? ['BMS 보드를 이미 만들었다면 220Ω·330Ω 8개를 모두 쓴 상태예요. 이 LED 실습은 BMS 보드와 따로 해 보세요.'] : [])], warn: a.leds ? [2] : [] });
  add('base', { short: '전원 레일', title: 'ESP32 꽂기와 전원 레일', kicker: '전원', desc: '브레드보드 2장 가운데에 ESP32를 걸쳐 꽂고(USB 오른쪽), 5V·GND는 아래 보드 레일로, 3V3·GND는 위 보드 레일로 뽑습니다. 3V3 선은 ESP32 왼쪽 통로로 돌아 올라가요.',
    tips: ['BMS 보드를 이미 조립했다면 같은 역할의 선이 있어요. 다음 단계로 가세요.', '아래 보드 A1 = 5V, A6 = GND, A19 = 3V3 줄 / 위 보드 J13 = GND 줄이에요.', '5V와 3V3 레일을 바꿔 꽂으면 3.3V 부품이 상할 수 있어요.'], warn: [2] });
  const rows = I.pins.map(p => p.row);
  add('module', { short: '@모듈 놓기', title: `${s.name} 놓기`, kicker: '부품', desc: `모듈은 보드에 꽂지 않고 ${LANES[I.lane].name}에 둡니다. 핀이 ${Math.max(...rows)}~${Math.min(...rows)}행 앞에 오게 놓으면 선이 곧게 이어져요. 모듈 핀에는 암-수 점퍼선을 끼웁니다.`,
    tips: [I.lane === 'top' ? '3.3V로 동작하는 센서라 3V3 레일이 있는 위 보드 쪽에 둡니다.' : a.needs5V ? '5V가 필요한 모듈이라 5V 레일이 있는 아래 보드 쪽에 둡니다.' : '출력 모듈이라 5V 레일이 있는 아래 보드 쪽에 둡니다. 신호는 ESP32의 3.3V로 충분해요.', '모듈마다 핀 순서가 다를 수 있어요. 기판 인쇄(−, +, S 등)를 보고 그림 순서와 맞추세요.'] });
  if (its.some(i => i.key === 'power')) add('power', { short: '모듈 전원', title: '모듈 전원 연결', kicker: '배선', desc: '모듈 전원 핀을 바로 앞의 레일에 곧게 꽂습니다.', tips: [I.pins.some(p => p.conv) ? '이 출력 모듈은 5V 레일에서 전원을 받아요. 출력 모듈이라 ESP32 핀에 5V가 들어가지 않아 안전해요.' : I.lane === 'top' ? '3.3V로 먹이면 모듈 출력도 3.3V를 넘지 않아 ESP32 핀이 안전해요.' : '5V 레일과 GND 레일을 바꿔 꽂지 않게 조심하세요.', ...(['activebuzzer', 'thermistor'].includes(s.key) ? ['이 모듈은 매뉴얼 기준 − 표시가 전원, + 표시가 GND예요 (표시가 반대인 제품).'] : []), ...(s.key === 'dht11' ? ['매뉴얼 표의 −/+ 표기는 반대로 적혀 있어요. 기판 인쇄 기준으로 연결하세요.'] : [])] });
  let ledN = 0;
  I.pins.forEach((p, i) => {
    if (p.net !== 'sig') return;
    const g = I.gpio[p.sig], net = a.analog.has(p.sig) ? 'ana' : 'dig', tips = [], lj = a.leds ? ledN++ : 0;
    if (a.divider && p.sig === 'ECHO') tips.push('HC-SR04 Echo는 5V를 냅니다. 10kΩ 두 개로 절반(약 2.5V)으로 낮춰야 ESP32가 상하지 않아요.', `10kΩ 색띠: ${BAND_KO['10k']}`);
    if (a.leds) tips.push('LED는 저항 없이 연결하면 전류가 너무 많이 흘러 LED와 ESP32 핀이 상할 수 있어요.', `이 색은 ${RES_KO[I.resv[lj]]} 저항을 써요 (색띠 ${BAND_KO[I.resv[lj]]}). 220Ω이 모자라면 330Ω을 써도 돼요.`);
    tips.push(s.isOut ? 'ESP32가 신호를 내보내는 출력 핀이에요.' : net === 'ana' ? '아날로그 전압을 읽는 ADC1 핀이에요 (Wi-Fi를 켜도 읽힘).' : s.key === 'ds18b20' ? '1-Wire 데이터선이에요. 모듈에 풀업 저항이 있어요.' : '디지털 입력 핀이에요.');
    if (g === 'GPIO36' || g === 'GPIO39') tips.push('GPIO36(VP)·39(VN)는 입력 전용이라 아날로그 센서에 알맞아요.');
    const sideNote = parseHole(espHole(g)).board !== (I.lane === 'top' ? 'R' : 'L') ? ' 반대쪽 보드의 핀이라 ESP32 왼쪽 통로로 돌아갑니다.' : '';
    add('sig' + i, { short: `${p.grp ? p.grp + ' ' : ''}${modName(p)}`, title: `${p.grp ? '컵 ' + p.grp + ' ' : ''}${modName(p)} → ${gpioName(g)}`, kicker: '배선', desc: `모듈 ${modName(p)} 핀을 ESP32 ${gpioName(g)}에 연결합니다.${a.divider && p.sig === 'ECHO' ? ' 5V 신호라 저항 두 개로 낮춰서 연결해요.' : a.leds ? ' 전류 제한 저항을 거쳐 연결해요.' : ''}${sideNote}`, tips, warn: (a.divider && p.sig === 'ECHO') || a.leds ? [0] : [] });
  });
  const checks = ['USB를 뺀 상태에서 조립했다', '모듈 전원 핀이 맞는 레일에 있다 (주황 = 3V3, 빨강 = 5V, 검정 = GND)', ...I.pins.filter(p => p.net === 'sig').map(p => `${p.grp ? p.grp + ' ' : ''}${modName(p)} → ${gpioName(I.gpio[p.sig])} 줄 (${holeShort(espHole(I.gpio[p.sig])).replace(/ · .*/, '')})`)];
  if (a.divider) checks.push('Echo가 ESP32에 바로 가지 않고 10kΩ 두 개를 거친다');
  if (a.leds) checks.push('LED 색마다 저항을 거친다');
  checks.push('위 보드 + 레일 = 3V3, 아래 보드 + 레일 = 5V (바뀌지 않았다)');
  add('check', { short: '@점검', title: '점검하기', kicker: '점검', desc: 'USB를 꽂기 전에 하나씩 확인하세요. 체크한 내용은 이 브라우저에 저장돼요.', checks, tips: ['그림에서 선이나 부품을 누르면 그 단계로 이동해요.'] });
  add('code', { short: '@코드', title: '예제 코드 올리기', kicker: '코드', desc: '오른쪽 코드 탭의 ESP32 예제를 Arduino IDE로 올립니다. 시리얼 모니터는 115200 baud.', tips: [] });
  add('run', { short: '@실험', title: '가상 실험 시작', kicker: '실험', desc: '조립이 끝났어요. 가상 실험으로 넘어가 같은 회로에서 신호가 어떻게 바뀌는지 보세요.', tips: [] });
  for (const it of its) it.step = key2step[it.t === 'module' ? 'module' : it.key];
  BASE.forEach(b => { b.step = key2step.base; });
  const stepOf = it => it.base ? key2step.base : it.step;
  return { inst: I, pins: I.pins, items: its, steps, used: new Set(Object.values(I.gpio)), resUsed: lay.resUsed, stepOf, lane: I.lane, conflict: [] };
}
export function exampleSvg(circ, opts = {}) {
  return svgFor([circ.inst], { ...opts, stepOf: circ.stepOf, info: { resUsed: circ.resUsed, note: circ.inst.lane === 'top' ? '3.3V 모듈: 위 보드 레일에서 전원' : '5V·출력 모듈: 아래 보드 레일에서 전원' } });
}
