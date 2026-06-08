/**
 * Name normalization + matching for PIN login identity.
 *
 * Kept as a tiny pure module so it can be unit-tested and shared. The
 * login-with-pin Edge Function (Deno) keeps an identical copy — if you change
 * the algorithm here, mirror it there.
 */

const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Tokens of a name, accent/case/punctuation-insensitive. */
export function tokensOf(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Does the typed name plausibly identify the stored name? Matches either the
 * punctuation/space-insensitive whole ("OBrien" == "O'Brien") or a token subset
 * ("Maria Lopez" identifies "Maria Del Carmen Lopez").
 */
export function nameMatches(stored: string, typed: string): boolean {
  const ty = tokensOf(typed);
  if (!ty.length) return false;
  const st = tokensOf(stored);
  if (!st.length) return false;
  if (st.join('') === ty.join('')) return true;
  return ty.every((t) => st.includes(t));
}
