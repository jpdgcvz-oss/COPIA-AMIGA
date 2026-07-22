/**
 * Helper utilities for the gamified ranking / patent system.
 * Designed to motivate children with progressive, rewarding badges.
 */

export interface PatentInfo {
  scoreMin: number;
  name: string;
  emoji: string;
  color: string; // Tailwind class
  description: string;
}

export const PATENTS: PatentInfo[] = [
  {
    scoreMin: 0,
    name: "Iniciante das Letras",
    emoji: "✏️",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    description: "Você está começando sua jornada de escrita! Cada tracinho é o início de um superpoder!"
  },
  {
    scoreMin: 10,
    name: "Aspirante a Escriba",
    emoji: "📜",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Excelente! Você copiou suas primeiras frases e ganhou asas para voar mais longe!"
  },
  {
    scoreMin: 20,
    name: "Ajudante Dedicado",
    emoji: "⭐",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Seu foco está brilhando como as estrelas! Você é de grande ajuda para o caderno!"
  },
  {
    scoreMin: 30,
    name: "Copista Brilhante",
    emoji: "🌟",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    description: "Que capricho! Seus cadernos parecem tesouros cheios de ouro brilhante!"
  },
  {
    scoreMin: 40,
    name: "Explorador de Palavras",
    emoji: "🔍",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Com lupa na mão e lápis na outra, você desbrava qualquer texto comprido!"
  },
  {
    scoreMin: 50,
    name: "Desbravador do Caderno",
    emoji: "📖",
    color: "bg-sky-50 text-sky-700 border-sky-200",
    description: "As páginas em branco sorriem para você, pois sabem que você vai enchê-las de beleza!"
  },
  {
    scoreMin: 60,
    name: "Guerreiro do Lápis",
    emoji: "⚔️",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    description: "Você vence a preguiça e o cansaço com o poder da sua caneta mágica!"
  },
  {
    scoreMin: 70,
    name: "Mestre da Caligrafia",
    emoji: "🎨",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    description: "Seu caderno é uma obra de arte! Cada letrinha desenhada com perfeito capricho!"
  },
  {
    scoreMin: 80,
    name: "Sábio da Escrita",
    emoji: "🧠",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Seu cérebro é gigante! Escrever ajuda sua mente a organizar ideias geniais!"
  },
  {
    scoreMin: 90,
    name: "Campeão das Letras",
    emoji: "🏆",
    color: "bg-amber-100 text-amber-900 border-amber-300",
    description: "Incrível! Você conquistou o pódio dos grandes campeões da caligrafia!"
  }
];

export function getPatent(score: number): PatentInfo {
  let activePatent = PATENTS[0];
  for (let i = 0; i < PATENTS.length; i++) {
    if (score >= PATENTS[i].scoreMin) {
      activePatent = PATENTS[i];
    }
  }
  
  // For scores 100+
  if (score >= 100) {
    const levelIndex = Math.floor(score / 10);
    return {
      scoreMin: score,
      name: `Lenda do CopyPlay Nível ${levelIndex - 9}`,
      emoji: "👑",
      color: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 border-amber-400 animate-pulse",
      description: "Você se tornou uma verdadeira lenda mítica da cópia caprichada! O rei de todas as histórias! 👑✨"
    };
  }
  
  return activePatent;
}
