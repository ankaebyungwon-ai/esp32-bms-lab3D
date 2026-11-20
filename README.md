# RE:CELL — 배터리 순환 여정

폐배터리가 **어떻게 만들어지고, 어떻게 다시 원료로 돌아오는지**를 보여 주는 학생 연구 사이트입니다.
Solarpunk 디자인, 여러 페이지 구성(페이지 넘김 전환 효과), 실제 재활용 기업 공정을 바탕으로 한 순환 여정 애니메이션이 들어 있습니다.

![홈 · 순환 여정](readme-img/home.png)

## 페이지

| 주소 | 내용 |
|---|---|
| `/` (index.html) | 홈 — 11단계 순환 여정 애니메이션, 숫자 카드, 둘러보기 |
| `/process` | 순환 공정 — 11단계 상세와 재활용 방식 3가지 비교 |
| `/companies` | 기업 사례 — Redwood, Li-Cycle, Umicore, 성일하이텍, Ascend Elements, 에이비알 |
| `/topics` | 20개 주제 지도 |
| `/topics/<주제>` | 주제 상세 20쪽 (예: `/topics/battery-act`) |
| `/lab` | BMS 3D 회로 (three.js) |
| `/references` | 참고자료 37건, 종류별 거르기 (`/references#ref-15` 처럼 항목으로 바로 이동) |
| `/about` | 사이트 소개 · 출처 원칙 |

`vercel.json`의 `cleanUrls` 설정으로 Vercel에서는 `.html` 없이 열립니다.

### 페이지 넘기기

- 모든 페이지 아래에 **이전 · 다음** 버튼이 있고, 키보드 **← →** 로도 넘어갑니다.
  순서: 홈 → 순환 공정 → 기업 사례 → 20개 주제 → BMS 3D → 참고자료 → 소개
- 주제 페이지에서는 01 → 20 순서로 넘어갑니다.
- 넘길 때 화면이 옆으로 밀리는 전환 효과가 있습니다(View Transitions, Chrome·Edge·Safari 최신판). 지원하지 않는 브라우저에서는 그냥 넘어갑니다.
- 순환 공정 페이지의 ‘애니메이션으로 보기’를 누르면 홈 애니메이션이 그 단계부터 재생됩니다(`/#s-9`).

![주제 페이지](readme-img/topic.png)

## 폴더

```
index.html, process.html, companies.html, topics.html, lab.html, references.html, about.html, 404.html
topics/*.html        주제 상세 20쪽
assets/site.css      공통 스타일
assets/data.js       단계 · 기업 · 주제 · 참고자료 데이터 (홈 애니메이션이 사용)
assets/pano.js       순환 여정 풍경 그림 (SVG)
assets/journey.js    홈 애니메이션 카메라 · 자동 재생
assets/common.js     메뉴, ← → 페이지 넘기기
assets/refs.js       참고자료 거르기
assets/lab3d.js      BMS 3D 회로
tools/               페이지 생성기 (아래 참고)
docs/references.md   모든 출처와 내용 요약
vercel.json          깔끔한 주소 설정
```

## 내용 고치기

페이지는 `tools/data.js` 한 곳의 데이터로 만들어집니다. 글이나 출처를 고친 뒤 아래 명령으로 다시 만들면 모든 페이지에 반영됩니다.

```bash
cd tools
python3 build.py ..      # 상위 폴더(사이트)에 페이지를 다시 씀 — Python 3.12+, Node.js 필요
```

> 생성기는 페이지 파일만 덮어쓰고 다른 파일(`tools/`, `docs/` 등)은 건드리지 않습니다.
> 주제를 지웠다면 `topics/` 안에 남은 옛 페이지 파일은 직접 지워 주세요.

## GitHub · Vercel에 올리기

1. GitHub에서 새 저장소를 만들고 **Add file → Upload files** 로 이 폴더 안의 파일과 폴더를 모두 올린 뒤 **Commit changes**.

```bash
git init
git add .
git commit -m "RE:CELL 배터리 순환 여정 — 여러 페이지 사이트"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

2. Vercel → **Add New → Project → 저장소 Import → Deploy** (Framework: Other, 빌드 설정 없음).

## 출처 원칙

- 논문은 DOI로 확인하고, PubMed에 있으면 PMID를 함께 적었습니다.
- 법·제도는 정부(산업통상부, 환경부, 국가기술표준원), 국회, EU(EUR-Lex), 국제기구(UN, ICAO, IEA) 원문을 우선했습니다.
- 기업 수치는 각 기업의 발표 값이며 화면에 ‘기업 발표’로 표시했습니다.
- 기업명은 사실 설명을 위해서만 썼고 로고는 쓰지 않았습니다. 모든 그림은 직접 그렸습니다.

## 고지

학생 연구 · 비영리 교육 목적입니다. 언급된 기업과 관련이 없습니다. © 2026 RE:CELL
