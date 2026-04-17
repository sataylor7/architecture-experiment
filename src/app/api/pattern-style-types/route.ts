import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { CreatePatternStyleTypeSchema } from '@/lib/schemas/project-type.schema';
import { listPatternStyleTypes, createPatternStyleType } from '@/services/project-type.service';
import { AppError } from '@/lib/errors';

export const GET = withAuth(async (_req: AuthedRequest) => {
  try {
    const data = await listPatternStyleTypes();
    return NextResponse.json({ data });
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

  const result = CreatePatternStyleTypeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const styleType = await createPatternStyleType(result.data);
    return NextResponse.json({ data: styleType }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
