import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, ShieldCheck, AlertTriangle, BookOpen, Filter } from 'lucide-react';

interface DiseaseEntry {
  id: string;
  name: string;
  scientificName: string;
  species: string[];
  pathogenType: 'Viral' | 'Bacterial' | 'Fungal' | 'Parasitic';
  severity: 'Critical' | 'High' | 'Moderate';
  symptoms: string[];
  transmission: string;
  prevention: string;
  vaccineAvailable: boolean;
}

const DISEASES_DATABASE: DiseaseEntry[] = [
  {
    id: 'lsd',
    name: 'Lumpy Skin Disease (LSD)',
    scientificName: 'Capripoxvirus',
    species: ['Cattle', 'Water Buffalo'],
    pathogenType: 'Viral',
    severity: 'High',
    symptoms: ['Circular skin nodules (2-5cm)', 'High fever (40-41°C)', 'Enlarged prescapular lymph nodes', 'Marked drop in milk yield'],
    transmission: 'Biting arthropod vectors (mosquitoes, stable flies, ticks) and contaminated feeding equipment.',
    prevention: 'Live attenuated homologous Neethling strain vaccination and strict insect vector control.',
    vaccineAvailable: true
  },
  {
    id: 'fmd',
    name: 'Foot and Mouth Disease (FMD)',
    scientificName: 'Aphthovirus',
    species: ['Cattle', 'Sheep & Goats', 'Swine'],
    pathogenType: 'Viral',
    severity: 'Critical',
    symptoms: ['Vesicles and erosions on tongue/dental pad', 'Blisters at coronary hoof band', 'Excessive ropy salivation', 'Extreme lameness'],
    transmission: 'Aerosol inhalation over distances, direct contact, swill feeding, and fomites.',
    prevention: 'Strict border quarantine, ring vaccination in endemic zones, and biosecurity disinfection.',
    vaccineAvailable: true
  },
  {
    id: 'mastitis',
    name: 'Bovine Mastitis',
    scientificName: 'Staphylococcus aureus / Streptococcus uberis',
    species: ['Cattle', 'Dairy Goats'],
    pathogenType: 'Bacterial',
    severity: 'High',
    symptoms: ['Swollen, hot, painful udder quarters', 'Clots, flakes or serum in milk', 'Elevated somatic cell count', 'Anorexia and fever'],
    transmission: 'Contaminated milking claws, unwashed milker hands, and environmental bedding manure.',
    prevention: 'Post-milking teat disinfection (iodine/chlorhexidine), clean sand bedding, and dry cow therapy.',
    vaccineAvailable: true
  },
  {
    id: 'brd',
    name: 'Bovine Respiratory Disease (Shipping Fever)',
    scientificName: 'Mannheimia haemolytica / Bovine Herpesvirus-1',
    species: ['Cattle'],
    pathogenType: 'Bacterial',
    severity: 'High',
    symptoms: ['Dyspnea with extended neck', 'Mucopurulent nasal discharge', 'Coughing', 'Depression and gaunt abdomen'],
    transmission: 'Airborne droplet exposure during transit stress, overcrowding, and sudden temperature shifts.',
    prevention: 'Pre-conditioning programs, adequate colostrum intake, and viral-bacterial combo vaccines.',
    vaccineAvailable: true
  },
  {
    id: 'orf',
    name: 'Contagious Ecthyma (Orf / Sore Mouth)',
    scientificName: 'Parapoxvirus',
    species: ['Sheep & Goats'],
    pathogenType: 'Viral',
    severity: 'Moderate',
    symptoms: ['Proliferative scabby lesions on lips/muzzle', 'Lesions on teats and coronet', 'Refusal to suckle in lambs'],
    transmission: 'Direct contact with infected scabs and contaminated abrasive thorns/pasture.',
    prevention: 'Scarification vaccination in affected flocks, isolation of newly purchased stock.',
    vaccineAvailable: true
  },
  {
    id: 'asf',
    name: 'African Swine Fever (ASF)',
    scientificName: 'Asfarviridae',
    species: ['Swine'],
    pathogenType: 'Viral',
    severity: 'Critical',
    symptoms: ['High mortality approaching 100%', 'Cyanosis and hemorrhages on ears/abdomen', 'Vomiting and bloody diarrhea', 'High fever'],
    transmission: 'Feeding of untreated swill/waste food, soft ticks (Ornithodoros), and direct contact.',
    prevention: 'Strict prohibition of swill feeding, double perimeter fencing, and immediate depopulation of infected herds.',
    vaccineAvailable: false
  },
  {
    id: 'rainrot',
    name: 'Dermatophilosis (Rain Rot)',
    scientificName: 'Dermatophilus congolensis',
    species: ['Horses', 'Cattle', 'Sheep'],
    pathogenType: 'Bacterial',
    severity: 'Moderate',
    symptoms: ['Matted "paintbrush" crusts and scabs', 'Alopecia leaving raw pink skin', 'Painful upon touch in dorsal region'],
    transmission: 'Prolonged rain wetting skin barrier, biting insects, and shared grooming gear.',
    prevention: 'Provide dry run-in shelters during persistent rain, regular grooming, and insect repelling sprays.',
    vaccineAvailable: false
  },
  {
    id: 'ringworm',
    name: 'Dermatophytosis (Ringworm)',
    scientificName: 'Trichophyton verrucosum / Microsporum canis',
    species: ['Cattle', 'Horses', 'Pets'],
    pathogenType: 'Fungal',
    severity: 'Moderate',
    symptoms: ['Circular, discrete crusty gray plaques', 'Localized alopecia around eyes/neck', 'Pruritus and scaling'],
    transmission: 'Direct fungal spore contact on wooden fence rails, headstalls, and brush combs.',
    prevention: 'Sunlight exposure, disinfection of stables with bleach/enilconazole, and live fungal vaccines in cattle.',
    vaccineAvailable: true
  }
];

