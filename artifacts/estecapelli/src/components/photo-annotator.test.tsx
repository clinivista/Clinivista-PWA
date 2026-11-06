import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";
import { PhotoAnnotator } from "./photo-annotator";

// jsdom no carga imágenes ni dibuja en canvas: se simulan lo justo para abrir el editor.
class FakeImage {
  naturalWidth = 1200; naturalHeight = 1600;
  onload: (() => void) | null = null; onerror: (() => void) | null = null;
  set src(_: string) { queueMicrotask(() => this.onload?.()); }
}

describe("zoom del editor de fotos", () => {
  const original = globalThis.Image;
  beforeEach(() => {
    vi.stubGlobal("Image", FakeImage);
    HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => undefined, set: () => true })) as never;
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 600 });
  });
  afterEach(() => { vi.stubGlobal("Image", original); });

  it("acerca con + , aleja con − y vuelve a ajustar con el botón de pantalla completa", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <PhotoAnnotator photoUrl="x.jpg" label="Frente" initialStrokes={[]} saving={false} onSave={() => {}} onClose={() => {}} />
      </LanguageProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("annotation-canvas")).toBeInTheDocument());
    const level = screen.getByTestId("zoom-level");
    expect(level).toHaveTextContent("100%");
    const zoomOut = screen.getByRole("button", { name: "Alejar" });
    expect(zoomOut).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Acercar" }));
    expect(level).toHaveTextContent("150%");
    await user.click(screen.getByRole("button", { name: "Acercar" }));
    expect(level).toHaveTextContent("225%");
    await user.click(zoomOut);
    expect(level).toHaveTextContent("150%");

    await user.click(screen.getByRole("button", { name: "Ajustar a la pantalla" }));
    expect(level).toHaveTextContent("100%");

    // Atajos de teclado
    await user.keyboard("+");
    expect(level).toHaveTextContent("150%");
    await user.keyboard("0");
    expect(level).toHaveTextContent("100%");
  });
});

describe("herramientas de medición del editor de fotos", () => {
  const original = globalThis.Image;
  beforeEach(() => {
    vi.stubGlobal("Image", FakeImage);
    HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => undefined, set: () => true })) as never;
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 600 });
    // jsdom no trae PointerEvent: sin esto los eventos pierden sus coordenadas.
    vi.stubGlobal("PointerEvent", class extends MouseEvent { pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; } });
  });
  afterEach(() => { vi.stubGlobal("Image", original); vi.unstubAllGlobals(); });

  const open = async () => {
    const onSave = vi.fn();
    render(<LanguageProvider><PhotoAnnotator photoUrl="x.jpg" label="Frente" initialStrokes={[]} saving={false} onSave={onSave} onClose={() => {}} /></LanguageProvider>);
    const canvas = await screen.findByTestId("annotation-canvas");
    return { canvas, onSave };
  };
  const drag = (canvas: Element, from: [number, number], to: [number, number]) => {
    fireEvent.pointerDown(canvas, { clientX: from[0], clientY: from[1], pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: to[0], clientY: to[1], pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: to[0], clientY: to[1], pointerId: 1 });
  };
  const tap = (canvas: Element, at: [number, number]) => {
    fireEvent.pointerDown(canvas, { clientX: at[0], clientY: at[1], pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: at[0], clientY: at[1], pointerId: 1 });
  };

  it("calibra con una referencia, mide una distancia y muestra la leyenda con la advertencia", async () => {
    const user = userEvent.setup();
    const { canvas } = await open();
    await user.click(screen.getByRole("button", { name: "Regla" }));
    drag(canvas, [0, 200], [400, 200]); // sin escala todavía
    expect(within(screen.getByTestId("measure-legend")).getByText(/R1/)).toBeInTheDocument();
    expect(screen.getByText(/Sin escala/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Escala" }));
    drag(canvas, [0, 100], [200, 100]); // mitad del ancho = 600 px de la foto
    await user.type(await screen.findByLabelText("Medida real (mm)"), "26{Enter}");
    const legend = screen.getByTestId("measure-legend");
    expect(legend).toHaveTextContent("R1 · 5.2 cm"); // 1200 px × 26 mm / 600 px
    expect(legend).toHaveTextContent("Escala: 26 mm");
    expect(legend).toHaveTextContent("Estimación sobre la foto");
    expect(screen.queryByText(/Sin escala/)).toBeNull();
  });

  it("mide un ángulo con tres toques y un área con «Terminar área»", async () => {
    const user = userEvent.setup();
    const { canvas } = await open();
    await user.click(screen.getByRole("button", { name: "Ángulo" }));
    tap(canvas, [200, 100]); tap(canvas, [200, 200]); tap(canvas, [300, 200]);
    expect(screen.getByTestId("measure-legend")).toHaveTextContent(/A1 · 90/);

    await user.click(screen.getByRole("button", { name: "Área" }));
    tap(canvas, [50, 50]); tap(canvas, [150, 50]);
    expect(screen.queryByRole("button", { name: "Terminar área" })).toBeNull();
    tap(canvas, [150, 150]);
    await user.click(screen.getByRole("button", { name: "Terminar área" }));
    expect(screen.getByTestId("measure-legend")).toHaveTextContent(/Z1/);
  });

  it("los marcadores se numeran y guardan su nota; las guías se activan y desactivan", async () => {
    const user = userEvent.setup();
    const { canvas, onSave } = await open();
    await user.click(screen.getByRole("button", { name: "Marcador" }));
    tap(canvas, [100, 100]); tap(canvas, [300, 300]);
    const notes = screen.getAllByPlaceholderText("Nota (opcional)");
    expect(notes).toHaveLength(2);
    await user.type(notes[0], "línea frontal");
    await user.tab();

    const grid = screen.getByRole("button", { name: "Cuadrícula" });
    expect(grid).toHaveAttribute("aria-pressed", "false");
    await user.click(grid);
    expect(grid).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Línea media" }));
    await user.click(grid);
    expect(grid).toHaveAttribute("aria-pressed", "false");

    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string; text?: string }>;
    expect(saved.map((stroke) => stroke.type)).toEqual(["marker", "marker", "guide"]);
    expect(saved[0].text).toBe("línea frontal");
    expect(saved[2].text).toBe("midline");
  });
});
