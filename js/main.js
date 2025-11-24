import { gameData, villains, bosses } from "./data.js";
import { AudioSys } from "./systems/audio.js";

let engine = { lastTime: 0, isRunning: false };
let isBoss = false;
let bossTimeLeft = 0;
let activeCritBuff = false;
let comboTimer = null;

const els = {
  score: document.getElementById("scoreDisplay"),
  dps: document.getElementById("dpsDisplay"),
  hpText: document.getElementById("hpText"),
  hpBar: document.getElementById("hpBar"),
  villainName: document.getElementById("villainName"),
  villainIcon: document.getElementById("villainIcon"),
  villainSprite: document.getElementById("villainSprite"),
  clickZone: document.getElementById("clickZone"),
  startOverlay: document.getElementById("startOverlay"),
  settingsModal: document.getElementById("settingsModal"),
  gameZone: document.getElementById("gameZone"),
};

function startGame() {
  AudioSys.init();
  loadGame();
  els.startOverlay.classList.add("hidden");
  engine.isRunning = true;
  engine.lastTime = performance.now();
  checkOfflineProgress();

  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
  setInterval(() => {
    if (!isBoss && Math.random() > 0.7) spawnWeakPoint();
  }, 4000);
  setInterval(checkAchievements, 2000);

  updateUI();
  spawnVillain(false);
  checkEnvironment();
  setupEventListeners();
}

function gameLoop(currentTime) {
  if (!engine.isRunning) return;
  const dt = (currentTime - engine.lastTime) / 1000;
  engine.lastTime = currentTime;

  if (dt < 1.0) {
    updateLogic(dt);
  }
  requestAnimationFrame(gameLoop);
}

function updateLogic(dt) {
  let currentDps = calculateDPS();
  if (currentDps > 0) {
    damageVillain(currentDps * dt, true);
  }

  for (let k in gameData.skills) {
    let s = gameData.skills[k];
    if (s.cooldown > 0) s.cooldown -= dt;
    if (s.active) {
      s.duration -= dt;
      if (s.duration <= 0) {
        s.active = false;
        if (k === "crit") activeCritBuff = false;
        updateSkillUI(k);
      }
    }
    updateSkillUI(k);
  }

  if (isBoss) {
    bossTimeLeft -= dt;
    document.getElementById("bossTimerText").innerText =
      Math.ceil(bossTimeLeft) + "s";
    document.getElementById("bossTimerBar").style.width =
      (bossTimeLeft / 30) * 100 + "%";
    if (bossTimeLeft <= 0) failBoss();
  }
}

function handleInput(x, y, forcedCrit = false) {
  gameData.totalClicks++;

  if (comboTimer) clearTimeout(comboTimer);
  gameData.combo++;
  if (gameData.combo > 5) {
    document.getElementById("comboContainer").classList.remove("hidden");
    document.getElementById("comboText").innerText = `x${gameData.combo}`;
    comboTimer = setTimeout(() => {
      gameData.combo = 0;
      document.getElementById("comboContainer").classList.add("hidden");
    }, 1200);
  }

  let dmg = gameData.clickDamage;
  let mult = 1 + gameData.crystals * 0.1;
  mult += getAchievementBonus();
  if (gameData.artifacts.ring.owned) mult += 0.2;
  if (gameData.skills.team.active) mult *= 2;
  if (gameData.combo > 10) mult *= 1.5;

  let isCrit =
    Math.random() < 0.05 ||
    (activeCritBuff && Math.random() < 0.5) ||
    forcedCrit;

  if (isCrit) {
    mult *= 5;
    if (forcedCrit) mult *= 2;
    AudioSys.playCrit();
    spawnFloatingText(x, y, "CRÍTICO!", "text-yellow-400", 2.0);
    triggerScreenShake();
    flashScreen();
  } else {
    AudioSys.playClick();
    spawnFloatingText(x, y, "POW!", "text-white", 1.0);
  }

  damageVillain(dmg * mult);

  els.villainSprite.classList.remove("villain-hit");
  void els.villainSprite.offsetWidth;
  els.villainSprite.classList.add("villain-hit");
}

