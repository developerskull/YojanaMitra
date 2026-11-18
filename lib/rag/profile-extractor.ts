import { normalizeDevanagariDigits } from '@/lib/i18n/detect';
import { getLLMProvider } from '@/lib/llm/adapter';
import { UserProfileSchema, type UserProfile } from '@/lib/schemes/schema';

const MAHARASHTRA_DISTRICTS: Record<string, string> = {
  nashik: 'Nashik',
  nasik: 'Nashik',
  नाशिक: 'Nashik',
  नासिक: 'Nashik',
  pune: 'Pune',
  पुणे: 'Pune',
  mumbai: 'Mumbai',
  मुंबई: 'Mumbai',
  nagpur: 'Nagpur',
  नागपूर: 'Nagpur',
  नागपुर: 'Nagpur',
  thane: 'Thane',
  ठाणे: 'Thane',
  satara: 'Satara',
  सातारा: 'Satara',
  kolhapur: 'Kolhapur',
  कोल्हापूर: 'Kolhapur',
  solapur: 'Solapur',
  सोलापूर: 'Solapur',
  aurangabad: 'Chhatrapati Sambhajinagar',
  sambhajinagar: 'Chhatrapati Sambhajinagar',
  संभाजीनगर: 'Chhatrapati Sambhajinagar',
  jalgaon: 'Jalgaon',
  जळगाव: 'Jalgaon',
  ahmednagar: 'Ahilyanagar',
  ahilyanagar: 'Ahilyanagar',
  अहमदनगर: 'Ahilyanagar',
  amravati: 'Amravati',
  अमरावती: 'Amravati',
  latur: 'Latur',
  लातूर: 'Latur',
  nanded: 'Nanded',
  नांदेड: 'Nanded',
  sangli: 'Sangli',
  सांगली: 'Sangli',
  ratnagiri: 'Ratnagiri',
  रत्नागिरी: 'Ratnagiri',
  dhule: 'Dhule',
  धुळे: 'Dhule',
  akola: 'Akola',
  अकोला: 'Akola',
  yavatmal: 'Yavatmal',
  यवतमाळ: 'Yavatmal',
  beed: 'Beed',
  बीड: 'Beed',
  wardha: 'Wardha',
  वर्धा: 'Wardha',
  chandrapur: 'Chandrapur',
  चंद्रपूर: 'Chandrapur',
  raigad: 'Raigad',
  रायगड: 'Raigad',
};

const OTHER_STATES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(maharashtra|महाराष्ट्र)\b/i, name: 'Maharashtra' },
  { pattern: /\b(uttar pradesh|up|उत्तर प्रदेश)\b/i, name: 'Uttar Pradesh' },
  { pattern: /\b(madhya pradesh|mp|मध्य प्रदेश)\b/i, name: 'Madhya Pradesh' },
  { pattern: /\b(rajasthan|राजस्थान)\b/i, name: 'Rajasthan' },
  { pattern: /\b(gujarat|गुजरात)\b/i, name: 'Gujarat' },
  { pattern: /\b(karnataka|कर्नाटक|bengaluru|bangalore)\b/i, name: 'Karnataka' },
  { pattern: /\b(bihar|बिहार|patna)\b/i, name: 'Bihar' },
  { pattern: /\b(delhi|दिल्ली)\b/i, name: 'Delhi' },
  { pattern: /\b(tamil nadu|तमिलनाडु|chennai)\b/i, name: 'Tamil Nadu' },
  { pattern: /\b(west bengal|कोलकाता|kolkata)\b/i, name: 'West Bengal' },
  { pattern: /\b(punjab|पंजाब)\b/i, name: 'Punjab' },
  { pattern: /\b(haryana|हरियाणा)\b/i, name: 'Haryana' },
  { pattern: /\b(telangana|hyderabad|तेलंगाना)\b/i, name: 'Telangana' },
  { pattern: /\b(andhra pradesh|आंध्र प्रदेश)\b/i, name: 'Andhra Pradesh' },
  { pattern: /\b(kerala|केरल)\b/i, name: 'Kerala' },
  { pattern: /\b(odisha|ओडिशा)\b/i, name: 'Odisha' },
  { pattern: /\b(assam|असम)\b/i, name: 'Assam' },
  { pattern: /\b(jharkhand|झारखंड)\b/i, name: 'Jharkhand' },
  { pattern: /\b(chhattisgarh|छत्तीसगढ़)\b/i, name: 'Chhattisgarh' },
  { pattern: /\b(goa|गोवा)\b/i, name: 'Goa' },
];

/**
 * Deterministic multilingual NLP profile extractor.
 * Works offline with zero latency and never hallucinates attributes.
 */
