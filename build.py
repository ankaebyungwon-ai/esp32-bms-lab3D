"""RE:CELL 여러 페이지 사이트 생성기 — data.js(단일 데이터)에서 모든 페이지를 만든다.
사용: python3 build.py <출력 폴더>"""
import json, subprocess, sys, os, shutil, html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out')
SP = HERE
rd = lambda p: open(p, encoding='utf-8').read()

D = json.loads(subprocess.run(['node', '-e', rd(os.path.join(HERE, 'data.js')) + ';console.log(JSON.stringify({REFS,STOPS,PHASES,COMPANIES,GROUPS,TOPICS,IMPACT,METHODS}))'], capture_output=True, text=True, check=True).stdout)
REFS = {r['id']: r for r in D['REFS']}
TOP = D['TOPICS']; GRP = {g['k']: g for g in D['GROUPS']}
KCOL = {'논문': '#2D6A4F', '정부·국회': '#1F7A8C', '국제 기준': '#8A6A00', 'EU 법령': '#2B4C7E', '기업': '#6B5B3E', '언론': '#7A4E63', '해설': '#55665C'}

PAGES = [  # 넘기는 순서
    ('index', '홈', 'index.html'), ('process', '순환 공정', 'process.html'), ('companies', '기업 사례', 'companies.html'),
    ('topics', '20개 주제', 'topics.html'), ('lab', 'BMS 3D 회로', 'lab.html'), ('references', '참고자료', 'references.html'), ('about', '소개', 'about.html')]
NAV = [p for p in PAGES if p[0] != 'index']

LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="8" width="20" height="28" rx="5" fill="{a}"/><rect x="15" y="4" width="8" height="5" rx="2" fill="{a}"/><rect x="13" y="24" width="12" height="8" rx="2" fill="{b}"/><path d="M27 20c7-9 13-6 13-6s-1 9-11 10c-1 0-2-1-2-4z" fill="#FFD60A"/></svg>'
LEAF = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15C3 6 10 3 17 3c0 8-4 14-12 14" fill="#95D5B2"/><path d="M3 17c4-5 7-8 11-11" stroke="#2D6A4F" stroke-width="1.6" fill="none"/></svg>'


def rb(ids, root):
    return ''.join(f'<a class="rb" href="{root}references.html#ref-{i}" aria-label="참고자료 {i}번">{i}</a>' for i in ids)


def ref_li(r, root='', pre='ref', with_k=True):
    url = f"https://doi.org/{r['doi']}" if r.get('doi') else r['url']
    y = '' if r['y'] == '—' else f" ({r['y']})"
    s = f'<li id="{pre}-{r["id"]}" data-k="{r["k"]}"><span class="rk" style="--k:{KCOL[r["k"]]}">{r["k"]}</span><span class="rn">[{r["id"]}]</span> <span class="ra">{r["a"]}{y}.</span> <a href="{url}" rel="noopener">{html.escape(r["ti"])}</a>. <span class="rv">{r["v"]}.</span>'
    if r.get('doi'): s += f' <span class="rid">DOI {r["doi"]}</span>'
    if r.get('pmid'): s += f' <a class="rid" href="https://pubmed.ncbi.nlm.nih.gov/{r["pmid"]}/" rel="noopener">PMID {r["pmid"]}</a>'
    return s + '</li>'


def pager(prev, nxt):
    def a(p, rel, lab):
        if not p: return '<span></span>'
        return f'<a rel="{rel}" class="{rel}" href="{p[1]}"><small>{lab}</small><b>{p[0]}</b></a>'
    return f'<nav class="pager wrap" aria-label="페이지 넘기기">{a(prev, "prev", "← 이전")}{a(nxt, "next", "다음 →")}</nav>'


