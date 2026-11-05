import { describe, expect, it } from "vitest";
import { judgeTurn, newTurnState, LOST_FACE_MS, TURN_OFF, TURN_ON } from "./turn-fit";
import { turnFromLandmarks } from "./face-turn";

describe("giro de la cabeza en las vistas laterales", () => {
  it("lado derecho: pide la nariz hacia la derecha de la imagen (el paciente gira hacia su izquierda)", () => {
    expect(judgeTurn("right", 0.6, newTurnState(), 0).turned).toBe(true);
    expect(judgeTurn("right", -0.6, newTurnState(), 0).turned).toBe(false); // giró hacia el lado contrario
    expect(judgeTurn("right", 0.02, newTurnState(), 0).turned).toBe(false); // de frente
  });

  it("lado izquierdo: lo contrario", () => {
    expect(judgeTurn("left", -0.6, newTurnState(), 0).turned).toBe(true);
    expect(judgeTurn("left", 0.6, newTurnState(), 0).turned).toBe(false);
  });

  it("uses hysteresis around the limit so it does not flicker", () => {
    const between = (TURN_ON + TURN_OFF) / 2;
    expect(judgeTurn("right", between, newTurnState(), 0).turned).toBe(false);
    const on = judgeTurn("right", TURN_ON + 0.01, newTurnState(), 0).state;
    expect(judgeTurn("right", between, on, 100).turned).toBe(true);
    expect(judgeTurn("right", TURN_OFF - 0.01, on, 100).turned).toBe(false);
  });

  it("keeps the turn for a few seconds when the face is lost (profile beyond the detector), never from the start", () => {
    expect(judgeTurn("right", null, newTurnState(), 0).turned).toBe(false);
    const on = judgeTurn("right", 0.6, newTurnState(), 1000).state;
    expect(judgeTurn("right", null, on, 1000 + LOST_FACE_MS - 1).turned).toBe(true);
    expect(judgeTurn("right", null, on, 1000 + LOST_FACE_MS + 1).turned).toBe(false);
  });

  it("measures the nose offset from the mesh points", () => {
    const point = (x: number) => ({ x, y: 0.5, z: 0 });
    const frontal = []; frontal[1] = point(0.5); frontal[234] = point(0.2); frontal[454] = point(0.8);
    expect(turnFromLandmarks(frontal)).toBeCloseTo(0, 5);
    const turned = []; turned[1] = point(0.68); turned[234] = point(0.2); turned[454] = point(0.8);
    expect(turnFromLandmarks(turned)).toBeCloseTo(0.3, 5);
    expect(turnFromLandmarks([])).toBeNull();
  });
});
