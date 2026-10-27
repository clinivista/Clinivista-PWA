/**
 * Grabador de video: MediaRecorder y la cámara simulados (jsdom no tiene ninguno).
 * Comprueba la cuenta regresiva, el corte a los 20 s, que la cámara se apaga y
 * el respaldo de subir un archivo cuando el navegador no puede grabar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/language";
import { VideoRecorder } from "./video-recorder";

type FakeTrack = { stop: ReturnType<typeof vi.fn> };
let tracks: FakeTrack[];
let getUserMedia: ReturnType<typeof vi.fn>;

class FakeRecorder {
  static last: FakeRecorder | null = null;
  static isTypeSupported = (type: string) => type.startsWith("video/webm"); // como Chrome
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  options: { mimeType?: string; videoBitsPerSecond?: number };
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, options: { mimeType?: string; videoBitsPerSecond?: number }) {
    this.options = options;
    this.mimeType = options.mimeType ?? "video/webm";
    FakeRecorder.last = this;
  }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([new Uint8Array(2048)], { type: "video/webm" }) });
    this.onstop?.();
  }
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  window.localStorage.clear();
  tracks = [];
  getUserMedia = vi.fn(async () => {
    const track = { stop: vi.fn() };
    tracks.push(track);
    return { getTracks: () => [track] };
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(window, "MediaRecorder", { configurable: true, writable: true, value: FakeRecorder });
  FakeRecorder.last = null;
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const renderRecorder = (onUse = vi.fn(), onClose = vi.fn()) => {
  const utils = render(<LanguageProvider><VideoRecorder title="Video: Movilidad" onUse={onUse} onClose={onClose} /></LanguageProvider>);
  return { ...utils, onUse, onClose };
};

describe("VideoRecorder", () => {
  it("abre la cámara trasera a ~720p, cuenta 3-2-1, graba a 2,5 Mbps y se corta solo a los 20 s", async () => {
    vi.useFakeTimers();
    const { onUse } = renderRecorder();
    await flush();
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: false,
    });

    fireEvent.click(screen.getByTestId("video-start"));
    expect(screen.getByTestId("video-countdown")).toHaveTextContent("Empieza en 3");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("video-countdown")).toHaveTextContent("Empieza en 2");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(FakeRecorder.last?.state).toBe("recording");
    expect(FakeRecorder.last?.options).toEqual({ mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 2_500_000 });
    expect(screen.getByTestId("video-timer")).toHaveTextContent("/ 20 s");
    expect(screen.getByText(/Se detiene solo a los 20 segundos/)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(19_000); });
    expect(FakeRecorder.last?.state).toBe("recording");
    act(() => { vi.advanceTimersByTime(1_000); }); // 20 s: corte automático
    expect(FakeRecorder.last?.state).toBe("inactive");
    expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    expect(tracks[0].stop).toHaveBeenCalled(); // la cámara se apaga al terminar de grabar

    fireEvent.click(screen.getByTestId("video-use"));
    expect(onUse).toHaveBeenCalledTimes(1);
    const video = onUse.mock.calls[0][0];
    expect(video).toMatchObject({ type: "video/webm", source: "camera" });
    expect(video.blob.size).toBe(2048);
    expect(video.durationMs).toBeLessThanOrEqual(20_000);
  });

  it("detener a mano y volver a grabar reabre la cámara", async () => {
    vi.useFakeTimers();
    renderRecorder();
    await flush();
    fireEvent.click(screen.getByTestId("video-start"));
    act(() => { vi.advanceTimersByTime(3000 + 5000); });
    fireEvent.click(screen.getByTestId("video-stop"));
    expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("video-retake"));
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("video-start")).toBeInTheDocument();
  });

  it("apaga la cámara al cerrar o salir, y al cambiar de cámara usa la frontal", async () => {
    const { unmount } = renderRecorder();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar de cámara" }));
    await flush();
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({ video: expect.objectContaining({ facingMode: { ideal: "user" } }) }));
    expect(tracks[0].stop).toHaveBeenCalled();
    unmount();
    expect(tracks[1].stop).toHaveBeenCalled();
  });

  it("sin MediaRecorder lo dice claramente y solo acepta archivos MP4/WebM/MOV de hasta 25 MB", async () => {
    Object.defineProperty(window, "MediaRecorder", { configurable: true, writable: true, value: undefined });
    const { onUse } = renderRecorder();
    expect(screen.getByTestId("video-unavailable")).toHaveTextContent(/no puede grabar video/);
    expect(getUserMedia).not.toHaveBeenCalled();
    const input = screen.getByTestId("video-file") as HTMLInputElement;

    const big = new File([new Uint8Array(10)], "grande.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 25 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByText("El video debe pesar hasta 25 MB.")).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [new File([new Uint8Array(10)], "clip.avi", { type: "video/x-msvideo" })] } });
    expect(screen.getByText("El video debe ser MP4, WebM o MOV.")).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [new File([new Uint8Array(500)], "clip.mov", { type: "video/quicktime" })] } });
    expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("video-use"));
    expect(onUse.mock.calls[0][0]).toMatchObject({ type: "video/quicktime", source: "upload", durationMs: null });
  });

  it("si la cámara no se puede abrir lo explica y ofrece subir un archivo", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    renderRecorder();
    await flush();
    expect(screen.getByTestId("video-unavailable")).toHaveTextContent(/No pudimos usar la cámara/);
    expect(screen.getByRole("button", { name: "Subir un archivo de video" })).toBeInTheDocument();
  });
});
