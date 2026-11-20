import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';

export type ApplicationStatus =
  'applied' | 'under_review' | 'approved' | 'benefit_received' | 'rejected';

export interface SchemeApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userState?: string;
  userOccupation?: string;
  schemeId: string;
  schemeName: {
    en: string;
    hi: string;
    mr: string;
  };
  category: string;
  benefitType: string;
  benefitHighlight: {
    en: string;
    hi: string;
    mr: string;
  };
  estimatedAnnualBenefit: number; // in INR (e.g. 6000 for PM-Kisan, 18000 for Ladki Bahin, 500000 for Ayushman)
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  applicationRefNumber?: string;
  notes?: string;
}

export interface SchemeBenefitMetrics {
  schemeId: string;
  schemeName: string;
  category: string;
  unitBenefit: number;
  applicationCount: number;
  approvedCount: number;
  totalPotentialBenefit: number;
  realizedBenefit: number;
}

export interface ApplicationStats {
  totalApplications: number;
  totalUniqueUsers: number;
  totalPotentialBenefitValue: number;
  totalRealizedBenefitValue: number;
  byStatus: Record<ApplicationStatus, number>;
  mostBeneficialSchemes: SchemeBenefitMetrics[];
  topAppliedSchemes: Array<{
    schemeId: string;
    schemeName: string;
    category: string;
    count: number;
    totalBenefit: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    applicationsCount: number;
    totalBenefitValue: number;
  }>;
}

export interface ApplicationStore {
  createApplication(
    input: Omit<SchemeApplication, 'id' | 'appliedAt' | 'updatedAt' | 'status'> & {
      status?: ApplicationStatus;
    }
  ): SchemeApplication | Promise<SchemeApplication>;
  listApplications(filter?: {
    userId?: string;
    schemeId?: string;
    status?: ApplicationStatus;
  }): SchemeApplication[] | Promise<SchemeApplication[]>;
  getApplicationById(
    id: string
  ): SchemeApplication | undefined | Promise<SchemeApplication | undefined>;
  updateStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string
  ): SchemeApplication | null | Promise<SchemeApplication | null>;
  getStats(): ApplicationStats | Promise<ApplicationStats>;
  clear(): void | Promise<void>;
}

const MAX_APPLICATIONS = 1000;

