/* ── BMS 3D 회로: three.js 0.170 (3D 조립 실습실과 같은 버전) ── */
const host = document.getElementById('c3d');
const P3 = [
  ['esp', 'ESP32 DevKitC V4', 'WROOM-32E. 측정·판정·제어를 맡고 Wi-Fi 웹 서버도 띄웁니다.'],
  ['boards', '브레드보드 830홀 ×2', '두 장 사이에 ESP32를 걸쳐 꽂습니다. 아래 보드 레일은 5V, 위 보드 레일은 3V3.'],
  ['tft', '3.5인치 TFT LCD', '480×320, ST7796S, SPI. 판정 단계와 측정값을 보여 주는 현장 대시보드.'],
  ['relay', '릴레이 모듈 SRD-05VDC', '5V 1채널. COM·NO로 부하를 연결하고, TRIP이면 끊습니다.'],
  ['ds', 'DS18B20 온도센서', '1-Wire 디지털 온도센서. +는 3V3에 연결합니다.'],
  ['buz', '수동 부저', 'tone()으로 단계별 경보음을 냅니다. 경고·위험에서 울려요.'],
  ['rgb', 'RGB LED 모듈', '초록 정상 · 노랑 주의 · 주황 경고 · 빨강 위험 · 파랑 TRIP.'],
  ['button', '택트 스위치', '부하 ON/OFF, TRIP 리셋.'],
  ['res', '저항 10kΩ · 220Ω · 330Ω', 'R1·R2(10kΩ) 전압 분배, RS1·RS2(220Ω) 션트, RGB 전류 제한(330Ω). 세라믹 콘덴서 100nF 두 개로 ADC 잡음을 거릅니다.'],
];
const LV = [
  { n: '정상', c: '#22c55e', v: 3.98, i: .42, t: 26 },
  { n: '주의', c: '#eab308', v: 3.74, i: .58, t: 38 },
  { n: '경고', c: '#f97316', v: 3.55, i: .71, t: 46 },
  { n: '위험', c: '#ef4444', v: 3.36, i: .86, t: 55 },
  { n: 'TRIP', c: '#3b82f6', v: 3.36, i: 0, t: 52 },
];
const $ = id => document.getElementById(id);
const plist = $('plist'), pinfo = $('pinfo'), readout = $('readout'), lvBtns = $('lvBtns');
plist.innerHTML = P3.map(p => `<li><button type="button" data-k="${p[0]}" aria-pressed="false">${p[1]}</button></li>`).join('');
lvBtns.innerHTML = LV.map((l, i) => `<button type="button" data-i="${i}" style="--c:${l.c}" aria-pressed="${i === 0}">${l.n}</button>`).join('');

let sel = null, level = 0, auto = true, tick = 0, cur = null, onLevel = () => {}, onTick = () => {}, onSel = () => {};
const temps = [];
function choose(k) {
  sel = sel === k ? null : k;
  plist.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === sel)));
  const p = P3.find(x => x[0] === sel);
  pinfo.innerHTML = p ? `<b>${p[1]}</b>${p[2]}` : '부품을 누르면 여기에 설명이 나와요';
  onSel();
}
function setLevel(i, byUser) {
  level = i; if (byUser) auto = false;
  lvBtns.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
  sample(); onLevel();
}
plist.addEventListener('click', e => { const b = e.target.closest('button'); if (b) choose(b.dataset.k); });
lvBtns.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLevel(+b.dataset.i, true); });
function sample() {
  const l = LV[level], n = () => Math.random() - .5;
  cur = { v: l.v + n() * .02, i: l.i ? l.i + n() * .03 : 0, t: l.t + n() * .6 };
  temps.push(cur.t); if (temps.length > 40) temps.shift();
  const l2 = LV[level];
  readout.innerHTML = `<span class="pill" style="--c:${l2.c}">${l2.n}</span><dl><div><dt>셀 전압</dt><dd>${cur.v.toFixed(2)} V</dd></div><div><dt>전류</dt><dd>${cur.i.toFixed(2)} A</dd></div><div><dt>온도</dt><dd>${cur.t.toFixed(1)} °C</dd></div><div><dt>부하</dt><dd>${l2.n === 'TRIP' ? '차단' : '연결'}</dd></div></dl>`;
}
sample();
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  tick++; if (auto && tick % 3 === 0) setLevel((level + 1) % LV.length); else { sample(); onTick(); }
}, 1000);

