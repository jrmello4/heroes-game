import {
  gameData,
  villains,
  specialVillains,
  bosses,
} from "./core/GameData.js";
import { Engine } from "./core/Engine.js";
import { AudioSys } from "./systems/AudioSys.js";
import { SaveSys } from "./systems/SaveSys.js";
import { InputSys } from "./systems/InputSys.js";
import { Renderer } from "./ui/Renderer.js";
import { Shop } from "./ui/Shop.js";
import { ParticleSys } from "./systems/ParticleSys.js";
import { MissionSys } from "./systems/MissionSys.js";

// Sistema de Error Handling (mantido do código anterior)
const ErrorType = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  INFO: "INFO",
};

class ErrorHandler {
  static init() {
    window.addEventListener("error", this.handleGlobalError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.handlePromiseRejection.bind(this)
    );
    console.log("ErrorHandler: Sistema de erro inicializado");
  }

  static handleGlobalError(event) {
    const error = {
      type: ErrorType.CRITICAL,
      message: event.message,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
    };

    this.logError(error);
    this.showErrorToUser(
      "Ocorreu um erro inesperado. O jogo continuará funcionando."
    );
    event.preventDefault();
    return true;
  }

  static handlePromiseRejection(event) {
    const error = {
      type: ErrorType.WARNING,
      message: event.reason?.message || "Promise rejeitada",
      stack: event.reason?.stack,
      timestamp: Date.now(),
    };

    this.logError(error);
    event.preventDefault();
  }

  static logError(errorInfo) {
    const logEntry = {
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      gameState: this.getSafeGameState(),
    };

    this.saveToErrorLog(logEntry);
    console.error("Game Error:", logEntry);
  }

  static saveToErrorLog(logEntry) {
    try {
      const existingLogs = JSON.parse(
        localStorage.getItem("game_error_log") || "[]"
      );
      existingLogs.unshift(logEntry);
      if (existingLogs.length > 50) existingLogs.length = 50;
      localStorage.setItem("game_error_log", JSON.stringify(existingLogs));
    } catch (e) {
      console.warn("Não foi possível salvar erro no log:", e);
    }
  }

  static getSafeGameState() {
    try {
      return {
        score: window.gameData?.score || 0,
        level: window.gameData?.level || 1,
        villainsDefeated: window.gameData?.villainsDefeated || 0,
        crystals: window.gameData?.crystals || 0,
      };
    } catch (e) {
      return { error: "Não foi possível obter estado do jogo" };
    }
  }

  static showErrorToUser(message, isFatal = false) {
    let errorToast = document.getElementById("errorToast");

    if (!errorToast) {
      errorToast = document.createElement("div");
      errorToast.id = "errorToast";
      errorToast.className =
        "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-[1000] max-w-sm hidden border-3 border-black";
      errorToast.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas fa-exclamation-triangle mt-1"></i>
          <div class="flex-1">
            <p class="font-bold text-sm" id="errorToastMessage"></p>
            <p class="text-xs opacity-80 mt-1">Clique para fechar</p>
          </div>
          <button class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      document.body.appendChild(errorToast);

      errorToast.addEventListener("click", () => this.hideError());
      errorToast.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        this.hideError();
      });
    }

    const messageEl = document.getElementById("errorToastMessage");
    if (messageEl) messageEl.textContent = message;

    errorToast.classList.remove("hidden");
    if (!isFatal) setTimeout(() => this.hideError(), 8000);
  }

  static hideError() {
    const errorToast = document.getElementById("errorToast");
    if (errorToast) errorToast.classList.add("hidden");
  }

  static showSuccess(message) {
    let successToast = document.getElementById("successToast");

    if (!successToast) {
      successToast = document.createElement("div");
      successToast.id = "successToast";
      successToast.className =
        "fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-[1000] max-w-sm hidden border-3 border-black";
      successToast.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas fa-check-circle mt-1"></i>
          <div class="flex-1">
            <p class="font-bold text-sm" id="successToastMessage"></p>
          </div>
          <button class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      document.body.appendChild(successToast);

      successToast.addEventListener("click", () => this.hideSuccess());
      successToast.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        this.hideSuccess();
      });
    }

    const messageEl = document.getElementById("successToastMessage");
    if (messageEl) messageEl.textContent = message;

    successToast.classList.remove("hidden");
    setTimeout(() => this.hideSuccess(), 4000);
  }

  static hideSuccess() {
    const successToast = document.getElementById("successToast");
    if (successToast) successToast.classList.add("hidden");
  }

  static safeExecute(fn, fallbackValue = null, context = null) {
    return function (...args) {
      try {
        return fn.apply(context, args);
      } catch (error) {
        this.logError({
          type: ErrorType.WARNING,
          message: `Erro em ${fn.name || "função anônima"}: ${error.message}`,
          stack: error.stack,
          timestamp: Date.now(),
        });
        return fallbackValue;
      }
    }.bind(this);
  }

  static async safeExecuteAsync(fn, fallbackValue = null, context = null) {
    try {
      return await fn.apply(context);
    } catch (error) {
      this.logError({
        type: ErrorType.WARNING,
        message: `Erro assíncrono em ${fn.name || "função anônima"}: ${
          error.message
        }`,
        stack: error.stack,
        timestamp: Date.now(),
      });
      return fallbackValue;
    }
  }
}

