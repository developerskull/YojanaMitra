import type { LocalizedText, Scheme, SupportedLang, UserProfile } from '@/lib/schemes/schema';

export type EligibilityStatus = 'eligible' | 'likely' | 'not_eligible' | 'missing_info';

export type ProfileFieldKey =
  | 'age'
  | 'gender'
  | 'state'
  | 'annualIncome'
  | 'occupation'
  | 'ownsLand'
  | 'landHoldingAcres'
  | 'casteCategory'
  | 'hasDisability'
  | 'disabilityPercent'
  | 'residenceType'
  | 'educationLevel'
  | 'isBpl'
  | 'maritalStatus'
  | 'isIncomeTaxPayer'
  | 'isGovtEmployee';

export interface RuleResult {
  field: ProfileFieldKey;
  passed: boolean;
  reason: LocalizedText;
}

export interface EligibilityEvaluation {
  schemeId: string;
  status: EligibilityStatus;
  score: number; // 0..100 deterministic confidence/match score for ranking
  matchedRules: RuleResult[];
  failedRules: RuleResult[];
  missingFields: ProfileFieldKey[];
  /** Convenience localized strings for direct UI / prompt use */
  localized: {
    matchedReasons: Record<SupportedLang, string[]>;
    failedReasons: Record<SupportedLang, string[]>;
  };
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const OCCUPATION_LABELS: Record<string, LocalizedText> = {
  farmer: { en: 'Farmer', hi: 'किसान', mr: 'शेतकरी' },
  student: { en: 'Student', hi: 'छात्र', mr: 'विद्यार्थी' },
  unorganized_worker: { en: 'Unorganized worker', hi: 'असंगठित श्रमिक', mr: 'असंघटित कामगार' },
  artisan: { en: 'Traditional artisan', hi: 'पारंपरिक कारीगर', mr: 'पारंपरिक कारागीर' },
  street_vendor: { en: 'Street vendor', hi: 'स्ट्रीट वेंडर / फेरीवाला', mr: 'फेरीवाला / पथविक्रेता' },
  entrepreneur: { en: 'Entrepreneur / Business', hi: 'उद्यमी / व्यवसायी', mr: 'उद्योजक / व्यावसायिक' },
  salaried: { en: 'Salaried', hi: 'वेतनभोगी', mr: 'पगारदार' },
  homemaker: { en: 'Homemaker', hi: 'गृहिणी', mr: 'गृहिणी' },
  unemployed: { en: 'Unemployed / Job seeker', hi: 'बेरोजगार', mr: 'बेरोजगार' },
  retired: { en: 'Retired', hi: 'सेवानिवृत्त', mr: 'निवृत्त' },
};

const CASTE_LABELS: Record<string, LocalizedText> = {
  general: { en: 'General / Open', hi: 'सामान्य वर्ग', mr: 'खुला प्रवर्ग' },
  obc: { en: 'OBC', hi: 'ओबीसी (OBC)', mr: 'इतर मागास वर्ग (OBC)' },
  sc: { en: 'SC', hi: 'अनुसूचित जाति (SC)', mr: 'अनुसूचित जाती (SC)' },
  st: { en: 'ST', hi: 'अनुसूचित जनजाति (ST)', mr: 'अनुसूचित जमाती (ST)' },
  ews: { en: 'EWS', hi: 'ईडब्ल्यूएस (EWS)', mr: 'आर्थिक दुर्बल घटक (EWS)' },
  vjnt: { en: 'VJNT / DNT', hi: 'विमुक्त जाति / घुमंतू (VJNT)', mr: 'भटक्या-विमुक्त (VJNT)' },
  sbc: { en: 'SBC', hi: 'विशेष पिछड़ा वर्ग (SBC)', mr: 'विशेष मागास प्रवर्ग (SBC)' },
};

const GENDER_LABELS: Record<string, LocalizedText> = {
  female: { en: 'Woman / Female', hi: 'महिला', mr: 'महिला' },
  male: { en: 'Man / Male', hi: 'पुरुष', mr: 'पुरुष' },
  other: { en: 'Other', hi: 'अन्य', mr: 'इतर' },
};

/**
 * Pure deterministic eligibility rule evaluator. Zero LLM involvement.
 * Evaluates every structured rule on a scheme against the citizen's profile
 * and produces auditable matched rules, failed rules, and missing fields in EN/HI/MR.
 */
export function evaluateSchemeEligibility(
  profile: UserProfile,
  scheme: Scheme
): EligibilityEvaluation {
  const rules = scheme.eligibility;
  const matched: RuleResult[] = [];
  const failed: RuleResult[] = [];
  const missingSet = new Set<ProfileFieldKey>();

  const pushMatched = (field: ProfileFieldKey, reason: LocalizedText) =>
    matched.push({ field, passed: true, reason });
  const pushFailed = (field: ProfileFieldKey, reason: LocalizedText) =>
    failed.push({ field, passed: false, reason });

  // 1. State residency
  if (rules.states && rules.states.length > 0) {
    if (!profile.state) {
      missingSet.add('state');
    } else {
      const ok = rules.states.some((s) => s.toLowerCase() === profile.state!.toLowerCase());
      const stateList = rules.states.join(', ');
      if (ok) {
        pushMatched('state', {
          en: `Resident of ${profile.state} (matches ${stateList} requirement)`,
          hi: `${profile.state} के निवासी हैं (${stateList} योजना के लिए पात्र)`,
          mr: `${profile.state} चे रहिवासी आहात (${stateList} योजनेसाठी पात्र)`,
        });
      } else {
        pushFailed('state', {
          en: `Scheme is only for ${stateList} residents (your state: ${profile.state})`,
          hi: `यह योजना केवल ${stateList} के निवासियों के लिए है (आपका राज्य: ${profile.state})`,
          mr: `ही योजना फक्त ${stateList} च्या रहिवाशांसाठी आहे (तुमचे राज्य: ${profile.state})`,
        });
      }
    }
  } else if (profile.state) {
    pushMatched('state', {
      en: `Central scheme available across all states including ${profile.state}`,
      hi: `केंद्रीय योजना — ${profile.state} सहित पूरे भारत में उपलब्ध`,
      mr: `केंद्रीय योजना — ${profile.state} सह संपूर्ण भारतात लागू`,
    });
  }

  // 2. Age range
  if (rules.minAge !== undefined || rules.maxAge !== undefined) {
    if (profile.age === undefined) {
      missingSet.add('age');
    } else {
      const tooYoung = rules.minAge !== undefined && profile.age < rules.minAge;
      const tooOld = rules.maxAge !== undefined && profile.age > rules.maxAge;
      const rangeStr =
        rules.minAge !== undefined && rules.maxAge !== undefined
          ? `${rules.minAge}–${rules.maxAge}`
          : rules.minAge !== undefined
            ? `${rules.minAge}+`
            : `≤ ${rules.maxAge}`;

      if (!tooYoung && !tooOld) {
        pushMatched('age', {
          en: `Age ${profile.age} is within the required ${rangeStr} years range`,
          hi: `आयु ${profile.age} वर्ष आवश्यक सीमा (${rangeStr} वर्ष) के भीतर है`,
          mr: `वय ${profile.age} वर्षे आवश्यक मर्यादेत (${rangeStr} वर्षे) आहे`,
        });
      } else {
        pushFailed('age', {
          en: `Age ${profile.age} is outside the required ${rangeStr} years range`,
          hi: `आयु ${profile.age} वर्ष आवश्यक सीमा (${rangeStr} वर्ष) से बाहर है`,
          mr: `वय ${profile.age} वर्षे आवश्यक मर्यादेबाहेर (${rangeStr} वर्षे) आहे`,
        });
      }
    }
  }

  // 3. Gender
  if (rules.gender && rules.gender.length > 0) {
    if (!profile.gender) {
      missingSet.add('gender');
    } else if (rules.gender.includes(profile.gender)) {
      const label = GENDER_LABELS[profile.gender]!;
      pushMatched('gender', {
        en: `Matches gender requirement (${label.en})`,
        hi: `लिंग मानदंड पूरा होता है (${label.hi})`,
        mr: `लिंग पात्रता जुळते (${label.mr})`,
      });
    } else {
      const reqEn = rules.gender.map((g) => GENDER_LABELS[g]?.en ?? g).join('/');
      const reqHi = rules.gender.map((g) => GENDER_LABELS[g]?.hi ?? g).join('/');
      const reqMr = rules.gender.map((g) => GENDER_LABELS[g]?.mr ?? g).join('/');
      pushFailed('gender', {
        en: `This scheme is specifically for ${reqEn} applicants`,
        hi: `यह योजना विशेष रूप से ${reqHi} आवेदकों के लिए है`,
        mr: `ही योजना विशेषतः ${reqMr} अर्जदारांसाठी आहे`,
      });
    }
  }

  // 4. Occupation
  if (rules.occupations && rules.occupations.length > 0) {
    if (!profile.occupation) {
      missingSet.add('occupation');
    } else if (rules.occupations.includes(profile.occupation)) {
      const label = OCCUPATION_LABELS[profile.occupation]!;
      pushMatched('occupation', {
        en: `Matches occupation: ${label.en}`,
        hi: `व्यवसाय मेल खाता है: ${label.hi}`,
        mr: `व्यवसाय जुळतो: ${label.mr}`,
      });
    } else {
      const reqEn = rules.occupations.map((o) => OCCUPATION_LABELS[o]?.en ?? o).join(', ');
      const reqHi = rules.occupations.map((o) => OCCUPATION_LABELS[o]?.hi ?? o).join(', ');
      const reqMr = rules.occupations.map((o) => OCCUPATION_LABELS[o]?.mr ?? o).join(', ');
      pushFailed('occupation', {
        en: `Scheme targets: ${reqEn}`,
        hi: `यह योजना इनके लिए है: ${reqHi}`,
        mr: `ही योजना यांच्यासाठी आहे: ${reqMr}`,
      });
    }
  }

  // 5. Land ownership & holding
  if (rules.requiresLandOwnership) {
    const hasLand =
      profile.ownsLand === true ||
      (profile.landHoldingAcres !== undefined && profile.landHoldingAcres > 0);
    const explicitlyNoLand = profile.ownsLand === false || profile.landHoldingAcres === 0;

    if (hasLand) {
      const acresText =
        profile.landHoldingAcres !== undefined ? ` (${profile.landHoldingAcres} acres)` : '';
      pushMatched('ownsLand', {
        en: `Holds agricultural land${acresText}`,
        hi: `कृषि भूमि धारक हैं${acresText ? ` (${profile.landHoldingAcres} एकड़)` : ''}`,
        mr: `शेतीयोग्य जमीन मालकीची आहे${acresText ? ` (${profile.landHoldingAcres} एकर)` : ''}`,
      });
    } else if (explicitlyNoLand) {
      pushFailed('ownsLand', {
        en: 'Requires cultivable land ownership in state land records',
        hi: 'राज्य भूमि अभिलेख में खेती योग्य भूमि का स्वामित्व आवश्यक है',
        mr: 'राज्य जमीन अभिलेखात शेतीयोग्य जमिनीची मालकी आवश्यक आहे',
      });
    } else {
      missingSet.add('ownsLand');
    }
  }

  if (rules.minLandHoldingAcres !== undefined || rules.maxLandHoldingAcres !== undefined) {
    if (profile.landHoldingAcres === undefined) {
      missingSet.add('landHoldingAcres');
    } else {
      const tooSmall =
        rules.minLandHoldingAcres !== undefined &&
        profile.landHoldingAcres < rules.minLandHoldingAcres;
      const tooLarge =
        rules.maxLandHoldingAcres !== undefined &&
        profile.landHoldingAcres > rules.maxLandHoldingAcres;

      if (!tooSmall && !tooLarge) {
        pushMatched('landHoldingAcres', {
          en: `Land holding (${profile.landHoldingAcres} acres) satisfies land size criteria`,
          hi: `भूमि क्षेत्र (${profile.landHoldingAcres} एकड़) पात्रता सीमा के भीतर है`,
          mr: `जमीन क्षेत्र (${profile.landHoldingAcres} एकर) पात्रता मर्यादेत आहे`,
        });
      } else {
        const minStr = rules.minLandHoldingAcres !== undefined ? `≥ ${rules.minLandHoldingAcres}` : '';
        const maxStr = rules.maxLandHoldingAcres !== undefined ? `≤ ${rules.maxLandHoldingAcres}` : '';
        const bound = [minStr, maxStr].filter(Boolean).join(' & ');
        pushFailed('landHoldingAcres', {
          en: `Land holding (${profile.landHoldingAcres} acres) does not meet required ${bound} acres`,
          hi: `भूमि क्षेत्र (${profile.landHoldingAcres} एकड़) आवश्यक सीमा (${bound} एकड़) में नहीं है`,
          mr: `जमीन क्षेत्र (${profile.landHoldingAcres} एकर) आवश्यक मर्यादेत (${bound} एकर) नाही`,
        });
      }
    }
  }

  // 6. Annual Income ceiling
  if (rules.maxAnnualIncome !== undefined) {
    if (profile.annualIncome === undefined) {
      missingSet.add('annualIncome');
    } else if (profile.annualIncome <= rules.maxAnnualIncome) {
      pushMatched('annualIncome', {
        en: `Annual income (${fmtINR(profile.annualIncome)}) is within the ${fmtINR(rules.maxAnnualIncome)} limit`,
        hi: `वार्षिक आय (${fmtINR(profile.annualIncome)}) निर्धारित सीमा (${fmtINR(rules.maxAnnualIncome)}) के भीतर है`,
        mr: `वार्षिक उत्पन्न (${fmtINR(profile.annualIncome)}) आवश्यक मर्यादेत (${fmtINR(rules.maxAnnualIncome)}) आहे`,
      });
    } else {
      pushFailed('annualIncome', {
        en: `Annual income (${fmtINR(profile.annualIncome)}) exceeds the ${fmtINR(rules.maxAnnualIncome)} ceiling`,
        hi: `वार्षिक आय (${fmtINR(profile.annualIncome)}) निर्धारित सीमा (${fmtINR(rules.maxAnnualIncome)}) से अधिक है`,
        mr: `वार्षिक उत्पन्न (${fmtINR(profile.annualIncome)}) कमाल मर्यादेपेक्षा (${fmtINR(rules.maxAnnualIncome)}) जास्त आहे`,
      });
    }
  }

  // 7. Caste / Social category
  if (rules.casteCategories && rules.casteCategories.length > 0) {
    if (!profile.casteCategory) {
      missingSet.add('casteCategory');
    } else if (rules.casteCategories.includes(profile.casteCategory)) {
      const label = CASTE_LABELS[profile.casteCategory]!;
      pushMatched('casteCategory', {
        en: `Matches eligible category (${label.en})`,
        hi: `पात्र श्रेणी से मेल खाता है (${label.hi})`,
        mr: `पात्र प्रवर्ग जुळतो (${label.mr})`,
      });
    } else {
      const reqEn = rules.casteCategories.map((c) => CASTE_LABELS[c]?.en ?? c).join(', ');
      const reqHi = rules.casteCategories.map((c) => CASTE_LABELS[c]?.hi ?? c).join(', ');
      const reqMr = rules.casteCategories.map((c) => CASTE_LABELS[c]?.mr ?? c).join(', ');
      pushFailed('casteCategory', {
        en: `Scheme is reserved for ${reqEn} category applicants`,
        hi: `यह योजना ${reqHi} श्रेणी के आवेदकों के लिए है`,
        mr: `ही योजना ${reqMr} प्रवर्गातील अर्जदारांसाठी आहे`,
      });
    }
  }

  // 8. Disability
  if (rules.disabilityRequired) {
    if (profile.hasDisability === false) {
      pushFailed('hasDisability', {
        en: 'Scheme is exclusively for Persons with Disabilities (Divyangjan)',
        hi: 'यह योजना केवल दिव्यांगजनों के लिए है',
        mr: 'ही योजना केवळ दिव्यांग नागरिकांसाठी आहे',
      });
    } else if (profile.hasDisability === true) {
      if (rules.minDisabilityPercent !== undefined) {
        if (profile.disabilityPercent === undefined) {
          pushMatched('hasDisability', {
            en: 'Applicant has a disability (verify exact disability percentage on UDID card)',
            hi: 'आवेदक दिव्यांग हैं (UDID कार्ड पर सटीक दिव्यांगता प्रतिशत जांचें)',
            mr: 'अर्जदार दिव्यांग आहेत (UDID कार्डवरील दिव्यांगत्व टक्केवारी तपासा)',
          });
          missingSet.add('disabilityPercent');
        } else if (profile.disabilityPercent >= rules.minDisabilityPercent) {
          pushMatched('disabilityPercent', {
            en: `Disability (${profile.disabilityPercent}%) meets minimum ${rules.minDisabilityPercent}% threshold`,
            hi: `दिव्यांगता (${profile.disabilityPercent}%) न्यूनतम ${rules.minDisabilityPercent}% मानदंड पूरा करती है`,
            mr: `दिव्यांगत्व (${profile.disabilityPercent}%) किमान ${rules.minDisabilityPercent}% अटीत बसते`,
          });
        } else {
          pushFailed('disabilityPercent', {
            en: `Requires at least ${rules.minDisabilityPercent}% certified disability (yours: ${profile.disabilityPercent}%)`,
            hi: `न्यूनतम ${rules.minDisabilityPercent}% प्रमाणित दिव्यांगता आवश्यक है (आपकी: ${profile.disabilityPercent}%)`,
            mr: `किमान ${rules.minDisabilityPercent}% प्रमाणित दिव्यांगत्व आवश्यक आहे (तुमचे: ${profile.disabilityPercent}%)`,
          });
        }
      } else {
        pushMatched('hasDisability', {
          en: 'Eligible as a Person with Disability (Divyangjan)',
          hi: 'दिव्यांगजन के रूप में पात्र',
          mr: 'दिव्यांग नागरिक म्हणून पात्र',
        });
      }
    } else {
      missingSet.add('hasDisability');
    }
  }

  // 9. Residence type (rural / urban)
  if (rules.residenceType && rules.residenceType.length > 0) {
    if (!profile.residenceType) {
      missingSet.add('residenceType');
    } else if (rules.residenceType.includes(profile.residenceType)) {
      pushMatched('residenceType', {
        en: `Matches ${profile.residenceType} residence requirement`,
        hi: `${profile.residenceType === 'rural' ? 'ग्रामीण' : 'शहरी'} निवास मानदंड पूरा होता है`,
        mr: `${profile.residenceType === 'rural' ? 'ग्रामीण' : 'शहरी'} निवास पात्रता जुळते`,
      });
    } else {
      const target = rules.residenceType[0] === 'rural';
      pushFailed('residenceType', {
        en: `Scheme is only for ${target ? 'rural' : 'urban'} households`,
        hi: `यह योजना केवल ${target ? 'ग्रामीण' : 'शहरी'} परिवारों के लिए है`,
        mr: `ही योजना फक्त ${target ? 'ग्रामीण' : 'शहरी'} कुटुंबांसाठी आहे`,
      });
    }
  }

  // 10. Education level
  if (rules.educationLevels && rules.educationLevels.length > 0) {
    if (!profile.educationLevel) {
      missingSet.add('educationLevel');
    } else if (rules.educationLevels.includes(profile.educationLevel)) {
      pushMatched('educationLevel', {
        en: `Education level (${profile.educationLevel.replace('_', ' ')}) qualifies`,
        hi: `शैक्षणिक स्तर पात्रता मानदंड से मेल खाता है`,
        mr: `शैक्षणिक स्तर पात्रता अटीत बसतो`,
      });
    } else {
      pushFailed('educationLevel', {
        en: `Requires education level in: ${rules.educationLevels.join(', ').replaceAll('_', ' ')}`,
        hi: `इस योजना के लिए निर्धारित शैक्षणिक स्तर आवश्यक है`,
        mr: `या योजनेसाठी विशिष्ट शैक्षणिक स्तर आवश्यक आहे`,
      });
    }
  }

  // 11. BPL requirement
  if (rules.bplRequired) {
    if (profile.isBpl === true) {
      pushMatched('isBpl', {
        en: 'Belongs to BPL / priority low-income household',
        hi: 'बीपीएल / प्राथमिकता गरीब परिवार से संबंधित हैं',
        mr: 'दारिद्र्यरेषेखालील (BPL) / प्राधान्य कुटुंबातील आहात',
      });
    } else if (profile.isBpl === false) {
      pushFailed('isBpl', {
        en: 'Requires BPL / SECC priority household eligibility',
        hi: 'बीपीएल / एसईसीसी प्राथमिकता सूची में होना आवश्यक है',
        mr: 'दारिद्र्यरेषेखालील (BPL) / SECC यादीत नाव असणे आवश्यक आहे',
      });
    } else {
      missingSet.add('isBpl');
    }
  }

  // 12. Marital status
  if (rules.maritalStatus && rules.maritalStatus.length > 0) {
    if (!profile.maritalStatus) {
      missingSet.add('maritalStatus');
    } else if (rules.maritalStatus.includes(profile.maritalStatus)) {
      pushMatched('maritalStatus', {
        en: `Matches marital status requirement (${profile.maritalStatus})`,
        hi: `वैवाहिक स्थिति मानदंड पूरा होता है`,
        mr: `वैवाहिक स्थिती पात्रता जुळते`,
      });
    } else {
      pushFailed('maritalStatus', {
        en: `Scheme is restricted to ${rules.maritalStatus.join('/')} applicants`,
        hi: `यह योजना केवल निर्धारित वैवाहिक स्थिति वाले आवेदकों के लिए है`,
        mr: `ही योजना फक्त ठराविक वैवाहिक स्थितीतील अर्जदारांसाठी आहे`,
      });
    }
  }

  // 13. Exclusions (Income tax payer & Govt employees)
  if (rules.excludeIncomeTaxPayers && profile.isIncomeTaxPayer === true) {
    pushFailed('isIncomeTaxPayer', {
      en: 'Income tax payers are excluded from this scheme',
      hi: 'आयकर दाता इस योजना के लिए अपात्र हैं',
      mr: 'आयकर भरणारे नागरिक या योजनेसाठी अपात्र आहेत',
    });
  }
  if (rules.excludeGovtEmployees && profile.isGovtEmployee === true) {
    pushFailed('isGovtEmployee', {
      en: 'Regular government employees are excluded from this scheme',
      hi: 'नियमित सरकारी कर्मचारी इस योजना के लिए अपात्र हैं',
      mr: 'नियमित शासकीय कर्मचारी या योजनेसाठी अपात्र आहेत',
    });
  }

  const missingFields = Array.from(missingSet);

  // Determine final deterministic status & score
  let status: EligibilityStatus;
  let score: number;

  if (failed.length > 0) {
    status = 'not_eligible';
    score = Math.max(5, 25 - failed.length * 10);
  } else if (missingFields.length === 0) {
    status = matched.length > 0 ? 'eligible' : 'likely';
    score = matched.length > 0 ? Math.min(100, 82 + matched.length * 4) : 72;
  } else if (matched.length >= 2 && missingFields.length <= 2) {
    status = 'likely';
    score = Math.min(80, 58 + matched.length * 6 - missingFields.length * 5);
  } else if (matched.length >= 1 && missingFields.length === 1) {
    status = 'likely';
    score = 62;
  } else {
    status = 'missing_info';
    score = Math.max(30, 50 + matched.length * 5 - missingFields.length * 6);
  }

  return {
    schemeId: scheme.id,
    status,
    score,
    matchedRules: matched,
    failedRules: failed,
    missingFields,
    localized: {
      matchedReasons: {
        en: matched.map((r) => r.reason.en),
        hi: matched.map((r) => r.reason.hi),
        mr: matched.map((r) => r.reason.mr),
      },
      failedReasons: {
        en: failed.map((r) => r.reason.en),
        hi: failed.map((r) => r.reason.hi),
        mr: failed.map((r) => r.reason.mr),
      },
    },
  };
}

export function evaluateAllSchemes(
  profile: UserProfile,
  schemes: Scheme[]
): Array<{ scheme: Scheme; evaluation: EligibilityEvaluation }> {
  const rankWeight: Record<EligibilityStatus, number> = {
    eligible: 4,
    likely: 3,
    missing_info: 2,
    not_eligible: 1,
  };

  return schemes
    .map((scheme) => ({
      scheme,
      evaluation: evaluateSchemeEligibility(profile, scheme),
    }))
    .sort((a, b) => {
      const rw = rankWeight[b.evaluation.status] - rankWeight[a.evaluation.status];
      if (rw !== 0) return rw;
      return b.evaluation.score - a.evaluation.score;
    });
}
