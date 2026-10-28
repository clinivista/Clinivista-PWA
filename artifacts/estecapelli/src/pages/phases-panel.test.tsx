import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  protocol: undefined as unknown,
  save: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetClinicProtocolQueryKey: () => ["/api/clinic/protocol"],
  useGetClinicProtocol: () => ({ data: api.protocol, isLoading: false, isError: false }),
  useUpdateClinicProtocol: () => ({ mutate: api.save, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }), useQuery: () => ({ data: undefined }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { PhasesPanel } from "./phases-panel";

const view = (id: string, label: string, hasPhotos = false, position = 0) => ({ id, key: id, label, position, hasPhotos, document: false, measure: false });
const protocol = (canEdit: boolean) => ({
  canEdit,
  phases: [
    { id: "p1", key: "pre", name: "Pre-evaluación", position: 0, patientCaptured: true, views: [view("v1", "Frontal"), view("v2", "Vértex", true, 1)] },
    { id: "p2", key: "dx", name: "Diagnóstico", position: 1, kind: "diagnosis", patientCaptured: false, views: [] },
    { id: "p3", key: "po", name: "Post-operatorio", position: 2, kind: "capture", patientCaptured: false, views: [view("v4", "Frontal")] },
    { id: "p4", key: "c1", name: "Control médico 1", position: 3, kind: "capture", patientCaptured: false, views: [view("v5", "Frontal")] },
  ],
});

describe("PhasesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.protocol = protocol(true);
  });

  it("shows every phase with its photos; the first is the patient's and cannot be moved or removed", () => {
    render(<PhasesPanel />);
    expect(screen.getByLabelText("Nombre de la fase 1")).toHaveValue("Pre-evaluación");
    expect(screen.getByLabelText("Nombre de la fase 3")).toHaveValue("Post-operatorio");
    expect(screen.getByText(/La toma el paciente/)).toBeInTheDocument();
    const first = screen.getByRole("region", { name: "Fase 1" });
    expect(within(first).queryByRole("button", { name: /Eliminar fase/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Fase 2" })).getByRole("button", { name: "Subir fase" })).toBeDisabled();
  });

  it("is read-only for anyone but the legal representative", () => {
    api.protocol = protocol(false);
    render(<PhasesPanel />);
    expect(screen.getByText(/Solo el representante legal/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la fase 2")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar fases" })).not.toBeInTheDocument();
  });

  it("the diagnosis phase is the doctor's: no photo list and it cannot be removed", () => {
    render(<PhasesPanel />);
    const diagnosis = screen.getByRole("region", { name: "Fase 2" });
    expect(within(diagnosis).getByText(/El médico anota las fotografías del paciente/)).toBeInTheDocument();
    expect(within(diagnosis).queryByRole("button", { name: /Eliminar fase/ })).not.toBeInTheDocument();
    expect(within(diagnosis).queryByRole("button", { name: "Agregar fotografía" })).not.toBeInTheDocument();
  });

  it("sends renamed, added and removed phases and photos on save", async () => {
    const user = userEvent.setup();
    render(<PhasesPanel />);
    const save = screen.getByRole("button", { name: "Guardar fases" });
    expect(save).toBeDisabled();

    await user.clear(screen.getByLabelText("Nombre de la fase 3"));
    await user.type(screen.getByLabelText("Nombre de la fase 3"), "Post-op y plan");
    await user.click(within(screen.getByRole("region", { name: "Fase 3" })).getByRole("button", { name: "Agregar fotografía" }));
    await user.type(screen.getByLabelText("Fotografía 2 de Post-op y plan"), "Zona receptora");
    await user.click(screen.getByRole("button", { name: /Eliminar fase Control médico 1/ }));
    await user.click(screen.getByRole("button", { name: /Agregar fase/ }));
    await user.type(screen.getByLabelText("Nombre de la fase 4"), "Control 12 meses");
    await user.type(screen.getByLabelText("Fotografía 1 de Control 12 meses"), "Frontal");

    await user.click(save);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save.mock.calls[0][0]).toEqual({
      data: {
        phases: [
          { id: "p1", name: "Pre-evaluación", views: [{ id: "v1", label: "Frontal", document: false, measure: false, video: false }, { id: "v2", label: "Vértex", document: false, measure: false, video: false }] },
          { id: "p2", name: "Diagnóstico", views: [] },
          { id: "p3", name: "Post-op y plan", views: [{ id: "v4", label: "Frontal", document: false, measure: false, video: false }, { label: "Zona receptora", document: false, measure: false, video: false }] },
          { name: "Control 12 meses", views: [{ label: "Frontal", document: false, measure: false, video: false }] },
        ],
      },
    });
  });

  it("asks before removing a photo that already has images, and keeps at least one photo per phase", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PhasesPanel />);
    await user.click(screen.getByRole("button", { name: "Quitar fotografía Vértex" }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("Fotografía 2 de Pre-evaluación")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Fase 3" })).getByRole("button", { name: "Quitar fotografía Frontal" })).toBeDisabled();
    confirm.mockRestore();
  });

  it("marks a photo as a document so staff can transcribe it", async () => {
    const user = userEvent.setup();
    render(<PhasesPanel />);
    const box = within(screen.getByRole("region", { name: "Fase 3" })).getByRole("checkbox", { name: "Es un documento: Frontal" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Guardar fases" }));
    const sent = api.save.mock.calls[0][0].data.phases as Array<{ views: Array<{ label: string; document: boolean }> }>;
    expect(sent[2].views[0]).toMatchObject({ id: "v4", document: true });
    expect(sent[0].views.every((v) => v.document === false)).toBe(true);
  });

  it("marca una fotografía para medir la lesión con una moneda de referencia", async () => {
    const user = userEvent.setup();
    render(<PhasesPanel />);
    const box = within(screen.getByRole("region", { name: "Fase 1" })).getByRole("checkbox", { name: "Medir la lesión: Frontal" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Guardar fases" }));
    const sent = api.save.mock.calls[0][0].data.phases as Array<{ views: Array<{ measure: boolean; document: boolean }> }>;
    expect(sent[0].views[0]).toMatchObject({ id: "v1", measure: true, document: false });
    expect(sent[0].views[1].measure).toBe(false);
  });

  describe("casilla «Video» (plan Titanium)", () => {
    it("fuera de Titanium se ve deshabilitada con «Disponible en el plan Titanium»", () => {
      api.protocol = { ...protocol(true), plan: "basic", features: [] };
      render(<PhasesPanel />);
      const box = screen.getAllByLabelText("Grabar video: Frontal", { selector: "input" })[0] as HTMLInputElement;
      expect(box).toBeDisabled();
      expect(box).toHaveAccessibleDescription(/Disponible en el plan Titanium/);
      expect(screen.getAllByText(/Disponible en el plan Titanium/).length).toBeGreaterThan(0);
    });

    it("con Titanium se marca, desmarca documento y medir, y se envía al guardar", async () => {
      api.protocol = { ...protocol(true), plan: "titanium", features: ["video"] };
      const user = userEvent.setup();
      render(<PhasesPanel />);
      await user.click(screen.getAllByLabelText("Medir la lesión: Frontal", { selector: "input" })[0]);
      const video = screen.getAllByLabelText("Grabar video: Frontal", { selector: "input" })[0] as HTMLInputElement;
      expect(video).toBeEnabled();
      await user.click(video);
      expect(video).toBeChecked();
      expect(screen.getAllByLabelText("Medir la lesión: Frontal", { selector: "input" })[0]).not.toBeChecked();
      // Marcar documento desmarca el video.
      await user.click(screen.getAllByLabelText("Es un documento: Frontal", { selector: "input" })[0]);
      expect(video).not.toBeChecked();
      await user.click(video);
      await user.click(screen.getByRole("button", { name: "Guardar fases" }));
      const sent = api.save.mock.calls[0][0].data.phases as Array<{ views: Array<{ video: boolean; document: boolean; measure: boolean }> }>;
      expect(sent[0].views[0]).toMatchObject({ id: "v1", video: true, document: false, measure: false });
    });

    it("si la clínica bajó de plan avisa y deja desmarcar (no marcar) las vistas de video", async () => {
      const p = protocol(true);
      p.phases[2].views[0] = { ...p.phases[2].views[0], video: true } as typeof p.phases[2]["views"][0];
      api.protocol = { ...p, plan: "basic", features: [] };
      render(<PhasesPanel />);
      expect(screen.getByTestId("video-plan-lost")).toHaveTextContent(/ya no incluye video/);
      const boxes = screen.getAllByTestId("video-checkbox") as HTMLInputElement[];
      expect(boxes.filter((box) => box.checked)).toHaveLength(1);
      expect(boxes.find((box) => box.checked)).toBeEnabled();
      expect(boxes.filter((box) => !box.checked).every((box) => box.disabled)).toBe(true);
    });
  });
});
