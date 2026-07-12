import { Link } from 'react-router-dom';
import '../styles/header.css';
import Icon from './icon';
import ThemeToggle from './theme-toggle';

type HeaderProps = {
  backButton?: boolean;
  kicker?: string;
  title?: React.ReactNode;
  subtitle?: string;
};

function Header({ backButton = false, kicker, title, subtitle }: HeaderProps) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="header-section" role="banner">
      <div className="header-top-bar">
        {backButton ? (
          <Link to="/" className="at-a-glance" aria-label="Back to Home" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <Icon name="arrow_back" style={{ fontSize: '18px' }} />
            <span>Back to Results</span>
          </Link>
        ) : (
          <div className="at-a-glance" id="dateWidget" aria-label="Current date">
            <Icon name="calendar_today" style={{ fontSize: '18px' }} />
            <span>{dateStr}</span>
          </div>
        )}
        <ThemeToggle />
      </div>

      <div className="header-title-area">
        <div className="uni-supertitle">
          <Icon name={backButton ? 'info' : 'school'} style={{ fontSize: '18px' }} />
          {kicker || 'NIT Hamirpur'}
        </div>
        <h1 className="page-title" itemProp="name">
          {title || <>NIT Hamirpur Student <strong>Results</strong></>}
        </h1>
        <p className="uni-subtitle" itemProp="description">
          {subtitle || 'NIT Hamirpur B.Tech Results'}
        </p>
      </div>
    </header>
  );
}

export default Header;
