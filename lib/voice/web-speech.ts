'use client';

import type { SupportedLang } from '@/lib/schemes/schema';
import {
  LANG_TO_LOCALE,
  type SpeechToTextAdapter,
  type STTCallbacks,
  type TextToSpeechAdapter,
} from './types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WebSpeechSTTAdapter implements SpeechToTextAdapter {
  readonly providerName = 'web-speech-api';
  private active: SpeechRecognitionInstance | null = null;

  isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  start(lang: SupportedLang, callbacks: STTCallbacks): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      callbacks.onError?.('unsupported', 'Web Speech Recognition is not supported in this browser.');
      return;
    }

    this.stop();

    const recognition = new Ctor();
    recognition.lang = LANG_TO_LOCALE[lang];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        const piece = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalTranscript += piece;
        } else {
          interim += piece;
        }
      }
      if (interim) callbacks.onInterim?.(`${finalTranscript}${interim}`.trim());
      if (finalTranscript.trim()) {
        callbacks.onFinal(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const code = event.error || 'unknown';
      const friendly: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. Please allow mic access or type your message.',
        'no-speech': 'No speech detected. Please speak clearly closer to the mic.',
        network: 'Network error during speech recognition. Please try typing.',
        aborted: 'Voice input stopped.',
      };
      callbacks.onError?.(code, friendly[code] ?? `Voice error: ${code}`);
    };

    recognition.onend = () => {
      this.active = null;
      callbacks.onEnd?.();
    };

    this.active = recognition;
    try {
      recognition.start();
    } catch {
      this.active = null;
      callbacks.onError?.('start-failed', 'Could not start microphone. Please try again.');
    }
  }

  stop(): void {
    if (this.active) {
      try {
        this.active.stop();
      } catch {
        // Ignore stop race
      }
      this.active = null;
    }
  }
}

/**
 * Strips markdown formatting & citation tags like [S1] before speaking aloud.
 */
export function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\[S\d+\]/g, '')
    .replace(/[*_`#>]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class WebSpeechTTSAdapter implements TextToSpeechAdapter {
  readonly providerName = 'web-speech-synthesis';

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  speak(text: string, lang: SupportedLang, onEnd?: () => void): void {
    if (!this.isSupported()) {
      onEnd?.();
      return;
    }
    this.stop();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleaned);
    const targetLocale = LANG_TO_LOCALE[lang];
    utterance.lang = targetLocale;
    utterance.rate = 0.96;

    const voices = window.speechSynthesis.getVoices();
    const matched =
      voices.find((v) => v.lang.toLowerCase() === targetLocale.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
      voices.find((v) => v.lang.toLowerCase().includes('in'));
    if (matched) {
      utterance.voice = matched;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
