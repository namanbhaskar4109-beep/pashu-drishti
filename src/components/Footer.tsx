import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top-row">
          <div className="footer-brand-bio">
            <div className="nav-brand">
              <span style={{ fontSize: '1.6rem' }}>🐄</span>
              <span className="brand-name">PASHU DRISHTI<span className="brand-dot">.AI</span></span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Pioneering computer vision and artificial intelligence for early livestock and pet disease detection. Supporting farmers, breeders, and pet owners worldwide.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <span className="footer-col-title">Platform</span>
              <Link to="/" className="footer-link">Home</Link>
              <Link to="/detect" className="footer-link">AI Diagnostic Tool</Link>
              <Link to="/diseases" className="footer-link">Disease Index</Link>
            </div>

            <div className="footer-col">
              <span className="footer-col-title">Supported Species</span>
              <span className="footer-link">Cattle & Dairy</span>
              <span className="footer-link">Sheep & Goats</span>
              <span className="footer-link">Horses & Equine</span>
              <span className="footer-link">Swine & Porcine</span>
            </div>

            <div className="footer-col">
              <span className="footer-col-title">Security & Vet</span>
              <span className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="var(--accent-green)" />
                ISO 27001 Certified
              </span>
              <span className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={14} color="#EF4444" />
                Veterinary Backed
              </span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div>
            © {new Date().getFullYear()} Pashu Drishti. All rights reserved.
          </div>
          <div>
            Mascot: Clover the Cow • Real-time Multimodal Veterinary Intelligence
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
