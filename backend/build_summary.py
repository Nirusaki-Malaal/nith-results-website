import gzip
import json
import os
from pathlib import Path
from pymongo import ASCENDING, MongoClient

DEFAULT_SUMMARY_PATH = Path(__file__).resolve().parent / "assets" / "summary.json"
DEFAULT_SUMMARY_GZ_PATH = Path(__file__).resolve().parent / "assets" / "summary.json.gz"

env_path = Path(__file__).with_name(".env")
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)


def build_summary(
    json_path: Path = DEFAULT_SUMMARY_PATH,
    gz_path: Path = DEFAULT_SUMMARY_GZ_PATH,
) -> tuple[Path, Path]:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI environment variable is not set")

    db_name = os.environ.get("DATABASE_NAME") or "results"
    client = MongoClient(mongo_uri)
    try:
        col = client[db_name]["Student"]
        docs = list(
            col.find({}, {"semesters": 0, "_id": 0}).sort("student_info.roll_number", ASCENDING)
        )
    finally:
        client.close()

    raw = json.dumps(docs, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=9)

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_bytes(raw)
    gz_path.write_bytes(compressed)
    print(f"Built {json_path} ({len(docs)} docs, {len(raw)} bytes) and {gz_path} ({len(compressed)} bytes)")
    return json_path, gz_path


if __name__ == "__main__":
    build_summary()
