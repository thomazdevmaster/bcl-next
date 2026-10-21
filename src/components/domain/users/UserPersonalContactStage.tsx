"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
  type UseFormSetValue,
} from "react-hook-form";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { MusicLoader } from "@/components/MusicLoader";
import {
  controlBase,
  controlHeight,
  FIELD_STATUS,
  type ValidationState,
} from "@/components/forms/core";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { formatPhoneNumber } from "@/domains/people/formatting";
import { formatCpf } from "@/domains/people/types";
import {
  formatPostalCode,
  lookupCep,
  type CepAddress,
} from "@/domains/people/cep";
import { uploadMediaFile } from "@/lib/uploadMedia";
import { userFacingError } from "@/lib/userMessages";
import {
  personDetailsSchema,
  type PersonDetailsFormValues,
} from "@/domains/users/schemas/person-details.schema";

type Props = {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: PersonalContactFormHandlers | null) => void;
};

type AddressInputName =
  | "street"
  | "unit"
  | "complement"
  | "neighborhood"
  | "city"
  | "state";

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export type PersonalContactFormHandlers = {
  validate: () => Promise<boolean>;
  submit: (onValid: () => void | Promise<void>, onInvalid?: () => void) => void;
};

const FIELD_TO_VALUE_NAME: Partial<
  Record<keyof PersonDetailsFormValues, string>
> = {
  firstName: "firstName",
  lastName: "lastName",
  birthDate: "birthDate",
  registeredAt: "registeredAt",
  documentType: "document.type",
  documentNumber: "document.number",
  photoSource: "photoSource",
  photoUrl: "photoUrl",
  status: "status",
  phone: "phone",
  email: "email",
  address: "address",
};

function valueFrom(values: Record<string, unknown>, name: string): string {
  return String(values[name] ?? "");
}

