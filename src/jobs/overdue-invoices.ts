import cron from 'node-cron';
import { prisma } from '@/lib/prisma';

// Runs daily at 01:00 — marks Sent invoices past their due date as Overdue
export function startOverdueInvoiceJob(): void {
  cron.schedule('0 1 * * *', async () => {
    try {
      const result = await prisma.invoice.updateMany({
        where: { status: 'Sent', dueDate: { lt: new Date() } },
        data: { status: 'Overdue' },
      });
      if (result.count > 0) {
        process.stdout.write(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'job.overdue_invoices',
            updated: result.count,
          }) + '\n',
        );
      }
    } catch (err) {
      console.error('[overdue-invoices] error:', err);
    }
  });
}
