
let THREE, OrbitControls, CSS2DRenderer, CSS2DObject, RoundedBoxGeometry;
const { T, F } = window.I18N;   // 번역: T(한국어 원문), F(템플릿 키, 값)
const LAB = { loads: {}, parts: {} };   // 가상 실습에서 움직일 3D 부품 참조

/* ================= 좌표계 =================
   사진과 같은 배치: 브레드보드 2개를 세로로 놓고 가운데(스펀지)에 ESP32를 걸쳐 꽂음.
   1 단위 = 구멍 간격 2.54mm. x = 가로, z = 행(1행이 앞쪽, 63행이 먼 쪽), y = 위.
   아래 보드: [− + 레일] F G H I J | A B C D E   (레일: + = 5V, − = GND)
   위 보드: F G H I J | A B C D E [− + 레일]  (레일: + = 3V3, − = GND)
   ESP32: 아래쪽 핀 줄 = 아래 보드 D열, 위쪽 핀 줄 = 위 보드 F열, 1~19행, USB 쪽 = 1행 */
const COLX = {
  L: { '-': -25.5, '+': -24.5, F: -21.5, G: -20.5, H: -19.5, I: -18.5, J: -17.5, A: -14.5, B: -13.5, C: -12.5, D: -11.5, E: -10.5 },
  R: { F: -1.5, G: -0.5, H: 0.5, I: 1.5, J: 2.5, A: 5.5, B: 6.5, C: 7.5, D: 8.5, E: 9.5, '-': 12.5, '+': 13.5 }
};
const rowZ = r => 32 - r;
const TABLE_Y = -3.5;
const RAIL_NET = { 'L+': '5V', 'L-': 'GND', 'R+': '3V3', 'R-': 'GND' };
const ESP_L = { 19:'3V3', 18:'EN', 17:'VP', 16:'VN', 15:'GPIO34', 14:'GPIO35', 13:'GPIO32', 12:'GPIO33', 11:'GPIO25', 10:'GPIO26', 9:'GPIO27', 8:'GPIO14', 7:'GPIO12', 6:'GND', 5:'GPIO13', 4:'D2', 3:'D3', 2:'CMD', 1:'5V' };
const ESP_R = { 19:'GND', 18:'GPIO23', 17:'GPIO22', 16:'TX', 15:'RX', 14:'GPIO21', 13:'GND', 12:'GPIO19', 11:'GPIO18', 10:'GPIO5', 9:'GPIO17', 8:'GPIO16', 7:'GPIO4', 6:'GPIO0', 5:'GPIO2', 4:'GPIO15', 3:'D1', 2:'D0', 1:'CLK' };
const COLORS = { v5:'#d62f2f', gnd:'#1c1c1c', v3:'#f08a12', ana:'#1e9e55', dig:'#2563c9', spi:'#8a3fb8', ow:'#0f8f86', load:'#e8c21a', jmp:'#ececec' };
const COLOR_KO = { v5:'빨강', gnd:'검정', v3:'주황', ana:'초록', dig:'파랑', spi:'보라', ow:'청록', load:'노랑', jmp:'흰색' };
const COLOR_NAME = new Proxy({}, { get: (_, k) => T(COLOR_KO[k]) });
const NET_KO = { v5:'5V', gnd:'GND', v3:'3V3', ana:'아날로그 입력', dig:'디지털 신호', spi:'TFT SPI 신호', ow:'1-Wire', load:'부하 전류', jmp:'같은 신호 잇기' };
const NET_NAME = new Proxy({}, { get: (_, k) => T(NET_KO[k]) });

/* 보드 밖 부품 */
const RELAY = { x: -37, z: -3 };           // 아래 보드 왼편 탁자 위
const RELAY_PINS = { S: -1, '+': 0, '-': 1 };
const RELAY_TERM = { NO: 2.5, COM: 0, NC: -2.5 };   // 수정됨: 실제 모듈 사진 기준 (핀이 오른쪽일 때 위=NO, 아래=NC)
const TFT = { x: 31, z: -4 };               // 위 보드 오른편 탁자 위 (3.5인치 TFT)
const TFT_NAMES = ['GND','VCC','SCL','SDA','RST','DC','CS','BL','SDO'];
const TFT_PIN_X = TFT.x - 10.2, TFT_PIN_Z0 = -6;

function espOf(board, col, row) {
  if (row < 1 || row > 19) return null;
  if (board === 'L' && 'ABCDE'.includes(col)) return ESP_L[row];
  if (board === 'R' && 'FGHIJ'.includes(col)) return ESP_R[row];
  return null;
}
function parse(spec) {
  if (spec.startsWith('RELAY:')) {
    const k = spec.slice(6);
    if (k in RELAY_TERM) return { kind:'screw', k, x: RELAY.x + RELAY_TERM[k], y: TABLE_Y + 3.4, z: RELAY.z - 5.7 };
    return { kind:'pin', k, x: RELAY.x + RELAY_PINS[k], y: TABLE_Y + 2.0, z: RELAY.z + 6.9 };
  }
  if (spec.startsWith('TFT:')) { const n = +spec.slice(4); return { kind:'pin', n, x: TFT_PIN_X, y: TABLE_Y + 2.1, z: TFT_PIN_Z0 + (n - 1) }; }
  let m = spec.match(/^([LR])([+-])@(\d+)$/);
  if (m) return { kind:'rail', board: m[1], sign: m[2], row: +m[3], x: COLX[m[1]][m[2]], y: 0, z: rowZ(+m[3]) };
  m = spec.match(/^([LR])([A-J])(\d+)$/);
  if (m) return { kind:'hole', board: m[1], col: m[2], row: +m[3], x: COLX[m[1]][m[2]], y: 0, z: rowZ(+m[3]), esp: espOf(m[1], m[2], +m[3]) };
  throw new Error('bad spec ' + spec);
}
const V3 = p => new THREE.Vector3(p.x, p.y, p.z);
function nice(spec) {
  const p = parse(spec);
  if (p.kind === 'hole') return F('hole', { b: F(p.board === 'L' ? 'boardL' : 'boardR'), cr: p.col + p.row }) + (p.esp ? F('holeEsp', { esp: p.esp }) : '');
  if (p.kind === 'rail') return F('rail', { b: F(p.board === 'L' ? 'boardL' : 'boardR'), s: p.sign === '+' ? '+' : '−', net: RAIL_NET[p.board + p.sign], r: p.row });
  if (spec.startsWith('RELAY:')) return F(p.kind === 'screw' ? 'relayTerm' : 'relayPin', { k: p.k });
  return F('tftPin', { n: TFT_NAMES[p.n - 1] });
}
function shortTag(spec) {
  const p = parse(spec);
  if (p.kind === 'hole') return `${p.board}-${p.col}${p.row}`;
  if (p.kind === 'rail') return F('railShort', { net: RAIL_NET[p.board + p.sign] });
  if (spec.startsWith('RELAY:')) return p.k;
  return TFT_NAMES[p.n - 1];
}

/* ================= 단계 데이터 ================= */
const R = (name, a, b, val, role, extra = {}) => ({ t:'res', name, a, b, val, role, ...extra });
const C = (name, a, b, role) => ({ t:'cap', name, a, b, role });
const W = (from, to, net, extra = {}) => ({ t:'wire', from, to, net, ...extra });
const STEPS = [
  { title:'보드와 ESP32 위치 확인', kicker:'준비',
    desc:'브레드보드 2개를 나란히 놓고 가운데에 ESP32를 걸쳐 꽂은 상태에서 시작합니다. ESP32 아래쪽 핀 줄(3V3~5V)은 아래 보드 D열, 위쪽 핀 줄(GND~CLK)은 위 보드 F열의 1~19행에 들어가고 USB는 오른쪽을 향합니다.',
    items:[],
    tips:['같은 행에서 ESP32에 가려지지 않은 구멍(아래 보드 A~C, 위 보드 G~J)이 그 핀과 연결됩니다. 예: 아래 보드 B15 = GPIO34.','아래 보드 레일은 + = 5V, − = GND, 위 보드 레일은 + = 3V3, − = GND로 씁니다.','ESP32 위쪽 핀 줄의 안테나 쪽 끝(19행) 핀은 쓰지 않습니다. GND는 아래쪽 줄 6행, 위쪽 줄 13행 핀을 씁니다.','레일이 가운데에서 끊긴 보드가 있습니다. 끊겨 있으면 짧은 점퍼로 이어 주세요.','조립하는 동안 USB는 빼 둡니다.'] },
  { title:'전원 레일 연결', kicker:'1단계',
    desc:'ESP32의 5V·GND를 아래 보드 레일로, 3V3·GND를 위 보드 레일로 뽑아 냅니다. 3V3선은 ESP32 안테나 위쪽(23행)으로 넘어갑니다.',
    items:[ W('LA1','L+@3','v5'), W('LA6','L-@6','gnd'), W('LA19','R+@23','v3',{ route:'zx', h:5.2 }), W('RJ13','R-@13','gnd') ],
    tips:['5V와 3V3 레일을 바꿔 꽂으면 3.3V 부품이 손상될 수 있습니다.','아래 보드 A1은 ESP32 5V 핀, A6은 GND 핀, A19는 3V3 핀과 같은 줄입니다.'], warn:[0] },
  { title:'5V 전원 전압 감시 → GPIO34', kicker:'2단계',
    desc:'USB 5V를 R1·R2(10kΩ)로 절반(약 2.5V)으로 나눠 GPIO34로 읽습니다. 전원이 떨어지거나 튀는지를 감시합니다. C1은 잡음을 줄입니다.',
    items:[ R('R1','L+@25','LF25','10k','5V 감시 분배기 위쪽'), R('R2','LG25','LG29','10k','5V 감시 분배기 아래쪽'), C('C1','LH25','LH29','분배기 잡음 필터'), W('LF29','L-@29','gnd'), W('LJ25','LB15','ana') ],
    tips:['25행이 분배기 가운데 점(약 2.5V), 29행이 GND 점입니다.','5V를 GPIO34에 직접 꽂으면 안 됩니다. 반드시 R1·R2를 거칩니다.','10kΩ 색띠: 갈·검·주. 220Ω·330Ω을 쓰면 값이 틀어집니다.'], warn:[1] },
  { title:'부하 저항과 션트 → GPIO35', kicker:'3단계',
    desc:'릴레이가 켜지면 5V → RL → RS → GND로 전류가 흐릅니다. RS1·RS2(220Ω 2개를 나란히 꽂아 110Ω)에 걸리는 전압을 GPIO35로 읽어 전류를 계산합니다. 처음엔 RL1(330Ω) 하나만 꽂습니다.',
    items:[ R('RL1','LG32','LG36','330','부하 저항 1번 (약 11mA)'), R('RL2','LH32','LH36','220','부하 저항 2번 · 과전류 실험용',{ghost:true}), R('RL3','LI32','LI36','220','부하 저항 3번 · 과전류 실험용',{ghost:true}),
            W('LF36','LF38','jmp'), R('RS1','LG38','LG42','220','전류 측정용 션트 (RS2와 병렬 = 110Ω)'), R('RS2','LH38','LH42','220','전류 측정용 션트 (RS1과 병렬 = 110Ω)'), C('C2','LI38','LI42','션트 잡음 필터'), W('LF42','L-@42','gnd'), W('LJ38','LB14','ana') ],
    tips:['흐린 RL2·RL3(220Ω)은 과전류 실험 때 하나씩 추가합니다. RL1만 11mA → +RL2 21mA 경고 → +RL3 26mA 위험·차단.','32행 = 부하 시작점(릴레이 NO가 들어올 곳), 36·38행 = 션트 위쪽, 42행 = GND입니다.','RS1·RS2는 둘 다 38행과 42행 사이에 꽂아 병렬로 만듭니다. 42행은 반드시 GND 레일로 갑니다.','330Ω 색띠: 주·주·갈, 220Ω: 빨·빨·갈.'], warn:[2] },
  { title:'릴레이 모듈', kicker:'4단계',
    desc:'릴레이는 부하를 끊는 스위치(실제 BMS의 컨택터)입니다. 아래 보드 바깥쪽(앞)에 두고 COM은 5V 레일, NO는 32행(부하 시작점)으로 연결합니다. 신호 S는 GPIO26 줄(C10)로 갑니다.',
    items:[ { t:'relay' }, W('L+@33','RELAY:COM','v5'), W('RELAY:NO','LF32','load'), W('RELAY:+','L+@37','v5'), W('RELAY:-','L-@39','gnd'), W('RELAY:S','LC10','dig') ],
    tips:['COM·NO 단자는 작은 드라이버로 나사를 풀고 수 점퍼 끝을 넣은 뒤 조입니다.','부하 선은 반드시 NO 단자입니다. NC에 꽂으면 릴레이가 꺼져 있을 때 전류가 흘러 동작이 거꾸로 됩니다.','신호 핀이 오른쪽에 오게 놓으면 나사 단자는 위에서부터 NO · COM · NC 순서입니다. 기판 인쇄로 한 번 더 확인하세요.'], warn:[1] },
  { title:'수동 부저 모듈 → GPIO25', kicker:'5단계',
    desc:'수동 부저 모듈을 위 보드 C32~C34에 꽂습니다(− + S 순서). +는 3V3 레일, −는 GND 레일, S는 GPIO25 줄(아래 보드 C11)로 갑니다.',
    items:[ { t:'module', kind:'buz', pins:['RC32','RC33','RC34'], labels:['−','+','S'] }, W('RE32','R-@32','gnd'), W('RE33','R+@33','v3'), W('RA34','LC11','dig') ],
    tips:['핀 순서가 다르면 기판 인쇄대로 32·33·34행에 맞춰 꽂으세요.','펌웨어가 tone()으로 주파수를 넣어 울리므로 수동 부저에 맞습니다.'] },
  { title:'DS18B20 온도센서 → GPIO4', kicker:'6단계',
    desc:'검은 기판 디지털 온도 센서(DS18B20)를 위 보드 C26~C28에 꽂습니다(S + − 순서). S는 GPIO4 줄(I7), +는 3V3, −는 GND입니다.',
    items:[ { t:'module', kind:'ds', pins:['RC26','RC27','RC28'], labels:['S','+','−'] }, W('RA26','RI7','ow'), W('RE27','R+@27','v3'), W('RE28','R-@28','gnd') ],
    tips:['+를 5V에 꽂으면 ESP32 입력에 5V가 걸립니다. 반드시 위 보드 3V3 레일입니다.','빨간 기판의 아날로그 온도 센서 모듈과 헷갈리지 마세요.'], warn:[0] },
  { title:'RGB LED 모듈', kicker:'7단계',
    desc:'RGB 모듈(− R G B)을 아래 보드 J44~J47에 꽂고, 색마다 330Ω을 거쳐 49·50·51행으로 뺀 뒤 GPIO27·14·33 줄로 연결합니다.',
    items:[ { t:'module', kind:'rgb', pins:['LJ44','LJ45','LJ46','LJ47'], labels:['−','R','G','B'] },
            R('저항(R)','LG45','LG49','330','빨강 전류 제한'), R('저항(G)','LH46','LH50','330','초록 전류 제한'), R('저항(B)','LI47','LI51','330','파랑 전류 제한'),
            W('LF44','L-@44','gnd'), W('LF49','LB9','dig'), W('LF50','LB8','dig'), W('LF51','LB12','dig') ],
    tips:['B9 = GPIO27(빨강), B8 = GPIO14(초록), B12 = GPIO33(파랑) 줄입니다.','모듈 핀 순서가 다르면 기판 인쇄대로 맞춰 주세요. 정상일 때 초록이 아니라면 색 선이 한 칸씩 밀린 것입니다.'] },
  { title:'푸시버튼 → GPIO13', kicker:'8단계',
    desc:'버튼을 아래 보드 가운데 홈에 걸쳐 J53·J55·A53·A55에 꽂습니다. 누르면 53행과 55행이 이어져 GPIO13이 GND가 됩니다.',
    items:[ { t:'button', legs:['LJ53','LJ55','LA53','LA55'] }, W('LF53','LC5','dig'), W('LF55','L-@55','gnd') ],
    tips:['다리가 홈을 가로지르게 꽂아야 합니다. 90° 돌려 꽂으면 항상 눌린 상태가 됩니다.','C5는 GPIO13 줄입니다(INPUT_PULLUP).'] },
  { title:'3.5인치 TFT 전원', kicker:'9단계',
    desc:'3.5인치 TFT를 위 보드 바깥쪽(뒤)에 화면이 위로 오게 두고, 뒷면 9핀 헤더(GND VCC SCL SDA RST DC CS BL SDO)를 보드 쪽으로 향하게 합니다. 전원은 모두 위 보드 레일(3V3)에서 받습니다.',
    items:[ { t:'tft' }, W('TFT:1','R-@38','gnd'), W('TFT:2','R+@37','v3'), W('TFT:8','R+@31','v3') ],
    tips:['VCC는 3V3로 연결합니다. 판매처 사양에서 5V 입력이 확인되기 전에는 5V를 넣지 마세요.','BL(백라이트)을 3V3에 연결하면 화면이 항상 켜집니다.','SDO는 쓰지 않으니 비워 둡니다.'], warn:[0] },
  { title:'TFT SPI 신호선', kicker:'10단계',
    desc:'ESP32 위쪽 핀 줄(위 보드 J열)에서 TFT 신호 핀으로 5가닥을 연결합니다. 모두 3.3V 신호라 그대로 연결하면 됩니다.',
    items:[ W('RJ11','TFT:3','spi'), W('RJ18','TFT:4','spi'), W('RJ12','TFT:5','spi'), W('RJ8','TFT:6','spi'), W('RJ9','TFT:7','spi') ],
    tips:['J11 = GPIO18 → SCL, J18 = GPIO23 → SDA, J12 = GPIO19 → RST, J8 = GPIO16 → DC, J9 = GPIO17 → CS.','화면이 하얗게만 나오면 SPI 속도를 10MHz로 낮추고, 그래도 안 되면 config.h의 TFT_DRIVER_ST7796을 0(ILI9488)으로 바꿔 보세요.'] },
  { title:'전압 측정 위치 (5V 감시)', kicker:'측정', all:true, probe:true,
    desc:'멀티미터를 DC V에 놓고 검은 리드는 아래 보드 − 레일(GND)에 고정한 채, 빨간 리드를 ①→②→③ 순서로 대 보세요. 화면의 VBUS가 0V 근처로 나오면 어디서 끊겼는지 알 수 있습니다.',
    items:[ { t:'probe', at:'L+@22', n:'①', label:'5V 레일', expect:'약 4.6~5.1V' }, { t:'probe', at:'LI25', n:'②', label:'분배 점 25행 (R1·R2 사이)', expect:'약 2.3~2.5V' },
            { t:'probe', at:'LA15', n:'③', label:'GPIO34 줄 15행', expect:'②와 같은 값' }, { t:'probe', at:'L-@27', n:'COM', label:'검은 리드 (GND)', expect:'여기에 고정', black:true } ],
    tips:['① 이 0V면: ESP32 5V 핀 → 5V 레일 점퍼(A1)를 확인하세요.','① 은 정상인데 ② 가 0V면: R1·R2와 29행 GND 점퍼를 확인하세요.','② 는 정상인데 ③ 이 0V면: J25 → B15 점퍼가 한 칸 밀린 것입니다. 34 바로 옆이 35입니다.','멀티미터가 없으면 220Ω + LED를 5V 레일과 GND 사이에 꽂아 레일에 전기가 오는지 볼 수 있습니다.'] },
  { title:'최종 점검', kicker:'완성', all:true,
    desc:'모든 부품이 연결된 모습입니다. USB를 꽂기 전에 아래를 확인하세요.',
    items:[],
    tips:['5V를 GPIO34에 직접 꽂지 않고 R1·R2(25행)를 거쳤는가','RS1·RS2(38~42행)가 GND로 가는가','릴레이 부하 선이 NC가 아니라 NO 단자에 있는가','RL2·RL3는 빼 두었는가 (과전류 실험 때만 꽂음)','DS18B20·수동 부저의 +가 위 보드 3V3 레일에 있는가','TFT VCC·BL이 위 보드 3V3 레일에 있고 SDO는 비어 있는가','펌웨어 v3를 올렸는가 (부팅 화면에 FW v3 표시)'] },
];

