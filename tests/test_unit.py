#!/usr/bin/env python3
"""
=============================================================================
8-BIT ARCADE DUO - UNIT TEST SUITE (Python)
Kiem tra toan dien Logic cot loi, Du lieu, Cau truc HTML va Thiet ke Retro
=============================================================================
"""

import unittest
import re
import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HTML_FILE = BASE_DIR / "8bit_arcade_duo.html"

def check_caro_win(board, r, c, player):
    """Mirror implementation cua checkCaroWin trong file HTML"""
    dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
    size = len(board)
    for dr, dc in dirs:
        count = 1
        for s in range(1, 5):
            nr, nc = r + dr * s, c + dc * s
            if 0 <= nr < size and 0 <= nc < size and board[nr][nc] == player:
                count += 1
            else:
                break
        for s in range(1, 5):
            nr, nc = r - dr * s, c - dc * s
            if 0 <= nr < size and 0 <= nc < size and board[nr][nc] == player:
                count += 1
            else:
                break
        if count >= 5:
            return True
    return False


class TestArcadeHTMLStructure(unittest.TestCase):
    """Kiem tra tinh hop le cua ma nguon HTML va The Meta Responsive"""

    @classmethod
    def setUpClass(cls):
        cls.assertTrue(HTML_FILE.exists(), f"Khong tim thay file {HTML_FILE}")
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            cls.content = f.read()

    def test_doctype_and_lang(self):
        """Kiem tra Doctype va ngon ngu Tieng Viet (lang='vi')"""
        self.assertIn("<!DOCTYPE html>", self.content)
        self.assertIn('<html lang="vi">', self.content)

    def test_mobile_viewport_meta(self):
        """Kiem tra the meta viewport chuan cho dien thoai di dong"""
        viewport_regex = re.compile(
            r'<meta\s+name=["\']viewport["\']\s+content=["\']([^"\']+)["\']',
            re.IGNORECASE
        )
        match = viewport_regex.search(self.content)
        self.assertIsNotNone(match, "Thieu the meta viewport")
        content = match.group(1)
        self.assertIn("width=device-width", content)
        self.assertIn("initial-scale=1.0", content)
        self.assertIn("maximum-scale=1.0", content)
        self.assertIn("user-scalable=no", content)

    def test_google_fonts_vietnamese_and_arcade(self):
        """Kiem tra 4 font chu: Be Vietnam Pro, Chakra Petch, JetBrains Mono, VT323"""
        self.assertIn("Be+Vietnam+Pro", self.content)
        self.assertIn("Chakra+Petch", self.content)
        self.assertIn("JetBrains+Mono", self.content)
        self.assertIn("VT323", self.content)

    def test_tailwind_and_lucide_cdn(self):
        """Kiem tra nạp Tailwind CSS va icon Lucide"""
        self.assertIn("cdn.tailwindcss.com", self.content)
        self.assertIn("unpkg.com/lucide@latest", self.content)


class TestDesignTokensAndColors(unittest.TestCase):
    """Kiem tra bang mau 8-Bit va phong cach thiet ke retro"""

    @classmethod
    def setUpClass(cls):
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            cls.content = f.read()

    def test_arcade_color_palette(self):
        """Kiem tra 8 ma mau chuan trong cau hinh tailwind.config"""
        expected_colors = {
            "bg": "#080912",
            "surface": "#111426",
            "card": "#171B34",
            "border": "#272E54",
            "cyan": "#00F5D4",
            "pink": "#FF2A85",
            "yellow": "#FEE440",
            "purple": "#9B5DE5",
        }
        for name, hex_val in expected_colors.items():
            pattern = re.compile(rf"{name}\s*:\s*['\"]{hex_val}['\"]", re.IGNORECASE)
            self.assertTrue(
                pattern.search(self.content),
                f"Khong tim thay mau arcade.{name}: {hex_val}"
            )

    def test_crt_scanlines_styling(self):
        """Kiem tra hieu ung CRT Overlay co lop gradient quet scanlines"""
        self.assertIn(".crt-overlay", self.content)
        self.assertIn("rgba(0, 0, 0, 0.25) 50%", self.content)
        self.assertIn("pointer-events: none;", self.content)

    def test_cyber_grid_styling(self):
        """Kiem tra luoi khong gian Cyber Grid (36px 36px)"""
        self.assertIn(".bg-cyber-grid", self.content)
        self.assertIn("background-size: 36px 36px;", self.content)

    def test_retro_button_active_feedback(self):
        """Kiem tra hieu ung nhan nut co hoc .arcade-btn:active"""
        self.assertIn(".arcade-btn:active", self.content)
        self.assertIn("transform: translateY(3px);", self.content)


