import { Input } from "@/components/ui/input";
import { useLanguage, type LangCode } from "@/lib/language";
import { PREFIXES, PREFIX_LABEL, documentKind, documentProblem } from "@/lib/profile-fields";
import { SPECIALTY_IDS, USER_PROFILE_TEXT } from "@/lib/user-profile-i18n";

export type ProfileDraft = { rut: string; address: string; prefix: string; specialty: string };
export const EMPTY_PROFILE: ProfileDraft = { rut: "", address: "", prefix: "", specialty: "" };

type Problem = "rut" | "specialty" | "address" | null;

/** Primer problema de los datos personales (RUT o pasaporte, especialidad del médico, dirección del representante legal), o null. */
export function profileProblem(draft: ProfileDraft, options: { role: string; country?: string; legalRepresentative?: boolean }): Problem {
  if (documentProblem(draft.rut, options.country)) return "rut";
  if (options.role === "medico" && !draft.specialty) return "specialty";
  if (options.legalRepresentative && !draft.address.trim()) return "address";
  return null;
}

export function profileProblemText(problem: Problem, draft: ProfileDraft, country: string | undefined, locale: LangCode): string | null {
  const t = USER_PROFILE_TEXT[locale];
  if (problem === "specialty") return t.specialtyRequired;
  if (problem === "address") return t.legalAddressRequired;
  if (problem !== "rut") return null;
  const kind = documentProblem(draft.rut, country);
  const passport = documentKind(country) === "pasaporte";
  return kind === "required" ? (passport ? t.passportRequired : t.rutRequired) : passport ? t.passportInvalid : t.rutInvalid;
}

/** RUT o pasaporte, dirección, prefijo y (si es médico) especialidad: se usan al crear y al editar a una persona. */
export function ProfileFields({ idPrefix, value, onChange, role, country, legalRepresentative = false, locale, inputClass = "bg-white" }: {
  idPrefix: string; value: ProfileDraft; onChange: (next: ProfileDraft) => void; role: string; country?: string;
  legalRepresentative?: boolean; locale?: LangCode; inputClass?: string;
}) {
  const { lang } = useLanguage();
  const t = USER_PROFILE_TEXT[locale ?? lang];
  const passport = documentKind(country) === "pasaporte";
  const set = (patch: Partial<ProfileDraft>) => onChange({ ...value, ...patch });
  const label = "text-xs font-bold text-slate-600";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="profile-fields">
      <div className="flex flex-col gap-1">
        <label className={label} htmlFor={`${idPrefix}-rut`}>{passport ? t.passport : t.rut} *</label>
        <Input id={`${idPrefix}-rut`} required autoComplete="off" placeholder={passport ? t.passportPlaceholder : t.rutPlaceholder} maxLength={30}
          className={`h-10 rounded-full ${inputClass}`} value={value.rut} onChange={(event) => set({ rut: event.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={label} htmlFor={`${idPrefix}-prefix`}>{t.prefix}</label>
        <select id={`${idPrefix}-prefix`} className={`h-10 rounded-full border border-input px-4 text-sm ${inputClass}`} value={value.prefix} onChange={(event) => set({ prefix: event.target.value })}>
          <option value="">{t.prefixNone}</option>
          {PREFIXES.map((prefix) => <option key={prefix} value={prefix}>{PREFIX_LABEL[prefix]}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}-address`}>{t.address}{legalRepresentative ? " *" : ""}</label>
        <Input id={`${idPrefix}-address`} autoComplete="off" maxLength={200} className={`h-10 rounded-full ${inputClass}`} value={value.address} onChange={(event) => set({ address: event.target.value })} />
        {legalRepresentative && <p className="text-xs text-muted-foreground">{t.addressHint}</p>}
      </div>
      {role === "medico" && (
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className={label} htmlFor={`${idPrefix}-specialty`}>{t.specialty} *</label>
          <select id={`${idPrefix}-specialty`} required className={`h-10 rounded-full border border-input px-4 text-sm ${inputClass}`} value={value.specialty} onChange={(event) => set({ specialty: event.target.value })}>
            <option value="">{t.specialtyPick}</option>
            {SPECIALTY_IDS.map((id) => <option key={id} value={id}>{t.specialties[id]}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

/** El cliente generado no conoce aún los datos personales; se agregan al cuerpo sin que TypeScript lo rechace. */
export function withProfile<T extends object>(base: T, extra: object): T {
  return { ...base, ...extra };
}
