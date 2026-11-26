window.Jogo = window.Jogo || {};

window.Jogo.Audio = (function () {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'triangle', gainVal = 0.14, slideTo = null) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone(300, 0.14, 'square', 0.08, 620);
    },
    doubleJump() {
      tone(440, 0.16, 'triangle', 0.11, 860);
    },
    dash() {
      tone(220, 0.18, 'sawtooth', 0.08, 520);
    },
    slash() {
      tone(520, 0.09, 'sawtooth', 0.09, 140);
    },
    shoot() {
      tone(760, 0.13, 'square', 0.09, 180);
    },
    sphere() {
      tone(660, 0.09, 'sine', 0.12, 990);
      setTimeout(() => tone(990, 0.12, 'sine', 0.1, 1320), 55);
    },
    stomp() {
      tone(200, 0.12, 'triangle', 0.14, 420);
    },
    hit() {
      tone(150, 0.18, 'sawtooth', 0.14, 55);
    },
    levelUp() {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 85);
      });
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        setTimeout(() => tone(f, 0.22, 'triangle', 0.13), i * 100);
      });
    }
  };
})();
