import json
import re
import urllib.request

js = urllib.request.urlopen(
    "http://portal.hi-run.net/spa/edc/static/formview/index4single.js?v=fac17c18", timeout=60
).read().decode("utf-8", "replace")

idx = js.find("appId")
print("appId context:", js[idx : idx + 200])

for pat in [
    r"formview/[^\"']+",
    r"template/[^\"']+",
    r"get[A-Z][a-zA-Z]+Form[^\"']*",
    r"/api/edc/[a-zA-Z0-9_/]+",
]:
    hits = sorted(set(re.findall(pat, js)))
    print(pat, len(hits))
    for h in hits[:25]:
        print(" ", h)

# Extract strings near "formview"
for m in re.finditer("formview", js):
    if m.start() < 100000:
        continue
    snippet = js[m.start() - 80 : m.start() + 120]
    if "api" in snippet.lower():
        print("SNIP", snippet.replace("\n", " ")[:200])

urls = [
    "http://portal.hi-run.net/api/edc/form/template/t13s87",
    "http://portal.hi-run.net/api/edc/fillin/template/t13s87",
    "http://portal.hi-run.net/api/edc/fillin/getFormInfo?t13s87",
    "http://portal.hi-run.net/api/edc/page/getFormPageInfo?appId=t13s87",
    "http://portal.hi-run.net/api/edc/page/getFormPageInfo?formId=t13s87&layoutKey=qs2fsn",
    "http://portal.hi-run.net/api/edc/form/public/page?t13s87&_key=qs2fsn",
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", "replace")
            print("OK", url, body[:500])
    except Exception as exc:
        print("ERR", url, exc)
