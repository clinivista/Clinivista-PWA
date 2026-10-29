import { describe, it, expect } from "vitest";
import { documentProblem, documentKind } from "./profile-fields";
import { USER_PROFILE_TEXT, SPECIALTY_IDS } from "./user-profile-i18n";
import { profileProblem, EMPTY_PROFILE } from "../components/profile-fields";

describe("documento por país", () => {
  it("Chile pide RUT; otros países pasaporte", () => {
    expect(documentKind("CL")).toBe("rut");
    expect(documentKind("AR")).toBe("pasaporte");
  });
  it("acepta 00000000-0 y rechaza un RUT con dígito verificador malo", () => {
    expect(documentProblem("00000000-0", "CL")).toBeNull();
    expect(documentProblem("12.345.678-9", "CL")).not.toBeNull();
    expect(documentProblem("", "CL")).toBe("required");
  });
  it("valida pasaporte alfanumérico de 5 a 20", () => {
    expect(documentProblem("AB123456", "AR")).toBeNull();
    expect(documentProblem("ab", "AR")).not.toBeNull();
  });
});

describe("profileProblem", () => {
  const ok = { ...EMPTY_PROFILE, rut: "00000000-0" };
  it("exige especialidad al médico y dirección al representante legal", () => {
    expect(profileProblem(ok, { role: "medico", country: "CL" })).toBe("specialty");
    expect(profileProblem({ ...ok, specialty: "dermatologo" }, { role: "medico", country: "CL" })).toBeNull();
    expect(profileProblem(ok, { role: "administrativo", country: "CL", legalRepresentative: true })).toBe("address");
  });
});

describe("textos en 9 idiomas", () => {
  it("todos los idiomas tienen las 12 especialidades y textos no vacíos", () => {
    for (const t of Object.values(USER_PROFILE_TEXT)) {
      for (const id of SPECIALTY_IDS) expect(t.specialties[id]).toBeTruthy();
      expect(t.rut && t.passport && t.address).toBeTruthy();
    }
    expect(Object.keys(USER_PROFILE_TEXT)).toHaveLength(9);
  });
});
