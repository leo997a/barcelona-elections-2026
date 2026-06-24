import React from 'react';
import { Gauge, Mic2, Quote, Radio, ShieldCheck, Sparkles, Timer, UserRound } from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { TRANSITIONS } from './OverlayConstants';

type StatementItem = {
  speaker: string;
  role: string;
  party: string;
  quote: string;
  stance: string;
  tone: string;
  source: string;
  time: string;
  confidence: number;
  photo: string;
  logo: string;
};

const clamp = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

const boolValue = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const safeJsonArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(/\n{2,}|[;؛]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
};

const textOf = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
};

const colorWithOpacity = (color: string, opacity: number) => {
  const bounded = Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : 0.78));
  const value = color.trim();
  const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return value;

  const hex = match[1].length === 3
    ? match[1].split('').map(char => `${char}${char}`).join('')
    : match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${bounded})`;
};

const normalizeStatements = (
  statementsRaw: unknown,
  pagesRaw: unknown,
  fallbackSpeaker: string,
  fallbackSource: string,
  limit: number,
): StatementItem[] => {
  const source = safeJsonArray(statementsRaw);
  const pages = safeJsonArray(pagesRaw);
  const list = source.length ? source : pages;

  const items = list
    .map((item, index): StatementItem => {
      if (typeof item === 'string' || typeof item === 'number') {
        return {
          speaker: fallbackSpeaker || 'مصدر التصريح',
          role: '',
          party: '',
          quote: String(item),
          stance: index === 0 ? 'تصريح رئيسي' : 'تعليق',
          tone: '',
          source: fallbackSource || 'صندوق الذكاء',
          time: '',
          confidence: 0,
          photo: '',
          logo: '',
        };
      }

      const record = (item || {}) as Record<string, unknown>;
      return {
        speaker: textOf(record.speaker, record.author, record.name, record.person, fallbackSpeaker, 'مصدر التصريح'),
        role: textOf(record.role, record.title, record.position),
        party: textOf(record.party, record.side, record.club, record.team, record.entity),
        quote: textOf(record.quote, record.text, record.statement, record.content, record.body),
        stance: textOf(record.stance, record.category, record.tag, record.status),
        tone: textOf(record.tone, record.sentiment, record.reading),
        source: textOf(record.source, record.sourceLabel, fallbackSource),
        time: textOf(record.time, record.date, record.when),
        confidence: clamp(record.confidence ?? record.confidencePct ?? record.weight, 0, 0, 100),
        photo: textOf(record.photo, record.image, record.avatar, record.speakerImage),
        logo: textOf(record.logo, record.badge, record.partyLogo, record.clubLogo),
      };
    })
    .filter(item => item.quote);

  if (items.length) return items.slice(0, limit);

  return [
    {
      speaker: fallbackSpeaker || 'مصدر التصريح',
      role: 'تصريح مباشر',
      party: 'غرفة الأخبار',
      quote: 'الصق التصريحات في صندوق الذكاء أو حرر JSON التصريحات لعرضها كبطاقات ذكية.',
      stance: 'جاهز للتحرير',
      tone: 'محايد',
      source: fallbackSource || 'يدوي',
      time: '',
      confidence: 0,
      photo: '',
      logo: '',
    },
  ];
};

const initials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'Q') + (parts[1]?.[0] || '');
};

export const StatementCardsRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  contentWrapperStyle,
  activeTheme,
  playSound,
}) => {
  const targetCount = clamp(getField('statementCardCount') || getField('aiPageCount'), 5, 1, 15);
  const statements = normalizeStatements(
    getField('statementsJson'),
    getField('pagesData'),
    String(getField('statementAuthor') || ''),
    String(getField('sourceLabel') || ''),
    targetCount,
  );
  const currentPage = clamp(getField('currentPage'), 0, 0, Math.max(0, statements.length - 1));
  const currentItem = statements[currentPage] || statements[0];
  const focusMode = String(getField('focusMode') || 'ALL');
  const layout = String(getField('statementLayout') || 'press_grid');
  const density = String(getField('statementDensity') || 'auto');
  const motion = String(getField('motionMode') || 'quote_pop');
  const transitionKey = String(getField('transitionEffect') || 'TACTICAL_REVEAL');
  const activeTransitionClass = TRANSITIONS[transitionKey] || TRANSITIONS.TACTICAL_REVEAL;
  const accentColor = String(getField('statementAccentColor') || activeTheme.accent);
  const panelColor = String(getField('statementPanelColor') || 'rgba(8,13,20,.76)');
  const panelOpacity = Number(getField('panelOpacity') ?? 0.78);
  const panelBackground = colorWithOpacity(panelColor, panelOpacity);
  const bgOpacity = Number(getField('bgOpacity') ?? 0.92);
  const fontScale = Number(getField('fontScale') || 1);
  const cardGap = clamp(getField('cardGap'), 14, 6, 34);
  const containerWidth = clamp(getField('containerWidth'), 90, 40, 100);
  const containerHeight = clamp(getField('containerHeight'), 650, 300, 980);
  const showSpeakerImage = boolValue(getField('showSpeakerImage'), true);
  const showSource = boolValue(getField('showSource'), true);
  const showTime = boolValue(getField('showTime'), true);
  const showIndex = boolValue(getField('showIndex'), true);
  const showTone = boolValue(getField('showTone'), true);
  const showConfidence = boolValue(getField('showConfidence'), true);
  const showAiLabel = boolValue(getField('showAiLabel'), true);
  const rawImages = getField('images');
  const backgroundImage = Array.isArray(rawImages) ? String(rawImages[0] || '') : '';

  const visibleStatements = focusMode === 'CURRENT'
    ? [currentItem]
    : focusMode === 'WINDOW'
      ? statements.slice(Math.max(0, currentPage - 1), Math.min(statements.length, currentPage + 4))
      : statements;

  const lastPageRef = React.useRef(currentPage);
  React.useEffect(() => {
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      playSound('TRANSITION').catch(() => { /* silent */ });
    }
  }, [currentPage, playSound]);

  const gridColumns =
    layout === 'intel_wall' ? 'repeat(5, minmax(0, 1fr))'
      : layout === 'source_timeline' ? 'minmax(0, 1fr)'
        : visibleStatements.length <= 1 ? 'minmax(0, 1fr)'
          : visibleStatements.length <= 2 ? 'repeat(2, minmax(0, 1fr))'
            : visibleStatements.length <= 6 ? 'repeat(3, minmax(0, 1fr))'
              : 'repeat(5, minmax(0, 1fr))';

  const cardTextSize = density === 'compact' || visibleStatements.length > 8 ? 17 : density === 'broadcast' ? 28 : 22;
  const headlineSize = layout === 'solo_authority' ? 56 : 42;
  const wrapperStyle: React.CSSProperties = {
    width: `${containerWidth}%`,
    height: `${containerHeight}px`,
    color: activeTheme.text,
    fontSize: `${16 * fontScale}px`,
  };

  const renderAvatar = (item: StatementItem, compact = false) => {
    const size = compact ? 'h-9 w-9' : 'h-14 w-14';
    if (!showSpeakerImage) return null;
    return (
      <div className={`${size} shrink-0 overflow-hidden rounded-lg border border-white/12 bg-white/8`}>
        {item.photo ? (
          <img src={item.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-black" style={{ color: accentColor }}>
            {initials(item.speaker)}
          </div>
        )}
      </div>
    );
  };

  const renderMeta = (item: StatementItem) => (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
      {showSource && item.source && <span>{item.source}</span>}
      {showTime && item.time && <span>{item.time}</span>}
      {showTone && item.tone && <span style={{ color: accentColor }}>{item.tone}</span>}
      {showConfidence && item.confidence > 0 && <span>{item.confidence}%</span>}
    </div>
  );

  const StatementCard: React.FC<{ item: StatementItem; index: number; compact?: boolean }> = ({ item, index, compact = false }) => (
    <article
      className={`relative min-w-0 overflow-hidden rounded-lg border border-white/10 ${activeTransitionClass}`}
      style={{
        background: panelBackground,
        boxShadow: `0 24px 70px rgba(0,0,0,.38), inset 0 0 0 1px ${accentColor}22`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accentColor }} />
      <div className={compact ? 'p-3' : 'p-5'}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {renderAvatar(item, compact)}
            <div className="min-w-0">
              <div className="truncate font-black text-white" style={{ fontSize: compact ? 15 : 20 }}>{item.speaker}</div>
              <div className="truncate text-[11px] font-bold text-white/48">{item.role || item.party || item.stance}</div>
            </div>
          </div>
          {showIndex && (
            <div className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] font-black text-white/60">
              {String(index + 1).padStart(2, '0')}
            </div>
          )}
        </div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-black text-white/55">
          <Quote className="h-4 w-4" style={{ color: accentColor }} />
          <span className="truncate">{item.stance || item.party || 'تصريح'}</span>
        </div>
        <p className="font-black leading-[1.35] text-white" style={{ fontSize: `${compact ? 15 : cardTextSize}px` }}>
          {item.quote}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          {renderMeta(item)}
          {item.logo && <img src={item.logo} alt="" className="h-7 w-7 object-contain opacity-80" referrerPolicy="no-referrer" />}
        </div>
      </div>
    </article>
  );

  const renderBody = () => {
    if (layout === 'solo_authority') {
      const item = currentItem;
      return (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.1fr)_380px] gap-5">
          <section className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 p-9" style={{ background: panelBackground }}>
            <Quote className="mb-6 h-11 w-11" style={{ color: accentColor }} />
            <p className="font-black leading-[1.22] text-white" style={{ fontSize: `${44 * fontScale}px` }}>{item.quote}</p>
            <div className="mt-8">{renderMeta(item)}</div>
          </section>
          <aside className="flex min-h-0 flex-col justify-between rounded-lg border border-white/10 p-7" style={{ background: `${activeTheme.primary}33` }}>
            <div>
              {renderAvatar(item)}
              <div className="mt-5 text-4xl font-black leading-tight text-white">{item.speaker}</div>
              <div className="mt-2 text-sm font-bold text-white/55">{item.role || item.party}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <ShieldCheck className="mb-2 h-4 w-4" style={{ color: accentColor }} />
                <div className="text-[10px] font-black text-white/45">التصنيف</div>
                <div className="mt-1 truncate text-sm font-black text-white">{item.stance || 'تصريح'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <Gauge className="mb-2 h-4 w-4" style={{ color: accentColor }} />
                <div className="text-[10px] font-black text-white/45">المؤشر</div>
                <div className="mt-1 truncate text-sm font-black text-white">{item.confidence ? `${item.confidence}%` : item.tone || 'جاهز'}</div>
              </div>
            </div>
          </aside>
        </div>
      );
    }

    if (layout === 'debate_split') {
      return (
        <div className="grid h-full min-h-0 gap-4" style={{ gridTemplateColumns: visibleStatements.length <= 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))' }}>
          {visibleStatements.map((item, index) => (
            <StatementCard key={`${item.speaker}-${index}`} item={item} index={index} compact={visibleStatements.length > 3} />
          ))}
        </div>
      );
    }

    if (layout === 'source_timeline') {
      return (
        <div className="grid h-full min-h-0 grid-cols-[290px_minmax(0,1fr)] gap-5">
          <aside className="rounded-lg border border-white/10 bg-black/30 p-5">
            <Radio className="mb-4 h-8 w-8" style={{ color: accentColor }} />
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/45">source monitor</div>
            <div className="mt-3 text-3xl font-black text-white">{statements.length}</div>
            <div className="mt-1 text-sm font-bold text-white/55">تصريح قابل للتنقل</div>
          </aside>
          <div className="min-h-0 space-y-3 overflow-hidden">
            {visibleStatements.map((item, index) => (
              <div key={`${item.speaker}-${index}`} className="grid grid-cols-[112px_minmax(0,1fr)] items-stretch gap-3">
                <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-center">
                  <Timer className="mx-auto mb-2 h-4 w-4" style={{ color: accentColor }} />
                  <div className="font-mono text-xs font-black text-white/70">{item.time || `#${index + 1}`}</div>
                  <div className="mt-1 truncate text-[10px] font-bold text-white/38">{item.source || 'مصدر'}</div>
                </div>
                <StatementCard item={item} index={index} compact />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns: gridColumns,
          gap: `${cardGap}px`,
        }}
      >
        {visibleStatements.map((item, index) => (
          <StatementCard key={`${item.speaker}-${index}`} item={item} index={index} compact={layout === 'intel_wall' || visibleStatements.length > 6} />
        ))}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes statementSweep { from { transform: translateX(-115%); } to { transform: translateX(115%); } }
        @keyframes statementPulse { 0%, 100% { opacity: .32; } 50% { opacity: .82; } }
      `}</style>
      <div style={contentWrapperStyle} className="overflow-hidden">
        <div className="absolute inset-0" style={{ background: activeTheme.secondary, opacity: bgOpacity }} />
        {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.22 }} referrerPolicy="no-referrer" />}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: accentColor }} />
        <div className="absolute top-0 h-full w-24 opacity-20" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, animation: motion === 'none' ? undefined : 'statementSweep 9s linear infinite' }} />
        <main className="relative z-10 flex h-full w-full items-center justify-center p-8" dir="rtl">
          <div style={wrapperStyle} className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-5">
            <header className="flex items-end justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <Mic2 className="h-4 w-4" style={{ color: accentColor }} />
                  <span className="text-[11px] font-black uppercase tracking-[0.32em] text-white/45">
                    {String(getField('eventLabel') || 'statement intelligence')}
                  </span>
                </div>
                <h1 className="truncate font-black leading-none text-white" style={{ fontSize: `${headlineSize * fontScale}px` }}>
                  {String(getField('headline') || 'تصريحات')}
                </h1>
                <p className="mt-2 truncate text-sm font-bold text-white/52">{String(getField('subtitle') || '')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {showAiLabel && (
                  <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: accentColor }} />
                      AI cards
                    </div>
                    <div className="mt-1 font-mono text-lg font-black text-white">{statements.length}/{targetCount}</div>
                  </div>
                )}
                <div className="h-14 w-1 rounded-full" style={{ background: accentColor, animation: motion === 'none' ? undefined : 'statementPulse 1.8s ease-in-out infinite' }} />
              </div>
            </header>

            <section className="min-h-0">{renderBody()}</section>

            <footer className="flex items-center justify-between gap-5 border-t border-white/10 pt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
              <span>{String(getField('channelName') || 'REO LIVE')}</span>
              <span>{String(getField('footerNote') || 'تصريحات متعددة الأطراف')}</span>
              <span>PAGE {currentPage + 1} / {statements.length}</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
