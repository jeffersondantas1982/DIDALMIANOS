window.Jogo = window.Jogo || {};

/* =====================================================================
   MUNDOS, LOJA, CHEFES E HISTORIA DO MODO RPG (ATO 1 E ATO 2)
   ===================================================================== */
window.Jogo.RPGWorld = (function () {
  const MW = 64;
  const MH = 48;

  const TILE = {
    GRASS: 0, PATH: 1, WATER: 2, TREE: 3, ROCK: 4, WALL: 5, FLOOR: 6,
    FLOWER: 7, MUD: 8, HWALL: 10, ROOF: 11, DOOR: 12, BUSH: 14,
    GATE: 15, DEAD: 16, SWATER: 17, DOCK: 18
  };

  const SOLID = [
    false, false, true, true, true, true, false, false, false, false,
    true, true, true, false, true, true, true, true, false
  ];

  function rnd(a, b = 0) {
    const x = Math.sin(a * 127.1 + b * 311.7 + 7.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function makeHelpers(m) {
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < MW && y < MH) m[y * MW + x] = t;
    };
    const rect = (x, y, w, h, t) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t);
    };
    const inR = (x, y, rx, ry, rw, rh) => x >= rx && y >= ry && x < rx + rw && y < ry + rh;
    return { set, rect, inR };
  }

  /* ---------------------- ATO 1: CONTINENTE ---------------------- */
  function buildAct1() {
    const m = new Uint8Array(MW * MH);
    const { set, rect, inR } = makeHelpers(m);
    const { GRASS, PATH, WATER, TREE, ROCK, WALL, FLOOR, FLOWER, MUD, HWALL, ROOF, DOOR, BUSH, GATE, DEAD, SWATER, DOCK } = TILE;

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

    // Lagos e litoral sul (mar para a Torre no Mar)
    rect(46, 6, 13, 12, WATER);
    rect(5, 5, 6, 5, WATER);
    rect(0, 0, MW, 2, TREE);
    rect(0, 0, 2, MH, TREE);
    rect(MW - 2, 0, 2, MH, TREE);
    rect(0, MH - 3, MW, 3, WATER);

    // Vila Didalmiana
    rect(24, 35, 17, 10, GRASS);
    rect(24, 40, 17, 4, PATH);
    rect(25, 36, 6, 2, ROOF);
    rect(25, 38, 6, 2, HWALL);
    set(27, 39, DOOR);
    rect(34, 36, 6, 2, ROOF);
    rect(34, 38, 6, 2, HWALL);
    set(36, 39, DOOR);
    rect(31, 23, 3, 17, PATH);

    // Cais Sul da Vila (Barca para o Ato 2)
    rect(31, 44, 3, 3, DOCK);

    // Oeste: Floresta da Brisa
    rect(11, 41, 14, 3, PATH);
    rect(11, 24, 3, 18, PATH);
    rect(6, 37, 6, 2, PATH);
    rect(6, 24, 14, 9, GRASS);
    rect(17, 39, 3, 2, GRASS);

    // Leste: Pantano das Sementes
    rect(41, 41, 12, 3, PATH);
    rect(51, 24, 3, 18, PATH);
    rect(45, 23, 14, 10, MUD);
    rect(47, 25, 2, 2, SWATER);
    rect(55, 30, 3, 2, SWATER);
    rect(54, 36, 6, 2, PATH);
    set(43, 41, GATE);
    set(43, 42, GATE);
    set(43, 43, GATE);

    // Campina
    rect(22, 27, 5, 3, GRASS);
    rect(34, 29, 3, 3, GRASS);

    // Ruinas da Forja
    rect(20, 11, 25, 12, WALL);
    rect(21, 12, 23, 10, FLOOR);
    [24, 28, 36, 40].forEach((x) => [14, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE);
    set(32, 22, GATE);
    set(33, 22, GATE);

    // Arena da Arvore Ancestral
    rect(22, 0, 21, 11, WALL);
    rect(24, 2, 17, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  /* ---------------------- ATO 2: TORRE NO MAR ---------------------- */
  function buildAct2() {
    const m = new Uint8Array(MW * MH);
    const { set, rect } = makeHelpers(m);
    const { GRASS, PATH, WATER, TREE, ROCK, WALL, FLOOR, FLOWER, BUSH, GATE, DOCK } = TILE;

    // Oceano aberto
    rect(0, 0, MW, MH, WATER);

    // Ilha do Cais (Sul)
    rect(25, 36, 15, 9, GRASS);
    rect(26, 37, 13, 7, PATH);
    rect(31, 43, 3, 3, DOCK); // Retorno ao Ato 1
    rect(31, 22, 3, 16, DOCK); // Ponte central para a Torre

    // Ponte Oeste -> Ilha da Tempestade
    rect(15, 39, 12, 3, DOCK);
    rect(5, 24, 15, 18, GRASS);
    for (let y = 25; y < 41; y++) {
      for (let x = 6; x < 19; x++) {
        const r = rnd(x + 90, y + 40);
        if (r < 0.14) set(x, y, ROCK);
        else if (r < 0.22) set(x, y, BUSH);
        else if (r < 0.28) set(x, y, FLOWER);
      }
    }
    rect(8, 27, 9, 8, FLOOR); // Arena da Arvore da Tempestade
    rect(11, 35, 3, 7, PATH);

    // Ponte Leste -> Ilha da Mare
    rect(39, 39, 12, 3, DOCK);
    rect(45, 24, 15, 18, GRASS);
    for (let y = 25; y < 41; y++) {
      for (let x = 46; x < 59; x++) {
        const r = rnd(x + 210, y + 80);
        if (r < 0.14) set(x, y, TREE);
        else if (r < 0.22) set(x, y, BUSH);
        else if (r < 0.28) set(x, y, FLOWER);
      }
    }
    rect(48, 27, 9, 8, FLOOR); // Arena da Arvore da Mare
    rect(51, 35, 3, 7, PATH);

    // Cidadela da Torre no Mar (Centro-Norte)
    rect(21, 11, 23, 12, WALL);
    rect(22, 12, 21, 10, FLOOR);
    [25, 29, 35, 39].forEach((x) => [14, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE);
    set(32, 22, GATE);
    set(33, 22, GATE);

    // Camara do Nucleo das Esferas (Extremo Norte)
    rect(22, 1, 21, 10, WALL);
    rect(24, 2, 17, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  const ENEMY_DEF = {
    slime: { hp: 20, dmg: 10, speed: 52, exp: 12, size: 22 },
    bat: { hp: 12, dmg: 8, speed: 95, exp: 10, size: 20, fly: true },
    knight: { hp: 48, dmg: 18, speed: 44, exp: 30, size: 26 },
    sentinel: { hp: 30, dmg: 11, speed: 0, exp: 22, size: 24 },
    stormling: { hp: 52, dmg: 18, speed: 108, exp: 38, size: 22, fly: true },
    corsair: { hp: 72, dmg: 22, speed: 56, exp: 48, size: 26 }
  };

  const BOSS_DEF = {
    boss1: { name: 'Guardião da Brisa', hp: 220, color: '#22c55e', dmg: 16, speed: 64, patterns: ['fan', 'dash'], exp: 120, orb: 'Brisa', act: 1 },
    boss2: { name: 'Guardião do Pântano', hp: 280, color: '#84cc16', dmg: 18, speed: 58, patterns: ['ring', 'summon'], exp: 160, orb: 'Pântano', act: 1 },
    boss3: { name: 'Guardião da Forja', hp: 340, color: '#f97316', dmg: 20, speed: 68, patterns: ['dash', 'ring', 'fan'], exp: 220, orb: 'Forja', act: 1 },
    final: { name: 'Guardião do Cataclisma', hp: 500, color: '#a855f7', dmg: 23, speed: 74, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 400, orb: 'Cataclisma', act: 1 },
    stormBoss: { name: 'Guardião da Tempestade', hp: 420, color: '#38bdf8', dmg: 22, speed: 78, patterns: ['dash', 'fan', 'ring'], exp: 280, orb: 'Tempestade', act: 2 },
    tideBoss: { name: 'Guardião da Maré', hp: 460, color: '#06b6d4', dmg: 24, speed: 66, patterns: ['ring', 'summon', 'fan'], exp: 320, orb: 'Maré', act: 2 },
    towerBoss: { name: 'Soberano das Esferas', hp: 680, color: '#facc15', dmg: 27, speed: 82, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 600, orb: 'Torre no Mar', act: 2 }
  };

  const SHOP_ITEMS = [
    { id: 'potion', name: 'Poção de Esfera', desc: 'Cura +60 HP ao usar (tecla Q)', cost: 6, max: 99 },
    { id: 'weapon', name: 'Reforjar Arma', desc: '+5 ATQ permanente', cost: 15, max: 3 },
    { id: 'armor', name: 'Manto Arcano', desc: '+4 DEF permanente', cost: 15, max: 3 },
    { id: 'boots', name: 'Botas do Saci', desc: '+3 SPD permanente', cost: 12, max: 2 }
  ];

  const INTRO_LINES = (heroName, mateName) => [
    'Há eras, o Cataclisma rasgou a Terra. De cada conceito do mundo brotou uma Árvore de Arcano — e dela nasceram seus Guardiões.',
    'Longe do continente, na Torre no Mar onde esferas mágicas se concentram, surgiram os Didalmianos: astutos, velozes e travessos como o Saci-Pererê.',
    heroName + ' e ' + mateName + ' cruzaram o oceano até a Vila Didalmiana. Fale com o Ancião Nuvem, visite o Armeiro Bram e descubra o que corrompe as Árvores!'
  ];

  return {
    MW, MH, TILE, SOLID,
    buildAct1, buildAct2,
    ENEMY_DEF, BOSS_DEF, SHOP_ITEMS, INTRO_LINES
  };
})();
