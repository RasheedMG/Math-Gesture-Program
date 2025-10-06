import React, { useState, useEffect, useRef } from 'react';
import { Mail, Linkedin, ChevronRight } from 'lucide-react';

const EdVentureLanding = () => {
  const [activeSection, setActiveSection] = useState('problem');
  const sectionsRef = useRef({});

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      const sections = ['problem', 'solution', 'team', 'demo'];
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sectionsRef.current[sections[i]];
        if (section && scrollPos >= section.offsetTop) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const section = sectionsRef.current[sectionId];
    if (section) {
      const yOffset = -80;
      const y = section.offsetTop + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const TEAM = [
    {
      first: "Besmelh",
      last: "Alshalaan",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/Besmelh",
      linkedin: "https://www.linkedin.com/in/besmelh-alshaalan/",
      email: "besmelh.alshaalan@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
    {
      first: "Shaykha",
      last: "Almaani",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/We",
      linkedin: "https://www.linkedin.com/in/shaykha-almaani/",
      email: "shaykhah.abdullah.a@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
    {
      first: "Rasheed",
      last: "Alghamdi",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/Rasheed",
      linkedin: "https://www.linkedin.com/in/rasheedmg/",
      email: "rasheedalghamdi1998@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
    {
      first: "Fai",
      last: "Alradhi",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/We",
      linkedin: "https://www.linkedin.com/in/fai-alradhi-caie™-080b66228/",
      email: "Faialradhi@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
    {
      first: "Mohammad",
      last: "Alsarrah",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/Mohammed",
      linkedin: "https://www.linkedin.com/in/mohammed-alsarrah/",
      email: "malsarrah0@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
    {
      first: "Mjd",
      last: "Alamri",
      avatar: "https://github.com/MjdMAlamri/Images/raw/refs/heads/main/We",
      linkedin: "https://www.linkedin.com/in/mjd-alamri-pnu/",
      email: "mjdmalamri@gmail.com",
      description: "Project coordinator ensuring seamless teamwork and high-impact outcomes."
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <img 
            src="https://companieslogo.com/img/orig/ACN_BIG.D-871a76ce.png?t=1720244490"
            alt="Logo"
            style={styles.logo}
          />
          
          <nav style={styles.nav}>
            {[
              { label: 'PROBLEM', key: 'problem' },
              { label: 'SOLUTION', key: 'solution' },
              { label: 'TEAM', key: 'team' },
              { label: 'DEMO', key: 'demo' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.key)}
                style={{
                  ...styles.navItem,
                  ...(activeSection === item.key ? styles.navItemActive : styles.navItem)
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>EdVenture</h1>
          <p style={styles.heroSubtitle}>
            Making education fun, engaging, and trackable
          </p>
          <div style={styles.heroButtons}>
            <a
              href="https://team1-mathproject.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.primaryButton}
            >
              Try the Demo Now
              <ChevronRight size={20} style={{ marginLeft: 8 }} />
            </a>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section 
        ref={el => sectionsRef.current.problem = el}
        style={styles.section}
      >
        <div style={styles.sectionContent}>
          <div style={styles.twoColumnGrid}>
            <div style={styles.textColumn}>
              <h2 style={styles.sectionTitle}>The Struggle with Traditional Learning</h2>
              <p style={styles.bodyText}>
                Traditional math learning relies heavily on textbooks and lectures, making the subject feel abstract and repetitive. This often leads to low engagement and reduced motivation among students. Teachers also struggle to track individual progress.
              </p>
            </div>
            <div style={styles.imageColumn}>
              <div style={styles.imageCard}>
                <img
                  src="https://images.pexels.com/photos/249360/pexels-photo-249360.jpeg"
                  alt="Traditional classroom"
                  style={styles.cardImage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section 
        ref={el => sectionsRef.current.solution = el}
        style={{...styles.section, ...styles.sectionAlt}}
      >
        <div style={styles.sectionContent}>
          <h2 style={{...styles.sectionTitle, marginBottom: 48}}>The EdVenture Way</h2>
          <div style={styles.featureGrid}>
            <FeatureCard
              title="Fun"
              description="Interactive math games powered by gesture and hand-draw recognition."
              image="https://www.teachhub.com/wp-content/uploads/2024/04/Apr-10-How-to-Use-Video-Games-in-the-Classroom-resize.jpg"
            />
            <FeatureCard
              title="Engaging"
              description="Students draw and gesture to grasp abstract concepts quickly."
              image="https://www.ravennasolutions.com/wp-content/uploads/2023/05/RavennaTips-BlogHeader-Sept2024-1.jpg"
            />
            <FeatureCard
              title="Trackable"
              description="Real-time analytics for teachers; history for students."
              image="https://www.nerdwallet.com/tachyon/2023/01/GettyImages-1401269015.jpg?resize=1920,1080"
            />
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section 
        ref={el => sectionsRef.current.team = el}
        style={{...styles.section, background: 'linear-gradient(180deg, #12183d 0%, #0a0d1f 100%)'}}
      >
        <div style={styles.sectionContent}>
          <h2 style={{...styles.sectionTitle, marginBottom: 48}}>Team Members</h2>
          <div style={styles.teamGrid}>
            {TEAM.map((member, idx) => (
              <TeamCard key={idx} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={el => sectionsRef.current.demo = el}
        style={styles.ctaSection}
      >
        <div style={styles.ctaCard}>
          <div style={styles.ctaBackground} />
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>Experience It Yourself — Try the Demo</h2>
            <div style={styles.ctaButtons}>
              <a
                href="https://team1-mathproject.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.primaryButton}
              >
                Try the Demo Now
                <ChevronRight size={20} style={{ marginLeft: 8 }} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2024 EdVenture. Built with passion for better education.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ title, description, image }) => (
  <div style={styles.featureCard}>
    <div style={{
      ...styles.featureBackground,
      backgroundImage: `url(${image})`
    }} />
    <div style={styles.featureOverlay} />
    <div style={styles.featureContent}>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureDescription}>{description}</p>
    </div>
  </div>
);

const TeamCard = ({ member }) => (
  <div style={styles.teamCard}>
    <div style={styles.teamCardInner}>
      <div style={styles.avatarWrapper}>
        <div style={styles.avatarGlow} />
        <img 
          src={member.avatar} 
          alt={`${member.first} ${member.last}`}
          style={styles.avatar}
        />
      </div>
      <div style={styles.teamInfo}>
        <span style={styles.teamLabel}>TEAM MEMBER</span>
        <h3 style={styles.teamName}>{member.first} {member.last}</h3>
        <p style={styles.teamDescription}>
          {member.description}
        </p>
        <div style={styles.teamActions}>
          <a
            href={`mailto:${member.email}`}
            style={styles.iconButton}
            title="Email"
          >
            <Mail size={18} />
          </a>
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{...styles.iconButton, ...styles.linkedinButton}}
            title="LinkedIn"
          >
            <Linkedin size={18} />
          </a>
        </div>
      </div>
    </div>
  </div>
);

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#0a0d1f',
    color: '#ffffff',
    minHeight: '100vh',
    width: "100%"
  },
  
  // Header
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(12px)',
    backgroundColor: 'rgba(10, 13, 31, 0.85)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  headerContent: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  logo: {
    height: 44,
    width: 'auto',
  },
  nav: {
    display: 'flex',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 6,
    borderRadius: 999,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    padding: '10px 18px',
    background: 'transparent',
    border: 'none',
    color: '#C9CDE6',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.5,
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    backgroundColor: 'rgba(123, 44, 255, 0.22)',
    border: '1px solid #7B2CFF',
    color: '#ffffff',
  },
  
  // Hero
  hero: {
    position: 'relative',
    minHeight: 'calc(100vh - 76px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'url(https://sb.kaleidousercontent.com/133458/5000x3137/18ff54b4fa/pexels-max-fischer-5212700.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '80px 24px',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(10, 13, 31, 0.8) 0%, rgba(10, 13, 31, 0.6) 100%)',
  },
  heroContent: {
    position: 'relative',
    maxWidth: 800,
    textAlign: 'center',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 'clamp(48px, 8vw, 72px)',
    fontWeight: 900,
    marginBottom: 16,
    background: 'linear-gradient(135deg, #ffffff 0%, #E6E8F2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    fontSize: 'clamp(18px, 3vw, 24px)',
    lineHeight: 1.5,
    color: '#E6E8F2',
    marginBottom: 32,
  },
  heroButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  
  // Buttons
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 32px',
    backgroundColor: 'rgba(123, 44, 255, 0.22)',
    border: '1.5px solid #7B2CFF',
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 800,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 20px rgba(123, 44, 255, 0.3)',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    color: '#E6E8F2',
    fontSize: 16,
    fontWeight: 800,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  // Sections
  section: {
    padding: '100px 24px',
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
  },
  sectionAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  sectionContent: {
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: 900,
    marginBottom: 24,
    color: '#ffffff',
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 1.7,
    color: '#DDE2F1',
  },
  
  // Two Column Layout
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 48,
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  imageColumn: {
    flex: 1,
  },
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardImage: {
    width: '100%',
    height: 350,
    objectFit: 'cover',
    display: 'block',
  },
  
  // Feature Grid
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
  },
  featureCard: {
    position: 'relative',
    minHeight: 280,
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureBackground: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.5,
  },
  featureOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%)',
  },
  featureContent: {
    position: 'relative',
    padding: 32,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    zIndex: 1,
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 12,
    color: '#ffffff',
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#D8DBEA',
  },
  
  // Team Grid
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
  },
  teamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  teamCardInner: {
    padding: 24,
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarGlow: {
    position: 'absolute',
    inset: -2,
    background: 'linear-gradient(135deg, #7B2CFF 0%, rgba(123, 44, 255, 0.3) 100%)',
    borderRadius: 16,
  },
  avatar: {
    position: 'relative',
    width: 80,
    height: 110,
    objectFit: 'cover',
    borderRadius: 14,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: '#101632',
  },
  teamInfo: {
    flex: 1,
  },
  teamLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#C9CCE3',
    fontWeight: 700,
    display: 'block',
    marginBottom: 6,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 8,
    color: '#ffffff',
  },
  teamDescription: {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#DDE2F1',
    marginBottom: 16,
  },
  teamActions: {
    display: 'flex',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    color: '#E6E8F2',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  linkedinButton: {
    backgroundColor: '#0a66c2',
    borderColor: '#0a66c2',
  },
  
  // CTA Section
  ctaSection: {
    padding: '100px 24px',
  },
  ctaCard: {
    position: 'relative',
    maxWidth: 1200,
    margin: '0 auto',
    borderRadius: 28,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBackground: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=1600&auto=format&fit=crop)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(40px)',
    opacity: 0.3,
  },
  ctaContent: {
    position: 'relative',
    textAlign: 'center',
    padding: '60px 32px',
    zIndex: 1,
  },
  ctaTitle: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 900,
    marginBottom: 32,
    color: '#ffffff',
  },
  ctaButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  
  // Footer
  footer: {
    padding: '40px 24px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  footerText: {
    color: '#C9CFE8',
    fontSize: 14,
  },
};

export default EdVentureLanding;