// Variáveis do jogo
let isBoss = false;
let bossTimeLeft = 0;
let activeCritBuff = false;
let currentVillain = null; // NOVO: Para controlar vilão especial

// Sistema de Performance
let lastRenderTime = 0;
let lastSaveTime = 0;
let lastWeakPointTime = 0;
let lastAchievementCheckTime = 0;
let lastSpecialVillainCheck = 0;
const RENDER_INTERVAL = 1000 / 30;
const SAVE_INTERVAL = 30000;
const WEAK_POINT_INTERVAL = 4000;
const ACHIEVEMENT_CHECK_INTERVAL = 2000;
const SPECIAL_VILLAIN_CHECK = 5000; // NOVO: Verificar vilão especial a cada 5s

// Object Pools
const particlePool = [];
const weakPointPool = [];

// Expor pools globalmente
window.getParticleFromPool = getParticleFromPool;
window.returnParticleToPool = returnParticleToPool;
window.ErrorHandler = ErrorHandler;

function init() {
  ErrorHandler.init();

  try {
    AudioSys.init().catch((error) => {
      ErrorHandler.logError({
        type: ErrorType.WARNING,
        message: "Áudio não inicializado",
        stack: error.stack,
        timestamp: Date.now(),
      });
    });
  } catch (e) {
    ErrorHandler.logError({
      type: ErrorType.WARNING,
      message: "Falha na inicialização do áudio",
      stack: e.stack,
      timestamp: Date.now(),
    });
  }

  const loadSuccess = ErrorHandler.safeExecute(SaveSys.load, false)();
  if (!loadSuccess) {
    ErrorHandler.showErrorToUser(
      "Dados de save corrompidos. Iniciando novo jogo."
    );
    ErrorHandler.safeExecute(SaveSys.reset)();
  }

  // NOVO: Inicializar sistema de missões
  MissionSys.init();

  ErrorHandler.safeExecute(() => {
    const offlineData = SaveSys.checkOfflineProgress(calculateDPS);
    if (offlineData) {
      document.getElementById("offlineTime").innerText = offlineData.time;
      document.getElementById("offlineGold").innerText = Renderer.formatNumber(
        offlineData.gold
      );
      document.getElementById("offlineModal").classList.remove("hidden");
      document.getElementById("offlineModal").style.display = "flex";
    }
  })();

  initializePools();

  Engine.init(
    ErrorHandler.safeExecute(update, null, this),
    ErrorHandler.safeExecute(render, null, this)
  );
  Engine.start();

  setupEvents();

  render();
  spawnVillain(false);
  Renderer.updateEnvironment(gameData.level);
  Shop.render();

  // NOVO: Renderizar missões
  Renderer.updateMissions();

  ErrorHandler.showSuccess("Jogo carregado com sucesso!");
}

function initializePools() {
  for (let i = 0; i < 20; i++) {
    const el = document.createElement("div");
    el.className =
      "font-comic font-bold absolute pointer-events-none z-50 hidden";
    el.style.textShadow = "2px 2px 0 #000";
    el.style.animation = "floatUp 0.8s ease-out forwards";
    document.body.appendChild(el);
    particlePool.push({ element: el, inUse: false });
  }

  for (let i = 0; i < 5; i++) {
    const el = document.createElement("div");
    el.className = "weak-point hidden";
    weakPointPool.push({ element: el, inUse: false });
  }
}

