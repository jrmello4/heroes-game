import { gameData, dailyMissions } from "../core/GameData.js";
import { ErrorHandler } from "./ErrorHandler.js";

export const MissionSys = {
  currentMissions: [],
  missionProgress: {},
  missionStats: {
    skillsUsed: 0,
    clicksToday: 0,
    bossesDefeated: 0,
    maxComboToday: 0,
  },

  init() {
    this.checkDailyReset();
    this.generateDailyMissions();
    this.loadMissionProgress();
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
    }
  },

  generateDailyMissions() {
    if (gameData.dailyMissions.currentMissions.length === 0) {
      // Seleciona 3 missões aleatórias
      const shuffled = [...dailyMissions].sort(() => 0.5 - Math.random());
      gameData.dailyMissions.currentMissions = shuffled.slice(0, 3);

      // Inicializa progresso
      gameData.dailyMissions.currentMissions.forEach((mission) => {
        if (!gameData.dailyMissions.progress)
          gameData.dailyMissions.progress = {};
        gameData.dailyMissions.progress[mission.id] = 0;
      });
    }

    this.currentMissions = gameData.dailyMissions.currentMissions;
  },

  loadMissionProgress() {
    this.missionStats = gameData.dailyMissions.stats || {
      skillsUsed: 0,
      clicksToday: 0,
      bossesDefeated: 0,
      maxComboToday: 0,
    };
  },

  resetDailyMissions() {
    gameData.dailyMissions.currentMissions = [];
    gameData.dailyMissions.progress = {};
    gameData.dailyMissions.stats = {
      skillsUsed: 0,
      clicksToday: 0,
      bossesDefeated: 0,
      maxComboToday: 0,
    };
    this.missionStats = gameData.dailyMissions.stats;
  },

  updateProgress(missionType, amount = 1) {
    ErrorHandler.safeExecute(() => {
      // Atualiza estatísticas
      switch (missionType) {
        case "click":
          this.missionStats.clicksToday += amount;
          break;
        case "skill_use":
          this.missionStats.skillsUsed += amount;
          break;
        case "boss_kill":
          this.missionStats.bossesDefeated += amount;
          break;
        case "combo":
          if (amount > this.missionStats.maxComboToday) {
            this.missionStats.maxComboToday = amount;
          }
          break;
      }

      // Salva no gameData
      gameData.dailyMissions.stats = this.missionStats;

      // Verifica progresso das missões
      this.checkMissionsCompletion();
    })();
  },

  checkMissionsCompletion() {
    this.currentMissions.forEach((mission) => {
      if (gameData.dailyMissions.progress[mission.id] >= mission.target) return;

      let currentProgress = 0;

      switch (mission.type) {
        case "kill":
          currentProgress = gameData.villainsDefeated;
          break;
        case "skill_use":
          currentProgress = this.missionStats.skillsUsed;
          break;
        case "level_up":
          currentProgress = gameData.level;
          break;
        case "click":
          currentProgress = this.missionStats.clicksToday;
          break;
        case "boss_kill":
          currentProgress = this.missionStats.bossesDefeated;
          break;
        case "combo":
          currentProgress = this.missionStats.maxComboToday;
          break;
      }

      gameData.dailyMissions.progress[mission.id] = Math.min(
        currentProgress,
        mission.target
      );
    });
  },

  claimReward(missionId) {
    return ErrorHandler.safeExecute(() => {
      const mission = this.currentMissions.find((m) => m.id === missionId);
      if (!mission) return false;

      const progress = gameData.dailyMissions.progress[mission.id];
      if (progress < mission.target) return false;

      // Aplica recompensa
      if (mission.reward.crystals) {
        gameData.crystals += mission.reward.crystals;
      }
      if (mission.reward.gold) {
        gameData.score += mission.reward.gold;
      }

      // Marca como completada
      gameData.dailyMissions.completedToday++;

      // Remove a missão completada
      gameData.dailyMissions.currentMissions =
        gameData.dailyMissions.currentMissions.filter(
          (m) => m.id !== missionId
        );
      this.currentMissions = gameData.dailyMissions.currentMissions;

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
    return this.getCompletedMissionsCount() === this.currentMissions.length;
  },
};
