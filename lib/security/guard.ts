import type { SupportedLang } from '@/lib/schemes/schema';

export interface SecurityGuardResult {
  allowed: boolean;
  reason?: 'prompt_injection' | 'harmful' | 'off_topic';
  refusalMessage?: string;
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)/i,
  /(reveal|show|print|repeat|leak|output)\s+(your\s+)?(system\s+prompt|hidden\s+instructions|developer\s+prompt)/i,
  /\byou\s+are\s+now\s+(dan|jailbroken|an?\s+unrestricted)/i,
  /bypass\s+(safety|security|guardrails|rules)/i,
  /<\/?(?:system|assistant|verified_schemes|user_profile)>/i,
];

const HARMFUL_PATTERNS: RegExp[] = [
  /\b(make\s+a\s+bomb|build\s+explosives|hack\s+into|phishing\s+page|fake\s+aadhaar|forge\s+certificate|steal\s+bank)\b/i,
  /\b(suicide\s+methods|self[-\s]?harm\s+instructions)\b/i,
];

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(write\s+a\s+python\s+script|solve\s+this\s+leetcode|react\s+useeffect\s+bug|sql\s+injection\s+tutorial|cricket\s+live\s+score|movie\s+download\s+link)\b/i,
];

const REFUSALS: Record<
  'prompt_injection' | 'harmful' | 'off_topic',
  Record<SupportedLang, string>
> = {
  prompt_injection: {
    en: 'I can only help you discover and understand verified Indian government welfare schemes. Please describe your age, state, occupation, or which scheme you would like to check.',
    hi: 'मैं केवल सत्यापित भारतीय सरकारी कल्याण योजनाओं की जानकारी और पात्रता जांच में मदद कर सकता हूँ। कृपया अपनी उम्र, राज्य, व्यवसाय या योजना का नाम बताएं।',
    mr: 'मी फक्त सत्यापित भारतीय शासकीय कल्याणकारी योजनांची माहिती व पात्रता तपासणीत मदत करू शकतो. कृपया तुमचे वय, राज्य, व्यवसाय किंवा योजनेचे नाव सांगा.',
  },
  harmful: {
    en: 'I cannot help with that request. YojanaMitra only provides honest, verified information about official Indian government welfare schemes.',
    hi: 'मैं इस अनुरोध में सहायता नहीं कर सकता। योजनामित्र केवल आधिकारिक भारतीय सरकारी योजनाओं की सही जानकारी देता है।',
    mr: 'मी या विनंतीसाठी मदत करू शकत नाही. योजनामित्र फक्त अधिकृत भारतीय शासकीय योजनांची विश्वासार्ह माहिती देते.',
  },
  off_topic: {
    en: 'YojanaMitra specializes exclusively in Indian government welfare schemes (for farmers, students, women, seniors, workers, and persons with disabilities). Tell me about your situation and I will match eligible schemes for you.',
    hi: 'योजनामित्र विशेष रूप से भारतीय सरकारी योजनाओं (किसान, छात्र, महिला, वरिष्ठ नागरिक, श्रमिक, दिव्यांग) के लिए बनाया गया है। कृपया अपनी स्थिति बताएं ताकि मैं आपके लिए पात्र योजनाएं खोज सकूँ।',
    mr: 'योजनामित्र विशेषतः भारतीय शासकीय योजनांसाठी (शेतकरी, विद्यार्थी, महिला, ज्येष्ठ नागरिक, कामगार, दिव्यांग) बनवले आहे. कृपया तुमची माहिती सांगा म्हणजे मी पात्र योजना शोधून देईन.',
  },
};

/**
 * Inspects user input for prompt injection, harmful intent, or clearly off-topic
 * requests before reaching RAG or LLM calls.
 */
export function evaluateInputSafety(
  message: string,
  lang: SupportedLang
): SecurityGuardResult {
  const cleaned = message.trim();

  for (const pat of PROMPT_INJECTION_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        allowed: false,
        reason: 'prompt_injection',
        refusalMessage: REFUSALS.prompt_injection[lang],
      };
    }
  }

  for (const pat of HARMFUL_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        allowed: false,
        reason: 'harmful',
        refusalMessage: REFUSALS.harmful[lang],
      };
    }
  }

  for (const pat of OFF_TOPIC_PATTERNS) {
    if (pat.test(cleaned)) {
      return {
        allowed: false,
        reason: 'off_topic',
        refusalMessage: REFUSALS.off_topic[lang],
      };
    }
  }

  return { allowed: true };
}
