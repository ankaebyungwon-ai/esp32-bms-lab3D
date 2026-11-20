/* 센서 키트 40종 가상 실습실 — 실험대 엔진과 화면
   흐름: 조작(env) → sim(전기 신호) → 잡음·고장·ADC·필터 → read(예제 코드와 같은 계산) → BMS 판정 → 그래프·시리얼·CSV
   실제 보드: Web Serial로 예제 코드의 '이름:값' 줄을 읽어 같은 화면에 표시 */
import { SENSORS, BOARDS, CATS, IR_KEYS, irName } from './sensors-data.js';
import { modGeom, moduleSvg, updateModuleSvg } from './sensors-draw.js';
import { buildCircuit, circuitSvg, VIEWBOX, holeNice, COLORS, COLOR_KO } from './sensors-circuit.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pad2 = n => String(n).padStart(2, '0');
const DT = 0.05;                 // 시뮬레이션 한 걸음 (초)
const WIN = 60;                  // 그래프 창 (초)
const LOG_MAX = 100000;          // CSV 최대 줄 수
const LV = [{ t: '정상', c: 'var(--lv0)' }, { t: '주의', c: 'var(--lv1)' }, { t: '경고', c: 'var(--lv2)' }, { t: '위험', c: 'var(--lv3)' }];
const SERIES_COLORS = ['#1e3a5c', '#f6c047', '#1f9a78', '#d62f2f'];
const USED_BY_BMS = '34·35·4·26·25·27·14·33·13·18·23·17·16·19';

// ───────── 설정 ─────────
const PREF = { sound: false };
try { Object.assign(PREF, JSON.parse(localStorage.getItem('bms-pref') || '{}')); } catch (e) {}
const savePref = () => { try { const o = JSON.parse(localStorage.getItem('bms-pref') || '{}'); o.sound = PREF.sound; localStorage.setItem('bms-pref', JSON.stringify(o)); } catch (e) {} };
let board = 'esp32';
try { const b = localStorage.getItem('bms-sensor-board'); if (BOARDS[b]) board = b; } catch (e) {}
const SET = { auto: false, noise: 0.3, fault: '', filter: '', speed: 1, running: true };
const SPEEDS = [1, 5, 20];
const TH = {};                   // 사용자가 바꾼 판정 기준 (센서별)
let cur = SENSORS[0];
let R = null;                    // 지금 실험 상태
let tab = 'info';
// 조립 따라하기
let mode = 'build';                 // 'build' = 조립 따라하기, 'run' = 가상 실험
let bstep = 0;                      // 지금 조립 단계
let CIRC = null;                    // 이 센서의 예시 회로
let vizCircuit = false;             // 실험 모드에서 회로로 보기
let PROG = {};
try { PROG = JSON.parse(localStorage.getItem('bms-sensor-build') || '{}'); } catch (e) {}
const prog = n => (PROG[n] = PROG[n] || { at: 0, max: 0, checks: {} });
const saveProg = () => { try { localStorage.setItem('bms-sensor-build', JSON.stringify(PROG)); } catch (e) {} };
const SRC = { real: false, port: null, reader: null, writer: null, closed: null, wclosed: null, t0: 0, lastCmd: '', lastCmdT: 0 };
const LOG = [];

// ───────── 실험 상태 ─────────
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
function newRun(s) {
  return { e: initEnv(s), s: {}, t: 0, nextRead: 0, o: { ch: {} }, r: {}, ev: null, last: {}, lv: 0, msg: '', hits: [], trip: false, flo: {}, stuck: {}, filt: {}, unf: {}, chart: [], lastLine: '', rows: null };
}
function thOf(s, i) { const k = s.key; TH[k] = TH[k] || {}; if (!TH[k][i]) TH[k][i] = (s.rules[i].th || []).slice(); return TH[k][i]; }

// ───────── 전기 신호 → 잡음·고장·ADC ─────────
function adc(v, B) {
  if (B.esp) { // ESP32: 0.075V 아래는 0, 3.1V 위는 4095로 잘림 (11dB 감쇠 기준 근사)
    const raw = v < 0.075 ? 0 : v >= 3.1 ? 4095 : Math.round((v - 0.075) / (3.1 - 0.075) * 4095);
    return { v, raw, mv: Math.max(0, Math.round(Math.min(v, 3.15) * 1000 + gauss() * 3)) };
  }
  const raw = clamp(Math.round(v / 5 * 1023), 0, 1023);
  return { v, raw, mv: raw * 5000 / 1023 };
}
function electrical(run, o, B) {
  const r = { B }, f = SET.fault, s = cur;
  for (const [name, ch] of Object.entries(o.ch || {})) {
    let v = ch.v;
    if (ch.k === 'a') {
      const sd = (s.nz ?? 0.004) * B.vcc * (SET.noise * 2 + (f === 'noise' ? 8 : 0));
      v += gauss() * sd;
      if (f === 'open') { run.flo[name] = clamp((run.flo[name] ?? 0.05 * B.vcc) + gauss() * 0.012 * B.vcc, 0, 0.3 * B.vcc); v = run.flo[name]; }
      if (f === 'short') v = B.vcc;
      if (f === 'stuck') { if (run.stuck[name] == null) run.stuck[name] = v; v = run.stuck[name]; }
      r[name] = adc(clamp(v, 0, B.vcc), B);
    } else if (ch.k === 'd') {
      if (f === 'open') v = ch.pu ? 1 : (Math.random() < 0.5 ? 0 : 1);
      if (f === 'short') v = 1;
      if (f === 'noise' && Math.random() < 0.15) v = 1 - v;
      if (f === 'stuck') { if (run.stuck[name] == null) run.stuck[name] = v; v = run.stuck[name]; }
      r[name] = v;
    } else {
      if (f === 'open') v = o.fx ? o.fx.open : NaN;
      if (f === 'short') v = o.fx ? o.fx.short : NaN;
      if (f === 'stuck') { if (run.stuck[name] == null) run.stuck[name] = v; v = run.stuck[name]; }
      r[name] = v;
    }
  }
  if (f !== 'stuck') run.stuck = {};
  if (f === 'open' || f === 'short') r._fault = true;
  return r;
}
function filtered(run, r) { // 이동평균(10) 또는 EMA(0.2)를 아날로그 채널에 적용
  const out = { ...r };
  for (const [name, a] of Object.entries(r)) {
    if (!a || typeof a !== 'object' || a.raw == null) continue;
    run.unf[name] = a.raw;
    if (!SET.filter) { run.filt[name] = null; continue; }
    let st = run.filt[name];
    if (SET.filter === 'ma') {
      if (!st || !st.buf) st = run.filt[name] = { buf: [] };
      st.buf.push([a.raw, a.mv]); if (st.buf.length > 10) st.buf.shift();
      const n = st.buf.length; out[name] = { ...a, raw: Math.round(st.buf.reduce((p, q) => p + q[0], 0) / n), mv: st.buf.reduce((p, q) => p + q[1], 0) / n };
    } else {
      if (!st || st.raw == null) st = run.filt[name] = { raw: a.raw, mv: a.mv };
      st.raw = 0.2 * a.raw + 0.8 * st.raw; st.mv = 0.2 * a.mv + 0.8 * st.mv;
      out[name] = { ...a, raw: Math.round(st.raw), mv: st.mv };
    }
  }
  return out;
}

// ───────── 한 걸음 ─────────
function step(run, live) {
  const s = cur, B = BOARDS[board];
  if (SET.auto && s.auto) s.auto(run.t, run.e, run.s);
  const noise = SET.fault === 'noise' ? 1 : SET.noise;
  const o = s.sim(run.e, run.s, { B, t: run.t, dt: DT, noise }) || { ch: {} };
  run.o = o; if (o.ev) run.ev = o.ev;
  run.r = electrical(run, o, B);
  run.t = Math.round((run.t + DT) * 1000) / 1000;
  if (run.t + 1e-9 >= run.nextRead) { run.nextRead = Math.round((run.nextRead + s.period / 1000) * 1000) / 1000; doRead(run, live); }
}
function doRead(run, live) {
  const s = cur, B = BOARDS[board];
  if (live && SRC.real && !s.isOut) { run.ev = null; return; }   // 실제 보드 값은 시리얼에서 옴
  const r = filtered(run, run.r); r.B = B;
  const noise = SET.fault === 'noise' ? 1 : SET.noise;
  const ev = run.ev; run.ev = null;
  const out = s.read(r, run.s, { B, t: run.t, dt: s.period / 1000, period: s.period, noise }, ev, run.o) || {};
  absorb(run, out, ev, live, 'sim');
}
function absorb(run, out, ev, live, src) { // 읽은 값 → 판정 → 기록·그래프·시리얼
  const s = cur;
  for (const [k, v] of Object.entries(out)) if (k[0] !== '_') run.last[k] = v;
  const j = judge(s, run.last, run.e); run.lv = j.lv; run.msg = j.msg; run.hits = j.hits;
  if ((s.rules || []).length && j.lv === 3) run.trip = true;
  // 시리얼 줄 (예제 코드와 같은 형식)
  let line = null;
  if (src === 'sim') {
    const keys = (s.prints || Object.keys(out)).filter(k => k[0] !== '_' && out[k] !== undefined);
    const txt = keys.map(k => `${k}:${fmtNum(out[k])}`).join(',');
    if (s.evOnly) line = ev && keys.length && !(ev.garbage) ? txt : null;
    else if (s.isOut) { line = txt !== run.lastLine ? txt : null; }
    else line = txt;
    if (line) run.lastLine = line;
  }
  const row = { t: run.t, ...pickLog(run.last), level: run.lv, trip: run.trip ? 1 : 0, fault: SET.fault || '', src };
  if (run.rows) { run.rows.push(row); return; }
  if (!live) return;
  if (LOG.length < LOG_MAX) LOG.push(row);
  run.chart.push({ t: run.t, v: { ...run.last }, g: { ...run.unf } });
  while (run.chart.length && run.t - run.chart[0].t > WIN) run.chart.shift();
  if (line && !(SRC.real && src === 'sim')) serialOut(line);   // 실제 보드 모드에서는 보드가 보낸 줄만
  dirty.ui = true;
}
const pickLog = o => { const r = {}; for (const [k, v] of Object.entries(o)) if (typeof v === 'number') r[k] = v; return r; };
function fmtNum(v) { if (typeof v !== 'number') return String(v); if (Number.isNaN(v)) return 'nan'; return String(v); }

