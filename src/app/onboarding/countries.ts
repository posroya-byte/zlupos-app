export const countries = {
  EG: { name: "مصر", dialCode: "+20", currencyCode: "EGP", currencySymbol: "ج.م", timezone: "Africa/Cairo" },
  AE: { name: "الإمارات", dialCode: "+971", currencyCode: "AED", currencySymbol: "د.إ", timezone: "Asia/Dubai" },
  SA: { name: "السعودية", dialCode: "+966", currencyCode: "SAR", currencySymbol: "ر.س", timezone: "Asia/Riyadh" },
  QA: { name: "قطر", dialCode: "+974", currencyCode: "QAR", currencySymbol: "ر.ق", timezone: "Asia/Qatar" },
  KW: { name: "الكويت", dialCode: "+965", currencyCode: "KWD", currencySymbol: "د.ك", timezone: "Asia/Kuwait" },
  OM: { name: "عمان", dialCode: "+968", currencyCode: "OMR", currencySymbol: "ر.ع", timezone: "Asia/Muscat" },
  BH: { name: "البحرين", dialCode: "+973", currencyCode: "BHD", currencySymbol: "د.ب", timezone: "Asia/Bahrain" },
  JO: { name: "الأردن", dialCode: "+962", currencyCode: "JOD", currencySymbol: "د.أ", timezone: "Asia/Amman" },
  INTL: { name: "دول المشرق / العالم", dialCode: "+1", currencyCode: "USD", currencySymbol: "$", timezone: "UTC" },
} as const;

export type CountryCode = keyof typeof countries;

export function detectCountryCode(timezone: string): CountryCode {
  return (Object.keys(countries) as CountryCode[]).find((code) => countries[code].timezone === timezone) ?? "INTL";
}