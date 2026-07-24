import React, { useState } from "react";
import { Sparkles, ArrowLeft, Volume2, Globe, Eye, Plus, CheckCircle } from "lucide-react";
import { FillLettersLesson, LetterMaskType, AppLanguage } from "../types";
import { isVowel, isConsonant, isLetter } from "./FillLettersViewer";
import { speakText } from "../lib/tts";

interface Props {
  onSave: (newLesson: FillLettersLesson) => void;
  onBack: () => void;
  triggerClickSound: () => void;
}

export const CreateFillLettersForm: React.FC<Props> = ({
  onSave,
  onBack,
  triggerClickSound
}) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [maskMode, setMaskMode] = useState<LetterMaskType>("consoantes");
  const [language, setLanguage] = useState<AppLanguage>("pt-BR");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestTTS = () => {
    triggerClickSound();
    if (!text.trim()) {
      setErrorMsg("Digite uma frase primeiro para ouvir!");
      return;
    }
    setErrorMsg(null);
    speakText(text, { enabled: true, lang: language });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerClickSound();

    if (!title.trim()) {
      setErrorMsg("Por favor, digite um título para a atividade!");
      return;
    }
    if (!text.trim()) {
      setErrorMsg("Por favor, digite a frase ou texto da atividade!");
      return;
    }

    setErrorMsg(null);

    const newLesson: FillLettersLesson = {
      id: `fill-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      text: text.trim(),
      maskMode,
      language,
      createdAt: new Date().toISOString()
    };

    onSave(newLesson);
  };

  // Generate live preview text
  const previewWords = text.trim().split(/(\s+)/);

  return (
    <div id="screen-create-fill-letters" className="space-y-6 animate-fade-in text-slate-800">
      {/* Back Button */}
      <button
        id="btn-back-from-create-fill"
        onClick={() => { triggerClickSound(); onBack(); }}
        className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 text-sm cursor-pointer transition-colors"
      >
        <ArrowLeft size={16} /> Voltar para o Painel
      </button>

      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={14} className="text-purple-600" /> Nova Atividade do Tutor
          </div>
          <h3 className="font-display font-bold text-2xl text-slate-800">
            Criar Desafio: Completar Vogais ou Consoantes 🔤
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Crie frases e textos personalizados em Português ou Inglês. Ao clicar em cada palavra, ela será lida em áudio para ajudar a criança a identificar e completar!
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-bold animate-shake">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
              Título da Atividade:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Animais da Floresta / My Color Friends"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none font-bold text-slate-800 text-base"
            />
          </div>

          {/* Text/Sentence Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                Frase ou Texto da Atividade:
              </label>
              <button
                type="button"
                onClick={handleTestTTS}
                className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 size={14} /> Testar Áudio {language === "en-US" ? "(Inglês)" : "(Português)"}
              </button>
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite aqui a frase simples ou texto que a criança vai completar..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none font-medium text-slate-800 text-base resize-none"
            />
          </div>

          {/* Configuration Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mask Mode Selector */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={16} className="text-purple-600" />
                O que deve ficar Visível na frase?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { triggerClickSound(); setMaskMode("consoantes"); }}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    maskMode === "consoantes"
                      ? "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>Exibir Consoantes</span>
                  <span className="text-[10px] font-normal opacity-90">(Criança preenche Vogais)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { triggerClickSound(); setMaskMode("vogais"); }}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    maskMode === "vogais"
                      ? "bg-purple-600 border-purple-700 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>Exibir Vogais</span>
                  <span className="text-[10px] font-normal opacity-90">(Criança preenche Consoantes)</span>
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={16} className="text-indigo-600" />
                Idioma da Leitura e Frase:
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { triggerClickSound(); setLanguage("pt-BR"); }}
                  className={`p-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === "pt-BR"
                      ? "bg-amber-500 border-amber-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  🇧🇷 Português
                </button>

                <button
                  type="button"
                  onClick={() => { triggerClickSound(); setLanguage("en-US"); }}
                  className={`p-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === "en-US"
                      ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  🇺🇸 Inglês
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Section */}
          {text.trim() && (
            <div className="space-y-2 bg-purple-50/50 border border-purple-200 p-4 rounded-2xl">
              <label className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                <span>Pré-visualização para o Aluno ({language === "en-US" ? "Inglês" : "Português"}):</span>
                <span className="text-[10px] text-purple-700 font-bold">
                  {maskMode === "consoantes" ? "Vogais como Lacunas [ _ ]" : "Consoantes como Lacunas [ _ ]"}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {previewWords.map((word, wIdx) => {
                  if (word.trim().length === 0) return <span key={wIdx} className="w-2" />;
                  return (
                    <div key={wIdx} className="bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 shadow-sm flex items-center gap-1 font-display font-black text-sm text-slate-800">
                      {word.split("").map((ch, cIdx) => {
                        if (!isLetter(ch)) return <span key={cIdx}>{ch}</span>;
                        const hide = maskMode === "consoantes" ? isVowel(ch) : isConsonant(ch);
                        if (hide) {
                          return (
                            <span key={cIdx} className="w-5 h-6 bg-purple-100 border border-purple-300 rounded flex items-center justify-center text-purple-600 text-xs font-mono">
                              _
                            </span>
                          );
                        }
                        return <span key={cIdx}>{ch}</span>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-display font-bold text-lg px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={20} />
              Criar e Enviar Atividade ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
