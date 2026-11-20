/* ── 참고자료: 논문은 DOI(·PMID), 제도는 정부·국회·표준기관 원문, 기업 수치는 '기업 발표'로 표시 ── */
const REFS = [
  { id: 1, k: '논문', a: 'Łach M, Przybek A, Duda P, Bielaczyc P', y: '2025', ti: 'A Review of Direct Recycling Processes for Lithium-Ion Battery Cells', v: 'Materials 18(24): 5608', doi: '10.3390/ma18245608', pmid: '41470381' },
  { id: 2, k: '논문', a: 'Ji Y, Kpodzro EE, Jafvert CT, Zhao F', y: '2021', ti: 'Direct recycling technologies of cathode in spent lithium-ion batteries', v: 'Clean Technologies and Recycling 1(2): 124–151', doi: '10.3934/ctr.2021007' },
  { id: 3, k: '논문', a: 'Wang R, Ma S, Wang W, Liu F, Wu H, Shi C, Ke Y, Chen B', y: '2026', ti: 'Recent advances in the industrialization of direct recycling for retired lithium-ion batteries', v: 'Journal of Materials Chemistry A 14(2)', doi: '10.1039/D5TA05718C' },
  { id: 4, k: '논문', a: 'Rostami H, Valio J, Tynjälä P, Lassi U, Suominen P', y: '2024', ti: 'Life Cycle of LiFePO4 Batteries: Production, Recycling, and Market Trends', v: 'ChemPhysChem 25(24): e202400459', doi: '10.1002/cphc.202400459', pmid: '39264359' },
  { id: 5, k: '논문', a: 'Visone B, Senneca O, Prosini PP, Apicella B', y: '2025', ti: 'Recovery of LiFePO4 cathodes: Criticalities and prospect towards a long-term eco-friendly solution', v: 'Journal of Power Sources Advances 31: 100168', doi: '10.1016/j.powera.2025.100168' },
  { id: 6, k: '정부·국회', a: '환경부 (정책브리핑)', y: '2025.5.15', ti: '사용후 배터리, 국가 핵심 자원으로 키운다…순환이용 활성화 지원', v: '대한민국 정책브리핑', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=156689142' },
  { id: 7, k: '정부·국회', a: '국가기술표준원', y: '2023', ti: '전기용품안전기준 KC 10031 「사용후전지의 재사용을 위한 리튬이차전지의 안전 요구사항」 제정(안)', v: 'WTO TBT 통보 첨부문서', url: 'https://members.wto.org/crnattachments/2023/TBT/KOR/23_8951_01_x.pdf' },
  { id: 8, k: '정부·국회', a: '산업통상자원부 공고 제2023-349호', y: '2023.4.17', ti: '「전기용품 및 생활용품 안전관리법 시행규칙」 일부개정안 입법예고 (재사용전지 안전성 검사제도)', v: 'WTO TBT 통보 첨부문서', url: 'https://members.wto.org/crnattachments/2023/TBT/KOR/23_8949_00_x.pdf' },
  { id: 9, k: '국제 기준', a: 'UL Standards & Engagement', y: '2023', ti: 'ANSI/CAN/UL 1974:2023 Evaluation for Repurposing or Remanufacturing Batteries', v: 'ANSI Webstore', url: 'https://webstore.ansi.org/standards/ul/ansiul19742023' },
  { id: 10, k: '논문', a: 'Chung H-C', y: '2021', ti: 'Charge and discharge profiles of repurposed LiFePO4 batteries based on the UL 1974 standard', v: 'Scientific Data 8(1)', doi: '10.1038/s41597-021-00954-3' },
  { id: 11, k: '국제 기준', a: 'UL Solutions', y: '—', ti: 'UL Certification Helps Promote Repurposing of Electric Vehicle (EV) Batteries', v: 'UL 1974 평가 항목 소개', url: 'https://ul.com/news/ul-certification-helps-promote-repurposing-electric-vehicle-ev-batteries' },
  { id: 12, k: '정부·국회', a: '산업통상부', y: '2026.5.21', ti: '사용후 배터리 안전 관리체계 도입으로 배터리 순환 생태계 구축', v: '보도자료 (5.20 국무회의 의결)', url: 'https://www.motir.go.kr/kor/article/ATCL3f49a5a8c/171852/view' },
  { id: 13, k: '정부·국회', a: '박형수 의원 등 10인 (의안번호 2210540)', y: '2025.5.16', ti: '사용후 배터리의 관리 및 산업육성에 관한 법률안 — 제안이유 및 심사경과 (2026.4.23 본회의, 대안 반영)', v: '국민참여입법센터', url: 'https://opinion.lawmaking.go.kr/gcom/nsmLmSts/out/2210540/detailRP' },
  { id: 14, k: '정부·국회', a: '산업통상자원부', y: '2023.11.14', ti: '민간 주도의 사용후 배터리 거래 시장이 본격 열린다 — 「사용후 배터리 통합관리체계」 업계(안)', v: '보도자료', url: 'https://www.motir.go.kr/attach/down/095a2dda9c864e1d90d751f7668a1117/272de1565b06c31b337e1d56c21213fc' },
  { id: 15, k: '해설', a: '법무법인(유한) 태평양', y: '2026.11.16', ti: '「사용후배터리법」 시행을 앞둔 하위법령 쟁점과 우리 기업의 대응 과제', v: 'BKL Legal Update', url: 'https://www.bkl.co.kr/law/insight/newsletter/6861' },
  { id: 16, k: '국제 기준', a: 'PRBA·RECHARGE, 유엔 위험물운송 전문가 소위원회 제출 (ST/SG/AC.10/C.3/2012/95)', y: '2012.9.19', ti: 'Special provision and packing instructions for damaged or defective lithium batteries — 특별규정 376의 바탕이 된 제안', v: 'UN Digital Library', url: 'https://digitallibrary.un.org/record/740294' },
  { id: 17, k: '해설', a: 'ZVEI (독일 전기전자산업협회)', y: '2019', ti: 'Shipping of lithium-ion batteries — flow chart for packing instructions (SP 376/P908, SP 377/P909)', v: '산업 단체 안내서', url: 'https://www.zvei.org/fileadmin/user_upload/Verband/Fachverbaende/Elektrowerkzeuge/Neue_Merkblaetter_zum_Transport_von_Lithium-Ionen-Batterien/ZVEI-MB-Versand-von-Ionen-Lithium-Batterien-English-Final-20-09-2019.pdf' },
  { id: 18, k: '국제 기준', a: 'ICAO Dangerous Goods Panel', y: '—', ti: 'DGP/26-WP/47 — Special Provision A154 (안전상 결함·손상 리튬전지 항공 운송)', v: 'ICAO 작업문서', url: 'https://www.icao.int/safety/DangerousGoods/DGP26/DGP.26.WP.047.6.EN.pdf' },
  { id: 19, k: 'EU 법령', a: 'European Parliament and Council', y: '2023', ti: 'Regulation (EU) 2023/1542 concerning batteries and waste batteries', v: 'EUR-Lex (OJ L 191, 2023.7.28, p.1–117)', url: 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj/eng' },
  { id: 20, k: 'EU 법령', a: 'EUR-Lex', y: '—', ti: 'Summary: Sustainability rules for batteries and waste batteries', v: 'EU 공식 요약', url: 'https://eur-lex.europa.eu/EN/legal-content/summary/sustainability-rules-for-batteries-and-waste-batteries.html' },
  { id: 21, k: '국제 기준', a: 'IEA', y: '2024', ti: 'EU Sustainable Batteries Regulation', v: 'IEA Policies Database', url: 'https://www.iea.org/policies/16763-eu-sustainable-batteries-regulation' },
  { id: 22, k: '해설', a: '법무법인 광장', y: '2026.9.21', ti: 'EU 배터리 규정 최근 동향과 대응 과제: 배터리 여권과 기업 리스크 점검', v: '법률신문 게재', url: 'https://www.lawtimes.co.kr/news/articleViewAmp.html?idxno=226687' },
  { id: 23, k: '기업', a: '에이비알(ABR)', y: '—', ti: '회사 소개 — 이차전지 다이렉트 리사이클링', v: '기업 홈페이지', url: 'https://adbatteryrecycle.com/' },
  { id: 24, k: '논문', a: 'Kwade A, Haselrieder W, Leithoff R, Modlinger A, Dietrich F, Droeder K', y: '2018', ti: 'Current status and challenges for automotive battery production technologies', v: 'Nature Energy 3: 290–300', doi: '10.1038/s41560-018-0130-3' },
  { id: 25, k: '논문', a: 'Liu Y, Zhang R, Wang J, Wang Y', y: '2021', ti: 'Current and future lithium-ion battery manufacturing', v: 'iScience 24(4): 102332', doi: '10.1016/j.isci.2021.102332' },
  { id: 26, k: '기업', a: 'Redwood Materials', y: '—', ti: 'How battery recycling works', v: '기업 홈페이지 (기업 발표)', url: 'https://redwoodmaterials.com/resources/how-battery-recycling-works' },
  { id: 27, k: '기업', a: 'Redwood Materials', y: '2023.11.7', ti: 'Sustainable battery materials process — hydrometallurgy and calcination at the Battery Materials Campus', v: '기업 뉴스 (기업 발표)', url: 'https://redwoodmaterials.com/news/sustainable-battery-materials-process' },
  { id: 28, k: '기업', a: 'Li-Cycle', y: '2021.6.24', ti: 'Li-Cycle: Hydrometallurgical Recycling of Lithium-Ion Batteries', v: '기업 홈페이지 (AZoCleantech 게재글)', url: 'https://li-cycle.com/?p=12577' },
  { id: 29, k: '해설', a: 'Innovation News Network', y: '—', ti: 'Li-Cycle: Sustainable lithium-ion battery recycling technology', v: '산업 매체', url: 'https://www.innovationnewsnetwork.com/?p=21097' },
  { id: 30, k: '기업', a: 'Hatch', y: '—', ti: 'Li-Cycle Rochester Hub — North America\'s first commercial hydrometallurgical battery resource recovery facility', v: '설계·엔지니어링사 프로젝트 소개', url: 'https://hatch.com/Projects/Metals-And-Minerals/Li-Cycle-Rochester-Hub' },
  { id: 31, k: '기업', a: 'Umicore', y: '—', ti: 'Pioneering battery recycling in Europe — pyro-hydro technology', v: '기업 홈페이지 (기업 발표)', url: 'https://www.umicore.com/en/about/battery-materials-solutions/battery-recycling-solutions/pyro-hydro-technology/' },
  { id: 32, k: '기업', a: 'Umicore', y: '—', ti: 'The R&D journey behind Umicore\'s unique approach to battery recycling', v: '기업 뉴스 (기업 발표)', url: 'https://www.umicore.com/en/newsroom/the-rd-journey-behind-umicores-unique-approach-to-battery-recycling/' },
  { id: 33, k: '언론', a: '시대', y: '2021.6.25', ti: '성일하이텍 군산 습식2공장 — 용매 추출 기술로 국내 폐배터리 재활용 선두', v: '언론 기사', url: 'https://www.sidae.com/article/2021062513158043181' },
  { id: 34, k: '언론', a: 'MTN 머니투데이방송', y: '2022.7.18', ti: '[기업INSIDE] 폐배터리 재활용 원조기업 성일하이텍, 상장 후 격차 더 벌린다', v: '언론 기사', url: 'https://news.mtn.co.kr/news-detail/2022071816534176970' },
  { id: 35, k: '기업', a: 'Ascend Elements', y: '—', ti: 'Patented Hydro-to-Cathode® process', v: '기업 홈페이지 (기업 발표)', url: 'https://ascendelements.com/innovation/' },
  { id: 36, k: '기업', a: 'Ascend Elements', y: '2022.4.27', ti: 'New Details of Hydro-to-Cathode™ EV Battery Recycling and Engineered Materials Technology', v: '기업 보도자료 (기업 발표)', url: 'https://ascendelements.com/?p=2480' },
  { id: 37, k: '언론', a: '조선비즈 (다음 뉴스)', y: '2024.1.17', ti: '메탈값 85% 추락에 재활용도 주춤… 성일하이텍, 3공장 투자로 승부수', v: '언론 기사', url: 'https://v.daum.net/v/20240117060052571' },
];

/* ── 순환 여정 11단계 (애니메이션 캡션) ── */
const STOPS = [
  { ph: 0, t: '원료 캐기', d: '리튬은 염호의 소금물을 햇볕에 증발시켜, 니켈·코발트는 광산에서 캐 옵니다. 모두 양극재의 원료가 돼요.', ex: [['새 배터리는 모두 여기서 출발해요. 재활용은 이 단계를 줄이는 일입니다.', []]] },
  { ph: 0, t: '양극재 만들기', d: '니켈·코발트·망간 용액을 반응기에서 섞어 전구체(pCAM)를 만들고, 리튬과 함께 소성로에서 구워 양극재(CAM)를 만듭니다.', ex: [['Ascend Elements는 재활용 용액에서 전구체를 바로 합성해요', [35]]] },
  { ph: 0, t: '셀 만들기', d: '활물질 반죽을 금속 포일에 바르고(코팅) 말린 뒤 눌러(압연) 전극을 만들고, 분리막과 겹쳐 전해액을 넣은 다음 첫 충전(화성)으로 셀을 완성합니다.', ex: [['전극 제조 → 셀 조립 → 화성, 세 단계가 기본 공정이에요', [24, 25]]] },
  { ph: 0, t: '모듈 · 팩 조립', d: '셀 여러 개를 묶어 모듈을 만들고, 모듈에 BMS·냉각·케이스를 더해 전기차용 배터리팩을 완성합니다.', ex: [['BMS가 전압·온도를 지켜보는 모습은 아래 3D 회로에서 직접 볼 수 있어요', []]] },
  { ph: 1, t: '전기차로 달리기', d: '팩은 전기차 바닥에 실려 수년간 달립니다. 충전과 방전을 거듭하며 쓸 수 있는 용량이 조금씩 줄어요.', ex: [['국내 사용후 배터리는 2023년 2,355개 → 2030년 약 10만 7,500개 전망', [15]]] },
  { ph: 1, t: '수명 진단', d: '떼어 낸 팩의 잔존용량(SOH)을 잽니다. 아직 쓸 만하면 재사용으로, 너무 지쳤으면 재활용으로 길이 갈려요.', ex: [['사용후배터리법: 배터리를 떼기 전 성능평가 (2027.5.27 시행)', [12, 15]]] },
  { ph: 1, t: '두 번째 삶: ESS', d: '쓸 만한 팩은 태양광·풍력 옆 에너지저장장치(ESS)로 다시 일합니다. 남는 전기를 담아 두었다가 필요할 때 내보내요.', ex: [['국내에서는 재사용전지 안전성 검사를 통과해야 해요 (2023.10 시행)', [8]]] },
  { ph: 2, t: '방전 · 해체', d: '재활용할 팩은 남은 전기를 안전하게 빼낸 뒤, 팩 → 모듈 → 셀 순서로 해체합니다.', ex: [['성일하이텍: 팩과 셀·모듈을 분리하는 자동화 기계', [33]], ['Redwood·Umicore: 배터리에 남은 에너지를 공정에 활용 (기업 발표)', [26, 31]]] },
  { ph: 2, t: '파쇄 · 선별', d: '셀을 잘게 부수고 체로 걸러 플라스틱, 구리·알루미늄, 그리고 금속이 몰린 검은 가루(블랙매스)로 나눕니다.', ex: [['Li-Cycle의 Spoke: 플라스틱 · 구리/알루미늄 · 블랙매스 세 갈래로 분리', [29]]] },
  { ph: 2, t: '습식제련', d: '블랙매스를 산에 녹이고(침출), 용매추출로 금속을 하나씩 떼어 내 황산니켈·황산코발트·황산망간·탄산리튬 결정으로 만듭니다.', ex: [['성일하이텍: 용매추출로 황산코발트·니켈·망간·탄산리튬 생산', [33]], ['Redwood: 스크랩에서 리튬 95% 회수 (기업 발표)', [27]]] },
  { ph: 2, t: '다시 양극재로', d: '되찾은 금속은 다시 전구체와 양극재가 되어 새 배터리로 들어갑니다. 순환이 한 바퀴 돌았어요.', ex: [['Umicore: 회수한 배터리급 소재로 새 양극재를 만드는 폐쇄 순환 (기업 발표)', [31, 32]]] },
];
const PHASES = [['만들기', '#2D6A4F'], ['쓰기', '#C99700'], ['되살리기', '#2A9D8F']];

/* ── 실제 기업 사례 (회사 이름은 사실 서술 목적, 로고 미사용) ── */
const COMPANIES = [
  { n: 'Redwood Materials', c: '미국 · 네바다', m: '기계적·열 전처리 + 습식제련 → 양극재', f: [['공정 에너지로 폐배터리에 남은 전기를 쓴다고 밝혀요', [26]], ['스크랩에서 리튬 95% 회수, 열 전처리 설비는 연 4만 톤 이상 처리 (기업 발표)', [27]]], url: 'https://redwoodmaterials.com/' },
  { n: 'Li-Cycle', c: '캐나다 · 미국', m: 'Spoke(파쇄) & Hub(습식제련)', f: [['Spoke에서 파쇄해 블랙매스를, Hub에서 습식으로 탄산리튬·황산니켈·황산코발트를', [28, 29]], ['Rochester Hub 설계 용량: 블랙매스 연 3.5만 톤 ≈ 배터리 9만 톤', [30]]], url: 'https://li-cycle.com/' },
  { n: 'Umicore', c: '벨기에 · 호보컨', m: '건식(제련) + 습식 정제', f: [['고온 제련으로 니켈·코발트·구리 합금을 만든 뒤 습식으로 정제', [31, 32]], ['니켈·구리·코발트 95% 이상 회수 (기업 발표)', [32]]], url: 'https://www.umicore.com/' },
  { n: '성일하이텍', c: '한국 · 군산', m: '전처리(블랙파우더) + 용매추출 습식', f: [['수거·선별 후 검은 분말로 1차 가공하는 전처리 공정', [34]], ['용매추출로 황산코발트·황산니켈·황산망간·탄산리튬 공급', [33]]], url: '' },
  { n: 'Ascend Elements', c: '미국', m: 'Hydro-to-Cathode® 전구체 직행', f: [['금속을 뽑는 대신 불순물을 걸러 내고, 용액에서 전구체(pCAM)를 바로 합성', [35]], ['핵심 원소 98% 회수 (기업 발표)', [36]]], url: 'https://ascendelements.com/' },
  { n: '에이비알 (ABR)', c: '한국', m: '다이렉트 리사이클링', f: [['양극재를 원소로 되돌리지 않고 되살리는 직접 재활용을 사업으로', [23]], ['직접 재활용의 원리와 과제는 15번 주제에', [1, 3]]], url: 'https://adbatteryrecycle.com/' },
];

/* ── 20개 주제 (모두 이 페이지 안에서 열림) ── */
const GROUPS = [
  { k: 'paths', name: '처리 경로', q: '무엇을 할 것인가', col: '#2D6A4F' },
  { k: 'support', name: '지원 기술', q: '무엇이 있어야 가능한가', col: '#2A9D8F' },
  { k: 'eval', name: '평가', q: '좋은지 어떻게 판단하는가', col: '#C99700' },
  { k: 'design', name: '설계', q: '애초에 어떻게 만들 것인가', col: '#D4733A' },
];
const TOPICS = [
  ['01', '재제조', 'remanufacturing', '지친 셀만 바꿔 다시 전기차로', 'paths', { sum: '팩이나 모듈에서 성능이 떨어진 셀·모듈만 골라 바꾸고 점검해, 다시 전기차용 배터리로 쓰는 방법입니다. 원래 용도로 돌아간다는 점이 재사용과 달라요.', pts: [['진단으로 약한 모듈을 찾아 교체하고, 나머지는 그대로 살립니다.', []], ['재제조 배터리를 실은 제품도 유통 전·정기 안전검사 대상이 됩니다(사용후배터리법·자동차관리법).', [15]]] }],
  ['02', '재사용', 'reuse', '자동차엔 부족해도 ESS엔 충분하다', 'paths', { sum: '전기차에 쓰기엔 용량이 줄었지만 아직 쓸 만한 배터리를 ESS, 전동 카트, 비상 전원처럼 덜 까다로운 곳에 다시 쓰는 방법입니다.', pts: [['다시 쓰기 전에 성능평가와 안전성 검사를 거쳐야 합니다.', [8, 12]], ['태양광·풍력 옆에 두면 남는 전기를 담아 두는 저장소가 돼요.', []]] }],
  ['03', '재활용', 'recycling', '배터리를 원소로 되돌리는 일', 'paths', { sum: '배터리를 부수고 녹여 리튬·니켈·코발트 같은 원소를 되찾는 방법입니다. 되찾은 원료는 새 양극재의 재료가 됩니다.', pts: [['전처리(방전·해체·파쇄) → 블랙매스 → 습식 또는 건식+습식 제련 순서로 진행돼요.', [34, 31]], ['습식은 산에 녹여 용매추출로 금속을 하나씩 떼어 냅니다.', [33]]] }],
  ['04', '업사이클링', 'upcycling', '원소로 돌아가지 않고 새 소재로', 'paths', { sum: '원소까지 되돌리지 않고, 폐배터리 소재를 다른 쓸모 있는 소재로 바꾸는 접근입니다. 금속 회수를 건너뛰어 공정이 짧아질 수 있어요.', pts: [['양극재를 그대로 되살리는 직접 재활용(15번)과 맞닿아 있어요.', [1]], ['많은 방법이 아직 연구 단계라, 상용 규모 검증이 과제입니다.', [3]]] }],
  ['05', '잔존수명 진단', 'soh-diagnosis', '세 갈래 길의 입구', 'support', { sum: '처음 용량에 비해 지금 얼마나 남았는지(SOH)를 재는 일입니다. 결과에 따라 재제조·재사용·재활용 중 어디로 갈지가 정해져요.', pts: [['충·방전 시험, 내부 저항 측정, BMS에 쌓인 사용 기록 분석으로 판단합니다.', []], ['사용후배터리법은 배터리를 떼기 전 성능평가를 받도록 했어요(2027.5.27 시행).', [12, 15]]] }],
  ['06', '안전 관리', 'safety', '모든 공정은 방전에서 시작한다', 'support', { sum: '폐배터리는 남은 전기와 열폭주 위험 때문에, 해체·파쇄 전에 반드시 안전하게 방전하고 다뤄야 합니다.', pts: [['국내 재활용 기업도 팩·모듈을 안전하게 방전·해체하는 전용 라인을 늘리고 있어요.', [33]], ['손상 배터리의 운송·보관 규칙은 19번 주제에서 다룹니다.', [16]]] }],
  ['07', '자동화 해체', 'automated-disassembly', '사람 손에서 로봇 팔로', 'support', { sum: '배터리팩은 제조사마다 구조가 달라 해체에 사람 손이 많이 듭니다. 로봇과 비전 기술로 나사·커넥터를 풀어 안전과 속도를 높이려는 분야예요.', pts: [['국내 재활용 기업도 팩·모듈을 분리하는 자동화 라인을 늘리고 있어요.', [33]], ['분해를 쉽게 만드는 설계(14번)와 함께 가야 효과가 큽니다.', [6]]] }],
  ['08', '부산물 회수', 'byproduct-recovery', '버려지던 전해액과 흑연', 'support', { sum: '금속만이 아니라 흑연, 전해액, 구리·알루미늄 포일, 플라스틱도 회수 대상입니다.', pts: [['파쇄 단계에서 플라스틱 · 구리/알루미늄 · 블랙매스로 나뉘어요.', [29]], ['Redwood는 회수한 구리로 음극 동박까지 만든다고 밝혀요(기업 발표).', [27]]] }],
  ['09', '이력관리', 'traceability', '제조부터 재활용까지 한 줄로', 'support', { sum: '배터리마다 식별번호를 붙여 제조 → 사용 → 재활용까지 이력을 남기는 제도입니다.', pts: [['2025년 2월 전기차 배터리 식별번호 이력관리제가 시행됐어요(국토교통부).', [15]], ['EU는 2027년 2월부터 디지털 배터리 여권을 요구합니다(20번).', [19, 21]]] }],
  ['10', '재생원료 인증', 'certification', '얼마나 되살렸는지 증명하는 일', 'support', { sum: '배터리 원료가 재활용으로 얻은 것인지, 얼마나 들어 있는지를 증명하는 제도입니다.', pts: [['2026년 6~12월 재생원료 생산인증 시범사업에 재활용 기업 6개사가 참여했어요.', [15]], ['사용후배터리법에 재생원료 생산·사용 인증과 함유율 목표제 근거가 생겼어요.', [12]]] }],
  ['11', '전과정평가', 'lca', '환경에 정말 이로운가를 숫자로', 'eval', { sum: '채굴부터 폐기까지 전 과정의 탄소·물·에너지 사용을 계산해, 재활용이 정말 이로운지 비교하는 방법입니다.', pts: [['기업들도 LCA로 공정을 비교해 발표합니다. 예: Redwood는 광석 대비 에너지 80%·CO₂ 70% 절감이라고 밝혀요(기업 발표).', [26]], ['기업 발표 수치는 계산 범위가 서로 달라 그대로 비교하면 안 돼요.', []]] }],
  ['12', '기술경제성 분석', 'techno-economic', '실험실 99%와 공장 흑자 사이', 'eval', { sum: '회수율이 높아도 금속 가격·수거량·공정 비용이 맞지 않으면 사업이 되지 않습니다. 실험실 성과를 공장 수익으로 옮기는 분석이에요.', pts: [['2022년 말 고점 대비 탄산리튬 가격이 약 85% 떨어지자 재활용 기업 실적도 흔들렸어요.', [37]], ['LFP처럼 회수 가치가 낮은 배터리는 경제성이 더 큰 과제입니다(16번).', [5]]] }],
  ['13', '공급망 · 자원안보', 'supply-chain', '폐배터리는 도시광산이다', 'eval', { sum: '핵심 광물을 수입에 의존하는 나라에게 폐배터리는 국내에서 캐는 \'도시광산\'입니다.', pts: [['사용후배터리법의 목적에 \'공급망 안정화\'가 들어갔어요.', [12, 13]], ['EU는 재생원료 의무 함량으로 역내 순환을 강제합니다(20번).', [20]]] }],
  ['14', '분해를 고려한 설계', 'design-for-disassembly', '처리하기 쉽게, 처음부터', 'design', { sum: '접착 대신 볼트, 표준화된 모듈, 분명한 표시처럼 처음부터 해체·재활용하기 쉽게 배터리를 설계하는 접근입니다.', pts: [['환경부는 2027년까지 배터리 친환경 디자인 표준화를 마련하겠다고 밝혔어요.', [6]], ['해체가 쉬워야 자동화 해체(07번)도 빨라집니다.', []]] }],
  ['15', '직접 재활용', 'direct-recycling', '녹이지 않고 고쳐서 다시 양극재로', 'paths', { isNew: 1, sum: '다 쓴 셀에서 양극 활물질을 결정 구조 그대로 떼어 내, 빠진 리튬을 다시 채워(재리튬화) 새 양극재로 쓰는 방법입니다.', pts: [['분해 → 분리 → 재리튬화·열처리 순서로, 원소로 되돌리지 않고 성능만 되살립니다.', [1, 2]], ['습식·건식 제련보다 에너지 사용, 시약 비용, 탄소발자국을 줄일 수 있는 경로로 평가됩니다.', [1]], ['걸림돌은 재생 양극재의 품질 표준, 섞여 들어오는 여러 양극 조성, 대량 공정 설계입니다.', [1, 3]], ['국내에도 다이렉트 리사이클링을 사업으로 하는 기업이 있어요(예: 에이비알).', [23]]] }],
  ['16', 'LFP 배터리 재활용', 'lfp-recycling', '값이 싼 배터리일수록 되살리기 어렵다', 'paths', { isNew: 1, sum: 'LFP(리튬인산철) 배터리는 코발트·니켈이 없어 싸고 안전해 전기차와 ESS에서 빠르게 늘었지만, 회수할 금속 값이 낮아 재활용 수익을 내기 어렵습니다.', pts: [['기존 습식·건식 공정을 그대로 쓰면 기대만큼 수익이 나지 않아요.', [5]], ['그래도 리튬과 인은 EU가 정한 핵심원료라 회수할 이유가 있습니다.', [5]], ['리튬만 골라 뽑는 습식 공정과 양극재를 되살리는 직접 재생이 함께 연구되고 있어요.', [4, 5]], ['환경부는 LFP 등 재활용 실증센터를 2026년까지 짓고, 경제성 평가로 관리방안을 마련하겠다고 밝혔어요.', [6]]] }],
  ['17', '재사용전지 안전성 검사', 'repurpose-safety', 'ESS로 가기 전에 꼭 받는 검사', 'support', { isNew: 1, sum: '전기차 배터리를 ESS 등으로 다시 쓰려면 먼저 안전한지 검사받아야 합니다. 한국은 2023년 10월부터 제도를 시행했고, 북미에는 UL 1974 표준이 있어요.', pts: [['전기용품안전관리법 개정(2022.10.18 공포, 2023.10.19 시행)으로 검사 의무·검사 표시·검사기관 지정이 생겼어요.', [8]], ['안전기준 KC 10031(제정안)은 사전 검사 3항목, 전기적 검사 5항목, BMS 기능 시험을 정합니다.', [7]], ['UL 1974는 2018년 처음 나왔고, 2023년판부터 재제조 배터리까지 다룹니다.', [9, 11]], ['UL 1974 절차로 재사용 LFP 배터리를 시험한 데이터가 논문으로 공개돼 있어요.', [10]]] }],
  ['18', '사용후배터리법 · 통합관리', 'battery-act', '폐기물에서 국가 전략자원으로', 'support', { isNew: 1, sum: '「사용후 배터리의 관리 및 산업육성에 관한 법률」이 2026년 5월 26일 공포되어 2027년 5월 27일부터 시행됩니다. 평가·검사·거래·이력을 한 법으로 묶었어요.', tl: [['2023.11', '업계 통합관리체계(안)', 14], ['2026.4.23', '국회 본회의 통과', 13], ['2026.5.20', '국무회의 의결', 12], ['2026.5.26', '공포', 15], ['2027.5.27', '시행', 15]], pts: [['2021년 이후 등록 전기차 배터리는 반납 의무가 없어 관리 공백이 생겼다는 것이 입법 이유 중 하나예요.', [13]], ['떼기 전 성능평가, 탑재 제품 안전검사, 유통·재사용 사업자 등록제를 둡니다.', [12, 15]], ['공공 거래시스템·이력관리시스템, 재생원료 인증·함유율 목표제 근거가 생겼어요.', [12, 15]]] }],
  ['19', '손상 배터리 운송 · 보관', 'damaged-transport', '불날 수 있는 배터리를 옮기는 규칙', 'support', { isNew: 1, sum: '손상되거나 결함 있는 리튬전지는 열폭주 위험이 있어, 국제 위험물 운송 규칙이 일반 배터리와 다른 포장을 요구합니다.', pts: [['손상·결함 전지는 특별규정 376과 포장 지침 P908을 따르고, 위험한 반응이 우려되면 더 엄격한 포장이나 당국 승인이 필요해요.', [16, 17]], ['폐기·재활용하러 가는 전지는 특별규정 377과 P909를 따릅니다.', [17]], ['항공은 안전상 결함·손상 전지를 ICAO 특별규정 A154로 금지해요.', [18]], ['국내는 개정 자동차관리법(2027.7.1 시행)에 보관·운송 기준이 들어갑니다.', [15]]] }],
  ['20', 'EU 배터리 규정 · 배터리 여권', 'eu-battery-regulation', '수출 배터리가 넘어야 할 숫자들', 'eval', { isNew: 1, sum: 'EU 배터리 규정(Regulation (EU) 2023/1542)은 배터리의 설계부터 회수·재활용까지 전 생애를 규율합니다. 유럽에 팔려면 이 숫자를 맞춰야 해요.', pts: [['2kWh 넘는 산업용·전기차·LMT 배터리는 디지털 배터리 여권이 필요해요(2027년 2월부터).', [19, 21]], ['리튬 회수 목표: 2027년 말 50%, 2031년 말 80%. 코발트·구리·납·니켈은 90% → 95%.', [20, 21]], ['재생원료 최소 함량: 2031년 8월부터 코발트 16%·리튬 6%·니켈 6%·납 85%, 2036년엔 26%·12%·15%.', [20, 21]], ['EU 집행위는 2026년 8월 배터리 여권 가이드라인을 갱신해 71개 데이터 항목을 정리했어요.', [22]]] }],
];

/* ── 홈 숫자 카드 · 재활용 방식 ── */
const IMPACT = [
  ['10.7만 개', '2030년 국내 사용후 배터리 배출 전망', '2023년 2,355개에서 · 정부 추정', [15]],
  ['2027.5.27', '사용후배터리법 시행', '성능평가 · 안전검사 · 거래 · 이력', [12, 15]],
  ['리튬 50%', 'EU 폐배터리 리튬 회수 목표 (2027년 말)', '2031년 말 80%', [20, 21]],
  ['95%+', 'Umicore 니켈·구리·코발트 회수 수율', '기업 발표', [32]],
];
const METHODS = [
  { c: '#2D6A4F', t: '전처리 + 습식제련', f: ['방전·해체', '파쇄·선별', '블랙매스', '침출', '용매추출', '결정화'], d: '배터리를 부숴 금속이 몰린 검은 가루를 만든 뒤, 산에 녹여 금속을 하나씩 분리합니다. 리튬까지 화합물로 되찾아요.', who: '성일하이텍 · Li-Cycle · Redwood Materials', r: [33, 34, 28, 27] },
  { c: '#C99700', t: '건식(제련) + 습식', f: ['고온 제련', '니켈·코발트·구리 합금', '습식 정제', '배터리급 소재'], d: '높은 온도로 녹여 불순물을 먼저 걸러 내고 합금을 만든 뒤, 습식으로 정제합니다. 배터리 안의 에너지를 제련에 쓴다고 밝혀요.', who: 'Umicore', r: [31, 32] },
  { c: '#2A9D8F', t: '전구체 · 양극재 직행', f: ['블랙매스', '불순물 제거', '전구체 합성', '양극재'], d: '금속을 하나씩 떼어 내 팔지 않고, 용액에서 바로 전구체를 만들거나 양극재를 그대로 되살립니다. 단계가 줄어요.', who: 'Ascend Elements · 직접 재활용(에이비알 등)', r: [35, 1, 23] },
];
