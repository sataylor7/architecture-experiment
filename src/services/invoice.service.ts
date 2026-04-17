import { Prisma, InvoiceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
  CreateLineItemInput,
  UpdateLineItemInput,
  MarkPaidInput,
} from '@/lib/schemas/invoice.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCKED_STATUSES: InvoiceStatus[] = ['Sent', 'Paid', 'Overdue', 'Cancelled'];
const HARD_DELETE_ALLOWED: InvoiceStatus[] = ['Draft', 'Cancelled'];

// ─── Select objects ───────────────────────────────────────────────────────────

const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  clientId: true,
  userId: true,
  status: true,
  issueDate: true,
  dueDate: true,
  paidAt: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  total: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const invoiceDetailSelect = {
  ...invoiceListSelect,
  lineItems: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      invoiceId: true,
      serviceId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      sortOrder: true,
      createdAt: true,
    },
  },
  projects: {
    select: {
      linkedAt: true,
      project: {
        select: { id: true, name: true, status: true, clientId: true },
      },
    },
  },
};

const lineItemSelect = {
  id: true,
  invoiceId: true,
  serviceId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
  sortOrder: true,
  createdAt: true,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertInvoiceEditable(status: InvoiceStatus) {
  if (LOCKED_STATUSES.includes(status)) {
    throw new AppError(409, 'Invoice is locked and cannot be modified');
  }
}

async function recomputeInvoiceTotals(
  invoiceId: string,
  tx: Prisma.TransactionClient,
) {
  const items = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { lineTotal: true },
  });
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { taxRate: true },
  });

  const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
  const taxAmount = Number((subtotal * Number(invoice.taxRate)).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total },
    select: { id: true },
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listInvoices({
  cursor,
  limit,
  status,
  clientId,
  issueDateFrom,
  issueDateTo,
  dueDateFrom,
  dueDateTo,
}: ListInvoicesInput) {
  const where: Prisma.InvoiceWhereInput = {};

  if (status) where.status = status as InvoiceStatus;
  if (clientId) where.clientId = clientId;
  if (issueDateFrom || issueDateTo) {
    where.issueDate = {
      ...(issueDateFrom ? { gte: issueDateFrom } : {}),
      ...(issueDateTo ? { lte: issueDateTo } : {}),
    };
  }
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {
      ...(dueDateFrom ? { gte: dueDateFrom } : {}),
      ...(dueDateTo ? { lte: dueDateTo } : {}),
    };
  }

  const items = await prisma.invoice.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    where,
    select: invoiceListSelect,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: invoiceDetailSelect,
  });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return invoice;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createInvoice(data: CreateInvoiceInput) {
  const clientExists = await prisma.client.findUnique({
    where: { id: data.clientId },
    select: { id: true },
  });
  if (!clientExists) throw new AppError(404, 'Client not found');

  const userExists = await prisma.user.findUnique({
    where: { id: data.userId, deletedAt: null },
    select: { id: true },
  });
  if (!userExists) throw new AppError(404, 'User not found');

  const numberConflict = await prisma.invoice.findUnique({
    where: { invoiceNumber: data.invoiceNumber },
    select: { id: true },
  });
  if (numberConflict) throw new AppError(409, 'Invoice number already in use');

  if (data.projectIds?.length) {
    const count = await prisma.project.count({
      where: { id: { in: data.projectIds } },
    });
    if (count !== data.projectIds.length) {
      throw new AppError(404, 'One or more projectIds not found');
    }
  }

  return prisma.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      clientId: data.clientId,
      userId: data.userId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      taxRate: new Prisma.Decimal(data.taxRate),
      notes: data.notes,
      ...(data.projectIds?.length
        ? {
            projects: {
              create: data.projectIds.map((projectId) => ({ projectId })),
            },
          }
        : {}),
    },
    select: invoiceDetailSelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateInvoice(id: string, data: UpdateInvoiceInput) {
  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true, invoiceNumber: true },
  });
  if (!existing) throw new AppError(404, 'Invoice not found');
  assertInvoiceEditable(existing.status);

  if (data.invoiceNumber && data.invoiceNumber !== existing.invoiceNumber) {
    const conflict = await prisma.invoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (conflict) throw new AppError(409, 'Invoice number already in use');
  }

  if (data.taxRate !== undefined) {
    return prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          ...(data.invoiceNumber !== undefined ? { invoiceNumber: data.invoiceNumber } : {}),
          ...(data.issueDate !== undefined ? { issueDate: data.issueDate } : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          taxRate: new Prisma.Decimal(data.taxRate!),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
        select: { id: true },
      });
      await recomputeInvoiceTotals(id, tx);
      return tx.invoice.findUniqueOrThrow({ where: { id }, select: invoiceDetailSelect });
    });
  }

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.invoiceNumber !== undefined ? { invoiceNumber: data.invoiceNumber } : {}),
      ...(data.issueDate !== undefined ? { issueDate: data.issueDate } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
    select: invoiceDetailSelect,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInvoice(id: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new AppError(404, 'Invoice not found');
  if (!HARD_DELETE_ALLOWED.includes(existing.status)) {
    throw new AppError(409, 'Only Draft or Cancelled invoices may be hard-deleted');
  }

  await prisma.invoice.delete({ where: { id }, select: { id: true } });
}

// ─── Line items ───────────────────────────────────────────────────────────────

export async function addLineItem(invoiceId: string, data: CreateLineItemInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    assertInvoiceEditable(invoice.status);

    if (data.serviceId) {
      const serviceExists = await tx.service.findUnique({
        where: { id: data.serviceId },
        select: { id: true },
      });
      if (!serviceExists) throw new AppError(404, 'Service not found');
    }

    const lineTotal = new Prisma.Decimal(
      (data.quantity * data.unitPrice).toFixed(2),
    );

    const lineItem = await tx.invoiceLineItem.create({
      data: {
        invoiceId,
        serviceId: data.serviceId,
        description: data.description,
        quantity: new Prisma.Decimal(data.quantity),
        unitPrice: new Prisma.Decimal(data.unitPrice),
        lineTotal,
        sortOrder: data.sortOrder,
      },
      select: lineItemSelect,
    });

    await recomputeInvoiceTotals(invoiceId, tx);
    return lineItem;
  });
}