/* ================= 장면 ================= */
const view = document.getElementById('view');
let renderer, labelRenderer, scene, camera, controls;
const stepGroups = STEPS.map(() => []);
const stepTags = STEPS.map(() => []);
const pickables = [];
const allTags = [];
let current = 0, showAll = false, showTags = true, viewMode = 'auto', boards = [];

function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o }); }
const METAL = () => M('#c9cdd1', { metalness: .85, roughness: .3 });
const GOLD = () => M('#d4af37', { metalness: .85, roughness: .3 });
function cyl(a, b, r, m, seg = 12) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  mesh.position.copy(a).addScaledVector(d, .5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
function rbox(w, h, d, m, x, y, z, r = .15) { const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)); const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); return mesh; }
function box(w, h, d, m, x, y, z) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); return mesh; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function flatLabel(tex, w, d, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .7 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rotY; m.position.set(x, y, z); return m;
}
function tag(text, p, cls = '') {   // text는 함수: 언어를 바꾸면 다시 계산
  const el = document.createElement('div'); el.className = 'tag ' + cls; el._text = typeof text === 'function' ? text : () => text; el.textContent = el._text();
  const o = new CSS2DObject(el); o.position.copy(p); allTags.push(o); return o;
}
function setInfo(grp, info) { grp.userData.info = typeof info === 'function' ? info : () => info; grp.traverse(o => { if (o.isMesh) { o.userData.owner = grp; pickables.push(o); } }); return grp; }

/* ---------- 브레드보드 ---------- */
function buildBoard(board) {
  const cols = COLX[board];
  const x0 = board === 'L' ? -27 : -3, x1 = board === 'L' ? -9 : 15, W = x1 - x0, D = 66;
  const PX = 26;
  const tex = canvasTex(W * PX, D * PX, (g, w, h) => {
    const U = x => (x - x0) * PX, V = z => (z + 33) * PX;
    g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, w, h);
    const gapX = (cols.J + cols.A) / 2;
    g.fillStyle = '#dcd8cc'; g.fillRect(U(gapX - .7), 0, 1.4 * PX, h);
    const vline = (x, c) => { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(U(x), V(-31.5)); g.lineTo(U(x), V(31.5)); g.stroke(); };
    if (board === 'L') { vline(cols['-'] - .75, '#2e5fd0'); vline(cols['+'] + .75, '#d62f2f'); }
    else { vline(cols['-'] - .75, '#2e5fd0'); vline(cols['+'] + .75, '#d62f2f'); }
    for (let r = 1; r <= 63; r++) {
      for (const k in cols) {
        const x = cols[k], z = rowZ(r);
        g.fillStyle = '#2f2f2f'; g.fillRect(U(x) - 5, V(z) - 5, 10, 10);
        g.fillStyle = '#6a6a6a'; g.fillRect(U(x) - 3, V(z) - 3, 6, 6);
      }
    }
    g.fillStyle = '#5a5a5a'; g.font = '600 13px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const numX = board === 'L' ? [cols.F - 1.6, cols.E + 1.0] : [cols.F - 1.0, cols.E + 1.5];
    for (let r = 1; r <= 63; r++) if (r === 1 || r % 5 === 0) numX.forEach(x => g.fillText(r, U(x), V(rowZ(r))));
    g.font = '700 14px "IBM Plex Mono", monospace';
    for (const k of 'ABCDEFGHIJ') { g.fillText(k, U(cols[k]), V(32.4)); g.fillText(k, U(cols[k]), V(-32.4)); }
    g.font = '700 20px sans-serif';
    g.fillStyle = '#d62f2f'; g.fillText('+', U(cols['+']), V(32.4)); g.fillText('+', U(cols['+']), V(-32.4));
    g.fillStyle = '#2e5fd0'; g.fillText('−', U(cols['-']), V(32.4)); g.fillText('−', U(cols['-']), V(-32.4));
  });
  const grp = new THREE.Group();
  const body = rbox(W, 3.5, D, M('#efede6', { roughness: .8 }), (x0 + x1) / 2, -1.75, 0, .5);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W - .1, D - .1), new THREE.MeshStandardMaterial({ map: tex, roughness: .85 }));
  top.rotation.x = -Math.PI / 2; top.position.set((x0 + x1) / 2, .02, 0);
  top.userData.board = board; body.userData.board = board;
  grp.add(body, top);
  pickables.push(top);
  return grp;
}

/* ---------- 부품 ---------- */
const BAND = { '0':'#111','1':'#7a4a1e','2':'#d02a2a','3':'#ef7d16','4':'#f2d21b','5':'#2d9a3e','6':'#2f5fd0','7':'#7d3fb5','8':'#888','9':'#f4f4f4' };
function bands(val) {
  const ohm = { '10':10, '220':220, '330':330, '1k':1000, '10k':10000, '100k':100000 }[val];
  const s = String(ohm); return [BAND[s[0]], BAND[s[1] || '0'], BAND[String(s.length - 2)], '#c9a43a'];
}
function valText(v) { return v.endsWith('k') ? v.replace('k', 'kΩ') : v + 'Ω'; }
function resistor(it) {
  const grp = new THREE.Group(); const A = V3(parse(it.a)), B = V3(parse(it.b));
  const H = .95, L = 2.5;
  const At = A.clone().setY(H), Bt = B.clone().setY(H), leg = METAL();
  const dir = new THREE.Vector3().subVectors(Bt, At).normalize(), mid = At.clone().add(Bt).multiplyScalar(.5);
  grp.add(cyl(A.clone().setY(-.3), At, .065, leg), cyl(B.clone().setY(-.3), Bt, .065, leg));
  const p1 = mid.clone().addScaledVector(dir, -L / 2), p2 = mid.clone().addScaledVector(dir, L / 2);
  grp.add(cyl(At, p1, .065, leg), cyl(p2, Bt, .065, leg));
  const prof = [[0,0],[.3,0],[.42,.12],[.43,.45],[.35,.7],[.34,1.25],[.35,1.8],[.43,2.05],[.42,2.38],[.3,2.5],[0,2.5]].map(([r, y]) => new THREE.Vector2(r, y - L / 2));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), M('#dcc79c', { roughness: .5 }));
  body.position.copy(mid); body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); grp.add(body);
  const bl = bands(it.val);
  [[.3, .44], [.95, .36], [1.2, .36], [2.15, .44]].forEach(([t, r], k) => {
    const q = p1.clone().addScaledVector(dir, t);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16, 24), M(bl[k], { roughness: .4 }));
    ring.position.copy(q); ring.quaternion.copy(body.quaternion); grp.add(ring);
  });
  if (/^(R1|R2|RL1|RL2|RL3|RS1|RS2)$/.test(it.name)) LAB.parts[it.name] = grp;
  grp.userData.resName = it.name;
  if (it.name === 'RL2' || it.name === 'RL3') { LAB.loads[it.name] = grp; grp.userData.action = it.name.toLowerCase(); }
  return setInfo(grp, () => ({ title: `${T(it.name)} ${valText(it.val)}`, lines: [T(it.role), `${nice(it.a)} ↔ ${nice(it.b)}`], sub: F('bands', { c: F('band_' + it.val) }) }));
}
function capacitor(it) {
  const grp = new THREE.Group(); const A = V3(parse(it.a)), B = V3(parse(it.b)), leg = METAL();
  const mid = A.clone().add(B).multiplyScalar(.5);
  const top = mid.clone().setY(2.3);
  const At = A.clone().setY(.6), Bt = B.clone().setY(.6);
  grp.add(cyl(A.clone().setY(-.3), At, .055, leg), cyl(B.clone().setY(-.3), Bt, .055, leg));
  const ta = top.clone().lerp(A, .18).setY(2.2), tb = top.clone().lerp(B, .18).setY(2.2);
  grp.add(cyl(At, ta, .055, leg), cyl(Bt, tb, .055, leg));
  const face = canvasTex(128, 128, (g) => { g.fillStyle = '#e07a26'; g.beginPath(); g.arc(64, 64, 64, 0, 7); g.fill(); g.fillStyle = '#3a2410'; g.font = '700 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('104', 64, 66); });
  const mats = [M('#d9752a'), new THREE.MeshStandardMaterial({ map: face }), new THREE.MeshStandardMaterial({ map: face })];
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .38, 28), mats);
  disc.position.copy(top).setY(3.0);
  const along = new THREE.Vector3().subVectors(B, A).normalize();
  const normal = new THREE.Vector3(-along.z, 0, along.x);   // 원판 면이 다리 방향과 나란하도록
  disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  grp.add(disc);
  LAB.parts[it.name] = grp;
  return setInfo(grp, () => ({ title: `${it.name} 100nF (104)`, lines: [T(it.role), `${nice(it.a)} ↔ ${nice(it.b)}`], sub: T('세라믹 커패시터 · 방향 없음') }));
}
function potentiometer(it) {
  const grp = new THREE.Group(); const P = it.legs.map(s => V3(parse(s)));
  P.forEach(p => grp.add(cyl(p.clone().setY(-.3), p.clone().setY(1.4), .1, METAL())));
  const c = P[1];
  grp.add(rbox(.5, 2.4, 6.4, M('#b8322b'), c.x - .1, 2.4, c.z, .1));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 1.6, 40), M('#9aa3a9', { metalness: .6, roughness: .35 }));
  body.rotation.z = Math.PI / 2; body.position.set(c.x - 1.1, 4.4, c.z); grp.add(body);
  const bush = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.2, 32), M('#c2c6c9', { metalness: .8, roughness: .3 }));
  bush.rotation.z = Math.PI / 2; bush.position.set(c.x - 2.5, 4.4, c.z); grp.add(bush);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.2, 18), M('#d7dadc', { metalness: .7, roughness: .45, flatShading: true }));
  shaft.rotation.z = Math.PI / 2; shaft.position.set(c.x - 5.1, 4.4, c.z); grp.add(shaft);
  grp.add(box(.25, .5, 2.4, M('#666'), c.x - 7.2, 4.4, c.z));
  return setInfo(grp, () => ({ title: it.name, lines: [T(it.role)] }));
}
function moduleV(it) {
  const grp = new THREE.Group(); const P = it.pins.map(s => V3(parse(s)));
  P.forEach(p => grp.add(cyl(p.clone().setY(-.3), p.clone().setY(1.4), .12, GOLD())));
  grp.add(box(.9, .9, P.length * 1 + .1, M('#151515'), P[0].x, .55, (P[0].z + P[P.length - 1].z) / 2));
  const cz = (P[0].z + P[P.length - 1].z) / 2, x = P[0].x;
  const w = it.kind === 'rgb' ? 6.2 : 6.6, h = 6.4;
  const pivot = new THREE.Group(); pivot.position.set(x, 1.4, cz);
  pivot.rotation.z = it.kind === 'rgb' ? -0.55 : 0.55;   // 옆 구멍이 가려지지 않게 살짝 기울임
  const face = canvasTex(330, 320, (g) => {
    g.fillStyle = '#16181a'; g.fillRect(0, 0, 330, 320);
    g.fillStyle = '#c9a43a'; [[30,30],[300,30]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 16, 0, 7); g.fill(); g.fillStyle = '#16181a'; g.beginPath(); g.arc(a, b, 9, 0, 7); g.fill(); g.fillStyle = '#c9a43a'; });
    g.fillStyle = '#e8e8e8'; g.textAlign = 'center'; g.font = '600 34px "IBM Plex Sans KR", sans-serif';
    g.fillText({ ds:'DS18B20', rgb:'RGB LED', buz:'BUZZER' }[it.kind], 165, 290);
    g.font = '700 30px "IBM Plex Mono", monospace';
    it.labels.forEach((l, i) => g.fillText(l, 165 + (i - (it.labels.length - 1) / 2) * 62, 248));
  });
  const mats = [M('#16181a'), M('#16181a'), M('#16181a'), M('#16181a'), new THREE.MeshStandardMaterial({ map: face }), new THREE.MeshStandardMaterial({ map: face })];
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(.5, h, w), [mats[4], mats[5], mats[2], mats[3], mats[0], mats[1]]);
  pcb.position.set(0, h / 2, 0); pivot.add(pcb);
  const sgn = it.kind === 'rgb' ? 1 : -1;
  if (it.kind === 'ds') {
    const to92 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.9, 24, 1, false, 0, Math.PI), M('#0d0d0d', { roughness: .35 }));
    to92.position.set(sgn * .3, h * .6, 0); to92.rotation.y = 0; pivot.add(to92);
    [-.6, 0, .6].forEach(dz => pivot.add(cyl(new THREE.Vector3(sgn * .4, h * .6 - .95, dz), new THREE.Vector3(sgn * .4, h * .6 - 2, dz), .05, METAL())));
    pivot.add(box(.2, .5, .9, M('#2a6bd8', { emissive:'#1a3c80', emissiveIntensity:.4 }), sgn * .3, h * .25, 1.8));
  } else if (it.kind === 'buz') {
    const bz = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.4, 32), M('#1d1d1f', { roughness: .35 }));
    bz.rotation.z = Math.PI / 2; bz.position.set(sgn * 1.9, h * .58, 0); pivot.add(bz);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .05, 16), M('#000'));
    hole.rotation.z = Math.PI / 2; hole.position.set(sgn * 3.62, h * .58, 0); pivot.add(hole);
  } else {
    pivot.add(rbox(.6, 2.0, 2.0, M('#f6f6f2', { roughness: .3 }), sgn * .45, h * .6, 0, .1));
    const die = new THREE.Mesh(new THREE.CircleGeometry(.65, 24), M('#fff4c2', { emissive:'#ffe7a0', emissiveIntensity:.4 }));
    LAB.rgbDie = die; LAB.rgbGlowAt = () => die.getWorldPosition(new THREE.Vector3());
    die.rotation.y = Math.PI / 2 * sgn; die.position.set(sgn * .76, h * .6, 0); pivot.add(die);
  }
  grp.add(pivot);
  const names = { ds:['DS18B20 디지털 온도 센서', '센서 키트 검은 기판 · 1-Wire · 정확도 ±0.5°C'], buz:['수동 부저 모듈', '센서 키트 · tone()으로 주파수를 넣어 울림'], rgb:['RGB SMD LED 모듈', '부품시트 3색 LED · 4단계 상태 색 표시'] }[it.kind];
  LAB.parts[it.kind] = grp; if (it.kind === 'ds') { grp.userData.action = 'ds'; LAB.dsPivot = pivot; } if (it.kind === 'buz') LAB.buzAt = () => pivot.localToWorld(new THREE.Vector3(-3.6, h * .58, 0));
  return setInfo(grp, () => ({ title: T(names[0]), lines: [F('pins', { list: it.labels.map((l, i) => `${l}→${parse(it.pins[i]).col}${parse(it.pins[i]).row}`).join(', ') })], sub: T(names[1]) }));
}
function tactSwitch(it) {
  const grp = new THREE.Group(); const P = it.legs.map(s => V3(parse(s)));
  const c = P.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / 4);
  P.forEach(p => { const k = p.clone().setY(.5); const q = c.clone().lerp(p, .55).setY(.9); grp.add(cyl(p.clone().setY(-.3), k, .08, METAL()), cyl(k, q, .08, METAL())); });
  grp.add(rbox(2.5, 1.3, 2.5, M('#25292d'), c.x, 1.25, c.z, .12));
  grp.add(box(2.4, .12, 2.4, M('#c9cdd1', { metalness: .8, roughness: .3 }), c.x, 1.95, c.z));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.72, .78, 1.1, 24), M('#111', { roughness: .4 }));
  cap.position.set(c.x, 2.55, c.z); grp.add(cap);
  LAB.parts.button = grp; LAB.buttonCap = cap; grp.userData.action = 'button';
  return setInfo(grp, () => ({ title: T('푸시버튼 (택트 스위치)'), lines: [T('누르면 53행과 55행이 연결'), F('legs', { list: it.legs.map(s => parse(s).col + parse(s).row).join(' · ') })], sub: T('짧게: 부하 ON/OFF · 길게(1.5초): 그래프 모드') }));
}
function espBoard() {
  const grp = new THREE.Group();
  const x0 = -12, x1 = -1, zTop = 11.2, zBot = 33.4, W = x1 - x0, D = zBot - zTop, cx = (x0 + x1) / 2, cz = (zTop + zBot) / 2;
  const Y = 1.0;   // 핀 헤더 플라스틱 위
  grp.add(box(1, Y, 19, M('#161616'), COLX.L.D, Y / 2, rowZ(10)), box(1, Y, 19, M('#161616'), COLX.R.F, Y / 2, rowZ(10)));
  const PX = 44;
  const silk = canvasTex(W * PX, D * PX, (g, w, h) => {
    const U = x => (x - x0) * PX, V = z => (z - zTop) * PX;
    g.fillStyle = '#121416'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e9e9e9'; g.lineWidth = 2; g.strokeRect(U(x0 + .3), V(zTop + .3), (W - .6) * PX, (D - .6) * PX);
    for (let r = 1; r <= 19; r++) {
      [[COLX.L.D, ESP_L[r], 'left'], [COLX.R.F, ESP_R[r], 'right']].forEach(([x, n, side]) => {
        g.fillStyle = '#d4af37'; g.beginPath(); g.arc(U(x), V(rowZ(r)), 14, 0, 7); g.fill(); g.fillStyle = '#121416'; g.beginPath(); g.arc(U(x), V(rowZ(r)), 6, 0, 7); g.fill();
        g.fillStyle = '#f2f2f2'; g.font = '700 17px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
        const short = n.replace('GPIO', '');
        g.textAlign = side === 'left' ? 'left' : 'right';
        g.fillText(short, U(x) + (side === 'left' ? 22 : -22), V(rowZ(r)) + 1);
      });
    }
    g.fillStyle = '#c9a43a'; g.font = '600 18px "IBM Plex Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText('ESP32-DevKitC V4', U(cx), V(29.9));
    g.fillStyle = '#e9e9e9'; g.fillText('EN', U(-9.6), V(31.0)); g.fillText('Boot', U(-3.4), V(31.0));
  });
  const pcb = rbox(W, .4, D, M('#121416', { roughness: .6 }), cx, Y + .2, cz, .25);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W - .05, D - .05), new THREE.MeshStandardMaterial({ map: silk, roughness: .6 }));
  top.rotation.x = -Math.PI / 2; top.position.set(cx, Y + .41, cz);
  grp.add(pcb, top);
  // WROOM-32E 모듈: 안테나(먼 쪽) + 금속 실드
  const mod = rbox(7.1, .3, 10.0, M('#1b2a22'), cx, Y + .55, 16.4, .1); grp.add(mod);
  const ant = canvasTex(284, 112, (g) => { g.fillStyle = '#1b2a22'; g.fillRect(0, 0, 284, 112); g.strokeStyle = '#d4af37'; g.lineWidth = 6; g.beginPath(); let x = 30; g.moveTo(x, 90); for (let i = 0; i < 6; i++) { g.lineTo(x, 22); x += 18; g.lineTo(x, 22); g.lineTo(x, 90); x += 18; g.lineTo(x, 90); } g.stroke(); });
  grp.add(flatLabel(ant, 7.0, 2.6, cx, Y + .71, 12.8));
  const shield = rbox(6.8, .9, 7.0, M('#c4c8cc', { metalness: .85, roughness: .32 }), cx, Y + 1.15, 17.9, .12);
  grp.add(shield);
  const shTex = canvasTex(272, 280, (g) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 272, 280); g.fillStyle = '#3c4044'; g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.fillText('ESP32-WROOM-32E', 136, 90); g.font = '600 20px sans-serif'; g.fillText('Espressif', 136, 130); g.fillText('FCC ID 2AC7Z', 136, 170); });
  grp.add(flatLabel(shTex, 6.8, 7.0, cx, Y + 1.61, 17.9));
  // 아래쪽 회로
  grp.add(rbox(3.0, 1.2, 2.2, M('#cfd3d6', { metalness: .85, roughness: .3 }), cx, Y + 1.0, 33.0, .2));   // micro USB
  grp.add(box(2.1, .5, 2.1, M('#1a1a1a'), cx, Y + .65, 28.6));                                                    // USB-UART 칩
  grp.add(box(2.6, .7, 1.5, M('#1a1a1a'), cx + 2.2, Y + .75, 25.2), box(1.0, .1, .6, METAL(), cx + 2.2, Y + .45, 26.2)); // 레귤레이터
  [[-9.6, 31.0], [-3.4, 31.0]].forEach(([x, z]) => { grp.add(box(1.7, .6, 1.7, M('#2b2b2b'), x, Y + .7, z)); const b = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .35, 16), M('#d8d8d8')); b.position.set(x, Y + 1.15, z); grp.add(b); });
  grp.add(box(.5, .3, .35, M('#ff3b3b', { emissive:'#ff2020', emissiveIntensity: 1.2 }), -9.9, Y + .55, 27.0));
  LAB.parts.esp = grp;
  return setInfo(grp, () => ({ title: 'ESP32 DevKitC V4 (WROOM-32E)', lines: [T('아래쪽 핀 줄 → 아래 보드 D열, 위쪽 핀 줄 → 위 보드 F열 (1~19행)'), T('안테나는 왼쪽, USB는 오른쪽')], sub: T('같은 행의 빈 구멍이 그 핀과 연결됩니다') }));
}
function relayModule() {
  const grp = new THREE.Group(); const { x, z } = RELAY; const y0 = TABLE_Y;
  grp.add(rbox(10.2, .4, 13.4, M('#1c3e74'), x, y0 + .2, z, .2));
  grp.add(rbox(6.0, 6.0, 7.6, M('#2c66cc', { roughness: .4 }), x - .6, y0 + 3.4, z + .4, .3));
  const lab = canvasTex(240, 300, (g) => { g.fillStyle = '#2c66cc'; g.fillRect(0, 0, 240, 300); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 36px sans-serif'; g.fillText('SONGLE', 120, 80); g.font = '600 24px sans-serif'; g.fillText('SRD-05VDC', 120, 140); g.fillText('-SL-C', 120, 176); g.font = '600 20px sans-serif'; g.fillText('10A 250VAC', 120, 230); });
  grp.add(flatLabel(lab, 5.6, 7.2, x - .6, y0 + 6.42, z + .4));
  grp.add(rbox(7.6, 3.2, 3.0, M('#2f86d8', { roughness: .45 }), x, y0 + 2.0, z - 5.4, .2));
  Object.values(RELAY_TERM).forEach(dx => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .3, 20), M('#c0c4c8', { metalness: .85, roughness: .3 })); s.position.set(x + dx, y0 + 3.65, z - 5.4); grp.add(s);
    grp.add(box(1.1, .1, .18, M('#555'), x + dx, y0 + 3.82, z - 5.4));
    grp.add(box(1.1, 1.0, .2, M('#0e2e55'), x + dx, y0 + 1.6, z - 6.95));
  });
  grp.add(rbox(1.2, 1.6, .9, M('#121212'), x + 3.4, y0 + 1.2, z + 2.4, .15));          // 트랜지스터
  grp.add(cyl(new THREE.Vector3(x + 3.4, y0 + .7, z - 1.2), new THREE.Vector3(x + 3.4, y0 + .7, z + .4), .32, M('#1a1a1a')));  // 다이오드
  const led = box(.5, .4, .7, M('#ff3b3b', { emissive:'#ff2020', emissiveIntensity:.8 }), x + 3.6, y0 + .6, z + 4.4); grp.add(led); LAB.relayLed = led;
  Object.values(RELAY_PINS).forEach(dx => grp.add(cyl(new THREE.Vector3(x + dx, y0 + .4, z + 6.9), new THREE.Vector3(x + dx, y0 + 2.0, z + 6.9), .12, GOLD())));
  grp.add(box(3.1, .9, 1, M('#151515'), x, y0 + .85, z + 6.9));
  const pins = canvasTex(200, 60, (g) => { g.fillStyle = '#1c3e74'; g.fillRect(0, 0, 200, 60); g.fillStyle = '#fff'; g.font = '700 30px "IBM Plex Mono", monospace'; g.textAlign = 'center'; ['S','+','−'].forEach((t, i) => g.fillText(t, 36 + i * 64, 42)); });
  grp.add(flatLabel(pins, 3.2, 1, x, y0 + .41, z + 5.6));
  const terms = canvasTex(300, 60, (g) => { g.fillStyle = '#1c3e74'; g.fillRect(0, 0, 300, 60); g.fillStyle = '#fff'; g.font = '700 28px "IBM Plex Mono", monospace'; g.textAlign = 'center'; ['NC','COM','NO'].forEach((t, i) => g.fillText(t, 50 + i * 100, 42)); });
  grp.add(flatLabel(terms, 7.6, 1.5, x, y0 + .41, z - 3.3));
  LAB.parts.relay = grp; LAB.relayBody = grp.children[1];
  return setInfo(grp, () => ({ title: T('5V 릴레이 모듈'), lines: [T('신호 핀 S · + · − (앞쪽), 나사 단자 NO · COM · NC (뒤쪽)'), T('GPIO26 HIGH → NO와 COM 연결 → 부하 전류 흐름')], sub: T('센서 키트 · 위험 단계에서 부하 차단(컨택터 역할)') }));
}
function tftModule() {
  const grp = new THREE.Group(); const { x, z } = TFT; const y0 = TABLE_Y;
  // 파란 기판 (약 56 × 86mm), 긴 쪽이 앞뒤 방향
  grp.add(rbox(22.4, .5, 34.0, M('#1f4fa8', { roughness: .55 }), x, y0 + .25, z, .3));
  [[-9.9, -15.7], [9.9, -15.7], [-9.9, 15.7], [9.9, 15.7]].forEach(([dx, dz]) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .52, 20), M('#d9dde0', { metalness: .7 })); h.position.set(x + dx, y0 + .26, z + dz); grp.add(h); });
  grp.add(rbox(19.6, 1.0, 31.0, M('#0d0f11', { roughness: .3, metalness: .2 }), x + .9, y0 + 1.0, z, .25));
  // 화면: 가상 데이터로 1초마다 다시 그림 (가로 480×320 화면을 세로로 눕혀 둔 모습)
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 480;
  const scr = new THREE.CanvasTexture(cv); scr.colorSpace = THREE.SRGBColorSpace; scr.anisotropy = 8;
  LAB.tftCanvas = cv; LAB.tftTex = scr;
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(17.4, 26.6), new THREE.MeshBasicMaterial({ map: scr }));
  sm.rotation.x = -Math.PI / 2; sm.position.set(x + .9, y0 + 1.52, z); grp.add(sm);
  // 9핀 헤더 (보드 쪽 가장자리)
  for (let n = 1; n <= 9; n++) { const p = V3(parse('TFT:' + n)); grp.add(cyl(new THREE.Vector3(p.x, y0 + .5, p.z), p, .12, GOLD())); }
  grp.add(box(1, .8, 9.1, M('#151515'), TFT_PIN_X, y0 + .9, TFT_PIN_Z0 + 4));
  const names = canvasTex(110, 380, (g) => { g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, 110, 380); g.fillStyle = '#fff'; g.font = '700 22px "IBM Plex Mono", monospace'; g.textAlign = 'left'; TFT_NAMES.forEach((t, i) => g.fillText(t, 8, (i + .5) * 42 + 8)); });
  grp.add(flatLabel(names, 2.6, 9.0, TFT_PIN_X + 2.2, y0 + .51, TFT_PIN_Z0 + 4));
  LAB.parts.tft = grp;
  return setInfo(grp, () => ({ title: T('3.5인치 TFT (320×480, SPI)'), lines: [T('9핀: GND VCC SCL SDA RST DC CS BL SDO'), T('컨트롤러 ST7796S 또는 ILI9488 (LovyanGFX)')], sub: T('현장 대시보드: 상태 배너 · 수치 4칸 · 2분 추이 그래프') }));
}

