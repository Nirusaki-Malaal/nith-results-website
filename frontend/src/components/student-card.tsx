import type { MouseEvent } from 'react';
import '../styles/student-card.css';

export type StudentCardProps = {
  name: string;
  rollNumber: string;
  branch: string;
  batch: string;
  initials: string;
  cgpa: string;
  sgpa: string;
  rank?: number;
  onClick?: () => void;
};

function StudentCard({
  name,
  rollNumber,
  branch,
  batch,
  initials,
  cgpa,
  sgpa,
  rank,
  onClick,
}: StudentCardProps) {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 600) return;
    const card = e.currentTarget;
    card.style.transition = 'none';
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  };

  return (
    <article
      className="student-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.())}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="student-card__topline">
        {rank ? <span className={`rank-badge rank-badge--${rank}`}>#{rank}</span> : <span />}
        <div className="student-card__badges">
          <span className="branch-badge">{branch}</span>
          <span className="batch-badge">{batch}</span>
        </div>
      </div>

      <div className="student-card__avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="student-card__identity">
        <h3>{name}</h3>
        <p>{rollNumber}</p>
      </div>

      <div className="student-card__scores" aria-label={`${name}'s result preview`}>
        <div>
          <strong>{cgpa}</strong>
          <span>CGPA</span>
        </div>
        <div>
          <strong>{sgpa}</strong>
          <span>SGPA</span>
        </div>
      </div>
    </article>
  );
}

export default StudentCard;
