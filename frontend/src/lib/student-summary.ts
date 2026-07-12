import type { Student, Subject } from '../types/student';

const gradePoints: Record<string, number> = {
  AA: 10,
  A: 10,
  AB: 9,
  B: 8,
  BB: 8,
  BC: 7,
  C: 6,
  CC: 6,
  CD: 5,
  D: 4,
  DD: 4,
  F: 0,
};

export type StudentSummary = {
  name: string;
  rollNumber: string;
  branch: string;
  batch: string;
  initials: string;
  cgpa: string;
  sgpa: string;
  cgpaValue: number | null;
};

type ResultStatistics = {
  totalStudents: string;
  averageCgpa: string;
  topPerformer: string;
};

function calculateGpa(subjects: Subject[]) {
  const scoredSubjects = subjects.filter((subject) => {
    return subject.credit > 0 && gradePoints[subject.grade.trim().toUpperCase()] !== undefined;
  });

  const totalCredits = scoredSubjects.reduce((sum, subject) => sum + subject.credit, 0);
  if (totalCredits === 0) return null;

  const totalPoints = scoredSubjects.reduce((sum, subject) => {
    const grade = subject.grade.trim().toUpperCase();
    return sum + subject.credit * gradePoints[grade];
  }, 0);

  return totalPoints / totalCredits;
}

function formatGpa(value: number | null) {
  return value === null ? '—' : value.toFixed(2);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ST';
}

function getBranch(rollNumber: string) {
  return rollNumber.match(/^\d{2}([A-Z]{3})\d{3}$/)?.[1] ?? 'NITH';
}

export function summarizeStudent(student: Student): StudentSummary {
  const latestSemester = student.semesters.at(-1);
  const cgpaValue = calculateGpa(student.semesters.flatMap((semester) => semester.subjects));
  const sgpaValue = latestSemester ? calculateGpa(latestSemester.subjects) : null;

  return {
    name: student.student_info.student_name,
    rollNumber: student.student_info.roll_number,
    branch: getBranch(student.student_info.roll_number),
    batch: String(student.year),
    initials: getInitials(student.student_info.student_name),
    cgpa: formatGpa(cgpaValue),
    sgpa: formatGpa(sgpaValue),
    cgpaValue,
  };
}

export function getResultStatistics(students: StudentSummary[]): ResultStatistics {
  const scoredStudents = students.filter(
    (student): student is StudentSummary & { cgpaValue: number } => student.cgpaValue !== null,
  );
  const totalCgpa = scoredStudents.reduce((sum, student) => sum + student.cgpaValue, 0);
  const topStudent = scoredStudents.reduce<StudentSummary | undefined>((top, student) => {
    return !top || student.cgpaValue > (top.cgpaValue ?? 0) ? student : top;
  }, undefined);

  return {
    totalStudents: students.length.toLocaleString('en-IN'),
    averageCgpa: scoredStudents.length ? (totalCgpa / scoredStudents.length).toFixed(2) : '—',
    topPerformer: topStudent?.name ?? '—',
  };
}
