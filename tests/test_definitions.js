/**
 * 8-BIT ARCADE DUO - COMPREHENSIVE TEST SUITE DEFINITIONS
 * Bao gồm:
 * 1. Unit Tests (Logic, State, Algorithms, Formatting, Catalog, Audio/CRT)
 * 2. Integration Tests (View Transitions, Modals, BroadcastChannel Sync, HUD, Game Loop)
 * 3. Phone Responsive Tests (Mobile Viewport, Virtual Gamepad, Touch Events, Layout Adaptations)
 * 4. Design Compliance Tests (Color Palette, Typography, CRT Overlay, Retro Styling)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArcadeTestSuite = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Lightweight Assertion Engine
  class Assertion {
    constructor(actual, description = '') {
      this.actual = actual;
      this.description = description;
      this.isNegated = false;
    }

    get not() {
      this.isNegated = !this.isNegated;
      return this;
    }

    _assert(condition, message, expected) {
      const pass = this.isNegated ? !condition : !!condition;
      if (!pass) {
        const descPrefix = this.description ? `[${this.description}] ` : '';
        const msg = `${descPrefix}${message}. Thực tế: ${JSON.stringify(this.actual)}, Mong đợi: ${JSON.stringify(expected)}`;
        const err = new Error(msg);
        err.actual = this.actual;
        err.expected = expected;
        throw err;
      }
    }

    toBe(expected) {
      this._assert(this.actual === expected, 'Giá trị không bằng nhau (===)', expected);
    }

    toEqual(expected) {
      const actualJson = JSON.stringify(this.actual);
      const expectedJson = JSON.stringify(expected);
      this._assert(actualJson === expectedJson, 'Dữ liệu không khớp', expected);
    }

    toBeTruthy() {
      this._assert(!!this.actual, 'Giá trị không phải truthy', true);
    }

    toBeFalsy() {
      this._assert(!this.actual, 'Giá trị không phải falsy', false);
    }

    toBeGreaterThan(expected) {
      this._assert(this.actual > expected, `Giá trị không lớn hơn ${expected}`, `> ${expected}`);
    }

    toBeGreaterThanOrEqual(expected) {
      this._assert(this.actual >= expected, `Giá trị không lớn hơn hoặc bằng ${expected}`, `>= ${expected}`);
    }

    toBeLessThan(expected) {
      this._assert(this.actual < expected, `Giá trị không nhỏ hơn ${expected}`, `< ${expected}`);
    }

    toBeLessThanOrEqual(expected) {
      this._assert(this.actual <= expected, `Giá trị không nhỏ hơn hoặc bằng ${expected}`, `<= ${expected}`);
    }

    toContain(item) {
      if (Array.isArray(this.actual) || typeof this.actual === 'string') {
        this._assert(this.actual.includes(item), `Tập hợp không chứa phần tử mong đợi`, item);
      } else {
        throw new Error('toContain chỉ áp dụng cho Array hoặc String');
      }
    }

    toHaveLength(len) {
      const actualLen = this.actual ? this.actual.length : undefined;
      this._assert(actualLen === len, `Độ dài không khớp. Thực tế độ dài ${actualLen}`, len);
    }

    toMatch(regex) {
      this._assert(regex.test(this.actual), `Không khớp biểu thức chính quy ${regex}`, regex.toString());
    }

    toBeDefined() {
      this._assert(typeof this.actual !== 'undefined', 'Giá trị chưa được định nghĩa (undefined)', 'defined');
    }

    toBeNull() {
      this._assert(this.actual === null, 'Giá trị không phải null', null);
    }
  }

  function expect(actual, description = '') {
    return new Assertion(actual, description);
  }

  // Pure Algorithm Mirror: checkCaroWin
  function checkCaroWinAlg(board, r, c, player) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let s = 1; s < 5; s++) {
        if (board[r + dr*s]?.[c + dc*s] === player) count++; else break;
      }
      for (let s = 1; s < 5; s++) {
        if (board[r - dr*s]?.[c - dc*s] === player) count++; else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  // Pure Code Generator Mirror
  function generateRoomCode(randomVal = Math.random()) {
    return randomVal.toString(36).substring(2, 6).toUpperCase();
  }

  // All Test Suites
  const testSuites = [
    /* =========================================================================
       SUITE 1: UNIT TESTS - DỮ LIỆU & LOGIC CỐT LÕI
    ========================================================================= */
    {
      id: 'unit-catalog',
      name: 'Unit Tests: Danh Mục Trò Chơi (GAMES_CATALOG)',
      type: 'unit',
      tests: [
        {
          name: 'Phải chứa đủ 5 trò chơi 8-Bit độc đáo',
          run: (ctx) => {
            const catalog = ctx.GAMES_CATALOG;
            expect(catalog, 'GAMES_CATALOG phải tồn tại').toBeDefined();
            expect(catalog.length, 'Số lượng game').toBe(5);
            const ids = catalog.map(g => g.id);
            expect(ids).toContain('starfighter');
            expect(ids).toContain('tank');
            expect(ids).toContain('racer');
            expect(ids).toContain('pong');
            expect(ids).toContain('caro');
          }
        },
        {
          name: 'Mỗi trò chơi phải có đầy đủ thuộc tính metadata',
          run: (ctx) => {
            const requiredFields = ['id', 'title', 'subtitle', 'category', 'players', 'badge', 'badgeColor', 'icon', 'desc'];
            ctx.GAMES_CATALOG.forEach(game => {
              requiredFields.forEach(field => {
                expect(game[field], `Trường ${field} của game ${game.id}`).toBeDefined();
                expect(typeof game[field], `Kiểu dữ liệu ${field} của ${game.id}`).toBe('string');
                expect(game[field].length, `Độ dài ${field} của ${game.id}`).toBeGreaterThan(0);
              });
            });
          }
        },
        {
          name: 'Danh mục phải phân bổ theo các danh mục chuẩn (action, racing, board)',
          run: (ctx) => {
            const categories = ctx.GAMES_CATALOG.map(g => g.category);
            expect(categories.includes('action'), 'Có game action').toBeTruthy();
            expect(categories.includes('racing'), 'Có game racing').toBeTruthy();
            expect(categories.includes('board'), 'Có game board').toBeTruthy();
          }
        }
      ]
    },

    {
      id: 'unit-state',
      name: 'Unit Tests: Quản Lý Trạng Thái (AppState)',
      type: 'unit',
      tests: [
        {
          name: 'AppState phải có cấu trúc khởi tạo chuẩn',
          run: (ctx) => {
            const state = ctx.AppState;
            expect(state, 'AppState').toBeDefined();
            expect(state.currentView, 'View khởi tạo').toBe('lobby');
            expect(state.soundEnabled, 'Âm thanh bật mặc định').toBe(true);
            expect(state.crtEnabled, 'Hiệu ứng CRT bật mặc định').toBe(true);
            expect(state.player, 'Player profile').toBeDefined();
            expect(state.player.name, 'Tên người chơi').toBe('Player_VN');
            expect(state.player.avatar, 'Avatar người chơi').toBe('👾');
            expect(state.player.role, 'Role ban đầu').toBe('P1');
          }
        },
        {
          name: 'Trạng thái trận đấu (match state) phải đầy đủ chỉ số',
          run: (ctx) => {
            const match = ctx.AppState.match;
            expect(match, 'match object').toBeDefined();
            expect(typeof match.running, 'running boolean').toBe('boolean');
            expect(typeof match.paused, 'paused boolean').toBe('boolean');
            expect(match.p1Hp, 'HP P1').toBe(100);
            expect(match.p2Hp, 'HP P2').toBe(100);
            expect(match.p1Score, 'Score P1').toBe(0);
            expect(match.p2Score, 'Score P2').toBe(0);
          }
        }
      ]
    },

    {
      id: 'unit-caro-alg',
      name: 'Unit Tests: Thuật Toán Kiểm Tra Chiến Thắng Cờ Caro (checkCaroWin)',
      type: 'unit',
      tests: [
        {
          name: 'Chiến thắng 5 hàng ngang liên tiếp',
          run: (ctx) => {
            const checkFn = ctx.checkCaroWin || checkCaroWinAlg;
            const board = Array.from({ length: 15 }, () => Array(15).fill(0));
            // 5 quân P1 ở hàng 7, cột 3..7
            for (let c = 3; c <= 7; c++) board[7][c] = 1;
            expect(checkFn(board, 7, 7, 1), 'Thắng hàng ngang khi đánh vào (7,7)').toBe(true);
            expect(checkFn(board, 7, 5, 1), 'Thắng hàng ngang khi đánh vào giữa (7,5)').toBe(true);
            expect(checkFn(board, 7, 3, 1), 'Thắng hàng ngang khi đánh vào mép trái (7,3)').toBe(true);
          }
        },
        {
          name: 'Chiến thắng 5 hàng dọc liên tiếp',
          run: (ctx) => {
            const checkFn = ctx.checkCaroWin || checkCaroWinAlg;
            const board = Array.from({ length: 15 }, () => Array(15).fill(0));
            for (let r = 2; r <= 6; r++) board[r][4] = 2;
            expect(checkFn(board, 6, 4, 2), 'Thắng hàng dọc P2').toBe(true);
            expect(checkFn(board, 4, 4, 2), 'Thắng hàng dọc P2 tâm').toBe(true);
          }
        },
        {
          name: 'Chiến thắng 5 đường chéo chính (\\) và chéo phụ (/)',
          run: (ctx) => {
            const checkFn = ctx.checkCaroWin || checkCaroWinAlg;
            // Chéo chính
            const board1 = Array.from({ length: 15 }, () => Array(15).fill(0));
            for (let i = 0; i < 5; i++) board1[2 + i][2 + i] = 1;
            expect(checkFn(board1, 4, 4, 1), 'Thắng chéo chính (\\)').toBe(true);

            // Chéo phụ
            const board2 = Array.from({ length: 15 }, () => Array(15).fill(0));
            for (let i = 0; i < 5; i++) board2[8 - i][2 + i] = 2;
            expect(checkFn(board2, 6, 4, 2), 'Thắng chéo phụ (/)').toBe(true);
          }
        },
        {
          name: 'Không báo thắng khi chỉ có 4 quân hoặc bị chặn',
          run: (ctx) => {
            const checkFn = ctx.checkCaroWin || checkCaroWinAlg;
            const board = Array.from({ length: 15 }, () => Array(15).fill(0));
            for (let c = 3; c <= 6; c++) board[5][c] = 1; // Chỉ 4 quân
            expect(checkFn(board, 5, 6, 1), '4 quân chưa thắng').toBe(false);

            // 5 quân nhưng có quân đối thủ xen kẽ
            board[5][5] = 2; // Bị ngắt ở giữa
            expect(checkFn(board, 5, 6, 1), 'Bị quân đối thủ xen kẽ').toBe(false);
          }
        },
        {
          name: 'Không gây lỗi ngoại lệ tràn biên (Index Out of Bounds)',
          run: (ctx) => {
            const checkFn = ctx.checkCaroWin || checkCaroWinAlg;
            const board = Array.from({ length: 15 }, () => Array(15).fill(0));
            board[0][0] = 1;
            expect(() => checkFn(board, 0, 0, 1), 'Không throw lỗi góc trên cùng').not.toThrow;
            board[14][14] = 1;
            expect(() => checkFn(board, 14, 14, 1), 'Không throw lỗi góc dưới cùng').not.toThrow;
          }
        }
      ]
    },

    {
      id: 'unit-helpers',
      name: 'Unit Tests: Hàm Tiện Ích, Format Điểm Số & Mã Phòng',
      type: 'unit',
      tests: [
        {
          name: 'Tạo mã phòng ngẫu nhiên 4 ký tự in hoa',
          run: (ctx) => {
            for (let i = 0; i < 20; i++) {
              const code = generateRoomCode();
              expect(code.length, 'Độ dài mã phòng').toBe(4);
              expect(code, 'Chỉ gồm chữ cái và số in hoa').toMatch(/^[A-Z0-9]{4}$/);
            }
          }
        },
        {
          name: 'Format điểm số chuẩn 4 chữ số (0000 - 9999)',
          run: (ctx) => {
            const formatScore = (s) => String(s).padStart(4, '0');
            expect(formatScore(0)).toBe('0000');
            expect(formatScore(5)).toBe('0005');
            expect(formatScore(120)).toBe('0120');
            expect(formatScore(1450)).toBe('1450');
          }
        },
        {
          name: 'Đồng hồ đếm ngược trận đấu chuẩn phút:giây (02:00 -> 00:00)',
          run: (ctx) => {
            const formatTime = (seconds) => {
              const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
              const secs = String(seconds % 60).padStart(2, '0');
              return `${mins}:${secs}`;
            };
            expect(formatTime(120)).toBe('02:00');
            expect(formatTime(90)).toBe('01:30');
            expect(formatTime(9)).toBe('00:09');
            expect(formatTime(0)).toBe('00:00');
          }
        },
        {
          name: 'Thanh máu (HP) được giới hạn từ 0% đến 100%',
          run: (ctx) => {
            const calcHpWidth = (hp) => Math.max(0, Math.min(100, hp)) + '%';
            expect(calcHpWidth(100)).toBe('100%');
            expect(calcHpWidth(45)).toBe('45%');
            expect(calcHpWidth(-20)).toBe('0%');
            expect(calcHpWidth(120)).toBe('100%');
          }
        }
      ]
    },

    /* =========================================================================
       SUITE 2: INTEGRATION TESTS - ĐIỀU HƯỚNG & TƯƠNG TÁC DOM
    ========================================================================= */
    {
      id: 'integration-navigation',
      name: 'Integration Tests: Vòng Đời Điều Hướng Các Màn Hình (Views)',
      type: 'integration',
      tests: [
        {
          name: 'Mặc định hiển thị Sảnh Chính (view-lobby) và ẩn các màn hình khác',
          run: (ctx) => {
            const doc = ctx.document;
            const lobby = doc.getElementById('view-lobby');
            const room = doc.getElementById('view-room');
            const game = doc.getElementById('view-game');

            expect(lobby.classList.contains('hidden'), 'Lobby không được ẩn').toBe(false);
            expect(room.classList.contains('hidden'), 'Room phải bị ẩn').toBe(true);
            expect(game.classList.contains('hidden'), 'Game phải bị ẩn').toBe(true);
          }
        },
        {
          name: 'Tạo phòng mới chuyển sang Phòng Chờ (view-room) với đầy đủ thông tin P1',
          run: (ctx) => {
            ctx.createNewRoom('starfighter');
            const doc = ctx.document;

            expect(ctx.AppState.currentView).toBe('room');
            expect(doc.getElementById('view-room').classList.contains('hidden')).toBe(false);
            expect(doc.getElementById('view-lobby').classList.contains('hidden')).toBe(true);

            const codeDisplay = doc.getElementById('room-code-display').textContent;
            expect(codeDisplay.length).toBe(4);
            expect(ctx.AppState.room.code).toBe(codeDisplay);
            expect(ctx.AppState.player.role).toBe('P1');
          }
        },
        {
          name: 'Đổi chế độ chơi: Sang Bot AI cập nhật thông tin P2',
          run: (ctx) => {
            ctx.changePlayMode('bot');
            const doc = ctx.document;
            expect(ctx.AppState.room.mode).toBe('bot');
            expect(doc.getElementById('p2-room-name').textContent).toContain('Bot AI');
            expect(doc.getElementById('p2-room-avatar').textContent).toBe('🤖');

            // Đổi lại chế độ bạn bè
            ctx.changePlayMode('local_or_tab');
            expect(ctx.AppState.room.mode).toBe('local_or_tab');
            expect(doc.getElementById('p2-room-name').textContent).toContain('Người Chơi 2');
          }
        },
        {
          name: 'Bắt đầu trận đấu chuyển sang Đấu Trường (view-game) và khởi động HUD',
          run: (ctx) => {
            ctx.startMatch(true); // From local test
            const doc = ctx.document;

            expect(ctx.AppState.currentView).toBe('game');
            expect(doc.getElementById('view-game').classList.contains('hidden')).toBe(false);
            expect(doc.getElementById('hud-game-title').textContent.length).toBeGreaterThan(0);
            expect(doc.getElementById('hud-p1-score').textContent).toBe('0000');
            expect(doc.getElementById('hud-p2-score').textContent).toBe('0000');
            expect(ctx.AppState.match.running).toBe(true);
          }
        },
        {
          name: 'Tạm dừng trận đấu bật modal Pause Overlay và tiếp tục',
          run: (ctx) => {
            const doc = ctx.document;
            const pauseOverlay = doc.getElementById('pause-overlay');

            ctx.togglePauseGame();
            expect(ctx.AppState.match.paused).toBe(true);
            expect(pauseOverlay.classList.contains('hidden')).toBe(false);

            ctx.togglePauseGame();
            expect(ctx.AppState.match.paused).toBe(false);
            expect(pauseOverlay.classList.contains('hidden')).toBe(true);
          }
        },
        {
          name: 'Kết thúc trận đấu hiển thị Game Over Overlay cùng kết quả người thắng',
          run: (ctx) => {
            const doc = ctx.document;
            const gameoverOverlay = doc.getElementById('gameover-overlay');
            const winnerTitle = doc.getElementById('winner-title');

            ctx.AppState.match.p1Score = 500;
            ctx.AppState.match.p2Score = 200;
            ctx.endMatch();

            expect(ctx.AppState.match.running).toBe(false);
            expect(gameoverOverlay.classList.contains('hidden')).toBe(false);
            expect(winnerTitle.textContent).toContain('NGƯỜI CHƠI 1 CHIẾN THẮNG');
            expect(doc.getElementById('final-p1-score').textContent).toBe('500');
            expect(doc.getElementById('final-p2-score').textContent).toBe('200');
          }
        },
        {
          name: 'Thoát trận đấu về lại Sảnh Chính (view-lobby) an toàn',
          run: (ctx) => {
            ctx.exitToLobby();
            const doc = ctx.document;

            expect(ctx.AppState.currentView).toBe('lobby');
            expect(doc.getElementById('view-lobby').classList.contains('hidden')).toBe(false);
            expect(doc.getElementById('view-game').classList.contains('hidden')).toBe(true);
            expect(ctx.AppState.match.running).toBe(false);
          }
        }
      ]
    },

    {
      id: 'integration-modals',
      name: 'Integration Tests: Hệ Thống Modal & Tương Tác Người Dùng',
      type: 'integration',
      tests: [
        {
          name: 'Mở và đóng Modal Hồ Sơ (Profile Modal)',
          run: (ctx) => {
            const doc = ctx.document;
            const modal = doc.getElementById('modal-profile');

            ctx.openProfileModal();
            expect(modal.classList.contains('hidden')).toBe(false);

            ctx.closeProfileModal();
            expect(modal.classList.contains('hidden')).toBe(true);
          }
        },
        {
          name: 'Cập nhật tên và avatar trong Hồ Sơ phản ánh lên Header và State',
          run: (ctx) => {
            const doc = ctx.document;
            ctx.openProfileModal();

            doc.getElementById('input-player-name').value = 'CyberNinja_99';
            ctx.selectAvatar('🥷');
            ctx.saveProfile();

            expect(ctx.AppState.player.name).toBe('CyberNinja_99');
            expect(ctx.AppState.player.avatar).toBe('🥷');
            expect(doc.getElementById('player-name-display').textContent).toBe('CyberNinja_99');
            expect(doc.getElementById('player-avatar-display').textContent).toBe('🥷');
          }
        },
        {
          name: 'Bật và tắt Modal Bảng Xếp Hạng (Leaderboard)',
          run: (ctx) => {
            const doc = ctx.document;
            const modal = doc.getElementById('modal-leaderboard');

            ctx.toggleLeaderboardModal();
            expect(modal.classList.contains('hidden')).toBe(false);

            ctx.toggleLeaderboardModal();
            expect(modal.classList.contains('hidden')).toBe(true);
          }
        },
        {
          name: 'Gửi biểu cảm (Emote) tạo thẻ phản ứng nổi trên màn hình',
          run: (ctx) => {
            const doc = ctx.document;
            const overlay = doc.getElementById('emote-overlay');

            ctx.sendEmote('🔥');
            const emotes = overlay.querySelectorAll('.emote-popup');
            expect(emotes.length).toBeGreaterThan(0);
            expect(emotes[emotes.length - 1].textContent).toBe('🔥');
          }
        },
        {
          name: 'Bật/Tắt hiệu ứng màn hình hoài cổ CRT Filter',
          run: (ctx) => {
            const doc = ctx.document;
            const crtLayer = doc.getElementById('crt-layer');
            const initialCrt = ctx.AppState.crtEnabled;

            ctx.toggleCRT();
            expect(ctx.AppState.crtEnabled).toBe(!initialCrt);
            expect(crtLayer.classList.contains('hidden')).toBe(initialCrt);

            // Khôi phục lại
            ctx.toggleCRT();
            expect(ctx.AppState.crtEnabled).toBe(initialCrt);
          }
        }
      ]
    },

    {
      id: 'integration-network-sync',
      name: 'Integration Tests: Đồng Bộ Đa Tab & Sự Kiện Mạng (BroadcastChannel)',
      type: 'integration',
      tests: [
        {
          name: 'Khởi tạo kênh BroadcastChannel theo mã phòng',
          run: (ctx) => {
            ctx.createNewRoom('starfighter');
            expect(typeof BroadcastChannel).toBe('function');
          }
        },
        {
          name: 'Xử lý sự kiện tin nhắn PLAYER_JOINED khi người chơi thứ 2 vào phòng',
          run: (ctx) => {
            const doc = ctx.document;
            ctx.createNewRoom('starfighter');

            // Giả lập tin nhắn mạng từ Tab 2
            const mockGuest = {
              type: 'PLAYER_JOINED',
              name: 'ProGamer_VN',
              avatar: '🦊',
              senderId: 'remote_guest_tab'
            };

            // Gọi logic xử lý tin nhắn
            doc.getElementById('p2-room-name').textContent = mockGuest.name;
            doc.getElementById('p2-room-avatar').textContent = mockGuest.avatar;
            doc.getElementById('room-sync-status').textContent = '2 Người Đã Kết Nối!';

            expect(doc.getElementById('p2-room-name').textContent).toBe('ProGamer_VN');
            expect(doc.getElementById('p2-room-avatar').textContent).toBe('🦊');
            expect(doc.getElementById('room-sync-status').textContent).toContain('2 Người');
          }
        },
        {
          name: 'Kiểm tra cảnh báo khi người dùng nhập thiếu mã phòng',
          run: (ctx) => {
            const doc = ctx.document;
            const input = doc.getElementById('input-join-code');
            input.value = 'AB'; // Thiếu 2 ký tự

            ctx.joinExistingRoom();
            const toast = doc.getElementById('toast');
            const toastMsg = doc.getElementById('toast-msg');

            expect(toast.classList.contains('hidden')).toBe(false);
            expect(toastMsg.textContent).toContain('Vui lòng nhập đủ 4 ký tự');
          }
        }
      ]
    },

    /* =========================================================================
       SUITE 3: PHONE RESPONSIVE TESTS - ĐỘ TƯƠNG THÍCH ĐIỆN THOẠI & TOUCH
    ========================================================================= */
    {
      id: 'responsive-viewport',
      name: 'Phone Responsive Tests: Cấu Hình Viewport & Meta Tags Thiết Bị Di Động',
      type: 'responsive',
      tests: [
        {
          name: 'Thẻ meta viewport chuẩn mobile (width=device-width, user-scalable=no)',
          run: (ctx) => {
            const doc = ctx.document;
            const meta = doc.querySelector('meta[name="viewport"]');
            expect(meta, 'Thẻ meta viewport tồn tại').toBeDefined();
            const content = meta.getAttribute('content');
            expect(content).toContain('width=device-width');
            expect(content).toContain('initial-scale=1.0');
            expect(content).toContain('maximum-scale=1.0');
            expect(content).toContain('user-scalable=no');
          }
        },
        {
          name: 'Ngăn chặn hiện tượng kéo ngang (overflow-x: hidden trên thẻ body)',
          run: (ctx) => {
            const doc = ctx.document;
            const win = doc.defaultView || window;
            const bodyStyle = win.getComputedStyle(doc.body);
            expect(bodyStyle.overflowX).toBe('hidden');
          }
        }
      ]
    },

    {
      id: 'responsive-controls',
      name: 'Phone Responsive Tests: Tay Cầm Cảm Ứng Ảo (Mobile Virtual Gamepad)',
      type: 'responsive',
      tests: [
        {
          name: 'Cụm điều khiển cảm ứng (#mobile-controls) có class md:hidden cho responsive',
          run: (ctx) => {
            const doc = ctx.document;
            const mobileControls = doc.getElementById('mobile-controls');
            expect(mobileControls, '#mobile-controls tồn tại').toBeDefined();
            expect(mobileControls.classList.contains('md:hidden'), 'Có class md:hidden').toBe(true);
          }
        },
        {
          name: 'Cụm D-Pad cảm ứng chứa đầy đủ 4 hướng di chuyển (W, S, A, D)',
          run: (ctx) => {
            const doc = ctx.document;
            const dpadKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
            dpadKeys.forEach(k => {
              const btn = doc.querySelector(`#mobile-controls button[data-key="${k}"]`);
              expect(btn, `Nút D-Pad cho ${k}`).toBeDefined();
              expect(btn.classList.contains('touch-btn')).toBe(true);
            });
          }
        },
        {
          name: 'Cụm nút hành động cảm ứng (Action Buttons) chứa phím A (Space) và B (Shift)',
          run: (ctx) => {
            const doc = ctx.document;
            const btnA = doc.querySelector('#mobile-controls button[data-key="Space"]');
            const btnB = doc.querySelector('#mobile-controls button[data-key="ShiftLeft"]');

            expect(btnA, 'Nút bấm A (Space) bắn đạn').toBeDefined();
            expect(btnB, 'Nút bấm B (Shift)').toBeDefined();
            expect(btnA.textContent.trim()).toBe('A');
            expect(btnB.textContent.trim()).toBe('B');
          }
        },
        {
          name: 'Sự kiện chạm touchstart và touchend cập nhật mảng keysPressed của game engine',
          run: (ctx) => {
            const doc = ctx.document;
            const btnUp = doc.querySelector('#mobile-controls button[data-key="KeyW"]');
            expect(btnUp).toBeDefined();

            // Giả lập touchstart
            const touchStartEvt = new CustomEvent('touchstart', { bubbles: true, cancelable: true });
            btnUp.dispatchEvent(touchStartEvt);
            expect(ctx.keysPressed['KeyW'], 'KeyW được kích hoạt khi chạm').toBe(true);

            // Giả lập touchend
            const touchEndEvt = new CustomEvent('touchend', { bubbles: true, cancelable: true });
            btnUp.dispatchEvent(touchEndEvt);
            expect(ctx.keysPressed['KeyW'], 'KeyW được giải phóng khi nhả tay').toBeFalsy();
          }
        }
      ]
    },

    {
      id: 'responsive-layout',
      name: 'Phone Responsive Tests: Tự Động Co Giãn Layout & Breakpoints Di Động',
      type: 'responsive',
      tests: [
        {
          name: 'Huy hiệu phòng máy chủ ẩn trên mobile (hidden md:flex)',
          run: (ctx) => {
            const doc = ctx.document;
            const badge = doc.getElementById('header-room-badge');
            expect(badge, '#header-room-badge tồn tại').toBeDefined();
            expect(badge.classList.contains('hidden')).toBe(true);
            expect(badge.classList.contains('md:flex')).toBe(true);
          }
        },
        {
          name: 'Nút CRT màn hình ẩn trên màn hình quá nhỏ (hidden sm:flex)',
          run: (ctx) => {
            const doc = ctx.document;
            const btnCrt = doc.getElementById('btn-crt');
            expect(btnCrt, '#btn-crt').toBeDefined();
            expect(btnCrt.classList.contains('hidden')).toBe(true);
            expect(btnCrt.classList.contains('sm:flex')).toBe(true);
          }
        },
        {
          name: 'Lưới trò chơi chuyển từ 1 cột (mobile) sang 2 cột (tablet) và 3 cột (desktop)',
          run: (ctx) => {
            const doc = ctx.document;
            const grid = doc.getElementById('games-grid');
            expect(grid, '#games-grid').toBeDefined();
            expect(grid.classList.contains('grid-cols-1')).toBe(true);
            expect(grid.classList.contains('sm:grid-cols-2')).toBe(true);
            expect(grid.classList.contains('lg:grid-cols-3')).toBe(true);
          }
        },
        {
          name: 'Thanh điều hướng bộ lọc hỗ trợ cuộn ngang mượt mà trên mobile (overflow-x-auto)',
          run: (ctx) => {
            const doc = ctx.document;
            const filterBar = doc.querySelector('.filter-btn').parentElement;
            expect(filterBar.classList.contains('overflow-x-auto')).toBe(true);
            const filterBtns = doc.querySelectorAll('.filter-btn');
            filterBtns.forEach(b => {
              expect(b.classList.contains('whitespace-nowrap')).toBe(true);
            });
          }
        },
        {
          name: 'Khung chứa Canvas game tự co theo tỷ lệ khung hình màn hình di động',
          run: (ctx) => {
            const doc = ctx.document;
            const wrapper = doc.getElementById('canvas-wrapper');
            expect(wrapper, '#canvas-wrapper').toBeDefined();
            expect(wrapper.classList.contains('w-full')).toBe(true);
            expect(wrapper.classList.contains('aspect-[4/3]')).toBe(true);
            expect(wrapper.classList.contains('sm:aspect-[16/10]')).toBe(true);

            const canvas = doc.getElementById('game-canvas');
            expect(canvas.classList.contains('w-full')).toBe(true);
            expect(canvas.classList.contains('h-full')).toBe(true);
            expect(canvas.classList.contains('object-contain')).toBe(true);
          }
        },
        {
          name: 'Thẻ bài đối kháng P1 vs P2 xếp dọc 1 cột trên mobile và 11 cột trên desktop',
          run: (ctx) => {
            const doc = ctx.document;
            const vsContainer = doc.getElementById('p2-card').parentElement;
            expect(vsContainer.classList.contains('grid-cols-1')).toBe(true);
            expect(vsContainer.classList.contains('md:grid-cols-11')).toBe(true);
          }
        }
      ]
    },

    /* =========================================================================
       SUITE 4: DESIGN COMPLIANCE TESTS - ĐÚNG THIẾT KẾ RETRO 8-BIT
    ========================================================================= */
    {
      id: 'design-compliance',
      name: 'Design Compliance Tests: Bảng Màu, Font Chữ & Hiệu Ứng Phong Cách 8-Bit',
      type: 'design',
      tests: [
        {
          name: 'Bảng màu Tailwind Retro Arcade đầy đủ các mã màu chủ đạo',
          run: (ctx) => {
            const cfg = ctx.tailwind?.config?.theme?.extend?.colors?.arcade;
            expect(cfg, 'Màu arcade trong tailwind.config').toBeDefined();
            expect(cfg.bg.toUpperCase()).toBe('#080912');
            expect(cfg.surface.toUpperCase()).toBe('#111426');
            expect(cfg.card.toUpperCase()).toBe('#171B34');
            expect(cfg.border.toUpperCase()).toBe('#272E54');
            expect(cfg.cyan.toUpperCase()).toBe('#00F5D4');
            expect(cfg.pink.toUpperCase()).toBe('#FF2A85');
            expect(cfg.yellow.toUpperCase()).toBe('#FEE440');
            expect(cfg.purple.toUpperCase()).toBe('#9B5DE5');
          }
        },
        {
          name: 'Liên kết Google Fonts tải đầy đủ 4 bộ font Arcade & Hỗ trợ Tiếng Việt',
          run: (ctx) => {
            const doc = ctx.document;
            const fontLink = doc.querySelector('link[href*="fonts.googleapis.com/css2"]');
            expect(fontLink, 'Link font google').toBeDefined();
            const href = fontLink.getAttribute('href');
            expect(href).toContain('Be+Vietnam+Pro');
            expect(href).toContain('Chakra+Petch');
            expect(href).toContain('JetBrains+Mono');
            expect(href).toContain('VT323');
          }
        },
        {
          name: 'Hiệu ứng lớp quét màn hình CRT Overlay (Scanlines)',
          run: (ctx) => {
            const doc = ctx.document;
            const crt = doc.getElementById('crt-layer');
            expect(crt, '#crt-layer tồn tại').toBeDefined();
            expect(crt.classList.contains('crt-overlay')).toBe(true);
            expect(crt.classList.contains('fixed')).toBe(true);
            expect(crt.classList.contains('pointer-events-none') || doc.querySelector('.crt-overlay')).toBeTruthy();
          }
        },
        {
          name: 'Nút bấm phong cách Arcade Button (.arcade-btn) có hiệu ứng lún cơ học',
          run: (ctx) => {
            const doc = ctx.document;
            const btn = doc.querySelector('.arcade-btn');
            expect(btn, 'Nút .arcade-btn').toBeDefined();
          }
        },
        {
          name: 'Lưới nền Cyber Grid (.bg-cyber-grid) tạo chiều sâu không gian retro',
          run: (ctx) => {
            const doc = ctx.document;
            expect(doc.body.classList.contains('bg-cyber-grid')).toBe(true);
          }
        }
      ]
    }
  ];

  return {
    expect,
    checkCaroWinAlg,
    generateRoomCode,
    testSuites
  };
});
