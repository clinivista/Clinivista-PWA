import { describe, it, expect } from "vitest";
import { formatRut, normalizeRut, validateRut, computeDv } from "./rut";

describe("normalizeRut", () => {
  it("strips punctuation from a formatted RUT", () => {
    expect(normalizeRut("12.345.678-5")).toBe("123456785");
  });

  it("normalises an unformatted RUT to the same value as the formatted one", () => {
    expect(normalizeRut("12345678-5")).toBe(normalizeRut("12.345.678-5"));
  });

  it("uppercases a lowercase k check digit", () => {
    expect(normalizeRut("11.111.111-k")).toBe("11111111K");
  });

  it("drops K characters that are not in the final position", () => {
    expect(normalizeRut("1k2345678")).toBe("12345678");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeRut("")).toBe("");
  });

  it("ignores letters and symbols", () => {
    expect(normalizeRut("abc12.345.678-5xyz")).toBe("123456785");
  });
});

describe("formatRut", () => {
  it("formats a raw RUT with dots and dash", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });

  it("is idempotent on already formatted values", () => {
    expect(formatRut("12.345.678-5")).toBe("12.345.678-5");
  });

  it("uppercases k in the formatted output", () => {
    expect(formatRut("11111111k")).toBe("11.111.111-K");
  });

  it("returns single characters unchanged", () => {
    expect(formatRut("1")).toBe("1");
    expect(formatRut("")).toBe("");
  });
});

describe("computeDv", () => {
  it("computes numeric check digits", () => {
    expect(computeDv("12345678")).toBe("5");
  });

  it("computes K check digits", () => {
    // 20.347.878 has check digit K
    expect(computeDv("20347878")).toBe("K");
  });
});

describe("validateRut", () => {
  it("accepts a valid formatted RUT", () => {
    expect(validateRut("12.345.678-5").valid).toBe(true);
  });

  it("accepts the same RUT without punctuation", () => {
    expect(validateRut("12345678-5").valid).toBe(true);
    expect(validateRut("123456785").valid).toBe(true);
  });

  it("rejects a RUT with a wrong check digit", () => {
    const result = validateRut("12.345.678-9");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("accepts a lowercase k check digit (uppercased internally)", () => {
    expect(validateRut("20.347.878-k").valid).toBe(true);
    expect(validateRut("20.347.878-K").valid).toBe(true);
  });

  it("rejects empty input with a specific message", () => {
    const result = validateRut("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Ingresa tu RUT.");
  });

  it("rejects short bodies as incomplete", () => {
    const result = validateRut("1234-5");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("RUT completo");
  });

  it("rejects whitespace-only input", () => {
    expect(validateRut("   ").valid).toBe(false);
  });
});
