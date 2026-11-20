# RE:CELL — 배터리 순환 여정

폐배터리가 **어떻게 만들어지고, 어떻게 다시 원료로 돌아오는지**를 한 장의 풍경 애니메이션으로 보여 주는 학생 연구 사이트입니다.
디자인은 Solarpunk 스타일(밝은 녹색·햇빛 노랑, 자연과 기술의 공존)을 따랐습니다.

![메인 화면](assets/preview-hero.png)

## 화면 구성

| 섹션 | 내용 |
|---|---|
| 순환 여정 (메인) | 원료 → 양극재 → 셀 → 모듈·팩 → 전기차 → 수명 진단 → 재사용 ESS → 방전·해체 → 파쇄·선별 → 습식제련 → 다시 양극재, 11단계 애니메이션. 자동 재생·일시정지·이전/다음·단계 선택, 단계마다 실제 기업 사례와 출처 |
| 숫자로 보는 지금 | 배출 전망, 사용후배터리법 시행일, EU 리튬 회수 목표, 기업 회수율 |
| 재활용 방식 | 전처리+습식 / 건식+습식 / 전구체·양극재 직행 비교 |
| 기업 사례 | Redwood Materials, Li-Cycle, Umicore, 성일하이텍, Ascend Elements, 에이비알 |
| 20개 주제 | 처리 경로·지원 기술·평가·설계. 카드를 누르면 요약과 출처가 페이지 안에서 열림 (`#t-주제이름` 주소로 바로 열기 가능) |
| BMS 3D 회로 | three.js로 그린 ESP32 BMS 회로. 판정 단계에 따라 LED·부저·TFT가 바뀜 (가상 데이터) |
| 참고자료 | 37건, 종류별 거르기 (논문 / 정부·국회 / 국제 기준 / EU 법령 / 기업 / 언론·해설) |

![순환 여정 단계](assets/preview-journey.png)

## 파일

```
index.html          배포용 한 장짜리 페이지 (HTML·CSS·JS 모두 포함)
src/pano.js         순환 여정 풍경 그림 (장면 11개, SVG)
src/data.js         단계 설명 · 기업 사례 · 20개 주제 · 참고자료 데이터
src/main.js         카메라 이동, 자동 재생, 주제 상세 창, 참고자료 목록
docs/references.md  모든 출처와 주제 요약 (문서용)
```

`src/` 파일은 `index.html` 안에 들어 있는 코드를 보기 쉽게 나눠 둔 사본입니다. 사이트는 `index.html` 하나로 돌아갑니다.
외부에서 불러오는 것은 Google Fonts(Noto Sans KR, Outfit)와 three.js 0.170.0(jsDelivr, 3D 회로용)뿐입니다.

## 출처 원칙

- 논문은 DOI로 확인하고, PubMed에 있으면 PMID를 함께 적었습니다.
- 법·제도는 정부(산업통상부, 환경부, 국가기술표준원), 국회, EU(EUR-Lex), 국제기구(UN, ICAO, IEA) 원문을 우선했습니다.
- 기업 수치(회수율, 처리 용량 등)는 각 기업이 직접 발표한 값이며, 화면에 ‘기업 발표’로 표시했습니다.
- 기업명은 사실 설명을 위해서만 썼고 로고는 쓰지 않았습니다. 모든 그림은 직접 그렸습니다.

## GitHub · Vercel에 올리기

1. GitHub에서 새 저장소를 만들고 **Add file → Upload files** 로 이 폴더 안의 파일을 모두 올린 뒤 **Commit changes**.

```bash
git init
git add .
git commit -m "RE:CELL 배터리 순환 여정 사이트"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

2. Vercel → **Add New → Project → 저장소 Import → Deploy** (Framework: Other, 빌드 설정 없음).

## 고지

학생 연구 · 비영리 교육 목적입니다. 언급된 기업과 관련이 없습니다. © 2026 RE:CELL
