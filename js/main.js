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
import { ErrorHandler, ErrorType } from "./systems/ErrorHandler.js";
import { Renderer } from "./ui/Renderer.js";
import { Shop } from "./ui/Shop.js";
import { ParticleSys } from "./systems/ParticleSys.js";
import { MissionSys } from "./systems/MissionSys.js";

let isBoss = false;
let bossTimeLeft = 0;
let activeCritBuff = false;
let currentVillain = null;
let specialVillainActive = false;

let lastRenderTime = 0;
let lastSaveTime = 0;
let lastWeakPointTime = 0;
let lastAchievementCheckTime = 0;
let lastSpecialVillainCheck = 0;
const RENDER_INTERVAL = 1000 / 30;
const SAVE_INTERVAL = 30000;
const WEAK_POINT_INTERVAL = 4000;
const ACHIEVEMENT_CHECK_INTERVAL = 2000;
const SPECIAL_VILLAIN_CHECK = 5000;

const particlePool = [];
const weakPointPool = [];

window.getParticleFromPool = getParticleFromPool;
window.returnParticleToPool = returnParticleToPool;
window.ErrorHandler = ErrorHandler;

// 🦸‍♂️ NOVO: Função para reivindicar todas as missões
window.claimAllMissionRewards = function () {
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

  ErrorHandler.showSuccess(
    `🎉 Todas as missões reivindicadas! +${totalCrystals} cristais!`
  );
  Renderer.updateMissions();
  Shop.render();
};

// 🦸‍♂️ NOVO: Efeito de partículas temáticas Superman
function spawnSupermanParticle(x, y, text, type = "normal") {
  const colors = {
    normal: "text-yellow-400",
    crit: "text-red-500",
    heal: "text-blue-400",
    gold: "text-yellow-300",
    special: "text-purple-400",
  };

  ParticleSys.spawnFloatingText(
    x,
    y,
    text,
    colors[type] || colors.normal,
    type === "crit" ? 1.8 : 1.2
  );
}

function init() {
  ErrorHandler.init();

  try {
    AudioSys.init().catch((e) =>
      ErrorHandler.logError({
        type: ErrorType.WARNING,
        message: "Audio Fail",
        stack: e.stack,
      })
    );
  } catch (e) {
    console.warn(e);
  }

  if (!ErrorHandler.safeExecute(SaveSys.load, false)()) {
    ErrorHandler.showErrorToUser("Save corrompido. Reiniciando.");
    SaveSys.reset();
  }

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
  Renderer.updateMissions();
  ErrorHandler.showSuccess("Jogo carregado!");
}