def page(key, title, desc, body, root='', scripts='', pg=None, crumbs=None):
    nav = ''.join(f'<a href="{root}{f}"{" aria-current=\"page\"" if (k == key or (key == "topic" and k == "topics")) else ""}>{n}</a>' for k, n, f in NAV)
    if pg is None:
        i = [p[0] for p in PAGES].index(key)
        pv = (PAGES[i - 1][1], root + PAGES[i - 1][2]) if i > 0 else None
        nx = (PAGES[i + 1][1], root + PAGES[i + 1][2]) if i + 1 < len(PAGES) else (PAGES[0][1], root + PAGES[0][2])
        pg = (pv, nx)
    cr = ''
    if crumbs:
        cr = '<nav class="crumbs wrap" aria-label="현재 위치"><ol>' + ''.join(f'<li><a href="{h}">{t}</a></li>' if h else f'<li aria-current="page">{t}</li>' for t, h in crumbs) + '</ol></nav>'
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{desc}">
<meta name="theme-color" content="#2D6A4F">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/site.css">
</head>
<body data-page="{key}">
<a class="skip" href="#main">본문 바로가기</a>
<header>
  <div class="wrap hd">
    <a class="logo" href="{root}index.html" aria-label="RE:CELL 홈">{LOGO.format(a="#2D6A4F", b="#95D5B2")}<span><b>RE:CELL</b><small>BATTERY AFTERLIFE</small></span></a>
    <nav class="main" id="mainNav" aria-label="주 메뉴">{nav}</nav>
    <a class="btn sun" href="{root}index.html#journey">순환 여정 ▶</a>
    <button class="mbtn" id="mbtn" type="button" aria-expanded="false" aria-controls="mainNav" aria-label="메뉴 열기"><i></i><i></i><i></i></button>
  </div>
</header>
{cr}
<main id="main">
{body}
</main>
{pager(*pg)}
<footer>
  <div class="wrap fgrid">
    <div>
      <a class="logo" href="{root}index.html" aria-label="RE:CELL 홈">{LOGO.format(a="#95D5B2", b="#2D6A4F")}<span><b>RE:CELL</b><small>BATTERY AFTERLIFE</small></span></a>
      <h4 style="margin-top:18px">학생 연구 · 비영리 교육 목적</h4>
      <p>폐배터리 활용방안 조사 과제를 웹으로 정리한 사이트입니다. 언급된 기업과 관련이 없으며, 기업명은 사실 설명을 위해서만 썼고 로고는 쓰지 않았습니다. 모든 그림과 애니메이션은 직접 그렸습니다.</p>
    </div>
    <div class="fcol"><h4>둘러보기</h4><a href="{root}index.html">홈 · 순환 여정</a><a href="{root}process.html">순환 공정</a><a href="{root}companies.html">기업 사례</a><a href="{root}topics.html">20개 주제</a></div>
    <div class="fcol"><h4>더 보기</h4><a href="{root}lab.html">BMS 3D 회로</a><a href="{root}references.html">참고자료</a><a href="{root}about.html">사이트 소개</a></div>
  </div>
  <div class="wrap fbot">© 2026 RE:CELL · Battery Recycling Research Project</div>
