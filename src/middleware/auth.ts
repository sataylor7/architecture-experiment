import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt';

export type AuthedRequest = NextRequest & { user: JwtPayload };

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: AuthedRequest, ctx?: RouteContext) => Promise<NextResponse>;

export function withAuth(handler: Handler): (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse> {
  return async (req: NextRequest, ctx?: RouteContext) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      (req as AuthedRequest).user = payload;
      return handler(req as AuthedRequest, ctx);
    } catch {
      return NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 });
    }
  };
}
