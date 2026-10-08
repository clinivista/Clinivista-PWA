import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ report: undefined as unknown, save: vi.fn(), send: vi.fn() }));

vi.mock("@workspace/api-client-react", () => ({
  getGetClinicReportQueryKey: () => ["/api/clinic/report"],
  useGetClinicReport: () => ({ data: api.report, isLoading: false }),
  useUpdateClinicReport: () => ({ mutate: api.save, isPending: false }),
  useSendClinicReport: () => ({ mutate: api.send, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { ReportPanel } from "./report-panel";

const report = (canEdit: boolean, overrides = {}) => ({
  canEdit,
  mailConfigured: true,
  config: { enabled: true, recipients: ["jefe@clinica.cl"], frequency: "weekly", weekday: 1, hour: 8, skipWhenEmpty: true, lastSentAt: null, lastError: null, ...overrides },
  pending: [
    { leadId: "l1", name: "Ana Pérez", documentId: "11.111.111-1", phone: "", waitingDays: 9, link: "x" },
    { leadId: "l2", name: "Luis Soto", documentId: "", phone: "", waitingDays: 0, link: "y" },
  ],
});

describe("ReportPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); api.report = report(true); });

  it("lists the pending patients and opens the chosen one", async () => {
    const onOpen = vi.fn();
    render(<ReportPanel onOpenLead={onOpen} />);
    expect(screen.getByText("Pendientes de diagnóstico (2)")).toBeInTheDocument();
    expect(screen.getByText(/esperando hace 9 días/)).toBeInTheDocument();
    expect(screen.getByText(/esperando hoy/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Diagnosticar" })[0]);
    expect(onOpen).toHaveBeenCalledWith("l1");
  });

  it("the legal representative edits recipients and schedule and saves them", async () => {
    render(<ReportPanel onOpenLead={vi.fn()} />);
    const emails = screen.getByLabelText(/Correos que lo reciben/);
    expect(emails).toHaveValue("jefe@clinica.cl");
    await userEvent.clear(emails);
    await userEvent.type(emails, "a@x.cl, b@x.cl");
    await userEvent.selectOptions(screen.getByLabelText("Periodicidad"), "daily");
    expect(screen.queryByLabelText("Día")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Hora (Chile)"), "17");
    await userEvent.click(screen.getByRole("button", { name: /Guardar configuración/ }));
    expect(api.save.mock.calls[0][0]).toEqual({
      data: { enabled: true, recipients: ["a@x.cl", "b@x.cl"], frequency: "daily", weekday: 1, hour: 17, skipWhenEmpty: true },
    });
    await userEvent.click(screen.getByRole("button", { name: /Enviar ahora/ }));
    expect(api.send).toHaveBeenCalled();
  });

  it("is read-only for everyone else, but still shows the pending list", () => {
    api.report = report(false);
    render(<ReportPanel onOpenLead={vi.fn()} />);
    expect(screen.getByText(/Solo el representante legal/)).toBeInTheDocument();
    expect(screen.getByLabelText("Periodicidad")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Guardar configuración/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Diagnosticar" })).toHaveLength(2);
  });

  it("warns when mail is not configured and shows the last failure", () => {
    api.report = report(true, { lastError: "El servicio de correo rechazó el envío." });
    api.report = { ...(api.report as object), mailConfigured: false };
    render(<ReportPanel onOpenLead={vi.fn()} />);
    expect(screen.getByText(/no está configurado en el servidor/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("rechazó");
  });
});
