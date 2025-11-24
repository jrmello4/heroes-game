import { gameData, bosses } from "../core/GameData.js";
import { MissionSys } from "../systems/MissionSys.js";

const els = {
  score: document.getElementById("scoreDisplay"),
  dps: document.getElementById("dpsDisplay"),
  hpText: document.getElementById("hpText"),
  hpBar: document.getElementById("hpBar"),
  level: document.getElementById("levelDisplay"),
  prestigeGain: document.getElementById("prestigeGain"),
  prestigeCount: document.getElementById("prestigeCount"),
  bossTimerText: document.getElementById("bossTimerText"),
  bossTimerBar: document.getElementById("bossTimerBar"),
  bossContainer: document.getElementById("bossTimerContainer"),
  villainName: document.getElementById("villainName"),
  villainIcon: document.getElementById("villainIcon"),
  villainSprite: document.getElementById("villainSprite"),
  gameZone: document.getElementById("gameZone"),
  comboContainer: document.getElementById("comboContainer"),
  comboText: document.getElementById("comboText"),
};

// Cache de valores para evitar re-renders desnecessários
let lastScore = -1;
let lastDPS = -1;
let lastLevel = -1;
let lastHP = -1;
let lastHPText = "";

function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return Math.floor(num);
}

export const Renderer = {
  updateStats(dps) {
    const currentScore = Math.floor(gameData.score);
    const currentDPS = Math.floor(dps);
    const currentLevel = gameData.level;

    if (currentScore !== lastScore) {
      els.score.innerText = formatNumber(currentScore);
      lastScore = currentScore;
    }

    if (currentDPS !== lastDPS) {
      els.dps.innerText = formatNumber(currentDPS);
      lastDPS = currentDPS;
    }

    if (currentLevel !== lastLevel) {
      els.level.innerText = currentLevel;
      lastLevel = currentLevel;
    }

    const pGain = Math.floor(gameData.totalScoreRun / 1000000);
    els.prestigeGain.innerText = pGain;

    if (gameData.crystals > 0) {
      els.prestigeCount.classList.remove("hidden");
      els.prestigeCount.innerHTML = `<i class="fas fa-gem"></i> ${gameData.crystals}`;
    }
  },

  updateVillainHealth() {
    const pct = Math.max(
      0,
      (gameData.villainCurrentHp / gameData.villainMaxHp) * 100
    );

    if (Math.abs(pct - lastHP) > 0.5) {
      els.hpBar.style.width = `${pct}%`;
      lastHP = pct;
    }

    const newHPText = `${formatNumber(
      Math.ceil(gameData.villainCurrentHp)
    )} / ${formatNumber(gameData.villainMaxHp)}`;

    if (newHPText !== lastHPText) {
      els.hpText.innerText = newHPText;
      lastHPText = newHPText;
    }
  },

  updateBossTimer(timeLeft) {
    els.bossTimerText.innerText = Math.ceil(timeLeft) + "s";
    els.bossTimerBar.style.width = (timeLeft / 30) * 100 + "%";
  },

  toggleBossUI(isBoss) {
    if (isBoss) els.bossContainer.classList.remove("hidden");
    else els.bossContainer.classList.add("hidden");
  },

  updateVillainSprite(v, isBoss) {
    els.villainName.innerText = isBoss ? v : `Nvl ${gameData.level} ${v.name}`;
    els.villainIcon.className = isBoss ? "fas fa-dragon" : `fas ${v.icon}`;

    const newClass = isBoss
      ? "text-[9rem] md:text-[11rem] transition-transform filter drop-shadow-2xl text-red-600 relative"
      : `text-[8rem] md:text-[10rem] transition-transform filter drop-shadow-2xl ${v.color} relative`;

    if (els.villainSprite.className !== newClass) {
      els.villainSprite.className = newClass;
    }
  },

  // NOVO: Mostrar indicador de vilão especial
  showSpecialVillainIndicator(villain) {
    let indicator = document.getElementById("specialVillainIndicator");

    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "specialVillainIndicator";
      indicator.className =
        "absolute top-20 left-1/2 transform -translate-x-1/2 z-30";
      indicator.innerHTML = `
        <div class="comic-box bg-purple-600 text-white px-4 py-2 border-3 border-yellow-400 animate-pulse">
          <div class="flex items-center gap-2">
            <i class="fas fa-star text-yellow-400"></i>
            <span class="font-comic text-sm">⭐ ${villain.name} ⭐</span>
            <i class="fas fa-star text-yellow-400"></i>
          </div>
          <div class="text-xs text-center mt-1 opacity-90">${villain.effect}</div>
        </div>
      `;
      els.gameZone.appendChild(indicator);
    } else {
      indicator.innerHTML = `
        <div class="comic-box bg-purple-600 text-white px-4 py-2 border-3 border-yellow-400 animate-pulse">
          <div class="flex items-center gap-2">
            <i class="fas fa-star text-yellow-400"></i>
            <span class="font-comic text-sm">⭐ ${villain.name} ⭐</span>
            <i class="fas fa-star text-yellow-400"></i>
          </div>
          <div class="text-xs text-center mt-1 opacity-90">${villain.effect}</div>
        </div>
      `;
      indicator.classList.remove("hidden");
    }
  },

  // NOVO: Esconder indicador de vilão especial
  hideSpecialVillainIndicator() {
    const indicator = document.getElementById("specialVillainIndicator");
    if (indicator) {
      indicator.classList.add("hidden");
    }
  },

  animateHit() {
    els.villainSprite.classList.remove("villain-hit");
    requestAnimationFrame(() => {
      els.villainSprite.classList.add("villain-hit");
    });
  },

  updateCombo(val) {
    els.comboContainer.classList.remove("hidden");
    els.comboText.innerText = `x${val}`;

    // NOVO: Atualizar missão de combo
    if (val > 5) {
      MissionSys.updateProgress("combo", val);
    }
  },

  updateSkillCooldown(key, cooldown, max, active) {
    const btn = document.getElementById(
      `skill${key === "fury" ? 1 : key === "crit" ? 2 : 3}`
    );
    const bar = document.getElementById(`cd-${key}`);

    if (!btn || !bar) return;

    if (active) {
      btn.classList.add("border-yellow-400", "pulse-glow");
      bar.style.height = "0";
    } else if (cooldown > 0) {
      btn.classList.remove("border-yellow-400", "pulse-glow");
      btn.disabled = true;
      const pct = (cooldown / max) * 100;
      bar.style.height = `${pct}%`;
    } else {
      btn.classList.remove("border-yellow-400", "pulse-glow");
      btn.disabled = false;
      bar.style.height = "0";
    }
  },

  updateEnvironment(level) {
    const zone = Math.floor((level - 1) / 5);
    const environments = ["bg-city", "bg-sewer", "bg-space"];
    const newEnv = environments[zone % 3];

    if (!els.gameZone.classList.contains(newEnv)) {
      environments.forEach((env) => els.gameZone.classList.remove(env));
      els.gameZone.classList.add(newEnv);
    }
  },

  // NOVO: Sistema de Missões - Atualizar UI
  updateMissions() {
    const missionsContainer = document.getElementById("missionsContainer");
    if (!missionsContainer) return;

    const missions = MissionSys.currentMissions;

    if (missions.length === 0) {
      missionsContainer.innerHTML = `
        <div class="comic-box p-4 text-center bg-yellow-50">
          <i class="fas fa-tasks text-2xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-600">Novas missões em breve!</p>
        </div>
      `;
      return;
    }

    let missionsHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-comic text-lg text-purple-600">Missões Diárias</h3>
        <div class="text-xs bg-purple-100 px-2 py-1 rounded font-bold">
          ${MissionSys.getCompletedMissionsCount()}/${missions.length}
        </div>
      </div>
    `;

    missions.forEach((mission) => {
      const progress = MissionSys.getMissionProgress(mission.id);
      const percentage = progress
        ? (progress.progress / progress.target) * 100
        : 0;
      const isCompleted = percentage >= 100;

      missionsHTML += `
        <div class="comic-box p-3 mb-2 ${
          isCompleted ? "bg-green-50 border-green-400" : "bg-white"
        }">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 flex items-center justify-center rounded-full ${
              isCompleted ? "bg-green-500" : "bg-purple-500"
            } text-white">
              <i class="fas ${mission.icon}"></i>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <h4 class="font-bold text-sm ${
                  isCompleted ? "text-green-700" : "text-gray-800"
                }">${mission.name}</h4>
                <div class="text-xs font-bold ${
                  isCompleted ? "text-green-600" : "text-purple-600"
                }">
                  ${mission.reward.crystals} <i class="fas fa-gem"></i>
                </div>
              </div>
              <p class="text-xs text-gray-600 mt-1">${mission.description}</p>
              
              <div class="mt-2">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso</span>
                  <span>${progress ? progress.progress : 0}/${
        progress ? progress.target : 0
      }</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                       style="width: ${percentage}%"></div>
                </div>
              </div>

              ${
                isCompleted
                  ? `
                <button onclick="window.game.claimMissionReward('${mission.id}')" 
                        class="comic-btn bg-green-500 text-white w-full mt-2 py-1 text-xs hover:bg-green-600">
                  <i class="fas fa-gift mr-1"></i> Reivindicar Recompensa
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    });

    // NOVO: Recompensa por completar todas as missões
    if (
      MissionSys.hasCompletedAllMissions() &&
      !gameData.dailyMissions.rewardsClaimed
    ) {
      missionsHTML += `
        <div class="comic-box p-3 bg-gradient-to-r from-yellow-400 to-orange-400 border-3 border-yellow-600 text-center">
          <div class="flex items-center justify-center gap-2 mb-2">
            <i class="fas fa-trophy text-yellow-800"></i>
            <h4 class="font-comic text-lg text-yellow-800">Missão Concluída!</h4>
            <i class="fas fa-trophy text-yellow-800"></i>
          </div>
          <p class="text-sm text-yellow-900 mb-2">Você completou todas as missões diárias!</p>
          <button onclick="claimAllMissionRewards()" 
                  class="comic-btn bg-yellow-600 text-white w-full py-2 text-sm hover:bg-yellow-700">
            <i class="fas fa-gem mr-1"></i> Reivindicar Bônus +5 Cristais
          </button>
        </div>
      `;
    }

    missionsContainer.innerHTML = missionsHTML;
  },

  formatNumber,
};

// NOVO: Função para reivindicar todas as recompensas
function claimAllMissionRewards() {
  const missions = MissionSys.currentMissions;
  let totalCrystals = 5; // Bônus por completar todas

  missions.forEach((mission) => {
    if (MissionSys.claimReward(mission.id)) {
      totalCrystals += mission.reward.crystals;
    }
  });

  // Aplica bônus por completar todas
  gameData.crystals += 5;
  gameData.dailyMissions.rewardsClaimed = true;

  window.ErrorHandler.showSuccess(
    `🎉 Todas as missões reivindicadas! +${totalCrystals} cristais!`
  );
  Renderer.updateMissions();
}

// Expor globalmente
window.claimAllMissionRewards = claimAllMissionRewards;
