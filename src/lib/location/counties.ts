export const COUNTIES = [
  { name: "Antrim", country: "UK" },
  { name: "Armagh", country: "UK" },
  { name: "Carlow", country: "IE" },
  { name: "Cavan", country: "IE" },
  { name: "Clare", country: "IE" },
  { name: "Cork", country: "IE" },
  { name: "Donegal", country: "IE" },
  { name: "Down", country: "UK" },
  { name: "Dublin", country: "IE" },
  { name: "Fermanagh", country: "UK" },
  { name: "Galway", country: "IE" },
  { name: "Kerry", country: "IE" },
  { name: "Kildare", country: "IE" },
  { name: "Kilkenny", country: "IE" },
  { name: "Laois", country: "IE" },
  { name: "Leitrim", country: "IE" },
  { name: "Limerick", country: "IE" },
  { name: "Londonderry", country: "UK" },
  { name: "Longford", country: "IE" },
  { name: "Louth", country: "IE" },
  { name: "Mayo", country: "IE" },
  { name: "Meath", country: "IE" },
  { name: "Monaghan", country: "IE" },
  { name: "Offaly", country: "IE" },
  { name: "Roscommon", country: "IE" },
  { name: "Sligo", country: "IE" },
  { name: "Tipperary", country: "IE" },
  { name: "Tyrone", country: "UK" },
  { name: "Waterford", country: "IE" },
  { name: "Westmeath", country: "IE" },
  { name: "Wexford", country: "IE" },
  { name: "Wicklow", country: "IE" },
] as const;

export type County = (typeof COUNTIES)[number];
export type CountyName = County["name"];
export type CountryCode = County["country"];

export function getCounties(): County[] {
  return [...COUNTIES];
}

export function getCountyNames(country?: CountryCode): CountyName[] {
  if (!country) return COUNTIES.map((county) => county.name);
  return COUNTIES.filter((county) => county.country === country).map((county) => county.name);
}
