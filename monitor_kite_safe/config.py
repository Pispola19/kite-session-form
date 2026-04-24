from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
DB_PATH = Path("/Users/PER_TEST/dati_massivi_test/data/collector.db")
DB_URI = f"file:{DB_PATH}?mode=ro"

HOST = "127.0.0.1"
PORT = 5050
DEBUG = False

APP_TITLE = "Kite Data System Monitor"

