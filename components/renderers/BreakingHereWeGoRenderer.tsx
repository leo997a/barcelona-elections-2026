import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BadgeCheck, Sparkles, Megaphone } from 'lucide-react';
import { RendererProps } from './SharedComponents';

/**
 * BreakingHereWeGoRenderer — قالب الخبر العاجل بصيغة "Here We Go"
 *
 *  Flow:
 *   1. ENTRY phase (~1.4s): dramatic dark screen with "HERE WE GO" big text + sound cue.
 *   2. TRANSITION phase (~0.6s): wipe.
 *   3. CONTENT phase: Breaking News / Official / Important news card with text and image.
 *
 *  Variants:
 *   - BREAKING (red)
 *   - OFFICIAL (gold/blue)
 *   - IMPORTANT (orange)
 */

const VARIANT_CONFIG: Record<string, { primary: string; accent: string; label: string; labelEn: string; icon: any }> = {
  BREAKING:  { primary: '#dc2626', accent: '#fbbf24', label: 'خبر عاجل',    labelEn: 'BREAKING NEWS', icon: AlertTriangle },
  OFFICIAL:  { primary: '#1d4ed8', accent: '#fbbf24', label: 'خبر رسمي',    labelEn: 'OFFICIAL',       icon: BadgeCheck },
  IMPORTANT: { primary: '#ea580c', accent: '#fde047', label: 'خبر مهم',     labelEn: 'IMPORTANT',      icon: Bell },
};

const speakHereWeGo = (text: string, lang: string, voicePreference: string, rate = 0.95, pitch = 0.85) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
      const pool = langVoices.length > 0 ? langVoices : voices;
      let pick = pool[0];
      if (voicePreference === 'male') {
        const male = pool.find(v => /male|tarik|maged|david|alex|fred|daniel/i.test(v.name));
        if (male) pick = male;
      } else if (voicePreference === 'female') {
        const female = pool.find(v => /female|samantha|victoria|moira|tessa|amira|hoda/i.test(v.name));
        if (female) pick = female;
      }
      utter.voice = pick;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* speech may be unavailable */ }
};

