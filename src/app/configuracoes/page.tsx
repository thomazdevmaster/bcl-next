"use client";

import { NotificationPreferencesSection } from "@/components/notifications/NotificationPreferencesSection";
import { useTheme } from "@/contexts/ThemeContext";

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Configurações</h1>
      <div className="space-y-6">
        <section
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          aria-labelledby="theme-title"
        >
          <h2 id="theme-title" className="mb-3 text-lg font-semibold">
            Tema
          </h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>Claro</span>
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>Escuro</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="mt-2 min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
          >
            Alternar tema
          </button>
        </section>

        <section
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          aria-labelledby="language-title"
        >
          <h2 id="language-title" className="mb-3 text-lg font-semibold">
            Idioma
          </h2>
          <select
            aria-label="Idioma"
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3"
            defaultValue="pt-BR"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </section>

        <section
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          aria-labelledby="display-title"
        >
          <h2 id="display-title" className="mb-3 text-lg font-semibold">
            Exibição
          </h2>
          <div className="space-y-2">
            {["Mostrar tooltips", "Animações reduzidas", "Modo compacto"].map(
              (label) => (
                <label key={label} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span>{label}</span>
                </label>
              ),
            )}
          </div>
        </section>
      </div>
      <NotificationPreferencesSection />
    </div>
  );
}
