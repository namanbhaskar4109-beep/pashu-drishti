// Test script to verify MobileNetV2 architecture and /api/predict status
const BASE = 'http://localhost:5173';

async function runTests() {
  console.log('--- TEST 0: MobileNetV2 Model Status Check ---');
  const statusRes = await fetch(`${BASE}/api/model/status`);
  const statusData = await statusRes.json();
  console.log('Model Architecture:', statusData.architecture);
  console.log('Engine Status:', statusData.activeEngine);
  console.log('Installed/Ready:', statusData.installed);
  console.log('Message:', statusData.message);

  console.log('\n--- TEST 1: Unauthenticated request to /api/predict ---');
  const res1 = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'data:image/jpeg;base64,1234', animalType: 'Cattle' })
  });
  console.log('Status:', res1.status, '(Expected: 401)');

  console.log('\n--- TEST 2: Login as Dr. Aarav Sharma ---');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.sharma@pashudrishti.ai', password: 'VetCare2026!secure' })
  });
  console.log('Status:', loginRes.status, '(Expected: 200)');
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Got token for user:', loginData.user?.name);

  console.log('\n--- TEST 3: Image quality check (tiny invalid payload) ---');
  const res3 = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ image: 'data:image/jpeg;base64,dG9vc21hbGw=', animalType: 'Cattle' })
  });
  console.log('Status:', res3.status, '(Expected: 400)');
  const data3 = await res3.json();
  console.log('Body:', data3);

  console.log('\n--- TEST 4: Prediction request before model is trained ---');
  const sampleValidJpeg = 'data:image/jpeg;base64,' + Buffer.alloc(1024, 1).toString('base64');
  const resPredict = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      image: sampleValidJpeg,
      animalType: 'Cattle',
      symptoms: ['Skin nodules/lumps']
    })
  });
  console.log('Status:', resPredict.status, '(Expected: 503 if weights not yet trained)');
  const predictData = await resPredict.json();
  console.log('Result payload:', predictData);

  console.log('\n--- ALL ARCHITECTURAL TESTS COMPLETED ---');
}

runTests().catch(console.error);
