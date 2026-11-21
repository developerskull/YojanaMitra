/**
 * Strips markdown formatting, citation tags like [S1], and URLs before speaking aloud.
 * Safe for both Server and Client environments.
 */
export function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\[S\d+\]/g, '')
    .replace(/[*_`#>]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
