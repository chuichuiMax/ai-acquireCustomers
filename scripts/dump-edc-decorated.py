import json
import urllib.request

url = "http://portal.hi-run.net/api/edc/fillin/getPageInfo?key=t13s87"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=60) as resp:
    data = json.loads(resp.read().decode("utf-8"))

out = "c:/hirunAI-APP/ai-acquireCustomers/scripts/edc-t13s87-pageinfo.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("saved", out)
print("comps", len(data.get("data", {}).get("comps", [])))
