import sys

filepath = r'c:\New folder\barcelona-elections-2026\pages\Editor.tsx'
f = open(filepath, 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Insert upper panel wrapper before QUICK ACTIONS PANEL
old1 = '{/* QUICK ACTIONS PANEL */}'
new1 = (
    '         <div className="flex flex-col overflow-hidden" style={{ height: `${sidebarSplitPct}%` }}>\n'
    '         <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">\n'
    '         {/* QUICK ACTIONS PANEL */}'
)
content = content.replace(old1, new1, 1)

# 2. Insert splitter + lower panel wrapper before the general tabs bar
old2 = '        <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-hide bg-[#13151f]">'
splitter = (
    '         </div></div>\n'
    '         {/* RESIZABLE SPLITTER */}\n'
    '         <div\n'
    '           className="h-2 cursor-row-resize bg-white/[0.04] hover:bg-cyan-500/20 transition-colors flex items-center justify-center group shrink-0"\n'
    '           onMouseDown={(e) => {\n'
    '             e.preventDefault();\n'
    '             const sidebar = e.currentTarget.parentElement;\n'
    '             if (!sidebar) return;\n'
    '             const rect = sidebar.getBoundingClientRect();\n'
    '             const onMove = (ev: MouseEvent) => {\n'
    '               const pct = ((ev.clientY - rect.top) / rect.height) * 100;\n'
    '               setSidebarSplitPct(Math.max(15, Math.min(85, pct)));\n'
    '             };\n'
    '             const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };\n'
    '             document.addEventListener("mousemove", onMove);\n'
    '             document.addEventListener("mouseup", onUp);\n'
    '           }}\n'
    '         >\n'
    '           <div className="w-8 h-0.5 rounded-full bg-white/20 group-hover:bg-cyan-400/60 transition-colors" />\n'
    '         </div>\n'
    '         <div className="flex flex-col overflow-hidden" style={{ height: `${100 - sidebarSplitPct}%` }}>\n'
    '        <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-hide bg-[#13151f]">'
)
content = content.replace(old2, splitter, 1)

f = open(filepath, 'w', encoding='utf-8')
f.write(content)
f.close()
print('Done - splitter inserted')
