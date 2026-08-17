import multer from 'multer';

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Only PDF and Word documents are allowed'));
      return;
    }
    cb(null, true);
  },
});
