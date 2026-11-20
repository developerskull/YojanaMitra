'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Filter,
  Globe,
  IndianRupee,
  LayoutDashboard,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type {
  ApplicationStats,
  ApplicationStatus,
  SchemeApplication,
} from '@/lib/applications/store';
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
  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'applications' | 'benefits' | 'queries'>(
    'applications'
  );

  // Queries filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chat' | 'eligibility'>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'hi' | 'mr'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'blocked'>('all');

  // Applications filter state
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
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
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/applications?stats=true', { cache: 'no-store' });
      if (res.ok) {
        const payload = (await res.json()) as {
          applications: SchemeApplication[];
          stats?: ApplicationStats;
        };
        setApplications(payload.applications || []);
        if (payload.stats) {
          setAppStats(payload.stats);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchRequests(), fetchApplications()]);
    setLoading(false);
  }, [fetchRequests, fetchApplications]);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void refreshAll();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, refreshAll]);

  const handleUpdateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    setUpdatingAppId(appId);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      if (res.ok) {
        await fetchApplications();
      }
    } catch {
      // Ignore
    } finally {
      setUpdatingAppId(null);
    }
  };

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

  const filteredApplications = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    return applications.filter((app) => {
      if (appStatusFilter !== 'all' && app.status !== appStatusFilter) return false;
      if (q) {
        const hay = [
          app.userName,
          app.userEmail,
          app.userState ?? '',
          app.userOccupation ?? '',
          app.schemeName.en,
          app.schemeName.hi,
          app.schemeName.mr,
          app.category,
          app.applicationRefNumber ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, appSearch, appStatusFilter]);

  const handleExportApplicationsCsv = () => {
    const rows = filteredApplications;
    if (rows.length === 0) return;
    const header = [
      'Application ID',
      'Citizen Name',
      'Citizen Email',
      'State',
      'Occupation',
      'Scheme ID',
      'Scheme Name',
      'Category',
      'Estimated Benefit (INR)',
      'Status',
      'Applied At',
      'Reference Number',
      'Notes',
    ];
    const escape = (val: unknown) => `"${String(val ?? '').replaceAll('"', '""')}"`;
    const csvLines = [
      header.join(','),
      ...rows.map((a) =>
        [
          a.id,
          a.userName,
          a.userEmail,
          a.userState ?? '',
          a.userOccupation ?? '',
          a.schemeId,
          a.schemeName.en,
          a.category,
          a.estimatedAnnualBenefit,
          a.status,
          a.appliedAt,
          a.applicationRefNumber ?? '',
          a.notes ?? '',
        ]
          .map(escape)
          .join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yojanamitra-citizen-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              Sign in with an Admin account to view all citizen applications, scheme benefit
              analytics, and live system requests.
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
  const totalLang =
    (m?.byLanguage.en ?? 0) + (m?.byLanguage.hi ?? 0) + (m?.byLanguage.mr ?? 0) || 1;
  const maxSchemeCount = m?.topSchemes[0]?.count ?? 1;

  const totalPotentialBenefit = appStats?.totalPotentialBenefitValue ?? 0;
  const totalRealizedBenefit = appStats?.totalRealizedBenefitValue ?? 0;
  const maxBenefitSchemeVal = appStats?.mostBeneficialSchemes[0]?.totalPotentialBenefit || 1;

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
              Monitor citizen applications, inspect which user applied for which scheme, and track
              which schemes deliver maximum financial benefits.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={activeTab === 'applications' ? handleExportApplicationsCsv : handleExportCsv}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          {activeTab === 'queries' && (
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
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[var(--status-ineligible-bg)] p-4 text-sm font-medium text-[var(--status-ineligible-fg)]">
          {error}
        </div>
      )}

      {/* Main Feature Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--border-subtle)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'applications'
              ? 'bg-[var(--accent-teal)] text-white shadow-sm dark:text-[#041B19]'
              : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--fg-primary)]'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Citizen Applications</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {applications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('benefits')}
          className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'benefits'
              ? 'bg-[var(--accent-teal)] text-white shadow-sm dark:text-[#041B19]'
              : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--fg-primary)]'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Scheme Benefit Analytics</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            ₹{(totalPotentialBenefit / 100000).toFixed(1)}L
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('queries')}
          className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'queries'
              ? 'bg-[var(--accent-teal)] text-white shadow-sm dark:text-[#041B19]'
              : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--fg-primary)]'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Query Audit Stream</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {m?.totalRequests ?? 0}
          </span>
        </button>
      </div>

      {/* TAB 1: CITIZEN APPLICATIONS (Which User Applied For Which Scheme) */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Applications Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5 pt-5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
                  <span>Total Applications</span>
                  <FileCheck className="h-4 w-4 text-[var(--accent-teal)]" />
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
                  {applications.length}
                </div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">
                  Across {appStats?.totalUniqueUsers ?? 1} citizens
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 pt-5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
                  <span>Potential Benefits</span>
                  <IndianRupee className="h-4 w-4 text-[var(--accent-saffron)]" />
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)]">
                  ₹{(totalPotentialBenefit / 100000).toFixed(2)}
                  <span className="ml-1 text-base font-semibold text-[var(--fg-muted)]">Lakh</span>
                </div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">Applied value claimed</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 pt-5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
                  <span>Approved / Received</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹{(totalRealizedBenefit / 100000).toFixed(2)}
                  <span className="ml-1 text-base font-semibold text-[var(--fg-muted)]">Lakh</span>
                </div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">
                  {(appStats?.byStatus.approved ?? 0) + (appStats?.byStatus.benefit_received ?? 0)}{' '}
                  approved applications
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 pt-5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-[var(--fg-muted)]">
                  <span>Under Review</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {appStats?.byStatus.under_review ?? 0}
                </div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">Pending verification</div>
              </CardContent>
            </Card>
          </div>

          {/* Applications Table Card */}
          <Card>
            <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--fg-primary)]">
                    Citizen Applications Matrix ({filteredApplications.length})
                  </h2>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Direct audit of which citizen applied for which scheme with live status updates.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-auto">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                    <input
                      type="search"
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      placeholder="Search citizen, scheme, ref#..."
                      className="min-h-[42px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pr-3 pl-9 text-sm focus:border-[var(--accent-teal)] focus:outline-none sm:w-64"
                    />
                  </div>

                  <select
                    aria-label="Filter applications by status"
                    value={appStatusFilter}
                    onChange={(e) =>
                      setAppStatusFilter(e.target.value as 'all' | ApplicationStatus)
                    }
                    className="min-h-[42px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="applied">Applied</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="benefit_received">Benefit Received</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] py-12 text-center">
                  <Filter className="h-8 w-8 text-[var(--fg-muted)]" />
                  <p className="text-sm font-medium text-[var(--fg-secondary)]">
                    No citizen applications match the filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="pb-2 text-xs text-[var(--fg-muted)] sm:hidden">
                    ← Swipe table horizontally to view all citizen details &amp; status →
                  </div>
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-xs font-bold uppercase text-[var(--fg-muted)]">
                        <th className="py-3 pr-3">Citizen / Beneficiary</th>
                        <th className="py-3 pr-3">State &amp; Livelihood</th>
                        <th className="py-3 pr-3">Scheme Applied</th>
                        <th className="py-3 pr-3 text-right">Benefit (₹)</th>
                        <th className="py-3 pr-3">Status</th>
                        <th className="py-3 pr-3">Applied At</th>
                        <th className="py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredApplications.map((app) => (
                        <tr
                          key={app.id}
                          className="transition-colors hover:bg-[var(--bg-surface-muted)]/40"
                        >
                          <td className="py-3.5 pr-3 align-top">
                            <div className="font-semibold text-[var(--fg-primary)]">
                              {app.userName}
                            </div>
                            <div className="text-xs text-[var(--fg-muted)]">{app.userEmail}</div>
                            {app.applicationRefNumber && (
                              <div className="mt-1 font-mono text-[11px] font-bold text-[var(--accent-teal)]">
                                Ref: {app.applicationRefNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 pr-3 align-top">
                            <div className="text-xs font-medium text-[var(--fg-primary)]">
                              {app.userState ?? 'Maharashtra'}
                            </div>
                            <div className="mt-0.5 text-xs capitalize text-[var(--fg-muted)]">
                              {app.userOccupation ?? 'Citizen'}
                            </div>
                          </td>
                          <td className="max-w-xs py-3.5 pr-3 align-top">
                            <div className="font-bold text-[var(--fg-primary)]">
                              {app.schemeName.en}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="teal">{app.category}</Badge>
                              <span className="text-xs text-[var(--fg-secondary)]">
                                {app.benefitHighlight.en}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-3 align-top text-right">
                            <span className="font-mono text-base font-extrabold text-[var(--accent-teal)]">
                              ₹{app.estimatedAnnualBenefit.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[11px] text-[var(--fg-muted)]">estimated</div>
                          </td>
                          <td className="py-3.5 pr-3 align-top">
                            <Badge
                              variant={
                                app.status === 'benefit_received' || app.status === 'approved'
                                  ? 'eligible'
                                  : app.status === 'under_review'
                                    ? 'likely'
                                    : app.status === 'rejected'
                                      ? 'ineligible'
                                      : 'default'
                              }
                              className="capitalize"
                            >
                              {app.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 pr-3 align-top whitespace-nowrap text-xs text-[var(--fg-muted)]">
                            {new Date(app.appliedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 align-top text-right">
                            <select
                              aria-label={`Change status for ${app.userName}`}
                              disabled={updatingAppId === app.id}
                              value={app.status}
                              onChange={(e) =>
                                void handleUpdateStatus(app.id, e.target.value as ApplicationStatus)
                              }
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs font-medium"
                            >
                              <option value="applied">Applied</option>
                              <option value="under_review">Under Review</option>
                              <option value="approved">Approved</option>
                              <option value="benefit_received">Benefit Received</option>
                              <option value="rejected">Rejected</option>
                            </select>
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
      )}

      {/* TAB 2: SCHEME BENEFIT ANALYTICS (Which Scheme Gets More Beneficial) */}
      {activeTab === 'benefits' && (
        <div className="space-y-6">
          {/* Benefit Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-[var(--accent-teal)]/30 bg-gradient-to-br from-[var(--accent-teal-soft)]/20 to-transparent">
              <CardContent className="p-6 pt-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-teal)]">
                  <TrendingUp className="h-4 w-4" />
                  <span>Total Welfare Impact</span>
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)] sm:text-4xl">
                  ₹{totalPotentialBenefit.toLocaleString('en-IN')}
                </div>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  Sum of all direct cash transfers, insurance cover, and stipends across
                  applications
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <CardContent className="p-6 pt-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Realized Benefit Value</span>
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 sm:text-4xl">
                  ₹{totalRealizedBenefit.toLocaleString('en-IN')}
                </div>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  Value of approved applications and credited DBT amounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 pt-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-saffron)]">
                  <Users className="h-4 w-4" />
                  <span>Avg Benefit / Beneficiary</span>
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-[var(--fg-primary)] sm:text-4xl">
                  ₹
                  {appStats?.totalUniqueUsers
                    ? Math.round(totalPotentialBenefit / appStats.totalUniqueUsers).toLocaleString(
                        'en-IN'
                      )
                    : 0}
                </div>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  Average financial assistance unlocked per participating citizen
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scheme Leaderboards */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Schemes Ranked by Financial Value */}
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-base font-bold">
                    <BarChart3 className="h-5 w-5 text-[var(--accent-teal)]" />
                    <span>Top Schemes by Total Financial Benefit</span>
                  </div>
                  <Badge variant="teal">₹ IMPACT</Badge>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  Identifies which schemes generate the largest total monetary support for citizens.
                </p>

                <div className="space-y-3 pt-2">
                  {(appStats?.mostBeneficialSchemes ?? []).map((scheme, idx) => {
                    const pct = Math.round(
                      (scheme.totalPotentialBenefit / maxBenefitSchemeVal) * 100
                    );
                    return (
                      <div
                        key={scheme.schemeId}
                        className="space-y-1.5 rounded-xl p-2.5 transition-colors hover:bg-[var(--bg-surface-muted)]"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="mr-1.5 font-mono text-xs font-bold text-[var(--accent-saffron)]">
                              #{idx + 1}
                            </span>
                            <span
                              className="font-semibold leading-snug text-[var(--fg-primary)] line-clamp-2"
                              title={scheme.schemeName}
                            >
                              {scheme.schemeName}
                            </span>
                            <div className="mt-0.5 text-xs text-[var(--fg-muted)]">
                              {scheme.applicationCount} applicants · {scheme.approvedCount} approved
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-mono text-sm font-extrabold text-[var(--accent-teal)]">
                              ₹{scheme.totalPotentialBenefit.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              ₹{scheme.realizedBenefit.toLocaleString('en-IN')} realized
                            </div>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0D5C63] to-[#D45015]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Schemes Ranked by Application Volume */}
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-base font-bold">
                    <Sparkles className="h-5 w-5 text-[var(--accent-saffron)]" />
                    <span>Most Popular Schemes (Application Volume)</span>
                  </div>
                  <Badge variant="saffron">DEMAND</Badge>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  Shows which welfare programs citizens are actively seeking and applying for most.
                </p>

                <div className="space-y-3 pt-2">
                  {(appStats?.topAppliedSchemes ?? []).map((scheme, idx) => (
                    <div
                      key={scheme.schemeId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-saffron-soft)] font-mono text-xs font-bold text-[var(--accent-saffron)]">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-semibold leading-snug text-[var(--fg-primary)] line-clamp-2"
                            title={scheme.schemeName}
                          >
                            {scheme.schemeName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                            <span className="capitalize">{scheme.category}</span>
                            <span>•</span>
                            <span>Total ₹{scheme.totalBenefit.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="teal" className="shrink-0 text-xs font-bold">
                        {scheme.count} Applied
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution Breakdown */}
          <Card>
            <CardContent className="p-6 pt-6">
              <h3 className="font-display text-base font-bold text-[var(--fg-primary)]">
                Welfare Benefit Distribution by Citizen Category
              </h3>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Proportion of government welfare funds distributed across target demographics.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {(appStats?.categoryBreakdown ?? []).map((cat) => (
                  <div
                    key={cat.category}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-center"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-teal)]">
                      {cat.category}
                    </div>
                    <div className="mt-2 font-display text-xl font-extrabold text-[var(--fg-primary)]">
                      ₹{(cat.totalBenefitValue / 1000).toFixed(0)}k
                    </div>
                    <div className="mt-1 text-xs text-[var(--fg-muted)]">
                      {cat.applicationsCount} application(s)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: QUERY AUDIT STREAM (Existing Requests Log) */}
      {activeTab === 'queries' && (
        <div className="space-y-6">
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
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="space-y-4 p-5 pt-5 sm:p-6 sm:pt-6">
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
                      <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 flex-1 font-medium text-[var(--fg-primary)]">
                          {item.label}
                        </span>
                        <span className="shrink-0 font-semibold text-[var(--fg-secondary)]">
                          {count} ({m?.totalRequests ? pct : 0}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
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

            <Card className="min-w-0 overflow-hidden">
              <CardContent className="space-y-3.5 p-5 pt-5 sm:p-6 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-base font-bold">
                    <Sparkles className="h-4 w-4 text-[var(--accent-saffron)]" />
                    <span>Top Matched Welfare Schemes</span>
                  </div>
                  <Badge variant="saffron" className="text-[11px] font-bold">
                    DEMAND
                  </Badge>
                </div>
                {!m?.topSchemes.length ? (
                  <p className="py-4 text-sm text-[var(--fg-muted)]">
                    No scheme matches recorded yet. Submit a query on the Ask AI page to see
                    real-time demand here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {m.topSchemes.map((s) => (
                      <div key={s.id} className="space-y-1.5">
                        <div className="flex min-w-0 items-start justify-between gap-3 text-sm">
                          <span
                            className="min-w-0 flex-1 font-semibold leading-snug text-[var(--fg-primary)] line-clamp-2"
                            title={s.name}
                          >
                            {s.name}
                          </span>
                          <Badge variant="teal" className="shrink-0 font-mono text-xs font-bold">
                            {s.count}
                          </Badge>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0D5C63] to-[#D45015] transition-all"
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
                  <div className="relative w-full sm:w-auto">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search user, query, state, scheme..."
                      className="min-h-[42px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pr-3 pl-9 text-sm focus:border-[var(--accent-teal)] focus:outline-none sm:w-64"
                    />
                  </div>

                  <select
                    aria-label="Filter by request type"
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as 'all' | 'chat' | 'eligibility')
                    }
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
                    onChange={(e) =>
                      setStatusFilter(e.target.value as 'all' | 'completed' | 'blocked')
                    }
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
                  <div className="pb-2 text-xs text-[var(--fg-muted)] sm:hidden">
                    ← Swipe table horizontally to view queries &amp; latency →
                  </div>
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
                            <div className="font-semibold text-[var(--fg-primary)]">
                              {req.userName}
                            </div>
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
      )}
    </div>
  );
}
