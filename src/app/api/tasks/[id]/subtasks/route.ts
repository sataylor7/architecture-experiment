import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { listSubtasks } from '@/services/task.service';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };

  try {
    const subtasks = await listSubtasks(id);
    return NextResponse.json({ data: subtasks });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
