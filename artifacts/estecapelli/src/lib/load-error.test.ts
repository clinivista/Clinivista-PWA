import { describe, it, expect } from "vitest";
import { loadErrorDetail } from "./load-error";

describe("loadErrorDetail", () => {
  it("muestra el código y el mensaje del servidor", () => {
    expect(loadErrorDetail({ status: 403, data: { error: "Solo el personal administrativo." } })).toBe("Código 403 · Solo el personal administrativo.");
  });
  it("sin respuesta del servidor usa el mensaje del error", () => {
    expect(loadErrorDetail(new Error("Failed to fetch"))).toBe("Failed to fetch");
  });
  it("sin error no muestra nada", () => {
    expect(loadErrorDetail(null)).toBe("");
  });
});
