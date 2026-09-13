const BASE_URL = 'http://localhost:5000';

async function runLiveTests() {
  console.log('=== Step 1: Test GET /api/public/businesses ===');
  const res1 = await fetch(`${BASE_URL}/api/public/businesses`);
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, Success: ${data1.success}, Count: ${data1.count}`);
  console.log('Businesses returned:');
  data1.data.forEach((b) => {
    console.log(` - [${b.status}] ${b.name} (${b.slug}) | Timezone: ${b.timezone} | Addr: ${b.address}`);
    if (b.password || b.adminId || b.__v) {
      throw new Error(`Data leakage detected on business ${b.slug}!`);
    }
  });

  if (data1.data.some((b) => b.status !== 'ACTIVE')) {
    throw new Error('A non-active business was returned by public discovery!');
  }

  console.log('\n=== Step 2: Test Search Filtering (?search=urban) ===');
  const res2 = await fetch(`${BASE_URL}/api/public/businesses?search=urban`);
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, Count: ${data2.count}`);
  if (!data2.data.some((b) => b.slug === 'urban-wellness-studio')) {
    throw new Error('Urban Wellness Studio was not found by search=urban');
  }

  console.log('\n=== Step 3: Test Status Spoofing (?status=DISABLED) ===');
  const res3 = await fetch(`${BASE_URL}/api/public/businesses?status=DISABLED`);
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Count: ${data3.count}`);
  if (data3.data.some((b) => b.status === 'DISABLED')) {
    throw new Error('Status spoofing succeeded in returning DISABLED business!');
  }

  console.log('\n=== Step 4: Test Single Business Endpoint (/api/public/businesses/:slug) ===');
  const res4 = await fetch(`${BASE_URL}/api/public/businesses/urban-wellness-studio`);
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}, Business Name: ${data4.data?.name}, Services count: ${data4.data?.services?.length}`);

  console.log('\n=== Step 5: System Owner Create ACTIVE Business & Verify Live Discovery ===');
  // Log in as System Owner
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@slotify.dev', password: 'DevPassword123!' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Owner login status:', loginRes.status);

  // Create a new test business
  const testSlug = `test-clinic-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: 'Dynamic Test Dental Clinic',
      slug: testSlug,
      contactEmail: 'contact@testclinic.dev',
      contactPhone: '+1-555-9988',
      address: '777 Health Blvd',
      timezone: 'America/Chicago',
      status: 'ACTIVE',
      adminName: 'Dr. Test Admin',
      adminEmail: `admin.${Date.now()}@testclinic.dev`,
      adminPassword: 'Password123!',
    }),
  });
  const createData = await createRes.json();
  console.log(`Created business status: ${createRes.status}, ID: ${createData.data?.business?._id}, Slug: ${createData.data?.business?.slug}`);
  const createdBusinessId = createData.data?.business?._id;

  // Immediately query public discovery API
  const resAfterCreate = await fetch(`${BASE_URL}/api/public/businesses`);
  const dataAfterCreate = await resAfterCreate.json();
  const foundInDiscovery = dataAfterCreate.data.some((b) => b.slug === testSlug);
  console.log(`Newly created business '${testSlug}' found in public discovery: ${foundInDiscovery}`);
  if (!foundInDiscovery) {
    throw new Error('Newly created ACTIVE business was not found in public discovery!');
  }

  console.log('\n=== Step 6: Disable the business and verify it immediately disappears from discovery ===');
  const patchRes = await fetch(`${BASE_URL}/api/businesses/${createdBusinessId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ status: 'DISABLED' }),
  });
  console.log('Patch status response:', patchRes.status);

  const resAfterDisable = await fetch(`${BASE_URL}/api/public/businesses`);
  const dataAfterDisable = await resAfterDisable.json();
  const foundAfterDisable = dataAfterDisable.data.some((b) => b.slug === testSlug);
  console.log(`Disabled business found in public discovery: ${foundAfterDisable} (Expected: false)`);
  if (foundAfterDisable) {
    throw new Error('Disabled business was found in public discovery!');
  }

  // Also check single business booking lookup for disabled business
  const resSingleDisabled = await fetch(`${BASE_URL}/api/public/businesses/${testSlug}`);
  const dataSingleDisabled = await resSingleDisabled.json();
  console.log(`Single lookup for disabled business: isBookingDisabled=${dataSingleDisabled.data?.isBookingDisabled}, status=${dataSingleDisabled.data?.status}`);
  if (!dataSingleDisabled.data?.isBookingDisabled) {
    throw new Error('Single lookup for disabled business did not mark isBookingDisabled as true!');
  }

  console.log('\n>>> ALL LIVE BACKEND VERIFICATION CHECKS PASSED! <<<');
}

runLiveTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
