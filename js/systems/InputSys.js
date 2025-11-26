import { gameData } from "../core/GameData.js";
import { AudioSys } from "./AudioSys.js";
import { ParticleSys } from "./ParticleSys.js";
import { MissionType } from "../core/Constants.js";
import { Renderer } from "../ui/Renderer.js"; // Importar Renderer para formatar números

export const InputSys = {
  comboTimer: null,

  async handleClick(
    x,
    y,
    forcedCrit,
    activeCritBuff,
    bonusMult,
    damageCallback
  ) {
    try {
      gameData.totalClicks++;

      if (this.comboTimer) clearTimeout(this.comboTimer);
      gameData.combo++;

      let showCombo = false;
      if (gameData.combo > 5) {
        showCombo = true;
        this.comboTimer = setTimeout(() => {
          gameData.combo = 0;
          const comboContainer = document.getElementById("comboContainer");
          if (comboContainer) {
            comboContainer.classList.add("hidden");
          }
        }, 1200);
      }

      let dmg = gameData.clickDamage;
      let mult = bonusMult;

      if (gameData.combo > 10) mult *= 1.5;

      let isCrit =
        Math.random() < 0.05 ||
        (activeCritBuff && Math.random() < 0.5) ||
        forcedCrit;

      // Calcula o dano final para exibir
      let finalDamage = dmg * mult;

      if (isCrit) {
        mult *= 5;
        if (forcedCrit) mult *= 2;
        finalDamage = dmg * mult; // Recalcula dano crítico

        await AudioSys.playCrit();

        // CORREÇÃO VISUAL: Fonte Sans, Borda Preta, Sombra
        ParticleSys.spawnFloatingText(
          x,
          y,
          `CRÍTICO! ${Renderer.formatNumber(finalDamage)}`,
          "text-yellow-300 stroke-black stroke-2 drop-shadow-md tracking-wider",
          2.0
        );
        ParticleSys.triggerScreenShake();
        ParticleSys.flashScreen();
      } else {
        await AudioSys.playClick();

        // CORREÇÃO VISUAL: Mostra "POW!" + Dano
        ParticleSys.spawnFloatingText(
          x,
          y,
          `POW! ${Renderer.formatNumber(finalDamage)}`,
          "text-white stroke-black stroke-2 drop-shadow-md",
          1.0
        );
      }

      damageCallback(finalDamage);

      return { isCrit, showCombo };
    } catch (error) {
      console.warn("InputSys: Erro no handleClick", error);
      return { isCrit: false, showCombo: false };
    }
  },
};
