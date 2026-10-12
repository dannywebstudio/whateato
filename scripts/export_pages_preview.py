#!/usr/bin/env python3
"""Build GitHub Pages preview from public restaurant fields only.

This exporter is run inside GitHub Actions with the GitHub-secret Neon URL.
NEVER send the URL, the query connection credentials or unpublished rows
into the static website or GitHub repository.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
from pathlib import Path

PREVIEW_ROOT = Path("preview")
MAX_RECORDS = 10_000
FIELDS = ("id", "name", "road", "lot", "region", "district", "category", "lat", "lon")

QUERY = """
SELECT
    id::text, name_ko, road_address_ko, lot_address_ko,
    region_sido, region_sigungu, category_code, latitude, longitude
FROM public.restaurants
WHERE publication_status = 'published'
  AND business_status = 'active'
  AND sbiz_source_key LIKE %s
ORDER BY name_ko, id
LIMIT %s
"""


def serialize(row):
    """Pure sanitization. Avoid exposing non-public fields or secret data."""
    if len(row) != len(FIELDS):
        raise ValueError("Unexpected database result format")
    raw = dict(zip(FIELDS, row))
    name = str(raw["name"] or "").strip()
    rid = str(raw["id"] or "")
    if not name or not rid:
        raise ValueError("A published restaurant has no name or id")
    normalized = {}
    for key in FIELDS:
        value = raw[key]
        if key in ("lat", "lon"):
            if value is None:
                normalized[key] = None
            else:
                number = float(value)
                lo, hi = (33.0, 39.5) if key == "lat" else (124.0, 132.0)
                if number < lo or number > hi:
                    raise ValueError("Out of Korean geography bounds")
                normalized[key] = round(number, 7)
        else:
            normalized[key] = str(value).strip()[:500] if value is not None else None
    return normalized


def build_records(rows):
    records = [serialize(row) for row in rows]
    ids = [r["id"] for r in records]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicated UUIDs in preview export")
    if len(records) > MAX_RECORDS:
        raise ValueError("Exceeded explicit 10k preview limit")
    return records


def export(output: Path):
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url.startswith(("postgresql://", "postgres://")):
        raise RuntimeError("Missing NEON_DATABASE_URL repository secret")

    import psycopg
    with psycopg.connect(url, connect_timeout=20) as connection:
        with connection.cursor() as cursor:
            cursor.execute(QUERY, ('localdata:%', MAX_RECORDS))
            records = build_records(cursor.fetchall())

    if len(records) < 1000:
        raise RuntimeError("Too few actual restaurants for public preview, refusing to deploy")

    # Compile website to an isolated directory; never mutate any Neon record.
    output.mkdir(parents=True, exist_ok=True)
    for asset in ("index.html", "styles.css", "app.js"):
        shutil.copyfile(PREVIEW_ROOT / asset, output / asset)
    (output / ".nojekyll").write_text("", encoding="utf-8")
    (output / "data").mkdir(exist_ok=True)
    payload = {
        "source": "LOCALDATA foodservice registrations via WhatEatO Neon read-only snapshot",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "count": len(records),
        "mapped_count": sum(r["lat"] is not None and r["lon"] is not None for r in records),
        "items": records,
    }
    dest = output / "data" / "restaurants.json"
    dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "exported_restaurants": len(records),
        "with_geocoordinates": payload["mapped_count"],
        "data_bytes": dest.stat().st_size,
        "output_path": str(output),
        "privacy": "Only 9 approved public restaurant fields, no Neon secret included",
    }, ensure_ascii=False))
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("_site"))
    args = parser.parse_args()
    export(args.output)
