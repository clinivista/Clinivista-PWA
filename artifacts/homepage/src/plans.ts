// Planes que se muestran en el sitio. Vacío = no aparece el enlace «Planes» ni
// la sección. Agrega solo planes reales y vigentes (sin precios ni funciones
// inventados). Los textos van en el idioma del sitio (`es`) y, si se desea, en
// los demás.
import type { LangCode } from "./i18n";

export type Plan = {
  id: string;
  name: Partial<Record<LangCode, string>> & { es: string };
  /** Texto del precio tal como se publica (p. ej. «Consultar»). */
  price?: Partial<Record<LangCode, string>> & { es: string };
  features: Array<Partial<Record<LangCode, string>> & { es: string }>;
};

export const PLANS: Plan[] = [];
