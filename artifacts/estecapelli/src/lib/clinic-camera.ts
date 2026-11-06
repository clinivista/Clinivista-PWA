// Cámara de la clínica: las mismas vistas guiadas del paciente (óvalo + voz), con interruptor para el personal.
import type { GuideKind } from "./camera-guide-i18n";

type ClinicGuide = { guideKind: GuideKind; image: string; animation: string; aspectRatio: string };

const guideUrl = (name: string) => `${import.meta.env.BASE_URL ?? "/"}guides/${name}`;

// Todas las fotos de la clínica se toman con la cámara de Clinivista (isotipo y marco). Las vistas capilares llevan además óvalo y voz. La zona donante usa el método del espejo, pensado para que el paciente se la tome solo:
// la clínica la fotografía de frente a la nuca, así que va sin óvalo (solo marco 4:3 e isotipo).
const GUIDES: Record<string, ClinicGuide> = {
  frontal: { guideKind: "front", image: "guia-1-frontal.png", animation: "anim-1-frontal.webp", aspectRatio: "3:4" },
  vertex: { guideKind: "top", image: "guia-2-superior.png", animation: "anim-2-superior.webp", aspectRatio: "4:3" },
  temporalRight: { guideKind: "right", image: "guia-3-lado-derecho.png", animation: "anim-3-lado-derecho.webp", aspectRatio: "4:3" },
  temporalLeft: { guideKind: "left", image: "guia-4-lado-izquierdo.png", animation: "anim-4-lado-izquierdo.webp", aspectRatio: "4:3" },
};
const PLAIN_ASPECT: Record<string, string> = { donor: "4:3" };

/**
 * Las vistas de las fases siguientes a la primera se guardan como «<fase>-frontal», «<fase>-donor»…, así que se
 * reconoce la vista por el final de la clave. Las vistas que la clínica agregó (clave al azar) no coinciden con ninguna.
 */
const baseKey = (viewKey: string) => [...Object.keys(GUIDES), ...Object.keys(PLAIN_ASPECT)].find((key) => viewKey === key || viewKey.endsWith(`-${key}`));

export function clinicGuideFor(viewKey: string) {
  const guide = GUIDES[baseKey(viewKey) ?? ""];
  return guide
    ? { guideKind: guide.guideKind, guideImage: guideUrl(guide.image), guideAnimation: guideUrl(guide.animation), aspectRatio: guide.aspectRatio }
    : null;
}
/** Marco de la foto: el de la vista capilar reconocida y 4:3 para cualquier otra (lesiones, cirugía plástica, vistas propias). */
export const clinicAspectFor = (viewKey: string) => { const key = baseKey(viewKey); return key ? GUIDES[key]?.aspectRatio ?? PLAIN_ASPECT[key] : "4:3"; };

const PREF_KEY = "clinivista.clinicCameraGuide";
/** Óvalo y voz de la clínica: activados salvo que el personal los haya apagado en este dispositivo. */
export function readGuidePref(): boolean {
  try { return window.localStorage.getItem(PREF_KEY) !== "off"; } catch { return true; }
}
export function writeGuidePref(on: boolean) {
  try { window.localStorage.setItem(PREF_KEY, on ? "on" : "off"); } catch { /* sin almacenamiento: vale solo esta vez */ }
}

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
