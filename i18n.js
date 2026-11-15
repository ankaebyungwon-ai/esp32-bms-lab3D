/* 번역: 화면 문구는 한국어 원문을 키로 영어·일본어·중국어를 찾음. 없으면 원문 그대로 */
window.I18N = (() => {
  const LANGS = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const IDX = { en: 0, ja: 1, zh: 2 };
  const D = {
"@부품": [
"Parts",
"部品",
"元件"
],
"빨강": [
"Red",
"赤",
"红"
],
"검정": [
"Black",
"黒",
"黑"
],
"주황": [
"Orange",
"オレンジ",
"橙"
],
"초록": [
"Green",
"緑",
"绿"
],
"파랑": [
"Blue",
"青",
"蓝"
],
"보라": [
"Purple",
"紫",
"紫"
],
"청록": [
"Teal",
"青緑",
"青"
],
"노랑": [
"Yellow",
"黄",
"黄"
],
"흰색": [
"White",
"白",
"白"
],
"아날로그 입력": [
"Analog input",
"アナログ入力",
"模拟输入"
],
"디지털 신호": [
"Digital signal",
"デジタル信号",
"数字信号"
],
"TFT SPI 신호": [
"TFT SPI signal",
"TFT SPI信号",
"TFT SPI 信号"
],
"부하 전류": [
"Load current",
"負荷電流",
"负载电流"
],
"같은 신호 잇기": [
"Bridge the same signal",
"同じ信号をつなぐ",
"连接同一信号"
],
"보드와 ESP32 위치 확인": [
"Place the boards and the ESP32",
"ブレッドボードとESP32の配置",
"放置面包板和 ESP32"
],
"준비": [
"Setup",
"準備",
"准备"
],
"브레드보드 2개를 나란히 놓고 가운데에 ESP32를 걸쳐 꽂은 상태에서 시작합니다. ESP32 아래쪽 핀 줄(3V3~5V)은 아래 보드 D열, 위쪽 핀 줄(GND~CLK)은 위 보드 F열의 1~19행에 들어가고 USB는 오른쪽을 향합니다.": [
"Start with two breadboards side by side and the ESP32 straddling the gap between them. The ESP32's lower pin row (3V3–5V) sits in column D of the lower board, the upper pin row (GND–CLK) in column F of the upper board, rows 1–19, with the USB port facing right.",
"ブレッドボード2枚を並べ、その間にESP32をまたいで挿した状態から始めます。ESP32の下側ピン列（3V3〜5V）は下ボードのD列、上側ピン列（GND〜CLK）は上ボードのF列の1〜19行に入り、USBは右向きです。",
"先把两块面包板并排放好，ESP32 横跨在两块板之间。ESP32 下排引脚（3V3~5V）插在下面包板的 D 列，上排引脚（GND~CLK）插在上面包板的 F 列，占第 1~19 行，USB 朝右。"
],
"같은 행에서 ESP32에 가려지지 않은 구멍(아래 보드 A~C, 위 보드 G~J)이 그 핀과 연결됩니다. 예: 아래 보드 B15 = GPIO34.": [
"The holes in the same row that the ESP32 doesn't cover (lower board A–C, upper board G–J) connect to that pin. Example: lower board B15 = GPIO34.",
"同じ行でESP32に隠れていない穴（下ボードA〜C、上ボードG〜J）がそのピンにつながります。例：下ボードB15 = GPIO34。",
"同一行中没有被 ESP32 挡住的孔（下板 A~C，上板 G~J）与该引脚相连。例如：下板 B15 = GPIO34。"
],
"아래 보드 레일은 + = 5V, − = GND, 위 보드 레일은 + = 3V3, − = GND로 씁니다.": [
"On the lower board use the rails as + = 5V, − = GND; on the upper board as + = 3V3, − = GND.",
"下ボードのレールは + = 5V、− = GND、上ボードのレールは + = 3V3、− = GNDとして使います。",
"下面包板的电源轨用作 + = 5V、− = GND；上面包板的电源轨用作 + = 3V3、− = GND。"
],
"ESP32 위쪽 핀 줄의 안테나 쪽 끝(19행) 핀은 쓰지 않습니다. GND는 아래쪽 줄 6행, 위쪽 줄 13행 핀을 씁니다.": [
"Don't use the pin at the antenna end of the ESP32's upper row (row 19). For GND use row 6 on the lower row and row 13 on the upper row.",
"ESP32上側ピン列のアンテナ側の端（19行）は使いません。GNDは下側列の6行、上側列の13行のピンを使います。",
"ESP32 上排靠天线一端（第 19 行）的引脚不用。GND 用下排第 6 行、上排第 13 行的引脚。"
],
"레일이 가운데에서 끊긴 보드가 있습니다. 끊겨 있으면 짧은 점퍼로 이어 주세요.": [
"Some boards have rails split in the middle. If yours does, bridge them with a short jumper.",
"レールが中央で切れているボードがあります。切れていれば短いジャンパーでつないでください。",
"有些面包板的电源轨在中间断开。如果断开，用短跳线连起来。"
],
"조립하는 동안 USB는 빼 둡니다.": [
"Keep the USB cable unplugged while you build.",
"組み立て中はUSBを抜いておきます。",
"组装期间请拔掉 USB。"
],
"전원 레일 연결": [
"Connect the power rails",
"電源レールの接続",
"连接电源轨"
],
"1단계": [
"Step 1",
"ステップ1",
"第 1 步"
],
"ESP32의 5V·GND를 아래 보드 레일로, 3V3·GND를 위 보드 레일로 뽑아 냅니다. 3V3선은 ESP32 안테나 위쪽(23행)으로 넘어갑니다.": [
"Bring the ESP32's 5V and GND out to the lower board rails, and 3V3 and GND to the upper board rails. The 3V3 wire crosses over the ESP32 antenna to row 23.",
"ESP32の5V・GNDを下ボードのレールへ、3V3・GNDを上ボードのレールへ引き出します。3V3の線はESP32のアンテナを越えて23行へ渡ります。",
"把 ESP32 的 5V 和 GND 引到下面包板的电源轨，把 3V3 和 GND 引到上面包板的电源轨。3V3 线跨过 ESP32 天线到第 23 行。"
],
"5V와 3V3 레일을 바꿔 꽂으면 3.3V 부품이 손상될 수 있습니다.": [
"Swapping the 5V and 3V3 rails can damage the 3.3V parts.",
"5Vと3V3のレールを取り違えると3.3V部品が壊れることがあります。",
"5V 和 3V3 电源轨接反可能损坏 3.3V 元件。"
],
"아래 보드 A1은 ESP32 5V 핀, A6은 GND 핀, A19는 3V3 핀과 같은 줄입니다.": [
"Lower board A1 shares a row with the ESP32 5V pin, A6 with GND, and A19 with 3V3.",
"下ボードA1はESP32の5Vピン、A6はGNDピン、A19は3V3ピンと同じ行です。",
"下板 A1 与 ESP32 的 5V 引脚同行，A6 与 GND 同行，A19 与 3V3 同行。"
],
"5V 전원 전압 감시 → GPIO34": [
"5V supply monitor → GPIO34",
"5V電源電圧の監視 → GPIO34",
"5V 电源电压监测 → GPIO34"
],
"2단계": [
"Step 2",
"ステップ2",
"第 2 步"
],
"USB 5V를 R1·R2(10kΩ)로 절반(약 2.5V)으로 나눠 GPIO34로 읽습니다. 전원이 떨어지거나 튀는지를 감시합니다. C1은 잡음을 줄입니다.": [
"R1 and R2 (10kΩ) halve the USB 5V to about 2.5V for GPIO34 to read. This watches the supply for drops and spikes. C1 reduces noise.",
"USB 5VをR1・R2（10kΩ）で半分（約2.5V）に分圧してGPIO34で読みます。電源の低下やはね上がりを監視します。C1はノイズを減らします。",
"用 R1、R2（10kΩ）把 USB 5V 分压到一半（约 2.5V），由 GPIO34 读取，以监测电源跌落或突跳。C1 用于降低噪声。"
],
"5V 감시 분배기 위쪽": [
"5V monitor divider, top",
"5V監視分圧器（上側）",
"5V 监测分压器（上）"
],
"5V 감시 분배기 아래쪽": [
"5V monitor divider, bottom",
"5V監視分圧器（下側）",
"5V 监测分压器（下）"
],
"분배기 잡음 필터": [
"Divider noise filter",
"分圧器のノイズフィルタ",
"分压器噪声滤波"
],
"25행이 분배기 가운데 점(약 2.5V), 29행이 GND 점입니다.": [
"Row 25 is the divider midpoint (about 2.5V); row 29 is the GND point.",
"25行が分圧器の中点（約2.5V）、29行がGND点です。",
"第 25 行是分压中点（约 2.5V），第 29 行是 GND 点。"
],
"5V를 GPIO34에 직접 꽂으면 안 됩니다. 반드시 R1·R2를 거칩니다.": [
"Never connect 5V straight to GPIO34. Always go through R1 and R2.",
"5VをGPIO34に直接つないではいけません。必ずR1・R2を通します。",
"绝不能把 5V 直接接到 GPIO34，必须经过 R1 和 R2。"
],
"10kΩ 색띠: 갈·검·주. 220Ω·330Ω을 쓰면 값이 틀어집니다.": [
"10kΩ bands: brown, black, orange. Using 220Ω or 330Ω here gives wrong readings.",
"10kΩのカラーコード：茶・黒・橙。220Ωや330Ωを使うと値がずれます。",
"10kΩ 色环：棕、黑、橙。用 220Ω 或 330Ω 会导致读数错误。"
],
"부하 저항과 션트 → GPIO35": [
"Load resistors and shunt → GPIO35",
"負荷抵抗とシャント → GPIO35",
"负载电阻和分流电阻 → GPIO35"
],
"3단계": [
"Step 3",
"ステップ3",
"第 3 步"
],
"릴레이가 켜지면 5V → RL → RS → GND로 전류가 흐릅니다. RS1·RS2(220Ω 2개를 나란히 꽂아 110Ω)에 걸리는 전압을 GPIO35로 읽어 전류를 계산합니다. 처음엔 RL1(330Ω) 하나만 꽂습니다.": [
"When the relay closes, current flows 5V → RL → RS → GND. GPIO35 reads the voltage across RS1 and RS2 (two 220Ω side by side = 110Ω) to compute the current. Start with RL1 (330Ω) only.",
"リレーが入ると 5V → RL → RS → GND に電流が流れます。RS1・RS2（220Ωを2本並列で110Ω）にかかる電圧をGPIO35で読み、電流を計算します。最初はRL1（330Ω）だけを挿します。",
"继电器吸合后，电流按 5V → RL → RS → GND 流动。GPIO35 读取 RS1、RS2（两个 220Ω 并联 = 110Ω）两端的电压来计算电流。开始时只插 RL1（330Ω）。"
],
"부하 저항 1번 (약 11mA)": [
"Load resistor 1 (about 11mA)",
"負荷抵抗1（約11mA）",
"负载电阻 1（约 11mA）"
],
"부하 저항 2번 · 과전류 실험용": [
"Load resistor 2 · over-current test",
"負荷抵抗2・過電流テスト用",
"负载电阻 2 · 过流实验用"
],
"부하 저항 3번 · 과전류 실험용": [
"Load resistor 3 · over-current test",
"負荷抵抗3・過電流テスト用",
"负载电阻 3 · 过流实验用"
],
"전류 측정용 션트 (RS2와 병렬 = 110Ω)": [
"Current-sense shunt (parallel with RS2 = 110Ω)",
"電流検出シャント（RS2と並列 = 110Ω）",
"电流采样分流电阻（与 RS2 并联 = 110Ω）"
],
"전류 측정용 션트 (RS1과 병렬 = 110Ω)": [
"Current-sense shunt (parallel with RS1 = 110Ω)",
"電流検出シャント（RS1と並列 = 110Ω）",
"电流采样分流电阻（与 RS1 并联 = 110Ω）"
],
"션트 잡음 필터": [
"Shunt noise filter",
"シャントのノイズフィルタ",
"分流电阻噪声滤波"
],
"흐린 RL2·RL3(220Ω)은 과전류 실험 때 하나씩 추가합니다. RL1만 11mA → +RL2 21mA 경고 → +RL3 26mA 위험·차단.": [
"The faded RL2 and RL3 (220Ω) are added one at a time for the over-current test. RL1 only 11mA → +RL2 21mA warning → +RL3 26mA danger and cut-off.",
"薄く表示したRL2・RL3（220Ω）は過電流テストで1本ずつ追加します。RL1のみ11mA → +RL2 21mA 警告 → +RL3 26mA 危険・遮断。",
"半透明的 RL2、RL3（220Ω）在过流实验时逐个加入。仅 RL1 为 11mA → 加 RL2 21mA 警告 → 加 RL3 26mA 危险并切断。"
],
"32행 = 부하 시작점(릴레이 NO가 들어올 곳), 36·38행 = 션트 위쪽, 42행 = GND입니다.": [
"Row 32 = start of the load (where the relay NO arrives), rows 36 and 38 = top of the shunt, row 42 = GND.",
"32行 = 負荷の始点（リレーNOが来るところ）、36・38行 = シャントの上側、42行 = GNDです。",
"第 32 行 = 负载起点（继电器 NO 接入处），第 36、38 行 = 分流电阻上端，第 42 行 = GND。"
],
"RS1·RS2는 둘 다 38행과 42행 사이에 꽂아 병렬로 만듭니다. 42행은 반드시 GND 레일로 갑니다.": [
"Plug RS1 and RS2 both between rows 38 and 42 so they are in parallel. Row 42 must go to the GND rail.",
"RS1・RS2はどちらも38行と42行の間に挿して並列にします。42行は必ずGNDレールへ。",
"RS1 和 RS2 都插在第 38 行和第 42 行之间，构成并联。第 42 行必须接 GND 轨。"
],
"330Ω 색띠: 주·주·갈, 220Ω: 빨·빨·갈.": [
"330Ω bands: orange, orange, brown; 220Ω: red, red, brown.",
"330Ωのカラーコード：橙・橙・茶、220Ω：赤・赤・茶。",
"330Ω 色环：橙、橙、棕；220Ω：红、红、棕。"
],
"릴레이 모듈": [
"Relay module",
"リレーモジュール",
"继电器模块"
],
"4단계": [
"Step 4",
"ステップ4",
"第 4 步"
],
"릴레이는 부하를 끊는 스위치(실제 BMS의 컨택터)입니다. 아래 보드 바깥쪽(앞)에 두고 COM은 5V 레일, NO는 32행(부하 시작점)으로 연결합니다. 신호 S는 GPIO26 줄(C10)로 갑니다.": [
"The relay is the switch that cuts the load (the contactor in a real BMS). Place it outside the lower board (front). COM goes to the 5V rail and NO to row 32 (start of the load). Signal S goes to the GPIO26 row (C10).",
"リレーは負荷を切るスイッチ（実際のBMSのコンタクタ）です。下ボードの外側（手前）に置き、COMは5Vレール、NOは32行（負荷の始点）へつなぎます。信号SはGPIO26の行（C10）へ。",
"继电器是切断负载的开关（相当于真实 BMS 的接触器）。放在下面包板外侧（前方），COM 接 5V 轨，NO 接第 32 行（负载起点）。信号 S 接 GPIO26 所在行（C10）。"
],
"COM·NO 단자는 작은 드라이버로 나사를 풀고 수 점퍼 끝을 넣은 뒤 조입니다.": [
"For the COM and NO terminals, loosen the screw with a small screwdriver, insert the male jumper end and tighten.",
"COM・NO端子は小さなドライバーでねじをゆるめ、オスのジャンパー先を入れて締めます。",
"COM、NO 端子用小螺丝刀拧松，插入公头跳线后拧紧。"
],
"부하 선은 반드시 NO 단자입니다. NC에 꽂으면 릴레이가 꺼져 있을 때 전류가 흘러 동작이 거꾸로 됩니다.": [
"The load wire must go to NO. On NC, current flows while the relay is off and everything works backwards.",
"負荷線は必ずNO端子です。NCにつなぐとリレーが切れているときに電流が流れ、動作が逆になります。",
"负载线必须接 NO 端子。接到 NC 时，继电器断开反而有电流，动作完全相反。"
],
"신호 핀이 오른쪽에 오게 놓으면 나사 단자는 위에서부터 NO · COM · NC 순서입니다. 기판 인쇄로 한 번 더 확인하세요.": [
"With the signal pins on the right, the screw terminals read NO · COM · NC from the top. Double-check against the board printing.",
"信号ピンを右にして置くと、ねじ端子は上から NO・COM・NC の順です。基板の印刷でもう一度確認してください。",
"信号引脚朝右放置时，螺丝端子从上到下依次为 NO · COM · NC。请再对照板上丝印确认。"
],
"수동 부저 모듈 → GPIO25": [
"Passive buzzer module → GPIO25",
"パッシブブザーモジュール → GPIO25",
"无源蜂鸣器模块 → GPIO25"
],
"5단계": [
"Step 5",
"ステップ5",
"第 5 步"
],
"수동 부저 모듈을 위 보드 C32~C34에 꽂습니다(− + S 순서). +는 3V3 레일, −는 GND 레일, S는 GPIO25 줄(아래 보드 C11)로 갑니다.": [
"Plug the passive buzzer module into upper board C32–C34 (order − + S). + goes to the 3V3 rail, − to the GND rail and S to the GPIO25 row (lower board C11).",
"パッシブブザーモジュールを上ボードC32〜C34に挿します（− + S の順）。+は3V3レール、−はGNDレール、SはGPIO25の行（下ボードC11）へ。",
"把无源蜂鸣器模块插到上面包板 C32~C34（顺序 − + S）。+ 接 3V3 轨，− 接 GND 轨，S 接 GPIO25 所在行（下板 C11）。"
],
"핀 순서가 다르면 기판 인쇄대로 32·33·34행에 맞춰 꽂으세요.": [
"If your pin order differs, follow the board printing and match rows 32, 33 and 34.",
"ピン順が違う場合は基板の印刷どおりに32・33・34行へ合わせてください。",
"如果引脚顺序不同，请按板上丝印对齐第 32、33、34 行。"
],
"펌웨어가 tone()으로 주파수를 넣어 울리므로 수동 부저에 맞습니다.": [
"The firmware drives it with tone(), so it needs a passive buzzer.",
"ファームウェアはtone()で周波数を与えて鳴らすので、パッシブブザーが合います。",
"固件用 tone() 输出频率驱动，因此需要无源蜂鸣器。"
],
"DS18B20 온도센서 → GPIO4": [
"DS18B20 temperature sensor → GPIO4",
"DS18B20温度センサ → GPIO4",
"DS18B20 温度传感器 → GPIO4"
],
"6단계": [
"Step 6",
"ステップ6",
"第 6 步"
],
"검은 기판 디지털 온도 센서(DS18B20)를 위 보드 C26~C28에 꽂습니다(S + − 순서). S는 GPIO4 줄(I7), +는 3V3, −는 GND입니다.": [
"Plug the black-board digital temperature sensor (DS18B20) into upper board C26–C28 (order S + −). S goes to the GPIO4 row (I7), + to 3V3 and − to GND.",
"黒い基板のデジタル温度センサ（DS18B20）を上ボードC26〜C28に挿します（S + − の順）。SはGPIO4の行（I7）、+は3V3、−はGNDです。",
"把黑色电路板的数字温度传感器（DS18B20）插到上面包板 C26~C28（顺序 S + −）。S 接 GPIO4 所在行（I7），+ 接 3V3，− 接 GND。"
],
"+를 5V에 꽂으면 ESP32 입력에 5V가 걸립니다. 반드시 위 보드 3V3 레일입니다.": [
"On 5V the ESP32 input would see 5V. It must be the upper board's 3V3 rail.",
"+を5Vにつなぐと、ESP32の入力に5Vがかかります。必ず上ボードの3V3レールです。",
"+ 若接 5V，ESP32 输入会承受 5V。必须接上面包板的 3V3 轨。"
],
"빨간 기판의 아날로그 온도 센서 모듈과 헷갈리지 마세요.": [
"Don't mix it up with the red-board analog temperature module.",
"赤い基板のアナログ温度センサモジュールと間違えないでください。",
"不要与红色电路板的模拟温度传感器模块混淆。"
],
"RGB LED 모듈": [
"RGB LED module",
"RGB LEDモジュール",
"RGB LED 模块"
],
"7단계": [
"Step 7",
"ステップ7",
"第 7 步"
],
"RGB 모듈(− R G B)을 아래 보드 J44~J47에 꽂고, 색마다 330Ω을 거쳐 49·50·51행으로 뺀 뒤 GPIO27·14·33 줄로 연결합니다.": [
"Plug the RGB module (− R G B) into lower board J44–J47. Each color goes through a 330Ω to rows 49, 50 and 51, then to the GPIO27, 14 and 33 rows.",
"RGBモジュール（− R G B）を下ボードJ44〜J47に挿し、色ごとに330Ωを通して49・50・51行へ出し、GPIO27・14・33の行へつなぎます。",
"把 RGB 模块（− R G B）插到下面包板 J44~J47，每种颜色经 330Ω 引到第 49、50、51 行，再接到 GPIO27、14、33 所在行。"
],
"저항(R)": [
"Resistor (R)",
"抵抗（R）",
"电阻（R）"
],
"빨강 전류 제한": [
"Red current limit",
"赤の電流制限",
"红色限流"
],
"저항(G)": [
"Resistor (G)",
"抵抗（G）",
"电阻（G）"
],
"초록 전류 제한": [
"Green current limit",
"緑の電流制限",
"绿色限流"
],
"저항(B)": [
"Resistor (B)",
"抵抗（B）",
"电阻（B）"
],
"파랑 전류 제한": [
"Blue current limit",
"青の電流制限",
"蓝色限流"
],
"B9 = GPIO27(빨강), B8 = GPIO14(초록), B12 = GPIO33(파랑) 줄입니다.": [
"B9 = GPIO27 (red), B8 = GPIO14 (green), B12 = GPIO33 (blue).",
"B9 = GPIO27（赤）、B8 = GPIO14（緑）、B12 = GPIO33（青）の行です。",
"B9 = GPIO27（红），B8 = GPIO14（绿），B12 = GPIO33（蓝）。"
],
"모듈 핀 순서가 다르면 기판 인쇄대로 맞춰 주세요. 정상일 때 초록이 아니라면 색 선이 한 칸씩 밀린 것입니다.": [
"If your module's pin order differs, follow its printing. If it isn't green when normal, the color wires are shifted by one.",
"モジュールのピン順が違う場合は印刷どおりに合わせてください。正常時に緑でなければ、色の線が1つずつずれています。",
"模块引脚顺序不同时请按丝印调整。正常状态下不是绿色，说明颜色线错开了一位。"
],
"푸시버튼 → GPIO13": [
"Push button → GPIO13",
"押しボタン → GPIO13",
"按键 → GPIO13"
],
"8단계": [
"Step 8",
"ステップ8",
"第 8 步"
],
"버튼을 아래 보드 가운데 홈에 걸쳐 J53·J55·A53·A55에 꽂습니다. 누르면 53행과 55행이 이어져 GPIO13이 GND가 됩니다.": [
"Plug the button across the center channel of the lower board at J53, J55, A53 and A55. Pressing it joins rows 53 and 55 and pulls GPIO13 to GND.",
"ボタンを下ボード中央の溝をまたいでJ53・J55・A53・A55に挿します。押すと53行と55行がつながり、GPIO13がGNDになります。",
"把按键跨在下面包板中间的凹槽上，插在 J53、J55、A53、A55。按下时第 53 行与第 55 行接通，GPIO13 被拉到 GND。"
],
"다리가 홈을 가로지르게 꽂아야 합니다. 90° 돌려 꽂으면 항상 눌린 상태가 됩니다.": [
"The legs must straddle the channel. Turned 90°, the button reads as always pressed.",
"足が溝をまたぐように挿します。90°回して挿すと常に押された状態になります。",
"引脚必须跨过凹槽。旋转 90° 插入会一直处于按下状态。"
],
"C5는 GPIO13 줄입니다(INPUT_PULLUP).": [
"C5 is the GPIO13 row (INPUT_PULLUP).",
"C5はGPIO13の行です（INPUT_PULLUP）。",
"C5 是 GPIO13 所在行（INPUT_PULLUP）。"
],
"3.5인치 TFT 전원": [
"3.5\" TFT power",
"3.5インチTFTの電源",
"3.5 寸 TFT 电源"
],
"9단계": [
"Step 9",
"ステップ9",
"第 9 步"
],
"3.5인치 TFT를 위 보드 바깥쪽(뒤)에 화면이 위로 오게 두고, 뒷면 9핀 헤더(GND VCC SCL SDA RST DC CS BL SDO)를 보드 쪽으로 향하게 합니다. 전원은 모두 위 보드 레일(3V3)에서 받습니다.": [
"Place the 3.5\" TFT outside the upper board (back), screen up, with its 9-pin header (GND VCC SCL SDA RST DC CS BL SDO) facing the board. All power comes from the upper board rails (3V3).",
"3.5インチTFTを上ボードの外側（奥）に画面を上にして置き、裏の9ピンヘッダ（GND VCC SCL SDA RST DC CS BL SDO）をボード側に向けます。電源はすべて上ボードのレール（3V3）から取ります。",
"把 3.5 寸 TFT 放在上面包板外侧（后方），屏幕朝上，背面 9 针排针（GND VCC SCL SDA RST DC CS BL SDO）朝向面包板。电源全部取自上面包板电源轨（3V3）。"
],
"VCC는 3V3로 연결합니다. 판매처 사양에서 5V 입력이 확인되기 전에는 5V를 넣지 마세요.": [
"Connect VCC to 3V3. Don't feed it 5V unless the seller's spec confirms 5V input.",
"VCCは3V3につなぎます。販売元の仕様で5V入力が確認できるまで5Vを入れないでください。",
"VCC 接 3V3。在确认卖家规格支持 5V 输入之前，不要接 5V。"
],
"BL(백라이트)을 3V3에 연결하면 화면이 항상 켜집니다.": [
"With BL (backlight) on 3V3 the screen is always lit.",
"BL（バックライト）を3V3につなぐと画面は常に点灯します。",
"BL（背光）接 3V3 时屏幕常亮。"
],
"SDO는 쓰지 않으니 비워 둡니다.": [
"SDO is unused; leave it open.",
"SDOは使わないので空けておきます。",
"SDO 不使用，悬空即可。"
],
"TFT SPI 신호선": [
"TFT SPI signals",
"TFT SPI信号線",
"TFT SPI 信号线"
],
"10단계": [
"Step 10",
"ステップ10",
"第 10 步"
],
"ESP32 위쪽 핀 줄(위 보드 J열)에서 TFT 신호 핀으로 5가닥을 연결합니다. 모두 3.3V 신호라 그대로 연결하면 됩니다.": [
"Run 5 wires from the ESP32 upper pin row (upper board column J) to the TFT signal pins. They are all 3.3V signals, so connect them directly.",
"ESP32上側ピン列（上ボードJ列）からTFTの信号ピンへ5本つなぎます。すべて3.3V信号なのでそのまま接続できます。",
"从 ESP32 上排引脚（上面包板 J 列）向 TFT 信号引脚连接 5 根线。都是 3.3V 信号，可直接连接。"
],
"화면이 하얗게만 나오면 SPI 속도를 10MHz로 낮추고, 그래도 안 되면 config.h의 TFT_DRIVER_ST7796을 0(ILI9488)으로 바꿔 보세요.": [
"If the screen stays white, lower SPI to 10MHz; if that fails, set TFT_DRIVER_ST7796 to 0 (ILI9488) in config.h.",
"画面が白いままならSPI速度を10MHzに下げ、それでもだめならconfig.hのTFT_DRIVER_ST7796を0（ILI9488）に変えてみてください。",
"如果屏幕一直是白色，把 SPI 速度降到 10MHz；仍不行就把 config.h 中的 TFT_DRIVER_ST7796 改为 0（ILI9488）。"
],
"전압 측정 위치 (5V 감시)": [
"Voltage test points (5V monitor)",
"電圧の測定ポイント（5V監視）",
"电压测量点（5V 监测）"
],
"측정": [
"Measure",
"測定",
"测量"
],
"멀티미터를 DC V에 놓고 검은 리드는 아래 보드 − 레일(GND)에 고정한 채, 빨간 리드를 ①→②→③ 순서로 대 보세요. 화면의 VBUS가 0V 근처로 나오면 어디서 끊겼는지 알 수 있습니다.": [
"Set the multimeter to DC V, clip the black lead to the lower board − rail (GND), then touch the red lead to ① → ② → ③. If VBUS reads near 0V, this shows where the break is.",
"テスターをDC Vにし、黒リードを下ボードの − レール（GND）に固定して、赤リードを ①→②→③ の順に当てます。画面のVBUSが0V付近なら、どこで切れているか分かります。",
"万用表打到直流电压档，黑表笔固定在下面包板的 − 轨（GND），红表笔依次接触 ① → ② → ③。若屏幕 VBUS 接近 0V，可据此找到断开的位置。"
],
"5V 레일": [
"5V rail",
"5Vレール",
"5V 轨"
],
"약 4.6~5.1V": [
"about 4.6–5.1V",
"約4.6〜5.1V",
"约 4.6~5.1V"
],
"분배 점 25행 (R1·R2 사이)": [
"Divider point, row 25 (between R1 and R2)",
"分圧点 25行（R1とR2の間）",
"分压点第 25 行（R1 与 R2 之间）"
],
"약 2.3~2.5V": [
"about 2.3–2.5V",
"約2.3〜2.5V",
"约 2.3~2.5V"
],
"GPIO34 줄 15행": [
"GPIO34 row, row 15",
"GPIO34の行 15行",
"GPIO34 所在行第 15 行"
],
"②와 같은 값": [
"same as ②",
"②と同じ値",
"与 ② 相同"
],
"검은 리드 (GND)": [
"Black lead (GND)",
"黒リード（GND）",
"黑表笔（GND）"
],
"여기에 고정": [
"clip here",
"ここに固定",
"固定在这里"
],
"① 이 0V면: ESP32 5V 핀 → 5V 레일 점퍼(A1)를 확인하세요.": [
"If ① is 0V: check the jumper from the ESP32 5V pin to the 5V rail (A1).",
"① が0Vなら：ESP32の5Vピン → 5Vレールのジャンパー（A1）を確認。",
"① 为 0V：检查 ESP32 5V 引脚 → 5V 轨的跳线（A1）。"
],
"① 은 정상인데 ② 가 0V면: R1·R2와 29행 GND 점퍼를 확인하세요.": [
"If ① is fine but ② is 0V: check R1, R2 and the GND jumper on row 29.",
"① は正常で ② が0Vなら：R1・R2と29行のGNDジャンパーを確認。",
"① 正常但 ② 为 0V：检查 R1、R2 和第 29 行的 GND 跳线。"
],
"② 는 정상인데 ③ 이 0V면: J25 → B15 점퍼가 한 칸 밀린 것입니다. 34 바로 옆이 35입니다.": [
"If ② is fine but ③ is 0V: the J25 → B15 jumper is off by one hole. Pin 35 sits right next to 34.",
"② は正常で ③ が0Vなら：J25 → B15のジャンパーが1穴ずれています。34のすぐ隣が35です。",
"② 正常但 ③ 为 0V：J25 → B15 的跳线错了一个孔。34 旁边就是 35。"
],
"멀티미터가 없으면 220Ω + LED를 5V 레일과 GND 사이에 꽂아 레일에 전기가 오는지 볼 수 있습니다.": [
"Without a multimeter, plug a 220Ω + LED between the 5V rail and GND to see whether the rail is powered.",
"テスターがなければ、220Ω + LEDを5VレールとGNDの間に挿すと、レールに電気が来ているか分かります。",
"没有万用表时，在 5V 轨与 GND 之间插上 220Ω + LED，即可看出电源轨是否有电。"
],
"최종 점검": [
"Final check",
"最終チェック",
"最终检查"
],
"완성": [
"Done",
"完成",
"完成"
],
"모든 부품이 연결된 모습입니다. USB를 꽂기 전에 아래를 확인하세요.": [
"Everything is connected. Check the list below before plugging in USB.",
"すべての部品をつないだ状態です。USBを挿す前に次を確認してください。",
"所有元件都已连接。插上 USB 之前请确认以下各项。"
],
"5V를 GPIO34에 직접 꽂지 않고 R1·R2(25행)를 거쳤는가": [
"5V reaches GPIO34 only through R1 and R2 (row 25), never directly",
"5VがGPIO34へ直接ではなくR1・R2（25行）を通っているか",
"5V 经过 R1、R2（第 25 行）而不是直接接到 GPIO34"
],
"RS1·RS2(38~42행)가 GND로 가는가": [
"RS1 and RS2 (rows 38–42) go to GND",
"RS1・RS2（38〜42行）がGNDへつながっているか",
"RS1、RS2（第 38~42 行）接到 GND"
],
"릴레이 부하 선이 NC가 아니라 NO 단자에 있는가": [
"The relay load wire is on NO, not NC",
"リレーの負荷線がNCではなくNO端子にあるか",
"继电器负载线接在 NO 而不是 NC 端子"
],
"RL2·RL3는 빼 두었는가 (과전류 실험 때만 꽂음)": [
"RL2 and RL3 are removed (only for the over-current test)",
"RL2・RL3を外してあるか（過電流テストのときだけ挿す）",
"已拔掉 RL2、RL3（仅过流实验时插入）"
],
"DS18B20·수동 부저의 +가 위 보드 3V3 레일에 있는가": [
"The + of the DS18B20 and the buzzer is on the upper board's 3V3 rail",
"DS18B20とブザーの+が上ボードの3V3レールにあるか",
"DS18B20 和蜂鸣器的 + 接在上面包板的 3V3 轨"
],
"TFT VCC·BL이 위 보드 3V3 레일에 있고 SDO는 비어 있는가": [
"TFT VCC and BL are on the upper 3V3 rail and SDO is open",
"TFTのVCC・BLが上ボードの3V3レールにあり、SDOが空いているか",
"TFT 的 VCC、BL 接在上面包板 3V3 轨，SDO 悬空"
],
"펌웨어 v3를 올렸는가 (부팅 화면에 FW v3 표시)": [
"Firmware v3 is loaded (the boot screen shows FW v3)",
"ファームウェアv3を書き込んだか（起動画面にFW v3と表示）",
"已烧录固件 v3（开机画面显示 FW v3）"
],
"세라믹 커패시터 · 방향 없음": [
"Ceramic capacitor · no polarity",
"セラミックコンデンサ・極性なし",
"陶瓷电容 · 无极性"
],
"DS18B20 디지털 온도 센서": [
"DS18B20 digital temperature sensor",
"DS18B20デジタル温度センサ",
"DS18B20 数字温度传感器"
],
"센서 키트 검은 기판 · 1-Wire · 정확도 ±0.5°C": [
"Sensor kit black board · 1-Wire · ±0.5°C accuracy",
"センサキットの黒基板・1-Wire・精度±0.5°C",
"传感器套件黑色电路板 · 1-Wire · 精度 ±0.5°C"
],
"수동 부저 모듈": [
"Passive buzzer module",
"パッシブブザーモジュール",
"无源蜂鸣器模块"
],
"센서 키트 · tone()으로 주파수를 넣어 울림": [
"Sensor kit · sounds at the frequency set by tone()",
"センサキット・tone()で与えた周波数で鳴る",
"传感器套件 · 按 tone() 设定的频率发声"
],
"RGB SMD LED 모듈": [
"RGB SMD LED module",
"RGB SMD LEDモジュール",
"RGB SMD LED 模块"
],
"부품시트 3색 LED · 4단계 상태 색 표시": [
"Three-color LED · shows the 4 status levels",
"3色LED・4段階の状態を色で表示",
"三色 LED · 用颜色显示 4 级状态"
],
"푸시버튼 (택트 스위치)": [
"Push button (tact switch)",
"押しボタン（タクトスイッチ）",
"按键（轻触开关）"
],
"누르면 53행과 55행이 연결": [
"Pressing joins rows 53 and 55",
"押すと53行と55行がつながる",
"按下时第 53 行与第 55 行接通"
],
"짧게: 부하 ON/OFF · 길게(1.5초): 그래프 모드": [
"Short press: load ON/OFF · long (1.5 s): plot mode",
"短押し：負荷ON/OFF・長押し（1.5秒）：グラフモード",
"短按：负载开/关 · 长按（1.5 秒）：曲线模式"
],
"아래쪽 핀 줄 → 아래 보드 D열, 위쪽 핀 줄 → 위 보드 F열 (1~19행)": [
"Lower pin row → lower board column D, upper pin row → upper board column F (rows 1–19)",
"下側ピン列 → 下ボードD列、上側ピン列 → 上ボードF列（1〜19行）",
"下排引脚 → 下面包板 D 列，上排引脚 → 上面包板 F 列（第 1~19 行）"
],
"안테나는 왼쪽, USB는 오른쪽": [
"Antenna on the left, USB on the right",
"アンテナは左、USBは右",
"天线在左，USB 在右"
],
"같은 행의 빈 구멍이 그 핀과 연결됩니다": [
"Empty holes in the same row connect to that pin",
"同じ行の空いた穴がそのピンにつながります",
"同一行的空孔与该引脚相连"
],
"5V 릴레이 모듈": [
"5V relay module",
"5Vリレーモジュール",
"5V 继电器模块"
],
"신호 핀 S · + · − (앞쪽), 나사 단자 NO · COM · NC (뒤쪽)": [
"Signal pins S · + · − (front), screw terminals NO · COM · NC (back)",
"信号ピン S・+・−（手前）、ねじ端子 NO・COM・NC（奥）",
"信号引脚 S · + · −（前侧），螺丝端子 NO · COM · NC（后侧）"
],
"GPIO26 HIGH → NO와 COM 연결 → 부하 전류 흐름": [
"GPIO26 HIGH → NO joins COM → load current flows",
"GPIO26 HIGH → NOとCOMが接続 → 負荷電流が流れる",
"GPIO26 高电平 → NO 与 COM 接通 → 负载电流流动"
],
"센서 키트 · 위험 단계에서 부하 차단(컨택터 역할)": [
"Sensor kit · cuts the load at the danger level (contactor)",
"センサキット・危険段階で負荷を遮断（コンタクタの役割）",
"传感器套件 · 危险时切断负载（接触器作用）"
],
"3.5인치 TFT (320×480, SPI)": [
"3.5\" TFT (320×480, SPI)",
"3.5インチTFT（320×480、SPI）",
"3.5 寸 TFT（320×480，SPI）"
],
"9핀: GND VCC SCL SDA RST DC CS BL SDO": [
"9 pins: GND VCC SCL SDA RST DC CS BL SDO",
"9ピン：GND VCC SCL SDA RST DC CS BL SDO",
"9 针：GND VCC SCL SDA RST DC CS BL SDO"
],
"컨트롤러 ST7796S 또는 ILI9488 (LovyanGFX)": [
"Controller ST7796S or ILI9488 (LovyanGFX)",
"コントローラ ST7796S または ILI9488（LovyanGFX）",
"控制器 ST7796S 或 ILI9488（LovyanGFX）"
],
"현장 대시보드: 상태 배너 · 수치 4칸 · 2분 추이 그래프": [
"On-site dashboard: status banner · 4 value tiles · 2-minute trend charts",
"現場ダッシュボード：状態バナー・数値4枠・2分間の推移グラフ",
"现场仪表盘：状态横幅 · 4 个数值格 · 2 分钟趋势图"
],
"멀티미터 COM(검은 리드)": [
"Multimeter COM (black lead)",
"テスターCOM（黒リード）",
"万用表 COM（黑表笔）"
],
"멀티미터 V(빨간 리드)": [
"Multimeter V (red lead)",
"テスターV（赤リード）",
"万用表 V（红表笔）"
],
"푸시버튼": [
"Push button",
"押しボタン",
"按键"
],
"DS18B20 모듈": [
"DS18B20 module",
"DS18B20モジュール",
"DS18B20 模块"
],
"설정값": [
"Settings",
"設定値",
"设定值"
],
"측정·필터": [
"Measure · filter",
"測定・フィルタ",
"测量 · 滤波"
],
"판정·예측": [
"Judge · forecast",
"判定・予測",
"判定 · 预测"
],
"보호": [
"Protection",
"保護",
"保护"
],
"클릭: 버튼 누르기 (부하 ON/OFF · TRIP 리셋)": [
"Click: press the button (load ON/OFF · TRIP reset)",
"クリック：ボタンを押す（負荷ON/OFF・TRIPリセット）",
"点击：按下按键（负载开/关 · TRIP 复位）"
],
"클릭: RL2 꽂기 / 빼기": [
"Click: insert / remove RL2",
"クリック：RL2を挿す／抜く",
"点击：插入 / 拔出 RL2"
],
"클릭: RL3 꽂기 / 빼기": [
"Click: insert / remove RL3",
"クリック：RL3を挿す／抜く",
"点击：插入 / 拔出 RL3"
],
"클릭: 손으로 쥐기 / 놓기": [
"Click: hold in hand / let go",
"クリック：手で握る／離す",
"点击：用手握住 / 松开"
],
"레일은 세로로 전부 연결됩니다": [
"Each rail is connected along its whole length",
"レールは縦方向に全部つながっています",
"电源轨纵向全部连通"
],
"위험 래치 상태 - 리셋 후 부하 ON 가능": [
"Latched on danger - reset before turning the load on",
"危険でラッチ中 - リセット後に負荷ONできます",
"危险锁定中 - 复位后才能打开负载"
],
"아직 위험 조건이 남아 있어 리셋 불가": [
"Still in danger - reset refused",
"まだ危険条件が残っているためリセット不可",
"仍处于危险状态，无法复位"
],
"아직 위험 조건이 남아 있어 리셋할 수 없어요": [
"Still in danger, so it can't be reset yet",
"まだ危険条件が残っているのでリセットできません",
"仍处于危险状态，暂时无法复位"
],
"가상 실습실": [
"Virtual lab",
"バーチャル実習室",
"虚拟实验室"
],
"BMS를 직접 조작해 보세요": [
"Run the BMS yourself",
"BMSを実際に操作してみよう",
"亲手操作 BMS"
],
"3D에서 버튼, RL2·RL3 저항, 온도센서를 누르면 실제 보드처럼 반응합니다. 화면 값은 펌웨어와 같은 규칙으로 계산한 가상 데이터입니다.": [
"Click the button, the RL2 and RL3 resistors or the temperature sensor in 3D and the board reacts like the real one. The values are simulated with the same rules as the firmware.",
"3Dでボタン、RL2・RL3抵抗、温度センサをクリックすると実機と同じように反応します。画面の値はファームウェアと同じ規則で計算した仮想データです。",
"在 3D 中点击按键、RL2/RL3 电阻或温度传感器，它会像真实电路板一样反应。屏幕上的数值是按与固件相同规则计算的模拟数据。"
],
"TFT 화면": [
"TFT screen",
"TFT画面",
"TFT 屏幕"
],
"부하": [
"Load",
"負荷",
"负载"
],
"TRIP 리셋": [
"Reset TRIP",
"TRIPリセット",
"TRIP 复位"
],
"시험 상황": [
"Test scenarios",
"テスト状況",
"测试情景"
],
"센서 손으로 쥐기": [
"Hold the sensor in your hand",
"センサを手で握る",
"用手握住传感器"
],
"뜨거운 물에 넣기": [
"Dip it in hot water",
"お湯に入れる",
"放入热水"
],
"저전압 (R2에 10kΩ 병렬)": [
"Under-voltage (10kΩ across R2)",
"低電圧（R2に10kΩ並列）",
"欠压（R2 并联 10kΩ）"
],
"과전압 (3V3 → GPIO34)": [
"Over-voltage (3V3 → GPIO34)",
"過電圧（3V3 → GPIO34）",
"过压（3V3 → GPIO34）"
],
"시간": [
"Time",
"時間",
"时间"
],
"시리얼 모니터": [
"Serial monitor",
"シリアルモニタ",
"串口监视器"
],
"지우기": [
"Clear",
"クリア",
"清除"
],
"경고 이상이면 실제 보드에서는 웹 대시보드(192.168.4.1)에 팝업이 뜨고 스마트폰이 진동합니다.": [
"At warning or above, the real board also pops up an alert on the web dashboard (192.168.4.1) and vibrates the phone.",
"警告以上になると、実機ではWebダッシュボード（192.168.4.1）にポップアップが出てスマートフォンが振動します。",
"达到警告及以上时，真实电路板还会在网页仪表盘（192.168.4.1）弹出提示并让手机振动。"
],
"부하 끄기": [
"Turn load off",
"負荷を切る",
"关闭负载"
],
"부하 켜기": [
"Turn load on",
"負荷を入れる",
"打开负载"
],
"RL2 빼기": [
"Remove RL2",
"RL2を抜く",
"拔出 RL2"
],
"RL2 220Ω 꽂기": [
"Insert RL2 220Ω",
"RL2 220Ωを挿す",
"插入 RL2 220Ω"
],
"RL3 빼기": [
"Remove RL3",
"RL3を抜く",
"拔出 RL3"
],
"RL3 220Ω 꽂기": [
"Insert RL3 220Ω",
"RL3 220Ωを挿す",
"插入 RL3 220Ω"
],
"멈추기": [
"Pause",
"一時停止",
"暂停"
],
"다시 시작": [
"Resume",
"再開",
"继续"
],
"순서대로 연결": [
"Wire it step by step",
"順番に配線",
"按顺序接线"
],
"ESP32 핀 표": [
"ESP32 pin table",
"ESP32ピン表",
"ESP32 引脚表"
],
"단계 선택": [
"Choose a step",
"ステップを選ぶ",
"选择步骤"
],
"부품": [
"Part",
"部品",
"元件"
],
"꽂는 위치": [
"Where it goes",
"挿す位置",
"插接位置"
],
"실험 때": [
"for tests",
"テスト時",
"实验时"
],
"순서": [
"Order",
"順番",
"顺序"
],
"대는 곳": [
"Probe point",
"当てる場所",
"测量点"
],
"정상 값": [
"Expected",
"正常値",
"正常值"
],
"점퍼": [
"Jumper",
"ジャンパー",
"跳线"
],
"한쪽 끝": [
"One end",
"一方の端",
"一端"
],
"다른 끝": [
"Other end",
"もう一方の端",
"另一端"
],
"이전 단계": [
"Previous step",
"前のステップ",
"上一步"
],
"다음 단계": [
"Next step",
"次のステップ",
"下一步"
],
"사용하는 핀과 연결 구멍입니다. 줄을 누르면 그 단계로 이동합니다.": [
"The pins in use and the holes they connect to. Click a row to jump to that step.",
"使うピンと接続する穴です。行をクリックするとそのステップへ移動します。",
"使用的引脚及其连接的孔。点击某一行可跳到该步骤。"
],
"ESP32 핀": [
"ESP32 pin",
"ESP32ピン",
"ESP32 引脚"
],
"구멍": [
"Hole",
"穴",
"孔位"
],
"연결 대상": [
"Connects to",
"接続先",
"连接到"
],
"위쪽 핀 줄의 안테나 쪽 끝(19행) 핀은 쓰지 않습니다. GND는 아래쪽 줄 6행, 위쪽 줄 13행 핀을 씁니다.": [
"Don't use the pin at the antenna end of the upper row (row 19). For GND use row 6 on the lower row and row 13 on the upper row.",
"上側ピン列のアンテナ側の端（19行）は使いません。GNDは下側列の6行、上側列の13行のピンを使います。",
"上排靠天线一端（第 19 行）的引脚不用。GND 用下排第 6 行、上排第 13 行的引脚。"
],
"WROOM-32E. 측정·판정·제어, Wi-Fi 웹 서버": [
"WROOM-32E. Measures, judges, controls; Wi-Fi web server",
"WROOM-32E。測定・判定・制御、Wi-Fi Webサーバー",
"WROOM-32E。测量、判定、控制，Wi-Fi 网页服务器"
],
"브레드보드 830홀": [
"Breadboard, 830 holes",
"ブレッドボード830穴",
"830 孔面包板"
],
"두 장 사이에 ESP32를 걸쳐 꽂음": [
"The ESP32 straddles the two boards",
"2枚の間にESP32をまたいで挿す",
"ESP32 横跨两块板插入"
],
"3.5인치 TFT LCD": [
"3.5\" TFT LCD",
"3.5インチTFT LCD",
"3.5 寸 TFT LCD"
],
"480×320, ST7796S, SPI. 현장 대시보드": [
"480×320, ST7796S, SPI. On-site dashboard",
"480×320、ST7796S、SPI。現場ダッシュボード",
"480×320，ST7796S，SPI。现场仪表盘"
],
"릴레이 모듈 SRD-05VDC": [
"Relay module SRD-05VDC",
"リレーモジュール SRD-05VDC",
"继电器模块 SRD-05VDC"
],
"5V 1채널. COM·NO로 부하 연결·차단": [
"5V, 1 channel. COM and NO connect or cut the load",
"5V・1チャンネル。COM・NOで負荷を接続・遮断",
"5V 单路。用 COM、NO 接通或切断负载"
],
"DS18B20 온도센서 모듈": [
"DS18B20 temperature sensor module",
"DS18B20温度センサモジュール",
"DS18B20 温度传感器模块"
],
"1-Wire 디지털. +는 3V3": [
"1-Wire digital. + goes to 3V3",
"1-Wireデジタル。+は3V3",
"1-Wire 数字。+ 接 3V3"
],
"tone()으로 단계별 경보음": [
"Alarm tones per level with tone()",
"tone()で段階ごとの警報音",
"用 tone() 按等级发出警报音"
],
"초록 정상 · 노랑 주의 · 주황 경고 · 빨강 위험 · 파랑 TRIP": [
"Green normal · yellow caution · orange warning · red danger · blue TRIP",
"緑 正常・黄 注意・橙 警告・赤 危険・青 TRIP",
"绿 正常 · 黄 注意 · 橙 警告 · 红 危险 · 蓝 TRIP"
],
"택트 스위치": [
"Tact switch",
"タクトスイッチ",
"轻触开关"
],
"부하 ON/OFF, TRIP 리셋": [
"Load ON/OFF, TRIP reset",
"負荷ON/OFF、TRIPリセット",
"负载开/关，TRIP 复位"
],
"저항 10kΩ": [
"Resistor 10kΩ",
"抵抗 10kΩ",
"电阻 10kΩ"
],
"R1·R2 전압 분배 (갈·검·주)": [
"R1 and R2 voltage divider (brown, black, orange)",
"R1・R2 分圧（茶・黒・橙）",
"R1、R2 分压（棕、黑、橙）"
],
"RL1,저항(R),저항(G),저항(B)": [
"RL1,저항(R),저항(G),저항(B)",
"RL1,저항(R),저항(G),저항(B)",
"RL1,저항(R),저항(G),저항(B)"
],
"저항 330Ω": [
"Resistor 330Ω",
"抵抗 330Ω",
"电阻 330Ω"
],
"RL1 부하 1개 + RGB 전류 제한 3개 (주·주·갈)": [
"RL1 load + 3 RGB current limits (orange, orange, brown)",
"RL1負荷1本 + RGB電流制限3本（橙・橙・茶）",
"RL1 负载 1 个 + RGB 限流 3 个（橙、橙、棕）"
],
"저항 220Ω": [
"Resistor 220Ω",
"抵抗 220Ω",
"电阻 220Ω"
],
"RS1·RS2 션트(병렬) + RL2·RL3 과전류 실험용 (빨·빨·갈)": [
"RS1 and RS2 shunt (parallel) + RL2 and RL3 for the over-current test (red, red, brown)",
"RS1・RS2シャント（並列）+ RL2・RL3過電流テスト用（赤・赤・茶）",
"RS1、RS2 分流（并联）+ RL2、RL3 过流实验用（红、红、棕）"
],
"세라믹 콘덴서 100nF (104)": [
"Ceramic capacitor 100nF (104)",
"セラミックコンデンサ 100nF（104）",
"陶瓷电容 100nF（104）"
],
"C1·C2 ADC 입력 잡음 필터": [
"C1 and C2 ADC input noise filters",
"C1・C2 ADC入力のノイズフィルタ",
"C1、C2 ADC 输入噪声滤波"
],
"키트 부품 12종": [
"12 kit parts",
"キット部品12種",
"套件元件 12 种"
],
"부품을 누르면 3D에서 그 위치로 이동합니다.": [
"Click a part to fly to it in 3D.",
"部品をクリックすると3Dでその位置へ移動します。",
"点击元件即可在 3D 中飞到它的位置。"
],
"코드": [
"Code",
"コード",
"代码"
],
"펌웨어 핵심 코드": [
"Core firmware code",
"ファームウェアの主要コード",
"固件核心代码"
],
"ESP32_BMS_TFT v3의 실제 코드 일부입니다. Arduino IDE, 라이브러리 OneWire · LovyanGFX.": [
"Excerpts from ESP32_BMS_TFT v3. Arduino IDE with the OneWire and LovyanGFX libraries.",
"ESP32_BMS_TFT v3の実際のコードの一部です。Arduino IDE、ライブラリ OneWire・LovyanGFX。",
"ESP32_BMS_TFT v3 实际代码节选。Arduino IDE，库 OneWire · LovyanGFX。"
],
"코드 복사": [
"Copy code",
"コードをコピー",
"复制代码"
],
"참고": [
"Reference",
"参考",
"参考"
],
"조작법과 기준": [
"Controls and thresholds",
"操作方法と基準",
"操作与判定标准"
],
"3D 조작": [
"3D controls",
"3D操作",
"3D 操作"
],
"회전": [
"Rotate",
"回転",
"旋转"
],
"왼쪽 드래그": [
"Left drag",
"左ドラッグ",
"左键拖动"
],
"확대·축소": [
"Zoom",
"拡大・縮小",
"缩放"
],
"마우스 휠, 두 손가락 벌리기": [
"Mouse wheel, pinch",
"マウスホイール、ピンチ",
"鼠标滚轮，双指捏合"
],
"화면 이동": [
"Pan",
"画面移動",
"平移"
],
"오른쪽 드래그": [
"Right drag",
"右ドラッグ",
"右键拖动"
],
"부품 조작": [
"Use parts",
"部品の操作",
"操作元件"
],
"실습실 모드에서 버튼·RL2·RL3·온도센서 클릭": [
"In Lab mode click the button, RL2, RL3 or the temperature sensor",
"実習室モードでボタン・RL2・RL3・温度センサをクリック",
"在实验室模式点击按键、RL2、RL3 或温度传感器"
],
"단계 이동": [
"Change step",
"ステップ移動",
"切换步骤"
],
"조립 모드에서 ← → 키": [
"← → keys in Build mode",
"組立モードで ← → キー",
"在组装模式按 ← → 键"
],
"보드의 버튼 (GPIO13)": [
"Board button (GPIO13)",
"ボードのボタン（GPIO13）",
"电路板按键（GPIO13）"
],
"짧게": [
"Short press",
"短押し",
"短按"
],
"부하 ON/OFF": [
"Load ON/OFF",
"負荷ON/OFF",
"负载开/关"
],
"짧게 (TRIP 중)": [
"Short press (in TRIP)",
"短押し（TRIP中）",
"短按（TRIP 时）"
],
"리셋. 위험 조건이 남아 있으면 거부": [
"Reset; refused while still in danger",
"リセット。危険条件が残っていれば拒否",
"复位；仍处危险状态时拒绝"
],
"길게 1.5초": [
"Long press 1.5 s",
"長押し1.5秒",
"长按 1.5 秒"
],
"시리얼 플로터 모드 전환": [
"Switch serial plotter mode",
"シリアルプロッタモード切替",
"切换串口绘图模式"
],
"4단계 판정 기준": [
"4-level thresholds",
"4段階の判定基準",
"4 级判定标准"
],
"항목": [
"Item",
"項目",
"项目"
],
"주의": [
"Caution",
"注意",
"注意"
],
"경고": [
"Warning",
"警告",
"警告"
],
"위험": [
"Danger",
"危険",
"危险"
],
"과전압 (V)": [
"Over-voltage (V)",
"過電圧（V）",
"过压（V）"
],
"저전압 (V)": [
"Under-voltage (V)",
"低電圧（V）",
"欠压（V）"
],
"과전류 (mA)": [
"Over-current (mA)",
"過電流（mA）",
"过流（mA）"
],
"과열 (°C)": [
"Over-temperature (°C)",
"過熱（°C）",
"过温（°C）"
],
"온도 상승률 (°C/분)": [
"Temperature rise (°C/min)",
"温度上昇率（°C/分）",
"温升速率（°C/分）"
],
"위험도 지수": [
"Risk index",
"危険度指数",
"危险度指数"
],
"위험 단계가 나오면 릴레이를 끄고 TRIP(래치)을 겁니다. 열폭주 예측: 지금 온도 상승률로 45°C까지 5분 안에 도달하면 경고.": [
"At the danger level the relay opens and a TRIP latch is set. Thermal-runaway forecast: warns if the current rate of rise reaches 45°C within 5 minutes.",
"危険段階になるとリレーを切り、TRIP（ラッチ）をかけます。熱暴走予測：現在の温度上昇率で45°Cに5分以内に達するなら警告。",
"进入危险等级时断开继电器并锁定 TRIP。热失控预测：按当前温升速率若 5 分钟内达到 45°C 则发出警告。"
],
"문제 해결": [
"Troubleshooting",
"トラブルシューティング",
"故障排除"
],
"증상": [
"Symptom",
"症状",
"现象"
],
"원인과 해결": [
"Cause and fix",
"原因と対処",
"原因与对策"
],
"TFT가 흰 화면만 표시": [
"TFT shows only a white screen",
"TFTが白い画面のまま",
"TFT 只显示白屏"
],
"긴 점퍼선에 SPI 40MHz는 빠름 → 10MHz로 낮춤": [
"40MHz SPI is too fast for long jumpers → lowered to 10MHz",
"長いジャンパーにSPI 40MHzは速すぎ → 10MHzに下げた",
"长跳线下 SPI 40MHz 过快 → 降到 10MHz"
],
"LOAD OFF인데 전류가 조금 보임": [
"A little current shows with LOAD OFF",
"LOAD OFFなのに電流が少し出る",
"负载关闭时仍显示少量电流"
],
"ESP32 ADC는 0V에서도 약 0.14V를 읽음 → 릴레이가 꺼져 있을 때 0점 학습": [
"The ESP32 ADC reads about 0.14V even at 0V → learn the zero while the relay is off",
"ESP32のADCは0Vでも約0.14Vを読む → リレーが切れている間に0点を学習",
"ESP32 ADC 在 0V 时也读到约 0.14V → 继电器断开时学习零点"
],
"VBUS가 0V 근처 → 저전압 TRIP": [
"VBUS near 0V → under-voltage TRIP",
"VBUSが0V付近 → 低電圧TRIP",
"VBUS 接近 0V → 欠压 TRIP"
],
"브레드보드 접촉 불량 → LED 시험과 3V3 점퍼 시험으로 범위를 좁힘": [
"Loose breadboard contact → narrowed down with an LED test and a 3V3 jumper test",
"ブレッドボードの接触不良 → LEDテストと3V3ジャンパーテストで範囲を絞った",
"面包板接触不良 → 用 LED 测试和 3V3 跳线测试缩小范围"
],
"VBUS 6.2V, 전류 수백 mA": [
"VBUS 6.2V, current in the hundreds of mA",
"VBUS 6.2V、電流が数百mA",
"VBUS 6.2V，电流数百 mA"
],
"설계와 다른 저항 값 → 10kΩ 분배기, 220Ω×2 병렬 션트로 맞춤": [
"Resistor values differed from the design → 10kΩ divider and 220Ω×2 parallel shunt",
"設計と違う抵抗値 → 10kΩ分圧器、220Ω×2並列シャントに合わせた",
"电阻值与设计不同 → 改为 10kΩ 分压器和 220Ω×2 并联分流"
],
"켜자마자 과전류 TRIP": [
"Over-current TRIP right after power-on",
"電源を入れてすぐ過電流TRIP",
"一上电就过流 TRIP"
],
"실험용 RL2·RL3까지 꽂음 → 평소엔 RL1만": [
"The test resistors RL2 and RL3 were plugged in → normally RL1 only",
"テスト用のRL2・RL3まで挿していた → 普段はRL1だけ",
"把实验用的 RL2、RL3 也插上了 → 平时只插 RL1"
],
"OFF에서 전류, ON에서 0": [
"Current when OFF, 0 when ON",
"OFFで電流が流れ、ONで0",
"关闭时有电流，打开时为 0"
],
"부하 선이 릴레이 NC 단자 → NO로 옮김": [
"The load wire was on the relay's NC terminal → moved to NO",
"負荷線がリレーのNC端子 → NOへ移した",
"负载线接在继电器 NC 端子 → 改接 NO"
],
"정상인데 RGB가 빨강": [
"RGB is red even when normal",
"正常なのにRGBが赤",
"正常状态 RGB 却是红色"
],
"RGB 선이 한 칸씩 밀림 → R·G·B 핀 순서 확인": [
"The RGB wires were shifted by one → check the R, G, B pin order",
"RGBの線が1つずつずれていた → R・G・Bのピン順を確認",
"RGB 线错开了一位 → 检查 R、G、B 引脚顺序"
],
"관련 자료": [
"Related material",
"関連資料",
"相关资料"
],
"3D 조립 가이드 (한국어 원본)": [
"3D assembly guide (Korean original)",
"3D組立ガイド（韓国語オリジナル）",
"3D 组装指南（韩语原版）"
],
"실습 보고서": [
"Lab report",
"実習レポート",
"实验报告"
],
"코드를 복사했어요": [
"Code copied",
"コードをコピーしました",
"已复制代码"
],
"복사가 막혔어요. 코드를 직접 선택해 복사하세요.": [
"Copying was blocked. Select the code and copy it by hand.",
"コピーがブロックされました。コードを選択して手動でコピーしてください。",
"复制被阻止。请手动选中代码复制。"
],
"ESP32 BMS 가상 실습실": [
"ESP32 BMS Virtual Lab",
"ESP32 BMS バーチャル実習室",
"ESP32 BMS 虚拟实验室"
],
"USB 5V · 배터리 없음 · 키트 부품": [
"USB 5V · no battery · kit parts",
"USB 5V・バッテリーなし・キット部品",
"USB 5V · 无电池 · 套件元件"
],
"모드": [
"Modes",
"モード",
"模式"
],
"실습실": [
"Lab",
"実習室",
"实验室"
],
"조립": [
"Build",
"組立",
"组装"
],
"언어": [
"Language",
"言語",
"语言"
],
"3D 작업대": [
"3D workbench",
"3D作業台",
"3D 工作台"
],
"보기": [
"View",
"表示",
"视图"
],
"전체 보기": [
"Overview",
"全体表示",
"整体视图"
],
"위에서": [
"Top view",
"上から",
"俯视"
],
"이번 단계 확대": [
"Zoom to step",
"ステップを拡大",
"放大当前步骤"
],
"완성 모습": [
"Finished build",
"完成形",
"完成效果"
],
"구멍 좌표": [
"Hole labels",
"穴の座標",
"孔位标签"
],
"드래그 회전 · 휠 확대 · 우클릭 드래그 이동 · 부품에 마우스를 올리면 이름이 보입니다": [
"Drag to rotate · wheel to zoom · right-drag to pan · hover a part to see its name",
"ドラッグで回転・ホイールで拡大・右ドラッグで移動・部品にマウスを乗せると名前が表示されます",
"拖动旋转 · 滚轮缩放 · 右键拖动平移 · 鼠标悬停元件可显示名称"
],
"3D 화면을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.": [
"The 3D view could not load. Check your internet connection and refresh.",
"3D画面を読み込めませんでした。インターネット接続を確認して再読み込みしてください。",
"无法加载 3D 画面。请检查网络连接后刷新。"
],
"부품 준비하기": [
"Gather the parts",
"部品をそろえる",
"准备元件"
],
"전원": [
"Power",
"電源",
"电源"
],
"5V 감시": [
"5V monitor",
"5V監視",
"5V 监测"
],
"부하·션트": [
"Load & shunt",
"負荷・シャント",
"负载与分流"
],
"릴레이": [
"Relay",
"リレー",
"继电器"
],
"부저": [
"Buzzer",
"ブザー",
"蜂鸣器"
],
"온도센서": [
"Temp sensor",
"温度センサ",
"温度传感器"
],
"버튼": [
"Button",
"ボタン",
"按键"
],
"TFT 전원": [
"TFT power",
"TFT電源",
"TFT 电源"
],
"TFT 신호": [
"TFT signals",
"TFT信号",
"TFT 信号"
],
"점검": [
"Check",
"チェック",
"检查"
],
"점검하기": [
"Check the build",
"チェックする",
"检查电路"
],
"코드 올리기": [
"Upload the code",
"コードを書き込む",
"上传代码"
],
"운전": [
"Run",
"運転",
"运行"
],
"BMS 운전해 보기": [
"Run the BMS",
"BMSを運転してみよう",
"运行 BMS"
],
"시뮬레이션": [
"Simulation",
"シミュレーション",
"仿真"
],
"가상 BMS 시험대": [
"Virtual BMS test bench",
"仮想BMSテストベンチ",
"虚拟 BMS 试验台"
],
"작업대": [
"Workbench",
"作業台",
"工作台"
],
"3D에서 버튼 · RL2 · RL3 · 온도센서를 눌러 보세요": [
"Click the button · RL2 · RL3 · temperature sensor in 3D",
"3Dでボタン・RL2・RL3・温度センサをクリックしてみよう",
"在 3D 中点击按键 · RL2 · RL3 · 温度传感器试试"
],
"드래그 회전 · 휠 확대 · 부품에 마우스를 올려 보세요": [
"Drag to rotate · wheel to zoom · hover a part",
"ドラッグで回転・ホイールで拡大・部品にマウスを乗せてみよう",
"拖动旋转 · 滚轮缩放 · 鼠标悬停查看元件"
],
"처음부터": [
"Start over",
"最初から",
"从头开始"
],
"다음": [
"Next",
"次へ",
"下一步"
],
"꽂을 부품": [
"Parts to place",
"挿す部品",
"要插的元件"
],
"점퍼선": [
"Jumper wires",
"ジャンパー線",
"跳线"
],
"실습 키트 부품과 USB 5V 하나로 만듭니다. 배터리는 쓰지 않고, 5V 전원 자체를 감시하는 BMS예요.": [
"Built from the lab kit and a single USB 5V supply. No battery: this BMS watches the 5V supply itself.",
"実習キットの部品とUSB 5Vだけで作ります。バッテリーは使わず、5V電源そのものを監視するBMSです。",
"只用实验套件元件和一路 USB 5V 搭建。不用电池，这个 BMS 直接监测 5V 电源本身。"
],
"누르면 3D에서 위치를 보여 줘요": [
"Click one to see where it goes in 3D",
"クリックすると3Dで位置を表示します",
"点击可在 3D 中显示位置"
],
"브레드보드 읽는 법": [
"Reading the breadboard",
"ブレッドボードの読み方",
"面包板的读法"
],
"점퍼선 색": [
"Jumper colors",
"ジャンパーの色",
"跳线颜色"
],
"확인할 점": [
"Things to check",
"確認ポイント",
"注意事项"
],
"측정 위치": [
"Test points",
"測定ポイント",
"测量点"
],
"USB를 꽂기 전 체크리스트": [
"Checklist before plugging in USB",
"USBを挿す前のチェックリスト",
"插 USB 前的检查清单"
],
"ESP32_BMS_TFT v3 펌웨어를 Arduino IDE로 올립니다. 아래는 핵심 코드 일부예요.": [
"Upload the ESP32_BMS_TFT v3 firmware with the Arduino IDE. Below are the key parts of the code.",
"ESP32_BMS_TFT v3ファームウェアをArduino IDEで書き込みます。下はコードの要点です。",
"用 Arduino IDE 上传 ESP32_BMS_TFT v3 固件。下面是核心代码节选。"
],
"Arduino IDE → 보드 매니저에서 esp32 (Espressif) 설치, 보드는 ESP32 Dev Module": [
"Arduino IDE → Boards Manager: install esp32 (Espressif), board ESP32 Dev Module",
"Arduino IDE → ボードマネージャでesp32（Espressif）をインストール、ボードはESP32 Dev Module",
"Arduino IDE → 开发板管理器安装 esp32 (Espressif)，开发板选 ESP32 Dev Module"
],
"라이브러리 매니저에서 OneWire, LovyanGFX 설치": [
"Library Manager: install OneWire and LovyanGFX",
"ライブラリマネージャでOneWire、LovyanGFXをインストール",
"在库管理器中安装 OneWire、LovyanGFX"
],
"압축을 푼 폴더에서 ESP32_BMS_TFT.ino를 열고 업로드": [
"Open ESP32_BMS_TFT.ino from the unzipped folder and upload",
"解凍したフォルダのESP32_BMS_TFT.inoを開いて書き込み",
"打开解压文件夹中的 ESP32_BMS_TFT.ino 并上传"
],
"부팅 화면에 FW v3가 보이면 성공": [
"Success when the boot screen shows FW v3",
"起動画面にFW v3が表示されれば成功",
"开机画面显示 FW v3 即为成功"
],
"시뮬레이션 BMS는 실제 펌웨어와 같은 규칙으로 판정합니다. 부하를 켜고, 저항을 더 꽂고, 센서를 데워 보며 경고와 차단을 확인해 보세요.": [
"The simulated BMS judges with the same rules as the real firmware. Turn the load on, add resistors and warm the sensor to see warnings and the cut-off.",
"シミュレーションBMSは実際のファームウェアと同じ規則で判定します。負荷を入れ、抵抗を足し、センサを温めて警告と遮断を確かめてみましょう。",
"仿真 BMS 使用与真实固件相同的规则判定。打开负载、加插电阻、加热传感器，观察警告和切断。"
],
"온도": [
"Temperature",
"温度",
"温度"
],
"평상시": [
"Normal",
"通常",
"平常"
],
"손으로 쥐기": [
"Hold in hand",
"手で握る",
"用手握住"
],
"뜨거운 물": [
"Hot water",
"お湯",
"热水"
],
"시간 배속": [
"Time speed",
"時間倍速",
"时间倍速"
],
"리셋": [
"Reset",
"リセット",
"复位"
],
"단계": [
"Steps",
"ステップ",
"步骤"
],
"정상": [
"Normal",
"正常",
"正常"
],
"TRIP: 부하 차단됨": [
"TRIP: load cut off",
"TRIP：負荷を遮断",
"TRIP：负载已切断"
],
"정상: 부하에 전류가 흐르는 중": [
"Normal: current is flowing to the load",
"正常：負荷に電流が流れています",
"正常：负载有电流流过"
],
"정상: 부하 꺼짐": [
"Normal: load off",
"正常：負荷オフ",
"正常：负载关闭"
],
"아직 위험 조건이 남아 있어요": [
"A danger condition is still present",
"まだ危険条件が残っています",
"危险条件仍然存在"
],
"원인이 사라졌어요. 리셋하면 다시 켤 수 있어요": [
"The cause is gone. Reset to turn the load back on",
"原因がなくなりました。リセットすると再び入れられます",
"原因已消除。复位后即可重新打开"
],
"측정 → 필터 → 판정 → 보호를 1초마다 반복": [
"Measure → filter → judge → protect, every second",
"測定 → フィルタ → 判定 → 保護を毎秒くり返す",
"测量 → 滤波 → 判定 → 保护，每秒循环"
],
"위험 감지로 차단됨 · 리셋 필요": [
"Cut off on danger · reset needed",
"危険検出で遮断・リセットが必要",
"因检测到危险而切断 · 需要复位"
],
"버튼을 눌러 부하 켜기": [
"Press the button to turn the load on",
"ボタンを押して負荷を入れる",
"按下按键打开负载"
],
"시뮬레이션을 처음 상태로 되돌렸어요": [
"The simulation is back to its starting state",
"シミュレーションを最初の状態に戻しました",
"仿真已恢复到初始状态"
],
"USB 5V로 만드는 배터리 관리 시스템": [
"Battery management system built on USB 5V",
"USB 5Vで作るバッテリー管理システム",
"用 USB 5V 搭建的电池管理系统"
],
"소스 코드": [
"Source code",
"ソースコード",
"源代码"
],
"설정": [
"Settings",
"設定",
"设置"
],
"시뮬레이터": [
"Simulator",
"シミュレータ",
"仿真器"
],
"전류": [
"Current",
"電流",
"电流"
],
"위험도": [
"Risk",
"危険度",
"危险度"
],
"상태": [
"Status",
"状態",
"状态"
],
"확대": [
"Zoom in",
"拡大",
"放大"
],
"축소": [
"Zoom out",
"縮小",
"缩小"
],
"처음 시점": [
"Reset view",
"視点をリセット",
"重置视角"
],
"위에서 보기": [
"Top view",
"上から見る",
"俯视"
],
"전류와 온도 2분 추이": [
"Current and temperature, last 2 minutes",
"電流と温度の2分間の推移",
"电流和温度 2 分钟趋势"
],
"필터": [
"Filter",
"フィルタ",
"滤波"
],
"판정": [
"Judge",
"判定",
"判定"
],
"이전 단계들": [
"Earlier steps",
"前のステップ",
"前面的步骤"
],
"다음 단계들": [
"Later steps",
"次のステップ",
"后面的步骤"
],
"뒤로": [
"Back",
"戻る",
"返回"
],
"부저 소리를 스피커로 듣기": [
"Play the buzzer through the speakers",
"ブザー音をスピーカーで鳴らす",
"用扬声器播放蜂鸣声"
],
"조립 단계에서 구멍 좌표 표시": [
"Show hole labels in build steps",
"組立ステップで穴の座標を表示",
"组装步骤中显示孔位标签"
],
"시뮬레이션 초기화": [
"Reset simulation",
"シミュレーションを初期化",
"重置仿真"
],
"닫기": [
"Close",
"閉じる",
"关闭"
]
};
  const FMT = {
"ko": {
"hole": "{b} 보드 {cr}",
"holeEsp": " (ESP32 {esp} 줄)",
"boardL": "아래",
"boardR": "위",
"rail": "{b} 보드 {s} 레일({net}) {r}행 근처",
"relayTerm": "릴레이 {k} 단자",
"relayPin": "릴레이 {k} 핀",
"tftPin": "TFT {n} 핀",
"railShort": "{net} 레일",
"bands": "색띠: {c}·금",
"band_10k": "갈·검·주",
"band_220": "빨·빨·갈",
"band_330": "주·주·갈",
"band_10": "갈·검·검",
"band_1k": "갈·검·빨",
"band_100k": "갈·검·노",
"pins": "핀: {list}",
"legs": "다리: {list}",
"jumper": "{c} 점퍼 ({k})",
"expect": "정상 값: {v}",
"railTitle": "{b} 보드 {s} 레일",
"rowN": "{r}행",
"rowLinked": "{r}행 {g} 다섯 구멍이 서로 연결",
"espRow": "ESP32 {pin} 핀과 같은 줄",
"speed": "속도 ×{x}",
"mah": "누적 {v} mAh",
"stepAria": "{i}단계: {t}",
"prep": "준비물: 수-수(M-M) 점퍼 {mm}개, 암-수(F-M) 점퍼 {fm}개(릴레이·TFT용). 저항 10kΩ×2(R1·R2), 330Ω×4(RL1·RGB 3개), 220Ω×4(RL2·RL3·RS1·RS2), 100nF×2.",
"pinRowL": "아래쪽 줄 {r}행",
"pinRowR": "위쪽 줄 {r}행",
"stepN": "{i}단계",
"stepOf": "{n}단계 중 {i}단계",
"loadNow": "지금 {i} mA 흐르는 중",
"runaway": "이대로면 약 {m}분 뒤 45°C 도달 예상"
},
"en": {
"hole": "{b} board {cr}",
"holeEsp": " (ESP32 {esp} row)",
"boardL": "Lower",
"boardR": "Upper",
"rail": "{b} board {s} rail ({net}) near row {r}",
"relayTerm": "Relay {k} terminal",
"relayPin": "Relay {k} pin",
"tftPin": "TFT {n} pin",
"railShort": "{net} rail",
"bands": "Bands: {c}, gold",
"band_10k": "brown, black, orange",
"band_220": "red, red, brown",
"band_330": "orange, orange, brown",
"band_10": "brown, black, black",
"band_1k": "brown, black, red",
"band_100k": "brown, black, yellow",
"pins": "Pins: {list}",
"legs": "Legs: {list}",
"jumper": "{c} jumper ({k})",
"expect": "Expected: {v}",
"railTitle": "{b} board {s} rail",
"rowN": "row {r}",
"rowLinked": "Row {r}: the five holes {g} are connected",
"espRow": "Same row as ESP32 {pin}",
"speed": "Speed ×{x}",
"mah": "Total {v} mAh",
"stepAria": "Step {i}: {t}",
"prep": "You need: {mm} male-male jumpers and {fm} female-male jumpers (relay and TFT). Resistors 10kΩ×2 (R1, R2), 330Ω×4 (RL1, RGB ×3), 220Ω×4 (RL2, RL3, RS1, RS2), 100nF×2.",
"pinRowL": "lower row, row {r}",
"pinRowR": "upper row, row {r}",
"stepN": "step {i}",
"stepOf": "step {i} of {n}",
"loadNow": "{i} mA flowing now",
"runaway": "At this rate 45°C in about {m} min"
},
"ja": {
"hole": "{b}ボード {cr}",
"holeEsp": "（ESP32 {esp} の行）",
"boardL": "下",
"boardR": "上",
"rail": "{b}ボード {s} レール（{net}）{r}行付近",
"relayTerm": "リレー {k} 端子",
"relayPin": "リレー {k} ピン",
"tftPin": "TFT {n} ピン",
"railShort": "{net} レール",
"bands": "カラーコード：{c}・金",
"band_10k": "茶・黒・橙",
"band_220": "赤・赤・茶",
"band_330": "橙・橙・茶",
"band_10": "茶・黒・黒",
"band_1k": "茶・黒・赤",
"band_100k": "茶・黒・黄",
"pins": "ピン：{list}",
"legs": "足：{list}",
"jumper": "{c}のジャンパー（{k}）",
"expect": "正常値：{v}",
"railTitle": "{b}ボード {s} レール",
"rowN": "{r}行",
"rowLinked": "{r}行の {g} の5穴がつながっています",
"espRow": "ESP32 {pin} と同じ行",
"speed": "速度 ×{x}",
"mah": "累計 {v} mAh",
"stepAria": "ステップ{i}：{t}",
"prep": "用意するもの：オス-オス(M-M)ジャンパー {mm}本、メス-オス(F-M)ジャンパー {fm}本（リレー・TFT用）。抵抗 10kΩ×2（R1・R2）、330Ω×4（RL1・RGB 3本）、220Ω×4（RL2・RL3・RS1・RS2）、100nF×2。",
"pinRowL": "下側列 {r}行",
"pinRowR": "上側列 {r}行",
"stepN": "ステップ{i}",
"stepOf": "{n}ステップ中 {i}",
"loadNow": "いま {i} mA 流れています",
"runaway": "このままだと約{m}分で45°Cに到達"
},
"zh": {
"hole": "{b}面包板 {cr}",
"holeEsp": "（ESP32 {esp} 所在行）",
"boardL": "下",
"boardR": "上",
"rail": "{b}面包板 {s} 轨（{net}）第 {r} 行附近",
"relayTerm": "继电器 {k} 端子",
"relayPin": "继电器 {k} 引脚",
"tftPin": "TFT {n} 引脚",
"railShort": "{net} 轨",
"bands": "色环：{c}、金",
"band_10k": "棕、黑、橙",
"band_220": "红、红、棕",
"band_330": "橙、橙、棕",
"band_10": "棕、黑、黑",
"band_1k": "棕、黑、红",
"band_100k": "棕、黑、黄",
"pins": "引脚：{list}",
"legs": "引脚：{list}",
"jumper": "{c}色跳线（{k}）",
"expect": "正常值：{v}",
"railTitle": "{b}面包板 {s} 轨",
"rowN": "第 {r} 行",
"rowLinked": "第 {r} 行 {g} 五个孔相连",
"espRow": "与 ESP32 {pin} 同行",
"speed": "速度 ×{x}",
"mah": "累计 {v} mAh",
"stepAria": "第 {i} 步：{t}",
"prep": "准备：公-公(M-M)跳线 {mm} 根，母-公(F-M)跳线 {fm} 根（继电器、TFT 用）。电阻 10kΩ×2（R1、R2），330Ω×4（RL1、RGB 3 个），220Ω×4（RL2、RL3、RS1、RS2），100nF×2。",
"pinRowL": "下排第 {r} 行",
"pinRowR": "上排第 {r} 行",
"stepN": "第 {i} 步",
"stepOf": "第 {i} 步，共 {n} 步",
"loadNow": "当前电流 {i} mA",
"runaway": "照此速度约 {m} 分钟后达到 45°C"
}
};
  let lang = 'ko';
  try { const s = localStorage.getItem('bms-lang'); if (s && LANGS[s]) lang = s; else { const n = (navigator.language || 'ko').slice(0, 2); if (LANGS[n]) lang = n; } } catch (e) {}
  const T = s => { if (s == null) return s; if (lang === 'ko') return s[0] === '@' ? s.slice(1) : s; const r = D[s]; return r ? r[IDX[lang]] : (s[0] === '@' ? s.slice(1) : s); };
  const F = (k, v = {}) => { const t = (FMT[lang] && FMT[lang][k]) || FMT.ko[k] || k; return t.replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? '')); };
  return { T, F, LANGS, get lang() { return lang; }, set(l) { if (!LANGS[l]) return; lang = l; try { localStorage.setItem('bms-lang', l); } catch (e) {} } };
})();
