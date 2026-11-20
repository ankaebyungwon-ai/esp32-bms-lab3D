/* 빵빵한 센서 키트 40종 — 모듈 정의
   각 모듈: 핀(Uno=키트 매뉴얼, ESP32=BMS 보드에 추가할 때), 가상 신호 모델(sim → read), BMS 판정 규칙, 예제 코드(code)
   sim()은 모듈 핀의 전기 신호(전압·논리값)를 만들고, 엔진이 잡음·고장·ADC 변환을 거쳐 read()에 넘깁니다.
   read()는 업로드한 예제 코드가 계산하는 것과 같은 값을 돌려줍니다 (시리얼 플로터 형식 이름:값). */

export const BOARDS = {
  esp32: { id: 'esp32', name: 'ESP32', vcc: 3.3, vccMv: 3300, adcMax: 4095, baud: 115200, esp: true },
  uno: { id: 'uno', name: 'Uno', vcc: 5, vccMv: 5000, adcMax: 1023, baud: 9600, esp: false },
};

export const CATS = {
  din: { name: '디지털 입력', tag: 'D' },
  ain: { name: '아날로그 입력', tag: 'A' },
  cmp: { name: 'AO+DO 비교기', tag: 'AD' },
  bus: { name: '통신·타이밍', tag: 'BUS' },
  out: { name: '출력·표시', tag: 'OUT' },
};

// ───────── 공용 도우미 ─────────
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const approach = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
const field = d => 3000 / (1 + Math.pow(Math.max(0, d) / 4, 3));      // 소형 네오디뮴 자석, 거리 d(mm) → 자속밀도(G)
const ppg = ph => Math.exp(-(((ph - 0.15) / 0.06) ** 2)) + 0.35 * Math.exp(-(((ph - 0.45) / 0.08) ** 2));
const SH = { A: 0.001129148, B: 0.000234125, C: 0.0000000876741 };    // 매뉴얼의 Steinhart-Hart 계수
function shRes(tc) { // 온도 → 서미스터 저항 (Steinhart-Hart 역산, 뉴턴법)
  const y = 1 / (tc + 273.15); let x = Math.log(10000);
  for (let i = 0; i < 12; i++) { const f = SH.A + SH.B * x + SH.C * x ** 3 - y; x -= f / (SH.B + 3 * SH.C * x * x); }
  return Math.exp(x);
}
const ntcRes = tc => 10000 * Math.exp(3950 * (1 / (tc + 273.15) - 1 / 298.15)); // 10kΩ B3950
const ntcTemp = r => 1 / (1 / 298.15 + Math.log(r / 10000) / 3950) - 273.15;
const r1 = (v, d = 1) => { const m = 10 ** d; return Math.round(v * m) / m; };

// 온도 계열 공용 조작 (손으로 쥐기·뜨거운 물)
const TEMP_CTRLS = (min, max, def) => [
  { k: 'amb', t: 'range', label: '주변 온도', min, max, step: 0.5, unit: '°C', def },
  { k: 'hand', t: 'hold', label: '손으로 쥐기' },
  { k: 'hot', t: 'toggle', label: '뜨거운 물에 담그기' },
];
function tempSim(e, s, dt) { // 센서 몸체 온도의 1차 지연
  if (s.tc == null) s.tc = e.amb;
  const target = e.hot ? 60 : e.hand ? Math.max(e.amb, 33.5) : e.amb;
  s.tc = approach(s.tc, target, dt, e.hot ? 12 : 20);   // 손은 천천히, 물은 빠르게
  return s.tc;
}
function tempAuto(t, e) { // 자동 시나리오: 평소 → 손으로 쥐기 → 뜨거운 물 → 식히기 (120초 주기)
  const c = t % 120; e.hand = c > 20 && c < 50; e.hot = c >= 60 && c < 85; e.amb = 24 + 1.5 * Math.sin(t / 40);
}
function rateOf(s, v, t, win = 30) { // 최근 win초 변화율 (단위/분)
  s.hist = s.hist || []; s.hist.push([t, v]); while (s.hist.length && t - s.hist[0][0] > win) s.hist.shift();
  const [t0, v0] = s.hist[0]; return t - t0 > 5 ? (v - v0) / (t - t0) * 60 : 0;
}
const TEMP_RULES = [{ k: 'temp_c', dir: 'hi', th: [32, 38, 45], name: '과열', unit: '°C' }];

// ───────── 예제 코드 도우미 ─────────
const pad2 = n => String(n).padStart(2, '0');
function pinOf(s, sig, B) {
  const p = s.pins.find(x => x.sig === sig); const v = B.esp ? p.esp : p.uno;
  return v.startsWith('GPIO') ? v.slice(4) : v.startsWith('D') ? v.slice(1) : v;
}
function head(s, B, lines = []) {
  return [`// [${pad2(s.n)}] ${s.name} (${s.model}) · ${B.name}용`,
    '// 빵빵한 센서 키트 가상 실습실 예제 — 시리얼 플로터 형식(이름:값)으로 출력',
    `// 시리얼 모니터 속도: ${B.baud} baud · 웹 실습실의 '실제 보드 연결'로 같은 그래프를 볼 수 있어요`, ...lines.map(l => '// ' + l), ''].join('\n');
}
const ADC_LINES = B => B.esp
  ? `const float VCC_MV = 3300.0;     // 모듈 전원 3.3V\nconst int ADC_MAX = 4095;         // ESP32 ADC 12비트\n\n// ESP32는 analogReadMilliVolts()가 보정된 mV를 돌려줌 (약 3.1V 이상은 잘림)\nfloat readMv(int pin) { return analogReadMilliVolts(pin); }`
  : `const float VCC_MV = 5000.0;     // 모듈 전원 5V\nconst int ADC_MAX = 1023;         // Uno ADC 10비트\n\n// Uno는 0~1023 값을 mV로 바꿔 씀 (기준 전압 5V)\nfloat readMv(int pin) { return analogRead(pin) * VCC_MV / ADC_MAX; }`;
const ISR = B => B.esp ? 'void IRAM_ATTR' : 'void';

// 디지털 입력 한 개 + 감지 횟수
function codeDigital(s, B, o) {
  const P = o.pinName, act = o.active;
  return `${head(s, B, o.notes || [])}
const int ${P} = ${pinOf(s, o.sig || 'S', B)};          // 모듈 ${o.modPin || 'S'} 핀
const unsigned long PERIOD_MS = ${o.period || 100};  // 출력 주기

long count = 0;        // 감지 횟수
int lastDetect = 0;

void setup() {
  Serial.begin(${B.baud});
  pinMode(${P}, ${o.pullup ? 'INPUT_PULLUP' : 'INPUT'});   // ${o.pullup ? '내부 풀업: 신호선이 빠져도 HIGH로 고정' : '모듈 출력을 그대로 읽음'}
}

void loop() {
  int pin = digitalRead(${P});
  int detect = (pin == ${act}) ? 1 : 0;   // ${o.what} → ${act}
  if (detect == 1 && lastDetect == 0) count++;   // 새로 감지될 때만 1 증가
  lastDetect = detect;

  Serial.print("pin:");      Serial.print(pin);
  Serial.print(",${o.key}:");  Serial.print(detect);
  Serial.print(",count:");   Serial.println(count);
  delay(PERIOD_MS);
}
`;
}

