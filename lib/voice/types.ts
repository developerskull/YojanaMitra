import type { SupportedLang } from '@/lib/schemes/schema';

export type VoiceLocale = 'en-IN' | 'hi-IN' | 'mr-IN';

export const LANG_TO_LOCALE: Record<SupportedLang, VoiceLocale> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export interface STTCallbacks {
  onInterim?: (transcript: string) => void;
  onFinal: (transcript: string) => void;
  onError?: (code: string, message: string) => void;
  onEnd?: () => void;
}

/**
 * Provider-agnostic Speech-to-Text interface.
 * Default implementation uses browser Web Speech API; Whisper or Google Cloud STT
 * can be swapped in behind this interface without changing UI code.
 */
export interface SpeechToTextAdapter {
  readonly providerName: string;
  isSupported(): boolean;
  start(lang: SupportedLang, callbacks: STTCallbacks): void;
  stop(): void;
}

/**
 * Provider-agnostic Text-to-Speech interface.
 * Default implementation uses window.speechSynthesis; Google Cloud TTS or ElevenLabs
 * can be plugged in behind this interface later.
 */
export interface TextToSpeechAdapter {
  readonly providerName: string;
  isSupported(): boolean;
  speak(text: string, lang: SupportedLang, onEnd?: () => void): void;
  stop(): void;
}
