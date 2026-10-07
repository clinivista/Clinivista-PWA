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
import { useToast } from "@/hooks/use-toast";
import { UserRow } from "./user-row";

const EMPTY_DRAFT = {
  name: "",
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
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetClinicUsers();
  const createUser = useCreateClinicUser();
  const patchUser = usePatchClinicUser();
  const resetPassword = useResetClinicUserPassword();
  const deleteUser = useDeleteClinicUser();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const users = data?.users ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetClinicUsersQueryKey() });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      {
        data: {
          email: draft.email.trim(),
          name: draft.name.trim() || undefined,
          password: draft.password,
          role: draft.role,
          legalRepresentative: draft.legalRepresentative,
        },
      },
      {
        onSuccess: async (created) => {
          await refresh();
          setDraft(EMPTY_DRAFT);
          setAdding(false);
          toast({ title: "Usuario creado", description: `${created.email} ya puede iniciar sesión.` });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos crear el usuario", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <header className="bg-white border-b border-[#E8E4DE] p-4 sm:p-6 md:px-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Crea, bloquea, restablece la contraseña o elimina a las personas de tu clínica.
          </p>
        </div>
        {!adding && (
          <Button className="rounded-full h-12 px-6 font-bold w-full md:w-auto" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-2" /> Agregar usuario
          </Button>
        )}
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col gap-3 max-w-4xl">
        {adding && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-[1.5rem] bg-white shadow-sm p-5">
            <h2 className="text-lg font-bold text-foreground">Nuevo usuario</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Nombre"
                aria-label="Nombre"
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                type="email"
                required
                autoComplete="off"
                placeholder="Correo"
                aria-label="Correo"
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Contraseña (mín. 8)"
                aria-label="Contraseña"
                className="h-10 rounded-full bg-[#F5F2EE]"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
              />
              <select
                aria-label="Rol"
                className="h-10 rounded-full border border-input bg-[#F5F2EE] px-4 text-sm"
                value={draft.role}
                onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as typeof draft.role }))}
              >
                <option value="medico">Médico</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="new-user-legal"
                className="mt-0.5"
                checked={draft.legalRepresentative}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, legalRepresentative: checked === true }))}
              />
              <label htmlFor="new-user-legal" className="text-sm text-foreground">
                <span className="font-semibold">Representante legal</span>
                <span className="block text-muted-foreground">
                  Podrá gestionar los usuarios de la clínica, aunque sea médico.
                </span>
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full h-10 font-semibold" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-full h-10 font-semibold" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Crear usuario
              </Button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando usuarios…
          </div>
        )}
        {isError && <p className="text-sm font-medium text-red-600">No pudimos cargar los usuarios.</p>}

        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.isSelf}
            setActive={async (active) => {
              await patchUser.mutateAsync({ userId: user.id, data: { active } });
              await refresh();
            }}
            setLegalRepresentative={async (legalRepresentative) => {
              await patchUser.mutateAsync({ userId: user.id, data: { legalRepresentative } });
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
