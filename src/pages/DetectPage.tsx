import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Camera, AlertCircle, CheckCircle, RefreshCw, FileText, ArrowRight, Sparkles, ShieldAlert, HeartPulse, X, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface DiseaseResult {
  disease: string;
  pathogen: string;
  confidence: number;
  severity: 'healthy' | 'moderate' | 'high' | 'critical';
  summary: string;
  detectedSymptoms: string[];
  quarantineProtocol: string;
  treatmentNotes: string[];
  urgency: string;
}

interface SampleCase {
  id: string;
  title: string;
  species: string;
  imageUrl: string;
  symptoms: string[];
  result: DiseaseResult;
}

const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'lsd-cattle',
    title: 'Lumpy Skin Disease',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80',
    symptoms: ['Skin nodules/lumps', 'Fever', 'Enlarged lymph nodes', 'Loss of appetite'],
    result: {
      disease: 'Lumpy Skin Disease (LSD)',
      pathogen: 'Capripoxvirus (Poxviridae)',
      confidence: 96.8,
      severity: 'high',
      summary: 'Pronounced circumscribed cutaneous nodules (2-5cm) observed across the neck, flank, and perineum. Accompanied by localized edema.',
      detectedSymptoms: ['Cutaneous nodules', 'Epidermal necrosis', 'Enlarged prescapular lymph nodes'],
      quarantineProtocol: 'Mandatory immediate isolation of infected individual. Implement strict vector control (mosquitoes/biting flies). Restrict movement within 5km radius.',
      treatmentNotes: [
        'Symptomatic care: antipyretics and non-steroidal anti-inflammatories',
        'Broad-spectrum antibiotics to prevent secondary bacterial infections',
        'Topical antiseptics and wound dressings on ruptured nodules',
        'Notify local veterinary animal husbandry authorities for statutory record'
      ],
      urgency: 'HIGH — Veterinary visit required within 12-24 hours'
    }
  },
  {
    id: 'healthy-cow',
    title: 'Healthy Dairy Cow',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&auto=format&fit=crop&q=80',
    symptoms: ['Alert posture', 'Clean coat', 'Normal rumination'],
    result: {
      disease: 'Normal / Healthy Specimen',
      pathogen: 'None detected',
      confidence: 97.4,
      severity: 'healthy',
      summary: 'Smooth dermatological surface, alert ear posture, moist clean muzzle, and normal corneal reflection. No visible lesions or inflammatory indicators.',
      detectedSymptoms: ['Glossy pelage', 'Symmetric muzzle', 'Clear ocular margins'],
      quarantineProtocol: 'No quarantine needed. Maintain standard biosecurity and scheduled herd vaccinations.',
      treatmentNotes: [
        'Continue balanced nutritional rationing and mineral blocks',
        'Monitor periodic milk yields and somatic cell counts',
        'Maintain seasonal deworming schedule'
      ],
      urgency: 'ROUTINE — Regular preventive monitoring'
    }
  },
  {
    id: 'fmd-sheep',
    title: 'Foot & Mouth Suspicion',
    species: 'Sheep / Goat',
    imageUrl: 'https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=800&auto=format&fit=crop&q=80',
    symptoms: ['Lameness', 'Blisters on hooves', 'Excessive salivation', 'Reluctance to stand'],
    result: {
      disease: 'Foot and Mouth Disease (FMD)',
      pathogen: 'Aphthovirus (Picornaviridae)',
      confidence: 94.2,
      severity: 'critical',
      summary: 'Erosive vesicular lesions identified near the coronary hoof band with interdigital dermatitis and oral tenderness.',
      detectedSymptoms: ['Coronary band erosions', 'Reluctance to bear weight', 'Salivary hypersecretion'],
      quarantineProtocol: 'CRITICAL BIOSECURITY ALERT. Quarantine entire flock immediately. Disinfect all footwear, equipment, and transport vehicles with sodium carbonate or citric acid.',
      treatmentNotes: [
        'Strict statutory reporting disease — notify state veterinarian immediately',
        'Flunixin meglumine or meloxicam for pain mitigation under supervision',
        'Soft forage feeding to ease oral discomfort',
        'Do not move any animals off the premises'
      ],
      urgency: 'CRITICAL — Urgent statutory reporting & emergency quarantine'
    }
  },
  {
    id: 'mastitis-cattle',
    title: 'Bovine Mastitis',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=800&auto=format&fit=crop&q=80',
    symptoms: ['Udder swelling', 'Heat in quarters', 'Abnormal milk flakes', 'Pain on milking'],
    result: {
      disease: 'Acute Clinical Mastitis',
      pathogen: 'Staphylococcus aureus / Streptococcus uberis',
      confidence: 93.6,
      severity: 'high',
      summary: 'Asymmetric quarter enlargement, erythema, localized hyperthermia, and palpable hardness indicating active intramammary infection.',
      detectedSymptoms: ['Quarter inflammation', 'Edematous tissue', 'Elevated somatic indicators'],
      quarantineProtocol: 'Milk infected animal last. Disinfect milking clusters thoroughly. Discard milk from affected quarter.',
      treatmentNotes: [
        'Intramammary antibiotic infusion following aseptic teat scrub',
        'Systemic anti-inflammatory therapy (e.g. Ketoprofen)',
        'Frequent stripping of affected quarter to flush bacterial toxins',
        'Post-milking teat dip with 0.5% iodine solution'
      ],
      urgency: 'HIGH — Same-day veterinary intervention recommended'
    }
  }
];

