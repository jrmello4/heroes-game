import { gameData } from "../core/GameData.js";

export const SaveSys = {
  STORAGE_KEY: "heroClickerModularV2",
  SAVE_VERSION: "2.0",

  save() {
    try {
      gameData.lastSaveTime = Date.now();
      gameData.saveVersion = this.SAVE_VERSION;

      const dataToSave = this.prepareDataForSave();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error("SaveSys: Erro ao salvar", error);
      return false;
    }
  },

  prepareDataForSave() {
    // Cria uma cópia segura dos dados
    const saveData = {};

    // Campos simples
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

    // Estruturas complexas com validação
    saveData.achievements = this.safeCopy(gameData.achievements, "done");
    saveData.upgrades = this.safeCopy(gameData.upgrades, "count");
    saveData.heroes = this.safeCopy(gameData.heroes, "count");
    saveData.artifacts = this.safeCopy(gameData.artifacts, "owned");
    saveData.skills = this.safeCopy(gameData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    saveData.saveVersion = this.SAVE_VERSION;
    return saveData;
  },

  safeCopy(source, properties) {
    const copy = {};
    for (const key in source) {
      if (source[key] && typeof source[key] === "object") {
        copy[key] = {};

        // Copia propriedades específicas
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

        // Mantém estrutura básica
        copy[key].id = source[key].id || key;
      }
    }
    return copy;
  },

  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return false;

      const loadedData = JSON.parse(saved);

      // Verifica versão do save
      if (loadedData.saveVersion !== this.SAVE_VERSION) {
        console.warn("SaveSys: Versão de save diferente, migração necessária");
        return this.migrateSave(loadedData);
      }

      return this.mergeData(loadedData);
    } catch (error) {
      console.error("SaveSys: Erro ao carregar", error);
      this.createBackup();
      return false;
    }
  },

  mergeData(loadedData) {
    // Merge seguro campo por campo
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

    // Merge de estruturas complexas
    this.mergeStructures(
      gameData.achievements,
      loadedData.achievements,
      "done"
    );
    this.mergeStructures(gameData.upgrades, loadedData.upgrades, "count");
    this.mergeStructures(gameData.heroes, loadedData.heroes, "count");
    this.mergeStructures(gameData.artifacts, loadedData.artifacts, "owned");
    this.mergeStructures(gameData.skills, loadedData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    return true;
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
    // Implementar lógica de migração se necessário
    return this.mergeData(oldData);
  },

  createBackup() {
    try {
      const backup = JSON.stringify(gameData);
      localStorage.setItem(`${this.STORAGE_KEY}_backup`, backup);
    } catch (error) {
      console.error("SaveSys: Erro ao criar backup", error);
    }
  },

  checkOfflineProgress(calculateDPSFn) {
    try {
      const now = Date.now();
      const diffMs = now - gameData.lastSaveTime;

      if (diffMs > 60000 && diffMs < 30 * 24 * 60 * 60 * 1000) {
        // Máximo 30 dias
        const seconds = Math.min(diffMs / 1000, 24 * 60 * 60); // Máximo 24 horas
        const dps = calculateDPSFn();

        if (dps > 0) {
          const earned = Math.floor(dps * seconds * 0.5);
          if (earned > 0) {
            gameData.score += earned;
            return {
              time: this.formatTime(seconds),
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
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("SaveSys: Erro ao resetar", error);
      return false;
    }
  },
};
