'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { FormStageActions } from '@/components/forms/FormStageActions';
import { FormStageBlock } from '@/components/forms/FormStageBlock';
import { FormStageField } from '@/components/forms/FormStageField';
import { FormView } from '@/components/forms/core/FormView';
import { MusicLoader } from '@/components/MusicLoader';
import { useAuth } from '@/contexts/AuthContext';
import type { ChangePasswordFormValues } from '@/domains/users/schemas/change-password.schema';
import { changePasswordSchema } from '@/domains/users/schemas/change-password.schema';
import { apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { userFacingError } from '@/lib/userMessages';
import type { AppUser } from '@/domains/users/types';

const DEFAULT_VALUES: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function AlterarSenhaPage() {
  const auth = useAuth();
  const router = useRouter();
  const forced = Boolean(auth.user?.mustChangePassword);
  const form = useForm<ChangePasswordFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.replace('/login');
    }
  }, [auth.isHydrated, auth.isLoggedIn, router]);

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    setError(null);
    try {
      const [sealedCurrent, sealedNext] = await Promise.all([
        sealPassword(currentPassword),
        sealPassword(newPassword),
      ]);
      const updated = await apiFetch<AppUser>('/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: sealedCurrent, newPassword: sealedNext }),
      });
      auth.updateProfile({ mustChangePassword: updated.mustChangePassword ?? false });
      router.replace('/');
    } catch (caught) {
      setError(userFacingError(caught));
    }
  };

  if (!auth.isHydrated || !auth.isLoggedIn) return null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <FormProvider {...form}>
        <FormView
          eyebrow={forced ? 'Primeiro acesso' : 'Conta'}
          title="Alterar senha"
          description={forced
            ? 'A senha inicial vale só para este acesso. Escolha outra para continuar.'
            : 'Informe a senha atual e a nova senha.'}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          formClassName="space-y-4"
        >
          <FormStageBlock title="Credenciais" surface="plain" className="!pb-0">
            <div className="space-y-4">
              <FormStageField<ChangePasswordFormValues>
                name="currentPassword"
                label={forced ? 'Senha inicial' : 'Senha atual'}
                type="password"
                placeholder={forced ? 'Senha que você recebeu' : 'Sua senha atual'}
                autoComplete="current-password"
                onEdit={() => setError(null)}
              />
              <FormStageField<ChangePasswordFormValues>
                name="newPassword"
                label="Nova senha"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                validateOnChange="confirmPassword"
                onEdit={() => setError(null)}
              />
              <FormStageField<ChangePasswordFormValues>
                name="confirmPassword"
                label="Confirmar nova senha"
                type="password"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                onEdit={() => setError(null)}
              />
            </div>
          </FormStageBlock>
          {error ? (
            <p className="rounded-md border border-[var(--destructive)]/40 px-3 py-2 text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          ) : null}
          <FormStageActions
            active={0}
            total={1}
            busy={form.formState.isSubmitting}
            onBack={() => undefined}
            onNext={() => undefined}
            centered
            submitLabel="Salvar e continuar"
            pendingLabel="Salvando…"
            pendingContent={<MusicLoader compact label="Salvando…" />}
          />
        </FormView>
      </FormProvider>
    </div>
  );
}
