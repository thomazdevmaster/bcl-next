'use client';

import { useId, useState } from 'react';
import { MusicLoader } from '@/components/MusicLoader';
import { uploadMediaFile } from '@/lib/uploadMedia';
import { userFacingError } from '@/lib/userMessages';

interface MediaSourceFieldProps {
  label: string;
  value: string;
  accept: string;
  placeholder: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}

export function MediaSourceField({ label, value, accept, placeholder, onChange, onError }: MediaSourceFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={inputId}>
        {label}
        <input
          id={inputId}
          className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-outline-primary inline-flex min-h-11 cursor-pointer items-center px-4 text-sm">
          {uploading ? <MusicLoader compact label="Enviando…" /> : 'Enviar arquivo'}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setUploading(true);
              uploadMediaFile(file)
                .then(onChange)
                .catch((reason: unknown) => {
                  onError(userFacingError(reason));
                })
                .finally(() => setUploading(false));
            }}
          />
        </label>
        <span className="text-sm text-[var(--muted)]">ou cole o endereço no campo acima</span>
      </div>
    </div>
  );
}
