import { describe, expect, it } from 'vitest';
import { evaluateAllSchemes, evaluateSchemeEligibility } from '@/lib/eligibility/engine';
import { getMissingWizardQuestions } from '@/lib/eligibility/wizard';
import { getSchemeRepository } from '@/lib/schemes/repository';

describe('Deterministic Eligibility Engine', () => {
  const repo = getSchemeRepository();

  it('loads at least 40 verified schemes from /data/schemes', () => {
    expect(repo.getAll().length).toBeGreaterThanOrEqual(40);
  });

  it('marks 45yo Nashik farmer with 2 acres eligible for PM-KISAN, Namo Shetkari, and Magel Tyala Shet Tale', () => {
    const profile = {
      age: 45,
      gender: 'male' as const,
      state: 'Maharashtra',
      district: 'Nashik',
      occupation: 'farmer' as const,
      ownsLand: true,
      landHoldingAcres: 2,
    };

    const pmKisan = repo.getById('pm-kisan')!;
    const namo = repo.getById('namo-shetkari-mahasanman-nidhi')!;
    const shetTale = repo.getById('maharashtra-magel-tyala-shet-tale')!;

    const r1 = evaluateSchemeEligibility(profile, pmKisan);
    const r2 = evaluateSchemeEligibility(profile, namo);
    const r3 = evaluateSchemeEligibility(profile, shetTale);

    expect(r1.status).toBe('eligible');
    expect(r2.status).toBe('eligible');
    expect(r3.status).toBe('eligible');
    expect(r1.localized.matchedReasons.mr.length).toBeGreaterThan(0);
    expect(r2.localized.matchedReasons.hi.length).toBeGreaterThan(0);
  });

  it('rejects non-Maharashtra resident for Maharashtra Ladki Bahin Yojana', () => {
    const ladki = repo.getById('maharashtra-ladki-bahin')!;
    const res = evaluateSchemeEligibility(
      { age: 30, gender: 'female', state: 'Gujarat', annualIncome: 150000 },
      ladki
    );
    expect(res.status).toBe('not_eligible');
    expect(res.failedRules.some((r) => r.field === 'state')).toBe(true);
  });

  it('rejects high-income applicant (> ₹2.5L) for Ladki Bahin Yojana', () => {
    const ladki = repo.getById('maharashtra-ladki-bahin')!;
    const res = evaluateSchemeEligibility(
      { age: 30, gender: 'female', state: 'Maharashtra', annualIncome: 350000 },
      ladki
    );
    expect(res.status).toBe('not_eligible');
    expect(res.failedRules.some((r) => r.field === 'annualIncome')).toBe(true);
  });

  it('approves any 70+ senior for Ayushman Vaya Vandana regardless of income', () => {
    const avv = repo.getById('ayushman-vaya-vandana')!;
    const res = evaluateSchemeEligibility({ age: 74, annualIncome: 2500000 }, avv);
    expect(res.status).toBe('eligible');
  });

  it('enforces disability percentage threshold on ADIP (40%) and IGNDPS (80%)', () => {
    const adip = repo.getById('adip-assistive-devices')!;
    const igndps = repo.getById('igndps-disability-pension')!;

    expect(
      evaluateSchemeEligibility(
        { age: 30, hasDisability: true, disabilityPercent: 50, annualIncome: 150000, isBpl: true },
        adip
      ).status
    ).toBe('eligible');

    expect(
      evaluateSchemeEligibility(
        { age: 30, hasDisability: true, disabilityPercent: 50, annualIncome: 150000, isBpl: true },
        igndps
      ).status
    ).toBe('not_eligible');
  });

  it('excludes income-tax payers from PM-KISAN and Atal Pension Yojana', () => {
    const pmKisan = repo.getById('pm-kisan')!;
    const apy = repo.getById('atal-pension-yojana')!;
    expect(
      evaluateSchemeEligibility(
        { age: 35, occupation: 'farmer', ownsLand: true, isIncomeTaxPayer: true },
        pmKisan
      ).status
    ).toBe('not_eligible');
    expect(
      evaluateSchemeEligibility({ age: 30, isIncomeTaxPayer: true }, apy).status
    ).toBe('not_eligible');
  });

  it('wizard asks only missing relevant questions and skips land question for students', () => {
    const qs = getMissingWizardQuestions({
      state: 'Maharashtra',
      age: 20,
      occupation: 'student',
    });
    const fields = qs.map((q) => q.field);
    expect(fields).not.toContain('state');
    expect(fields).not.toContain('age');
    expect(fields).not.toContain('occupation');
    expect(fields).not.toContain('ownsLand');
    expect(fields).toContain('educationLevel');
  });

  it('evaluateAllSchemes ranks eligible schemes before not_eligible schemes', () => {
    const all = evaluateAllSchemes(
      { age: 45, state: 'Maharashtra', occupation: 'farmer', ownsLand: true, landHoldingAcres: 2 },
      repo.getAll()
    );
    expect(all[0]?.evaluation.status).toBe('eligible');
  });
});
