export type CurrencyGroupKey =
  | 'arab_gulf'
  | 'arab_levant'
  | 'arab_africa'
  | 'major_global'
  | 'asia'
  | 'europe'
  | 'americas'
  | 'africa'
  | 'other';

export interface CurrencyMeta {
  code: string;
  countryCode: string;
  countryAr: string;
  currencyAr: string;
  group: CurrencyGroupKey;
}

export const CURRENCY_GROUP_LABELS: Record<CurrencyGroupKey, string> = {
  arab_gulf: 'الخليج والعراق واليمن',
  arab_levant: 'بلاد الشام',
  arab_africa: 'شمال وشرق أفريقيا العربي',
  major_global: 'عملات عالمية رئيسية',
  asia: 'آسيا',
  europe: 'أوروبا',
  americas: 'الأمريكيتان',
  africa: 'أفريقيا',
  other: 'دول أخرى مهمة',
};

export const CURRENCY_CATALOG: CurrencyMeta[] = [
  { code: 'SAR', countryCode: 'SA', countryAr: 'السعودية', currencyAr: 'ريال سعودي', group: 'arab_gulf' },
  { code: 'AED', countryCode: 'AE', countryAr: 'الإمارات', currencyAr: 'درهم إماراتي', group: 'arab_gulf' },
  { code: 'KWD', countryCode: 'KW', countryAr: 'الكويت', currencyAr: 'دينار كويتي', group: 'arab_gulf' },
  { code: 'QAR', countryCode: 'QA', countryAr: 'قطر', currencyAr: 'ريال قطري', group: 'arab_gulf' },
  { code: 'BHD', countryCode: 'BH', countryAr: 'البحرين', currencyAr: 'دينار بحريني', group: 'arab_gulf' },
  { code: 'OMR', countryCode: 'OM', countryAr: 'عمان', currencyAr: 'ريال عماني', group: 'arab_gulf' },
  { code: 'IQD', countryCode: 'IQ', countryAr: 'العراق', currencyAr: 'دينار عراقي', group: 'arab_gulf' },
  { code: 'YER', countryCode: 'YE', countryAr: 'اليمن', currencyAr: 'ريال يمني', group: 'arab_gulf' },

  { code: 'JOD', countryCode: 'JO', countryAr: 'الأردن', currencyAr: 'دينار أردني', group: 'arab_levant' },
  { code: 'ILS', countryCode: 'PS', countryAr: 'فلسطين', currencyAr: 'شيكل', group: 'arab_levant' },
  { code: 'LBP', countryCode: 'LB', countryAr: 'لبنان', currencyAr: 'ليرة لبنانية', group: 'arab_levant' },
  { code: 'SYP', countryCode: 'SY', countryAr: 'سوريا', currencyAr: 'ليرة سورية', group: 'arab_levant' },

  { code: 'EGP', countryCode: 'EG', countryAr: 'مصر', currencyAr: 'جنيه مصري', group: 'arab_africa' },
  { code: 'SDG', countryCode: 'SD', countryAr: 'السودان', currencyAr: 'جنيه سوداني', group: 'arab_africa' },
  { code: 'LYD', countryCode: 'LY', countryAr: 'ليبيا', currencyAr: 'دينار ليبي', group: 'arab_africa' },
  { code: 'TND', countryCode: 'TN', countryAr: 'تونس', currencyAr: 'دينار تونسي', group: 'arab_africa' },
  { code: 'DZD', countryCode: 'DZ', countryAr: 'الجزائر', currencyAr: 'دينار جزائري', group: 'arab_africa' },
  { code: 'MAD', countryCode: 'MA', countryAr: 'المغرب', currencyAr: 'درهم مغربي', group: 'arab_africa' },
  { code: 'MRU', countryCode: 'MR', countryAr: 'موريتانيا', currencyAr: 'أوقية موريتانية', group: 'arab_africa' },
  { code: 'SOS', countryCode: 'SO', countryAr: 'الصومال', currencyAr: 'شلن صومالي', group: 'arab_africa' },
  { code: 'DJF', countryCode: 'DJ', countryAr: 'جيبوتي', currencyAr: 'فرنك جيبوتي', group: 'arab_africa' },
  { code: 'KMF', countryCode: 'KM', countryAr: 'جزر القمر', currencyAr: 'فرنك قمري', group: 'arab_africa' },

  { code: 'USD', countryCode: 'US', countryAr: 'الولايات المتحدة', currencyAr: 'دولار أمريكي', group: 'major_global' },
  { code: 'EUR', countryCode: 'EU', countryAr: 'الاتحاد الأوروبي', currencyAr: 'يورو', group: 'major_global' },
  { code: 'GBP', countryCode: 'GB', countryAr: 'بريطانيا', currencyAr: 'جنيه إسترليني', group: 'major_global' },
  { code: 'CHF', countryCode: 'CH', countryAr: 'سويسرا', currencyAr: 'فرنك سويسري', group: 'major_global' },
  { code: 'CAD', countryCode: 'CA', countryAr: 'كندا', currencyAr: 'دولار كندي', group: 'major_global' },
  { code: 'AUD', countryCode: 'AU', countryAr: 'أستراليا', currencyAr: 'دولار أسترالي', group: 'major_global' },
  { code: 'NZD', countryCode: 'NZ', countryAr: 'نيوزيلندا', currencyAr: 'دولار نيوزيلندي', group: 'major_global' },

  { code: 'JPY', countryCode: 'JP', countryAr: 'اليابان', currencyAr: 'ين ياباني', group: 'asia' },
  { code: 'CNY', countryCode: 'CN', countryAr: 'الصين', currencyAr: 'يوان صيني', group: 'asia' },
  { code: 'HKD', countryCode: 'HK', countryAr: 'هونغ كونغ', currencyAr: 'دولار هونغ كونغ', group: 'asia' },
  { code: 'SGD', countryCode: 'SG', countryAr: 'سنغافورة', currencyAr: 'دولار سنغافوري', group: 'asia' },
  { code: 'KRW', countryCode: 'KR', countryAr: 'كوريا الجنوبية', currencyAr: 'وون كوري', group: 'asia' },
  { code: 'INR', countryCode: 'IN', countryAr: 'الهند', currencyAr: 'روبية هندية', group: 'asia' },
  { code: 'PKR', countryCode: 'PK', countryAr: 'باكستان', currencyAr: 'روبية باكستانية', group: 'asia' },
  { code: 'BDT', countryCode: 'BD', countryAr: 'بنغلاديش', currencyAr: 'تاكا بنغلاديشية', group: 'asia' },
  { code: 'IDR', countryCode: 'ID', countryAr: 'إندونيسيا', currencyAr: 'روبية إندونيسية', group: 'asia' },
  { code: 'MYR', countryCode: 'MY', countryAr: 'ماليزيا', currencyAr: 'رينغيت ماليزي', group: 'asia' },
  { code: 'PHP', countryCode: 'PH', countryAr: 'الفلبين', currencyAr: 'بيزو فلبيني', group: 'asia' },
  { code: 'THB', countryCode: 'TH', countryAr: 'تايلاند', currencyAr: 'بات تايلاندي', group: 'asia' },
  { code: 'VND', countryCode: 'VN', countryAr: 'فيتنام', currencyAr: 'دونغ فيتنامي', group: 'asia' },
  { code: 'TRY', countryCode: 'TR', countryAr: 'تركيا', currencyAr: 'ليرة تركية', group: 'asia' },

  { code: 'RUB', countryCode: 'RU', countryAr: 'روسيا', currencyAr: 'روبل روسي', group: 'europe' },
  { code: 'UAH', countryCode: 'UA', countryAr: 'أوكرانيا', currencyAr: 'هريفنيا أوكرانية', group: 'europe' },
  { code: 'SEK', countryCode: 'SE', countryAr: 'السويد', currencyAr: 'كرونة سويدية', group: 'europe' },
  { code: 'NOK', countryCode: 'NO', countryAr: 'النرويج', currencyAr: 'كرونة نرويجية', group: 'europe' },
  { code: 'DKK', countryCode: 'DK', countryAr: 'الدنمارك', currencyAr: 'كرونة دنماركية', group: 'europe' },
  { code: 'PLN', countryCode: 'PL', countryAr: 'بولندا', currencyAr: 'زلوتي بولندي', group: 'europe' },
  { code: 'CZK', countryCode: 'CZ', countryAr: 'التشيك', currencyAr: 'كرونة تشيكية', group: 'europe' },
  { code: 'HUF', countryCode: 'HU', countryAr: 'المجر', currencyAr: 'فورنت مجري', group: 'europe' },
  { code: 'RON', countryCode: 'RO', countryAr: 'رومانيا', currencyAr: 'ليو روماني', group: 'europe' },

  { code: 'BRL', countryCode: 'BR', countryAr: 'البرازيل', currencyAr: 'ريال برازيلي', group: 'americas' },
  { code: 'MXN', countryCode: 'MX', countryAr: 'المكسيك', currencyAr: 'بيزو مكسيكي', group: 'americas' },
  { code: 'ARS', countryCode: 'AR', countryAr: 'الأرجنتين', currencyAr: 'بيزو أرجنتيني', group: 'americas' },
  { code: 'CLP', countryCode: 'CL', countryAr: 'تشيلي', currencyAr: 'بيزو تشيلي', group: 'americas' },
  { code: 'COP', countryCode: 'CO', countryAr: 'كولومبيا', currencyAr: 'بيزو كولومبي', group: 'americas' },

  { code: 'ZAR', countryCode: 'ZA', countryAr: 'جنوب أفريقيا', currencyAr: 'راند جنوب أفريقي', group: 'africa' },
  { code: 'NGN', countryCode: 'NG', countryAr: 'نيجيريا', currencyAr: 'نايرا نيجيرية', group: 'africa' },
  { code: 'KES', countryCode: 'KE', countryAr: 'كينيا', currencyAr: 'شلن كيني', group: 'africa' },
  { code: 'GHS', countryCode: 'GH', countryAr: 'غانا', currencyAr: 'سيدي غاني', group: 'africa' },
  { code: 'ETB', countryCode: 'ET', countryAr: 'إثيوبيا', currencyAr: 'بير إثيوبي', group: 'africa' },
  { code: 'TZS', countryCode: 'TZ', countryAr: 'تنزانيا', currencyAr: 'شلن تنزاني', group: 'africa' },
  { code: 'XAF', countryCode: 'CM', countryAr: 'وسط أفريقيا', currencyAr: 'فرنك CFA وسط أفريقيا', group: 'africa' },
  { code: 'XOF', countryCode: 'SN', countryAr: 'غرب أفريقيا', currencyAr: 'فرنك CFA غرب أفريقيا', group: 'africa' },

  { code: 'AZN', countryCode: 'AZ', countryAr: 'أذربيجان', currencyAr: 'مانات أذربيجاني', group: 'other' },
  { code: 'GEL', countryCode: 'GE', countryAr: 'جورجيا', currencyAr: 'لاري جورجي', group: 'other' },
  { code: 'KZT', countryCode: 'KZ', countryAr: 'كازاخستان', currencyAr: 'تنغي كازاخستاني', group: 'other' },
  { code: 'UZS', countryCode: 'UZ', countryAr: 'أوزبكستان', currencyAr: 'سوم أوزبكي', group: 'other' },
  { code: 'KGS', countryCode: 'KG', countryAr: 'قيرغيزستان', currencyAr: 'سوم قيرغيزستاني', group: 'other' },
  { code: 'AMD', countryCode: 'AM', countryAr: 'أرمينيا', currencyAr: 'درام أرميني', group: 'other' },
  { code: 'AFN', countryCode: 'AF', countryAr: 'أفغانستان', currencyAr: 'أفغاني', group: 'other' },
  { code: 'ALL', countryCode: 'AL', countryAr: 'ألبانيا', currencyAr: 'ليك ألباني', group: 'other' },
  { code: 'BAM', countryCode: 'BA', countryAr: 'البوسنة والهرسك', currencyAr: 'مارك بوسني', group: 'other' },
  { code: 'MDL', countryCode: 'MD', countryAr: 'مولدوفا', currencyAr: 'ليو مولدوفي', group: 'other' },
];