function localToday(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function UserPersonalContactStage({
  values,
  onChange,
  onRegisterHandlers,
}: Props) {
  const form = useForm<PersonDetailsFormValues>({
    defaultValues: {
      firstName: valueFrom(values, "firstName"),
      lastName: valueFrom(values, "lastName"),
      birthDate: valueFrom(values, "birthDate"),
      registeredAt: valueFrom(values, "registeredAt"),
      documentType: valueFrom(
        values,
        "document.type",
      ) as PersonDetailsFormValues["documentType"],
      documentNumber: valueFrom(values, "document.number"),
      photoSource: "",
      photoUrl: valueFrom(values, "photoUrl"),
      status: valueFrom(values, "status") as PersonDetailsFormValues["status"],
      postalCode: valueFrom(values, "postalCode"),
      street: valueFrom(values, "street"),
      addressNumber: valueFrom(values, "addressNumber"),
      complement: valueFrom(values, "complement"),
      unit: valueFrom(values, "unit"),
      neighborhood: valueFrom(values, "neighborhood"),
      city: valueFrom(values, "city"),
      state: valueFrom(values, "state") as PersonDetailsFormValues["state"],
      phone: valueFrom(values, "phone"),
      email: valueFrom(values, "email"),
      address: valueFrom(values, "address"),
    },
    resolver: zodResolver(personDetailsSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { trigger, handleSubmit, setValue, getValues } = form;
  const documentType = useWatch({
    control: form.control,
    name: "documentType",
  });
  const photoSource = useWatch({ control: form.control, name: "photoSource" });
  const photoUrl = useWatch({ control: form.control, name: "photoUrl" });
  const [cepLookupState, setCepLookupState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [cepLookupMessage, setCepLookupMessage] = useState("");
  const lastRequestedCep = useRef("");
  const cepRequest = useRef<AbortController | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<
    Set<AddressInputName>
  >(() => new Set());
  const autoFilledFieldsRef = useRef<Set<AddressInputName>>(new Set());

  useEffect(() => {
    onRegisterHandlers({
      validate: () => trigger(),
      submit: (onValid, onInvalid) => {
        void handleSubmit(onValid, onInvalid ? () => onInvalid() : undefined)();
      },
    });
    return () => onRegisterHandlers(null);
  }, [handleSubmit, onRegisterHandlers, trigger]);

  const today = localToday();
  const syncField = (name: keyof PersonDetailsFormValues) => () => {
    const valueName = FIELD_TO_VALUE_NAME[name];
    if (valueName) onChange(valueName, form.getValues(name));
  };
  const syncAddress = () => {
    const addressValues = getValues();
    const digits = addressValues.postalCode.replace(/\D/g, "");
    if (lastRequestedCep.current && digits !== lastRequestedCep.current) {
      cepRequest.current?.abort();
      const cleared = { ...getValues() };
      for (const name of autoFilledFieldsRef.current) {
        (cleared[name] as string) = "";
        setValue(name, "", { shouldDirty: true, shouldValidate: true });
      }
      autoFilledFieldsRef.current = new Set();
      setAutoFilledFields(new Set());
      lastRequestedCep.current = "";
      syncAddressToParent(cleared, onChange);
    } else {
      syncAddressToParent(addressValues, onChange);
    }
    if (digits.length !== 8) {
      cepRequest.current?.abort();
      cepRequest.current = null;
      lastRequestedCep.current = "";
      setCepLookupState("idle");
      setCepLookupMessage("");
      return;
    }
    if (lastRequestedCep.current === digits) return;

    cepRequest.current?.abort();
    const request = new AbortController();
    cepRequest.current = request;
    const loadingStartedAt = Date.now();
    lastRequestedCep.current = digits;
    setCepLookupState("loading");
    setCepLookupMessage("");
    const finishLoading = (complete: () => void) => {
      const visibleFor = Date.now() - loadingStartedAt;
      window.setTimeout(
        () => {
          if (cepRequest.current !== request) return;
          complete();
          cepRequest.current = null;
        },
        Math.max(0, 600 - visibleFor),
      );
    };
    void lookupCep(digits, request.signal)
      .then((address) => {
        if (cepRequest.current !== request) return;
        applyCepAddress(address, setValue);
        const updated = {
          ...getValues(),
          postalCode: address.postalCode,
          street: address.street,
          unit: address.unit,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state as PersonDetailsFormValues["state"],
        };
        const filled = new Set<AddressInputName>(
          (
            [
              "street",
              "unit",
              "complement",
              "neighborhood",
              "city",
              "state",
            ] as const
          ).filter((name) =>
            Boolean(address[name === "state" ? "state" : name].trim()),
          ),
        );
        autoFilledFieldsRef.current = filled;
        setAutoFilledFields(filled);
        syncAddressToParent(updated, onChange);
        finishLoading(() => {
          setCepLookupState("success");
          setCepLookupMessage("Endereço preenchido pelo CEP.");
        });
      })
      .catch((error: unknown) => {
        if (request.signal.aborted) return;
        finishLoading(() => {
          lastRequestedCep.current = "";
          setCepLookupState("error");
          setCepLookupMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o CEP.",
          );
        });
      });
  };

  return (
    <FormProvider {...form}>
      <div className="grid gap-2">
        <FormStageBlock
          title="Dados pessoais"
          surface="plain"
          className="!pb-0"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormStageField<PersonDetailsFormValues>
              name="firstName"
              label="Nome"
              autoComplete="given-name"
              required
              onEdit={syncField("firstName")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="lastName"
              label="Sobrenome"
              autoComplete="family-name"
              required
              onEdit={syncField("lastName")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="birthDate"
              label="Data de nascimento"
              type="date"
              max={today}
              required
              onEdit={syncField("birthDate")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="registeredAt"
              label="Data de cadastro"
              type="date"
              max={today}
              required={false}
              optionalMessage="Em branco, será usada a data de hoje."
              onEdit={syncField("registeredAt")}
            />
            <PersonalSelectField
              name="documentType"
              label="Documento"
              options={[
                { value: "", label: "Selecione um documento" },
                { value: "none", label: "Não informado" },
                { value: "cpf", label: "CPF" },
                { value: "rg", label: "RG" },
              ]}
              required
              warningMessage="Selecione CPF, RG ou Não informado."
              onValueChange={(value) => onChange("document.type", value)}
            />
            <PersonalSelectField
              name="status"
              label="Status"
              options={[
                { value: "", label: "Selecione um status" },
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
              ]}
              required
              warningMessage="Selecione um status."
              onValueChange={(value) => onChange("status", value)}
            />
            {documentType === "cpf" || documentType === "rg" ? (
              <FormStageField<PersonDetailsFormValues>
                name="documentNumber"
                label="Número do documento"
                placeholder={
                  documentType === "cpf" ? "000.000.000-00" : "Número do RG"
                }
                formatValue={documentType === "cpf" ? formatCpf : formatRgValue}
                required
                onEdit={syncField("documentNumber")}
              />
            ) : null}
            <PhotoSourceSelect
              onValueChange={(value) => {
                onChange("photoSource", value);
                onChange("photoUrl", "");
              }}
            />
            {photoSource === "external" ? (
              <FormStageField<PersonDetailsFormValues>
                name="photoUrl"
                label="URL externa da foto"
                type="url"
                placeholder="https://…"
                required
                validateOnChange="photoUrl"
                onEdit={syncField("photoUrl")}
              />
            ) : photoSource === "upload" ? (
              <ProfilePhotoPicker
                photoUrl={photoUrl}
                onUploaded={(url) => {
                  setValue("photoUrl", url, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  onChange("photoUrl", url);
                }}
              />
            ) : (
              <div aria-hidden="true" className="min-h-11" />
            )}
          </div>
        </FormStageBlock>

        <FormStageBlock title="Contato" surface="plain">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormStageField<PersonDetailsFormValues>
              name="phone"
              label="Telefone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              formatValue={formatPhoneNumber}
              required
              onEdit={syncField("phone")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              required={false}
              optionalMessage="Opcional, mas necessário para entrar com e-mail em vez do nome de usuário."
              onEdit={syncField("email")}
            />
          </div>
        </FormStageBlock>

        <FormStageBlock title="Endereço" surface="plain">
          {cepLookupState === "loading" ? (
            <div className="flex min-h-64 items-center justify-center">
              <MusicLoader label="Consultando CEP…" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormStageField<PersonDetailsFormValues>
                  name="postalCode"
                  label="CEP"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="00000-000"
                  formatValue={formatPostalCode}
                  required={false}
                  optionalMessage="Opcional. Ao informar 8 números, o endereço será consultado."
                  validateOnChange="postalCode"
                  onEdit={syncAddress}
                />
                {cepLookupState === "error" || cepLookupState === "success" ? (
                  <p
                    role={cepLookupState === "error" ? "alert" : undefined}
                    aria-live="polite"
                    className={`mt-1.5 text-xs ${cepLookupState === "error" ? "text-[var(--destructive)]" : "text-[var(--success)]"}`}
                  >
                    {cepLookupMessage}
                  </p>
                ) : null}
              </div>
              <FormStageField<PersonDetailsFormValues>
                name="street"
                label="Logradouro"
                autoComplete="address-line1"
                className="sm:col-span-2"
                disabled={autoFilledFields.has("street")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="addressNumber"
                label="Número"
                placeholder="Número ou S/N"
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="complement"
                label="Complemento"
                autoComplete="address-line2"
                disabled={autoFilledFields.has("complement")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="neighborhood"
                label="Bairro / Distrito"
                className="sm:col-span-2"
                disabled={autoFilledFields.has("neighborhood")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="city"
                label="Cidade (Município)"
                autoComplete="address-level2"
                disabled={autoFilledFields.has("city")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <PersonalSelectField
                name="state"
                label="UF"
                options={[
                  { value: "", label: "Selecione uma UF" },
                  ...BRAZILIAN_STATES.map((state) => ({
                    value: state,
                    label: state,
                  })),
                ]}
                required={false}
                warningMessage="Opcional."
                disabled={autoFilledFields.has("state")}
                onValueChange={() => syncAddress()}
              />
            </div>
          )}
        </FormStageBlock>
      </div>
    </FormProvider>
  );
}

function ProfilePhotoPicker({
  photoUrl,
  onUploaded,
}: {
  photoUrl: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control } = useFormContext<PersonDetailsFormValues>();
  const { errors } = useFormState({ control, name: "photoUrl" });
  const hasUploadedPhoto = Boolean(photoUrl);
  const invalid = Boolean(errors.photoUrl);

  return (
    <div className="flex min-h-16 min-w-0 flex-col justify-center gap-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <label
          className={`inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)] ${invalid ? "border-[var(--destructive)] text-[var(--destructive)]" : "btn-outline-primary"}`}
        >
          <span className="material-icons text-lg" aria-hidden="true">
            {hasUploadedPhoto ? "refresh" : "upload"}
          </span>
          <span className="truncate">
            {uploading
              ? "Enviando foto…"
              : hasUploadedPhoto
                ? "Reenviar foto"
                : "Selecionar foto"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setError(null);
              setUploading(true);
              uploadMediaFile(file)
                .then(onUploaded)
                .catch((reason: unknown) => setError(userFacingError(reason)))
                .finally(() => setUploading(false));
            }}
          />
        </label>
        {hasUploadedPhoto ? (
          <Image
            src={photoUrl}
            alt="Prévia da foto de perfil enviada"
            width={64}
            height={64}
            unoptimized
            className="size-16 shrink-0 rounded-full border border-[var(--border)] object-cover"
          />
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
      <p
        className={`text-xs ${invalid ? "text-[var(--destructive)]" : "text-[var(--muted)]"}`}
      >
        {invalid
          ? String(errors.photoUrl?.message ?? "Envie uma foto do computador.")
          : "JPG, PNG, WebP ou GIF; até 25 MB."}
      </p>
    </div>
  );
}

function PhotoSourceSelect({
  onValueChange,
}: {
  onValueChange: (value: string) => void;
}) {
  const { control, setValue, trigger } =
    useFormContext<PersonDetailsFormValues>();
  const { errors } = useFormState({ control, name: "photoUrl" });
  return (
    <Controller
      name="photoSource"
      control={control}
      render={({ field, fieldState }) => {
        const empty = field.value === "";
        const invalid = !empty && Boolean(errors.photoUrl);
        const state: ValidationState = invalid
          ? "invalid"
          : empty
            ? "warning"
            : "valid";
        const status = FIELD_STATUS[state];
        return (
          <FormFieldValidationShell
            label="Foto de perfil"
            name={field.name}
            required={false}
            value={field.value}
            onBlur={field.onBlur}
            state={state}
            message={
              empty
                ? "Opcional."
                : (errors.photoUrl?.message ?? fieldState.error?.message)
            }
            renderControl={({ id, name, describedBy, invalid }) => (
              <select
                ref={field.ref}
                id={id}
                name={name}
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  onValueChange(event.target.value);
                  setValue("photoUrl", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  void trigger("photoUrl");
                }}
                aria-required={undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={`${controlBase} ${controlHeight.md} ${status.border} pr-3`}
              >
                <option value="">Selecione</option>
                <option value="upload">Enviar arquivo</option>
                <option value="external">Informar URL externa</option>
              </select>
            )}
          />
        );
      }}
    />
  );
}

function formatRgValue(value: string): string {
  return value.toLocaleUpperCase("pt-BR").slice(0, 14);
}

function composeAddress(values: PersonDetailsFormValues): string {
  const streetAndNumber = [values.street.trim(), values.addressNumber.trim()]
    .filter(Boolean)
    .join(", ");
  const cityAndState = [values.city.trim(), values.state]
    .filter(Boolean)
    .join(" - ");
  return [
    streetAndNumber,
    values.complement.trim(),
    values.unit.trim(),
    values.neighborhood.trim(),
    cityAndState,
    values.postalCode.trim() ? `CEP ${values.postalCode.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function syncAddressToParent(
  values: PersonDetailsFormValues,
  onChange: (name: string, value: unknown) => void,
) {
  onChange("address", composeAddress(values));
  onChange("postalCode", values.postalCode);
  onChange("street", values.street);
  onChange("addressNumber", values.addressNumber);
  onChange("complement", values.complement);
  onChange("unit", values.unit);
  onChange("neighborhood", values.neighborhood);
  onChange("city", values.city);
  onChange("state", values.state);
}

function applyCepAddress(
  address: CepAddress,
  setValue: UseFormSetValue<PersonDetailsFormValues>,
) {
  setValue("postalCode", address.postalCode, {
    shouldDirty: true,
    shouldValidate: true,
  });
  setValue("street", address.street, {
    shouldDirty: true,
    shouldValidate: true,
  });
  setValue("complement", address.complement, {
    shouldDirty: true,
    shouldValidate: true,
  });
  setValue("unit", address.unit, { shouldDirty: true, shouldValidate: true });
  setValue("neighborhood", address.neighborhood, {
    shouldDirty: true,
    shouldValidate: true,
  });
  setValue("city", address.city, { shouldDirty: true, shouldValidate: true });
  setValue("state", address.state as PersonDetailsFormValues["state"], {
    shouldDirty: true,
    shouldValidate: true,
  });
}

function PersonalSelectField({
  name,
  label,
  options,
  required,
  warningMessage,
  disabled,
  onValueChange,
}: {
  name: "documentType" | "status" | "state";
  label: string;
  options: { value: string; label: string }[];
  required: boolean;
  warningMessage: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const { trigger } = useFormContext<PersonDetailsFormValues>();
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => {
        const empty = field.value === "";
        const statusMissing = name === "status" && empty;
        const state: ValidationState = statusMissing
          ? "invalid"
          : fieldState.error
            ? empty
              ? "warning"
              : "invalid"
            : empty
              ? "warning"
              : "valid";
        const status = FIELD_STATUS[state];
        return (
          <FormFieldValidationShell
            label={label}
            name={field.name}
            required={required}
            disabled={disabled}
            value={field.value}
            onBlur={field.onBlur}
            state={state}
            message={
              statusMissing
                ? warningMessage
                : empty
                  ? warningMessage
                  : fieldState.error?.message
            }
            renderControl={({
              id,
              name: controlName,
              describedBy,
              invalid,
            }) => (
              <select
                ref={field.ref}
                id={id}
                name={controlName}
                disabled={disabled}
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  onValueChange(event.target.value);
                  if (name === "documentType") {
                    void trigger(["documentType", "documentNumber"]);
                  }
                }}
                aria-required={required || undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={`${controlBase} ${controlHeight.md} ${status.border} pr-3`}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          />
        );
      }}
    />
  );
}
