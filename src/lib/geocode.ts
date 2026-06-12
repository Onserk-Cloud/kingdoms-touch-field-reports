/**
 * Reverse geocoding: GPS coordinates → human-readable address.
 *
 * Primary: OpenStreetMap Nominatim (street-level, no key; fine for this
 * team's volume — the browser sends the app's Referer as identification).
 * Fallback: BigDataCloud's free client endpoint (locality-level, no key).
 * Results are cached per coordinate so a report is only looked up once.
 */

const cache = new Map<string, string | null>();

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  postcode?: string;
}

function composeAddress(a: NominatimAddress): string | null {
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const locality = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb;
  const parts = [street, locality, a.state, a.postcode].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: string,
): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)},${lang}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let result: string | null = null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const j = (await res.json()) as {
        address?: NominatimAddress;
        display_name?: string;
      };
      result = j.address ? composeAddress(j.address) : null;
      if (!result && j.display_name) {
        result = j.display_name.split(',').slice(0, 4).join(',').trim();
      }
    }
  } catch {
    /* fall through to fallback */
  }

  if (!result) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${lang}`,
      );
      if (res.ok) {
        const j = (await res.json()) as {
          locality?: string;
          city?: string;
          principalSubdivision?: string;
          postcode?: string;
        };
        const parts = [
          j.locality ?? j.city,
          j.principalSubdivision,
          j.postcode,
        ].filter(Boolean);
        result = parts.length ? parts.join(', ') : null;
      }
    } catch {
      result = null;
    }
  }

  cache.set(key, result);
  return result;
}

/** Universal "open this point in the maps app" URL (Google Maps; on iPhone it
 *  opens the Google Maps app if installed, else the browser map). */
export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