// 인터럽트로 펄스 세기 (회전수·충격 횟수)
function codePulse(s, B, o) {
  const P = o.pinName;
  return `${head(s, B, o.notes || [])}
const int ${P} = ${pinOf(s, 'S', B)};            // 모듈 S 핀 (인터럽트 가능한 핀)
const unsigned long PERIOD_MS = ${o.period};     // 이 시간 동안 펄스를 셈
${o.perRev ? `const int PULSES_PER_REV = ${o.perRev};       // 한 바퀴당 펄스 수 (${o.perRevNote})\n` : ''}
volatile unsigned long pulses = 0;   // 인터럽트에서 바뀌는 값은 volatile

${ISR(B)} onPulse() { pulses++; }   // ${o.edge === 'FALLING' ? 'HIGH→LOW' : 'LOW→HIGH'} 순간마다 호출

void setup() {
  Serial.begin(${B.baud});
  pinMode(${P}, ${o.pullup ? 'INPUT_PULLUP' : 'INPUT'});
  attachInterrupt(digitalPinToInterrupt(${P}), onPulse, ${o.edge});
}

void loop() {
  delay(PERIOD_MS);
  noInterrupts();                     // 읽는 동안 값이 바뀌지 않게 잠깐 멈춤
  unsigned long n = pulses;
  pulses = 0;
  interrupts();

  int pin = digitalRead(${P});
${o.body}
}
`;
}

// AO+DO 비교기 모듈 공용 (LM393 + 가변저항)
function codeCmp(s, B, o) {
  return `${head(s, B, ['AO = 센서 전압(아날로그), DO = 가변저항으로 정한 기준을 넘으면 HIGH (제품에 따라 반대일 수 있음)', ...(o.notes || [])])}
const int AO_PIN = ${pinOf(s, 'AO', B)};          // 모듈 AO
const int DO_PIN = ${pinOf(s, 'DO', B)};          // 모듈 DO
${ADC_LINES(B)}
${o.consts || ''}
void setup() {
  Serial.begin(${B.baud});
  pinMode(DO_PIN, INPUT);
}

void loop() {
  int raw = analogRead(AO_PIN);
  float mv = readMv(AO_PIN);
  int det = digitalRead(DO_PIN);   // 1 = ${o.what}
${o.calc || ''}
  Serial.print("ao:");   Serial.print(raw);
${o.print || ''}  Serial.print(",do:");  Serial.println(det);
  delay(${o.period || 100});
}
`;
}

// 출력 모듈 공용: 시리얼 숫자 명령 + 데모
function codeOut(s, B, o) {
  return `${head(s, B, ['시리얼로 숫자를 보내면 바로 반영됩니다 (웹 실습실 실제 보드 모드가 보냄)', ...(o.notes || [])])}
${o.pins}
bool demo = true;               // 명령을 받기 전까지는 데모 동작
unsigned long lastDemo = 0;
int demoStep = 0;
${o.globals || ''}
${o.setFn}

void setup() {
  Serial.begin(${B.baud});
  Serial.setTimeout(20);        // parseInt()가 오래 기다리지 않게
${o.setup}
}

void loop() {
  if (Serial.available() > 0) {   // 예: "${o.example}"
${o.parse}
    while (Serial.available()) Serial.read();   // 줄바꿈 등 남은 문자 버리기
    demo = false;
  }
  if (demo && millis() - lastDemo >= ${o.demoMs || 1000}) {
    lastDemo = millis();
${o.demo}
  }
}
`;
}

// ───────── BMS 단계(출력 모듈의 'BMS 단계 따라가기') ─────────
export const BMS_LV = [['', '직접 조절'], ['0', '정상'], ['1', '주의'], ['2', '경고'], ['3', '위험'], ['4', 'TRIP']];
const BMS_RGB = { 0: [0, 255, 0], 1: [255, 180, 0], 2: [255, 70, 0], 3: [255, 0, 0], 4: [0, 60, 255] };
const blinkOn = t => (t * 2 | 0) % 2 === 0;

// IR 리모컨 (NEC, 주소 0x00) — 흔한 21키 소형 리모컨
export const IR_KEYS = [['CH-', 0x45], ['CH', 0x46], ['CH+', 0x47], ['⏮', 0x44], ['⏭', 0x40], ['⏯', 0x43], ['VOL-', 0x07], ['VOL+', 0x15], ['EQ', 0x09], ['0', 0x16], ['100+', 0x19], ['200+', 0x0D], ['1', 0x0C], ['2', 0x18], ['3', 0x5E], ['4', 0x08], ['5', 0x1C], ['6', 0x5A], ['7', 0x42], ['8', 0x52], ['9', 0x4A]];
export const irName = c => (IR_KEYS.find(k => k[1] === c) || ['?'])[0];

// ───────── 전원 핀 줄 ─────────
const G = (mod = '-') => ({ mod, uno: 'GND', esp: 'GND' });
const V = (mod = '+', esp = '3V3', note = '') => ({ mod, uno: '5V', esp, note });

const CMP_PINS = [{ mod: 'DO', uno: 'D2', esp: 'GPIO32', sig: 'DO' }, V('+'), G('G'), { mod: 'AO', uno: 'A0', esp: 'GPIO36', sig: 'AO', note: 'ESP32 SVP (ADC1)' }];

/* ═══════════════════════ 40종 ═══════════════════════ */
export const SENSORS = [
// 1 ──────────────────────────────
{
  n: 1, key: 'ultrasonic', name: '초음파 거리 센서', model: 'HC-SR04', cat: 'bus', pcb: 'blue', glyph: 'ultra', wide: true,
  desc: '40kHz 초음파를 쏘고 되돌아오는 시간(Echo 펄스 폭)으로 거리를 잽니다. 거리 = 시간 × 음속 ÷ 2.',
  spec: ['측정 거리 2~400cm (매뉴얼 500cm)', '전원 5V', 'Trig 10µs 펄스 → Echo HIGH 시간 = 왕복 시간', '음속 343m/s (20°C) = 0.0343cm/µs'],
  pins: [V('VCC', '5V(VIN)', 'HC-SR04는 5V 필요'), { mod: 'Trig', uno: 'D12', esp: 'GPIO21', sig: 'TRIG' }, { mod: 'Echo', uno: 'D13', esp: 'GPIO22', sig: 'ECHO', note: 'ESP32: Echo는 5V 출력 → 10kΩ/10kΩ 분배로 2.5V로 낮춰 연결' }, G('GND')],
  notes: ['ESP32 입력은 3.3V까지예요. Echo 핀은 반드시 분배기를 거쳐 연결하세요.', '기온이 바뀌면 음속이 바뀌어 거리 오차가 생겨요 (1°C당 약 0.18%).', '부드러운 천·비스듬한 면은 초음파가 돌아오지 않아 0(측정 실패)이 나올 수 있어요.'],
  use: '배터리함·충전 구역에 사람이나 물체가 다가오면 경고합니다. 정비 중 접근 경보, 랙 문 앞 감시에 쓸 수 있어요.',
  ctrls: [{ k: 'dist', t: 'range', label: '물체 거리', min: 1, max: 450, step: 1, unit: 'cm', def: 80 }, { k: 'air', t: 'range', label: '기온 (음속에 영향)', min: 0, max: 40, step: 1, unit: '°C', def: 20 }, { k: 'soft', t: 'toggle', label: '부드러운 천(반사 약함)' }],
  period: 100,
  auto(t, e) { const c = t % 40; e.dist = c < 25 ? 150 - 5.6 * c : 10 + (c - 25) * 9.5; e.soft = false; },
  sim(e, s, x) {
    const v = (331.3 + 0.606 * e.air) * 1e-4; // cm/µs
    let us = (e.dist < 2 || e.dist > 400) ? 0 : 2 * e.dist / v;
    if (e.soft && Math.random() < 0.6) us = 0;
    if (us && x.noise > 0.6 && Math.random() < (x.noise - 0.6)) us = 0;
    if (us) us += gauss() * 6 * x.noise;
    return { ch: { echo: { k: 'n', v: Math.max(0, Math.round(us)) } }, fx: { open: 0, short: 0 } };
  },
  read(r) { const us = r.echo; return { echo_us: us, dist_cm: us === 0 ? -1 : r1(us * 0.0343 / 2) }; },
  show: [{ k: 'dist_cm', label: '거리', unit: 'cm', dp: 1 }, { k: 'echo_us', label: 'Echo 펄스', unit: 'µs', dp: 0 }],
  plot: [{ k: 'dist_cm', label: '거리', min: 0, max: 200, unit: 'cm' }],
  rules: [{ k: 'dist_cm', dir: 'lo', th: [40, 20, 10], name: '물체 접근', unit: 'cm', skip: v => v < 0 }],
  code: (s, B) => `${head(s, B, B.esp ? ['Echo(5V) → 10kΩ → GPIO' + pinOf(s, 'ECHO', B) + ' → 10kΩ → GND 로 분배해 연결'] : [])}
const int TRIG_PIN = ${pinOf(s, 'TRIG', B)};
const int ECHO_PIN = ${pinOf(s, 'ECHO', B)};
const unsigned long TIMEOUT_US = 30000;   // 약 5m 왕복 시간. 넘으면 0을 돌려줌
const float SOUND_CM_PER_US = 0.0343;    // 20°C 음속 343m/s

void setup() {
  Serial.begin(${B.baud});
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
}

void loop() {
  // 1) Trig에 10µs HIGH 펄스를 보내 초음파 발사
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // 2) Echo가 HIGH인 시간 = 왕복 시간
  unsigned long us = pulseIn(ECHO_PIN, HIGH, TIMEOUT_US);
  float cm = (us == 0) ? -1 : us * SOUND_CM_PER_US / 2.0;   // -1 = 측정 실패

  Serial.print("echo_us:");  Serial.print(us);
  Serial.print(",dist_cm:"); Serial.println(cm, 1);
  delay(100);
}
`,
},
// 2 ──────────────────────────────
{
  n: 2, key: 'pir', name: '적외선 인체감지 센서', model: 'HC-SR501', cat: 'din', pcb: 'green', glyph: 'pir',
  desc: '사람 몸에서 나오는 적외선의 변화(움직임)를 감지하면 OUT이 정해진 시간 동안 HIGH가 됩니다. 가만히 있으면 감지하지 못해요.',
  spec: ['감지 거리 최대 약 7m, 각도 120°', '전원 5~20V (출력은 3.3V)', '유지 시간·감도는 기판의 가변저항 2개로 조절', '전원 투입 후 약 30~60초는 안정화 시간'],
  pins: [G('GND'), { mod: 'OUT', uno: 'D2', esp: 'GPIO32', sig: 'S', note: '출력이 3.3V라 ESP32에 바로 연결 가능' }, V('VCC', '5V(VIN)', '전원은 5V')],
  notes: ['전원을 켠 직후 30초 정도는 저절로 감지될 수 있어요. 기다린 뒤 시험하세요.', '유리창 너머 사람은 감지하지 못해요 (유리가 원적외선을 막음).'],
  use: '배터리실 출입·정비 인원 감지. 사람이 있을 때는 경보음을 줄이거나, 무인일 때 이상이 생기면 원격 알림을 보내는 데 쓸 수 있어요.',
  ctrls: [{ k: 'walk', t: 'hold', label: '사람 지나가기' }, { k: 'dist', t: 'range', label: '사람 거리', min: 0.5, max: 10, step: 0.5, unit: 'm', def: 3 }, { k: 'holdT', t: 'range', label: '유지 시간 (가변저항)', min: 1, max: 20, step: 1, unit: 's', def: 3 }],
  period: 100,
  auto(t, e) { const c = t % 15; e.walk = c > 3 && c < 5.5; e.dist = 2 + 4 * (0.5 + 0.5 * Math.sin(t / 20)); },
  sim(e, s, x) {
    s.until = s.until || 0;
    if (e.walk && e.dist <= 7) s.until = x.t + e.holdT;           // 움직이는 동안 계속 연장 (재트리거)
    if (Math.random() < x.noise * 0.004) s.until = x.t + e.holdT;  // 열 잡음 오감지
    const out = x.t < s.until ? 1 : 0;
    return { ch: { S: { k: 'd', v: out } }, led: { sig: !!out } };
  },
  read(r, s) { return dig(r.S, 1, s); },
  show: [{ k: 'motion', label: '움직임', unit: '', bool: ['없음', '감지'] }, { k: 'count', label: '감지 횟수', unit: '회' }],
  plot: [{ k: 'motion', label: 'OUT', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'motion', dir: 'flag', eq: 1, lv: 1, name: '사람 감지' }],
  code: (s, B) => codeDigital(s, B, { pinName: 'PIR_PIN', active: 'HIGH', key: 'motion', what: '움직임 감지', notes: ['전원을 켠 뒤 30초쯤 기다린 다음 시험하세요'] }),
},
// 3 ──────────────────────────────
{
  n: 3, key: 'accel', name: '아날로그 가속도 센서', model: 'ADXL335', cat: 'ain', pcb: 'blue', glyph: 'accel',
  desc: 'X·Y·Z 세 축의 가속도를 전압으로 냅니다. 가만히 있으면 중력(1g)만 느끼므로 기울기(Pitch·Roll)를 구할 수 있어요.',
  spec: ['측정 범위 ±3g', '전원 3.3V', '0g = 전원의 절반(1.65V), 감도 약 330mV/g', 'Pitch = atan(x / √(y²+z²)), Roll = atan(y / √(x²+z²))'],
  pins: [V('VCC', '3V3', 'Uno도 3.3V 핀에 연결 (5V 금지)'), { mod: 'X_OUT', uno: 'A1', esp: 'GPIO36', sig: 'X', note: 'ESP32 SVP' }, { mod: 'Y_OUT', uno: 'A2', esp: 'GPIO39', sig: 'Y', note: 'ESP32 SVN' }, { mod: 'Z_OUT', uno: 'A3', esp: 'GPIO32', sig: 'Z' }, G('GND')],
  notes: ['이 모듈은 3.3V 전용이에요. Uno에서도 5V가 아닌 3.3V 핀에 연결하세요.', '매뉴얼 코드의 analogReference(EXTERNAL)는 AREF 배선이 필요해요. 여기서는 기본 기준 전압으로 계산합니다.'],
  use: '배터리 팩의 기울어짐·전복·낙하 충격을 감지합니다. 차량·이동형 ESS에서 충격 후 점검 알림에 쓸 수 있어요.',
  ctrls: [{ k: 'pitch', t: 'range', label: '앞뒤 기울기 (Pitch)', min: -90, max: 90, step: 1, unit: '°', def: 0 }, { k: 'roll', t: 'range', label: '좌우 기울기 (Roll)', min: -90, max: 90, step: 1, unit: '°', def: 0 }, { k: 'shake', t: 'hold', label: '흔들기 (충격)' }],
  period: 100, nz: 0.006,
  auto(t, e) { e.pitch = 12 * Math.sin(t / 5); e.roll = 8 * Math.sin(t / 7 + 1); const c = t % 30; e.shake = c > 20 && c < 21.2; if (c > 24 && c < 28) e.roll = 50; },
  sim(e, s, x) {
    const p = e.pitch * Math.PI / 180, q = e.roll * Math.PI / 180;
    let g = [Math.sin(p), Math.sin(q) * Math.cos(p), Math.cos(q) * Math.cos(p)];
    if (e.shake) g = g.map(v => v + gauss() * 1.2);
    const vc = 1.65, k = 0.33; // 3.3V 전원 고정
    const ch = {}; ['X', 'Y', 'Z'].forEach((n, i) => { ch[n] = { k: 'a', v: clamp(vc + k * g[i], 0.05, 3.25) }; });
    return { ch, vis: { pitch: e.pitch, roll: e.roll } };
  },
  read(r, s, x) {
    const g = ['X', 'Y', 'Z'].map(n => (r[n].mv - 1650) / 330);
    const [gx, gy, gz] = g; const d = 180 / Math.PI;
    return { x_g: r1(gx, 2), y_g: r1(gy, 2), z_g: r1(gz, 2), pitch: r1(Math.atan2(gx, Math.hypot(gy, gz)) * d), roll: r1(Math.atan2(gy, Math.hypot(gx, gz)) * d), tilt: r1(Math.max(Math.abs(Math.atan2(gx, Math.hypot(gy, gz)) * d), Math.abs(Math.atan2(gy, Math.hypot(gx, gz)) * d))), g_total: r1(Math.hypot(gx, gy, gz), 2) };
  },
  prints: ['x_g', 'y_g', 'z_g', 'pitch', 'roll'],
  show: [{ k: 'x_g', label: 'X', unit: 'g', dp: 2 }, { k: 'y_g', label: 'Y', unit: 'g', dp: 2 }, { k: 'z_g', label: 'Z', unit: 'g', dp: 2 }, { k: 'pitch', label: 'Pitch', unit: '°', dp: 1 }, { k: 'roll', label: 'Roll', unit: '°', dp: 1 }],
  plot: [{ k: 'x_g', label: 'X', min: -3, max: 3, unit: 'g' }, { k: 'y_g', label: 'Y', min: -3, max: 3, unit: 'g' }, { k: 'z_g', label: 'Z', min: -3, max: 3, unit: 'g' }],
  rules: [{ k: 'tilt', dir: 'hi', th: [15, 30, 45], name: '기울어짐', unit: '°' }, { k: 'g_total', dir: 'hi', th: [1.5, 2.0, 2.6], name: '충격', unit: 'g' }],
  code: (s, B) => `${head(s, B, ['모듈 전원은 3.3V에 연결 (0g = 1650mV, 감도 330mV/g)'])}
const int X_PIN = ${pinOf(s, 'X', B)};
const int Y_PIN = ${pinOf(s, 'Y', B)};
const int Z_PIN = ${pinOf(s, 'Z', B)};
${ADC_LINES(B)}
const float ZERO_G_MV = 1650.0;   // 가속도 0일 때 전압
const float MV_PER_G = 330.0;     // 1g당 전압 변화

float readG(int pin) { return (readMv(pin) - ZERO_G_MV) / MV_PER_G; }

void setup() {
  Serial.begin(${B.baud});
}

void loop() {
  float x = readG(X_PIN);
  float y = readG(Y_PIN);
  float z = readG(Z_PIN);
  // 매뉴얼의 Pitch·Roll 공식 (라디안 → 도)
  float pitch = atan2(x, sqrt(y * y + z * z)) * 180.0 / PI;
  float roll  = atan2(y, sqrt(x * x + z * z)) * 180.0 / PI;

  Serial.print("x_g:");    Serial.print(x, 2);
  Serial.print(",y_g:");   Serial.print(y, 2);
  Serial.print(",z_g:");   Serial.print(z, 2);
  Serial.print(",pitch:"); Serial.print(pitch, 1);
  Serial.print(",roll:");  Serial.println(roll, 1);
  delay(100);
}
`,
},
// 4 ──────────────────────────────
{
  n: 4, key: 'ds18b20', name: '디지털 온도 센서', model: 'DS18B20', cat: 'bus', pcb: 'black', glyph: 'probe',
  desc: '1-Wire 통신으로 온도를 디지털 값으로 보냅니다. BMS 보드가 GPIO4에 쓰는 바로 그 센서예요. 한 선에 여러 개를 함께 달 수 있어요.',
  spec: ['측정 범위 -55~+125°C', '정확도 ±0.5°C (-10~85°C)', '12비트 분해능 0.0625°C, 변환 최대 750ms', '+ 핀이 가운데 (-와 S 사이)'],
  pins: [G('-'), V('+ (가운데)', '3V3'), { mod: 'S', uno: 'D10', esp: 'GPIO4', sig: 'S', note: 'BMS 보드의 온도센서와 같은 1-Wire 버스에 함께 연결 가능' }],
  libs: [{ name: 'OneWire', q: 'OneWire' }, { name: 'DallasTemperature', q: 'DallasTemperature' }],
  notes: ['값이 -127이면 센서가 안 보이는 것 (배선·풀업 확인). 85.0이 계속 나오면 변환 전에 읽은 값이에요.', 'BMS 펌웨어와 같은 판정: 32/38/45°C, 상승률 1/3/6°C/분, 5분 안에 45°C 도달 예측 시 경고.'],
  use: 'BMS의 핵심 온도 감시. 셀마다 하나씩 붙여 1-Wire 한 선으로 여러 지점을 잴 수 있고, 상승률로 열폭주 전조를 예측합니다.',
  ctrls: TEMP_CTRLS(-10, 85, 25),
  period: 1000,
  auto: tempAuto,
  sim(e, s, x) { const t = tempSim(e, s, x.dt); return { ch: { t: { k: 'n', v: Math.round((t + gauss() * 0.06 * x.noise * 3) * 16) / 16 } }, fx: { open: -127, short: 85 }, vis: { temp: t } }; },
  read(r, s, x) {
    const t = r.t; if (t === -127) return { temp_c: -127, rate: 0, eta_min: -1, err: 1 };
    const rate = rateOf(s, t, x.t); const eta = rate > 0.05 && t < 45 ? (45 - t) / rate : -1;
    return { temp_c: r1(t, 2), rate: r1(rate, 2), eta_min: r1(eta, 1), err: 0 };
  },
  show: [{ k: 'temp_c', label: '온도', unit: '°C', dp: 2 }, { k: 'rate', label: '상승률', unit: '°C/분', dp: 2 }, { k: 'eta_min', label: '45°C까지', unit: '분', dp: 1, neg: '—' }],
  plot: [{ k: 'temp_c', label: '온도', min: 20, max: 50, unit: '°C' }],
  rules: [...TEMP_RULES, { k: 'rate', dir: 'hi', th: [1, 3, 6], name: '온도 상승률', unit: '°C/분' }, { k: 'eta_min', dir: 'lo', th: [null, 5, null], name: '열폭주 예측', unit: '분', skip: v => v < 0 }, { k: 'err', dir: 'flag', eq: 1, lv: 2, name: '온도센서 미검출' }],
  code: (s, B) => `${head(s, B, ['라이브러리: OneWire, DallasTemperature (라이브러리 매니저에서 설치)', '모듈에 4.7kΩ 풀업이 있어 따로 저항이 필요 없어요'])}
#include <OneWire.h>
#include <DallasTemperature.h>

const int ONE_WIRE_PIN = ${pinOf(s, 'S', B)};
const unsigned long PERIOD_MS = 1000;
const int RATE_WINDOW = 30;          // 30초 전 값과 비교해 상승률 계산
const float DANGER_C = 45.0;         // BMS 위험 온도

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

float hist[RATE_WINDOW];
int histCount = 0, histIdx = 0;
unsigned long lastMs = 0;

void setup() {
  Serial.begin(${B.baud});
  sensors.begin();
}

void loop() {
  if (millis() - lastMs < PERIOD_MS) return;   // 1초마다
  lastMs = millis();

  sensors.requestTemperatures();               // 변환 시작 (최대 750ms 대기)
  float t = sensors.getTempCByIndex(0);        // 첫 번째 센서
  if (t == DEVICE_DISCONNECTED_C) {            // -127 = 센서 없음
    Serial.println("temp_c:-127,err:1");
    return;
  }

  // 상승률(°C/분): 버퍼가 차면 가장 오래된 값(30초 전)과 비교
  float rate = 0;
  if (histCount == RATE_WINDOW) rate = (t - hist[histIdx]) * 60.0 / RATE_WINDOW;
  hist[histIdx] = t;
  histIdx = (histIdx + 1) % RATE_WINDOW;
  if (histCount < RATE_WINDOW) histCount++;

  // 이 속도라면 위험 온도까지 몇 분? (-1 = 오르지 않음)
  float eta = (rate > 0.05 && t < DANGER_C) ? (DANGER_C - t) / rate : -1;

  Serial.print("temp_c:");   Serial.print(t, 2);
  Serial.print(",rate:");    Serial.print(rate, 2);
  Serial.print(",eta_min:"); Serial.print(eta, 1);
  Serial.println(",err:0");
}
`,
},
// 5 ──────────────────────────────
{
  n: 5, key: 'vibration', name: '진동 센서', model: 'SW-18015P', cat: 'din', pcb: 'black', glyph: 'spring',
  desc: '스프링 스위치가 흔들리면 순간적으로 접점이 붙었다 떨어집니다. 평소 HIGH, 진동 때 짧은 LOW 펄스가 생겨요.',
  spec: ['스프링형 진동 스위치', '최대 12V, 20mA', '평소 HIGH → 진동 시 LOW 펄스 (매뉴얼 코드 기준)', '펄스가 매우 짧아 인터럽트로 세는 게 정확'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S', note: 'Uno D3 = 인터럽트 1번' }],
  notes: ['펄스가 수 ms라 delay()가 긴 코드에서는 놓쳐요. 인터럽트로 셉니다.'],
  use: '팩 낙하·충돌·운송 중 진동을 기록합니다. 일정 횟수 이상 충격이 쌓이면 점검 알림을 낼 수 있어요.',
  ctrls: [{ k: 'shake', t: 'hold', label: '흔들기' }, { k: 'level', t: 'range', label: '진동 세기', min: 0, max: 100, step: 1, unit: '%', def: 50 }],
  period: 200,
  auto(t, e) { const c = t % 20; e.shake = (c > 5 && c < 7) || (c > 14 && c < 14.6); e.level = c > 14 ? 95 : 40; },
  sim(e, s, x) {
    const lam = (e.shake ? e.level / 100 * 60 : 0) + x.noise * 0.3;  // 초당 펄스 수
    let n = 0; let p = lam * x.dt; while (Math.random() < p && n < 20) { n++; p *= 0.85; }
    s.acc = (s.acc || 0) + n;
    return { ch: { S: { k: 'd', v: n > 0 ? 0 : 1 } }, led: { sig: n > 0 } };
  },
  read(r, s, x) { const hits = s.acc || 0; s.acc = 0; return { pin: r.S, hits, hz: r1(hits / (x.period / 1000), 1) }; },
  show: [{ k: 'hits', label: '펄스(0.2초)', unit: '회' }, { k: 'hz', label: '진동 빈도', unit: '회/초', dp: 1 }],
  plot: [{ k: 'hz', label: '진동 빈도', min: 0, max: 60, unit: '회/초' }],
  rules: [{ k: 'hz', dir: 'hi', th: [2, 10, 30], name: '진동·충격', unit: '회/초' }],
  code: (s, B) => codePulse(s, B, { pinName: 'VIB_PIN', period: 200, edge: 'FALLING', pullup: false, body: `  float hz = n * 1000.0 / PERIOD_MS;  // 초당 펄스 수

  Serial.print("pin:");   Serial.print(pin);
  Serial.print(",hits:"); Serial.print(n);
  Serial.print(",hz:");   Serial.println(hz, 1);` }),
},
// 6 ──────────────────────────────
{
  n: 6, key: 'hall3144', name: '홀 자기 센서', model: 'A3144 (KY-003)', cat: 'din', pcb: 'black', glyph: 'hall',
  desc: '자석의 S극이 가까이 오면 출력이 LOW가 되는 스위치형 홀 센서입니다. 바퀴·팬에 자석을 붙이면 회전수를 셀 수 있어요.',
  spec: ['동작 자속 약 150G에서 ON, 100G 이하에서 OFF (히스테리시스)', 'S극에만 반응', '출력: 오픈 컬렉터 (모듈에 풀업 저항)', '감지 시 LOW + 모듈 LED 켜짐'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S', note: '인터럽트로 회전수 측정' }],
  notes: ['N극을 대면 반응하지 않아요. 자석을 뒤집어 보세요.', '매뉴얼 코드는 HIGH일 때 LED를 켜는데, 실제 모듈은 감지 시 LOW예요.'],
  use: '냉각팬 회전수 감시: 팬이 멈추면 과열 전에 경고합니다. 문 열림(자석) 감지에도 쓸 수 있어요.',
  ctrls: [{ k: 'mode', t: 'select', label: '실험', opts: [['fan', '냉각팬 회전 (자석 1개)'], ['mag', '자석 직접 가까이']], def: 'fan' }, { k: 'rpm', t: 'range', label: '팬 회전수', min: 0, max: 3000, step: 50, unit: 'rpm', def: 1800 }, { k: 'dist', t: 'range', label: '자석 거리', min: 0, max: 40, step: 1, unit: 'mm', def: 25 }, { k: 'pole', t: 'select', label: '자석 극', opts: [['S', 'S극'], ['N', 'N극']], def: 'S' }],
  period: 500,
  auto(t, e) { e.mode = 'fan'; const c = t % 60; e.rpm = c < 25 ? 1800 : c < 40 ? Math.max(0, 1800 - (c - 25) * 130) : c < 48 ? 0 : 1800; },
  sim(e, s, x) {
    let on;
    if (e.mode === 'fan') {
      s.ph = (s.ph || 0) + e.rpm / 60 * x.dt; const k = Math.floor(s.ph); s.acc = (s.acc || 0) + (k - (s.k || 0)); s.k = k;
      on = e.rpm > 0 ? (s.ph % 1) < 0.15 : false;
    } else {
      const b = e.pole === 'S' ? field(e.dist) : 0; s.on = s.on ? b > 100 : b > 150; on = s.on;
      if (on && !s.prev) s.acc = (s.acc || 0) + 1; s.prev = on;
    }
    return { ch: { S: { k: 'd', v: on ? 0 : 1 } }, led: { sig: on }, vis: { rot: s.ph || 0 } };
  },
  read(r, s, x) { const n = s.acc || 0; s.acc = 0; return { pin: r.S, magnet: r.S === 0 ? 1 : 0, rpm: Math.round(n * 60000 / x.period) }; },
  show: [{ k: 'magnet', label: '자석', bool: ['없음', '감지'] }, { k: 'rpm', label: '회전수', unit: 'rpm' }],
  plot: [{ k: 'rpm', label: '회전수', min: 0, max: 3000, unit: 'rpm' }, { k: 'magnet', label: '자석', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'rpm', dir: 'lo', th: [1000, 600, 120], name: '냉각팬 회전 저하', unit: 'rpm', when: e => e.mode === 'fan' }],
  code: (s, B) => codePulse(s, B, { pinName: 'HALL_PIN', period: 500, edge: 'FALLING', pullup: true, perRev: 1, perRevNote: '팬에 자석 1개', body: `  int magnet = (pin == LOW) ? 1 : 0;   // S극이 가까우면 LOW
  float rpm = n * 60000.0 / PERIOD_MS / PULSES_PER_REV;

  Serial.print("pin:");     Serial.print(pin);
  Serial.print(",magnet:"); Serial.print(magnet);
  Serial.print(",rpm:");    Serial.println(rpm, 0);` }),
},
// 7 ──────────────────────────────
{
  n: 7, key: 'button', name: '리셋 버튼', model: 'KY-004', cat: 'din', pcb: 'black', glyph: 'button',
  desc: '택트 스위치 모듈입니다. 기계 접점은 누르는 순간 수 ms 동안 떨리므로(채터링) 디바운싱이 필요해요.',
  spec: ['모듈에 10kΩ 풀업 → 평소 HIGH, 누르면 LOW', '채터링 수~십 ms', '디바운싱 30ms 적용'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S' }],
  notes: ['모듈에 따라 누를 때 HIGH가 되는 제품도 있어요. 시리얼로 먼저 확인하세요.', 'BMS 보드는 GPIO13의 택트 스위치로 부하 ON/OFF·TRIP 리셋을 합니다.'],
  use: 'BMS의 TRIP 리셋 버튼. 차단 원인을 사람이 확인한 뒤에만 다시 켜지게 하는 래치 해제 입력이에요.',
  ctrls: [{ k: 'press', t: 'hold', label: '버튼 누르기' }, { k: 'bounce', t: 'toggle', label: '채터링 재현', def: true }],
  period: 100,
  auto(t, e) { const c = t % 6; e.press = c > 2 && c < 2.6; },
  sim(e, s, x) {
    if (e.press !== s.prevP) { s.bUntil = x.t + 0.03; s.prevP = e.press; }
    let v = e.press ? 0 : 1; if (e.bounce && x.t < s.bUntil) v = Math.random() < 0.5 ? 0 : 1;
    return { ch: { S: { k: 'd', v, pu: true } } };
  },
  read(r, s, x) { // 디바운싱: 30ms 동안 같은 값이면 확정
    if (r.S !== s.last) { s.chg = x.t; s.last = r.S; }
    if (s.stable == null) s.stable = 1;
    if (x.t - (s.chg || 0) >= 0.03 && r.S !== s.stable) { s.stable = r.S; if (s.stable === 0) s.cnt = (s.cnt || 0) + 1; }
    return { pin: r.S, pressed: s.stable === 0 ? 1 : 0, count: s.cnt || 0 };
  },
  show: [{ k: 'pressed', label: '버튼', bool: ['뗌', '누름'] }, { k: 'count', label: '누른 횟수', unit: '회' }, { k: 'pin', label: '핀 원값', unit: '' }],
  plot: [{ k: 'pin', label: '핀 원값', min: -0.2, max: 1.2, step: true }, { k: 'pressed', label: '디바운싱 후', min: -0.4, max: 1.4, step: true }],
  rules: [],
  code: (s, B) => `${head(s, B, ['채터링을 걸러 내는 디바운싱 예제'])}
const int BTN_PIN = ${pinOf(s, 'S', B)};
const unsigned long DEBOUNCE_MS = 30;   // 이 시간 동안 같은 값이면 확정
const unsigned long PRINT_MS = 100;

int stableState = HIGH;     // 확정된 상태 (HIGH = 뗌)
int lastRead = HIGH;
unsigned long changedAt = 0, lastPrint = 0;
long presses = 0;

void setup() {
  Serial.begin(${B.baud});
  pinMode(BTN_PIN, INPUT_PULLUP);   // 모듈 풀업 + 내부 풀업
}

void loop() {
  int r = digitalRead(BTN_PIN);
  if (r != lastRead) { changedAt = millis(); lastRead = r; }   // 값이 흔들리면 타이머 다시 시작
  if (millis() - changedAt >= DEBOUNCE_MS && r != stableState) {
    stableState = r;
    if (stableState == LOW) presses++;                       // 눌린 순간 1회
  }
  if (millis() - lastPrint >= PRINT_MS) {
    lastPrint = millis();
    Serial.print("pin:");      Serial.print(r);
    Serial.print(",pressed:"); Serial.print(stableState == LOW ? 1 : 0);
    Serial.print(",count:");   Serial.println(presses);
  }
}
`,
},
// 8 ──────────────────────────────
{
  n: 8, key: 'irtx', name: '적외선 발광 모듈', model: 'KY-005', cat: 'out', pcb: 'black', glyph: 'irled', isOut: true, evOut: true,
  desc: '940nm 적외선 LED로 리모컨 신호(38kHz로 깜빡이는 NEC 프레임)를 보냅니다. 눈에는 안 보이지만 휴대폰 카메라로 보면 보라색으로 보여요.',
  spec: ['파장 940nm', 'NEC 프레임: 9ms 리더 + 4.5ms 공백 + 32비트 (주소·명령)', '반송파 38kHz', '7컬러 플래시 LED와 모양이 비슷 — 기판에 구멍이 많은 쪽'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO22', sig: 'S', note: 'Uno: IRremote가 D3 고정 사용' }],
  libs: [{ name: 'IRremote (Armin Joachimsmeyer, 4.x)', q: 'IRremote' }],
  notes: ['Uno에서는 송신 핀이 D3로 고정이에요 (타이머 핀).', '23번 적외선 수신 모듈로 이 신호를 받아 볼 수 있어요.'],
  use: 'BMS가 위험을 감지하면 에어컨·환풍기를 리모컨 신호로 켜는 식으로, 적외선으로만 조작되는 기기를 제어할 수 있어요.',
  ctrls: [{ k: 'key', t: 'keypad', label: '보낼 버튼' }],
  period: 50,
  auto(t, e, s) { if ((t % 2) < 0.06 && (!s.lastA || t - s.lastA > 1)) { s.lastA = t; s.q = s.q || []; s.q.push(0x45); } },
  sim(e, s, x) {
    s.q = s.q || []; let on = false, sent = null;
    if (s.q.length && x.t - (s.lastSend || -9) > 0.15) { sent = s.q.shift(); s.lastSend = x.t; s.cmd = sent; }
    on = x.t - (s.lastSend || -9) < 0.07;
    return { ch: {}, led: { ir: on }, vis: { ir: on, cmd: s.cmd }, ev: sent != null ? { ir_tx: sent } : null };
  },
  read(r, s, x, ev) { const o = { led: x.t - (s.lastSend || -9) < 0.07 ? 1 : 0 }; if (ev) o.ir_tx = ev.ir_tx; return o; },
  evOnly: true, prints: ['ir_tx'],
  show: [{ k: 'ir_tx', label: '보낸 명령', unit: '', ir: true }, { k: 'led', label: 'IR LED', bool: ['꺼짐', '발광'] }],
  plot: [{ k: 'led', label: 'IR LED (프레임)', min: -0.2, max: 1.2, step: true }],
  rules: [],
  cmd: (e, s, key) => key != null ? String(key) : null,
  code: (s, B) => `${head(s, B, ['라이브러리: IRremote (4.x)', '시리얼로 명령 번호(0~255)를 보내면 NEC 신호로 송신. 예: 69 = CH-'])}
#include <IRremote.hpp>

const int IR_TX_PIN = ${pinOf(s, 'S', B)};        // ${B.esp ? '아무 출력 핀 가능' : 'Uno는 D3 고정 (타이머 핀)'}
const uint16_t IR_ADDR = 0x00;     // 소형 리모컨(NEC) 주소
const uint8_t DEMO_CMD = 0x45;     // 데모: 2초마다 CH- 송신

bool demo = true;
unsigned long lastSend = 0;

void sendCmd(uint8_t cmd) {
  IrSender.sendNEC(IR_ADDR, cmd, 0);   // 반복 0회
  Serial.print("ir_tx:");
  Serial.println(cmd);
}

void setup() {
  Serial.begin(${B.baud});
  Serial.setTimeout(20);
  IrSender.begin(IR_TX_PIN);
}

void loop() {
  if (Serial.available() > 0) {          // 예: "69"
    int cmd = Serial.parseInt();
    while (Serial.available()) Serial.read();
    demo = false;
    if (cmd >= 0 && cmd <= 255) sendCmd((uint8_t)cmd);
  }
  if (demo && millis() - lastSend >= 2000) {
    lastSend = millis();
    sendCmd(DEMO_CMD);
  }
}
`,
},
// 9 ──────────────────────────────
{
  n: 9, key: 'passivebuzzer', name: '수동 부저', model: 'KY-006', cat: 'out', pcb: 'black', glyph: 'buzzer', isOut: true,
  desc: '스스로 소리를 내지 못하고, 핀에 주는 사각파의 주파수대로 소리가 납니다. tone()으로 음 높이를 바꿀 수 있어요. BMS 보드의 경보 부저와 같은 종류예요.',
  spec: ['구동: 사각파 (tone())', '공진 주파수 약 2kHz에서 가장 큼', '출력 약 85~95dB'],
  pins: [G('-'), V('+', '3V3', '모듈에 따라 가운데 핀은 미연결'), { mod: 'S', uno: 'D11', esp: 'GPIO21', sig: 'S', note: 'BMS 보드는 GPIO25에 이미 부저 사용' }],
  notes: ['소리를 들으려면 오른쪽 위 스피커 버튼을 켜세요.', 'Uno에서 tone()은 타이머2를 써서 D3·D11 PWM과 함께 쓸 수 없어요.'],
  use: 'BMS 단계별 경보음: 경고는 2초마다 짧은 삑, 위험은 빠른 단속음. 위의 "BMS 단계"로 들어 보세요.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'freq', t: 'range', label: '주파수', min: 100, max: 5000, step: 10, unit: 'Hz', def: 2000 }, { k: 'on', t: 'toggle', label: '소리 켜기' }],
  period: 100,
  auto(t, e) { e.bms = String(Math.floor(t / 8) % 4); },
  sim(e, s, x) {
    let f = 0;
    if (e.bms === '') f = e.on ? e.freq : 0;
    else { const lv = +e.bms; const c = x.t % 2;
      if (lv === 2) f = c < 0.12 ? 2000 : 0;
      else if (lv === 3) f = (x.t * 4 | 0) % 2 ? 2600 : 1800;
      else if (lv === 4) f = (x.t % 1) < 0.25 ? 1200 : 0;
      else if (lv === 1) f = (x.t % 6) < 0.08 ? 1500 : 0; }
    return { ch: {}, tone: f, vis: { tone: f } };
  },
  read(r, s, x, ev, o) { return { freq: Math.round(o.tone || 0) }; },
  show: [{ k: 'freq', label: '출력 주파수', unit: 'Hz' }],
  plot: [{ k: 'freq', label: '주파수', min: 0, max: 5000, unit: 'Hz' }],
  rules: [],
  cmd: (e, s, key, o) => `${Math.round(o.tone || 0)},200`,
  code: (s, B) => codeOut(s, B, {
    example: '2000,200 → 2kHz 200ms, 0 → 끄기', demoMs: 2000,
    pins: `const int BUZZER_PIN = ${pinOf(s, 'S', B)};`,
    setFn: `void playTone(int freq, int ms) {
  if (freq > 0) tone(BUZZER_PIN, freq, ms);   // ms 동안 울리고 자동으로 멈춤
  else noTone(BUZZER_PIN);
  Serial.print("freq:");
  Serial.println(freq);
}`,
    setup: '  pinMode(BUZZER_PIN, OUTPUT);',
    parse: `    int f = Serial.parseInt();
    int ms = Serial.parseInt();
    playTone(f, ms > 0 ? ms : 200);`,
    demo: '    playTone(2000, 120);          // BMS 경고음: 2초마다 짧은 삑',
  }),
},
// 10 ─────────────────────────────
{
  n: 10, key: 'laser', name: '레이저 발광', model: 'KY-008', cat: 'out', pcb: 'black', glyph: 'laser', isOut: true,
  desc: '650nm 빨간 레이저 다이오드입니다. 핀을 HIGH로 하면 켜져요. 조도 센서(19번)와 짝지으면 레이저 감시선(트립와이어)을 만들 수 있어요.',
  spec: ['파장 650nm, 출력 5mW 미만', 'S = HIGH → 발광', '소비 전류 약 30mA'],
  pins: [G('-'), V('+', '3V3', '모듈에 따라 미연결'), { mod: 'S', uno: 'D10', esp: 'GPIO21', sig: 'S' }],
  notes: ['레이저를 눈이나 사람에게 비추지 마세요.', 'GPIO 하나의 권장 전류(약 20mA)를 넘을 수 있어 오래 켜 둘 때는 트랜지스터로 구동하세요.'],
  use: '조도 센서와 함께 배터리실 출입 감시선을 만들거나, 위험 단계에서 깜빡이는 시각 경보로 쓸 수 있어요.',
  ctrls: [{ k: 'on', t: 'toggle', label: '레이저 켜기' }, { k: 'blink', t: 'toggle', label: '1초 깜빡임' }],
  period: 100,
  auto(t, e) { e.on = true; e.blink = true; },
  sim(e, s, x) { const on = e.on && (!e.blink || (x.t % 2) < 1); return { ch: {}, led: { laser: on }, vis: { laser: on } }; },
  read(r, s, x, ev, o) { return { laser: o.vis.laser ? 1 : 0 }; },
  show: [{ k: 'laser', label: '레이저', bool: ['꺼짐', '켜짐'] }],
  plot: [{ k: 'laser', label: '레이저', min: -0.2, max: 1.2, step: true }],
  rules: [],
  cmd: (e, s, k, o) => String(o.vis.laser ? 1 : 0),
  code: (s, B) => codeDigitalOut(s, B, 'LASER_PIN', 'laser', ['레이저를 눈에 비추지 마세요']),
},
// 11 ─────────────────────────────
{
  n: 11, key: 'rgbsmd', name: 'RGB SMD LED 모듈', model: 'KY-009', cat: 'out', pcb: 'black', glyph: 'smd', isOut: true,
  desc: '빨강·초록·파랑 세 LED가 한 칩에 들어 있어 PWM 세기를 섞으면 여러 색을 낼 수 있어요 (공통 음극).',
  spec: ['공통 음극 (- = GND)', 'R·G·B 각각 PWM 0~255', '모듈에 저항이 없는 제품이 많음 → 핀마다 220Ω 직렬'],
  pins: [G('-'), { mod: 'R', uno: 'D11', esp: 'GPIO21', sig: 'R', note: '220Ω 직렬' }, { mod: 'G', uno: 'D10', esp: 'GPIO22', sig: 'G', note: '220Ω 직렬' }, { mod: 'B', uno: 'D9', esp: 'GPIO5', sig: 'B', note: '220Ω 직렬' }],
  notes: ['저항 없이 연결하면 LED와 핀이 상할 수 있어요.', 'BMS 보드의 상태 LED(GPIO27·14·33)와 같은 방식이에요.'],
  use: 'BMS 상태 표시등: 정상 초록, 주의 노랑, 경고 주황(깜빡), 위험 빨강, TRIP 파랑. "BMS 단계 따라가기"로 확인하세요.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'r', t: 'range', label: '빨강 R', min: 0, max: 255, step: 1, unit: '', def: 0 }, { k: 'g', t: 'range', label: '초록 G', min: 0, max: 255, step: 1, unit: '', def: 255 }, { k: 'b', t: 'range', label: '파랑 B', min: 0, max: 255, step: 1, unit: '', def: 0 }],
  period: 200,
  auto: rgbAuto, sim: rgbSim,
  read(r, s, x, ev, o) { const [R, Gc, Bc] = o.vis.rgb; return { r: R, g: Gc, b: Bc }; },
  show: [{ k: 'r', label: 'R', unit: '' }, { k: 'g', label: 'G', unit: '' }, { k: 'b', label: 'B', unit: '' }],
  plot: [{ k: 'r', label: 'R', min: 0, max: 255, color: '#d62f2f' }, { k: 'g', label: 'G', min: 0, max: 255, color: '#1e9e55' }, { k: 'b', label: 'B', min: 0, max: 255, color: '#2563c9' }],
  rules: [],
  cmd: (e, s, k, o) => o.vis.rgb.join(','),
  code: (s, B) => codeRgb(s, B),
},
// 12 ─────────────────────────────
{
  n: 12, key: 'photointerrupter', name: '포토인터럽터', model: 'KY-010', cat: 'din', pcb: 'black', glyph: 'slot',
  desc: 'U자 홈 한쪽의 적외선 LED 빛을 반대쪽 수광부가 받습니다. 홈 사이를 물체가 가리면 출력이 바뀌어요. 구멍 뚫린 원판을 돌리면 회전수를 잴 수 있어요.',
  spec: ['홈 폭 약 5mm', '가리면 HIGH (매뉴얼 코드 기준)', '원판 슬롯 20개 → 한 바퀴에 20펄스'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S', note: '인터럽트로 펄스 세기' }],
  notes: ['햇빛이 강하면 수광부가 잘못 반응할 수 있어요.'],
  use: '팬·펌프 회전수 측정, 커버가 닫혔는지(차광판) 감지하는 인터록으로 쓸 수 있어요.',
  ctrls: [{ k: 'block', t: 'hold', label: '홈 가리기' }, { k: 'spin', t: 'toggle', label: '슬롯 원판 돌리기' }, { k: 'rpm', t: 'range', label: '원판 회전수', min: 0, max: 600, step: 10, unit: 'rpm', def: 120 }],
  period: 500,
  auto(t, e) { e.spin = true; e.rpm = 150 + 120 * Math.sin(t / 8); },
  sim(e, s, x) {
    let on = !!e.block;
    if (e.spin) { s.ph = (s.ph || 0) + e.rpm / 60 * 20 * x.dt; const k = Math.floor(s.ph); s.acc = (s.acc || 0) + (k - (s.k || 0)); s.k = k; on = on || (s.ph % 1) < 0.5; }
    else if (on && !s.prev) s.acc = (s.acc || 0) + 1;
    s.prev = on;
    return { ch: { S: { k: 'd', v: on ? 1 : 0 } }, led: { sig: on }, vis: { rot: (s.ph || 0) / 20 } };
  },
  read(r, s, x) { const n = s.acc || 0; s.acc = 0; return { blocked: r.S, pulses: n, rpm: Math.round(n * 60000 / x.period / 20) }; },
  show: [{ k: 'blocked', label: '홈', bool: ['열림', '가림'] }, { k: 'pulses', label: '펄스(0.5초)', unit: '개' }, { k: 'rpm', label: '회전수', unit: 'rpm' }],
  plot: [{ k: 'rpm', label: '회전수', min: 0, max: 600, unit: 'rpm' }],
  rules: [],
  code: (s, B) => codePulse(s, B, { pinName: 'SLOT_PIN', period: 500, edge: 'RISING', pullup: false, perRev: 20, perRevNote: '원판 슬롯 20개', body: `  float rpm = n * 60000.0 / PERIOD_MS / PULSES_PER_REV;

  Serial.print("blocked:"); Serial.print(pin);   // 1 = 가려짐
  Serial.print(",pulses:"); Serial.print(n);
  Serial.print(",rpm:");    Serial.println(rpm, 0);` }),
},
// 13 ─────────────────────────────
{
  n: 13, key: 'dual3', name: '듀얼 컬러 LED 3mm', model: 'KY-011', cat: 'out', pcb: 'black', glyph: 'led2', isOut: true,
  desc: '빨강·초록 LED가 하나로 묶인 공통 음극 LED입니다. 둘을 섞으면 노랑·주황도 낼 수 있어요.',
  spec: ['공통 음극', 'R·G PWM', '핀마다 220Ω 직렬 권장'],
  pins: [G('-'), { mod: 'G', uno: 'D11', esp: 'GPIO21', sig: 'G', note: '220Ω 직렬' }, { mod: 'R', uno: 'D10', esp: 'GPIO22', sig: 'R', note: '220Ω 직렬' }],
  notes: ['기판의 핀 표시(G·R)를 먼저 확인하세요. 매뉴얼은 가운데가 R, 끝이 G예요.'],
  use: '두 색만으로 BMS 상태 표시: 정상 초록, 주의 노랑(R+G), 경고 주황, 위험 빨강.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'r', t: 'range', label: '빨강 R', min: 0, max: 255, step: 1, unit: '', def: 0 }, { k: 'g', t: 'range', label: '초록 G', min: 0, max: 255, step: 1, unit: '', def: 255 }],
  period: 200, auto: rgbAuto, sim: (e, s, x) => dualSim(e, s, x),
  read(r, s, x, ev, o) { return { r: o.vis.rgb[0], g: o.vis.rgb[1] }; },
  show: [{ k: 'r', label: 'R', unit: '' }, { k: 'g', label: 'G', unit: '' }],
  plot: [{ k: 'r', label: 'R', min: 0, max: 255, color: '#d62f2f' }, { k: 'g', label: 'G', min: 0, max: 255, color: '#1e9e55' }],
  rules: [], cmd: (e, s, k, o) => `${o.vis.rgb[0]},${o.vis.rgb[1]}`,
  code: (s, B) => codeDual(s, B),
},
// 14 ─────────────────────────────
{
  n: 14, key: 'activebuzzer', name: '피에조 버저 (능동)', model: 'KY-012', cat: 'out', pcb: 'black', glyph: 'piezo', isOut: true,
  desc: '안에 발진 회로가 있어 HIGH만 주면 정해진 음(약 2.5kHz)으로 울립니다. 음 높이는 바꿀 수 없어요.',
  spec: ['HIGH → 연속음 약 2.5kHz', '음 높이 고정', '매뉴얼: - 와 + 표시가 반대로 된 제품이 있음'],
  pins: [{ mod: '-', uno: '5V', esp: '3V3', note: '매뉴얼 기준(표시가 반대인 제품). 스티커의 +를 확인' }, { mod: '+', uno: 'GND', esp: 'GND', note: '매뉴얼 기준' }, { mod: 'S', uno: 'D8', esp: 'GPIO21', sig: 'S' }],
  notes: ['버저 위 + 표시가 3핀 쪽을 향하면 매뉴얼처럼 -/+를 바꿔 연결해요. 반대면 정상 연결.', '소리를 들으려면 스피커 버튼을 켜세요.'],
  use: '가장 간단한 BMS 경보음. 위험 단계에서 단속음을 내도록 HIGH/LOW를 반복합니다.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'on', t: 'toggle', label: '울리기' }],
  period: 100,
  auto(t, e) { e.bms = String(Math.floor(t / 8) % 4); },
  sim(e, s, x) { let on = e.on; if (e.bms !== '') { const lv = +e.bms; on = lv === 2 ? (x.t % 2) < 0.12 : lv === 3 ? (x.t * 4 | 0) % 2 === 0 : lv === 4 ? (x.t % 1) < 0.25 : lv === 1 ? (x.t % 6) < 0.08 : false; } return { ch: {}, tone: on ? 2500 : 0, vis: { tone: on ? 2500 : 0 } }; },
  read(r, s, x, ev, o) { return { buzz: o.tone ? 1 : 0 }; },
  show: [{ k: 'buzz', label: '부저', bool: ['조용', '울림'] }],
  plot: [{ k: 'buzz', label: '부저', min: -0.2, max: 1.2, step: true }],
  rules: [], cmd: (e, s, k, o) => String(o.tone ? 1 : 0),
  code: (s, B) => codeDigitalOut(s, B, 'BUZZER_PIN', 'buzz', ['능동 부저: HIGH만 주면 정해진 음으로 울림']),
},
// 15 ─────────────────────────────
{
  n: 15, key: 'thermistor', name: '아날로그 온도 센서', model: 'KY-013 (NTC 서미스터)', cat: 'ain', pcb: 'black', glyph: 'therm',
  desc: '온도가 오르면 저항이 줄어드는 NTC 서미스터와 10kΩ 저항의 전압 분배입니다. 측정한 전압으로 저항을 구하고, Steinhart-Hart 식으로 온도를 계산해요.',
  spec: ['NTC 10kΩ (25°C)', '분배 저항 10kΩ', 'Steinhart-Hart: 1/T = A + B·lnR + C·(lnR)³', '매뉴얼 테스트: - 와 + 가 반대'],
  pins: [{ mod: '-', uno: '5V', esp: '3V3', note: '매뉴얼 기준 (표시가 반대)' }, { mod: '+', uno: 'GND', esp: 'GND', note: '매뉴얼 기준' }, { mod: 'S', uno: 'A0', esp: 'GPIO36', sig: 'S', note: 'ESP32 SVP (ADC1)' }],
  notes: ['매뉴얼대로 -를 전원, +를 GND에 연결해야 아래 식과 맞아요 (온도가 오르면 값이 커짐).', 'ESP32 ADC는 0.1V 아래·3.1V 위를 잘 못 읽어요. 아주 뜨겁거나 차가우면 오차가 커져요.'],
  use: 'DS18B20보다 싸고 빠른 셀 표면 온도 측정. 여러 개를 ADC 핀에 나눠 달 수 있어요.',
  ctrls: TEMP_CTRLS(-20, 100, 25), period: 500, auto: tempAuto, nz: 0.004,
  sim(e, s, x) { const t = tempSim(e, s, x.dt); const rt = shRes(t); return { ch: { S: { k: 'a', v: x.B.vcc * 10000 / (10000 + rt) } }, vis: { temp: t } }; },
  read(r) {
    const mv = r.S.mv, vcc = r.B.vccMv; if (mv <= 1 || mv >= vcc - 1) return { raw: r.S.raw, temp_c: -999, err: 1 };
    const rt = 10000 * (vcc / mv - 1), x = Math.log(rt);
    return { raw: r.S.raw, temp_c: r1(1 / (SH.A + SH.B * x + SH.C * x ** 3) - 273.15, 2), err: 0 };
  },
  show: [{ k: 'temp_c', label: '온도', unit: '°C', dp: 2 }, { k: 'raw', label: 'ADC', unit: '' }],
  plot: [{ k: 'temp_c', label: '온도', min: 20, max: 50, unit: '°C' }, { k: 'raw', label: 'ADC', min: 0, max: 'adc', ghost: 'S' }],
  rules: [...TEMP_RULES, { k: 'err', dir: 'flag', eq: 1, lv: 2, name: '센서 이상 (범위 밖)' }],
  code: (s, B) => `${head(s, B, ['매뉴얼 기준 배선: 모듈 - → ' + (B.esp ? '3V3' : '5V') + ', + → GND (온도가 오르면 값이 커짐)'])}
const int THERM_PIN = ${pinOf(s, 'S', B)};
${ADC_LINES(B)}
const float SERIES_OHM = 10000.0;   // 모듈의 분배 저항
// 매뉴얼의 Steinhart-Hart 계수
const float SH_A = 0.001129148;
const float SH_B = 0.000234125;
const float SH_C = 0.0000000876741;

void setup() {
  Serial.begin(${B.baud});
}

void loop() {
  int raw = analogRead(THERM_PIN);
  float mv = readMv(THERM_PIN);
  if (mv <= 1 || mv >= VCC_MV - 1) {       // 단선·단락이면 계산 불가
    Serial.print("raw:"); Serial.print(raw);
    Serial.println(",temp_c:-999,err:1");
    delay(500);
    return;
  }
  float r = SERIES_OHM * (VCC_MV / mv - 1.0);   // 서미스터 저항
  float lnR = log(r);
  float tK = 1.0 / (SH_A + SH_B * lnR + SH_C * lnR * lnR * lnR);
  float tC = tK - 273.15;

  Serial.print("raw:");     Serial.print(raw);
  Serial.print(",temp_c:"); Serial.print(tC, 2);
  Serial.println(",err:0");
  delay(500);
}
`,
},
// 16 ─────────────────────────────
{
  n: 16, key: 'dht11', name: 'DHT11 온습도 센서', model: 'DHT11', cat: 'bus', pcb: 'black', glyph: 'dht',
  desc: '온도와 습도를 한 선(단선 통신)으로 보내는 디지털 센서입니다. 1초에 한 번보다 자주 읽으면 안 되고, 값은 1단위 정수예요.',
  spec: ['습도 20~90% (±5%)', '온도 0~50°C (±2°C)', '샘플링 1회/초 이하 (2초 권장)', '40비트 = 습도 2B + 온도 2B + 체크섬 1B'],
  pins: [{ mod: '-', uno: 'GND', esp: 'GND', note: '매뉴얼 표의 -/+ 표기는 반대로 되어 있어요. 기판 인쇄 기준으로 연결' }, V('+'), { mod: 'S', uno: 'A0', esp: 'GPIO32', sig: 'S', note: 'Uno: 매뉴얼처럼 A0를 디지털 핀으로 사용' }],
  libs: [{ name: 'DHT sensor library (Adafruit)', q: 'DHT sensor library' }],
  notes: ['1초 안에 다시 읽으면 이전 값이나 오류(NaN)가 나와요.', '체크섬 오류가 가끔 나면 배선을 짧게 하세요.'],
  use: '배터리실 습도·결로 감시. 습도가 높으면 단자 부식·누설 위험이 커지므로 주의·경고를 냅니다.',
  ctrls: [{ k: 'amb', t: 'range', label: '실내 온도', min: 0, max: 50, step: 0.5, unit: '°C', def: 24 }, { k: 'hum', t: 'range', label: '실내 습도', min: 20, max: 95, step: 1, unit: '%', def: 45 }, { k: 'breath', t: 'hold', label: '입김 불기' }],
  period: 2000,
  auto(t, e) { const c = t % 90; e.breath = c > 20 && c < 30; e.hum = 45 + 30 * Math.max(0, Math.sin((t - 40) / 25)); e.amb = 24 + 2 * Math.sin(t / 50); },
  sim(e, s, x) {
    s.t = approach(s.t ?? e.amb, e.breath ? e.amb + 4 : e.amb, x.dt, 6); s.h = approach(s.h ?? e.hum, e.breath ? Math.min(95, e.hum + 35) : e.hum, x.dt, 4);
    const bad = Math.random() < 0.02 + x.noise * 0.08;
    return { ch: { h: { k: 'n', v: bad ? NaN : clamp(Math.round(s.h + gauss() * 1.5 * x.noise), 5, 95) }, t: { k: 'n', v: bad ? NaN : Math.round(s.t + gauss() * 0.6 * x.noise) } }, fx: { open: NaN, short: NaN } };
  },
  read(r) { return isNaN(r.h) || isNaN(r.t) ? { err: 1 } : { hum: r.h, temp_c: r.t, err: 0 }; },
  show: [{ k: 'hum', label: '습도', unit: '%' }, { k: 'temp_c', label: '온도', unit: '°C' }, { k: 'err', label: '읽기 오류', bool: ['없음', 'NaN'] }],
  plot: [{ k: 'hum', label: '습도', min: 0, max: 100, unit: '%' }, { k: 'temp_c', label: '온도', min: 0, max: 50, unit: '°C', color: '#f6c047' }],
  rules: [{ k: 'hum', dir: 'hi', th: [70, 85, null], name: '습도(결로)', unit: '%' }, ...TEMP_RULES],
  code: (s, B) => `${head(s, B, ['라이브러리: DHT sensor library (Adafruit) — Adafruit Unified Sensor도 함께 설치'])}
#include <DHT.h>

const int DHT_PIN = ${pinOf(s, 'S', B)};
#define DHT_TYPE DHT11
const unsigned long PERIOD_MS = 2000;   // DHT11은 1초에 1번 이하로 읽기

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(${B.baud});
  dht.begin();
}

