export const ParticleSys = {
  spawnFloatingText(x, y, text, colorClass, scale = 1.0) {
    const el = document.createElement("div");
    el.innerText = text;
    el.className = `font-comic font-bold absolute pointer-events-none z-50 ${colorClass}`;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.fontSize = 24 * scale + "px";
    el.style.textShadow = "2px 2px 0 #000";
    el.style.animation = "floatUp 0.8s ease-out forwards";

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  },

  triggerScreenShake() {
    document.body.classList.remove("shake-screen");
    void document.body.offsetWidth;
    document.body.classList.add("shake-screen");
  },

  flashScreen() {
    const f = document.getElementById("critFlash");
    if (f) {
      f.classList.add("active");
      setTimeout(() => f.classList.remove("active"), 100);
    }
  },
};
