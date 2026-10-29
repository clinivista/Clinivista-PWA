import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@workspace/api-client-react", () => ({ getGetDirectorCentersQueryKey: () => ["/api/director/centers"] }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }) }));
const toastSpy = vi.hoisted(() => vi.fn());

import { CenterPlanPanel } from "./center-plan-panel";

const plan = {
  plan: "basic", pendingPlan: null, pendingPlanFrom: null, billing: { stage: "al_dia", paidUntil: null, auto: false, restricted: false },
  limits: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20, includedHours: 0, fromClinic: { patientsPerMonth: false, storageGb: false } },
  planDefaults: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20, includedHours: 0 },
  usage: { patientsThisMonth: 0, storageBytes: 0, transcriptionsThisMonth: 0 },
  hours: { includedMinutes: 0, purchasedMinutes: 0, adjustMinutes: 0, usedMinutes: 0, balanceMinutes: 0, canBuy: false, customWork: false }, hoursLog: [],
};
const contract = (over: Record<string, unknown> = {}) => ({
  enabled: true, available: true, version: "v1", plan: "basic", status: "pendiente", history: [],
  legalReps: [{ id: "u1", name: "Lia", email: "lia@x.cl" }], mailAvailable: true, invites: [], ...over,
});

let sends = 0;
function stub(view: unknown) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { sends += 1; return new Response(JSON.stringify({ results: [{ userId: "u1", email: "lia@x.cl", name: "Lia", status: "enviado" }] }), { status: 200 }); }
    return new Response(JSON.stringify(url.endsWith("/contract") ? view : plan), { status: 200 });
  }));
}
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CenterPlanPanel centerId="c1" centerName="Clínica Uno" /></QueryClientProvider>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); sends = 0; toastSpy.mockClear(); });

describe("Contrato en la ficha de la clínica (supra-control)", () => {
  it("muestra estado, destinatario y envía el contrato por correo", async () => {
    stub(contract());
    mount();
    expect(await screen.findByTestId("contract-recipients")).toHaveTextContent("lia@x.cl");
    expect(screen.getByText("pendiente de aceptación")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("contract-send"));
    await waitFor(() => expect(sends).toBe(1));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("lia@x.cl") })));
  });

  it("sin representante legal el botón queda desactivado y lo explica", async () => {
    stub(contract({ legalReps: [] }));
    mount();
    expect(await screen.findByTestId("contract-recipients")).toHaveTextContent("Sin representante legal activo");
    expect(screen.getByTestId("contract-send")).toBeDisabled();
  });

  it("ofrece «Reenviar» cuando ya hubo envíos y muestra el historial", async () => {
    stub(contract({
      status: "aceptado",
      invites: [{ id: "i1", userId: "u1", email: "lia@x.cl", plan: "basic", version: "v1", sentAt: "2026-11-01T12:00:00Z", expiresAt: "2026-12-01T12:00:00Z", usedAt: "2026-11-02T12:00:00Z" }],
      history: [{ id: "a1", plan: "basic", version: "v1", hash: "abcdef0123456789", byName: "Lia", byEmail: "lia@x.cl", byRole: "representante legal (enlace por correo)", ip: "203.0.113.9", acceptedAt: "2026-11-02T12:00:00Z" }],
    }));
    mount();
    expect(await screen.findByRole("button", { name: "Reenviar contrato por correo" })).toBeEnabled();
    expect(screen.getByTestId("contract-invites")).toHaveTextContent("aceptado");
    expect(screen.getByTestId("contract-history")).toHaveTextContent("IP 203.0.113.9");
  });
});