class TestDOMIdsAndComponents(unittest.TestCase):
    """Kiem tra day du cac ID can thiet cho UI va Game Engine"""

    @classmethod
    def setUpClass(cls):
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            cls.content = f.read()

    def test_required_element_ids(self):
        """Kiem tra su hien dien cua tat ca ID quan trong"""
        required_ids = [
            # Top Navigation
            "crt-layer", "header-room-badge", "btn-sound", "btn-crt",
            "player-avatar-display", "player-name-display",
            # Views
            "view-lobby", "view-room", "view-game",
            # Lobby components
            "input-join-code", "public-rooms-list", "games-grid",
            # Waiting Room components
            "room-code-display", "tip-room-code", "room-sync-status",
            "room-game-select", "room-mode-select",
            "p1-room-avatar", "p1-room-name",
            "p2-card", "p2-room-avatar", "p2-room-name", "p2-ready-badge",
            # HUD components
            "hud-p1-avatar", "hud-p1-name", "hud-p1-score", "hud-p1-hp",
            "hud-p2-avatar", "hud-p2-name", "hud-p2-score", "hud-p2-hp",
            "hud-game-title", "hud-timer",
            # Canvas & overlays
            "canvas-wrapper", "game-canvas", "emote-overlay",
            "pause-overlay", "gameover-overlay",
            "winner-title", "winner-subtitle", "final-p1-score", "final-p2-score",
            # Mobile virtual gamepad
            "mobile-controls",
            # Modals & Toast
            "modal-profile", "input-player-name", "avatar-selector",
            "modal-leaderboard", "toast", "toast-msg"
        ]

        for elem_id in required_ids:
            pattern = re.compile(rf'id=["\']{elem_id}["\']')
            self.assertTrue(
                pattern.search(self.content),
                f"Thieu phan tu voi id='{elem_id}' trong HTML"
            )


class TestMobileResponsiveDesignClasses(unittest.TestCase):
    """Kiem tra cac lop Responsive cho man hinh dien thoai theo thiet ke"""

    @classmethod
    def setUpClass(cls):
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            cls.content = f.read()

    def test_mobile_virtual_gamepad_responsiveness(self):
        """Tay cam ao phai co md:hidden (chi hien tren man hinh di dong)"""
        pattern = re.compile(r'id=["\']mobile-controls["\'][^>]*class=["\'][^"\']*md:hidden')
        self.assertTrue(pattern.search(self.content), "#mobile-controls phai co class md:hidden")

    def test_dpad_touch_buttons(self):
        """Cụm D-pad ao chua 4 nut W, S, A, D voi thuoc tinh data-key"""
        for key in ["KeyW", "KeyS", "KeyA", "KeyD"]:
            pattern = re.compile(rf'data-key=["\']{key}["\'][^>]*class=["\'][^"\']*touch-btn')
            self.assertTrue(pattern.search(self.content), f"Nút D-Pad {key} voi class touch-btn phai ton tai")

    def test_action_touch_buttons(self):
        """Cum nut hanh dong ao chua ShiftLeft (B) va Space (A)"""
        for key in ["ShiftLeft", "Space"]:
            pattern = re.compile(rf'data-key=["\']{key}["\'][^>]*class=["\'][^"\']*touch-btn')
            self.assertTrue(pattern.search(self.content), f"Nút Action {key} voi class touch-btn phai ton tai")

    def test_header_room_badge_responsiveness(self):
        """Huy hieu phong may chu an tren mobile (hidden md:flex)"""
        pattern = re.compile(r'id=["\']header-room-badge["\'][^>]*class=["\'][^"\']*hidden md:flex')
        self.assertTrue(pattern.search(self.content), "#header-room-badge phai co class 'hidden md:flex'")

    def test_games_grid_responsive_columns(self):
        """Luoi game 1 cot mobile, 2 cot tablet, 3 cot desktop"""
        pattern = re.compile(r'id=["\']games-grid["\'][^>]*class=["\'][^"\']*grid-cols-1\s+sm:grid-cols-2\s+lg:grid-cols-3')
        self.assertTrue(pattern.search(self.content), "#games-grid phai co grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")

    def test_canvas_responsive_aspect_ratio(self):
        """Canvas wrapper co aspect-[4/3] mobile va sm:aspect-[16/10] desktop"""
        pattern = re.compile(r'id=["\']canvas-wrapper["\'][^>]*class=["\'][^"\']*aspect-\[4/3\]\s+sm:aspect-\[16/10\]')
        self.assertTrue(pattern.search(self.content), "#canvas-wrapper phai co aspect-[4/3] sm:aspect-[16/10]")


