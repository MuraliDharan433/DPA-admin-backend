import type { Request, Response } from 'express';
import { courseService } from '../services/course.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const courseController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await courseService.findAll(req.query as any);
    return ok(res, 'Courses fetched successfully', data, pagination);
  }),
  findAllActive: asyncHandler(async (_req: Request, res: Response) => {
    const data = await courseService.findAllActive();
    return ok(res, 'Active courses fetched successfully', data);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.findById(req.params.id);
    return ok(res, 'Course fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.create(req.body);
    return created(res, 'Course created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.update(req.params.id, req.body);
    return ok(res, 'Course updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await courseService.delete(req.params.id);
    return ok(res, 'Course deleted successfully', null);
  }),
};
