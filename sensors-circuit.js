/* 센서 40종 예시 ESP32 회로 — 조립 단계와 브레드보드 그림
   좌표계는 3D 실습실(lab.js)과 같습니다.
   아래 보드(L): [− + 레일] F G H I J | A B C D E   (레일: + = 5V, − = GND)
   위 보드(R):   F G H I J | A B C D E [− + 레일]  (레일: + = 3V3, − = GND)
   ESP32: 아래쪽 핀 줄 = 아래 보드 D열, 위쪽 핀 줄 = 위 보드 F열, 1~19행, USB 쪽 = 1행
   센서 모듈은 BMS 부품이 없는 위 보드 E44 근처에 꽂으므로, 완성한 BMS 보드에 그대로 추가할 수 있습니다. */

export const COLX = {
  L: { '-': -25.5, '+': -24.5, F: -21.5, G: -20.5, H: -19.5, I: -18.5, J: -17.5, A: -14.5, B: -13.5, C: -12.5, D: -11.5, E: -10.5 },
  R: { F: -1.5, G: -0.5, H: 0.5, I: 1.5, J: 2.5, A: 5.5, B: 6.5, C: 7.5, D: 8.5, E: 9.5, '-': 12.5, '+': 13.5 },
};
export const ESP_L = { 19: '3V3', 18: 'EN', 17: 'VP', 16: 'VN', 15: 'GPIO34', 14: 'GPIO35', 13: 'GPIO32', 12: 'GPIO33', 11: 'GPIO25', 10: 'GPIO26', 9: 'GPIO27', 8: 'GPIO14', 7: 'GPIO12', 6: 'GND', 5: 'GPIO13', 4: 'D2', 3: 'D3', 2: 'CMD', 1: '5V' };
export const ESP_R = { 19: 'GND', 18: 'GPIO23', 17: 'GPIO22', 16: 'TX', 15: 'RX', 14: 'GPIO21', 13: 'GND', 12: 'GPIO19', 11: 'GPIO18', 10: 'GPIO5', 9: 'GPIO17', 8: 'GPIO16', 7: 'GPIO4', 6: 'GPIO0', 5: 'GPIO2', 4: 'GPIO15', 3: 'D1', 2: 'D0', 1: 'CLK' };
export const COLORS = { v5: '#d62f2f', gnd: '#1c1c1c', v3: '#f08a12', ana: '#1e9e55', dig: '#2563c9', ow: '#0f8f86', jmp: '#ececec' };
export const COLOR_KO = { v5: '빨강', gnd: '검정', v3: '주황', ana: '초록', dig: '파랑', ow: '청록', jmp: '흰색' };
const NET_KO = { v5: '5V 전원', gnd: 'GND', v3: '3V3 전원', ana: '아날로그 신호', dig: '디지털 신호', ow: '1-Wire 데이터', jmp: '같은 신호 잇기' };
const RAIL_NET = { 'L+': '5V', 'L-': 'GND', 'R+': '3V3', 'R-': 'GND' };
const BANDS = { '10k': ['#7a4a1d', '#111', '#f08a12'], '220': ['#d62f2f', '#d62f2f', '#7a4a1d'], '330': ['#f08a12', '#f08a12', '#7a4a1d'] };
const BAND_KO = { '10k': '갈·검·주', '220': '빨·빨·갈', '330': '주·주·갈' };
const RES_KO = { '10k': '10kΩ', '220': '220Ω', '330': '330Ω' };
const BMS_GPIO = ['GPIO34', 'GPIO35', 'GPIO4', 'GPIO26', 'GPIO25', 'GPIO27', 'GPIO14', 'GPIO33', 'GPIO13', 'GPIO18', 'GPIO23', 'GPIO17', 'GPIO16', 'GPIO19'];

