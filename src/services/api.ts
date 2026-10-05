export interface User {
  id: string;
  name: string;
  email: string;
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
  pathogen?: string;
  confidence: number;
  severity: 'healthy' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  possibleCauses: string[];
  recommendedCare: string[];
  quarantineProtocol: string;
  urgency: string;
  summary: string;
  createdAt: string;
}

const TOKEN_KEY = 'pashu_drishti_auth_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    register: (userData: { name: string; email: string; password: string; confirmPassword: string; role?: string }) =>
      request<{ user: User; token: string; message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
      request<{ user: User; token: string; message: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    logout: () =>
      request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      }),

    getMe: () =>
      request<{ user: User }>('/api/auth/me', {
        method: 'GET',
      }),
  },

  analyses: {
    getAll: () =>
      request<{ analyses: AnimalAnalysis[] }>('/api/analyses', {
        method: 'GET',
      }),

    getById: (id: string) =>
      request<{ analysis: AnimalAnalysis }>(`/api/analyses/${id}`, {
        method: 'GET',
      }),

    save: (analysisData: Omit<AnimalAnalysis, 'id' | 'userId' | 'createdAt'>) =>
      request<{ analysis: AnimalAnalysis; message: string }>('/api/analyses', {
        method: 'POST',
        body: JSON.stringify(analysisData),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/analyses/${id}`, {
        method: 'DELETE',
      }),
  },

  storage: {
    uploadImage: (base64Image: string, fileName = 'scan.jpg') =>
      request<{ imageUrl: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ image: base64Image, name: fileName }),
      }),
  },
};
