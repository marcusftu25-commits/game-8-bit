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
      hero_badge: 'MÁY CHỦ REAL-TIME CHỐNG LAG',
      hero_desc: 'Trải nghiệm đối kháng arcade thời gian thực mượt mà giữa PC và Mobile. Không cần tải app, chơi ngay tức thì!',
      btn_create_room: 'TẠO PHÒNG MỚI',
      btn_join_room: 'VÀO PHÒNG',
      btn_leaderboard: 'BẢNG XẾP HẠNG',
      input_room_code: 'Nhập mã 4 ký tự...',
      room_code_placeholder: 'MÃ PHÒNG (VD: ABCD)',
      active_rooms_title: 'PHÒNG ĐANG MỞ',
      no_active_rooms: 'Chưa có phòng nào đang mở. Hãy tạo phòng mới ngay!',
      
      // Games
      game_tank: 'Chiến Xa 2P',
      game_tank_desc: 'Bắn xe tăng cổ điển 1v1 phá gạch',
      game_starfighter: 'Phi Thuyền Vũ Trụ',
      game_starfighter_desc: 'Bắn súng không gian đối kháng',
      game_caro: 'Cờ Caro 15x15',
      game_caro_desc: 'Đấu trí 5 quân chặn 2 đầu',
      game_racer: 'Đua Xe Tốc Độ',
      game_racer_desc: 'Tránh chướng ngại vật & tăng tốc',
      game_pong: 'Bóng Bàn Retro',
      game_pong_desc: 'Đỡ bóng tính điểm kinh điển',
      
      // Status & Actions
      status_waiting: 'Đang chờ đối thủ...',
      status_playing: 'Đang thi đấu',
      mode_pvp_local: '2 Người (Chung máy)',
      mode_pvp_online: 'Đấu Online (P1 vs P2)',
      mode_bot: 'Luyện tập với BOT AI',
      btn_play_now: 'CHƠI NGAY',
      btn_leave_room: 'RỜI PHÒNG',
      btn_ready: 'SẴN SÀNG',
      btn_rematch: 'ĐẤU LẠI',
      
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
      hero_badge: 'LOW-LATENCY REALTIME ENGINE',
      hero_desc: 'Smooth real-time arcade battles across PC and Mobile. Zero install, play instantly in browser!',
      btn_create_room: 'CREATE ROOM',
      btn_join_room: 'JOIN ROOM',
      btn_leaderboard: 'LEADERBOARD',
      input_room_code: 'Enter 4-char code...',
      room_code_placeholder: 'ROOM CODE (E.G. ABCD)',
      active_rooms_title: 'OPEN ROOMS',
      no_active_rooms: 'No open rooms yet. Create a new room now!',
      
      // Games
      game_tank: 'Tank Battle 2P',
      game_tank_desc: 'Classic 1v1 brick-shattering tank duel',
      game_starfighter: 'StarFighter Duo',
      game_starfighter_desc: 'Retro sci-fi space shooter',
      game_caro: 'Caro / Gomoku 15x15',
      game_caro_desc: 'Tactical 5-in-a-row brain game',
      game_racer: 'Speed Racer 8-Bit',
      game_racer_desc: 'Dodge obstacles & race to glory',
      game_pong: 'Classic Retro Pong',
      game_pong_desc: 'Timeless paddle ball rally',
      
      // Status & Actions
      status_waiting: 'Waiting for opponent...',
      status_playing: 'In Match',
      mode_pvp_local: '2 Players (Same Screen)',
      mode_pvp_online: 'Online Battle (P1 vs P2)',
      mode_bot: 'Solo Practice with AI BOT',
      btn_play_now: 'PLAY NOW',
      btn_leave_room: 'LEAVE ROOM',
      btn_ready: 'READY',
      btn_rematch: 'REMATCH',
      
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
      hero_badge: '低延迟超强同步引擎',
      hero_desc: '支持手机与电脑跨端即时对战，无需下载任何应用，点击即可秒开开战！',
      btn_create_room: '创建房间',
      btn_join_room: '加入房间',
      btn_leaderboard: '排行榜',
      input_room_code: '输入4位房间号...',
      room_code_placeholder: '房间代码 (如: ABCD)',
      active_rooms_title: '开放房间列表',
      no_active_rooms: '当前暂无开放房间，快去创建一个吧！',
      
      // Games
      game_tank: '经典坦克 2P',
      game_tank_desc: '经典 1v1 破砖对轰坦克战',
      game_starfighter: '星际战机对决',
      game_starfighter_desc: '复古太空科幻弹幕射击',
      game_caro: '五子棋 15x15',
      game_caro_desc: '策略博弈，五子连珠决胜',
      game_racer: '极速赛车 8-Bit',
      game_racer_desc: '极限躲避障碍，急速冲刺',
      game_pong: '复古弹球 Pong',
      game_pong_desc: '经典双人弹球反弹对战',
      
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
