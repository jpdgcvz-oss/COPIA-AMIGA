/**
 * Web Audio API synthesizer for child-friendly retro and sensory sound effects.
 * Avoids the need for external static assets and runs offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browsers block audio until first user action)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes a sweet, magical coin "ding!" sound.
 */
export function playCoinSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08); // C6

    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second note, staggered slightly
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.06); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.14); // E6

    gain2.gain.setValueAtTime(0.15, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.06);
    osc2.stop(now + 0.35);
  } catch (error) {
    console.warn("Failed to play coin sound:", error);
  }
}

/**
 * Synthesizes a happy, triumphant level up/lesson completed sound.
 */
export function playLevelUpSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    const duration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * duration);

      gain.gain.setValueAtTime(0.12, now + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + 0.4);
    });

    // Final sweet chord
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + notes.length * duration);

      gain.gain.setValueAtTime(0.08, now + notes.length * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * duration + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + notes.length * duration);
      osc.stop(now + notes.length * duration + 1.2);
    });
  } catch (error) {
    console.warn("Failed to play level up sound:", error);
  }
}

/**
 * Synthesizes a soft organic pop sound for button clicks.
 */
export function playClickSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05); // A4

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (error) {
    console.warn("Failed to play click sound:", error);
  }
}
