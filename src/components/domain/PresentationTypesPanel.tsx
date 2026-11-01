"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import {
  replaceOrAppendPresentationType,
  savePresentationType,
} from "@/domains/presentations/savePresentationType";
import {
  type EventTypeFormValues,
  eventTypeSchema,
} from "@/domains/presentations/schemas/event-type.schema";
import type { PresentationType } from "@/domains/presentations/types";
import { userFacingError } from "@/lib/userMessages";

import { PresentationTypeForm } from "./PresentationTypeForm";
import { PresentationTypesFeedback } from "./PresentationTypesFeedback";
import { PresentationTypesList } from "./PresentationTypesList";
import { usePresentationTypes } from "./usePresentationTypes";

const emptyType: EventTypeFormValues = {
  name: "",
  icon: "",
  isPublicByDefault: false,
  isActive: true,
};

function toFormValues(type: PresentationType): EventTypeFormValues {
  return {
    name: type.name,
    icon: type.icon ?? "",
    isPublicByDefault: type.isPublicByDefault,
    isActive: type.isSystem ? true : type.isActive,
  };
}

export function PresentationTypesPanel() {
  const { roles, permissions } = useAuth();
  const canManage = can(roles, "presentations", "update", permissions);
  const { types, setTypes, loading, error, loadTypes } = usePresentationTypes();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<PresentationType | null>(null);
  const form = useForm<EventTypeFormValues>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: emptyType,
    mode: "onTouched",
  });
  const title = editingType ? "Editar tipo de evento" : "Novo tipo de evento";
  const sortedTypes = useMemo(
    () =>
      [...types].sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR"),
      ),
    [types],
  );

  const openCreate = () => {
    setEditingType(null);
    form.reset(emptyType);
    setSaveError(null);
    setFormOpen(true);
  };

  const openEdit = (type: PresentationType) => {
    setEditingType(type);
    form.reset(toFormValues(type));
    setSaveError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setSaveError(null);
    setFormOpen(false);
    setEditingType(null);
    form.reset(emptyType);
  };

  const saveType = async (values: EventTypeFormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await savePresentationType(values, editingType);
      setTypes((current) =>
        replaceOrAppendPresentationType(current, saved, Boolean(editingType)),
      );
      setFormOpen(false);
      setEditingType(null);
      form.reset(emptyType);
    } catch (caught) {
      setSaveError(
        userFacingError(caught, "Não foi possível salvar o tipo de evento."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <PresentationTypesList
        types={sortedTypes}
        canManage={canManage && !formOpen}
        onCreate={openCreate}
        onEdit={openEdit}
      />

      <PresentationTypesFeedback
        error={error}
        loading={loading}
        empty={sortedTypes.length === 0}
        formOpen={formOpen}
        onRetry={() => void loadTypes()}
      />

      {formOpen ? (
        <PresentationTypeForm
          form={form}
          editingType={editingType}
          title={title}
          saving={saving}
          error={saveError}
          onSubmit={saveType}
          onCancel={closeForm}
        />
      ) : null}
    </section>
  );
}