/* ---------- 전선: 직각으로 정리된 경로 ---------- */
function roundedPath(pts, r) {
  const path = new THREE.CurvePath(); let prev = pts[0].clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i], dIn = new THREE.Vector3().subVectors(c, pts[i - 1]), dOut = new THREE.Vector3().subVectors(pts[i + 1], c);
    const rr = Math.min(r, dIn.length() / 2, dOut.length() / 2);
    if (rr < 1e-3) continue;
    const p1 = c.clone().addScaledVector(dIn.normalize(), -rr), p2 = c.clone().addScaledVector(dOut.normalize(), rr);
    if (prev.distanceTo(p1) > 1e-3) path.add(new THREE.LineCurve3(prev, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, c.clone(), p2)); prev = p2;
  }
  const last = pts[pts.length - 1]; if (prev.distanceTo(last) > 1e-3) path.add(new THREE.LineCurve3(prev, last));
  return path;
}
let laneCounter = 0;
function wire(it) {
  const grp = new THREE.Group();
  const A = parse(it.from), B = parse(it.to), col = COLORS[it.net];
  const end = (e) => {
    if (e.kind === 'hole' || e.kind === 'rail') {
      grp.add(rbox(.6, 1.15, .6, M('#151515', { roughness: .5 }), e.x, .6, e.z, .08));
      return new THREE.Vector3(e.x, 1.15, e.z);
    }
    if (e.kind === 'screw') return new THREE.Vector3(e.x, e.y + .2, e.z);
    grp.add(rbox(.66, 1.4, .66, M('#151515', { roughness: .5 }), e.x, e.y + .55, e.z, .08));
    return new THREE.Vector3(e.x, e.y + 1.25, e.z);
  };
  const s = end(A), t = end(B);
  const onBoard = (A.kind === 'hole' || A.kind === 'rail') && (B.kind === 'hole' || B.kind === 'rail');
  const manhattan = Math.abs(s.x - t.x) + Math.abs(s.z - t.z);
  let h;
  if (it.h) h = it.h;
  else if (onBoard && manhattan <= 7) h = 1.7;                 // 짧은 점퍼는 낮게
  else { h = 2.4 + (laneCounter % 7) * .5; laneCounter++; }     // 긴 선은 높이를 나눠 겹치지 않게
  const up1 = s.clone().setY(Math.max(h, s.y + .4)), up2 = t.clone().setY(Math.max(h, t.y + .4));
  const order = it.route || 'xz';
  const corner = order === 'xz' ? new THREE.Vector3(t.x, up1.y, s.z) : new THREE.Vector3(s.x, up1.y, t.z);
  const pts = [s, up1];
  if (Math.abs(corner.x - up1.x) + Math.abs(corner.z - up1.z) > .05 && Math.abs(corner.x - up2.x) + Math.abs(corner.z - up2.z) > .05) pts.push(corner);
  if (Math.abs(up2.y - up1.y) > .01) pts.push(new THREE.Vector3(up2.x, up1.y, up2.z));
  pts.push(up2, t);
  const curve = roundedPath(pts, .9);
  const len = curve.getLength();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(40, Math.round(len * 3)), .2, 10, false), M(col, { roughness: .42 }));
  grp.add(tube);
  const kind = wireKind(it);
  if (it.net === 'load') (LAB.loadWires = LAB.loadWires || []).push(grp);
  return setInfo(grp, () => ({ title: F('jumper', { c: COLOR_NAME[it.net], k: kind }), lines: [`${nice(it.from)}`, `→ ${nice(it.to)}`], sub: NET_NAME[it.net] }));
}
function wireKind(it) {
  const pinEnd = s => s.startsWith('TFT:') || (s.startsWith('RELAY:') && !['RELAY:COM','RELAY:NO','RELAY:NC'].includes(s));
  const a = pinEnd(it.from), b = pinEnd(it.to);
  return a && b ? 'F-F' : (a || b ? 'F-M' : 'M-M');
}

function ledPart(it) {
  const grp = new THREE.Group(); const A = V3(parse(it.a)), K = V3(parse(it.k));
  const top = A.clone().lerp(K, .5).setY(3.2), leg = METAL();
  grp.add(cyl(A.clone().setY(-.3), A.clone().setY(1.0), .06, leg), cyl(A.clone().setY(1.0), top.clone().add(new THREE.Vector3(0, -1.4, .3)), .06, leg));
  grp.add(cyl(K.clone().setY(-.3), K.clone().setY(.6), .06, leg), cyl(K.clone().setY(.6), top.clone().add(new THREE.Vector3(0, -1.4, -.3)), .06, leg));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 1.9, 24), M('#ff3030', { emissive:'#ff1a1a', emissiveIntensity: 1.1, transparent: true, opacity: .92, roughness: .2 }));
  body.position.copy(top).setY(top.y - .2); grp.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#ff3030', { emissive:'#ff1a1a', emissiveIntensity: 1.1, transparent: true, opacity: .92, roughness: .2 }));
  dome.position.copy(top).setY(top.y + .75); grp.add(dome);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .3, 24), M('#ff3030', { emissive:'#aa0000', emissiveIntensity: .6 }));
  rim.position.copy(top).setY(top.y - 1.2); grp.add(rim);
  return setInfo(grp, () => ({ title: 'LED', lines: [nice(it.a), nice(it.k)] }));
}

function arrowPart(it) {
  const grp = new THREE.Group(); const A = V3(parse(it.from)), B = V3(parse(it.to));
  const a = A.clone().setY(A.y + 1.2), b = B.clone().setY(B.y + 1.6), c = a.clone().lerp(b, .5).add(new THREE.Vector3(0, 4.5, -2.2));
  const curve = new THREE.QuadraticBezierCurve3(a, c, b);
  const mat = M('#ff2d2d', { emissive:'#ff1a1a', emissiveIntensity: .7 });
  grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .28, 10, false), mat));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.8, 1.8, 20), mat);
  const t = curve.getTangent(1).normalize(); tip.position.copy(b).addScaledVector(t, .4); tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t); grp.add(tip);
  [A, B].forEach((P, k) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, .16, 10, 32), M(k ? '#22c55e' : '#ff2d2d', { emissive: k ? '#16a34a' : '#ff1a1a', emissiveIntensity: .8 })); ring.rotation.x = Math.PI / 2; ring.position.copy(P).setY(P.y + .45); grp.add(ring); });
  return setInfo(grp, () => ({ title: 'NC → NO', lines: [] }));
}

