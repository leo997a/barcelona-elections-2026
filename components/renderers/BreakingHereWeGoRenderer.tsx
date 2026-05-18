import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BadgeCheck, Sparkles, Megaphone, Radio } from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { playAnnouncement } from '../../services/deepVoiceSynth';

/**
 * BreakingHereWeGoRenderer — قالب الخبر العاجل بصيغة "Here We Go"
 *
 *  Two-phase flow:
 *    1. INTRO    — dramatic full-screen sting with the big phrase + deep voice
 *    2. CONTENT  — news card (title, body, image, source, timestamp)
 *
 *  News variants:  BREAKING / OFFICIAL / IMPORTANT
 *  Visual themes:  CINEMATIC_RED / OFFICIAL_BLUE / LUXE_GOLD / NEON_CYBER / MONO_BROADCAST
 *  Voice modes:    BROWSER_TTS_DEEP (recommended) / FORMANT_PHRASE / STUDIO_STINGER
 */

type VariantConfig = {
  primary: string;
  accent: string;
  label: string;
  labelEn: string;
  icon: any;
};

const VARIANT_CONFIG: Record<string, VariantConfig> = {
  BREAKING:  { primary: '#dc2626', accent: '#fbbf24', label: 'خبر عاجل',  labelEn: 'BREAKING NEWS', icon: AlertTriangle },
  OFFICIAL:  { primary: '#1d4ed8', accent: '#fbbf24', label: 'خبر رسمي',  labelEn: 'OFFICIAL',       icon: BadgeCheck },
  IMPORTANT: { primary: '#ea580c', accent: '#fde047', label: 'خبر مهم',   labelEn: 'IMPORTANT',      icon: Bell },
};

type ThemeStyle = {
  introBg: string;
  cardBg: string;
  cardBorder: string;
  bodyBg: string;
  textPrimary: string;
  textSecondary: string;
  pattern: 'lines' | 'grid' | 'noise' | 'glow' | 'none';
  introVariant: 'CINEMA' | 'STUDIO' | 'NEON' | 'LUXE' | 'BROADCAST';
};

const THEME_STYLES: Record<string, ThemeStyle> = {
  CINEMATIC_RED: {
    introBg: 'radial-gradient(ellipse at 50% 50%, #4a0a0a 0%, #1a0303 35%, #000 70%)',
    cardBg: 'linear-gradient(135deg, rgba(20,5,5,0.96) 0%, rgba(8,2,2,0.96) 100%)',
    cardBorder: 'rgba(220,38,38,0.5)',
    bodyBg: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(20,5,5,0.85) 50%, rgba(0,0,0,0.92) 100%)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,200,200,0.65)',
    pattern: 'lines',
    introVariant: 'CINEMA',
  },
  OFFICIAL_BLUE: {
    introBg: 'radial-gradient(ellipse at 50% 50%, #0a1a4a 0%, #030a1a 35%, #000 70%)',
    cardBg: 'linear-gradient(135deg, rgba(5,12,28,0.96) 0%, rgba(2,5,15,0.96) 100%)',
    cardBorder: 'rgba(29,78,216,0.5)',
    bodyBg: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(5,12,28,0.88) 50%, rgba(0,0,0,0.92) 100%)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(200,220,255,0.65)',
    pattern: 'grid',
    introVariant: 'BROADCAST',
  },
  LUXE_GOLD: {
    introBg: 'radial-gradient(ellipse at 50% 50%, #2a1a05 0%, #100a02 35%, #000 70%)',
    cardBg: 'linear-gradient(135deg, rgba(20,15,5,0.96) 0%, rgba(8,5,2,0.96) 100%)',
    cardBorder: 'rgba(237,177,17,0.55)',
    bodyBg: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(20,15,5,0.85) 50%, rgba(0,0,0,0.92) 100%)',
    textPrimary: '#fff9e6',
    textSecondary: 'rgba(255,235,180,0.65)',
    pattern: 'glow',
    introVariant: 'LUXE',
  },
  NEON_CYBER: {
    introBg: 'radial-gradient(ellipse at 50% 50%, #0a1a2a 0%, #02080f 35%, #000 70%), linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.05) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(2,8,15,0.96) 0%, rgba(0,4,8,0.96) 100%)',
    cardBorder: 'rgba(34,211,238,0.5)',
    bodyBg: 'linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(2,8,15,0.88) 50%, rgba(0,0,0,0.94) 100%)',
    textPrimary: '#e8fbff',
    textSecondary: 'rgba(180,235,255,0.65)',
    pattern: 'noise',
    introVariant: 'NEON',
  },
  MONO_BROADCAST: {
    introBg: 'radial-gradient(ellipse at 50% 50%, #1a1a1a 0%, #0a0a0a 50%, #000 100%)',
    cardBg: 'rgba(15,15,15,0.96)',
    cardBorder: 'rgba(255,255,255,0.18)',
    bodyBg: 'linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(15,15,15,0.88) 50%, rgba(0,0,0,0.94) 100%)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(220,220,220,0.65)',
    pattern: 'none',
    introVariant: 'STUDIO',
  },
};