function initializePools() {
  for (let i = 0; i < 20; i++) {
    const el = document.createElement("div");
    el.className =
      "font-comic font-bold absolute pointer-events-none z-50 hidden";
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
  const p = particlePool.find((p) => !p.inUse);
  if (p) {
    p.inUse = true;
    return p;
  }
  const el = document.createElement("div");
  el.className = "font-comic font-bold absolute pointer-events-none z-50";
  document.body.appendChild(el);
  const newP = { element: el, inUse: true };
  particlePool.push(newP);
  return newP;
}

function returnParticleToPool(p) {
  p.inUse = false;
  p.element.classList.add("hidden");
}

function getWeakPointFromPool() {
  const wp = weakPointPool.find((w) => !w.inUse);
  if (wp) wp.inUse = true;
  return wp;
}

function returnWeakPointToPool(wp) {
  wp.inUse = false;
  wp.element.classList.add("hidden");
  wp.element.remove();
}

function update(dt) {
  const now = Date.now();
  const dps = calculateDPS();

  if (dps > 0) damageVillain(dps * dt);

  // 🦸‍♂️ MELHORADO: Sistema de vilões especiais
  if (
    now - lastSpecialVillainCheck > SPECIAL_VILLAIN_CHECK &&
    !isBoss &&
    !specialVillainActive &&
    Math.random() < 0.15
  ) {
    checkSpecialVillain();
    lastSpecialVillainCheck = now;
  }

  // 🦸‍♂️ MELHORADO: Efeitos de vilões especiais
  if (specialVillainActive && currentVillain) {
    applySpecialVillainEffects(dt);
  }

  for (let k in gameData.skills) {
    const s = gameData.skills[k];
    if (s.cooldown > 0) s.cooldown -= dt;
    if (s.active) {
      s.duration -= dt;
      if (s.duration <= 0) {
        s.active = false;
        if (k === "crit") activeCritBuff = false;
      }
    }
  }

  if (now - lastSaveTime > SAVE_INTERVAL) {
    SaveSys.save();
    lastSaveTime = now;
  }

  if (
    now - lastWeakPointTime > WEAK_POINT_INTERVAL &&
    !isBoss &&
    Math.random() > 0.7
  ) {
    spawnWeakPoint();
    lastWeakPointTime = now;
  }

  if (now - lastAchievementCheckTime > ACHIEVEMENT_CHECK_INTERVAL) {
    checkAchievements();
    lastAchievementCheckTime = now;
  }

  if (isBoss) {
    bossTimeLeft -= dt;
    if (bossTimeLeft <= 0) failBoss();
  }
}

function checkSpecialVillain() {
  if (specialVillains.length === 0) return;

  const sv =
    specialVillains[Math.floor(Math.random() * specialVillains.length)];
  spawnSpecialVillain(sv);
}

function spawnSpecialVillain(sv) {
  currentVillain = {
    ...sv,
    special: true,
    baseHP: gameData.villainMaxHp,
    originalHP: gameData.villainMaxHp,
  };

  if (sv.type === "tank") {
    gameData.villainMaxHp = Math.floor(gameData.villainMaxHp * 1.5);
  }

  gameData.villainCurrentHp = gameData.villainMaxHp;
  specialVillainActive = true;

  Renderer.updateVillainSprite(sv, false);
  Renderer.showSpecialVillainIndicator(sv);

  // 🦸‍♂️ NOVO: Partícula especial para vilão especial
  spawnSupermanParticle(
    window.innerWidth / 2,
    window.innerHeight / 2 - 100,
    `⭐ ${sv.name} ⭐`,
    "special"
  );

  ErrorHandler.showSuccess(`⭐ ${sv.name} apareceu! ${sv.effect}`);
}

function applySpecialVillainEffects(dt) {
  if (!currentVillain || !specialVillainActive) return;

  if (currentVillain.type === "healer") {
    const healAmount = gameData.villainMaxHp * 0.01 * (dt / 2);
    gameData.villainCurrentHp = Math.min(
      gameData.villainCurrentHp + healAmount,
      gameData.villainMaxHp
    );
  }
}

function render() {
  const now = Date.now();
  if (now - lastRenderTime < RENDER_INTERVAL) return;
  lastRenderTime = now;

  Renderer.updateStats(calculateDPS());
  Renderer.updateVillainHealth();
  if (isBoss) Renderer.updateBossTimer(bossTimeLeft);

  for (let k in gameData.skills) {
    const s = gameData.skills[k];
    Renderer.updateSkillCooldown(k, s.cooldown, s.maxCooldown, s.active);
  }

  Renderer.updateMissions();
}

function calculateDPS() {
  let dps = gameData.autoDamage;
  let mult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
  if (gameData.artifacts.cape.owned) mult += 0.2;
  if (gameData.skills.fury.active) mult *= 2;
  if (gameData.skills.team.active) mult *= 2;
  return dps * mult;
}

function getAchievementBonus() {
  return Object.values(gameData.achievements || {}).reduce(
    (acc, a) => (a.done ? acc + a.reward : acc),
    0
  );
}

async function handleInput(x, y, forcedCrit = false) {
  await AudioSys.ensureAudio();
  let bonusMult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
  if (gameData.artifacts.ring.owned) bonusMult += 0.2;
  if (gameData.skills.team.active) bonusMult *= 2;

  const res = await InputSys.handleClick(
    x,
    y,
    forcedCrit,
    activeCritBuff,
    bonusMult,
    damageVillain
  );

  if (res && res.showCombo) Renderer.updateCombo(gameData.combo);
  Renderer.animateHit();
  MissionSys.updateProgress("click");
}

// 🦸‍♂️ SUBSTITUÍDO: Nova função damageVillain com partículas temáticas
function damageVillain(amt) {
  try {
    if (currentVillain?.type === "elusive" && Math.random() < 0.3) {
      spawnSupermanParticle(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "ESQUIVOU!",
        "heal"
      );
      return;
    }

    gameData.villainCurrentHp -= amt;

    // Partícula de dano temática
    const damageText = `-${Math.floor(amt)}`;
    spawnSupermanParticle(
      window.innerWidth / 2 + (Math.random() * 100 - 50),
      window.innerHeight / 2 + (Math.random() * 100 - 50),
      damageText,
      amt > 50 ? "crit" : "normal"
    );

    if (gameData.villainCurrentHp <= 0) defeatVillain();
  } catch (error) {
    console.warn("Erro no damageVillain:", error);
  }
}

function defeatVillain() {
  gameData.villainsDefeated++;
  let reward = Math.floor(gameData.villainMaxHp / 2.5);
  if (gameData.artifacts.amulet.owned) reward *= 1.1;

  // 🦸‍♂️ MELHORADO: Bônus para vilões especiais
  if (specialVillainActive && currentVillain) {
    reward *= 2;

    // 🦸‍♂️ NOVO: Partícula de recompensa dobrada
    spawnSupermanParticle(
      window.innerWidth / 2,
      window.innerHeight / 2 - 50,
      "RECOMPENSA DOBRADA!",
      "gold"
    );

    ErrorHandler.showSuccess(
      `⭐ Vilão especial derrotado! Recompensa dobrada!`
    );

    // Restaurar HP normal após derrotar vilão especial
    if (currentVillain.originalHP) {
      gameData.villainMaxHp = currentVillain.originalHP;
    }
    specialVillainActive = false;
  }

  if (isBoss) {
    reward *= 10;
    MissionSys.updateProgress("boss_kill");
  }

  gameData.score += reward;
  gameData.totalScoreRun += reward;
  MissionSys.updateProgress("kill");

  // 🦸‍♂️ NOVO: Partícula de ouro ganho
  if (reward > 0) {
    spawnSupermanParticle(
      window.innerWidth / 2,
      window.innerHeight / 2 + 50,
      `+${reward} OURO`,
      "gold"
    );
  }

  if (Math.random() < 0.02) {
    const avail = Object.keys(gameData.artifacts).filter(
      (k) => !gameData.artifacts[k].owned
    );
    if (avail.length > 0) {
      const artifactKey = avail[Math.floor(Math.random() * avail.length)];
      gameData.artifacts[artifactKey].owned = true;

      // 🦸‍♂️ NOVO: Partícula de artefato desbloqueado
      spawnSupermanParticle(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "ARTEFATO DESBLOQUEADO!",
        "special"
      );

      Shop.render();
    }
  }

  if (isBoss) {
    AudioSys.playLevelUp();
    gameData.level++;
    isBoss = false;
    Renderer.toggleBossUI(false);
    Renderer.updateEnvironment(gameData.level);

    // 🦸‍♂️ NOVO: Partícula de level up
    spawnSupermanParticle(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "LEVEL UP!",
      "crit"
    );
  } else if (gameData.villainsDefeated % 10 === 0) {
    startBossFight();
    return;
  }

  currentVillain = null;
  specialVillainActive = false;
  spawnVillain();
  Shop.render();
}

function startBossFight() {
  isBoss = true;
  Renderer.toggleBossUI(true);
  bossTimeLeft = 30;
  const bossIdx = Math.floor((gameData.level / 5) % bosses.length);
  gameData.villainMaxHp *= 8;
  gameData.villainCurrentHp = gameData.villainMaxHp;
  Renderer.updateVillainSprite(bosses[bossIdx], true);

  // 🦸‍♂️ NOVO: Partícula de boss aparecendo
  spawnSupermanParticle(
    window.innerWidth / 2,
    window.innerHeight / 2,
    "⚡ CHEFE ⚡",
    "crit"
  );
}

function failBoss() {
  isBoss = false;
  Renderer.toggleBossUI(false);
  spawnVillain();
}

function spawnVillain() {
  if (isBoss) return;

  // 🦸‍♂️ CORRIGIDO: Restaurar HP normal se era vilão especial
  if (specialVillainActive && currentVillain?.originalHP) {
    gameData.villainMaxHp = currentVillain.originalHP;
  }

  const growth = 1.4;
  gameData.villainMaxHp = Math.floor(20 * Math.pow(growth, gameData.level - 1));
  gameData.villainCurrentHp = gameData.villainMaxHp;

  const v = villains[(gameData.level - 1) % villains.length];
  currentVillain = v;
  Renderer.updateVillainSprite(v, false);
  Renderer.hideSpecialVillainIndicator();
}

function spawnWeakPoint() {
  const cz = document.getElementById("clickZone");
  if (!cz) return;
  const wp = getWeakPointFromPool();
  if (!wp) return;

  const r = cz.getBoundingClientRect();
  const el = wp.element;
  el.className = "weak-point";
  el.style.left = Math.random() * (r.width - 60) + "px";
  el.style.top = Math.random() * (r.height - 60) + "px";
  el.classList.remove("hidden");

  el.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleInput(e.clientX, e.clientY, true);
    returnWeakPointToPool(wp);
  };
  cz.appendChild(el);
  setTimeout(() => {
    if (wp.inUse) returnWeakPointToPool(wp);
  }, 2500);
}

