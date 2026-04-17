import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthedRequest } from '@/middleware/auth';
import { listProjectTasks } from '@/services/project.service';
import { AppError } from '@/lib/errors';

export const GET = withAuth(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };

  try {
    const tasks = await listProjectTasks(id, req.user.role, req.user.sub);
    return NextResponse.json({ data: tasks });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
