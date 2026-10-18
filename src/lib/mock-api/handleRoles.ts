import { randomUUID } from 'crypto';
import { buildRolesCatalog, defaultPermissionsForCode } from '@/core/auth/rolesCatalog';
import { getCollection, persistMockDb } from './store';
import type { MockRecord } from './types';

type RoleMember = { id: string; name: string; email: string };
type RoleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  systemRole: boolean;
  locked: boolean;
  permissions: string[];
  users: RoleMember[];
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function userName(user: MockRecord): string {
  const username = asString(user.username).trim();
  if (username) return username;
  const email = asString(user.email);
  return email.includes('@') ? email.slice(0, email.indexOf('@')) : asString(user.id);
}

function toMember(user: MockRecord): RoleMember {
  return {
    id: asString(user.id),
    name: asString(user.name) || userName(user),
    email: asString(user.email),
  };
}

function hydrate(role: MockRecord): RoleRecord {
  const code = asString(role.code);
  const stored = asStringArray(role.permissions);
  const users = getCollection('users').filter((user) => asStringArray(user.roles).includes(code));
  return {
    id: asString(role.id),
    code,
    name: asString(role.name) || code,
    description: asString(role.description) || null,
    systemRole: Boolean(role.systemRole),
    locked: Boolean(role.locked),
    permissions: stored.length > 0 ? stored : defaultPermissionsForCode(code),
    users: users.map(toMember),
  };
}

function findRoleIndex(id: string): number {
  return getCollection('roles').findIndex((row) => asString(row.id) === id);
}

function findRoleByCode(code: string): MockRecord | undefined {
  return getCollection('roles').find((row) => asString(row.code) === code);
}

export async function handleRolesRequest(request: Request, segments: string[]): Promise<Response | null> {
  if (segments[0] !== 'roles') return null;

  const method = request.method.toUpperCase();
  const [, second, third, fourth] = segments;

  if (method === 'GET' && second === 'catalog' && third === undefined) {
    return jsonResponse(buildRolesCatalog());
  }

  if (method === 'GET' && second === undefined) {
    return jsonResponse(getCollection('roles').map(hydrate));
  }

  if (method === 'GET' && second && third === undefined) {
    const role = getCollection('roles').find((row) => asString(row.id) === second);
    return role ? jsonResponse(hydrate(role)) : jsonResponse({ error: 'Not found' }, 404);
  }

  if (method === 'POST' && second === undefined) {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const code = asString(body.code).trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,31}$/.test(code)) {
      return jsonResponse({ error: 'Código inválido.' }, 400);
    }
    if (findRoleByCode(code)) {
      return jsonResponse({ error: 'Já existe um papel com este código.' }, 409);
    }
    const record: MockRecord = {
      id: `role-${randomUUID()}`,
      code,
      name: asString(body.name).trim() || code,
      description: asString(body.description).trim() || null,
      systemRole: false,
      locked: false,
      permissions: asStringArray(body.permissions),
    };
    getCollection('roles').push(record);
    await persistMockDb();
    return jsonResponse(hydrate(record), 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && second && third === undefined) {
    const index = findRoleIndex(second);
    if (index < 0) return jsonResponse({ error: 'Not found' }, 404);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const current = getCollection('roles')[index];
    const updated: MockRecord = {
      ...current,
      name: asString(body.name).trim() || asString(current.name),
      description: asString(body.description).trim() || null,
      permissions: asStringArray(body.permissions),
      id: asString(current.id),
      code: asString(current.code),
      systemRole: Boolean(current.systemRole),
      locked: Boolean(current.locked),
    };
    getCollection('roles')[index] = updated;
    await persistMockDb();
    return jsonResponse(hydrate(updated));
  }

  if (method === 'DELETE' && second && third === undefined) {
    const index = findRoleIndex(second);
    if (index < 0) return jsonResponse({ error: 'Not found' }, 404);
    const current = getCollection('roles')[index];
    if (current.locked || current.systemRole) {
      return jsonResponse({ error: 'Papel do sistema não pode ser excluído.' }, 400);
    }
    const code = asString(current.code);
    getCollection('roles').splice(index, 1);
    for (const user of getCollection('users')) {
      user.roles = asStringArray(user.roles).filter((role) => role !== code);
    }
    await persistMockDb();
    return jsonResponse({});
  }

  if (method === 'POST' && second && third === 'users' && fourth === undefined) {
    const role = getCollection('roles').find((row) => asString(row.id) === second);
    if (!role) return jsonResponse({ error: 'Not found' }, 404);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const userId = asString(body.userId);
    const user = getCollection('users').find((row) => asString(row.id) === userId);
    if (!user) return jsonResponse({ error: 'Usuário não encontrado.' }, 404);
    const code = asString(role.code);
    const roles = asStringArray(user.roles);
    if (!roles.includes(code)) {
      user.roles = [...roles, code];
      await persistMockDb();
    }
    return jsonResponse(hydrate(role));
  }

  if (method === 'DELETE' && second && third === 'users' && fourth) {
    const role = getCollection('roles').find((row) => asString(row.id) === second);
    if (!role) return jsonResponse({ error: 'Not found' }, 404);
    const user = getCollection('users').find((row) => asString(row.id) === fourth);
    if (!user) return jsonResponse({ error: 'Usuário não encontrado.' }, 404);
    const code = asString(role.code);
    user.roles = asStringArray(user.roles).filter((item) => item !== code);
    await persistMockDb();
    return jsonResponse(hydrate(role));
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
