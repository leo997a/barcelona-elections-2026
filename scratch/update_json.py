# -*- coding: utf-8 -*-
import json
with open("c:\\New folder\\barcelona-elections-2026\\scratch\\metrics_coverage.json", "r", encoding="utf-8") as f:
    data = json.load(f)

if "minutes" in data:
    data["minutes"]["statGroup"] = "standard"
    data["minutes"]["sourceColumn"] = "playing time_min"

if "starts" in data:
    data["starts"]["statGroup"] = "standard"
    data["starts"]["sourceColumn"] = "playing time_starts"

data["appearances"] = {
    "label": "Appearances",
    "labelAr": "المباريات",
    "statGroup": "standard",
    "sourceColumn": "playing time_mp",
    "category": "playing_time"
}

with open("c:\\New folder\\barcelona-elections-2026\\scratch\\metrics_coverage.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
