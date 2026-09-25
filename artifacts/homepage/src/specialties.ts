export type Specialty = {
  slug: string;
  name: string;
  tagline: string;
  /**
   * Only "capilar" is a real, working protocol today (the Estecapelli
   * pilot). Every other specialty is on the roadmap but has no built
   * protocol yet — keep `available: false` for all of them until a
   * protocol actually ships, so the site never promises something that
   * isn't ready. See the architecture doc for the phased rollout.
   */
  available: boolean;
};

export const SPECIALTIES: Specialty[] = [
  { slug: "capilar", name: "Capilar", tagline: "Alopecia y control evolutivo", available: true },
  { slug: "dermatologico", name: "Dermatología", tagline: "Lesiones y seguimiento", available: false },
  { slug: "estetico", name: "Medicina estética", tagline: "Antes, después y controles", available: false },
  { slug: "plastico", name: "Cirugía plástica", tagline: "Registro pre y posoperatorio", available: false },
  { slug: "dental", name: "Odontología", tagline: "Sonrisa y evolución", available: false },
  { slug: "heridas", name: "Heridas y pie diabético", tagline: "Seguimiento seriado", available: false },
  { slug: "vascular", name: "Flebología", tagline: "Venas y resultados", available: false },
  { slug: "movimiento", name: "Rehabilitación", tagline: "Postura y movilidad", available: false },
  { slug: "oculofacial", name: "Oculoplastia", tagline: "Simetría y recuperación", available: false },
];
