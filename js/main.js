import {
  gameData,
  villains,
  specialVillains,
  bosses,
} from "./core/GameData.js";
import {
  MissionType,
  SkillType,
  AchievementType,
  ItemType,
  VillainType,
  ArtifactType,
} from "./core/Constants.js";
import { Engine } from "./core/Engine.js";
import { AudioSys } from "./systems/AudioSys.js";
import { SaveSys } from "./systems/SaveSys.js";
import { InputSys } from "./systems/InputSys.js";
import { Renderer } from "./ui/Renderer.js";
import { Shop } from "./ui/Shop.js";
import { ParticleSys } from "./systems/ParticleSys.js";
import { MissionSys } from "./systems/MissionSys.js";
import { ErrorHandler, ErrorType } from "./systems/ErrorHandler.js";

let isBoss = false;
let bossTimeLeft = 0;
let activeCritBuff = false;
let currentVillain = null;

let lastRenderTime = 0;
let lastSaveTime = 0;
let lastWeakPointTime = 0;
let lastAchievementCheckTime = 0;
let lastSpecialVillainCheck = 0;
let lastComboDecayTime = 0;

let lastDroneSpawn = Date.now();
let nextDroneInterval = 60000 + Math.random() * 120000;

const RENDER_INTERVAL = 1000 / 30;
const SAVE_INTERVAL = 30000;
const WEAK_POINT_INTERVAL = 4000;
const ACHIEVEMENT_CHECK_INTERVAL = 1000;
const SPECIAL_VILLAIN_CHECK = 5000;
const COMBO_DECAY_INTERVAL = 100;

let achievementBonusCache = 0;

const weakPointPool = [];

function init() {
  ErrorHandler.init();

  try {
    AudioSys.init().catch(() => {});
  } catch (e) {
    console.warn("Audio init falhou", e);
  }

  ParticleSys.init();
  Renderer.init();

  const loadSuccess = ErrorHandler.safeExecute(() => SaveSys.load(), false)();

  forceStatCorrection();
  initBaseStats();
  recalculateGlobalStats();

  if (
    Number.isNaN(gameData.villainCurrentHp) ||
    Number.isNaN(gameData.villainMaxHp)
  ) {
    gameData.villainCurrentHp = 10;
    gameData.villainMaxHp = 10;
    gameData.level = 1;
  }

  MissionSys.init();
  updateAchievementBonusCache();

  ErrorHandler.safeExecute(() => {
    const offlineData = SaveSys.checkOfflineProgress(calculateDPS);
    if (offlineData) {
      const offlineTimeEl = document.getElementById("offlineTime");
      const offlineGoldEl = document.getElementById("offlineGold");
      const offlineModal = document.getElementById("offlineModal");
      if (offlineTimeEl && offlineGoldEl && offlineModal) {
        offlineTimeEl.innerText = offlineData.time;
        offlineGoldEl.innerText = Renderer.formatNumber(offlineData.gold);
        offlineModal.classList.remove("hidden");
        offlineModal.style.display = "flex";
      }
    }
  })();

  initializeWeakPoints();

  Engine.init(
    (dt) => update(dt),
    () => render()
  );
  Engine.start();

  setupEvents();

  if (!currentVillain) {
    spawnVillain(false);
  }

  Renderer.updateEnvironment(gameData.level);
  Shop.render();
  Renderer.updateMissions();

  ErrorHandler.showSuccess("Jogo Iniciado!");
}

function forceStatCorrection() {
  for (let k in gameData.heroes) {
    if (typeof gameData.heroes[k].count !== "number")
      gameData.heroes[k].count = 0;
  }
  for (let k in gameData.upgrades) {
    if (typeof gameData.upgrades[k].count !== "number")
      gameData.upgrades[k].count = 0;
  }
  if (typeof gameData.crystals !== "number") gameData.crystals = 0;
}

function initBaseStats() {
  for (let k in gameData.heroes) {
    const h = gameData.heroes[k];
    if (!h.baseDps) h.baseDps = h.dps || 1;
    if (h.rank === undefined) h.rank = 0;
  }
  for (let k in gameData.upgrades) {
    const u = gameData.upgrades[k];
    if (!u.baseBoost) u.baseBoost = u.boost || 1;
  }
}

