import Footer from '../components/footer';
import Header from '../components/header';
import Seo from '../components/seo';

function Privacy() {
  return (
    <div className="app-container" itemScope itemType="https://schema.org/WebPage">
      <Seo
        title="Privacy Policy"
        description="Privacy Policy for NITH Results. Learn how we collect, use, and protect your data when you browse NIT Hamirpur student results on nithresults.xyz."
        path="/privacy"
      />
      <Header
        backButton
        kicker="Legal"
        title={<>Privacy <strong>Policy</strong></>}
        subtitle="Last updated: January 2025"
      />
      <main id="main-content" className="content-page" style={{ padding: '0 var(--page-gutter)' }}>
        <article className="content-card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', borderRadius: 'var(--radius-xl)', background: 'var(--card-bg)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Introduction</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>Welcome to NITH Results ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website nithresults.xyz. Please read this policy carefully to understand our views and practices regarding your personal data.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Information We Collect</h2>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Information You Provide</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>We may collect information that you voluntarily provide when you contact us via email, or report issues and provide feedback.</p>
          
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Automatically Collected Information</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '0.5rem' }}>When you visit our website, we may automatically collect certain information, including:</p>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
            <li><strong>Usage Data:</strong> Pages visited, time spent on pages, click patterns</li>
            <li><strong>IP Address:</strong> For security and analytics purposes</li>
            <li><strong>Cookies:</strong> Small data files stored on your device for functionality</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>How We Use Your Information</h2>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li>To provide and maintain our service</li>
            <li>To improve user experience and website functionality</li>
            <li>To analyze usage patterns and optimize performance</li>
            <li>To respond to your inquiries and support requests</li>
            <li>To detect, prevent, and address technical issues</li>
            <li>To protect against malicious, deceptive, or illegal activity</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Data Security</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, please note that no method of transmission over the Internet or electronic storage is 100% secure.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Third-Party Services</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>Our website may use third-party services that collect, monitor, and analyze data:</p>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li><strong>Google Analytics:</strong> To understand website usage and improve our services</li>
            <li><strong>Google Fonts:</strong> To display custom fonts</li>
            <li><strong>Chart.js:</strong> For rendering performance graphs</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Cookies</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>We use cookies and similar tracking technologies to enhance your experience: essential cookies for core functionality, preference cookies to remember settings (like dark mode), and analytics cookies to understand visitor interactions.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Student Data</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '0.5rem' }}>Our website displays academic result data for NIT Hamirpur students. This data:</p>
          <ul style={{ lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.2rem' }}>
            <li>Is sourced from publicly available official records</li>
            <li>Includes only academic information (name, roll number, grades, CGPA)</li>
            <li>Does not include personal contact information, photos, or sensitive data</li>
            <li>Is used solely for educational and informational purposes</li>
          </ul>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Disclaimer</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>NITH Results is an unofficial portal and is not affiliated with or endorsed by NIT Hamirpur. The academic data displayed is for informational purposes only. For official records and verification, please contact NIT Hamirpur directly.</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact Us</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '0' }}>If you have any questions about this Privacy Policy, please contact us at:</p>
          <ul style={{ lineHeight: '1.8', paddingLeft: '1.2rem' }}>
            <li><strong>Email:</strong> contact@nithresults.xyz</li>
            <li><strong>Website:</strong> https://nithresults.xyz</li>
          </ul>
        </article>
      </main>
      <Footer />
    </div>
  );
}

export default Privacy;
