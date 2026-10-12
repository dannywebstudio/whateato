#!/usr/bin/env python3
"""WhatEatO LOCALDATA restaurant importer v1.

Accepts the verified 39-column '식품_일반음식점' CSV (UTF-8-SIG or CP949).
Read-only by default. Never writes a raw row, phone number or business owner's data.
A limited Neon write requires --commit, a verified source SHA-256, and NEON_DATABASE_URL.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
from collections import Counter
from pathlib import Path

FIELDS = (
    "source_key", "source_id", "name", "road", "lot",
    "sido", "sigungu", "dong", "category", "latitude", "longitude",
)
REQUIRED = {"관리번호", "사업장명", "상세영업상태명", "도로명주소",
            "지번주소", "좌표정보(X)", "좌표정보(Y)"}
KOREA_LAT = (33.0, 39.5)
KOREA_LON = (124.0, 132.0)


def clean(value: object, max_length: int = 500) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:max_length]


def region_parts(address: str) -> tuple[str | None, str | None, str | None]:
    """Keep administrative labels as printed; don't invent absent geography."""
    parts = address.split()
    if not parts:
        return None, None, None
    sido = parts[0]
    sigungu = None
    for idx in (1, 2):
        if len(parts) > idx and parts[idx].endswith(("시", "군", "구")):
            sigungu = parts[idx] if idx == 1 else parts[1] + " " + parts[idx]
            break
    dong = next((p for p in parts[2:] if re.fullmatch(r"[가-힣0-9]+(?:동|읍|면|리|가)", p)), None)
    if not sigungu and len(parts) > 1 and re.fullmatch(r"[가-힣0-9]+(?:동|읍|면|리|가)", parts[1]):
        dong = parts[1]
    return sido, sigungu, dong


def transform_coordinates(x_raw: str, y_raw: str, transformer):
    """LOCALDATA projected X/Y in EPSG:5174 -> WGS84 lon/lat, never swap axes."""
    if not x_raw or not y_raw:
        return None, None, "missing_coordinates"
    try:
        x, y = float(x_raw), float(y_raw)
        if not (math.isfinite(x) and math.isfinite(y)):
            return None, None, "invalid_coordinates"
        # An unusually small pair is NOT assumed to be EPSG:5174.
        if not (10000 <= x <= 500000 and 10000 <= y <= 900000):
            return None, None, "out_of_projection_bounds"
        lon, lat = transformer.transform(x, y)
        if not (math.isfinite(lon) and math.isfinite(lat)
                and KOREA_LON[0] <= lon <= KOREA_LON[1]
                and KOREA_LAT[0] <= lat <= KOREA_LAT[1]):
            return None, None, "outside_korea"
        return round(lat, 7), round(lon, 7), None
    except (ValueError, TypeError, OverflowError):
        return None, None, "invalid_coordinates"


def normalize(row: dict, transformer):
    if clean(row.get("상세영업상태명")) != "영업":
        return None, "not_active"
    source_id = clean(row.get("관리번호"), 100)
    name = clean(row.get("사업장명"), 300)
    road = clean(row.get("도로명주소"), 500)
    lot = clean(row.get("지번주소"), 500)
    if not source_id or not name:
        return None, "missing_id_or_name"
    if not road and not lot:
        return None, "missing_address"
    sido, sigungu, dong = region_parts(lot or road)
    lat, lon, geo_issue = transform_coordinates(
        clean(row.get("좌표정보(X)"), 100), clean(row.get("좌표정보(Y)"), 100), transformer
    )
    return (
        "localdata:" + source_id, source_id, name, road or None, lot or None,
        sido, sigungu, dong, clean(row.get("업태구분명"), 120) or None,
        lat, lon,
    ), geo_issue


