/* ── 모든 페이지 공통: 휴대폰 메뉴, 키보드로 페이지 넘기기, 출처 강조 ── */
{
const mbtn = document.getElementById('mbtn'), nav = document.getElementById('mainNav');
mbtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); mbtn.setAttribute('aria-expanded', String(o)); mbtn.setAttribute('aria-label', o ? '메뉴 닫기' : '메뉴 열기'); });
nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); mbtn.setAttribute('aria-expanded', 'false'); } });

// ← → 키로 이전·다음 페이지 (입력칸이나 애니메이션·3D 조작 중에는 쓰지 않음)
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest('input, textarea, select, #journey, .stage3, dialog')) return;
  const rel = e.key === 'ArrowRight' ? 'next' : e.key === 'ArrowLeft' ? 'prev' : null;
  const a = rel && document.querySelector(`.pager a[rel="${rel}"]`);
  if (a) { e.preventDefault(); location.href = a.href; }
});

// 참고자료 페이지: 주소의 #ref-N 항목 강조
const hl = () => { const m = location.hash.match(/^#ref-(\d+)$/), li = m && document.getElementById(`ref-${m[1]}`); if (li) { li.classList.add('hl'); setTimeout(() => li.classList.remove('hl'), 2400); } };
addEventListener('hashchange', hl); hl();
}
