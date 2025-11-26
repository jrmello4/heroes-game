export const ParticleSys = {
  pool: [],
  maxParticles: 30,
  container: null,

  init() {
    this.container = document.body;
    for (let i = 0; i < this.maxParticles; i++) {
      const el = document.createElement("div");
      el.className = "absolute pointer-events-none z-50 hidden";
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
      el.offsetHeight; /* trigger reflow */
      el.style.animation = "floatUp 0.8s ease-out forwards";

      el.innerText = text;

      el.className = `font-sans font-black absolute pointer-events-none z-50 whitespace-nowrap ${colorClass}`;

      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = Math.max(16, 24 * scale) + "px";

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

  // === NOVO: PARTÍCULAS DE COMBO ===
  spawnComboParticles(x, y, intensity) {
    const particleCount = Math.floor(5 + intensity * 10);

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 50 + intensity * 100;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;

        this.spawnFloatingText(
          px,
          py,
          "⚡",
          "text-yellow-300 text-2xl",
          0.8 + intensity * 0.5
        );
      }, i * 50);
    }
  },

  // === NOVO: EFEITO DE BRILHO PARA COMBOS ALTOS ===
  createComboGlow(x, y, intensity) {
    const glow = document.createElement("div");
    glow.style.cssText = `
      position: fixed;
      left: ${x - 100}px;
      top: ${y - 100}px;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(255,215,0,${
        intensity * 0.3
      }) 0%, transparent 70%);
      pointer-events: none;
      z-index: 25;
      border-radius: 50%;
      animation: comboGlow 0.5s ease-out forwards;
    `;

    document.body.appendChild(glow);

    setTimeout(() => {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
    }, 500);
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
      const f = document.getElementById("critFlash");
      if (f) {
        f.classList.add("active");
        setTimeout(() => {
          f.classList.remove("active");
        }, 100);
      }
    } catch (error) {
      console.warn("ParticleSys: Erro no flash", error);
    }
  },
};
