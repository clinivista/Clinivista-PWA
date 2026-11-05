import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGS } from "./language";
import { BEEP_PLAN, GuideAudio, SPEECH_LANG, readMuted, saveMuted } from "./guide-audio";

afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); });

describe("audio de la guía", () => {
  it("has a speech language for every app language and a beep for every event", () => {
    for (const { code } of LANGS) expect(SPEECH_LANG[code]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    expect(Object.keys(BEEP_PLAN).sort()).toEqual(["lock", "lost", "shutter", "tick"]);
  });

  it("speaks in the patient's language, replacing the previous phrase, and stays silent when muted", () => {
    const spoken: Array<{ text: string; lang: string }> = [];
    const cancel = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", class { lang = ""; voice = null; rate = 1; volume = 1; constructor(public text: string) {} });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel, getVoices: () => [], speak: (u: { text: string; lang: string }) => spoken.push({ text: u.text, lang: u.lang }) } });
    const audio = new GuideAudio("fr", false);
    audio.say("Rapprochez le téléphone");
    expect(spoken).toEqual([{ text: "Rapprochez le téléphone", lang: "fr-FR" }]);
    expect(cancel).not.toHaveBeenCalled();
    audio.setMuted(true);
    audio.say("no suena");
    expect(spoken).toHaveLength(1);
    expect(readMuted()).toBe(true);
  });

  it("primes inside the gesture and cuts a phrase that is still playing before the next one", () => {
    vi.useFakeTimers();
    const spoken: string[] = [];
    const cancel = vi.fn();
    const synth = { speaking: false, pending: false, cancel, resume: vi.fn(), getVoices: () => [], speak: (u: { text: string }) => spoken.push(u.text) };
    vi.stubGlobal("SpeechSynthesisUtterance", class { lang = ""; voice = null; rate = 1; volume = 1; constructor(public text: string) {} });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    const audio = new GuideAudio("es", false);
    expect(GuideAudio.canSpeak()).toBe(true);
    audio.prime("Voz activada");
    expect(spoken).toEqual(["Voz activada"]);
    synth.speaking = true;
    audio.say("Acerca el celular");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveLength(1);
    vi.advanceTimersByTime(100);
    expect(spoken).toEqual(["Voz activada", "Acerca el celular"]);
    vi.useRealTimers();
  });

  it("remembers the mute choice and never throws without audio support", () => {
    saveMuted(true);
    expect(readMuted()).toBe(true);
    saveMuted(false);
    expect(readMuted()).toBe(false);
    const audio = new GuideAudio("es", false);
    expect(() => { audio.unlock(); audio.beep("lock"); audio.say("hola"); audio.stop(); audio.dispose(); }).not.toThrow();
  });
});
