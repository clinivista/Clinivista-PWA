import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectorAccount } from "./director-account";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const wrap = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DirectorAccount /></QueryClientProvider>);
afterEach(() => vi.unstubAllGlobals());

const me = { id: "d1", email: "jose@x.cl", name: "Jose", phone: "" };

describe("DirectorAccount", () => {
  it("guarda nombre y teléfono; el correo nuevo pide la clave actual", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined });
      return json(init?.method === "PATCH" ? { ...me, name: "José F." } : me);
    }));
    wrap();
    const name = await screen.findByDisplayValue("Jose");
    await userEvent.clear(name);
    await userEvent.type(name, "José F.");
    await userEvent.click(screen.getByTestId("save-director-data"));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "PATCH")!.body!)).toEqual({ name: "José F.", phone: "" });

    const email = screen.getByLabelText("Correo de acceso");
    await userEvent.clear(email);
    await userEvent.type(email, "nuevo@x.cl");
    expect(screen.getByTestId("save-director-data")).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Clave actual \(para cambiar el correo\)/), "clave-actual-1");
    expect(screen.getByTestId("save-director-data")).toBeEnabled();
  });

  it("cambia la clave solo si la repetición coincide", async () => {
    const calls: Array<{ url: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body as string | undefined });
      return json(init?.method === "POST" ? { ok: true } : me);
    }));
    wrap();
    await screen.findByLabelText("Nombre");
    await userEvent.type(screen.getByLabelText("Clave actual"), "clave-actual-1");
    await userEvent.type(screen.getByLabelText(/Clave nueva/), "nueva-clave-9");
    await userEvent.type(screen.getByLabelText("Repite la clave nueva"), "otra-distinta");
    await userEvent.click(screen.getByTestId("save-director-password"));
    expect(calls.some((c) => c.url === "/api/director/me/password")).toBe(false);
    await userEvent.clear(screen.getByLabelText("Repite la clave nueva"));
    await userEvent.type(screen.getByLabelText("Repite la clave nueva"), "nueva-clave-9");
    await userEvent.click(screen.getByTestId("save-director-password"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/director/me/password")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.url === "/api/director/me/password")!.body!)).toEqual({ currentPassword: "clave-actual-1", newPassword: "nueva-clave-9" });
  });

  it("elige el perfil de ingreso a las clínicas", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined });
      return json(init?.method === "PUT" ? { entryProfile: "representante_legal" } : { ...me, entryProfile: "medico" });
    }));
    wrap();
    expect(await screen.findByTestId("entry-profile-medico")).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByTestId("entry-profile-representante_legal"));
    await waitFor(() => expect(screen.getByTestId("entry-profile-representante_legal")).toHaveAttribute("aria-checked", "true"));
    expect(calls.find((c) => c.method === "PUT")).toMatchObject({ url: "/api/director/me/entry-profile", body: JSON.stringify({ profile: "representante_legal" }) });
  });
});
