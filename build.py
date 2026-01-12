from pymongo import MongoClient
from bs4 import BeautifulSoup
import requests
import time
def next_roll_number(roll, num):
    prefix = roll[:-3]          # "25BEC"
    number = int(roll[-3:])     # 030 → 30
    next_number = number + num
    return f"{prefix}{next_number:03d}"

def result(rollnumber: str):
    session = requests.Session()
    get_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/index.asp"
    r = session.get(get_url)

    soup = BeautifulSoup(r.text, "lxml")
    csrf = soup.find("input", {"name": "CSRFToken"})["value"]
    req = soup.find("input", {"name": "RequestVerificationToken"})["value"]

    post_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/result.asp"
    data = {
        "RollNumber": rollnumber,
        "CSRFToken": csrf,
        "RequestVerificationToken": req,
        "B1": "Submit"
    }

    response = session.post(post_url, data=data)
    html2 = response.text
    if 'Roll number Problem' in html2 or 'Server Error' in html2 or 'UMC' in html2:
        if result_exists(next_roll_number(rollnumber, 1)) or result_exists(next_roll_number(rollnumber, 2)) or result_exists(next_roll_number(rollnumber, 3)):
            return "DROPOUT" 
        else:
            return False

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
            current_sem = row[0].split()[-1]   # S01, S02
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

    return final_result

def result_exists(rollnumber):
    session = requests.Session()
    get_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/index.asp"
    r = session.get(get_url)

    soup = BeautifulSoup(r.text, "lxml")
    csrf = soup.find("input", {"name": "CSRFToken"})["value"]
    req = soup.find("input", {"name": "RequestVerificationToken"})["value"]

    post_url = f"http://results.nith.ac.in/scheme{rollnumber[:2]}/studentresult/result.asp"
    data = {
        "RollNumber": rollnumber,
        "CSRFToken": csrf,
        "RequestVerificationToken": req,
        "B1": "Submit"
    }

    response = session.post(post_url, data=data)
    html2 = response.text
    if 'Roll number Problem' in html2:
        return False
    else:
        return True


url = 'mongodb+srv://nirusaki:nirusaki@cluster0.rrdouxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
cluster = MongoClient(url)
db = cluster["results"]
def year_exists(year: str): 
    session = requests.Session()
    get_url = f"http://results.nith.ac.in/scheme{year}/studentresult/index.asp"
    r = session.get(get_url)
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
    return years  # [20, 21 ,22 ,23 ,24 ,25]

def make_collections():
    collections = {}
    years = get_years()
    for i in years:
        collections[i] = db['20' + i]
    return collections

def fetch_with_retry(result, rollnumber,retries=3, delay=2, backoff=2):
    """
    func  → function to retry (result_to_json)
    retries → number of retries
    delay → initial delay (seconds)
    backoff → multiplier for delay
    """
    for attempt in range(1, retries + 1):
        try:
            return result(rollnumber)
        except requests.exceptions.RequestException as e:
            print(f"🌐 Network error (attempt {attempt}/{retries}): {e}")
        except Exception as e:
            print(f"⚠️ Error (attempt {attempt}/{retries}): {e}")

        if attempt < retries:
            time.sleep(delay)
            delay *= backoff

    return None


c_dict = make_collections()
def build():
    branch_codes = ['BAR', 'BCE', 'BCH', 'BCS', 'BEC', 'BEE', 'BMA', 'BME', 'BMS', 'BPH', 'DCS', 'DEC']
    for year in ['21','20']:
       print("Starting Year 20" + year)
       for branch in branch_codes:
          print("Starting " + branch)
          j=1
          rollnumber = year + branch +  "0" * (3-len(str(j))) + str(j)
          while(True):
             results = fetch_with_retry(rollnumber=rollnumber, result=result)
             if results == "DROPOUT":
                 j+=1
                 rollnumber = year + branch +  "0" * (3-len(str(j))) + str(j)
                 continue
             elif not results:
                 break
             c_dict[year].update_one({"student_info.roll_number": rollnumber},{"$setOnInsert": results},upsert=True)
             print(results['student_info']['student_name'])
             j+=1
             rollnumber = year + branch +  "0" * (3-len(str(j))) + str(j)
           

build()


