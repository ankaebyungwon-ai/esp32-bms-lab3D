/* ── 홈: 순환 여정 카메라 · 캡션 · 숫자 카드 ── */
{
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rbtn = ids => ids.map(i => `<a class="rb" href="references.html#ref-${i}" aria-label="참고자료 ${i}번">${i}</a>`).join('');
const svg = $('pano');
buildPano(svg);
const back = $('pBack');
const center = i => i * PANO.SW + 700;
let idx = 0, camX = center(0), from = camX, to = camX, t0 = 0, dur = 1600, moving = false, dwellAt = performance.now(), playing = !reduce, visible = true;
const DWELL = 5200;
function setCam(x) {
  camX = x;
  // 땅 높이에 맞춰 확대하고, 넓은 화면에선 캡션 카드 반대편으로 초점을 옮긴다
  const r = svg.getBoundingClientRect(), wide = r.width > 760, vh = wide ? 650 : 600, y0 = wide ? 160 : 200, w = vh * (r.width / Math.max(1, r.height));
  const off = wide ? Math.min(.62, .5 + 240 / Math.max(1, r.width)) : .5;
  svg.setAttribute('viewBox', `${(x - w * off).toFixed(1)} ${y0} ${w.toFixed(1)} ${vh}`);
  back.setAttribute('transform', `translate(${(x * .45).toFixed(1)},0)`);
}
const cap = $('cap'), tline = $('tline');
tline.innerHTML = PHASES.map(([n, c], p) => `<div class="tgrp" style="--c:${c}"><h3><i></i>${n}</h3><ol>${STOPS.map((s, i) => s.ph === p ? `<li><button type="button" class="chip" data-i="${i}" style="--c:${c}"><span>${String(i + 1).padStart(2, '0')}</span>${s.t}<i class="pg"></i></button></li>` : '').join('')}</ol></div>`).join('');
function showCap() {
  const s = STOPS[idx], [pn, pc] = PHASES[s.ph];
  cap.innerHTML = `<div class="swap"><div class="ph" style="--c:${pc}"><i></i><b>${pn}</b> · <span class="o">${String(idx + 1).padStart(2, '0')} / ${STOPS.length}</span></div><h2>${s.t}</h2><p>${s.d}</p><ul>${s.ex.map(([t, r]) => `<li><b>실제 사례</b>${t}${rbtn(r)}</li>`).join('')}</ul><a class="more" href="process.html#s-${idx + 1}">이 단계 자세히 →</a></div>`;
  tline.querySelectorAll('.chip').forEach(b => { const on = +b.dataset.i === idx; on ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'); b.querySelector('.pg').style.width = '0'; });
}
function go(i, snapFrom) {
  if (snapFrom !== undefined) setCam(center(snapFrom));
  idx = i; from = camX; to = center(i);
  dur = Math.min(2600, 1300 + Math.abs(to - from) * .12);
  if (reduce) { setCam(to); moving = false; dwellAt = performance.now(); } else { t0 = performance.now(); moving = true; }
  showCap();
}
const next = () => idx === STOPS.length - 1 ? go(2, 1) : go(idx + 1);
const prev = () => go(idx === 0 ? STOPS.length - 1 : idx - 1);
function setPlay(p) {
  playing = p; dwellAt = performance.now();
  $('sPlay').setAttribute('aria-label', p ? '일시정지' : '재생');
  $('sPlayI').innerHTML = p ? '<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/>' : '<path d="M8 5l11 7-11 7z" fill="currentColor"/>';
}
$('sPlay').onclick = () => setPlay(!playing);
$('sNext').onclick = () => { next(); dwellAt = performance.now(); };
$('sPrev').onclick = () => { prev(); dwellAt = performance.now(); };
tline.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { go(+b.dataset.i); dwellAt = performance.now(); } });
$('journey').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { next(); e.preventDefault(); } if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); } });
document.querySelectorAll('a[href="#journey"]').forEach(a => a.addEventListener('click', () => { go(0); setPlay(!reduce); }));
cap.addEventListener('click', e => { if (e.target.closest('a')) setPlay(false); });
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe($('journey'));
new ResizeObserver(() => setCam(camX)).observe(svg);
function frame(t) {
  if (moving) {
    const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    setCam(from + (to - from) * e);
    if (k >= 1) { moving = false; dwellAt = t; }
  } else if (playing && visible && document.visibilityState === 'visible') {
    const p = (t - dwellAt) / DWELL;
    const pg = tline.querySelector('.chip[aria-current] .pg'); if (pg) pg.style.width = Math.min(100, p * 100).toFixed(1) + '%';
    if (p >= 1) next();
  } else dwellAt = t - Math.min(t - dwellAt, DWELL * .98);
  requestAnimationFrame(frame);
}
// 공정 페이지에서 '애니메이션으로 보기'로 들어오면 해당 단계부터 (#s-3 → 3단계)
const m = location.hash.match(/^#s-(\d+)$/);
if (m && +m[1] >= 1 && +m[1] <= STOPS.length) { idx = +m[1] - 1; camX = center(idx); }
setCam(camX); showCap(); setPlay(playing); requestAnimationFrame(frame);

$('impact').innerHTML = IMPACT.map(([b, p, s, r]) => `<div class="metric"><b>${b}</b><p>${p}</p><small>${s} ${rbtn(r)}</small></div>`).join('');
}
