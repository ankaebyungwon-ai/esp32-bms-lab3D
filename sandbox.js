/* 가상 실험실 — 센서를 하나씩 꽂고 빼며 ESP32 회로를 자동으로 만들고, 꽂힌 센서 전부를 가상 데이터로 동시에 실험
   흐름: 센서 추가 → ESP32 핀 배정(아날로그는 ADC1, 출력·풀업은 입출력 핀) → 브레드보드 자리 배정(위 보드 3V3 / 아래 보드 5V)
        → 점퍼선·저항 생성 → 센서마다 sim → read → 판정 → 통합 판정(가장 나쁜 단계) → 출력 모듈(릴레이·LED·부저)이 따라 움직임 */
import { SENSORS, BOARDS, CATS, IR_KEYS, irName } from './sensors-data.js';
import { moduleSvg, modGeom, updateModuleSvg } from './sensors-draw.js';
import { COLX, COLORS, COLOR_KO, NET_KO, parseHole, holeNice, xRow, yCol, boardSvg, espSvg, wirePath, resSvg, espHole, netOfPin, physPins, RES_KO, BAND_KO, MOD_K } from './sensors-circuit.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pad2 = n => String(n).padStart(2, '0');
const r3 = v => Math.round(v * 1000) / 1000;
const B = BOARDS.esp32;
const DT = 0.05, WIN = 60, MOD_LEG = 116, LOG_MAX = 36000;
const LV = [{ t: '정상', c: 'var(--lv0)' }, { t: '주의', c: 'var(--lv1)' }, { t: '경고', c: 'var(--lv2)' }, { t: '위험', c: 'var(--lv3)' }];
const SERIES_COLORS = ['#1e3a5c', '#f6c047', '#1f9a78', '#d62f2f'];

// ───────── ESP32 핀 ─────────
const ADC1 = ['GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', 'GPIO32', 'GPIO33'];          // Wi-Fi를 켜도 아날로그를 읽을 수 있는 핀
const IN_ONLY = new Set(['GPIO34', 'GPIO35', 'GPIO36', 'GPIO39']);                 // 입력 전용 (내부 풀업 없음)
const IO = ['GPIO21', 'GPIO22', 'GPIO5', 'GPIO23', 'GPIO19', 'GPIO18', 'GPIO17', 'GPIO16', 'GPIO4', 'GPIO13', 'GPIO14', 'GPIO27', 'GPIO26', 'GPIO25', 'GPIO15', 'GPIO32', 'GPIO33'];
const ALL_GPIO = ['GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', ...IO];
const BMS_ROLE = { GPIO34: '5V 감시', GPIO35: '전류 션트', GPIO4: 'DS18B20', GPIO26: '릴레이', GPIO25: '부저', GPIO27: 'RGB R', GPIO14: 'RGB G', GPIO33: 'RGB B', GPIO13: '버튼', GPIO18: 'TFT SCL', GPIO23: 'TFT SDA', GPIO17: 'TFT CS', GPIO16: 'TFT DC', GPIO19: 'TFT RST' };
const NEED_KO = { ana: '아날로그 입력', in: '디지털 입력', out: '출력', io: '입출력(풀업·양방향)' };
const NEED_TAG = { ana: 'ana', in: 'in', out: 'out', io: 'io' };

// ───────── 브레드보드 자리 (두 줄) ─────────
// top: 위 보드 E열에 꽂고 몸체는 레일 바깥 (3V3 센서) / bot: 아래 보드 F열에 꽂고 몸체는 아래 (5V 센서·출력 모듈)
const LANES = {
  top: { name: '위 보드', board: 'R', pin: 'E', pwr: 'D', res: ['D', 'C', 'B'], sig: 'B', sig2: 'A', rails: { gnd: 'R-', v3: 'R+', v5: 'L+' }, lo: 2, hi: 62 },
  bot: { name: '아래 보드', board: 'L', pin: 'F', pwr: 'G', res: ['G', 'H', 'I'], sig: 'I', sig2: 'J', rails: { gnd: 'L-', v3: 'L+', v5: 'L+' }, lo: 8, hi: 62 },
};
const EXTRA_ROWS = { ultrasonic: 5, rgbsmd: 4, dual3: 3, dual5: 3 };
const BASE = [['b5v', 'LA1', 'L+@3', 'v5'], ['bg1', 'LA6', 'L-@6', 'gnd'], ['b3v', 'LA19', 'R+@23', 'v3'], ['bg2', 'RJ13', 'R-@13', 'gnd']];

const PRESETS = [
  { name: '🔥 화재 감시 BMS', list: [4, 27, 20, 17, 9], desc: '온도·불꽃이 위험하면 릴레이 차단 + 빨간 LED + 경보음' },
  { name: '🚪 문·충격 감시', list: [22, 31, 18, 30], desc: '케이스 문 열림·충격·기울어짐을 두 색 LED로 표시' },
  { name: '🌡️ 환경 감시', list: [16, 19, 37, 29], desc: '습도·밝기·소리·과열 비교기를 한꺼번에' },
  { name: '🎮 입력 장치', list: [24, 40, 7, 23], desc: '조이스틱·인코더·버튼·리모컨' },
];

// ───────── 상태 ─────────
const PREF = { sound: false };
try { Object.assign(PREF, JSON.parse(localStorage.getItem('bms-pref') || '{}')); } catch (e) {}
const SET = { auto: true, noise: 0.3, filter: '', speed: 1, running: true, avoidBms: false };
const SPEEDS = [1, 5, 20];
let INST = [];          // 꽂힌 센서
let uid = 0, selId = null, tab = 'ctrl', T = 0, LVL = 0, MSG = '', TRIP = false, OFFLINE = false;
let LOG = [], nextSample = 0;
const CACHE = {};
const SER = []; let serDirty = false;

function initEnv(s) {
  const e = {};
  for (const c of s.ctrls || []) {
    if (c.t === 'range') e[c.k] = c.def ?? c.min;
    else if (c.t === 'toggle') e[c.k] = !!c.def;
    else if (c.t === 'hold') e[c.k] = false;
    else if (c.t === 'select') e[c.k] = c.def ?? c.opts[0][0];
    else if (c.t === 'pad') { e.jx = 0; e.jy = 0; }
  }
  return e;
}
const hasBmsCtrl = s => (s.ctrls || []).some(c => c.k === 'bms');
function newInst(s, opts = {}) {
  return { id: 'i' + (++uid), s, e: initEnv(s), st: {}, t0: T, nextRead: T, o: { ch: {} }, r: {}, ev: null, last: {}, lv: 0, msg: '', hits: [], flo: {}, stuck: {}, filt: {}, unf: {}, chart: [], fault: '', linked: opts.linked ?? hasBmsCtrl(s), lastLine: '', gpio: {}, lane: null, start: 0, items: [], pins: [] };
}

// ───────── 센서 분석 (핀 종류·모듈 크기) ─────────
function analyze(s) {
  if (CACHE[s.n]) return CACHE[s.n];
  const code = s.code(s, B);
  const cst = {}; for (const m of code.matchAll(/const int (\w+) = (\w+);/g)) cst[m[1]] = m[2];
  const setOf = re => new Set([...code.matchAll(re)].map(m => cst[m[1]]).filter(Boolean));
  const pull = setOf(/pinMode\((\w+), INPUT_PULLUP\)/g), outs = setOf(/pinMode\((\w+), OUTPUT\)/g);
  for (const m of code.matchAll(/IrSender\.begin\((\w+)\)/g)) outs.add(cst[m[1]]);
  const o = s.sim(initEnv(s), {}, { B, t: 0, dt: DT, noise: 0 }) || {};
  const analog = new Set(Object.entries(o.ch || {}).filter(([, c]) => c.k === 'a').map(([k]) => k));
  const pins = physPins(s);
  const need = {};
  pins.forEach(p => { if (!p.sig) return; const num = p.esp.replace('GPIO', ''); need[p.sig] = analog.has(p.sig) ? 'ana' : outs.has(num) ? 'out' : (pull.has(num) || ['ds18b20', 'dht11'].includes(s.key)) ? 'io' : 'in'; });
  const lay = legsUp => { const ps = []; moduleSvg(s, { circuit: true, leg: MOD_LEG, legsUp, pins: ps, noScene: true }); return ps; };
  const G = modGeom(s);
  return CACHE[s.n] = { analog, need, pins, layTop: lay(false), layBot: lay(true), bodyW: G.two ? G.w * 2 + 40 : G.w, needs5V: pins.some(p => p.esp && p.esp.startsWith('5V')) };
}

// ───────── 핀 배정 ─────────
function poolFor(need) {
  if (need === 'ana') return ADC1;
  if (need === 'in') return [...IO.filter(g => !ADC1.includes(g)), 'GPIO34', 'GPIO35', 'GPIO39', 'GPIO36', 'GPIO32', 'GPIO33'];
  return IO;   // 출력·풀업·양방향은 입력 전용 핀(34~39) 불가, 아날로그 핀(32·33)은 마지막에
}
const bmsBlocked = (s, g) => SET.avoidBms && BMS_ROLE[g] && !(s.key === 'ds18b20' && g === 'GPIO4');
function allocPins(I, used) {
  const a = analyze(I.s), res = {};
  for (const p of a.pins) {
    if (!p.sig) continue;
    const pool = poolFor(a.need[p.sig]), ok = g => !used.has(g) && !bmsBlocked(I.s, g);
    const g = pool.includes(p.esp) && ok(p.esp) ? p.esp : pool.find(ok);
    if (!g) return { fail: `${p.mod.replace(/ \(.+\)/, '')} 핀에 쓸 ${NEED_KO[a.need[p.sig]]} 핀이 남지 않았어요` };
    res[p.sig] = g; used.add(g);
  }
  return { res };
}

