from pymongo import AsyncMongoClient
from pathlib import Path
from bs4 import BeautifulSoup
import requests
import os, sys, asyncio
from beanie.operators import Set
env_path = Path(__file__).parent.with_name('backend') / ".env"

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend")) # Adding a directory to python runtime search  path

from plugins.schema import Student, StudentInfo, Semester, Subject
from plugins.database import init_db

if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

MONGODB_URI = os.environ.get("MONGODB_URI")
print(MONGODB_URI)
client = AsyncMongoClient(MONGODB_URI)

## CSRF HANDLER

def get_url_csrf(roll_number : str):
    year = roll_number[:2]
    url = f"http://results.nith.ac.in/scheme{year}/studentresult/index.asp"
    response = requests.get(url)
    return response.text

def get_csrf_req(response):
    soup = BeautifulSoup(response, "lxml")
    csrf = soup.find("input", {"name": "CSRFToken"})["value"]
    req = soup.find("input", {"name": "RequestVerificationToken"})["value"]
    return csrf , req

def get_results(roll_number , csrf , req):
    post_url = f"http://results.nith.ac.in/scheme{roll_number[:2]}/studentresult/result.asp"
    data = {
        "RollNumber": roll_number,
        "CSRFToken": csrf,
        "RequestVerificationToken": req,
        "B1": "Submit"
    }
    response = requests.post(post_url, data=data)
    return response.text

def convert_to_schema(response):
    soup = BeautifulSoup(response, "lxml")
    rows = soup.find_all("tr")

    table_data = [
        [td.get_text(strip=True) for td in row.find_all("td")]
        for row in rows
    ]
    
    filtered_rows = []
    for row in table_data:
        if not row or row[0] == 'Regular Result' or 'Hamirpur' in row[0]:
            continue
        elif 'ROLL NUMBER' in row[0]:
            filtered_rows.append(row)
        elif len(row) in (1, 6):
            filtered_rows.append(row)

    student = {
        "student_info": {},
        "semesters": [],
        "year" : None
    }
    current_sem = None
    HEADERS = ["No", "Subject", "Code", "Credits", "Grade", "Marks"]
    for row in filtered_rows:
        if len(row) == 3 and "ROLL NUMBER" in row[0]:
            student["student_info"] = {
                "roll_number": row[0].replace("ROLL NUMBER", "").strip(),
                "student_name": row[1].replace("STUDENT NAME", "").strip(),
                "father_name": row[2].replace("FATHER NAME", "").strip()
            }
            student["year"] = int("20" + (row[0].replace("ROLL NUMBER", "").strip()[:2]))

        elif len(row) == 1 and row[0].startswith("Semester"):
            current_sem = row[0].split()[-1]   # S01, S02
            student["semesters"].append ({
                "semester_name": row[0],
                "subjects": []
            })

        elif len(row) == 6 and current_sem:
            course = dict(zip(HEADERS, row))
            student["semesters"][-1]["subjects"].append({
                "no": int(course["No"]),
                "subject": course["Subject"],
                "code": course["Code"],
                "credit": int(course["Credits"]),
                "grade": course["Grade"],
                "marks": int(course["Marks"])
            })
    semesters_list = []
    for sem in student["semesters"]:
        subjects_list = []
        for sub in sem["subjects"]:
            subjects_list.append(Subject(
                no=sub["no"],
                subject=sub["subject"],
                code=sub["code"],
                credit=sub["credit"],
                grade=sub["grade"],
                marks=sub["marks"]
            ))
        semesters_list.append(Semester(
            semester_name=sem["semester_name"],
            subjects=subjects_list
        ))
    
    student_obj = Student(
        student_info=StudentInfo(
            roll_number=student["student_info"]["roll_number"],
            student_name=student["student_info"]["student_name"],
            father_name=student["student_info"]["father_name"]
        ),
        semesters=semesters_list,
        year=student["year"]
    )
    return student_obj


def result_exists(roll_number):
    response = get_url_csrf(roll_number)
    csrf , req = get_csrf_req(response)
    resp = get_results(roll_number, csrf, req)
    if 'Roll number Problem' in resp:
        return False
    else:
        return True

def year_exists(year: str): 
    get_url = f"http://results.nith.ac.in/scheme{year[2:]}/studentresult/index.asp"
    r = requests.get(get_url)
    if 'Server Error' in r.text:
       return False
    else: 
        return True    

def get_years():
    years = []
    i = 20
    while(year_exists(str(i))):
        years.append(str(i))
        i+=1
    years.reverse()
    return years

def next_roll_number(roll_number: str, roll_over: int)  -> str:
    prefix = roll_number[:-3]          # "25BEC"
    number = int(roll_number[-3:])     # 030 → 30
    next_number = number + roll_over
    return f"{prefix}{next_number:03d}"

async def get_result_roll(roll_number, csrf , req):
    response = get_results(roll_number , csrf , req)

    if 'Roll number Problem' in response or 'Server Error' in response or 'UMC' in response:
        if result_exists(next_roll_number(roll_number, 1)) or result_exists(next_roll_number(roll_number, 2)) or result_exists(next_roll_number(roll_number, 3)):
            return "DROPOUT" 
        else:
            return False

    student = convert_to_schema(response)
    student.student_info.roll_number = student.student_info.roll_number.upper()

    for attempt in range(5):
        try:
            await Student.find_one(
                Student.student_info.roll_number == student.student_info.roll_number
            ).upsert(
                Set(student.model_dump(exclude={"id"})),
                on_insert=student,
            )
            break
        except Exception as e:
            if "AutoReconnect" in type(e).__name__ and attempt < 4:
                await asyncio.sleep(2)
                continue
            raise e
    return student


async def build_branch(year_prefix , branch_code, csrf, req):
    i = 1
    roll_number = year_prefix + branch_code +  "0" * (3-len(str(i))) + str(i)
    while(True):
        results = await get_result_roll(roll_number, csrf, req)
        if results == "DROPOUT":
            i+=1
            roll_number = year_prefix + branch_code +  "0" * (3-len(str(i))) + str(i)
            continue
        elif not results:
            break
        print(results.student_info.student_name, results.student_info.roll_number)
        i+=1
        roll_number = year_prefix + branch_code +  "0" * (3-len(str(i))) + str(i)
    roll_number = year_prefix + branch_code +  "0" * (3-len(str(i))) + str(i)

async def build_year(year, dual_only=False):
    await init_db(client["results"])
    branch_codes = ['BAR', 'BCE', 'BCH', 'BCS', 'BEC', 'BEE', 'BMA', 'BME', 'BMS', 'BPH', 'DCS', 'DEC']
    if dual_only == True:
        branch_codes = ['DCS', 'DEC']
    url = f"http://results.nith.ac.in/scheme{year[2:]}/studentresult/index.asp"
    response = requests.get(url).text
    csrf , req = get_csrf_req(response)
    tasks = []
    for branch in branch_codes:
        task = asyncio.create_task( build_branch(year[2:], branch, csrf , req))
        tasks.append(task)
    await asyncio.gather(*tasks)
    print("UPDATED ", year)

async def update_all():
    active_years = ['2021', '2022', '2023', '2024']
    for year in active_years:
        if year == '2021':
            await build_year(year, dual_only=True)
        else:
            await build_year(year)


if __name__ == '__main__':
    asyncio.run(update_all())
