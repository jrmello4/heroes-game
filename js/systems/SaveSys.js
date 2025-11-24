import { gameData } from "../core/GameData.js";

export const SaveSys = {
  STORAGE_KEY: "heroClickerModularV2_Encoded",
  SAVE_VERSION: "2.1",

  save() {
    try {
      gameData.lastSaveTime = Date.now();
      gameData.saveVersion = SaveSys.SAVE_VERSION; // Uso explícito de SaveSys

      const dataToSave = SaveSys.prepareDataForSave();
      const jsonString = JSON.stringify(dataToSave);

      // Codifica em Base64 para segurança básica
      const encodedData = btoa(jsonString);

      localStorage.setItem(SaveSys.STORAGE_KEY, encodedData);
      return true;
    } catch (error) {
      console.error("SaveSys: Erro ao salvar", error);
      return false;
    }
  },

  prepareDataForSave() {
    const saveData = {};
    const simpleFields = [
      "score",
      "crystals",
      "totalScoreRun",
      "villainsDefeated",
      "totalClicks",
      "startTime",
      "lastSaveTime",
      "level",
      "clickDamage",
      "autoDamage",
      "villainMaxHp",
      "villainCurrentHp",
      "combo",
    ];

    simpleFields.forEach((field) => {
      if (gameData[field] !== undefined) {
        saveData[field] = gameData[field];
      }
    });

    saveData.achievements = SaveSys.safeCopy(gameData.achievements, "done");
    saveData.upgrades = SaveSys.safeCopy(gameData.upgrades, "count");
    saveData.heroes = SaveSys.safeCopy(gameData.heroes, "count");
    saveData.artifacts = SaveSys.safeCopy(gameData.artifacts, "owned");
    saveData.skills = SaveSys.safeCopy(gameData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    saveData.dailyMissions = SaveSys.prepareMissionsForSave();
    saveData.saveVersion = SaveSys.SAVE_VERSION;
    return saveData;
  },

  prepareMissionsForSave() {
    return {
      lastReset: gameData.dailyMissions.lastReset,
      completedToday: gameData.dailyMissions.completedToday,
      currentMissions: gameData.dailyMissions.currentMissions,
      rewardsClaimed: gameData.dailyMissions.rewardsClaimed,
      progress: gameData.dailyMissions.progress,
      stats: gameData.dailyMissions.stats,
    };
  },

  safeCopy(source, properties) {
    const copy = {};
    for (const key in source) {
      if (source[key] && typeof source[key] === "object") {
        copy[key] = {};

        if (Array.isArray(properties)) {
          properties.forEach((prop) => {
            if (source[key][prop] !== undefined) {
              copy[key][prop] = source[key][prop];
            }
          });
        } else {
          if (source[key][properties] !== undefined) {
            copy[key][properties] = source[key][properties];
          }
        }
        copy[key].id = source[key].id || key;
      }
    }
    return copy;
  },

  load() {
    try {
      const saved = localStorage.getItem(SaveSys.STORAGE_KEY);

      // Suporte a migração do save antigo (sem encode)
      if (!saved) {
        const legacySave = localStorage.getItem("heroClickerModularV2");
        if (legacySave) {
          console.log("SaveSys: Migrando save legado...");
          const data = JSON.parse(legacySave);
          SaveSys.mergeData(data);
          SaveSys.save(); // Salva no novo formato
          return true;
        }
        return false;
      }

      let loadedData;
      try {
        const decodedString = atob(saved);
        loadedData = JSON.parse(decodedString);
      } catch (e) {
        console.warn(
          "SaveSys: Falha ao decodificar, tentando formato antigo..."
        );
        loadedData = JSON.parse(saved);
      }

      if (loadedData.saveVersion !== SaveSys.SAVE_VERSION) {
        return SaveSys.migrateSave(loadedData);
      }

      return SaveSys.mergeData(loadedData);
    } catch (error) {
      console.error("SaveSys: Erro ao carregar", error);
      SaveSys.createBackup();
      return false;
    }
  },

  mergeData(loadedData) {
    const fields = [
      "score",
      "crystals",
      "totalScoreRun",
      "villainsDefeated",
      "totalClicks",
      "startTime",
      "lastSaveTime",
      "level",
      "clickDamage",
      "autoDamage",
      "villainMaxHp",
      "villainCurrentHp",
      "combo",
    ];

    fields.forEach((field) => {
      if (loadedData[field] !== undefined) {
        gameData[field] = loadedData[field];
      }
    });

    SaveSys.mergeStructures(
      gameData.achievements,
      loadedData.achievements,
      "done"
    );
    SaveSys.mergeStructures(gameData.upgrades, loadedData.upgrades, "count");
    SaveSys.mergeStructures(gameData.heroes, loadedData.heroes, "count");
    SaveSys.mergeStructures(gameData.artifacts, loadedData.artifacts, "owned");
    SaveSys.mergeStructures(gameData.skills, loadedData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    SaveSys.mergeMissionsData(loadedData.dailyMissions);
    return true;
  },

  mergeMissionsData(loadedMissions) {
    if (!loadedMissions) return;

    if (!gameData.dailyMissions) {
      gameData.dailyMissions = {
        lastReset: Date.now(),
        completedToday: 0,
        currentMissions: [],
        rewardsClaimed: false,
        progress: {},
        stats: {
          skillsUsed: 0,
          clicksToday: 0,
          bossesDefeated: 0,
          maxComboToday: 0,
        },
      };
    }

    if (loadedMissions.lastReset)
      gameData.dailyMissions.lastReset = loadedMissions.lastReset;
    if (loadedMissions.completedToday !== undefined)
      gameData.dailyMissions.completedToday = loadedMissions.completedToday;
    if (loadedMissions.currentMissions)
      gameData.dailyMissions.currentMissions = loadedMissions.currentMissions;
    if (loadedMissions.rewardsClaimed !== undefined)
      gameData.dailyMissions.rewardsClaimed = loadedMissions.rewardsClaimed;
    if (loadedMissions.progress)
      gameData.dailyMissions.progress = loadedMissions.progress;
    if (loadedMissions.stats)
      gameData.dailyMissions.stats = loadedMissions.stats;
  },

  mergeStructures(target, source, properties) {
    if (!source) return;
    for (const key in source) {
      if (target[key] && source[key]) {
        if (Array.isArray(properties)) {
          properties.forEach((prop) => {
            if (source[key][prop] !== undefined) {
              target[key][prop] = source[key][prop];
            }
          });
        } else {
          if (source[key][properties] !== undefined) {
            target[key][properties] = source[key][properties];
          }
        }
      }
    }
  },

  migrateSave(oldData) {
    console.log("SaveSys: Migrando dados antigos");
    if (!oldData.dailyMissions) {
      oldData.dailyMissions = {
        lastReset: Date.now(),
        completedToday: 0,
        currentMissions: [],
        rewardsClaimed: false,
        progress: {},
        stats: {
          skillsUsed: 0,
          clicksToday: 0,
          bossesDefeated: 0,
          maxComboToday: 0,
        },
      };
    }
    return SaveSys.mergeData(oldData);
  },

  createBackup() {
    try {
      const backup = JSON.stringify(gameData);
      localStorage.setItem(`${SaveSys.STORAGE_KEY}_backup`, backup);
    } catch (error) {
      console.error("SaveSys: Erro ao criar backup", error);
    }
  },

  checkOfflineProgress(calculateDPSFn) {
    try {
      const now = Date.now();
      const diffMs = now - gameData.lastSaveTime;

      if (diffMs > 60000 && diffMs < 30 * 24 * 60 * 60 * 1000) {
        const seconds = Math.min(diffMs / 1000, 24 * 60 * 60);
        const dps = calculateDPSFn();

        if (dps > 0) {
          const earned = Math.floor(dps * seconds * 0.5);
          if (earned > 0) {
            gameData.score += earned;
            return {
              time: SaveSys.formatTime(seconds),
              gold: earned,
            };
          }
        }
      }

      gameData.lastSaveTime = now;
      return null;
    } catch (error) {
      console.error("SaveSys: Erro no progresso offline", error);
      return null;
    }
  },

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  },

  reset() {
    try {
      localStorage.removeItem(SaveSys.STORAGE_KEY);
      localStorage.removeItem("heroClickerModularV2"); // Limpa legado também
      return true;
    } catch (error) {
      console.error("SaveSys: Erro ao resetar", error);
      return false;
    }
  },
};