function checkAchievements() {
  if (!gameData.achievements) return;
  let changed = false;
  for (let k in gameData.achievements) {
    const a = gameData.achievements[k];
    if (!a.done) {
      if (a.type === "kills" && gameData.villainsDefeated >= a.req) {
        a.done = true;
        changed = true;
      }
      if (a.type === "clicks" && gameData.totalClicks >= a.req) {
        a.done = true;
        changed = true;
      }
      if (a.type === "level" && gameData.level >= a.req) {
        a.done = true;
        changed = true;
      }
      if (changed) {
        // 🦸‍♂️ NOVO: Partícula de conquista
        spawnSupermanParticle(
          window.innerWidth / 2,
          window.innerHeight / 2,
          `CONQUISTA: ${a.name}!`,
          "gold"
        );
        ErrorHandler.showSuccess(`Conquista: ${a.name}!`);
      }
    }
  }
  if (changed) Shop.render();
}

function buy(type, key) {
  const item = type === "hero" ? gameData.heroes[key] : gameData.upgrades[key];
  let cost = Math.floor(item.baseCost * Math.pow(1.2, item.count));
  if (gameData.score >= cost) {
    AudioSys.playBuy();
    gameData.score -= cost;
    item.count++;
    if (type === "hero") gameData.autoDamage += item.dps;
    else gameData.clickDamage += item.boost;

    // 🦸‍♂️ NOVO: Partícula de compra
    spawnSupermanParticle(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "COMPRA REALIZADA!",
      "normal"
    );

    Shop.render();
  }
}

