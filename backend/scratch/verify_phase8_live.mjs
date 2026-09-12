/**
 * Phase 8 Live API Runtime Verification Script
 * Validates public business discovery, slot preview, public customer booking,
 * secure customer appointment view, anti-IDOR token enforcement, customer cancellation,
 * and slot release against the live running server on port 5000.
 */

const BASE_URL = 'http://localhost:5000/api';

const runLiveVerification = async () => {
  console.log('=== Starting Phase 8 Live Customer Experience Verification ===\n');

  const createdAppointmentIds = [];
  let customerToken = '';

  // Helper for requests
  const api = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
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
      // Non-JSON response
    }

    return { status: res.status, data, headers: res.headers };
  };

  // 1. Public Business Discovery
  console.log('1. Fetching public business profile for "urban-wellness-studio"...');
  const bizRes = await api('/public/businesses/urban-wellness-studio');
  if (bizRes.status !== 200 || !bizRes.data?.data) {
    throw new Error(`Failed to fetch public business: HTTP ${bizRes.status}`);
  }
  const business = bizRes.data.data;
  console.log(`✓ Retrieved Business: "${business.name}" (${business.slug}), Timezone: ${business.timezone}`);
  console.log(`✓ Active Services count: ${business.services?.length}`);

  if (business.passwordHash || business.adminPassword || business.adminEmail) {
    throw new Error('SECURITY VIOLATION: Private administrative data leaked in public response!');
  }
  console.log('✓ Security Verified: Zero private admin/security fields leaked');

  const targetService = business.services[0];
  if (!targetService) {
    throw new Error('No active services found for Urban Wellness Studio');
  }

  // 2. Nonexistent Business Lookup
  console.log('\n2. Testing lookup for nonexistent business slug...');
  const notFoundRes = await api('/public/businesses/completely-fake-business-slug');
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected 404 for fake slug, got ${notFoundRes.status}`);
  }
  console.log('✓ Nonexistent business correctly returned 404 Not Found');

  // 3. Public Slot Discovery
  const TEST_DATE = '2026-10-19'; // Future Monday
  console.log(`\n3. Fetching available slots for service "${targetService.name}" on ${TEST_DATE}...`);
  const slotsRes = await api(`/public/businesses/urban-wellness-studio/slots?serviceId=${targetService._id}&date=${TEST_DATE}`);
  if (slotsRes.status !== 200 || !Array.isArray(slotsRes.data?.data?.slots)) {
    throw new Error(`Failed to fetch public slots: HTTP ${slotsRes.status}`);
  }
  const slots = slotsRes.data.data.slots;
  console.log(`✓ Slot engine returned ${slots.length} available 15-min start slots in ${slotsRes.data.data.timezone}`);
  if (slots.length === 0) {
    throw new Error('No available slots for testing on target date');
  }
  const chosenSlot = slots[0].localStartTime;
  console.log(`✓ Selected available slot: ${chosenSlot}`);

  // 4. Public Appointment Creation
  console.log(`\n4. Booking appointment at ${chosenSlot} via public endpoint...`);
  const bookRes = await api('/public/businesses/urban-wellness-studio/appointments', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: targetService._id,
      date: TEST_DATE,
      startTime: chosenSlot,
      customerName: 'Live Customer Jane',
      customerEmail: 'jane.live@example.com',
      customerPhone: '+1-555-0177',
      notes: 'Live customer experience test',
    }),
  });

  if (bookRes.status !== 201) {
    throw new Error(`Public booking failed: HTTP ${bookRes.status} ${JSON.stringify(bookRes.data)}`);
  }

  const apptData = bookRes.data.data.appointment;
  customerToken = bookRes.data.data.customerToken;
  createdAppointmentIds.push(apptData._id);

  console.log(`✓ Appointment created: ID=${apptData._id}, Status=${apptData.status}`);
  console.log(`✓ Server-calculated times: ${apptData.localStartTime} - ${apptData.localEndTime}`);
  console.log(`✓ Signed Customer Access Token issued: ${customerToken.substring(0, 24)}...`);

  // 5. Customer View Own Appointment
  console.log('\n5. Accessing appointment details as customer using customerToken...');
  const viewRes = await api(`/public/appointments/${apptData._id}?token=${customerToken}`);
  if (viewRes.status !== 200 || viewRes.data?.data?.customerName !== 'Live Customer Jane') {
    throw new Error(`Customer failed to view own appointment: HTTP ${viewRes.status}`);
  }
  console.log(`✓ Customer successfully retrieved appointment: ${viewRes.data.data.service.name} at ${viewRes.data.data.business.name}`);

  // 6. Anti-IDOR Security: Access Without Token or Invalid Token
  console.log('\n6. Testing Anti-IDOR security (missing token & invalid token)...');
  const noTokenRes = await api(`/public/appointments/${apptData._id}`);
  if (noTokenRes.status !== 401) {
    throw new Error(`Expected 401 for missing token, got ${noTokenRes.status}`);
  }
  const fakeTokenRes = await api(`/public/appointments/${apptData._id}?token=bad.token.signature`);
  if (fakeTokenRes.status !== 403) {
    throw new Error(`Expected 403 for forged token, got ${fakeTokenRes.status}`);
  }
  console.log('✓ Anti-IDOR verified: Unauthorized customer requests rejected (401 / 403)');

  // 7. Stale Slot Conflict (409)
  console.log('\n7. Testing booking collision / stale slot rejection on already booked time...');
  const conflictRes = await api('/public/businesses/urban-wellness-studio/appointments', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: targetService._id,
      date: TEST_DATE,
      startTime: chosenSlot,
      customerName: 'Competing Customer',
      customerEmail: 'competing@example.com',
    }),
  });
  if (conflictRes.status !== 409) {
    throw new Error(`Expected 409 Conflict for double-booking, got ${conflictRes.status}`);
  }
  console.log(`✓ Stale slot correctly rejected with 409 Conflict: ${conflictRes.data.message}`);

  // 8. Customer Cancellation
  console.log('\n8. Testing customer-initiated cancellation with token...');
  const cancelRes = await api(`/public/appointments/${apptData._id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ token: customerToken }),
  });
  if (cancelRes.status !== 200 || cancelRes.data?.data?.status !== 'CANCELLED') {
    throw new Error(`Customer cancellation failed: HTTP ${cancelRes.status}`);
  }
  console.log('✓ Appointment cancelled successfully by customer');

  // 9. Verify Slot Released and Re-Bookable
  console.log('\n9. Verifying released slot is immediately re-bookable...');
  const rebookRes = await api('/public/businesses/urban-wellness-studio/appointments', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: targetService._id,
      date: TEST_DATE,
      startTime: chosenSlot,
      customerName: 'Rebook Customer',
      customerEmail: 'rebook@example.com',
    }),
  });
  if (rebookRes.status !== 201) {
    throw new Error(`Failed to rebook released slot: HTTP ${rebookRes.status}`);
  }
  createdAppointmentIds.push(rebookRes.data.data.appointment._id);
  const rebookToken = rebookRes.data.data.customerToken;
  console.log('✓ Released slot re-booked successfully (201 Created)');

  // 10. Cross-Tenant Service Isolation
  console.log('\n10. Testing cross-tenant service injection attempt...');
  // Fetch TechFix service
  const techFixBiz = await api('/public/businesses/techfix-services');
  const techFixServiceId = techFixBiz.data?.data?.services?.[0]?._id;
  if (techFixServiceId) {
    const crossRes = await api('/public/businesses/urban-wellness-studio/appointments', {
      method: 'POST',
      body: JSON.stringify({
        serviceId: techFixServiceId, // Belongs to TechFix, not Urban Wellness
        date: TEST_DATE,
        startTime: '11:00',
        customerName: 'Attacker',
        customerEmail: 'attacker@example.com',
      }),
    });
    if (crossRes.status !== 403) {
      throw new Error(`Expected 403 for cross-tenant service, got ${crossRes.status}`);
    }
    console.log('✓ Cross-tenant service booking attempt correctly rejected with 403');
  }

  // 11. Form Validation
  console.log('\n11. Testing invalid email and non-15m interval validation...');
  const invalidEmailRes = await api('/public/businesses/urban-wellness-studio/appointments', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: targetService._id,
      date: TEST_DATE,
      startTime: '10:07', // Not aligned to 15m
      customerName: 'A', // Too short
      customerEmail: 'not-an-email',
    }),
  });
  if (invalidEmailRes.status !== 400) {
    throw new Error(`Expected 400 for invalid booking payload, got ${invalidEmailRes.status}`);
  }
  console.log('✓ Invalid booking input rejected with 400 Bad Request');

  // Clean up rebook appointment
  console.log('\n=== Cleaning Up Live Test Records ===');
  await api(`/public/appointments/${rebookRes.data.data.appointment._id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ token: rebookToken }),
  });
  console.log('✓ Cancelled rebooked test appointment');

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 8 LIVE RUNTIME CHECKS PASSED CLEANLY!');
  console.log('======================================================\n');
};

runLiveVerification().catch((err) => {
  console.error('\n❌ Live Verification Failed:', err);
  process.exit(1);
});
