import { gameData } from "../core/GameData.js";
import { MissionSys } from "../systems/MissionSys.js";
import { SkillType } from "../core/Constants.js";

// ... (Funções auxiliares de missão permanecem iguais, focando no Renderer principal)

function createMissionElement(mission) {
  const div = document.createElement("div");
  div.id = `mission-${mission.id}`;
  div.className = "comic-box p-3 mb-2 bg-white transition-colors duration-300";
  div.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white transition-colors duration-300 mission-icon-bg">
        <i class="fas ${mission.icon}"></i>
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-start">
          <h4 class="font-bold text-sm text-gray-800 mission-title">${mission.name}</h4>
          <div class="text-xs font-bold text-purple-600 mission-reward">
            ${mission.reward.crystals} <i class="fas fa-gem"></i>
          </div>
        </div>
        <p class="text-xs text-gray-600 mt-1">${mission.description}</p>
        
        <div class="mt-2">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso</span>
            <span class="mission-progress-text">0/0</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="mission-bar bg-purple-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>

        <button 
          data-action="claim-mission" 
          data-id="${mission.id}"
          class="mission-claim-btn comic-btn bg-green-500 text-white w-full mt-2 py-1 text-xs hover:bg-green-600 hidden">
          <i class="fas fa-gift mr-1"></i> Reivindicar Recompensa
        </button>
      </div>
    </div>
  `;
  return div;
}

function updateMissionDOM(mission, progress, target) {
  let el = document.getElementById(`mission-${mission.id}`);

  if (!el) {
    el = createMissionElement(mission);
    const container = document.getElementById("missionsList");
    if (container) container.appendChild(el);
  }

  const percentage = Math.min(100, (progress / target) * 100);
  const isCompleted = percentage >= 100;

  const isCurrentlyCompleted = el.classList.contains("bg-green-50");

  if (isCompleted && !isCurrentlyCompleted) {
    el.className =
      "comic-box p-3 mb-2 bg-green-50 border-green-400 transition-colors duration-300";
    el.querySelector(".mission-icon-bg").className =
      "w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white transition-colors duration-300 mission-icon-bg";
    el.querySelector(".mission-title").className =
      "font-bold text-sm text-green-700 mission-title";
    el.querySelector(".mission-reward").className =
      "text-xs font-bold text-green-600 mission-reward";
  } else if (!isCompleted && isCurrentlyCompleted) {
    el.className = "comic-box p-3 mb-2 bg-white transition-colors duration-300";
    el.querySelector(".mission-icon-bg").className =
      "w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white transition-colors duration-300 mission-icon-bg";
    el.querySelector(".mission-title").className =
      "font-bold text-sm text-gray-800 mission-title";
    el.querySelector(".mission-reward").className =
      "text-xs font-bold text-purple-600 mission-reward";
  }

  const bar = el.querySelector(".mission-bar");
  const text = el.querySelector(".mission-progress-text");

  if (bar) bar.style.width = `${percentage}%`;
  if (text) text.innerText = `${progress}/${target}`;

  const btn = el.querySelector(".mission-claim-btn");
  if (btn) {
    if (isCompleted) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
  }
}

export const Renderer = {
  state: {
    lastScore: -1,
    lastDPS: -1,
    lastLevel: -1,
    lastHP: -1,
    lastHPText: "",
  },

  els: {},

  init() {
    // Tenta pegar os elementos. Se falhar, tenta pegar novamente durante os updates
    this.refreshElements();
  },

  refreshElements() {
    this.els = {
      score: document.getElementById("scoreDisplay"),
      dps: document.getElementById("dpsDisplay"),
      hpText: document.getElementById("hpText"),
      hpBar: document.getElementById("hpBar"),
      level: document.getElementById("levelDisplay"),
      levelSettings: document.getElementById("levelDisplaySettings"),
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
      missionsContainer: document.getElementById("missionsContainer"),
      skillBtn1: document.getElementById("skill1"),
      skillBar1: document.getElementById("cd-fury"),
      skillBtn2: document.getElementById("skill2"),
      skillBar2: document.getElementById("cd-crit"),
      skillBtn3: document.getElementById("skill3"),
      skillBar3: document.getElementById("cd-team"),
    };
  },

  formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
    return Math.floor(num);
  },

  updateStats(dps) {
    if (!this.els.score) this.refreshElements();
    if (!this.els.score) return;

    const currentScore = Math.floor(gameData.score);
    const currentDPS = Math.floor(dps);
    const currentLevel = gameData.level;

    if (currentScore !== this.state.lastScore) {
      this.els.score.innerText = this.formatNumber(currentScore);
      this.state.lastScore = currentScore;
    }

    if (currentDPS !== this.state.lastDPS) {
      this.els.dps.innerText = this.formatNumber(currentDPS);
      this.state.lastDPS = currentDPS;
    }

    if (currentLevel !== this.state.lastLevel) {
      if (this.els.level) this.els.level.innerText = currentLevel;
      if (this.els.levelSettings)
        this.els.levelSettings.innerText = currentLevel;
      this.state.lastLevel = currentLevel;
    }

    const pGain = Math.floor(gameData.totalScoreRun / 1000000);
    if (this.els.prestigeGain) this.els.prestigeGain.innerText = pGain;

    if (gameData.crystals > 0 && this.els.prestigeCount) {
      this.els.prestigeCount.classList.remove("hidden");
      this.els.prestigeCount.innerHTML = `<i class="fas fa-gem"></i> ${gameData.crystals}`;
    }
  },

  updateVillainHealth() {
    if (!this.els.hpBar) this.refreshElements();
    if (!this.els.hpBar) return;

    // Proteção contra dados inválidos
    const max = gameData.villainMaxHp || 20;
    const current = Math.max(0, gameData.villainCurrentHp);

    const pct = (current / max) * 100;

    // CORREÇÃO: Removemos a checagem de 0.5% para garantir que a barra sempre mova
    if (Math.abs(pct - this.state.lastHP) > 0.01 || pct === 0 || pct === 100) {
      this.els.hpBar.style.width = `${pct}%`;
      this.state.lastHP = pct;
    }

    const newHPText = `${this.formatNumber(
      Math.ceil(current)
    )} / ${this.formatNumber(max)}`;

    if (newHPText !== this.state.lastHPText) {
      if (this.els.hpText) this.els.hpText.innerText = newHPText;
      this.state.lastHPText = newHPText;
    }
  },

  updateBossTimer(timeLeft) {
    if (!this.els.bossTimerText) return;
    this.els.bossTimerText.innerText = Math.ceil(Math.max(0, timeLeft)) + "s";
    this.els.bossTimerBar.style.width =
      (Math.max(0, timeLeft) / 30) * 100 + "%";
  },

  toggleBossUI(isBoss) {
    if (!this.els.bossContainer) return;
    if (isBoss) this.els.bossContainer.classList.remove("hidden");
    else this.els.bossContainer.classList.add("hidden");
  },

  updateVillainSprite(v, isBoss) {
    if (!this.els.villainName) this.refreshElements();

    this.els.villainName.innerText = isBoss
      ? v
      : `Nvl ${gameData.level} ${v.name}`;

    if (this.els.villainIcon) {
      this.els.villainIcon.className = isBoss
        ? "fas fa-dragon"
        : `fas ${v.icon}`;
    }

    const newClass = isBoss
      ? "text-[9rem] md:text-[11rem] transition-transform filter drop-shadow-2xl text-red-600 relative"
      : `text-[8rem] md:text-[10rem] transition-transform filter drop-shadow-2xl ${v.color} relative`;

    if (
      this.els.villainSprite &&
      this.els.villainSprite.className !== newClass
    ) {
      this.els.villainSprite.className = newClass;
    }
  },

  showSpecialVillainIndicator(villain) {
    let indicator = document.getElementById("specialVillainIndicator");

    if (!indicator && this.els.gameZone) {
      indicator = document.createElement("div");
      indicator.id = "specialVillainIndicator";
      indicator.className =
        "absolute top-20 left-1/2 transform -translate-x-1/2 z-30";
      this.els.gameZone.appendChild(indicator);
    }

    if (indicator) {
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

  hideSpecialVillainIndicator() {
    const indicator = document.getElementById("specialVillainIndicator");
    if (indicator) {
      indicator.classList.add("hidden");
    }
  },

  animateHit() {
    if (!this.els.villainSprite) return;
    this.els.villainSprite.classList.remove("villain-hit");
    // Força reflow para reiniciar animação
    void this.els.villainSprite.offsetWidth;
    this.els.villainSprite.classList.add("villain-hit");
  },

  updateCombo(val) {
    if (!this.els.comboContainer) return;
    this.els.comboContainer.classList.remove("hidden");
    this.els.comboText.innerText = `x${val}`;
    if (val > 5) MissionSys.updateProgress("combo", val);
  },

  updateSkillCooldown(key, cooldown, max, active) {
    let btn, bar;
    if (key === SkillType.FURY) {
      btn = this.els.skillBtn1;
      bar = this.els.skillBar1;
    } else if (key === SkillType.CRIT) {
      btn = this.els.skillBtn2;
      bar = this.els.skillBar2;
    } else {
      btn = this.els.skillBtn3;
      bar = this.els.skillBar3;
    }

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
    if (!this.els.gameZone) return;
    const zone = Math.floor((level - 1) / 5);
    const environments = ["bg-city", "bg-sewer", "bg-space"];
    const newEnv = environments[zone % 3];

    if (!this.els.gameZone.classList.contains(newEnv)) {
      environments.forEach((env) => this.els.gameZone.classList.remove(env));
      this.els.gameZone.classList.add(newEnv);
    }
  },

  updateMissions() {
    if (!this.els.missionsContainer) this.refreshElements();
    if (!this.els.missionsContainer) return;

    const missions = MissionSys.currentMissions;

    if (missions.length === 0) {
      if (
        this.els.missionsContainer.innerHTML.indexOf("Novas missões") === -1
      ) {
        this.els.missionsContainer.innerHTML = `
            <div class="comic-box p-4 text-center bg-yellow-50">
              <i class="fas fa-tasks text-2xl text-gray-400 mb-2"></i>
              <p class="text-sm text-gray-600">Novas missões em breve!</p>
            </div>
          `;
      }
      return;
    }

    if (!document.getElementById("missionsList")) {
      this.els.missionsContainer.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-comic text-lg text-purple-600">Missões Diárias</h3>
          <div id="missionsCountBadge" class="text-xs bg-purple-100 px-2 py-1 rounded font-bold">
            0/0
          </div>
        </div>
        <div id="missionsList"></div>
        <div id="allMissionsReward" class="hidden"></div>
      `;
    }

    const completedCount = MissionSys.getCompletedMissionsCount();
    const countBadge = document.getElementById("missionsCountBadge");
    if (countBadge)
      countBadge.innerText = `${completedCount}/${missions.length}`;

    missions.forEach((mission) => {
      const progressData = MissionSys.getMissionProgress(mission.id);
      const progress = progressData ? progressData.progress : 0;
      const target = progressData ? progressData.target : mission.target;

      updateMissionDOM(mission, progress, target);
    });

    const rewardContainer = document.getElementById("allMissionsReward");
    if (rewardContainer) {
      if (
        MissionSys.hasCompletedAllMissions() &&
        !gameData.dailyMissions.rewardsClaimed
      ) {
        if (rewardContainer.classList.contains("hidden")) {
          rewardContainer.classList.remove("hidden");
          rewardContainer.innerHTML = `
                    <div class="comic-box p-3 bg-gradient-to-r from-yellow-400 to-orange-400 border-3 border-yellow-600 text-center mt-2">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <i class="fas fa-trophy text-yellow-800"></i>
                        <h4 class="font-comic text-lg text-yellow-800">Missão Concluída!</h4>
                        <i class="fas fa-trophy text-yellow-800"></i>
                    </div>
                    <p class="text-sm text-yellow-900 mb-2">Você completou todas as missões diárias!</p>
                    <button data-action="claim-all-missions"
                            class="comic-btn bg-yellow-600 text-white w-full py-2 text-sm hover:bg-yellow-700">
                        <i class="fas fa-gem mr-1"></i> Reivindicar Bônus +5 Cristais
                    </button>
                    </div>
                `;
        }
      } else {
        rewardContainer.classList.add("hidden");
        rewardContainer.innerHTML = "";
      }
    }
  },
};
