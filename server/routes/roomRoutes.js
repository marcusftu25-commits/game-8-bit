/**
 * 8-BIT ARCADE DUO - ROOM REST API ROUTES
 * Quản lý các endpoint REST:
 * - POST  /api/rooms        : Tạo phòng mới
 * - GET   /api/rooms/public : Lấy danh sách các phòng công khai đang trống 1 chỗ
 * - POST  /api/rooms/join   : Tham gia phòng bằng mã 4 ký tự
 * - GET   /api/rooms/:code  : Lấy chi tiết trạng thái phòng
 * - PATCH /api/rooms/:code/game : Đổi trò chơi hoặc chế độ
 * - POST  /api/rooms/:code/leave: Rời phòng
 */

const express = require('express');
const { roomManager } = require('../roomManager');

const router = express.Router();

/**
 * POST /api/rooms - Tạo phòng mới
 */
router.post('/rooms', (req, res) => {
  try {
    const { gameId, mode, host } = req.body || {};

    if (!host || !host.id || !host.name) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: Yêu cầu thông tin host (id, name).'
      });
    }

    const room = roomManager.createRoom({ gameId, mode, host });
    return res.status(201).json({
      success: true,
      message: 'Tạo phòng thành công!',
      room
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi tạo phòng.'
    });
  }
});

/**
 * GET /api/rooms/public - Danh sách phòng mở chờ P2
 */
router.get('/rooms/public', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const rooms = roomManager.getPublicRooms(limit);
    return res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách phòng.'
    });
  }
});

/**
 * POST /api/rooms/join - Khách (P2) vào phòng
 */
router.post('/rooms/join', (req, res) => {
  try {
    const { roomCode, guest } = req.body || {};

    if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Mã phòng phải có đúng 4 ký tự!'
      });
    }

    if (!guest || !guest.id || !guest.name) {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu thông tin người chơi (guest: { id, name }).'
      });
    }

    const result = roomManager.joinRoom(roomCode, guest);
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tham gia phòng.'
    });
  }
});

/**
 * GET /api/rooms/:code - Chi tiết phòng
 */
router.get('/rooms/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: `Phòng ${req.params.code.toUpperCase()} không tồn tại.`
    });
  }
  return res.json({ success: true, room });
});

/**
 * PATCH /api/rooms/:code/game - Đổi trò chơi / chế độ
 */
router.patch('/rooms/:code/game', (req, res) => {
  const { gameId, mode, requesterId } = req.body || {};
  const result = roomManager.updateRoomGame(req.params.code, { gameId, mode, requesterId });
  return res.status(result.status).json(result);
});

/**
 * POST /api/rooms/:code/leave - Rời phòng
 */
router.post('/rooms/:code/leave', (req, res) => {
  const { playerId } = req.body || {};
  if (!playerId) {
    return res.status(400).json({ success: false, message: 'Yêu cầu playerId.' });
  }
  const result = roomManager.leaveRoom(req.params.code, playerId);
  return res.status(result.status).json(result);
});

module.exports = router;
