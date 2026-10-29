import { createHash } from "node:crypto";
import { PLAN_DEFAULT_LIMITS, PLAN_SERVICES, type Plan } from "./plans";
import { COUNTRIES as COUNTRY_NAMES } from "./profiles";

/**
 * Contrato de servicio. Sube CONTRACT_VERSION cada vez que cambie el texto: todas las clínicas
 * quedan «pendientes» de aceptar la nueva versión. El texto es el borrador del documento
 * «Contratos de servicio Clinivista»; los [PRECIO A DEFINIR] y similares deben cerrarse y
 * pasar por revisión legal antes de activar CONTRACTS_ENABLED=true en Render.
 */
export const CONTRACT_VERSION = "2026-10-borrador-2";

export const contractsEnabled = (): boolean => process.env.CONTRACTS_ENABLED === "true";

export type ContractClause = { title: string; body: string };
export type ContractParty = {
  clinic: { name: string; country?: string; rut: string; address: string; phone: string };
  representative: { prefix: string; name: string; rut: string; address: string } | null;
};
export type ContractText = { title: string; version: string; clauses: ContractClause[]; annexTitle: string; annex: { label: string; value: string }[]; hash: string; missing: string[] };

const PLAN_LABEL: Record<Plan, string> = { basic: "Basic", unlimited: "Unlimited", titanium: "Titanium" };

