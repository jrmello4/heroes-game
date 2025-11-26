import { gameData } from "../core/GameData.js";
import { AudioSys } from "./AudioSys.js";
import { ParticleSys } from "./ParticleSys.js";
import { MissionType } from "../core/Constants.js";
import { Renderer } from "../ui/Renderer.js";

export const InputSys = {
  comboTimer: null,
  lastClickTime: 0,

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

      // === NOVO: SISTEMA DE COMBOS DINÂMICOS ===
      const now = Date.now();
      const comboSystem = gameData.comboSystem;

      // Verificar se mantém o combo (dentro da janela de tempo)
      if (now - this.lastClickTime <= comboSystem.streakDuration * 1000) {
        // Aumentar multiplicador
        comboSystem.currentMultiplier = Math.min(
          comboSystem.maxMultiplier,
          comboSystem.currentMultiplier * comboSystem.baseMultiplier
        );

        // Atualizar maior combo alcançado
        if (comboSystem.currentMultiplier > comboSystem.highestCombo) {
          comboSystem.highestCombo = comboSystem.currentMultiplier;
        }
      } else {
        // Resetar combo se muito lento
        if (comboSystem.currentMultiplier > 1.5) {
          ParticleSys.spawnFloatingText(
            x,
            y,
            `COMBO QUEBRADO!`,
            "text-red-500 font-bold stroke-black stroke-2",
            1.2
          );
        }
        comboSystem.currentMultiplier = 1;
      }

      this.lastClickTime = now;
      comboSystem.streakTimer = comboSystem.streakDuration;

      // === FEEDBACK TÁTIL (VIBRAÇÃO) ===
      if (navigator.vibrate) {
        // Padrões de vibração diferentes baseados no contexto
        if (forcedCrit) {
          navigator.vibrate([0, 100, 50, 100]); // Padrão especial para weak points
        } else if (comboSystem.currentMultiplier > 3) {
          navigator.vibrate([0, 30, 30, 30]); // Vibração rápida para combos altos
        } else {
          navigator.vibrate(5); // Feedback sutil para clique normal
        }
      }

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

      // APLICAR MULTIPLICADOR DE COMBO AO DANO
      mult *= comboSystem.currentMultiplier;

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
        finalDamage = dmg * mult;

        await AudioSys.playCrit();

        // Efeito visual aprimorado com informação de combo
        ParticleSys.spawnFloatingText(
          x,
          y,
          `CRÍTICO! ${Renderer.formatNumber(
            finalDamage
          )}\n${comboSystem.currentMultiplier.toFixed(1)}x COMBO`,
          "text-yellow-300 stroke-black stroke-2 drop-shadow-md tracking-wider text-center",
          2.0
        );
        ParticleSys.triggerScreenShake();
        ParticleSys.flashScreen();

        // Vibração mais intensa para críticos
        if (navigator.vibrate) navigator.vibrate([0, 150, 80, 150]);
      } else {
        await AudioSys.playClick();

        // Mostrar dano + multiplicador de combo
        let comboText =
          comboSystem.currentMultiplier > 1.2
            ? `\n${comboSystem.currentMultiplier.toFixed(1)}x COMBO`
            : "";

        ParticleSys.spawnFloatingText(
          x,
          y,
          `POW! ${Renderer.formatNumber(finalDamage)}${comboText}`,
          `text-white stroke-black stroke-2 drop-shadow-md ${
            comboSystem.currentMultiplier > 1.2 ? "text-center" : ""
          }`,
          1.0
        );
      }

      // EFEITOS VISUAIS PROGRESSIVOS PARA COMBOS ALTOS
      if (comboSystem.currentMultiplier > 2.5) {
        const intensity = (comboSystem.currentMultiplier - 2.5) / 2.5;
        ParticleSys.spawnComboParticles(x, y, intensity);

        // Efeito de brilho na área de clique
        ParticleSys.createComboGlow(x, y, intensity);
      }

      damageCallback(finalDamage);

      if (result && result.showCombo)
        Renderer.updateCombo(gameData.combo, comboSystem.currentMultiplier);
      Renderer.animateHit();

      MissionSys.updateProgress(MissionType.CLICK);
      Renderer.updateVillainHealth();

      // VERIFICAR METAS DE SESSÃO
      checkSessionMilestones();

      return { isCrit, showCombo };
    } catch (error) {
      console.warn("InputSys: Erro no handleClick", error);
      return { isCrit: false, showCombo: false };
    }
  },
};

// === NOVA FUNÇÃO: VERIFICAR METAS DE SESSÃO ===
function checkSessionMilestones() {
  const milestones = gameData.sessionMilestones;
  const progress = gameData.sessionProgress;

  // Verificar metas de cliques
  milestones.clicks.forEach((threshold, index) => {
    if (gameData.totalClicks >= threshold && !progress.clicks[index]) {
      progress.clicks[index] = true;
      const reward = threshold * 2; // Recompensa baseada no threshold
      gameData.score += reward;

      ParticleSys.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2 - 100,
        `META ALCANÇADA!\n${threshold} Cliques\n+${Renderer.formatNumber(
          reward
        )} Ouro`,
        "text-green-400 text-center font-bold stroke-black stroke-2",
        1.5
      );
    }
  });

  // Verificar metas de combo
  milestones.combos.forEach((threshold, index) => {
    if (
      gameData.comboSystem.currentMultiplier >= threshold &&
      !progress.combos[index]
    ) {
      progress.combos[index] = true;
      const reward = threshold * 500;
      gameData.score += reward;

      ParticleSys.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2 - 150,
        `COMBO RECORDE!\n${threshold.toFixed(
          1
        )}x Multiplicador\n+${Renderer.formatNumber(reward)} Ouro`,
        "text-purple-400 text-center font-bold stroke-black stroke-2",
        2.0
      );
    }
  });
}