</footer>
<script src="{root}assets/common.js"></script>
{scripts}
</body>
</html>
'''


def phead(kick, h1, lead):
    return f'<section class="phero"><div class="wrap"><div class="kick">{LEAF}{kick}</div><h1>{h1}</h1><p class="lead">{lead}</p></div></section>'


def build():
    # 지우지 않고 덮어쓴다 (tools/ 같은 다른 파일은 그대로 둠)
    os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True); os.makedirs(os.path.join(OUT, 'topics'), exist_ok=True)
    # 공통 파일
    open(os.path.join(OUT, 'assets/site.css'), 'w', encoding='utf-8').write(rd(os.path.join(SP, 'site_base.css')) + rd(os.path.join(HERE, 'extra.css')))
    for f in ['data.js', 'journey.js', 'common.js', 'refs.js']: shutil.copy(os.path.join(HERE, f), os.path.join(OUT, 'assets', f))
    shutil.copy(os.path.join(SP, 'pano.js'), os.path.join(OUT, 'assets/pano.js'))
    open(os.path.join(OUT, 'assets/lab3d.js'), 'w', encoding='utf-8').write(rd(os.path.join(HERE, 'lab3d.js')))
    W = lambda name, s: open(os.path.join(OUT, name), 'w', encoding='utf-8').write(s)

    # ── 홈 ──
    body = rd(os.path.join(HERE, 'home_body.html'))
    cards = [('process.html', '순환 공정', '11단계를 한 장씩 자세히, 재활용 방식 비교까지'), ('companies.html', '기업 사례', 'Redwood · Li-Cycle · Umicore · 성일하이텍 · Ascend · ABR'),
             ('topics.html', '20개 주제', '처리 경로 · 지원 기술 · 평가 · 설계'), ('lab.html', 'BMS 3D 회로', '우리가 만든 ESP32 배터리 관리 회로'),
             ('references.html', '참고자료', f"논문·정부·국제 기준 {len(REFS)}건"), ('about.html', '사이트 소개', '만든 이유와 출처 원칙')]
    body = body.replace('{{PCARDS}}', ''.join(f'<a class="pcard" href="{h}"><span class="pn o">{i + 1:02d}</span><h3>{t}</h3><p>{d}</p><span class="go">페이지 보기 →</span></a>' for i, (h, t, d) in enumerate(cards)))
    W('index.html', page('index', 'RE:CELL — 배터리 순환 여정', '폐배터리가 만들어지고 다시 원료로 돌아오는 순환 여정 애니메이션', body,
                         scripts='<script src="assets/pano.js"></script>\n<script src="assets/data.js"></script>\n<script src="assets/journey.js"></script>'))

    # ── 순환 공정 ──
    ph = D['PHASES']
    stops = ''
    for i, s in enumerate(D['STOPS']):
        pn, pc = ph[s['ph']]
        ex = ''.join(f'<li><b>실제 사례</b>{t}{rb(r, "")}</li>' for t, r in s['ex'])
        stops += f'<li class="stop" id="s-{i + 1}" style="--c:{pc}"><div class="sn o">{i + 1:02d}</div><div><div class="sph">{pn}</div><h3>{s["t"]}</h3><p>{s["d"]}</p><ul>{ex}</ul><a class="more" href="index.html#s-{i + 1}">애니메이션으로 보기 ▶</a></div></li>'
    meth = ''.join(f'<article class="mcard" style="--c:{m["c"]}"><h3>{m["t"]}</h3><div class="flowc">{"<i>→</i>".join(f"<span>{x}</span>" for x in m["f"])}</div><p>{m["d"]} {rb(m["r"], "")}</p><p class="who">대표 사례 <b>{m["who"]}</b></p></article>' for m in D['METHODS'])
    body = phead('순환 공정', '11단계로 보는 배터리의 일생', '만들기 4단계, 쓰기 3단계, 되살리기 4단계. 각 단계의 실제 사례와 출처를 함께 정리했어요. 단계마다 ‘애니메이션으로 보기’를 누르면 홈의 순환 여정이 그 장면부터 재생됩니다.') \
        + f'<section class="band" style="padding-top:12px"><div class="wrap"><ol class="stops">{stops}</ol></div></section>' \
        + f'<section class="band" id="methods" style="padding-top:0"><div class="wrap"><div class="kick">{LEAF}재활용 방식</div><h2>금속을 되찾는 세 가지 길</h2><p class="lead" style="margin-top:14px">같은 재활용이라도 기업마다 길이 다릅니다. 실제 기업들이 공개한 공정을 세 갈래로 나눠 봤어요.</p><div class="methods">{meth}</div></div></section>'
    W('process.html', page('process', '순환 공정 — RE:CELL', '배터리 제조부터 재활용까지 11단계와 재활용 방식 비교', body, crumbs=[('홈', 'index.html'), ('순환 공정', None)]))

    # ── 기업 사례 ──
    comps = ''.join(f'<article class="comp"><div class="top"><h3>{c["n"]}</h3><span class="ct">{c["c"]}</span></div><span class="md">{c["m"]}</span><ul>{"".join(f"<li>{t}{rb(r, "")}</li>" for t, r in c["f"])}</ul>{f"<a class=\"lk\" href=\"{c["url"]}\" rel=\"noopener\">공식 사이트 ↗</a>" if c["url"] else ""}</article>' for c in D['COMPANIES'])
    body = phead('기업 사례', '실제로 이렇게 되살리고 있어요', '홈 애니메이션의 공정은 이 기업들이 공개한 자료를 바탕으로 그렸습니다. 기업명은 사실 설명을 위해서만 썼고, 이 사이트와 관련이 없습니다. 기업 수치는 각 기업의 발표 기준이에요.') \
        + f'<section class="band" style="padding-top:12px"><div class="wrap"><div class="comps">{comps}</div></div></section>'
    W('companies.html', page('companies', '기업 사례 — RE:CELL', '폐배터리 재활용 기업 6곳의 공정과 사례', body, crumbs=[('홈', 'index.html'), ('기업 사례', None)]))

    # ── 20개 주제 지도 ──
    def tcard(t, root):
        g = GRP[t[4]]; new = ' <span class="newb">NEW</span>' if t[5].get('isNew') else ''
        return f'<a class="card" href="{root}topics/{t[2]}.html" style="--c:{g["col"]}"><span class="n">{t[0]}{new}<svg class="leafi" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15C3 6 10 3 17 3c0 8-4 14-12 14" fill="#95D5B2"/></svg></span><h4>{t[1]}</h4><p>{t[3]}</p></a>'
    groups = ''.join(f'<div class="group" id="g-{g["k"]}" style="--c:{g["col"]}"><div class="ghead"><h3><i></i>{g["name"]}</h3><span>{g["q"]} · {sum(1 for t in TOP if t[4] == g["k"])}개</span></div><div class="cards">{"".join(tcard(t, "") for t in TOP if t[4] == g["k"])}</div></div>' for g in D['GROUPS'])
    body = phead('20개 주제', '폐배터리를 활용하는 스무 갈래의 길', '처리 경로, 지원 기술, 평가, 설계 네 묶음으로 나눴어요. 카드를 누르면 주제 페이지로 넘어가고, 주제 페이지에서는 ← → 키나 아래 버튼으로 다음 주제로 넘길 수 있어요. <span class="newb">NEW</span>는 새로 더한 주제예요.') \
        + f'<section class="band" style="padding-top:12px"><div class="wrap"><div class="groups">{groups}</div></div></section>'
    W('topics.html', page('topics', '20개 주제 — RE:CELL', '폐배터리 활용방안 20개 주제', body, crumbs=[('홈', 'index.html'), ('20개 주제', None)]))

    # ── 주제 상세 20쪽 ──
    for i, t in enumerate(TOP):
        g = GRP[t[4]]; d = t[5]; R = '../'
        ids = sorted(set([x for p in d['pts'] for x in p[1]] + [x[2] for x in d.get('tl', [])]))
        sup = lambda a: ''.join(f'<a class="rb" href="#dref-{x}" aria-label="참고자료 {x}번">{x}</a>' for x in a)
        tl = ('<ol class="tl">' + ''.join(f'<li><b>{x[0]}</b>{x[1]}{sup([x[2]])}</li>' for x in d['tl']) + '</ol>') if d.get('tl') else ''
        pts = '<ol class="pts">' + ''.join(f'<li>{p[0]}{sup(p[1])}</li>' for p in d['pts']) + '</ol>'
        refs = ('<h2 class="dh2">이 주제의 참고자료</h2><ul class="refs drefs">' + ''.join(ref_li(REFS[x], pre='dref') for x in ids) + '</ul>') if ids else ''
        sib = sorted((x for x in TOP if x[4] == t[4] and x[2] != t[2]), key=lambda x: abs(TOP.index(x) - i))[:4]
        rel = ''.join(tcard(x, R) for x in sorted(sib, key=TOP.index))
        new = ' <span class="newb">NEW</span>' if d.get('isNew') else ''
        body = f'''<article class="tpage" style="--c:{g["col"]}">
