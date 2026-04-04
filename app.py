import math
import os
import random
import re
import secrets
import time
from collections import defaultdict, deque
from functools import wraps
from urllib.parse import urlparse

from flask import (
    Flask,
    abort,
    g,
    jsonify,
    render_template,
    request,
    send_from_directory,
)
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from werkzeug.middleware.proxy_fix import ProxyFix

try:
    from dotenv import load_dotenv
except ImportError:  # Optional during bootstrap before requirements are refreshed.

    def load_dotenv(dotenv_path=None):
        return False


basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(dotenv_path=os.path.join(basedir, ".env"))

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
app.config["JSON_SORT_KEYS"] = False

BRANCH_CODES = {
    "BAR": "Architecture",
    "BCE": "Civil Engineering",
    "BCH": "Chemical Engineering",
    "BEC": "Electronics And Communication",
    "BEE": "Electrical Engineering",
    "BMA": "Mathematics And Computing",
    "BME": "Mechanical Engineering",
    "BMS": "Material Science",
    "BPH": "Engineering Physics",
    "DCS": "Dual Degree Computer Science",
    "BCS": "Computer Science",
    "DEC": "Dual Degree Electronics",
}

GRADE_POINTS = {
    "AA": 10,
    "A+": 10,
    "O": 10,
    "A": 10,
    "AB": 9,
    "BB": 8,
    "B": 8,
    "BC": 7,
    "B-": 7,
    "CC": 6,
    "C": 6,
    "CD": 5,
    "D": 4,
    "F": 0,
    "I": 0,
}

ALLOWED_SORT_FIELDS = {"roll", "cgpa", "name"}
ALLOWED_SORT_ORDERS = {"asc", "desc"}
ROLL_NUMBER_RE = re.compile(r"^\d{2}[A-Z]{2,4}\d{2,4}$")
DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 50
INITIAL_SAMPLE_SIZE = 10
MIN_QUERY_LENGTH = 3

_mongo_client = None
_student_summaries = None
_student_details = None
_request_history = defaultdict(deque)


def normalize_text(value, default="", max_length=160):
    if value is None:
        return default

    text = str(value).strip()
    if not text:
        return default

    return text[:max_length]


