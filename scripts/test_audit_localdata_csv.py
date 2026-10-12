import tempfile
import unittest
from pathlib import Path
from audit_localdata_csv import audit

class WhatEatOAuditTest(unittest.TestCase):
    def test_cp949_localdata(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            csv_file=root/'식품_일반음식점.csv'
            csv_file.write_text('관리번호,사업장명,도로명전체주소,영업상태명,업태구분명,좌표정보(x),좌표정보(y)\n1,예시식당,서울시 종로구,영업,한식,123456,456789\n2,예시카페,서울시 마포구,폐업,카페,127.1,37.5\n',encoding='cp949')
            r=audit(csv_file,root/'output')
            self.assertEqual(r['inspected_rows'],2)
            self.assertEqual(r['quality_counts']['projected_or_unknown_coordinates'],1)
            self.assertEqual(r['quality_counts']['wgs84_like_coordinates'],1)
            self.assertEqual(r['mapping']['name'],'사업장명')
            self.assertTrue((root/'output'/'WhatEatO_CSV_audit.json').is_file())
    def test_reject_unsupported_schema(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/'broken.csv';p.write_text('wrong,columns\n1,2\n')
            with self.assertRaises(ValueError):audit(p,root/'out')

if __name__=='__main__':unittest.main()
