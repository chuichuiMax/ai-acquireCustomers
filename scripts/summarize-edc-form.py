import json
import re
from html import unescape
from pathlib import Path

data = json.loads(Path("c:/hirunAI-APP/ai-acquireCustomers/scripts/edc-t13s87-pageinfo.json").read_text(encoding="utf-8"))
comps = data["data"]["comps"]

fields = []
for c in comps:
    t = c.get("type")
    if t in ("FORM_HEADER", "DESCRIPTION", "COLUMNPANEL2", "DIVIDER", "IMAGE", "BUTTON", "SUBMIT", "FORM_FOOTER"):
        continue
    cfg = c.get("config") or {}
    title = (cfg.get("title") or "").strip()
    if not title:
        continue
    field = c.get("fieldName") or c.get("uuid")
    opts = []
    for o in cfg.get("options") or []:
        if isinstance(o, dict):
            label = o.get("showname") or o.get("name") or o.get("label")
            if label and label != "其他":
                opts.append(label)
    select_type = cfg.get("type") or ""
    fields.append(
        {
            "type": t,
            "field": field,
            "title": title,
            "select_type": select_type,
            "options": opts,
            "has_other": any(
                (o.get("showname") if isinstance(o, dict) else o) in ("其他", "-1")
                for o in (cfg.get("options") or [])
            ),
            "required": cfg.get("required") == "1",
        }
    )

print("field count", len(fields))
for i, f in enumerate(fields, 1):
    kind = f["type"]
    if kind == "SELECT":
        st = "check" if f["select_type"] == "checkbox" else "radio"
        print(f"{i}. {f['title']} [{st}] ({len(f['options'])} opts)")
        if len(f["options"]) <= 12:
            print("   ", " / ".join(f["options"]))
    else:
        print(f"{i}. {f['title']} [{kind}]")

Path("c:/hirunAI-APP/ai-acquireCustomers/scripts/edc-t13s87-fields.json").write_text(
    json.dumps(fields, ensure_ascii=False, indent=2), encoding="utf-8"
)
