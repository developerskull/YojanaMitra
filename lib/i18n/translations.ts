import type { SupportedLang } from '@/lib/schemes/schema';

export interface UIStrings {
  appName: string;
  tagline: string;
  trustBannerPrefix: string;
  trustBannerVerified: string;
  trustBannerSuffix: string;
  nav: {
    home: string;
    wizard: string;
    explorer: string;
    saved: string;
    profile: string;
    privacy: string;
  };
  landing: {
    headline: string;
    subheadline: string;
    inputPlaceholder: string;
    micLabel: string;
    micListening: string;
    micUnsupported: string;
    sendButton: string;
    quickStartTitle: string;
    howItWorksTitle: string;
    steps: [
      { title: string; desc: string },
      { title: string; desc: string },
      { title: string; desc: string },
    ];
    categories: {
      farmer: { label: string; prompt: string };
      student: { label: string; prompt: string };
      woman: { label: string; prompt: string };
      senior: { label: string; prompt: string };
      worker: { label: string; prompt: string };
      disabled: { label: string; prompt: string };
    };
  };
  chat: {
    newChat: string;
    thinking: string;
    degradedNotice: string;
    detectedProfile: string;
    sourcesTitle: string;
    followupsTitle: string;
    readAloud: string;
    stopReading: string;
    voiceUnsupportedHint: string;
    errorFallback: string;
    schemeCard: {
      eligible: string;
      likely: string;
      missingInfo: string;
      notEligible: string;
      whyQualify: string;
      whyNot: string;
      missingDetails: string;
      documents: string;
      howToApply: string;
      deadlines: string;
      helpline: string;
      applyOfficial: string;
      shareWhatsApp: string;
      save: string;
      saved: string;
      compare: string;
      comparing: string;
      needsVerificationNote: string;
      centralBadge: string;
      stateBadge: string;
      viewDetails: string;
      hideDetails: string;
    };
  };
  wizard: {
    title: string;
    subtitle: string;
    stepOf: string;
    skip: string;
    back: string;
    next: string;
    seeResults: string;
    restart: string;
    resultsTitle: string;
    eligibleCount: string;
    likelyCount: string;
    allAnswered: string;
  };
  explorer: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allStates: string;
    allCategories: string;
    allBenefits: string;
    showingCount: string;
    noResults: string;
    clearFilters: string;
  };
  saved: {
    title: string;
    subtitle: string;
    tabSaved: string;
    tabChecklist: string;
    tabCompare: string;
    emptySaved: string;
    exploreCta: string;
    checklistIntro: string;
    printSummary: string;
    shareAllWhatsApp: string;
    compareEmpty: string;
    compareFields: {
      benefit: string;
      level: string;
      documents: string;
      helpline: string;
      deadline: string;
      apply: string;
    };
  };
  profile: {
    title: string;
    subtitle: string;
    localOnlyNotice: string;
    saveBtn: string;
    savedToast: string;
    deleteBtn: string;
    deleteConfirm: string;
    deletedToast: string;
    checkEligibilityBtn: string;
  };
  privacy: {
    title: string;
    subtitle: string;
    points: Array<{ title: string; body: string }>;
  };
  accessibility: {
    skipToContent: string;
    darkMode: string;
    lightMode: string;
    highContrast: string;
    offlineBadge: string;
  };
}

