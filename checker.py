#!/usr/bin/env python3
"""
NITH Results Checker - Monitors results.nith.ac.in for new results and updates the database.

This script intelligently checks for:
1. New semesters added to existing students
2. New students added to existing batches
3. New batches/years that become available

It only fetches and updates data that has changed, avoiding redundant requests.
"""

import hashlib
import json
import logging
import os
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(dotenv_path=None):
        return False

# Load environment variables
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(dotenv_path=os.path.join(basedir, ".env"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(basedir, 'checker.log'))
    ]
)
logger = logging.getLogger(__name__)

# Constants
BRANCH_CODES = ['BAR', 'BCE', 'BCH', 'BCS', 'BEC', 'BEE', 'BMA', 'BME', 'BMS', 'BPH', 'DCS', 'DEC']
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', 7200))  # Default: 2 hours
MAX_CONSECUTIVE_EMPTY = 3  # Stop checking branch after this many consecutive empty rolls


def get_mongo_client():
    """Get MongoDB client from environment."""
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is not configured in environment or .env file")
    return MongoClient(mongo_uri)


def get_db():
    """Get the results database."""
    client = get_mongo_client()
    db_name = os.getenv("MONGODB_DB_NAME", "results")
    return client[db_name]


def next_roll_number(roll, num):
    """Generate the next roll number."""
    prefix = roll[:-3]
    number = int(roll[-3:])
    next_number = number + num
    return f"{prefix}{next_number:03d}"


def year_exists(year: str) -> bool:
    """Check if a year's result scheme exists on the server."""
    try:
        session = requests.Session()
        get_url = f"http://results.nith.ac.in/scheme{year}/studentresult/index.asp"
        r = session.get(get_url, timeout=10)
        return 'Server Error' not in r.text
    except requests.RequestException as e:
        logger.warning(f"Error checking year {year}: {e}")
        return False


def get_active_years():
    """Get all years that have results available (from 20 onwards)."""
    years = []
    i = 20
    while year_exists(str(i)):
        years.append(str(i))
        i += 1
    return years


def fetch_result(rollnumber: str):
    """Fetch result for a single roll number."""
    try:
        session = requests.Session()
        get_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/index.asp"
        r = session.get(get_url, timeout=15)

        soup = BeautifulSoup(r.text, "lxml")
        csrf_elem = soup.find("input", {"name": "CSRFToken"})
        req_elem = soup.find("input", {"name": "RequestVerificationToken"})
        
        if not csrf_elem or not req_elem:
            return None
            
        csrf = csrf_elem["value"]
        req = req_elem["value"]

        post_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/result.asp"
        data = {
            "RollNumber": rollnumber,
            "CSRFToken": csrf,
            "RequestVerificationToken": req,
            "B1": "Submit"
        }

        response = session.post(post_url, data=data, timeout=15)
        html2 = response.text
        
        if 'Roll number Problem' in html2 or 'Server Error' in html2 or 'UMC' in html2:
            return None

        soup = BeautifulSoup(html2, "lxml")
        rows = soup.find_all("tr")

        table_data = [
            [td.get_text(strip=True) for td in row.find_all("td")]
            for row in rows
        ]

        filtered_lists = []
        for lst in table_data:
            if not lst or lst[0] == 'Regular Result' or 'Hamirpur' in lst[0]:
                continue
            elif 'ROLL NUMBER' in lst[0]:
                filtered_lists.append(lst)
            elif len(lst) in (1, 6):
                filtered_lists.append(lst)

        final_result = {
            "student_info": {},
            "semesters": {}
        }

        current_sem = None
        HEADERS = ["No", "Subject", "Code", "Credits", "Grade", "Marks"]

        for row in filtered_lists:
            if len(row) == 3 and "ROLL NUMBER" in row[0]:
                final_result["student_info"] = {
                    "roll_number": row[0].replace("ROLL NUMBER", "").strip(),
                    "student_name": row[1].replace("STUDENT NAME", "").strip(),
                    "father_name": row[2].replace("FATHER NAME", "").strip()
                }

            elif len(row) == 1 and row[0].startswith("Semester"):
                current_sem = row[0].split()[-1]
                final_result["semesters"][current_sem] = {
                    "semester_name": row[0],
                    "subjects": []
                }

            elif len(row) == 6 and current_sem:
                course = dict(zip(HEADERS, row))
                final_result["semesters"][current_sem]["subjects"].append({
                    "no": int(course["No"]),
                    "subject": course["Subject"],
                    "code": course["Code"],
                    "credits": int(course["Credits"]),
                    "grade": course["Grade"],
                    "marks": int(course["Marks"])
                })

        return final_result if final_result["student_info"] else None

    except requests.RequestException as e:
        logger.warning(f"Network error fetching {rollnumber}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching {rollnumber}: {e}")
        return None