void loop() {
  delay(PERIOD_MS);
  float h = dht.readHumidity();
  float t = dht.readTemperature();     // 섭씨
  if (isnan(h) || isnan(t)) {          // 통신 실패·체크섬 오류
    Serial.println("err:1");
    return;
  }
  Serial.print("hum:");     Serial.print(h, 0);
  Serial.print(",temp_c:"); Serial.print(t, 0);
  Serial.println(",err:0");
}
`,
},
// 17 ─────────────────────────────
{
  n: 17, key: 'rgb5', name: 'RGB 컬러 LED', model: 'KY-016', cat: 'out', pcb: 'black', glyph: 'led', isOut: true,
  desc: '5mm RGB LED 모듈입니다. 11번 SMD 모듈과 쓰는 법이 같고, 이 모듈에는 보통 전류 제한 저항이 달려 있어요.',
  spec: ['공통 음극', 'R·G·B PWM 0~255', '확산형 렌즈 5mm'],
  pins: [G('-'), { mod: 'R', uno: 'D11', esp: 'GPIO21', sig: 'R' }, { mod: 'G', uno: 'D10', esp: 'GPIO22', sig: 'G' }, { mod: 'B', uno: 'D9', esp: 'GPIO5', sig: 'B' }],
  notes: ['기판에 저항이 없으면 핀마다 220Ω을 직렬로 넣으세요.'],
  use: 'BMS 상태 표시등 (정상 초록 → 주의 노랑 → 경고 주황 깜빡 → 위험 빨강 → TRIP 파랑 깜빡).',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'r', t: 'range', label: '빨강 R', min: 0, max: 255, step: 1, unit: '', def: 0 }, { k: 'g', t: 'range', label: '초록 G', min: 0, max: 255, step: 1, unit: '', def: 255 }, { k: 'b', t: 'range', label: '파랑 B', min: 0, max: 255, step: 1, unit: '', def: 0 }],
  period: 200, auto: rgbAuto, sim: rgbSim,
  read(r, s, x, ev, o) { const [R, Gc, Bc] = o.vis.rgb; return { r: R, g: Gc, b: Bc }; },
  show: [{ k: 'r', label: 'R', unit: '' }, { k: 'g', label: 'G', unit: '' }, { k: 'b', label: 'B', unit: '' }],
  plot: [{ k: 'r', label: 'R', min: 0, max: 255, color: '#d62f2f' }, { k: 'g', label: 'G', min: 0, max: 255, color: '#1e9e55' }, { k: 'b', label: 'B', min: 0, max: 255, color: '#2563c9' }],
  rules: [], cmd: (e, s, k, o) => o.vis.rgb.join(','),
  code: (s, B) => codeRgb(s, B),
},
// 18 ─────────────────────────────
{
  n: 18, key: 'mercury', name: '수은 기울기 스위치', model: 'KY-017', cat: 'din', pcb: 'black', glyph: 'mercury',
  desc: '유리관 속 수은 방울이 기울기에 따라 굴러가 두 전극을 잇거나 끊습니다. 일정 각도 이상 기울면 출력이 바뀌어요.',
  spec: ['기울면 HIGH (매뉴얼 코드 기준)', '전환 각도 약 15° (히스테리시스 있음)', '모듈 LED로 상태 확인'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D2', esp: 'GPIO32', sig: 'S' }],
  notes: ['수은이 들어 있어요. 깨지면 맨손으로 만지지 말고, 버릴 때는 유해 폐기물로 처리하세요.'],
  use: '배터리 팩이 넘어졌는지 감지 → 경고. 가속도 센서보다 단순하고 전기를 거의 쓰지 않아요.',
  ctrls: [{ k: 'ang', t: 'range', label: '기울기', min: -90, max: 90, step: 1, unit: '°', def: 0 }, { k: 'shake', t: 'hold', label: '흔들기' }],
  period: 100,
  auto(t, e) { e.ang = 30 * Math.sin(t / 4); e.shake = false; },
  sim(e, s, x) { const a = Math.abs(e.ang) + (e.shake ? Math.abs(gauss()) * 25 : 0); s.on = s.on ? a > 10 : a > 15; return { ch: { S: { k: 'd', v: s.on ? 1 : 0 } }, led: { sig: s.on }, vis: { ang: e.ang } }; },
  read(r, s) { return dig(r.S, 1, s, 'tilt'); },
  show: [{ k: 'tilt', label: '상태', bool: ['수평', '기울어짐'] }, { k: 'count', label: '기울어진 횟수', unit: '회' }],
  plot: [{ k: 'tilt', label: 'S', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'tilt', dir: 'flag', eq: 1, lv: 2, name: '팩 기울어짐' }],
  code: (s, B) => codeDigital(s, B, { pinName: 'TILT_PIN', active: 'HIGH', key: 'tilt', what: '기울어짐', notes: ['수은 스위치 — 깨지지 않게 주의'] }),
},
// 19 ─────────────────────────────
{
  n: 19, key: 'ldr', name: '조도 센서', model: 'KY-018 (CdS)', cat: 'ain', pcb: 'black', glyph: 'ldr',
  desc: '빛이 밝을수록 저항이 작아지는 CdS 광센서와 10kΩ의 전압 분배입니다. 밝을수록 값이 작아져요 (배선에 따라 반대).',
  spec: ['어두움 수십 kΩ ~ 밝음 수백 Ω', '저항 ≈ 10kΩ × (lux/10)^-0.7 (대략)', '분배 저항 10kΩ', '응답 수십 ms'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'A0', esp: 'GPIO36', sig: 'S' }],
  notes: ['lux 환산은 CdS마다 특성이 달라 대략값이에요. 비교·추세로 쓰세요.'],
  use: '배터리함 덮개가 열리면 빛이 들어오는 것을 감지 (덮개 열림 경보). 레이저(10번)와 짝지으면 출입 감시선.',
  ctrls: [{ k: 'lux', t: 'range', label: '밝기', min: 0, max: 3, step: 0.01, unit: 'lux', def: 2, log: true }, { k: 'cover', t: 'hold', label: '손으로 가리기' }, { k: 'torch', t: 'hold', label: '손전등 비추기' }],
  period: 100, nz: 0.006,
  auto(t, e) { const c = t % 40; e.lux = c < 15 ? 0.5 : c < 25 ? 2.6 : 1.6; e.cover = c > 32 && c < 36; e.torch = false; },
  sim(e, s, x) { const lux = e.cover ? 2 : e.torch ? 5000 : 10 ** e.lux; const rl = 10000 * Math.pow(Math.max(lux, 0.05) / 10, -0.7); return { ch: { S: { k: 'a', v: x.B.vcc * rl / (rl + 10000) } }, vis: { lux } }; },
  read(r) { const mv = r.S.mv, vcc = r.B.vccMv; if (mv <= 1 || mv >= vcc - 1) return { raw: r.S.raw, lux: mv <= 1 ? 99999 : 0 }; const rl = 10000 * mv / (vcc - mv); return { raw: r.S.raw, lux: r1(10 * Math.pow(rl / 10000, -1 / 0.7), 0) }; },
  show: [{ k: 'raw', label: 'ADC', unit: '' }, { k: 'lux', label: '추정 밝기', unit: 'lux' }],
  plot: [{ k: 'raw', label: 'ADC', min: 0, max: 'adc', ghost: 'S' }],
  rules: [{ k: 'lux', dir: 'hi', th: [200, null, null], name: '덮개 열림(빛 들어옴)', unit: 'lux' }],
  code: (s, B) => `${head(s, B)}
