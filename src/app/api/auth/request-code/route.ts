import { NextRequest, NextResponse } from 'next/server';
import { RequestCodeSchema } from '@/lib/schemas/auth.schema';
import { requestCode } from '@/services/auth.service';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = RequestCodeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.flatten() },
      { status: 422 },
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

  try {
    await requestCode(result.data.email, ip ?? undefined);
    return NextResponse.json({ data: { message: 'If that email exists, a code was sent.' } });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
