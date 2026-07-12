import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Footer from '../components/footer';
import Header from '../components/header';
import LoadingOverlay from '../components/loading-overlay';
import Pagination from '../components/pagination';
import SearchPanel from '../components/search-panel';
import Seo from '../components/seo';
import Statistics from '../components/statistics';
import StudentGrid from '../components/student-grid';
import StudentResultsModal from '../components/student-results-modal';
import StudentCard from '../components/student-card';
import { fetchFeaturedStudents, searchStudents } from '../services/students';
import type { Student } from '../types/student';

const GRADE_POINTS: Record<string, number> = {
  AA: 10, 'A+': 10, O: 10, A: 10,
  AB: 9,
  BB: 8, B: 8,
  BC: 7, 'B-': 7,
  CC: 6, C: 6,
  CD: 5,
  D: 4,
  F: 0, I: 0
};

const BRANCH_CODES: Record<string, string> = {
  BAR: 'Architecture',
  BCE: 'Civil Engineering',
  BCH: 'Chemical Engineering',
  BEC: 'Electronics And Communication',
  BEE: 'Electrical Engineering',
  BMA: 'Mathematics And Computing',
  BME: 'Mechanical Engineering',
  BMS: 'Material Science',
  BPH: 'Engineering Physics',
  DCS: 'Dual Degree Computer Science',
  BCS: 'Computer Science',
  DEC: 'Dual Degree Electronics',
};

function calculateStudentGrades(student: Student) {
  let totalCredits = 0;
  let totalPoints = 0;
  let latestSgpa = 0;
  const sortedSems = [...student.semesters].sort((a, b) => a.semester_name.localeCompare(b.semester_name));
  
  sortedSems.forEach(sem => {
    let semCredits = 0;
    let semPoints = 0;
    sem.subjects.forEach(sub => {
      const cr = sub.credit;
      const gp = GRADE_POINTS[(sub.grade || '').toUpperCase()] ?? 0;
      semCredits += cr;
      semPoints += cr * gp;
    });
    if (semCredits > 0) {
      latestSgpa = semPoints / semCredits;
      totalCredits += semCredits;
      totalPoints += semPoints;
    }
  });

  const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { sgpa: latestSgpa, cgpa };
}

function parseRollNumber(roll: string) {
  const upperRoll = roll.toUpperCase();
  const match = upperRoll.match(/^\d{2}([A-Z]{3})\d+$/);
  const branchCode = match ? match[1] : 'UNK';
  const branchFull = BRANCH_CODES[branchCode] || branchCode;
  const yearShort = upperRoll.slice(0, 2);
  const admissionYear = parseInt(yearShort, 10);
  const batch = admissionYear ? String(2000 + admissionYear + 4) : 'Unknown';
  return { branchCode, branchFull, batch };
}

export type EnrichedStudent = Student & {
  computed: {
    branchCode: string;
    branchFull: string;
    batch: string;
    sgpa: number;
    cgpa: number;
    initials: string;
  };
};

