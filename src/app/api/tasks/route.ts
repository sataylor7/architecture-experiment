import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { CreateTaskSchema, ListTasksSchema } from '@/lib/schemas/task.schema';
import { createTask, listTasks } from '@/services/task.service';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (req: AuthedRequest) => {
  const { searchParams } = req.nextUrl;
  const result = ListTasksSchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    assignedTo: searchParams.get('assignedTo') ?? undefined,
  });
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const data = await listTasks(result.data);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withRole('admin')(async (req: NextRequest) => {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const task = await createTask(result.data);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
