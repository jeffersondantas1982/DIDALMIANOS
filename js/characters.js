window.Jogo = window.Jogo || {};

window.Jogo.Characters = (function () {
  const nicolas = {
    id: 'nicolas',
    name: 'Nícolas',
    title: 'Pirata Armeiro',
    desc: 'Lâminas gêmeas e pistola arcana. Equilibrado e veloz no corpo a corpo.',
    weapon: 'Lâminas Gêmeas',
    stats: { level: 1, exp: 0, expToNext: 100, maxHp: 100, hp: 100, atq: 15, def: 10, spd: 12 },
    reach: 46,
    reachH: 8,
    atkBonus: 5,
    shotMult: 0.85,
    shotColor: '#38bdf8',
    shotSpeed: 560,
    accent: '#4ade80'
  };

  const nicks = {
    id: 'nicks',
    name: 'Nicks',
    title: 'Lanceiro das Chamas',
    desc: 'Lança flamejante de longo alcance e manopla dourada. Mais rápido, porém mais frágil.',
    weapon: 'Lança Flamejante',
    stats: { level: 1, exp: 0, expToNext: 100, maxHp: 90, hp: 90, atq: 13, def: 8, spd: 14 },
    reach: 84,
    reachH: -6,
    atkBonus: 4,
    shotMult: 1.1,
    shotColor: '#fb923c',
    shotSpeed: 500,
    accent: '#fb923c'
  };

  return { nicolas, nicks, list: [nicolas, nicks] };
})();