function activateSkill(key) {
  const s = gameData.skills[key];
  if (s.cooldown > 0) return;
  s.active = true;
  s.cooldown = s.maxCooldown;
  s.duration = key === "fury" ? 5 : 10;
  if (key === "crit") activeCritBuff = true;
  AudioSys.playBuy();
  MissionSys.updateProgress("skill_use");

  // 🦸‍♂️ NOVO: Partícula de habilidade ativada
  const skillNames = {
    fury: "FÚRIA",
    crit: "MIRA CRÍTICA",
    team: "LIGA DA JUSTIÇA",
  };
  spawnSupermanParticle(
    window.innerWidth / 2,
    window.innerHeight / 2,
    `${skillNames[key]} ATIVADA!`,
    "special"
  );
}

function doPrestige() {
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
  Object.keys(newData.upgrades).forEach((k) => (newData.upgrades[k].count = 0));
  Object.keys(newData.heroes).forEach((k) => (newData.heroes[k].count = 0));

  // 🦸‍♂️ MELHORADO: Preservar missões diárias no prestige
  newData.dailyMissions = gameData.dailyMissions;

  localStorage.setItem(SaveSys.STORAGE_KEY, JSON.stringify(newData));

  // 🦸‍♂️ NOVO: Partícula de prestígio
  spawnSupermanParticle(
    window.innerWidth / 2,
    window.innerHeight / 2,
    `PRESTÍGIO! +${pGain} CRISTAIS`,
    "gold"
  );

  setTimeout(() => {
    location.reload();
  }, 1000);
}

