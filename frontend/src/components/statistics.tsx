import '../styles/statistics.css';
import Icon from './icon';

type StatisticProps = {
  icon: string;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'tertiary';
  compact?: boolean;
};

function Statistic({ icon, label, value, tone, compact = false }: StatisticProps) {
  return (
    <article className={`statistic statistic--${tone}`}>
      <Icon name={icon} className="statistic__icon" />
      <p className="statistic__label">{label}</p>
      <p className={`statistic__value${compact ? ' statistic__value--compact' : ''}`}>{value}</p>
    </article>
  );
}

type StatisticsProps = {
  totalStudents: string;
  averageCgpa: string;
  topPerformer: string;
};

function Statistics({ totalStudents, averageCgpa, topPerformer }: StatisticsProps) {
  return (
    <section className="statistics" aria-label="Result statistics preview">
      <Statistic icon="groups" label="Total students" value={totalStudents} tone="primary" />
      <Statistic icon="analytics" label="Average CGPA" value={averageCgpa} tone="secondary" />
      <Statistic icon="workspace_premium" label="Top performer" value={topPerformer} tone="tertiary" compact />
    </section>
  );
}

export default Statistics;
