/**
 * 8-BIT ARCADE DUO - PHASE 4 AUTOMATED TEST SUITE (SOCIAL, QUICK EMOTES & SCREEN SHAKE)
 * Kiem thu toan dien Giai doan 4 (MVP 4 Phan 2):
 * 1. Gui Quick Emote qua Socket.io (P1 -> P2 va P2 -> P1) kem dung role
 * 2. Chan Emote khong nam trong whitelist (INVALID_EMOTE)
 * 3. Chong spam Emote (RATE_LIMITED trong < 350ms)
 * 4. Dong bo Screen Shake (screen_shake) giua 2 thiet bi
 * 5. Do do tre thuc te qua su kien ping_check
 */

const assert = require('assert');
const http = require('http');
const { io: createClient } = require('socket.io-client');
const { startServer, stopServer } = require('../server/server');
const { roomManager } = require('../server/roomManager');

const TEST_PORT = 3468;
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

function waitEvent(socket, eventName, timeoutMs = 3000) {
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
    const s = createClient(BASE_URL, { transports: ['websocket'], reconnection: false, forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   8-BIT ARCADE DUO - PHASE 4 (QUICK EMOTES, SHAKE & PING) TEST SUITE');
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
    const hostUser = { id: 'u_em1', name: 'EmoteHost', avatar: '👾' };
    const guestUser = { id: 'u_em2', name: 'EmoteGuest', avatar: '🦊' };
    const createRes = await httpPost('/api/rooms', { gameId: 'starfighter', mode: 'local_or_tab', host: hostUser });
    const roomCode = createRes.data.room.code;

    const p1 = await connectSocket();
    const p2 = await connectSocket();
    openSockets.push(p1, p2);

    await new Promise(res => p1.emit('join_room', { roomCode, player: hostUser }, res));
    await new Promise(res => p2.emit('join_room', { roomCode, player: guestUser }, res));

    await testAsync('P2 ban Quick Emote 🔥 qua Socket -> P1 nhan receive_emote voi dung role P2', async () => {
      const p1Recv = waitEvent(p1, 'receive_emote');
      p2.emit('send_emote', { roomCode, emote: '🔥', role: 'P2' });
      const data = await p1Recv;
      assert.strictEqual(data.emote, '🔥');
      assert.strictEqual(data.role, 'P2');
      assert.strictEqual(data.senderId, guestUser.id);
    });

    await testAsync('Chan Quick Emote khong nam trong whitelist (INVALID_EMOTE)', async () => {
      const rejPromise = waitEvent(p1, 'emote_rejected');
      p1.emit('send_emote', { roomCode, emote: '<script>xss</script>', role: 'P1' });
      const rej = await rejPromise;
      assert.strictEqual(rej.reason, 'INVALID_EMOTE');
    });

    await testAsync('Chong spam Emote lien tuc trong < 350ms (RATE_LIMITED)', async () => {
      const firstRecv = waitEvent(p2, 'receive_emote');
      p1.emit('send_emote', { roomCode, emote: '👑', role: 'P1' });
      await firstRecv;

      const rateRej = waitEvent(p1, 'emote_rejected');
      p1.emit('send_emote', { roomCode, emote: '😂', role: 'P1' });
      const rej = await rateRej;
      assert.strictEqual(rej.reason, 'RATE_LIMITED');
    });

    await testAsync('Dong bo hieu ung Rung Man Hinh (screen_shake) tu P1 sang P2', async () => {
      const p2Shake = waitEvent(p2, 'screen_shake');
      p1.emit('screen_shake', { roomCode, intensity: 1, reason: 'tank_p2_hit' });
      const ev = await p2Shake;
      assert.strictEqual(ev.reason, 'tank_p2_hit');
      assert.strictEqual(ev.senderId, hostUser.id);
    });

    await testAsync('Do do tre thuc te qua su kien ping_check', async () => {
      const sent = Date.now();
      const ack = await new Promise((resolve) => {
        p1.emit('ping_check', sent, resolve);
      });
      assert.strictEqual(ack.clientTs, sent);
      assert.ok(typeof ack.serverTs === 'number');
    });
  } finally {
    openSockets.forEach(s => { try { s.disconnect(); } catch (e) {} });
    await stopServer();
  }

  const total = passed + failed;
  console.log('\n========================================================================');
  console.log(` TONG KET KIEM THU PHASE 4 (SOCIAL, QUICK EMOTES & SHAKE):`);
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
