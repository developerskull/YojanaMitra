import { z } from 'zod';

export const SupportedLangSchema = z.enum(['en', 'hi', 'mr']);
export type SupportedLang = z.infer<typeof SupportedLangSchema>;

export const LocalizedTextSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  hi: z.string().min(1, 'Hindi text is required'),
  mr: z.string().min(1, 'Marathi text is required'),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const LocalizedStringArraySchema = z.object({
  en: z.array(z.string().min(1)).min(1),
  hi: z.array(z.string().min(1)).min(1),
  mr: z.array(z.string().min(1)).min(1),
});
export type LocalizedStringArray = z.infer<typeof LocalizedStringArraySchema>;

export const SchemeCategorySchema = z.enum([
  'farmer',
  'student',
  'woman',
  'senior',
  'worker',
  'disabled',
  'health',
  'housing',
]);
export type SchemeCategory = z.infer<typeof SchemeCategorySchema>;

export const BenefitTypeSchema = z.enum([
  'cash',
  'insurance',
  'loan',
  'subsidy',
  'scholarship',
  'pension',
  'housing',
  'skill',
  'equipment',
]);
export type BenefitType = z.infer<typeof BenefitTypeSchema>;

export const GenderSchema = z.enum(['male', 'female', 'other']);
export type Gender = z.infer<typeof GenderSchema>;

export const CasteCategorySchema = z.enum(['general', 'obc', 'sc', 'st', 'ews', 'vjnt', 'sbc']);
export type CasteCategory = z.infer<typeof CasteCategorySchema>;

export const ResidenceTypeSchema = z.enum(['rural', 'urban']);
export type ResidenceType = z.infer<typeof ResidenceTypeSchema>;

export const OccupationSchema = z.enum([
  'farmer',
  'student',
  'unorganized_worker',
  'artisan',
  'street_vendor',
  'entrepreneur',
  'salaried',
  'homemaker',
  'unemployed',
  'retired',
]);
export type Occupation = z.infer<typeof OccupationSchema>;

export const EducationLevelSchema = z.enum([
  'none',
  'primary',
  'secondary',
  'higher_secondary',
  'undergraduate',
  'postgraduate',
  'diploma_iti',
]);
export type EducationLevel = z.infer<typeof EducationLevelSchema>;

export const MaritalStatusSchema = z.enum(['single', 'married', 'widowed', 'divorced']);
export type MaritalStatus = z.infer<typeof MaritalStatusSchema>;

export const EligibilityRulesSchema = z.object({
  minAge: z.number().int().min(0).max(120).optional(),
  maxAge: z.number().int().min(0).max(120).optional(),
  gender: z.array(GenderSchema).optional(),
  maxAnnualIncome: z.number().nonnegative().optional(),
  minLandHoldingAcres: z.number().nonnegative().optional(),
  maxLandHoldingAcres: z.number().nonnegative().optional(),
  requiresLandOwnership: z.boolean().optional(),
  occupations: z.array(OccupationSchema).optional(),
  casteCategories: z.array(CasteCategorySchema).optional(),
  disabilityRequired: z.boolean().optional(),
  minDisabilityPercent: z.number().int().min(1).max(100).optional(),
  states: z.array(z.string().min(1)).optional(), // Empty/omitted means all India
  residenceType: z.array(ResidenceTypeSchema).optional(),
  educationLevels: z.array(EducationLevelSchema).optional(),
  bplRequired: z.boolean().optional(),
  maritalStatus: z.array(MaritalStatusSchema).optional(),
  excludeIncomeTaxPayers: z.boolean().optional(),
  excludeGovtEmployees: z.boolean().optional(),
  customConditions: z.array(LocalizedTextSchema).optional(),
});
export type EligibilityRules = z.infer<typeof EligibilityRulesSchema>;

export const DocumentRequirementSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  mandatory: z.boolean().default(true),
  notes: LocalizedTextSchema.optional(),
});
export type DocumentRequirement = z.infer<typeof DocumentRequirementSchema>;

export const SchemeSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Scheme ID must be lowercase kebab-case'),
  name: LocalizedTextSchema,
  category: SchemeCategorySchema,
  secondaryCategories: z.array(SchemeCategorySchema).optional().default([]),
  benefitType: BenefitTypeSchema,
  benefitHighlight: LocalizedTextSchema,
  level: z.enum(['central', 'state']),
  state: z.string().min(1), // "All India" for central schemes, e.g., "Maharashtra" for state
  ministry: z.string().min(1),
  summary: LocalizedTextSchema,
  benefits: LocalizedTextSchema,
  eligibility: EligibilityRulesSchema,
  documents: z.array(DocumentRequirementSchema).min(1),
  applicationSteps: LocalizedStringArraySchema,
  officialUrl: z.string().url(),
  helpline: z.string().min(1),
  deadlines: LocalizedTextSchema,
  lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'lastVerified must be YYYY-MM-DD'),
  sourceUrls: z.array(z.string().url()).min(1),
  needsVerification: z.boolean().default(false),
  tags: z.array(z.string().min(1)).optional().default([]),
});
export type Scheme = z.infer<typeof SchemeSchema>;

export const UserProfileSchema = z.object({
  age: z.number().int().min(0).max(120).optional(),
  gender: GenderSchema.optional(),
  state: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  residenceType: ResidenceTypeSchema.optional(),
  annualIncome: z.number().nonnegative().optional(),
  occupation: OccupationSchema.optional(),
  landHoldingAcres: z.number().nonnegative().optional(),
  ownsLand: z.boolean().optional(),
  casteCategory: CasteCategorySchema.optional(),
  hasDisability: z.boolean().optional(),
  disabilityPercent: z.number().int().min(0).max(100).optional(),
  educationLevel: EducationLevelSchema.optional(),
  isBpl: z.boolean().optional(),
  maritalStatus: MaritalStatusSchema.optional(),
  isIncomeTaxPayer: z.boolean().optional(),
  isGovtEmployee: z.boolean().optional(),
  hasGirlChild: z.boolean().optional(),
  isPregnantOrLactating: z.boolean().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
