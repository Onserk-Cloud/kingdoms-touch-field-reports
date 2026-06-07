/* One-off i18n integrity check: used keys vs defined keys, and en/es parity. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { translations } from '../src/lib/locales/index';

const enKeys = new Set(Object.keys(translations.en));
const esKeys = new Set(Object.keys(translations.es));

const missingEs = [...enKeys].filter((k) => !esKeys.has(k)).sort();
const missingEn = [...esKeys].filter((k) => !enKeys.has(k)).sort();

const used = new Set<string>();
function walk(dir: string) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (!p.replace(/\\/g, '/').includes('lib/locales')) walk(p);
    } else if (/\.tsx?$/.test(p)) {
      const src = readFileSync(p, 'utf8');
      const re = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) used.add(m[1]);
    }
  }
}
walk('src');

const usedUndefined = [...used].filter((k) => !enKeys.has(k)).sort();
const definedUnused = [...enKeys].filter((k) => !used.has(k)).sort();

console.log(`EN keys: ${enKeys.size} | ES keys: ${esKeys.size} | used in code: ${used.size}`);
console.log('en/es parity — keys missing in ES:', missingEs);
console.log('en/es parity — keys missing in EN:', missingEn);
console.log('USED but UNDEFINED (these render raw — BUGS):', usedUndefined);
console.log('Defined but unused (harmless):', definedUnused);
const ok = !missingEs.length && !missingEn.length && !usedUndefined.length;
console.log(ok ? 'I18N CHECK: PASS' : 'I18N CHECK: FAIL');