function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rollParam = searchParams.get('roll');
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState(rollParam || '');
  const [debouncedQuery, setDebouncedQuery] = useState(rollParam || '');
  const [sortField, setSortField] = useState<'roll' | 'cgpa' | 'name'>('roll');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [branch, setBranch] = useState('All');
  const [batch, setBatch] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isOverlayLoading, setIsOverlayLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => setQuery(debouncedQuery), 250);
    return () => clearTimeout(handler);
  }, [debouncedQuery]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const queryTerm = query.trim();
        let data: Student[] = [];
        if (queryTerm === '' && branch === 'All' && batch === 'All') {
          data = await fetchFeaturedStudents(controller.signal);
        } else {
          data = await searchStudents(queryTerm, controller.signal);
        }

        if (active) {
          setStudents(data);
          setIsOverlayLoading(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && active) {
          setError(err.message || 'Unable to load results.');
          setIsOverlayLoading(false);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, branch, batch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, branch, batch, sortField, sortOrder]);

  const enrichedStudents = useMemo(() => {
    return students.map(student => {
      const roll = student.student_info.roll_number;
      const { branchCode, branchFull, batch: studentBatch } = parseRollNumber(roll);
      const { sgpa, cgpa } = calculateStudentGrades(student);
      return {
        ...student,
        computed: {
          branchCode,
          branchFull,
          batch: studentBatch,
          sgpa,
          cgpa,
          initials: student.student_info.student_name
            ? student.student_info.student_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '??'
        }
      };
    });
  }, [students]);

  useEffect(() => {
    if (rollParam && enrichedStudents.length > 0) {
      const match = enrichedStudents.find(
        s => s.student_info.roll_number.toLowerCase() === rollParam.toLowerCase()
      );
      if (match) {
        setSelectedStudent(match);
        setIsModalOpen(true);
      }
    }
  }, [rollParam, enrichedStudents]);

  const filteredAndSorted = useMemo(() => {
    const filtered = enrichedStudents.filter(s => {
      const branchMatch = branch === 'All' || s.computed.branchCode === branch;
      const batchMatch = batch === 'All' || s.computed.batch === batch;
      return branchMatch && batchMatch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'cgpa') {
        comparison = a.computed.cgpa - b.computed.cgpa;
        if (comparison === 0) comparison = a.student_info.roll_number.localeCompare(b.student_info.roll_number);
      } else if (sortField === 'name') {
        comparison = a.student_info.student_name.localeCompare(b.student_info.student_name);
        if (comparison === 0) comparison = a.student_info.roll_number.localeCompare(b.student_info.roll_number);
      } else {
        comparison = a.student_info.roll_number.localeCompare(b.student_info.roll_number);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [enrichedStudents, branch, batch, sortField, sortOrder]);

  const stats = useMemo(() => {
    const total = filteredAndSorted.length;
    const avg = total > 0 ? filteredAndSorted.reduce((sum, s) => sum + s.computed.cgpa, 0) / total : 0;
    const top = total > 0 ? [...filteredAndSorted].sort((a, b) => b.computed.cgpa - a.computed.cgpa || a.student_info.roll_number.localeCompare(b.student_info.roll_number))[0] : null;
    return {
      total: String(total),
      avg: avg.toFixed(2),
      top: top ? top.student_info.student_name : '-'
    };
  }, [filteredAndSorted]);

  const totalPages = Math.ceil(filteredAndSorted.length / 20);
  const startIndex = (currentPage - 1) * 20;
  const paginatedStudents = filteredAndSorted.slice(startIndex, startIndex + 20);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (window.scrollY > 200) {
      document.querySelector('.filter-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getHintMessage = () => {
    if (query === '' && branch === 'All' && batch === 'All') return 'Showing sample student results. Use filters or search to browse more.';
    return '';
  };

  return (
    <div className="app-container" itemScope itemType="https://schema.org/WebPage">
      <Seo
        title="NITH Results | NIT Hamirpur Student Results Portal"
        description="Check NIT Hamirpur student results, SGPA, CGPA, rankings, and analytics. Unofficial portal for B.Tech and Dual Degree programs."
        path="/"
        roll={rollParam || undefined}
      />
      <LoadingOverlay visible={isOverlayLoading} />
      <a className="skip-link" href="#main-content">Skip to results</a>
      <Header />
      <main id="main-content">
        <SearchPanel
          query={debouncedQuery}
          onQueryChange={setDebouncedQuery}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          branch={branch}
          onBranchChange={setBranch}
          batch={batch}
          onBatchChange={setBatch}
          isLoading={isLoading}
          hint={getHintMessage()}
        />
        <Statistics
          totalStudents={stats.total}
          averageCgpa={stats.avg}
          topPerformer={stats.top}
        />
        <StudentGrid
          isLoading={isLoading}
          error={error}
          totalResults={filteredAndSorted.length}
          searchTerm={query}
          emptyMessage="No students found matching your criteria."
        >
          {paginatedStudents.map((s, index) => (
            <StudentCard
              key={s.student_info.roll_number}
              name={s.student_info.student_name}
              rollNumber={s.student_info.roll_number}
              branch={s.computed.branchCode}
              batch={s.computed.batch}
              initials={s.computed.initials}
              cgpa={s.computed.cgpa.toFixed(2)}
              sgpa={s.computed.sgpa.toFixed(2)}
              rank={startIndex + index + 1}
              onClick={() => {
                setSelectedStudent(s);
                setIsModalOpen(true);
                setSearchParams({ roll: s.student_info.roll_number }, { replace: true });
              }}
            />
          ))}
        </StudentGrid>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>
      <Footer />
      <StudentResultsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
          if (searchParams.has('roll')) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('roll');
            setSearchParams(newParams, { replace: true });
          }
        }}
        student={selectedStudent}
        branchName={selectedStudent ? selectedStudent.computed.branchFull : ''}
      />
    </div>
  );
}

export default Home;
