import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Activity, Heart, Stethoscope } from 'lucide-react';
import { TextReveal } from './cascade-text';

interface PointerState {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1
  normalizedY: number; // -1 to 1
}

const SPEECH_MESSAGES = [
  "Hi! 🐄",
  "Let's check your animal.",
  "Need a health check?",
  "I'm here to help!"
];

export const AnimalCareHero: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PointerState>({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const [smoothPointer, setSmoothPointer] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubbleAnimationKey, setBubbleAnimationKey] = useState(0);
  const [cowReactionActive, setCowReactionActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [cowViewMode, setCowViewMode] = useState<'mascot' | 'photo'>('mascot');

  // Play cute soft chime/pop using Web Audio API on click
  const playCuteChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Pleasant high note bounce
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Track pointer across hero
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement> | MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const relativeX = e.clientX - (rect.left + rect.width / 2);
    const relativeY = e.clientY - (rect.top + rect.height / 2);
    
    // Normalized [-1, 1] with bounds clamping
    const normX = Math.max(-1, Math.min(1, relativeX / (rect.width / 2)));
    const normY = Math.max(-1, Math.min(1, relativeY / (rect.height / 2)));

    setPointer({
      x: relativeX,
      y: relativeY,
      normalizedX: normX,
      normalizedY: normY
    });
  }, []);

  // Smooth lerp pointer coordinates for buttery 60fps animations
  useEffect(() => {
    let animId: number;
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const tick = () => {
      setSmoothPointer(prev => ({
        x: lerp(prev.x, pointer.normalizedX, 0.08),
        y: lerp(prev.y, pointer.normalizedY, 0.08)
      }));
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [pointer]);

  // Window-level mouse tracking so eyes keep following even when moving towards CTAs
  useEffect(() => {
    const onWindowMove = (e: MouseEvent) => {
      handlePointerMove(e);
    };
    window.addEventListener('mousemove', onWindowMove, { passive: true });
    return () => window.removeEventListener('mousemove', onWindowMove);
  }, [handlePointerMove]);

  // Natural blinking routine (every 3.2 - 5.5 seconds)
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let unblinkTimeout: ReturnType<typeof setTimeout>;

    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 2600;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        unblinkTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160); // Quick blink duration
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(unblinkTimeout);
    };
  }, []);

  // Cow Click Handler: Cycle speech messages & pop animation
  const handleCowClick = () => {
    playCuteChime();
    setHasInteracted(true);
    setCowReactionActive(true);
    setSpeechIndex((prev) => (prev + 1) % SPEECH_MESSAGES.length);
    setBubbleAnimationKey((prev) => prev + 1);
    setBubbleVisible(true);

    setTimeout(() => {
      setCowReactionActive(false);
    }, 450);
  };

  // Parallax offsets calculated from smooth normalized pointer
  const px = smoothPointer.x;
  const py = smoothPointer.y;

  // Cow follows cursor position dynamically across the canvas
  const cowMoveX = px * 46;
  const cowMoveY = py * 32;
  const cowTilt = px * 6;

  // Unsplash cow image card follows cursor with subtle inverted parallax
  const stockMoveX = px * -26;
  const stockMoveY = py * -18;
  const stockTilt = px * -5;

  // Multi-layered internal movement variables for cow mascot
  const bodyX = px * 12;
  const bodyY = py * 8;
  
  const headX = px * 26;
  const headY = py * 18;
  const headRotate = px * 8; // Head tilts slightly toward cursor

  const earsX = px * 22;
  const earsY = py * 14;

  const muzzleX = px * 36; // Muzzle has higher parallax for 3D depth perception
  const muzzleY = py * 24;

  // Eye pupil movement (clamped within eye whites)
  const pupilX = Math.max(-12, Math.min(12, px * 16));
  const pupilY = Math.max(-9, Math.min(9, py * 12));

  return (
    <div 
      ref={heroRef} 
      className="animalcare-hero-container"
      onPointerMove={handlePointerMove}
    >
      {/* 1. Perspective Background & Editorial Grid */}
      <div className="perspective-grid-bg">
        <div className="perspective-grid-lines" />
        <div className="perspective-vertical-rhythm" />
      </div>

      {/* Subtle Background Glow behind mascot */}
      <div 
        className="hero-radial-glow"
        style={{
          transform: `translate(${px * 25}px, ${py * 25}px)`
        }}
      />

      {/* Decorative Floating Editorial Coordinates & Badges */}
      <div className="hero-decorations">
        <div className="editorial-coordinate-stamp">
          <span className="coord-dot animate-pulse-dot" />
          <span>VET-AI PLATFORM // 24/7 SURVEILLANCE</span>
        </div>
        <div className="editorial-version-pill">
          <span>SYS.VER 3.4.0</span>
          <span className="divider">•</span>
          <span className="status-online">AI LIVE</span>
        </div>
      </div>

      {/* Main Content Layout (Left Editorial Typography + Right Interactive Cow) */}
      <div className="hero-layout-wrapper">
        
        {/* LEFT COLUMN: Editorial Typography & CTAs */}
        <div className="hero-left-content">
          
          {/* Top Brand Pill & Badge */}
          <div className="hero-top-meta">
            <div className="editorial-badge">
              <Sparkles size={13} className="text-emerald-600" />
              <span>AI POWERED</span>
            </div>
            <div className="brand-mini-label">
              <span>ANIMALCARE AI</span>
            </div>
          </div>

          {/* Main Giant Editorial Headline with Cascade Reveal Text */}
          <div className="hero-headline-group">
            <h1 className="hero-main-title">
              <span className="title-row row-1">
                <TextReveal
                  text="AI ANIMAL"
                  fontSize="clamp(3rem, 6vw, 6rem)"
                  color="var(--text-main)"
                  hoverColor="var(--accent-green)"
                  direction="up"
                  staggerDelay={35}
                />
              </span>
              <span className="title-row row-2">
                <TextReveal
                  text="HEALTH"
                  fontSize="clamp(3rem, 6vw, 6rem)"
                  color="var(--accent-green)"
                  hoverColor="#6EE7B7"
                  direction="down"
                  staggerDelay={35}
                />
                <TextReveal
                  text="CHECK"
                  fontSize="clamp(3rem, 6vw, 6rem)"
                  color="var(--text-main)"
                  hoverColor="var(--accent-green)"
                  direction="up"
                  staggerDelay={35}
                />
                {/* Hand-drawn decorative green scribble/underline */}
                <svg className="decorative-underline" viewBox="0 0 240 18" fill="none">
                  <path 
                    d="M3 14C52 4 150 2 237 11C180 5 110 9 40 15" 
                    stroke="var(--accent-green)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                  />
                </svg>
              </span>
            </h1>

            {/* Supporting Subtitle */}
            <p className="hero-supporting-text">
              Helping you understand animal health with veterinary-grade computer vision and real-time clinical recommendations for cattle, pets, and livestock.
            </p>
          </div>

          {/* Large Pill-Shaped CTA & Secondary Action */}
          <div className="hero-cta-group">
            <button 
              id="hero-detect-cta"
              onClick={() => navigate('/detect')}
              className="btn-pill-primary hero-main-cta"
              aria-label="Detect Disease"
            >
              <span>Detect Disease</span>
              <ArrowUpRight size={20} className="cta-arrow-icon" />
            </button>

            <button 
              id="hero-explore-cta"
              onClick={() => navigate('/diseases')}
              className="btn-pill-secondary hero-secondary-cta"
              aria-label="Explore Diseases"
            >
              <span>Explore Diseases</span>
            </button>

            {/* Hand-drawn curved arrow pointing to mascot or CTA */}
            <div className="hand-drawn-arrow-indicator">
              <svg width="68" height="52" viewBox="0 0 68 52" fill="none">
                <path 
                  d="M10 12C28 6 52 14 56 34M56 34L44 32M56 34L59 22" 
                  stroke="#10B981" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
              <span className="arrow-caption">Instant Scan</span>
            </div>
          </div>

          {/* Bottom Information Row (Replacing design services) */}
          <div className="hero-bottom-info-strip">
            <div className="info-strip-item">
              <div className="item-icon-wrap">
                <Activity size={16} />
              </div>
              <div className="item-text">
                <span className="item-title">AI DETECTION</span>
                <span className="item-desc">Multi-species vision analysis</span>
              </div>
            </div>

            <div className="strip-divider" />

            <div className="info-strip-item">
              <div className="item-icon-wrap">
                <Heart size={16} />
              </div>
              <div className="item-text">
                <span className="item-title">ANIMAL HEALTH</span>
                <span className="item-desc">Livestock & companion triage</span>
              </div>
            </div>

            <div className="strip-divider" />

            <div className="info-strip-item">
              <div className="item-icon-wrap">
                <Stethoscope size={16} />
              </div>
              <div className="item-text">
                <span className="item-title">DISEASE INSIGHTS</span>
                <span className="item-desc">Actionable veterinary protocols</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: The Interactive Cute Cow Mascot 🐄 & Real Bovine Stock Image */}
        <div className="hero-right-mascot-zone">
          {/* Cow View Switcher */}
          <div className="cow-switcher-pills">
            <button 
              type="button"
              className={`cow-switch-pill ${cowViewMode === 'mascot' ? 'active' : ''}`}
              onClick={() => setCowViewMode('mascot')}
            >
              <span>🐄 3D Mascot</span>
            </button>
            <button 
              type="button"
              className={`cow-switch-pill ${cowViewMode === 'photo' ? 'active' : ''}`}
              onClick={() => setCowViewMode('photo')}
            >
              <span>📸 Real Cow Photo</span>
            </button>
          </div>

          {cowViewMode === 'photo' ? (
            /* Full Real Cow Photograph Following Cursor */
            <div 
              className="hero-cow-photo-container"
              style={{
                transform: `translate3d(${cowMoveX}px, ${cowMoveY}px, 0) rotate(${cowTilt}deg)`,
                transition: 'transform 0.12s ease-out'
              }}
            >
              <img 
                src="https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=900&auto=format&fit=crop&q=80" 
                alt="Clinical Holstein Bovine"
                className="hero-cow-full-photo" 
              />
              <div className="cow-photo-scan-grid" />
              <div className="stock-scan-overlay" style={{ padding: '16px' }}>
                <div className="stock-crosshair" style={{ width: '32px', height: '32px', borderWidth: '2px' }} />
                <div className="cow-photo-overlay-tag">
                  <span className="coord-dot animate-pulse-dot" />
                  <span>AI CLINICAL FEED: BOVINE SUBJECT // ONLINE</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Floating Real Unsplash Stock Cow Card with Cursor Follow */}
              <div 
                className="cow-live-stock-card"
                style={{
                  transform: `translate3d(${stockMoveX}px, ${stockMoveY}px, 0) rotate(${stockTilt}deg)`,
                  transition: 'transform 0.12s ease-out'
                }}
                onClick={() => setCowViewMode('photo')}
                title="Click to view real cow photo"
                style-pointer="cursor"
              >
                <div className="stock-card-media">
                  <img 
                    src="https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80" 
                    alt="Clinical Bovine Subject" 
                    className="stock-cow-img"
                  />
                  <div className="stock-scan-overlay">
                    <div className="stock-crosshair" />
                    <span className="stock-badge">
                      <span className="coord-dot animate-pulse-dot" />
                      <span>BOVINE TARGET</span>
                    </span>
                  </div>
                </div>
                <div className="stock-card-desc">
                  <span className="stock-label">LIVE TRACKING</span>
                  <span className="stock-species">Pasture Bovine Monitor</span>
                </div>
              </div>

              <div 
                className={`mascot-interactive-canvas ${cowReactionActive ? 'cow-reacting' : ''}`}
                onClick={handleCowClick}
                style={{
                  transform: `translate3d(${cowMoveX}px, ${cowMoveY}px, 0) rotate(${cowTilt}deg)`,
                  transition: 'transform 0.12s ease-out',
                  minHeight: '440px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                title="Click me to say hello!"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCowClick(); }}
              >
                {/* Click me hint badge if user hasn't clicked yet */}
                {!hasInteracted && (
                  <div className="mascot-click-hint">
                    <span className="hint-pulse" />
                    <span>Tap the cow! 💬</span>
                  </div>
                )}

                {/* Speech Bubble Container */}
                {bubbleVisible && (
                  <div 
                    key={bubbleAnimationKey}
                    className="cow-speech-bubble speech-bubble-pop"
                  >
                    <div className="bubble-content">
                      <span className="bubble-text">{SPEECH_MESSAGES[speechIndex]}</span>
                    </div>
                    {/* Speech tail pointing to cow's mouth */}
                    <div className="bubble-tail" />
                  </div>
                )}

                {/* Floating AnimalCare AI Bio-Badge */}
                <div 
                  className="mascot-floating-tag"
                  style={{
                    transform: `translate(${px * -14}px, ${py * -10}px)`
                  }}
                >
                  <div className="tag-inner">
                    <span className="tag-cow-icon">🐄</span>
                    <div>
                      <div className="tag-title">Mascot: Clover</div>
                      <div className="tag-sub">Chief Health Inspector</div>
                    </div>
                  </div>
                </div>

                {/* SVG Cow Mascot — 100% Vector, Multi-Layered Interactive Structure */}
                <div 
                  className="cow-svg-wrapper cow-breathing"
                  style={{
                    transform: `translate3d(${bodyX * 0.4}px, ${bodyY * 0.4}px, 0)`,
                    width: '100%',
                    maxWidth: '460px',
                    minHeight: '440px',
                    display: 'block'
                  }}
                >
                  <svg 
                    viewBox="0 0 520 620" 
                    width="520"
                    height="620"
                    className="cow-svg" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: '100%', height: 'auto', minHeight: '440px', display: 'block' }}
                  >
                <defs>
                  {/* Subtle 3D Gradients for Warm, Premium Vector Look */}
                  {/* Body cream gradient */}
                  <linearGradient id="cowBodyGrad" x1="260" y1="280" x2="260" y2="580" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="65%" stopColor="#F9F7F1" />
                    <stop offset="100%" stopColor="#ECE6DA" />
                  </linearGradient>

                  {/* Head cream gradient */}
                  <radialGradient id="cowHeadGrad" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="70%" stopColor="#FBF9F3" />
                    <stop offset="100%" stopColor="#EADBCA" />
                  </radialGradient>

                  {/* Natural Black Patches Gradient */}
                  <linearGradient id="cowPatchGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2A2C33" />
                    <stop offset="70%" stopColor="#1C1D22" />
                    <stop offset="100%" stopColor="#121316" />
                  </linearGradient>

                  {/* Horns Warm Caramel Gradient */}
                  <linearGradient id="cowHornGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#D4A76A" />
                    <stop offset="60%" stopColor="#E8C896" />
                    <stop offset="100%" stopColor="#F6E7CA" />
                  </linearGradient>

                  {/* Snout Warm Rose/Peach Gradient */}
                  <linearGradient id="cowSnoutGrad" x1="260" y1="260" x2="260" y2="380" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFCCD5" />
                    <stop offset="60%" stopColor="#FFAAA6" />
                    <stop offset="100%" stopColor="#F3929C" />
                  </linearGradient>

                  {/* Inner Ear Soft Peach Gradient */}
                  <linearGradient id="cowInnerEarGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFCCD5" />
                    <stop offset="100%" stopColor="#F49CA7" />
                  </linearGradient>

                  {/* Ambient Floor Shadow */}
                  <radialGradient id="cowFloorShadow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(24, 28, 33, 0.22)" />
                    <stop offset="50%" stopColor="rgba(24, 28, 33, 0.08)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>

                  {/* Emerald Bio-Pendant Collar Gradient */}
                  <linearGradient id="pendantGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>

                  {/* Drop Shadow Filter */}
                  <filter id="cowSubtleShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#1E2024" floodOpacity="0.08" />
                  </filter>
                  <filter id="snoutShadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#3F2329" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* 1. Floor Shadow (Ambient) */}
                <ellipse 
                  cx="260" 
                  cy="590" 
                  rx="160" 
                  ry="26" 
                  fill="url(#cowFloorShadow)" 
                  style={{
                    transform: `scale(${1 - Math.abs(smoothPointer.x) * 0.05})`,
                    transformOrigin: '260px 590px'
                  }}
                />

                {/* 2. Body Layer (Subtle Shift) */}
                <g 
                  className="cow-layer-body"
                  style={{
                    transform: `translate(${bodyX}px, ${bodyY}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                  filter="url(#cowSubtleShadow)"
                >
                  {/* Cow Torso / Chest shape */}
                  <path 
                    d="M150 440C150 370 190 340 260 340C330 340 370 370 370 440C370 510 350 580 260 580C170 580 150 510 150 440Z" 
                    fill="url(#cowBodyGrad)" 
                  />
                  {/* Cute Holstein patch on body left */}
                  <path 
                    d="M152 410C165 390 195 385 210 410C220 425 215 455 195 470C175 485 155 460 152 410Z" 
                    fill="url(#cowPatchGrad)" 
                    opacity="0.95"
                  />
                  {/* Subtle Holstein patch on body right */}
                  <path 
                    d="M340 450C365 440 370 475 365 510C360 535 340 540 325 525C310 510 320 460 340 450Z" 
                    fill="url(#cowPatchGrad)" 
                    opacity="0.95"
                  />
                  {/* Front Little Hooves / Paws peeking forward */}
                  <g className="cow-hooves">
                    <ellipse cx="205" cy="565" rx="30" ry="20" fill="#E8E2D5" />
                    <path d="M190 560C190 550 220 550 220 560C220 575 190 575 190 560Z" fill="#1C1D22" />
                    <line x1="205" y1="552" x2="205" y2="572" stroke="#E8E2D5" strokeWidth="2.5" />

                    <ellipse cx="315" cy="565" rx="30" ry="20" fill="#E8E2D5" />
                    <path d="M300 560C300 550 330 550 330 560C330 575 300 575 300 560Z" fill="#1C1D22" />
                    <line x1="315" y1="552" x2="315" y2="572" stroke="#E8E2D5" strokeWidth="2.5" />
                  </g>

                  {/* Collar Ribbon with AI Medical Cross Charm */}
                  <path 
                    d="M205 380C230 395 290 395 315 380" 
                    stroke="#10B981" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />
                  {/* Medical / AI Bio Pendant */}
                  <g transform="translate(260, 396)">
                    <circle cx="0" cy="0" r="16" fill="url(#pendantGrad)" filter="url(#snoutShadow)" />
                    {/* Plus / Cross Icon on Collar */}
                    <rect x="-3" y="-9" width="6" height="18" rx="2" fill="#FFFFFF" />
                    <rect x="-9" y="-3" width="18" height="6" rx="2" fill="#FFFFFF" />
                    <circle cx="0" cy="0" r="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                  </g>
                </g>

                {/* 3. HEAD & EARS LAYER (Smooth Parallax Tilt & Turn) */}
                <g 
                  className="cow-layer-head"
                  style={{
                    transform: `translate(${headX}px, ${headY}px) rotate(${headRotate}deg)`,
                    transformOrigin: '260px 240px',
                    transition: 'transform 0.08s ease-out'
                  }}
                  filter="url(#cowSubtleShadow)"
                >
                  {/* Cow Horns (Small, smooth, rounded and friendly) */}
                  <g className="cow-horns">
                    {/* Left Horn */}
                    <path 
                      d="M175 130C165 95 130 80 120 85C118 105 135 130 160 145Z" 
                      fill="url(#cowHornGrad)" 
                    />
                    <path d="M125 90C132 105 145 120 160 130" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                    
                    {/* Right Horn */}
                    <path 
                      d="M345 130C355 95 390 80 400 85C402 105 385 130 360 145Z" 
                      fill="url(#cowHornGrad)" 
                    />
                    <path d="M395 90C388 105 375 120 360 130" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Cow Ears with gentle independent twitch */}
                  <g 
                    className="cow-ears"
                    style={{
                      transform: `translate(${earsX * 0.25}px, ${earsY * 0.25}px)`
                    }}
                  >
                    {/* Left Ear */}
                    <g style={{ transformOrigin: '160px 170px' }}>
                      <path 
                        d="M165 175C125 155 75 175 60 210C65 240 110 245 155 205Z" 
                        fill="url(#cowBodyGrad)" 
                      />
                      {/* Left Inner Ear Peach */}
                      <path 
                        d="M150 182C120 170 85 185 75 210C80 230 115 230 145 202Z" 
                        fill="url(#cowInnerEarGrad)" 
                      />
                    </g>

                    {/* Right Ear (Has a stylish Holstein patch) */}
                    <g style={{ transformOrigin: '360px 170px' }}>
                      <path 
                        d="M355 175C395 155 445 175 460 210C455 240 410 245 365 205Z" 
                        fill="url(#cowPatchGrad)" 
                      />
                      {/* Right Inner Ear Peach */}
                      <path 
                        d="M370 182C400 170 435 185 445 210C440 230 405 230 375 202Z" 
                        fill="url(#cowInnerEarGrad)" 
                      />
                    </g>
                  </g>

                  {/* Main Head Shape: Big friendly rounded shape */}
                  <path 
                    d="M150 200C140 130 200 90 260 90C320 90 380 130 370 200C375 270 360 330 260 330C160 330 145 270 150 200Z" 
                    fill="url(#cowHeadGrad)" 
                  />

                  {/* Iconic Large Holstein Patch on Upper Right of Head */}
                  <path 
                    d="M260 90C315 90 370 120 370 195C370 230 355 265 330 270C305 275 295 240 290 210C285 180 270 150 240 135C245 110 250 90 260 90Z" 
                    fill="url(#cowPatchGrad)" 
                    opacity="0.97"
                  />

                  {/* Cute Forehead Hair Tuft */}
                  <path 
                    d="M245 92C250 78 265 76 270 88C275 75 290 80 288 94C280 102 255 102 245 92Z" 
                    fill="#FFFFFF" 
                  />

                  {/* Rosy Cheeks */}
                  <ellipse cx="160" cy="275" rx="22" ry="14" fill="#F472B6" opacity="0.32" />
                  <ellipse cx="360" cy="275" rx="22" ry="14" fill="#F472B6" opacity="0.32" />

                  {/* 4. EYES & BROWS (High Parallax Tracking + Natural Blinking) */}
                  <g 
                    className="cow-eyes-group"
                    style={{
                      transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
                      transformOrigin: '260px 210px',
                      transition: 'transform 0.12s ease-in-out'
                    }}
                  >
                    {/* LEFT EYE */}
                    <g className="cow-left-eye">
                      {/* Left Eye White */}
                      <ellipse cx="195" cy="210" rx="28" ry="32" fill="#FFFFFF" filter="url(#snoutShadow)" />
                      {/* Left Eye Socket Inner Shadow */}
                      <ellipse cx="195" cy="204" rx="26" ry="28" fill="#F3EFE6" opacity="0.4" />
                      
                      {/* Left Pupil + Iris (Moves toward cursor!) */}
                      <g style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }}>
                        {/* Iris base */}
                        <ellipse cx="195" cy="210" rx="20" ry="22" fill="#1C1D24" />
                        <ellipse cx="195" cy="212" rx="17" ry="19" fill="#0F172A" />
                        {/* Emerald Ring Accent for AI connection */}
                        <circle cx="195" cy="210" r="14" stroke="#10B981" strokeWidth="1.8" opacity="0.85" />
                        
                        {/* Specular Highlights (Sparkle) */}
                        <circle cx="188" cy="202" r="7.5" fill="#FFFFFF" />
                        <circle cx="203" cy="218" r="3.2" fill="#FFFFFF" opacity="0.85" />
                        <circle cx="186" cy="218" r="1.8" fill="#FFFFFF" opacity="0.75" />
                      </g>

                      {/* Left Friendly Eyelash / Brow */}
                      <path 
                        d="M170 178C185 168 215 172 225 182" 
                        stroke="#2B2D35" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                      />
                    </g>

                    {/* RIGHT EYE */}
                    <g className="cow-right-eye">
                      {/* Right Eye White */}
                      <ellipse cx="325" cy="210" rx="28" ry="32" fill="#FFFFFF" filter="url(#snoutShadow)" />
                      {/* Right Eye Socket Inner Shadow */}
                      <ellipse cx="325" cy="204" rx="26" ry="28" fill="#F3EFE6" opacity="0.4" />

                      {/* Right Pupil + Iris (Moves toward cursor!) */}
                      <g style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }}>
                        {/* Iris base */}
                        <ellipse cx="325" cy="210" rx="20" ry="22" fill="#1C1D24" />
                        <ellipse cx="325" cy="212" rx="17" ry="19" fill="#0F172A" />
                        {/* Emerald Ring Accent */}
                        <circle cx="325" cy="210" r="14" stroke="#10B981" strokeWidth="1.8" opacity="0.85" />

                        {/* Specular Highlights (Sparkle) */}
                        <circle cx="318" cy="202" r="7.5" fill="#FFFFFF" />
                        <circle cx="333" cy="218" r="3.2" fill="#FFFFFF" opacity="0.85" />
                        <circle cx="316" cy="218" r="1.8" fill="#FFFFFF" opacity="0.75" />
                      </g>

                      {/* Right Friendly Eyelash / Brow */}
                      <path 
                        d="M295 182C305 172 335 168 350 178" 
                        stroke="#2B2D35" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                      />
                    </g>
                  </g>

                  {/* 5. CUTE SNOUT / MUZZLE LAYER (Moves further for 3D depth) */}
                  <g 
                    className="cow-snout-group"
                    style={{
                      transform: `translate(${muzzleX * 0.4}px, ${muzzleY * 0.4}px)`,
                      transition: 'transform 0.06s ease-out'
                    }}
                    filter="url(#snoutShadow)"
                  >
                    {/* Pink Oval Snout */}
                    <path 
                      d="M170 300C170 260 210 245 260 245C310 245 350 260 350 300C350 340 310 355 260 355C210 355 170 340 170 300Z" 
                      fill="url(#cowSnoutGrad)" 
                    />
                    {/* Subtle top snout highlight */}
                    <ellipse cx="260" cy="260" rx="60" ry="8" fill="rgba(255, 255, 255, 0.4)" />

                    {/* Cute Nostrils */}
                    <g className="cow-nostrils">
                      <ellipse cx="225" cy="295" rx="10" ry="14" fill="#884250" />
                      <ellipse cx="223" cy="297" rx="7" ry="10" fill="#5E2732" />
                      <circle cx="227" cy="292" r="2.5" fill="rgba(255,255,255,0.3)" />

                      <ellipse cx="295" cy="295" rx="10" ry="14" fill="#884250" />
                      <ellipse cx="297" cy="297" rx="7" ry="10" fill="#5E2732" />
                      <circle cx="293" cy="292" r="2.5" fill="rgba(255,255,255,0.3)" />
                    </g>

                    {/* Gentle, Happy Cow Smile */}
                    <path 
                      d="M236 325C246 335 274 335 284 325" 
                      stroke="#884250" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                    />
                  </g>
                </g>
              </svg>
            </div>

            {/* Mascot Base Plate / Editorial Platform Ring */}
            <div className="mascot-platform-ring">
              <div className="ring-pulse" />
            </div>

          </div>
        </>
      )}
    </div>

      </div>

      {/* Decorative Sparkles & Hand-Drawn Editorial Accents */}
      <div className="editorial-sparkle sparkle-top-right">
        <Sparkles size={22} className="sparkle-icon text-emerald-500" />
      </div>
      <div className="editorial-sparkle sparkle-mid-left">
        <Sparkles size={16} className="sparkle-icon text-emerald-400" />
      </div>
    </div>
  );
};
export default AnimalCareHero;
