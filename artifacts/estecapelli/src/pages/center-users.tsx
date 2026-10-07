import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import {
  getGetDirectorCentersQueryKey,
  getGetDirectorCenterUsersQueryKey,
  useCreateDirectorCenterUser,
  useGetDirectorCenterUsers,
  usePatchDirectorCenterUser,
  useResetDirectorCenterUserPassword,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserRow } from "./user-row";

const EMPTY_DRAFT = { name: "", email: "", password: "", role: "medico" as "medico" | "administrativo", legalRepresentative: false };

// Se monta solo cuando el director despliega "Usuarios", así la lista se pide
// al servidor únicamente cuando hace falta.
export function CenterUsers({ centerId }: { centerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetDirectorCenterUsers(centerId);
  const createUser = useCreateDirectorCenterUser();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const patchUser = usePatchDirectorCenterUser();
  const resetPassword = useResetDirectorCenterUserPassword();
  const users = data?.users ?? [];

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      { id: centerId, data: { email: draft.email.trim(), name: draft.name.trim() || undefined, password: draft.password, role: draft.role, legalRepresentative: draft.legalRepresentative } },
      {
        onSuccess: async (created) => {
          await queryClient.invalidateQueries({ queryKey: getGetDirectorCenterUsersQueryKey(centerId) });
          // El contador "N personal" de la tarjeta vive en la lista de clínicas.
          await queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
          setDraft(EMPTY_DRAFT);
          setAdding(false);
          toast({ title: "Usuario creado", description: `${created.email} ya puede iniciar sesión en esta clínica.` });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos crear el usuario", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E4DE]">
      {!adding ? (
        <Button className="rounded-full h-10 font-semibold self-start" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-2" /> Agregar usuario
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl bg-[#F5F2EE] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nombre"
              aria-label="Nombre"
              className="h-10 rounded-full bg-white"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              type="email"
              required
              autoComplete="off"
              placeholder="Correo"
              aria-label="Correo"
              className="h-10 rounded-full bg-white"
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
              className="h-10 rounded-full bg-white"
              value={draft.password}
              onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
            />
            <select
              aria-label="Rol"
              className="h-10 rounded-full border border-input bg-white px-4 text-sm"
              value={draft.role}
              onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as typeof draft.role }))}
            >
              <option value="medico">Médico</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`new-legal-${centerId}`}
              checked={draft.legalRepresentative}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, legalRepresentative: checked === true }))}
            />
            <label htmlFor={`new-legal-${centerId}`} className="text-sm font-semibold text-foreground">
              Representante legal (gestiona los usuarios de la clínica)
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
      {!isLoading && !isError && users.length === 0 && (
        <p className="text-sm text-muted-foreground font-medium">Esta clínica todavía no tiene usuarios.</p>
      )}

      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          setActive={async (active) => {
            await patchUser.mutateAsync({ id: centerId, userId: user.id, data: { active } });
            await queryClient.invalidateQueries({ queryKey: getGetDirectorCenterUsersQueryKey(centerId) });
          }}
          setLegalRepresentative={async (legalRepresentative) => {
            await patchUser.mutateAsync({ id: centerId, userId: user.id, data: { legalRepresentative } });
            await queryClient.invalidateQueries({ queryKey: getGetDirectorCenterUsersQueryKey(centerId) });
          }}
          resetPassword={async () => (await resetPassword.mutateAsync({ id: centerId, userId: user.id })).temporaryPassword}
        />
      ))}
    </div>
  );
}