class FileBackedApplicationStore implements ApplicationStore {
  private applications: SchemeApplication[] = [];
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'runtime', 'applications.json');
    this.loadFromDisk();
    this.ensureSeedApplications();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (Array.isArray(parsed)) {
          this.applications = parsed.slice(0, MAX_APPLICATIONS);
        }
      }
    } catch {
      this.applications = [];
    }
  }

  private persistToDisk(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.applications, null, 2), 'utf-8');
    } catch {
      // Safe no-op on read-only environments
    }
  }

  private ensureSeedApplications(): void {
    if (this.applications.length > 0) return;

    // Seed realistic applications across citizens, schemes, and categories
    this.applications = [
      {
        id: 'app-seed-001',
        userId: 'citizen-demo-1',
        userName: 'Ramesh Patil',
        userEmail: 'citizen@yojanamitra.in',
        userState: 'Maharashtra',
        userOccupation: 'farmer',
        schemeId: 'pm-kisan',
        schemeName: {
          en: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
          hi: 'प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान)',
          mr: 'प्रधानमंत्री किसान सन्मान निधी (पीएम-किसान)',
        },
        category: 'farmer',
        benefitType: 'cash',
        benefitHighlight: {
          en: '₹6,000 / year (3 × ₹2,000)',
          hi: '₹6,000 / वर्ष (3 × ₹2,000)',
          mr: '₹6,000 / वर्ष (३ × ₹2,000)',
        },
        estimatedAnnualBenefit: 6000,
        status: 'benefit_received',
        appliedAt: '2026-11-10T09:30:00.000Z',
        updatedAt: '2026-11-15T14:20:00.000Z',
        applicationRefNumber: 'MH-PMK-2026-89412',
        notes: 'Installments credited to Bank of Maharashtra DBT account.',
      },
      {
        id: 'app-seed-002',
        userId: 'citizen-demo-1',
        userName: 'Ramesh Patil',
        userEmail: 'citizen@yojanamitra.in',
        userState: 'Maharashtra',
        userOccupation: 'farmer',
        schemeId: 'namo-shetkari-mahasanman-nidhi',
        schemeName: {
          en: 'Namo Shetkari Mahasanman Nidhi Yojana',
          hi: 'नमो शेतकरी महासन्मान निधी योजना',
          mr: 'नमो शेतकरी महासन्मान निधी योजना',
        },
        category: 'farmer',
        benefitType: 'cash',
        benefitHighlight: {
          en: '₹6,000 / year additional DBT',
          hi: '₹6,000 / वर्ष अतिरिक्त DBT',
          mr: '₹6,000 / वर्ष अतिरिक्त DBT',
        },
        estimatedAnnualBenefit: 6000,
        status: 'approved',
        appliedAt: '2026-11-11T10:15:00.000Z',
        updatedAt: '2026-11-16T11:00:00.000Z',
        applicationRefNumber: 'NSM-MH-2026-10294',
        notes: 'Verified via Mahadbt farmer portal.',
      },
      {
        id: 'app-seed-003',
        userId: 'usr-sunita-shinde',
        userName: 'Sunita Shinde',
        userEmail: 'sunita.shinde@gmail.com',
        userState: 'Maharashtra',
        userOccupation: 'homemaker',
        schemeId: 'maharashtra-ladki-bahin',
        schemeName: {
          en: 'Mukhyamantri Majhi Ladki Bahin Yojana (Maharashtra)',
          hi: 'मुख्यमंत्री माझी लाडकी बहीण योजना (महाराष्ट्र)',
          mr: 'मुख्यमंत्री माझी लाडकी बहीण योजना (महाराष्ट्र)',
        },
        category: 'woman',
        benefitType: 'cash',
        benefitHighlight: {
          en: '₹1,500 / month DBT for eligible Maharashtra women',
          hi: 'पात्र महाराष्ट्र महिलाओं को ₹1,500 / माह DBT',
          mr: 'पात्र महिलांना दरमहा ₹1,500 थेट बँक खात्यात',
        },
        estimatedAnnualBenefit: 18000,
        status: 'benefit_received',
        appliedAt: '2026-11-05T08:00:00.000Z',
        updatedAt: '2026-11-12T16:45:00.000Z',
        applicationRefNumber: 'LBY-PUN-2026-55410',
        notes: 'Monthly ₹1,500 credited via Aadhaar linked DBT.',
      },
      {
        id: 'app-seed-004',
        userId: 'usr-anand-kulkarni',
        userName: 'Anand Kulkarni',
        userEmail: 'anand.k@rediffmail.com',
        userState: 'Maharashtra',
        userOccupation: 'artisan',
        schemeId: 'ayushman-bharat-pm-jay',
        schemeName: {
          en: 'Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB PM-JAY)',
          hi: 'आयुष्मान भारत – प्रधानमंत्री जन आरोग्य योजना (पीएम-जेएवाई)',
          mr: 'आयुष्मान भारत – प्रधानमंत्री जन आरोग्य योजना (PM-JAY)',
        },
        category: 'health',
        benefitType: 'insurance',
        benefitHighlight: {
          en: '₹5 lakh / family / year cashless hospital cover',
          hi: '₹5 लाख / परिवार / वर्ष कैशलेस इलाज',
          mr: '₹5 लाख / कुटुंब / वर्ष कॅशलेस उपचार',
        },
        estimatedAnnualBenefit: 500000,
        status: 'approved',
        appliedAt: '2026-11-08T14:20:00.000Z',
        updatedAt: '2026-11-14T10:30:00.000Z',
        applicationRefNumber: 'AB-PMJAY-MH-772183',
        notes: 'Ayushman Golden Card generated & verified.',
      },
      {
        id: 'app-seed-005',
        userId: 'usr-priyanka-jadhav',
        userName: 'Priyanka Jadhav',
        userEmail: 'priyanka.j@edu.in',
        userState: 'Maharashtra',
        userOccupation: 'student',
        schemeId: 'maharashtra-panjabrao-deshmukh-hostel',
        schemeName: {
          en: 'Dr. Panjabrao Deshmukh Hostel Maintenance Allowance Scheme',
          hi: 'डॉ. पंजाबराव देशमुख छात्रावास निर्वाह भत्ता योजना',
          mr: 'डॉ. पंजाबराव देशमुख वसतिगृह निर्वाह भत्ता योजना',
        },
        category: 'student',
        benefitType: 'scholarship',
        benefitHighlight: {
          en: '₹20,000 to ₹30,000 / year hostel allowance',
          hi: '₹20,000 से ₹30,000 / वर्ष छात्रावास भत्ता',
          mr: '₹20,000 ते ₹30,000 / वर्ष वसतिगृह भत्ता',
        },
        estimatedAnnualBenefit: 30000,
        status: 'under_review',
        appliedAt: '2026-11-14T11:40:00.000Z',
        updatedAt: '2026-11-17T09:15:00.000Z',
        applicationRefNumber: 'MHD-HOSTEL-2026-30219',
        notes: 'Hostel admission receipt verified, awaiting college sign-off.',
      },
      {
        id: 'app-seed-006',
        userId: 'usr-vitthal-more',
        userName: 'Vitthal More',
        userEmail: 'vitthal.more@yahoo.com',
        userState: 'Maharashtra',
        userOccupation: 'artisan',
        schemeId: 'pm-vishwakarma',
        schemeName: {
          en: 'PM Vishwakarma Scheme',
          hi: 'पीएम विश्वकर्मा योजना',
          mr: 'पीएम विश्वकर्मा योजना',
        },
        category: 'worker',
        benefitType: 'loan',
        benefitHighlight: {
          en: '₹3 lakh collateral-free loan @ 5% + ₹15,000 toolkit',
          hi: '₹3 लाख तक संपार्श्विक-मुक्त ऋण @ 5% + ₹15,000 टूलकिट',
          mr: '५% व्याजाने ₹३ लाखांपर्यंत विनातारण कर्ज + ₹१५,००० टूलकिट',
        },
        estimatedAnnualBenefit: 315000,
        status: 'applied',
        appliedAt: '2026-11-17T15:10:00.000Z',
        updatedAt: '2026-11-17T15:10:00.000Z',
        applicationRefNumber: 'PMV-CARPENTRY-9941',
        notes: 'Applied for Carpentry trade skill verification.',
      },
      {
        id: 'app-seed-007',
        userId: 'citizen-demo-1',
        userName: 'Ramesh Patil',
        userEmail: 'citizen@yojanamitra.in',
        userState: 'Maharashtra',
        userOccupation: 'farmer',
        schemeId: 'pm-fasal-bima-yojana',
        schemeName: {
          en: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
          hi: 'प्रधानमंत्री फसल बीमा योजना (पीएमएफबीवाई)',
          mr: 'प्रधानमंत्री पीक विमा योजना (PMFBY)',
        },
        category: 'farmer',
        benefitType: 'insurance',
        benefitHighlight: {
          en: 'Comprehensive crop loss cover at ₹1 premium in Maharashtra',
          hi: 'महाराष्ट्र में ₹1 प्रीमियम पर व्यापक फसल सुरक्षा',
          mr: 'महाराष्ट्रात ₹१ नाममात्र शुल्कात सर्वसमावेशक पीक विमा',
        },
        estimatedAnnualBenefit: 50000,
        status: 'approved',
        appliedAt: '2026-11-09T13:00:00.000Z',
        updatedAt: '2026-11-16T12:00:00.000Z',
        applicationRefNumber: 'PMFBY-KHARIF-2026-44102',
        notes: 'Soybean crop loss survey cleared.',
      },
    ];

    this.persistToDisk();
  }

  createApplication(
    input: Omit<SchemeApplication, 'id' | 'appliedAt' | 'updatedAt' | 'status'> & {
      status?: ApplicationStatus;
    }
  ): SchemeApplication {
    const existingIndex = this.applications.findIndex(
      (a) => a.userId === input.userId && a.schemeId === input.schemeId
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing application
      const updated: SchemeApplication = {
        ...this.applications[existingIndex]!,
        ...input,
        status: input.status ?? this.applications[existingIndex]!.status,
        updatedAt: now,
      };
      this.applications[existingIndex] = updated;
      this.persistToDisk();
      return updated;
    }

    const newApp: SchemeApplication = {
      ...input,
      id: `app-${crypto.randomUUID().slice(0, 8)}`,
      status: input.status ?? 'applied',
      appliedAt: now,
      updatedAt: now,
    };

    this.applications.unshift(newApp);
    if (this.applications.length > MAX_APPLICATIONS) {
      this.applications = this.applications.slice(0, MAX_APPLICATIONS);
    }
    this.persistToDisk();
    return newApp;
  }

  listApplications(filter?: {
    userId?: string;
    schemeId?: string;
    status?: ApplicationStatus;
  }): SchemeApplication[] {
    return this.applications.filter((a) => {
      if (filter?.userId && a.userId !== filter.userId) return false;
      if (filter?.schemeId && a.schemeId !== filter.schemeId) return false;
      if (filter?.status && a.status !== filter.status) return false;
      return true;
    });
  }

  getApplicationById(id: string): SchemeApplication | undefined {
    return this.applications.find((a) => a.id === id);
  }

  updateStatus(id: string, status: ApplicationStatus, notes?: string): SchemeApplication | null {
    const app = this.applications.find((a) => a.id === id);
    if (!app) return null;

    app.status = status;
    app.updatedAt = new Date().toISOString();
    if (notes) app.notes = notes;

    this.persistToDisk();
    return app;
  }

  getStats(): ApplicationStats {
    return computeStatsFromApplications(this.applications);
  }

  clear(): void {
    this.applications = [];
    this.persistToDisk();
  }
}

