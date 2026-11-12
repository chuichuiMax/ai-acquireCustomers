import re
import urllib.request

js = urllib.request.urlopen(
    "http://portal.hi-run.net/spa/edc/static/formview/index4single.js?v=fac17c18", timeout=60
).read().decode("utf-8", "replace")

for needle in ["getBaseInfo", "getFormPageInfo", "getPageInfo", "getLayoutData", "getComs"]:
    print("===", needle)
    pos = 0
    count = 0
    while count < 8:
        pos = js.find(needle, pos)
        if pos == -1:
            break
        print(js[pos - 60 : pos + 140].replace("\n", " "))
        pos += len(needle)
        count += 1
