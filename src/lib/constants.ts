import { AdaptedLesson, ThemeType } from "../types";

export const DEMO_LESSONS: AdaptedLesson[] = [
  {
    id: "demo-dinossauros",
    title: "O Mundo dos Dinossauros 🦖",
    adaptedExplanation: "Hoje vamos viajar no tempo e escrever sobre os dinossauros! Eles eram gigantes e muito fortes! Vamos escrever juntinhos? São apenas 4 pedacinhos curtos! 🦕",
    createdAt: new Date().toISOString(),
    originalInputType: "text",
    chunks: [
      {
        id: 1,
        text: "Os dinossauros viveram na Terra há muito tempo.",
        praise: "Fantástico! Você começou muito bem! Um dinossauro pescoçudo te mandou um abraço! 🦕✨"
      },
      {
        id: 2,
        text: "Alguns comiam plantas e outros comiam carne.",
        praise: "Espetacular! Você tem o foco de um velociraptor super veloz! 🦖🚀"
      },
      {
        id: 3,
        text: "O Tiranossauro Rex era o rei de todos eles.",
        praise: "Incrível! Sua cópia está tão forte quanto o rugido de um T-Rex! RAAAWWWR! 👑🦖"
      },
      {
        id: 4,
        text: "Eles deixaram pegadas gigantes nas rochas.",
        praise: "Uau! Você terminou toda a lição e deixou sua pegada de campeão na história! 🏆🌟"
      }
    ]
  },
  {
    id: "demo-espaco",
    title: "Viagem ao Espaço e Estrelas 🚀",
    adaptedExplanation: "Aperte os cintos, astronauta! Vamos escrever sobre o espaço sideral e as estrelas brilhantes! São 4 pedacinhos mágicos. Que comecem os motores! 🛸",
    createdAt: new Date().toISOString(),
    originalInputType: "text",
    chunks: [
      {
        id: 1,
        text: "O Sol é a estrela mais próxima da Terra.",
        praise: "Brilhante! Você iluminou o caderno com essa frase! ☀️💛"
      },
      {
        id: 2,
        text: "Os planetas giram em volta do Sol o tempo todo.",
        praise: "Sensacional! Você é um astronauta super focado! 🪐✨"
      },
      {
        id: 3,
        text: "A Lua brilha bem bonita no céu à noite.",
        praise: "Uau! A Lua está piscando para você de tão bonita que está sua letra! 🌙🤍"
      },
      {
        id: 4,
        text: "Nós moramos em um planeta azul chamado Terra.",
        praise: "Missão cumprida, capitão! Você pousou seu foguete com sucesso absoluto! 🚀🌎🏆"
      }
    ]
  },
  {
    id: "demo-animais",
    title: "O Segredo da Floresta 🦁",
    adaptedExplanation: "Bem-vindo ao safári dos escritores! Vamos descobrir curiosidades sobre os animais da floresta. São 4 pedacinhos divertidos. Vamos lá? 🦒",
    createdAt: new Date().toISOString(),
    originalInputType: "text",
    chunks: [
      {
        id: 1,
        text: "O leão é conhecido como o rei da selva.",
        praise: "Rugido de sucesso! Você foi muito corajoso e focado agora! 🦁👑"
      },
      {
        id: 2,
        text: "A girafa tem um pescoço bem comprido.",
        praise: "Sensacional! Você alcançou as estrelas igual a dona girafa! 🦒✨"
      },
      {
        id: 3,
        text: "O elefante usa a tromba para beber água.",
        praise: "Fantástico! Seu esforço é gigante como o amigo elefante! 🐘💦"
      },
      {
        id: 4,
        text: "Os macacos adoram pular de galho em galho.",
        praise: "Parabéns! Você completou o circuito da selva e ganhou a medalha de ouro! 🐒🏅"
      }
    ]
  }
];