// ───────── 자리 배정 ─────────
function footprint(I, lane) {
  const a = analyze(I.s), lay = lane === 'bot' ? a.layBot : a.layTop;
  const xs = lay.map(p => p.x), xmin = Math.min(...xs), span = (Math.max(...xs) - xmin) / 20;
  const half = Math.max(0, (a.bodyW / 20 - span) / 2);
  return { lay, xmin, leftOff: Math.ceil(half) + 1, rightOff: span + Math.max(Math.ceil(half), EXTRA_ROWS[I.s.key] || 0) + 1 };
}
const laneOrder = I => { const a = analyze(I.s); return a.needs5V || I.s.isOut ? ['bot', 'top'] : ['top']; };
function layoutAll(list) { // 앞에서부터 차례로 핀과 자리를 정함 (먼저 꽂은 센서는 자리가 바뀌지 않음)
  const used = new Set(), occ = { top: [], bot: [] };
  for (const I of list) {
    const pa = allocPins(I, used); if (pa.fail) return { fail: pa.fail, who: I };
    I.gpio = pa.res; I.lane = null;
    for (const lane of laneOrder(I)) {
      const fp = footprint(I, lane), L = LANES[lane];
      for (let start = L.hi - fp.leftOff; start - fp.rightOff >= L.lo; start--) {
        const iv = [start - fp.rightOff, start + fp.leftOff];
        if (occ[lane].some(([a, b]) => !(iv[1] < a || iv[0] > b))) continue;
        occ[lane].push(iv); I.lane = lane; I.start = start; I.fp = fp; break;
      }
      if (I.lane) break;
    }
    if (!I.lane) return { fail: `브레드보드에 ${I.s.name}을(를) 꽂을 자리가 없어요`, who: I };
  }
  return { ok: true, used, occ };
}

// ───────── 배선 만들기 ─────────
function buildItems(list) {
  const rails = new Set(BASE.map(b => b[2]));
  const freeRail = (rail, row) => { for (let d = 0; d < 40; d++) for (const r of [row + d, row - d]) { if (r < 1 || r > 63) continue; const h = `${rail}@${r}`; if (!rails.has(h)) { rails.add(h); return h; } } return `${rail}@${row}`; };
  for (const I of list) {
    const a = analyze(I.s), L = LANES[I.lane], s = I.s, bd = L.board, items = [];
    const W = (id, from, to, net, x = {}) => items.push({ id: `${I.id}-${id}`, t: 'wire', from, to, net, ...x });
    const RZ = (id, A, Bh, val, role) => items.push({ id: `${I.id}-${id}`, t: 'res', a: A, b: Bh, val, role });
    const pins = a.pins.map((p, i) => ({ ...p, row: I.start - Math.round((I.fp.lay[i].x - I.fp.xmin) / 20) }));
    pins.forEach(p => { p.hole = `${bd}${L.pin}${p.row}`; p.net = netOfPin(p); if (I.lane === 'bot' && p.net === 'v3') { p.net = 'v5'; p.conv = true; } });
    const rmin = Math.min(...pins.map(p => p.row));
    pins.forEach((p, i) => { if (p.net === 'gnd' || p.net === 'v3' || p.net === 'v5') W('p' + i, `${bd}${L.pwr}${p.row}`, freeRail(L.rails[p.net], p.row), p.net, { pin: p.mod }); });
    const colorPins = ['rgbsmd', 'dual3', 'dual5'].includes(s.key) ? pins.filter(p => p.net === 'sig') : [];
    pins.forEach((p, i) => {
      if (p.net !== 'sig') return;
      const g = I.gpio[p.sig], to = espHole(g), net = s.key === 'ds18b20' ? 'ow' : a.analog.has(p.sig) ? 'ana' : 'dig';
      if (s.key === 'ultrasonic' && p.sig === 'ECHO') {
        const n = rmin - 2, gr = rmin - 5;
        RZ('r1', `${bd}${L.res[2]}${p.row}`, `${bd}${L.res[2]}${n}`, '10k', 'Echo 분배기 위쪽'); RZ('r2', `${bd}${L.res[1]}${n}`, `${bd}${L.res[1]}${gr}`, '10k', 'Echo 분배기 아래쪽');
        W('eg', `${bd}${L.res[0]}${gr}`, freeRail(L.rails.gnd, gr), 'gnd'); W('s' + i, `${bd}${L.sig2}${n}`, to, net, { sig: p.sig });
      } else if (colorPins.includes(p)) {
        const j = colorPins.indexOf(p), n = rmin - 2 - j, col = L.res[j];
        RZ('c' + i, `${bd}${col}${p.row}`, `${bd}${col}${n}`, '220', `${p.mod} 전류 제한`); W('s' + i, `${bd}${L.sig2}${n}`, to, net, { sig: p.sig });
      } else W('s' + i, `${bd}${L.sig}${p.row}`, to, net, { sig: p.sig });
    });
    I.items = items; I.pins = pins;
  }
}
function rebuild(opts = {}) {
  const res = layoutAll(INST);
  if (res.fail) return res;
  buildItems(INST); renderCircuit(); renderList(); renderCards(); renderPanel(); save();
  if (!opts.quiet) renderStatus();
  return res;
}

// ───────── 회로 그림 ─────────
function renderCircuit() {
  const used = new Set(INST.flatMap(I => Object.values(I.gpio)));
  const defs = `<defs><pattern id="hp" width="10" height="10" patternUnits="userSpaceOnUse" x="${xRow(63) - 5}" y="0"><rect x="3.2" y="3.2" width="3.6" height="3.6" rx=".6" fill="#4a4f5a" opacity=".55"/></pattern><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  let mods = '', res = '', wires = '';
  for (const I of INST) {
    const lay = I.fp.lay, i0 = lay.findIndex(p => p.x === I.fp.xmin), up = I.lane === 'bot';
    const tx = xRow(I.start) - MOD_K * lay[i0].x, ty = (up ? yCol(COLX.L.F) : yCol(COLX.R.E)) - MOD_K * lay[i0].y;
    const rows = I.pins.map(p => p.row);
    mods += `<g class="inst${I.id === selId ? ' sel' : ''}" data-inst="${I.id}"><title>${esc(I.s.name)} — ${LANES[I.lane].name} ${LANES[I.lane].pin}${Math.max(...rows)}~${LANES[I.lane].pin}${Math.min(...rows)} · 누르면 조작</title><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${MOD_K})">${moduleSvg(I.s, { circuit: true, leg: MOD_LEG, legsUp: up, noScene: true, uid: I.id })}</g></g>`;
    for (const it of I.items) {
      if (it.t === 'res') res += `<g class="inst" data-inst="${I.id}"><title>${esc(RES_KO[it.val])} ${esc(it.role)}</title>${resSvg(it)}</g>`;
      else { const A = parseHole(it.from), Bh = parseHole(it.to), c = COLORS[it.net]; wires += `<g class="wire${I.id === selId ? ' sel' : ''}" data-inst="${I.id}"${it.sig ? ` data-sig="${it.sig}"` : ''}><title>${esc(I.s.name)} · ${esc(COLOR_KO[it.net])} 선: ${esc(holeNice(it.from))} → ${esc(holeNice(it.to))}</title><path class="w" d="${wirePath(it.from, it.to)}" stroke="${c}" fill="none" stroke-width="3" stroke-linecap="round"/><circle cx="${A.x}" cy="${A.y}" r="2.6" fill="${c}" stroke="#fff" stroke-width=".8"/><circle cx="${Bh.x}" cy="${Bh.y}" r="2.6" fill="${c}" stroke="#fff" stroke-width=".8"/>${it.sig ? `<text class="vlab" x="${Bh.x}" y="${Bh.y + (Bh.board === 'L' ? 14 : -7)}" text-anchor="middle" font-size="8.5" font-family="JetBrains Mono" font-weight="700"></text>` : ''}</g>`; }
    }
  }
  const base = BASE.map(([id, f, t, net]) => { const A = parseHole(f), Bh = parseHole(t); return `<g class="wire base"><title>기본 전원 배선: ${esc(holeNice(f))} → ${esc(holeNice(t))}</title><path class="w" d="${wirePath(f, t)}" stroke="${COLORS[net]}" fill="none" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="${A.x}" cy="${A.y}" r="2.4" fill="${COLORS[net]}"/><circle cx="${Bh.x}" cy="${Bh.y}" r="2.4" fill="${COLORS[net]}"/></g>`; }).join('');
  $('labsvg').innerHTML = defs + `<rect y="60" width="712" height="600" fill="#f3efe3"/>` + boardSvg('R') + boardSvg('L') + espSvg(used) + base + res + mods + wires;
  $('empty').hidden = INST.length > 0;
}
function pinVal(I, sig) {
  const r = I.r || {}, v = (I.o && I.o.vis) || {}, L = I.last, k = I.s.key;
  if (r[sig] && typeof r[sig] === 'object' && r[sig].raw != null) return [`${(r[sig].mv / 1000).toFixed(2)}V`, ''];
  if (sig !== 'B' && typeof r[sig] === 'number') return [r[sig] ? 'HIGH' : 'LOW', r[sig] ? 'hi' : 'lo'];
  if (k === 'ultrasonic') return sig === 'ECHO' ? [`${r.echo || 0}µs`, r.echo ? 'hi' : 'lo'] : ['TRIG', ''];
  if (k === 'ds18b20') return [L.temp_c != null ? `${(+L.temp_c).toFixed(1)}°C` : '1-Wire', ''];
  if (k === 'dht11') return [L.hum != null ? `${L.temp_c}° ${L.hum}%` : '단선', ''];
  if (v.rgb && ['R', 'G', 'B'].includes(sig)) { const n = v.rgb['RGB'.indexOf(sig)]; return [`PWM ${n}`, n ? 'hi' : 'lo']; }
  if (k === 'magiccup' && (sig === 'LA' || sig === 'LB')) { const n = sig === 'LA' ? v.la : v.lb; return [`PWM ${n || 0}`, n ? 'hi' : 'lo']; }
  if (I.s.isOut) { const on = k === 'passivebuzzer' ? L.freq > 0 : k === 'irtx' ? !!v.ir : !!Object.values(L)[0]; return [k === 'passivebuzzer' && L.freq ? `${L.freq}Hz` : on ? 'HIGH' : 'LOW', on ? 'hi' : 'lo']; }
  return ['—', ''];
}
function updateCircuit() {
  const svg = $('labsvg');
  for (const I of INST) {
    const g = svg.querySelector(`.inst[data-inst="${I.id}"] > g`);
    if (g) updateModuleSvg(g, I.s, I.e, I.o, I.last);
  }
  svg.querySelectorAll('.wire[data-sig]').forEach(w => {
    const I = INST.find(x => x.id === w.dataset.inst); if (!I) return;
    const [val, c] = pinVal(I, w.dataset.sig);
    w.classList.toggle('hi', c === 'hi');
    const t = w.querySelector('.vlab'); if (t) t.textContent = val;
  });
}