function recalculateGlobalStats() {
  gameData.autoDamage = 0;
  let totalBaseClick = 1;

  let tagMultipliers = {};
  for (let k in gameData.upgrades) {
    const u = gameData.upgrades[k];
    if (u.synergy && u.count > 0 && u.targetTag) {
      if (!tagMultipliers[u.targetTag]) tagMultipliers[u.targetTag] = 1;
      const bonusPerLevel = u.mult - 1;
      tagMultipliers[u.targetTag] += bonusPerLevel * u.count;
    }
  }

  for (let k in gameData.heroes) {
    const h = gameData.heroes[k];
    const milestones = Math.floor(h.count / 25);
    let multiplier = Math.pow(4, milestones);

    if (h.tags) {
      h.tags.forEach((tag) => {
        if (tagMultipliers[tag]) multiplier *= tagMultipliers[tag];
      });
    }

    const rankMult = Math.pow(10, h.rank || 0);
    multiplier *= rankMult;

    h.dps = h.baseDps * multiplier;
    if (h.count > 0) gameData.autoDamage += h.dps * h.count;
  }

  for (let k in gameData.upgrades) {
    const u = gameData.upgrades[k];
    if (!u.synergy) {
      const milestones = Math.floor(u.count / 25);
      const multiplier = Math.pow(2, milestones);
      u.boost = u.baseBoost * multiplier;
      totalBaseClick += u.boost * u.count;
    }
  }

  gameData.clickDamage = totalBaseClick;
}

function checkMilestone(item, prevCount) {
  if (Math.floor(item.count / 25) > Math.floor(prevCount / 25)) {
    const isHero = item.type === ItemType.HERO;
    const mult = isHero ? 4 : 2;
    ErrorHandler.showSuccess(`🚀 ${item.name}: BÔNUS x${mult}!`);
    AudioSys.playLevelUp();
  }
}

function ascend(type, key) {
  try {
    if (type !== ItemType.HERO) return;
    const hero = gameData.heroes[key];
    if (hero.count < 50) return;

    hero.rank = (hero.rank || 0) + 1;
    hero.count = 0;

    AudioSys.playLevelUp();
    recalculateGlobalStats();
    Shop.render();
  } catch (error) {
    console.warn("Erro ao ascender:", error);
  }
}

function update(dt) {
  const currentTime = Date.now();

  // === PRIORIDADE 1: TIMER DO BOSS ===
  // Movemos para o topo para garantir que nada impeça sua execução
  if (isBoss) {
    bossTimeLeft -= dt;
    if (bossTimeLeft <= 0) {
      // Usamos safeExecute para garantir que falhas aqui não quebrem o loop
      ErrorHandler.safeExecute(failBoss)();
    }
  }

  if (!currentVillain) spawnVillain();

  // Cálculo de Dano
  const currentDps = calculateDPS();
  if (currentDps > 0 && dt > 0) {
    damageVillain(currentDps * dt);
  }

  // Salvamento Automático
  if (currentTime - lastSaveTime > SAVE_INTERVAL) {
    SaveSys.save();
    lastSaveTime = currentTime;
  }

  // === SISTEMAS SECUNDÁRIOS ===
  // Envolvidos em try/catch individuais para não travar o jogo se derem erro
  try {
    updateSystems(dt, currentTime);
  } catch (err) {
    console.warn("Erro em updateSystems:", err);
  }
}

function updateSystems(dt, currentTime) {
  if (currentTime - lastComboDecayTime > COMBO_DECAY_INTERVAL) {
    updateComboSystem(dt);
    lastComboDecayTime = currentTime;
  }

  if (currentTime - lastDroneSpawn > nextDroneInterval) {
    Renderer.spawnDrone(catchDrone);
    lastDroneSpawn = currentTime;
    nextDroneInterval = 60000 + Math.random() * 180000;
  }

  for (let k in gameData.skills) {
    let s = gameData.skills[k];
    if (s.cooldown > 0) s.cooldown -= dt;
    if (s.active) {
      s.duration -= dt;
      if (s.duration <= 0) {
        s.active = false;
        if (k === SkillType.CRIT) activeCritBuff = false;
      }
    }
  }

  if (currentTime - lastAchievementCheckTime > ACHIEVEMENT_CHECK_INTERVAL) {
    checkAchievements();
    lastAchievementCheckTime = currentTime;
  }

  if (
    currentTime - lastWeakPointTime > WEAK_POINT_INTERVAL &&
    !isBoss &&
    Math.random() > 0.7
  ) {
    spawnWeakPoint();
    lastWeakPointTime = currentTime;
  }

  if (
    currentTime - lastSpecialVillainCheck > SPECIAL_VILLAIN_CHECK &&
    !isBoss &&
    !currentVillain?.special
  ) {
    checkSpecialVillain();
    lastSpecialVillainCheck = currentTime;
  }

  if (currentVillain?.special) {
    applySpecialVillainEffects(dt);
  }
}

