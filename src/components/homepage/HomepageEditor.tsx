"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MusicLoader } from "@/components/MusicLoader";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import {
  type FeedSection,
  HOME_SECTION_LABELS,
  type HomeHighlight,
  type HomeSection,
  type HomepageDocument,
  type StorySection,
  type VideosSection,
  defaultHomepage,
  parseHomepagePayload,
  validateHomepage,
} from "@/domains/homepage/types";
import { apiFetch } from "@/lib/api";
import { failureMessage } from "@/lib/userMessages";

export function HomepageEditor() {
  const [draft, setDraft] = useState<HomepageDocument | null>(null);
  const [openType, setOpenType] = useState<HomeSection["type"] | null>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<unknown>("/homepage")
      .then((payload) => setDraft(parseHomepagePayload(payload)))
      .catch((caught: unknown) => {
        setDraft(defaultHomepage());
        setError(
          failureMessage(
            caught,
            "Não foi possível carregar a home salva. Você está editando o modelo padrão.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSection = (index: number, next: HomeSection) => {
    setDraft((current) => {
      if (!current) return current;
      const sections = current.sections.slice();
      sections[index] = next;
      return { ...current, sections };
    });
    setSaved(false);
  };

  const move = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = current.sections.slice();
      const [item] = sections.splice(index, 1);
      sections.splice(target, 0, item);
      return { ...current, sections };
    });
    setSaved(false);
  };

  const save = async () => {
    if (!draft) return;
    const validation = validateHomepage(draft);
    if (validation) {
      setError(validation);
      setSaved(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: HomepageDocument = {
        ...draft,
        id: "home",
        updatedAt: new Date().toISOString(),
      };
      const savedDoc = await apiFetch<unknown>("/homepage/home", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setDraft(parseHomepagePayload(savedDoc));
      setSaved(true);
    } catch (caught) {
      setError(
        failureMessage(
          caught,
          "Não foi possível salvar. Confira se a API está no ar.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return <MusicLoader label="Carregando editor…" />;
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Administração
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Página inicial
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Defina a ordem, o que aparece e os textos da home. Eventos e posts
          continuam vindo da agenda e do blog.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-4 text-sm text-[var(--color-brand-strong)]">
          Home publicada.
        </p>
      ) : null}

      <ol className="space-y-3">
        {draft.sections.map((section, index) => {
          const open = openType === section.type;
          return (
            <li
              key={section.type}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  className="min-h-11 flex-1 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenType(open ? null : section.type)}
                >
                  <span className="block text-xs text-[var(--muted)]">
                    {index + 1} · {section.enabled ? "Visível" : "Oculta"}
                  </span>
                  <span className="font-semibold">
                    {HOME_SECTION_LABELS[section.type]}
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label="Subir seção"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <span className="material-icons" aria-hidden>
                    arrow_upward
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label="Descer seção"
                  disabled={index === draft.sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <span className="material-icons" aria-hidden>
                    arrow_downward
                  </span>
                </button>
              </div>
              {open ? (
                <div className="space-y-4 border-t border-[var(--border)] px-4 py-4">
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={section.enabled}
                      onChange={(event) =>
                        updateSection(index, {
                          ...section,
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Mostrar na home
                  </label>
                  <SectionFields
                    section={section}
                    onChange={(next) => updateSection(index, next)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2">
          <Link
            href="/"
            className="btn-outline-primary inline-flex min-h-11 items-center px-4 text-sm"
          >
            Ver home
          </Link>
          <button
            type="button"
            className="btn-primary min-h-11 px-5"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <MusicLoader compact label="Salvando…" /> : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className =
    "mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base text-[var(--foreground)]";
  return (
    <label className="block text-sm font-medium">
      {label}
      {multiline ? (
        <textarea
          className={`${className} min-h-28`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={className}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function SectionFields({
  section,
  onChange,
}: {
  section: HomeSection;
  onChange: (section: HomeSection) => void;
}) {
  if (section.type === "hero") {
    return (
      <div className="space-y-3">
        <Field
          label="Linha acima do título"
          value={section.eyebrow}
          onChange={(eyebrow) => onChange({ ...section, eyebrow })}
        />
        <Field
          label="Título"
          value={section.title}
          onChange={(title) => onChange({ ...section, title })}
        />
        <Field
          label="Texto"
          value={section.subtitle}
          onChange={(subtitle) => onChange({ ...section, subtitle })}
          multiline
        />
        <Field
          label="Imagem de fundo (caminho ou https)"
          value={section.imageUrl}
          onChange={(imageUrl) => onChange({ ...section, imageUrl })}
        />
        {section.links.map((link, index) => (
          <div key={link.href} className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`Botão ${index + 1}`}
              value={link.label}
              onChange={(label) => {
                const links = section.links.slice();
                links[index] = { ...link, label };
                onChange({ ...section, links });
              }}
            />
            <Field
              label="Link"
              value={link.href}
              onChange={(href) => {
                const links = section.links.slice();
                links[index] = { ...link, href };
                onChange({ ...section, links });
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "highlights") {
    const updateItem = (index: number, patch: Partial<HomeHighlight>) => {
      const items = section.items.slice();
      items[index] = { ...items[index], ...patch };
      onChange({ ...section, items });
    };
    return (
      <div className="space-y-3">
        {section.items.map((item, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[7rem_1fr_auto]">
            <Field
              label="Valor"
              value={item.value}
              onChange={(value) => updateItem(index, { value })}
            />
            <Field
              label="Legenda"
              value={item.label}
              onChange={(label) => updateItem(index, { label })}
            />
            <button
              type="button"
              className="btn-outline-primary min-h-11 self-end px-3 text-sm"
              onClick={() =>
                onChange({
                  ...section,
                  items: section.items.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
              disabled={section.items.length <= 1}
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-outline-primary min-h-11 px-4 text-sm"
          disabled={section.items.length >= 6}
          onClick={() =>
            onChange({
              ...section,
              items: [...section.items, { value: "", label: "" }],
            })
          }
        >
          Adicionar número
        </button>
      </div>
    );
  }

  if (section.type === "events" || section.type === "blog") {
    return <FeedFields section={section} onChange={onChange} />;
  }

  if (section.type === "story") {
    return <StoryFields section={section} onChange={onChange} />;
  }

  if (section.type === "videos") {
    return <VideoFields section={section} onChange={onChange} />;
  }

  if (section.type === "donations") {
    return (
      <div className="space-y-3">
        <Field
          label="Linha acima do título"
          value={section.eyebrow}
          onChange={(eyebrow) => onChange({ ...section, eyebrow })}
        />
        <Field
          label="Título"
          value={section.title}
          onChange={(title) => onChange({ ...section, title })}
        />
        <Field
          label="Texto"
          value={section.body}
          onChange={(body) => onChange({ ...section, body })}
          multiline
        />
        <Field
          label="Rótulo da chave"
          value={section.pixKeyLabel}
          onChange={(pixKeyLabel) => onChange({ ...section, pixKeyLabel })}
        />
        <Field
          label="Chave Pix"
          value={section.pixKey}
          onChange={(pixKey) => onChange({ ...section, pixKey })}
        />
        <Field
          label="Botão copiar"
          value={section.copyButtonLabel}
          onChange={(copyButtonLabel) =>
            onChange({ ...section, copyButtonLabel })
          }
        />
        <Field
          label="Imagem do QR Code (caminho em public/ ou https)"
          value={section.qrCodeUrl}
          onChange={(qrCodeUrl) => onChange({ ...section, qrCodeUrl })}
        />
        <Field
          label="Descrição do QR (acessibilidade)"
          value={section.qrCodeAlt}
          onChange={(qrCodeAlt) => onChange({ ...section, qrCodeAlt })}
        />
        <Field
          label="Texto abaixo do QR"
          value={section.qrHint}
          onChange={(qrHint) => onChange({ ...section, qrHint })}
          multiline
        />
      </div>
    );
  }

  if (section.type !== "cta") return null;

  return (
    <div className="space-y-3">
      <Field
        label="Título para visitante"
        value={section.titleLoggedOut}
        onChange={(titleLoggedOut) => onChange({ ...section, titleLoggedOut })}
      />
      <Field
        label="Texto para visitante"
        value={section.bodyLoggedOut}
        onChange={(bodyLoggedOut) => onChange({ ...section, bodyLoggedOut })}
        multiline
      />
      <Field
        label="Botão para visitante"
        value={section.buttonLoggedOut}
        onChange={(buttonLoggedOut) =>
          onChange({ ...section, buttonLoggedOut })
        }
      />
      <Field
        label="Título para quem entrou"
        value={section.titleLoggedIn}
        onChange={(titleLoggedIn) => onChange({ ...section, titleLoggedIn })}
      />
      <Field
        label="Texto para quem entrou"
        value={section.bodyLoggedIn}
        onChange={(bodyLoggedIn) => onChange({ ...section, bodyLoggedIn })}
        multiline
      />
      <Field
        label="Botão para quem entrou"
        value={section.buttonLoggedIn}
        onChange={(buttonLoggedIn) => onChange({ ...section, buttonLoggedIn })}
      />
    </div>
  );
}

function FeedFields({
  section,
  onChange,
}: {
  section: FeedSection;
  onChange: (section: HomeSection) => void;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="Título"
        value={section.title}
        onChange={(title) => onChange({ ...section, title })}
      />
      <Field
        label="Descrição"
        value={section.description}
        onChange={(description) => onChange({ ...section, description })}
        multiline
      />
      <Field
        label="Texto do link"
        value={section.linkLabel}
        onChange={(linkLabel) => onChange({ ...section, linkLabel })}
      />
      <Field
        label="Quantidade (1 a 6)"
        value={String(section.limit)}
        onChange={(value) =>
          onChange({ ...section, limit: Number(value) || section.limit })
        }
      />
      <FormFieldValidationShell
        label="Ocultar quando não houver conteúdo"
        value={String(section.hideWhenEmpty)}
        onValueChange={(value) =>
          onChange({ ...section, hideWhenEmpty: value === "true" })
        }
        renderControl={({ id, describedBy, className }) => (
          <input
            id={id}
            type="checkbox"
            checked={section.hideWhenEmpty}
            aria-describedby={describedBy}
            className={`min-h-11 min-w-11 accent-[var(--color-brand)] ${className}`}
            onChange={(event) =>
              onChange({ ...section, hideWhenEmpty: event.target.checked })
            }
          />
        )}
      />
    </div>
  );
}

function StoryFields({
  section,
  onChange,
}: {
  section: StorySection;
  onChange: (section: HomeSection) => void;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="Título"
        value={section.title}
        onChange={(title) => onChange({ ...section, title })}
      />
      <Field
        label="Texto"
        value={section.body}
        onChange={(body) => onChange({ ...section, body })}
        multiline
      />
      <Field
        label="Texto do link"
        value={section.linkLabel}
        onChange={(linkLabel) => onChange({ ...section, linkLabel })}
      />
      {section.images.map((image, index) => (
        <div key={index} className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Imagem ${index + 1}`}
            value={image.src}
            onChange={(src) => {
              const images = section.images.slice();
              images[index] = { ...image, src };
              onChange({ ...section, images });
            }}
          />
          <Field
            label="Descrição"
            value={image.alt}
            onChange={(alt) => {
              const images = section.images.slice();
              images[index] = { ...image, alt };
              onChange({ ...section, images });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function VideoFields({
  section,
  onChange,
}: {
  section: VideosSection;
  onChange: (section: HomeSection) => void;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="Título"
        value={section.title}
        onChange={(title) => onChange({ ...section, title })}
      />
      <Field
        label="Descrição"
        value={section.description}
        onChange={(description) => onChange({ ...section, description })}
        multiline
      />
      <Field
        label="Quantos vídeos mostrar"
        value={String(section.limit)}
        onChange={(value) =>
          onChange({ ...section, limit: Number(value) || section.limit })
        }
      />
      <Field
        label="IDs do YouTube, um por linha"
        value={section.videoIds.join("\n")}
        onChange={(value) =>
          onChange({
            ...section,
            videoIds: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          })
        }
        multiline
      />
    </div>
  );
}
