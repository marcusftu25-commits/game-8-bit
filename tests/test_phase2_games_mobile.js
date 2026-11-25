/**
 * 8-BIT ARCADE DUO - PHASE 2 AUTOMATED TEST SUITE
 * Kiem thu toan dien Giai doan 2 (MVP 3 + MVP 4 Phan 1):
 * 1. InputController: clientToCanvasCoords (16:10 & 4:3 letterbox), extractClientCoords, MAP_P1_TO_P2
 * 2. StarFighter 2P: di chuyen kep bien, cooldown 12 frames, wave quai, particle 8-bit, lot quai tru HP, Nitro nut B, Bot AI
 * 3. Tank 2P: 4 huong, chan tuong gach #B45309, pha gach, trung xe tang -25% HP + shake, Bot AI tuan tra & ngam P1
 * 4. Co Caro 15x15: checkCaroWin 4 huong, double-click lock, Bot AI ban kinh 2 o quanh P1, hoa 225 o
 * 5. Snapshot serialization cho StarFighter, Tank, Pong, Racer
 */

const assert = require('assert');
const InputController = require('../src/inputController');
const GameEngine = require('../src/gameEngine');

const {
  StarFighterEngine,
  TankEngine,
  CaroEngine,
  PongEngine,
  RacerEngine,
  checkCaroWin
} = GameEngine;

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

console.log('\n========================================================================');
console.log('   8-BIT ARCADE DUO - PHASE 2 (CORE GAMES, BOT AI & MOBILE INPUT) TESTS');
console.log('========================================================================\n');

// =========================================================================
// PHAN 1: INPUT CONTROLLER & CANVAS COORDINATE SCALING
// =========================================================================
console.log('\x1b[33m[SECTION 1] InputController & Canvas Coordinate Normalization...\x1b[0m');

test('MAP_P1_TO_P2 anh xa du 6 phim dieu khien W/S/A/D/Space/ShiftLeft', () => {
  assert.strictEqual(InputController.MAP_P1_TO_P2.KeyW, 'ArrowUp');
  assert.strictEqual(InputController.MAP_P1_TO_P2.KeyS, 'ArrowDown');
  assert.strictEqual(InputController.MAP_P1_TO_P2.KeyA, 'ArrowLeft');
  assert.strictEqual(InputController.MAP_P1_TO_P2.KeyD, 'ArrowRight');
  assert.strictEqual(InputController.MAP_P1_TO_P2.Space, 'Enter');
  assert.strictEqual(InputController.MAP_P1_TO_P2.ShiftLeft, 'ShiftRight');
});

test('clientToCanvasCoords chinh xac tren Desktop ty le 16:10 (khong letterbox)', () => {
  const mockCanvas = {
    width: 800,
    height: 500,
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 250 })
  };
  const center = InputController.clientToCanvasCoords(mockCanvas, 300, 175);
  assert.strictEqual(Math.round(center.x), 400);
  assert.strictEqual(Math.round(center.y), 250);
  assert.strictEqual(center.inBounds, true);
});

test('clientToCanvasCoords bu chinh xac letterbox object-contain tren Mobile aspect-[4/3]', () => {
  // Khung 4:3 (360 x 270) chua canvas 800x500 (ty le 16:10 => rendered 360 x 225, offsetY = 22.5)
  const mockCanvas = {
    width: 800,
    height: 500,
    getBoundingClientRect: () => ({ left: 15, top: 100, width: 360, height: 270 })
  };
  // Tam khung (15 + 180 = 195, 100 + 135 = 235) phai map dung (400, 250)
  const center = InputController.clientToCanvasCoords(mockCanvas, 195, 235);
  assert.strictEqual(Math.round(center.x), 400);
  assert.strictEqual(Math.round(center.y), 250);
  assert.strictEqual(center.inBounds, true);

  // Cham vao vien letterbox tren cung (y = 105 < 100 + 22.5) phai inBounds = false
  const topLetterbox = InputController.clientToCanvasCoords(mockCanvas, 195, 105);
  assert.strictEqual(topLetterbox.inBounds, false);
});

