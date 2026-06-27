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
  Check
} from "lucide-react";

import { AdaptedLesson, AdaptedChunk, UserProgress, AppSettings, ThemeType, ChunkPreferenceType } from "./types";
import { DEMO_LESSONS, THEMES, GENERAL_PRAISES, getLevelInfo } from "./lib/constants";
import { playClickSound, playCoinSound, playLevelUpSound } from "./lib/sound";
import { speakText, stopSpeaking, isSpeaking } from "./lib/tts";
import EmojiShower from "./components/EmojiShower";

export default function App() {
  // State for user settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("copia_amiga_settings");
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
    };
  });

  // State for user progress
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem("copia_amiga_progress");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      score: 0,
      level: 1,
      completedLessonsCount: 0,
      completedChunkIds: [],
    };
  });

  // State for customized lessons (demo + uploaded/pasted)
  const [lessons, setLessons] = useState<AdaptedLesson[]>(() => {
    const saved = localStorage.getItem("copia_amiga_lessons");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    return DEMO_LESSONS;
  });

  // Navigation and UI state
  const [activeScreen, setActiveScreen] = useState<"welcome" | "home" | "lesson-viewer" | "add-lesson" | "settings">(() => {
    const saved = localStorage.getItem("copia_amiga_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.childName) return "home";
    }
    return "welcome";
  });

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
  const [showPraiseModal, setShowPraiseModal] = useState(false);
  const [praiseText, setPraiseText] = useState("");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [focusGuide, setFocusGuide] = useState(true); // yellow guideline under active sentence
  const [letterSpacingActive, setLetterSpacingActive] = useState(false); // extra letter spacing for dyslexia support

  // Confetti / particle trigger
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("copia_amiga_settings", JSON.stringify(settings));
  }, [settings]);

  // Persist progress
  useEffect(() => {
    localStorage.setItem("copia_amiga_progress", JSON.stringify(progress));
  }, [progress]);

  // Persist lessons
  useEffect(() => {
    localStorage.setItem("copia_amiga_lessons", JSON.stringify(lessons));
  }, [lessons]);

  // Handle active theme selection
  const currentTheme = THEMES.find(t => t.id === settings.theme) || THEMES[0];

  // Helper sound player
  const triggerClick = () => playClickSound(settings.enableSoundEffects);

  // Handle setting name first time
  const handleSaveInitialSettings = (name: string, favoriteTheme: ThemeType) => {
    triggerClick();
    if (!name.trim()) return;
    setSettings(prev => ({ ...prev, childName: name.trim(), theme: favoriteTheme }));
    setActiveScreen("home");
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
      };

      if (!newLesson.chunks || newLesson.chunks.length === 0) {
        throw new Error("Não conseguimos dividir o texto em pedaços. Tente com outro conteúdo.");
      }

      setLessons(prev => [newLesson, ...prev]);
      setActiveLessonId(newLesson.id);
      setCurrentChunkIndex(0);
      setActiveScreen("lesson-viewer");
      
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
        rate: 0.8, // Slow, easy pace
        pitch: 1.2, // Friendly high tone
        onStart: () => setTtsPlaying(true),
        onEnd: () => setTtsPlaying(false),
        onError: () => setTtsPlaying(false),
      });
    }
  };

  // Mark current chunk as copied (earn stars!)
  const handleCompleteChunk = () => {
    if (!activeLesson) return;
    const currentChunk = activeLesson.chunks[currentChunkIndex];
    if (!currentChunk) return;

    stopSpeaking();
    setTtsPlaying(false);

    // Audio & Visual rewards
    playCoinSound(settings.enableSoundEffects);
    setConfettiTrigger(prev => prev + 1);

    const progressKey = `${activeLesson.id}-${currentChunk.id}`;
    const alreadyCompleted = progress.completedChunkIds.includes(progressKey);

    // Calculate score points gained (10 points per copied chunk)
    const pointsGained = alreadyCompleted ? 0 : 10;
    const newCompletedChunks = alreadyCompleted 
      ? progress.completedChunkIds 
      : [...progress.completedChunkIds, progressKey];

    // Pick a fun praise text
    const customPraise = currentChunk.praise || GENERAL_PRAISES[Math.floor(Math.random() * GENERAL_PRAISES.length)];
    setPraiseText(customPraise);
    setShowPraiseModal(true);

    // Update progress state
    setProgress(prev => {
      const nextScore = prev.score + pointsGained;
      const oldLevelInfo = getLevelInfo(prev.score);
      const newLevelInfo = getLevelInfo(nextScore);

      // Check for level up
      if (newLevelInfo.level > oldLevelInfo.level) {
        setTimeout(() => {
          playLevelUpSound(settings.enableSoundEffects);
        }, 500);
      }

      return {
        ...prev,
        score: nextScore,
        level: newLevelInfo.level,
        completedChunkIds: newCompletedChunks,
      };
    });

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
  const handleClosePraiseAndContinue = () => {
    triggerClick();
    setShowPraiseModal(false);
    stopSpeaking();

    if (!activeLesson) return;
    const isLastChunk = currentChunkIndex === activeLesson.chunks.length - 1;

    if (isLastChunk) {
      // Lesson fully completed!
      setProgress(prev => ({
        ...prev,
        completedLessonsCount: prev.completedLessonsCount + 1
      }));
      // Celebrate lesson completion
      playLevelUpSound(settings.enableSoundEffects);
      setActiveScreen("home");
      setActiveLessonId(null);
    } else {
      setCurrentChunkIndex(prev => prev + 1);
    }
  };

  // Delete a custom lesson (cannot delete demo ones)
  const handleDeleteLesson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerClick();
    if (confirm("Quer mesmo apagar esta lição?")) {
      setLessons(prev => prev.filter(l => l.id !== id));
      if (activeLessonId === id) {
        setActiveLessonId(null);
        setActiveScreen("home");
      }
    }
  };

  // Progress level details
  const levelDetails = getLevelInfo(progress.score);

  return (
    <div className={`min-h-screen ${currentTheme.bg} font-sans transition-colors duration-500 pb-12 overflow-x-hidden selection:bg-amber-200 selection:text-amber-900`}>
      
      {/* Dynamic Confetti Emitter */}
      <EmojiShower triggerCount={confettiTrigger} />

      {/* HEADER / NAVIGATION RAIL */}
      {activeScreen !== "welcome" && (
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Logo / Mascot and Greeting */}
            <div 
              id="header-branding"
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => { triggerClick(); setActiveScreen("home"); }}
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl animate-bounce shadow-inner">
                🦖
              </div>
              <div>
                <h1 className="font-display font-bold text-lg md:text-xl text-slate-800 tracking-tight">
                  Cópia Amiga
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Olá, <span className="text-amber-600 font-bold">{settings.childName || "Amiguinho"}</span>! 🚀
                </p>
              </div>
            </div>

            {/* Score, Level Pill & Action Buttons */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Level Progress Pill */}
              <div 
                id="header-stats-pill"
                className="bg-amber-100/80 border border-amber-200/60 rounded-full px-3 py-1.5 flex items-center gap-2 text-amber-900 cursor-pointer hover:bg-amber-200/70 transition-all"
                onClick={() => { triggerClick(); setActiveScreen("settings"); }}
                title="Sua pontuação e nível atual!"
              >
                <div className="bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  ★
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold leading-none text-amber-700">Nível {levelDetails.level}</span>
                  <span className="font-bold text-xs leading-none">{progress.score} pts</span>
                </div>
              </div>

              {/* Home navigation if on secondary pages */}
              {activeScreen !== "home" && (
                <button
                  id="nav-btn-home"
                  onClick={() => { triggerClick(); setActiveScreen("home"); }}
                  className="p-2.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Voltar para a página inicial"
                >
                  <BookOpen size={20} />
                </button>
              )}

              {/* Settings Trigger */}
              <button
                id="nav-btn-settings"
                onClick={() => { triggerClick(); setActiveScreen("settings"); }}
                className={`p-2.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors ${activeScreen === "settings" ? "bg-amber-100 text-amber-800" : ""}`}
                title="Configurações e preferências"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 mt-6">

        {/* ==================================== */}
        {/* WELCOME SCREEN (INITIAL CONFIG)       */}
        {/* ==================================== */}
        {activeScreen === "welcome" && (
          <div id="screen-welcome" className="max-w-md mx-auto bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-8 mt-10 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner animate-float">
              🦖
            </div>
            
            <h2 className="font-display font-bold text-3xl text-slate-800 mb-2">
              Seja bem-vindo!
            </h2>
            <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
              O <span className="text-amber-500 font-bold">Cópia Amiga</span> ajuda a transformar deveres de escola compridos em pedacinhos curtinhos e divertidos de copiar!
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const nameInput = (e.currentTarget.elements.namedItem("childName") as HTMLInputElement).value;
              const themeInput = (e.currentTarget.elements.namedItem("theme") as HTMLInputElement).value as ThemeType;
              handleSaveInitialSettings(nameInput, themeInput);
            }} className="space-y-6 text-left">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Qual o seu nome ou apelido?
                </label>
                <input
                  id="input-welcome-name"
                  name="childName"
                  required
                  type="text"
                  placeholder="Ex: Pedro, Clarinha..."
                  maxLength={18}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-lg transition-colors bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Escolha um tema de fundo:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((themeOption) => (
                    <label 
                      key={themeOption.id} 
                      className="cursor-pointer relative flex items-center gap-2 p-3 rounded-2xl border-2 border-slate-100 hover:border-slate-300 transition-all"
                    >
                      <input 
                        type="radio" 
                        name="theme" 
                        value={themeOption.id} 
                        defaultChecked={themeOption.id === "pastel-blue"}
                        className="sr-only peer"
                      />
                      <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-transparent transition-colors">
                        <Check size={12} className="text-white hidden peer-checked:block" />
                      </span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-sm">
                        <span>{themeOption.emoji}</span>
                        <span>{themeOption.name}</span>
                      </div>
                      <div className="absolute inset-0 border-2 border-transparent peer-checked:border-amber-400 rounded-2xl pointer-events-none" />
                    </label>
                  ))}
                </div>
              </div>

              <button
                id="btn-welcome-submit"
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-xl py-4 rounded-2xl shadow-md shadow-amber-100 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-4"
              >
                Começar Aventura! <Sparkles size={20} />
              </button>
            </form>
          </div>
        )}

        {/* ==================================== */}
        {/* HOME SCREEN (DASHBOARD)              */}
        {/* ==================================== */}
        {activeScreen === "home" && (
          <div id="screen-home" className="space-y-6 animate-fade-in">
            
            {/* HERO HERO BANNER - GAMIFICATION STATUS */}
            <div className={`p-6 rounded-3xl bg-white border-2 ${currentTheme.border} shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6`}>
              <div className="relative z-10 flex-1 space-y-3">
                <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Nível Atual: {levelDetails.level}
                </span>
                <h3 className="font-display font-bold text-2xl text-slate-800">
                  {levelDetails.title}
                </h3>
                
                {/* Custom feedback message */}
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
                  {progress.score === 0 ? (
                    "Olá! Escolha uma lição abaixo para ganhar suas primeiras estrelas de escrita! ⭐"
                  ) : (
                    `Muito bem, ${settings.childName}! Você já acumulou ${progress.score} estrelas. Só faltam ${levelDetails.needed} pontos para chegar ao próximo nível!`
                  )}
                </p>

                {/* Level Up progress bar */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{progress.score} pts</span>
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

              {/* Character Badge */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center min-w-[140px] relative">
                <div className="text-4xl mb-1 animate-float">🏅</div>
                <div className="font-bold text-sm text-slate-700">{settings.childName || "Amiguinho"}</div>
                <div className="font-extrabold text-xs text-amber-600 mt-1 uppercase tracking-wider">{progress.completedLessonsCount} Lições Concluídas</div>
              </div>
            </div>

            {/* ACTION TRIGGERS & ADD TASK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Adapt New Lesson */}
              <div 
                id="box-add-lesson"
                onClick={() => { triggerClick(); setActiveScreen("add-lesson"); }}
                className="bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-3xl p-6 cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group flex items-center justify-between"
              >
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-xl flex items-center gap-2">
                    Adaptar Nova Lição <Plus size={20} />
                  </h4>
                  <p className="text-amber-50/90 text-sm font-medium leading-normal max-w-xs">
                    Tire foto de uma folha ou cole o texto para que eu adapte em partes pequenas!
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  📸
                </div>
              </div>

              {/* Settings fast-tune panel */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg text-slate-800 flex items-center gap-1.5">
                    Seu Ajuste de Foco 🎯
                  </h4>
                  <p className="text-slate-500 text-xs font-medium leading-normal">
                    Ajuste o tamanho dos trechos de escrita de acordo com a sua resistência hoje:
                  </p>
                  
                  {/* Preferences selectors */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {(["ultra-short", "standard", "medium", "paragraph"] as ChunkPreferenceType[]).map((pref) => (
                      <button
                        key={pref}
                        onClick={() => {
                          triggerClick();
                          setSettings(prev => ({ ...prev, chunkPreference: pref }));
                        }}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${
                          settings.chunkPreference === pref
                            ? "bg-amber-100 border-amber-400 text-amber-900"
                            : "bg-slate-50/80 border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {pref === "ultra-short" && "Gotas (3-5 pal.)"}
                        {pref === "standard" && "Curto (1 fr.)"}
                        {pref === "medium" && "Médio (2 fr.)"}
                        {pref === "paragraph" && "Parágrafo (3+)"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-3 border-t border-slate-100">
                  <span>Tema Ativo: {currentTheme.emoji} {currentTheme.name}</span>
                  <button 
                    onClick={() => { triggerClick(); setActiveScreen("settings"); }}
                    className="text-amber-600 hover:underline"
                  >
                    Mudar tema
                  </button>
                </div>
              </div>
            </div>

            {/* LESSONS LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
                  Sua Coleção de Lições 📚
                </h3>
                <span className="text-xs font-bold text-slate-400">{lessons.length} disponíveis</span>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 space-y-4">
                  <div className="text-4xl">📭</div>
                  <h4 className="font-display font-bold text-lg text-slate-700">Nenhuma lição encontrada</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">
                    Clique em &quot;Adaptar Nova Lição&quot; acima ou mude suas configurações para gerar novas aventuras!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.map((lesson) => {
                    // Calculate how many chunks of this lesson are completed
                    const completedChunks = lesson.chunks.filter(chunk => 
                      progress.completedChunkIds.includes(`${lesson.id}-${chunk.id}`)
                    );
                    const isLessonFullyDone = completedChunks.length === lesson.chunks.length;
                    const isDemo = lesson.id.startsWith("demo-");

                    return (
                      <div
                        id={`lesson-card-${lesson.id}`}
                        key={lesson.id}
                        onClick={() => handleStartLesson(lesson.id)}
                        className={`group relative bg-white border-2 rounded-3xl p-5 hover:border-slate-300 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 ${
                          isLessonFullyDone ? "border-emerald-200 bg-emerald-50/10" : "border-slate-100"
                        }`}
                      >
                        {/* Done Indicator Badge */}
                        {isLessonFullyDone && (
                          <div className="absolute top-4 right-4 bg-emerald-500 text-white rounded-full p-1 shadow-sm">
                            <CheckCircle size={14} />
                          </div>
                        )}

                        <div className="space-y-1.5 pr-6">
                          <div className="flex items-center gap-1.5">
                            {isDemo ? (
                              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                Treinar ⭐
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                {lesson.originalInputType === "image" ? "📷 Foto" : "✍️ Texto"}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-display font-bold text-base text-slate-800 line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {lesson.title}
                          </h4>
                          
                          <p className="text-xs font-medium text-slate-400 line-clamp-2 leading-relaxed">
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
                            <span className="text-xs font-bold text-slate-500">
                              {completedChunks.length}/{lesson.chunks.length} partes
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isDemo && (
                              <button
                                onClick={(e) => handleDeleteLesson(lesson.id, e)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Apagar esta lição"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
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
          <div id="screen-add-lesson" className="space-y-6 animate-fade-in">
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
                  Envie uma foto da folha do livro ou digite o dever escolar. A Inteligência Artificial vai preparar trechos na medida ideal para você copiar.
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
                  <Camera size={18} /> Enviar uma Foto (Recomendado)
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
                        <button
                          type="button"
                          onClick={() => { triggerClick(); fileInputRef.current?.click(); }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all"
                        >
                          Escolher arquivo da galeria / câmera
                        </button>
                      </div>
                    )}

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

                  {/* Camera Helper Note */}
                  <div className="bg-amber-50/50 rounded-2xl p-4 flex gap-3 items-start border border-amber-100">
                    <span className="text-xl">💡</span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      <strong>Dica para os Pais:</strong> Garanta que o texto da folha esteja bem iluminado e nítido. Se a foto for de um caderno físico, posicione a câmera bem de cima para evitar sombras escuras.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PLAIN TEXT */}
              {uploadTab === "text" && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Cole ou digite o texto da lição abaixo:
                  </label>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Cole aqui o texto enviado pelo professor ou digite as frases que a criança precisa copiar..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium transition-colors bg-slate-50/30 text-base"
                  />
                  <p className="text-slate-400 text-xs font-medium">
                    A IA vai ler tudo, remover instruções longas irrelevantes e focar estritamente no texto que a criança de fato precisa colocar no caderno.
                  </p>
                </div>
              )}

              {/* ACTION ADJUSTER AND PROCESSING PROGRESS */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Segmentação padrão da conta:</span>
                  <select
                    value={settings.chunkPreference}
                    onChange={(e) => {
                      triggerClick();
                      setSettings(prev => ({ ...prev, chunkPreference: e.target.value as ChunkPreferenceType }));
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white"
                  >
                    <option value="ultra-short">Gotas (Trechos de 3-5 palavras)</option>
                    <option value="standard">Frases Curtas (Recomendado)</option>
                    <option value="medium">Frases Médias (Até 2 sentenças)</option>
                    <option value="paragraph">Parágrafos Completos (Foco maior)</option>
                  </select>
                </div>

                <button
                  id="btn-process-content"
                  onClick={handleProcessContent}
                  disabled={isProcessing}
                  className={`w-full md:w-auto ${currentTheme.primaryBtn || "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100"} font-display font-bold text-lg px-8 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} /> Preparando os pedacinhos...
                    </>
                  ) : (
                    <>
                      Adaptar Lição Agora <Sparkles size={18} />
                    </>
                  )}
                </button>
              </div>

              {/* Error state */}
              {processError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium space-y-1">
                  <p className="font-bold">Ops! Não deu certo:</p>
                  <p>{processError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* INTERACTIVE LESSON VIEWER (PLAYER)   */}
        {/* ==================================== */}
        {activeScreen === "lesson-viewer" && activeLesson && (
          <div id="screen-lesson-player" className="space-y-6 animate-fade-in">
            {/* Nav back bar */}
            <div className="flex items-center justify-between">
              <button
                id="btn-viewer-back"
                onClick={() => { triggerClick(); stopSpeaking(); setActiveScreen("home"); setActiveLessonId(null); }}
                className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 text-sm cursor-pointer transition-colors"
              >
                <ArrowLeft size={16} /> Voltar para o Painel
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modo Foco Ativo</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* LESSON TITLE & INTRO CARDS */}
            <div className={`p-5 rounded-3xl ${currentTheme.cardBg} border-2 ${currentTheme.border} shadow-sm space-y-3 relative`}>
              <h2 className="font-display font-bold text-2xl text-slate-800 leading-tight">
                {activeLesson.title}
              </h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                {activeLesson.adaptedExplanation}
              </p>
              
              {/* Audio feedback on intro */}
              <button
                onClick={() => {
                  triggerClick();
                  speakText(activeLesson.adaptedExplanation, {
                    enabled: settings.enableAudio,
                    rate: 0.85,
                  });
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Ouvir introdução"
              >
                <Volume2 size={16} />
              </button>
            </div>

            {/* THE CORE FOCUS BOX (TEXT PIECE PLAYER) */}
            <div className="space-y-4">
              {/* Progress counter track */}
              <div className="bg-white/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
                {/* Indicator buttons for chunks */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                  {activeLesson.chunks.map((chunk, index) => {
                    const isCompleted = progress.completedChunkIds.includes(`${activeLesson.id}-${chunk.id}`);
                    const isActive = index === currentChunkIndex;

                    return (
                      <button
                        key={chunk.id}
                        onClick={() => {
                          triggerClick();
                          setCurrentChunkIndex(index);
                          stopSpeaking();
                          setTtsPlaying(false);
                        }}
                        className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                          isActive 
                            ? "bg-amber-400 text-white scale-110 shadow-sm"
                            : isCompleted
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-bold text-slate-500">
                  {currentChunkIndex + 1} de {activeLesson.chunks.length} partes
                </div>
              </div>

              {/* THE TEXT DISPLAY CONTAINER */}
              <div 
                id="active-chunk-display-card"
                className={`${currentTheme.cardBg} rounded-[32px] border-3 ${currentTheme.border} shadow-md p-6 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[300px] transition-all`}
              >
                
                {/* Custom layout controls on top corner */}
                <div className="flex items-center justify-end gap-2 mb-4">
                  {/* Guideline helper tool for TDAH */}
                  <button
                    onClick={() => { triggerClick(); setFocusGuide(!focusGuide); }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      focusGuide 
                        ? "bg-amber-100 text-amber-800 border border-amber-200" 
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent"
                    }`}
                    title="Ativar régua amarela de leitura para ajudar no foco"
                  >
                    <Sun size={14} /> Guia de Foco
                  </button>

                  {/* Dyslexia / Extra letter spacing tool */}
                  <button
                    onClick={() => { triggerClick(); setLetterSpacingActive(!letterSpacingActive); }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      letterSpacingActive 
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200" 
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent"
                    }`}
                    title="Aumentar espaço entre as letras"
                  >
                    <Sparkles size={14} /> Espaçamento
                  </button>

                  {/* Font Sizer */}
                  <div className="flex items-center border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                    {(["md", "lg", "xl"] as ("md" | "lg" | "xl")[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          triggerClick();
                          setSettings(prev => ({ ...prev, fontSize: sz }));
                        }}
                        className={`px-2.5 py-1 text-xs font-bold uppercase transition-all ${
                          settings.fontSize === sz
                            ? "bg-slate-200 text-slate-800"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* THE ACTIVE WORDS TO COPY */}
                <div className="my-auto py-4 text-center relative">
                  
                  {/* Text-to-Speech audio play floating button */}
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={handlePlayChunkAudio}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        ttsPlaying 
                          ? "bg-rose-100 text-rose-600 animate-pulse" 
                          : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                      }`}
                      title="Ouvir leitura bem devagar"
                    >
                      {ttsPlaying ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                  </div>

                  {/* The display text */}
                  <p 
                    id="copy-text-display"
                    className={`font-display font-semibold transition-all select-none leading-relaxed tracking-wide ${currentTheme.text || "text-slate-800"} ${
                      settings.fontSize === "md" ? "text-xl" : settings.fontSize === "lg" ? "text-3xl" : "text-4xl md:text-5xl"
                    } ${
                      letterSpacingActive ? "tracking-widest" : "tracking-wide"
                    }`}
                  >
                    {activeLesson.chunks[currentChunkIndex]?.text}
                  </p>

                  {/* Focus Guideline Indicator (TDAH aid) */}
                  {focusGuide && (
                    <div className="w-4/5 h-2.5 bg-yellow-300/40 rounded-full mx-auto mt-4 animate-pulse" />
                  )}
                </div>

                {/* COPY AND NAVIGATION BUTTONS */}
                <div className="mt-8 space-y-4">
                  {/* BIG CHECK COPY BUTTON */}
                  <button
                    id="btn-complete-chunk"
                    onClick={handleCompleteChunk}
                    className={`w-full ${currentTheme.id === "minecraft" || currentTheme.id === "mario" || currentTheme.id === "papercraft" ? currentTheme.primaryBtn : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100"} font-display font-bold text-xl md:text-2xl py-5 rounded-[24px] shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-3`}
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
                      className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Parte Anterior
                    </button>

                    <div className="text-xs font-bold text-slate-400">
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
                      className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all flex items-center gap-1.5"
                    >
                      Próxima Parte <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* DYSLEXIA / TDAH ASSIST TIPS */}
            <div className="bg-sky-50/50 rounded-2xl p-4 flex gap-3 items-start border border-sky-100">
              <span className="text-xl">🎒</span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <strong>Como ajudar a criança:</strong> Peça para ela apontar com o dedinho na tela cada palavra e depois escrever no caderno. O guia amarelo na tela ajuda os olhinhos a não se perderem na linha.
              </p>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* SETTINGS / PREFERENCES SCREEN        */}
        {/* ==================================== */}
        {activeScreen === "settings" && (
          <div id="screen-settings" className="space-y-6 animate-fade-in">
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
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Nome da Criança:
                  </label>
                  <input
                    type="text"
                    value={settings.childName}
                    onChange={(e) => setSettings(prev => ({ ...prev, childName: e.target.value }))}
                    placeholder="Apelido do escritor..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-base transition-colors bg-slate-50/50"
                  />
                </div>

                {/* Section 2: Visual Themes */}
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Tamanho das Partes (Segmentação):
                  </label>
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Ajusta o tamanho ideal de cada bloco gerado pelo Gemini de acordo com a paciência e cansaço da criança.
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
                      <div className="font-bold text-slate-800">💧 Gotas de Escrita</div>
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
                <div className="space-y-4">
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

                {/* RESET PROGRESS */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-slate-700">Zerar Progresso</span>
                    <p className="text-xs text-slate-400">Apaga todas as estrelas e dados salvos para recomeçar do zero.</p>
                  </div>
                  <button
                    onClick={() => {
                      triggerClick();
                      if (confirm("Quer mesmo apagar suas estrelas e lições adaptadas? Isso não pode ser desfeito.")) {
                        localStorage.removeItem("copia_amiga_progress");
                        localStorage.removeItem("copia_amiga_lessons");
                        setProgress({ score: 0, level: 1, completedLessonsCount: 0, completedChunkIds: [] });
                        setLessons(DEMO_LESSONS);
                        alert("Progresso reiniciado com sucesso! 🚀");
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
          <div className="bg-white border-3 border-amber-300 w-full max-w-md rounded-[32px] p-8 text-center shadow-2xl relative space-y-6">
            
            {/* Visual mascot / celebration */}
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner animate-bounce">
              🦖
            </div>

            <div className="space-y-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full">
                Cópia Concluída! ✍️⭐
              </span>
              <h4 className="font-display font-extrabold text-2xl text-slate-800">
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

    </div>
  );
}
