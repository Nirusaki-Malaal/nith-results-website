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

export type StudentSummary = {
  student_info: {
    student_name: string;
    roll_number: string;
    father_name: string;
  };
  year: number;
  degree?: string;
  branch?: string;
  cgpa: number;
  sgpa: number;
};

export type Student = StudentSummary & {
  _id?: string;
  semesters: Semester[];
};
