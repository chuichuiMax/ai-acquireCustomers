import json
import urllib.request

APP = "t13s87"
LAYOUT = "qs2fsn"

def get(url, params=None):
    if params:
        from urllib.parse import urlencode
        url = url + "?" + urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")

def post(url, data):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")

urls_get = [
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": APP}),
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": LAYOUT}),
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": APP, "oauthKey": LAYOUT}),
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": LAYOUT, "oauthKey": APP}),
]

for url, params in urls_get:
    try:
        st, body = get(url, params)
        print("GET", params, st, body[:600])
    except Exception as exc:
        print("GET", params, "ERR", exc)

posts = [
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": APP, "oauthKey": LAYOUT, "makeUp": "", "pageParams": ""}),
    ("http://portal.hi-run.net/api/edc/fillin/getPageInfo", {"key": LAYOUT, "oauthKey": "", "makeUp": "", "pageParams": json.dumps({"appid": APP})}),
]
for url, data in posts:
    try:
        st, body = post(url, data)
        print("POST", data, st, body[:600])
    except Exception as exc:
        print("POST", data, "ERR", exc)
