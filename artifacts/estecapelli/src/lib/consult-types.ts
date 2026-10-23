import { useQuery } from "@tanstack/react-query";

export type ConsultType = { id: string; name: string; isBase: boolean; active: boolean; templateKey: string; patientCount: number };
export type ConsultTypes = {
  enabled: boolean;
  canEdit: boolean;
  types: ConsultType[];
  templates: Array<{ key: string; name: string }>;
};

export const CONSULT_TYPES_KEY = ["clinic-consult-types"] as const;

export async function fetchConsultTypes(): Promise<ConsultTypes> {
  const response = await fetch("/api/clinic/consult-types", { credentials: "same-origin" });
  if (!response.ok) throw new Error("consult-types");
  return (await response.json()) as ConsultTypes;
}

/** Tipos de consulta del centro; solo los centros de dermatología tienen más de uno. */
export function useConsultTypes() {
  return useQuery({ queryKey: CONSULT_TYPES_KEY, queryFn: fetchConsultTypes, staleTime: 30_000, retry: false });
}

/** Tipos que se pueden elegir al agregar un paciente o una consulta. */
export const selectableTypes = (data: ConsultTypes | undefined): ConsultType[] =>
  data?.enabled ? data.types.filter((type) => type.isBase || type.active) : [];
