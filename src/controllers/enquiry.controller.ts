import type { Request, Response } from 'express';
import { enquiryService } from '../services/enquiry.service';
import { followUpService } from '../services/followUp.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const enquiryController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await enquiryService.findAll(req.query as any, req.user!);
    return ok(res, 'Enquiries fetched successfully', data, pagination);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.findById(req.params.id, req.user!);
    return ok(res, 'Enquiry fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.create(req.body, req.user!.userId);
    return created(res, 'Enquiry created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.update(req.params.id, req.body, req.user!);
    return ok(res, 'Enquiry updated successfully', data);
  }),
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.updateStatus(req.params.id, req.body.status, req.user!);
    return ok(res, 'Enquiry status updated successfully', data);
  }),
  assign: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.assign(req.params.id, req.body.assignedTo);
    return ok(res, 'Enquiry assigned successfully', data);
  }),
  convert: asyncHandler(async (req: Request, res: Response) => {
    const data = await enquiryService.convertToStudent(req.params.id, req.body, req.user!);
    return ok(res, 'Enquiry converted to student successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await enquiryService.delete(req.params.id);
    return ok(res, 'Enquiry deleted successfully', null);
  }),
  findFollowUps: asyncHandler(async (req: Request, res: Response) => {
    const data = await followUpService.findForEnquiry(req.params.id);
    return ok(res, 'Follow-ups fetched successfully', data);
  }),
  addFollowUp: asyncHandler(async (req: Request, res: Response) => {
    const data = await followUpService.createForEnquiry(req.params.id, req.body, req.user!.userId);
    return created(res, 'Follow-up added successfully', data);
  }),
};

export const publicEnquiryController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    await enquiryService.createFromPublicSite(req.body, ip);
    return created(res, 'Thank you! We have received your enquiry and will get in touch soon.', null);
  }),
};

export const followUpController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await followUpService.findAll(req.query as any, req.user!);
    return ok(res, 'Follow-ups fetched successfully', data, pagination);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await followUpService.update(req.params.id, req.body);
    return ok(res, 'Follow-up updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await followUpService.delete(req.params.id);
    return ok(res, 'Follow-up deleted successfully', null);
  }),
};
