import type { Request, Response } from 'express';
import { batchService } from '../services/batch.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const batchController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await batchService.findAll(req.query as any);
    return ok(res, 'Batches fetched successfully', data, pagination);
  }),
  findAllActive: asyncHandler(async (_req: Request, res: Response) => {
    const data = await batchService.findAllActive();
    return ok(res, 'Active batches fetched successfully', data);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await batchService.findById(req.params.id);
    return ok(res, 'Batch fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await batchService.create(req.body);
    return created(res, 'Batch created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await batchService.update(req.params.id, req.body);
    return ok(res, 'Batch updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await batchService.delete(req.params.id);
    return ok(res, 'Batch deleted successfully', null);
  }),
};
