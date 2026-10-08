import * as capilarModule from "./capilar";
import { plastica } from "./plastica";
import type { SpecialtyModule } from "./types";

export type { IntakeField, SpecialtyModule } from "./types";
export { cleanIntake } from "./plastica";

export const SPECIALTY_IDS = ["capilar", "plastica"] as const;
export type SpecialtyId = (typeof SPECIALTY_IDS)[number];

const capilar: SpecialtyModule = {
  id: capilarModule.SPECIALTY_ID,
  name: "Capilar",
  protocolName: "Protocolo capilar inicial",
  views: capilarModule.PROTOCOL_VIEWS,
  phases: capilarModule.DEFAULT_PHASES,
  clinicalData: (lead) => capilarModule.clinicalDataFromLead(lead) as Record<string, string>,
};

const MODULES: Record<SpecialtyId, SpecialtyModule> = { capilar, plastica };

export const toSpecialtyId = (value: unknown): SpecialtyId =>
  (SPECIALTY_IDS as readonly string[]).includes(String(value)) ? (value as SpecialtyId) : "capilar";

export const getSpecialty = (value: unknown): SpecialtyModule => MODULES[toSpecialtyId(value)];
