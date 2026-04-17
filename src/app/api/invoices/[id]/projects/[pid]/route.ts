import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { unlinkProject } from '@/services/invoice.service';
import { AppError } from '@/lib/errors';

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id, pid } = await ctx!.params as { id: string; pid: string };
  try {
    await unlinkProject(id, pid);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
