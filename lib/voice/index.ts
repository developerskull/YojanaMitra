'use client';

import type { SpeechToTextAdapter, TextToSpeechAdapter } from './types';
import { WebSpeechSTTAdapter, WebSpeechTTSAdapter } from './web-speech';

let sttAdapter: SpeechToTextAdapter | null = null;
let ttsAdapter: TextToSpeechAdapter | null = null;

/**
 * Returns the active STT adapter (defaults to Web Speech API;
 * future Whisper / Google Cloud STT adapters can be registered via setVoiceAdapters).
 */
export function getSTTAdapter(): SpeechToTextAdapter {
  if (!sttAdapter) {
    sttAdapter = new WebSpeechSTTAdapter();
  }
  return sttAdapter;
}

export function getTTSAdapter(): TextToSpeechAdapter {
  if (!ttsAdapter) {
    ttsAdapter = new WebSpeechTTSAdapter();
  }
  return ttsAdapter;
}

export function registerVoiceAdapters(adapters: {
  stt?: SpeechToTextAdapter;
  tts?: TextToSpeechAdapter;
}): void {
  if (adapters.stt) sttAdapter = adapters.stt;
  if (adapters.tts) ttsAdapter = adapters.tts;
}

export type { SpeechToTextAdapter, TextToSpeechAdapter, STTCallbacks, VoiceLocale } from './types';
export { LANG_TO_LOCALE } from './types';
export { cleanTextForSpeech } from './web-speech';
