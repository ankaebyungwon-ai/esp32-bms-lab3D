# ESP32 BMS Lab

배터리 없이 USB 5V와 키트 부품으로 만든 ESP32 BMS의 3D 가상 실습실입니다.
한국어 · English · 日本語 · 中文을 지원합니다.

## 파일
- `index.html` : 화면 구조와 디자인
- `i18n.js` : 4개 언어 번역
- `lab.js` : 3D 회로, 가상 BMS 시뮬레이터, 조립 단계

빌드 과정이 없는 정적 사이트입니다. 세 파일을 같은 폴더에 두면 됩니다.

## Vercel에 올리기 (웹 브라우저만으로)
1. github.com에서 새 저장소(예: esp32-bms-lab)를 만들고 **Add file → Upload files**로 이 폴더의 파일을 모두 올립니다.
2. vercel.com/new 에서 그 저장소를 **Import** 하고 Framework Preset은 **Other**로 둔 채 **Deploy**를 누릅니다.
3. `https://esp32-bms-lab.vercel.app` 같은 주소가 생깁니다. 이 주소를 공유하면 누구나 열 수 있습니다.

## 명령어로 올리기 (Node.js가 있을 때)
```
cd esp32-bms-lab
npx vercel deploy --prod
```

## 가장 빠른 방법 (드래그 한 번)
app.netlify.com/drop 에 이 폴더를 끌어다 놓으면 바로 `*.netlify.app` 주소가 생깁니다.
