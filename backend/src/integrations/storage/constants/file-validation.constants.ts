export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const EXECUTABLE_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.pkg',
  '.msi',
];

export enum StorageFolder {
  INCIDENTS = 'incidents',
  REPORTS_BEFORE = 'reports/before',
  REPORTS_AFTER = 'reports/after',
  AVATARS = 'avatars',
}