const int LDR_PIN = ${pinOf(s, 'S', B)};
${ADC_LINES(B)}
const float FIXED_OHM = 10000.0;   // 모듈의 분배 저항
const float R10_OHM = 10000.0;     // 10lux일 때 CdS 저항 (대략)
const float GAMMA = 0.7;           // CdS 감마 (제품마다 다름)

void setup() {
  Serial.begin(${B.baud});
}

void loop() {
  int raw = analogRead(LDR_PIN);
  float mv = readMv(LDR_PIN);
  float lux = 0;
  if (mv > 1 && mv < VCC_MV - 1) {
    float rLdr = FIXED_OHM * mv / (VCC_MV - mv);      // CdS 저항
    lux = 10.0 * pow(rLdr / R10_OHM, -1.0 / GAMMA);   // 대략적인 lux
  }
  Serial.print("raw:");  Serial.print(raw);
  Serial.print(",lux:"); Serial.println(lux, 0);
  delay(100);
}
`,
},
// 20 ─────────────────────────────
{
  n: 20, key: 'relay', name: '5V 릴레이', model: 'KY-019 (SRD-05VDC)', cat: 'out', pcb: 'blue', glyph: 'relay', isOut: true,
  desc: '작은 신호로 코일을 움직여 큰 전류의 접점을 붙였다 떼는 스위치입니다. 신호 HIGH → COM과 NO가 연결. BMS 보드가 부하를 끊는 바로 그 부품이에요.',
  spec: ['코일 5V, 입력 HIGH = 동작 (매뉴얼)', '접점 COM · NO(평소 열림) · NC(평소 닫힘)', '접점 정격 10A 250VAC / 30VDC (교육용으로는 저전압만)'],
  pins: [G('-'), V('+', '5V(VIN)', '코일 전원은 5V'), { mod: 'S', uno: 'D10', esp: 'GPIO21', sig: 'S', note: 'BMS 보드는 GPIO26 릴레이 사용 중' }],
  notes: ['실습에서는 220V 같은 높은 전압을 절대 연결하지 마세요.', 'ESP32 3.3V 신호로도 대부분 동작하지만, 안 되면 트랜지스터·로직 레벨 모듈을 쓰세요.'],
  use: 'BMS 보호 동작: 위험 단계면 릴레이를 끊고(TRIP) 사람이 리셋할 때까지 유지합니다. "BMS 단계 따라가기"로 확인하세요.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'on', t: 'toggle', label: '릴레이 ON (부하 연결)', def: true }],
  period: 200,
  auto(t, e) { e.bms = ['0', '1', '2', '3', '4', '0'][Math.floor(t / 6) % 6]; },
  sim(e, s, x) { const on = e.bms === '' ? !!e.on : +e.bms < 3; if (on !== s.prev) { s.click = x.t; s.prev = on; } return { ch: {}, led: { sig: on }, vis: { relay: on }, click: x.t - (s.click || -9) < 0.05 }; },
  read(r, s, x, ev, o) { return { relay: o.vis.relay ? 1 : 0 }; },
  show: [{ k: 'relay', label: '접점', bool: ['COM–NC (부하 끊김)', 'COM–NO (부하 연결)'] }],
  plot: [{ k: 'relay', label: '릴레이', min: -0.2, max: 1.2, step: true }],
  rules: [], cmd: (e, s, k, o) => String(o.vis.relay ? 1 : 0),
  code: (s, B) => codeDigitalOut(s, B, 'RELAY_PIN', 'relay', ['HIGH = COM–NO 연결 (부하 ON), LOW = 끊김', '높은 전압(220V)은 연결하지 마세요']),
},
// 21 ─────────────────────────────
{
  n: 21, key: 'balltilt', name: '기울기 센서 (볼)', model: 'KY-020', cat: 'din', pcb: 'black', glyph: 'ball',
  desc: '금속 통 안의 작은 공이 기울기에 따라 굴러 접점을 열고 닫습니다. 수은이 없어 안전하지만 흔들릴 때 출력이 많이 떨려요.',
  spec: ['기울면 HIGH (매뉴얼 코드 기준)', '흔들림에 민감 (채터링)', '전환 각도 약 20°'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D2', esp: 'GPIO32', sig: 'S' }],
  notes: ['출력이 떨리면 일정 시간 같은 값일 때만 인정하는 디바운싱을 넣으세요.'],
  use: '팩 전복 감지, 운반 중 기울어짐 기록. 수은 스위치 대체용.',
  ctrls: [{ k: 'ang', t: 'range', label: '기울기', min: -90, max: 90, step: 1, unit: '°', def: 0 }, { k: 'shake', t: 'hold', label: '흔들기' }],
  period: 100,
  auto(t, e) { e.ang = 35 * Math.sin(t / 5); e.shake = (t % 25) > 20 && (t % 25) < 22; },
  sim(e, s, x) { const a = Math.abs(e.ang); let on = s.on = s.on ? a > 14 : a > 20; if (e.shake) on = Math.random() < 0.5; return { ch: { S: { k: 'd', v: on ? 1 : 0 } }, led: { sig: on }, vis: { ang: e.ang } }; },
  read(r, s) { return dig(r.S, 1, s, 'tilt'); },
  show: [{ k: 'tilt', label: '상태', bool: ['수평', '기울어짐'] }, { k: 'count', label: '전환 횟수', unit: '회' }],
  plot: [{ k: 'tilt', label: 'S', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'tilt', dir: 'flag', eq: 1, lv: 2, name: '팩 기울어짐' }],
  code: (s, B) => codeDigital(s, B, { pinName: 'TILT_PIN', active: 'HIGH', key: 'tilt', what: '기울어짐' }),
},
// 22 ─────────────────────────────
{
  n: 22, key: 'minireed', name: '소형 리드 스위치', model: 'KY-021', cat: 'din', pcb: 'black', glyph: 'reed',
  desc: '유리관 속 두 금속 판이 자석에 끌려 붙는 스위치입니다. 자석이 가까우면 닫혀(LOW) 문·뚜껑 닫힘 감지에 많이 써요.',
  spec: ['자석 약 15mm 이내 → 닫힘', '모듈 10kΩ 풀업 → 닫히면 LOW', '전원 없이 동작하는 기계식 접점'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D2', esp: 'GPIO32', sig: 'S' }],
  notes: ['매뉴얼 코드는 HIGH에서 LED를 켜는데, 이 모듈은 자석이 있을 때 LOW예요.', '유리관이 얇아 다리를 꺾으면 깨질 수 있어요.'],
  use: '배터리함 문 인터록: 문(자석)이 열리면 감지 → 경고하고 부하를 끊어 감전·단락 사고를 막아요.',
  ctrls: [{ k: 'dist', t: 'range', label: '자석(문) 거리', min: 0, max: 60, step: 1, unit: 'mm', def: 5 }],
  period: 100,
  auto(t, e) { const c = t % 30; e.dist = c < 15 ? 5 : c < 22 ? 5 + (c - 15) * 7 : 5; },
  sim(e, s, x) { const b = field(e.dist); s.on = s.on ? b > 40 : b > 60; return { ch: { S: { k: 'd', v: s.on ? 0 : 1, pu: true } }, led: { sig: s.on }, vis: { mag: e.dist } }; },
  read(r, s) { const o = dig(r.S, 0, s, 'magnet'); o.door_open = o.magnet ? 0 : 1; return o; },
  prints: ['pin', 'magnet', 'count'],
  show: [{ k: 'magnet', label: '자석', bool: ['없음', '있음'] }, { k: 'door_open', label: '문', bool: ['닫힘', '열림'] }],
  plot: [{ k: 'pin', label: 'S 핀', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'door_open', dir: 'flag', eq: 1, lv: 2, name: '케이스 문 열림' }],
  code: (s, B) => codeDigital(s, B, { pinName: 'REED_PIN', active: 'LOW', key: 'magnet', what: '자석 가까움(접점 닫힘)', pullup: true, notes: ['magnet:0 이면 문 열림'] }),
},
// 23 ─────────────────────────────
{
  n: 23, key: 'irrx', name: '적외선 리모트 수신', model: 'KY-022 (VS1838B)', cat: 'bus', pcb: 'black', glyph: 'irrecv',
  desc: '38kHz로 깜빡이는 적외선만 골라 받아 복조한 신호를 냅니다 (신호가 있을 때 LOW). 라이브러리가 NEC 프레임을 해석해 주소·명령 번호를 알려 줘요.',
  spec: ['38kHz 반송파 복조', '출력: 평소 HIGH, 신호 구간 LOW', 'NEC: 주소 8비트 + 명령 8비트', '버튼을 계속 누르면 108ms마다 반복 코드'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D11', esp: 'GPIO21', sig: 'S' }],
  libs: [{ name: 'IRremote (Armin Joachimsmeyer, 4.x)', q: 'IRremote' }],
  notes: ['예전 IRremote 2.x 예제(irrecv.decode(&results))는 4.x에서 바뀌었어요. 아래 코드는 4.x 방식입니다.', '형광등·햇빛 아래서는 잡음 코드가 들어올 수 있어요.'],
  use: '리모컨으로 BMS 조작: 1 = 부하 ON, 2 = 부하 OFF, 0 = TRIP 리셋처럼 버튼마다 명령을 정해 쓸 수 있어요.',
  ctrls: [{ k: 'key', t: 'keypad', label: '리모컨 누르기' }],
  period: 50,
  auto(t, e, s) { if ((t % 3) < 0.06 && (!s.lastA || t - s.lastA > 1)) { s.lastA = t; s.q = s.q || []; s.q.push([0x0C, 0x18, 0x16, 0x45][Math.floor(t / 3) % 4]); } },
  sim(e, s, x) {
    s.q = s.q || []; let ev = null;
    if (s.q.length && x.t - (s.last || -9) > 0.12) { const c = s.q.shift(); s.last = x.t; s.cmd = c; ev = { ir_cmd: c, ir_addr: 0, repeat: 0 }; }
    if (!ev && x.noise > 0.5 && Math.random() < (x.noise - 0.5) * 0.02) ev = { garbage: 1 };
    const busy = x.t - (s.last || -9) < 0.07;
    return { ch: { S: { k: 'd', v: busy ? (Math.random() < 0.5 ? 0 : 1) : 1 } }, led: { sig: busy }, vis: { cmd: s.cmd, busy }, ev, fx: { open: 1, short: 1 } };
  },
  read(r, s, x, ev) { if (!ev || ev.garbage || r._fault) return { pin: r.S }; return { ir_cmd: ev.ir_cmd, ir_addr: ev.ir_addr, repeat: ev.repeat, pin: r.S }; },
  evOnly: true, prints: ['ir_cmd', 'ir_addr', 'repeat'],
  show: [{ k: 'ir_cmd', label: '받은 명령', unit: '', ir: true }, { k: 'ir_addr', label: '주소', unit: '' }],
  plot: [{ k: 'pin', label: 'S 핀 (LOW=신호)', min: -0.2, max: 1.2, step: true }],
  rules: [],
  code: (s, B) => `${head(s, B, ['라이브러리: IRremote (4.x)'])}
