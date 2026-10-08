#!/usr/bin/env python3
"""SSH helper: inspect docker/redis/postgres for content.direct.delta run events."""

from __future__ import annotations

import os
import sys

import paramiko

HOST = os.getenv("SSH_HOST", "172.16.103.17")
USER = os.getenv("SSH_USER", "root")
PASSWORD = os.getenv("SSH_PASS", "")


def run(client: paramiko.SSHClient, command: str, timeout: int = 120) -> str:
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        out += "\n[stderr]\n" + err
    return out.strip()


def pick_container(client: paramiko.SSHClient, pattern: str) -> str:
    cmd = f"docker ps --format '{{{{.Names}}}}' | grep -E '{pattern}' | head -1"
    return run(client, cmd).splitlines()[0].strip() if run(client, cmd) else ""


def main() -> None:
    if not PASSWORD:
        print("Set SSH_PASS environment variable.", file=sys.stderr)
        sys.exit(2)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=25)

    print(f"=== {HOST} ===")
    print(run(client, "hostname && date"))
    print("\n=== docker ===")
    print(run(client, 'docker ps --format "{{.Names}}\t{{.Status}}" | head -20'))

    redis = pick_container(client, "redis")
    api = pick_container(client, "api")
    if api and "worker" in api:
        api = pick_container(client, "^api")
    print(f"\nredis={redis or '(none)'}")
    print(f"api={api or '(none)'}")

    if redis:
        keys = run(client, f'docker exec {redis} redis-cli --scan --pattern "run:stream:*" | head -15')
        print("\n=== sample run:stream keys ===")
        print(keys or "(no keys)")
        first_key = (keys.splitlines() or [""])[0].strip()
        if first_key:
            print(f"\n=== XRANGE {first_key} (first 40 lines) ===")
            print(
                run(
                    client,
                    f'docker exec {redis} redis-cli XRANGE "{first_key}" - + COUNT 120 | head -40',
                )
            )
        print("\n=== keys containing content.direct.delta (scan 40 keys) ===")
        search_cmd = (
            f"docker exec {redis} sh -c "
            f"'for k in $(redis-cli --scan --pattern \"run:stream:*\" | head -40); do "
            f"if redis-cli XRANGE \"$k\" - + COUNT 300 | grep -q content.direct.delta; then "
            f"echo KEY=$k; redis-cli XRANGE \"$k\" - + COUNT 300 | grep content.direct.delta | head -5; fi; done'"
        )
        print(run(client, search_cmd, timeout=180) or "(none in first 40 keys)")

    if api:
        py = (
            "import asyncio, json\n"
            "async def main():\n"
            "  from yuxi.db.manager import pg_manager\n"
            "  from sqlalchemy import text\n"
            "  async with pg_manager.get_async_session_context() as db:\n"
            "    q = text(\"SELECT id, run_type, status, created_at, thread_id FROM agent_runs "
            "ORDER BY created_at DESC LIMIT 15\")\n"
            "    rows = (await db.execute(q)).mappings().all()\n"
            "    print(json.dumps([dict(r) for r in rows], default=str, ensure_ascii=False, indent=2))\n"
            "asyncio.run(main())\n"
        )
        b64 = __import__("base64").b64encode(py.encode()).decode()
        print("\n=== recent agent_runs ===")
        print(
            run(
                client,
                f"docker exec {api} python -c \"import base64; exec(base64.b64decode('{b64}').decode())\"",
                timeout=120,
            )
        )

        if redis:
            print("\n=== events for latest content_direct run (if any) ===")
            fetch = (
                "import asyncio, json\n"
                "async def main():\n"
                "  from yuxi.db.manager import pg_manager\n"
                "  from sqlalchemy import text\n"
                "  from yuxi.services.run_queue_service import list_run_stream_events\n"
                "  async with pg_manager.get_async_session_context() as db:\n"
                "    q = text(\"SELECT id, run_type, status, created_at FROM agent_runs "
                "WHERE run_type='content_direct' ORDER BY created_at DESC LIMIT 3\")\n"
                "    rows = (await db.execute(q)).mappings().all()\n"
                "  for row in rows:\n"
                "    rid=str(row['id'])\n"
                "    events=await list_run_stream_events(rid, limit=500)\n"
                "    types={}\n"
                "    for e in events:\n"
                "      t=str(e.get('event_type') or '?')\n"
                "      types[t]=types.get(t,0)+1\n"
                "    deltas=[e for e in events if e.get('event_type')=='content.direct.delta']\n"
                "    print('RUN', rid, row['status'], 'events', len(events), 'types', types)\n"
                "    if deltas:\n"
                "      print('FIRST_DELTA', json.dumps(deltas[0], ensure_ascii=False)[:500])\n"
                "asyncio.run(main())\n"
            )
            b64b = __import__("base64").b64encode(fetch.encode()).decode()
            print(
                run(
                    client,
                    f"docker exec {api} python -c \"import base64; exec(base64.b64decode('{b64b}').decode())\"",
                    timeout=180,
                )
            )

    print("\n=== redis key patterns ===")
    for pattern in ("run:stream:*", "*stream*", "run:*"):
        print(f"-- pattern {pattern} --")
        print(run(client, f'docker exec {redis} redis-cli --scan --pattern "{pattern}" | head -25') if redis else "(no redis)")

    print("\n=== postgres databases ===")
    print(run(client, "docker exec postgres psql -U postgres -l")[:2500])

    pg_query = (
        "SELECT id, run_type, status, created_at::text "
        "FROM agent_runs ORDER BY created_at DESC LIMIT 10;"
    )
    for db in ("contentswarm", "content_swarm", "yuxi", "postgres"):
        print(f"\n=== agent_runs in db {db} ===")
        out = run(
            client,
            f'docker exec postgres psql -U postgres -d {db} -c "{pg_query}"',
            timeout=60,
        )
        if "does not exist" in out or "relation" in out and "does not exist" in out:
            print(out.splitlines()[0] if out else "skip")
            continue
        print(out)
        break

    if redis and api:
        print("\n=== list_run_stream_events via api-dev (correct import path) ===")
        fetch = (
            "import asyncio, json\n"
            "async def main():\n"
            "  from yuxi.db.manager import pg_manager\n"
            "  from sqlalchemy import text\n"
            "  from yuxi.services.run_queue_service import list_run_stream_events, _event_stream_key\n"
            "  print('stream_key_example', _event_stream_key('sample'))\n"
            "  async with pg_manager.get_async_session_context() as db:\n"
            "    q = text(\"SELECT id, run_type, status, created_at::text FROM agent_runs "
            "WHERE run_type='content_direct' ORDER BY created_at DESC LIMIT 5\")\n"
            "    rows = (await db.execute(q)).mappings().all()\n"
            "  if not rows:\n"
            "    q2 = text(\"SELECT id, run_type, status, created_at::text FROM agent_runs "
            "ORDER BY created_at DESC LIMIT 5\")\n"
            "    async with pg_manager.get_async_session_context() as db:\n"
            "      rows = (await db.execute(q2)).mappings().all()\n"
            "  for row in rows:\n"
            "    rid=str(row['id'])\n"
            "    events=await list_run_stream_events(rid, limit=400)\n"
            "    types={}\n"
            "    for e in events:\n"
            "      t=str(e.get('event_type') or '?')\n"
            "      types[t]=types.get(t,0)+1\n"
            "    print('RUN', rid, row.get('run_type'), row.get('status'), 'event_count', len(events))\n"
            "    print(' types', json.dumps(types, ensure_ascii=False))\n"
            "    for e in events:\n"
            "      if e.get('event_type')=='content.direct.delta':\n"
            "        print(' DELTA_SAMPLE', json.dumps(e, ensure_ascii=False)[:420])\n"
            "        break\n"
            "asyncio.run(main())\n"
        )
        # run inside api container working directory with PYTHONPATH
        b64b = __import__("base64").b64encode(fetch.encode()).decode()
        print(
            run(
                client,
                f"docker exec -w /app {api} python -c \"import base64; exec(base64.b64decode('{b64b}').decode())\"",
                timeout=180,
            )
        )

    for rid in (
        os.getenv("INSPECT_RUN_ID", "123363eb-d2f6-4ced-94a5-8c229f9189e5"),
        "76f0988b-6a0f-4c87-9408-44a80a14dd6d",
    ):
        inspect_run(client, rid, redis=redis or "redis")

    client.close()


def inspect_run(client: paramiko.SSHClient, run_id: str, redis: str = "redis") -> None:
    key = f"run:events:{run_id}"
    print(f"\n=== inspect {run_id} key={key} ===")
    print("XLEN:", run(client, f'docker exec {redis} redis-cli XLEN "{key}"'))
    raw = run(
        client,
        f'docker exec {redis} redis-cli XRANGE "{key}" - + COUNT 500',
        timeout=120,
    )
    delta_count = raw.count("content.direct.delta")
    print(f"content.direct.delta occurrences in raw: {delta_count}")
    for marker in (
        "content.direct.delta",
        "content.generated",
        "content.cover.started",
        "content.cover.completed",
        '"event": "end"',
        "event_type",
    ):
        hits = [line for line in raw.splitlines() if marker in line][:4]
        if hits:
            print(f"-- {marker} sample --")
            for line in hits:
                print(line[:500])


if __name__ == "__main__":
    main()
