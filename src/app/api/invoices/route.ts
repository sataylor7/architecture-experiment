import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { CreateInvoiceSchema, ListInvoicesSchema } from '@/lib/schemas/invoice.schema';
import { createInvoice, listInvoices } from '@/services/invoice.service';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (req: AuthedRequest) => {
  const { searchParams } = req.nextUrl;
  const result = ListInvoicesSchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    clientId: searchParams.get('clientId') ?? undefined,
    issueDateFrom: searchParams.get('issueDateFrom') ?? undefined,
    issueDateTo: searchParams.get('issueDateTo') ?? undefined,
    dueDateFrom: searchParams.get('dueDateFrom') ?? undefined,
    dueDateTo: searchParams.get('dueDateTo') ?? undefined,
  });
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const data = await listInvoices(result.data);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withRole('admin')(async (req: NextRequest) => {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = CreateInvoiceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const invoice = await createInvoice(result.data);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
