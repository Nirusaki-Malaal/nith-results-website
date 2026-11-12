"""Build backend/assets/rolls.bf from all roll numbers in MongoDB."""

import os
from pathlib import Path
from pymongo import MongoClient

from plugins.bloom import BloomFilter, DEFAULT_BLOOM_PATH

env_path = Path(__file__).with_name(".env")
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)


def build_bloom(output_path: Path = DEFAULT_BLOOM_PATH, fpr: float = 0.01) -> Path:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI environment variable is not set")

    db_name = os.environ.get("DATABASE_NAME") or "results"
    client = MongoClient(mongo_uri)
    try:
        col = client[db_name]["Student"]
        rolls = [
            doc["student_info"]["roll_number"]
            for doc in col.find({}, {"student_info.roll_number": 1, "_id": 0})
            if doc.get("student_info", {}).get("roll_number")
        ]
    finally:
        client.close()

    capacity = max(10_000, len(rolls) * 2)
    bf = BloomFilter.create(capacity=capacity, fpr=fpr)
    for roll in rolls:
        bf.add(roll)

    bf.save(output_path)
    print(
        f"Built {output_path} with {len(rolls)} rolls "
        f"({len(bf.bits)} bytes, k={bf.num_hashes}, capacity={capacity})"
    )
    return output_path


if __name__ == "__main__":
    build_bloom()
