import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { getUserStore } from '@/lib/auth/store';
import { getRequestLogStore } from '@/lib/requests/store';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  }

  const records = await getRequestLogStore().list(250);
  const registeredCitizens = getUserStore().countUsers();

  const totalRequests = records.length;
  const chatRequests = records.filter((r) => r.type === 'chat').length;
  const eligibilityRequests = records.filter((r) => r.type === 'eligibility').length;
  const blockedRequests = records.filter(
    (r) => r.status === 'blocked' || r.status === 'rate_limited'
  ).length;
  const avgLatencyMs =
    totalRequests > 0
      ? Math.round(records.reduce((acc, r) => acc + r.latencyMs, 0) / totalRequests)
      : 0;

  const byLanguage: Record<'en' | 'hi' | 'mr', number> = { en: 0, hi: 0, mr: 0 };
  const schemeHits = new Map<string, { id: string; name: string; count: number }>();
  const uniqueActorSet = new Set<string>();

  for (const r of records) {
    byLanguage[r.lang] = (byLanguage[r.lang] ?? 0) + 1;
    uniqueActorSet.add(r.userEmail || 'guest');
    for (const sc of r.matchedSchemes.slice(0, 3)) {
      const existing = schemeHits.get(sc.id);
      if (existing) {
        existing.count += 1;
      } else {
        schemeHits.set(sc.id, { id: sc.id, name: sc.name, count: 1 });
      }
    }
  }

  const topSchemes = Array.from(schemeHits.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json(
    {
      metrics: {
        totalRequests,
        chatRequests,
        eligibilityRequests,
        blockedRequests,
        registeredCitizens,
        activeActors: uniqueActorSet.size,
        avgLatencyMs,
        byLanguage,
        topSchemes,
      },
      requests: records,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE() {
  const session = await getCurrentSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  }
  await getRequestLogStore().clear();
  return NextResponse.json({ ok: true });
}
