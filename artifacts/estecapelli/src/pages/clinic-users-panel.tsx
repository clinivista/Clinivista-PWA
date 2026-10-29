import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import {
  getGetClinicUsersQueryKey,
  useCreateClinicUser,
  useDeleteClinicUser,
  useGetClinicUsers,
  usePatchClinicUser,
  useResetClinicUserPassword,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";
import { UserRow } from "./user-row";
import { useLanguage } from "@/lib/language";
import { USERS_TEXT, withEmail } from "@/lib/users-i18n";
import { ProfileFields, EMPTY_PROFILE, profileProblem, profileProblemText, withProfile, type ProfileDraft } from "@/components/profile-fields";

import { loadErrorDetail } from "@/lib/load-error";

const EMPTY_DRAFT = {
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "medico" as "medico" | "administrativo",
  legalRepresentative: false,
};

// "Usuarios" del panel de una clínica: lo ven los administrativos y el
// representante legal (aunque sea médico). Cada acción es sobre personas de
// esta misma clínica; el servidor lo vuelve a comprobar.
export function ClinicUsersPanel() {
  const { toast } = useToast();
  const { lang } = useLanguage();
  const x = USERS_TEXT[lang];
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useGetClinicUsers();
  const createUser = useCreateClinicUser();
  const patchUser = usePatchClinicUser();
  const resetPassword = useResetClinicUserPassword();
  const deleteUser = useDeleteClinicUser();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE);
  const users = data?.users ?? [];
  const country = (data as { country?: string } | undefined)?.country;

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetClinicUsersQueryKey() });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const problem = profileProblem(profile, { role: draft.role, country, legalRepresentative: draft.legalRepresentative });
    if (problem) {
      toast({ variant: "destructive", title: x.createErrorTitle, description: profileProblemText(problem, profile, country, lang) ?? x.tryAgain });
      return;
    }
    createUser.mutate(
      {
        data: withProfile({
          email: draft.email.trim(),
          name: draft.name.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          password: draft.password,
          role: draft.role,
          legalRepresentative: draft.legalRepresentative,
        }, { rut: profile.rut.trim(), address: profile.address.trim(), prefix: profile.prefix, ...(draft.role === "medico" ? { specialty: profile.specialty } : {}) }),
      },
      {
        onSuccess: async (created) => {
          await refresh();
          setDraft(EMPTY_DRAFT);
          setProfile(EMPTY_PROFILE);
          setAdding(false);
          toast({ title: x.createdTitle, description: withEmail(x.createdDesc, created.email) });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: x.createErrorTitle, description: detail ?? x.tryAgain });
        },
      },
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="bg-white border-b border-[#E8E4DE] p-4 sm:p-6 md:px-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{x.title}</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {x.subtitle}
          </p>
        </div>
        {!adding && (
          <Button className="rounded-full h-12 px-6 font-bold w-full md:w-auto" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 me-2" /> {x.addUser}
          </Button>
        )}
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col gap-3 max-w-4xl">
        {adding && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-[1.5rem] bg-white shadow-sm p-5">
            <h2 className="text-lg font-bold text-foreground">{x.newUser}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder={x.name}
                aria-label={x.name}
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                type="tel"
                autoComplete="off"
                placeholder={x.phoneOptional}
                aria-label={x.phone}
                className="h-10 rounded-full bg-white"
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <Input
                type="email"
                required
                autoComplete="off"
                placeholder={x.email}
                aria-label={x.email}
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={x.passwordMin}
                aria-label={x.password}
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
              />
              <select
                aria-label={x.role}
                className="h-10 rounded-full border border-input bg-[#F5F2EE] px-4 text-sm"
                value={draft.role}
                onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as typeof draft.role }))}
              >
                <option value="medico">{x.medico}</option>
                <option value="administrativo">{x.administrativo}</option>
              </select>
            </div>
            <ProfileFields idPrefix="new-user" value={profile} onChange={setProfile} role={draft.role} country={country} legalRepresentative={draft.legalRepresentative} />
            <div className="flex items-start gap-3">
              <Checkbox
                id="new-user-legal"
                className="mt-0.5"
                checked={draft.legalRepresentative}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, legalRepresentative: checked === true }))}
              />
              <label htmlFor="new-user-legal" className="text-sm text-foreground">
                <span className="font-semibold">{x.legalRep}</span>
                <span className="block text-muted-foreground">
                  {x.legalRepDesc}
                </span>
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full h-10 font-semibold" onClick={() => setAdding(false)}>
                {x.cancel}
              </Button>
              <Button type="submit" className="rounded-full h-10 font-semibold" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {x.createUser}
              </Button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {x.loading}
          </div>
        )}
        {isError && <p role="alert" className="text-sm font-medium text-red-600" data-testid="users-load-error">{x.loadError}{loadErrorDetail(error, x.code) && <span className="block text-xs font-normal text-red-700/80">{loadErrorDetail(error, x.code)}</span>}</p>}

        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.isSelf}
            country={country}
            setActive={async (active) => {
              await patchUser.mutateAsync({ userId: user.id, data: { active } });
              await refresh();
            }}
            setLegalRepresentative={async (legalRepresentative) => {
              await patchUser.mutateAsync({ userId: user.id, data: { legalRepresentative } });
              await refresh();
            }}
            roleEditable
            updateProfile={async (changes) => {
              await patchUser.mutateAsync({ userId: user.id, data: changes });
              await refresh();
            }}
            resetPassword={async () => (await resetPassword.mutateAsync({ userId: user.id })).temporaryPassword}
            onDelete={async () => {
              await deleteUser.mutateAsync({ userId: user.id });
              await refresh();
            }}
          />
        ))}
      </div>
    </div>
  );
}
