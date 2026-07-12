import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import type { Student } from '../types/student';
import Icon from './icon';
import '../styles/student-results-modal.css';

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

type StudentResultsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  student: EnrichedStudent | null;
  branchName: string;
};

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

function toRoman(num: number): string {
  const lookup: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  let n = num;
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i;
      n -= lookup[i];
    }
  }
  return roman;
}

function getSemesterDisplayName(semName: string): string {
  const match = semName.match(/S(\d+)/i);
  return match && match[1] ? `Sem ${toRoman(parseInt(match[1], 10))}` : semName;
}

function StudentResultsModal({ isOpen, onClose, student, branchName }: StudentResultsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [activeSemIndex, setActiveSemIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!student) return;
    const shareUrl = `${window.location.origin}/?roll=${student.student_info.roll_number}`;
    const shareData = {
      title: `${student.student_info.student_name}'s Results`,
      text: `Check out semester results, SGPA, and CGPA for ${student.student_info.student_name} (${student.student_info.roll_number}) on NITH Results Portal:`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch((err) => {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      });
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      document.documentElement.classList.add('modal-open');
      setActiveSemIndex(0);
    } else {
      dialog.close();
      document.documentElement.classList.remove('modal-open');
    }
    return () => { document.documentElement.classList.remove('modal-open'); };
  }, [isOpen]);

  const semesters = [...(student?.semesters || [])].sort((a, b) => a.semester_name.localeCompare(b.semester_name));

  let cumulativePoints = 0;
  let cumulativeCredits = 0;

  const processedSemesters = semesters.map((sem) => {
    let semCredits = 0;
    let semPoints = 0;
    const subjects = sem.subjects.map((sub) => {
      const credits = sub.credit;
      const gp = GRADE_POINTS[sub.grade.toUpperCase()] ?? 0;
      const pts = credits * gp;
      semCredits += credits;
      semPoints += pts;
      return { ...sub, gp, pts };
    });

    const sgpi = semCredits > 0 ? semPoints / semCredits : 0;
    cumulativeCredits += semCredits;
    cumulativePoints += semPoints;
    const cgpa = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

    return {
      semester_name: sem.semester_name,
      displayName: getSemesterDisplayName(sem.semester_name),
      subjects,
      sgpi: sgpi.toFixed(2),
      cgpa: cgpa.toFixed(2),
      semCredits,
    };
  });

  const chartLabels = processedSemesters.map(s => s.displayName);
  const chartSGPA = processedSemesters.map(s => parseFloat(s.sgpi));
  const chartCGPA = processedSemesters.map(s => parseFloat(s.cgpa));

  useEffect(() => {
    if (!isOpen || !canvasRef.current || chartLabels.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const renderChart = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const style = getComputedStyle(document.body);
      const primary = style.getPropertyValue('--md-sys-color-primary').trim() || '#006d42';
      const tertiary = style.getPropertyValue('--md-sys-color-tertiary').trim() || '#386666';
      const surface = style.getPropertyValue('--md-sys-color-surface').trim() || '#f5fbf6';
      const onSurface = style.getPropertyValue('--md-sys-color-on-surface').trim() || '#171d19';
      const isDark = document.documentElement.dataset.theme === 'dark';
      const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

      const sgpaGradient = ctx.createLinearGradient(0, 0, 0, 220);
      sgpaGradient.addColorStop(0, isDark ? 'rgba(160, 207, 208, 0.25)' : 'rgba(56, 102, 102, 0.15)');
      sgpaGradient.addColorStop(1, 'transparent');

      const cgpaGradient = ctx.createLinearGradient(0, 0, 0, 220);
      cgpaGradient.addColorStop(0, isDark ? 'rgba(154, 246, 183, 0.25)' : 'rgba(0, 109, 66, 0.12)');
      cgpaGradient.addColorStop(1, 'transparent');

      const allValues = [...chartSGPA, ...chartCGPA];
      let yMin = allValues.length > 0 ? Math.floor(Math.min(...allValues)) - 1 : 0;
      yMin = Math.max(yMin, 0);

      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'SGPA',
              data: chartSGPA,
              borderColor: tertiary,
              backgroundColor: sgpaGradient,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: surface,
              pointBorderColor: tertiary,
              pointBorderWidth: 2,
              fill: true,
            },
            {
              label: 'CGPA',
              data: chartCGPA,
              borderColor: primary,
              backgroundColor: cgpaGradient,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 5,
              pointBackgroundColor: surface,
              pointBorderColor: primary,
              pointBorderWidth: 2,
              fill: true,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: {
              min: yMin,
              max: 10,
              grid: { color: gridColor },
              ticks: { stepSize: 1, color: onSurface, font: { family: 'Outfit, sans-serif' } }
            },
            x: {
              grid: { display: false },
              ticks: { color: onSurface, font: { family: 'Outfit, sans-serif' } }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { usePointStyle: true, color: onSurface, font: { family: 'Outfit, sans-serif' } }
            }
          }
        }
      });
    };

    renderChart();

    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle?.addEventListener('click', renderChart);

    return () => {
      themeToggle?.removeEventListener('click', renderChart);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, student]);

  if (!student) return null;

  const currentSem = processedSemesters[activeSemIndex];

  return (
    <dialog
      ref={dialogRef}
      className="student-results-modal"
      aria-labelledby="student-results-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <header className="student-results-modal__header">
        <div>
          <p className="section-kicker">Student result</p>
          <h2 id="student-results-modal-title">{student.student_info.student_name}</h2>
          <p>{student.student_info.roll_number}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="student-results-modal__share" 
            type="button" 
            aria-label="Share student results link" 
            onClick={handleShare}
            style={{ border: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-primary)', fontSize: '0.8rem', fontWeight: '700' }}
          >
            <Icon name={copied ? 'check' : 'share'} style={{ fontSize: '16px' }} />
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button className="student-results-modal__close" type="button" aria-label="Close modal dialog" onClick={onClose} style={{ border: '0', cursor: 'pointer' }}>
            <Icon name="close" />
          </button>
        </div>
      </header>

      <div className="student-results-modal__body">
        <div className="student-results-modal__info">
          <p><span>Branch</span>{branchName}</p>
          <p><span>Batch</span>{student.year + 4}</p>
          <p><span>Academic Year</span>{student.year}</p>
          <p><span>Roll Number</span>{student.student_info.roll_number}</p>
        </div>

        {processedSemesters.length > 0 ? (
          <>
            <div className="semester-tabs" aria-label="Semester result tabs">
              {processedSemesters.map((sem, index) => (
                <button
                  key={sem.semester_name}
                  className={`semester-tabs__tab ${index === activeSemIndex ? 'semester-tabs__tab--current' : ''}`}
                  type="button"
                  onClick={() => setActiveSemIndex(index)}
                  style={{ border: '0', cursor: 'pointer' }}
                >
                  {sem.displayName}
                </button>
              ))}
            </div>

            {chartLabels.length > 0 ? (
              <div className="graph-container">
                <canvas ref={canvasRef}></canvas>
              </div>
            ) : null}

            {currentSem ? (
              <>
                <div className="result-table-wrapper">
                  <table className="result-table">
                    <caption className="visually-hidden">{currentSem.displayName} result preview</caption>
                    <thead>
                      <tr>
                        <th scope="col">Code</th>
                        <th scope="col">Subject</th>
                        <th scope="col">Cr.</th>
                        <th scope="col">Grade</th>
                        <th scope="col" style={{ textAlign: 'center' }}>Pts</th>
                        <th scope="col" style={{ textAlign: 'right' }}>Cr.Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSem.subjects.map((sub) => (
                        <tr key={sub.code}>
                          <td style={{ color: 'var(--md-sys-color-outline)', fontWeight: 500 }}>{sub.code}</td>
                          <td style={{ fontWeight: 500 }}>{sub.subject}</td>
                          <td>{sub.credit}</td>
                          <td><span className={`grade-tag ${sub.grade.toUpperCase()}`}>{sub.grade}</span></td>
                          <td style={{ textAlign: 'center', fontWeight: 500, opacity: 0.8 }}>{sub.gp}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{sub.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="result-summary">
                  <span><small>Semester SGPA</small>{currentSem.sgpi}</span>
                  <span><small>Cumulative CGPA</small>{currentSem.cgpa}</span>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <span className="material-symbols-rounded empty-icon">info</span>
            <p>No semester records are available for this student.</p>
          </div>
        )}
      </div>
    </dialog>
  );
}

export default StudentResultsModal;
