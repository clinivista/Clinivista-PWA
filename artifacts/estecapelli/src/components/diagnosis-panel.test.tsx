import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  state: undefined as unknown,
  save: vi.fn(), close: vi.fn(), reopen: vi.fn(), markup: vi.fn(), remove: vi.fn(),
  setQueryData: vi.fn(), invalidate: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetLeadDiagnosisQueryKey: (id: string) => ["/api/leads", id, "diagnosis"],
  getGetLeadPhasesQueryKey: (id: string) => ["/api/leads", id, "phases"],
  useGetLeadDiagnosis: () => ({ data: api.state, isLoading: false, isError: false }),
  useSaveLeadDiagnosis: () => ({ mutate: api.save, isPending: false }),
  useCloseLeadDiagnosis: () => ({ mutate: api.close, isPending: false }),
  useReopenLeadDiagnosis: () => ({ mutate: api.reopen, isPending: false }),
  useSaveLeadPhotoAnnotation: () => ({ mutate: api.markup, isPending: false }),
  useDeleteLeadPhotoAnnotation: () => ({ mutate: api.remove, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: api.setQueryData, invalidateQueries: api.invalidate }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/photo-annotator", () => ({
  PhotoAnnotator: ({ label, onSave, onClose }: { label: string; onSave: (s: unknown[], i: string) => void; onClose: () => void }) => (
    <div role="dialog" aria-label={`Anotar ${label}`}>
      <button onClick={() => onSave([{ type: "pen" }], "data:image/jpeg;base64,AAAA")}>guardar-mock</button>
      <button onClick={onClose}>cerrar-mock</button>
    </div>
  ),
}));

import { DiagnosisPanel } from "./diagnosis-panel";

const photo = (id: string, label: string, over: Record<string, unknown> = {}) => ({
  photoId: id, viewKey: id, label, note: null, width: 100, height: 100, hasAnnotation: false, annotationUpdatedAt: null, strokes: [], ...over,
});
const state = (over: Record<string, unknown> = {}) => ({
  phaseId: "p2", status: "draft", responseText: "", closedAt: null, closedByName: null, readyToDiagnose: true, canEdit: true,
  photos: [photo("a", "Vista frontal", { note: "Me duele al peinarme" }), photo("b", "Zona donante", { hasAnnotation: true, annotationUpdatedAt: "2026-01-01T00:00:00Z" })],
  events: [], ...over,
});

describe("DiagnosisPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.state = state();
  });

  it("shows the patient's photos and notes, and a drawing where there is one", () => {
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    expect(screen.getByText("Me duele al peinarme")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Zona donante" })).toHaveAttribute("src", expect.stringContaining("/api/leads/l1/photos/b/annotation?v="));
    expect(screen.getByRole("img", { name: "Vista frontal" })).toHaveAttribute("src", "/api/leads/l1/photos/a");
    expect(screen.getByText("Vista frontal")).toBeInTheDocument();
    expect(screen.getByText(/Zona donante · con dibujo/)).toBeInTheDocument();
  });

  it("lets the médico mark up a photo and sends the vector strokes with the composed image", async () => {
    const user = userEvent.setup();
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Anotar Vista frontal" }));
    await user.click(screen.getByRole("button", { name: "guardar-mock" }));
    expect(api.markup.mock.calls[0][0]).toEqual({ id: "l1", photoId: "a", data: { image: "data:image/jpeg;base64,AAAA", strokes: [{ type: "pen" }] } });
  });

  it("saves a draft and closes the diagnosis after confirming", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    const close = screen.getByRole("button", { name: /Cerrar diagnóstico/ });
    expect(close).toBeDisabled(); // nothing written yet
    await user.type(screen.getByLabelText("Respuesta para el paciente"), "Candidato a injerto");
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(api.save.mock.calls[0][0]).toEqual({ id: "l1", data: { responseText: "Candidato a injerto" } });
    await user.click(close);
    expect(api.close).not.toHaveBeenCalled(); // declined the confirmation
    await user.click(close);
    expect(api.close.mock.calls[0][0]).toEqual({ id: "l1", data: { responseText: "Candidato a injerto" } });
    confirm.mockRestore();
  });

  it("closed: read-only, no drawing tools, and can be reopened after confirming", async () => {
    const user = userEvent.setup();
    api.state = state({ status: "closed", responseText: "Candidato a injerto.", closedByName: "Dra. Ana", closedAt: "2026-02-01T12:00:00Z" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    expect(screen.getByText(/Cerrado por Dra. Ana/)).toBeInTheDocument();
    expect(screen.getByLabelText("Respuesta para el paciente")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: /Anotar|Editar dibujo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar diagnóstico/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reabrir diagnóstico/ }));
    expect(api.reopen.mock.calls[0][0]).toEqual({ id: "l1" });
    confirm.mockRestore();
  });

  it("a non-médico only reads: no editing and no buttons", () => {
    api.state = state({ canEdit: false });
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    expect(screen.getByText(/Solo el médico puede editar/)).toBeInTheDocument();
    expect(screen.getByLabelText("Respuesta para el paciente")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: /Anotar|Guardar borrador|Cerrar diagnóstico/ })).not.toBeInTheDocument();
  });

  it("cannot be closed until the patient finishes the pre-evaluation, and lists the record", async () => {
    const user = userEvent.setup();
    api.state = state({ readyToDiagnose: false, events: [{ action: "closed", actorName: "Dra. Ana", createdAt: "2026-02-01T12:00:00Z" }] });
    render(<DiagnosisPanel leadId="l1" onExpand={vi.fn()} />);
    expect(screen.getByText(/aún no completa su pre-evaluación/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Respuesta para el paciente"), "x");
    expect(screen.getByRole("button", { name: /Cerrar diagnóstico/ })).toBeDisabled();
    expect(screen.getByText("Registro (1)")).toBeInTheDocument();
  });
});