<section class="phero tphero"><div class="wrap"><div class="tmeta"><span class="tnum o">{t[0]}</span>{new}<a class="tg" href="{R}topics.html#g-{g["k"]}">{g["name"]} · {g["q"]}</a><span class="tcount o">{i + 1} / {len(TOP)}</span></div><h1>{t[1]}</h1><p class="one">{t[3]}</p></div></section>
<section class="band" style="padding-top:8px"><div class="wrap tgrid">
<div class="tbody"><p class="dsum">{d["sum"]}</p>{tl}<h2 class="dh2">핵심 정리</h2>{pts}{refs}</div>
<aside class="tside"><h2 class="dh2">같은 묶음의 주제</h2><div class="cards one">{rel}</div><a class="btn line" href="{R}topics.html">20개 주제 지도 →</a></aside>
</div></section></article>'''
        pv = (f'{TOP[i - 1][0]} {TOP[i - 1][1]}', f'{TOP[i - 1][2]}.html') if i > 0 else ('20개 주제 지도', f'{R}topics.html')
        nx = (f'{TOP[i + 1][0]} {TOP[i + 1][1]}', f'{TOP[i + 1][2]}.html') if i + 1 < len(TOP) else ('20개 주제 지도', f'{R}topics.html')
        W(f'topics/{t[2]}.html', page('topic', f'{t[0]} {t[1]} — RE:CELL', f'{t[1]}: {t[3]}', body, root=R, pg=(pv, nx),
                                        crumbs=[('홈', f'{R}index.html'), ('20개 주제', f'{R}topics.html'), (g['name'], f'{R}topics.html#g-{g["k"]}'), (t[1], None)]))

    # ── BMS 3D ──
    body = rd(os.path.join(HERE, 'lab_body.html'))
    W('lab.html', page('lab', 'BMS 3D 회로 — RE:CELL', 'ESP32 배터리 관리 회로 3D 모형', body, crumbs=[('홈', 'index.html'), ('BMS 3D 회로', None)],
                       scripts='<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" } }</script>\n<script type="module" src="assets/lab3d.js"></script>'))

    # ── 참고자료 ──
    lis = ''.join(ref_li(r) for r in D['REFS'])
    body = phead('참고자료', '모든 숫자와 사례에는 출처가 있습니다', '논문은 DOI(있으면 PMID까지)로, 제도는 정부·국회·국제기구 원문으로 확인했습니다. 기업 자료와 언론·해설 자료는 종류를 따로 표시했어요. 다른 페이지의 출처 번호를 누르면 이 페이지의 해당 항목으로 넘어옵니다.') \
        + f'<section class="band" style="padding-top:12px"><div class="wrap"><div class="rfilter" id="rfilter" role="group" aria-label="자료 종류로 거르기"></div><ol class="refs" id="refList">{lis}</ol></div></section>'
    W('references.html', page('references', '참고자료 — RE:CELL', f'RE:CELL 참고자료 {len(REFS)}건', body, crumbs=[('홈', 'index.html'), ('참고자료', None)], scripts='<script src="assets/refs.js"></script>'))

    # ── 소개 ──
    body = phead('사이트 소개', '배터리의 두 번째 삶을 따라가는 학생 연구', '폐배터리 리사이클링 기술 조사 과제를 웹으로 옮겼습니다. 배터리가 만들어지고, 쓰이고, 다시 원료로 돌아오는 과정을 그림과 출처로 함께 보여 주는 것이 목표예요.') + f'''
