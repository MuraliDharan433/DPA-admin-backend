import { Router } from 'express';
import { z } from 'zod';
import { CompanyModel, type ICompany } from '../models/Company.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';

// ---------------------------------------------------------------- validation

export const createCompanySchema = z.object({
  name: z.string().min(2).max(150),
  website: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(150).optional(),
  contactPerson: z.string().max(100).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ------------------------------------------------------------------- helpers

export async function getCompanyOrFail(id: string) {
  const company = await CompanyModel.findById(id);
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery;
    const filter = buildSearchFilter(query.search, ['name', 'industry', 'location']);
    const { data, pagination } = await paginate<ICompany>(CompanyModel, filter, query);
    return ok(res, 'Companies fetched successfully', data, pagination);
  }),
);

router.get(
  '/lite',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  asyncHandler(async (_req, res) => {
    const companies = await CompanyModel.find().select('name').sort({ name: 1 });
    return ok(res, 'Companies fetched successfully', companies);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Company fetched successfully', await getCompanyOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_CREATE),
  validate(createCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await CompanyModel.create(req.body);
    return created(res, 'Company created successfully', company);
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_EDIT),
  validate(updateCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await getCompanyOrFail(req.params.id);
    Object.assign(company, req.body);
    await company.save();
    return ok(res, 'Company updated successfully', company);
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_DELETE),
  asyncHandler(async (req, res) => {
    await getCompanyOrFail(req.params.id);
    await CompanyModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Company deleted successfully', null);
  }),
);

export default router;