export const BreakingHereWeGoRenderer: React.FC<RendererProps> = ({
  config,
  getField,
  containerStyle,
  contentWrapperStyle,
  isEditor,
}) => {
  const variant = String(getField('variant') || 'BREAKING').toUpperCase();
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.BREAKING;
  const Icon = cfg.icon;

  const headline = String(getField('headline') || 'HERE WE GO');
  const newsTitle = String(getField('newsTitle') || 'صفقة كبرى تنتظر الإعلان');
  const newsBody = String(getField('newsBody') || 'وفقاً لمصادر موثوقة، اللاعب سيوقع عقده الجديد خلال الساعات القادمة.');
  const newsImage = String(getField('newsImage') || '');
  const sourceLabel = String(getField('sourceLabel') || 'Reo Show — Mercato Desk');
  const showTimestamp = getField('showTimestamp') !== false;

  // TTS configuration
  const ttsEnabled = getField('ttsEnabled') !== false;
  const ttsText = String(getField('ttsText') || 'Here we go');
  const ttsLang = String(getField('ttsLang') || 'en-US');
  const ttsVoice = String(getField('ttsVoice') || 'male');
  const ttsRate = Number(getField('ttsRate') || 0.95);
  const ttsPitch = Number(getField('ttsPitch') || 0.85);

  // Phase: 'intro' shows the dramatic Here We Go full-screen, then 'content' shows the news card
  const [phase, setPhase] = useState<'intro' | 'content'>('intro');
  const introDuration = Number(getField('introDuration') || 1800); // ms
  const introPlayedRef = useRef(false);

  useEffect(() => {
    if (!config.isVisible) {
      setPhase('intro');
      introPlayedRef.current = false;
      return;
    }
    if (isEditor) {
      // In editor: show content directly so user can review the layout
      setPhase('content');
      return;
    }
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;
    setPhase('intro');

    // Trigger TTS shortly after entrance so it overlaps the dramatic intro
    if (ttsEnabled && ttsText) {
      window.setTimeout(() => {
        speakHereWeGo(ttsText, ttsLang, ttsVoice, ttsRate, ttsPitch);
      }, 250);
    }

    const t = window.setTimeout(() => setPhase('content'), Math.max(800, introDuration));
    return () => window.clearTimeout(t);
  }, [config.isVisible, isEditor, ttsEnabled, ttsText, ttsLang, ttsVoice, ttsRate, ttsPitch, introDuration]);

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes hwgIntroIn {
          0% { opacity: 0; transform: scale(1.6); filter: blur(40px); }
          50% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes hwgIntroOut {
          0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.6) translateY(-200px); filter: blur(40px); }
        }
        @keyframes hwgScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
        @keyframes hwgPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes hwgCardIn {
          0% { opacity: 0; transform: translateY(60px) scale(0.92); filter: blur(8px); }
          70% { opacity: 1; transform: translateY(-4px) scale(1.01); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hwgImageReveal {
          0% { clip-path: inset(0 100% 0 0); transform: scale(1.1); }
          100% { clip-path: inset(0 0 0 0); transform: scale(1); }
        }
        @keyframes hwgGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 60px ${cfg.primary}88; }
        }
        @keyframes hwgBigText {
          0% { letter-spacing: 0.6em; opacity: 0; }
          100% { letter-spacing: 0.04em; opacity: 1; }
        }
        @keyframes hwgFlash {
          0%, 100% { opacity: 0; }
          5%, 15% { opacity: 0.8; }
        }
      `}</style>

      <div style={contentWrapperStyle} className="overflow-hidden font-['Tajawal']">
        {/* INTRO phase — dramatic Here We Go */}
        {phase === 'intro' && !isEditor ? (
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${cfg.primary}33 0%, #000 60%), #000`,
              animation: 'hwgIntroIn 0.8s cubic-bezier(.22,1,.36,1) both',
            }}
          >
            {/* Camera flash */}
            <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'hwgFlash 1.6s ease-out both' }} />

            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="absolute rounded-full border-2"
                  style={{
                    width: `${180 + i * 220}px`,
                    height: `${180 + i * 220}px`,
                    borderColor: `${cfg.primary}55`,
                    animation: `hwgPulse 1.8s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Diagonal lines bg */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  `repeating-linear-gradient(45deg, ${cfg.primary} 0, ${cfg.primary} 2px, transparent 2px, transparent 24px)`,
              }}
            />

            <div className="relative z-10 text-center px-12">
              <div
                className="font-['Barlow_Condensed'] text-[200px] md:text-[260px] font-black uppercase tracking-tight leading-[0.85]"
                style={{
                  color: '#fff',
                  textShadow: `0 0 80px ${cfg.primary}, 0 8px 0 ${cfg.primary}`,
                  WebkitTextStroke: `2px ${cfg.primary}`,
                  animation: 'hwgBigText 1.2s cubic-bezier(.22,1,.36,1) both',
                }}
              >
                {headline}
              </div>
              <div
                className="mt-2 text-3xl font-black uppercase tracking-[0.5em]"
                style={{ color: cfg.accent, textShadow: `0 0 24px ${cfg.accent}` }}
              >
                {sourceLabel}
              </div>
            </div>

            {/* Bottom strip */}
            <div className="absolute bottom-0 inset-x-0 h-3 overflow-hidden" style={{ background: cfg.primary }}>
              <div
                className="h-full w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)`, animation: 'hwgScan 1.4s linear infinite' }}
              />
            </div>
          </div>
        ) : null}

        {/* CONTENT phase — News card */}
        {(phase === 'content' || isEditor) ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: !isEditor ? 'hwgCardIn 0.7s cubic-bezier(.22,1,.36,1) both' : undefined }}
            dir="rtl"
          >
            {/* Background overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.92) 100%)`,
              }}
            />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
                backgroundSize: '80px 80px',
              }}
            />

            {/* Side accent bars */}
            <div className="absolute left-0 top-0 h-full w-3" style={{ background: cfg.primary }} />
            <div className="absolute right-0 top-0 h-full w-3" style={{ background: cfg.accent }} />

            {/* News card */}
            <div
              className="relative z-10 mx-auto w-[78%] max-w-[1480px] grid grid-cols-[480px_1fr] gap-8 p-10 border-2 bg-black/85"
              style={{
                borderColor: `${cfg.primary}66`,
                animation: 'hwgGlow 3.6s ease-in-out infinite',
              }}
            >
              {/* News image */}
              <div className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-black/40">
                <div className="aspect-[4/5] relative overflow-hidden">
                  {newsImage ? (
                    <img
                      src={newsImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ animation: !isEditor ? 'hwgImageReveal 0.9s cubic-bezier(.22,1,.36,1) 0.2s both' : undefined }}
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Megaphone className="w-32 h-32 text-white/15" strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  {/* Variant tag */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color: cfg.accent }} strokeWidth={2.6} />
                    <span className="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
                      {cfg.labelEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* News content */}
              <div className="flex flex-col justify-between min-w-0 py-2">
                {/* Top bar — variant pill */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex items-center gap-2 px-4 py-2 border"
                      style={{ background: `${cfg.primary}22`, borderColor: cfg.primary, color: cfg.primary }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: cfg.primary, animation: 'hwgPulse 1.2s ease-in-out infinite' }}
                      />
                      <span className="font-['Barlow_Condensed'] text-xl font-black uppercase tracking-[0.2em]">
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
                    <Sparkles className="w-4 h-4 text-white/40" />
                  </div>

                  {/* Title */}
                  <h1
                    className="font-['Barlow_Condensed'] text-[78px] font-black leading-[0.95] tracking-tight text-white"
                    style={{ textShadow: '0 4px 18px rgba(0,0,0,0.6)' }}
                  >
                    {newsTitle}
                  </h1>

                  {/* Body */}
                  <p className="mt-6 text-2xl leading-relaxed font-bold text-white/75 max-w-[900px]">
                    {newsBody}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between gap-4 pt-5 border-t border-white/12">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ background: cfg.primary }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.4} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">SOURCE</div>
                      <div className="font-['Barlow_Condensed'] text-2xl font-black text-white">{sourceLabel}</div>
                    </div>
                  </div>
                  {showTimestamp ? (
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">LIVE</div>
                      <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: cfg.accent }}>
                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bottom scan strip */}
            <div className="absolute bottom-0 inset-x-0 h-1 overflow-hidden bg-white/5">
              <div
                className="h-full w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${cfg.primary}, transparent)`, animation: 'hwgScan 4s linear infinite' }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BreakingHereWeGoRenderer;
