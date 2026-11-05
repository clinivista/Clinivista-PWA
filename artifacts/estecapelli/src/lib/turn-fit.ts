// ¿La cabeza está girada hacia el lado que pide la vista lateral? Con histéresis (para no parpadear en el límite) y con memoria:
// si la cabeza ya estaba girada y la malla pierde la cara (giro muy pronunciado, de perfil), se mantiene como girada unos segundos.

export type TurnSide = "right" | "left";
export type TurnState = { on: boolean; turnedAt: number | null };

export const newTurnState = (): TurnState => ({ on: false, turnedAt: null });

/** Desvío de la nariz (proporción del ancho de la cara) para dar el giro por bueno / para perderlo. */
export const TURN_ON = 0.45;
export const TURN_OFF = 0.35;
/** Tiempo que se conserva el giro cuando el detector deja de ver la cara. */
export const LOST_FACE_MS = 4000;

/**
 * `ratio`: desvío de la nariz sobre la imagen sin espejo (positivo = nariz hacia la derecha de la imagen).
 * Vista del lado derecho: el paciente gira hacia su izquierda (positivo). Lado izquierdo: hacia su derecha (negativo).
 */
export function judgeTurn(side: TurnSide, ratio: number | null, state: TurnState, now: number): { turned: boolean; state: TurnState } {
  if (ratio === null) {
    const keep = state.on && state.turnedAt !== null && now - state.turnedAt < LOST_FACE_MS;
    return { turned: keep, state: keep ? state : newTurnState() };
  }
  const toward = side === "right" ? ratio : -ratio;
  const turned = toward >= (state.on ? TURN_OFF : TURN_ON);
  return { turned, state: turned ? { on: true, turnedAt: now } : newTurnState() };
}