function probe(it) {
  const grp = new THREE.Group(); const p = V3(parse(it.at));
  if (it.tagOnly) return grp;   // 표시만 하고 측정봉은 그리지 않음
  const col = it.black ? '#1b1b1b' : '#d62f2f';
  const tip = p.clone().setY(.05), a = p.clone().add(new THREE.Vector3(-1.2, 2.6, 0)), b = p.clone().add(new THREE.Vector3(-4.2, 9.5, 0));
  grp.add(cyl(tip, a, .09, M('#d9dde0', { metalness: .9, roughness: .25 })));
  grp.add(cyl(a, a.clone().lerp(b, .12), .75, M(col)));
  grp.add(cyl(a.clone().lerp(b, .12), b, .55, M(col, { roughness: .4 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .14, 10, 32), M(it.black ? '#888' : '#ffd166', { emissive: it.black ? '#000' : '#ffb000', emissiveIntensity: .8 }));
  ring.rotation.x = Math.PI / 2; ring.position.copy(p).setY(.12); grp.add(ring);
  return setInfo(grp, () => ({ title: `${it.n} ${T(it.label)}`, lines: [nice(it.at), F('expect', { v: T(it.expect) })], sub: T(it.black ? '멀티미터 COM(검은 리드)' : '멀티미터 V(빨간 리드)') }));
}

function buildItem(it) {
  switch (it.t) {
    case 'probe': return probe(it);
    case 'led': return ledPart(it);
    case 'arrow': return arrowPart(it);
    case 'res': return resistor(it);
    case 'cap': return capacitor(it);
    case 'pot': return potentiometer(it);
    case 'button': return tactSwitch(it);
    case 'module': return moduleV(it);
    case 'wire': return wire(it);
    case 'relay': return relayModule();
    case 'tft': return tftModule();
  }
}
function endpointsOf(it) {
  switch (it.t) {
    case 'res': case 'cap': return [it.a, it.b];
    case 'pot': case 'button': return it.legs;
    case 'module': return it.pins;
    case 'probe': return [it.at];
    case 'led': return [it.a, it.k];
    case 'arrow': return [it.from, it.to];
    case 'wire': return [it.from, it.to];
    default: return [];
  }
}
function partName(it) {
  if (it.t === 'res') return `${T(it.name)} ${valText(it.val)}`;
  if (it.t === 'cap') return `${it.name} 100nF`;
  if (it.t === 'led') return 'LED';
  if (it.t === 'pot') return it.name;
  if (it.t === 'button') return T('푸시버튼');
  if (it.t === 'module') return T({ ds:'DS18B20 모듈', rgb:'RGB LED 모듈', buz:'수동 부저 모듈' }[it.kind]);
  return null;
}

function setOpacity(obj, o) {
  obj.traverse(m => {
    if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => {
      if (x.userData.baseT === undefined) x.userData.baseT = x.transparent;
      x.transparent = o < 1 || x.userData.baseT; x.opacity = o; x.depthWrite = o >= 1; x.needsUpdate = true;
    });
  });
}
function highlight(obj, on) {
  if (!obj) return;
  obj.traverse(m => {
    if (!m.material) return;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => {
      if (!x.emissive) return;
      if (x.userData.e0 === undefined) { x.userData.e0 = x.emissive.getHex(); x.userData.ei0 = x.emissiveIntensity; }
      if (on) { x.emissive.set('#5fd3db'); x.emissiveIntensity = .55; } else { x.emissive.setHex(x.userData.e0); x.emissiveIntensity = x.userData.ei0; }
    });
  });
}

/* ================= 코드 보기 (펌웨어 ESP32_BMS_TFT v3 일부) ================= */
const CODE = {
  cfg: { tab: '설정값', file: 'config.h', src: {
ko: `// 측정 회로 (키트에 있는 저항에 맞춤)
#define VDIV_R_TOP      10000.0f  // R1 10kΩ (5V 레일 쪽)
#define VDIV_R_BOTTOM   10000.0f  // R2 10kΩ (GND 쪽)
#define SHUNT_OHM         110.0f  // 220Ω 2개 병렬

// 필터 / 주기
#define SAMPLE_PERIOD_MS   100    // 측정 10 Hz
#define REPORT_PERIOD_MS  1000    // 판정·화면 1 Hz
#define ADC_OVERSAMPLE      16    // 한 번에 16번 읽어 평균
#define MA_WINDOW           10    // 이동평균 10샘플
#define EMA_ALPHA         0.20f   // 지수이동평균 계수

// 4단계 판정 {주의, 경고, 위험}
#define OV_CAUTION   5.25f   // 과전압 [V]
#define OV_WARNING   5.40f
#define OV_DANGER    5.60f
#define UV_CAUTION   4.40f   // 저전압 [V]
#define UV_WARNING   4.20f
#define UV_DANGER    4.00f
#define OC_CAUTION   15.0f   // 과전류 [mA]
#define OC_WARNING   18.0f
#define OC_DANGER    23.5f
#define OT_CAUTION   32.0f   // 과열 [°C]
#define OT_WARNING   38.0f
#define OT_DANGER    45.0f
#define PREDICT_WARN_MIN 5.0f  // 45°C까지 5분 미만이면 경고`,
en: `// Measurement circuit (matched to the kit's resistors)
#define VDIV_R_TOP      10000.0f  // R1 10kΩ (5V rail side)
#define VDIV_R_BOTTOM   10000.0f  // R2 10kΩ (GND side)
#define SHUNT_OHM         110.0f  // two 220Ω in parallel

// Filters / timing
#define SAMPLE_PERIOD_MS   100    // measure at 10 Hz
#define REPORT_PERIOD_MS  1000    // judge + display at 1 Hz
#define ADC_OVERSAMPLE      16    // average 16 reads per sample
#define MA_WINDOW           10    // moving average, 10 samples
#define EMA_ALPHA         0.20f   // exponential moving average factor

// 4-level thresholds {caution, warning, danger}
#define OV_CAUTION   5.25f   // over-voltage [V]
#define OV_WARNING   5.40f
#define OV_DANGER    5.60f
#define UV_CAUTION   4.40f   // under-voltage [V]
#define UV_WARNING   4.20f
#define UV_DANGER    4.00f
#define OC_CAUTION   15.0f   // over-current [mA]
#define OC_WARNING   18.0f
#define OC_DANGER    23.5f
#define OT_CAUTION   32.0f   // over-temperature [°C]
#define OT_WARNING   38.0f
#define OT_DANGER    45.0f
#define PREDICT_WARN_MIN 5.0f  // warn if 45°C is less than 5 min away` } },
  meas: { tab: '측정·필터', file: 'ESP32_BMS_TFT.ino · sampleSensors()', src: {
ko: `void sampleSensors() {
  // (1) 전압: 분배된 전압 × 분배비
  float vRaw = readMilliVolts(PIN_VBAT) / 1000.0f
             * (VDIV_R_TOP + VDIV_R_BOTTOM) / VDIV_R_BOTTOM;

  // (2) 전류: 션트 전압 / 션트 저항 (I = V / R)
  // ADC는 0V에서도 약 0.1V를 읽음 → 릴레이가 꺼져 있을 때 0점 학습
  static float iZeroMv = NAN;
  float shuntMv = readMilliVolts(PIN_ISHUNT);
  if (!loadOn && shuntMv < 200.0f)        // 배선 실수는 숨기지 않음
    iZeroMv = isnan(iZeroMv) ? shuntMv : iZeroMv * 0.9f + shuntMv * 0.1f;
  float iRaw = (shuntMv - iZeroMv) / SHUNT_OHM;   // mV / Ω = mA
  if (iRaw < 1.0f) iRaw = 0;              // 데드밴드

  // (3) 이동평균 10샘플 (= 1초)
  maV[maIdx] = vRaw;  maI[maIdx] = iRaw;
  maIdx = (maIdx + 1) % MA_WINDOW;
  float sv = 0, si = 0;
  for (int k = 0; k < maCount; k++) { sv += maV[k]; si += maI[k]; }
  vFilt = sv / maCount;
  iFilt = si / maCount;
}`,
en: `void sampleSensors() {
  // (1) Voltage: divided voltage × divider ratio
  float vRaw = readMilliVolts(PIN_VBAT) / 1000.0f
             * (VDIV_R_TOP + VDIV_R_BOTTOM) / VDIV_R_BOTTOM;

  // (2) Current: shunt voltage / shunt resistance (I = V / R)
  // The ADC reads ~0.1V even at 0V -> learn the zero while the relay is off
  static float iZeroMv = NAN;
  float shuntMv = readMilliVolts(PIN_ISHUNT);
  if (!loadOn && shuntMv < 200.0f)        // never hide a wiring fault
    iZeroMv = isnan(iZeroMv) ? shuntMv : iZeroMv * 0.9f + shuntMv * 0.1f;
  float iRaw = (shuntMv - iZeroMv) / SHUNT_OHM;   // mV / Ω = mA
  if (iRaw < 1.0f) iRaw = 0;              // dead band

  // (3) Moving average over 10 samples (= 1 s)
  maV[maIdx] = vRaw;  maI[maIdx] = iRaw;
  maIdx = (maIdx + 1) % MA_WINDOW;
  float sv = 0, si = 0;
  for (int k = 0; k < maCount; k++) { sv += maV[k]; si += maI[k]; }
  vFilt = sv / maCount;
  iFilt = si / maCount;
}` } },
  judge: { tab: '판정·예측', file: 'ESP32_BMS_TFT.ino · diagnose()', src: {
ko: `// (1) EMA로 한 번 더 평활화 → 30초 기울기
tEma = EMA_ALPHA * tempC + (1 - EMA_ALPHA) * tEma;
dTdt = (histT[now] - histT[oldest]) / span * 60.0f;   // °C/분

// (2) 항목별 4단계 판정, 가장 나쁜 단계가 전체 상태
check(judge(vFilt, OV_CAUTION, OV_WARNING, OV_DANGER), "OverVolt");
check(judgeLow(vFilt, UV_CAUTION, UV_WARNING, UV_DANGER), "UnderVolt");
check(judge(iFilt, OC_CAUTION, OC_WARNING, OC_DANGER), "OverCurrent");
check(judge(tempC, OT_CAUTION, OT_WARNING, OT_DANGER), "OverTemp");
check(judge(dTdt, DTDT_CAUTION, DTDT_WARNING, DTDT_DANGER), "TempRise");

// (3) 열폭주 예측: 지금 기울기로 45°C까지 몇 분 남았나?
if (dTdt > 0.2f && tempC < OT_DANGER) {
  minsToDanger = (OT_DANGER - tempC) / dTdt;
  if (minsToDanger < PREDICT_WARN_MIN) check(WARNING, "RunawayPredict");
}

// (4) 위험도 지수 0~100
riskIdx = 100 * (0.25 * nV + 0.35 * nT + 0.15 * nDV + 0.25 * nDT);
check(judge(riskIdx, 30, 50, 70), "RiskIndex");`,
en: `// (1) Smooth once more with EMA -> 30-second slope
tEma = EMA_ALPHA * tempC + (1 - EMA_ALPHA) * tEma;
dTdt = (histT[now] - histT[oldest]) / span * 60.0f;   // °C/min

// (2) 4-level check per item; the worst level is the overall state
check(judge(vFilt, OV_CAUTION, OV_WARNING, OV_DANGER), "OverVolt");
check(judgeLow(vFilt, UV_CAUTION, UV_WARNING, UV_DANGER), "UnderVolt");
check(judge(iFilt, OC_CAUTION, OC_WARNING, OC_DANGER), "OverCurrent");
check(judge(tempC, OT_CAUTION, OT_WARNING, OT_DANGER), "OverTemp");
check(judge(dTdt, DTDT_CAUTION, DTDT_WARNING, DTDT_DANGER), "TempRise");

// (3) Thermal-runaway forecast: minutes left to 45°C at the current slope
if (dTdt > 0.2f && tempC < OT_DANGER) {
  minsToDanger = (OT_DANGER - tempC) / dTdt;
  if (minsToDanger < PREDICT_WARN_MIN) check(WARNING, "RunawayPredict");
}

// (4) Risk index 0-100
riskIdx = 100 * (0.25 * nV + 0.35 * nT + 0.15 * nDV + 0.25 * nDT);
check(judge(riskIdx, 30, 50, 70), "RiskIndex");` } },
  prot: { tab: '보호', file: 'ESP32_BMS_TFT.ino · protect / button', src: {
ko: `// 위험 → 부하 차단 + 래치 (수동 리셋 전까지 유지)
if (level == DANGER && !latched) {
  latched = true;
  loadOn = false;
  digitalWrite(PIN_RELAY, !RELAY_ON_LEVEL);
}

void tryReset() {
  if (level == DANGER) return;   // 아직 위험하면 리셋 거부
  latched = false;
}

// 버튼: 짧게 = 부하 ON/OFF (TRIP 중이면 리셋), 길게 = 플로터 모드
if (held >= 1500)   doCommand("plot");
else if (latched)   doCommand("reset");
else                doCommand(loadOn ? "off" : "on");`,
en: `// Danger -> cut the load + latch (held until a manual reset)
if (level == DANGER && !latched) {
  latched = true;
  loadOn = false;
  digitalWrite(PIN_RELAY, !RELAY_ON_LEVEL);
}

void tryReset() {
  if (level == DANGER) return;   // refuse while still dangerous
  latched = false;
}

// Button: short = load ON/OFF (reset while TRIP), long = plotter mode
if (held >= 1500)   doCommand("plot");
else if (latched)   doCommand("reset");
else                doCommand(loadOn ? "off" : "on");` } },
};

/* ================= 초기화 ================= */
let MODE = 'lab';               // lab | build | parts | code | guide
let focusTarget = null;          // 부품 모드에서 고른 부품
const FX = { press: 0, relayBump: 0, ring: null, glow: null, glowLight: null };

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  view.appendChild(renderer.domElement);
  labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3efe3');
  camera = new THREE.PerspectiveCamera(36, 1, 2, 1500);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .49;
  scene.add(new THREE.HemisphereLight('#ffffff', '#5b6b70', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 1.7); sun.position.set(-30, 90, 60); scene.add(sun);
  const fill = new THREE.DirectionalLight('#ffffff', .55); fill.position.set(50, 40, -50); scene.add(fill);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), M('#ece6d6', { roughness: .95 }));
  table.rotation.x = -Math.PI / 2; table.position.y = TABLE_Y - .01; scene.add(table);
  const grid = new THREE.GridHelper(400, 80, '#d9d2bf', '#e2dccb'); grid.position.y = TABLE_Y; scene.add(grid);
  scene.fog = new THREE.Fog('#f3efe3', 260, 560);
  boards = [buildBoard('L'), buildBoard('R')]; boards.forEach(b => scene.add(b));
  const foam = rbox(5.8, 3.0, 64, M('#efe7c8', { roughness: 1 }), -6, -2.0, 0, .3); scene.add(foam);
  const esp = espBoard(); scene.add(esp); esp.userData.always = true; stepGroups[0].push(esp);

  STEPS.forEach((st, si) => {
    laneCounter = 0;
    st.items.forEach(it => {
      const obj = buildItem(it);
      if (it.ghost) obj.userData.ghost = true;
      if (it.t === 'relay' || it.t === 'tft') obj.userData.always = true;
      if (st.probe) obj.userData.stepOnly = true;
      scene.add(obj); stepGroups[si].push(obj);
      if (it.ghost) return;
      if (it.t === 'probe') {
        const v = V3(parse(it.at)).add(new THREE.Vector3(-4.6, 10.6, 0));
        const tg = tag(() => `${it.n} ${T(it.label)} · ${T(it.expect)}`, v, it.black ? 'pin' : 'probe');
        scene.add(tg); stepTags[si].push(tg); return;
      }
      endpointsOf(it).forEach(sp => {
        const p = parse(sp); const v = V3(p);
        v.y = (p.kind === 'hole' || p.kind === 'rail') ? (it.t === 'wire' ? 1.5 : .5) : v.y + 1.8;
        const tg = tag(() => shortTag(sp), v, p.kind === 'hole' || p.kind === 'rail' ? '' : 'pin'); scene.add(tg); stepTags[si].push(tg);
      });
    });
  });

  // 가상 실습 효과: RGB LED 빛, 부저 소리 고리
  FX.glow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: '#1e9e55', transparent: true, opacity: .35, depthWrite: false }));
  FX.glowLight = new THREE.PointLight('#1e9e55', 40, 18, 2);
  if (LAB.rgbGlowAt) { scene.updateMatrixWorld(true); const p = LAB.rgbGlowAt(); FX.glow.position.copy(p); FX.glowLight.position.copy(p); }
  scene.add(FX.glow, FX.glowLight);
  FX.ring = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0, depthWrite: false }));
  FX.ring.rotation.y = Math.PI / 2;
  if (LAB.buzAt) FX.ring.position.copy(LAB.buzAt());
  scene.add(FX.ring);

  window.addEventListener('resize', resize); resize();
  setupPicking();
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    animateFx(now / 1000, dt);
    controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera); declutter();
  });
}

function animateFx(t, dt) {
  // 버튼 눌림
  if (LAB.buttonCap) { FX.press = Math.max(0, FX.press - dt * 4); LAB.buttonCap.position.y = 2.55 - .45 * Math.sin(Math.min(1, FX.press) * Math.PI); }
  // 릴레이 딸깍
  if (LAB.relayBody) { FX.relayBump = Math.max(0, FX.relayBump - dt * 5); LAB.relayBody.scale.setScalar(1 + .025 * FX.relayBump); }
  // RGB LED: 단계 색, TRIP이면 파랑 깜빡, 경고는 주황 깜빡
  const blink = Math.sin(t * Math.PI * 2) > 0;
  let col = LV_HEX[S.level], on = true;
  if (S.latched && S.level < 3) { col = '#2563c9'; on = blink; }
  else if (S.level === 2) on = blink;
  FX.glow.material.color.set(col); FX.glowLight.color.set(col);
  FX.glow.material.opacity = on ? .38 : .04; FX.glowLight.intensity = on ? 40 : 0;
  if (LAB.rgbDie) { LAB.rgbDie.material.emissive.set(on ? col : '#222'); LAB.rgbDie.material.emissiveIntensity = on ? 1.4 : .1; }
  FX.glow.visible = FX.glowLight.visible = LAB.parts.rgb ? LAB.parts.rgb.visible : false;
  // 부저: 경고는 띄엄띄엄, 위험은 계속
  const sounding = S.level === 3 || (S.level === 2 && (t % 1) < .5);
  const k = (t * 1.6) % 1;
  FX.ring.visible = LAB.parts.buz ? LAB.parts.buz.visible && sounding : false;
  FX.ring.scale.setScalar(1 + k * 3.5); FX.ring.material.opacity = (1 - k) * .8;
  // 부하 전류가 흐르면 노란 부하 선이 반짝임
  const flow = S.I > .5 ? .35 + .3 * Math.sin(t * 8) : 0;
  (LAB.loadWires || []).forEach(g => g.traverse(m => { if (m.material && m.material.emissive) { m.material.emissive.set('#ffcc00'); m.material.emissiveIntensity = flow; } }));
  if (LAB.relayLed) LAB.relayLed.material.emissiveIntensity = S.loadOn ? 1.6 : 0, LAB.relayLed.material.color.set(S.loadOn ? '#ff3b3b' : '#552222');
  // 온도센서: 데워지면 붉게
  if (LAB.dsPivot) {
    const heat = Math.max(0, Math.min(1, (S.T - 26) / 20));
    LAB.dsPivot.traverse(m => { if (m.material && m.material.emissive && !m.material.map) { m.material.emissive.set('#ff5a1f'); m.material.emissiveIntensity = heat * .9; } });
  }
}

