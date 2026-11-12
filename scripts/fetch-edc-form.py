import json
import re
import urllib.request

FORM_ID = "t13s87"
KEY = "qs2fsn"

for js_url in [
    "http://portal.hi-run.net/spa/edc/static/formview/index4single.js?v=fac17c18",
    "http://portal.hi-run.net/spa/edc/static/formview/index.js?v=0f7c0dab",
    "http://portal.hi-run.net/spa/edc/static4mobile/index.js",
]:
    print("===", js_url)
    js = urllib.request.urlopen(js_url, timeout=60).read().decode("utf-8", "replace")
    print("len", len(js))
for needle in [KEY, FORM_ID, "getLayout", "loadForm", "formKey", "appId", "/api/edc"]:
    print(needle, js.find(needle))

paths = sorted(set(re.findall(r'"(/api/edc[^"]+)"', js)))
print("api paths", len(paths))
for p in paths[:30]:
    print(p)

paths2 = sorted(set(re.findall(r'"(/spa/edc/apis[^"]+)"', js)))
print("spa apis", len(paths2))
for p in paths2[:30]:
    print(p)

# probe known template API (needs auth?)
for url in [
    f"http://portal.hi-run.net/api/edc/form/template/{FORM_ID}",
    f"http://portal.hi-run.net/api/edc/form/public/template/{FORM_ID}",
    f"http://portal.hi-run.net/api/edc/form/public/detail?formId={FORM_ID}&key={KEY}",
]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", "replace")
            print("GET", url, resp.status, body[:400])
    except Exception as exc:
        print("GET", url, "ERR", exc)