function getParticleFromPool() {
  for (let particle of particlePool) {
    if (!particle.inUse) {
      particle.inUse = true;
      return particle;
    }
  }
  const el = document.createElement("div");
  el.className = "font-comic font-bold absolute pointer-events-none z-50";
  el.style.textShadow = "2px 2px 0 #000";
  el.style.animation = "floatUp 0.8s ease-out forwards";
  document.body.appendChild(el);
  const newParticle = { element: el, inUse: true };
  particlePool.push(newParticle);
  return newParticle;
}

function returnParticleToPool(particle) {
  particle.inUse = false;
  particle.element.classList.add("hidden");
}

function getWeakPointFromPool() {
  for (let weakPoint of weakPointPool) {
    if (!weakPoint.inUse) {
      weakPoint.inUse = true;
      return weakPoint;
    }
  }
  return null;
}

function returnWeakPointToPool(weakPoint) {
  weakPoint.inUse = false;
  weakPoint.element.classList.add("hidden");
  if (weakPoint.element.parentNode) {
    weakPoint.element.parentNode.removeChild(weakPoint.element);
  }
}

function update(dt) {
  const currentTime = Date.now();

  const currentDps = ErrorHandler.safeExecute(calculateDPS, 0)();
  if (currentDps > 0) {
    ErrorHandler.safeExecute(damageVillain)(currentDps * dt);
  }

  // NOVO: Atualizar vilões especiais
  if (
    currentTime - lastSpecialVillainCheck > SPECIAL_VILLAIN_CHECK &&
    !isBoss &&
    !currentVillain?.special
  ) {
    checkSpecialVillain();
    lastSpecialVillainCheck = currentTime;
  }

  // NOVO: Aplicar efeitos de vilões especiais
  if (currentVillain?.special) {
    applySpecialVillainEffects(dt);
  }

  for (let k in gameData.skills) {
    let s = gameData.skills[k];
    if (s.cooldown > 0) s.cooldown -= dt;
    if (s.active) {
      s.duration -= dt;
      if (s.duration <= 0) {
        s.active = false;
        if (k === "crit") activeCritBuff = false;
      }
    }
  }

  if (currentTime - lastSaveTime > SAVE_INTERVAL) {
    ErrorHandler.safeExecute(SaveSys.save)();
    lastSaveTime = currentTime;
  }

  if (
    currentTime - lastWeakPointTime > WEAK_POINT_INTERVAL &&
    !isBoss &&
    Math.random() > 0.7
  ) {
    ErrorHandler.safeExecute(spawnWeakPoint)();
    lastWeakPointTime = currentTime;
  }

  if (currentTime - lastAchievementCheckTime > ACHIEVEMENT_CHECK_INTERVAL) {
    ErrorHandler.safeExecute(checkAchievements)();
    lastAchievementCheckTime = currentTime;
  }

  if (isBoss) {
    bossTimeLeft -= dt;
    if (bossTimeLeft <= 0) {
      ErrorHandler.safeExecute(failBoss)();
    }
  }
}

// NOVO: Verificar se deve spawnar vilão especial
function checkSpecialVillain() {
  if (Math.random() < 0.15) {
    // 15% de chance a cada verificação
    const specialVillain =
      specialVillains[Math.floor(Math.random() * specialVillains.length)];
    spawnSpecialVillain(specialVillain);
  }
}

// NOVO: Spawnar vilão especial
function spawnSpecialVillain(specialVillain) {
  currentVillain = {
    ...specialVillain,
    special: true,
    baseHP: gameData.villainMaxHp,
  };

  // Ajustar HP baseado no tipo
  if (specialVillain.type === "tank") {
    gameData.villainMaxHp = Math.floor(gameData.villainMaxHp * 1.5);
  }

  gameData.villainCurrentHp = gameData.villainMaxHp;

  Renderer.updateVillainSprite(specialVillain, false);
  Renderer.showSpecialVillainIndicator(specialVillain);

  ErrorHandler.showSuccess(
    `⭐ ${specialVillain.name} apareceu! ${specialVillain.effect}`
  );
}