/* 겹치는 구멍 좌표 태그를 위로 비켜 세우고, 원래 위치까지 가는 선을 그림 */
function declutter() {
  const list = [];
  [...stepTags, LAB.trayTags || []].forEach(tags => tags.forEach(t => {
    const e = t.element;
    if (!t.visible || e.style.display === 'none') return;
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(e.style.transform);
    if (!m) return;
    if (!e._w) { e._w = e.offsetWidth + 6; e._h = e.offsetHeight + 3; }
    list.push({ e, x: +m[1], y: +m[2], w: e._w, h: e._h });
  }));
  list.sort((a, b) => b.y - a.y || a.x - b.x);
  const placed = [];
  list.forEach(r => {
    let y = r.y, moved = true, guard = 0;
    while (moved && guard++ < 60) {
      moved = false;
      for (const p of placed) if (Math.abs(r.x - p.x) < (r.w + p.w) / 2 && Math.abs(y - p.y) < (r.h + p.h) / 2) { y = p.y - (r.h + p.h) / 2; moved = true; }
    }
    placed.push({ x: r.x, y, w: r.w, h: r.h });
    const dy = y - r.y;
    if (dy < -.5) { r.e.style.transform += ` translate(0px,${dy}px)`; r.e.style.setProperty('--lead', `${-dy}px`); r.e.classList.add('moved'); }
    else r.e.classList.remove('moved');
  });
}
/* 수정됨: 작업대 위에 겹친 카드(제목·측정값·그래프·흐름도)가 가리는 만큼을 재서
   3D가 그 바깥(보이는 영역) 가운데에 오도록 카메라 화면 중심을 옮김 */
let INS = { t: 0, b: 0, l: 0, r: 0 };
function measureInsets() {
  const st = view.getBoundingClientRect(), ins = { t: 0, b: 0, l: 0, r: 0 };
  if (!st.width || !st.height) { INS = ins; return; }
  const shown = el => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  document.querySelectorAll('.stage .chip, .stage .tele, .stage .float').forEach(el => {
    if (!shown(el)) return;
    const r = el.getBoundingClientRect();
    if (r.top - st.top < st.height * .45) ins.t = Math.max(ins.t, r.bottom - st.top + 6);
    else ins.b = Math.max(ins.b, st.bottom - r.top + 6);
  });
  const tools = document.querySelector('.stage .tools');
  if (shown(tools)) ins.r = Math.max(0, st.right - tools.getBoundingClientRect().left + 4);
  const vy = ins.t + ins.b, vx = ins.l + ins.r;   // 가리는 부분이 너무 크면 비율을 줄여 3D 영역을 최소 40% 남김
  if (vy > st.height * .6) { const k = st.height * .6 / vy; ins.t *= k; ins.b *= k; }
  if (vx > st.width * .4) { const k = st.width * .4 / vx; ins.l *= k; ins.r *= k; }
  INS = ins;
}
function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  measureInsets();
  camera.setViewOffset(w, h, -(INS.l - INS.r) / 2, -(INS.t - INS.b) / 2, w, h);   // 화면 중심을 보이는 영역 가운데로
  camera.updateProjectionMatrix();
}

/* ---------- 마우스: 이름 보기 + 클릭으로 조작 ---------- */
const tipEl = document.getElementById('tip');
let hovered = null;
const ACTION_HINT = { button: '클릭: 버튼 누르기 (부하 ON/OFF · TRIP 리셋)', rl2: '클릭: RL2 꽂기 / 빼기', rl3: '클릭: RL3 꽂기 / 빼기', ds: '클릭: 손으로 쥐기 / 놓기' };
function holeAt(board, x, z) {
  const cols = COLX[board]; let best = null, bd = 9;
  for (const k in cols) { const d = Math.abs(cols[k] - x); if (d < bd) { bd = d; best = k; } }
  const row = Math.round(32 - z);
  if (bd > .5 || row < 1 || row > 63 || Math.abs(rowZ(row) - z) > .5) return null;
  return { col: best, row };
}
function showTip(html, ev) {
  tipEl.innerHTML = html; tipEl.style.display = 'block';
  const r = view.getBoundingClientRect(); let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 16;
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  if (x + tw > r.width - 8) x = ev.clientX - r.left - tw - 12; if (y + th > r.height - 8) y = ev.clientY - r.top - th - 12;
  tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
}
function hideTip() { tipEl.style.display = 'none'; if (hovered) { highlight(hovered, false); hovered = null; } view.style.cursor = ''; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function setupPicking() {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = ev => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables.filter(o => { let v = true, p = o; while (p) { if (!p.visible) { v = false; break; } p = p.parent; } return v; }), false);
    return hits[0] || null;
  };
  const pick = ev => {
    const h = hit(ev);
    if (!h) { hideTip(); return; }
    const owner = h.object.userData.owner;
    if (owner && owner.userData.info) {
      if (hovered !== owner) { highlight(hovered, false); hovered = owner; highlight(owner, true); }
      const i = owner.userData.info();
      const act = MODE === 'lab' && owner.userData.action ? `<div class="act">${esc(T(ACTION_HINT[owner.userData.action]))}</div>` : '';
      view.style.cursor = act ? 'pointer' : '';
      showTip(`<b>${esc(i.title)}</b>${i.lines.map(l => `<div>${esc(l)}</div>`).join('')}${i.sub ? `<div class="sub">${esc(i.sub)}</div>` : ''}${act}`, ev);
      return;
    }
    if (hovered) { highlight(hovered, false); hovered = null; }
    view.style.cursor = '';
    if (h.object.userData.board) {
      const b = h.object.userData.board, hole = holeAt(b, h.point.x, h.point.z);
      if (!hole) { hideTip(); return; }
      const bn = F(b === 'L' ? 'boardL' : 'boardR');
      if (hole.col === '+' || hole.col === '-') { showTip(`<b>${esc(F('railTitle', { b: bn, s: hole.col === '+' ? '+' : '−' }))}</b><div>${RAIL_NET[b + hole.col]} · ${esc(F('rowN', { r: hole.row }))}</div><div class="sub">${esc(T('레일은 세로로 전부 연결됩니다'))}</div>`, ev); return; }
      const e = espOf(b, hole.col, hole.row);
      const grpTxt = 'ABCDE'.includes(hole.col) ? 'A~E' : 'F~J';
      showTip(`<b>${esc(F('hole', { b: bn, cr: '' }))}<span class="mono">${hole.col}${hole.row}</span></b><div>${esc(F('rowLinked', { r: hole.row, g: grpTxt }))}</div>${e ? `<div class="mono">${esc(F('espRow', { pin: e }))}</div>` : ''}`, ev);
      return;
    }
    hideTip();
  };
  let down = null;
  renderer.domElement.addEventListener('pointermove', pick);
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; if (e.pointerType !== 'mouse') pick(e); });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || e.button !== 0) { down = null; return; }
    down = null;
    const h = hit(e); const owner = h && h.object.userData.owner;
    if (owner && owner.userData.action && MODE === 'lab') { doAction(owner.userData.action); pick(e); }
  });
  renderer.domElement.addEventListener('pointerleave', hideTip);
}

/* ---------- 카메라 ---------- */
function stepBox() {
  const b = new THREE.Box3();
  STEPS[current].items.forEach(it => endpointsOf(it).forEach(sp => b.expandByPoint(V3(parse(sp)))));
  if (!b.isEmpty()) {
    b.expandByVector(new THREE.Vector3(3, 0, 3)); b.max.y = 5;
    const sz = b.getSize(new THREE.Vector3());
    if (sz.x < 34) b.expandByVector(new THREE.Vector3((34 - sz.x) / 2, 0, 0));
    if (sz.z < 46) b.expandByVector(new THREE.Vector3(0, 0, (46 - sz.z) / 2));
    if (STEPS[current].probe) b.expandByVector(new THREE.Vector3(2, 0, 9));
  }
  return b;
}
function allBox() {
  const b = new THREE.Box3();
  boards.forEach(o => b.expandByObject(o));
  stepGroups.forEach(objs => objs.forEach(o => { if (o.visible) b.expandByObject(o); }));
  return b;
}
function objBox(objs) {
  const b = new THREE.Box3(); objs.forEach(o => o && b.expandByObject(o));
  const sz = b.getSize(new THREE.Vector3());
  if (sz.x < 26) b.expandByVector(new THREE.Vector3((26 - sz.x) / 2, 0, 0));
  if (sz.z < 36) b.expandByVector(new THREE.Vector3(0, 0, (36 - sz.z) / 2));
  return b;
}
function flyTo(b, top, instant) {
  const target = b.getCenter(new THREE.Vector3()); target.y = 0;
  const size = b.getSize(new THREE.Vector3());
  const dir = top ? new THREE.Vector3(-.001, 1, 0) : new THREE.Vector3(-.62, .78, 0).normalize();
  const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const halfW = size.z / 2 * 1.08, halfH = (top ? size.x : size.x * .8 + size.y * .6) / 2 * 1.1;
  // 수정됨: 겹친 카드를 뺀 '보이는 영역'에 맞춰 거리를 잡음
  const vw = view.clientWidth || 1, vh = view.clientHeight || 1;
  const fx = Math.max(.4, (vw - INS.l - INS.r) / vw), fy = Math.max(.4, (vh - INS.t - INS.b) / vh);
  const dist = Math.max(halfW / (Math.tan(hfov / 2) * fx), halfH / (Math.tan(vfov / 2) * fy), 18) + (top ? size.y : size.x * .3);
  const eye = target.clone().addScaledVector(dir, dist);
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { camera.position.copy(eye); controls.target.copy(target); controls.update(); return; }
  const p0 = camera.position.clone(), t0 = controls.target.clone(); let k = 0;
  const tick = () => { k = Math.min(1, k + .06); const e = 1 - Math.pow(1 - k, 3); camera.position.lerpVectors(p0, eye, e); controls.target.lerpVectors(t0, target, e); if (k < 1) requestAnimationFrame(tick); };
  tick();
}
function setView(mode, instant = false) {
  viewMode = mode;
  if (mode === 'top') flyTo(allBox(), true, instant);
  else if (mode === 'focus' && MODE === 'build' && (!STEPS[current].all || STEPS[current].probe) && STEPS[current].items.length) flyTo(stepBox(), false, instant);
  else if (mode === 'part' && focusTarget) flyTo(objBox(focusTarget), false, instant);
  else flyTo(allBox(), false, instant);
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === viewMode)));
  if (typeof onViewChange === 'function') onViewChange();
}

/* ---------- 장면 적용 ---------- */
function applyScene() {
  const build = MODE === 'build';
  const all = !build || showAll || STEPS[current].all;
  stepGroups.forEach((objs, si) => objs.forEach(o => {
    const vis = o.userData.stepOnly ? (build && si === current) : (all || si <= current);
    o.visible = vis;
    if (!vis) return;
    let op = all || si === current || o.userData.always ? 1 : .3;
    if (o.userData.ghost) op = !build && ((o === LAB.loads.RL2 && S.rl2) || (o === LAB.loads.RL3 && S.rl3)) ? 1 : .22;
    setOpacity(o, op);
  }));
  stepTags.forEach((tags, si) => tags.forEach(t => { t.visible = !!(build && showTags && (!all || STEPS[current].probe) && si === current); }));
  (LAB.trayTags || []).forEach(t => { t.visible = build && current === 0; });
}
function retext() { allTags.forEach(o => { const e = o.element; e.textContent = e._text(); e._w = 0; }); }

/* ================= 가상 BMS (펌웨어와 같은 판정 규칙) ================= */
const LV_TEXT = ['NORMAL', 'CAUTION', 'WARNING', 'DANGER'];
const LV_HEX = ['#1e9e55', '#e6b800', '#f07f12', '#d62f2f'];
const TH = { OV: [5.25, 5.40, 5.60], UV: [4.40, 4.20, 4.00], OC: [15, 18, 23.5], OT: [32, 38, 45], DT: [1, 3, 6], RK: [30, 50, 70] };
const S = { loadOn: true, rl2: false, rl3: false, hand: false, hot: false, uv: false, ov: false, latched: false, level: 0,
            T: 24.8, V: 4.62, I: 0, vEma: NaN, tEma: NaN, histV: [], histT: [], hI: [], hT: [], seq: 0, ms: 0, risk: 0, dTdt: 0, dVdt: 0, mins: -1, reason: 'OK', mah: 0, speed: 1, running: true };
