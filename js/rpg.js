window.Jogo = window.Jogo || {};

/* =====================================================================
   MODO RPG (estilo Zelda) - visao de cima, mundo aberto, bosses, baus,
   chaves, NPCs, dialogos, minimapa e save automatico.
   ===================================================================== */
window.Jogo.RPG = (function () {
  const T = 32;
  const MW = 64;
  const MH = 48;
  const VW = 960;
  const VH = 540;

  // ids de tile
  const GRASS = 0, PATH = 1, WATER = 2, TREE = 3, ROCK = 4, WALL = 5, FLOOR = 6, FLOWER = 7, MUD = 8;
  const HWALL = 10, ROOF = 11, DOOR = 12, BUSH = 14, GATE = 15, DEAD = 16, SWATER = 17;
  const SOLID = [false, false, true, true, true, true, false, false, false, false, true, true, true, false, true, true, true, true];

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  const RPG_CHAR = {
    nicolas: { reach: 48, width: 52, pal: { hair: '#e8edf5', coat: '#1f7a43', trim: '#eab308', skin: '#f5cbb0', horn: '#166534', mask: true } },
    nicks: { reach: 74, width: 30, pal: { hair: '#ef4444', coat: '#e24a6e', trim: '#f5ecd2', skin: '#e4f5e4', horn: '#4b5563', mask: false } }
  };

  let env = null;
  let active = false;
  let paused = false;
  let time = 0;

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
  let P = null;
  let charId = 'nicolas';
  let heroName = 'Nícolas';
  let flags = {};
  let fade = 0;
  let deadT = 0;
  let winT = 0;
  let camX = 0;
  let camY = 0;
  let enemyId = 0;
  let mini = null;
  let tileCache = {};

  const SPAWN = { x: 32 * T + 16, y: 43 * T };

  /* ------------------------------ util ------------------------------ */
  function rnd(a, b = 0) {
    const x = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function rr() {
    return Math.random();
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }
  function mk() {
    return document.createElement('canvas');
  }

  /* ------------------------------ mundo ------------------------------ */
  function buildWorld() {
    const m = new Uint8Array(MW * MH);
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < MW && y < MH) m[y * MW + x] = t;
    };
    const rect = (x, y, w, h, t) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t);
    };
    const inR = (x, y, rx, ry, rw, rh) => x >= rx && y >= ry && x < rx + rw && y < ry + rh;

    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const r = rnd(x, y);
        let t = GRASS;
        if (inR(x, y, 4, 22, 19, 21)) {
          t = r < 0.34 ? TREE : r < 0.4 ? BUSH : r < 0.45 ? FLOWER : GRASS;
        } else if (inR(x, y, 42, 22, 19, 21)) {
          t = MUD;
          const r2 = rnd(x, y + 500);
          if (r2 < 0.14) t = SWATER;
          else if (r2 < 0.24) t = DEAD;
          else if (r2 < 0.27) t = BUSH;
        } else if (inR(x, y, 0, 0, 20, 22) || inR(x, y, 45, 0, 19, 22)) {
          t = r < 0.55 ? TREE : r < 0.62 ? FLOWER : GRASS;
        } else {
          t = r < 0.07 ? TREE : r < 0.09 ? ROCK : r < 0.12 ? BUSH : r < 0.2 ? FLOWER : GRASS;
        }
        set(x, y, t);
      }
    }

    rect(46, 6, 13, 12, WATER);
    rect(5, 5, 6, 5, WATER);

    rect(0, 0, MW, 2, TREE);
    rect(0, MH - 2, MW, 2, TREE);
    rect(0, 0, 2, MH, TREE);
    rect(MW - 2, 0, 2, MH, TREE);

    // vila
    rect(24, 35, 17, 11, GRASS);
    rect(24, 40, 17, 5, PATH);
    rect(25, 36, 6, 2, ROOF);
    rect(25, 38, 6, 2, HWALL);
    set(27, 39, DOOR);
    rect(34, 36, 6, 2, ROOF);
    rect(34, 38, 6, 2, HWALL);
    set(36, 39, DOOR);
    rect(31, 23, 3, 17, PATH);

    // oeste: floresta
    rect(11, 41, 14, 3, PATH);
    rect(11, 24, 3, 18, PATH);
    rect(6, 37, 6, 2, PATH);
    rect(6, 24, 14, 9, GRASS);
    rect(17, 39, 3, 2, GRASS);

    // leste: pantano
    rect(41, 41, 12, 3, PATH);
    rect(51, 24, 3, 18, PATH);
    rect(45, 23, 14, 10, MUD);
    rect(47, 25, 2, 2, SWATER);
    rect(55, 30, 3, 2, SWATER);
    rect(54, 36, 6, 2, PATH);
    set(43, 41, GATE);
    set(43, 42, GATE);
    set(43, 43, GATE);

    // campina
    rect(22, 27, 5, 3, GRASS);
    rect(34, 29, 3, 3, GRASS);

    // ruinas
    rect(20, 11, 25, 12, WALL);
    rect(21, 12, 23, 10, FLOOR);
    [24, 28, 36, 40].forEach((x) => [14, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE);
    set(32, 22, GATE);
    set(33, 22, GATE);

    // arena final
    rect(22, 0, 21, 11, WALL);
    rect(24, 2, 17, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return TREE;
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
          if (!SOLID[tileAt(x, y)] && tileAt(x, y) !== SWATER) {
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
    c.fillStyle = '#5bb450';
    c.fillRect(0, 0, T, T);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, 0, T, 10);
    c.strokeStyle = '#3f9140';
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
      case WATER:
      case SWATER: {
        const sw = type === SWATER;
        c.fillStyle = sw ? '#3b6b3a' : '#3b82d6';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = sw ? 'rgba(190,242,100,0.5)' : 'rgba(255,255,255,0.55)';
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
          c.moveTo(16, 18);
          c.lineTo(6, 6);
          c.moveTo(16, 16);
          c.lineTo(26, 5);
          c.moveTo(16, 20);
          c.lineTo(28, 14);
          c.stroke();
        } else {
          const g = c.createRadialGradient(13, 9, 2, 16, 12, 17);
          g.addColorStop(0, '#4fbf5a');
          g.addColorStop(1, '#1d6b34');
          c.fillStyle = g;
          c.strokeStyle = '#14451f';
          c.lineWidth = 1.5;
          [[16, 11, 12], [9, 15, 8], [23, 15, 8]].forEach(([x, y, r]) => {
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
            c.stroke();
          });
          c.fillStyle = 'rgba(255,255,255,0.18)';
          c.beginPath();
          c.arc(12, 7, 3.5, 0, Math.PI * 2);
          c.fill();
        }
        break;
      }
      case ROCK:
        grassBase(c, v);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.beginPath();
        c.ellipse(16, 27, 12, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#9ca3af';
        c.strokeStyle = '#4b5563';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(4, 26);
        c.lineTo(7, 12);
        c.lineTo(16, 6);
        c.lineTo(26, 11);
        c.lineTo(29, 26);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.fillRect(11, 10, 7, 3);
        break;
      case BUSH:
        grassBase(c, v);
        c.fillStyle = 'rgba(0,0,0,0.22)';
        c.beginPath();
        c.ellipse(16, 26, 11, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2f9d49';
        c.strokeStyle = '#17572a';
        c.lineWidth = 1.5;
        [[10, 18, 8], [22, 18, 8], [16, 13, 9]].forEach(([x, y, r]) => {
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
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
          c.beginPath();
          c.ellipse(3 + rnd(v, i + 40) * 26, 3 + rnd(v, i + 50) * 26, 4, 2.5, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = 'rgba(190,242,100,0.18)';
        c.fillRect(rnd(v, 3) * 20, rnd(v, 4) * 20, 6, 3);
        break;
      case WALL:
        c.fillStyle = '#4a4560';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = '#2b2740';
        c.lineWidth = 1.5;
        for (let r = 0; r < 4; r++) {
          const y = r * 8;
          c.strokeRect(0, y, T, 8);
          const off = r % 2 ? 8 : 0;
          c.beginPath();
          c.moveTo(off + 8, y);
          c.lineTo(off + 8, y + 8);
          c.moveTo(off + 24, y);
          c.lineTo(off + 24, y + 8);
          c.stroke();
        }
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillRect(0, 0, T, 3);
        break;
      case FLOOR:
        c.fillStyle = (v % 2) ? '#8d89a6' : '#9a96b3';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = 'rgba(40,36,64,0.5)';
        c.lineWidth = 1;
        c.strokeRect(0.5, 0.5, T - 1, T - 1);
        if (v % 5 === 0) {
          c.strokeStyle = 'rgba(56,189,248,0.5)';
          c.beginPath();
          c.arc(16, 16, 7, 0, Math.PI * 2);
          c.stroke();
        }
        break;
      case ROOF:
        c.fillStyle = '#b3402f';
        c.fillRect(0, 0, T, T);
        c.fillStyle = '#8f2f22';
        for (let r = 0; r < 4; r++) {
          for (let k = 0; k < 4; k++) {
            c.beginPath();
            c.arc(k * 8 + (r % 2 ? 4 : 0), r * 8 + 8, 5, 0, Math.PI);
            c.fill();
          }
        }
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.fillRect(0, 0, T, 3);
        break;
      case HWALL:
        c.fillStyle = '#e8d9b5';
        c.fillRect(0, 0, T, T);
        c.fillStyle = '#7a4b28';
        c.fillRect(0, 0, T, 4);
        c.fillRect(0, 0, 4, T);
        c.fillRect(T - 4, 0, 4, T);
        if (v % 2 === 0) {
          c.fillStyle = '#7dd3fc';
          c.fillRect(9, 8, 14, 12);
          c.strokeStyle = '#7a4b28';
          c.lineWidth = 2;
          c.strokeRect(9, 8, 14, 12);
          c.beginPath();
          c.moveTo(16, 8);
          c.lineTo(16, 20);
          c.stroke();
        }
        break;
      case DOOR:
        c.fillStyle = '#e8d9b5';
        c.fillRect(0, 0, T, T);
        c.fillStyle = '#5a3418';
        c.beginPath();
        c.roundRect(6, 4, 20, 28, [8, 8, 0, 0]);
        c.fill();
        c.fillStyle = '#facc15';
        c.beginPath();
        c.arc(21, 19, 2, 0, Math.PI * 2);
        c.fill();
        break;
      case GATE:
        c.fillStyle = '#3b3a4a';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = '#9ca3af';
        c.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(4 + i * 8, 2);
          c.lineTo(4 + i * 8, 30);
          c.stroke();
        }
        c.beginPath();
        c.moveTo(2, 10);
        c.lineTo(30, 10);
        c.moveTo(2, 22);
        c.lineTo(30, 22);
        c.stroke();
        c.fillStyle = '#facc15';
        c.strokeStyle = '#7a5b00';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(11, 13, 10, 9, 2);
        c.fill();
        c.stroke();
        break;
      default:
        c.fillStyle = '#f0f';
        c.fillRect(0, 0, T, T);
    }
    return cv;
  }

  function getTile(type, x, y) {
    const v = Math.floor(rnd(x, y + 3) * 4);
    const f = type === WATER || type === SWATER ? Math.floor(time * 2) % 2 : 0;
    const key = type + '_' + v + '_' + f;
    if (!tileCache[key]) tileCache[key] = buildTile(type, v, f);
    return tileCache[key];
  }

  function buildMini() {
    mini = mk();
    mini.width = MW * 2;
    mini.height = MH * 2;
    const c = mini.getContext('2d');
    const col = {
      0: '#5bb450', 1: '#cfa96e', 2: '#3b82d6', 3: '#2f7a3c', 4: '#9ca3af', 5: '#4a4560', 6: '#9a96b3', 7: '#6fc460', 8: '#6d6a3a',
      10: '#e8d9b5', 11: '#b3402f', 12: '#5a3418', 14: '#2f9d49', 15: '#facc15', 16: '#3f3a35', 17: '#3b6b3a'
    };
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        c.fillStyle = col[tileAt(x, y)] || '#000';
        c.fillRect(x * 2, y * 2, 2, 2);
      }
    }
  }

  /* ------------------------------ objetos ------------------------------ */
  function setupObjects() {
    props = [];
    chests = [];
    npcs = [];
    signs = [];
    enemies = [];
    eprojs = [];
    pprojs = [];
    drops = [];
    parts = [];
    popups = [];

    props.push({ kind: 'arcane', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });

    const ch = (id, x, y, item, n) => chests.push({ id, x, y, item, n: n || 0, opened: !!(flags.chests && flags.chests.includes(id)) });
    ch('forestKey', 18, 40, 'key');
    ch('forestHeart', 6, 37, 'heart');
    ch('forestGems', 9, 25, 'spheres', 12);
    ch('meadowHeart', 24, 28, 'heart');
    ch('swampKey', 57, 24, 'key');
    ch('swampHeart', 59, 36, 'heart');
    ch('ruinsGems', 22, 13, 'spheres', 20);

    npcs.push({ id: 'elder', name: 'Ancião Nuvem', x: 33 * T + 16, y: 43 * T + 8, dir: 'left', pal: { hair: '#d1d5db', coat: '#6d4aa8', trim: '#fde047', skin: '#f2c9a5', horn: '#6d4aa8', mask: false } });
    npcs.push({ id: 'healer', name: 'Curandeira Mira', x: 37 * T + 16, y: 42 * T + 8, dir: 'down', pal: { hair: '#f472b6', coat: '#e2f4ef', trim: '#14b8a6', skin: '#f5cbb0', horn: '#14b8a6', mask: false } });
    npcs.push({ id: 'sage', name: 'Viajante Tati', x: 35 * T + 16, y: 30 * T + 16, dir: 'left', pal: { hair: '#7c3aed', coat: '#334155', trim: '#38bdf8', skin: '#e4f5e4', horn: '#334155', mask: false } });

    const sg = (x, y, text) => signs.push({ x, y, text });
    sg(30, 41, 'Vila Didalmiana. Oeste: Floresta da Brisa. Leste: Pântano das Sementes. Norte: Ruínas da Forja.');
    sg(23, 41, 'Floresta da Brisa. Um baú com Chave repousa ao lado deste caminho...');
    sg(41, 41, 'Portão do Pântano. Só abre com uma Chave.');
    sg(30, 24, 'Ruínas da Forja. O portão exige uma Chave encontrada no Pântano.');
    sg(30, 12 + 11, 'Cuidado: Guardiões corrompidos adiante.');

    ensureClear();

    const sp = (type, tx, ty, color) => {
      const f = findFree(tx, ty);
      enemies.push(makeEnemy(type, f.x, f.y, color));
    };
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
  }

  function ensureClear() {
    const open = (x, y, to) => {
      if (SOLID[tileAt(x, y)] || tileAt(x, y) === SWATER) setTile(x, y, to);
    };
    chests.forEach((c) => open(c.x, c.y, GRASS));
    npcs.forEach((n) => open(Math.floor(n.x / T), Math.floor(n.y / T), GRASS));
    signs.forEach((s) => open(s.x, s.y, PATH));
    chests.forEach((c) => {
      [[-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => {
        const t = tileAt(c.x + dx, c.y + dy);
        if (SOLID[t] && t !== WALL && t !== HWALL && t !== GATE) setTile(c.x + dx, c.y + dy, GRASS);
      });
    });
  }

  const ENEMY_DEF = {
    slime: { hp: 20, dmg: 10, speed: 52, exp: 12, size: 22 },
    bat: { hp: 12, dmg: 8, speed: 95, exp: 10, size: 20, fly: true },
    knight: { hp: 48, dmg: 18, speed: 44, exp: 30, size: 26 },
    sentinel: { hp: 30, dmg: 11, speed: 0, exp: 22, size: 24 }
  };

  function makeEnemy(type, x, y, color) {
    const d = ENEMY_DEF[type];
    return {
      id: ++enemyId, type, x, y, hp: d.hp, maxHp: d.hp, dmg: d.dmg, speed: d.speed, exp: d.exp,
      size: d.size, fly: !!d.fly, color: color || '#6fcf5a', wanderT: 0, wx: 0, wy: 0, shootT: 1 + rr() * 2,
      flash: 0, kx: 0, ky: 0, kT: 0, phase: rr() * 6, boss: false
    };
  }

  const BOSS_DEF = {
    boss1: { name: 'Guardião da Brisa', hp: 220, color: '#22c55e', dmg: 16, speed: 64, patterns: ['fan', 'dash'], exp: 120, orb: 'Brisa' },
    boss2: { name: 'Guardião do Pântano', hp: 280, color: '#84cc16', dmg: 18, speed: 58, patterns: ['ring', 'summon'], exp: 160, orb: 'Pântano' },
    boss3: { name: 'Guardião da Forja', hp: 340, color: '#f97316', dmg: 20, speed: 68, patterns: ['dash', 'ring', 'fan'], exp: 220, orb: 'Forja' },
    final: { name: 'Guardião do Cataclisma', hp: 520, color: '#a855f7', dmg: 24, speed: 74, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 400, orb: 'Cataclisma' }
  };

  function makeBoss(key, x, y) {
    const d = BOSS_DEF[key];
    const f = findFree(Math.floor(x / T), Math.floor(y / T));
    return {
      id: ++enemyId, type: 'boss', key, x: f.x, y: f.y, hp: d.hp, maxHp: d.hp, dmg: d.dmg, speed: d.speed, exp: d.exp,
      size: 46, fly: false, color: d.color, name: d.name, boss: true, flash: 0, kx: 0, ky: 0, kT: 0,
      pat: 0, patT: 2, state: 'idle', stT: 0, dvx: 0, dvy: 0, phase: 0, shootT: 0
    };
  }

  /* ------------------------------ jogador ------------------------------ */
  function newPlayer(stats) {
    return {
      x: SPAWN.x, y: SPAWN.y, dir: 'up', hw: 8, hh: 8,
      hp: stats.maxHp, maxHp: stats.maxHp, level: stats.level, exp: stats.exp, expToNext: stats.expToNext,
      atq: stats.atq, def: stats.def, spd: stats.spd,
      atkT: 0, atkCd: 0, shotCd: 0, dashT: 0, dashCd: 0, inv: 0, kx: 0, ky: 0, kT: 0, dvx: 0, dvy: 0,
      hit: new Set(), moving: false, anim: 0, keys: 0, gems: 10, orbs: 0
    };
  }

  function saveKey() {
    return 'rpg_save_' + charId;
  }

  function saveGame() {
    if (!P) return;
    try {
      const s = {
        stats: { level: P.level, exp: P.exp, expToNext: P.expToNext, maxHp: P.maxHp, atq: P.atq, def: P.def, spd: P.spd },
        hp: P.hp, keys: P.keys, gems: P.gems, orbs: P.orbs, flags, x: P.x, y: P.y
      };
      localStorage.setItem(saveKey(), JSON.stringify(s));
    } catch (e) { /* ignore */ }
  }

  function loadSave() {
    try {
      return JSON.parse(localStorage.getItem(saveKey()) || 'null');
    } catch (e) {
      return null;
    }
  }

  function start(id, fresh) {
    charId = RPG_CHAR[id] ? id : 'nicolas';
    heroName = env.Chars[charId].name;
    if (fresh) localStorage.removeItem(saveKey());
    const sv = loadSave();
    const base = env.Chars[charId].stats;
    flags = { chests: [], gates: [] };
    map = buildWorld();
    tileCache = {};
    if (sv) {
      flags = Object.assign({ chests: [], gates: [] }, sv.flags || {});
      flags.chests = flags.chests || [];
      flags.gates = flags.gates || [];
      (flags.gates || []).forEach((g) => floodOpen(g[0], g[1]));
    }
    P = newPlayer(sv ? sv.stats : base);
    if (sv) {
      P.hp = clamp(sv.hp || P.maxHp, 1, P.maxHp);
      P.keys = sv.keys || 0;
      P.gems = sv.gems != null ? sv.gems : 10;
      P.orbs = sv.orbs || 0;
      P.x = sv.x || SPAWN.x;
      P.y = sv.y || SPAWN.y;
    }
    setupObjects();
    if (sv && !blocked(P.x, P.y, P.hw, P.hh) === false) {
      P.x = SPAWN.x;
      P.y = SPAWN.y;
    }
    buildMini();
    toasts = [];
    dlg = null;
    paused = false;
    fade = 1;
    deadT = 0;
    winT = 0;
    time = 0;
    active = true;
    camX = clamp(P.x - VW / 2, 0, MW * T - VW);
    camY = clamp(P.y - VH / 2, 0, MH * T - VH);
    toast(sv ? 'Aventura retomada!' : 'A aventura de ' + heroName + ' começa!');
  }

  function stop() {
    saveGame();
    active = false;
  }

  function restart() {
    start(charId, true);
  }

  function setPaused(v) {
    paused = v;
  }

  function toast(text) {
    toasts.push({ text, t: 3 });
    if (toasts.length > 3) toasts.shift();
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color: color || '#fde047', life: 0.9 });
  }

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
      toast('Nível ' + P.level + '! Seus atributos aumentaram.');
    }
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
    if (P.hp <= 0) {
      deadT = 1.8;
      toast(heroName + ' desmaiou...');
    }
  }

  function respawn() {
    P.hp = P.maxHp;
    P.x = SPAWN.x;
    P.y = SPAWN.y;
    P.inv = 1.5;
    P.kT = 0;
    deadT = 0;
    fade = 1;
    eprojs = [];
    toast('Você acordou na vila.');
    saveGame();
  }

  /* ------------------------------ dialogo ------------------------------ */
  function say(name, lines, onEnd) {
    dlg = { name, lines, i: 0, shown: 0, onEnd };
  }

  function npcLines(id) {
    const n = 3 - P.orbs;
    if (id === 'elder') {
      if (flags.final) return ['Você salvou o mundo, ' + heroName + '! As Árvores de Arcano florescem outra vez.'];
      if (!flags.met) {
        flags.met = true;
        saveGame();
        return [
          heroName + '! O Cataclisma partiu o mundo e as Árvores de Arcano foram corrompidas.',
          'Três Guardiões protegem os Orbes Arcanos: o da Brisa (floresta a oeste), o do Pântano (leste) e o da Forja (ruínas ao norte).',
          'Reúna os 3 Orbes e leve-os à Árvore Ancestral, no extremo norte, além das ruínas.',
          'Portões trancados precisam de Chaves. Procure baús! (J = atacar, L = tiro arcano, Shift = rolar, Espaço = interagir)'
        ];
      }
      if (P.orbs >= 3) return ['Você tem os 3 Orbes Arcanos! Vá à Árvore Ancestral, ao norte das ruínas.'];
      return ['Ainda faltam ' + n + ' Orbe(s) Arcano(s). Os Guardiões não serão fáceis, jovem Didalmiano.'];
    }
    if (id === 'healer') {
      if (P.hp >= P.maxHp) return ['Você já está inteiro! Volte quando precisar de cura.'];
      if (P.gems >= 5) {
        P.gems -= 5;
        P.hp = P.maxHp;
        env.Audio.levelUp();
        saveGame();
        return ['Deixe comigo... Pronto! Cobrei 5 Esferas e restaurei toda a sua vida.'];
      }
      return ['Curo seus ferimentos por 5 Esferas, mas você não tem o suficiente. Colete esferas nos arbustos e inimigos!'];
    }
    if (id === 'sage') {
      if (!flags.chests.includes('forestKey')) return ['Ouvi dizer que há uma Chave num baú ao lado do caminho da floresta, a oeste.'];
      if (!flags.chests.includes('swampKey')) return ['O Pântano esconde outra Chave, num baú perto do Guardião.'];
      return ['Os arbustos escondem esferas e corações. Corte-os com a espada!'];
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
    // devolve o tile de portao mais a esquerda/cima do grupo (id estavel)
    let x = sx;
    let y = sy;
    while (tileAt(x - 1, y) === GATE) x--;
    while (tileAt(x, y - 1) === GATE) y--;
    return [x, y];
  }

  function interact() {
    const d = DIRS[P.dir];
    const fx = P.x + d[0] * 20;
    const fy = P.y + d[1] * 20;

    // bau
    for (const c of chests) {
      if (dist(fx, fy, c.x * T + 16, c.y * T + 16) < 26 && !c.opened) {
        c.opened = true;
        flags.chests.push(c.id);
        env.Audio.sphere();
        if (c.item === 'key') {
          P.keys++;
          toast('Você obteve uma Chave!');
        } else if (c.item === 'heart') {
          P.maxHp += 20;
          P.hp = P.maxHp;
          toast('Coração Arcano! Vida máxima +20.');
          env.Audio.levelUp();
        } else {
          P.gems += c.n;
          toast('Você obteve ' + c.n + ' Esferas!');
        }
        saveGame();
        return true;
      }
      if (c.opened && dist(fx, fy, c.x * T + 16, c.y * T + 16) < 26) {
        toast('O baú está vazio.');
        return true;
      }
    }
    // npc
    for (const n of npcs) {
      if (dist(fx, fy, n.x, n.y) < 30) {
        const ddx = P.x - n.x;
        const ddy = P.y - n.y;
        n.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'down' : 'up';
        say(n.name, npcLines(n.id));
        return true;
      }
    }
    // placa
    for (const s of signs) {
      if (dist(fx, fy, s.x * T + 16, s.y * T + 16) < 28) {
        say('Placa', [s.text]);
        return true;
      }
    }
    // portao
    const tx = Math.floor(fx / T);
    const ty = Math.floor(fy / T);
    if (tileAt(tx, ty) === GATE) {
      if (P.keys > 0) {
        P.keys--;
        const g = findGateStart(tx, ty);
        flags.gates.push(g);
        floodOpen(g[0], g[1]);
        env.Audio.levelUp();
        toast('Portão aberto!');
        saveGame();
      } else {
        toast('Trancado. Você precisa de uma Chave.');
      }
      return true;
    }
    // arvore ancestral
    const altar = props[0];
    if (altar && dist(P.x, P.y, altar.x + 48, altar.y + 80) < 100) {
      if (flags.final) {
        say('Árvore Ancestral', ['A Árvore Ancestral brilha em paz. O mundo está salvo.']);
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
      return true;
    }
    return false;
  }

  /* ------------------------------ combate ------------------------------ */
  function swordBox() {
    const d = DIRS[P.dir];
    const ch = RPG_CHAR[charId];
    const L = ch.reach;
    const W = ch.width;
    if (d[0] > 0) return { x: P.x + 2, y: P.y - W / 2, w: L, h: W };
    if (d[0] < 0) return { x: P.x - 2 - L, y: P.y - W / 2, w: L, h: W };
    if (d[1] > 0) return { x: P.x - W / 2, y: P.y + 2, w: W, h: L };
    return { x: P.x - W / 2, y: P.y - 2 - L, w: W, h: L };
  }

  function boxHitsEnemy(b, e) {
    const h = e.size / 2;
    return b.x < e.x + h && b.x + b.w > e.x - h && b.y < e.y + h && b.y + b.h > e.y - h;
  }

  function startAttack() {
    P.atkT = 0.22;
    P.atkCd = 0.3;
    P.hit.clear();
    env.Audio.slash();
    // arbustos
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
    e.hp -= dmg;
    e.flash = 0.14;
    popup(e.x, e.y - e.size / 2, '-' + dmg, '#fde047');
    burst(e.x, e.y, '#facc15', 5);
    if (!e.boss) {
      const a = Math.atan2(e.y - ay, e.x - ax);
      e.kx = Math.cos(a) * 200;
      e.ky = Math.sin(a) * 200;
      e.kT = 0.14;
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
        winT = 2.5;
        toast('O Guardião do Cataclisma foi derrotado!');
      } else {
        flags[e.key] = true;
        P.orbs++;
        env.Audio.win();
        toast('Orbe Arcano da ' + BOSS_DEF[e.key].orb + ' obtido! (' + P.orbs + '/3)');
      }
      saveGame();
    } else {
      const r = rr();
      if (r < 0.35) drops.push({ x: e.x, y: e.y, type: 'gem', t: 0 });
      else if (r < 0.5) drops.push({ x: e.x, y: e.y, type: 'heart', t: 0 });
    }
  }

  function shootEnemy(e, speed, dmg, color, ang) {
    eprojs.push({ x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 6, dmg, color, life: 3 });
  }

  /* ------------------------------ atualizacao ------------------------------ */
  function updateEnemy(e, dt) {
    if (e.flash > 0) e.flash -= dt;
    const hw = e.size / 2 - 3;
    if (e.kT > 0) {
      e.kT -= dt;
      moveBox(e, e.kx * dt, e.ky * dt, hw, hw, e.fly);
      return;
    }
    const dx = P.x - e.x;
    const dy = P.y - e.y;
    const dd = Math.hypot(dx, dy) || 1;

    if (e.type === 'slime' || e.type === 'knight') {
      const chase = dd < (e.type === 'knight' ? 220 : 170);
      if (chase) {
        moveBox(e, (dx / dd) * e.speed * 1.25 * dt, 0, hw, hw);
        moveBox(e, 0, (dy / dd) * e.speed * 1.25 * dt, hw, hw);
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 0.8 + rr() * 1.5;
          const a = rr() * Math.PI * 2;
          const still = rr() < 0.3;
          e.wx = still ? 0 : Math.cos(a);
          e.wy = still ? 0 : Math.sin(a);
        }
        moveBox(e, e.wx * e.speed * 0.6 * dt, e.wy * e.speed * 0.6 * dt, hw, hw);
      }
    } else if (e.type === 'bat') {
      e.phase += dt * 5;
      if (dd < 240) {
        const a = Math.atan2(dy, dx) + Math.sin(e.phase) * 0.9;
        moveBox(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, 0, 0, true);
      } else {
        moveBox(e, Math.cos(e.phase * 0.4) * 30 * dt, Math.sin(e.phase * 0.5) * 30 * dt, 0, 0, true);
      }
    } else if (e.type === 'sentinel') {
      e.shootT -= dt;
      if (dd < 280 && e.shootT <= 0) {
        e.shootT = 2.0;
        shootEnemy(e, 190, e.dmg, '#f43f5e', Math.atan2(dy, dx));
      }
    } else if (e.boss) {
      updateBoss(e, dt, dx, dy, dd);
    }

    // contato
    if (dd < e.size / 2 + P.hw - 2) hurtPlayer(e.dmg, e.x, e.y);
  }

  function updateBoss(e, dt, dx, dy, dd) {
    const def = BOSS_DEF[e.key];
    const rage = e.hp < e.maxHp * 0.5 ? 1.35 : 1;
    const hw = e.size / 2 - 6;
    e.patT -= dt * rage;
    if (e.state === 'idle') {
      if (dd > 80) {
        moveBox(e, (dx / dd) * e.speed * dt, 0, hw, hw);
        moveBox(e, 0, (dy / dd) * e.speed * dt, hw, hw);
      }
      if (e.patT <= 0) {
        const pat = def.patterns[e.pat % def.patterns.length];
        e.pat++;
        e.state = pat;
        e.stT = 0;
      }
    } else if (e.state === 'dash') {
      e.stT += dt;
      if (e.stT < 0.6) {
        e.dvx = dx / dd;
        e.dvy = dy / dd;
      } else if (e.stT < 1.2) {
        moveBox(e, e.dvx * e.speed * 4.2 * dt, 0, hw, hw);
        moveBox(e, 0, e.dvy * e.speed * 4.2 * dt, hw, hw);
      } else {
        e.state = 'idle';
        e.patT = 1.8;
      }
    } else if (e.state === 'fan') {
      e.stT += dt;
      if (e.stT > 0.5 && !e.fired) {
        e.fired = true;
        const base = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) shootEnemy(e, 200, def.dmg - 4, def.color, base + i * 0.28);
        env.Audio.shoot();
      }
      if (e.stT > 1.0) {
        e.fired = false;
        e.state = 'idle';
        e.patT = 1.8;
      }
    } else if (e.state === 'ring') {
      e.stT += dt;
      if (e.stT > 0.6 && !e.fired) {
        e.fired = true;
        const off = rr();
        for (let i = 0; i < 14; i++) shootEnemy(e, 170, def.dmg - 6, def.color, off + (i / 14) * Math.PI * 2);
        env.Audio.shoot();
      }
      if (e.stT > 1.1) {
        e.fired = false;
        e.state = 'idle';
        e.patT = 2.0;
      }
    } else if (e.state === 'summon') {
      e.stT += dt;
      if (e.stT > 0.6 && !e.fired) {
        e.fired = true;
        const n = enemies.filter((x) => !x.boss).length;
        if (n < 9) {
          [[-1, 0], [1, 0]].forEach(([sx]) => {
            const f = findFree(Math.floor((e.x + sx * 70) / T), Math.floor(e.y / T));
            enemies.push(makeEnemy(e.key === 'final' ? 'knight' : 'slime', f.x, f.y, def.color));
          });
        }
        burst(e.x, e.y, def.color, 16);
      }
      if (e.stT > 1.0) {
        e.fired = false;
        e.state = 'idle';
        e.patT = 2.2;
      }
    }
  }

  function update(dt) {
    if (!active || paused) return;
    time += dt;
    const is = env.isJust;
    const dn = env.isDown;

    if (fade > 0) fade = Math.max(0, fade - dt * 1.4);
    if (winT > 0) {
      winT -= dt;
      if (winT <= 0) {
        saveGame();
        env.onWin();
        return;
      }
    }

    // timers
    ['atkT', 'atkCd', 'shotCd', 'dashT', 'dashCd', 'inv'].forEach((k) => {
      if (P[k] > 0) P[k] -= dt;
    });

    if (deadT > 0) {
      deadT -= dt;
      if (deadT <= 0) respawn();
      return;
    }

    // dialogo
    if (dlg) {
      const line = dlg.lines[dlg.i];
      dlg.shown = Math.min(line.length, dlg.shown + dt * 60);
      if (is('Space', 'KeyE', 'Enter', 'KeyJ', 'KeyZ')) {
        if (dlg.shown < line.length) {
          dlg.shown = line.length;
        } else if (dlg.i < dlg.lines.length - 1) {
          dlg.i++;
          dlg.shown = 0;
        } else {
          const cb = dlg.onEnd;
          dlg = null;
          if (cb) cb();
        }
      }
      return;
    }

    // entrada
    let dx = (dn('ArrowRight', 'KeyD') ? 1 : 0) - (dn('ArrowLeft', 'KeyA') ? 1 : 0);
    let dy = (dn('ArrowDown', 'KeyS') ? 1 : 0) - (dn('ArrowUp', 'KeyW') ? 1 : 0);
    P.moving = dx !== 0 || dy !== 0;
    if (P.moving) {
      P.anim += dt;
      if (dx !== 0 && dy === 0) P.dir = dx > 0 ? 'right' : 'left';
      else if (dy !== 0 && dx === 0) P.dir = dy > 0 ? 'down' : 'up';
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    if (is('Space', 'KeyE', 'Enter')) {
      if (interact()) return;
    }
    if (is('KeyJ', 'KeyZ') && P.atkCd <= 0) startAttack();
    if (is('KeyL', 'KeyX') && P.shotCd <= 0) {
      P.shotCd = 0.5;
      const d = DIRS[P.dir];
      const ch = env.Chars[charId];
      pprojs.push({
        x: P.x + d[0] * 12, y: P.y + d[1] * 12, vx: d[0] * 380, vy: d[1] * 380, r: 6,
        dmg: Math.round(P.atq * ch.shotMult), color: ch.shotColor, life: 0.8
      });
      env.Audio.shoot();
    }
    if (is('ShiftLeft', 'ShiftRight', 'KeyK') && P.dashCd <= 0) {
      P.dashT = 0.18;
      P.dashCd = 0.7;
      const d = DIRS[P.dir];
      P.dvx = P.moving ? dx : d[0];
      P.dvy = P.moving ? dy : d[1];
      env.Audio.dash();
      burst(P.x, P.y, env.Chars[charId].accent, 8);
    }

    // movimento
    const base = 96 + P.spd * 6;
    if (P.kT > 0) {
      P.kT -= dt;
      moveBox(P, P.kx * dt, P.ky * dt, P.hw, P.hh);
    } else if (P.dashT > 0) {
      moveBox(P, P.dvx * 420 * dt, P.dvy * 420 * dt, P.hw, P.hh);
    } else {
      const sp = P.atkT > 0 ? base * 0.45 : base;
      moveBox(P, dx * sp * dt, 0, P.hw, P.hh);
      moveBox(P, 0, dy * sp * dt, P.hw, P.hh);
    }

    // ataque da espada
    if (P.atkT > 0) {
      const b = swordBox();
      for (const e of enemies.slice()) {
        if (!P.hit.has(e.id) && boxHitsEnemy(b, e)) {
          P.hit.add(e.id);
          damageEnemy(e, P.atq + 6, P.x, P.y);
        }
      }
    }

    // inimigos
    for (const e of enemies.slice()) updateEnemy(e, dt);

    // projeteis do jogador
    for (const p of pprojs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (solidTile(p.x, p.y)) p.life = 0;
      for (const e of enemies.slice()) {
        if (p.life > 0 && dist(p.x, p.y, e.x, e.y) < p.r + e.size / 2) {
          p.life = 0;
          damageEnemy(e, p.dmg, p.x - p.vx, p.y - p.vy);
        }
      }
    }
    pprojs = pprojs.filter((p) => p.life > 0);

    // projeteis inimigos
    for (const p of eprojs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (solidTile(p.x, p.y)) p.life = 0;
      if (p.life > 0 && dist(p.x, p.y, P.x, P.y) < p.r + P.hw) {
        p.life = 0;
        hurtPlayer(p.dmg, p.x - p.vx, p.y - p.vy);
      }
    }
    eprojs = eprojs.filter((p) => p.life > 0);

    // drops
    for (const d of drops) {
      d.t += dt;
      if (dist(d.x, d.y, P.x, P.y) < 18) {
        d.t = 999;
        if (d.type === 'heart') {
          P.hp = Math.min(P.maxHp, P.hp + 15);
          popup(P.x, P.y - 18, '+15 HP', '#4ade80');
        } else {
          P.gems++;
          popup(P.x, P.y - 18, '+1 Esfera', '#38bdf8');
        }
        env.Audio.sphere();
      }
    }
    drops = drops.filter((d) => d.t < 14);

    parts.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    parts = parts.filter((p) => p.life > 0);
    popups.forEach((p) => {
      p.y -= 30 * dt;
      p.life -= dt;
    });
    popups = popups.filter((p) => p.life > 0);
    toasts.forEach((t) => (t.t -= dt));
    toasts = toasts.filter((t) => t.t > 0);

    // camera
    const tx = clamp(P.x - VW / 2, 0, MW * T - VW);
    const ty = clamp(P.y - VH / 2, 0, MH * T - VH);
    camX += (tx - camX) * Math.min(1, dt * 8);
    camY += (ty - camY) * Math.min(1, dt * 8);
  }

  /* ------------------------------ desenho ------------------------------ */
  function drawHero(c, x, y, dir, pal, t, moving, atk, isPlayer) {
    c.save();
    c.translate(x, y - 6);
    // sombra
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.ellipse(0, 15, 11, 4, 0, 0, Math.PI * 2);
    c.fill();

    const step = moving ? Math.sin(t * 14) * 3 : 0;
    const out = '#14100a';
    // pernas
    c.fillStyle = '#3b2a1c';
    c.strokeStyle = out;
    c.lineWidth = 1.2;
    c.fillRect(-6, 9, 5, 6 + step * 0.5);
    c.fillRect(1, 9, 5, 6 - step * 0.5);

    const side = dir === 'left' || dir === 'right';
    const flip = dir === 'left' ? -1 : 1;
    c.scale(side ? flip : 1, 1);

    // chifres/orelhas atras
    c.fillStyle = pal.horn;
    c.strokeStyle = out;
    c.beginPath();
    c.moveTo(-8, -14);
    c.lineTo(-11, -26);
    c.lineTo(-2, -18);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(8, -14);
    c.lineTo(11, -26);
    c.lineTo(2, -18);
    c.closePath();
    c.fill();
    c.stroke();

    // corpo
    c.fillStyle = pal.coat;
    c.beginPath();
    c.roundRect(-9, -5, 18, 17, 4);
    c.fill();
    c.stroke();
    c.fillStyle = pal.trim;
    c.fillRect(-9, 8, 18, 2);
    if (dir === 'down') {
      c.fillRect(-1, -4, 2, 12);
    }
    // cinto
    c.fillStyle = '#5a3418';
    c.fillRect(-9, 3, 18, 3);

    // cabeca
    c.fillStyle = pal.skin;
    c.beginPath();
    c.arc(0, -11, 9, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // orelhas pontudas
    c.fillStyle = pal.skin;
    if (dir !== 'up' || true) {
      c.beginPath();
      c.moveTo(-8, -12);
      c.lineTo(-15, -15);
      c.lineTo(-8, -8);
      c.closePath();
      c.fill();
      c.stroke();
      if (!side) {
        c.beginPath();
        c.moveTo(8, -12);
        c.lineTo(15, -15);
        c.lineTo(8, -8);
        c.closePath();
        c.fill();
        c.stroke();
      }
    }
    // cabelo
    c.fillStyle = pal.hair;
    c.beginPath();
    if (dir === 'up') {
      c.arc(0, -11, 9.5, 0, Math.PI * 2);
    } else {
      c.arc(0, -12, 9.5, Math.PI, Math.PI * 2);
      c.lineTo(8, -10);
      c.quadraticCurveTo(0, -14, -8, -10);
    }
    c.closePath();
    c.fill();
    c.stroke();
    // rosto
    if (dir === 'down') {
      c.fillStyle = '#16a34a';
      c.fillRect(-5, -11, 3, 4);
      c.fillRect(2, -11, 3, 4);
      c.fillStyle = '#052e16';
      c.fillRect(-4, -10, 1.5, 3);
      c.fillRect(3, -10, 1.5, 3);
      if (pal.mask) {
        c.fillStyle = '#1e293b';
        c.fillRect(-6, -6, 12, 5);
      }
    } else if (side) {
      c.fillStyle = '#16a34a';
      c.fillRect(2, -11, 3, 4);
      c.fillStyle = '#052e16';
      c.fillRect(3.5, -10, 1.5, 3);
      if (pal.mask) {
        c.fillStyle = '#1e293b';
        c.fillRect(0, -6, 8, 5);
      }
    }

    // arma
    if (isPlayer) {
      const ch = RPG_CHAR[charId];
      const long = charId === 'nicks';
      if (atk > 0) {
        const prog = 1 - atk / 0.22;
        c.restore();
        c.save();
        c.translate(x, y - 6);
        const d = DIRS[dir];
        const ang = Math.atan2(d[1], d[0]);
        c.rotate(ang);
        if (long) {
          const ext = 10 + Math.sin(Math.min(1, prog) * Math.PI) * (ch.reach - 20);
          c.strokeStyle = '#374151';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(4, 2);
          c.lineTo(ext + 4, 2);
          c.stroke();
          c.fillStyle = '#cbd5e1';
          c.beginPath();
          c.moveTo(ext + 4, -3);
          c.lineTo(ext + 16, 2);
          c.lineTo(ext + 4, 7);
          c.closePath();
          c.fill();
          c.fillStyle = '#fb923c';
          c.beginPath();
          c.arc(ext + 19, 2, 5 + Math.sin(t * 40) * 1.5, 0, Math.PI * 2);
          c.fill();
        } else {
          const sw = -1.2 + prog * 2.4;
          c.strokeStyle = 'rgba(253,224,71,0.9)';
          c.lineWidth = 5;
          c.beginPath();
          c.arc(0, 0, ch.reach * 0.8, sw - 0.9, sw + 0.1);
          c.stroke();
          c.strokeStyle = '#e2e8f0';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(Math.cos(sw) * ch.reach * 0.75, Math.sin(sw) * ch.reach * 0.75);
          c.stroke();
        }
      } else if (long) {
        // lanca no chao ao lado
        c.strokeStyle = '#374151';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(10, 14);
        c.lineTo(12, -22);
        c.stroke();
        c.fillStyle = '#fb923c';
        c.beginPath();
        c.arc(12, -26, 3.5 + Math.sin(t * 20) * 0.8, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = '#cbd5e1';
        c.fillRect(10, 2, 3, 12);
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
    const x = e.x - camX;
    const y = e.y - camY;
    if (x < -60 || x > VW + 60 || y < -60 || y > VH + 60) return;
    c.save();
    c.translate(x, y);
    if (e.flash > 0) c.filter = 'brightness(2.2)';
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.ellipse(0, e.size / 2 - 2, e.size / 2, 5, 0, 0, Math.PI * 2);
    c.fill();
    const out = '#14100a';
    c.strokeStyle = out;
    c.lineWidth = 1.8;

    if (e.type === 'slime') {
      const sq = Math.sin(time * 6 + e.id) * 2;
      c.fillStyle = e.color;
      c.beginPath();
      c.ellipse(0, 2, 12 + sq, 10 - sq, 0, Math.PI, 0);
      c.lineTo(12 + sq, 10);
      c.lineTo(-12 - sq, 10);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.beginPath();
      c.ellipse(-5, -3, 3, 2, -0.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.fillRect(-6, 0, 4, 5);
      c.fillRect(2, 0, 4, 5);
      c.fillStyle = '#111';
      c.fillRect(-5, 2, 2, 3);
      c.fillRect(3, 2, 2, 3);
    } else if (e.type === 'bat') {
      const fl = Math.sin(time * 18 + e.id) * 6;
      c.fillStyle = '#4c1d95';
      c.beginPath();
      c.moveTo(0, -2);
      c.quadraticCurveTo(-12, -10 - fl, -18, 0 - fl);
      c.quadraticCurveTo(-10, 2, -4, 6);
      c.lineTo(4, 6);
      c.quadraticCurveTo(10, 2, 18, 0 - fl);
      c.quadraticCurveTo(12, -10 - fl, 0, -2);
      c.fill();
      c.stroke();
      c.fillStyle = '#6d28d9';
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#fde047';
      c.fillRect(-3, -2, 2, 2);
      c.fillRect(1, -2, 2, 2);
    } else if (e.type === 'knight') {
      c.fillStyle = '#475569';
      c.beginPath();
      c.roundRect(-11, -8, 22, 22, 5);
      c.fill();
      c.stroke();
      c.fillStyle = '#64748b';
      c.beginPath();
      c.arc(0, -12, 9, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#ef4444';
      c.fillRect(-5, -14, 10, 3);
      c.fillStyle = '#94a3b8';
      c.fillRect(-14, -2, 5, 14);
      c.strokeRect(-14, -2, 5, 14);
    } else if (e.type === 'sentinel') {
      c.fillStyle = '#374151';
      c.beginPath();
      c.roundRect(-10, -12, 20, 24, 4);
      c.fill();
      c.stroke();
      const pulse = 4 + Math.sin(time * 5) * 1.2;
      c.fillStyle = '#f43f5e';
      c.shadowColor = '#f43f5e';
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(0, -2, pulse, 0, Math.PI * 2);
      c.fill();
    } else if (e.boss) {
      const s = e.size / 2;
      const tele = e.state !== 'idle';
      const aura = c.createRadialGradient(0, 0, 8, 0, 0, s + 22);
      aura.addColorStop(0, e.color + 'aa');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = aura;
      c.fillRect(-s - 24, -s - 24, (s + 24) * 2, (s + 24) * 2);
      c.fillStyle = '#2b1a3f';
      c.beginPath();
      c.roundRect(-s, -s + 6, s * 2, s * 2 - 6, 14);
      c.fill();
      c.stroke();
      c.fillStyle = e.color;
      c.beginPath();
      c.roundRect(-s + 5, -s + 12, s * 2 - 10, s * 1.2, 10);
      c.fill();
      c.fillStyle = '#78350f';
      c.beginPath();
      c.moveTo(-s + 6, -s + 8);
      c.lineTo(-s - 4, -s - 14);
      c.lineTo(-s + 16, -s + 4);
      c.moveTo(s - 6, -s + 8);
      c.lineTo(s + 4, -s - 14);
      c.lineTo(s - 16, -s + 4);
      c.fill();
      c.fillStyle = tele ? '#fff' : '#ef4444';
      c.fillRect(-s * 0.55, -4, 9, 7);
      c.fillRect(s * 0.55 - 9, -4, 9, 7);
    }
    c.restore();
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

    // placas, baus
    for (const s of signs) {
      const x = s.x * T - camX;
      const y = s.y * T - camY;
      c.fillStyle = '#7a4b28';
      c.fillRect(x + 14, y + 14, 4, 14);
      c.fillStyle = '#c8924f';
      c.strokeStyle = '#14100a';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(x + 5, y + 5, 22, 14, 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#5a3418';
      c.fillRect(x + 9, y + 9, 14, 2);
      c.fillRect(x + 9, y + 13, 10, 2);
    }
    for (const ch of chests) {
      const x = ch.x * T - camX;
      const y = ch.y * T - camY;
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(x + 16, y + 28, 12, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#14100a';
      c.lineWidth = 1.8;
      c.fillStyle = ch.opened ? '#8a5a2b' : '#b3722f';
      c.beginPath();
      c.roundRect(x + 4, y + 12, 24, 15, 3);
      c.fill();
      c.stroke();
      c.fillStyle = ch.opened ? '#5a3418' : '#d89a4a';
      c.beginPath();
      c.roundRect(x + 4, y + (ch.opened ? 6 : 8), 24, 8, [6, 6, 0, 0]);
      c.fill();
      c.stroke();
      c.fillStyle = '#facc15';
      c.fillRect(x + 14, y + 13, 4, 6);
      if (!ch.opened) {
        c.save();
        c.globalAlpha = 0.5 + 0.4 * Math.sin(time * 4);
        c.fillStyle = '#fde047';
        c.fillRect(x + 22 + Math.sin(time * 3) * 2, y + 5, 2.5, 2.5);
        c.restore();
      }
    }

    // arvore ancestral
    const al = props[0];
    {
      const x = al.x - camX;
      const y = al.y - camY;
      if (x > -140 && x < VW + 40 && y > -160 && y < VH + 60) {
        c.save();
        const glow = c.createRadialGradient(x + 48, y + 30, 10, x + 48, y + 30, 120);
        glow.addColorStop(0, flags.final ? 'rgba(253,224,71,0.5)' : 'rgba(168,85,247,0.35)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow;
        c.fillRect(x - 80, y - 90, 260, 260);
        c.fillStyle = '#4a2c17';
        c.strokeStyle = '#14100a';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + 22, y + 96);
        c.quadraticCurveTo(x + 30, y + 50, x + 36, y + 40);
        c.lineTo(x + 60, y + 40);
        c.quadraticCurveTo(x + 66, y + 50, x + 74, y + 96);
        c.closePath();
        c.fill();
        c.stroke();
        const cols = flags.final ? ['#4ade80', '#86efac'] : ['#7e22ce', '#a855f7'];
        [[48, 20, 34], [20, 34, 24], [76, 34, 24], [48, 4, 22]].forEach(([dx, dy, r], i) => {
          c.fillStyle = cols[i % 2];
          c.beginPath();
          c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        for (let i = 0; i < 3; i++) {
          const lit = i < P.orbs;
          c.fillStyle = lit ? '#fde047' : '#374151';
          c.shadowColor = '#fde047';
          c.shadowBlur = lit ? 14 : 0;
          c.beginPath();
          c.arc(x + 30 + i * 18, y + 70, 5, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    }

    // drops
    for (const d of drops) {
      const x = d.x - camX;
      const y = d.y - camY + Math.sin(time * 6 + d.x) * 2;
      if (d.t > 10 && Math.floor(time * 10) % 2 === 0) continue;
      if (d.type === 'heart') {
        c.fillStyle = '#ef4444';
        c.strokeStyle = '#7f1d1d';
        c.lineWidth = 1.5;
        heartPath(c, x, y, 8);
        c.fill();
        c.stroke();
      } else {
        c.save();
        c.shadowColor = '#38bdf8';
        c.shadowBlur = 8;
        c.fillStyle = '#7dd3fc';
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    // entidades ordenadas por y
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

    // projeteis
    for (const p of pprojs.concat(eprojs)) {
      c.save();
      c.shadowColor = p.color;
      c.shadowBlur = 12;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(p.x - camX, p.y - camY, p.r - 1, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = p.color;
      c.lineWidth = 2.5;
      c.stroke();
      c.restore();
    }
    for (const p of parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.color;
      c.fillRect(p.x - camX, p.y - camY, p.size, p.size);
    }
    c.globalAlpha = 1;
    for (const p of popups) {
      c.globalAlpha = Math.min(1, p.life * 1.5);
      c.font = 'bold 13px Segoe UI, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = p.color;
      c.strokeStyle = '#000';
      c.lineWidth = 3;
      c.strokeText(p.text, p.x - camX, p.y - camY);
      c.fillText(p.text, p.x - camX, p.y - camY);
    }
    c.globalAlpha = 1;
    c.textAlign = 'left';

    drawHud(c);

    if (fade > 0 || deadT > 0) {
      c.fillStyle = 'rgba(0,0,0,' + (deadT > 0 ? Math.min(1, (1.8 - deadT) / 1.2) : fade) + ')';
      c.fillRect(0, 0, VW, VH);
    }
    if (winT > 0) {
      c.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, (2.5 - winT) / 2.5) + ')';
      c.fillRect(0, 0, VW, VH);
    }
  }

  function panel(c, x, y, w, h) {
    c.fillStyle = 'rgba(12,18,28,0.82)';
    c.strokeStyle = '#eab308';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x, y, w, h, 8);
    c.fill();
    c.stroke();
  }

  function wrap(c, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawHud(c) {
    // coracoes
    const n = Math.ceil(P.maxHp / 20);
    panel(c, 8, 8, Math.min(n, 10) * 22 + 16, (n > 10 ? 2 : 1) * 22 + 46);
    for (let i = 0; i < n; i++) {
      const hx = 24 + (i % 10) * 22;
      const hy = 26 + Math.floor(i / 10) * 22;
      c.fillStyle = '#3b1010';
      c.strokeStyle = '#14100a';
      c.lineWidth = 1.5;
      heartPath(c, hx, hy, 9);
      c.fill();
      c.stroke();
      const rem = P.hp - i * 20;
      if (rem > 0) {
        c.save();
        c.beginPath();
        c.rect(hx - 12, hy - 12, rem >= 20 ? 24 : 12, 24);
        c.clip();
        c.fillStyle = '#ef4444';
        heartPath(c, hx, hy, 9);
        c.fill();
        c.restore();
      }
    }
    const by = 8 + (n > 10 ? 2 : 1) * 22 + 6;
    c.fillStyle = '#0f172a';
    c.fillRect(16, by, 150, 8);
    c.fillStyle = '#38bdf8';
    c.fillRect(16, by, 150 * clamp(P.exp / P.expToNext, 0, 1), 8);
    c.strokeStyle = '#94a3b8';
    c.lineWidth = 1;
    c.strokeRect(16, by, 150, 8);
    c.font = 'bold 11px Segoe UI, sans-serif';
    c.fillStyle = '#fde047';
    c.fillText('Lv.' + P.level + '  HP ' + P.hp + '/' + P.maxHp, 16, by + 22);

    // recursos
    panel(c, 8, by + 30, 190, 24);
    c.fillStyle = '#7dd3fc';
    c.beginPath();
    c.arc(22, by + 42, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f8fafc';
    c.font = 'bold 12px Segoe UI, sans-serif';
    c.fillText(String(P.gems), 32, by + 46);
    c.fillStyle = '#facc15';
    c.fillText('🗝 ' + P.keys, 72, by + 46);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < P.orbs ? '#fde047' : '#374151';
      c.strokeStyle = '#14100a';
      c.beginPath();
      c.arc(130 + i * 20, by + 42, 6, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // minimapa
    const mx = VW - 144;
    const my = 8;
    panel(c, mx - 4, my - 4, 136, 104);
    c.drawImage(mini, mx, my);
    c.fillStyle = '#fff';
    c.fillRect(P.x / T * 2 - 2 + mx, P.y / T * 2 - 2 + my, 5, 5);
    enemies.filter((e) => e.boss).forEach((e) => {
      c.fillStyle = '#ef4444';
      c.fillRect(e.x / T * 2 - 2 + mx, e.y / T * 2 - 2 + my, 5, 5);
    });

    // barra do chefe
    const boss = enemies.find((e) => e.boss && dist(e.x, e.y, P.x, P.y) < 340);
    if (boss) {
      const bw = 360;
      const bx = (VW - bw) / 2;
      panel(c, bx - 8, VH - 74 - (dlg ? 0 : 0), bw + 16, 30);
      c.fillStyle = '#2b0d0d';
      c.fillRect(bx, VH - 58, bw, 10);
      c.fillStyle = '#ef4444';
      c.fillRect(bx, VH - 58, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
      c.fillStyle = '#fde047';
      c.font = 'bold 12px Segoe UI, sans-serif';
      c.textAlign = 'center';
      c.fillText(boss.name, VW / 2, VH - 63);
      c.textAlign = 'left';
    }

    // objetivo
    if (!dlg) {
      let obj = 'Fale com o Ancião Nuvem na vila.';
      if (flags.met) {
        if (flags.final) obj = 'Aventura concluída!';
        else if (P.orbs >= 3) obj = 'Leve os 3 Orbes à Árvore Ancestral, ao norte.';
        else obj = 'Derrote os Guardiões (Orbes ' + P.orbs + '/3). Procure Chaves nos baús!';
      }
      c.font = '12px Segoe UI, sans-serif';
      const w = c.measureText(obj).width + 20;
      panel(c, 8, VH - 32, w, 24);
      c.fillStyle = '#e2e8f0';
      c.fillText(obj, 18, VH - 15);
    }

    // avisos
    toasts.forEach((t, i) => {
      c.font = 'bold 14px Segoe UI, sans-serif';
      c.textAlign = 'center';
      const w = c.measureText(t.text).width + 28;
      c.globalAlpha = Math.min(1, t.t);
      panel(c, (VW - w) / 2, 110 + i * 34, w, 28);
      c.fillStyle = '#fde047';
      c.fillText(t.text, VW / 2, 129 + i * 34);
      c.globalAlpha = 1;
    });
    c.textAlign = 'left';

    // dialogo
    if (dlg) {
      const bx = 60;
      const bw = VW - 120;
      const bh = 120;
      const by2 = VH - bh - 16;
      panel(c, bx, by2, bw, bh);
      c.fillStyle = '#fde047';
      c.font = 'bold 15px Segoe UI, sans-serif';
      c.fillText(dlg.name, bx + 18, by2 + 26);
      c.fillStyle = '#f8fafc';
      c.font = '15px Segoe UI, sans-serif';
      const txt = dlg.lines[dlg.i].slice(0, Math.floor(dlg.shown));
      wrap(c, txt, bw - 36).slice(0, 4).forEach((ln, i) => c.fillText(ln, bx + 18, by2 + 52 + i * 22));
      if (dlg.shown >= dlg.lines[dlg.i].length && Math.floor(time * 3) % 2 === 0) {
        c.fillStyle = '#fde047';
        c.fillText('▼', bx + bw - 28, by2 + bh - 14);
      }
    }
  }

  /* ------------------------------ api ------------------------------ */
  function init(e) {
    env = e;
  }

  return {
    init,
    start,
    stop,
    restart,
    update,
    draw,
    setPaused,
    isActive: () => active,
    hasSave: (id) => !!localStorage.getItem('rpg_save_' + id)
  };
})();
