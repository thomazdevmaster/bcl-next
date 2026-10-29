"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  FormProvider,
  type UseFormSetValue,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";

import { MusicLoader } from "@/components/MusicLoader";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FIELD_STATUS, type ValidationState } from "@/components/forms/core";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconSelect } from "@/components/shared/IconSelect";
import {
  type CepAddress,
  formatPostalCode,
  lookupCep,
} from "@/domains/people/cep";
import {
  composeAddress,
  hasStructuredAddress,
  mergeParsedAddressIntoValues,
} from "@/domains/people/composeAddress";
import { formatPhoneNumber } from "@/domains/people/formatting";
import { formatCpf } from "@/domains/people/types";
import { getUfFlagSrc } from "@/domains/people/ufFlags";
import {
  type PersonDetailsFormValues,
  personDetailsSchema,
} from "@/domains/users/schemas/person-details.schema";
import { uploadMediaFile } from "@/lib/uploadMedia";
import { userFacingError } from "@/lib/userMessages";

type Props = {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: PersonalContactFormHandlers | null) => void;
  readOnly?: boolean;
};

type AddressInputName =
  "street" | "unit" | "complement" | "neighborhood" | "city" | "state";

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
  readOnly = false,
}: Props) {
  const mergedValues = mergeParsedAddressIntoValues(values);
  const form = useForm<PersonDetailsFormValues>({
    defaultValues: {
      firstName: valueFrom(mergedValues, "firstName"),
      lastName: valueFrom(mergedValues, "lastName"),
      birthDate: valueFrom(mergedValues, "birthDate"),
      registeredAt: valueFrom(mergedValues, "registeredAt"),
      documentType: valueFrom(
        mergedValues,
        "document.type",
      ) as PersonDetailsFormValues["documentType"],
      documentNumber: valueFrom(mergedValues, "document.number"),
      photoSource: valueFrom(
        mergedValues,
        "photoSource",
      ) as PersonDetailsFormValues["photoSource"],
      photoUrl: valueFrom(mergedValues, "photoUrl"),
      status: valueFrom(
        mergedValues,
        "status",
      ) as PersonDetailsFormValues["status"],
      postalCode: valueFrom(mergedValues, "postalCode"),
      street: valueFrom(mergedValues, "street"),
      addressNumber: valueFrom(mergedValues, "addressNumber"),
      complement: valueFrom(mergedValues, "complement"),
      unit: valueFrom(mergedValues, "unit"),
      neighborhood: valueFrom(mergedValues, "neighborhood"),
      city: valueFrom(mergedValues, "city"),
      state: valueFrom(
        mergedValues,
        "state",
      ) as PersonDetailsFormValues["state"],
      phone: valueFrom(mergedValues, "phone"),
      email: valueFrom(mergedValues, "email"),
      address: valueFrom(mergedValues, "address"),
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
  const structuredAddressReady = hasStructuredAddress(mergedValues);
  const legacyAddress = valueFrom(mergedValues, "address");

  useEffect(() => {
    const next = mergeParsedAddressIntoValues(values);
    form.reset({
      firstName: valueFrom(next, "firstName"),
      lastName: valueFrom(next, "lastName"),
      birthDate: valueFrom(next, "birthDate"),
      registeredAt: valueFrom(next, "registeredAt"),
      documentType: valueFrom(
        next,
        "document.type",
      ) as PersonDetailsFormValues["documentType"],
      documentNumber: valueFrom(next, "document.number"),
      photoSource: valueFrom(
        next,
        "photoSource",
      ) as PersonDetailsFormValues["photoSource"],
      photoUrl: valueFrom(next, "photoUrl"),
      status: valueFrom(next, "status") as PersonDetailsFormValues["status"],
      postalCode: valueFrom(next, "postalCode"),
      street: valueFrom(next, "street"),
      addressNumber: valueFrom(next, "addressNumber"),
      complement: valueFrom(next, "complement"),
      unit: valueFrom(next, "unit"),
      neighborhood: valueFrom(next, "neighborhood"),
      city: valueFrom(next, "city"),
      state: valueFrom(next, "state") as PersonDetailsFormValues["state"],
      phone: valueFrom(next, "phone"),
      email: valueFrom(next, "email"),
      address: valueFrom(next, "address"),
    });
  }, [form, values.id, values.address, values.street, values.postalCode]);
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
              disabled={readOnly}
              required
              validateOnMount
              onEdit={syncField("firstName")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="lastName"
              label="Sobrenome"
              autoComplete="family-name"
              disabled={readOnly}
              required
              validateOnMount
              onEdit={syncField("lastName")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="birthDate"
              label="Data de nascimento"
              type="date"
              max={today}
              disabled={readOnly}
              required
              onEdit={syncField("birthDate")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="registeredAt"
              label="Data de cadastro"
              type="date"
              max={today}
              disabled={readOnly}
              required={false}
              optionalMessage="Em branco, será usada a data de hoje."
              validateOnMount
              onEdit={syncField("registeredAt")}
            />
            <div className="grid min-w-0 gap-4 sm:col-span-2">
              <PersonalSelectField
                name="documentType"
                label="Documento"
                options={[
                  { value: "", label: "Selecione um documento" },
                  { value: "none", label: "Não informado" },
                  { value: "cpf", label: "CPF" },
                  { value: "rg", label: "RG" },
                ]}
                required={false}
                disabled={readOnly}
                warningMessage="Opcional. Escolha CPF, RG ou Não informado."
                onValueChange={(value) => {
                  onChange("document.type", value);
                  if (value === "" || value === "none") {
                    form.setValue("documentNumber", "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    onChange("document.number", "");
                  }
                }}
              />
              {documentType === "cpf" || documentType === "rg" ? (
                <FormStageField<PersonDetailsFormValues>
                  name="documentNumber"
                  label="Número do documento"
                  placeholder={
                    documentType === "cpf" ? "000.000.000-00" : "Número do RG"
                  }
                  formatValue={
                    documentType === "cpf" ? formatCpf : formatRgValue
                  }
                  disabled={readOnly}
                  required
                  onEdit={syncField("documentNumber")}
                />
              ) : null}
            </div>
            <div className="grid min-w-0 gap-4 sm:col-span-2">
              <PhotoSourceSelect
                disabled={readOnly}
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
                  disabled={readOnly}
                  required
                  validateOnChange="photoUrl"
                  onEdit={syncField("photoUrl")}
                />
              ) : photoSource === "upload" ? (
                <ProfilePhotoPicker
                  photoUrl={photoUrl}
                  readOnly={readOnly}
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
            <div className="sm:col-span-2">
              <PersonalSelectField
                name="status"
                label="Status"
                options={[
                  { value: "", label: "Selecione um status" },
                  { value: "active", label: "Ativo" },
                  { value: "inactive", label: "Inativo" },
                ]}
                required
                disabled={readOnly}
                warningMessage="Selecione um status."
                onValueChange={(value) => onChange("status", value)}
              />
            </div>
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
              disabled={readOnly}
              required
              validateOnMount
              onEdit={syncField("phone")}
            />
            <FormStageField<PersonDetailsFormValues>
              name="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              disabled={readOnly}
              required={false}
              optionalMessage="Opcional, mas necessário para entrar com e-mail em vez do nome de usuário."
              validateOnMount
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
              {legacyAddress && !structuredAddressReady ? (
                <FormStageField<PersonDetailsFormValues>
                  name="address"
                  label="Endereço"
                  autoComplete="street-address"
                  className="sm:col-span-2"
                  disabled={readOnly}
                  required={false}
                  optionalMessage="Opcional."
                  onEdit={syncField("address")}
                />
              ) : null}
              <div className="sm:col-span-2">
                <FormStageField<PersonDetailsFormValues>
                  name="postalCode"
                  label="CEP"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="00000-000"
                  formatValue={formatPostalCode}
                  disabled={readOnly}
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
                disabled={readOnly || autoFilledFields.has("street")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="addressNumber"
                label="Número"
                placeholder="Número ou S/N"
                disabled={readOnly}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="complement"
                label="Complemento"
                autoComplete="address-line2"
                disabled={readOnly || autoFilledFields.has("complement")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="neighborhood"
                label="Bairro / Distrito"
                className="sm:col-span-2"
                disabled={readOnly || autoFilledFields.has("neighborhood")}
                required={false}
                optionalMessage="Opcional."
                onEdit={syncAddress}
              />
              <FormStageField<PersonDetailsFormValues>
                name="city"
                label="Cidade (Município)"
                autoComplete="address-level2"
                disabled={readOnly || autoFilledFields.has("city")}
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
                disabled={readOnly || autoFilledFields.has("state")}
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
  readOnly = false,
}: {
  photoUrl: string;
  onUploaded: (url: string) => void;
  readOnly?: boolean;
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
        {readOnly ? (
          <p className="text-sm text-[var(--muted)]">
            {hasUploadedPhoto ? "Foto de perfil" : "Nenhuma foto enviada."}
          </p>
        ) : (
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
        )}
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
  disabled = false,
}: {
  onValueChange: (value: string) => void;
  disabled?: boolean;
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
            disabled={disabled}
            value={field.value}
            onBlur={field.onBlur}
            state={state}
            message={
              empty
                ? "Opcional."
                : (errors.photoUrl?.message ?? fieldState.error?.message)
            }
            renderControl={({ id, describedBy, invalid }) => (
              <IconSelect
                id={id}
                label="Foto de perfil"
                options={[
                  { value: "", label: "Selecione", icon: "more_horiz" },
                  { value: "upload", label: "Enviar arquivo", icon: "upload" },
                  {
                    value: "external",
                    label: "Informar URL externa",
                    icon: "link",
                  },
                ]}
                value={field.value}
                disabled={disabled}
                invalid={invalid}
                describedBy={describedBy}
                onTriggerRef={field.ref}
                onBlur={field.onBlur}
                triggerClassName={`${status.border} pr-3`}
                onChange={(value) => {
                  field.onChange(value);
                  onValueChange(value);
                  setValue("photoUrl", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  void trigger("photoUrl");
                }}
              />
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

function syncAddressToParent(
  values: PersonDetailsFormValues,
  onChange: (name: string, value: unknown) => void,
) {
  onChange(
    "address",
    composeAddress({
      street: values.street,
      addressNumber: values.addressNumber,
      complement: values.complement,
      unit: values.unit,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
    }),
  );
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
        const optionalEmpty = !required && empty && name === "documentType";
        const state: ValidationState =
          statusMissing || fieldState.error
            ? "invalid"
            : optionalEmpty
              ? "info"
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
                : optionalEmpty
                  ? warningMessage
                  : empty
                    ? warningMessage
                    : fieldState.error?.message
            }
            renderControl={({ id, describedBy, invalid }) => (
              <IconSelect
                id={id}
                label={label}
                options={options.map((option) => ({
                  ...option,
                  imageSrc:
                    name === "state" && option.value
                      ? getUfFlagSrc(option.value)
                      : undefined,
                  icon:
                    option.value === ""
                      ? "more_horiz"
                      : name === "status"
                        ? option.value === "active"
                          ? "check_circle"
                          : "cancel"
                        : name === "state"
                          ? "location_on"
                          : option.value === "none"
                            ? "block"
                            : "badge",
                }))}
                value={field.value}
                disabled={disabled}
                required={required}
                invalid={invalid}
                describedBy={describedBy}
                onTriggerRef={field.ref}
                onBlur={field.onBlur}
                triggerClassName={`${status.border} pr-3`}
                onChange={(value) => {
                  field.onChange(value);
                  onValueChange(value);
                  if (name === "documentType") {
                    void trigger(["documentType", "documentNumber"]);
                  }
                }}
              />
            )}
          />
        );
      }}
    />
  );
}
