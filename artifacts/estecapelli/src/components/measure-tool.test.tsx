import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeasureTool } from "./measure-tool";
import { MeasureDialog } from "./measure-dialog";
import { MeasureProtocol } from "./measure-protocol";

const coin = vi.hoisted(() => ({ fit: null as unknown, lesion: null as unknown }));
vi.mock("@/lib/lesion-detect", () => ({ findLesionExtremes: () => coin.lesion }));
vi.mock("@/lib/coin-detect", async (original) => ({ ...(await original<typeof import("@/lib/coin-detect")>()), findCoin: () => coin.fit }));

// jsdom no carga imágenes ni mide la pantalla: se fija un lienzo de 1000×800 mostrado a 500×400 px.
beforeEach(() => {
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", { configurable: true, get: () => 800 });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); coin.fit = null; coin.lesion = null; });

const tap = (x: number, y: number) => {
  const surface = screen.getByTestId("measure-surface");
  fireEvent.pointerDown(surface, { clientX: x, clientY: y, pointerId: 1 });
  fireEvent.pointerUp(surface, { clientX: x, clientY: y, pointerId: 1 });
};
const ready = async () => { fireEvent.load(document.querySelector("img")!); await screen.findByTestId("measure-surface"); };

describe("MeasureTool: moneda detectada sola", () => {
  const found = (axisRatio: number) => ({ center: { x: 225, y: 100 }, radius: 130, diameterPoints: [{ x: 100, y: 100 }, { x: 360, y: 100 }], axisRatio, coverage: 0.9, score: 0.8 });

  it("propone los bordes de la moneda y pasa directo a marcar la lesión", async () => {
    coin.fit = found(0.99);
    const onSave = vi.fn(async () => undefined);
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={onSave} onClose={vi.fn()} />);
    await ready();
    await waitFor(() => expect(screen.getByTestId("measure-step")).toHaveTextContent("Paso 2 de 2"));
    expect(screen.getByTestId("measure-auto")).toHaveTextContent("Encontramos la moneda");
    expect(screen.queryByTestId("measure-tilt")).not.toBeInTheDocument();
    tap(50, 200); tap(110, 200);
    expect(screen.getByTestId("measure-result")).toHaveTextContent("12,0 mm");
    await userEvent.click(screen.getByTestId("measure-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ detection: { auto: true, axisRatio: 0.99 } });
  });

  it("avisa si la moneda se ve ovalada y suma incertidumbre; mover el punto deja de contarla como automática", async () => {
    coin.fit = found(0.85);
    const onSave = vi.fn(async () => undefined);
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={onSave} onClose={vi.fn()} />);
    await ready();
    expect(await screen.findByTestId("measure-tilt")).toHaveTextContent("inclinada");
    tap(50, 200); tap(110, 200);
    expect(screen.getByTestId("measure-result")).toHaveTextContent("±22 %"); // 7 + 15
    // Arrastra el primer punto de la moneda unos píxeles.
    const surface = screen.getByTestId("measure-surface");
    fireEvent.pointerDown(surface, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 52, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 52, clientY: 50, pointerId: 1 });
    await userEvent.click(screen.getByTestId("measure-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ detection: { auto: false, axisRatio: 0.85 } });
  });

  it("si no la encuentra, lo dice y deja marcarla a mano", async () => {
    coin.fit = null;
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    await waitFor(() => expect(screen.getByTestId("measure-auto")).toHaveTextContent("No pudimos encontrar la moneda"));
    expect(screen.getByTestId("measure-step")).toHaveTextContent("Paso 1 de 2");
    expect(screen.getByText("Buscar la moneda otra vez")).toBeInTheDocument();
  });
});

describe("MeasureTool: lesión marcada sola", () => {
  it("al tocar dentro de la lesión propone sus extremos y calcula la medida", async () => {
    coin.lesion = { points: [{ x: 100, y: 400 }, { x: 220, y: 400 }], areaFraction: 0.05 };
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    tap(50, 50); tap(180, 50); // moneda de $500: 10 px por mm
    await userEvent.click(screen.getByTestId("measure-auto-lesion"));
    expect(screen.getByTestId("measure-seed-hint")).toBeInTheDocument();
    tap(80, 200);
    expect(await screen.findByTestId("measure-lesion-note")).toHaveTextContent("Marcamos los extremos");
    expect(screen.getByTestId("measure-result")).toHaveTextContent("12,0 mm");
    expect(screen.queryByTestId("measure-auto-lesion")).not.toBeInTheDocument();
  });

  it("si no puede delimitarla lo dice y el toque siguiente se marca a mano", async () => {
    coin.lesion = null;
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    tap(50, 50); tap(180, 50);
    await userEvent.click(screen.getByTestId("measure-auto-lesion"));
    tap(80, 200);
    expect(await screen.findByTestId("measure-lesion-note")).toHaveTextContent("No pudimos delimitar");
    tap(50, 200); tap(110, 200);
    expect(screen.getByTestId("measure-result")).toHaveTextContent("12,0 mm");
  });
});

describe("MeasureTool", () => {
  it("pide primero los bordes de la moneda y luego los extremos de la lesión, y muestra la medida en vivo", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={onSave} onClose={vi.fn()} />);
    await ready();
    expect(screen.getByTestId("measure-step")).toHaveTextContent("Paso 1 de 2");
    expect(screen.getByTestId("measure-save")).toBeDisabled();

    // Moneda de $500 (26 mm): 130 px de pantalla = 260 px de imagen → 10 px por mm.
    tap(50, 50); tap(180, 50);
    expect(screen.getByTestId("measure-step")).toHaveTextContent("Paso 2 de 2");
    tap(50, 200); tap(110, 200); // 60 px de pantalla = 120 px de imagen = 12 mm
    expect(screen.getByTestId("measure-result")).toHaveTextContent("12,0 mm");
    expect(screen.getByTestId("measure-result")).toHaveTextContent("1,2 cm");

    await userEvent.click(screen.getByTestId("measure-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      referenceId: "clp-500", imageWidth: 1000, imageHeight: 800,
      referencePoints: [{ x: 100, y: 100 }, { x: 360, y: 100 }], lesionPoints: [{ x: 100, y: 400 }, { x: 220, y: 400 }],
    });
  });

  it("cambia la moneda: la misma marca da otra medida, y la $50 suma incertidumbre por tener 10 lados", async () => {
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    tap(50, 50); tap(180, 50); tap(50, 200); tap(110, 200);
    const margin = () => screen.getByTestId("measure-result").textContent ?? "";
    expect(margin()).toContain("±7 %");
    await userEvent.selectOptions(screen.getByTestId("measure-reference"), "clp-50");
    expect(screen.getByTestId("measure-result")).toHaveTextContent("11,5 mm");
    expect(margin()).toContain("±12 %");
  });

  it("deshacer y empezar de nuevo; el paciente no puede usar una referencia propia, el personal sí", async () => {
    const { unmount } = render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    tap(50, 50); tap(180, 50); tap(50, 200);
    expect(screen.getAllByTestId("measure-lesion-point")).toHaveLength(1);
    await userEvent.click(screen.getByText("Deshacer último punto"));
    expect(screen.queryAllByTestId("measure-lesion-point")).toHaveLength(0);
    await userEvent.click(screen.getByText("Empezar de nuevo"));
    expect(screen.queryAllByTestId("measure-ref-point")).toHaveLength(0);
    expect(screen.queryByRole("option", { name: /Otra referencia/ })).toBeNull();
    unmount();

    render(<MeasureTool imageUrl="/x.jpg" role="staff" onSave={vi.fn()} onClose={vi.fn()} />);
    await ready();
    await userEvent.selectOptions(screen.getByTestId("measure-reference"), "custom");
    await userEvent.type(screen.getByTestId("measure-custom-mm"), "10");
    tap(50, 50); tap(100, 50); // 100 px de imagen = 10 mm
    tap(50, 200); tap(175, 200); // 250 px = 25 mm
    expect(screen.getByTestId("measure-result")).toHaveTextContent("25,0 mm");
    expect(screen.getByTestId("measure-result")).toHaveTextContent("±9 %");
  });

  it("muestra el error del servidor si no se pudo guardar", async () => {
    const onSave = vi.fn(async () => { throw new Error("La moneda se ve muy pequeña."); });
    render(<MeasureTool imageUrl="/x.jpg" role="patient" onSave={onSave} onClose={vi.fn()} />);
    await ready();
    tap(50, 50); tap(180, 50); tap(50, 200); tap(110, 200);
    await userEvent.click(screen.getByTestId("measure-save"));
    expect(await screen.findByRole("alert")).toHaveTextContent("La moneda se ve muy pequeña.");
  });
});

describe("MeasureDialog", () => {
  const measurement = {
    referenceId: "clp-500", referenceMm: 26, referencePx: 260, referencePoints: [{ x: 0, y: 0 }, { x: 260, y: 0 }], lesionPoints: [{ x: 0, y: 5 }, { x: 120, y: 5 }],
    imageWidth: 1000, imageHeight: 800, lengthMm: 12, uncertaintyPct: 7, by: "patient" as const, byName: "Ana", at: "2026-10-25T10:00:00Z",
  };

  it("muestra la medida y quién la tomó; el paciente la ve sin detalles internos", () => {
    const { unmount } = render(<MeasureDialog endpoint="/e" imageUrl="/x.jpg" role="patient" measurement={measurement} onChanged={vi.fn()} />);
    expect(screen.getByTestId("measure-badge")).toHaveTextContent("Medida: 12,0 mm");
    expect(screen.getByTestId("measure-badge")).not.toHaveTextContent("Medida por");
    expect(screen.getByTestId("measure-open")).toHaveTextContent("Volver a medir");
    unmount();
    render(<MeasureDialog endpoint="/e" imageUrl="/x.jpg" role="staff" measurement={measurement} onChanged={vi.fn()} />);
    expect(screen.getByTestId("measure-badge")).toHaveTextContent("Medida por el paciente");
  });

  it("guarda en la dirección de la foto y avisa el resultado", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      return new Response(JSON.stringify({ measurement }), { status: 200 });
    }));
    const onChanged = vi.fn();
    render(<MeasureDialog endpoint="/api/patients/tk/photos/p1/measurement" imageUrl="/x.jpg" role="patient" measurement={null} onChanged={onChanged} />);
    expect(screen.getByText("Es opcional, pero ayuda a tu médico.")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("measure-open"));
    await ready();
    tap(50, 50); tap(180, 50); tap(50, 200); tap(110, 200);
    await userEvent.click(screen.getByTestId("measure-save"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(measurement));
    expect(calls[0]).toEqual({ url: "/api/patients/tk/photos/p1/measurement", method: "PUT" });
  });
});

describe("MeasureProtocol", () => {
  it("explica en pasos cómo poner la moneda y lista las monedas aceptadas", () => {
    render(<MeasureProtocol />);
    expect(screen.getByTestId("measure-protocol")).toHaveTextContent("Cómo medir tu lesión con una moneda");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(5 + 6);
    expect(screen.getByText(/\$500 · 26 mm/)).toBeInTheDocument();
    expect(screen.getByText(/\$50 \(10 lados\) · 25 mm/)).toBeInTheDocument();
    expect(screen.getByText(/\$10 \(nueva\) · 18,7 mm/)).toBeInTheDocument();
  });
});
