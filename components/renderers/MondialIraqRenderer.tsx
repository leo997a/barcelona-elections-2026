/**
 * MondialIraqRenderer.tsx — قوالب المنتخب العراقي 🇮🇶
 *
 * قسم خاص بالمنتخب العراقي في مونديال 2026
 * 5 قوالب احترافية بهوية العلم العراقي
 *
 * Variants:
 *   squad_card      — بطاقة التشكيلة
 *   player_spotlight — تسليط الضوء على لاعب
 *   match_ticker    — شريط أخبار المنتخب
 *   history_moment  — لحظة تاريخية
 *   fan_pulse       — نبض المشجعين
 */

import React, { useState, useEffect } from 'react';
import {
  getMondialTheme,
  MondialTheme,
  MondialHeader,
  MondialPill,
  MondialBar,
  MondialLiveBadge,
  MondialWaveform,
  MondialRating,
  MondialFieldCard,
  TrophyIcon,
  MONDIAL_KEYFRAMES,
  safeParse,
  clamp,
  MondialFlag,
} from './MondialSharedComponents';
import { MondialRendererProps } from './Mondial2026Renderer';
import {
  ReoObsIraqDashboard,
  ReoObsIraqFanPulse,
  ReoObsIraqHistory,
  ReoObsIraqPlayerSpotlight,
  ReoObsIraqSquad,
  ReoObsIraqTicker,
} from './MondialObsTemplates';

// ─── بيانات تجريبية للعراق ───────────────────────────────────────────────────

const IRAQ_DEMO_SQUAD = [
  // الحراسة
  { number: 1, name: 'جلال حسن', pos: 'GK', rating: 7.8, goals: 0, assists: 0 },
  // الدفاع
  { number: 5, name: 'علي فاضل', pos: 'RB', rating: 7.2, goals: 0, assists: 1 },
  { number: 4, name: 'محمد حميد', pos: 'CB', rating: 7.5, goals: 0, assists: 0 },
  { number: 3, name: 'حسين علي', pos: 'CB', rating: 7.3, goals: 1, assists: 0 },
  { number: 6, name: 'علي عدنان', pos: 'LB', rating: 7.9, goals: 0, assists: 2 },
  // الوسط
  { number: 8, name: 'علي جاسم', pos: 'CM', rating: 7.4, goals: 1, assists: 1 },
  { number: 10, name: 'محمد قاسم', pos: 'AM', rating: 8.1, goals: 2, assists: 3 },
  { number: 6, name: 'باسم قاسم', pos: 'CM', rating: 7.6, goals: 0, assists: 2 },
  // الهجوم
  { number: 7, name: 'منير جبر', pos: 'RW', rating: 7.7, goals: 1, assists: 1 },
  { number: 9, name: 'أيمن حسين', pos: 'CF', rating: 8.8, goals: 4, assists: 1 },
  { number: 11, name: 'علي أحمد', pos: 'LW', rating: 7.5, goals: 2, assists: 0 },
];

const IRAQ_HISTORY = [
  { year: '2026', event: 'أول ظهور في كأس العالم', icon: '🏆' },
  { year: '1986', event: 'كأس العالم المكسيك — المجموعات', icon: '⭐' },
  { year: '2007', event: 'بطل كأس آسيا', icon: '🥇' },
  { year: '1988', event: 'بطل الألعاب العربية', icon: '🏅' },
];

// ─── المحرك الرئيسي للعراق ───────────────────────────────────────────────────

export const MondialIraqRenderer: React.FC<MondialRendererProps> = ({
  getField,
  containerStyle,
  contentWrapperStyle,
}) => {
  const variant = String(getField('iraqVariant') || 'player_spotlight');
  // العراق يستخدم ثيمه الخاص دائماً
  const t = getMondialTheme('IRAQ_PRIDE');

  return (
    <div style={containerStyle}>
      <style>{MONDIAL_KEYFRAMES}</style>
      <div style={contentWrapperStyle}>
        <div
          className="w-full h-full relative"
          style={{ background: variant === 'match_ticker' ? 'transparent' : t.bg, fontFamily: "'Tajawal', 'Inter', sans-serif" }}
        >
          {variant === 'squad_card' && <ReoObsIraqSquad t={t} getField={getField} />}
          {variant === 'player_spotlight' && <ReoObsIraqPlayerSpotlight t={t} getField={getField} />}
          {variant === 'match_ticker' && <ReoObsIraqTicker t={t} getField={getField} />}
          {variant === 'history_moment' && <ReoObsIraqHistory t={t} getField={getField} />}
          {variant === 'fan_pulse' && <ReoObsIraqFanPulse t={t} getField={getField} />}
          {variant === 'iraq_dashboard' && <ReoObsIraqDashboard t={t} getField={getField} />}
        </div>
      </div>
    </div>
  );
};