export function computeStatsFromApplications(applications: SchemeApplication[]): ApplicationStats {
  const totalApplications = applications.length;
  const uniqueUsers = new Set(applications.map((a) => a.userId)).size;

  let totalPotentialBenefitValue = 0;
  let totalRealizedBenefitValue = 0;

  const byStatus: Record<ApplicationStatus, number> = {
    applied: 0,
    under_review: 0,
    approved: 0,
    benefit_received: 0,
    rejected: 0,
  };

  const schemeMap = new Map<
    string,
    {
      schemeId: string;
      schemeName: string;
      category: string;
      unitBenefit: number;
      applicationCount: number;
      approvedCount: number;
      totalPotentialBenefit: number;
      realizedBenefit: number;
    }
  >();

  const categoryMap = new Map<string, { count: number; totalBenefit: number }>();

  for (const app of applications) {
    const val = app.estimatedAnnualBenefit || 0;
    totalPotentialBenefitValue += val;

    if (app.status === 'approved' || app.status === 'benefit_received') {
      totalRealizedBenefitValue += val;
    }

    byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;

    // Group by scheme
    const existingScheme = schemeMap.get(app.schemeId) ?? {
      schemeId: app.schemeId,
      schemeName: app.schemeName.en,
      category: app.category,
      unitBenefit: val,
      applicationCount: 0,
      approvedCount: 0,
      totalPotentialBenefit: 0,
      realizedBenefit: 0,
    };

    existingScheme.applicationCount += 1;
    existingScheme.totalPotentialBenefit += val;
    if (app.status === 'approved' || app.status === 'benefit_received') {
      existingScheme.approvedCount += 1;
      existingScheme.realizedBenefit += val;
    }
    schemeMap.set(app.schemeId, existingScheme);

    // Group by category
    const existingCat = categoryMap.get(app.category) ?? { count: 0, totalBenefit: 0 };
    existingCat.count += 1;
    existingCat.totalBenefit += val;
    categoryMap.set(app.category, existingCat);
  }

  // Sort most beneficial schemes by total potential benefit descending
  const mostBeneficialSchemes = Array.from(schemeMap.values()).sort(
    (a, b) => b.totalPotentialBenefit - a.totalPotentialBenefit
  );

  // Sort top applied schemes by application volume descending
  const topAppliedSchemes = Array.from(schemeMap.values())
    .map((s) => ({
      schemeId: s.schemeId,
      schemeName: s.schemeName,
      category: s.category,
      count: s.applicationCount,
      totalBenefit: s.totalPotentialBenefit,
    }))
    .sort((a, b) => b.count - a.count);

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([cat, data]) => ({
      category: cat,
      applicationsCount: data.count,
      totalBenefitValue: data.totalBenefit,
    }))
    .sort((a, b) => b.totalBenefitValue - a.totalBenefitValue);

  return {
    totalApplications,
    totalUniqueUsers: uniqueUsers,
    totalPotentialBenefitValue,
    totalRealizedBenefitValue,
    byStatus,
    mostBeneficialSchemes,
    topAppliedSchemes,
    categoryBreakdown,
  };
}

