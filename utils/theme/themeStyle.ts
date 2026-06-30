import type React from 'react';
import type { ResolvedTheme } from './resolveTheme';
import { alpha } from './resolveTheme';
import type { TemplateStyleVariant } from '../style/styleVariants';

/**
 * نقطة الدمج الموحّدة بين نظام الثيمات ونظام الستايلات.
 * تُرجِع React.CSSProperties جاهزة تطبّق ألوان الثيم مع رموز الستايل على سطح القالب.
 * دالة نقية.
 */
export function getResolvedThemeStyle(
  theme: ResolvedTheme,
  style: TemplateStyleVariant,
): React.CSSProperties {
  const t = style.tokens;
  const glowAlpha = Math.max(0, Math.min(1, t.glowStrength));
  return {
    background: theme.bgGradient,
    border: `${t.borderWidth}px solid ${theme.border}`,
    borderRadius: t.radius,
    color: theme.text,
    boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 ${Math.round(40 + glowAlpha * 60)}px ${alpha(theme.glow, glowAlpha)}`,
    fontFamily: `${t.fontBody}, Inter, sans-serif`,
    transform: t.skew ? `skewX(${t.skew}deg)` : undefined,
    opacity: t.surfaceOpacity,
    overflow: 'hidden',
    position: 'relative',
  };
}

/** نمط الشريط البارز العلوي حسب الستايل والثيم. */
export function getAccentBarStyle(
  theme: ResolvedTheme,
  style: TemplateStyleVariant,
): React.CSSProperties {
  const kind = style.tokens.accentBarStyle;
  if (kind === 'solid') {
    return { background: theme.accent, height: 4 };
  }
  if (kind === 'glow-strip') {
    return {
      background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent}, ${theme.primary})`,
      height: 5,
      boxShadow: `0 0 18px ${alpha(theme.glow, 0.8)}`,
    };
  }
  // gradient (default)
  return {
    background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
    height: 4,
  };
}
