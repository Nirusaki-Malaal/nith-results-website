# Contains Schema of The Student

from beanie import Document
from pydantic import BaseModel
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel
# Student Document Schema

class Subject(BaseModel):
    no: int
    subject: str
    code: str
    credit: int
    grade: str
    marks: int

class Semester(BaseModel):
    semester_name : str
    subjects : list[Subject]

class StudentInfo(BaseModel):
    student_name : str
    roll_number : str
    father_name : str

class Student(Document):
    student_info : StudentInfo
    semesters: list[Semester]
    year : int
    degree: str
    branch: str
    cgpa: float
    sgpa: float


    class Settings:
        name = "Student" # Collection Name in Database
        indexes = [
            # Text-Index (Tokenized Search)
            IndexModel([("student_info.student_name", ASCENDING)], name="student_name_1"),
            # Compound Index Performs Better (Much Better)
            IndexModel(
                [
                    ("year" , DESCENDING),
                    ("degree", ASCENDING),
                    ("branch", ASCENDING),
                    ("student_info.roll_number" , ASCENDING)
                ]
            )
        ]
