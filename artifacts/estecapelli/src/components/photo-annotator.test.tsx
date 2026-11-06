import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";
import { PhotoAnnotator } from "./photo-annotator";
import { faceGuideFromLandmarks } from "@/lib/face-turn";
import { proposedHairline } from "@/lib/hair-design";
import { faceGeometry } from "@/lib/hair-plan";

// La malla facial no corre en jsdom: se simula con los puntos de una cara de frente (o de lado, o ninguna).
const mesh = vi.hoisted(() => ({ landmarks: null as Array<{ x: number; y: number; z: number }> | null }));
vi.mock("@/lib/face-turn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/face-turn")>()),
  createFaceTurn: async () => ({ run: async () => 0, landmarks: async () => mesh.landmarks }),
}));
const faceMesh = (noseX = 0.5) => {
  const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (i: number, x: number, y: number) => { points[i] = { x, y, z: 0 }; };
  set(33, 0.38, 0.4); set(133, 0.46, 0.4); set(362, 0.54, 0.4); set(263, 0.62, 0.4);
  set(9, 0.5, 0.42); set(2, 0.5, 0.55); set(152, 0.5, 0.75); set(1, noseX, 0.52); set(234, 0.3, 0.5); set(454, 0.7, 0.5);
  return points;
};

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

  const open = async (specialty?: string) => {
    const onSave = vi.fn();
    render(<LanguageProvider><PhotoAnnotator photoUrl="x.jpg" label="Frente" initialStrokes={[]} saving={false} onSave={onSave} onClose={() => {}} specialty={specialty} /></LanguageProvider>);
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
    await user.click(screen.getByRole("tab", { name: "Medición" }));
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
    await user.click(screen.getByRole("tab", { name: "Medición" }));
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
    await user.click(screen.getByRole("tab", { name: "Medición" }));
    await user.click(screen.getByRole("button", { name: "Marcador" }));
    tap(canvas, [100, 100]); tap(canvas, [300, 300]);
    const notes = screen.getAllByPlaceholderText("Nota (opcional)");
    expect(notes).toHaveLength(2);
    await user.type(notes[0], "línea frontal");
    await user.tab();

    await user.click(screen.getByRole("tab", { name: "Vista" }));
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

  it("las herramientas capilares solo aparecen en la especialidad capilar", async () => {
    const user = userEvent.setup();
    await open();
    expect(screen.queryByRole("tab", { name: "Capilar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Realzar cuero cabelludo" })).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Vista" }));
    expect(screen.queryByRole("button", { name: "Realzar cuero cabelludo" })).toBeNull();
  });

  it("capilar: la zona donante lleva nombre y cm², la densidad cuenta por cm² y la clasificación queda en la foto", async () => {
    const user = userEvent.setup();
    const { canvas, onSave } = await open("capilar");
    // Escala: la mitad del ancho de la foto (600 px) = 26 mm.
    await user.click(screen.getByRole("tab", { name: "Medición" }));
    await user.click(screen.getByRole("button", { name: "Escala" }));
    drag(canvas, [0, 100], [200, 100]);
    await user.type(await screen.findByLabelText("Medida real (mm)"), "26{Enter}");

    await user.click(screen.getByRole("tab", { name: "Capilar" }));
    await user.click(screen.getByRole("button", { name: "Zona donante" }));
    tap(canvas, [50, 50]); tap(canvas, [150, 50]); tap(canvas, [150, 150]);
    await user.click(screen.getByRole("button", { name: "Terminar área" }));
    expect(screen.getByTestId("measure-legend")).toHaveTextContent(/Zona donante · .* cm²/);

    await user.click(screen.getByRole("button", { name: "Densidad (1 cm²)" }));
    tap(canvas, [300, 200]); // coloca el cuadro
    tap(canvas, [300, 200]); // primer folículo
    tap(canvas, [303, 203]); // segundo folículo
    expect(screen.getByTestId("measure-legend")).toHaveTextContent(/D1 · 2 conteo · 2\/cm²/);

    // Las escalas Norwood y Ludwig ya no están en el editor (el Norwood se elige en el formulario del diagnóstico).
    expect(screen.queryByRole("button", { name: "Norwood IIIv" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ludwig II" })).toBeNull();
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string; text?: string }>;
        expect(saved.find((stroke) => stroke.type === "area")?.text).toBe("Zona donante");
  });

  it("el realce del cuero cabelludo es solo de vista: avisa y no cambia los trazos", async () => {
    const user = userEvent.setup();
    await open("capilar");
    await user.click(screen.getByRole("tab", { name: "Vista" }));
    const enhance = screen.getByRole("button", { name: "Realzar cuero cabelludo" });
    await user.click(enhance);
    expect(enhance).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("enhance-note")).toHaveTextContent("Solo visualización");
  });

  it("guías faciales: calcula el eje y los tercios en el dispositivo, avisa si el rostro no está de frente y se quitan con el mismo botón", async () => {
    const user = userEvent.setup();
    const { canvas, onSave } = await open("capilar");
    await user.click(screen.getByRole("tab", { name: "Medición" }));
    await user.click(screen.getByRole("button", { name: "Escala" }));
    drag(canvas, [0, 100], [200, 100]);
    await user.type(await screen.findByLabelText("Medida real (mm)"), "26{Enter}");
    await user.click(screen.getByRole("tab", { name: "Vista" }));

    mesh.landmarks = null;
    await user.click(screen.getByRole("button", { name: "Guías faciales" }));
    expect(await screen.findByTestId("face-msg")).toHaveTextContent("No se detectó un rostro");

    mesh.landmarks = faceMesh(0.62);
    await user.click(screen.getByRole("button", { name: "Guías faciales" }));
    expect(await screen.findByTestId("face-msg")).toHaveTextContent("no está de frente");

    mesh.landmarks = faceMesh();
    await user.click(screen.getByRole("button", { name: "Guías faciales" }));
    expect(await screen.findByTestId("plan-legend")).toHaveTextContent(/Tercio medio: .* mm · Tercio inferior: .* · Altura sugerida/);
    expect(screen.getByRole("button", { name: "Guías faciales" })).toHaveAttribute("aria-pressed", "true");

    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string; points: number[][] }>;
    expect(saved.find((stroke) => stroke.type === "face")?.points).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "Guías faciales" }));
    expect(screen.queryByTestId("plan-legend")).toBeNull();
  });

  it("línea frontal: se dibuja a mano alzada, una sola por foto; con guías faciales mide su altura", async () => {
    const user = userEvent.setup();
    mesh.landmarks = faceMesh();
    const { canvas, onSave } = await open("capilar");
    await user.click(screen.getByRole("tab", { name: "Capilar" }));
    await user.click(screen.getByRole("button", { name: "Diseñar línea frontal" }));
    expect(screen.getByTestId("tool-hint")).toHaveTextContent("línea frontal propuesta");
    drag(canvas, [100, 150], [400, 150]);
    expect(screen.getByTestId("plan-legend")).toHaveTextContent("Activa las guías faciales");
    drag(canvas, [100, 120], [400, 120]);
    await user.click(screen.getByRole("tab", { name: "Vista" }));
    await user.click(screen.getByRole("button", { name: "Guías faciales" }));
    expect(await screen.findByText(/Línea frontal diseñada:/)).toBeInTheDocument();
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string }>;
    expect(saved.filter((stroke) => stroke.type === "hairline")).toHaveLength(1);
  });

  it("injertos: rellena las superficies desde las zonas medidas y recalcula al editar los valores", async () => {
    const user = userEvent.setup();
    const { canvas, onSave } = await open("capilar");
    await user.click(screen.getByRole("tab", { name: "Medición" }));
    await user.click(screen.getByRole("button", { name: "Escala" }));
    drag(canvas, [0, 100], [200, 100]);
    await user.type(await screen.findByLabelText("Medida real (mm)"), "26{Enter}");
    await user.click(screen.getByRole("tab", { name: "Capilar" }));
    await user.click(screen.getByRole("button", { name: "Zona receptora" }));
    tap(canvas, [50, 50]); tap(canvas, [250, 50]); tap(canvas, [250, 250]);
    await user.click(screen.getByRole("button", { name: "Terminar área" }));
    await user.click(screen.getByRole("button", { name: "Calcular injertos" }));
    const area = screen.getByLabelText("Zona receptora (cm²)") as HTMLInputElement;
    expect(Number(area.value)).toBeGreaterThan(0);
    expect(screen.getByText(/Las superficies salen de tus zonas medidas/)).toBeInTheDocument();
    const donor = screen.getByLabelText("Zona donante (cm²)");
    await user.clear(donor);
    await user.type(donor, "60{Enter}");
    expect(screen.getByTestId("graft-result")).toHaveTextContent(/Necesarias: \d+ UF · Disponibles: \d+ UF · Cobertura: \d+%/);
    await user.clear(screen.getByLabelText("Densidad de implante (UF/cm²)"));
    await user.type(screen.getByLabelText("Densidad de implante (UF/cm²)"), "9999{Enter}");
    expect(screen.getByLabelText("Densidad de implante (UF/cm²)")).toHaveValue("40");
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string; text?: string }>;
    expect(saved.find((stroke) => stroke.type === "graft")?.text).toMatch(/^ra=[\d.]+;id=40;da=60;dd=180;hpf=2.2;sf=25$/);
  });

  it("la consola de herramientas se puede ocultar para dejar la foto libre y vuelve al tocar una pestaña", async () => {
    const user = userEvent.setup();
    await open("capilar");
    const toggle = screen.getByRole("button", { name: "Ocultar herramientas" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Mostrar herramientas" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("tabpanel", { hidden: true })).toHaveClass("hidden");
    await user.click(screen.getByRole("tab", { name: "Medición" }));
    expect(screen.getByRole("button", { name: "Ocultar herramientas" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).not.toHaveClass("hidden");
  });

  it("las clínicas capilares abren en su pestaña; «Proponer diseño» dibuja línea, zona y escala, y los puntos se corrigen arrastrando", async () => {
    const user = userEvent.setup();
    mesh.landmarks = faceMesh();
    const { canvas, onSave } = await open("capilar");
    expect(screen.getByRole("tab", { name: "Capilar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tool-hint")).toHaveTextContent("Arrastra los puntos blancos");

    mesh.landmarks = faceMesh(0.62);
    await user.click(screen.getByRole("button", { name: "Proponer diseño" }));
    expect(await screen.findByTestId("face-msg")).toHaveTextContent("no está de frente");

    const down = faceMesh();
    down[152] = { x: 0.5, y: 0.553, z: 0 };
    mesh.landmarks = down;
    await user.click(screen.getByRole("button", { name: "Proponer diseño" }));
    expect(await screen.findByText(/agachado o levantado/)).toBeInTheDocument();

    mesh.landmarks = faceMesh();
    await user.click(screen.getByRole("button", { name: "Proponer diseño" }));
    expect(await screen.findByTestId("auto-scale")).toHaveTextContent("63 mm");
    expect(screen.getByTestId("plan-legend")).toHaveTextContent("Línea frontal diseñada");
    expect(screen.getByTestId("graft-result")).toHaveTextContent(/Necesarias: \d+ UF/);
    expect(screen.getByText(/Marca la zona donante/)).toBeInTheDocument();
    expect(screen.getByTestId("measure-legend")).toHaveTextContent(/Zona receptora · .* cm²/);

    // Arrastrar el punto central de la línea frontal cambia su altura en la leyenda; deshacer la devuelve.
    const g = faceGeometry(faceGuideFromLandmarks(faceMesh()).ok ? (faceGuideFromLandmarks(faceMesh()) as { points: Array<[number, number]> }).points : [], { width: 1200, height: 1600 })!;
    const center = proposedHairline(g, { width: 1200, height: 1600 })[4];
    const heightText = () => screen.getByTestId("plan-legend").textContent ?? "";
    const before = heightText();
    drag(canvas, [center[0] * 400, center[1] * 400], [center[0] * 400, center[1] * 400 - 40]);
    expect(heightText()).not.toBe(before);
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(heightText()).toBe(before);
    // La zona receptora comparte los puntos de la línea frontal: al mover uno, el otro lo sigue (el contorno sigue continuo).
    drag(canvas, [center[0] * 400, center[1] * 400], [center[0] * 400, center[1] * 400 - 40]);
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const moved = onSave.mock.calls.at(-1)![0] as Array<{ type: string; points: number[][] }>;
    const top = moved.find((stroke) => stroke.type === "hairline")!.points[4];
    expect(moved.find((stroke) => stroke.type === "area")!.points.some((p) => Math.abs(p[0] - top[0]) < 1e-3 && Math.abs(p[1] - top[1]) < 1e-3)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Deshacer" }));

    HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
    await user.click(screen.getByRole("button", { name: "Guardar dibujo" }));
    const saved = onSave.mock.calls[0][0] as Array<{ type: string }>;
    expect(saved.map((stroke) => stroke.type).sort()).toEqual(["area", "face", "graft", "hairline", "scale"]);
  });
});
