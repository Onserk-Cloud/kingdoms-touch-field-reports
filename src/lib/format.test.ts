import { describe, it, expect } from 'vitest';
import { formatGps, initialsOf, shortReportId } from './format';

describe('formatGps', () => {
  it('formats northern / western hemisphere (Orlando)', () => {
    expect(formatGps(28.5383, -81.3792)).toBe('28.5383° N · 81.3792° W');
  });
  it('formats southern / eastern hemisphere', () => {
    expect(formatGps(-12.5, 130.8)).toBe('12.5000° S · 130.8000° E');
  });
});

describe('initialsOf', () => {
  it('takes the first two initials, uppercased', () => {
    expect(initialsOf('Jonathan Reyes')).toBe('JR');
    expect(initialsOf('ana sofia lopez')).toBe('AS');
  });
  it('handles a single name', () => {
    expect(initialsOf('Madonna')).toBe('M');
  });
});

describe('shortReportId', () => {
  it('builds a KT-YYYY-XXXX id from the id tail', () => {
    expect(shortReportId('abc123-def456-7890')).toMatch(/^KT-\d{4}-7890$/);
  });
});
