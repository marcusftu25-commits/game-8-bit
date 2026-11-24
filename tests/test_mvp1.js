/**
 * 8-BIT ARCADE DUO - MVP 1 AUTOMATED TEST SUITE
 * Kiểm thử toàn diện:
 * 1. RoomManager (Unit Tests: Sinh mã, lọc từ cấm, Map state, Capacity, TTL)
 * 2. GuestAuth (Unit Tests: localStorage, sanitize input XSS, avatar validation)
 * 3. REST API Endpoints (Integration Tests: /api/rooms, /api/rooms/public, /api/rooms/join)
 */

const assert = require('assert');
const http = require('http');
const { RoomManager } = require('../server/roomManager');
const { server, startServer, stopServer } = require('../server/server');
const GuestAuth = require('../src/guestAuth');

const TEST_PORT = 3456;

// Helper gọi HTTP request
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   8-BIT ARCADE DUO - MVP 1 BACKEND & GUEST AUTH TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

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
  // PHẦN 1: UNIT TESTS - ROOM MANAGER
  // =========================================================================
  console.log('\x1b[33m[PHASE 1] Kiểm thử Unit Test RoomManager (In-Memory RAM Engine)...\x1b[0m');

  const rm = new RoomManager();

  test('Sinh mã phòng 4 ký tự không trùng lặp và đúng tập ký tự hợp lệ', () => {
    rm.clear();
    const codes = new Set();
    // Tạo 100 phòng liên tiếp, mỗi phòng phải có mã 4 ký tự độc nhất
    for (let i = 0; i < 100; i++) {
      const room = rm.createRoom({ host: { id: `u_${i}`, name: `Player_${i}` } });
      assert.strictEqual(room.code.length, 4, 'Độ dài mã phòng phải là 4');
      assert.match(room.code, /^[A-Z2-9]{4}$/, 'Mã phòng phải thuộc tập ký tự cho phép');
      assert.ok(!codes.has(room.code), `Không được sinh mã trùng lặp: ${room.code}`);
      codes.add(room.code);
    }
    assert.strictEqual(codes.size, 100);
  });

  test('Tạo phòng mới gán đúng P1 Host và trạng thái LOBBY', () => {
    rm.clear();
    const host = { id: 'u_111', name: 'AlphaHost', avatar: '🚀' };
    const room = rm.createRoom({ gameId: 'tank', mode: 'local_or_tab', host });

    assert.strictEqual(room.code.length, 4);
    assert.strictEqual(room.gameId, 'tank');
    assert.strictEqual(room.status, 'LOBBY');
    assert.strictEqual(room.p1.id, 'u_111');
    assert.strictEqual(room.p1.name, 'AlphaHost');
    assert.strictEqual(room.p2, null, 'Slot P2 ban đầu phải là null');
    assert.strictEqual(rm.count(), 1);
  });

  test('Khách P2 tham gia phòng hợp lệ', () => {
    const room = rm.getPublicRooms()[0];
    const guest = { id: 'u_222', name: 'BetaGuest', avatar: '🤖' };
    const res = rm.joinRoom(room.code, guest);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.role, 'P2');
    assert.strictEqual(res.room.p2.id, 'u_222');
  });

  test('Từ chối người chơi thứ 3 khi phòng đã đủ 2 người (409 Conflict)', () => {
    const room = rm.getPublicRooms()[0];
    const intruder = { id: 'u_333', name: 'Intruder', avatar: '🦊' };
    // Vì phòng ở test trước đã có P2, join lại bằng code đó phải bị chặn
    const roomsList = Array.from(rm.rooms.values());
    const fullRoom = roomsList.find(r => r.p2 !== null);
    const res = rm.joinRoom(fullRoom.code, intruder);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 409);
    assert.ok(res.message.includes('đủ 2 người'));
  });

  test('Từ chối tham gia với mã phòng không tồn tại (404 Not Found)', () => {
    const res = rm.joinRoom('ZZ99', { id: 'u_fake', name: 'Ghost' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 404);
  });

  test('Danh sách phòng công khai (getPublicRooms) chỉ trả về phòng đang trống slot P2', () => {
    rm.clear();
    // Tạo 3 phòng: 2 phòng trống, 1 phòng đầy
    const r1 = rm.createRoom({ gameId: 'starfighter', host: { id: 'h1', name: 'H1' } });
    const r2 = rm.createRoom({ gameId: 'tank', host: { id: 'h2', name: 'H2' } });
    const r3 = rm.createRoom({ gameId: 'caro', host: { id: 'h3', name: 'H3' } });
    rm.joinRoom(r2.code, { id: 'g2', name: 'G2' }); // r2 đầy

    const publics = rm.getPublicRooms();
    assert.strictEqual(publics.length, 2, 'Chỉ 2 phòng còn trống slot P2');
    const codes = publics.map(p => p.code);
    assert.ok(codes.includes(r1.code));
    assert.ok(codes.includes(r3.code));
    assert.ok(!codes.includes(r2.code));
  });

  test('Tự động dọn dẹp các phòng quá hạn TTL 1 giờ', () => {
    rm.clear();
    const rOld = rm.createRoom({ host: { id: 'h_old', name: 'Old' } });
    rOld.lastActiveAt = Date.now() - 3700000; // 1 tiếng 2 phút trước

    const rNew = rm.createRoom({ host: { id: 'h_new', name: 'New' } });
    rNew.lastActiveAt = Date.now();

    const cleaned = rm.cleanupExpiredRooms(3600000);
    assert.strictEqual(cleaned, 1);
    assert.strictEqual(rm.count(), 1);
    assert.strictEqual(rm.getRoom(rNew.code) !== null, true);
    assert.strictEqual(rm.getRoom(rOld.code), null);
  });

  // =========================================================================
  // PHẦN 2: UNIT TESTS - GUEST AUTH (CLIENT MODULE)
  // =========================================================================
  console.log('\n\x1b[33m[PHASE 2] Kiểm thử Unit Test GuestAuth (Client Identity Module)...\x1b[0m');

  test('Lọc sạch mã độc XSS và ký tự lạ trong tên người dùng', () => {
    const dirty1 = '<script>alert(1)</script>John';
    const clean1 = GuestAuth.sanitizeName(dirty1);
    assert.strictEqual(clean1, 'alert1John');

    const dirty2 = '   Super_Pro_VN   ';
    const clean2 = GuestAuth.sanitizeName(dirty2);
    assert.strictEqual(clean2, 'Super_Pro_VN');

    const tooLong = 'A'.repeat(50);
    const cleanLong = GuestAuth.sanitizeName(tooLong);
    assert.strictEqual(cleanLong.length, 16, 'Giới hạn tối đa 16 ký tự');
  });

  test('Tạo Guest ID ngẫu nhiên bắt đầu bằng u_', () => {
    const id = GuestAuth.generateGuestId();
    assert.strictEqual(id.startsWith('u_'), true);
    assert.ok(id.length >= 6);
  });

  // =========================================================================
  // PHẦN 3: INTEGRATION TESTS - REST API ENDPOINTS
  // =========================================================================
  console.log('\n\x1b[33m[PHASE 3] Kiểm thử Integration Tests REST API Server...\x1b[0m');

  await startServer(TEST_PORT);

  await testAsync('GET /api/health trả về status UP', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'UP');
  });

  let createdRoomCode = '';

  await testAsync('POST /api/rooms tạo phòng mới thành công (Status 201)', async () => {
    const res = await request('POST', '/api/rooms', {
      gameId: 'starfighter',
      mode: 'local_or_tab',
      host: { id: 'u_tester', name: 'APITester', avatar: '🚀' }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.room.p1.name, 'APITester');
    assert.strictEqual(res.data.room.code.length, 4);
    createdRoomCode = res.data.room.code;
  });

  await testAsync('GET /api/rooms/public hiển thị phòng vừa tạo', async () => {
    const res = await request('GET', '/api/rooms/public');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const found = res.data.rooms.find(r => r.code === createdRoomCode);
    assert.ok(found, 'Phòng vừa tạo phải xuất hiện trong danh sách công khai');
  });

  await testAsync('POST /api/rooms/join tham gia phòng thành công (Status 200)', async () => {
    const res = await request('POST', '/api/rooms/join', {
      roomCode: createdRoomCode,
      guest: { id: 'u_guest99', name: 'GuestGamer', avatar: '🥷' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.room.p2.name, 'GuestGamer');
    assert.strictEqual(res.data.role, 'P2');
  });

  await testAsync('POST /api/rooms/join từ chối khi phòng đã đầy (Status 409)', async () => {
    const res = await request('POST', '/api/rooms/join', {
      roomCode: createdRoomCode,
      guest: { id: 'u_third', name: 'ThirdWheel', avatar: '🦊' }
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
  });

  await testAsync('POST /api/rooms/join báo lỗi với mã không tồn tại (Status 404)', async () => {
    const res = await request('POST', '/api/rooms/join', {
      roomCode: 'FAIL',
      guest: { id: 'u_abc', name: 'Nobody' }
    });

    assert.strictEqual(res.status, 404);
  });

  await testAsync('POST /api/rooms từ chối khi thiếu host data (Status 400)', async () => {
    const res = await request('POST', '/api/rooms', { gameId: 'tank' });
    assert.strictEqual(res.status, 400);
  });

  await stopServer();

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  const total = passed + failed;
  console.log('\n========================================================================');
  console.log(` TỔNG KẾT KIỂM THỬ MVP 1:`);
  console.log(`   Tổng số tests:   ${total}`);
  console.log(`   \x1b[32mThành công:      ${passed}\x1b[0m`);
  console.log(`   ${failed === 0 ? '\x1b[32m' : '\x1b[31m'}Thất bại:        ${failed}\x1b[0m`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
