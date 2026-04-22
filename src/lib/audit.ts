import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 12);
}

export function auditLog(event: string, data: Record<string, unknown>): void {
  // Stdout JSON-lines — synchronous, always fires
  process.stdout.write(
    JSON.stringify({ timestamp: new Date().toISOString(), event, ...data }) + '\n',
  );

  // DB persistence — fire-and-forget, never blocks the request
  const { userId, clientId, ipAddress, ...rest } = data;
  prisma.auditLog?.create({
    data: {
      event,
      userId:    typeof userId    === 'string' ? userId    : null,
      clientId:  typeof clientId  === 'string' ? clientId  : null,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
      metadata:  Object.keys(rest).length > 0 ? (rest as Record<string, string | number | boolean | null>) : undefined,
    },
  }).catch((err: Error) => {
    process.stderr.write(`[audit] DB write failed: ${err.message}\n`);
  });
}
