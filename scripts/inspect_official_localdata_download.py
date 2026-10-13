#!/usr/bin/env python3
"""Strict diagnostics for official LOCALDATA archive; no DB writes."""
import csv, json, pathlib, sys, zipfile, io
src=pathlib.Path(sys.argv[1]); b=src.read_bytes()
result={'bytes':len(b),'official_source':'https://file.localdata.go.kr/file/general_restaurants/info','format':'unknown','files':[]}
if b[:4] == bytes((80,75,3,4)):
 result['format']='zip'
 with zipfile.ZipFile(io.BytesIO(b)) as z:
  for item in z.infolist():
   if item.is_dir(): continue
   name=pathlib.PurePosixPath(item.filename).name
   if '..' in pathlib.PurePosixPath(item.filename).parts: raise ValueError('Unsafe archive path')
   result['files'].append({'name':name,'bytes':item.file_size})
   if name.lower().endswith('.csv'):
    with z.open(item) as handle:
     preview=handle.read(32768)
    for enc in ('utf-8-sig','cp949'):
     try:
      line=preview.decode(enc).splitlines()[0]
      result['columns']=next(csv.reader([line])); result['encoding']=enc; break
     except (UnicodeDecodeError,StopIteration): pass
elif b[:1] in (b'<',b'{') or b[:20].lower().startswith(b'<!doctype'):
 result['format']='unexpected_html_or_json'
 raise RuntimeError('Expected CSV or ZIP; received HTML/API error payload')
else:
 result['format']='csv_possible'
 for enc in ('utf-8-sig','cp949'):
  try:
   line=b[:32768].decode(enc).splitlines()[0]
   result['columns']=next(csv.reader([line]));result['encoding']=enc;break
  except (UnicodeDecodeError,StopIteration):pass
out=src.parent/'inspection.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
