import { gameData } from "../core/GameData.js";
import { MissionSys } from "../systems/MissionSys.js";
import { SkillType } from "../core/Constants.js";

// === FUNÇÃO AUXILIAR: CRIAR ELEMENTO DE MISSÃO ===
function createMissionElement(mission) {
  const div = document.createElement("div");
  div.id = `mission-${mission.id}`;
  div.className =
    "comic-box p-4 mb-3 bg-gradient-to-br from-white to-blue-50 border-3 border-blue-400 transition-all duration-300 hover:scale-105 hero-entrance";
  div.innerHTML = `
    <div class="flex items-start gap-4">
      <div class="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white text-lg shadow-lg mission-icon-bg transition-all duration-300">
        <i class="fas ${mission.icon}"></i>
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-bold text-base text-gray-800 mission-title tracking-wide">${mission.name}</h4>
          <div class="text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full mission-reward shadow-md">
            ${mission.reward.crystals} <i class="fas fa-gem ml-1"></i>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-3 font-medium">${mission.description}</p>
        
        <div class="mt-3">
          <div class="flex justify-between text-xs font-bold text-gray-500 mb-2 tracking-wide">
            <span>PROGRESSO</span>
            <span class="mission-progress-text">0/0</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div class="mission-bar bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-md" style="width: 0%"></div>
          </div>
        </div>

        <button 
          data-action="claim-mission" 
          data-id="${mission.id}"
          class="mission-claim-btn comic-btn bg-gradient-to-r from-green-500 to-blue-500 text-white w-full mt-3 py-2 text-sm font-bold hover:from-green-600 hover:to-blue-600 hidden transform hover:scale-105 transition-all">
          <i class="fas fa-gift mr-2"></i> RECEBER RECOMPENSA
        </button>
      </div>
    </div>
  `;
  return div;
}

// === FUNÇÃO AUXILIAR: ATUALIZAR MISSÃO NO DOM ===
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
      "comic-box p-4 mb-3 bg-gradient-to-br from-green-100 to-emerald-200 border-3 border-green-400 transition-all duration-300 hover:scale-105 hero-entrance";
    el.querySelector(".mission-icon-bg").className =
      "w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-lg shadow-lg mission-icon-bg transition-all duration-300";
    el.querySelector(".mission-title").className =
      "font-bold text-base text-green-800 mission-title tracking-wide";
    el.querySelector(".mission-reward").className =
      "text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full mission-reward shadow-md";

    const bar = el.querySelector(".mission-bar");
    if (bar) {
      bar.className =
        "mission-bar bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-md";
    }
  } else if (!isCompleted && isCurrentlyCompleted) {
    el.className =
      "comic-box p-4 mb-3 bg-gradient-to-br from-white to-blue-50 border-3 border-blue-400 transition-all duration-300 hover:scale-105 hero-entrance";
    el.querySelector(".mission-icon-bg").className =
      "w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white text-lg shadow-lg mission-icon-bg transition-all duration-300";
    el.querySelector(".mission-title").className =
      "font-bold text-base text-gray-800 mission-title tracking-wide";
    el.querySelector(".mission-reward").className =
      "text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full mission-reward shadow-md";

    const bar = el.querySelector(".mission-bar");
    if (bar) {
      bar.className =
        "mission-bar bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-md";
    }
  }

  const bar = el.querySelector(".mission-bar");
  const text = el.querySelector(".mission-progress-text");

  if (bar) bar.style.width = `${percentage}%`;
  if (text) text.innerText = `${progress}/${target}`;

  const btn = el.querySelector(".mission-claim-btn");
  if (btn) {
    if (isCompleted) {
      btn.classList.remove("hidden");
      btn.classList.add("animate-pulse");
    } else {
      btn.classList.add("hidden");
      btn.classList.remove("animate-pulse");
    }
  }
}