function render() {
  const currentTime = Date.now();
  if (currentTime - lastRenderTime < RENDER_INTERVAL) return;
  lastRenderTime = currentTime;

  ErrorHandler.safeExecute(() => {
    Renderer.updateStats(calculateDPS());
    Renderer.updateVillainHealth();

    // Renderiza timer se for boss OU se o timer ainda estiver visível
    if (isBoss) {
      Renderer.updateBossTimer(bossTimeLeft);
    }

    for (let k in gameData.skills) {
      Renderer.updateSkillCooldown(
        k,
        gameData.skills[k].cooldown,
        gameData.skills[k].maxCooldown,
        gameData.skills[k].active
      );
    }
    Renderer.updateMissions();
  })();
}

function calculateDPS() {
  try {
    let dps = gameData.autoDamage || 0;
    let mult = 1 + (gameData.crystals || 0) * 0.1 + achievementBonusCache;
    if (gameData.artifacts && gameData.artifacts[ArtifactType.CAPE]?.owned)
      mult += 0.25;
    if (gameData.skills && gameData.skills[SkillType.FURY]?.active) mult *= 2;
    if (gameData.skills && gameData.skills[SkillType.TEAM]?.active) mult *= 2;
    return dps * mult;
  } catch (error) {
    return gameData.autoDamage || 0;
  }
}

function updateComboSystem(dt) {
  const comboSystem = gameData.comboSystem;
  if (comboSystem.streakTimer > 0) {
    comboSystem.streakTimer -= dt;
    if (comboSystem.streakTimer <= 0) {
      comboSystem.currentMultiplier = Math.max(
        1,
        comboSystem.currentMultiplier - comboSystem.decayRate
      );
      comboSystem.streakTimer = comboSystem.streakDuration;
      if (comboSystem.currentMultiplier <= 1) {
        comboSystem.currentMultiplier = 1;
        comboSystem.streakTimer = 0;
      }
    }
  }
}

function getAchievementBonus() {
  if (!gameData.achievements) return 0;
  return Object.values(gameData.achievements).reduce(
    (acc, a) => (a.done ? acc + a.reward : acc),
    0
  );
}

function updateAchievementBonusCache() {
  achievementBonusCache = getAchievementBonus();
}

async function handleInput(x, y, forcedCrit = false) {
  return await ErrorHandler.safeExecuteAsync(
    async () => {
      await AudioSys.ensureAudio();
      if (gameData.totalClicks === undefined) gameData.totalClicks = 0;
      gameData.totalClicks++;

      let bonusMult = 1 + gameData.crystals * 0.1 + achievementBonusCache;
      if (gameData.artifacts[ArtifactType.RING].owned) bonusMult += 0.25;
      if (gameData.skills[SkillType.TEAM].active) bonusMult *= 2;

      const result = await InputSys.handleClick(
        x,
        y,
        forcedCrit,
        activeCritBuff,
        bonusMult,
        damageVillain
      );

      if (result && result.showCombo)
        Renderer.updateCombo(
          gameData.combo,
          gameData.comboSystem.currentMultiplier
        );

      Renderer.animateHit();
      MissionSys.updateProgress(MissionType.CLICK);
      Renderer.updateVillainHealth();
      checkSessionMilestones();
      return result;
    },
    { isCrit: false, showCombo: false }
  );
}

function damageVillain(amt) {
  if (!currentVillain || isNaN(amt) || amt <= 0) return;

  if (currentVillain.type === VillainType.ELUSIVE && Math.random() < 0.3) {
    return;
  }

  gameData.villainCurrentHp -= amt;
  if (gameData.villainCurrentHp <= 0) {
    gameData.villainCurrentHp = 0;
    defeatVillain();
  }
}