// ───────── 그림 좌표 ─────────
export const P = 10;                                  // 구멍 간격 (px)
const X0 = 46;                                        // 63행의 x
export const VIEW = { w: 712, h: 594 };
export const VIEWBOX = '0 72 712 522';               // 위쪽 빈 공간을 잘라 회로를 크게
const TOP = 172;                                      // 위 보드 + 레일의 y
export const xRow = r => X0 + (63 - r) * P;
export const yCol = c => TOP + (13.5 - c) * P;
const BASE_ROW = 44;                                  // 모듈 가장 오른쪽 핀이 꽂히는 행
const MOD_K = P / 20;                                 // 모듈 그림 축소 비율 (모듈 핀 간격 20 → 구멍 간격 10)
const MOD_LEG = 116;                                  // 모듈 다리 길이 (모듈 좌표) — 몸체가 레일 바깥에 오도록

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
  if (h.kind === 'rail') return `${bd} ${h.sign === '+' ? '+' : '−'} 레일 (${RAIL_NET[h.board + h.sign]}) ${h.row}행 근처`;
  return `${bd} ${h.col}${h.row}${h.esp ? ` (ESP32 ${gpioName(h.esp)} 줄)` : ''}`;
}
export function holeShort(spec) {
  const h = parseHole(spec);
  if (h.kind === 'rail') return `${RAIL_NET[h.board + h.sign]} 레일`;
  return `${h.board === 'L' ? '아래' : '위'} ${h.col}${h.row}${h.esp ? ' · ' + gpioName(h.esp).replace('GPIO', 'IO') : ''}`;
}
function espHole(gpio) {
  const n = gpio === 'GPIO36' ? 'VP' : gpio === 'GPIO39' ? 'VN' : gpio;
  for (const [r, v] of Object.entries(ESP_L)) if (v === n) return 'LA' + r;
  for (const [r, v] of Object.entries(ESP_R)) if (v === n) return (n === 'GPIO4' ? 'RH' : 'RJ') + r;
  throw new Error('no ESP pin ' + gpio);
}

// ───────── 회로 만들기 ─────────
function netOfPin(p) {
  if (!p.esp) return null;
  if (p.esp === '3V3') return 'v3';
  if (p.esp === 'GND') return 'gnd';
  if (p.esp.startsWith('5V')) return 'v5';
  if (p.esp.startsWith('GPIO')) return 'sig';
  return null;   // 연결 안 함
}
function physPins(s) {
  if (s.key === 'magiccup') return [
    { mod: 'G', esp: 'GND', grp: 'A' }, { mod: '+', esp: '3V3', grp: 'A' }, { mod: 'S', sig: 'SA', esp: 'GPIO32', grp: 'A' }, { mod: 'L', sig: 'LA', esp: 'GPIO21', grp: 'A' },
    { mod: 'G', esp: 'GND', grp: 'B' }, { mod: '+', esp: '3V3', grp: 'B' }, { mod: 'S', sig: 'SB', esp: 'GPIO22', grp: 'B' }, { mod: 'L', sig: 'LB', esp: 'GPIO5', grp: 'B' }];
  return s.pins.map(p => ({ ...p }));
}

