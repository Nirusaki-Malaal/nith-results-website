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

    class Settings:
        name = "Student" # Collection Name in Database
        indexes = [
            IndexModel(
                [("student_info.student_name", TEXT)],
                name="student_info.student_name_text",
            ), # Text-Index (Tokenized Search)
            IndexModel(
                [("student_info.roll_number", DESCENDING)],
                name="student_info.roll_number_-1",
                unique=True,
            ), # Single Field Index (Binary Search Tree)
            # IndexModel(
            #     [
            #         ("student_info.student_name", ASCENDING),
            #         ("student_info.roll_number", DESCENDING),
            #     ],
            #     name="student_name_1_roll_number_desc",
            # ), # Compound Index
        ]
