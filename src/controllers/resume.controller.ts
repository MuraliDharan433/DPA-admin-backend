import type { Request, Response } from 'express';
import { resumeService } from '../services/resume.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';

export const resumeController = {
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded');
    const data = await resumeService.uploadForStudent(req.params.studentId, req.file, req.user!.userId);
    return created(res, 'Resume uploaded successfully', data);
  }),

  listVersions: asyncHandler(async (req: Request, res: Response) => {
    const data = await resumeService.findVersionsForStudent(req.params.studentId);
    return ok(res, 'Resume versions fetched successfully', data);
  }),

  getFile: asyncHandler(async (req: Request, res: Response) => {
    const { buffer, resume } = await resumeService.getFileBuffer(req.params.id);
    const download = req.query.download === 'true';
    res.set({
      'Content-Type': resume.fileType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(resume.fileName)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await resumeService.delete(req.params.id);
    return ok(res, 'Resume deleted successfully', null);
  }),
};
