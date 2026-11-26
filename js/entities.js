window.Jogo = window.Jogo || {};

window.Jogo.Entities = (function () {
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class Particle {
    constructor(x, y, vx, vy, color, life = 0.45, size = 4) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.life = life;
      this.maxLife = life;
      this.size = size;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 260 * dt;
      this.life -= dt;
    }
    draw(ctx, camX) {
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x - camX, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  class FloatingText {
    constructor(x, y, text, color = '#fde047') {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.life = 0.85;
    }
    update(dt) {
      this.y -= 36 * dt;
      this.life -= dt;
    }
    draw(ctx, camX) {
      ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.4));
      ctx.font = 'bold 14px Segoe UI, sans-serif';
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, this.x - camX, this.y);
      ctx.fillText(this.text, this.x - camX, this.y);
      ctx.globalAlpha = 1;
    }
  }

  class Projectile {
    constructor(x, y, vx, vy, fromPlayer, dmg, color = '#38bdf8') {
      this.x = x;
      this.y = y;
      this.w = 14;
      this.h = 8;
      this.vx = vx;
      this.vy = vy;
      this.fromPlayer = fromPlayer;
      this.dmg = dmg;
      this.color = color;
      this.life = 1.6;
      this.dead = false;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
    draw(ctx, camX) {
      const px = this.x - camX;
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, this.y, this.w, this.h);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, this.y, this.w, this.h);
      ctx.restore();
    }
  }

  class Enemy {
    constructor(cfg) {
      this.type = cfg.type || 'slime';
      this.x = cfg.x;
      this.y = cfg.y;
      this.w = cfg.isBoss ? 68 : 34;
      this.h = cfg.isBoss ? 72 : 34;
      this.isBoss = !!cfg.isBoss;
      this.name = cfg.name || '';
      this.minX = cfg.minX ?? cfg.x - 90;
      this.maxX = cfg.maxX ?? cfg.x + 90;
      this.speed = cfg.speed || (this.isBoss ? 110 : 75);
      this.dir = 1;
      this.hp = cfg.hp || (this.isBoss ? 220 : 30);
      this.maxHp = this.hp;
      this.dmg = cfg.dmg || (this.isBoss ? 22 : 14);
      this.expValue = cfg.exp || (this.isBoss ? 120 : 22);
      this.shootTimer = this.isBoss ? 1.8 : (this.type === 'turret' ? 2.2 : 999);
      this.hitFlash = 0;
      this.dead = false;
      this.baseY = cfg.y;
      this.phase = Math.random() * Math.PI * 2;
    }

    update(dt, player, projectiles, time) {
      if (this.hitFlash > 0) this.hitFlash -= dt;

      if (this.type === 'flyer') {
        this.x += this.dir * this.speed * dt;
        this.y = this.baseY + Math.sin(time * 3.5 + this.phase) * 26;
        if (this.x < this.minX) this.dir = 1;
        if (this.x > this.maxX) this.dir = -1;
      } else if (this.type === 'turret') {
        this.dir = player.x < this.x ? -1 : 1;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && Math.abs(player.x - this.x) < 480) {
          this.shootTimer = 2.1;
          projectiles.push(
            new Projectile(
              this.x + (this.dir > 0 ? this.w : -14),
              this.y + 12,
              this.dir * 270,
              0,
              false,
              this.dmg,
              '#f43f5e'
            )
          );
        }
      } else {
        // Walker ou Boss
        this.x += this.dir * this.speed * dt;
        if (this.x < this.minX) this.dir = 1;
        if (this.x > this.maxX) this.dir = -1;

        if (this.isBoss) {
          this.shootTimer -= dt;
          if (this.shootTimer <= 0 && Math.abs(player.x - this.x) < 620) {
            this.shootTimer = 1.65;
            const aimDir = player.x < this.x ? -1 : 1;
            projectiles.push(
              new Projectile(this.x + this.w / 2, this.y + 24, aimDir * 300, -30, false, this.dmg, '#a855f7')
            );
            projectiles.push(
              new Projectile(this.x + this.w / 2, this.y + 38, aimDir * 280, 35, false, this.dmg, '#f43f5e')
            );
          }
        }
      }
    }

    draw(ctx, camX, time) {
      const x = this.x - camX;
      if (x + this.w < -60 || x > 1020) return;

      ctx.save();
      if (this.hitFlash > 0) {
        ctx.filter = 'brightness(2.2)';
      }

      if (this.isBoss) {
        // Guardião Corrompido (Chefe)
        ctx.fillStyle = '#4c1d95';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, this.y, this.w, this.h, 12);
        ctx.fill();
        ctx.stroke();

        // Chifres de madeira arcana
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 8, this.y - 16, 10, 18);
        ctx.fillRect(x + this.w - 18, this.y - 16, 10, 18);

        // Olhos brilhantes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + 16, this.y + 20, 12, 8);
        ctx.fillRect(x + this.w - 28, this.y + 20, 12, 8);

        // Barra de vida do Chefe
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, this.y - 26, this.w, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, this.y - 26, this.w * Math.max(0, this.hp / this.maxHp), 8);
      } else if (this.type === 'flyer') {
        // Espírito Voador
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(x + this.w / 2, this.y + this.h / 2, 16, 0, Math.PI * 2);
        ctx.fill();
        // Asas
        const flap = Math.sin(time * 16) * 8;
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(x + 6, this.y + 14);
        ctx.lineTo(x - 10, this.y + 4 + flap);
        ctx.lineTo(x + 10, this.y + 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + this.w - 6, this.y + 14);
        ctx.lineTo(x + this.w + 10, this.y + 4 + flap);
        ctx.lineTo(x + this.w - 10, this.y + 20);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 11, this.y + 12, 4, 4);
        ctx.fillRect(x + 19, this.y + 12, 4, 4);
      } else if (this.type === 'turret') {
        // Sentinela Armeiro
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, this.y, this.w, this.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(x + this.w / 2 + this.dir * 5, this.y + 14, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Guardião Menor / Slime / Pirata Constructo
        const armored = this.type === 'armored';
        const sq = Math.sin(time * 8 + this.phase) * 2;
        const gb = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
        gb.addColorStop(0, armored ? '#b45309' : '#f87171');
        gb.addColorStop(1, armored ? '#451a03' : '#7f1d1d');
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + this.w / 2, this.y + this.h, 17, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gb;
        ctx.strokeStyle = '#14100a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - sq / 2, this.y + 4 + sq, this.w + sq, this.h - 4 - sq, 11);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.ellipse(x + 10, this.y + 12 + sq, 6, 3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        if (armored) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(x + 4, this.y + 6 + sq, this.w - 8, 5);
          ctx.strokeRect(x + 4, this.y + 6 + sq, this.w - 8, 5);
        }
        const eyeOffset = this.dir > 0 ? 17 : 6;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + eyeOffset, this.y + 14 + sq, 5, 7);
        ctx.fillRect(x + eyeOffset + 8, this.y + 14 + sq, 5, 7);
        ctx.fillStyle = '#111';
        const pu = this.dir > 0 ? 2 : 0;
        ctx.fillRect(x + eyeOffset + pu, this.y + 16 + sq, 3, 4);
        ctx.fillRect(x + eyeOffset + 8 + pu, this.y + 16 + sq, 3, 4);
      }
      ctx.restore();
    }
  }

  class Player {
    constructor(x, y, stats) {
      this.x = x;
      this.y = y;
      this.w = 28;
      this.h = 46;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.jumpsLeft = 2;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;

      // Stats RPG (iguais à ficha do Nícolas!)
      this.level = stats.level || 1;
      this.exp = stats.exp || 0;
      this.expToNext = stats.expToNext || 100;
      this.maxHp = stats.maxHp || 100;
      this.hp = stats.hp || this.maxHp;
      this.atq = stats.atq || 15;
      this.def = stats.def || 10;
      this.spd = stats.spd || 12;

      // Cooldowns de combate
      this.attackTimer = 0;
      this.attackCooldown = 0;
      this.shootCooldown = 0;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.invulnTimer = 0;
    }

    getMoveSpeed() {
      return 240 + (this.spd - 12) * 10;
    }

    addExp(amount, popups, audio) {
      this.exp += amount;
      while (this.exp >= this.expToNext) {
        this.exp -= this.expToNext;
        this.level += 1;
        this.expToNext = Math.round(this.expToNext * 1.35);
        this.maxHp += 15;
        this.hp = this.maxHp;
        this.atq += 3;
        this.def += 2;
        this.spd += 1;
        audio.levelUp();
        popups.push(new FloatingText(this.x, this.y - 24, `LEVEL UP! Lv.${this.level}`, '#4ade80'));
      }
    }

    takeDamage(rawDmg, audio, popups) {
      if (this.invulnTimer > 0 || this.dashTimer > 0) return false;
      const mitigated = Math.max(4, Math.round(rawDmg - this.def * 0.4));
      this.hp = Math.max(0, this.hp - mitigated);
      this.invulnTimer = 1.0;
      this.vy = -250;
      audio.hit();
      popups.push(new FloatingText(this.x, this.y - 14, `-${mitigated}`, '#f87171'));
      return true;
    }
  }

  return {
    rectsOverlap,
    Particle,
    FloatingText,
    Projectile,
    Enemy,
    Player
  };
})();
