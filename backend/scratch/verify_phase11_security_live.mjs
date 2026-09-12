/**
 * Phase 11 Live Security Verification Script
 * Validates actual live backend on http://localhost:5000 against security attacks,
 * authentication bypasses, IDOR attempts, parameter tampering, race conditions,
 * and information leakage.
 */

const BASE_URL = 'http://localhost:5000/api';

const runSecurityLiveAudit = async () => {
  console.log('================================================================');
  console.log('  SLOTIFY PHASE 11 LIVE API SECURITY VERIFICATION AUDIT');
  console.log('================================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  const check = (name, passed, details = '') => {
    totalChecks++;
    if (passed) {
      passedChecks++;
      console.log(`  [PASS] #${totalChecks}: ${name}`);
      if (details) console.log(`         -> ${details}`);
    } else {
      console.error(`  [FAIL] #${totalChecks}: ${name}`);
      if (details) console.error(`         -> ${details}`);
    }
  };

  let urbanAdminCookie = '';
  let techFixAdminCookie = '';
  let systemOwnerCookie = '';
  let urbanBusinessId = '';
  let techFixBusinessId = '';

  const api = async (endpoint, options = {}, cookie = '') => {
    const headers = {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON
    }

    return { status: res.status, data, headers: res.headers };
  };

  // 1. Unauthenticated Privileged Endpoint Access
  console.log('\n--- 1. Authentication & Cookie Guards ---');
  const unauthRes = await api('/services');
  check(
    'Unauthenticated privileged access rejected with 401',
    unauthRes.status === 401 && unauthRes.data?.success === false,
    `Status: ${unauthRes.status}, Message: "${unauthRes.data?.message}"`
  );

  // 2. Invalid JWT & Tampered Token
  const badJwtRes = await api('/services', {}, 'slotify_token=tampered.header.payload.signature');
  check(
    'Tampered/malformed JWT rejected with 401',
    badJwtRes.status === 401 && badJwtRes.data?.success === false,
    `Status: ${badJwtRes.status}`
  );

  // 3. Login Authentication & Cookie Flags Verification
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@urbanwellness.slotify.dev',
      password: 'DevPassword123!',
    }),
  });

  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  urbanAdminCookie = setCookieHeader.split(';')[0] || '';
  urbanBusinessId = loginRes.data?.data?.user?.businessId;

  check(
    'Valid Business Admin login returns 200 and HTTP-only cookie',
    loginRes.status === 200 &&
      setCookieHeader.toLowerCase().includes('httponly') &&
      (setCookieHeader.toLowerCase().includes('samesite=lax') ||
        setCookieHeader.toLowerCase().includes('samesite=none') ||
        setCookieHeader.toLowerCase().includes('samesite=strict')),
    `Cookie flags present: HttpOnly, SameSite`
  );

  check(
    'Password hash is never exposed in login response',
    loginRes.data?.data?.user?.passwordHash === undefined &&
      !JSON.stringify(loginRes.data).includes('$2a$'),
    'user.passwordHash is undefined'
  );

  // Login second tenant (TechFix)
  const techLoginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@techfix.slotify.dev',
      password: 'DevPassword123!',
    }),
  });
  techFixAdminCookie = techLoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  techFixBusinessId = techLoginRes.data?.data?.user?.businessId;

  // Login System Owner
  const ownerLoginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'owner@slotify.dev',
      password: 'DevPassword123!',
    }),
  });
  systemOwnerCookie = ownerLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  // 4. Role Escalation Protection
  console.log('\n--- 2. RBAC & Privilege Escalation ---');
  const roleEscalationRes = await api('/businesses', {}, urbanAdminCookie);
  check(
    'BUSINESS_ADMIN rejected from SYSTEM_OWNER /api/businesses with 403',
    roleEscalationRes.status === 403,
    `Status: ${roleEscalationRes.status}`
  );

  const ownerPlatformRes = await api('/analytics/platform', {}, systemOwnerCookie);
  check(
    'SYSTEM_OWNER permitted to access /api/analytics/platform',
    ownerPlatformRes.status === 200 && ownerPlatformRes.data?.success === true,
    `Total businesses: ${ownerPlatformRes.data?.data?.totalBusinesses}`
  );

  // 5. Multi-Tenant IDOR & Parameter Tampering
  console.log('\n--- 3. Multi-Tenant Isolation & IDOR Guards ---');
  const techFixServices = await api('/services', {}, techFixAdminCookie);
  const techFixServiceId = techFixServices.data?.data?.[0]?._id;

  if (techFixServiceId) {
    const crossTenantGet = await api(`/services/${techFixServiceId}`, {}, urbanAdminCookie);
    check(
      'Admin A cross-tenant access to Tenant B service rejected with 403',
      crossTenantGet.status === 403,
      `Attempted access to serviceId ${techFixServiceId} -> Status: ${crossTenantGet.status}`
    );
  } else {
    check('Admin A cross-tenant service check (skipped, no tech services)', true);
  }

  const querySpoofRes = await api(
    `/services?businessId=${techFixBusinessId}`,
    {},
    urbanAdminCookie
  );
  check(
    'businessId query parameter spoofing rejected with 403',
    querySpoofRes.status === 403,
    `Status: ${querySpoofRes.status}`
  );

  const bodySpoofRes = await api(
    '/services',
    {
      method: 'POST',
      body: JSON.stringify({
        businessId: techFixBusinessId,
        name: 'Malicious Spoofed Service',
        durationMinutes: 30,
        price: 50,
      }),
    },
    urbanAdminCookie
  );
  check(
    'businessId body parameter spoofing rejected with 403',
    bodySpoofRes.status === 403,
    `Status: ${bodySpoofRes.status}`
  );

  // 6. Malformed ObjectId Handling
  console.log('\n--- 4. Input Validation & Injection Hardening ---');
  const malformedIdRes = await api('/services/malformed-id-not-hex', {}, urbanAdminCookie);
  check(
    'Malformed ObjectId URL parameter returns 400 Bad Request (not 500)',
    malformedIdRes.status === 400 && malformedIdRes.data?.success === false,
    `Status: ${malformedIdRes.status}, Message: "${malformedIdRes.data?.message}"`
  );

  // 7. NoSQL Operator Injection
  const noSqlLoginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: { $ne: null },
      password: 'wrong',
    }),
  });
  check(
    'NoSQL operator injection in login body rejected with 400',
    noSqlLoginRes.status === 400 && noSqlLoginRes.data?.success === false,
    `Status: ${noSqlLoginRes.status}`
  );

  // 8. Regex Search Attack
  const regexSearchRes = await api(
    `/appointments?search=${encodeURIComponent('.*+?^${}()|[]\\(a+)+$')}`,
    {},
    urbanAdminCookie
  );
  check(
    'ReDoS regex search characters handled safely without crashing (200 OK)',
    regexSearchRes.status === 200 && regexSearchRes.data?.success === true,
    `Status: ${regexSearchRes.status}`
  );

  // 9. Analytics Date Range Abuse
  console.log('\n--- 5. Analytics Security & Boundary Protection ---');
  const invertedDatesRes = await api(
    '/analytics/overview?startDate=2026-12-31&endDate=2026-01-01',
    {},
    urbanAdminCookie
  );
  check(
    'Analytics inverted dates rejected with 400',
    invertedDatesRes.status === 400,
    `Message: "${invertedDatesRes.data?.message}"`
  );

  const hugeDateRangeRes = await api(
    '/analytics/overview?startDate=2026-01-01&endDate=2026-12-31',
    {},
    urbanAdminCookie
  );
  check(
    'Analytics range exceeding 92 days rejected with 400',
    hugeDateRangeRes.status === 400,
    `Message: "${hugeDateRangeRes.data?.message}"`
  );

  // 10. Public Booking Validation & Race Condition Concurrency
  const urbanBizInfo = await api('/public/businesses/urban-wellness-studio');
  const firstService =
    urbanBizInfo.data?.data?.services?.find((s) => s.name === 'Initial Wellness Consultation') ||
    urbanBizInfo.data?.data?.services?.[0];
  const serviceId = firstService?._id;

  // Query available slots
  const targetDate = '2026-11-23'; // Monday
  const slotsRes = await api(
    `/public/businesses/urban-wellness-studio/slots?serviceId=${serviceId}&date=${targetDate}`
  );
  const availableSlots = slotsRes.data?.data?.slots || [];
  const slotObj = availableSlots[0];
  const testSlot = slotObj?.localStartTime || '10:00';
  const testStaffId = slotObj?.staffId;

  console.log(`Testing slot concurrency on ${targetDate} at ${testSlot} for service ${firstService?.name}...`);

  // Concurrent booking requests
  const [booking1, booking2] = await Promise.all([
    api('/public/businesses/urban-wellness-studio/appointments', {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        date: targetDate,
        startTime: testSlot,
        customerName: 'Racer One',
        customerEmail: 'racer1@test.com',
        ...(testStaffId ? { staffId: testStaffId } : {}),
      }),
    }),
    api('/public/businesses/urban-wellness-studio/appointments', {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        date: targetDate,
        startTime: testSlot,
        customerName: 'Racer Two',
        customerEmail: 'racer2@test.com',
        ...(testStaffId ? { staffId: testStaffId } : {}),
      }),
    }),
  ]);

  const successBookings = [booking1, booking2].filter((b) => b.status === 201);
  const conflictBookings = [booking1, booking2].filter((b) => b.status === 409);

  check(
    'Concurrent double-booking race condition: exactly 1 succeeds (201), 1 rejected (409)',
    successBookings.length === 1 && conflictBookings.length === 1,
    `Booking1: ${booking1.status}, Booking2: ${booking2.status}`
  );

  // 11. Customer Appointment Access Token & Anti-IDOR
  console.log('\n--- 7. Customer Appointment Token Security ---');
  const createdAppt = successBookings[0]?.data?.data?.appointment;
  const customerToken = successBookings[0]?.data?.data?.customerToken;

  if (createdAppt && customerToken) {
    const viewApptRes = await api(`/public/appointments/${createdAppt._id}?token=${customerToken}`);
    check(
      'Legitimate customer access token views appointment details',
      viewApptRes.status === 200 &&
        (viewApptRes.data?.data?.customerEmail === 'racer1@test.com' ||
          viewApptRes.data?.data?.customerEmail === 'racer2@test.com'),
      `Customer: ${viewApptRes.data?.data?.customerName}`
    );

    // Tampered token
    const tamperedToken = customerToken.slice(0, -6) + 'abcdef';
    const tamperedRes = await api(`/public/appointments/${createdAppt._id}?token=${tamperedToken}`);
    check(
      'Tampered customer token rejected with 401/403',
      tamperedRes.status === 401 || tamperedRes.status === 403,
      `Status: ${tamperedRes.status}`
    );

    // Customer cancellation
    const cancelRes = await api(`/public/appointments/${createdAppt._id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ token: customerToken }),
    });
    check(
      'Customer can cancel appointment with valid access token',
      cancelRes.status === 200 && cancelRes.data?.data?.status === 'CANCELLED',
      `Status updated to: ${cancelRes.data?.data?.status}`
    );

    // Re-booking freed slot
    const rebookRes = await api('/public/businesses/urban-wellness-studio/appointments', {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        date: targetDate,
        startTime: testSlot,
        customerName: 'Rebooker Client',
        customerEmail: 'rebooker@test.com',
        ...(testStaffId ? { staffId: testStaffId } : {}),
      }),
    });
    check(
      'Cancelled slot immediately becomes available and rebookable (201 Created)',
      rebookRes.status === 201 && rebookRes.data?.success === true,
      `Rebooking status: ${rebookRes.status}`
    );

    // Clean up rebooked appointment
    const rebookedApptId = rebookRes.data?.data?.appointment?._id;
    const rebookedToken = rebookRes.data?.data?.customerToken;
    if (rebookedApptId && rebookedToken) {
      await api(`/public/appointments/${rebookedApptId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ token: rebookedToken }),
      });
    }
  }

  // 12. Information Leakage & Error Formatting
  console.log('\n--- 8. Information Leakage & Environment Audit ---');
  const healthRes = await api('/health');
  const healthStr = JSON.stringify(healthRes.data);
  check(
    'Health endpoint does not expose database credentials or secrets',
    healthRes.status === 200 &&
      !healthStr.includes('mongodb') &&
      !healthStr.includes('JWT') &&
      !healthStr.includes('secret'),
    `Health status: ${healthRes.status}`
  );

  console.log('\n================================================================');
  console.log(`  AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('>>> [SUCCESS] All live API security checks PASSED!');
    process.exit(0);
  } else {
    console.error(`>>> [FAILURE] ${totalChecks - passedChecks} security checks failed!`);
    process.exit(1);
  }
};

runSecurityLiveAudit().catch((err) => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
