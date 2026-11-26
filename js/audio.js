window.Jogo = window.Jogo || {};

window.Jogo.Audio = (function () {
  let ctx = null;
  let muted = false;
  let musicEnabled = localStorage.getItem('did_music_on') !== 'false';
  let musicVol = Number(localStorage.getItem('did_music_vol') ?? 0.35);
  if (Number.isNaN(musicVol)) musicVol = 0.35;

  let musicTimer = null;
  let stepIdx = 0;
  let musicMode = 'adventure'; // adventure | boss

  // Melodia de aventura em Re menor / Fa maior (notas em Hz)
  const MELODY_ADV = [
    293.66, 349.23, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63,
    293.66, 349.23, 440.00, 523.25, 440.00, 392.00, 349.23, 0,
    349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 349.23,
    329.63, 392.00, 440.00, 329.63, 293.66, 0, 293.66, 0
  ];
  const BASS_ADV = [
    146.83, 0, 146.83, 0, 116.54, 0, 130.81, 0,
    146.83, 0, 174.61, 0, 130.81, 0, 146.83, 0,
    174.61, 0, 174.61, 0, 130.81, 0, 146.83, 0,
    164.81, 0, 130.81, 0, 146.83, 0, 110.00, 0
  ];

  // Tema mais tenso para chefes
  const MELODY_BOSS = [
    293.66, 311.13, 293.66, 440.00, 415.30, 349.23, 329.63, 293.66,
    440.00, 466.16, 440.00, 587.33, 554.37, 466.16, 440.00, 0
  ];
  const BASS_BOSS = [
    110.00, 110.00, 146.83, 110.00, 116.54, 116.54, 130.81, 110.00,
    146.83, 146.83, 164.81, 146.83, 116.54, 130.81, 110.00, 98.00
  ];

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
    if (!c || !freq) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function tickMusic() {
    if (muted || !musicEnabled || musicVol <= 0.005) return;
    const c = ensureCtx();
    if (!c || c.state !== 'running') return;

    const isBoss = musicMode === 'boss';
    const mel = isBoss ? MELODY_BOSS : MELODY_ADV;
    const bas = isBoss ? BASS_BOSS : BASS_ADV;
    const idx = stepIdx % mel.length;
    const note = mel[idx];
    const bass = bas[idx];

    const mv = musicVol * (isBoss ? 0.14 : 0.11);
    if (note) tone(note, isBoss ? 0.17 : 0.22, isBoss ? 'sawtooth' : 'triangle', mv);
    if (bass) tone(bass, 0.24, 'sine', musicVol * 0.13);

    stepIdx++;
  }

  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(tickMusic, 220);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    startMusic,
    stopMusic,
    setMusicMode(m) {
      if (musicMode !== m) {
        musicMode = m;
        stepIdx = 0;
      }
    },
    setMusicVolume(v) {
      musicVol = Math.max(0, Math.min(1, Number(v)));
      localStorage.setItem('did_music_vol', String(musicVol));
    },
    getMusicVolume() { return musicVol; },
    toggleMusic() {
      musicEnabled = !musicEnabled;
      localStorage.setItem('did_music_on', String(musicEnabled));
      return musicEnabled;
    },
    isMusicEnabled() { return musicEnabled; },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
    jump() { tone(300, 0.14, 'square', 0.08, 620); },
    doubleJump() { tone(440, 0.16, 'triangle', 0.11, 860); },
    dash() { tone(220, 0.18, 'sawtooth', 0.08, 520); },
    slash() { tone(520, 0.09, 'sawtooth', 0.09, 140); },
    shoot() { tone(760, 0.13, 'square', 0.09, 180); },
    sphere() {
      tone(660, 0.09, 'sine', 0.12, 990);
      setTimeout(() => tone(990, 0.12, 'sine', 0.1, 1320), 55);
    },
    stomp() { tone(200, 0.12, 'triangle', 0.14, 420); },
    hit() { tone(150, 0.18, 'sawtooth', 0.14, 55); },
    levelUp() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 85));
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.13), i * 100));
    }
  };
})();
