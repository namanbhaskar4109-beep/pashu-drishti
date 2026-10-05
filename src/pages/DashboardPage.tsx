import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  HeartPulse, 
  Trash2, 
  Eye, 
  PlusCircle, 
  ShieldCheck, 
  Clock, 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Stethoscope, 
  ArrowRight, 
  Sparkles, 
  X, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, type AnimalAnalysis } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState<AnimalAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnimalAnalysis | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch user's analysis history from database
  const loadAnalyses = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.analyses.getAll();
      setAnalyses(response.analyses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analysis history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  // Handle single analysis deletion
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this animal diagnostic record?')) {
      return;
    }

    setIsDeletingId(id);
    try {
      await api.analyses.delete(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete analysis record.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Filtered analyses
  const filteredAnalyses = analyses.filter(a => 
    a.animalType.toLowerCase().includes(searchFilter.toLowerCase()) ||
    a.predictedDisease.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Stats
  const totalScans = analyses.length;
  const criticalCases = analyses.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const healthyCases = analyses.filter(a => a.severity === 'healthy').length;

  return (
    <div className="dashboard-page-root">
      
      {/* Background glow and perspective lines */}
      <div className="login-bg-grid" />
      <div className="login-ambient-glow" style={{ top: '10%' }} />

      <div className="dashboard-container">
        
        {/* ================= HEADER STRIP ================= */}
        <div className="dash-top-strip">
          <div>
            <div className="editorial-badge" style={{ marginBottom: '8px' }}>
              <HeartPulse size={13} className="text-emerald-500" />
              <span>PASHU DRISHTI // VET PORTAL</span>
            </div>
            <h1 className="dash-title">
              Diagnostic Headquarters
            </h1>
            <p className="dash-subtitle">
              Welcome back, <strong style={{ color: '#fff' }}>{user?.name || 'Veterinary Officer'}</strong>. Real-time livestock pathology surveillance.
            </p>
          </div>

          <div className="dash-actions-group">
            <Link to="/detect" className="btn-pill-primary" style={{ padding: '12px 24px', fontSize: '0.92rem' }}>
              <PlusCircle size={16} />
              <span>Check Animal Health</span>
            </Link>
            <button 
              type="button" 
              onClick={handleSignOut}
              className="dash-logout-btn"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ================= PROFILE & STATS SUMMARY ================= */}
        <div className="dash-stats-grid">
          
          {/* User Profile Card */}
          <div className="profile-card-editorial">
            <div className="profile-header">
              <div className="profile-avatar">
                🐄
              </div>
              <div>
                <h3 className="profile-name">{user?.name}</h3>
                <span className="profile-role-badge">
                  {user?.role === 'farmer' ? '🐄 Dairy Herd Owner' : user?.role === 'researcher' ? '🔬 Surveillance Lab' : '🩺 Veterinary Pathologist'}
                </span>
              </div>
            </div>

            <div className="profile-meta-list">
              <div className="meta-item">
                <Mail size={14} className="meta-icon" />
                <span className="meta-val">{user?.email}</span>
              </div>
              <div className="meta-item">
                <Calendar size={14} className="meta-icon" />
                <span className="meta-val">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2026'}</span>
              </div>
              <div className="meta-item">
                <ShieldCheck size={14} className="meta-icon text-emerald-500" />
                <span className="meta-val">256-Bit Encrypted Diagnostic ID</span>
              </div>
            </div>
          </div>

          {/* Stat 1: Total Scans */}
          <div className="dash-stat-box">
            <span className="stat-label">TOTAL CLINICAL SCANS</span>
            <div className="stat-value-row">
              <span className="stat-number">{totalScans}</span>
              <FileText size={22} className="text-emerald-500" />
            </div>
            <span className="stat-sub">Authenticated records in database</span>
          </div>

          {/* Stat 2: Pathologies Flagged */}
          <div className="dash-stat-box">
            <span className="stat-label">PATHOLOGIES DETECTED</span>
            <div className="stat-value-row">
              <span className="stat-number" style={{ color: '#F87171' }}>{criticalCases}</span>
              <AlertTriangle size={22} style={{ color: '#F87171' }} />
            </div>
            <span className="stat-sub">High & critical triage severity cases</span>
          </div>

          {/* Stat 3: Healthy Screenings */}
          <div className="dash-stat-box">
            <span className="stat-label">HEALTHY VERIFICATIONS</span>
            <div className="stat-value-row">
              <span className="stat-number" style={{ color: '#34D399' }}>{healthyCases}</span>
              <CheckCircle2 size={22} style={{ color: '#34D399' }} />
            </div>
            <span className="stat-sub">Optimal vital & dermatological health</span>
          </div>

        </div>

        {/* ================= ANALYSIS HISTORY SECTION ================= */}
        <div className="dash-section-header">
          <div>
            <span className="section-label">CLINICAL DATABASE RECORDS</span>
            <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.8rem', color: '#fff', marginTop: '4px' }}>
              Your Animal Diagnostic History
            </h2>
          </div>

          {/* Search bar */}
          <div className="dash-search-box">
            <input
              type="text"
              placeholder="Search by animal or disease..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="login-error-banner" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="dash-loading-box">
            <div className="spin-dot" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <span>Retrieving your encrypted patient records...</span>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          /* Empty state */
          <div className="dash-empty-state">
            <div className="empty-cow-avatar">🐄</div>
            <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.4rem', color: '#fff', marginBottom: '8px' }}>
              {searchFilter ? 'No matching records found' : 'No animal analyses saved yet'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '24px' }}>
              {searchFilter 
                ? 'Try searching with another keyword or clear the search filter.'
                : 'Upload your first animal photo in the Diagnostic Studio to run AI vision analysis and store records.'}
            </p>
            <Link to="/detect" className="btn-pill-primary" style={{ padding: '14px 28px' }}>
              <PlusCircle size={18} />
              <span>Run First Animal Analysis</span>
            </Link>
          </div>
        ) : (
          /* Analyses Grid */
          <div className="analyses-grid">
            {filteredAnalyses.map((record) => {
              const isHealthy = record.severity === 'healthy';
              const isHigh = record.severity === 'critical' || record.severity === 'high';

              return (
                <div 
                  key={record.id} 
                  className="analysis-history-card"
                  onClick={() => setSelectedAnalysis(record)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Thumbnail Image */}
                  <div className="analysis-thumb-wrapper">
                    <img src={record.imageUrl} alt={record.predictedDisease} />
                    <span className={`severity-tag-overlay ${record.severity}`}>
                      {record.severity.toUpperCase()}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="analysis-card-body">
                    <div className="card-species-row">
                      <span className="species-badge">🐄 {record.animalType}</span>
                      <span className="card-date-badge">
                        <Clock size={12} />
                        <span>{formatDate(record.createdAt)}</span>
                      </span>
                    </div>

                    <h3 className="card-disease-title">
                      {record.predictedDisease}
                    </h3>

                    {/* Confidence bar */}
                    <div className="confidence-meter-box">
                      <div className="meter-label-row">
                        <span>CONFIDENCE</span>
                        <strong>{record.confidence.toFixed(1)}%</strong>
                      </div>
                      <div className="meter-track">
                        <div 
                          className="meter-fill"
                          style={{
                            width: `${Math.min(100, record.confidence)}%`,
                            backgroundColor: isHealthy ? '#10B981' : isHigh ? '#EF4444' : '#F59E0B'
                          }}
                        />
                      </div>
                    </div>

                    {/* Symptoms snippets */}
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div className="card-symptoms-chips">
                        {record.symptoms.slice(0, 2).map((sym, sIdx) => (
                          <span key={sIdx} className="mini-sym-chip">{sym}</span>
                        ))}
                        {record.symptoms.length > 2 && (
                          <span className="mini-sym-chip">+{record.symptoms.length - 2} more</span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="card-actions-row">
                      <button
                        type="button"
                        className="btn-view-details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnalysis(record);
                        }}
                      >
                        <Eye size={15} />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        className="btn-delete-record"
                        disabled={isDeletingId === record.id}
                        onClick={(e) => handleDelete(record.id, e)}
                        title="Delete this record"
                        aria-label="Delete analysis"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ================= DETAILS MODAL ================= */}
      {selectedAnalysis && (
        <div className="analysis-modal-backdrop" onClick={() => setSelectedAnalysis(null)}>
          <div className="analysis-modal-card" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="editorial-badge" style={{ marginBottom: '6px' }}>
                  <span>ANIMAL DIAGNOSTIC DOSSIER</span>
                </span>
                <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.8rem', color: '#fff' }}>
                  {selectedAnalysis.predictedDisease}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Species: <strong>{selectedAnalysis.animalType}</strong></span>
                  <span>•</span>
                  <span>Recorded: <strong>{formatDate(selectedAnalysis.createdAt)}</strong></span>
                </div>
              </div>

              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setSelectedAnalysis(null)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-content">
              
              {/* Photo & Vital Metrics */}
              <div className="modal-hero-split">
                <div className="modal-image-box">
                  <img src={selectedAnalysis.imageUrl} alt={selectedAnalysis.predictedDisease} />
                </div>
                
                <div className="modal-metrics-column">
                  <div className="metric-cell">
                    <span className="cell-label">PATHOGEN SPECIFICATION</span>
                    <strong className="cell-val" style={{ color: '#38BDF8' }}>
                      {selectedAnalysis.pathogen || 'N/A'}
                    </strong>
                  </div>

                  <div className="metric-cell">
                    <span className="cell-label">PREDICTION CONFIDENCE</span>
                    <strong className="cell-val text-emerald-400">
                      {selectedAnalysis.confidence.toFixed(1)}% Benchmark
                    </strong>
                  </div>

                  <div className="metric-cell">
                    <span className="cell-label">TRIAGE SEVERITY</span>
                    <span className={`severity-tag-overlay ${selectedAnalysis.severity}`} style={{ position: 'static', display: 'inline-block', width: 'fit-content' }}>
                      {selectedAnalysis.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="metric-cell">
                    <span className="cell-label">CLINICAL URGENCY</span>
                    <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                      {selectedAnalysis.urgency || 'Routine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {selectedAnalysis.summary && (
                <div className="modal-section-block">
                  <h4 className="block-title">PATHOLOGICAL ASSESSMENT SUMMARY</h4>
                  <p className="block-text">{selectedAnalysis.summary}</p>
                </div>
              )}

              {/* Symptoms */}
              {selectedAnalysis.symptoms && selectedAnalysis.symptoms.length > 0 && (
                <div className="modal-section-block">
                  <h4 className="block-title">DETECTED DERMATOLOGICAL & SYSTEMIC SYMPTOMS</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedAnalysis.symptoms.map((s, i) => (
                      <span key={i} className="species-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34D399' }}>
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarantine Protocol */}
              {selectedAnalysis.quarantineProtocol && (
                <div className="modal-section-block" style={{ borderLeft: '4px solid #EF4444', paddingLeft: '16px' }}>
                  <h4 className="block-title" style={{ color: '#F87171' }}>QUARANTINE & BIOSECURITY DIRECTIVE</h4>
                  <p className="block-text">{selectedAnalysis.quarantineProtocol}</p>
                </div>
              )}

              {/* Recommended Care */}
              {selectedAnalysis.recommendedCare && selectedAnalysis.recommendedCare.length > 0 && (
                <div className="modal-section-block">
                  <h4 className="block-title">ACTIONABLE TREATMENT GUIDELINES</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {selectedAnalysis.recommendedCare.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-delete-record"
                style={{ width: 'auto', padding: '10px 18px', gap: '8px', display: 'flex', alignItems: 'center' }}
                onClick={(e) => handleDelete(selectedAnalysis.id, e)}
              >
                <Trash2 size={16} />
                <span>Delete Record</span>
              </button>

              <button 
                type="button" 
                className="btn-pill-primary"
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                onClick={() => setSelectedAnalysis(null)}
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
