// Recursos (guías, artículos, manuales públicos). Vacío = no aparece el enlace
// «Recursos» ni la sección. Agrega solo recursos que existan con su enlace real.
import type { LangCode } from "./i18n";

export type Resource = {
  id: string;
  title: Partial<Record<LangCode, string>> & { es: string };
  description?: Partial<Record<LangCode, string>> & { es: string };
  href: string;
};

export const RESOURCES: Resource[] = [];
