/**
 * 8-BIT ARCADE DUO - REAL-TIME SOCKET.IO HUB (Phase 3 & Phase 4)
 * - Host-Authoritative State Sync (30-45 Hz) cho game hanh dong (StarFighter, Tank, Pong, Racer)
 * - Server-Authoritative Anti-Cheat cho game theo luot (Co Caro 15x15)
 * - Xử lý ngắt kết nối (Grace Period 15s) & Reconnect theo playerId
 * - Quick Emotes (whitelist + rate-limit) & Synchronized Screen Shake
 * - Đo độ trễ thực tế (ping_check)
 */

const { Server } = require('socket.io');
const GameEngine = require('../src/gameEngine');

const ALLOWED_EMOTES = new Set(['🔥', '😂', 'GG!', '😱', '👑']);
const EMOTE_COOLDOWN_MS = 350;

function createEmptyCaroState() {
  return {
    board: Array.from({ length: 15 }, () => Array(15).fill(0)),
    turn: 'P1',
    moveCount: 0,
    finished: false,
    winnerRole: null,
    winLine: null
  };
}

function attachSocketHub(httpServer, options = {}) {
  const { roomManager, getMatchService } = options;

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // socket.id -> { roomCode, playerId, role }
  const socketMeta = new Map();
  // `${roomCode}:${playerId}` -> { timer, role, startedAt }
  const disconnectTimers = new Map();
  // socket.id -> lastEmoteTs
  const emoteRateLimit = new Map();

  function getGraceMs() {
    const fromEnv = parseInt(process.env.DISCONNECT_GRACE_MS, 10);
    if (!Number.isNaN(fromEnv) && fromEnv > 0) return fromEnv;
    return options.gracePeriodMs || 15000;
  }

  function clearDisconnectTimer(roomCode, playerId) {
    const key = `${roomCode}:${playerId}`;
    const entry = disconnectTimers.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      disconnectTimers.delete(key);
      return true;
    }
    return false;
  }

  function clearAllTimersForRoom(roomCode) {
    for (const [key, entry] of disconnectTimers.entries()) {
      if (key.startsWith(`${roomCode}:`)) {
        clearTimeout(entry.timer);
        disconnectTimers.delete(key);
      }
    }
  }

  function recordMatchResult(room, { p1Score = 0, p2Score = 0, winnerRole = null }) {
    const matchService = typeof getMatchService === 'function' ? getMatchService() : options.matchService;
    if (!matchService || !room) return null;

    const p1 = room.p1;
    const p2 = room.p2 || { id: 'bot_ai', name: 'Bot AI Siêu Cấp', avatar: '🤖' };
    let winnerId = null;
    if (winnerRole === 'P1') winnerId = p1.id;
    else if (winnerRole === 'P2') winnerId = p2.id;

    const durationSec = room.matchStartedAt
      ? Math.max(1, Math.round((Date.now() - room.matchStartedAt) / 1000))
      : 0;

    try {
      return matchService.finishMatch({
        matchId: room.matchId,
        roomCode: room.code,
        gameId: room.gameId,
        p1: { id: p1.id, name: p1.name, avatar: p1.avatar },
        p2: { id: p2.id, name: p2.name, avatar: p2.avatar },
        p1Score,
        p2Score,
        winnerId,
        durationSec
      });
    } catch (err) {
      console.error('[SocketHub] Error recording match result:', err.message);
      return null;
    }
  }

  io.on('connection', (socket) => {
    // Real latency ping check
    socket.on('ping_check', (clientTs, ack) => {
      if (typeof ack === 'function') {
        ack({ serverTs: Date.now(), clientTs });
      }
    });

    // Join or bind socket to an existing room
    socket.on('join_room', (payload = {}, ack) => {
      const code = String(payload.roomCode || '').trim().toUpperCase();
      const player = payload.player;
      if (!code || !player || !player.id || !player.name) {
        const err = { success: false, code: 'INVALID_PAYLOAD', message: 'Thiếu mã phòng hoặc thông tin người chơi.' };
        socket.emit('room_error', err);
        if (typeof ack === 'function') ack(err);
        return;
      }

      const room = roomManager.getRoom(code);
      if (!room) {
        const err = { success: false, code: 'ROOM_NOT_FOUND', message: `Phòng ${code} không tồn tại!` };
        socket.emit('room_error', err);
        if (typeof ack === 'function') ack(err);
        return;
      }

      let role = null;
      if (room.p1.id === player.id) {
        role = 'P1';
        room.p1.socketId = socket.id;
        room.p1.name = player.name;
        room.p1.avatar = player.avatar || room.p1.avatar;
        room.p1.connected = true;
      } else if (room.p2 && room.p2.id === player.id) {
        role = 'P2';
        room.p2.socketId = socket.id;
        room.p2.name = player.name;
        room.p2.avatar = player.avatar || room.p2.avatar;
        room.p2.connected = true;
      } else {
        const joinRes = roomManager.joinRoom(code, { ...player, socketId: socket.id });
        if (!joinRes.success) {
          socket.emit('room_error', joinRes);
          if (typeof ack === 'function') ack(joinRes);
          return;
        }
        role = joinRes.role;
        if (role === 'P2' && room.p2) {
          room.p2.socketId = socket.id;
          room.p2.connected = true;
        }
      }

      room.lastActiveAt = Date.now();
      clearDisconnectTimer(code, player.id);

      socket.join(code);
      socketMeta.set(socket.id, { roomCode: code, playerId: player.id, role });

      const response = { success: true, room, role };
      socket.emit('room_joined', response);
      if (typeof ack === 'function') ack(response);

      // Thong bao cho nguoi choi con lai trong phong
      socket.to(code).emit('player_joined', {
        role,
        player: role === 'P1' ? room.p1 : room.p2,
        room
      });
      io.to(code).emit('room_state', { room });
    });

    // Reconnect within 15s grace period
    socket.on('reconnect_room', (payload = {}, ack) => {
      const code = String(payload.roomCode || '').trim().toUpperCase();
      const playerId = payload.playerId;

      const room = roomManager.getRoom(code);
      if (!room) {
        const err = { success: false, code: 'ROOM_NOT_FOUND', message: 'Phòng không còn tồn tại hoặc đã hết thời gian chờ.' };
        socket.emit('reconnect_failed', err);
        if (typeof ack === 'function') ack(err);
        return;
      }

      let role = null;
      if (room.p1 && room.p1.id === playerId) {
        role = 'P1';
        room.p1.socketId = socket.id;
        room.p1.connected = true;
      } else if (room.p2 && room.p2.id === playerId) {
        role = 'P2';
        room.p2.socketId = socket.id;
        room.p2.connected = true;
      } else {
        const err = { success: false, code: 'PLAYER_NOT_IN_ROOM', message: 'Bạn không thuộc phòng đấu này.' };
        socket.emit('reconnect_failed', err);
        if (typeof ack === 'function') ack(err);
        return;
      }

      clearDisconnectTimer(code, playerId);
      room.pausedByDisconnect = false;
      room.lastActiveAt = Date.now();

      socket.join(code);
      socketMeta.set(socket.id, { roomCode: code, playerId, role });

      const result = {
        success: true,
        role,
        room,
        caroState: room.caroState || null,
        lastSnapshot: room.lastSnapshot || null
      };
      socket.emit('reconnect_success', result);
      if (typeof ack === 'function') ack(result);

      socket.to(code).emit('player_reconnected', { role, playerId, room });
    });

    // Leave room explicitly
    socket.on('leave_room', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const { roomCode, playerId, role } = meta;
      clearDisconnectTimer(roomCode, playerId);
      socketMeta.delete(socket.id);
      socket.leave(roomCode);

      const res = roomManager.leaveRoom(roomCode, playerId);
      if (res.action === 'DESTROYED') {
        clearAllTimersForRoom(roomCode);
      }
      socket.to(roomCode).emit('player_left', { role, playerId, action: res.action, room: res.room || null });
    });

    // Host changes game
    socket.on('change_game', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'P1') return;
      const res = roomManager.updateRoomGame(meta.roomCode, {
        gameId: payload.gameId,
        requesterId: meta.playerId
      });
      if (res.success) {
        io.to(meta.roomCode).emit('game_changed', { gameId: res.room.gameId, room: res.room });
      }
    });

    // Host changes play mode
    socket.on('change_mode', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'P1') return;
      const res = roomManager.updateRoomGame(meta.roomCode, {
        mode: payload.mode,
        requesterId: meta.playerId
      });
      if (res.success) {
        io.to(meta.roomCode).emit('mode_changed', { mode: res.room.mode, room: res.room });
      }
    });

    // Start match
    socket.on('start_match', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = roomManager.getRoom(meta.roomCode);
      if (!room) return;

      room.status = 'PLAYING';
      room.pausedByDisconnect = false;
      room.matchStartedAt = Date.now();
      room.matchId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      room.lastSnapshot = null;
      room.lastActiveAt = Date.now();

      if (room.gameId === 'caro') {
        room.caroState = createEmptyCaroState();
      } else {
        room.caroState = null;
      }

      io.to(meta.roomCode).emit('match_started', {
        roomCode: room.code,
        gameId: room.gameId,
        mode: room.mode,
        matchId: room.matchId,
        caroState: room.caroState
      });
    });

    // Action game: Guest (P2) input -> Relay to Host (P1)
    socket.on('input_event', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = roomManager.getRoom(meta.roomCode);
      if (!room || !room.p1 || !room.p1.socketId) return;

      room.lastActiveAt = Date.now();
      const targetPayload = {
        role: meta.role,
        key: payload.key,
        mappedKey: payload.mappedKey,
        isDown: !!payload.isDown,
        seq: payload.seq || 0,
        timestamp: payload.timestamp || Date.now()
      };
      io.to(room.p1.socketId).emit('client_input', targetPayload);
    });

    // Action game: Host (P1) authoritative state snapshot -> Relay to Guest (P2)
    socket.on('host_state_sync', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'P1') return;
      const room = roomManager.getRoom(meta.roomCode);
      if (!room) return;

      const snapshot = payload.state || payload;
      room.lastSnapshot = snapshot;
      room.lastActiveAt = Date.now();
      socket.to(meta.roomCode).emit('game_state', snapshot);
    });

    // Turn-based game (Caro): Server-Authoritative Anti-Cheat Move Validation
    socket.on('caro_move', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = roomManager.getRoom(meta.roomCode);
      if (!room || room.gameId !== 'caro' || room.status !== 'PLAYING' || !room.caroState) {
        socket.emit('caro_move_rejected', { reason: 'MATCH_NOT_ACTIVE' });
        return;
      }

      const st = room.caroState;
      if (st.finished) {
        socket.emit('caro_move_rejected', { reason: 'MATCH_FINISHED' });
        return;
      }

      // 1. Kiem tra dung luot nguoi choi (turn === role)
      if (st.turn !== meta.role) {
        socket.emit('caro_move_rejected', { reason: 'NOT_YOUR_TURN', expectedTurn: st.turn });
        return;
      }

      const r = Number(payload.r);
      const c = Number(payload.c);
      if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= 15 || c < 0 || c >= 15) {
        socket.emit('caro_move_rejected', { reason: 'OUT_OF_BOUNDS' });
        return;
      }

      // 2. Kiem tra o co da co ai danh chua
      if (st.board[r][c] !== 0) {
        socket.emit('caro_move_rejected', { reason: 'CELL_OCCUPIED' });
        return;
      }

      // Hop le -> cap nhat ban co tren server
      const playerNum = meta.role === 'P1' ? 1 : 2;
      st.board[r][c] = playerNum;
      st.moveCount++;
      room.lastActiveAt = Date.now();

      const winLine = GameEngine.getCaroWinLine(st.board, r, c, playerNum);
      const isWin = winLine !== null;
      const isDraw = !isWin && st.moveCount >= 225;

      let nextTurn = null;
      let rewards = null;
      if (isWin) {
        st.finished = true;
        st.winnerRole = meta.role;
        st.winLine = winLine;
        room.status = 'FINISHED';
        rewards = recordMatchResult(room, {
          p1Score: meta.role === 'P1' ? 500 : 0,
          p2Score: meta.role === 'P2' ? 500 : 0,
          winnerRole: meta.role
        });
      } else if (isDraw) {
        st.finished = true;
        st.winnerRole = null;
        room.status = 'FINISHED';
        rewards = recordMatchResult(room, { p1Score: 250, p2Score: 250, winnerRole: null });
      } else {
        st.turn = meta.role === 'P1' ? 'P2' : 'P1';
        nextTurn = st.turn;
      }

      io.to(meta.roomCode).emit('caro_move_accepted', {
        r,
        c,
        player: playerNum,
        role: meta.role,
        nextTurn,
        win: isWin,
        winLine,
        isDraw,
        winnerRole: st.winnerRole,
        rewards
      });
    });

    // Action match end notification from Host
    socket.on('match_ended', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'P1') return;
      const room = roomManager.getRoom(meta.roomCode);
      if (!room || room.status === 'FINISHED') return;

      room.status = 'FINISHED';
      const p1Score = Number(payload.p1Score) || 0;
      const p2Score = Number(payload.p2Score) || 0;
      let winnerRole = payload.winnerRole || null;
      if (!winnerRole) {
        if (p1Score > p2Score) winnerRole = 'P1';
        else if (p2Score > p1Score) winnerRole = 'P2';
      }

      const rewards = recordMatchResult(room, { p1Score, p2Score, winnerRole });
      io.to(meta.roomCode).emit('match_finished', {
        roomCode: room.code,
        matchId: room.matchId,
        p1Score,
        p2Score,
        winnerRole,
        title: payload.title || null,
        rewards
      });
    });

    // Phase 4: Quick Emotes over Socket (whitelist + anti-spam rate limit)
    socket.on('send_emote', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      const roomCode = (meta && meta.roomCode) || String(payload.roomCode || '').trim().toUpperCase();
      if (!roomCode) return;

      const emote = String(payload.emote || '').trim();
      if (!ALLOWED_EMOTES.has(emote)) {
        socket.emit('emote_rejected', { reason: 'INVALID_EMOTE' });
        return;
      }

      const now = Date.now();
      const lastTs = emoteRateLimit.get(socket.id) || 0;
      if (now - lastTs < EMOTE_COOLDOWN_MS) {
        socket.emit('emote_rejected', { reason: 'RATE_LIMITED' });
        return;
      }
      emoteRateLimit.set(socket.id, now);

      io.to(roomCode).emit('receive_emote', {
        roomCode,
        emote,
        role: (meta && meta.role) || payload.role || 'P1',
        senderId: (meta && meta.playerId) || payload.senderId || socket.id,
        timestamp: now
      });
    });

    // Phase 4: Synchronized Screen Shake
    socket.on('screen_shake', (payload = {}) => {
      const meta = socketMeta.get(socket.id);
      const roomCode = (meta && meta.roomCode) || String(payload.roomCode || '').trim().toUpperCase();
      if (!roomCode) return;

      io.to(roomCode).emit('screen_shake', {
        roomCode,
        intensity: payload.intensity || 1,
        reason: payload.reason || 'impact',
        senderId: (meta && meta.playerId) || socket.id
      });
    });

    // Disconnect handling with 15s Grace Period
    socket.on('disconnect', () => {
      emoteRateLimit.delete(socket.id);
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      socketMeta.delete(socket.id);

      const { roomCode, playerId, role } = meta;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      // Mark player offline
      if (role === 'P1' && room.p1 && room.p1.id === playerId) {
        room.p1.connected = false;
      } else if (role === 'P2' && room.p2 && room.p2.id === playerId) {
        room.p2.connected = false;
      }

      // Chi kich hoat grace period 15s khi phong co doi thu hoac dang choi
      const hasOpponent = (role === 'P1' && room.p2) || (role === 'P2' && room.p1);
      if (!hasOpponent && room.status === 'LOBBY') {
        roomManager.leaveRoom(roomCode, playerId);
        return;
      }

      const graceMs = getGraceMs();
      room.pausedByDisconnect = true;

      io.to(roomCode).emit('player_disconnected', {
        roomCode,
        role,
        playerId,
        gracePeriod: Math.max(1, Math.ceil(graceMs / 1000)),
        graceMs
      });

      const timerKey = `${roomCode}:${playerId}`;
      clearDisconnectTimer(roomCode, playerId);

      const timer = setTimeout(() => {
        disconnectTimers.delete(timerKey);
        const currentRoom = roomManager.getRoom(roomCode);
        if (!currentRoom) return;

        const winnerRole = role === 'P1' ? 'P2' : 'P1';
        let rewards = null;
        if (currentRoom.status === 'PLAYING') {
          currentRoom.status = 'FINISHED';
          rewards = recordMatchResult(currentRoom, {
            p1Score: winnerRole === 'P1' ? 100 : 0,
            p2Score: winnerRole === 'P2' ? 100 : 0,
            winnerRole
          });
        }

        io.to(roomCode).emit('match_forfeited', {
          roomCode,
          winnerRole,
          loserRole: role,
          reason: 'DISCONNECT_TIMEOUT',
          rewards
        });

        clearAllTimersForRoom(roomCode);
        roomManager.rooms.delete(roomCode);
      }, graceMs);

      if (timer.unref) timer.unref();
      disconnectTimers.set(timerKey, { timer, role, startedAt: Date.now() });
    });
  });

  function close() {
    for (const entry of disconnectTimers.values()) {
      clearTimeout(entry.timer);
    }
    disconnectTimers.clear();
    socketMeta.clear();
    emoteRateLimit.clear();
    return new Promise((resolve) => io.close(resolve));
  }

  return {
    io,
    ALLOWED_EMOTES,
    close
  };
}

module.exports = {
  attachSocketHub,
  ALLOWED_EMOTES
};
