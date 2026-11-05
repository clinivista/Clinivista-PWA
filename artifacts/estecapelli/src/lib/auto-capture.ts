import type { FitStatus } from "./head-fit";

// Máquina de la captura automática: dice qué hacer mientras la persona se acomoda, detecta que se quedó quieta dentro del óvalo,
// cuenta 3-2-1 y dispara. Es una función pura (recibe la hora) para poder probarla sin cámara.

export type SayKey = "nobody" | "closer" | "farther" | "left" | "right" | "up" | "down" | "hold" | "n3" | "n2" | "n1" | "moved" | "taken";
export type Beep = "lock" | "tick" | "lost" | "shutter";

export type Machine = {
  phase: "guiding" | "countdown" | "done";
  /** Desde cuándo el encuadre está bien (guiando) o desde cuándo dejó de estarlo (cuenta regresiva). */
  okSince: number | null;
  badSince: number | null;
  /** Segundo de la cuenta que ya se anunció (3, 2, 1) y cuándo empezó la cuenta. */
  count: number;
  countStart: number;
  lastSay: { key: SayKey; at: number } | null;
  /** Cuándo apareció «no se ve a nadie» (para no avisar al primer parpadeo). */
  noneSince: number | null;
};

export type StepOutput = { machine: Machine; say?: SayKey; beep?: Beep; capture?: boolean };

/** Tiempo quieto dentro del óvalo antes de empezar la cuenta. */
export const HOLD_MS = 900;
/** Cuánto puede salirse durante la cuenta antes de cancelarla (tolera un parpadeo del detector). */
export const LOST_TOLERANCE_MS = 500;
export const COUNT_STEP_MS = 1000;
/** Tiempo para decir «Perfecto, no te muevas» antes de empezar a contar. */
export const LEAD_MS = 1200;
/** Mismo aviso: no se repite antes de este tiempo; avisos distintos: espera mínima entre uno y otro. */
export const REPEAT_MS = 4500;
export const GAP_MS = 2200;
const NONE_MS = 1500;

export const newMachine = (): Machine => ({ phase: "guiding", okSince: null, badSince: null, count: 0, countStart: 0, lastSay: null, noneSince: null });

const INSTRUCTION: Record<Exclude<FitStatus, "ok">, SayKey> = { none: "nobody", closer: "closer", farther: "farther", left: "left", right: "right", up: "up", down: "down" };

export function step(machine: Machine, fit: FitStatus, now: number): StepOutput {
  if (machine.phase === "done") return { machine };

  if (machine.phase === "countdown") {
    const lostFor = fit === "ok" ? null : (machine.badSince ?? now);
    if (lostFor !== null && now - lostFor >= LOST_TOLERANCE_MS) {
      return { machine: { ...newMachine(), lastSay: { key: "moved", at: now } }, say: "moved", beep: "lost" };
    }
    const elapsed = now - machine.countStart - LEAD_MS;
    const wanted = elapsed < 0 ? 0 : Math.min(3, Math.floor(elapsed / COUNT_STEP_MS) + 1); // 1 → «3», 2 → «2», 3 → «1»
    const next: Machine = { ...machine, badSince: lostFor };
    if (elapsed >= 3 * COUNT_STEP_MS) return { machine: { ...next, phase: "done" }, say: "taken", beep: "shutter", capture: true };
    if (wanted > machine.count) {
      const key: SayKey = wanted === 1 ? "n3" : wanted === 2 ? "n2" : "n1";
      return { machine: { ...next, count: wanted }, say: key, beep: "tick" };
    }
    return { machine: next };
  }

  // Guiando
  if (fit === "ok") {
    const okSince = machine.okSince ?? now;
    if (now - okSince >= HOLD_MS) {
      return { machine: { ...machine, phase: "countdown", okSince: null, badSince: null, count: 0, countStart: now, noneSince: null, lastSay: { key: "hold", at: now } }, say: "hold", beep: "lock" };
    }
    return { machine: { ...machine, okSince, noneSince: null } };
  }

  const base: Machine = { ...machine, okSince: null, noneSince: fit === "none" ? (machine.noneSince ?? now) : null };
  if (fit === "none" && now - (base.noneSince ?? now) < NONE_MS) return { machine: base };
  const key = INSTRUCTION[fit];
  const last = machine.lastSay;
  const sameRecently = last && last.key === key && now - last.at < REPEAT_MS;
  const tooSoon = last && now - last.at < GAP_MS;
  if (sameRecently || tooSoon) return { machine: base };
  return { machine: { ...base, lastSay: { key, at: now } }, say: key };
}
