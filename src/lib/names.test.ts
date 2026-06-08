import { describe, it, expect } from 'vitest';
import { tokensOf, nameMatches } from './names';

describe('tokensOf', () => {
  it('lowercases and splits on spaces', () => {
    expect(tokensOf('Jonathan Reyes')).toEqual(['jonathan', 'reyes']);
  });
  it('strips accents', () => {
    expect(tokensOf('María Peña')).toEqual(['maria', 'pena']);
  });
  it('strips punctuation/hyphens/apostrophes', () => {
    expect(tokensOf("O'Brien-Lee")).toEqual(['o', 'brien', 'lee']);
  });
  it('collapses extra whitespace', () => {
    expect(tokensOf('  Ana   Sofia ')).toEqual(['ana', 'sofia']);
  });
});

describe('nameMatches', () => {
  it('matches the exact full name', () => {
    expect(nameMatches('Jonathan Reyes', 'Jonathan Reyes')).toBe(true);
  });
  it('matches case- and accent-insensitively', () => {
    expect(nameMatches('María López', 'maria lopez')).toBe(true);
  });
  it('matches a partial (subset) name', () => {
    expect(nameMatches('Maria Del Carmen Lopez', 'Maria Lopez')).toBe(true);
  });
  it('matches a single stored word (mononym)', () => {
    expect(nameMatches('Madonna', 'Madonna')).toBe(true);
  });
  it('matches punctuation/space variants', () => {
    expect(nameMatches("O'Brien", 'OBrien')).toBe(true);
    expect(nameMatches("O'Brien", 'O Brien')).toBe(true);
    expect(nameMatches('Smith-Jones', 'Smith Jones')).toBe(true);
  });
  it('does NOT match a different person', () => {
    expect(nameMatches('Jonathan Reyes', 'Maria Lopez')).toBe(false);
  });
  it('rejects empty typed input', () => {
    expect(nameMatches('Jonathan Reyes', '')).toBe(false);
  });
});
