import csv
import tempfile
import unittest
from pathlib import Path
from filter_closed_localdata import filter_csv

class CleanTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.source=self.root/"source.csv"
        with self.source.open("w",encoding="cp949",newline="") as f:
            w=csv.DictWriter(f,fieldnames=["관리번호","사업장명","상세영업상태명","폐업일자","지번주소"])
            w.writeheader()
            w.writerow({"관리번호":"1","사업장명":"맛있는집","상세영업상태명":"영업","폐업일자":"","지번주소":"서울"})
            w.writerow({"관리번호":"2","사업장명":"폐업한집","상세영업상태명":"폐업","폐업일자":"20241010","지번주소":"서울"})
            w.writerow({"관리번호":"3","사업장명":"테스트카페","상세영업상태명":"영업","폐업일자":"","지번주소":"부산"})
    def tearDown(self):
        self.temp.cleanup()
    def test_only_active_and_original_unchanged(self):
        output=self.root/"out.csv"
        before=self.source.read_bytes()
        result=filter_csv(self.source,output,self.root/"report.json",expected_rows=3,expected_open=2,expected_closed=1)
        self.assertEqual(self.source.read_bytes(),before)
        self.assertTrue(result["verified_no_closed_records"])
        with output.open("r",encoding="utf-8-sig",newline="") as f:
            rows=list(csv.DictReader(f))
        self.assertEqual([r["사업장명"] for r in rows],["맛있는집","테스트카페"])
    def test_refuses_unexpected_counts(self):
        with self.assertRaises(ValueError):
            filter_csv(self.source,self.root/"out.csv",self.root/"report.json",expected_rows=4)
        self.assertFalse((self.root/"out.csv").exists())
    def test_no_overwriting_source(self):
        with self.assertRaises(ValueError):
            filter_csv(self.source,self.source,self.root/"report.json")
    def test_rejects_unknown_status(self):
        with self.source.open("a",encoding="cp949",newline="") as f:
            csv.writer(f).writerow(["4","임시휴업","휴업","","서울"])
        with self.assertRaises(ValueError):
            filter_csv(self.source,self.root/"out.csv",self.root/"report.json")
        self.assertFalse((self.root/"out.csv").exists())
if __name__=="__main__": unittest.main()
