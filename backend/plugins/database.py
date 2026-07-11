from beanie import init_beanie
from .schema import Student
import re
_intialized = False
_cache = []

CHECK_ROLL_NUMBER = r"^\d{2}(?:BAR|BCE|BCH|BEC|BEE|BMA|BME|BMS|BPH|DCS|BCS|DEC)\d{3}$"
CHECK_IF_STARTS_WITH_NUM = r"^\d"

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


async def get_random(quanity: int = 10) -> list[Student]:
    # Aggregate function is used for custom pipeline
    top_10 = await Student.aggregate([{"$sample": {"size": quanity}}], projection_model=Student).to_list()
    return top_10
    
async def get_query(query):
    try:
        global _cache
        query_documents = []
        query = query.strip()
        if query == '':
            if _cache != []:
                query_documents = _cache
            else:
                query_documents = await Student.find_all().to_list()
                _cache = query_documents
        elif re.match(CHECK_ROLL_NUMBER, query):
            query_documents = await Student.find(Student.student_info.roll_number == query).to_list()
        else:
            # Partial Substring Matching Logic 
            query_documents = await Student.find(
                { 
                    "$or": [
                        {
                            "student_info.student_name": {
                                "$regex": re.escape(query),
                                "$options": "i",
                            }
                        },
                        {
                            "student_info.roll_number": {
                                "$regex": re.escape(query),
                                "$options": "i",
                            }
                        },
                    ]
                }
            ).to_list()
        return {"students" : query_documents}
    except Exception as e:
        return {"error" : str(e)}