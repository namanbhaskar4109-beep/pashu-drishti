import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Stethoscope, UserCheck, User as UserIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

type UserRole = 'vet' | 'farmer' | 'researcher';
type AuthMode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  // Mode: Sign In vs Sign Up
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    return location.pathname === '/signup' || new URLSearchParams(location.search).get('mode') === 'signup'
      ? 'register'
      : 'login';
  });

  // Redirect target
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('vet');
  const [rememberMe, setRememberMe] = useState(true);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cowPoked, setCowPoked] = useState(false);
  const [cowQuoteIndex, setCowQuoteIndex] = useState(0);

  const cowQuotes = [
    "Moo! Enter your credentials to access your herd! 🐄",
    "I'm keeping watch on your diagnostic records! 🛡️",
    "Don't worry, I won't peek at your password! 🙈",
    "Pashu Drishti: See the signs, detect early! ✨",
    "Tip: You can click the one-tap demo profiles below!"
  ];

  // Sound chime via Web Audio API
  const playChime = useCallback((type: 'chime' | 'success' | 'peek') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'peek') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0.15, now + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.4);
        });
      }
    } catch {
      // Audio fallback
    }
  }, []);

  const handlePokeCow = () => {
    playChime('chime');
    setCowPoked(true);
    setCowQuoteIndex((prev) => (prev + 1) % cowQuotes.length);
    setTimeout(() => setCowPoked(false), 2000);
  };

  const handleToggleShowPassword = () => {
    playChime('peek');
    setShowPassword((prev) => !prev);
  };

  const handleQuickLogin = (role: UserRole) => {
    setAuthMode('login');
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'vet') {
      setEmail('dr.sharma@pashudrishti.ai');
      setPassword('VetCare2026!secure');
    } else if (role === 'farmer') {
      setEmail('rajesh.patel@dairyherds.in');
      setPassword('BovineHealth#2026');
    } else {
      setEmail('biosecurity.lab@agrivet.gov');
      setPassword('SurveillanceLab!99');
    }
    playChime('chime');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Passkey must be at least 8 characters in length.');
      return;
    }

    if (authMode === 'register') {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMessage('Full name is required (at least 2 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await login({ email: email.trim(), password, rememberMe });
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          role: selectedRole
        });
      }

      setIsSuccess(true);
      playChime('success');

      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FBBF24', '#38BDF8']
        });
      } catch {
        // Fallback
      }

      setTimeout(() => {
        navigate(redirectTarget);
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eye gaze calculation based on email input length
  const eyeOffset = Math.min(Math.max((email.length - 12) * 0.8, -10), 12);
  const eyeYOffset = isEmailFocused ? 6 : 0;

  return (
    <div className="login-page-root">
      {/* Background Perspective Grid */}
      <div className="login-bg-grid" />
      <div className="login-ambient-glow" />

      <div className="login-container">
        
        {/* BRAND HEADER */}
        <div className="login-header-group">
          <Link to="/" className="login-brand-link">
            <span className="brand-cow-icon">🐄</span>
            <span className="brand-title">PASHU DRISHTI<span className="brand-dot">.AI</span></span>
          </Link>
          <p className="login-sub-motto">See the signs. Detect early. Care better.</p>
        </div>

        {/* MAIN CARD */}
        <div className="login-card-editorial">
          
          {/* ================= CUTE COW MASCOT ================= */}
          <div className="cow-mascot-container">
            <button
              type="button"
              className={`cow-avatar-btn ${cowPoked ? 'is-poked' : ''} ${isSuccess ? 'is-celebrating' : ''}`}
              onClick={handlePokeCow}
              title="Click me to say hi!"
              aria-label="Interactive Cow Mascot"
            >
              <svg viewBox="0 0 340 320" className="cow-svg" aria-hidden="true">
                <defs>
                  <radialGradient id="cowLgShade" cx="46%" cy="40%" r="62%">
                    <stop offset="0.55" stopColor="#52525b" stopOpacity="0" />
                    <stop offset="1" stopColor="#18181b" stopOpacity="0.28" />
                  </radialGradient>
                  <radialGradient id="cowLgSnout" cx="46%" cy="36%" r="65%">
                    <stop offset="0" stopColor="#fed7aa" stopOpacity="0.3" />
                    <stop offset="0.6" stopColor="#f472b6" stopOpacity="0.2" />
                    <stop offset="1" stopColor="#e11d48" stopOpacity="0.3" />
                  </radialGradient>
                  <linearGradient id="cowLgHorn" x1="0" y1="1" x2="0.6" y2="0">
                    <stop offset="0" stopColor="#f59e0b" />
                    <stop offset="0.7" stopColor="#fbbf24" />
                    <stop offset="1" stopColor="#fef08a" />
                  </linearGradient>
                  <linearGradient id="cowLgBell" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fde047" />
                    <stop offset="0.5" stopColor="#eab308" />
                    <stop offset="1" stopColor="#ca8a04" />
                  </linearGradient>
                  <radialGradient id="cowLgBlush">
                    <stop offset="0" stopColor="#ff6f6f" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#ff6f6f" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="cowLgEye" cx="38%" cy="32%" r="70%">
                    <stop offset="0" stopColor="#2c1a14" />
                    <stop offset="0.6" stopColor="#160e0a" />
                    <stop offset="1" stopColor="#050505" />
                  </radialGradient>
                </defs>

                {/* Torso & Bell */}
                <g className="cow-body-group">
                  <path
                    d="M48 320 C54 260 102 230 170 224 L170 224 C238 230 286 260 292 320 Z"
                    fill="#fbfbf9"
                    stroke="#27272a"
                    strokeWidth="3.5"
                  />
                  <path d="M52 320 C60 285 95 270 125 290 C140 300 142 320 135 320 Z" fill="#27272a" />
                  <path d="M225 285 C255 270 285 280 290 320 L275 320 C240 320 228 300 225 285 Z" fill="#27272a" />
                  <path d="M110 224 Q170 252 230 224 Q170 262 110 224 Z" fill="#10B981" stroke="#111827" strokeWidth="2.5" />
                  <circle cx="170" cy="254" r="5" fill="none" stroke="#ca8a04" strokeWidth="2" />
                  <path d="M161 258 C161 250 179 250 179 258 L182 274 C182 278 158 278 158 274 Z" fill="url(#cowLgBell)" stroke="#854d0e" strokeWidth="1.5" />
                  <circle cx="170" cy="276" r="3.5" fill="#854d0e" />
                </g>

                {/* Left Ear */}
                <g className={`cow-ear-left ${isPasswordFocused ? 'ear-twitch' : ''}`}>
                  <g transform="rotate(-15 75 140)">
                    <ellipse cx="75" cy="140" rx="36" ry="24" fill="#fbfbf9" stroke="#27272a" strokeWidth="3" />
                    <ellipse cx="75" cy="140" rx="25" ry="15" fill="#fda4af" />
                    <g transform="translate(62, 138) rotate(-5)">
                      <circle cx="8" cy="4" r="2.5" fill="#713f12" />
                      <rect x="0" y="5" width="16" height="24" rx="3" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
                      <text x="8" y="18" textAnchor="middle" fontSize="6" fontWeight="900" fill="#713f12">#01</text>
                    </g>
                  </g>
                </g>

                {/* Right Ear */}
                <g className={`cow-ear-right ${isPasswordFocused ? 'ear-twitch' : ''}`}>
                  <g transform="rotate(15 265 140)">
                    <ellipse cx="265" cy="140" rx="36" ry="24" fill="#27272a" stroke="#18181b" strokeWidth="3" />
                    <ellipse cx="265" cy="140" rx="25" ry="15" fill="#fb7185" opacity="0.85" />
                  </g>
                </g>

                {/* Horns */}
                <g>
                  <path d="M115 65 C95 40 70 30 55 12 C75 20 102 40 130 60 Z" fill="url(#cowLgHorn)" stroke="#92400e" strokeWidth="2.5" />
                  <path d="M225 65 C245 40 270 30 285 12 C265 20 238 40 210 60 Z" fill="url(#cowLgHorn)" stroke="#92400e" strokeWidth="2.5" />
                </g>

                {/* Head Base */}
                <g>
                  <path
                    d="M170 30 C240 30 275 85 275 160 C275 230 225 270 170 270 C115 270 65 230 65 160 C65 85 100 30 170 30 Z"
                    fill="#fbfbf9"
                    stroke="#27272a"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M170 30 C240 30 275 85 275 160 C275 230 225 270 170 270 C115 270 65 230 65 160 C65 85 100 30 170 30 Z"
                    fill="url(#cowLgShade)"
                  />
                  <path
                    d="M170 30 C215 30 255 50 270 105 C276 140 258 185 225 195 C195 205 178 175 178 135 C178 85 160 55 170 30 Z"
                    fill="#27272a"
                  />
                  <path
                    d="M148 38 C140 20 162 16 170 24 C178 16 200 20 192 38 C182 44 158 44 148 38 Z"
                    fill="#ffffff"
                    stroke="#27272a"
                    strokeWidth="2.5"
                  />
                </g>

                {/* Cheeks Blush */}
                <g>
                  <ellipse cx="102" cy="190" rx={cowPoked || isSuccess ? 28 : 22} ry={cowPoked || isSuccess ? 18 : 14} fill="url(#cowLgBlush)" />
                  <ellipse cx="238" cy="190" rx={cowPoked || isSuccess ? 28 : 22} ry={cowPoked || isSuccess ? 18 : 14} fill="url(#cowLgBlush)" />
                </g>

                {/* Eyes */}
                <g>
                  <g className="cow-brows">
                    <path
                      d={isSuccess || cowPoked ? "M110 108 Q128 92 146 102" : "M110 112 Q128 100 146 108"}
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <path
                      d={isSuccess || cowPoked ? "M194 102 Q212 92 230 108" : "M194 108 Q212 100 230 112"}
                      fill="none"
                      stroke="#f4f4f5"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  </g>

                  {isSuccess || cowPoked ? (
                    <g className="eyes-happy">
                      <path d="M116 138 Q132 118 148 138" fill="none" stroke="#18181b" strokeWidth="8" strokeLinecap="round" />
                      <path d="M192 138 Q208 118 224 138" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  ) : (
                    <g className="eyes-normal">
                      <ellipse cx="132" cy="138" rx="16" ry="19" fill="#ffffff" stroke="#27272a" strokeWidth="2" />
                      <g transform={`translate(${isEmailFocused ? eyeOffset : 0}, ${eyeYOffset})`}>
                        <ellipse cx="132" cy="138" rx="14" ry="17" fill="url(#cowLgEye)" />
                        <circle cx="127" cy="131" r="5" fill="#ffffff" />
                        <circle cx="138" cy="145" r="2.2" fill="#ffffff" opacity="0.85" />
                      </g>

                      <ellipse cx="208" cy="138" rx="16" ry="19" fill="#ffffff" stroke="#27272a" strokeWidth="2" />
                      <g transform={`translate(${isEmailFocused ? eyeOffset : 0}, ${eyeYOffset})`}>
                        <ellipse cx="208" cy="138" rx="14" ry="17" fill="url(#cowLgEye)" />
                        <circle cx="203" cy="131" r="5" fill="#ffffff" />
                        <circle cx="214" cy="145" r="2.2" fill="#ffffff" opacity="0.85" />
                      </g>
                    </g>
                  )}
                </g>

                {/* Snout & Mouth */}
                <g>
                  <rect x="110" y="175" width="120" height="66" rx="33" fill="#fbcfe8" stroke="#be185d" strokeWidth="2.5" />
                  <rect x="110" y="175" width="120" height="66" rx="33" fill="url(#cowLgSnout)" />
                  <ellipse cx="145" cy="200" rx="7.5" ry="5.5" fill="#be185d" opacity="0.8" transform="rotate(-10 145 200)" />
                  <ellipse cx="195" cy="200" rx="7.5" ry="5.5" fill="#be185d" opacity="0.8" transform="rotate(10 195 200)" />

                  {isSuccess || cowPoked ? (
                    <g transform="translate(170, 222) scale(1.05) translate(-170, -222)">
                      <path d="M148 216 Q170 242 192 216 Q170 250 148 216 Z" fill="#881337" stroke="#be185d" strokeWidth="1.8" />
                      <ellipse cx="170" cy="232" rx="11" ry="6" fill="#f43f5e" />
                    </g>
                  ) : (
                    <path d="M154 218 Q170 230 186 218" fill="none" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round" />
                  )}
                </g>

                <path d="M96 166 L98 171 L103 171.5 L99 174.5 L100.5 179.5 L96 176.5 L91.5 179.5 L93 174.5 L89 171.5 L94 171 Z" fill="#f59e0b" />

                {/* Hooves covering eyes / peeking */}
                <g className="cow-hooves-layer">
                  <g
                    className="hoof-left"
                    style={{
                      transform: isPasswordFocused
                        ? 'translate(22px, -86px) rotate(-16deg)'
                        : 'translate(0px, 0px) rotate(0deg)',
                      transition: 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <path d="M72 270 C60 240 85 210 118 210 C145 210 152 245 138 276 Z" fill="#fbfbf9" stroke="#27272a" strokeWidth="3" />
                    <path d="M72 260 C78 245 100 235 125 242 L132 268 C115 272 90 270 72 260 Z" fill="#18181b" />
                    <line x1="102" y1="239" x2="102" y2="265" stroke="#fbfbf9" strokeWidth="2.5" />
                  </g>

                  <g
                    className="hoof-right"
                    style={{
                      transform: isPasswordFocused
                        ? showPassword
                          ? 'translate(-10px, -45px) rotate(24deg)'
                          : 'translate(-22px, -86px) rotate(16deg)'
                        : 'translate(0px, 0px) rotate(0deg)',
                      transition: 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <path d="M268 270 C280 240 255 210 222 210 C195 210 188 245 202 276 Z" fill="#fbfbf9" stroke="#27272a" strokeWidth="3" />
                    <path d="M268 260 C262 245 240 235 215 242 L208 268 C225 272 250 270 268 260 Z" fill="#18181b" />
                    <line x1="238" y1="239" x2="238" y2="265" stroke="#fbfbf9" strokeWidth="2.5" />
                  </g>
                </g>
              </svg>
            </button>

            {/* SPEECH BUBBLE */}
            <div className="cow-speech-bubble" role="status">
              <span className="bubble-arrow" />
              <p>
                {isPasswordFocused
                  ? showPassword
                    ? "Peeking with one eye! Hehe 👁️"
                    : "I'm not looking at your passkey! 🙈"
                  : isSuccess
                  ? authMode === 'register'
                    ? "Welcome to Pashu Drishti! Registered! ✨"
                    : "Welcome back! Initializing AI vision... ✨"
                  : cowQuotes[cowQuoteIndex]}
              </p>
            </div>
          </div>

          {/* ================= AUTH MODE TABS ================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'rgba(9, 13, 17, 0.8)',
            padding: '5px',
            borderRadius: '16px',
            border: '1px solid var(--border-editorial)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              style={{
                background: authMode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: authMode === 'login' ? '#fff' : 'var(--text-secondary)',
                border: authMode === 'login' ? '1px solid var(--accent-green)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: authMode === 'login' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none'
              }}
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              style={{
                background: authMode === 'register' ? 'var(--bg-card)' : 'transparent',
                color: authMode === 'register' ? '#fff' : 'var(--text-secondary)',
                border: authMode === 'register' ? '1px solid var(--accent-green)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: authMode === 'register' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none'
              }}
              onClick={() => {
                setAuthMode('register');
                setErrorMessage('');
              }}
            >
              Create Account
            </button>
          </div>

          {/* ================= ROLE SELECTOR (ONLY IN REGISTER MODE) ================= */}
          {authMode === 'register' && (
            <div className="login-role-selector">
              <span className="role-label">CHOOSE YOUR VETERINARY ROLE:</span>
              <div className="role-pills-row">
                <button
                  type="button"
                  className={`role-pill-btn ${selectedRole === 'vet' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('vet')}
                >
                  <Stethoscope size={14} />
                  <span>Veterinarian</span>
                </button>
                <button
                  type="button"
                  className={`role-pill-btn ${selectedRole === 'farmer' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('farmer')}
                >
                  <span>🐄 Herd Owner</span>
                </button>
                <button
                  type="button"
                  className={`role-pill-btn ${selectedRole === 'researcher' ? 'active' : ''}`}
                  onClick={() => setSelectedRole('researcher')}
                >
                  <ShieldCheck size={14} />
                  <span>Surveillance</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= FORM ================= */}
          <form onSubmit={handleFormSubmit} className="login-form">
            
            {/* Error Message */}
            {errorMessage && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Full Name Field (Register Mode Only) */}
            {authMode === 'register' && (
              <div className="form-group-editorial">
                <label htmlFor="reg-name" className="input-label">
                  FULL NAME
                </label>
                <div className="input-field-wrapper">
                  <UserIcon size={18} className="input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="e.g. Dr. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="form-group-editorial">
              <label htmlFor="login-email" className="input-label">
                AUTHORIZED IDENTIFIER (EMAIL)
              </label>
              <div className={`input-field-wrapper ${isEmailFocused ? 'is-focused' : ''}`}>
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="e.g. dr.sharma@pashudrishti.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group-editorial">
              <div className="label-with-hint">
                <label htmlFor="login-password" className="input-label">
                  PASSKEY CREDENTIAL
                </label>
                <span className="cow-peeking-badge">
                  {isPasswordFocused && !showPassword ? '🙈 Cow covered eyes' : isPasswordFocused && showPassword ? '👁️ Cow is peeking!' : '🔒 Secure'}
                </span>
              </div>
              <div className={`input-field-wrapper ${isPasswordFocused ? 'is-focused' : ''}`}>
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  required
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={handleToggleShowPassword}
                  title={showPassword ? 'Hide passkey' : 'Reveal passkey'}
                  aria-label={showPassword ? 'Hide passkey' : 'Show passkey'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register Mode Only) */}
            {authMode === 'register' && (
              <div className="form-group-editorial">
                <label htmlFor="reg-confirm-password" className="input-label">
                  CONFIRM PASSKEY
                </label>
                <div className="input-field-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your passkey"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Remember Me & Recovery (Login Mode Only) */}
            {authMode === 'login' && (
              <div className="form-aux-row">
                <label className="remember-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep terminal authenticated</span>
                </label>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => alert("Passkey recovery link dispatched to your clinic/farm administrator.")}
                >
                  Forgot key?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`login-submit-btn ${isSubmitting ? 'is-loading' : ''} ${isSuccess ? 'is-done' : ''}`}
              style={{ marginTop: authMode === 'register' ? '8px' : '0' }}
            >
              {isSubmitting ? (
                <span className="btn-spinner-content">
                  <span className="spin-dot" />
                  <span>{authMode === 'register' ? 'Registering Account...' : 'Verifying Credentials...'}</span>
                </span>
              ) : isSuccess ? (
                <span className="btn-success-content">
                  <CheckCircle2 size={18} />
                  <span>{authMode === 'register' ? 'Account Created!' : 'Authenticated! Entering Dashboard...'}</span>
                </span>
              ) : (
                <span className="btn-default-content">
                  <span>{authMode === 'register' ? 'Create Pashu Drishti Account' : 'Sign In to Pashu Drishti'}</span>
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* ================= ONE-CLICK DEMO LOGINS (LOGIN MODE) ================= */}
          {authMode === 'login' && (
            <div className="demo-accounts-box">
              <div className="demo-box-header">
                <UserCheck size={14} className="text-emerald-500" />
                <span>ONE-CLICK CLINICAL DEMO PROFILES</span>
              </div>
              <div className="demo-btns-grid">
                <button
                  type="button"
                  className="demo-profile-btn"
                  onClick={() => handleQuickLogin('vet')}
                >
                  <div className="demo-role">🩺 Dr. Sharma</div>
                  <div className="demo-meta">Senior Veterinary Pathologist</div>
                </button>
                <button
                  type="button"
                  className="demo-profile-btn"
                  onClick={() => handleQuickLogin('farmer')}
                >
                  <div className="demo-role">🐄 Rajesh Patel</div>
                  <div className="demo-meta">Bovine Dairy Herd Manager</div>
                </button>
              </div>
            </div>
          )}

          {/* ================= COMPLIANCE FOOTER ================= */}
          <div className="login-card-footer">
            <div className="sec-chip">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>256-BIT ENCRYPTED</span>
            </div>
            <span className="sec-divider">•</span>
            <div className="sec-chip">
              <Sparkles size={13} className="text-amber-400" />
              <span>AI VISION 3.4 ACTIVE</span>
            </div>
            <span className="sec-divider">•</span>
            <span className="sec-text">VET SURVEILLANCE COMPLIANT</span>
          </div>

        </div>

        {/* BOTTOM BACK TO HOME LINK */}
        <div className="login-back-home">
          <Link to="/" className="back-link">
            ← Return to Pashu Drishti Home
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
