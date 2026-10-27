/** Tarjeta de video de la pre-evaluación: sube el video como borrador, lo confirma y avisa al flujo. Datos ficticios. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/language";
import { PatientVideoCard } from "./patient-video-card";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  // Navegador sin MediaRecorder: se usa el respaldo de subir un archivo.
  Object.defineProperty(window, "MediaRecorder", { configurable: true, writable: true, value: undefined });
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/videos")) return new Response(JSON.stringify({ id: "vid-1", status: "draft" }), { status: 201, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ id: "vid-1", status: "confirmed" }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("PatientVideoCard", () => {
  it("sube el video a la vista de la pre-evaluación, lo confirma y lo marca como hecho", async () => {
    const onSaved = vi.fn();
    render(<LanguageProvider><PatientVideoCard viewKey="movilidad" title="Movilidad" photoOfLabel="Foto 2 de 5" token="tok-123" saved={null} onSaved={onSaved} /></LanguageProvider>);
    expect(screen.getByText(/Graba un video corto \(hasta 20 segundos\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("patient-video-record-movilidad"));
    fireEvent.change(screen.getByTestId("video-file"), { target: { files: [new File([new Uint8Array(300)], "clip.mp4", { type: "video/mp4" })] } });
    fireEvent.click(screen.getByTestId("video-use"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("movilidad", { id: "vid-1", mimeType: "video/mp4", durationMs: null }));
    const [uploadUrl, upload] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(uploadUrl).toBe("/api/patients/tok-123/videos");
    expect(upload.headers).toMatchObject({ "Content-Type": "video/mp4", "x-photo-key": "movilidad", "x-photo-source": "upload" });
    expect(String(fetchSpy.mock.calls[1][0])).toBe("/api/patients/tok-123/photos/vid-1/confirm");
    expect(screen.queryByTestId("video-recorder")).not.toBeInTheDocument();
  });

  it("muestra el error del servidor (p. ej. la clínica no tiene el plan)", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: "El video por fotografía está disponible solo en el plan Titanium." }), { status: 403, headers: { "Content-Type": "application/json" } }));
    render(<LanguageProvider><PatientVideoCard viewKey="movilidad" title="Movilidad" photoOfLabel="Foto 2 de 5" token="tok-123" saved={null} onSaved={vi.fn()} /></LanguageProvider>);
    fireEvent.click(screen.getByTestId("patient-video-record-movilidad"));
    fireEvent.change(screen.getByTestId("video-file"), { target: { files: [new File([new Uint8Array(300)], "clip.mp4", { type: "video/mp4" })] } });
    fireEvent.click(screen.getByTestId("video-use"));
    expect(await screen.findByText(/solo en el plan Titanium/)).toBeInTheDocument();
  });
});