function spawnFloatingText(x, y, text, colorClass, scale = 1.0) {
  const el = document.createElement("div");
  el.innerText = text;
  el.className = `font-comic font-bold absolute pointer-events-none z-50 ${colorClass}`;
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.fontSize = 24 * scale + "px";
  el.style.textShadow = "2px 2px 0 #000";
  el.style.animation = "floatUp 0.8s ease-out forwards";

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function damageVillain(amt) {
  gameData.villainCurrentHp -= amt;
  if (gameData.villainCurrentHp <= 0) {
    defeatVillain();
  }
  updateHpVisual();
}

function defeatVillain() {
  gameData.villainsDefeated++;
  let reward = Math.floor(gameData.villainMaxHp / 2.5);
  if (gameData.artifacts.amulet.owned) reward *= 1.1;
  if (isBoss) reward *= 10;

  gameData.score += reward;
  gameData.totalScoreRun += reward;

  if (Math.random() < 0.02) rollArtifact();

  if (isBoss) {
    AudioSys.playLevelUp();
    showNotification("CHEFE DERROTADO!", "bg-yellow-400");
    gameData.level++;
    isBoss = false;
    checkEnvironment();
    document.getElementById("bossTimerContainer").classList.add("hidden");
  } else if (gameData.villainsDefeated % 10 === 0) {
    startBossFight();
    return;
  }

  spawnVillain();
  updateUI();
}

function startBossFight() {
  isBoss = true;
  document.getElementById("bossTimerContainer").classList.remove("hidden");
  bossTimeLeft = 30;
  const bossIdx = Math.floor((gameData.level / 5) % bosses.length);
  gameData.villainMaxHp *= 8;
  gameData.villainCurrentHp = gameData.villainMaxHp;
  els.villainName.innerText = bosses[bossIdx];
  els.villainIcon.className = "fas fa-dragon";
  els.villainSprite.className =
    "text-[9rem] md:text-[11rem] transition-transform filter drop-shadow-2xl text-red-600 relative";
  showNotification("⚠️ CHEFE ⚠️", "bg-red-600 text-white");
  updateHpVisual();
}

function failBoss() {
  isBoss = false;
  document.getElementById("bossTimerContainer").classList.add("hidden");
  showNotification("O Chefe fugiu!", "bg-gray-600 text-white");
  spawnVillain();
}

function spawnVillain() {
  if (isBoss) return;
  const growth = 1.4;
  gameData.villainMaxHp = Math.floor(20 * Math.pow(growth, gameData.level - 1));
  gameData.villainCurrentHp = gameData.villainMaxHp;
  const v = villains[(gameData.level - 1) % villains.length];
  els.villainName.innerText = `Nvl ${gameData.level} ${v.name}`;
  els.villainIcon.className = `fas ${v.icon}`;
  els.villainSprite.className = `text-[8rem] md:text-[10rem] transition-transform filter drop-shadow-2xl ${v.color} relative`;
  updateHpVisual();
}

function spawnWeakPoint() {
  const existing = document.querySelector(".weak-point");
  if (existing) existing.remove();

  const rect = els.clickZone.getBoundingClientRect();
  const point = document.createElement("div");
  point.className = "weak-point";

  const rx = Math.random() * (rect.width - 60);
  const ry = Math.random() * (rect.height - 60);

  point.style.left = rx + "px";
  point.style.top = ry + "px";

  point.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleInput(e.clientX, e.clientY, true);
    point.remove();
  };

  els.clickZone.appendChild(point);
  setTimeout(() => {
    if (point.parentNode) point.remove();
  }, 2500);
}

function calculateDPS() {
  let dps = gameData.autoDamage;
  let mult = 1 + gameData.crystals * 0.1;
  mult += getAchievementBonus();
  if (gameData.artifacts.cape.owned) mult += 0.2;
  if (gameData.skills.fury.active) mult *= 2;
  if (gameData.skills.team.active) mult *= 2;
  return dps * mult;
}

