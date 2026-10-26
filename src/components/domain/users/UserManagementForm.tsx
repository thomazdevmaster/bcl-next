"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from "react";
import { MusicLoader } from "@/components/MusicLoader";
import type { CrudField, CrudOption } from "@/domains/crudConfig";
import {
  isMusicXmlUploadFile,
  looksLikeMusicXml,
  metadataFromMusicXml,
} from "@/domains/songs/musicXmlMetadata";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/domains/songs/youtube";
import { formatPhoneNumber } from "@/domains/people/formatting";
import {
  UserPersonalContactStage,
  type PersonalContactFormHandlers,
} from "./UserPersonalContactStage";
import {
  UserGuardianStage,
  type GuardianStageHandlers,
} from "./UserGuardianStage";
import { UserAccessStage, type AccessStageHandlers } from "./UserAccessStage";
import {
  UserPermissionsStage,
  type PermissionsStageHandlers,
} from "./UserPermissionsStage";

export interface EntityFormDynamicChoices {
  people: Array<CrudOption & { hasUser: boolean }> | null;
  instruments: CrudOption[] | null;
}

export interface EntityFormProps {
  fields: CrudField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  readOnly: boolean;
  editing: boolean;
  saving: boolean;
  roleChoices: CrudOption[] | null;
  dynamicChoices: EntityFormDynamicChoices;
  rolesLocked: boolean;
  onChange: (name: string, value: unknown) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit?: () => void;
  footerActions?: ReactNode;
  guardianUsersOnly?: boolean;
  preventImplicitSubmit?: boolean;
  personalContactStage?: boolean;
  onRegisterPersonalContactHandlers?: (
    handlers: PersonalContactFormHandlers | null,
  ) => void;
  guardianStage?: boolean;
  guardianPeople?: Array<CrudOption & { hasUser: boolean }>;
  guardianRelationshipOptions?: CrudOption[];
  onRegisterGuardianStageHandlers?: (
    handlers: GuardianStageHandlers | null,
  ) => void;
  profileFields?: CrudField[];
  accessStage?: boolean;
  onRegisterAccessStageHandlers?: (
    handlers: AccessStageHandlers | null,
  ) => void;
  permissionsStage?: boolean;
  onRegisterPermissionsStageHandlers?: (
    handlers: PermissionsStageHandlers | null,
  ) => void;
}

const buttonMotion =
  "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const controlMotion =
  "transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none";

