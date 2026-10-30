export interface MobileTableAction {
  label: string;
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface TableRowAction extends MobileTableAction {
  id: string;
  href?: string;
  disabledTitle?: string;
}

interface CrudActionConfig {
  onSelect: () => void;
  href?: string;
  label?: string;
  disabled?: boolean;
  disabledTitle?: string;
}

export function createCrudTableRowActions({
  view,
  edit,
  remove,
  extras = [],
}: {
  view?: CrudActionConfig;
  edit?: CrudActionConfig;
  remove?: CrudActionConfig;
  extras?: TableRowAction[];
}): TableRowAction[] {
  return [
    ...extras,
    ...(view ? [{ id: "view", label: view.label ?? "Visualizar", icon: "visibility", ...view }] : []),
    ...(edit ? [{ id: "edit", label: edit.label ?? "Editar", icon: "edit", ...edit }] : []),
    ...(remove ? [{ id: "delete", label: remove.label ?? "Excluir", icon: "delete", danger: true, ...remove }] : []),
  ];
}