def parse_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_origin(origin):
    parsed = urlparse(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def get_allowed_origins():
    raw_origins = os.getenv("ALLOWED_ORIGINS", "")
    allowed = set()

    for origin in raw_origins.split(","):
        normalized = normalize_origin(origin.strip())
        if normalized:
            allowed.add(normalized)

    return allowed


def get_client_ip():
    if request.access_route:
        return request.access_route[0]
    return request.remote_addr or "unknown"


def json_error(message, status_code, extra_headers=None):
    response = jsonify({"error": message})
    response.status_code = status_code

    if extra_headers:
        for key, value in extra_headers.items():
            response.headers[key] = value

    return response


def enforce_rate_limit(bucket, limit, window_seconds):
    now = time.monotonic()
    key = (bucket, get_client_ip())
    history = _request_history[key]

    while history and now - history[0] > window_seconds:
        history.popleft()

    if len(history) >= limit:
        return json_error(
            "Too many requests. Please slow down and try again shortly.",
            429,
            {"Retry-After": str(window_seconds)},
        )

    history.append(now)
    return None


def rate_limit(bucket, limit, window_seconds):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            limited_response = enforce_rate_limit(bucket, limit, window_seconds)
            if limited_response:
                return limited_response
            return func(*args, **kwargs)

        return wrapper

    return decorator


def get_mongo_client():
    global _mongo_client

    if _mongo_client is None:
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            raise RuntimeError("MONGODB_URI is not configured.")

        _mongo_client = MongoClient(
            mongo_uri,
            maxPoolSize=50,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )

    return _mongo_client


def get_db():
    client = get_mongo_client()
    db_name = os.getenv("MONGODB_DB_NAME", "results")
    return client[db_name]


def parse_roll_number(roll_number):
    roll = normalize_text(roll_number, "").upper()
    admission_year_short = roll[:2]
    admission_year = parse_int(f"20{admission_year_short}", 0)
    batch = str(admission_year + 4) if admission_year else "Unknown"

    match = re.match(r"^\d{2}([A-Z]+)\d+$", roll)
    branch_code = match.group(1) if match else "UNK"

    return {
        "branch": branch_code,
        "branch_full": BRANCH_CODES.get(branch_code, branch_code),
        "batch": batch,
    }


def calculate_grades(semesters_data):
    total_credits = 0.0
    total_points = 0.0
    latest_sgpa = 0.0

    for semester in (semesters_data or {}).values():
        sem_credits = 0.0
        sem_points = 0.0

        for subject in semester.get("subjects", []):
            credits = parse_float(subject.get("credits"))
            grade = normalize_text(subject.get("grade"), "F", max_length=4).upper()
            grade_point = GRADE_POINTS.get(grade, 0)
            sem_credits += credits
            sem_points += credits * grade_point

        if sem_credits > 0:
            latest_sgpa = sem_points / sem_credits
            total_credits += sem_credits
            total_points += sem_points

    cgpa = (total_points / total_credits) if total_credits > 0 else 0.0
    return {"sgpa": round(latest_sgpa, 2), "cgpa": round(cgpa, 2)}


def serialize_semesters(semesters):
    payload = {}

    for semester_key, semester in (semesters or {}).items():
        subjects_payload = []

        for subject in semester.get("subjects", []):
            subjects_payload.append(
                {
                    "code": normalize_text(subject.get("code"), "-", 24),
                    "subject": normalize_text(subject.get("subject"), "-", 160),
                    "credits": round(parse_float(subject.get("credits")), 2),
                    "grade": normalize_text(subject.get("grade"), "F", 4).upper(),
                }
            )

        payload[str(semester_key)] = {
            "semester_name": normalize_text(
                semester.get("semester_name"), str(semester_key), 32
            ),
            "subjects": subjects_payload,
        }

    return payload


def build_student_summary(document):
    info = document.get("student_info") or {}
    roll = normalize_text(info.get("roll_number"), "", 24).upper()
    if not roll:
        return None

    metadata = parse_roll_number(roll)
    grades = calculate_grades(document.get("semesters") or {})

    return {
        "name": normalize_text(info.get("student_name"), "Unknown", 120),
        "roll": roll,
        "year": normalize_text(info.get("year"), "-", 24),
        "branch": metadata["branch"],
        "branchFull": metadata["branch_full"],
        "batch": metadata["batch"],
        "sgpa": grades["sgpa"],
        "cgpa": grades["cgpa"],
    }


def build_student_detail(summary, document):
    return {
        "student_info": {
            "student_name": summary["name"],
            "roll_number": summary["roll"],
            "year": summary["year"],
            "branch": summary["branch"],
            "branch_full": summary["branchFull"],
            "batch": summary["batch"],
        },
        "semesters": serialize_semesters(document.get("semesters") or {}),
    }


def fetch_collection(collection_name=None):
    target_collection = collection_name or os.getenv("MONGODB_COLLECTION", "all")
    collection = get_db()[target_collection]
    query = {"student_info.roll_number": {"$nin": ["", None]}}
    projection = {"_id": 0}
    return list(collection.find(query, projection))


def load_student_cache():
    global _student_summaries, _student_details

    if _student_summaries is not None and _student_details is not None:
        return _student_summaries, _student_details

    documents = fetch_collection()
    summaries = []
    details = {}

    for document in documents:
        summary = build_student_summary(document)
        if not summary:
            continue

        summaries.append(summary)
        details[summary["roll"]] = build_student_detail(summary, document)

    _student_summaries = summaries
    _student_details = details
    return summaries, details


def sort_students(students, sort_by, sort_order):
    reverse = sort_order == "desc"

    if sort_by == "cgpa":
        key_func = lambda student: (student["cgpa"], student["roll"])
    elif sort_by == "name":
        key_func = lambda student: (student["name"].lower(), student["roll"])
    else:
        key_func = lambda student: student["roll"]

    return sorted(students, key=key_func, reverse=reverse)


def build_stats(students):
    if not students:
        return {
            "total_students": 0,
            "average_cgpa": 0.0,
            "top_performer": "-",
        }

    total_cgpa = sum(student["cgpa"] for student in students)
    top_student = max(students, key=lambda student: (student["cgpa"], student["roll"]))

    return {
        "total_students": len(students),
        "average_cgpa": round(total_cgpa / len(students), 2),
        "top_performer": top_student["name"],
    }


def get_filtered_students():
    query = normalize_text(request.args.get("query"), "", 120).lower()
    branch = normalize_text(request.args.get("branch"), "All", 8).upper()
    batch = normalize_text(request.args.get("batch"), "All", 8)
    sort_by = normalize_text(request.args.get("sort"), "roll", 12).lower()
    sort_order = normalize_text(request.args.get("order"), "asc", 8).lower()
    page = max(parse_int(request.args.get("page"), 1), 1)
    page_size = min(
        max(parse_int(request.args.get("page_size"), DEFAULT_PAGE_SIZE), 1),
        MAX_PAGE_SIZE,
    )

    if sort_by not in ALLOWED_SORT_FIELDS:
        abort(400, description="Invalid sort field.")

    if sort_order not in ALLOWED_SORT_ORDERS:
        abort(400, description="Invalid sort order.")

    if query and len(query) < MIN_QUERY_LENGTH:
        abort(
            400,
            description=f"Search terms must be at least {MIN_QUERY_LENGTH} characters.",
        )

    summaries, _ = load_student_cache()

    filtered_students = [
        student
        for student in summaries
        if (branch == "ALL" or student["branch"] == branch)
        and (batch == "All" or student["batch"] == batch)
    ]

    if query:
        filtered_students = [
            student
            for student in filtered_students
            if query in student["name"].lower() or query in student["roll"].lower()
        ]

    use_sample = not query and branch == "ALL" and batch == "All"
    if use_sample:
        filtered_students = random.sample(
            filtered_students,
            min(INITIAL_SAMPLE_SIZE, len(filtered_students)),
        )

    sorted_students = sort_students(filtered_students, sort_by, sort_order)
    total_count = len(sorted_students)
    total_pages = 1 if total_count == 0 else math.ceil(total_count / page_size)

    if page > total_pages and total_count > 0:
        page = total_pages

    start_index = (page - 1) * page_size
    end_index = start_index + page_size

    return {
        "items": sorted_students[start_index:end_index],
        "stats": build_stats(sorted_students),
        "page": page,
        "page_size": page_size,
        "page_start": start_index,
        "total_count": total_count,
        "total_pages": total_pages,
    }


@app.before_request
def prepare_request():
    g.csp_nonce = secrets.token_urlsafe(16)

    if request.path.startswith(("/api/", "/documents")):
        limited_response = enforce_rate_limit("api-global", 120, 60)
        if limited_response:
            return limited_response


@app.after_request
def add_security_headers(response):
    nonce = getattr(g, "csp_nonce", "")
    script_sources = ["'self'", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com"]
    if nonce:
        script_sources.append(f"'nonce-{nonce}'")

    response.headers["Content-Security-Policy"] = "; ".join(
        [
            "default-src 'self'",
            f"script-src {' '.join(script_sources)}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https:",
            "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), browsing-topics=()"
    )
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    if request.path.startswith(("/api/", "/documents")):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"

        allowed_origins = get_allowed_origins()
        origin = normalize_origin(request.headers.get("Origin", ""))

        if origin and origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET"
            response.headers["Vary"] = "Origin"

    return response


@app.errorhandler(400)
def handle_bad_request(error):
    if request.path.startswith(("/api/", "/documents")):
        return json_error(getattr(error, "description", "Bad request."), 400)
    return error


@app.errorhandler(404)
def handle_not_found(error):
    if request.path.startswith(("/api/", "/documents")):
        return json_error("Resource not found.", 404)
    return error


@app.errorhandler(429)
def handle_too_many_requests(error):
    if request.path.startswith(("/api/", "/documents")):
        return json_error("Too many requests.", 429)
    return error


@app.route("/api/students", methods=["GET"])
@app.route("/documents", methods=["GET"])
@rate_limit("student-list", 30, 60)
def list_students():
    try:
        payload = get_filtered_students()
    except RuntimeError:
        return json_error("Server configuration is incomplete.", 503)
    except PyMongoError:
        return json_error("Result data is temporarily unavailable.", 503)

    return jsonify(payload)


@app.route("/api/students/<roll_number>", methods=["GET"])
@app.route("/documents/<roll_number>", methods=["GET"])
@rate_limit("student-detail", 60, 60)
def get_student_detail(roll_number):
    normalized_roll = normalize_text(roll_number, "", 24).upper()
    if not ROLL_NUMBER_RE.fullmatch(normalized_roll):
        abort(400, description="Invalid roll number format.")

    try:
        _, student_details = load_student_cache()
    except RuntimeError:
        return json_error("Server configuration is incomplete.", 503)
    except PyMongoError:
        return json_error("Result data is temporarily unavailable.", 503)

    student = student_details.get(normalized_roll)
    if not student:
        return json_error("Student result not found.", 404)

    return jsonify({"student": student})


@app.route("/")
def home():
    return render_template("index.html", csp_nonce=g.csp_nonce)


@app.route("/about")
def about():
    return render_template("about.html", csp_nonce=g.csp_nonce)


@app.route("/contact")
def contact():
    return render_template("contact.html", csp_nonce=g.csp_nonce)


@app.route("/privacy")
def privacy():
    return render_template("privacy.html", csp_nonce=g.csp_nonce)


@app.route("/robots.txt")
def robots():
    return send_from_directory("static", "robots.txt", mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory("static", "sitemap.xml", mimetype="application/xml")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/assets", "favicon.ico", mimetype="image/x-icon")


@app.route("/results")
@app.route("/result")
def results_redirect():
    return home()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
