/** Supra-control: selector de plan de cada clínica. Solo se simula fetch (corre el flujo real de react-query). */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { ClinicPlanSelect } from "./clinic-plan-select";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input, init) => {
    const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}"));
    return new Response(JSON.stringify({ id: "c1", name: "Clínica Uno", plan: body.plan ?? "basic" }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => vi.restoreAllMocks());

const renderSelect = (plan: "basic" | "unlimited" | "titanium" = "basic") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><ClinicPlanSelect center={{ id: "c1", name: "Clínica Uno", plan }} /></LanguageProvider></QueryClientProvider>);
};

describe("ClinicPlanSelect", () => {
  it("muestra el plan actual con los tres planes y explica que Titanium agrega el video", () => {
    renderSelect("unlimited");
    const select = screen.getByLabelText("Plan") as HTMLSelectElement;
    expect(select.value).toBe("unlimited");
    expect([...select.options].map((option) => option.text)).toEqual(["Básico", "Ilimitado", "Titanium"]);
    expect(select).toHaveAccessibleDescription(/Titanium agrega el video/);
  });

  it("al elegir otro plan lo guarda con PATCH /director/centers/:id", async () => {
    const user = userEvent.setup();
    renderSelect("basic");
    await user.selectOptions(screen.getByLabelText("Plan"), "titanium");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/api/director/centers/c1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ plan: "titanium" });
  });

  it("está traducido (inglés)", () => {
    window.localStorage.setItem("clinivista_lang", "en");
    renderSelect();
    expect([...(screen.getByLabelText("Plan") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Basic", "Unlimited", "Titanium"]);
  });
});
