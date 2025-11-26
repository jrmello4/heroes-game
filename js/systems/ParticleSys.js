export const ParticleSys = {
  pool: [],
  maxParticles: 30,
  container: null,
  flashTimeout: null,
  lastFlashTime: 0,

  init() {
    this.container = document.body;
    this.pool = [];
    this.flashTimeout = null;
    this.lastFlashTime = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const el = document.createElement("div");
      el.className =
        "font-comic font-bold absolute pointer-events-none z-50 hidden";
      el.style.textShadow = "2px 2px 0 #000";
      this.container.appendChild(el);
      this.pool.push({ element: el, inUse: false });
    }
  },

  getParticle() {
    for (let particle of this.pool) {
      if (!particle.inUse) {
        particle.inUse = true;
        return particle;
      }
    }
    return null;
  },

  spawnFloatingText(x, y, text, colorClass, scale = 1.0) {
    if (!this.container) this.init();

    try {
      const particle = this.getParticle();
      if (!particle) return;

      const el = particle.element;

      el.style.animation = "none";
      el.offsetHeight;
      el.style.animation = "floatUp 0.8s ease-out forwards";

      el.innerText = text;
      el.className = `font-comic font-bold absolute pointer-events-none z-50 ${colorClass}`;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = 24 * scale + "px";
      el.style.textShadow = "2px 2px 0 #000";
      el.classList.remove("hidden");

      const cleanup = () => {
        if (particle.inUse) {
          particle.inUse = false;
          el.classList.add("hidden");
        }
      };

      setTimeout(cleanup, 800);
    } catch (error) {
      console.warn("ParticleSys: Erro ao criar partícula", error);
    }
  },

  triggerScreenShake() {
    try {
      document.body.classList.remove("shake-screen");
      void document.body.offsetWidth;
      document.body.classList.add("shake-screen");

      setTimeout(() => {
        document.body.classList.remove("shake-screen");
      }, 400);
    } catch (error) {
      console.warn("ParticleSys: Erro no screen shake", error);
    }
  },

  flashScreen() {
    try {
      const now = Date.now();
      if (now - this.lastFlashTime < 300) {
        return;
      }
      this.lastFlashTime = now;

      const f = document.getElementById("critFlash");
      if (f) {
        if (this.flashTimeout) {
          clearTimeout(this.flashTimeout);
        }

        f.classList.remove("active");
        void f.offsetWidth;

        f.classList.add("active");

        this.flashTimeout = setTimeout(() => {
          f.classList.remove("active");
          this.flashTimeout = null;
        }, 80);
      }
    } catch (error) {
      console.warn("ParticleSys: Erro no flash", error);
    }
  },
};
