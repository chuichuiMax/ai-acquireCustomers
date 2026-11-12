import json
import urllib.request

FORM_ID = "o6n08s"
url = f"http://portal.hi-run.net/api/edc/fillin/getPageInfo?key={FORM_ID}"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=60) as resp:
    data = json.loads(resp.read().decode("utf-8"))

out = "c:/hirunAI-APP/ai-acquireCustomers/scripts/edc-o6n08s-pageinfo.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

comps = data.get("data", {}).get("comps", [])
print("saved", out, "comps", len(comps))
header = next((c for c in comps if c.get("type") == "FORM_HEADER"), None)
if header:
    print("title", header.get("config", {}).get("title"))
