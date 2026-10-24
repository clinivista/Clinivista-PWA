import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({ status: undefined as unknown, invalidate: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: state.status }),
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { PhotoTranscription } from "./photo-transcription";

const status = (over: Record<string, unknown> = {}) => ({ available: true, monthlyQuota: 100, used: 10, remaining: 90, advancedEnabled: false, ...over });
const view = (transcription: Record<string, unknown> | null = null) =>
  ({ id: "v1", key: "ficha", label: "Ficha técnica", required: true, document: true, transcription, photo: { id: "ph1" } }) as never;
const saved = (over: Record<string, unknown> = {}) => ({ text: "Ficha técnica\nPaciente: Juan", tier: "basic", model: "m", byName: "Dra. Pérez", at: "2026-10-07T10:00:00Z", editedByName: null, editedAt: null, ...over });

describe("PhotoTranscription", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  beforeEach(() => {
    vi.clearAllMocks();
    state.status = status();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ text: "x" }), { status: 200 }));
  });
  afterEach(() => fetchSpy.mockReset());

  it("offers to transcribe, shows the remaining quota and calls the server", async () => {
    const user = userEvent.setup();
    render(<PhotoTranscription leadId="lead-1" view={view()} />);
    expect(screen.getByText("Te quedan 90 de 100 transcripciones este mes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transcribir" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/leads/lead-1/phase-photos/ph1/transcribe");
    expect(JSON.parse(String(init.body))).toEqual({ advanced: false });
  });

  it("with no quota left or no service, disables the button and offers typing by hand", () => {
    state.status = status({ remaining: 0, used: 100 });
    const { unmount } = render(<PhotoTranscription leadId="lead-1" view={view()} />);
    expect(screen.getByRole("button", { name: "Transcribir" })).toBeDisabled();
    expect(screen.getByText(/usó todas sus transcripciones/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escribir a mano" })).toBeEnabled();
    unmount();
    state.status = status({ available: false });
    render(<PhotoTranscription leadId="lead-1" view={view()} />);
    expect(screen.getByRole("button", { name: "Transcribir" })).toBeDisabled();
    expect(screen.getByText(/no está disponible/)).toBeInTheDocument();
  });

  it("shows the editable text with who transcribed it and saves the correction", async () => {
    const user = userEvent.setup();
    render(<PhotoTranscription leadId="lead-1" view={view(saved())} />);
    const box = screen.getByRole("textbox");
    expect(box).toHaveValue("Ficha técnica\nPaciente: Juan");
    expect(screen.getByText("Transcrito por Dra. Pérez")).toBeInTheDocument();
    expect(screen.getByText(/puede tener errores/)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Guardar texto" });
    expect(save).toBeDisabled();
    await user.type(box, " corregido");
    await user.click(save);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/leads/lead-1/phase-photos/ph1/transcription");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body)).text).toBe("Ficha técnica\nPaciente: Juan corregido");
  });

  it("the advanced retry needs the plan option, asks first and counts as an advanced call", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PhotoTranscription leadId="lead-1" view={view(saved())} />);
    expect(screen.queryByRole("button", { name: "Reintentar con modelo avanzado" })).not.toBeInTheDocument();
    expect(screen.getByText(/no está incluido en el plan/)).toBeInTheDocument();
    unmount();

    state.status = status({ advancedEnabled: true });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<PhotoTranscription leadId="lead-1" view={view(saved())} />);
    const retry = screen.getByRole("button", { name: "Reintentar con modelo avanzado" });
    await user.click(retry);
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(retry);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ advanced: true });
    confirm.mockRestore();
  });

  it("is read-only when the process is closed", () => {
    render(<PhotoTranscription leadId="lead-1" view={view(saved())} readOnly />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar texto" })).not.toBeInTheDocument();
  });
});
