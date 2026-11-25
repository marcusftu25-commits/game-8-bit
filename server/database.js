/**
 * 8-BIT ARCADE DUO - SQLITE DATABASE LAYER (Phase 5 - MVP 5)
 * Su dung SQLite native tich hop san trong Node.js (node:sqlite - DatabaseSync)
 * - Khong can bien dich native C++ addon hay cai Prisma binary
 * - Ho tro ca file luu tru vinh vien (server/data/arcade.db) va ':memory:' cho Unit/Integration Tests
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'arcade.db');

function createDatabase(customPath) {
  const dbPath = customPath || process.env.DB_PATH || DEFAULT_DB_PATH;

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Khoi tao Schema chuan theo ERD trong PLAN_8BIT_ARCADE.md
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '👾',
      totalScore INTEGER NOT NULL DEFAULT 0,
      matchesPlayed INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_history (
      id TEXT PRIMARY KEY,
      roomCode TEXT NOT NULL,
      gameId TEXT NOT NULL,
      p1Id TEXT NOT NULL,
      p2Id TEXT NOT NULL,
      p1Score INTEGER NOT NULL,
      p2Score INTEGER NOT NULL,
      winnerId TEXT,
      durationSec INTEGER NOT NULL DEFAULT 0,
      playedAt TEXT NOT NULL,
      FOREIGN KEY (p1Id) REFERENCES players(id),
      FOREIGN KEY (p2Id) REFERENCES players(id)
    );

    CREATE INDEX IF NOT EXISTS idx_players_score
      ON players (totalScore DESC, wins DESC);

    CREATE INDEX IF NOT EXISTS idx_matches_played_at
      ON match_history (playedAt DESC);
  `);

  function close() {
    try {
      db.close();
    } catch (err) {
      // Ignore if already closed
    }
  }

  return {
    db,
    dbPath,
    close
  };
}

module.exports = {
  DEFAULT_DB_PATH,
  createDatabase
};
