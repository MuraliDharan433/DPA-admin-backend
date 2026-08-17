import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import permissionRoutes from './permission.routes';
import courseRoutes from './course.routes';
import batchRoutes from './batch.routes';
import studentRoutes from './student.routes';
import resumeRoutes from './resume.routes';
import mockSessionRoutes from './mockSession.routes';
import companyRoutes from './company.routes';
import jobApplicationRoutes from './jobApplication.routes';
import interviewRoutes from './interview.routes';
import enquiryRoutes from './enquiry.routes';
import followUpRoutes from './followUp.routes';
import publicEnquiryRoutes from './publicEnquiry.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import auditLogRoutes from './auditLog.routes';
import reportRoutes from './report.routes';
import settingRoutes from './setting.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/courses', courseRoutes);
router.use('/batches', batchRoutes);
router.use('/students', studentRoutes);
// Nested resume paths (students/:studentId/resumes, resumes/:id) live inside this router.
router.use('/', resumeRoutes);
router.use('/', mockSessionRoutes);
router.use('/companies', companyRoutes);
router.use('/applications', jobApplicationRoutes);
router.use('/interviews', interviewRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/public/enquiries', publicEnquiryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);

export default router;
