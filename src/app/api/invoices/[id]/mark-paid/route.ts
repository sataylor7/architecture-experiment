import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { MarkPaidSchema } from '@/lib/schemas/invoice.schema';
import { markInvoicePaid } from '@/services/invoice.service';
import { AppError } from '@/lib/errors';

export const POST = withRole('admin')(async (req: NextRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = MarkPaidSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const invoice = await markInvoicePaid(id, result.data);
    return NextResponse.json({ data: invoice });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