/* s: 센서 정의, analog: 아날로그 채널 이름 집합, layout: moduleSvg가 알려 준 핀 위치 [{x,y}] */
export function buildCircuit(s, analog, layout) {
  const pins = physPins(s);
  const xs = layout.map(p => p.x), xmax = Math.max(...xs);
  pins.forEach((p, i) => { p.row = BASE_ROW + Math.round((xmax - layout[i].x) / 20); p.hole = `RE${p.row}`; p.net = netOfPin(p); });
  const rows = pins.map(p => p.row), rmin = Math.min(...rows), rmax = Math.max(...rows);
  const items = [], steps = [];
  const W = (id, from, to, net, extra = {}) => ({ id, t: 'wire', from, to, net, ...extra });
  const RZ = (id, a, b, val, role, extra = {}) => ({ id, t: 'res', a, b, val, role, ...extra });
  const add = (step, ...its) => { its.forEach(it => { it.step = step; items.push(it); }); };
  const mod = s.isOut ? '출력' : '입력';
  const isOut = !!s.isOut;
  const sigNet = p => s.key === 'ds18b20' ? 'ow' : analog.has(p.sig) ? 'ana' : 'dig';

  // 0 준비물
  steps.push({ key: 'prep', short: '@준비물', title: '준비물 확인', kicker: '준비' });
  // 1 기본 배선 (BMS 1단계와 같음)
  steps.push({ key: 'base', short: '전원 레일', title: 'ESP32 꽂기와 전원 레일', kicker: '1단계',
    desc: '브레드보드 2장을 나란히 놓고 가운데에 ESP32를 걸쳐 꽂습니다(USB는 오른쪽). ESP32의 5V·GND를 아래 보드 레일로, 3V3·GND를 위 보드 레일로 뽑아 냅니다.',
    tips: ['BMS 보드를 이미 조립했다면 이 단계는 끝나 있어요. 그대로 다음 단계로 가세요.', '아래 보드 레일: + = 5V, − = GND / 위 보드 레일: + = 3V3, − = GND.', '같은 행에서 ESP32에 가려지지 않은 구멍(아래 보드 A~C, 위 보드 G~J)이 그 핀과 연결돼요. 예: 아래 보드 A17 = VP(GPIO36).', '조립하는 동안 USB는 빼 둡니다.'], warn: [] });
  add(1, W('b5v', 'LA1', 'L+@3', 'v5', { base: true }), W('bg1', 'LA6', 'L-@6', 'gnd', { base: true }), W('b3v', 'LA19', 'R+@23', 'v3', { base: true }), W('bg2', 'RJ13', 'R-@13', 'gnd', { base: true }));
  // 2 모듈 꽂기
  const order = pins.map(p => p.mod.replace(/ \(.+\)/, '')).join(' · ');
  steps.push({ key: 'module', short: '@모듈 꽂기', title: `${s.name} 꽂기`, kicker: '2단계',
    desc: `${s.model} 모듈의 핀을 위 보드 E${rmax}~E${rmin}에 꽂습니다. 그림 왼쪽부터 ${order} 순서예요. 부품 면이 바깥(레일 쪽)을 보게 세우면 그림과 같아요.`,
    tips: [`E열 한 칸은 같은 행의 A~E 다섯 구멍과 연결돼요. 그래서 E${rmin} 핀은 D${rmin}·C${rmin}·B${rmin}·A${rmin}과 같은 신호예요.`, '모듈마다 핀 순서가 다를 수 있어요. 기판 인쇄(−, +, S 등)를 보고 그림의 순서와 맞춰 꽂으세요.', 'BMS 보드의 부품(위 보드 26~34행, 아래 보드 25~55행)과 겹치지 않는 자리예요.'], warn: [] });
  add(2, { id: 'mod', t: 'module' });

  // 3 전원
  const pw = pins.filter(p => p.net === 'v3' || p.net === 'v5' || p.net === 'gnd');
  if (pw.length) {
    const lines = []; const its = [];
    pw.forEach((p, i) => {
      const rail = p.net === 'gnd' ? `R-@${p.row}` : p.net === 'v3' ? `R+@${p.row}` : `L+@${p.row}`;
      its.push(W(`pw${i}`, `RD${p.row}`, rail, p.net, { pin: p.mod }));
      lines.push(`${p.mod.replace(/ \(.+\)/, '')} 핀(E${p.row}) → D${p.row}에서 ${COLOR_KO[p.net]} 선 → ${p.net === 'v5' ? '아래 보드 + 레일 (5V)' : p.net === 'v3' ? '위 보드 + 레일 (3V3)' : '위 보드 − 레일 (GND)'}`);
    });
    const tips = [];
    if (pw.some(p => p.net === 'v5')) tips.push('이 모듈은 5V가 필요해서 아래 보드 5V 레일까지 긴 선을 씁니다. ESP32를 넘어가도록 넉넉한 길이로 하세요.');
    if (pw.some(p => p.net === 'v3')) tips.push('3.3V로 먹이면 모듈 출력도 3.3V를 넘지 않아 ESP32 핀이 안전해요. 5V 레일에 꽂지 마세요.');
    if (['activebuzzer', 'thermistor'].includes(s.key)) tips.push('이 모듈은 매뉴얼 기준 − 표시가 전원, + 표시가 GND예요(표시가 반대인 제품). 기판·스티커를 확인하세요.');
    if (s.key === 'dht11') tips.push('키트 매뉴얼 표의 −/+ 표기는 반대로 적혀 있어요. 기판 인쇄 기준으로 −는 GND, +는 3V3입니다.');
    tips.push('− 레일과 + 레일을 바꿔 꽂으면 모듈이 상할 수 있어요. 빨강·주황 = 전원, 검정 = GND로 색을 지키면 헷갈리지 않아요.');
    steps.push({ key: 'power', short: '모듈 전원', title: '모듈 전원 연결', kicker: '3단계', desc: '모듈에 전원과 GND를 넣습니다.', lines, tips, warn: [tips.length - 1] });
    add(steps.length - 1, ...its);
  }
  // 4… 신호선 (필요하면 저항 포함)
  const sigPins = pins.filter(p => p.net === 'sig');
  const colorPins = ['rgbsmd', 'dual3', 'dual5'].includes(s.key) ? sigPins : [];
  let extraRow = rmin - 3;   // 저항은 모듈 오른쪽(작은 행 번호) 빈 자리에
  sigPins.forEach((p, i) => {
    const net = sigNet(p), to = espHole(p.esp), gp = p.esp, its = [], lines = [], tips = [], warn = [];
    const role = isOut ? 'ESP32가 신호를 내보내는 출력 핀이에요.' : net === 'ana' ? '아날로그 전압을 읽는 ADC1 핀이에요 (Wi-Fi를 켜도 읽을 수 있음).' : net === 'ow' ? '1-Wire 데이터선이에요. 모듈에 풀업 저항이 있어 그대로 연결해요.' : '디지털 입력 핀이에요.';
    const name = p.mod.replace(/ \(.+\)/, '').replace(/^[AB]: /, '');
    let title = `${p.grp ? p.grp + ' ' : ''}${name} → ${gpioName(gp)}`, kind = 'wire';
    if (s.key === 'ultrasonic' && p.sig === 'ECHO') {   // 5V Echo → 10kΩ/10kΩ 분배 → GPIO22
      const n = extraRow, g = extraRow - 4; extraRow -= 6;
      its.push(RZ('echoR1', `RB${p.row}`, `RB${n}`, '10k', 'Echo 분배기 위쪽'), RZ('echoR2', `RC${n}`, `RC${g}`, '10k', 'Echo 분배기 아래쪽'), W('echoG', `RD${g}`, `R-@${g}`, 'gnd'), W(`s${i}`, `RA${n}`, to, net, { sig: p.sig }));
      lines.push(`10kΩ(R1): B${p.row} ↔ B${n} (Echo → 분배 가운데 점)`, `10kΩ(R2): C${n} ↔ C${g} (가운데 점 → GND 점)`, `검정 선: D${g} → 위 보드 − 레일`, `${COLOR_KO[net]} 선: A${n} → ${holeNice(to)}`);
      tips.push('HC-SR04는 5V로 동작해서 Echo가 5V를 냅니다. 10kΩ 두 개로 절반(약 2.5V)으로 낮춰야 ESP32가 상하지 않아요.', `${n}행이 분배 가운데 점, ${g}행이 GND 점이에요.`, `10kΩ 색띠: ${BAND_KO['10k']}`);
      warn.push(0); title = `Echo → 분배기 → ${gpioName(gp)}`; kind = 'divider';
    } else if (colorPins.includes(p)) {                 // LED 색마다 220Ω 직렬
      const n = extraRow; extraRow -= 1;
      const col = ['D', 'C', 'B'][colorPins.indexOf(p)];
      its.push(RZ(`r${i}`, `R${col}${p.row}`, `R${col}${n}`, '220', `${name} 전류 제한`), W(`s${i}`, `RA${n}`, to, net, { sig: p.sig }));
      lines.push(`220Ω: ${col}${p.row} ↔ ${col}${n} (${name} 핀 → ${n}행)`, `${COLOR_KO[net]} 선: A${n} → ${holeNice(to)}`);
      tips.push('LED는 저항 없이 연결하면 전류가 너무 많이 흘러 LED와 ESP32 핀이 상할 수 있어요.', `220Ω 색띠: ${BAND_KO['220']}`);
      warn.push(0); kind = 'led';
    } else {
      its.push(W(`s${i}`, `RB${p.row}`, to, net, { sig: p.sig }));
      lines.push(`${COLOR_KO[net]} 선: B${p.row} (모듈 ${name} 핀 줄) → ${holeNice(to)}`);
    }
    tips.push(role);
    if (gp === 'GPIO36' || gp === 'GPIO39') tips.push('GPIO36(VP)·39(VN)는 입력 전용 핀이라 아날로그 센서에 알맞아요.');
    if (gp === 'GPIO4') tips.push('BMS 보드의 DS18B20과 같은 7행(GPIO4)이라, 두 센서가 한 1-Wire 버스에 함께 연결돼요.');
    if (gp === 'GPIO5') tips.push('GPIO5는 부팅할 때 잠깐 신호가 나오는 핀이에요. 출력·입력 모두 쓸 수 있지만 전원을 켤 때 모듈이 잠깐 깜빡일 수 있어요.');
    if (s.key === 'irtx') tips.push('ESP32는 아무 출력 핀이나 IR 송신에 쓸 수 있어요 (Uno는 D3 고정).');
    if (s.key === 'joystick' && p.sig === 'SW') tips.push('SW는 코드에서 INPUT_PULLUP으로 켭니다. 그래서 따로 저항이 필요 없어요.');
    steps.push({ key: 'sig' + i, short: `${p.grp ? p.grp + ' ' : ''}${name}`, title, kicker: `${steps.length + 0}단계`, desc: `${p.grp ? `컵 ${p.grp} 모듈의 ` : '모듈 '}${name} 핀을 ESP32 ${gpioName(gp)}에 연결합니다.${kind === 'divider' ? ' 5V 신호라 저항 두 개로 낮춰서 연결해요.' : kind === 'led' ? ' 220Ω 저항을 거쳐 연결해요.' : ''}`, lines, tips, warn });
    add(steps.length - 1, ...its);
  });
  steps.forEach((st, i) => { if (i >= 2 && st.key !== 'module') st.kicker = `${i}단계`; });
  // 점검·코드·실험
  const checks = ['USB를 뺀 상태에서 조립했다', `모듈 핀이 위 보드 E${rmax}~E${rmin}에 기판 인쇄 순서대로 꽂혔다`];
  pw.forEach(p => checks.push(`${p.mod.replace(/ \(.+\)/, '')} 핀이 ${p.net === 'gnd' ? '− 레일(GND, 검정 선)' : p.net === 'v3' ? '위 보드 + 레일(3V3, 주황 선)' : '아래 보드 + 레일(5V, 빨간 선)'}에 연결됐다`));
  sigPins.forEach(p => checks.push(`${p.grp ? p.grp + ' ' : ''}${p.mod.replace(/ \(.+\)/, '').replace(/^[AB]: /, '')} → ${gpioName(p.esp)} 줄 (${holeShort(espHole(p.esp)).replace(/ · .*/, '')})`));
  if (s.key === 'ultrasonic') checks.push('Echo가 ESP32에 바로 가지 않고 10kΩ 두 개(분배기)를 거친다');
  if (colorPins.length) checks.push('LED 색마다 220Ω 저항을 거친다');
  if (pins.some(p => p.esp && p.esp.startsWith('연결'))) checks.push(`연결하지 않는 핀(${pins.filter(p => p.esp && p.esp.startsWith('연결')).map(p => p.mod.replace(/ \(.+\)/, '')).join(', ')})은 비워 두었다`);
  checks.push('ESP32 위·아래 레일이 바뀌지 않았다 (위 보드 + = 3V3, 아래 보드 + = 5V)');
  steps.push({ key: 'check', short: '@점검', title: '점검하기', kicker: '점검', desc: 'USB를 꽂기 전에 아래 항목을 하나씩 확인하세요. 체크한 내용은 이 브라우저에 저장돼요.', checks, tips: ['그림에서 선이나 부품을 누르면 그 부품을 꽂은 단계로 이동해요.'], warn: [] });
  steps.push({ key: 'code', short: '@코드', title: '예제 코드 올리기', kicker: '코드', desc: `오른쪽 코드 탭의 ESP32 예제를 Arduino IDE로 올립니다. 시리얼 모니터는 ${115200} baud.`, tips: [], warn: [] });
  steps.push({ key: 'run', short: '@실험', title: '가상 실험 시작', kicker: '실험', desc: '조립이 끝났어요. 가상 실험으로 넘어가 같은 회로에서 신호가 어떻게 바뀌는지 보세요.', tips: [], warn: [] });

  // 준비물
  const nWires = items.filter(i => i.t === 'wire').length, nBase = items.filter(i => i.t === 'wire' && i.base).length;
  const res = {}; items.filter(i => i.t === 'res').forEach(r => { res[r.val] = (res[r.val] || 0) + 1; });
  const longW = items.filter(i => i.t === 'wire' && !i.base && (parseHole(i.from).board !== parseHole(i.to).board)).length;
  steps[0].bom = [
    ['ESP32 DevKitC V4', '1개', 'BMS 실습과 같은 보드'],
    ['브레드보드 830홀', '2개', '가운데에 ESP32를 걸쳐 꽂음'],
    [`${s.name} (${s.model})`, s.key === 'magiccup' ? '2개' : '1개', `키트 ${String(s.n).padStart(2, '0')}번`],
    ['수-수(M-M) 점퍼선', `${nWires}개`, `전원 레일 ${nBase}개 포함 · 보드를 건너는 긴 선 ${longW}개`],
    ...Object.entries(res).map(([v, n]) => [`저항 ${RES_KO[v]}`, `${n}개`, `색띠 ${BAND_KO[v]}`]),
    ['USB 케이블', '1개', '데이터 전송이 되는 케이블'],
  ];
  steps[0].desc = '키트에서 아래 부품을 꺼내 놓습니다. BMS 보드를 이미 만들었다면 그 위에 이 센서만 더하면 돼요.';
  steps[0].tips = ['점퍼선 색은 정해 두면 실수가 줄어요: 빨강 = 5V, 주황 = 3V3, 검정 = GND, 파랑 = 디지털, 초록 = 아날로그.', 'BMS 보드에서 이미 쓰는 GPIO(34·35·4·26·25·27·14·33·13·18·23·17·16·19)는 피해서 골랐어요.'];
  steps[0].warn = [];
  const used = new Set(sigPins.map(p => p.esp));
  const conflict = [...used].filter(g => BMS_GPIO.includes(g) && !(s.key === 'ds18b20' && g === 'GPIO4'));
  return { pins, items, steps, rmin, rmax, used, conflict };
}

