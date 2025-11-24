import { gameData } from "../core/GameData.js";
import { AudioSys } from "./AudioSys.js";
import { ParticleSys } from "./ParticleSys.js";

export const InputSys = {
  comboTimer: null,

  handleClick(x, y, forcedCrit, activeCritBuff, bonusMult, damageCallback) {
    gameData.totalClicks++;

    if (this.comboTimer) clearTimeout(this.comboTimer);
    gameData.combo++;

    let showCombo = false;
    if (gameData.combo > 5) {
      showCombo = true;
      this.comboTimer = setTimeout(() => {
        gameData.combo = 0;
        document.getElementById("comboContainer").classList.add("hidden");
      }, 1200);
    }

    let dmg = gameData.clickDamage;
    let mult = bonusMult;

    if (gameData.combo > 10) mult *= 1.5;

    let isCrit =
      Math.random() < 0.05 ||
      (activeCritBuff && Math.random() < 0.5) ||
      forcedCrit;

    if (isCrit) {
      mult *= 5;
      if (forcedCrit) mult *= 2;
      AudioSys.playCrit();
      ParticleSys.spawnFloatingText(x, y, "CRÍTICO!", "text-yellow-400", 2.0);
      ParticleSys.triggerScreenShake();
      ParticleSys.flashScreen();
    } else {
      AudioSys.playClick();
      ParticleSys.spawnFloatingText(x, y, "POW!", "text-white", 1.0);
    }

    damageCallback(dmg * mult);

    return { isCrit, showCombo };
  },
};
