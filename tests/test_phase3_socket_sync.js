/**
 * 8-BIT ARCADE DUO - PHASE 3 AUTOMATED TEST SUITE (REAL-TIME SOCKET.IO SYNC)
 * Kiem thu toan dien Giai doan 3 (MVP 2):
 * 1. Ket noi Socket.io 2 thiet bi (P1 Host & P2 Guest) vao chung phong
 * 2. Dong bo doi game / bat dau tran dau
 * 3. Host-Authoritative Action Sync (30-45 Hz): P2 input_event -> P1 client_input -> P1 host_state_sync -> P2 game_state
 * 4. Server-Authoritative Caro Anti-Cheat: dung luot, chan sai luot, chan danh trung o, xac nhan thang 5 quan
 * 5. Disconnect Handling & Grace Period:
 *    - Case A: P2 mat ket noi -> P1 nhan player_disconnected -> P2 reconnect_room trong thoi gian cho -> tiep tuc tran
 *    - Case B: P2 mat ket noi qua han -> P1 nhan match_forfeited & phong duoc giai phong
 */

const assert = require('assert');
const http = require('http');
const { io: createClient } = require('socket.io-client');

// Dung grace period ngan (1200ms) trong test de kiem thu nhanh & chinh xac
process.env.DISCONNECT_GRACE_MS = '1200';

const { startServer, stopServer } = require('../server/server');
const { roomManager } = require('../server/roomManager');

