export interface AdaptedChunk {
  id: number;
  text: string;
  praise: string;
}

export interface AdaptedLesson {
  id: string;
  title: string;
  adaptedExplanation: string;
  chunks: AdaptedChunk[];
  createdAt: string;
  originalInputType: "image" | "text";
}

export interface UserProgress {
  score: number;
  level: number;
  completedLessonsCount: number;
  completedChunkIds: string[]; // lessonId-chunkId
}

export type ThemeType = "pastel-blue" | "pastel-green" | "pastel-lavender" | "pastel-orange" | "minecraft" | "mario" | "papercraft";
export type ChunkPreferenceType = "ultra-short" | "standard" | "medium" | "paragraph";

export interface AppSettings {
  childName: string;
  theme: ThemeType;
  fontSize: "sm" | "md" | "lg" | "xl";
  chunkPreference: ChunkPreferenceType;
  enableAudio: boolean;
  enableSoundEffects: boolean;
}
