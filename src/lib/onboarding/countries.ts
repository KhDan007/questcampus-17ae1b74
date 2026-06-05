// Country list for the Chapter 1 picker + naive education-system suggestion.
// MVP geographic scope (MVP_SPEC §4) is surfaced first; full list still searchable.

export type Country = { code: string; name: string };

// Education system auto-suggested from country (editable by the user).
const EDUCATION_SYSTEM: Record<string, string> = {
  US: "US High School Diploma",
  GB: "A-Levels / GCSE",
  DE: "Abitur",
  NL: "VWO / Dutch Diploma",
  FR: "Baccalauréat",
  ES: "Bachillerato",
  IT: "Diploma di Maturità",
  SE: "Swedish Gymnasium",
  NO: "Norwegian Vidaregåande",
  DK: "Danish Gymnasium",
  FI: "Finnish Ylioppilastutkinto",
  SG: "Singapore A-Levels / Polytechnic",
  JP: "Japanese Upper Secondary",
  KR: "Korean CSAT (Suneung)",
  CN: "Gaokao",
  HK: "HKDSE",
  MY: "STPM / Malaysian Matriculation",
  IN: "CBSE / ISC / State Board",
  CA: "Canadian High School Diploma",
  AU: "Australian ATAR",
};

export function suggestEducationSystem(code: string): string {
  return EDUCATION_SYSTEM[code] ?? "";
}

// MVP-scope countries surface first in the picker.
export const PRIORITY_CODES = new Set([
  "US", "GB", "DE", "NL", "FR", "ES", "IT", "SE", "NO", "DK", "FI",
  "SG", "JP", "KR", "CN", "HK", "MY",
]);

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" },
  { code: "MY", name: "Malaysia" },
  { code: "IN", name: "India" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "KE", name: "Kenya" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "TR", name: "Turkey" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "VN", name: "Vietnam" },
  { code: "TH", name: "Thailand" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "GR", name: "Greece" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "RO", name: "Romania" },
  { code: "NZ", name: "New Zealand" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
];

// Priority (MVP-scope) countries first, then the rest alphabetically.
export const SORTED_COUNTRIES: Country[] = [
  ...COUNTRIES.filter((c) => PRIORITY_CODES.has(c.code)),
  ...COUNTRIES.filter((c) => !PRIORITY_CODES.has(c.code)).sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
];
