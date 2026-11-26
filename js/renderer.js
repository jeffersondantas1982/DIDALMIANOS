window.Jogo = window.Jogo || {};

window.Jogo.Renderer = (function () {
  const OUT = '#14100a';

  function rand(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt;
    let g = ((n >> 8) & 255) + amt;
    let b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  function poly(ctx, pts, fill, stroke, lw = 1.5) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function rrect(ctx, x, y, w, h, r, fill, stroke, lw = 1.5) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  function circle(ctx, x, y, r, fill, stroke, lw = 1.5) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  PERSONAGENS                                                        */
  /* ------------------------------------------------------------------ */

  function motion(p, time) {
    const moving = p.onGround && Math.abs(p.vx) > 20;
    const phase = time * 16;
    return {
      moving,
      bob: moving ? -Math.abs(Math.sin(phase)) * 2 : Math.sin(time * 3) * 0.6,
      swing: moving ? Math.sin(phase) * 6 : 0,
      air: !p.onGround,
      phase
    };
  }

  function drawLegs(ctx, m, p, pants, boots, bootTrim) {
    const air = m.air;
    const l1 = air ? -4 : m.swing;
    const l2 = air ? 5 : -m.swing;
    const lift1 = air ? -4 : 0;
    // perna de trás
    rrect(ctx, -9 + l2 * 0.5, 8, 8, 12, 3, shade(pants, -25), OUT, 1.2);
    rrect(ctx, -11 + l2, 17 + lift1, 11, 8, 3, shade(boots, -20), OUT, 1.2);
    // perna da frente
    rrect(ctx, 0 + l1 * 0.5, 8, 8, 12, 3, pants, OUT, 1.2);
    rrect(ctx, -2 + l1, 17 + lift1, 12, 8, 3, boots, OUT, 1.2);
    ctx.fillStyle = bootTrim;
    ctx.fillRect(-1 + l1, 18 + lift1, 10, 2);
  }

  function drawNicolasLocal(ctx, p, time) {
    const m = motion(p, time);
    const b = m.bob;
    const atk = p.attackTimer > 0;

    // lâminas cruzadas nas costas
    ctx.save();
    ctx.translate(-4, -2 + b);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * 0.7);
      poly(ctx, [[-2, -6], [2, -6], [3, 22], [-3, 28]], '#cbd5e1', OUT, 1.2);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-0.5, -4, 1.5, 22);
      ctx.restore();
    }
    ctx.restore();

    drawLegs(ctx, m, p, '#2b2118', '#6b3e26', '#eab308');

    // casaco verde
    const coat = ctx.createLinearGradient(-13, 0, 13, 0);
    coat.addColorStop(0, '#14532d');
    coat.addColorStop(0.5, '#1f7a43');
    coat.addColorStop(1, '#14532d');
    poly(ctx, [[-12, -6 + b], [12, -6 + b], [15, 20], [-15, 20]], coat, OUT, 1.5);
    // barra dourada
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-15, 19);
    ctx.lineTo(15, 19);
    ctx.stroke();
    // botões frontais
    ctx.fillStyle = '#facc15';
    for (let i = 0; i < 4; i++) circle(ctx, 1, -2 + b + i * 5.5, 1.1, '#facc15');
    // capa curta (ombros)
    poly(ctx, [[-14, -8 + b], [14, -8 + b], [10, 0 + b], [-10, 0 + b]], '#166534', OUT, 1.3);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, 0 + b);
    ctx.lineTo(10, 0 + b);
    ctx.stroke();
    // cintos
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-13, 9 + b, 26, 4);
    ctx.fillRect(-13, 13 + b, 26, 3);
    rrect(ctx, -3, 8 + b, 7, 6, 1, '#facc15', OUT, 1);
    rrect(ctx, 7, 11 + b, 6, 8, 1.5, '#6b3e26', OUT, 1);

    // braço de trás
    rrect(ctx, -14, -3 + b, 6, 14, 3, '#14532d', OUT, 1.2);
    rrect(ctx, -15, 8 + b, 7, 6, 2, '#6b3e26', OUT, 1.2);

    // cabeça
    // pontas verdes do capuz (atrás)
    poly(ctx, [[-9, -22 + b], [-14, -38 + b], [-2, -26 + b]], '#166534', OUT, 1.3);
    poly(ctx, [[2, -26 + b], [11, -39 + b], [12, -20 + b]], '#166534', OUT, 1.3);
    circle(ctx, 9.5, -36 + b, 1.2, '#facc15');
    circle(ctx, 10.5, -32 + b, 1.2, '#facc15');
    // orelha
    poly(ctx, [[-8, -17 + b], [-18, -21 + b], [-8, -12 + b]], '#f5cbb0', OUT, 1.2);
    // rosto
    circle(ctx, 0, -15 + b, 11.5, '#f5cbb0', OUT, 1.5);
    // cabelo
    ctx.fillStyle = '#e8edf5';
    ctx.beginPath();
    ctx.arc(0, -17 + b, 12, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(8, -17 + b);
    ctx.quadraticCurveTo(2, -21 + b, -3, -14 + b);
    ctx.lineTo(-10, -12 + b);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // rabo de cabelo
    const sway = Math.sin(time * 5) * 2;
    ctx.beginPath();
    ctx.moveTo(-10, -20 + b);
    ctx.quadraticCurveTo(-20 - sway, -16 + b, -17 - sway, -6 + b);
    ctx.quadraticCurveTo(-13, -12 + b, -9, -14 + b);
    ctx.fillStyle = '#e8edf5';
    ctx.fill();
    ctx.stroke();
    // olho
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -18 + b, 7, 6);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(3, -18 + b, 5, 6);
    ctx.fillStyle = '#052e16';
    ctx.fillRect(5, -17 + b, 2, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -17.5 + b, 1.2, 1.2);
    // sobrancelha
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -21 + b);
    ctx.lineTo(9, -19.5 + b);
    ctx.stroke();
    // máscara
    poly(ctx, [[-5, -11 + b], [11, -11 + b], [10, -3 + b], [3, 0 + b], [-3, -3 + b]], '#1e293b', '#eab308', 1.2);
    circle(ctx, 0, -7 + b, 1, '#64748b');
    circle(ctx, 6, -7 + b, 1, '#64748b');
    // gola alta
    poly(ctx, [[-9, -4 + b], [9, -4 + b], [11, 0 + b], [-11, 0 + b]], '#14532d', '#eab308', 1.2);

    // braço da frente + luva
    if (atk) {
      rrect(ctx, 6, -4 + b, 16, 6, 3, '#14532d', OUT, 1.2);
      rrect(ctx, 20, -5 + b, 8, 8, 3, '#6b3e26', OUT, 1.2);
    } else {
      rrect(ctx, 8, -3 + b, 6, 14, 3, '#1f7a43', OUT, 1.2);
      rrect(ctx, 7, 8 + b, 8, 7, 2, '#6b3e26', OUT, 1.2);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(7, 7 + b, 8, 2);
      // lâmina em punho (para baixo)
      poly(ctx, [[10, 14 + b], [13, 14 + b], [17, 30 + b], [9, 26 + b]], '#cbd5e1', OUT, 1.1);
    }

    if (atk) {
      const t = 1 - p.attackTimer / 0.18;
      ctx.save();
      const g = ctx.createRadialGradient(10, 0, 4, 10, 0, 40);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, 'rgba(253,224,71,0.85)');
      g.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(10, 0, 40, -1.3 + t * 0.6, 1.3 - t * 0.3);
      ctx.arc(10, 0, 20, 1.3 - t * 0.3, -1.3 + t * 0.6, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(10, 0, 38, -1.1 + t * 0.6, 1.1 - t * 0.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFlame(ctx, x, y, size, time) {
    const f = Math.sin(time * 22) * 0.12 + 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size * f, size * (1.1 - (f - 1)));
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(9, -4, 5, 4);
    ctx.quadraticCurveTo(0, 8, -5, 4);
    ctx.quadraticCurveTo(-9, -4, 0, -18);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(5, -2, 2, 3);
    ctx.quadraticCurveTo(0, 5, -2, 3);
    ctx.quadraticCurveTo(-5, -2, 0, -11);
    ctx.fill();
    ctx.restore();
  }

  function drawNicksLocal(ctx, p, time) {
    const m = motion(p, time);
    const b = m.bob;
    const atk = p.attackTimer > 0;

    // orelhas/chifres cinzentos (atrás)
    poly(ctx, [[-10, -24 + b], [-16, -42 + b], [-2, -28 + b]], '#4b5563', OUT, 1.3);
    poly(ctx, [[4, -28 + b], [14, -44 + b], [13, -22 + b]], '#4b5563', OUT, 1.3);

    // rabo de cabelo ruivo flutuando
    const sw = Math.sin(time * 6) * 3;
    ctx.beginPath();
    ctx.moveTo(-9, -24 + b);
    ctx.bezierCurveTo(-24, -26 + b + sw, -32 - sw, -16 + b, -36, -22 + b + sw);
    ctx.bezierCurveTo(-30, -10 + b, -22, -10 + b - sw, -10, -16 + b);
    const hg = ctx.createLinearGradient(-36, 0, -8, 0);
    hg.addColorStop(0, '#b91c1c');
    hg.addColorStop(1, '#ef4444');
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // manopla dourada (braço de trás)
    rrect(ctx, -14, -3 + b, 6, 13, 3, '#374151', OUT, 1.2);
    poly(ctx, [[-17, 8 + b], [-7, 8 + b], [-6, 17 + b], [-12, 20 + b], [-18, 17 + b]], '#f59e0b', OUT, 1.3);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-14, 10 + b, 4, 2);
    poly(ctx, [[-18, 17 + b], [-20, 24 + b], [-15, 19 + b]], '#d97706', OUT, 1);
    poly(ctx, [[-12, 20 + b], [-12, 27 + b], [-8, 19 + b]], '#d97706', OUT, 1);

    drawLegs(ctx, m, p, '#5f7550', '#374151', '#f59e0b');

    // túnica carmesim
    const rob = ctx.createLinearGradient(-13, 0, 13, 0);
    rob.addColorStop(0, '#be3455');
    rob.addColorStop(0.5, '#e24a6e');
    rob.addColorStop(1, '#be3455');
    poly(ctx, [[-12, -6 + b], [12, -6 + b], [16, 21], [-16, 21]], rob, OUT, 1.5);
    // acabamento creme
    ctx.strokeStyle = '#f5ecd2';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-15, 19);
    ctx.lineTo(15, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 6 + b);
    ctx.lineTo(3, 19);
    ctx.stroke();
    // cinto preto + fivela laranja
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-13, 8 + b, 26, 5);
    rrect(ctx, 0, 7 + b, 7, 7, 1, '#f59e0b', OUT, 1);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-9, 6 + b, 2, 6);
    ctx.fillRect(-6, 6 + b, 2, 6);
    // pingente de pena
    poly(ctx, [[-8, 14 + b], [-6, 14 + b], [-5, 24], [-9, 20]], '#f59e0b', OUT, 0.8);
    // gola verde-clara
    poly(ctx, [[-11, -6 + b], [11, -6 + b], [8, 2 + b], [0, 4 + b], [-8, 2 + b]], '#cfe8cf', OUT, 1.3);
    poly(ctx, [[-4, -5 + b], [4, -5 + b], [0, 3 + b]], '#be3455', OUT, 1);

    // cabeça (pele clara esverdeada)
    poly(ctx, [[-8, -18 + b], [-18, -22 + b], [-8, -13 + b]], '#dff3df', OUT, 1.2);
    circle(ctx, 0, -17 + b, 11.5, '#e4f5e4', OUT, 1.5);
    // olho verde
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -20 + b, 7, 6);
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(3, -20 + b, 5, 6);
    ctx.fillStyle = '#365314';
    ctx.fillRect(5, -19 + b, 2, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -19.5 + b, 1.2, 1.2);
    // marcas laranja na bochecha
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-1, -15 + b, 2.2, 2.2);
    ctx.fillRect(2.4, -15 + b, 2.2, 2.2);
    ctx.fillRect(-1, -12 + b, 2.2, 2.2);
    ctx.fillRect(2.4, -12 + b, 2.2, 2.2);
    // boca
    ctx.fillStyle = '#f9a8d4';
    ctx.fillRect(1, -8 + b, 4, 2);
    // franja ruiva
    ctx.beginPath();
    ctx.moveTo(-12, -14 + b);
    ctx.bezierCurveTo(-15, -32 + b, 8, -34 + b, 12, -22 + b);
    ctx.bezierCurveTo(7, -26 + b, 1, -24 + b, -3, -17 + b);
    ctx.bezierCurveTo(-5, -14 + b, -8, -10 + b, -12, -14 + b);
    const hg2 = ctx.createLinearGradient(0, -34, 0, -10);
    hg2.addColorStop(0, '#f87171');
    hg2.addColorStop(1, '#b91c1c');
    ctx.fillStyle = hg2;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // coque
    circle(ctx, -2, -31 + b, 4.5, '#ef4444', OUT, 1.2);
    // brinco laranja
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-10, -17 + b, 2, 3);

    // braço da frente + lança
    if (atk) {
      const t = 1 - p.attackTimer / 0.18;
      const ext = 8 + Math.sin(Math.min(1, t) * Math.PI) * 32;
      rrect(ctx, 6, -2 + b, 14, 6, 3, '#e24a6e', OUT, 1.2);
      rrect(ctx, 16, -3 + b, 7, 8, 3, '#e4f5e4', OUT, 1.2);
      // haste
      ctx.fillStyle = '#374151';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ctx.fillRect(-6, 0 + b, 40 + ext, 3);
      ctx.strokeRect(-6, 0 + b, 40 + ext, 3);
      // ponta
      poly(ctx, [[34 + ext, -3 + b], [48 + ext, 1.5 + b], [34 + ext, 6 + b], [38 + ext, 1.5 + b]], '#cbd5e1', OUT, 1.2);
      ctx.save();
      ctx.translate(34 + ext, 1.5 + b);
      ctx.rotate(Math.PI / 2);
      drawFlame(ctx, 0, 0, 0.9, time);
      ctx.restore();
      // rastro de fogo
      const g = ctx.createLinearGradient(-6, 0, 60 + ext, 0);
      g.addColorStop(0, 'rgba(251,146,60,0)');
      g.addColorStop(1, 'rgba(251,191,36,0.6)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(30 + ext * 0.5, 1.5 + b, 34 + ext * 0.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      rrect(ctx, 8, -3 + b, 6, 13, 3, '#e24a6e', OUT, 1.2);
      rrect(ctx, 7, 7 + b, 8, 7, 2, '#e4f5e4', OUT, 1.2);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 9 + b, 2, 2);
      ctx.fillRect(12, 9 + b, 2, 2);
      // lança vertical
      ctx.save();
      ctx.translate(12, 10 + b);
      ctx.rotate(0.12);
      ctx.fillStyle = '#374151';
      ctx.fillRect(-1.5, -52, 3, 78);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.strokeRect(-1.5, -52, 3, 78);
      ctx.fillStyle = '#cbd5e1';
      for (let i = 0; i < 5; i++) ctx.fillRect(-1.5, -46 + i * 12, 3, 3);
      poly(ctx, [[-5, -52], [5, -52], [4, -60], [0, -64], [-4, -60]], '#1f2937', OUT, 1.2);
      drawFlame(ctx, 0, -64, 0.8, time);
      ctx.restore();
    }
  }

  function drawCharLocal(ctx, p, time) {
    if (p.dashTimer > 0) {
      const col = p.charId === 'nicks' ? '#fb923c' : '#4ade80';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -10 + i * 12, 24 - i * 3, 6, time * 14 + i, 0, Math.PI * 1.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (p.charId === 'nicks') drawNicksLocal(ctx, p, time);
    else drawNicolasLocal(ctx, p, time);
  }

  function drawPlayer(ctx, p, camX, time) {
    const cx = p.x - camX + p.w / 2;
    const cy = p.y + p.h / 2;

    // sombra no chão
    if (p.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, p.y + p.h + 1, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    if (p.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.translate(cx, cy);
    if (p.facing < 0) ctx.scale(-1, 1);
    drawCharLocal(ctx, p, time);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPreview(canvas, charId, time = 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 10, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    g.addColorStop(0, charId === 'nicks' ? '#4a1d2b' : '#173826');
    g.addColorStop(1, '#0b121b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 14);
    ctx.scale(2.3, 2.3);
    drawCharLocal(
      ctx,
      { charId, facing: 1, onGround: true, vx: 0, vy: 0, attackTimer: 0, dashTimer: 0, invulnTimer: 0, w: 28, h: 46 },
      time
    );
    ctx.restore();
  }

  function drawPortrait(canvas, charId = 'nicolas') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    const k = canvas.width / 72;
    ctx.scale(k, k);
    ctx.clearRect(0, 0, 72, 72);
    const bg = ctx.createRadialGradient(36, 36, 6, 36, 36, 40);
    bg.addColorStop(0, charId === 'nicks' ? '#5b2a3a' : '#334e68');
    bg.addColorStop(1, '#0f1b28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 72, 72);

    if (charId === 'nicks') {
      poly(ctx, [[18, 28], [12, 4], [30, 20]], '#4b5563', OUT, 1.3);
      poly(ctx, [[54, 28], [60, 4], [42, 20]], '#4b5563', OUT, 1.3);
      // rabo ruivo
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(52, 28);
      ctx.bezierCurveTo(70, 26, 72, 40, 64, 46);
      ctx.bezierCurveTo(62, 38, 56, 38, 52, 40);
      ctx.fill();
      poly(ctx, [[17, 40], [3, 35], [16, 47]], '#dff3df', OUT, 1.2);
      poly(ctx, [[55, 40], [69, 35], [56, 47]], '#dff3df', OUT, 1.2);
      circle(ctx, 36, 40, 19, '#e4f5e4', OUT, 1.5);
      // cabelo
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(16, 42);
      ctx.bezierCurveTo(12, 8, 58, 6, 58, 34);
      ctx.bezierCurveTo(48, 24, 40, 28, 34, 36);
      ctx.bezierCurveTo(28, 44, 22, 46, 16, 42);
      ctx.fill();
      ctx.stroke();
      circle(ctx, 32, 12, 6, '#ef4444', OUT, 1.2);
      // olhos
      for (const ex of [22, 41]) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex, 36, 9, 8);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(ex + 2, 36, 6, 8);
        ctx.fillStyle = '#365314';
        ctx.fillRect(ex + 4, 38, 2.5, 5);
      }
      // marcas
      ctx.fillStyle = '#f59e0b';
      [[33, 44], [37.5, 44], [33, 48], [37.5, 48]].forEach(([x, y]) => ctx.fillRect(x, y, 3, 3));
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(34, 55, 5, 2);
      // gola
      poly(ctx, [[14, 72], [20, 60], [36, 66], [52, 60], [58, 72]], '#cfe8cf', OUT, 1.3);
      poly(ctx, [[28, 72], [36, 64], [44, 72]], '#be3455', OUT, 1);
    } else {
      poly(ctx, [[18, 26], [14, 4], [30, 18]], '#166534', OUT, 1.3);
      poly(ctx, [[54, 26], [58, 4], [42, 18]], '#166534', OUT, 1.3);
      circle(ctx, 54, 12, 1.8, '#facc15');
      circle(ctx, 53, 18, 1.8, '#facc15');
      poly(ctx, [[17, 40], [3, 34], [16, 47]], '#f5cbb0', OUT, 1.2);
      poly(ctx, [[55, 40], [69, 34], [56, 47]], '#f5cbb0', OUT, 1.2);
      circle(ctx, 36, 39, 19, '#f5cbb0', OUT, 1.5);
      ctx.fillStyle = '#e8edf5';
      ctx.beginPath();
      ctx.moveTo(15, 40);
      ctx.bezierCurveTo(10, 8, 60, 8, 58, 40);
      ctx.lineTo(52, 32);
      ctx.quadraticCurveTo(42, 24, 36, 28);
      ctx.quadraticCurveTo(28, 24, 22, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const ex of [22, 41]) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex, 35, 9, 8);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(ex + 2, 35, 6, 8);
        ctx.fillStyle = '#052e16';
        ctx.fillRect(ex + 4, 37, 2.5, 5);
      }
      poly(ctx, [[18, 44], [36, 41], [54, 44], [49, 58], [36, 62], [23, 58]], '#1e293b', '#eab308', 1.5);
      circle(ctx, 30, 52, 1.3, '#64748b');
      circle(ctx, 42, 52, 1.3, '#64748b');
      poly(ctx, [[14, 72], [20, 62], [36, 66], [52, 62], [58, 72]], '#14532d', '#eab308', 1.3);
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  CENÁRIO                                                            */
  /* ------------------------------------------------------------------ */

  function drawArcaneTree(ctx, x, baseY, size, seed, theme, time) {
    const tw = size * 0.14;
    const th = size;
    const trunk = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
    trunk.addColorStop(0, shade(theme.farTreeColor, -18));
    trunk.addColorStop(1, shade(theme.farTreeColor, 14));
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(x - tw * 1.6, baseY);
    ctx.quadraticCurveTo(x - tw * 0.4, baseY - th * 0.5, x - tw * 0.8, baseY - th);
    ctx.lineTo(x + tw * 0.8, baseY - th);
    ctx.quadraticCurveTo(x + tw * 0.4, baseY - th * 0.5, x + tw * 1.6, baseY);
    ctx.closePath();
    ctx.fill();

    // copa em camadas
    for (let i = 0; i < 5; i++) {
      const ang = rand(seed + i) * Math.PI * 2;
      const r = size * (0.28 + rand(seed + i * 3) * 0.12);
      const cx = x + Math.cos(ang) * size * 0.28;
      const cy = baseY - th - size * 0.05 + Math.sin(ang) * size * 0.16;
      ctx.fillStyle = shade(theme.farTreeColor, -6 + i * 6);
      circle(ctx, cx, cy, r, ctx.fillStyle);
    }
    // runas / frutos de arcano brilhando
    ctx.save();
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = theme.accentColor;
    for (let i = 0; i < 6; i++) {
      const rx = x + (rand(seed + 40 + i) - 0.5) * size * 0.8;
      const ry = baseY - th - size * 0.1 + (rand(seed + 60 + i) - 0.5) * size * 0.4;
      ctx.globalAlpha = 0.45 + 0.5 * Math.sin(time * 2 + i * 1.7 + seed);
      circle(ctx, rx, ry, 2.2, theme.accentColor);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawBackground(ctx, theme, camX, time, width, height) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // estrelas
    for (let i = 0; i < 45; i++) {
      const sx = (rand(i) * width * 1.4 - camX * 0.02 + width * 1.4) % width;
      const sy = rand(i + 99) * height * 0.5;
      ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 1.5 + i));
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;

    // astro com halo
    const mx = width * 0.78 - camX * 0.03;
    const my = 95;
    const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
    halo.addColorStop(0, theme.celestialColor);
    halo.addColorStop(0.25, theme.celestialColor + '66');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 130, my - 130, 260, 260);
    circle(ctx, mx, my, 34, theme.celestialColor);

    // nuvens
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 6; i++) {
      const period = width + 400;
      const cx = (((i * 260 + time * 8 - camX * 0.06) % period) + period) % period - 200;
      const cy = 60 + rand(i + 7) * 140;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + k * 34, cy + (k % 2) * 8, 54, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // montanhas distantes
    ctx.fillStyle = shade(theme.midColor, -28);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 30; x += 30) {
      const wx = x + camX * 0.1;
      const y = height - 230 + Math.sin(wx * 0.006) * 55 + Math.sin(wx * 0.017) * 24;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Árvores de Arcano em duas camadas de parallax
    const layers = [
      { f: 0.16, space: 360, size: 150, base: height - 60, dark: -16 },
      { f: 0.3, space: 300, size: 190, base: height - 20, dark: 6 }
    ];
    layers.forEach((L, li) => {
      const off = camX * L.f;
      const first = Math.floor(off / L.space) - 1;
      for (let i = first; i < first + Math.ceil(width / L.space) + 3; i++) {
        const x = i * L.space - off + rand(i + li * 20) * 80;
        drawArcaneTree(ctx, x, L.base, L.size * (0.85 + rand(i + 5) * 0.4), i * 11 + li * 300, {
          ...theme,
          farTreeColor: shade(theme.farTreeColor, L.dark)
        }, time);
      }
    });

    // colinas próximas
    const hill = ctx.createLinearGradient(0, height - 140, 0, height);
    hill.addColorStop(0, theme.midColor);
    hill.addColorStop(1, shade(theme.midColor, -30));
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 40; x += 40) {
      const y = height - 100 + Math.sin((x + camX * 0.45) * 0.008) * 28 + Math.cos((x + camX * 0.3) * 0.015) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.fill();

    // neblina
    const fog = ctx.createLinearGradient(0, height - 150, 0, height);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(1, theme.accentColor + '33');
    ctx.fillStyle = fog;
    ctx.fillRect(0, height - 150, width, 150);

    // partículas arcanas
    ctx.save();
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 8;
    for (let i = 0; i < 22; i++) {
      const px = (((i * 97 + time * 20 - camX * 0.5) % width) + width) % width;
      const py = ((i * 67 + Math.sin(time * 1.4 + i) * 30) % (height - 80)) + 20;
      ctx.globalAlpha = 0.3 + 0.4 * Math.sin(time * 2 + i);
      circle(ctx, px, py, 2 + (i % 3) * 0.6, theme.accentColor);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPlatform(ctx, p, theme, camX) {
    const x = p.x - camX;
    const y = p.y;
    if (x + p.w < -40 || x > 1000) return;

    if (p.type === 'bounce') {
      // cogumelo arcano elástico
      const squash = Math.sin(Date.now() / 160) * 1.2;
      rrect(ctx, x + p.w * 0.32, y + 8, p.w * 0.36, p.h, 4, '#e7e0c8', OUT, 1.5);
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x + p.w / 2, y + 7, p.w / 2 + 2, 10 + squash, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d1fae5';
      circle(ctx, x + p.w * 0.3, y + 3, 3, '#d1fae5');
      circle(ctx, x + p.w * 0.58, y, 3.5, '#d1fae5');
      circle(ctx, x + p.w * 0.78, y + 4, 2.5, '#d1fae5');
      return;
    }

    if (p.type === 'moving') {
      const g = ctx.createLinearGradient(0, y, 0, y + p.h);
      g.addColorStop(0, '#94a3b8');
      g.addColorStop(1, '#334155');
      rrect(ctx, x, y, p.w, p.h, 5, g, OUT, 1.8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + 4, y + 3, p.w - 8, 3);
      ctx.fillStyle = '#e2e8f0';
      for (let rx = x + 10; rx < x + p.w - 6; rx += 22) circle(ctx, rx, y + p.h - 6, 2, '#e2e8f0');
      return;
    }

    // corpo de terra com estratos
    const body = ctx.createLinearGradient(0, y, 0, y + Math.min(p.h, 200));
    body.addColorStop(0, shade(theme.groundColor, 14));
    body.addColorStop(1, shade(theme.groundColor, -34));
    ctx.fillStyle = body;
    ctx.fillRect(x, y, p.w, p.h);

    const seed = Math.floor((p.originX ?? p.x) * 0.37 + y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, p.w, p.h);
    ctx.clip();
    for (let i = 0; i < p.w * p.h / 900; i++) {
      const sx = x + rand(seed + i) * p.w;
      const sy = y + 12 + rand(seed + i + 500) * Math.max(1, p.h - 12);
      ctx.fillStyle = rand(seed + i + 900) > 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 5 + rand(seed + i + 3) * 6, 3 + rand(seed + i + 4) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // sombra inferior
    const sh = ctx.createLinearGradient(0, y + p.h - 40, 0, y + p.h);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = sh;
    ctx.fillRect(x, y + p.h - 40, p.w, 40);
    ctx.restore();

    // topo (grama / metal)
    const top = ctx.createLinearGradient(0, y, 0, y + 11);
    top.addColorStop(0, shade(theme.topColor, 30));
    top.addColorStop(1, theme.topColor);
    ctx.fillStyle = top;
    ctx.fillRect(x, y, p.w, 10);
    ctx.fillStyle = shade(theme.topColor, -35);
    ctx.fillRect(x, y + 9, p.w, 2);
    // tufos
    ctx.fillStyle = shade(theme.topColor, 16);
    const startI = Math.max(0, Math.floor(-x / 9));
    const endI = Math.min(Math.floor(p.w / 9), Math.ceil((1000 - x) / 9));
    for (let i = startI; i <= endI; i++) {
      const tx = x + i * 9 + rand(seed + i) * 4;
      const th = 3 + rand(seed + i + 77) * 5;
      ctx.beginPath();
      ctx.moveTo(tx, y + 1);
      ctx.lineTo(tx + 2.5, y - th);
      ctx.lineTo(tx + 5, y + 1);
      ctx.fill();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, p.w, p.h);
  }

  function drawHazard(ctx, h, camX, time) {
    const x = h.x - camX;
    if (x + h.w < -20 || x > 1000) return;
    const spikes = Math.max(2, Math.floor(h.w / 16));
    const step = h.w / spikes;

    if (h.kind === 'lava') {
      ctx.save();
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
      g.addColorStop(0, '#fde047');
      g.addColorStop(0.5, '#f97316');
      g.addColorStop(1, '#b91c1c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.h);
      for (let i = 0; i <= spikes * 3; i++) {
        const sx = x + (i * h.w) / (spikes * 3);
        ctx.lineTo(sx, h.y + 3 + Math.sin(time * 5 + i) * 3);
      }
      ctx.lineTo(x + h.w, h.y + h.h);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const bx = x + ((i * 0.37 + time * 0.4) % 1) * h.w;
        ctx.globalAlpha = 0.7;
        circle(ctx, bx, h.y - ((time * 20 + i * 8) % 14), 2, '#fde68a');
      }
      ctx.globalAlpha = 1;
      return;
    }

    for (let i = 0; i < spikes; i++) {
      const sx = x + i * step;
      const g = ctx.createLinearGradient(sx, 0, sx + step, 0);
      g.addColorStop(0, '#64748b');
      g.addColorStop(0.5, '#e2e8f0');
      g.addColorStop(1, '#475569');
      poly(ctx, [[sx, h.y + h.h], [sx + step / 2, h.y], [sx + step, h.y + h.h]], g, OUT, 1.3);
    }
  }

  function drawSphere(ctx, s, camX, time) {
    if (s.collected) return;
    const x = s.x - camX;
    const y = s.y + Math.sin(time * 4 + s.x * 0.05) * 5;
    if (x < -30 || x > 990) return;

    ctx.save();
    const halo = ctx.createRadialGradient(x, y, 2, x, y, 22);
    halo.addColorStop(0, 'rgba(125,211,252,0.55)');
    halo.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 24, y - 24, 48, 48);
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#7dd3fc');
    g.addColorStop(1, '#0369a1');
    circle(ctx, x, y, 9, g, 'rgba(255,255,255,0.6)', 1);
    ctx.restore();
    // brilho girando
    const a = time * 3 + s.x;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + Math.cos(a) * 13 - 1, y + Math.sin(a) * 13 - 1, 2.4, 2.4);
    ctx.globalAlpha = 1;
  }

  function drawGoal(ctx, goal, camX, time) {
    const x = goal.x - camX;
    const y = goal.y;
    if (x < -90 || x > 1040) return;

    ctx.save();
    // feixe de luz
    const beam = ctx.createLinearGradient(0, y - 200, 0, y + 100);
    beam.addColorStop(0, 'rgba(253,224,71,0)');
    beam.addColorStop(1, 'rgba(253,224,71,0.22)');
    ctx.fillStyle = beam;
    ctx.fillRect(x + 6, y - 200, 44, 300);

    // tronco
    const tr = ctx.createLinearGradient(x + 14, 0, x + 42, 0);
    tr.addColorStop(0, '#4a2c17');
    tr.addColorStop(0.5, '#7a4b28');
    tr.addColorStop(1, '#4a2c17');
    poly(ctx, [[x + 10, y + 100], [x + 20, y + 25], [x + 36, y + 25], [x + 46, y + 100]], tr, OUT, 1.5);

    // copa
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 24;
    [[0, 14, 30], [-20, 28, 22], [20, 28, 22], [0, 0, 24]].forEach(([dx, dy, r], i) => {
      circle(ctx, x + 28 + dx, y + 16 + dy - 8, r, shade('#15803d', i * 10), OUT, 1.5);
    });
    ctx.shadowBlur = 0;

    // núcleo de arcano + anel de runas
    const pulse = 9 + Math.sin(time * 4) * 2.5;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 20;
    circle(ctx, x + 28, y + 14, pulse, '#fde047');
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(253,224,71,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(x + 28, y + 14, 20, time, time + Math.PI * 1.7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawVignette(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  return {
    drawPortrait,
    drawPreview,
    drawBackground,
    drawPlatform,
    drawHazard,
    drawSphere,
    drawGoal,
    drawPlayer,
    drawVignette
  };
})();