export const DiseasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');

  const speciesOptions = ['All', 'Cattle', 'Sheep & Goats', 'Horses', 'Swine', 'Pets'];

  const filteredDiseases = useMemo(() => {
    return DISEASES_DATABASE.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.symptoms.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSpecies = 
        selectedSpecies === 'All' || 
        item.species.some(sp => sp.toLowerCase().includes(selectedSpecies.toLowerCase()));

      const matchesSeverity = 
        selectedSeverity === 'All' || 
        item.severity === selectedSeverity;

      return matchesSearch && matchesSpecies && matchesSeverity;
    });
  }, [searchTerm, selectedSpecies, selectedSeverity]);

  return (
    <div className="diseases-page-container">
      {/* Editorial Header */}
      <div className="detect-header">
        <div className="editorial-badge">
          <BookOpen size={14} />
          <span>VETERINARY COMPENDIUM // 2026 EDITION</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 800 }}>
          Animal Disease Encyclopedia
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '640px' }}>
          Explore clinical pathology profiles, epidemiological transmission pathways, and immediate biosecurity intervention protocols.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="encyclopedia-filter-bar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon-inside" />
          <input 
            type="text"
            className="search-input"
            placeholder="Search diseases, pathogens, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Species Filter Tabs */}
        <div className="species-filter-tabs">
          {speciesOptions.map((opt) => (
            <button 
              key={opt}
              onClick={() => setSelectedSpecies(opt)}
              className={`filter-tab-pill ${selectedSpecies === opt ? 'active' : ''}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Diseases Grid */}
      <div className="disease-cards-grid">
        {filteredDiseases.map((d) => (
          <div key={d.id} className="disease-item-card">
            
            {/* Top Badge Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className={`severity-pill severity-${d.severity.toLowerCase()}`}>
                {d.severity} Severity
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                {d.pathogenType}
              </span>
            </div>

            {/* Disease Heading */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.4rem', fontWeight: 800 }}>
                {d.name}
              </h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-green-hover)', fontStyle: 'italic' }}>
                {d.scientificName}
              </span>
            </div>

            {/* Affected Species Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {d.species.map((sp, idx) => (
                <span key={idx} className="species-tag">{sp}</span>
              ))}
              {d.vaccineAvailable && (
                <span className="species-tag" style={{ background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                  ✓ Vaccine Available
                </span>
              )}
            </div>

            {/* Key Clinical Signs */}
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>
                Key Clinical Signs:
              </span>
              <ul style={{ paddingLeft: '1.1rem', fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {d.symptoms.slice(0, 3).map((sym, sIdx) => (
                  <li key={sIdx}>{sym}</li>
                ))}
              </ul>
            </div>

            {/* Biosecurity & Prevention */}
            <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Prevention Protocol:</strong>
              {d.prevention}
            </div>

            {/* Bottom Action: Run Diagnostic */}
            <button
              onClick={() => navigate('/detect')}
              className="btn-pill-primary"
              style={{ padding: '12px 20px', fontSize: '0.9rem', marginTop: 'auto', width: '100%' }}
            >
              <span>Scan For This Disease</span>
              <ArrowUpRight size={16} />
            </button>

          </div>
        ))}
      </div>

      {filteredDiseases.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-tertiary)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 16px auto', color: '#F59E0B' }} />
          <h3>No matching diseases found</h3>
          <p style={{ marginTop: '8px' }}>Try adjusting your search criteria or species filter.</p>
        </div>
      )}
    </div>
  );
};
export default DiseasesPage;
