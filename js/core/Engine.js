export const Engine = {
  lastTime: 0,
  isRunning: false,
  updateCallback: null,
  renderCallback: null,

  init(updateCb, renderCb) {
    this.updateCallback = updateCb;
    this.renderCallback = renderCb;
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.lastTime = performance.now();
    requestAnimationFrame((time) => {
      this.lastTime = time;
      this.loop(time);
    });
  },

  stop() {
    this.isRunning = false;
  },

  loop(currentTime) {
    if (!this.isRunning) return;

    // Calcula o tempo decorrido em segundos
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // PROTEÇÃO CONTRA TRAVAMENTO:
    // Se o dt for muito grande (lag ou troca de aba), limitamos a 0.1s.
    // Isso evita que o jogo "pule" lógica ou congele variáveis.
    if (dt > 0.1) dt = 0.1;

    // Executa sempre
    if (this.updateCallback) this.updateCallback(dt);
    if (this.renderCallback) this.renderCallback();

    requestAnimationFrame((time) => this.loop(time));
  },
};
