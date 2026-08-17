import type { Request, Response } from 'express';
import { studentService } from '../services/student.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const studentController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await studentService.findAll(req.query as any);
    return ok(res, 'Students fetched successfully', data, pagination);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.findById(req.params.id);
    return ok(res, 'Student fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.create(req.body, req.user!.userId);
    return created(res, 'Student created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.update(req.params.id, req.body);
    return ok(res, 'Student updated successfully', data);
  }),
  addNote: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.addNote(req.params.id, req.body.text, req.user!.userId);
    return ok(res, 'Note added successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await studentService.delete(req.params.id);
    return ok(res, 'Student deleted successfully', null);
  }),
};
