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

// === DRONE CONTROLE ===
let lastDroneSpawn = Date.now();
let nextDroneInterval = 60000 + Math.random() * 120000; // Entre 1 e 3 minutos
// ======================

const RENDER_INTERVAL = 1000 / 30;
const SAVE_INTERVAL = 30000;
const WEAK_POINT_INTERVAL = 4000;
const ACHIEVEMENT_CHECK_INTERVAL = 1000;
const SPECIAL_VILLAIN_CHECK = 5000;

let achievementBonusCache = 0;

const weakPointPool = [];

function init() {
  ErrorHandler.init();

  try {
    AudioSys.init().catch((error) => {
      console.warn("Áudio aguardando interação do usuário");
    });
  } catch (e) {
    console.warn("Audio init falhou", e);
  }

  ParticleSys.init();
  Renderer.init();

  const loadSuccess = ErrorHandler.safeExecute(() => SaveSys.load(), false)();

  initBaseStats();
  recalculateGlobalStats();

  if (
    Number.isNaN(gameData.villainCurrentHp) ||
    Number.isNaN(gameData.villainMaxHp)
  ) {
    console.warn(
      "Dados de HP corrompidos detectados. Resetando status do vilão."
    );
    gameData.villainCurrentHp = 15;
    gameData.villainMaxHp = 15;
    gameData.level = 1;
  }

  if (!loadSuccess) {
    ErrorHandler.showErrorToUser("Iniciando novo jogo...");
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

  ErrorHandler.showSuccess("Jogo pronto!");
}

function initBaseStats() {
  for (let k in gameData.heroes) {
    const h = gameData.heroes[k];
    if (!h.baseDps) h.baseDps = h.dps;
  }
  for (let k in gameData.upgrades) {
    const u = gameData.upgrades[k];
    if (!u.baseBoost) u.baseBoost = u.boost;
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
        if (tagMultipliers[tag]) {
          multiplier *= tagMultipliers[tag];
        }
      });
    }

    h.dps = h.baseDps * multiplier;
    gameData.autoDamage += h.dps * h.count;
  }

  for (let k in gameData.upgrades) {
    const u = gameData.upgrades[k];
    if (!u.synergy) {
      const milestones = Math.floor(u.count / 25);
      const multiplier = Math.pow(4, milestones);

      u.boost = u.baseBoost * multiplier;
      totalBaseClick += u.boost * u.count;
    }
  }

  gameData.clickDamage = totalBaseClick;
}
function checkMilestone(item, prevCount) {
  if (Math.floor(item.count / 25) > Math.floor(prevCount / 25)) {
    const newMult = Math.pow(4, Math.floor(item.count / 25));

    ErrorHandler.showSuccess(
      `🚀 ${item.name}: MILESTONE! Dano x4! (Total: x${newMult})`
    );
    AudioSys.playLevelUp();

    ParticleSys.spawnFloatingText(
      window.innerWidth / 2,
      window.innerHeight / 2 - 100,
      "POWER UP!\nx4 DANO",
      "text-yellow-400 text-center tracking-widest stroke-black stroke-2 drop-shadow-lg",
      1.5
    );
  }
}

function updateAchievementBonusCache() {
  achievementBonusCache = getAchievementBonus();
}

