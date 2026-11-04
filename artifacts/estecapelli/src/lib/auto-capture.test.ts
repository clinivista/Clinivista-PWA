import { describe, expect, it } from "vitest";
import { COUNT_STEP_MS, HOLD_MS, LEAD_MS, LOST_TOLERANCE_MS, GAP_MS, newMachine, step, type Machine, type SayKey } from "./auto-capture";
import type { FitStatus } from "./head-fit";

function run(frames: Array<[number, FitStatus]>) {
  let machine: Machine = newMachine();
  const events: Array<{ at: number; say?: SayKey; beep?: string; capture?: boolean }> = [];
  for (const [at, fit] of frames) {
    const out = step(machine, fit, at);
    machine = out.machine;
    if (out.say || out.beep || out.capture) events.push({ at, say: out.say, beep: out.beep, capture: out.capture });
  }
  return { machine, events };
}
const every = (from: number, to: number, fit: FitStatus, gap = 100): Array<[number, FitStatus]> => {
  const list: Array<[number, FitStatus]> = [];
  for (let t = from; t <= to; t += gap) list.push([t, fit]);
  return list;
};

describe("captura automática", () => {
  it("guides with one instruction at a time, without repeating it every frame", () => {
    const { events } = run(every(0, 6000, "closer"));
    const says = events.map((event) => event.say);
    expect(says[0]).toBe("closer");
    expect(events[1].at - events[0].at).toBeGreaterThanOrEqual(4500);
  });

  it("waits before warning that nobody is seen", () => {
    expect(run(every(0, 1000, "none")).events).toHaveLength(0);
    expect(run(every(0, 2000, "none")).events[0].say).toBe("nobody");
  });

  it("changes the instruction as the person corrects, respecting a minimum gap", () => {
    const { events } = run([...every(0, 200, "closer"), ...every(300, 1000, "left"), ...every(1100, 3000, "left")]);
    expect(events.map((event) => event.say)).toEqual(["closer", "left"]);
    expect(events[1].at - events[0].at).toBeGreaterThanOrEqual(GAP_MS);
  });

  it("locks when the head stays in the oval, counts 3-2-1 and takes the photo", () => {
    const total = HOLD_MS + LEAD_MS + 3 * COUNT_STEP_MS + 500;
    const { events, machine } = run(every(0, total, "ok"));
    expect(events.map((event) => event.say)).toEqual(["hold", "n3", "n2", "n1", "taken"]);
    expect(events.map((event) => event.beep)).toEqual(["lock", "tick", "tick", "tick", "shutter"]);
    expect(events[events.length - 1].capture).toBe(true);
    expect(machine.phase).toBe("done");
  });

  it("does not start the count for a passing moment inside the oval", () => {
    const { events } = run([...every(0, 400, "ok"), ...every(500, 3000, "left")]);
    expect(events.some((event) => event.say === "hold")).toBe(false);
  });

  it("cancels the count when the person moves out for too long, and starts over", () => {
    const start = HOLD_MS + 100;
    const { events, machine } = run([...every(0, start + 1500, "ok"), ...every(start + 1600, start + 1600 + LOST_TOLERANCE_MS + 200, "right")]);
    expect(events.map((event) => event.say)).toContain("moved");
    expect(events.some((event) => event.capture)).toBe(false);
    expect(machine.phase).toBe("guiding");
  });

  it("tolerates a single glitch frame during the count", () => {
    const frames: Array<[number, FitStatus]> = [...every(0, 2000, "ok"), [2100, "left"], ...every(2200, 6500, "ok")];
    const { events } = run(frames);
    expect(events.some((event) => event.say === "moved")).toBe(false);
    expect(events.some((event) => event.capture)).toBe(true);
  });
});
