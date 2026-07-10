from beanie import Document, Indexed, init_beanie
from pydantic import BaseModel

from pymongo import AsyncMongoClient



class StudentInfo(BaseModel):
    name : str
    roll_number : str
    father_name : str

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

class Student(Document):
    student_info : StudentInfo
    semesters: list[Semester]
    year : int
