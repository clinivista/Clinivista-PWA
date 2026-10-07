import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  getGetDirectorCenterUsersQueryKey,
  useGetDirectorCenterUsers,
  usePatchDirectorCenterUser,
  useResetDirectorCenterUserPassword,
} from "@workspace/api-client-react";
import { UserRow } from "./user-row";

// Se monta solo cuando el director despliega "Usuarios", así la lista se pide
// al servidor únicamente cuando hace falta.
export function CenterUsers({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetDirectorCenterUsers(centerId);
  const patchUser = usePatchDirectorCenterUser();
  const resetPassword = useResetDirectorCenterUserPassword();
  const users = data?.users ?? [];

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E4DE]">
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
          resetPassword={async () => (await resetPassword.mutateAsync({ id: centerId, userId: user.id })).temporaryPassword}
        />
      ))}
    </div>
  );
}
