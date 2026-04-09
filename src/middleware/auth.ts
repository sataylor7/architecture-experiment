import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt';

export type AuthedRequest = NextRequest & { user: JwtPayload };

export function withAuth(
  handler: (req: AuthedRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      (req as AuthedRequest).user = payload;
      return handler(req as AuthedRequest);
    } catch {
      return NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 });
    }
  };
}
