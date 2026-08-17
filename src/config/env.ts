import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/institute_management'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshExpiresInRemember: process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '30d',
  },

  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    publicWebsiteUrls: (process.env.PUBLIC_WEBSITE_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret',

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localDir: process.env.STORAGE_LOCAL_DIR || 'uploads',
    bucket: process.env.STORAGE_BUCKET,
    region: process.env.STORAGE_REGION,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    endpoint: process.env.STORAGE_ENDPOINT,
  },

  throttle: {
    windowMs: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    publicEnquiryWindowMs: parseInt(process.env.PUBLIC_ENQUIRY_THROTTLE_TTL || '60', 10) * 1000,
    publicEnquiryLimit: parseInt(process.env.PUBLIC_ENQUIRY_THROTTLE_LIMIT || '5', 10),
  },

  seed: {
    ownerFirstName: process.env.SEED_OWNER_FIRST_NAME || 'Institute',
    ownerLastName: process.env.SEED_OWNER_LAST_NAME || 'Owner',
    ownerEmail: process.env.SEED_OWNER_EMAIL || 'owner@yourinstitute.com',
    ownerPassword: process.env.SEED_OWNER_PASSWORD || 'ChangeMe@12345',
    ownerMobile: process.env.SEED_OWNER_MOBILE || '9999999999',
  },
};
