window.Jogo = window.Jogo || {};

window.Jogo.Levels = (function () {
  const THEMES = {
    sea: {
      skyTop: '#0b2545',
      skyBottom: '#1d4e89',
      celestialColor: '#fef08a',
      farTreeColor: '#133b5c',
      midColor: '#1e6091',
      accentColor: '#38bdf8',
      groundColor: '#4a3525',
      topColor: '#22c55e'
    },
    docks: {
      skyTop: '#1a1b41',
      skyBottom: '#3d348b',
      celestialColor: '#fde047',
      farTreeColor: '#27235c',
      midColor: '#302b63',
      accentColor: '#facc15',
      groundColor: '#6b3e26',
      topColor: '#a16207'
    },
    ruins: {
      skyTop: '#2b1b17',
      skyBottom: '#5c3a21',
      celestialColor: '#fb923c',
      farTreeColor: '#3e2723',
      midColor: '#4e342e',
      accentColor: '#f97316',
      groundColor: '#44403c',
      topColor: '#78716c'
    },
    breeze: {
      skyTop: '#064e3b',
      skyBottom: '#10b981',
      celestialColor: '#ecfdf5',
      farTreeColor: '#047857',
      midColor: '#059669',
      accentColor: '#a7f3d0',
      groundColor: '#5c3a21',
      topColor: '#4ade80'
    },
    swamp: {
      skyTop: '#1a2e05',
      skyBottom: '#365314',
      celestialColor: '#bef264',
      farTreeColor: '#1e3a1e',
      midColor: '#2c4a1e',
      accentColor: '#a3e635',
      groundColor: '#3f2e21',
      topColor: '#65a30d'
    },
    forge: {
      skyTop: '#1c0d0d',
      skyBottom: '#450a0a',
      celestialColor: '#f97316',
      farTreeColor: '#2d1212',
      midColor: '#3b1515',
      accentColor: '#fb923c',
      groundColor: '#292524',
      topColor: '#dc2626'
    },
    arcane: {
      skyTop: '#1e1b4b',
      skyBottom: '#4c1d95',
      celestialColor: '#e879f9',
      farTreeColor: '#2e1065',
      midColor: '#3b0764',
      accentColor: '#38bdf8',
      groundColor: '#1e293b',
      topColor: '#8b5cf6'
    },
    tower: {
      skyTop: '#0f172a',
      skyBottom: '#334155',
      celestialColor: '#38bdf8',
      farTreeColor: '#1e293b',
      midColor: '#273549',
      accentColor: '#fde047',
      groundColor: '#334155',
      topColor: '#eab308'
    }
  };

  function makeSpheresRow(startX, y, count, gap = 42) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({ x: startX + i * gap, y });
    }
    return arr;
  }

  const STAGES = [
    {
      id: 1,
      name: 'Costa da Torre no Mar',
      subtitle: 'Nícolas deixa a Torre no Mar com suas lâminas e pistola arcana.',
      theme: THEMES.sea,
      width: 2400,
      platforms: [
        { x: 0, y: 460, w: 520, h: 80 },
        { x: 610, y: 420, w: 220, h: 120 },
        { x: 920, y: 370, w: 200, h: 170 },
        { x: 1220, y: 440, w: 340, h: 100 },
        { x: 1420, y: 340, w: 120, h: 20 },
        { x: 1660, y: 390, w: 230, h: 150 },
        { x: 1980, y: 440, w: 420, h: 100 }
      ],
      hazards: [],
      spheres: [
        ...makeSpheresRow(220, 420, 4),
        ...makeSpheresRow(650, 380, 3),
        ...makeSpheresRow(950, 330, 3),
        ...makeSpheresRow(1440, 300, 3),
        ...makeSpheresRow(1700, 350, 4)
      ],
      enemies: [
        { type: 'slime', x: 700, y: 386, minX: 620, maxX: 790, hp: 25, exp: 20 },
        { type: 'slime', x: 1320, y: 406, minX: 1240, maxX: 1510, hp: 28, exp: 22 },
        { type: 'slime', x: 1750, y: 356, minX: 1670, maxX: 1850, hp: 30, exp: 25 }
      ],
      goal: { x: 2260, y: 340 }
    },
    {
      id: 2,
      name: 'Cais dos Piratas',
      subtitle: 'Plataformas móveis sobre as docas da costa pós-cataclisma.',
      theme: THEMES.docks,
      width: 2600,
      platforms: [
        { x: 0, y: 460, w: 420, h: 80 },
        { x: 500, y: 420, w: 150, h: 22, type: 'moving', moveX: 130, speed: 1.5 },
        { x: 820, y: 380, w: 280, h: 160 },
        { x: 1190, y: 350, w: 140, h: 22, type: 'moving', moveX: 140, speed: 1.8 },
        { x: 1520, y: 400, w: 320, h: 140 },
        { x: 1930, y: 350, w: 180, h: 24 },
        { x: 2180, y: 430, w: 420, h: 110 }
      ],
      hazards: [
        { x: 930, y: 364, w: 50, h: 16, kind: 'spike' }
      ],
      spheres: [
        ...makeSpheresRow(180, 420, 4),
        ...makeSpheresRow(530, 370, 3),
        ...makeSpheresRow(1000, 340, 3),
        ...makeSpheresRow(1600, 360, 4),
        ...makeSpheresRow(1960, 310, 3)
      ],
      enemies: [
        { type: 'slime', x: 850, y: 346, minX: 825, maxX: 910, hp: 32, exp: 24 },
        { type: 'flyer', x: 1350, y: 260, minX: 1200, maxX: 1480, hp: 28, exp: 26 },
        { type: 'armored', x: 1650, y: 366, minX: 1530, maxX: 1800, hp: 42, exp: 30 }
      ],
      goal: { x: 2450, y: 330 }
    },
    {
      id: 3,
      name: 'Ruínas do Cataclisma',
      subtitle: 'Terras partidas onde o velho mundo encontrou o Arcano.',
      theme: THEMES.ruins,
      width: 2700,
      platforms: [
        { x: 0, y: 460, w: 380, h: 80 },
        { x: 470, y: 410, w: 180, h: 130 },
        { x: 740, y: 350, w: 160, h: 24 },
        { x: 990, y: 440, w: 320, h: 100 },
        { x: 1120, y: 320, w: 120, h: 20 },
        { x: 1410, y: 400, w: 140, h: 22, type: 'moving', moveY: 70, speed: 1.8 },
        { x: 1660, y: 360, w: 300, h: 180 },
        { x: 2050, y: 420, w: 180, h: 120 },
        { x: 2320, y: 440, w: 380, h: 100 }
      ],
      hazards: [
        { x: 1090, y: 424, w: 64, h: 16, kind: 'spike' },
        { x: 1790, y: 344, w: 48, h: 16, kind: 'spike' }
      ],
      spheres: [
        ...makeSpheresRow(160, 420, 3),
        ...makeSpheresRow(760, 310, 3),
        ...makeSpheresRow(1135, 280, 3),
        ...makeSpheresRow(1680, 320, 4),
        ...makeSpheresRow(2090, 380, 3)
      ],
      enemies: [
        { type: 'slime', x: 520, y: 376, minX: 480, maxX: 610, hp: 35, exp: 26 },
        { type: 'turret', x: 1240, y: 406, hp: 36, exp: 30 },
        { type: 'flyer', x: 1540, y: 250, minX: 1400, maxX: 1640, hp: 32, exp: 28 },
        { type: 'armored', x: 1880, y: 326, minX: 1850, maxX: 1930, hp: 45, exp: 34 }
      ],
      goal: { x: 2560, y: 340 }
    },
    {
      id: 4,
      name: 'Raízes da Árvore da Brisa',
      subtitle: 'Folhas elásticas impulsionam Nícolas pelas raízes gigantes.',
      theme: THEMES.breeze,
      width: 2800,
      platforms: [
        { x: 0, y: 460, w: 420, h: 80 },
        { x: 340, y: 444, w: 70, h: 16, type: 'bounce' },
        { x: 520, y: 310, w: 240, h: 24 },
        { x: 860, y: 440, w: 320, h: 100 },
        { x: 1100, y: 424, w: 70, h: 16, type: 'bounce' },
        { x: 1270, y: 270, w: 260, h: 24 },
        { x: 1620, y: 380, w: 280, h: 160 },
        { x: 1990, y: 340, w: 150, h: 22, type: 'moving', moveX: 130, speed: 2.0 },
        { x: 2320, y: 420, w: 480, h: 120 }
      ],
      hazards: [
        { x: 960, y: 424, w: 60, h: 16, kind: 'spike' }
      ],
      spheres: [
        ...makeSpheresRow(550, 270, 4),
        ...makeSpheresRow(1300, 230, 5),
        ...makeSpheresRow(1660, 340, 4),
        ...makeSpheresRow(2360, 380, 4)
      ],
      enemies: [
        { type: 'flyer', x: 640, y: 220, minX: 500, maxX: 760, hp: 34, exp: 28 },
        { type: 'slime', x: 900, y: 406, minX: 870, maxX: 940, hp: 36, exp: 28 },
        { type: 'turret', x: 1470, y: 236, hp: 40, exp: 32 },
        { type: 'armored', x: 1730, y: 346, minX: 1630, maxX: 1860, hp: 48, exp: 35 }
      ],
      goal: { x: 2650, y: 320 }
    },
    {
      id: 5,
      name: 'Copa da Árvore da Brisa (Mini-Chefe)',
      subtitle: 'O primeiro Guardião testa a astúcia do Didalmiano!',
      theme: THEMES.breeze,
      width: 2500,
      platforms: [
        { x: 0, y: 450, w: 360, h: 90 },
        { x: 450, y: 390, w: 200, h: 24 },
        { x: 740, y: 330, w: 200, h: 24 },
        { x: 1030, y: 420, w: 260, h: 120 },
        { x: 1210, y: 404, w: 70, h: 16, type: 'bounce' },
        { x: 1380, y: 280, w: 220, h: 24 },
        { x: 1690, y: 430, w: 810, h: 110 }
      ],
      hazards: [],
      spheres: [
        ...makeSpheresRow(480, 350, 3),
        ...makeSpheresRow(770, 290, 3),
        ...makeSpheresRow(1410, 240, 4),
        ...makeSpheresRow(1750, 390, 4)
      ],
      enemies: [
        { type: 'flyer', x: 600, y: 260, minX: 460, maxX: 740, hp: 36, exp: 30 },
        { type: 'turret', x: 1120, y: 386, hp: 40, exp: 32 },
        {
          type: 'boss',
          isBoss: true,
          name: 'Guardião da Brisa',
          x: 2060,
          y: 358,
          minX: 1800,
          maxX: 2300,
          hp: 190,
          dmg: 18,
          exp: 110
        }
      ],
      goal: { x: 2380, y: 330 }
    },
    {
      id: 6,
      name: 'Pântano das Sementes',
      subtitle: 'Águas turvas e espinhos de conceito venenoso.',
      theme: THEMES.swamp,
      width: 2850,
      platforms: [
        { x: 0, y: 460, w: 380, h: 80 },
        { x: 470, y: 420, w: 220, h: 120 },
        { x: 780, y: 370, w: 140, h: 22, type: 'moving', moveX: 120, speed: 2.1 },
        { x: 1080, y: 430, w: 340, h: 110 },
        { x: 1510, y: 370, w: 180, h: 24 },
        { x: 1780, y: 310, w: 180, h: 24 },
        { x: 2050, y: 420, w: 300, h: 120 },
        { x: 2440, y: 440, w: 410, h: 100 }
      ],
      hazards: [
        { x: 540, y: 404, w: 60, h: 16, kind: 'spike' },
        { x: 1200, y: 414, w: 80, h: 16, kind: 'spike' },
        { x: 2150, y: 404, w: 64, h: 16, kind: 'spike' }
      ],
      spheres: [
        ...makeSpheresRow(160, 420, 3),
        ...makeSpheresRow(810, 320, 3),
        ...makeSpheresRow(1540, 330, 3),
        ...makeSpheresRow(1810, 270, 3),
        ...makeSpheresRow(2500, 400, 4)
      ],
      enemies: [
        { type: 'slime', x: 630, y: 386, minX: 610, maxX: 660, hp: 42, exp: 32 },
        { type: 'flyer', x: 1250, y: 280, minX: 1100, maxX: 1400, hp: 40, exp: 34 },
        { type: 'turret', x: 1890, y: 276, hp: 44, exp: 36 },
        { type: 'armored', x: 2240, y: 386, minX: 2220, maxX: 2310, hp: 55, exp: 40 }
      ],
      goal: { x: 2720, y: 340 }
    },
    {
      id: 7,
      name: 'Forja do Armeiro',
      subtitle: 'Cavernas incandescentes onde armas arcanas são temperadas.',
      theme: THEMES.forge,
      width: 2900,
      platforms: [
        { x: 0, y: 460, w: 360, h: 80 },
        { x: 450, y: 410, w: 260, h: 130 },
        { x: 800, y: 350, w: 160, h: 24 },
        { x: 1050, y: 430, w: 360, h: 110 },
        { x: 1500, y: 380, w: 140, h: 22, type: 'moving', moveY: 85, speed: 2.2 },
        { x: 1740, y: 330, w: 280, h: 210 },
        { x: 2110, y: 420, w: 260, h: 120 },
        { x: 2460, y: 440, w: 440, h: 100 }
      ],
      hazards: [
        { x: 520, y: 394, w: 80, h: 16, kind: 'lava' },
        { x: 1150, y: 414, w: 96, h: 16, kind: 'lava' },
        { x: 1840, y: 314, w: 64, h: 16, kind: 'lava' }
      ],
      spheres: [
        ...makeSpheresRow(180, 420, 3),
        ...makeSpheresRow(820, 310, 3),
        ...makeSpheresRow(1270, 390, 3),
        ...makeSpheresRow(1760, 290, 3),
        ...makeSpheresRow(2500, 400, 4)
      ],
      enemies: [
        { type: 'armored', x: 630, y: 376, minX: 610, maxX: 675, hp: 58, exp: 42 },
        { type: 'turret', x: 1350, y: 396, hp: 48, exp: 38 },
        { type: 'flyer', x: 1620, y: 230, minX: 1480, maxX: 1740, hp: 44, exp: 38 },
        { type: 'armored', x: 2180, y: 386, minX: 2120, maxX: 2330, hp: 62, exp: 45 }
      ],
      goal: { x: 2770, y: 340 }
    },
    {
      id: 8,
      name: 'Bosque das Árvores de Arcano',
      subtitle: 'Árvores de Fogo, Tempestade e Sombra iluminam o caminho.',
      theme: THEMES.arcane,
      width: 3000,
      platforms: [
        { x: 0, y: 460, w: 360, h: 80 },
        { x: 280, y: 444, w: 70, h: 16, type: 'bounce' },
        { x: 440, y: 290, w: 240, h: 24 },
        { x: 770, y: 400, w: 150, h: 22, type: 'moving', moveX: 140, speed: 2.3 },
        { x: 1100, y: 370, w: 320, h: 170 },
        { x: 1510, y: 320, w: 200, h: 24 },
        { x: 1800, y: 430, w: 280, h: 110 },
        { x: 1990, y: 414, w: 70, h: 16, type: 'bounce' },
        { x: 2160, y: 270, w: 260, h: 24 },
        { x: 2510, y: 420, w: 490, h: 120 }
      ],
      hazards: [
        { x: 1230, y: 354, w: 64, h: 16, kind: 'spike' },
        { x: 1870, y: 414, w: 64, h: 16, kind: 'spike' }
      ],
      spheres: [
        ...makeSpheresRow(470, 250, 4),
        ...makeSpheresRow(1130, 330, 3),
        ...makeSpheresRow(1540, 280, 3),
        ...makeSpheresRow(2200, 230, 4),
        ...makeSpheresRow(2580, 380, 4)
      ],
      enemies: [
        { type: 'flyer', x: 560, y: 210, minX: 430, maxX: 690, hp: 46, exp: 40 },
        { type: 'turret', x: 1360, y: 336, hp: 52, exp: 42 },
        { type: 'armored', x: 1560, y: 286, minX: 1520, maxX: 1670, hp: 65, exp: 46 },
        { type: 'flyer', x: 2300, y: 190, minX: 2150, maxX: 2430, hp: 48, exp: 42 }
      ],
      goal: { x: 2860, y: 320 }
    },
    {
      id: 9,
      name: 'Ascensão da Torre Central',
      subtitle: 'Saltos precisos sob fogo de sentinelas arcanas.',
      theme: THEMES.tower,
      width: 3100,
      platforms: [
        { x: 0, y: 460, w: 340, h: 80 },
        { x: 430, y: 400, w: 180, h: 24 },
        { x: 700, y: 340, w: 180, h: 24 },
        { x: 970, y: 430, w: 260, h: 110 },
        { x: 1320, y: 380, w: 150, h: 22, type: 'moving', moveX: 150, speed: 2.5 },
        { x: 1660, y: 350, w: 280, h: 190 },
        { x: 2030, y: 300, w: 150, h: 22, type: 'moving', moveY: 85, speed: 2.4 },
        { x: 2280, y: 390, w: 260, h: 150 },
        { x: 2630, y: 430, w: 470, h: 110 }
      ],
      hazards: [
        { x: 1060, y: 414, w: 64, h: 16, kind: 'spike' },
        { x: 1770, y: 334, w: 64, h: 16, kind: 'lava' }
      ],
      spheres: [
        ...makeSpheresRow(460, 360, 3),
        ...makeSpheresRow(730, 300, 3),
        ...makeSpheresRow(1690, 310, 3),
        ...makeSpheresRow(2320, 350, 4),
        ...makeSpheresRow(2690, 390, 4)
      ],
      enemies: [
        { type: 'turret', x: 820, y: 306, hp: 54, exp: 44 },
        { type: 'flyer', x: 1150, y: 260, minX: 980, maxX: 1260, hp: 50, exp: 44 },
        { type: 'armored', x: 1850, y: 316, minX: 1840, maxX: 1905, hp: 70, exp: 50 },
        { type: 'turret', x: 2470, y: 356, hp: 58, exp: 48 },
        { type: 'armored', x: 2740, y: 396, minX: 2640, maxX: 2900, hp: 72, exp: 52 }
      ],
      goal: { x: 2970, y: 330 }
    },
    {
      id: 10,
      name: 'Coração da Árvore Ancestral (Chefe Final)',
      subtitle: 'Enfrente o Guardião do Cataclisma e conquiste o núcleo arcano!',
      theme: THEMES.arcane,
      width: 2600,
      platforms: [
        { x: 0, y: 460, w: 360, h: 80 },
        { x: 450, y: 400, w: 180, h: 24 },
        { x: 720, y: 340, w: 180, h: 24 },
        { x: 990, y: 410, w: 260, h: 130 },
        { x: 1170, y: 394, w: 70, h: 16, type: 'bounce' },
        { x: 1340, y: 270, w: 220, h: 24 },
        { x: 1630, y: 440, w: 970, h: 100 },
        { x: 1820, y: 320, w: 150, h: 20 },
        { x: 2150, y: 320, w: 150, h: 20 }
      ],
      hazards: [
        { x: 1050, y: 394, w: 60, h: 16, kind: 'lava' }
      ],
      spheres: [
        ...makeSpheresRow(480, 360, 3),
        ...makeSpheresRow(750, 300, 3),
        ...makeSpheresRow(1370, 230, 4),
        ...makeSpheresRow(1850, 280, 3),
        ...makeSpheresRow(2180, 280, 3)
      ],
      enemies: [
        { type: 'flyer', x: 640, y: 230, minX: 460, maxX: 880, hp: 55, exp: 48 },
        { type: 'turret', x: 1500, y: 236, hp: 60, exp: 50 },
        {
          type: 'boss',
          isBoss: true,
          name: 'Guardião do Cataclisma',
          x: 2080,
          y: 368,
          minX: 1700,
          maxX: 2380,
          hp: 340,
          dmg: 24,
          speed: 135,
          exp: 250
        }
      ],
      goal: { x: 2470, y: 340 }
    }
  ];

  return {
    count: STAGES.length,
    getStage(num) {
      const idx = Math.max(0, Math.min(STAGES.length - 1, num - 1));
      // Deep clone mutable arrays for fresh stage run
      const base = STAGES[idx];
      return {
        ...base,
        platforms: base.platforms.map((p) => ({ ...p, originX: p.x, originY: p.y })),
        hazards: base.hazards.map((h) => ({ ...h })),
        spheres: base.spheres.map((s) => ({ ...s, collected: false })),
        enemies: base.enemies.map((e) => ({ ...e }))
      };
    },
    getAllMeta() {
      return STAGES.map((s) => ({ id: s.id, name: s.name, subtitle: s.subtitle }));
    }
  };
})();
