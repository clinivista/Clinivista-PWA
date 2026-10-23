import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupportAlerts } from "./support-alerts";
import { OPEN_SUPPORT_INBOX_EVENT } from "@/pages/supra-inbox";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const alertsResponse = (waiting: number) => new Response(JSON.stringify({
  waiting,
  items: waiting ? [{ id: "t1", number: 4, subject: "No carga", createdAt: new Date().toISOString(), requesterName: "Ana", centerName: "Clínica Uno" }] : [],
}), { status: 200 });

afterEach(() => { vi.unstubAllGlobals(); });

describe("alerta de tickets en espera para directores", () => {
  it("muestra cuántos esperan atención y abre la bandeja en ese ticket", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => alertsResponse(2)));
    const opened: string[] = [];
    window.addEventListener(OPEN_SUPPORT_INBOX_EVENT, (event) => opened.push((event as CustomEvent<{ ticketId?: string }>).detail?.ticketId ?? ""));
    wrap(<SupportAlerts />);
    expect(await screen.findByTestId("support-alert-count")).toHaveTextContent("2 tickets de soporte esperan atención");
    expect(screen.getByRole("alert")).toHaveTextContent("#4 · No carga — Ana (Clínica Uno)");
    await userEvent.click(screen.getByTestId("support-alert-open"));
    expect(opened).toEqual(["t1"]);
    await waitFor(() => expect(document.title).toMatch(/^\(2\)/));
  });

  it("no muestra aviso cuando no hay tickets esperando", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => alertsResponse(0)));
    wrap(<SupportAlerts />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("support-alert-count")).toBeNull();
  });
});
