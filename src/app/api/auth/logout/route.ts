import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/services/auth.service';
import { verifyAccessToken } from '@/lib/jwt';
import { AppError } from '@/lib/errors';

export async function DELETE(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    await logout(refreshToken, payload.sub);

    const response = new NextResponse(null, { status: 204 });
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
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
