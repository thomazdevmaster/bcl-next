import type { AppUser } from '@/domains/users/types';

/** Para onde mandar o usuário logo após login ou cadastro Google. */
export function postLoginRoute(user: AppUser): string {
  if (user.mustChangePassword) return '/alterar-senha';
  if (user.needsProfileCompletion) return '/completar-cadastro';
  return '/';
}
