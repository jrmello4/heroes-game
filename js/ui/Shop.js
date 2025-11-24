import { gameData } from "../core/GameData.js";
import { Renderer } from "./Renderer.js";

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
  }><span class="text-xs font-bold leading-none">${Renderer.formatNumber(
    cost
  )}</span></button>
    </div>`;
}

export const Shop = {
  render() {
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
              a.owned
                ? "bg-yellow-100 border-yellow-500"
                : "bg-gray-200 opacity-60"
            }">
                <i class="fas ${a.icon} ${a.color} text-2xl mb-1"></i>
                <div class="font-bold text-xs leading-tight">${a.name}</div>
                <div class="text-[10px] mt-1 font-bold text-gray-600">${
                  a.owned ? a.desc : "???"
                }</div>
            </div>`;
    });
    document.getElementById("panelArtifacts").innerHTML = aHtml;
  },
};
