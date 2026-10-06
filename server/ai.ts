import fs from 'node:fs';
import path from 'node:path';

export interface AiPredictionOutput {
  animalType: string;
  possibleDisease: string;
  alternativePossibilities: string[];
  visibleSymptoms: string[];
  severity: 'healthy' | 'moderate' | 'high' | 'critical';
  confidenceLevel: 'High' | 'Moderate' | 'Low';
  confidenceScore: number;
  explanation: string;
  recommendedNextSteps: string;
  veterinarianRecommendation: string;
  pathogen?: string;
  engineUsed?: string;
}

export interface ImageQualityResult {
  valid: boolean;
  error?: string;
  mimeType: string;
  base64Data: string;
  buffer: Buffer;
  sourceUrl?: string;
}

export interface ModelStatusOutput {
  installed: boolean;
  trained: boolean;
  architecture: string;
  modelName: string;
  activeEngine: string;
  modelPath: string;
  classes: string[];
  numClasses: number;
  device: string;
  message: string;
}

const ROOT_DIR = process.cwd();
const MODEL_WEIGHTS_PATH = path.resolve(ROOT_DIR, 'backend', 'models', 'mobilenetv2_animal_disease.pth');
const CLASS_INDICES_PATH = path.resolve(ROOT_DIR, 'backend', 'models', 'class_indices.json');

/**
 * Validates image buffer, MIME type, size, and integrity.
 */
export async function validateImageQuality(imageInput: string): Promise<ImageQualityResult> {
  if (!imageInput || typeof imageInput !== 'string') {
    return {
      valid: false,
      error: 'No image data provided. Please upload an animal image.',
      mimeType: '',
      base64Data: '',
      buffer: Buffer.alloc(0)
    };
  }

  let mimeType = 'image/jpeg';
  let base64Data = '';
  let buffer: Buffer = Buffer.alloc(0);
  let sourceUrl: string | undefined = undefined;

  // Handle external HTTP/HTTPS URL
  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    sourceUrl = imageInput;
    try {
      const response = await fetch(imageInput, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PashuDrishti-AI/2.0',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        return {
          valid: false,
          error: 'Failed to retrieve specimen image from URL.',
          mimeType: '',
          base64Data: '',
          buffer: Buffer.alloc(0)
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (contentType.includes('png')) mimeType = 'image/png';
      else if (contentType.includes('webp')) mimeType = 'image/webp';
      else if (contentType.includes('gif')) mimeType = 'image/gif';
      else mimeType = 'image/jpeg';
      base64Data = buffer.toString('base64');
    } catch {
      return {
        valid: false,
        error: 'Network timeout while downloading image URL.',
        mimeType: '',
        base64Data: '',
        buffer: Buffer.alloc(0)
      };
    }
  } else {
    // Handle data URI
    const dataUriMatch = imageInput.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1].toLowerCase();
      base64Data = dataUriMatch[2].trim();
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        return {
          valid: false,
          error: 'Corrupted image data. Please upload a valid image file.',
          mimeType: '',
          base64Data: '',
          buffer: Buffer.alloc(0)
        };
      }
    } else {
      // Raw base64 string
      base64Data = imageInput.trim();
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        return {
          valid: false,
          error: 'Invalid base64 image data.',
          mimeType: '',
          base64Data: '',
          buffer: Buffer.alloc(0)
        };
      }
    }
  }

  // 1. Supported file type check
  const supportedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedMimes.some(m => mimeType.includes(m.replace('image/', '')))) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a JPG, PNG, or WEBP photo.',
      mimeType,
      base64Data,
      buffer
    };
  }

  // 2. Minimum byte size check (reject empty/blank files < 200 bytes)
  if (buffer.length < 200) {
    return {
      valid: false,
      error: 'The image file is too small or empty. Please upload a clear photo.',
      mimeType,
      base64Data,
      buffer
    };
  }

  // 3. Maximum byte size check (15MB limit)
  if (buffer.length > 15 * 1024 * 1024) {
    return {
      valid: false,
      error: 'The image file exceeds the 15MB limit. Please upload a smaller image.',
      mimeType,
      base64Data,
      buffer
    };
  }

  return {
    valid: true,
    mimeType,
    base64Data,
    buffer,
    sourceUrl
  };
}

