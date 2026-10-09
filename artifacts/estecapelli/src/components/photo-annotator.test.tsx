import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
