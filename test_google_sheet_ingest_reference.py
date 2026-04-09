import unittest

from google_sheet_ingest_reference import (
    FIXED_SCHEMA,
    build_fixed_schema_row,
    build_sheet_row,
    parse_whatsapp_message,
)


RAW_WITHOUT_GENDER = """⚖️ Weight (kg): 75
🪵 Board type: twintip
🪵 Board size: 137x41
🎯 Level: Advanced
🪁 Kite (m²): 9
🌬️ Wind (kts): 18
🏷️ Brand: Duotone
🪁 Model: Orbit
📍 Spot: Punta Trettu
🌊 Water conditions: Chop
✅ Session result: Good
Notes: Gusty
---
ID: abc123def4
TS: 2026-04-09T18:30:00+02:00
SRC: rdk_v1
SIG: deadbeef00
---"""


RAW_WITH_GENDER = """⚖️ Weight (kg): 62
Gender: F
🪵 Board type: surfboard
🪵 Board size: 5'8
🎯 Level: Independent
🪁 Kite (m²): 7
🌬️ Wind (kts): 24
🏷️ Brand: North
🪁 Model: Reach
📍 Spot: Capo Mannu
🌊 Water conditions: Waves
✅ Session result: Powered
Notes: Clean swell
---
ID: z9y8x7w6v5
TS: 2026-04-09T19:00:00+02:00
SRC: rdk_v1
SIG: a1b2c3d4e5
---"""


RAW_INCOMPLETE = """🏷️ Brand: Cabrinha
🪁 Model: Moto X
---
ID: h1j2k3l4m5
TS: 2026-04-09T19:15:00+02:00
SRC: rdk_v1
SIG: 012345abcd
---"""


class IngestReferenceTests(unittest.TestCase):
    def test_message_without_gender_keeps_null_and_does_not_shift(self):
        record = parse_whatsapp_message(RAW_WITHOUT_GENDER)

        self.assertEqual(record["timestamp"], "2026-04-09T18:30:00+02:00")
        self.assertEqual(record["weight"], "75")
        self.assertIsNone(record["gender"])
        self.assertEqual(record["board"], "twintip")
        self.assertEqual(record["board_size"], "137x41")
        self.assertEqual(record["kite_size"], "9")

        row = build_sheet_row(record, FIXED_SCHEMA)
        self.assertEqual(row[0], "2026-04-09T18:30:00+02:00")
        self.assertEqual(row[1], "75")
        self.assertIsNone(row[2])
        self.assertEqual(row[3], "twintip")
        self.assertEqual(row[4], "137x41")

    def test_message_with_gender_maps_correctly(self):
        record = parse_whatsapp_message(RAW_WITH_GENDER)

        self.assertEqual(record["gender"], "F")
        self.assertEqual(record["board"], "surfboard")
        self.assertEqual(record["board_size"], "5'8")
        self.assertEqual(record["wind"], "24")
        self.assertEqual(record["note"], "Clean swell")

        expected_row = [
            "2026-04-09T19:00:00+02:00",
            "62",
            "F",
            "surfboard",
            "5'8",
            "Independent",
            "7",
            "24",
            "North",
            "Reach",
            "Capo Mannu",
            "Waves",
            "Powered",
            "Clean swell",
        ]
        self.assertEqual(build_fixed_schema_row(record), expected_row)

    def test_incomplete_message_only_populates_present_fields(self):
        record = parse_whatsapp_message(RAW_INCOMPLETE)

        self.assertEqual(record["timestamp"], "2026-04-09T19:15:00+02:00")
        self.assertEqual(record["brand"], "Cabrinha")
        self.assertEqual(record["model"], "Moto X")
        self.assertIsNone(record["gender"])
        self.assertIsNone(record["weight"])
        self.assertIsNone(record["board"])
        self.assertIsNone(record["board_size"])
        self.assertIsNone(record["note"])

    def test_sheet_projection_ignores_extra_columns_without_shifting(self):
        record = parse_whatsapp_message(RAW_WITHOUT_GENDER)
        headers = [
            "timestamp",
            "weight",
            "sheet_version",
            "gender",
            "board",
            "board_size",
            "level",
            "kite_size",
        ]

        row = build_sheet_row(record, headers)

        self.assertEqual(
            row,
            [
                "2026-04-09T18:30:00+02:00",
                "75",
                None,
                None,
                "twintip",
                "137x41",
                "Advanced",
                "9",
            ],
        )


if __name__ == "__main__":
    unittest.main()
