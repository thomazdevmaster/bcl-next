"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import {
  type AccessFormValues,
  accessSchema,
} from "@/domains/users/schemas/access.schema";

export type AccessStageHandlers = {
  validate: () => Promise<boolean>;
  syncToParent: () => Record<string, unknown>;
};

type Props = {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: AccessStageHandlers | null) => void;
  readOnly?: boolean;
  editing?: boolean;
};

export function UserAccessStage({
  values,
  onChange,
  onRegisterHandlers,
  readOnly = false,
  editing = false,
}: Props) {
  const form = useForm<AccessFormValues>({
    defaultValues: {
      username: String(values.username ?? ""),
      password: String(values.password ?? ""),
      confirmPassword: String(values.confirmPassword ?? ""),
      isActive: values.isActive !== false,
    },
    resolver: zodResolver(accessSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { control, trigger, getValues } = form;
  const password = useWatch({ control, name: "password" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });

  const syncToParent = () => ({
    username: getValues("username"),
    password: getValues("password"),
    confirmPassword: getValues("confirmPassword"),
    isActive: getValues("isActive"),
  });
  const syncToParentRef = useRef(syncToParent);

  useEffect(() => {
    syncToParentRef.current = syncToParent;
  });

  useEffect(() => {
    onRegisterHandlers({
      validate: () => trigger(),
      syncToParent: () => syncToParentRef.current(),
    });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <FormStageBlock
          title="Acesso"
          description={
            readOnly
              ? "Dados de acesso desta conta."
              : editing
                ? "Atualize o nome de usuário, a situação da conta e, se desejar, a senha."
                : "Configure a conta que será criada junto com o integrante."
          }
          surface="plain"
          className="!pb-0"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormStageField<AccessFormValues>
              name="username"
              label="Nome de usuário"
              autoComplete="username"
              placeholder="nome.sobrenome"
              formatValue={(value) => value.toLowerCase().replace(/\s+/g, ".")}
              className="sm:col-span-2"
              disabled={readOnly}
              required={false}
              syncParentOn="blur"
              optionalMessage={
                editing
                  ? undefined
                  : "Opcional. Em branco, será gerado a partir do nome do integrante."
              }
              onEdit={() => onChange("username", form.getValues("username"))}
            />
            {!readOnly ? (
              <>
                <FormStageField<AccessFormValues>
                  name="password"
                  label={editing ? "Nova senha" : "Senha inicial"}
                  type="password"
                  autoComplete="new-password"
                  required={Boolean(confirmPassword)}
                  optionalMessage={
                    editing
                      ? "Opcional. Em branco, a senha atual será mantida."
                      : "Opcional. Em branco, será gerada uma senha temporária para o primeiro acesso."
                  }
                  validateOnChange={["password", "confirmPassword"]}
                  onEdit={() =>
                    onChange("password", form.getValues("password"))
                  }
                />
                <FormStageField<AccessFormValues>
                  name="confirmPassword"
                  label="Confirmar senha"
                  type="password"
                  autoComplete="new-password"
                  required={Boolean(password)}
                  optionalMessage="Opcional enquanto a senha inicial estiver vazia."
                  validateOnChange={["password", "confirmPassword"]}
                  onEdit={() =>
                    onChange(
                      "confirmPassword",
                      form.getValues("confirmPassword"),
                    )
                  }
                />
              </>
            ) : null}
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormFieldValidationShell
                  label="Usuário ativo"
                  name={field.name}
                  value={String(field.value)}
                  onBlur={field.onBlur}
                  state="valid"
                  disabled={readOnly}
                  description="Quando ativo, o integrante pode entrar no sistema com esta conta."
                  labelForControl={false}
                  renderControl={({ id, describedBy }) => (
                    <IconCheckbox
                      id={id}
                      name={field.name}
                      inputRef={field.ref}
                      label={
                        field.value ? "Conta habilitada" : "Conta desabilitada"
                      }
                      icon={field.value ? "toggle_on" : "toggle_off"}
                      checked={field.value}
                      disabled={readOnly}
                      aria-describedby={describedBy}
                      onBlur={field.onBlur}
                      onChange={(checked) => {
                        field.onChange(checked);
                        onChange("isActive", checked);
                      }}
                    />
                  )}
                />
              )}
            />
          </div>
        </FormStageBlock>
      </div>
    </FormProvider>
  );
}