const noise = a => (Math.random() * 2 - 1) * a;
const judge = (x, t) => x >= t[2] ? 3 : x >= t[1] ? 2 : x >= t[0] ? 1 : 0;
const judgeLow = (x, t) => x <= t[2] ? 3 : x <= t[1] ? 2 : x <= t[0] ? 1 : 0;
const c01 = x => Math.max(0, Math.min(1, x));
const loadOhm = () => 1 / (1 / 330 + (S.rl2 ? 1 / 220 : 0) + (S.rl3 ? 1 / 220 : 0));
const serialLines = [];
const fx = (v, d) => (isFinite(v) ? v.toFixed(d) : '--');   // 온도 센서가 없을 때(nan) 대비
/* 데이터 출처: 시뮬레이터 / 실제 보드(Web Serial) */
const SRC = { real: false, port: null, reader: null, buf: '', lost: false };
/* CSV 기록: 1초마다 한 줄 (최대 10시간) */
const LOG = []; let pendingEvent = '';
function logRow(src) {
  const now = new Date(), pad = x => String(x).padStart(2, '0');
  LOG.push([`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    (S.ms / 1000).toFixed(0), S.seq, S.V.toFixed(3), S.I.toFixed(1), isFinite(S.T) ? S.T.toFixed(2) : '', '0.0', S.dVdt.toFixed(4), S.dTdt.toFixed(2),
    S.risk.toFixed(1), S.level, LV_TEXT[S.level], S.loadOn ? 1 : 0, S.latched ? 1 : 0, src, pendingEvent]);
  pendingEvent = '';
  if (LOG.length > 36000) LOG.shift();
}
function downloadCsv() {
  if (!LOG.length) { flash(T('아직 기록이 없어요')); return; }
  const head = 'time,elapsed_s,seq,vbus_V,current_mA,temp_C,soc,dVdt_V_per_min,dTdt_C_per_min,risk,level,level_name,load,trip,source,event';
  const q = s => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : s);
  const csv = '﻿' + head + '\n' + LOG.map(r => r.map(q).join(',')).join('\n') + '\n';
  const a = document.createElement('a'), d = new Date(), pad = x => String(x).padStart(2, '0');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `esp32-bms-log-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  flash(F('csvSaved', { n: LOG.length }));
}
// 수정됨: 시리얼 맨 위에 열 이름 표시 (펌웨어 부팅 때 출력하는 것과 같은 형식)
function serialHeader() { serial('# DATA,seq,ms,V,mA,degC,SOC,dVdt(V/min),dTdt(C/min),risk,level,load'); }
function serial(s) { if (s) { const t = Math.floor(S.ms / 1000), hh = String(Math.floor(t / 3600)).padStart(2, '0'), mm = String(Math.floor(t / 60) % 60).padStart(2, '0'), ss = String(t % 60).padStart(2, '0'); s = `[${hh}:${mm}:${ss}] ${s}`; } serialLines.push(s); if (serialLines.length > 120) serialLines.shift(); const el = document.getElementById('serial'); if (el) { el.textContent = serialLines.join('\n'); el.scrollTop = el.scrollHeight; } }

function simTick() {
  S.ms += 1000; S.seq++;
  const supply = 4.62 + noise(.006) - (S.loadOn ? .012 : 0);
  S.V = S.ov ? 6.16 + noise(.01) : S.uv ? supply * (2 / 3) + noise(.004) : supply;
  const Ireal = S.loadOn ? supply / (loadOhm() + 110) * 1000 : 0;
  S.I = Ireal > 0 ? Math.max(0, Ireal + noise(.15)) : 0;
  const target = S.hot ? 50 : S.hand ? 33.5 : 24.8;
  S.T += (target - S.T) * (S.hot ? .055 : .03) + noise(.02);
  S.vEma = isNaN(S.vEma) ? S.V : .2 * S.V + .8 * S.vEma;
  S.tEma = isNaN(S.tEma) ? S.T : .2 * S.T + .8 * S.tEma;
  S.histV.push(S.vEma); S.histT.push(S.tEma);
  if (S.histV.length > 31) { S.histV.shift(); S.histT.shift(); }
  const span = S.histV.length - 1;
  S.dVdt = span >= 5 ? (S.histV[span] - S.histV[0]) / span * 60 : 0;
  S.dTdt = span >= 5 ? (S.histT[span] - S.histT[0]) / span * 60 : 0;
  let lv = 0; const why = [];
  const chk = (l, n) => { if (l > 0) why.push(n); lv = Math.max(lv, l); };
  chk(judge(S.V, TH.OV), 'OverVolt'); chk(judgeLow(S.V, TH.UV), 'UnderVolt');
  chk(judge(S.I, TH.OC), 'OverCurrent'); chk(judge(S.T, TH.OT), 'OverTemp'); chk(judge(S.dTdt, TH.DT), 'TempRise');
  S.mins = -1;
  if (S.dTdt > .2 && S.T < 45) { S.mins = (45 - S.T) / S.dTdt; if (S.mins < 5) chk(2, 'RunawayPredict'); }
  const nV = Math.max((S.V - 4.75) / (5.60 - 4.75), (4.75 - S.V) / (4.75 - 4.00));
  S.risk = 100 * (.25 * c01(nV) + .35 * c01((S.T - 25) / 20) + .15 * c01(Math.abs(S.dVdt) / .2) + .25 * c01(S.dTdt / 6));
  chk(judge(S.risk, TH.RK), 'RiskIndex');
  const prev = S.level;
  S.level = lv; S.reason = why.length ? why.join(', ') : 'OK';
  S.mah += S.I / 3600;
  if (lv !== prev) { const ev = `${LV_TEXT[prev]}-> ${LV_TEXT[lv]} (${S.reason})`; serial(`EVENT,${S.ms},${LV_TEXT[lv]},${ev}`); pendingEvent = ev; }
  if (lv === 3 && !S.latched) { S.latched = true; setLoad(false, true); serial(`EVENT,${S.ms},DANGER,Trip - relay off`); pendingEvent += (pendingEvent ? ' / ' : '') + 'Trip - relay off'; }
  S.hI.push(S.I); S.hT.push(S.T); if (S.hI.length > 120) { S.hI.shift(); S.hT.shift(); }
  serial(`DATA,${S.seq},${S.ms},${S.V.toFixed(3)},${S.I.toFixed(1)},${S.T.toFixed(2)},0.0,${S.dVdt.toFixed(4)},${S.dTdt.toFixed(2)},${S.risk.toFixed(1)},${S.level},${S.loadOn ? 1 : 0}`);
  logRow('sim');
  drawTft3D(); updateLive(); if (typeof drawTrend === 'function') drawTrend();
}
function setLoad(on, quiet) {
  if (on && S.latched) { serial('# ' + T('위험 래치 상태 - 리셋 후 부하 ON 가능')); return; }
  if (S.loadOn !== on) FX.relayBump = 1;
  S.loadOn = on; if (!quiet) serial(`# load ${on ? 'on' : 'off'}`);
  updateLive();
}
function tryReset() {
  if (SRC.real) { sendCmd('reset'); return; }
  if (S.level === 3) { serial('# ' + T('아직 위험 조건이 남아 있어 리셋 불가')); flash(T('아직 위험 조건이 남아 있어 리셋할 수 없어요')); return; }
  if (!S.latched) return;
  S.latched = false; serial(`EVENT,${S.ms},${LV_TEXT[S.level]},Manual reset`); updateLive(); drawTft3D();
}
function pressButton() {
  FX.press = 1;
  if (SRC.real) { sendCmd(S.latched ? 'reset' : S.loadOn ? 'off' : 'on'); return; }   // 실제 보드: 펌웨어 시리얼 명령
  if (S.latched) tryReset(); else setLoad(!S.loadOn);
}
function simOnly() { if (!SRC.real) return false; flash(T('실제 보드에 연결된 동안에는 실제 부품을 바꿔서 실험하세요')); return true; }
function doAction(a) {
  if (a === 'button') pressButton();
  else if (simOnly()) return;
  else if (a === 'rl2' || a === 'rl3') { S[a] = !S[a]; applyScene(); serial(`# ${a.toUpperCase()} ${S[a] ? 'in' : 'out'}`); updateLive(); }
  else if (a === 'ds') { S.hand = !S.hand; if (S.hand) S.hot = false; updateLive(); }
}
let simTimer = null;
function startSim() { clearInterval(simTimer); if (S.running && !SRC.real) simTimer = setInterval(simTick, 1000 / S.speed); }

/* ================= 실제 보드 연결 (Web Serial, Chrome·Edge 데스크톱) =================
   펌웨어가 1초마다 보내는 DATA,seq,ms,V,mA,degC,SOC,dVdt,dTdt,risk,level,load 줄을 읽어
   시뮬레이터 대신 이 화면(3D TFT·측정값·그래프·CSV)을 움직임. 부하·리셋 버튼은 on/off/reset 명령을 보냄 */
const serialOk = () => 'serial' in navigator && window.isSecureContext;
async function connectBoard() {
  if (!serialOk()) { flash(T('이 브라우저는 Web Serial을 지원하지 않아요. 데스크톱 Chrome이나 Edge에서 열어 주세요.')); return; }
  let port;
  try { port = await navigator.serial.requestPort(); }
  catch (e) { return; }   // 사용자가 창을 닫음
  try { await port.open({ baudRate: 115200 }); }
  catch (e) { flash(T('포트를 열지 못했어요. Arduino IDE 시리얼 모니터를 닫고 다시 시도하세요.')); return; }
  Object.assign(SRC, { real: true, port, buf: '', lost: false });
  clearInterval(simTimer);
  Object.assign(S, { hI: [], hT: [], latched: false, reason: 'OK', mins: -1 });
  serial('# ' + T('실제 보드에 연결했어요') + ' · 115200'); serialHeader();
  renderAll(); drawTft3D();
  readLoop(port);
}
async function readLoop(port) {
  const dec = new TextDecoder();
  while (SRC.port === port && port.readable) {
    const reader = port.readable.getReader(); SRC.reader = reader;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        SRC.buf += dec.decode(value, { stream: true });
        const parts = SRC.buf.split('\n'); SRC.buf = parts.pop();
        if (SRC.buf.length > 2000) SRC.buf = '';
        parts.forEach(l => { l = l.replace(/\r/g, '').trim(); if (l) onBoardLine(l); });
      }
    } catch (e) { SRC.lost = true; }
    finally { try { reader.releaseLock(); } catch (e) {} if (SRC.reader === reader) SRC.reader = null; }
    if (SRC.lost) break;
  }
  if (SRC.port === port) disconnectBoard(true);
}
async function disconnectBoard(lost) {
  const port = SRC.port; SRC.real = false; SRC.port = null;
  try { if (SRC.reader) await SRC.reader.cancel(); } catch (e) {}
  try { if (port) await port.close(); } catch (e) {}
  serial('# ' + T('보드 연결을 끊었어요 · 시뮬레이터로 돌아감'));
  if (lost) flash(T('보드 연결이 끊어졌어요. 시뮬레이터로 돌아갑니다.'));
  Object.assign(S, { hI: [], hT: [], latched: false, vEma: NaN, tEma: NaN, histV: [], histT: [], T: isFinite(S.T) ? S.T : 24.8 });
  serialHeader(); startSim(); renderAll(); drawTft3D();
}
async function sendCmd(c) {
  if (!SRC.port || !SRC.port.writable) return;
  serial('> ' + c);
  try { const w = SRC.port.writable.getWriter(); await w.write(new TextEncoder().encode(c + '\n')); w.releaseLock(); }
  catch (e) { flash(T('명령을 보내지 못했어요')); }
}
function onBoardLine(line) {
  if (line.startsWith('DATA,')) {
    const p = line.split(',');
    if (p.length < 12) { serial(line); return; }
    const num = x => { const v = parseFloat(x); return isFinite(v) ? v : NaN; };
    const load = p[11].trim() === '1';
    if (load !== S.loadOn) FX.relayBump = 1;
    Object.assign(S, { seq: +p[1] || 0, ms: +p[2] || 0, V: num(p[3]) || 0, I: num(p[4]) || 0, T: num(p[5]), dVdt: num(p[7]) || 0, dTdt: num(p[8]) || 0, risk: num(p[9]) || 0, level: Math.max(0, Math.min(3, +p[10] || 0)), loadOn: load });
    if (S.level === 3) S.latched = true;          // 펌웨어는 위험이면 래치를 검
    if (load) S.latched = false;                    // 래치 중에는 부하가 켜질 수 없음
    if (S.level === 0) S.reason = 'OK';
    S.mins = isFinite(S.T) && S.dTdt > .2 && S.T < 45 ? (45 - S.T) / S.dTdt : -1;
    S.hI.push(S.I); S.hT.push(S.T); if (S.hI.length > 120) { S.hI.shift(); S.hT.shift(); }
    serial(line); logRow('board');
    drawTft3D(); updateLive(); drawTrend();
    if (S.level === 3) beep(1800, 400); else if (S.level === 2) beep(1200, 120);
    return;
  }
  if (line.startsWith('EVENT,')) {
    const msg = line.split(',').slice(3).join(',');
    const m = msg.match(/\(([^)]*)\)/); if (m) S.reason = m[1];
    if (/trip/i.test(msg)) S.latched = true;
    if (/reset/i.test(msg)) S.latched = false;
    pendingEvent += (pendingEvent ? ' / ' : '') + msg;
    serial(line); updateLive(); drawTft3D();
    return;
  }
  serial(line);   // 부팅 메시지, '# ...' 명령 응답 등은 그대로 표시
}

/* ---------- TFT 화면 그리기 (펌웨어 tft_ui.h와 같은 배치) ---------- */
function drawScreen(g) {
  const bg = '#101418';
  g.fillStyle = bg; g.fillRect(0, 0, 480, 320);
  const bc = S.latched && S.level < 3 ? '#2563c9' : LV_HEX[S.level];
  g.fillStyle = bc; g.fillRect(0, 0, 480, 44);
  g.fillStyle = S.level === 1 && !S.latched ? '#1d2428' : '#fff';
  g.font = '700 26px "IBM Plex Sans KR", sans-serif'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillText(S.latched ? 'TRIP - press reset' : LV_TEXT[S.level], 12, 32);
  g.font = '700 17px "IBM Plex Sans KR", sans-serif'; g.textAlign = 'right'; g.fillText(S.loadOn ? 'LOAD ON' : 'LOAD OFF', 468, 29); g.textAlign = 'left';
  [['VBUS', S.V.toFixed(2), 'V'], ['CURRENT', S.I.toFixed(1), 'mA'], ['TEMP', fx(S.T, 1), 'C'], ['RISK', String(Math.round(S.risk)), '/100']].forEach(([l, v, u], i) => {
    const tx = 8 + i * 120; g.fillStyle = '#1c2329'; g.fillRect(tx, 52, 112, 92);
    g.fillStyle = '#8fa0a8'; g.font = '14px "IBM Plex Mono", monospace'; g.fillText(l, tx + 10, 70); g.fillText(u, tx + 10, 134);
    g.fillStyle = i === 3 && S.risk >= 30 ? LV_HEX[S.risk >= 70 ? 3 : S.risk >= 50 ? 2 : 1] : '#e9eef0'; g.font = '700 30px "IBM Plex Mono", monospace'; g.fillText(v, tx + 10, 112);
  });
  g.fillStyle = '#8fa0a8'; g.font = '13px "IBM Plex Mono", monospace';
  g.fillText(`dT/dt ${S.dTdt.toFixed(1)} C/min   45C in ${S.mins > 0 ? S.mins.toFixed(1) + ' min' : '--'}   ${S.reason}`.slice(0, 60), 10, 168);
  [[8, '#5fb3ff', 'Current (mA)', S.hI, 0, 40, 23.5], [240, '#ffb347', 'Temp (C)', S.hT, 20, 50, 45]].forEach(([cx, col, t, data, lo, hi, warn]) => {
    g.fillStyle = '#1c2329'; g.fillRect(cx, 184, 232, 128);
    g.fillStyle = '#e9eef0'; g.font = '13px "IBM Plex Mono", monospace'; g.fillText(t, cx + 8, 202);
    const X = i => cx + 8 + i / 119 * 216, Y = v => 304 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * 92;
    g.strokeStyle = '#2e3940'; g.lineWidth = 1; [0, .5, 1].forEach(f => { const y = 212 + f * 92; g.beginPath(); g.moveTo(cx + 8, y); g.lineTo(cx + 224, y); g.stroke(); });
    g.strokeStyle = '#d62f2f'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(cx + 8, Y(warn)); g.lineTo(cx + 224, Y(warn)); g.stroke(); g.setLineDash([]);
    if (data.length > 1) { const off = 120 - data.length; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); data.forEach((v, i) => { i ? g.lineTo(X(i + off), Y(v)) : g.moveTo(X(i + off), Y(v)); }); g.stroke(); }
  });
}
function drawTft3D() {
  if (!LAB.tftCanvas) return;
  const g = LAB.tftCanvas.getContext('2d');
  g.save(); g.translate(320, 0); g.rotate(Math.PI / 2); drawScreen(g); g.restore();
  LAB.tftTex.needsUpdate = true;
  const c2 = document.getElementById('screen');
  if (c2) drawScreen(c2.getContext('2d'));
}

/* ================= 흐름: 14단계 (조립 → 점검 → 코드 → 실험) ================= */
const FLOW = [
  { id: 'parts', kind: 'parts', step: 0, short: '@부품', title: '부품 준비하기', kicker: '준비' },
  { id: 'rails', kind: 'build', step: 1, short: '전원' },
  { id: 'vmon', kind: 'build', step: 2, short: '5V 감시' },
  { id: 'load', kind: 'build', step: 3, short: '부하·션트' },
  { id: 'relay', kind: 'build', step: 4, short: '릴레이' },
  { id: 'buzzer', kind: 'build', step: 5, short: '부저' },
  { id: 'temp', kind: 'build', step: 6, short: '온도센서' },
  { id: 'rgb', kind: 'build', step: 7, short: 'RGB LED' },
  { id: 'button', kind: 'build', step: 8, short: '버튼' },
  { id: 'tft-power', kind: 'build', step: 9, short: 'TFT 전원' },
  { id: 'tft-spi', kind: 'build', step: 10, short: 'TFT 신호' },
  { id: 'check', kind: 'check', step: 11, short: '점검', title: '점검하기', kicker: '점검' },
  { id: 'code', kind: 'code', step: 12, short: '코드', title: '코드 올리기', kicker: '코드' },
  { id: 'run', kind: 'run', step: 12, short: '@실험', title: 'BMS 실험해 보기', kicker: '시뮬레이션' },
];
let fi = 0;                       // 지금 보고 있는 흐름 단계
const PREF = { sound: false, tags: true };
try { Object.assign(PREF, JSON.parse(localStorage.getItem('bms-pref') || '{}')); } catch (e) {}
const savePref = () => { try { localStorage.setItem('bms-pref', JSON.stringify(PREF)); } catch (e) {} };
const $ = id => document.getElementById(id);
const panelBody = $('pbody');
const fTitle = f => T(f.title || STEPS[f.step].title);
const fKicker = f => f.kind === 'build' ? T('조립') : T(f.kicker);
function flash(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('on'), 2400); }

