import { INITIAL_TEMPLATES } from '../constants';
import { OverlayConfig, OverlayType } from '../types';

export interface TemplateMeta {
  id: string;
  icon: string;
  accent: string;
  description: string;
  group: string;
}

const LEGACY_HIDDEN_TEMPLATE_IDS = new Set(['template-election']);

const FALLBACK_TEMPLATE_META: Record<OverlayType, Omit<TemplateMeta, 'id' | 'group'>> = {
  [OverlayType.LEADERBOARD]: {
    icon: 'LDR',
    accent: '#f59e0b',
    description: 'لوحة داعمين متحركة مناسبة للبث المباشر.',
  },
  [OverlayType.SMART_NEWS]: {
    icon: 'AI',
    accent: '#8b5cf6',
    description: 'تحويل النصوص الطويلة إلى شرائح أخبار ذكية.',
  },
  [OverlayType.SCOREBOARD]: {
    icon: 'SCO',
    accent: '#3b82f6',
    description: 'نتائج المباريات والاسكور بشكل مباشر.',
  },
  [OverlayType.TICKER]: {
    icon: 'TIC',
    accent: '#ef4444',
    description: 'شريط أخبار عاجلة سريع أسفل البث.',
  },
  [OverlayType.LOWER_THIRD]: {
    icon: 'LT',
    accent: '#10b981',
    description: 'تعريف ضيف أو مذيع بأسلوب عملي.',
  },
  [OverlayType.ALERT]: {
    icon: 'ALT',
    accent: '#f97316',
    description: 'تنبيهات مباشرة داخل البث.',
  },
  [OverlayType.EXCLUSIVE_ALERT]: {
    icon: 'EX',
    accent: '#dc2626',
    description: 'خبر حصري بصيغة سريعة وواضحة.',
  },
  [OverlayType.GUESTS]: {
    icon: 'GST',
    accent: '#60a5fa',
    description: 'قالب ضيوف متعدد بأساليب مختلفة.',
  },
  [OverlayType.UCL_DRAW]: {
    icon: 'UCL',
    accent: '#38bdf8',
    description: 'قالب قرعة دوري الأبطال.',
  },
  [OverlayType.ELECTION]: {
    icon: 'BCN',
    accent: '#a50044',
    description: 'قوالب انتخابات برشلونة 2026 للبث المباشر.',
  },
  [OverlayType.SOCIAL_MEDIA]: {
    icon: 'SOC',
    accent: '#1da1f2',
    description: 'عرض تعليقات أو تغريدات من منصات التواصل الاجتماعي.',
  },
  [OverlayType.TODAYS_EPISODE]: {
    icon: 'EPI',
    accent: '#f59e0b',
    description: 'عرض محاور الحلقة (لاعبين، مدربين، مواضيع) من 1 إلى 8 عناصر.',
  },
  [OverlayType.PLAYER_PROFILE]: {
    icon: 'PLY',
    accent: '#3b82f6',
    description: 'بطاقة إحصائيات وتقييم لاعب بصورة متحركة.',
  },
};

const cloneOverlay = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

export const getTemplateMeta = (overlay: OverlayConfig): TemplateMeta => {
  const fallback = FALLBACK_TEMPLATE_META[overlay.type];

  return {
    id: overlay.templateId || overlay.id,
    icon: overlay.templateIcon || fallback.icon,
    accent: overlay.templateAccent || fallback.accent,
    description: overlay.templateDescription || fallback.description,
    group: overlay.templateGroup || overlay.type,
  };
};

export const getVisibleTemplates = (): OverlayConfig[] =>
  INITIAL_TEMPLATES.filter(template => !LEGACY_HIDDEN_TEMPLATE_IDS.has(template.id)).sort((left, right) => {
    if ((left.templateGroup || '') === 'BARCELONA_2026' && (right.templateGroup || '') !== 'BARCELONA_2026') {
      return -1;
    }

    if ((left.templateGroup || '') !== 'BARCELONA_2026' && (right.templateGroup || '') === 'BARCELONA_2026') {
      return 1;
    }

    return left.name.localeCompare(right.name, 'ar');
  });

export const resolveTemplateById = (templateId: string): OverlayConfig => {
  return (
    INITIAL_TEMPLATES.find(template => template.id === templateId || template.templateId === templateId) ||
    INITIAL_TEMPLATES.find(template => template.type === (templateId as OverlayType)) ||
    INITIAL_TEMPLATES[0]
  );
};

export const createOverlayFromTemplate = (
  templateId: string,
  existingOverlays: OverlayConfig[]
): OverlayConfig => {
  const template = cloneOverlay(resolveTemplateById(templateId));
  const baseTemplateId = template.templateId || template.id;
  const sameTemplateCount =
    existingOverlays.filter(overlay => (overlay.templateId || overlay.id) === baseTemplateId).length + 1;

  return {
    ...template,
    id: `instance-${Date.now()}`,
    templateId: baseTemplateId,
    name: sameTemplateCount > 1 ? `${template.name} #${sameTemplateCount}` : template.name,
    isVisible: false,
    createdAt: Date.now(),
  };
};
