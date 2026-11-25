/**
 * 8-BIT ARCADE DUO - LOBBY MANAGER (Client-Side)
 * Quản lý giao tiếp API Sảnh chờ, tạo/vào phòng và danh sách phòng mở
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LobbyManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const API_BASE = (typeof window !== 'undefined' && window.location.origin.includes('http'))
    ? window.location.origin
    : 'http://localhost:3000';

  /**
   * Helper gọi REST API với timeout & xử lý JSON an toàn
   */
  async function apiFetch(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeoutId);
      return { ok: false, status: 0, error: err.message, isOffline: true };
    }
  }

  /**
   * Tạo phòng chơi mới trên Server
   */
  async function createRoom(gameId = 'starfighter', mode = 'local_or_tab') {
    const profile = window.GuestAuth ? window.GuestAuth.getProfile() : { id: 'u_p1', name: 'Player_VN', avatar: '👾' };
    
    // Gọi Backend API
    const res = await apiFetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ gameId, mode, host: profile })
    });

    let roomData = null;
    if (res.ok && res.data && res.data.room) {
      roomData = res.data.room;
    } else {
      // Fallback Offline: tự sinh mã nếu chưa bật backend
      const fallbackCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      console.warn('[Lobby] Server offline, sử dụng mã fallback cục bộ:', fallbackCode);
      roomData = {
        code: fallbackCode,
        gameId,
        mode,
        p1: profile,
        p2: null,
        status: 'LOBBY'
      };
    }

    return roomData;
  }

  /**
   * Tham gia phòng bằng mã 4 ký tự
   */
  async function joinRoom(roomCode) {
    if (!roomCode || roomCode.trim().length !== 4) {
      return { success: false, message: 'Vui lòng nhập đúng 4 ký tự mã phòng!' };
    }

    const code = roomCode.trim().toUpperCase();
    const profile = window.GuestAuth ? window.GuestAuth.getProfile() : { id: 'u_p2', name: 'Người Chơi 2', avatar: '🤖' };

    const res = await apiFetch('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode: code, guest: profile })
    });

    if (res.ok && res.data && res.data.success) {
      return { success: true, room: res.data.room, role: res.data.role || 'P2' };
    }

    // Nếu lỗi do server trả về
    if (res.status === 404) {
      return { success: false, message: `Mã phòng ${code} không tồn tại hoặc đã bị hủy!` };
    }
    if (res.status === 409) {
      return { success: false, message: `Phòng ${code} đã đủ 2 người chơi!` };
    }

    // Nếu server offline hoàn toàn ➔ cho phép quick join mô phỏng
    if (res.isOffline) {
      console.warn('[Lobby] Server offline, tham gia giả lập với mã:', code);
      return {
        success: true,
        room: {
          code,
          gameId: 'starfighter',
          mode: 'local_or_tab',
          p1: { id: 'u_host', name: 'Chủ Phòng', avatar: '👾' },
          p2: profile,
          status: 'LOBBY'
        },
        role: 'P2'
      };
    }

    return { success: false, message: res.data?.message || 'Không thể tham gia phòng!' };
  }

  /**
   * Lấy danh sách các phòng công khai đang trống 1 slot P2
   */
  async function getPublicRooms(limit = 6) {
    const res = await apiFetch(`/api/rooms/public?limit=${limit}`);
    if (res.ok && res.data && Array.isArray(res.data.rooms)) {
      return res.data.rooms;
    }
    return [];
  }

  /**
   * Render danh sách phòng công khai ra thẻ HTML #public-rooms-list
   */
  async function renderPublicRoomsList() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('public-rooms-list');
    if (!container) return;

    const rooms = await getPublicRooms(5);

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="text-xs text-slate-400 py-3 text-center italic">
          Chưa có phòng nào chờ. Hãy bấm "Tạo Phòng Chơi Ngay" ở trên!
        </div>
      `;
      return;
    }

    container.innerHTML = rooms.map(r => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-arcade-surface border border-arcade-border/80 hover:border-arcade-cyan transition">
        <div>
          <div class="text-xs font-bold text-white flex items-center gap-1.5">
            <span>${r.hostAvatar || '👾'}</span>
            <span>Mã: <strong class="font-mono text-arcade-cyan">${r.code}</strong></span>
          </div>
          <div class="text-[11px] text-slate-400">
            Chủ phòng: <span class="text-arcade-yellow">${r.hostName}</span>
          </div>
        </div>
        <button onclick="window.quickJoinRoom('${r.code}', '${r.gameId}')"
          class="px-3 py-1.5 rounded bg-arcade-cyan/20 text-arcade-cyan hover:bg-arcade-cyan hover:text-arcade-bg text-xs font-bold transition">
          Tham gia
        </button>
      </div>
    `).join('');
  }

  return {
    createRoom,
    joinRoom,
    getPublicRooms,
    renderPublicRoomsList
  };
});
