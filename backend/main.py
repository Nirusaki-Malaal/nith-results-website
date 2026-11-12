from fastapi import FastAPI, Response, status,Request
import os
from pathlib import Path
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient
from plugins.database import init_db, get_query
from starlette.exceptions import HTTPException as StarletteHTTPException
from plugins.og_image import get_og_image, not_found_og_response
from plugins.bloom import load_roll_bloom
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from plugins.schema import Student

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
]



env_path = Path(__file__).with_name(".env")
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

class Config:
    MONGODB_URI = os.environ.get("MONGODB_URI")
    DATABASE_NAME = os.environ.get("DATABASE_NAME")

client = AsyncMongoClient(Config.MONGODB_URI)
ROLL_BLOOM = load_roll_bloom()
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
SUMMARY_PATH = ASSETS_DIR / "summary.json"
SUMMARY_GZ_PATH = ASSETS_DIR / "summary.json.gz"
SUMMARY_BYTES = SUMMARY_PATH.read_bytes() if SUMMARY_PATH.exists() else None
SUMMARY_GZ_BYTES = SUMMARY_GZ_PATH.read_bytes() if SUMMARY_GZ_PATH.exists() else None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(StarletteHTTPException)
async def exception_handler(_: Request , exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error" : exc.status_code})


@app.post("/api/query")
async def query_handler(query: str):
    try:
        await init_db(client["results"])
        return await get_query(query)
    except Exception as e:
        return {"error" : str(e)}


@app.get("/api/summary")
async def summary_handler(request: Request):
    accept_encoding = request.headers.get("accept-encoding", "")
    headers = {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Vary": "Accept-Encoding",
    }
    if SUMMARY_GZ_BYTES is not None and "gzip" in accept_encoding.lower():
        return Response(
            content=SUMMARY_GZ_BYTES,
            media_type="application/json",
            headers={**headers, "Content-Encoding": "gzip"},
        )
    if SUMMARY_BYTES is not None:
        return Response(
            content=SUMMARY_BYTES,
            media_type="application/json",
            headers=headers,
        )
    return JSONResponse(status_code=404, content={"error": "Summary cache not built"})


@app.get("/api/student/{roll}")
async def student_detail_handler(roll: str):
    try:
        roll_upper = roll.strip().upper()
        if ROLL_BLOOM is not None and not ROLL_BLOOM.might_contain(roll_upper):
            return JSONResponse(status_code=404, content={"error": "Student not found"})
        await init_db(client["results"])
        student = await Student.find_one(Student.student_info.roll_number == roll_upper)
        if not student:
            return JSONResponse(status_code=404, content={"error": "Student not found"})
        return Response(
            content=student.model_dump_json(),
            media_type="application/json",
            headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/og/{roll}")
async def og_handler(roll : str):
    try:
        roll_upper = roll.strip().upper()
        if ROLL_BLOOM is not None and not ROLL_BLOOM.might_contain(roll_upper):
            resp = not_found_og_response()
            if resp is not None:
                return resp
        await init_db(client["results"])
        return await get_og_image(roll_upper)
    except Exception as e:
        return {"error" : str(e)}

@app.get("/share/{roll}", response_class=HTMLResponse)
async def share_handler(roll: str, request: Request):
    roll_upper = roll.strip().upper()
    name = "Student Result Card"
    desc = "Check NIT Hamirpur student results, SGPA, CGPA, rankings, and analytics."
    if ROLL_BLOOM is None or ROLL_BLOOM.might_contain(roll_upper):
        try:
            await init_db(client["results"])
            student = await Student.find_one(Student.student_info.roll_number == roll_upper)
            if student:
                name = student.student_info.student_name.upper()
                desc = f"Roll Number: {student.student_info.roll_number} | Check SGPA, CGPA, and semester-wise results."
        except Exception:
            pass

    base_url = str(request.base_url).rstrip('/')

    html_content = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{name} - NITH Results</title>
    <meta name="description" content="{desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{base_url}/share/{roll.upper()}" />
    <meta property="og:title" content="{name} | NITH Results" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:image" content="{base_url}/api/og/{roll.upper()}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{name} | NITH Results" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="{base_url}/api/og/{roll.upper()}" />
    <script>
      window.location.href = "/?roll={roll.upper()}";
    </script>
  </head>
  <body>
    <p>Redirecting to student results...</p>
  </body>
</html>"""
    return html_content
