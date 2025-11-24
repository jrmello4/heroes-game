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
    requestAnimationFrame((time) => this.loop(time));
  },

  stop() {
    this.isRunning = false;
  },

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (dt < 1.0) {
      if (this.updateCallback) this.updateCallback(dt);
      if (this.renderCallback) this.renderCallback();
    }

    requestAnimationFrame((time) => this.loop(time));
  },
};
