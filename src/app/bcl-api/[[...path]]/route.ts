import { usesRemoteApi } from '@/config/environment';
import { handleMockApiRequest } from '@/lib/mock-api/handleRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

function mockDisabled(): Response | null {
  if (!usesRemoteApi()) return null;
  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function dispatch(request: Request, context: RouteContext): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked) return blocked;
  const { path } = await context.params;
  return handleMockApiRequest(request, path);
}

export async function GET(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return dispatch(request, context);
}
