import { OverlayConfig, OverlayType } from '../../types';

/**
 * نظام الستايلات (TemplateStyleVariant) لقوالب الميركاتو.
 * يمنح كل قالب عدّة تخطيطات بصرية قابلة للاختيار من الإدارة، عبر سجلّ مركزي قابل للتوسعة.
 * مستوحى من دليل التصميم البصري Reo_Show_Broadcast_Design_Guide.pdf.
 */

/** رموز التصميم القابلة للضبط لكل ستايل. */
export interface StyleTokens {
  radius: number;
  borderWidth: number;
  glowStrength: number;       // 0..1
  skew: number;               // زاوية القصّ المائل (deg)
  fontDisplay: string;
  fontBody: string;
  density: 'compact' | 'regular' | 'spacious';
  surfaceOpacity: number;     // 0..1
  accentBarStyle: 'solid' | 'gradient' | 'glow-strip';
}

export interface TemplateStyleVariant {
  id: string;
  labelAr: string;
  description: string;
  tokens: StyleTokens;
  recommendedThemes?: string[];
}

/** الستايلات الأساسية المشتركة (مستوحاة من دليل العلامة). */
export const BASE_VARIANTS: TemplateStyleVariant[] = [
  {
    id: 'classic',
    labelAr: 'كلاسيكي',
    description: 'بثّي متوازن: حواف معتدلة، شريط متدرّج، توهّج خفيف.',
    tokens: { radius: 18, borderWidth: 1, glowStrength: 0.45, skew: 0, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'regular', surfaceOpacity: 0.96, accentBarStyle: 'gradient' },
    recommendedThemes: ['gold-dark', 'neon-cyan'],
  },
  {
    id: 'bold',
    labelAr: 'جريء',
    description: 'حدود سميكة وتباين عالٍ وقصّ خفيف — حضور قوي على الشاشة.',
    tokens: { radius: 10, borderWidth: 2, glowStrength: 0.65, skew: -4, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'regular', surfaceOpacity: 0.97, accentBarStyle: 'solid' },
    recommendedThemes: ['crimson', 'sunset-orange'],
  },
  {
    id: 'minimal',
    labelAr: 'بسيط',
    description: 'نظيف وهادئ: بلا قصّ، توهّج منخفض، مساحة واسعة.',
    tokens: { radius: 14, borderWidth: 1, glowStrength: 0.20, skew: 0, fontDisplay: 'Inter', fontBody: 'Inter', density: 'spacious', surfaceOpacity: 0.92, accentBarStyle: 'solid' },
    recommendedThemes: ['minimal-white', 'emerald'],
  },
  {
    id: 'cinematic',
    labelAr: 'سينمائي',
    description: 'تدرّج داكن + قصّ مائل + هالة قوية، مستوحى من دليل العلامة.',
    tokens: { radius: 4, borderWidth: 2, glowStrength: 0.85, skew: -8, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'spacious', surfaceOpacity: 0.92, accentBarStyle: 'glow-strip' },
    recommendedThemes: ['gold-dark', 'crimson', 'royal-purple'],
  },
];

