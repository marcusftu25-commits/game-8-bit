#!/usr/bin/env python3
"""
=============================================================================
8-BIT ARCADE DUO - E2E INTEGRATION & PHONE RESPONSIVE AUTOMATED TESTS
Su dung Chrome Headless & DevTools Protocol (CDP)
=============================================================================
"""

import os
import sys
import json
import time
import shutil
import tempfile
import threading
import subprocess
import http.server
import urllib.request
from pathlib import Path

try:
    import websocket
except ImportError:
    print("[ERROR] websocket-client chua duoc cai dat. Vui long chay: pip install websocket-client")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent.parent
HTML_FILE = BASE_DIR / "8bit_arcade_duo.html"

# ANSI Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
GRAY = "\033[90m"
BOLD = "\033[1m"
RESET = "\033[0m"


def find_browser():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    raise FileNotFoundError("Khong tim thay Google Chrome hoac Microsoft Edge tren may tinh.")


class CdpClient:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10)
        self.msg_id = 0

    def send(self, method, params=None):
        self.msg_id += 1
        target_id = self.msg_id
        payload = {"id": target_id, "method": method, "params": params or {}}
        self.ws.send(json.dumps(payload))

        start = time.time()
        while time.time() - start < 10:
            raw = self.ws.recv()
            try:
                data = json.loads(raw)
                if data.get("id") == target_id:
                    return data
            except Exception:
                pass
        raise TimeoutError(f"CDP command '{method}' timed out")

    def eval(self, expression):
        res = self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res.get("result", {}):
            err = res["result"]["exceptionDetails"]
            raise RuntimeError(f"JS Exception in '{expression}': {err}")
        return res.get("result", {}).get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


