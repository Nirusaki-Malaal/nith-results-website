import Footer from '../components/footer';
import Header from '../components/header';
import Seo from '../components/seo';

function About() {
  return (
    <div className="app-container" itemScope itemType="https://schema.org/WebPage">
      <Seo
        title="About NITH Results"
        description="Learn about NITH Results — the unofficial NIT Hamirpur student results portal. Features, available branches, technology stack and our mission to make result checking seamless."
        path="/about"
      />
      <Header
        backButton
        kicker="About Us"
        title={<>About <strong>NITH Results</strong></>}
        subtitle="Learn more about our mission and services"
      />
      <main id="main-content" className="content-page" style={{ padding: '0 var(--page-gutter)' }}>
        <article className="content-card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', borderRadius: 'var(--radius-xl)', background: 'var(--card-bg)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>What is NITH Results?</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>NITH Results (nithresults.xyz) is an unofficial result portal designed specifically for students of the National Institute of Technology Hamirpur (NIT Hamirpur). Our platform provides a faster, more user-friendly way to access examination results compared to the official portal.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Mission</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>We believe that students deserve easy and quick access to their academic results. Our mission is to provide NIT Hamirpur students with a modern, responsive, and feature-rich platform that makes checking results a seamless experience.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Key Features</h2>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li><strong>Instant Result Lookup:</strong> Search by roll number or student name to find results instantly</li>
            <li><strong>SGPA/CGPA Calculator:</strong> Automatic calculation of Semester and Cumulative Grade Point Averages</li>
            <li><strong>Branch-wise Filtering:</strong> Filter results by department (CSE, ECE, Mechanical, Civil, etc.)</li>
            <li><strong>Batch-wise Filtering:</strong> View results for specific graduation batches</li>
            <li><strong>Performance Analytics:</strong> Visual graphs showing semester-wise performance trends</li>
            <li><strong>Toppers List:</strong> Identify top performers in each branch and batch</li>
            <li><strong>Dark Mode:</strong> Easy on the eyes with our dark theme option</li>
            <li><strong>Mobile Responsive:</strong> Access results from any device</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Available Branches</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>Our portal covers all B.Tech and Dual Degree programs offered at NIT Hamirpur:</p>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li>Computer Science Engineering (BCS)</li>
            <li>Electronics and Communication Engineering (BEC)</li>
            <li>Electrical Engineering (BEE)</li>
            <li>Mechanical Engineering (BME)</li>
            <li>Civil Engineering (BCE)</li>
            <li>Chemical Engineering (BCH)</li>
            <li>Architecture (BAR)</li>
            <li>Mathematics and Computing (BMA)</li>
            <li>Engineering Physics (BPH)</li>
            <li>Material Science Engineering (BMS)</li>
            <li>Dual Degree Computer Science (DCS)</li>
            <li>Dual Degree Electronics (DEC)</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Disclaimer</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>NITH Results is an <strong>unofficial</strong> portal. While we strive to provide accurate information sourced from official records, this website is not affiliated with or endorsed by NIT Hamirpur. For official results and documents, please visit <a href="https://results.nith.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontWeight: '600' }}>results.nith.ac.in</a>.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Technology Stack</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '0' }}>Built with modern web technologies for optimal performance:</p>
          <ul style={{ lineHeight: '1.8', paddingLeft: '1.2rem' }}>
            <li>Backend: Python Flask</li>
            <li>Database: MongoDB</li>
            <li>Frontend: React, TypeScript</li>
            <li>Charts: Chart.js</li>
          </ul>
        </article>
      </main>
      <Footer />
    </div>
  );
}

export default About;
