import { db, leadsTable } from "@workspace/db";
import { uid } from "./helpers";
import { defaultProtocolIdForCenter, ensureClinicalConfiguration } from "./clinical-photos";

// Fictitious patients for demo clinics. Every name, phone and detail here is
// invented — never copy real patient data into this list. They carry no
// photos (those live in private object storage) and no RUT, so they can never
// collide with the per-clinic RUT uniqueness index.
const SAMPLE_PATIENTS = [
  {
    name: "Carlos Rojas (demo)",
    phone: "+56900000001",
    age: "34",
    city: "Santiago",
    status: "nuevo",
    consent: false,
  },
  {
    name: "Andrés Molina (demo)",
    phone: "+56900000002",
    age: "41",
    city: "Viña del Mar",
    status: "incompleto",
    consent: true,
    hairLossTime: "3 a 5 años",
    pattern: "Entradas y coronilla",
  },
  {
    name: "Felipe Navarro (demo)",
    phone: "+56900000003",
    age: "29",
    city: "Concepción",
    status: "listo",
    consent: true,
    hairLossTime: "1 a 2 años",
    pattern: "Entradas",
    previousTreatment: "Minoxidil",
    norwood: "III",
  },
  {
    name: "Diego Fuentes (demo)",
    phone: "+56900000004",
    age: "47",
    city: "Santiago",
    status: "agendado",
    consent: true,
    hairLossTime: "Más de 8 años",
    pattern: "Coronilla y zona frontal",
    previousTreatment: "Finasteride y minoxidil",
    norwood: "V",
    appointmentAt: "Por confirmar",
  },
] as const;

/** Inserts the fictitious demo patients into `centerId` and returns how many. */
export async function seedSamplePatients(centerId: string): Promise<number> {
  const protocolId = defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, protocolId);

  await db.insert(leadsTable).values(
    SAMPLE_PATIENTS.map((patient) => ({
      id: uid(),
      token: uid(24),
      photos: [],
      photoCount: "0",
      notes: "",
      symptoms: "",
      surgeryHistory: "",
      isDemo: true,
      centerId,
      protocolId,
      ...patient,
    })),
  );
  return SAMPLE_PATIENTS.length;
}
