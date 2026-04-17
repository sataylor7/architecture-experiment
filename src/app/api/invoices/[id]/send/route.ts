import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { sendInvoice } from '@/services/invoice.service';
import { AppError } from '@/lib/errors';

export const POST = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    const invoice = await sendInvoice(id);
    return NextResponse.json({ data: invoice });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
