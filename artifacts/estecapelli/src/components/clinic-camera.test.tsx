import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/selfie-segmenter", () => ({ createSegmenter: vi.fn(async () => ({ run: async () => null, close: () => undefined })) }));
vi.mock("@/lib/face-turn", () => ({ createFaceTurn: vi.fn(async () => ({ run: async () => 0.5 })), faceTurnProblem: async () => "" }));

import { LanguageProvider } from "@/lib/language";
import { ClinicCamera } from "./clinic-camera";
import { readGuidePref, usesAppCamera } from "@/lib/clinic-camera";

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: () => undefined }] }));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 700 });
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

const renderCamera = (viewKey: string) =>
  render(<LanguageProvider><ClinicCamera viewKey={viewKey} title="Vista" onCapture={vi.fn()} onClose={vi.fn()} /></LanguageProvider>);

describe("cámara de la clínica", () => {
  it("las cuatro vistas capilares parten guiadas (óvalo y voz), con la cámara trasera, el interruptor y el isotipo", async () => {
    const user = userEvent.setup();
    renderCamera("frontal");
    expect(await screen.findByTestId("guide-intro")).toBeInTheDocument();
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ video: { facingMode: { ideal: "environment" } } });
    expect(await screen.findByAltText("")).toBeInTheDocument(); // isotipo (decorativo)
    const toggle = screen.getByTestId("camera-guide-toggle");
    expect(toggle).toHaveTextContent("Guía: activada");

    await user.click(toggle);
    expect(screen.queryByTestId("guide-intro")).toBeNull();
    expect(screen.getByTestId("camera-guide-toggle")).toHaveTextContent("Guía: desactivada");
    expect(readGuidePref()).toBe(false);
  });

  it("recuerda que el personal apagó la guía", async () => {
    window.localStorage.setItem("clinivista.clinicCameraGuide", "off");
    renderCamera("vertex");
    expect(await screen.findByTestId("camera-guide-toggle")).toHaveTextContent("Guía: desactivada");
    expect(screen.queryByTestId("guide-intro")).toBeNull();
  });

  it("la zona donante va sin óvalo ni interruptor, pero con el isotipo; las demás vistas siguen con la cámara nativa", async () => {
    renderCamera("donor");
    expect(await screen.findByTestId("camera-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-guide-toggle")).toBeNull();
    expect(screen.queryByTestId("guide-intro")).toBeNull();
    expect(usesAppCamera("donor")).toBe(true);
    expect(usesAppCamera("lesion-1")).toBe(false);
  });
});