function claimMissionReward(id) {
  if (MissionSys.claimReward(id)) {
    // 🦸‍♂️ NOVO: Partícula de missão completada
    spawnSupermanParticle(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "MISSÃO COMPLETADA!",
      "gold"
    );

    Shop.render();
    Renderer.updateMissions();
  }
}

function setupEvents() {
  const cz = document.getElementById("clickZone");
  if (cz) {
    cz.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("weak-point")) return;
      e.preventDefault();
      handleInput(e.clientX, e.clientY);
    });
  }

  // TAB SWITCHING
  const tabs = ["upgrades", "heroes", "artifacts", "achievements"];
  tabs.forEach((t) => {
    document
      .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
      ?.addEventListener("click", () => {
        tabs.forEach((x) => {
          const panel = document.getElementById(
            "panel" + x.charAt(0).toUpperCase() + x.slice(1)
          );
          const btn = document.getElementById(
            "tab" + x.charAt(0).toUpperCase() + t.slice(1)
          );
          if (panel) panel.classList.add("hidden");
          if (btn) btn.classList.replace("bg-yellow-300", "bg-gray-200");
        });
        document
          .getElementById("panel" + t.charAt(0).toUpperCase() + t.slice(1))
          .classList.remove("hidden");
        document
          .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
          .classList.replace("bg-gray-200", "bg-yellow-300");
        Shop.render();
      });
  });

  // Global Settings Button (New)
  document
    .getElementById("btnGlobalSettings")
    ?.addEventListener("click", () => {
      const modal = document.getElementById("settingsModal");
      document.getElementById("levelDisplaySettings").innerText =
        gameData.level;
      modal.classList.remove("hidden");
    });

  document
    .getElementById("btnCloseSettings")
    ?.addEventListener("click", () =>
      document.getElementById("settingsModal").classList.add("hidden")
    );

  document.getElementById("btnSave")?.addEventListener("click", () => {
    SaveSys.save();
    ErrorHandler.showSuccess("Jogo Salvo!");
    document.getElementById("settingsModal").classList.add("hidden");
  });

  document.getElementById("btnPrestige")?.addEventListener("click", doPrestige);
  document
    .getElementById("muteBtn")
    ?.addEventListener(
      "click",
      (e) =>
        (e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO")
    );
  document.getElementById("btnClaimOffline")?.addEventListener("click", () => {
    const m = document.getElementById("offlineModal");
    m.classList.add("hidden");
    m.style.display = "none";
  });
}

window.addEventListener("beforeunload", () => {
  particlePool.forEach((p) => p.element.remove());
  weakPointPool.forEach((w) => w.element.remove());
});

window.game = { buy, activateSkill, claimMissionReward };
window.gameData = gameData;
init();