function fail() {
  host.innerHTML = `<p class="loading">이 브라우저에서는 3D를 불러오지 못했어요.<br><a href="https://esp32-bms-lab3d.vercel.app/">3D 조립 실습실에서 보기 →</a></p>`;
  $('ctl3d').hidden = true;
}

(async () => {
  let THREE, OrbitControls;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
  } catch (e) { fail(); return; }
  try { init(THREE, OrbitControls); } catch (e) { console.error(e); fail(); }
})();

function init(THREE, OrbitControls) {
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.outputColorSpace = THREE.SRGBColorSpace;
  host.innerHTML = ''; host.appendChild(R.domElement);
  const S = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400);
  const TARGET = new THREE.Vector3(0, 1, -.5);
  const HOME = new THREE.Vector3(1, .82, 1).normalize().multiplyScalar(90).add(TARGET);   // 등각에 가까운 시점
  cam.position.copy(HOME);
  const ctl = new OrbitControls(cam, R.domElement);
  ctl.target.copy(TARGET); ctl.enableDamping = true; ctl.enablePan = false; ctl.enableZoom = false;
  ctl.minPolarAngle = .3; ctl.maxPolarAngle = 1.32; ctl.autoRotateSpeed = 1.1; ctl.update();

  // 빛: 모든 그림과 같은 방향 — 화면 왼쪽 위
  S.add(new THREE.HemisphereLight(0xffffff, 0xDDEBDF, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-10, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
  sun.shadow.bias = -.0006; sun.shadow.radius = 5; S.add(sun);

  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, metalness: 0, ...o });
  const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const G = {};
  const part = k => { if (!G[k]) { const g = new THREE.Group(); g.userData.part = k; S.add(g); G[k] = g; } return G[k]; };
  const mesh = (g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // 바닥 판 + 격자
  const side = M('#E2EDE4');
  mesh(S, BOX(38, .6, 32), [side, side, M('#ffffff'), side, side, side], 0, -.3, -.5).castShadow = false;
  const grid = new THREE.GridHelper(30, 20, 0xDCE9DF, 0xE6EFE8); grid.position.y = .005; S.add(grid);

  // 브레드보드 두 장 (구멍·레일 무늬는 캔버스)
  const hx = k => -8.25 + (k + 1.5) * (16.5 / 63);
  const bbTex = railBack => canvasTex(1320, 440, x => {
    x.fillStyle = '#fbfcfe'; x.fillRect(0, 0, 1320, 440);
    const rows = railBack ? ['r', 'r', 0, 't', 't', 't', 't', 't', 'ch', 't', 't', 't', 't', 't'] : ['t', 't', 't', 't', 't', 'ch', 't', 't', 't', 't', 't', 0, 'r', 'r'];
    const sy = 440 / 15, sx = 1320 / 63;
    rows.forEach((r, i) => {
      const y = sy * (i + 1);
      if (r === 'ch') { x.fillStyle = '#e6eaf2'; x.fillRect(0, y - 9, 1320, 18); return; }
      if (!r) return;
      x.fillStyle = '#596377';
      for (let k = 0; k < 60; k++) { if (r === 'r' && k % 6 === 5) continue; x.fillRect(sx * (k + 1.5) - 4, y - 4, 8, 8); }
    });
    const ri = rows.indexOf('r'), y1 = sy * (ri + 1) - 16, y2 = sy * (ri + 2) + 13;
    x.fillStyle = railBack ? '#e5484d' : '#3b6fe0'; x.fillRect(sx, y1, 1320 - 2 * sx, 3);
    x.fillStyle = railBack ? '#3b6fe0' : '#e5484d'; x.fillRect(sx, y2, 1320 - 2 * sx, 3);
  });
  const bbSide = M('#F1F4EE');
  for (const [z, back] of [[-3.1, true], [3.1, false]]) mesh(part('boards'), BOX(16.5, .9, 5.5), [bbSide, bbSide, new THREE.MeshStandardMaterial({ map: bbTex(back), roughness: .85 }), bbSide, bbSide, bbSide], 0, .45, z);

  // ESP32 DevKitC (두 보드에 걸침)
  const esp = part('esp'), gold = M('#d4a940', { metalness: .7, roughness: .35 }), metal = M('#c9ced8', { metalness: .75, roughness: .28 });
  mesh(esp, BOX(5.6, .16, 2.7), M('#1f2637', { roughness: .45 }), 3, 1.82, 0);
  for (const z of [-1.18, 1.18]) {
    mesh(esp, BOX(5.0, .86, .26), M('#111827'), 3, 1.33, z);
    for (let i = 0; i < 19; i++) mesh(esp, BOX(.09, .14, .09), gold, .72 + i * .254, 1.96, z);
  }
  const shieldTop = new THREE.MeshStandardMaterial({ metalness: .55, roughness: .35, map: canvasTex(256, 236, x => { x.fillStyle = '#d4d8e0'; x.fillRect(0, 0, 256, 236); x.fillStyle = '#4b5366'; x.font = '700 26px sans-serif'; x.fillText('ESP32-WROOM', 22, 104); x.font = '500 20px sans-serif'; x.fillText('-32E  Wi-Fi·BT', 22, 138); }) });
  mesh(esp, BOX(1.9, .34, 1.8), [metal, metal, shieldTop, metal, metal, metal], 4.5, 2.07, 0);
  mesh(esp, BOX(.75, .3, .95), metal, .45, 2.03, 0);
  for (const z of [-.85, .85]) { mesh(esp, BOX(.32, .16, .32), M('#3a4255'), 1.25, 1.97, z); mesh(esp, BOX(.18, .07, .18), M('#f4f6fa'), 1.25, 2.07, z); }
  mesh(esp, new THREE.SphereGeometry(.07, 10, 8), M('#ef4444', { emissive: '#ef4444', emissiveIntensity: 1.2 }), 2.0, 1.93, .9);

  // 3.5인치 TFT (뒤쪽에 세워 둠)
  const tft = part('tft'), tg = new THREE.Group(); tg.position.set(-2.6, 0, -10.4); tg.rotation.x = -.16; tft.add(tg);
  mesh(tg, BOX(10.6, 7, .45), M('#1b2233', { roughness: .4 }), 0, 4.15, 0);
  mesh(tg, BOX(1.2, 4.2, .35), M('#C9D8CD'), 0, 2.1, -.75, .38);
  mesh(tg, BOX(4.2, .3, .3), M('#0f141f'), -2.3, .55, .1);
  const tc = document.createElement('canvas'); tc.width = 640; tc.height = 414;
  const tTex = new THREE.CanvasTexture(tc); tTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(9.7, 6.25), new THREE.MeshBasicMaterial({ map: tTex, toneMapped: false }));
  screen.position.set(0, 4.15, .235); tg.add(screen);
  const rr = (x, X, Y, W, H, r) => { x.beginPath(); x.roundRect(X, Y, W, H, r); x.fill(); };
  function drawTFT() {
    const x = tc.getContext('2d'), l = LV[level];
    x.fillStyle = '#0b1222'; x.fillRect(0, 0, 640, 414);
    x.fillStyle = '#16213a'; x.fillRect(0, 0, 640, 58);
    x.fillStyle = '#e2e8f0'; x.font = '700 28px "Noto Sans KR", sans-serif'; x.fillText('ESP32 BMS', 24, 39);
    x.fillStyle = '#7c8aa5'; x.font = '500 20px "Noto Sans KR", sans-serif'; x.fillText('가상 데이터', 512, 37);
    x.fillStyle = l.c; rr(x, 24, 82, 196, 70, 16);
    x.fillStyle = '#fff'; x.font = '800 36px "Noto Sans KR", sans-serif'; x.textAlign = 'center'; x.fillText(l.n, 122, 130); x.textAlign = 'left';
    x.fillStyle = l.n === 'TRIP' ? '#93c5fd' : '#86efac'; x.font = '600 21px "Noto Sans KR", sans-serif'; x.fillText(l.n === 'TRIP' ? '부하 차단' : '부하 연결', 24, 186);
    [['전압', cur.v.toFixed(2) + ' V'], ['전류', cur.i.toFixed(2) + ' A'], ['온도', cur.t.toFixed(1) + ' °C']].forEach(([a, b], i) => {
      x.fillStyle = '#7c8aa5'; x.font = '500 22px "Noto Sans KR", sans-serif'; x.fillText(a, 262, 108 + i * 44);
      x.fillStyle = '#f8fafc'; x.font = '700 32px "Space Grotesk", sans-serif'; x.fillText(b, 340, 110 + i * 44);
    });
    const X0 = 24, X1 = 616, Y0 = 236, Y1 = 392;
    x.strokeStyle = '#1e293b'; x.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const y = Y0 + (Y1 - Y0) * k / 4; x.beginPath(); x.moveTo(X0, y); x.lineTo(X1, y); x.stroke(); }
    x.fillStyle = '#7c8aa5'; x.font = '500 17px "Noto Sans KR", sans-serif'; x.fillText('온도 최근 40초', X0, Y0 - 10);
    x.strokeStyle = l.c; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath();
    temps.forEach((t, k) => { const px = X0 + (X1 - X0) * k / 39, py = Y1 - (Math.min(60, Math.max(20, t)) - 20) / 40 * (Y1 - Y0); k ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.stroke(); tTex.needsUpdate = true;
  }

  // 모듈 (보드 밖 앞줄, 핀은 보드 쪽)
  const pcb = M('#263044', { roughness: .5 });
  const PZ = 8.6;
  function mod(k, x, w = 2.4, d = 1.8) {
    const g = part(k);
    mesh(g, BOX(w, .16, d), pcb, x, .38, PZ);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(g, BOX(.14, .3, .14), M('#c9d0de'), x + dx * (w / 2 - .2), .15, PZ + dz * (d / 2 - .2));
    for (const i of [-.4, 0, .4]) mesh(g, BOX(.13, .5, .13), gold, x + i, .62, PZ - d / 2 + .16);
    return g;
  }
  const relay = mod('relay', -6.2, 4.8, 2.4);
  mesh(relay, BOX(1.9, 1.5, 1.5), M('#3d7be0', { roughness: .3 }), -6.7, 1.21, 8.75);
  mesh(relay, BOX(.95, .85, 1.7), M('#1fa392'), -4.5, .88, 8.6);
  for (const z of [8.1, 8.6, 9.1]) mesh(relay, new THREE.CylinderGeometry(.16, .16, .05, 12), metal, -4.5, 1.33, z);
  const ledMat = M('#ef4444', { emissive: '#ef4444', emissiveIntensity: 1.3 });
  mesh(relay, new THREE.SphereGeometry(.13, 12, 8), ledMat, -8.1, .54, 9.45);

  const ds = mod('ds', -1.4);
  mesh(ds, new THREE.CylinderGeometry(.28, .28, .6, 20), M('#111827', { roughness: .35 }), -1.4, 1.0, 8.9);
  for (const i of [-.12, 0, .12]) mesh(ds, BOX(.04, .26, .04), metal, -1.4 + i, .58, 8.9);

  const buz = mod('buz', 1.8);
  mesh(buz, new THREE.CylinderGeometry(.62, .62, .55, 28), M('#151b2b', { roughness: .4 }), 1.8, .74, 8.85);
  mesh(buz, new THREE.CylinderGeometry(.12, .12, .02, 12), M('#000000'), 1.8, 1.02, 8.85);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.8, .045, 8, 48), new THREE.MeshBasicMaterial({ color: '#F3B64A', transparent: true, opacity: 0 }));
  ring.position.set(1.8, 1.15, 8.85); ring.rotation.x = Math.PI / 2; buz.add(ring);

  const rgb = mod('rgb', 4.8);
  mesh(rgb, new THREE.CylinderGeometry(.45, .45, .2, 24), M('#f1f4fa'), 4.8, .56, 8.85);
  const rgbMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#22c55e', emissiveIntensity: 1.7, roughness: .2, transparent: true, opacity: .93 });
  mesh(rgb, new THREE.SphereGeometry(.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), rgbMat, 4.8, .66, 8.85).castShadow = false;
  const glow = new THREE.PointLight('#22c55e', 5, 5, 1.6); glow.position.set(4.8, 1.5, 8.85); rgb.add(glow);

  const btn = mod('button', 7.8);
  mesh(btn, BOX(.9, .32, .9), M('#2d3648'), 7.8, .62, 8.85);
  mesh(btn, new THREE.CylinderGeometry(.3, .3, .22, 20), M('#F3B64A'), 7.8, .89, 8.85);

  // 점퍼선: 가로·세로로만 꺾고 모서리는 둥글게
  const wires = new THREE.Group(); S.add(wires);
  function wire(c, P, g = wires, rad = .068, corner = .32) {
    const v = P.map(p => new THREE.Vector3(...p)), path = new THREE.CurvePath();
    let a0 = v[0];
    for (let i = 1; i < v.length - 1; i++) {
      const din = v[i].clone().sub(v[i - 1]), dout = v[i + 1].clone().sub(v[i]);
      const r = Math.min(corner, din.length() / 2, dout.length() / 2);
      const p1 = v[i].clone().sub(din.normalize().multiplyScalar(r)), p2 = v[i].clone().add(dout.normalize().multiplyScalar(r));
      path.add(new THREE.LineCurve3(a0, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, v[i], p2)); a0 = p2;
    }
    path.add(new THREE.LineCurve3(a0, v[v.length - 1]));
    const m = new THREE.Mesh(new THREE.TubeGeometry(path, 20 * v.length, rad, 6, false), M(c, { roughness: .4 }));
    m.castShadow = true; g.add(m);
  }
  const W = { red: '#e5484d', blk: '#2a3142', org: '#f59e0b', blu: '#3b6fe0', grn: '#16a34a', tea: '#14b8a6', wht: '#e9edf5', vio: '#7c6cf0', yel: '#eab308' };
  const L5 = 5.49, LG = 5.12, R3 = -5.48, RG = -5.12, EZ = 1.82, top = .92;
  const down = (x, z1, z2, h, c) => wire(c, [[x, top, z1], [x, h, z1], [x, h, z2], [x, top, z2]]);
  down(hx(33), EZ, L5, 1.25, W.red); down(hx(35), EZ, LG, 1.25, W.blk);      // ESP 5V·GND → 아래 레일
  down(hx(33), -EZ, R3, 1.25, W.org); down(hx(35), -EZ, RG, 1.25, W.blk);    // ESP 3V3·GND → 위 레일
  const pinZ = z => PZ - z / 2 + .16, PY = .86;
  const fromMod = (x, d, zLane, h, tx, tz, c) => wire(c, [[x, PY, pinZ(d)], [x, h, pinZ(d)], [x, h, zLane], [tx, h, zLane], [tx, h, tz], [tx, top, tz]]);
  const toRail = (x, d, rz, h, c) => wire(c, [[x, PY, pinZ(d)], [x, h, pinZ(d)], [x, h, rz], [x, top, rz]]);
  // 릴레이: VCC·GND는 레일, IN은 ESP 핀
  toRail(-6.6, 2.4, L5, 1.15, W.red); toRail(-6.2, 2.4, LG, 1.15, W.blk);
  fromMod(-5.8, 2.4, 4.45, 1.78, hx(48), EZ, W.blu);
  // DS18B20: GND, 3V3, DATA
  toRail(-1.8, 1.8, LG, 1.15, W.blk);
  fromMod(-1.4, 1.8, 4.75, 1.66, hx(51), EZ, W.org);
  fromMod(-1.0, 1.8, 4.6, 1.72, hx(46), EZ, W.grn);
  // 부저: GND, 신호
  toRail(1.4, 1.8, LG, 1.15, W.blk); fromMod(1.8, 1.8, 4.3, 1.6, hx(44), EZ, W.yel);
  // RGB LED: R·G·B → 330Ω (앞쪽 끝)
  [[4.4, W.red, 5.6, 1.5], [4.8, W.grn, 6.2, 1.44], [5.2, W.blu, 6.8, 1.38]].forEach(([x, c, rx, h]) => wire(c, [[x, PY, pinZ(1.8)], [x, h, pinZ(1.8)], [x, h, 4.0], [rx, h, 4.0], [rx, h, 3.75], [rx, top, 3.75]]));
  // 버튼: 신호, GND
  fromMod(7.6, 1.8, 4.15, 1.54, hx(40), EZ, W.vio); toRail(8.0, 1.8, LG, 1.15, W.blk);
  // TFT SPI 묶음 → 위 보드 ESP 열
  [W.org, W.blk, W.vio, W.grn, W.tea, W.yel, W.blu, W.wht].forEach((c, i) => {
    const sx = -4.25 + i * .42, h = 1.55 + i * .05, lane = -6.4 - i * .16, tx = hx(36 + i * 2);
    wire(c, [[sx, .62, -10.15], [sx, h, -10.15], [sx, h, lane], [tx, h, lane], [tx, h, -EZ], [tx, top, -EZ]]);
  });

  // 저항·콘덴서 (아래 보드)
  const res = part('res');
  const resistor = (x, z1, z2, bands) => {
    const zc = (z1 + z2) / 2, len = Math.abs(z2 - z1);
    wire('#9aa3b2', [[x, top, z1], [x, 1.22, z1], [x, 1.22, z2], [x, top, z2]], res, .028, .12);
    mesh(res, new THREE.CapsuleGeometry(.16, len * .42, 4, 12), M('#e8d3a4'), x, 1.22, zc, Math.PI / 2);
    bands.forEach((b, k) => mesh(res, new THREE.CylinderGeometry(.168, .168, .07, 16), M(b), x, 1.22, zc - len * .16 + k * len * .12, Math.PI / 2));
  };
  const B330 = ['#f59e0b', '#f59e0b', '#7c4a1e'], B10k = ['#7c4a1e', '#151515', '#f59e0b'], B220 = ['#dc2626', '#dc2626', '#7c4a1e'];
  [5.6, 6.2, 6.8].forEach(x => resistor(x, 2.18, 3.75, B330));
  [-1.6, -.9].forEach(x => resistor(x, 2.18, 3.75, B10k));
  [-3.3, -2.7].forEach(x => resistor(x, 2.18, 3.75, B220));
  [-4.6, -4.0].forEach(x => { mesh(res, new THREE.CylinderGeometry(.28, .28, .12, 18), M('#e2b13c'), x, 1.42, 2.9, Math.PI / 2); wire('#9aa3b2', [[x - .1, top, 2.55], [x - .1, 1.25, 2.55], [x - .1, 1.25, 2.9]], res, .022, .08); });

  // 크기·화면 맞춤
  let VIEW = 12;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); const a = w / h; VIEW = Math.max(10.5, 15.5 / a);
    Object.assign(cam, { left: -VIEW * a, right: VIEW * a, top: VIEW, bottom: -VIEW }); cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  // 상호작용: 올려 보기·누르기
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), tip = $('tip3d');
  const pick = e => {
    const r = R.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, cam);
    for (const hit of ray.intersectObjects(Object.values(G), true)) { let o = hit.object; while (o && !o.userData.part) o = o.parent; if (o) return o.userData.part; }
    return null;
  };
  let down0 = null;
  R.domElement.addEventListener('pointerdown', e => { down0 = [e.clientX, e.clientY]; });
  R.domElement.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const k = pick(e), p = P3.find(x => x[0] === k);
    R.domElement.style.cursor = k ? 'pointer' : 'grab';
    if (p) { const r = host.getBoundingClientRect(); tip.hidden = false; tip.textContent = p[1]; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; } else tip.hidden = true;
  });
  R.domElement.addEventListener('pointerleave', () => { tip.hidden = true; });
  R.domElement.addEventListener('click', e => { if (down0 && Math.hypot(e.clientX - down0[0], e.clientY - down0[1]) > 6) return; const k = pick(e); if (k) choose(k); });

  // 조작 버튼
  const vRot = $('vRot');
  $('vIso').onclick = () => { cam.position.copy(HOME); cam.zoom = 1; cam.updateProjectionMatrix(); ctl.target.copy(TARGET); ctl.update(); };
  vRot.onclick = () => { ctl.autoRotate = !ctl.autoRotate; vRot.setAttribute('aria-pressed', String(ctl.autoRotate)); };
  const zoom = f => { cam.zoom = Math.min(2.6, Math.max(.8, cam.zoom * f)); cam.updateProjectionMatrix(); };
  $('vIn').onclick = () => zoom(1.2); $('vOut').onclick = () => zoom(1 / 1.2);
  if (matchMedia('(pointer: coarse)').matches) {   // 휴대폰: 페이지 스크롤을 막지 않도록, 눌러야 3D 조작
    const vt = $('vTouch'); vt.hidden = false; ctl.enabled = false; R.domElement.style.touchAction = 'pan-y';
    vt.onclick = () => { ctl.enabled = !ctl.enabled; R.domElement.style.touchAction = ctl.enabled ? 'none' : 'pan-y'; vt.textContent = ctl.enabled ? '3D 조작 끝내기' : '터치해서 3D 조작'; vt.classList.toggle('on', ctl.enabled); };
  }

  // 판정 단계 → LED·릴레이·부저·화면
  onLevel = () => {
    const l = LV[level];
    rgbMat.emissive.set(l.c); glow.color.set(l.c);
    const on = l.n !== 'TRIP'; ledMat.emissiveIntensity = on ? 1.3 : 0; ledMat.color.set(on ? '#ef4444' : '#4a2a2a');
    drawTFT();
  };
  onTick = drawTFT; onLevel();

  // 그리기 (화면에 보일 때만)
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);
  const clock = new THREE.Clock(), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    for (const k in G) { const g = G[k], y = sel === k ? .55 : 0; g.position.y += (y - g.position.y) * .15; }
    const alarm = level === 2 || level === 3;
    if (alarm && !reduce) { const f = (t * (level === 3 ? 1.6 : 1.1)) % 1; ring.scale.setScalar(1 + f * 1.6); ring.material.opacity = .85 * (1 - f); } else ring.material.opacity = 0;
    glow.intensity = 4 + (alarm && !reduce ? Math.sin(t * 9) * 1.5 : 0);
    ctl.update(); R.render(S, cam);
  });
}