function getAchievementBonus() {
  let bonus = 0;
  Object.values(gameData.achievements).forEach((a) => {
    if (a.done) bonus += a.reward;
  });
  return bonus;
}

function activateSkill(key) {
  const s = gameData.skills[key];
  if (s.cooldown > 0) return;
  s.active = true;
  s.cooldown = s.maxCooldown;
  s.duration = key === "fury" ? 5 : 10;
  if (key === "crit") activeCritBuff = true;
  AudioSys.playBuy();
  showNotification(`${key.toUpperCase()}!`, "bg-blue-500 text-white");
  updateSkillUI(key);
}

function rollArtifact() {
  const available = Object.keys(gameData.artifacts).filter(
    (k) => !gameData.artifacts[k].owned
  );
  if (available.length === 0) return;
  const key = available[Math.floor(Math.random() * available.length)];
  gameData.artifacts[key].owned = true;
  showNotification(`Item Raro!`, "bg-purple-500 text-yellow-200");
  renderShop();
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
    updateUI();
    renderShop();
  }
}

function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return Math.floor(num);
}

function updateUI() {
  els.score.innerText = formatNumber(Math.floor(gameData.score));
  els.dps.innerText = formatNumber(Math.floor(calculateDPS()));
  document.getElementById("levelDisplay").innerText = gameData.level;
  const pGain = Math.floor(gameData.totalScoreRun / 1000000);
  document.getElementById("prestigeGain").innerText = pGain;

  if (gameData.crystals > 0) {
    const pc = document.getElementById("prestigeCount");
    pc.classList.remove("hidden");
    pc.innerHTML = `<i class="fas fa-gem"></i> ${gameData.crystals}`;
  }
}

function updateHpVisual() {
  const pct = Math.max(
    0,
    (gameData.villainCurrentHp / gameData.villainMaxHp) * 100
  );
  els.hpBar.style.width = `${pct}%`;
  els.hpText.innerText = `${formatNumber(
    Math.ceil(gameData.villainCurrentHp)
  )} / ${formatNumber(gameData.villainMaxHp)}`;
}

function renderShop() {
  let uHtml = "";
  Object.keys(gameData.upgrades).forEach((k) => {
    const u = gameData.upgrades[k];
    let cost = Math.floor(u.baseCost * Math.pow(1.2, u.count));
    uHtml += createShopItem(
      u.name,
      `+${u.boost} Clique`,
      cost,
      u.count,
      u.icon,
      `window.game.buy('upgrade','${k}')`,
      gameData.score >= cost
    );
  });
  document.getElementById("panelUpgrades").innerHTML = uHtml;

  let hHtml = "";
  Object.keys(gameData.heroes).forEach((k) => {
    const h = gameData.heroes[k];
    let cost = Math.floor(h.baseCost * Math.pow(1.2, h.count));
    hHtml += createShopItem(
      h.name,
      `+${h.dps} DPS`,
      cost,
      h.count,
      h.icon,
      `window.game.buy('hero','${k}')`,
      gameData.score >= cost,
      h.color
    );
  });
  document.getElementById("panelHeroes").innerHTML = hHtml;

  let aHtml = "";
  Object.keys(gameData.artifacts).forEach((k) => {
    const a = gameData.artifacts[k];
    aHtml += `
        <div class="comic-box p-2 flex flex-col items-center text-center ${
          a.owned ? "bg-yellow-100 border-yellow-500" : "bg-gray-200 opacity-60"
        }">
            <i class="fas ${a.icon} ${a.color} text-2xl mb-1"></i>
            <div class="font-bold text-xs leading-tight">${a.name}</div>
            <div class="text-[10px] mt-1 font-bold text-gray-600">${
              a.owned ? a.desc : "???"
            }</div>
        </div>`;
  });
  document.getElementById("panelArtifacts").innerHTML = aHtml;
}

