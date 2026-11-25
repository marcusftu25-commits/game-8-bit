/**
 * 8-BIT ARCADE DUO - CORE GAME ENGINES & BOT AI (UMD Module)
 * Giai doan 2 (MVP 3):
 * - Game 1: StarFighter 2P (Di chuyen 2 chieu, cooldown 12 frames, wave quai, particle 8-bit, lot quai tru HP, Nitro nut B, Bot AI)
 * - Game 2: Battle City Tank 2P (4 huong, chan tuong gach #B45309, pha gach, trung tang -25% HP + shake, Bot AI tuan tra & ngam P1)
 * - Game 3: Gomoku / Co Caro 15x15 (checkCaroWin 5 quan, double-click lock, Bot AI ban kinh 2 o quanh P1)
 * - Game 4 & 5: Cyber Pong 2P & Neon Pixel Racers 2P (giu tuong thich day du)
 * Ho tro serialize/applySnapshot de dong bo Host-Authoritative qua Socket.io (Giai doan 3).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // =========================================================================
  // GAME 1: STARFIGHTER 2P (BAN TAU BAY DOI)
  // =========================================================================
  const StarFighterEngine = {
    FIRE_COOLDOWN: 12,
    NITRO_DURATION: 36,
    NITRO_COOLDOWN: 120,
    SHIP_W: 36,
    SHIP_H: 36,

    createState() {
      return {
        gameId: 'starfighter',
        frame: 0,
        wave: 1,
        p1: { x: 240, y: 420, w: 36, h: 36, cd: 0, nitroTimer: 0, nitroCd: 0, color: '#00F5D4' },
        p2: { x: 520, y: 420, w: 36, h: 36, cd: 0, nitroTimer: 0, nitroCd: 0, color: '#FF2A85' },
        bullets: [],
        enemies: [],
        particles: [],
        stars: Array.from({ length: 45 }, (_, idx) => ({
          x: (idx * 73) % CANVAS_WIDTH,
          y: (idx * 47) % CANVAS_HEIGHT,
          s: (idx % 3) + 1,
          v: 0.6 + (idx % 4) * 0.4
        }))
      };
    },

    step(state, keys, match, mode, rng = Math.random) {
      const events = [];
      state.frame++;
      state.wave = 1 + Math.floor(state.frame / 600);

      const { p1, p2 } = state;

      // P1 Nitro (Nut B / ShiftLeft)
      if (p1.nitroCd > 0) p1.nitroCd--;
      if (p1.nitroTimer > 0) p1.nitroTimer--;
      if (keys['ShiftLeft'] && p1.nitroCd === 0) {
        p1.nitroTimer = this.NITRO_DURATION;
        p1.nitroCd = this.NITRO_COOLDOWN;
        // Ban loat 2 vien phu khi kich hoat Nitro
        state.bullets.push({ x: p1.x + 6, y: p1.y - 6, owner: 1, color: '#FEE440', vy: -11 });
        state.bullets.push({ x: p1.x + 26, y: p1.y - 6, owner: 1, color: '#FEE440', vy: -11 });
        events.push({ type: 'sfx', sound: 'powerup' });
      }

      const p1Speed = p1.nitroTimer > 0 ? 8 : 5;
      if (keys['KeyA']) p1.x = clamp(p1.x - p1Speed, 20, 744);
      if (keys['KeyD']) p1.x = clamp(p1.x + p1Speed, 20, 744);
      if (keys['KeyW']) p1.y = clamp(p1.y - p1Speed, 50, 445);
      if (keys['KeyS']) p1.y = clamp(p1.y + p1Speed, 50, 445);

      if (p1.cd > 0) p1.cd--;
      if (keys['Space'] && p1.cd === 0) {
        state.bullets.push({ x: p1.x + 16, y: p1.y - 8, owner: 1, color: '#00F5D4', vy: -9 });
        p1.cd = this.FIRE_COOLDOWN;
        events.push({ type: 'sfx', sound: 'laser' });
      }

      // P2 Controls or Smart Bot AI
      if (p2.nitroCd > 0) p2.nitroCd--;
      if (p2.nitroTimer > 0) p2.nitroTimer--;

      if (mode === 'bot') {
        // Bot AI: Lang tranh theo ham sin co kep bien + huong nhe ve quai ben phai + xa dan theo chu ky
        const sineDrift = Math.sin(state.frame / 22) * 3.8;
        let targetX = p2.x + sineDrift;
        const rightEnemy = state.enemies.find(e => e.x >= 350 && e.y > 0 && e.y < 380);
        if (rightEnemy) {
          const diff = (rightEnemy.x + 16) - (p2.x + 18);
          targetX += clamp(diff * 0.08, -3, 3);
        }
        p2.x = clamp(targetX, 20, 744);
        p2.y = clamp(410 + Math.cos(state.frame / 30) * 18, 300, 445);

        if (p2.cd > 0) p2.cd--;
        if (p2.cd === 0) {
          state.bullets.push({ x: p2.x + 16, y: p2.y - 8, owner: 2, color: '#FF2A85', vy: -9 });
          p2.cd = 18;
        }
      } else {
        if (keys['ShiftRight'] && p2.nitroCd === 0) {
          p2.nitroTimer = this.NITRO_DURATION;
          p2.nitroCd = this.NITRO_COOLDOWN;
          state.bullets.push({ x: p2.x + 6, y: p2.y - 6, owner: 2, color: '#FEE440', vy: -11 });
          state.bullets.push({ x: p2.x + 26, y: p2.y - 6, owner: 2, color: '#FEE440', vy: -11 });
          events.push({ type: 'sfx', sound: 'powerup' });
        }
        const p2Speed = p2.nitroTimer > 0 ? 8 : 5;
        if (keys['ArrowLeft']) p2.x = clamp(p2.x - p2Speed, 20, 744);
        if (keys['ArrowRight']) p2.x = clamp(p2.x + p2Speed, 20, 744);
        if (keys['ArrowUp']) p2.y = clamp(p2.y - p2Speed, 50, 445);
        if (keys['ArrowDown']) p2.y = clamp(p2.y + p2Speed, 50, 445);

        if (p2.cd > 0) p2.cd--;
        if (keys['Enter'] && p2.cd === 0) {
          state.bullets.push({ x: p2.x + 16, y: p2.y - 8, owner: 2, color: '#FF2A85', vy: -9 });
          p2.cd = this.FIRE_COOLDOWN;
          events.push({ type: 'sfx', sound: 'laser' });
        }
      }

      // Spawn enemies theo wave
      const spawnEvery = Math.max(22, 42 - (state.wave - 1) * 4);
      if (state.frame % spawnEvery === 0) {
        const speedBonus = Math.min(2.5, (state.wave - 1) * 0.4);
        state.enemies.push({
          x: rng() * 720 + 20,
          y: -30,
          w: 32,
          h: 32,
          vy: rng() * 1.8 + 2 + speedBonus
        });
      }

      // Update Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.y += b.vy || -9;
        if (b.y < -20) {
          state.bullets.splice(i, 1);
        }
      }

      // Update Enemies & Collisions (duyet nguoc an toan, khong bo sot phan tu)
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const en = state.enemies[ei];
        en.y += en.vy;

        let destroyed = false;

        // Kiem tra dan ban trung quai
        for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
          const b = state.bullets[bi];
          if (aabbOverlap(b.x, b.y, 4, 14, en.x, en.y, en.w, en.h)) {
            state.bullets.splice(bi, 1);
            destroyed = true;
            if (b.owner === 1) match.p1Score += 100;
            else match.p2Score += 100;
            events.push({ type: 'hud' });
            events.push({ type: 'sfx', sound: 'explosion' });
            for (let k = 0; k < 10; k++) {
              state.particles.push({
                x: en.x + 16,
                y: en.y + 16,
                vx: (rng() - 0.5) * 6,
                vy: (rng() - 0.5) * 6,
                life: 20,
                color: '#FEE440'
              });
            }
            break;
          }
        }

        if (destroyed) {
          state.enemies.splice(ei, 1);
          continue;
        }

        // Quai dam vao P1
        if (aabbOverlap(en.x, en.y, en.w, en.h, p1.x + 4, p1.y + 4, p1.w - 8, p1.h - 8)) {
          state.enemies.splice(ei, 1);
          match.p1Hp = Math.max(0, match.p1Hp - 20);
          events.push({ type: 'hud' }, { type: 'shake', reason: 'p1_hit' }, { type: 'sfx', sound: 'explosion' });
          if (match.p1Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P2', title: 'NGƯỜI CHƠI 2 CHIẾN THẮNG!' });
            return events;
          }
          continue;
        }

        // Quai dam vao P2
        if (aabbOverlap(en.x, en.y, en.w, en.h, p2.x + 4, p2.y + 4, p2.w - 8, p2.h - 8)) {
          state.enemies.splice(ei, 1);
          match.p2Hp = Math.max(0, match.p2Hp - 20);
          events.push({ type: 'hud' }, { type: 'shake', reason: 'p2_hit' }, { type: 'sfx', sound: 'explosion' });
          if (match.p2Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P1', title: 'NGƯỜI CHƠI 1 CHIẾN THẮNG!' });
            return events;
          }
          continue;
        }

        // Quai lot qua day man hinh -> tru mau nguoi choi phu trach nua san tuong ung
        if (en.y >= CANVAS_HEIGHT) {
          state.enemies.splice(ei, 1);
          if (en.x + en.w / 2 < CANVAS_WIDTH / 2) {
            match.p1Hp = Math.max(0, match.p1Hp - 10);
            events.push({ type: 'hud' }, { type: 'shake', reason: 'p1_leak' }, { type: 'sfx', sound: 'explosion' });
            if (match.p1Hp <= 0) {
              events.push({ type: 'endMatch', winnerRole: 'P2', title: 'NGƯỜI CHƠI 2 CHIẾN THẮNG!' });
              return events;
            }
          } else {
            match.p2Hp = Math.max(0, match.p2Hp - 10);
            events.push({ type: 'hud' }, { type: 'shake', reason: 'p2_leak' }, { type: 'sfx', sound: 'explosion' });
            if (match.p2Hp <= 0) {
              events.push({ type: 'endMatch', winnerRole: 'P1', title: 'NGƯỜI CHƠI 1 CHIẾN THẮNG!' });
              return events;
            }
          }
        }
      }

      // Update Particles (duyet nguoc an toan)
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
      }

      return events;
    },

    getSnapshot(state, match) {
      return {
        gameId: 'starfighter',
        wave: state.wave,
        p1: { x: Math.round(state.p1.x), y: Math.round(state.p1.y), nitro: state.p1.nitroTimer > 0 },
        p2: { x: Math.round(state.p2.x), y: Math.round(state.p2.y), nitro: state.p2.nitroTimer > 0 },
        bullets: state.bullets.map(b => [Math.round(b.x), Math.round(b.y), b.owner, b.color]),
        enemies: state.enemies.map(e => [Math.round(e.x), Math.round(e.y)]),
        particles: state.particles.slice(0, 24).map(pt => [Math.round(pt.x), Math.round(pt.y), pt.color]),
        match: {
          p1Score: match.p1Score,
          p2Score: match.p2Score,
          p1Hp: match.p1Hp,
          p2Hp: match.p2Hp,
          timeLeft: match.timeLeft
        }
      };
    },

    applySnapshot(state, snap) {
      if (!snap || snap.gameId !== 'starfighter') return;
      state.wave = snap.wave || 1;
      state.p1.x = lerp(state.p1.x, snap.p1.x, 0.6);
      state.p1.y = lerp(state.p1.y, snap.p1.y, 0.6);
      state.p1.nitroTimer = snap.p1.nitro ? 1 : 0;
      state.p2.x = lerp(state.p2.x, snap.p2.x, 0.6);
      state.p2.y = lerp(state.p2.y, snap.p2.y, 0.6);
      state.p2.nitroTimer = snap.p2.nitro ? 1 : 0;
      state.bullets = (snap.bullets || []).map(([x, y, owner, color]) => ({ x, y, owner, color }));
      state.enemies = (snap.enemies || []).map(([x, y]) => ({ x, y, w: 32, h: 32 }));
      state.particles = (snap.particles || []).map(([x, y, color]) => ({ x, y, vx: 0, vy: 0, life: 5, color }));
    },

    render(ctx, state) {
      ctx.fillStyle = '#06070E';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars backdrop
      state.stars.forEach(s => {
        s.y = (s.y + s.v) % CANVAS_HEIGHT;
        ctx.fillStyle = '#334155';
        ctx.fillRect(s.x, s.y, s.s, s.s);
      });

      // Wave indicator
      ctx.fillStyle = 'rgba(0, 245, 212, 0.6)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`WAVE ${state.wave}`, 14, 22);

      // Ships
      drawPixelShip(ctx, state.p1.x, state.p1.y, state.p1.color, 'P1', state.p1.nitroTimer > 0);
      drawPixelShip(ctx, state.p2.x, state.p2.y, state.p2.color, 'P2', state.p2.nitroTimer > 0);

      // Bullets
      state.bullets.forEach(b => {
        ctx.fillStyle = b.color || '#00F5D4';
        ctx.fillRect(b.x, b.y, 4, 14);
      });

      // Enemies
      state.enemies.forEach(en => {
        ctx.fillStyle = '#FEE440';
        ctx.fillRect(en.x + 4, en.y, 24, 24);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(en.x, en.y + 8, 32, 12);
      });

      // Particles
      state.particles.forEach(pt => {
        ctx.fillStyle = pt.color || '#FEE440';
        ctx.fillRect(pt.x, pt.y, 4, 4);
      });
    }
  };

  // =========================================================================
  // GAME 2: BATTLE CITY TANK 2P (XE TANG DAI CHIEN)
  // =========================================================================
  function buildBrickCluster(x, y, cols, rows, cellSize = 20) {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: x + c * cellSize,
          y: y + r * cellSize,
          w: cellSize,
          h: cellSize,
          hp: 1
        });
      }
    }
    return cells;
  }

  function spawnTankShell(t, owner, fast = false) {
    const speed = fast ? 10 : 7;
    let vx = 0, vy = 0;
    if (t.dir === 'U') vy = -speed;
    if (t.dir === 'D') vy = speed;
    if (t.dir === 'L') vx = -speed;
    if (t.dir === 'R') vx = speed;
    return { x: t.x + 16, y: t.y + 16, vx, vy, owner, fast };
  }

  const TankEngine = {
    TANK_SIZE: 32,
    BRICK_COLOR: '#B45309',
    DAMAGE_PER_HIT: 25,

    createState() {
      const blocks = [
        ...buildBrickCluster(380, 70, 2, 6, 20),
        ...buildBrickCluster(380, 310, 2, 6, 20),
        ...buildBrickCluster(220, 190, 2, 6, 20),
        ...buildBrickCluster(540, 190, 2, 6, 20)
      ];
      return {
        gameId: 'tank',
        frame: 0,
        t1: { x: 80, y: 230, w: 32, h: 32, dir: 'R', cd: 0, nitroTimer: 0, nitroCd: 0, color: '#00F5D4' },
        t2: { x: 680, y: 230, w: 32, h: 32, dir: 'L', cd: 0, nitroTimer: 0, nitroCd: 0, botPatrolDir: 'U', botPatrolTimer: 40, color: '#FF2A85' },
        shells: [],
        blocks,
        particles: []
      };
    },

    canMoveTank(nx, ny, blocks, otherTank) {
      if (nx < 20 || nx > CANVAS_WIDTH - 20 - this.TANK_SIZE || ny < 20 || ny > CANVAS_HEIGHT - 20 - this.TANK_SIZE) {
        return false;
      }
      for (let i = 0; i < blocks.length; i++) {
        const bl = blocks[i];
        if (aabbOverlap(nx, ny, this.TANK_SIZE, this.TANK_SIZE, bl.x, bl.y, bl.w, bl.h)) {
          return false;
        }
      }
      if (otherTank && aabbOverlap(nx, ny, this.TANK_SIZE, this.TANK_SIZE, otherTank.x, otherTank.y, this.TANK_SIZE, this.TANK_SIZE)) {
        return false;
      }
      return true;
    },

    tryMoveTank(tank, dir, speed, blocks, otherTank) {
      tank.dir = dir;
      let nx = tank.x;
      let ny = tank.y;
      if (dir === 'U') ny -= speed;
      if (dir === 'D') ny += speed;
      if (dir === 'L') nx -= speed;
      if (dir === 'R') nx += speed;
      if (this.canMoveTank(nx, ny, blocks, otherTank)) {
        tank.x = nx;
        tank.y = ny;
        return true;
      }
      return false;
    },

    step(state, keys, match, mode, rng = Math.random) {
      const events = [];
      state.frame++;
      const { t1, t2, blocks } = state;

      // P1 Nitro / Heavy Shell (Nut B)
      if (t1.nitroCd > 0) t1.nitroCd--;
      if (t1.nitroTimer > 0) t1.nitroTimer--;
      if (keys['ShiftLeft'] && t1.nitroCd === 0) {
        t1.nitroTimer = 30;
        t1.nitroCd = 90;
        state.shells.push(spawnTankShell(t1, 1, true));
        events.push({ type: 'sfx', sound: 'powerup' });
      }

      const speed1 = t1.nitroTimer > 0 ? 5.2 : 3.5;
      if (keys['KeyW']) this.tryMoveTank(t1, 'U', speed1, blocks, t2);
      else if (keys['KeyS']) this.tryMoveTank(t1, 'D', speed1, blocks, t2);
      else if (keys['KeyA']) this.tryMoveTank(t1, 'L', speed1, blocks, t2);
      else if (keys['KeyD']) this.tryMoveTank(t1, 'R', speed1, blocks, t2);

      if (t1.cd > 0) t1.cd--;
      if (keys['Space'] && t1.cd === 0) {
        state.shells.push(spawnTankShell(t1, 1, false));
        t1.cd = 25;
        events.push({ type: 'sfx', sound: 'laser' });
      }

      // P2 Controls or Bot AI (tuan tra + xoay nong ngam P1)
      if (t2.nitroCd > 0) t2.nitroCd--;
      if (t2.nitroTimer > 0) t2.nitroTimer--;

      if (mode === 'bot') {
        const dx = t1.x - t2.x;
        const dy = t1.y - t2.y;
        const aimDir = Math.abs(dx) >= Math.abs(dy)
          ? (dx < 0 ? 'L' : 'R')
          : (dy < 0 ? 'U' : 'D');

        t2.botPatrolTimer--;
        const moved = this.tryMoveTank(t2, t2.botPatrolDir, 2.6, blocks, t1);
        if (!moved || t2.botPatrolTimer <= 0) {
          const dirs = ['U', 'D', 'L', 'R'];
          t2.botPatrolDir = dirs[Math.floor(rng() * dirs.length)];
          t2.botPatrolTimer = 35 + Math.floor(rng() * 30);
        }

        // Xoay nong ngam ve phia P1 khi sap ban hoac khi thang hang
        const aligned = Math.abs(dx) < 36 || Math.abs(dy) < 36;
        if (aligned || t2.cd <= 6) {
          t2.dir = aimDir;
        }

        if (t2.cd > 0) t2.cd--;
        if (t2.cd === 0) {
          t2.dir = aimDir;
          state.shells.push(spawnTankShell(t2, 2, false));
          t2.cd = 34;
          events.push({ type: 'sfx', sound: 'laser' });
        }
      } else {
        if (keys['ShiftRight'] && t2.nitroCd === 0) {
          t2.nitroTimer = 30;
          t2.nitroCd = 90;
          state.shells.push(spawnTankShell(t2, 2, true));
          events.push({ type: 'sfx', sound: 'powerup' });
        }
        const speed2 = t2.nitroTimer > 0 ? 5.2 : 3.5;
        if (keys['ArrowUp']) this.tryMoveTank(t2, 'U', speed2, blocks, t1);
        else if (keys['ArrowDown']) this.tryMoveTank(t2, 'D', speed2, blocks, t1);
        else if (keys['ArrowLeft']) this.tryMoveTank(t2, 'L', speed2, blocks, t1);
        else if (keys['ArrowRight']) this.tryMoveTank(t2, 'R', speed2, blocks, t1);

        if (t2.cd > 0) t2.cd--;
        if (keys['Enter'] && t2.cd === 0) {
          state.shells.push(spawnTankShell(t2, 2, false));
          t2.cd = 25;
          events.push({ type: 'sfx', sound: 'laser' });
        }
      }

      // Update Shells (duyet nguoc an toan)
      for (let si = state.shells.length - 1; si >= 0; si--) {
        const s = state.shells[si];
        s.x += s.vx;
        s.y += s.vy;

        // Ra khoi ban do
        if (s.x < 0 || s.x > CANVAS_WIDTH || s.y < 0 || s.y > CANVAS_HEIGHT) {
          state.shells.splice(si, 1);
          continue;
        }

        // Va cham tuong gach -> triet tieu dan VA pha huy o gach #B45309
        let hitBrick = false;
        for (let bi = blocks.length - 1; bi >= 0; bi--) {
          const bl = blocks[bi];
          if (s.x >= bl.x && s.x <= bl.x + bl.w && s.y >= bl.y && s.y <= bl.y + bl.h) {
            state.shells.splice(si, 1);
            bl.hp -= 1;
            if (bl.hp <= 0) {
              blocks.splice(bi, 1);
            }
            for (let k = 0; k < 6; k++) {
              state.particles.push({
                x: bl.x + bl.w / 2,
                y: bl.y + bl.h / 2,
                vx: (rng() - 0.5) * 4,
                vy: (rng() - 0.5) * 4,
                life: 14,
                color: '#B45309'
              });
            }
            events.push({ type: 'sfx', sound: 'blip' });
            hitBrick = true;
            break;
          }
        }
        if (hitBrick) continue;

        // Trung xe tang P2
        if (s.owner === 1 && aabbOverlap(s.x - 3, s.y - 3, 6, 6, t2.x, t2.y, t2.w, t2.h)) {
          state.shells.splice(si, 1);
          match.p1Score += 250;
          match.p2Hp = Math.max(0, match.p2Hp - this.DAMAGE_PER_HIT);
          for (let k = 0; k < 10; k++) {
            state.particles.push({
              x: t2.x + 16, y: t2.y + 16,
              vx: (rng() - 0.5) * 6, vy: (rng() - 0.5) * 6,
              life: 18, color: '#FEE440'
            });
          }
          events.push({ type: 'hud' }, { type: 'shake', reason: 'tank_p2_hit' }, { type: 'sfx', sound: 'explosion' });
          if (match.p2Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P1', title: 'XE TĂNG P1 CHIẾN THẮNG!' });
            return events;
          }
          continue;
        }

        // Trung xe tang P1
        if (s.owner === 2 && aabbOverlap(s.x - 3, s.y - 3, 6, 6, t1.x, t1.y, t1.w, t1.h)) {
          state.shells.splice(si, 1);
          match.p2Score += 250;
          match.p1Hp = Math.max(0, match.p1Hp - this.DAMAGE_PER_HIT);
          for (let k = 0; k < 10; k++) {
            state.particles.push({
              x: t1.x + 16, y: t1.y + 16,
              vx: (rng() - 0.5) * 6, vy: (rng() - 0.5) * 6,
              life: 18, color: '#FEE440'
            });
          }
          events.push({ type: 'hud' }, { type: 'shake', reason: 'tank_p1_hit' }, { type: 'sfx', sound: 'explosion' });
          if (match.p1Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P2', title: 'XE TĂNG P2 CHIẾN THẮNG!' });
            return events;
          }
        }
      }

      // Update Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) state.particles.splice(i, 1);
      }

      return events;
    },

    getSnapshot(state, match) {
      return {
        gameId: 'tank',
        t1: { x: Math.round(state.t1.x), y: Math.round(state.t1.y), dir: state.t1.dir },
        t2: { x: Math.round(state.t2.x), y: Math.round(state.t2.y), dir: state.t2.dir },
        shells: state.shells.map(s => [Math.round(s.x), Math.round(s.y), s.owner, s.fast ? 1 : 0]),
        blocks: state.blocks.map(b => [b.x, b.y, b.w, b.h]),
        particles: state.particles.slice(0, 20).map(pt => [Math.round(pt.x), Math.round(pt.y), pt.color]),
        match: {
          p1Score: match.p1Score,
          p2Score: match.p2Score,
          p1Hp: match.p1Hp,
          p2Hp: match.p2Hp,
          timeLeft: match.timeLeft
        }
      };
    },

    applySnapshot(state, snap) {
      if (!snap || snap.gameId !== 'tank') return;
      state.t1.x = lerp(state.t1.x, snap.t1.x, 0.65);
      state.t1.y = lerp(state.t1.y, snap.t1.y, 0.65);
      state.t1.dir = snap.t1.dir;
      state.t2.x = lerp(state.t2.x, snap.t2.x, 0.65);
      state.t2.y = lerp(state.t2.y, snap.t2.y, 0.65);
      state.t2.dir = snap.t2.dir;
      state.shells = (snap.shells || []).map(([x, y, owner, fast]) => ({ x, y, owner, fast: !!fast }));
      state.blocks = (snap.blocks || []).map(([x, y, w, h]) => ({ x, y, w, h, hp: 1 }));
      state.particles = (snap.particles || []).map(([x, y, color]) => ({ x, y, vx: 0, vy: 0, life: 5, color }));
    },

    render(ctx, state) {
      ctx.fillStyle = '#0A0D18';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Brick walls (#B45309)
      state.blocks.forEach(bl => {
        ctx.fillStyle = '#B45309';
        ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);
      });

      drawPixelTank(ctx, state.t1);
      drawPixelTank(ctx, state.t2);

      state.shells.forEach(s => {
        ctx.fillStyle = s.fast ? '#00F5D4' : '#FEE440';
        ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
      });

      state.particles.forEach(pt => {
        ctx.fillStyle = pt.color || '#FEE440';
        ctx.fillRect(pt.x, pt.y, 4, 4);
      });
    }
  };

  // =========================================================================
  // GAME 3: GOMOKU / CO CARO 15x15
  // =========================================================================
  function getCaroWinLine(board, r, c, player) {
    const size = board.length;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      const cells = [[r, c]];
      for (let s = 1; s < 5; s++) {
        const nr = r + dr * s;
        const nc = c + dc * s;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
          cells.push([nr, nc]);
        } else break;
      }
      for (let s = 1; s < 5; s++) {
        const nr = r - dr * s;
        const nc = c - dc * s;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
          cells.unshift([nr, nc]);
        } else break;
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  function checkCaroWin(board, r, c, player) {
    return getCaroWinLine(board, r, c, player) !== null;
  }

  const CaroEngine = {
    SIZE: 15,
    CELL: 30,
    OFFSET_X: 175,
    OFFSET_Y: 25,
    DOUBLE_CLICK_LOCK_MS: 180,

    createState() {
      return {
        gameId: 'caro',
        board: Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(0)),
        turn: 1,
        moveCount: 0,
        lastMove: null,
        lastP1Move: null,
        winLine: null,
        finished: false,
        winner: null,
        locked: false,
        lastActionTs: 0
      };
    },

    canvasToCell(canvasX, canvasY) {
      const c = Math.floor((canvasX - this.OFFSET_X) / this.CELL);
      const r = Math.floor((canvasY - this.OFFSET_Y) / this.CELL);
      if (r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE) {
        return { r, c };
      }
      return null;
    },

    /**
     * Thuc hien 1 nuoc di Co Caro kem khoa chong danh dup (double-click lock)
     */
    applyMove(state, r, c, opts = {}) {
      const now = typeof opts.now === 'number' ? opts.now : Date.now();
      const fromRemote = !!opts.fromRemote;
      const expectedPlayer = opts.expectedPlayer || null;

      if (state.finished) return { ok: false, reason: 'MATCH_FINISHED' };
      if (r < 0 || r >= this.SIZE || c < 0 || c >= this.SIZE) {
        return { ok: false, reason: 'OUT_OF_BOUNDS' };
      }
      if (!fromRemote && state.locked) {
        return { ok: false, reason: 'DOUBLE_CLICK_LOCKED' };
      }
      if (!fromRemote && now - state.lastActionTs < this.DOUBLE_CLICK_LOCK_MS) {
        return { ok: false, reason: 'DEBOUNCE_LOCKED' };
      }
      if (expectedPlayer !== null && state.turn !== expectedPlayer) {
        return { ok: false, reason: 'NOT_YOUR_TURN' };
      }
      if (state.board[r][c] !== 0) {
        return { ok: false, reason: 'CELL_OCCUPIED' };
      }

      const player = state.turn;
      state.board[r][c] = player;
      state.moveCount++;
      state.lastMove = { r, c, player };
      if (player === 1) state.lastP1Move = { r, c };
      if (!fromRemote) state.lastActionTs = now;

      const winLine = getCaroWinLine(state.board, r, c, player);
      if (winLine) {
        state.finished = true;
        state.winner = player;
        state.winLine = winLine;
        return { ok: true, player, r, c, win: true, winLine, isDraw: false, nextTurn: null };
      }

      if (state.moveCount >= this.SIZE * this.SIZE) {
        state.finished = true;
        state.winner = 0;
        return { ok: true, player, r, c, win: false, winLine: null, isDraw: true, nextTurn: null };
      }

      state.turn = player === 1 ? 2 : 1;
      return { ok: true, player, r, c, win: false, winLine: null, isDraw: false, nextTurn: state.turn };
    },

    /**
     * Bot AI Co Caro:
     * 1. Neu Bot co nuoc thang ngay -> danh ngay
     * 2. Neu P1 sap thang 5 (hoac 4 lien tiep) -> chan ngay
     * 3. Chon ngau nhien o trong trong ban kinh 2 o xung quanh nuoc di cua P1
     * 4. Fallback: chon o trong gan tam ban co nhat
     */
    pickBotMove(state, rng = Math.random) {
      const board = state.board;
      const size = this.SIZE;

      // Helper kiem tra nuoc thang ngay cho player
      const findWinningMove = (player) => {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (board[r][c] !== 0) continue;
            board[r][c] = player;
            const wins = checkCaroWin(board, r, c, player);
            board[r][c] = 0;
            if (wins) return { r, c };
          }
        }
        return null;
      };

      const botWin = findWinningMove(2);
      if (botWin) return botWin;

      const blockP1 = findWinningMove(1);
      if (blockP1) return blockP1;

      // Vung lan can ban kinh 2 o xung quanh nuoc di P1
      const center = state.lastP1Move || state.lastMove || { r: 7, c: 7 };
      const radius2 = [];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = center.r + dr;
          const nc = center.c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 0) {
            radius2.push({ r: nr, c: nc });
          }
        }
      }

      if (radius2.length > 0) {
        return radius2[Math.floor(rng() * radius2.length)];
      }

      // Fallback: bat ky o trong nao gan tam nhat
      let best = null;
      let bestDist = Infinity;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] === 0) {
            const d = Math.abs(r - 7) + Math.abs(c - 7);
            if (d < bestDist) {
              bestDist = d;
              best = { r, c };
            }
          }
        }
      }
      return best;
    },

    render(ctx, state) {
      ctx.fillStyle = '#080912';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Turn indicator
      ctx.fillStyle = state.turn === 1 ? '#00F5D4' : '#FF2A85';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(state.turn === 1 ? 'LUOT: P1 (X)' : 'LUOT: P2 (O)', 16, 28);

      // Draw 15x15 Grid
      for (let r = 0; r < this.SIZE; r++) {
        for (let c = 0; c < this.SIZE; c++) {
          const x = this.OFFSET_X + c * this.CELL;
          const y = this.OFFSET_Y + r * this.CELL;

          // Highlight last move
          if (state.lastMove && state.lastMove.r === r && state.lastMove.c === c) {
            ctx.fillStyle = 'rgba(254, 228, 64, 0.16)';
            ctx.fillRect(x, y, this.CELL, this.CELL);
          }

          ctx.strokeStyle = '#272E54';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, this.CELL, this.CELL);

          const val = state.board[r][c];
          if (val === 1) {
            ctx.strokeStyle = '#00F5D4';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6);
            ctx.lineTo(x + 24, y + 24);
            ctx.moveTo(x + 24, y + 6);
            ctx.lineTo(x + 6, y + 24);
            ctx.stroke();
            ctx.lineWidth = 1;
          } else if (val === 2) {
            ctx.strokeStyle = '#FF2A85';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + 15, y + 15, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
          }
        }
      }

      // Highlight duong thang 5 quan
      if (state.winLine && state.winLine.length >= 2) {
        const first = state.winLine[0];
        const last = state.winLine[state.winLine.length - 1];
        ctx.strokeStyle = '#FEE440';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.OFFSET_X + first[1] * this.CELL + 15, this.OFFSET_Y + first[0] * this.CELL + 15);
        ctx.lineTo(this.OFFSET_X + last[1] * this.CELL + 15, this.OFFSET_Y + last[0] * this.CELL + 15);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  };

  // =========================================================================
  // GAME 4: CYBER PONG 2P
  // =========================================================================
  const PongEngine = {
    createState() {
      return {
        gameId: 'pong',
        p1Y: 200,
        p2Y: 200,
        ball: { x: 400, y: 250, vx: 5.5, vy: 4 }
      };
    },

    step(state, keys, match, mode, rng = Math.random) {
      const events = [];
      if (keys['KeyW'] && state.p1Y > 10) state.p1Y -= 7;
      if (keys['KeyS'] && state.p1Y < 400) state.p1Y += 7;

      if (mode === 'bot') {
        if (state.ball.y > state.p2Y + 45 && state.p2Y < 400) state.p2Y += 5;
        if (state.ball.y < state.p2Y + 45 && state.p2Y > 10) state.p2Y -= 5;
      } else {
        if (keys['ArrowUp'] && state.p2Y > 10) state.p2Y -= 7;
        if (keys['ArrowDown'] && state.p2Y < 400) state.p2Y += 7;
      }

      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      if (state.ball.y <= 10 || state.ball.y >= 490) {
        state.ball.vy *= -1;
        events.push({ type: 'sfx', sound: 'blip' });
      }

      if (state.ball.x <= 42 && state.ball.y >= state.p1Y && state.ball.y <= state.p1Y + 90) {
        state.ball.vx = Math.min(13, Math.abs(state.ball.vx) * 1.05);
        events.push({ type: 'sfx', sound: 'laser' });
      }
      if (state.ball.x >= 758 && state.ball.y >= state.p2Y && state.ball.y <= state.p2Y + 90) {
        state.ball.vx = -Math.min(13, Math.abs(state.ball.vx) * 1.05);
        events.push({ type: 'sfx', sound: 'laser' });
      }

      if (state.ball.x < 0) {
        match.p2Score += 1;
        events.push({ type: 'hud' }, { type: 'shake', reason: 'pong_score' }, { type: 'sfx', sound: 'explosion' });
        state.ball = { x: 400, y: 250, vx: 5.5, vy: (rng() - 0.5) * 8 };
      } else if (state.ball.x > 800) {
        match.p1Score += 1;
        events.push({ type: 'hud' }, { type: 'shake', reason: 'pong_score' }, { type: 'sfx', sound: 'explosion' });
        state.ball = { x: 400, y: 250, vx: -5.5, vy: (rng() - 0.5) * 8 };
      }
      return events;
    },

    getSnapshot(state, match) {
      return {
        gameId: 'pong',
        p1Y: Math.round(state.p1Y),
        p2Y: Math.round(state.p2Y),
        ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y) },
        match: {
          p1Score: match.p1Score,
          p2Score: match.p2Score,
          p1Hp: match.p1Hp,
          p2Hp: match.p2Hp,
          timeLeft: match.timeLeft
        }
      };
    },

    applySnapshot(state, snap) {
      if (!snap || snap.gameId !== 'pong') return;
      state.p1Y = lerp(state.p1Y, snap.p1Y, 0.7);
      state.p2Y = lerp(state.p2Y, snap.p2Y, 0.7);
      state.ball.x = lerp(state.ball.x, snap.ball.x, 0.75);
      state.ball.y = lerp(state.ball.y, snap.ball.y, 0.75);
    },

    render(ctx, state) {
      ctx.fillStyle = '#06070E';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#272E54';
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 500);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00F5D4';
      ctx.fillRect(25, state.p1Y, 14, 90);
      ctx.fillStyle = '#FF2A85';
      ctx.fillRect(761, state.p2Y, 14, 90);
      ctx.fillStyle = '#FEE440';
      ctx.fillRect(state.ball.x - 8, state.ball.y - 8, 16, 16);
    }
  };

  // =========================================================================
  // GAME 5: NEON PIXEL RACERS 2P
  // =========================================================================
  const RacerEngine = {
    createState() {
      return {
        gameId: 'racer',
        car1X: 260,
        car2X: 500,
        roadOffset: 0,
        obstacles: [],
        frame: 0
      };
    },

    step(state, keys, match, mode, rng = Math.random) {
      const events = [];
      state.frame++;
      const p1Boost = keys['ShiftLeft'] ? 2 : 1;
      const p2Boost = keys['ShiftRight'] ? 2 : 1;
      state.roadOffset = (state.roadOffset + 8) % 40;
      match.p1Score += p1Boost;
      match.p2Score += p2Boost;
      if (state.frame % 10 === 0) events.push({ type: 'hud' });

      const c1Speed = keys['ShiftLeft'] ? 7 : 5;
      if (keys['KeyA']) state.car1X = clamp(state.car1X - c1Speed, 160, 365);
      if (keys['KeyD']) state.car1X = clamp(state.car1X + c1Speed, 160, 365);

      if (mode === 'bot') {
        state.car2X = clamp(500 + Math.sin(state.frame / 25) * 60, 415, 610);
      } else {
        const c2Speed = keys['ShiftRight'] ? 7 : 5;
        if (keys['ArrowLeft']) state.car2X = clamp(state.car2X - c2Speed, 415, 610);
        if (keys['ArrowRight']) state.car2X = clamp(state.car2X + c2Speed, 415, 610);
      }

      if (state.frame % 45 === 0) {
        state.obstacles.push({ x: 160 + rng() * 200, y: -40, lane: 1 });
        state.obstacles.push({ x: 415 + rng() * 195, y: -40, lane: 2 });
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const ob = state.obstacles[i];
        ob.y += 7;
        if (ob.y > 550) {
          state.obstacles.splice(i, 1);
          continue;
        }
        if (ob.lane === 1 && Math.abs(ob.x - state.car1X) < 28 && Math.abs(ob.y - 400) < 42) {
          state.obstacles.splice(i, 1);
          match.p1Hp = Math.max(0, match.p1Hp - 25);
          events.push({ type: 'hud' }, { type: 'shake', reason: 'racer_p1_crash' }, { type: 'sfx', sound: 'explosion' });
          if (match.p1Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P2', title: 'TAY ĐUA P2 VỀ ĐÍCH TRƯỚC!' });
            return events;
          }
          continue;
        }
        if (ob.lane === 2 && Math.abs(ob.x - state.car2X) < 28 && Math.abs(ob.y - 400) < 42) {
          state.obstacles.splice(i, 1);
          match.p2Hp = Math.max(0, match.p2Hp - 25);
          events.push({ type: 'hud' }, { type: 'shake', reason: 'racer_p2_crash' }, { type: 'sfx', sound: 'explosion' });
          if (match.p2Hp <= 0) {
            events.push({ type: 'endMatch', winnerRole: 'P1', title: 'TAY ĐUA P1 VỀ ĐÍCH TRƯỚC!' });
            return events;
          }
        }
      }
      return events;
    },

    getSnapshot(state, match) {
      return {
        gameId: 'racer',
        car1X: Math.round(state.car1X),
        car2X: Math.round(state.car2X),
        roadOffset: state.roadOffset,
        obstacles: state.obstacles.map(o => [Math.round(o.x), Math.round(o.y), o.lane]),
        match: {
          p1Score: match.p1Score,
          p2Score: match.p2Score,
          p1Hp: match.p1Hp,
          p2Hp: match.p2Hp,
          timeLeft: match.timeLeft
        }
      };
    },

    applySnapshot(state, snap) {
      if (!snap || snap.gameId !== 'racer') return;
      state.car1X = lerp(state.car1X, snap.car1X, 0.7);
      state.car2X = lerp(state.car2X, snap.car2X, 0.7);
      state.roadOffset = snap.roadOffset;
      state.obstacles = (snap.obstacles || []).map(([x, y, lane]) => ({ x, y, lane }));
    },

    render(ctx, state) {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#171C2E';
      ctx.fillRect(150, 0, 240, 500);
      ctx.fillRect(410, 0, 240, 500);

      ctx.fillStyle = '#FEE440';
      for (let y = state.roadOffset - 40; y < 500; y += 40) {
        ctx.fillRect(268, y, 4, 20);
        ctx.fillRect(528, y, 4, 20);
      }

      ctx.fillStyle = '#00F5D4';
      ctx.fillRect(state.car1X, 400, 28, 46);
      ctx.fillStyle = '#FF2A85';
      ctx.fillRect(state.car2X, 400, 28, 46);

      state.obstacles.forEach(ob => {
        ctx.fillStyle = '#F97316';
        ctx.fillRect(ob.x, ob.y, 28, 28);
      });
    }
  };

  // =========================================================================
  // HELPER DRAWING FUNCTIONS
  // =========================================================================
  function drawPixelShip(ctx, x, y, color, label, nitro) {
    if (nitro) {
      ctx.fillStyle = '#FEE440';
      ctx.fillRect(x + 12, y + 32, 12, 10);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x + 14, y, 8, 8);
    ctx.fillRect(x + 8, y + 8, 20, 12);
    ctx.fillRect(x, y + 20, 36, 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(label, x + 12, y + 29);
  }

  function drawPixelTank(ctx, t) {
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x, t.y, 32, 32);
    ctx.fillStyle = '#FFFFFF';
    if (t.dir === 'U') ctx.fillRect(t.x + 14, t.y - 8, 4, 16);
    if (t.dir === 'D') ctx.fillRect(t.x + 14, t.y + 24, 4, 16);
    if (t.dir === 'L') ctx.fillRect(t.x - 8, t.y + 14, 16, 4);
    if (t.dir === 'R') ctx.fillRect(t.x + 24, t.y + 14, 16, 4);
  }

  const ENGINES = {
    starfighter: StarFighterEngine,
    tank: TankEngine,
    caro: CaroEngine,
    pong: PongEngine,
    racer: RacerEngine
  };

  return {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    StarFighterEngine,
    TankEngine,
    CaroEngine,
    PongEngine,
    RacerEngine,
    ENGINES,
    checkCaroWin,
    getCaroWinLine,
    spawnTankShell,
    drawPixelShip,
    drawPixelTank
  };
});