function initializeWeakPoints() {
  for (let i = 0; i < 5; i++) {
    const el = document.createElement("div");
    el.className = "weak-point hidden";
    weakPointPool.push({ element: el, inUse: false });
  }
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

  if (!currentVillain) {
    spawnVillain();
  }

  const currentDps = ErrorHandler.safeExecute(calculateDPS, 0)();
  if (currentDps > 0) {
    ErrorHandler.safeExecute(damageVillain)(currentDps * dt);
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

  // === LÓGICA DO DRONE ===
  if (currentTime - lastDroneSpawn > nextDroneInterval) {
    Renderer.spawnDrone(catchDrone);
    lastDroneSpawn = currentTime;
    nextDroneInterval = 60000 + Math.random() * 180000;
  }
  // ======================

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

  if (currentTime - lastSaveTime > SAVE_INTERVAL) {
    ErrorHandler.safeExecute(() => SaveSys.save())();
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

// === CALLBACK DO DRONE (CORRIGIDO) ===
function catchDrone(x, y) {
  const type = Math.random() > 0.5 ? "GOLD" : "BUFF";

  AudioSys.playLevelUp();

  if (type === "GOLD") {
    const reward = Math.max(100, Math.floor(gameData.villainMaxHp * 0.2));
    gameData.score += reward;

    // CORREÇÃO VISUAL:
    // 1. stroke-black e stroke-2: Cria uma borda preta nítida em volta da letra (melhor que shadow)
    // 2. drop-shadow-md: Sombra leve para destacar do fundo
    ParticleSys.spawnFloatingText(
      x,
      y,
      `SUPRIMENTOS!\n+${Renderer.formatNumber(reward)} Ouro`,
      "text-yellow-300 text-center leading-none tracking-wider stroke-black stroke-2 drop-shadow-md",
      1.2
    );
    Shop.render();
  } else {
    activateSkill(SkillType.FURY);

    ParticleSys.spawnFloatingText(
      x,
      y,
      `ADRENALINA!\nFÚRIA ATIVADA!`,
      "text-red-500 text-center leading-none tracking-wider stroke-black stroke-2 drop-shadow-md",
      1.2
    );
  }
}
// =========================

function checkSpecialVillain() {
  if (Math.random() < 0.15) {
    const specialVillain =
      specialVillains[Math.floor(Math.random() * specialVillains.length)];
    spawnSpecialVillain(specialVillain);
  }
}

function spawnSpecialVillain(specialVillain) {
  currentVillain = {
    ...specialVillain,
    special: true,
    baseHP: gameData.villainMaxHp,
  };

  if (specialVillain.type === VillainType.TANK) {
    gameData.villainMaxHp = Math.floor(gameData.villainMaxHp * 1.5);
  }

  gameData.villainCurrentHp = gameData.villainMaxHp;

  Renderer.updateVillainSprite(specialVillain, false);
  Renderer.showSpecialVillainIndicator(specialVillain);

  ErrorHandler.showSuccess(
    `⭐ ${specialVillain.name} apareceu! ${specialVillain.effect}`
  );
}

function applySpecialVillainEffects(dt) {
  if (!currentVillain) return;

  switch (currentVillain.type) {
    case VillainType.ELUSIVE:
      break;
    case VillainType.HEALER:
      gameData.villainCurrentHp += gameData.villainMaxHp * 0.01 * (dt / 2);
      gameData.villainCurrentHp = Math.min(
        gameData.villainCurrentHp,
        gameData.villainMaxHp
      );
      break;
    case VillainType.TANK:
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

    Renderer.updateMissions();
  })();
}

function calculateDPS() {
  try {
    let dps = gameData.autoDamage;
    let mult = 1 + gameData.crystals * 0.1 + achievementBonusCache;
    if (gameData.artifacts[ArtifactType.CAPE].owned) mult += 0.2;
    if (gameData.skills[SkillType.FURY].active) mult *= 2;
    if (gameData.skills[SkillType.TEAM].active) mult *= 2;
    return dps * mult;
  } catch (error) {
    console.warn("Erro no calculateDPS:", error);
    return gameData.autoDamage || 0;
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

      if (gameData.totalClicks === undefined) gameData.totalClicks = 0;
      gameData.totalClicks++;

      let bonusMult = 1 + gameData.crystals * 0.1 + achievementBonusCache;
      if (gameData.artifacts[ArtifactType.RING].owned) bonusMult += 0.2;
      if (gameData.skills[SkillType.TEAM].active) bonusMult *= 2;

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

      MissionSys.updateProgress(MissionType.CLICK);
      Renderer.updateVillainHealth();

      return result;
    },
    { isCrit: false, showCombo: false }
  );
}

function damageVillain(amt) {
  try {
    if (!currentVillain) return;
    if (isNaN(amt) || amt <= 0) return;

    if (currentVillain?.type === VillainType.ELUSIVE && Math.random() < 0.3) {
      ParticleSys.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "ESQUIVOU!",
        "text-purple-400",
        1.5
      );
      return;
    }

    gameData.villainCurrentHp -= amt;

    if (isNaN(gameData.villainCurrentHp)) {
      gameData.villainCurrentHp = 0;
    }

    if (gameData.villainCurrentHp <= 0) {
      gameData.villainCurrentHp = 0;
      defeatVillain();
    }
  } catch (error) {
    console.warn("Erro no damageVillain:", error);
  }
}

