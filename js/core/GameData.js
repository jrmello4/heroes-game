export const gameData = {
  score: 0,
  crystals: 0,
  totalScoreRun: 0,
  level: 1,
  clickDamage: 1,
  autoDamage: 0,
  villainMaxHp: 20,
  villainCurrentHp: 20,
  villainsDefeated: 0,
  totalClicks: 0,
  combo: 0,

  upgrades: {
    gym: {
      name: "Academia",
      baseCost: 15,
      boost: 1,
      count: 0,
      icon: "fa-dumbbell",
    },
    supplements: {
      name: "Suplementos",
      baseCost: 100,
      boost: 5,
      count: 0,
      icon: "fa-prescription-bottle",
    },
    equipment: {
      name: "Equipamento Tático",
      baseCost: 500,
      boost: 20,
      count: 0,
      icon: "fa-tools",
    },
    cybernetics: {
      name: "Braço Cibernético",
      baseCost: 2000,
      boost: 100,
      count: 0,
      icon: "fa-robot",
    },
  },

  heroes: {
    rookie: {
      name: "Aspirante",
      baseCost: 100,
      dps: 5,
      count: 0,
      reqLevel: 1,
      icon: "fa-user-ninja",
    },
    scout: {
      name: "Vigilante",
      baseCost: 500,
      dps: 20,
      count: 0,
      reqLevel: 3,
      icon: "fa-binoculars",
    },
    soldier: {
      name: "Soldado",
      baseCost: 2000,
      dps: 80,
      count: 0,
      reqLevel: 5,
      icon: "fa-person-rifle",
    },
    captain: {
      name: "Capitão",
      baseCost: 10000,
      dps: 250,
      count: 0,
      reqLevel: 10,
      icon: "fa-shield-halved",
    },
    sorcerer: {
      name: "Místico",
      baseCost: 50000,
      dps: 1000,
      count: 0,
      reqLevel: 15,
      icon: "fa-hat-wizard",
    },
    cyborg: {
      name: "Ciborgue",
      baseCost: 200000,
      dps: 5000,
      count: 0,
      reqLevel: 20,
      icon: "fa-microchip",
    },
  },

  artifacts: {
    amulet: {
      name: "Amuleto da Sorte",
      desc: "+10% Ouro dos monstros",
      owned: false,
      icon: "fa-gem",
    },
    ring: {
      name: "Anel do Poder",
      desc: "+20% Dano de Clique",
      owned: false,
      icon: "fa-ring",
    },
    cape: {
      name: "Capa Heroica",
      desc: "+20% DPS dos Heróis",
      owned: false,
      icon: "fa-tshirt",
    },
  },

  achievements: {
    kill100: {
      name: "Exterminador",
      req: 100,
      type: "kills",
      reward: 0.1,
      done: false,
      desc: "Derrote 100 vilões",
    },
    click1000: {
      name: "Dedos Rápidos",
      req: 1000,
      type: "clicks",
      reward: 0.1,
      done: false,
      desc: "Clique 1000 vezes",
    },
    level10: {
      name: "Veterano",
      req: 10,
      type: "level",
      reward: 0.2,
      done: false,
      desc: "Alcance o nível 10",
    },
  },

  skills: {
    fury: { active: false, cooldown: 0, maxCooldown: 60, duration: 0 },
    crit: { active: false, cooldown: 0, maxCooldown: 90, duration: 0 },
    team: { active: false, cooldown: 0, maxCooldown: 120, duration: 0 },
  },

  dailyMissions: {
    lastReset: 0,
    currentMissions: [],
    completedToday: 0,
    rewardsClaimed: false,
    stats: {}, // skillsUsed, clicksToday, etc
    progress: {}, // missionId -> amount
  },
};

export const villains = [
  { name: "Ladrão", color: "text-gray-600", icon: "fa-user-secret" },
  { name: "Bandido", color: "text-green-700", icon: "fa-mask" },
  { name: "Mafioso", color: "text-blue-800", icon: "fa-user-tie" },
  { name: "Ninja", color: "text-black", icon: "fa-user-ninja" },
  { name: "Mutante", color: "text-purple-600", icon: "fa-dna" },
];

export const bosses = [
  { name: "Rei do Crime", color: "text-white", icon: "fa-crown" },
  { name: "Gigante de Aço", color: "text-gray-400", icon: "fa-robot" },
  { name: "Devorador", color: "text-red-900", icon: "fa-skull" },
];

export const specialVillains = [
  {
    name: "Ladrão de Ouro",
    type: "gold",
    effect: "Dá 5x mais ouro!",
    color: "text-yellow-400",
    icon: "fa-sack-dollar",
  },
  {
    name: "Tanque Blindado",
    type: "tank",
    effect: "50% mais vida, dobro de ouro",
    color: "text-gray-500",
    icon: "fa-shield-alt",
  },
  {
    name: "Curandeiro",
    type: "healer",
    effect: "Regenera vida rapidamente",
    color: "text-green-400",
    icon: "fa-plus-circle",
  },
  {
    name: "Sombra",
    type: "elusive",
    effect: "30% chance de esquivar",
    color: "text-purple-900",
    icon: "fa-ghost",
  },
];

export const dailyMissions = [
  {
    id: "m1",
    name: "Dedos de Aço",
    description: "Clique 500 vezes",
    type: "click",
    target: 500,
    reward: { crystals: 2 },
    icon: "fa-mouse-pointer",
  },
  {
    id: "m2",
    name: "Limpeza Urbana",
    description: "Derrote 50 vilões",
    type: "kill",
    target: 50,
    reward: { crystals: 2 },
    icon: "fa-skull",
  },
  {
    id: "m3",
    name: "Poder Total",
    description: "Use 5 habilidades",
    type: "skill_use",
    target: 5,
    reward: { crystals: 3 },
    icon: "fa-bolt",
  },
  {
    id: "m4",
    name: "Caçador de Chefes",
    description: "Derrote 2 Chefes",
    type: "boss_kill",
    target: 2,
    reward: { crystals: 4 },
    icon: "fa-crown",
  },
  {
    id: "m5",
    name: "Combo Master",
    description: "Atinja combo x50",
    type: "combo",
    target: 50,
    reward: { crystals: 3 },
    icon: "fa-fire",
  },
];
