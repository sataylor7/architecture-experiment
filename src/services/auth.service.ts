import { randomInt, randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/jwt';
import { sendOtpEmail } from '@/lib/email';
import { auditLog, hashEmail } from '@/lib/audit';
import { AppError } from '@/lib/errors';

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7);

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
}

// ─── Request OTP code ────────────────────────────────────────────────────────

export async function requestCode(email: string, ipAddress?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  });

  // Return silently — don't reveal whether the account exists
  if (!user || user.deletedAt) {
    auditLog('auth.code_requested', { emailHash: hashEmail(email), ipAddress, found: false });
    return;
  }

  // Invalidate all prior active OTP codes for this user
  await prisma.authCode.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const plainCode = randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(plainCode, 10);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP code for ${email}: ${plainCode}`);
  }

  await prisma.authCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      ipAddress: ipAddress ?? null,
    },
  });

  await sendOtpEmail(email, plainCode);

  auditLog('auth.code_requested', { emailHash: hashEmail(email), ipAddress, userId: user.id });
}

// ─── Verify OTP code ─────────────────────────────────────────────────────────

export async function verifyCode(
  email: string,
  submittedCode: string,
  ipAddress?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt) throw new AppError(401, 'Invalid code');

  const authCode = await prisma.authCode.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, codeHash: true, attempts: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!authCode) throw new AppError(401, 'Invalid or expired code');

  if (authCode.attempts >= MAX_ATTEMPTS) {
    throw new AppError(401, 'Code has been locked after too many failed attempts');
  }

  const match = await bcrypt.compare(submittedCode, authCode.codeHash);

  if (!match) {
    const newAttempts = authCode.attempts + 1;
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: {
        attempts: newAttempts,
        ...(newAttempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });
    auditLog('auth.code_failed', { userId: user.id, ipAddress, attempts: newAttempts });
    throw new AppError(401, 'Invalid code');
  }

  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const refreshToken = randomBytes(32).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      ipAddress: ipAddress ?? null,
    },
  });

  auditLog('auth.code_verified', { userId: user.id, ipAddress, success: true });

  return { accessToken, refreshToken };
}

// ─── Refresh access token ─────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string,
  ipAddress?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashRefreshToken(refreshToken);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });

  if (!record) throw new AppError(401, 'Invalid or expired refresh token');

  // Reuse of a revoked token — kill all sessions for this user immediately
  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    auditLog('auth.reuse_detected', { userId: record.userId, ipAddress });
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt) throw new AppError(401, 'Unauthorized');

  // Rotate: revoke old token, issue new one
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const newRefreshToken = randomBytes(32).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: refreshExpiresAt(),
      ipAddress: ipAddress ?? null,
    },
  });

  auditLog('auth.refresh', { userId: user.id, ipAddress });

  return { accessToken, refreshToken: newRefreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string, userId: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  auditLog('auth.logout', { userId });
}
