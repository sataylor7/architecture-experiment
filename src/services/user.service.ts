import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { CreateUserInput, UpdateUserInput, ListUsersInput } from '@/lib/schemas/user.schema';

// Admin-only response select — deletedAt is intentionally included so admins
// can distinguish soft-deleted users when showDeleted=true is used.
const userSelect = {
  id: true,
  email: true,
  role: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listUsers({ cursor, limit, showDeleted }: ListUsersInput) {
  const where = showDeleted ? {} : { deletedAt: null };

  const items = await prisma.user.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    select: userSelect,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  // Soft-deleted users return 404 — do not reveal account exists
  if (!user || user.deletedAt) throw new AppError(404, 'User not found');

  return user;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUser(data: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, deletedAt: true },
  });

  if (existing) {
    // Treat soft-deleted and active conflicts the same — do not reveal which
    throw new AppError(409, 'A user with that email already exists');
  }

  return prisma.user.create({
    data: { email: data.email, role: data.role },
    select: userSelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUser(id: string, data: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  if (!user || user.deletedAt) throw new AppError(404, 'User not found');

  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

// ─── Soft-delete ──────────────────────────────────────────────────────────────

export async function softDeleteUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  if (!user || user.deletedAt) throw new AppError(404, 'User not found');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true },
  });
}
