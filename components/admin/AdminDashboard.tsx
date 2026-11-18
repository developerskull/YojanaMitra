'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Clock,
  Download,
  Filter,
  Globe,
  LayoutDashboard,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import type { CitizenRequestRecord } from '@/lib/requests/store';

interface AdminMetrics {
  totalRequests: number;
  chatRequests: number;
  eligibilityRequests: number;
  blockedRequests: number;
  registeredCitizens: number;
  activeActors: number;
  avgLatencyMs: number;
  byLanguage: { en: number; hi: number; mr: number };
  topSchemes: Array<{ id: string; name: string; count: number }>;
}

interface AdminApiPayload {
  metrics: AdminMetrics;
  requests: CitizenRequestRecord[];
}

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chat' | 'eligibility'>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'hi' | 'mr'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'blocked'>('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/requests', { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as AdminApiPayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchRequests();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, fetchRequests]);

  const filteredRequests = useMemo(() => {
    const list = data?.requests ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (langFilter !== 'all' && r.lang !== langFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q) {
        const hay = [
          r.userName,
          r.userEmail,
          r.queryPreview,
          r.detectedState ?? '',
          r.detectedOccupation ?? '',
          ...r.matchedSchemes.map((s) => s.name),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, typeFilter, langFilter, statusFilter]);

  const handleExportCsv = () => {
    const rows = filteredRequests;
    if (rows.length === 0) return;
    const header = [
      'ID',
      'Timestamp',
      'Type',
      'User Role',
      'User Name',
      'User Email',
      'Language',
      'Query Preview',
      'Detected State',
      'Detected Occupation',
      'Eligible Count',
      'Top Matched Schemes',
      'Mode',
      'Status',
      'Latency (ms)',
    ];
    const escape = (val: unknown) => `"${String(val ?? '').replaceAll('"', '""')}"`;
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.timestamp,
          r.type,
          r.userRole,
          r.userName,
          r.userEmail,
          r.lang,
          r.queryPreview,
          r.detectedState ?? '',
          r.detectedOccupation ?? '',
          r.eligibleCount,
          r.matchedSchemes.map((s) => s.name).join(' | '),
          r.mode,
          r.status,
          r.latencyMs,
        ]
          .map(escape)
          .join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yojanamitra-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLog = async () => {
    if (!window.confirm('Clear all recorded user requests from the admin dashboard?')) return;
    await fetch('/api/admin/requests', { method: 'DELETE' });
    await fetchRequests();
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--bg-surface)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-surface)]" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Card className="overflow-hidden text-center">
          <div className="h-1.5 bg-gradient-to-r from-[#D45015] to-[#0D5C63]" />
          <CardContent className="flex flex-col items-center gap-4 p-8 pt-8">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-saffron-soft)] text-[var(--accent-saffron)]">
              <Lock className="h-8 w-8" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-[var(--fg-primary)]">
              Administrator Access Required
            </h1>
            <p className="text-base text-[var(--fg-secondary)]">
              Sign in with an Admin account to view all citizen requests, eligibility analytics,
              and live system activity.
            </p>
            <Button asChild variant="primary" size="lg">
              <Link href="/login?tab=admin">Go to Admin Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const m = data?.metrics;
  const totalLang = (m?.byLanguage.en ?? 0) + (m?.byLanguage.hi ?? 0) + (m?.byLanguage.mr ?? 0) || 1;
  const maxSchemeCount = m?.topSchemes[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="surface-elevated flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D45015] to-[#0D5C63] text-white shadow-sm">
            <LayoutDashboard className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
                Admin Command Center
              </h1>
              <Badge variant="saffron">LIVE AUDIT</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--fg-secondary)]">
              Monitor all citizen scheme queries, eligibility checks, language usage, and guardrail
              events (PII automatically redacted).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchRequests()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={filteredRequests.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={(data?.requests.length ?? 0) === 0}
            onClick={() => void handleClearLog()}
            className="text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[var(--status-ineligible-bg)] p-4 text-sm font-medium text-[var(--status-ineligible-fg)]">
          {error}
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
              <span>Total Requests</span>
              <Activity className="h-4 w-4 text-[var(--accent-teal)]" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
              {m?.totalRequests ?? 0}
            </div>
            <div className="mt-1 text-xs text-[var(--fg-muted)]">
              {m?.chatRequests ?? 0} chat · {m?.eligibilityRequests ?? 0} wizard
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
              <span>Citizens / Users</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
              {m?.registeredCitizens ?? 0}
            </div>
            <div className="mt-1 text-xs text-[var(--fg-muted)]">
              {m?.activeActors ?? 0} active requester(s)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
              <span>Avg Latency</span>
              <Clock className="h-4 w-4 text-[var(--accent-saffron)]" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
              {m?.avgLatencyMs ?? 0}
              <span className="ml-1 text-base font-semibold text-[var(--fg-muted)]">ms</span>
            </div>
            <div className="mt-1 text-xs text-[var(--fg-muted)]">Stateless in-memory RAG</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
              <span>Guard Blocked</span>
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
              {m?.blockedRequests ?? 0}
            </div>
            <div className="mt-1 text-xs text-[var(--fg-muted)]">
              Prompt injection / rate limits
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6 pt-6">
            <div className="flex items-center gap-2 font-display text-base font-bold">
              <Globe className="h-4 w-4 text-[var(--accent-teal)]" />
              <span>Requests by Language</span>
            </div>
            {(
              [
                { code: 'mr' as const, label: 'Marathi (मराठी)', color: 'bg-[#D45015]' },
                { code: 'hi' as const, label: 'Hindi (हिंदी)', color: 'bg-amber-500' },
                { code: 'en' as const, label: 'English', color: 'bg-[#0D5C63]' },
              ] as const
            ).map((item) => {
              const count = m?.byLanguage[item.code] ?? 0;
              const pct = Math.round((count / totalLang) * 100);
              return (
                <div key={item.code} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[var(--fg-primary)]">{item.label}</span>
                    <span className="font-semibold text-[var(--fg-secondary)]">
                      {count} ({m?.totalRequests ? pct : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${m?.totalRequests ? pct : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3.5 p-6 pt-6">
            <div className="flex items-center gap-2 font-display text-base font-bold">
              <Sparkles className="h-4 w-4 text-[var(--accent-saffron)]" />
              <span>Top Matched Welfare Schemes</span>
            </div>
            {!m?.topSchemes.length ? (
              <p className="py-4 text-sm text-[var(--fg-muted)]">
                No scheme matches recorded yet. Submit a query on the Ask AI page to see real-time
                demand here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {m.topSchemes.map((s) => (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-[var(--fg-primary)]">
                        {s.name}
                      </span>
                      <Badge variant="teal">{s.count}</Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0D5C63] to-[#D45015]"
                        style={{ width: `${Math.round((s.count / maxSchemeCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All User Requests Table */}
      <Card>
        <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[var(--fg-primary)]">
              All Citizen Requests ({filteredRequests.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user, query, state, scheme..."
                  className="min-h-[42px] w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pr-3 pl-9 text-sm focus:border-[var(--accent-teal)] focus:outline-none sm:w-64"
                />
              </div>

              <select
                aria-label="Filter by request type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'chat' | 'eligibility')}
                className="min-h-[42px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold"
              >
                <option value="all">All Types</option>
                <option value="chat">AI Chat</option>
                <option value="eligibility">Wizard</option>
              </select>

              <select
                aria-label="Filter by language"
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value as 'all' | 'en' | 'hi' | 'mr')}
                className="min-h-[42px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold"
              >
                <option value="all">All Langs</option>
                <option value="mr">Marathi</option>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'blocked')}
                className="min-h-[42px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] py-12 text-center">
              <Filter className="h-8 w-8 text-[var(--fg-muted)]" />
              <p className="text-sm font-medium text-[var(--fg-secondary)]">
                No user requests match the current filter.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Try a Citizen Query on Home</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-xs font-bold uppercase text-[var(--fg-muted)]">
                    <th className="py-3 pr-3">Time</th>
                    <th className="py-3 pr-3">Citizen / Role</th>
                    <th className="py-3 pr-3">Query &amp; Profile</th>
                    <th className="py-3 pr-3">Matched Schemes</th>
                    <th className="py-3 pr-3">Lang / Mode</th>
                    <th className="py-3 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="transition-colors hover:bg-[var(--bg-surface-muted)]/40"
                    >
                      <td className="py-3.5 pr-3 align-top whitespace-nowrap text-xs text-[var(--fg-muted)]">
                        {new Date(req.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 pr-3 align-top">
                        <div className="font-semibold text-[var(--fg-primary)]">{req.userName}</div>
                        <div className="text-xs text-[var(--fg-muted)]">{req.userEmail}</div>
                        <div className="mt-1 flex gap-1">
                          <Badge
                            variant={
                              req.userRole === 'admin'
                                ? 'saffron'
                                : req.userRole === 'user'
                                  ? 'teal'
                                  : 'default'
                            }
                          >
                            {req.userRole}
                          </Badge>
                          <Badge variant="default">{req.type}</Badge>
                        </div>
                      </td>
                      <td className="max-w-xs py-3.5 pr-3 align-top">
                        <p className="line-clamp-2 font-medium text-[var(--fg-primary)]">
                          {req.queryPreview}
                        </p>
                        {(req.detectedState || req.detectedOccupation) && (
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-[var(--fg-muted)]">
                            {req.detectedState && (
                              <span className="rounded bg-[var(--bg-surface-muted)] px-1.5 py-0.5">
                                {req.detectedState}
                              </span>
                            )}
                            {req.detectedOccupation && (
                              <span className="rounded bg-[var(--bg-surface-muted)] px-1.5 py-0.5">
                                {req.detectedOccupation}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="max-w-xs py-3.5 pr-3 align-top">
                        {req.status === 'blocked' ? (
                          <Badge variant="ineligible">Blocked by Guard</Badge>
                        ) : req.matchedSchemes.length === 0 ? (
                          <span className="text-xs text-[var(--fg-muted)]">None</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {req.eligibleCount} eligible · {req.matchedSchemes.length} shown
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {req.matchedSchemes.slice(0, 3).map((s) => (
                                <span
                                  key={s.id}
                                  className="rounded-md bg-[var(--accent-teal-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-teal)]"
                                >
                                  {s.name.length > 26 ? `${s.name.slice(0, 26)}…` : s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Badge variant="default">{req.lang.toUpperCase()}</Badge>
                          <Badge
                            variant={
                              req.mode === 'live'
                                ? 'eligible'
                                : req.mode === 'blocked'
                                  ? 'ineligible'
                                  : 'likely'
                            }
                          >
                            {req.mode}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3.5 align-top text-right font-mono text-xs font-semibold text-[var(--fg-secondary)]">
                        {req.latencyMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
