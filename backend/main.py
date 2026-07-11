from fastapi import FastAPI, Response, status,Request
import os
from pathlib import Path
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient
from plugins.database import init_db, get_random, get_query
from starlette.exceptions import HTTPException as StarletteHTTPException

env_path = Path(__file__).with_name(".env")
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

class Config:
    MONGODB_URI = os.environ.get("MONGODB_URI")
    DATABASE_NAME = os.environ.get("DATABASE_NAME")

client = AsyncMongoClient(Config.MONGODB_URI)
app = FastAPI()

@app.exception_handler(StarletteHTTPException)
async def exception_handler(_: Request , exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error" : exc.status_code})

@app.get("/api/random", )
async def random_handler(response: Response):
    try:
        await init_db(client["results"])
        top_10 = await get_random(quanity=10)
        response.status_code = status.HTTP_200_OK
        return {"students" : top_10}
    except Exception as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"error" : str(e)}


@app.post("/api/query")
async def query_handler(query: str):
    try:
        await init_db(client["results"])
        return await get_query(query)
    except Exception as e:
        return {"error" : str(e)}
    

