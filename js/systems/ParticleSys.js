export const ParticleSys = {
  spawnFloatingText(x, y, text, colorClass, scale = 1.0) {
    try {
      const particle = window.getParticleFromPool();
      if (!particle) return;

      const el = particle.element;
      el.innerText = text;
      el.className = `font-comic font-bold absolute pointer-events-none z-50 ${colorClass}`;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = 24 * scale + "px";
      el.style.textShadow = "2px 2px 0 #000";
      el.style.animation = "floatUp 0.8s ease-out forwards";
      // REMOVIDO: el.style.willChange = "transform, opacity";
      el.classList.remove("hidden");

      const cleanup = () => {
        if (particle.inUse) {
          window.returnParticleToPool(particle);
        }
      };

      setTimeout(cleanup, 800);
      el.addEventListener("animationend", cleanup, { once: true });
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