function defeatVillain() {
  try {
    gameData.villainsDefeated++;

    let reward = Math.ceil(gameData.villainMaxHp / 4);

    if (Math.random() < 0.1) {
      reward *= 3;
      ParticleSys.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2 - 50,
        "OURO EXTRA!",
        "text-yellow-300",
        20
      );
    }

    if (gameData.artifacts[ArtifactType.AMULET].owned) reward *= 1.1;

    if (currentVillain?.special) {
      reward *= 2;
      ErrorHandler.showSuccess(
        `⭐ Vilão especial derrotado! Recompensa dobrada!`
      );
    }

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
  } catch (error) {
    console.warn("Erro no defeatVillain:", error);
    isBoss = false;
    currentVillain = null;
    spawnVillain();
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
    isBoss = false;
    spawnVillain();
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

    if (currentVillain?.special && currentVillain.baseHP) {
      gameData.villainMaxHp = currentVillain.baseHP;
    }

    const growth = 1.23;
    const lvl = Math.max(1, gameData.level || 1);

    gameData.villainMaxHp = Math.floor(
      15 * Math.pow(growth, lvl - 1) + lvl * 2
    );

    if (!isFinite(gameData.villainMaxHp) || isNaN(gameData.villainMaxHp)) {
      gameData.villainMaxHp = 20;
    }

    gameData.villainCurrentHp = gameData.villainMaxHp;

    const v = villains[(lvl - 1) % villains.length] || villains[0];
    currentVillain = v;

    Renderer.updateVillainSprite(v, false);
    Renderer.hideSpecialVillainIndicator();
  } catch (error) {
    console.warn("Erro no spawnVillain:", error);
    gameData.villainMaxHp = 20;
    gameData.villainCurrentHp = 20;
    currentVillain = villains[0];
  }
}

function spawnWeakPoint() {
  try {
    const clickZone = document.getElementById("clickZone");
    if (!clickZone) return;

    const weakPoint = getWeakPointFromPool();
    if (!weakPoint) return;

    const rect = clickZone.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

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

        if (conditionMet) {
          a.done = true;
          hasChanged = true;
          ErrorHandler.showSuccess(`🏆 Conquista Desbloqueada: ${a.name}!`);
          AudioSys.playLevelUp();
        }
      }
    }

    if (hasChanged) {
      updateAchievementBonusCache();
      Shop.render();
    }
  } catch (error) {
    console.warn("Erro no checkAchievements:", error);
  }
}

function buy(type, key) {
  try {
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
    s.duration = key === SkillType.FURY ? 5 : 10;

    if (key === SkillType.CRIT) activeCritBuff = true;
    AudioSys.playBuy();

    MissionSys.updateProgress(MissionType.SKILL_USE);
  } catch (error) {
    console.warn("Erro no activateSkill:", error);
  }
}

function claimMissionReward(missionId) {
  if (MissionSys.claimReward(missionId)) {
    Shop.render();
    Renderer.updateMissions();
  }
}

