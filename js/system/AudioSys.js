export const AudioSys = {
  ctx: null,
  muted: false,
  init() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
  },
  playTone(freq, type, duration, vol = 0.1) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  playClick() {
    this.playTone(Math.random() * 100 + 300, "square", 0.1, 0.05);
  },
  playBuy() {
    this.playTone(600, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(800, "sine", 0.2, 0.1), 100);
  },
  playCrit() {
    this.playTone(150, "sawtooth", 0.3, 0.1);
    this.playTone(100, "sawtooth", 0.3, 0.1);
  },
  playLevelUp() {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => this.playTone(f, "square", 0.2, 0.1), i * 100)
    );
  },
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  },
};
