export const PERMISSIONS = {
  STUDENTS_VIEW: 'students.view',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_EDIT: 'students.edit',
  STUDENTS_DELETE: 'students.delete',

  ENQUIRIES_VIEW: 'enquiries.view',
  ENQUIRIES_CREATE: 'enquiries.create',
  ENQUIRIES_EDIT: 'enquiries.edit',
  ENQUIRIES_DELETE: 'enquiries.delete',
  ENQUIRIES_ASSIGN: 'enquiries.assign',

  COURSES_VIEW: 'courses.view',
  COURSES_CREATE: 'courses.create',
  COURSES_EDIT: 'courses.edit',
  COURSES_DELETE: 'courses.delete',

  BATCHES_VIEW: 'batches.view',
  BATCHES_CREATE: 'batches.create',
  BATCHES_EDIT: 'batches.edit',
  BATCHES_DELETE: 'batches.delete',

  PLACEMENTS_VIEW: 'placements.view',
  PLACEMENTS_CREATE: 'placements.create',
  PLACEMENTS_EDIT: 'placements.edit',
  PLACEMENTS_DELETE: 'placements.delete',

  RESUMES_VIEW: 'resumes.view',
  RESUMES_UPLOAD: 'resumes.upload',
  RESUMES_DELETE: 'resumes.delete',

  MOCK_VIEW: 'mock.view',
  MOCK_CREATE: 'mock.create',
  MOCK_EDIT: 'mock.edit',
  MOCK_DELETE: 'mock.delete',

  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_ACTIVATE: 'users.activate',
  USERS_DEACTIVATE: 'users.deactivate',
  USERS_DELETE: 'users.delete',

  REPORTS_VIEW: 'reports.view',
  NOTIFICATIONS_VIEW: 'notifications.view',
  AUDIT_LOGS_VIEW: 'audit_logs.view',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS) as PermissionKey[];

export const PERMISSION_GROUPS: Record<
  string,
  { label: string; actions: { key: PermissionKey; label: string }[] }
> = {
  students: {
    label: 'Students',
    actions: [
      { key: PERMISSIONS.STUDENTS_VIEW, label: 'View' },
      { key: PERMISSIONS.STUDENTS_CREATE, label: 'Create' },
      { key: PERMISSIONS.STUDENTS_EDIT, label: 'Edit' },
      { key: PERMISSIONS.STUDENTS_DELETE, label: 'Delete' },
    ],
  },
  enquiries: {
    label: 'Enquiries',
    actions: [
      { key: PERMISSIONS.ENQUIRIES_VIEW, label: 'View' },
      { key: PERMISSIONS.ENQUIRIES_CREATE, label: 'Create' },
      { key: PERMISSIONS.ENQUIRIES_EDIT, label: 'Edit' },
      { key: PERMISSIONS.ENQUIRIES_DELETE, label: 'Delete' },
      { key: PERMISSIONS.ENQUIRIES_ASSIGN, label: 'Assign' },
    ],
  },
  courses: {
    label: 'Courses',
    actions: [
      { key: PERMISSIONS.COURSES_VIEW, label: 'View' },
      { key: PERMISSIONS.COURSES_CREATE, label: 'Create' },
      { key: PERMISSIONS.COURSES_EDIT, label: 'Edit' },
      { key: PERMISSIONS.COURSES_DELETE, label: 'Delete' },
    ],
  },
  batches: {
    label: 'Batches',
    actions: [
      { key: PERMISSIONS.BATCHES_VIEW, label: 'View' },
      { key: PERMISSIONS.BATCHES_CREATE, label: 'Create' },
      { key: PERMISSIONS.BATCHES_EDIT, label: 'Edit' },
      { key: PERMISSIONS.BATCHES_DELETE, label: 'Delete' },
    ],
  },
  placements: {
    label: 'Placements',
    actions: [
      { key: PERMISSIONS.PLACEMENTS_VIEW, label: 'View' },
      { key: PERMISSIONS.PLACEMENTS_CREATE, label: 'Create' },
      { key: PERMISSIONS.PLACEMENTS_EDIT, label: 'Edit' },
      { key: PERMISSIONS.PLACEMENTS_DELETE, label: 'Delete' },
    ],
  },
  resumes: {
    label: 'Resumes',
    actions: [
      { key: PERMISSIONS.RESUMES_VIEW, label: 'View' },
      { key: PERMISSIONS.RESUMES_UPLOAD, label: 'Upload' },
      { key: PERMISSIONS.RESUMES_DELETE, label: 'Delete' },
    ],
  },
  mock: {
    label: 'Mock Sessions',
    actions: [
      { key: PERMISSIONS.MOCK_VIEW, label: 'View' },
      { key: PERMISSIONS.MOCK_CREATE, label: 'Create' },
      { key: PERMISSIONS.MOCK_EDIT, label: 'Edit' },
      { key: PERMISSIONS.MOCK_DELETE, label: 'Delete' },
    ],
  },
  users: {
    label: 'Users',
    actions: [
      { key: PERMISSIONS.USERS_VIEW, label: 'View' },
      { key: PERMISSIONS.USERS_CREATE, label: 'Create' },
      { key: PERMISSIONS.USERS_EDIT, label: 'Edit' },
      { key: PERMISSIONS.USERS_ACTIVATE, label: 'Activate' },
      { key: PERMISSIONS.USERS_DEACTIVATE, label: 'Deactivate' },
      { key: PERMISSIONS.USERS_DELETE, label: 'Delete' },
    ],
  },
  reports: {
    label: 'Reports',
    actions: [{ key: PERMISSIONS.REPORTS_VIEW, label: 'View' }],
  },
  audit_logs: {
    label: 'Audit Logs',
    actions: [{ key: PERMISSIONS.AUDIT_LOGS_VIEW, label: 'View' }],
  },
  settings: {
    label: 'Settings',
    actions: [
      { key: PERMISSIONS.SETTINGS_VIEW, label: 'View' },
      { key: PERMISSIONS.SETTINGS_EDIT, label: 'Edit' },
    ],
  },
};