// ───────── 그림 ─────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function holesFor(board) {
  const cols = COLX[board], x1 = xRow(63) - P / 2, x2 = xRow(1) + P / 2;
  return Object.entries(cols).map(([c, v]) => `<rect x="${x1}" y="${yCol(v) - P / 2}" width="${x2 - x1}" height="${P}" fill="url(#hp)"/>`).join('');
}
function boardSvg(board) {
  const cols = COLX[board], vals = Object.values(cols), top = yCol(Math.max(...vals)) - P * 1.1, bot = yCol(Math.min(...vals)) + P * 1.1;
  const x1 = xRow(63) - P * 1.4, x2 = xRow(1) + P * 1.4;
  const ch = board === 'L' ? [cols.J, cols.A] : [cols.J, cols.A];
  const chY = (yCol(ch[0]) + yCol(ch[1])) / 2;
  const plus = cols['+'], minus = cols['-'];

  const railLine = (c, col, dy) => `<line x1="${x1 + 8}" x2="${x2 - 8}" y1="${yCol(c) + dy}" y2="${yCol(c) + dy}" stroke="${col}" stroke-width="1.3" opacity=".75"/>`;
  const dyP = board === 'R' ? -P * 0.75 : P * 0.75, dyM = board === 'R' ? P * 0.75 : -P * 0.75;
  let s = `<rect x="${x1}" y="${top}" width="${x2 - x1}" height="${bot - top}" rx="6" fill="#fbfaf6" stroke="#d8d2c2"/>`;
  s += `<rect x="${x1}" y="${chY - P * 0.7}" width="${x2 - x1}" height="${P * 1.4}" fill="#ece7da"/>`;
  s += railLine(plus, '#d62f2f', dyP) + railLine(minus, '#2563c9', dyM);
  s += holesFor(board);
  for (const [c, v] of Object.entries(cols)) {
    const lab = c === '+' ? '+' : c === '-' ? '−' : c;
    const col = c === '+' ? '#d62f2f' : c === '-' ? '#2563c9' : '#8a8d96';
    s += `<text x="${x1 + 5}" y="${yCol(v) + 3}" font-size="7.5" font-family="JetBrains Mono" font-weight="700" fill="${col}">${lab}</text><text x="${x2 - 5}" y="${yCol(v) + 3}" text-anchor="end" font-size="7.5" font-family="JetBrains Mono" font-weight="700" fill="${col}">${lab}</text>`;
  }
  for (let r = 5; r <= 60; r += 5) s += `<text x="${xRow(r)}" y="${chY + 3}" text-anchor="middle" font-size="7" font-family="JetBrains Mono" fill="#a59f8c">${r}</text>`;
  s += `<text x="${xRow(1)}" y="${chY + 3}" text-anchor="middle" font-size="7" font-family="JetBrains Mono" fill="#a59f8c">1</text><text x="${xRow(63)}" y="${chY + 3}" text-anchor="middle" font-size="7" font-family="JetBrains Mono" fill="#a59f8c">63</text>`;
  s += `<text x="${x2 - 4}" y="${board === 'R' ? top - 4 : bot + 11}" text-anchor="end" font-size="10" font-weight="700" fill="#5d6272">${board === 'R' ? '위 보드 · 레일 + = 3V3, − = GND' : '아래 보드 · 레일 + = 5V, − = GND'}</text>`;
  return s;
}
function espSvg(used) {
  const xa = xRow(22.8), xb = xRow(-1.2), ya = yCol(-0.75), yb = yCol(-12.25);
  let s = `<g class="esp"><rect x="${xa}" y="${ya}" width="${xb - xa}" height="${yb - ya}" rx="4" fill="#1d2330" stroke="#0b0f17"/>`;
  s += `<rect x="${xRow(22.4)}" y="${yCol(-3.2)}" width="${xRow(13.2) - xRow(22.4)}" height="${yCol(-9.8) - yCol(-3.2)}" rx="2" fill="#b9bec7" stroke="#7d848f"/><text x="${(xRow(22.4) + xRow(13.2)) / 2}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="8" font-family="JetBrains Mono" fill="#4b5262" font-weight="700">ESP32-WROOM</text>`;
  s += `<path d="M${xRow(22.6)} ${yCol(-3.6)} h-2 v14 h-2" fill="none" stroke="#d6b04d" stroke-width="1"/>`;
  s += `<rect x="${xRow(0.6)}" y="${yCol(-4.8)}" width="${xRow(-2) - xRow(0.6)}" height="${yCol(-8.2) - yCol(-4.8)}" rx="2" fill="#c9cdd3" stroke="#7d848f"/><text x="${xRow(5)}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="7" fill="#9fb1c6" font-family="JetBrains Mono">USB →</text>`;
  s += `<text x="${xRow(10)}" y="${yCol(-6.5) + 3}" text-anchor="middle" font-size="7.5" fill="#cfe0f5" font-family="JetBrains Mono">DevKitC V4</text>`;
  const pin = (r, side) => {
    const name = side === 'L' ? ESP_L[r] : ESP_R[r], y = side === 'L' ? yCol(-11.5) : yCol(-1.5), x = xRow(r);
    const full = name === 'VP' ? 'GPIO36' : name === 'VN' ? 'GPIO39' : name;
    const hit = used.has(full) || used.has(name);
    const lab = name.replace('GPIO', '');
    const ly = side === 'L' ? y - 8 : y + 12;
    return `<g class="ep${hit ? ' used' : ''}" data-esp="${esc(full)}"><title>ESP32 ${esc(name === 'VP' || name === 'VN' ? name + ' (' + full + ')' : name)} · ${side === 'L' ? '아래' : '위'} 보드 ${side === 'L' ? 'D' : 'F'}${r}</title><rect x="${x - 3.2}" y="${y - 3.2}" width="6.4" height="6.4" fill="#111" stroke="${hit ? '#fdd062' : '#d6b04d'}" stroke-width="${hit ? 2 : 1}"/><text x="${x}" y="${ly}" text-anchor="middle" font-size="${lab.length > 3 ? 5.6 : 6.4}" font-family="JetBrains Mono" font-weight="700" fill="${hit ? '#fdd062' : '#9fb1c6'}">${esc(lab)}</text></g>`;
  };
  for (let r = 1; r <= 19; r++) s += pin(r, 'L') + pin(r, 'R');
  return s + '</g>';
}
function wirePath(a, b) {
  const A = parseHole(a), B = parseHole(b);
  const dx = B.x - A.x, dy = B.y - A.y;
  if (Math.abs(dx) < P * 1.5) { const bend = 9 + Math.abs(dy) * 0.08; return `M${A.x} ${A.y} C${A.x + bend} ${A.y + dy * 0.3} ${B.x + bend} ${B.y - dy * 0.3} ${B.x} ${B.y}`; }
  const my = (A.y + B.y) / 2;
  return `M${A.x} ${A.y} C${A.x} ${my} ${B.x} ${my} ${B.x} ${B.y}`;
}
function resSvg(it) {
  const A = parseHole(it.a), B = parseHole(it.b), y = A.y, xa = Math.min(A.x, B.x), xb = Math.max(A.x, B.x), mid = (xa + xb) / 2, w = Math.min(26, xb - xa - 6);
  const bands = BANDS[it.val] || BANDS['10k'];
  return `<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="#9aa0a3" stroke-width="1.8"/><circle cx="${xa}" cy="${y}" r="2" fill="#9aa0a3"/><circle cx="${xb}" cy="${y}" r="2" fill="#9aa0a3"/><rect x="${mid - w / 2}" y="${y - 4.2}" width="${w}" height="8.4" rx="4" fill="#e2cf9f" stroke="#b9a46e"/>${bands.map((c, i) => `<rect x="${mid - w / 2 + 4 + i * 4.2}" y="${y - 4.2}" width="2.4" height="8.4" fill="${c}"/>`).join('')}<rect x="${mid + w / 2 - 6}" y="${y - 4.2}" width="2.4" height="8.4" fill="#c9a24a"/>`;
}

