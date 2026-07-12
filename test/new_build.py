from pymongo import AsyncMongoClient
from pathlib import Path
import os, sys

env_path = Path(__file__).parent.with_name('backend') / ".env"

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend")) # Adding a directory to python runtime search  path

from plugins.schema import Student
from plugins.database import init_db

if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

MONGODB_URI = os.environ.get("MONGODB_URI")
print(MONGODB_URI)
client = AsyncMongoClient(MONGODB_URI)



