/** Supported UI languages. */
export type Locale = 'en' | 'es';

/**
 * A per-namespace translation dictionary. Each screen/component owns one file
 * exporting this shape; the keys are identical across `en` and `es`.
 */
export interface NsDict {
  en: Record<string, string>;
  es: Record<string, string>;
}
