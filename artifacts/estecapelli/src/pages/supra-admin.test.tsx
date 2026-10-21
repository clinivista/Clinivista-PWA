import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupraAdmin, AdminBanner } from "./supra-admin";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("Administración (solo directores)", () => {
  it("el aviso aparece solo si hay fallas o renovaciones próximas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ problems: [], renewals: [] })));
    const { unmount } = wrap(<AdminBanner />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("admin-banner")).toBeNull();
    unmount();
    vi.stubGlobal("fetch", vi.fn(async () => json({ problems: [{ key: "github", label: "Código y despliegue (GitHub)", status: "fail", detail: "GitHub rechazó el token" }], renewals: [{ name: "Render", renewalDate: "2026-11-01", days: 2 }] })));
    wrap(<AdminBanner />);
    const banner = await screen.findByTestId("admin-banner");
    expect(banner).toHaveTextContent("GitHub rechazó el token");
    expect(banner).toHaveTextContent("Renovación de Render: vence en 2 día(s)");
  });

  it("muestra el estado de cada servicio y registra un gasto", async () => {
    const posted: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/supra/admin/services")) return json({ checks: [
        { key: "database", label: "Base de datos (Neon)", status: "ok", detail: "Responde correctamente.", checkedAt: new Date().toISOString(), since: null },
        { key: "storage", label: "Fotos clínicas (almacenamiento R2)", status: "fail", detail: "El almacenamiento rechazó las claves", checkedAt: null, since: null },
      ], services: [], alertEmails: [], mailConfigured: true });
      if (init?.method === "POST") { posted.push(JSON.parse(String(init.body))); return json({ id: "e1" }, 201); }
      return json({ month: "2026-10", entries: [], totals: {}, history: [] });
    }));
    wrap(<SupraAdmin />);
    await userEvent.click(screen.getByRole("button", { name: /Administración/ }));
    expect(await screen.findByTestId("check-database")).toHaveTextContent("Funcionando");
    expect(screen.getByTestId("check-storage")).toHaveTextContent("Con falla");
    await userEvent.click(screen.getByTestId("admin-tab-finance"));
    expect(await screen.findByText("Sin movimientos este mes.")).toBeInTheDocument();
    const form = screen.getByRole("form", { name: "Nuevo movimiento" });
    await userEvent.type(within(form).getByLabelText("Monto"), "25000");
    await userEvent.type(within(form).getByLabelText("Categoría"), "Hosting");
    await userEvent.click(within(form).getByTestId("add-entry"));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ kind: "expense", amount: "25000", currency: "CLP", category: "Hosting" });
  });
});