export function extractProfileDeterministic(rawText: string): UserProfile {
  const normalized = normalizeDevanagariDigits(rawText);
  const lower = normalized.toLowerCase();
  const profile: UserProfile = {};

  // 1. Age extraction (EN / HI / MR / Hinglish) — skip scheme rule phrases like "after age 60" / "60 साल के बाद" / "६० वर्षांनंतर"
  const agePatterns = [
    /\b(\d{1,2})[\s-]*(?:years?[\s-]+old|yrs?[\s-]+old|y\/o)\b/i,
    /\b(?:my\s+age|age\s+is)\s*:?\s*(\d{1,2})\b/i,
    /(\d{1,2})\s*(?:साल\s*(?:का|की|के)|वर्ष\s*(?:का|की|के)|वर्षांचा|वर्षांची|वर्षाचा|वर्षाची|वर्षांच्या|saal\s*(?:ka|ki|ke)|varshacha|varshachi|varshache)/i,
    /(?:उम्र|वय|आयु)\s*(?:है|आहे)?\s*(\d{1,2})/i,
  ];
  for (const pat of agePatterns) {
    const m = normalized.match(pat);
    if (m?.[1]) {
      const parsedAge = Number.parseInt(m[1], 10);
      if (parsedAge >= 1 && parsedAge <= 110) {
        profile.age = parsedAge;
        break;
      }
    }
  }

  // 2. State & Maharashtra districts
  for (const [key, districtName] of Object.entries(MAHARASHTRA_DISTRICTS)) {
    if (lower.includes(key)) {
      profile.district = districtName;
      profile.state = 'Maharashtra';
      break;
    }
  }
  if (!profile.state) {
    for (const st of OTHER_STATES) {
      if (st.pattern.test(normalized)) {
        profile.state = st.name;
        break;
      }
    }
  }

  // 3. Land holding (acres / hectares)
  const acreMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:acres?|acre|एकर|एकड़|ekar|ekra)/i);
  const hectareMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:hectares?|hectare|हेक्टर|हेक्टेयर)/i);
  if (acreMatch?.[1]) {
    profile.landHoldingAcres = Number.parseFloat(acreMatch[1]);
    profile.ownsLand = profile.landHoldingAcres > 0;
  } else if (hectareMatch?.[1]) {
    profile.landHoldingAcres = Number((Number.parseFloat(hectareMatch[1]) * 2.471).toFixed(2));
    profile.ownsLand = profile.landHoldingAcres > 0;
  } else if (/(?:जमीन|भूमि|land|7\/12|७\/१२|sheti|kheti)/i.test(normalized)) {
    if (!/(?:no land|भूमिहीन|जमीन नाही|जमीन नहीं|landless)/i.test(normalized)) {
      profile.ownsLand = true;
    } else {
      profile.ownsLand = false;
      profile.landHoldingAcres = 0;
    }
  }

  // 4. Annual Income (require an income keyword nearby so benefit amounts like "₹5 lakh cover" aren't misread as income)
  const lakhMatch = normalized.match(
    /(?:income|earning|salary|उत्पन्न|आय|कमाई|utpanna|aay)[^\d]{0,25}(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|लाख)/i
  ) ?? normalized.match(
    /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|लाख)\s*(?:annual\s+)?(?:family\s+)?(?:income|earning|salary|उत्पन्न|आय)/i
  );
  const monthlyThousandMatch = normalized.match(
    /(?:earning|income|salary|उत्पन्न|आय|कमाई)[^\d]{0,18}(?:₹|rs\.?)?\s*(\d+(?:,\d+)*)\s*(?:per\s*month|\/month|monthly|दरमहा|प्रति\s*माह|महिना|mahina)/i
  );
  const annualRupeeMatch = normalized.match(
    /(?:income|उत्पन्न|आय|utpanna|aay)[^\d]{0,20}(?:₹|rs\.?)?\s*(\d[\d,]{3,8})(?!\s*(?:per\s*month|\/month|monthly|दरमहा|प्रति\s*माह))/i
  );

  if (lakhMatch?.[1]) {
    const val = Number.parseFloat(lakhMatch[1]);
    if (val > 0 && val <= 100) {
      profile.annualIncome = Math.round(val * 100000);
    }
  } else if (monthlyThousandMatch?.[1]) {
    const monthly = Number.parseInt(monthlyThousandMatch[1].replace(/,/g, ''), 10);
    if (monthly >= 500 && monthly <= 500000) {
      profile.annualIncome = monthly * 12;
    }
  } else if (annualRupeeMatch?.[1]) {
    const annual = Number.parseInt(annualRupeeMatch[1].replace(/,/g, ''), 10);
    if (annual >= 5000 && annual <= 5000000) {
      profile.annualIncome = annual;
    }
  }

  // 5. Gender
  if (
    /(?:\bwoman\b|\bwomen\b|\bfemale\b|\bgirl\b|\bmother\b|\bwidow\b|\bpregnant\b|\bwife\b|\bdaughter\b|महिला|स्त्री|विधवा|गर्भवती|मुलगी|बेटी|लाडकी|बहीण|वर्षांची|वर्षाची|mahila|ladki|bahin)/i.test(
      normalized
    )
  ) {
    profile.gender = 'female';
  } else if (/(?:\bman\b|\bmale\b|\bfather\b|\bhusband\b|पुरुष|वर्षांचा|वर्षाचा)/i.test(normalized)) {
    profile.gender = 'male';
  }

  // 6. Marital status & maternity/girl child flags
  if (/(?:\bwidow\b|\bwidowed\b|विधवा)/i.test(normalized)) {
    profile.maritalStatus = 'widowed';
    profile.gender = 'female';
  } else if (/(?:\bdivorced\b|घटस्फोटित|तलाकशुदा)/i.test(normalized)) {
    profile.maritalStatus = 'divorced';
  } else if (/(?:\bmarried\b|विवाहित)/i.test(normalized)) {
    profile.maritalStatus = 'married';
  }
  if (/(?:\bpregnant\b|\blactating\b|\bmaternity\b|गर्भवती|गरोदर|स्तनदा|प्रसूती)/i.test(normalized)) {
    profile.isPregnantOrLactating = true;
    profile.gender = 'female';
  }
  if (/(?:girl child|daughter|बेटी|मुलगी|बालिका|सुकन्या|लेक लाडकी)/i.test(normalized)) {
    profile.hasGirlChild = true;
  }

  // 7. Occupation
  if (/(?:\bfarmer\b|\bagriculture\b|शेतकरी|किसान|shetkari|kisan|खेती|शेती|crop|पीक|फसल)/i.test(normalized)) {
    profile.occupation = 'farmer';
  } else if (/(?:\bstreet vendor\b|\bhawker\b|फेरीवाला|फेरीवाले|रेहड़ी|पटरी|svanidhi|स्वनिधी)/i.test(normalized)) {
    profile.occupation = 'street_vendor';
  } else if (
    /(?:\bartisan\b|\bcarpenter\b|\btailor\b|\bmason\b|\bbarber\b|\bpotter\b|\bblacksmith\b|\bgoldsmith\b|कारागीर|कारीगर|सुतार|शिंपी|कुंभार|लोहार|विश्वकर्मा|vishwakarma)/i.test(
      normalized
    )
  ) {
    profile.occupation = 'artisan';
  } else if (
    /(?:\bstudent\b|\bcollege\b|\bschool\b|\bscholarship\b|\bstudying\b|\bengineering\b|\bdegree\b|विद्यार्थी|छात्र|छात्रा|शिष्यवृत्ती|छात्रवृत्ति|vidyarthi)/i.test(
      normalized
    )
  ) {
    profile.occupation = 'student';
  } else if (
    /(?:\bentrepreneur\b|\bbusiness\b|\bshop\b|\bstartup\b|\bmudra\b|व्यवसाय|उद्योग|उद्योजक|उद्यमी|दुकान)/i.test(
      normalized
    )
  ) {
    profile.occupation = 'entrepreneur';
  } else if (
    /(?:\bworker\b|\blabour\b|\blabor\b|\bconstruction\b|\bdomestic\b|\bdriver\b|\be-shram\b|कामगार|श्रमिक|मजदूर|असंघटित|असंगठित|kamgar)/i.test(
      normalized
    )
  ) {
    profile.occupation = 'unorganized_worker';
  } else if (/(?:\bretired\b|\bpensioner\b|निवृत्त|सेवानिवृत्त)/i.test(normalized)) {
    profile.occupation = 'retired';
  } else if (/(?:\bhomemaker\b|\bhousewife\b|गृहिणी)/i.test(normalized)) {
    profile.occupation = 'homemaker';
  } else if (/(?:\bunemployed\b|बेरोजगार)/i.test(normalized)) {
    profile.occupation = 'unemployed';
  }

  // 8. Caste / Social category
  if (/(?:\bsc\b|scheduled caste|अनुसूचित जाती|अनुसूचित जाति)/i.test(normalized)) {
    profile.casteCategory = 'sc';
  } else if (/(?:\bst\b|scheduled tribe|tribal|adivasi|अनुसूचित जमाती|अनुसूचित जनजाति|आदिवासी)/i.test(normalized)) {
    profile.casteCategory = 'st';
  } else if (/(?:\bobc\b|other backward|इतर मागास|अन्य पिछड़ा)/i.test(normalized)) {
    profile.casteCategory = 'obc';
  } else if (/(?:\bvjnt\b|\bdnt\b|भटक्या|विमुक्त)/i.test(normalized)) {
    profile.casteCategory = 'vjnt';
  } else if (/(?:\bews\b|\bebc\b|आर्थिक दुर्बल|आर्थिक रूप से कमजोर)/i.test(normalized)) {
    profile.casteCategory = 'ews';
  } else if (/(?:\bgeneral\b|\bopen category\b|खुला प्रवर्ग|सामान्य वर्ग)/i.test(normalized)) {
    profile.casteCategory = 'general';
  }

  // 9. Disability
  const disPctMatch = normalized.match(/(\d{2,3})\s*%\s*(?:disab|divyang|दिव्यांग|अपंग|विकलांग|pwd)/i);
  if (disPctMatch?.[1]) {
    const pct = Number.parseInt(disPctMatch[1], 10);
    if (pct > 0 && pct <= 100) {
      profile.hasDisability = true;
      profile.disabilityPercent = pct;
    }
  } else if (/(?:disab|divyang|handicap|wheelchair|blind|deaf|\bpwd\b|udid|दिव्यांग|अपंग|विकलांग)/i.test(normalized)) {
    profile.hasDisability = true;
  }

  // 10. Residence type & BPL
  if (/(?:\brural\b|\bvillage\b|\bgramin\b|ग्रामीण|गाव|गाँव)/i.test(normalized)) {
    profile.residenceType = 'rural';
  } else if (/(?:\burban\b|\bcity\b|\btown\b|शहरी|शहर|महानगर)/i.test(normalized)) {
    profile.residenceType = 'urban';
  }

  if (/(?:\bbpl\b|below poverty|yellow ration|antyodaya|दारिद्र्यरेषेखालील|गरीबी रेखा|बीपीएल|पिवळे रेशन|अंत्योदय)/i.test(normalized)) {
    profile.isBpl = true;
  }

  // 11. Education level
  if (/(?:postgraduate|post graduate|masters|\bm\.?tech\b|\bmba\b|\bm\.?sc\b|पदव्युत्तर|परास्नातक)/i.test(normalized)) {
    profile.educationLevel = 'postgraduate';
  } else if (/(?:undergraduate|college|engineering|\bb\.?tech\b|\bb\.?e\.?\b|\bb\.?sc\b|\bb\.?a\.?\b|\bdegree\b|पदवी|महाविद्यालय|स्नातक)/i.test(normalized)) {
    profile.educationLevel = 'undergraduate';
  } else if (/(?:diploma|\biti\b|पॉलिटेक्निक|डिप्लोमा)/i.test(normalized)) {
    profile.educationLevel = 'diploma_iti';
  } else if (/(?:class 11|class 12|11th|12th|hsc|११ वी|१२ वी|कक्षा 12|कक्षा 11)/i.test(normalized)) {
    profile.educationLevel = 'higher_secondary';
  } else if (/(?:class 8|class 9|class 10|8th|9th|10th|ssc|८ वी|९ वी|१० वी|कक्षा 8|कक्षा 9|कक्षा 10)/i.test(normalized)) {
    profile.educationLevel = 'secondary';
  }

  // 12. Senior hint if "senior citizen / ज्येष्ठ नागरिक" without exact age
  if (profile.age === undefined && /(?:senior citizen|elderly|ज्येष्ठ नागरिक|वरिष्ठ नागरिक|बुजुर्ग|वृद्ध)/i.test(normalized)) {
    profile.age = 65;
  }

  return profile;
}

