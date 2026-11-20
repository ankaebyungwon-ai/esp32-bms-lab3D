
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KCOL = { '논문': '#2D6A4F', '정부·국회': '#1F7A8C', '국제 기준': '#8A6A00', 'EU 법령': '#2B4C7E', '기업': '#6B5B3E', '언론': '#7A4E63', '해설': '#55665C' };
const refUrl = r => r.doi ? `https://doi.org/${r.doi}` : r.url;
const refHtml = (r, pre = 'ref') => `<li id="${pre}-${r.id}"><span class="rk" style="--k:${KCOL[r.k]}">${r.k}</span><span class="rn">[${r.id}]</span> <span class="ra">${r.a}${r.y !== '—' ? ` (${r.y})` : ''}.</span> <a href="${refUrl(r)}" rel="noopener">${r.ti}</a>. <span class="rv">${r.v}.</span>${r.doi ? ` <span class="rid">DOI ${r.doi}</span>` : ''}${r.pmid ? ` <a class="rid" href="https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/" rel="noopener">PMID ${r.pmid}</a>` : ''}</li>`;
const rbtn = ids => ids.map(i => `<a class="rb" href="#ref-${i}" data-r="${i}" aria-label="참고자료 ${i}번">${i}</a>`).join('');

/* ── 메뉴 (휴대폰) ── */
const mbtn = $('mbtn'), nav = $('mainNav');
mbtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); mbtn.setAttribute('aria-expanded', String(o)); });
nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); mbtn.setAttribute('aria-expanded', 'false'); } });

/* ── 순환 여정: 카메라 ── */
const svg = $('pano');
buildPano(svg);
const back = $('pBack');
const center = i => i * PANO.SW + 700;
let idx = 0, camX = center(0), from = camX, to = camX, t0 = 0, dur = 1600, moving = false, dwellAt = performance.now(), playing = !reduce, visible = true;
const DWELL = 5200;
function setCam(x) {
  camX = x;
  // 땅 높이에 맞춰 확대 (하늘은 조금만), 넓은 화면에선 캡션 카드 반대편으로 초점을 옮긴다
  const r = svg.getBoundingClientRect(), wide = r.width > 760, vh = wide ? 650 : 600, y0 = wide ? 160 : 200, w = vh * (r.width / Math.max(1, r.height));
  const off = wide ? Math.min(.62, .5 + 240 / Math.max(1, r.width)) : .5;
  svg.setAttribute('viewBox', `${(x - w * off).toFixed(1)} ${y0} ${w.toFixed(1)} ${vh}`);
  back.setAttribute('transform', `translate(${(x * .45).toFixed(1)},0)`);
}
const cap = $('cap'), tline = $('tline');
tline.innerHTML = PHASES.map(([n, c], p) => `<div class="tgrp" style="--c:${c}"><h3><i></i>${n}</h3><ol>${STOPS.map((s, i) => s.ph === p ? `<li><button type="button" class="chip" data-i="${i}" style="--c:${c}"><span>${String(i + 1).padStart(2, '0')}</span>${s.t}<i class="pg"></i></button></li>` : '').join('')}</ol></div>`).join('');
function showCap() {
  const s = STOPS[idx], [pn, pc] = PHASES[s.ph];
  cap.innerHTML = `<div class="swap"><div class="ph" style="--c:${pc}"><i></i><b>${pn}</b> · <span class="o">${String(idx + 1).padStart(2, '0')} / ${STOPS.length}</span></div><h2>${s.t}</h2><p>${s.d}</p><ul>${s.ex.map(([t, r]) => `<li><b>실제 사례</b>${t}${rbtn(r)}</li>`).join('')}</ul></div>`;
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
cap.addEventListener('click', e => { if (e.target.closest('.rb')) setPlay(false); });
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
  } else if (!playing || !visible) dwellAt = t - Math.min(t - dwellAt, DWELL * .98);
  requestAnimationFrame(frame);
}
setCam(camX); showCap(); setPlay(playing); requestAnimationFrame(frame);