const TEST_PORT = 3467;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(raw || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function waitEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timeout waiting for event '${eventName}'`));
    }, timeoutMs);
    function onEvent(data) {
      clearTimeout(timer);
      resolve(data);
    }
    socket.once(eventName, onEvent);
  });
}

function connectSocket() {
  return new Promise((resolve, reject) => {
    const s = createClient(BASE_URL, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true
    });
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 4000);
    s.once('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   8-BIT ARCADE DUO - PHASE 3 (SOCKET.IO REAL-TIME SYNC) TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const openSockets = [];

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  \x1b[32m[PASS]\x1b[0m ${name}`);
      passed++;
    } catch (err) {
      console.log(`  \x1b[31m[FAIL]\x1b[0m ${name}`);
      console.log(`         \x1b[90m${err.message}\x1b[0m`);
      failed++;
    }
  }

  roomManager.clear();
  await startServer(TEST_PORT);

  try {
    // =====================================================================
    // PHAN 1: ROOM SYNC & HOST-AUTHORITATIVE ACTION GAME TICK
    // =====================================================================
    console.log('\x1b[33m[SECTION 1] Room Sync & Host-Authoritative State Sync (30-45 Hz)...\x1b[0m');

    const hostUser = { id: 'u_host1', name: 'HostPC', avatar: '🚀' };
    const guestUser = { id: 'u_guest2', name: 'MobileP2', avatar: '🥷' };

    const createRes = await httpPost('/api/rooms', { gameId: 'starfighter', mode: 'local_or_tab', host: hostUser });
    const roomCode = createRes.data.room.code;

    const p1 = await connectSocket();
    const p2 = await connectSocket();
    openSockets.push(p1, p2);

    await testAsync('P1 va P2 ket noi vao cung phong va dong bo trang thai', async () => {
      const p1JoinAck = await new Promise(res => p1.emit('join_room', { roomCode, player: hostUser }, res));
      assert.strictEqual(p1JoinAck.success, true);
      assert.strictEqual(p1JoinAck.role, 'P1');

      const p1Notified = waitEvent(p1, 'player_joined');
      const p2JoinAck = await new Promise(res => p2.emit('join_room', { roomCode, player: guestUser }, res));
      assert.strictEqual(p2JoinAck.success, true);
      assert.strictEqual(p2JoinAck.role, 'P2');

      const joinedData = await p1Notified;
      assert.strictEqual(joinedData.role, 'P2');
      assert.strictEqual(joinedData.player.name, 'MobileP2');
    });

    await testAsync('Host doi game va bat dau tran dau dong bo sang P2', async () => {
      const p2GameChanged = waitEvent(p2, 'game_changed');
      p1.emit('change_game', { roomCode, gameId: 'tank' });
      const changed = await p2GameChanged;
      assert.strictEqual(changed.gameId, 'tank');

      const p2Started = waitEvent(p2, 'match_started');
      p1.emit('start_match', { roomCode });
      const started = await p2Started;
      assert.strictEqual(started.gameId, 'tank');
      assert.ok(started.matchId.startsWith('m_'));
    });

    await testAsync('P2 gui input_event -> P1 nhan client_input -> P1 host_state_sync -> P2 nhan game_state', async () => {
      const p1InputPromise = waitEvent(p1, 'client_input');
      p2.emit('input_event', {
        roomCode,
        key: 'KeyW',
        mappedKey: 'ArrowUp',
        isDown: true,
        seq: 102,
        timestamp: Date.now()
      });

      const receivedInput = await p1InputPromise;
      assert.strictEqual(receivedInput.role, 'P2');
      assert.strictEqual(receivedInput.key, 'KeyW');
      assert.strictEqual(receivedInput.mappedKey, 'ArrowUp');
      assert.strictEqual(receivedInput.isDown, true);
      assert.strictEqual(receivedInput.seq, 102);

      // Host gui nhieu frame tick (mo phong 40 Hz)
      const receivedStates = [];
      const donePromise = new Promise((resolve) => {
        p2.on('game_state', (st) => {
          receivedStates.push(st);
          if (receivedStates.length === 5) resolve();
        });
      });

      for (let tick = 1; tick <= 5; tick++) {
        p1.emit('host_state_sync', {
          roomCode,
          state: {
            gameId: 'tank',
            tick,
            t1: { x: 80 + tick * 3, y: 230, dir: 'R' },
            t2: { x: 680, y: 230 - tick * 3, dir: 'U' },
            match: { p1Score: tick * 50, p2Score: 0, p1Hp: 100, p2Hp: 75, timeLeft: 89 }
          }
        });
      }
      await donePromise;
      assert.strictEqual(receivedStates.length, 5);
      assert.strictEqual(receivedStates[4].tick, 5);
      assert.strictEqual(receivedStates[4].match.p2Hp, 75);
    });

    // =====================================================================
    // PHAN 2: SERVER-AUTHORITATIVE CARO (CHONG CHEAT)
    // =====================================================================
    console.log('\n\x1b[33m[SECTION 2] Server-Authoritative Co Caro Anti-Cheat...\x1b[0m');

    await testAsync('Server kiem duyet luot di, chan danh sai luot, chan danh de o va xac nhan thang 5 quan', async () => {
      const p2Changed = waitEvent(p2, 'game_changed');
      p1.emit('change_game', { roomCode, gameId: 'caro' });
      await p2Changed;

      const p1Start = waitEvent(p1, 'match_started');
      const p2Start = waitEvent(p2, 'match_started');
      p1.emit('start_match', { roomCode });
      await Promise.all([p1Start, p2Start]);

      // P2 co tinh danh truoc luot P1 -> bi tu choi
      const p2RejectTurn = waitEvent(p2, 'caro_move_rejected');
      p2.emit('caro_move', { roomCode, r: 7, c: 7 });
      const rej1 = await p2RejectTurn;
      assert.strictEqual(rej1.reason, 'NOT_YOUR_TURN');

      // P1 danh (7, 3) hop le -> ca 2 nhan caro_move_accepted
      const accP1 = waitEvent(p1, 'caro_move_accepted');
      const accP2 = waitEvent(p2, 'caro_move_accepted');
      p1.emit('caro_move', { roomCode, r: 7, c: 3 });
      const [m1a, m1b] = await Promise.all([accP1, accP2]);
      assert.strictEqual(m1a.player, 1);
      assert.strictEqual(m1a.nextTurn, 'P2');
      assert.strictEqual(m1b.r, 7);

      // P2 co tinh danh de len o (7, 3) -> bi tu choi CELL_OCCUPIED
      const p2RejectOcc = waitEvent(p2, 'caro_move_rejected');
      p2.emit('caro_move', { roomCode, r: 7, c: 3 });
      const rej2 = await p2RejectOcc;
      assert.strictEqual(rej2.reason, 'CELL_OCCUPIED');

      // Choi tiep de P1 thang hang ngang (7,3)-(7,7)
      const seqMoves = [
        [p2, 8, 3],
        [p1, 7, 4],
        [p2, 8, 4],
        [p1, 7, 5],
        [p2, 8, 5],
        [p1, 7, 6],
        [p2, 8, 6],
        [p1, 7, 7] // Nuoc thu 5 thang!
      ];

      let finalEvent = null;
      for (const [sock, r, c] of seqMoves) {
        const p = waitEvent(p1, 'caro_move_accepted');
        sock.emit('caro_move', { roomCode, r, c });
        finalEvent = await p;
      }

      assert.strictEqual(finalEvent.win, true, 'Server phai xac nhan thang 5 quan');
      assert.strictEqual(finalEvent.winnerRole, 'P1');
      assert.strictEqual(finalEvent.winLine.length, 5);
    });

    // =====================================================================
    // PHAN 3: DISCONNECT GRACE PERIOD & RECONNECT / FORFEIT
    // =====================================================================
    console.log('\n\x1b[33m[SECTION 3] Disconnect Grace Period (Reconnect & Timeout Forfeit)...\x1b[0m');

    await testAsync('Case A: P2 mat ket noi -> P1 nhan player_disconnected -> P2 reconnect_room thanh cong', async () => {
      // Bat dau lai 1 van moi
      const started = waitEvent(p1, 'match_started');
      p1.emit('start_match', { roomCode });
      await started;

      const discEvt = waitEvent(p1, 'player_disconnected');
      p2.disconnect();
      const d = await discEvt;
      assert.strictEqual(d.role, 'P2');
      assert.ok(d.gracePeriod >= 1);

      // P2 ket noi lai bang socket moi voi cung playerId trong thoi gian cho
      const p2Reconnected = await connectSocket();
      openSockets.push(p2Reconnected);

      const p1Resumed = waitEvent(p1, 'player_reconnected');
      const recAck = await new Promise(res => {
        p2Reconnected.emit('reconnect_room', { roomCode, playerId: guestUser.id }, res);
      });
      assert.strictEqual(recAck.success, true);
      assert.strictEqual(recAck.role, 'P2');

      const resEvt = await p1Resumed;
      assert.strictEqual(resEvt.role, 'P2');

      // Case B: Ngat ket noi han va cho het Grace Period (1.2s) -> xu thua & dong phong
      const forfeitPromise = waitEvent(p1, 'match_forfeited', 3500);
      p2Reconnected.disconnect();
      const forfeit = await forfeitPromise;
      assert.strictEqual(forfeit.winnerRole, 'P1');
      assert.strictEqual(forfeit.loserRole, 'P2');
      assert.strictEqual(forfeit.reason, 'DISCONNECT_TIMEOUT');
      assert.strictEqual(roomManager.getRoom(roomCode), null, 'Phong phai duoc giai phong sau khi xu thua');
    });

  } finally {
    openSockets.forEach(s => { try { s.disconnect(); } catch (e) {} });
    await stopServer();
  }

  const total = passed + failed;
  console.log('\n========================================================================');
  console.log(` TONG KET KIEM THU PHASE 3 (SOCKET.IO REAL-TIME SYNC):`);
  console.log(`   Tong so tests:   ${total}`);
  console.log(`   \x1b[32mThanh cong:      ${passed}\x1b[0m`);
  console.log(`   ${failed === 0 ? '\x1b[32m' : '\x1b[31m'}That bai:        ${failed}\x1b[0m`);
  console.log('========================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
