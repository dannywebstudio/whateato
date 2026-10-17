#!/usr/bin/env python3
"""Region-first LOCALDATA importer for WhatEatO: verified CSV -> nonpublic drafts only.

Never publishes a restaurant, verifies business hours, or invents menus.
Requires a SHA-256-pinned source and a launch-branch database safeguard.
"""
import argparse
import csv
import hashlib
import json
import math
import os
import re
from pathlib import Path
from pyproj import Transformer

EXPECTED_SHA = "b3aa8b1c6e8ea108bd6ecbd06a4f46c1211d2c996265384570e0e0b1d207deec"
DONGINCH = ("신포동","인현동","경동","내동","답동","용동","신생동","관동","중앙동",
            "송학동","사동","선린동","북성동","항동","신흥동","송월동",
            "우현로","개항로","신포로","수문통로")
CITY_NAMES = {"인천":"인천광역시","서울":"서울특별시","부산":"부산광역시"}

def wave_for(city, address):
    if city == "인천":
        if any(x in address for x in DONGINCH): return 1
        if "만수동" in address: return 2
        if "구월동" in address: return 3
        if "부평구" in address: return 4
        if any(x in address for x in ("영종구","중산동","운남동","운서동","영종동")): return 5
        return 6
    if city == "서울":
        if any(x in address for x in ("동자동","봉래동","남대문로5가","남대문로4가","회현동")): return 1
        if any(x in address for x in ("창천동","노고산동")): return 2
        if any(x in address for x in ("서교동","동교동","연남동")): return 3
        if any(x in address for x in ("대현동","신촌동","북아현동")): return 4
        if any(x in address for x in ("삼성동","무역센터")): return 5
        return 6
    if any(x in address for x in ("광안동","민락동","남천동")): return 1
    if any(x in address for x in ("해운대구 우동","해운대구 중동","해운대구 좌동","해운대구 송정동")): return 2
    return 3

def clean(value, maxlen=500):
    return re.sub(r"\s+"," ",str(value or "")).strip()[:maxlen]

def validated_coordinates(row, trans):
    try:
        x=float(clean(row.get("좌표정보(X)"))); y=float(clean(row.get("좌표정보(Y)")))
        if not (math.isfinite(x) and math.isfinite(y) and 10000<=x<=500000 and 10000<=y<=900000):
            return (None,None)
        lon,lat=trans.transform(x,y)
        if not (124<=lon<=132 and 33<=lat<=39.5): return (None,None)
        return round(lat,7),round(lon,7)
    except (ValueError,TypeError,OverflowError):
        return (None,None)

def extract(path,city,wave,offset,limit):
    digest=hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda:fh.read(1024*1024),b""):
            digest.update(block)
    if digest.hexdigest()!=EXPECTED_SHA:
        raise RuntimeError("Source CSV SHA mismatch: refusing import.")
    trans=Transformer.from_crs("EPSG:5174","EPSG:4326",always_xy=True)
    rows=[];matching=0
    with path.open("r",encoding="utf-8-sig",newline="") as fh:
        rd=csv.DictReader(fh)
        mandatory={"관리번호","사업장명","상세영업상태명","도로명주소","지번주소","좌표정보(X)","좌표정보(Y)"}
        if not mandatory.issubset(set(rd.fieldnames or [])):
            raise RuntimeError("Unknown CSV headers.")
        for row in rd:
            if clean(row.get("상세영업상태명"))!="영업":continue
            road=clean(row.get("도로명주소"));lot=clean(row.get("지번주소"))
            addr=lot or road
            if not addr.startswith(CITY_NAMES[city]) or wave_for(city,addr)!=wave:continue
            source_id=clean(row.get("관리번호"),120)
            name=clean(row.get("사업장명"),300)
            if not source_id or not name or not addr:continue
            matching+=1
            if matching<=offset:continue
            if len(rows)>=limit:continue
            parts=addr.split()
            lat,lon=validated_coordinates(row,trans)
            dong=parts[2] if len(parts)>2 and re.search(r"(동|읍|면|리|가)$",parts[2]) else None
            rows.append(("localdata:"+source_id,name,road or None,lot or None,CITY_NAMES[city],
                         parts[1] if len(parts)>1 else None,dong,clean(row.get("업태구분명"),120) or None,lat,lon))
    return rows,matching,digest.hexdigest()