/* ── 숫자 카드 ── */
const IMPACT = [
  ['10.7만 개', '2030년 국내 사용후 배터리 배출 전망', '2023년 2,355개에서 · 정부 추정', [15]],
  ['2027.5.27', '사용후배터리법 시행', '성능평가 · 안전검사 · 거래 · 이력', [12, 15]],
  ['리튬 50%', 'EU 폐배터리 리튬 회수 목표 (2027년 말)', '2031년 말 80%', [20, 21]],
  ['95%+', 'Umicore 니켈·구리·코발트 회수 수율', '기업 발표', [32]],
];
$('impact').innerHTML = IMPACT.map(([b, p, s, r]) => `<div class="metric"><b>${b}</b><p>${p}</p><small>${s} ${rbtn(r)}</small></div>`).join('');

/* ── 재활용 방식 ── */
const METHODS = [
  { c: '#2D6A4F', t: '전처리 + 습식제련', f: ['방전·해체', '파쇄·선별', '블랙매스', '침출', '용매추출', '결정화'], d: '배터리를 부숴 금속이 몰린 검은 가루를 만든 뒤, 산에 녹여 금속을 하나씩 분리합니다. 리튬까지 화합물로 되찾아요.', who: '성일하이텍 · Li-Cycle · Redwood Materials', r: [33, 34, 28, 27] },
  { c: '#C99700', t: '건식(제련) + 습식', f: ['고온 제련', '니켈·코발트·구리 합금', '습식 정제', '배터리급 소재'], d: '높은 온도로 녹여 불순물을 먼저 걸러 내고 합금을 만든 뒤, 습식으로 정제합니다. 배터리 안의 에너지를 제련에 쓴다고 밝혀요.', who: 'Umicore', r: [31, 32] },
  { c: '#2A9D8F', t: '전구체 · 양극재 직행', f: ['블랙매스', '불순물 제거', '전구체 합성', '양극재'], d: '금속을 하나씩 떼어 내 팔지 않고, 용액에서 바로 전구체를 만들거나 양극재를 그대로 되살립니다. 단계가 줄어요.', who: 'Ascend Elements · 직접 재활용(에이비알 등)', r: [35, 1, 23] },
];
$('methodList').innerHTML = METHODS.map(m => `<article class="mcard" style="--c:${m.c}"><h3>${m.t}</h3><div class="flowc">${m.f.map(x => `<span>${x}</span>`).join('<i>→</i>')}</div><p>${m.d} ${rbtn(m.r)}</p><p class="who">대표 사례 <b>${m.who}</b></p></article>`).join('');

/* ── 기업 ── */
$('compList').innerHTML = COMPANIES.map(c => `<article class="comp"><div class="top"><h3>${c.n}</h3><span class="ct">${c.c}</span></div><span class="md">${c.m}</span><ul>${c.f.map(([t, r]) => `<li>${t}${rbtn(r)}</li>`).join('')}</ul>${c.url ? `<a class="lk" href="${c.url}" rel="noopener">공식 사이트 ↗</a>` : ''}</article>`).join('');

