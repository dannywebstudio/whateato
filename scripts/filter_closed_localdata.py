#!/usr/bin/env python3
"""WhatEatO: stream LOCALDATA CSV, retain only verified '영업' status.
Keeps all 39 source columns in UTF-8-SIG. NEVER modifies the source in place.
"""
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

REQUIRED_COLUMNS = ("관리번호", "사업장명", "상세영업상태명")
DEFAULT_EXPECTED = (2303303, 676107, 1627196)

def checksum(path: Path) -> str:
    hash_obj = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hash_obj.update(block)
    return hash_obj.hexdigest()

def filter_csv(source: Path, output: Path, report: Path, *,
               expected_rows=None, expected_open=None, expected_closed=None):
    if source.resolve() == output.resolve():
        raise ValueError("Input file must not be overwritten directly.")
    output.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    if source.stat().st_size < 1:
        raise ValueError("CSV source is empty")
    try:
        csv.field_size_limit(2**31 - 1)
    except OverflowError:
        pass
    counts = Counter()
    tmp_file = output.with_name(output.name + ".tmp")
    try:
        with source.open("r", encoding="cp949", errors="strict", newline="") as fin, \
             tmp_file.open("w", encoding="utf-8-sig", newline="") as fout:
            reader = csv.DictReader(fin)
            names = reader.fieldnames or []
            if not all(x in names for x in REQUIRED_COLUMNS):
                raise ValueError("Unexpected LOCALDATA schema; cannot safely filter")
            status_col = "상세영업상태명"
            writer = csv.DictWriter(fout, fieldnames=names, extrasaction="raise")
            writer.writeheader()
            for row in reader:
                counts["source_rows"] += 1
                state = (row.get(status_col) or "").strip()
                if state == "폐업":
                    counts["closed_removed"] += 1
                elif state == "영업":
                    writer.writerow(row)
                    counts["active_retained"] += 1
                    if (row.get("폐업일자") or "").strip():
                        counts["active_with_closure_date"] += 1
                else:
                    counts["unexpected_status"] += 1
            if counts["unexpected_status"]:
                raise ValueError("Unexpected status values, refusing to finalize cleaned CSV")
            if expected_rows is not None and counts["source_rows"] != expected_rows:
                raise ValueError("Input row count does not match audited source")
            if expected_open is not None and counts["active_retained"] != expected_open:
                raise ValueError("Open restaurant count differs from source audit")
            if expected_closed is not None and counts["closed_removed"] != expected_closed:
                raise ValueError("Closed restaurant count differs from source audit")
            if counts["source_rows"] != counts["active_retained"] + counts["closed_removed"]:
                raise ValueError("Row accounting failed")
        # Independently read output, not merely count what writer claims.
        verified = 0
        with tmp_file.open("r", encoding="utf-8-sig", newline="") as f:
            chk = csv.DictReader(f)
            for row in chk:
                if (row.get(status_col) or "").strip() != "영업":
                    raise ValueError("Output contains non-active record")
                verified += 1
        if verified != counts["active_retained"]:
            raise ValueError("Output verification count mismatch")
        tmp_file.replace(output)
        result = {
            "source_file_size_bytes": source.stat().st_size,
            "output_file_size_bytes": output.stat().st_size,
            "output_file_name": output.name,
            "source_sha256": checksum(source),
            "output_sha256": checksum(output),
            "status_column": status_col,
            "output_encoding": "utf-8-sig",
            "column_count": len(names),
            "counts": dict(counts),
            "verified_output_rows": verified,
            "verified_no_closed_records": True,
            "source_modified": False,
            "note": "Closure records have been removed from THIS DERIVED CSV; source Drive file is not yet replaced.",
        }
        report.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({"counts": result["counts"], "verified_no_closed_records": True,
                          "output_size_bytes": result["output_file_size_bytes"]}, ensure_ascii=False))
        return result
    except Exception:
        tmp_file.unlink(missing_ok=True)
        raise

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--output", type=Path, default=Path("whateato-cleaned/WhatEatO_active_only.csv"))
    p.add_argument("--report", type=Path, default=Path("whateato-cleaned/WhatEatO_cleaning_report.json"))
    p.add_argument("--expected-rows", type=int, default=None)
    p.add_argument("--expected-open", type=int, default=None)
    p.add_argument("--expected-closed", type=int, default=None)
    a=p.parse_args()
    filter_csv(a.source,a.output,a.report,
               expected_rows=a.expected_rows,
               expected_open=a.expected_open,
               expected_closed=a.expected_closed)
