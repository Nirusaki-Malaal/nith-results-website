# Contains Schema of The Student

from beanie import Document
from pydantic import BaseModel

# Student Document Schema
class Student(Document):
    student_info : StudentInfo
    semesters: list[Semester]
    year : int

# Student Info Schema
class StudentInfo(BaseModel):
    name : str
    roll_number : str
    father_name : str

# Subject Schema
class Subject(BaseModel):
    no: int
    subject: str
    code: str
    credit: int
    grade: str
    marks: int

# Semester Schema
class Semester(BaseModel):
    semester_name : str
    subjects : list[Subject]


