import { Router } from 'express';
import { enquiryController } from '../controllers/enquiry.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import {
  assignEnquirySchema,
  convertEnquirySchema,
  createEnquirySchema,
  createFollowUpSchema,
  queryEnquirySchema,
  updateEnquirySchema,
  updateEnquiryStatusSchema,
} from '../validators/enquiry.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  validate(paginationQuerySchema.merge(queryEnquirySchema), 'query'),
  enquiryController.findAll,
);
router.get('/:id', requirePermissions(PERMISSIONS.ENQUIRIES_VIEW), enquiryController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_CREATE),
  validate(createEnquirySchema),
  audit(AuditAction.ENQUIRY_CREATED, 'enquiries'),
  enquiryController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateEnquirySchema),
  audit(AuditAction.ENQUIRY_UPDATED, 'enquiries'),
  enquiryController.update,
);
router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateEnquiryStatusSchema),
  enquiryController.updateStatus,
);
router.patch(
  '/:id/assign',
  requirePermissions(PERMISSIONS.ENQUIRIES_ASSIGN),
  validate(assignEnquirySchema),
  audit(AuditAction.ENQUIRY_ASSIGNED, 'enquiries'),
  enquiryController.assign,
);
router.post(
  '/:id/convert',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT, PERMISSIONS.STUDENTS_CREATE),
  validate(convertEnquirySchema),
  enquiryController.convert,
);
router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_DELETE),
  audit(AuditAction.ENQUIRY_DELETED, 'enquiries'),
  enquiryController.remove,
);
router.get('/:id/follow-ups', requirePermissions(PERMISSIONS.ENQUIRIES_VIEW), enquiryController.findFollowUps);
router.post(
  '/:id/follow-ups',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(createFollowUpSchema),
  enquiryController.addFollowUp,
);

export default router;