export const MERCATO_BROADCAST_VARIANTS: TemplateStyleVariant[] = [
  ...BASE_VARIANTS,
  {
    id: 'editorial_split',
    labelAr: 'تحريري منقسم',
    description: 'صورة اللاعب تقود اللقطة مع مسار انتقال واضح: النادي الحالي يسارًا والوجهة يمينًا.',
    tokens: { radius: 16, borderWidth: 2, glowStrength: 0.58, skew: -3, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'regular', surfaceOpacity: 0.94, accentBarStyle: 'gradient' },
    recommendedThemes: ['neon-cyan', 'emerald'],
  },
  {
    id: 'deal_room',
    labelAr: 'غرفة الصفقة',
    description: 'لوحة استخبارات كروية بسطوح داكنة ومؤشرات واضحة للرسوم والقيمة والمصادر.',
    tokens: { radius: 8, borderWidth: 2, glowStrength: 0.72, skew: -6, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'compact', surfaceOpacity: 0.97, accentBarStyle: 'glow-strip' },
    recommendedThemes: ['gold-dark', 'crimson'],
  },
  {
    id: 'social_story',
    labelAr: 'قصة اجتماعية',
    description: 'ترتيب عمودي سريع للريلز والستوري مع أرقام كبيرة ومساحات صور أكثر جرأة.',
    tokens: { radius: 20, borderWidth: 1, glowStrength: 0.5, skew: 0, fontDisplay: 'Bebas Neue', fontBody: 'Inter', density: 'spacious', surfaceOpacity: 0.9, accentBarStyle: 'gradient' },
    recommendedThemes: ['sunset-orange', 'royal-purple'],
  },
  {
    id: 'clean_wire',
    labelAr: 'سلك إخباري نظيف',
    description: 'نسخة شديدة الوضوح للعرض السريع: أقل زخرفة، أكبر قراءة، وبيانات مرتبة.',
    tokens: { radius: 6, borderWidth: 1, glowStrength: 0.18, skew: 0, fontDisplay: 'Inter', fontBody: 'Inter', density: 'compact', surfaceOpacity: 0.98, accentBarStyle: 'solid' },
    recommendedThemes: ['minimal-white', 'neon-cyan'],
  },
];

/** ستايل احتياطي عام يضمن عدم انهيار أي قالب. */
export const FALLBACK_VARIANT: TemplateStyleVariant = BASE_VARIANTS[0];

/**
 * السجلّ المركزي: لكل نوع قالب قائمة ستايلات.
 * الإضافة = عنصر جديد في المصفوفة فقط، دون لمس شيفرة الرندرة.
 * عائلات الميركاتو تشترك في BASE_VARIANTS افتراضياً؛ يمكن تخصيص أي نوع لاحقاً.
 */
export const STYLE_VARIANT_REGISTRY: Partial<Record<OverlayType, TemplateStyleVariant[]>> = {
  [OverlayType.MERCATO_LIVE_CARD]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_UNIFIED]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_MEDIA_STORY]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_AGENT_CALL]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_DEAL_TIMELINE]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_BUDGET_TRACKER]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_DEADLINE_DAY]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.MERCATO_X_RAY]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.BREAKING_HERE_WE_GO]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.TRANSFER_NEWS]: MERCATO_BROADCAST_VARIANTS,
  [OverlayType.TRANSFER_TARGETS]: MERCATO_BROADCAST_VARIANTS,
};

/** قائمة الستايلات المتاحة لنوع — تُغذّي منتقي الستايل في الإدارة. */
export function listVariantsFor(type: OverlayType): TemplateStyleVariant[] {
  const list = STYLE_VARIANT_REGISTRY[type];
  return list && list.length ? list : BASE_VARIANTS;
}

/** الستايل الافتراضي لنوع (أول عنصر). */
export function getDefaultVariant(type: OverlayType): TemplateStyleVariant {
  const list = STYLE_VARIANT_REGISTRY[type];
  return list && list.length ? list[0] : FALLBACK_VARIANT;
}

function findStyleVariantId(config: OverlayConfig): string | null {
  const field = config?.fields?.find(f => f.id === 'styleVariant');
  const raw = field?.value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/**
 * يحلّ الستايل الفعّال من حقل styleVariant مع تدرّج آمن.
 * يُرجِع دائماً عنصراً ضمن listVariantsFor(type) ∪ {FALLBACK}.
 * دالة نقية.
 */
export function resolveStyleVariant(config: OverlayConfig): TemplateStyleVariant {
  const variants = STYLE_VARIANT_REGISTRY[config?.type];
  if (!variants || !variants.length) return FALLBACK_VARIANT;
  const selectedId = findStyleVariantId(config);
  for (const v of variants) {
    if (v.id === selectedId) return v;
  }
  return variants[0];
}
