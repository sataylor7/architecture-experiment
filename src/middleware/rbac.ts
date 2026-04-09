import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { AuthedRequest, withAuth } from './auth';

export function withRole(
  ...roles: Role[]
): (
  handler: (req: AuthedRequest) => Promise<NextResponse>,
) => (req: import('next/server').NextRequest) => Promise<NextResponse> {
  return (handler) =>
    withAuth(async (req: AuthedRequest) => {
      if (!roles.includes(req.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return handler(req);
    });
}
