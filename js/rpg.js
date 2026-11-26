window.Jogo = window.Jogo || {};

/* =====================================================================
   MODO RPG (Mundo Aberto) - Ato 1 (Continente) & Ato 2 (Torre no Mar)
   Loja do Armeiro, Pocoes, Companheiro Didalmiano, Chefes, Baus e Save.
   ===================================================================== */
window.Jogo.RPG = (function () {
  const W = window.Jogo.RPGWorld;
  const T = 32;
  const MW = W.MW;
  const MH = W.MH;
  const VW = 960;
  const VH = 540;

  const { GRASS, PATH, WATER, TREE, ROCK, WALL, FLOOR, FLOWER, MUD, HWALL, ROOF, DOOR, BUSH, GATE, DEAD, SWATER, DOCK } = W.TILE;
  const SOLID = W.SOLID;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  const RPG_CHAR = {
    nicolas: { reach: 48, width: 52, pal: { hair: '#e8edf5', coat: '#1f7a43', trim: '#eab308', skin: '#f5cbb0', horn: '#166534', mask: true } },
    nicks: { reach: 74, width: 30, pal: { hair: '#ef4444', coat: '#e24a6e', trim: '#f5ecd2', skin: '#e4f5e4', horn: '#4b5563', mask: false } }
  };

  let env = null;
  let active = false;
  let paused = false;
  let time = 0;

  let act = 1; // 1 = Continente, 2 = Torre no Mar
  let map = null;
  let props = [];
  let chests = [];
  let npcs = [];
  let signs = [];
  let enemies = [];
  let eprojs = [];
  let pprojs = [];
  let drops = [];
  let parts = [];
  let popups = [];
  let toasts = [];
  let dlg = null;
  let shop = null; // { idx }
  let P = null;
  let charId = 'nicolas';
  let heroName = 'Nícolas';
  let mateId = 'nicks';
  let mateName = 'Nicks';
  let flags = {};
  let fade = 0;
  let deadT = 0;
  let winT = 0;
  let camX = 0;
  let camY = 0;
  let enemyId = 0;
  let mini = null;
  let tileCache = {};

  const SPAWN_ACT1 = { x: 32 * T + 16, y: 42 * T + 16 };
  const SPAWN_ACT2 = { x: 32 * T + 16, y: 41 * T + 16 };

  function rnd(a, b = 0) {
    const x = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function rr() { return Math.random(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function mk() { return document.createElement('canvas'); }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return act === 2 ? WATER : TREE;
    return map[ty * MW + tx];
  }
  function setTile(tx, ty, t) {
    if (tx >= 0 && ty >= 0 && tx < MW && ty < MH) map[ty * MW + tx] = t;
  }
  function solidTile(px, py) {
    return SOLID[tileAt(Math.floor(px / T), Math.floor(py / T))];
  }

  function solidRects() {
    const arr = [];
    for (const p of props) if (p.solid) arr.push(p.rect);
    for (const c of chests) arr.push({ x: c.x * T + 3, y: c.y * T + 6, w: 26, h: 22 });
    for (const n of npcs) arr.push({ x: n.x - 10, y: n.y - 8, w: 20, h: 18 });
    for (const s of signs) arr.push({ x: s.x * T + 6, y: s.y * T + 6, w: 20, h: 22 });
    return arr;
  }

  function blocked(cx, cy, hw, hh) {
    if (solidTile(cx - hw, cy - hh) || solidTile(cx + hw, cy - hh) || solidTile(cx - hw, cy + hh) || solidTile(cx + hw, cy + hh)) return true;
    const rects = solidRects();
    for (const r of rects) {
      if (cx - hw < r.x + r.w && cx + hw > r.x && cy - hh < r.y + r.h && cy + hh > r.y) return true;
    }
    return false;
  }

  function moveBox(e, dx, dy, hw, hh, fly) {
    if (dx) {
      const nx = e.x + dx;
      if (fly) e.x = clamp(nx, 40, MW * T - 40);
      else if (!blocked(nx, e.y, hw, hh)) e.x = nx;
    }
    if (dy) {
      const ny = e.y + dy;
      if (fly) e.y = clamp(ny, 40, MH * T - 40);
      else if (!blocked(e.x, ny, hw, hh)) e.y = ny;
    }
  }

  function findFree(tx, ty) {
    for (let r = 0; r < 8; r++) {
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const x = tx + i;
          const y = ty + j;
          const t = tileAt(x, y);
          if (!SOLID[t] && t !== SWATER && t !== WATER) {
            const cx = x * T + 16;
            const cy = y * T + 16;
            if (!blocked(cx, cy, 12, 12)) return { x: cx, y: cy };
          }
        }
      }
    }
    return { x: tx * T + 16, y: ty * T + 16 };
  }

  /* ------------------------------ tiles ------------------------------ */
  function grassBase(c, v) {
    c.fillStyle = act === 2 ? '#3d9970' : '#5bb450';
    c.fillRect(0, 0, T, T);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, 0, T, 10);
    c.strokeStyle = act === 2 ? '#2c7555' : '#3f9140';
    c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = 3 + rnd(v, i) * 26;
      const y = 4 + rnd(v, i + 9) * 24;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - 1.5, y - 4);
      c.moveTo(x, y);
      c.lineTo(x + 2, y - 3);
      c.stroke();
    }
  }

  function buildTile(type, v, f) {
    const cv = mk();
    cv.width = T;
    cv.height = T;
    const c = cv.getContext('2d');
    switch (type) {
      case GRASS:
        grassBase(c, v);
        break;
      case FLOWER: {
        grassBase(c, v);
        const cols = ['#fde047', '#f9a8d4', '#ffffff', '#93c5fd'];
        for (let i = 0; i < 4; i++) {
          const x = 4 + rnd(v, i + 20) * 24;
          const y = 5 + rnd(v, i + 30) * 22;
          c.fillStyle = cols[(v + i) % 4];
          c.beginPath();
          c.arc(x, y, 2.4, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#f59e0b';
          c.fillRect(x - 0.5, y - 0.5, 1.2, 1.2);
        }
        break;
      }
      case PATH:
        c.fillStyle = '#cfa96e';
        c.fillRect(0, 0, T, T);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.ellipse(3 + rnd(v, i) * 26, 3 + rnd(v, i + 5) * 26, 3, 2, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(0, 0, T, 2);
        break;
      case DOCK:
        c.fillStyle = '#8b5a2b';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = '#4a2c17';
        c.lineWidth = 1.5;
        for (let y = 0; y < T; y += 8) {
          c.strokeRect(0, y, T, 8);
        }
        c.fillStyle = '#d4a373';
        c.fillRect(2, 2, 3, 3);
        c.fillRect(T - 5, 2, 3, 3);
        break;
      case WATER:
      case SWATER: {
        const sw = type === SWATER;
        c.fillStyle = sw ? '#3b6b3a' : (act === 2 ? '#1d4e89' : '#3b82d6');
        c.fillRect(0, 0, T, T);
        c.strokeStyle = sw ? 'rgba(190,242,100,0.5)' : 'rgba(255,255,255,0.45)';
        c.lineWidth = 1.5;
        for (let k = 0; k < 2; k++) {
          const y = 8 + k * 14 + (f ? 2 : 0);
          c.beginPath();
          c.moveTo(2, y);
          c.quadraticCurveTo(8, y - 4, 14, y);
          c.quadraticCurveTo(20, y + 4, 28, y);
          c.stroke();
        }
        break;
      }
      case TREE:
      case DEAD: {
        grassBase(c, v);
        const dead = type === DEAD;
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.beginPath();
        c.ellipse(16, 28, 12, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = dead ? '#3f3a35' : '#6b4423';
        c.fillRect(13, 16, 6, 13);
        if (dead) {
          c.strokeStyle = '#3f3a35';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(16, 18); c.lineTo(6, 6);
          c.moveTo(16, 16); c.lineTo(26, 5);
          c.moveTo(16, 20); c.lineTo(28, 14);
          c.stroke();
        } else {
          const g = c.createRadialGradient(13, 9, 2, 16, 12, 17);
          g.addColorStop(0, act === 2 ? '#38bdf8' : '#4fbf5a');
          g.addColorStop(1, act === 2 ? '#0f766e' : '#1d6b34');
          c.fillStyle = g;
          c.strokeStyle = '#14451f';
          c.lineWidth = 1.5;
          [[16, 11, 12], [9, 15, 8], [23, 15, 8]].forEach(([x, y, r]) => {
            c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
          });
        }
        break;
      }
      case ROCK:
        grassBase(c, v);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.beginPath(); c.ellipse(16, 27, 12, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#9ca3af';
        c.strokeStyle = '#4b5563';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(4, 26); c.lineTo(7, 12); c.lineTo(16, 6); c.lineTo(26, 11); c.lineTo(29, 26);
        c.closePath(); c.fill(); c.stroke();
        break;
      case BUSH:
        grassBase(c, v);
        c.fillStyle = 'rgba(0,0,0,0.22)';
        c.beginPath(); c.ellipse(16, 26, 11, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2f9d49';
        c.strokeStyle = '#17572a';
        c.lineWidth = 1.5;
        [[10, 18, 8], [22, 18, 8], [16, 13, 9]].forEach(([x, y, r]) => {
          c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
        });
        c.fillStyle = '#ef4444';
        c.fillRect(13, 12, 2.5, 2.5);
        c.fillRect(21, 19, 2.5, 2.5);
        break;
      case MUD:
        c.fillStyle = '#6d6a3a';
        c.fillRect(0, 0, T, T);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 6; i++) {
          c.beginPath(); c.ellipse(3 + rnd(v, i + 40) * 26, 3 + rnd(v, i + 50) * 26, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
        }
        break;
      case WALL:
        c.fillStyle = act === 2 ? '#1e3a5f' : '#4a4560';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = act === 2 ? '#0f172a' : '#2b2740';
        c.lineWidth = 1.5;
        for (let r = 0; r < 4; r++) {
          const y = r * 8;
          c.strokeRect(0, y, T, 8);
          const off = r % 2 ? 8 : 0;
          c.beginPath(); c.moveTo(off + 8, y); c.lineTo(off + 8, y + 8); c.moveTo(off + 24, y); c.lineTo(off + 24, y + 8); c.stroke();
        }
        break;
      case FLOOR:
        c.fillStyle = act === 2 ? ((v % 2) ? '#475569' : '#52627a') : ((v % 2) ? '#8d89a6' : '#9a96b3');
        c.fillRect(0, 0, T, T);
        c.strokeStyle = 'rgba(40,36,64,0.45)';
        c.lineWidth = 1;
        c.strokeRect(0.5, 0.5, T - 1, T - 1);
        if (v % 5 === 0) {
          c.strokeStyle = 'rgba(56,189,248,0.5)';
          c.beginPath(); c.arc(16, 16, 7, 0, Math.PI * 2); c.stroke();
        }
        break;
      case ROOF:
        c.fillStyle = '#b3402f';
        c.fillRect(0, 0, T, T);
        c.fillStyle = '#8f2f22';
        for (let r = 0; r < 4; r++) {
          for (let k = 0; k < 4; k++) {
            c.beginPath(); c.arc(k * 8 + (r % 2 ? 4 : 0), r * 8 + 8, 5, 0, Math.PI); c.fill();
          }
        }
        break;
      case HWALL:
        c.fillStyle = '#e8d9b5';
        c.fillRect(0, 0, T, T);
        c.fillStyle = '#7a4b28';
        c.fillRect(0, 0, T, 4); c.fillRect(0, 0, 4, T); c.fillRect(T - 4, 0, 4, T);
        if (v % 2 === 0) {
          c.fillStyle = '#7dd3fc'; c.fillRect(9, 8, 14, 12);
          c.strokeStyle = '#7a4b28'; c.lineWidth = 2; c.strokeRect(9, 8, 14, 12);
        }
        break;
      case DOOR:
        c.fillStyle = '#e8d9b5'; c.fillRect(0, 0, T, T);
        c.fillStyle = '#5a3418'; c.beginPath(); c.roundRect(6, 4, 20, 28, [8, 8, 0, 0]); c.fill();
        c.fillStyle = '#facc15'; c.beginPath(); c.arc(21, 19, 2, 0, Math.PI * 2); c.fill();
        break;
      case GATE:
        c.fillStyle = '#3b3a4a'; c.fillRect(0, 0, T, T);
        c.strokeStyle = '#9ca3af'; c.lineWidth = 3;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(4 + i * 8, 2); c.lineTo(4 + i * 8, 30); c.stroke(); }
        c.beginPath(); c.moveTo(2, 10); c.lineTo(30, 10); c.moveTo(2, 22); c.lineTo(30, 22); c.stroke();
        c.fillStyle = '#facc15'; c.strokeStyle = '#7a5b00'; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(11, 13, 10, 9, 2); c.fill(); c.stroke();
        break;
      default:
        c.fillStyle = '#334155'; c.fillRect(0, 0, T, T);
    }
    return cv;
  }

  function getTile(type, x, y) {
    const v = Math.floor(rnd(x, y + 3) * 4);
    const f = type === WATER || type === SWATER ? Math.floor(time * 2) % 2 : 0;
    const key = act + '_' + type + '_' + v + '_' + f;
    if (!tileCache[key]) tileCache[key] = buildTile(type, v, f);
    return tileCache[key];
  }

  function buildMini() {
    mini = mk();
    mini.width = MW * 2;
    mini.height = MH * 2;
    const c = mini.getContext('2d');
    const col = {
      0: '#5bb450', 1: '#cfa96e', 2: '#2563eb', 3: '#2f7a3c', 4: '#9ca3af', 5: '#4a4560', 6: '#9a96b3',
      7: '#6fc460', 8: '#6d6a3a', 10: '#e8d9b5', 11: '#b3402f', 12: '#5a3418', 14: '#2f9d49',
      15: '#facc15', 16: '#3f3a35', 17: '#3b6b3a', 18: '#a16207'
    };
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        c.fillStyle = col[tileAt(x, y)] || '#000';
        c.fillRect(x * 2, y * 2, 2, 2);
      }
    }
  }

  /* ------------------------------ objetos ------------------------------ */
  function makeEnemy(type, x, y, color) {
    const d = W.ENEMY_DEF[type];
    return {
      id: ++enemyId, type, x, y, hp: d.hp, maxHp: d.hp, dmg: d.dmg, speed: d.speed, exp: d.exp,
      size: d.size, fly: !!d.fly, color: color || '#6fcf5a', wanderT: 0, wx: 0, wy: 0, shootT: 1 + rr() * 2,
      flash: 0, kx: 0, ky: 0, kT: 0, phase: rr() * 6, boss: false
    };
  }

  function makeBoss(key, x, y) {
    const d = W.BOSS_DEF[key];
    const f = findFree(Math.floor(x / T), Math.floor(y / T));
    return {
      id: ++enemyId, type: 'boss', key, x: f.x, y: f.y, hp: d.hp, maxHp: d.hp, dmg: d.dmg, speed: d.speed, exp: d.exp,
      size: 46, fly: false, color: d.color, name: d.name, boss: true, flash: 0, kx: 0, ky: 0, kT: 0,
      pat: 0, patT: 2, state: 'idle', stT: 0, dvx: 0, dvy: 0, phase: 0, shootT: 0
    };
  }

  function ensureClear() {
    const open = (x, y, to) => {
      if (SOLID[tileAt(x, y)] || tileAt(x, y) === SWATER) setTile(x, y, to);
    };
    chests.forEach((c) => open(c.x, c.y, GRASS));
    npcs.forEach((n) => open(Math.floor(n.x / T), Math.floor(n.y / T), PATH));
    signs.forEach((s) => open(s.x, s.y, PATH));
    chests.forEach((c) => {
      [[-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => {
        const t = tileAt(c.x + dx, c.y + dy);
        if (SOLID[t] && t !== WALL && t !== HWALL && t !== GATE && t !== WATER) setTile(c.x + dx, c.y + dy, GRASS);
      });
    });
  }

  function loadAct(targetAct, spawnPos) {
    act = targetAct;
    map = act === 1 ? W.buildAct1() : W.buildAct2();
    tileCache = {};
    const gateList = act === 1 ? flags.gates : flags.gates2;
    (gateList || []).forEach((g) => floodOpen(g[0], g[1]));

    props = []; chests = []; npcs = []; signs = [];
    enemies = []; eprojs = []; pprojs = []; drops = []; parts = []; popups = [];

    const ch = (id, x, y, item, n) => chests.push({ id, x, y, item, n: n || 0, opened: !!(flags.chests && flags.chests.includes(id)) });
    const sg = (x, y, text) => signs.push({ x, y, text });
    const sp = (type, tx, ty, color) => {
      const f = findFree(tx, ty);
      enemies.push(makeEnemy(type, f.x, f.y, color));
    };

    if (act === 1) {
      props.push({ kind: 'arcane', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 45 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('forestKey', 18, 40, 'key');
      ch('forestHeart', 6, 37, 'heart');
      ch('forestGems', 9, 25, 'spheres', 12);
      ch('meadowHeart', 24, 28, 'heart');
      ch('swampKey', 57, 24, 'key');
      ch('swampHeart', 59, 36, 'heart');
      ch('ruinsGems', 22, 13, 'spheres', 20);

      npcs.push({ id: 'elder', name: 'Ancião Nuvem', x: 33 * T + 16, y: 42 * T + 8, dir: 'left', pal: { hair: '#d1d5db', coat: '#6d4aa8', trim: '#fde047', skin: '#f2c9a5', horn: '#6d4aa8', mask: false } });
      npcs.push({ id: 'healer', name: 'Curandeira Mira', x: 37 * T + 16, y: 41 * T + 8, dir: 'down', pal: { hair: '#f472b6', coat: '#e2f4ef', trim: '#14b8a6', skin: '#f5cbb0', horn: '#14b8a6', mask: false } });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 27 * T + 16, y: 41 * T + 8, dir: 'down', pal: { hair: '#fb923c', coat: '#78350f', trim: '#facc15', skin: '#e6b89c', horn: '#92400e', mask: false } });
      npcs.push({ id: 'mate', name: mateName, x: 29 * T + 16, y: 43 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'sage', name: 'Viajante Tati', x: 35 * T + 16, y: 30 * T + 16, dir: 'left', pal: { hair: '#7c3aed', coat: '#334155', trim: '#38bdf8', skin: '#e4f5e4', horn: '#334155', mask: false } });

      sg(30, 40, 'Vila Didalmiana. Oeste: Floresta da Brisa. Leste: Pântano. Norte: Ruínas da Forja. Sul: Cais da Barca.');
      sg(23, 41, 'Floresta da Brisa. Um baú com Chave repousa ao lado deste caminho...');
      sg(41, 41, 'Portão do Pântano. Só abre com uma Chave.');
      sg(30, 24, 'Ruínas da Forja. O portão exige uma Chave encontrada no Pântano.');

      ensureClear();

      [[9, 34], [15, 30], [11, 38], [16, 36]].forEach(([x, y]) => sp('slime', x, y, '#6fcf5a'));
      [[8, 29], [17, 33], [14, 27]].forEach(([x, y]) => sp('bat', x, y));
      [[29, 28], [36, 26], [32, 31]].forEach(([x, y]) => sp('slime', x, y, '#f87171'));
      [[27, 33], [38, 24]].forEach(([x, y]) => sp('bat', x, y));
      [[46, 36], [49, 31], [56, 33]].forEach(([x, y]) => sp('slime', x, y, '#a3e635'));
      [[47, 28], [57, 28], [50, 38]].forEach(([x, y]) => sp('sentinel', x, y));
      [[45, 30], [58, 26]].forEach(([x, y]) => sp('bat', x, y));
      [[26, 16], [38, 16], [26, 20], [38, 20]].forEach(([x, y]) => sp('knight', x, y));
      [[22, 18], [42, 14]].forEach(([x, y]) => sp('sentinel', x, y));
      sp('bat', 32, 14);

      if (!flags.boss1) enemies.push(makeBoss('boss1', 12 * T + 16, 28 * T));
      if (!flags.boss2) enemies.push(makeBoss('boss2', 52 * T + 16, 28 * T));
      if (!flags.boss3) enemies.push(makeBoss('boss3', 32 * T + 16, 16 * T));
    } else {
      // ATO 2: TORRE NO MAR
      props.push({ kind: 'sphereCore', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 44 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('seaKey', 56, 26, 'key');
      ch('seaHeart1', 7, 38, 'heart');
      ch('seaHeart2', 57, 38, 'heart');
      ch('seaPotions', 26, 38, 'potion', 2);
      ch('towerGems', 23, 13, 'spheres', 25);

      npcs.push({ id: 'captain', name: 'Capitão Corvo', x: 34 * T + 16, y: 42 * T + 8, dir: 'left', pal: { hair: '#1e293b', coat: '#1e3a8a', trim: '#eab308', skin: '#e6b89c', horn: '#1e3a8a', mask: false } });
      npcs.push({ id: 'mate2', name: mateName, x: 30 * T + 16, y: 40 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 36 * T + 16, y: 38 * T + 8, dir: 'down', pal: { hair: '#fb923c', coat: '#78350f', trim: '#facc15', skin: '#e6b89c', horn: '#92400e', mask: false } });

      sg(30, 38, 'Torre no Mar — Berço dos Didalmianos. Oeste: Ilha da Tempestade. Leste: Ilha da Maré. Norte: Cidadela das Esferas.');
      sg(30, 24, 'Portão da Cidadela. Procure a Chave do Mar na Ilha da Maré (Leste).');

      ensureClear();

      [[10, 38], [15, 36], [8, 33]].forEach(([x, y]) => sp('stormling', x, y, '#38bdf8'));
      [[16, 28], [9, 26]].forEach(([x, y]) => sp('sentinel', x, y));
      [[48, 37], [55, 36], [53, 33]].forEach(([x, y]) => sp('corsair', x, y, '#0284c7'));
      [[47, 29], [56, 30]].forEach(([x, y]) => sp('stormling', x, y, '#06b6d4'));
      [[25, 16], [39, 16], [26, 20], [38, 20]].forEach(([x, y]) => sp('corsair', x, y, '#1d4ed8'));
      [[23, 18], [41, 14]].forEach(([x, y]) => sp('sentinel', x, y));

      if (!flags.stormBoss) enemies.push(makeBoss('stormBoss', 12 * T + 16, 30 * T));
      if (!flags.tideBoss) enemies.push(makeBoss('tideBoss', 52 * T + 16, 30 * T));
    }

    const spPos = spawnPos || (act === 1 ? SPAWN_ACT1 : SPAWN_ACT2);
    P.x = spPos.x;
    P.y = spPos.y;
    if (blocked(P.x, P.y, P.hw, P.hh)) {
      const defSp = act === 1 ? SPAWN_ACT1 : SPAWN_ACT2;
      P.x = defSp.x;
      P.y = defSp.y;
    }
    buildMini();
    fade = 1;
    camX = clamp(P.x - VW / 2, 0, MW * T - VW);
    camY = clamp(P.y - VH / 2, 0, MH * T - VH);
  }

  /* ------------------------------ jogador & save ------------------------------ */
  function newPlayer(stats) {
    return {
      x: SPAWN_ACT1.x, y: SPAWN_ACT1.y, dir: 'up', hw: 8, hh: 8,
      hp: stats.maxHp, maxHp: stats.maxHp, level: stats.level, exp: stats.exp, expToNext: stats.expToNext,
      atq: stats.atq, def: stats.def, spd: stats.spd,
      atkT: 0, atkCd: 0, shotCd: 0, dashT: 0, dashCd: 0, inv: 0, kx: 0, ky: 0, kT: 0, dvx: 0, dvy: 0,
      hit: new Set(), moving: false, anim: 0, keys: 0, gems: 10, orbs: 0, seals: 0, potions: 1,
      upgrades: { weapon: 0, armor: 0, boots: 0 }
    };
  }

  function saveKey() { return 'rpg_save_' + charId; }

  function saveGame() {
    if (!P) return;
    try {
      const s = {
        act,
        stats: { level: P.level, exp: P.exp, expToNext: P.expToNext, maxHp: P.maxHp, atq: P.atq, def: P.def, spd: P.spd },
        hp: P.hp, keys: P.keys, gems: P.gems, orbs: P.orbs, seals: P.seals, potions: P.potions,
        upgrades: P.upgrades, flags, x: P.x, y: P.y
      };
      localStorage.setItem(saveKey(), JSON.stringify(s));
    } catch (e) { /* ignore */ }
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(saveKey()) || 'null'); } catch (e) { return null; }
  }

  function start(id, fresh) {
    charId = RPG_CHAR[id] ? id : 'nicolas';
    mateId = charId === 'nicolas' ? 'nicks' : 'nicolas';
    heroName = env.Chars[charId].name;
    mateName = env.Chars[mateId].name;

    if (fresh) localStorage.removeItem(saveKey());
    const sv = loadSave();
    const base = env.Chars[charId].stats;

    flags = Object.assign({ chests: [], gates: [], gates2: [] }, sv && sv.flags ? sv.flags : {});
    flags.chests = flags.chests || [];
    flags.gates = flags.gates || [];
    flags.gates2 = flags.gates2 || [];

    P = newPlayer(sv ? sv.stats : base);
    if (sv) {
      P.hp = clamp(sv.hp || P.maxHp, 1, P.maxHp);
      P.keys = sv.keys || 0;
      P.gems = sv.gems != null ? sv.gems : 10;
      P.orbs = sv.orbs || 0;
      P.seals = sv.seals || 0;
      P.potions = sv.potions != null ? sv.potions : 1;
      P.upgrades = Object.assign({ weapon: 0, armor: 0, boots: 0 }, sv.upgrades || {});
    }

    const startAct = sv && sv.act === 2 ? 2 : 1;
    loadAct(startAct, sv && sv.x ? { x: sv.x, y: sv.y } : null);

    toasts = [];
    dlg = null;
    shop = null;
    paused = false;
    deadT = 0;
    winT = 0;
    time = 0;
    active = true;

    if (!flags.introSeen) {
      flags.introSeen = true;
      saveGame();
      say('Crônicas das Árvores de Arcano', W.INTRO_LINES(heroName, mateName));
    } else {
      toast(act === 2 ? 'Ato 2: Torre no Mar retomado!' : 'Aventura retomada!');
    }
  }

  function stop() { saveGame(); active = false; }
  function restart() { start(charId, true); }
  function setPaused(v) { paused = v; }
  function toast(text) { toasts.push({ text, t: 3.2 }); if (toasts.length > 3) toasts.shift(); }
  function popup(x, y, text, color) { popups.push({ x, y, text, color: color || '#fde047', life: 0.9 }); }
  function burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2;
      const s = 40 + rr() * 120;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color, size: 3 });
    }
  }

  function addExp(n) {
    P.exp += n;
    while (P.exp >= P.expToNext) {
      P.exp -= P.expToNext;
      P.level++;
      P.expToNext = Math.round(P.expToNext * 1.35);
      P.maxHp += 15;
      P.hp = P.maxHp;
      P.atq += 3;
      P.def += 2;
      P.spd += 1;
      env.Audio.levelUp();
      toast('Nível ' + P.level + '! Atributos aumentados.');
    }
  }

  function usePotion() {
    if (P.potions <= 0) { toast('Sem Poções de Esfera! Compre com o Armeiro Bram.'); return; }
    if (P.hp >= P.maxHp) { toast('Sua vida já está cheia!'); return; }
    P.potions--;
    const heal = Math.min(60, P.maxHp - P.hp);
    P.hp += heal;
    env.Audio.levelUp();
    popup(P.x, P.y - 20, '+' + heal + ' HP', '#4ade80');
    burst(P.x, P.y, '#4ade80', 12);
    saveGame();
  }

  function hurtPlayer(raw, sx, sy) {
    if (P.inv > 0 || P.dashT > 0 || deadT > 0) return;
    const dmg = Math.max(4, Math.round(raw - P.def * 0.4));
    P.hp = Math.max(0, P.hp - dmg);
    P.inv = 1.0;
    const a = Math.atan2(P.y - sy, P.x - sx);
    P.kx = Math.cos(a) * 220;
    P.ky = Math.sin(a) * 220;
    P.kT = 0.16;
    env.Audio.hit();
    popup(P.x, P.y - 18, '-' + dmg, '#f87171');
    burst(P.x, P.y, '#ef4444', 6);
    if (P.hp <= 0) { deadT = 1.8; toast(heroName + ' desmaiou...'); }
  }

  function respawn() {
    P.hp = P.maxHp;
    const sp = act === 1 ? SPAWN_ACT1 : SPAWN_ACT2;
    P.x = sp.x;
    P.y = sp.y;
    P.inv = 1.5;
    P.kT = 0;
    deadT = 0;
    fade = 1;
    eprojs = [];
    toast(act === 2 ? 'Você acordou no cais da Torre no Mar.' : 'Você acordou na Vila Didalmiana.');
    saveGame();
  }

  /* ------------------------------ dialogo & loja ------------------------------ */
  function say(name, lines, onEnd) {
    dlg = { name, lines, i: 0, shown: 0, onEnd };
  }

  function openShop() {
    shop = { idx: 0 };
  }

  function buyShopItem(idx) {
    const it = W.SHOP_ITEMS[idx];
    if (!it) return;
    const lvl = it.id === 'potion' ? 0 : (P.upgrades[it.id] || 0);
    if (it.id !== 'potion' && lvl >= it.max) {
      toast('Equipamento já está no nível máximo!');
      return;
    }
    const cost = it.id === 'potion' ? it.cost : it.cost + lvl * 8;
    if (P.gems < cost) {
      toast('Esferas insuficientes! Precisa de ' + cost + '.');
      env.Audio.hit();
      return;
    }
    P.gems -= cost;
    if (it.id === 'potion') {
      P.potions++;
      toast('Comprou Poção de Esfera! (Use com Q)');
    } else if (it.id === 'weapon') {
      P.upgrades.weapon++;
      P.atq += 5;
      toast('Arma reforjada! ATQ +5');
    } else if (it.id === 'armor') {
      P.upgrades.armor++;
      P.def += 4;
      toast('Manto Arcano reforçado! DEF +4');
    } else if (it.id === 'boots') {
      P.upgrades.boots++;
      P.spd += 3;
      toast('Botas do Saci equipadas! SPD +3');
    }
    env.Audio.levelUp();
    saveGame();
  }

  function npcLines(id) {
    if (id === 'elder') {
      if (flags.towerBoss) return ['Você purificou tanto o Continente quanto a Torre no Mar, ' + heroName + '! Os Didalmianos celebrarão sua lenda!'];
      if (flags.final) return [
        'Incrível, ' + heroName + '! A Árvore Ancestral voltou a respirar... mas a corrupção veio do oceano!',
        'Nossa antiga casa — a Torre no Mar — teve suas Esferas Mágicas tomadas pelo Soberano das Esferas.',
        'A Barca Arcana no Cais Sul da vila já está liberada. Embarque para o Ato 2!'
      ];
      if (!flags.met) {
        flags.met = true;
        saveGame();
        return [
          heroName + '! O Cataclisma partiu o mundo e corrompeu as Árvores de Arcano.',
          'Três Guardiões protegem os Orbes Arcanos: o da Brisa (oeste), o do Pântano (leste) e o da Forja (ruínas ao norte).',
          'Reúna os 3 Orbes e leve-os à Árvore Ancestral, no extremo norte. Visite também o Armeiro Bram para melhorar seu equipamento!'
        ];
      }
      if (P.orbs >= 3) return ['Você tem os 3 Orbes Arcanos! Leve-os à Árvore Ancestral, ao norte das ruínas.'];
      return ['Ainda faltam ' + (3 - P.orbs) + ' Orbe(s) Arcano(s). Procure Chaves nos baús e use Poções com a tecla Q!'];
    }
    if (id === 'healer') {
      if (P.hp >= P.maxHp) return ['Você já está inteiro! Volte quando precisar de cura.'];
      if (P.gems >= 5) {
        P.gems -= 5; P.hp = P.maxHp; env.Audio.levelUp(); saveGame();
        return ['Pronto! Cobrei 5 Esferas e restaurei toda a sua energia vital.'];
      }
      return ['Curo seus ferimentos por 5 Esferas. Corte arbustos ou derrote monstros para juntar mais!'];
    }
    if (id === 'mate') {
      if (flags.act2Unlocked) return ['Hehe, sabia que você ia dar conta do Guardião do Cataclisma! Te encontro no cais da Torre no Mar — vamos aprontar lá também!'];
      if (flags.mateQuestDone) return ['Com a barca reforçada, só falta você purificar a Árvore Ancestral ao norte. Não vá perder a graça sem mim!'];
      if (P.gems >= 15 && flags.mateQuest) {
        flags.mateQuestDone = true;
        P.potions += 2;
        addExp(60);
        saveGame();
        return [
          'Boa, ' + heroName + '! Essas 15 Esferas já garantem a magia da nossa Barca Arcana (pode ficar com elas para a loja do Bram!).',
          'Toma aqui 2 Poções de Esfera que escondi dos guardas — coisa de Didalmiano, hehe!'
        ];
      }
      flags.mateQuest = true;
      saveGame();
      return [
        'Ei, ' + heroName + '! Acha mesmo que vai explorar as Árvores de Arcano sozinho?',
        'Missão rápida de Didalmiano: junte 15 Esferas Mágicas e me mostre aqui. Tenho 2 Poções escondidas pra você!'
      ];
    }
    if (id === 'mate2') {
      if (flags.towerBoss) return ['Mandou bem demais, ' + heroName + '! A Torre no Mar voltou a ser nossa!'];
      return [
        'Olha só a nossa velha Torre no Mar... cheia de Sentinelas e Corsários Arcanos.',
        'Derrube o Guardião da Tempestade (Oeste) e o da Maré (Leste) para liberar o Núcleo das Esferas ao norte!'
      ];
    }
    if (id === 'captain') {
      return ['Mar calmo, marujo! Quer navegar de volta para a Vila Didalmiana no Continente?'];
    }
    if (id === 'sage') {
      if (!flags.chests.includes('forestKey')) return ['Há uma Chave num baú ao lado do caminho da floresta, a oeste.'];
      if (!flags.chests.includes('swampKey')) return ['O Pântano esconde outra Chave, num baú perto do Guardião.'];
      return ['Dica: use a tecla Q (ou 🧪) para beber uma Poção de Esfera durante batalhas difíceis!'];
    }
    return ['...'];
  }

  /* ------------------------------ interacao ------------------------------ */
  function floodOpen(sx, sy) {
    const st = [[sx, sy]];
    while (st.length) {
      const [x, y] = st.pop();
      if (tileAt(x, y) !== GATE) continue;
      setTile(x, y, tileAt(x, y - 1) === WALL || tileAt(x, y + 1) === WALL ? FLOOR : PATH);
      st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  function findGateStart(sx, sy) {
    let x = sx; let y = sy;
    while (tileAt(x - 1, y) === GATE) x--;
    while (tileAt(x, y - 1) === GATE) y--;
    return [x, y];
  }

  function nearbyHint() {
    if (dlg || shop) return null;
    const d = DIRS[P.dir];
    const fx = P.x + d[0] * 20;
    const fy = P.y + d[1] * 20;
    for (const n of npcs) if (dist(fx, fy, n.x, n.y) < 34) return n.id === 'shop' ? '[Espaço] Loja do Bram' : '[Espaço] Falar com ' + n.name;
    for (const c of chests) if (!c.opened && dist(fx, fy, c.x * T + 16, c.y * T + 16) < 30) return '[Espaço] Abrir Baú';
    for (const s of signs) if (dist(fx, fy, s.x * T + 16, s.y * T + 16) < 30) return '[Espaço] Ler Placa';
    const boat = props.find((p) => p.kind === 'boat');
    if (boat && dist(P.x, P.y, boat.x + 20, boat.y + 12) < 56) {
      return act === 1 ? (flags.act2Unlocked ? '[Espaço] Navegar p/ Torre no Mar (Ato 2)' : 'Barca trancada (Conclua o Ato 1)') : '[Espaço] Voltar p/ Vila (Ato 1)';
    }
    const altar = props[0];
    if (altar && dist(P.x, P.y, altar.x + 48, altar.y + 80) < 100) {
      return act === 1 ? '[Espaço] Árvore Ancestral' : '[Espaço] Núcleo das Esferas';
    }
    if (tileAt(Math.floor(fx / T), Math.floor(fy / T)) === GATE) return '[Espaço] Abrir Portão (Chave)';
    return null;
  }

  function interact() {
    const d = DIRS[P.dir];
    const fx = P.x + d[0] * 20;
    const fy = P.y + d[1] * 20;

    for (const c of chests) {
      if (dist(fx, fy, c.x * T + 16, c.y * T + 16) < 28 && !c.opened) {
        c.opened = true;
        flags.chests.push(c.id);
        env.Audio.sphere();
        if (c.item === 'key') { P.keys++; toast('Você obteve uma Chave!'); }
        else if (c.item === 'heart') { P.maxHp += 20; P.hp = P.maxHp; toast('Coração Arcano! Vida máxima +20.'); env.Audio.levelUp(); }
        else if (c.item === 'potion') { P.potions += (c.n || 1); toast('Você obteve ' + (c.n || 1) + ' Poção(ões) de Esfera!'); }
        else { P.gems += c.n; toast('Você obteve ' + c.n + ' Esferas!'); }
        saveGame();
        return true;
      }
    }

    for (const n of npcs) {
      if (dist(fx, fy, n.x, n.y) < 32) {
        const ddx = P.x - n.x; const ddy = P.y - n.y;
        n.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'down' : 'up';
        if (n.id === 'shop') { openShop(); return true; }
        if (n.id === 'captain') {
          say(n.name, npcLines(n.id), () => { loadAct(1, { x: 32 * T + 16, y: 44 * T }); saveGame(); toast('De volta à Vila Didalmiana!'); });
          return true;
        }
        say(n.name, npcLines(n.id));
        return true;
      }
    }

    for (const s of signs) {
      if (dist(fx, fy, s.x * T + 16, s.y * T + 16) < 28) { say('Placa', [s.text]); return true; }
    }

    // Barca (transicao Ato 1 <-> Ato 2)
    const boat = props.find((p) => p.kind === 'boat');
    if (boat && dist(P.x, P.y, boat.x + 20, boat.y + 12) < 56) {
      if (act === 1) {
        if (flags.act2Unlocked) {
          say('Barca Arcana', ['Içando velas rumo à Torre no Mar — Ato 2!'], () => {
            loadAct(2, SPAWN_ACT2);
            saveGame();
            toast('Bem-vindo ao Ato 2: Torre no Mar!');
          });
        } else {
          say('Barca Arcana', ['As correntes marítimas estão furiosas. Purifique primeiro a Árvore Ancestral ao norte (Ato 1)!']);
        }
      } else {
        say('Barca Arcana', ['Voltando para a Vila Didalmiana no Continente...'], () => {
          loadAct(1, { x: 32 * T + 16, y: 44 * T });
          saveGame();
        });
      }
      return true;
    }

    const tx = Math.floor(fx / T);
    const ty = Math.floor(fy / T);
    if (tileAt(tx, ty) === GATE) {
      if (P.keys > 0) {
        P.keys--;
        const g = findGateStart(tx, ty);
        (act === 1 ? flags.gates : flags.gates2).push(g);
        floodOpen(g[0], g[1]);
        env.Audio.levelUp();
        toast('Portão aberto!');
        saveGame();
      } else {
        toast('Trancado. Você precisa de uma Chave.');
      }
      return true;
    }

    // Altar / Nucleo
    const altar = props[0];
    if (altar && dist(P.x, P.y, altar.x + 48, altar.y + 80) < 100) {
      if (act === 1) {
        if (flags.final) {
          say('Árvore Ancestral', ['A Árvore Ancestral brilha em paz! Navegue pelo Cais Sul da vila até a Torre no Mar (Ato 2).']);
        } else if (flags.finalStart) {
          toast('O Guardião do Cataclisma já despertou!');
        } else if (P.orbs < 3) {
          say('Árvore Ancestral', ['A árvore pulsa fracamente... Faltam ' + (3 - P.orbs) + ' Orbe(s) Arcano(s).']);
        } else {
          say('Árvore Ancestral', ['Os 3 Orbes Arcanos brilham em suas mãos...', 'O Guardião do Cataclisma desperta das raízes!'], () => {
            flags.finalStart = true;
            enemies.push(makeBoss('final', 32 * T + 16, 7 * T + 8));
            env.Audio.hit();
          });
        }
      } else {
        if (flags.towerBoss) {
          say('Núcleo das Esferas', ['As Esferas Mágicas da Torre no Mar foram purificadas!']);
        } else if (flags.towerBossStart) {
          toast('O Soberano das Esferas já despertou!');
        } else if (P.seals < 2) {
          say('Núcleo das Esferas', ['O Núcleo está selado. Derrote os Guardiões da Tempestade (Oeste) e da Maré (Leste) — Selos: ' + P.seals + '/2.']);
        } else {
          say('Núcleo das Esferas', ['Os 2 Selos do Mar rompem a barreira arcana...', 'O Soberano das Esferas emerge do topo da Torre!'], () => {
            flags.towerBossStart = true;
            enemies.push(makeBoss('towerBoss', 32 * T + 16, 7 * T + 8));
            env.Audio.hit();
          });
        }
      }
      return true;
    }
    return false;
  }

  /* ------------------------------ combate ------------------------------ */
  function swordBox() {
    const d = DIRS[P.dir];
    const ch = RPG_CHAR[charId];
    const L = ch.reach; const Wd = ch.width;
    if (d[0] > 0) return { x: P.x + 2, y: P.y - Wd / 2, w: L, h: Wd };
    if (d[0] < 0) return { x: P.x - 2 - L, y: P.y - Wd / 2, w: L, h: Wd };
    if (d[1] > 0) return { x: P.x - Wd / 2, y: P.y + 2, w: Wd, h: L };
    return { x: P.x - Wd / 2, y: P.y - 2 - L, w: Wd, h: L };
  }

  function boxHitsEnemy(b, e) {
    const h = e.size / 2;
    return b.x < e.x + h && b.x + b.w > e.x - h && b.y < e.y + h && b.y + b.h > e.y - h;
  }

  function startAttack() {
    P.atkT = 0.22; P.atkCd = 0.3; P.hit.clear();
    env.Audio.slash();
    const b = swordBox();
    for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h) / T); ty++) {
      for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w) / T); tx++) {
        if (tileAt(tx, ty) === BUSH) {
          setTile(tx, ty, GRASS);
          burst(tx * T + 16, ty * T + 16, '#34d399', 8);
          const r = rr();
          if (r < 0.3) drops.push({ x: tx * T + 16, y: ty * T + 16, type: 'heart', t: 0 });
          else if (r < 0.65) drops.push({ x: tx * T + 16, y: ty * T + 16, type: 'gem', t: 0 });
        }
      }
    }
  }

  function damageEnemy(e, dmg, ax, ay) {
    e.hp -= dmg; e.flash = 0.14;
    popup(e.x, e.y - e.size / 2, '-' + dmg, '#fde047');
    burst(e.x, e.y, '#facc15', 5);
    if (!e.boss) {
      const a = Math.atan2(e.y - ay, e.x - ax);
      e.kx = Math.cos(a) * 200; e.ky = Math.sin(a) * 200; e.kT = 0.14;
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    enemies = enemies.filter((x) => x !== e);
    burst(e.x, e.y, '#ef4444', 14);
    env.Audio.stomp();
    addExp(e.exp);
    popup(e.x, e.y - 20, '+' + e.exp + ' EXP', '#38bdf8');
    if (e.boss) {
      for (let i = 0; i < 4; i++) drops.push({ x: e.x + (i - 1.5) * 18, y: e.y + 16, type: 'heart', t: 0 });
      if (e.key === 'final') {
        flags.final = true;
        flags.act2Unlocked = true;
        env.Audio.win();
        say('Árvore Ancestral', [
          'O Guardião do Cataclisma foi purificado! A luz das Árvores de Arcano volta ao continente.',
          'Mas uma sombra antiga ainda pulsa no horizonte... A TORRE NO MAR, berço dos Didalmianos!',
          'ATO 2 DESBLOQUEADO: Vá até a Barca Arcana no Cais Sul da Vila Didalmiana para zarpar!'
        ]);
      } else if (e.key === 'towerBoss') {
        flags.towerBoss = true;
        env.Audio.win();
        say('Núcleo das Esferas', [
          'O Soberano das Esferas caiu! As Esferas Mágicas concentradas brilham em harmonia pela Torre no Mar.',
          heroName + ' e ' + mateName + ' salvaram o novo mundo das Árvores de Arcano!'
        ], () => { winT = 2.0; });
      } else if (e.key === 'stormBoss' || e.key === 'tideBoss') {
        flags[e.key] = true;
        P.seals++;
        env.Audio.win();
        toast('Selo da ' + W.BOSS_DEF[e.key].orb + ' obtido! (' + P.seals + '/2)');
      } else {
        flags[e.key] = true;
        P.orbs++;
        env.Audio.win();
        toast('Orbe Arcano da ' + W.BOSS_DEF[e.key].orb + ' obtido! (' + P.orbs + '/3)');
      }
      saveGame();
    } else {
      const r = rr();
      if (r < 0.4) drops.push({ x: e.x, y: e.y, type: 'gem', t: 0 });
      else if (r < 0.56) drops.push({ x: e.x, y: e.y, type: 'heart', t: 0 });
    }
  }

  function shootEnemy(e, speed, dmg, color, ang) {
    eprojs.push({ x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 6, dmg, color, life: 3 });
  }

  /* ------------------------------ update ------------------------------ */
  function updateEnemy(e, dt) {
    if (e.flash > 0) e.flash -= dt;
    const hw = e.size / 2 - 3;
    if (e.kT > 0) { e.kT -= dt; moveBox(e, e.kx * dt, e.ky * dt, hw, hw, e.fly); return; }
    const dx = P.x - e.x; const dy = P.y - e.y; const dd = Math.hypot(dx, dy) || 1;

    if (e.type === 'slime' || e.type === 'knight' || e.type === 'corsair') {
      const chase = dd < (e.type === 'slime' ? 170 : 230);
      if (chase) {
        moveBox(e, (dx / dd) * e.speed * 1.25 * dt, 0, hw, hw);
        moveBox(e, 0, (dy / dd) * e.speed * 1.25 * dt, hw, hw);
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 0.8 + rr() * 1.5;
          const a = rr() * Math.PI * 2; const still = rr() < 0.3;
          e.wx = still ? 0 : Math.cos(a); e.wy = still ? 0 : Math.sin(a);
        }
        moveBox(e, e.wx * e.speed * 0.6 * dt, e.wy * e.speed * 0.6 * dt, hw, hw);
      }
    } else if (e.type === 'bat' || e.type === 'stormling') {
      e.phase += dt * 5;
      if (dd < 260) {
        const a = Math.atan2(dy, dx) + Math.sin(e.phase) * 0.85;
        moveBox(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, 0, 0, true);
      } else {
        moveBox(e, Math.cos(e.phase * 0.4) * 30 * dt, Math.sin(e.phase * 0.5) * 30 * dt, 0, 0, true);
      }
    } else if (e.type === 'sentinel') {
      e.shootT -= dt;
      if (dd < 290 && e.shootT <= 0) {
        e.shootT = 2.0;
        shootEnemy(e, 195, e.dmg, '#f43f5e', Math.atan2(dy, dx));
      }
    } else if (e.boss) {
      updateBoss(e, dt, dx, dy, dd);
    }

    if (dd < e.size / 2 + P.hw - 2) hurtPlayer(e.dmg, e.x, e.y);
  }

  function updateBoss(e, dt, dx, dy, dd) {
    const def = W.BOSS_DEF[e.key];
    const rage = e.hp < e.maxHp * 0.5 ? 1.35 : 1;
    const hw = e.size / 2 - 6;
    e.patT -= dt * rage;
    if (e.state === 'idle') {
      if (dd > 80) { moveBox(e, (dx / dd) * e.speed * dt, 0, hw, hw); moveBox(e, 0, (dy / dd) * e.speed * dt, hw, hw); }
      if (e.patT <= 0) { const pat = def.patterns[e.pat % def.patterns.length]; e.pat++; e.state = pat; e.stT = 0; }
    } else if (e.state === 'dash') {
      e.stT += dt;
      if (e.stT < 0.6) { e.dvx = dx / dd; e.dvy = dy / dd; }
      else if (e.stT < 1.2) { moveBox(e, e.dvx * e.speed * 4.2 * dt, 0, hw, hw); moveBox(e, 0, e.dvy * e.speed * 4.2 * dt, hw, hw); }
      else { e.state = 'idle'; e.patT = 1.8; }
    } else if (e.state === 'fan') {
      e.stT += dt;
      if (e.stT > 0.5 && !e.fired) {
        e.fired = true; const base = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) shootEnemy(e, 205, def.dmg - 4, def.color, base + i * 0.28);
        env.Audio.shoot();
      }
      if (e.stT > 1.0) { e.fired = false; e.state = 'idle'; e.patT = 1.8; }
    } else if (e.state === 'ring') {
      e.stT += dt;
      if (e.stT > 0.6 && !e.fired) {
        e.fired = true; const off = rr();
        for (let i = 0; i < 14; i++) shootEnemy(e, 175, def.dmg - 6, def.color, off + (i / 14) * Math.PI * 2);
        env.Audio.shoot();
      }
      if (e.stT > 1.1) { e.fired = false; e.state = 'idle'; e.patT = 2.0; }
    } else if (e.state === 'summon') {
      e.stT += dt;
      if (e.stT > 0.6 && !e.fired) {
        e.fired = true;
        if (enemies.filter((x) => !x.boss).length < 9) {
          [[-1, 0], [1, 0]].forEach(([sx]) => {
            const f = findFree(Math.floor((e.x + sx * 70) / T), Math.floor(e.y / T));
            const sub = act === 2 ? 'stormling' : (e.key === 'final' ? 'knight' : 'slime');
            enemies.push(makeEnemy(sub, f.x, f.y, def.color));
          });
        }
        burst(e.x, e.y, def.color, 16);
      }
      if (e.stT > 1.0) { e.fired = false; e.state = 'idle'; e.patT = 2.2; }
    }
  }

  function update(dt) {
    if (!active || paused) return;
    time += dt;
    const is = env.isJust;
    const dn = env.isDown;

    if (fade > 0) fade = Math.max(0, fade - dt * 1.4);
    if (winT > 0) { winT -= dt; if (winT <= 0) { saveGame(); env.onWin(); return; } }

    ['atkT', 'atkCd', 'shotCd', 'dashT', 'dashCd', 'inv'].forEach((k) => { if (P[k] > 0) P[k] -= dt; });
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) respawn(); return; }

    // Menu da Loja
    if (shop) {
      if (is('ArrowUp', 'KeyW')) shop.idx = (shop.idx + W.SHOP_ITEMS.length - 1) % W.SHOP_ITEMS.length;
      if (is('ArrowDown', 'KeyS')) shop.idx = (shop.idx + 1) % W.SHOP_ITEMS.length;
      if (is('Space', 'Enter', 'KeyE')) buyShopItem(shop.idx);
      if (is('KeyJ', 'KeyZ', 'KeyX', 'KeyL', 'ShiftLeft', 'ShiftRight')) shop = null;
      return;
    }

    // Dialogo
    if (dlg) {
      const line = dlg.lines[dlg.i];
      dlg.shown = Math.min(line.length, dlg.shown + dt * 65);
      if (is('Space', 'KeyE', 'Enter', 'KeyJ', 'KeyZ')) {
        if (dlg.shown < line.length) dlg.shown = line.length;
        else if (dlg.i < dlg.lines.length - 1) { dlg.i++; dlg.shown = 0; }
        else { const cb = dlg.onEnd; dlg = null; if (cb) cb(); }
      }
      return;
    }

    // Pocao (Q)
    if (is('KeyQ')) usePotion();

    // Movimento
    let dx = (dn('ArrowRight', 'KeyD') ? 1 : 0) - (dn('ArrowLeft', 'KeyA') ? 1 : 0);
    let dy = (dn('ArrowDown', 'KeyS') ? 1 : 0) - (dn('ArrowUp', 'KeyW') ? 1 : 0);
    P.moving = dx !== 0 || dy !== 0;
    if (P.moving) {
      P.anim += dt;
      if (dx !== 0 && dy === 0) P.dir = dx > 0 ? 'right' : 'left';
      else if (dy !== 0 && dx === 0) P.dir = dy > 0 ? 'down' : 'up';
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    }

    if (is('Space', 'KeyE', 'Enter')) { if (interact()) return; }
    if (is('KeyJ', 'KeyZ') && P.atkCd <= 0) startAttack();
    if (is('KeyL', 'KeyX') && P.shotCd <= 0) {
      P.shotCd = 0.48;
      const d = DIRS[P.dir]; const ch = env.Chars[charId];
      pprojs.push({
        x: P.x + d[0] * 12, y: P.y + d[1] * 12, vx: d[0] * 380, vy: d[1] * 380, r: 6,
        dmg: Math.round(P.atq * ch.shotMult), color: ch.shotColor, life: 0.8
      });
      env.Audio.shoot();
    }
    if (is('ShiftLeft', 'ShiftRight', 'KeyK') && P.dashCd <= 0) {
      P.dashT = 0.18; P.dashCd = 0.7;
      const d = DIRS[P.dir];
      P.dvx = P.moving ? dx : d[0]; P.dvy = P.moving ? dy : d[1];
      env.Audio.dash();
      burst(P.x, P.y, env.Chars[charId].accent, 8);
    }

    const base = 96 + P.spd * 6;
    if (P.kT > 0) { P.kT -= dt; moveBox(P, P.kx * dt, P.ky * dt, P.hw, P.hh); }
    else if (P.dashT > 0) { moveBox(P, P.dvx * 420 * dt, P.dvy * 420 * dt, P.hw, P.hh); }
    else {
      const sp = P.atkT > 0 ? base * 0.45 : base;
      moveBox(P, dx * sp * dt, 0, P.hw, P.hh);
      moveBox(P, 0, dy * sp * dt, P.hw, P.hh);
    }

    if (P.atkT > 0) {
      const b = swordBox();
      for (const e of enemies.slice()) {
        if (!P.hit.has(e.id) && boxHitsEnemy(b, e)) { P.hit.add(e.id); damageEnemy(e, P.atq + 6, P.x, P.y); }
      }
    }

    for (const e of enemies.slice()) updateEnemy(e, dt);

    for (const p of pprojs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (solidTile(p.x, p.y)) p.life = 0;
      for (const e of enemies.slice()) {
        if (p.life > 0 && dist(p.x, p.y, e.x, e.y) < p.r + e.size / 2) { p.life = 0; damageEnemy(e, p.dmg, p.x - p.vx, p.y - p.vy); }
      }
    }
    pprojs = pprojs.filter((p) => p.life > 0);

    for (const p of eprojs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (solidTile(p.x, p.y)) p.life = 0;
      if (p.life > 0 && dist(p.x, p.y, P.x, P.y) < p.r + P.hw) { p.life = 0; hurtPlayer(p.dmg, p.x - p.vx, p.y - p.vy); }
    }
    eprojs = eprojs.filter((p) => p.life > 0);

    for (const d of drops) {
      d.t += dt;
      if (dist(d.x, d.y, P.x, P.y) < 18) {
        d.t = 999;
        if (d.type === 'heart') { P.hp = Math.min(P.maxHp, P.hp + 15); popup(P.x, P.y - 18, '+15 HP', '#4ade80'); }
        else { P.gems++; popup(P.x, P.y - 18, '+1 Esfera', '#38bdf8'); }
        env.Audio.sphere();
      }
    }
    drops = drops.filter((d) => d.t < 14);
    parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    parts = parts.filter((p) => p.life > 0);
    popups.forEach((p) => { p.y -= 30 * dt; p.life -= dt; });
    popups = popups.filter((p) => p.life > 0);
    toasts.forEach((t) => (t.t -= dt));
    toasts = toasts.filter((t) => t.t > 0);

    const tx = clamp(P.x - VW / 2, 0, MW * T - VW);
    const ty = clamp(P.y - VH / 2, 0, MH * T - VH);
    camX += (tx - camX) * Math.min(1, dt * 8);
    camY += (ty - camY) * Math.min(1, dt * 8);
  }

  /* ------------------------------ desenho ------------------------------ */
  function drawHero(c, x, y, dir, pal, t, moving, atk, isPlayer) {
    c.save();
    c.translate(x, y - 6);
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath(); c.ellipse(0, 15, 11, 4, 0, 0, Math.PI * 2); c.fill();

    const step = moving ? Math.sin(t * 14) * 3 : 0;
    const out = '#14100a';
    c.fillStyle = '#3b2a1c'; c.strokeStyle = out; c.lineWidth = 1.2;
    c.fillRect(-6, 9, 5, 6 + step * 0.5); c.fillRect(1, 9, 5, 6 - step * 0.5);

    const side = dir === 'left' || dir === 'right';
    const flip = dir === 'left' ? -1 : 1;
    c.scale(side ? flip : 1, 1);

    c.fillStyle = pal.horn; c.strokeStyle = out;
    c.beginPath(); c.moveTo(-8, -14); c.lineTo(-11, -26); c.lineTo(-2, -18); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(8, -14); c.lineTo(11, -26); c.lineTo(2, -18); c.closePath(); c.fill(); c.stroke();

    c.fillStyle = pal.coat; c.beginPath(); c.roundRect(-9, -5, 18, 17, 4); c.fill(); c.stroke();
    c.fillStyle = pal.trim; c.fillRect(-9, 8, 18, 2);
    if (dir === 'down') c.fillRect(-1, -4, 2, 12);
    c.fillStyle = '#5a3418'; c.fillRect(-9, 3, 18, 3);

    c.fillStyle = pal.skin; c.beginPath(); c.arc(0, -11, 9, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-8, -12); c.lineTo(-15, -15); c.lineTo(-8, -8); c.closePath(); c.fill(); c.stroke();
    if (!side) { c.beginPath(); c.moveTo(8, -12); c.lineTo(15, -15); c.lineTo(8, -8); c.closePath(); c.fill(); c.stroke(); }

    c.fillStyle = pal.hair; c.beginPath();
    if (dir === 'up') c.arc(0, -11, 9.5, 0, Math.PI * 2);
    else { c.arc(0, -12, 9.5, Math.PI, Math.PI * 2); c.lineTo(8, -10); c.quadraticCurveTo(0, -14, -8, -10); }
    c.closePath(); c.fill(); c.stroke();

    if (dir === 'down') {
      c.fillStyle = '#16a34a'; c.fillRect(-5, -11, 3, 4); c.fillRect(2, -11, 3, 4);
      c.fillStyle = '#052e16'; c.fillRect(-4, -10, 1.5, 3); c.fillRect(3, -10, 1.5, 3);
      if (pal.mask) { c.fillStyle = '#1e293b'; c.fillRect(-6, -6, 12, 5); }
    } else if (side) {
      c.fillStyle = '#16a34a'; c.fillRect(2, -11, 3, 4);
      c.fillStyle = '#052e16'; c.fillRect(3.5, -10, 1.5, 3);
      if (pal.mask) { c.fillStyle = '#1e293b'; c.fillRect(0, -6, 8, 5); }
    }

    if (isPlayer) {
      const ch = RPG_CHAR[charId];
      const long = charId === 'nicks';
      if (atk > 0) {
        const prog = 1 - atk / 0.22;
        c.restore(); c.save(); c.translate(x, y - 6);
        const d = DIRS[dir]; c.rotate(Math.atan2(d[1], d[0]));
        if (long) {
          const ext = 10 + Math.sin(Math.min(1, prog) * Math.PI) * (ch.reach - 20);
          c.strokeStyle = '#374151'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(4, 2); c.lineTo(ext + 4, 2); c.stroke();
          c.fillStyle = '#cbd5e1';
          c.beginPath(); c.moveTo(ext + 4, -3); c.lineTo(ext + 16, 2); c.lineTo(ext + 4, 7); c.closePath(); c.fill();
          c.fillStyle = '#fb923c';
          c.beginPath(); c.arc(ext + 19, 2, 5 + Math.sin(t * 40) * 1.5, 0, Math.PI * 2); c.fill();
        } else {
          const sw = -1.2 + prog * 2.4;
          c.strokeStyle = 'rgba(253,224,71,0.9)'; c.lineWidth = 5;
          c.beginPath(); c.arc(0, 0, ch.reach * 0.8, sw - 0.9, sw + 0.1); c.stroke();
          c.strokeStyle = '#e2e8f0'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(sw) * ch.reach * 0.75, Math.sin(sw) * ch.reach * 0.75); c.stroke();
        }
      } else if (long) {
        c.strokeStyle = '#374151'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(10, 14); c.lineTo(12, -22); c.stroke();
        c.fillStyle = '#fb923c'; c.beginPath(); c.arc(12, -26, 3.5 + Math.sin(t * 20) * 0.8, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = '#cbd5e1'; c.fillRect(10, 2, 3, 12);
      }
    }
    c.restore();
  }

  function heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.5, y - s, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
    c.closePath();
  }

  function drawEnemy(c, e) {
    const x = e.x - camX; const y = e.y - camY;
    if (x < -60 || x > VW + 60 || y < -60 || y > VH + 60) return;
    c.save(); c.translate(x, y);
    if (e.flash > 0) c.filter = 'brightness(2.2)';
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath(); c.ellipse(0, e.size / 2 - 2, e.size / 2, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#14100a'; c.lineWidth = 1.8;

    if (e.type === 'slime') {
      const sq = Math.sin(time * 6 + e.id) * 2;
      c.fillStyle = e.color;
      c.beginPath(); c.ellipse(0, 2, 12 + sq, 10 - sq, 0, Math.PI, 0); c.lineTo(12 + sq, 10); c.lineTo(-12 - sq, 10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-6, 0, 4, 5); c.fillRect(2, 0, 4, 5);
      c.fillStyle = '#111'; c.fillRect(-5, 2, 2, 3); c.fillRect(3, 2, 2, 3);
    } else if (e.type === 'bat' || e.type === 'stormling') {
      const fl = Math.sin(time * 18 + e.id) * 6;
      c.fillStyle = e.type === 'stormling' ? '#0284c7' : '#4c1d95';
      c.beginPath();
      c.moveTo(0, -2); c.quadraticCurveTo(-12, -10 - fl, -18, -fl); c.quadraticCurveTo(-10, 2, -4, 6);
      c.lineTo(4, 6); c.quadraticCurveTo(10, 2, 18, -fl); c.quadraticCurveTo(12, -10 - fl, 0, -2);
      c.fill(); c.stroke();
      c.fillStyle = e.type === 'stormling' ? '#38bdf8' : '#6d28d9';
      c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#fde047'; c.fillRect(-3, -2, 2, 2); c.fillRect(1, -2, 2, 2);
    } else if (e.type === 'knight' || e.type === 'corsair') {
      c.fillStyle = e.type === 'corsair' ? '#1e3a8a' : '#475569';
      c.beginPath(); c.roundRect(-11, -8, 22, 22, 5); c.fill(); c.stroke();
      c.fillStyle = e.type === 'corsair' ? '#334155' : '#64748b';
      c.beginPath(); c.arc(0, -12, 9, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = e.type === 'corsair' ? '#38bdf8' : '#ef4444';
      c.fillRect(-5, -14, 10, 3);
    } else if (e.type === 'sentinel') {
      c.fillStyle = '#374151'; c.beginPath(); c.roundRect(-10, -12, 20, 24, 4); c.fill(); c.stroke();
      c.fillStyle = '#f43f5e'; c.beginPath(); c.arc(0, -2, 4 + Math.sin(time * 5) * 1.2, 0, Math.PI * 2); c.fill();
    } else if (e.boss) {
      const s = e.size / 2;
      const aura = c.createRadialGradient(0, 0, 8, 0, 0, s + 22);
      aura.addColorStop(0, e.color + 'aa'); aura.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = aura; c.fillRect(-s - 24, -s - 24, (s + 24) * 2, (s + 24) * 2);
      c.fillStyle = '#2b1a3f'; c.beginPath(); c.roundRect(-s, -s + 6, s * 2, s * 2 - 6, 14); c.fill(); c.stroke();
      c.fillStyle = e.color; c.beginPath(); c.roundRect(-s + 5, -s + 12, s * 2 - 10, s * 1.2, 10); c.fill();
      c.fillStyle = '#78350f';
      c.beginPath();
      c.moveTo(-s + 6, -s + 8); c.lineTo(-s - 4, -s - 14); c.lineTo(-s + 16, -s + 4);
      c.moveTo(s - 6, -s + 8); c.lineTo(s + 4, -s - 14); c.lineTo(s - 16, -s + 4);
      c.fill();
      c.fillStyle = e.state !== 'idle' ? '#fff' : '#ef4444';
      c.fillRect(-s * 0.55, -4, 9, 7); c.fillRect(s * 0.55 - 9, -4, 9, 7);
    }
    c.restore();
  }

  function panel(c, x, y, w, h) {
    c.fillStyle = 'rgba(12,18,28,0.86)';
    c.strokeStyle = '#eab308';
    c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
  }

  function wrap(c, text, maxW) {
    const words = text.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function draw() {
    const c = env.ctx;
    if (!map) return;

    const x0 = Math.max(0, Math.floor(camX / T));
    const y0 = Math.max(0, Math.floor(camY / T));
    const x1 = Math.min(MW - 1, Math.floor((camX + VW) / T));
    const y1 = Math.min(MH - 1, Math.floor((camY + VH) / T));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        c.drawImage(getTile(tileAt(tx, ty), tx, ty), Math.round(tx * T - camX), Math.round(ty * T - camY));
      }
    }

    for (const s of signs) {
      const x = s.x * T - camX; const y = s.y * T - camY;
      c.fillStyle = '#7a4b28'; c.fillRect(x + 14, y + 14, 4, 14);
      c.fillStyle = '#c8924f'; c.strokeStyle = '#14100a'; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(x + 5, y + 5, 22, 14, 2); c.fill(); c.stroke();
    }

    for (const ch of chests) {
      const x = ch.x * T - camX; const y = ch.y * T - camY;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + 16, y + 28, 12, 4, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#14100a'; c.lineWidth = 1.8;
      c.fillStyle = ch.opened ? '#8a5a2b' : '#b3722f';
      c.beginPath(); c.roundRect(x + 4, y + 12, 24, 15, 3); c.fill(); c.stroke();
      c.fillStyle = ch.opened ? '#5a3418' : '#d89a4a';
      c.beginPath(); c.roundRect(x + 4, y + (ch.opened ? 6 : 8), 24, 8, [6, 6, 0, 0]); c.fill(); c.stroke();
      c.fillStyle = '#facc15'; c.fillRect(x + 14, y + 13, 4, 6);
    }

    // Barca no cais
    const boat = props.find((p) => p.kind === 'boat');
    if (boat) {
      const x = boat.x - camX; const y = boat.y - camY + Math.sin(time * 3) * 2;
      c.save();
      c.fillStyle = '#78350f'; c.strokeStyle = '#14100a'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x, y, 44, 20, [4, 4, 12, 12]); c.fill(); c.stroke();
      c.fillStyle = flags.act2Unlocked || act === 2 ? '#38bdf8' : '#94a3b8';
      c.beginPath(); c.moveTo(x + 22, y + 4); c.lineTo(x + 22, y - 22); c.lineTo(x + 38, y - 8); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }

    // Arvore Ancestral (Ato 1) ou Nucleo das Esferas (Ato 2)
    const al = props[0];
    if (al) {
      const x = al.x - camX; const y = al.y - camY;
      if (x > -140 && x < VW + 40 && y > -160 && y < VH + 60) {
        c.save();
        const done = act === 1 ? flags.final : flags.towerBoss;
        const glow = c.createRadialGradient(x + 48, y + 30, 10, x + 48, y + 30, 120);
        glow.addColorStop(0, done ? 'rgba(253,224,71,0.55)' : (act === 2 ? 'rgba(56,189,248,0.45)' : 'rgba(168,85,247,0.38)'));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow; c.fillRect(x - 80, y - 90, 260, 260);

        if (act === 1) {
          c.fillStyle = '#4a2c17'; c.strokeStyle = '#14100a'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x + 22, y + 96); c.quadraticCurveTo(x + 30, y + 50, x + 36, y + 40);
          c.lineTo(x + 60, y + 40); c.quadraticCurveTo(x + 66, y + 50, x + 74, y + 96); c.closePath(); c.fill(); c.stroke();
          const cols = done ? ['#4ade80', '#86efac'] : ['#7e22ce', '#a855f7'];
          [[48, 20, 34], [20, 34, 24], [76, 34, 24], [48, 4, 22]].forEach(([dx, dy, r], i) => {
            c.fillStyle = cols[i % 2]; c.beginPath(); c.arc(x + dx, y + dy, r, 0, Math.PI * 2); c.fill(); c.stroke();
          });
          for (let i = 0; i < 3; i++) {
            c.fillStyle = i < P.orbs ? '#fde047' : '#374151';
            c.beginPath(); c.arc(x + 30 + i * 18, y + 70, 5, 0, Math.PI * 2); c.fill();
          }
        } else {
          // Nucleo das Esferas da Torre no Mar
          c.fillStyle = '#1e293b'; c.strokeStyle = '#eab308'; c.lineWidth = 2.5;
          c.beginPath(); c.roundRect(x + 16, y + 44, 64, 52, 8); c.fill(); c.stroke();
          const pulse = 22 + Math.sin(time * 4) * 3;
          c.fillStyle = done ? '#fde047' : '#38bdf8';
          c.beginPath(); c.arc(x + 48, y + 24, pulse, 0, Math.PI * 2); c.fill(); c.stroke();
          for (let i = 0; i < 2; i++) {
            c.fillStyle = i < P.seals ? '#fde047' : '#374151';
            c.beginPath(); c.arc(x + 38 + i * 20, y + 70, 6, 0, Math.PI * 2); c.fill();
          }
        }
        c.restore();
      }
    }

    for (const d of drops) {
      const x = d.x - camX; const y = d.y - camY + Math.sin(time * 6 + d.x) * 2;
      if (d.t > 10 && Math.floor(time * 10) % 2 === 0) continue;
      if (d.type === 'heart') {
        c.fillStyle = '#ef4444'; c.strokeStyle = '#7f1d1d'; c.lineWidth = 1.5;
        heartPath(c, x, y, 8); c.fill(); c.stroke();
      } else {
        c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      }
    }

    const list = [];
    npcs.forEach((n) => list.push({ y: n.y, f: () => drawHero(c, n.x - camX, n.y - camY, n.dir, n.pal, time, false, 0, false) }));
    enemies.forEach((e) => list.push({ y: e.y, f: () => drawEnemy(c, e) }));
    list.push({
      y: P.y,
      f: () => {
        c.save();
        if (P.inv > 0 && Math.floor(time * 20) % 2 === 0) c.globalAlpha = 0.45;
        if (deadT > 0) c.globalAlpha = Math.max(0.2, deadT / 1.8);
        drawHero(c, P.x - camX, P.y - camY, P.dir, RPG_CHAR[charId].pal, P.anim, P.moving, P.atkT, true);
        c.restore();
      }
    });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());

    for (const p of pprojs.concat(eprojs)) {
      c.save(); c.fillStyle = '#fff'; c.strokeStyle = p.color; c.lineWidth = 2.5;
      c.beginPath(); c.arc(p.x - camX, p.y - camY, p.r - 1, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    }
    for (const p of parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.color; c.fillRect(p.x - camX, p.y - camY, p.size, p.size);
    }
    c.globalAlpha = 1;
    for (const p of popups) {
      c.globalAlpha = Math.min(1, p.life * 1.5);
      c.font = 'bold 13px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillStyle = p.color; c.strokeStyle = '#000'; c.lineWidth = 3;
      c.strokeText(p.text, p.x - camX, p.y - camY); c.fillText(p.text, p.x - camX, p.y - camY);
    }
    c.globalAlpha = 1; c.textAlign = 'left';

    drawHud(c);

    if (fade > 0 || deadT > 0) {
      c.fillStyle = 'rgba(0,0,0,' + (deadT > 0 ? Math.min(1, (1.8 - deadT) / 1.2) : fade) + ')';
      c.fillRect(0, 0, VW, VH);
    }
    if (winT > 0) {
      c.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, (2.0 - winT) / 2.0) + ')';
      c.fillRect(0, 0, VW, VH);
    }
  }

  function drawHud(c) {
    const n = Math.ceil(P.maxHp / 20);
    panel(c, 8, 8, Math.min(n, 10) * 22 + 16, (n > 10 ? 2 : 1) * 22 + 46);
    for (let i = 0; i < n; i++) {
      const hx = 24 + (i % 10) * 22; const hy = 26 + Math.floor(i / 10) * 22;
      c.fillStyle = '#3b1010'; c.strokeStyle = '#14100a'; c.lineWidth = 1.5;
      heartPath(c, hx, hy, 9); c.fill(); c.stroke();
      const rem = P.hp - i * 20;
      if (rem > 0) {
        c.save(); c.beginPath(); c.rect(hx - 12, hy - 12, rem >= 20 ? 24 : 12, 24); c.clip();
        c.fillStyle = '#ef4444'; heartPath(c, hx, hy, 9); c.fill(); c.restore();
      }
    }
    const by = 8 + (n > 10 ? 2 : 1) * 22 + 6;
    c.fillStyle = '#0f172a'; c.fillRect(16, by, 150, 8);
    c.fillStyle = '#38bdf8'; c.fillRect(16, by, 150 * clamp(P.exp / P.expToNext, 0, 1), 8);
    c.strokeStyle = '#94a3b8'; c.lineWidth = 1; c.strokeRect(16, by, 150, 8);
    c.font = 'bold 11px Segoe UI, sans-serif'; c.fillStyle = '#fde047';
    c.fillText('Lv.' + P.level + '  HP ' + P.hp + '/' + P.maxHp + '  ATQ ' + P.atq, 16, by + 22);

    // Recursos + Pocao + Orbes/Selos
    panel(c, 8, by + 30, 248, 26);
    c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(22, by + 43, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f8fafc'; c.font = 'bold 12px Segoe UI, sans-serif';
    c.fillText(String(P.gems), 31, by + 47);
    c.fillStyle = '#facc15'; c.fillText('🗝' + P.keys, 66, by + 47);
    c.fillStyle = '#4ade80'; c.fillText('Q:🧪' + P.potions, 108, by + 47);

    const totalSlot = act === 1 ? 3 : 2;
    const curSlot = act === 1 ? P.orbs : P.seals;
    for (let i = 0; i < totalSlot; i++) {
      c.fillStyle = i < curSlot ? (act === 2 ? '#38bdf8' : '#fde047') : '#374151';
      c.strokeStyle = '#14100a';
      c.beginPath(); c.arc(185 + i * 20, by + 43, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    }

    // Minimapa + titulo do Ato
    const mx = VW - 144; const my = 8;
    panel(c, mx - 4, my - 4, 136, 122);
    c.drawImage(mini, mx, my);
    c.fillStyle = '#fff'; c.fillRect(P.x / T * 2 - 2 + mx, P.y / T * 2 - 2 + my, 5, 5);
    enemies.filter((e) => e.boss).forEach((e) => {
      c.fillStyle = '#ef4444'; c.fillRect(e.x / T * 2 - 2 + mx, e.y / T * 2 - 2 + my, 5, 5);
    });
    c.fillStyle = '#fde047'; c.font = 'bold 10px Segoe UI, sans-serif'; c.textAlign = 'center';
    c.fillText(act === 1 ? 'ATO 1: CONTINENTE' : 'ATO 2: TORRE NO MAR', mx + 64, my + 112);
    c.textAlign = 'left';

    // Barra de chefe
    const boss = enemies.find((e) => e.boss && dist(e.x, e.y, P.x, P.y) < 340);
    if (boss) {
      const bw = 360; const bx = (VW - bw) / 2;
      panel(c, bx - 8, VH - 78, bw + 16, 30);
      c.fillStyle = '#2b0d0d'; c.fillRect(bx, VH - 62, bw, 10);
      c.fillStyle = '#ef4444'; c.fillRect(bx, VH - 62, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
      c.fillStyle = '#fde047'; c.font = 'bold 12px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillText(boss.name, VW / 2, VH - 67); c.textAlign = 'left';
    }

    // Indicador contextual de interacao
    const hint = nearbyHint();
    if (hint) {
      c.font = 'bold 12px Segoe UI, sans-serif'; c.textAlign = 'center';
      const hw = c.measureText(hint).width + 20;
      panel(c, (VW - hw) / 2, VH - 66, hw, 24);
      c.fillStyle = '#86efac'; c.fillText(hint, VW / 2, VH - 50);
      c.textAlign = 'left';
    }

    // Objetivo atual
    if (!dlg && !shop) {
      let obj = '';
      if (act === 1) {
        if (!flags.met) obj = 'Ato 1: Fale com o Ancião Nuvem, ' + mateName + ' e o Armeiro Bram na vila.';
        else if (flags.act2Unlocked) obj = 'Ato 1 concluído! Embarque na Barca no Cais Sul para a Torre no Mar (Ato 2).';
        else if (P.orbs >= 3) obj = 'Leve os 3 Orbes Arcanos à Árvore Ancestral, ao norte.';
        else obj = 'Derrote os 3 Guardiões (Orbes ' + P.orbs + '/3) e melhore seu equipamento na loja!';
      } else {
        if (flags.towerBoss) obj = 'Torre no Mar purificada! Aventura concluída!';
        else if (P.seals >= 2) obj = 'Leve os 2 Selos ao Núcleo das Esferas no extremo norte!';
        else obj = 'Ato 2: Derrote os Guardiões da Tempestade (Oeste) e da Maré (Leste) — Selos ' + P.seals + '/2.';
      }
      c.font = '12px Segoe UI, sans-serif';
      const w = c.measureText(obj).width + 20;
      panel(c, 8, VH - 32, w, 24);
      c.fillStyle = '#e2e8f0'; c.fillText(obj, 18, VH - 15);
    }

    // Toasts
    toasts.forEach((t, i) => {
      c.font = 'bold 14px Segoe UI, sans-serif'; c.textAlign = 'center';
      const w = c.measureText(t.text).width + 28;
      c.globalAlpha = Math.min(1, t.t);
      panel(c, (VW - w) / 2, 110 + i * 34, w, 28);
      c.fillStyle = '#fde047'; c.fillText(t.text, VW / 2, 129 + i * 34);
      c.globalAlpha = 1;
    });
    c.textAlign = 'left';

    // Loja do Armeiro Bram
    if (shop) {
      const sw = 460; const sh = 270; const sx = (VW - sw) / 2; const sy = (VH - sh) / 2;
      panel(c, sx, sy, sw, sh);
      c.fillStyle = '#fde047'; c.font = 'bold 17px Segoe UI, sans-serif';
      c.fillText('⚒ Loja do Armeiro Bram', sx + 20, sy + 30);
      c.fillStyle = '#7dd3fc'; c.font = 'bold 13px Segoe UI, sans-serif'; c.textAlign = 'right';
      c.fillText('Suas Esferas: ' + P.gems, sx + sw - 20, sy + 30);
      c.textAlign = 'left';

      W.SHOP_ITEMS.forEach((it, i) => {
        const iy = sy + 50 + i * 46;
        const sel = i === shop.idx;
        const lvl = it.id === 'potion' ? P.potions : (P.upgrades[it.id] || 0);
        const maxed = it.id !== 'potion' && lvl >= it.max;
        const cost = it.id === 'potion' ? it.cost : it.cost + lvl * 8;
        c.fillStyle = sel ? 'rgba(234,179,8,0.22)' : 'rgba(255,255,255,0.04)';
        c.strokeStyle = sel ? '#eab308' : '#334155';
        c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(sx + 16, iy, sw - 32, 38, 6); c.fill(); c.stroke();

        c.fillStyle = '#f8fafc'; c.font = 'bold 13px Segoe UI, sans-serif';
        const tag = it.id === 'potion' ? ' (Você tem ' + lvl + ')' : ' (Nv.' + lvl + '/' + it.max + ')';
        c.fillText(it.name + tag, sx + 26, iy + 16);
        c.fillStyle = '#94a3b8'; c.font = '11px Segoe UI, sans-serif';
        c.fillText(it.desc, sx + 26, iy + 31);

        c.textAlign = 'right'; c.font = 'bold 13px Segoe UI, sans-serif';
        c.fillStyle = maxed ? '#4ade80' : (P.gems >= cost ? '#fde047' : '#f87171');
        c.fillText(maxed ? 'MÁX' : cost + ' Esferas', sx + sw - 26, iy + 24);
        c.textAlign = 'left';
      });

      c.fillStyle = '#94a3b8'; c.font = '12px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillText('▲/▼ Escolher  •  Espaço/Enter Comprar  •  J/Shift Fechar', VW / 2, sy + sh - 14);
      c.textAlign = 'left';
    }

    // Dialogo
    if (dlg) {
      const bx = 60; const bw = VW - 120; const bh = 122; const by2 = VH - bh - 16;
      panel(c, bx, by2, bw, bh);
      c.fillStyle = '#fde047'; c.font = 'bold 15px Segoe UI, sans-serif';
      c.fillText(dlg.name, bx + 18, by2 + 26);
      c.fillStyle = '#f8fafc'; c.font = '15px Segoe UI, sans-serif';
      const txt = dlg.lines[dlg.i].slice(0, Math.floor(dlg.shown));
      wrap(c, txt, bw - 36).slice(0, 4).forEach((ln, i) => c.fillText(ln, bx + 18, by2 + 52 + i * 22));
      if (dlg.shown >= dlg.lines[dlg.i].length && Math.floor(time * 3) % 2 === 0) {
        c.fillStyle = '#fde047'; c.fillText('▼', bx + bw - 28, by2 + bh - 14);
      }
    }
  }

  function init(e) { env = e; }

  return {
    init, start, stop, restart, update, draw, setPaused,
    isActive: () => active,
    hasSave: (id) => !!localStorage.getItem('rpg_save_' + id)
  };
})();
