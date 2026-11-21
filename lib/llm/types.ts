import { z } from 'zod';

export type LLMProviderName = 'gemini' | 'openai' | 'anthropic' | 'none';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  thinkingBudget?: number;
  modelOverride?: string;
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  isConfigured(): boolean;
  generateText(options: LLMGenerateOptions): Promise<string>;
  generateJSON<T>(options: LLMGenerateOptions, schema: z.ZodType<T>): Promise<T | null>;
  streamText(options: LLMGenerateOptions): AsyncIterable<string>;
  embed(texts: string[]): Promise<number[][] | null>;
}
