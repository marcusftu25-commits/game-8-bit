/**
 * 8-BIT ARCADE DUO - PHASE 5 AUTOMATED TEST SUITE (SQLITE DB & LEADERBOARD API)
 * Kiem thu toan dien Giai doan 5 (MVP 5):
 * 1. SQLite Schema (players, match_history) & luu tru ben vung qua dong/mo lai DB
 * 2. Cong thuc thuong diem: Thang +150, Thua +30, Hoa +60/+60, tang wins & matchesPlayed
 * 3. Idempotency: Gui trung matchId khong cong diem dup
 * 4. Bot AI: Loc bot_ai khoi Bang Xep Hang Top 10 cong dong
 * 5. REST API Endpoints: POST /api/matches/finish, GET /api/leaderboard?limit=10, GET /api/players/:id, GET /api/matches/recent
 * 6. Tich hop Socket.io -> tu dong luu ket qua tran vao SQLite khi endMatch / Caro win
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io: createClient } = require('socket.io-client');

// Dung file DB tam doc lap cho test de kiem chung persistence ma khong lam ban DB chinh
const TEMP_DB = path.join(os.tmpdir(), `arcade_test_phase5_${Date.now()}.db`);
process.env.DB_PATH = TEMP_DB;

const { createDatabase } = require('../server/database');
const { createMatchService } = require('../server/matchService');
const { startServer, stopServer, matchService } = require('../server/server');
const { roomManager } = require('../server/roomManager');

const TEST_PORT = 3469;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: reqPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : {} }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function waitEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timeout waiting for '${eventName}'`));
    }, timeoutMs);
    function onEvent(d) {
      clearTimeout(timer);
      resolve(d);
    }
    socket.once(eventName, onEvent);
  });
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   8-BIT ARCADE DUO - PHASE 5 (SQLITE DATABASE & LEADERBOARD) TESTS');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const openSockets = [];

  function test(name, fn) {
    try {
      fn();
      console.log(`  \x1b[32m[PASS]\x1b[0m ${name}`);
      passed++;
    } catch (err) {
      console.log(`  \x1b[31m[FAIL]\x1b[0m ${name}`);
      console.log(`         \x1b[90m${err.message}\x1b[0m`);
      failed++;
    }
  }

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

  // =========================================================================
  // PHAN 1: UNIT TESTS - DATABASE & MATCH SERVICE (ISOLATED FILE PERSISTENCE)
  // =========================================================================
  console.log('\x1b[33m[SECTION 1] SQLite Schema, Scoring Math, Idempotency & Persistence...\x1b[0m');

  const unitDbPath = path.join(os.tmpdir(), `arcade_unit_p5_${Date.now()}.db`);

  test('Thang +150, Thua +30, Hoa +60/+60 va luu tru ben vung khi dong & mo lai DB', () => {
    const db1 = createDatabase(unitDbPath);
    const svc1 = createMatchService(db1);

    // Tran 1: A thang B -> A +150 (1 win), B +30 (0 win)
    const r1 = svc1.finishMatch({
      matchId: 'm_unit_1',
      roomCode: 'ABCD',
      gameId: 'starfighter',
      p1: { id: 'u_a', name: 'Alpha', avatar: '🚀' },
      p2: { id: 'u_b', name: 'Beta', avatar: '🦊' },
      p1Score: 1200,
      p2Score: 600,
      winnerId: 'u_a',
      durationSec: 75
    });
    assert.strictEqual(r1.duplicate, false);
    assert.strictEqual(r1.rewards.p1Delta, 150);
    assert.strictEqual(r1.rewards.p2Delta, 30);

    // Tran 2: A hoa B -> ca hai +60
    const r2 = svc1.finishMatch({
      matchId: 'm_unit_2',
      roomCode: 'ABCD',
      gameId: 'tank',
      p1: { id: 'u_a', name: 'Alpha', avatar: '🚀' },
      p2: { id: 'u_b', name: 'Beta', avatar: '🦊' },
      p1Score: 500,
      p2Score: 500,
      winnerId: null,
      durationSec: 90
    });
    assert.strictEqual(r2.rewards.p1Delta, 60);
    assert.strictEqual(r2.rewards.p2Delta, 60);

    // Idempotency: Gui trung m_unit_1 khong cong them diem
    const dup = svc1.finishMatch({
      matchId: 'm_unit_1',
      roomCode: 'ABCD',
      gameId: 'starfighter',
      p1: { id: 'u_a', name: 'Alpha', avatar: '🚀' },
      p2: { id: 'u_b', name: 'Beta', avatar: '🦊' },
      p1Score: 1200,
      p2Score: 600,
      winnerId: 'u_a',
      durationSec: 75
    });
    assert.strictEqual(dup.duplicate, true);
    assert.strictEqual(dup.rewards.p1Delta, 0);

    // Tran voi Bot: Bot khong xuat hien trong Bang Xep Hang nguoi choi
    svc1.finishMatch({
      matchId: 'm_unit_bot',
      roomCode: 'BOT1',
      gameId: 'caro',
      p1: { id: 'u_c', name: 'Gamma', avatar: '🐲' },
      p2: null,
      p1Score: 500,
      p2Score: 0,
      winnerId: 'u_c',
      durationSec: 40
    });

    db1.close();

    // Mo lai tu file de kiem chung du lieu con nguyen ven
    const db2 = createDatabase(unitDbPath);
    const svc2 = createMatchService(db2);
    const lb = svc2.getLeaderboard(10);

    assert.strictEqual(lb.length, 3, 'Chi co 3 nguoi choi that (da loai bot_ai)');
    assert.strictEqual(lb[0].id, 'u_a');
    assert.strictEqual(lb[0].totalScore, 210); // 150 + 60
    assert.strictEqual(lb[0].wins, 1);
    assert.strictEqual(lb[0].matchesPlayed, 2);

    assert.strictEqual(lb[1].id, 'u_c');
    assert.strictEqual(lb[1].totalScore, 150);

    assert.strictEqual(lb[2].id, 'u_b');
    assert.strictEqual(lb[2].totalScore, 90); // 30 + 60
    assert.strictEqual(lb[2].wins, 0);

    const recent = svc2.getRecentMatches(10);
    assert.strictEqual(recent.length, 3);

    db2.close();
    try { fs.unlinkSync(unitDbPath); fs.unlinkSync(unitDbPath + '-wal'); fs.unlinkSync(unitDbPath + '-shm'); } catch (e) {}
  });

  // =========================================================================
  // PHAN 2: INTEGRATION TESTS - REST API & SOCKET.IO -> SQLITE
  // =========================================================================
  console.log('\n\x1b[33m[SECTION 2] REST API (/api/matches/finish, /api/leaderboard) & Socket Auto-Save...\x1b[0m');

  roomManager.clear();
  await startServer(TEST_PORT);

  try {
    await testAsync('POST /api/matches/finish tu choi payload thieu P1 (400)', async () => {
      const res = await request('POST', '/api/matches/finish', { gameId: 'tank' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
    });

    await testAsync('POST /api/matches/finish ghi nhan nhieu tran & GET /api/leaderboard?limit=10 sap xep chuan DESC', async () => {
      // Tao 12 nguoi choi thang cac tran voi diem khac nhau de kiem tra limit=10
      for (let i = 1; i <= 12; i++) {
        const winsCount = i === 12 ? 3 : (i === 11 ? 2 : 1);
        for (let w = 0; w < winsCount; w++) {
          const res = await request('POST', '/api/matches/finish', {
            matchId: `m_api_${i}_${w}`,
            roomCode: 'LB99',
            gameId: 'starfighter',
            p1: { id: `u_top_${i}`, name: `Gamer_${i}`, avatar: '👾' },
            p2: null,
            p1Score: 500,
            p2Score: 0,
            winnerId: `u_top_${i}`,
            durationSec: 45
          });
          assert.strictEqual(res.status, 201);
          assert.strictEqual(res.data.success, true);
        }
      }

      const lbRes = await request('GET', '/api/leaderboard?limit=10');
      assert.strictEqual(lbRes.status, 200);
      assert.strictEqual(lbRes.data.success, true);
      assert.strictEqual(lbRes.data.leaderboard.length, 10, 'Phai gioi han dung Top 10');
      assert.strictEqual(lbRes.data.leaderboard[0].id, 'u_top_12');
      assert.strictEqual(lbRes.data.leaderboard[0].totalScore, 450); // 3 * 150
      assert.strictEqual(lbRes.data.leaderboard[0].rank, 1);
      assert.strictEqual(lbRes.data.leaderboard[1].id, 'u_top_11');
      assert.strictEqual(lbRes.data.leaderboard[1].totalScore, 300); // 2 * 150

      // Kiem tra thu tu giam dan toan bo 10 dong
      for (let k = 1; k < lbRes.data.leaderboard.length; k++) {
        assert.ok(lbRes.data.leaderboard[k - 1].totalScore >= lbRes.data.leaderboard[k].totalScore);
      }
    });

    await testAsync('GET /api/players/:id va GET /api/matches/recent tra ve du lieu chuan', async () => {
      const pRes = await request('GET', '/api/players/u_top_12');
      assert.strictEqual(pRes.status, 200);
      assert.strictEqual(pRes.data.player.totalScore, 450);
      assert.strictEqual(pRes.data.player.wins, 3);

      const mRes = await request('GET', '/api/matches/recent?limit=5');
      assert.strictEqual(mRes.status, 200);
      assert.strictEqual(mRes.data.matches.length, 5);
    });

    await testAsync('Ket thuc tran Online qua Socket.io tu dong luu DB & cong +150 / +30', async () => {
      const u1 = { id: 'u_sock_win', name: 'SockWinner', avatar: '👑' };
      const u2 = { id: 'u_sock_lose', name: 'SockLoser', avatar: '🤖' };
      const cr = await request('POST', '/api/rooms', { gameId: 'tank', mode: 'local_or_tab', host: u1 });
      const code = cr.data.room.code;

      const s1 = createClient(BASE_URL, { transports: ['websocket'], reconnection: false, forceNew: true });
      const s2 = createClient(BASE_URL, { transports: ['websocket'], reconnection: false, forceNew: true });
      openSockets.push(s1, s2);
      await Promise.all([waitEvent(s1, 'connect'), waitEvent(s2, 'connect')]);

      await new Promise(res => s1.emit('join_room', { roomCode: code, player: u1 }, res));
      await new Promise(res => s2.emit('join_room', { roomCode: code, player: u2 }, res));

      const started = waitEvent(s2, 'match_started');
      s1.emit('start_match', { roomCode: code });
      await started;

      const finished = waitEvent(s2, 'match_finished');
      s1.emit('match_ended', { roomCode: code, p1Score: 1000, p2Score: 250, winnerRole: 'P1' });
      const finData = await finished;
      assert.strictEqual(finData.winnerRole, 'P1');
      assert.strictEqual(finData.rewards.rewards.p1Delta, 150);
      assert.strictEqual(finData.rewards.rewards.p2Delta, 30);

      const p1Stat = await request('GET', '/api/players/u_sock_win');
      const p2Stat = await request('GET', '/api/players/u_sock_lose');
      assert.strictEqual(p1Stat.data.player.totalScore, 150);
      assert.strictEqual(p2Stat.data.player.totalScore, 30);
    });
  } finally {
    openSockets.forEach(s => { try { s.disconnect(); } catch (e) {} });
    await stopServer();
    try { fs.unlinkSync(TEMP_DB); fs.unlinkSync(TEMP_DB + '-wal'); fs.unlinkSync(TEMP_DB + '-shm'); } catch (e) {}
  }

  const total = passed + failed;
  console.log('\n========================================================================');
  console.log(` TONG KET KIEM THU PHASE 5 (SQLITE DATABASE & LEADERBOARD):`);
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
