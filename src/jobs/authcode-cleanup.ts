import cron from 'node-cron';
import { prisma } from '@/lib/prisma';

// Runs every hour — purges stale AuthCode and RefreshToken records older than 24 hours
export function startAuthCodeCleanup(): void {
  cron.schedule('0 * * * *', async () => {
    const cutoff = new Date(Date.now() - 86400000);
    try {
      const [codes, tokens] = await Promise.all([
        prisma.authCode.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }],
          },
        }),
        prisma.refreshToken.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }],
          },
        }),
      ]);

      if (codes.count > 0 || tokens.count > 0) {
        process.stdout.write(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'job.authcode_cleanup',
            deletedAuthCodes: codes.count,
            deletedRefreshTokens: tokens.count,
          }) + '\n',
        );
      }
    } catch (err) {
      console.error('[authcode-cleanup] error:', err);
    }
  });
}
