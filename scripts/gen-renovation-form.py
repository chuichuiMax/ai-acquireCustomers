import json
import re
from pathlib import Path

root = Path("c:/hirunAI-APP/ai-acquireCustomers")
fields = json.loads((root / "scripts/edc-o6n08s-fields.json").read_text(encoding="utf-8"))
SKIP = {"field001", "field002", "field004", "field040"}
MAX_FIELD_NUM = 18  # 第 11 题后仅保留至「全房需求」四项，不含封窗及之后

def field_num(name: str) -> int:
    m = re.search(r"(\d+)", name)
    return int(m.group(1)) if m else 999

ordered = sorted(
    [f for f in fields if f["field"] not in SKIP and field_num(f["field"]) <= MAX_FIELD_NUM],
    key=lambda f: field_num(f["field"]),
)

questions = []
for field in ordered:
    key = field["field"]
    title = field["title"]
    if field["type"] == "TEXT":
        questions.append({"key": key, "title": title, "kind": "text"})
        continue
    if field["type"] == "SELECT":
        kind = "check" if field["select_type"] == "checkbox" else "radio"
        q = {"key": key, "title": title, "kind": kind, "options": list(field["options"])}
        if field["has_other"]:
            q["other"] = True
        questions.append(q)
    elif field["type"] == "COMBOBOX":
        questions.append({"key": key, "title": title, "kind": "radio", "options": list(field["options"])})

keys = [q["key"] for q in questions]
# 基本信息 field003~011 | 关注与预算 field012~014 | 全房需求 field015~018（与原型一致）
steps = [
    {"id": "base", "title": "基本信息", "questionKeys": keys[0:8]},
    {"id": "plan", "title": "关注与预算", "questionKeys": keys[8:11]},
    {"id": "whole", "title": "全房需求", "questionKeys": keys[11:]},
]

intro = "旧房焕新定制需求表"
out = f"""/** 旧房焕新题本：与 EDC http://portal.hi-run.net/edc/formview/o6n08s 同源 */
export const RENOVATION_FORM_INTRO_TITLE = '{intro}'

export const RENOVATION_QUESTIONS = {json.dumps(questions, ensure_ascii=False, indent=2)}

export const RENOVATION_FORM_STEPS = {json.dumps(steps, ensure_ascii=False, indent=2)}
"""
(root / "utils/requirement-list-form-renovation.mjs").write_text(out, encoding="utf-8")
print(len(questions), "questions", [s["title"] for s in steps])

# backend fields
lines = []
for q in questions:
    if q["kind"] == "text":
        lines.append(f'    ("{q["key"]}", "text", False),')
    else:
        other = bool(q.get("other"))
        kind = q["kind"]
        lines.append(f'    ("{q["key"]}", "{kind}", {other}),')
block = "_RENOVATION_ANSWER_FIELDS = (\n" + "\n".join(lines) + "\n)\n"
(root / "scripts/renovation_answer_fields.py.txt").write_text(block, encoding="utf-8")
