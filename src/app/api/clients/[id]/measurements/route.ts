import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { UpsertClientMeasurementsSchema } from '@/lib/schemas/client.schema';
import { upsertClientMeasurements } from '@/services/client.service';
import { AppError } from '@/lib/errors';

export const PUT = withRole('admin')(async (req: AuthedRequest, ctx?) => {
  const { id } = await ctx!.params as { id: string };

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = UpsertClientMeasurementsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 422 });
  }

  try {
    const measurements = await upsertClientMeasurements(id, result.data);
    return NextResponse.json({ data: measurements });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
