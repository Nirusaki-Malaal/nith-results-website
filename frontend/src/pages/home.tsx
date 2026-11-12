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
import StudentResultsModal, { type EnrichedStudent } from '../components/student-results-modal';
import StudentCard from '../components/student-card';
import { fetchSummaries, fetchStudentDetail } from '../services/students';
import type { Student, StudentSummary } from '../types/student';

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

function enrichSummary(student: StudentSummary): EnrichedStudent {
  const roll = student.student_info.roll_number;
  const parsed = parseRollNumber(roll);
  const branchCode = student.branch ? `${student.degree || 'B'}${student.branch}` : parsed.branchCode;
  const branchFull = BRANCH_CODES[branchCode] || parsed.branchFull;
  const batch = student.year ? String(student.year + 4) : parsed.batch;
  const initials = student.student_info.student_name
    ? student.student_info.student_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return {
    ...student,
    computed: {
      branchCode,
      branchFull,
      batch,
      sgpa: student.sgpa ?? 0,
      cgpa: student.cgpa ?? 0,
      initials,
    },
  };
}

function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rollParam = searchParams.get('roll');
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [studentDetails, setStudentDetails] = useState<Record<string, Student>>({});
  const [failedDetailRolls, setFailedDetailRolls] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState(rollParam || '');
  const [debouncedQuery, setDebouncedQuery] = useState(rollParam || '');
  const [sortField, setSortField] = useState<'roll' | 'cgpa' | 'name'>('roll');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [branch, setBranch] = useState('All');
  const [batch, setBatch] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isOverlayLoading, setIsOverlayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery(debouncedQuery);
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(handler);
  }, [debouncedQuery]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadSummaries() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSummaries(controller.signal);
        if (active) {
          setSummaries(data);
          setIsOverlayLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (active) {
          const message = err instanceof Error ? err.message : 'Unable to load results.';
          setError(message);
          setIsOverlayLoading(false);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadSummaries();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const enrichedStudents = useMemo(() => {
    return summaries.map(enrichSummary);
  }, [summaries]);

  const activeRoll = rollParam ? rollParam.trim().toUpperCase() : null;

  useEffect(() => {
    if (!activeRoll || studentDetails[activeRoll] || failedDetailRolls[activeRoll]) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    fetchStudentDetail(activeRoll, controller.signal)
      .then((detail) => {
        if (!active) return;
        setStudentDetails((prev) => ({ ...prev, [activeRoll]: detail }));
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (active) {
          setFailedDetailRolls((prev) => ({ ...prev, [activeRoll]: true }));
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeRoll, studentDetails, failedDetailRolls]);

  const selectedStudent = useMemo<EnrichedStudent | null>(() => {
    if (!activeRoll) return null;
    const summaryMatch = enrichedStudents.find(
      s => s.student_info.roll_number.toUpperCase() === activeRoll
    );
    const detail = studentDetails[activeRoll];
    if (summaryMatch) {
      return detail ? { ...summaryMatch, semesters: detail.semesters } : summaryMatch;
    }
    if (detail) {
      return { ...enrichSummary(detail), semesters: detail.semesters };
    }
    return null;
  }, [activeRoll, enrichedStudents, studentDetails]);

  const isModalOpen = selectedStudent !== null;
  const isLoadingDetails = Boolean(
    activeRoll && selectedStudent && !selectedStudent.semesters && !failedDetailRolls[activeRoll]
  );

  const filteredAndSorted = useMemo(() => {
    const queryTerm = query.trim().toUpperCase();
    if (queryTerm === '' && branch === 'All' && batch === 'All') {
      return [];
    }

    const filtered = enrichedStudents.filter(s => {
      const branchMatch = branch === 'All' || s.computed.branchCode === branch;
      const batchMatch = batch === 'All' || s.computed.batch === batch;
      if (!branchMatch || !batchMatch) return false;
      if (!queryTerm) return true;
      return (
        s.student_info.roll_number.toUpperCase().includes(queryTerm) ||
        s.student_info.student_name.toUpperCase().includes(queryTerm)
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison: number;
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
  }, [enrichedStudents, query, branch, batch, sortField, sortOrder]);

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
    if (query === '' && branch === 'All' && batch === 'All') return 'Search a query by student name or roll number to view results.';
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
          onSortFieldChange={(val) => {
            setSortField(val);
            setCurrentPage(1);
          }}
          sortOrder={sortOrder}
          onSortOrderChange={(val) => {
            setSortOrder(val);
            setCurrentPage(1);
          }}
          branch={branch}
          onBranchChange={(val) => {
            setBranch(val);
            setCurrentPage(1);
          }}
          batch={batch}
          onBatchChange={(val) => {
            setBatch(val);
            setCurrentPage(1);
          }}
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
          emptyMessage={
            query.trim() === '' && branch === 'All' && batch === 'All'
              ? 'Search a query to view student results.'
              : 'No students found matching your criteria.'
          }
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
          if (searchParams.has('roll')) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('roll');
            setSearchParams(newParams, { replace: true });
          }
        }}
        student={selectedStudent}
        branchName={selectedStudent ? selectedStudent.computed.branchFull : ''}
        isLoadingDetails={isLoadingDetails}
      />
    </div>
  );
}

export default Home;