// ─── مكون زخرفي: نجمة العراق ────────────────────────────────────────────────

const IraqStar: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#FFD700' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
);

// ─── 1. بطاقة التشكيلة ───────────────────────────────────────────────────────

interface IraqVariantProps {
  t: MondialTheme;
  getField: (id: string) => unknown;
}

const IraqSquadVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const formation = String(getField('formation') || '4-3-3');
  const squadRaw = String(getField('squadJson') || '[]');
  const squad = safeParse<typeof IRAQ_DEMO_SQUAD>(squadRaw, IRAQ_DEMO_SQUAD);
  const showSquad = squad.length > 0 ? squad : IRAQ_DEMO_SQUAD;
  const matchLabel = String(getField('matchLabel') || 'العراق vs الأرجنتين · المجموعة C');
  const coachName = String(getField('coachName') || 'المدرب الوطني');

  const positionGroups = {
    GK: showSquad.filter(p => p.pos === 'GK'),
    DEF: showSquad.filter(p => ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p.pos)),
    MID: showSquad.filter(p => ['CM', 'DM', 'AM', 'RM', 'LM'].includes(p.pos)),
    ATT: showSquad.filter(p => ['CF', 'ST', 'RW', 'LW', 'SS'].includes(p.pos)),
  };

  return (
    <div className="w-full h-full pt-6 px-5 pb-4 flex flex-col gap-3" dir="rtl">
      {/* الرأس */}
      <div
        className="rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,40,15,0.9)', border: '1px solid rgba(0,120,50,0.5)' }}
      >
        <div className="flex items-center gap-3">
          <MondialFlag codeOrName="IQ" size={32} />
          <div>
            <div className="text-[18px] font-black" style={{ color: '#F0FFF4' }}>المنتخب العراقي</div>
            <div className="text-[11px]" style={{ color: t.sub }}>{matchLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MondialPill t={t} label={formation} color={t.accent} />
          <TrophyIcon size={24} color={t.gold} />
        </div>
      </div>

      {/* الملعب بالتشكيلة */}
      <div
        className="flex-1 rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(0,60,20,0.9) 0%,
              rgba(0,100,35,0.85) 50%,
              rgba(0,60,20,0.9) 100%
            )
          `,
          border: '1px solid rgba(0,150,60,0.4)',
        }}
      >
        {/* خطوط الملعب */}
        <div className="absolute inset-4 border-2 rounded-lg opacity-20" style={{ borderColor: '#FFFFFF' }} />
        <div className="absolute top-1/2 left-4 right-4 h-0.5 opacity-20" style={{ background: '#FFF' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 opacity-20" style={{ borderColor: '#FFF' }} />

        {/* اللاعبون */}
        <div className="relative z-10 h-full flex flex-col justify-around py-2">
          {[positionGroups.GK, positionGroups.DEF, positionGroups.MID, positionGroups.ATT].map((group, gi) => (
            <div key={gi} className="flex justify-around">
              {group.map((player, pi) => (
                <div key={pi} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px] border-2"
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      borderColor: t.accent,
                      color: t.accent,
                    }}
                  >
                    {player.number}
                  </div>
                  <div className="text-[9px] font-bold text-center max-w-[60px] leading-tight"
                    style={{ color: '#FFF', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {player.name.split(' ')[0]}
                  </div>
                  <div className="text-[8px] font-bold" style={{ color: t.accent }}>{player.pos}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* المدرب */}
      <div
        className="rounded-xl px-4 py-2 flex items-center gap-3"
        style={{ background: 'rgba(0,40,15,0.8)', border: `1px solid ${t.border}` }}
      >
        <span className="text-[20px]">👔</span>
        <div>
          <div className="text-[12px] font-bold" style={{ color: t.sub }}>المدرب</div>
          <div className="text-[14px] font-black" style={{ color: t.text }}>{coachName}</div>
        </div>
        <div className="mr-auto flex gap-1">
          {[1, 2, 3].map(i => <IraqStar key={i} size={14} />)}
        </div>
      </div>
    </div>
  );
};

// ─── 2. تسليط الضوء على لاعب ────────────────────────────────────────────────

const IraqPlayerSpotlightVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || 'أيمن حسين');
  const playerPos = String(getField('playerPosition') || 'مهاجم — قائد الهجوم');
  const playerNumber = String(getField('playerNumber') || '9');
  const playerImage = String(getField('playerImage') || '');
  const playerAge = String(getField('playerAge') || '');
  const playerClub = String(getField('playerClub') || '');
  const goals = Number(getField('playerGoals') ?? 4);
  const assists = Number(getField('playerAssists') ?? 1);
  const rating = Number(getField('playerRating') ?? 8.8);
  const matches = Number(getField('playerMatches') ?? 4);
  const quote = String(getField('playerQuote') || 'نحن هنا لنكتب التاريخ مع بلدنا الحبيب.');

  return (
    <div className="w-full h-full pt-6 p-5 flex flex-col gap-4" dir="rtl">
      <div className="flex-1 grid grid-cols-[220px_1fr] gap-4">
        {/* الجانب الأيمن: صورة وبيانات */}
        <div className="flex flex-col gap-3">
          {/* صورة اللاعب */}
          <div
            className="relative rounded-2xl overflow-hidden flex-1 flex items-center justify-center"
            style={{
              background: 'linear-gradient(160deg, rgba(0,80,30,0.9), rgba(0,20,10,0.95))',
              border: `2px solid ${t.accent}`,
              boxShadow: `0 0 30px ${t.accent}40`,
              minHeight: 200,
            }}
          >
            {/* رقم اللاعب */}
            <div
              className="absolute top-3 right-3 text-[48px] font-black opacity-20"
              style={{ color: t.accent }}
            >
              {playerNumber}
            </div>

            {playerImage ? (
              <img src={playerImage} alt={playerName} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-[80px]">🇮🇶</span>
                <div
                  className="text-[52px] font-black"
                  style={{ color: t.accent, textShadow: `0 0 20px ${t.accent}` }}
                >
                  {playerNumber}
                </div>
              </div>
            )}

            {/* شارة النجم */}
            <div className="absolute bottom-3 left-3">
              <IraqStar size={20} />
            </div>
          </div>

          {/* معلومات */}
          {playerAge && (
            <MondialFieldCard t={t} label="العمر" value={`${playerAge} سنة`} />
          )}
          {playerClub && (
            <MondialFieldCard t={t} label="النادي" value={playerClub} />
          )}
        </div>

        {/* الجانب الأيسر: الإحصائيات والمعلومات */}
        <div className="flex flex-col gap-3">
          {/* اسم اللاعب */}
          <div
            className="rounded-2xl px-5 py-4 relative overflow-hidden"
            style={{
              background: 'rgba(0,40,15,0.9)',
              border: `1px solid ${t.accent}50`,
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(to right, ${t.accent}, ${t.gold}, ${t.accent2})` }} />
            <div className="flex items-start gap-3">
              <MondialFlag codeOrName="IQ" size={40} />
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: t.accent }}>
                  🏆 FIFA WORLD CUP 2026 · العراق
                </div>
                <div className="text-[26px] font-black leading-tight" style={{ color: t.text }}>
                  {playerName}
                </div>
                <div className="text-[13px]" style={{ color: t.sub }}>{playerPos}</div>
              </div>
            </div>
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div
              className="rounded-xl p-4 flex flex-col items-center justify-center gap-1 relative"
              style={{
                background: `${t.accent}15`,
                border: `1px solid ${t.accent}40`,
              }}
            >
              <div className="text-[48px] font-black leading-none" style={{ color: t.accent, textShadow: `0 0 20px ${t.accent}` }}>
                {goals}
              </div>
              <div className="text-[12px] font-bold" style={{ color: t.sub }}>⚽ أهداف</div>
            </div>
            <div
              className="rounded-xl p-4 flex flex-col items-center justify-center gap-1"
              style={{ background: `${t.accent2}15`, border: `1px solid ${t.accent2}40` }}
            >
              <div className="text-[48px] font-black leading-none" style={{ color: t.accent2, textShadow: `0 0 20px ${t.accent2}` }}>
                {assists}
              </div>
              <div className="text-[12px] font-bold" style={{ color: t.sub }}>🅰️ تمريرات حاسمة</div>
            </div>
            <div
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}
            >
              <div className="text-[10px] font-bold" style={{ color: t.dim }}>تقييم البطولة</div>
              <MondialRating t={t} value={rating} />
            </div>
            <div
              className="rounded-xl p-3 flex flex-col items-center justify-center gap-1"
              style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}
            >
              <div className="text-[32px] font-black" style={{ color: t.gold }}>{matches}</div>
              <div className="text-[11px]" style={{ color: t.sub }}>مباريات</div>
            </div>
          </div>

          {/* اقتباس */}
          {quote && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(0,60,20,0.7)', border: `1px solid ${t.accent}30` }}
            >
              <div className="text-[13px] font-bold leading-relaxed" style={{ color: t.text }}>
                <span style={{ color: t.gold, fontSize: 20 }}>"</span>
                {quote}
                <span style={{ color: t.gold, fontSize: 20 }}>"</span>
              </div>
              <div className="text-[10px] mt-1 text-right" style={{ color: t.sub }}>— {playerName}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 3. شريط أخبار المنتخب ───────────────────────────────────────────────────

const IraqMatchTickerVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const news = String(getField('iraqNews') || 'العراق يتصدر المجموعة C — أيمن حسين يسجل الهدف الذهبي — جماهير عراقية تغزو ملاعب أمريكا — لأول مرة: العراق يصل ثمن النهائي في كأس العالم');
  const subLabel = String(getField('iraqTickerLabel') || '🇮🇶 أخبار المنتخب العراقي');
  const speed = Number(getField('scrollSpeed') || 22);
  const matchInfo = String(getField('currentMatchInfo') || 'العراق 1 : 0 الأرجنتين · ⏱️ 67\'');
  const isLive = String(getField('isLiveMatch') || 'true') !== 'false';

  return (
    <div className="w-full h-full flex flex-col justify-end">
      {/* شريط حالة المباراة (اختياري) */}
      {isLive && (
        <div
          className="flex items-center gap-3 px-5 py-2"
          style={{
            background: 'rgba(0,60,20,0.95)',
            borderTop: `1px solid ${t.accent}50`,
            borderBottom: `1px solid ${t.accent}30`,
          }}
        >
          <MondialLiveBadge t={t} label="مباشر" />
          <span className="text-[13px] font-black" style={{ color: t.text }}>{matchInfo}</span>
          <MondialWaveform color={t.accent} bars={8} height={14} />
        </div>
      )}

      {/* الشريط المتدحرج */}
      <div
        className="overflow-hidden flex items-center relative"
        style={{
          height: 44,
          background: 'linear-gradient(to right, rgba(0,0,0,0.98), rgba(0,40,15,0.95), rgba(0,0,0,0.98))',
          borderTop: `2px solid ${t.accent}`,
        }}
      >
        {/* الخط العلوي بألوان العلم */}
        <div className="absolute top-0 left-0 right-0 flex" style={{ height: 2 }}>
          {['#000', '#007A3D', '#FFF', '#C8102E'].map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>

        <div className="flex items-center h-full gap-0 flex-shrink-0">
          {/* Label */}
          <div
            className="flex-shrink-0 px-4 h-full flex items-center font-black text-[11px] uppercase tracking-wider gap-2"
            style={{
              background: `linear-gradient(to left, ${t.accent}, #007A3D)`,
              color: '#FFF',
              minWidth: 200,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white" style={{ animation: 'mondialPulse 1s infinite' }} />
            {subLabel}
          </div>
          {/* Scrolling text */}
          <div className="flex-1 overflow-hidden">
            <div
              className="whitespace-nowrap font-bold text-[13px] inline-block"
              style={{
                color: t.text,
                animation: `scrollX ${speed}s linear infinite`,
              }}
            >
              {news} &nbsp;&nbsp;&nbsp;🇮🇶&nbsp;&nbsp;&nbsp; {news}
            </div>
          </div>
        </div>
        <style>{`@keyframes scrollX { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`}</style>
      </div>
    </div>
  );
};

// ─── 4. لحظة تاريخية ─────────────────────────────────────────────────────────

const IraqHistoryMomentVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const momentTitle = String(getField('momentTitle') || 'لحظة تاريخية للعراق 🇮🇶');
  const momentSubtitle = String(getField('momentSubtitle') || 'أول تأهل عربي لثمن نهائي مونديال 2026!');
  const momentDetails = String(getField('momentDetails') || 'كتب المنتخب العراقي اليوم صفحة ذهبية في تاريخ كرة القدم العربية، بعد تخطي المرحلة الجماعية والتأهل لأول مرة إلى ثمن نهائي كأس العالم.');
  const year = String(getField('momentYear') || '2026');
  const showHistory = String(getField('showHistory') || 'true') !== 'false';

  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCelebrate(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full h-full pt-6 p-5 flex flex-col gap-4 relative overflow-hidden" dir="rtl">
      {/* خلفية احتفالية */}
      {celebrate && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#FFD700', '#007A3D', '#C8102E', '#FFF'][i % 4],
                animation: `mondialCountUp ${0.5 + Math.random()}s ease ${Math.random() * 2}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* البطاقة الرئيسية */}
      <div
        className="flex-1 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%,
              rgba(255,215,0,0.15) 0%,
              rgba(0,80,30,0.9) 40%,
              rgba(0,0,0,0.97) 100%)
          `,
          border: `2px solid ${t.gold}`,
          boxShadow: `0 0 60px ${t.gold}30`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: `linear-gradient(to right, transparent, ${t.gold}, transparent)` }} />

        {/* العلم والكأس */}
        <div className="flex items-center gap-4">
          <MondialFlag codeOrName="IQ" size={72} style={{ animation: 'iraqWave 3s ease-in-out infinite' }} />
          <TrophyIcon size={60} color={t.gold} />
        </div>

        {/* العنوان */}
        <div
          className="text-[32px] font-black text-center leading-tight"
          style={{
            color: t.gold,
            textShadow: `0 0 30px ${t.gold}`,
            animation: 'mondialCountUp 0.6s ease',
          }}
        >
          {momentTitle}
        </div>
        <div
          className="text-[16px] font-bold text-center"
          style={{ color: t.text }}
        >
          {momentSubtitle}
        </div>

        {/* التفاصيل */}
        {momentDetails && (
          <div
            className="rounded-xl px-5 py-4 w-full max-w-2xl text-center"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${t.accent}30`,
            }}
          >
            <p className="text-[14px] leading-relaxed" style={{ color: t.sub }}>
              {momentDetails}
            </p>
          </div>
        )}

        {/* السنة */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map(i => <IraqStar key={i} size={18} />)}
          <span className="text-[20px] font-black" style={{ color: t.gold }}>FIFA WC {year}</span>
          {[1, 2, 3, 4, 5].map(i => <IraqStar key={i} size={18} />)}
        </div>
      </div>

      {/* السجل التاريخي */}
      {showHistory && (
        <div
          className="rounded-2xl px-5 py-3"
          style={{ background: 'rgba(0,30,12,0.9)', border: `1px solid ${t.border}` }}
        >
          <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: t.dim }}>
            محطات العراق الكروية
          </div>
          <div className="flex gap-4 overflow-x-auto">
            {IRAQ_HISTORY.map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[16px]">{item.icon}</span>
                <div>
                  <div className="text-[11px] font-black" style={{ color: t.accent }}>{item.year}</div>
                  <div className="text-[10px]" style={{ color: t.sub }}>{item.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 5. نبض المشجعين ─────────────────────────────────────────────────────────

const IraqFanPulseVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const fanCount = String(getField('fanCount') || '٤٢٫٥ مليون');
  const countryRank = String(getField('countryRank') || '#1 عربياً');
  const supportMsg = String(getField('supportMessage') || 'العراق يستحق. كل بيت عراقي يشجع.');
  const pulseValue = clamp(Number(getField('pulseValue') || 87));
  const hashTag = String(getField('hashTag') || '#العراق_في_المونديال');
  const liveViewers = String(getField('liveViewers') || '');
  const isLive = String(getField('isLive') || 'true') !== 'false';

  return (
    <div className="w-full h-full pt-6 p-5 flex flex-col gap-4" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="FAN PULSE 🇮🇶 · نبض الجماهير العراقية"
        title="جماهير المنتخب العراقي"
        subtitle="FIFA World Cup 2026 · Fan Counter"
        pills={<>
          <MondialPill t={t} label={countryRank} color={t.gold} />
          {isLive && <MondialPill t={t} label="LIVE" pulse color={t.danger} small />}
        </>}
      />
      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* العداد الرئيسي */}
        <div
          className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
          style={{
            background: `linear-gradient(160deg, rgba(0,80,30,0.9), rgba(0,20,10,0.97))`,
            border: `2px solid ${t.accent}`,
            boxShadow: `0 0 40px ${t.accent}20`,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(to right, transparent, ${t.accent}, ${t.gold}, transparent)` }} />
          <MondialFlag codeOrName="IQ" size={64} style={{ animation: 'iraqWave 3s ease-in-out infinite' }} />
          <div
            className="text-[42px] font-black text-center leading-tight"
            style={{ color: t.gold, textShadow: `0 0 20px ${t.gold}` }}
          >
            {fanCount}
          </div>
          <div className="text-[13px] font-bold" style={{ color: t.sub }}>مشجع عراقي</div>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => <IraqStar key={i} size={14} />)}
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="flex flex-col gap-3">
          {/* نبض الدعم */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.dim }}>
              مستوى الدعم
            </div>
            <div
              className="text-[36px] font-black text-center"
              style={{ color: t.accent, textShadow: `0 0 15px ${t.accent}` }}
            >
              {pulseValue}%
            </div>
            <MondialBar t={t} value={pulseValue} color={t.accent} height={8} glow />
          </div>

          {/* هاشتاق */}
          <div
            className="rounded-2xl p-4 flex flex-col items-center gap-2 flex-1"
            style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}
          >
            <div className="text-[10px] font-bold uppercase" style={{ color: t.dim }}>الوسم الرائج</div>
            <div
              className="text-[16px] font-black text-center"
              style={{ color: t.gold }}
            >
              {hashTag}
            </div>
            {liveViewers && (
              <div className="flex items-center gap-2">
                <MondialWaveform color={t.accent} bars={5} height={12} />
                <span className="text-[12px] font-black" style={{ color: t.text }}>{liveViewers}</span>
              </div>
            )}
          </div>

          {/* رسالة الدعم */}
          <div
            className="rounded-2xl p-3"
            style={{ background: `${t.accent}10`, border: `1px solid ${t.accent}30` }}
          >
            <p className="text-[12px] font-bold text-center" style={{ color: t.text }}>
              {supportMsg}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 6. لوحة معلومات المنتخب (Dashboard) ────────────────────────────────────

