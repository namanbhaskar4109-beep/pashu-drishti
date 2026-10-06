import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, Camera, AlertCircle, CheckCircle, RefreshCw, FileText,
  ArrowRight, Sparkles, ShieldAlert, HeartPulse, X, Lock, Settings2,
  Check, Info, Cpu, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api, type ModelStatus } from '../services/api';

interface DiseaseResult {
  disease: string;
  pathogen: string;
  confidence: number;
  confidenceLevel?: string;
  severity: 'healthy' | 'moderate' | 'high' | 'critical';
  summary: string;
  detectedSymptoms: string[];
  quarantineProtocol: string;
  treatmentNotes: string[];
  urgency: string;
  alternativePossibilities?: string[];
  engineUsed?: string;
}

interface SamplePreset {
  id: string;
  title: string;
  species: string;
  imageUrl: string;
  description?: string;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'lsd-cattle',
    title: 'Lumpy Skin Bovine Specimen',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80',
    description: 'Prominent cutaneous nodules'
  },
  {
    id: 'healthy-cow',
    title: 'Healthy Dairy Cattle',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&auto=format&fit=crop&q=80',
    description: 'Normal alert bovine posture'
  },
  {
    id: 'mastitis-cattle',
    title: 'Bovine Health Specimen',
    species: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=800&auto=format&fit=crop&q=80',
    description: 'Udder monitoring case'
  },
  {
    id: 'fmd-sheep',
    title: 'Flock Biosecurity Specimen',
    species: 'Sheep / Goat',
    imageUrl: 'https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=800&auto=format&fit=crop&q=80',
    description: 'Small ruminant screening'
  },
  {
    id: 'healthy-dog',
    title: 'Canine Health Specimen',
    species: 'Pet / Canine',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
    description: 'Companion animal examination'
  },
  {
    id: 'healthy-horse',
    title: 'Equine Wellness Specimen',
    species: 'Horse',
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&auto=format&fit=crop&q=80',
    description: 'Equine musculoskeletal check'
  }
];

