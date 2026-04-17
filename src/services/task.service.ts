import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { CreateTaskInput, UpdateTaskInput, ListTasksInput } from '@/lib/schemas/task.schema';
import { TaskStatus, Priority } from '@prisma/client';

// ─── Select ───────────────────────────────────────────────────────────────────

const taskSelect = {
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
} as const;

const taskWithSubtasksSelect = {
  ...taskSelect,
  subtasks: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: taskSelect,
  },
} as const;

// ─── Depth guard ─────────────────────────────────────────────────────────────

async function assertSubtaskAllowed(parentTaskId: string, projectId: string) {
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    select: { parentTaskId: true, projectId: true },
  });
  if (!parent) throw new AppError(404, 'Parent task not found');
  if (parent.parentTaskId) throw new AppError(422, 'Maximum subtask depth is 1');
  if (parent.projectId !== projectId) {
    throw new AppError(422, 'Subtask must belong to the same project as its parent');
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTasks({ cursor, limit, status, projectId, assignedTo }: ListTasksInput) {
  const where = {
    ...(status ? { status: status as TaskStatus } : {}),
    ...(projectId ? { projectId } : {}),
    ...(assignedTo ? { assignedTo } : {}),
  };

  const items = await prisma.task.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    where,
    select: taskSelect,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, meta: { nextCursor, hasMore } };
}

// ─── Get one ──────────────────────────────────────────────────────────────────

export async function getTaskById(id: string) {
  const task = await prisma.task.findUnique({ where: { id }, select: taskWithSubtasksSelect });
  if (!task) throw new AppError(404, 'Task not found');
  return task;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskInput) {
  const projectExists = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { id: true },
  });
  if (!projectExists) throw new AppError(404, 'Project not found');

  if (data.parentTaskId) {
    await assertSubtaskAllowed(data.parentTaskId, data.projectId);
  }

  if (data.assignedTo) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedTo, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!assignee) throw new AppError(404, 'Assigned user not found');
    if (assignee.role !== 'admin') throw new AppError(422, 'Tasks can only be assigned to admin-role users');
  }

  const completedAt = data.status === 'Done' ? new Date() : undefined;

  return prisma.task.create({
    data: {
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      title: data.title,
      description: data.description,
      status: data.status as TaskStatus,
      priority: data.priority as Priority,
      dueDate: data.dueDate,
      completedAt,
      assignedTo: data.assignedTo,
      sortOrder: data.sortOrder,
    },
    select: taskWithSubtasksSelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTask(id: string, data: UpdateTaskInput) {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Task not found');

  if (data.assignedTo) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedTo, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!assignee) throw new AppError(404, 'Assigned user not found');
    if (assignee.role !== 'admin') throw new AppError(422, 'Tasks can only be assigned to admin-role users');
  }

  const completedAt = data.status === 'Done' ? new Date() : undefined;

  return prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status as TaskStatus } : {}),
      ...(data.priority !== undefined ? { priority: data.priority as Priority } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(completedAt ? { completedAt } : {}),
    },
    select: taskWithSubtasksSelect,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTask(id: string) {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, parentTaskId: true },
  });
  if (!existing) throw new AppError(404, 'Task not found');

  if (!existing.parentTaskId) {
    // Root task: delete subtasks first (schema has no cascade on self-reference)
    await prisma.task.deleteMany({ where: { parentTaskId: id } });
  }

  await prisma.task.delete({ where: { id }, select: { id: true } });
}

// ─── List subtasks ────────────────────────────────────────────────────────────

export async function listSubtasks(parentTaskId: string) {
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    select: { id: true },
  });
  if (!parent) throw new AppError(404, 'Task not found');

  return prisma.task.findMany({
    where: { parentTaskId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: taskSelect,
  });
}