const CLAUSES: ContractClause[] = [
  { title: "1. Objeto", body: "El Proveedor otorga a la Clínica una licencia no exclusiva e intransferible de uso de la Plataforma, con las capacidades del plan contratado descrito en el Anexo." },
  { title: "2. Plan, cuotas y límites", body: "Cada plan fija cupos de pacientes nuevos por mes, almacenamiento, transcripciones por mes y horas de servicio incluidas. Los límites podrán ajustarse por escrito para una Clínica determinada; un límite en 0 significa sin límite." },
  { title: "3. Contador de uso", body: "La Plataforma muestra a la Clínica, en su panel administrativo, el uso del mes y el saldo de horas. Al llegar al 80% de una cuota se muestra un aviso; al llegar al 100% se informa que el cupo está completo." },
  { title: "4. Efecto de alcanzar una cuota", body: "Con la cuota de pacientes o de almacenamiento completa, la Plataforma no permite crear nuevos pacientes ni subir nuevas fotos o videos hasta el mes siguiente (pacientes), o hasta ampliar el plan o el almacenamiento. Los datos ya almacenados siguen accesibles y no se borran por esta causa." },
  { title: "5. Almacenamiento adicional", body: "La Clínica puede pasar a un tramo de almacenamiento superior. El precio sube por tramo, según la tarifa vigente informada por escrito antes de aplicarla; el cambio rige desde que la Clínica lo acepta." },
  { title: "6. Horas de servicio", body: "Las horas incluidas en la contratación inicial se destinan a inducción y personalización. Agotadas, las Clínicas con plan Unlimited o Titanium pueden comprar horas adicionales al valor por hora vigente [VALOR HORA A DEFINIR]. El plan Basic no incluye compra de horas. Las horas no usadas [CADUCAN / SE ACUMULAN: A DEFINIR] y se registran en un libro de horas visible para la Clínica." },
  { title: "7. Mejoras a medida", body: "Solo las Clínicas con plan Titanium pueden solicitar mejoras a medida. Cada una se cotiza por escrito en número de horas antes de iniciarse, con alcance, plazo y entregables; no comienza sin aceptación de la Clínica. Cambios de alcance se cotizan aparte." },
  { title: "8. Cambio de plan", body: "El aumento de plan (upgrade) rige de inmediato desde la solicitud, y se cobra la diferencia [PRORRATEO A DEFINIR]. La baja de plan (downgrade) rige al término del período pagado, salvo acuerdo distinto. Si al bajar de plan el uso supera los nuevos límites, los datos se conservan, pero no podrán crearse nuevos pacientes ni subirse archivos hasta volver bajo el límite. Al bajar de Titanium se terminan las mejoras a medida no iniciadas; las iniciadas se rigen por su cotización." },
  { title: "9. Precio y pago", body: "El precio es el del Anexo [PRECIO A DEFINIR: moneda, IVA y periodicidad]. El pago se hace [MEDIO DE PAGO A DEFINIR] por período anticipado. El Proveedor puede reajustar precios con aviso escrito de 30 días." },
  { title: "10. Mora, aviso y suspensión", body: "Si el pago no se recibe, el servicio sigue estas etapas contadas desde la Fecha de vencimiento: aviso desde 7 días antes; gracia hasta 5 días después, sin restricciones; solo lectura hasta el día 20, sin crear pacientes ni subir archivos; suspensión desde el día 21. Estas restricciones se aplican solo a las Clínicas que tengan activado el cobro automático. Pagado lo adeudado, el servicio se restablece de inmediato." },
  { title: "11. Datos de pacientes", body: "La Clínica es responsable de los datos personales y sensibles (salud, imágenes) de sus pacientes y de contar con su consentimiento informado. El Proveedor actúa como encargado de tratamiento: los trata solo siguiendo instrucciones de la Clínica y para prestar el servicio." },
  { title: "12. Seguridad", body: "El Proveedor aplica medidas razonables: acceso con credenciales, aislamiento de datos entre clínicas, almacenamiento cifrado en proveedores de infraestructura y respaldos. Avisa a la Clínica sin demora indebida de cualquier vulneración que afecte sus datos. [DETALLAR PLAZO Y MEDIDAS CON ASESOR]." },
  { title: "13. Confidencialidad", body: "Ambas partes mantienen reserva sobre la información no pública de la otra, durante el contrato y [3] años después." },
  { title: "14. Propiedad", body: "La Plataforma y sus mejoras pertenecen al Proveedor. Los datos y fotografías de la Clínica y sus pacientes pertenecen a la Clínica. Una mejora a medida pertenece al Proveedor, que otorga a la Clínica su uso mientras el contrato esté vigente, salvo pacto expreso distinto en la cotización." },
  { title: "15. Disponibilidad y soporte", body: "El Proveedor procura mantener la Plataforma disponible, sin garantía de operación ininterrumpida; las mantenciones se avisan cuando sea posible. Soporte por [CANAL Y HORARIO A DEFINIR]. La atención personalizada se descuenta del saldo de horas." },
  { title: "16. Uso de inteligencia artificial", body: "Las transcripciones y los análisis automáticos son apoyo para el profesional y no reemplazan su juicio clínico. La Clínica es responsable de revisar los resultados antes de usarlos con pacientes." },
  { title: "17. Responsabilidad", body: "La Plataforma no entrega diagnósticos ni decisiones médicas. La responsabilidad del Proveedor se limita a los valores pagados por la Clínica en los [12] meses previos, salvo dolo o culpa grave. [VALIDAR CON ABOGADO]." },
  { title: "18. Duración, término y datos al terminar", body: "El contrato dura [12 MESES] y se renueva por períodos iguales salvo aviso escrito de [30] días. Al terminar, la Clínica puede exportar sus datos durante [30] días; después el Proveedor los elimina, salvo lo que la ley obligue a conservar. Rige la ley chilena; tribunales de [CIUDAD]." },
];

const num = (value: number, unit = ""): string => (value === 0 ? "Sin límite" : `${new Intl.NumberFormat("es-CL").format(value)}${unit}`);

function annexOf(plan: Plan): { label: string; value: string }[] {
  const limits = PLAN_DEFAULT_LIMITS[plan];
  const services = PLAN_SERVICES[plan];
  return [
    { label: "Pacientes nuevos por mes", value: num(limits.patientsPerMonth) },
    { label: "Almacenamiento", value: num(limits.storageGb, " GB") },
    { label: "Transcripciones por mes", value: String(limits.transcriptionsPerMonth) },
    { label: "Horas de servicio incluidas", value: limits.includedHours > 0 ? `${limits.includedHours} (inducción y personalización inicial)` : "0 (sin inducción incluida)" },
    { label: "Compra de horas adicionales", value: services.buyHours ? "Disponible, [VALOR HORA A DEFINIR]" : "No disponible" },
    { label: "Mejoras a medida", value: services.customWork ? "Disponible, cotizadas en horas antes de iniciar" : "No disponible" },
    { label: "Edición de Fases", value: "Incluida" },
    { label: "Precio mensual", value: "[PRECIO A DEFINIR]" },
  ];
}

