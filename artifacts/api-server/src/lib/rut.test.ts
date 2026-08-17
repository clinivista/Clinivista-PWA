import { describe, it, expect } from "vitest";
import { formatRut, normalizeRut, validateRut, computeDv } from "./rut";

// The server-side RUT logic must mirror the frontend copy exactly.
describe("normalizeRut (server)", () => {
  it("strips punctuation and matches unformatted input", () => {
    expect(normalizeRut("12.345.678-5")).toBe("123456785");
    expect(normalizeRut("12345678-5")).toBe("123456785");
  });

  it("uppercases k and handles empty input", () => {
    expect(normalizeRut("11.111.111-k")).toBe("11111111K");
    expect(normalizeRut("")).toBe("");
  });
});

describe("formatRut (server)", () => {
  it("formats with dots and dash", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });
});

describe("computeDv (server)", () => {
  it("computes numeric and K check digits", () => {
    expect(computeDv("12345678")).toBe("5");
    expect(computeDv("20347878")).toBe("K");
  });
});

describe("validateRut (server)", () => {
  it("accepts valid RUTs in any format", () => {
    expect(validateRut("12.345.678-5").valid).toBe(true);
    expect(validateRut("12345678-5").valid).toBe(true);
  });

  it("rejects wrong check digit, short body and empty input", () => {
    expect(validateRut("12.345.678-9").valid).toBe(false);
    expect(validateRut("1234-5").valid).toBe(false);
    expect(validateRut("").valid).toBe(false);
  });
});
