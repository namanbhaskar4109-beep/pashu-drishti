import type { IncomingMessage, ServerResponse } from 'node:http';
import { db, hashPassword, verifyPassword, type User } from './db.js';

// Strip sensitive data before sending user to client
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// Parse request body safely
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Safeguard against gigantic payload > 15MB
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Extract and verify authenticated user from Authorization: Bearer <token>
function getAuthenticatedUser(req: IncomingMessage): User | null {
  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  const session = db.getSession(token);
  if (!session) return null;
  const user = db.findUserById(session.userId);
  return user || null;
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method?.toUpperCase();

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  try {
    /* ---------------------------------------------------- AUTH ENDPOINTS */
    
    // POST /api/auth/register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { name, email, password, confirmPassword, role } = body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        sendJson(res, 400, { error: 'Full name is required (at least 2 characters).' });
        return true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        sendJson(res, 400, { error: 'A valid email address is required.' });
        return true;
      }

      if (!password || password.length < 8) {
        sendJson(res, 400, { error: 'Password must be at least 8 characters long.' });
        return true;
      }

      if (password !== confirmPassword) {
        sendJson(res, 400, { error: 'Passwords do not match.' });
        return true;
      }

      // Check if user already exists
      const existing = db.findUserByEmail(email);
      if (existing) {
        sendJson(res, 409, { error: 'An account with this email address already exists.' });
        return true;
      }

      // Create new user
      const newUser = db.createUser({
        name: name.trim(),
        email: email.trim(),
        passwordHash: hashPassword(password),
        role: role === 'farmer' || role === 'researcher' ? role : 'vet'
      });

      const session = db.createSession(newUser.id, true);

      sendJson(res, 201, {
        message: 'Account successfully registered.',
        user: sanitizeUser(newUser),
        token: session.token
      });
      return true;
    }

    // POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { email, password, rememberMe } = body;

      if (!email || !password) {
        sendJson(res, 400, { error: 'Email and password are required.' });
        return true;
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        sendJson(res, 401, { error: 'Invalid email or password.' });
        return true;
      }

      const valid = verifyPassword(password, user.passwordHash);
      if (!valid) {
        sendJson(res, 401, { error: 'Invalid email or password.' });
        return true;
      }

      const session = db.createSession(user.id, rememberMe !== false);

      sendJson(res, 200, {
        message: 'Authentication successful.',
        user: sanitizeUser(user),
        token: session.token
      });
      return true;
    }

    // POST /api/auth/logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        db.deleteSession(match[1]);
      }
      sendJson(res, 200, { message: 'Logged out successfully.' });
      return true;
    }

    // GET /api/auth/me
    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Unauthorized. Invalid or expired session.' });
        return true;
      }
      sendJson(res, 200, { user: sanitizeUser(user) });
      return true;
    }

    /* ---------------------------------------------------- IMAGE STORAGE */

    // POST /api/upload
    if (pathname === '/api/upload' && method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Authentication required to upload image.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { image, name } = body;
      if (!image) {
        sendJson(res, 400, { error: 'Base64 image data is required.' });
        return true;
      }

      try {
        const imageUrl = db.saveUploadedImage(image, name);
        sendJson(res, 201, { imageUrl });
      } catch (err: any) {
        sendJson(res, 500, { error: `Failed to save image: ${err.message}` });
      }
      return true;
    }

    /* ---------------------------------------------------- ANALYSIS HISTORY */

    // GET /api/analyses
    if (pathname === '/api/analyses' && method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Unauthorized.' });
        return true;
      }
      const analyses = db.getAnalysesByUserId(user.id);
      sendJson(res, 200, { analyses });
      return true;
    }

    // GET /api/analyses/:id
    const singleAnalysisMatch = pathname.match(/^\/api\/analyses\/([^/]+)$/);
    if (singleAnalysisMatch && method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Unauthorized.' });
        return true;
      }
      const id = singleAnalysisMatch[1];
      const analysis = db.getAnalysisById(id, user.id);
      if (!analysis) {
        sendJson(res, 404, { error: 'Analysis record not found or unauthorized.' });
        return true;
      }
      sendJson(res, 200, { analysis });
      return true;
    }

    // POST /api/analyses (Save analysis to user history)
    if (pathname === '/api/analyses' && method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Authentication required to save analysis history.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const {
        animalType,
        imageUrl,
        predictedDisease,
        pathogen,
        confidence,
        severity,
        symptoms,
        possibleCauses,
        recommendedCare,
        quarantineProtocol,
        urgency,
        summary
      } = body;

      if (!predictedDisease || !imageUrl) {
        sendJson(res, 400, { error: 'Missing required analysis fields (predictedDisease, imageUrl).' });
        return true;
      }

      const newAnalysis = db.createAnalysis({
        userId: user.id, // Strictly tied to authenticated user ID
        animalType: animalType || 'Cattle',
        imageUrl,
        predictedDisease,
        pathogen: pathogen || 'Unspecified',
        confidence: Number(confidence) || 90.0,
        severity: severity || 'moderate',
        symptoms: Array.isArray(symptoms) ? symptoms : [],
        possibleCauses: Array.isArray(possibleCauses) ? possibleCauses : [possibleCauses].filter(Boolean),
        recommendedCare: Array.isArray(recommendedCare) ? recommendedCare : [],
        quarantineProtocol: quarantineProtocol || 'Standard observation protocol.',
        urgency: urgency || 'Standard triage',
        summary: summary || 'Clinical evaluation recorded.'
      });

      sendJson(res, 201, {
        message: 'Analysis record saved successfully.',
        analysis: newAnalysis
      });
      return true;
    }

    // DELETE /api/analyses/:id (Delete user analysis)
    if (singleAnalysisMatch && method === 'DELETE') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'Unauthorized.' });
        return true;
      }
      const id = singleAnalysisMatch[1];
      const deleted = db.deleteAnalysis(id, user.id);
      if (!deleted) {
        sendJson(res, 404, { error: 'Analysis not found or unauthorized to delete.' });
        return true;
      }
      sendJson(res, 200, { message: 'Analysis record deleted successfully.' });
      return true;
    }

    // Route not found
    sendJson(res, 404, { error: 'API endpoint not found.' });
    return true;

  } catch (err: any) {
    console.error('API Error:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    return true;
  }
}
