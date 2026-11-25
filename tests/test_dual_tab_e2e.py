#!/usr/bin/env python3
"""
=============================================================================
8-BIT ARCADE DUO - DUAL-TAB REAL-TIME E2E TEST (PC DESKTOP P1 <-> MOBILE P2)
Khoi chay Backend Node.js (HTTP + Socket.io) that va 2 tab Chrome Headless:
- Tab 1 (Desktop 1280x800): Host P1 tao phong
- Tab 2 (Mobile 390x844): Guest P2 nhap ma phong tham gia
Kiem thu dong bo thoi gian thuc:
1. P2 vao phong -> P1 cap nhat trang thai 2 nguoi ket noi qua Socket.io
2. P1 bat dau tran -> P2 tu dong vao view-game
3. Mobile P2 ban Emote 🔥 -> Desktop P1 hien popup phia phai & tu xoa sau 1.8s
4. Desktop P1 rung man hinh -> Mobile P2 kich hoat .shake-effect dong bo
5. Sound & CRT toggles luu ben qua reload (localStorage)
=============================================================================
"""

import os
import sys
import json
import time
import shutil
import tempfile
import subprocess
import urllib.request
from pathlib import Path
import websocket

BASE_DIR = Path(__file__).resolve().parent.parent
NODE_EXE = r"C:\Program Files\nodejs\node.exe"
SERVER_PORT = 3479
CDP_PORT = 9495
SERVER_URL = f"http://127.0.0.1:{SERVER_PORT}"

CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def find_browser():
    for path in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(path):
            return path
    raise FileNotFoundError("Khong tim thay Chrome/Edge.")


class CdpTab:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10)
        self.msg_id = 0

    def send(self, method, params=None):
        self.msg_id += 1
        tid = self.msg_id
        self.ws.send(json.dumps({"id": tid, "method": method, "params": params or {}}))
        start = time.time()
        while time.time() - start < 10:
            raw = self.ws.recv()
            try:
                data = json.loads(raw)
                if data.get("id") == tid:
                    return data
            except Exception:
                pass
        raise TimeoutError(f"CDP timeout on {method}")

    def eval(self, expr):
        res = self.send("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True,
        })
        if "exceptionDetails" in res.get("result", {}):
            raise RuntimeError(f"JS Exception: {res['result']['exceptionDetails']}")
        return res.get("result", {}).get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


