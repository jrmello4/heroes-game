import { gameData, villains, bosses } from "./core/GameData.js";
import { Engine } from "./core/Engine.js";
import { AudioSys } from "./systems/AudioSys.js";
import { SaveSys } from "./systems/SaveSys.js";
import { InputSys } from "./systems/InputSys.js";
import { Renderer } from "./ui/Renderer.js";
import { Shop } from "./ui/Shop.js";

let isBoss = false;
let bossTimeLeft = 0;
let activeCritBuff = false;

function init() {
  AudioSys.init();
  SaveSys.load();

  document.getElementById("startOverlay").classList.add("hidden");

  const offlineData = SaveSys.checkOfflineProgress(calculateDPS);
  if (offlineData) {
    document.getElementById("offlineTime").innerText = offlineData.time;
    document.getElementById("offlineGold").innerText = Renderer.formatNumber(
      offlineData.gold
    );
    document.getElementById("offlineModal").classList.remove("hidden");
  }

  Engine.init(update, render);
  Engine.start();

  setInterval(() => SaveSys.save(), 5000);
  setInterval(() => {
    if (!isBoss && Math.random() > 0.7) spawnWeakPoint();
  }, 4000);
  setInterval(checkAchievements, 2000);

  render();
  spawnVillain(false);
  Renderer.updateEnvironment(gameData.level);
  Shop.render();
}

function update(dt) {
  let currentDps = calculateDPS();
  if (currentDps > 0) damageVillain(currentDps * dt);

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

  if (isBoss) {
    bossTimeLeft -= dt;
    if (bossTimeLeft <= 0) failBoss();
  }
}

function render() {
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
  return Object.values(gameData.achievements).reduce(
    (acc, a) => (a.done ? acc + a.reward : acc),
    0
  );
}

function handleInput(x, y, forcedCrit = false) {
  let bonusMult = 1 + gameData.crystals * 0.1 + getAchievementBonus();
  if (gameData.artifacts.ring.owned) bonusMult += 0.2;
  if (gameData.skills.team.active) bonusMult *= 2;

  const result = InputSys.handleClick(
    x,
    y,
    forcedCrit,
    activeCritBuff,
    bonusMult,
    damageVillain
  );

  if (result && result.showCombo) Renderer.updateCombo(gameData.combo);
  Renderer.animateHit();
}

function damageVillain(amt) {
  gameData.villainCurrentHp -= amt;
  if (gameData.villainCurrentHp <= 0) defeatVillain();
}

function defeatVillain() {
  gameData.villainsDefeated++;

  let reward = Math.floor(gameData.villainMaxHp / 2.5);
  if (gameData.artifacts.amulet.owned) reward *= 1.1;
  if (isBoss) reward *= 10;

  gameData.score += reward;
  gameData.totalScoreRun += reward;

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
}

function failBoss() {
  isBoss = false;
  Renderer.toggleBossUI(false);
  spawnVillain();
}

function spawnVillain() {
  if (isBoss) return;
  const growth = 1.4;
  gameData.villainMaxHp = Math.floor(20 * Math.pow(growth, gameData.level - 1));
  gameData.villainCurrentHp = gameData.villainMaxHp;

  const v = villains[(gameData.level - 1) % villains.length];
  Renderer.updateVillainSprite(v, false);
}

function spawnWeakPoint() {
  const rect = document.getElementById("clickZone").getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "weak-point";

  el.style.left = Math.random() * (rect.width - 60) + "px";
  el.style.top = Math.random() * (rect.height - 60) + "px";

  el.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleInput(e.clientX, e.clientY, true);
    el.remove();
  };

  document.getElementById("clickZone").appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, 2500);
}

function checkAchievements() {
  for (let k in gameData.achievements) {
    const a = gameData.achievements[k];
    if (!a.done) {
      if (a.type === "kills" && gameData.villainsDefeated >= a.req)
        a.done = true;
      if (a.type === "clicks" && gameData.totalClicks >= a.req) a.done = true;
      if (a.type === "level" && gameData.level >= a.req) a.done = true;
    }
  }
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

  localStorage.setItem(SaveSys.STORAGE_KEY, JSON.stringify(newData));
  location.reload();
}

function setupEvents() {
  document.getElementById("startOverlay").addEventListener("click", init);

  document.getElementById("clickZone").addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("weak-point")) return;
    e.preventDefault();
    handleInput(e.clientX, e.clientY);
  });

  ["upgrades", "heroes", "artifacts"].forEach((t) => {
    document
      .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
      .addEventListener("click", () => {
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
  });

  document
    .getElementById("btnOptionsDesktop")
    .addEventListener("click", () =>
      document.getElementById("settingsModal").classList.remove("hidden")
    );
  document
    .getElementById("btnMenuMobile")
    .addEventListener("click", () =>
      document.getElementById("settingsModal").classList.remove("hidden")
    );
  document
    .getElementById("btnCloseSettings")
    .addEventListener("click", () =>
      document.getElementById("settingsModal").classList.add("hidden")
    );

  document.getElementById("btnSave").addEventListener("click", () => {
    SaveSys.save();
    document.getElementById("settingsModal").classList.add("hidden");
  });

  document.getElementById("btnPrestige").addEventListener("click", doPrestige);

  document.getElementById("muteBtn").addEventListener("click", (e) => {
    e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO";
  });

  document
    .getElementById("btnClaimOffline")
    .addEventListener("click", () =>
      document.getElementById("offlineModal").classList.add("hidden")
    );
}

window.game = {
  buy,
  activateSkill,
};

setupEvents();
