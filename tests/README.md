# 🕹️ 8-BIT ARCADE DUO — BỘ KIỂM THỬ TOÀN DIỆN (TEST SUITE)

Bộ test toàn diện cho file [`8bit_arcade_duo.html`](../8bit_arcade_duo.html) bao gồm **Unit Tests**, **Integration Tests**, **Phone Responsive Tests** và **Design Compliance Tests** tuân thủ tuyệt đối cấu trúc, logic và phong cách thiết kế retro 8-bit.

---

## 📁 Cấu Trúc Bộ Test (`tests/`)

```
tests/
├── test_runner.html        # 🖥️ Dashboard kiểm thử trực quan trong trình duyệt (kèm Device Simulator)
├── test_definitions.js     # 📜 Định nghĩa 4 bộ assertions và test cases dùng chung
├── test_unit.py            # 🧪 Unit Tests tự động (Logic thuật toán, Data models, Design tokens)
├── test_e2e_responsive.py  # 📱 E2E & Phone Responsive tự động (Chrome/Edge headless qua CDP)
├── run_all_tests.py        # 🚀 Master runner thực thi toàn bộ 43 test cases
├── run_tests.ps1           # ⚡ Script chạy 1 chạm trên PowerShell Windows
└── README.md               # 📖 Hướng dẫn chi tiết
```

---

## 🚀 Cách Chạy Kiểm Thử

### Cách 1: Chạy Tự Động Toàn Bộ Bằng CLI (Khuyên Dùng)

Chạy trên PowerShell:
```powershell
.\tests\run_tests.ps1
```
Hoặc bằng Python:
```powershell
& 'C:\Users\user\AppData\Local\Python\pythoncore-3.14-64\python.exe' tests/run_all_tests.py
```

### Cách 2: Kiểm Thử Trực Quan & Giả Lập Điện Thoại Trong Trình Duyệt

1. Mở file [`tests/test_runner.html`](test_runner.html) bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Brave).
2. Trình duyệt sẽ hiển thị:
   - **Thanh đo lường thời gian thực:** Đếm số test Đạt / Lỗi, tiến độ thực thi.
   - **Khung giả lập điện thoại tương tác:** Chuyển đổi linh hoạt giữa:
     * 📱 **iPhone 14 / Modern** (390 × 844)
     * 📱 **iPhone SE / Small** (375 × 667)
     * 📱 **Android Large** (412 × 915)
     * 📱 **Mobile Landscape** (844 × 390)
     * 💻 **iPad / Tablet** (768 × 1024)
     * 🖥️ **Desktop Full** (1280 × 800)
   - Bấm **"Chạy Tất Cả"** để chạy tự động toàn bộ test suite trên iframe thời gian thực.
   - Bấm **"Xuất Báo Cáo"** để tải về báo cáo định dạng Markdown chi tiết.

---

## 🎯 Chi Tiết Các Hạng Mục Kiểm Thử

