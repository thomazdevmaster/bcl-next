'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { NotificationPreferencesSection } from '@/components/notifications/NotificationPreferencesSection';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>

      <div className="space-y-6">
        {/* Tema */}
        <div className="bg-card dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Tema</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={(e) => setTheme(e.target.value as 'light')}
                className="w-4 h-4 text-primary"
              />
              <span>Claro</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={(e) => setTheme(e.target.value as 'dark')}
                className="w-4 h-4 text-primary"
              />
              <span>Escuro</span>
            </label>
          </div>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="mt-2 px-4 py-2 bg-primary text-white rounded"
          >
            Alternar Tema
          </button>
        </div>

        {/* Idioma */}
        <div className="bg-card p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Idioma</h2>
          <select className="w-full p-2 border border-gray-300 rounded-md bg-card-secondary text-card-foreground">
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>

        {/* Outras configurações */}
        <div className="bg-card p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Exibição</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary"
              />
              <span>Mostrar tooltips</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary"
              />
              <span>Animações reduzidas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary"
              />
              <span>Modo compacto</span>
            </label>
          </div>
        </div>
      </div>

      <NotificationPreferencesSection />
    </div>
  );
}
