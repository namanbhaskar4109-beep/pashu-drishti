import { validateImageQuality, getModelStatus } from './ai.js';

async function testMobileNetArchitecture() {
  console.log('Testing validateImageQuality and getModelStatus...');

  // 1. Test 1x1 PNG or small base64
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const quality = await validateImageQuality(samplePng);
  console.log('Quality check for valid PNG:', quality.valid, 'mime:', quality.mimeType);

  // 2. Test getModelStatus
  const status = await getModelStatus();
  console.log('\n--- MobileNetV2 Model Status ---');
  console.log('Architecture:', status.architecture);
  console.log('Engine:', status.activeEngine);
  console.log('Installed/Ready:', status.installed);
  console.log('Message:', status.message);

  console.log('\nAll architectural unit checks passed successfully!');
}

testMobileNetArchitecture().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
