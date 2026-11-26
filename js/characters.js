window.Jogo = window.Jogo || {};

window.Jogo.Characters = (function () {
  // Visual verde/mascara/laminas gemeas = Lex, o Pirata Armeiro
  const nicolas = {
    id: 'nicolas',
    name: 'Lex',
    title: 'Pirata Armeiro',
    desc: 'Pirata Didalmiano com lâminas gêmeas e pistola arcana. Equilibrado e veloz no corpo a corpo.',
    weapon: 'Lâminas Gêmeas',
    stats: { level: 1, exp: 0, expToNext: 100, maxHp: 100, hp: 100, atq: 15, def: 10, spd: 12 },
    reach: 46,
    reachH: 8,
    atkBonus: 5,
    shotMult: 0.9,
    shotColor: '#38bdf8',
    shotSpeed: 560,
    accent: '#4ade80'
  };

  // Visual ruivo/lanca flamejante/manopla dourada = Nicolas, o Lanceiro Armeiro
  const nicks = {
    id: 'nicks',
    name: 'Nícolas',
    title: 'Lanceiro Armeiro',
    desc: 'Lanceiro das Chamas com maestria de Armeiro: estocada longa, manopla dourada e tiro arcano potente.',
    weapon: 'Lança Flamejante',
    stats: { level: 1, exp: 0, expToNext: 100, maxHp: 95, hp: 95, atq: 14, def: 10, spd: 14 },
    reach: 84,
    reachH: -6,
    atkBonus: 5,
    shotMult: 1.15,
    shotColor: '#fb923c',
    shotSpeed: 540,
    accent: '#fb923c'
  };

  return { nicolas, nicks, list: [nicolas, nicks] };
})();
