import { NextRequest, NextResponse } from 'next/server';
import { VerifyCodeSchema } from '@/lib/schemas/auth.schema';
import { verifyCode } from '@/services/auth.service';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';

const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7) * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = VerifyCodeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.issues },
      { status: 422 },
    );
  }

  // Rate limit keyed on email (shared bucket with request-code)
  if (!checkAuthRateLimit(result.data.email)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in 10 minutes.' },
      { status: 429 },
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

  try {
    const { accessToken, refreshToken } = await verifyCode(
      result.data.email,
      result.data.code,
      ip ?? undefined,
    );

    const response = NextResponse.json({ data: { accessToken } });
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return response;
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
