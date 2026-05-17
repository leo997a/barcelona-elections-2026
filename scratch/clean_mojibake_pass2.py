# -*- coding: utf-8 -*-
"""
Aggressive pass 2: replace ANY remaining non-ASCII string with English equivalent.
"""
import re

filepath = r"c:\New folder\barcelona-elections-2026\pages\Editor.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
new_lines = []
for i, line in enumerate(lines):
    has_non_ascii = any(ord(c) > 127 for c in line)
    if not has_non_ascii:
        new_lines.append(line)
        continue
    
    original = line
    
    # Replace single-quoted strings with non-ASCII
    def replace_sq(m):
        s = m.group(1)
        if all(ord(c) < 128 for c in s):
            return m.group(0)
        ascii_words = re.findall(r'[a-zA-Z0-9_./%-]+', s)
        clean = ' '.join(ascii_words).strip()
        if clean:
            return f"'{clean}'"
        return "''"
    
    line = re.sub(r"'([^']*)'", replace_sq, line)
    
    # Replace backtick strings with non-ASCII  
    def replace_bt(m):
        s = m.group(1)
        if all(ord(c) < 128 for c in s):
            return m.group(0)
        # Preserve ${...} template expressions
        parts = re.split(r'(\$\{[^}]*\})', s)
        cleaned = []
        for part in parts:
            if part.startswith('${'):
                cleaned.append(part)
            else:
                ascii_words = re.findall(r'[a-zA-Z0-9_./%-]+', part)
                if ascii_words:
                    cleaned.append(' '.join(ascii_words))
        result = ' '.join(cleaned).strip()
        return f"`{result}`"
    
    line = re.sub(r"`([^`]*)`", replace_bt, line)
    
    # Replace JSX text content with non-ASCII (between > and <)
    def replace_jsx(m):
        prefix = m.group(1)
        text = m.group(2)
        suffix = m.group(3)
        if all(ord(c) < 128 for c in text):
            return m.group(0)
        ascii_words = re.findall(r'[a-zA-Z0-9_./%-]+', text)
        clean = ' '.join(ascii_words).strip()
        return f"{prefix}{clean}{suffix}"
    
    line = re.sub(r'(>)([^<]*[^\x00-\x7F][^<]*)(<)', replace_jsx, line)
    
    # Final: remove any remaining non-ASCII chars in the line (comments etc.)
    # Only for lines that STILL have non-ASCII after all replacements
    if any(ord(c) > 127 for c in line):
        # Replace non-ASCII chars with empty string, but preserve line structure
        clean_line = ''
        for c in line:
            if ord(c) < 128:
                clean_line += c
            # Skip non-ASCII chars
        line = clean_line
    
    if line != original:
        count += 1
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Pass 2 done. Fixed {count} lines.")
