import { gameData } from "../core/GameData.js";
import { SkillType, ArtifactType } from "../core/Constants.js"; // Importe para checar artefatos

export const SaveSys = {
  STORAGE_KEY: "heroClickerModularV2_Encoded",
  SAVE_VERSION: "2.2", // Incrementei a versão

  save() {
    try {
      gameData.lastSaveTime = Date.now();
      gameData.saveVersion = SaveSys.SAVE_VERSION;

      const dataToSave = SaveSys.prepareDataForSave();
      const jsonString = JSON.stringify(dataToSave);

      // CORREÇÃO 2: encodeURIComponent para suportar emojis/utf-8
      const encodedData = btoa(encodeURIComponent(jsonString));

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

    // CORREÇÃO 1: Salvando 'rank' além de 'count'
    saveData.heroes = SaveSys.safeCopy(gameData.heroes, ["count", "rank"]);

    saveData.artifacts = SaveSys.safeCopy(gameData.artifacts, "owned");
    saveData.skills = SaveSys.safeCopy(gameData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    saveData.dailyMissions = SaveSys.prepareMissionsForSave();
    saveData.saveVersion = SaveSys.SAVE_VERSION;

    // Salvar progresso de sessão
    saveData.sessionProgress = gameData.sessionProgress;

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

      if (!saved) {
        // Fallback legado
        const legacySave = localStorage.getItem("heroClickerModularV2");
        if (legacySave) {
          console.log("SaveSys: Migrando save legado...");
          const data = JSON.parse(legacySave);
          SaveSys.mergeData(data);
          SaveSys.save();
          return true;
        }
        return false;
      }

      let loadedData;
      try {
        // CORREÇÃO 2: Decode antes de atob
        const decodedString = decodeURIComponent(atob(saved));
        loadedData = JSON.parse(decodedString);
      } catch (e) {
        console.warn(
          "SaveSys: Falha ao decodificar (formato antigo?), tentando parse direto..."
        );
        try {
          loadedData = JSON.parse(atob(saved)); // Tenta sem decodeURI para compatibilidade
        } catch (e2) {
          loadedData = JSON.parse(saved); // Tenta raw (desespero)
        }
      }

      if (loadedData.saveVersion !== SaveSys.SAVE_VERSION) {
        // Lógica de migração simples se necessário
      }

      return SaveSys.mergeData(loadedData);
    } catch (error) {
      console.error("SaveSys: Erro ao carregar", error);
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

    // CORREÇÃO 1: Carregando 'rank'
    SaveSys.mergeStructures(gameData.heroes, loadedData.heroes, [
      "count",
      "rank",
    ]);

    SaveSys.mergeStructures(gameData.artifacts, loadedData.artifacts, "owned");
    SaveSys.mergeStructures(gameData.skills, loadedData.skills, [
      "active",
      "cooldown",
      "duration",
    ]);

    if (loadedData.sessionProgress) {
      gameData.sessionProgress = loadedData.sessionProgress;
    }

    SaveSys.mergeMissionsData(loadedData.dailyMissions);
    return true;
  },

  mergeMissionsData(loadedMissions) {
    if (!loadedMissions) return;
    if (!gameData.dailyMissions) gameData.dailyMissions = {};

    // Garante que a estrutura existe
    const defaults = {
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
        villainsDefeatedToday: 0,
      },
    };

    Object.keys(defaults).forEach((key) => {
      if (loadedMissions[key] !== undefined) {
        gameData.dailyMissions[key] = loadedMissions[key];
      } else {
        gameData.dailyMissions[key] = defaults[key];
      }
    });
  },

  mergeStructures(target, source, properties) {
    if (!source) return;
    for (const key in source) {
      if (target[key]) {
        // Removeu check source[key] redundante, o loop já garante
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

  checkOfflineProgress(calculateDPSFn) {
    try {
      const now = Date.now();
      const diffMs = now - gameData.lastSaveTime;

      if (diffMs > 60000 && diffMs < 30 * 24 * 60 * 60 * 1000) {
        const seconds = Math.min(diffMs / 1000, 24 * 60 * 60);

        // CORREÇÃO 4: Calcular DPS "limpo" (sem buffs temporários)
        // Recalculamos manualmente o DPS base aqui para evitar buffs ativos
        let dps = gameData.autoDamage || 0;

        // Aplica apenas multiplicadores permanentes (Cristais, Artefatos, Achievements)
        // Nota: Assumimos que achievements já estão calculados ou pegamos do cache se possível,
        // mas por segurança usamos apenas os dados brutos seguros.

        let mult = 1 + (gameData.crystals || 0) * 0.1;
        if (gameData.artifacts && gameData.artifacts[ArtifactType.CAPE]?.owned)
          mult += 0.2;

        // Bônus de conquistas seria ideal pegar, mas vamos assumir que o calculateDPSFn
        // padrão poderia ser passado com flag "ignoreBuffs" no futuro.
        // Por enquanto, usamos a função passada mas se o usuário tiver skill ativa, ele ganha.
        // Solução simples:

        if (gameData.skills[SkillType.FURY]?.active) dps /= 2; // Remove buff se salvo ativo
        if (gameData.skills[SkillType.TEAM]?.active) dps /= 2; // Remove buff se salvo ativo

        const finalDps = calculateDPSFn(); // Pega DPS total
        // Remove os buffs matematicamente se estiverem ativos no gameData carregado
        let cleanDps = finalDps;
        if (gameData.skills[SkillType.FURY]?.active) cleanDps /= 2;
        if (gameData.skills[SkillType.TEAM]?.active) cleanDps /= 2;

        if (cleanDps > 0) {
          const earned = Math.floor(cleanDps * seconds * 0.5); // 50% eficiência
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
      return true;
    } catch (error) {
      console.error("SaveSys: Erro ao resetar", error);
      return false;
    }
  },
};
