window.Jogo = window.Jogo || {};

/* =====================================================================
   MODO RPG (Mundo Aberto) - 4 ATOS COMPLETOS
   Ato 1: Continente | Ato 2: Torre no Mar
   Ato 3: Triangulo das Bermudas | Ato 4: A Lenda das Esferas
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

  const ACT_META = [
    null,
    { id: 1, title: 'ATO 1: CONTINENTE', name: 'Ato 1 — Continente das Árvores', spawn: { x: 32 * T + 16, y: 42 * T + 16 } },
    { id: 2, title: 'ATO 2: TORRE NO MAR', name: 'Ato 2 — A Torre no Mar', spawn: { x: 32 * T + 16, y: 41 * T + 16 } },
    { id: 3, title: 'ATO 3: BERMUDAS', name: 'Ato 3 — Triângulo das Bermudas', spawn: { x: 32 * T + 16, y: 41 * T + 16 } },
    { id: 4, title: 'ATO 4: AS ESFERAS', name: 'Ato 4 — A Lenda das Esferas', spawn: { x: 32 * T + 16, y: 41 * T + 16 } }
  ];

  let env = null;
  let active = false;
  let paused = false;
  let time = 0;

  let act = 1;
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
  let shop = null;   // { idx }
  let travel = null; // { idx }
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

  function rnd(a, b = 0) {
    const x = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function rr() { return Math.random(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function mk() { return document.createElement('canvas'); }

  function isActUnlocked(n) {
    if (n === 1) return true;
    if (n === 2) return !!(flags.act2Unlocked || flags.final);
    if (n === 3) return !!(flags.act3Unlocked || flags.towerBoss);
    if (n === 4) return !!(flags.act4Unlocked || flags.bermudaBoss);
    return false;
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return act === 1 ? TREE : WATER;
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

  function moveBox(e, dx, dy, hw, hh, fly, swim) {
    const canSail = e === P && (act === 2 || act === 3);
    const okTile = (px, py) => {
      const t = tileAt(Math.floor(px / T), Math.floor(py / T));
      if (swim) return t === WATER;
      if (canSail) return t === WATER || !SOLID[t];
      return !SOLID[t];
    };
    const isBlk = (cx, cy) => {
      if (!okTile(cx - hw, cy - hh) || !okTile(cx + hw, cy - hh) || !okTile(cx - hw, cy + hh) || !okTile(cx + hw, cy + hh)) return true;
      if (swim) return false;
      const rects = solidRects();
      for (const r of rects) {
        if (cx - hw < r.x + r.w && cx + hw > r.x && cy - hh < r.y + r.h && cy + hh > r.y) return true;
      }
      return false;
    };
    if (dx) {
      const nx = e.x + dx;
      if (fly) e.x = clamp(nx, 40, MW * T - 40);
      else if (!isBlk(nx, e.y)) e.x = nx;
    }
    if (dy) {
      const ny = e.y + dy;
      if (fly) e.y = clamp(ny, 40, MH * T - 40);
      else if (!isBlk(e.x, ny)) e.y = ny;
    }
    if (e === P) {
      const curT = tileAt(Math.floor(P.x / T), Math.floor(P.y / T));
      P.sailing = canSail && curT === WATER;
    }
  }

  function findFree(tx, ty) {
    for (let r = 0; r < 8; r++) {
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const x = tx + i; const y = ty + j;
          const t = tileAt(x, y);
          if (!SOLID[t] && t !== SWATER && t !== WATER) {
            const cx = x * T + 16; const cy = y * T + 16;
            if (!blocked(cx, cy, 12, 12)) return { x: cx, y: cy };
          }
        }
      }
    }
    return { x: tx * T + 16, y: ty * T + 16 };
  }

  /* ------------------------------ tiles ------------------------------ */
  function grassBase(c, v) {
    const fill = act === 3 ? '#2c7a7b' : (act === 2 ? '#3d9970' : '#5bb450');
    const stroke = act === 3 ? '#1d4e4f' : (act === 2 ? '#2c7555' : '#3f9140');
    c.fillStyle = fill;
    c.fillRect(0, 0, T, T);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, 0, T, 10);
    c.strokeStyle = stroke;
    c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = 3 + rnd(v, i) * 26;
      const y = 4 + rnd(v, i + 9) * 24;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1.5, y - 4); c.moveTo(x, y); c.lineTo(x + 2, y - 3); c.stroke();
    }
  }

  function buildTile(type, v, f) {
    const cv = mk(); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    switch (type) {
      case GRASS:
        grassBase(c, v);
        break;
      case FLOWER: {
        grassBase(c, v);
        const cols = act === 3 ? ['#5eead4', '#fde047', '#ffffff', '#818cf8'] : ['#fde047', '#f9a8d4', '#ffffff', '#93c5fd'];
        for (let i = 0; i < 4; i++) {
          const x = 4 + rnd(v, i + 20) * 24; const y = 5 + rnd(v, i + 30) * 22;
          c.fillStyle = cols[(v + i) % 4]; c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill();
        }
        break;
      }
      case PATH:
        c.fillStyle = act === 4 ? '#ca8a04' : '#cfa96e';
        c.fillRect(0, 0, T, T);
        c.fillStyle = act === 4 ? 'rgba(254,240,138,0.28)' : 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 6; i++) {
          c.beginPath(); c.ellipse(3 + rnd(v, i) * 26, 3 + rnd(v, i + 5) * 26, 3, 2, 0, 0, Math.PI * 2); c.fill();
        }
        break;
      case DOCK:
        c.fillStyle = act === 4 ? '#6d28d9' : '#8b5a2b';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = act === 4 ? '#fde047' : '#4a2c17';
        c.lineWidth = 1.5;
        for (let y = 0; y < T; y += 8) c.strokeRect(0, y, T, 8);
        break;
      case WATER:
      case SWATER: {
        const sw = type === SWATER;
        const wCol = sw ? '#3b6b3a' : (act === 4 ? '#1e1038' : act === 3 ? '#0f4c5c' : act === 2 ? '#1d4e89' : '#3b82d6');
        c.fillStyle = wCol;
        c.fillRect(0, 0, T, T);
        if (act === 4) {
          c.fillStyle = f ? '#fde047' : '#c084fc';
          for (let i = 0; i < 3; i++) c.fillRect(rnd(v, i + 11) * 28, rnd(v, i + 22) * 28, 2, 2);
        } else {
          c.strokeStyle = sw ? 'rgba(190,242,100,0.5)' : (act === 3 ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.45)');
          c.lineWidth = 1.5;
          for (let k = 0; k < 2; k++) {
            const y = 8 + k * 14 + (f ? 2 : 0);
            c.beginPath(); c.moveTo(2, y); c.quadraticCurveTo(8, y - 4, 14, y); c.quadraticCurveTo(20, y + 4, 28, y); c.stroke();
          }
        }
        break;
      }
      case TREE:
      case DEAD: {
        grassBase(c, v);
        const dead = type === DEAD;
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(16, 28, 12, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = dead ? '#3f3a35' : '#6b4423'; c.fillRect(13, 16, 6, 13);
        if (dead) {
          c.strokeStyle = '#3f3a35'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(16, 18); c.lineTo(6, 6); c.moveTo(16, 16); c.lineTo(26, 5); c.stroke();
        } else {
          const g = c.createRadialGradient(13, 9, 2, 16, 12, 17);
          g.addColorStop(0, act === 2 ? '#38bdf8' : '#4fbf5a');
          g.addColorStop(1, act === 2 ? '#0f766e' : '#1d6b34');
          c.fillStyle = g; c.strokeStyle = '#14451f'; c.lineWidth = 1.5;
          [[16, 11, 12], [9, 15, 8], [23, 15, 8]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke(); });
        }
        break;
      }
      case ROCK:
        grassBase(c, v);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(16, 27, 12, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = act === 3 ? '#64748b' : '#9ca3af'; c.strokeStyle = '#334155'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(4, 26); c.lineTo(7, 12); c.lineTo(16, 6); c.lineTo(26, 11); c.lineTo(29, 26); c.closePath(); c.fill(); c.stroke();
        break;
      case BUSH:
        if (act === 4) { c.fillStyle = '#312e81'; c.fillRect(0, 0, T, T); } else grassBase(c, v);
        c.fillStyle = act === 4 ? '#a855f7' : '#2f9d49'; c.strokeStyle = '#17572a'; c.lineWidth = 1.5;
        [[10, 18, 8], [22, 18, 8], [16, 13, 9]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke(); });
        c.fillStyle = '#fde047'; c.fillRect(13, 12, 2.5, 2.5);
        break;
      case MUD:
        c.fillStyle = act === 3 ? '#3b5249' : '#6d6a3a';
        c.fillRect(0, 0, T, T);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(3 + rnd(v, i + 40) * 26, 3 + rnd(v, i + 50) * 26, 4, 2.5, 0, 0, Math.PI * 2); c.fill(); }
        break;
      case WALL:
        c.fillStyle = act === 4 ? '#3b0764' : act === 3 ? '#134e4a' : act === 2 ? '#1e3a5f' : '#4a4560';
        c.fillRect(0, 0, T, T);
        c.strokeStyle = act === 4 ? '#eab308' : '#0f172a';
        c.lineWidth = 1.5;
        for (let r = 0; r < 4; r++) {
          const y = r * 8; c.strokeRect(0, y, T, 8);
          const off = r % 2 ? 8 : 0;
          c.beginPath(); c.moveTo(off + 8, y); c.lineTo(off + 8, y + 8); c.moveTo(off + 24, y); c.lineTo(off + 24, y + 8); c.stroke();
        }
        break;
      case FLOOR:
        c.fillStyle = act === 4 ? ((v % 2) ? '#312e81' : '#3730a3') : act === 3 ? ((v % 2) ? '#1e4e5f' : '#255c6e') : act === 2 ? ((v % 2) ? '#475569' : '#52627a') : ((v % 2) ? '#8d89a6' : '#9a96b3');
        c.fillRect(0, 0, T, T);
        c.strokeStyle = act === 4 ? 'rgba(250,204,21,0.3)' : 'rgba(40,36,64,0.45)';
        c.lineWidth = 1; c.strokeRect(0.5, 0.5, T - 1, T - 1);
        if (v % 5 === 0) {
          c.strokeStyle = act === 4 ? 'rgba(253,224,71,0.6)' : act === 3 ? 'rgba(45,212,191,0.6)' : 'rgba(56,189,248,0.5)';
          c.beginPath(); c.arc(16, 16, 7, 0, Math.PI * 2); c.stroke();
        }
        break;
      case ROOF:
        c.fillStyle = '#b3402f'; c.fillRect(0, 0, T, T);
        c.fillStyle = '#8f2f22';
        for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(k * 8 + (r % 2 ? 4 : 0), r * 8 + 8, 5, 0, Math.PI); c.fill(); }
        break;
      case HWALL:
        c.fillStyle = '#e8d9b5'; c.fillRect(0, 0, T, T);
        c.fillStyle = '#7a4b28'; c.fillRect(0, 0, T, 4); c.fillRect(0, 0, 4, T); c.fillRect(T - 4, 0, 4, T);
        if (v % 2 === 0) { c.fillStyle = '#7dd3fc'; c.fillRect(9, 8, 14, 12); c.strokeStyle = '#7a4b28'; c.lineWidth = 2; c.strokeRect(9, 8, 14, 12); }
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
    mini = mk(); mini.width = MW * 2; mini.height = MH * 2;
    const c = mini.getContext('2d');
    const col = {
      0: act === 3 ? '#2c7a7b' : '#5bb450', 1: act === 4 ? '#ca8a04' : '#cfa96e',
      2: act === 4 ? '#1e1038' : act === 3 ? '#0f4c5c' : '#2563eb',
      3: '#2f7a3c', 4: '#9ca3af', 5: act === 4 ? '#581c87' : '#4a4560',
      6: act === 4 ? '#4338ca' : '#9a96b3', 7: '#6fc460', 8: '#6d6a3a',
      10: '#e8d9b5', 11: '#b3402f', 12: '#5a3418', 14: '#2f9d49',
      15: '#facc15', 16: '#3f3a35', 17: '#3b6b3a', 18: '#a16207'
    };
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        c.fillStyle = col[tileAt(x, y)] || '#000';
        c.fillRect(x * 2, y * 2, 2, 2);
      }
    }
  }

  /* ------------------------------ objetos por Ato ------------------------------ */
  function makeEnemy(type, x, y, color) {
    const d = W.ENEMY_DEF[type];
    const diff = env.getDifficulty ? env.getDifficulty() : 'normal';
    const mHp = diff === 'hard' ? 1.45 : diff === 'easy' ? 0.75 : 1;
    const mDmg = diff === 'hard' ? 1.35 : diff === 'easy' ? 0.75 : 1;
    const mSpd = diff === 'hard' ? 1.2 : diff === 'easy' ? 0.85 : 1;
    const hp = Math.round(d.hp * mHp);
    return {
      id: ++enemyId, type, x, y, hp, maxHp: hp, dmg: Math.round(d.dmg * mDmg), speed: Math.round(d.speed * mSpd), exp: d.exp,
      size: d.size, fly: !!d.fly, swim: !!d.swim, color: color || '#6fcf5a', wanderT: 0, wx: 0, wy: 0, shootT: 1 + rr() * 2,
      flash: 0, kx: 0, ky: 0, kT: 0, phase: rr() * 6, boss: false
    };
  }

  function makeBoss(key, x, y) {
    const d = W.BOSS_DEF[key];
    const diff = env.getDifficulty ? env.getDifficulty() : 'normal';
    const mHp = diff === 'hard' ? 2.2 : diff === 'easy' ? 0.75 : 1;
    const mDmg = diff === 'hard' ? 1.7 : diff === 'easy' ? 0.75 : 1;
    const mSpd = diff === 'hard' ? 1.38 : diff === 'easy' ? 0.82 : 1;
    const f = findFree(Math.floor(x / T), Math.floor(y / T));
    const hp = Math.round(d.hp * mHp);
    return {
      id: ++enemyId, type: 'boss', key, x: f.x, y: f.y, hp, maxHp: hp, dmg: Math.round(d.dmg * mDmg), speed: Math.round(d.speed * mSpd), exp: d.exp,
      size: 46, fly: false, color: d.color, name: d.name, boss: true, flash: 0, kx: 0, ky: 0, kT: 0,
      pat: 0, patT: 1.8, state: 'strafe', stT: 0, strafeDir: 1, dvx: 0, dvy: 0, phase: 0, shootT: 0,
      shielded: true, vulnerable: false
    };
  }

  function ensureClear() {
    const open = (x, y, to) => {
      if (SOLID[tileAt(x, y)] || tileAt(x, y) === SWATER) setTile(x, y, to);
    };
    const floorDef = act === 4 ? FLOOR : GRASS;
    chests.forEach((c) => open(c.x, c.y, floorDef));
    npcs.forEach((n) => open(Math.floor(n.x / T), Math.floor(n.y / T), act === 4 ? FLOOR : PATH));
    signs.forEach((s) => open(s.x, s.y, act === 4 ? FLOOR : PATH));
    chests.forEach((c) => {
      [[-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => {
        const t = tileAt(c.x + dx, c.y + dy);
        if (SOLID[t] && t !== WALL && t !== HWALL && t !== GATE && t !== WATER) setTile(c.x + dx, c.y + dy, floorDef);
      });
    });
  }

  function gateKeyFor(a) { return a === 1 ? 'gates' : 'gates' + a; }

  function loadAct(targetAct, spawnPos) {
    act = clamp(targetAct, 1, 4);
    const builders = [null, W.buildAct1, W.buildAct2, W.buildAct3, W.buildAct4];
    map = builders[act]();
    tileCache = {};
    (flags[gateKeyFor(act)] || []).forEach((g) => floodOpen(g[0], g[1]));

    props = []; chests = []; npcs = []; signs = [];
    enemies = []; eprojs = []; pprojs = []; drops = []; parts = []; popups = [];

    const ch = (id, x, y, item, n) => chests.push({ id, x, y, item, n: n || 0, opened: !!(flags.chests && flags.chests.includes(id)) });
    const sg = (x, y, text) => signs.push({ x, y, text });
    const sp = (type, tx, ty, color) => { const f = findFree(tx, ty); enemies.push(makeEnemy(type, f.x, f.y, color)); };

    const bramPal = { hair: '#fb923c', coat: '#78350f', trim: '#facc15', skin: '#e6b89c', horn: '#92400e', mask: false };
    const capPal = { hair: '#1e293b', coat: '#1e3a8a', trim: '#eab308', skin: '#e6b89c', horn: '#1e3a8a', mask: false };

    const hideKey = (cx, cy) => {
      // Esconde o bau de chave cercado por arbustos cortaveis
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        const t = tileAt(cx + dx, cy + dy);
        if (!SOLID[t] && t !== WATER && t !== SWATER && t !== WALL && t !== GATE) setTile(cx + dx, cy + dy, BUSH);
      });
    };

    if (act === 1) {
      props.push({ kind: 'altar', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 45 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('forestKey', 5, 24, 'key'); ch('forestHeart', 6, 37, 'heart'); ch('forestGems', 9, 25, 'spheres', 12);
      ch('meadowHeart', 24, 28, 'heart'); ch('swampKey', 59, 40, 'key'); ch('swampHeart', 59, 36, 'heart');
      ch('ruinsGems', 22, 13, 'spheres', 20);

      npcs.push({ id: 'elder', name: 'Ancião Nuvem', x: 33 * T + 16, y: 42 * T + 8, dir: 'left', pal: { hair: '#d1d5db', coat: '#6d4aa8', trim: '#fde047', skin: '#f2c9a5', horn: '#6d4aa8', mask: false } });
      npcs.push({ id: 'healer', name: 'Curandeira Mira', x: 37 * T + 16, y: 41 * T + 8, dir: 'down', pal: { hair: '#f472b6', coat: '#e2f4ef', trim: '#14b8a6', skin: '#f5cbb0', horn: '#14b8a6', mask: false } });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 27 * T + 16, y: 41 * T + 8, dir: 'down', pal: bramPal });
      npcs.push({ id: 'mate', name: mateName, x: 29 * T + 16, y: 43 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'sage', name: 'Viajante Tati', x: 35 * T + 16, y: 30 * T + 16, dir: 'left', pal: { hair: '#7c3aed', coat: '#334155', trim: '#38bdf8', skin: '#e4f5e4', horn: '#334155', mask: false } });

      sg(30, 40, 'Vila Didalmiana. Oeste: Floresta. Leste: Pântano. Norte: Ruínas. Sul: Cais da Barca.');
      sg(23, 41, 'Floresta da Brisa. Dizem que chaves antigas se escondem atrás dos arbustos mais fechados...');
      sg(41, 41, 'Portão do Pântano. Só abre com uma Chave oculta na mata.');
      sg(30, 24, 'Ruínas da Forja. O portão exige uma Chave escondida nos confins do Pântano.');
      ensureClear();
      hideKey(5, 24);
      hideKey(59, 40);

      [[9, 34], [15, 30], [11, 38], [16, 36]].forEach(([x, y]) => sp('slime', x, y, '#6fcf5a'));
      [[8, 29], [17, 33], [14, 27]].forEach(([x, y]) => sp('bat', x, y));
      [[29, 28], [36, 26], [32, 31]].forEach(([x, y]) => sp('slime', x, y, '#f87171'));
      [[27, 33], [38, 24]].forEach(([x, y]) => sp('bat', x, y));
      [[46, 36], [49, 31], [56, 33]].forEach(([x, y]) => sp('slime', x, y, '#a3e635'));
      [[47, 28], [57, 28], [58, 39]].forEach(([x, y]) => sp('sentinel', x, y));
      [[45, 30], [58, 26]].forEach(([x, y]) => sp('bat', x, y));
      [[26, 16], [38, 16], [26, 20], [38, 20]].forEach(([x, y]) => sp('knight', x, y));
      [[22, 18], [42, 14]].forEach(([x, y]) => sp('sentinel', x, y));

      if (!flags.boss1) enemies.push(makeBoss('boss1', 12 * T + 16, 28 * T));
      if (!flags.boss2) enemies.push(makeBoss('boss2', 52 * T + 16, 28 * T));
      if (!flags.boss3) enemies.push(makeBoss('boss3', 32 * T + 16, 16 * T));
    } else if (act === 2) {
      props.push({ kind: 'altar', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 44 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('seaKey', 58, 25, 'key'); ch('seaHeart1', 7, 38, 'heart'); ch('seaHeart2', 57, 38, 'heart');
      ch('seaPotions', 26, 38, 'potion', 2); ch('towerGems', 23, 13, 'spheres', 25);

      npcs.push({ id: 'captain', name: 'Capitão Corvo', x: 34 * T + 16, y: 42 * T + 8, dir: 'left', pal: capPal });
      npcs.push({ id: 'mate2', name: mateName, x: 30 * T + 16, y: 40 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 36 * T + 16, y: 38 * T + 8, dir: 'down', pal: bramPal });

      sg(30, 38, 'Torre no Mar. Oeste: Ilha da Tempestade. Leste: Ilha da Maré. Norte: Cidadela das Esferas.');
      sg(30, 24, 'Portão da Cidadela. A Chave do Mar está oculta atrás de arbustos no extremo nordeste da Ilha da Maré.');
      ensureClear();
      hideKey(58, 25);

      [[10, 38], [15, 36], [8, 33]].forEach(([x, y]) => sp('stormling', x, y, '#38bdf8'));
      [[16, 28], [9, 26]].forEach(([x, y]) => sp('sentinel', x, y));
      [[48, 37], [55, 36], [57, 26]].forEach(([x, y]) => sp('corsair', x, y, '#0284c7'));
      [[47, 29], [56, 30]].forEach(([x, y]) => sp('stormling', x, y, '#06b6d4'));
      [[25, 16], [39, 16], [26, 20], [38, 20]].forEach(([x, y]) => sp('corsair', x, y, '#1d4ed8'));
      [[23, 18], [41, 14]].forEach(([x, y]) => sp('sentinel', x, y));

      if (!flags.stormBoss) enemies.push(makeBoss('stormBoss', 12 * T + 16, 30 * T));
      if (!flags.tideBoss) enemies.push(makeBoss('tideBoss', 52 * T + 16, 30 * T));
      // Feras marinhas no mar da Torre
      [[22, 30], [42, 30], [24, 44]].forEach(([x, y]) => enemies.push(makeEnemy('seabeast', x * T + 16, y * T + 16, '#0284c7')));
    } else if (act === 3) {
      // ATO 3: TRIANGULO DAS BERMUDAS (ONDE NASCEM OS DIDALMIANOS)
      props.push({ kind: 'altar', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 44 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('bermudaKey', 5, 40, 'key'); ch('bermudaHeart1', 6, 39, 'heart'); ch('bermudaHeart2', 58, 39, 'heart');
      ch('bermudaPotions', 26, 38, 'potion', 3); ch('bermudaGems', 42, 13, 'spheres', 35);

      npcs.push({ id: 'oracle', name: 'Oráculo das Marés', x: 34 * T + 16, y: 41 * T + 8, dir: 'left', pal: { hair: '#5eead4', coat: '#115e59', trim: '#fde047', skin: '#e4f5e4', horn: '#14b8a6', mask: false } });
      npcs.push({ id: 'mate3', name: mateName, x: 30 * T + 16, y: 40 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 36 * T + 16, y: 38 * T + 8, dir: 'down', pal: bramPal });

      sg(30, 38, 'Triângulo das Bermudas — O Berço onde nascem os Didalmianos. Oeste: Névoa. Leste: Abismo. Norte: Santuário.');
      sg(30, 23, 'Portão do Berço Didalmiano. A Chave se oculta entre arbustos sombrios nos confins da Ilha da Névoa.');
      ensureClear();
      hideKey(5, 40);

      [[9, 38], [15, 36], [6, 39]].forEach(([x, y]) => sp('phantom', x, y, '#2dd4bf'));
      [[16, 29], [10, 26]].forEach(([x, y]) => sp('sentinel', x, y));
      [[48, 38], [56, 37], [52, 34]].forEach(([x, y]) => sp('golem', x, y, '#6366f1'));
      [[47, 29], [56, 29]].forEach(([x, y]) => sp('phantom', x, y, '#818cf8'));
      [[24, 16], [40, 16], [26, 19], [38, 19]].forEach(([x, y]) => sp('golem', x, y, '#0f766e'));
      [[22, 17], [42, 17]].forEach(([x, y]) => sp('phantom', x, y, '#2dd4bf'));

      if (!flags.mistBoss) enemies.push(makeBoss('mistBoss', 11 * T + 16, 31 * T));
      if (!flags.abyssBoss) enemies.push(makeBoss('abyssBoss', 52 * T + 16, 31 * T));
      // Feras marinhas do Triangulo das Bermudas (combate naval!)
      [[23, 30], [41, 30], [22, 43], [42, 43], [14, 18], [50, 18]].forEach(([x, y]) => enemies.push(makeEnemy('seabeast', x * T + 16, y * T + 16, '#0d9488')));
    } else {
      // ATO 4: A LENDA DAS ESFERAS
      props.push({ kind: 'altar', x: 31 * T, y: 3 * T, solid: true, rect: { x: 31 * T + 4, y: 4 * T, w: 88, h: 60 } });
      props.push({ kind: 'boat', x: 31 * T + 12, y: 44 * T + 8, solid: false, rect: { x: 0, y: 0, w: 0, h: 0 } });

      ch('legendKey', 58, 25, 'key'); ch('legendHeart1', 7, 26, 'heart'); ch('legendHeart2', 56, 39, 'heart');
      ch('legendPotions', 26, 38, 'potion', 3); ch('legendGems', 22, 13, 'spheres', 50);

      npcs.push({ id: 'chronicler', name: 'Cronista Primordial', x: 34 * T + 16, y: 41 * T + 8, dir: 'left', pal: { hair: '#fde047', coat: '#4c1d95', trim: '#fde047', skin: '#f5cbb0', horn: '#eab308', mask: false } });
      npcs.push({ id: 'mate4', name: mateName, x: 30 * T + 16, y: 40 * T + 8, dir: 'right', pal: RPG_CHAR[mateId].pal });
      npcs.push({ id: 'shop', name: 'Armeiro Bram', x: 36 * T + 16, y: 38 * T + 8, dir: 'down', pal: bramPal });

      sg(30, 38, 'A Lenda das Esferas. Oeste: Esfera Solar. Leste: Esfera Astral. Norte: Trono do Arquiteto.');
      sg(30, 24, 'Portão da Lenda. A Chave Primordial está escondida atrás de cristais/arbustos na Ala Astral.');
      ensureClear();
      hideKey(58, 25);

      [[8, 36], [15, 36], [12, 33]].forEach(([x, y]) => sp('golem', x, y, '#f97316'));
      [[10, 27], [16, 27]].forEach(([x, y]) => sp('phantom', x, y, '#fb923c'));
      [[48, 36], [55, 36], [57, 26]].forEach(([x, y]) => sp('phantom', x, y, '#c084fc'));
      [[48, 27], [55, 27]].forEach(([x, y]) => sp('golem', x, y, '#7c3aed'));
      [[25, 16], [39, 16], [26, 20], [38, 20]].forEach(([x, y]) => sp('golem', x, y, '#eab308'));
      [[22, 17], [42, 17]].forEach(([x, y]) => sp('sentinel', x, y));

      if (!flags.solarBoss) enemies.push(makeBoss('solarBoss', 12 * T + 16, 30 * T));
      if (!flags.astralBoss) enemies.push(makeBoss('astralBoss', 52 * T + 16, 30 * T));
    }

    const spPos = spawnPos || ACT_META[act].spawn;
    P.x = spPos.x; P.y = spPos.y;
    if (blocked(P.x, P.y, P.hw, P.hh)) { P.x = ACT_META[act].spawn.x; P.y = ACT_META[act].spawn.y; }
    buildMini();
    fade = 1;
    camX = clamp(P.x - VW / 2, 0, MW * T - VW);
    camY = clamp(P.y - VH / 2, 0, MH * T - VH);
  }

  /* ------------------------------ jogador & save ------------------------------ */
  function newPlayer(stats) {
    return {
      x: ACT_META[1].spawn.x, y: ACT_META[1].spawn.y, dir: 'up', hw: 8, hh: 8,
      hp: stats.maxHp, maxHp: stats.maxHp, level: stats.level, exp: stats.exp, expToNext: stats.expToNext,
      atq: stats.atq, def: stats.def, spd: stats.spd,
      atkT: 0, atkCd: 0, shotCd: 0, dashT: 0, dashCd: 0, inv: 0, kx: 0, ky: 0, kT: 0, dvx: 0, dvy: 0,
      hit: new Set(), moving: false, anim: 0, keys: 0, gems: 10,
      orbs: 0, seals: 0, vertices: 0, primals: 0, potions: 1,
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
        hp: P.hp, keys: P.keys, gems: P.gems,
        orbs: P.orbs, seals: P.seals, vertices: P.vertices, primals: P.primals,
        potions: P.potions, upgrades: P.upgrades, flags, x: P.x, y: P.y
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

    flags = Object.assign({ chests: [], gates: [], gates2: [], gates3: [], gates4: [] }, sv && sv.flags ? sv.flags : {});
    ['chests', 'gates', 'gates2', 'gates3', 'gates4'].forEach((k) => { flags[k] = flags[k] || []; });

    P = newPlayer(sv ? sv.stats : base);
    if (sv) {
      P.hp = clamp(sv.hp || P.maxHp, 1, P.maxHp);
      P.keys = sv.keys || 0;
      P.gems = sv.gems != null ? sv.gems : 10;
      P.orbs = sv.orbs || 0;
      P.seals = sv.seals || 0;
      P.vertices = sv.vertices || 0;
      P.primals = sv.primals || 0;
      P.potions = sv.potions != null ? sv.potions : 1;
      P.upgrades = Object.assign({ weapon: 0, armor: 0, boots: 0 }, sv.upgrades || {});
    }

    const startAct = sv && sv.act >= 1 && sv.act <= 4 ? sv.act : 1;
    loadAct(startAct, sv && sv.x ? { x: sv.x, y: sv.y } : null);

    toasts = []; dlg = null; shop = null; travel = null;
    paused = false; deadT = 0; winT = 0; time = 0; active = true;

    if (!flags.introSeen) {
      flags.introSeen = true;
      saveGame();
      say('Crônicas das Árvores de Arcano', W.INTRO_LINES(heroName, mateName));
    } else {
      toast(ACT_META[act].name + ' retomado!');
    }
  }

  function stop() { saveGame(); active = false; }
  function restart() { start(charId, true); }
  function setPaused(v) { paused = v; }
  function toast(text) { toasts.push({ text, t: 3.2 }); if (toasts.length > 3) toasts.shift(); }
  function popup(x, y, text, color) { popups.push({ x, y, text, color: color || '#fde047', life: 0.9 }); }
  function burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2; const s = 40 + rr() * 120;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color, size: 3 });
    }
  }

  function addExp(n) {
    P.exp += n;
    while (P.exp >= P.expToNext) {
      P.exp -= P.expToNext; P.level++; P.expToNext = Math.round(P.expToNext * 1.35);
      P.maxHp += 15; P.hp = P.maxHp; P.atq += 3; P.def += 2; P.spd += 1;
      env.Audio.levelUp();
      toast('Nível ' + P.level + '! Atributos aumentados.');
    }
  }

  function usePotion() {
    if (P.potions <= 0) { toast('Sem Poções de Esfera! Compre com o Armeiro Bram.'); return; }
    if (P.hp >= P.maxHp) { toast('Sua vida já está cheia!'); return; }
    P.potions--;
    const heal = Math.min(60, P.maxHp - P.hp);
    P.hp += heal; env.Audio.levelUp();
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
    P.kx = Math.cos(a) * 220; P.ky = Math.sin(a) * 220; P.kT = 0.16;
    env.Audio.hit();
    popup(P.x, P.y - 18, '-' + dmg, '#f87171');
    burst(P.x, P.y, '#ef4444', 6);
    if (P.hp <= 0) { deadT = 1.8; toast(heroName + ' desmaiou...'); }
  }

  function respawn() {
    P.hp = P.maxHp;
    P.x = ACT_META[act].spawn.x; P.y = ACT_META[act].spawn.y;
    P.inv = 1.5; P.kT = 0; deadT = 0; fade = 1; eprojs = [];
    toast('Você despertou no ponto seguro do ' + ACT_META[act].title + '.');
    saveGame();
  }

  /* ------------------------------ dialogo, loja & viagem ------------------------------ */
  function say(name, lines, onEnd) { dlg = { name, lines, i: 0, shown: 0, onEnd }; }
  function openShop() { shop = { idx: 0 }; }
  function openTravel() { travel = { idx: act - 1 }; }

  function buyShopItem(idx) {
    const it = W.SHOP_ITEMS[idx];
    if (!it) return;
    const lvl = it.id === 'potion' ? 0 : (P.upgrades[it.id] || 0);
    if (it.id !== 'potion' && lvl >= it.max) { toast('Equipamento já está no nível máximo!'); return; }
    const cost = it.id === 'potion' ? it.cost : it.cost + lvl * 8;
    if (P.gems < cost) { toast('Esferas insuficientes! Precisa de ' + cost + '.'); env.Audio.hit(); return; }
    P.gems -= cost;
    if (it.id === 'potion') { P.potions++; toast('Comprou Poção de Esfera! (Use com Q)'); }
    else if (it.id === 'weapon') { P.upgrades.weapon++; P.atq += 5; toast('Arma reforjada! ATQ +5'); }
    else if (it.id === 'armor') { P.upgrades.armor++; P.def += 4; toast('Manto Arcano reforçado! DEF +4'); }
    else if (it.id === 'boots') { P.upgrades.boots++; P.spd += 3; toast('Botas do Saci equipadas! SPD +3'); }
    env.Audio.levelUp();
    saveGame();
  }

  function npcLines(id) {
    if (id === 'elder') {
      if (flags.legendBoss) return ['Lendário, ' + heroName + '! A Lenda das Esferas foi cumprida e todos os 4 Atos estão em paz!'];
      if (isActUnlocked(2)) return ['A Barca Arcana no Cais Sul leva você aos mares dos Didalmianos — da Torre no Mar até o Triângulo das Bermudas!'];
      if (!flags.met) {
        flags.met = true; saveGame();
        return [
          heroName + '! O Cataclisma partiu o mundo e corrompeu as Árvores de Arcano.',
          'Reúna os 3 Orbes Arcanos (Brisa, Pântano e Forja) e purifique a Árvore Ancestral ao norte.',
          'Visite o Armeiro Bram para forjar equipamentos e use Poções com a tecla Q!'
        ];
      }
      if (P.orbs >= 3) return ['Você tem os 3 Orbes Arcanos! Leve-os à Árvore Ancestral, ao norte das ruínas.'];
      return ['Ainda faltam ' + (3 - P.orbs) + ' Orbe(s) Arcano(s). Procure Chaves nos baús!'];
    }
    if (id === 'healer') {
      if (P.hp >= P.maxHp) return ['Você já está inteiro! Volte quando precisar de cura.'];
      if (P.gems >= 5) { P.gems -= 5; P.hp = P.maxHp; env.Audio.levelUp(); saveGame(); return ['Pronto! Cobrei 5 Esferas e restaurei toda a sua vida.']; }
      return ['Curo seus ferimentos por 5 Esferas. Corte arbustos ou derrote monstros para juntar mais!'];
    }
    if (id === 'mate') {
      if (isActUnlocked(2)) return ['Hehe, sabia que você ia dar conta do Ato 1! Use a Barca no Cais Sul para viajar entre os Atos!'];
      if (flags.mateQuestDone) return ['Com a barca reforçada, só falta você purificar a Árvore Ancestral ao norte!'];
      if (P.gems >= 15 && flags.mateQuest) {
        flags.mateQuestDone = true; P.potions += 2; addExp(60); saveGame();
        return ['Boa, ' + heroName + '! Toma aqui 2 Poções de Esfera que escondi dos guardas — coisa de Didalmiano, hehe!'];
      }
      flags.mateQuest = true; saveGame();
      return ['Ei, ' + heroName + '! Missão rápida de Didalmiano: junte 15 Esferas Mágicas e fale comigo de novo por 2 Poções grátis!'];
    }
    if (id === 'mate2') {
      if (isActUnlocked(3)) return ['A Torre no Mar voltou a brilhar! Agora a barca consegue atravessar a névoa rumo ao Triângulo das Bermudas (Ato 3)!'];
      return ['Nossa velha Torre no Mar! Derrote o Guardião da Tempestade (Oeste) e o da Maré (Leste) para abrir o Núcleo das Esferas!'];
    }
    if (id === 'mate3') {
      if (isActUnlocked(4)) return ['O Vórtice das Bermudas abriu o caminho para a Lenda das Esferas (Ato 4)! Use a Barca para entrar no Santuário Primordial!'];
      return ['Então é aqui no Triângulo das Bermudas que os primeiros Didalmianos nasceram... Dá até arrepio, hehe! Quebre os dois Vértices (Oeste e Leste)!'];
    }
    if (id === 'mate4') {
      if (flags.legendBoss) return ['Nós viramos parte da Lenda das Esferas, ' + heroName + '! Que aventura épica!'];
      return ['Olha esse lugar... o próprio Santuário das Esferas Primordiais! Derrote a Esfera Solar (Oeste) e a Astral (Leste) para encarar o Arquiteto!'];
    }
    if (id === 'oracle') {
      return [
        'Bem-vindo ao Triângulo das Bermudas, ' + heroName + '. Antes mesmo da Torre no Mar, as Esferas Mágicas se concentraram neste vórtice.',
        'Foi daqui que os primeiros Didalmianos nasceram — livres, travessos e ligados ao vento e ao mar.',
        'Derrote o Guardião da Névoa (Oeste) e o do Abismo (Leste) para despertar o Vórtice das Bermudas ao norte e revelar a Lenda das Esferas!'
      ];
    }
    if (id === 'chronicler') {
      return [
        'Você chegou ao Ato 4: A Lenda das Esferas. Toda Árvore de Arcano e todo Didalmiano nasceu do eco destas Esferas Primordiais.',
        'Conquiste a Esfera Solar (Oeste) e a Esfera Astral (Leste), abra o Portão da Lenda e prove seu valor ao Arquiteto das Esferas!'
      ];
    }
    if (id === 'captain') {
      return ['Use a Barca no Cais Sul para escolher qualquer Ato desbloqueado!'];
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
    if (dlg || shop || travel) return null;
    const d = DIRS[P.dir]; const fx = P.x + d[0] * 20; const fy = P.y + d[1] * 20;
    for (const n of npcs) if (dist(fx, fy, n.x, n.y) < 34) return n.id === 'shop' ? '[Espaço] Loja do Bram' : '[Espaço] Falar com ' + n.name;
    for (const c of chests) if (!c.opened && dist(fx, fy, c.x * T + 16, c.y * T + 16) < 30) return '[Espaço] Abrir Baú';
    for (const s of signs) if (dist(fx, fy, s.x * T + 16, s.y * T + 16) < 30) return '[Espaço] Ler Placa';
    const boat = props.find((p) => p.kind === 'boat');
    if (boat && dist(P.x, P.y, boat.x + 20, boat.y + 12) < 58) {
      return isActUnlocked(2) ? '[Espaço] Mapa de Viagem (Atos 1–4)' : 'Barca trancada (Conclua o Ato 1)';
    }
    const altar = props[0];
    if (altar && dist(P.x, P.y, altar.x + 48, altar.y + 80) < 100) {
      const labels = ['', '[Espaço] Árvore Ancestral', '[Espaço] Núcleo das Esferas', '[Espaço] Vórtice das Bermudas', '[Espaço] Trono da Lenda'];
      return labels[act];
    }
    if (tileAt(Math.floor(fx / T), Math.floor(fy / T)) === GATE) return '[Espaço] Abrir Portão (Chave)';
    return null;
  }

  function interact() {
    const d = DIRS[P.dir]; const fx = P.x + d[0] * 20; const fy = P.y + d[1] * 20;

    for (const c of chests) {
      if (dist(fx, fy, c.x * T + 16, c.y * T + 16) < 28 && !c.opened) {
        c.opened = true; flags.chests.push(c.id); env.Audio.sphere();
        if (c.item === 'key') { P.keys++; toast('Você obteve uma Chave!'); }
        else if (c.item === 'heart') { P.maxHp += 20; P.hp = P.maxHp; toast('Coração Arcano! Vida máxima +20.'); env.Audio.levelUp(); }
        else if (c.item === 'potion') { P.potions += (c.n || 1); toast('Você obteve ' + (c.n || 1) + ' Poção(ões)!'); }
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
        say(n.name, npcLines(n.id));
        return true;
      }
    }

    for (const s of signs) {
      if (dist(fx, fy, s.x * T + 16, s.y * T + 16) < 28) { say('Placa', [s.text]); return true; }
    }

    const boat = props.find((p) => p.kind === 'boat');
    if (boat && dist(P.x, P.y, boat.x + 20, boat.y + 12) < 58) {
      if (isActUnlocked(2)) { openTravel(); }
      else { say('Barca Arcana', ['As correntes marítimas estão furiosas. Purifique primeiro a Árvore Ancestral ao norte (Ato 1)!']); }
      return true;
    }

    const tx = Math.floor(fx / T); const ty = Math.floor(fy / T);
    if (tileAt(tx, ty) === GATE) {
      if (P.keys > 0) {
        P.keys--;
        const g = findGateStart(tx, ty);
        flags[gateKeyFor(act)].push(g);
        floodOpen(g[0], g[1]);
        env.Audio.levelUp(); toast('Portão aberto!'); saveGame();
      } else {
        toast('Trancado. Você precisa de uma Chave.');
      }
      return true;
    }

    const altar = props[0];
    if (altar && dist(P.x, P.y, altar.x + 48, altar.y + 80) < 100) {
      if (act === 1) {
        if (flags.final) say('Árvore Ancestral', ['A Árvore Ancestral brilha em paz! Use a Barca no Cais Sul para ir ao Ato 2 (Torre no Mar).']);
        else if (flags.finalStart) toast('O Guardião do Cataclisma já despertou!');
        else if (P.orbs < 3) say('Árvore Ancestral', ['Faltam ' + (3 - P.orbs) + ' Orbe(s) Arcano(s).']);
        else say('Árvore Ancestral', ['Os 3 Orbes brilham...', 'O Guardião do Cataclisma desperta!'], () => { flags.finalStart = true; enemies.push(makeBoss('final', 32 * T + 16, 7 * T + 8)); env.Audio.hit(); });
      } else if (act === 2) {
        if (flags.towerBoss) say('Núcleo das Esferas', ['A Torre no Mar está purificada! Use a Barca para navegar ao Ato 3 (Triângulo das Bermudas).']);
        else if (flags.towerBossStart) toast('O Soberano das Esferas já despertou!');
        else if (P.seals < 2) say('Núcleo das Esferas', ['Faltam Selos do Mar (' + P.seals + '/2). Derrote Tempestade (Oeste) e Maré (Leste).']);
        else say('Núcleo das Esferas', ['Os 2 Selos rompem a barreira...', 'O Soberano das Esferas emerge!'], () => { flags.towerBossStart = true; enemies.push(makeBoss('towerBoss', 32 * T + 16, 7 * T + 8)); env.Audio.hit(); });
      } else if (act === 3) {
        if (flags.bermudaBoss) say('Berço Didalmiano', ['O Triângulo das Bermudas ressoa em paz! Use a Barca para entrar no Ato 4 (A Lenda das Esferas).']);
        else if (flags.bermudaBossStart) toast('O Vórtice das Bermudas já despertou!');
        else if (P.vertices < 2) say('Berço Didalmiano', ['Faltam Vértices do Triângulo (' + P.vertices + '/2). Derrote Névoa (Oeste) e Abismo (Leste).']);
        else say('Berço Didalmiano', ['O Triângulo das Bermudas se alinha...', 'O Vórtice das Bermudas desperta!'], () => { flags.bermudaBossStart = true; enemies.push(makeBoss('bermudaBoss', 32 * T + 16, 7 * T + 8)); env.Audio.hit(); });
      } else {
        if (flags.legendBoss) say('Trono da Lenda', ['As Esferas Primordiais cantam em harmonia! Você completou os 4 Atos!']);
        else if (flags.legendBossStart) toast('O Arquiteto das Esferas já está diante de você!');
        else if (P.primals < 2) say('Trono da Lenda', ['Faltam Esferas Primordiais (' + P.primals + '/2). Derrote a Esfera Solar (Oeste) e a Astral (Leste).']);
        else say('Trono da Lenda', ['As Esferas Primordiais se unem em luz dourada...', 'O Arquiteto das Esferas surge para o desafio final!'], () => { flags.legendBossStart = true; enemies.push(makeBoss('legendBoss', 32 * T + 16, 7 * T + 8)); env.Audio.hit(); });
      }
      return true;
    }
    return false;
  }

  /* ------------------------------ combate ------------------------------ */
  function swordBox() {
    const d = DIRS[P.dir]; const ch = RPG_CHAR[charId];
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
          setTile(tx, ty, act === 4 ? FLOOR : GRASS);
          burst(tx * T + 16, ty * T + 16, '#34d399', 8);
          const r = rr();
          if (r < 0.3) drops.push({ x: tx * T + 16, y: ty * T + 16, type: 'heart', t: 0 });
          else if (r < 0.68) drops.push({ x: tx * T + 16, y: ty * T + 16, type: 'gem', t: 0 });
        }
      }
    }
  }

  function damageEnemy(e, dmg, ax, ay) {
    let finalDmg = dmg;
    const diff = env.getDifficulty ? env.getDifficulty() : 'normal';
    if (e.boss) {
      if (e.shielded) {
        finalDmg = Math.max(1, Math.round(dmg * (diff === 'hard' ? 0.12 : 0.35)));
        popup(e.x, e.y - e.size / 2 - 14, 'ESCUDO!', '#38bdf8');
      } else if (e.vulnerable) {
        finalDmg = Math.round(dmg * 1.5);
        popup(e.x, e.y - e.size / 2 - 14, 'CRÍTICO!', '#4ade80');
      }
    }
    e.hp -= finalDmg; e.flash = 0.14;
    popup(e.x, e.y - e.size / 2, '-' + finalDmg, '#fde047');
    burst(e.x, e.y, e.boss && e.shielded ? '#38bdf8' : '#facc15', 5);
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
      env.Audio.win();
      if (e.key === 'final') {
        flags.final = true; flags.act2Unlocked = true;
        say('Árvore Ancestral', [
          'O Guardião do Cataclisma foi purificado! Mas a corrupção partiu da antiga Torre no Mar!',
          'ATO 2 DESBLOQUEADO: Vá à Barca no Cais Sul da vila para zarpar à Torre no Mar!'
        ]);
      } else if (e.key === 'towerBoss') {
        flags.towerBoss = true; flags.act3Unlocked = true;
        say('Núcleo das Esferas', [
          'O Soberano das Esferas caiu! As correntes revelam o lendário TRIÂNGULO DAS BERMUDAS — onde nascem os Didalmianos!',
          'ATO 3 DESBLOQUEADO: Use a Barca no Cais Sul para navegar ao Triângulo das Bermudas!'
        ]);
      } else if (e.key === 'bermudaBoss') {
        flags.bermudaBoss = true; flags.act4Unlocked = true;
        say('Berço Didalmiano', [
          'O Vórtice das Bermudas se acalma e abre o portal estelar para A LENDA DAS ESFERAS!',
          'ATO 4 DESBLOQUEADO: Use a Barca no Cais Sul para entrar no Santuário Primordial!'
        ]);
      } else if (e.key === 'legendBoss') {
        flags.legendBoss = true;
        say('Trono da Lenda', [
          'O Arquiteto das Esferas reconhece a força e a astúcia dos Didalmianos!',
          'A Lenda das Esferas está completa: o Continente, a Torre no Mar e o Triângulo das Bermudas brilham em paz eterna!'
        ], () => { winT = 2.0; });
      } else if (e.key === 'stormBoss' || e.key === 'tideBoss') {
        flags[e.key] = true; P.seals++;
        toast('Selo da ' + W.BOSS_DEF[e.key].orb + ' obtido! (' + P.seals + '/2)');
      } else if (e.key === 'mistBoss' || e.key === 'abyssBoss') {
        flags[e.key] = true; P.vertices++;
        toast('Vértice da ' + W.BOSS_DEF[e.key].orb + ' obtido! (' + P.vertices + '/2)');
      } else if (e.key === 'solarBoss' || e.key === 'astralBoss') {
        flags[e.key] = true; P.primals++;
        toast('Esfera Primordial ' + W.BOSS_DEF[e.key].orb + ' obtida! (' + P.primals + '/2)');
      } else {
        flags[e.key] = true; P.orbs++;
        toast('Orbe Arcano da ' + W.BOSS_DEF[e.key].orb + ' obtido! (' + P.orbs + '/3)');
      }
      saveGame();
    } else {
      const r = rr();
      if (r < 0.42) drops.push({ x: e.x, y: e.y, type: 'gem', t: 0 });
      else if (r < 0.58) drops.push({ x: e.x, y: e.y, type: 'heart', t: 0 });
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

    if (e.type === 'slime' || e.type === 'knight' || e.type === 'corsair' || e.type === 'golem') {
      const chase = dd < (e.type === 'slime' ? 170 : 240);
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
    } else if (e.type === 'bat' || e.type === 'stormling' || e.type === 'phantom') {
      e.phase += dt * 5;
      if (dd < 270) {
        const a = Math.atan2(dy, dx) + Math.sin(e.phase) * 0.85;
        moveBox(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, 0, 0, true);
      } else {
        moveBox(e, Math.cos(e.phase * 0.4) * 30 * dt, Math.sin(e.phase * 0.5) * 30 * dt, 0, 0, true);
      }
    } else if (e.type === 'seabeast') {
      e.phase += dt * 4;
      e.shootT -= dt;
      if (dd < 310) {
        moveBox(e, (dx / dd) * e.speed * dt, 0, hw, hw, false, true);
        moveBox(e, 0, (dy / dd) * e.speed * dt, hw, hw, false, true);
        if (e.shootT <= 0) {
          e.shootT = 2.1;
          shootEnemy(e, 210, e.dmg, '#2dd4bf', Math.atan2(dy, dx));
        }
      } else {
        moveBox(e, Math.cos(e.phase * 0.6) * e.speed * 0.6 * dt, Math.sin(e.phase * 0.5) * e.speed * 0.6 * dt, hw, hw, false, true);
      }
    } else if (e.type === 'sentinel') {
      e.shootT -= dt;
      if (dd < 290 && e.shootT <= 0) { e.shootT = 2.0; shootEnemy(e, 195, e.dmg, '#f43f5e', Math.atan2(dy, dx)); }
    } else if (e.boss) {
      updateBoss(e, dt, dx, dy, dd);
    }

    if (dd < e.size / 2 + P.hw - 2) hurtPlayer(e.dmg, e.x, e.y);
  }

  function updateBoss(e, dt, dx, dy, dd) {
    const def = W.BOSS_DEF[e.key];
    const diff = env.getDifficulty ? env.getDifficulty() : 'normal';
    const hard = diff === 'hard';
    const easy = diff === 'easy';
    const rage = e.hp < e.maxHp * 0.5 ? 1.38 : 1;
    const hw = e.size / 2 - 6;
    e.patT -= dt * rage * (hard ? 1.35 : easy ? 0.8 : 1);

    if (e.state === 'strafe' || e.state === 'idle') {
      // Movimento astuto: orbita o jogador mantendo distancia e desviando!
      e.shielded = true;
      e.vulnerable = false;
      const perpX = (-dy / dd) * e.strafeDir;
      const perpY = (dx / dd) * e.strafeDir;
      const push = dd < 120 ? -0.9 : dd > 210 ? 0.85 : 0;
      const mx = (perpX + (dx / dd) * push) * e.speed * 1.15 * dt;
      const my = (perpY + (dy / dd) * push) * e.speed * 1.15 * dt;
      moveBox(e, mx, 0, hw, hw);
      moveBox(e, 0, my, hw, hw);

      if (e.patT <= 0 && dd < 360) {
        const pool = hard ? def.patterns.concat(['blink']) : def.patterns.concat(e.pat % 3 === 2 ? ['blink'] : []);
        const pat = pool[e.pat % pool.length];
        e.pat++;
        e.strafeDir = -e.strafeDir;
        e.state = pat;
        e.stT = 0;
        e.fired = false;
      }
    } else if (e.state === 'blink') {
      // Teleporte astuto para o flanco oposto do jogador + rajada!
      e.stT += dt;
      e.shielded = true;
      if (e.stT > 0.35 && !e.fired) {
        e.fired = true;
        burst(e.x, e.y, e.color, 14);
        const ang = Math.atan2(dy, dx) + Math.PI * (rr() > 0.5 ? 0.65 : -0.65);
        const tx = clamp(P.x + Math.cos(ang) * 145, 60, MW * T - 60);
        const ty = clamp(P.y + Math.sin(ang) * 145, 60, MH * T - 60);
        if (!blocked(tx, ty, hw, hw)) { e.x = tx; e.y = ty; }
        burst(e.x, e.y, '#fde047', 12);
        const aim = Math.atan2(P.y - e.y, P.x - e.x);
        const spread = hard ? [-0.35, -0.17, 0, 0.17, 0.35] : [-0.22, 0, 0.22];
        spread.forEach((off) => shootEnemy(e, hard ? 255 : 210, def.dmg - 4, def.color, aim + off));
        env.Audio.shoot();
      }
      if (e.stT > 0.75) {
        e.state = 'vulnerable'; e.stT = 0; e.shielded = false; e.vulnerable = true;
      }
    } else if (e.state === 'dash') {
      e.stT += dt;
      e.shielded = true;
      if (e.stT < (hard ? 0.42 : 0.58)) { e.dvx = dx / dd; e.dvy = dy / dd; }
      else if (e.stT < (hard ? 1.05 : 1.15)) { moveBox(e, e.dvx * e.speed * 4.4 * dt, 0, hw, hw); moveBox(e, 0, e.dvy * e.speed * 4.4 * dt, hw, hw); }
      else { e.state = 'vulnerable'; e.stT = 0; e.shielded = false; e.vulnerable = true; }
    } else if (e.state === 'fan') {
      e.stT += dt;
      e.shielded = true;
      if (e.stT > (hard ? 0.38 : 0.5) && !e.fired) {
        e.fired = true; const base = Math.atan2(dy, dx);
        const n = hard ? 3 : 2;
        for (let i = -n; i <= n; i++) shootEnemy(e, hard ? 250 : 210, def.dmg - 4, def.color, base + i * (hard ? 0.22 : 0.28));
        env.Audio.shoot();
      }
      if (e.stT > 0.88) { e.fired = false; e.state = 'vulnerable'; e.stT = 0; e.shielded = false; e.vulnerable = true; }
    } else if (e.state === 'ring') {
      e.stT += dt;
      e.shielded = true;
      if (e.stT > (hard ? 0.45 : 0.6) && !e.fired) {
        e.fired = true; const off = rr();
        const cnt = hard ? 18 : 12;
        for (let i = 0; i < cnt; i++) shootEnemy(e, hard ? 215 : 175, def.dmg - 6, def.color, off + (i / cnt) * Math.PI * 2);
        env.Audio.shoot();
      }
      if (e.stT > 0.95) { e.fired = false; e.state = 'vulnerable'; e.stT = 0; e.shielded = false; e.vulnerable = true; }
    } else if (e.state === 'summon') {
      e.stT += dt;
      e.shielded = true;
      if (e.stT > 0.55 && !e.fired) {
        e.fired = true;
        if (enemies.filter((x) => !x.boss).length < (hard ? 11 : 8)) {
          [[-1, 0], [1, 0]].forEach(([sx]) => {
            const f = findFree(Math.floor((e.x + sx * 70) / T), Math.floor(e.y / T));
            const sub = act >= 3 ? 'phantom' : act === 2 ? 'stormling' : (e.key === 'final' ? 'knight' : 'slime');
            enemies.push(makeEnemy(sub, f.x, f.y, def.color));
          });
        }
        burst(e.x, e.y, def.color, 16);
      }
      if (e.stT > 0.95) { e.fired = false; e.state = 'vulnerable'; e.stT = 0; e.shielded = false; e.vulnerable = true; }
    } else if (e.state === 'vulnerable') {
      // Janela de abertura! O jogador descobriu o padrao e pode causar dano critico!
      e.stT += dt;
      e.shielded = false;
      e.vulnerable = true;
      const winDur = hard ? 0.78 : easy ? 1.65 : 1.18;
      if (e.stT >= winDur) {
        e.state = 'strafe';
        e.shielded = true;
        e.vulnerable = false;
        e.patT = hard ? 0.85 : easy ? 2.0 : 1.45;
      }
    }
  }

  function update(dt) {
    if (!active || paused) return;
    time += dt;
    const is = env.isJust; const dn = env.isDown;

    if (fade > 0) fade = Math.max(0, fade - dt * 1.4);
    if (winT > 0) { winT -= dt; if (winT <= 0) { saveGame(); env.onWin(); return; } }

    ['atkT', 'atkCd', 'shotCd', 'dashT', 'dashCd', 'inv'].forEach((k) => { if (P[k] > 0) P[k] -= dt; });
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) respawn(); return; }

    // Menu de Viagem (Atos 1-4)
    if (travel) {
      if (is('ArrowUp', 'KeyW')) travel.idx = (travel.idx + 3) % 4;
      if (is('ArrowDown', 'KeyS')) travel.idx = (travel.idx + 1) % 4;
      if (is('Space', 'Enter', 'KeyE')) {
        const dest = travel.idx + 1;
        if (isActUnlocked(dest)) {
          travel = null;
          if (dest !== act) { loadAct(dest, ACT_META[dest].spawn); saveGame(); toast('Chegou ao ' + ACT_META[dest].name + '!'); }
        } else {
          toast('Conclua o Ato anterior para liberar este destino!');
          env.Audio.hit();
        }
      }
      if (is('KeyJ', 'KeyZ', 'KeyX', 'KeyL', 'ShiftLeft', 'ShiftRight')) travel = null;
      return;
    }

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

    if (is('KeyQ')) usePotion();

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
      pprojs.push({ x: P.x + d[0] * 12, y: P.y + d[1] * 12, vx: d[0] * 380, vy: d[1] * 380, r: 6, dmg: Math.round(P.atq * ch.shotMult), color: ch.shotColor, life: 0.8 });
      env.Audio.shoot();
    }
    if (is('ShiftLeft', 'ShiftRight', 'KeyK') && P.dashCd <= 0) {
      P.dashT = 0.18; P.dashCd = 0.7;
      const d = DIRS[P.dir];
      P.dvx = P.moving ? dx : d[0]; P.dvy = P.moving ? dy : d[1];
      env.Audio.dash(); burst(P.x, P.y, env.Chars[charId].accent, 8);
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

    // Musica dinamica de chefe
    const nearBoss = enemies.some((e) => e.boss && dist(e.x, e.y, P.x, P.y) < 380);
    if (env.Audio && env.Audio.setMusicMode) env.Audio.setMusicMode(nearBoss ? 'boss' : 'adventure');

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
    c.save(); c.translate(x, y - 6);
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(0, 15, 11, 4, 0, 0, Math.PI * 2); c.fill();
    const step = moving ? Math.sin(t * 14) * 3 : 0;
    c.fillStyle = '#3b2a1c'; c.strokeStyle = '#14100a'; c.lineWidth = 1.2;
    c.fillRect(-6, 9, 5, 6 + step * 0.5); c.fillRect(1, 9, 5, 6 - step * 0.5);
    const side = dir === 'left' || dir === 'right';
    c.scale(side && dir === 'left' ? -1 : 1, 1);

    c.fillStyle = pal.horn;
    c.beginPath(); c.moveTo(-8, -14); c.lineTo(-11, -26); c.lineTo(-2, -18); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(8, -14); c.lineTo(11, -26); c.lineTo(2, -18); c.closePath(); c.fill(); c.stroke();

    c.fillStyle = pal.coat; c.beginPath(); c.roundRect(-9, -5, 18, 17, 4); c.fill(); c.stroke();
    c.fillStyle = pal.trim; c.fillRect(-9, 8, 18, 2);
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
      if (pal.mask) { c.fillStyle = '#1e293b'; c.fillRect(-6, -6, 12, 5); }
    } else if (side) {
      c.fillStyle = '#16a34a'; c.fillRect(2, -11, 3, 4);
      if (pal.mask) { c.fillStyle = '#1e293b'; c.fillRect(0, -6, 8, 5); }
    }

    if (isPlayer) {
      const ch = RPG_CHAR[charId]; const long = charId === 'nicks';
      if (atk > 0) {
        const prog = 1 - atk / 0.22;
        c.restore(); c.save(); c.translate(x, y - 6);
        const d = DIRS[dir]; c.rotate(Math.atan2(d[1], d[0]));
        if (long) {
          const ext = 10 + Math.sin(Math.min(1, prog) * Math.PI) * (ch.reach - 20);
          c.strokeStyle = '#374151'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(4, 2); c.lineTo(ext + 4, 2); c.stroke();
          c.fillStyle = '#fb923c'; c.beginPath(); c.arc(ext + 16, 2, 5, 0, Math.PI * 2); c.fill();
        } else {
          const sw = -1.2 + prog * 2.4;
          c.strokeStyle = 'rgba(253,224,71,0.9)'; c.lineWidth = 5;
          c.beginPath(); c.arc(0, 0, ch.reach * 0.8, sw - 0.9, sw + 0.1); c.stroke();
        }
      } else if (long) {
        c.strokeStyle = '#374151'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(10, 14); c.lineTo(12, -22); c.stroke();
        c.fillStyle = '#fb923c'; c.beginPath(); c.arc(12, -26, 3.5, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = '#cbd5e1'; c.fillRect(10, 2, 3, 12);
      }
    }
    c.restore();
  }

  function heartPath(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.5, y - s, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
    c.closePath();
  }

  function drawEnemy(c, e) {
    const x = e.x - camX; const y = e.y - camY;
    if (x < -60 || x > VW + 60 || y < -60 || y > VH + 60) return;
    c.save(); c.translate(x, y);
    if (e.flash > 0) c.filter = 'brightness(2.2)';
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(0, e.size / 2 - 2, e.size / 2, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#14100a'; c.lineWidth = 1.8;

    if (e.type === 'slime') {
      const sq = Math.sin(time * 6 + e.id) * 2;
      c.fillStyle = e.color;
      c.beginPath(); c.ellipse(0, 2, 12 + sq, 10 - sq, 0, Math.PI, 0); c.lineTo(12 + sq, 10); c.lineTo(-12 - sq, 10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-6, 0, 4, 5); c.fillRect(2, 0, 4, 5);
    } else if (e.type === 'bat' || e.type === 'stormling' || e.type === 'phantom') {
      const fl = Math.sin(time * 18 + e.id) * 6;
      c.fillStyle = e.type === 'phantom' ? e.color : (e.type === 'stormling' ? '#0284c7' : '#4c1d95');
      c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(-12, -10 - fl, -18, -fl); c.lineTo(0, 8); c.lineTo(18, -fl); c.quadraticCurveTo(12, -10 - fl, 0, -2); c.fill(); c.stroke();
      c.fillStyle = '#fde047'; c.fillRect(-3, -2, 2, 2); c.fillRect(1, -2, 2, 2);
    } else if (e.type === 'knight' || e.type === 'corsair' || e.type === 'golem') {
      c.fillStyle = e.type === 'golem' ? e.color : (e.type === 'corsair' ? '#1e3a8a' : '#475569');
      c.beginPath(); c.roundRect(-12, -9, 24, 24, 5); c.fill(); c.stroke();
      c.fillStyle = '#fde047'; c.fillRect(-6, -4, 12, 4);
    } else if (e.type === 'seabeast') {
      // Fera Marinha / Serpente-Kraken das Bermudas
      const wave = Math.sin(time * 7 + e.id) * 4;
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, 10, 20, 7, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = e.color; c.strokeStyle = '#14100a'; c.lineWidth = 2;
      c.beginPath(); c.arc(-10, 2 + wave * 0.5, 9, 0, Math.PI * 2); c.arc(0, -2 - wave * 0.4, 12, 0, Math.PI * 2); c.arc(11, 2 + wave * 0.5, 9, 0, Math.PI * 2); c.fill(); c.stroke();
      // Barbatanas / tentaculos + olhos brilhantes
      c.fillStyle = '#fde047'; c.fillRect(-5, -6 - wave * 0.4, 4, 4); c.fillRect(2, -6 - wave * 0.4, 4, 4);
      c.fillStyle = '#ef4444'; c.fillRect(-3, 2 - wave * 0.4, 6, 3);
    } else if (e.type === 'sentinel') {
      c.fillStyle = '#374151'; c.beginPath(); c.roundRect(-10, -12, 20, 24, 4); c.fill(); c.stroke();
      c.fillStyle = '#f43f5e'; c.beginPath(); c.arc(0, -2, 4 + Math.sin(time * 5) * 1.2, 0, Math.PI * 2); c.fill();
    } else if (e.boss) {
      const s = e.size / 2;
      const aura = c.createRadialGradient(0, 0, 8, 0, 0, s + 24);
      aura.addColorStop(0, e.color + 'aa'); aura.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = aura; c.fillRect(-s - 24, -s - 24, (s + 24) * 2, (s + 24) * 2);
      c.fillStyle = '#1e1b4b'; c.beginPath(); c.roundRect(-s, -s + 6, s * 2, s * 2 - 6, 14); c.fill(); c.stroke();
      c.fillStyle = e.color; c.beginPath(); c.roundRect(-s + 5, -s + 12, s * 2 - 10, s * 1.2, 10); c.fill();
      c.fillStyle = e.vulnerable ? '#fde047' : (e.state !== 'strafe' ? '#fff' : '#ef4444');
      c.fillRect(-s * 0.55, -4, 9, 7); c.fillRect(s * 0.55 - 9, -4, 9, 7);
      if (e.shielded) {
        c.strokeStyle = '#38bdf8'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(0, 0, s + 8, 0, Math.PI * 2); c.stroke();
      } else if (e.vulnerable) {
        c.fillStyle = '#fde047'; c.font = 'bold 11px Segoe UI, sans-serif'; c.textAlign = 'center';
        c.fillText('ABERTURA!', 0, -s - 8); c.textAlign = 'left';
      }
    }
    c.restore();
  }

  function panel(c, x, y, w, h) {
    c.fillStyle = 'rgba(12,18,28,0.88)'; c.strokeStyle = '#eab308'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
  }

  function wrap(c, text, maxW) {
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function draw() {
    const c = env.ctx;
    if (!map) return;

    const x0 = Math.max(0, Math.floor(camX / T)); const y0 = Math.max(0, Math.floor(camY / T));
    const x1 = Math.min(MW - 1, Math.floor((camX + VW) / T)); const y1 = Math.min(MH - 1, Math.floor((camY + VH) / T));
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
      c.strokeStyle = '#14100a'; c.lineWidth = 1.8;
      c.fillStyle = ch.opened ? '#8a5a2b' : '#b3722f';
      c.beginPath(); c.roundRect(x + 4, y + 12, 24, 15, 3); c.fill(); c.stroke();
      c.fillStyle = ch.opened ? '#5a3418' : '#d89a4a';
      c.beginPath(); c.roundRect(x + 4, y + (ch.opened ? 6 : 8), 24, 8, [6, 6, 0, 0]); c.fill(); c.stroke();
      c.fillStyle = '#facc15'; c.fillRect(x + 14, y + 13, 4, 6);
    }

    const boat = props.find((p) => p.kind === 'boat');
    if (boat) {
      const x = boat.x - camX; const y = boat.y - camY + Math.sin(time * 3) * 2;
      c.save();
      c.fillStyle = act === 4 ? '#581c87' : '#78350f'; c.strokeStyle = '#14100a'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x, y, 44, 20, [4, 4, 12, 12]); c.fill(); c.stroke();
      c.fillStyle = isActUnlocked(2) ? '#38bdf8' : '#94a3b8';
      c.beginPath(); c.moveTo(x + 22, y + 4); c.lineTo(x + 22, y - 22); c.lineTo(x + 38, y - 8); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }

    // Altar Principal do Ato
    const al = props[0];
    if (al) {
      const x = al.x - camX; const y = al.y - camY;
      if (x > -140 && x < VW + 40 && y > -160 && y < VH + 60) {
        c.save();
        const glowCol = act === 4 ? 'rgba(253,224,71,0.55)' : act === 3 ? 'rgba(45,212,191,0.5)' : act === 2 ? 'rgba(56,189,248,0.45)' : 'rgba(168,85,247,0.4)';
        const glow = c.createRadialGradient(x + 48, y + 30, 10, x + 48, y + 30, 120);
        glow.addColorStop(0, glowCol); glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow; c.fillRect(x - 80, y - 90, 260, 260);

        if (act === 1) {
          c.fillStyle = '#4a2c17'; c.strokeStyle = '#14100a'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x + 22, y + 96); c.lineTo(x + 36, y + 40); c.lineTo(x + 60, y + 40); c.lineTo(x + 74, y + 96); c.closePath(); c.fill(); c.stroke();
          const cols = flags.final ? ['#4ade80', '#86efac'] : ['#7e22ce', '#a855f7'];
          [[48, 20, 34], [20, 34, 24], [76, 34, 24], [48, 4, 22]].forEach(([dx, dy, r], i) => { c.fillStyle = cols[i % 2]; c.beginPath(); c.arc(x + dx, y + dy, r, 0, Math.PI * 2); c.fill(); c.stroke(); });
        } else if (act === 3) {
          // Triangulo mistico das Bermudas
          c.strokeStyle = '#5eead4'; c.lineWidth = 4; c.fillStyle = 'rgba(20,184,166,0.35)';
          c.beginPath(); c.moveTo(x + 48, y); c.lineTo(x + 88, y + 84); c.lineTo(x + 8, y + 84); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fde047'; c.beginPath(); c.arc(x + 48, y + 48, 12 + Math.sin(time * 5) * 3, 0, Math.PI * 2); c.fill();
        } else {
          // Nucleo das Esferas (Ato 2) ou Trono da Lenda (Ato 4)
          c.fillStyle = act === 4 ? '#3b0764' : '#1e293b'; c.strokeStyle = '#eab308'; c.lineWidth = 2.5;
          c.beginPath(); c.roundRect(x + 16, y + 44, 64, 52, 8); c.fill(); c.stroke();
          c.fillStyle = act === 4 ? '#fde047' : '#38bdf8';
          c.beginPath(); c.arc(x + 48, y + 24, 22 + Math.sin(time * 4) * 3, 0, Math.PI * 2); c.fill(); c.stroke();
        }
        c.restore();
      }
    }

    for (const d of drops) {
      const x = d.x - camX; const y = d.y - camY + Math.sin(time * 6 + d.x) * 2;
      if (d.t > 10 && Math.floor(time * 10) % 2 === 0) continue;
      if (d.type === 'heart') { c.fillStyle = '#ef4444'; c.strokeStyle = '#7f1d1d'; c.lineWidth = 1.5; heartPath(c, x, y, 8); c.fill(); c.stroke(); }
      else { c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); }
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
        if (P.sailing) {
          const bx = P.x - camX; const by = P.y - camY + Math.sin(time * 5) * 1.5;
          c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
          c.beginPath(); c.ellipse(bx, by + 10, 24, 9, 0, 0, Math.PI * 2); c.stroke();
          c.fillStyle = '#78350f'; c.strokeStyle = '#14100a'; c.lineWidth = 2;
          c.beginPath(); c.roundRect(bx - 20, by - 4, 40, 18, [5, 5, 12, 12]); c.fill(); c.stroke();
        }
        drawHero(c, P.x - camX, P.y - camY - (P.sailing ? 4 : 0), P.dir, RPG_CHAR[charId].pal, P.anim, P.moving, P.atkT, true);
        c.restore();
      }
    });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());

    for (const p of pprojs.concat(eprojs)) {
      c.save(); c.fillStyle = '#fff'; c.strokeStyle = p.color; c.lineWidth = 2.5;
      c.beginPath(); c.arc(p.x - camX, p.y - camY, p.r - 1, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    }
    for (const p of parts) { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.fillRect(p.x - camX, p.y - camY, p.size, p.size); }
    c.globalAlpha = 1;
    for (const p of popups) {
      c.globalAlpha = Math.min(1, p.life * 1.5);
      c.font = 'bold 13px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillStyle = p.color; c.strokeStyle = '#000'; c.lineWidth = 3;
      c.strokeText(p.text, p.x - camX, p.y - camY); c.fillText(p.text, p.x - camX, p.y - camY);
    }
    c.globalAlpha = 1; c.textAlign = 'left';

    drawHud(c);

    if (fade > 0 || deadT > 0) { c.fillStyle = 'rgba(0,0,0,' + (deadT > 0 ? Math.min(1, (1.8 - deadT) / 1.2) : fade) + ')'; c.fillRect(0, 0, VW, VH); }
    if (winT > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, (2.0 - winT) / 2.0) + ')'; c.fillRect(0, 0, VW, VH); }
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

    panel(c, 8, by + 30, 248, 26);
    c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(22, by + 43, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f8fafc'; c.font = 'bold 12px Segoe UI, sans-serif';
    c.fillText(String(P.gems), 31, by + 47);
    c.fillStyle = '#facc15'; c.fillText('🗝' + P.keys, 66, by + 47);
    c.fillStyle = '#4ade80'; c.fillText('Q:🧪' + P.potions, 108, by + 47);

    const slotCfg = [null, [3, P.orbs, '#fde047'], [2, P.seals, '#38bdf8'], [2, P.vertices, '#2dd4bf'], [2, P.primals, '#facc15']][act];
    for (let i = 0; i < slotCfg[0]; i++) {
      c.fillStyle = i < slotCfg[1] ? slotCfg[2] : '#374151';
      c.strokeStyle = '#14100a';
      c.beginPath(); c.arc(185 + i * 20, by + 43, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    }

    const mx = VW - 144; const my = 8;
    panel(c, mx - 4, my - 4, 136, 122);
    c.drawImage(mini, mx, my);
    c.fillStyle = '#fff'; c.fillRect(P.x / T * 2 - 2 + mx, P.y / T * 2 - 2 + my, 5, 5);
    enemies.filter((e) => e.boss).forEach((e) => { c.fillStyle = '#ef4444'; c.fillRect(e.x / T * 2 - 2 + mx, e.y / T * 2 - 2 + my, 5, 5); });
    c.fillStyle = '#fde047'; c.font = 'bold 10px Segoe UI, sans-serif'; c.textAlign = 'center';
    c.fillText(ACT_META[act].title, mx + 64, my + 112); c.textAlign = 'left';

    const boss = enemies.find((e) => e.boss && dist(e.x, e.y, P.x, P.y) < 340);
    if (boss) {
      const bw = 360; const bx = (VW - bw) / 2;
      panel(c, bx - 8, VH - 78, bw + 16, 30);
      c.fillStyle = '#2b0d0d'; c.fillRect(bx, VH - 62, bw, 10);
      c.fillStyle = '#ef4444'; c.fillRect(bx, VH - 62, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
      c.fillStyle = '#fde047'; c.font = 'bold 12px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillText(boss.name, VW / 2, VH - 67); c.textAlign = 'left';
    }

    const hint = nearbyHint();
    if (hint) {
      c.font = 'bold 12px Segoe UI, sans-serif'; c.textAlign = 'center';
      const hw = c.measureText(hint).width + 20;
      panel(c, (VW - hw) / 2, VH - 66, hw, 24);
      c.fillStyle = '#86efac'; c.fillText(hint, VW / 2, VH - 50); c.textAlign = 'left';
    }

    if (!dlg && !shop && !travel) {
      let obj = '';
      if (act === 1) obj = flags.final ? 'Ato 1 concluído! Use a Barca ao sul para ir ao Ato 2.' : P.orbs >= 3 ? 'Leve os 3 Orbes à Árvore Ancestral ao norte!' : 'Ato 1: Derrote os 3 Guardiões (Orbes ' + P.orbs + '/3).';
      else if (act === 2) obj = flags.towerBoss ? 'Ato 2 concluído! Use a Barca para ir ao Triângulo das Bermudas (Ato 3)!' : P.seals >= 2 ? 'Leve os 2 Selos ao Núcleo das Esferas ao norte!' : 'Ato 2: Derrote Tempestade (Oeste) e Maré (Leste) — Selos ' + P.seals + '/2.';
      else if (act === 3) obj = flags.bermudaBoss ? 'Ato 3 concluído! Use a Barca para A Lenda das Esferas (Ato 4)!' : P.vertices >= 2 ? 'Vá ao Berço Didalmiano no extremo norte!' : 'Ato 3: Derrote Névoa (Oeste) e Abismo (Leste) — Vértices ' + P.vertices + '/2.';
      else obj = flags.legendBoss ? 'Todos os 4 Atos concluídos! Lenda das Esferas purificada!' : P.primals >= 2 ? 'Enfrente o Arquiteto das Esferas no Trono ao norte!' : 'Ato 4: Derrote Esfera Solar (Oeste) e Astral (Leste) — ' + P.primals + '/2.';

      c.font = '12px Segoe UI, sans-serif';
      const w = c.measureText(obj).width + 20;
      panel(c, 8, VH - 32, w, 24);
      c.fillStyle = '#e2e8f0'; c.fillText(obj, 18, VH - 15);
    }

    toasts.forEach((t, i) => {
      c.font = 'bold 14px Segoe UI, sans-serif'; c.textAlign = 'center';
      const w = c.measureText(t.text).width + 28;
      c.globalAlpha = Math.min(1, t.t);
      panel(c, (VW - w) / 2, 110 + i * 34, w, 28);
      c.fillStyle = '#fde047'; c.fillText(t.text, VW / 2, 129 + i * 34);
      c.globalAlpha = 1;
    });
    c.textAlign = 'left';

    // Menu de Viagem (Atos 1-4)
    if (travel) {
      const sw = 440; const sh = 250; const sx = (VW - sw) / 2; const sy = (VH - sh) / 2;
      panel(c, sx, sy, sw, sh);
      c.fillStyle = '#fde047'; c.font = 'bold 17px Segoe UI, sans-serif';
      c.fillText('⛵ Mapa de Viagem — Barca Arcana', sx + 20, sy + 30);
      for (let i = 0; i < 4; i++) {
        const aNum = i + 1; const iy = sy + 48 + i * 42;
        const sel = i === travel.idx; const unl = isActUnlocked(aNum);
        c.fillStyle = sel ? 'rgba(56,189,248,0.24)' : 'rgba(255,255,255,0.04)';
        c.strokeStyle = sel ? '#38bdf8' : '#334155'; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(sx + 16, iy, sw - 32, 34, 6); c.fill(); c.stroke();
        c.fillStyle = unl ? '#f8fafc' : '#64748b'; c.font = 'bold 13px Segoe UI, sans-serif';
        c.fillText(ACT_META[aNum].name + (aNum === act ? ' (Atual)' : ''), sx + 26, iy + 22);
        c.textAlign = 'right'; c.fillStyle = unl ? '#4ade80' : '#f87171';
        c.fillText(unl ? 'Liberado' : '🔒 Bloqueado', sx + sw - 26, iy + 22);
        c.textAlign = 'left';
      }
      c.fillStyle = '#94a3b8'; c.font = '12px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillText('▲/▼ Escolher  •  Espaço/Enter Zarpar  •  J/Shift Fechar', VW / 2, sy + sh - 12);
      c.textAlign = 'left';
    }

    // Loja do Bram
    if (shop) {
      const sw = 460; const sh = 270; const sx = (VW - sw) / 2; const sy = (VH - sh) / 2;
      panel(c, sx, sy, sw, sh);
      c.fillStyle = '#fde047'; c.font = 'bold 17px Segoe UI, sans-serif';
      c.fillText('⚒ Loja do Armeiro Bram', sx + 20, sy + 30);
      c.fillStyle = '#7dd3fc'; c.font = 'bold 13px Segoe UI, sans-serif'; c.textAlign = 'right';
      c.fillText('Suas Esferas: ' + P.gems, sx + sw - 20, sy + 30); c.textAlign = 'left';

      W.SHOP_ITEMS.forEach((it, i) => {
        const iy = sy + 50 + i * 46; const sel = i === shop.idx;
        const lvl = it.id === 'potion' ? P.potions : (P.upgrades[it.id] || 0);
        const maxed = it.id !== 'potion' && lvl >= it.max;
        const cost = it.id === 'potion' ? it.cost : it.cost + lvl * 8;
        c.fillStyle = sel ? 'rgba(234,179,8,0.22)' : 'rgba(255,255,255,0.04)';
        c.strokeStyle = sel ? '#eab308' : '#334155'; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(sx + 16, iy, sw - 32, 38, 6); c.fill(); c.stroke();
        c.fillStyle = '#f8fafc'; c.font = 'bold 13px Segoe UI, sans-serif';
        const tag = it.id === 'potion' ? ' (Você tem ' + lvl + ')' : ' (Nv.' + lvl + '/' + it.max + ')';
        c.fillText(it.name + tag, sx + 26, iy + 16);
        c.fillStyle = '#94a3b8'; c.font = '11px Segoe UI, sans-serif'; c.fillText(it.desc, sx + 26, iy + 31);
        c.textAlign = 'right'; c.font = 'bold 13px Segoe UI, sans-serif';
        c.fillStyle = maxed ? '#4ade80' : (P.gems >= cost ? '#fde047' : '#f87171');
        c.fillText(maxed ? 'MÁX' : cost + ' Esferas', sx + sw - 26, iy + 24); c.textAlign = 'left';
      });
      c.fillStyle = '#94a3b8'; c.font = '12px Segoe UI, sans-serif'; c.textAlign = 'center';
      c.fillText('▲/▼ Escolher  •  Espaço/Enter Comprar  •  J/Shift Fechar', VW / 2, sy + sh - 14); c.textAlign = 'left';
    }

    // Dialogo
    if (dlg) {
      const bx = 60; const bw = VW - 120; const bh = 122; const by2 = VH - bh - 16;
      panel(c, bx, by2, bw, bh);
      c.fillStyle = '#fde047'; c.font = 'bold 15px Segoe UI, sans-serif'; c.fillText(dlg.name, bx + 18, by2 + 26);
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
