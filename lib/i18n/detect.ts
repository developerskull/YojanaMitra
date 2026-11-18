import type { SupportedLang } from '@/lib/schemes/schema';

export interface LanguageDetectionResult {
  lang: SupportedLang;
  isCodeMixed: boolean;
  confidence: number;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/g;

// Strong Marathi-specific Devanagari words & characters (ळ is almost uniquely Marathi vs Hindi)
const MARATHI_DEVANAGARI_MARKERS = [
  'ळ',
  'आहे',
  'आहेत',
  'माझ्याकडे',
  'माझी',
  'माझा',
  'माझे',
  'मी',
  'शेतकरी',
  'वर्षांचा',
  'वर्षांची',
  'नाशिक',
  'पुणे',
  'जमीन',
  'एकर',
  'लाडकी',
  'बहीण',
  'योजनेसाठी',
  'कोणत्या',
  'मिळेल',
  'करायचा',
  'अर्ज',
  'तुम्ही',
  'कृपया',
  'सांगा',
  'कुटुंब',
  'उत्पन्न',
  'विद्यार्थी',
  'ज्येष्ठ',
  'महिलांसाठी',
  'नाही',
  'होय',
  'साठी',
];

const HINDI_DEVANAGARI_MARKERS = [
  'हूँ',
  'हूं',
  'है',
  'हैं',
  'मैं',
  'मेरा',
  'मेरी',
  'मेरे',
  'किसान',
  'साल',
  'का',
  'की',
  'के',
  'मुझे',
  'कौन',
  'सी',
  'योजना',
  'मिलेगी',
  'चाहिए',
  'आवेदन',
  'कैसे',
  'करें',
  'कृपया',
  'बताइए',
  'बताओ',
  'आय',
  'छात्र',
  'वरिष्ठ',
  'महिलाओं',
  'नहीं',
];

// Romanized Marathi (Marathi-English code-mixed) markers
const MARATHI_ROMAN_MARKERS = [
  'shetkari',
  'aahe',
  'ahe',
  'majha',
  'majhi',
  'mazya',
  'majhyakade',
  'varshacha',
  'varshachi',
  'kontya',
  'yojana',
  'sathi',
  'milel',
  'kasa',
  'kashi',
  'sanga',
  'ladki',
  'bahin',
  'namo',
  'shravanbal',
  'niradhar',
  'mahadbt',
  'utpanna',
  'jamin',
  'ekra',
  'ekar',
  'mi ',
];

// Romanized Hindi (Hinglish) markers
const HINDI_ROMAN_MARKERS = [
  'kisan',
  'hoon',
  'hun',
  'hai',
  'hain',
  'mera',
  'meri',
  'mujhe',
  'kaun',
  'kaunsi',
  'chahiye',
  'kaise',
  'kare',
  'karen',
  'batao',
  'bataiye',
  'saal',
  'varsh',
  'mahila',
  'vidyarthi',
  'vridh',
  'budhapa',
  'divyang',
  'garib',
  'ghar',
  'kheti',
  'bima',
  'sarkari',
  'main ',
  'mein ',
];

/**
 * Converts Devanagari numerals (०-९) to ASCII digits (0-9) for reliable numeric parsing.
 */
export function normalizeDevanagariDigits(text: string): string {
  return text.replace(/[\u0966-\u096F]/g, (ch) => String(ch.charCodeAt(0) - 0x0966));
}

/**
 * Detects English, Hindi, or Marathi — including Devanagari script and
 * romanized code-mixed Hinglish / Marathi-English inputs.
 */
export function detectLanguage(
  rawText: string,
  fallbackLang: SupportedLang = 'en'
): LanguageDetectionResult {
  const text = rawText.trim();
  if (!text) {
    return { lang: fallbackLang, isCodeMixed: false, confidence: 0.5 };
  }

  const devMatches = text.match(DEVANAGARI_REGEX) ?? [];
  const latinMatches = text.match(/[A-Za-z]/g) ?? [];
  const totalLetters = devMatches.length + latinMatches.length;

  if (totalLetters === 0) {
    return { lang: fallbackLang, isCodeMixed: false, confidence: 0.5 };
  }

  const hasDevanagari = devMatches.length >= 2;
  const hasLatin = latinMatches.length >= 3;
  const isCodeMixed = hasDevanagari && hasLatin;

  if (hasDevanagari) {
    let mrScore = 0;
    let hiScore = 0;

    if (text.includes('ळ')) mrScore += 4;
    for (const marker of MARATHI_DEVANAGARI_MARKERS) {
      if (text.includes(marker)) mrScore += marker === 'ळ' ? 3 : 2;
    }
    for (const marker of HINDI_DEVANAGARI_MARKERS) {
      if (text.includes(marker)) hiScore += 2;
    }

    if (mrScore > hiScore) {
      return { lang: 'mr', isCodeMixed, confidence: Math.min(0.98, 0.7 + mrScore * 0.05) };
    }
    if (hiScore > mrScore) {
      return { lang: 'hi', isCodeMixed, confidence: Math.min(0.98, 0.7 + hiScore * 0.05) };
    }
    return {
      lang: fallbackLang === 'mr' ? 'mr' : 'hi',
      isCodeMixed,
      confidence: 0.65,
    };
  }

  // Latin script: check romanized Marathi / Hinglish code-mixing
  const lower = ` ${text.toLowerCase()} `;
  let mrRoman = 0;
  let hiRoman = 0;

  for (const m of MARATHI_ROMAN_MARKERS) {
    if (m.endsWith(' ')) {
      if (lower.includes(` ${m}`)) mrRoman += 2;
    } else if (new RegExp(`\\b${m}\\b`, 'i').test(lower)) {
      mrRoman += 2;
    }
  }
  for (const h of HINDI_ROMAN_MARKERS) {
    if (h.endsWith(' ')) {
      if (lower.includes(` ${h}`)) hiRoman += 2;
    } else if (new RegExp(`\\b${h}\\b`, 'i').test(lower)) {
      hiRoman += 2;
    }
  }

  // Only override English when there are strong vernacular markers (>= 4 score, i.e. 2+ words)
  if (mrRoman >= 4 && mrRoman > hiRoman) {
    return { lang: 'mr', isCodeMixed: true, confidence: 0.8 };
  }
  if (hiRoman >= 4 && hiRoman >= mrRoman) {
    return { lang: 'hi', isCodeMixed: true, confidence: 0.8 };
  }

  return { lang: 'en', isCodeMixed: mrRoman > 0 || hiRoman > 0, confidence: 0.9 };
}
