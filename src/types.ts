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
  createdByUid?: string; // Added to trace who created the lesson
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
  highContrast: boolean; // Added for accessibility
}

export interface ActivityLog {
  id: string;
  studentUid: string;
  studentName: string;
  lessonId: string;
  lessonTitle: string;
  completedAt: string; // ISO string
  durationSeconds: number;
  totalChunks: number;
  totalCharacters: number;
  scoreEarned: number;
  avgTimePerChunk: number;
}

export type UserRole = "aluno" | "tutor" | "professor";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  code?: string; // For teachers: linking code
  linkedTeacherUid?: string; // For students: linked teacher's UID
  score: number;
  level: number;
  completedLessonsCount: number;
  customPhotoURL?: string; // Profile picture from camera
}
