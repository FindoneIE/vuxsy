import AREAS_BY_COUNTY from "./areas";
import { getCounties, getCountyNames, type CountyName, type CountryCode } from "./counties";

export type Area = string;

export function getCountiesList(country?: CountryCode): CountyName[] {
  return getCountyNames(country);
}

export async function getAreasByCounty(county?: string): Promise<Area[]> {
  // Lazy access: in case this becomes a remote call later, keep API async
  if (!county) return [];
  // Prefer exact match key; areas module loaded above but access is deferred
  const key = String(county);
  // perform case-insensitive lookup against the AREAS_BY_COUNTY keys
  const foundKey = Object.keys(AREAS_BY_COUNTY).find((k) => k.toLowerCase() === key.toLowerCase());
  return (AREAS_BY_COUNTY[foundKey ?? key] ?? []) as Area[];
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

