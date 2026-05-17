# -*- coding: utf-8 -*-
import re

filepath = r"c:\New folder\barcelona-elections-2026\pages\Editor.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)

# 1. Clean alias arrays - keep only ASCII entries
def clean_alias_array(match):
    full = match.group(0)
    entries = re.findall(r"'([^']*)'", full)
    ascii_entries = [e for e in entries if all(ord(c) < 128 for c in e)]
    if not ascii_entries:
        return full
    return '[' + ', '.join(f"'{e}'" for e in ascii_entries) + ']'

content = re.sub(r"\[(?:'[^']*',?\s*)+\]", clean_alias_array, content)

# 2. Clean aliases fields
def clean_aliases_field(match):
    full = match.group(0)
    entries = re.findall(r"'([^']*)'", full)
    ascii_entries = [e for e in entries if all(ord(c) < 128 for c in e)]
    if not ascii_entries:
        ascii_entries = entries[:1]
    return 'aliases: [' + ', '.join(f"'{e}'" for e in ascii_entries) + ']'

content = re.sub(r"aliases:\s*\[(?:'[^']*',?\s*)+\]", clean_aliases_field, content)

# 3. Error messages with non-ASCII
for fn_name in ['setAiBoxMessage', 'setMatchStatsImportMessage']:
    for msg_type in ['error', 'success']:
        eng = 'An error occurred.' if msg_type == 'error' else 'Operation completed.'
        if fn_name == 'setMatchStatsImportMessage':
            eng = 'Import failed.' if msg_type == 'error' else 'Import completed.'
        for quote in ["'", '`']:
            end_quote = quote
            pattern = re.compile(
                re.escape(fn_name) + r"\(\{\s*type:\s*'" + msg_type + r"',\s*text:\s*" + 
                re.escape(quote) + r"[^" + re.escape(end_quote) + r"]*[^\x00-\x7F][^" + 
                re.escape(end_quote) + r"]*" + re.escape(end_quote) + r"\s*\}\)"
            )
            content = pattern.sub(f"{fn_name}({{ type: '{msg_type}', text: '{eng}' }})", content)

# 4. setPasswordError
content = re.sub(
    r"setPasswordError\([^)]*[^\x00-\x7F][^)]*\)",
    "setPasswordError('Authentication failed.')",
    content
)

# 5. throw new Error with non-ASCII
content = re.sub(
    r"throw new Error\('[^']*[^\x00-\x7F][^']*'\)",
    "throw new Error('Operation failed.')",
    content
)
content = re.sub(
    r"throw new Error\(`[^`]*[^\x00-\x7F][^`]*`\)",
    "throw new Error('Operation failed.')",
    content
)

# 6. Field labels with non-ASCII
def clean_label(match):
    prefix = match.group(1)
    label_text = match.group(2)
    if all(ord(c) < 128 for c in label_text):
        return match.group(0)
    ascii_words = re.findall(r'[a-zA-Z0-9/_]+', label_text)
    if ascii_words:
        return f"{prefix}'{' '.join(ascii_words)}'"
    return f"{prefix}'Field'"

content = re.sub(r"(label:\s*)'([^']*[^\x00-\x7F][^']*)'", clean_label, content)

# 7. Regex patterns with non-ASCII - replace with safe ASCII patterns
content = re.sub(
    r"const match = text\.match\(/[^/]*[^\x00-\x7F][^/]*/[gimsuvy]*\);",
    r"const match = text.match(/(?:percentage|probability|likely|chance|rate)/i);",
    content
)
content = re.sub(
    r"/[^/]*[^\x00-\x7F][^/]*/[gimsuvy]*\.test\(",
    "/(?:unknown|not specified)/i.test(",
    content
)

# 8. value fallback
content = re.sub(
    r"value === null \|\| value === undefined \? '[^']*[^\x00-\x7F][^']*'",
    "value === null || value === undefined ? 'N/A'",
    content
)

# 9. option labels
def clean_option_label(match):
    prefix = match.group(1)
    label = match.group(2)
    if all(ord(c) < 128 for c in label):
        return match.group(0)
    ascii_words = re.findall(r'[a-zA-Z0-9/]+', label)
    if ascii_words:
        return f"{prefix}'{' '.join(ascii_words)}'"
    return f"{prefix}'Option'"

content = re.sub(r"(\{\s*value:\s*'[^']*',\s*label:\s*)'([^']*[^\x00-\x7F][^']*)'", clean_option_label, content)

# 10. statusText
content = re.sub(
    r"const statusText = [^;]*[^\x00-\x7F][^;]*;",
    "const statusText = payload.pollingActive || payload.workerAlive ? 'Active' : 'Inactive';",
    content
)

# 11. Final sweep: any remaining single-quoted string with >30% non-ASCII
def clean_remaining(match):
    s = match.group(1)
    if all(ord(c) < 128 for c in s):
        return match.group(0)
    non_ascii = sum(1 for c in s if ord(c) > 127)
    if non_ascii > len(s) * 0.3 and non_ascii > 3:
        ascii_part = re.findall(r'[a-zA-Z0-9_./ ]+', s)
        ascii_content = ' '.join(ascii_part).strip()
        if len(ascii_content) > 5:
            return f"'{ascii_content}'"
        return "''"
    return match.group(0)

content = re.sub(r"'([^']{4,})'", clean_remaining, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done. Original: {original_len}, New: {len(content)}, Removed: {original_len - len(content)} chars")
