import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { redactPII } from '@/lib/logging/logger';
import type { SupportedLang } from '@/lib/schemes/schema';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';

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
  record(
    entry: Omit<CitizenRequestRecord, 'id' | 'timestamp'>
  ): CitizenRequestRecord | Promise<CitizenRequestRecord>;
  list(limit?: number): CitizenRequestRecord[] | Promise<CitizenRequestRecord[]>;
  clear(): void | Promise<void>;
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

export class SupabaseRequestLogStore implements RequestLogStore {
  private fallbackStore = new FileBackedRequestLogStore();

  async record(
    entry: Omit<CitizenRequestRecord, 'id' | 'timestamp'>
  ): Promise<CitizenRequestRecord> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.record(entry);

    const safePreview = redactPII(entry.queryPreview).slice(0, 220);
    const id = `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const row = {
      id,
      timestamp,
      type: entry.type,
      user_role: entry.userRole,
      user_name: entry.userName,
      user_email: entry.userEmail,
      lang: entry.lang,
      query_preview: safePreview,
      detected_state: entry.detectedState ?? null,
      detected_occupation: entry.detectedOccupation ?? null,
      matched_schemes: entry.matchedSchemes,
      eligible_count: entry.eligibleCount,
      latency_ms: entry.latencyMs,
      mode: entry.mode,
      status: entry.status,
    };

    try {
      const { error } = await supabase.from('request_audit_logs').insert(row);
      if (error) {
        return this.fallbackStore.record(entry);
      }
      return { ...entry, id, timestamp, queryPreview: safePreview };
    } catch {
      return this.fallbackStore.record(entry);
    }
  }

  async list(limit = 200): Promise<CitizenRequestRecord[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.list(limit);

    try {
      const { data, error } = await supabase
        .from('request_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return this.fallbackStore.list(limit);
      }

      return data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        timestamp: String(r.timestamp),
        type: r.type as RequestType,
        userRole: r.user_role as 'user' | 'admin' | 'guest',
        userName: String(r.user_name),
        userEmail: String(r.user_email),
        lang: r.lang as SupportedLang,
        queryPreview: String(r.query_preview),
        detectedState: r.detected_state ? String(r.detected_state) : undefined,
        detectedOccupation: r.detected_occupation ? String(r.detected_occupation) : undefined,
        matchedSchemes: Array.isArray(r.matched_schemes)
          ? (r.matched_schemes as Array<{ id: string; name: string; status: string }>)
          : [],
        eligibleCount: Number(r.eligible_count) || 0,
        latencyMs: Number(r.latency_ms) || 0,
        mode: r.mode as RequestMode,
        status: r.status as RequestStatus,
      }));
    } catch {
      return this.fallbackStore.list(limit);
    }
  }

  async clear(): Promise<void> {
    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        await supabase.from('request_audit_logs').delete().neq('id', '');
      } catch {
        // Fallback
      }
    }
    this.fallbackStore.clear();
  }
}

let storeSingleton: RequestLogStore | null = null;

export function getRequestLogStore(): RequestLogStore {
  if (!storeSingleton) {
    if (isSupabaseConfigured()) {
      storeSingleton = new SupabaseRequestLogStore();
    } else {
      storeSingleton = new FileBackedRequestLogStore();
    }
  }
  return storeSingleton;
}
