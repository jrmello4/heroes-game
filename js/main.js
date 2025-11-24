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
const RENDER_INTERVAL = 1000 / 30;
const SAVE_INTERVAL = 30000;
const WEAK_POINT_INTERVAL = 4000;
const ACHIEVEMENT_CHECK_INTERVAL = 2000;
const SPECIAL_VILLAIN_CHECK = 5000;

const weakPointPool = [];

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

  ParticleSys.init();
  Renderer.init();

  const loadSuccess = ErrorHandler.safeExecute(SaveSys.load, false)();
  if (!loadSuccess) {
    ErrorHandler.showErrorToUser(
      "Dados de save corrompidos. Iniciando novo jogo."
    );
    ErrorHandler.safeExecute(SaveSys.reset)();
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

  initializeWeakPoints();

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

  ErrorHandler.showSuccess("Jogo carregado com sucesso!");
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
    let mult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
    if (gameData.artifacts[ArtifactType.CAPE].owned) mult += 0.2;
    if (gameData.skills[SkillType.FURY].active) mult *= 2;
    if (gameData.skills[SkillType.TEAM].active) mult *= 2;
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

      return result;
    },
    { isCrit: false, showCombo: false }
  )();
}

function damageVillain(amt) {
  try {
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
    if (gameData.villainCurrentHp <= 0) defeatVillain();
  } catch (error) {
    console.warn("Erro no damageVillain:", error);
  }
}

function defeatVillain() {
  try {
    gameData.villainsDefeated++;

    let reward = Math.floor(gameData.villainMaxHp / 2.5);
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

    if (currentVillain?.special && currentVillain.baseHP) {
      gameData.villainMaxHp = currentVillain.baseHP;
    }

    const growth = 1.4;
    gameData.villainMaxHp = Math.floor(
      20 * Math.pow(growth, gameData.level - 1)
    );
    gameData.villainCurrentHp = gameData.villainMaxHp;

    const v = villains[(gameData.level - 1) % villains.length];
    currentVillain = v;

    Renderer.updateVillainSprite(v, false);
    Renderer.hideSpecialVillainIndicator();
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
        if (
          a.type === AchievementType.KILLS &&
          gameData.villainsDefeated >= a.req
        )
          a.done = true;
        if (a.type === AchievementType.CLICKS && gameData.totalClicks >= a.req)
          a.done = true;
        if (a.type === AchievementType.LEVEL && gameData.level >= a.req)
          a.done = true;
      }
    }
  } catch (error) {
    console.warn("Erro no checkAchievements:", error);
  }
}

function buy(type, key) {
  try {
    const item =
      type === ItemType.HERO ? gameData.heroes[key] : gameData.upgrades[key];
    let cost = Math.floor(item.baseCost * Math.pow(1.2, item.count));

    if (gameData.score >= cost) {
      AudioSys.playBuy();
      gameData.score -= cost;
      item.count++;

      if (type === ItemType.HERO) gameData.autoDamage += item.dps;
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

    // Mapeamento usando SkillType
    const skills = [
      { id: "skill1", key: SkillType.FURY },
      { id: "skill2", key: SkillType.CRIT },
      { id: "skill3", key: SkillType.TEAM },
    ];
    skills.forEach((skill) => {
      const btn = document.getElementById(skill.id);
      if (btn) {
        btn.addEventListener("click", () => activateSkill(skill.key));
      }
    });

    const uiEvents = [
      {
        id: "btnOptionsDesktop",
        fn: () =>
          document.getElementById("settingsModal").classList.remove("hidden"),
      },
      {
        id: "btnMenuMobile",
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

setupEvents();
init();
