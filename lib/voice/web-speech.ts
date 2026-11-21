'use client';

import type { SupportedLang } from '@/lib/schemes/schema';
import { cleanTextForSpeech } from './utils';
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

export { cleanTextForSpeech } from './utils';

export class WebSpeechTTSAdapter implements TextToSpeechAdapter {
  readonly providerName = 'hybrid-indic-tts';
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private abortController: AbortController | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  speak(text: string, lang: SupportedLang, onEnd?: () => void): void {
    this.stop();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
      onEnd?.();
      return;
    }

    // 1. Primary High-Definition Indic TTS Audio (native Marathi / Hindi / English MP3)
    const controller = new AbortController();
    this.abortController = controller;

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleaned, lang }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`TTS API returned ${res.status}`);
        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const audioUrl = URL.createObjectURL(blob);
        this.currentAudioUrl = audioUrl;
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          this.cleanup();
          onEnd?.();
        };
        audio.onerror = () => {
          this.cleanup();
          this.fallbackSpeechSynthesis(cleaned, lang, onEnd);
        };

        await audio.play();
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn(
          '[TTS] High-fidelity Indic audio failed, using browser speech synthesis fallback:',
          err
        );
        this.fallbackSpeechSynthesis(cleaned, lang, onEnd);
      });
  }

  /**
   * Safe offline / in-browser fallback.
   * If Marathi voice ('mr-IN') is not installed in the browser/OS, falls back to
   * Hindi ('hi-IN') which uses the exact same Devanagari script phonetics.
   * NEVER falls back to English for Devanagari text.
   */
  private fallbackSpeechSynthesis(
    cleaned: string,
    lang: SupportedLang,
    onEnd?: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const targetLocale = LANG_TO_LOCALE[lang];
    utterance.lang = targetLocale;
    utterance.rate = 0.95;

    const speakUtterance = () => {
      const voices = window.speechSynthesis.getVoices();
      let matched: SpeechSynthesisVoice | undefined;

      if (lang === 'mr') {
        matched =
          voices.find(
            (v) => v.lang.toLowerCase() === 'mr-in' || v.lang.toLowerCase() === 'mr'
          ) ??
          voices.find(
            (v) => v.lang.toLowerCase() === 'hi-in' || v.lang.toLowerCase() === 'hi'
          );
      } else if (lang === 'hi') {
        matched =
          voices.find(
            (v) => v.lang.toLowerCase() === 'hi-in' || v.lang.toLowerCase() === 'hi'
          ) ??
          voices.find(
            (v) => v.lang.toLowerCase() === 'mr-in' || v.lang.toLowerCase() === 'mr'
          );
      } else {
        matched =
          voices.find((v) => v.lang.toLowerCase() === 'en-in') ??
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      }

      if (matched) {
        utterance.voice = matched;
        utterance.lang = matched.lang;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakUtterance();
      };
    } else {
      speakUtterance();
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Safe no-op
      }
      this.currentAudio = null;
    }
    this.cleanup();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private cleanup(): void {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
  }
}

export { WebSpeechTTSAdapter as HybridTTSAdapter };