const blank = (value: string | undefined | null, placeholder: string): string => (value && value.trim() ? value.trim() : placeholder);

/** Datos que faltan para que el contrato pueda aceptarse (aparecen como [PENDIENTE] en el texto). */
const isChile = (party?: ContractParty) => (party?.clinic.country ?? "CL") === "CL";

export function missingPartyData(party?: ContractParty): string[] {
  const missing: string[] = [];
  const doc = isChile(party) ? "RUT" : "pasaporte";
  if (!party?.clinic.rut.trim()) missing.push(`${doc} de la clínica`);
  if (!party?.clinic.address.trim()) missing.push("dirección de la clínica");
  if (!party?.clinic.phone.trim()) missing.push("teléfono de la clínica");
  if (!party?.representative) missing.push("representante legal");
  else {
    if (!party.representative.name.trim()) missing.push("nombre del representante legal");
    if (!party.representative.rut.trim()) missing.push(`${doc} del representante legal`);
    if (!party.representative.address.trim()) missing.push("dirección del representante legal");
  }
  return missing;
}

/** Cláusula de comparecencia con los datos de la clínica y de su representante legal. */
function appearance(party?: ContractParty): ContractClause {
  const clinic = party?.clinic;
  const rep = party?.representative;
  const chile = isChile(party);
  const docOf = (value: string | undefined, pending: string) => (chile ? `RUT ${blank(value, pending)}` : `pasaporte N° ${blank(value, pending)}`);
  const person = rep ? [rep.prefix, blank(rep.name, "[NOMBRE DEL REPRESENTANTE LEGAL PENDIENTE]")].filter(Boolean).join(" ") : "[REPRESENTANTE LEGAL PENDIENTE]";
  return {
    title: "Comparecencia",
    body:
      `Entre Clinivista, [RAZÓN SOCIAL, RUT Y DOMICILIO DEL PROVEEDOR] (el «Proveedor»), y ${blank(clinic?.name, "[NOMBRE DE LA CLÍNICA]")}, ` +
      `${docOf(clinic?.rut, chile ? "[RUT DE LA CLÍNICA PENDIENTE]" : "[PASAPORTE DE LA CLÍNICA PENDIENTE]")}, con domicilio en ${blank(clinic?.address, "[DIRECCIÓN DE LA CLÍNICA PENDIENTE]")}${chile ? "" : `, ${COUNTRY_NAMES[clinic?.country ?? ""] ?? ""}`}, ` +
      `teléfono ${blank(clinic?.phone, "[TELÉFONO PENDIENTE]")} (la «Clínica»), representada por ${person}, ` +
      `${chile ? "cédula de identidad " : ""}${docOf(rep?.rut, chile ? "[RUT DEL REPRESENTANTE PENDIENTE]" : "[PASAPORTE DEL REPRESENTANTE PENDIENTE]").replace(/^RUT /, "")}, con domicilio en ${blank(rep?.address, "[DIRECCIÓN DEL REPRESENTANTE PENDIENTE]")}, ` +
      `en su calidad de representante legal, se acuerda el presente contrato de servicio.`,
  };
}

export function contractFor(plan: Plan, party?: ContractParty): ContractText {
  const title = "Contrato de servicio Clinivista";
  const annexTitle = `Anexo: Plan ${PLAN_LABEL[plan]}`;
  const annex = annexOf(plan);
  const clauses = [appearance(party), ...CLAUSES];
  const canonical = JSON.stringify({ version: CONTRACT_VERSION, plan, title, clauses, annexTitle, annex });
  return { title, version: CONTRACT_VERSION, clauses, annexTitle, annex, hash: createHash("sha256").update(canonical).digest("hex"), missing: missingPartyData(party) };
}