### 1. 🧪 Unit Tests (22 Tests Đạt 100%)
- **`GAMES_CATALOG`:** Xác thực đúng 5 trò chơi (`starfighter`, `tank`, `racer`, `pong`, `caro`), đủ metadata (title, subtitle, category, icon, badge, description).
- **`AppState`:** Khởi tạo cấu trúc view mặc định (`lobby`), âm thanh và CRT bật, player profile (`Player_VN`, `👾`, role `P1`).
- **Thuật toán cờ Caro (`checkCaroWin`):** Kiểm tra thắng 5 hàng ngang, 5 hàng dọc, chéo chính (`\`), chéo phụ (`/`), ngăn chặn thắng sai khi chỉ có 4 quân hoặc bị chặn, an toàn tràn biên `(0,0)` và `(14,14)`.
- **Hàm định dạng & toán học:** Tạo mã phòng 4 ký tự ngẫu nhiên `^[A-Z0-9]{4}$`, format điểm 4 số `0000`, đếm ngược phút:giây `02:00`, giới hạn máu HP `0% - 100%`.
- **Chế độ chơi (Play Mode):** Đổi sang `bot` cập nhật tên thành *Bot AI Siêu Cấp* (`🤖`), đổi lại `local_or_tab` phục hồi *Người Chơi 2*.

### 2. 📱 Phone Responsive Tests (Xác Thực Breakpoints & Touch Controls)
- **Thẻ Meta Viewport:** Đảm bảo `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`.
- **Tay Cầm Ảo Di Động (`#mobile-controls`):**
  * Trên Mobile (`< 768px`): Có `display: grid` (hiển thị rõ ràng).
  * Trên Desktop (`>= 768px`): Có `display: none` (tự động ẩn nhờ `md:hidden`).
- **Phím Cảm Ứng D-Pad & Action Buttons:**
  * Cụm D-Pad 4 hướng di chuyển: `KeyW` (Up), `KeyS` (Down), `KeyA` (Left), `KeyD` (Right).
  * Cụm nút hành động: Nút B (`ShiftLeft`) và Nút A (`Space`).
  * Kiểm tra sự kiện cảm ứng: `touchstart` kích hoạt `keysPressed[key] = true`, `touchend` xóa phím.
- **Tự động co giãn theo màn hình di động:**
  * Huy hiệu phòng (`#header-room-badge`) ẩn trên mobile (`hidden md:flex`).
  * Nút CRT filter (`#btn-crt`) ẩn trên màn hình quá nhỏ (`hidden sm:flex`).
  * Lưới trò chơi (`#games-grid`) tự chuyển đổi: `grid-cols-1` (mobile) → `sm:grid-cols-2` (tablet) → `lg:grid-cols-3` (desktop).
  * Khung Canvas (`#canvas-wrapper`) duy trì tỷ lệ `aspect-[4/3]` trên mobile và `sm:aspect-[16/10]` trên desktop với `object-contain`.

### 3. 🔄 Integration Tests (Vòng Đời Giao Diện & Đồng Bộ Mạng)
- **Vòng đời chuyển đổi màn hình (View Lifecycle):**
  * `Sảnh chính (Lobby)` → Gọi `createNewRoom()` → `Phòng chờ (Room)` với mã phòng 4 ký tự.
  * Gọi `startMatch()` → `Đấu trường (Game Arena)` khởi động Canvas loop và HUD Bar.
  * Gọi `togglePauseGame()` → Bật/Tắt modal tạm dừng `pause-overlay`.
  * Gọi `endMatch()` → Hiện modal `gameover-overlay` cùng tỷ số và vinh danh người thắng.
  * Gọi `exitToLobby()` → Hủy render loop và quay về Sảnh chính an toàn.
- **Hệ thống Modal:**
  * Mở/Đóng Hồ sơ người chơi (`modal-profile`), đổi tên và chọn avatar 8-bit (`👾`, `🤖`, `🦊`, `🐲`, `🚀`, `🥷`), lưu thành công cập nhật HUD & Header.
  * Mở/Đóng Bảng xếp hạng cao thủ (`modal-leaderboard`).
  * Bắn biểu cảm (`sendEmote`): Tạo hiệu ứng nổi `.emote-popup` trong `#emote-overlay`.
- **Đồng bộ đa Tab (BroadcastChannel):**
  * Kết nối kênh `arcade_room_<code\>`.
  * Nhận sự kiện `PLAYER_JOINED`, cập nhật avatar và tên Người chơi 2 từ xa.

### 4. 🎨 Design Compliance Tests (Đúng Chuẩn Thiết Kế Retro 8-Bit)
- **Bảng màu Tailwind Retro Arcade:**
  * `arcade.bg`: `#080912`
  * `arcade.surface`: `#111426`
  * `arcade.card`: `#171B34`
  * `arcade.border`: `#272E54`
  * `arcade.cyan`: `#00F5D4`
  * `arcade.pink`: `#FF2A85`
  * `arcade.yellow`: `#FEE440`
  * `arcade.purple`: `#9B5DE5`
- **Bộ 4 Google Fonts Tiếng Việt & Pixel:** `Be Vietnam Pro`, `Chakra Petch`, `JetBrains Mono`, `VT323`.
- **Hiệu ứng Retro:** Lớp quét scanline `.crt-overlay`, lưới cyber grid `.bg-cyber-grid`, bóng hộp arcade đổ bóng cứng `box-shadow: 0 6px 0 #05060D`, nút `.arcade-btn:active` lún cơ học `translateY(3px)`.
