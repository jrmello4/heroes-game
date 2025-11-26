import { gameData } from "../core/GameData.js";
import { Renderer } from "./Renderer.js";
import { ItemType, AchievementType } from "../core/Constants.js";

function getOrCreateItemElement(containerId, itemId, createFn) {
  const existingEl = document.getElementById(itemId);
  if (existingEl) return existingEl;

  const container = document.getElementById(containerId);
  if (!container) return null;

  const html = createFn();
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const newEl = tempDiv.firstElementChild;
  container.appendChild(newEl);
  return newEl;
}

function updateShopItem(element, cost, level, canBuy) {
  const levelEl = element.querySelector(".item-level");
  if (levelEl) levelEl.textContent = `Nvl ${level}`;

  const costEl = element.querySelector(".item-cost");
  if (costEl) costEl.textContent = Renderer.formatNumber(cost);

  const btn = element.querySelector("button");
  if (btn) {
    btn.disabled = !canBuy;
    if (canBuy) {
      btn.classList.remove("bg-gray-300");
      btn.classList.add("bg-yellow-400", "hover:bg-yellow-300");
    } else {
      btn.classList.remove("bg-yellow-400", "hover:bg-yellow-300");
      btn.classList.add("bg-gray-300");
    }
  }

  if (canBuy) {
    element.classList.remove("bg-gray-100");
    element.classList.add("bg-white");
  } else {
    element.classList.remove("bg-white");
    element.classList.add("bg-gray-100");
  }
}

function generateItemHTML(
  id,
  name,
  effect,
  cost,
  level,
  icon,
  type,
  key,
  canBuy,
  colorClass = "text-gray-800"
) {
  return `<div id="${id}" class="comic-box p-2 flex items-center gap-2 mb-1 ${
    canBuy ? "bg-white" : "bg-gray-100"
  }">
        <div class="w-10 h-10 flex items-center justify-center text-xl border-2 border-black bg-gray-50 shrink-0">
            <i class="fas ${icon} ${colorClass}"></i>
        </div>
        <div class="flex-1 min-w-0">
            <div class="font-bold text-sm truncate leading-none mb-1">${name}</div>
            <div class="text-xs text-blue-600 font-bold">
                ${effect} <span class="text-gray-400 ml-1 item-level">Nvl ${level}</span>
            </div>
        </div>
        <button 
            data-action="buy" 
            data-type="${type}" 
            data-key="${key}"
            class="comic-btn px-2 py-2 w-20 flex flex-col items-center justify-center transition-colors duration-200 ${
              canBuy ? "bg-yellow-400 hover:bg-yellow-300" : "bg-gray-300"
            }" 
            ${!canBuy ? "disabled" : ""}>
            <span class="text-xs font-bold leading-none item-cost">${Renderer.formatNumber(
              cost
            )}</span>
        </button>
    </div>`;
}

export const Shop = {
  render() {
    // === UPGRADES (Agora suporta Sinergias) ===
    Object.keys(gameData.upgrades).forEach((k) => {
      const u = gameData.upgrades[k];
      const cost = Math.floor(u.baseCost * Math.pow(1.15, u.count));
      const canBuy = gameData.score >= cost;
      const itemId = `upgrade-${k}`;

      // Lógica de Descrição Dinâmica
      let effectText = "";
      if (u.synergy) {
        // Se for sinergia, mostra texto personalizado
        effectText = u.desc || "Bônus Especial";
      } else {
        // Se for clique normal
        effectText = `+${Renderer.formatNumber(u.boost)} Clique`;
      }

      const el = getOrCreateItemElement("panelUpgrades", itemId, () =>
        generateItemHTML(
          itemId,
          u.name,
          effectText, // Usa o texto dinâmico
          cost,
          u.count,
          u.icon,
          ItemType.UPGRADE,
          k,
          canBuy
        )
      );
      if (el) updateShopItem(el, cost, u.count, canBuy);
    });

    // === HERÓIS ===
    Object.keys(gameData.heroes).forEach((k) => {
      const h = gameData.heroes[k];
      const cost = Math.floor(h.baseCost * Math.pow(1.15, h.count));
      const canBuy = gameData.score >= cost;
      const itemId = `hero-${k}`;

      const el = getOrCreateItemElement("panelHeroes", itemId, () =>
        generateItemHTML(
          itemId,
          h.name,
          `+${Renderer.formatNumber(h.dps)} DPS`,
          cost,
          h.count,
          h.icon,
          ItemType.HERO,
          k,
          canBuy,
          h.color
        )
      );
      if (el) updateShopItem(el, cost, h.count, canBuy);
    });

    // === ARTEFATOS ===
    const artifactsPanel = document.getElementById("panelArtifacts");
    if (artifactsPanel) {
      let aHtml = "";
      Object.keys(gameData.artifacts).forEach((k) => {
        const a = gameData.artifacts[k];
        aHtml += `
                <div class="comic-box p-2 flex flex-col items-center text-center transition-all duration-300 ${
                  a.owned
                    ? "bg-yellow-100 border-yellow-500 transform scale-105"
                    : "bg-gray-200 opacity-60"
                }">
                    <i class="fas ${a.icon} ${a.color} text-2xl mb-1"></i>
                    <div class="font-bold text-xs leading-tight">${a.name}</div>
                    <div class="text-[10px] mt-1 font-bold text-gray-600">${
                      a.owned ? a.desc : "???"
                    }</div>
                </div>`;
      });
      if (artifactsPanel.innerHTML !== aHtml) {
        artifactsPanel.innerHTML = aHtml;
      }
    }

    // === CONQUISTAS ===
    const achievementsPanel = document.getElementById("panelAchievements");
    if (achievementsPanel && gameData.achievements) {
      let achHtml = "";
      Object.keys(gameData.achievements).forEach((k) => {
        const a = gameData.achievements[k];
        let progress = 0;
        let current = 0;

        if (a.type === AchievementType.KILLS)
          current = gameData.villainsDefeated;
        else if (a.type === AchievementType.CLICKS)
          current = gameData.totalClicks;
        else if (a.type === AchievementType.LEVEL) current = gameData.level;

        if (current > a.req) current = a.req;

        const isDone = a.done;

        achHtml += `
          <div class="comic-box p-3 mb-2 transition-all duration-300 ${
            isDone ? "bg-green-50 border-green-500" : "bg-white"
          }">
            <div class="flex justify-between items-start mb-1">
                <div class="flex items-center gap-2">
                    <i class="fas fa-trophy ${
                      isDone ? "text-yellow-500" : "text-gray-300"
                    }"></i>
                    <span class="font-bold text-sm ${
                      isDone ? "text-green-800" : "text-gray-800"
                    }">${a.name}</span>
                </div>
                ${
                  isDone
                    ? '<i class="fas fa-check-circle text-green-600"></i>'
                    : ""
                }
            </div>
            
            <div class="text-xs text-gray-600 mb-2 pl-6">${a.desc}</div>
            
            <div class="pl-6">
                ${
                  !isDone
                    ? `
                <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-500" style="width: ${
                      (current / a.req) * 100
                    }%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>${current} / ${a.req}</span>
                    <span class="text-blue-600">Recompensa: +${(
                      a.reward * 100
                    ).toFixed(0)}% Bônus</span>
                </div>
                `
                    : `
                <div class="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                    Bônus Ativo: +${(a.reward * 100).toFixed(0)}% Ouro/DPS
                </div>
                `
                }
            </div>
          </div>
        `;
      });

      if (achievementsPanel.innerHTML !== achHtml) {
        achievementsPanel.innerHTML = achHtml;
      }
    }
  },
};
