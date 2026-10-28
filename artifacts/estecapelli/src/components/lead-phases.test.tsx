import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ phases: [] as unknown[], remove: vi.fn(), invalidate: vi.fn() }));

vi.mock("@workspace/api-client-react", () => ({
  getGetLeadPhasesQueryKey: (id: string) => ["/api/leads", id, "phases"],
  useGetLeadPhases: () => ({ data: { phases: api.phases }, isLoading: false, isError: false }),
  useDeleteLeadPhasePhoto: () => ({ mutate: api.remove, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

vi.mock("@/components/diagnosis-panel", () => ({ DiagnosisPanel: ({ leadId }: { leadId: string }) => <div>panel-diagnostico-{leadId}</div> }));

import { LeadPhases } from "./lead-phases";

const view = (id: string, label: string, photoId?: string) => ({ id, key: id, label, required: true, photo: photoId ? { id: photoId } : null });
const phase = (id: string, name: string, over: Record<string, unknown>) => ({
  id, name, position: 0, patientCaptured: false, enabled: false, complete: false, views: [view(`${id}-a`, "Frontal"), view(`${id}-b`, "Vértex")], ...over,
});

describe("LeadPhases", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ id: "new" }), { status: 201 }));
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [view("p1-a", "Frontal", "f1")] }),
      phase("p2", "Diagnóstico", { enabled: true, views: [view("p2-a", "Frontal", "f2"), view("p2-b", "Vértex")] }),
      phase("p3", "Pre-operatorio", {}),
    ];
  });
  afterEach(() => fetchSpy.mockReset());

  it("shows the patient's phase as read-only, the open phase to capture, and locks the rest", () => {
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    expect(screen.getByText(/La toma el paciente/)).toBeInTheDocument();
    const open = screen.getByRole("listitem", { name: "Fase 2: Diagnóstico" });
    expect(within(open).getAllByRole("button", { name: /Tomar foto|Repetir/ })).toHaveLength(2);
    expect(within(open).getByText("1/2")).toBeInTheDocument();
    const locked = screen.getByRole("listitem", { name: "Fase 3: Pre-operatorio" });
    expect(within(locked).getByText("Se abre al completar «Diagnóstico».")).toBeInTheDocument();
    expect(within(locked).queryByRole("button")).not.toBeInTheDocument();
  });

  it("una vista de video se reproduce desde la ruta de video; grabar solo con el plan Titanium", () => {
    const video = { id: "vid1", mimeType: "video/mp4", durationMs: 12000, measurement: null };
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [view("p1-a", "Frontal", "f1")] }),
      phase("p2", "Control 1", { enabled: true, views: [{ ...view("p2-a", "Movilidad"), video: true, photo: video }, view("p2-b", "Frontal")] }),
    ];
    const { unmount } = render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const slot = screen.getByTestId("video-slot-p2-a");
    expect(within(slot).getByTestId("video-player")).toHaveAttribute("src", "/api/leads/lead-1/videos/vid1");
    expect(within(slot).getByTestId("video-player")).toHaveAttribute("controlslist", expect.stringContaining("nodownload"));
    expect(within(slot).getByTestId("video-player")).toHaveAttribute("preload", "metadata");
    expect(within(slot).getByTestId("video-plan-note")).toHaveTextContent("Disponible en el plan Titanium");
    expect(within(slot).queryByTestId("video-record-p2-a")).not.toBeInTheDocument();
    unmount();

    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} canRecordVideo />);
    expect(within(screen.getByTestId("video-slot-p2-a")).getByTestId("video-record-p2-a")).toHaveTextContent("Repetir video");
  });

  it("los videos que grabó el paciente se ven en su pre-evaluación", () => {
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [view("p1-a", "Frontal", "f1"), { ...view("p1-b", "Movimiento"), video: true, photo: { id: "pv1", mimeType: "video/webm", durationMs: null } }] }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    expect(within(screen.getByTestId("patient-videos")).getByTestId("video-player")).toHaveAttribute("src", "/api/leads/lead-1/videos/pv1");
  });

  it("ofrece medir con la moneda solo en las fotos marcadas para medir", () => {
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [{ ...view("p1-a", "Lesión", "f1"), measure: true, photo: { id: "f1", measurement: null } }, view("p1-b", "General", "f2")] }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    expect(screen.getAllByTestId("measure-open")).toHaveLength(1);
  });

  it("muestra cómo cambia la medida entre fases", () => {
    const measured = (id: string, mm: number) => ({ id, measurement: { lengthMm: mm, uncertaintyPct: 7, at: "2026-01-01T00:00:00Z", by: "patient" } });
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [{ ...view("p1-a", "Lesión", "f1"), measure: true, photo: measured("f1", 10) }] }),
      phase("p2", "Control 1", { enabled: true, views: [{ ...view("p2-a", "Lesión", "f2"), measure: true, photo: measured("f2", 15) }] }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const trend = screen.getByTestId("measure-trend");
    expect(within(trend).getAllByTestId("measure-trend-row")).toHaveLength(2);
    expect(trend).toHaveTextContent("primera medida");
    expect(trend).toHaveTextContent("aumentó 50 % (5,0 mm)");
  });

  it("pide la fecha y el ID de la atención en la fase abierta y los guarda", async () => {
    const user = userEvent.setup();
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, attentionRequired: false, attention: null, views: [view("p1-a", "Frontal", "f1")] }),
      phase("p2", "Diagnóstico", { enabled: true, attentionRequired: true, attention: null }),
      phase("p3", "Pre-operatorio", { attentionRequired: true, attention: null }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    expect(screen.queryByTestId("attention-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("attention-p3")).not.toBeInTheDocument();
    const form = screen.getByTestId("attention-p2");
    expect(within(form).getByText("Obligatoria para subir las fotografías de esta fase.")).toBeInTheDocument();
    const save = within(form).getByRole("button", { name: "Guardar atención" });
    expect(save).toBeDisabled();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await user.type(within(form).getByLabelText("Fecha de la atención"), "2026-02-10");
    await user.type(within(form).getByLabelText("ID de la atención"), "AG-4587");
    await user.click(save);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads/lead-1/phases/p2/attention");
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ date: "2026-02-10", agendaId: "AG-4587" }) });
    await waitFor(() => expect(api.invalidate).toHaveBeenCalled());
  });

  it("muestra lo ya registrado y quién lo hizo", () => {
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, attentionRequired: false, attention: null, views: [view("p1-a", "Frontal", "f1")] }),
      phase("p2", "Diagnóstico", { enabled: true, attentionRequired: true, attention: { date: "2026-02-10", agendaId: "AG-4587", byName: "Dra. Soto", at: "2026-02-10T12:00:00Z" } }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const form = screen.getByTestId("attention-p2");
    expect(within(form).getByLabelText("Fecha de la atención")).toHaveValue("2026-02-10");
    expect(within(form).getByLabelText("ID de la atención")).toHaveValue("AG-4587");
    expect(within(form).getByText("Registrado por Dra. Soto")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Guardar atención" })).toBeDisabled();
  });

  it("resalta solo la fase activa: las ejecutadas y las bloqueadas quedan con fondo blanco", () => {
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const done = screen.getByRole("listitem", { name: "Fase 1: Pre-evaluación" });
    const open = screen.getByRole("listitem", { name: "Fase 2: Diagnóstico" });
    const locked = screen.getByRole("listitem", { name: "Fase 3: Pre-operatorio" });
    expect(open).toHaveAttribute("aria-current", "step");
    expect(open.className).toContain("bg-[#E8F6F5]");
    for (const item of [done, locked]) {
      expect(item).not.toHaveAttribute("aria-current");
      expect(item.className).toContain("bg-white");
      expect(item.className).not.toContain("bg-[#E8F6F5]");
    }
  });

  it("uploads a chosen photo to the view and refreshes the phases", async () => {
    const user = userEvent.setup();
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const file = new File([new Uint8Array(100)], "foto.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Elegir archivo de Vértex"), file);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads/lead-1/views/p2-b/photo");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect((init as RequestInit).headers).toMatchObject({ "x-photo-source": "upload" });
    await waitFor(() => expect(api.invalidate).toHaveBeenCalled());
  });

  it("explains a server refusal instead of failing silently", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: "Completa la fase anterior antes de registrar esta." }), { status: 409 }));
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    await user.upload(screen.getByLabelText("Elegir archivo de Vértex"), new File([new Uint8Array(10)], "x.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Completa la fase anterior antes de registrar esta.", variant: "destructive" })));
  });

  it("asks before removing a photo", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Quitar foto de Frontal" }));
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Quitar foto de Frontal" }));
    expect(api.remove.mock.calls[0][0]).toEqual({ id: "lead-1", photoId: "f2" });
    confirm.mockRestore();
  });

  it("the diagnosis phase shows the doctor's panel instead of photo slots, and its state in the header", () => {
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true, views: [view("p1-a", "Frontal", "f1")] }),
      phase("p2", "Diagnóstico", { kind: "diagnosis", enabled: true, complete: false, views: [] }),
      phase("p3", "Pre-operatorio", {}),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} />);
    const item = screen.getByRole("listitem", { name: "Fase 2: Diagnóstico" });
    expect(within(item).getByText("panel-diagnostico-lead-1")).toBeInTheDocument();
    expect(within(item).getByText("Abierto")).toBeInTheDocument();
    expect(within(item).queryByRole("button", { name: /Tomar foto/ })).not.toBeInTheDocument();
  });

  it("ofrece omitir la etapa abierta (con motivo obligatorio) y muestra la omitida con quién y por qué", async () => {
    const user = userEvent.setup();
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, skipped: true, skip: { reason: "Trae fotos de otra clínica", byName: "Ana", at: "2026-10-01T12:00:00.000Z" } }),
      phase("p2", "Diagnóstico", { enabled: true, views: [view("p2-a", "Frontal"), view("p2-b", "Vértex")] }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "listo", isDoctor: false }} />);
    const skipped = screen.getByRole("listitem", { name: "Fase 1: Pre-evaluación" });
    expect(within(skipped).getAllByText("Omitida").length).toBeGreaterThan(0);
    expect(within(skipped).getByText(/Ana/)).toHaveTextContent("Trae fotos de otra clínica");
    expect(within(skipped).getByRole("button", { name: /Deshacer omisión/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Omitir etapa/ }));
    const confirm = screen.getByRole("button", { name: "Omitir etapa" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Motivo/), "Diagnóstico previo en papel");
    await user.click(confirm);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads/lead-1/phases/p2/skip");
    expect(init).toMatchObject({ method: "PUT" });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ reason: "Diagnóstico previo en papel" });
  });

  it("el alta médica solo la da un médico, después del diagnóstico, y se puede reabrir", async () => {
    const user = userEvent.setup();
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true }),
      phase("p2", "Diagnóstico", { enabled: true, kind: "diagnosis", complete: true }),
      phase("p3", "Pre-operatorio", { enabled: true }),
    ];
    const { rerender } = render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "contactar", isDoctor: false }} />);
    expect(screen.queryByRole("button", { name: /Dar alta médica/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Solo un médico/)).toBeInTheDocument();

    rerender(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "contactar", isDoctor: true }} />);
    await user.click(screen.getByRole("button", { name: /Dar alta médica/ }));
    await user.type(screen.getByLabelText(/Nota/), "Evolución favorable");
    await user.click(screen.getByRole("button", { name: "Confirmar alta médica" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/leads/lead-1/discharge");
    expect(JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body))).toEqual({ note: "Evolución favorable" });

    expect(screen.queryByRole("link", { name: /Informe de alta/ })).not.toBeInTheDocument();

    rerender(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "alta", isDoctor: true, dischargedByName: "Dra. Paz", dischargedAt: "2026-10-05T12:00:00.000Z" }} />);
    expect(screen.getByRole("button", { name: /Reabrir proceso/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Omitir etapa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Informe de alta \(PDF\)/ })).toHaveAttribute("href", "/api/leads/lead-1/discharge/pdf");

    // El informe de alta lo ve todo el equipo, no solo el médico; abrirlo no llama a la API de alta.
    rerender(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "alta", isDoctor: false, dischargedByName: "Dra. Paz", dischargedAt: "2026-10-05T12:00:00.000Z" }} />);
    expect(screen.getByRole("link", { name: /Informe de alta \(PDF\)/ })).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("button", { name: /Reabrir proceso/ })).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("antes del diagnóstico no ofrece el alta médica", () => {
    api.phases = [
      phase("p1", "Pre-evaluación", { patientCaptured: true, enabled: true, complete: true }),
      phase("p2", "Diagnóstico", { enabled: true, kind: "diagnosis" }),
    ];
    render(<LeadPhases leadId="lead-1" onExpand={vi.fn()} process={{ status: "listo", isDoctor: true }} />);
    expect(screen.queryByTestId("discharge-control")).not.toBeInTheDocument();
  });
});
