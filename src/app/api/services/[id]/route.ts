import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpdateServiceSchema } from '@/lib/schemas/service.schema';
import { getServiceById, updateService, deleteService } from '@/services/service.service';
import { AppError } from '@/lib/errors';

// Both roles can view a single service
export const GET = withAuth(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    const service = await getServiceById(id);
    return NextResponse.json({ data: service });
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

  const result = UpdateServiceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const service = await updateService(id, result.data);
    return NextResponse.json({ data: service });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    await deleteService(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
