import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { encryptTaxId, maskTaxId, decryptTaxId } from '@/lib/crypto';
import { auditLog } from '@/lib/audit';
import type {
  CreateClientInput,
  UpdateClientInput,
  ListClientsInput,
  UpsertClientSocialMediaInput,
  UpsertClientMeasurementsInput,
} from '@/lib/schemas/client.schema';
import { MeasurementUnit } from '@prisma/client';

// ─── Select objects ───────────────────────────────────────────────────────────

const socialMediaSelect = {
  id: true,
  facebook: true,
  instagram: true,
  twitter: true,
  linkedin: true,
  github: true,
} as const;

const measurementsSelect = {
  id: true,
  unit: true,
  neck: true,
  shoulder: true,
  shoulderToElbow: true,
  bicep: true,
  wrist: true,
  chest: true,
  waist: true,
  hip: true,
  thigh: true,
  ankle: true,
  hipToKnee: true,
  crotchLength: true,
  createdAt: true,
  updatedAt: true,
} as const;

// List select — lightweight, no sub-relations
const adminClientListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  userId: true,
  subscribed: true,
  taxId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const clientClientListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  subscribed: true,
  createdAt: true,
} as const;

// Detail select — includes related tables
const adminClientDetailSelect = {
  ...adminClientListSelect,
  socialMedia: { select: socialMediaSelect },
  measurements: { select: measurementsSelect },
} as const;

const clientClientDetailSelect = {
  ...clientClientListSelect,
  socialMedia: { select: socialMediaSelect },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskClientTaxId<T extends { taxId?: string | null }>(client: T): T {
  if (!client.taxId) return client;
  return { ...client, taxId: maskTaxId(client.taxId) };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listClients(
  { cursor, limit }: ListClientsInput,
  role: 'admin' | 'client',
) {
  const select = role === 'admin' ? adminClientListSelect : clientClientListSelect;

  const items = await prisma.client.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    select,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

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
  const select = role === 'admin' ? adminClientDetailSelect : clientClientDetailSelect;

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
      subscribed: data.subscribed,
      taxId: encryptedTaxId,
      userId: data.userId,
    },
    select: adminClientDetailSelect,
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
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.subscribed !== undefined ? { subscribed: data.subscribed } : {}),
      ...(encryptedTaxId !== undefined ? { taxId: encryptedTaxId } : {}),
    },
    select: adminClientDetailSelect,
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

// ─── Social media ─────────────────────────────────────────────────────────────

export async function upsertClientSocialMedia(clientId: string, data: UpsertClientSocialMediaInput) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new AppError(404, 'Client not found');

  return prisma.clientSocialMedia.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: { ...data },
    select: socialMediaSelect,
  });
}

// ─── Measurements ─────────────────────────────────────────────────────────────

export async function upsertClientMeasurements(clientId: string, data: UpsertClientMeasurementsInput) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new AppError(404, 'Client not found');

  return prisma.clientMeasurements.upsert({
    where: { clientId },
    create: { clientId, unit: data.unit as MeasurementUnit, ...data },
    update: { unit: data.unit as MeasurementUnit, ...data },
    select: measurementsSelect,
  });
}
