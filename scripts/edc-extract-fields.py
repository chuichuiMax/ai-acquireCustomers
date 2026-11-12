import json
import sys
from pathlib import Path

pageinfo = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
comps = pageinfo["data"]["comps"]
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
            if label and str(label) not in ("其他", "-1"):
                opts.append(label)
    has_other = any(
        (o.get("showname") if isinstance(o, dict) else o) in ("其他", "-1")
        for o in (cfg.get("options") or [])
    )
    fields.append(
        {
            "type": t,
            "field": field,
            "title": title,
            "select_type": cfg.get("type") or "",
            "options": opts,
            "has_other": has_other,
            "required": cfg.get("required") == "1",
        }
    )

out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(sys.argv[1]).with_name("fields.json")
out.write_text(json.dumps(fields, ensure_ascii=False, indent=2), encoding="utf-8")
print("fields", len(fields), "->", out)
