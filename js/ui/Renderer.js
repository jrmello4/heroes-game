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
  bossTimerTextOverlay: document.getElementById("bossTimerTextOverlay"),
  bossTimerBar: document.getElementById("bossTimerBar"),
  bossContainer: document.getElementById("bossTimerContainer"),
  villainName: document.getElementById("villainName"),
  villainIcon: document.getElementById("villainIcon"),
  villainSprite: document.getElementById("villainSprite"),
  gameZone: document.getElementById("gameZone"),
  comboContainer: document.getElementById("comboContainer"),
  comboText: document.getElementById("comboText"),
  missionsContainer: document.getElementById("missionsContainer"),
  specialIndicator: document.getElementById("specialVillainIndicator"),
};

let lastScore = -1,
  lastDPS = -1,
  lastLevel = -1,
  lastHP = -1,
  lastHPText = "";

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
      if (els.level) els.level.innerText = currentLevel;
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
    const currentHp = Math.max(0, gameData.villainCurrentHp);
    const maxHp = gameData.villainMaxHp;

    // Calcula porcentagem
    const pct = (currentHp / maxHp) * 100;

    // Atualiza barra apenas se houver mudança significativa visual
    if (
      Math.abs(pct - lastHP) > 0.1 ||
      currentHp === 0 ||
      currentHp === maxHp
    ) {
      els.hpBar.style.width = `${pct}%`;
      lastHP = pct;
    }

    // Texto sempre atualiza
    const newHPText = `${formatNumber(Math.ceil(currentHp))} / ${formatNumber(
      maxHp
    )}`;
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
    if (isBoss) {
      els.bossContainer.classList.remove("hidden");
      els.bossTimerTextOverlay.classList.remove("hidden");
      els.villainName.classList.add("text-red-500", "scale-110");
    } else {
      els.bossContainer.classList.add("hidden");
      els.bossTimerTextOverlay.classList.add("hidden");
      els.villainName.classList.remove("text-red-500", "scale-110");
    }
  },

  updateVillainSprite(v, isBoss) {
    els.villainName.innerText = isBoss
      ? v.name
      : `Nvl ${gameData.level} ${v.name}`;
    els.villainIcon.className = isBoss ? "fas fa-dragon" : `fas ${v.icon}`;

    // Efeito visual no sprite
    els.villainSprite.className = isBoss
      ? "text-[9rem] md:text-[11rem] transition-transform filter drop-shadow-2xl text-red-600 relative"
      : `text-[8rem] md:text-[10rem] transition-transform filter drop-shadow-2xl ${v.color} relative`;

    // Reseta visual da barra de vida
    lastHP = -1;
    this.updateVillainHealth();
  },

  showSpecialVillainIndicator(villain) {
    let indicator = document.getElementById("specialVillainIndicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "specialVillainIndicator";
      indicator.className =
        "absolute top-32 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none";
      els.gameZone.appendChild(indicator);
    }
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
  },

  hideSpecialVillainIndicator() {
    const indicator = document.getElementById("specialVillainIndicator");
    if (indicator) indicator.classList.add("hidden");
  },

  animateHit() {
    els.villainSprite.classList.remove("villain-hit");
    requestAnimationFrame(() => els.villainSprite.classList.add("villain-hit"));
  },

  updateCombo(val) {
    els.comboContainer.classList.remove("hidden");
    els.comboText.innerText = `x${val}`;
    if (val > 5) MissionSys.updateProgress("combo", val);
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
      bar.style.height = `${(cooldown / max) * 100}%`;
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

  updateMissions() {
    if (!MissionSys.needsUpdate) return;

    const missions = MissionSys.currentMissions;
    if (missions.length === 0 && !gameData.dailyMissions.rewardsClaimed) {
      els.missionsContainer.innerHTML = `
        <div class="comic-box p-4 text-center bg-yellow-50">
          <i class="fas fa-tasks text-2xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-600">Novas missões em breve!</p>
        </div>`;
    } else if (missions.length === 0 && gameData.dailyMissions.rewardsClaimed) {
      els.missionsContainer.innerHTML = `
        <div class="comic-box p-4 text-center bg-green-50">
          <i class="fas fa-check-circle text-2xl text-green-500 mb-2"></i>
          <p class="text-sm text-gray-600">Volte amanhã!</p>
        </div>`;
    } else {
      let html = `
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-comic text-lg text-purple-600">Missões Diárias</h3>
            <div class="text-xs bg-purple-100 px-2 py-1 rounded font-bold">
              ${MissionSys.getCompletedMissionsCount()}/${missions.length}
            </div>
          </div>`;

      missions.forEach((m) => {
        const p = MissionSys.getMissionProgress(m.id);
        const pct = p ? (p.progress / p.target) * 100 : 0;
        const done = pct >= 100;

        html += `
            <div class="comic-box p-3 mb-2 ${
              done ? "bg-green-50 border-green-400" : "bg-white"
            }">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 flex items-center justify-center rounded-full ${
                  done ? "bg-green-500" : "bg-purple-500"
                } text-white">
                  <i class="fas ${m.icon}"></i>
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-start">
                    <h4 class="font-bold text-sm ${
                      done ? "text-green-700" : "text-gray-800"
                    }">${m.name}</h4>
                    <div class="text-xs font-bold ${
                      done ? "text-green-600" : "text-purple-600"
                    }">${m.reward.crystals} <i class="fas fa-gem"></i></div>
                  </div>
                  <p class="text-xs text-gray-600 mt-1">${m.description}</p>
                  <div class="mt-2">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                      <span>${p ? p.progress : 0}/${p ? p.target : 0}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-purple-500 h-2 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                    </div>
                  </div>
                  ${
                    done
                      ? `<button onclick="window.game.claimMissionReward('${m.id}')" class="comic-btn bg-green-500 text-white w-full mt-2 py-1 text-xs hover:bg-green-600"><i class="fas fa-gift mr-1"></i> Receber</button>`
                      : ""
                  }
                </div>
              </div>
            </div>`;
      });

      if (
        MissionSys.hasCompletedAllMissions() &&
        !gameData.dailyMissions.rewardsClaimed
      ) {
        html += `
            <div class="comic-box p-3 bg-gradient-to-r from-yellow-400 to-orange-400 border-3 border-yellow-600 text-center">
              <div class="flex items-center justify-center gap-2 mb-2">
                <i class="fas fa-trophy text-yellow-800"></i>
                <h4 class="font-comic text-lg text-yellow-800">Bônus Total!</h4>
              </div>
              <button onclick="window.claimAllMissionRewards()" class="comic-btn bg-yellow-600 text-white w-full py-2 text-sm hover:bg-yellow-700">
                <i class="fas fa-gem mr-1"></i> +5 Cristais
              </button>
            </div>`;
      }
      els.missionsContainer.innerHTML = html;
    }
    MissionSys.needsUpdate = false;
  },

  formatNumber,
};

window.claimAllMissionRewards = function () {
  const missions = MissionSys.currentMissions;
  let total = 5;
  missions.forEach((m) => {
    if (MissionSys.claimReward(m.id)) total += m.reward.crystals;
  });
  gameData.crystals += 5;
  gameData.dailyMissions.rewardsClaimed = true;
  window.ErrorHandler.showSuccess(`🎉 Total +${total} cristais!`);
  MissionSys.needsUpdate = true;
  Renderer.updateMissions();
};