class TestCaroWinAlgorithm(unittest.TestCase):
    """Kiem tra thuat toan thang cuoc Co Caro (checkCaroWin)"""

    def setUp(self):
        self.board = [[0 for _ in range(15)] for _ in range(15)]

    def test_horizontal_win(self):
        """Thang 5 quan hang ngang lien tiep"""
        for c in range(3, 8):
            self.board[7][c] = 1
        self.assertTrue(check_caro_win(self.board, 7, 7, 1))
        self.assertTrue(check_caro_win(self.board, 7, 5, 1))
        self.assertTrue(check_caro_win(self.board, 7, 3, 1))
        self.assertFalse(check_caro_win(self.board, 7, 7, 2))

    def test_vertical_win(self):
        """Thang 5 quan hang doc lien tiep"""
        for r in range(4, 9):
            self.board[r][10] = 2
        self.assertTrue(check_caro_win(self.board, 8, 10, 2))
        self.assertTrue(check_caro_win(self.board, 6, 10, 2))

    def test_main_diagonal_win(self):
        """Thang 5 quan duong cheo chinh (\\)"""
        for i in range(5):
            self.board[3 + i][3 + i] = 1
        self.assertTrue(check_caro_win(self.board, 5, 5, 1))

    def test_anti_diagonal_win(self):
        """Thang 5 quan duong cheo phu (/)"""
        for i in range(5):
            self.board[10 - i][2 + i] = 2
        self.assertTrue(check_caro_win(self.board, 8, 4, 2))

    def test_four_in_a_row_is_not_win(self):
        """Chi 4 quan chua du de chien thang"""
        for c in range(3, 7):
            self.board[5][c] = 1
        self.assertFalse(check_caro_win(self.board, 5, 6, 1))

    def test_boundary_no_exception(self):
        """Danh tai cac goc (0,0) va (14,14) khong gay loi tran mang"""
        self.board[0][0] = 1
        self.assertFalse(check_caro_win(self.board, 0, 0, 1))
        self.board[14][14] = 2
        self.assertFalse(check_caro_win(self.board, 14, 14, 2))


class TestGameCatalogIntegrity(unittest.TestCase):
    """Kiem tra du lieu GAMES_CATALOG khai bao trong JS"""

    @classmethod
    def setUpClass(cls):
        with open(HTML_FILE, "r", encoding="utf-8") as f:
            cls.content = f.read()

    def test_games_catalog_items(self):
        """Kiem tra 5 game: starfighter, tank, racer, pong, caro"""
        expected_games = [
            ("starfighter", "Bắn Tàu Bay Đôi", "action"),
            ("tank", "Xe Tăng Đại Chiến", "action"),
            ("racer", "Đua Xe Tốc Độ", "racing"),
            ("pong", "Bóng Bàn Huyền Thoại", "racing"),
            ("caro", "Cờ Caro Siêu Tốc", "board"),
        ]
        for game_id, title, category in expected_games:
            self.assertIn(f"id: '{game_id}'", self.content)
            self.assertIn(f"title: '{title}'", self.content)
            self.assertIn(f"category: '{category}'", self.content)


if __name__ == "__main__":
    unittest.main(verbosity=2)