/* ---------- 단계 이동 ---------- */
function go(i, opts = {}) {
  fi = Math.max(0, Math.min(FLOW.length - 1, i));
  const f = FLOW[fi];
  MODE = f.kind === 'run' ? 'lab' : f.kind === 'code' ? 'code' : 'build';
  current = f.step; showAll = false; focusTarget = null;
  if (!opts.fromHash) { try { history.replaceState(null, '', '#' + f.id); } catch (e) {} }
  document.body.dataset.kind = f.kind;
  renderAll();
  applyScene();
  if (camera) { resize(); setView(MODE === 'build' ? 'focus' : 'persp', !!opts.instant); }
}
function renderAll() {
  const f = FLOW[fi];
  $('pnum').textContent = String(fi + 1).padStart(2, '0');
  $('pkick').textContent = `${f.kind === 'run' && SRC.real ? T('실제 보드') : fKicker(f)} · ${F('stepOf', { n: FLOW.length, i: fi + 1 })}`;
  $('ptitle').textContent = fTitle(f);
  $('chipTitle').textContent = f.kind === 'run' ? (SRC.real ? T('실제 BMS 모니터') : T('가상 BMS 시험대')) : T('작업대');
  $('srcBadge').textContent = SRC.real ? T('실제 보드') : T('시뮬레이터');
  $('srcBadge').parentElement.classList.toggle('live', SRC.real);
  $('chipSub').textContent = f.kind === 'run' ? (SRC.real ? T('보드에서 1초마다 받은 값으로 움직여요') : T('3D에서 버튼 · RL2 · RL3 · 온도센서를 눌러 보세요')) : T('드래그 회전 · 휠 확대 · 부품에 마우스를 올려 보세요');
  $('back').disabled = fi === 0;
  const nx = $('next');
  if (fi === FLOW.length - 1) { nx.innerHTML = `${esc(T('처음부터'))} <span aria-hidden="true">↺</span>`; }
  else nx.innerHTML = `${esc(T('다음'))}: ${esc(T(FLOW[fi + 1].short))} <span aria-hidden="true">→</span>`;
  document.querySelectorAll('[data-jump]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.jump === (f.kind === 'run' ? 'run' : 'build'))));
  renderStrip(); renderPanel();
  $('tags').setAttribute('aria-pressed', String(showTags));
  updateLive(); drawTrend();
}

/* ---------- 아래 단계 띠 ---------- */
const thumbs = {};
function renderStrip() {
  const s = $('strip');
  s.innerHTML = FLOW.map((f, i) => `<button type="button" class="scard${i === fi ? ' on' : ''}${i < fi ? ' done' : ''}" data-fi="${i}" aria-current="${i === fi ? 'step' : 'false'}" aria-label="${esc(F('stepAria', { i: i + 1, t: fTitle(f) }))}">
    <span class="thumb">${thumbs[f.id] ? `<img src="${thumbs[f.id]}" alt="">` : ''}</span>
    <span class="sbadge">${String(i + 1).padStart(2, '0')}</span><span class="sname">${esc(T(f.short))}</span></button>`).join('');
  const on = s.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/* ---------- 오른쪽 패널 ---------- */
const chips = list => list.map(s => `<span class="hole mono">${esc(shortSpec(s))}</span>`).join('<span class="arrow" aria-hidden="true">→</span>');
function shortSpec(s) { const p = parse(s); if (p.kind === 'hole') return `${p.board}-${p.col}${p.row}`; return shortTag(s); }
function partRows(st) {
  const parts = st.items.filter(it => !['wire', 'relay', 'tft', 'probe', 'arrow'].includes(it.t));
  if (!parts.length) return '';
  return `<h3>${T('꽂을 부품')}</h3><ul class="rows">${parts.map(it => `<li class="${it.ghost ? 'ghost' : ''}"><div class="rl"><b>${esc(partName(it))}</b>${it.role ? `<span>${esc(T(it.role))}</span>` : ''}${it.ghost ? `<span class="tagx">${T('실험 때')}</span>` : ''}</div><div class="rc">${chips(endpointsOf(it))}</div></li>`).join('')}</ul>`;
}
function wireRows(st) {
  const wires = st.items.filter(it => it.t === 'wire');
  if (!wires.length) return '';
  return `<h3>${T('점퍼선')}</h3><ul class="rows">${wires.map(it => `<li><div class="rl"><b><span class="sw" style="background:${COLORS[it.net]}"></span>${esc(COLOR_NAME[it.net])}</b><span>${esc(NET_NAME[it.net])} · ${wireKind(it)}</span></div><div class="rc">${chips([it.from, it.to])}</div></li>`).join('')}</ul>`;
}
function tipList(st, cls = '') { return st.tips?.length ? `<ul class="tips ${cls}">${st.tips.map((t, i) => `<li${st.warn?.includes(i) ? ' class="warn"' : ''}>${esc(T(t))}</li>`).join('')}</ul>` : ''; }

const PARTS = [
  { key: 'esp', name: 'ESP32 DevKitC V4', q: 1, d: 'WROOM-32E. 측정·판정·제어, Wi-Fi 웹 서버' },
  { key: 'boards', name: '브레드보드 830홀', q: 2, d: '두 장 사이에 ESP32를 걸쳐 꽂음' },
  { key: 'tft', tray: 'tft', name: '3.5인치 TFT LCD', q: 1, d: '480×320, ST7796S, SPI. 현장 대시보드' },
  { key: 'relay', tray: 'relay', name: '릴레이 모듈 SRD-05VDC', q: 1, d: '5V 1채널. COM·NO로 부하 연결·차단' },
  { key: 'ds', tray: 'ds', name: 'DS18B20 온도센서 모듈', q: 1, d: '1-Wire 디지털. +는 3V3' },
  { key: 'buz', tray: 'buz', name: '수동 부저 모듈', q: 1, d: 'tone()으로 단계별 경보음' },
  { key: 'rgb', tray: 'rgb', name: 'RGB LED 모듈', q: 1, d: '초록 정상 · 노랑 주의 · 주황 경고 · 빨강 위험 · 파랑 TRIP' },
  { key: 'button', tray: 'button', name: '택트 스위치', q: 1, d: '부하 ON/OFF, TRIP 리셋' },
  { key: 'R1,R2', tray: 'r10k', name: '저항 10kΩ', q: 2, d: 'R1·R2 전압 분배 (갈·검·주)', b: [1, 0, 3] },
  { key: 'RL1,저항(R),저항(G),저항(B)', tray: 'r330', name: '저항 330Ω', q: 4, d: 'RL1 부하 1개 + RGB 전류 제한 3개 (주·주·갈)', b: [3, 3, 1] },
  { key: 'RS1,RS2,RL2,RL3', tray: 'r220', name: '저항 220Ω', q: 4, d: 'RS1·RS2 션트(병렬) + RL2·RL3 과전류 실험용 (빨·빨·갈)', b: [2, 2, 1] },
  { key: 'C1,C2', tray: 'cap', name: '세라믹 콘덴서 100nF (104)', q: 2, d: 'C1·C2 ADC 입력 잡음 필터' },
];
function partObjs(key, tray) { if (FLOW[fi].kind === 'parts' && tray && LAB.tray && LAB.tray[tray]) return [LAB.tray[tray]]; if (key === 'boards') return boards; return key.split(',').map(k => LAB.parts[k] || findRes(k)).filter(Boolean); }
function findRes(name) { let f = null; stepGroups.forEach(objs => objs.forEach(o => { if (!f && o.userData.resName === name) f = o; })); return f; }
const BC = { 0: '#1b1b1b', 1: '#7a4a1e', 2: '#d02a2a', 3: '#ef7d16' };

function renderPanel() {
  const f = FLOW[fi], st = STEPS[f.step];
  let h = '';
  if (f.kind === 'parts') {
    h += `<p class="lead">${esc(T('실습 키트 부품과 USB 5V 하나로 만듭니다. 배터리는 쓰지 않고, 5V 전원 자체를 감시하는 BMS예요.'))}</p>`;
    h += `<p class="desc">${esc(T(st.desc))}</p>`;
    h += `<h3>${T('키트 부품 12종')} <small>${T('누르면 3D에서 위치를 보여 줘요')}</small></h3><div class="plist">${PARTS.map((p, i) => `<button type="button" class="pcard${focusTarget && focusTarget.key === p.key ? ' on' : ''}" data-part="${i}"><span class="pn">${esc(T(p.name))}</span><span class="pq mono">×${p.q}</span>${p.b ? `<span class="bands" aria-hidden="true"><span class="rb">${p.b.map(c => `<i style="background:${BC[c]}"></i>`).join('')}<i style="background:#c9a43a"></i></span></span>` : ''}<span class="pd">${esc(T(p.d))}</span></button>`).join('')}</div>`;
    let fm = 0, mm = 0; STEPS.forEach(s => s.items.forEach(it => { if (it.t === 'wire') (wireKind(it) === 'F-M' ? fm++ : mm++); }));
    h += `<div class="note">${esc(F('prep', { mm, fm }))}</div>`;
    h += `<h3>${T('브레드보드 읽는 법')}</h3>` + tipList(st);
    h += `<h3>${T('점퍼선 색')}</h3><div class="legend">${Object.keys(COLORS).map(k => `<span><span class="sw" style="background:${COLORS[k]}"></span>${esc(COLOR_NAME[k])} = ${esc(NET_NAME[k])}</span>`).join('')}</div>`;
  } else if (f.kind === 'build') {
    h += `<p class="desc">${esc(T(st.desc))}</p>` + partRows(st) + wireRows(st);
    if (st.tips?.length) h += `<h3>${T('확인할 점')}</h3>` + tipList(st);
  } else if (f.kind === 'check') {
    const probes = st.items.filter(it => it.t === 'probe');
    h += `<p class="desc">${esc(T(st.desc))}</p><h3>${T('측정 위치')}</h3><ul class="rows">${probes.map(it => `<li><div class="rl"><b><span class="pnum mono">${esc(it.n)}</span>${esc(T(it.label))}</b><span>${esc(nice(it.at))}</span></div><div class="rc"><span class="val">${esc(T(it.expect))}</span></div></li>`).join('')}</ul>`;
    h += tipList(st);
    const fin = STEPS[12];
    const done = loadChecks();   // 수정됨: 체크 상태를 브라우저에 저장
    h += `<h3>${T('USB를 꽂기 전 체크리스트')} <small id="ckCount">${F('ckCount', { n: fin.tips.filter((_, i) => done[i]).length, m: fin.tips.length })}</small></h3><ul class="checks">${fin.tips.map((t, i) => `<li><label><input type="checkbox" id="ck${i}"${done[i] ? ' checked' : ''}> <span>${esc(T(t))}</span></label></li>`).join('')}</ul><button type="button" class="linkbtn" id="ckClear">${T('체크 모두 지우기')}</button>`;
    h += pinsHtml();
    h += troubleHtml();
  } else if (f.kind === 'code') {
    h += codeHtml();
  } else {
    h += runHtml();
  }
  panelBody.innerHTML = h;
  panelBody.scrollTop = 0;
  if (f.kind === 'run') { const el = $('serial'); if (el) { el.textContent = serialLines.join('\n'); el.scrollTop = el.scrollHeight; } }
}
function loadChecks() { try { return JSON.parse(localStorage.getItem('bms-checks') || '{}'); } catch (e) { return {}; } }
function saveChecks() {
  const o = {}; document.querySelectorAll('.checks input').forEach((c, i) => { if (c.checked) o[i] = 1; });
  try { localStorage.setItem('bms-checks', JSON.stringify(o)); } catch (e) {}
  const el = $('ckCount'); if (el) el.textContent = F('ckCount', { n: Object.keys(o).length, m: document.querySelectorAll('.checks input').length });
}
function pinsHtml() {
  const rows = [];
  STEPS.forEach((st, si) => st.items.forEach(it => { if (it.t !== 'wire') return; [[it.from, it.to], [it.to, it.from]].forEach(([a, b]) => { const p = parse(a); if (p.kind === 'hole' && p.esp) rows.push({ pin: p.esp, side: p.board, row: p.row, to: nice(b), step: si }); }); }));
  rows.sort((a, b) => (a.side === b.side ? b.row - a.row : (a.side === 'L' ? -1 : 1)));
  return `<details class="more"><summary>${T('ESP32 핀 표')}</summary><table><thead><tr><th>${T('ESP32 핀')}</th><th>${T('연결 대상')}</th></tr></thead><tbody>${rows.map(r => `<tr><td class="mono">${esc(r.pin)}<br><span class="kind">${esc(F(r.side === 'L' ? 'pinRowL' : 'pinRowR', { r: r.row }))}</span></td><td>${esc(r.to)}<br><span class="kind">${esc(F('stepN', { i: FLOW.findIndex(x => x.step === r.step) + 1 }))}</span></td></tr>`).join('')}</tbody></table></details>`;
}
function troubleHtml() {
  return `<details class="more"><summary>${T('문제 해결')}</summary><table><thead><tr><th>${T('증상')}</th><th>${T('원인과 해결')}</th></tr></thead><tbody>${[['TFT가 흰 화면만 표시', '긴 점퍼선에 SPI 40MHz는 빠름 → 10MHz로 낮춤'], ['LOAD OFF인데 전류가 조금 보임', 'ESP32 ADC는 0V에서도 약 0.14V를 읽음 → 릴레이가 꺼져 있을 때 0점 학습'],
    ['VBUS가 0V 근처 → 저전압 TRIP', '브레드보드 접촉 불량 → LED 시험과 3V3 점퍼 시험으로 범위를 좁힘'], ['VBUS 6.2V, 전류 수백 mA', '설계와 다른 저항 값 → 10kΩ 분배기, 220Ω×2 병렬 션트로 맞춤'],
    ['켜자마자 과전류 TRIP', '실험용 RL2·RL3까지 꽂음 → 평소엔 RL1만'], ['OFF에서 전류, ON에서 0', '부하 선이 릴레이 NC 단자 → NO로 옮김'], ['정상인데 RGB가 빨강', 'RGB 선이 한 칸씩 밀림 → R·G·B 핀 순서 확인']]
    .map(([a, b]) => `<tr><td>${esc(T(a))}</td><td>${esc(T(b))}</td></tr>`).join('')}</tbody></table></details>`;
}

let codeKey = 'cfg';
function codeHtml() {
  const lang = window.I18N.lang, src = CODE[codeKey].src[lang] || CODE[codeKey].src.en || CODE[codeKey].src.ko;
  return `<p class="desc">${esc(T('ESP32_BMS_TFT v3 펌웨어를 Arduino IDE로 올립니다. 아래는 핵심 코드 일부예요.'))}</p>
  <a class="dlcard" href="firmware/ESP32_BMS_TFT_v3.zip" download><span class="dlic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></span><span><b>${esc(T('펌웨어 내려받기'))}</b><small class="mono">ESP32_BMS_TFT_v3.zip · 21 KB · .ino + config.h + tft_ui.h + dashboard.h</small></span></a>
  <ol class="nums"><li>${esc(T('Arduino IDE → 보드 매니저에서 esp32 (Espressif) 설치, 보드는 ESP32 Dev Module'))}</li><li>${esc(T('라이브러리 매니저에서 OneWire, LovyanGFX 설치'))}</li><li>${esc(T('압축을 푼 폴더에서 ESP32_BMS_TFT.ino를 열고 업로드'))}</li><li>${esc(T('부팅 화면에 FW v3가 보이면 성공'))}</li></ol>
  <div class="term code"><div class="ttabs" role="tablist">${Object.keys(CODE).map(k => `<button role="tab" type="button" data-code="${k}" aria-selected="${k === codeKey}">${esc(T(CODE[k].tab))}</button>`).join('')}</div><pre tabindex="0">${hl(src)}</pre>
  <div class="tfoot"><span class="mono">${esc(CODE[codeKey].file)}</span><button class="mini" id="copyCode" type="button">${T('코드 복사')}</button></div></div>`;
}
function hl(src) {
  return src.split('\n').map(line => {
    const ci = line.indexOf('//');
    let code = ci >= 0 ? line.slice(0, ci) : line; const com = ci >= 0 ? line.slice(ci) : '';
    code = esc(code).replace(/\b(\d+(\.\d+)?f?)\b/g, '<span class="n">$1</span>').replace(/(#define|\bvoid\b|\bfloat\b|\bint\b|\bstatic\b|\bif\b|\belse\b|\bfor\b|\breturn\b|\bbool\b)/g, '<span class="k">$1</span>');
    return code + (com ? `<span class="c">${esc(com)}</span>` : '');
  }).join('\n');
}

function sw(id, label, on, dot) { return `<div class="swrow"><span>${dot ? `<i class="ldot" style="background:${dot}"></i>` : ''}${esc(label)}</span><button type="button" class="switch" role="switch" id="${id}" aria-checked="${!!on}" aria-label="${esc(label)}"${SRC.real ? ' disabled' : ''}><i></i></button></div>`; }
function runHtml() {
  const lv = (n, t) => `<span class="lv lv${n}">${t}</span>`;
  const dis = SRC.real ? ' disabled' : '', ok = serialOk();
  const conn = `<div class="srcbox${SRC.real ? ' on' : ''}"><span class="srcdot" aria-hidden="true"></span><div class="srct"><b>${esc(SRC.real ? T('실제 보드 연결됨') : T('실제 보드 연결'))}</b><span>${esc(SRC.real ? T('측정값은 보드에서 옵니다. 부하·리셋 버튼은 보드에 on · off · reset 명령을 보내요.') : ok ? T('ESP32를 USB로 꽂고 연결하면 시리얼 DATA로 이 화면을 움직여요. Arduino IDE 시리얼 모니터는 닫아 두세요.') : T('이 브라우저는 지원하지 않아요. 데스크톱 Chrome이나 Edge에서 열어 주세요.'))}</span></div><button type="button" class="${SRC.real ? 'ghostbtn' : 'ybtn'} sm" id="aConn"${ok ? '' : ' disabled'}>${esc(SRC.real ? T('연결 끊기') : T('연결'))}</button></div>`;
  return `${conn}<p class="desc">${esc(SRC.real ? T('실제 보드의 판정 결과를 그대로 보여 줍니다. 저항을 더 꽂거나 센서를 손으로 쥐어 보며 변화를 확인해 보세요.') : T('시뮬레이션 BMS는 실제 펌웨어와 같은 규칙으로 판정합니다. 부하를 켜고, 저항을 더 꽂고, 센서를 데워 보며 경고와 차단을 확인해 보세요.'))}</p>
  <h3>${T('부하')}</h3>
  <div class="loadbox"><button type="button" class="power" id="aLoad" aria-pressed="${S.loadOn}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" /><path d="M6.4 6.6a8 8 0 1 0 11.2 0" /></svg></button>
    <div class="loadtxt"><b id="aLoadTxt"></b><span id="aLoadSub"></span></div>
    <button type="button" class="ybtn sm" id="aReset">${T('TRIP 리셋')}</button></div>
  <div class="simonly${SRC.real ? ' off' : ''}">${SRC.real ? `<p class="note">${esc(T('아래 가상 조작은 시뮬레이터 전용이에요. 연결을 끊으면 다시 쓸 수 있어요.'))}</p>` : ''}
  ${sw('aRL2', T('RL2 220Ω 꽂기'), S.rl2, '#d02a2a')}${sw('aRL3', T('RL3 220Ω 꽂기'), S.rl3, '#d02a2a')}
  <h3>${T('시험 상황')}</h3>
  <div class="seg" role="radiogroup" aria-label="${esc(T('온도'))}"><button type="button" role="radio" data-heat="none"${dis}>${T('평상시')}</button><button type="button" role="radio" data-heat="hand"${dis}>${T('손으로 쥐기')}</button><button type="button" role="radio" data-heat="hot"${dis}>${T('뜨거운 물')}</button></div>
  <p class="hint">${esc(T('뜨거운 물에서는 45°C에 닿기 전에 위험이 뜰 수 있어요. 온도가 1분에 6°C 넘게 빨리 오르면 온도 상승률 기준으로 먼저 차단하기 때문이에요.'))}</p>
  ${sw('aUV', T('저전압 (R2에 10kΩ 병렬)'), S.uv)}${sw('aOV', T('과전압 (3V3 → GPIO34)'), S.ov)}
  <div class="slrow"><label for="aSpeed">${T('시간 배속')}</label><b class="mono" id="aSpeedV"></b></div>
  <input type="range" id="aSpeed" min="1" max="20" step="1" value="${S.speed}"${dis}></div>
  <div class="keys"><span><kbd>Space</kbd> ${T('부하')}</span><span><kbd>2</kbd><kbd>3</kbd> RL2·RL3</span><span><kbd>H</kbd> ${T('손으로 쥐기')}</span><span><kbd>R</kbd> ${T('리셋')}</span><span><kbd>←</kbd><kbd>→</kbd> ${T('단계')}</span></div>
  <div class="term"><div class="thead"><span>${T('시리얼 모니터')} · 115200${SRC.real ? ' · LIVE' : ''}</span><span>${SRC.real ? '' : `<button class="mini" id="aRun" type="button"></button> `}<button class="mini" id="aCsv" type="button" title="${esc(T('기록을 CSV 파일로 저장'))}">${T('CSV 저장')}</button> <button class="mini" id="aClear" type="button">${T('지우기')}</button></span></div><pre id="serial" tabindex="0"></pre></div>
  <p class="hint">${esc(T('DATA 열 순서는 맨 위 # 줄과 같아요. SOC 열은 배터리가 없어 항상 0이에요(펌웨어 출력 형식을 맞추려고 남겨 둔 칸). CSV에는 1초마다 한 줄씩 최대 10시간이 쌓여요.'))}</p>
  <details class="more"><summary>${T('4단계 판정 기준')}</summary><table class="num"><thead><tr><th>${T('항목')}</th><th>${lv(1, T('주의'))}</th><th>${lv(2, T('경고'))}</th><th>${lv(3, T('위험'))}</th></tr></thead><tbody>
    <tr><td>${T('과전압 (V)')}</td><td>≥ 5.25</td><td>≥ 5.40</td><td>≥ 5.60</td></tr><tr><td>${T('저전압 (V)')}</td><td>≤ 4.40</td><td>≤ 4.20</td><td>≤ 4.00</td></tr>
    <tr><td>${T('과전류 (mA)')}</td><td>≥ 15.0</td><td>≥ 18.0</td><td>≥ 23.5</td></tr><tr><td>${T('과열 (°C)')}</td><td>≥ 32</td><td>≥ 38</td><td>≥ 45</td></tr>
    <tr><td>${T('온도 상승률 (°C/분)')}</td><td>≥ 1</td><td>≥ 3</td><td>≥ 6</td></tr><tr><td>${T('위험도 지수')}</td><td>≥ 30</td><td>≥ 50</td><td>≥ 70</td></tr></tbody></table>
    <p class="note">${T('위험 단계가 나오면 릴레이를 끄고 TRIP(래치)을 겁니다. 열폭주 예측: 지금 온도 상승률로 45°C까지 5분 안에 도달하면 경고.')}</p></details>`;
}

/* ---------- 실시간 표시 ---------- */
const LV_KO = ['정상', '주의', '경고', '위험'];
function updateLive() {
  const lvTxt = S.latched && S.level < 3 ? 'TRIP' : T(LV_KO[S.level]);
  const col = S.latched && S.level < 3 ? '#2563c9' : LV_HEX[S.level];
  if ($('tV')) {
    $('tV').textContent = S.V.toFixed(2); $('tI').textContent = S.I.toFixed(1); $('tT').textContent = fx(S.T, 1); $('tR').textContent = Math.round(S.risk);
    $('stLv').textContent = lvTxt; $('stLv').parentElement.style.setProperty('--c', col);
  }
  if ($('fcState')) {
    const stage = S.latched ? 3 : S.level >= 1 ? 2 : S.loadOn ? 1 : 0;
    document.querySelectorAll('#flowsvg [data-node]').forEach(n => n.classList.toggle('on', +n.dataset.node <= stage));
    $('fcState').textContent = S.latched ? T('TRIP: 부하 차단됨') : S.level ? `${T(LV_KO[S.level])}: ${S.reason}` : S.loadOn ? T('정상: 부하에 전류가 흐르는 중') : T('정상: 부하 꺼짐');
    $('fcSub').textContent = S.latched ? (S.level === 3 ? T('아직 위험 조건이 남아 있어요') : T('원인이 사라졌어요. 리셋하면 다시 켤 수 있어요')) : S.mins > 0 ? F('runaway', { m: S.mins.toFixed(1) }) : T('측정 → 필터 → 판정 → 보호를 1초마다 반복');
    const b = $('fcBtn'); b.textContent = S.latched ? T('리셋') : S.loadOn ? T('부하 끄기') : T('부하 켜기'); b.classList.toggle('warnbtn', S.latched);
  }
  if (FLOW[fi].kind !== 'run' || !$('aLoad')) return;
  $('aLoad').setAttribute('aria-pressed', String(S.loadOn)); $('aLoad').disabled = S.latched;
  $('aLoad').setAttribute('aria-label', S.loadOn ? T('부하 끄기') : T('부하 켜기'));
  $('aLoadTxt').textContent = S.latched ? 'TRIP' : S.loadOn ? 'LOAD ON' : 'LOAD OFF';
  $('aLoad').disabled = S.latched && !SRC.real;
  $('aLoadSub').textContent = S.latched ? T('위험 감지로 차단됨 · 리셋 필요') : S.loadOn ? F('loadNow', { i: S.I.toFixed(1) }) : T('버튼을 눌러 부하 켜기');
  $('aReset').disabled = !S.latched;
  [['aRL2', S.rl2], ['aRL3', S.rl3], ['aUV', S.uv], ['aOV', S.ov]].forEach(([id, v]) => $(id).setAttribute('aria-checked', String(!!v)));
  const heat = S.hot ? 'hot' : S.hand ? 'hand' : 'none';
  document.querySelectorAll('[data-heat]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.heat === heat)));
  $('aSpeedV').textContent = `×${S.speed}`;
  if ($('aRun')) $('aRun').textContent = S.running ? T('멈추기') : T('다시 시작');
}
function drawTrend() {
  const cv = $('trend'); if (!cv || FLOW[fi].kind !== 'run') return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  // 수정됨: 데이터가 적을 때는 쌓인 만큼만 가로로 펼침 (최소 30초 폭, 최대 120초)
  const n = S.hI.length, span = Math.max(30, n) - 1, off = Math.max(0, span + 1 - n);
  const X = i => 6 + i / span * (W - 12);
  g.strokeStyle = '#e1dccd'; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const y = 8 + k * (H - 16) / 4; g.beginPath(); g.moveTo(6, y); g.lineTo(W - 6, y); g.stroke(); }
  g.fillStyle = '#8a8370'; g.font = '600 19px "Roboto Condensed", sans-serif'; g.textBaseline = 'top';
  g.textAlign = 'left'; g.fillText(`−${span + 1}s`, 10, 10); g.textAlign = 'right'; g.fillText(SRC.real ? 'LIVE' : 'SIM', W - 10, 10); g.textAlign = 'left';
  const line = (data, lo, hi, col, limit) => {
    const Y = v => H - 8 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (H - 16);
    g.strokeStyle = col; g.globalAlpha = .45; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(6, Y(limit)); g.lineTo(W - 6, Y(limit)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    if (data.length < 2) return;
    g.lineWidth = 2.5; g.beginPath(); let pen = false;
    data.forEach((v, i) => { if (!isFinite(v)) { pen = false; return; } pen ? g.lineTo(X(i + off), Y(v)) : g.moveTo(X(i + off), Y(v)); pen = true; }); g.stroke();
    if (!isFinite(data[data.length - 1])) return;
    g.fillStyle = col; g.beginPath(); g.arc(X(span), Y(data[data.length - 1]), 3.5, 0, 7); g.fill();
  };
  line(S.hT, 20, 50, '#f6c047', 45);
  line(S.hI, 0, 40, '#1e3a5c', 23.5);
}

/* ---------- 썸네일: 각 단계의 3D 모습을 작게 찍어 둠 ---------- */
function makeThumbs() {
  const W = 288, H = 176, rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  const cam = new THREE.PerspectiveCamera(36, W / H, 2, 1500);
  const buf = new Uint8Array(W * H * 4), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H);
  const save = { fi, MODE, current, showAll };
  FLOW.forEach((f, i) => {
    MODE = f.kind === 'run' ? 'lab' : f.kind === 'code' ? 'code' : 'build'; current = f.step; showAll = false;
    applyScene(); scene.updateMatrixWorld(true);
    const box = MODE === 'build' && STEPS[current].items.length && !STEPS[current].all ? stepBox() : allBox();
    const target = box.getCenter(new THREE.Vector3()); target.y = 0;
    const size = box.getSize(new THREE.Vector3()), dir = new THREE.Vector3(-.62, .78, 0).normalize();
    const vfov = THREE.MathUtils.degToRad(cam.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
    const dist = Math.max(size.z / 2 * 1.04 / Math.tan(hfov / 2), (size.x * .8 + size.y * .6) / 2 * 1.05 / Math.tan(vfov / 2), 18) + size.x * .3;
    cam.position.copy(target).addScaledVector(dir, dist); cam.lookAt(target);
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null);
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    g.putImageData(img, 0, 0); thumbs[f.id] = cv.toDataURL('image/jpeg', .82);
  });
  rt.dispose();
  ({ fi, MODE, current, showAll } = save); applyScene(); renderStrip();
}

/* ---------- 1단계: 부품을 작업대 앞에 늘어놓기 (실제 3D 부품을 복제해 진열) ---------- */
function buildTray() {
  LAB.tray = {}; LAB.trayTags = [];
  const items = [
    ['tft', LAB.parts.tft, null, '3.5인치 TFT LCD', 1],
    ['relay', LAB.parts.relay, [-41, -25], '릴레이', 1],
    ['ds', LAB.parts.ds, [-41, -12], 'DS18B20', 1, 1.3],
    ['buz', LAB.parts.buz, [-41, -1], '부저', 1, 1.3],
    ['rgb', LAB.parts.rgb, [-41, 10], 'RGB LED', 1, 1.3],
    ['button', LAB.parts.button, [-41, 21], '버튼', 1, 1.6],
    ['r10k', LAB.parts.R1, [-56, -22], '10kΩ', 2, 2],
    ['r330', LAB.parts.RL1, [-56, -8], '330Ω', 4, 2],
    ['r220', LAB.parts.RS1, [-56, 6], '220Ω', 4, 2],
    ['cap', LAB.parts.C1, [-56, 20], '100nF', 2, 2],
  ];
  scene.updateMatrixWorld(true);
  items.forEach(([key, orig, at, name, q, sc = 1]) => {
    if (!orig) return;
    const keep = []; orig.traverse(o => { keep.push([o, o.userData]); o.userData = {}; });
    const cl = orig.clone(true);
    keep.forEach(([o, u]) => { o.userData = u; });
    const box = new THREE.Box3().setFromObject(orig, true), c = box.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group(); wrap.add(cl);
    if (at) { cl.position.set(-c.x, -box.min.y, -c.z); wrap.scale.setScalar(sc); wrap.position.set(at[0], TABLE_Y + .05, at[1]); }
    cl.traverse(o => { o.visible = true; if (o.isMesh) { o.userData.owner = wrap; pickables.push(o); } });
    wrap.userData.info = orig.userData.info; wrap.userData.stepOnly = true;
    scene.add(wrap); stepGroups[0].push(wrap); LAB.tray[key] = wrap;
    const top = new THREE.Box3().setFromObject(wrap, true);
    const p = top.getCenter(new THREE.Vector3()); p.y = top.max.y + 1.2;
    const tg = tag(() => `${T(name)} ×${q}`, p, 'pin'); scene.add(tg); LAB.trayTags.push(tg);
  });
  // 보드에 이미 놓인 ESP32와 브레드보드에도 이름표
  [[LAB.parts.esp, 'ESP32 DevKitC V4', 1], [boards[0], '브레드보드 830홀', 2]].forEach(([o, name, q]) => {
    if (!o) return; const b = new THREE.Box3().setFromObject(o, true), p = b.getCenter(new THREE.Vector3()); p.y = b.max.y + 1.5;
    if (o === boards[0]) { p.x = b.min.x + 2; }
    const tg = tag(() => `${T(name)} ×${q}`, p, 'pin'); scene.add(tg); LAB.trayTags.push(tg);
  });
}

/* ---------- 소리 (설정에서 켜면 부저를 스피커로) ---------- */
let actx = null;
function beep(freq, ms) {
  if (!PREF.sound) return;
  try { actx = actx || new AudioContext(); const o = actx.createOscillator(), v = actx.createGain(); o.type = 'square'; o.frequency.value = freq; v.gain.value = .04; o.connect(v).connect(actx.destination); o.start(); o.stop(actx.currentTime + ms / 1000); } catch (e) {}
}
const _tick = simTick;
simTick = function () { _tick(); if (S.level === 3) beep(1800, 400); else if (S.level === 2) beep(1200, 120); };

/* ---------- 조작 ---------- */
function onViewChange() { $('vTop').setAttribute('aria-pressed', String(viewMode === 'top')); }
function zoomBy(k) { const t = controls.target, p = camera.position; p.sub(t).multiplyScalar(k).add(t); controls.update(); }
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-fi]'); if (!t) return;
  if (t.dataset.fi !== undefined) { go(+t.dataset.fi); return; }
  if (t.dataset.jump) { go(t.dataset.jump === 'run' ? FLOW.length - 1 : 0); return; }
  if (t.dataset.part !== undefined) {
    const p = PARTS[+t.dataset.part]; const objs = partObjs(p.key, p.tray);
    focusTarget = objs; focusTarget.key = p.key;
    objs.forEach(o => { highlight(o, true); setTimeout(() => highlight(o, false), 1600); });
    renderPanel(); setView('part'); return;
  }
  if (t.dataset.code) { codeKey = t.dataset.code; renderPanel(); return; }
  if (t.dataset.heat) { if (simOnly()) return; S.hand = t.dataset.heat === 'hand'; S.hot = t.dataset.heat === 'hot'; updateLive(); return; }
  switch (t.id) {
    case 'back': go(fi - 1); break;
    case 'next': go(fi === FLOW.length - 1 ? 0 : fi + 1); break;
    case 'sPrev': $('strip').scrollBy({ left: -360, behavior: 'smooth' }); break;
    case 'sNext': $('strip').scrollBy({ left: 360, behavior: 'smooth' }); break;
    case 'zIn': zoomBy(.8); break;
    case 'zOut': zoomBy(1.25); break;
    case 'vTop': setView(viewMode === 'top' ? (MODE === 'build' ? 'focus' : 'persp') : 'top'); break;
    case 'vHome': setView(MODE === 'build' ? 'focus' : 'persp'); break;
    case 'tags': showTags = !showTags; PREF.tags = showTags; savePref(); t.setAttribute('aria-pressed', String(showTags)); applyScene(); break;
    case 'aLoad': pressButton(); break;
    case 'aConn': SRC.real ? disconnectBoard(false) : connectBoard(); return;
    case 'aCsv': downloadCsv(); return;
    case 'ckClear': document.querySelectorAll('.checks input').forEach(c => { c.checked = false; }); saveChecks(); return;
    case 'vCards': PREF.cards = !$('stage').classList.toggle('nocards'); savePref(); t.setAttribute('aria-pressed', String(!PREF.cards)); if (camera) { resize(); setView(viewMode === 'top' ? 'top' : MODE === 'build' ? 'focus' : 'persp'); } return;
    case 'fcBtn': pressButton(); break;
    case 'aReset': FX.press = 1; tryReset(); break;
    case 'aRL2': doAction('rl2'); break;
    case 'aRL3': doAction('rl3'); break;
    case 'aUV': if (simOnly()) return; S.uv = !S.uv; if (S.uv) S.ov = false; break;
    case 'aOV': if (simOnly()) return; S.ov = !S.ov; if (S.ov) S.uv = false; break;
    case 'aRun': S.running = !S.running; startSim(); break;
    case 'aClear': serialLines.length = 0; $('serial').textContent = ''; serialHeader(); break;
    case 'copyCode': {
      const lang = window.I18N.lang, src = CODE[codeKey].src[lang] || CODE[codeKey].src.en || CODE[codeKey].src.ko;
      navigator.clipboard.writeText(src).then(() => flash(T('코드를 복사했어요')), () => flash(T('복사가 막혔어요. 코드를 직접 선택해 복사하세요.'))); break;
    }
    case 'gear': $('settings').hidden = false; $('setSound').setAttribute('aria-checked', String(PREF.sound)); $('setTags').setAttribute('aria-checked', String(showTags)); $('setClose').focus(); break;
    case 'setClose': $('settings').hidden = true; $('gear').focus(); break;
    case 'setSound': PREF.sound = !PREF.sound; savePref(); t.setAttribute('aria-checked', String(PREF.sound)); if (PREF.sound) beep(1200, 120); break;
    case 'setTags': showTags = !showTags; PREF.tags = showTags; savePref(); t.setAttribute('aria-checked', String(showTags)); $('tags').setAttribute('aria-pressed', String(showTags)); applyScene(); break;
    case 'setReset': if (simOnly()) return; Object.assign(S, { loadOn: true, rl2: false, rl3: false, hand: false, hot: false, uv: false, ov: false, latched: false, level: 0, T: 24.8, histV: [], histT: [], hI: [], hT: [], vEma: NaN, tEma: NaN, mah: 0 }); serialLines.length = 0; serial('# reset'); serialHeader(); applyScene(); renderPanel(); updateLive(); flash(T('시뮬레이션을 처음 상태로 되돌렸어요')); break;
    default: return;
  }
  updateLive();
});
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('.checks input')) saveChecks(); });
document.addEventListener('input', e => { if (e.target.id === 'aSpeed') { S.speed = +e.target.value; startSim(); updateLive(); } });
$('settings').addEventListener('click', e => { if (e.target.id === 'settings') { $('settings').hidden = true; } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('settings').hidden) { $('settings').hidden = true; return; }
  if (e.target.closest('input,textarea,select,[role=tab]') || e.ctrlKey || e.metaKey || e.altKey) return;
  // 수정됨: 버튼·스위치에 포커스가 있으면 Space/Enter는 그 버튼이 받도록 단축키를 건너뜀
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('button,a,summary,[role=switch],[role=radio]')) return;
  if (e.key === 'ArrowRight') { go(fi + 1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { go(fi - 1); e.preventDefault(); }
  else if (FLOW[fi].kind === 'run') {
    const k = e.key.toLowerCase();
    if (k === ' ') { pressButton(); e.preventDefault(); } else if (k === '2') doAction('rl2'); else if (k === '3') doAction('rl3');
    else if (k === 'h') { if (simOnly()) return; S.hand = !S.hand; if (S.hand) S.hot = false; } else if (k === 'r') { FX.press = 1; tryReset(); } else return;
    updateLive();
  }
});
window.addEventListener('hashchange', () => { const i = FLOW.findIndex(f => f.id === location.hash.slice(1)); if (i >= 0 && i !== fi) go(i, { fromHash: true }); });

