import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const seg = vi.hoisted(() => ({ create: vi.fn(), run: vi.fn(), close: vi.fn() }));
vi.mock("@/lib/selfie-segmenter", () => ({ createSegmenter: seg.create }));

import { LanguageProvider } from "@/lib/language";
import { CameraModal } from "./camera-modal";

const W = 192;
const H = 256;
/** Persona bien encuadrada: cabeza que llena el óvalo, con cuello y hombros. */
function wellFramed(cx = 0.5) {
  const mask = new Uint8Array(W * H);
  const headW = 0.5;
  const headH = 0.62;
  const cy = 0.45;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const px = x / W, py = y / H;
    const inHead = ((px - cx) / (headW / 2)) ** 2 + ((py - cy) / (headH / 2)) ** 2 <= 1;
    const neckTop = cy + headH / 2 - 0.04;
    const inNeck = Math.abs(px - cx) <= headW * 0.2 && py >= neckTop && py <= neckTop + 0.12;
    const inShoulders = py >= neckTop + 0.1 && Math.abs(px - cx) <= headW * 1.3;
    if (inHead || inNeck || inShoulders) mask[y * W + x] = 255;
  }
  return { data: mask, width: W, height: H };
}

let getUserMedia: ReturnType<typeof vi.fn>;
const stop = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  stop.mockClear();
  seg.create.mockReset();
  seg.run.mockReset();
  seg.close.mockReset();
  seg.run.mockImplementation(async () => wellFramed());
  seg.create.mockResolvedValue({ run: seg.run, close: seg.close });
  getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1280 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 720 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 700 });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), clearRect: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,FOTO");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).videoWidth;
  delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).videoHeight;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

function renderModal(extra: Partial<React.ComponentProps<typeof CameraModal>> = {}) {
  const onCapture = vi.fn();
  render(<LanguageProvider><CameraModal title="Vista frontal" aspectRatio="3:4" guided onCapture={onCapture} onClose={vi.fn()} {...extra} /></LanguageProvider>);
  return { onCapture };
}

describe("cámara con guía automática", () => {
  it("starts with the front camera, shows the mirrored preview and asks to start (to allow the voice)", async () => {
    renderModal();
    expect(await screen.findByTestId("guide-intro")).toBeInTheDocument();
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ video: { facingMode: { ideal: "user" } } });
    expect(document.querySelector("video")).toHaveStyle({ transform: "scaleX(-1)" });
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeInTheDocument(); // el botón manual siempre está
  });

  it("explains the silent switch in the intro, and warns when the browser cannot speak", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal();
    expect(await screen.findByTestId("guide-step-2")).toHaveTextContent(/botón de silencio/);
    expect(screen.getByTestId("guide-step-3")).toHaveTextContent(/ahí comenzaré a hablarte/);
    expect(screen.queryByTestId("camera-frame")).toBeNull(); // fondo liso en el inicio: ningún marco rectangular
    expect(screen.getByTestId("guide-intro").className).toContain("bg-black");
    await user.click(screen.getByTestId("guide-start"));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByTestId("guide-no-voice")).toHaveTextContent(/no puede hablar/); // jsdom no trae speechSynthesis
  });

  it("for the top view asks to move the head (not the phone) and adds a step to the intro", async () => {
    seg.run.mockImplementation(async () => ({ data: new Uint8Array(W * H), width: W, height: H })); // nadie a la vista
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal({ guideKind: "top", aspectRatio: "4:3" });
    expect(await screen.findByTestId("guide-step-4")).toHaveTextContent(/baja la cabeza hasta que el celular vea la coronilla/);
    await user.click(screen.getByTestId("guide-start"));
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(screen.getByTestId("guide-message")).toHaveTextContent("Pon tu cara en el óvalo y baja la cabeza.");
  });

  it("guides, turns the oval green, counts down and takes the photo by itself", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCapture } = renderModal();
    await user.click(await screen.findByTestId("guide-start"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByTestId("guide-oval")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("camera-frame").className).not.toContain("border-2");
    expect(screen.getByTestId("camera-frame").querySelectorAll(".rounded-tl-2xl")).toHaveLength(0);
    expect(screen.getByTestId("guide-message")).toHaveTextContent("Perfecto. No te muevas.");
    await act(async () => { await vi.advanceTimersByTimeAsync(2800); });
    expect(screen.getByTestId("guide-count")).toBeInTheDocument();
    expect(onCapture).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(onCapture).toHaveBeenCalledWith("data:image/jpeg;base64,FOTO");
    expect(stop).toHaveBeenCalled();
  });

  it("tells the patient what to do while the head is not in the oval, and does not take the photo", async () => {
    seg.run.mockImplementation(async () => wellFramed(0.75)); // cabeza hacia la derecha del óvalo
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCapture } = renderModal();
    await user.click(await screen.findByTestId("guide-start"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByTestId("guide-oval")).toHaveAttribute("data-ok", "false");
    expect(screen.getByTestId("guide-message")).toHaveTextContent(/hacia tu (izquierda|derecha)/);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("in manual mode keeps the oval and turns it green when framed, without taking the photo by itself", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCapture } = renderModal();
    await user.click(await screen.findByTestId("guide-manual"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByTestId("guide-oval")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("guide-message")).toHaveTextContent("Ya puedes tomar la foto");
    expect(screen.getByTestId("camera-frame").className).not.toContain("border-2");
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(onCapture).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Tomar foto" }));
    expect(onCapture).toHaveBeenCalled();
  });

  it("falls back to the manual button, with a clear notice, when the guide cannot load", async () => {
    seg.create.mockResolvedValue(null);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCapture } = renderModal();
    await user.click(await screen.findByTestId("guide-start"));
    expect(await screen.findByTestId("guide-unavailable")).toHaveTextContent(/guía automática no está disponible/);
    expect(screen.getByTestId("guide-oval")).toHaveAttribute("data-ok", "false"); // el óvalo se mantiene, sin análisis
    await user.click(screen.getByRole("button", { name: "Tomar foto" }));
    expect(onCapture).toHaveBeenCalledWith("data:image/jpeg;base64,FOTO");
  });

  it("lets the patient skip the guide and take the photo themselves", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCapture } = renderModal();
    await user.click(await screen.findByTestId("guide-manual"));
    expect(screen.queryByTestId("guide-intro")).toBeNull();
    expect(seg.create).toHaveBeenCalled(); // en manual también se mira el encuadre (solo para el óvalo verde)
    await user.click(screen.getByRole("button", { name: "Tomar foto" }));
    expect(onCapture).toHaveBeenCalled();
  });

  it("without the guide it behaves as before: rear camera, no overlay", async () => {
    renderModal({ guided: false });
    await screen.findByRole("button", { name: "Tomar foto" });
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ video: { facingMode: { ideal: "environment" } } });
    expect(screen.queryByTestId("guide-intro")).toBeNull();
  });
});
