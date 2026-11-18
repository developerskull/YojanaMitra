import { normalizeDevanagariDigits } from '@/lib/i18n/detect';
import { getLLMProvider } from '@/lib/llm/adapter';

export const LOCAL_EMBEDDING_DIM = 256;

/**
 * Cross-lingual Indian welfare domain concept bridge.
 * Maps Devanagari & Romanized Marathi/Hindi terms into canonical semantic anchors
 * so offline/fallback vector search still retrieves across EN/HI/MR/code-mixed inputs.
 */
export const MULTILINGUAL_SYNONYMS: Record<string, string[]> = {
  farmer: ['kisan', 'shetkari', 'किसान', 'शेतकरी', 'कृषि', 'कृषी', 'farming', 'agriculture', 'kheti', 'sheti', 'शेती', 'खेती'],
  land: ['acre', 'acres', 'एकर', 'एकड़', 'जमीन', 'भूमि', 'hectare', '7/12', 'utara', 'उतारा', 'jamin', 'bhumi'],
  crop: ['fasal', 'pik', 'पीक', 'फसल', 'bima', 'vima', 'विमा', 'बीमा', 'drought', 'dukhkal', 'दुष्काळ'],
  solar: ['saur', 'सौर', 'सूर्य', 'surya', 'bijli', 'वीज', 'बिजली', 'pump', 'पंप', 'rooftop', 'kusum', 'कुसुम'],
  woman: ['mahila', 'महिला', 'महिलांसाठी', 'स्त्री', 'ladki', 'लाडकी', 'बहीण', 'bahin', 'girl', 'बेटी', 'मुलगी', 'mulgi', 'beti', 'mother', 'माता', 'गर्भवती', 'pregnant', 'widow', 'विधवा'],
  student: ['vidyarthi', 'विद्यार्थी', 'छात्र', 'छात्रा', 'scholarship', 'शिष्यवृत्ती', 'छात्रवृत्ति', 'college', 'महाविद्यालय', 'school', 'शाळा', 'स्कूल', 'hostel', 'वसतिगृह', 'छात्रावास', 'education', 'शिक्षण', 'शिक्षा'],
  senior: ['elderly', 'वरिष्ठ', 'ज्येष्ठ', 'वृद्ध', 'बुजुर्ग', 'बुढ़ापा', 'old', 'vridh', 'pension', 'पेंशन', 'पेन्शन', 'निवृत्तीवेतन', 'retired', 'निवृत्त', 'shravanbal', 'श्रावणबाळ'],
  worker: ['labour', 'labor', 'कामगार', 'श्रमिक', 'मजदूर', 'artisan', 'कारागीर', 'कारीगर', 'vishwakarma', 'विश्वकर्मा', 'vendor', 'फेरीवाला', 'फेरीवाले', 'hawker', 'svanidhi', 'स्वनिधी', 'eshram', 'ई-श्रम'],
  loan: ['karj', 'कर्ज', 'ऋण', 'rin', 'business', 'व्यवसाय', 'उद्योग', 'udyam', 'mudra', 'मुद्रा', 'entrepreneur', 'उद्योजक', 'उद्यमी', 'shop', 'दुकान', 'kcc'],
  health: ['arogya', 'आरोग्य', 'स्वास्थ्य', 'hospital', 'रुग्णालय', 'अस्पताल', 'medical', 'इलाज', 'उपचार', 'ayushman', 'आयुष्मान', 'pmjay', 'mjpjay', 'phule', 'फुले', 'insurance', 'बीमा', 'विमा'],
  housing: ['house', 'home', 'ghar', 'घर', 'घरे', 'घरकुल', 'gharkul', 'awas', 'आवास', 'मकान', 'makan', 'pmay', 'homeless', 'बेघर'],
  disabled: ['divyang', 'दिव्यांग', 'अपंग', 'विकलांग', 'handicapped', 'pwd', 'udid', 'यूडीआईडी', 'wheelchair', 'व्हीलचेअर', 'hearing', 'श्रवण', 'tricycle', 'niradhar', 'निराधार'],
  maharashtra: ['nashik', 'नाशिक', 'नासिक', 'pune', 'पुणे', 'mumbai', 'मुंबई', 'nagpur', 'नागपूर', 'nagpur', 'satara', 'सातारा', 'kolhapur', 'कोल्हापूर', 'solapur', 'सोलापूर', 'thane', 'ठाणे', 'aurangabad', 'छत्रपती संभाजीनगर', 'sambhajinagar', 'jalgaon', 'जळगाव', 'ahmednagar', 'अहमदनगर', 'amravati', 'अमरावती', 'latur', 'लातूर', 'nanded', 'नांदेड', 'sangli', 'सांगली', 'ratnagiri', 'रत्नागिरी', 'महाराष्ट्र', 'mahadbt', 'महाडीबीटी'],
  lpg: ['gas', 'गॅस', 'गैस', 'cylinder', 'सिलिंडर', 'सिलेंडर', 'ujjwala', 'उज्ज्वला', 'cooking', 'स्वयंपाक'],
  sc: ['scheduled caste', 'अनुसूचित जाति', 'अनुसूचित जाती', 'dalit'],
  st: ['scheduled tribe', 'अनुसूचित जनजाति', 'अनुसूचित जमाती', 'adivasi', 'आदिवासी', 'tribal', 'birsa', 'बिरसा'],
  obc: ['other backward', 'इतर मागास', 'अन्य पिछड़ा', 'vjnt', 'ebc', 'ews', 'आर्थिक दुर्बल'],
  bpl: ['poor', 'गरीब', 'दारिद्र्यरेषेखालील', 'ration', 'रेशन', 'राशन', 'antyodaya', 'अंत्योदय', 'yellow', 'पिवळे'],
};