// NOVO: Aplicar efeitos de vilões especiais
function applySpecialVillainEffects(dt) {
  if (!currentVillain) return;

  switch (currentVillain.type) {
    case "elusive":
      // Chance de escapar do dano é aplicada no damageVillain
      break;

    case "healer":
      // Regenera 1% de vida a cada 2 segundos
      gameData.villainCurrentHp += gameData.villainMaxHp * 0.01 * (dt / 2);
      gameData.villainCurrentHp = Math.min(
        gameData.villainCurrentHp,
        gameData.villainMaxHp
      );
      break;

    case "tank":
      // Já tem HP bonus, nenhum efeito adicional
      break;
  }
}

function render() {
  const currentTime = Date.now();

  if (currentTime - lastRenderTime < RENDER_INTERVAL) return;
  lastRenderTime = currentTime;

  ErrorHandler.safeExecute(() => {
    Renderer.updateStats(calculateDPS());
    Renderer.updateVillainHealth();

    if (isBoss) Renderer.updateBossTimer(bossTimeLeft);

    for (let k in gameData.skills) {
      Renderer.updateSkillCooldown(
        k,
        gameData.skills[k].cooldown,
        gameData.skills[k].maxCooldown,
        gameData.skills[k].active
      );
    }

    // NOVO: Atualizar UI de missões
    Renderer.updateMissions();
  })();
}

function calculateDPS() {
  try {
    let dps = gameData.autoDamage;
    let mult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
    if (gameData.artifacts.cape.owned) mult += 0.2;
    if (gameData.skills.fury.active) mult *= 2;
    if (gameData.skills.team.active) mult *= 2;
    return dps * mult;
  } catch (error) {
    console.warn("Erro no calculateDPS:", error);
    return gameData.autoDamage;
  }
}

function getAchievementBonus() {
  if (!gameData.achievements) return 0;
  try {
    return Object.values(gameData.achievements).reduce(
      (acc, a) => (a.done ? acc + a.reward : acc),
      0
    );
  } catch (error) {
    return 0;
  }
}

async function handleInput(x, y, forcedCrit = false) {
  return await ErrorHandler.safeExecuteAsync(
    async () => {
      await AudioSys.ensureAudio();

      let bonusMult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
      if (gameData.artifacts.ring.owned) bonusMult += 0.2;
      if (gameData.skills.team.active) bonusMult *= 2;

      const result = await InputSys.handleClick(
        x,
        y,
        forcedCrit,
        activeCritBuff,
        bonusMult,
        damageVillain
      );

      if (result && result.showCombo) Renderer.updateCombo(gameData.combo);
      Renderer.animateHit();

      // NOVO: Atualizar missão de cliques
      MissionSys.updateProgress("click");

      return result;
    },
    { isCrit: false, showCombo: false }
  )();
}

function damageVillain(amt) {
  try {
    // NOVO: Verificar efeito de vilão esquivo
    if (currentVillain?.type === "elusive" && Math.random() < 0.3) {
      ParticleSys.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "ESQUIVOU!",
        "text-purple-400",
        1.5
      );
      return; // Vilão escapou do dano
    }

    gameData.villainCurrentHp -= amt;
    if (gameData.villainCurrentHp <= 0) defeatVillain();
  } catch (error) {
    console.warn("Erro no damageVillain:", error);
  }
}

function defeatVillain() {
  try {
    gameData.villainsDefeated++;

    let reward = Math.floor(gameData.villainMaxHp / 2.5);
    if (gameData.artifacts.amulet.owned) reward *= 1.1;

    // NOVO: Bônus para vilões especiais
    if (currentVillain?.special) {
      reward *= 2;
      ErrorHandler.showSuccess(
        `⭐ Vilão especial derrotado! Recompensa dobrada!`
      );
    }

    if (isBoss) {
      reward *= 10;
      // NOVO: Atualizar missão de chefes
      MissionSys.updateProgress("boss_kill");
    }

    gameData.score += reward;
    gameData.totalScoreRun += reward;

    // NOVO: Atualizar missão de kills
    MissionSys.updateProgress("kill");

    if (Math.random() < 0.02) {
      const available = Object.keys(gameData.artifacts).filter(
        (k) => !gameData.artifacts[k].owned
      );
      if (available.length > 0) {
        const key = available[Math.floor(Math.random() * available.length)];
        gameData.artifacts[key].owned = true;
        Shop.render();
      }
    }

    if (isBoss) {
      AudioSys.playLevelUp();
      gameData.level++;
      isBoss = false;
      Renderer.toggleBossUI(false);
      Renderer.updateEnvironment(gameData.level);
    } else if (gameData.villainsDefeated % 10 === 0) {
      startBossFight();
      return;
    }

    // NOVO: Resetar vilão especial
    currentVillain = null;

    spawnVillain();
    Shop.render();
  } catch (error) {
    console.warn("Erro no defeatVillain:", error);
  }
}