// ───────── 시뮬레이션 (센서마다) ─────────
function adc(v) { const raw = v < 0.075 ? 0 : v >= 3.1 ? 4095 : Math.round((v - 0.075) / (3.1 - 0.075) * 4095); return { v, raw, mv: Math.max(0, Math.round(Math.min(v, 3.15) * 1000 + gauss() * 3)) }; }
function electrical(I, o) {
  const r = { B }, f = I.fault, s = I.s;
  for (const [name, ch] of Object.entries(o.ch || {})) {
    let v = ch.v;
    if (ch.k === 'a') {
      v += gauss() * (s.nz ?? 0.004) * B.vcc * (SET.noise * 2 + (f === 'noise' ? 8 : 0));
      if (f === 'open') { I.flo[name] = clamp((I.flo[name] ?? 0.05 * B.vcc) + gauss() * 0.012 * B.vcc, 0, 0.3 * B.vcc); v = I.flo[name]; }
      if (f === 'short') v = B.vcc;
      if (f === 'stuck') { if (I.stuck[name] == null) I.stuck[name] = v; v = I.stuck[name]; }
      r[name] = adc(clamp(v, 0, B.vcc));
    } else if (ch.k === 'd') {
      if (f === 'open') v = ch.pu ? 1 : (Math.random() < 0.5 ? 0 : 1);
      if (f === 'short') v = 1;
      if (f === 'noise' && Math.random() < 0.15) v = 1 - v;
      if (f === 'stuck') { if (I.stuck[name] == null) I.stuck[name] = v; v = I.stuck[name]; }
      r[name] = v;
    } else {
      if (f === 'open') v = o.fx ? o.fx.open : NaN;
      if (f === 'short') v = o.fx ? o.fx.short : NaN;
      if (f === 'stuck') { if (I.stuck[name] == null) I.stuck[name] = v; v = I.stuck[name]; }
      r[name] = v;
    }
  }
  if (f !== 'stuck') I.stuck = {};
  if (f === 'open' || f === 'short') r._fault = true;
  return r;
}
function filtered(I, r) {
  const out = { ...r };
  for (const [name, a] of Object.entries(r)) {
    if (!a || typeof a !== 'object' || a.raw == null) continue;
    I.unf[name] = a.raw;
    if (!SET.filter) continue;
    let st = I.filt[name];
    if (SET.filter === 'ma') { if (!st || !st.buf) st = I.filt[name] = { buf: [] }; st.buf.push([a.raw, a.mv]); if (st.buf.length > 10) st.buf.shift(); const n = st.buf.length; out[name] = { ...a, raw: Math.round(st.buf.reduce((p, q) => p + q[0], 0) / n), mv: st.buf.reduce((p, q) => p + q[1], 0) / n }; }
    else { if (!st || st.raw == null) st = I.filt[name] = { raw: a.raw, mv: a.mv }; st.raw = 0.2 * a.raw + 0.8 * st.raw; st.mv = 0.2 * a.mv + 0.8 * st.mv; out[name] = { ...a, raw: Math.round(st.raw), mv: st.mv }; }
  }
  return out;
}
function judge(s, vals, e) {
  let lv = 0, msg = ''; const hits = [];
  (s.rules || []).forEach((ru, i) => {
    const v = vals[ru.k]; hits[i] = 0;
    if (v == null || typeof v !== 'number' || Number.isNaN(v) || (ru.skip && ru.skip(v)) || (ru.when && !ru.when(e))) return;
    let l = 0;
    if (ru.dir === 'flag') l = v === ru.eq ? ru.lv : 0;
    else ru.th.forEach((t, k) => { if (t == null) return; const ok = ru.dir === 'hi' ? v >= t : ru.dir === 'lo' ? v <= t : Math.abs(v) >= t; if (ok) l = k + 1; });
    hits[i] = l;
    if (l > lv) { lv = l; msg = ru.dir === 'flag' ? ru.name : `${ru.name} ${fmtShow(v)}${ru.unit ? ' ' + ru.unit : ''}`; }
  });
  return { lv, msg, hits };
}
const fmtShow = v => typeof v !== 'number' ? String(v) : Number.isInteger(v) ? String(v) : (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
const fmtNum = v => typeof v !== 'number' ? String(v) : Number.isNaN(v) ? 'nan' : String(v);

function stepAll() {
  const tSim = T;
  for (const I of INST) {
    const s = I.s;
    if (I.linked && hasBmsCtrl(s)) I.e.bms = String(TRIP ? 4 : LVL);
    else if (SET.auto && s.auto) s.auto(tSim - I.t0, I.e, I.st);
    const noise = I.fault === 'noise' ? 1 : SET.noise;
    const o = s.sim(I.e, I.st, { B, t: tSim, dt: DT, noise }) || { ch: {} };
    I.o = o; if (o.ev) I.ev = o.ev;
    I.r = electrical(I, o);
  }
  T = r3(T + DT);
  for (const I of INST) if (T + 1e-9 >= I.nextRead) { I.nextRead = r3(I.nextRead + I.s.period / 1000); readInst(I); }
  combine();
  if (T + 1e-9 >= nextSample) { nextSample = r3(nextSample + 1); sampleRow(); }
}
function readInst(I) {
  const s = I.s, r = filtered(I, I.r); r.B = B;
  const ev = I.ev; I.ev = null;
  const noise = I.fault === 'noise' ? 1 : SET.noise;
  const out = s.read(r, I.st, { B, t: T, dt: s.period / 1000, period: s.period, noise }, ev, I.o) || {};
  for (const [k, v] of Object.entries(out)) if (k[0] !== '_') I.last[k] = v;
  const j = judge(s, I.last, I.e); I.lv = j.lv; I.msg = j.msg; I.hits = j.hits;
  if (OFFLINE) return;
  if (I.id === selId) {
    const keys = (s.prints || Object.keys(out)).filter(k => k[0] !== '_' && out[k] !== undefined);
    const txt = keys.map(k => `${k}:${fmtNum(out[k])}`).join(',');
    let line = null;
    if (s.evOnly) line = ev && keys.length && !ev.garbage ? txt : null;
    else if (s.isOut) line = txt !== I.lastLine ? txt : null;
    else line = txt;
    if (line) { I.lastLine = line; serialOut(`${pad2(s.n)} │ ${line}`); }
  }
  I.chart.push({ t: T, v: { ...I.last }, g: { ...I.unf } });
  while (I.chart.length && T - I.chart[0].t > WIN) I.chart.shift();
}
function combine() {
  let lv = 0, msg = '', who = null;
  for (const I of INST) if ((I.s.rules || []).length && I.lv > lv) { lv = I.lv; msg = I.msg; who = I; }
  if (lv !== LVL && !OFFLINE) serialOut(`${LV[lv].t}${who ? ` · ${pad2(who.s.n)} ${who.s.name}: ${msg}` : ''}`, lv >= 2 ? 'tx' : 'sys');
  LVL = lv; MSG = who ? `${who.s.name} · ${msg}` : '';
  if (lv === 3 && !TRIP) { TRIP = true; if (!OFFLINE) serialOut('TRIP — 위험 단계: 출력 모듈이 차단 상태로 바뀜 (리셋할 때까지 유지)', 'tx'); }
}
function sampleRow() {
  const row = { time_s: T };
  for (const I of INST) for (const [k, v] of Object.entries(I.last)) if (typeof v === 'number') row[`s${pad2(I.s.n)}_${k}`] = v;
  row.bms_level = LVL; row.trip = TRIP ? 1 : 0;
  if (OFFLINE) { OFFLINE.push(row); return; }
  if (LOG.length < LOG_MAX) LOG.push(row);
}

// ───────── 센서 추가·빼기 ─────────
function addSensor(n, opts = {}) {
  const s = SENSORS.find(x => x.n === +n); if (!s) return false;
  if (INST.some(I => I.s.n === s.n)) { if (!opts.quiet) toast(`${s.name}은(는) 이미 꽂혀 있어요`); return false; }
  const I = newInst(s, opts); INST.push(I);
  const res = layoutAll(INST);
  if (res.fail) { INST.pop(); layoutAll(INST); if (!opts.quiet) toast(res.fail, 3800); return false; }
  selId = I.id;
  if (!opts.batch) { rebuild(); serialOut(`＋ ${pad2(s.n)} ${s.name} 꽂음 · ${pinSummary(I)}`, 'sys'); }
  return true;
}
function removeSensor(id) {
  const i = INST.findIndex(I => I.id === id); if (i < 0) return;
  const [I] = INST.splice(i, 1);
  if (selId === id) selId = INST.length ? INST[INST.length - 1].id : null;
  rebuild(); serialOut(`－ ${pad2(I.s.n)} ${I.s.name} 뺌`, 'sys');
}
function loadSet(list, msg) {
  INST = []; selId = null; TRIP = false; LVL = 0; LOG = []; nextSample = T;
  const failed = [];
  for (const n of list) if (!addSensor(n, { batch: true, quiet: true })) failed.push(SENSORS.find(s => s.n === n)?.name || n);
  selId = INST[0] ? INST[0].id : null;
  rebuild();
  if (msg) serialOut(msg, 'sys');
  if (failed.length) toast(`핀이나 자리가 모자라 빠진 센서: ${failed.join(', ')}`, 4200);
}
const pinSummary = I => Object.entries(I.gpio).map(([sig, g]) => `${sig}→${g.replace('GPIO', 'IO')}`).join(' ');
const sel = () => INST.find(I => I.id === selId);
function select(id) { selId = id; document.querySelectorAll('#labsvg .inst, #labsvg .wire').forEach(g => g.classList.toggle('sel', g.dataset.inst === id)); renderCards(); renderLegend(); renderPanel(); SER.push(`<span class="sys">── ${esc(sel()?.s.name || '')} 선택 ──</span>`); serDirty = true; }

// ───────── 목록 ─────────
let query = '';
function renderList() {
  const q = query.trim().toLowerCase();
  const items = SENSORS.filter(s => !q || `${s.n} ${s.name} ${s.model} ${s.key}`.toLowerCase().includes(q));
  $('slist').innerHTML = items.map(s => {
    const I = INST.find(x => x.s.n === s.n);
    return `<li class="${I ? 'added' : ''}"><div class="row" style="display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:5px 7px;border-radius:11px;border:1.5px solid transparent${I ? ';background:#eef8f3' : ''}"><span class="no" style="font-family:var(--f-mono);font-size:11px;font-weight:700;color:#fff;background:${I ? 'var(--green)' : 'var(--navy)'};border-radius:6px;text-align:center;padding:1px 0">${pad2(s.n)}</span><span class="nm" style="font-weight:600;font-size:13.5px;line-height:1.2">${esc(s.name)}<small style="display:block;font-weight:500;font-size:11px;color:var(--faint)">${esc(s.model)} · ${CATS[s.cat].tag}${I ? ` · ${esc(Object.values(I.gpio).map(g => g.replace('GPIO', 'IO')).join(' '))}` : ''}</small></span>${I ? `<button type="button" class="addbtn rm" data-rm="${I.id}" aria-label="${esc(s.name)} 빼기" title="빼기">−</button>` : `<button type="button" class="addbtn" data-add="${s.n}" aria-label="${esc(s.name)} 꽂기" title="꽂기">＋</button>`}</div></li>`;
  }).join('');
  $('presets').innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}" title="${esc(p.desc)}">${esc(p.name)}</button>`).join('') + (INST.length ? '<button type="button" data-clear="1" style="border-color:var(--card-border);background:var(--tile);color:var(--muted)">모두 빼기</button>' : '');
}

