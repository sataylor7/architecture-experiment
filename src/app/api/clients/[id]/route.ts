import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpdateClientSchema } from '@/lib/schemas/client.schema';
import { getClientById, updateClient, deleteClient } from '@/services/client.service';
import { AppError } from '@/lib/errors';

export const GET = withAuth(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  // ?reveal=true is admin-only — if a client-role token passes it, service ignores it
  const reveal = req.user.role === 'admin' && req.nextUrl.searchParams.get('reveal') === 'true';

  try {
    const client = await getClientById(id, req.user.role, req.user.sub, reveal);
    return NextResponse.json({ data: client });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withRole('admin')(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = UpdateClientSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const client = await updateClient(id, result.data);
    return NextResponse.json({ data: client });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    await deleteClient(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
