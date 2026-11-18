import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getEnv } from '@/lib/env';
import type { UserRole } from './session';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

/**
 * Storage-agnostic user repository so Postgres/Auth0 can replace file/memory storage later.
 */
export interface UserStore {
  findByEmail(email: string): StoredUser | undefined;
  createCitizen(input: { name: string; email: string; password: string }): StoredUser;
  verifyPassword(user: StoredUser, password: string): boolean;
  countUsers(): number;
}

function hashPassword(password: string, salt?: string): string {
  const useSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, useSalt, 64).toString('hex');
  return `${useSalt}:${derived}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

class FileBackedUserStore implements UserStore {
  private readonly users = new Map<string, StoredUser>();
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'runtime', 'users.json');
    this.loadFromDisk();
    this.ensureSeedAccounts();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const list = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as StoredUser[];
        for (const u of list) {
          this.users.set(u.email.toLowerCase(), u);
        }
      }
    } catch {
      // Safe fallback to pure memory on read-only filesystems
    }
  }

  private persistToDisk(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(Array.from(this.users.values()), null, 2),
        'utf-8'
      );
    } catch {
      // Safe no-op on serverless/read-only runtimes
    }
  }

  private ensureSeedAccounts(): void {
    const env = getEnv();
    const adminEmail = env.ADMIN_EMAIL.toLowerCase();

    // Always keep env-configured Admin synced
    this.users.set(adminEmail, {
      id: 'admin-root',
      name: 'YojanaMitra Admin',
      email: adminEmail,
      role: 'admin',
      passwordHash: hashPassword(env.ADMIN_PASSWORD, 'ym_admin_seed_salt'),
      createdAt: '2026-11-18T00:00:00.000Z',
    });

    // Seed one demo citizen account for instant testing
    const demoCitizenEmail = 'citizen@yojanamitra.in';
    if (!this.users.has(demoCitizenEmail)) {
      this.users.set(demoCitizenEmail, {
        id: 'citizen-demo-1',
        name: 'Ramesh Patil',
        email: demoCitizenEmail,
        role: 'user',
        passwordHash: hashPassword('Citizen@1234', 'ym_citizen_seed_salt'),
        createdAt: '2026-11-18T00:00:00.000Z',
      });
    }
  }

  findByEmail(email: string): StoredUser | undefined {
    return this.users.get(email.trim().toLowerCase());
  }

  createCitizen(input: { name: string; email: string; password: string }): StoredUser {
    const email = input.email.trim().toLowerCase();
    if (this.users.has(email)) {
      throw new Error('An account with this email already exists');
    }
    const user: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      email,
      role: 'user',
      passwordHash: hashPassword(input.password),
      createdAt: new Date().toISOString(),
    };
    this.users.set(email, user);
    this.persistToDisk();
    return user;
  }

  verifyPassword(user: StoredUser, password: string): boolean {
    return verifyPasswordHash(password, user.passwordHash);
  }

  countUsers(): number {
    let count = 0;
    for (const u of this.users.values()) {
      if (u.role === 'user') count += 1;
    }
    return count;
  }
}

let userStoreSingleton: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!userStoreSingleton) {
    userStoreSingleton = new FileBackedUserStore();
  }
  return userStoreSingleton;
}
