import unittest

from google_sheet_ingest_reference import (
    FIXED_SCHEMA,
    build_fixed_schema_row,
    build_sheet_row,
    normalize_frontend_payload,
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
TS: 2026-04-09T18:30:00+02:00
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
TS: 2026-04-09T19:00:00+02:00
SIG: a1b2c3d4e5
---"""


RAW_INCOMPLETE = """🏷️ Brand: Cabrinha
🪁 Model: Moto X
---
TS: 2026-04-09T19:15:00+02:00
SIG: 012345abcd
---"""


RAW_LEGACY = """⚖️ Weight (kg): 68
🏷️ Brand: Eleveight
---
ID: abc123def4
TS: 2026-04-09T20:05:00+02:00
SRC: rdk_v1
SIG: feedbead10
---"""


class IngestReferenceTests(unittest.TestCase):
    def test_frontend_json_without_gender_keeps_board_aligned(self):
        payload = {
            "ts": "2026-04-09T20:10:00+02:00",
            "session_id": "10ap2010xq7r",
            "technical_id": "3d9c6f4a13e240f58edac9d0c78c6f12",
            "weight": "80",
            "board": "twintip",
            "boardSize": "137x41",
            "level": "Advanced",
            "kite": "10",
            "wind": "21",
        }

        record = normalize_frontend_payload(payload)
        row = build_sheet_row(record, FIXED_SCHEMA)

        self.assertEqual(record["timestamp"], "2026-04-09T20:10:00+02:00")
        self.assertEqual(record["event_ts"], "2026-04-09T20:10:00+02:00")
        self.assertEqual(record["technical_id"], "3d9c6f4a13e240f58edac9d0c78c6f12")
        self.assertEqual(record["session_id_raw"], "10ap2010xq7r")

        self.assertEqual(row[0], "2026-04-09T20:10:00+02:00")
        self.assertEqual(row[1], "2026-04-09T20:10:00+02:00")
        self.assertIsNone(row[2])
        self.assertIsNone(row[3])
        self.assertEqual(row[4], "3d9c6f4a13e240f58edac9d0c78c6f12")
        self.assertEqual(row[5], "10ap2010xq7r")
        self.assertEqual(row[7], "80")
        self.assertIsNone(row[8])
        self.assertEqual(row[9], "twintip")
        self.assertEqual(row[10], "137x41")

    def test_frontend_json_with_gender_maps_correctly(self):
        payload = {
            "ts": "2026-04-09T20:12:00+02:00",
            "session_id": "10ap2012ab9k",
            "technical_id": "26b7080da3d54723a1450cb048c31879",
            "weight": "60",
            "gender": "f",
            "board": "surfboard",
            "boardSize": "5'6",
            "level": "Independent",
            "kite": "8",
            "wind": "26",
            "brand": "Core",
        }

        record = normalize_frontend_payload(payload)

        self.assertEqual(record["timestamp"], "2026-04-09T20:12:00+02:00")
        self.assertEqual(record["event_ts"], "2026-04-09T20:12:00+02:00")
        self.assertEqual(record["technical_id"], "26b7080da3d54723a1450cb048c31879")
        self.assertEqual(record["session_id_raw"], "10ap2012ab9k")
        self.assertEqual(record["gender"], "F")
        self.assertEqual(record["board"], "surfboard")
        self.assertEqual(record["board_size"], "5'6")
        self.assertEqual(record["kite_size"], "8")

    def test_message_without_gender_keeps_null_and_does_not_shift(self):
        record = parse_whatsapp_message(RAW_WITHOUT_GENDER)

        self.assertEqual(record["timestamp"], "2026-04-09T18:30:00+02:00")
        self.assertEqual(record["event_ts"], "2026-04-09T18:30:00+02:00")
        self.assertEqual(record["weight"], "75")
        self.assertIsNone(record["gender"])
        self.assertIsNone(record["session_id_raw"])
        self.assertEqual(record["board"], "twintip")
        self.assertEqual(record["board_size"], "137x41")
        self.assertEqual(record["kite_size"], "9")

        row = build_sheet_row(record, FIXED_SCHEMA)
        self.assertEqual(row[0], "2026-04-09T18:30:00+02:00")
        self.assertEqual(row[1], "2026-04-09T18:30:00+02:00")
        self.assertEqual(row[7], "75")
        self.assertIsNone(row[8])
        self.assertEqual(row[9], "twintip")
        self.assertEqual(row[10], "137x41")

    def test_message_with_gender_maps_correctly(self):
        record = parse_whatsapp_message(RAW_WITH_GENDER)

        self.assertEqual(record["timestamp"], "2026-04-09T19:00:00+02:00")
        self.assertEqual(record["event_ts"], "2026-04-09T19:00:00+02:00")
        self.assertEqual(record["gender"], "F")
        self.assertEqual(record["board"], "surfboard")
        self.assertEqual(record["board_size"], "5'8")
        self.assertEqual(record["wind"], "24")
        self.assertEqual(record["note"], "Clean swell")

        expected_row = [
            "2026-04-09T19:00:00+02:00",
            "2026-04-09T19:00:00+02:00",
            None,
            None,
            None,
            None,
            None,
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
        self.assertEqual(record["event_ts"], "2026-04-09T19:15:00+02:00")
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
            "event_ts",
            "sheet_version",
            "technical_id",
            "session_id_raw",
            "weight",
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
                "2026-04-09T18:30:00+02:00",
                None,
                None,
                None,
                "75",
                None,
                "twintip",
                "137x41",
                "Advanced",
                "9",
            ],
        )

    def test_legacy_message_keeps_identity_fields_for_backward_compatibility(self):
        record = parse_whatsapp_message(RAW_LEGACY)

        self.assertEqual(record["timestamp"], "2026-04-09T20:05:00+02:00")
        self.assertEqual(record["event_ts"], "2026-04-09T20:05:00+02:00")
        self.assertEqual(record["session_id_raw"], "abc123def4")
        self.assertEqual(record["src"], "rdk_v1")
        self.assertEqual(record["brand"], "Eleveight")


if __name__ == "__main__":
    unittest.main()
