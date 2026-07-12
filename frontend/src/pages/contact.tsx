import { Helmet } from 'react-helmet-async';
import Footer from '../components/footer';
import Header from '../components/header';
import Icon from '../components/icon';
import Seo from '../components/seo';

function Contact() {
  return (
    <div className="app-container" itemScope itemType="https://schema.org/WebPage">
      <Seo
        title="Contact Us"
        description="Get in touch with the NITH Results team. Report bugs, request features, or ask questions about NIT Hamirpur student results. Email, GitHub, and social links."
        path="/contact"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "Is NITH Results an official portal?", "acceptedAnswer": { "@type": "Answer", "text": "No, NITH Results is an unofficial portal created to provide a faster and more user-friendly experience for checking NIT Hamirpur results." } },
            { "@type": "Question", "name": "My result is showing incorrectly. What should I do?", "acceptedAnswer": { "@type": "Answer", "text": "Email us at contact@nithresults.xyz with your roll number and the details of the issue. We'll investigate and correct it as soon as possible." } },
            { "@type": "Question", "name": "How often are results updated?", "acceptedAnswer": { "@type": "Answer", "text": "We update our database as soon as new results are released by NIT Hamirpur. Typically within 24-48 hours of official announcements." } }
          ]
        })}</script>
      </Helmet>
      <Header
        backButton
        kicker="Get in Touch"
        title={<>Contact <strong>Us</strong></>}
        subtitle="Have questions? We'd love to hear from you"
      />
      <main id="main-content" className="content-page" style={{ padding: '0 var(--page-gutter)' }}>
        <article className="content-card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', borderRadius: 'var(--radius-xl)', background: 'var(--card-bg)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact Information</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>Have questions, feedback, or suggestions about NITH Results? We'd love to hear from you! Here's how you can reach us:</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-l)', background: 'var(--md-sys-color-surface-variant)', textAlign: 'center' }}>
              <Icon name="mail" className="contact-icon" style={{ fontSize: '32px', color: 'var(--md-sys-color-primary)' }} />
              <h3 style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>Email Us</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>For general queries, feedback, or support:</p>
              <a href="mailto:contact@nithresults.xyz" style={{ color: 'var(--md-sys-color-primary)', fontWeight: '600', textDecoration: 'none' }}>contact@nithresults.xyz</a>
            </div>
            
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-l)', background: 'var(--md-sys-color-surface-variant)', textAlign: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="var(--md-sys-color-primary)" style={{ display: 'block', margin: '0 auto' }} aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <h3 style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>GitHub</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Found a bug? Want to contribute?</p>
              <a href="https://github.com/nirusaki" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontWeight: '600', textDecoration: 'none' }}>@nirusaki on GitHub</a>
            </div>
            
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-l)', background: 'var(--md-sys-color-surface-variant)', textAlign: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="var(--md-sys-color-primary)" style={{ display: 'block', margin: '0 auto' }} aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <h3 style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>Twitter</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Follow us for updates:</p>
              <a href="https://twitter.com/nirusaki" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontWeight: '600', textDecoration: 'none' }}>@nirusaki on Twitter</a>
            </div>
          </div>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Location</h2>
          <address style={{ fontStyle: 'normal', lineHeight: '1.6', marginBottom: '2rem' }}>
            <p><strong>NITH Results Portal</strong></p>
            <p>
              NIT Hamirpur Campus Area<br />
              Hamirpur, Himachal Pradesh<br />
              India - 177005
            </p>
          </address>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Is NITH Results an official portal?</h3>
              <p style={{ lineHeight: '1.5' }}>No, NITH Results is an unofficial portal created to provide a faster and more user-friendly experience for checking NIT Hamirpur results. For official documents, please visit results.nith.ac.in.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>My result is showing incorrectly. What should I do?</h3>
              <p style={{ lineHeight: '1.5' }}>If you notice any discrepancies in your result, please email us at contact@nithresults.xyz with your roll number and the details of the issue. We'll investigate and correct it as soon as possible.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Can I request a new feature?</h3>
              <p style={{ lineHeight: '1.5' }}>Absolutely! We're always looking to improve. Send your feature requests to our email or open an issue on GitHub.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>How often are results updated?</h3>
              <p style={{ lineHeight: '1.5' }}>We update our database as soon as new results are released by NIT Hamirpur. Typically, updates happen within 24-48 hours of official result announcements.</p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

export default Contact;
