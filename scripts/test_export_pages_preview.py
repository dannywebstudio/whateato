import unittest
from export_pages_preview import FIELDS, MAX_RECORDS, build_records, serialize

def sample_row():
    return (
        "d6cb5aca-a3a2-4c8b-91f9-ade5b4fd0001",
        "서울식당", "서울특별시 종로구 종로 1", "서울특별시 종로구 1",
        "서울특별시", "종로구", "한식", 37.5757, 126.9769
    )

class ExportPagesPreviewTests(unittest.TestCase):
    def test_schema_is_public_only(self):
        self.assertEqual(FIELDS, ("id","name","road","lot","region","district","category","lat","lon"))
        self.assertEqual(len(serialize(sample_row())), 9)

    def test_coordinates_valid(self):
        result = serialize(sample_row())
        self.assertEqual(result["lat"], 37.5757)
        self.assertEqual(result["lon"], 126.9769)

    def test_no_map_coordinates_ok(self):
        row = list(sample_row())
        row[7] = None
        row[8] = None
        result = serialize(tuple(row))
        self.assertIsNone(result["lat"])
        self.assertIsNone(result["lon"])

    def test_outside_korea_fails(self):
        row = list(sample_row())
        row[7] = 40
        with self.assertRaises(ValueError):
            serialize(tuple(row))

    def test_duplicate_identifier_fails(self):
        with self.assertRaises(ValueError):
            build_records([sample_row(), sample_row()])

    def test_empty_name_fails(self):
        row = list(sample_row())
        row[1] = ""
        with self.assertRaises(ValueError):
            serialize(tuple(row))

    def test_unexpected_columns_fail(self):
        with self.assertRaises(ValueError):
            serialize(sample_row() + ("private field",))

    def test_max_preview_rows(self):
        self.assertEqual(MAX_RECORDS, 10_000)

if __name__ == "__main__":
    unittest.main()