function createShopItem(
  name,
  effect,
  cost,
  level,
  icon,
  action,
  canBuy,
  colorClass = "text-gray-800"
) {
  return `<div class="comic-box p-2 flex items-center gap-2 mb-1 ${
    canBuy ? "bg-white" : "bg-gray-100"
  }">
        <div class="w-10 h-10 flex items-center justify-center text-xl border-2 border-black bg-gray-50 shrink-0"><i class="fas ${icon} ${colorClass}"></i></div>
        <div class="flex-1 min-w-0"><div class="font-bold text-sm truncate leading-none mb-1">${name}</div><div class="text-xs text-blue-600 font-bold">${effect} <span class="text-gray-400 ml-1">Nvl ${level}</span></div></div>
        <button onclick="${action}" class="comic-btn px-2 py-2 w-20 flex flex-col items-center justify-center ${
    canBuy ? "bg-yellow-400 hover:bg-yellow-300" : "bg-gray-300"
  }" ${
    !canBuy ? "disabled" : ""
  }><span class="text-xs font-bold leading-none">${formatNumber(
    cost
  )}</span></button>
    </div>`;
}

function updateSkillUI(key) {
  const s = gameData.skills[key];
  const btn = document.getElementById(
    `skill${key === "fury" ? 1 : key === "crit" ? 2 : 3}`
  );
  const bar = document.getElementById(`cd-${key}`);

  if (s.active) {
    btn.classList.add("border-yellow-400", "pulse-glow");
    bar.style.height = "0";
  } else if (s.cooldown > 0) {
    btn.classList.remove("border-yellow-400", "pulse-glow");
    btn.disabled = true;
    const pct = (s.cooldown / s.maxCooldown) * 100;
    bar.style.height = `${pct}%`;
  } else {
    btn.classList.remove("border-yellow-400", "pulse-glow");
    btn.disabled = false;
    bar.style.height = "0";
  }
}

function setupEventListeners() {
  els.startOverlay.addEventListener("click", startGame);
  els.clickZone.addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("weak-point")) return;
    e.preventDefault();
    handleInput(e.clientX, e.clientY);
  });

  ["upgrades", "heroes", "artifacts"].forEach((t) => {
    document
      .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
      .addEventListener("click", () => switchTab(t));
  });

  document
    .getElementById("btnOptionsDesktop")
    .addEventListener("click", () =>
      els.settingsModal.classList.remove("hidden")
    );
  document
    .getElementById("btnMenuMobile")
    .addEventListener("click", () =>
      els.settingsModal.classList.remove("hidden")
    );
  document
    .getElementById("btnCloseSettings")
    .addEventListener("click", () => els.settingsModal.classList.add("hidden"));
  document.getElementById("btnSave").addEventListener("click", manualSave);
  document.getElementById("muteBtn").addEventListener("click", (e) => {
    e.target.innerText = AudioSys.toggleMute() ? "DESLIGADO" : "LIGADO";
  });
  document.getElementById("btnPrestige").addEventListener("click", doPrestige);
  document
    .getElementById("btnClaimOffline")
    .addEventListener("click", () =>
      document.getElementById("offlineModal").classList.add("hidden")
    );
}

function saveGame() {
  gameData.lastSaveTime = Date.now();
  localStorage.setItem("heroClickerModular", JSON.stringify(gameData));
  showNotification("Jogo Salvo", "bg-gray-800 text-white text-xs");
}

function loadGame() {
  const s = localStorage.getItem("heroClickerModular");
  if (s) {
    const d = JSON.parse(s);
    for (let k in d) {
      if (typeof d[k] === "object" && d[k] !== null && !Array.isArray(d[k])) {
        for (let sk in d[k]) {
          if (gameData[k] && gameData[k][sk]) {
            if (k === "upgrades" || k === "heroes")
              gameData[k][sk].count = d[k][sk].count;
            else if (k === "artifacts" || k === "achievements") {
              gameData[k][sk].done = d[k][sk].done;
              gameData[k][sk].owned = d[k][sk].owned;
            }
          }
        }
      } else {
        gameData[k] = d[k];
      }
    }
  }
}

