/**
 * 8-BIT ARCADE DUO - GUEST AUTHENTICATION MODULE (Client-Side)
 * Quản lý định danh khách (Guest Auth), lưu trữ localStorage và hồ sơ người chơi
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GuestAuth = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const STORAGE_KEY = 'arcade_user';
  const VALID_AVATARS = ['👾', '🤖', '🦊', '🐲', '🚀', '🥷'];
  const DEFAULT_AVATAR = '👾';
  const DEFAULT_NAME = 'Player_VN';

  /**
   * Làm sạch chuỗi tên người dùng (chống XSS & ký tự lạ)
   */
  function sanitizeName(name) {
    if (!name || typeof name !== 'string') return DEFAULT_NAME;
    // Bóc tách toàn bộ thẻ HTML trước, sau đó lọc ký tự hợp lệ
    const strippedHtml = name.replace(/<[^>]*>/g, '');
    const cleaned = strippedHtml
      .trim()
      .replace(/[<>'"]/g, '')
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 ]/g, '')
      .substring(0, 16);
    return cleaned.length >= 2 ? cleaned : DEFAULT_NAME;
  }

  /**
   * Tạo ngẫu nhiên ID người chơi định dạng: u_xxxxx
   */
  function generateGuestId() {
    return 'u_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Khởi tạo định danh khi vào web
   */
  function initGuestAuth() {
    let profile = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.name) {
          profile = {
            id: parsed.id,
            name: sanitizeName(parsed.name),
            avatar: VALID_AVATARS.includes(parsed.avatar) ? parsed.avatar : DEFAULT_AVATAR,
            score: parsed.score || 0,
            level: parsed.level || 1,
            createdAt: parsed.createdAt || Date.now()
          };
        }
      }
    } catch (err) {
      console.warn('[GuestAuth] Không thể đọc localStorage, dùng phiên tạm thời:', err);
    }

    if (!profile) {
      profile = {
        id: generateGuestId(),
        name: DEFAULT_NAME,
        avatar: DEFAULT_AVATAR,
        score: 0,
        level: 1,
        createdAt: Date.now()
      };
      saveToStorage(profile);
    }

    syncProfileToUI(profile);
    return profile;
  }

  /**
   * Lưu dữ liệu vào localStorage an toàn
   */
  function saveToStorage(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('[GuestAuth] Không thể ghi localStorage:', err);
    }
  }

  /**
   * Lấy thông tin hồ sơ hiện tại
   */
  function getProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {}
    return initGuestAuth();
  }

  /**
   * Cập nhật tên và avatar mới
   */
  function updateProfile(name, avatar) {
    const current = getProfile();
    const updated = {
      ...current,
      name: sanitizeName(name),
      avatar: VALID_AVATARS.includes(avatar) ? avatar : current.avatar,
      updatedAt: Date.now()
    };

    saveToStorage(updated);
    syncProfileToUI(updated);

    // Kích hoạt custom event cho các component khác lắng nghe
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arcade:profile_updated', { detail: updated }));
    }

    return updated;
  }

  /**
   * Đồng bộ dữ liệu profile lên giao diện Header và Modal
   */
  function syncProfileToUI(profile = getProfile()) {
    if (typeof document === 'undefined') return;

    // Header Display
    const nameEl = document.getElementById('player-name-display');
    const avatarEl = document.getElementById('player-avatar-display');
    if (nameEl) nameEl.textContent = profile.name;
    if (avatarEl) avatarEl.textContent = profile.avatar;

    // Modal Input & Avatar selector
    const inputEl = document.getElementById('input-player-name');
    if (inputEl) inputEl.value = profile.name;

    const avatarOpts = document.querySelectorAll('.avatar-opt');
    avatarOpts.forEach(btn => {
      const isSelected = btn.textContent.trim() === profile.avatar;
      btn.classList.toggle('border-arcade-cyan', isSelected);
      btn.classList.toggle('border-arcade-border', !isSelected);
    });
  }

  return {
    STORAGE_KEY,
    VALID_AVATARS,
    sanitizeName,
    generateGuestId,
    initGuestAuth,
    getProfile,
    updateProfile,
    syncProfileToUI
  };
});
