import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { CreateServiceInput, UpdateServiceInput, ListServicesInput } from '@/lib/schemas/service.schema';

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  defaultPrice: true,
  category: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listServices({ cursor, limit, activeOnly }: ListServicesInput) {
  const where: Prisma.ServiceWhereInput = activeOnly ? { active: true } : {};

  const items = await prisma.service.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { name: 'asc' },
    select: serviceSelect,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getServiceById(id: string) {
  const service = await prisma.service.findUnique({ where: { id }, select: serviceSelect });
  if (!service) throw new AppError(404, 'Service not found');
  return service;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createService(data: CreateServiceInput) {
  const existing = await prisma.service.findUnique({
    where: { name: data.name },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'A service with that name already exists');

  return prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      defaultPrice: data.defaultPrice,
      category: data.category,
      active: data.active,
    },
    select: serviceSelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateService(id: string, data: UpdateServiceInput) {
  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError(404, 'Service not found');

  if (data.name) {
    const nameConflict = await prisma.service.findUnique({
      where: { name: data.name },
      select: { id: true },
    });
    if (nameConflict && nameConflict.id !== id) {
      throw new AppError(409, 'A service with that name already exists');
    }
  }

  return prisma.service.update({
    where: { id },
    data,
    select: serviceSelect,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteService(id: string) {
  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError(404, 'Service not found');
  await prisma.service.delete({ where: { id }, select: { id: true } });
}
