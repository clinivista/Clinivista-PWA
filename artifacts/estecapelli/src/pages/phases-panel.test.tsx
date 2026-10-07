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
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { PhasesPanel } from "./phases-panel";

const view = (id: string, label: string, hasPhotos = false, position = 0) => ({ id, key: id, label, position, hasPhotos });
const protocol = (canEdit: boolean) => ({
  canEdit,
  phases: [
    { id: "p1", key: "pre", name: "Pre-evaluación", position: 0, patientCaptured: true, views: [view("v1", "Frontal"), view("v2", "Vértex", true, 1)] },
    { id: "p2", key: "dx", name: "Diagnóstico", position: 1, patientCaptured: false, views: [view("v3", "Frontal")] },
    { id: "p3", key: "po", name: "Post-operatorio", position: 2, patientCaptured: false, views: [view("v4", "Frontal")] },
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

  it("sends renamed, added and removed phases and photos on save", async () => {
    const user = userEvent.setup();
    render(<PhasesPanel />);
    const save = screen.getByRole("button", { name: "Guardar fases" });
    expect(save).toBeDisabled();

    await user.clear(screen.getByLabelText("Nombre de la fase 2"));
    await user.type(screen.getByLabelText("Nombre de la fase 2"), "Diagnóstico y plan");
    await user.click(within(screen.getByRole("region", { name: "Fase 2" })).getByRole("button", { name: "Agregar fotografía" }));
    await user.type(screen.getByLabelText("Fotografía 2 de Diagnóstico y plan"), "Zona receptora");
    await user.click(screen.getByRole("button", { name: /Eliminar fase Post-operatorio/ }));
    await user.click(screen.getByRole("button", { name: /Agregar fase/ }));
    await user.type(screen.getByLabelText("Nombre de la fase 3"), "Control 12 meses");
    await user.type(screen.getByLabelText("Fotografía 1 de Control 12 meses"), "Frontal");

    await user.click(save);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save.mock.calls[0][0]).toEqual({
      data: {
        phases: [
          { id: "p1", name: "Pre-evaluación", views: [{ id: "v1", label: "Frontal" }, { id: "v2", label: "Vértex" }] },
          { id: "p2", name: "Diagnóstico y plan", views: [{ id: "v3", label: "Frontal" }, { label: "Zona receptora" }] },
          { name: "Control 12 meses", views: [{ label: "Frontal" }] },
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
    expect(within(screen.getByRole("region", { name: "Fase 2" })).getByRole("button", { name: "Quitar fotografía Frontal" })).toBeDisabled();
    confirm.mockRestore();
  });
});