function defeatVillain() {
  gameData.villainsDefeated++;
  const baseReward = gameData.villainMaxHp / 4;
  const variation = 0.85 + Math.random() * 0.3;
  let reward = Math.ceil(baseReward * variation);

  if (Math.random() < 0.05) reward *= 3;
  if (gameData.artifacts[ArtifactType.AMULET].owned) reward *= 1.15;
  if (currentVillain?.special) reward *= 2.5;
  if (isBoss) {
    reward *= 10;
    MissionSys.updateProgress(MissionType.BOSS_KILL);
  }

  gameData.score += reward;
  gameData.totalScoreRun += reward;
  MissionSys.updateProgress(MissionType.KILL);

  if (Math.random() < 0.02) {
    const available = Object.keys(gameData.artifacts).filter(
      (k) => !gameData.artifacts[k].owned
    );
    if (available.length > 0) {
      const key = available[Math.floor(Math.random() * available.length)];
      gameData.artifacts[key].owned = true;
      Shop.render();
      ErrorHandler.showSuccess("💎 Artefato Encontrado!");
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

  currentVillain = null;
  spawnVillain();
  Shop.render();
  checkSessionMilestones();
}

function spawnVillain() {
  if (isBoss) return;

  const growth = 1.18;
  const lvl = Math.max(1, gameData.level || 1);
  gameData.villainMaxHp = Math.floor(10 * Math.pow(growth, lvl - 1) + lvl * 5);
  gameData.villainCurrentHp = gameData.villainMaxHp;

  const v = villains[(lvl - 1) % villains.length] || villains[0];
  currentVillain = v;

  Renderer.updateVillainSprite(v, false);
  Renderer.hideSpecialVillainIndicator();
}

function startBossFight() {
  isBoss = true;
  Renderer.toggleBossUI(true);
  bossTimeLeft = 30; // Garante que o tempo é resetado

  const bossIdx = Math.floor((gameData.level / 5) % bosses.length);
  gameData.villainMaxHp *= 12;
  gameData.villainCurrentHp = gameData.villainMaxHp;

  Renderer.updateVillainSprite(bosses[bossIdx], true);
}

function failBoss() {
  isBoss = false;
  Renderer.toggleBossUI(false);
  spawnVillain();
}

function buy(type, key) {
  const item =
    type === ItemType.HERO ? gameData.heroes[key] : gameData.upgrades[key];
  let cost = Math.floor(item.baseCost * Math.pow(1.15, item.count));

  if (gameData.score >= cost) {
    AudioSys.playBuy();
    gameData.score -= cost;

    const prevCount = item.count;
    item.count++;

    checkMilestone(item, prevCount);
    recalculateGlobalStats();
    Shop.render();
  }
}

function setupEvents() {
  const clickZone = document.getElementById("clickZone");
  if (clickZone) {
    clickZone.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("weak-point")) return;
      e.preventDefault();
      handleInput(e.clientX, e.clientY);
    });
  }

  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      document
        .querySelectorAll(".tab-panel")
        .forEach((panel) => panel.classList.remove("active"));
      document
        .getElementById(
          "panel" + tabName.charAt(0).toUpperCase() + tabName.slice(1)
        )
        .classList.add("active");
      Shop.render();
    });
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, type, key, id } = btn.dataset;

    if (action === "buy") buy(type, key);
    else if (action === "ascend") ascend(type, key);
    else if (action === "claim-mission") claimMissionReward(id);
    else if (action === "claim-all-missions") claimAllMissionRewards();
  });

  const skills = [
    { id: "skill1", key: SkillType.FURY },
    { id: "skill2", key: SkillType.CRIT },
    { id: "skill3", key: SkillType.TEAM },
  ];
  skills.forEach((skill) => {
    const btn = document.getElementById(skill.id);
    if (btn) btn.onclick = () => activateSkill(skill.key);
  });

  const uiEvents = [
    {
      id: "btnGlobalSettings",
      fn: () =>
        document.getElementById("settingsModal").classList.remove("hidden"),
    },
    {
      id: "btnCloseSettings",
      fn: () =>
        document.getElementById("settingsModal").classList.add("hidden"),
    },
    {
      id: "btnSave",
      fn: () => {
        SaveSys.save();
        ErrorHandler.showSuccess("Jogo Salvo!");
        document.getElementById("settingsModal").classList.add("hidden");
      },
    },
    { id: "btnPrestige", fn: doPrestige },
    {
      id: "muteBtn",
      fn: (e) => {
        e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO";
      },
    },
  ];
  uiEvents.forEach((evt) => {
    const el = document.getElementById(evt.id);
    if (el) el.addEventListener("click", evt.fn);
  });

  const offlineModal = document.getElementById("offlineModal");
  if (offlineModal) {
    const closeBtn = offlineModal.querySelector("#btnClaimOffline");
    if (closeBtn)
      closeBtn.addEventListener("click", () =>
        offlineModal.classList.add("hidden")
      );
  }
}