/* opts: { step: 지금 단계 번호 (Infinity = 완성), build: 조립 모드 여부, moduleSvg(s, opt) } */
export function circuitSvg(s, circ, opts) {
  const step = opts.step ?? Infinity, build = !!opts.build;
  const cls = it => { if (it.step > step) return 'it fut'; if (it.step === step && build) return 'it cur'; return build && it.step < step && step < 90 ? 'it done' : 'it'; };
  const defs = `<defs><pattern id="hp" width="${P}" height="${P}" patternUnits="userSpaceOnUse" x="${xRow(63) - P / 2}" y="0"><rect x="${P / 2 - 1.8}" y="${P / 2 - 1.8}" width="3.6" height="3.6" rx=".6" fill="#4a4f5a" opacity=".55"/></pattern><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  // 모듈 (기존 모듈 그림을 축소해 핀이 E열 구멍에 오도록)
  const pinsOut = [];
  const modInner = opts.moduleSvg(s, { circuit: true, leg: MOD_LEG, pins: pinsOut });
  const p0 = circ.pins.reduce((a, p, i) => (p.row < circ.pins[a].row ? i : a), 0);   // 가장 오른쪽 핀
  const tx = xRow(circ.pins[p0].row) - MOD_K * pinsOut[p0].x, ty = yCol(COLX.R.E) - MOD_K * pinsOut[p0].y;
  const modIt = circ.items.find(i => i.t === 'module');
  const modG = `<g class="${cls(modIt)}" data-item="mod" data-step="${modIt.step}"><title>${esc(s.name)} — 위 보드 E${circ.rmax}~E${circ.rmin}</title><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${MOD_K})">${modInner}</g></g>`;
  const res = circ.items.filter(i => i.t === 'res').map(it => `<g class="${cls(it)}" data-item="${it.id}" data-step="${it.step}"><title>${esc(RES_KO[it.val])} ${esc(it.role)} — ${esc(holeShort(it.a))} ↔ ${esc(holeShort(it.b))}</title>${resSvg(it)}</g>`).join('');
  const wires = circ.items.filter(i => i.t === 'wire').map(it => {
    const A = parseHole(it.from), B = parseHole(it.to), c = COLORS[it.net];
    return `<g class="${cls(it)}${it.base ? ' base' : ''}" data-item="${it.id}" data-step="${it.step}"${it.sig ? ` data-sig="${it.sig}"` : ''}><title>${esc(COLOR_KO[it.net])} 점퍼선 (${esc(NET_KO[it.net])}): ${esc(holeNice(it.from))} → ${esc(holeNice(it.to))}</title><path class="w" d="${wirePath(it.from, it.to)}" stroke="${c}" fill="none" stroke-width="3" stroke-linecap="round"/><circle cx="${A.x}" cy="${A.y}" r="2.6" fill="${c}" stroke="#fff" stroke-width=".8"/><circle cx="${B.x}" cy="${B.y}" r="2.6" fill="${c}" stroke="#fff" stroke-width=".8"/>${it.sig ? `<text class="vlab" x="${B.x}" y="${B.y + (B.board === 'L' ? 14 : -7)}" text-anchor="middle" font-size="8.5" font-family="JetBrains Mono" font-weight="700"></text>` : ''}</g>`;
  }).join('');
  // 지금 단계의 구멍 이름표
  let tags = '';
  if (build && step < 90) {
    const pts = [];
    circ.items.filter(i => i.step === step).forEach(it => { if (it.t === 'wire') pts.push(it.from, it.to); if (it.t === 'res') pts.push(it.a, it.b); });
    if (step === 2) circ.pins.forEach(p => pts.push(p.hole));
    const seen = new Set();
    pts.forEach((h, k) => { if (seen.has(h)) return; seen.add(h); const H = parseHole(h); const t = holeShort(h); const w = t.length * 5.6 + 10; const up = H.board === 'R' && H.kind !== 'rail' ? (H.col === 'E' ? -1 : 1) : H.board === 'R' ? -1 : 1; const ty2 = H.y + up * (H.board === 'L' ? 14 : 13) + (k % 2) * up * 0; tags += `<g class="tag"><rect x="${H.x - w / 2}" y="${ty2 - 7}" width="${w}" height="13" rx="6" fill="#13203a"/><text x="${H.x}" y="${ty2 + 2.5}" text-anchor="middle" font-size="8" font-family="Roboto Condensed, Noto Sans KR, sans-serif" font-weight="700" fill="#fdd062">${esc(t)}</text></g>`; });
  }
  return defs + `<rect y="60" width="${VIEW.w}" height="${VIEW.h}" fill="#f3efe3"/>` + boardSvg('R') + boardSvg('L') + espSvg(circ.used) + res + modG + wires + tags;
}
