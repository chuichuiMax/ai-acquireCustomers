import json
from pathlib import Path

fields = json.loads(Path("c:/hirunAI-APP/ai-acquireCustomers/scripts/edc-t13s87-fields.json").read_text(encoding="utf-8"))
SKIP = {"field044", "field041", "field045", "field047"}
lines = []
for field in fields:
    if field["field"] in SKIP:
        continue
    if field["type"] not in ("SELECT", "COMBOBOX"):
        continue
    kind = "check" if field["type"] == "SELECT" and field["select_type"] == "checkbox" else "radio"
    other = bool(field.get("has_other"))
    lines.append(f'    ("{field["field"]}", "{kind}", {other}),')

block = "_DECORATED_ANSWER_FIELDS = (\n" + "\n".join(lines) + "\n)\n"
print(block)
Path("c:/hirunAI-APP/ai-acquireCustomers/scripts/decorated_answer_fields.py.txt").write_text(block, encoding="utf-8")