def wait_until(fn, timeout=6.0, interval=0.15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            val = fn()
            if val:
                return val
        except Exception:
            pass
        time.sleep(interval)
    return None


def main():
    print(f"\n{CYAN}{BOLD}{'='*72}{RESET}")
    print(f"{CYAN}{BOLD} 8-BIT ARCADE DUO - DUAL-TAB REAL-TIME E2E (PC P1 <-> MOBILE P2) {RESET}")
    print(f"{CYAN}{BOLD}{'='*72}{RESET}\n")

    passed = 0
    failed = 0

    def check(name, cond, detail=""):
        nonlocal passed, failed
        if cond:
            print(f"  {GREEN}[PASS]{RESET} {name}")
            passed += 1
        else:
            print(f"  {RED}[FAIL]{RESET} {name} {f'({detail})' if detail else ''}")
            failed += 1

    env = os.environ.copy()
    env["PORT"] = str(SERVER_PORT)
    env["DB_PATH"] = ":memory:"

    server_proc = subprocess.Popen(
        [NODE_EXE, str(BASE_DIR / "server" / "server.js")],
        cwd=str(BASE_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    temp_dir = tempfile.mkdtemp(prefix="arcade_dual_")
    browser_proc = None
    tab1 = None
    tab2 = None

    try:
        # 1. Cho Node.js server san sang
        ready = wait_until(
            lambda: urllib.request.urlopen(f"{SERVER_URL}/api/health", timeout=1).status == 200,
            timeout=6.0,
        )
        if not ready:
            raise RuntimeError("Node.js server khong khoi dong kip")

        # 2. Mo Chrome voi 2 tab doc lap (2 browser contexts de co localStorage/GuestID rieng)
        browser_proc = subprocess.Popen(
            [
                find_browser(),
                "--headless=new",
                f"--remote-debugging-port={CDP_PORT}",
                "--remote-allow-origins=*",
                f"--user-data-dir={temp_dir}",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Lay Browser-level WebSocket de tao 2 Target doc lap voi browserContext rieng
        browser_ws_url = wait_until(
            lambda: json.loads(urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json/version", timeout=1).read()).get("webSocketDebuggerUrl"),
            timeout=8.0,
        )
        browser_cdp = CdpTab(browser_ws_url)

        ctx1 = browser_cdp.send("Target.createBrowserContext")["result"]["browserContextId"]
        ctx2 = browser_cdp.send("Target.createBrowserContext")["result"]["browserContextId"]

        t1_id = browser_cdp.send("Target.createTarget", {"url": "about:blank", "browserContextId": ctx1})["result"]["targetId"]
        t2_id = browser_cdp.send("Target.createTarget", {"url": "about:blank", "browserContextId": ctx2})["result"]["targetId"]

        targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json/list", timeout=2).read())
        ws1 = next(t["webSocketDebuggerUrl"] for t in targets if t["id"] == t1_id)
        ws2 = next(t["webSocketDebuggerUrl"] for t in targets if t["id"] == t2_id)

        tab1 = CdpTab(ws1)
        tab2 = CdpTab(ws2)

        # Thiet lap viewport Desktop cho P1 va Mobile cho P2
        tab1.send("Page.enable")
        tab1.send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 800, "deviceScaleFactor": 1, "mobile": False})
        browser_cdp.send("Target.activateTarget", {"targetId": t1_id})
        tab1.send("Page.navigate", {"url": SERVER_URL})
        t1_ok = wait_until(lambda: tab1.eval("typeof GuestAuth === 'object' && typeof NetworkSync === 'object' && NetworkSync.getStatus().connected === true"), timeout=12.0)

        tab2.send("Page.enable")
        tab2.send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 3, "mobile": True})
        browser_cdp.send("Target.activateTarget", {"targetId": t2_id})
        tab2.send("Page.navigate", {"url": SERVER_URL})
        t2_ok = wait_until(lambda: tab2.eval("typeof GuestAuth === 'object' && typeof NetworkSync === 'object' && NetworkSync.getStatus().connected === true"), timeout=12.0)
        check("Ca 2 tab (Desktop P1 & Mobile P2) ket noi Socket.io thanh cong den Backend that", bool(t1_ok and t2_ok), f"t1={t1_ok}, t2={t2_ok}")

        # Doi ten khac nhau cho de kiem chung
        tab1.eval("GuestAuth.updateProfile('HostDesktop', '🚀'); AppState.player.name = 'HostDesktop'; AppState.player.avatar = '🚀';")
        tab2.eval("GuestAuth.updateProfile('GuestMobile', '🥷'); AppState.player.name = 'GuestMobile'; AppState.player.avatar = '🥷';")

        # 3. P1 tao phong, P2 vao phong bang ma 4 ky tu
        tab1.eval("createNewRoom('starfighter')")
        room_code = wait_until(lambda: tab1.eval("AppState.room.code && AppState.room.code.length === 4 ? AppState.room.code : null"))
        check("Desktop P1 tao phong tren Server thanh cong", bool(room_code), f"code={room_code}")

        tab2.eval(f"quickJoinRoom('{room_code}', 'starfighter')")
        p1_sees_p2 = wait_until(lambda: tab1.eval("document.getElementById('p2-room-name').textContent === 'GuestMobile'"))
        check("Mobile P2 vao phong -> Desktop P1 nhan ten P2 real-time qua Socket.io", bool(p1_sees_p2))

        # 4. P1 bam bat dau -> P2 tu dong vao view-game
        tab1.eval("startMatch()")
        both_playing = wait_until(
            lambda: tab1.eval("AppState.currentView === 'game' && AppState.match.running")
            and tab2.eval("AppState.currentView === 'game' && AppState.match.running")
        )
        check("P1 bat dau tran -> Mobile P2 tu dong chuyen sang view-game", bool(both_playing))

        # 5. Mobile P2 ban Quick Emote 🔥 -> Desktop P1 hien popup phia phai & tu xoa sau 1.8s
        tab2.eval("sendEmote('🔥')")
        p1_got_emote = wait_until(
            lambda: tab1.eval("Array.from(document.querySelectorAll('#emote-overlay .emote-popup')).some(el => el.textContent === '🔥' && el.dataset.side === 'right')")
        )
        check("Mobile P2 gui Emote 🔥 -> Desktop P1 hien popup bay phia phai (right)", bool(p1_got_emote))

        time.sleep(2.1)
        p1_emote_cleaned = tab1.eval("document.querySelectorAll('#emote-overlay .emote-popup').length === 0")
        check("Popup Emote tu dong go khoi DOM sau 1.8 giay", bool(p1_emote_cleaned))

        # 6. Desktop P1 phat Screen Shake -> Mobile P2 kich hoat .shake-effect dong bo
        tab2.eval("document.getElementById('canvas-wrapper').classList.remove('shake-effect')")
        tab1.eval("broadcastScreenShake('test_hit')")
        p2_shook = wait_until(lambda: tab2.eval("document.getElementById('canvas-wrapper').classList.contains('shake-effect')"))
        check("Desktop P1 phat screen_shake -> Mobile P2 rung man hinh (.shake-effect) dong bo", bool(p2_shook))

        # 7. Ket thuc tran (P1 thang) -> DB tu dong luu -> Mo modal Leaderboard hien thi du lieu that
        tab1.eval("AppState.match.p1Score = 800; AppState.match.p2Score = 200; endMatch();")
        p2_gameover = wait_until(lambda: tab2.eval("!document.getElementById('gameover-overlay').classList.contains('hidden')"))
        check("P1 ket thuc tran -> Mobile P2 cung nhan Game Over dong bo", bool(p2_gameover))

        tab1.eval("exitToLobby(); toggleLeaderboardModal();")
        lb_loaded = wait_until(
            lambda: tab1.eval("document.getElementById('leaderboard-list').textContent.includes('HostDesktop') && document.getElementById('leaderboard-list').textContent.includes('150')")
        )
        check("Mo #modal-leaderboard hien thi du lieu that tu SQLite (HostDesktop: 150 Đ)", bool(lb_loaded))

        # 8. Luu trang thai Sound & CRT qua reload (localStorage persistence)
        tab1.eval("toggleSound(); toggleCRT();")
        tab1.send("Page.reload")
        persisted = wait_until(
            lambda: tab1.eval("typeof AppState === 'object' && AppState.soundEnabled === false && AppState.crtEnabled === false"),
            timeout=10.0,
        )
        check("Trang thai bat/tat Sound & CRT duoc luu ben qua F5 (localStorage)", bool(persisted))

        browser_cdp.close()

    finally:
        if tab1:
            tab1.close()
        if tab2:
            tab2.close()
        if browser_proc:
            browser_proc.kill()
        if server_proc:
            server_proc.kill()
        shutil.rmtree(temp_dir, ignore_errors=True)

    total = passed + failed
    print(f"\n{CYAN}{BOLD}{'='*72}{RESET}")
    print(f"{CYAN}{BOLD} TONG KET DUAL-TAB E2E (PC P1 <-> MOBILE P2): {RESET}")
    print(f"  Tong so tests:   {BOLD}{total}{RESET}")
    print(f"  {GREEN}Thanh cong:      {BOLD}{passed}{RESET}")
    print(f"  {RED if failed > 0 else GREEN}That bai:        {BOLD}{failed}{RESET}")
    print(f"{CYAN}{BOLD}{'='*72}{RESET}\n")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
