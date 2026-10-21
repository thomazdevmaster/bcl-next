import { UserApprovals } from "@/components/domain/UserApprovals";
import { UsersWorkspace } from "@/components/domain/users/UsersWorkspace";

export default function UsuariosPage() {
  return (
    <div className="mx-auto space-y-6">
      <UserApprovals layout="columns" />
      <UsersWorkspace createHeading="Usuários" />
    </div>
  );
}
