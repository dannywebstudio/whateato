#!/usr/bin/env python3
"""Privacy-minimal daily analytics event retention job."""
import os
import sys

def main():
    url=os.getenv("NEON_DATABASE_URL")
    if not url:
        print("Missing NEON_DATABASE_URL; refusing to connect",file=sys.stderr)
        return 2
    import psycopg
    with psycopg.connect(url,connect_timeout=15) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.whateato_analytics_events')")
            if cur.fetchone()[0] is None:
                print("Analytics table not provisioned; no deletion executed")
                return 0
            cur.execute("DELETE FROM whateato_analytics_events WHERE occurred_at < now() - interval '30 days'")
            print(f"Deleted expired analytics events: {cur.rowcount}")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
