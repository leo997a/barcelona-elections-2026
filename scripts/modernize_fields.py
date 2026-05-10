with open('pages/Editor.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# ─── 1. Modernize Tab Bar ───────────────────────────────────────────
OLD_TAB_BAR = """        <div className="flex border-b border-gray-800 overflow-x-auto no-scrollbar">
          {/* ALWAYS: Main data tab */}
          <button onClick={() => setActiveTab('fields')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'fields' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>📝 البيانات</button>"""

NEW_TAB_BAR = """        <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-hide bg-[#13151f]">
          {/* ALWAYS: Main data tab */}
          <button onClick={() => setActiveTab('fields')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'fields' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>📝 البيانات</button>"""

c = c.replace(OLD_TAB_BAR, NEW_TAB_BAR, 1)

# modernize all remaining tab buttons (batch replace pattern)
import re
def modernize_tab(m):
    inner = m.group(0)
    # change px-4 py-3 text-sm -> px-3 py-2.5 text-xs font-bold
    inner = inner.replace("px-4 py-3 text-sm font-medium whitespace-nowrap", "px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2")
    # fix active states - replace border-b-2 border-COLOR with just the active class
    inner = re.sub(r"'text-(\w+)-400 border-b-2 border-\1-500'", r"'text-\1-400 border-\1-500 bg-\1-500/5'", inner)
    inner = re.sub(r"'text-gray-400 hover:text-white'", "'text-gray-500 border-transparent hover:text-gray-300'", inner)
    return inner

# Apply to all tab button lines in tab bar region
lines = c.split('\n')
in_tab_bar = False
new_lines = []
for line in lines:
    if 'overflow-x-auto scrollbar-hide bg-[#13151f]' in line or 'overflow-x-auto no-scrollbar' in line:
        in_tab_bar = True
    if in_tab_bar and '</div>' in line and 'overflow' not in line and 'border-b' not in line and 'flex' not in line:
        # check if it closes the tab bar
        if line.strip() == '</div>':
            in_tab_bar = False
    if in_tab_bar and '<button onClick' in line and 'setActiveTab' in line:
        line = line.replace('px-4 py-3 text-sm font-medium whitespace-nowrap', 'px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2')
        line = re.sub(r"'(text-\w+-\d+) border-b-2 border-\w+-\d+'", lambda m2: f"'{m2.group(1)} border-{m2.group(1).split('-')[1]}-500 bg-{m2.group(1).split('-')[1]}-500/5'", line)
        line = line.replace("'text-gray-400 hover:text-white'", "'text-gray-500 border-transparent hover:text-gray-300'")
    new_lines.append(line)
c = '\n'.join(new_lines)

# ─── 2. Modernize scroll container ──────────────────────────────────
c = c.replace(
    '<div className="flex-1 overflow-y-auto p-4 space-y-4">',
    '<div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">'
)

# ─── 3. Modernize field: range ───────────────────────────────────────
OLD_RANGE = """                  if (field.type === 'range') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-xs text-gray-400 block">{field.label}</label>
                              <div className="flex items-center gap-2">
                                 <input type="range" min={field.min} max={field.max} step={field.step} value={Number(field.value)} onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg accent-blue-600" />
                                 <span className="text-xs font-mono">{field.value}</span>
                             </div>
                          </div>
                      );
                  }"""

NEW_RANGE = """                  if (field.type === 'range') {
                      return (
                          <div key={field.id} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-gray-400">{field.label}</label>
                                <span className="text-[11px] font-black text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">{field.value}</span>
                              </div>
                              <input type="range" min={field.min} max={field.max} step={field.step} value={Number(field.value)} onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} className="w-full h-1.5 rounded-full cursor-pointer accent-blue-500" style={{background:`linear-gradient(to right,#3b82f6 ${((Number(field.value)-(field.min||0))/((field.max||100)-(field.min||0)))*100}%,#1f2937 0%)`}} />
                          </div>
                      );
                  }"""

c = c.replace(OLD_RANGE, NEW_RANGE, 1)

# ─── 4. Modernize field: text/number ────────────────────────────────
OLD_TEXT = """                  if (field.type === 'text' || field.type === 'number') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-xs text-gray-400 block">{field.label}</label>
                              <input type={field.type} value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                          </div>
                      )
                  }"""

NEW_TEXT = """                  if (field.type === 'text' || field.type === 'number') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                              <input type={field.type} value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500/60 focus:bg-white/[0.06] focus:outline-none transition-colors placeholder-gray-600" />
                          </div>
                      )
                  }"""

c = c.replace(OLD_TEXT, NEW_TEXT, 1)

# ─── 5. Modernize field: select ──────────────────────────────────────
OLD_SELECT = """                  if (field.type === 'select') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <select value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500">
                                 {field.options?.map(opt => {
                                   const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                                   return <option key={option.value} value={option.value}>{option.label}</option>;
                                 })}
                             </select>
                         </div>
                     )
                  }"""

NEW_SELECT = """                  if (field.type === 'select') {
                     const opts = field.options?.map(o => typeof o === 'string' ? {value:o,label:o} : o) || [];
                     // Segmented control for ≤4 options
                     if (opts.length <= 4) {
                       return (
                         <div key={field.id} className="space-y-1">
                           <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                           <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                             {opts.map(opt => (
                               <button key={opt.value} onClick={() => handleDraftFieldChange(field.id, opt.value)}
                                 className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all truncate px-1 ${field.value.toString() === opt.value ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                                 {opt.label}
                               </button>
                             ))}
                           </div>
                         </div>
                       );
                     }
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                             <select value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500/60 focus:outline-none transition-colors appearance-none">
                                 {opts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                             </select>
                         </div>
                     )
                  }"""

c = c.replace(OLD_SELECT, NEW_SELECT, 1)

# ─── 6. Modernize field: boolean → toggle switch ─────────────────────
OLD_BOOL = """                  if (field.type === 'boolean') {
                     return (
                         <div key={field.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                             <label className="text-xs text-gray-300">{field.label}</label>
                             <input type="checkbox" checked={field.value as boolean} onChange={(e) => handleDraftFieldChange(field.id, e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                         </div>
                     )
                  }"""

NEW_BOOL = """                  if (field.type === 'boolean') {
                     return (
                         <div key={field.id} className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                             <label className="text-[11px] font-semibold text-gray-300 cursor-pointer" onClick={() => handleDraftFieldChange(field.id, !field.value)}>{field.label}</label>
                             <button onClick={() => handleDraftFieldChange(field.id, !field.value)}
                               className={`relative w-9 h-5 rounded-full transition-all duration-200 ${field.value ? 'bg-blue-600' : 'bg-gray-700'}`}>
                               <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${field.value ? 'left-4' : 'left-0.5'}`} />
                             </button>
                         </div>
                     )
                  }"""

c = c.replace(OLD_BOOL, NEW_BOOL, 1)

# ─── 7. Modernize field: textarea ────────────────────────────────────
OLD_TEXTAREA = """                  if (field.type === 'textarea') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-xs text-gray-400 block">{field.label}</label>
                              <textarea value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} rows={5} className="w-full resize-y bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                          </div>
                      )
                  }"""

NEW_TEXTAREA = """                  if (field.type === 'textarea') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                              <textarea value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} rows={4} className="w-full resize-y bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500/60 focus:outline-none transition-colors leading-relaxed" />
                          </div>
                      )
                  }"""

c = c.replace(OLD_TEXTAREA, NEW_TEXTAREA, 1)

# ─── 8. Modernize field: color ───────────────────────────────────────
OLD_COLOR = """                  if (field.type === 'color') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-xs text-gray-400 block">{field.label}</label>
                              <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                                  <input type="color" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="h-10 w-14 cursor-pointer rounded border-none bg-transparent" />
                                  <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none" />
                              </div>
                          </div>
                      )
                  }"""

NEW_COLOR = """                  if (field.type === 'color') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                              <label className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 cursor-pointer hover:border-white/20 transition-colors">
                                  <span className="w-7 h-7 rounded-lg shadow-inner border border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
                                    <input type="color" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-10 h-10 cursor-pointer border-none bg-transparent scale-150 opacity-0 absolute" />
                                    <span className="w-full h-full rounded-lg" style={{backgroundColor: field.value.toString()}} />
                                  </span>
                                  <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-transparent text-sm font-mono text-gray-300 focus:outline-none focus:text-white" />
                                  <input type="color" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-7 h-7 cursor-pointer rounded-lg border-none" />
                              </label>
                          </div>
                      )
                  }"""

c = c.replace(OLD_COLOR, NEW_COLOR, 1)

# ─── 9. Modernize field: image ───────────────────────────────────────
OLD_IMAGE = """                  if (field.type === 'image') {
                      return (
                          <div key={field.id} className="space-y-1">
                              <label className="text-xs text-gray-400 block">{field.label}</label>
                              <div className="flex items-center gap-2">
                                  <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" placeholder="رابط الصورة..." />
                                  <button onClick={() => triggerFileUpload(field.id)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors" title="رفع صورة من الجهاز">
                                      رفع
                                  </button>
                              </div>
                              {field.value && field.value.toString().startsWith('data:image') && (
                                  <div className="mt-2 text-[10px] text-green-400">تم رفع صورة محلية</div>
                              )}
                          </div>
                      )
                  }"""

NEW_IMAGE = """                  if (field.type === 'image') {
                      return (
                          <div key={field.id} className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-gray-400 block">{field.label}</label>
                              <div className="flex items-center gap-2">
                                {field.value && (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/30 shrink-0">
                                    <img src={field.value.toString()} className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} alt="" />
                                  </div>
                                )}
                                <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500/60 focus:outline-none transition-colors" placeholder="رابط الصورة أو ارفع..." />
                                <button onClick={() => triggerFileUpload(field.id)} className="shrink-0 bg-white/[0.06] hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-white/[0.08] flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />رفع
                                </button>
                              </div>
                              {field.value && field.value.toString().startsWith('data:image') && (
                                  <div className="text-[10px] text-emerald-400 font-medium">✓ صورة محلية</div>
                              )}
                          </div>
                      )
                  }"""

c = c.replace(OLD_IMAGE, NEW_IMAGE, 1)

with open('pages/Editor.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("All field renderers modernized successfully!")