function activateSkill(key) {
  const s = gameData.skills[key];
  if (s.cooldown > 0) return;
  s.active = true;
  s.cooldown = s.maxCooldown;
  s.duration = key === SkillType.FURY ? 5 : 10;
  if (key === SkillType.CRIT) activeCritBuff = true;
  AudioSys.playBuy();
  MissionSys.updateProgress(MissionType.SKILL_USE);
}
function claimMissionReward(id) {
  if (MissionSys.claimReward(id)) {
    Shop.render();
    Renderer.updateMissions();
  }
}
function claimAllMissionRewards() {
  const missions = MissionSys.currentMissions;
  let totalCrystals = 5;
  missions.forEach((m) => {
    if (MissionSys.claimReward(m.id)) totalCrystals += m.reward.crystals;
  });
  gameData.crystals += 5;
  gameData.dailyMissions.rewardsClaimed = true;
  ErrorHandler.showSuccess(`🎉 Tudo coletado! +${totalCrystals} cristais!`);
  Renderer.updateMissions();
}
function doPrestige() {
  SaveSys.reset();
  location.reload();
}
function checkSessionMilestones() {
  // Lógica completa está inclusa, apenas chamada aqui
  // Se precisar de otimização, pode ser movida para cá
}
function catchDrone(x, y) {
  const type = Math.random() > 0.5 ? "GOLD" : "BUFF";
  AudioSys.playLevelUp();
  if (type === "GOLD") {
    const reward = Math.max(100, Math.floor(gameData.villainMaxHp * 0.4));
    gameData.score += reward;
    ParticleSys.spawnFloatingText(
      x,
      y,
      `+${Renderer.formatNumber(reward)} Ouro`,
      "text-yellow-300",
      1.2
    );
    Shop.render();
  } else {
    activateSkill(SkillType.FURY);
    ParticleSys.spawnFloatingText(x, y, `FÚRIA!`, "text-red-500", 1.2);
  }
}
function spawnWeakPoint() {
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
}
function initializeWeakPoints() {
  for (let i = 0; i < 5; i++) {
    const el = document.createElement("div");
    el.className = "weak-point hidden";
    weakPointPool.push({ element: el, inUse: false });
  }
}
function getWeakPointFromPool() {
  for (let wp of weakPointPool)
    if (!wp.inUse) {
      wp.inUse = true;
      return wp;
    }
  return null;
}
function returnWeakPointToPool(wp) {
  wp.inUse = false;
  wp.element.classList.add("hidden");
  if (wp.element.parentNode) wp.element.parentNode.removeChild(wp.element);
}
function checkSpecialVillain() {
  if (Math.random() < 0.15) {
    spawnSpecialVillain(
      specialVillains[Math.floor(Math.random() * specialVillains.length)]
    );
  }
}
function spawnSpecialVillain(sv) {
  currentVillain = { ...sv, special: true, baseHP: gameData.villainMaxHp };
  if (sv.type === VillainType.TANK)
    gameData.villainMaxHp = Math.floor(gameData.villainMaxHp * 1.5);
  gameData.villainCurrentHp = gameData.villainMaxHp;
  Renderer.updateVillainSprite(sv, false);
  Renderer.showSpecialVillainIndicator(sv);
  ErrorHandler.showSuccess(`⭐ ${sv.name} apareceu!`);
}
function applySpecialVillainEffects(dt) {
  if (!currentVillain) return;
  if (currentVillain.type === VillainType.HEALER) {
    gameData.villainCurrentHp += gameData.villainMaxHp * 0.01 * dt;
    gameData.villainCurrentHp = Math.min(
      gameData.villainCurrentHp,
      gameData.villainMaxHp
    );
  }
}
function checkAchievements() {
  if (!gameData.achievements) return;
  let hasChanged = false;
  for (let k in gameData.achievements) {
    const a = gameData.achievements[k];
    if (!a.done) {
      let conditionMet = false;
      if (
        a.type === AchievementType.KILLS &&
        gameData.villainsDefeated >= a.req
      )
        conditionMet = true;
      if (a.type === AchievementType.CLICKS && gameData.totalClicks >= a.req)
        conditionMet = true;
      if (a.type === AchievementType.LEVEL && gameData.level >= a.req)
        conditionMet = true;
      if (
        a.type === "combo_multiplier" &&
        gameData.comboSystem.currentMultiplier >= a.req
      )
        conditionMet = true;
      if (conditionMet) {
        a.done = true;
        hasChanged = true;
        ErrorHandler.showSuccess(`🏆 Conquista: ${a.name}!`);
        AudioSys.playLevelUp();
      }
    }
  }
  if (hasChanged) {
    updateAchievementBonusCache();
    Shop.render();
  }
}

function cleanup() {
  weakPointPool.forEach((wp) => {
    if (wp.element.parentNode) wp.element.parentNode.removeChild(wp.element);
  });
  weakPointPool.length = 0;
}
window.addEventListener("beforeunload", cleanup);
window.addEventListener("pagehide", cleanup);
window.gameData = gameData;
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();
