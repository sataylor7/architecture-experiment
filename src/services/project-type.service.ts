import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type {
  CreateProjectTypeInput,
  UpdateProjectTypeInput,
  CreatePatternStyleTypeInput,
  UpdatePatternStyleTypeInput,
  CreatePatternStyleDetailInput,
  UpdatePatternStyleDetailInput,
} from '@/lib/schemas/project-type.schema';
import { TypeCategory, SewingSubcategory } from '@prisma/client';

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateProjectTypeData(data: { category?: string; sewingSubcategory?: string | null }) {
  if (data.category === 'Sewing' && !data.sewingSubcategory) {
    throw new AppError(422, 'sewingSubcategory is required when category is Sewing');
  }
  if (data.category && data.category !== 'Sewing' && data.sewingSubcategory) {
    throw new AppError(422, 'sewingSubcategory must be null when category is not Sewing');
  }
}

function validatePatternStyleTypeData(data: { muslinMade?: boolean; dateMuslinMade?: Date | null }) {
  if (data.muslinMade === true && !data.dateMuslinMade) {
    throw new AppError(422, 'dateMuslinMade is required when muslinMade is true');
  }
}

// ─── ProjectType selects ──────────────────────────────────────────────────────

const projectTypeSelect = {
  id: true,
  name: true,
  category: true,
  sewingSubcategory: true,
  description: true,
  createdAt: true,
} as const;

const patternStyleTypeSelect = {
  id: true,
  name: true,
  notes: true,
  muslinMade: true,
  dateMuslinMade: true,
  createdAt: true,
  updatedAt: true,
} as const;

const patternStyleDetailSelect = {
  id: true,
  patternStyleNumber: true,
  patternStyleTypeId: true,
  projectTypeId: true,
  patternStyleType: { select: patternStyleTypeSelect },
  projectType: { select: projectTypeSelect },
} as const;

// ─── ProjectType CRUD ─────────────────────────────────────────────────────────

export async function listProjectTypes() {
  return prisma.projectType.findMany({
    orderBy: { name: 'asc' },
    select: projectTypeSelect,
  });
}

export async function createProjectType(data: CreateProjectTypeInput) {
  validateProjectTypeData(data);

  return prisma.projectType.create({
    data: {
      name: data.name,
      category: data.category as TypeCategory,
      sewingSubcategory: data.sewingSubcategory as SewingSubcategory | undefined,
      description: data.description,
    },
    select: projectTypeSelect,
  });
}

export async function updateProjectType(id: string, data: UpdateProjectTypeInput) {
  const existing = await prisma.projectType.findUnique({
    where: { id },
    select: { id: true, category: true, sewingSubcategory: true },
  });
  if (!existing) throw new AppError(404, 'ProjectType not found');

  const merged = {
    category: data.category ?? existing.category,
    sewingSubcategory: data.sewingSubcategory ?? existing.sewingSubcategory,
  };
  validateProjectTypeData(merged);

  return prisma.projectType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category as TypeCategory } : {}),
      ...(data.sewingSubcategory !== undefined
        ? { sewingSubcategory: data.sewingSubcategory as SewingSubcategory }
        : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
    select: projectTypeSelect,
  });
}

export async function deleteProjectType(id: string) {
  const existing = await prisma.projectType.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'ProjectType not found');

  const usageCount = await prisma.projectProjectType.count({ where: { projectTypeId: id } });
  if (usageCount > 0) {
    throw new AppError(409, 'Cannot delete a ProjectType that is referenced by projects');
  }

  await prisma.projectType.delete({ where: { id }, select: { id: true } });
}

// ─── PatternStyleType CRUD ────────────────────────────────────────────────────

export async function listPatternStyleTypes() {
  return prisma.patternStyleType.findMany({
    orderBy: { name: 'asc' },
    select: patternStyleTypeSelect,
  });
}

export async function createPatternStyleType(data: CreatePatternStyleTypeInput) {
  validatePatternStyleTypeData(data);

  return prisma.patternStyleType.create({
    data: {
      name: data.name,
      notes: data.notes,
      muslinMade: data.muslinMade,
      dateMuslinMade: data.dateMuslinMade,
    },
    select: patternStyleTypeSelect,
  });
}

export async function updatePatternStyleType(id: string, data: UpdatePatternStyleTypeInput) {
  const existing = await prisma.patternStyleType.findUnique({
    where: { id },
    select: { id: true, muslinMade: true, dateMuslinMade: true },
  });
  if (!existing) throw new AppError(404, 'PatternStyleType not found');

  const merged = {
    muslinMade: data.muslinMade ?? existing.muslinMade,
    dateMuslinMade: data.dateMuslinMade ?? existing.dateMuslinMade,
  };
  validatePatternStyleTypeData(merged);

  return prisma.patternStyleType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.muslinMade !== undefined ? { muslinMade: data.muslinMade } : {}),
      ...(data.dateMuslinMade !== undefined ? { dateMuslinMade: data.dateMuslinMade } : {}),
    },
    select: patternStyleTypeSelect,
  });
}

// ─── PatternStyleDetail CRUD ──────────────────────────────────────────────────

export async function listPatternStyleDetails() {
  return prisma.patternStyleDetail.findMany({
    orderBy: { id: 'asc' },
    select: patternStyleDetailSelect,
  });
}

export async function createPatternStyleDetail(data: CreatePatternStyleDetailInput) {
  const projectType = await prisma.projectType.findUnique({
    where: { id: data.projectTypeId },
    select: { id: true, sewingSubcategory: true },
  });
  if (!projectType) throw new AppError(404, 'ProjectType not found');
  if (projectType.sewingSubcategory !== 'Custom') {
    throw new AppError(422, 'PatternStyleDetail can only be linked to Custom sewing project types');
  }

  const styleTypeExists = await prisma.patternStyleType.findUnique({
    where: { id: data.patternStyleTypeId },
    select: { id: true },
  });
  if (!styleTypeExists) throw new AppError(404, 'PatternStyleType not found');

  return prisma.patternStyleDetail.create({
    data: {
      patternStyleNumber: data.patternStyleNumber,
      patternStyleTypeId: data.patternStyleTypeId,
      projectTypeId: data.projectTypeId,
    },
    select: patternStyleDetailSelect,
  });
}

export async function updatePatternStyleDetail(id: string, data: UpdatePatternStyleDetailInput) {
  const existing = await prisma.patternStyleDetail.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'PatternStyleDetail not found');

  if (data.patternStyleTypeId) {
    const styleTypeExists = await prisma.patternStyleType.findUnique({
      where: { id: data.patternStyleTypeId },
      select: { id: true },
    });
    if (!styleTypeExists) throw new AppError(404, 'PatternStyleType not found');
  }

  return prisma.patternStyleDetail.update({
    where: { id },
    data: {
      ...(data.patternStyleNumber !== undefined ? { patternStyleNumber: data.patternStyleNumber } : {}),
      ...(data.patternStyleTypeId !== undefined ? { patternStyleTypeId: data.patternStyleTypeId } : {}),
    },
    select: patternStyleDetailSelect,
  });
}
