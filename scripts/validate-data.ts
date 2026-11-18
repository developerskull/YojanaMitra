/**
 * Placeholder data validation script for Stage 1.
 * Will be fully implemented in Stage 2 with strict Zod schema checks.
 */
import fs from 'node:fs';
import path from 'node:path';

const schemesDir = path.join(process.cwd(), 'data', 'schemes');
if (!fs.existsSync(schemesDir)) {
  console.log('[validate-data] No /data/schemes directory yet (Stage 1 foundation).');
  process.exit(0);
}

const files = fs.readdirSync(schemesDir).filter((f) => f.endsWith('.json'));
console.log(`[validate-data] Found ${files.length} scheme JSON file(s).`);
