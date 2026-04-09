import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/services/auth.service';
import { AppError } from '@/lib/errors';

const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7) * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

  try {
    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(
      refreshToken,
      ip ?? undefined,
    );

    const response = NextResponse.json({ data: { accessToken } });
    response.cookies.set('refreshToken', newRefreshToken, {
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
