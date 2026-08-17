import type { Model, PopulateOptions } from 'mongoose';
import type { Pagination } from './apiResponse';

type PopulateArg = string | PopulateOptions;

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export async function paginate<T>(
  model: Model<any>,
  filter: Record<string, unknown>,
  query: ListQuery,
  populate?: PopulateArg | PopulateArg[],
): Promise<PaginatedResult<T>> {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 20;
  const sortField = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  let cursor = model
    .find(filter)
    .sort({ [sortField]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);

  if (populate) {
    cursor = Array.isArray(populate)
      ? populate.reduce((c, p) => c.populate(p as any), cursor)
      : cursor.populate(populate as any);
  }

  const [data, total]: [T[], number] = await Promise.all([
    cursor.exec(),
    model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[],
): Record<string, unknown> {
  if (!search || !search.trim()) return {};
  const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

/** Parses page/limit/sortOrder query params into typed numbers/enums for a ListQuery. */
export function parseListQuery(q: Record<string, unknown>): ListQuery {
  return {
    page: q.page ? parseInt(String(q.page), 10) : undefined,
    limit: q.limit ? parseInt(String(q.limit), 10) : undefined,
    search: q.search ? String(q.search) : undefined,
    sortBy: q.sortBy ? String(q.sortBy) : undefined,
    sortOrder: q.sortOrder === 'asc' ? 'asc' : q.sortOrder === 'desc' ? 'desc' : undefined,
  };
}