/* ---------- 언어 ---------- */
function applyLang() {
  document.documentElement.lang = window.I18N.lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
  document.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', T(el.dataset.ta)); el.title = T(el.dataset.ta); });
  document.title = `ESP32 BMS Lab — ${T('USB 5V로 만드는 배터리 관리 시스템')}`;
  $('langCode').textContent = window.I18N.lang.toUpperCase();
  retext(); renderAll(); drawTft3D();
}
const langSel = $('lang');
langSel.innerHTML = Object.entries(window.I18N.LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
langSel.value = window.I18N.lang;
langSel.addEventListener('change', () => { window.I18N.set(langSel.value); applyLang(); });

/* ---------- 시작 ---------- */
showTags = PREF.tags !== false;
const h0 = FLOW.findIndex(f => f.id === location.hash.slice(1));
fi = h0 >= 0 ? h0 : FLOW.length - 1;            // 첫 화면: 실험해 보기
serialHeader();
for (let k = 0; k < 8; k++) simTick();
if (PREF.cards === false) { $('stage').classList.add('nocards'); $('vCards').setAttribute('aria-pressed', 'true'); }
go(fi, { fromHash: true });
applyLang();
try {
  THREE = await import('three');
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
  ({ CSS2DRenderer, CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js'));
  ({ RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js'));
  init(); buildTray(); retext(); applyScene(); resize(); setView(MODE === 'build' ? 'focus' : 'persp', true); drawTft3D(); startSim();
  if (document.fonts) document.fonts.ready.then(() => { resize(); setView(viewMode === 'top' ? 'top' : MODE === 'build' ? 'focus' : 'persp', true); });
  requestAnimationFrame(() => { try { makeThumbs(); } catch (e) { console.warn(e); } });
} catch (e) { console.error(e); $('err').hidden = false; startSim(); }
