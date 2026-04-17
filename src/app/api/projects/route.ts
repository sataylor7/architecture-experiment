import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { CreateProjectSchema, ListProjectsSchema } from '@/lib/schemas/project.schema';
import { createProject, listProjects } from '@/services/project.service';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (req: AuthedRequest) => {
  const { searchParams } = req.nextUrl;
  const result = ListProjectsSchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    clientId: searchParams.get('clientId') ?? undefined,
    projectTypeId: searchParams.get('projectTypeId') ?? undefined,
    dueDateFrom: searchParams.get('dueDateFrom') ?? undefined,
    dueDateTo: searchParams.get('dueDateTo') ?? undefined,
  });
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const data = await listProjects(result.data);
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

  const result = CreateProjectSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const project = await createProject(result.data);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
