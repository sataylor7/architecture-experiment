import { Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from '@/lib/schemas/project.schema';

// ─── Role-scoped select objects ───────────────────────────────────────────────

const adminProjectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  notes: true,
  dueDate: true,
  price: true,
  paid: true,
  completed: true,
  clientId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  projectTypes: {
    select: {
      projectType: { select: { id: true, name: true, category: true, sewingSubcategory: true } },
      assignedAt: true,
    },
  },
} as const;

const clientProjectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  dueDate: true,
  completed: true,
  clientId: true,
  createdAt: true,
  projectTypes: {
    select: {
      projectType: { select: { id: true, name: true, category: true } },
    },
  },
} as const;

// ─── Status sync helper ───────────────────────────────────────────────────────

function syncStatusAndCompleted(data: { status?: string; completed?: boolean }) {
  if (data.status === 'Completed') data.completed = true;
  if (data.completed === true) data.status = 'Completed';
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProjects(
  { cursor, limit, status, clientId, projectTypeId, dueDateFrom, dueDateTo }: ListProjectsInput,
) {
  const where: Prisma.ProjectWhereInput = {};

  if (status) where.status = status as ProjectStatus;
  if (clientId) where.clientId = clientId;
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {
      ...(dueDateFrom ? { gte: dueDateFrom } : {}),
      ...(dueDateTo ? { lte: dueDateTo } : {}),
    };
  }
  if (projectTypeId) {
    where.projectTypes = { some: { projectTypeId } };
  }

  const items = await prisma.project.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    where,
    select: adminProjectSelect,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getProjectById(
  id: string,
  role: 'admin' | 'client',
  requestingUserId: string,
) {
  const select = role === 'admin' ? adminProjectSelect : clientProjectSelect;
  const project = await prisma.project.findUnique({ where: { id }, select });
  if (!project) throw new AppError(404, 'Project not found');

  if (role === 'client') {
    const user = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { email: true },
    });
    const clientRecord = user
      ? await prisma.client.findUnique({ where: { email: user.email }, select: { id: true } })
      : null;
    if (!clientRecord || project.clientId !== clientRecord.id) {
      throw new AppError(403, 'Forbidden');
    }
  }

  return project;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProject(data: CreateProjectInput) {
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

  const typeCount = await prisma.projectType.count({
    where: { id: { in: data.projectTypeIds } },
  });
  if (typeCount !== data.projectTypeIds.length) {
    throw new AppError(404, 'One or more projectTypeIds not found');
  }

  const createData: Prisma.ProjectCreateInput = {
    name: data.name,
    description: data.description,
    status: data.status as ProjectStatus,
    notes: data.notes,
    dueDate: data.dueDate,
    price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
    paid: data.paid,
    client: { connect: { id: data.clientId } },
    user: { connect: { id: data.userId } },
    projectTypes: {
      create: data.projectTypeIds.map((projectTypeId) => ({ projectTypeId })),
    },
  };

  if (data.status === 'Completed') createData.completed = true;

  return prisma.project.create({ data: createData, select: adminProjectSelect });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProject(id: string, data: UpdateProjectInput) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Project not found');

  const updateData: Prisma.ProjectUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
  if (data.paid !== undefined) updateData.paid = data.paid;

  const statusData: { status?: string; completed?: boolean } = {
    status: data.status,
    completed: data.completed,
  };
  syncStatusAndCompleted(statusData);
  if (statusData.status !== undefined) updateData.status = statusData.status as ProjectStatus;
  if (statusData.completed !== undefined) updateData.completed = statusData.completed;

  if (data.projectTypeIds) {
    const typeCount = await prisma.projectType.count({
      where: { id: { in: data.projectTypeIds } },
    });
    if (typeCount !== data.projectTypeIds.length) {
      throw new AppError(404, 'One or more projectTypeIds not found');
    }
    updateData.projectTypes = {
      deleteMany: {},
      create: data.projectTypeIds.map((projectTypeId) => ({ projectTypeId })),
    };
  }

  return prisma.project.update({ where: { id }, data: updateData, select: adminProjectSelect });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProject(id: string) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Project not found');

  await prisma.project.delete({ where: { id }, select: { id: true } });
}

// ─── List tasks for a project ─────────────────────────────────────────────────

export async function listProjectTasks(id: string, role: 'admin' | 'client', requestingUserId: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, clientId: true },
  });
  if (!project) throw new AppError(404, 'Project not found');

  if (role === 'client') {
    const user = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { email: true },
    });
    const clientRecord = user
      ? await prisma.client.findUnique({ where: { email: user.email }, select: { id: true } })
      : null;
    if (!clientRecord || project.clientId !== clientRecord.id) {
      throw new AppError(403, 'Forbidden');
    }
  }

  return prisma.task.findMany({
    where: { projectId: id, parentTaskId: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      projectId: true,
      parentTaskId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      assignedTo: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      subtasks: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          projectId: true,
          parentTaskId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          assignedTo: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

// ─── List invoices for a project ─────────────────────────────────────────────

export async function listProjectInvoices(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!project) throw new AppError(404, 'Project not found');

  return prisma.projectInvoice.findMany({
    where: { projectId: id },
    select: {
      linkedAt: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          dueDate: true,
          total: true,
          clientId: true,
        },
      },
    },
  });
}
