// Texto del interruptor de óvalo y voz en la cámara de la clínica, en los nueve idiomas.
import type { LangCode } from "./language";

export const CLINIC_CAMERA_TEXT: Record<LangCode, { guideOn: string; guideOff: string }> = {
  es: {"guideOn": "Guía: activada", "guideOff": "Guía: desactivada"},
  en: {"guideOn": "Guide: on", "guideOff": "Guide: off"},
  pt: {"guideOn": "Guia: ativada", "guideOff": "Guia: desativada"},
  fr: {"guideOn": "Guide : activé", "guideOff": "Guide : désactivé"},
  de: {"guideOn": "Hilfe: an", "guideOff": "Hilfe: aus"},
  it: {"guideOn": "Guida: attiva", "guideOff": "Guida: disattivata"},
  tr: {"guideOn": "Rehber: açık", "guideOff": "Rehber: kapalı"},
  ar: {"guideOn": "الإرشاد: مفعّل", "guideOff": "الإرشاد: متوقف"},
  zh: {"guideOn": "引导：开", "guideOff": "引导：关"},
};
