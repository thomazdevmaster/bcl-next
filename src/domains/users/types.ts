import type { Auditable, EntityId } from '../shared';

/**
 * Conta de acesso. Todo usuário é uma pessoa: nome, e-mail, foto, telefone e
 * endereço vêm do cadastro da pessoa (`personId`).
 */
export interface AppUser extends Auditable {
  id: EntityId;
  username: string;
  email?: string | null;
  name: string;
  roles: string[];
  personId: EntityId;
  isActive: boolean;
  mustChangePassword?: boolean;
  /** Conta criada via Google: falta telefone e usuário definitivo. */
  needsProfileCompletion?: boolean;
  approvalStatus?: 'pending' | 'approved';
  passwordResetRequested?: boolean;
  pictureUrl?: string | null;
  phone?: string | null;
  address?: string | null;
}
