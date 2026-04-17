import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpdateLineItemSchema } from '@/lib/schemas/invoice.schema';
import { updateLineItem, removeLineItem } from '@/services/invoice.service';
import { AppError } from '@/lib/errors';

export const PATCH = withRole('admin')(async (req: AuthedRequest, ctx?) => {
  const { id, liId } = await ctx!.params as { id: string; liId: string };
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = UpdateLineItemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const lineItem = await updateLineItem(id, liId, result.data);
    return NextResponse.json({ data: lineItem });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id, liId } = await ctx!.params as { id: string; liId: string };
  try {
    await removeLineItem(id, liId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
