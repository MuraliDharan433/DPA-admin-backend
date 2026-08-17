import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

export interface UploadedFile {
  key: string;
  /** Non-null only for providers (e.g. S3/Cloudinary) that return a directly-servable URL. */
  url: string | null;
}

export interface StorageProvider {
  upload(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  readBuffer(key: string): Promise<Buffer>;
}

/**
 * Local-disk implementation. The Resumes module only talks to this interface, so swapping
 * in S3/Cloudinary/Azure/R2 later means implementing StorageProvider and changing the
 * `activeProvider` factory below - nothing else in the app needs to change.
 */
class LocalStorageProvider implements StorageProvider {
  private readonly rootDir = path.resolve(process.cwd(), env.storage.localDir, 'resumes');

  private async ensureDir() {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  // key is always a UUID we generate - never derived from user input, so this can't be
  // used for path traversal.
  private resolvePath(key: string) {
    return path.join(this.rootDir, key);
  }

  async upload(buffer: Buffer, originalName: string): Promise<UploadedFile> {
    await this.ensureDir();
    const ext = path.extname(originalName).slice(0, 10);
    const key = `${randomUUID()}${ext}`;
    await fs.writeFile(this.resolvePath(key), buffer);
    return { key, url: null };
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch {
      // Already gone - deleting is idempotent from the caller's perspective.
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async readBuffer(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }
}

class UnconfiguredStorageProvider implements StorageProvider {
  constructor(private readonly providerName: string) {}
  private fail(): never {
    throw new Error(
      `STORAGE_PROVIDER=${this.providerName} is not implemented yet. Implement StorageProvider ` +
        `(src/utils/storage.ts) for this provider, or set STORAGE_PROVIDER=local.`,
    );
  }
  async upload(): Promise<UploadedFile> {
    this.fail();
  }
  async delete(): Promise<void> {
    this.fail();
  }
  async exists(): Promise<boolean> {
    this.fail();
  }
  async readBuffer(): Promise<Buffer> {
    this.fail();
  }
}

const activeProvider: StorageProvider =
  env.storage.provider === 'local' ? new LocalStorageProvider() : new UnconfiguredStorageProvider(env.storage.provider);

export const storageService: StorageProvider = activeProvider;