export const DetectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [selectedSample, setSelectedSample] = useState<SamplePreset | null>(SAMPLE_PRESETS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(SAMPLE_PRESETS[0].imageUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepText, setScanStepText] = useState('');
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MobileNetV2 Architecture & Readiness State
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [isRefreshingModel, setIsRefreshingModel] = useState(false);

  // Load MobileNetV2 Model Status on mount
  useEffect(() => {
    fetchModelStatus();
  }, []);

  const fetchModelStatus = async () => {
    setIsRefreshingModel(true);
    try {
      const status = await api.model.getStatus();
      setModelStatus(status);
    } catch {
      setModelStatus({
        installed: false,
        trained: false,
        architecture: 'MobileNetV2',
        modelName: 'Custom MobileNetV2 Animal Disease Classifier',
        activeEngine: 'Custom MobileNetV2 (Not trained/installed yet)',
        modelPath: 'backend/models/mobilenetv2_animal_disease.pth',
        classes: [],
        numClasses: 0,
        device: 'cpu',
        message: 'Custom MobileNetV2 model has not been trained or installed yet.'
      });
    } finally {
      setIsRefreshingModel(false);
    }
  };

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

  const handleSelectSpecies = (species: string) => {
    setSelectedSpecies(species);
    setResult(null);
    setAnalysisError(null);

    // If currently selected sample preset does not match newly selected species,
    // auto-switch to a preset matching that species
    if (selectedSample && selectedSample.species !== species) {
      const match = SAMPLE_PRESETS.find(p => p.species === species);
      if (match) {
        setSelectedSample(match);
        setUploadedImage(match.imageUrl);
      }
    }
  };

  const handleSelectSample = (sample: SamplePreset) => {
    setSelectedSample(sample);
    setUploadedImage(sample.imageUrl);
    setSelectedSpecies(sample.species);
    setResult(null);
    setSaveStatus('idle');
    setAnalysisError(null);
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
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSymptom = (sym: string) => {
    setActiveSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const triggerScan = async () => {
    if (!uploadedImage) return;

    // Protection: Prompt authentication if not logged in
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsScanning(true);
    setScanProgress(15);
    setScanStepText('Preprocessing image for MobileNetV2...');
    setResult(null);
    setAnalysisError(null);
    setSaveStatus('saving');

    const steps = [
      { text: 'Validating image resolution & tensor format...', target: 35 },
      { text: `Evaluating ${selectedSpecies} photograph with MobileNetV2...`, target: 60 },
      { text: 'Extracting convolutional feature embeddings...', target: 82 },
      { text: 'Computing class probability distribution...', target: 94 }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const stepTarget = steps[currentStepIdx]?.target || 94;
        if (prev < stepTarget) {
          return prev + 4;
        } else if (currentStepIdx < steps.length - 1) {
          currentStepIdx++;
          setScanStepText(steps[currentStepIdx].text);
        }
        return prev;
      });
    }, 130);

    try {
      // Call backend endpoint POST /api/predict with image, species, and checked symptoms
      const res = await api.predict.run({
        image: uploadedImage,
        animalType: selectedSpecies,
        symptoms: activeSymptoms
      });

      clearInterval(interval);
      setScanProgress(100);
      setScanStepText('Analysis complete');

      const aiRes = res.result;

      // Map to UI result model
      const outcome: DiseaseResult = {
        disease: aiRes.possibleDisease,
        pathogen: aiRes.possibleDisease.includes('Healthy') || aiRes.possibleDisease.includes('Normal')
          ? 'None detected'
          : aiRes.possibleDisease === 'Unable to determine'
            ? 'Undetermined'
            : (aiRes.possibleDisease.includes('Lumpy') ? 'Capripoxvirus (Poxviridae)'
              : aiRes.possibleDisease.includes('Mastitis') ? 'Staphylococcus aureus / Streptococcus'
              : aiRes.possibleDisease.includes('Foot') ? 'Aphthovirus (Picornaviridae)'
              : aiRes.possibleDisease.includes('Peste') || aiRes.possibleDisease.includes('PPR') ? 'Small Ruminant Morbillivirus'
              : aiRes.possibleDisease.includes('Mange') ? 'Demodex canis / Sarcoptes scabiei'
              : aiRes.possibleDisease.includes('Strangles') ? 'Streptococcus equi subsp. equi'
              : aiRes.possibleDisease.includes('Erysipelas') ? 'Erysipelothrix rhusiopathiae'
              : 'Identified via MobileNetV2 visual pathology'),
        confidence: aiRes.confidence,
        confidenceLevel: aiRes.confidenceLevel,
        severity: aiRes.severity,
        summary: aiRes.explanation,
        detectedSymptoms: aiRes.visibleSymptoms && aiRes.visibleSymptoms.length > 0
          ? aiRes.visibleSymptoms
          : (activeSymptoms.length > 0 ? activeSymptoms : ['Visual inspection evaluated']),
        quarantineProtocol: aiRes.recommendedNextSteps,
        treatmentNotes: aiRes.alternativePossibilities && aiRes.alternativePossibilities.length > 0
          ? [
              `Differential considerations: ${aiRes.alternativePossibilities.join(', ')}`,
              aiRes.recommendedNextSteps,
              aiRes.veterinarianRecommendation
            ]
          : [aiRes.recommendedNextSteps, aiRes.veterinarianRecommendation],
        urgency: aiRes.veterinarianRecommendation,
        alternativePossibilities: aiRes.alternativePossibilities,
        engineUsed: aiRes.engineUsed || 'Custom MobileNetV2 CNN'
      };

      setTimeout(() => {
        setIsScanning(false);
        setResult(outcome);
        setSaveStatus('saved');

        // Celebrate if healthy!
        if (outcome.severity === 'healthy') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      }, 300);

    } catch (err: any) {
      clearInterval(interval);
      setIsScanning(false);
      setScanProgress(0);
      setScanStepText('');
      setAnalysisError(err.message || 'We could not analyze this image right now. Please try again.');
      setSaveStatus('error');
    }
  };

  return (
    <div className="detect-page-container">
      {/* Editorial Header */}
      <div className="detect-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="editorial-badge">
            <Sparkles size={14} className="text-emerald-400" />
            <span>AI CLINICAL PATHOLOGY // STUDIO</span>
          </div>

          <button
            id="ai-engine-status-btn"
            onClick={() => setShowModelModal(true)}
            className="filter-tab-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-editorial)'
            }}
            title="Click to view MobileNetV2 architecture and training status"
          >
            <span
              className="status-online"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: modelStatus?.installed ? '#10B981' : '#F59E0B'
              }}
            />
            <span>{modelStatus?.installed ? 'MobileNetV2 Active' : 'MobileNetV2 (Pending Training)'}</span>
            <Cpu size={13} style={{ color: 'var(--text-secondary)' }} />
          </button>
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
                  onClick={() => handleSelectSpecies(spec)}
                  className={`filter-tab-pill ${selectedSpecies === spec ? 'active' : ''}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Cases */}
          <div className="sample-selector">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Quick Presets (Click to Test Immediately):
              </label>
            </div>
            <div className="sample-grid">
              {SAMPLE_PRESETS.map((sc) => (
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

        {/* RIGHT COLUMN: Diagnostic Results Panel */}
        <div className="results-panel">

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              DIAGNOSTIC REPORT
            </span>
            <div className="editorial-version-pill">
              <span
                className="status-online"
                style={{ backgroundColor: modelStatus?.installed ? '#10B981' : '#F59E0B' }}
              >
                {modelStatus?.installed ? 'MOBILENETV2 ACTIVE' : 'MODEL PENDING TRAINING'}
              </span>
            </div>
          </div>

          {analysisError && !isScanning && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#FDE68A',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: '#FBBF24' }}>
                <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                <span>MobileNetV2 Model Notification</span>
              </div>
              <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {analysisError}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowModelModal(true)}
                  className="filter-tab-pill"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                >
                  View Model Architecture & Setup Guide →
                </button>
              </div>
            </div>
          )}

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
                Analyzing animal image features and pathology indicators with Vision AI...
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--accent-green-hover)' }}>
                      {result.confidenceLevel ? `${result.confidenceLevel} (${result.confidence}%)` : `${result.confidence}%`}
                    </span> AI Assessment
                  </div>
                  {result.engineUsed && (
                    <span className="species-tag" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      {result.engineUsed || 'MobileNetV2 CNN'}
                    </span>
                  )}
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

      {/* ================= MOBILENETV2 MODEL ARCHITECTURE & READINESS MODAL ================= */}
      {showModelModal && (
        <div className="analysis-modal-backdrop" onClick={() => setShowModelModal(false)}>
          <div
            className="analysis-modal-card"
            style={{ maxWidth: '560px', padding: '32px 28px', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="editorial-badge" style={{ marginBottom: '6px' }}>
                  <Cpu size={12} className="text-emerald-400" />
                  <span>LOCAL DEEP LEARNING ARCHITECTURE</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.6rem', color: '#fff' }}>
                  MobileNetV2 Inference Engine
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Active Engine Banner */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-editorial)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: modelStatus?.installed ? '#10B981' : '#F59E0B',
                    display: 'inline-block'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    Engine Status: {modelStatus?.installed ? 'Trained Model Active & Ready' : 'Model Pending Training'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {modelStatus?.message || 'Custom MobileNetV2 image classifier configured.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Specifications Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-editorial)' }}>
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>CNN ARCHITECTURE</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>MobileNetV2</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-editorial)' }}>
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>BACKEND RUNTIME</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>FastAPI (Python)</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-editorial)' }}>
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>INPUT RESOLUTION</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>224 × 224 × 3 RGB</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-editorial)' }}>
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>DISEASE CLASSES</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                  {modelStatus?.numClasses && modelStatus.numClasses > 0 ? `${modelStatus.numClasses} Classes` : 'Awaiting Dataset'}
                </div>
              </div>
            </div>

            {/* Model Target Paths */}
            <div style={{ marginBottom: '18px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-editorial)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Weights Target:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#A7F3D0' }}>backend/models/mobilenetv2_animal_disease.pth</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-editorial)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Class Labels:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#A7F3D0' }}>backend/models/class_indices.json</span>
              </div>
            </div>

            {/* Training Instructions Guide */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              <strong style={{ color: '#fff' }}>Dataset Training Command:</strong>
              <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: '6px', margin: '8px 0', color: '#34D399' }}>
                python backend/ml/train_mobilenetv2.py --data_dir /path/to/dataset --epochs 25
              </div>
              No external AI APIs (Gemini/ChatGPT) are used. Once trained, the weights are automatically saved to the backend and real disease detection will be enabled immediately.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={fetchModelStatus}
                disabled={isRefreshingModel}
                className="filter-tab-pill"
                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              >
                {isRefreshingModel ? 'Checking Status...' : 'Refresh Status'}
              </button>

              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="btn-pill-primary"
                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
