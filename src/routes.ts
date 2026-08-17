import { Router } from 'express';
import authRoutes from './features/auth';
import userRoutes from './features/user';
import roleRoutes from './features/role';
import permissionRoutes from './features/permission';
import courseRoutes from './features/course';
import batchRoutes from './features/batch';
import studentRoutes from './features/student';
import resumeRoutes from './features/resume';
import mockSessionRoutes from './features/mockSession';
import companyRoutes from './features/company';
import jobApplicationRoutes from './features/jobApplication';
import interviewRoutes from './features/interview';
import enquiryRoutes, { followUpRouter, publicEnquiryRouter } from './features/enquiry';
import notificationRoutes from './features/notification';
import dashboardRoutes from './features/dashboard';
import auditLogRoutes from './features/auditLog';
import reportRoutes from './features/report';
import settingRoutes from './features/setting';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/courses', courseRoutes);
router.use('/batches', batchRoutes);
router.use('/students', studentRoutes);
// Resumes and mock sessions own nested paths (students/:studentId/... and /resumes/:id,
// /mock-sessions/:id), so they mount at the root rather than under a single prefix.
router.use('/', resumeRoutes);
router.use('/', mockSessionRoutes);
router.use('/companies', companyRoutes);
router.use('/applications', jobApplicationRoutes);
router.use('/interviews', interviewRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/follow-ups', followUpRouter);
router.use('/public/enquiries', publicEnquiryRouter);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);

export default router;
