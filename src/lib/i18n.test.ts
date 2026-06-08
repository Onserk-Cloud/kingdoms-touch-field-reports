import { describe, it, expect } from 'vitest';
import { translations } from './locales';

describe('i18n translations', () => {
  it('has identical key sets in EN and ES', () => {
    const en = Object.keys(translations.en).sort();
    const es = Object.keys(translations.es).sort();
    expect(es).toEqual(en);
  });

  it('has no empty values in either locale', () => {
    for (const loc of ['en', 'es'] as const) {
      for (const [key, value] of Object.entries(translations[loc])) {
        expect(value, `${loc}.${key} is empty`).toBeTruthy();
      }
    }
  });
});