export async function updateLineItem(
  invoiceId: string,
  lineItemId: string,
  data: UpdateLineItemInput,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    assertInvoiceEditable(invoice.status);

    const existing = await tx.invoiceLineItem.findUnique({
      where: { id: lineItemId },
      select: { id: true, invoiceId: true, quantity: true, unitPrice: true },
    });
    if (!existing) throw new AppError(404, 'Line item not found');
    if (existing.invoiceId !== invoiceId) throw new AppError(404, 'Line item not found');

    const newQty = data.quantity ?? Number(existing.quantity);
    const newPrice = data.unitPrice ?? Number(existing.unitPrice);
    const lineTotal = new Prisma.Decimal((newQty * newPrice).toFixed(2));

    const lineItem = await tx.invoiceLineItem.update({
      where: { id: lineItemId },
      data: {
        ...(data.serviceId !== undefined ? { serviceId: data.serviceId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.quantity !== undefined ? { quantity: new Prisma.Decimal(data.quantity) } : {}),
        ...(data.unitPrice !== undefined ? { unitPrice: new Prisma.Decimal(data.unitPrice) } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        lineTotal,
      },
      select: lineItemSelect,
    });

    await recomputeInvoiceTotals(invoiceId, tx);
    return lineItem;
  });
}

export async function removeLineItem(invoiceId: string, lineItemId: string) {
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    assertInvoiceEditable(invoice.status);

    const existing = await tx.invoiceLineItem.findUnique({
      where: { id: lineItemId },
      select: { id: true, invoiceId: true },
    });
    if (!existing) throw new AppError(404, 'Line item not found');
    if (existing.invoiceId !== invoiceId) throw new AppError(404, 'Line item not found');

    await tx.invoiceLineItem.delete({ where: { id: lineItemId }, select: { id: true } });
    await recomputeInvoiceTotals(invoiceId, tx);
  });
}

// ─── Project linking ──────────────────────────────────────────────────────────

export async function linkProject(invoiceId: string, projectId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true },
  });
  if (!invoice) throw new AppError(404, 'Invoice not found');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new AppError(404, 'Project not found');

  const existing = await prisma.projectInvoice.findUnique({
    where: { projectId_invoiceId: { projectId, invoiceId } },
    select: { projectId: true },
  });
  if (existing) throw new AppError(409, 'Project is already linked to this invoice');

  return prisma.projectInvoice.create({
    data: { projectId, invoiceId },
    select: { projectId: true, invoiceId: true, linkedAt: true },
  });
}

export async function unlinkProject(invoiceId: string, projectId: string) {
  const existing = await prisma.projectInvoice.findUnique({
    where: { projectId_invoiceId: { projectId, invoiceId } },
    select: { projectId: true },
  });
  if (!existing) throw new AppError(404, 'Project is not linked to this invoice');

  await prisma.projectInvoice.delete({
    where: { projectId_invoiceId: { projectId, invoiceId } },
    select: { projectId: true },
  });
}

// ─── Status transitions ───────────────────────────────────────────────────────

export async function sendInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  if (invoice.status !== 'Draft') {
    throw new AppError(409, 'Only Draft invoices can be sent');
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: 'Sent' },
    select: invoiceDetailSelect,
  });
}

export async function markInvoicePaid(id: string, { paidAt }: MarkPaidInput) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  if (!(['Sent', 'Overdue'] as InvoiceStatus[]).includes(invoice.status)) {
    throw new AppError(409, 'Only Sent or Overdue invoices can be marked as paid');
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: 'Paid', paidAt },
    select: invoiceDetailSelect,
  });
}