export const GENERAL_PRAISES = [
  "Uau! Que caligrafia maravilhosa você deve estar fazendo! ✍️💖",
  "Você é incrivelmente inteligente! Estou muito orgulhoso! 🌟",
  "Que foco de super-herói! Continue assim! 🦸‍♂️💥",
  "Olha só quanta dedicação! Você está arrasando! 🚀✨",
  "Que orgulho ver você caprichando tanto! Parabéns! 🎈🎉",
  "Sua caneta está cheia de superpoderes hoje! 🪄✨",
  "Você é um campeão da escrita! Cada letrinha conta! 🏆✏️",
  "Mais um passo completado! Que orgulho gigante! 🥰👏"
];

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  emoji: string;
  bg: string;
  cardBg: string;
  border: string;
  primary: string;
  primaryBtn: string;
  accent: string;
  text: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "pastel-blue",
    name: "Céu Azul Calmo",
    emoji: "☁️",
    bg: "bg-sky-50/70",
    cardBg: "bg-white",
    border: "border-sky-200",
    primary: "text-sky-600",
    primaryBtn: "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-100",
    accent: "bg-sky-100 text-sky-700",
    text: "text-sky-900"
  },
  {
    id: "pastel-green",
    name: "Floresta Mágica",
    emoji: "🌿",
    bg: "bg-emerald-50/70",
    cardBg: "bg-white",
    border: "border-emerald-200",
    primary: "text-emerald-600",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100",
    accent: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-900"
  },
  {
    id: "pastel-lavender",
    name: "Lavanda Relaxante",
    emoji: "🌸",
    bg: "bg-purple-50/70",
    cardBg: "bg-white",
    border: "border-purple-200",
    primary: "text-purple-600",
    primaryBtn: "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-100",
    accent: "bg-purple-100 text-purple-700",
    text: "text-purple-900"
  },
  {
    id: "pastel-orange",
    name: "Pôr do Sol Suave",
    emoji: "☀️",
    bg: "bg-amber-50/70",
    cardBg: "bg-white",
    border: "border-amber-200",
    primary: "text-amber-600",
    primaryBtn: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100",
    accent: "bg-amber-100 text-amber-700",
    text: "text-amber-900"
  },
  {
    id: "minecraft",
    name: "Minecraft ⛏️",
    emoji: "⛏️",
    bg: "bg-[#2c221a]/10 border-[#4a3b32]/20 pattern-grid",
    cardBg: "bg-[#4e3c30]/95 text-white border-4 border-[#352920]",
    border: "border-[#4a3b32]",
    primary: "text-[#54b834] font-mono font-extrabold",
    primaryBtn: "bg-[#54b834] hover:bg-[#439628] text-white border-b-4 border-[#2d661e] font-mono uppercase tracking-wide",
    accent: "bg-[#7c5e48] text-lime-100 border border-[#9a7860]",
    text: "text-[#ece6e2]"
  },
  {
    id: "mario",
    name: "Super Mario 🍄",
    emoji: "🍄",
    bg: "bg-[#e52521]/10 border-[#002fbe]/15",
    cardBg: "bg-white border-4 border-[#002fbe]",
    border: "border-[#e52521]",
    primary: "text-[#e52521] font-extrabold",
    primaryBtn: "bg-[#e52521] hover:bg-[#b81d1a] text-white border-b-4 border-[#8f1210] uppercase font-black",
    accent: "bg-[#fbd000] text-amber-950 font-bold",
    text: "text-slate-950"
  },
  {
    id: "papercraft",
    name: "Paper Craft 📦",
    emoji: "📦",
    bg: "bg-[#ecdcc5]/40 border-[#cfbaa0]",
    cardBg: "bg-[#fcfaf5] border-2 border-[#bfa58a] shadow-[4px_4px_0px_0px_rgba(191,165,138,0.3)]",
    border: "border-[#bfa58a]",
    primary: "text-[#876c53] font-bold",
    primaryBtn: "bg-[#a18265] hover:bg-[#876c53] text-white rounded-lg border border-[#745a43] shadow-sm",
    accent: "bg-[#e6d8c5] text-[#5a4635]",
    text: "text-[#473627]"
  }
];

export const LEVEL_TITLES = [
  { minScore: 0, title: "Iniciante da Escrita ✏️" },
  { minScore: 50, title: "Explorador do Caderno 🎒" },
  { minScore: 120, title: "Escritor do Espaço 🚀" },
  { minScore: 220, title: "Foco de Super-Herói 🦸‍♂️" },
  { minScore: 350, title: "Mestre dos Pedacinhos ✨" },
  { minScore: 500, title: "Campeão das Canetas de Ouro 🏆" }
];

export function getLevelInfo(score: number) {
  let activeLevel = LEVEL_TITLES[0];
  let nextLevel = LEVEL_TITLES[1];

  for (let i = 0; i < LEVEL_TITLES.length; i++) {
    if (score >= LEVEL_TITLES[i].minScore) {
      activeLevel = LEVEL_TITLES[i];
      nextLevel = LEVEL_TITLES[i + 1] || null;
    }
  }

  const levelNum = LEVEL_TITLES.indexOf(activeLevel) + 1;
  const currentLevelMin = activeLevel.minScore;
  const nextLevelMin = nextLevel ? nextLevel.minScore : activeLevel.minScore + 200;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((score - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100)
  );

  return {
    level: levelNum,
    title: activeLevel.title,
    nextTitle: nextLevel ? nextLevel.title : "Nível Máximo!",
    nextMin: nextLevel ? nextLevel.minScore : null,
    progress: progressPercent,
    needed: nextLevel ? nextLevel.minScore - score : 0
  };
}
