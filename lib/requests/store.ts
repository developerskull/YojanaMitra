import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { redactPII } from '@/lib/logging/logger';
import type { SupportedLang } from '@/lib/schemes/schema';

export type RequestType = 'chat' | 'eligibility';
export type RequestMode = 'live' | 'degraded' | 'cached' | 'blocked';
export type RequestStatus = 'completed' | 'blocked' | 'rate_limited' | 'error';

export interface CitizenRequestRecord {
  id: string;
  timestamp: string;
  type: RequestType;
  userRole: 'user' | 'admin' | 'guest';
  userName: string;
  userEmail: string;
  lang: SupportedLang;
  queryPreview: string;
  detectedState?: string;
  detectedOccupation?: string;
  matchedSchemes: Array<{ id: string; name: string; status: string }>;
  eligibleCount: number;
  latencyMs: number;
  mode: RequestMode;
  status: RequestStatus;
}

/**
 * Storage-agnostic audit log interface so Postgres / BigQuery can swap in later.
 */
export interface RequestLogStore {
  record(entry: Omit<CitizenRequestRecord, 'id' | 'timestamp'>): CitizenRequestRecord;
  list(limit?: number): CitizenRequestRecord[];
  clear(): void;
}

const MAX_RECORDS = 500;

class FileBackedRequestLogStore implements RequestLogStore {
  private records: CitizenRequestRecord[] = [];
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'runtime', 'requests.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (Array.isArray(parsed)) {
          this.records = parsed.slice(0, MAX_RECORDS);
        }
      }
    } catch {
      this.records = [];
    }
  }

  private persistToDisk(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch {
      // Safe no-op on read-only runtimes
    }
  }

  record(entry: Omit<CitizenRequestRecord, 'id' | 'timestamp'>): CitizenRequestRecord {
    const safeItem: CitizenRequestRecord = {
      ...entry,
      id: `req-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      queryPreview: redactPII(entry.queryPreview).slice(0, 220),
    };
    this.records.unshift(safeItem);
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(0, MAX_RECORDS);
    }
    this.persistToDisk();
    return safeItem;
  }

  list(limit = 200): CitizenRequestRecord[] {
    return this.records.slice(0, limit);
  }

  clear(): void {
    this.records = [];
    this.persistToDisk();
  }
}

let storeSingleton: RequestLogStore | null = null;

export function getRequestLogStore(): RequestLogStore {
  if (!storeSingleton) {
    storeSingleton = new FileBackedRequestLogStore();
  }
  return storeSingleton;
}