function startBossFight() {
  try {
    isBoss = true;
    Renderer.toggleBossUI(true);
    bossTimeLeft = 30;

    const bossIdx = Math.floor((gameData.level / 5) % bosses.length);
    gameData.villainMaxHp *= 8;
    gameData.villainCurrentHp = gameData.villainMaxHp;

    Renderer.updateVillainSprite(bosses[bossIdx], true);
  } catch (error) {
    console.warn("Erro no startBossFight:", error);
  }
}

function failBoss() {
  try {
    isBoss = false;
    Renderer.toggleBossUI(false);
    spawnVillain();
  } catch (error) {
    console.warn("Erro no failBoss:", error);
  }
}

function spawnVillain() {
  try {
    if (isBoss) return;

    // NOVO: Restaurar HP normal se era vilão especial
    if (currentVillain?.special && currentVillain.baseHP) {
      gameData.villainMaxHp = currentVillain.baseHP;
    }

    const growth = 1.4;
    gameData.villainMaxHp = Math.floor(
      20 * Math.pow(growth, gameData.level - 1)
    );
    gameData.villainCurrentHp = gameData.villainMaxHp;

    const v = villains[(gameData.level - 1) % villains.length];
    currentVillain = v; // NOVO: Atualizar vilão atual

    Renderer.updateVillainSprite(v, false);
    Renderer.hideSpecialVillainIndicator(); // NOVO: Esconder indicador especial
  } catch (error) {
    console.warn("Erro no spawnVillain:", error);
  }
}

function spawnWeakPoint() {
  try {
    const clickZone = document.getElementById("clickZone");
    if (!clickZone) return;

    const weakPoint = getWeakPointFromPool();
    if (!weakPoint) return;

    const rect = clickZone.getBoundingClientRect();
    const el = weakPoint.element;

    el.className = "weak-point";
    el.style.left = Math.random() * (rect.width - 60) + "px";
    el.style.top = Math.random() * (rect.height - 60) + "px";
    el.classList.remove("hidden");

    el.onpointerdown = null;

    el.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleInput(e.clientX, e.clientY, true);
      returnWeakPointToPool(weakPoint);
    };

    clickZone.appendChild(el);

    setTimeout(() => {
      if (weakPoint.inUse) returnWeakPointToPool(weakPoint);
    }, 2500);
  } catch (error) {
    console.warn("Erro no spawnWeakPoint:", error);
  }
}

function checkAchievements() {
  try {
    if (!gameData.achievements) return;
    for (let k in gameData.achievements) {
      const a = gameData.achievements[k];
      if (!a.done) {
        if (a.type === "kills" && gameData.villainsDefeated >= a.req)
          a.done = true;
        if (a.type === "clicks" && gameData.totalClicks >= a.req) a.done = true;
        if (a.type === "level" && gameData.level >= a.req) a.done = true;
      }
    }
  } catch (error) {
    console.warn("Erro no checkAchievements:", error);
  }
}

function buy(type, key) {
  try {
    const item =
      type === "hero" ? gameData.heroes[key] : gameData.upgrades[key];
    let cost = Math.floor(item.baseCost * Math.pow(1.2, item.count));

    if (gameData.score >= cost) {
      AudioSys.playBuy();
      gameData.score -= cost;
      item.count++;

      if (type === "hero") gameData.autoDamage += item.dps;
      else gameData.clickDamage += item.boost;

      Shop.render();
    }
  } catch (error) {
    console.warn("Erro no buy:", error);
  }
}

function activateSkill(key) {
  try {
    const s = gameData.skills[key];
    if (s.cooldown > 0) return;

    s.active = true;
    s.cooldown = s.maxCooldown;
    s.duration = key === "fury" ? 5 : 10;

    if (key === "crit") activeCritBuff = true;
    AudioSys.playBuy();

    // NOVO: Atualizar missão de habilidades
    MissionSys.updateProgress("skill_use");
  } catch (error) {
    console.warn("Erro no activateSkill:", error);
  }
}