interface IraqStandingsItem {
  rank: number;
  code: string;
  name: string;
  pts: number;
}

interface IraqNextMatch {
  homeCode: string;
  homeName: string;
  awayCode: string;
  awayName: string;
  time: string;
  date: string;
}

const IraqDashboardVariant: React.FC<IraqVariantProps> = ({ t, getField }) => {
  const title = String(getField('title') || 'لوحة أداء أسود الرافدين');
  const subtitle = String(getField('subtitle') || 'تغطية خاصة وتحليلات لمنتخب العراق في كأس العالم 2026');
  const points = Number(getField('points') ?? 4);
  const goals = Number(getField('goals') ?? 5);
  const conceded = Number(getField('conceded') ?? 3);
  const wins = Number(getField('wins') ?? 1);
  const pulseText = String(getField('pulseText') || '');
  const groupLetter = String(getField('groupLetter') || 'I');
  
  const standingsRaw = String(getField('standingsJson') || '[]');
  const standings = safeParse<IraqStandingsItem[]>(standingsRaw, []);
  
  const nextMatchRaw = String(getField('nextMatchJson') || '{}');
  const nextMatch = safeParse<IraqNextMatch>(nextMatchRaw, {
    homeCode: 'IQ', homeName: 'العراق',
    awayCode: 'FR', awayName: 'فرنسا',
    time: '22:00', date: 'الإثنين 15 يونيو · لوس أنجلوس'
  });

  return (
    <div className="w-full h-full pt-8 px-8 pb-6 flex flex-col gap-6" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <MondialFlag codeOrName="IQ" size={72} style={{ border: '3px solid #007A3D', boxShadow: '0 0 20px rgba(0, 122, 61, 0.4)' }} />
          <div>
            <div className="text-[28px] font-black text-white">{title}</div>
            <div className="text-[12px] text-white/50 mt-1">{subtitle}</div>
          </div>
        </div>
        <MondialPill t={t} label="قسم العراق 🇮🇶" color={t.gold} gold />
      </div>

      {/* شبكة لوحة المعلومات */}
      <div className="flex-1 grid grid-cols-[2fr_1fr] gap-6 relative z-10 min-h-0">
        {/* الجانب الأيمن: إحصائيات عامة ونبض الجماهير */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* الإحصائيات */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            {/* مؤشر جانبي ملون */}
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-600" />
            
            <div className="text-[16px] font-black text-emerald-400 mb-4 flex items-center gap-2">
              <span>📊</span> إحصائيات المنتخب في المونديال
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-[36px] font-black text-emerald-400 leading-none mb-2">{points}</div>
                <div className="text-[11px] text-white/40 font-bold">نقاط المجموعة</div>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-[36px] font-black text-white leading-none mb-2">{goals}</div>
                <div className="text-[11px] text-white/40 font-bold">أهداف مسجلة</div>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-[36px] font-black text-red-500 leading-none mb-2">{conceded}</div>
                <div className="text-[11px] text-white/40 font-bold">أهداف مستقبلة</div>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-[36px] font-black text-white leading-none mb-2">{wins}</div>
                <div className="text-[11px] text-white/40 font-bold">حالات الفوز</div>
              </div>
            </div>
          </div>

          {/* نبض الجماهير */}
          <div
            className="rounded-2xl p-5 flex-1 flex flex-col gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 122, 61, 0.08) 0%, rgba(200, 16, 46, 0.04) 100%)',
              border: '1.5px solid rgba(0, 122, 61, 0.25)',
            }}
          >
            <div className="text-[16px] font-black text-red-500 flex items-center gap-2">
              <span>🇮🇶</span> نبض الجماهير العراقية
            </div>
            <p className="text-[14px] leading-relaxed text-emerald-100/90 font-bold flex-1 overflow-y-auto">
              {pulseText}
            </p>
          </div>
        </div>

        {/* الجانب الأيسر: ترتيب المجموعة والمباراة القادمة */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* الترتيب */}
          <div className="rounded-2xl overflow-hidden border border-white/6 bg-black/20 flex flex-col min-h-0">
            <div className="bg-emerald-800 px-4 py-3 flex justify-between items-center text-white font-black text-[13px] flex-shrink-0">
              <span>ترتيب المجموعة {groupLetter}</span>
              <span className="font-mono text-emerald-200">GROUP {groupLetter}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {standings.map((t, idx) => {
                const isIraq = t.code.toUpperCase() === 'IQ';
                return (
                  <div
                    key={idx}
                    className={`flex items-center px-4 py-2.5 border-b border-white/5 text-[13px] font-bold ${
                      isIraq ? 'bg-emerald-950/40 border-r-4 border-emerald-500' : ''
                    }`}
                  >
                    <span className={`w-6 font-mono text-[14px] font-black ${isIraq ? 'text-emerald-400' : 'text-white/40'}`}>
                      {t.rank}
                    </span>
                    <MondialFlag codeOrName={t.code} size={28} className="mx-2" />
                    <span className="flex-1 text-white">{t.name}</span>
                    <span className="font-mono text-amber-400 font-black">{t.pts} ن</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* المباراة القادمة */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1.5px solid rgba(200, 16, 46, 0.25)'
            }}
          >
            {/* خط أحمر علوي */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600" />
            
            <div className="text-[15px] font-black text-red-500 mb-3 flex items-center gap-2">
              <span>🏟️</span> المباراة القادمة
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="text-center">
                <MondialFlag codeOrName={nextMatch.homeCode} size={44} className="mx-auto mb-1.5" />
                <div className="text-[12px] font-black text-white">{nextMatch.homeName}</div>
              </div>
              <div className="font-mono text-[16px] font-black text-white/30">VS</div>
              <div className="text-center">
                <MondialFlag codeOrName={nextMatch.awayCode} size={44} className="mx-auto mb-1.5" />
                <div className="text-[12px] font-black text-white">{nextMatch.awayName}</div>
              </div>
            </div>
            
            <div className="text-center mt-3 pt-2 border-t border-white/5">
              <div className="font-mono text-[22px] font-black text-amber-400 leading-none">{nextMatch.time}</div>
              <div className="text-[11px] text-white/40 mt-1">{nextMatch.date}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MondialIraqRenderer;