export function EntityForm({
  fields,
  values,
  errors,
  readOnly,
  editing,
  saving,
  roleChoices,
  dynamicChoices,
  rolesLocked,
  onChange,
  onClose,
  onSubmit,
  onEdit,
  footerActions,
  guardianUsersOnly = false,
  preventImplicitSubmit = false,
  personalContactStage = false,
  onRegisterPersonalContactHandlers,
  guardianStage = false,
  guardianPeople = [],
  guardianRelationshipOptions = [],
  onRegisterGuardianStageHandlers,
  profileFields,
  accessStage = false,
  onRegisterAccessStageHandlers,
  permissionsStage = false,
  onRegisterPermissionsStageHandlers,
}: EntityFormProps) {
  const visibleFields = fields.filter(
    (field) => !field.showWhen || field.showWhen(values),
  );
  const hasSections = visibleFields.some((field) => field.section);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  const setFileError = (fieldName: string, message: string) => {
    setFileErrors((current) => {
      if (!message) {
        if (!(fieldName in current)) return current;
        const next = { ...current };
        delete next[fieldName];
        return next;
      }
      return { ...current, [fieldName]: message };
    });
  };

  const handleFile = async (
    event: ChangeEvent<HTMLInputElement>,
    field: CrudField,
  ) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!isMusicXmlUploadFile(file)) {
      input.value = "";
      setFileError(
        field.name,
        "Formato não aceito. Envie apenas partitura MusicXML (.xml ou .musicxml). Se você usa Encore ou outro programa, exporte como MusicXML antes de anexar.",
      );
      return;
    }
    const content = await file.text();
    if (!looksLikeMusicXml(content)) {
      input.value = "";
      setFileError(
        field.name,
        "O arquivo não parece ser MusicXML válido. Confira se exportou como .xml ou .musicxml e tente novamente.",
      );
      return;
    }
    setFileError(field.name, "");
    const metadata = metadataFromMusicXml(content);
    if (metadata.title) onChange("title", metadata.title);
    if (metadata.composer) onChange("composer", metadata.composer);
    if (metadata.arranger) onChange("arranger", metadata.arranger);
    if (metadata.genre) onChange("genre", metadata.genre);
    if (metadata.key) onChange("key", metadata.key);
    const encoded = `data:${file.type || "application/xml"};base64,${btoa(unescape(encodeURIComponent(content)))}`;
    onChange(field.name, encoded);
    onChange("scoreFileName", file.name);
    onChange("scoreMimeType", file.type || "application/xml");
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => {
        if (
          preventImplicitSubmit &&
          event.key === "Enter" &&
          !(
            event.target instanceof HTMLElement &&
            event.target.closest("button")
          )
        ) {
          event.preventDefault();
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {onRegisterPersonalContactHandlers && personalContactStage ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <UserPersonalContactStage
            values={values}
            onChange={onChange}
            onRegisterHandlers={onRegisterPersonalContactHandlers}
            readOnly={readOnly}
          />
        </div>
      ) : null}
      {onRegisterGuardianStageHandlers && guardianStage ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <UserGuardianStage
            values={values}
            people={guardianPeople}
            relationshipOptions={guardianRelationshipOptions}
            onChange={onChange}
            onRegisterHandlers={onRegisterGuardianStageHandlers}
            readOnly={readOnly}
          />
        </div>
      ) : null}
      {onRegisterAccessStageHandlers && accessStage ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <UserAccessStage
            values={values}
            onChange={onChange}
            onRegisterHandlers={onRegisterAccessStageHandlers}
            readOnly={readOnly}
            editing={editing}
          />
        </div>
      ) : null}
      {onRegisterPermissionsStageHandlers && permissionsStage ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <UserPermissionsStage
            values={values}
            options={
              roleChoices ??
              fields.find((field) => field.name === "roles")?.options ??
              []
            }
            profileFields={profileFields}
            instruments={dynamicChoices.instruments ?? undefined}
            locked={rolesLocked}
            onChange={onChange}
            onRegisterHandlers={onRegisterPermissionsStageHandlers}
            readOnly={readOnly}
          />
        </div>
      ) : null}
      {!(
        personalContactStage ||
        guardianStage ||
        accessStage ||
        permissionsStage
      ) ? (
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-2">
          {visibleFields.map((field, index) => {
            const value = values[field.name];
            const options = optionsForField(
              field,
              values,
              roleChoices,
              dynamicChoices,
              guardianUsersOnly,
            );
            const fieldLocked =
              readOnly ||
              (field.name === "roles" && rolesLocked) ||
              (editing && Boolean(field.lockOnEdit));
            const previousSection = visibleFields[index - 1]?.section;
            const heading =
              hasSections && field.section && field.section !== previousSection
                ? field.section
                : null;
            const wide =
              field.type === "textarea" ||
              field.type === "xml" ||
              field.type === "multiselect";
            const videoWatch =
              field.name === "videoUrl"
                ? youtubeWatchUrl(String(value ?? ""))
                : null;
            const videoEmbed =
              field.name === "videoUrl"
                ? youtubeEmbedUrl(String(value ?? ""))
                : null;

            return (
              <FieldSlot key={field.name} heading={heading} wide={wide}>
                {field.type === "checkbox" ? (
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      disabled={fieldLocked}
                      className="h-5 w-5 transition-transform duration-150 ease-out active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
                      onChange={(event) =>
                        onChange(field.name, event.target.checked)
                      }
                    />
                    <span className="font-medium">{field.label}</span>
                  </label>
                ) : (
                  <span className="font-medium">
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                )}

                {field.type === "checkbox" ? null : field.type ===
                  "multiselect" ? (
                  options.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
                      Nenhuma opção disponível.
                    </p>
                  ) : (
                    <div className="grid gap-1 rounded-md border border-[var(--border)] p-2 sm:grid-cols-2">
                      {options.map((option) => {
                        const selectedValues = Array.isArray(value)
                          ? value.map(String)
                          : [];
                        return (
                          <label
                            key={option.value}
                            className="flex min-h-11 items-center gap-2 px-1"
                          >
                            <input
                              type="checkbox"
                              className="h-5 w-5 transition-transform duration-150 ease-out active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
                              checked={selectedValues.includes(option.value)}
                              disabled={fieldLocked}
                              onChange={(event) =>
                                onChange(
                                  field.name,
                                  event.target.checked
                                    ? [...selectedValues, option.value]
                                    : selectedValues.filter(
                                        (item) => item !== option.value,
                                      ),
                                )
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )
                ) : field.type === "select" ? (
                  <div className="flex flex-col items-start gap-2">
                    <select
                      value={String(value ?? "")}
                      disabled={fieldLocked}
                      className={`min-h-11 ${controlMotion}`}
                      onChange={(event) =>
                        onChange(field.name, event.target.value)
                      }
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={String(value ?? "")}
                    readOnly={fieldLocked}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      onChange(field.name, event.target.value)
                    }
                    className={`rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 ${controlMotion}`}
                  />
                ) : field.name === "videoUrl" && readOnly ? (
                  videoWatch && videoEmbed ? (
                    <div className="flex flex-col items-start gap-2">
                      <div className="aspect-video w-full max-w-80 overflow-hidden rounded-md bg-black">
                        <iframe
                          className="h-full w-full"
                          src={videoEmbed}
                          title="Vídeo da música"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                      <a
                        href={videoWatch}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--color-brand-strong)]"
                      >
                        <span className="material-icons text-lg" aria-hidden>
                          smart_display
                        </span>
                        Abrir no YouTube
                      </a>
                    </div>
                  ) : (
                    <p className="rounded-md bg-[var(--card-secondary)] px-3 py-2">
                      Nenhum vídeo
                    </p>
                  )
                ) : field.type === "xml" ? (
                  readOnly ? (
                    <p className="rounded-md bg-[var(--card-secondary)] px-3 py-2">
                      {String(
                        values.scoreFileName || "Nenhuma partitura anexada",
                      )}
                    </p>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <label
                        className={`btn-primary inline-flex min-h-11 cursor-pointer items-center px-4 ${buttonMotion}`}
                      >
                        Enviar arquivo
                        <input
                          type="file"
                          accept={field.accept}
                          className="sr-only"
                          onChange={(event) => void handleFile(event, field)}
                        />
                      </label>
                      {Boolean(values.scoreFileName) && (
                        <p className="text-xs text-[var(--muted)]">
                          Arquivo: {String(values.scoreFileName)}
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  <input
                    type={field.type ?? "text"}
                    value={String(value ?? "")}
                    readOnly={fieldLocked}
                    placeholder={field.placeholder}
                    className={`min-h-11 ${controlMotion}`}
                    autoComplete={
                      field.name === "username" ||
                      field.name === "guardian.username"
                        ? "username"
                        : field.type === "password"
                          ? "new-password"
                          : field.name === "email"
                            ? "email"
                            : undefined
                    }
                    inputMode={field.type === "tel" ? "tel" : undefined}
                    step={field.type === "number" ? "0.01" : undefined}
                    onChange={(event) =>
                      onChange(
                        field.name,
                        field.type === "tel"
                          ? formatPhoneNumber(event.target.value)
                          : field.format
                            ? field.format(event.target.value, values)
                            : event.target.value,
                      )
                    }
                  />
                )}
                {field.helpText && (
                  <span className="text-xs text-[var(--muted)]">
                    {field.helpText}
                  </span>
                )}
                {field.name === "roles" && rolesLocked && (
                  <span className="text-xs text-[var(--muted)]">
                    Somente um administrador vincula ou desvincula papéis.
                  </span>
                )}
                {editing && field.lockOnEdit && (
                  <span className="text-xs text-[var(--muted)]">
                    Definido na criação; não pode ser alterado.
                  </span>
                )}
                {(errors[field.name] || fileErrors[field.name]) && (
                  <span className="text-xs text-red-600" role="alert">
                    {errors[field.name] ?? fileErrors[field.name]}
                  </span>
                )}
              </FieldSlot>
            );
          })}
        </div>
      ) : null}
      <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
        {footerActions ?? (
          <>
            <button
              type="button"
              className={`btn-ghost min-h-11 ${buttonMotion}`}
              disabled={saving}
              onClick={onClose}
            >
              Fechar
            </button>
            {readOnly && onEdit ? (
              <button
                type="button"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                onClick={onEdit}
              >
                Editar
              </button>
            ) : !readOnly ? (
              <button
                type="submit"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                disabled={saving}
              >
                {saving ? <MusicLoader compact label="Salvando…" /> : "Salvar"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </form>
  );
}

function FieldSlot({
  heading,
  wide,
  children,
}: {
  heading: string | null;
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {heading && (
        <h3 className="mt-2 border-b border-[var(--border)] pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] first:mt-0 md:col-span-2">
          {heading}
        </h3>
      )}
      <div
        className={`flex flex-col gap-1.5 text-sm ${wide ? "md:col-span-2" : ""}`}
      >
        {children}
      </div>
    </>
  );
}

function optionsForField(
  field: CrudField,
  values: Record<string, unknown>,
  roleChoices: CrudOption[] | null,
  dynamic: EntityFormDynamicChoices,
  guardianUsersOnly: boolean,
): CrudOption[] {
  const value = values[field.name];
  if (field.name === "roles") {
    const base = roleChoices ?? field.options ?? [];
    const selected = Array.isArray(value) ? value.map(String) : [];
    return [
      ...base,
      ...selected
        .filter((code) => !base.some((option) => option.value === code))
        .map((code) => ({ value: code, label: code })),
    ];
  }
  if (!field.optionsSource) return field.options ?? [];
  if (field.optionsSource === "instruments") return dynamic.instruments ?? [];

  const selfId = values.id == null ? null : String(values.id);
  const selectedValue = value == null || value === "" ? null : String(value);
  const people = dynamic.people ?? [];
  const filtered = people.filter((person) => {
    if (person.value === selfId) return false;
    if (guardianUsersOnly && field.name === "guardianId" && !person.hasUser)
      return false;
    return (
      field.optionsSource !== "people-without-user" ||
      !person.hasUser ||
      person.value === selectedValue
    );
  });
  const options: CrudOption[] = [
    {
      value: "",
      label:
        guardianUsersOnly && field.name === "guardianId"
          ? "Selecione um usuário…"
          : field.required
            ? "Selecione…"
            : "Nenhuma",
    },
    ...filtered.map(({ value: id, label }) => ({ value: id, label })),
  ];
  if (guardianUsersOnly && field.name === "guardianId") {
    options.push({ value: "__new_guardian__", label: "Novo responsável" });
  }
  if (
    selectedValue &&
    !options.some((option) => option.value === selectedValue)
  )
    options.push({ value: selectedValue, label: `Pessoa #${selectedValue}` });
  return options;
}
