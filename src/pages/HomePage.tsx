import React from 'react';
import { useNavigate } from 'react-router-dom';
import MascotPortfolioHero from '@/components/ui/mascot-portfolio-hero';
import { ArrowRight, ShieldAlert, Cpu, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { TextReveal } from '../components/ui/cascade-text';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const speciesList = [
    {
      icon: '🐄',
      title: 'Cattle & Bovine',
      desc: 'Early detection for Lumpy Skin Disease, Mastitis, Foot & Mouth, and Bovine Respiratory Disease.',
      diseases: ['Lumpy Skin', 'Mastitis', 'BVD', 'FMD']
    },
    {
      icon: '🐑',
      title: 'Sheep & Goats',
      desc: 'Rapid identification of Contagious Ecthyma (Orf), Sheep Pox, Scrapie, and foot rot conditions.',
      diseases: ['Orf', 'Foot Rot', 'Pox', 'Enterotoxemia']
    },
    {
      icon: '🐎',
      title: 'Horses & Equine',
      desc: 'Screening for Equine Herpesvirus, Strangles, Sweet Itch, and ocular or hoof infections.',
      diseases: ['Strangles', 'Hoof Thrush', 'Rain Rot', 'EHV-1']
    },
    {
      icon: '🐖',
      title: 'Swine & Pigs',
      desc: 'Biosecurity surveillance for African Swine Fever, PRRS, and porcine dermatitis lesions.',
      diseases: ['ASF', 'PRRS', 'Erysipelas', 'Swine Flu']
    },
    {
      icon: '🐕',
      title: 'Canine & Pets',
      desc: 'Dermatological screening for Ringworm, Mange, Parvovirus rash, and allergic dermatitis.',
      diseases: ['Mange', 'Hot Spots', 'Ringworm', 'Dermatitis']
    }
  ];

  return (
    <div className="home-page-root">
      {/* 1. HERO SECTION WITH CUTE COW MASCOT */}
      <MascotPortfolioHero
        height="min(92vh, 920px)"
        minHeight="540px"
        index="24/7"
        discipline="Pashu Drishti"
        tagline="See the signs. Detect early. Care better."
        collection={["Pashu", "Drishti"]}
        reel={["See The Signs. Detect Early.", "Care Better @ 2026"]}
        year="2026"
        initials="AI"
        badge="Instant Scan"
        line2="Pashu"
        line3="Drishti"
        word="Care"
        verticalTag="Vision"
        bracketed="AI"
        seekingLabel="Pashu Drishti*"
        seeking="Start Animal Scan"
        href="/detect"
        character="cow"
        paper="#090D11"
        ink="#F3F4F6"
        accent="#10B981"
        services={[
          "Cattle & Bovine",
          "Sheep & Goats",
          "Equine Health",
          "Swine Surveillance",
          "Quarantine Protocol"
        ]}
        greetings={[
          "Moo! Welcome to Pashu Drishti 🐄",
          "See the signs. Detect early. Care better.",
          "Early detection saves herds! 🩺",
          "Quarantine protocols online ✨",
          "Ticklish! Click 'Start Animal Scan' below :) 🐮"
        ]}
      />

      {/* 2. SPECIES DIAGNOSTIC SPECTRUM */}
      <section className="editorial-section">
        <div className="section-header-editorial">
          <span className="section-label">PASHU DRISHTI // CLINICAL COVERAGE</span>
          <h2 className="section-title-editorial">See the Signs. Detect Early. Care Better.</h2>
          <p className="section-sub-editorial">
            Trained on over 250,000 verified veterinary pathological images to identify dermatological, oral, and systemic anomalies before outbreaks spread.
          </p>
        </div>

        <div className="species-grid">
          {speciesList.map((item, idx) => (
            <div 
              key={idx} 
              className="species-card"
              onClick={() => navigate('/detect')}
              role="button"
              tabIndex={0}
            >
              <div className="species-icon-box">{item.icon}</div>
              <h3 className="species-title">{item.title}</h3>
              <p className="species-desc">{item.desc}</p>
              <div className="species-diseases-tags">
                {item.diseases.map((tag, tIdx) => (
                  <span key={tIdx} className="species-tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
 
      {/* 2.5 INTERACTIVE CASCADE TEXT SHOWCASE */}
      <section className="editorial-section" style={{ paddingTop: '1rem', paddingBottom: '2.5rem' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-editorial)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '1.5rem' }}>
            <div>
              <span className="section-label">PASHU DRISHTI PLATFORM</span>
              <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.8rem', marginTop: '4px' }}>
                See the signs. Detect early. Care better.
              </h3>
            </div>
            <div className="editorial-badge">
              <Sparkles size={13} />
              <span>HOVER OVER TEXT BELOW</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--demo-bg)',
            color: 'var(--demo-text)',
            borderRadius: '16px',
            border: '1px dashed var(--border-editorial)',
            gap: '18px'
          }}>
            <TextReveal 
              text="PASHU DRISHTI" 
              fontSize="clamp(2.5rem, 5vw, 4.5rem)"
              color="var(--demo-text)"
              hoverColor="var(--accent-green)"
              direction="up"
            />
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              <TextReveal 
                text="SEE THE SIGNS" 
                fontSize="1.35rem"
                color="var(--text-secondary)"
                hoverColor="#38BDF8"
                direction="down"
              />
              <span style={{ color: 'var(--border-editorial)' }}>•</span>
              <TextReveal 
                text="DETECT EARLY" 
                fontSize="1.35rem"
                color="var(--text-secondary)"
                hoverColor="#FBBF24"
                direction="up"
              />
              <span style={{ color: 'var(--border-editorial)' }}>•</span>
              <TextReveal 
                text="CARE BETTER" 
                fontSize="1.35rem"
                color="var(--text-secondary)"
                hoverColor="#F472B6"
                direction="down"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. PERFORMANCE METRICS BANNER */}
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 3.5rem' }}>
        <div className="metrics-banner">
          <div className="metric-item">
            <span className="metric-number">250K+</span>
            <span className="metric-label">Clinical Datasets</span>
            <span className="metric-sub">Benchmarked against board-certified veterinary pathology panels</span>
          </div>

          <div className="metric-item">
            <span className="metric-number">1.2s</span>
            <span className="metric-label">Inference Latency</span>
            <span className="metric-sub">Instant zero-delay triage on mobile and edge devices</span>
          </div>

          <div className="metric-item">
            <span className="metric-number">48+</span>
            <span className="metric-label">Detected Pathologies</span>
            <span className="metric-sub">Continuously expanded database of viral, bacterial, and fungal diseases</span>
          </div>

          <div className="metric-item">
            <span className="metric-number">24/7</span>
            <span className="metric-label">Autonomous Triage</span>
            <span className="metric-sub">Immediate quarantine protocol guidance at your fingertips</span>
          </div>
        </div>
      </div>

      {/* 4. WORKFLOW: SCAN -> ANALYZE -> ACT */}
      <section className="editorial-section">
        <div className="section-header-editorial">
          <span className="section-label">HOW IT WORKS</span>
          <h2 className="section-title-editorial">From Photo to Clinical Action in Seconds</h2>
          <p className="section-sub-editorial">
            Engineered for farm environments and veterinary clinics with minimal friction and maximum clinical precision.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          <div className="species-card" style={{ padding: '32px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>STEP 01</div>
            <div className="species-icon-box" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38BDF8' }}>📸</div>
            <h3 className="species-title">Capture Animal Image</h3>
            <p className="species-desc">
              Snap a clear photo of the affected area — skin nodules, eyes, mouth, hooves, or general posture using your smartphone or upload existing photos.
            </p>
          </div>

          <div className="species-card" style={{ padding: '32px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>STEP 02</div>
            <div className="species-icon-box" style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>🧠</div>
            <h3 className="species-title">AI Computer Vision Scan</h3>
            <p className="species-desc">
              Our multi-layered neural network analyzes epidermal textures, lesion patterns, swelling contours, and anatomical landmarks against disease benchmarks.
            </p>
          </div>

          <div className="species-card" style={{ padding: '32px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>STEP 03</div>
            <div className="species-icon-box" style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#FBBF24' }}>📋</div>
            <h3 className="species-title">Instant Veterinary Action</h3>
            <p className="species-desc">
              Receive high-confidence diagnosis probability, severity rating, recommended isolation procedures, and immediate first-aid protocols.
            </p>
          </div>
        </div>

        {/* Bottom Call to Action Card */}
        <div style={{
          marginTop: '4rem',
          background: 'linear-gradient(135deg, #141C24 0%, #0C231A 100%)',
          border: '1.5px solid var(--border-editorial)',
          borderRadius: '24px',
          padding: '3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div>
            <div className="editorial-badge" style={{ marginBottom: '12px' }}>
              <Cpu size={13} />
              <span>PASHU DRISHTI // AI VISION</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', marginBottom: '8px' }}>
              See the signs. Detect early. Care better.
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px' }}>
              Have an animal showing symptoms? Upload a photo now to run Pashu Drishti's computer vision model and safeguard your animal within moments.
            </p>
          </div>

          <button 
            onClick={() => navigate('/detect')}
            className="btn-pill-primary"
            style={{ padding: '18px 40px', fontSize: '1.1rem' }}
          >
            <span>Launch AI Detector</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};
export default HomePage;
