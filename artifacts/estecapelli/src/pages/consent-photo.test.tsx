import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("wouter", () => ({ useParams: () => ({ token: "tok-abc" }) }));
import ConsentPhoto from "./consent-photo";

afterEach(() => { vi.restoreAllMocks(); });
const open = (over: Record<string, unknown> = {}) => ({
  state: "open", clinicName: "Clínica Uno", language: "es", title: "Autorización para fotografías clínicas", intro: "Clínica Uno tomará fotografías tuyas.",
  points: ["Para qué: evaluar tu caso.", "Quién las ve: el equipo."], checkbox: "He leído esta autorización y acepto.", requiresCode: true, maskedEmail: "pa••@correo.cl", ...over,
});

describe("Página de autorización del paciente", () => {
  it("lee, pide el código al correo, lo confirma y registra la aceptación", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); const method = init?.method ?? "GET"; calls.push({ url, method, body: init?.body as string | undefined });
      if (method === "GET") return new Response(JSON.stringify(open()), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const user = userEvent.setup();
    render(<ConsentPhoto />);
    expect(await screen.findByText("Autorización para fotografías clínicas")).toBeInTheDocument();
    expect(screen.getByText(/Quién las ve/)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirmar y autorizar" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar código a mi correo" }));
    expect(await screen.findByText(/pa••@correo.cl/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Código"), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar y autorizar" }));
    expect(await screen.findByTestId("consent-finished")).toHaveTextContent("Tu autorización quedó registrada");
    const accept = calls.find((c) => c.url.endsWith("/accept"))!;
    expect(JSON.parse(accept.body!)).toMatchObject({ code: "123456" });
  });

  it("muestra el error del código incorrecto y permite rechazar", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify(open()), { status: 200 });
      if (url.endsWith("/accept")) return new Response(JSON.stringify({ code: "code_wrong" }), { status: 422 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const user = userEvent.setup();
    render(<ConsentPhoto />);
    await user.click(await screen.findByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar código a mi correo" }));
    await user.type(await screen.findByLabelText("Código"), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar y autorizar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El código no es correcto.");
    await user.click(screen.getByRole("button", { name: "No autorizo" }));
    expect(await screen.findByTestId("consent-finished")).toHaveTextContent(/no autorizas/);
  });

  it("sin correo permite aceptar directo y avisa cómo queda registrada la aceptación", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) =>
      new Response(JSON.stringify((init?.method ?? "GET") === "GET" ? open({ requiresCode: false, maskedEmail: null }) : { ok: true }), { status: 200 }));
    const user = userEvent.setup();
    render(<ConsentPhoto />);
    expect(await screen.findByText(/No tenemos tu correo/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Aceptar y autorizar" }));
    expect(await screen.findByTestId("consent-finished")).toBeInTheDocument();
  });

  it("explica un enlace inválido o ya usado", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ state: "invalid" }), { status: 200 }));
    const first = render(<ConsentPhoto />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no es válido o venció/);
    first.unmount();
    spy.mockResolvedValue(new Response(JSON.stringify({ state: "done", status: "granted", grantedAt: new Date().toISOString() }), { status: 200 }));
    render(<ConsentPhoto />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/quedó registrada/));
  });
});