const ThemePattern: React.FC<{ pattern: string; primary: string; accent: string }> = ({ pattern, primary, accent }) => {
  if (pattern === 'lines') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${primary} 0, ${primary} 2px, transparent 2px, transparent 28px)`,
        }}
      />
    );
  }
  if (pattern === 'grid') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
          backgroundSize: '70px 70px',
        }}
      />
    );
  }
  if (pattern === 'noise') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, ${accent}88 1px, transparent 1px)`,
          backgroundSize: '14px 14px',
        }}
      />
    );
  }
  if (pattern === 'glow') {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${accent}28 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${primary}22 0%, transparent 60%)`,
        }}
      />
    );
  }
  return null;
};

export const BreakingHereWeGoRenderer: React.FC<RendererProps> = ({
  config,
  getField,
  containerStyle,
  contentWrapperStyle,
  isEditor,
}) => {
  const variant = String(getField('variant') || 'BREAKING').toUpperCase();
  const variantCfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.BREAKING;
  const Icon = variantCfg.icon;

  const visualTheme = String(getField('visualTheme') || 'CINEMATIC_RED');
  const theme = THEME_STYLES[visualTheme] || THEME_STYLES.CINEMATIC_RED;

  const headline = String(getField('headline') || 'HERE WE GO');
  const newsTitle = String(getField('newsTitle') || 'صفقة كبرى تنتظر الإعلان');
  const newsBody = String(getField('newsBody') || 'وفقاً لمصادر موثوقة، اللاعب سيوقع عقده الجديد خلال الساعات القادمة.');
  const newsImage = String(getField('newsImage') || '');
  const sourceLabel = String(getField('sourceLabel') || 'Reo Show — Mercato Desk');
  const showTimestamp = getField('showTimestamp') !== false;
  const showStingerLayer = getField('showStingerLayer') !== false;

  // Voice configuration
  const voiceEnabled = getField('voiceEnabled') !== false;
  const voiceMode = String(getField('voiceMode') || 'BROADCAST');
  const voiceId = String(getField('voiceId') || 'Brian');
  const voiceText = String(getField('voiceText') || 'Here we go');
  const voiceLang = String(getField('voiceLang') || 'en-US');
  const voiceVolume = Number(getField('voiceVolume') ?? 0.95);
  const voicePitchShift = Number(getField('voicePitchShift') ?? 0);

  const [phase, setPhase] = useState<'intro' | 'content'>('intro');
  const introDuration = Number(getField('introDuration') || 2200);
  const introPlayedRef = useRef(false);

  useEffect(() => {
    if (!config.isVisible) {
      setPhase('intro');
      introPlayedRef.current = false;
      return;
    }
    if (isEditor) {
      setPhase('content');
      return;
    }
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;
    setPhase('intro');

    if (voiceEnabled && voiceText) {
      // Slight delay so the visual entrance lines up with the audio downbeat
      window.setTimeout(() => {
        playAnnouncement(voiceText, {
          mode: voiceMode as any,
          voiceId,
          lang: voiceLang,
          volume: voiceVolume,
          pitchShift: voicePitchShift,
          noStinger: !showStingerLayer,
        }).catch(() => undefined);
      }, 220);
    }

    const t = window.setTimeout(() => setPhase('content'), Math.max(1000, introDuration));
    return () => window.clearTimeout(t);
  }, [config.isVisible, isEditor, voiceEnabled, voiceText, voiceId, voiceLang, voiceMode, voiceVolume, voicePitchShift, introDuration, showStingerLayer]);

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes hwgIntroIn {
          0% { opacity: 0; transform: scale(1.4); filter: blur(40px); }
          50% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes hwgScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
        @keyframes hwgPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes hwgCardIn {
          0% { opacity: 0; transform: translateY(60px) scale(0.94); filter: blur(8px); }
          70% { opacity: 1; transform: translateY(-4px) scale(1.01); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hwgImageReveal {
          0% { clip-path: inset(0 100% 0 0); transform: scale(1.1); }
          100% { clip-path: inset(0 0 0 0); transform: scale(1); }
        }
        @keyframes hwgGlowSoft {
          0%, 100% { box-shadow: 0 0 30px rgba(0,0,0,0.6), inset 0 0 0 1px ${theme.cardBorder}; }
          50% { box-shadow: 0 0 60px ${variantCfg.primary}77, inset 0 0 0 1px ${variantCfg.primary}88; }
        }
        @keyframes hwgBigText {
          0% { letter-spacing: 0.6em; opacity: 0; transform: scale(1.2); }
          70% { letter-spacing: 0.05em; opacity: 1; transform: scale(1.02); }
          100% { letter-spacing: 0.04em; opacity: 1; transform: scale(1); }
        }
        @keyframes hwgFlash {
          0%, 100% { opacity: 0; }
          5%, 12% { opacity: 0.85; }
        }
        @keyframes hwgRingPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes hwgVerticalLines {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.4; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes hwgGoldShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={contentWrapperStyle} className="overflow-hidden font-['Tajawal']">

        {/* INTRO phase — dramatic Here We Go */}
        {phase === 'intro' && !isEditor ? (
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              background: theme.introBg,
              animation: 'hwgIntroIn 0.9s cubic-bezier(.22,1,.36,1) both',
            }}
          >
            {/* Camera flash */}
            <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'hwgFlash 1.6s ease-out both' }} />

            {/* Theme-specific background pattern */}
            <ThemePattern pattern={theme.pattern} primary={variantCfg.primary} accent={variantCfg.accent} />

            {/* Cinema vertical bars (CINEMA + LUXE) */}
            {(theme.introVariant === 'CINEMA' || theme.introVariant === 'LUXE') ? (
              <>
                <div className="absolute top-0 bottom-0 left-0 w-[12%]" style={{ background: 'linear-gradient(90deg, #000 0%, transparent 100%)' }} />
                <div className="absolute top-0 bottom-0 right-0 w-[12%]" style={{ background: 'linear-gradient(270deg, #000 0%, transparent 100%)' }} />
              </>
            ) : null}

            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="absolute rounded-full border-2"
                  style={{
                    width: `${280 + i * 180}px`,
                    height: `${280 + i * 180}px`,
                    borderColor: `${variantCfg.primary}55`,
                    animation: `hwgRingPulse 2.4s ease-out ${i * 0.32}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Neon vertical scanning lines (NEON theme) */}
            {theme.introVariant === 'NEON' ? (
              <>
                {[20, 40, 60, 80].map(left => (
                  <div
                    key={left}
                    className="absolute top-0 bottom-0 w-[2px]"
                    style={{
                      left: `${left}%`,
                      background: `linear-gradient(180deg, transparent 0%, ${variantCfg.accent}88 50%, transparent 100%)`,
                      animation: `hwgVerticalLines 1.6s ease-in-out ${left * 0.01}s infinite`,
                    }}
                  />
                ))}
              </>
            ) : null}

            {/* The big text */}
            <div className="relative z-10 text-center px-12">
              <div
                className="font-['Barlow_Condensed'] font-black uppercase tracking-tight leading-[0.85]"
                style={{
                  fontSize: 'clamp(120px, 18vw, 280px)',
                  color: theme.introVariant === 'LUXE' ? variantCfg.accent : '#fff',
                  textShadow: `0 0 80px ${variantCfg.primary}, 0 0 160px ${variantCfg.primary}66, 0 8px 0 ${variantCfg.primary}`,
                  WebkitTextStroke: theme.introVariant === 'LUXE' ? `2px ${variantCfg.accent}` : `2px ${variantCfg.primary}`,
                  animation: 'hwgBigText 1.4s cubic-bezier(.22,1,.36,1) both',
                  ...(theme.introVariant === 'LUXE' ? {
                    backgroundImage: `linear-gradient(90deg, ${variantCfg.accent} 0%, #fff7c2 25%, ${variantCfg.accent} 50%, #fff7c2 75%, ${variantCfg.accent} 100%)`,
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'hwgBigText 1.4s cubic-bezier(.22,1,.36,1) both, hwgGoldShimmer 4s linear infinite',
                  } : {}),
                } as React.CSSProperties}
              >
                {headline}
              </div>
              <div
                className="mt-3 text-[clamp(18px,2.2vw,32px)] font-black uppercase tracking-[0.5em]"
                style={{ color: variantCfg.accent, textShadow: `0 0 24px ${variantCfg.accent}` }}
              >
                {sourceLabel}
              </div>
            </div>

            {/* Bottom strip */}
            <div className="absolute bottom-0 inset-x-0 h-3 overflow-hidden" style={{ background: variantCfg.primary }}>
              <div
                className="h-full w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${variantCfg.accent}, transparent)`, animation: 'hwgScan 1.4s linear infinite' }}
              />
            </div>
            <div className="absolute top-0 inset-x-0 h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full w-1/4"
                style={{ background: `linear-gradient(90deg, transparent, ${variantCfg.accent}, transparent)`, animation: 'hwgScan 2.6s linear infinite' }}
              />
            </div>
          </div>
        ) : null}

        {/* CONTENT phase — News card */}
        {(phase === 'content' || isEditor) ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: theme.bodyBg,
              animation: !isEditor ? 'hwgCardIn 0.85s cubic-bezier(.22,1,.36,1) both' : undefined,
            }}
            dir="rtl"
          >
            {/* Theme pattern */}
            <ThemePattern pattern={theme.pattern} primary={variantCfg.primary} accent={variantCfg.accent} />

            {/* Side accent bars */}
            <div
              className="absolute left-0 top-0 h-full w-3"
              style={{ background: `linear-gradient(180deg, ${variantCfg.primary} 0%, ${variantCfg.primary}88 100%)`, boxShadow: `4px 0 18px ${variantCfg.primary}66` }}
            />
            <div
              className="absolute right-0 top-0 h-full w-3"
              style={{ background: `linear-gradient(180deg, ${variantCfg.accent} 0%, ${variantCfg.accent}88 100%)`, boxShadow: `-4px 0 18px ${variantCfg.accent}66` }}
            />

            {/* News card */}
            <div
              className="relative z-10 mx-auto w-[80%] max-w-[1500px] grid grid-cols-[500px_1fr] gap-8 p-10 border-2"
              style={{
                background: theme.cardBg,
                borderColor: theme.cardBorder,
                animation: 'hwgGlowSoft 3.6s ease-in-out infinite',
                clipPath: theme.introVariant === 'NEON' || theme.introVariant === 'BROADCAST'
                  ? 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))'
                  : undefined,
              }}
            >
              {/* News image */}
              <div
                className="relative overflow-hidden border"
                style={{
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)',
                  borderColor: theme.cardBorder,
                }}
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  {newsImage ? (
                    <img
                      src={newsImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ animation: !isEditor ? 'hwgImageReveal 0.95s cubic-bezier(.22,1,.36,1) 0.25s both' : undefined }}
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Megaphone className="w-32 h-32" style={{ color: theme.textSecondary, opacity: 0.4 }} strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  {/* Variant tag */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color: variantCfg.accent }} strokeWidth={2.6} />
                    <span
                      className="text-[11px] font-black uppercase tracking-[0.32em]"
                      style={{ color: theme.textSecondary }}
                    >
                      {variantCfg.labelEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* News content */}
              <div className="flex flex-col justify-between min-w-0 py-2">
                <div>
                  {/* Variant pill */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 border-2"
                      style={{
                        background: `${variantCfg.primary}22`,
                        borderColor: variantCfg.primary,
                        color: variantCfg.primary,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: variantCfg.primary, animation: 'hwgPulse 1.2s ease-in-out infinite', boxShadow: `0 0 10px ${variantCfg.primary}` }}
                      />
                      <span className="font-['Barlow_Condensed'] text-2xl font-black uppercase tracking-[0.2em]">
                        {variantCfg.label}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
                    <Radio className="w-5 h-5" style={{ color: variantCfg.accent }} />
                  </div>

                  {/* Title */}
                  <h1
                    className="font-['Barlow_Condensed'] font-black leading-[0.95] tracking-tight"
                    style={{
                      fontSize: 'clamp(48px, 5.4vw, 92px)',
                      color: theme.textPrimary,
                      textShadow: '0 4px 18px rgba(0,0,0,0.7)',
                    }}
                  >
                    {newsTitle}
                  </h1>

                  {/* Body */}
                  <p
                    className="mt-6 leading-relaxed font-bold max-w-[920px]"
                    style={{
                      fontSize: 'clamp(18px, 1.6vw, 28px)',
                      color: theme.textSecondary,
                    }}
                  >
                    {newsBody}
                  </p>
                </div>

                {/* Footer */}
                <div
                  className="mt-8 flex items-center justify-between gap-4 pt-5"
                  style={{ borderTop: `1px solid ${theme.cardBorder}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ background: variantCfg.primary, boxShadow: `0 0 14px ${variantCfg.primary}66` }}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.4} />
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-black uppercase tracking-[0.28em]"
                        style={{ color: theme.textSecondary }}
                      >
                        SOURCE
                      </div>
                      <div
                        className="font-['Barlow_Condensed'] text-2xl font-black"
                        style={{ color: theme.textPrimary }}
                      >
                        {sourceLabel}
                      </div>
                    </div>
                  </div>
                  {showTimestamp ? (
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div
                          className="text-[10px] font-black uppercase tracking-[0.28em]"
                          style={{ color: theme.textSecondary }}
                        >
                          LIVE
                        </div>
                        <div
                          className="font-['Barlow_Condensed'] text-2xl font-black"
                          style={{ color: variantCfg.accent }}
                        >
                          {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Sparkles className="w-5 h-5" style={{ color: variantCfg.accent }} strokeWidth={2.4} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bottom scan strip */}
            <div className="absolute bottom-0 inset-x-0 h-1 overflow-hidden bg-white/5">
              <div
                className="h-full w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${variantCfg.primary}, transparent)`, animation: 'hwgScan 4s linear infinite' }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BreakingHereWeGoRenderer;