function claimAllMissionRewards() {
  const missions = MissionSys.currentMissions;
  let totalCrystals = 5;

  missions.forEach((mission) => {
    if (MissionSys.claimReward(mission.id)) {
      totalCrystals += mission.reward.crystals;
    }
  });

  gameData.crystals += 5;
  gameData.dailyMissions.rewardsClaimed = true;

  ErrorHandler.showSuccess(
    `🎉 Todas as missões reivindicadas! +${totalCrystals} cristais!`
  );
  Renderer.updateMissions();
}

function doPrestige() {
  try {
    SaveSys.reset();
    location.reload();
  } catch (error) {
    console.warn("Erro no doPrestige:", error);
    localStorage.clear();
    location.reload();
  }
}

function setupEvents() {
  try {
    const clickZone = document.getElementById("clickZone");
    if (clickZone) {
      const newClickZone = clickZone.cloneNode(true);
      clickZone.parentNode.replaceChild(newClickZone, clickZone);

      newClickZone.addEventListener("pointerdown", (e) => {
        if (e.target.classList.contains("weak-point")) return;
        e.preventDefault();
        handleInput(e.clientX, e.clientY);
      });
    }

    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const { action, type, key, id } = btn.dataset;

      if (action === "buy") {
        buy(type, key);
      } else if (action === "claim-mission") {
        claimMissionReward(id);
      } else if (action === "claim-all-missions") {
        claimAllMissionRewards();
      }
    });

    ["upgrades", "heroes", "artifacts", "achievements"].forEach((t) => {
      const tabBtn = document.getElementById(
        "tab" + t.charAt(0).toUpperCase() + t.slice(1)
      );
      if (tabBtn) {
        tabBtn.addEventListener("click", () => {
          ["upgrades", "heroes", "artifacts", "achievements"].forEach((x) => {
            const panel = document.getElementById(
              "panel" + x.charAt(0).toUpperCase() + x.slice(1)
            );
            const tab = document.getElementById(
              "tab" + x.charAt(0).toUpperCase() + x.slice(1)
            );

            if (panel) panel.classList.add("hidden");
            if (tab) tab.classList.replace("bg-yellow-300", "bg-gray-200");
          });

          const targetPanel = document.getElementById(
            "panel" + t.charAt(0).toUpperCase() + t.slice(1)
          );
          const targetTab = document.getElementById(
            "tab" + t.charAt(0).toUpperCase() + t.slice(1)
          );

          if (targetPanel) targetPanel.classList.remove("hidden");
          if (targetTab)
            targetTab.classList.replace("bg-gray-200", "bg-yellow-300");

          Shop.render();
        });
      }
    });

    const skills = [
      { id: "skill1", key: SkillType.FURY },
      { id: "skill2", key: SkillType.CRIT },
      { id: "skill3", key: SkillType.TEAM },
    ];
    skills.forEach((skill) => {
      const btn = document.getElementById(skill.id);
      if (btn) {
        btn.onclick = () => activateSkill(skill.key);
      }
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
          document.getElementById("settingsModal").classList.add("hidden");
          ErrorHandler.showSuccess("Jogo Salvo!");
        },
      },
      { id: "btnPrestige", fn: doPrestige },
      {
        id: "btnClaimOffline",
        fn: () => {
          document.getElementById("offlineModal").classList.add("hidden");
          document.getElementById("offlineModal").style.display = "none";
        },
      },
    ];

    uiEvents.forEach((evt) => {
      const el = document.getElementById(evt.id);
      if (el) el.addEventListener("click", evt.fn);
    });

    if (document.getElementById("muteBtn"))
      document.getElementById("muteBtn").addEventListener("click", (e) => {
        e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO";
      });
  } catch (error) {
    console.warn("Erro no setupEvents:", error);
  }
}

function cleanup() {
  weakPointPool.forEach((weakPoint) => {
    if (weakPoint.element.parentNode)
      weakPoint.element.parentNode.removeChild(weakPoint.element);
  });
  weakPointPool.length = 0;
}

window.addEventListener("beforeunload", cleanup);
window.addEventListener("pagehide", cleanup);

window.gameData = gameData;

init();
