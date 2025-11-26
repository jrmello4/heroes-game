import { gameData, dailyMissions } from "../core/GameData.js";
import { ErrorHandler } from "./ErrorHandler.js";

export const MissionSys = {
  currentMissions: [],
  missionStats: {},
  needsUpdate: true,

  init() {
    this.checkDailyReset();
    this.generateDailyMissions();
    this.loadMissionProgress();
    this.needsUpdate = true;
  },

  checkDailyReset() {
    const now = Date.now();
    const lastReset = gameData.dailyMissions.lastReset;
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastReset >= oneDay) {
      this.resetDailyMissions();
      gameData.dailyMissions.lastReset = now;
      gameData.dailyMissions.completedToday = 0;
      gameData.dailyMissions.rewardsClaimed = false;
      this.needsUpdate = true;
    }
  },

  generateDailyMissions() {
    if (gameData.dailyMissions.currentMissions.length === 0) {
      const shuffled = [...dailyMissions].sort(() => 0.5 - Math.random());
      gameData.dailyMissions.currentMissions = shuffled.slice(0, 3);

      // Reseta progresso específico dessas missões
      gameData.dailyMissions.progress = {};
      gameData.dailyMissions.currentMissions.forEach((mission) => {
        gameData.dailyMissions.progress[mission.id] = 0;
      });

      this.needsUpdate = true;
    }
    this.currentMissions = gameData.dailyMissions.currentMissions;
  },

  loadMissionProgress() {
    // Garante estrutura
    if (!gameData.dailyMissions.stats) {
      gameData.dailyMissions.stats = {
        skillsUsed: 0,
        clicksToday: 0,
        bossesDefeated: 0,
        maxComboToday: 0,
        villainsDefeatedToday: 0, // Novo campo
      };
    }
    this.missionStats = gameData.dailyMissions.stats;
    if (this.missionStats.villainsDefeatedToday === undefined) {
      this.missionStats.villainsDefeatedToday = 0;
    }
  },

  resetDailyMissions() {
    gameData.dailyMissions.currentMissions = [];
    gameData.dailyMissions.progress = {};
    gameData.dailyMissions.stats = {
      skillsUsed: 0,
      clicksToday: 0,
      bossesDefeated: 0,
      maxComboToday: 0,
      villainsDefeatedToday: 0, // Reset
    };
    this.missionStats = gameData.dailyMissions.stats;
    this.needsUpdate = true;
  },

  updateProgress(missionType, amount = 1) {
    ErrorHandler.safeExecute(() => {
      let changed = false;
      switch (missionType) {
        case "click":
          this.missionStats.clicksToday += amount;
          changed = true;
          break;
        case "skill_use":
          this.missionStats.skillsUsed += amount;
          changed = true;
          break;
        case "boss_kill":
          this.missionStats.bossesDefeated += amount;
          changed = true;
          break;
        case "kill": // CORREÇÃO 5: Contagem diária
          this.missionStats.villainsDefeatedToday += amount;
          changed = true;
          break;
        case "combo":
          if (amount > this.missionStats.maxComboToday) {
            this.missionStats.maxComboToday = amount;
            changed = true;
          }
          break;
      }

      if (changed) {
        gameData.dailyMissions.stats = this.missionStats;
        this.checkMissionsCompletion();
      }
    })();
  },

  checkMissionsCompletion() {
    this.currentMissions.forEach((mission) => {
      const currentVal = gameData.dailyMissions.progress[mission.id] || 0;
      if (currentVal >= mission.target) return;

      let newVal = 0;
      switch (mission.type) {
        case "kill":
          // CORREÇÃO 5: Usar stats do dia, não total global
          newVal = this.missionStats.villainsDefeatedToday;
          break;
        case "skill_use":
          newVal = this.missionStats.skillsUsed;
          break;
        case "level_up":
          newVal = gameData.level; // Nível é ok ser global
          break;
        case "click":
          newVal = this.missionStats.clicksToday;
          break;
        case "boss_kill":
          newVal = this.missionStats.bossesDefeated;
          break;
        case "combo":
          newVal = this.missionStats.maxComboToday;
          break;
      }

      const cappedVal = Math.min(newVal, mission.target);

      if (cappedVal !== currentVal) {
        gameData.dailyMissions.progress[mission.id] = cappedVal;
        this.needsUpdate = true;
      }
    });
  },

  claimReward(missionId) {
    return ErrorHandler.safeExecute(() => {
      const mission = this.currentMissions.find((m) => m.id === missionId);
      if (!mission) return false;

      const progress = gameData.dailyMissions.progress[mission.id];
      if (progress < mission.target) return false;

      if (mission.reward.crystals) gameData.crystals += mission.reward.crystals;
      if (mission.reward.gold) gameData.score += mission.reward.gold;

      gameData.dailyMissions.completedToday++;

      // Remove a missão da lista atual
      gameData.dailyMissions.currentMissions =
        gameData.dailyMissions.currentMissions.filter(
          (m) => m.id !== missionId
        );
      this.currentMissions = gameData.dailyMissions.currentMissions;

      // Limpa o progresso dela pra economizar memória (opcional)
      delete gameData.dailyMissions.progress[missionId];

      this.needsUpdate = true;
      ErrorHandler.showSuccess(
        `Missão completada! +${mission.reward.crystals} cristais`
      );
      return true;
    }, false)();
  },

  getMissionProgress(missionId) {
    const progress = gameData.dailyMissions.progress[missionId] || 0;
    const mission = this.currentMissions.find((m) => m.id === missionId);
    return mission ? { progress, target: mission.target } : null;
  },

  getCompletedMissionsCount() {
    return this.currentMissions.filter((mission) => {
      const progress = gameData.dailyMissions.progress[mission.id] || 0;
      return progress >= mission.target;
    }).length;
  },

  hasCompletedAllMissions() {
    return (
      this.currentMissions.length === 0 &&
      gameData.dailyMissions.completedToday > 0
    );
  },
};
