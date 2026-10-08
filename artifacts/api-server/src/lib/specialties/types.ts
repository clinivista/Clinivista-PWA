export type IntakeField = {
  key: string;
  /** Etiqueta en español para el personal de la clínica. */
  label: string;
  type: "text" | "select";
  maxLength?: number;
  /** [clave guardada, texto en español] */
  options?: ReadonlyArray<readonly [string, string]>;
};

export type SpecialtyModule = {
  id: string;
  name: string;
  protocolName: string;
  views: ReadonlyArray<{ key: string; label: string; required: boolean }>;
  phases: ReadonlyArray<{ key: string; name: string; kind?: "diagnosis" }>;
  /** Preguntas propias de la especialidad guardadas en `leads.clinical_data` (capilar usa sus columnas históricas). */
  intake?: ReadonlyArray<IntakeField>;
  /** Copia de los datos clínicos del paciente para la evaluación. */
  clinicalData: (lead: Record<string, unknown>) => Record<string, string>;
};
