import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'vet' | 'farmer' | 'researcher';
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalAnalysis {
  id: string;
  userId: string;
  animalType: string;
  imageUrl: string;
  predictedDisease: string;
  possibleDisease?: string;
  pathogen?: string;
  confidence: number;
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | string;
  severity: 'healthy' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  visibleSymptoms?: string[];
  possibleCauses: string[];
  alternativePossibilities?: string[];
  recommendedCare: string[];
  recommendedNextSteps?: string;
  quarantineProtocol: string;
  urgency: string;
  veterinarianRecommendation?: string;
  summary: string;
  explanation?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: User[];
  analyses: AnimalAnalysis[];
  sessions: Session[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'pashu_drishti_db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// Ensure storage directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial Mock Seed users for instant demo
const DEFAULT_SEED_USERS: User[] = [
  {
    id: 'user-vet-001',
    name: 'Dr. Aarav Sharma',
    email: 'dr.sharma@pashudrishti.ai',
    // Hash for "VetCare2026!secure"
    passwordHash: hashPassword('VetCare2026!secure'),
    role: 'vet',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'user-farmer-002',
    name: 'Rajesh Patel',
    email: 'rajesh.patel@dairyherds.in',
    // Hash for "BovineHealth#2026"
    passwordHash: hashPassword('BovineHealth#2026'),
    role: 'farmer',
    createdAt: '2026-02-10T11:30:00.000Z',
    updatedAt: '2026-02-10T11:30:00.000Z'
  }
];

// Initial mock seed analyses
const DEFAULT_SEED_ANALYSES: AnimalAnalysis[] = [
  {
    id: 'analysis-001',
    userId: 'user-vet-001',
    animalType: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80',
    predictedDisease: 'Lumpy Skin Disease (LSD)',
    possibleDisease: 'Lumpy Skin Disease (LSD)',
    pathogen: 'Capripoxvirus (Poxviridae)',
    confidence: 88.0,
    confidenceLevel: 'High',
    severity: 'high',
    symptoms: ['Skin nodules/lumps', 'Fever', 'Enlarged lymph nodes'],
    visibleSymptoms: ['Skin nodules/lumps', 'Fever', 'Enlarged lymph nodes'],
    possibleCauses: ['Vector transmission (biting insects)', 'Direct herd contact'],
    alternativePossibilities: ['Pseudo-lumpy skin disease', 'Bovine papular stomatitis'],
    recommendedCare: [
      'Isolate animal in quarantine pen',
      'Antipyretics and anti-inflammatory therapy',
      'Topical wound antiseptics on ruptured nodules'
    ],
    recommendedNextSteps: 'Mandatory perimeter isolation. Vector control barriers required.',
    quarantineProtocol: 'Mandatory 21-day perimeter isolation. Vector control barriers required.',
    urgency: 'HIGH — Immediate veterinary intervention',
    veterinarianRecommendation: 'Immediate veterinary intervention within 12-24 hours.',
    summary: 'Circumscribed cutaneous nodules (2-5cm) observed across neck and flank region.',
    explanation: 'Circumscribed cutaneous nodules (2-5cm) observed across neck and flank region.',
    createdAt: '2026-09-28T14:22:00.000Z'
  },
  {
    id: 'analysis-002',
    userId: 'user-vet-001',
    animalType: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&auto=format&fit=crop&q=80',
    predictedDisease: 'Normal / Healthy Specimen',
    possibleDisease: 'Normal / Healthy Specimen',
    pathogen: 'None detected',
    confidence: 92.0,
    confidenceLevel: 'High',
    severity: 'healthy',
    symptoms: ['Clean coat', 'Normal rumination', 'Alert posture'],
    visibleSymptoms: ['Clean coat', 'Normal rumination', 'Alert posture'],
    possibleCauses: ['N/A — Specimen within optimal clinical vital thresholds'],
    alternativePossibilities: [],
    recommendedCare: [
      'Maintain regular nutritional rations and mineral licks',
      'Seasonal prophylactic deworming'
    ],
    recommendedNextSteps: 'None required. Standard biosecurity maintained.',
    quarantineProtocol: 'None required. Standard biosecurity maintained.',
    urgency: 'ROUTINE — Regular checkup',
    veterinarianRecommendation: 'Routine preventive veterinary monitoring.',
    summary: 'Glossy pelage, clean muzzle, alert ear position, no lesions or inflammation.',
    explanation: 'Glossy pelage, clean muzzle, alert ear position, no lesions or inflammation.',
    createdAt: '2026-10-02T10:15:00.000Z'
  },
  {
    id: 'analysis-003',
    userId: 'user-farmer-002',
    animalType: 'Cattle',
    imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=800&auto=format&fit=crop&q=80',
    predictedDisease: 'Acute Clinical Mastitis',
    possibleDisease: 'Acute Clinical Mastitis',
    pathogen: 'Staphylococcus aureus',
    confidence: 85.0,
    confidenceLevel: 'High',
    severity: 'high',
    symptoms: ['Udder swelling', 'Heat in quarters', 'Abnormal milk flakes'],
    visibleSymptoms: ['Udder swelling', 'Heat in quarters', 'Abnormal milk flakes'],
    possibleCauses: ['Bacterial contamination of teat canals', 'Milking hygiene failure'],
    alternativePossibilities: ['Subclinical mastitis', 'Udder edema'],
    recommendedCare: [
      'Intramammary antibiotic infusion',
      'Systemic anti-inflammatory therapy',
      'Frequent stripping of affected quarter'
    ],
    recommendedNextSteps: 'Milk affected animal last. Thorough cluster sterilization.',
    quarantineProtocol: 'Milk affected animal last. Thorough cluster sterilization.',
    urgency: 'HIGH — Same-day clinical treatment',
    veterinarianRecommendation: 'Same-day veterinary clinical examination required.',
    summary: 'Asymmetric right hind quarter swelling with palpable localized heat.',
    explanation: 'Asymmetric right hind quarter swelling with palpable localized heat.',
    createdAt: '2026-10-04T08:45:00.000Z'
  }
];

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

class Database {
  private read(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = {
        users: DEFAULT_SEED_USERS,
        analyses: DEFAULT_SEED_ANALYSES,
        sessions: []
      };
      this.write(initial);
      return initial;
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || [],
        analyses: parsed.analyses || [],
        sessions: parsed.sessions || []
      };
    } catch {
      return { users: DEFAULT_SEED_USERS, analyses: DEFAULT_SEED_ANALYSES, sessions: [] };
    }
  }

  private write(data: DatabaseSchema): void {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  // User queries
  public findUserByEmail(email: string): User | undefined {
    const data = this.read();
    return data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    const data = this.read();
    return data.users.find(u => u.id === id);
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const data = this.read();
    const newUser: User = {
      ...userData,
      id: `user-${crypto.randomUUID()}`,
      email: userData.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    this.write(data);
    return newUser;
  }

  // Session management
  public createSession(userId: string, rememberMe = true): Session {
    const data = this.read();
    // 30 days if rememberMe, otherwise 24 hours
    const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const session: Session = {
      token: crypto.randomBytes(32).toString('hex'),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString()
    };
    // Remove expired sessions
    const now = new Date().toISOString();
    data.sessions = data.sessions.filter(s => s.expiresAt > now);
    data.sessions.push(session);
    this.write(data);
    return session;
  }

  public getSession(token: string): Session | undefined {
    const data = this.read();
    const session = data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string): void {
    const data = this.read();
    data.sessions = data.sessions.filter(s => s.token !== token);
    this.write(data);
  }

  // Analysis queries
  public getAnalysesByUserId(userId: string): AnimalAnalysis[] {
    const data = this.read();
    return data.analyses
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAnalysisById(id: string, userId: string): AnimalAnalysis | undefined {
    const data = this.read();
    return data.analyses.find(a => a.id === id && a.userId === userId);
  }

  public createAnalysis(analysisData: Omit<AnimalAnalysis, 'id' | 'createdAt'>): AnimalAnalysis {
    const data = this.read();
    const newAnalysis: AnimalAnalysis = {
      ...analysisData,
      id: `analysis-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    data.analyses.unshift(newAnalysis);
    this.write(data);
    return newAnalysis;
  }

  public deleteAnalysis(id: string, userId: string): boolean {
    const data = this.read();
    const index = data.analyses.findIndex(a => a.id === id && a.userId === userId);
    if (index === -1) return false;
    data.analyses.splice(index, 1);
    this.write(data);
    return true;
  }

  // Image Upload handler
  public saveUploadedImage(base64Data: string, originalName = 'upload.jpg'): string {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = '.jpg';

    if (matches && matches[2]) {
      const mime = matches[1];
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('gif')) ext = '.gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const filename = `scan-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }
}

export const db = new Database();
