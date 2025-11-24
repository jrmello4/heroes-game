import { gameData } from "../core/GameData.js";

export const SaveSys = {
  STORAGE_KEY: "heroClickerModularV2",

  save() {
    gameData.lastSaveTime = Date.now();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(gameData));
  },

  load() {
    const s = localStorage.getItem(this.STORAGE_KEY);
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
  },

  checkOfflineProgress(calculateDPSFn) {
    const now = Date.now();
    const diffMs = now - gameData.lastSaveTime;
    if (diffMs > 60000) {
      const seconds = diffMs / 1000;
      const dps = calculateDPSFn();
      if (dps > 0) {
        const earned = Math.floor(dps * seconds * 0.5);
        if (earned > 0) {
          gameData.score += earned;
          return {
            time: new Date(diffMs).toISOString().substr(11, 8),
            gold: earned,
          };
        }
      }
    }
    gameData.lastSaveTime = now;
    return null;
  },

  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  },
};
