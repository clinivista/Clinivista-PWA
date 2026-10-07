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
});
