import { randomUUID } from 'crypto';
import { handleRolesRequest } from './handleRoles';
import { getCollection, isMockCollection, persistMockDb } from './store';
import type { MockCollection, MockRecord } from './types';

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function notFound(): Response {
  return jsonResponse({ error: 'Not found' }, 404);
}

function handleAuthRequest(request: Request, segments: string[]): Response | null {
  if (segments[0] !== 'auth' || segments.length < 2) return null;
  const action = segments[1];
  const method = request.method.toUpperCase();
  if (method === 'POST' && action === 'forgot-password') {
    return jsonResponse({
      message: 'Se o usuário estiver cadastrado e aprovado, um responsável vai liberar a nova senha.',
    });
  }
  if (method === 'POST' && action === 'password') {
    return jsonResponse({ mustChangePassword: false });
  }
  return jsonResponse({ error: 'Not found' }, 404);
}

function parseSegments(path: string[] | undefined): { collection: MockCollection; id?: string } | null {
  const segments = path?.filter(Boolean) ?? [];
  if (segments.length === 0 || segments.length > 2) return null;
  const [first, id] = segments;
  if (!isMockCollection(first)) return null;
  return id !== undefined ? { collection: first, id } : { collection: first };
}

function findIndex(collection: MockCollection, id: string): number {
  return getCollection(collection).findIndex((row) => row.id === id);
}

function nextId(collection: MockCollection): string {
  return `${collection}-${randomUUID()}`;
}

export async function handleMockApiRequest(
  request: Request,
  path: string[] | undefined,
): Promise<Response> {
  const segments = path?.filter(Boolean) ?? [];
  const rolesResponse = await handleRolesRequest(request, segments);
  if (rolesResponse) return rolesResponse;

  const authResponse = handleAuthRequest(request, segments);
  if (authResponse) return authResponse;

  const parsed = parseSegments(path);
  if (!parsed) return notFound();

  const { collection, id } = parsed;
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const rows = getCollection(collection);
    if (id === undefined) return jsonResponse(rows);
    const row = rows.find((item) => item.id === id);
    return row ? jsonResponse(row) : notFound();
  }

  if (method === 'POST' && id === undefined) {
    let body: MockRecord;
    try {
      body = (await request.json()) as MockRecord;
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const record: MockRecord = {
      ...body,
      id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : nextId(collection),
    };
    getCollection(collection).push(record);
    await persistMockDb();
    return jsonResponse(record, 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && id !== undefined) {
    const rows = getCollection(collection);
    const index = findIndex(collection, id);
    if (index < 0) return notFound();
    let body: MockRecord;
    try {
      body = (await request.json()) as MockRecord;
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const updated: MockRecord = {
      ...(method === 'PATCH' ? rows[index] : {}),
      ...body,
      id,
    };
    rows[index] = updated;
    await persistMockDb();
    return jsonResponse(updated);
  }

  if (method === 'DELETE' && id !== undefined) {
    const rows = getCollection(collection);
    const index = findIndex(collection, id);
    if (index < 0) return notFound();
    rows.splice(index, 1);
    await persistMockDb();
    return jsonResponse({});
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
