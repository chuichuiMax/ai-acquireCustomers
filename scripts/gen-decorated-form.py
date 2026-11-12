import json
from pathlib import Path

root = Path("c:/hirunAI-APP/ai-acquireCustomers")
fields = json.loads((root / "scripts/edc-t13s87-fields.json").read_text(encoding="utf-8"))
SKIP = {"field044", "field041", "field045", "field047"}
TITLE_FIX = {
    "field032": "主卫（整体改造）",
    "field033": "次卫（整体改造）",
    "field034": "主卫（设备需求）",
    "field035": "次卫（设备需求）",
}

questions = []
for field in fields:
    if field["field"] in SKIP:
        continue
    key = field["field"]
    title = TITLE_FIX.get(key, field["title"])
    if field["type"] == "SELECT":
        kind = "check" if field["select_type"] == "checkbox" else "radio"
        q = {"key": key, "title": title, "kind": kind, "options": list(field["options"])}
        if field["has_other"]:
            q["other"] = True
        questions.append(q)
    elif field["type"] == "COMBOBOX":
        if key == "field046":
            questions.append({"key": key, "title": title, "kind": "text", "placeholder": "请输入店面名称"})
        else:
            questions.append({"key": key, "title": title, "kind": "radio", "options": list(field["options"])})

steps = [
    {"id": "base", "title": "基本定位", "questionKeys": [q["key"] for q in questions[0:7]]},
    {"id": "device", "title": "改造与设备", "questionKeys": [q["key"] for q in questions[7:12]]},
    {"id": "living", "title": "玄关·客厅·餐厅", "questionKeys": [q["key"] for q in questions[12:18]]},
    {"id": "bedroom", "title": "卧室空间", "questionKeys": [q["key"] for q in questions[18:25]]},
    {"id": "flex", "title": "多功能房·阳台", "questionKeys": [q["key"] for q in questions[25:29]]},
    {"id": "kitchen", "title": "厨房·卫浴·店面", "questionKeys": [q["key"] for q in questions[29:]]},
]

out = f"""/** 精装房题本：与 EDC http://portal.hi-run.net/edc/formview/t13s87 同源 */
export const DECORATED_FORM_INTRO_TITLE = '精装房定制需求表'

export const DECORATED_QUESTIONS = {json.dumps(questions, ensure_ascii=False, indent=2)}

export const DECORATED_FORM_STEPS = {json.dumps(steps, ensure_ascii=False, indent=2)}
"""

(root / "utils/requirement-list-form-decorated.mjs").write_text(out, encoding="utf-8")
print(len(questions), "questions")
