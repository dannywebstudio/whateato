#!/usr/bin/env python3
"""WhatEatO lean SBIZ CSV importer. No raw-row storage. Dry-run by default."""
import argparse
from collections import Counter
import csv
import json
import os
from pathlib import Path

FIELDS={
 'key':('상가업소번호','상가업소ID','bizesId'),
 'name':('상호명','bizesNm'),
 'road':('도로명주소','rdnmadr','도로명전체주소'),
 'lot':('지번주소','lnmadr','소재지전체주소'),
 'sido':('시도명','ctprvnNm'),
 'sigungu':('시군구명','signguNm'),
 'dong':('행정동명','adongNm','법정동명'),
 'category':('상권업종대분류명','상권업종중분류명','상권업종소분류명'),
 'category_code':('상권업종소분류코드','indsSclsCd'),
 'latitude':('위도','latitude','lat'),
 'longitude':('경도','longitude','lon'),
}
FOOD_WORDS=('음식','식음료','카페','커피','주점','치킨','베이커리','제과')
COLS=('source_key','name','road','lot','sido','sigungu','dong','category_code','latitude','longitude')
def value(row,field):
    return next((str(row.get(c,'')).strip() for c in FIELDS[field] if row.get(c) is not None and str(row.get(c)).strip()),'')
def normalize(row):
    key,name,road,lot=(value(row,k) for k in ('key','name','road','lot'))
    categories=[str(row.get(k) or '') for k in FIELDS['category']]
    if not any(any(word in c for word in FOOD_WORDS) for c in categories):return None,'non_food_category'
    if not key or not name:return None,'missing_id_or_name'
    if not road and not lot:return None,'missing_address'
    lat,lon=value(row,'latitude'),value(row,'longitude')
    try:
        la,lo=(float(lat),float(lon)) if lat and lon else (None,None)
        if la is not None and not(33 <= la <= 39.5 and 124 <= lo <= 132):return None,'invalid_coordinates'
    except ValueError:return None,'invalid_coordinates'
    return (key,name,road or None,lot or None,value(row,'sido') or None,value(row,'sigungu') or None,
            value(row,'dong') or None,value(row,'category_code') or None,la,lo),None

def insert_batch(db,batch):
    if not batch:return
    with db.cursor() as cur:
        cur.execute("""CREATE TEMP TABLE IF NOT EXISTS whateato_sbiz_stage
          (source_key text,name text,road text,lot text,sido text,sigungu text,dong text,category_code text,
           latitude double precision,longitude double precision) ON COMMIT DELETE ROWS""")
        with cur.copy('COPY whateato_sbiz_stage ('+','.join(COLS)+') FROM STDIN') as cp:
            for row in batch:cp.write_row(row)
        cur.execute("""INSERT INTO restaurants
          (sbiz_source_key,name_ko,road_address_ko,lot_address_ko,region_sido,region_sigungu,region_dong,
           category_code,latitude,longitude,publication_status,business_status)
          SELECT DISTINCT ON (source_key) source_key,name,road,lot,sido,sigungu,dong,category_code,
            latitude,longitude,'published','unknown'
          FROM whateato_sbiz_stage ORDER BY source_key
          ON CONFLICT (sbiz_source_key) DO UPDATE SET name_ko=EXCLUDED.name_ko,
            road_address_ko=EXCLUDED.road_address_ko,lot_address_ko=EXCLUDED.lot_address_ko,
            region_sido=EXCLUDED.region_sido,region_sigungu=EXCLUDED.region_sigungu,
            region_dong=EXCLUDED.region_dong,category_code=EXCLUDED.category_code,
            latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,updated_at=now()""")
        cur.execute("""INSERT INTO restaurant_source_refs(restaurant_id,provider,source_record_id)
          SELECT r.id,'sbiz',s.source_key FROM
          (SELECT DISTINCT source_key FROM whateato_sbiz_stage) s
          JOIN restaurants r ON r.sbiz_source_key=s.source_key
          ON CONFLICT (provider,source_record_id) DO UPDATE SET last_seen_at=now()""")
    db.commit()

def run(path:Path,limit:int=0,encoding:str='utf-8-sig',commit:bool=False,batch_size:int=2000):
    if not path.is_file():raise FileNotFoundError(path)
    counts=Counter()
    db=None
    if commit:
        if not os.environ.get('DATABASE_URL'):raise RuntimeError('DATABASE_URL missing; use a dedicated WhatEatO database')
        import psycopg
        db=psycopg.connect(os.environ['DATABASE_URL'])
    batch=[]
    try:
        with path.open(encoding=encoding,newline='') as f:
            reader=csv.DictReader(f)
            if not reader.fieldnames or not any(h in reader.fieldnames for h in FIELDS['key']):
                raise ValueError('Not an SBIZ CSV: missing store ID column')
            for row in reader:
                if limit and counts['seen'] >= limit:break
                counts['seen']+=1
                record,reason=normalize(row)
                if reason:counts[reason]+=1;continue
                counts['eligible']+=1
                if db:
                    batch.append(record)
                    if len(batch)>=batch_size:insert_batch(db,batch);batch.clear()
        if db and batch:insert_batch(db,batch)
    finally:
        if db:db.close()
    return {'source':str(path),'dry_run':not commit,'counts':dict(counts)}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--file',type=Path,required=True)
    p.add_argument('--limit',type=int,default=0)
    p.add_argument('--encoding',default='utf-8-sig')
    p.add_argument('--commit',action='store_true',help='Required to write to database')
    a=p.parse_args()
    print(json.dumps(run(a.file,limit=a.limit,encoding=a.encoding,commit=a.commit),ensure_ascii=False,indent=2))