export const TRANSLATIONS: Record<SupportedLang, UIStrings> = {
  en: {
    appName: 'YojanaMitra',
    tagline: 'Trusted Welfare Scheme Guide',
    trustBannerPrefix: 'Information from official government sources.',
    trustBannerVerified: 'Last verified:',
    trustBannerSuffix: 'Always confirm on the official website.',
    nav: {
      home: 'Ask AI',
      wizard: 'Eligibility Check',
      explorer: 'All Schemes',
      saved: 'Saved & Docs',
      profile: 'My Profile',
      privacy: 'Privacy',
    },
    landing: {
      headline: 'Tell me about yourself — I will find government schemes you qualify for',
      subheadline:
        'Speak or type in Marathi, Hindi, or English. Get verified eligibility reasons, required documents, and official application links.',
      inputPlaceholder: 'Example: I am a 45-year-old farmer from Nashik with 2 acres of land...',
      micLabel: 'Speak your question',
      micListening: 'Listening... tap to stop',
      micUnsupported: 'Voice input is not supported in this browser — please type below.',
      sendButton: 'Find Schemes',
      quickStartTitle: 'Quick Start by Category',
      howItWorksTitle: 'How YojanaMitra Works',
      steps: [
        {
          title: '1. Share your situation',
          desc: 'Speak or type in Marathi, Hindi, or English — no login needed.',
        },
        {
          title: '2. Deterministic eligibility check',
          desc: 'Official rules verify why you qualify, with zero guesswork.',
        },
        {
          title: '3. Documents & official apply link',
          desc: 'Get a printable checklist, clear steps, helpline, and .gov.in link.',
        },
      ],
      categories: {
        farmer: {
          label: 'Farmer',
          prompt: 'I am a 45-year-old farmer from Nashik, Maharashtra with 2 acres of land. Which schemes am I eligible for?',
        },
        student: {
          label: 'Student',
          prompt: 'I am a college student from Maharashtra with annual family income of ₹2 lakh. What scholarships can I apply for?',
        },
        woman: {
          label: 'Woman',
          prompt: 'I am a 32-year-old woman from Maharashtra with family income under ₹2 lakh. Which women welfare schemes do I qualify for?',
        },
        senior: {
          label: 'Senior Citizen',
          prompt: 'I am a 72-year-old senior citizen from Maharashtra. What pension and health schemes can I get?',
        },
        worker: {
          label: 'Worker / Artisan',
          prompt: 'I am a 35-year-old carpenter and unorganized worker looking for business loan or pension schemes.',
        },
        disabled: {
          label: 'Person with Disability',
          prompt: 'I am a 30-year-old person with 50% disability from Maharashtra with low income. Which schemes can help me?',
        },
      },
    },
    chat: {
      newChat: 'New Search',
      thinking: 'Checking official schemes & eligibility rules...',
      degradedNotice:
        'Running in fast verified offline-AI mode (deterministic rule engine + hybrid search). All scheme cards and citations are verified.',
      detectedProfile: 'Understood Profile',
      sourcesTitle: 'Verified Sources',
      followupsTitle: 'Suggested Follow-ups',
      readAloud: 'Read aloud',
      stopReading: 'Stop reading',
      voiceUnsupportedHint: 'Speech output is unavailable in this browser.',
      errorFallback: 'Something went wrong while fetching schemes. Please try again.',
      schemeCard: {
        eligible: 'Eligible',
        likely: 'Likely Eligible',
        missingInfo: 'Need More Info',
        notEligible: 'Not Eligible',
        whyQualify: 'Why you qualify',
        whyNot: 'Why you may not qualify',
        missingDetails: 'Check these details to confirm',
        documents: 'Documents Needed',
        howToApply: 'Step-by-Step Application',
        deadlines: 'Deadline / Cycle',
        helpline: 'Official Helpline',
        applyOfficial: 'Apply on Official Site',
        shareWhatsApp: 'Share on WhatsApp',
        save: 'Save',
        saved: 'Saved',
        compare: 'Compare',
        comparing: 'In Compare',
        needsVerificationNote:
          'Rates, quotas, or annual deadlines may change — please confirm on the official portal.',
        centralBadge: 'Central Govt',
        stateBadge: 'State Govt',
        viewDetails: 'Documents & Steps',
        hideDetails: 'Hide Details',
      },
    },
    wizard: {
      title: 'Check My Eligibility',
      subtitle: 'Answer one simple question at a time. We only ask what is missing from your profile.',
      stepOf: 'Question',
      skip: 'Skip',
      back: 'Back',
      next: 'Next',
      seeResults: 'See My Eligible Schemes',
      restart: 'Update Answers',
      resultsTitle: 'Your Deterministic Eligibility Results',
      eligibleCount: 'Eligible',
      likelyCount: 'Likely Eligible',
      allAnswered: 'Your profile is complete! Here are the schemes matched to your details.',
    },
    explorer: {
      title: 'Scheme Explorer',
      subtitle: 'Search all 46 verified Central and Maharashtra schemes instantly.',
      searchPlaceholder: 'Search by scheme name, benefit, PM-Kisan, Ladki Bahin, scholarship...',
      allStates: 'All States',
      allCategories: 'All Categories',
      allBenefits: 'All Benefit Types',
      showingCount: 'Showing schemes:',
      noResults: 'No schemes match your filters. Try clearing one filter.',
      clearFilters: 'Clear Filters',
    },
    saved: {
      title: 'Saved Schemes, Documents & Compare',
      subtitle: 'Stored privately on this device. Print your checklist or share on WhatsApp.',
      tabSaved: 'Saved Schemes',
      tabChecklist: 'My Documents Checklist',
      tabCompare: 'Compare Schemes',
      emptySaved: 'You have not saved any schemes yet. Tap "Save" on any scheme card.',
      exploreCta: 'Browse All Schemes',
      checklistIntro:
        'Combined list of documents across your saved schemes. Check off what you already have ready.',
      printSummary: 'Print / Save PDF',
      shareAllWhatsApp: 'Share on WhatsApp',
      compareEmpty: 'Select 2 or 3 schemes using the "Compare" button to view them side-by-side.',
      compareFields: {
        benefit: 'Key Benefit',
        level: 'Govt Level & State',
        documents: 'Documents Needed',
        helpline: 'Helpline',
        deadline: 'Deadline',
        apply: 'Official Portal',
      },
    },
    profile: {
      title: 'My Profile (Saved Only on This Device)',
      subtitle: 'Save your basic details once so you do not have to repeat them in chat or the wizard.',
      localOnlyNotice:
        'Privacy guarantee: Your profile is stored ONLY in your browser (localStorage). YojanaMitra has no database and never stores your personal details on any server.',
      saveBtn: 'Save Profile Locally',
      savedToast: 'Profile saved on this device.',
      deleteBtn: 'Delete All My Data',
      deleteConfirm: 'Delete your saved profile, saved schemes, and document checklist from this device?',
      deletedToast: 'All personal data has been erased from this device.',
      checkEligibilityBtn: 'Run Eligibility Check',
    },
    privacy: {
      title: 'Privacy & Responsible AI',
      subtitle: 'Built for citizen trust: zero database, zero login, zero tracking, zero fabricated rules.',
      points: [
        {
          title: '1. No Database, No Account Required',
          body: 'Your profile, saved schemes, and document checklist stay exclusively inside your own browser storage. You can erase everything in one click on the My Profile page.',
        },
        {
          title: '2. Zero-PII Server Logs',
          body: 'We never log your raw chat messages, phone numbers, Aadhaar numbers, or emails. Only anonymous technical metrics (latency, HTTP status) are recorded for reliability.',
        },
        {
          title: '3. Deterministic Eligibility & Mandatory Citations',
          body: 'Eligibility badges (Eligible / Likely / Not Eligible) are computed by a transparent rule engine against official scheme criteria — never guessed by AI. Every claim cites a verified official government source.',
        },
        {
          title: '4. Honesty Over Fluency',
          body: 'Wrong welfare advice wastes time and harms families. When rules, rates, or annual deadlines can change, YojanaMitra clearly flags them and directs you to the official .gov.in portal and helpline.',
        },
      ],
    },
    accessibility: {
      skipToContent: 'Skip to main content',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      highContrast: 'High Contrast',
      offlineBadge: 'Offline Mode — Cached schemes available',
    },
  },

  hi: {
    appName: 'योजनामित्र',
    tagline: 'विश्वसनीय सरकारी योजना मार्गदर्शक',
    trustBannerPrefix: 'आधिकारिक सरकारी स्रोतों से जानकारी।',
    trustBannerVerified: 'अंतिम सत्यापन:',
    trustBannerSuffix: 'कृपया आधिकारिक वेबसाइट पर पुष्टि अवश्य करें।',
    nav: {
      home: 'AI से पूछें',
      wizard: 'पात्रता जांचें',
      explorer: 'सभी योजनाएं',
      saved: 'सहेजी गई व दस्तावेज',
      profile: 'मेरी प्रोफाइल',
      privacy: 'गोपनीयता',
    },
    landing: {
      headline: 'अपने बारे में बताएं — मैं आपके लिए पात्र सरकारी योजनाएं खोजूंगा',
      subheadline:
        'मराठी, हिंदी या अंग्रेज़ी में बोलें या लिखें। सटीक पात्रता कारण, आवश्यक दस्तावेज और आधिकारिक आवेदन लिंक पाएं।',
      inputPlaceholder: 'उदाहरण: मैं नाशिक का 45 साल का किसान हूँ, मेरे पास 2 एकड़ जमीन है...',
      micLabel: 'बोलकर पूछें',
      micListening: 'सुन रहा हूँ... रोकने के लिए दबाएं',
      micUnsupported: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है — कृपया नीचे लिखें।',
      sendButton: 'योजनाएं खोजें',
      quickStartTitle: 'श्रेणी चुनें (त्वरित शुरुआत)',
      howItWorksTitle: 'योजनामित्र कैसे काम करता है',
      steps: [
        {
          title: '1. अपनी स्थिति बताएं',
          desc: 'मराठी, हिंदी या अंग्रेज़ी में बोलें या लिखें — किसी लॉगिन की जरूरत नहीं।',
        },
        {
          title: '2. सटीक नियम-आधारित पात्रता जांच',
          desc: 'आधिकारिक नियमों से जांचा जाता है कि आप क्यों पात्र हैं — कोई अनुमान नहीं।',
        },
        {
          title: '3. दस्तावेज व आधिकारिक लिंक',
          desc: 'प्रिंट करने योग्य दस्तावेज सूची, आसान चरण, हेल्पलाइन और सरकारी लिंक पाएं।',
        },
      ],
      categories: {
        farmer: {
          label: 'किसान',
          prompt: 'मैं महाराष्ट्र के नाशिक का 45 साल का किसान हूँ, मेरे पास 2 एकड़ जमीन है। मुझे कौन सी योजनाएं मिल सकती हैं?',
        },
        student: {
          label: 'छात्र / विद्यार्थी',
          prompt: 'मैं महाराष्ट्र का कॉलेज छात्र हूँ और परिवार की वार्षिक आय ₹2 लाख है। कौन सी छात्रवृत्ति मिल सकती है?',
        },
        woman: {
          label: 'महिला',
          prompt: 'मैं महाराष्ट्र की 32 वर्ष की महिला हूँ और पारिवारिक आय ₹2 लाख से कम है। मुझे कौन सी महिला योजनाएं मिलेंगी?',
        },
        senior: {
          label: 'वरिष्ठ नागरिक',
          prompt: 'मैं महाराष्ट्र का 72 साल का वरिष्ठ नागरिक हूँ। मेरे लिए कौन सी पेंशन और स्वास्थ्य योजनाएं हैं?',
        },
        worker: {
          label: 'श्रमिक / कारीगर',
          prompt: 'मैं 35 साल का बढ़ई और असंगठित श्रमिक हूँ। मुझे व्यवसाय ऋण या पेंशन की कौन सी योजना मिलेगी?',
        },
        disabled: {
          label: 'दिव्यांगजन',
          prompt: 'मैं महाराष्ट्र का 30 साल का 50% दिव्यांग व्यक्ति हूँ और आय कम है। मेरे लिए कौन सी योजनाएं हैं?',
        },
      },
    },
    chat: {
      newChat: 'नई खोज',
      thinking: 'आधिकारिक योजनाओं और पात्रता नियमों की जांच हो रही है...',
      degradedNotice:
        'सत्यापित ऑफलाइन-AI मोड में चल रहा है (नियम-आधारित पात्रता इंजन + हाइब्रिड खोज)। सभी कार्ड और स्रोत सत्यापित हैं।',
      detectedProfile: 'समझी गई जानकारी',
      sourcesTitle: 'सत्यापित स्रोत',
      followupsTitle: 'आगे क्या पूछें',
      readAloud: 'सुनें',
      stopReading: 'बंद करें',
      voiceUnsupportedHint: 'इस ब्राउज़र में वॉइस आउटपुट उपलब्ध नहीं है।',
      errorFallback: 'योजनाएं लोड करने में समस्या आई। कृपया पुनः प्रयास करें।',
      schemeCard: {
        eligible: 'पात्र',
        likely: 'संभावित पात्र',
        missingInfo: 'अधिक जानकारी चाहिए',
        notEligible: 'अपात्र',
        whyQualify: 'आप क्यों पात्र हैं',
        whyNot: 'पात्र न होने के कारण',
        missingDetails: 'पुष्टि के लिए ये विवरण जांचें',
        documents: 'आवश्यक दस्तावेज',
        howToApply: 'आवेदन के चरण',
        deadlines: 'अंतिम तिथि / अवधि',
        helpline: 'आधिकारिक हेल्पलाइन',
        applyOfficial: 'आधिकारिक साइट पर आवेदन करें',
        shareWhatsApp: 'WhatsApp पर भेजें',
        save: 'सहेजें',
        saved: 'सहेजा गया',
        compare: 'तुलना करें',
        comparing: 'तुलना में',
        needsVerificationNote:
          'दरें, कोटा या अंतिम तिथि बदल सकती हैं — कृपया आधिकारिक पोर्टल पर पुष्टि करें।',
        centralBadge: 'केंद्र सरकार',
        stateBadge: 'राज्य सरकार',
        viewDetails: 'दस्तावेज व चरण देखें',
        hideDetails: 'विवरण छुपाएं',
      },
    },
    wizard: {
      title: 'मेरी पात्रता जांचें',
      subtitle: 'एक-एक आसान प्रश्न का उत्तर दें। हम केवल छूटी हुई जानकारी ही पूछते हैं।',
      stepOf: 'प्रश्न',
      skip: 'छोड़ें',
      back: 'पीछे',
      next: 'आगे',
      seeResults: 'मेरी पात्र योजनाएं देखें',
      restart: 'उत्तर बदलें',
      resultsTitle: 'आपके नियम-आधारित पात्रता परिणाम',
      eligibleCount: 'पात्र',
      likelyCount: 'संभावित पात्र',
      allAnswered: 'आपकी प्रोफाइल पूरी है! आपके विवरण से मेल खाने वाली योजनाएं नीचे हैं।',
    },
    explorer: {
      title: 'योजना खोजक (सभी योजनाएं)',
      subtitle: 'सभी 46 सत्यापित केंद्र और महाराष्ट्र सरकार की योजनाएं तुरंत खोजें।',
      searchPlaceholder: 'योजना का नाम, पीएम-किसान, लाडकी बहीण, छात्रवृत्ति खोजें...',
      allStates: 'सभी राज्य',
      allCategories: 'सभी श्रेणियां',
      allBenefits: 'सभी लाभ प्रकार',
      showingCount: 'दिखाई गई योजनाएं:',
      noResults: 'आपके फ़िल्टर से कोई योजना नहीं मिली।',
      clearFilters: 'फ़िल्टर हटाएं',
    },
    saved: {
      title: 'सहेजी गई योजनाएं, दस्तावेज और तुलना',
      subtitle: 'केवल आपके इसी फोन/ब्राउज़र में सुरक्षित। दस्तावेज सूची प्रिंट करें या WhatsApp पर भेजें।',
      tabSaved: 'सहेजी गई योजनाएं',
      tabChecklist: 'मेरे दस्तावेज सूची',
      tabCompare: 'योजनाओं की तुलना',
      emptySaved: 'आपने अभी कोई योजना नहीं सहेजी है। किसी भी योजना कार्ड पर "सहेजें" दबाएं।',
      exploreCta: 'सभी योजनाएं देखें',
      checklistIntro: 'आपकी सभी सहेजी गई योजनाओं के लिए आवश्यक दस्तावेजों की संयुक्त सूची।',
      printSummary: 'प्रिंट / PDF सहेजें',
      shareAllWhatsApp: 'WhatsApp पर भेजें',
      compareEmpty: 'तुलना देखने के लिए 2 या 3 योजनाओं पर "तुलना करें" बटन दबाएं।',
      compareFields: {
        benefit: 'मुख्य लाभ',
        level: 'सरकार व राज्य',
        documents: 'आवश्यक दस्तावेज',
        helpline: 'हेल्पलाइन',
        deadline: 'अंतिम तिथि',
        apply: 'आधिकारिक लिंक',
      },
    },
    profile: {
      title: 'मेरी प्रोफाइल (केवल इस डिवाइस पर)',
      subtitle: 'अपनी जानकारी एक बार सहेजें ताकि बार-बार न भरनी पड़े।',
      localOnlyNotice:
        'गोपनीयता गारंटी: आपकी जानकारी केवल आपके ब्राउज़र में सहेजी जाती है। योजनामित्र के पास कोई डेटाबेस नहीं है और सर्वर पर आपका निजी डेटा नहीं रखा जाता।',
      saveBtn: 'प्रोफाइल सहेजें',
      savedToast: 'प्रोफाइल इस डिवाइस पर सहेजी गई।',
      deleteBtn: 'मेरा सारा डेटा हटाएं',
      deleteConfirm: 'क्या आप इस डिवाइस से अपनी प्रोफाइल, सहेजी गई योजनाएं और दस्तावेज सूची हटाना चाहते हैं?',
      deletedToast: 'आपका सारा निजी डेटा इस डिवाइस से हटा दिया गया है।',
      checkEligibilityBtn: 'पात्रता जांचें',
    },
    privacy: {
      title: 'गोपनीयता और जिम्मेदार AI',
      subtitle: 'नागरिकों के भरोसे के लिए निर्मित: कोई डेटाबेस नहीं, कोई लॉगिन नहीं, कोई ट्रैकिंग नहीं।',
      points: [
        {
          title: '1. कोई डेटाबेस या लॉगिन नहीं',
          body: 'आपकी प्रोफाइल, सहेजी गई योजनाएं और दस्तावेज सूची केवल आपके फोन/ब्राउज़र में रहती है। आप एक क्लिक में सारा डेटा हटा सकते हैं।',
        },
        {
          title: '2. कोई निजी डेटा लॉग नहीं होता',
          body: 'हम आपके संदेश, मोबाइल नंबर, आधार नंबर या ईमेल सर्वर लॉग में कभी नहीं रखते।',
        },
        {
          title: '3. नियम-आधारित पात्रता और सत्यापित स्रोत',
          body: 'पात्रता का निर्णय AI के अनुमान से नहीं, बल्कि पारदर्शी नियम इंजन से किया जाता है। हर जानकारी का आधिकारिक सरकारी स्रोत दिया जाता है।',
        },
        {
          title: '4. सटीकता और ईमानदारी सर्वोपरि',
          body: 'गलत जानकारी नागरिकों को नुकसान पहुँचा सकती है। जहाँ नियम या तिथियां बदल सकती हैं, वहां स्पष्ट चेतावनी और आधिकारिक .gov.in लिंक दिया जाता है।',
        },
      ],
    },
    accessibility: {
      skipToContent: 'मुख्य सामग्री पर जाएं',
      darkMode: 'डार्क मोड',
      lightMode: 'लाइट मोड',
      highContrast: 'उच्च कंट्रास्ट',
      offlineBadge: 'ऑफ़लाइन मोड — सहेजी गई योजनाएं उपलब्ध',
    },
  },

  mr: {
    appName: 'योजनामित्र',
    tagline: 'विश्वासार्ह शासकीय योजना मार्गदर्शक',
    trustBannerPrefix: 'अधिकृत शासकीय स्रोतांवर आधारित माहिती.',
    trustBannerVerified: 'शेवटची पडताळणी:',
    trustBannerSuffix: 'कृपया नेहमी अधिकृत संकेतस्थळावर खात्री करा.',
    nav: {
      home: 'AI ला विचारा',
      wizard: 'पात्रता तपासा',
      explorer: 'सर्व योजना',
      saved: 'जतन व कागदपत्रे',
      profile: 'माझी प्रोफाईल',
      privacy: 'गोपनीयता',
    },
    landing: {
      headline: 'तुमच्याबद्दल सांगा — मी तुम्हाला पात्र शासकीय योजना शोधून देतो',
      subheadline:
        'मराठी, हिंदी किंवा इंग्रजीत बोला किंवा टाइप करा. अचूक पात्रता कारणे, आवश्यक कागदपत्रे आणि अधिकृत अर्ज लिंक मिळवा.',
      inputPlaceholder: 'उदाहरण: मी नाशिकचा ४५ वर्षांचा शेतकरी आहे, माझ्याकडे २ एकर जमीन आहे...',
      micLabel: 'बोलून विचारा',
      micListening: 'ऐकत आहे... थांबवण्यासाठी दाबा',
      micUnsupported: 'या ब्राउझरमध्ये आवाज नोंदणी उपलब्ध नाही — कृपया खाली टाइप करा.',
      sendButton: 'योजना शोधा',
      quickStartTitle: 'तुमचा गट निवडा (झटपट सुरुवात)',
      howItWorksTitle: 'योजनामित्र कसे काम करते',
      steps: [
        {
          title: '१. तुमची माहिती सांगा',
          desc: 'मराठी, हिंदी किंवा इंग्रजीत बोला किंवा लिहा — लॉगिनची गरज नाही.',
        },
        {
          title: '२. अचूक नियमांनुसार पात्रता तपासणी',
          desc: 'अधिकृत नियमांवरून तुम्ही का पात्र आहात हे तपासले जाते — कोणताही अंदाज नाही.',
        },
        {
          title: '३. कागदपत्रे व अधिकृत अर्ज लिंक',
          desc: 'कागदपत्रांची यादी, सोपे टप्पे, हेल्पलाईन आणि थेट सरकारी पोर्टल लिंक मिळवा.',
        },
      ],
      categories: {
        farmer: {
          label: 'शेतकरी',
          prompt: 'मी नाशिकचा ४५ वर्षांचा शेतकरी आहे, माझ्याकडे २ एकर जमीन आहे. मला कोणत्या योजना मिळतील?',
        },
        student: {
          label: 'विद्यार्थी',
          prompt: 'मी महाराष्ट्रातील महाविद्यालयीन विद्यार्थी आहे आणि कौटुंबिक उत्पन्न ₹2 लाख आहे. मला कोणत्या शिष्यवृत्ती मिळतील?',
        },
        woman: {
          label: 'महिला',
          prompt: 'मी महाराष्ट्रातील ३२ वर्षांची महिला आहे, आमचे वार्षिक उत्पन्न ₹2 लाखांपेक्षा कमी आहे. मला कोणत्या योजना मिळतील?',
        },
        senior: {
          label: 'ज्येष्ठ नागरिक',
          prompt: 'मी महाराष्ट्रातील ७२ वर्षांचा ज्येष्ठ नागरिक आहे. माझ्यासाठी कोणत्या पेन्शन व आरोग्य योजना आहेत?',
        },
        worker: {
          label: 'कामगार / कारागीर',
          prompt: 'मी ३५ वर्षांचा सुतार व असंघटित कामगार आहे. मला व्यवसाय कर्ज किंवा पेन्शन योजना सांगा.',
        },
        disabled: {
          label: 'दिव्यांग नागरिक',
          prompt: 'मी महाराष्ट्रातील ३० वर्षांचा ५०% दिव्यांग नागरिक आहे आणि उत्पन्न कमी आहे. मला कोणत्या योजना मिळतील?',
        },
      },
    },
    chat: {
      newChat: 'नवीन शोध',
      thinking: 'अधिकृत योजना व पात्रता नियम तपासत आहे...',
      degradedNotice:
        'सत्यापित ऑफलाईन-AI मोडमध्ये सुरू आहे (नियम-आधारित पात्रता इंजिन + हायब्रिड शोध). सर्व योजना कार्ड व संदर्भ सत्यापित आहेत.',
      detectedProfile: 'समजलेली माहिती',
      sourcesTitle: 'सत्यापित अधिकृत संदर्भ',
      followupsTitle: 'पुढील उपयुक्त प्रश्न',
      readAloud: 'ऐका',
      stopReading: 'थांबवा',
      voiceUnsupportedHint: 'या ब्राउझरमध्ये आवाज वाचन उपलब्ध नाही.',
      errorFallback: 'योजना शोधताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.',
      schemeCard: {
        eligible: 'पात्र',
        likely: 'संभाव्य पात्र',
        missingInfo: 'अधिक माहिती हवी',
        notEligible: 'अपात्र',
        whyQualify: 'तुम्ही का पात्र ठरता',
        whyNot: 'अपात्र असण्याची कारणे',
        missingDetails: 'खात्रीसाठी हे तपशील तपासा',
        documents: 'आवश्यक कागदपत्रे',
        howToApply: 'अर्ज करण्याची टप्प्याटप्प्याने पद्धत',
        deadlines: 'अंतिम मुदत / कालावधी',
        helpline: 'अधिकृत हेल्पलाईन',
        applyOfficial: 'अधिकृत साईटवर अर्ज करा',
        shareWhatsApp: 'WhatsApp वर पाठवा',
        save: 'जतन करा',
        saved: 'जतन केले',
        compare: 'तुलना करा',
        comparing: 'तुलनेत आहे',
        needsVerificationNote:
          'दर, कोटा किंवा मुदत बदलू शकते — कृपया अधिकृत पोर्टलवर खात्री करा.',
        centralBadge: 'केंद्र शासन',
        stateBadge: 'राज्य शासन',
        viewDetails: 'कागदपत्रे व टप्पे पहा',
        hideDetails: 'तपशील लपवा',
      },
    },
    wizard: {
      title: 'माझी पात्रता तपासा',
      subtitle: 'एकावेळी एक सोपा प्रश्न निवडा. आम्ही फक्त अपूर्ण माहितीच विचारतो.',
      stepOf: 'प्रश्न',
      skip: 'वगळा',
      back: 'मागे',
      next: 'पुढे',
      seeResults: 'माझ्या पात्र योजना पहा',
      restart: 'उत्तरे बदला',
      resultsTitle: 'तुमचे नियम-आधारित पात्रता निकाल',
      eligibleCount: 'पात्र',
      likelyCount: 'संभाव्य पात्र',
      allAnswered: 'तुमची माहिती पूर्ण आहे! तुमच्या तपशिलाशी जुळणाऱ्या योजना खालीलप्रमाणे आहेत.',
    },
    explorer: {
      title: 'सर्व योजना शोधा',
      subtitle: 'केंद्र आणि महाराष्ट्र शासनाच्या सर्व ४६ सत्यापित योजना झटपट शोधा.',
      searchPlaceholder: 'योजनेचे नाव, पीएम-किसान, लाडकी बहीण, शिष्यवृत्ती शोधा...',
      allStates: 'सर्व राज्ये',
      allCategories: 'सर्व गट',
      allBenefits: 'सर्व लाभ प्रकार',
      showingCount: 'दाखवलेल्या योजना:',
      noResults: 'तुमच्या फिल्टरशी जुळणारी योजना सापडली नाही.',
      clearFilters: 'फिल्टर काढा',
    },
    saved: {
      title: 'जतन योजना, कागदपत्रे व तुलना',
      subtitle: 'फक्त तुमच्याच डिव्हाइसवर सुरक्षित. यादी प्रिंट करा किंवा WhatsApp वर शेअर करा.',
      tabSaved: 'जतन केलेल्या योजना',
      tabChecklist: 'माझी कागदपत्रे यादी',
      tabCompare: 'योजनांची तुलना',
      emptySaved: 'तुम्ही अद्याप कोणतीही योजना जतन केलेली नाही. कोणत्याही कार्डवर "जतन करा" दाबा.',
      exploreCta: 'सर्व योजना पहा',
      checklistIntro: 'तुमच्या सर्व जतन योजनांसाठी लागणाऱ्या कागदपत्रांची एकत्रित यादी.',
      printSummary: 'प्रिंट / PDF काढा',
      shareAllWhatsApp: 'WhatsApp वर पाठवा',
      compareEmpty: 'तुलना पाहण्यासाठी २ किंवा ३ योजनांवर "तुलना करा" निवडा.',
      compareFields: {
        benefit: 'मुख्य लाभ',
        level: 'शासन व राज्य',
        documents: 'आवश्यक कागदपत्रे',
        helpline: 'हेल्पलाईन',
        deadline: 'अंतिम मुदत',
        apply: 'अधिकृत संकेतस्थळ',
      },
    },
    profile: {
      title: 'माझी प्रोफाईल (फक्त या डिव्हाइसवर)',
      subtitle: 'तुमची माहिती एकदा जतन करा जेणेकरून पुन्हा भरावी लागणार नाही.',
      localOnlyNotice:
        'गोपनीयता हमी: तुमची माहिती फक्त तुमच्या ब्राउझरमध्ये (localStorage) जतन होते. योजनामित्रकडे कोणताही डेटाबेस नाही आणि सर्व्हरवर वैयक्तिक माहिती साठवली जात नाही.',
      saveBtn: 'प्रोफाईल जतन करा',
      savedToast: 'प्रोफाईल या डिव्हाइसवर जतन झाली.',
      deleteBtn: 'माझा सर्व डेटा हटवा',
      deleteConfirm: 'या डिव्हाइसवरील तुमची प्रोफाईल, जतन योजना आणि कागदपत्रांची यादी हटवायची का?',
      deletedToast: 'तुमचा सर्व वैयक्तिक डेटा या डिव्हाइसवरून हटवला आहे.',
      checkEligibilityBtn: 'पात्रता तपासा',
    },
    privacy: {
      title: 'गोपनीयता आणि जबाबदार AI',
      subtitle: 'नागरिकांच्या विश्वासासाठी बनवलेले: डेटाबेस नाही, लॉगिन नाही, ट्रॅकिंग नाही.',
      points: [
        {
          title: '१. डेटाबेस नाही, लॉगिन नाही',
          body: 'तुमची प्रोफाईल, जतन केलेल्या योजना आणि कागदपत्रांची यादी फक्त तुमच्याच फोन/ब्राउझरमध्ये राहते. तुम्ही एका क्लिकवर सर्व डेटा हटवू शकता.',
        },
        {
          title: '२. वैयक्तिक माहितीची नोंद नाही',
          body: 'आम्ही तुमचे संदेश, मोबाईल क्रमांक, आधार क्रमांक किंवा ईमेल सर्व्हर लॉगमध्ये कधीही साठवत नाही.',
        },
        {
          title: '३. नियम-आधारित पात्रता व अधिकृत संदर्भ',
          body: 'पात्रता ठरवण्याचे काम AI च्या अंदाजाने नाही तर अचूक नियम इंजिनद्वारे केले जाते. प्रत्येक माहितीला अधिकृत शासकीय स्रोत जोडलेला असतो.',
        },
        {
          title: '४. अचूकता आणि प्रामाणिकपणा प्रथम',
          body: 'चुकीच्या माहितीमुळे नागरिकांचा वेळ व पैसा वाया जातो. जिथे दर किंवा मुदत बदलू शकते, तिथे स्पष्ट सूचना व अधिकृत .gov.in लिंक दिली जाते.',
        },
      ],
    },
    accessibility: {
      skipToContent: 'मुख्य मजकुराकडे जा',
      darkMode: 'डार्क मोड',
      lightMode: 'लाईट मोड',
      highContrast: 'हाय कॉन्ट्रास्ट',
      offlineBadge: 'ऑफलाईन मोड — जतन योजना उपलब्ध आहेत',
    },
  },
};
