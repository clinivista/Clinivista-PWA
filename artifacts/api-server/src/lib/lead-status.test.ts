import { describe, it, expect } from "vitest";
import { deriveStatus } from "./lead-status-rules";

type P = { key: string; kind: "capture" | "diagnosis"; complete: boolean };
const KEYS = ["preevaluacion", "diagnostico", "preoperatorio", "postoperatorio", "control-1", "control-2"];
/** The six phases, with the first `done` of them complete. */
const phases = (done: number): P[] => KEYS.map((key, i) => ({ key, kind: key === "diagnostico" ? "diagnosis" : "capture", complete: i < done }));

describe("estado automático del paciente", () => {
  it("sigue incompleto mientras falten fotos de la pre-evaluación", () => {
    expect(deriveStatus("incompleto", "", phases(0))).toBe("incompleto");
    expect(deriveStatus("nuevo", "", phases(0))).toBe("incompleto");
  });
  it("pasa a listo para revisión al completar la pre-evaluación", () => {
    expect(deriveStatus("incompleto", "", phases(1))).toBe("listo");
  });
  it("pasa a listo para contactar al cerrar el diagnóstico", () => {
    expect(deriveStatus("listo", "", phases(2))).toBe("contactar");
  });
  it("recuerda el contacto administrativo: agendado si hay cita, contactado si no", () => {
    expect(deriveStatus("contactar", "2026-11-02T15:00:00.000Z", phases(2))).toBe("agendado");
    expect(deriveStatus("contactado", "", phases(2))).toBe("contactado");
    expect(deriveStatus("agendado", "", phases(3))).toBe("agendado"); // pre-operatorio en curso
  });
  it("queda operado al completar el post-operatorio (cuarta fase), antes de los controles", () => {
    expect(deriveStatus("agendado", "x", phases(3))).toBe("agendado");
    expect(deriveStatus("agendado", "x", phases(4))).toBe("operado");
    expect(deriveStatus("operado", "x", phases(5))).toBe("operado"); // falta el control 2
  });
  it("termina en tratamiento completado solo con todas las fases", () => {
    expect(deriveStatus("operado", "x", phases(6))).toBe("completado");
  });
  it("encuentra el post-operatorio aunque la clínica lo haya renombrado o movido", () => {
    const moved = [...phases(0)];
    moved.splice(2, 0, { key: "extra", kind: "capture", complete: true });
    moved.forEach((p, i) => { p.complete = i < 5; }); // hasta el post-operatorio incluido
    expect(deriveStatus("contactar", "", moved)).toBe("operado");
  });
  it("respeta el estado cerrado puesto a mano", () => {
    expect(deriveStatus("cerrado", "", phases(6))).toBe("cerrado");
  });
});
