window.Jogo = window.Jogo || {};

window.Jogo.Game = (function () {
  const { Audio, Levels, Renderer, Entities, Characters: Chars } = window.Jogo;
  const RPG = window.Jogo.RPG;
  let mode = 'platform'; // platform | rpg
  const { rectsOverlap, Particle, FloatingText, Projectile, Enemy, Player } = Entities;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // HUD elements
  const hud = document.getElementById('hud');
  const hpFill = document.getElementById('hp-fill');
  const hpText = document.getElementById('hp-text');
  const lvBadge = document.getElementById('lv-badge');
  const expFill = document.getElementById('exp-fill');
  const expText = document.getElementById('exp-text');
  const stageTitleEl = document.getElementById('stage-title');
  const spheresText = document.getElementById('spheres-text');
  const statAtq = document.getElementById('stat-atq');
  const statDef = document.getElementById('stat-def');
  const statSpd = document.getElementById('stat-spd');

  // Screens
  const screenTitle = document.getElementById('screen-title');
  const screenStages = document.getElementById('screen-stages');
  const screenPause = document.getElementById('screen-pause');
  const screenResult = document.getElementById('screen-result');
  const stagesGrid = document.getElementById('stages-grid');

  // State
  let state = 'title'; // title | playing | paused | result
  let currentStageNum = 1;
  let unlockedStage = Number(localStorage.getItem('nicolas_unlocked') || 1);
  let totalSpheres = Number(localStorage.getItem('nicolas_spheres') || 0);
  let selectedChar = localStorage.getItem('nicolas_char') || 'nicolas';
  if (!Chars[selectedChar]) selectedChar = 'nicolas';
  let difficulty = localStorage.getItem('did_difficulty') || 'normal';
  if (!['easy', 'normal', 'hard'].includes(difficulty)) difficulty = 'normal';

  function getSaved(id) {
    return JSON.parse(localStorage.getItem('nicolas_stats_' + id) || 'null') || { ...Chars[id].stats };
  }

  let stageData = null;
  let player = null;
  let enemies = [];
  let projectiles = [];
  let particles = [];
  let popups = [];
  let camX = 0;
  let elapsedTime = 0;
  let stageSpheres = 0;
  let lastFrame = 0;

  // Input
  const keys = {};
  const justPressed = {};

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
      if (!keys[code]) justPressed[code] = true;
      keys[code] = true;

      if (code === 'Escape') {
        if (state === 'playing' || state === 'rpg') pauseGame();
        else if (state === 'paused' || state === 'rpg-paused') resumeGame();
      }
      if (code === 'KeyM') {
        toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    // Touch controls
    document.querySelectorAll('#touch-controls button').forEach((btn) => {
      const action = btn.dataset.key;
      const map = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        jump: 'Space',
        attack: 'KeyJ',
        shoot: 'KeyL',
        dash: 'ShiftLeft',
        potion: 'KeyQ'
      };
      const code = map[action];
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!keys[code]) justPressed[code] = true;
        keys[code] = true;
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[code] = false;
      });
      btn.addEventListener('touchcancel', () => {
        keys[code] = false;
      });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  function isDown(...codes) {
    return codes.some((c) => keys[c]);
  }
  function isJust(...codes) {
    return codes.some((c) => justPressed[c]);
  }

  function clearJustPressed() {
    for (const k in justPressed) delete justPressed[k];
  }

  function saveProgress() {
    localStorage.setItem('nicolas_unlocked', String(unlockedStage));
    localStorage.setItem('nicolas_spheres', String(totalSpheres));
    if (player) {
      const savedStats = {
        level: player.level,
        exp: player.exp,
        expToNext: player.expToNext,
        maxHp: player.maxHp,
        hp: player.maxHp,
        atq: player.atq,
        def: player.def,
        spd: player.spd
      };
      localStorage.setItem('nicolas_stats_' + player.charId, JSON.stringify(savedStats));
    }
  }

  function loadStage(num) {
    leaveRpg();
    currentStageNum = num;
    stageData = Levels.getStage(num);
    const sv = getSaved(selectedChar);
    player = new Player(60, 360, { ...sv, hp: sv.maxHp });
    player.charId = selectedChar;
    Renderer.drawPortrait(document.getElementById('portrait-canvas'), selectedChar);
    enemies = stageData.enemies.map((cfg) => new Enemy(cfg, difficulty));
    projectiles = [];
    particles = [];
    popups = [];
    camX = 0;
    stageSpheres = 0;
    state = 'playing';

    screenTitle.classList.add('hidden');
    screenStages.classList.add('hidden');
    screenPause.classList.add('hidden');
    screenResult.classList.add('hidden');
    hud.classList.remove('hidden');

    stageTitleEl.textContent = `Fase ${stageData.id}/${Levels.count} — ${stageData.name}`;
    updateHud();
  }

  function updateHud() {
    if (!player) return;
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    hpFill.style.width = `${hpPct}%`;
    hpText.textContent = `HP: ${player.hp} / ${player.maxHp}`;

    lvBadge.textContent = `Lv. ${player.level}`;
    const expPct = Math.max(0, Math.min(100, (player.exp / player.expToNext) * 100));
    expFill.style.width = `${expPct}%`;
    expText.textContent = `EXP: ${player.exp} / ${player.expToNext}`;

    spheresText.textContent = `Esferas: ${totalSpheres + stageSpheres}`;
    statAtq.textContent = player.atq;
    statDef.textContent = player.def;
    statSpd.textContent = player.spd;
  }

  function spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 170;
      particles.push(new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd - 60, color));
    }
  }

  function damageEnemy(enemy, dmg, knockDir) {
    let finalDmg = dmg;
    if (enemy.isBoss) {
      if (enemy.shielded) {
        finalDmg = Math.max(1, Math.round(dmg * (difficulty === 'hard' ? 0.12 : 0.35)));
        popups.push(new FloatingText(enemy.x + enemy.w / 2, enemy.y - 26, 'ESCUDO!', '#38bdf8'));
      } else if (enemy.vulnerable) {
        finalDmg = Math.round(dmg * 1.5);
        popups.push(new FloatingText(enemy.x + enemy.w / 2, enemy.y - 26, 'CRÍTICO!', '#4ade80'));
      }
    }
    enemy.hp -= finalDmg;
    enemy.hitFlash = 0.14;
    if (!enemy.isBoss && enemy.type !== 'turret') {
      enemy.x += knockDir * 12;
    }
    popups.push(new FloatingText(enemy.x + enemy.w / 2, enemy.y - 10, `-${finalDmg}`, '#fde047'));
    spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.isBoss && enemy.shielded ? '#38bdf8' : '#facc15', 7);

    if (enemy.hp <= 0) {
      enemy.dead = true;
      spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ef4444', 18);
      player.addExp(enemy.expValue, popups, Audio);
      popups.push(new FloatingText(enemy.x, enemy.y - 24, `+${enemy.expValue} EXP`, '#38bdf8'));
    }
  }

  function update(dt) {
    if (state !== 'playing') return;
    elapsedTime += dt;

    // Atualiza plataformas móveis
    for (const p of stageData.platforms) {
      if (p.type === 'moving') {
        const prevX = p.x;
        const prevY = p.y;
        if (p.moveX) p.x = p.originX + Math.sin(elapsedTime * p.speed) * p.moveX;
        if (p.moveY) p.y = p.originY + Math.sin(elapsedTime * p.speed) * p.moveY;
        p.dx = p.x - prevX;
        p.dy = p.y - prevY;
      } else {
        p.dx = 0;
        p.dy = 0;
      }
    }

    // Timers do jogador
    if (player.attackTimer > 0) player.attackTimer -= dt;
    if (player.attackCooldown > 0) player.attackCooldown -= dt;
    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.dashTimer > 0) player.dashTimer -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.coyoteTimer > 0) player.coyoteTimer -= dt;
    if (player.jumpBuffer > 0) player.jumpBuffer -= dt;

    // Movimento horizontal
    const moveSpeed = player.getMoveSpeed();
    if (player.dashTimer <= 0) {
      let dir = 0;
      if (isDown('ArrowLeft', 'KeyA')) dir -= 1;
      if (isDown('ArrowRight', 'KeyD')) dir += 1;
      player.vx = dir * moveSpeed;
      if (dir !== 0) player.facing = dir;
    }

    // Dash / Redemoinho Saci
    if (isJust('ShiftLeft', 'ShiftRight', 'KeyK') && player.dashCooldown <= 0) {
      player.dashTimer = 0.2;
      player.dashCooldown = 0.7;
      player.vx = player.facing * (moveSpeed * 2.15);
      player.vy = 0;
      Audio.dash();
      spawnBurst(player.x + player.w / 2, player.y + player.h / 2, Chars[player.charId].accent, 12);
    }

    // Pulo & Pulo Duplo
    if (isJust('Space', 'ArrowUp', 'KeyW')) {
      player.jumpBuffer = 0.12;
    }
    if (player.jumpBuffer > 0) {
      if (player.coyoteTimer > 0) {
        player.vy = -560;
        player.onGround = false;
        player.coyoteTimer = 0;
        player.jumpBuffer = 0;
        player.jumpsLeft = 1;
        Audio.jump();
        spawnBurst(player.x + player.w / 2, player.y + player.h, '#cbd5e1', 5);
      } else if (player.jumpsLeft > 0) {
        player.vy = -510;
        player.jumpsLeft = 0;
        player.jumpBuffer = 0;
        Audio.doubleJump();
        spawnBurst(player.x + player.w / 2, player.y + player.h, '#38bdf8', 8);
      }
    }

    // Ataque de Lâminas Gêmeas
    if (isJust('KeyJ', 'KeyZ') && player.attackCooldown <= 0) {
      player.attackTimer = 0.18;
      player.attackCooldown = 0.28;
      Audio.slash();

      const ch = Chars[player.charId];
      const slashBox = {
        x: player.facing > 0 ? player.x + player.w - 4 : player.x - ch.reach + 4,
        y: player.y - 4 + (ch.reachH > 0 ? 0 : 14),
        w: ch.reach,
        h: player.h + 8 - (ch.reachH > 0 ? 0 : 24)
      };
      for (const e of enemies) {
        if (!e.dead && rectsOverlap(slashBox, e)) {
          damageEnemy(e, player.atq + ch.atkBonus, player.facing);
        }
      }
    }

    // Tiro Armeiro Arcano
    if (isJust('KeyL', 'KeyX') && player.shootCooldown <= 0) {
      player.shootCooldown = 0.36;
      Audio.shoot();
      projectiles.push(
        new Projectile(
          player.x + (player.facing > 0 ? player.w : -12),
          player.y + 18,
          player.facing * Chars[player.charId].shotSpeed,
          0,
          true,
          Math.round(player.atq * Chars[player.charId].shotMult),
          Chars[player.charId].shotColor
        )
      );
      spawnBurst(player.x + (player.facing > 0 ? player.w : 0), player.y + 20, '#fde047', 4);
    }

    // Gravidade
    if (player.dashTimer <= 0) {
      player.vy = Math.min(820, player.vy + 1450 * dt);
    }

    // Colisão X
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(stageData.width - player.w, player.x));
    for (const p of stageData.platforms) {
      if (rectsOverlap(player, p)) {
        if (player.vx > 0) player.x = p.x - player.w;
        else if (player.vx < 0) player.x = p.x + p.w;
      }
    }

    // Colisão Y
    const prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    player.onGround = false;

    for (const p of stageData.platforms) {
      if (rectsOverlap(player, p)) {
        if (player.vy >= 0 && prevBottom <= p.y + 16) {
          player.y = p.y - player.h;
          if (p.type === 'bounce') {
            player.vy = -760;
            player.jumpsLeft = 1;
            Audio.doubleJump();
            spawnBurst(player.x + player.w / 2, player.y + player.h, '#4ade80', 10);
          } else {
            player.vy = 0;
            player.onGround = true;
            player.coyoteTimer = 0.1;
            player.jumpsLeft = 2;
            if (p.dx) player.x += p.dx;
          }
        } else if (player.vy < 0 && p.type !== 'bounce') {
          player.y = p.y + p.h;
          player.vy = 0;
        }
      }
    }

    // Queda no abismo
    if (player.y > 590) {
      player.hp = 0;
      Audio.hit();
      finishStage(false, 'Nícolas caiu fora das plataformas!');
      return;
    }

    // Perigos (Espinhos / Lava)
    for (const h of stageData.hazards) {
      if (rectsOverlap(player, h)) {
        player.takeDamage(18, Audio, popups);
      }
    }

    // Coleta de Esferas Mágicas
    for (const s of stageData.spheres) {
      if (!s.collected) {
        const box = { x: s.x - 12, y: s.y - 12, w: 24, h: 24 };
        if (rectsOverlap(player, box)) {
          s.collected = true;
          stageSpheres += 1;
          Audio.sphere();
          player.addExp(8, popups, Audio);
          spawnBurst(s.x, s.y, '#38bdf8', 7);
        }
      }
    }

    // Inimigos
    for (const e of enemies) {
      if (e.dead) continue;
      e.update(dt, player, projectiles, elapsedTime);

      if (rectsOverlap(player, e)) {
        // Pulo estilo Super Mario na cabeça!
        if (player.vy > 80 && player.y + player.h - player.vy * dt <= e.y + 18) {
          player.vy = -460;
          player.jumpsLeft = 1;
          Audio.stomp();
          damageEnemy(e, player.atq + 8, player.facing);
        } else {
          player.takeDamage(e.dmg, Audio, popups);
        }
      }
    }
    enemies = enemies.filter((e) => !e.dead);

    // Projéteis
    for (const pr of projectiles) {
      pr.update(dt);
      if (pr.dead) continue;

      if (pr.fromPlayer) {
        for (const e of enemies) {
          if (!e.dead && rectsOverlap(pr, e)) {
            pr.dead = true;
            damageEnemy(e, pr.dmg, pr.vx > 0 ? 1 : -1);
            break;
          }
        }
      } else {
        if (rectsOverlap(pr, player)) {
          pr.dead = true;
          player.takeDamage(pr.dmg, Audio, popups);
        }
      }
    }
    projectiles = projectiles.filter((pr) => !pr.dead);

    // Partículas e Popups
    particles.forEach((pt) => pt.update(dt));
    particles = particles.filter((pt) => pt.life > 0);
    popups.forEach((pp) => pp.update(dt));
    popups = popups.filter((pp) => pp.life > 0);

    // Câmera suave
    const targetCam = Math.max(0, Math.min(stageData.width - canvas.width, player.x - canvas.width * 0.36));
    camX += (targetCam - camX) * Math.min(1, dt * 8);

    // Verifica morte
    if (player.hp <= 0) {
      finishStage(false, 'A energia vital de Nícolas chegou a zero.');
      return;
    }

    // Verifica chegada na Árvore de Arcano (Objetivo)
    const goalBox = { x: stageData.goal.x, y: stageData.goal.y, w: 56, h: 100 };
    const bossAlive = enemies.some((e) => e.isBoss && !e.dead);
    if (rectsOverlap(player, goalBox)) {
      if (bossAlive) {
        if (Math.floor(elapsedTime * 2) % 2 === 0 && popups.length < 3) {
          popups.push(new FloatingText(stageData.goal.x - 40, stageData.goal.y - 10, 'Derrote o Guardião primeiro!', '#f87171'));
        }
      } else {
        Audio.win();
        finishStage(true);
      }
    }

    updateHud();
  }

  function finishStage(won, reason = '') {
    state = 'result';
    const titleEl = document.getElementById('result-title');
    const subEl = document.getElementById('result-subtitle');
    const statsEl = document.getElementById('result-stats');
    const nextBtn = document.getElementById('btn-next-stage');

    if (won) {
      totalSpheres += stageSpheres;
      if (currentStageNum >= unlockedStage && currentStageNum < Levels.count) {
        unlockedStage = currentStageNum + 1;
      }
      saveProgress();

      const isFinal = currentStageNum === Levels.count;
      titleEl.textContent = isFinal ? '🏆 Jornada Concluída!' : `✨ Fase ${currentStageNum} Concluída!`;
      subEl.textContent = isFinal
        ? 'Nícolas dominou todas as 10 fases e salvou o Coração da Árvore Ancestral!'
        : stageData.subtitle;
      statsEl.innerHTML = `Esferas coletadas na fase: <strong>${stageSpheres}</strong><br>Nível atual: <strong>Lv. ${player.level}</strong> (ATQ ${player.atq} | DEF ${player.def} | SPD ${player.spd})`;
      nextBtn.classList.toggle('hidden', isFinal);
    } else {
      titleEl.textContent = '💀 Nícolas Caiu!';
      subEl.textContent = reason;
      statsEl.innerHTML = `Tente novamente usar o <strong>Redemoinho (Shift)</strong> e o <strong>Pulo Duplo</strong>!`;
      nextBtn.classList.add('hidden');
    }

    screenResult.classList.remove('hidden');
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === 'rpg' && state !== 'title') {
      RPG.draw();
      return;
    }

    if (!stageData) {
      // Fundo animado leve no menu
      Renderer.drawBackground(ctx, Levels.getStage(1).theme, elapsedTime * 35, elapsedTime, canvas.width, canvas.height);
      return;
    }

    Renderer.drawBackground(ctx, stageData.theme, camX, elapsedTime, canvas.width, canvas.height);

    for (const p of stageData.platforms) {
      Renderer.drawPlatform(ctx, p, stageData.theme, camX);
    }
    for (const h of stageData.hazards) {
      Renderer.drawHazard(ctx, h, camX, elapsedTime);
    }
    for (const s of stageData.spheres) {
      Renderer.drawSphere(ctx, s, camX, elapsedTime);
    }

    Renderer.drawGoal(ctx, stageData.goal, camX, elapsedTime);

    for (const e of enemies) {
      e.draw(ctx, camX, elapsedTime);
    }

    if (player) {
      Renderer.drawPlayer(ctx, player, camX, elapsedTime);
    }

    for (const pr of projectiles) {
      pr.draw(ctx, camX);
    }
    for (const pt of particles) {
      pt.draw(ctx, camX);
    }
    for (const pp of popups) {
      pp.draw(ctx, camX);
    }
    Renderer.drawVignette(ctx, canvas.width, canvas.height);
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0.016);
    lastFrame = ts;

    const inRpg = state === 'rpg';
    document.body.classList.toggle('playing', state === 'playing' || inRpg);
    if (inRpg) RPG.update(dt);

    if (state === 'title') {
      elapsedTime += dt;
    }
    update(dt);
    draw();
    clearJustPressed();
    requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (state === 'rpg') {
      state = 'rpg-paused';
      RPG.setPaused(true);
      screenPause.classList.remove('hidden');
      return;
    }
    if (state !== 'playing') return;
    state = 'paused';
    screenPause.classList.remove('hidden');
  }

  function resumeGame() {
    if (state === 'rpg-paused') {
      state = 'rpg';
      RPG.setPaused(false);
      screenPause.classList.add('hidden');
      return;
    }
    if (state !== 'paused') return;
    state = 'playing';
    screenPause.classList.add('hidden');
  }

  function setTouchLabels(rpg) {
    const j = document.querySelector('#touch-controls [data-key="jump"]');
    if (j) j.textContent = rpg ? '✋' : '▲';
    document.getElementById('btn-restart-stage').textContent = rpg ? '↻ Recomeçar aventura' : '↻ Reiniciar Fase';
  }

  function startRpg() {
    mode = 'rpg';
    state = 'rpg';
    [screenTitle, screenStages, screenPause, screenResult, document.getElementById('screen-chars')].forEach((s) => s.classList.add('hidden'));
    hud.classList.add('hidden');
    document.body.classList.add('rpg-mode');
    setTouchLabels(true);
    RPG.start(selectedChar, false);
  }

  function restartRpg() {
    screenPause.classList.add('hidden');
    screenResult.classList.add('hidden');
    RPG.setPaused(false);
    mode = 'rpg';
    state = 'rpg';
    RPG.restart();
  }

  function leaveRpg() {
    if (mode === 'rpg') RPG.stop();
    mode = 'platform';
    document.body.classList.remove('rpg-mode');
    setTouchLabels(false);
  }

  function rpgWin() {
    state = 'result';
    document.getElementById('result-title').textContent = '🏆 Saga dos 5 Atos Concluída!';
    document.getElementById('result-subtitle').textContent = 'Continente, Torre no Mar, Triângulo das Bermudas, Lenda das Esferas e Lago de Fogo purificados!';
    document.getElementById('result-stats').innerHTML = 'O <strong>Guardião Supremo das Árvores</strong> foi derrotado.<br>A glória dos Didalmianos ecoa por todo o novo mundo!';
    document.getElementById('btn-next-stage').classList.add('hidden');
    screenResult.classList.remove('hidden');
  }

  function toggleMute() {
    const muted = Audio.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  }

  function openStagesMenu() {
    stagesGrid.innerHTML = '';
    Levels.getAllMeta().forEach((meta) => {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      const unlocked = meta.id <= unlockedStage;
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <div>
          <div class="s-num">FASE ${meta.id}</div>
          <div class="s-name">${meta.name}</div>
        </div>
        <span class="s-badge">${unlocked ? 'Liberada' : '🔒'}</span>
      `;
      btn.addEventListener('click', () => loadStage(meta.id));
      stagesGrid.appendChild(btn);
    });
    screenTitle.classList.add('hidden');
    screenStages.classList.remove('hidden');
  }

  function initUI() {
    Renderer.drawPortrait(document.getElementById('portrait-canvas'));

    const screenChars = document.getElementById('screen-chars');
    const charsGrid = document.getElementById('chars-grid');
    let pendingAction = 'play';

    function renderChars() {
      charsGrid.innerHTML = '';
      Chars.list.forEach((c) => {
        const card = document.createElement('div');
        card.className = 'char-card' + (c.id === selectedChar ? ' selected' : '');
        card.innerHTML = `
          <canvas width="220" height="240"></canvas>
          <h3>${c.name}</h3>
          <div class="c-title">${c.title} — ${c.weapon}</div>
          <div class="c-desc">${c.desc}</div>
          <div class="c-stats">HP ${c.stats.maxHp} · ATQ ${c.stats.atq} · DEF ${c.stats.def} · SPD ${c.stats.spd}</div>`;
        Renderer.drawPreview(card.querySelector('canvas'), c.id);
        card.addEventListener('click', () => {
          selectedChar = c.id;
          localStorage.setItem('nicolas_char', c.id);
          renderChars();
        });
        charsGrid.appendChild(card);
      });
    }

    function openChars(action) {
      pendingAction = action;
      renderChars();
      screenTitle.classList.add('hidden');
      screenChars.classList.remove('hidden');
    }

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      const el = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(el))
          .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
          .catch(() => {});
      }
    });
    document.getElementById('btn-play').addEventListener('click', () => openChars('play'));
    document.getElementById('btn-rpg').addEventListener('click', () => openChars('rpg'));
    document.getElementById('btn-rpg-pause').addEventListener('click', pauseGame);

    // Dificuldade (Facil / Regular / Dificil)
    const diffBtns = document.querySelectorAll('.diff-btn');
    function syncDiffUI() {
      diffBtns.forEach((b) => b.classList.toggle('active', b.dataset.diff === difficulty));
    }
    diffBtns.forEach((b) => {
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff;
        localStorage.setItem('did_difficulty', difficulty);
        syncDiffUI();
      });
    });
    syncDiffUI();

    // Musica de aventura + volume (Menu Inicial e Pausa)
    const musicBtns = [document.getElementById('btn-music-title'), document.getElementById('btn-music-pause')].filter(Boolean);
    const volSliders = [document.getElementById('slider-vol-title'), document.getElementById('slider-vol-pause')].filter(Boolean);
    function syncMusicUI() {
      const on = Audio.isMusicEnabled();
      const pct = Math.round(Audio.getMusicVolume() * 100);
      musicBtns.forEach((b) => { b.textContent = on ? '🎵 Música: Ligada' : '🔇 Música: Desligada'; });
      volSliders.forEach((s) => { s.value = String(pct); });
    }
    musicBtns.forEach((b) => {
      b.addEventListener('click', () => {
        Audio.toggleMusic();
        Audio.startMusic();
        syncMusicUI();
      });
    });
    volSliders.forEach((s) => {
      s.addEventListener('input', () => {
        Audio.setMusicVolume(Number(s.value) / 100);
        Audio.startMusic();
        syncMusicUI();
      });
    });
    syncMusicUI();
    document.getElementById('btn-select-stage').addEventListener('click', () => openChars('stages'));
    document.getElementById('btn-chars-back').addEventListener('click', () => {
      screenChars.classList.add('hidden');
      screenTitle.classList.remove('hidden');
    });
    document.getElementById('btn-chars-confirm').addEventListener('click', () => {
      screenChars.classList.add('hidden');
      if (pendingAction === 'play') loadStage(unlockedStage);
      else if (pendingAction === 'rpg') startRpg();
      else openStagesMenu();
    });
    document.getElementById('btn-back-title').addEventListener('click', () => {
      screenStages.classList.add('hidden');
      screenTitle.classList.remove('hidden');
    });

    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-mute').addEventListener('click', toggleMute);
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-restart-stage').addEventListener('click', () => (mode === 'rpg' ? restartRpg() : loadStage(currentStageNum)));
    document.getElementById('btn-quit-menu').addEventListener('click', () => {
      leaveRpg();
      state = 'title';
      screenPause.classList.add('hidden');
      hud.classList.add('hidden');
      screenTitle.classList.remove('hidden');
    });

    document.getElementById('btn-next-stage').addEventListener('click', () => loadStage(currentStageNum + 1));
    document.getElementById('btn-retry-stage').addEventListener('click', () => (mode === 'rpg' ? restartRpg() : loadStage(currentStageNum)));
    document.getElementById('btn-result-menu').addEventListener('click', () => {
      leaveRpg();
      state = 'title';
      screenResult.classList.add('hidden');
      hud.classList.add('hidden');
      screenTitle.classList.remove('hidden');
    });
  }

  function enterFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    Promise.resolve(req.call(el))
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  }

  // Navegadores so permitem tela cheia apos um gesto do usuario:
  // entra em tela cheia no primeiro clique/toque/tecla.
  function autoFullscreenOnce() {
    window.removeEventListener('pointerdown', autoFullscreenOnce, true);
    window.removeEventListener('keydown', autoFullscreenOnce, true);
    Audio.startMusic();
    enterFullscreen();
  }
  window.addEventListener('pointerdown', autoFullscreenOnce, true);
  window.addEventListener('keydown', autoFullscreenOnce, true);

  // Tecla F alterna tela cheia
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF') return;
    if (document.fullscreenElement) document.exitFullscreen();
    else enterFullscreen();
  });

  RPG.init({ ctx, isDown, isJust, Audio, Chars, onWin: rpgWin, getDifficulty: () => difficulty });
  bindInput();
  initUI();
  requestAnimationFrame(loop);

  return { loadStage };
})();
