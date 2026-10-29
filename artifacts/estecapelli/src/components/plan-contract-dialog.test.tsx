import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { PLAN_CATALOG_TEXT } from "@/lib/plan-catalog-i18n";
import { CONTRACT_TEXT } from "@/lib/contract-i18n";
import { PlanContractDialog, PlanContractLauncher } from "./plan-contract-dialog";

const plans = [
  { id: "basic", limits: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20, includedHours: 0 }, services: { buyHours: false, customWork: false } },
  { id: "unlimited", limits: { patientsPerMonth: 0, storageGb: 250, transcriptionsPerMonth: 100, includedHours: 5 }, services: { buyHours: true, customWork: false } },
  { id: "titanium", limits: { patientsPerMonth: 0, storageGb: 1000, transcriptionsPerMonth: 300, includedHours: 15 }, services: { buyHours: true, customWork: true } },
];
const body = { title: "Contrato", version: "v1", hash: "h", clauses: [{ title: "1. Objeto", body: "Licencia." }], annexTitle: "Anexo", annex: [{ label: "Almacenamiento", value: "50 GB" }] };
const contract = (over: Record<string, unknown> = {}) => ({ enabled: true, plan: "basic", accepted: false, acceptance: null, canAccept: true, contract: body, ...over });

function stub(contractView: unknown, current = "basic", canManage = true) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes("plan-catalog") ? { canManage, current, plans } : contractView), { status: 200 })));
}
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const dialog = (tab?: "plan" | "compare" | "contract") => render(<QueryClientProvider client={client()}><LanguageProvider><PlanContractDialog open onOpenChange={() => undefined} initialTab={tab} /></LanguageProvider></QueryClientProvider>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
const T = PLAN_CATALOG_TEXT.es;

describe("Mi plan y contrato", () => {
  it("muestra las características del plan contratado", async () => {
    stub(contract());
    dialog();
    const list = await screen.findByTestId("plan-features");
    expect(within(list).getByText("30")).toBeInTheDocument();
    expect(within(list).getByText("50 GB")).toBeInTheDocument();
    expect(within(list).getAllByText(T.notAvailable)).toHaveLength(2);
  });

  it("compara los tres planes y marca el plan de la clínica", async () => {
    stub(contract(), "unlimited");
    dialog("compare");
    const table = await screen.findByTestId("plan-compare");
    for (const name of ["Ilimitado", "Titanium", "Básico"]) expect(within(table).getByText(new RegExp(name))).toBeInTheDocument();
    expect(within(table).getByText(new RegExp(T.yourPlan))).toBeInTheDocument();
    expect(within(table).getByText(/1[.\u00a0]?000 GB/)).toBeInTheDocument();
    expect(within(table).getAllByText("Sin límite").length).toBeGreaterThanOrEqual(2);
  });

  it("contrato pendiente: se puede leer y aceptar, y avisa que es definitivo", async () => {
    stub(contract());
    dialog("contract");
    expect(await screen.findByTestId("contract-text")).toHaveTextContent("Licencia.");
    expect(screen.getByTestId("contract-state")).toHaveTextContent(T.pending);
    expect(screen.getByText(T.irreversible)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CONTRACT_TEXT.es.accept })).toBeDisabled();
  });

  it("contrato aceptado: muestra quién y cuándo, y no ofrece volver a aceptar ni revertir", async () => {
    stub(contract({ accepted: true, acceptance: { id: "a", plan: "basic", version: "v1", byName: "Lia Legal", acceptedAt: "2026-11-02T15:00:00Z" } }));
    dialog("contract");
    expect(await screen.findByTestId("contract-state")).toHaveTextContent("Lia Legal");
    expect(screen.queryByRole("button", { name: CONTRACT_TEXT.es.accept })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText(T.irreversible)).toBeInTheDocument();
  });

  it("sin contrato activado, la pestaña lo explica", async () => {
    stub({ enabled: false });
    dialog("contract");
    expect(await screen.findByTestId("contract-off")).toBeInTheDocument();
  });

  it("el botón solo aparece para quien administra la clínica", async () => {
    stub(contract(), "basic", false);
    const { unmount } = render(<QueryClientProvider client={client()}><LanguageProvider><PlanContractLauncher /></LanguageProvider></QueryClientProvider>);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByTestId("plan-contract-open")).toBeNull();
    unmount();
    stub(contract(), "basic", true);
    render(<QueryClientProvider client={client()}><LanguageProvider><PlanContractLauncher /></LanguageProvider></QueryClientProvider>);
    await userEvent.click(await screen.findByTestId("plan-contract-open"));
    expect(await screen.findByTestId("plan-contract-dialog")).toBeInTheDocument();
  });
});

describe("PLAN_CATALOG_TEXT", () => {
  it("las 9 lenguas tienen las mismas claves y ninguna vacía", () => {
    const keys = Object.keys(PLAN_CATALOG_TEXT.es).sort();
    expect(Object.keys(PLAN_CATALOG_TEXT)).toHaveLength(9);
    for (const text of Object.values(PLAN_CATALOG_TEXT)) {
      expect(Object.keys(text).sort()).toEqual(keys);
      for (const value of Object.values(text)) expect(value.length).toBeGreaterThan(0);
    }
  });
});
