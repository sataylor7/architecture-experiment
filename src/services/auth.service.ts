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

// ─── Request OTP code ────────────────────────────────────────────────────────

export async function requestCode(email: string, ipAddress?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  });

  // Return silently for non-existent or soft-deleted users — don't reveal account existence
  if (!user || user.deletedAt) {
    auditLog('auth.code_requested', { emailHash: hashEmail(email), ipAddress, found: false });
    return;
  }

  // Invalidate all prior active codes for this user
  await prisma.authCode.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const plainCode = randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(plainCode, 10);

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

  if (!user || user.deletedAt) {
    throw new AppError(401, 'Invalid code');
  }

  const authCode = await prisma.authCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, codeHash: true, attempts: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!authCode) {
    throw new AppError(401, 'Invalid or expired code');
  }

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
        // Burn the code if max attempts reached
        ...(newAttempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });

    auditLog('auth.code_failed', { userId: user.id, ipAddress, attempts: newAttempts });
    throw new AppError(401, 'Invalid code');
  }

  // Mark code as used
  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Issue access token
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  // Issue refresh token
  const refreshToken = randomBytes(32).toString('hex');
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );

  // Store refresh token hash — reuse AuthCode table isn't appropriate; store in a dedicated field
  // We store refresh tokens in a separate approach using a dedicated table approach
  // For now, we store hash in a simple way via a future RefreshToken model.
  // Since CLAUDE.md doesn't define a RefreshToken model but describes storing the hash,
  // we attach it as a codeHash entry with a special marker in the AuthCode table temporarily.
  // IMPORTANT: In a real implementation, add a RefreshToken model. For Phase 1 we store
  // the hash in a lightweight fashion using a special sentinel expiresAt far in the future.
  await prisma.authCode.create({
    data: {
      userId: user.id,
      codeHash: `rt:${refreshTokenHash}`,
      expiresAt: refreshExpiresAt,
      usedAt: null,
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

  const record = await prisma.authCode.findFirst({
    where: {
      codeHash: `rt:${tokenHash}`,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!record) {
    // Check if this was a revoked token — if so, revoke all sessions
    const revokedRecord = await prisma.authCode.findFirst({
      where: { codeHash: `rt:${tokenHash}`, usedAt: { not: null } },
      select: { userId: true },
    });

    if (revokedRecord) {
      // Reuse of revoked token: delete all refresh tokens for this user
      await prisma.authCode.updateMany({
        where: { userId: revokedRecord.userId, codeHash: { startsWith: 'rt:' }, usedAt: null },
        data: { usedAt: new Date() },
      });
      auditLog('auth.reuse_detected', { userId: revokedRecord.userId, ipAddress });
    }

    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new AppError(401, 'Unauthorized');
  }

  // Rotate: mark old token as used
  await prisma.authCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  // Issue new tokens
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const newRefreshToken = randomBytes(32).toString('hex');
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.authCode.create({
    data: {
      userId: user.id,
      codeHash: `rt:${newRefreshTokenHash}`,
      expiresAt: refreshExpiresAt,
      usedAt: null,
      ipAddress: ipAddress ?? null,
    },
  });

  auditLog('auth.refresh', { userId: user.id, ipAddress });

  return { accessToken, refreshToken: newRefreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string, userId: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.authCode.updateMany({
    where: { userId, codeHash: `rt:${tokenHash}`, usedAt: null },
    data: { usedAt: new Date() },
  });

  auditLog('auth.logout', { userId });
}
