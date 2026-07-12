export type Subject = {
  no: number;
  subject: string;
  code: string;
  credit: number;
  grade: string;
  marks: number;
};

export type Semester = {
  semester_name: string;
  subjects: Subject[];
};

export type Student = {
  _id?: string;
  student_info: {
    student_name: string;
    roll_number: string;
    father_name: string;
  };
  semesters: Semester[];
  year: number;
};
