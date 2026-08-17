import { Router } from 'express';
import { publicEnquiryController } from '../controllers/enquiry.controller';
import { validate } from '../middleware/validate.middleware';
import { publicEnquiryRateLimiter } from '../middleware/rateLimiter.middleware';
import { publicCreateEnquirySchema } from '../validators/enquiry.validator';

const router = Router();

// No requireAuth here by design - this is the public endpoint the static institute
// website's enquiry form posts to. Protected only by validation + rate limiting.
router.post('/', publicEnquiryRateLimiter, validate(publicCreateEnquirySchema), publicEnquiryController.create);

export default router;