#include <IRremote.hpp>

const int IR_RX_PIN = ${pinOf(s, 'S', B)};

void setup() {
  Serial.begin(${B.baud});
  IrReceiver.begin(IR_RX_PIN, DISABLE_LED_FEEDBACK);
}

void loop() {
  if (IrReceiver.decode()) {                        // 한 프레임을 받았으면
    if (IrReceiver.decodedIRData.protocol == NEC) { // 소형 리모컨은 NEC
      bool rep = IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT;
      Serial.print("ir_cmd:");   Serial.print(IrReceiver.decodedIRData.command);
      Serial.print(",ir_addr:"); Serial.print(IrReceiver.decodedIRData.address);
      Serial.print(",repeat:");  Serial.println(rep ? 1 : 0);
    }
    IrReceiver.resume();                            // 다음 신호 받을 준비
  }
}
`,
},
// 24 ─────────────────────────────
{
  n: 24, key: 'joystick', name: 'PS2 게임 조이스틱', model: 'KY-023', cat: 'ain', pcb: 'black', glyph: 'joy',
  desc: '가변저항 두 개(X·Y)와 누름 스위치(SW)로 된 조이스틱입니다. 가운데에서 전원의 절반 전압이 나오고, 기울이면 0 또는 최대로 갑니다.',
  spec: ['VRx·VRy: 10kΩ 가변저항', '가운데 ≈ 전원의 절반 (제품마다 조금씩 다름)', 'SW: 누르면 GND (풀업 필요)'],
  pins: [G('GND'), V('+5V', '3V3', 'ESP32는 3.3V로 (ADC 3.3V 한계)'), { mod: 'VRx', uno: 'A0', esp: 'GPIO36', sig: 'X' }, { mod: 'VRy', uno: 'A1', esp: 'GPIO39', sig: 'Y' }, { mod: 'SW', uno: 'D3', esp: 'GPIO32', sig: 'SW', note: 'INPUT_PULLUP 필수' }],
  notes: ['매뉴얼 코드는 SW를 INPUT으로 읽어 값이 떠요. INPUT_PULLUP으로 고쳤습니다 (수정됨).', '가운데 값이 정확히 절반이 아니므로 시작할 때 가운데를 보정해요.'],
  use: '현장 메뉴 조작(화면 넘기기·기준값 바꾸기)이나 수동 시험 입력으로 쓸 수 있어요.',
  ctrls: [{ k: 'joy', t: 'pad', label: '조이스틱 (드래그)' }, { k: 'sw', t: 'hold', label: '누르기 (SW)' }],
  period: 100, nz: 0.005,
  auto(t, e) { e.jx = Math.cos(t / 2) * 0.9; e.jy = Math.sin(t / 2) * 0.9; e.sw = (t % 10) > 8; },
  sim(e, s, x) { const vc = x.B.vcc; const f = v => clamp(vc * (0.485 + 0.5 * v), 0, vc); return { ch: { X: { k: 'a', v: f(e.jx || 0) }, Y: { k: 'a', v: f(-(e.jy || 0)) }, SW: { k: 'd', v: e.sw ? 0 : 1, pu: true } }, vis: { jx: e.jx || 0, jy: e.jy || 0 } }; },
  read(r, s) {
    const max = r.B.adcMax; if (s.cx == null) { s.cx = r.X.raw; s.cy = r.Y.raw; }
    const m = (v, c) => { let d = v >= c ? (v - c) / Math.max(1, max - c) * 100 : (v - c) / Math.max(1, c) * 100; if (Math.abs(d) < 3) d = 0; return Math.round(d); };
    return { x: r.X.raw, y: r.Y.raw, dx: m(r.X.raw, s.cx), dy: m(r.Y.raw, s.cy), sw: r.SW === 0 ? 1 : 0 };
  },
  show: [{ k: 'x', label: 'X 원값', unit: '' }, { k: 'y', label: 'Y 원값', unit: '' }, { k: 'dx', label: 'X', unit: '%' }, { k: 'dy', label: 'Y', unit: '%' }, { k: 'sw', label: 'SW', bool: ['뗌', '누름'] }],
  plot: [{ k: 'dx', label: 'X', min: -100, max: 100, unit: '%' }, { k: 'dy', label: 'Y', min: -100, max: 100, unit: '%', color: '#f6c047' }],
  rules: [],
  code: (s, B) => `${head(s, B, ['시작할 때 손을 떼고 있어야 가운데가 보정됩니다'])}
const int X_PIN = ${pinOf(s, 'X', B)};
const int Y_PIN = ${pinOf(s, 'Y', B)};
const int SW_PIN = ${pinOf(s, 'SW', B)};
const int ADC_MAX = ${B.adcMax};
const int DEAD_PCT = 3;          // 가운데 ±3%는 0으로 봄

int cx, cy;                      // 보정한 가운데 값

int toPercent(int v, int c) {    // 가운데 기준 -100 ~ +100 %
  long d = (v >= c) ? (long)(v - c) * 100 / max(1, ADC_MAX - c)
                    : (long)(v - c) * 100 / max(1, c);
  if (abs(d) < DEAD_PCT) d = 0;
  return (int)d;
}

void setup() {
  Serial.begin(${B.baud});
  pinMode(SW_PIN, INPUT_PULLUP);  // 수정됨: 매뉴얼은 INPUT → 값이 떠서 풀업 사용
  cx = analogRead(X_PIN);         // 가운데 보정
  cy = analogRead(Y_PIN);
}

