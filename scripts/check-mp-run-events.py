#!/usr/bin/env python3
"""Inspect MP run events on test/prod API (login + list recent tasks + SSE sample)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = os.getenv("MP_BASE_URL", "http://124.232.148.28:8080").rstrip("/")
ACCOUNT = os.getenv("MP_ACCOUNT", "").strip()
PASSWORD = os.getenv("MP_PASSWORD", "").strip()
RUN_ID = os.getenv("MP_RUN_ID", "").strip()
MAX_SSE_LINES = int(os.getenv("MP_SSE_LINES", "40"))


def request_json(method: str, path: str, *, token: str | None = None, body: dict | None = None, timeout: int = 60):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {"detail": raw}
        except json.JSONDecodeError:
            payload = {"detail": raw}
        return exc.code, payload


def login() -> str:
    if not ACCOUNT or not PASSWORD:
        print("Set MP_ACCOUNT and MP_PASSWORD (employee login_account + password).", file=sys.stderr)
        sys.exit(2)
    status, payload = request_json(
        "POST",
        "/api/mp/auth/password",
        body={
            "login_account": ACCOUNT,
            "account": ACCOUNT,
            "username": ACCOUNT,
            "phone": ACCOUNT,
            "password": PASSWORD,
            "login_port": "app",
            "port": "app",
        },
    )
    if status >= 400:
        print(f"Login failed HTTP {status}: {json.dumps(payload, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)
    token = payload.get("access_token") or payload.get("token")
    if not token:
        print(f"Login response missing token: {payload}", file=sys.stderr)
        sys.exit(1)
    return str(token)


def summarize_events(events: list) -> dict:
    counts: dict[str, int] = {}
    for event in events:
        et = str(event.get("event_type") or event.get("type") or "unknown")
        counts[et] = counts.get(et, 0) + 1
    deltas = [e for e in events if str(e.get("event_type")) == "content.direct.delta"]
    sample = None
    if deltas:
        sample = deltas[0].get("payload")
    return {"total": len(events), "by_type": counts, "first_delta_payload": sample}


def read_sse_sample(run_id: str, token: str, limit: int) -> list[dict]:
    url = f"{BASE_URL}/api/mp/content/runs/{urllib.parse.quote(run_id)}/events?after_seq=0-0"
    req = urllib.request.Request(
        url,
        headers={"Accept": "text/event-stream", "Authorization": f"Bearer {token}"},
        method="GET",
    )
    lines: list[str] = []
    parsed: list[dict] = []
    with urllib.request.urlopen(req, timeout=90) as resp:
        while len(lines) < limit * 8:
            chunk = resp.read(4096)
            if not chunk:
                break
            lines.extend(chunk.decode("utf-8", errors="replace").splitlines())
            event_type = "message"
            data_lines: list[str] = []
            event_id = None
            for line in list(lines):
                if not line:
                    if data_lines:
                        try:
                            payload = json.loads("\n".join(data_lines))
                            parsed.append({"event_type": event_type, "event_id": event_id, "payload": payload})
                        except json.JSONDecodeError:
                            pass
                        if len(parsed) >= limit:
                            return parsed
                    event_type = "message"
                    data_lines = []
                    event_id = None
                    continue
                if line.startswith("event:"):
                    event_type = line[6:].strip() or "message"
                elif line.startswith("data:"):
                    data_lines.append(line[5:].strip())
                elif line.startswith("id:"):
                    event_id = line[3:].strip()
            if len(parsed) >= limit:
                break
    return parsed


def pick_run_id(token: str) -> tuple[str, str | None]:
    status, payload = request_json("GET", "/api/mp/contents?page=1&page_size=10", token=token)
    if status >= 400:
        print(f"List contents failed HTTP {status}: {payload}", file=sys.stderr)
        sys.exit(1)
    items = payload.get("items") or payload.get("data") or payload.get("contents") or []
    if not isinstance(items, list):
        items = []
    for item in items:
        task_id = str(item.get("task_id") or item.get("id") or "")
        run_id = str(item.get("latest_run_id") or item.get("run_id") or "")
        if run_id:
            return run_id, task_id
        if task_id:
            t_status, task = request_json("GET", f"/api/mp/content/tasks/{urllib.parse.quote(task_id)}", token=token)
            if t_status < 400:
                run_id = str((task.get("task") or {}).get("latest_run_id") or "")
                if run_id:
                    return run_id, task_id
    return "", None


def main() -> None:
    print(f"Base URL: {BASE_URL}")
    token = login()
    run_id = RUN_ID
    task_id = None
    if not run_id:
        run_id, task_id = pick_run_id(token)
    if not run_id:
        print("No run_id (set MP_RUN_ID or create a content task first).")
        sys.exit(3)
    print(f"Run ID: {run_id}" + (f"  task_id={task_id}" if task_id else ""))

    status, run = request_json("GET", f"/api/mp/content/runs/{urllib.parse.quote(run_id)}", token=token)
    print(f"\nGET /api/mp/content/runs/{{id}} -> HTTP {status}")
    print(json.dumps(run, ensure_ascii=False, indent=2)[:4000])
    events_in_run = run.get("events") if isinstance(run, dict) else None
    print(f"\nrun.events present: {isinstance(events_in_run, list)} count={len(events_in_run or [])}")

    print(f"\nSSE sample (max {MAX_SSE_LINES} events)...")
    sse_events = read_sse_sample(run_id, token, MAX_SSE_LINES)
    summary = summarize_events(
        [
            {
                "event_type": item.get("event_type"),
                "payload": (item.get("payload") or {}).get("payload")
                if isinstance(item.get("payload"), dict) and "payload" in item.get("payload", {})
                else item.get("payload"),
            }
            for item in sse_events
        ]
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("\nRaw SSE events (truncated):")
    for item in sse_events[:15]:
        et = item.get("event_type")
        body = item.get("payload")
        text = json.dumps(body, ensure_ascii=False)
        if len(text) > 280:
            text = text[:280] + "…"
        print(f"  [{et}] {text}")


if __name__ == "__main__":
    main()
