import type { PresentationType } from "@/domains/presentations/types";

interface PresentationTypesListProps {
  types: PresentationType[];
  canManage: boolean;
  onCreate: () => void;
  onEdit: (type: PresentationType) => void;
}

export function PresentationTypesList({
  types,
  canManage,
  onCreate,
  onEdit,
}: PresentationTypesListProps) {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tipos de evento</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Organize os eventos da Agenda com tipos configuráveis.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="btn-primary min-h-11 px-4"
            onClick={onCreate}
          >
            Novo tipo
          </button>
        ) : null}
      </header>

      {types.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {types.map((type) => (
            <PresentationTypeListItem
              key={type.id}
              type={type}
              canManage={canManage}
              onEdit={onEdit}
            />
          ))}
        </ul>
      ) : null}
    </>
  );
}

function PresentationTypeListItem({
  type,
  canManage,
  onEdit,
}: {
  type: PresentationType;
  canManage: boolean;
  onEdit: (type: PresentationType) => void;
}) {
  const activity = type.isSystem
    ? "Predefinido"
    : type.isActive
      ? "Ativo"
      : "Inativo";
  const visibility = type.isPublicByDefault
    ? "Público por padrão"
    : "Interno por padrão";

  return (
    <li className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="material-icons mt-0.5 text-xl text-[var(--color-brand-strong)]"
          aria-hidden="true"
        >
          {type.icon || "event"}
        </span>
        <div className="min-w-0">
          <h3 className="break-words font-semibold">{type.name}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {activity} · {visibility}
          </p>
        </div>
      </div>
      {canManage ? (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-[var(--color-brand-strong)] underline underline-offset-2"
          aria-label={`Editar ${type.name}`}
          onClick={() => onEdit(type)}
        >
          Editar
        </button>
      ) : null}
    </li>
  );
}