void loop() {
  int x = analogRead(X_PIN);
  int y = analogRead(Y_PIN);
  int sw = (digitalRead(SW_PIN) == LOW) ? 1 : 0;

  Serial.print("x:");   Serial.print(x);
  Serial.print(",y:");  Serial.print(y);
  Serial.print(",dx:"); Serial.print(toPercent(x, cx));
  Serial.print(",dy:"); Serial.print(toPercent(y, cy));
  Serial.print(",sw:"); Serial.println(sw);
  delay(100);
}
`,
},
// 25 ─────────────────────────────
cmpHall({ n: 25, key: 'linhall', name: '리니어 홀 자기 센서', model: 'KY-024 (SS49E + LM393)' }),
// 26 ─────────────────────────────
{
  n: 26, key: 'reedcmp', name: '리드 스위치 모듈', model: 'KY-025 (리드 + LM393)', cat: 'cmp', pcb: 'red', glyph: 'reed', pot: true,
  desc: '리드 스위치 접점 전압(AO)을 비교기가 다듬어 깨끗한 디지털 신호(DO)로 바꿔 줍니다. 자석이 가까우면 접점이 닫혀 AO가 0 근처로 떨어져요.',
  spec: ['자석 약 15mm 이내 → 접점 닫힘', 'AO: 열림 ≈ 전원, 닫힘 ≈ 0V', 'DO: 닫히면 HIGH (기준은 가변저항)'],
  pins: CMP_PINS,
  notes: ['AO는 사실상 두 값(0 또는 최대)만 나와요. 리드 스위치는 켜짐/꺼짐 소자이기 때문이에요.'],
  use: '배터리함 문 인터록 (22번과 같음). 비교기가 있어 긴 배선에서도 신호가 깨끗해요.',
  ctrls: [{ k: 'dist', t: 'range', label: '자석(문) 거리', min: 0, max: 60, step: 1, unit: 'mm', def: 5 }, THR(50)],
  period: 100, nz: 0.004,
  auto(t, e) { const c = t % 30; e.dist = c < 15 ? 5 : c < 22 ? 5 + (c - 15) * 7 : 5; },
  sim(e, s, x) { const b = field(e.dist); s.on = s.on ? b > 40 : b > 60; const v = s.on ? 0.02 : x.B.vcc * 0.98; return cmpOut(v, v < x.B.vcc * (e.thr / 100), { mag: e.dist }); },
  read(r) { return { ao: r.AO.raw, door_open: r.DO ? 0 : 1, do: r.DO }; },
  show: [{ k: 'ao', label: 'AO', unit: '' }, { k: 'do', label: 'DO', bool: ['열림', '닫힘'] }, { k: 'door_open', label: '문', bool: ['닫힘', '열림'] }],
  plot: [{ k: 'ao', label: 'AO', min: 0, max: 'adc', ghost: 'AO' }, { k: 'do', label: 'DO', min: -0.2, max: 1.2, step: true, color: '#f6c047' }],
  rules: [{ k: 'door_open', dir: 'flag', eq: 1, lv: 2, name: '케이스 문 열림' }],
  code: (s, B) => codeCmp(s, B, { what: '자석 가까움(접점 닫힘)', print: '  Serial.print(",door_open:"); Serial.print(det ? 0 : 1);\n' }),
},
// 27 ─────────────────────────────
{
  n: 27, key: 'flame', name: '불꽃 감지 센서', model: 'KY-026 (IR 수광 + LM393)', cat: 'cmp', pcb: 'red', glyph: 'flame', pot: true,
  desc: '불꽃이 내는 760~1100nm 적외선을 받는 수광 소자입니다. 불꽃이 가까울수록 AO 값이 작아지고, 기준을 넘으면 DO가 HIGH가 돼요.',
  spec: ['감지 파장 760~1100nm', '감지 각도 약 60°', '라이터 불꽃 약 80cm까지', '햇빛·백열등도 적외선이 많아 오감지 가능'],
  pins: CMP_PINS,
  notes: ['실험할 때 불꽃을 센서에 너무 가까이 대지 마세요 (렌즈가 녹아요).', '햇빛이 드는 곳에서는 감도를 낮추거나 AO 변화량으로 판단하세요.'],
  use: '배터리 화재의 가장 직접적인 신호. 불꽃이 감지되면 즉시 위험 단계로 부하를 끊고 경보합니다.',
  ctrls: [{ k: 'fire', t: 'toggle', label: '라이터 불꽃' }, { k: 'dist', t: 'range', label: '불꽃 거리', min: 5, max: 150, step: 1, unit: 'cm', def: 40 }, { k: 'sun', t: 'range', label: '햇빛(배경 적외선)', min: 0, max: 100, step: 1, unit: '%', def: 5 }, THR(55)],
  period: 100, nz: 0.006,
  auto(t, e) { const c = t % 50; e.fire = c > 15 && c < 35; e.dist = c < 25 ? 120 - (c - 15) * 9 : 30 + (c - 25) * 6; e.sun = 5 + (c > 40 ? 40 : 0); },
  sim(e, s, x) { const ir = clamp((e.fire ? 1 / (1 + (e.dist / 25) ** 2) : 0) + e.sun / 100 * 0.45 + Math.max(0, gauss()) * 0.02 * (e.fire ? 1 : 0), 0, 1); const v = x.B.vcc * (0.90 - 0.82 * ir); return cmpOut(v, v < x.B.vcc * (e.thr / 100), { fire: e.fire, ir }); },
  read(r) { return { ao: r.AO.raw, ir_pct: r1(clamp((0.90 - r.AO.mv / r.B.vccMv) / 0.82 * 100, 0, 100), 0), do: r.DO }; },
  show: [{ k: 'ao', label: 'AO', unit: '' }, { k: 'ir_pct', label: '적외선 세기', unit: '%' }, { k: 'do', label: 'DO', bool: ['없음', '불꽃'] }],
  plot: [{ k: 'ao', label: 'AO', min: 0, max: 'adc', ghost: 'AO' }, { k: 'do', label: 'DO', min: -0.2, max: 1.2, step: true, color: '#d62f2f' }],
  rules: [{ k: 'ir_pct', dir: 'hi', th: [20, 35, null], name: '적외선 증가', unit: '%' }, { k: 'do', dir: 'flag', eq: 1, lv: 3, name: '불꽃 감지' }],
  code: (s, B) => codeCmp(s, B, { what: '불꽃 감지', calc: '  // AO는 불꽃이 가까울수록 작아짐 → 세기(%)로 바꿈\n  float irPct = constrain((0.90 - mv / VCC_MV) / 0.82 * 100.0, 0, 100);', print: '  Serial.print(",ir_pct:"); Serial.print(irPct, 0);\n' }),
},
// 28 ─────────────────────────────
{
  n: 28, key: 'magiccup', name: '매직 라이트 컵', model: 'KY-027 ×2', cat: 'din', pcb: 'black', glyph: 'cup',
  desc: '기울기(수은) 스위치와 LED가 함께 있는 모듈 두 개가 한 세트입니다. 한쪽을 기울이면 빛이 다른 컵으로 옮겨 가는 것처럼 보여요.',
  spec: ['모듈마다 S(기울기 입력) + L(LED, PWM)', 'A 기울임 → 밝기 증가, B 기울임 → 감소', '25ms마다 1단계 → 0→255에 약 6.4초'],
  pins: [G('G (A·B)'), V('+ (A·B)'), { mod: 'A: S', uno: 'D7', esp: 'GPIO32', sig: 'SA' }, { mod: 'A: L', uno: 'D5', esp: 'GPIO21', sig: 'LA', note: 'PWM' }, { mod: 'B: S', uno: 'D4', esp: 'GPIO22', sig: 'SB' }, { mod: 'B: L', uno: 'D6', esp: 'GPIO5', sig: 'LB', note: 'PWM' }],
  notes: ['수은 스위치가 들어 있어요. 깨지지 않게 주의하세요.'],
  use: 'BMS와 직접 관련은 없지만, 입력(기울기)으로 출력(PWM 밝기)을 서서히 바꾸는 상태 기계 연습에 좋아요.',
  ctrls: [{ k: 'ta', t: 'toggle', label: '컵 A 기울이기' }, { k: 'tb', t: 'toggle', label: '컵 B 기울이기' }],
  period: 100,
  auto(t, e) { const c = t % 16; e.ta = c < 8; e.tb = c >= 8; },
  sim(e, s, x) {
    s.br = s.br ?? 0; const steps = Math.round(x.dt / 0.025);
    for (let i = 0; i < steps; i++) { if (e.ta && s.br !== 255) s.br++; if (e.tb && s.br !== 0) s.br--; }
    return { ch: { SA: { k: 'd', v: e.ta ? 1 : 0 }, SB: { k: 'd', v: e.tb ? 1 : 0 } }, vis: { la: s.br, lb: 255 - s.br, ta: e.ta, tb: e.tb } };
  },
  read(r, s) { return { sa: r.SA, sb: r.SB, bright_a: s.br, bright_b: 255 - s.br }; },
  show: [{ k: 'bright_a', label: 'A 밝기', unit: '' }, { k: 'bright_b', label: 'B 밝기', unit: '' }],
  plot: [{ k: 'bright_a', label: 'A', min: 0, max: 255 }, { k: 'bright_b', label: 'B', min: 0, max: 255, color: '#f6c047' }],
  rules: [],
  code: (s, B) => `${head(s, B, ['두 모듈을 기울여 빛을 옮겨 보세요'])}
const int LED_A_PIN = ${pinOf(s, 'LA', B)};   // 컵 A LED (PWM)
const int LED_B_PIN = ${pinOf(s, 'LB', B)};   // 컵 B LED (PWM)
const int TILT_A_PIN = ${pinOf(s, 'SA', B)};  // 컵 A 기울기
const int TILT_B_PIN = ${pinOf(s, 'SB', B)};  // 컵 B 기울기
const unsigned long STEP_MS = 25;   // 밝기 1단계 시간
const unsigned long PRINT_MS = 100;

int brightness = 0;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(${B.baud});
  pinMode(LED_A_PIN, OUTPUT);
  pinMode(LED_B_PIN, OUTPUT);
  pinMode(TILT_A_PIN, INPUT);
  pinMode(TILT_B_PIN, INPUT);
}

