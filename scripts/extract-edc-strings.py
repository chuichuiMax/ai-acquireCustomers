import re
import urllib.request

js = urllib.request.urlopen(
    "http://portal.hi-run.net/spa/edc/static/formview/index4single.js?v=fac17c18", timeout=60
).read().decode("utf-8", "replace")

for needle in ["getFormPageInfo", "form/template", "fillin", "qs2fsn", "layoutKey", "_key"]:
    i = 0
    while True:
        pos = js.find(needle, i)
        if pos == -1:
            break
        print("---", needle, pos)
        print(js[pos - 120 : pos + 180].replace("\n", " "))
        i = pos + len(needle)
        if i > pos + 5000:
            break

# all unique chinese strings length>=8 in bundle (sample)
chs = sorted(set(re.findall(r"[\u4e00-\u9fff，。、？（）：]{8,}", js)))
print("chinese strings", len(chs))
for s in chs[:40]:
    print(s)
