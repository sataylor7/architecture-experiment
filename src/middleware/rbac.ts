import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { AuthedRequest, withAuth } from './auth';

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: AuthedRequest, ctx?: RouteContext) => Promise<NextResponse>;

export function withRole(...roles: Role[]): (handler: Handler) => (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse> {
  return (handler) =>
    withAuth(async (req: AuthedRequest, ctx?: RouteContext) => {
      if (!roles.includes(req.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return handler(req, ctx);
    });
}
