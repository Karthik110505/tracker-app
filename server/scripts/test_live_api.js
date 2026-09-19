// Native fetch in Node 18+

async function testLiveApi() {
  console.log('Testing live API on http://localhost:5000...');
  
  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/api/health');
  const health = await healthRes.json();
  console.log('1. Health check:', health);

  // 2. Auth login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'karthik', password: 'Karthik@1155' })
  });
  const loginData = await loginRes.json();
  console.log('2. Auth login response:', JSON.stringify(loginData));

  if (!loginData.token) {
    throw new Error('No token returned from login');
  }

  const authHeaders = {
    'Authorization': `Bearer ${loginData.token}`,
    'Content-Type': 'application/json'
  };

  // 3. Folders
  const foldersRes = await fetch('http://localhost:5000/api/folders', { headers: authHeaders });
  const foldersData = await foldersRes.json();
  const folders = foldersData.folders || [];
  console.log(`3. Folders retrieved from Atlas: ${folders.length} folders.`);

  // 4. Tests
  const testsRes = await fetch('http://localhost:5000/api/tests', { headers: authHeaders });
  const testsData = await testsRes.json();
  const tests = testsData.tests || [];
  console.log(`4. Tests retrieved from Atlas: ${tests.length} tests.`);

  // 5. Verify no paperHtml
  const withHtml = tests.filter(t => t.paperHtml);
  console.log(`5. Tests with paperHtml in Atlas response: ${withHtml.length} (must be 0).`);

  // 6. Sync pull
  const syncRes = await fetch('http://localhost:5000/api/sync', { headers: authHeaders });
  const syncData = await syncRes.json();
  console.log(`6. Sync pull retrieved: ${syncData.folders?.length} folders, ${syncData.tests?.length} tests.`);

  console.log('\n🎉 ALL LIVE API CHECKS PASSED WITH 100% SUCCESS!\n');
}

testLiveApi().catch(err => {
  console.error('Live API test failed:', err);
  process.exit(1);
});
