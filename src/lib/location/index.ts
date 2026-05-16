import AREAS_BY_COUNTY from "./areas";
import { getCounties, getCountyNames, type CountyName, type CountryCode } from "./counties";

export type Area = string;

export function getCountiesList(country?: CountryCode): CountyName[] {
  return getCountyNames(country);
}

// Synchronous lookup. The underlying AREAS_BY_COUNTY map is a static module
// import — there is no real async work. A sync variant lets <AreaSelect>
// compute the options on first render, which is required so the `<select>`'s
// selected `<option>` exists at first paint (otherwise the dropdown text
// briefly shows the placeholder, then "swaps" to the real area on the next
// render tick — the subtle dropdown repaint reported on /dashboard/settings).
export function getAreasByCountySync(county?: string): Area[] {
  if (!county) return [];
  const key = String(county);
  const foundKey = Object.keys(AREAS_BY_COUNTY).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return (AREAS_BY_COUNTY[foundKey ?? key] ?? []) as Area[];
}

export async function getAreasByCounty(county?: string): Promise<Area[]> {
  // Kept async for API compatibility with callers that already `await` it.
  // Internally delegates to the sync lookup.
  return getAreasByCountySync(county);
}

export function isValidCounty(county?: string): boolean {
  if (!county) return false;
  return getCounties().some((c) => c.name.toLowerCase() === county.toLowerCase());
}

export async function isValidArea(county?: string, area?: string): Promise<boolean> {
  if (!county || !area) return false;
  const areas = await getAreasByCounty(county);
  return areas.some((a) => a.toLowerCase() === area.toLowerCase());
}

