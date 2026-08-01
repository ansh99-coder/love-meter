/**
 * Love Meter ❤️ — API smoke tests.
 *
 * Usage: node test-api.mjs
 * Requires the server to be running on PORT (default 4000).
 */

const BASE = process.env.TEST_BASE || 'http://localhost:4000/api';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('\n=== Love Meter API Tests ===\n');

  // 1. Health
  await test('Health check', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (!data.ok) throw new Error('Health check failed');
  });

  // 2. Calculate
  await test('Calculate love', async () => {
    const res = await fetch(`${BASE}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yourName: 'Romeo', crushName: 'Juliet', sessionId: 'test123' })
    });
    const data = await res.json();
    if (!data.score || data.score < 0 || data.score > 100) throw new Error('Invalid score');
    console.log(`   Romeo ❤️ Juliet = ${data.score}%`);
  });

  // 3. Deterministic
  await test('Deterministic scoring', async () => {
    const res1 = await fetch(`${BASE}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yourName: 'Romeo', crushName: 'Juliet', sessionId: 'test456' })
    });
    const res2 = await fetch(`${BASE}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yourName: 'Romeo', crushName: 'Juliet', sessionId: 'test789' })
    });
    const d1 = await res1.json();
    const d2 = await res2.json();
    if (d1.score !== d2.score) throw new Error(`Scores differ: ${d1.score} vs ${d2.score}`);
  });

  // 4. Admin config endpoint
  await test('Admin config', async () => {
    const res = await fetch(`${BASE}/admin/config`);
    const data = await res.json();
    if (typeof data.previewMode !== 'boolean') throw new Error('Invalid config response');
  });

  // 5. Frontend page
  await test('Frontend serving', async () => {
    const res = await fetch(`http://localhost:4000/`);
    const html = await res.text();
    if (!html.includes('Love Meter')) throw new Error('Missing brand name');
  });

  console.log('\n=== All tests completed ===\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
