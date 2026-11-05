import type { Beep } from "./auto-capture";
import type { LangCode } from "./language";

// Voz y pitidos de la guía. La voz usa la síntesis del navegador (sin descargas, en el idioma del paciente) y los pitidos
// se generan con Web Audio. Nada de esto debe romper la captura: si el navegador no lo soporta, simplemente no suena.

export const SPEECH_LANG: Record<LangCode, string> = { es: "es-ES", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT", tr: "tr-TR", ar: "ar-SA", zh: "zh-CN" };
const MUTE_KEY = "clinivista_guide_muted";

export function readMuted(): boolean {
  try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function saveMuted(muted: boolean): void {
  try { window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* sin almacenamiento: queda solo en esta sesión */ }
}

/** Cada pitido: lista de [frecuencia Hz, duración s, retraso s]. */
export const BEEP_PLAN: Record<Beep, Array<[number, number, number]>> = {
  lock: [[660, 0.12, 0], [880, 0.18, 0.14]],
  tick: [[740, 0.1, 0]],
  lost: [[330, 0.2, 0]],
  shutter: [[1040, 0.08, 0], [1040, 0.08, 0.1], [1320, 0.2, 0.2]],
};

type Ctor = typeof AudioContext;

export class GuideAudio {
  private context: AudioContext | null = null;
  muted: boolean;

  constructor(private lang: LangCode, muted = readMuted()) {
    this.muted = muted;
  }

  setLang(lang: LangCode) { this.lang = lang; }

  /** Debe llamarse dentro de un toque del paciente: los navegadores móviles no dejan sonar antes. */
  unlock(): void {
    try {
      const Audio = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) as Ctor | undefined;
      if (Audio && !this.context) this.context = new Audio();
      void this.context?.resume();
    } catch { /* sin audio */ }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
    if (muted) this.stop();
  }

  /** ¿Este navegador puede hablar? (Si no, la guía sigue con textos y pitidos.) */
  static canSpeak(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  /** Utterances en curso: se guardan para que el navegador no las descarte (en Chrome pueden cortarse si se recolectan). */
  private pending = new Set<SpeechSynthesisUtterance>();

  private speakNow(text: string): void {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const tag = SPEECH_LANG[this.lang];
    utterance.lang = tag;
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().replace("_", "-").startsWith(tag.slice(0, 2).toLowerCase()));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.volume = 1;
    const release = () => { this.pending.delete(utterance); };
    utterance.onend = release;
    utterance.onerror = release;
    this.pending.add(utterance);
    try { synth.resume(); } catch { /* algunos navegadores no lo implementan */ }
    synth.speak(utterance);
  }

  /**
   * Primera frase, dicha dentro del toque del paciente: iOS y Chrome solo dejan hablar después de una interacción.
   * Sirve también de prueba para que el paciente oiga que la voz funciona.
   */
  prime(text: string): void {
    if (this.muted || !GuideAudio.canSpeak()) return;
    try {
      this.speakNow(text);
    } catch { /* sin voz */ }
  }

  say(text: string): void {
    if (this.muted || !GuideAudio.canSpeak()) return;
    try {
      const synth = window.speechSynthesis;
      // Se corta la frase anterior solo si sigue sonando; cancelar sin necesidad hace que algunos navegadores ignoren la nueva.
      if (synth.speaking || synth.pending) {
        synth.cancel();
        window.setTimeout(() => { if (!this.muted) { try { this.speakNow(text); } catch { /* sin voz */ } } }, 90);
        return;
      }
      this.speakNow(text);
    } catch { /* sin voz */ }
  }

  beep(kind: Beep): void {
    if (this.muted || !this.context) return;
    try {
      const ctx = this.context;
      const now = ctx.currentTime;
      for (const [frequency, duration, delay] of BEEP_PLAN[kind]) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.35, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration + 0.02);
      }
    } catch { /* sin audio */ }
  }

  stop(): void {
    this.pending.clear();
    try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch { /* nada */ }
  }

  dispose(): void {
    this.stop();
    try { void this.context?.close(); } catch { /* nada */ }
    this.context = null;
  }
}