// ───────── 카드·상태 ─────────
function mainValue(I) {
  const L = I.last, sh = I.s.show || [];
  const f = t => { const v = L[t.k]; if (v == null) return '—'; if (t.bool) return t.bool[v ? 1 : 0]; if (t.ir) return v < 0 ? '—' : `${irName(v)} (${v})`; if (typeof v === 'number' && Number.isNaN(v)) return 'NaN'; if (t.neg && v < 0) return t.neg; return `${typeof v === 'number' && t.dp != null ? v.toFixed(t.dp) : v}${t.unit ? `<small> ${esc(t.unit)}</small>` : ''}`; };
  return sh.slice(0, 2).map((t, i) => i ? `<small> · ${esc(t.label)} ${f(t).replace(/<\/?small>/g, '')}</small>` : f(t)).join('');
}
function renderCards() {
  $('cards').innerHTML = INST.map(I => `<div class="scard2${I.id === selId ? ' sel' : ''}" data-card="${I.id}" role="button" tabindex="0" aria-label="${esc(I.s.name)} 선택"><div class="h"><span class="no">${pad2(I.s.n)}</span>${esc(I.s.name)}</div><div class="p">${esc(pinSummary(I))}${I.fault ? ' · ⚠ 고장 주입' : ''}${I.linked && hasBmsCtrl(I.s) ? ' · 통합 판정 연동' : ''}</div><div class="v" data-v="${I.id}">—</div><span class="lvb" data-lv="${I.id}"></span><canvas data-spark="${I.id}" width="200" height="34"></canvas><button type="button" class="x" data-rm="${I.id}" aria-label="${esc(I.s.name)} 빼기" title="빼기">×</button></div>`).join('');
}
function updateCards() {
  for (const I of INST) {
    const v = document.querySelector(`[data-v="${I.id}"]`); if (v) v.innerHTML = mainValue(I);
    const l = document.querySelector(`[data-lv="${I.id}"]`); if (l) l.innerHTML = (I.s.rules || []).length ? `<span class="lv lv${I.lv}">${LV[I.lv].t}</span>` : I.s.isOut ? '<span class="lv" style="background:var(--navy)">출력</span>' : '';
    const cv = document.querySelector(`[data-spark="${I.id}"]`); if (cv) spark(cv, I);
  }
}
function spark(cv, I) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const p = I.s.plot[0], d = I.chart; if (!d.length) return;
  let mn = p.min, mx = p.max; if (mx === 'adc') mx = B.adcMax;
  if (mn === 'auto' || mx === 'auto') { const vs = d.map(x => x.v[p.k]).filter(v => typeof v === 'number' && !Number.isNaN(v)); mn = Math.min(...vs) - 2; mx = Math.max(...vs) + 2; }
  const tEnd = d[d.length - 1].t, X = t => W * (1 - (tEnd - t) / WIN), Y = v => 2 + (H - 4) * (1 - (v - mn) / ((mx - mn) || 1));
  g.strokeStyle = I.lv >= 2 ? '#d62f2f' : p.color || '#1e3a5c'; g.lineWidth = 1.6; g.beginPath(); let f = true, py = 0;
  for (const x of d) { const v = x.v[p.k]; if (typeof v !== 'number' || Number.isNaN(v)) { f = true; continue; } const yy = clamp(Y(v), 1, H - 1); if (f) { g.moveTo(X(x.t), yy); f = false; } else { if (p.step) g.lineTo(X(x.t), py); g.lineTo(X(x.t), yy); } py = yy; }
  g.stroke();
}
function renderStatus() {
  const st = $('bStatus'); let t, c;
  if (!INST.length) { t = '센서 없음'; c = 'var(--faint)'; }
  else if (TRIP) { t = `TRIP · ${LVL ? LV[LVL].t : '리셋 대기'}`; c = 'var(--trip)'; }
  else if (!INST.some(I => (I.s.rules || []).length)) { t = '판정할 센서 없음'; c = 'var(--faint)'; }
  else { t = `${LV[LVL].t}${MSG ? ' · ' + MSG : ''}`; c = LV[LVL].c; }
  st.style.setProperty('--c', c); $('bLv').textContent = t;
  const used = INST.reduce((a, I) => a + Object.keys(I.gpio).length, 0), cap = ALL_GPIO.filter(g => !(SET.avoidBms && BMS_ROLE[g])).length;
  $('bSub').textContent = INST.length ? `센서 ${INST.length}개 · ESP32 핀 ${used}/${cap} 사용 · 시뮬레이션 ${T.toFixed(1)}초` : '센서를 꽂으면 ESP32 핀과 브레드보드 자리가 자동으로 정해져요';
}

