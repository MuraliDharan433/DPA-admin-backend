import type { Request, Response } from 'express';
import { companyService } from '../services/company.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const companyController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await companyService.findAll(req.query as any);
    return ok(res, 'Companies fetched successfully', data, pagination);
  }),
  findAllLite: asyncHandler(async (_req: Request, res: Response) => {
    const data = await companyService.findAllLite();
    return ok(res, 'Companies fetched successfully', data);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await companyService.findById(req.params.id);
    return ok(res, 'Company fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await companyService.create(req.body);
    return created(res, 'Company created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await companyService.update(req.params.id, req.body);
    return ok(res, 'Company updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await companyService.delete(req.params.id);
    return ok(res, 'Company deleted successfully', null);
  }),
};