def result_exists_quick(rollnumber: str) -> bool:
    """Quick check if a result exists (without full parsing)."""
    try:
        session = requests.Session()
        get_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/index.asp"
        r = session.get(get_url, timeout=10)

        soup = BeautifulSoup(r.text, "lxml")
        csrf_elem = soup.find("input", {"name": "CSRFToken"})
        req_elem = soup.find("input", {"name": "RequestVerificationToken"})
        
        if not csrf_elem or not req_elem:
            return False

        post_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/result.asp"
        data = {
            "RollNumber": rollnumber,
            "CSRFToken": csrf_elem["value"],
            "RequestVerificationToken": req_elem["value"],
            "B1": "Submit"
        }

        response = session.post(post_url, data=data, timeout=10)
        return 'Roll number Problem' not in response.text and 'Server Error' not in response.text
    except:
        return False


def compute_semester_hash(semesters: dict) -> str:
    """Compute a hash of semester data to detect changes."""
    # Sort to ensure consistent ordering
    sorted_data = json.dumps(semesters, sort_keys=True)
    return hashlib.md5(sorted_data.encode()).hexdigest()


def check_for_updates(db, year: str, collection_name: str = None):
    """
    Check for updates for a specific year.
    
    Returns dict with stats about what was updated.
    """
    collection_name = collection_name or f"20{year}"
    collection = db[collection_name]
    
    stats = {
        "year": year,
        "new_students": 0,
        "updated_students": 0,
        "checked_students": 0,
        "errors": 0
    }
    
    logger.info(f"Checking year 20{year}...")
    
    for branch in BRANCH_CODES:
        consecutive_empty = 0
        j = 1
        
        while consecutive_empty < MAX_CONSECUTIVE_EMPTY:
            rollnumber = f"{year}{branch}{j:03d}"
            stats["checked_students"] += 1
            
            # Check if student exists in DB
            existing = collection.find_one({"student_info.roll_number": rollnumber})
            
            if existing:
                # Student exists - check if there are new semesters
                existing_sem_count = len(existing.get("semesters", {}))
                
                # Fetch fresh data
                fresh_result = fetch_result(rollnumber)
                
                if fresh_result:
                    consecutive_empty = 0
                    fresh_sem_count = len(fresh_result.get("semesters", {}))
                    
                    # Check if new semesters were added
                    if fresh_sem_count > existing_sem_count:
                        # Update with new data
                        collection.update_one(
                            {"student_info.roll_number": rollnumber},
                            {"$set": fresh_result}
                        )
                        stats["updated_students"] += 1
                        logger.info(f"Updated {rollnumber}: {existing_sem_count} -> {fresh_sem_count} semesters")
                    else:
                        # Check if any semester data changed (grades updated, etc.)
                        existing_hash = compute_semester_hash(existing.get("semesters", {}))
                        fresh_hash = compute_semester_hash(fresh_result.get("semesters", {}))
                        
                        if existing_hash != fresh_hash:
                            collection.update_one(
                                {"student_info.roll_number": rollnumber},
                                {"$set": fresh_result}
                            )
                            stats["updated_students"] += 1
                            logger.info(f"Updated {rollnumber}: semester data changed")
                else:
                    consecutive_empty += 1
            else:
                # Student doesn't exist - check if result is available
                fresh_result = fetch_result(rollnumber)
                
                if fresh_result:
                    consecutive_empty = 0
                    collection.insert_one(fresh_result)
                    stats["new_students"] += 1
                    logger.info(f"New student: {rollnumber} - {fresh_result['student_info'].get('student_name', 'Unknown')}")
                else:
                    # Check if this is a dropout (next rolls exist)
                    is_dropout = (
                        result_exists_quick(next_roll_number(rollnumber, 1)) or
                        result_exists_quick(next_roll_number(rollnumber, 2)) or
                        result_exists_quick(next_roll_number(rollnumber, 3))
                    )
                    
                    if is_dropout:
                        consecutive_empty = 0
                        logger.debug(f"Skipped dropout: {rollnumber}")
                    else:
                        consecutive_empty += 1
            
            j += 1
            
            # Rate limiting - be nice to the server
            time.sleep(0.5)
        
        logger.info(f"Finished {branch} for year 20{year}")
    
    return stats


