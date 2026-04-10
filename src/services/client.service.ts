import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { encryptTaxId, maskTaxId, decryptTaxId } from '@/lib/crypto';
import { auditLog } from '@/lib/audit';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from '@/lib/schemas/client.schema';

// ─── Role-scoped select objects ───────────────────────────────────────────────

const adminClientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  socialMedia: true,
  userId: true,
  subscribed: true,
  taxId: true,       // returned as masked/decrypted depending on caller
  measurements: true,
  createdAt: true,
  updatedAt: true,
} as const;

const clientClientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  socialMedia: true,
  subscribed: true,
  createdAt: true,
  // userId, taxId, measurements intentionally omitted
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskClientTaxId<T extends { taxId?: string | null }>(client: T): T {
  if (!client.taxId) return client;
  return { ...client, taxId: maskTaxId(client.taxId) };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listClients(
  { cursor, limit }: ListClientsInput,
  role: 'admin' | 'client',
) {
  const select = role === 'admin' ? adminClientSelect : clientClientSelect;

  const items = await prisma.client.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    select,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  // Mask taxId for admin list — full decrypt only on individual get
  const masked = role === 'admin'
    ? (data as Array<typeof data[number] & { taxId?: string | null }>).map(maskClientTaxId)
    : data;

  return { data: masked, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getClientById(
  id: string,
  role: 'admin' | 'client',
  requestingUserId: string,
  revealTaxId = false,
) {
  const select = role === 'admin' ? adminClientSelect : clientClientSelect;

  const client = await prisma.client.findUnique({ where: { id }, select });
  if (!client) throw new AppError(404, 'Client not found');

  if (role !== 'admin') return client;

  const adminClient = client as typeof client & { taxId?: string | null };

  if (!adminClient.taxId) return adminClient;

  if (revealTaxId) {
    auditLog('client.taxid_accessed', { adminUserId: requestingUserId, clientId: id });
    return { ...adminClient, taxId: decryptTaxId(adminClient.taxId) };
  }

  return maskClientTaxId(adminClient);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createClient(data: CreateClientInput) {
  const existing = await prisma.client.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'A client with that email already exists');

  const userExists = await prisma.user.findUnique({
    where: { id: data.userId, deletedAt: null },
    select: { id: true },
  });
  if (!userExists) throw new AppError(404, 'User not found');

  const encryptedTaxId = data.taxId ? encryptTaxId(data.taxId) : undefined;

  const client = await prisma.client.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      company: data.company,
      socialMedia: data.socialMedia as Prisma.InputJsonValue | undefined,
      subscribed: data.subscribed,
      taxId: encryptedTaxId,
      measurements: data.measurements as Prisma.InputJsonValue | undefined,
      userId: data.userId,
    },
    select: adminClientSelect,
  });

  const result = client as typeof client & { taxId?: string | null };
  return maskClientTaxId(result);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateClient(id: string, data: UpdateClientInput) {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Client not found');

  if (data.email) {
    const emailConflict = await prisma.client.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (emailConflict && emailConflict.id !== id) {
      throw new AppError(409, 'A client with that email already exists');
    }
  }

  const encryptedTaxId = data.taxId ? encryptTaxId(data.taxId) : undefined;

  const client = await prisma.client.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      company: data.company,
      subscribed: data.subscribed,
      socialMedia: data.socialMedia as Prisma.InputJsonValue | undefined,
      measurements: data.measurements as Prisma.InputJsonValue | undefined,
      ...(encryptedTaxId !== undefined ? { taxId: encryptedTaxId } : {}),
    },
    select: adminClientSelect,
  });

  const result = client as typeof client & { taxId?: string | null };
  return maskClientTaxId(result);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteClient(id: string) {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Client not found');

  await prisma.client.delete({ where: { id }, select: { id: true } });
}
