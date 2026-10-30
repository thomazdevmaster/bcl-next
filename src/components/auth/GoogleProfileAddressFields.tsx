"use client";

import { useRef, useState } from "react";
import { useFormContext, useWatch, type UseFormSetValue } from "react-hook-form";
import { FormStageField } from "@/components/forms/FormStageField";
import { MusicLoader } from "@/components/MusicLoader";
import { formatPostalCode, lookupCep, type CepAddress } from "@/domains/people/cep";
import { formatCpf } from "@/domains/people/types";
import type { GoogleCompletionFormValues } from "@/domains/users/schemas/google-completion.schema";
import { userFacingError } from "@/lib/userMessages";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

type AddressInputName =
  | "street"
  | "complement"
  | "neighborhood"
  | "city"
  | "state";

function applyCepAddress(
  address: CepAddress,
  setValue: UseFormSetValue<GoogleCompletionFormValues>,
) {
  setValue("postalCode", address.postalCode, { shouldDirty: true, shouldValidate: true });
  setValue("street", address.street, { shouldDirty: true, shouldValidate: true });
  setValue("complement", address.complement, { shouldDirty: true, shouldValidate: true });
  setValue("neighborhood", address.neighborhood, { shouldDirty: true, shouldValidate: true });
  setValue("city", address.city, { shouldDirty: true, shouldValidate: true });
  setValue("state", address.state as GoogleCompletionFormValues["state"], {
    shouldDirty: true,
    shouldValidate: true,
  });
}

function PersonalSelectField({
  name,
  label,
  options,
  disabled = false,
}: {
  name: "state";
  label: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const { register, formState } = useFormContext<GoogleCompletionFormValues>();
  const error = formState.errors[name]?.message;
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        {...register(name)}
        disabled={disabled}
        className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-base disabled:opacity-60"
        aria-invalid={error ? true : undefined}
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs text-[var(--destructive)]" role="alert">
          {String(error)}
        </span>
      ) : null}
    </label>
  );
}

export function GoogleProfileAddressFields() {
  const { setValue, getValues, trigger, register, formState } =
    useFormContext<GoogleCompletionFormValues>();
  const [cepLookupState, setCepLookupState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [cepLookupMessage, setCepLookupMessage] = useState("");
  const lastRequestedCep = useRef("");
  const cepRequest = useRef<AbortController | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<AddressInputName>>(
    () => new Set(),
  );

  const syncCep = () => {
    void trigger("postalCode");
    const digits = getValues("postalCode").replace(/\D/g, "");
    if (digits.length !== 8) {
      cepRequest.current?.abort();
      lastRequestedCep.current = "";
      setCepLookupState("idle");
      setCepLookupMessage("");
      return;
    }
    if (lastRequestedCep.current === digits) return;

    cepRequest.current?.abort();
    const request = new AbortController();
    cepRequest.current = request;
    lastRequestedCep.current = digits;
    setCepLookupState("loading");
    setCepLookupMessage("");

    void lookupCep(digits, request.signal)
      .then((address) => {
        if (cepRequest.current !== request) return;
        applyCepAddress(address, setValue);
        const filled = new Set<AddressInputName>(
          (["street", "complement", "neighborhood", "city", "state"] as const).filter(
            (name) => Boolean(address[name === "state" ? "state" : name]?.trim()),
          ),
        );
        setAutoFilledFields(filled);
        setCepLookupState("success");
        setCepLookupMessage("Endereço preenchido pelo CEP.");
        void trigger(["street", "neighborhood", "city", "state"]);
      })
      .catch((caught: unknown) => {
        if (request.signal.aborted) return;
        lastRequestedCep.current = "";
        setCepLookupState("error");
        setCepLookupMessage(userFacingError(caught));
      })
      .finally(() => {
        if (cepRequest.current === request) cepRequest.current = null;
      });
  };

  const documentType = useWatch({ name: "documentType" });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm">
            <span className="font-medium">Documento</span>
            <select
              {...register("documentType")}
              className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-base"
            >
              <option value="none">Não informar por enquanto</option>
              <option value="cpf">CPF</option>
              <option value="rg">RG</option>
            </select>
            <span className="text-xs text-[var(--muted)]">
              Opcional. Você pode completar depois com a equipe da banda.
            </span>
            {formState.errors.documentType ? (
              <span className="text-xs text-[var(--destructive)]" role="alert">
                {String(formState.errors.documentType.message)}
              </span>
            ) : null}
          </label>
        </div>
        {documentType === "cpf" || documentType === "rg" ? (
          <FormStageField<GoogleCompletionFormValues>
            name="documentNumber"
            label="Número do documento"
            className="sm:col-span-2"
            required={false}
            optionalMessage="Opcional neste passo."
            placeholder={documentType === "cpf" ? "000.000.000-00" : "Número do RG"}
            formatValue={
              documentType === "cpf"
                ? formatCpf
                : (value) => value.toLocaleUpperCase("pt-BR").slice(0, 14)
            }
            infoMessage={
              documentType === "cpf"
                ? "Se informar, use um CPF válido."
                : "Se informar, use de 5 a 14 caracteres."
            }
          />
        ) : null}
      </div>

      {cepLookupState === "loading" ? (
        <div className="flex min-h-48 items-center justify-center">
          <MusicLoader label="Consultando CEP…" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormStageField<GoogleCompletionFormValues>
            name="postalCode"
            label="CEP"
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="00000-000"
            formatValue={formatPostalCode}
            className="sm:col-span-2"
            infoMessage="Informe o CEP com 8 dígitos para buscar o endereço."
            onEdit={syncCep}
          />
          {cepLookupState === "error" || cepLookupState === "success" ? (
            <p
              role={cepLookupState === "error" ? "alert" : undefined}
              aria-live="polite"
              className={`sm:col-span-2 text-xs ${cepLookupState === "error" ? "text-[var(--destructive)]" : "text-[var(--success)]"}`}
            >
              {cepLookupMessage}
            </p>
          ) : null}
          <FormStageField<GoogleCompletionFormValues>
            name="street"
            label="Logradouro"
            autoComplete="address-line1"
            className="sm:col-span-2"
            disabled={autoFilledFields.has("street")}
            infoMessage="Rua, avenida ou travessa."
          />
          <FormStageField<GoogleCompletionFormValues>
            name="addressNumber"
            label="Número"
            placeholder="Número ou S/N"
            infoMessage="Informe o número da residência."
          />
          <FormStageField<GoogleCompletionFormValues>
            name="complement"
            label="Complemento"
            autoComplete="address-line2"
            disabled={autoFilledFields.has("complement")}
            optionalMessage="Opcional."
          />
          <FormStageField<GoogleCompletionFormValues>
            name="neighborhood"
            label="Bairro"
            className="sm:col-span-2"
            disabled={autoFilledFields.has("neighborhood")}
            infoMessage="Bairro ou distrito."
          />
          <FormStageField<GoogleCompletionFormValues>
            name="city"
            label="Cidade"
            autoComplete="address-level2"
            disabled={autoFilledFields.has("city")}
            infoMessage="Município."
          />
          <PersonalSelectField
            name="state"
            label="UF"
            disabled={autoFilledFields.has("state")}
            options={BRAZILIAN_STATES.map((state) => ({ value: state, label: state }))}
          />
        </div>
      )}
    </div>
  );
}
