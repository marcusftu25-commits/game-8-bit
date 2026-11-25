/**
 * 8-BIT ARCADE DUO - INPUT CONTROLLER & MOBILE RESPONSIVE ENGINE
 * Giai doan 2 (MVP 4 Phan 1):
 * - Virtual D-Pad & Action Buttons (touchstart, touchend, touchcancel voi { passive: false })
 * - Multi-touch tracking (khong ket phim khi keo ngon tay hoac bi ngat)
 * - Scroll Lock khi vao view-game (overflow: hidden, touch-action: none)
 * - Chuan hoa toa do cham/click Canvas co bu letterbox object-contain (800x500)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.InputController = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAP_P1_TO_P2 = {
    KeyW: 'ArrowUp',
    KeyS: 'ArrowDown',
    KeyA: 'ArrowLeft',
    KeyD: 'ArrowRight',
    Space: 'Enter',
    ShiftLeft: 'ShiftRight'
  };

  const PREVENT_SCROLL_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'
  ]);

  /**
   * Trich xuat toa do clientX/clientY tu MouseEvent hoac TouchEvent
   */
  function extractClientCoords(event) {
    if (!event) return null;
    if (event.touches && event.touches.length > 0) {
      return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY };
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return { clientX: event.changedTouches[0].clientX, clientY: event.changedTouches[0].clientY };
    }
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      return { clientX: event.clientX, clientY: event.clientY };
    }
    return null;
  }

  /**
   * Chuan hoa toa do click/touch tu man hinh sang toa do logic Canvas (800x500)
   * Tu dong bu khoang letterbox khi canvas dung CSS object-contain (VD: aspect-[4/3] tren mobile)
   */
  function clientToCanvasCoords(canvas, clientX, clientY, options) {
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
      return { x: 0, y: 0, inBounds: false };
    }
    const rect = canvas.getBoundingClientRect();
    const logicalW = canvas.width || 800;
    const logicalH = canvas.height || 500;

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { x: 0, y: 0, inBounds: false };
    }

    const useContain = !(options && options.objectContain === false);
    let renderedW = rect.width;
    let renderedH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (useContain) {
      const canvasAspect = logicalW / logicalH;
      const rectAspect = rect.width / rect.height;
      if (rectAspect > canvasAspect) {
        // Letterbox trai/phai
        renderedH = rect.height;
        renderedW = rect.height * canvasAspect;
        offsetX = (rect.width - renderedW) / 2;
      } else if (rectAspect < canvasAspect) {
        // Letterbox tren/duoi (thuong gap voi aspect-[4/3] tren mobile)
        renderedW = rect.width;
        renderedH = rect.width / canvasAspect;
        offsetY = (rect.height - renderedH) / 2;
      }
    }

    const scaleX = logicalW / renderedW;
    const scaleY = logicalH / renderedH;
    const x = (clientX - (rect.left + offsetX)) * scaleX;
    const y = (clientY - (rect.top + offsetY)) * scaleY;
    const inBounds = x >= 0 && x <= logicalW && y >= 0 && y <= logicalH;

    return { x, y, inBounds, scaleX, scaleY, offsetX, offsetY };
  }

  /**
   * Khoa / Mo cuon trang khi choi game tren mobile
   */
  function setGameScrollLock(locked) {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const viewGame = document.getElementById('view-game');
    if (body) {
      body.classList.toggle('overflow-hidden', !!locked);
      body.classList.toggle('touch-none', !!locked);
      body.style.overflow = locked ? 'hidden' : '';
      body.style.touchAction = locked ? 'none' : '';
    }
    if (viewGame) {
      viewGame.classList.toggle('touch-none', !!locked);
      viewGame.style.touchAction = locked ? 'none' : '';
    }
  }

  /**
   * Kiem tra thiet bi di dong / man hinh nho
   */
  function isMobileOrTouchDevice() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  /**
   * Tao bo dieu khien thong nhat cho Keyboard + Virtual D-Pad Touch
   */
  function createController({ keysPressed, getRole, getCurrentView, onP2Input }) {
    const activeTouches = new Map(); // touchId -> { code, btn }
    let seq = 0;

    function emitIfP2(code, isDown) {
      if (typeof getRole !== 'function' || typeof getCurrentView !== 'function') return;
      if (getRole() !== 'P2' || getCurrentView() !== 'game') return;
      const mappedKey = MAP_P1_TO_P2[code];
      if (mappedKey && typeof onP2Input === 'function') {
        seq++;
        onP2Input({
          type: 'INPUT',
          key: code,
          mappedKey,
          isDown: !!isDown,
          seq,
          timestamp: Date.now()
        });
      }
    }

    function pressKey(code, btn) {
      const wasDown = !!keysPressed[code];
      keysPressed[code] = true;
      if (btn) {
        btn.classList.add('scale-95', 'ring-2', 'ring-arcade-cyan');
      }
      if (!wasDown) {
        emitIfP2(code, true);
      }
    }

    function releaseKey(code, btn) {
      const wasDown = !!keysPressed[code];
      delete keysPressed[code];
      if (btn) {
        btn.classList.remove('scale-95', 'ring-2', 'ring-arcade-cyan');
      }
      if (wasDown) {
        emitIfP2(code, false);
      }
    }

    function clearAllKeys() {
      const codes = Object.keys(keysPressed);
      codes.forEach(code => releaseKey(code, null));
      activeTouches.forEach(({ btn }) => {
        if (btn) btn.classList.remove('scale-95', 'ring-2', 'ring-arcade-cyan');
      });
      activeTouches.clear();
    }

    function attach() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      // Keyboard events
      window.addEventListener('keydown', (e) => {
        if (PREVENT_SCROLL_KEYS.has(e.code) && getCurrentView() === 'game') {
          e.preventDefault();
        }
        pressKey(e.code, null);
      });

      window.addEventListener('keyup', (e) => {
        releaseKey(e.code, null);
      });

      window.addEventListener('blur', clearAllKeys);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearAllKeys();
      });

      // Touch D-Pad & Action Buttons (ho tro da diem + touchcancel + synthetic CustomEvent trong test)
      document.querySelectorAll('.touch-btn').forEach(btn => {
        const code = btn.dataset.key;
        if (!code) return;

        btn.addEventListener('touchstart', (e) => {
          if (e.cancelable) e.preventDefault();
          if (e.changedTouches && e.changedTouches.length > 0) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              activeTouches.set(e.changedTouches[i].identifier, { code, btn });
            }
          }
          pressKey(code, btn);
        }, { passive: false });

        const handleTouchRelease = (e) => {
          if (e.cancelable) e.preventDefault();
          if (e.changedTouches && e.changedTouches.length > 0) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              activeTouches.delete(e.changedTouches[i].identifier);
            }
          }
          // Chi nha phim neu khong con ngon tay nao giu nut nay
          let stillHeld = false;
          for (const entry of activeTouches.values()) {
            if (entry.code === code) {
              stillHeld = true;
              break;
            }
          }
          if (!stillHeld) {
            releaseKey(code, btn);
          }
        };

        btn.addEventListener('touchend', handleTouchRelease, { passive: false });
        btn.addEventListener('touchcancel', handleTouchRelease, { passive: false });

        // Ho tro mouse click/hold de test tren desktop dev tools
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pressKey(code, btn);
        });
        btn.addEventListener('mouseup', () => releaseKey(code, btn));
        btn.addEventListener('mouseleave', () => {
          if (keysPressed[code]) releaseKey(code, btn);
        });
      });
    }

    return {
      attach,
      pressKey,
      releaseKey,
      clearAllKeys
    };
  }

  return {
    MAP_P1_TO_P2,
    extractClientCoords,
    clientToCanvasCoords,
    setGameScrollLock,
    isMobileOrTouchDevice,
    createController
  };
});