const CURRENCY_BY_CODE = new Map(CURRENCY_CATALOG.map(item => [item.code, item]));

export const normalizeCurrencyCode = (currency: string | undefined | null): string =>
  String(currency || 'USD').trim().toUpperCase();

export const getCurrencyMeta = (currency: string | undefined | null): CurrencyMeta | undefined =>
  CURRENCY_BY_CODE.get(normalizeCurrencyCode(currency));

export const flagEmoji = (countryCode: string | undefined | null): string => {
  const code = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return String.fromCodePoint(0x1F310);

  return Array.from(code)
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
};

export const getCurrencyFlag = (
  currency: string | undefined | null,
  countryCode?: string | null,
): string => flagEmoji(countryCode || getCurrencyMeta(currency)?.countryCode);

export const currencyOptionLabel = (meta: CurrencyMeta): string =>
  `${flagEmoji(meta.countryCode)} ${meta.countryAr} - ${meta.currencyAr} (${meta.code})`;

export const CURRENCY_GROUPED_OPTIONS = (Object.keys(CURRENCY_GROUP_LABELS) as CurrencyGroupKey[])
  .map(group => ({
    group,
    label: CURRENCY_GROUP_LABELS[group],
    options: CURRENCY_CATALOG.filter(item => item.group === group),
  }))
  .filter(group => group.options.length > 0);
