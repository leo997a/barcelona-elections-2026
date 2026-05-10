import sys

with open('pages/Editor.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = """// Draft State
  const [draftOverlay, setDraftOverlay] = useState<OverlayConfig>(() => normalizeElectionOverlay(JSON.parse(JSON.stringify(liveOverlay))));

  // --- SPONSORS MANAGEMENT STATE ---"""

NEW = """// Draft State
  const [draftOverlay, setDraftOverlay] = useState<OverlayConfig>(() => normalizeElectionOverlay(JSON.parse(JSON.stringify(liveOverlay))));
  const [panelOpen, setPanelOpen] = useState(true);
  const [newSlotName, setNewSlotName] = useState('');

  // --- SPONSORS MANAGEMENT STATE ---"""

if OLD in c:
    c = c.replace(OLD, NEW, 1)
    print('State patch: OK')
else:
    print('State patch: FAILED')
    sys.exit(1)

# Replace old outer layout div + old right panel header with new broadcast studio layout
OLD_RENDER = """  // --- RENDER ---
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      
      {/* RIGHT PANEL */}
      <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-10 shadow-2xl">
         <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
           <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
             <ChevronRight className="w-4 h-4" /> عودة
           </button>
           <div className="flex items-center gap-2">
               <span className="text-[10px] text-gray-500 font-mono tracking-widest hidden lg:block border border-gray-700 px-2 rounded">SPACE = ON AIR</span>
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-green-500 bg-green-900/20 border border-green-500/20">
                <Sparkles className="w-3 h-3" />
                <span>حفظ تلقائي</span>
               </div>
           </div>
        </div>"""

NEW_RENDER = """  // --- RENDER ---
  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0d10]" dir="rtl">

      {/* ═══ PREVIEW AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-[#10121a] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs font-bold transition-colors">
              <ChevronRight className="w-4 h-4" /><span>المكتبة</span>
            </button>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-white text-xs font-bold truncate max-w-[200px]">{draftOverlay.name}</span>
            {liveOverlay.isVisible && <span className="text-[9px] font-black text-red-400 bg-red-900/20 border border-red-700/30 px-2 py-0.5 rounded-full animate-pulse">● ON AIR</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewChroma(!previewChroma)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${previewChroma ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'text-gray-500 border-gray-800 hover:text-white'}`}>Chroma</button>
            <button onClick={async () => { const u = await syncManager.prepareOutputUrl(liveOverlay.id, liveOverlay); window.open(u, '_blank', 'width=1280,height=720'); }} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs font-bold border border-blue-600/30 transition-colors">
              <Monitor className="w-3 h-3" />نافذة البث
            </button>
            <button onClick={toggleLiveVisibility} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${liveOverlay.isVisible ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'}`}>
              {liveOverlay.isVisible ? <><Eye className="w-3.5 h-3.5" />إيقاف البث</> : <><EyeOff className="w-3.5 h-3.5" />إظهار على البث</>}
            </button>
            <button onClick={() => setPanelOpen(p => !p)} className="p-1.5 rounded-lg border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 transition-colors">
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${panelOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Monitor */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 w-full max-w-[1920px] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-black/40">
            <OverlayRenderer config={{ ...draftOverlay, isVisible: true }} chromaKey={previewChroma} isEditor={true} />
            <div className="absolute inset-[4%] border border-white/5 border-dashed pointer-events-none rounded" />
          </div>
        </div>

        {/* Slot Quick-Bar */}
        <div className="shrink-0 border-t border-white/5 bg-[#10121a] px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 shrink-0">Presets</span>
          <div className="w-px h-3 bg-white/10 shrink-0" />
          {Object.keys(draftOverlay.slots || {}).map(name => (
            <button key={name} onClick={() => { const upd = { ...draftOverlay, activeSlot: name, fields: JSON.parse(JSON.stringify(draftOverlay.slots[name])) }; setDraftOverlay(upd); syncManager.updateOverlay(upd); }}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${ draftOverlay.activeSlot === name ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20' }`}>
              {draftOverlay.activeSlot === name && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 align-middle" />}{name}
            </button>
          ))}
          <input value={newSlotName} onChange={e => setNewSlotName(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){ const n=newSlotName.trim()||`نسخة ${Object.keys(draftOverlay.slots||{}).length+1}`; const upd={...draftOverlay,slots:{...draftOverlay.slots,[n]:JSON.parse(JSON.stringify(draftOverlay.fields))},activeSlot:n}; setDraftOverlay(upd); syncManager.updateOverlay(upd); setNewSlotName(''); }}} placeholder="اسم نسخة جديدة..." className="bg-transparent text-xs text-white placeholder-gray-700 focus:outline-none w-28 shrink-0" />
          <button onClick={() => { const n=newSlotName.trim()||`نسخة ${Object.keys(draftOverlay.slots||{}).length+1}`; const upd={...draftOverlay,slots:{...draftOverlay.slots,[n]:JSON.parse(JSON.stringify(draftOverlay.fields))},activeSlot:n}; setDraftOverlay(upd); syncManager.updateOverlay(upd); setNewSlotName(''); }} className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-dashed border-indigo-700/50 text-indigo-400 hover:border-indigo-500 transition-all flex items-center gap-1">
            <Plus className="w-3 h-3" />حفظ
          </button>
        </div>
      </div>

      {/* ═══ RIGHT CONTROL PANEL ═══ */}
      <div className={`bg-[#13151f] border-r border-white/5 flex flex-col z-10 transition-all duration-300 overflow-hidden ${ panelOpen ? 'w-[360px]' : 'w-0' }`}>
        <div className="w-[360px] h-full flex flex-col">
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400">حفظ تلقائي</span>
            </div>
            <Sparkles className="w-4 h-4 text-gray-700" />
          </div>"""

if OLD_RENDER in c:
    c = c.replace(OLD_RENDER, NEW_RENDER, 1)
    print('Render patch: OK')
else:
    print('Render patch: FAILED - searching...')
    idx = c.find('// --- RENDER ---')
    print(f'  Render marker at index: {idx}')
    if idx > 0:
        print(repr(c[idx:idx+300]))
    sys.exit(1)

# Replace old monitor section + closing with correct closing
OLD_TAIL = """      {/* CENTER PANEL (PREVIEW MONITOR) */}
      <div className="flex-1 flex flex-col bg-[#0f1115] relative overflow-hidden">
         {/* Top Control Bar */}
         <div className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#15181e] shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20">"""

if OLD_TAIL in c:
    tail_start = c.find(OLD_TAIL)
    # find the end of the file structure
    file_end = """export default Editor;
"""
    tail_end = c.rfind(file_end)
    if tail_end > tail_start:
        c = c[:tail_start] + "        </div>{/* end right panel inner */}\n      </div>{/* end right panel */}\n    </div>\n  );\n};\n\nexport default Editor;\n"
        print('Tail patch: OK')
    else:
        print('Tail patch: end not found')
else:
    print('Tail patch: OLD_TAIL not found')

with open('pages/Editor.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('File saved.')
