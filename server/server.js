/**
 * 8-BIT ARCADE DUO - BACKEND HTTP REST API SERVER
 * Sử dụng Node.js Built-in HTTP Engine (Zero External Dependencies)
 * - Quản lý REST API cho Room Management & Guest Sessions
 * - Phục vụ Static Files (8bit_arcade_duo.html, src, tests)
 * - Tự động hỗ trợ CORS đa nguồn
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { roomManager } = require('./roomManager');
const { attachSocketHub } = require('./socketHub');
const { createDatabase } = require('./database');
const { createMatchService } = require('./matchService');

const database = createDatabase();
const matchService = createMatchService(database);

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON Body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Nhuong hoan toan duong dan /socket.io/ cho Socket.io Engine xu ly
  if (req.url && req.url.startsWith('/socket.io/')) {
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // Set default CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // =========================================================================
    // REST API ENDPOINTS
    // =========================================================================

    // Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'UP',
        service: '8-Bit Arcade Duo API',
        uptime: process.uptime(),
        activeRooms: roomManager.count()
      });
    }

    // 1. POST /api/rooms - Tạo phòng mới
    if (pathname === '/api/rooms' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { gameId, mode, host } = body;

      if (!host || !host.id || !host.name) {
        return sendJson(res, 400, {
          success: false,
          message: 'Yêu cầu thông tin host ({ id, name }).'
        });
      }

      const room = roomManager.createRoom({ gameId, mode, host });
      return sendJson(res, 201, {
        success: true,
        message: 'Tạo phòng thành công!',
        room
      });
    }

    // 2. GET /api/rooms/public - Danh sách phòng công khai mở slot P2
    if (pathname === '/api/rooms/public' && method === 'GET') {
      const limit = Math.min(parseInt(parsedUrl.searchParams.get('limit'), 10) || 10, 50);
      const rooms = roomManager.getPublicRooms(limit);
      return sendJson(res, 200, {
        success: true,
        count: rooms.length,
        rooms
      });
    }

    // 3. POST /api/rooms/join - Tham gia phòng
    if (pathname === '/api/rooms/join' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { roomCode, guest } = body;

      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        return sendJson(res, 400, {
          success: false,
          message: 'Mã phòng phải có đúng 4 ký tự!'
        });
      }

      if (!guest || !guest.id || !guest.name) {
        return sendJson(res, 400, {
          success: false,
          message: 'Yêu cầu thông tin người chơi (guest: { id, name }).'
        });
      }

      const result = roomManager.joinRoom(roomCode, guest);
      return sendJson(res, result.status, result);
    }

    // 4. GET /api/rooms/:code - Chi tiết phòng
    const matchRoomCode = pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4})$/);
    if (matchRoomCode && method === 'GET') {
      const code = matchRoomCode[1];
      const room = roomManager.getRoom(code);
      if (!room) {
        return sendJson(res, 404, {
          success: false,
          message: `Phòng ${code.toUpperCase()} không tồn tại hoặc đã đóng!`
        });
      }
      return sendJson(res, 200, { success: true, room });
    }

    // 5. PATCH /api/rooms/:code/game - Đổi game hoặc mode
    const matchUpdateGame = pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4})\/game$/);
    if (matchUpdateGame && method === 'PATCH') {
      const code = matchUpdateGame[1];
      const body = await parseJsonBody(req);
      const result = roomManager.updateRoomGame(code, body);
      return sendJson(res, result.status, result);
    }

    // 6. POST /api/rooms/:code/leave - Rời phòng
    const matchLeave = pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4})\/leave$/);
    if (matchLeave && method === 'POST') {
      const code = matchLeave[1];
      const body = await parseJsonBody(req);
      if (!body.playerId) {
        return sendJson(res, 400, { success: false, message: 'Yêu cầu playerId.' });
      }
      const result = roomManager.leaveRoom(code, body.playerId);
      return sendJson(res, result.status, result);
    }

    // =========================================================================
    // PHASE 5 (MVP 5): LEADERBOARD & MATCH HISTORY REST API ENDPOINTS
    // =========================================================================

    // 7. GET /api/leaderboard?limit=10 - Top cao thu theo totalScore DESC
    if (pathname === '/api/leaderboard' && method === 'GET') {
      const limit = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('limit'), 10) || 10, 1), 50);
      const leaderboard = matchService.getLeaderboard(limit);
      return sendJson(res, 200, {
        success: true,
        count: leaderboard.length,
        leaderboard
      });
    }

    // 8. POST /api/matches/finish - Luu ket qua tran dau va cong diem thuong (+150/+30/+60)
    if (pathname === '/api/matches/finish' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body || !body.p1 || !body.p1.id || !body.p1.name) {
        return sendJson(res, 400, {
          success: false,
          message: 'Yêu cầu thông tin người chơi P1 ({ id, name }).'
        });
      }
      const result = matchService.finishMatch(body);
      return sendJson(res, 201, result);
    }

    // 9. GET /api/matches/recent?limit=10 - Lich su cac tran gan nhat
    if (pathname === '/api/matches/recent' && method === 'GET') {
      const limit = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('limit'), 10) || 10, 1), 50);
      const matches = matchService.getRecentMatches(limit);
      return sendJson(res, 200, {
        success: true,
        count: matches.length,
        matches
      });
    }

    // 10. GET /api/players/:id - Thong ke diem tich luy & Level nguoi choi
    const matchPlayer = pathname.match(/^\/api\/players\/([^/]+)$/);
    if (matchPlayer && method === 'GET') {
      const playerId = decodeURIComponent(matchPlayer[1]);
      const player = matchService.getPlayerStats(playerId);
      return sendJson(res, 200, { success: true, player });
    }

    // =========================================================================
    // STATIC FILE SERVER
    // =========================================================================
    let filePath = pathname === '/' ? '/8bit_arcade_duo.html' : pathname;
    const safePath = path.normalize(path.join(ROOT_DIR, filePath));

    // Security: Ngăn chặn Directory Traversal
    if (!safePath.startsWith(ROOT_DIR)) {
      return sendJson(res, 403, { success: false, message: 'Forbidden' });
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        return sendJson(res, 404, {
          success: false,
          message: `Endpoint hoặc file không tồn tại: ${pathname}`
        });
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(safePath).pipe(res);
    });

  } catch (serverErr) {
    return sendJson(res, 500, {
      success: false,
      message: serverErr.message || 'Lỗi xử lý máy chủ'
    });
  }
});

// MatchService hook (gan mac dinh tu Giai doan 5)
let activeMatchService = matchService;
function setMatchService(service) {
  activeMatchService = service;
}

// Gan Socket.io Hub (Phase 3 & 4) len chinh HTTP Server nay
const socketHub = attachSocketHub(server, {
  roomManager,
  getMatchService: () => activeMatchService
});

// Chạy dọn phòng quá hạn mỗi 5 phút (unref để không block event loop khi test)
const cleanupTimer = setInterval(() => {
  const cleaned = roomManager.cleanupExpiredRooms();
  if (cleaned > 0) {
    console.log(`[Auto-Clean] Đã dọn dẹp ${cleaned} phòng không hoạt động.`);
  }
}, 300000);
if (cleanupTimer.unref) cleanupTimer.unref();

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return null;
}

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      const lanIp = getLanIp();
      console.log(`🕹️ 8-Bit Arcade Duo Server (HTTP + Socket.io + SQLite) đã sẵn sàng:`);
      console.log(`   - Local (PC):      http://localhost:${port}`);
      if (lanIp) {
        console.log(`   - Network (Phone): http://${lanIp}:${port}`);
      }
      resolve(server);
    });
  });
}

async function stopServer() {
  if (socketHub && typeof socketHub.close === 'function') {
    await socketHub.close();
  }
  if (database && typeof database.close === 'function') {
    database.close();
  }
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}

// Nếu chạy trực tiếp từ command line
if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  socketHub,
  database,
  matchService,
  setMatchService,
  startServer,
  stopServer
};
