import { useQuery } from "@tanstack/react-query";

export type ClinicPlanId = "basic" | "unlimited" | "titanium";
export type Acceptance = { id: string; plan: string; version: string; byName: string; acceptedAt: string };
export type ContractBody = { title: string; version: string; hash: string; clauses: { title: string; body: string }[]; annexTitle: string; annex: { label: string; value: string }[] };
export type ContractView =
  | { enabled: false }
  | { enabled: true; plan: ClinicPlanId; accepted: boolean; acceptance: Acceptance | null; canAccept: boolean; contract: ContractBody };
export type PlanCatalog = {
  canManage: boolean;
  current: ClinicPlanId;
  plans: Array<{
    id: ClinicPlanId;
    limits: { patientsPerMonth: number; storageGb: number; transcriptionsPerMonth: number; includedHours: number };
    services: { buyHours: boolean; customWork: boolean };
  }>;
};

export const CONTRACT_KEY = ["clinic-contract"] as const;
export const CATALOG_KEY = ["clinic-plan-catalog"] as const;

export function useClinicContract() {
  return useQuery({
    queryKey: CONTRACT_KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/contract", { credentials: "same-origin" });
      if (!response.ok) throw new Error("contract");
      return (await response.json()) as ContractView;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function usePlanCatalog() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/plan-catalog", { credentials: "same-origin" });
      if (!response.ok) throw new Error("catalog");
      return (await response.json()) as PlanCatalog;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
