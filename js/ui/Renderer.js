import { gameData, bosses } from "../core/GameData.js";

const els = {
  score: document.getElementById("scoreDisplay"),
  dps: document.getElementById("dpsDisplay"),
  hpText: document.getElementById("hpText"),
  hpBar: document.getElementById("hpBar"),
  level: document.getElementById("levelDisplay"),
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
};

function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return Math.floor(num);
}

export const Renderer = {
  updateStats(dps) {
    els.score.innerText = formatNumber(Math.floor(gameData.score));
    els.dps.innerText = formatNumber(Math.floor(dps));
    els.level.innerText = gameData.level;

    const pGain = Math.floor(gameData.totalScoreRun / 1000000);
    els.prestigeGain.innerText = pGain;

    if (gameData.crystals > 0) {
      els.prestigeCount.classList.remove("hidden");
      els.prestigeCount.innerHTML = `<i class="fas fa-gem"></i> ${gameData.crystals}`;
    }
  },

  updateVillainHealth() {
    const pct = Math.max(
      0,
      (gameData.villainCurrentHp / gameData.villainMaxHp) * 100
    );
    els.hpBar.style.width = `${pct}%`;
    els.hpText.innerText = `${formatNumber(
      Math.ceil(gameData.villainCurrentHp)
    )} / ${formatNumber(gameData.villainMaxHp)}`;
  },

  updateBossTimer(timeLeft) {
    els.bossTimerText.innerText = Math.ceil(timeLeft) + "s";
    els.bossTimerBar.style.width = (timeLeft / 30) * 100 + "%";
  },

  toggleBossUI(isBoss) {
    if (isBoss) els.bossContainer.classList.remove("hidden");
    else els.bossContainer.classList.add("hidden");
  },

  updateVillainSprite(v, isBoss) {
    els.villainName.innerText = isBoss ? v : `Nvl ${gameData.level} ${v.name}`;
    els.villainIcon.className = isBoss ? "fas fa-dragon" : `fas ${v.icon}`;
    els.villainSprite.className = isBoss
      ? "text-[9rem] md:text-[11rem] transition-transform filter drop-shadow-2xl text-red-600 relative"
      : `text-[8rem] md:text-[10rem] transition-transform filter drop-shadow-2xl ${v.color} relative`;
  },

  animateHit() {
    els.villainSprite.classList.remove("villain-hit");
    void els.villainSprite.offsetWidth;
    els.villainSprite.classList.add("villain-hit");
  },

  updateCombo(val) {
    els.comboContainer.classList.remove("hidden");
    els.comboText.innerText = `x${val}`;
  },

  updateSkillCooldown(key, cooldown, max, active) {
    const btn = document.getElementById(
      `skill${key === "fury" ? 1 : key === "crit" ? 2 : 3}`
    );
    const bar = document.getElementById(`cd-${key}`);

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
    const zone = Math.floor((level - 1) / 5);
    els.gameZone.classList.remove("bg-city", "bg-sewer", "bg-space");
    if (zone % 3 === 0) els.gameZone.classList.add("bg-city");
    else if (zone % 3 === 1) els.gameZone.classList.add("bg-sewer");
    else els.gameZone.classList.add("bg-space");
  },

  formatNumber,
};
