import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false, isError: false, send: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({
  useGetLeadEvolution: () => ({ data: api.data, isLoading: api.isLoading, isError: api.isError }),
  useSendLeadEvolution: () => ({ mutate: api.send, isPending: false }),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { LanguageProvider } from "@/lib/language";
import { LeadEvolution } from "./lead-evolution";

const cell = (phaseKey: string, phaseName: string, viewKey: string, label: string, photoId: string, over: Record<string, unknown> = {}) => ({
  phaseKey, phaseName, phaseKind: phaseKey === "diagnostico" ? "diagnosis" : "capture", viewKey, viewLabel: label, photoId, edited: false, createdAt: "2026-03-01T12:00:00.000Z", ...over,
});
const evolution = (over: Record<string, unknown> = {}) => ({
  phases: [
    { key: "preevaluacion", name: "Pre-evaluación", kind: "capture" },
    { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis" },
    { key: "preoperatorio", name: "Pre-operatorio", kind: "capture" },
  ],
  zones: [
    { key: "frontal", label: "Vista frontal", cells: [
      cell("preevaluacion", "Pre-evaluación", "frontal", "Vista frontal", "p1"),
      cell("diagnostico", "Diagnóstico", "frontal", "Vista frontal", "p1", { edited: true }),
      cell("preoperatorio", "Pre-operatorio", "preoperatorio-frontal", "Vista frontal", "p3"),
    ] },
    { key: "donor", label: "Zona donante", cells: [
      cell("preevaluacion", "Pre-evaluación", "donor", "Zona donante", "p2"),
      cell("preoperatorio", "Pre-operatorio", "preoperatorio-donor", "Zona donante", "p4"),
    ] },
  ],
  patientEmail: "ana@example.com",
  emailConfigured: true,
  ...over,
});

const renderIt = (onExpand = vi.fn()) => render(<LanguageProvider><LeadEvolution leadId="l1" onExpand={onExpand} /></LanguageProvider>);

beforeEach(() => {
  api.data = evolution(); api.isLoading = false; api.isError = false;
  api.send.mockReset(); toast.mockReset();
});

describe("Evolución en la ficha del paciente", () => {
  it("muestra la misma zona fase por fase, con la foto editada en el diagnóstico", () => {
    renderIt();
    const list = screen.getByRole("list", { name: "Fotos de la zona por fase" });
    const cells = within(list).getAllByRole("listitem");
    expect(cells.map((c) => c.getAttribute("data-testid"))).toEqual(["evolution-cell-preevaluacion", "evolution-cell-diagnostico", "evolution-cell-preoperatorio"]);
    const images = within(list).getAllByRole("img") as HTMLImageElement[];
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      "/api/leads/l1/photos/p1", "/api/leads/l1/photos/p1/annotation", "/api/leads/l1/photos/p3",
    ]);
    expect(within(cells[1]).getByText("Editada por el equipo")).toBeInTheDocument();
  });

  it("cambia de zona; sin dibujo no hay columna de diagnóstico", async () => {
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole("button", { name: /Zona donante/ }));
    const list = screen.getByRole("list", { name: "Fotos de la zona por fase" });
    expect(within(list).getAllByRole("listitem").map((c) => c.getAttribute("data-testid"))).toEqual(["evolution-cell-preevaluacion", "evolution-cell-preoperatorio"]);
  });

  it("una fase sin foto en esa zona queda marcada y la foto se amplía al tocarla", async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    api.data = evolution({ zones: [{ key: "donor", label: "Zona donante", cells: [
      { ...cell("preevaluacion", "Pre-evaluación", "donor", "Zona donante", "p2") },
      { ...cell("preoperatorio", "Pre-operatorio", "preoperatorio-donor", "Zona donante", "p4") },
    ] }], phases: [
      { key: "preevaluacion", name: "Pre-evaluación", kind: "capture" },
      { key: "preoperatorio", name: "Pre-operatorio", kind: "capture" },
      { key: "postoperatorio", name: "Post-operatorio", kind: "capture" },
    ] });
    renderIt(onExpand);
    expect(within(screen.getByTestId("evolution-cell-postoperatorio")).getByText("Sin foto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ampliar: Pre-operatorio" }));
    expect(onExpand).toHaveBeenCalledWith("/api/leads/l1/photos/p4");
  });

  it("exporta el PDF de todas las zonas o solo de la que se está viendo", async () => {
    const user = userEvent.setup();
    renderIt();
    const pdf = () => screen.getByRole("link", { name: /Exportar PDF/ });
    expect(pdf()).toHaveAttribute("href", "/api/leads/l1/evolution/pdf");
    await user.click(screen.getByRole("button", { name: /Zona donante/ }));
    await user.click(screen.getByRole("radio", { name: "Solo esta zona" }));
    expect(pdf()).toHaveAttribute("href", "/api/leads/l1/evolution/pdf?zones=donor");
  });

  it("envía por correo al paciente por defecto o a otra dirección, validándola", async () => {
    const user = userEvent.setup();
    renderIt();
    const input = screen.getByLabelText("Correo de destino");
    expect(input).toHaveValue("ana@example.com");
    const send = screen.getByRole("button", { name: /Enviar por correo/ });
    await user.click(send);
    expect(api.send).toHaveBeenCalledWith({ id: "l1", data: { email: "ana@example.com", zones: [] } }, expect.anything());

    await user.clear(input);
    await user.type(input, "no-es-correo");
    expect(send).toBeDisabled();
    expect(screen.getByText("Escribe un correo válido.")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "administracion@clinica.cl");
    await user.click(screen.getByRole("radio", { name: "Solo esta zona" }));
    await user.click(send);
    expect(api.send).toHaveBeenLastCalledWith({ id: "l1", data: { email: "administracion@clinica.cl", zones: ["frontal"] } }, expect.anything());
  });

  it("avisa cuando el correo no está configurado y cuando aún no hay nada que comparar", () => {
    api.data = evolution({ emailConfigured: false, zones: [{ key: "frontal", label: "Vista frontal", cells: [cell("preevaluacion", "Pre-evaluación", "frontal", "Vista frontal", "p1")] }] });
    renderIt();
    expect(screen.getByText("El envío de correos aún no está configurado en el servidor.")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay una zona con fotos de dos fases.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar por correo/ })).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Exportar PDF/ })).not.toBeInTheDocument();
  });

  it("sin fotos muestra el estado vacío", () => {
    api.data = evolution({ zones: [], phases: [] });
    renderIt();
    expect(screen.getByText("Aún no hay fotografías para comparar.")).toBeInTheDocument();
  });
});