def run_e2e_tests():
    print(f"{CYAN}{BOLD}{'='*72}{RESET}")
    print(f"{CYAN}{BOLD} 8-BIT ARCADE DUO - E2E INTEGRATION & PHONE RESPONSIVE TEST SUITE {RESET}")
    print(f"{CYAN}{BOLD}{'='*72}{RESET}")

    browser_path = find_browser()
    print(f"{GRAY}Trinh duyet: {browser_path}{RESET}")
    print(f"{GRAY}File muc tieu: {HTML_FILE}{RESET}")

    # Start local HTTP Server to serve files cleanly
    http_port = 8765
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(BASE_DIR), **kwargs)
        def log_message(self, format, *args):
            pass

    httpd = http.server.HTTPServer(("127.0.0.1", http_port), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    temp_dir = tempfile.mkdtemp(prefix="arcade_cdp_")
    port = 9488
    web_url = f"http://127.0.0.1:{http_port}/8bit_arcade_duo.html"

    chrome_cmd = [
        browser_path,
        "--headless=new",
        f"--remote-debugging-port={port}",
        "--remote-allow-origins=*",
        f"--user-data-dir={temp_dir}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        web_url
    ]

    proc = subprocess.Popen(chrome_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    client = None

    passed_count = 0
    failed_count = 0

    def assert_test(name, condition, detail=""):
        nonlocal passed_count, failed_count
        if condition:
            print(f"  {GREEN}[PASS]{RESET} {name}")
            passed_count += 1
        else:
            print(f"  {RED}[FAIL]{RESET} {name} {f'({detail})' if detail else ''}")
            failed_count += 1

    try:
        # Wait for CDP endpoint
        ws_url = None
        for _ in range(30):
            time.sleep(0.3)
            try:
                req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=2)
                targets = json.loads(req.read().decode())
                for t in targets:
                    if t.get("type") == "page" and "webSocketDebuggerUrl" in t:
                        ws_url = t["webSocketDebuggerUrl"]
                        break
                if ws_url:
                    break
            except Exception:
                pass

        if not ws_url:
            raise RuntimeError(f"Khong the ket noi CDP Chrome qua cong {port}")

        client = CdpClient(ws_url)

        # 1. Dieu huong den file HTML
        print(f"\n{YELLOW}[1/4] Kiem tra ket noi & Khoi tao Document...{RESET}")
        client.send("Page.enable")
        client.send("Page.navigate", {"url": web_url})

        # Cho DOM, CDN scripts va Arcade Engine san sang
        engine_ready = False
        for _ in range(30):
            time.sleep(0.3)
            try:
                val = client.eval("typeof navigateTo === 'function' && typeof AppState === 'object'")
                if val:
                    engine_ready = True
                    break
            except Exception:
                pass

        if not engine_ready:
            raise TimeoutError("Trang 8bit_arcade_duo.html chua khoi dong xong Arcade Engine sau 9 giay")

        title = client.eval("document.title")
        assert_test("Document title chinh xac", "8-BIT ARCADE DUO" in title, f"Title: {title}")

        # 2. Phone Responsive Tests (Mobile Viewport: 390x844)
        print(f"\n{YELLOW}[2/4] Kiem tra Phone Responsive tai Mobile Viewport (390 x 844)...{RESET}")
        client.send("Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 3,
            "mobile": True
        })
        time.sleep(0.3)

        client.eval("navigateTo('game')")

        mobile_display = client.eval("window.getComputedStyle(document.getElementById('mobile-controls')).display")
        assert_test(
            "Tay cam cam ung (#mobile-controls) phai HIEN THI tren mobile (display != none)",
            mobile_display != "none",
            f"display: {mobile_display}"
        )

        badge_mobile = client.eval("window.getComputedStyle(document.getElementById('header-room-badge')).display")
        assert_test(
            "Huy hieu phong (#header-room-badge) phai AN tren mobile (display == none)",
            badge_mobile == "none",
            f"display: {badge_mobile}"
        )

        crt_btn_mobile = client.eval("window.getComputedStyle(document.getElementById('btn-crt')).display")
        assert_test(
            "Nut CRT (#btn-crt) phai AN tren man hinh di dong nho",
            crt_btn_mobile == "none",
            f"display: {crt_btn_mobile}"
        )

        key_guide_mobile = client.eval(
            "window.getComputedStyle(document.querySelector('.hidden.md\\\\:flex.items-center.gap-4.text-xs')).display"
        )
        assert_test(
            "Huong dan ban phim desktop phai AN tren mobile",
            key_guide_mobile == "none",
            f"display: {key_guide_mobile}"
        )

        touch_btns = client.eval("document.querySelectorAll('#mobile-controls button.touch-btn').length")
        assert_test("Cum D-Pad & Action buttons co du 6 nut cam ung", touch_btns == 6, f"So nut: {touch_btns}")

        # Test touch event handling
        client.eval("""
            (() => {
                const btn = document.querySelector('#mobile-controls button[data-key="KeyW"]');
                btn.dispatchEvent(new CustomEvent('touchstart', { bubbles: true }));
            })()
        """)
        key_w_down = client.eval("keysPressed['KeyW'] === true")
        assert_test("Su kien touchstart tren nut W kich hoat keysPressed['KeyW']", key_w_down)

        client.eval("""
            (() => {
                const btn = document.querySelector('#mobile-controls button[data-key="KeyW"]');
                btn.dispatchEvent(new CustomEvent('touchend', { bubbles: true }));
            })()
        """)
        key_w_up = client.eval("!keysPressed['KeyW']")
        assert_test("Su kien touchend tren nut W giai phong keysPressed['KeyW']", key_w_up)

        # 3. Desktop Viewport Tests (1280x800)
        print(f"\n{YELLOW}[3/4] Kiem tra Viewport Desktop (1280 x 800)...{RESET}")
        client.send("Emulation.setDeviceMetricsOverride", {
            "width": 1280,
            "height": 800,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        time.sleep(0.3)

        mobile_desktop = client.eval("window.getComputedStyle(document.getElementById('mobile-controls')).display")
        assert_test(
            "Tay cam cam ung (#mobile-controls) phai TU DONG AN tren Desktop (display == none)",
            mobile_desktop == "none",
            f"display: {mobile_desktop}"
        )

        badge_desktop = client.eval("window.getComputedStyle(document.getElementById('header-room-badge')).display")
        assert_test(
            "Huy hieu phong (#header-room-badge) phai HIEN THI tren Desktop (display != none)",
            badge_desktop != "none",
            f"display: {badge_desktop}"
        )

        crt_btn_desktop = client.eval("window.getComputedStyle(document.getElementById('btn-crt')).display")
        assert_test(
            "Nut CRT (#btn-crt) phai HIEN THI tren Desktop",
            crt_btn_desktop != "none",
            f"display: {crt_btn_desktop}"
        )

        # 4. Integration Tests & User Workflows
        print(f"\n{YELLOW}[4/4] Kiem tra Integration & Vong doi chuyen View / Modals...{RESET}")

        # View navigation: Lobby
        client.eval("navigateTo('lobby')")
        lobby_active = client.eval(
            "!document.getElementById('view-lobby').classList.contains('hidden') && "
            "document.getElementById('view-room').classList.contains('hidden') && "
            "document.getElementById('view-game').classList.contains('hidden')"
        )
        assert_test("Dieu huong ve Sảnh Chính (view-lobby) an toan", lobby_active)

        # Tao phong moi
        client.eval("createNewRoom('racer')")
        room_active = client.eval(
            "!document.getElementById('view-room').classList.contains('hidden') && "
            "AppState.room.gameId === 'racer' && "
            "AppState.player.role === 'P1'"
        )
        room_code = client.eval("AppState.room.code")
        assert_test("Tao phong moi chuyen sang view-room voi ma 4 ky tu", room_active and len(room_code) == 4, f"Ma: {room_code}")

        # Bat dau tran dau
        client.eval("startMatch(true)")
        game_active = client.eval("!document.getElementById('view-game').classList.contains('hidden') && AppState.match.running === true")
        hud_game_title = client.eval("document.getElementById('hud-game-title').textContent")
        assert_test("Bat dau tran dau khoi dong game loop va HUD Bar", game_active and "ĐUA XE" in hud_game_title.upper(), f"HUD Title: {hud_game_title}")

        # Pause / Resume
        client.eval("togglePauseGame()")
        is_paused = client.eval("AppState.match.paused === true && !document.getElementById('pause-overlay').classList.contains('hidden')")
        assert_test("Tam dung tran dau hien thi modal Pause Overlay", is_paused)

        client.eval("togglePauseGame()")
        is_resumed = client.eval("AppState.match.paused === false && document.getElementById('pause-overlay').classList.contains('hidden')")
        assert_test("Tiep tuc tran dau an modal Pause Overlay", is_resumed)

        # End match
        client.eval("AppState.match.p1Score = 950; AppState.match.p2Score = 400; endMatch()")
        gameover_active = client.eval("!document.getElementById('gameover-overlay').classList.contains('hidden')")
        winner_txt = client.eval("document.getElementById('winner-title').textContent")
        assert_test("Ket thuc tran dau hien thi Game Over & P1 Chien Thang", gameover_active and "NGƯỜI CHƠI 1 CHIẾN THẮNG" in winner_txt)

        # Exit to lobby
        client.eval("exitToLobby()")
        back_to_lobby = client.eval("AppState.currentView === 'lobby' && AppState.match.running === false")
        assert_test("Thoát tran ve Sảnh Chinh tat game loop", back_to_lobby)

        # Profile Modal Customization
        client.eval("openProfileModal(); selectAvatar('🦊'); document.getElementById('input-player-name').value = 'SpeedyFox'; saveProfile()")
        profile_saved = client.eval("AppState.player.name === 'SpeedyFox' && AppState.player.avatar === '🦊'")
        name_display = client.eval("document.getElementById('player-name-display').textContent === 'SpeedyFox'")
        avatar_display = client.eval("document.getElementById('player-avatar-display').textContent === '🦊'")
        assert_test("Cap nhat ho so nguoi choi (Ten: SpeedyFox, Avatar: 🦊)", profile_saved and name_display and avatar_display)

        # Emote Reactions
        client.eval("sendEmote('👑')")
        emote_rendered = client.eval("document.querySelectorAll('#emote-overlay .emote-popup').length > 0")
        assert_test("He thong bieu cam (Emote) tao popup phan ung tren man hinh", emote_rendered)

        # CRT Scanline Toggle
        init_crt = client.eval("AppState.crtEnabled")
        client.eval("toggleCRT()")
        expected_crt = "false" if init_crt else "true"
        crt_toggled = client.eval(f"AppState.crtEnabled === {expected_crt}")
        client.eval("toggleCRT()")  # Restore
        assert_test("Bat/Tat hieu ung quet scanline CRT", crt_toggled)

        # Total Summary
        total = passed_count + failed_count
        print(f"\n{CYAN}{BOLD}{'='*72}{RESET}")
        print(f"{CYAN}{BOLD} TONG KET KET QUA E2E & RESPONSIVE: {RESET}")
        print(f"  Tong so tests:   {BOLD}{total}{RESET}")
        print(f"  {GREEN}Thanh cong:      {BOLD}{passed_count}{RESET}")
        print(f"  {RED if failed_count > 0 else GREEN}That bai:        {BOLD}{failed_count}{RESET}")
        print(f"{CYAN}{BOLD}{'='*72}{RESET}")

        return failed_count == 0

    finally:
        if client:
            client.close()
        if proc:
            proc.kill()
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    success = run_e2e_tests()
    sys.exit(0 if success else 1)
