from fastapi import FastAPI, Response, status,Request
import os
from pathlib import Path
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient
from plugins.database import init_db, get_random, get_query
from starlette.exceptions import HTTPException as StarletteHTTPException
from plugins.og_image import get_og_image
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


@app.get("/api/og/{roll}")
async def og_handler(roll : str):
    try:
        await init_db(client["results"])
        return await get_og_image(roll)
    except Exception as e:
        return {"error" : str(e)}

@app.get("/share/{roll}", response_class=HTMLResponse)
async def share_handler(roll: str, request: Request):
    try:
        await init_db(client["results"])
        student = await Student.find_one(Student.student_info.roll_number == roll.upper())
        if not student:
            name = "Student Result Card"
            desc = "Check NIT Hamirpur student results, SGPA, CGPA, rankings, and analytics."
        else:
            name = student.student_info.student_name.upper()
            desc = f"Roll Number: {student.student_info.roll_number} | Check SGPA, CGPA, and semester-wise results."
    except Exception:
        name = "Student Result Card"
        desc = "Check NIT Hamirpur student results, SGPA, CGPA, rankings, and analytics."

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
