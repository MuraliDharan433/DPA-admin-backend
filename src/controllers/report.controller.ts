import type { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { asyncHandler } from '../utils/asyncHandler';

function sendXlsx(res: Response, filename: string, buffer: Buffer) {
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

export const reportController = {
  exportStudents: asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await reportService.exportStudents();
    sendXlsx(res, `students-${Date.now()}.xlsx`, buffer);
  }),
  exportEnquiries: asyncHandler(async (req: Request, res: Response) => {
    const buffer = await reportService.exportEnquiries(req.user!);
    sendXlsx(res, `enquiries-${Date.now()}.xlsx`, buffer);
  }),
  exportPlacements: asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await reportService.exportPlacements();
    sendXlsx(res, `placements-${Date.now()}.xlsx`, buffer);
  }),
};