export const Renderer = {
  state: {
    lastScore: -1,
    lastDPS: -1,
    lastLevel: -1,
    lastHP: -1,
    lastHPText: "",
    lastColorClass: "",
    lastComboMultiplier: 0,
  },

  els: {},

  init() {
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
      crystalCount: document.getElementById("crystalCount"),
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
      comboMultiplier: document.getElementById("comboMultiplier"),
    };
  },

  formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num < 1000) return Math.floor(num).toString();

    const suffixes = ["", "K", "M", "B", "T", "Q", "S", "O", "N", "D"];
    const tier = Math.floor(Math.log10(num) / 3);

    if (tier === 0) return Math.floor(num).toString();

    const suffix = suffixes[tier] || "e" + tier * 3;
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;

    if (scaled < 10) {
      return scaled.toFixed(1) + suffix;
    } else {
      return Math.floor(scaled) + suffix;
    }
  },

  updateStats(dps) {
    if (!this.els.score) this.refreshElements();
    if (!this.els.score) return;

    const currentScore = Math.floor(gameData.score);
    const currentDPS = Math.floor(dps);
    const currentLevel = gameData.level;

    // Atualizar ouro
    if (currentScore !== this.state.lastScore) {
      this.els.score.innerText = this.formatNumber(currentScore);
      this.els.score.style.animation = "none";
      setTimeout(() => {
        this.els.score.style.animation = "pulse 0.3s ease-in-out";
      }, 10);
      this.state.lastScore = currentScore;
    }

    // Atualizar DPS
    if (currentDPS !== this.state.lastDPS) {
      this.els.dps.innerText = this.formatNumber(currentDPS);
      this.state.lastDPS = currentDPS;
    }

    // Atualizar nível
    if (currentLevel !== this.state.lastLevel) {
      if (this.els.level) this.els.level.innerText = currentLevel;
      if (this.els.levelSettings) {
        this.els.levelSettings.innerText = currentLevel;
        this.els.levelSettings.style.animation = "none";
        setTimeout(() => {
          this.els.levelSettings.style.animation = "heroEntrance 0.5s ease-out";
        }, 10);
      }
      this.state.lastLevel = currentLevel;
    }

    // Atualizar prestígio
    const pGain = Math.floor(gameData.totalScoreRun / 1000000);
    if (this.els.prestigeGain) {
      this.els.prestigeGain.innerText = this.formatNumber(pGain);
    }

    // Atualizar cristais
    if (
      gameData.crystals > 0 &&
      this.els.prestigeCount &&
      this.els.crystalCount
    ) {
      this.els.prestigeCount.classList.remove("hidden");
      this.els.crystalCount.innerText = this.formatNumber(gameData.crystals);
    }

    // Atualizar multiplicador de combo
    this.updateComboMultiplier();
  },

  updateComboMultiplier() {
    const comboSystem = gameData.comboSystem;

    // Criar elemento se não existir
    if (!this.els.comboMultiplier) {
      const comboMultEl = document.createElement("div");
      comboMultEl.id = "comboMultiplier";
      comboMultEl.className =
        "fixed top-6 left-6 z-50 comic-box bg-gradient-to-r from-purple-600 to-red-600 text-white px-4 py-2 border-3 border-yellow-400 hidden combo-glow hero-entrance";
      comboMultEl.innerHTML = `
        <div class="flex items-center gap-3">
          <i class="fas fa-bolt text-yellow-400 text-xl"></i>
          <span class="font-bold text-lg tracking-wider">COMBO: <span id="comboMultValue">1.0</span>x</span>
        </div>
      `;
      document.body.appendChild(comboMultEl);
      this.els.comboMultiplier = comboMultEl;
    }

    // Mostrar/ocultar baseado no multiplicador
    if (comboSystem.currentMultiplier > 1.1) {
      this.els.comboMultiplier.classList.remove("hidden");
      const valueEl = document.getElementById("comboMultValue");
      if (valueEl) {
        valueEl.textContent = comboSystem.currentMultiplier.toFixed(1);

        // Efeito visual progressivo baseado no multiplicador
        const intensity =
          (comboSystem.currentMultiplier - 1) / (comboSystem.maxMultiplier - 1);
        const glowIntensity = 0.3 + intensity * 0.7;

        // Atualizar cores e efeitos baseado na intensidade
        if (
          comboSystem.currentMultiplier > 3 &&
          this.state.lastComboMultiplier <= 3
        ) {
          // Efeito especial quando passa de 3x
          this.els.comboMultiplier.style.animation =
            "heroEntrance 0.5s ease-out, comboGlowEffect 1s infinite";
        }

        this.els.comboMultiplier.style.background = `linear-gradient(135deg, 
          rgba(128, 0, 128, ${0.8 + intensity * 0.2}) 0%,
          rgba(255, 0, 0, ${0.8 + intensity * 0.2}) 100%)`;

        this.els.comboMultiplier.style.boxShadow = `0 0 ${
          20 + intensity * 30
        }px rgba(255, 215, 0, ${glowIntensity})`;
        this.els.comboMultiplier.style.transform = `scale(${
          1 + intensity * 0.1
        })`;
      }
    } else {
      this.els.comboMultiplier.classList.add("hidden");
    }

    this.state.lastComboMultiplier = comboSystem.currentMultiplier;
  },

  updateVillainHealth() {
    if (!this.els.hpBar) this.refreshElements();
    if (!this.els.hpBar) return;

    const max = gameData.villainMaxHp || 20;
    const current = Math.max(0, gameData.villainCurrentHp);
    const pct = Math.max(0, (current / max) * 100);

    if (Math.abs(pct - this.state.lastHP) > 0.1 || pct === 0 || pct === 100) {
      this.els.hpBar.style.width = `${pct}%`;

      // Gradiente dinâmico baseado na vida
      let colorClass = "";
      if (pct > 75) {
        colorClass = "from-green-500 to-emerald-400";
      } else if (pct > 50) {
        colorClass = "from-yellow-400 to-amber-500";
      } else if (pct > 25) {
        colorClass = "from-orange-500 to-red-500";
      } else {
        colorClass = "from-red-600 to-red-700";

        // Piscar quando estiver com pouca vida
        if (pct > 0) {
          this.els.hpBar.style.animation = "pulse 0.5s infinite";
        }
      }

      if (this.state.lastColorClass !== colorClass) {
        this.els.hpBar.className = `health-bar h-full transition-all duration-300 ease-out ${colorClass}`;
        this.state.lastColorClass = colorClass;
      }

      this.state.lastHP = pct;
    }

    const newHPText = `${this.formatNumber(
      Math.ceil(current)
    )} / ${this.formatNumber(max)}`;
    if (newHPText !== this.state.lastHPText) {
      if (this.els.hpText) {
        this.els.hpText.innerText = newHPText;

        // Efeito de dano no texto
        if (parseInt(newHPText) < parseInt(this.state.lastHPText)) {
          this.els.hpText.style.animation = "none";
          setTimeout(() => {
            this.els.hpText.style.animation = "pulse 0.2s ease-in-out";
          }, 10);
        }
      }
      this.state.lastHPText = newHPText;
    }
  },

  updateBossTimer(timeLeft) {
    if (!this.els.bossTimerText || !this.els.bossTimerBar) return;

    const normalizedTime = Math.max(0, timeLeft) / 30;
    this.els.bossTimerText.innerText = Math.ceil(Math.max(0, timeLeft)) + "s";
    this.els.bossTimerBar.style.width = `${normalizedTime * 100}%`;

    // Mudar cor baseado no tempo restante
    if (timeLeft < 10) {
      this.els.bossTimerBar.style.background =
        "linear-gradient(90deg, #ff0000 0%, #cc0000 100%)";
      this.els.bossTimerText.style.animation = "pulse 0.5s infinite";
    } else if (timeLeft < 20) {
      this.els.bossTimerBar.style.background =
        "linear-gradient(90deg, #ff9900 0%, #ff6600 100%)";
      this.els.bossTimerText.style.animation = "none";
    } else {
      this.els.bossTimerBar.style.background =
        "linear-gradient(90deg, #00ff00 0%, #00cc00 100%)";
      this.els.bossTimerText.style.animation = "none";
    }
  },

  toggleBossUI(isBoss) {
    if (!this.els.bossContainer) return;
    if (isBoss) {
      this.els.bossContainer.classList.remove("hidden");
      this.els.bossContainer.style.animation = "heroEntrance 0.5s ease-out";
    } else {
      this.els.bossContainer.classList.add("hidden");
    }
  },

  updateVillainSprite(v, isBoss) {
    if (!this.els.villainName) this.refreshElements();

    // Atualizar nome do vilão
    const villainText = isBoss ? v.name : `Nvl ${gameData.level} ${v.name}`;
    if (this.els.villainName.innerText !== villainText) {
      this.els.villainName.innerText = villainText;
      this.els.villainName.style.animation = "none";
      setTimeout(() => {
        this.els.villainName.style.animation = "heroEntrance 0.3s ease-out";
      }, 10);
    }

    // Atualizar ícone
    if (this.els.villainIcon) {
      this.els.villainIcon.className = `fas ${v.icon}`;
    }

    // Atualizar estilo do sprite
    const newClass = isBoss
      ? `text-[11rem] md:text-[14rem] transition-all duration-500 filter drop-shadow-2xl ${
          v.color || "text-red-600"
        } relative animate-pulse`
      : `text-[10rem] md:text-[12rem] transition-all duration-300 filter drop-shadow-2xl ${v.color} relative hover:scale-105`;

    if (
      this.els.villainSprite &&
      this.els.villainSprite.className !== newClass
    ) {
      this.els.villainSprite.className = newClass;
      this.els.villainSprite.style.animation = "heroEntrance 0.5s ease-out";
    }
  },

  showSpecialVillainIndicator(villain) {
    let indicator = document.getElementById("specialVillainIndicator");
    if (!indicator && this.els.gameZone) {
      indicator = document.createElement("div");
      indicator.id = "specialVillainIndicator";
      indicator.className =
        "absolute top-24 left-1/2 transform -translate-x-1/2 z-30 special-villain-indicator";
      this.els.gameZone.appendChild(indicator);
    }
    if (indicator) {
      indicator.innerHTML = `
        <div class="comic-box bg-gradient-to-r from-purple-600 to-red-600 text-white px-6 py-3 border-3 border-yellow-400 animate-pulse">
          <div class="flex items-center gap-3">
            <i class="fas fa-star text-yellow-400 text-xl"></i>
            <span class="font-bold text-lg tracking-wider">⭐ ${villain.name} ⭐</span>
          </div>
          <div class="text-sm text-center mt-2 text-yellow-200 font-medium">${villain.effect}</div>
        </div>
      `;
      indicator.classList.remove("hidden");
      indicator.style.animation = "heroEntrance 0.5s ease-out";
    }
  },

  hideSpecialVillainIndicator() {
    const indicator = document.getElementById("specialVillainIndicator");
    if (indicator) {
      indicator.style.animation = "heroEntrance 0.3s ease-out reverse";
      setTimeout(() => {
        indicator.classList.add("hidden");
      }, 300);
    }
  },

  spawnDrone(onCatchCallback) {
    if (!this.els.gameZone) this.refreshElements();

    const drone = document.createElement("div");
    drone.className = "drone-fly";
    drone.style.top = `${15 + Math.random() * 50}%`;

    drone.innerHTML = `
      <div class="relative transform hover:scale-110 transition-transform duration-200">
        <i class="fas fa-parachute-box text-6xl text-yellow-400 drop-shadow-2xl"></i>
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce border-2 border-yellow-400">
          <i class="fas fa-gift"></i>
        </div>
      </div>
    `;

    drone.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Efeito visual ao pegar o drone
      drone.style.transform = "scale(1.3) rotate(360deg)";
      drone.style.opacity = "0";
      drone.style.transition = "all 0.3s ease-out";

      // Executar callback
      onCatchCallback(e.clientX, e.clientY);

      // Remover do DOM
      setTimeout(() => {
        if (drone.parentNode) drone.parentNode.removeChild(drone);
      }, 300);
    };

    // Remover automaticamente se sair da tela
    drone.addEventListener("animationend", () => {
      if (drone.parentNode) drone.parentNode.removeChild(drone);
    });

    this.els.gameZone.appendChild(drone);
  },

  animateHit() {
    if (!this.els.villainSprite) return;

    this.els.villainSprite.classList.remove("villain-hit");
    void this.els.villainSprite.offsetWidth; // Trigger reflow
    this.els.villainSprite.classList.add("villain-hit");

    // Efeito de partículas no clique
    this.createHitParticles();
  },

  createHitParticles() {
    const villainRect = this.els.villainSprite.getBoundingClientRect();
    const centerX = villainRect.left + villainRect.width / 2;
    const centerY = villainRect.top + villainRect.height / 2;

    // Criar partículas de impacto
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const px = centerX + Math.cos(angle) * distance;
        const py = centerY + Math.sin(angle) * distance;

        this.spawnFloatingText(px, py, "✨", "text-yellow-300 text-2xl", 0.8);
      }, i * 50);
    }
  },

  updateCombo(val, multiplier) {
    if (!this.els.comboContainer) return;

    this.els.comboContainer.classList.remove("hidden");
    this.els.comboText.innerText = `x${val}`;

    // Efeitos visuais baseados no combo
    if (val > 10) {
      this.els.comboContainer.style.animation =
        "comboPulse 0.3s infinite alternate, heroEntrance 0.5s ease-out";
    } else if (val > 5) {
      this.els.comboContainer.style.animation =
        "comboPulse 0.5s infinite alternate, heroEntrance 0.5s ease-out";
    } else {
      this.els.comboContainer.style.animation = "heroEntrance 0.5s ease-out";
    }

    // Efeito de escala baseado no multiplicador
    if (multiplier > 2) {
      const scale = 1 + (multiplier - 2) * 0.1;
      this.els.comboContainer.style.transform = `scale(${scale}) rotate(${
        (multiplier - 2) * 2
      }deg)`;
    }

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
      btn.classList.add("pulse-glow");
      btn.style.transform = "scale(1.05)";
      bar.style.height = "0";
    } else if (cooldown > 0) {
      btn.classList.remove("pulse-glow");
      btn.style.transform = "scale(1)";
      btn.disabled = true;
      const pct = (cooldown / max) * 100;
      bar.style.height = `${pct}%`;

      // Efeito visual de cooldown
      bar.style.background = `linear-gradient(to top, #666666 ${pct}%, transparent ${pct}%)`;
    } else {
      btn.classList.remove("pulse-glow");
      btn.style.transform = "scale(1)";
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
      // Transição suave entre ambientes
      this.els.gameZone.style.opacity = "0.7";

      setTimeout(() => {
        environments.forEach((env) => this.els.gameZone.classList.remove(env));
        this.els.gameZone.classList.add(newEnv);

        this.els.gameZone.style.opacity = "1";
        this.els.gameZone.style.transition = "opacity 0.5s ease-in-out";
      }, 300);

      // Feedback visual de mudança de ambiente
      this.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "🌍 AMBIENTE ATUALIZADO!",
        "text-blue-300 text-center font-bold text-xl stroke-black stroke-2",
        1.5
      );
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
          <div class="comic-box p-8 text-center bg-gradient-to-br from-yellow-100 to-orange-100 border-3 border-yellow-400 hero-entrance">
            <i class="fas fa-tasks text-5xl text-yellow-500 mb-4"></i>
            <p class="text-lg font-bold text-gray-700 tracking-wider">MISSÕES CONCLUÍDAS!</p>
            <p class="text-sm text-gray-600 mt-2">Novas missões em breve!</p>
          </div>
        `;
      }
      return;
    }

    if (!document.getElementById("missionsList")) {
      this.els.missionsContainer.innerHTML = `
        <div class="mb-6 hero-entrance">
          <div class="flex justify-between items-center mb-4">
            <h3 class="dc-title text-2xl">MISSÕES DIÁRIAS</h3>
            <div id="missionsCountBadge" class="comic-box bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 text-sm font-bold tracking-wider">
              0/${missions.length}
            </div>
          </div>
          <div id="missionsList"></div>
          <div id="allMissionsReward" class="hidden"></div>
        </div>
      `;
    }

    const completedCount = MissionSys.getCompletedMissionsCount();
    const countBadge = document.getElementById("missionsCountBadge");
    if (countBadge) {
      countBadge.innerText = `${completedCount}/${missions.length}`;

      // Efeito visual quando todas as missões são completadas
      if (completedCount === missions.length && missions.length > 0) {
        countBadge.style.animation = "pulse 1s infinite";
        countBadge.style.background =
          "linear-gradient(to right, #00ff00, #00cc00)";
      }
    }

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
            <div class="comic-box p-6 bg-gradient-to-r from-yellow-400 to-orange-400 border-3 border-yellow-600 text-center mt-4 hero-entrance animate-pulse">
              <div class="flex items-center justify-center gap-3 mb-4">
                <i class="fas fa-trophy text-yellow-800 text-2xl"></i>
                <h4 class="dc-title text-2xl text-yellow-800">MISSÃO CONCLUÍDA!</h4>
              </div>
              <p class="text-base text-yellow-900 mb-4 font-bold">Você completou todas as missões diárias!</p>
              <button data-action="claim-all-missions" class="comic-btn bg-gradient-to-r from-yellow-600 to-orange-600 text-white w-full py-3 text-lg font-bold hover:from-yellow-700 hover:to-orange-700 transform hover:scale-105 transition-all">
                <i class="fas fa-gem mr-2"></i> RECEBER BÔNUS +5 CRISTAIS
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

  // === FUNÇÃO AUXILIAR: TEXTO FLUTUANTE ===
  spawnFloatingText(x, y, text, colorClass, scale = 1.0) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      font-family: 'Bangers', cursive;
      font-weight: 900;
      font-size: ${Math.max(18, 28 * scale)}px;
      pointer-events: none;
      z-index: 100;
      white-space: nowrap;
      animation: floatUp 1s ease-out forwards;
      ${colorClass.includes("text-") ? "" : "color: " + colorClass + ";"}
      text-shadow: 2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.3);
    `;

    particle.className = colorClass;
    particle.innerText = text;

    document.body.appendChild(particle);

    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1000);
  },
};