// ───────── 그래프 (선택한 센서) ─────────
function drawChart() {
  const cv = $('chart'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const pl = 6, pr = 6, pt = 8, pb = 16, w = W - pl - pr, h = H - pt - pb;
  g.strokeStyle = '#ebe6da'; g.lineWidth = 1; g.font = '10px JetBrains Mono, monospace'; g.fillStyle = '#8a8d96';
  for (let i = 0; i <= 4; i++) { const y = pt + h * i / 4; g.beginPath(); g.moveTo(pl, y); g.lineTo(pl + w, y); g.stroke(); }
  for (let s = 0; s <= 60; s += 10) g.fillText(`-${60 - s}s`, Math.min(pl + w * s / 60, pl + w - 26), H - 3);
  const I = sel();
  if (!I) { g.fillStyle = '#8a8d96'; g.font = '13px Roboto Condensed, sans-serif'; g.fillText('센서를 꽂고 선택하면 그래프가 그려져요', pl + 10, pt + 20); return; }
  const data = I.chart, tEnd = data.length ? data[data.length - 1].t : 0, X = t => pl + w * (1 - (tEnd - t) / WIN);
  I.s.plot.forEach((p, i) => {
    let mn = p.min, mx = p.max; if (mx === 'adc') mx = B.adcMax;
    if (mn === 'auto' || mx === 'auto') { const vs = data.map(d => d.v[p.k]).filter(v => typeof v === 'number' && !Number.isNaN(v)); const a = vs.length ? Math.min(...vs) : 0, b = vs.length ? Math.max(...vs) : 1, pd = Math.max(2, (b - a) * 0.15); mn = a - pd; mx = b + pd; }
    p._r = [mn, mx];
    const Y = v => pt + h * (1 - (v - mn) / ((mx - mn) || 1));
    if (p.ghost && SET.filter) { g.strokeStyle = '#c9c2ad'; g.lineWidth = 1; g.beginPath(); let f = true; for (const d of data) { const v = d.g[p.ghost]; if (v == null) continue; const yy = clamp(Y(v), pt, pt + h); f ? g.moveTo(X(d.t), yy) : g.lineTo(X(d.t), yy); f = false; } g.stroke(); }
    g.strokeStyle = p.color || SERIES_COLORS[i % 4]; g.lineWidth = 2; g.beginPath(); let first = true, py = 0;
    for (const d of data) { const v = d.v[p.k]; if (typeof v !== 'number' || Number.isNaN(v)) { first = true; continue; } const x = X(d.t), y = clamp(Y(v), pt, pt + h); if (first) { g.moveTo(x, y); first = false; } else { if (p.step) g.lineTo(x, py); g.lineTo(x, y); } py = y; }
    g.stroke();
  });
  const p0 = I.s.plot[0], ri = (I.s.rules || []).findIndex(r => r.k === p0.k && r.dir !== 'flag');
  if (ri >= 0 && p0._r) { const [mn, mx] = p0._r; I.s.rules[ri].th.forEach((t, k) => { if (t == null) return; const vv = I.s.rules[ri].dir === 'abs' ? [t, -t] : [t]; vv.forEach(v => { const y = pt + h * (1 - (v - mn) / ((mx - mn) || 1)); if (y < pt || y > pt + h) return; g.strokeStyle = ['#e6b800', '#f07f12', '#d62f2f'][k]; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pl, y); g.lineTo(pl + w, y); g.stroke(); g.setLineDash([]); }); }); }
}
function renderLegend() {
  const I = sel();
  $('chartT').textContent = I ? `${pad2(I.s.n)} ${I.s.name} · 최근 60초` : '선택한 센서 · 최근 60초';
  if (!I) { $('legend').innerHTML = ''; return; }
  const rng = p => { if (p.step) return ''; if (p.min === 'auto') return '자동 범위'; return `${p.min}–${p.max === 'adc' ? B.adcMax : p.max}${p.unit ? ' ' + p.unit : ''}`; };
  $('legend').innerHTML = I.s.plot.map((p, i) => `<span><i style="background:${p.color || SERIES_COLORS[i % 4]}"></i>${esc(p.label)} <span class="mono" style="color:var(--faint)">${esc(rng(p))}</span></span>`).join('') + '<span class="r">SIM</span>';
}

// ───────── 기록 ─────────
function serialOut(line, cls) {
  const ts = T.toFixed(2).padStart(7);
  SER.push(cls ? `<span class="sys">${ts}</span> <span class="${cls}">${esc(line)}</span>` : `<span class="sys">${ts} → </span>${esc(line)}`);
  if (SER.length > 300) SER.splice(0, SER.length - 300);
  serDirty = true;
}
function flushSerial() {
  if (!serDirty) return; serDirty = false;
  const pre = $('serial'), atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 30;
  pre.innerHTML = SER.join('\n'); if (atBottom) pre.scrollTop = pre.scrollHeight;
  $('logInfo').textContent = `CSV 기록 ${LOG.length.toLocaleString()}줄 (1초 간격)`;
}

