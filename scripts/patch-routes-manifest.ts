import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.join(process.cwd(), '.next', 'routes-manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    manifest.staticRoutes = manifest.staticRoutes || [];
    manifest.dynamicRoutes = manifest.dynamicRoutes || [];
    manifest.dataRoutes = manifest.dataRoutes || [];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log('[postbuild] Patched .next/routes-manifest.json for Next.js 15 start stability.');
  } catch (err) {
    console.warn('[postbuild] Warning: Could not patch routes-manifest.json:', err);
  }
}
