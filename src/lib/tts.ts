/**
 * Helper utility for Text-to-Speech (TTS) using the browser's speechSynthesis API.
 * Runs completely on the client side and supports Portuguese (pt-BR).
 */

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  options: {
    enabled: boolean;
    rate?: number;
    pitch?: number;
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  if (!options.enabled || !("speechSynthesis" in window)) {
    return;
  }

  try {
    // Cancel any active speech
    window.speechSynthesis.cancel();

    const lang = options.lang || "pt-BR";
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Configure voice properties
    utterance.rate = options.rate ?? 0.82; // Slower for comprehension
    utterance.pitch = options.pitch ?? 1.15; // Friendly, child-like tone

    // Statically retrieve voices
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) => v.lang === lang || v.lang.startsWith(lang.substring(0, 2))
    );
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    // Set callbacks
    if (options.onStart) utterance.onstart = options.onStart;
    
    utterance.onend = () => {
      if (options.onEnd) options.onEnd();
      activeUtterance = null;
    };

    utterance.onerror = (event) => {
      // Ignore normal interruptions (cancelling speech is expected)
      if (event.error !== "interrupted") {
        console.warn("SpeechSynthesis error:", event);
        if (options.onError) options.onError(event);
      }
      activeUtterance = null;
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Failed to execute Text-to-Speech:", error);
  }
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function isSpeaking(): boolean {
  return "speechSynthesis" in window && window.speechSynthesis.speaking;
}
