import React, { useState, useEffect } from "react";
import { 
  Volume2, 
  Sparkles, 
  CheckCircle, 
  ArrowLeft, 
  RotateCcw, 
  Globe, 
  Eye, 
  HelpCircle,
  Trophy,
  Check
} from "lucide-react";
import { FillLettersLesson, LetterMaskType, AppLanguage, AppSettings } from "../types";
import { speakText, stopSpeaking } from "../lib/tts";

interface Props {
  lesson: FillLettersLesson;
  settings: AppSettings;
  onBack: () => void;
  onComplete: (earnedScore: number) => void;
  triggerClickSound: () => void;
}

export function isVowel(char: string): boolean {
  const norm = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return ["A", "E", "I", "O", "U"].includes(norm);
}

export function isLetter(char: string): boolean {
  return /^[a-zA-ZáéíóúâêôãõàäëïöüÁÉÍÓÚÂÊÔÃÕÀÄËÏÖÜçÇ]$/.test(char);
}

export function isConsonant(char: string): boolean {
  return isLetter(char) && !isVowel(char);
}

export function normalizeLetter(char: string): string {
  return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export const FillLettersViewer: React.FC<Props> = ({
  lesson,
  settings,
  onBack,
  onComplete,
  triggerClickSound
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>(lesson.language || "pt-BR");
  const [currentMaskMode, setCurrentMaskMode] = useState<LetterMaskType>(lesson.maskMode || "consoantes");
  
  // State for user input for each character index: { [charIndex]: string }
  const [userInputs, setUserInputs] = useState<{ [key: number]: string }>({});
  const [speakingWordIndex, setSpeakingWordIndex] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showFullHint, setShowFullHint] = useState(false);

  // Parse original text into words and characters
  const rawWords = lesson.text.trim().split(/(\s+)/); // keeps spaces
  let globalCharCounter = 0;

  // Structure: array of words, each word containing character items
  const parsedWords = rawWords.map((wordStr) => {
    const chars = wordStr.split("").map((c) => {
      const charIndex = globalCharCounter++;
      const letter = isLetter(c);
      const vowel = isVowel(c);
      const consonant = isConsonant(c);

      // Determine if this character should be masked as a fill-in blank
      let isMasked = false;
      if (currentMaskMode === "vogais") {
        // Only vowels are visible -> consonants are masked for child to complete
        isMasked = consonant;
      } else {
        // Only consonants are visible -> vowels are masked for child to complete
        isMasked = vowel;
      }

      return {
        charIndex,
        char: c,
        isLetter: letter,
        isVowel: vowel,
        isConsonant: consonant,
        isMasked
      };
    });

    const isSpaceOrPunct = wordStr.trim().length === 0;
    const cleanText = wordStr.replace(/[^a-zA-ZáéíóúâêôãõàäëïöüÁÉÍÓÚÂÊÔÃÕÀÄËÏÖÜçÇ]/g, "");

    return {
      wordStr,
      cleanText,
      isSpaceOrPunct,
      chars
    };
  });

  // Calculate total missing slots and correct slots
  let totalMaskedSlots = 0;
  let correctSlots = 0;

  parsedWords.forEach((w) => {
    w.chars.forEach((c) => {
      if (c.isMasked) {
        totalMaskedSlots++;
        const typed = userInputs[c.charIndex] || "";
        if (typed && normalizeLetter(typed) === normalizeLetter(c.char)) {
          correctSlots++;
        }
      }
    });
  });

  // Check completion
  useEffect(() => {
    if (totalMaskedSlots > 0 && correctSlots === totalMaskedSlots && !isCompleted) {
      setIsCompleted(true);
      onComplete(35); // Earn 35 stars
      // Read entire sentence in active language
      speakText(lesson.text, {
        enabled: settings.enableAudio,
        lang: currentLanguage,
        rate: 0.85
      });
    }
  }, [correctSlots, totalMaskedSlots, isCompleted]);

  // Handle word click TTS
  const handleWordClick = (wordClean: string, index: number) => {
    triggerClickSound();
    if (!wordClean) return;
    setSpeakingWordIndex(index);
    speakText(wordClean, {
      enabled: settings.enableAudio,
      lang: currentLanguage,
      rate: 0.8,
      onEnd: () => setSpeakingWordIndex(null),
      onError: () => setSpeakingWordIndex(null)
    });
  };

  // Handle letter input change
  const handleInputChange = (charIndex: number, expectedChar: string, val: string) => {
    const lastChar = val.slice(-1); // Take newest letter typed
    setUserInputs(prev => ({
      ...prev,
      [charIndex]: lastChar
    }));
  };

  // Handle virtual keyboard letter tap
  const [activeFocusedIndex, setActiveFocusedIndex] = useState<number | null>(null);

  const handleVirtualLetterTap = (letter: string) => {
    triggerClickSound();
    if (activeFocusedIndex === null) return;
    setUserInputs(prev => ({
      ...prev,
      [activeFocusedIndex]: letter
    }));

    // Auto move focus to next masked slot
    let foundNext = false;
    parsedWords.forEach(w => {
      w.chars.forEach(c => {
        if (!foundNext && c.isMasked && c.charIndex > activeFocusedIndex) {
          const typed = userInputs[c.charIndex] || "";
          if (!typed || normalizeLetter(typed) !== normalizeLetter(c.char)) {
            setActiveFocusedIndex(c.charIndex);
            foundNext = true;
          }
        }
      });
    });
  };

  const handleReset = () => {
    triggerClickSound();
    setUserInputs({});
    setIsCompleted(false);
    setShowFullHint(false);
    stopSpeaking();
  };

  // List of available letters for on-screen tap buttons
  const commonVowels = ["A", "E", "I", "O", "U"];
  const commonConsonants = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y", "Z"];
  const virtualButtons = currentMaskMode === "consoantes" ? commonVowels : commonConsonants;

  return (
    <div id="screen-fill-letters-viewer" className="space-y-6 animate-fade-in text-slate-800">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          id="btn-back-from-fill-letters"
          onClick={() => { triggerClickSound(); stopSpeaking(); onBack(); }}
          className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 text-sm cursor-pointer transition-colors bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        {/* Toggles bar: Language & Mask Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => { triggerClickSound(); setCurrentLanguage("pt-BR"); }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                currentLanguage === "pt-BR"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇧🇷 Português
            </button>
            <button
              onClick={() => { triggerClickSound(); setCurrentLanguage("en-US"); }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                currentLanguage === "en-US"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇺🇸 English
            </button>
          </div>

          {/* Mask Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => { triggerClickSound(); setCurrentMaskMode("consoantes"); }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMaskMode === "consoantes"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Exibir consoantes e completar as vogais"
            >
              <Eye size={14} /> Faltam Vogais
            </button>
            <button
              onClick={() => { triggerClickSound(); setCurrentMaskMode("vogais"); }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMaskMode === "vogais"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Exibir vogais e completar as consoantes"
            >
              <Eye size={14} /> Faltam Consoantes
            </button>
          </div>
        </div>
      </div>

      {/* Main Activity Card */}
      <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 md:p-8 shadow-md space-y-6 relative overflow-hidden">
        {/* Header Title & Instructions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1">
              <Sparkles size={14} className="text-amber-600" />
              {currentLanguage === "pt-BR" ? "Desafio das Letras Mágicas" : "Magic Letters Challenge"}
            </div>
            <h2 className="font-display font-black text-2xl md:text-3xl text-slate-800">
              {lesson.title}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-semibold mt-1">
              {currentLanguage === "pt-BR"
                ? "Clique nas palavras para ouvir o som 🔊 e preencha as letras que faltam!"
                : "Click any word to hear it pronounced 🔊 and fill in the missing letters!"}
            </p>
          </div>

          {/* Progress Pill */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 self-start md:self-auto">
            <Trophy size={20} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider">
                {currentLanguage === "pt-BR" ? "Progresso de Letras" : "Letter Progress"}
              </div>
              <div className="font-display font-black text-amber-900 text-sm">
                {correctSlots} / {totalMaskedSlots} {currentLanguage === "pt-BR" ? "certas" : "correct"}
              </div>
            </div>
          </div>
        </div>

        {/* Word Cards Display Area */}
        <div className="bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-2xl p-5 md:p-8 min-h-[160px] flex flex-wrap items-center justify-start gap-3 md:gap-4 leading-loose">
          {parsedWords.map((wordObj, wIdx) => {
            if (wordObj.isSpaceOrPunct) {
              return <span key={wIdx} className="w-2 md:w-3 inline-block" />;
            }

            const isSpeaking = speakingWordIndex === wIdx;

            return (
              <div
                key={wIdx}
                className={`group relative bg-white border-2 ${
                  isSpeaking
                    ? "border-amber-500 shadow-lg scale-105"
                    : "border-slate-200 hover:border-amber-300"
                } rounded-2xl p-2.5 md:p-3.5 shadow-sm transition-all flex flex-col items-center justify-between gap-2 cursor-pointer`}
                onClick={() => handleWordClick(wordObj.cleanText, wIdx)}
              >
                {/* Word Speaker Badge */}
                <div className="w-full flex items-center justify-between gap-1 text-[10px] font-black text-slate-400 group-hover:text-amber-600 transition-colors border-b border-slate-100 pb-1 mb-1">
                  <span className="flex items-center gap-1">
                    <Volume2 size={12} className={isSpeaking ? "animate-bounce text-amber-500" : ""} />
                    {currentLanguage === "pt-BR" ? "Ouvir" : "Listen"}
                  </span>
                </div>

                {/* Character Boxes Row */}
                <div className="flex items-center gap-1 md:gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {wordObj.chars.map((c) => {
                    if (!c.isLetter) {
                      return (
                        <span key={c.charIndex} className="font-display font-black text-xl md:text-2xl text-slate-600">
                          {c.char}
                        </span>
                      );
                    }

                    if (!c.isMasked) {
                      // Visible character
                      return (
                        <div
                          key={c.charIndex}
                          className="w-8 h-10 md:w-10 md:h-12 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center justify-center font-display font-black text-lg md:text-xl text-amber-950 shadow-inner"
                        >
                          {c.char}
                        </div>
                      );
                    }

                    // Masked slot for child to fill
                    const userTyped = userInputs[c.charIndex] || "";
                    const isCorrect = userTyped && normalizeLetter(userTyped) === normalizeLetter(c.char);
                    const isFocused = activeFocusedIndex === c.charIndex;

                    return (
                      <div key={c.charIndex} className="relative">
                        <input
                          type="text"
                          maxLength={2}
                          value={userTyped}
                          onFocus={() => {
                            setActiveFocusedIndex(c.charIndex);
                            handleWordClick(wordObj.cleanText, wIdx);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(wordObj.cleanText, wIdx);
                          }}
                          onChange={(e) => handleInputChange(c.charIndex, c.char, e.target.value)}
                          className={`w-8 h-10 md:w-10 md:h-12 text-center font-display font-black text-lg md:text-xl uppercase rounded-xl border-2 transition-all outline-none shadow-sm ${
                            isCorrect
                              ? "bg-emerald-100 border-emerald-500 text-emerald-950"
                              : userTyped
                              ? "bg-rose-50 border-rose-400 text-rose-900"
                              : isFocused
                              ? "bg-amber-100 border-amber-500 ring-2 ring-amber-300"
                              : "bg-white border-slate-300 hover:border-amber-400 text-slate-800"
                          }`}
                        />
                        {isCorrect && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Text Hint & Audio Helper */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { triggerClickSound(); setShowFullHint(!showFullHint); }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={16} />
              {showFullHint
                ? (currentLanguage === "pt-BR" ? "Esconder Dica" : "Hide Hint")
                : (currentLanguage === "pt-BR" ? "Ver Frase Completa" : "View Full Sentence")}
            </button>

            <button
              onClick={() => {
                triggerClickSound();
                speakText(lesson.text, { enabled: true, lang: currentLanguage });
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 size={16} />
              {currentLanguage === "pt-BR" ? "Ouvir Frase Toda 🎧" : "Listen Full Sentence 🎧"}
            </button>
          </div>

          <button
            onClick={handleReset}
            className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> {currentLanguage === "pt-BR" ? "Recomeçar" : "Restart"}
          </button>
        </div>

        {/* Collapsible Hint Text */}
        {showFullHint && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 font-display font-bold text-base md:text-lg animate-fade-in">
            💡 {lesson.text}
          </div>
        )}

        {/* Quick Tap Letters Keyboard */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
            {currentLanguage === "pt-BR"
              ? "Teclado Rápido de Toque (Toque em um quadradinho acima e depois na letra):"
              : "Quick Tap Keyboard (Tap a blank box above then tap a letter):"}
          </label>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {virtualButtons.map((lettr) => (
              <button
                key={lettr}
                onClick={() => handleVirtualLetterTap(lettr)}
                className="w-8 h-9 md:w-10 md:h-11 bg-white hover:bg-amber-400 hover:text-slate-950 text-slate-800 font-display font-black text-base rounded-xl border-2 border-slate-200 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
              >
                {lettr}
              </button>
            ))}
          </div>
        </div>

        {/* Completion Modal / Celebration Overlay */}
        {isCompleted && (
          <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-xl animate-fade-in border-4 border-emerald-300">
            <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle size={36} />
            </div>
            <h3 className="font-display font-black text-2xl md:text-3xl">
              {currentLanguage === "pt-BR" ? "Sensacional! Atividade Concluída! ⭐" : "Awesome! Activity Completed! ⭐"}
            </h3>
            <p className="text-emerald-100 font-semibold text-sm md:text-base max-w-md mx-auto leading-relaxed">
              {currentLanguage === "pt-BR"
                ? "Você completou todas as letras perfeitamente e ganhou +35 Estrelas!"
                : "You filled all the missing letters perfectly and earned +35 Stars!"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-display font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw size={16} /> {currentLanguage === "pt-BR" ? "Jogar De Novo" : "Play Again"}
              </button>
              <button
                onClick={() => { triggerClickSound(); stopSpeaking(); onBack(); }}
                className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <Trophy size={18} /> {currentLanguage === "pt-BR" ? "Voltar ao Painel" : "Back to Dashboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