function doPrestige() {
  try {
    const pGain = Math.floor(gameData.totalScoreRun / 1000000);
    if (pGain <= 0) return;

    SaveSys.reset();

    const newData = { ...gameData };
    newData.score = 0;
    newData.level = 1;
    newData.clickDamage = 1;
    newData.autoDamage = 0;
    newData.villainsDefeated = 0;
    newData.totalScoreRun = 0;
    newData.crystals += pGain;

    Object.keys(newData.upgrades).forEach(
      (k) => (newData.upgrades[k].count = 0)
    );
    Object.keys(newData.heroes).forEach((k) => (newData.heroes[k].count = 0));

    localStorage.setItem(SaveSys.STORAGE_KEY, JSON.stringify(newData));
    location.reload();
  } catch (error) {
    console.warn("Erro no doPrestige:", error);
  }
}

// NOVO: Função para reivindicar recompensa de missão
function claimMissionReward(missionId) {
  if (MissionSys.claimReward(missionId)) {
    Shop.render();
    Renderer.updateMissions();
  }
}

function setupEvents() {
  try {
    const clickZone = document.getElementById("clickZone");
    if (clickZone) {
      clickZone.addEventListener("pointerdown", (e) => {
        if (e.target.classList.contains("weak-point")) return;
        e.preventDefault();
        handleInput(e.clientX, e.clientY);
      });
    }

    ["upgrades", "heroes", "artifacts"].forEach((t) => {
      const tabBtn = document.getElementById(
        "tab" + t.charAt(0).toUpperCase() + t.slice(1)
      );
      if (tabBtn) {
        tabBtn.addEventListener("click", () => {
          ["upgrades", "heroes", "artifacts"].forEach((x) => {
            document
              .getElementById("panel" + x.charAt(0).toUpperCase() + x.slice(1))
              .classList.add("hidden");
            document
              .getElementById("tab" + x.charAt(0).toUpperCase() + x.slice(1))
              .classList.replace("bg-yellow-300", "bg-gray-200");
          });
          document
            .getElementById("panel" + t.charAt(0).toUpperCase() + t.slice(1))
            .classList.remove("hidden");
          document
            .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
            .classList.replace("bg-gray-200", "bg-yellow-300");
          Shop.render();
        });
      }
    });

    if (document.getElementById("btnOptionsDesktop"))
      document
        .getElementById("btnOptionsDesktop")
        .addEventListener("click", () =>
          document.getElementById("settingsModal").classList.remove("hidden")
        );

    if (document.getElementById("btnMenuMobile"))
      document
        .getElementById("btnMenuMobile")
        .addEventListener("click", () =>
          document.getElementById("settingsModal").classList.remove("hidden")
        );

    if (document.getElementById("btnCloseSettings"))
      document
        .getElementById("btnCloseSettings")
        .addEventListener("click", () =>
          document.getElementById("settingsModal").classList.add("hidden")
        );

    if (document.getElementById("btnSave"))
      document.getElementById("btnSave").addEventListener("click", () => {
        SaveSys.save();
        document.getElementById("settingsModal").classList.add("hidden");
      });

    if (document.getElementById("btnPrestige"))
      document
        .getElementById("btnPrestige")
        .addEventListener("click", doPrestige);

    if (document.getElementById("muteBtn"))
      document.getElementById("muteBtn").addEventListener("click", (e) => {
        e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO";
      });

    if (document.getElementById("btnClaimOffline"))
      document
        .getElementById("btnClaimOffline")
        .addEventListener("click", () => {
          const modal = document.getElementById("offlineModal");
          modal.classList.add("hidden");
          modal.style.display = "none";
        });
  } catch (error) {
    console.warn("Erro no setupEvents:", error);
  }
}

function cleanup() {
  particlePool.forEach((particle) => {
    if (particle.element.parentNode)
      particle.element.parentNode.removeChild(particle.element);
  });
  weakPointPool.forEach((weakPoint) => {
    if (weakPoint.element.parentNode)
      weakPoint.element.parentNode.removeChild(weakPoint.element);
  });
  particlePool.length = 0;
  weakPointPool.length = 0;
}

window.addEventListener("beforeunload", cleanup);
window.addEventListener("pagehide", cleanup);

window.game = {
  buy,
  activateSkill,
  claimMissionReward, // NOVO: Expor função de reivindicar missão
};

window.gameData = gameData;

setupEvents();
init();
