import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

function extractCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  return setCookie.split(';')[0];
}

async function main() {
  console.log('================================================================');
  console.log('--- STARTING PHASE 6 RUNTIME API VERIFICATION ---');
  console.log('================================================================\n');

  // --- Step 1: Log in Admin A (Urban Wellness) ---
  console.log('[1] Login as Business Admin A (Urban Wellness)');
  const loginResA = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@urbanwellness.slotify.dev',
      password: 'DevPassword123!',
    }),
  });
  assert.strictEqual(loginResA.status, 200, 'Admin A login failed');
  const cookieA = extractCookie(loginResA);
  const dataA = await loginResA.json();
  const businessA_Id = dataA.data.user.businessId;
  console.log(`✔ Logged in as Admin A (Business ID: ${businessA_Id})`);

  // --- Step 2: Log in Admin B (TechFix) ---
  console.log('\n[2] Login as Business Admin B (TechFix)');
  const loginResB = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@techfix.slotify.dev',
      password: 'DevPassword123!',
    }),
  });
  assert.strictEqual(loginResB.status, 200, 'Admin B login failed');
  const cookieB = extractCookie(loginResB);
  const dataB = await loginResB.json();
  const businessB_Id = dataB.data.user.businessId;
  console.log(`✔ Logged in as Admin B (Business ID: ${businessB_Id})`);

  // --- Step 3: Log in System Owner ---
  console.log('\n[3] Login as System Owner');
  const loginResOwner = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@slotify.dev',
      password: 'DevPassword123!',
    }),
  });
  assert.strictEqual(loginResOwner.status, 200, 'System Owner login failed');
  const cookieOwner = extractCookie(loginResOwner);
  console.log('✔ Logged in as System Owner');

  // Fetch a service and staff member from Admin A
  const srvResA = await fetch(`${BASE_URL}/services`, { headers: { Cookie: cookieA } });
  const srvDataA = await srvResA.json();
  const serviceA = srvDataA.data.services[0];
  assert.ok(serviceA, 'Admin A should have at least one service');

  const staffResA = await fetch(`${BASE_URL}/staff`, { headers: { Cookie: cookieA } });
  const staffDataA = await staffResA.json();
  const staffA = staffDataA.data.staff[0];

  // Fetch a service and staff member from Admin B
  const srvResB = await fetch(`${BASE_URL}/services`, { headers: { Cookie: cookieB } });
  const srvDataB = await srvResB.json();
  const serviceB = srvDataB.data.services[0];
  assert.ok(serviceB, 'Admin B should have at least one service');

  // Pre-cleanup existing test windows for Monday and Tuesday if any
  const existingAvailRes = await fetch(`${BASE_URL}/availability`, { headers: { Cookie: cookieA } });
  const existingAvail = (await existingAvailRes.json()).data.availability || [];
  for (const item of existingAvail) {
    await fetch(`${BASE_URL}/availability/${item._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
  }

  // --- Step 4: Admin A creates weekly availability window ---
  console.log('\n[4] Admin A: Create Business-Wide Availability Window');
  const createAvailRes1 = await fetch(`${BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '13:00',
    }),
  });
  const avail1Json = await createAvailRes1.json();
  if (createAvailRes1.status !== 201) {
    console.log('Avail 1 error:', avail1Json);
  }
  assert.strictEqual(createAvailRes1.status, 201, 'Failed to create availability window 1');
  const avail1 = avail1Json.data.availability;
  console.log(`✔ Created business availability: Monday 09:00 - 13:00 (ID: ${avail1._id})`);

  // --- Step 5: Admin A creates second non-overlapping window ---
  console.log('\n[5] Admin A: Create Second Non-Overlapping Window on Same Day');
  const createAvailRes2 = await fetch(`${BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      dayOfWeek: 1, // Monday
      startTime: '14:00',
      endTime: '18:00',
    }),
  });
  assert.strictEqual(createAvailRes2.status, 201, 'Failed to create availability window 2');
  const avail2 = (await createAvailRes2.json()).data.availability;
  console.log(`✔ Created second window: Monday 14:00 - 18:00 (ID: ${avail2._id})`);

  // --- Step 6: Overlap check: Attempt overlapping window ---
  console.log('\n[6] Validation Check: Overlapping Availability Window');
  const overlapRes = await fetch(`${BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      dayOfWeek: 1,
      startTime: '12:00',
      endTime: '15:00', // overlaps 09:00-13:00 and 14:00-18:00
    }),
  });
  assert.strictEqual(overlapRes.status, 400, 'Overlapping window should be rejected with 400');
  const overlapErr = await overlapRes.json();
  console.log(`✔ Overlap correctly rejected with 400: "${overlapErr.message}"`);

  // --- Step 7: Staff-specific availability ---
  let staffAvail = null;
  if (staffA) {
    console.log('\n[7] Admin A: Create Staff-Specific Availability Window');
    const staffAvailRes = await fetch(`${BASE_URL}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        staffId: staffA._id,
        dayOfWeek: 2, // Tuesday
        startTime: '10:00',
        endTime: '16:00',
      }),
    });
    const staffAvailJson = await staffAvailRes.json();
    if (staffAvailRes.status !== 201) {
      console.log('Staff avail error:', staffAvailJson);
    }
    assert.strictEqual(staffAvailRes.status, 201, 'Failed to create staff availability');
    staffAvail = staffAvailJson.data.availability;
    console.log(`✔ Created staff-specific availability for "${staffA.name}": Tuesday 10:00 - 16:00`);
  }

  // --- Step 8: Cross-tenant staff assignment attack ---
  const staffResB = await fetch(`${BASE_URL}/staff`, { headers: { Cookie: cookieB } });
  const staffB = (await staffResB.json()).data.staff[0];
  if (staffB) {
    console.log('\n[8] Attack Check: Admin A assigning Business B staff member to availability');
    const attackRes = await fetch(`${BASE_URL}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        staffId: staffB._id,
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '12:00',
      }),
    });
    assert.strictEqual(attackRes.status, 403, 'Cross-tenant staff should be rejected with 403');
    const attackErr = await attackRes.json();
    console.log(`✔ Blocked cross-tenant staff with 403: "${attackErr.message}"`);
  }

  // --- Step 9: Blocked Dates CRUD ---
  console.log('\n[9] Admin A: Create Blocked Date');
  const createBlockedRes = await fetch(`${BASE_URL}/blocked-dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      date: '2026-12-25',
      reason: 'Christmas Holiday',
    }),
  });
  assert.strictEqual(createBlockedRes.status, 201, 'Failed to create blocked date');
  const blockedDate1 = (await createBlockedRes.json()).data.blockedDate;
  console.log(`✔ Created blocked date: 2026-12-25 (ID: ${blockedDate1._id})`);

  // --- Step 10: Duplicate Blocked Date Check ---
  console.log('\n[10] Validation Check: Duplicate Blocked Date');
  const dupBlockedRes = await fetch(`${BASE_URL}/blocked-dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      date: '2026-12-25',
      reason: 'Duplicate Holiday',
    }),
  });
  assert.strictEqual(dupBlockedRes.status, 400, 'Duplicate blocked date should be rejected with 400');
  const dupBlockedErr = await dupBlockedRes.json();
  console.log(`✔ Duplicate blocked date rejected with 400: "${dupBlockedErr.message}"`);

  // --- Step 11: Slot Preview on Open Working Day ---
  console.log('\n[11] Slot Preview: Calculating slots on open Monday (2026-10-12)');
  // Ensure staffA provides serviceA
  if (staffA) {
    await fetch(`${BASE_URL}/staff/${staffA._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ serviceIds: [serviceA._id] }),
    });
  }

  // 2026-10-12 is Monday
  const slotRes = await fetch(
    `${BASE_URL}/availability/slots?serviceId=${serviceA._id}&date=2026-10-12`,
    { headers: { Cookie: cookieA } }
  );
  assert.strictEqual(slotRes.status, 200, 'Slot preview failed');
  const slotData = (await slotRes.json()).data;
  assert.ok(slotData.slotsCount > 0, 'Expected slots to be generated for Monday working hours');
  console.log(`✔ Slots calculated successfully. Timezone: ${slotData.timezone}, Total slots: ${slotData.slotsCount}`);
  console.log(`  First slot: ${slotData.slots[0].localStartTime} - ${slotData.slots[0].localEndTime} (Staff: ${slotData.slots[0].staffName})`);
  console.log(`  Last slot: ${slotData.slots[slotData.slots.length - 1].localStartTime} - ${slotData.slots[slotData.slots.length - 1].localEndTime}`);

  // --- Step 12: Slot Preview on Blocked Date ---
  console.log('\n[12] Slot Preview: Calculating slots on blocked Christmas (2026-12-25)');
  const blockedSlotRes = await fetch(
    `${BASE_URL}/availability/slots?serviceId=${serviceA._id}&date=2026-12-25`,
    { headers: { Cookie: cookieA } }
  );
  assert.strictEqual(blockedSlotRes.status, 200, 'Blocked slot preview request failed');
  const blockedSlotData = (await blockedSlotRes.json()).data;
  assert.strictEqual(blockedSlotData.slotsCount, 0, 'Blocked date should have 0 slots');
  console.log(`✔ Verified blocked date yields 0 slots.`);

  // --- Step 13: Attack Check: Admin A previews slots for Business B service ---
  console.log('\n[13] Attack Check: Admin A queries slots for Business B service');
  const crossSlotRes = await fetch(
    `${BASE_URL}/availability/slots?serviceId=${serviceB._id}&date=2026-10-12`,
    { headers: { Cookie: cookieA } }
  );
  assert.strictEqual(crossSlotRes.status, 403, 'Cross-tenant slot preview should be rejected with 403');
  const crossSlotErr = await crossSlotRes.json();
  console.log(`✔ Blocked cross-tenant slot calculation with 403: "${crossSlotErr.message}"`);

  // --- Step 14: Attack Check: Admin A reads Business B availability ID ---
  console.log('\n[14] Attack Check: Admin A reads Business B availability');
  // Admin B creates an availability window
  const createAvailBRes = await fetch(`${BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '16:00',
    }),
  });
  const availB = (await createAvailBRes.json()).data.availability;

  const readAvailBRes = await fetch(`${BASE_URL}/availability/${availB._id}`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(readAvailBRes.status, 403, 'Cross-tenant read availability must be 403');
  console.log('✔ Blocked cross-tenant availability reading with 403');

  // --- Step 15: Attack Check: Admin A reads Business B blocked date ---
  console.log('\n[15] Attack Check: Admin A reads Business B blocked date');
  const createBlockedBRes = await fetch(`${BASE_URL}/blocked-dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({
      date: '2026-11-26',
      reason: 'TechFix Maintenance',
    }),
  });
  const blockedB = (await createBlockedBRes.json()).data.blockedDate;

  const readBlockedBRes = await fetch(`${BASE_URL}/blocked-dates/${blockedB._id}`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(readBlockedBRes.status, 403, 'Cross-tenant read blocked date must be 403');
  console.log('✔ Blocked cross-tenant blocked date reading with 403');

  // --- Step 16: Role Check: System Owner accessing /api/availability ---
  console.log('\n[16] Role Check: System Owner accessing tenant operational endpoints');
  const ownerAvailRes = await fetch(`${BASE_URL}/availability`, {
    headers: { Cookie: cookieOwner },
  });
  assert.strictEqual(ownerAvailRes.status, 403, 'System Owner should be blocked from availability with 403');
  console.log('✔ System Owner correctly blocked from tenant availability (403)');

  // --- Step 17: Cleanup test records ---
  console.log('\n[17] Cleanup: Deleting created test windows and blocked dates');
  await fetch(`${BASE_URL}/availability/${avail1._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
  await fetch(`${BASE_URL}/availability/${avail2._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
  if (staffAvail) {
    await fetch(`${BASE_URL}/availability/${staffAvail._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
  }
  await fetch(`${BASE_URL}/blocked-dates/${blockedDate1._id}`, { method: 'DELETE', headers: { Cookie: cookieA } });
  await fetch(`${BASE_URL}/availability/${availB._id}`, { method: 'DELETE', headers: { Cookie: cookieB } });
  await fetch(`${BASE_URL}/blocked-dates/${blockedB._id}`, { method: 'DELETE', headers: { Cookie: cookieB } });
  console.log('✔ Cleanup completed cleanly.');

  console.log('\n================================================================');
  console.log('✔ ALL 17 PHASE 6 RUNTIME API CHECKS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('❌ Phase 6 Runtime Verification Failed:', err);
  process.exit(1);
});