function checkOfflineProgress() {
  const now = Date.now();
  const diffMs = now - gameData.lastSaveTime;
  if (diffMs > 60000) {
    const seconds = diffMs / 1000;
    const dps = calculateDPS();
    if (dps > 0) {
      const earned = Math.floor(dps * seconds * 0.5);
      if (earned > 0) {
        gameData.score += earned;
        document.getElementById("offlineTime").innerText = new Date(diffMs)
          .toISOString()
          .substr(11, 8);
        document.getElementById("offlineGold").innerText = formatNumber(earned);
        document.getElementById("offlineModal").classList.remove("hidden");
      }
    }
  }
  gameData.lastSaveTime = now;
}

function showNotification(text, classes) {
  const n = document.createElement("div");
  n.className = `comic-box px-4 py-2 font-comic text-lg shadow-xl ${classes} transform transition-all duration-500`;
  n.innerText = text;
  document.getElementById("notificationArea").appendChild(n);
  requestAnimationFrame(() => {
    n.style.transform = "translateX(-10px)";
  });
  setTimeout(() => {
    n.style.opacity = "0";
    setTimeout(() => n.remove(), 500);
  }, 2000);
}

function triggerScreenShake() {
  document.body.classList.remove("shake-screen");
  void document.body.offsetWidth;
  document.body.classList.add("shake-screen");
}

function flashScreen() {
  const f = document.getElementById("critFlash");
  f.classList.add("active");
  setTimeout(() => f.classList.remove("active"), 100);
}

function checkEnvironment() {
  const zone = Math.floor((gameData.level - 1) / 5);
  const el = document.getElementById("gameZone");
  el.classList.remove("bg-city", "bg-sewer", "bg-space");

  if (zone % 3 === 0) el.classList.add("bg-city");
  else if (zone % 3 === 1) el.classList.add("bg-sewer");
  else el.classList.add("bg-space");
}

function manualSave() {
  saveGame();
  els.settingsModal.classList.add("hidden");
}

function doPrestige() {
  const pGain = Math.floor(gameData.totalScoreRun / 1000000);
  if (pGain <= 0) return;

  localStorage.removeItem("heroClickerModular");

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

  localStorage.setItem("heroClickerModular", JSON.stringify(newData));
  location.reload();
}

function checkAchievements() {
  let changed = false;
  const list = document.getElementById("miniAchievementList");
  list.innerHTML = "";

  for (let k in gameData.achievements) {
    const a = gameData.achievements[k];
    if (!a.done) {
      if (a.type === "kills" && gameData.villainsDefeated >= a.req)
        a.done = true;
      if (a.type === "clicks" && gameData.totalClicks >= a.req) a.done = true;
      if (a.type === "level" && gameData.level >= a.req) a.done = true;

      if (a.done) {
        changed = true;
        showNotification(`Conquista: ${a.name}!`, "bg-blue-600 text-white");
      }
    }
    if (a.done) {
      list.innerHTML += `<div class="text-xs font-bold text-green-600">✔ ${
        a.name
      } (+${a.reward * 10}%)</div>`;
    }
  }
  if (changed) updateUI();
}

function switchTab(tab) {
  ["upgrades", "heroes", "artifacts"].forEach((t) => {
    document
      .getElementById("panel" + t.charAt(0).toUpperCase() + t.slice(1))
      .classList.add("hidden");
    const btn = document.getElementById(
      "tab" + t.charAt(0).toUpperCase() + t.slice(1)
    );
    btn.classList.remove("bg-yellow-300", "top-[2px]");
    btn.classList.add("bg-gray-200");
  });
  document
    .getElementById("panel" + tab.charAt(0).toUpperCase() + tab.slice(1))
    .classList.remove("hidden");
  const actBtn = document.getElementById(
    "tab" + tab.charAt(0).toUpperCase() + tab.slice(1)
  );
  actBtn.classList.remove("bg-gray-200");
  actBtn.classList.add("bg-yellow-300", "top-[2px]");
  renderShop();
}

window.game = {
  buy,
  activateSkill,
};
