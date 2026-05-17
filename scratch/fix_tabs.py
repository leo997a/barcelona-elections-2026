# -*- coding: utf-8 -*-
"""Fix mangled tab buttons in Editor.tsx"""
import re

filepath = r"c:\New folder\barcelona-elections-2026\pages\Editor.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match broken tab buttons like:
# <button onClick={() =>setActiveTab fields className px-3 py-2.5 ...>...</button>
# They should be:
# <button onClick={() => setActiveTab('tabName')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'tabName' ? 'text-COLOR border-COLOR bg-COLOR/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Label</button>

def fix_tab_button(match):
    full = match.group(0)
    
    # Extract tab name - it's the word right after "setActiveTab "
    tab_match = re.search(r'setActiveTab\s+(\S+)\s+className', full)
    if not tab_match:
        return full
    tab_name = tab_match.group(1)
    
    # Extract colors - find patterns like text-COLOR-NNN
    color_match = re.search(r'text-(blue|amber|purple|cyan|emerald|yellow|green|indigo|red|orange)-(\d+)', full)
    if not color_match:
        color = 'blue'
        shade = '400'
    else:
        color = color_match.group(1)
        shade = color_match.group(2)
    
    # Map tab names to labels
    labels = {
        'fields': 'Data',
        'images': 'Images', 
        'style': 'Style',
        'position': 'Position',
        'football-main': 'Main',
        'football-lineup': 'Lineup',
        'football-score': 'Score',
        'sound': 'Sound',
        'slots': 'Slots',
        'sponsors': 'Sponsors',
    }
    label = labels.get(tab_name, tab_name.replace('-', ' ').title())
    
    return f"""<button onClick={{() => setActiveTab('{tab_name}')}} className={{`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${{activeTab === '{tab_name}' ? 'text-{color}-{shade} border-{color}-500 bg-{color}-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}}`}}>{label}</button>"""

# Match the broken button patterns
content = re.sub(
    r'<button onClick=\{?\(\) =>setActiveTab [^<]*</button>',
    fix_tab_button,
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# Count fixes
count = len(re.findall(r"setActiveTab\('", content))
print(f"Fixed tab buttons. Found {count} setActiveTab calls.")
