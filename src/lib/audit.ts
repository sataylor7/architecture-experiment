import { createHash } from 'crypto';

export function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 12);
}

export function auditLog(event: string, data: Record<string, unknown>): void {
  process.stdout.write(
    JSON.stringify({ timestamp: new Date().toISOString(), event, ...data }) + '\n',
  );
}