/* ── 20개 주제 + 상세 ── */
const LEAF = '<svg class="leafi" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15C3 6 10 3 17 3c0 8-4 14-12 14" fill="#95D5B2"/><path d="M3 17c4-5 7-8 11-11" stroke="#2D6A4F" stroke-width="1.5" fill="none"/></svg>';
const gOf = k => GROUPS.find(g => g.k === k), tOf = slug => TOPICS.find(t => t[2] === slug);
$('groups').innerHTML = GROUPS.map(g => `<div class="group" id="g-${g.k}" style="--c:${g.col}"><div class="ghead"><h3><i></i>${g.name}</h3><span>${g.q} · ${TOPICS.filter(t => t[4] === g.k).length}개</span></div><div class="cards">${TOPICS.filter(t => t[4] === g.k).map(t => `<a class="card" href="#t-${t[2]}" style="--c:${g.col}"><span class="n">${t[0]}${t[5].isNew ? ' <span class="newb">NEW</span>' : ''}${LEAF}</span><h4>${t[1]}</h4><p>${t[3]}</p></a>`).join('')}</div></div>`).join('');
const ORDER = TOPICS.map(t => t[2]);
const citeIds = d => [...new Set([...d.pts.flatMap(p => p[1]), ...(d.tl || []).map(x => x[2])])].sort((a, b) => a - b);
const dlg = $('tdlg'), dBody = $('tdBody');
const sup = a => a.map(i => `<button type="button" class="rb" data-dr="${i}" aria-label="참고자료 ${i}번 보기">${i}</button>`).join('');
function renderT(slug) {
  const t = tOf(slug), g = gOf(t[4]), d = t[5], i = ORDER.indexOf(slug), pv = ORDER[i - 1], nx = ORDER[i + 1], ids = citeIds(d);
  return `<div class="dhead" style="--c:${g.col}"><div><div class="dmeta">${t[0]}${d.isNew ? ' <span class="newb">NEW</span>' : ''} · ${g.name}</div><h2 id="tdT">${t[1]}</h2><div class="one">${t[3]}</div></div><button type="button" class="xbtn" data-close aria-label="닫기">×</button></div>`
    + `<p class="dsum">${d.sum}</p>`
    + (d.tl ? `<ol class="tl">${d.tl.map(x => `<li><b>${x[0]}</b>${x[1]}${sup([x[2]])}</li>`).join('')}</ol>` : '')
    + `<h3 class="dh">핵심 정리</h3><ol class="pts">${d.pts.map(p => `<li>${p[0]}${sup(p[1])}</li>`).join('')}</ol>`
    + (ids.length ? `<h3 class="dh">이 주제의 참고자료</h3><ul class="refs drefs">${ids.map(id => refHtml(REFS.find(r => r.id === id), 'dref')).join('')}</ul>` : '')
    + `<div class="dnav">${pv ? `<a class="btn line" href="#t-${pv}">← ${tOf(pv)[0]} ${tOf(pv)[1]}</a>` : '<span></span>'}${nx ? `<a class="btn line" href="#t-${nx}">${tOf(nx)[0]} ${tOf(nx)[1]} →</a>` : '<a class="btn line" href="#refs">참고자료 전체 →</a>'}</div>`;
}
function route() {
  const m = location.hash.match(/^#t-([\w-]+)$/);
  if (m && tOf(m[1])) { dBody.innerHTML = renderT(m[1]); if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0; dBody.querySelector('.xbtn').focus(); }
  else if (dlg.open) dlg.close();
}
addEventListener('hashchange', route); route();
dlg.addEventListener('close', () => { if (location.hash.startsWith('#t-')) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = 'topics'; } } });
dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
  const b = e.target.closest('[data-dr]'); if (!b) return;
  const li = dBody.querySelector(`#dref-${b.dataset.dr}`); if (!li) return;
  li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); li.classList.add('hl'); setTimeout(() => li.classList.remove('hl'), 1600);
});

/* ── 참고자료 ── */
const KINDS = ['전체', '논문', '정부·국회', '국제 기준', 'EU 법령', '기업', '언론·해설'];
const inKind = (r, k) => k === '전체' || r.k === k || (k === '언론·해설' && (r.k === '언론' || r.k === '해설'));
const rf = $('rfilter'), rl = $('refList');
let rkind = '전체';
rf.innerHTML = KINDS.map(k => `<button type="button" data-k="${k}">${k}<span>${REFS.filter(r => inKind(r, k)).length}</span></button>`).join('');
const drawRefs = () => { rl.innerHTML = REFS.filter(r => inKind(r, rkind)).map(r => refHtml(r)).join(''); rf.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === rkind))); };
rf.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { rkind = b.dataset.k; drawRefs(); } });
drawRefs();
document.addEventListener('click', e => {   // 본문 속 출처 번호 → 참고자료 목록에서 강조
  const a = e.target.closest('a.rb'); if (!a) return;
  if (rkind !== '전체') { rkind = '전체'; drawRefs(); }
  setTimeout(() => { const li = $(`ref-${a.dataset.r}`); if (li) { li.classList.add('hl'); setTimeout(() => li.classList.remove('hl'), 2000); } }, 60);
});