<section class="band" style="padding-top:12px"><div class="wrap about">
<div class="acard"><h2>무엇을 담았나</h2><ul>
<li><b>순환 여정</b> — 원료부터 다시 양극재까지 11단계 애니메이션</li>
<li><b>순환 공정 · 기업 사례</b> — 실제 재활용 기업 6곳이 공개한 공정</li>
<li><b>20개 주제</b> — 처리 경로, 지원 기술, 평가, 설계</li>
<li><b>BMS 3D 회로</b> — ESP32로 직접 만든 배터리 관리 회로</li></ul></div>
<div class="acard"><h2>출처 원칙</h2><ul>
<li>논문은 DOI로 확인하고, PubMed에 있으면 PMID를 함께 적었어요.</li>
<li>법·제도는 정부·국회·EU·국제기구 원문을 우선했어요.</li>
<li>기업 수치(회수율, 처리 용량)는 각 기업의 발표 기준이에요.</li>
<li>법무법인·언론 자료는 ‘해설’·‘언론’으로 따로 표시했어요.</li></ul></div>
<div class="acard"><h2>디자인</h2><p>자연과 기술이 함께 사는 미래를 그리는 Solarpunk 스타일을 따랐어요. 숲 녹색 #2D6A4F, 잎 #95D5B2, 햇빛 #FFD60A, 바탕 #F0F4EF. 모든 그림은 코드로 직접 그렸습니다.</p></div>
<div class="acard"><h2>고지</h2><p>학생 연구 · 비영리 교육 목적입니다. 언급된 기업과 관련이 없으며, 기업명은 사실 설명을 위해서만 썼고 로고는 쓰지 않았습니다.</p></div>
</div></section>'''
    W('about.html', page('about', '사이트 소개 — RE:CELL', 'RE:CELL 사이트 소개와 출처 원칙', body, crumbs=[('홈', 'index.html'), ('사이트 소개', None)]))

    # 404 · vercel 설정
    W('404.html', page('about', '페이지를 찾을 수 없어요 — RE:CELL', '404', phead('404', '이 페이지는 없어요', '주소를 다시 확인하거나 홈에서 순환 여정을 시작해 보세요.') + '<section class="band" style="padding-top:0"><div class="wrap"><a class="btn sun" href="/index.html">홈으로 →</a></div></section>', root='/'))
    W('vercel.json', json.dumps({'cleanUrls': True, 'trailingSlash': False}, indent=2) + '\n')
    print('pages:', len(TOP) + 8)


build()
