/**
 * 8-BIT ARCADE DUO - ROOM MANAGER (Server-Side RAM Engine)
 * Quản lý trạng thái phòng chơi trên RAM (In-Memory Map)
 * - Sinh mã phòng 4 ký tự không trùng lặp và loại trừ từ nhạy cảm
 * - Quản lý Host (P1) và Khách (P2)
 * - Tự động dọn dẹp các phòng quá hạn (TTL Cleanup)
 */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Loại bỏ 0, O, 1, I để tránh nhầm lẫn

const BAD_WORDS = new Set([
  'DAMN', 'FUCK', 'SHIT', 'CRAP', 'DICK', 'PISS', 'COCK', 'BAST', 'CLIT', 'HELL',
  'CHET', 'DIEM', 'DUMA', 'CCCD', 'NGUU', 'LOZL'
]);

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Sinh mã phòng 4 ký tự độc nhất
   */
  generateRoomCode() {
    let attempts = 0;
    while (attempts < 100) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(Math.random() * CHARSET.length);
        code += CHARSET.charAt(idx);
      }

      if (!this.rooms.has(code) && !BAD_WORDS.has(code)) {
        return code;
      }
      attempts++;
    }

    // Fallback: nếu collision quá cao, dùng timestamp rút gọn 5 ký tự
    return 'R' + Date.now().toString(36).substring(3, 6).toUpperCase();
  }

  /**
   * Tạo phòng mới (P1 là chủ phòng / Host)
   */
  createRoom({ gameId = 'starfighter', mode = 'local_or_tab', host }) {
    if (!host || !host.id || !host.name) {
      throw new Error('Thông tin người tạo phòng (host) không hợp lệ');
    }

    const code = this.generateRoomCode();
    const now = Date.now();

    const room = {
      code,
      gameId: gameId || 'starfighter',
      mode: mode || 'local_or_tab',
      createdAt: now,
      lastActiveAt: now,
      p1: {
        id: host.id,
        name: host.name,
        avatar: host.avatar || '👾',
        ready: true,
        socketId: host.socketId || null
      },
      p2: null,
      status: 'LOBBY' // 'LOBBY' | 'PLAYING' | 'FINISHED'
    };

    this.rooms.set(code, room);
    return room;
  }

  /**
   * Khách (P2) tham gia phòng bằng mã 4 ký tự
   */
  joinRoom(code, guest) {
    if (!code) {
      return { success: false, status: 400, message: 'Vui lòng cung cấp mã phòng!' };
    }

    const normalizedCode = String(code).trim().toUpperCase();
    if (!this.rooms.has(normalizedCode)) {
      return { success: false, status: 404, message: `Phòng ${normalizedCode} không tồn tại hoặc đã đóng!` };
    }

    const room = this.rooms.get(normalizedCode);

    if (room.status !== 'LOBBY') {
      return { success: false, status: 400, message: 'Trận đấu đang diễn ra hoặc đã kết thúc!' };
    }

    if (!guest || !guest.id || !guest.name) {
      return { success: false, status: 400, message: 'Thông tin người chơi không hợp lệ!' };
    }

    // Nếu người tham gia chính là Host kết nối lại
    if (room.p1.id === guest.id) {
      room.p1.name = guest.name;
      room.p1.avatar = guest.avatar || room.p1.avatar;
      room.lastActiveAt = Date.now();
      return { success: true, status: 200, room, role: 'P1' };
    }

    // Nếu phòng đã có P2 và không phải chính khách này reconnect
    if (room.p2 !== null && room.p2.id !== guest.id) {
      return { success: false, status: 409, message: 'Phòng đã đủ 2 người chơi!' };
    }

    // Gán slot P2
    room.p2 = {
      id: guest.id,
      name: guest.name,
      avatar: guest.avatar || '🤖',
      ready: true,
      socketId: guest.socketId || null
    };
    room.lastActiveAt = Date.now();

    return { success: true, status: 200, room, role: 'P2' };
  }

  /**
   * Lấy danh sách các phòng công khai đang trống 1 chỗ (p2 === null)
   */
  getPublicRooms(limit = 10) {
    const publicRooms = [];

    for (const room of this.rooms.values()) {
      if (room.status === 'LOBBY' && room.p2 === null) {
        publicRooms.push({
          code: room.code,
          gameId: room.gameId,
          mode: room.mode,
          hostName: room.p1.name,
          hostAvatar: room.p1.avatar,
          createdAt: room.createdAt
        });
      }
    }

    // Sắp xếp phòng mới nhất lên đầu
    publicRooms.sort((a, b) => b.createdAt - a.createdAt);
    return publicRooms.slice(0, limit);
  }

  /**
   * Lấy chi tiết phòng theo mã
   */
  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(String(code).trim().toUpperCase()) || null;
  }

  /**
   * Chủ phòng đổi trò chơi hoặc chế độ chơi
   */
  updateRoomGame(code, { gameId, mode, requesterId }) {
    const room = this.getRoom(code);
    if (!room) return { success: false, status: 404, message: 'Phòng không tồn tại!' };

    if (requesterId && room.p1.id !== requesterId) {
      return { success: false, status: 403, message: 'Chỉ chủ phòng mới có quyền đổi trò chơi!' };
    }

    if (gameId) room.gameId = gameId;
    if (mode) room.mode = mode;
    room.lastActiveAt = Date.now();

    return { success: true, status: 200, room };
  }

  /**
   * Người chơi rời phòng
   */
  leaveRoom(code, playerId) {
    const room = this.getRoom(code);
    if (!room) return { success: false, status: 404, message: 'Phòng không tồn tại!' };

    // Nếu P1 (Chủ phòng) rời đi ➔ Hủy phòng luôn
    if (room.p1.id === playerId) {
      this.rooms.delete(room.code);
      return { success: true, status: 200, action: 'DESTROYED', message: 'Chủ phòng đã rời, phòng bị hủy.' };
    }

    // Nếu P2 rời đi ➔ Trống lại slot P2
    if (room.p2 && room.p2.id === playerId) {
      room.p2 = null;
      room.lastActiveAt = Date.now();
      return { success: true, status: 200, action: 'P2_LEFT', room };
    }

    return { success: false, status: 400, message: 'Người chơi không có trong phòng này.' };
  }

  /**
   * Dọn dẹp phòng không hoạt động (TTL = 1 tiếng)
   */
  cleanupExpiredRooms(maxAgeMs = 3600000) {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActiveAt > maxAgeMs) {
        this.rooms.delete(code);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Đếm tổng số phòng hiện tại
   */
  count() {
    return this.rooms.size;
  }

  /**
   * Xóa sạch toàn bộ (dùng cho unit test reset)
   */
  clear() {
    this.rooms.clear();
  }
}

// Singleton instance
const roomManager = new RoomManager();

module.exports = {
  RoomManager,
  roomManager
};
