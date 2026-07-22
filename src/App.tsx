import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  BookOpen, 
  Upload, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  Trophy, 
  Settings, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Sun, 
  Star,
  Eye,
  Camera,
  Play,
  RotateCcw,
  Check,
  Users,
  Key,
  Award,
  Shield,
  Activity,
  LogOut,
  Contrast,
  Flame,
  Info
} from "lucide-react";

import { AdaptedLesson, AdaptedChunk, UserProgress, AppSettings, ThemeType, ChunkPreferenceType, UserRole, UserProfile, ActivityLog } from "./types";
import { DEMO_LESSONS, THEMES, GENERAL_PRAISES, getLevelInfo } from "./lib/constants";
import { playClickSound, playCoinSound, playLevelUpSound } from "./lib/sound";
import { speakText, stopSpeaking, isSpeaking } from "./lib/tts";
import EmojiShower from "./components/EmojiShower";
import CameraCapture from "./components/CameraCapture";
import LessonCameraCapture from "./components/LessonCameraCapture";
import { getPatent } from "./lib/patents";
import { auth, googleProvider, signInWithPopup, signOut } from "./lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { 
  saveUserProfile, 
  getUserProfile, 
  generateTeacherCode, 
  linkStudentToTeacher, 
  getLinkedStudents, 
  createTeacherLesson, 
  getTeacherLessons,
  saveActivityLog,
  getStudentActivityLogs
} from "./lib/db";
// @ts-ignore
import copyPlayLogo from "./assets/images/copyplay_logo_1784682180144.jpg";

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedRoleForRegistration, setSelectedRoleForRegistration] = useState<UserRole>("aluno");
  const [authError, setAuthError] = useState<string | null>(null);

  // App settings local state
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("copy_play_settings");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      childName: "",
      theme: "pastel-blue",
      fontSize: "xl",
      chunkPreference: "standard",
      enableAudio: true,
      enableSoundEffects: true,
      highContrast: false,
    };
  });

  // Helper for student custom lessons storage
  const getStoredStudentLessons = (): AdaptedLesson[] => {
    try {
      const raw = localStorage.getItem("copy_play_student_custom_lessons");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveStudentLessonToStorage = (lesson: AdaptedLesson) => {
    try {
      const current = getStoredStudentLessons();
      const updated = [lesson, ...current.filter(l => l.id !== lesson.id)];
      localStorage.setItem("copy_play_student_custom_lessons", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save student lesson to local storage", e);
    }
  };

  // State for merged lessons (demo + teacher-created + custom-local)
  const [lessons, setLessons] = useState<AdaptedLesson[]>(DEMO_LESSONS);
  const [teacherCreatedLessons, setTeacherCreatedLessons] = useState<AdaptedLesson[]>([]);

  // Navigation and UI state
  const [activeScreen, setActiveScreen] = useState<"welcome" | "home" | "lesson-viewer" | "add-lesson" | "settings" | "voice-answer">("welcome");
  const [tutorViewMode, setTutorViewMode] = useState<"tutor" | "aluno">("tutor");

  // Add lesson form states
  const [textInput, setTextInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadTab, setUploadTab] = useState<"image" | "text">("image");

  // Active Lesson Player state
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null);
  const [showPraiseModal, setShowPraiseModal] = useState(false);
  const [praiseText, setPraiseText] = useState("");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [focusGuide, setFocusGuide] = useState(true); // yellow guideline under active sentence
  const [letterSpacingActive, setLetterSpacingActive] = useState(false); // extra letter spacing for dyslexia support

  // Draggable focus guide state
  const [guideY, setGuideY] = useState(120); // pixel position from top
  const guideRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Profile Camera Capture state
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showLessonCameraCapture, setShowLessonCameraCapture] = useState(false);

  // Linking to Teacher state
  const [enteredTeacherCode, setEnteredTeacherCode] = useState("");
  const [linkStatus, setLinkStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Teacher specific state
  const [linkedStudentsList, setLinkedStudentsList] = useState<UserProfile[]>([]);
  const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<UserProfile | null>(null);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Confetti / particle trigger
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Voice-to-Text States
  const [studentTab, setStudentTab] = useState<"copia" | "voice">("copia");
  const [voiceTextRaw, setVoiceTextRaw] = useState("");
  const [voiceTextAdjusted, setVoiceTextAdjusted] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAdjustingSpeech, setIsAdjustingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle active theme selection
  const currentTheme = THEMES.find(t => t.id === settings.theme) || THEMES[0];

  // Helper sound player
  const triggerClick = () => playClickSound(settings.enableSoundEffects);

  // Drag-and-drop vertical focus guide handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = textContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newY = moveEvent.clientY - rect.top - 20;
      newY = Math.max(0, Math.min(newY, rect.height - 40));
      setGuideY(newY);
    };
    
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = textContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touch = moveEvent.touches[0];
      let newY = touch.clientY - rect.top - 20;
      newY = Math.max(0, Math.min(newY, rect.height - 40));
      setGuideY(newY);
    };
    
    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  // Auth Status Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setIsAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        let profile = await getUserProfile(firebaseUser.uid);
        
        if (!profile) {
          // New register
          const registerRole = localStorage.getItem("copy_play_pending_role") as UserRole || selectedRoleForRegistration;
          const mappedRole = registerRole === "professor" ? "tutor" : registerRole;
          const defaultName = firebaseUser.displayName || (mappedRole === "aluno" ? "Meu Aluno" : "Meu Tutor");
          
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.uid}@copyplay.com`,
            displayName: defaultName,
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
            role: mappedRole,
            score: 0,
            level: 1,
            completedLessonsCount: 0
          };

          if (mappedRole === "tutor" || mappedRole === "professor") {
            profile.code = generateTeacherCode(profile.displayName);
          }

          await saveUserProfile(profile);
        }

        setUserProfile(profile);
        setSettings(prev => ({ ...prev, childName: profile.displayName }));

        // Load data depending on role
        if (profile.role === "tutor" || profile.role === "professor") {
          const students = await getLinkedStudents(profile.uid);
          setLinkedStudentsList(students);
          const tLessons = await getTeacherLessons(profile.uid);
          setTeacherCreatedLessons(tLessons);
        } else {
          // If student is linked, load teacher's lessons
          if (profile.linkedTeacherUid) {
            const tLessons = await getTeacherLessons(profile.linkedTeacherUid);
            setTeacherCreatedLessons(tLessons);
          }
        }
        
        setActiveScreen("home");
      } else {
        setUser(null);
        setUserProfile(null);
        setTeacherCreatedLessons([]);
        setLinkedStudentsList([]);
        setActiveScreen("welcome");
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [selectedRoleForRegistration]);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem("copy_play_settings", JSON.stringify(settings));
  }, [settings]);

  // Track active lesson start time
  useEffect(() => {
    if (activeLessonId) {
      setLessonStartTime(Date.now());
    } else {
      setLessonStartTime(null);
    }
  }, [activeLessonId]);

  // Combine demo lessons, student custom lessons, and teacher created lessons
  useEffect(() => {
    const studentCustom = getStoredStudentLessons();
    // Avoid duplicate IDs
    const teacherAndStudent = [...teacherCreatedLessons];
    studentCustom.forEach(sl => {
      if (!teacherAndStudent.some(tl => tl.id === sl.id)) {
        teacherAndStudent.push(sl);
      }
    });
    setLessons([...teacherAndStudent, ...DEMO_LESSONS]);
  }, [teacherCreatedLessons]);

  // Handle Google Login (Gmail)
  const handleGoogleLogin = async (role: UserRole) => {
    triggerClick();
    setAuthError(null);
    localStorage.setItem("copy_play_pending_role", role);
    setSelectedRoleForRegistration(role);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Gmail Popup blocked or failed, offering anonymous sandbox fallback", error);
      setAuthError("Não foi possível abrir o login do Google. Tente usar o Login Rápido de Testes abaixo!");
    }
  };

  // Handle Quick Simulation Login (Iframe Sandbox bypass)
  const handleSandboxLogin = async (role: UserRole, mockName: string) => {
    triggerClick();
    setAuthError(null);
    localStorage.setItem("copy_play_pending_role", role);
    setSelectedRoleForRegistration(role);
    try {
      setIsAuthLoading(true);
      // We sign in anonymously - standard, fast, and does NOT require a popup
      const creds = await signInAnonymously(auth);
      
      const seed = Math.floor(Math.random() * 1000);
      const isTeacher = role === "tutor" || role === "professor";
      const mappedRole = role === "professor" ? "tutor" : role;
      
      const newProfile: UserProfile = {
        uid: creds.user.uid,
        email: `${creds.user.uid}@sandbox.copyplay.com`,
        displayName: mockName,
        photoURL: `https://api.dicebear.com/7.x/${isTeacher ? "bottts" : "adventurer"}/svg?seed=${seed}`,
        role: mappedRole,
        score: isTeacher ? 0 : 20, // Start sandbox student with 20 score for beautiful patents testing
        level: isTeacher ? 1 : 2,
        completedLessonsCount: 0
      };

      if (isTeacher) {
        newProfile.code = generateTeacherCode(mockName);
      }

      await saveUserProfile(newProfile);
      setUserProfile(newProfile);
      setSettings(prev => ({ ...prev, childName: mockName }));
      
      if (isTeacher) {
        const students = await getLinkedStudents(newProfile.uid);
        setLinkedStudentsList(students);
      }
      
      setActiveScreen("home");
    } catch (error: any) {
      console.error("Sandbox login error:", error);
      setAuthError("Erro ao iniciar login rápido: " + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    triggerClick();
    stopSpeaking();
    setTtsPlaying(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Signout error:", error);
    }
  };

  // Profile Photo Camera capture success handler
  const handleCameraCapture = async (dataUrl: string) => {
    triggerClick();
    setShowCameraCapture(false);
    if (userProfile) {
      const updatedProfile = { ...userProfile, customPhotoURL: dataUrl };
      setUserProfile(updatedProfile);
      await saveUserProfile(updatedProfile);
      
      // If linked teacher, let's update local lists
      if (userProfile.role === "aluno" && userProfile.linkedTeacherUid) {
        // Just triggers re-save
      }
    }
  };

  // Lesson image Camera capture success handler
  const handleLessonCameraCapture = (dataUrl: string) => {
    triggerClick();
    setImageMimeType("image/jpeg");
    setSelectedImage(dataUrl);
    setProcessError(null);
    setShowLessonCameraCapture(false);
  };

  const startSpeechRecording = () => {
    triggerClick();
    setSpeechError(null);
    setVoiceTextRaw("");
    setVoiceTextAdjusted("");
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("O reconhecimento de voz não é suportado pelo seu navegador. Tente usar o Google Chrome!");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "pt-BR";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        let finalResult = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalResult += event.results[i][0].transcript + " ";
          }
        }
        
        if (finalResult) {
          setVoiceTextRaw(prev => {
            const combined = prev + finalResult;
            return cleanSpeechTranscript(combined);
          });
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        if (event.error === "no-speech") {
          setSpeechError("Não ouvimos nenhuma fala. Tente novamente!");
        } else {
          setSpeechError("Erro no microfone ou permissão: " + event.error);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      setSpeechError("Erro ao iniciar gravador: " + e.message);
      setIsRecording(false);
    }
  };

  const stopSpeechRecording = () => {
    triggerClick();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const cleanSpeechTranscript = (text: string): string => {
    const words = text.trim().split(/\s+/);
    const result: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i].trim();
      if (!currentWord) continue;
      
      const cleanCurrent = currentWord.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
      const cleanPrev = result.length > 0 
        ? result[result.length - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
        : null;
        
      if (cleanCurrent !== cleanPrev) {
        result.push(currentWord);
      }
    }
    
    return result.join(" ");
  };

  const handleAdjustSpeechCoherence = async () => {
    triggerClick();
    if (!voiceTextRaw.trim()) {
      setSpeechError("Por favor, fale alguma coisa antes de ajustar!");
      return;
    }

    setIsAdjustingSpeech(true);
    setSpeechError(null);

    try {
      const response = await fetch("/api/adjust-speech-coherence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: voiceTextRaw }),
      });

      if (!response.ok) {
        throw new Error("Erro ao ajustar o texto de voz.");
      }

      const data = await response.json();
      setVoiceTextAdjusted(data.adjustedText);
    } catch (error: any) {
      console.error(error);
      setSpeechError("Ocorreu um erro ao ajustar seu texto. Tente novamente!");
    } finally {
      setIsAdjustingSpeech(false);
    }
  };

  const handleCreateActivityFromSpeech = async () => {
    triggerClick();
    const textToProcess = voiceTextAdjusted || voiceTextRaw;
    if (!textToProcess.trim()) {
      setSpeechError("Não há texto para adaptar em lição.");
      return;
    }

    setIsAdjustingSpeech(true);
    setSpeechError(null);

    try {
      const payload = {
        image: null,
        mimeType: null,
        text: textToProcess,
        chunkPreference: settings.chunkPreference,
      };

      const response = await fetch("/api/process-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar lição de cópia do texto falado.");
      }

      const result = await response.json();

      const newLesson: AdaptedLesson = {
        id: "lesson-voice-" + Date.now(),
        title: result.title || "Minha Fala de Cópia 🎤✨",
        adaptedExplanation: result.adaptedExplanation || "Preparado para copiar o que você falou?",
        chunks: result.chunks || [],
        createdAt: new Date().toISOString(),
        originalInputType: "text",
        createdByUid: userProfile?.uid
      };

      if (userProfile?.role === "tutor" || userProfile?.role === "professor") {
        await createTeacherLesson(userProfile.uid, newLesson);
        const l = await getTeacherLessons(userProfile.uid);
        setTeacherCreatedLessons(l);
        alert("Lição criada de sua fala e enviada aos alunos com sucesso! 🎒✨");
        setActiveScreen("home");
      } else {
        saveStudentLessonToStorage(newLesson);
        setTeacherCreatedLessons(prev => [newLesson, ...prev]);
        setActiveLessonId(newLesson.id);
        setCurrentChunkIndex(0);
        setActiveScreen("lesson-viewer");
      }

      // Clean voice state
      setVoiceTextRaw("");
      setVoiceTextAdjusted("");
    } catch (error: any) {
      console.error(error);
      setSpeechError("Ocorreu um erro ao criar a lição de cópia: " + error.message);
    } finally {
      setIsAdjustingSpeech(false);
    }
  };

  // Student: Linking teacher via Code
  const handleLinkTeacher = async () => {
    triggerClick();
    if (!enteredTeacherCode.trim() || !userProfile) return;
    setIsLinking(true);
    setLinkStatus(null);
    try {
      const result = await linkStudentToTeacher(userProfile.uid, enteredTeacherCode);
      if (result.success) {
        setLinkStatus({ success: true, message: `Conectado com sucesso ao Professor(a) ${result.teacherName || "de Cópia"}! 🎒✨` });
        
        // Refresh local student profile
        const refreshedProfile = await getUserProfile(userProfile.uid);
        if (refreshedProfile) {
          setUserProfile(refreshedProfile);
          if (refreshedProfile.linkedTeacherUid) {
            const tLessons = await getTeacherLessons(refreshedProfile.linkedTeacherUid);
            setTeacherCreatedLessons(tLessons);
          }
        }
        setEnteredTeacherCode("");
      } else {
        setLinkStatus({ success: false, message: result.error || "Ocorreu um erro ao vincular." });
      }
    } catch (error: any) {
      setLinkStatus({ success: false, message: "Erro de conexão: " + error.message });
    } finally {
      setIsLinking(false);
    }
  };

  // Teacher: Refresh linked students
  const handleRefreshStudents = async () => {
    triggerClick();
    if (!userProfile || (userProfile.role !== "tutor" && userProfile.role !== "professor")) return;
    setIsRefreshingStudents(true);
    try {
      const list = await getLinkedStudents(userProfile.uid);
      setLinkedStudentsList(list);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshingStudents(false);
    }
  };

  // Open Detailed Student Report
  const handleOpenStudentReport = async (student: UserProfile) => {
    triggerClick();
    setSelectedStudentForReport(student);
    setIsLoadingLogs(true);
    try {
      const logs = await getStudentActivityLogs(student.uid);
      setSelectedStudentLogs(logs);
    } catch (error) {
      console.error("Error loading student logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Convert File to base64
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setProcessError("Por favor, envie apenas arquivos de imagem.");
      return;
    }
    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setProcessError(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Send content to Gemini API via Server proxy
  const handleProcessContent = async () => {
    triggerClick();
    if (uploadTab === "image" && !selectedImage) {
      setProcessError("Por favor, selecione ou tire uma foto antes!");
      return;
    }
    if (uploadTab === "text" && !textInput.trim()) {
      setProcessError("Por favor, digite ou cole um texto!");
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    try {
      const payload = {
        image: uploadTab === "image" ? selectedImage : null,
        mimeType: uploadTab === "image" ? imageMimeType : null,
        text: uploadTab === "text" ? textInput : null,
        chunkPreference: settings.chunkPreference,
      };

      const response = await fetch("/api/process-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocorreu um erro no servidor de inteligência artificial.");
      }

      const result = await response.json();

      // Create new lesson object
      const newLesson: AdaptedLesson = {
        id: "lesson-" + Date.now(),
        title: result.title || "Minha Nova Lição ✨",
        adaptedExplanation: result.adaptedExplanation || "Preparado para escrever com capricho?",
        chunks: result.chunks || [],
        createdAt: new Date().toISOString(),
        originalInputType: uploadTab,
        createdByUid: userProfile?.uid // Tag with creator UID
      };

      if (!newLesson.chunks || newLesson.chunks.length === 0) {
        throw new Error("Não conseguimos dividir o texto em pedaços. Tente com outro conteúdo.");
      }

      if (userProfile?.role === "tutor" || userProfile?.role === "professor") {
        // Save to Firestore so linked students instantly fetch it
        await createTeacherLesson(userProfile.uid, newLesson);
        const tLessons = await getTeacherLessons(userProfile.uid);
        setTeacherCreatedLessons(tLessons);
        
        alert("Lição adaptada com sucesso! Ela já está disponível no painel de todos os seus alunos vinculados! 🎒✨");
        setActiveScreen("home");
      } else {
        // Saved locally for independent students
        saveStudentLessonToStorage(newLesson);
        setTeacherCreatedLessons(prev => [newLesson, ...prev]);
        setActiveLessonId(newLesson.id);
        setCurrentChunkIndex(0);
        setActiveScreen("lesson-viewer");
      }
      
      // Clean form inputs
      setSelectedImage(null);
      setTextInput("");
    } catch (error: any) {
      console.error(error);
      setProcessError(error.message || "Não foi possível ler esta foto. Tente tirar outra foto mais nítida ou digite o texto.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Select demo or existing lesson
  const handleStartLesson = (lessonId: string) => {
    triggerClick();
    setActiveLessonId(lessonId);
    setCurrentChunkIndex(0);
    setActiveScreen("lesson-viewer");
    setGuideY(120); // Reset focal guide height
    stopSpeaking();
    setTtsPlaying(false);
  };

  const activeLesson = lessons.find(l => l.id === activeLessonId);

  // Play audio/TTS for current chunk
  const handlePlayChunkAudio = () => {
    if (!activeLesson) return;
    const currentChunk = activeLesson.chunks[currentChunkIndex];
    if (!currentChunk) return;

    triggerClick();

    if (ttsPlaying) {
      stopSpeaking();
      setTtsPlaying(false);
    } else {
      setTtsPlaying(true);
      speakText(currentChunk.text, {
        enabled: settings.enableAudio,
        rate: 0.72, // Slower, easy pace
        pitch: 1.2, // Friendly high tone
        onStart: () => setTtsPlaying(true),
        onEnd: () => setTtsPlaying(false),
        onError: () => setTtsPlaying(false),
      });
    }
  };

  // Mark current chunk as copied (earn stars!)
  const handleCompleteChunk = async () => {
    if (!activeLesson || !userProfile) return;
    const currentChunk = activeLesson.chunks[currentChunkIndex];
    if (!currentChunk) return;

    stopSpeaking();
    setTtsPlaying(false);

    // Audio & Visual rewards
    playCoinSound(settings.enableSoundEffects);
    setConfettiTrigger(prev => prev + 1);

    // Score points gained (10 points per copied chunk)
    const pointsGained = 10;

    // Pick a fun praise text
    const customPraise = currentChunk.praise || GENERAL_PRAISES[Math.floor(Math.random() * GENERAL_PRAISES.length)];
    setPraiseText(customPraise);
    setShowPraiseModal(true);

    // Calculate level progression
    const nextScore = userProfile.score + pointsGained;
    const oldLevelInfo = getLevelInfo(userProfile.score);
    const newLevelInfo = getLevelInfo(nextScore);

    // Check for level up
    if (newLevelInfo.level > oldLevelInfo.level) {
      setTimeout(() => {
        playLevelUpSound(settings.enableSoundEffects);
      }, 500);
    }

    // Save progression in Firestore for synced user profile
    const updatedProfile: UserProfile = {
      ...userProfile,
      score: nextScore,
      level: newLevelInfo.level
    };

    setUserProfile(updatedProfile);
    await saveUserProfile(updatedProfile);

    // Speak praise to child!
    if (settings.enableAudio) {
      setTimeout(() => {
        speakText(customPraise, {
          enabled: true,
          rate: 0.85,
          pitch: 1.25,
        });
      }, 400);
    }
  };

  // Move forward in active lesson after praise
  const handleClosePraiseAndContinue = async () => {
    triggerClick();
    setShowPraiseModal(false);
    stopSpeaking();

    if (!activeLesson || !userProfile) return;
    const isLastChunk = currentChunkIndex === activeLesson.chunks.length - 1;

    if (isLastChunk) {
      // Lesson fully completed!
      const updatedProfile: UserProfile = {
        ...userProfile,
        completedLessonsCount: userProfile.completedLessonsCount + 1
      };
      setUserProfile(updatedProfile);
      await saveUserProfile(updatedProfile);

      // Save activity log for tutor tracking
      try {
        const durationSecs = lessonStartTime ? Math.max(5, Math.floor((Date.now() - lessonStartTime) / 1000)) : 60;
        const totalChars = activeLesson.chunks.reduce((sum, ch) => sum + ch.text.length, 0);
        const logId = `log-${userProfile.uid}-${activeLesson.id}-${Date.now()}`;
        const newLog: ActivityLog = {
          id: logId,
          studentUid: userProfile.uid,
          studentName: userProfile.displayName,
          lessonId: activeLesson.id,
          lessonTitle: activeLesson.title,
          completedAt: new Date().toISOString(),
          durationSeconds: durationSecs,
          totalChunks: activeLesson.chunks.length,
          totalCharacters: totalChars,
          scoreEarned: activeLesson.chunks.length * 10,
          avgTimePerChunk: activeLesson.chunks.length > 0 ? Math.round(durationSecs / activeLesson.chunks.length) : 0,
        };
        await saveActivityLog(newLog);
      } catch (logErr) {
        console.error("Error saving activity log:", logErr);
      }

      // Celebrate lesson completion
      playLevelUpSound(settings.enableSoundEffects);
      setActiveScreen("home");
      setActiveLessonId(null);
    } else {
      setCurrentChunkIndex(prev => prev + 1);
    }
  };

  // Progress level details
  const levelDetails = getLevelInfo(userProfile?.score || 0);
  const patentDetails = getPatent(userProfile?.score || 0);

  // loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-white flex items-center justify-center border-2 border-slate-100 shadow-lg animate-bounce">
          <img src={copyPlayLogo} alt="CopyPlay Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <h3 className="font-display font-extrabold text-xl text-slate-800 mt-4 animate-pulse">
          Carregando seu Copy Play...
        </h3>
        <p className="text-slate-400 text-sm font-medium mt-1">Carregando estrelas e lições mágicas!</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 pb-12 overflow-x-hidden selection:bg-amber-200 selection:text-amber-900 ${
      settings.highContrast 
        ? "bg-slate-950 text-white" 
        : currentTheme.bg
    }`}>
      
      {/* Dynamic Confetti Emitter */}
      <EmojiShower triggerCount={confettiTrigger} />

      {/* Camera Capture Modal */}
      {showCameraCapture && (
        <CameraCapture 
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraCapture(false)}
        />
      )}

      {/* Lesson Camera Capture Modal */}
      {showLessonCameraCapture && (
        <LessonCameraCapture 
          onCapture={handleLessonCameraCapture}
          onClose={() => setShowLessonCameraCapture(false)}
        />
      )}

      {/* HEADER / NAVIGATION BAR */}
      {userProfile && (
        <header className={`sticky top-0 z-40 border-b shadow-sm px-4 py-3 ${
          settings.highContrast 
            ? "bg-slate-900 border-slate-700" 
            : "bg-white/85 backdrop-blur-md border-slate-100"
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Logo / Mascot and Greeting */}
            <div 
              id="header-branding"
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => { 
                triggerClick(); 
                if (userProfile.role === "tutor" || userProfile.role === "professor") {
                  setTutorViewMode("tutor");
                }
                setActiveScreen("home"); 
              }}
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-white flex items-center justify-center border-2 border-slate-200/60 shadow-md hover:scale-105 transition-transform shrink-0">
                <img src={copyPlayLogo} alt="CopyPlay Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h1 className="font-display font-bold text-base md:text-lg text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                  <span className={settings.highContrast ? "text-yellow-400 font-black" : "text-slate-800"}>CopyPlay</span>
                </h1>
                <p className={`text-xs font-medium leading-tight ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                  Olá, <span className="font-bold text-amber-500">{userProfile.displayName}</span>! 
                  <span className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${(userProfile.role === "tutor" || userProfile.role === "professor") ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {(userProfile.role === "tutor" || userProfile.role === "professor") ? "Tutor" : "Aluno"}
                  </span>
                </p>
              </div>
            </div>

            {/* Score, Level Pill & Action Buttons */}
            <div className="flex items-center gap-2">
              
              {/* Only for students: display score and level */}
              {(userProfile.role === "aluno" || tutorViewMode === "aluno") && (
                <div 
                  id="header-stats-pill"
                  className={`border rounded-full px-3 py-1 flex items-center gap-2 cursor-pointer transition-all ${
                    settings.highContrast
                      ? "bg-slate-800 border-yellow-400 text-yellow-400"
                      : "bg-amber-100/80 border-amber-200/60 text-amber-900 hover:bg-amber-200/70"
                  }`}
                  onClick={() => { triggerClick(); setActiveScreen("settings"); }}
                  title="Seu nível atual e pontuação!"
                >
                  <div className="bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                    ★
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold leading-none text-amber-600">Nível {levelDetails.level}</span>
                    <span className="font-bold text-xs leading-none">{userProfile.score} pts</span>
                  </div>
                </div>
              )}

              {/* High Contrast Quick Access Toggle */}
              <button
                onClick={() => {
                  triggerClick();
                  setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
                }}
                className={`p-2 rounded-full border transition-all ${
                  settings.highContrast 
                    ? "bg-yellow-400 border-yellow-500 text-slate-950" 
                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                }`}
                title="Alternar Modo de Alto Contraste para acessibilidade"
              >
                <Contrast size={18} />
              </button>

              {/* Home navigation if on secondary pages */}
              {activeScreen !== "home" && (
                <button
                  id="nav-btn-home"
                  onClick={() => { triggerClick(); setActiveScreen("home"); }}
                  className={`p-2 rounded-full transition-colors ${
                    settings.highContrast ? "text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Voltar para a página inicial"
                >
                  <BookOpen size={18} />
                </button>
              )}

              {/* Settings Trigger */}
              <button
                id="nav-btn-settings"
                onClick={() => { triggerClick(); setActiveScreen("settings"); }}
                className={`p-2 rounded-full transition-colors ${
                  activeScreen === "settings"
                    ? "bg-amber-100 text-amber-800"
                    : settings.highContrast ? "text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Configurações e preferências"
              >
                <Settings size={18} />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={`p-2 rounded-full transition-colors ${
                  settings.highContrast ? "text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Sair da conta"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 mt-6">

        {/* ==================================== */}
        {/* WELCOME / LOGIN SCREEN               */}
        {/* ==================================== */}
        {!userProfile && (
          <div id="screen-welcome" className="max-w-md mx-auto bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-8 mt-6 text-center animate-fade-in text-slate-900">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden bg-white flex items-center justify-center mx-auto mb-6 border-3 border-amber-300 shadow-lg animate-float">
              <img src={copyPlayLogo} alt="CopyPlay Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            
            <h2 className="font-display font-black text-2xl text-slate-800 mb-1">
              CopyPlay ✍️
            </h2>
            <p className="text-slate-500 font-medium text-sm mb-6 leading-relaxed">
              Transformando tarefas compridas em pedacinhos curtinhos e divertidos de copiar para crianças com <span className="text-amber-600 font-extrabold">TEA e TDAH</span>.
            </p>

            {/* ROLE SELECTOR CARDS */}
            <div className="space-y-2 text-left mb-6">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                Quem está acessando o portal?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { triggerClick(); setSelectedRoleForRegistration("aluno"); }}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                    selectedRoleForRegistration === "aluno"
                      ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-500"
                  }`}
                >
                  <span className="text-3xl">🎒</span>
                  <span className="font-bold text-sm">Sou Aluno</span>
                </button>
                <button
                  onClick={() => { triggerClick(); setSelectedRoleForRegistration("tutor"); }}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                    selectedRoleForRegistration === "tutor" || selectedRoleForRegistration === "professor"
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-500"
                  }`}
                >
                  <span className="text-3xl">👩‍🏫</span>
                  <span className="font-bold text-sm">Sou Tutor</span>
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs rounded-xl mb-4 text-left leading-relaxed">
                {authError}
              </div>
            )}

            {/* LOGIN BUTTONS */}
            <div className="space-y-3">
              <button
                onClick={() => handleGoogleLogin(selectedRoleForRegistration)}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold py-3 px-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">🌐</span> Entrar com Google (Gmail)
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <hr className="w-full border-slate-100" />
                <span className="absolute bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">ou use para testes</span>
              </div>

              <button
                onClick={() => handleSandboxLogin(
                  selectedRoleForRegistration, 
                  selectedRoleForRegistration === "aluno" ? "Pedro (Aluno Sandbox)" : "Tutor Cláudio (Sandbox)"
                )}
                className={`w-full text-white font-display font-extrabold py-3 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
                  selectedRoleForRegistration === "aluno" 
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                }`}
              >
                <Sparkles size={16} /> Entrar sem Cadastro (Bypass Iframe)
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold mt-6 leading-relaxed">
              * O Login Rápido resolve problemas de bloqueio de popups no iframe de desenvolvimento e salva seu progresso normalmente!
            </p>
          </div>
        )}

        {/* ==================================== */}
        {/* STUDENT DASHBOARD SCREEN             */}
        {/* ==================================== */}
        {userProfile && (userProfile.role === "aluno" || (userProfile.role !== "aluno" && tutorViewMode === "aluno")) && activeScreen === "home" && (
          <div id="screen-home-student" className="space-y-6 animate-fade-in">
            {/* If the user is a tutor/professor and they are in student view mode, show a banner to go back */}
            {userProfile && (userProfile.role === "tutor" || userProfile.role === "professor") && tutorViewMode === "aluno" && (
              <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm text-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👩‍🏫</span>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-indigo-900">Você está no Modo Aluno</p>
                    <p className="text-[11px] text-indigo-600 font-bold">Experimente os treinos de escrita, foco e som. Seu progresso como tutor não afeta seus alunos.</p>
                  </div>
                </div>
                <button
                  onClick={() => { triggerClick(); setTutorViewMode("tutor"); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-display font-black text-xs rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
                >
                  Voltar ao Portal do Tutor 👩‍🏫
                </button>
              </div>
            )}
            
            {/* HER0 GAMIFICATION AND PROFILE CARD */}
            <div className={`p-6 rounded-3xl border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              settings.highContrast
                ? "bg-slate-900 border-yellow-400 text-white"
                : "bg-white border-sky-100"
            }`}>
              <div className="relative z-10 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                    settings.highContrast ? "bg-slate-800 text-yellow-400 border border-yellow-400" : "bg-sky-100 text-sky-800"
                  }`}>
                    Nível {levelDetails.level}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${patentDetails.color}`}>
                    {patentDetails.emoji} {patentDetails.name}
                  </span>
                </div>

                <h3 className="font-display font-black text-2xl">
                  {userProfile.displayName} 🌟
                </h3>
                
                <p className={`text-sm font-medium leading-relaxed max-w-md ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                  {userProfile.score === 0 ? (
                    "Olá! Escolha uma lição abaixo para ganhar suas primeiras estrelas de escrita! ⭐"
                  ) : (
                    `Muito bem! Você já acumulou ${userProfile.score} pontos mágicos. Cada 10 pontos dão uma nova patente de escrita!`
                  )}
                </p>

                {/* Level progression bar */}
                <div className="space-y-1 pt-1">
                  <div className={`flex justify-between text-xs font-bold ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                    <span>{userProfile.score} pts</span>
                    <span>Próximo nível: {levelDetails.nextTitle} ({levelDetails.nextMin} pts)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                      style={{ width: `${levelDetails.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Character Profile / Camera Capture widget */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center min-w-[150px] relative text-slate-800">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-300 mb-2">
                  <img 
                    src={userProfile.customPhotoURL || userProfile.photoURL} 
                    alt="Seu Perfil" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => { triggerClick(); setShowCameraCapture(true); }}
                    className="absolute inset-0 bg-slate-900/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                  >
                    Mudar Foto 📷
                  </button>
                </div>
                
                <button
                  onClick={() => { triggerClick(); setShowCameraCapture(true); }}
                  className="text-[10px] font-bold text-amber-600 hover:underline flex items-center justify-center gap-1"
                >
                  <Camera size={12} /> Usar Câmera
                </button>
                
                <div className="font-bold text-xs text-slate-700 mt-2 uppercase tracking-wide leading-none">
                  {userProfile.completedLessonsCount} Lições Feitas
                </div>
              </div>
            </div>

            {/* SEPARATED FUNCTIONS SELECTOR TABS */}
            <div className="flex p-1.5 bg-slate-100 border border-slate-200/50 rounded-2xl gap-2 w-full max-w-xl mx-auto">
              <button
                id="tab-copia-tradicional"
                onClick={() => { triggerClick(); stopSpeechRecording(); setStudentTab("copia"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-display font-black text-sm transition-all cursor-pointer ${
                  studentTab === "copia"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-slate-950 shadow-md"
                      : "bg-white text-slate-950 shadow-md hover:scale-[1.01]"
                    : settings.highContrast
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ✍️ Treino de Cópia
              </button>
              <button
                id="tab-falar-copiar"
                onClick={() => { triggerClick(); setStudentTab("voice"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-display font-black text-sm transition-all cursor-pointer ${
                  studentTab === "voice"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-slate-950 shadow-md"
                      : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md hover:scale-[1.01]"
                    : settings.highContrast
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-teal-600"
                }`}
              >
                🎙️ Falar e Copiar
              </button>
            </div>

            {studentTab === "copia" && (
              <div id="tab-content-copia" className="space-y-6 w-full animate-fade-in">
                {/* VINCULATE TO TEACHER SECTION */}
                <div className={`p-5 rounded-3xl border-2 ${
                  settings.highContrast
                    ? "bg-slate-900 border-yellow-400/50 text-white"
                    : "bg-white border-slate-100"
                }`}>
                  <h4 className="font-display font-extrabold text-base mb-1.5 flex items-center gap-2">
                    Conectar ao seu Tutor 🔗
                  </h4>
                  
                  {userProfile.linkedTeacherUid ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">👩‍🏫</span>
                        <div>
                          <p className="text-xs font-extrabold text-emerald-800">Vinculado com Sucesso!</p>
                          <p className="text-sm font-bold text-slate-700">Seu Tutor acompanha seu progresso em tempo real.</p>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-full">Ativo ✅</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className={`text-xs font-medium leading-relaxed ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                        Seu Tutor te passou um código? Digite ele abaixo para receber as atividades personalizadas enviadas por ele!
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: CLD312"
                          value={enteredTeacherCode}
                          onChange={(e) => setEnteredTeacherCode(e.target.value)}
                          maxLength={8}
                          className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-400 font-bold uppercase text-slate-700 bg-slate-50 text-sm"
                        />
                        <button
                          onClick={handleLinkTeacher}
                          disabled={isLinking || !enteredTeacherCode.trim()}
                          className="bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          {isLinking ? "Conectando..." : "Vincular Código"}
                        </button>
                      </div>
                      {linkStatus && (
                        <p className={`text-xs font-bold ${linkStatus.success ? "text-emerald-500" : "text-rose-500"}`}>
                          {linkStatus.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* TEACHER ASSIGNED LESSONS INFO */}
                {userProfile.linkedTeacherUid && teacherCreatedLessons.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-4 flex gap-3 items-center text-indigo-900">
                    <span className="text-2xl animate-pulse">📚</span>
                    <p className="text-xs font-bold leading-relaxed">
                      Atenção! Seu Tutor te enviou <span className="text-indigo-600 font-black">{teacherCreatedLessons.length} lições personalizadas</span>! Elas aparecem com o selo amarelo na lista abaixo. Divirta-se!
                    </p>
                  </div>
                )}

                {/* STUDENT ACTION CARD: CREATE OWN LESSON */}
                <div id="box-student-create-lesson" className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-3xl p-5 md:p-6 shadow-md hover:shadow-lg transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-amber-950">
                      <Sparkles size={12} /> Crie Sua Atividade
                    </div>
                    <h4 className="font-display font-black text-lg md:text-xl text-white">
                      Quer treinar com seu próprio livro ou dever? 🎒
                    </h4>
                    <p className="text-amber-50 text-xs font-semibold leading-relaxed max-w-lg">
                      Tire foto de uma folha de papel ou livro escolar, ou digite um texto. Nossa IA vai transformar tudo em frases fáceis de copiar!
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-center">
                    <button
                      id="btn-student-photo-lesson"
                      onClick={() => { triggerClick(); setUploadTab("image"); setActiveScreen("add-lesson"); setShowLessonCameraCapture(true); }}
                      className="bg-white text-amber-700 hover:bg-amber-50 font-display font-black text-xs px-4 py-3 rounded-2xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 md:flex-none"
                    >
                      <Camera size={16} /> Fotografar Tarefa 📸
                    </button>
                    <button
                      id="btn-student-text-lesson"
                      onClick={() => { triggerClick(); setUploadTab("text"); setActiveScreen("add-lesson"); }}
                      className="bg-amber-900/40 hover:bg-amber-900/60 text-white font-display font-bold text-xs px-4 py-3 rounded-2xl border border-white/20 shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 md:flex-none"
                    >
                      <Plus size={16} /> Criar por Texto ✍️
                    </button>
                  </div>
                </div>

                {/* LESSONS LIST */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-display font-black text-xl flex items-center gap-2">
                      Sua Coleção de Lições 📚
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">{lessons.length} disponíveis</span>
                      <button
                        id="btn-student-add-lesson-mini"
                        onClick={() => { triggerClick(); setActiveScreen("add-lesson"); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={16} /> Criar Atividade
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessons.map((lesson) => {
                      const completedChunks = lesson.chunks.filter(chunk => 
                        userProfile.completedChunkIds?.includes(`${lesson.id}-${chunk.id}`) || false
                      );
                      const isLessonFullyDone = completedChunks.length === lesson.chunks.length && lesson.chunks.length > 0;
                      const isTeacherCreated = lesson.createdByUid !== undefined;

                      return (
                        <div
                          id={`lesson-card-${lesson.id}`}
                          key={lesson.id}
                          onClick={() => handleStartLesson(lesson.id)}
                          className={`group relative border-2 rounded-3xl p-5 hover:border-slate-300 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 ${
                            isLessonFullyDone 
                              ? "border-emerald-200 bg-emerald-50/10" 
                              : settings.highContrast ? "bg-slate-900 border-slate-700 hover:border-yellow-400" : "bg-white border-slate-100"
                          }`}
                        >
                          {isLessonFullyDone && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white rounded-full p-1 shadow-sm">
                              <CheckCircle size={14} />
                            </div>
                          )}

                          <div className="space-y-1.5 pr-6">
                            <div className="flex items-center gap-1.5">
                              {isTeacherCreated ? (
                                <span className="text-[9px] uppercase font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                  ⭐ Do Tutor
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Treinar Caligrafia
                                </span>
                              )}
                            </div>
                            
                            <h4 className={`font-display font-bold text-base line-clamp-1 group-hover:text-amber-500 transition-colors ${
                              settings.highContrast ? "text-yellow-400" : "text-slate-800"
                            }`}>
                              {lesson.title}
                            </h4>
                            
                            <p className={`text-xs font-medium line-clamp-2 leading-relaxed ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                              {lesson.adaptedExplanation}
                            </p>
                          </div>

                          {/* Progress inside lesson */}
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                                <div 
                                  className="h-full bg-emerald-400 transition-all duration-300"
                                  style={{ width: `${(completedChunks.length / lesson.chunks.length) * 100}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                                {completedChunks.length}/{lesson.chunks.length} partes
                              </span>
                            </div>

                            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {studentTab === "voice" && (
              <div id="tab-content-voice" className="space-y-6 w-full animate-fade-in text-slate-800">
                <div className={`border-2 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-center ${
                  settings.highContrast
                    ? "bg-slate-900 border-yellow-400 text-white shadow-none"
                    : "bg-white border-slate-100"
                }`}>
                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <h3 className={`font-display font-black text-2xl flex items-center justify-center gap-2 ${
                      settings.highContrast ? "text-yellow-400" : "text-slate-800"
                    }`}>
                      Escrever com a Voz! 🎤✨
                    </h3>
                    <p className={`text-sm font-semibold leading-relaxed ${
                      settings.highContrast ? "text-slate-300" : "text-slate-500"
                    }`}>
                      Fale sua resposta ou um textinho para o aplicativo. A inteligência artificial vai escutar, sintetizar o texto sem erros e criar uma atividade de cópia sob medida para você!
                    </p>
                  </div>

                  {/* RECORDING CONTROLS */}
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <button
                      id="btn-voice-record-toggle-tab"
                      onClick={isRecording ? stopSpeechRecording : startSpeechRecording}
                      className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                        isRecording 
                          ? "bg-rose-500 text-white animate-pulse ring-8 ring-rose-100" 
                          : settings.highContrast
                            ? "bg-slate-950 border-2 border-yellow-400 text-yellow-400"
                            : "bg-teal-500 text-white ring-8 ring-teal-50"
                      }`}
                      title={isRecording ? "Parar Gravação" : "Iniciar Gravação de Voz"}
                    >
                      {isRecording ? "🛑" : "🎙️"}
                    </button>
                    
                    <div className="space-y-1">
                      <p className={`font-extrabold text-sm ${settings.highContrast ? "text-slate-200" : "text-slate-700"}`}>
                        {isRecording ? "Estou escutando! Fale devagar... 👂" : "Clique no microfone para falar!"}
                      </p>
                      {isRecording && (
                        <p className="text-[10px] uppercase tracking-wider font-bold text-rose-500 animate-pulse">
                          Gravando Áudio Ativo
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DISPLAY RAW CAPTURED SPEECH */}
                  {voiceTextRaw && (
                    <div className={`space-y-2 text-left p-5 rounded-2xl border ${
                      settings.highContrast ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-100"
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          🗣️ O que eu captei de sua voz:
                        </span>
                        <button 
                          onClick={() => { triggerClick(); setVoiceTextRaw(""); setVoiceTextAdjusted(""); }}
                          className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                      <p className="font-bold text-base leading-relaxed">
                        "{voiceTextRaw}"
                      </p>
                    </div>
                  )}

                  {/* ACTION: ADJUST TEXT WITH GEMINI */}
                  {voiceTextRaw && !voiceTextAdjusted && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleAdjustSpeechCoherence}
                        disabled={isAdjustingSpeech}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                      >
                        {isAdjustingSpeech ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            IA Ajustando Coerência...
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Organizar meu Texto com IA ✨
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* DISPLAY ADJUSTED COHERENT SPEECH */}
                  {voiceTextAdjusted && (
                    <div className={`space-y-3 text-left p-5 rounded-2xl border animate-fade-in ${
                      settings.highContrast ? "bg-slate-950 border-yellow-400 text-white" : "bg-indigo-50/40 border-indigo-100/50"
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1">
                        ✨ Texto Organizado e Lindo para Cópia:
                      </span>
                      <p className={`font-black text-lg leading-relaxed ${settings.highContrast ? "text-yellow-400" : "text-indigo-950"}`}>
                        {voiceTextAdjusted}
                      </p>
                      <p className="text-slate-400 text-[10px] font-semibold leading-relaxed">
                        Sem palavras duplicadas, estruturado de forma fluída e com emojis de incentivo. Pronto para o caderno!
                      </p>
                    </div>
                  )}

                  {/* ACTION: START COPY ACTIVITY */}
                  {(voiceTextAdjusted || (voiceTextRaw && !isAdjustingSpeech)) && (
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        onClick={handleCreateActivityFromSpeech}
                        disabled={isAdjustingSpeech}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black text-lg py-4 px-8 rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isAdjustingSpeech ? (
                          <RefreshCw size={20} className="animate-spin" />
                        ) : (
                          <>
                            ✍️ Criar Treino de Cópia!
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {speechError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs rounded-2xl text-left leading-relaxed">
                      {speechError}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================== */}
        {/* TEACHER DASHBOARD SCREEN             */}
        {/* ==================================== */}
        {userProfile && (userProfile.role === "tutor" || userProfile.role === "professor") && tutorViewMode === "tutor" && activeScreen === "home" && (
          <div id="screen-home-teacher" className="space-y-6 animate-fade-in text-slate-800">
            
            {/* EDUCATOR WELCOME BANNER */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
              <div className="space-y-2">
                <span className="bg-indigo-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Portal de Acompanhamento do Tutor 👩‍🏫
                </span>
                <h3 className="font-display font-black text-2xl">
                  {userProfile.displayName}
                </h3>
                <p className="text-indigo-100 text-xs font-medium leading-relaxed max-w-md">
                  Bem-vindo! Aqui você pode acompanhar o desempenho de seus pacientes e alunos em tempo real. Visualize relatórios detalhados de atividades concluídas e tempos de foco.
                </p>
              </div>

              {/* Linking Code Generator */}
              <div className="bg-white/10 border border-white/20 p-4 rounded-2xl w-full md:w-auto text-center space-y-1">
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-100">Código de Vinculação</p>
                <div className="text-3xl font-black tracking-widest text-yellow-300 flex items-center justify-center gap-1.5">
                  {userProfile.code} <Key size={20} className="text-white" />
                </div>
                <p className="text-[9px] text-indigo-100 font-semibold leading-none pt-1">
                  Seus alunos conectam usando este código!
                </p>
              </div>
            </div>

            {/* CLINICAL SUMMARY CARD */}
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-slate-800 flex items-center gap-1.5">
                  Acompanhamento de Atividades de Cópia e Ritmo ⏱️
                </h4>
                <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-2xl">
                  O vínculo do aluno permite acompanhar as lições de cópia concluídas, o tempo gasto em cada bloco, e o ritmo psicomotor de escrita. Clique em um aluno abaixo para abrir seu relatório completo.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">Alunos Vinculados: {linkedStudentsList.length}</span>
                <button 
                  onClick={handleRefreshStudents}
                  disabled={isRefreshingStudents}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isRefreshingStudents ? "animate-spin" : ""} /> Atualizar lista
                </button>
              </div>
            </div>

            {/* ACTION TRIGGERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option: Go to Practice Area (Student Mode) */}
              <div 
                id="box-practice-mode"
                onClick={() => { triggerClick(); setTutorViewMode("aluno"); }}
                className="bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-3xl p-6 cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group flex items-center justify-between"
              >
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg flex items-center gap-2 text-white">
                    Área do Aluno / Praticar <Sparkles size={20} />
                  </h4>
                  <p className="text-amber-50/90 text-xs font-medium leading-normal max-w-xs text-left">
                    Abra o portal do aluno para experimentar a cópia, jogar lições, usar o foco e ganhar estrelas!
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  🎒
                </div>
              </div>

              {/* Option: Create Custom Lesson */}
              <div 
                id="box-add-lesson"
                onClick={() => { triggerClick(); setActiveScreen("add-lesson"); }}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-3xl p-6 cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group flex items-center justify-between"
              >
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg flex items-center gap-2 text-white">
                    Adaptar Nova Lição <Plus size={20} />
                  </h4>
                  <p className="text-indigo-50/90 text-xs font-medium leading-normal max-w-xs text-left">
                    Tire foto de uma folha de livro ou digite um texto. Ele será dividido em pedaços e enviado a todos os alunos!
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  📸
                </div>
              </div>
            </div>

            {/* LINKED STUDENTS LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-1.5">
                  Meus Alunos e Pacientes 👩‍🎓
                </h4>
                <p className="text-xs text-slate-400 font-medium">Toque em qualquer aluno para ver o relatório clínico</p>
              </div>

              {linkedStudentsList.length === 0 ? (
                <div className="text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
                  <div className="text-3xl">📭</div>
                  <h5 className="font-display font-bold text-base text-slate-700">Nenhum aluno vinculado ainda</h5>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                    Compartilhe seu código de vinculação <strong className="text-indigo-600 font-extrabold">{userProfile.code}</strong> com os pais ou com a criança. Assim que eles digitarem o código em seus perfis, eles aparecerão aqui instantaneamente!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {linkedStudentsList.map((student) => {
                    const studentPatent = getPatent(student.score);
                    const studentLevelInfo = getLevelInfo(student.score);
                    return (
                      <div 
                        key={student.uid}
                        onClick={() => handleOpenStudentReport(student)}
                        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                      >
                        {/* Student avatar */}
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                          <img 
                            src={student.customPhotoURL || student.photoURL} 
                            alt={student.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Student info */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors leading-none">{student.displayName}</span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Nível {studentLevelInfo.level}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{studentPatent.emoji} {studentPatent.name}</span>
                            <span className="font-bold text-slate-700">{student.score} pts</span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 transition-all"
                              style={{ width: `${studentLevelInfo.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================================== */}
        {/* ADD LESSON SCREEN (UPLOAD / CAMERA)  */}
        {/* ==================================== */}
        {activeScreen === "add-lesson" && (
          <div id="screen-add-lesson" className="space-y-6 animate-fade-in text-slate-800">
            {/* Back to home */}
            <button
              id="btn-back-to-home"
              onClick={() => { triggerClick(); setActiveScreen("home"); }}
              className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 text-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para o Painel Inicial
            </button>

            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="space-y-1 text-center max-w-lg mx-auto">
                <h3 className="font-display font-bold text-2xl text-slate-800 flex items-center justify-center gap-2">
                  Carregar Conteúdo Escolar 🎒
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Envie uma foto da folha do livro ou digite o dever escolar. A Inteligência Artificial vai preparar trechos na medida ideal para copiar.
                </p>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => { triggerClick(); setUploadTab("image"); }}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    uploadTab === "image"
                      ? "border-amber-400 text-amber-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Camera size={18} /> Enviar uma Foto
                </button>
                <button
                  onClick={() => { triggerClick(); setUploadTab("text"); }}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    uploadTab === "text"
                      ? "border-amber-400 text-amber-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FileText size={18} /> Digitar/Colar o Texto
                </button>
              </div>

              {/* TAB CONTENT: IMAGE UPLOAD */}
              {uploadTab === "image" && (
                <div className="space-y-4">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-3 border-dashed rounded-3xl p-6 md:p-10 text-center transition-all relative flex flex-col items-center justify-center min-h-[220px] ${
                      dragActive ? "border-amber-400 bg-amber-50/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {selectedImage ? (
                      <div className="space-y-4 w-full max-w-xs mx-auto">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                          <img 
                            src={selectedImage} 
                            alt="Visualização do conteúdo escolar" 
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={() => { triggerClick(); setSelectedImage(null); }}
                            className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-full transition-colors"
                            title="Remover foto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-500">
                          Foto selecionada! Pronta para processar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl mx-auto shadow-inner">
                          📷
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-slate-700">
                            Arraste a foto ou clique para escolher
                          </p>
                          <p className="text-slate-400 text-xs font-medium">
                            Formatos suportados: JPG, PNG, WEBP
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-md mx-auto">
                          <button
                            type="button"
                            onClick={() => { triggerClick(); fileInputRef.current?.click(); }}
                            className="w-full sm:flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            📁 Escolher da Galeria
                          </button>
                          <button
                            type="button"
                            onClick={() => { triggerClick(); setShowLessonCameraCapture(true); }}
                            className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl font-display font-black text-sm shadow-md shadow-amber-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            📸 Tirar Foto direto
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PLAIN TEXT */}
              {uploadTab === "text" && (
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Digite ou cole o texto a ser copiado:
                  </label>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ex: No início de 1500, a esquadra de Cabral avistou terra firme..."
                    className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-base transition-colors bg-slate-50/30"
                  />
                </div>
              )}

              {processError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-xs text-left leading-relaxed">
                  {processError}
                </div>
              )}

              {/* Preferences selectors (Only show chunk preference options in form) */}
              <div className="border-t border-slate-50 pt-4 text-left">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Tamanho ideal das partes para este aluno:
                </label>
                <select
                  value={settings.chunkPreference}
                  onChange={(e) => setSettings(prev => ({ ...prev, chunkPreference: e.target.value as ChunkPreferenceType }))}
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-700 text-sm focus:outline-none"
                >
                  <option value="ultra-short">Gotas (Trechos de 3-5 palavras)</option>
                  <option value="standard">Frases Curtas (Recomendado)</option>
                  <option value="medium">Frases Médias (Até 2 sentenças)</option>
                  <option value="paragraph">Parágrafos Completos (Foco maior)</option>
                </select>
              </div>

              {/* Submit trigger button */}
              <div className="flex justify-end pt-2">
                <button
                  id="btn-process-content"
                  onClick={handleProcessContent}
                  disabled={isProcessing}
                  className={`w-full md:w-auto ${currentTheme.primaryBtn || "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100"} font-display font-bold text-lg px-8 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Pedagogia IA Adaptando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Criar e Enviar Lição ✨
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}



        {/* ==================================== */}
        {/* ACTIVE LESSON VIEW / PLAYER SCREEN    */}
        {/* ==================================== */}
        {activeScreen === "lesson-viewer" && activeLesson && (
          <div id="screen-lesson-player" className="space-y-6 animate-fade-in text-slate-800">
            
            {/* Nav Back button */}
            <button
              onClick={() => {
                triggerClick();
                stopSpeaking();
                setTtsPlaying(false);
                setActiveScreen("home");
                setActiveLessonId(null);
              }}
              className={`flex items-center gap-2 font-bold text-sm transition-colors ${
                settings.highContrast ? "text-yellow-400 hover:text-white" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <ArrowLeft size={16} /> Parar Cópia e Voltar ao Painel
            </button>

            {/* LESSON TITLE & INTRO CARDS */}
            <div className={`p-5 rounded-3xl border-2 shadow-sm space-y-3 relative ${
              settings.highContrast
                ? "bg-slate-900 border-yellow-400 text-white"
                : currentTheme.cardBg + " border-" + currentTheme.border
            }`}>
              <h2 className="font-display font-bold text-xl md:text-2xl leading-tight">
                {activeLesson.title}
              </h2>
              <p className={`text-xs md:text-sm leading-relaxed ${settings.highContrast ? "text-slate-300" : "text-slate-500"}`}>
                {activeLesson.adaptedExplanation}
              </p>

              {/* Linear lesson indicators */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {activeLesson.chunks.map((_, idx) => {
                  const chunkId = `${activeLesson.id}-${idx + 1}`;
                  const isDone = userProfile?.completedChunkIds?.includes(chunkId) || idx < currentChunkIndex;
                  const isCurrent = idx === currentChunkIndex;

                  return (
                    <div
                      key={idx}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        isCurrent 
                          ? "w-8 bg-amber-400 animate-pulse" 
                          : isDone 
                            ? "w-4 bg-emerald-400" 
                            : "w-4 bg-slate-200"
                      }`}
                      title={`Parte ${idx + 1}`}
                    />
                  );
                })}
                <span className="text-xs font-bold text-slate-400 ml-2">
                  Parte {currentChunkIndex + 1} de {activeLesson.chunks.length}
                </span>
              </div>
            </div>

            {/* PLAYER CONTROLS & ACTIVE WORD PANEL */}
            <div className="space-y-3">
              
              {/* THE TEXT DISPLAY CONTAINER */}
              <div 
                ref={textContainerRef}
                id="active-chunk-display-card"
                className={`rounded-[32px] border-3 shadow-md p-6 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[300px] transition-all ${
                  settings.highContrast
                    ? "bg-slate-950 border-yellow-400 text-white shadow-none"
                    : currentTheme.cardBg + " " + currentTheme.border
                }`}
              >
                
                {/* Custom layout controls on top corner */}
                <div className="flex items-center justify-between w-full border-b border-dashed border-slate-100 pb-3 mb-6">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${settings.highContrast ? "text-yellow-400" : "text-slate-400"}`}>
                    Copie com carinho:
                  </span>
                  <div className="flex items-center gap-2">
                    {/* High Contrast Option inside viewer */}
                    <button
                      onClick={() => { triggerClick(); setSettings(prev => ({ ...prev, highContrast: !prev.highContrast })); }}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                        settings.highContrast 
                          ? "bg-yellow-400 border-yellow-500 text-slate-950 font-extrabold" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                      title="Ativar Alto Contraste para melhor visibilidade"
                    >
                      <Contrast size={14} /> Contrast
                    </button>

                    {/* Draggable guide toggle */}
                    <button
                      onClick={() => { triggerClick(); setFocusGuide(!focusGuide); }}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                        focusGuide 
                          ? "bg-amber-100 border-amber-300 text-amber-800" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400"
                      }`}
                    >
                      <Eye size={14} /> Guia de Foco
                    </button>
                    
                    {/* Font Spacing support toggle */}
                    <button
                      onClick={() => { triggerClick(); setLetterSpacingActive(!letterSpacingActive); }}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                        letterSpacingActive 
                          ? "bg-amber-100 border-amber-300 text-amber-800" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400"
                      }`}
                      title="Espaçamento extra para apoio à dislexia"
                    >
                      <span>Abc</span>
                    </button>

                    {/* Speech helper reader */}
                    <button
                      onClick={handlePlayChunkAudio}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-1 text-xs font-bold ${
                        ttsPlaying 
                          ? "bg-amber-400 border-amber-500 text-slate-950 font-extrabold animate-pulse" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                      title="Ler frase inteira para mim"
                    >
                      <Volume2 size={14} /> Ler tudo 🔊
                    </button>
                  </div>
                </div>

                {/* THE PORTUGUESE WORDS - CLICKABLE */}
                <div className="relative py-6 flex-1 flex flex-col justify-center items-center">
                  
                  {/* Interactive Word rendering (Student clicks word, audio speaks) */}
                  <div
                    id="copy-text-display-container"
                    className="relative py-4 z-10 w-full"
                  >
                    <p 
                      id="copy-text-display"
                      className={`font-display font-semibold transition-all select-none leading-relaxed tracking-wide flex flex-wrap gap-x-3 gap-y-2 items-center justify-center ${
                        settings.highContrast
                          ? "text-yellow-400 font-extrabold"
                          : currentTheme.text || "text-slate-800"
                      } ${
                        settings.fontSize === "md" ? "text-2xl" : settings.fontSize === "lg" ? "text-3xl" : "text-4xl md:text-5xl"
                      } ${
                        letterSpacingActive ? "tracking-widest" : "tracking-wide"
                      }`}
                    >
                      {activeLesson.chunks[currentChunkIndex]?.text.split(/\s+/).map((word, wIdx) => {
                        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                        return (
                          <span
                            key={wIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              speakText(cleanWord, {
                                enabled: true,
                                rate: 0.72,
                                pitch: 1.15
                              });
                            }}
                            className={`cursor-pointer px-1.5 py-0.5 rounded transition-all active:scale-95 border-b-2 ${
                              settings.highContrast
                                ? "border-dashed border-yellow-400 hover:bg-yellow-400 hover:text-black"
                                : "border-dashed border-amber-300 hover:bg-amber-100 hover:text-slate-900"
                            }`}
                            title="Clique para ouvir esta palavra!"
                          >
                            {word}
                          </span>
                        );
                      })}
                    </p>
                  </div>

                  {/* DRAGGABLE FOCUS GUIDEWAY (ADHD/Autism Support) */}
                  {focusGuide && (
                    <div 
                      ref={guideRef}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      style={{ top: `${guideY}px` }}
                      className={`absolute left-0 right-0 h-10 md:h-12 border-y-2 rounded-lg flex items-center justify-center px-3 cursor-ns-resize shadow-md select-none touch-none transition-shadow z-20 ${
                        settings.highContrast
                          ? "bg-[#FFFF00]/45 border-[#FFFF00] text-black"
                          : "bg-yellow-300/40 border-yellow-400/80 text-amber-900"
                      }`}
                      title="Arraste esta guia amarela para cima ou para baixo para te ajudar a focar na linha!"
                    >
                      <div className="w-16 h-1.5 bg-amber-500/60 rounded-full" />
                    </div>
                  )}

                </div>

                {/* FOCUS GUIDE CONTROL FOR EXTRA COMFORT */}
                {focusGuide && (
                  <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 transition-all ${
                    settings.highContrast
                      ? "bg-slate-900 border-yellow-400 text-white"
                      : "bg-amber-50/55 border-amber-100 text-amber-900"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">↕️</span>
                      <div className="text-left">
                        <p className="text-xs font-extrabold uppercase tracking-wide">Controle da Guia de Foco</p>
                        <p className="text-[10px] font-semibold text-slate-500">Arraste a guia amarela ou use o controle deslizante abaixo:</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
                      <button 
                        onClick={() => { triggerClick(); setGuideY(prev => Math.max(0, prev - 25)); }}
                        className="bg-white hover:bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
                        title="Subir Guia"
                      >
                        ⬆️ Subir
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="260"
                        value={guideY}
                        onChange={(e) => setGuideY(Number(e.target.value))}
                        className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                        title="Deslizar para mover a guia"
                      />
                      <button 
                        onClick={() => { triggerClick(); setGuideY(prev => Math.min(260, prev + 25)); }}
                        className="bg-white hover:bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
                        title="Descer Guia"
                      >
                        ⬇️ Descer
                      </button>
                    </div>
                  </div>
                )}

                {/* COPY AND NAVIGATION BUTTONS */}
                <div className="mt-8 space-y-4">
                  {/* BIG COMPLETED CHUNK TRIGGER */}
                  <button
                    id="btn-complete-chunk"
                    onClick={handleCompleteChunk}
                    className={`w-full ${
                      settings.highContrast 
                        ? "bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black border-2 border-slate-950" 
                        : currentTheme.id === "minecraft" || currentTheme.id === "mario" || currentTheme.id === "papercraft" 
                          ? currentTheme.primaryBtn 
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100"
                    } font-display font-bold text-xl md:text-2xl py-5 rounded-[24px] shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-3`}
                  >
                    <CheckCircle size={28} /> Já terminei de copiar! ✍️⭐
                  </button>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => {
                        triggerClick();
                        stopSpeaking();
                        setTtsPlaying(false);
                        setCurrentChunkIndex(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentChunkIndex === 0}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${
                        settings.highContrast
                          ? "border-slate-700 hover:bg-slate-800 disabled:opacity-20 text-white"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      }`}
                    >
                      <ChevronLeft size={16} /> Parte Anterior
                    </button>

                    <div className={`text-xs font-bold ${settings.highContrast ? "text-yellow-400" : "text-slate-400"}`}>
                      Ganhe <span className="text-amber-500 font-extrabold">+10 estrelas</span> por terminar esta parte!
                    </div>

                    <button
                      onClick={() => {
                        triggerClick();
                        stopSpeaking();
                        setTtsPlaying(false);
                        setCurrentChunkIndex(prev => Math.min(activeLesson.chunks.length - 1, prev + 1));
                      }}
                      disabled={currentChunkIndex === activeLesson.chunks.length - 1}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${
                        settings.highContrast
                          ? "border-slate-700 hover:bg-slate-800 disabled:opacity-20 text-white"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      }`}
                    >
                      Próxima Parte <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* ASSIST ADVICE CARDS */}
            <div className={`rounded-2xl p-4 flex gap-3 items-start border ${
              settings.highContrast
                ? "bg-slate-900 border-slate-700 text-slate-200"
                : "bg-sky-50/50 border-sky-100 text-slate-700"
            }`}>
              <span className="text-xl">💡</span>
              <p className="text-xs font-medium leading-relaxed">
                <strong>Dica de Aprendizagem:</strong> Você pode clicar em qualquer palavra que achar difícil para ouvi-la bem devagar! Arraste a barra amarela ↕️ de Guia de Foco para isolar e ler com calma.
              </p>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* SETTINGS / PREFERENCES SCREEN        */}
        {/* ==================================== */}
        {activeScreen === "settings" && userProfile && (
          <div id="screen-settings" className="space-y-6 animate-fade-in text-slate-800">
            {/* Back home */}
            <button
              id="btn-settings-back"
              onClick={() => { triggerClick(); setActiveScreen("home"); }}
              className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 text-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para o Painel
            </button>

            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-display font-bold text-2xl text-slate-800">
                Ajustes e Preferências da Aventura ⚙️
              </h3>

              <div className="space-y-6">
                
                {/* Section 1: Child's Identity */}
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Seu Nome no Painel:
                  </label>
                  <input
                    type="text"
                    value={userProfile.displayName}
                    onChange={async (e) => {
                      const updated = { ...userProfile, displayName: e.target.value };
                      setUserProfile(updated);
                      await saveUserProfile(updated);
                    }}
                    placeholder="Nome do escritor..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-base transition-colors bg-slate-50/50"
                  />
                </div>

                {/* Section 2: Visual Themes */}
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Tema de Cores Acolhedor:
                  </label>
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Cada cor ativa uma paleta relaxante para diminuir a sobrecarga visual e a ansiedade.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          triggerClick();
                          setSettings(prev => ({ ...prev, theme: t.id }));
                        }}
                        className={`p-3 rounded-2xl border-2 font-bold text-sm text-left flex flex-col gap-1 transition-all ${
                          settings.theme === t.id
                            ? "border-amber-400 bg-amber-50/20"
                            : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                        }`}
                      >
                        <span className="text-xl">{t.emoji}</span>
                        <span className="text-slate-700">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                 {/* Section 3: Segment sizes */}
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Tamanho das Partes (Segmentação):
                  </label>
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Ajusta o tamanho ideal de cada bloco gerado pelo Gemini de acordo com a paciência e cansaço do estudante.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, chunkPreference: "ultra-short" }))}
                      className={`p-3.5 rounded-2xl border-2 font-semibold text-sm text-left transition-all ${
                        settings.chunkPreference === "ultra-short"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-slate-800 font-display">💧 Gotas de Escrita</div>
                      <div className="text-slate-400 text-xs mt-1">Apenas 3 a 5 palavras. Ideal para dias difíceis ou crises de resistência.</div>
                    </button>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, chunkPreference: "standard" }))}
                      className={`p-3.5 rounded-2xl border-2 font-semibold text-sm text-left transition-all ${
                        settings.chunkPreference === "standard"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-slate-800 font-display">✏️ Frases Curtas</div>
                      <div className="text-slate-400 text-xs mt-1">1 frase por vez (6 a 10 palavras). Padrão recomendado.</div>
                    </button>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, chunkPreference: "medium" }))}
                      className={`p-3.5 rounded-2xl border-2 font-semibold text-sm text-left transition-all ${
                        settings.chunkPreference === "medium"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-slate-800">📖 Frases Médias</div>
                      <div className="text-slate-400 text-xs mt-1">Até 2 frases (12 a 18 palavras). Bom para treinar maior resistência.</div>
                    </button>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, chunkPreference: "paragraph" }))}
                      className={`p-3.5 rounded-2xl border-2 font-semibold text-sm text-left transition-all ${
                        settings.chunkPreference === "paragraph"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-slate-800">📝 Parágrafo Inteiro</div>
                      <div className="text-slate-400 text-xs mt-1">Parágrafos completos (3 a 5 frases). Ideal para crianças com bom foco.</div>
                    </button>
                  </div>
                </div>

                {/* Section 4: Sound and Voice settings */}
                <div className="space-y-4 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Sons e Áudio de Apoio:
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Audio reader toggle */}
                    <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-700">Voz e Leitura Falada (TTS)</span>
                        <p className="text-xs text-slate-400">Ativa o botão de leitura para ouvir as frases bem devagar.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableAudio}
                        onChange={(e) => setSettings(prev => ({ ...prev, enableAudio: e.target.checked }))}
                        className="w-5 h-5 accent-amber-500 cursor-pointer"
                      />
                    </label>

                    {/* SFX toggle */}
                    <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-700">Efeitos de Som</span>
                        <p className="text-xs text-slate-400">Som de moedas douradas e comemoração ao completar tarefas.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableSoundEffects}
                        onChange={(e) => setSettings(prev => ({ ...prev, enableSoundEffects: e.target.checked }))}
                        className="w-5 h-5 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Section 5: High Contrast Mode toggle */}
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-bold text-slate-700">
                    Acessibilidade Visual (Alto Contraste):
                  </label>
                  <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="font-bold text-sm text-slate-700">Modo de Alto Contraste</span>
                      <p className="text-xs text-slate-400">Muda as cores para cores de alto contraste para facilitar a leitura.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => setSettings(prev => ({ ...prev, highContrast: e.target.checked }))}
                      className="w-5 h-5 accent-amber-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* RESET PROGRESS */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <span className="font-bold text-sm text-slate-700">Zerar Pontuação Local</span>
                    <p className="text-xs text-slate-400">Apaga todas as estrelas locais da memória do navegador.</p>
                  </div>
                  <button
                    onClick={async () => {
                      triggerClick();
                      if (confirm("Quer mesmo apagar suas estrelas locais?")) {
                        if (userProfile) {
                          const updated = { ...userProfile, score: 0, level: 1, completedLessonsCount: 0 };
                          setUserProfile(updated);
                          await saveUserProfile(updated);
                        }
                        alert("Pontuação reiniciada com sucesso! 🚀");
                      }
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all"
                  >
                    Resetar Jogo
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==================================== */}
      {/* PRAISE & REWARD CELEBRATION MODAL    */}
      {/* ==================================== */}
      {showPraiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-3 border-amber-300 w-full max-w-md rounded-[32px] p-8 text-center shadow-2xl relative space-y-6 text-slate-800">
            
            {/* Visual mascot / celebration */}
            <div className="w-32 h-32 bg-white border-2 border-slate-100 rounded-full overflow-hidden flex items-center justify-center mx-auto shadow-md animate-bounce">
              <img src={copyPlayLogo} alt="CopyPlay Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            <div className="space-y-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full">
                Cópia Concluída! ✍️⭐
              </span>
              <h4 className="font-display font-extrabold text-xl md:text-2xl text-slate-800 leading-tight">
                Você conseguiu!
              </h4>
              <p className="text-slate-500 font-bold text-xs">
                Ganhou <span className="text-amber-500 font-extrabold">+10 estrelas mágicas!</span>
              </p>
            </div>

            {/* Praise message */}
            <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
              <p className="font-display font-medium text-slate-700 text-base md:text-lg leading-relaxed">
                {praiseText}
              </p>
            </div>

            {/* Tts reader for the praise */}
            <button
              onClick={() => {
                triggerClick();
                speakText(praiseText, {
                  enabled: settings.enableAudio,
                  rate: 0.85,
                  pitch: 1.25,
                });
              }}
              className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors inline-flex items-center justify-center"
              title="Ouvir elogio novamente"
            >
              <Volume2 size={16} />
            </button>

            {/* Acknowledge button */}
            <button
              id="btn-close-praise"
              onClick={handleClosePraiseAndContinue}
              className="w-full bg-amber-400 hover:bg-amber-500 text-white font-display font-extrabold text-lg py-4 rounded-[20px] shadow-md shadow-amber-100 transition-all transform active:scale-95"
            >
              Próximo Desafio! 🚀
            </button>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* DETAILED STUDENT CLINICAL REPORT     */}
      {/* ==================================== */}
      {selectedStudentForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-slate-100 w-full max-w-4xl rounded-[28px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] text-slate-800">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200">
                  <img 
                    src={selectedStudentForReport.customPhotoURL || selectedStudentForReport.photoURL} 
                    alt={selectedStudentForReport.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800">Relatório de {selectedStudentForReport.displayName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Análise clínica de engajamento, tempo e progresso de cópia</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForReport(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold text-sm cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={36} className="animate-spin text-indigo-600" />
                  <p className="text-sm font-bold text-slate-500 animate-pulse">Carregando relatório e histórico de atividades...</p>
                </div>
              ) : (
                <>
                  {/* KPI Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">Tempo Total Ativo</span>
                      <p className="text-2xl font-black text-emerald-700 font-display">
                        {(() => {
                          const totalSecs = selectedStudentLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
                          if (totalSecs < 60) return `${totalSecs}s`;
                          const mins = Math.floor(totalSecs / 60);
                          const remainingSecs = totalSecs % 60;
                          return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
                        })()}
                      </p>
                      <span className="text-[10px] text-emerald-500 font-bold block">tempo total de foco</span>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-100 block">Lições Concluídas</span>
                      <p className="text-2xl font-black text-indigo-700 font-display">
                        {selectedStudentLogs.length}
                      </p>
                      <span className="text-[10px] text-indigo-500 font-bold block">atividades finalizadas</span>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">Letras/Símbolos</span>
                      <p className="text-2xl font-black text-amber-700 font-display">
                        {selectedStudentLogs.reduce((sum, log) => sum + log.totalCharacters, 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-amber-500 font-bold block">caracteres copiados</span>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">Pontuação Acumulada</span>
                      <p className="text-2xl font-black text-rose-700 font-display">
                        {selectedStudentForReport.score} pts
                      </p>
                      <span className="text-[10px] text-rose-500 font-bold block">estrelas coletadas</span>
                    </div>
                  </div>

                  {/* Clinical & Pedagogy Insights Section */}
                  <div className="bg-indigo-50/30 border border-indigo-50 rounded-2xl p-5 space-y-4">
                    <h4 className="font-display font-bold text-sm text-indigo-900 flex items-center gap-1.5 border-b border-indigo-100/50 pb-2">
                      <Sparkles size={16} className="text-indigo-600" /> Diagnóstico e Insights do Tutor/Terapeuta
                    </h4>
                    
                    {selectedStudentLogs.length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium">Nenhum dado clínico acumulado ainda. Assim que o aluno completar a primeira atividade de cópia, os insights comportamentais e motores serão calculados e exibidos aqui.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="font-bold text-slate-700 flex items-center gap-1.5">
                            ✍️ Ritmo e Coordenação Motora
                          </p>
                          <div className="space-y-1 leading-relaxed text-slate-600 font-medium">
                            <p>
                              A velocidade de cópia estimada é de <strong className="text-slate-800 font-extrabold">
                                {Math.round((selectedStudentLogs.reduce((sum, log) => sum + log.totalCharacters, 0) / Math.max(1, selectedStudentLogs.reduce((sum, log) => sum + log.durationSeconds, 0))) * 60)} caracteres por minuto
                              </strong>.
                            </p>
                            <p className="text-indigo-600 font-bold mt-1">
                              {(() => {
                                const cpm = Math.round((selectedStudentLogs.reduce((sum, log) => sum + log.totalCharacters, 0) / Math.max(1, selectedStudentLogs.reduce((sum, log) => sum + log.durationSeconds, 0))) * 60);
                                if (cpm < 25) return "🐢 Ritmo Detalhado: O aluno demonstra paciência extrema ou cuidado motor apurado no traçado das letras, excelente para fixação grafomotora inicial.";
                                if (cpm <= 55) return "⚡ Ritmo Ideal: Velocidade perfeitamente equilibrada entre leitura mental do segmento e reprodução no caderno.";
                                return "🚀 Ritmo Acelerado: Alta velocidade de digitação/cópia. Verifique se o traçado no caderno está legível e se há omissão ocasional de letras.";
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="font-bold text-slate-700 flex items-center gap-1.5">
                            🎯 Atenção Sustentada e Foco
                          </p>
                          <div className="space-y-1 leading-relaxed text-slate-600 font-medium">
                            <p>
                              Tempo médio gasto por segmento de cópia (chunk): <strong className="text-slate-800 font-extrabold">
                                {Math.round(selectedStudentLogs.reduce((sum, log) => sum + log.avgTimePerChunk, 0) / selectedStudentLogs.length)} segundos
                              </strong>.
                            </p>
                            <p className="text-indigo-600 font-bold mt-1">
                              {(() => {
                                const avgSec = Math.round(selectedStudentLogs.reduce((sum, log) => sum + log.avgTimePerChunk, 0) / selectedStudentLogs.length);
                                if (avgSec < 12) return "🎯 Foco Instantâneo: Resposta motora rápida a estímulos curtos. Bom para manter o dinamismo.";
                                if (avgSec <= 35) return "🌟 Foco Sustentável: Período de atenção saudável e persistente por bloco. Indica boa tolerância à frustração.";
                                return "⏳ Processamento Deliberado: Aluno requer tempo de pausa entre os blocos para processar a informação verbal/grafomotora antes de copiar.";
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* History List */}
                  <div className="space-y-3">
                    <h4 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                      <Activity size={16} className="text-indigo-600" /> Histórico Recente de Atividades
                    </h4>

                    {selectedStudentLogs.length === 0 ? (
                      <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                        Nenhuma lição concluída registrada para este aluno.
                      </div>
                    ) : (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                <th className="p-4 font-extrabold">Atividade</th>
                                <th className="p-4 font-extrabold">Data</th>
                                <th className="p-4 font-extrabold text-right">Duração</th>
                                <th className="p-4 font-extrabold text-right">Caracteres</th>
                                <th className="p-4 font-extrabold text-right">Ritmo Médio</th>
                                <th className="p-4 font-extrabold text-right">Pontos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                              {selectedStudentLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4">
                                    <div className="font-bold text-slate-800 flex items-center gap-1">
                                      <span>{log.lessonTitle}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-400">
                                    {new Date(log.completedAt).toLocaleDateString("pt-BR", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </td>
                                  <td className="p-4 text-right font-bold text-slate-700">
                                    {(() => {
                                      const secs = log.durationSeconds;
                                      if (secs < 60) return `${secs}s`;
                                      const mins = Math.floor(secs / 60);
                                      const remainingSecs = secs % 60;
                                      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
                                    })()}
                                  </td>
                                  <td className="p-4 text-right font-bold">
                                    {log.totalCharacters}
                                  </td>
                                  <td className="p-4 text-right text-indigo-600 font-bold">
                                    {log.avgTimePerChunk}s / parte
                                  </td>
                                  <td className="p-4 text-right font-extrabold text-amber-500">
                                    +{log.scoreEarned} ⭐
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedStudentForReport(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-display font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Concluir Análise
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
