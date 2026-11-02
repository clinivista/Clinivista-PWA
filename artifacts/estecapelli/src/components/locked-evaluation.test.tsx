import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, LANGS } from "@/lib/language";
import { EVALUATION_EDIT_TEXT, PATIENT_UPDATES_TEXT, PORTAL_EDIT_TEXT } from "@/lib/evaluation-edit-i18n";
import { LockedEvaluation } from "./locked-evaluation";

vi.mock("wouter", () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const wrap = () => render(<LanguageProvider><LockedEvaluation token="tok-1" /></LanguageProvider>);

describe("Evaluación en revisión (paciente)", () => {
  it("envía una nota y una foto como información adicional, sin reemplazar nada", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.endsWith("/edit-state")) return new Response(JSON.stringify({ locked: true, additions: [] }), { status: 200 });
      if (url.endsWith("/additions") && method === "POST") return new Response(JSON.stringify({ ok: true, id: "add-1" }), { status: 201 });
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    });
    localStorage.setItem("clinivista_lang", "es");
    const user = userEvent.setup();
    wrap();
    await user.type(screen.getByLabelText(/qué quieres agregar/i), "Me salió una mancha");
    await user.upload(screen.getByTestId("addition-files"), new File([new Uint8Array(10)], "foto.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: /Enviar a la clínica/i }));
    expect(await screen.findByText(/La clínica lo revisará/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/additions"))).toBe(true);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/additions/add-1/files"))).toBe(true);
    expect(calls.some((c) => c.method === "PUT" || c.method === "DELETE")).toBe(false);
  });

  it("pide escribir algo o elegir una foto y no envía nada vacío", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ locked: true, additions: [] }), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /Enviar a la clínica/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Escribe un mensaje/);
    await waitFor(() => expect(spy.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true));
  });

  it("muestra los envíos anteriores con su estado, la pista de rectificación y «Mis datos y derechos»", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ locked: true, additions: [
      { id: "a1", note: "Otra foto", status: "incorporated", createdAt: new Date().toISOString(), fileCount: 1 },
    ] }), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap();
    expect(await screen.findByText("Otra foto")).toBeInTheDocument();
    expect(screen.getByText(/Revisado e incorporado por la clínica/)).toBeInTheDocument();
    expect(screen.getByText(/Rectificación/)).toBeInTheDocument();
    expect(screen.getByTestId("data-rights-open")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a mi cuenta/ })).toHaveAttribute("href", "/paciente");
  });
});

describe("textos en los nueve idiomas", () => {
  it("todas las cadenas existen en cada idioma", () => {
    for (const { code } of LANGS) {
      const edit = EVALUATION_EDIT_TEXT[code];
      for (const [key, value] of Object.entries(edit)) {
        const text = typeof value === "function" ? (value as (n: number) => string)(2) : value;
        expect(text, `${code}.${key}`).toBeTruthy();
      }
      for (const value of Object.values(PORTAL_EDIT_TEXT[code])) expect(value).toBeTruthy();
      const updates = PATIENT_UPDATES_TEXT[code];
      for (const [key, value] of Object.entries(updates)) {
        if (key === "fields") continue;
        const text = typeof value === "function" ? (value as (n: string & number) => string)("x" as never) : value;
        expect(text, `${code}.${key}`).toBeTruthy();
      }
      expect(Object.keys(updates.fields).sort()).toEqual(Object.keys(PATIENT_UPDATES_TEXT.es.fields).sort());
    }
  });
});