test('extractClientCoords ho tro ca TouchEvent (touches / changedTouches) va MouseEvent', () => {
  const fromTouches = InputController.extractClientCoords({ touches: [{ clientX: 50, clientY: 80 }] });
  assert.deepStrictEqual(fromTouches, { clientX: 50, clientY: 80 });

  const fromChanged = InputController.extractClientCoords({ changedTouches: [{ clientX: 12, clientY: 34 }] });
  assert.deepStrictEqual(fromChanged, { clientX: 12, clientY: 34 });

  const fromMouse = InputController.extractClientCoords({ clientX: 99, clientY: 101 });
  assert.deepStrictEqual(fromMouse, { clientX: 99, clientY: 101 });
});

// =========================================================================
// PHAN 2: STARFIGHTER 2P & BOT AI
// =========================================================================
console.log('\n\x1b[33m[SECTION 2] Game 1: StarFighter 2P Engine & Bot AI...\x1b[0m');

test('StarFighter: Di chuyen 2 chieu kep bien va cooldown dan dung 12 frames', () => {
  const st = StarFighterEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };

  // Ban vien dau tien
  StarFighterEngine.step(st, { Space: true, KeyA: true }, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(st.bullets.length, 1);
  assert.strictEqual(st.p1.cd, 12, 'Cooldown ban dan phai la 12 frames');
  assert.strictEqual(st.p1.x, 235);

  // 11 frame tiep theo khong ban them vien nao du giu Space
  for (let i = 0; i < 11; i++) {
    StarFighterEngine.step(st, { Space: true }, match, 'local_or_tab', () => 0.5);
  }
  assert.strictEqual(st.bullets.length, 1, 'Chua het cooldown 12 frames thi khong ban them');

  // Frame thu 12 ban them vien thu 2
  StarFighterEngine.step(st, { Space: true }, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(st.bullets.length, 2, 'Het 12 frames phai ban vien thu 2');
});

test('StarFighter: Dan trung quai cong +100 diem va sinh 10 hat particle 8-bit', () => {
  const st = StarFighterEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  st.enemies.push({ x: 250, y: 200, w: 32, h: 32, vy: 2 });
  st.bullets.push({ x: 260, y: 215, owner: 1, color: '#00F5D4', vy: -9 });

  const events = StarFighterEngine.step(st, {}, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(match.p1Score, 100);
  assert.strictEqual(st.enemies.length, 0);
  assert.strictEqual(st.bullets.length, 0);
  assert.strictEqual(st.particles.length, 10, 'Phai sinh 10 hat particle 8-bit');
  assert.ok(events.some(e => e.type === 'sfx' && e.sound === 'explosion'));
});

test('StarFighter: Quai lot qua day man hinh tru HP nguoi choi va kich hoat shake', () => {
  const st = StarFighterEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  // Quai lot nua san phai -> tru HP P2
  st.enemies.push({ x: 550, y: 499, w: 32, h: 32, vy: 3 });

  const events = StarFighterEngine.step(st, {}, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(match.p2Hp, 90, 'Lot quai nua san phai phai tru 10 HP P2');
  assert.ok(events.some(e => e.type === 'shake'));
});

test('StarFighter: Nut B (ShiftLeft) kich hoat Nitro va ban loat dan phu', () => {
  const st = StarFighterEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  StarFighterEngine.step(st, { ShiftLeft: true, KeyD: true }, match, 'local_or_tab', () => 0.5);
  assert.ok(st.p1.nitroTimer > 0);
  assert.strictEqual(st.bullets.length, 2, 'Nitro kich hoat phai ban 2 vien dan phu');
  assert.strictEqual(st.p1.x, 248, 'Toc do Nitro phai tang len 8px/frame');
});

test('StarFighter: Bot AI di chuyen hinh sin, xa dan chu ky va luon giu trong bien [20..744]', () => {
  const st = StarFighterEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  for (let i = 0; i < 120; i++) {
    StarFighterEngine.step(st, {}, match, 'bot', () => 0.5);
    assert.ok(st.p2.x >= 20 && st.p2.x <= 744, `Bot P2 x=${st.p2.x} vuot bien!`);
  }
  assert.ok(st.bullets.some(b => b.owner === 2), 'Bot phai tu dong xa dan');
});

// =========================================================================
// PHAN 3: BATTLE CITY TANK 2P & BOT AI
// =========================================================================
console.log('\n\x1b[33m[SECTION 3] Game 2: Battle City Tank 2P Engine & Bot AI...\x1b[0m');

test('Tank: Chan xe tang di xuyen tuong gach #B45309', () => {
  const st = TankEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  // Dat t1 ngay sat mep trai cum gach tai x=220, y=190
  st.t1.x = 188;
  st.t1.y = 200;
  TankEngine.step(st, { KeyD: true }, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(st.t1.x, 188, 'Xe tang khong duoc di xuyen tuong gach');
  assert.strictEqual(st.t1.dir, 'R');
});

test('Tank: Dan va cham tuong gach triet tieu dan VA pha huy o gach', () => {
  const st = TankEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  const initialBricks = st.blocks.length;
  const targetBrick = st.blocks[0];
  st.shells.push({ x: targetBrick.x - 2, y: targetBrick.y + 10, vx: 7, vy: 0, owner: 1 });

  TankEngine.step(st, {}, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(st.shells.length, 0, 'Dan trung tuong gach phai bi triet tieu');
  assert.strictEqual(st.blocks.length, initialBricks - 1, 'O gach trung dan phai bi pha huy');
});

test('Tank: Ban trung xe tang doi thu tru 25% HP, cong +250 diem va rung man hinh', () => {
  const st = TankEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  st.shells.push({ x: st.t2.x + 10, y: st.t2.y + 16, vx: 7, vy: 0, owner: 1 });

  const events = TankEngine.step(st, {}, match, 'local_or_tab', () => 0.5);
  assert.strictEqual(match.p2Hp, 75, 'Trung dan phai tru dung 25% HP');
  assert.strictEqual(match.p1Score, 250);
  assert.ok(events.some(e => e.type === 'shake'), 'Phai kich hoat shake-effect');
});

test('Tank: Bot AI tu dong tuan tra va xoay nong ngam ve phia P1 de ban', () => {
  const st = TankEngine.createState();
  const match = { p1Score: 0, p2Score: 0, p1Hp: 100, p2Hp: 100, timeLeft: 90 };
  // Dat P1 phia tren cung cot voi P2
  st.t1.x = 680;
  st.t1.y = 60;
  st.t2.x = 680;
  st.t2.y = 260;
  st.t2.cd = 0;

  TankEngine.step(st, {}, match, 'bot', () => 0.5);
  assert.strictEqual(st.t2.dir, 'U', 'Bot Tank phai xoay nong len (U) ngam ve phia P1');
  assert.ok(st.shells.some(s => s.owner === 2 && s.vy < 0), 'Bot Tank phai ban dan huong len phia P1');
});

// =========================================================================
// PHAN 4: CO CARO 15x15 (GOMOKU) & BOT AI
// =========================================================================
console.log('\n\x1b[33m[SECTION 4] Game 3: Co Caro 15x15, Double-Click Lock & Bot AI...\x1b[0m');

test('Caro: Chan danh dup (double-click lock / debounce) trong 180ms', () => {
  const st = CaroEngine.createState();
  const first = CaroEngine.applyMove(st, 7, 7, { now: 1000 });
  assert.strictEqual(first.ok, true);

  // Click lan 2 sau 50ms -> bi chan
  const rapid = CaroEngine.applyMove(st, 7, 8, { now: 1050 });
  assert.strictEqual(rapid.ok, false);
  assert.strictEqual(rapid.reason, 'DEBOUNCE_LOCKED');

  // Sau 250ms -> hop le
  const second = CaroEngine.applyMove(st, 7, 8, { now: 1250 });
  assert.strictEqual(second.ok, true);
});

test('Caro: checkCaroWin phat hien chinh xac 5 quan thang hang & tra ve winLine', () => {
  const st = CaroEngine.createState();
  for (let i = 0; i < 4; i++) {
    st.board[4 + i][4 + i] = 1;
  }
  const res = CaroEngine.applyMove(st, 8, 8, { now: 2000, expectedPlayer: 1 });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.win, true);
  assert.strictEqual(res.winLine.length, 5);
  assert.strictEqual(st.finished, true);
  assert.strictEqual(checkCaroWin(st.board, 8, 8, 1), true);
});

test('Caro: Bot AI danh vao vung lan can ban kinh 2 o xung quanh nuoc di P1', () => {
  const st = CaroEngine.createState();
  CaroEngine.applyMove(st, 3, 10, { now: 1000 }); // P1 danh tai (3, 10)
  const botMove = CaroEngine.pickBotMove(st, () => 0.4);
  assert.ok(botMove !== null);
  assert.ok(Math.abs(botMove.r - 3) <= 2 && Math.abs(botMove.c - 10) <= 2,
    `Bot danh (${botMove.r},${botMove.c}) nam ngoai ban kinh 2 o quanh (3,10)`);
  assert.strictEqual(st.board[botMove.r][botMove.c], 0);
});

test('Caro: Bot AI uu tien chan khi P1 da co 4 quan lien tiep', () => {
  const st = CaroEngine.createState();
  st.board[7][3] = 1;
  st.board[7][4] = 1;
  st.board[7][5] = 1;
  st.board[7][6] = 1;
  st.lastP1Move = { r: 7, c: 6 };
  st.turn = 2;

  const botMove = CaroEngine.pickBotMove(st, () => 0.5);
  assert.ok(
    (botMove.r === 7 && botMove.c === 2) || (botMove.r === 7 && botMove.c === 7),
    `Bot phai chan 1 trong 2 dau (7,2) hoac (7,7), nhung lai chon (${botMove.r},${botMove.c})`
  );
});

// =========================================================================
// PHAN 5: SNAPSHOT SERIALIZATION (CHUAN BI CHO SOCKET.IO PHASE 3)
// =========================================================================
console.log('\n\x1b[33m[SECTION 5] State Snapshot & Interpolation cho 4 Game Hanh Dong...\x1b[0m');

test('Snapshot & applySnapshot hoat dong cho StarFighter, Tank, Pong, Racer', () => {
  const match = { p1Score: 300, p2Score: 150, p1Hp: 75, p2Hp: 50, timeLeft: 65 };
  for (const [name, Engine] of [['starfighter', StarFighterEngine], ['tank', TankEngine], ['pong', PongEngine], ['racer', RacerEngine]]) {
    const hostState = Engine.createState();
    const guestState = Engine.createState();
    Engine.step(hostState, { KeyD: true, KeyW: true, Space: true }, match, 'local_or_tab', () => 0.5);
    const snap = Engine.getSnapshot(hostState, match);
    assert.strictEqual(snap.gameId, name);
    assert.strictEqual(snap.match.p1Score, match.p1Score);
    Engine.applySnapshot(guestState, snap);
    assert.ok(guestState.gameId === name);
  }
});

// =========================================================================
// TONG KET
// =========================================================================
const total = passed + failed;
console.log('\n========================================================================');
console.log(` TONG KET KIEM THU PHASE 2 (CORE GAMES, BOT AI & MOBILE INPUT):`);
console.log(`   Tong so tests:   ${total}`);
console.log(`   \x1b[32mThanh cong:      ${passed}\x1b[0m`);
console.log(`   ${failed === 0 ? '\x1b[32m' : '\x1b[31m'}That bai:        ${failed}\x1b[0m`);
console.log('========================================================================\n');

process.exit(failed > 0 ? 1 : 0);
