/**
 * 8-BIT ARCADE DUO - INTERNATIONALIZATION (i18n) ENGINE
 * Hỗ trợ đa ngôn ngữ mở rộng: Tiếng Việt (vi), English (en), 中文 (zh)
 * Tương thích Universal Module Definition (Browser, Node.js CommonJS & ESM)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.i18n = factory().i18n;
    root.I18nEngine = factory().I18nEngine;
    root.SUPPORTED_LANGS = factory().SUPPORTED_LANGS;
    root.TRANSLATIONS = factory().TRANSLATIONS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const SUPPORTED_LANGS = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', short: 'VI' },
    { code: 'en', name: 'English', flag: '🇬🇧', short: 'EN' },
    { code: 'zh', name: '中文', flag: '🇨🇳', short: 'ZH' }
  ];

  const TRANSLATIONS = {
    vi: {
      // Header & Brand
      app_subtitle: 'Đấu trường 2 người chơi trực tuyến',
      server_status: 'Máy chủ Việt Nam:',
      server_online: 'ONLINE',
      btn_sound: 'Bật/Tắt Âm Thanh 8-Bit',
      btn_crt: 'Hiệu ứng màn hình CRT',
      btn_lang: 'Đổi ngôn ngữ',

      // Hero & Lobby
      hero_title: 'ĐẤU TRƯỜNG RETRO 8-BIT TRỰC TUYẾN',
      hero_title_html: 'THÁCH ĐẤU BẠN BÈ TRONG THẾ GIỚI <span class="text-transparent bg-clip-text bg-gradient-to-r from-arcade-cyan via-arcade-yellow to-arcade-pink">GAME 8-BIT</span>',
      hero_badge: 'Hỗ trợ chơi 2 người Online & Chia đôi bàn phím',
      hero_desc: 'Tạo phòng riêng trong 1 giây, gửi mã 4 ký tự cho bạn bè hoặc mở 2 tab trình duyệt để trải nghiệm đồng bộ thời gian thực mượt mà trên cả điện thoại và máy tính.',
      btn_create_room: 'Tạo Phòng Chơi Ngay',
      btn_join_room: 'Vào Phòng',
      btn_leaderboard: 'Bảng Xếp Hạng',
      input_room_code: 'Nhập mã 4 ký tự...',
      room_code_placeholder: 'NHẬP MÃ PHÒNG',
      active_rooms_title: 'Phòng Đang Hoạt Động',
      online_players_count: '128 Người Online',
      no_active_rooms: 'Chưa có phòng nào chờ. Hãy bấm "Tạo Phòng Chơi Ngay" ở trên!',
      room_code_prefix: 'Mã:',
      host_prefix: 'Chủ phòng:',
      btn_join_quick: 'Tham gia',
      
      // Filter Tabs
      tab_all: 'Tất Cả Trò Chơi (5)',
      tab_action: 'Bắn Súng & Hành Động',
      tab_racing: 'Đua Xe & Thể Thao',
      tab_board: 'Trí Tuệ 2 Người',
      
      // Games
      game_tank: 'Xe Tăng Đại Chiến',
      game_tank_desc: 'Đấu tăng chiến thuật phá gạch, né đạn và thu thập vật phẩm tăng sức mạnh.',
      game_starfighter: 'Bắn Tàu Bay Đôi',
      game_starfighter_desc: 'Cùng đồng đội bắn hạ hạm đội ngoài hành tinh hoặc so tài điểm số trực tiếp.',
      game_caro: 'Cờ Caro Siêu Tốc',
      game_caro_desc: 'Đấu trí 5 quân chặn 2 đầu trên bàn cờ 15x15 siêu mượt.',
      game_racer: 'Đua Xe Tốc Độ',
      game_racer_desc: 'Lách qua chướng ngại vật, ăn tăng tốc Nitro và cán đích trước đối thủ.',
      game_pong: 'Bóng Bàn Huyền Thoại',
      game_pong_desc: 'Phản xạ cực hạn với bóng tăng tốc dần sau mỗi cú đánh trả.',
      players_2p_online: '2 Người Online / Chung Máy',
      players_2p_vs: '2 Người Đối Kháng',
      players_2p_speed: '2 Người Đua Tốc Độ',
      players_2p_reflex: '2 Người Phản Xạ',
      players_2p_brain: '2 Người Đấu Trí',
      
      // Status & Actions
      status_waiting: 'Đang chờ đối thủ...',
      status_playing: 'Đang thi đấu',
      mode_pvp_local: '2 Người (Chung máy)',
      mode_pvp_online: 'Đấu Online (P1 vs P2)',
      mode_bot: 'Luyện tập với BOT AI',
      btn_play_now: 'Chơi Ngay',
      btn_leave_room: 'Rời Phòng',
      btn_ready: 'SẴN SÀNG',
      btn_rematch: 'ĐẤU LẠI',
      
      // Game Room View
      room_code_label: 'Mã Phòng:',
      room_sync_ready: 'Đã sẵn sàng đồng bộ',
      selected_game_label: 'Trò chơi đã chọn',
      p1_title: 'NGƯỜI CHƠI 1 (P1)',
      p2_title: 'NGƯỜI CHƠI 2 (P2)',
      p1_controls: 'Điều khiển: W A S D + SPACE',
      p2_controls: 'Điều khiển: Mũi Tên + ENTER',
      p1_ready: 'ĐÃ SẴN SÀNG',
      p2_ready: 'SẴN SÀNG CHIẾN ĐẤU',
      btn_start_match: 'BẮT ĐẦU TRẬN ĐẤU NGAY',
      tip_multitab: 'Mẹo test Online ngay lập tức: Mở thêm 1 tab trình duyệt mới với trang này và nhập mã phòng để 2 người điều khiển độc lập!',
      
      // Game HUD & In-game
      round: 'HIỆP',
      winner: 'CHIẾN THẮNG!',
      draw: 'HÒA!',
      defeat: 'THẤT BẠI!',
      score: 'ĐIỂM',
      health: 'MÁU',
      
      // Alerts & Notifications
      copied_code: 'Đã sao chép mã phòng!',
      error_invalid_code: 'Mã phòng phải có đúng 4 ký tự!',
      room_not_found: 'Không tìm thấy phòng!',
      player_joined: 'Người chơi đã vào phòng!',
      player_left: 'Đối thủ đã rời phòng!',
      quick_emotes: 'Gửi biểu cảm'
    },

    en: {
      // Header & Brand
      app_subtitle: 'Online 2-Player Retro Arena',
      server_status: 'Global Server:',
      server_online: 'ONLINE',
      btn_sound: 'Toggle 8-Bit Audio',
      btn_crt: 'CRT Display Effect',
      btn_lang: 'Change Language',

      // Hero & Lobby
      hero_title: 'RETRO 8-BIT ONLINE DUO ARENA',
      hero_title_html: 'CHALLENGE YOUR FRIENDS IN <span class="text-transparent bg-clip-text bg-gradient-to-r from-arcade-cyan via-arcade-yellow to-arcade-pink">8-BIT ARCADE</span>',
      hero_badge: 'Online 2-Player & Split-Keyboard Arena',
      hero_desc: 'Create a private room in 1 second, share the 4-char code with friends or open 2 browser tabs for seamless real-time multiplayer across PC and mobile.',
      btn_create_room: 'Create Room Now',
      btn_join_room: 'Join Room',
      btn_leaderboard: 'Leaderboard',
      input_room_code: 'Enter 4-char code...',
      room_code_placeholder: 'ENTER ROOM CODE',
      active_rooms_title: 'Open Rooms',
      online_players_count: '128 Players Online',
      no_active_rooms: 'No open rooms yet. Click "Create Room Now" above to start!',
      room_code_prefix: 'Code:',
      host_prefix: 'Host:',
      btn_join_quick: 'Join',
      
      // Filter Tabs
      tab_all: 'All Games (5)',
      tab_action: 'Action & Shooter',
      tab_racing: 'Racing & Sports',
      tab_board: '2-Player Board & Strategy',
      
      // Games
      game_tank: 'Battle City 2P',
      game_tank_desc: 'Tactical brick-shattering tank duel, bullet dodging and power-up collection.',
      game_starfighter: 'StarFighter Duo',
      game_starfighter_desc: 'Co-op retro space shooter: blast alien fleets or compete for highest score.',
      game_caro: 'Caro / Gomoku 15x15',
      game_caro_desc: 'Classic 5-in-a-row brain game with smooth responsive 15x15 board.',
      game_racer: 'Speed Racer 8-Bit',
      game_racer_desc: 'Dodge obstacles, grab Nitro speed boosters and cross finish line first.',
      game_pong: 'Cyber Pong 2P',
      game_pong_desc: 'Ultimate reaction rally with speeding neon ball and paddle mechanics.',
      players_2p_online: '2P Online / Shared PC',
      players_2p_vs: '2P Versus Battle',
      players_2p_speed: '2P Speed Race',
      players_2p_reflex: '2P Reflex Rally',
      players_2p_brain: '2P Strategy Duel',
      
      // Status & Actions
      status_waiting: 'Waiting for opponent...',
      status_playing: 'In Match',
      mode_pvp_local: '2 Players (Same Screen)',
      mode_pvp_online: 'Online Battle (P1 vs P2)',
      mode_bot: 'Solo Practice with AI BOT',
      btn_play_now: 'Play Now',
      btn_leave_room: 'Leave Room',
      btn_ready: 'READY',
      btn_rematch: 'REMATCH',
      
      // Game Room View
      room_code_label: 'Room Code:',
      room_sync_ready: 'Sync Ready',
      selected_game_label: 'Selected Game',
      p1_title: 'PLAYER 1 (P1)',
      p2_title: 'PLAYER 2 (P2)',
      p1_controls: 'Controls: W A S D + SPACE',
      p2_controls: 'Controls: Arrow Keys + ENTER',
      p1_ready: 'READY',
      p2_ready: 'READY TO FIGHT',
      btn_start_match: 'START MATCH NOW',
      tip_multitab: 'Quick online test tip: Open a new browser tab with this page and enter the room code to play as 2 separate players!',
      
      // Game HUD & In-game
      round: 'ROUND',
      winner: 'VICTORY!',
      draw: 'DRAW!',
      defeat: 'DEFEAT!',
      score: 'SCORE',
      health: 'HP',
      
      // Alerts & Notifications
      copied_code: 'Room code copied to clipboard!',
      error_invalid_code: 'Room code must be exactly 4 characters!',
      room_not_found: 'Room not found or expired!',
      player_joined: 'Opponent joined the room!',
      player_left: 'Opponent left the room!',
      quick_emotes: 'Quick Emotes'
    },

    zh: {
      // Header & Brand
      app_subtitle: '在线双人像素街机竞技场',
      server_status: '实时服务器:',
      server_online: '在线运行',
      btn_sound: '开/关 8-Bit 音效',
      btn_crt: 'CRT 荧光屏滤镜',
      btn_lang: '切换语言',

      // Hero & Lobby
      hero_title: '复古 8-BIT 在线双人对决街机',
      hero_title_html: '在复古像素世界中 <span class="text-transparent bg-clip-text bg-gradient-to-r from-arcade-cyan via-arcade-yellow to-arcade-pink">挑战你的好友</span>',
      hero_badge: '支持跨端网络联机与双人同屏对战',
      hero_desc: '1秒一键创建专属房间，将4位房间代码发送给好友，或新开浏览器标签页，跨越电脑与手机流畅即时对决！',
      btn_create_room: '立即创建房间',
      btn_join_room: '加入房间',
      btn_leaderboard: '排行榜',
      input_room_code: '输入4位房间号...',
      room_code_placeholder: '输入房间代码',
      active_rooms_title: '开放房间列表',
      online_players_count: '128 人在线',
      no_active_rooms: '当前暂无开放房间，点击上方“立即创建房间”开战吧！',
      room_code_prefix: '房间号:',
      host_prefix: '房主:',
      btn_join_quick: '加入',
      
      // Filter Tabs
      tab_all: '全部游戏 (5)',
      tab_action: '射击与动作',
      tab_racing: '赛车与竞技',
      tab_board: '双人棋盘策略',
      
      // Games
      game_tank: '坦克大战 2P',
      game_tank_desc: '策略破砖对轰，闪避子弹并夺取强化道具。',
      game_starfighter: '双人星际战机',
      game_starfighter_desc: '太空弹幕协同射击：消灭敌军战舰或同屏竞逐高分。',
      game_caro: '五子棋极速战',
      game_caro_desc: '15x15 棋盘策略连珠，五子连成一线即可大获全胜。',
      game_racer: '极速赛车 8-Bit',
      game_racer_desc: '极限躲避障碍，拾取氮气加速道具冲过终点线。',
      game_pong: '复古弹球 Pong',
      game_pong_desc: '经典极速反弹对决，球速随击球次数飙升。',
      players_2p_online: '双人在线 / 同屏对战',
      players_2p_vs: '双人对决',
      players_2p_speed: '双人竞速',
      players_2p_reflex: '反应对决',
      players_2p_brain: '策略博弈',
      
      // Status & Actions
      status_waiting: '等待对手加入...',
      status_playing: '比赛进行中',
      mode_pvp_local: '双人同屏对战',
      mode_pvp_online: '网络联机 (P1 vs P2)',
      mode_bot: '人机对战模式 (BOT AI)',
      btn_play_now: '立即开战',
      btn_leave_room: '离开房间',
      btn_ready: '准备就绪',
      btn_rematch: '再来一局',
      
      // Game Room View
      room_code_label: '房间号:',
      room_sync_ready: '联机同步就绪',
      selected_game_label: '当前选定游戏',
      p1_title: '玩家 1 (P1 - 房主)',
      p2_title: '玩家 2 (P2)',
      p1_controls: '操作按键: W A S D + 空格键',
      p2_controls: '操作按键: 方向键 + 回车键',
      p1_ready: '已准备就绪',
      p2_ready: '随时准备开战',
      btn_start_match: '立即开始对决',
      tip_multitab: '联机测试提示：在浏览器新建一个标签页打开本页面，输入房间号即可作为2名独立玩家对战！',
      
      // Game HUD & In-game
      round: '回合',
      winner: '大获全胜！',
      draw: '平局！',
      defeat: '惜败！',
      score: '得分',
      health: '生命值',
      
      // Alerts & Notifications
      copied_code: '房间代码已成功复制！',
      error_invalid_code: '房间代码必须为4位字符！',
      room_not_found: '房间不存在或已解散！',
      player_joined: '对手已进入房间！',
      player_left: '对手已退出房间！',
      quick_emotes: '快捷表情'
    }
  };

  class I18nEngine {
    constructor() {
      this.supportedLangs = SUPPORTED_LANGS;
      this.translations = TRANSLATIONS;
      this.listeners = [];
      
      let saved = null;
      try {
        if (typeof localStorage !== 'undefined') {
          saved = localStorage.getItem('arcade_lang');
        }
      } catch (_) {}
      this.currentLang = (saved && this.translations[saved]) ? saved : 'vi';
    }

    getLanguage() {
      return this.currentLang;
    }

    getCurrentMeta() {
      return this.supportedLangs.find(l => l.code === this.currentLang) || this.supportedLangs[0];
    }

    setLanguage(langCode) {
      if (!this.translations[langCode]) {
        console.warn(`[i18n] Language code "${langCode}" not supported.`);
        return false;
      }

      this.currentLang = langCode;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('arcade_lang', langCode);
        }
      } catch (_) {}

      if (typeof document !== 'undefined') {
        this.applyToDOM();
      }
      this.notify(langCode);
      return true;
    }

    t(key, fallback = '') {
      const dict = this.translations[this.currentLang] || this.translations['vi'];
      return dict[key] || this.translations['en'][key] || fallback || key;
    }

    onLanguageChange(fn) {
      if (typeof fn === 'function') {
        this.listeners.push(fn);
      }
    }

    notify(lang) {
      for (const fn of this.listeners) {
        try {
          fn(lang);
        } catch (err) {
          console.error('[i18n] Listener error:', err);
        }
      }
    }

    applyToDOM(root = document) {
      if (!root || !root.querySelectorAll) return;

      // 1. Text elements: data-i18n="key"
      const textEls = root.querySelectorAll('[data-i18n]');
      textEls.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
          el.textContent = this.t(key, el.textContent);
        }
      });

      // 1b. Rich HTML elements: data-i18n-html="key"
      const htmlEls = root.querySelectorAll('[data-i18n-html]');
      htmlEls.forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
          el.innerHTML = this.t(key, el.innerHTML);
        }
      });

      // 2. Attributes: data-i18n-attr="placeholder:key,title:key"
      const attrEls = root.querySelectorAll('[data-i18n-attr]');
      attrEls.forEach(el => {
        const spec = el.getAttribute('data-i18n-attr');
        if (!spec) return;
        const pairs = spec.split(',');
        pairs.forEach(pair => {
          const [attr, key] = pair.split(':').map(s => s.trim());
          if (attr && key) {
            el.setAttribute(attr, this.t(key));
          }
        });
      });

      // 3. Cập nhật nhãn nút đổi ngôn ngữ trên Header (nếu có)
      const btnLangLabel = root.querySelector('#btn-lang-current');
      if (btnLangLabel) {
        const meta = this.getCurrentMeta();
        btnLangLabel.innerHTML = `${meta.flag} <span class="hidden sm:inline font-mono font-bold">${meta.short}</span>`;
      }

      // 4. Cập nhật active indicator trong dropdown
      const menuItems = root.querySelectorAll('.lang-select-item');
      menuItems.forEach(item => {
        const code = item.getAttribute('data-lang');
        const check = item.querySelector('.lang-check-icon');
        if (check) {
          if (code === this.currentLang) {
            check.classList.remove('hidden');
            item.classList.add('bg-arcade-cyan/10', 'text-arcade-cyan', 'font-bold');
          } else {
            check.classList.add('hidden');
            item.classList.remove('bg-arcade-cyan/10', 'text-arcade-cyan', 'font-bold');
          }
        }
      });
    }
  }

  const i18n = new I18nEngine();

  return { i18n, I18nEngine, SUPPORTED_LANGS, TRANSLATIONS };
});
