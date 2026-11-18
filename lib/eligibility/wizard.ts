import type { LocalizedText, UserProfile } from '@/lib/schemes/schema';
import type { ProfileFieldKey } from './engine';

export interface WizardOption {
  value: string | number | boolean;
  label: LocalizedText;
}

export interface WizardQuestion {
  field: ProfileFieldKey;
  type: 'select' | 'number' | 'boolean';
  question: LocalizedText;
  helper?: LocalizedText;
  options?: WizardOption[];
  placeholder?: LocalizedText;
}

const ALL_WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    field: 'state',
    type: 'select',
    question: {
      en: 'Which state do you live in?',
      hi: 'आप किस राज्य में रहते हैं?',
      mr: 'तुम्ही कोणत्या राज्यात राहता?',
    },
    helper: {
      en: 'This helps us include both Central and your State government schemes.',
      hi: 'इससे हम केंद्र और आपके राज्य दोनों की योजनाएं दिखा सकेंगे।',
      mr: 'यामुळे केंद्र व तुमच्या राज्य सरकारच्या दोन्ही योजना दाखवता येतात.',
    },
    options: [
      { value: 'Maharashtra', label: { en: 'Maharashtra', hi: 'महाराष्ट्र', mr: 'महाराष्ट्र' } },
      { value: 'Uttar Pradesh', label: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', mr: 'उत्तर प्रदेश' } },
      { value: 'Madhya Pradesh', label: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश', mr: 'मध्य प्रदेश' } },
      { value: 'Gujarat', label: { en: 'Gujarat', hi: 'गुजरात', mr: 'गुजरात' } },
      { value: 'Karnataka', label: { en: 'Karnataka', hi: 'कर्नाटक', mr: 'कर्नाटक' } },
      { value: 'Rajasthan', label: { en: 'Rajasthan', hi: 'राजस्थान', mr: 'राजस्थान' } },
      { value: 'Bihar', label: { en: 'Bihar', hi: 'बिहार', mr: 'बिहार' } },
      { value: 'Delhi', label: { en: 'Delhi', hi: 'दिल्ली', mr: 'दिल्ली' } },
      { value: 'Tamil Nadu', label: { en: 'Tamil Nadu', hi: 'तमिलनाडु', mr: 'तमिळनाडू' } },
      { value: 'Other', label: { en: 'Other Indian State / UT', hi: 'अन्य भारतीय राज्य', mr: 'इतर भारतीय राज्य' } },
    ],
  },
  {
    field: 'age',
    type: 'number',
    question: {
      en: 'How old are you (in years)?',
      hi: 'आपकी उम्र कितनी है (वर्षों में)?',
      mr: 'तुमचे वय किती वर्षे आहे?',
    },
    placeholder: {
      en: 'e.g., 45',
      hi: 'जैसे, 45',
      mr: 'उदा., ४५',
    },
  },
  {
    field: 'gender',
    type: 'select',
    question: {
      en: 'What is your gender?',
      hi: 'आपका लिंग क्या है?',
      mr: 'तुमचे लिंग निवडा:',
    },
    options: [
      { value: 'female', label: { en: 'Woman / Female', hi: 'महिला', mr: 'महिला' } },
      { value: 'male', label: { en: 'Man / Male', hi: 'पुरुष', mr: 'पुरुष' } },
      { value: 'other', label: { en: 'Other', hi: 'अन्य', mr: 'इतर' } },
    ],
  },
  {
    field: 'occupation',
    type: 'select',
    question: {
      en: 'What best describes your primary work or role?',
      hi: 'आपका मुख्य कार्य या पेशा क्या है?',
      mr: 'तुमचा मुख्य व्यवसाय किंवा भूमिका कोणती आहे?',
    },
    options: [
      { value: 'farmer', label: { en: 'Farmer / Agriculture', hi: 'किसान / खेती', mr: 'शेतकरी / शेती' } },
      { value: 'student', label: { en: 'Student', hi: 'छात्र / विद्यार्थी', mr: 'विद्यार्थी' } },
      { value: 'unorganized_worker', label: { en: 'Daily Wage / Unorganized Worker', hi: 'श्रमिक / मजदूर', mr: 'असंघटित कामगार / मजूर' } },
      { value: 'artisan', label: { en: 'Traditional Artisan (Tailor, Carpenter, Mason...)', hi: 'पारंपरिक कारीगर', mr: 'पारंपरिक कारागीर' } },
      { value: 'street_vendor', label: { en: 'Street Vendor / Hawker', hi: 'फेरीवाला / स्ट्रीट वेंडर', mr: 'फेरीवाला / पथविक्रेता' } },
      { value: 'entrepreneur', label: { en: 'Small Business / Self-Employed', hi: 'छोटा व्यवसाय / उद्यमी', mr: 'लघु उद्योग / स्वयंरोजगार' } },
      { value: 'homemaker', label: { en: 'Homemaker', hi: 'गृहिणी', mr: 'गृहिणी' } },
      { value: 'retired', label: { en: 'Retired / Senior Citizen', hi: 'सेवानिवृत्त', mr: 'निवृत्त / ज्येष्ठ नागरिक' } },
      { value: 'unemployed', label: { en: 'Currently Looking for Work', hi: 'रोजगार की तलाश में', mr: 'रोजगाराच्या शोधात' } },
      { value: 'salaried', label: { en: 'Salaried Employee', hi: 'वेतनभोगी कर्मचारी', mr: 'पगारदार कर्मचारी' } },
    ],
  },
  {
    field: 'annualIncome',
    type: 'select',
    question: {
      en: 'What is your approximate annual family income?',
      hi: 'आपके परिवार की अनुमानित वार्षिक आय कितनी है?',
      mr: 'तुमच्या कुटुंबाचे अंदाजे वार्षिक उत्पन्न किती आहे?',
    },
    helper: {
      en: 'Many scholarships, pensions, and women’s schemes use income limits.',
      hi: 'कई छात्रवृत्ति, पेंशन और महिला योजनाओं में आय सीमा लागू होती है।',
      mr: 'अनेक शिष्यवृत्ती, पेन्शन व महिला योजनांसाठी उत्पन्न मर्यादा असते.',
    },
    options: [
      { value: 20000, label: { en: 'Below ₹21,000', hi: '₹21,000 से कम', mr: '₹21,000 पेक्षा कमी' } },
      { value: 90000, label: { en: '₹21,000 – ₹1,00,000', hi: '₹21,000 – ₹1 लाख', mr: '₹21,000 – ₹1 लाख' } },
      { value: 180000, label: { en: '₹1 lakh – ₹2.5 lakh', hi: '₹1 लाख – ₹2.5 लाख', mr: '₹1 लाख – ₹2.5 लाख' } },
      { value: 400000, label: { en: '₹2.5 lakh – ₹4.5 lakh', hi: '₹2.5 लाख – ₹4.5 लाख', mr: '₹2.5 लाख – ₹4.5 लाख' } },
      { value: 750000, label: { en: '₹4.5 lakh – ₹8 lakh', hi: '₹4.5 लाख – ₹8 लाख', mr: '₹4.5 लाख – ₹8 लाख' } },
      { value: 1200000, label: { en: 'Above ₹8 lakh', hi: '₹8 लाख से अधिक', mr: '₹8 लाखांपेक्षा जास्त' } },
    ],
  },
  {
    field: 'residenceType',
    type: 'select',
    question: {
      en: 'Do you live in a village (rural) or city/town (urban)?',
      hi: 'क्या आप गांव (ग्रामीण) में रहते हैं या शहर (शहरी) में?',
      mr: 'तुम्ही ग्रामीण भागात राहता की शहरी भागात?',
    },
    options: [
      { value: 'rural', label: { en: 'Village / Rural', hi: 'गांव / ग्रामीण', mr: 'गाव / ग्रामीण' } },
      { value: 'urban', label: { en: 'City / Town / Urban', hi: 'शहर / शहरी', mr: 'शहर / शहरी' } },
    ],
  },
  {
    field: 'casteCategory',
    type: 'select',
    question: {
      en: 'Which social category do you belong to? (Optional)',
      hi: 'आप किस सामाजिक श्रेणी से संबंधित हैं?',
      mr: 'तुमचा सामाजिक प्रवर्ग कोणता आहे?',
    },
    options: [
      { value: 'general', label: { en: 'General / Open', hi: 'सामान्य वर्ग', mr: 'खुला प्रवर्ग' } },
      { value: 'obc', label: { en: 'OBC', hi: 'ओबीसी (OBC)', mr: 'OBC' } },
      { value: 'sc', label: { en: 'SC (Scheduled Caste)', hi: 'अनुसूचित जाति (SC)', mr: 'अनुसूचित जाती (SC)' } },
      { value: 'st', label: { en: 'ST (Scheduled Tribe)', hi: 'अनुसूचित जनजाति (ST)', mr: 'अनुसूचित जमाती (ST)' } },
      { value: 'ews', label: { en: 'EWS', hi: 'ईडब्ल्यूएस (EWS)', mr: 'EWS' } },
      { value: 'vjnt', label: { en: 'VJNT / DNT', hi: 'विमुक्त/घुमंतू (VJNT)', mr: 'भटक्या-विमुक्त (VJNT)' } },
    ],
  },
  {
    field: 'ownsLand',
    type: 'boolean',
    question: {
      en: 'Does your family own cultivable agricultural land?',
      hi: 'क्या आपके परिवार के पास खेती योग्य जमीन है?',
      mr: 'तुमच्या कुटुंबाच्या नावावर शेतीयोग्य जमीन (७/१२) आहे का?',
    },
    options: [
      { value: true, label: { en: 'Yes', hi: 'हाँ', mr: 'होय' } },
      { value: false, label: { en: 'No', hi: 'नहीं', mr: 'नाही' } },
    ],
  },
  {
    field: 'isBpl',
    type: 'boolean',
    question: {
      en: 'Do you have a BPL / Antyodaya / Yellow Ration Card?',
      hi: 'क्या आपके पास बीपीएल / अंत्योदय / पीला राशन कार्ड है?',
      mr: 'तुमच्याकडे दारिद्र्यरेषेखालील (BPL) / अंत्योदय / पिवळे रेशन कार्ड आहे का?',
    },
    options: [
      { value: true, label: { en: 'Yes', hi: 'हाँ', mr: 'होय' } },
      { value: false, label: { en: 'No', hi: 'नहीं', mr: 'नाही' } },
    ],
  },
  {
    field: 'hasDisability',
    type: 'boolean',
    question: {
      en: 'Are you a Person with Disability (Divyangjan)?',
      hi: 'क्या आप दिव्यांगजन हैं?',
      mr: 'तुम्ही दिव्यांग नागरिक आहात का?',
    },
    options: [
      { value: true, label: { en: 'Yes', hi: 'हाँ', mr: 'होय' } },
      { value: false, label: { en: 'No', hi: 'नहीं', mr: 'नाही' } },
    ],
  },
  {
    field: 'educationLevel',
    type: 'select',
    question: {
      en: 'What is your current education level?',
      hi: 'आपका वर्तमान शैक्षणिक स्तर क्या है?',
      mr: 'तुमचा सध्याचा शैक्षणिक स्तर कोणता आहे?',
    },
    options: [
      { value: 'secondary', label: { en: 'Class 8–10', hi: 'कक्षा 8–10', mr: 'इयत्ता ८ वी – १० वी' } },
      { value: 'higher_secondary', label: { en: 'Class 11–12', hi: 'कक्षा 11–12', mr: 'इयत्ता ११ वी – १२ वी' } },
      { value: 'diploma_iti', label: { en: 'ITI / Diploma', hi: 'आईटीआई / डिप्लोमा', mr: 'आयटीआय / डिप्लोमा' } },
      { value: 'undergraduate', label: { en: 'College / Undergraduate (BA/BSc/BE/BTech)', hi: 'स्नातक / कॉलेज', mr: 'पदवी / महाविद्यालय' } },
      { value: 'postgraduate', label: { en: 'Postgraduate (MA/MSc/MTech)', hi: 'परास्नातक', mr: 'पदव्युत्तर' } },
    ],
  },
];

/**
 * Returns ONLY the missing wizard questions relevant to the user's current profile,
 * skipping irrelevant fields (e.g., skips land question if not a farmer, skips education if not a student).
 */
export function getMissingWizardQuestions(profile: Partial<UserProfile>): WizardQuestion[] {
  return ALL_WIZARD_QUESTIONS.filter((q) => {
    const val = profile[q.field as keyof UserProfile];
    if (val !== undefined && val !== null && val !== '') return false;

    if (q.field === 'ownsLand' && profile.occupation && profile.occupation !== 'farmer') {
      return false;
    }
    if (q.field === 'educationLevel' && profile.occupation !== 'student') {
      return false;
    }
    return true;
  });
}