function mapRowToApplication(r: Record<string, unknown>): SchemeApplication {
  const parseJson = (val: unknown): { en: string; hi: string; mr: string } => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return { en: val, hi: val, mr: val };
      }
    }
    if (typeof val === 'object' && val !== null) {
      return val as { en: string; hi: string; mr: string };
    }
    return { en: '', hi: '', mr: '' };
  };

  return {
    id: String(r.id),
    userId: String(r.user_id),
    userName: String(r.user_name),
    userEmail: String(r.user_email),
    userState: r.user_state ? String(r.user_state) : undefined,
    userOccupation: r.user_occupation ? String(r.user_occupation) : undefined,
    schemeId: String(r.scheme_id),
    schemeName: parseJson(r.scheme_name),
    category: String(r.category),
    benefitType: String(r.benefit_type),
    benefitHighlight: parseJson(r.benefit_highlight),
    estimatedAnnualBenefit: Number(r.estimated_annual_benefit) || 0,
    status: r.status as ApplicationStatus,
    appliedAt: String(r.applied_at),
    updatedAt: String(r.updated_at),
    applicationRefNumber: r.application_ref_number ? String(r.application_ref_number) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
  };
}

export class SupabaseApplicationStore implements ApplicationStore {
  private fallbackStore = new FileBackedApplicationStore();