// ───────── BMS 판정 ─────────
function judge(s, vals, e) {
  let lv = 0, msg = ''; const hits = [];
  (s.rules || []).forEach((ru, i) => {
    const v = vals[ru.k]; hits[i] = 0;
    if (v == null || typeof v !== 'number' || Number.isNaN(v)) return;
    if (ru.skip && ru.skip(v)) return;
    if (ru.when && !ru.when(e)) return;
    let l = 0;
    if (ru.dir === 'flag') l = v === ru.eq ? ru.lv : 0;
    else { const th = thOf(s, i); for (let k = 0; k < 3; k++) { const t = th[k]; if (t == null || t === '' || Number.isNaN(+t)) continue; const ok = ru.dir === 'hi' ? v >= +t : ru.dir === 'lo' ? v <= +t : Math.abs(v) >= +t; if (ok) l = k + 1; } }
    hits[i] = l;
    if (l > lv) { lv = l; msg = ru.dir === 'flag' ? ru.name : `${ru.name} ${fmtShow(v)}${ru.unit ? ' ' + ru.unit : ''}`; }
  });
  return { lv, msg, hits };
}
const fmtShow = v => typeof v !== 'number' ? String(v) : Number.isInteger(v) ? String(v) : (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

function updateModule(o, last) {
  const svg = activeSvg();
  if (!svg.firstChild) return;
  updateModuleSvg(svg, cur, R.e, o, last);
  if (mode === 'run' && vizCircuit) { // 회로의 신호선: HIGH면 빛나고, ESP32 쪽 끝에 값 표시
    svg.querySelectorAll('.it[data-sig]').forEach(g => {
      const [val, c2] = pinValue({ sig: g.dataset.sig });
      g.classList.toggle('hi', c2 === 'hi');
      const t = g.querySelector('.vlab'); if (t) t.textContent = c2 && c2 !== 'hi' && c2 !== 'lo' ? c2 : val;
    });
  }
}
const activeSvg = () => mode === 'build' ? $('circsvg') : $('modsvg');
function makeCircuit(s) {
  const pins = []; moduleSvg(s, { circuit: true, leg: 116, pins });
  const o = s.sim(initEnv(s), {}, { B: BOARDS.esp32, t: 0, dt: DT, noise: 0 }) || {};
  const analog = new Set(Object.entries(o.ch || {}).filter(([, c]) => c.k === 'a').map(([k]) => k));
  return buildCircuit(s, analog, pins);
}
function renderViz() {
  const s = cur, m = $('modsvg');
  if (mode === 'build') {
    m.innerHTML = '';
    $('circsvg').innerHTML = circuitSvg(s, CIRC, { step: bstep, build: true, moduleSvg });
    return;
  }
  $('circsvg').innerHTML = '';
  if (vizCircuit) { m.setAttribute('viewBox', VIEWBOX); m.classList.add('circ'); m.innerHTML = circuitSvg(s, CIRC, { step: Infinity, build: false, moduleSvg }); }
  else { m.setAttribute('viewBox', '0 0 340 210'); m.classList.remove('circ'); m.innerHTML = moduleSvg(s); }
  $('bgrid').classList.toggle('wide', vizCircuit);
  $('vizT').textContent = vizCircuit ? `예시 ESP32 회로 · 실시간 신호${board === 'uno' ? ' (값은 Uno 시뮬레이션)' : ''}` : '모듈';
  $('vizToggle').textContent = vizCircuit ? '모듈로 보기' : '회로로 보기';
}
function renderStrip() {
  const st = CIRC.steps, pr = prog(cur.n);
  $('strip').innerHTML = st.map((x, i) => `<button type="button" class="schip${i === bstep ? ' on' : ''}${i <= pr.max && i !== bstep ? ' done' : ''}" data-st="${i}" aria-current="${i === bstep ? 'step' : 'false'}"><b>${i + 1}</b>${esc(x.short.replace(/^@/, ''))}</button>`).join('');
  $('stPrev').disabled = bstep === 0; $('stNext').disabled = bstep === st.length - 1;
  const on = $('strip').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function goStep(i) {
  const st = CIRC.steps; i = clamp(i, 0, st.length - 1); bstep = i;
  const pr = prog(cur.n); pr.at = i; pr.max = Math.max(pr.max, i); saveProg();
  renderViz(); renderStrip(); if (tab === 'build') renderPanel();
}
function setMode(m, opts = {}) {
  if (m === mode && !opts.force) return;
  mode = m; document.body.dataset.mode = m;
  try { sessionStorage.setItem('bms-sensor-mode', m); } catch (e) {}
  document.querySelectorAll('#modeSeg [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
  if (m === 'build') tab = 'build'; else if (tab === 'build') tab = 'info';
  renderViz(); if (m === 'build') renderStrip(); renderPanel();
}

// ───────── 목록 ─────────
let catFilter = '', query = '';
function renderList() {
  const cats = [['', '전체'], ...Object.entries(CATS).map(([k, v]) => [k, v.name])];
  $('cats').innerHTML = cats.map(([k, n]) => `<button type="button" data-cat="${k}" aria-pressed="${k === catFilter}">${esc(n)}</button>`).join('');
  const q = query.trim().toLowerCase();
  const items = SENSORS.filter(s => (!catFilter || s.cat === catFilter) && (!q || `${s.n} ${s.name} ${s.model} ${s.key}`.toLowerCase().includes(q)));
  $('slist').innerHTML = items.map(s => `<li><button type="button" data-n="${s.n}" class="${s === cur ? 'on' : ''}" aria-current="${s === cur ? 'true' : 'false'}"><span class="no">${pad2(s.n)}</span><span class="nm">${esc(s.name)}${PROG[s.n] && PROG[s.n].done ? '<span class="ok" title="조립 완료">✓</span>' : ''}<small>${esc(s.model)}</small></span><span class="ctag ${s.cat}">${CATS[s.cat].tag}</span></button></li>`).join('') || '<li style="padding:10px;color:var(--muted);font-size:13px">찾는 센서가 없어요</li>';
  $('listSel').innerHTML = SENSORS.map(s => `<option value="${s.n}"${s === cur ? ' selected' : ''}>${pad2(s.n)} · ${esc(s.name)} (${esc(s.model)})</option>`).join('');
}

// ───────── 조작부 ─────────
function fmtCtrl(c, v) { if (c.log) { const lux = 10 ** v; return lux >= 100 ? `${Math.round(lux)} ${c.unit}` : `${lux.toFixed(1)} ${c.unit}`; } return `${Number.isInteger(c.step) ? Math.round(v) : (+v).toFixed(1)}${c.unit ? ' ' + c.unit : ''}`; }
function renderCtrls() {
  const s = cur, e = R.e;
  const html = (s.ctrls || []).map(c => {
    if (c.t === 'range') return `<div class="crow"><div class="cl"><label for="c_${c.k}">${esc(c.label)}</label><output id="o_${c.k}">${esc(fmtCtrl(c, e[c.k]))}</output></div><input type="range" id="c_${c.k}" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="${e[c.k]}"></div>`;
    if (c.t === 'toggle') return `<div class="swrow"><span id="l_${c.k}">${esc(c.label)}</span><button type="button" class="switch" role="switch" data-tg="${c.k}" aria-checked="${!!e[c.k]}" aria-labelledby="l_${c.k}"><i></i></button></div>`;
    if (c.t === 'select') return `<div class="crow"><div class="cl"><label for="c_${c.k}">${esc(c.label)}</label></div><select class="sel" id="c_${c.k}" data-sel="${c.k}">${c.opts.map(([v, n]) => `<option value="${esc(v)}"${String(e[c.k]) === String(v) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    return '';
  }).join('');
  const holds = (s.ctrls || []).filter(c => c.t === 'hold' || c.t === 'tap');
  const hb = holds.length ? `<div class="btnrow">${holds.map(c => `<button type="button" class="hbtn${c.t === 'tap' ? ' y' : ''}" ${c.t === 'hold' ? `data-hold="${c.k}" aria-pressed="false"` : `data-tap="${c.k}"`}>${esc(c.label)}${c.t === 'hold' ? ' <small style="opacity:.75;font-weight:500">(누르고 있기)</small>' : ''}</button>`).join('')}</div>` : '';
  const kp = (s.ctrls || []).find(c => c.t === 'keypad') ? `<div class="cl" style="font-weight:600;font-size:13px">${esc(s.ctrls.find(c => c.t === 'keypad').label)} <small style="color:var(--faint)">NEC 주소 0x00</small></div><div class="keypad">${IR_KEYS.map(([n, c]) => `<button type="button" data-key="${c}" title="명령 ${c} (0x${c.toString(16).toUpperCase().padStart(2, '0')})">${esc(n)}</button>`).join('')}</div>` : '';
  const pad = (s.ctrls || []).find(c => c.t === 'pad') ? `<div class="pad" id="pad" role="slider" aria-label="조이스틱" tabindex="0"><i id="padCap"></i></div>` : '';
  const knob = (s.ctrls || []).find(c => c.t === 'knob') ? `<div class="knob"><button type="button" class="hbtn" data-knob="-1" aria-label="반시계 방향 한 칸">◀ 반시계</button><div class="dial" id="dial" aria-hidden="true"></div><button type="button" class="hbtn" data-knob="1" aria-label="시계 방향 한 칸">시계 ▶</button></div>` : '';
  $('ctrls').innerHTML = pad + knob + kp + html + hb;
  $('ctrlTitle').innerHTML = s.isOut ? '출력 조작 <small>코드가 보내는 명령</small>' : '환경 조작 <small>센서가 느끼는 세상</small>';
  $('autoLabel').textContent = s.isOut ? '데모 동작 (예제 코드의 데모와 같음)' : '자동 시나리오 (조작을 자동으로)';
  document.querySelectorAll('.inonly').forEach(el => { el.hidden = !!s.isOut; });
  const hasA = s.pins.some(p => p.sig) && Object.values((cur.sim(initEnv(cur), {}, { B: BOARDS[board], t: 0, dt: DT, noise: 0 }) || {}).ch || {}).some(c => c.k === 'a');
  document.querySelectorAll('.anonly').forEach(el => { el.hidden = !hasA || !!s.isOut; });
  bindPad();
}
function syncCtrls() { // 자동 시나리오가 바꾼 값을 조작부에 반영
  const e = R.e;
  for (const c of cur.ctrls || []) {
    if (c.t === 'range') { const el = $('c_' + c.k); if (el && document.activeElement !== el) { el.value = e[c.k]; $('o_' + c.k).textContent = fmtCtrl(c, e[c.k]); } }
    else if (c.t === 'toggle') { const el = document.querySelector(`[data-tg="${c.k}"]`); if (el) el.setAttribute('aria-checked', String(!!e[c.k])); }
    else if (c.t === 'select') { const el = $('c_' + c.k); if (el && document.activeElement !== el && el.value !== String(e[c.k])) el.value = String(e[c.k]); }
    else if (c.t === 'hold') { const el = document.querySelector(`[data-hold="${c.k}"]`); if (el) el.setAttribute('aria-pressed', String(!!e[c.k])); }
  }
  const cap = $('padCap'); if (cap) { cap.style.left = `${52 + (e.jx || 0) * 50}px`; cap.style.top = `${52 + (e.jy || 0) * 50}px`; }
  const dial = $('dial'); if (dial) dial.style.transform = `rotate(${(R.last.count || 0) * 18}deg)`;
}
function bindPad() {
  const pad = $('pad'); if (!pad) return;
  let drag = false;
  const move = ev => { const r = pad.getBoundingClientRect(); let x = (ev.clientX - r.left - r.width / 2) / (r.width / 2 - 23), y = (ev.clientY - r.top - r.height / 2) / (r.height / 2 - 23); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } R.e.jx = x; R.e.jy = y; };
  pad.addEventListener('pointerdown', ev => { drag = true; pad.setPointerCapture(ev.pointerId); move(ev); });
  pad.addEventListener('pointermove', ev => { if (drag) move(ev); });
  const up = () => { drag = false; if (!SET.auto) { R.e.jx = 0; R.e.jy = 0; } };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  pad.addEventListener('keydown', ev => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key]; if (d) { ev.preventDefault(); R.e.jx = d[0]; R.e.jy = d[1]; } });
  pad.addEventListener('keyup', () => { R.e.jx = 0; R.e.jy = 0; });
}

// ───────── 값 타일·핀 상태 ─────────
function renderTiles() {
  const s = cur, L = R.last;
  const lvTile = (s.rules || []).length ? `<div class="tile lvt"><small>BMS 판정</small><b><span class="lv lv${R.trip ? 4 : R.lv}">${R.trip ? 'TRIP' : LV[R.lv].t}</span></b></div>` : '';
  $('tiles').innerHTML = s.show.map(t => {
    let v = L[t.k], txt;
    if (v == null) txt = '—';
    else if (t.bool) txt = t.bool[v ? 1 : 0];
    else if (t.ir) txt = v < 0 ? '—' : `${v} <span>[${esc(irName(v))}] 0x${v.toString(16).toUpperCase().padStart(2, '0')}</span>`;
    else if (typeof v === 'number' && Number.isNaN(v)) txt = 'NaN';
    else if (t.neg && v < 0) txt = t.neg;
    else txt = typeof v === 'number' && t.dp != null ? v.toFixed(t.dp) : esc(v);
    return `<div class="tile"><small>${esc(t.label)}</small><b${t.bool ? ' style="font-size:16px"' : ''}>${txt}</b>${!t.bool && !t.ir && t.unit && v != null && !(t.neg && v < 0) ? `<span>${esc(t.unit)}</span>` : ''}</div>`;
  }).join('') + lvTile;
}
function pinValue(p) {
  const r = R.r || {}, B = BOARDS[board], L = R.last, v = (R.o && R.o.vis) || {};
  const sig = p.sig;
  if (SRC.real && !cur.isOut) return ['실측', ''];
  if (r[sig] != null && typeof r[sig] === 'object' && r[sig].raw != null) return [`${r[sig].raw}`, `${(r[sig].mv / 1000).toFixed(2)}V`];
  if (sig !== 'B' && r[sig] != null && typeof r[sig] === 'number') return [r[sig] ? 'HIGH' : 'LOW', r[sig] ? 'hi' : 'lo'];
  if (cur.key === 'ultrasonic') return sig === 'ECHO' ? [`${r.echo || 0}µs`, ''] : ['10µs', ''];
  if (cur.key === 'ds18b20') return ['1-Wire', ''];
  if (cur.key === 'dht11') return ['단선 통신', ''];
  if (v.rgb && ['R', 'G', 'B'].includes(sig)) { const n = v.rgb['RGB'.indexOf(sig)]; return [`PWM ${n}`, n ? 'hi' : 'lo']; }
  if (cur.key === 'magiccup' && (sig === 'LA' || sig === 'LB')) return [`PWM ${sig === 'LA' ? v.la : v.lb}`, ''];
  if (cur.isOut) { const k = Object.keys(L)[0]; const on = cur.key === 'passivebuzzer' ? (L.freq > 0) : cur.key === 'irtx' ? !!v.ir : !!L[k]; return [cur.key === 'passivebuzzer' ? (L.freq ? `${L.freq}Hz` : 'LOW') : on ? 'HIGH' : 'LOW', on ? 'hi' : 'lo']; }
  return ['—', ''];
}
function renderPins() {
  const B = BOARDS[board];
  $('pinChips').innerHTML = cur.pins.filter(p => p.sig).map(p => { const [val, cls] = pinValue(p); const pin = B.esp ? p.esp : p.uno; return `<span class="pchip"><b>${esc(p.mod)}</b><span class="pp">${esc(pin)}</span><span class="pv ${cls === 'hi' ? 'hi' : cls === 'lo' ? 'lo' : ''}">${esc(val)}</span>${cls && cls !== 'hi' && cls !== 'lo' ? `<span class="pp">${esc(cls)}</span>` : ''}</span>`; }).join('');
}
function renderStatus() {
  const s = cur, st = $('bStatus');
  let t, c;
  if (s.isOut) { t = '출력 모듈'; c = 'var(--navy)'; }
  else if (!(s.rules || []).length) { t = '판정 없음'; c = 'var(--faint)'; }
  else if (R.trip) { t = `TRIP · ${R.lv ? LV[R.lv].t : '리셋 대기'}`; c = 'var(--trip)'; }
  else { t = LV[R.lv].t + (R.msg ? ` · ${R.msg}` : ''); c = LV[R.lv].c; }
  st.style.setProperty('--c', c); $('bLv').textContent = t;
  $('bSrc').classList.toggle('live', SRC.real); $('bSrcT').textContent = SRC.real ? '실제 보드' : '시뮬레이터';
}

// ───────── 그래프 ─────────
function drawChart() {
  const cv = $('chart'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (!W) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const pl = 6, pr = 6, pt = 8, pb = 16, w = W - pl - pr, h = H - pt - pb;
  g.strokeStyle = '#ebe6da'; g.lineWidth = 1; g.font = '10px JetBrains Mono, monospace'; g.fillStyle = '#8a8d96';
  for (let i = 0; i <= 4; i++) { const y = pt + h * i / 4; g.beginPath(); g.moveTo(pl, y); g.lineTo(pl + w, y); g.stroke(); }
  const data = R.chart, tEnd = data.length ? data[data.length - 1].t : 0, t0 = Math.max(0, tEnd - WIN), span = Math.max(WIN, 1);
  for (let s = 0; s <= 60; s += 10) { const x = pl + w * (s / 60); g.fillText(`-${60 - s}s`, Math.min(x, pl + w - 26), H - 3); }
  const X = t => pl + w * ((t - (tEnd - span)) / span);
  const B = BOARDS[board];
  cur.plot.forEach((p, i) => {
    let mn = p.min, mx = p.max;
    if (mx === 'adc') mx = B.adcMax; if (mn === 'adc') mn = 0;
    if (mn === 'auto' || mx === 'auto') { const vs = data.map(d => d.v[p.k]).filter(v => typeof v === 'number' && !Number.isNaN(v)); const a = vs.length ? Math.min(...vs) : 0, b = vs.length ? Math.max(...vs) : 1; const pad = Math.max(2, (b - a) * 0.15); mn = a - pad; mx = b + pad; }
    p._r = [mn, mx];
    const Y = v => pt + h * (1 - (v - mn) / ((mx - mn) || 1));
    if (p.ghost && SET.filter) { g.strokeStyle = '#c9c2ad'; g.lineWidth = 1; g.beginPath(); let f = true; for (const d of data) { const v = d.g[p.ghost]; if (v == null) continue; const yy = clamp(Y(v), pt, pt + h); f ? g.moveTo(X(d.t), yy) : g.lineTo(X(d.t), yy); f = false; } g.stroke(); }
    g.strokeStyle = p.color || SERIES_COLORS[i % 4]; g.lineWidth = 2; g.beginPath(); let first = true, py = 0;
    for (const d of data) {
      const v = d.v[p.k]; if (typeof v !== 'number' || Number.isNaN(v)) { first = true; continue; }
      const x = X(d.t), y = clamp(Y(v), pt, pt + h);
      if (first) { g.moveTo(x, y); first = false; } else { if (p.step) g.lineTo(x, py); g.lineTo(x, y); }
      py = y;
    }
    g.stroke();
  });
  // 판정 기준선 (첫 번째 그래프 항목에 해당하는 규칙)
  const p0 = cur.plot[0], ri = (cur.rules || []).findIndex(r => r.k === p0.k && r.dir !== 'flag');
  if (ri >= 0 && p0._r) { const th = thOf(cur, ri); const [mn, mx] = p0._r; th.forEach((t, k) => { if (t == null || t === '') return; const vv = [+t]; if (cur.rules[ri].dir === 'abs') vv.push(-t); vv.forEach(v => { const y = pt + h * (1 - (v - mn) / ((mx - mn) || 1)); if (y < pt || y > pt + h) return; g.strokeStyle = ['#e6b800', '#f07f12', '#d62f2f'][k]; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(pl, y); g.lineTo(pl + w, y); g.stroke(); g.setLineDash([]); }); }); }
  if (!data.length) { g.fillStyle = '#8a8d96'; g.font = '13px Roboto Condensed, sans-serif'; g.fillText(SRC.real ? '보드에서 데이터를 기다리는 중…' : '데이터를 모으는 중…', pl + 10, pt + 20); }
}
function renderLegend() {
  const B = BOARDS[board];
  const rng = p => { const mn = p.min === 'auto' ? '' : p.min, mx = p.max === 'adc' ? B.adcMax : p.max === 'auto' ? '' : p.max; if (p.step) return ''; return mn === '' ? '자동 범위' : `${mn}–${mx}${p.unit ? ' ' + p.unit : ''}`; };
  $('legend').innerHTML = cur.plot.map((p, i) => `<span><i style="background:${p.color || SERIES_COLORS[i % 4]}"></i>${esc(p.label)} <span class="mono" style="color:var(--faint)">${esc(rng(p))}</span></span>`).join('') + (cur.plot.some(p => p.ghost) ? '<span><i style="background:#c9c2ad"></i>필터 전 (필터를 켜면 표시)</span>' : '') + `<span class="r">최근 60초 · ${SRC.real ? 'LIVE' : 'SIM'}</span>`;
}

// ───────── 시리얼 모니터 ─────────
const SER = [];
let serDirty = false;
function serialOut(line, cls) {
  const ts = SRC.real ? ((performance.now() - SRC.t0) / 1000).toFixed(2) : R.t.toFixed(2);
  SER.push(cls ? `<span class="${cls}">${esc(line)}</span>` : `<span class="sys">${ts.padStart(7)} → </span>${esc(line)}`);
  if (SER.length > 300) SER.splice(0, SER.length - 300);
  serDirty = true;
}
function flushSerial() {
  if (!serDirty) return; serDirty = false;
  const pre = $('serial'), atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 30;
  pre.innerHTML = SER.join('\n');
  if (atBottom) pre.scrollTop = pre.scrollHeight;
  $('logInfo').textContent = `기록 ${LOG.length.toLocaleString()}줄${LOG.length >= LOG_MAX ? ' (최대)' : ''} · ${cur.period >= 1000 ? (cur.period / 1000) + '초' : cur.period + 'ms'}마다`;
}

// ───────── 오른쪽 패널 ─────────
function hl(src) {
  return src.split('\n').map(line => {
    const ci = line.indexOf('//');
    let code = ci >= 0 ? line.slice(0, ci) : line; const com = ci >= 0 ? line.slice(ci) : '';
    code = esc(code).replace(/(&quot;.*?&quot;)/g, '\u0001$1\u0002').replace(/\b(\d+(\.\d+)?)\b/g, '<span class="n">$1</span>')
      .replace(/(#include|#define|\bvoid\b|\bfloat\b|\bint\b|\blong\b|\bunsigned\b|\bconst\b|\bstatic\b|\bvolatile\b|\bif\b|\belse\b|\bfor\b|\bwhile\b|\breturn\b|\bbool\b|\buint8_t\b|\buint16_t\b|\buint32_t\b|\btrue\b|\bfalse\b|\bIRAM_ATTR\b)/g, '<span class="k">$1</span>')
      .replace(/\u0001(.*?)\u0002/g, (m, a) => `<span class="p">${a.replace(/<[^>]+>/g, '')}</span>`);
    return code + (com ? `<span class="c">${esc(com)}</span>` : '');
  }).join('\n');
}
function buildHtml() {
  const s = cur, st = CIRC.steps[bstep], pr = prog(s.n), n = CIRC.steps.length;
  const its = CIRC.items.filter(i => i.step === bstep);
  const cat = /단계$/.test(st.kicker) ? (st.key === 'module' ? '부품 꽂기' : st.key === 'base' ? '전원' : '배선') : st.kicker;
  let h = `<div class="kick">${bstep + 1}/${n} 단계 · ${esc(cat)}${board === 'uno' ? ' · 예시 회로는 ESP32 기준' : ''}</div><h3 style="margin-top:4px;font-size:18px;color:var(--ink);text-transform:none;letter-spacing:.2px">${esc(st.title)}</h3><p class="desc">${esc(st.desc)}</p>`;
  if (st.bom) h += `<table class="bom"><thead><tr><th>부품</th><th>수량</th><th>메모</th></tr></thead><tbody>${st.bom.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>`;
  if (st.key === 'module') h += `<ul class="wl">${CIRC.pins.slice().sort((a, b) => b.row - a.row).map(p => `<li><span class="sw" style="background:#d6b04d"></span><span><b>${esc((p.grp ? p.grp + ' ' : '') + p.mod.replace(/ \(.+\)/, '').replace(/^[AB]: /, ''))}</b> → ${esc(holeNice(p.hole))}${p.net === null ? ' <span class="kind">(연결 안 함)</span>' : ''}</span></li>`).join('')}</ul>`;
  else if (its.length && st.key !== 'module') h += `<ul class="wl">${its.map(it => it.t === 'wire'
    ? `<li><span class="sw" style="background:${COLORS[it.net]}"></span><span><b>${esc(COLOR_KO[it.net])} 선</b>${it.pin ? ` · ${esc(it.pin.replace(/ \(.+\)/, ''))} 핀` : ''}<br>${esc(holeNice(it.from))} → ${esc(holeNice(it.to))}</span></li>`
    : `<li><span class="sw" style="background:#e2cf9f"></span><span><b>저항 ${esc(it.val === '10k' ? '10kΩ' : it.val + 'Ω')}</b> · ${esc(it.role)}<br>${esc(holeNice(it.a))} ↔ ${esc(holeNice(it.b))}</span></li>`).join('')}</ul>`;
  if (st.checks) h += `<ul class="checks" style="margin-top:8px">${st.checks.map((c, i) => `<li><label><input type="checkbox" data-ck="${i}"${pr.checks[i] ? ' checked' : ''}><span>${esc(c)}</span></label></li>`).join('')}</ul>`;
  if (st.key === 'code') h += `<p class="desc">보드: ESP32 Dev Module · 시리얼 115200 baud${s.libs ? ` · 라이브러리: ${s.libs.map(l => esc(l.q)).join(', ')}` : ' · 라이브러리 필요 없음'}</p><button type="button" class="ybtn sm" id="goCode">코드 탭 열기</button>`;
  if (st.key === 'run') h += `<p class="desc">가상 실험에서 <b>회로로 보기</b>를 누르면 이 회로 위에 신호가 실시간으로 표시돼요 (HIGH인 선이 빛남, 아날로그 선 끝에 전압).</p><button type="button" class="ybtn" id="goRun">⚡ 가상 실험 시작</button>`;
  if (CIRC.conflict.length && st.key === 'prep') h += `<div class="note">이 회로의 ${CIRC.conflict.join(', ')}은(는) BMS 보드도 쓰는 핀이에요.</div>`;
  if (st.tips && st.tips.length) h += `<h3>도움말</h3><ul class="tips">${st.tips.map((t, i) => `<li class="${(st.warn || []).includes(i) ? 'warn' : ''}">${esc(t)}</li>`).join('')}</ul>`;
  h += `<div class="stnav"><button type="button" class="ghostbtn" id="bPrev"${bstep === 0 ? ' disabled' : ''}>← 이전</button>${bstep < n - 1 ? `<button type="button" class="ybtn sm" id="bNext">다음: ${esc(CIRC.steps[bstep + 1].short.replace(/^@/, ''))} →</button>` : ''}</div>
  <p class="desc" style="margin-top:10px;font-size:12px;color:var(--faint)">키보드 <span class="kbd">←</span><span class="kbd">→</span> 로 단계를 넘길 수 있어요. 진행 상황은 이 브라우저에 저장돼요.</p>`;
  return h;
}
function infoHtml() {
  const s = cur;
  return `<h3>어떤 센서인가요</h3><p class="desc">${esc(s.desc)}</p>
  <ul class="tips">${s.spec.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <div class="note use"><b>BMS에서 쓰는 법</b><br>${esc(s.use)}</div>
  ${(s.notes || []).length ? `<h3>주의</h3><ul class="tips">${s.notes.map(x => `<li class="${/금지|위험|절대|비추지|깨지|수은|220V|손상/.test(x) ? 'warn' : ''}">${esc(x)}</li>`).join('')}</ul>` : ''}
  <h3>이렇게 실험해 보세요</h3><ol class="nums">${tryList(s).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
  <h3>안 될 때 확인할 것</h3><ul class="tips">${debugList(s).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}
function tryList(s) {
  const L = [];
  if (s.isOut) { L.push('조작부에서 값을 바꾸면 모듈 그림과 시리얼에 바로 반영돼요.'); if ((s.ctrls || []).some(c => c.k === 'bms')) L.push('"BMS 단계 따라가기"를 정상→위험→TRIP으로 바꿔 BMS 보드의 표시와 비교해 보세요.'); L.push('데모 동작을 켜면 예제 코드를 처음 올렸을 때와 같은 동작을 해요.'); }
  else {
    L.push('자동 시나리오를 켜고 그래프와 BMS 판정이 바뀌는 순간을 관찰해 보세요.');
    L.push('잡음을 80% 이상으로 올린 뒤 ADC 필터(이동평균·EMA)를 바꿔 가며 그래프를 비교해 보세요.'.replace('ADC 필터(이동평균·EMA)를', s.plot.some(p => p.ghost) ? 'ADC 필터(이동평균·EMA)를' : '판정이 흔들리는지'));
    L.push('고장 주입에서 단선·단락을 골라 예제 코드가 어떤 값을 내는지, 판정이 어떻게 반응하는지 확인해 보세요.');
    L.push('"가상 데이터 10분 바로 만들기"로 CSV를 받아 엑셀에서 그래프를 그려 보세요.');
  }
  return L;
}
function debugList(s) {
  const B = BOARDS[board], L = ['GND를 보드와 공통으로 연결했는지', `시리얼 모니터 속도가 ${B.baud} baud인지`];
  if (s.cat === 'ain' || s.cat === 'cmp') L.push(B.esp ? '아날로그 핀이 ADC1(GPIO32~39)인지 — ADC2 핀은 Wi-Fi를 켜면 못 읽어요' : '아날로그 핀 A0와 디지털 D0를 헷갈리지 않았는지');
  if (s.cat === 'cmp') L.push('DO가 안 바뀌면 파란 가변저항을 천천히 돌려 기준을 맞춰 보세요 (모듈 L1 LED가 기준).');
  if (s.cat === 'din') L.push('값이 0과 1 사이에서 떠다니면 풀업이 없는 것 — INPUT_PULLUP으로 바꿔 보세요.');
  if (s.libs) L.push(`라이브러리 설치: ${s.libs.map(l => l.name).join(', ')}`);
  if (s.isOut) L.push('LED가 안 켜지면 극성(긴 다리 +)과 직렬 저항을 확인하세요.');
  if (B.esp) L.push('5V 출력 모듈은 ESP32 입력 핀에 바로 연결하지 말고 분배기로 3.3V 이하로 낮추세요.');
  return L;
}
function wireHtml() {
  const s = cur, B = BOARDS[board];
  return `<h3>핀 연결 <small style="text-transform:none;font-family:var(--f-ui);letter-spacing:0;color:var(--faint)">Uno = 키트 매뉴얼 · ESP32 = BMS 보드에 추가</small></h3>
  <table><thead><tr><th>모듈 핀</th><th class="${B.esp ? '' : 'cur'}">Uno</th><th class="${B.esp ? 'cur' : ''}">ESP32</th><th>비고</th></tr></thead><tbody>
  ${s.pins.map(p => `<tr><td class="pin">${esc(p.mod)}</td><td class="pin ${B.esp ? '' : 'cur'}">${esc(p.uno)}</td><td class="pin ${B.esp ? 'cur' : ''}">${esc(p.esp)}</td><td>${esc(p.note || '')}</td></tr>`).join('')}
  </tbody></table>
  <div class="note"><b>ESP32 핀을 고른 기준</b><br>BMS 보드가 이미 쓰는 GPIO ${USED_BY_BMS}와 겹치지 않게, 비어 있는 GPIO36(SVP)·39(SVN)·32(아날로그 ADC1)와 21·22·5(디지털)를 썼어요. ${s.key === 'ds18b20' ? '이 센서는 BMS 온도센서와 같은 GPIO4 1-Wire 버스에 함께 달 수 있어요.' : ''}모듈 전원은 ESP32 입력이 3.3V를 넘지 않도록 3V3에 연결하는 것이 기본이에요.</div>
  <h3>브레드보드 배선표 <small style="text-transform:none;font-family:var(--f-ui);letter-spacing:0;color:var(--faint)">예시 ESP32 회로</small></h3>
  <table><thead><tr><th>단계</th><th>선·부품</th><th>시작 → 끝</th></tr></thead><tbody>
  <tr><td class="pin">2</td><td>모듈</td><td>위 보드 E${CIRC.rmax}~E${CIRC.rmin}</td></tr>
  ${CIRC.items.filter(i => i.t !== 'module').map(it => `<tr><td class="pin">${it.step + 1}</td><td>${it.t === 'wire' ? `<span class="sw" style="display:inline-block;width:14px;height:5px;border-radius:2px;background:${COLORS[it.net]};vertical-align:middle;margin-right:4px"></span>${esc(COLOR_KO[it.net])}` : `저항 ${esc(it.val === '10k' ? '10kΩ' : it.val + 'Ω')}`}</td><td>${esc(holeNice(it.t === 'wire' ? it.from : it.a))} → ${esc(holeNice(it.t === 'wire' ? it.to : it.b))}</td></tr>`).join('')}
  </tbody></table>
  <h3>라이브러리</h3>${s.libs ? `<ul class="tips">${s.libs.map(l => `<li><b>${esc(l.name)}</b> — 라이브러리 매니저에서 <span class="hole">${esc(l.q)}</span> 검색 후 설치</li>`).join('')}</ul>` : '<p class="desc">별도 라이브러리 불필요 (기본 함수만 사용)</p>'}
  <h3>연결 순서</h3><ol class="nums"><li>USB를 뺀 상태에서 연결합니다.</li><li>GND(-)를 먼저, 그다음 전원(+)을 연결합니다.</li><li>신호선을 표의 ${B.name} 핀에 연결합니다.</li><li>코드 탭의 예제를 올리고 시리얼 모니터를 ${B.baud} baud로 엽니다.</li></ol>`;
}
let codeBoard = null;
function codeHtml() {
  const s = cur, B = BOARDS[codeBoard || board], src = s.code(s, B);
  const ok = 'serial' in navigator;
  return `<p class="desc">예제 코드는 시뮬레이터와 같은 계산을 하고, 같은 <span class="mono">이름:값</span> 형식으로 출력해요. 실험대의 <b>실제 보드 연결</b>로 같은 그래프를 볼 수 있어요.</p>
  <ol class="nums"><li>보드 선택: ${B.esp ? 'ESP32 Dev Module (esp32 by Espressif)' : 'Arduino Uno'}</li><li>${s.libs ? `라이브러리 설치: ${s.libs.map(l => esc(l.q)).join(', ')}` : '라이브러리 설치 필요 없음'}</li><li>업로드 후 Arduino IDE 시리얼 모니터 또는 시리얼 플로터를 ${B.baud} baud로 열기</li>${ok ? '<li>웹으로 보려면 IDE 시리얼 모니터를 닫고 실험대의 <b>실제 보드 연결</b></li>' : ''}</ol>
  <div class="term code codeterm"><div class="ttabs" role="tablist">${Object.values(BOARDS).map(b => `<button role="tab" type="button" data-cb="${b.id}" aria-selected="${b.id === B.id}">${b.name}</button>`).join('')}</div><pre tabindex="0">${hl(src)}</pre>
  <div class="tfoot"><span class="mono">${esc(fileName(s, B))}</span><span style="display:flex;gap:6px"><button class="mini" id="copyCode" type="button">코드 복사</button><button class="mini y" id="dlCode" type="button">.ino 내려받기</button></span></div></div>`;
}
const fileName = (s, B) => `KIT${pad2(s.n)}_${s.key}_${B.id}.ino`;
function bmsHtml() {
  const s = cur;
  if (s.isOut) return `<h3>BMS와의 관계</h3><p class="desc">${esc(s.use)}</p>${(s.ctrls || []).some(c => c.k === 'bms') ? `<div class="note">조작부의 <b>BMS 단계 따라가기</b>를 고르면 이 모듈이 BMS 보드처럼 반응해요.<br><span class="lv lv0">정상</span> <span class="lv lv1">주의</span> <span class="lv lv2">경고</span> <span class="lv lv3">위험</span> <span class="lv lv4">TRIP</span></div>` : ''}<h3>판정</h3><p class="desc">출력 모듈이라 판정하지 않아요. 판정은 입력 센서가 하고, 그 결과를 이 모듈로 보여 주거나(LED·부저) 실행합니다(릴레이).</p>`;
  if (!(s.rules || []).length) return `<h3>판정</h3><p class="desc">이 모듈은 위험을 직접 감지하지 않아 판정 규칙이 없어요. BMS에서는 조작·입력 장치로 씁니다.</p><div class="note use"><b>BMS에서 쓰는 법</b><br>${esc(s.use)}</div>`;
  const rows = s.rules.map((ru, i) => {
    const th = thOf(s, i);
    const cell = k => ru.dir === 'flag' ? (ru.lv === k + 1 ? `<span class="lv lv${k + 1}">${ru.eq === 1 ? '감지' : ru.eq}</span>` : '<span class="kind">–</span>') : th[k] == null ? '<span class="kind">–</span>' : `<input class="thin" type="number" step="any" value="${th[k]}" data-rule="${i}" data-lvl="${k}" aria-label="${esc(ru.name)} ${LV[k + 1].t} 기준">`;
    const op = ru.dir === 'hi' ? '이상' : ru.dir === 'lo' ? '이하' : ru.dir === 'abs' ? '|값| 이상' : '';
    return `<tr class="rule" data-ri="${i}"><td><b>${esc(ru.name)}</b><br><span class="kind">${esc(ru.k)}${ru.unit ? ' · ' + esc(ru.unit) : ''} ${op}</span></td><td>${cell(0)}</td><td>${cell(1)}</td><td>${cell(2)}</td><td class="mono" data-cur="${i}">—</td></tr>`;
  }).join('');
  return `<h3>보호 동작</h3><div class="tripbox"><span class="relayic" id="relayIc"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" aria-hidden="true"><path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg></span><div class="big"><b id="tripT">부하 연결</b><span id="tripS">위험 단계가 되면 가상 릴레이를 끊고 래치합니다</span></div><button type="button" class="ybtn sm" id="tripReset">TRIP 리셋</button></div>
  <h3>판정 기준 <small style="text-transform:none;font-family:var(--f-ui);letter-spacing:0;color:var(--faint)">숫자를 바꿔 보세요</small></h3>
  <table><thead><tr><th>항목</th><th><span class="lv lv1">주의</span></th><th><span class="lv lv2">경고</span></th><th><span class="lv lv3">위험</span></th><th>현재</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="note">항목마다 단계를 정하고 <b>가장 나쁜 항목의 단계</b>가 전체 상태가 됩니다. 위험이 되면 BMS 펌웨어처럼 차단(TRIP) 후 <b>래치</b> — 조건이 사라져도 사람이 리셋할 때까지 유지돼요. 위험 조건이 남아 있으면 리셋이 거부됩니다.</div>
  <p class="desc" style="margin-top:10px"><button type="button" class="ghostbtn" id="thReset">기준값 처음대로</button></p>`;
}
function renderPanel() {
  const s = cur;
  $('pnum').textContent = pad2(s.n);
  $('pkick').textContent = `${CATS[s.cat].name} · ${s.model} · ${s.n}/40`;
  $('ptitle').textContent = s.name;
  document.querySelectorAll('#ptabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('pbody').innerHTML = tab === 'build' ? buildHtml() : tab === 'info' ? infoHtml() : tab === 'wire' ? wireHtml() : tab === 'code' ? codeHtml() : bmsHtml();
  $('pbody').scrollTop = 0;
  updateBmsLive();
}
function updateBmsLive() {
  if (tab !== 'bms' || !(cur.rules || []).length || cur.isOut) return;
  cur.rules.forEach((ru, i) => {
    const el = document.querySelector(`[data-cur="${i}"]`); if (!el) return;
    const v = R.last[ru.k]; el.textContent = v == null ? '—' : fmtShow(v);
    const tr = el.closest('tr'), l = R.hits[i] || 0; tr.classList.toggle('hit', l > 0); tr.style.setProperty('--c', l ? LV[l].c : 'transparent');
  });
  const ic = $('relayIc'); if (!ic) return;
  ic.style.setProperty('--c', R.trip ? 'var(--trip)' : LV[R.lv].c);
  $('tripT').textContent = R.trip ? 'TRIP · 부하 차단 (래치)' : `부하 연결 · ${LV[R.lv].t}`;
  $('tripS').textContent = R.trip ? (R.lv === 3 ? '위험 조건이 아직 남아 있어요' : '원인을 확인했다면 리셋하세요') : (R.msg || '모든 항목이 정상 범위예요');
}

// ───────── 센서 고르기·초기화 ─────────
function selectSensor(n, opts = {}) {
  const s = SENSORS.find(x => x.n === +n); if (!s) return;
  if (SRC.real && s !== cur) disconnect();
  cur = s; R = newRun(s); LOG.length = 0; SER.length = 0; serDirty = true;
  CIRC = makeCircuit(s); bstep = clamp(prog(s.n).at || 0, 0, CIRC.steps.length - 1);
  SET.fault = ''; $('fault').value = '';
  if (s.isOut && !SET.auto) SET.auto = true; // 출력 모듈은 데모로 시작
  if (!s.isOut && opts.fromUser) SET.auto = false;
  $('auto').setAttribute('aria-checked', String(SET.auto));
  renderViz(); if (mode === 'build') renderStrip();
  $('bName').textContent = `${pad2(s.n)} · ${s.name}`;
  $('bSub').textContent = `${s.model} · ${CATS[s.cat].name} · ${BOARDS[board].name} 기준 · 조작하면 가상 데이터가 만들어져요`;
  renderList(); renderCtrls(); renderLegend(); renderPanel(); renderTiles(); renderPins(); renderStatus();
  serialOut(`// [${pad2(s.n)}] ${s.name} 예제 · ${BOARDS[board].baud} baud${s.isOut ? ' · 명령을 받으면 상태를 출력' : ''}`, 'sys');
  if (!opts.keepHash) history.replaceState(null, '', `#${s.n}`);
  const b = document.querySelector(`#slist [data-n="${s.n}"]`); if (b && opts.scroll !== false) b.scrollIntoView({ block: 'nearest' });
  frameAcc = 0;
}
function resetSim() { const n = cur.n; selectSensor(n, { keepHash: true, scroll: false }); toast('이 센서 실험을 처음 상태로 되돌렸어요'); }
function setBoard(b) {
  if (!BOARDS[b] || b === board) return;
  if (SRC.real) disconnect();
  board = b; codeBoard = null; try { localStorage.setItem('bms-sensor-board', b); } catch (e) {}
  document.querySelectorAll('#boardSeg [data-board]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.board === b)));
  $('baudT').textContent = `${BOARDS[b].baud} baud`;
  selectSensor(cur.n, { keepHash: true, scroll: false });
}

// ───────── 소리 ─────────
let actx = null, osc = null, gain = null;
function audio() { if (!actx) { try { actx = new AudioContext(); osc = actx.createOscillator(); gain = actx.createGain(); osc.type = 'square'; gain.gain.value = 0; osc.connect(gain).connect(actx.destination); osc.start(); } catch (e) { actx = null; } } return actx; }
function setTone(f) {
  if (!actx) return;
  const t = actx.currentTime;
  if (!PREF.sound || !f || !SET.running) { gain.gain.setTargetAtTime(0, t, 0.01); return; }
  osc.frequency.setTargetAtTime(f, t, 0.005); gain.gain.setTargetAtTime(0.035, t, 0.01);
}
function click() { if (!PREF.sound || !audio()) return; const b = actx.createBuffer(1, 600, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 80); const src = actx.createBufferSource(), v = actx.createGain(); v.gain.value = 0.25; src.buffer = b; src.connect(v).connect(actx.destination); src.start(); }

// ───────── 실제 보드 (Web Serial) ─────────
async function connect() {
  if (!('serial' in navigator)) { toast('이 브라우저는 Web Serial을 지원하지 않아요. 데스크톱 Chrome이나 Edge에서 열어 주세요.'); return; }
  const B = BOARDS[board];
  try { SRC.port = await navigator.serial.requestPort(); await SRC.port.open({ baudRate: B.baud }); }
  catch (e) { SRC.port = null; if (e && e.name !== 'NotFoundError') toast('포트를 열지 못했어요. Arduino IDE 시리얼 모니터를 닫았는지 확인하세요.'); return; }
  SRC.real = true; SRC.t0 = performance.now(); R.chart = []; R.last = {}; R.trip = false; LOG.length = 0;
  serialOut(`// 실제 보드 연결됨 · ${B.baud} baud · 예제 코드의 '이름:값' 줄을 읽어요`, 'sys');
  renderConn(); renderStatus();
  try {
    const dec = new TextDecoderStream(); SRC.closed = SRC.port.readable.pipeTo(dec.writable).catch(() => {}); SRC.reader = dec.readable.getReader();
    const enc = new TextEncoderStream(); SRC.wclosed = enc.readable.pipeTo(SRC.port.writable).catch(() => {}); SRC.writer = enc.writable.getWriter();
    let buf = '';
    for (;;) {
      const { value, done } = await SRC.reader.read(); if (done) break;
      buf += value; let i;
      while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (line.trim()) onRealLine(line.trim()); }
      if (buf.length > 4000) buf = '';
    }
  } catch (e) { /* 연결 끊김 */ }
  if (SRC.real) disconnect(true);
}
async function disconnect(lost) {
  if (!SRC.real) return; SRC.real = false;
  try { if (SRC.reader) { await SRC.reader.cancel(); await SRC.closed; } } catch (e) {}
  try { if (SRC.writer) { await SRC.writer.close(); await SRC.wclosed; } } catch (e) {}
  try { if (SRC.port) await SRC.port.close(); } catch (e) {}
  SRC.port = SRC.reader = SRC.writer = null;
  serialOut(lost ? '// 보드 연결이 끊겼어요 — 시뮬레이터로 돌아갑니다' : '// 연결 끊기 — 시뮬레이터로 돌아갑니다', 'sys');
  R.chart = []; R.last = {}; renderConn(); renderStatus();
}
function onRealLine(line) {
  serialOut(line);
  const out = {}; let n = 0;
  for (const m of line.matchAll(/([A-Za-z_][\w]*)\s*:\s*(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?|nan|inf)/gi)) { const v = m[2].toLowerCase() === 'nan' ? NaN : parseFloat(m[2]); out[m[1]] = v; n++; }
  if (!n) return;
  R.t = (performance.now() - SRC.t0) / 1000;
  const savedRows = R.rows; R.rows = null;
  absorb(R, out, null, true, 'real');
  R.rows = savedRows;
}
async function sendCmd(str) { if (!SRC.real || !SRC.writer || str == null) return; try { await SRC.writer.write(str + '\n'); serialOut(`→ ${str}`, 'tx'); } catch (e) {} }
function renderConn() {
  const ok = 'serial' in navigator;
  $('conn').textContent = SRC.real ? '연결 끊기' : '실제 보드 연결';
  $('conn').classList.toggle('y', !SRC.real);
  $('conn').disabled = !ok;
  $('conn').title = ok ? `예제 코드를 올린 보드를 USB로 연결 (${BOARDS[board].baud} baud)` : '데스크톱 Chrome·Edge에서만 쓸 수 있어요';
  $('realHint').textContent = SRC.real ? (cur.isOut ? '· 조작하면 보드로 명령을 보내요' : '· 조작부는 시뮬레이터 전용') : '';
  $('cond').classList.toggle('off', SRC.real && !cur.isOut);
  $('ctrls').style.opacity = SRC.real && !cur.isOut ? 0.45 : '';
  $('ctrls').style.pointerEvents = SRC.real && !cur.isOut ? 'none' : '';
}

// ───────── CSV ─────────
function toCsv(rows) {
  const cols = []; for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const order = ['t', ...cols.filter(c => !['t', 'level', 'trip', 'fault', 'src'].includes(c)), 'level', 'trip', 'fault', 'src'].filter(c => cols.includes(c));
  const head = order.map(c => c === 't' ? 'time_s' : c === 'level' ? 'bms_level' : c);
  const lines = [head.join(',')];
  for (const r of rows) lines.push(order.map(c => { const v = r[c]; if (v == null) return ''; if (c === 'level') return `${v}`; if (typeof v === 'number') return Number.isNaN(v) ? 'nan' : String(Math.round(v * 1000) / 1000); return /[,"]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v; }).join(','));
  return '﻿' + lines.join('\r\n');
}
function download(name, text, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`; };
function saveCsv() { if (!LOG.length) { toast('아직 기록이 없어요'); return; } download(`sensor${pad2(cur.n)}_${cur.key}_${board}_${stamp()}.csv`, toCsv(LOG)); toast(`CSV ${LOG.length.toLocaleString()}줄 저장`); }
function gen10() { // 자동 시나리오로 10분 데이터를 즉시 만들기
  const keepAuto = SET.auto; SET.auto = true;
  const run = newRun(cur); run.rows = [];
  const steps = Math.round(600 / DT);
  try { for (let i = 0; i < steps; i++) step(run, false); } finally { SET.auto = keepAuto; }
  const lvCount = [0, 0, 0, 0]; run.rows.forEach(r => lvCount[r.level]++);
  download(`sensor${pad2(cur.n)}_${cur.key}_${board}_sim10min_${stamp()}.csv`, toCsv(run.rows));
  const tot = run.rows.length || 1;
  toast(`가상 데이터 ${run.rows.length.toLocaleString()}줄 (10분) 저장${(cur.rules || []).length ? ` · 정상 ${Math.round(lvCount[0] / tot * 100)}% 주의 ${Math.round(lvCount[1] / tot * 100)}% 경고 ${Math.round(lvCount[2] / tot * 100)}% 위험 ${Math.round(lvCount[3] / tot * 100)}%` : ''}`, 4200);
}

// ───────── 알림 ─────────
let toastT = 0;
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }

// ───────── 이벤트 ─────────
$('slist').addEventListener('click', ev => { const b = ev.target.closest('[data-n]'); if (b) selectSensor(+b.dataset.n, { fromUser: true, scroll: false }); });
$('listSel').addEventListener('change', ev => selectSensor(+ev.target.value, { fromUser: true }));
$('cats').addEventListener('click', ev => { const b = ev.target.closest('[data-cat]'); if (!b) return; catFilter = b.dataset.cat; renderList(); });
$('q').addEventListener('input', ev => { query = ev.target.value; renderList(); });
$('q').addEventListener('keydown', ev => { if (ev.key === 'Enter') { const b = document.querySelector('#slist [data-n]'); if (b) selectSensor(+b.dataset.n, { fromUser: true }); } });
$('boardSeg').addEventListener('click', ev => { const b = ev.target.closest('[data-board]'); if (b) setBoard(b.dataset.board); });
$('sound').addEventListener('click', () => { PREF.sound = !PREF.sound; savePref(); $('sound').setAttribute('aria-pressed', String(PREF.sound)); if (PREF.sound) { audio(); if (actx && actx.state === 'suspended') actx.resume(); toast('부저 소리를 스피커로 들려줘요'); } else setTone(0); });
$('play').addEventListener('click', () => { SET.running = !SET.running; $('play').setAttribute('aria-pressed', String(SET.running)); $('play').setAttribute('aria-label', SET.running ? '일시정지' : '재생'); $('play').innerHTML = SET.running ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>'; if (!SET.running) setTone(0); });
$('speed').addEventListener('click', () => { SET.speed = SPEEDS[(SPEEDS.indexOf(SET.speed) + 1) % SPEEDS.length]; $('speed').textContent = `×${SET.speed}`; });
$('resetSim').addEventListener('click', resetSim);
$('auto').addEventListener('click', () => { SET.auto = !SET.auto; $('auto').setAttribute('aria-checked', String(SET.auto)); if (!SET.auto) { for (const c of cur.ctrls || []) if (c.t === 'hold') R.e[c.k] = false; R.e.jx = 0; R.e.jy = 0; } });
$('noise').addEventListener('input', ev => { SET.noise = ev.target.value / 100; $('noiseV').textContent = `${ev.target.value}%`; });
$('fault').addEventListener('change', ev => { SET.fault = ev.target.value; R.flo = {}; R.stuck = {}; if (SET.fault) toast({ open: '신호선이 빠진 상태: 값이 떠다니거나 오류값이 나와요', short: '신호선이 전원에 붙은 상태: 최대값·HIGH로 고정돼요', noise: '잡음이 크게 늘었어요: 필터와 판정이 어떻게 반응하나요?', stuck: '값이 그대로 멈췄어요: BMS는 이것을 알아챌 수 있을까요?' }[SET.fault], 3600); });
$('filterSeg').addEventListener('click', ev => { const b = ev.target.closest('[data-f]'); if (!b) return; SET.filter = b.dataset.f; R.filt = {}; document.querySelectorAll('#filterSeg [data-f]').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
$('clr').addEventListener('click', () => { SER.length = 0; serDirty = true; });
$('csv').addEventListener('click', saveCsv);
$('gen10').addEventListener('click', gen10);
$('conn').addEventListener('click', () => { if (SRC.real) disconnect(); else connect(); });
$('ptabs').addEventListener('click', ev => { const b = ev.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderPanel(); });
$('ptabs').addEventListener('keydown', ev => { if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return; const t = ['build', 'info', 'wire', 'code', 'bms']; tab = t[(t.indexOf(tab) + (ev.key === 'ArrowRight' ? 1 : 4)) % 5]; renderPanel(); document.querySelector(`#ptabs [data-tab="${tab}"]`).focus(); });

// 조립 따라하기
$('modeSeg').addEventListener('click', ev => { const b = ev.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
$('stPrev').addEventListener('click', () => goStep(bstep - 1));
$('stNext').addEventListener('click', () => goStep(bstep + 1));
$('strip').addEventListener('click', ev => { const b = ev.target.closest('[data-st]'); if (b) goStep(+b.dataset.st); });
$('circsvg').addEventListener('click', ev => { const g = ev.target.closest('[data-step]'); if (g) goStep(+g.dataset.step); });
$('vizToggle').addEventListener('click', () => { vizCircuit = !vizCircuit; renderViz(); });

// 조작부 (위임)
const ctrlsEl = $('ctrls');
ctrlsEl.addEventListener('input', ev => {
  const k = ev.target.dataset.k; if (!k) return;
  const c = cur.ctrls.find(x => x.k === k); R.e[k] = +ev.target.value; $('o_' + k).textContent = fmtCtrl(c, R.e[k]);
});
ctrlsEl.addEventListener('change', ev => { const k = ev.target.dataset.sel; if (k) R.e[k] = ev.target.value; });
ctrlsEl.addEventListener('click', ev => {
  const tg = ev.target.closest('[data-tg]'); if (tg) { const k = tg.dataset.tg; R.e[k] = !R.e[k]; tg.setAttribute('aria-checked', String(R.e[k])); return; }
  const tp = ev.target.closest('[data-tap]'); if (tp) { const k = '_tap_' + tp.dataset.tap; R.e[k] = (R.e[k] || 0) + 1; return; }
  const ky = ev.target.closest('[data-key]'); if (ky) { const c = +ky.dataset.key; R.s.q = R.s.q || []; R.s.q.push(c); ky.classList.add('hit'); setTimeout(() => ky.classList.remove('hit'), 150); if (SRC.real && cur.cmd) sendCmd(cur.cmd(R.e, R.s, c, R.o)); return; }
  const kn = ev.target.closest('[data-knob]'); if (kn) { R.s.knobQ = R.s.knobQ || []; if (R.s.knobQ.length < 20) R.s.knobQ.push(+kn.dataset.knob); }
});
const holdOn = (el, on) => { const k = el.dataset.hold; R.e[k] = on; el.setAttribute('aria-pressed', String(on)); };
ctrlsEl.addEventListener('pointerdown', ev => { const h = ev.target.closest('[data-hold]'); if (h) { ev.preventDefault(); h.setPointerCapture && h.setPointerCapture(ev.pointerId); holdOn(h, true); } });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => ctrlsEl.addEventListener(n, ev => { const h = ev.target.closest('[data-hold]'); if (h && R.e[h.dataset.hold]) holdOn(h, false); }));
ctrlsEl.addEventListener('keydown', ev => { const h = ev.target.closest('[data-hold]'); if (h && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); if (!ev.repeat) holdOn(h, true); } });
ctrlsEl.addEventListener('keyup', ev => { const h = ev.target.closest('[data-hold]'); if (h && (ev.key === ' ' || ev.key === 'Enter')) holdOn(h, false); });
ctrlsEl.addEventListener('wheel', ev => { if (!ev.target.closest('#dial')) return; ev.preventDefault(); R.s.knobQ = R.s.knobQ || []; if (R.s.knobQ.length < 20) R.s.knobQ.push(ev.deltaY > 0 ? 1 : -1); }, { passive: false });

// 패널 (위임)
$('pbody').addEventListener('click', async ev => {
  const t = ev.target;
  if (t.dataset.cb) { codeBoard = t.dataset.cb; renderPanel(); return; }
  if (t.id === 'copyCode') { try { await navigator.clipboard.writeText(cur.code(cur, BOARDS[codeBoard || board])); toast('코드를 복사했어요'); } catch (e) { toast('복사하지 못했어요. 코드를 직접 선택해 주세요.'); } return; }
  if (t.id === 'dlCode') { const B = BOARDS[codeBoard || board]; download(fileName(cur, B), cur.code(cur, B), 'text/plain'); toast('Arduino IDE는 .ino와 같은 이름의 폴더가 필요해요 — 열 때 자동으로 만들어 줘요', 4000); return; }
  if (t.id === 'tripReset') { if (!R.trip) { toast('지금은 차단 상태가 아니에요'); return; } if (R.lv === 3) { toast('위험 조건이 남아 있어 리셋할 수 없어요'); return; } R.trip = false; toast('TRIP 리셋 — 부하를 다시 연결했어요'); updateBmsLive(); return; }
  if (t.id === 'bPrev') { goStep(bstep - 1); return; }
  if (t.id === 'bNext') { goStep(bstep + 1); return; }
  if (t.id === 'goCode') { tab = 'code'; codeBoard = 'esp32'; renderPanel(); return; }
  if (t.id === 'goRun') { const pr = prog(cur.n); pr.done = true; saveProg(); renderList(); vizCircuit = true; setMode('run'); toast('조립 완료! 회로 위에 실시간 신호가 표시돼요'); return; }
  if (t.id === 'thReset') { delete TH[cur.key]; renderPanel(); toast('판정 기준을 처음 값으로 되돌렸어요'); }
});
$('pbody').addEventListener('change', ev => { const t = ev.target; if (t.dataset.ck != null) { prog(cur.n).checks[t.dataset.ck] = t.checked; saveProg(); return; } if (t.dataset.rule == null) return; const th = thOf(cur, +t.dataset.rule); th[+t.dataset.lvl] = t.value === '' ? null : +t.value; });

// 키보드: ←/→ 이전·다음 센서
document.addEventListener('keydown', ev => {
  if (ev.target.closest('input, select, textarea, [contenteditable], .pad')) return;
  if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && mode === 'build') { goStep(bstep + (ev.key === 'ArrowRight' ? 1 : -1)); return; }
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { const i = SENSORS.indexOf(cur) + (ev.key === 'ArrowRight' ? 1 : -1); if (SENSORS[i]) selectSensor(SENSORS[i].n, { fromUser: true }); }
});
window.addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (n && n !== cur.n) selectSensor(n, { keepHash: true }); });

// ───────── 반복 ─────────
const dirty = { ui: true };
let last = performance.now(), frameAcc = 0, uiT = 0, chartT = 0;
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000); last = now;
  if (SET.running) {
    frameAcc += real * SET.speed;
    let n = 0; while (frameAcc >= DT && n < 600) { step(R, true); frameAcc -= DT; n++; }
    if (n >= 600) frameAcc = 0;
  }
  // 소리·명령
  const o = R.o || {};
  setTone(o.tone || 0);
  if (o.click && !R._clicked) { click(); R._clicked = true; } else if (!o.click) R._clicked = false;
  if (SRC.real && cur.isOut && cur.cmd && now - SRC.lastCmdT > 120) { const c = cur.cmd(R.e, R.s, null, o); if (c != null && c !== SRC.lastCmd) { SRC.lastCmd = c; SRC.lastCmdT = now; sendCmd(c); } }
  if (now - uiT > 90) { uiT = now; updateModule(o, R.last); renderTiles(); renderPins(); renderStatus(); updateBmsLive(); flushSerial(); if (SET.auto || cur.ctrls.some(c => c.t === 'pad' || c.t === 'knob')) syncCtrls(); }
  if (now - chartT > 50) { chartT = now; drawChart(); }
  requestAnimationFrame(frame);
}

// ───────── 시작 ─────────
(function start() {
  try { const l = localStorage.getItem('bms-lang') || (navigator.language || 'ko').slice(0, 2); if (l && l !== 'ko') $('langBanner').hidden = false; } catch (e) {}
  $('sound').setAttribute('aria-pressed', String(PREF.sound));
  document.querySelectorAll('#boardSeg [data-board]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.board === board)));
  $('baudT').textContent = `${BOARDS[board].baud} baud`;
  try { const m = sessionStorage.getItem('bms-sensor-mode'); if (m === 'run' || m === 'build') mode = m; } catch (e) {}
  document.body.dataset.mode = mode; document.querySelectorAll('#modeSeg [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  if (mode === 'build') tab = 'build';
  const n = parseInt(location.hash.slice(1), 10);
  selectSensor(SENSORS.some(s => s.n === n) ? n : 1, { keepHash: !!n });
  renderConn();
  new ResizeObserver(() => drawChart()).observe($('chart'));
  requestAnimationFrame(t => { last = t; frame(t); });
})();
