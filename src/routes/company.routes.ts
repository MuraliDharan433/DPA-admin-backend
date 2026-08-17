import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermissions(PERMISSIONS.PLACEMENTS_VIEW), validate(paginationQuerySchema, 'query'), companyController.findAll);
router.get('/lite', requirePermissions(PERMISSIONS.PLACEMENTS_VIEW), companyController.findAllLite);
router.get('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_VIEW), companyController.findOne);
router.post('/', requirePermissions(PERMISSIONS.PLACEMENTS_CREATE), validate(createCompanySchema), companyController.create);
router.patch('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_EDIT), validate(updateCompanySchema), companyController.update);
router.delete('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_DELETE), companyController.remove);

export default router;