void loop() {
  int sa = digitalRead(TILT_A_PIN);
  int sb = digitalRead(TILT_B_PIN);
  if (sa == HIGH && brightness < 255) brightness++;   // A를 기울이면 밝아짐
  if (sb == HIGH && brightness > 0) brightness--;     // B를 기울이면 어두워짐
  analogWrite(LED_A_PIN, brightness);
  analogWrite(LED_B_PIN, 255 - brightness);           // B는 반대로

  if (millis() - lastPrint >= PRINT_MS) {
    lastPrint = millis();
    Serial.print("sa:");        Serial.print(sa);
    Serial.print(",sb:");       Serial.print(sb);
    Serial.print(",bright_a:"); Serial.print(brightness);
    Serial.print(",bright_b:"); Serial.println(255 - brightness);
  }
  delay(STEP_MS);
}
`,
},
// 29 ─────────────────────────────
{
  n: 29, key: 'ntccmp', name: '디지털 온도 센서 모듈', model: 'KY-028 (NTC + LM393)', cat: 'cmp', pcb: 'red', glyph: 'ntc', pot: true,
  desc: 'NTC 서미스터 전압(AO)과, 가변저항으로 정한 온도를 넘으면 HIGH가 되는 비교기 출력(DO)이 함께 있어요. 마이크로컨트롤러 없이도 과열 신호를 만들 수 있어요.',
  spec: ['NTC 10kΩ B3950 + 10kΩ 분배', '온도가 오르면 AO 감소', 'DO: 설정 온도 초과 시 HIGH (가변저항)', 'B 정수식: 1/T = 1/T0 + ln(R/R0)/B'],
  pins: CMP_PINS,
  notes: ['DO의 기준 온도는 가변저항을 돌려 맞춰요. 시리얼로 AO 온도를 보며 맞추면 쉬워요.'],
  use: '하드웨어 이중 보호: DO를 릴레이 구동 회로에 직접 연결하면 펌웨어가 멈춰도 과열 시 부하를 끊을 수 있어요 (BMDproject의 하드웨어 폐루프와 같은 생각).',
  ctrls: [...TEMP_CTRLS(-10, 90, 25), { k: 'set', t: 'range', label: 'DO 기준 온도 (가변저항)', min: 20, max: 70, step: 1, unit: '°C', def: 40 }],
  period: 500, auto: tempAuto, nz: 0.004,
  sim(e, s, x) { const t = tempSim(e, s, x.dt); const rt = ntcRes(t); const v = x.B.vcc * rt / (rt + 10000); return cmpOut(v, t > e.set, { temp: t }); },
  read(r) { const mv = r.AO.mv, vcc = r.B.vccMv; if (mv <= 1 || mv >= vcc - 1) return { ao: r.AO.raw, temp_c: -999, do: r.DO, err: 1 }; return { ao: r.AO.raw, temp_c: r1(ntcTemp(10000 * mv / (vcc - mv)), 1), do: r.DO, err: 0 }; },
  prints: ['ao', 'temp_c', 'do'],
  show: [{ k: 'temp_c', label: '온도 (AO)', unit: '°C', dp: 1 }, { k: 'ao', label: 'AO', unit: '' }, { k: 'do', label: 'DO', bool: ['기준 이하', '기준 초과'] }],
  plot: [{ k: 'temp_c', label: '온도', min: 20, max: 50, unit: '°C' }, { k: 'do', label: 'DO', min: -0.2, max: 1.2, step: true, color: '#d62f2f' }],
  rules: [...TEMP_RULES, { k: 'do', dir: 'flag', eq: 1, lv: 3, name: '하드웨어 과열 신호(DO)' }, { k: 'err', dir: 'flag', eq: 1, lv: 2, name: '센서 이상' }],
  code: (s, B) => codeCmp(s, B, { what: '설정 온도 초과', period: 500, consts: 'const float SERIES_OHM = 10000.0;  // 분배 저항\nconst float R0 = 10000.0, T0 = 298.15, BETA = 3950.0;  // NTC 10kΩ@25°C, B3950\n', calc: '  float tC = -999;\n  if (mv > 1 && mv < VCC_MV - 1) {\n    float r = SERIES_OHM * mv / (VCC_MV - mv);           // NTC 저항 (AO는 NTC 쪽 전압)\n    tC = 1.0 / (1.0 / T0 + log(r / R0) / BETA) - 273.15;\n  }', print: '  Serial.print(",temp_c:"); Serial.print(tC, 1);\n' }),
},
// 30 ─────────────────────────────
{
  n: 30, key: 'dual5', name: '듀얼 컬러 LED 5mm', model: 'KY-029', cat: 'out', pcb: 'black', glyph: 'led2', isOut: true,
  desc: '5mm 빨강·초록 듀얼 컬러 LED (공통 음극). 13번 3mm 모듈과 같은 방법으로 써요.',
  spec: ['공통 음극', '+ = 빨강, S = 초록 (매뉴얼)', '핀마다 220Ω 직렬 권장'],
  pins: [G('-'), { mod: '+ (빨강)', uno: 'D11', esp: 'GPIO21', sig: 'R', note: '220Ω 직렬' }, { mod: 'S (초록)', uno: 'D10', esp: 'GPIO22', sig: 'G', note: '220Ω 직렬' }],
  notes: ['이 모듈의 + 핀은 전원이 아니라 빨강 LED예요.'],
  use: '두 색 상태 표시등: 정상 초록, 주의 노랑, 경고 주황, 위험 빨강.',
  ctrls: [{ k: 'bms', t: 'select', label: 'BMS 단계 따라가기', opts: BMS_LV, def: '' }, { k: 'r', t: 'range', label: '빨강 R', min: 0, max: 255, step: 1, unit: '', def: 0 }, { k: 'g', t: 'range', label: '초록 G', min: 0, max: 255, step: 1, unit: '', def: 255 }],
  period: 200, auto: rgbAuto, sim: (e, s, x) => dualSim(e, s, x),
  read(r, s, x, ev, o) { return { r: o.vis.rgb[0], g: o.vis.rgb[1] }; },
  show: [{ k: 'r', label: 'R', unit: '' }, { k: 'g', label: 'G', unit: '' }],
  plot: [{ k: 'r', label: 'R', min: 0, max: 255, color: '#d62f2f' }, { k: 'g', label: 'G', min: 0, max: 255, color: '#1e9e55' }],
  rules: [], cmd: (e, s, k, o) => `${o.vis.rgb[0]},${o.vis.rgb[1]}`,
  code: (s, B) => codeDual(s, B),
},
// 31 ─────────────────────────────
{
  n: 31, key: 'knock', name: '노크 센서', model: 'KY-031', cat: 'din', pcb: 'black', glyph: 'knock',
  desc: '플라스틱 통 속 스프링이 두드림(충격)에 흔들려 짧게 접점이 닫힙니다. 평소 HIGH, 노크 순간 LOW 펄스예요.',
  spec: ['충격 → 수 ms LOW 펄스', '모듈 10kΩ 풀업', '진동 센서(5번)보다 둔감 — 강한 두드림에 반응'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S', note: '인터럽트로 셈' }],
  notes: ['펄스가 짧아 인터럽트로 셉니다.'],
  use: '팩 케이스 충격·낙하 기록. 2초 안에 여러 번 충격이 오면 경고로 올립니다.',
  ctrls: [{ k: 'knock', t: 'tap', label: '똑 두드리기' }, { k: 'knock3', t: 'tap', label: '똑똑똑 3번' }],
  period: 200,
  auto(t, e, s) { const c = t % 12; if (c < 0.06 && (!s.la || t - s.la > 1)) { s.la = t; s.tq = (s.tq || 0) + 1; } if (Math.abs(c - 6) < 0.03 && (!s.lb || t - s.lb > 1)) { s.lb = t; s.tq = (s.tq || 0) + 3; } },
  sim(e, s, x) {
    s.tq = (s.tq || 0) + (e._tap_knock || 0) + 3 * (e._tap_knock3 || 0); e._tap_knock = 0; e._tap_knock3 = 0;
    let n = 0; if (s.tq > 0 && x.t - (s.lk || -9) > 0.15) { s.tq--; s.lk = x.t; n = 1 + (Math.random() < 0.3 ? 1 : 0); }
    if (Math.random() < x.noise * 0.002) n = 1;
    s.acc = (s.acc || 0) + n; s.hist = (s.hist || []).filter(t => x.t - t < 2); if (n) s.hist.push(x.t);
    return { ch: { S: { k: 'd', v: n ? 0 : 1, pu: true } }, led: { sig: n > 0 } };
  },
  read(r, s) { const n = s.acc || 0; s.acc = 0; return { pin: r.S, knocks: n, in2s: (s.hist || []).length }; },
  prints: ['pin', 'knocks'],
  show: [{ k: 'knocks', label: '펄스(0.2초)', unit: '회' }, { k: 'in2s', label: '최근 2초 충격', unit: '회' }],
  plot: [{ k: 'in2s', label: '최근 2초 충격', min: 0, max: 6 }],
  rules: [{ k: 'in2s', dir: 'hi', th: [1, 3, null], name: '충격', unit: '회/2초' }],
  code: (s, B) => codePulse(s, B, { pinName: 'KNOCK_PIN', period: 200, edge: 'FALLING', pullup: true, body: `  Serial.print("pin:");     Serial.print(pin);
  Serial.print(",knocks:"); Serial.println(n);   // 0.2초 동안의 충격 펄스 수` }),
},
// 32 ─────────────────────────────
{
  n: 32, key: 'obstacle', name: '적외선 장애물 감지', model: 'KY-032', cat: 'din', pcb: 'black', glyph: 'obstacle',
  desc: '적외선 LED 빛이 물체에 반사되어 돌아오면 감지합니다. 흰 물체는 멀리서도, 검은 물체는 가까이서만 감지돼요. 감지 시 LOW.',
  spec: ['감지 거리 2~40cm (가변저항)', '흰색은 잘, 검은색은 잘 안 됨 (반사율)', '출력: 감지 시 LOW + LED', 'EN 핀은 연결하지 않음 (점퍼 유지)'],
  pins: [G('GND'), V('+'), { mod: 'out', uno: 'D3', esp: 'GPIO32', sig: 'S' }, { mod: 'EN', uno: '연결 안 함', esp: '연결 안 함' }],
  notes: ['매뉴얼 코드는 HIGH일 때 LED를 켜는데, 이 모듈은 감지 시 LOW예요.', '햇빛 아래에서는 거리가 크게 줄거나 계속 감지될 수 있어요.'],
  use: '배터리 랙 서랍이 제자리에 들어갔는지(근접) 확인하거나, 정비 중 손이 단자에 가까이 갔는지 감지할 수 있어요.',
  ctrls: [{ k: 'dist', t: 'range', label: '물체 거리', min: 0, max: 50, step: 1, unit: 'cm', def: 25 }, { k: 'surf', t: 'select', label: '물체 색', opts: [['1', '흰색'], ['0.5', '회색'], ['0.12', '검정']], def: '1' }, { k: 'range', t: 'range', label: '감지 거리 (가변저항)', min: 5, max: 40, step: 1, unit: 'cm', def: 15 }],
  period: 100,
  auto(t, e) { e.dist = 22 + 18 * Math.sin(t / 3); e.surf = ['1', '0.5', '0.12'][Math.floor(t / 20) % 3]; },
  sim(e, s, x) { const r = e.range * +e.surf; const on = s.on = s.on ? e.dist < r * 1.1 : e.dist < r; return { ch: { S: { k: 'd', v: on ? 0 : 1 } }, led: { sig: on } }; },
  read(r, s) { return dig(r.S, 0, s, 'obstacle'); },
  show: [{ k: 'obstacle', label: '장애물', bool: ['없음', '감지'] }, { k: 'count', label: '감지 횟수', unit: '회' }],
  plot: [{ k: 'pin', label: 'out 핀', min: -0.2, max: 1.2, step: true }],
  rules: [{ k: 'obstacle', dir: 'flag', eq: 1, lv: 1, name: '물체 근접' }],
  code: (s, B) => codeDigital(s, B, { pinName: 'IR_OBS_PIN', active: 'LOW', key: 'obstacle', what: '장애물 감지', modPin: 'out' }),
},
// 33 ─────────────────────────────
{
  n: 33, key: 'flash7', name: '7 컬러 플래시 LED', model: 'KY-034', cat: 'out', pcb: 'black', glyph: 'flash', isOut: true,
  desc: '전원만 주면 LED 안의 칩이 7가지 색을 스스로 바꾸며 깜빡입니다. 코드로는 켜고 끄기만 할 수 있어요.',
  spec: ['내장 컨트롤러가 색 변경', '가운데 핀(+)은 연결하지 않음 (매뉴얼 주의)', 'S = HIGH → 동작'],
  pins: [G('-'), { mod: '+ (가운데)', uno: '연결 안 함', esp: '연결 안 함', note: '매뉴얼 주의 사항' }, { mod: 'S', uno: 'D12', esp: 'GPIO21', sig: 'S' }],
  notes: ['적외선 발광 모듈(8번)과 모양이 비슷해요. 기판에 CNT5 표시가 있는 쪽이 이 모듈이에요.'],
  use: '눈에 띄는 경고등. 위험 단계에서 켜 두면 색이 계속 바뀌어 주의를 끌어요.',
  ctrls: [{ k: 'on', t: 'toggle', label: '켜기', def: true }, { k: 'blink', t: 'toggle', label: '1초 깜빡임 (매뉴얼 코드)' }],
  period: 200,
  auto(t, e) { e.on = true; e.blink = true; },
  sim(e, s, x) { const on = e.on && (!e.blink || (x.t % 2) < 1); return { ch: {}, vis: { on, hue: (x.t * 0.8 | 0) % 7 } }; },
  read(r, s, x, ev, o) { return { led: o.vis.on ? 1 : 0 }; },
  show: [{ k: 'led', label: 'LED', bool: ['꺼짐', '켜짐'] }],
  plot: [{ k: 'led', label: 'LED', min: -0.2, max: 1.2, step: true }],
  rules: [], cmd: (e, s, k, o) => String(o.vis.on ? 1 : 0),
  code: (s, B) => codeDigitalOut(s, B, 'FLASH_PIN', 'led', ['가운데 + 핀은 연결하지 마세요']),
},
// 34 ─────────────────────────────
{
  n: 34, key: 'anahall', name: '아날로그 홀 자기 센서', model: 'KY-035 (49E)', cat: 'ain', pcb: 'black', glyph: 'hall',
  desc: '자기장 세기에 비례하는 전압을 냅니다. 자석이 없으면 전원의 절반, S극이면 올라가고 N극이면 내려가요. 전류 센서(ACS712 등)도 같은 원리예요.',
  spec: ['자석 없음 = 전원의 1/2', '감도 약 1.4mV/G (5V), 전원에 비례', '측정 범위 약 ±1000G'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'A0', esp: 'GPIO36', sig: 'S' }],
  notes: ['감도가 전원 전압에 비례해요 (3.3V면 약 0.92mV/G).'],
  use: '홀 효과 전류 측정의 원리 실험. 실제 BMS는 홀 센서로 전선을 자르지 않고 큰 충·방전 전류를 잽니다.',
  ctrls: [{ k: 'dist', t: 'range', label: '자석 거리', min: 0, max: 50, step: 1, unit: 'mm', def: 30 }, { k: 'pole', t: 'select', label: '자석 극', opts: [['S', 'S극'], ['N', 'N극']], def: 'S' }],
  period: 100, nz: 0.004,
  auto(t, e) { e.dist = 14 + 12 * Math.cos(t / 3); e.pole = Math.floor(t / 18) % 2 ? 'N' : 'S'; },
  sim(e, s, x) { const b = (e.pole === 'S' ? 1 : -1) * field(e.dist); return { ch: { S: { k: 'a', v: hallV(b, x.B.vcc) } }, vis: { mag: e.dist, pole: e.pole } }; },
  read(r) { const sens = 1.4 * r.B.vccMv / 5000; return { raw: r.S.raw, gauss: Math.round((r.S.mv - r.B.vccMv / 2) / sens) }; },
  show: [{ k: 'raw', label: 'ADC', unit: '' }, { k: 'gauss', label: '자기장', unit: 'G' }],
  plot: [{ k: 'gauss', label: '자기장', min: -1200, max: 1200, unit: 'G' }],
  rules: [{ k: 'gauss', dir: 'abs', th: [300, 600, null], name: '강한 자기장', unit: 'G' }],
  code: (s, B) => `${head(s, B)}
const int HALL_PIN = ${pinOf(s, 'S', B)};
${ADC_LINES(B)}
const float MV_PER_GAUSS = 1.4 * VCC_MV / 5000.0;   // 49E 감도 (전원에 비례)

void setup() {
  Serial.begin(${B.baud});
}

void loop() {
  int raw = analogRead(HALL_PIN);
  float mv = readMv(HALL_PIN);
  float gauss = (mv - VCC_MV / 2.0) / MV_PER_GAUSS;   // 자석 없음 = 0G

  Serial.print("raw:");    Serial.print(raw);
  Serial.print(",gauss:"); Serial.println(gauss, 0);
  delay(100);
}
`,
},
// 35 ─────────────────────────────
{
  n: 35, key: 'touch', name: '터치 센서', model: 'KY-036 (금속 터치 + LM393)', cat: 'cmp', pcb: 'red', glyph: 'touch', pot: true,
  desc: '손가락이 금속 단자에 닿으면 몸이 안테나가 되어 전원선 잡음(60Hz)이 들어옵니다. 이 흔들림을 비교기가 잡아 DO를 HIGH로 만들어요.',
  spec: ['접촉 시 AO가 크게 흔들림 (60Hz 유도 잡음)', 'DO: 기준을 넘으면 HIGH (펄스처럼 떨림)', '가변저항으로 감도 조절'],
  pins: CMP_PINS,
  notes: ['DO가 60Hz로 떨려서 그대로 쓰면 깜빡여요. 일정 시간 안에 한 번이라도 HIGH면 "닿음"으로 보세요.'],
  use: '정비 중 금속 단자 접촉 감지, 화면 깨우기 같은 간단한 터치 입력.',
  ctrls: [{ k: 'touch', t: 'hold', label: '단자 만지기' }, THR(40)],
  period: 100, nz: 0.004,
  auto(t, e) { const c = t % 8; e.touch = c > 3 && c < 5.5; },
  sim(e, s, x) { const vc = x.B.vcc; const v = e.touch ? vc * (0.15 + 0.7 * Math.abs(Math.sin(2 * Math.PI * 60 * x.t + Math.random()))) : vc * 0.06; return cmpOut(v, v > vc * (e.thr / 100), { touch: e.touch }); },
  read(r, s, x) { s.hold = r.DO ? x.t : s.hold ?? -9; return { ao: r.AO.raw, do: r.DO, touched: x.t - s.hold < 0.25 ? 1 : 0 }; },
  prints: ['ao', 'touched', 'do'],
  show: [{ k: 'ao', label: 'AO', unit: '' }, { k: 'do', label: 'DO (순간)', bool: ['0', '1'] }, { k: 'touched', label: '판단', bool: ['안 닿음', '닿음'] }],
  plot: [{ k: 'ao', label: 'AO', min: 0, max: 'adc', ghost: 'AO' }, { k: 'touched', label: '닿음', min: -0.2, max: 1.2, step: true, color: '#f6c047' }],
  rules: [{ k: 'touched', dir: 'flag', eq: 1, lv: 1, name: '단자 접촉' }],
  code: (s, B) => codeCmp(s, B, { what: '터치 순간 (60Hz로 떨림)', consts: 'const unsigned long HOLD_MS = 250;   // 이 시간 안에 DO가 한 번이라도 1이면 닿음\nunsigned long lastHigh = 0;\n', calc: '  if (det == HIGH) lastHigh = millis();\n  int touched = (millis() - lastHigh < HOLD_MS) ? 1 : 0;', print: '  Serial.print(",touched:"); Serial.print(touched);\n' }),
},
// 36 ─────────────────────────────
sound({ n: 36, key: 'soundbig', name: '고감도 사운드 센서', model: 'KY-037 (큰 마이크 + LM393)', glyph: 'micbig', k: 0.006, desc: '큰 콘덴서 마이크로 작은 소리도 잡습니다. AO는 전원 절반을 중심으로 소리 파형이 흔들리고, 큰 소리면 DO가 HIGH가 돼요.' }),
// 37 ─────────────────────────────
sound({ n: 37, key: 'soundmic', name: '마이크로폰 사운드 감지', model: 'KY-038 (작은 마이크 + LM393)', glyph: 'mic', k: 0.0022, desc: '작은 마이크라 37번보다 둔감해요. 손뼉처럼 가까운 큰 소리를 감지하는 데 알맞습니다.' }),
// 38 ─────────────────────────────
{
  n: 38, key: 'heartbeat', name: '심박 센서', model: 'KY-039', cat: 'ain', pcb: 'black', glyph: 'heart',
  desc: '적외선 LED 빛이 손가락을 지나 수광부에 닿는 양이 혈류에 따라 아주 조금씩 바뀝니다. 신호가 매우 작아 필터(지수이동평균)와 기준선 추적이 필요해요.',
  spec: ['맥동 신호는 전체의 1~2%', '매뉴얼 필터: 지수이동평균 α = 0.75, 20ms마다', '주변 빛·손 움직임에 매우 민감'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'A0', esp: 'GPIO36', sig: 'S' }],
  notes: ['교육용 실험이에요. 의료 판단에 쓰지 마세요.', '손가락을 가볍게 얹고 움직이지 마세요. 손으로 덮어 주변 빛을 막으면 잘 돼요.'],
  use: 'BMS와 직접 관련은 없지만, 아주 작은 신호를 필터로 살려 내는 연습에 좋아요 (BMS의 ADC 잡음 필터와 같은 원리).',
  ctrls: [{ k: 'finger', t: 'toggle', label: '손가락 올리기', def: true }, { k: 'bpm', t: 'range', label: '실제 맥박', min: 45, max: 150, step: 1, unit: 'bpm', def: 72 }, { k: 'move', t: 'hold', label: '손가락 움직이기' }, { k: 'light', t: 'range', label: '주변 빛', min: 0, max: 100, step: 1, unit: '%', def: 20 }],
  period: 50, nz: 0.002,
  auto(t, e) { e.finger = (t % 60) > 4; e.bpm = 70 + 15 * Math.sin(t / 30); e.move = (t % 60) > 40 && (t % 60) < 42; },
  sim(e, s, x) {
    const vc = x.B.vcc; s.ph = (s.ph || 0) + e.bpm / 60 * x.dt;
    let v = e.finger ? vc * (0.55 + 0.015 * ppg(s.ph % 1) + (e.move ? 0.05 * gauss() : 0)) : vc * (0.15 + 0.6 * e.light / 100 + 0.02 * Math.sin(x.t * 37));
    return { ch: { S: { k: 'a', v } }, vis: { beat: e.finger && (s.ph % 1) < 0.12 } };
  },
  read(r, s, x) { // 매뉴얼 필터 + 기준선 추적 + 박동 간격
    const raw = r.S.raw, max = r.B.adcMax, hyst = max * 0.002;
    const steps = Math.max(1, Math.round(x.dt / 0.02));
    for (let i = 0; i < steps; i++) { s.f = s.f == null ? raw : 0.75 * s.f + 0.25 * raw; s.base = s.base == null ? s.f : 0.99 * s.base + 0.01 * s.f; }
    if (!s.above && s.f > s.base + hyst) { s.above = true; const dt = x.t - (s.lb ?? -9); if (dt > 0.3 && dt < 2) s.bpm = s.bpm ? 0.7 * s.bpm + 0.3 * 60 / dt : 60 / dt; s.lb = x.t; }
    else if (s.above && s.f < s.base) s.above = false;
    if (x.t - (s.lb ?? -9) > 3) s.bpm = 0;
    return { raw, filt: r1(s.f, 1), bpm: Math.round(s.bpm || 0) };
  },
  show: [{ k: 'raw', label: 'ADC', unit: '' }, { k: 'filt', label: '필터 후', unit: '', dp: 1 }, { k: 'bpm', label: '추정 맥박', unit: 'bpm' }],
  plot: [{ k: 'filt', label: '필터 후 (자동 범위)', min: 'auto', max: 'auto', ghost: 'S' }],
  rules: [],
  code: (s, B) => `${head(s, B, ['교육용 — 의료 판단에 쓰지 마세요'])}
const int PULSE_PIN = ${pinOf(s, 'S', B)};
const int ADC_MAX = ${B.adcMax};
const unsigned long SAMPLE_MS = 20;    // 매뉴얼: 20ms마다 측정
const unsigned long PRINT_MS = 50;
const float ALPHA = 0.75;              // 매뉴얼 필터 계수 (클수록 부드러움)
const float HYST = ADC_MAX * 0.002;    // 기준선보다 이만큼 높으면 박동

float filt = -1, base = -1, bpm = 0;
bool above = false;
unsigned long lastBeat = 0, lastSample = 0, lastPrint = 0;
int raw = 0;

void setup() {
  Serial.begin(${B.baud});
}

void loop() {
  if (millis() - lastSample >= SAMPLE_MS) {
    lastSample = millis();
    raw = analogRead(PULSE_PIN);
    if (filt < 0) { filt = raw; base = raw; }
    filt = ALPHA * filt + (1 - ALPHA) * raw;   // 지수이동평균 (매뉴얼)
    base = 0.99 * base + 0.01 * filt;          // 천천히 따라가는 기준선

    if (!above && filt > base + HYST) {        // 기준선을 위로 넘는 순간 = 박동
      above = true;
      unsigned long now = millis();
      unsigned long dt = now - lastBeat;
      if (lastBeat > 0 && dt > 300 && dt < 2000) {
        float inst = 60000.0 / dt;
        bpm = (bpm == 0) ? inst : 0.7 * bpm + 0.3 * inst;
      }
      lastBeat = now;
    } else if (above && filt < base) {
      above = false;
    }
    if (millis() - lastBeat > 3000) bpm = 0;   // 3초 동안 박동이 없으면 0
  }
  if (millis() - lastPrint >= PRINT_MS) {
    lastPrint = millis();
    Serial.print("raw:");   Serial.print(raw);
    Serial.print(",filt:"); Serial.print(filt, 1);
    Serial.print(",bpm:");  Serial.println(bpm, 0);
  }
}
`,
},
// 39 ─────────────────────────────
{
  n: 39, key: 'tracking', name: '트래킹 센서', model: 'KY-033 (TCRT5000)', cat: 'din', pcb: 'black', glyph: 'track',
  desc: '바닥에 적외선을 비춰 반사가 강한 흰 바닥과 반사가 약한 검은 선을 구분합니다. 검은 선 위에서 HIGH, 흰 바닥에서 LOW.',
  spec: ['감지 높이 약 2~12mm', '검은 선 → HIGH, 흰 바닥 → LOW', '가변저항으로 감도 조절'],
  pins: [G('-'), V('+'), { mod: 'S', uno: 'D3', esp: 'GPIO32', sig: 'S' }],
  notes: ['바닥에서 너무 높이 띄우면 항상 검은색(HIGH)으로 읽혀요.'],
  use: '배터리 운반 로봇·컨베이어의 정위치 확인. BMS 자체보다는 배터리 물류 쪽 응용이에요.',
  ctrls: [{ k: 'pos', t: 'range', label: '선과의 거리 (좌우)', min: -30, max: 30, step: 1, unit: 'mm', def: 0 }, { k: 'h', t: 'range', label: '바닥에서 높이', min: 1, max: 20, step: 1, unit: 'mm', def: 5 }],
  period: 100,
  auto(t, e) { e.pos = 25 * Math.sin(t / 2.5); e.h = 5; },
  sim(e, s, x) { const black = Math.abs(e.pos) < 9 || e.h > 12; return { ch: { S: { k: 'd', v: black ? 1 : 0 } }, led: { sig: !black }, vis: { pos: e.pos } }; },
  read(r, s) { return dig(r.S, 1, s, 'line'); },
  show: [{ k: 'line', label: '아래', bool: ['흰 바닥', '검은 선'] }, { k: 'count', label: '선 지나간 횟수', unit: '회' }],
  plot: [{ k: 'line', label: 'S', min: -0.2, max: 1.2, step: true }],
  rules: [],
  code: (s, B) => codeDigital(s, B, { pinName: 'TRACK_PIN', active: 'HIGH', key: 'line', what: '검은 선 위' }),
},
// 40 ─────────────────────────────
{
  n: 40, key: 'encoder', name: '로터리 인코더', model: 'KY-040', cat: 'bus', pcb: 'black', glyph: 'encoder',
  desc: '돌리면 CLK·DT 두 신호가 90° 어긋난 사각파(직교 신호)로 나옵니다. CLK이 떨어질 때 DT를 보면 돌린 방향을 알 수 있어요. 축을 누르면 SW.',
  spec: ['한 바퀴 20칸 (딸깍)', 'CLK·DT: 모듈 10kΩ 풀업', 'CLK 하강 시 DT ≠ CLK → 시계 방향(+1)', 'SW: 누르면 LOW (풀업 필요)'],
  pins: [G('GND'), V('+'), { mod: 'SW', uno: 'D2', esp: 'GPIO21', sig: 'SW', note: 'INPUT_PULLUP' }, { mod: 'DT', uno: 'D3', esp: 'GPIO22', sig: 'DT' }, { mod: 'CLK', uno: 'D4', esp: 'GPIO5', sig: 'CLK' }],
  notes: ['가상 실험은 파형을 보이게 하려고 실제보다 천천히 돌아요 (한 칸 0.2초).', '빨리 돌리면 칸을 놓칠 수 있어요. 그럴 땐 CLK 핀에 인터럽트를 쓰세요.'],
  use: 'BMS 설정 다이얼: 돌려서 과열 기준 온도 같은 값을 바꾸고, 눌러서 저장하는 입력으로 쓸 수 있어요.',
  ctrls: [{ k: 'knob', t: 'knob', label: '돌리기' }, { k: 'push', t: 'hold', label: '축 누르기 (SW)' }],
  period: 50,
  auto(t, e, s) { if (!(s.knobQ || []).length && !(s.ph || []).length) s.knobQ = [(t % 12) < 6 ? 1 : -1]; e.push = (t % 12) > 11.5; },
  sim(e, s, x) {
    s.knobQ = s.knobQ || []; s.ph = s.ph || [];
    if (!s.ph.length && s.knobQ.length) { const d = s.knobQ.shift(); s.ph = d > 0 ? [[0, 1], [0, 0], [1, 0], [1, 1]] : [[1, 0], [0, 0], [0, 1], [1, 1]]; }
    let [clk, dt] = s.cur || [1, 1]; if (s.ph.length) { [clk, dt] = s.ph.shift(); s.cur = [clk, dt]; }
    return { ch: { CLK: { k: 'd', v: clk, pu: true }, DT: { k: 'd', v: dt, pu: true }, SW: { k: 'd', v: e.push ? 0 : 1, pu: true } }, vis: { count: s.count || 0 } };
  },
  read(r, s) {
    if (s.lc == null) s.lc = r.CLK;
    if (r.CLK !== s.lc && r.CLK === 0) s.count = (s.count || 0) + (r.DT !== r.CLK ? 1 : -1);
    s.lc = r.CLK; return { clk: r.CLK, dt: r.DT, count: s.count || 0, sw: r.SW === 0 ? 1 : 0 };
  },
  show: [{ k: 'count', label: '위치(칸)', unit: '' }, { k: 'sw', label: 'SW', bool: ['뗌', '누름'] }, { k: 'clk', label: 'CLK', unit: '' }, { k: 'dt', label: 'DT', unit: '' }],
  plot: [{ k: 'clk', label: 'CLK', min: -1.6, max: 1.2, step: true }, { k: 'dt', label: 'DT', min: -0.2, max: 2.6, step: true, color: '#f6c047' }],
  rules: [],
  code: (s, B) => `${head(s, B, ['CLK이 HIGH→LOW로 바뀔 때 DT를 보고 방향을 정함'])}
const int SW_PIN = ${pinOf(s, 'SW', B)};
const int DT_PIN = ${pinOf(s, 'DT', B)};
const int CLK_PIN = ${pinOf(s, 'CLK', B)};
const unsigned long PRINT_MS = 100;

long count = 0;
int lastClk = HIGH;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(${B.baud});
  pinMode(CLK_PIN, INPUT);        // 모듈에 풀업 저항 있음
  pinMode(DT_PIN, INPUT);
  pinMode(SW_PIN, INPUT_PULLUP);  // SW는 풀업이 없는 모듈이 많음
  lastClk = digitalRead(CLK_PIN);
}

void loop() {
  int clk = digitalRead(CLK_PIN);
  if (clk != lastClk && clk == LOW) {          // CLK 하강 순간
    if (digitalRead(DT_PIN) != clk) count++;   // 시계 방향
    else count--;                              // 반시계 방향
  }
  lastClk = clk;

  if (millis() - lastPrint >= PRINT_MS) {
    lastPrint = millis();
    Serial.print("clk:");    Serial.print(clk);
    Serial.print(",dt:");    Serial.print(digitalRead(DT_PIN));
    Serial.print(",count:"); Serial.print(count);
    Serial.print(",sw:");    Serial.println(digitalRead(SW_PIN) == LOW ? 1 : 0);
  }
}
`,
},
];

