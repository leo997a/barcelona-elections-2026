/**
 * Player Intel V2 — Image override editor.
 * One per player slot (A or B). Saves to localStorage via image store.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Upload, Link as LinkIcon, EyeOff, RotateCcw } from 'lucide-react';
import {
  getImageOverride,
  setImageOverride,
  clearImageOverride,
  fileToDataUrl,
  type ImageMode,
  type ImageObjectFit,
  type ImagePosition,
} from './playerIntelV2ImageStore';

interface Props {
  slug: string;
  label: string; // e.g. "اللاعب الأول" or "اللاعب الثاني"
  onChange?: () => void;
}

const PlayerIntelV2ImageEditor: React.FC<Props> = ({ slug, label, onChange }) => {
  const [override, setLocalOverride] = useState(() => getImageOverride(slug));
  const [directUrlInput, setDirectUrlInput] = useState(override?.directUrl || '');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh when slug changes
  useEffect(() => {
    const o = getImageOverride(slug);
    setLocalOverride(o);
    setDirectUrlInput(o?.directUrl || '');
    setError(null);
  }, [slug]);

  const apply = (patch: Parameters<typeof setImageOverride>[1]) => {
    if (!slug) return;
    const ok = setImageOverride(slug, patch);
    if (!ok) {
      setError('فشل الحفظ — قد تكون مساحة التخزين ممتلئة.');
      return;
    }
    setLocalOverride(getImageOverride(slug));
    setError(null);
    onChange?.();
  };

  const reset = () => {
    if (!slug) return;
    clearImageOverride(slug);
    setLocalOverride(null);
    setDirectUrlInput('');
    setError(null);
    onChange?.();
  };

  const handleFile = async (file: File) => {
    setError(null);
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl) {
      setError('الصورة كبيرة جدًا (الحد ~1.5MB) أو غير صالحة.');
      return;
    }
    apply({ mode: 'local_upload', localDataUrl: dataUrl });
  };

  const mode: ImageMode = override?.mode || 'auto';
  const fit: ImageObjectFit = override?.objectFit || 'contain';
  const position: ImagePosition = override?.position || 'center';

  if (!slug) {
    return (
      <div className="text-[11px] text-slate-500 italic">
        اختر لاعبًا أولًا من تبويب "أساسي".
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500 truncate">{slug}</div>
        </div>
        <button
          onClick={reset}
          className="text-[10px] text-slate-500 hover:text-cyan-300 flex items-center gap-1"
          title="إعادة ضبط"
        >
          <RotateCcw className="w-3 h-3" /> إعادة ضبط
        </button>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { id: 'auto' as ImageMode, label: 'تلقائي', icon: null },
          { id: 'direct_url' as ImageMode, label: 'رابط', icon: <LinkIcon className="w-3 h-3" /> },
          { id: 'local_upload' as ImageMode, label: 'رفع', icon: <Upload className="w-3 h-3" /> },
          { id: 'hidden' as ImageMode, label: 'إخفاء', icon: <EyeOff className="w-3 h-3" /> },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => apply({ mode: m.id })}
            className={[
              'text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1',
              mode === m.id
                ? 'bg-cyan-700 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Direct URL input */}
      {mode === 'direct_url' && (
        <div className="space-y-1">
          <input
            type="url"
            value={directUrlInput}
            onChange={(e) => setDirectUrlInput(e.target.value)}
            onBlur={() => apply({ directUrl: directUrlInput.trim() })}
            placeholder="https://example.com/player.png"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            dir="ltr"
          />
          <div className="text-[9px] text-slate-500">سيُحفظ الرابط فور انتقال التركيز.</div>
        </div>
      )}

      {/* File upload */}
      {mode === 'local_upload' && (
        <div className="space-y-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
            className="block w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-cyan-700 file:text-white file:text-[10px] file:font-bold hover:file:bg-cyan-600"
          />
          {override?.localDataUrl && (
            <div className="text-[9px] text-emerald-400">✓ صورة محفوظة محليًا</div>
          )}
        </div>
      )}

      {/* Fit / position controls (skip if hidden) */}
      {mode !== 'hidden' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-500 block mb-0.5">الاحتواء</label>
            <div className="flex gap-1">
              {(['contain', 'cover'] as ImageObjectFit[]).map((v) => (
                <button
                  key={v}
                  onClick={() => apply({ objectFit: v })}
                  className={[
                    'flex-1 text-[10px] py-1 rounded',
                    fit === v ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-slate-400',
                  ].join(' ')}
                >
                  {v === 'contain' ? 'احتواء' : 'تغطية'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 block mb-0.5">المحاذاة</label>
            <div className="flex gap-1">
              {(['top', 'center', 'bottom'] as ImagePosition[]).map((v) => (
                <button
                  key={v}
                  onClick={() => apply({ position: v })}
                  className={[
                    'flex-1 text-[10px] py-1 rounded',
                    position === v ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-slate-400',
                  ].join(' ')}
                >
                  {v === 'top' ? 'أعلى' : v === 'bottom' ? 'أسفل' : 'وسط'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className="text-[10px] text-red-400">{error}</div>}
    </div>
  );
};

export default PlayerIntelV2ImageEditor;
