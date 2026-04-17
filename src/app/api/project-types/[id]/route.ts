import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpdateProjectTypeSchema } from '@/lib/schemas/project-type.schema';
import { updateProjectType, deleteProjectType } from '@/services/project-type.service';
import { AppError } from '@/lib/errors';

export const PATCH = withRole('admin')(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = UpdateProjectTypeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const projectType = await updateProjectType(id, result.data);
    return NextResponse.json({ data: projectType });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withRole('admin')(async (_req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };
  try {
    await deleteProjectType(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
