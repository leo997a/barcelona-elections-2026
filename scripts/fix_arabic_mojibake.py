from __future__ import annotations

import re
from pathlib import Path

FILES = [
    "constants.ts",
    "components/ElectionOverlay.tsx",
    "pages/Home.tsx",
    "pages/Library.tsx",
    "pages/Operator.tsx",
]

MANUAL_LINE_FIXES = {
    "constants.ts": {
        75: "    { id: 'phaseLabel', label: 'مرحلة التغطية', type: 'text', value: phaseLabel },",
        84: "    { id: 'currentVoters', label: 'عدد المصوتين الحالي', type: 'number', value: 25000 },",
        86: "    { id: 'turnoutTitle', label: 'عنوان الإقبال', type: 'text', value: 'نسبة المشاركة' },",
        88: "    { id: 'currentVotersTitle', label: 'عنوان المصوتين الحاليين', type: 'text', value: 'المصوتون حتى الآن' },",
    },
    "pages/Home.tsx": {
        45: "                <span>غرفة التحكم</span>",
    },
    "pages/Library.tsx": {
        106: "            <span>غرفة التحكم</span>",
    },
    "pages/Operator.tsx": {
        392: '            <p className="text-gray-400 mb-4 text-sm">للتحكم الخارجي (StreamDeck / Bitfocus Companion)، يمكنك استخدام الـ Studio ID الخاص بك:</p>',
    },
}

SPAN_CODEPOINTS = list(range(0x00A0, 0x0100)) + [
    0x0152,
    0x0153,
    0x0161,
    0x0178,
    0x017D,
    0x017E,
    0x0192,
    0x02C6,
    0x2018,
    0x2019,
    0x201A,
    0x201C,
    0x201D,
    0x201E,
    0x2020,
    0x2021,
    0x2026,
    0x2030,
    0x2039,
    0x203A,
    0x2122,
    0x060C,
    0x061B,
    0x0637,
    0x0638,
    0x067E,
    0x0679,
    0x06BE,
]

SPAN_CHARS = "".join(chr(code) for code in SPAN_CODEPOINTS)
SPAN_EXTRA_CHARS = " 0123456789:/%()-.,!?"
SPAN_RE = re.compile(f"[{re.escape(SPAN_CHARS + SPAN_EXTRA_CHARS)}]{{4,}}")
ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
STRONG_HINTS = {chr(code) for code in SPAN_CODEPOINTS if code not in (0x0637, 0x0638)}


def count_arabic(text: str) -> int:
    return len(ARABIC_RE.findall(text))


def count_mojibake(text: str) -> int:
    return sum(char in SPAN_CHARS for char in text)


def has_strong_hint(text: str) -> bool:
    ta_za_count = text.count("\u0637") + text.count("\u0638")
    return ta_za_count >= 2 or any(char in STRONG_HINTS for char in text)


def looks_better(before: str, after: str) -> bool:
    if "\ufffd" in after:
        return False
    before_mojibake = count_mojibake(before)
    after_mojibake = count_mojibake(after)
    after_arabic = count_arabic(after)

    if after_mojibake >= before_mojibake:
        return False

    if after_mojibake <= 1 and after_arabic >= 2:
        return True

    return before_mojibake - after_mojibake >= 2 and after_arabic >= 2


def repair_span(span: str) -> str:
    if not has_strong_hint(span):
        return span

    try:
        fixed = span.encode("cp1256").decode("utf-8")
    except UnicodeError:
        return span

    if fixed == span:
        return span

    return fixed if looks_better(span, fixed) else span


def repair_line(line: str) -> str:
    updated = SPAN_RE.sub(lambda match: repair_span(match.group(0)), line)

    if updated != line:
        return updated

    if not has_strong_hint(line):
        return line

    try:
        fixed = line.encode("cp1256").decode("utf-8")
    except UnicodeError:
        return line

    if fixed == line:
        return line

    return fixed if looks_better(line, fixed) else line


def main() -> None:
    changed_files = []

    for file_path in FILES:
        path = Path(file_path)
        original = path.read_text(encoding="utf-8")
        repaired_lines = [repair_line(line) for line in original.splitlines(keepends=True)]

        for line_no, replacement in MANUAL_LINE_FIXES.get(file_path, {}).items():
            if line_no < 1 or line_no > len(repaired_lines):
                continue

            current = repaired_lines[line_no - 1]
            newline = "\r\n" if current.endswith("\r\n") else "\n" if current.endswith("\n") else ""
            repaired_lines[line_no - 1] = replacement + newline

        repaired = "".join(repaired_lines)

        if repaired == original:
            continue

        path.write_text(repaired, encoding="utf-8")
        changed_files.append(file_path)

    for file_path in changed_files:
        print(file_path)


if __name__ == "__main__":
    main()
