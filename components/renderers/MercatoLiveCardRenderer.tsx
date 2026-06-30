import React from 'react';
import type { RendererProps } from './SharedComponents';
import { useResolvedTheme, alpha } from '../../utils/theme/resolveTheme';
import { resolveStyleVariant } from '../../utils/style/styleVariants';
import { getResolvedThemeStyle, getAccentBarStyle } from '../../utils/theme/themeStyle';

/**
 * MercatoLiveCardRenderer — القالب المرجعي الكامل لمنصة قوالب الميركاتو.
 * يُثبت المنظومة كاملةً تعمل طرفاً لطرف:
 *  - الثيم يُطبَّق فعلياً على العرض (activeTheme / useResolvedTheme).
 *  - الستايل المتعدّد يغيّر التخطيط (styleVariant + رموز التصميم).
 *  - كل النصوص قابلة للتحرير من الإدارة (getField).
 *  - الصور/الشعارات تأتي من الجسر الموحّد (حقول playerImage/fromLogo/toLogo).
 * يصلح نمطاً مرجعياً لتحويل باقي رندرات الميركاتو.
 */
export const MercatoLiveCardRenderer: React.FC<RendererProps> = (props) => {
  const { config, getField, activeTheme, styleVariant } = props;

  // تدرّج آمن: نعتمد activeTheme المحقون من OverlayRenderer، وإلا نحلّه محلياً.
  const theme = activeTheme ?? useResolvedTheme(config);
  const style = styleVariant ?? resolveStyleVariant(config);
  const t = style.tokens;

  // نصوص قابلة للتحرير بالكامل (مع قيم افتراضية آمنة)
  const badgeText = String(getField('badgeText') ?? 'OFFICIAL · CONFIRMED');
  const headlineText = String(getField('headlineText') ?? 'DEAL OF THE DAY');
  const playerName = String(getField('playerName') ?? 'Anthony Gordon');
  const fromClub = String(getField('fromClub') ?? 'Newcastle United');
  const toClub = String(getField('toClub') ?? 'Barcelona');
  const fee = String(getField('fee') ?? '€80.0m');
  const marketValue = String(getField('marketValue') ?? '');
  const position = String(getField('position') ?? 'LW');
  const sourceText = String(getField('sourceText') ?? 'Transfermarkt');
  const channelName = String(getField('channelName') ?? 'REO SHOW');

  // أصول بصرية من الجسر الموحّد
  const playerImage = String(getField('playerImage') ?? '');
  const fromLogo = String(getField('fromLogo') ?? '');
  const toLogo = String(getField('toLogo') ?? '');

  const surface = getResolvedThemeStyle(theme, style);
  const accentBar = getAccentBarStyle(theme, style);

  const fallbackAvatar = (
    <div style={{
      width: 150, height: 150, borderRadius: '50%',
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.bgEnd})`,
      border: `4px solid ${theme.primary}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: `${t.fontDisplay}, Impact, sans-serif`, fontSize: 56, color: alpha(theme.primary, 0.6),
    }}>{position}</div>
  );

  return (
    <div style={{ ...surface, width: 1100, height: 600 }}>
      {/* الشريط العلوي البارز */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, ...accentBar }} />

      {/* هالة خلفية */}
      <div style={{
        position: 'absolute', top: -180, right: -120, width: 560, height: 560,
        background: `radial-gradient(circle, ${alpha(theme.glow, t.glowStrength * 0.4)}, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* الترويسة */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 40px 0' }}>
        <span style={{
          padding: '6px 16px', borderRadius: 8,
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
          color: '#0A1A3A', fontFamily: `${t.fontDisplay}, sans-serif`, fontSize: 18, letterSpacing: '0.1em',
          boxShadow: `0 4px 16px ${alpha(theme.glow, 0.5)}`,
        }}>{headlineText}</span>
        <span style={{ fontSize: 12, color: alpha(theme.text, 0.7), letterSpacing: '0.1em' }}>{badgeText}</span>
      </div>

      {/* المحتوى */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px', height: 'calc(100% - 110px)' }}>
        {/* النادي السابق */}
        <div style={{ flex: 1, textAlign: 'center', opacity: 0.9 }}>
          <div style={{ fontSize: 10, color: alpha(theme.text, 0.5), textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>From</div>
          {fromLogo
            ? <img src={fromLogo} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
            : <div style={{ fontFamily: `${t.fontDisplay}, sans-serif`, fontSize: 42, color: theme.text }}>{fromClub.slice(0, 3).toUpperCase()}</div>}
          <div style={{ fontFamily: `${t.fontDisplay}, sans-serif`, fontSize: 24, color: theme.text, marginTop: 10 }}>{fromClub}</div>
        </div>

        {/* اللاعب + القيمة */}
        <div style={{ flex: 1.5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {playerImage
            ? <img src={playerImage} alt="" style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${theme.primary}`, boxShadow: `0 0 50px ${alpha(theme.glow, t.glowStrength)}` }} />
            : fallbackAvatar}
          <h1 style={{ fontFamily: `${t.fontDisplay}, Impact, sans-serif`, fontSize: 52, color: theme.text, margin: '14px 0 4px', letterSpacing: '0.03em' }}>{playerName}</h1>
          <div style={{ fontSize: 12, color: alpha(theme.text, 0.6) }}>
            {position}{marketValue ? ` · القيمة ${marketValue}` : ''}
          </div>
          <div style={{
            marginTop: 16, padding: '12px 34px', borderRadius: t.radius,
            background: `linear-gradient(135deg, ${alpha(theme.primary, 0.18)}, ${alpha(theme.accent, 0.1)})`,
            border: `2px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 10, color: alpha(theme.primary, 0.85), textTransform: 'uppercase', letterSpacing: '0.16em' }}>Transfer Fee</div>
            <div style={{ fontFamily: `${t.fontDisplay}, Impact, sans-serif`, fontSize: 50, color: theme.primary, lineHeight: 1, textShadow: `0 0 24px ${alpha(theme.glow, 0.7)}` }}>{fee}</div>
          </div>
        </div>

        {/* النادي الجديد */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12, fontWeight: 700 }}>Welcome To</div>
          {toLogo
            ? <img src={toLogo} alt="" style={{ width: 110, height: 110, objectFit: 'contain' }} />
            : <div style={{ fontFamily: `${t.fontDisplay}, sans-serif`, fontSize: 46, color: theme.primary }}>{toClub.slice(0, 3).toUpperCase()}</div>}
          <div style={{ fontFamily: `${t.fontDisplay}, sans-serif`, fontSize: 28, color: theme.primary, marginTop: 10, textShadow: `0 0 16px ${alpha(theme.glow, 0.5)}` }}>{toClub}</div>
        </div>
      </div>

      {/* سطر المصدر */}
      <div style={{ position: 'absolute', bottom: 16, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: alpha(theme.text, 0.45), letterSpacing: '0.08em' }}>
        <span>SOURCE: {sourceText}</span>
        <span>{channelName} · #{style.id.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default MercatoLiveCardRenderer;
