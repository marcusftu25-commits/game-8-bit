/**
 * 8-BIT ARCADE DUO - MATCH HISTORY & LEADERBOARD SERVICE (Phase 5 - MVP 5)
 * Quy tac cong diem thuong sau moi tran dau:
 * - Nguoi thang: +150 diem, +1 wins, +1 matchesPlayed
 * - Nguoi thua:  +30 diem,  +0 wins, +1 matchesPlayed
 * - Tran hoa:    +60 diem moi ben, +1 matchesPlayed
 * Dam bao giao dich nguyen tu (SQLite Transaction) & chong ghi trung (Idempotency theo matchId).
 */

const REWARD_WIN = 150;
const REWARD_LOSS = 30;
const REWARD_DRAW = 60;
const BOT_PLAYER_ID = 'bot_ai';

function computeLevel(totalScore) {
  return Math.max(1, Math.floor((Number(totalScore) || 0) / 150) + 1);
}

function createMatchService(database) {
  const { db } = database;

  const stmtUpsertPlayer = db.prepare(`
    INSERT INTO players (id, name, avatar, totalScore, matchesPlayed, wins, updatedAt)
    VALUES (?, ?, ?, 0, 0, 0, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      avatar = excluded.avatar,
      updatedAt = excluded.updatedAt
  `);

  const stmtAddStats = db.prepare(`
    UPDATE players
    SET totalScore = totalScore + ?,
        matchesPlayed = matchesPlayed + 1,
        wins = wins + ?,
        updatedAt = ?
    WHERE id = ?
  `);

  const stmtFindMatch = db.prepare('SELECT * FROM match_history WHERE id = ?');

  const stmtInsertMatch = db.prepare(`
    INSERT INTO match_history (id, roomCode, gameId, p1Id, p2Id, p1Score, p2Score, winnerId, durationSec, playedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stmtGetPlayer = db.prepare('SELECT * FROM players WHERE id = ?');

  const stmtGetLeaderboard = db.prepare(`
    SELECT id, name, avatar, totalScore, matchesPlayed, wins, updatedAt
    FROM players
    WHERE id != ?
    ORDER BY totalScore DESC, wins DESC, updatedAt ASC
    LIMIT ?
  `);

  const stmtGetRecentMatches = db.prepare(`
    SELECT m.*,
           p1.name AS p1Name, p1.avatar AS p1Avatar,
           p2.name AS p2Name, p2.avatar AS p2Avatar
    FROM match_history m
    LEFT JOIN players p1 ON m.p1Id = p1.id
    LEFT JOIN players p2 ON m.p2Id = p2.id
    ORDER BY m.playedAt DESC
    LIMIT ?
  `);

  function upsertPlayer(player) {
    if (!player || !player.id || !player.name) {
      throw new Error('Thong tin nguoi choi (id, name) khong hop le.');
    }
    const now = new Date().toISOString();
    stmtUpsertPlayer.run(
      String(player.id),
      String(player.name).substring(0, 24),
      String(player.avatar || '👾'),
      now
    );
    return stmtGetPlayer.get(String(player.id));
  }

  function finishMatch(payload = {}) {
    const {
      matchId,
      roomCode = 'LOCL',
      gameId = 'starfighter',
      p1,
      p2,
      p1Score = 0,
      p2Score = 0,
      winnerId = null,
      durationSec = 0
    } = payload;

    if (!p1 || !p1.id || !p1.name) {
      throw new Error('Yeu cau thong tin nguoi choi P1 ({ id, name }).');
    }

    const effectiveP2 = (p2 && p2.id && p2.name)
      ? p2
      : { id: BOT_PLAYER_ID, name: 'Bot AI Siêu Cấp', avatar: '🤖' };

    const id = matchId || `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Idempotency guard: neu matchId da duoc ghi truoc do -> khong cong diem trung
    const existing = stmtFindMatch.get(id);
    if (existing) {
      const p1Row = stmtGetPlayer.get(existing.p1Id);
      const p2Row = stmtGetPlayer.get(existing.p2Id);
      return {
        success: true,
        duplicate: true,
        match: existing,
        rewards: {
          p1Delta: 0,
          p2Delta: 0,
          p1TotalScore: p1Row ? p1Row.totalScore : 0,
          p2TotalScore: p2Row ? p2Row.totalScore : 0
        }
      };
    }

    let p1Delta = REWARD_DRAW;
    let p2Delta = REWARD_DRAW;
    let p1Win = 0;
    let p2Win = 0;
    let normalizedWinnerId = winnerId ? String(winnerId) : null;

    if (normalizedWinnerId === String(p1.id)) {
      p1Delta = REWARD_WIN;
      p2Delta = REWARD_LOSS;
      p1Win = 1;
    } else if (normalizedWinnerId === String(effectiveP2.id)) {
      p1Delta = REWARD_LOSS;
      p2Delta = REWARD_WIN;
      p2Win = 1;
    } else {
      normalizedWinnerId = null;
      p1Delta = REWARD_DRAW;
      p2Delta = REWARD_DRAW;
    }

    const now = new Date().toISOString();

    db.exec('BEGIN');
    try {
      stmtUpsertPlayer.run(String(p1.id), String(p1.name).substring(0, 24), String(p1.avatar || '👾'), now);
      if (String(effectiveP2.id) !== String(p1.id)) {
        stmtUpsertPlayer.run(String(effectiveP2.id), String(effectiveP2.name).substring(0, 24), String(effectiveP2.avatar || '🤖'), now);
      }

      stmtAddStats.run(p1Delta, p1Win, now, String(p1.id));
      if (String(effectiveP2.id) !== String(p1.id)) {
        stmtAddStats.run(p2Delta, p2Win, now, String(effectiveP2.id));
      }

      stmtInsertMatch.run(
        id,
        String(roomCode).toUpperCase().substring(0, 8),
        String(gameId),
        String(p1.id),
        String(effectiveP2.id),
        Math.max(0, parseInt(p1Score, 10) || 0),
        Math.max(0, parseInt(p2Score, 10) || 0),
        normalizedWinnerId,
        Math.max(0, parseInt(durationSec, 10) || 0),
        now
      );

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const savedMatch = stmtFindMatch.get(id);
    const p1Updated = stmtGetPlayer.get(String(p1.id));
    const p2Updated = stmtGetPlayer.get(String(effectiveP2.id));

    return {
      success: true,
      duplicate: false,
      match: savedMatch,
      rewards: {
        p1Delta,
        p2Delta,
        p1TotalScore: p1Updated ? p1Updated.totalScore : 0,
        p1Level: computeLevel(p1Updated ? p1Updated.totalScore : 0),
        p2TotalScore: p2Updated ? p2Updated.totalScore : 0,
        p2Level: computeLevel(p2Updated ? p2Updated.totalScore : 0)
      }
    };
  }

  function getLeaderboard(limit = 10) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const rows = stmtGetLeaderboard.all(BOT_PLAYER_ID, safeLimit);
    return rows.map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      totalScore: row.totalScore,
      matchesPlayed: row.matchesPlayed,
      wins: row.wins,
      level: computeLevel(row.totalScore),
      updatedAt: row.updatedAt
    }));
  }

  function getPlayerStats(playerId) {
    if (!playerId) return null;
    const row = stmtGetPlayer.get(String(playerId));
    if (!row) {
      return {
        id: String(playerId),
        totalScore: 0,
        matchesPlayed: 0,
        wins: 0,
        level: 1
      };
    }
    return {
      ...row,
      level: computeLevel(row.totalScore)
    };
  }

  function getRecentMatches(limit = 10) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    return stmtGetRecentMatches.all(safeLimit);
  }

  return {
    REWARD_WIN,
    REWARD_LOSS,
    REWARD_DRAW,
    BOT_PLAYER_ID,
    computeLevel,
    upsertPlayer,
    finishMatch,
    getLeaderboard,
    getPlayerStats,
    getRecentMatches
  };
}

module.exports = {
  REWARD_WIN,
  REWARD_LOSS,
  REWARD_DRAW,
  BOT_PLAYER_ID,
  computeLevel,
  createMatchService
};
