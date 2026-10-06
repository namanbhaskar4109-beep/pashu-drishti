import fs from 'node:fs';
import path from 'node:path';

let envLoaded = false;

export function loadEnv(force = false): void {
  if (envLoaded && !force) return;
  envLoaded = true;

  // Resolve base directory
  const rootDir = process.cwd();

  // Attempt Node 20.6+ built-in process.loadEnvFile
  if (typeof (process as any).loadEnvFile === 'function') {
    try {
      (process as any).loadEnvFile(path.resolve(rootDir, '.env'));
    } catch {
      // .env may not exist, continue
    }
    try {
      (process as any).loadEnvFile(path.resolve(rootDir, '.env.local'));
    } catch {
      // .env.local may not exist, continue
    }
  }

  // Fallback safe manual parser for .env and .env.local
  const candidateFiles = ['.env', '.env.local'];
  for (const filename of candidateFiles) {
    const fullPath = path.resolve(rootDir, filename);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();

        // Strip single or double quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }

        if (key && (force || !process.env[key])) {
          process.env[key] = val;
        }
      }
    } catch {
      // ignore read error
    }
  }
}

export function getModelConfig(): {
  weightsPath: string;
  classesPath: string;
  fastApiHost: string;
  fastApiPort: string;
} {
  loadEnv();

  return {
    weightsPath: process.env.MODEL_WEIGHTS_PATH || 'backend/models/mobilenetv2_animal_disease.pth',
    classesPath: process.env.CLASS_INDICES_PATH || 'backend/models/class_indices.json',
    fastApiHost: process.env.FASTAPI_HOST || '127.0.0.1',
    fastApiPort: process.env.FASTAPI_PORT || '8000'
  };
}