/* ───────── 위에서 쓰는 공용 정의 (호이스팅되는 함수) ───────── */
function THR(def) { return { k: 'thr', t: 'range', label: '감도 가변저항 (DO 기준)', min: 5, max: 95, step: 1, unit: '%', def }; }
function cmpOut(v, det, vis) { return { ch: { AO: { k: 'a', v }, DO: { k: 'd', v: det ? 1 : 0 } }, led: { sig: !!det }, vis }; }
function hallV(b, vcc) { return clamp(vcc / 2 + b * 1.4e-3 * vcc / 5, 0.17 * vcc, 0.84 * vcc); }
function dig(pin, act, s, key = 'motion') { const d = pin === act ? 1 : 0; if (d && !s.ld) s.cnt = (s.cnt || 0) + 1; s.ld = d; return { pin, [key]: d, count: s.cnt || 0 }; }

function rgbFromBms(e, t) {
  if (e.bms === '' || e.bms == null) return [Math.round(e.r), Math.round(e.g), Math.round(e.b ?? 0)];
  const lv = +e.bms; const c = BMS_RGB[lv]; const on = (lv === 2 || lv === 4) ? blinkOn(t) : true;
  return on ? c.slice() : [0, 0, 0];
}
function rgbAuto(t, e) { e.bms = String(Math.floor(t / 5) % 5); }
function rgbSim(e, s, x) { const c = rgbFromBms(e, x.t); return { ch: {}, vis: { rgb: c } }; }
function dualSim(e, s, x) { // 빨강·초록만 있으므로 TRIP은 빨강 깜빡임
  if (e.bms === '4') return { ch: {}, vis: { rgb: blinkOn(x.t) ? [255, 0, 0] : [0, 0, 0] } };
  const c = rgbFromBms(e, x.t); return { ch: {}, vis: { rgb: [c[0], c[1], 0] } };
}

function codeDigitalOut(s, B, P, key, notes) {
  return codeOut(s, B, {
    notes, example: '1 → 켜기, 0 → 끄기',
    pins: `const int ${P} = ${pinOf(s, 'S', B)};`,
    setFn: `void setOut(int on) {
  digitalWrite(${P}, on ? HIGH : LOW);
  Serial.print("${key}:");
  Serial.println(on ? 1 : 0);
}`,
    setup: `  pinMode(${P}, OUTPUT);\n  setOut(0);`,
    parse: '    int v = Serial.parseInt();\n    setOut(v);',
    demo: '    demoStep = !demoStep;          // 데모: 1초마다 켜고 끄기\n    setOut(demoStep);',
  });
}
function codeRgb(s, B) {
  return codeOut(s, B, {
    example: '255,0,0 → 빨강',
    pins: `const int R_PIN = ${pinOf(s, 'R', B)};\nconst int G_PIN = ${pinOf(s, 'G', B)};\nconst int B_PIN = ${pinOf(s, 'B', B)};`,
    globals: '// 데모: BMS 상태색 (정상 초록 → 주의 노랑 → 경고 주황 → 위험 빨강)\nconst int DEMO_COLORS[4][3] = { {0, 255, 0}, {255, 180, 0}, {255, 70, 0}, {255, 0, 0} };',
    setFn: `void setColor(int r, int g, int b) {
  r = constrain(r, 0, 255); g = constrain(g, 0, 255); b = constrain(b, 0, 255);
  analogWrite(R_PIN, r);        // PWM 세기 0~255
  analogWrite(G_PIN, g);
  analogWrite(B_PIN, b);
  Serial.print("r:");  Serial.print(r);
  Serial.print(",g:"); Serial.print(g);
  Serial.print(",b:"); Serial.println(b);
}`,
    setup: '  pinMode(R_PIN, OUTPUT);\n  pinMode(G_PIN, OUTPUT);\n  pinMode(B_PIN, OUTPUT);\n  setColor(0, 0, 0);',
    parse: '    int r = Serial.parseInt();\n    int g = Serial.parseInt();\n    int b = Serial.parseInt();\n    setColor(r, g, b);',
    demo: '    setColor(DEMO_COLORS[demoStep][0], DEMO_COLORS[demoStep][1], DEMO_COLORS[demoStep][2]);\n    demoStep = (demoStep + 1) % 4;',
  });
}
function codeDual(s, B) {
  return codeOut(s, B, {
    example: '255,0 → 빨강, 255,180 → 노랑',
    pins: `const int R_PIN = ${pinOf(s, 'R', B)};\nconst int G_PIN = ${pinOf(s, 'G', B)};`,
    globals: '// 데모: 정상 초록 → 주의 노랑 → 경고 주황 → 위험 빨강\nconst int DEMO_COLORS[4][2] = { {0, 255}, {255, 180}, {255, 70}, {255, 0} };',
    setFn: `void setColor(int r, int g) {
  r = constrain(r, 0, 255); g = constrain(g, 0, 255);
  analogWrite(R_PIN, r);
  analogWrite(G_PIN, g);
  Serial.print("r:");  Serial.print(r);
  Serial.print(",g:"); Serial.println(g);
}`,
    setup: '  pinMode(R_PIN, OUTPUT);\n  pinMode(G_PIN, OUTPUT);\n  setColor(0, 0);',
    parse: '    int r = Serial.parseInt();\n    int g = Serial.parseInt();\n    setColor(r, g);',
    demo: '    setColor(DEMO_COLORS[demoStep][0], DEMO_COLORS[demoStep][1]);\n    demoStep = (demoStep + 1) % 4;',
  });
}

function cmpHall(o) {
  return {
    ...o, cat: 'cmp', pcb: 'red', glyph: 'hall', pot: true,
    desc: '49E 리니어 홀 소자의 전압(AO)과, 자기장이 기준을 넘으면 HIGH가 되는 비교기 출력(DO)을 함께 냅니다. 자석 없음 = 전원의 절반.',
    spec: ['감도 약 1.4mV/G (5V)', '자석 없음 = 전원 1/2, S극 ↑ N극 ↓', 'DO: AO가 기준(가변저항)을 넘으면 HIGH'],
    pins: CMP_PINS,
    notes: ['DO는 한쪽 극에만 반응해요. 반대 극은 AO로 판단하세요.'],
    use: '자석을 단 문·덮개 감지, 또는 홀 효과 전류 센서의 원리 실험 (전선 주위 자기장 ∝ 전류).',
    ctrls: [{ k: 'dist', t: 'range', label: '자석 거리', min: 0, max: 50, step: 1, unit: 'mm', def: 30 }, { k: 'pole', t: 'select', label: '자석 극', opts: [['S', 'S극'], ['N', 'N극']], def: 'S' }, THR(60)],
    period: 100, nz: 0.004,
    auto(t, e) { e.dist = 14 + 12 * Math.cos(t / 3); e.pole = Math.floor(t / 18) % 2 ? 'N' : 'S'; },
    sim(e, s, x) { const b = (e.pole === 'S' ? 1 : -1) * field(e.dist); const v = hallV(b, x.B.vcc); return cmpOut(v, v > x.B.vcc * (e.thr / 100), { mag: e.dist, pole: e.pole }); },
    read(r) { const sens = 1.4 * r.B.vccMv / 5000; return { ao: r.AO.raw, gauss: Math.round((r.AO.mv - r.B.vccMv / 2) / sens), do: r.DO }; },
    show: [{ k: 'ao', label: 'AO', unit: '' }, { k: 'gauss', label: '자기장', unit: 'G' }, { k: 'do', label: 'DO', bool: ['0', '1'] }],
    plot: [{ k: 'gauss', label: '자기장', min: -1200, max: 1200, unit: 'G' }, { k: 'do', label: 'DO', min: -0.2, max: 1.2, step: true, color: '#f6c047' }],
    rules: [{ k: 'gauss', dir: 'abs', th: [300, 600, null], name: '강한 자기장', unit: 'G' }],
    code: (s, B) => codeCmp(s, B, { what: '자기장이 기준 초과', consts: 'const float MV_PER_GAUSS = 1.4 * VCC_MV / 5000.0;   // 49E 감도 (전원에 비례)\n', calc: '  float gauss = (mv - VCC_MV / 2.0) / MV_PER_GAUSS;', print: '  Serial.print(",gauss:"); Serial.print(gauss, 0);\n' }),
  };
}

function sound(o) {
  return {
    n: o.n, key: o.key, name: o.name, model: o.model, cat: 'cmp', pcb: 'red', glyph: o.glyph, pot: true, desc: o.desc,
    spec: ['AO: 전원 1/2 ± 소리 파형', '소리 크기 = 짧은 시간의 최대−최소 (peak-to-peak)', 'DO: 순간값이 기준(가변저항)을 넘으면 HIGH'],
    pins: CMP_PINS,
    notes: ['AO 한 번 읽은 값은 파형의 한 점이라 크기를 알 수 없어요. 100ms 동안 최대−최소를 구합니다.', 'dB 값은 이 시뮬레이터의 가정이에요. 실제 소음계와 같지 않아요.'],
    use: 'BMS 자가 진단: 경보 부저가 실제로 울렸는지 소리로 확인. 릴레이 딸깍 소리·이상한 파열음 감지에도 쓸 수 있어요.',
    ctrls: [{ k: 'db', t: 'range', label: '주변 소리', min: 30, max: 110, step: 1, unit: 'dB', def: 45 }, { k: 'clap', t: 'tap', label: '손뼉 치기' }, THR(30)],
    period: 100, nz: 0.003,
    auto(t, e, s) { e.db = 45 + 25 * Math.max(0, Math.sin(t / 6)); const c = t % 10; if (c < 0.06 && (!s.la || t - s.la > 1)) { s.la = t; e._tap_clap = 1; } },
    sim(e, s, x) {
      if (e._tap_clap) { s.clapT = x.t; e._tap_clap = 0; }
      const db = x.t - (s.clapT ?? -9) < 0.15 ? 100 : e.db;
      const vc = x.B.vcc, a = Math.min(vc / 2, o.k * Math.pow(10, (db - 40) / 20));
      const v = clamp(vc / 2 + a * Math.sin(Math.random() * 6.283), 0, vc);
      s.p2pV = Math.min(vc, 2 * a * (0.8 + 0.2 * Math.random()));
      const det = a > vc * 0.5 * (e.thr / 100);
      return { ch: { AO: { k: 'a', v }, DO: { k: 'd', v: det ? 1 : 0 } }, led: { sig: det }, vis: { db } };
    },
    read(r, s) { const max = r.B.adcMax; const p2p = Math.round(clamp(s.p2pV / (r.B.esp ? 3.0 : r.B.vcc) * max + Math.abs(gauss()) * 3, 0, max)); return { ao: r.AO.raw, p2p, do: r.DO }; },
    show: [{ k: 'p2p', label: '소리 크기 (p-p)', unit: '' }, { k: 'ao', label: 'AO 순간값', unit: '' }, { k: 'do', label: 'DO', bool: ['조용', '큰 소리'] }],
    plot: [{ k: 'p2p', label: '소리 크기', min: 0, max: 'adc' }, { k: 'do', label: 'DO', min: -0.2, max: 1.2, step: true, color: '#f6c047' }],
    rules: [{ k: 'do', dir: 'flag', eq: 1, lv: 1, name: '큰 소리' }],
    code: (s, B) => `${head(s, B, ['AO = 소리 파형, DO = 큰 소리면 HIGH (가변저항으로 기준 조절)'])}
const int AO_PIN = ${pinOf(s, 'AO', B)};
const int DO_PIN = ${pinOf(s, 'DO', B)};
const int ADC_MAX = ${B.adcMax};
const unsigned long WINDOW_MS = 100;   // 이 시간 동안 최대·최소를 구함

void setup() {
  Serial.begin(${B.baud});
  pinMode(DO_PIN, INPUT);
}

void loop() {
  unsigned long start = millis();
  int lo = ADC_MAX, hi = 0, last = 0, det = 0;
  while (millis() - start < WINDOW_MS) {   // 100ms 동안 최대한 많이 읽기
    last = analogRead(AO_PIN);
    if (last < lo) lo = last;
    if (last > hi) hi = last;
    if (digitalRead(DO_PIN) == HIGH) det = 1;
  }
  Serial.print("ao:");   Serial.print(last);
  Serial.print(",p2p:"); Serial.print(hi - lo);   // 소리 크기
  Serial.print(",do:");  Serial.println(det);
}
`,
  };
}
