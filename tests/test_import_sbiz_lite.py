import tempfile
import unittest
from pathlib import Path
from scripts.import_sbiz_lite import normalize,run
class ImportTests(unittest.TestCase):
    def test_category_filter(self):
        row={'상가업소번호':'A','상호명':'A','상권업종대분류명':'소매','도로명주소':'서울'}
        self.assertEqual(normalize(row)[1],'non_food_category')
    def test_no_address(self):
        row={'상가업소번호':'A','상호명':'A','상권업종대분류명':'음식'}
        self.assertEqual(normalize(row)[1],'missing_address')
    def test_coordinates(self):
        row={'상가업소번호':'A','상호명':'A','상권업종대분류명':'음식','도로명주소':'서울','위도':'99','경도':'99'}
        self.assertEqual(normalize(row)[1],'invalid_coordinates')
    def test_dry_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv=Path(tmp)/'test.csv'
            csv.write_text('상가업소번호,상호명,상권업종대분류명,도로명주소,위도,경도\nA,가상식당,음식,서울시 예시,37.5,127.0\nB,마트,소매,서울시 예시,37.5,127.0\n',encoding='utf-8-sig')
            r=run(csv)
            self.assertEqual(r['counts']['eligible'],1)
            self.assertEqual(r['counts']['non_food_category'],1)
            self.assertTrue(r['dry_run'])
if __name__=='__main__':unittest.main()