def commit_to_neon(rows):
    if os.getenv("WHATEATO_IMPORT_CONFIRM")!="launch-hostinger-20261015":
        raise RuntimeError("Launch branch explicit import confirmation missing.")
    url=os.environ.get("NEON_DATABASE_URL")
    if not url:raise RuntimeError("NEON_DATABASE_URL missing; configure as a secret.")
    import psycopg
    with psycopg.connect(url,connect_timeout=25,sslmode="require") as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute("""SELECT to_regclass('public.whateato_region_rollout_v1') IS NOT NULL,
                   to_regclass('public.whateato_restaurant_public_approvals_v1') IS NOT NULL,
                   pg_database_size(current_database())""")
                sentinel,approvals,dbsize=cur.fetchone()
                if not sentinel or not approvals:raise RuntimeError("Wrong Neon branch: launch safeguards missing.")
                if dbsize>800_000_000:raise RuntimeError("Database nearing free storage limit; abort.")
                cur.execute("""CREATE TEMP TABLE whateato_localdata_region_stage (
                   source_key text,name text,road text,lot text,sido text,sigungu text,
                   dong text,category text,latitude float8,longitude float8
                ) ON COMMIT DROP""")
                with cur.copy("""COPY whateato_localdata_region_stage
                  (source_key,name,road,lot,sido,sigungu,dong,category,latitude,longitude)
                  FROM STDIN""") as cp:
                    for entry in rows:cp.write_row(entry)
                cur.execute("""SELECT COUNT(*) FROM whateato_localdata_region_stage s
                   WHERE EXISTS(SELECT 1 FROM restaurants r
                     WHERE r.region_sido=s.sido AND r.name_ko=s.name
                       AND ((s.road IS NOT NULL AND r.road_address_ko=s.road)
                         OR (s.lot IS NOT NULL AND r.lot_address_ko=s.lot)))""")
                skipped_matches=cur.fetchone()[0]
                cur.execute("""INSERT INTO restaurants
                    (sbiz_source_key,name_ko,road_address_ko,lot_address_ko,region_sido,
                     region_sigungu,region_dong,category_code,latitude,longitude,
                     business_status,publication_status)
                    SELECT s.source_key,s.name,s.road,s.lot,s.sido,s.sigungu,
                      s.dong,s.category,s.latitude,s.longitude,'unknown','draft'
                    FROM whateato_localdata_region_stage s
                    WHERE NOT EXISTS(SELECT 1 FROM restaurants r WHERE
                       r.region_sido=s.sido AND r.name_ko=s.name AND
                       ((s.road IS NOT NULL AND r.road_address_ko=s.road)
                        OR (s.lot IS NOT NULL AND r.lot_address_ko=s.lot)))
                    ON CONFLICT(sbiz_source_key) DO NOTHING""")
                inserted=cur.rowcount
                cur.execute("""INSERT INTO restaurant_source_refs
                     (restaurant_id,provider,source_record_id,last_seen_at)
                     SELECT r.id,'localdata',substring(r.sbiz_source_key from 11),now()
                     FROM restaurants r JOIN whateato_localdata_region_stage s
                       ON r.sbiz_source_key=s.source_key
                     ON CONFLICT(provider,source_record_id) DO NOTHING""")
                cur.execute("""SELECT COUNT(*) FROM whateato_restaurant_public_approvals_v1
                     WHERE is_visible=true""")
                visible=cur.fetchone()[0]
    return {"inserted_nonpublic_drafts":inserted,"exact_address_matches_skipped":skipped_matches,
            "map_visible_approvals_unchanged":visible}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--file",type=Path,required=True)
    p.add_argument("--city",choices=("인천","서울","부산"),required=True)
    p.add_argument("--wave",type=int,required=True)
    p.add_argument("--limit",type=int,default=1000)
    p.add_argument("--offset",type=int,default=0)
    p.add_argument("--commit",action="store_true")
    a=p.parse_args()
    max_wave={"인천":6,"서울":6,"부산":3}[a.city]
    if not (1<=a.wave<=max_wave and 1<=a.limit<=5000 and a.offset>=0):
        p.error("Invalid wave, limit or offset.")
    rows,matching,source_sha=extract(a.file,a.city,a.wave,a.offset,a.limit)
    report={"city":a.city,"wave":a.wave,"matching_source_rows":matching,
            "requested_offset":a.offset,"batch_source_rows":len(rows),
            "rows_with_coordinates":sum(x[8] is not None for x in rows),
            "mode":"commit" if a.commit else "dry_run","source_sha256":source_sha}
    if a.commit and rows: report.update(commit_to_neon(rows))
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main()
