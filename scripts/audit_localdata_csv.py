#!/usr/bin/env python3
"""Read-only WhatEatO CSV stream audit. Outputs no raw input file."""
import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

COLS={
 'source_id':['관리번호','상가업소번호','개방서비스아이디','id'],
 'name':['사업장명','상호명','업소명','업체명'],
 'address_road':['도로명전체주소','도로명주소'],
 'address_lot':['소재지전체주소','지번주소'],
 'status':['상세영업상태명','영업상태명','영업상태구분코드'],
 'industry':['업태구분명','상권업종소분류명','상권업종대분류명'],
 'x':['좌표정보(x)','좌표정보(X)','경도','longitude','lon'],
 'y':['좌표정보(y)','좌표정보(Y)','위도','latitude','lat']
}
SAMPLE_FIELDS=list(COLS)
def detect_encoding(path):
    with path.open('rb') as f: data=f.read(131072)
    if data.startswith((b'\xff\xfe',b'\xfe\xff')):return 'utf-16'
    if data.startswith(b'\xef\xbb\xbf'):return 'utf-8-sig'
    for enc in ('utf-8','cp949','euc-kr'):
        try:
            data.decode(enc)
            return enc
        except UnicodeDecodeError:pass
    raise ValueError('Unsupported CSV encoding')
def match_header(headers,variants):
    normalized={x.strip().lstrip('\ufeff').lower():x for x in headers}
    for v in variants:
        if v.lower() in normalized:return normalized[v.lower()]
    return None
def audit(path,out,max_rows=0):
    if not path.is_file():raise FileNotFoundError(path)
    out.mkdir(parents=True,exist_ok=True)
    try:csv.field_size_limit(2147483647)
    except OverflowError:pass
    enc=detect_encoding(path)
    counters,statuses,industries=Counter(),Counter(),Counter()
    samples=[]
    with path.open('r',encoding=enc,newline='',errors='strict') as f:
        reader=csv.DictReader(f)
        if not reader.fieldnames:raise ValueError('Missing CSV header')
        headers=[s.strip().lstrip('\ufeff') for s in reader.fieldnames]
        mapping={k:match_header(reader.fieldnames,variants) for k,variants in COLS.items()}
        if not mapping['source_id'] or not mapping['name']:
            raise ValueError('Unknown CSV schema. Columns: '+str(headers[:25]))
        for row in reader:
            counters['total_rows']+=1
            def get(key):
                return str(row.get(mapping[key]) or '').strip() if mapping[key] else ''
            statuses[get('status') or '(empty)']+=1
            industries[get('industry') or '(empty)']+=1
            if not get('name'):counters['missing_name']+=1
            if not get('source_id'):counters['missing_id']+=1
            if not (get('address_road') or get('address_lot')):counters['missing_address']+=1
            x,y=get('x'),get('y')
            if not x or not y:counters['missing_coordinates']+=1
            else:
                try:
                    xx,yy=float(x),float(y)
                    if 124<=xx<=132 and 33<=yy<=39.5:counters['wgs84_like_coordinates']+=1
                    elif 5000<xx<10000000 and 5000<yy<10000000:counters['projected_or_unknown_coordinates']+=1
                    else:counters['invalid_coordinates']+=1
                except ValueError:counters['invalid_coordinates']+=1
            if len(samples)<200:samples.append({k:get(k)[:300] for k in SAMPLE_FIELDS})
            if max_rows and counters['total_rows']>=max_rows:break
    summary={
        'file_name':path.name,'file_size_bytes':path.stat().st_size,
        'encoding':enc,'header_count':len(headers),'headers':headers,
        'mapping':mapping,'inspected_rows':counters['total_rows'],
        'complete_scan':max_rows==0,'quality_counts':dict(counters),
        'top_statuses':statuses.most_common(30),
        'top_industries':industries.most_common(30),
        'notes':['No original CSV uploaded to GitHub.',
                 'Coordinate projection is not inferred solely from field names.',
                 'Read-only audit; no Neon database writes.'],
        'checked_at':datetime.now(timezone.utc).isoformat()
    }
    (out/'WhatEatO_CSV_audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    with (out/'WhatEatO_sample_200.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=SAMPLE_FIELDS)
        writer.writeheader();writer.writerows(samples)
    print(json.dumps({'row_count':counters['total_rows'],'encoding':enc,'header_count':len(headers),'output':str(out)},ensure_ascii=False))
    return summary
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--file',type=Path,required=True)
    p.add_argument('--out',type=Path,default=Path('audit-output'))
    p.add_argument('--max-rows',type=int,default=0)
    args=p.parse_args()
    audit(args.file,args.out,args.max_rows)
