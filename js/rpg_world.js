window.Jogo = window.Jogo || {};

/* =====================================================================
   MUNDOS, LOJA, CHEFES E HISTORIA DO MODO RPG (ATOS 1, 2, 3 E 4)
   Ato 1: Continente das Arvores
   Ato 2: Torre no Mar
   Ato 3: Triangulo das Bermudas (Onde nascem os Didalmianos)
   Ato 4: A Lenda das Esferas (Santuario Primordial)
   ===================================================================== */
window.Jogo.RPGWorld = (function () {
  const MW = 64;
  const MH = 48;

  const TILE = {
    GRASS: 0, PATH: 1, WATER: 2, TREE: 3, ROCK: 4, WALL: 5, FLOOR: 6,
    FLOWER: 7, MUD: 8, HWALL: 10, ROOF: 11, DOOR: 12, BUSH: 14,
    GATE: 15, DEAD: 16, SWATER: 17, DOCK: 18, LAVA: 19
  };

  const SOLID = [
    false, false, true, true, true, true, false, false, false, false,
    true, true, true, false, true, true, true, true, false, true
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
    set(43, 41, GATE); set(43, 42, GATE); set(43, 43, GATE);

    rect(22, 27, 5, 3, GRASS);
    rect(34, 29, 3, 3, GRASS);

    // Ruinas da Forja
    rect(20, 11, 25, 12, WALL);
    rect(21, 12, 23, 10, FLOOR);
    [24, 28, 36, 40].forEach((x) => [14, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE); set(32, 22, GATE); set(33, 22, GATE);

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

    rect(0, 0, MW, MH, WATER);

    // Ilha do Cais (Sul)
    rect(25, 36, 15, 9, GRASS);
    rect(26, 37, 13, 7, PATH);
    rect(31, 43, 3, 3, DOCK);
    rect(31, 22, 3, 16, DOCK);

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
    rect(8, 27, 9, 8, FLOOR);
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
    rect(48, 27, 9, 8, FLOOR);
    rect(51, 35, 3, 7, PATH);

    // Cidadela da Torre no Mar
    rect(21, 11, 23, 12, WALL);
    rect(22, 12, 21, 10, FLOOR);
    [25, 29, 35, 39].forEach((x) => [14, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE); set(32, 22, GATE); set(33, 22, GATE);

    rect(22, 1, 21, 10, WALL);
    rect(24, 2, 17, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  /* -------------- ATO 3: TRIANGULO DAS BERMUDAS -------------- */
  function buildAct3() {
    const m = new Uint8Array(MW * MH);
    const { set, rect } = makeHelpers(m);
    const { GRASS, PATH, WATER, ROCK, WALL, FLOOR, FLOWER, MUD, BUSH, GATE, DEAD, DOCK } = TILE;

    // Mar turquesa mistico do Triangulo
    rect(0, 0, MW, MH, WATER);

    // Base Sul (Ilha do Vortice - chegada)
    rect(24, 36, 17, 9, MUD);
    rect(26, 37, 13, 7, FLOOR);
    rect(31, 43, 3, 3, DOCK); // Barca (voltar / avancar)

    // Pontes formando um triangulo no mar!
    rect(15, 38, 12, 3, DOCK); // Sul -> Vertice Oeste
    rect(39, 38, 12, 3, DOCK); // Sul -> Vertice Leste
    rect(31, 21, 3, 17, DOCK); // Centro -> Vertice Norte

    // Vertice Oeste: Ilha da Nevoa (Naufragios)
    rect(4, 25, 16, 17, MUD);
    for (let y = 26; y < 41; y++) {
      for (let x = 5; x < 19; x++) {
        const r = rnd(x + 310, y + 17);
        if (r < 0.14) set(x, y, DEAD);
        else if (r < 0.22) set(x, y, ROCK);
        else if (r < 0.28) set(x, y, BUSH);
      }
    }
    rect(7, 28, 9, 8, FLOOR);
    rect(11, 36, 3, 5, PATH);

    // Vertice Leste: Ilha da Bussola (Abismo)
    rect(45, 25, 16, 17, GRASS);
    for (let y = 26; y < 41; y++) {
      for (let x = 46; x < 60; x++) {
        const r = rnd(x + 410, y + 33);
        if (r < 0.14) set(x, y, ROCK);
        else if (r < 0.22) set(x, y, BUSH);
        else if (r < 0.28) set(x, y, FLOWER);
      }
    }
    rect(48, 28, 9, 8, FLOOR);
    rect(51, 36, 3, 5, PATH);

    // Vertice Norte: Santuario do Berco Didalmiano
    rect(20, 11, 25, 11, WALL);
    rect(21, 12, 23, 9, FLOOR);
    [25, 39].forEach((x) => [14, 18].forEach((y) => set(x, y, WALL)));
    set(31, 21, GATE); set(32, 21, GATE); set(33, 21, GATE);

    // Camara do Vortice Primordial (Topo do Triangulo)
    rect(22, 1, 21, 10, WALL);
    rect(24, 2, 17, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  /* -------------- ATO 4: A LENDA DAS ESFERAS -------------- */
  function buildAct4() {
    const m = new Uint8Array(MW * MH);
    const { set, rect } = makeHelpers(m);
    const { PATH, WATER, WALL, FLOOR, BUSH, GATE, DOCK } = TILE;

    // Mar Estelar / Abismo de Energia
    rect(0, 0, MW, MH, WATER);

    // Salao de Entrada (Sul)
    rect(24, 36, 17, 9, WALL);
    rect(25, 37, 15, 7, FLOOR);
    rect(31, 43, 3, 3, DOCK); // Portal de retorno

    // Passarelas de Luz
    rect(15, 39, 11, 3, PATH);
    rect(39, 39, 11, 3, PATH);
    rect(31, 22, 3, 16, PATH);

    // Ala Oeste: Camara da Esfera Solar
    rect(5, 24, 15, 18, WALL);
    rect(6, 25, 13, 16, FLOOR);
    set(19, 39, FLOOR); set(19, 40, FLOOR); set(19, 41, FLOOR);
    [9, 15].forEach((x) => [28, 36].forEach((y) => set(x, y, WALL)));
    set(8, 39, BUSH); set(16, 39, BUSH);

    // Ala Leste: Camara da Esfera Astral
    rect(45, 24, 15, 18, WALL);
    rect(46, 25, 13, 16, FLOOR);
    set(45, 39, FLOOR); set(45, 40, FLOOR); set(45, 41, FLOOR);
    [49, 55].forEach((x) => [28, 36].forEach((y) => set(x, y, WALL)));
    set(48, 39, BUSH); set(56, 39, BUSH);

    // Antecamara das Lendas (Centro-Norte)
    rect(20, 11, 25, 12, WALL);
    rect(21, 12, 23, 10, FLOOR);
    [24, 29, 35, 40].forEach((x) => [15, 19].forEach((y) => set(x, y, WALL)));
    set(31, 22, GATE); set(32, 22, GATE); set(33, 22, GATE);

    // Trono da Lenda das Esferas (Norte)
    rect(21, 1, 23, 10, WALL);
    rect(23, 2, 19, 8, FLOOR);
    rect(31, 10, 3, 2, FLOOR);

    return m;
  }

  /* ---- ATO 5: RUINAS DIDALMIANAS, ARVORES ARCANAS E LAGO DE FOGO ---- */
  function buildAct5() {
    const m = new Uint8Array(MW * MH);
    const { set, rect } = makeHelpers(m);
    const { GRASS, PATH, ROCK, WALL, FLOOR, MUD, BUSH, GATE, DEAD, DOCK, LAVA } = TILE;

    // Solo vulcanico / ruinas antigas
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const r = rnd(x + 700, y + 120);
        set(x, y, r < 0.12 ? ROCK : r < 0.18 ? DEAD : r < 0.22 ? BUSH : MUD);
      }
    }

    // Bordas de rocha/muralha
    rect(0, 0, MW, 2, WALL);
    rect(0, MH - 2, MW, 2, WALL);
    rect(0, 0, 2, MH, WALL);
    rect(MW - 2, 0, 2, MH, WALL);

    // GRANDE LAGO DE FOGO (Centro e Norte)
    rect(16, 15, 32, 16, LAVA);
    rect(4, 18, 12, 10, LAVA);
    rect(48, 18, 12, 10, LAVA);

    // Praca de Chegada / Acampamento nas Ruinas (Sul)
    rect(24, 37, 17, 9, FLOOR);
    rect(31, 43, 3, 3, DOCK); // Portal/Barca de viagem (Atos 1-5)
    rect(31, 31, 3, 7, PATH);

    // Ilha Central do Lago de Fogo (Totem da Rocha + Ponte para o Norte)
    rect(27, 21, 11, 9, FLOOR);
    rect(31, 29, 3, 4, PATH); // Ponte Sul -> Ilha Central
    rect(31, 11, 3, 11, PATH); // Ponte Ilha Central -> Cidadela Norte

    // Regiao Oeste: Ruinas Didalmianas + Arvore da Chama + Arena Colosso de Magma
    rect(3, 32, 20, 12, FLOOR);
    rect(16, 38, 10, 3, PATH); // Caminho Sul -> Oeste
    [7, 13, 18].forEach((x) => [35, 41].forEach((y) => set(x, y, WALL)));
    rect(4, 28, 12, 5, PATH); // Ponte Oeste sobre a lava
    rect(4, 9, 13, 10, FLOOR); // Arena Oeste (Colosso de Magma)
    rect(8, 18, 3, 11, PATH); // Ponte Oeste Norte sobre a lava

    // Regiao Leste: Bosque da Arvore do Eter + Arena Tita das Ruinas
    rect(41, 32, 20, 12, GRASS);
    rect(39, 38, 10, 3, PATH); // Caminho Sul -> Leste
    [45, 51, 56].forEach((x) => [35, 41].forEach((y) => set(x, y, ROCK)));
    rect(48, 28, 12, 5, PATH);
    rect(47, 9, 13, 10, FLOOR); // Arena Leste (Tita das Ruinas)
    rect(53, 18, 3, 11, PATH); // Ponte Leste Norte sobre a lava

    // Cidadela do Lago de Fogo (Norte - trancada pela Chave Forjada!)
    rect(20, 9, 25, 6, WALL);
    rect(21, 10, 23, 4, FLOOR);
    set(31, 14, GATE); set(32, 14, GATE); set(33, 14, GATE);

    // Santuario Supremo (Extremo Norte)
    rect(20, 1, 25, 9, WALL);
    rect(22, 2, 21, 7, FLOOR);
    rect(31, 9, 3, 2, FLOOR);

    return m;
  }

  const ENEMY_DEF = {
    slime: { hp: 20, dmg: 10, speed: 52, exp: 12, size: 22 },
    bat: { hp: 12, dmg: 8, speed: 95, exp: 10, size: 20, fly: true },
    knight: { hp: 48, dmg: 18, speed: 44, exp: 30, size: 26 },
    sentinel: { hp: 30, dmg: 11, speed: 0, exp: 22, size: 24 },
    stormling: { hp: 52, dmg: 18, speed: 108, exp: 38, size: 22, fly: true },
    corsair: { hp: 72, dmg: 22, speed: 56, exp: 48, size: 26 },
    phantom: { hp: 85, dmg: 25, speed: 115, exp: 60, size: 24, fly: true },
    golem: { hp: 115, dmg: 28, speed: 52, exp: 75, size: 28 },
    seabeast: { hp: 110, dmg: 26, speed: 92, exp: 80, size: 32, swim: true },
    stoneMonster: { hp: 175, dmg: 34, speed: 62, exp: 120, size: 34 }
  };

  const BOSS_DEF = {
    boss1: { name: 'Guardião da Brisa', hp: 220, color: '#22c55e', dmg: 16, speed: 64, patterns: ['fan', 'dash'], exp: 120, orb: 'Brisa', act: 1 },
    boss2: { name: 'Guardião do Pântano', hp: 280, color: '#84cc16', dmg: 18, speed: 58, patterns: ['ring', 'summon'], exp: 160, orb: 'Pântano', act: 1 },
    boss3: { name: 'Guardião da Forja', hp: 340, color: '#f97316', dmg: 20, speed: 68, patterns: ['dash', 'ring', 'fan'], exp: 220, orb: 'Forja', act: 1 },
    final: { name: 'Guardião do Cataclisma', hp: 500, color: '#a855f7', dmg: 23, speed: 74, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 400, orb: 'Cataclisma', act: 1 },

    stormBoss: { name: 'Guardião da Tempestade', hp: 420, color: '#38bdf8', dmg: 22, speed: 78, patterns: ['dash', 'fan', 'ring'], exp: 280, orb: 'Tempestade', act: 2 },
    tideBoss: { name: 'Guardião da Maré', hp: 460, color: '#06b6d4', dmg: 24, speed: 66, patterns: ['ring', 'summon', 'fan'], exp: 320, orb: 'Maré', act: 2 },
    towerBoss: { name: 'Soberano das Esferas', hp: 640, color: '#facc15', dmg: 27, speed: 82, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 600, orb: 'Torre no Mar', act: 2 },

    mistBoss: { name: 'Guardião da Névoa', hp: 560, color: '#2dd4bf', dmg: 26, speed: 84, patterns: ['dash', 'fan', 'ring'], exp: 380, orb: 'Névoa', act: 3 },
    abyssBoss: { name: 'Guardião do Abismo', hp: 600, color: '#6366f1', dmg: 28, speed: 74, patterns: ['ring', 'summon', 'fan'], exp: 420, orb: 'Abismo', act: 3 },
    bermudaBoss: { name: 'Vórtice das Bermudas', hp: 820, color: '#14b8a6', dmg: 30, speed: 86, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 800, orb: 'Triângulo', act: 3 },

    solarBoss: { name: 'Guardião da Esfera Solar', hp: 720, color: '#f97316', dmg: 30, speed: 86, patterns: ['dash', 'ring', 'fan'], exp: 520, orb: 'Solar', act: 4 },
    astralBoss: { name: 'Guardião da Esfera Astral', hp: 760, color: '#c084fc', dmg: 32, speed: 82, patterns: ['ring', 'summon', 'fan'], exp: 560, orb: 'Astral', act: 4 },
    legendBoss: { name: 'Arquiteto das Esferas', hp: 1100, color: '#fde047', dmg: 35, speed: 92, patterns: ['fan', 'ring', 'dash', 'summon'], exp: 1500, orb: 'Lenda Primordial', act: 4 },

    magmaBoss: { name: 'Colosso de Magma', hp: 980, color: '#ef4444', dmg: 36, speed: 108, patterns: ['dash', 'blink', 'ring', 'fan'], exp: 850, orb: 'Brasa Arcana', act: 5 },
    ruinBoss: { name: 'Titã das Ruínas', hp: 1050, color: '#d97706', dmg: 38, speed: 104, patterns: ['blink', 'dash', 'summon', 'ring'], exp: 920, orb: 'Núcleo de Pedra', act: 5 },
    supremeBoss: { name: 'Guardião Supremo das Árvores', hp: 1550, color: '#f97316', dmg: 42, speed: 118, patterns: ['blink', 'dash', 'ring', 'fan', 'summon'], exp: 2500, orb: 'Coroa Arcana', act: 5 }
  };

  const SHOP_ITEMS = [
    { id: 'potion', name: 'Poção de Esfera', desc: 'Cura +60 HP ao usar (tecla Q)', cost: 6, max: 99 },
    { id: 'weapon', name: 'Reforjar Arma', desc: '+5 ATQ permanente', cost: 15, max: 7 },
    { id: 'armor', name: 'Manto Arcano', desc: '+4 DEF permanente', cost: 15, max: 7 },
    { id: 'boots', name: 'Botas do Saci', desc: '+3 SPD permanente', cost: 12, max: 4 }
  ];

  const INTRO_LINES = (heroName, mateName) => [
    'Há eras, o Cataclisma rasgou a Terra. De cada conceito do mundo brotou uma Árvore de Arcano — e dela nasceram seus Guardiões.',
    'Do misterioso Triângulo das Bermudas e da Torre no Mar, onde esferas mágicas se concentram, surgiram os Didalmianos: astutos e travessos como o Saci-Pererê.',
    heroName + ' e ' + mateName + ' chegaram à Vila Didalmiana. Fale com o Ancião Nuvem, visite o Armeiro Bram e comece a jornada pelos 4 Atos!'
  ];

  return {
    MW, MH, TILE, SOLID,
    buildAct1, buildAct2, buildAct3, buildAct4, buildAct5,
    ENEMY_DEF, BOSS_DEF, SHOP_ITEMS, INTRO_LINES
  };
})();