def source_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def insert_batch(connection, batch: list[tuple]):
    """COPY into per-transaction temporary stage; idempotent source-key upsert."""
    if not batch:
        return
    unique = {row[0]: row for row in batch}
    with connection.cursor() as cur:
        cur.execute("""CREATE TEMP TABLE IF NOT EXISTS whateato_localdata_stage (
           source_key text, source_id text, name text, road text, lot text,
           sido text, sigungu text, dong text, category text,
           latitude double precision, longitude double precision
        ) ON COMMIT DELETE ROWS""")
        with cur.copy("COPY whateato_localdata_stage (" + ",".join(FIELDS) + ") FROM STDIN") as cp:
            for row in unique.values():
                cp.write_row(row)
        cur.execute("""INSERT INTO restaurants AS r (
             sbiz_source_key, name_ko, road_address_ko, lot_address_ko,
             region_sido, region_sigungu, region_dong, category_code,
             latitude, longitude, business_status, publication_status
           )
           SELECT source_key, name, road, lot, sido, sigungu, dong, category,
                  latitude, longitude, 'active', 'published'
           FROM whateato_localdata_stage
           ON CONFLICT (sbiz_source_key) DO UPDATE SET
             name_ko=EXCLUDED.name_ko,
             road_address_ko=EXCLUDED.road_address_ko,
             lot_address_ko=EXCLUDED.lot_address_ko,
             region_sido=EXCLUDED.region_sido,
             region_sigungu=EXCLUDED.region_sigungu,
             region_dong=EXCLUDED.region_dong,
             category_code=EXCLUDED.category_code,
             latitude=EXCLUDED.latitude,
             longitude=EXCLUDED.longitude,
             business_status=EXCLUDED.business_status,
             publication_status=EXCLUDED.publication_status,
             updated_at=now()
           WHERE (
             r.name_ko,r.road_address_ko,r.lot_address_ko,
             r.region_sido,r.region_sigungu,r.region_dong,
             r.category_code,r.latitude,r.longitude,
             r.business_status,r.publication_status
           ) IS DISTINCT FROM (
             EXCLUDED.name_ko,EXCLUDED.road_address_ko,EXCLUDED.lot_address_ko,
             EXCLUDED.region_sido,EXCLUDED.region_sigungu,EXCLUDED.region_dong,
             EXCLUDED.category_code,EXCLUDED.latitude,EXCLUDED.longitude,
             EXCLUDED.business_status,EXCLUDED.publication_status
           )""")
        cur.execute("""INSERT INTO restaurant_source_refs (
              restaurant_id, provider, source_record_id, last_seen_at
            )
            SELECT r.id, 'localdata', s.source_id, now()
            FROM whateato_localdata_stage s
            JOIN restaurants r ON r.sbiz_source_key=s.source_key
            ON CONFLICT (provider,source_record_id) DO UPDATE
            SET last_seen_at=EXCLUDED.last_seen_at""")
    connection.commit()


def run(path: Path, limit: int = 10000, *, commit: bool = False,
        report_path: Path | None = None, expected_sha256: str = "",
        batch_size: int = 1000) -> dict:
    if not path.is_file():
        raise FileNotFoundError(path)
    if limit < 0 or batch_size < 1 or batch_size > 10000:
        raise ValueError("Invalid limit or batch size")
    if commit and (limit == 0 or limit > 10000):
        raise ValueError("Neon writes are capped at 10,000 source rows until QA approval")
    if commit and not expected_sha256:
        raise ValueError("Commit requires the approved source SHA-256")
    if commit and not os.environ.get("NEON_DATABASE_URL"):
        raise ValueError("NEON_DATABASE_URL GitHub secret has not been configured")
    actual_sha = source_sha256(path)
    if expected_sha256 and actual_sha.lower() != expected_sha256.lower():
        raise ValueError("CSV does not match approved cleaned dataset SHA-256")

    from pyproj import Transformer
    transformer = Transformer.from_crs("EPSG:5174", "EPSG:4326", always_xy=True)
    connection = None
    if commit:
        import psycopg
        connection = psycopg.connect(os.environ["NEON_DATABASE_URL"], connect_timeout=20)
        with connection.cursor() as cur:
            cur.execute("SELECT to_regclass('public.restaurants'), to_regclass('public.restaurant_source_refs')")
            found = cur.fetchone()
            if not found or any(v is None for v in found):
                raise RuntimeError("WhatEatO Neon migrations 001/002 are missing")
        connection.rollback()

    counts = Counter()
    batch = []
    seen_keys = set()
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames or not REQUIRED.issubset(set(reader.fieldnames)):
                raise ValueError("Unexpected LOCALDATA CSV header; rejecting import")
            for row in reader:
                if limit and counts["source_rows"] >= limit:
                    break
                counts["source_rows"] += 1
                item, issue = normalize(row, transformer)
                if not item:
                    counts[issue] += 1
                    continue
                if item[0] in seen_keys:
                    counts["duplicate_source_ids"] += 1
                    continue
                seen_keys.add(item[0])
                counts["eligible"] += 1
                if issue:
                    counts[issue] += 1
                else:
                    counts["valid_coordinates"] += 1
                if connection:
                    batch.append(item)
                    if len(batch) >= batch_size:
                        insert_batch(connection, batch)
                        counts["committed_rows"] += len(batch)
                        batch.clear()
            if connection and batch:
                insert_batch(connection, batch)
                counts["committed_rows"] += len(batch)
        report = {
            "file": path.name,
            "source_sha256": actual_sha,
            "mode": "limited_commit" if commit else "dry_run",
            "limit_source_rows": limit,
            "coordinate_source_crs": "EPSG:5174",
            "coordinate_output_crs": "EPSG:4326",
            "counts": dict(counts),
            "full_dataset_import": False if limit else not commit,
            "notes": "Legal/permit status is not a verified real-time open-now signal. No AI ratings inferred.",
        }
        if report_path:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return report
    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--file", type=Path, required=True)
    p.add_argument("--limit", type=int, default=10000, help="0 = full dry-run (DB writes prohibited)")
    p.add_argument("--batch-size", type=int, default=1000)
    p.add_argument("--report", type=Path)
    p.add_argument("--expected-sha256", default="")
    p.add_argument("--commit", action="store_true", help="EXPLICIT Neon write, max 10k rows, requires secret")
    a = p.parse_args()
    run(a.file, a.limit, commit=a.commit, report_path=a.report,
        expected_sha256=a.expected_sha256, batch_size=a.batch_size)