def check_new_years(db):
    """Check if any new years have become available."""
    active_years = get_active_years()
    existing_collections = db.list_collection_names()
    
    new_years = []
    for year in active_years:
        collection_name = f"20{year}"
        if collection_name not in existing_collections:
            new_years.append(year)
            logger.info(f"New year detected: 20{year}")
    
    return new_years


def get_latest_year():
    """Get the most recent year with results."""
    years = get_active_years()
    return years[-1] if years else None


def run_checker(check_all_years: bool = False, specific_years: list = None):
    """
    Main checker function.
    
    Args:
        check_all_years: If True, check all years. If False, only check latest 2 years.
        specific_years: List of specific years to check (e.g., ['24', '25'])
    """
    logger.info("=" * 50)
    logger.info(f"Starting results checker at {datetime.now().isoformat()}")
    logger.info("=" * 50)
    
    try:
        db = get_db()
        
        # Check for new years first
        new_years = check_new_years(db)
        
        # Determine which years to check
        if specific_years:
            years_to_check = specific_years
        elif check_all_years:
            years_to_check = get_active_years()
        else:
            # Default: check latest 2 years + any new years
            active_years = get_active_years()
            years_to_check = list(set(active_years[-2:] + new_years)) if active_years else []
        
        logger.info(f"Years to check: {['20' + y for y in years_to_check]}")
        
        all_stats = []
        for year in years_to_check:
            stats = check_for_updates(db, year)
            all_stats.append(stats)
            logger.info(f"Year 20{year} complete: {stats['new_students']} new, {stats['updated_students']} updated")
        
        # Summary
        total_new = sum(s["new_students"] for s in all_stats)
        total_updated = sum(s["updated_students"] for s in all_stats)
        total_checked = sum(s["checked_students"] for s in all_stats)
        
        logger.info("=" * 50)
        logger.info(f"Checker complete at {datetime.now().isoformat()}")
        logger.info(f"Total: {total_checked} checked, {total_new} new, {total_updated} updated")
        logger.info("=" * 50)
        
        return all_stats
        
    except Exception as e:
        logger.error(f"Checker failed: {e}")
        raise


def run_continuous(interval: int = None):
    """Run the checker continuously at specified intervals."""
    interval = interval or CHECK_INTERVAL
    logger.info(f"Starting continuous checker with {interval}s interval")
    
    while True:
        try:
            run_checker()
        except Exception as e:
            logger.error(f"Error in checker cycle: {e}")
        
        logger.info(f"Sleeping for {interval} seconds...")
        time.sleep(interval)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="NITH Results Checker")
    parser.add_argument("--continuous", "-c", action="store_true", 
                        help="Run continuously at intervals")
    parser.add_argument("--interval", "-i", type=int, default=CHECK_INTERVAL,
                        help=f"Check interval in seconds (default: {CHECK_INTERVAL})")
    parser.add_argument("--all-years", "-a", action="store_true",
                        help="Check all years instead of just latest 2")
    parser.add_argument("--years", "-y", nargs="+",
                        help="Specific years to check (e.g., 24 25)")
    
    args = parser.parse_args()
    
    if args.continuous:
        run_continuous(args.interval)
    else:
        run_checker(check_all_years=args.all_years, specific_years=args.years)
