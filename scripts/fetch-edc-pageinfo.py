import json
import re
import urllib.request

js = urllib.request.urlopen(
    "http://portal.hi-run.net/spa/edc/static/formview/index4single.js?v=fac17c18", timeout=60
).read().decode("utf-8", "replace")

m = re.search(r'FILLIN[^\"]*\"([^\"]+)\"', js)
print("FILLIN match", m.group(1) if m else None)

# find o.FILLIN assignment
for pat in [r"FILLIN\s*=\s*\"([^\"]+)\"", r"FILLIN:\"([^\"]+)\""]:
    for hit in re.findall(pat, js)[:5]:
        print("path", hit)

KEY = "qs2fsn"
APP = "t13s87"
candidates = [
    f"http://portal.hi-run.net/api/edc/fillin/getPageInfo?key={KEY}",
    f"http://portal.hi-run.net/api/edc/fillin/getPageInfo",
    f"http://portal.hi-run.net/api/edc/page/getPageInfo?key={KEY}",
    f"http://portal.hi-run.net/api/edc/fillin/page/getPageInfo?key={KEY}",
    f"http://portal.hi-run.net/api/ec/dev/app/edc/fillin/getPageInfo?key={KEY}",
]

payload = json.dumps({"key": KEY, "oauthKey": "", "makeUp": "", "pageParams": ""}).encode("utf-8")

for url in candidates:
    for method, data in [("GET", None), ("POST", payload)]:
        try:
            req = urllib.request.Request(
                url,
                data=data,
                method=method,
                headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                body = resp.read().decode("utf-8", "replace")
                print(method, url, resp.status, body[:800])
        except Exception as exc:
            print(method, url, "ERR", exc)
