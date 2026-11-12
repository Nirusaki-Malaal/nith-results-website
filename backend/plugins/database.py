from beanie import init_beanie
from .schema import Student
import re
_intialized = False
_cache = []

CHECK_ROLL_NUMBER = r"^\d{2}(?:BAR|BCE|BCH|BEC|BEE|BMA|BME|BMS|BPH|DCS|BCS|DEC)\d{3}$"
CHECK_IF_STARTS_WITH_NUM = r"^\d"
VALID_YEARS = {"25" , "24", "23", "22", "21", "20"}
ROLL_TREE = {
    "B": {"AR", "CE", "CH", "CS", "EC", "EE", "MA", "ME", "MS", "PH"},
    "D": {"CS", "EC"},
}

async def init_db(database_object) -> None:
    global _intialized
    if _intialized: # Warm Start
        return
    # Cold Startup
    await init_beanie(
        database=database_object,
        document_models=[Student]
    )
    _intialized = True


async def tree_validator(roll: str) -> dict | None:
    roll = roll.upper()
    roll_dict = {}
    if len(roll) > 8:
        return None
    if not roll: return None

    if roll[0].isdigit() and roll[0] != "2":
        return None

    if len(roll) > 1 and roll[:2] in VALID_YEARS:
        roll_dict["year"] = 2000 + int(roll[:2])
    else:
        return None
    if len(roll) < 3:
        return roll_dict

    if roll[2] in ROLL_TREE: ## 22B
        roll_dict["degree"] = roll[2]
    else:
        return None ## there
    if len(roll) < 4:
        return roll_dict
   # 22BEC 23BE so this is pretty good i guess
    branch = roll[3:5] # BE
    if branch in ROLL_TREE[roll_dict["degree"]]:
        roll_dict["possible_branches"] = [branch]
    else:
        roll_dict["possible_branches"] = [item for item in ROLL_TREE[roll_dict["degree"]] if item.startswith(branch)]

    if not roll_dict["possible_branches"]:
        return None
    if len(roll) < 6:  ## 25BEC
        return roll_dict

    roll_dict["roll_no"] = roll[5:]
    if not roll[5:].isdigit(): return None
    return roll_dict


async def search_roll_tree(query: str) -> list[Student]:
    parsed = await tree_validator(query)
    if parsed is None:
        return []

    mongo_filter = {"year": parsed["year"]}
    if "degree" in parsed:
        mongo_filter["degree"] = parsed["degree"]

    if "possible_branches" in parsed:
        branches = parsed["possible_branches"]
        mongo_filter["branch"] = branches[0] if len(branches) == 1 else {"$in": branches}

    if "roll_no" in parsed:
        prefix = f"{parsed['year'] % 100:02d}{parsed['degree']}{parsed['possible_branches'][0]}{parsed['roll_no']}"
        if len(parsed["roll_no"]) == 3:
            mongo_filter["student_info.roll_number"] = prefix
        else:
            upper = prefix[:-1] + chr(ord(prefix[-1]) + 1)
            mongo_filter["student_info.roll_number"] = {"$gte": prefix, "$lt": upper}

    return await (
        Student.find(mongo_filter)
        .sort(("student_info.roll_number", 1))
        .to_list()
    )

async def search_by_name(query: str) -> list[Student]:
    q = query.upper()
    if not q:
        return []
    upper = q[:-1] + chr(ord(q[-1]) + 1)
    return await (
        Student.find({"student_info.student_name": {"$gte": q, "$lt": upper}})
        .sort(("student_info.student_name", 1))
        .to_list()
    )

async def get_query(query):
    try:
        global _cache
        query_documents = []
        query = query.strip()
        # Empty Query Handling (Returns Every piece of data)
        if query == '':
            if _cache != []:
                query_documents = _cache
            else:
                query_documents = await Student.find_all().to_list()
                _cache = query_documents
        elif re.match(CHECK_IF_STARTS_WITH_NUM, query):
            query_documents = await search_roll_tree(query)
        else:
            query_documents = await search_by_name(query)
        return {"students" : query_documents}
    except Exception as e:
        return {"error" : str(e)}
