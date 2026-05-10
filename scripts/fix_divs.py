with open('pages/Editor.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find ); line from end
idx = None
for i in range(len(lines)-1, -1, -1):
    if lines[i].strip() == ');':
        idx = i
        break

print(f'); at line {idx+1}')
for _ in range(6):
    lines.insert(idx, '      </div>\n')
    idx += 1

with open('pages/Editor.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

with open('pages/Editor.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
rs = c[c.find('// --- RENDER ---'):]
opens = rs.count('<div')
closes = rs.count('</div>')
print(f'Diff={opens - closes}')
