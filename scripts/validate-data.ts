import fs from 'node:fs';
import path from 'node:path';
import { SchemeSchema } from '../lib/schemes/schema';

const STALE_DAYS_THRESHOLD = 180;
const MIN_SCHEMES = 40;

function daysBetween(isoDate: string, now: Date): number {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  const diffMs = now.getTime() - parsed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function main() {
  const schemesDir = path.join(process.cwd(), 'data', 'schemes');
  if (!fs.existsSync(schemesDir)) {
    console.error('[validate-data] ERROR: /data/schemes directory does not exist.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(schemesDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length < MIN_SCHEMES) {
    console.error(
      `[validate-data] ERROR: Expected at least ${MIN_SCHEMES} schemes, found ${files.length}.`
    );
    process.exit(1);
  }

  const seenIds = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = new Date();
  let needsVerificationCount = 0;

  for (const file of files) {
    const fullPath = path.join(schemesDir, file);
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (err) {
      errors.push(`${file}: Invalid JSON (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    const parsed = SchemeSchema.safeParse(rawJson);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file} [${issue.path.join('.')}]: ${issue.message}`);
      }
      continue;
    }

    const scheme = parsed.data;
    const expectedFilename = `${scheme.id}.json`;
    if (file !== expectedFilename) {
      errors.push(`${file}: Filename does not match scheme id "${scheme.id}" (expected ${expectedFilename})`);
    }

    if (seenIds.has(scheme.id)) {
      errors.push(`${file}: Duplicate scheme id "${scheme.id}"`);
    }
    seenIds.add(scheme.id);

    // Check translation parity on applicationSteps
    const { en, hi, mr } = scheme.applicationSteps;
    if (en.length !== hi.length || en.length !== mr.length) {
      warnings.push(
        `${file}: applicationSteps count differs across languages (en=${en.length}, hi=${hi.length}, mr=${mr.length})`
      );
    }

    // Check staleness (>180 days = warning)
    const ageDays = daysBetween(scheme.lastVerified, now);
    if (ageDays > STALE_DAYS_THRESHOLD) {
      warnings.push(
        `${file}: lastVerified (${scheme.lastVerified}) is ${ageDays} days old (> ${STALE_DAYS_THRESHOLD} days)`
      );
    }

    // Check URL hygiene
    if (!scheme.officialUrl.startsWith('https://')) {
      warnings.push(`${file}: officialUrl should use https:// (${scheme.officialUrl})`);
    }

    if (scheme.needsVerification) {
      needsVerificationCount += 1;
    }
  }

  if (warnings.length > 0) {
    console.warn(`\n[validate-data] ${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.warn(`  WARN: ${w}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n[validate-data] FAILED with ${errors.length} error(s):`);
    for (const e of errors) {
      console.error(`  ERR: ${e}`);
    }
    process.exit(1);
  }

  console.log(
    `[validate-data] OK: Validated ${files.length} schemes (${needsVerificationCount} flagged needsVerification, ${warnings.length} warnings).`
  );
}

main();
