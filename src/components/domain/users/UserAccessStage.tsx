"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import {
  accessSchema,
  type AccessFormValues,
} from "@/domains/users/schemas/access.schema";

export type AccessStageHandlers = { validate: () => Promise<boolean> };

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
  const { control, trigger } = form;
  const password = useWatch({ control, name: "password" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });

  useEffect(() => {
    onRegisterHandlers({ validate: () => trigger() });
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
                  onEdit={() => onChange("password", form.getValues("password"))}
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
                    onChange("confirmPassword", form.getValues("confirmPassword"))
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
                  renderControl={({ id, describedBy }) => (
                    <div className="flex min-h-11 items-center gap-3">
                      <input
                        ref={field.ref}
                        id={id}
                        name={field.name}
                        type="checkbox"
                        disabled={readOnly}
                        checked={field.value}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          field.onChange(event);
                          onChange("isActive", event.target.checked);
                        }}
                        aria-describedby={describedBy}
                        className="size-5 accent-[var(--ring)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        {field.value
                          ? "Conta habilitada"
                          : "Conta desabilitada"}
                      </span>
                    </div>
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
