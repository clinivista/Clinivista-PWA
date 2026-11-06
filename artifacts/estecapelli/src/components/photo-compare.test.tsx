import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";
import { PhotoCompare } from "./photo-compare";

const items = [
  { id: "p1", label: "Pre-operatorio", date: "01/03/2026" },
  { id: "p2", label: "Control 1", date: "01/06/2026" },
  { id: "p3", label: "Control 2", date: "01/09/2026" },
];
const show = () => render(<LanguageProvider><PhotoCompare leadId="lead-1" items={items} onClose={() => {}} /></LanguageProvider>);
const srcs = () => within(screen.getByTestId("photo-compare")).getAllByRole("img", { hidden: true }).filter((el) => el.tagName === "IMG").map((el) => el.getAttribute("src"));

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 400 });
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

describe("comparación avanzada de fotos", () => {
  it("parte superpuesta con la primera y la última foto, y la transparencia cambia solo la de «Después»", () => {
    show();
    expect(srcs()).toEqual(["/api/leads/lead-1/photos/p1", "/api/leads/lead-1/photos/p3"]);
    expect(screen.getByTestId("compare-top")).toHaveStyle({ opacity: "0.5" });
    fireEvent.change(screen.getByLabelText("Transparencia de «Después»"), { target: { value: "20" } });
    expect(screen.getByTestId("compare-top")).toHaveStyle({ opacity: "0.2" });
    expect(screen.getByTestId("compare-opacity")).toHaveTextContent("20%");
  });

  it("el zoom es uno solo: en lado a lado las dos fotos se acercan juntas y «Ajustar» las devuelve", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Lado a lado" }));
    const stages = screen.getAllByTestId("compare-stage");
    expect(stages).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Acercar" }));
    expect(screen.getByTestId("compare-zoom")).toHaveTextContent("150%");
    for (const stage of stages) expect((stage.firstElementChild as HTMLElement).style.transform).toContain("scale(1.5)");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    for (const stage of stages) expect((stage.firstElementChild as HTMLElement).style.transform).toContain("scale(1)");
  });

  it("la cortina recorta «Después» y se puede elegir con qué fotos comparar", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Cortina" }));
    fireEvent.change(screen.getByLabelText("Posición de la cortina"), { target: { value: "30" } });
    expect((screen.getByTestId("compare-top")).style.clipPath).toContain("70%");
    await user.selectOptions(screen.getByLabelText("Antes"), "p2");
    expect(srcs()[0]).toBe("/api/leads/lead-1/photos/p2");
  });

  it("avisa que es una comparación visual y no una medición", () => {
    show();
    expect(screen.getByText(/No es una medición/)).toBeInTheDocument();
  });
});
