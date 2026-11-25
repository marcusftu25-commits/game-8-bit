/**
 * 8-BIT ARCADE DUO - CLIENT LEADERBOARD & MATCH STATS UI (Phase 5 - MVP 5)
 * - Goi GET /api/leaderboard?limit=10 de do du lieu that vao #modal-leaderboard
 * - Goi POST /api/matches/finish khi ket thuc tran (Che do 1 nguoi / Local)
 * - Cap nhat diem tich luy & Level thuc te tren Header Badge
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LeaderboardUI = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:3000';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function apiJson(endpoint, options = {}) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(tid);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(tid);
      return { ok: false, status: 0, isOffline: true, error: err.message };
    }
  }

  async function fetchLeaderboard(limit = 10) {
    const res = await apiJson(`/api/leaderboard?limit=${limit}`);
    if (res.ok && res.data && Array.isArray(res.data.leaderboard)) {
      return { ok: true, leaderboard: res.data.leaderboard };
    }
    return { ok: false, leaderboard: [] };
  }

  async function submitMatchFinish(payload) {
    const res = await apiJson('/api/matches/finish', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok && res.data && res.data.success) {
      return res.data;
    }
    return null;
  }

  async function fetchPlayerStats(playerId) {
    if (!playerId) return null;
    const res = await apiJson(`/api/players/${encodeURIComponent(playerId)}`);
    if (res.ok && res.data && res.data.player) {
      return res.data.player;
    }
    return null;
  }

  function updateHeaderStats(totalScore, level) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('player-stats-display');
    if (!el) return;
    const scoreStr = Number(totalScore || 0).toLocaleString('en-US');
    const lv = level || Math.max(1, Math.floor((Number(totalScore) || 0) / 150) + 1);
    el.textContent = `LV.${lv} • ${scoreStr} Đ`;
  }

  async function renderLeaderboard(currentPlayerId = null, limit = 10) {
    if (typeof document === 'undefined') return [];
    const container = document.getElementById('leaderboard-list');
    if (!container) return [];

    container.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400 font-mono">
        Đang tải bảng xếp hạng...
      </div>
    `;

    const { ok, leaderboard } = await fetchLeaderboard(limit);

    if (!ok) {
      container.innerHTML = `
        <div class="p-4 text-center text-xs text-slate-400">
          Không thể kết nối máy chủ Bảng Xếp Hạng (chế độ Offline).
        </div>
      `;
      return [];
    }

    if (leaderboard.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Chưa có cao thủ nào ghi danh. Hãy chơi ngay trận đầu tiên để lên TOP 1! 🏆
        </div>
      `;
      return [];
    }

    container.innerHTML = leaderboard.map((row) => {
      const isMe = currentPlayerId && row.id === currentPlayerId;
      const rankColor = row.rank === 1
        ? 'text-arcade-yellow'
        : row.rank === 2
          ? 'text-slate-200'
          : row.rank === 3
            ? 'text-amber-500'
            : 'text-slate-400';
      const rowBg = row.rank === 1
        ? 'bg-arcade-yellow/10'
        : isMe
          ? 'bg-arcade-cyan/10'
          : '';

      return `
        <div class="leaderboard-row flex items-center justify-between p-3 ${rowBg}" data-player-id="${escapeHtml(row.id)}">
          <div class="flex items-center gap-3 min-w-0">
            <span class="font-mono font-bold w-7 ${rankColor}">#${row.rank}</span>
            <span class="text-xl shrink-0">${escapeHtml(row.avatar)}</span>
            <div class="min-w-0">
              <div class="font-bold text-white truncate flex items-center gap-1.5">
                <span>${escapeHtml(row.name)}</span>
                ${isMe ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-arcade-cyan/20 text-arcade-cyan font-mono">BẠN</span>' : ''}
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                Thắng ${row.wins}/${row.matchesPlayed} trận • LV.${row.level}
              </div>
            </div>
          </div>
          <span class="font-mono font-bold text-arcade-cyan tabular-nums shrink-0">
            ${Number(row.totalScore).toLocaleString('en-US')} Đ
          </span>
        </div>
      `;
    }).join('');

    return leaderboard;
  }

  return {
    fetchLeaderboard,
    submitMatchFinish,
    fetchPlayerStats,
    updateHeaderStats,
    renderLeaderboard
  };
});
