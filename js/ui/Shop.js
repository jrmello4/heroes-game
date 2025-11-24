import { gameData } from "../core/GameData.js";
import { Renderer } from "./Renderer.js";

export const Shop = {
  render() {
    this.renderUpgrades();
    this.renderHeroes();
    this.renderArtifacts();
    this.renderAchievements();
  },

  renderUpgrades() {
    const container = document.getElementById("panelUpgrades");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(gameData.upgrades).forEach((key) => {
      const u = gameData.upgrades[key];
      const cost = Math.floor(u.baseCost * Math.pow(1.2, u.count));
      const canBuy = gameData.score >= cost;

      const div = document.createElement("div");
      div.className = `comic-box p-3 flex justify-between items-center ${
        canBuy ? "bg-white" : "bg-gray-200 opacity-80"
      }`;
      div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="bg-blue-100 p-2 border-2 border-black text-xl w-12 h-12 flex items-center justify-center">
                        <i class="fas ${u.icon}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm leading-none">${
                          u.name
                        }</div>
                        <div class="text-xs text-gray-500">+${Renderer.formatNumber(
                          u.boost
                        )} DPC</div>
                        <div class="text-xs font-bold text-blue-600">Nvl ${
                          u.count
                        }</div>
                    </div>
                </div>
                <button onclick="window.game.buy('upgrade', '${key}')" 
                    class="comic-btn ${
                      canBuy
                        ? "bg-green-500 text-white"
                        : "bg-gray-400 text-gray-700"
                    } px-3 py-1 text-sm min-w-[80px]" 
                    ${!canBuy ? "disabled" : ""}>
                    💰 ${Renderer.formatNumber(cost)}
                </button>
            `;
      container.appendChild(div);
    });
  },

  renderHeroes() {
    const container = document.getElementById("panelHeroes");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(gameData.heroes).forEach((key) => {
      const h = gameData.heroes[key];
      const cost = Math.floor(h.baseCost * Math.pow(1.2, h.count));
      const canBuy = gameData.score >= cost;
      const isUnlocked = gameData.level >= h.reqLevel;

      if (!isUnlocked && h.count === 0) {
        const lockedDiv = document.createElement("div");
        lockedDiv.className =
          "comic-box p-3 bg-gray-300 text-center text-gray-500 font-bold text-sm";
        lockedDiv.innerHTML = `<i class="fas fa-lock mb-1"></i><br>Desbloqueia no Nível ${h.reqLevel}`;
        container.appendChild(lockedDiv);
        return;
      }

      const div = document.createElement("div");
      div.className = `comic-box p-3 flex justify-between items-center ${
        h.count > 0 ? "bg-yellow-50" : "bg-white"
      }`;
      div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="bg-red-100 p-2 border-2 border-black text-xl w-12 h-12 flex items-center justify-center">
                        <i class="fas ${h.icon}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm leading-none">${
                          h.name
                        }</div>
                        <div class="text-xs text-gray-500">+${Renderer.formatNumber(
                          h.dps
                        )} DPS</div>
                        <div class="text-xs font-bold text-red-600">Nvl ${
                          h.count
                        }</div>
                    </div>
                </div>
                <button onclick="window.game.buy('hero', '${key}')" 
                    class="comic-btn ${
                      canBuy
                        ? "bg-yellow-400 text-black"
                        : "bg-gray-400 text-gray-700"
                    } px-3 py-1 text-sm min-w-[80px]" 
                    ${!canBuy ? "disabled" : ""}>
                    💰 ${Renderer.formatNumber(cost)}
                </button>
            `;
      container.appendChild(div);
    });
  },

  renderArtifacts() {
    const container = document.getElementById("panelArtifacts");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(gameData.artifacts).forEach((key) => {
      const a = gameData.artifacts[key];
      const div = document.createElement("div");
      div.className = `comic-box p-2 text-center flex flex-col items-center justify-center min-h-[100px] ${
        a.owned ? "bg-purple-100 border-purple-800" : "bg-gray-300 opacity-60"
      }`;
      div.innerHTML = `
                <i class="fas ${a.icon} text-3xl mb-2 ${
        a.owned ? "text-purple-600" : "text-gray-500"
      }"></i>
                <div class="font-bold text-xs leading-tight mb-1">${
                  a.name
                }</div>
                <div class="text-[10px] text-gray-600">${a.desc}</div>
                ${
                  a.owned
                    ? '<span class="text-[10px] font-bold text-green-600 mt-1">POSSUÍDO</span>'
                    : '<span class="text-[10px] font-bold text-red-600 mt-1">BLOQUEADO</span>'
                }
            `;
      container.appendChild(div);
    });
  },

  renderAchievements() {
    const container = document.getElementById("panelAchievements");
    if (!container) return;
    container.innerHTML = "";

    if (!gameData.achievements) return;

    // Cabeçalho de progresso
    const total = Object.keys(gameData.achievements).length;
    const completed = Object.values(gameData.achievements).filter(
      (a) => a.done
    ).length;

    const header = document.createElement("div");
    header.className = "text-center mb-4";
    header.innerHTML = `
      <h3 class="font-comic text-xl text-yellow-600">Suas Façanhas</h3>
      <div class="text-sm font-bold text-gray-600">${completed} / ${total} Completadas</div>
      <div class="w-full bg-gray-300 h-3 border-2 border-black mt-1 rounded-full overflow-hidden">
        <div class="bg-yellow-400 h-full transition-all" style="width: ${
          (completed / total) * 100
        }%"></div>
      </div>
    `;
    container.appendChild(header);

    Object.keys(gameData.achievements).forEach((key) => {
      const a = gameData.achievements[key];
      const div = document.createElement("div");
      div.className = `comic-box p-3 mb-2 flex items-center gap-3 ${
        a.done ? "bg-green-50 border-green-500" : "bg-gray-200"
      }`;

      let progress = 0;
      if (a.type === "kills")
        progress = Math.min(gameData.villainsDefeated, a.req);
      if (a.type === "clicks") progress = Math.min(gameData.totalClicks, a.req);
      if (a.type === "level") progress = Math.min(gameData.level, a.req);

      div.innerHTML = `
            <div class="w-10 h-10 flex items-center justify-center rounded-full border-2 border-black ${
              a.done ? "bg-yellow-400" : "bg-gray-400"
            }">
                <i class="fas fa-trophy text-white"></i>
            </div>
            <div class="flex-1">
                <div class="font-bold text-sm ${
                  a.done ? "text-green-800" : "text-gray-600"
                }">${a.name}</div>
                <div class="text-xs text-gray-500">${a.desc}</div>
                <div class="flex justify-between text-[10px] font-bold mt-1">
                     <span>${a.done ? "COMPLETO" : "EM ANDAMENTO"}</span>
                     <span>${progress} / ${a.req}</span>
                </div>
                ${
                  !a.done
                    ? `<div class="w-full bg-gray-300 h-1 mt-1"><div class="bg-blue-500 h-full" style="width: ${
                        (progress / a.req) * 100
                      }%"></div></div>`
                    : ""
                }
            </div>
            <div class="text-xs font-bold text-purple-600 flex flex-col items-center">
                <span>+${a.reward * 100}%</span>
                <span class="text-[8px] uppercase">Dano</span>
            </div>
        `;
      container.appendChild(div);
    });
  },
};