  async createApplication(
    input: Omit<SchemeApplication, 'id' | 'appliedAt' | 'updatedAt' | 'status'> & {
      status?: ApplicationStatus;
    }
  ): Promise<SchemeApplication> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.createApplication(input);

    const now = new Date().toISOString();
    const id = `app_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const row = {
      id,
      user_id: input.userId,
      user_name: input.userName,
      user_email: input.userEmail,
      user_state: input.userState ?? null,
      user_occupation: input.userOccupation ?? null,
      scheme_id: input.schemeId,
      scheme_name: input.schemeName,
      category: input.category,
      benefit_type: input.benefitType,
      benefit_highlight: input.benefitHighlight,
      estimated_annual_benefit: Number(input.estimatedAnnualBenefit) || 0,
      status: input.status ?? 'applied',
      application_ref_number: input.applicationRefNumber ?? null,
      notes: input.notes ?? null,
      applied_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('scheme_applications')
        .insert(row)
        .select()
        .single();
      if (error) {
        return this.fallbackStore.createApplication(input);
      }
      return mapRowToApplication(data);
    } catch {
      return this.fallbackStore.createApplication(input);
    }
  }

  async listApplications(filter?: {
    userId?: string;
    schemeId?: string;
    status?: ApplicationStatus;
  }): Promise<SchemeApplication[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.listApplications(filter);

    try {
      let query = supabase
        .from('scheme_applications')
        .select('*')
        .order('applied_at', { ascending: false });
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.schemeId) query = query.eq('scheme_id', filter.schemeId);
      if (filter?.status) query = query.eq('status', filter.status);

      const { data, error } = await query;
      if (error || !data) {
        return this.fallbackStore.listApplications(filter);
      }
      return data.map(mapRowToApplication);
    } catch {
      return this.fallbackStore.listApplications(filter);
    }
  }

  async getApplicationById(id: string): Promise<SchemeApplication | undefined> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.getApplicationById(id);

    try {
      const { data, error } = await supabase
        .from('scheme_applications')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return this.fallbackStore.getApplicationById(id);
      return mapRowToApplication(data);
    } catch {
      return this.fallbackStore.getApplicationById(id);
    }
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<SchemeApplication | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return this.fallbackStore.updateStatus(id, status, notes);

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) updates.notes = notes;

    try {
      const { data, error } = await supabase
        .from('scheme_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return this.fallbackStore.updateStatus(id, status, notes);
      }
      return mapRowToApplication(data);
    } catch {
      return this.fallbackStore.updateStatus(id, status, notes);
    }
  }

  async getStats(): Promise<ApplicationStats> {
    const apps = await this.listApplications();
    return computeStatsFromApplications(apps);
  }

  async clear(): Promise<void> {
    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        await supabase.from('scheme_applications').delete().neq('id', '');
      } catch {
        // Fallback
      }
    }
    this.fallbackStore.clear();
  }
}

let applicationStoreSingleton: ApplicationStore | null = null;

export function getApplicationStore(): ApplicationStore {
  if (!applicationStoreSingleton) {
    if (isSupabaseConfigured()) {
      applicationStoreSingleton = new SupabaseApplicationStore();
    } else {
      applicationStoreSingleton = new FileBackedApplicationStore();
    }
  }
  return applicationStoreSingleton;
}
