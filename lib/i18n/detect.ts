import type { SupportedLang } from '@/lib/schemes/schema';

export interface LanguageDetectionResult {
  lang: SupportedLang;
  isCodeMixed: boolean;
  confidence: number;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/g;

// Strong Marathi Devanagari words / suffixes (distinct from Hindi)
const MARATHI_DEVANAGARI_WORDS = [
  'आहे',
  'आहेत',
  'माझ्याकडे',
  'माझी',
  'माझा',
  'माझे',
  'मी',
  'शेतकरी',
  'शेतकऱ्यांना',
  'शेतकऱ्यांसाठी',
  'वर्षांचा',
  'वर्षांची',
  'वर्षाचा',
  'वर्षाची',
  'वर्षांनंतर',
  'नाशिक',
  'नाशिकचा',
  'पुणे',
  'पुण्याची',
  'महाराष्ट्रातील',
  'महाराष्ट्रात',
  'जमीन',
  'एकर',
  'लाडकी',
  'बहीण',
  'लेक',
  'योजनेसाठी',
  'योजनेत',
  'योजनेतून',
  'कोणत्या',
  'मिळेल',
  'मिळतात',
  'मिळते',
  'मिळतील',
  'मिळवावी',
  'करायचा',
  'करावी',
  'करावा',
  'अर्ज',
  'तुम्ही',
  'सांगा',
  'द्या',
  'माहिती',
  'कशी',
  'कसे',
  'किती',
  'उत्पन्न',
  'विद्यार्थी',
  'विद्यार्थ्यांसाठी',
  'ज्येष्ठ',
  'ज्येष्ठांसाठी',
  'महिलांसाठी',
  'महिला',
  'कामगारांसाठी',
  'फेरीवाल्यांसाठी',
  'उद्योजकांसाठी',
  'नागरिकांसाठी',
  'नाही',
  'होय',
  'साठी',
  'मध्ये',
  'पेन्शन',
  'विमा',
  'पीक',
  'कर्ज',
  'अनुदान',
  'शिष्यवृत्ती',
  'शेततळे',
  'बांधण्यासाठी',
  'बसवण्यासाठी',
  'उघडावी',
  'काढायचे',
  'काढावे',
  'भरावी',
  'दरमहा',
  'हप्त्यात',
  'गरोदर',
  'मुलीसाठी',
  'मुलीच्या',
  'बचत',
  'गटासाठी',
  'वसतिगृह',
  'दिव्यांग',
  'निराधार',
  'श्रावणबाळ',
  'जोतिराव',
  'असलेल्या',
  'इयत्ता',
  'मोफत',
  'सुरू',
  'करण्यासाठी',
];

// Strong Hindi Devanagari whole-word markers (matched on whitespace-delimited tokens)
const HINDI_DEVANAGARI_EXACT_WORDS = new Set([
  'हूँ',
  'हूं',
  'है',
  'हैं',
  'मैं',
  'मेरा',
  'मेरी',
  'मेरे',
  'मुझे',
  'किसान',
  'किसानों',
  'साल',
  'का',
  'की',
  'के',
  'को',
  'में',
  'से',
  'पर',
  'कौन',
  'सी',
  'मिलेगी',
  'मिलेगा',
  'मिलते',
  'मिलता',
  'चाहिए',
  'आवेदन',
  'कैसे',
  'करें',
  'बताइए',
  'बताओ',
  'बताएं',
  'दें',
  'आय',
  'छात्र',
  'छात्रों',
  'छात्रवृत्ति',
  'वरिष्ठ',
  'बुजुर्ग',
  'बुजुर्गों',
  'महिलाओं',
  'नहीं',
  'कितने',
  'कितनी',
  'कितना',
  'जानकारी',
  'बीमा',
  'ऋण',
  'फसल',
  'पेंशन',
  'मुफ्त',
  'खोलें',
  'बनवाएं',
  'कराएं',
  'भरें',
  'क्या',
  'और',
  'लिए',
]);

// Romanized Marathi (Marathi-English code-mixed) markers
const MARATHI_ROMAN_MARKERS = [
  'shetkari',
  'aahe',
  'aahet',
  'ahe',
  'majha',
  'majhi',
  'majhe',
  'mazya',
  'majhyakade',
  'varshacha',
  'varshachi',
  'varshache',
  'kontya',
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
  'madhe',
  'kagadpatre',
  'lagtat',
  'karaycha',
  'ajoba',
  'aai',
  'rahate',
  'mi',
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
  'mere',
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
  'main',
  'mein',
  'jankari',
  'milega',
  'milegi',
  'pita',
  'beti',
  'khata',
  'khole',
  'gaon',
  'kitna',
  'paisa',
  'milta',
  'banega',
  'dukan',
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

    // 'ळ' is practically unique to Marathi vs Hindi
    if (text.includes('ळ')) mrScore += 6;

    const words = text
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const marathiWordSet = new Set(MARATHI_DEVANAGARI_WORDS);

    for (const w of words) {
      if (marathiWordSet.has(w)) {
        mrScore += 3;
      } else if (w.endsWith('साठी') || w.endsWith('मधील') || w.endsWith('मध्ये') || w.endsWith('च्या')) {
        mrScore += 3;
      }
      if (HINDI_DEVANAGARI_EXACT_WORDS.has(w)) {
        hiScore += 3;
      }
    }

    if (mrScore > hiScore) {
      return { lang: 'mr', isCodeMixed, confidence: Math.min(0.98, 0.72 + mrScore * 0.04) };
    }
    if (hiScore > mrScore) {
      return { lang: 'hi', isCodeMixed, confidence: Math.min(0.98, 0.72 + hiScore * 0.04) };
    }
    return {
      lang: fallbackLang === 'mr' ? 'mr' : 'hi',
      isCodeMixed,
      confidence: 0.65,
    };
  }

  // Latin script: check romanized Marathi / Hinglish code-mixing using whole-word tokens
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const mrSet = new Set(MARATHI_ROMAN_MARKERS);
  const hiSet = new Set(HINDI_ROMAN_MARKERS);

  let mrRoman = 0;
  let hiRoman = 0;

  for (const tok of tokens) {
    if (mrSet.has(tok)) mrRoman += 2;
    if (hiSet.has(tok)) hiRoman += 2;
  }

  // Only override English when there are strong vernacular markers (>= 4 score, i.e. 2+ words)
  if (mrRoman >= 4 && mrRoman > hiRoman) {
    return { lang: 'mr', isCodeMixed: true, confidence: 0.85 };
  }
  if (hiRoman >= 4 && hiRoman >= mrRoman) {
    return { lang: 'hi', isCodeMixed: true, confidence: 0.85 };
  }

  return { lang: 'en', isCodeMixed: mrRoman > 0 || hiRoman > 0, confidence: 0.9 };
}
