import fs from 'node:fs';
import path from 'node:path';
import { Scheme, SchemeCategory, SchemeSchema } from './schema';

export interface SchemeFilter {
  state?: string;
  category?: SchemeCategory;
  level?: 'central' | 'state';
  benefitType?: Scheme['benefitType'];
}

/**
 * Storage-agnostic interface so Postgres/Mongo can replace file storage later
 * without changing RAG, eligibility, or API route handlers.
 */
export interface SchemeRepository {
  getAll(): Scheme[];
  getById(id: string): Scheme | undefined;
  filter(filter: SchemeFilter): Scheme[];
  getLatestVerificationDate(): string;
}

class FileSchemeRepository implements SchemeRepository {
  private readonly schemes: Scheme[];
  private readonly byId: Map<string, Scheme>;
  private readonly latestVerified: string;

  constructor(schemesDir: string) {
    if (!fs.existsSync(schemesDir)) {
      this.schemes = [];
      this.byId = new Map();
      this.latestVerified = new Date().toISOString().slice(0, 10);
      return;
    }

    const files = fs
      .readdirSync(schemesDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    const loaded: Scheme[] = [];
    const map = new Map<string, Scheme>();
    let latest = '2024-01-01';

    for (const file of files) {
      const fullPath = path.join(schemesDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = SchemeSchema.parse(JSON.parse(raw));
      loaded.push(parsed);
      map.set(parsed.id, parsed);
      if (parsed.lastVerified > latest) {
        latest = parsed.lastVerified;
      }
    }

    this.schemes = loaded;
    this.byId = map;
    this.latestVerified = latest;
  }

  getAll(): Scheme[] {
    return this.schemes;
  }

  getById(id: string): Scheme | undefined {
    return this.byId.get(id);
  }

  filter(filter: SchemeFilter): Scheme[] {
    return this.schemes.filter((scheme) => {
      if (filter.level && scheme.level !== filter.level) return false;
      if (filter.benefitType && scheme.benefitType !== filter.benefitType) return false;
      if (filter.category) {
        const matchesPrimary = scheme.category === filter.category;
        const matchesSecondary = scheme.secondaryCategories.includes(filter.category);
        if (!matchesPrimary && !matchesSecondary) return false;
      }
      if (filter.state && filter.state !== 'All India') {
        const normFilter = filter.state.trim().toLowerCase();
        const isCentral = scheme.level === 'central' || scheme.state.toLowerCase() === 'all india';
        const isMatchingState = scheme.state.toLowerCase() === normFilter;
        if (!isCentral && !isMatchingState) return false;
      }
      return true;
    });
  }

  getLatestVerificationDate(): string {
    return this.latestVerified;
  }
}

let singletonRepo: SchemeRepository | null = null;

/**
 * Module-level singleton loaded once per Node worker process.
 */
export function getSchemeRepository(): SchemeRepository {
  if (!singletonRepo) {
    const schemesDir = path.join(process.cwd(), 'data', 'schemes');
    singletonRepo = new FileSchemeRepository(schemesDir);
  }
  return singletonRepo;
}

export function resetSchemeRepositoryForTests(): void {
  singletonRepo = null;
}
