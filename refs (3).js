/* ── 참고자료 페이지: 종류별 거르기 (목록은 HTML에 이미 있음) ── */
{
const rf = document.getElementById('rfilter'), items = [...document.querySelectorAll('#refList > li')];
const KINDS = ['전체', '논문', '정부·국회', '국제 기준', 'EU 법령', '기업', '언론·해설'];
const inKind = (k, kind) => kind === '전체' || k === kind || (kind === '언론·해설' && (k === '언론' || k === '해설'));
rf.innerHTML = KINDS.map(k => `<button type="button" data-k="${k}">${k}<span>${items.filter(li => inKind(li.dataset.k, k)).length}</span></button>`).join('');
const draw = kind => { items.forEach(li => { li.hidden = !inKind(li.dataset.k, kind); }); rf.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === kind))); };
rf.addEventListener('click', e => { const b = e.target.closest('button'); if (b) draw(b.dataset.k); });
addEventListener('hashchange', () => draw('전체'));
draw('전체');
}
