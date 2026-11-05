import { BOOKING_INTEGRATIONS, bookingLinksOf, type ClinicContact } from "./integrations";
import { clinicProfileOf } from "./profiles";

/** Cómo agenda su hora un paciente de esta clínica: teléfono, WhatsApp y link de agendamiento en línea (los que la clínica haya puesto). */
export async function clinicContact(centerId: string): Promise<ClinicContact> {
  const [profile, links] = await Promise.all([clinicProfileOf(centerId), bookingLinksOf(centerId)]);
  const booking = BOOKING_INTEGRATIONS.find((id) => links[id]);
  return { phone: profile.phone, whatsapp: profile.whatsapp, bookingUrl: booking ? links[booking] : "", bookingName: booking ?? "" };
}
