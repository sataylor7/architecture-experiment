import { NextResponse } from 'next/server';
import { withRole } from '@/middleware/rbac';
import { AuthedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';

export const GET = withRole('admin')(async (_req: AuthedRequest) => {
  try {
    const [clientCount, projectGroups, invoiceAggregate, overdueCount, taskGroups] =
      await Promise.all([
        prisma.client.count(),
        prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.invoice.aggregate({
          where: { status: { in: ['Draft', 'Sent', 'Overdue'] } },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.invoice.count({ where: { status: 'Overdue' } }),
        prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);

    const projectsByStatus = Object.fromEntries(
      projectGroups.map((g) => [g.status, g._count._all]),
    );
    const tasksByStatus = Object.fromEntries(
      taskGroups.map((g) => [g.status, g._count._all]),
    );

    return NextResponse.json({
      data: {
        clients: { total: clientCount },
        projects: projectsByStatus,
        invoices: {
          outstandingAmount: Number(invoiceAggregate._sum.total ?? 0),
          outstandingCount: invoiceAggregate._count._all,
          overdueCount,
        },
        tasks: tasksByStatus,
      },
    });
  } catch (err) {
    if (err instanceof AppError)
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