/**
 * Merges saved browser profile, deterministic extraction, and optional JSON-schema LLM refinement.
 * Explicit facts from the current message override saved profile fields.
 */
export async function extractUserProfile(
  message: string,
  savedProfile?: Partial<UserProfile>
): Promise<UserProfile> {
  const deterministic = extractProfileDeterministic(message);
  let llmExtracted: Partial<UserProfile> = {};

  const provider = getLLMProvider();
  if (provider.isConfigured()) {
    const result = await provider.generateJSON(
      {
        temperature: 0,
        maxTokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'Extract ONLY explicitly stated citizen profile attributes from the user query as strict JSON matching the schema. Do NOT guess or infer missing fields. Omit unknown fields. Valid occupations: farmer, student, unorganized_worker, artisan, street_vendor, entrepreneur, salaried, homemaker, unemployed, retired. Valid casteCategories: general, obc, sc, st, ews, vjnt, sbc. Valid educationLevels: none, primary, secondary, higher_secondary, undergraduate, postgraduate, diploma_iti. Valid gender: male, female, other. Valid residenceType: rural, urban. Valid maritalStatus: single, married, widowed, divorced.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
      },
      UserProfileSchema.partial()
    );
    if (result) {
      llmExtracted = result;
    }
  }

  const merged: UserProfile = {
    ...(savedProfile ?? {}),
    ...llmExtracted,
    ...deterministic,
  };

  // Strip undefined keys cleanly
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') {
      cleaned[k] = v;
    }
  }

  const parsed = UserProfileSchema.safeParse(cleaned);
  return parsed.success ? parsed.data : deterministic;
}
