export const AudioSys = {
  ctx: null,
  muted: false,
  _initialized: false,

  async init() {
    if (this._initialized) return;

    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Tenta destravar o áudio imediatamente
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this._initialized = true;
    } catch (error) {
      console.warn("AudioSys: AudioContext não suportado", error);
      this.muted = true;
    }
  },

  async ensureAudio() {
    if (!this._initialized) {
      await this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  },

  async playTone(freq, type, duration, vol = 0.1) {
    if (this.muted) return;

    await this.ensureAudio();

    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001, // Não pode ser 0
        this.ctx.currentTime + duration
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (error) {
      console.warn("AudioSys: Erro ao tocar som", error);
    }
  },

  async playClick() {
    this.playTone(Math.random() * 100 + 300, "square", 0.1, 0.05);
  },

  async playBuy() {
    this.playTone(600, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(800, "sine", 0.2, 0.1), 100);
  },

  async playCrit() {
    this.playTone(150, "sawtooth", 0.3, 0.1);
    this.playTone(100, "sawtooth", 0.3, 0.1);
  },

  async playLevelUp() {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => this.playTone(f, "square", 0.2, 0.1), i * 100)
    );
  },

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  },
};
