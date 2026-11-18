'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Lock, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import type {
  CasteCategory,
  EducationLevel,
  Gender,
  Occupation,
  ResidenceType,
  UserProfile,
} from '@/lib/schemes/schema';
import { clearAllUserData, getStoredProfile, setStoredProfile } from '@/lib/storage/local';

export function ProfileEditor() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredProfile(profile);
    setToast(t.profile.savedToast);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDeleteAll = () => {
    if (window.confirm(t.profile.deleteConfirm)) {
      clearAllUserData();
      setProfile({});
      setToast(t.profile.deletedToast);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg-primary)] sm:text-3xl">
          {t.profile.title}
        </h1>
        <p className="mt-1 text-base text-[var(--fg-secondary)]">{t.profile.subtitle}</p>
      </div>

      {/* Privacy Guarantee Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal-soft)] p-4 text-sm text-[var(--accent-teal)]">
        <Lock className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="font-medium">{t.profile.localOnlyNotice}</p>
      </div>

      {toast && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-[var(--status-eligible-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-eligible-fg)]"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>{toast}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold">
                <span>Age (Years)</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={profile.age ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      age: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                />
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Gender</span>
                <select
                  value={profile.gender ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      gender: (e.target.value || undefined) as Gender | undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>State</span>
                <select
                  value={profile.state ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, state: e.target.value || undefined }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Other">Other Indian State / UT</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Occupation</span>
                <select
                  value={profile.occupation ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      occupation: (e.target.value || undefined) as Occupation | undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="farmer">Farmer</option>
                  <option value="student">Student</option>
                  <option value="unorganized_worker">Unorganized Worker</option>
                  <option value="artisan">Traditional Artisan</option>
                  <option value="street_vendor">Street Vendor</option>
                  <option value="entrepreneur">Entrepreneur / Business</option>
                  <option value="homemaker">Homemaker</option>
                  <option value="retired">Retired</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="salaried">Salaried</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Annual Family Income (₹)</span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={profile.annualIncome ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      annualIncome: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="e.g., 150000"
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                />
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Land Holding (Acres)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={profile.landHoldingAcres ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : undefined;
                    setProfile((p) => ({
                      ...p,
                      landHoldingAcres: v,
                      ownsLand: v !== undefined ? v > 0 : p.ownsLand,
                    }));
                  }}
                  placeholder="e.g., 2"
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                />
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Category (Optional)</span>
                <select
                  value={profile.casteCategory ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      casteCategory: (e.target.value || undefined) as CasteCategory | undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="general">General / Open</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="ews">EWS</option>
                  <option value="vjnt">VJNT / DNT</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Area Type</span>
                <select
                  value={profile.residenceType ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      residenceType: (e.target.value || undefined) as ResidenceType | undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="rural">Rural / Village</option>
                  <option value="urban">Urban / City</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Education Level</span>
                <select
                  value={profile.educationLevel ?? ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      educationLevel: (e.target.value || undefined) as EducationLevel | undefined,
                    }))
                  }
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base font-normal"
                >
                  <option value="">-- Select --</option>
                  <option value="secondary">Class 8–10</option>
                  <option value="higher_secondary">Class 11–12</option>
                  <option value="diploma_iti">ITI / Diploma</option>
                  <option value="undergraduate">Undergraduate / College</option>
                  <option value="postgraduate">Postgraduate</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-5 pt-2">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(profile.isBpl)}
                  onChange={(e) => setProfile((p) => ({ ...p, isBpl: e.target.checked }))}
                  className="h-5 w-5 accent-[var(--accent-teal)]"
                />
                <span>BPL / Yellow Ration Card</span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(profile.hasDisability)}
                  onChange={(e) => setProfile((p) => ({ ...p, hasDisability: e.target.checked }))}
                  className="h-5 w-5 accent-[var(--accent-teal)]"
                />
                <span>Person with Disability (Divyangjan)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary">
                  <Save className="h-4 w-4" />
                  <span>{t.profile.saveBtn}</span>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/wizard">{t.profile.checkEligibilityBtn}</Link>
                </Button>
              </div>

              <Button type="button" variant="destructive" onClick={handleDeleteAll}>
                <Trash2 className="h-4 w-4" />
                <span>{t.profile.deleteBtn}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
