import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";
import { PhotoTurntable } from "./photo-turntable";

const photos = [
  { id: "l", key: "temporalLeft", label: "Temporal izquierda" },
  { id: "f", key: "frontal", label: "Vista frontal" },
  { id: "r", key: "temporalRight", label: "Temporal derecha" },
  { id: "v", key: "vertex", label: "Superior" },
];
const show = (list = photos) => render(<LanguageProvider><PhotoTurntable leadId="lead-1" photos={list} /></LanguageProvider>);
const visible = () => screen.getAllByRole("img", { hidden: true }).filter((img) => img.className.includes("opacity-100")).map((img) => img.getAttribute("alt"));

describe("visor giratorio de fotos", () => {
  it("parte en la vista frontal, gira con los botones y da la vuelta", async () => {
    const user = userEvent.setup();
    show();
    expect(visible()).toEqual(["Vista frontal"]);
    await user.click(screen.getByRole("button", { name: "Girar a la derecha" }));
    expect(visible()).toEqual(["Temporal derecha"]);
    await user.click(screen.getByRole("button", { name: "Girar a la derecha" })); // no hay nuca: da la vuelta
    expect(visible()).toEqual(["Temporal izquierda"]);
    await user.click(screen.getByRole("button", { name: "Girar a la izquierda" }));
    expect(visible()).toEqual(["Temporal derecha"]);
  });

  it("arrastrar gira la cabeza y la vista superior se alcanza con su botón", async () => {
    const user = userEvent.setup();
    show();
    const stage = screen.getByTestId("turntable-stage");
    fireEvent.pointerDown(stage, { clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(stage, { clientX: 100, pointerId: 1 }); // 200 px a la izquierda = 2 fotos
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(visible()).toEqual(["Temporal izquierda"]);
    await user.click(screen.getByRole("button", { name: "Superior" }));
    expect(visible()).toEqual(["Superior"]);
  });

  it("avisa que no es un modelo 3D medido y no aparece con menos de dos vistas", () => {
    const { unmount } = show();
    expect(screen.getByText(/no un modelo 3D medido/)).toBeInTheDocument();
    unmount();
    show([photos[1]]);
    expect(screen.queryByTestId("turntable")).toBeNull();
  });
});