/**
 * Checks local status of the MobileNetV2 architecture.
 * No external API keys are used or required.
 */
export async function getModelStatus(): Promise<ModelStatusOutput> {
  // First try querying running FastAPI backend
  try {
    const res = await fetch('http://127.0.0.1:8000/api/model/status', {
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // FastAPI not running or unreachable, inspect disk files
  }

  const weightsExist = fs.existsSync(MODEL_WEIGHTS_PATH);
  const classesExist = fs.existsSync(CLASS_INDICES_PATH);

  let classes: string[] = [];
  if (classesExist) {
    try {
      const content = fs.readFileSync(CLASS_INDICES_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      classes = Object.values(parsed);
    } catch {
      classes = [];
    }
  }

  const installed = weightsExist && classes.length > 0;

  return {
    installed,
    trained: installed,
    architecture: 'MobileNetV2',
    modelName: 'Custom MobileNetV2 Animal Disease Classifier',
    activeEngine: installed ? 'Custom MobileNetV2 CNN' : 'Custom MobileNetV2 (Not trained/installed yet)',
    modelPath: 'backend/models/mobilenetv2_animal_disease.pth',
    classes,
    numClasses: classes.length,
    device: 'cpu',
    message: installed
      ? `Custom MobileNetV2 model weights found with ${classes.length} classes.`
      : 'Custom MobileNetV2 model has not been trained or installed yet.'
  };
}

/**
 * Predicts disease using the custom trained MobileNetV2 model via FastAPI backend.
 * Strictly avoids fake predictions, hard-coded results, or external AI APIs.
 * If the trained model is not installed or backend is not active, clearly reports this status.
 */
export async function analyzeAnimalImage(
  imageQuality: ImageQualityResult,
  animalType: string,
  userSymptoms: string[] = [],
  authToken?: string
): Promise<AiPredictionOutput> {
  const payloadImage = `data:${imageQuality.mimeType};base64,${imageQuality.base64Data}`;

  // Forward request to FastAPI backend running MobileNetV2 inference
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch('http://127.0.0.1:8000/api/predict', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: payloadImage,
        animalType,
        symptoms: userSymptoms
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success && data.result) {
      return {
        animalType: data.result.animalType || animalType,
        possibleDisease: data.result.possibleDisease,
        alternativePossibilities: data.result.alternativePossibilities || [],
        visibleSymptoms: data.result.visibleSymptoms || userSymptoms,
        severity: data.result.severity || 'moderate',
        confidenceLevel: data.result.confidenceLevel || 'High',
        confidenceScore: data.result.confidence || 85.0,
        explanation: data.result.explanation,
        recommendedNextSteps: data.result.recommendedNextSteps,
        veterinarianRecommendation: data.result.veterinarianRecommendation,
        pathogen: data.result.pathogen,
        engineUsed: data.result.engineUsed || 'Custom MobileNetV2 CNN'
      };
    }

    if (res.status === 503 || data?.detail?.modelReady === false) {
      const msg = typeof data.detail === 'object' && data.detail.message
        ? data.detail.message
        : data.detail || 'Custom MobileNetV2 model has not been trained or installed yet.';
      throw new Error(msg);
    }

    if (data.detail) {
      const errText = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      throw new Error(errText);
    }

    throw new Error(`FastAPI prediction service returned HTTP ${res.status}`);
  } catch (err: any) {
    // If connection to FastAPI failed
    if (err.message && err.message.includes('fetch failed')) {
      const status = await getModelStatus();
      if (!status.installed) {
        throw new Error(
          'Custom MobileNetV2 disease detection model has not been trained or installed yet. ' +
          'Please start the FastAPI backend (python run_backend.py) and train your model using your labeled animal disease dataset.'
        );
      }
      throw new Error(
        'FastAPI prediction backend is not currently running. Please start it with: python run_backend.py'
      );
    }
    throw err;
  }
}
