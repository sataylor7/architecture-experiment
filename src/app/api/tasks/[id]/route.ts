import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpdateTaskSchema } from '@/lib/schemas/task.schema';
import { getTaskById, updateTask, deleteTask } from '@/services/task.service';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };

  try {
    const task = await getTaskById(id);
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withRole('admin')(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = UpdateTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const task = await updateTask(id, result.data);
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    await deleteTask(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
