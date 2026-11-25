/**
 * 8-BIT ARCADE DUO - CLIENT NETWORK SYNC LAYER (Phase 3 & Phase 4)
 * - Ket noi Socket.io v4 da thiet bi (PC vs Mobile / WiFi / Internet)
 * - Host-Authoritative State Sync + Client Input Relay
 * - Server-Authoritative Caro Moves
 * - Auto-Reconnect trong Grace Period 15s (luu phien sessionStorage)
 * - Quick Emotes & Synchronized Screen Shake + Real Ping
 * - Fallback BroadcastChannel khi mo file:// offline
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NetworkSync = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SESSION_KEY = 'arcade_active_session';

  let socket = null;
  let broadcastChannel = null;
  let activeRoomCode = null;
  let activePlayer = null;
  let activeRole = 'P1';
  let handlers = {};
  let isSocketReady = false;
  let pingInterval = null;
  let lastEmoteTs = 0;

  function canUseSocketIO() {
    return (
      typeof window !== 'undefined' &&
      typeof window.io === 'function' &&
      window.location &&
      window.location.protocol &&
      window.location.protocol.startsWith('http')
    );
  }

  function saveSession(roomCode, playerId, role, gameId) {
    try {
      if (typeof sessionStorage !== 'undefined' && roomCode && playerId) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId, role, gameId, ts: Date.now() }));
      }
    } catch (e) {}
  }

  function clearSession() {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function getSavedSession() {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Session hop le trong vong 20s
      if (data && data.roomCode && data.playerId && Date.now() - data.ts < 20000) {
        return data;
      }
    } catch (e) {}
    return null;
  }

  function ensureSocket() {
    if (!canUseSocketIO()) return null;
    if (socket) return socket;

    socket = window.io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 600
    });

    socket.on('connect', () => {
      isSocketReady = true;
      if (handlers.onConnectionChange) handlers.onConnectionChange(true);
      startPingLoop();

      // Neu dang trong phong va vua reconnect mang -> tu dong reconnect_room
      if (activeRoomCode && activePlayer) {
        socket.emit('reconnect_room', { roomCode: activeRoomCode, playerId: activePlayer.id });
      }
    });

    socket.on('disconnect', () => {
      isSocketReady = false;
      if (handlers.onConnectionChange) handlers.onConnectionChange(false);
    });

    socket.on('room_state', (data) => handlers.onRoomState && handlers.onRoomState(data));
    socket.on('player_joined', (data) => handlers.onPlayerJoined && handlers.onPlayerJoined(data));
    socket.on('player_left', (data) => handlers.onPlayerLeft && handlers.onPlayerLeft(data));
    socket.on('game_changed', (data) => handlers.onGameChanged && handlers.onGameChanged(data));
    socket.on('mode_changed', (data) => handlers.onModeChanged && handlers.onModeChanged(data));
    socket.on('match_started', (data) => handlers.onMatchStarted && handlers.onMatchStarted(data));
    socket.on('client_input', (data) => handlers.onClientInput && handlers.onClientInput(data));
    socket.on('game_state', (data) => handlers.onGameState && handlers.onGameState(data));
    socket.on('caro_move_accepted', (data) => handlers.onCaroMoveAccepted && handlers.onCaroMoveAccepted(data));
    socket.on('caro_move_rejected', (data) => handlers.onCaroMoveRejected && handlers.onCaroMoveRejected(data));
    socket.on('receive_emote', (data) => handlers.onReceiveEmote && handlers.onReceiveEmote(data));
    socket.on('screen_shake', (data) => handlers.onScreenShake && handlers.onScreenShake(data));
    socket.on('player_disconnected', (data) => handlers.onPlayerDisconnected && handlers.onPlayerDisconnected(data));
    socket.on('player_reconnected', (data) => handlers.onPlayerReconnected && handlers.onPlayerReconnected(data));
    socket.on('reconnect_success', (data) => handlers.onReconnectSuccess && handlers.onReconnectSuccess(data));
    socket.on('match_forfeited', (data) => handlers.onMatchForfeited && handlers.onMatchForfeited(data));
    socket.on('match_finished', (data) => handlers.onMatchFinished && handlers.onMatchFinished(data));
    socket.on('room_error', (data) => handlers.onRoomError && handlers.onRoomError(data));

    return socket;
  }

  function startPingLoop() {
    if (pingInterval) clearInterval(pingInterval);
    measurePing();
    pingInterval = setInterval(measurePing, 4000);
  }

  function measurePing() {
    if (!socket || !socket.connected) return;
    const sentAt = Date.now();
    socket.emit('ping_check', sentAt, () => {
      const rtt = Math.max(1, Date.now() - sentAt);
      if (handlers.onPing) handlers.onPing(rtt);
    });
  }

  function init(eventHandlers = {}) {
    handlers = eventHandlers;
    ensureSocket();
  }

  function joinRoom(roomCode, player, role = 'P1', gameId = 'starfighter') {
    activeRoomCode = String(roomCode).trim().toUpperCase();
    activePlayer = player;
    activeRole = role;
    saveSession(activeRoomCode, player.id, role, gameId);

    // Fallback BroadcastChannel cho moi truong offline / test 2 tab khong server
    if (typeof BroadcastChannel !== 'undefined') {
      if (broadcastChannel) broadcastChannel.close();
      broadcastChannel = new BroadcastChannel('arcade_room_' + activeRoomCode);
      broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || msg.senderId === player.id) return;
        if (handlers.onBroadcastMessage) handlers.onBroadcastMessage(msg);
      };
    }

    const s = ensureSocket();
    if (s) {
      s.emit('join_room', { roomCode: activeRoomCode, player });
    }
  }

  function reconnectRoom(roomCode, player) {
    activeRoomCode = String(roomCode).trim().toUpperCase();
    activePlayer = player;
    const s = ensureSocket();
    if (s) {
      s.emit('reconnect_room', { roomCode: activeRoomCode, playerId: player.id });
    }
  }

  function leaveRoom() {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('leave_room', { roomCode: activeRoomCode });
    }
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
    activeRoomCode = null;
    clearSession();
  }

  function isSocketMultiplayer(mode) {
    return !!(socket && socket.connected && activeRoomCode && mode !== 'bot');
  }

  function sendChangeGame(gameId) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('change_game', { roomCode: activeRoomCode, gameId });
    }
    postBroadcast({ type: 'CHANGE_GAME', gameId });
  }

  function sendChangeMode(mode) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('change_mode', { roomCode: activeRoomCode, mode });
    }
  }

  function sendStartMatch() {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('start_match', { roomCode: activeRoomCode });
    }
    postBroadcast({ type: 'START_MATCH' });
  }

  function sendInputEvent(payload) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('input_event', { roomCode: activeRoomCode, ...payload });
    } else {
      postBroadcast({ type: 'P2_INPUT', ...payload });
    }
  }

  function sendHostStateSync(state) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('host_state_sync', { roomCode: activeRoomCode, state });
    }
  }

  function sendCaroMove(r, c) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('caro_move', { roomCode: activeRoomCode, r, c });
    } else {
      postBroadcast({ type: 'CARO_MOVE', r, c });
    }
  }

  function sendEmote(emote, role) {
    const now = Date.now();
    if (now - lastEmoteTs < 350) return false;
    lastEmoteTs = now;

    if (socket && socket.connected && activeRoomCode) {
      socket.emit('send_emote', { roomCode: activeRoomCode, emote, role: role || activeRole });
      return true;
    }
    postBroadcast({ type: 'EMOTE', emote, role: role || activeRole });
    return true;
  }

  function sendScreenShake(reason = 'impact', intensity = 1) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('screen_shake', { roomCode: activeRoomCode, reason, intensity });
    } else {
      postBroadcast({ type: 'SCREEN_SHAKE', reason, intensity });
    }
  }

  function sendMatchEnded(payload) {
    if (socket && socket.connected && activeRoomCode) {
      socket.emit('match_ended', { roomCode: activeRoomCode, ...payload });
    }
  }

  function postBroadcast(payload) {
    if (!broadcastChannel || !activePlayer) return;
    broadcastChannel.postMessage({ ...payload, senderId: activePlayer.id });
  }

  function getStatus() {
    return {
      isSocketReady,
      connected: !!(socket && socket.connected),
      roomCode: activeRoomCode,
      role: activeRole
    };
  }

  return {
    init,
    joinRoom,
    reconnectRoom,
    leaveRoom,
    isSocketMultiplayer,
    sendChangeGame,
    sendChangeMode,
    sendStartMatch,
    sendInputEvent,
    sendHostStateSync,
    sendCaroMove,
    sendEmote,
    sendScreenShake,
    sendMatchEnded,
    postBroadcast,
    measurePing,
    getSavedSession,
    clearSession,
    getStatus
  };
});
