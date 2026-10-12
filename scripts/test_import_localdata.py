import csv
import os
import tempfile
import unittest
from pathlib import Path

from pyproj import Transformer
from import_localdata import normalize, region_parts, run, transform_coordinates


class LocaldataImportTest(unittest.TestCase):
    def setUp(self):
        self.transformer = Transformer.from_crs("EPSG:5174", "EPSG:4326", always_xy=True)
        self.row = {
            "관리번호": "3000000-101-2008-00378",
            "사업장명": "한일식당",
            "상세영업상태명": "영업",
            "도로명주소": "서울특별시 종로구 종로 309-3 (창신동)",
            "지번주소": "서울특별시 종로구 창신동 534 외1필지",
            "업태구분명": "한식",
            "좌표정보(X)": "200994.093174693    ",
            "좌표정보(Y)": "452223.842151234    ",
        }

    def test_actual_localdata_projection(self):
        item, issue = normalize(self.row, self.transformer)
        self.assertIsNone(issue)
        self.assertEqual(item[0], "localdata:3000000-101-2008-00378")
        self.assertEqual(item[5:8], ("서울특별시", "종로구", "창신동"))
        self.assertAlmostEqual(item[9], 37.5723041, delta=.0005)
        self.assertAlmostEqual(item[10], 127.0120408, delta=.0005)

    def test_closure_never_imported(self):
        self.row["상세영업상태명"] = "폐업"
        item, reason = normalize(self.row, self.transformer)
        self.assertIsNone(item)
        self.assertEqual(reason, "not_active")

    def test_missing_coordinates_keeps_searchable_restaurant(self):
        self.row["좌표정보(X)"] = ""
        self.row["좌표정보(Y)"] = ""
        item, reason = normalize(self.row, self.transformer)
        self.assertIsNotNone(item)
        self.assertEqual((item[9], item[10]), (None, None))
        self.assertEqual(reason, "missing_coordinates")

    def test_zero_coordinates_not_geocoded(self):
        self.assertEqual(transform_coordinates("0", "0", self.transformer)[2],
                         "out_of_projection_bounds")

    def test_missing_address_rejected(self):
        self.row["도로명주소"] = ""
        self.row["지번주소"] = ""
        item, reason = normalize(self.row, self.transformer)
        self.assertIsNone(item)
        self.assertEqual(reason, "missing_address")

    def test_dry_run_no_database_connection(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "sample.csv"
            with path.open("w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=list(self.row))
                writer.writeheader()
                writer.writerow(self.row)
                writer.writerow({**self.row, "상세영업상태명": "폐업", "관리번호": "closed"})
                writer.writerow(self.row)  # repeated 管理番号 must not duplicate
                writer.writerow({**self.row, "관리번호": "2", "좌표정보(X)": "", "좌표정보(Y)": ""})
            report = run(path, 10000, commit=False, report_path=Path(d) / "qa.json")
            self.assertEqual(report["counts"]["source_rows"], 4)
            self.assertEqual(report["counts"]["eligible"], 2)
            self.assertEqual(report["counts"]["not_active"], 1)
            self.assertEqual(report["counts"]["duplicate_source_ids"], 1)
            self.assertEqual(report["counts"]["missing_coordinates"], 1)
            self.assertTrue((Path(d) / "qa.json").exists())

    def test_commit_cannot_run_without_sha_or_large_limit(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "x.csv"
            path.write_text("anything")
            with self.assertRaisesRegex(ValueError, "10,000"):
                run(path, 10001, commit=True, expected_sha256="ff")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                run(path, 100, commit=True)
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                run(path, 1, expected_sha256="deadbeef")

    def test_region_sejong(self):
        self.assertEqual(region_parts("세종특별자치시 종촌동 677"), 
                         ("세종특별자치시", None, "종촌동"))


if __name__ == "__main__":
    unittest.main()