const REVERSE_SYNONYM_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(MULTILINGUAL_SYNONYMS)) {
    map.set(canonical, canonical);
    for (const v of variants) {
      map.set(v.toLowerCase(), canonical);
    }
  }
  return map;
})();

/**
 * Tokenizes multilingual text (Latin + Devanagari) and appends cross-lingual canonical anchors.
 */
export function tokenizeMultilingual(rawText: string): string[] {
  const normalized = normalizeDevanagariDigits(rawText).toLowerCase();
  const rawTokens = normalized
    .replace(/[^\p{L}\p{N}/-]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const expanded: string[] = [];
  for (const token of rawTokens) {
    expanded.push(token);
    const canonical = REVERSE_SYNONYM_MAP.get(token);
    if (canonical && canonical !== token) {
      expanded.push(canonical);
    } else {
      // Substring check for inflected Marathi/Hindi stems (e.g., शेतकऱ्यांना, महिलांसाठी)
      for (const [variant, anchor] of REVERSE_SYNONYM_MAP.entries()) {
        if (variant.length >= 4 && token.includes(variant)) {
          expanded.push(anchor);
          break;
        }
      }
    }
  }
  return expanded;
}

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic 256-dim multilingual hashed embedding using word unigrams,
 * cross-lingual anchors, and character trigrams (L2-normalized).
 */
export function computeLocalEmbedding(text: string): number[] {
  const vec = new Float64Array(LOCAL_EMBEDDING_DIM);
  const tokens = tokenizeMultilingual(text);

  for (const token of tokens) {
    // Word feature (higher weight)
    const wHash = fnv1aHash(`w:${token}`);
    const wIdx = wHash % LOCAL_EMBEDDING_DIM;
    const wSign = (wHash & 1) === 0 ? 1 : -1;
    vec[wIdx] = (vec[wIdx] ?? 0) + wSign * 2.0;

    // Character 3-grams for fuzzy/morphological matching across Devanagari & Romanized text
    if (token.length >= 3) {
      const padded = `^${token}$`;
      for (let i = 0; i <= padded.length - 3; i++) {
        const tri = padded.slice(i, i + 3);
        const tHash = fnv1aHash(`g:${tri}`);
        const tIdx = tHash % LOCAL_EMBEDDING_DIM;
        const tSign = (tHash & 1) === 0 ? 1 : -1;
        vec[tIdx] = (vec[tIdx] ?? 0) + tSign * 0.5;
      }
    }
  }

  let norm = 0;
  for (let i = 0; i < LOCAL_EMBEDDING_DIM; i++) {
    const v = vec[i] ?? 0;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;

  const out: number[] = new Array(LOCAL_EMBEDDING_DIM);
  for (let i = 0; i < LOCAL_EMBEDDING_DIM; i++) {
    out[i] = Number(((vec[i] ?? 0) / norm).toFixed(5));
  }
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function embedTexts(
  texts: string[],
  expectedModel?: string
): Promise<{ vectors: number[][]; model: string }> {
  const provider = getLLMProvider();
  const shouldUseRemote =
    provider.isConfigured() && (!expectedModel || !expectedModel.startsWith('local-'));

  if (shouldUseRemote) {
    const remote = await provider.embed(texts);
    if (remote && remote.length === texts.length) {
      return { vectors: remote, model: `${provider.name}-embedding` };
    }
  }

  return {
    vectors: texts.map((t) => computeLocalEmbedding(t)),
    model: 'local-multilingual-hash-256',
  };
}