// ───────── 오른쪽 패널 ─────────
function fmtCtrl(c, v) { if (c.log) { const lux = 10 ** v; return lux >= 100 ? `${Math.round(lux)} ${c.unit}` : `${lux.toFixed(1)} ${c.unit}`; } return `${Number.isInteger(c.step) ? Math.round(v) : (+v).toFixed(1)}${c.unit ? ' ' + c.unit : ''}`; }
function ctrlHtml() {
  const I = sel();
  const global = `<h3>모든 센서 공통</h3>
    <div class="swrow"><span id="aL">자동 시나리오 (조작을 자동으로)</span><button type="button" class="switch" role="switch" id="gAuto" aria-checked="${SET.auto}" aria-labelledby="aL"><i></i></button></div>
    <div class="crow"><div class="cl"><span>잡음</span><output id="gNoiseV">${Math.round(SET.noise * 100)}%</output></div><input type="range" id="gNoise" min="0" max="100" value="${Math.round(SET.noise * 100)}" aria-label="잡음"></div>
    <div class="crow"><div class="cl"><span>ADC 필터</span></div><div class="seg" role="radiogroup" aria-label="ADC 필터">${[['', '없음'], ['ma', '이동평균 10'], ['ema', 'EMA α0.2']].map(([f, n]) => `<button type="button" role="radio" data-gf="${f}" aria-checked="${SET.filter === f}">${n}</button>`).join('')}</div></div>`;
  if (!I) return `<p class="desc">왼쪽 목록의 <b>＋</b>로 센서를 꽂거나 예시 세트를 골라 보세요. 꽂을 때마다 ESP32 핀과 브레드보드 자리, 점퍼선이 자동으로 만들어져요.</p><ul class="tips"><li>3.3V로 동작하는 센서는 위 보드, 5V가 필요한 센서와 출력 모듈은 아래 보드에 꽂혀요.</li><li>아날로그 센서는 ADC1 핀(GPIO32~39)에만 배정돼요.</li><li>릴레이·LED·부저는 '통합 판정'을 따라 자동으로 움직여요.</li></ul>${global}`;
  const s = I.s, e = I.e, linked = I.linked && hasBmsCtrl(s);
  const rows = (s.ctrls || []).map(c => {
    if (c.k === 'bms' && linked) return '';
    if (c.t === 'range') return `<div class="crow"><div class="cl"><label for="c_${c.k}">${esc(c.label)}</label><output id="o_${c.k}">${esc(fmtCtrl(c, e[c.k]))}</output></div><input type="range" id="c_${c.k}" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="${e[c.k]}"></div>`;
    if (c.t === 'toggle') return `<div class="swrow"><span id="l_${c.k}">${esc(c.label)}</span><button type="button" class="switch" role="switch" data-tg="${c.k}" aria-checked="${!!e[c.k]}" aria-labelledby="l_${c.k}"><i></i></button></div>`;
    if (c.t === 'select') return `<div class="crow"><div class="cl"><label for="c_${c.k}">${esc(c.label)}</label></div><select class="sel" id="c_${c.k}" data-sel="${c.k}">${c.opts.map(([v, n]) => `<option value="${esc(v)}"${String(e[c.k]) === String(v) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    return '';
  }).join('');
  const holds = (s.ctrls || []).filter(c => c.t === 'hold' || c.t === 'tap');
  const hb = holds.length ? `<div class="btnrow">${holds.map(c => `<button type="button" class="hbtn${c.t === 'tap' ? ' y' : ''}" ${c.t === 'hold' ? `data-hold="${c.k}" aria-pressed="false"` : `data-tap="${c.k}"`}>${esc(c.label)}${c.t === 'hold' ? ' <small style="opacity:.75;font-weight:500">(누르고 있기)</small>' : ''}</button>`).join('')}</div>` : '';
  const kp = (s.ctrls || []).some(c => c.t === 'keypad') ? `<div class="keypad">${IR_KEYS.map(([n, c]) => `<button type="button" data-key="${c}">${esc(n)}</button>`).join('')}</div>` : '';
  const pad = (s.ctrls || []).some(c => c.t === 'pad') ? `<div class="pad" id="pad" role="slider" aria-label="조이스틱" tabindex="0"><i id="padCap"></i></div>` : '';
  const knob = (s.ctrls || []).some(c => c.t === 'knob') ? `<div class="knob"><button type="button" class="hbtn" data-knob="-1">◀ 반시계</button><div class="dial" id="dial" aria-hidden="true"></div><button type="button" class="hbtn" data-knob="1">시계 ▶</button></div>` : '';
  const link = hasBmsCtrl(s) ? `<div class="swrow"><span id="lkL">통합 판정 따라가기 <small style="color:var(--faint);font-weight:500">(BMS 출력처럼)</small></span><button type="button" class="switch" role="switch" id="linkSw" aria-checked="${linked}" aria-labelledby="lkL"><i></i></button></div>` : '';
  return `<p class="desc">${esc(s.desc)}</p>
  <div class="note" style="margin-top:6px"><b>${esc(LANES[I.lane].name)} ${LANES[I.lane].pin}${Math.max(...I.pins.map(p => p.row))}~${LANES[I.lane].pin}${Math.min(...I.pins.map(p => p.row))}</b> · ${esc(Object.entries(I.gpio).map(([sig, g]) => `${sig} → ${g}`).join(', '))}${I.pins.some(p => p.conv) ? '<br>출력 모듈이라 아래 보드 5V 레일에서 전원을 받아요 (신호는 ESP32 3.3V로 충분)' : ''}</div>
  <h3>${s.isOut ? '출력 조작' : '환경 조작'} <small style="text-transform:none;font-family:var(--f-ui);letter-spacing:0;color:var(--faint)">${linked ? '통합 판정이 이 출력을 움직여요' : SET.auto && s.auto ? '자동 시나리오가 켜져 있어요' : ''}</small></h3>
  ${link}${pad}${knob}${kp}${rows}${hb}
  <div class="crow"><div class="cl"><span>이 센서 고장 주입</span></div><select class="sel" id="iFault"><option value="">정상</option><option value="open"${I.fault === 'open' ? ' selected' : ''}>단선 (신호선 빠짐)</option><option value="short"${I.fault === 'short' ? ' selected' : ''}>단락 (신호선 = 전원)</option><option value="noise"${I.fault === 'noise' ? ' selected' : ''}>잡음 폭증</option><option value="stuck"${I.fault === 'stuck' ? ' selected' : ''}>값 멈춤</option></select></div>
  <p class="desc" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><a class="ghostbtn" href="sensors.html#${s.n}" style="text-decoration:none;color:var(--ink)">센서 40종에서 예제 코드 보기 →</a><button type="button" class="ghostbtn" data-rm="${I.id}" style="color:var(--lv3)">이 센서 빼기</button></p>
  ${global}`;
}
function pinsHtml() {
  const map = {}; INST.forEach(I => Object.entries(I.gpio).forEach(([sig, g]) => { map[g] = { I, sig, need: analyze(I.s).need[sig] }; }));
  const used = Object.keys(map).length, cap = ALL_GPIO.filter(g => !(SET.avoidBms && BMS_ROLE[g])).length;
  const rows = ALL_GPIO.map(g => { const m = map[g], blocked = SET.avoidBms && BMS_ROLE[g]; const kind = IN_ONLY.has(g) ? '입력 전용 · ADC1' : ADC1.includes(g) ? '입출력 · ADC1' : '입출력'; return `<tr class="${m ? '' : 'free'}"><td class="g">${g}</td><td>${m ? `<b>${pad2(m.I.s.n)} ${esc(m.I.s.name)}</b> · ${esc(m.sig)} <span class="tag2 ${NEED_TAG[m.need]}">${NEED_KO[m.need]}</span>` : blocked ? `<span style="color:var(--lv3)">BMS ${esc(BMS_ROLE[g])}</span>` : '비어 있음'}</td><td style="font-size:11.5px;color:var(--muted)">${kind}</td></tr>`; }).join('');
  const warn = [];
  if (map.GPIO5 || map.GPIO15) warn.push('GPIO5·15는 부팅할 때 상태를 읽는 핀(스트래핑)이에요. 보통 문제없지만 부팅이 안 되면 그 센서를 잠시 빼고 업로드하세요.');
  if (INST.some(I => I.s.key === 'ds18b20') && SET.avoidBms) warn.push('DS18B20은 BMS 온도센서와 같은 GPIO4 1-Wire 버스를 함께 써요.');
  return `<div class="sumrow"><div class="tile"><small>쓴 핀</small><b>${used}</b><span>/ ${cap}</span></div><div class="tile"><small>아날로그(ADC1) 남음</small><b>${ADC1.filter(g => !map[g] && !(SET.avoidBms && BMS_ROLE[g])).length}</b><span>개</span></div><div class="tile"><small>센서</small><b>${INST.length}</b><span>개</span></div></div>
  <h3>ESP32 핀 배치표</h3><table class="ptab"><thead><tr><th>GPIO</th><th>연결</th><th>핀 종류</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="note"><b>자동 배정 규칙</b><br>아날로그 센서 → ADC1 핀(36·39·34·35·32·33, Wi-Fi를 켜도 읽힘) · 출력·풀업이 필요한 입력·1-Wire → 입출력 핀 (34~39는 입력 전용이라 제외) · 그 밖의 디지털 입력 → 남는 핀. 가능하면 센서 40종 예제와 같은 핀을 먼저 씁니다.${SET.avoidBms ? '<br>지금은 <b>BMS 보드 핀 피하기</b>가 켜져 있어 BMS가 쓰는 14개 핀을 비워 둡니다.' : ''}</div>
  ${warn.length ? `<ul class="tips">${warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
  <p class="desc" style="margin-top:8px;font-size:12px;color:var(--muted)">ESP32에서 쓰지 않는 핀: GPIO0·2·12(부팅용), 1·3(USB 시리얼), 6~11(내장 플래시)</p>`;
}
function wireHtml() {
  if (!INST.length) return '<p class="desc">센서를 꽂으면 준비물과 배선표가 여기에 만들어져요.</p>';
  const all = INST.flatMap(I => I.items), nW = all.filter(i => i.t === 'wire').length + BASE.length, res = {};
  all.filter(i => i.t === 'res').forEach(r => { res[r.val] = (res[r.val] || 0) + 1; });
  const bom = [['ESP32 DevKitC V4', '1개'], ['브레드보드 830홀', '2개'], ...INST.map(I => [`${pad2(I.s.n)} ${I.s.name} (${I.s.model})`, I.s.key === 'magiccup' ? '2개' : '1개']), ['수-수(M-M) 점퍼선', `${nW}개`], ...Object.entries(res).map(([v, n]) => [`저항 ${RES_KO[v]} (${BAND_KO[v]})`, `${n}개`])];
  const sec = I => `<h3>${pad2(I.s.n)} ${esc(I.s.name)}</h3><ul class="wl"><li><span class="sw" style="background:#d6b04d"></span><span><b>모듈</b> → ${esc(LANES[I.lane].name)} ${I.pins.slice().sort((a, b) => b.row - a.row).map(p => `${esc(p.mod.replace(/ \(.+\)/, '').replace(/^[AB]: /, ''))}=${LANES[I.lane].pin}${p.row}`).join(', ')}</span></li>${I.items.map(it => it.t === 'wire' ? `<li><span class="sw" style="background:${COLORS[it.net]}"></span><span><b>${esc(COLOR_KO[it.net])} 선</b>${it.pin ? ` · ${esc(it.pin.replace(/ \(.+\)/, ''))}` : ''}<br>${esc(holeNice(it.from))} → ${esc(holeNice(it.to))}</span></li>` : `<li><span class="sw" style="background:#e2cf9f"></span><span><b>저항 ${esc(RES_KO[it.val])}</b> · ${esc(it.role)}<br>${esc(holeNice(it.a))} ↔ ${esc(holeNice(it.b))}</span></li>`).join('')}</ul>`;
  return `<h3>준비물</h3><table class="bom"><tbody>${bom.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>
  <h3>기본 전원 배선 (BMS 1단계와 같음)</h3><ul class="wl">${BASE.map(([, f, t, net]) => `<li><span class="sw" style="background:${COLORS[net]}"></span><span><b>${esc(COLOR_KO[net])} 선</b><br>${esc(holeNice(f))} → ${esc(holeNice(t))}</span></li>`).join('')}</ul>
  ${INST.map(sec).join('')}
  <div class="note">위 보드 레일: + = 3V3, − = GND · 아래 보드 레일: + = 5V, − = GND. 같은 행의 A~E(또는 F~J) 다섯 구멍은 서로 이어져 있어요.</div>`;
}
function bmsHtml() {
  const ins = INST.filter(I => (I.s.rules || []).length), outs = INST.filter(I => hasBmsCtrl(I.s));
  return `<div class="tripbox"><span class="relayic" id="relayIc" style="--c:${TRIP ? 'var(--trip)' : LV[LVL].c}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" aria-hidden="true"><path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg></span><div class="big"><b id="tripT">${TRIP ? 'TRIP · 출력 차단 (래치)' : `통합 판정 · ${LV[LVL].t}`}</b><span id="tripS">${esc(TRIP ? (LVL === 3 ? '위험 조건이 아직 남아 있어요' : '원인을 확인했다면 리셋하세요') : MSG || '모든 센서가 정상 범위예요')}</span></div><button type="button" class="ybtn sm" id="tripReset2">TRIP 리셋</button></div>
  <h3>센서별 판정 <small style="text-transform:none;font-family:var(--f-ui);letter-spacing:0;color:var(--faint)">가장 나쁜 단계가 전체 상태</small></h3>
  ${ins.length ? `<table><thead><tr><th>센서</th><th>단계</th><th>내용</th></tr></thead><tbody>${ins.map(I => `<tr><td>${pad2(I.s.n)} ${esc(I.s.name)}</td><td data-blv="${I.id}"><span class="lv lv${I.lv}">${LV[I.lv].t}</span></td><td data-bmsg="${I.id}" style="font-size:12px">${esc(I.msg || '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="desc">판정 규칙이 있는 입력 센서가 아직 없어요 (예: 4 DS18B20, 27 불꽃, 22 리드 스위치).</p>'}
  <h3>통합 판정을 따라 움직이는 출력</h3>
  ${outs.length ? `<ul class="wl">${outs.map(I => `<li><span class="sw" style="background:${I.linked ? 'var(--green)' : 'var(--track)'}"></span><span><b>${pad2(I.s.n)} ${esc(I.s.name)}</b> · ${I.linked ? '연동 중' : '직접 조절'}<br><span class="kind">${esc(I.s.use)}</span></span></li>`).join('')}</ul>` : '<p class="desc">릴레이(20)·RGB LED(11·17)·듀얼 LED(13·30)·부저(9·14)를 꽂으면 통합 판정에 따라 자동으로 움직여요.</p>'}
  <div class="note">BMS 펌웨어와 같은 방식: 센서마다 주의·경고·위험을 판정하고, 하나라도 위험이면 TRIP(차단)한 뒤 사람이 리셋할 때까지 유지해요. 위험 조건이 남아 있으면 리셋이 거부돼요.</div>`;
}
function renderPanel() {
  const I = sel();
  $('pnum').textContent = I ? pad2(I.s.n) : '··';
  $('pkick').textContent = I ? `${CATS[I.s.cat].name} · ${I.s.model} · 꽂힌 센서 ${INST.length}개` : '가상 실험실';
  $('ptitle').textContent = I ? I.s.name : '센서를 꽂아 보세요';
  document.querySelectorAll('#ptabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('pbody').innerHTML = tab === 'ctrl' ? ctrlHtml() : tab === 'pins' ? pinsHtml() : tab === 'wire' ? wireHtml() : bmsHtml();
  bindPad();
}
function syncPanel() {
  const I = sel();
  if (tab === 'bms') {
    INST.forEach(x => { const a = document.querySelector(`[data-blv="${x.id}"]`); if (a) a.innerHTML = `<span class="lv lv${x.lv}">${LV[x.lv].t}</span>`; const m = document.querySelector(`[data-bmsg="${x.id}"]`); if (m) m.textContent = x.msg || '—'; });
    const ic = $('relayIc'); if (ic) { ic.style.setProperty('--c', TRIP ? 'var(--trip)' : LV[LVL].c); $('tripT').textContent = TRIP ? 'TRIP · 출력 차단 (래치)' : `통합 판정 · ${LV[LVL].t}`; $('tripS').textContent = TRIP ? (LVL === 3 ? '위험 조건이 아직 남아 있어요' : '원인을 확인했다면 리셋하세요') : MSG || '모든 센서가 정상 범위예요'; }
  }
  if (tab !== 'ctrl' || !I) return;
  const e = I.e;
  for (const c of I.s.ctrls || []) {
    if (c.t === 'range') { const el = $('c_' + c.k); if (el && document.activeElement !== el) { el.value = e[c.k]; $('o_' + c.k).textContent = fmtCtrl(c, e[c.k]); } }
    else if (c.t === 'toggle') { const el = document.querySelector(`[data-tg="${c.k}"]`); if (el) el.setAttribute('aria-checked', String(!!e[c.k])); }
    else if (c.t === 'select') { const el = $('c_' + c.k); if (el && document.activeElement !== el && el.value !== String(e[c.k])) el.value = String(e[c.k]); }
    else if (c.t === 'hold') { const el = document.querySelector(`[data-hold="${c.k}"]`); if (el) el.setAttribute('aria-pressed', String(!!e[c.k])); }
  }
  const cap = $('padCap'); if (cap) { cap.style.left = `${52 + (e.jx || 0) * 50}px`; cap.style.top = `${52 + (e.jy || 0) * 50}px`; }
  const dial = $('dial'); if (dial) dial.style.transform = `rotate(${(I.last.count || 0) * 18}deg)`;
}
function bindPad() {
  const pad = $('pad'); if (!pad) return;
  let drag = false;
  const move = ev => { const I = sel(); if (!I) return; const r = pad.getBoundingClientRect(); let x = (ev.clientX - r.left - r.width / 2) / (r.width / 2 - 23), y = (ev.clientY - r.top - r.height / 2) / (r.height / 2 - 23); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } I.e.jx = x; I.e.jy = y; };
  pad.addEventListener('pointerdown', ev => { drag = true; pad.setPointerCapture(ev.pointerId); move(ev); });
  pad.addEventListener('pointermove', ev => { if (drag) move(ev); });
  const up = () => { drag = false; const I = sel(); if (I && !SET.auto) { I.e.jx = 0; I.e.jy = 0; } };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
}

// ───────── CSV ─────────
function toCsv(rows) {
  const cols = []; for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const order = ['time_s', ...cols.filter(c => !['time_s', 'bms_level', 'trip'].includes(c)), 'bms_level', 'trip'];
  return '﻿' + [order.join(','), ...rows.map(r => order.map(c => { const v = r[c]; return v == null ? '' : Number.isNaN(v) ? 'nan' : String(Math.round(v * 1000) / 1000); }).join(','))].join('\r\n');
}
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`; };
const setName = () => INST.map(I => pad2(I.s.n)).join('-');
function saveCsv() { if (!LOG.length) { toast('아직 기록이 없어요'); return; } download(`lab_${setName()}_${stamp()}.csv`, toCsv(LOG)); toast(`CSV ${LOG.length.toLocaleString()}줄 저장`); }
function gen10() {
  if (!INST.length) { toast('센서를 먼저 꽂아 주세요'); return; }
  const saved = { INST, T, LVL, MSG, TRIP, nextSample, auto: SET.auto };
  const rows = [];
  INST = saved.INST.map(I => Object.assign(newInst(I.s, { linked: I.linked }), { t0: 0, nextRead: 0, fault: I.fault, gpio: I.gpio }));
  T = 0; LVL = 0; TRIP = false; nextSample = 0; SET.auto = true; OFFLINE = rows;
  let safeFor = 0, resets = 0;   // 가상 운전자: 위험이 사라지고 10초 지나면 TRIP 리셋
  try { for (let i = 0; i < 600 / DT; i++) { stepAll(); if (TRIP && LVL < 3) { safeFor += DT; if (safeFor >= 10) { TRIP = false; safeFor = 0; resets++; } } else safeFor = 0; } }
  finally { OFFLINE = false; ({ INST, T, LVL, MSG, TRIP, nextSample } = saved); SET.auto = saved.auto; }
  download(`lab_${setName()}_sim10min_${stamp()}.csv`, toCsv(rows));
  const c = [0, 0, 0, 0]; rows.forEach(r => c[r.bms_level]++); const n = rows.length || 1;
  toast(`가상 데이터 ${rows.length}줄(10분) 저장 · 통합 판정 정상 ${Math.round(c[0] / n * 100)}% 주의 ${Math.round(c[1] / n * 100)}% 경고 ${Math.round(c[2] / n * 100)}% 위험 ${Math.round(c[3] / n * 100)}% · TRIP ${rows.filter(r => r.trip).length}초 (위험이 사라지고 10초 뒤 자동 리셋 ${resets}회)`, 5600);
}

// ───────── 저장·소리·알림 ─────────
function save() { try { localStorage.setItem('bms-sandbox', JSON.stringify({ list: INST.map(I => [I.s.n, I.linked ? 1 : 0]), avoidBms: SET.avoidBms })); history.replaceState(null, '', INST.length ? '#' + INST.map(I => I.s.n).join(',') : location.pathname); } catch (e) {} }
let actx = null, osc = null, gain = null;
function audio() { if (!actx) { try { actx = new AudioContext(); osc = actx.createOscillator(); gain = actx.createGain(); osc.type = 'square'; gain.gain.value = 0; osc.connect(gain).connect(actx.destination); osc.start(); } catch (e) { actx = null; } } return actx; }
function setTone(f) { if (!actx) return; const t = actx.currentTime; if (!PREF.sound || !f || !SET.running) { gain.gain.setTargetAtTime(0, t, 0.01); return; } osc.frequency.setTargetAtTime(f, t, 0.005); gain.gain.setTargetAtTime(0.035, t, 0.01); }
let toastT = 0;
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }

// ───────── 이벤트 ─────────
$('slist').addEventListener('click', ev => { const a = ev.target.closest('[data-add]'); if (a) { addSensor(+a.dataset.add); return; } const r = ev.target.closest('[data-rm]'); if (r) removeSensor(r.dataset.rm); });
$('presets').addEventListener('click', ev => { const b = ev.target.closest('[data-preset]'); if (b) { const p = PRESETS[+b.dataset.preset]; loadSet(p.list, `예시 세트: ${p.name} — ${p.desc}`); toast(`${p.name}: ${p.desc}`, 3600); return; } if (ev.target.closest('[data-clear]')) { loadSet([]); toast('센서를 모두 뺐어요'); } });
$('q').addEventListener('input', ev => { query = ev.target.value; renderList(); });
$('avoidBms').addEventListener('click', () => {
  SET.avoidBms = !SET.avoidBms; $('avoidBms').setAttribute('aria-checked', String(SET.avoidBms));
  const list = INST.map(I => [I.s.n, I.linked]); const keep = [];
  INST = [];
  for (const [n, lk] of list) if (!addSensor(n, { batch: true, quiet: true, linked: lk })) keep.push(SENSORS.find(s => s.n === n).name);
  rebuild(); toast(SET.avoidBms ? `BMS가 쓰는 핀을 비웠어요${keep.length ? ` · 핀이 모자라 빠진 센서: ${keep.join(', ')}` : ''}` : '모든 핀을 쓸 수 있어요', 3800);
});
$('cards').addEventListener('click', ev => { const r = ev.target.closest('[data-rm]'); if (r) { removeSensor(r.dataset.rm); return; } const c = ev.target.closest('[data-card]'); if (c) select(c.dataset.card); });
$('cards').addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { const c = ev.target.closest('[data-card]'); if (c) { ev.preventDefault(); select(c.dataset.card); } } });
$('labsvg').addEventListener('click', ev => { const g = ev.target.closest('[data-inst]'); if (g) { select(g.dataset.inst); if (tab !== 'ctrl') { tab = 'ctrl'; renderPanel(); } } });
$('ptabs').addEventListener('click', ev => { const b = ev.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderPanel(); } });
$('play').addEventListener('click', () => { SET.running = !SET.running; $('play').setAttribute('aria-pressed', String(SET.running)); $('play').setAttribute('aria-label', SET.running ? '일시정지' : '재생'); $('play').innerHTML = SET.running ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>'; if (!SET.running) setTone(0); });
$('speed').addEventListener('click', () => { SET.speed = SPEEDS[(SPEEDS.indexOf(SET.speed) + 1) % SPEEDS.length]; $('speed').textContent = `×${SET.speed}`; });
const doReset = () => { if (!TRIP) { toast('지금은 차단 상태가 아니에요'); return; } if (LVL === 3) { toast('위험 조건이 남아 있어 리셋할 수 없어요'); return; } TRIP = false; serialOut('TRIP 리셋 — 출력 모듈이 다시 정상 동작', 'sys'); toast('TRIP 리셋'); };
$('tripReset').addEventListener('click', doReset);
$('sound').addEventListener('click', () => { PREF.sound = !PREF.sound; try { const o = JSON.parse(localStorage.getItem('bms-pref') || '{}'); o.sound = PREF.sound; localStorage.setItem('bms-pref', JSON.stringify(o)); } catch (e) {} $('sound').setAttribute('aria-pressed', String(PREF.sound)); if (PREF.sound) { audio(); if (actx && actx.state === 'suspended') actx.resume(); toast('부저 소리를 스피커로 들려줘요'); } else setTone(0); });
$('clr').addEventListener('click', () => { SER.length = 0; serDirty = true; });
$('csv').addEventListener('click', saveCsv);
$('gen10').addEventListener('click', gen10);
const pb = $('pbody');
pb.addEventListener('input', ev => {
  const t = ev.target, I = sel();
  if (t.id === 'gNoise') { SET.noise = t.value / 100; $('gNoiseV').textContent = `${t.value}%`; return; }
  const k = t.dataset.k; if (!k || !I) return;
  const c = I.s.ctrls.find(x => x.k === k); I.e[k] = +t.value; $('o_' + k).textContent = fmtCtrl(c, I.e[k]);
});
pb.addEventListener('change', ev => {
  const t = ev.target, I = sel(); if (!I) return;
  if (t.id === 'iFault') { I.fault = t.value; I.flo = {}; I.stuck = {}; renderCards(); return; }
  const k = t.dataset.sel; if (k) I.e[k] = t.value;
});
pb.addEventListener('click', ev => {
  const t = ev.target, I = sel();
  if (t.closest('#gAuto')) { SET.auto = !SET.auto; t.closest('#gAuto').setAttribute('aria-checked', String(SET.auto)); if (!SET.auto) INST.forEach(x => { for (const c of x.s.ctrls || []) if (c.t === 'hold') x.e[c.k] = false; x.e.jx = 0; x.e.jy = 0; }); renderPanel(); return; }
  const gf = t.closest('[data-gf]'); if (gf) { SET.filter = gf.dataset.gf; INST.forEach(x => { x.filt = {}; }); renderPanel(); return; }
  if (t.id === 'tripReset2') { doReset(); return; }
  const rm = t.closest('[data-rm]'); if (rm) { removeSensor(rm.dataset.rm); return; }
  if (!I) return;
  if (t.closest('#linkSw')) { I.linked = !I.linked; if (!I.linked) I.e.bms = ''; renderPanel(); renderCards(); save(); return; }
  const tg = t.closest('[data-tg]'); if (tg) { const k = tg.dataset.tg; I.e[k] = !I.e[k]; tg.setAttribute('aria-checked', String(I.e[k])); return; }
  const tp = t.closest('[data-tap]'); if (tp) { const k = '_tap_' + tp.dataset.tap; I.e[k] = (I.e[k] || 0) + 1; return; }
  const ky = t.closest('[data-key]'); if (ky) { I.st.q = I.st.q || []; I.st.q.push(+ky.dataset.key); ky.classList.add('hit'); setTimeout(() => ky.classList.remove('hit'), 150); return; }
  const kn = t.closest('[data-knob]'); if (kn) { I.st.knobQ = I.st.knobQ || []; if (I.st.knobQ.length < 20) I.st.knobQ.push(+kn.dataset.knob); }
});
const holdOn = (el, on) => { const I = sel(); if (!I) return; I.e[el.dataset.hold] = on; el.setAttribute('aria-pressed', String(on)); };
pb.addEventListener('pointerdown', ev => { const h = ev.target.closest('[data-hold]'); if (h) { ev.preventDefault(); h.setPointerCapture && h.setPointerCapture(ev.pointerId); holdOn(h, true); } });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => pb.addEventListener(n, ev => { const h = ev.target.closest('[data-hold]'); if (h) holdOn(h, false); }));
pb.addEventListener('keydown', ev => { const h = ev.target.closest('[data-hold]'); if (h && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); if (!ev.repeat) holdOn(h, true); } });
pb.addEventListener('keyup', ev => { const h = ev.target.closest('[data-hold]'); if (h && (ev.key === ' ' || ev.key === 'Enter')) holdOn(h, false); });

// ───────── 반복 ─────────
let last = performance.now(), acc = 0, uiT = 0, chT = 0;
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000); last = now;
  if (SET.running && INST.length) {
    acc += real * SET.speed; let n = 0;
    while (acc >= DT && n < 600) { stepAll(); acc -= DT; n++; }
    if (n >= 600) acc = 0;
  }
  setTone(Math.max(0, ...INST.map(I => (I.o && I.o.tone) || 0)));
  if (now - uiT > 100) { uiT = now; updateCircuit(); updateCards(); renderStatus(); syncPanel(); flushSerial(); $('tNow').textContent = `${T.toFixed(1)}s`; }
  if (now - chT > 60) { chT = now; drawChart(); }
  requestAnimationFrame(frame);
}

// ───────── 시작 ─────────
(function start() {
  $('sound').setAttribute('aria-pressed', String(PREF.sound));
  let list = null, avoid = false;
  const h = location.hash.slice(1);
  if (h && /^[\d,]+$/.test(h)) list = h.split(',').map(Number).filter(n => n >= 1 && n <= 40).map(n => [n, 1]);
  if (!list) { try { const o = JSON.parse(localStorage.getItem('bms-sandbox') || 'null'); if (o) { list = o.list; avoid = !!o.avoidBms; } } catch (e) {} }
  SET.avoidBms = avoid; $('avoidBms').setAttribute('aria-checked', String(avoid));
  if (list && list.length) {
    for (const [n, lk] of list) addSensor(n, { batch: true, quiet: true, linked: lk === undefined ? undefined : !!lk });
    selId = INST[0] ? INST[0].id : null;
  }
  rebuild(); renderLegend();
  serialOut('가상 실험실 시작 — 센서를 꽂고 빼며 실험해 보세요', 'sys');
  new ResizeObserver(() => drawChart()).observe($('chart'));
  window.__lab = { addSensor, removeSensor, loadSet, get INST() { return INST; }, layoutAll, PRESETS };
  requestAnimationFrame(t => { last = t; frame(t); });
})();