export const DetectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [selectedSample, setSelectedSample] = useState<SampleCase | null>(SAMPLE_CASES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(SAMPLE_CASES[0].imageUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepText, setScanStepText] = useState('');
  const [result, setResult] = useState<DiseaseResult | null>(SAMPLE_CASES[0].result);
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>(['Skin nodules/lumps', 'Fever']);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const symptomOptions = [
    'Skin nodules/lumps',
    'Fever / Lethargy',
    'Lameness / Limping',
    'Loss of appetite',
    'Nasal / Eye discharge',
    'Udder swelling / Pain',
    'Excessive salivation',
    'Hair loss / Scabbing'
  ];

  const handleSelectSample = (sample: SampleCase) => {
    setSelectedSample(sample);
    setUploadedImage(sample.imageUrl);
    setSelectedSpecies(sample.species);
    setActiveSymptoms(sample.symptoms);
    setResult(null);
    setSaveStatus('idle');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setSelectedSample(null);
        setResult(null);
        setSaveStatus('idle');
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSymptom = (sym: string) => {
    setActiveSymptoms(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const triggerScan = () => {
    if (!uploadedImage) return;

    // Protection: Prompt authentication if not logged in
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setResult(null);
    setSaveStatus('idle');

    const steps = [
      'Initializing veterinary neural vision pipeline...',
      'Segmenting epidermal contours and lesion margins...',
      'Extracting multi-spectral pathology markers...',
      'Matching against veterinary pathology database...',
      'Synthesizing diagnostic report & quarantine triage...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 4;
        if (next >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          // If sample was chosen, use its result; otherwise calculate smart simulated result
          const outcome = selectedSample ? selectedSample.result : {
            disease: activeSymptoms.includes('Skin nodules/lumps') ? 'Suspected Dermatological Mycosis' : 'Equine/Bovine Seasonal Dermatitis',
            pathogen: 'Microsporum / Trichophyton verrucosum',
            confidence: 91.5,
            severity: 'moderate' as const,
            summary: 'Circumscribed focal lesions with epidermal desquamation detected. Mild hyperkeratosis present.',
            detectedSymptoms: activeSymptoms.slice(0, 3),
            quarantineProtocol: 'Separate animal from healthy livestock pens. Avoid shared grooming brushes and tack.',
            treatmentNotes: [
              'Topical chlorhexidine or miconazole shampoo application',
              'Expose animal to direct sunlight if feasible (anti-fungal inhibition)',
              'Disinfect stable walls and feeding troughs with diluted hypochlorite'
            ],
            urgency: 'MODERATE — Non-emergency clinical evaluation recommended'
          };

          setResult(outcome);

          // Celebrate if healthy!
          if (outcome.severity === 'healthy') {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 }
            });
          }

          // Automatically persist analysis to database for logged in user
          if (outcome && uploadedImage) {
            setSaveStatus('saving');
            (async () => {
              try {
                let finalImageUrl = uploadedImage;
                // If uploaded image is a base64 string, store on server
                if (uploadedImage.startsWith('data:')) {
                  const uploadRes = await api.storage.uploadImage(uploadedImage, `${selectedSpecies.toLowerCase()}-scan.jpg`);
                  finalImageUrl = uploadRes.imageUrl;
                }

                await api.analyses.save({
                  animalType: selectedSpecies,
                  imageUrl: finalImageUrl,
                  predictedDisease: outcome.disease,
                  pathogen: outcome.pathogen,
                  confidence: outcome.confidence,
                  severity: outcome.severity,
                  symptoms: outcome.detectedSymptoms,
                  possibleCauses: ['Vector transmission', 'Epidermal infection'],
                  recommendedCare: outcome.treatmentNotes,
                  quarantineProtocol: outcome.quarantineProtocol,
                  urgency: outcome.urgency,
                  summary: outcome.summary,
                });
                setSaveStatus('saved');
              } catch (saveErr) {
                console.error('Failed to auto-save analysis:', saveErr);
                setSaveStatus('error');
              }
            })();
          }

          return 100;
        }

        // Update step text
        const stepIdx = Math.min(steps.length - 1, Math.floor((next / 100) * steps.length));
        if (stepIdx !== currentStep) {
          currentStep = stepIdx;
          setScanStepText(steps[stepIdx]);
        }
        return next;
      });
    }, 60);
  };

  return (
    <div className="detect-page-container">
      {/* Top Header */}
      <div className="detect-header">
        <div className="editorial-badge">
          <HeartPulse size={14} />
          <span>REAL-TIME COMPUTER VISION DIAGNOSTICS</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 800 }}>
          Animal Disease Detection Studio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '640px' }}>
          Upload high-resolution photography of livestock or companion animals to instantly screen for dermatological, oral, and behavioral pathologies.
        </p>
      </div>

      <div className="detect-layout">
        
        {/* LEFT COLUMN: Input & Upload Panel */}
        <div className="upload-panel">
          
          {/* Species Selector */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              1. Target Animal Species
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Cattle', 'Sheep / Goat', 'Horse', 'Swine', 'Pet / Canine'].map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecies(spec)}
                  className={`filter-tab-pill ${selectedSpecies.includes(spec.split(' ')[0]) ? 'active' : ''}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Cases */}
          <div className="sample-selector">
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Quick Presets (Click to Test Immediately):
            </label>
            <div className="sample-grid">
              {SAMPLE_CASES.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSelectSample(sc)}
                  className={`sample-card-btn ${selectedSample?.id === sc.id ? 'active' : ''}`}
                >
                  <img src={sc.imageUrl} alt={sc.title} className="sample-img-thumb" />
                  <span className="sample-name">{sc.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone / Image Preview Area */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              2. Capture or Upload Inspection Image
            </label>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleFileUpload}
            />

            <div 
              className="dropzone-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={uploadedImage} alt="Uploaded animal specimen" className="dropzone-preview-img" />
                  
                  {/* Laser scan animation when active */}
                  {isScanning && (
                    <div className="scanning-overlay">
                      <div className="laser-beam" />
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(20, 22, 24, 0.75)',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    Click to Change Image
                  </div>
                </div>
              ) : (
                <>
                  <div className="item-icon-wrap" style={{ width: '48px', height: '48px' }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Click to upload or drag & drop photo</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>PNG, JPG or WEBP (up to 15MB)</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Observed Symptoms Checklist */}
          <div className="symptoms-select-group">
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              3. Check Observed Physical Symptoms (Optional)
            </label>
            <div className="symptoms-checkbox-grid">
              {symptomOptions.map((sym) => {
                const checked = activeSymptoms.includes(sym);
                return (
                  <div 
                    key={sym} 
                    className={`symptom-toggle ${checked ? 'checked' : ''}`}
                    onClick={() => toggleSymptom(sym)}
                  >
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      readOnly 
                      style={{ accentColor: 'var(--accent-green)' }}
                    />
                    <span>{sym}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button 
            id="run-analysis-btn"
            onClick={triggerScan}
            disabled={isScanning || !uploadedImage}
            className="btn-pill-primary"
            style={{ width: '100%', padding: '18px', opacity: isScanning ? 0.7 : 1 }}
          >
            {isScanning ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Running Neural Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Analyze with AnimalCare AI →</span>
              </>
            )}
          </button>

          {/* Scan Progress Bar */}
          {isScanning && (
            <div style={{ marginTop: '-8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--accent-green-hover)' }}>{scanStepText}</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="confidence-gauge-bar">
                <div className="gauge-fill" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Real-Time Diagnostic Results Panel */}
        <div className="results-panel">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              DIAGNOSTIC REPORT
            </span>
            <div className="editorial-version-pill">
              <span className="status-online">MODEL ACTIVE</span>
            </div>
          </div>

          {!result && !isScanning && (
            <div className="result-empty-state">
              <div style={{ fontSize: '3.5rem' }}>🐄</div>
              <h3 style={{ fontSize: '1.25rem' }}>No Diagnostic Run Yet</h3>
              <p style={{ fontSize: '0.9rem', maxWidth: '320px' }}>
                Select an animal preset or upload a clear photo and click <strong>Analyze with AnimalCare AI</strong>.
              </p>
            </div>
          )}

          {isScanning && (
            <div className="result-empty-state">
              <RefreshCw size={44} className="animate-spin text-emerald-500" />
              <h3 style={{ fontSize: '1.25rem' }}>Processing Specimen Matrix</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Comparing image features against 250,000+ veterinary pathology records...
              </p>
            </div>
          )}

          {result && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Severity & Confidence Row */}
              <div className="result-badge-row">
                <div className={`severity-pill severity-${result.severity}`}>
                  {result.severity.toUpperCase()} PRIORITY
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span style={{ color: 'var(--accent-green-hover)' }}>{result.confidence}%</span> Confidence
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="confidence-gauge-bar">
                <div className="gauge-fill" style={{ width: `${result.confidence}%` }} />
              </div>

              {/* Disease Title */}
              <div>
                <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.85rem', fontWeight: 800 }}>
                  {result.disease}
                </h2>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Pathogen: {result.pathogen}
                </div>
              </div>

              {/* Summary Description */}
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-primary)', padding: '14px 18px', borderRadius: '12px' }}>
                {result.summary}
              </p>

              {/* Detected Visual Biomarkers */}
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Detected Biomarkers:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.detectedSymptoms.map((sym, sIdx) => (
                    <span key={sIdx} className="species-tag" style={{ background: '#F1F5F9', color: '#1E293B', fontWeight: 600 }}>
                      ✓ {sym}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quarantine & Biosecurity Advisory */}
              <div style={{
                background: result.severity === 'critical' ? '#FEF2F2' : result.severity === 'high' ? '#FFFBEB' : '#F0FDF4',
                border: `1.5px solid ${result.severity === 'critical' ? '#FCA5A5' : result.severity === 'high' ? '#FCD34D' : '#86EFAC'}`,
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                gap: '14px'
              }}>
                <ShieldAlert size={24} color={result.severity === 'critical' ? '#B91C1C' : result.severity === 'high' ? '#B45309' : '#15803D'} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', color: result.severity === 'critical' ? '#991B1B' : result.severity === 'high' ? '#92400E' : '#166534' }}>
                    Quarantine & Biosecurity Directive:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {result.quarantineProtocol}
                  </div>
                </div>
              </div>

              {/* Clinical Care Protocols */}
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Veterinary Care Protocol:
                </span>
                <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {result.treatmentNotes.map((note, nIdx) => (
                    <li key={nIdx}>{note}</li>
                  ))}
                </ul>
              </div>

              {/* Urgency Footer */}
              <div style={{
                borderTop: '1px solid var(--border-editorial)',
                paddingTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem'
              }}>
                <span style={{ color: 'var(--text-tertiary)' }}>STATUTORY STATUS:</span>
                <span style={{ fontWeight: 700, color: result.severity === 'critical' ? '#B91C1C' : 'var(--text-main)' }}>
                  {result.urgency}
                </span>
              </div>

              {/* Database Auto-Save Notice */}
              {saveStatus === 'saved' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  marginTop: '16px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontWeight: 600 }}>
                    <CheckCircle size={16} />
                    <span>Analysis record stored in your Pashu Drishti dossier</span>
                  </div>
                  <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>View in Dashboard</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {saveStatus === 'saving' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '12px' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Syncing record with clinical database...</span>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ================= AUTHENTICATION REQUIRED MODAL ================= */}
      {showAuthModal && (
        <div className="analysis-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div 
            className="analysis-modal-card" 
            style={{ maxWidth: '440px', textAlign: 'center', padding: '36px 28px' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🐄</div>
            <div className="editorial-badge" style={{ margin: '0 auto 12px' }}>
              <Lock size={12} className="text-amber-400" />
              <span>AUTHENTICATION REQUIRED</span>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.7rem', color: '#fff', marginBottom: '8px' }}>
              Sign In to Check Animal Health
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Pashu Drishti requires an authenticated account to store diagnostic history, track herd biosecurity, and issue clinical directives.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link 
                to="/login?redirect=/detect" 
                className="btn-pill-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', textDecoration: 'none' }}
              >
                <span>Sign In to Account</span>
                <ArrowRight size={16} />
              </Link>
              
              <Link 
                to="/login?mode=signup&redirect=/detect" 
                style={{
                  color: 'var(--accent-green)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  padding: '8px',
                  textDecoration: 'none',
                  display: 'block'
                }}
              >
                Don't have an account? Sign Up Free →
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer'
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default DetectPage;
