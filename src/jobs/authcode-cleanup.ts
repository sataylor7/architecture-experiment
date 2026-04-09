import cron from 'node-cron';
import { prisma } from '@/lib/prisma';

// Runs every hour — deletes AuthCode records older than 24 hours (expired or used)
export function startAuthCodeCleanup(): void {
  cron.schedule('0 * * * *', async () => {
    const cutoff = new Date(Date.now() - 86400000);
    try {
      const result = await prisma.authCode.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }],
        },
      });
      if (result.count > 0) {
        process.stdout.write(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'job.authcode_cleanup',
            deleted: result.count,
          }) + '\n',
        );
      }
    } catch (err) {
      console.error('[authcode-cleanup] error:', err);
    }
  });
}
