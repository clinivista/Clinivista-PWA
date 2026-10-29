/**
 * The "Usuarios" option of a clinic's panel is only offered to people who can
 * manage users (administrativos and the legal representative). Only fetch is
 * mocked, so the real react-query pipeline runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import Admin from "./admin";

let fetchSpy: ReturnType<typeof vi.spyOn>;
let me: object;
let unread: number;
let loggedOut: boolean;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  window.localStorage.clear();
  unread = 0;
  loggedOut = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return jsonResponse(me);
    if (url.includes("/api/clinic/overview")) return jsonResponse({ monthly: [], totals: { patients: 0, photos: 0, thisMonth: 0, activeProfessionals: null } });
    if (url.includes("/api/clinic/activity")) return jsonResponse({ events: [] });
    if (url.endsWith("/api/support/unread")) return jsonResponse({ unread });
    if (url.includes("/api/support/")) return jsonResponse({ messages: [], tickets: [] });
    if (url.endsWith("/api/clinic/protocol")) return jsonResponse({ canEdit: false, phases: [] });
    if (url.endsWith("/api/auth/logout")) { loggedOut = true; return jsonResponse({ ok: true }); }
    if (url.includes("/api/leads/stats")) return jsonResponse({ total: 0, counts: {} });
    if (url.includes("/api/leads")) return jsonResponse({ leads: [] });
    if (url.endsWith("/api/clinic/me")) return jsonResponse({ name: "Clínica Ejemplo", slug: "clinica", logoDataUrl: null, specialty: "dermatologia" });
    if (url.endsWith("/api/clinic/integrations")) return jsonResponse({ catalog: [{ id: "medilink", category: "agenda" }, { id: "instagram", category: "redes" }], requested: [] });
    if (url.endsWith("/api/clinic/users")) {
      return jsonResponse({
        users: [{ id: "u1", email: "ana@x.cl", name: "Ana Pérez", role: "medico", active: true, legalRepresentative: false, isSelf: false, createdAt: "2026-01-01T00:00:00Z" }],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => vi.restoreAllMocks());

const signedIn = (role: string, canManageUsers: boolean) => ({
  authenticated: true,
  user: { id: "me", email: "me@x.cl", name: "Yo", role, centerId: "c1", canManageUsers },
});

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <Admin />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("Admin — Inicio", () => {
  it("es la vista por defecto y el primer ítem del menú, sin quitar los demás", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    expect(await screen.findByTestId("clinic-home")).toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    const items = Array.from(nav.querySelectorAll("button")).map((b) => b.textContent?.trim());
    expect(items[0]).toBe("Inicio");
    expect(items).toEqual(expect.arrayContaining(["Pacientes", "Usuarios", "Informe", "Ayuda"]));
    expect(screen.getByTestId("nav-home")).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Pacientes" }));
    expect(await screen.findByRole("button", { name: /Copiar enlace/i })).toBeInTheDocument();
    expect(screen.queryByTestId("clinic-home")).not.toBeInTheDocument();
  });
});

describe("Admin — dirección del texto", () => {
  it("en árabe todo el panel y sus portales van de derecha a izquierda; al salir se restablece", async () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    me = signedIn("administrativo", true);
    const { container, unmount } = renderAdmin();
    await screen.findByTestId("clinic-home");
    expect(container.querySelector(".clinic-dashboard")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("navigation").closest("[dir]")).toHaveAttribute("dir", "rtl");
    expect(document.body).toHaveAttribute("dir", "rtl");
    unmount();
    expect(document.body).not.toHaveAttribute("dir");
    expect(document.body).not.toHaveClass("clinic-dashboard");
  });

  it("en español va de izquierda a derecha", async () => {
    me = signedIn("administrativo", true);
    const { container } = renderAdmin();
    await screen.findByTestId("clinic-home");
    expect(container.querySelector(".clinic-dashboard")).toHaveAttribute("dir", "ltr");
    expect(document.body).toHaveAttribute("dir", "ltr");
  });
});

describe("Admin — Usuarios option", () => {
  it("is offered to a person who can manage users, and opens the users list", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Usuarios" }));
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usuarios" })).toBeInTheDocument();
  });

  it("is offered to a médico who is the legal representative", async () => {
    me = signedIn("medico", true);
    renderAdmin();
    expect(await screen.findByRole("button", { name: "Usuarios" })).toBeInTheDocument();
  });

  it("is hidden from a médico who is not the legal representative", async () => {
    me = signedIn("medico", false);
    renderAdmin();
    // Inicio es la vista por defecto: tampoco ofrece Usuarios ni pide la lista.
    await screen.findByTestId("clinic-home");
    expect(screen.queryByRole("button", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/api/clinic/users"))).toBe(false);
  });
});

describe("Admin — barra superior y menú lateral", () => {
  it("la campana muestra los avisos de soporte sin leer y abre Ayuda → Soporte", async () => {
    unread = 3;
    me = signedIn("medico", false);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    const bell = await screen.findByRole("button", { name: "Avisos de soporte: 3 sin leer" });
    expect(screen.getByTestId("topbar-unread")).toHaveTextContent("3");
    await user.click(bell);
    expect(screen.getByTestId("nav-help")).toHaveAttribute("aria-current", "page");
    expect((await screen.findByTestId("help-tab-support")).className).toContain("bg-[#00A9A5]");
  });

  it("sin avisos la campana no muestra contador", async () => {
    me = signedIn("medico", false);
    renderAdmin();
    expect(await screen.findByRole("button", { name: "Avisos de soporte: ninguno sin leer" })).toBeInTheDocument();
    expect(screen.queryByTestId("topbar-unread")).not.toBeInTheDocument();
  });

  it("el buscador lleva a Pacientes con el filtro aplicado", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await screen.findByTestId("clinic-home");
    await user.type(screen.getByTestId("topbar-search"), "Ana");
    expect(screen.queryByTestId("clinic-home")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
    // El filtro de la lista tiene el mismo texto y la consulta lo usa.
    const listSearch = screen.getByRole("textbox", { name: "Buscar pacientes" });
    expect(listSearch).toHaveValue("Ana");
    expect(listSearch).toHaveFocus();
    await waitFor(() => expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/api/leads?search=Ana"))).toBe(true));
  });

  it("Enter en el buscador vacío también lleva a Pacientes", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await screen.findByTestId("clinic-home");
    await user.type(screen.getByTestId("topbar-search"), "{Enter}");
    expect(screen.getByRole("button", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
  });

  it("el menú de la cuenta muestra nombre y rol, cambia el idioma y cierra la sesión", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    const account = await screen.findByTestId("topbar-account");
    expect(account).toHaveTextContent("Yo");
    expect(account).toHaveTextContent("Administrativo");
    await user.click(account);
    await user.click(within(screen.getByTestId("account-menu")).getByRole("button", { name: /English/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Welcome, Yo" })).toBeInTheDocument();
    await user.click(screen.getByTestId("topbar-account"));
    await user.click(within(screen.getByTestId("account-menu")).getByRole("button", { name: /out/i }));
    await waitFor(() => expect(loggedOut).toBe(true));
  });

  it.each([
    ["basic", "Plan Básico"],
    ["unlimited", "Plan Ilimitado"],
    ["titanium", "Plan Titanium"],
  ] as const)("«Mi clínica» muestra el plan real de la clínica (%s)", async (plan, label) => {
    me = { ...signedIn("administrativo", true), user: { ...signedIn("administrativo", true).user, plan, features: plan === "titanium" ? ["video"] : [] } };
    renderAdmin();
    expect(await screen.findByTestId("my-clinic-plan")).toHaveTextContent(label);
  });

  it("«Mi clínica» traduce el plan (inglés y árabe)", async () => {
    window.localStorage.setItem("clinivista_lang", "en");
    me = { ...signedIn("administrativo", true), user: { ...signedIn("administrativo", true).user, plan: "unlimited", features: [] } };
    const { unmount } = renderAdmin();
    expect(await screen.findByTestId("my-clinic-plan")).toHaveTextContent("Plan Unlimited");
    unmount();
    window.localStorage.setItem("clinivista_lang", "ar");
    renderAdmin();
    expect(await screen.findByTestId("my-clinic-plan")).toHaveTextContent("الباقة غير المحدودة");
  });

  it("«Mi clínica» muestra el nombre y la especialidad reales; sin plan en la sesión no inventa uno; la tarjeta de ayuda abre los manuales", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    const card = await screen.findByTestId("my-clinic");
    await waitFor(() => expect(card).toHaveTextContent("Clínica Ejemplo"));
    expect(card).toHaveTextContent("Dermatología");
    expect(screen.queryByTestId("my-clinic-plan")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("help-card"));
    expect(screen.getByTestId("nav-help")).toHaveAttribute("aria-current", "page");
    expect((await screen.findByTestId("help-tab-manual")).className).toContain("bg-[#00A9A5]");
  });
});

describe("Admin — Integraciones disponibles", () => {
  it("lo ven médicos y administrativos (no depende de gestionar usuarios) y abre el catálogo", async () => {
    me = signedIn("medico", false);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await screen.findByTestId("clinic-home");
    const nav = screen.getByRole("navigation");
    const labels = Array.from(nav.querySelectorAll("button")).map((b) => b.textContent?.trim());
    expect(labels).toContain("Integraciones disponibles");
    expect(labels.indexOf("Integraciones disponibles")).toBeLessThan(labels.indexOf("Ayuda"));
    await user.click(screen.getByTestId("nav-integrations"));
    expect(await screen.findByTestId("integrations-panel")).toBeInTheDocument();
    expect(screen.getByTestId("nav-integrations")).toHaveAttribute("aria-current", "page");
    expect(await screen.findByTestId("integration-medilink")).toBeInTheDocument();
  });
});
