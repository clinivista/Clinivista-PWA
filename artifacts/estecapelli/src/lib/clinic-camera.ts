// Cámara de la clínica: las mismas vistas guiadas del paciente (óvalo + voz), con interruptor para el personal.
import type { GuideKind } from "./camera-guide-i18n";

type ClinicGuide = { guideKind: GuideKind; image: string; animation: string; aspectRatio: string };

const guideUrl = (name: string) => `${import.meta.env.BASE_URL ?? "/"}guides/${name}`;

// Vistas capilares con guía. La zona donante usa el método del espejo, pensado para que el paciente se la tome solo:
// la clínica la fotografía de frente a la nuca, así que va sin óvalo (solo marco 4:3 e isotipo).
const GUIDES: Record<string, ClinicGuide> = {
  frontal: { guideKind: "front", image: "guia-1-frontal.png", animation: "anim-1-frontal.webp", aspectRatio: "3:4" },
  vertex: { guideKind: "top", image: "guia-2-superior.png", animation: "anim-2-superior.webp", aspectRatio: "4:3" },
  temporalRight: { guideKind: "right", image: "guia-3-lado-derecho.png", animation: "anim-3-lado-derecho.webp", aspectRatio: "4:3" },
  temporalLeft: { guideKind: "left", image: "guia-4-lado-izquierdo.png", animation: "anim-4-lado-izquierdo.webp", aspectRatio: "4:3" },
};
const PLAIN_ASPECT: Record<string, string> = { donor: "4:3" };

/** Vistas que se toman con la cámara de Clinivista; el resto (lesiones, cirugía plástica, vistas propias) sigue con la cámara nativa. */
export const usesAppCamera = (viewKey: string) => viewKey in GUIDES || viewKey in PLAIN_ASPECT;

export function clinicGuideFor(viewKey: string) {
  const guide = GUIDES[viewKey];
  return guide
    ? { guideKind: guide.guideKind, guideImage: guideUrl(guide.image), guideAnimation: guideUrl(guide.animation), aspectRatio: guide.aspectRatio }
    : null;
}
export const clinicAspectFor = (viewKey: string) => GUIDES[viewKey]?.aspectRatio ?? PLAIN_ASPECT[viewKey];

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
