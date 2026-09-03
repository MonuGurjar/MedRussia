/**
 * MedRussia Web — Comprehensive Functional Button & Backend Data-Flow Audit Test Script
 * Tests every user interaction, form submission, and API call.
 */
import assert from 'node:assert';

const API_BASE = process.env.VITE_PLATFORM_API_URL || 'http://localhost:8000';

console.log('================================================================');
console.log('  MedRussia Web — Complete Functional Data-Flow Audit Script     ');
console.log('================================================================\n');

async function runAudit() {
  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• [TEST] ${name}... `);
      await fn();
      console.log('✅ PASS');
      passedCount++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failedCount++;
    }
  }

  // 1. Health Checks
  await test('Backend Live & Ready Health Endpoints (GET /health/ready)', async () => {
    const res = await fetch(`${API_BASE}/health/ready`);
    assert.strictEqual(res.status, 200, 'Health check should return 200');
    const json = await res.json();
    assert.strictEqual(json.data.status, 'ready');
  });

  // Unique test identifiers
  const timestamp = Date.now();
  const testUser = {
    email: `audit_user_${timestamp}@example.com`,
    username: `audit_${timestamp}`.slice(0, 30),
    password: 'SecurePassword2026!',
    full_name: 'Audit Test Student',
    phone: '+919876500000',
    role: 'student'
  };

  let accessToken = null;
  let refreshToken = null;
  let universityId = null;
  let applicationId = null;
  let documentId = null;
  let chatThreadId = null;
  let inquiryId = null;

  // 2. Auth Domain
  await test('Registration Form Submit (POST /api/v1/auth/register)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  await test('Sign In Form Submit (POST /api/v1/auth/login)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.username,
        password: testUser.password
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    accessToken = json.data.access_token;
    refreshToken = json.data.refresh_token;
    assert.ok(accessToken, 'Access token must be returned');
    assert.ok(refreshToken, 'Refresh token must be returned');
  });

  await test('Get Authenticated Profile (GET /api/v1/users/me)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.username, testUser.username);
    assert.strictEqual(json.data.full_name, testUser.full_name);
  });

  await test('Save Profile Details Button (PUT /api/v1/users/me)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        full_name: 'Audit Student Updated',
        phone: '+919999988888'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.full_name, 'Audit Student Updated');
    assert.strictEqual(json.data.phone, '+919999988888');
  });

  // 3. Universities & Catalog Domain
  await test('University Explorer Catalog (GET /api/v1/universities)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/universities?page=1&page_size=10`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.items), 'Items should be an array');
    if (json.data.items.length > 0) {
      universityId = json.data.items[0].id;
    }
  });

  if (universityId) {
    await test('University Details Page (GET /api/v1/universities/{id})', async () => {
      const res = await fetch(`${API_BASE}/api/v1/universities/${universityId}`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.id, universityId);
    });

    await test('Shortlist University Button (POST /api/v1/users/me/shortlists/{id})', async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/shortlists/${universityId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
    });

    await test('View Shortlisted Universities (GET /api/v1/users/me/shortlists)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/shortlists`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.some(u => u.id === universityId), 'Shortlist should contain added university');
    });

    await test('Remove Shortlist Button (DELETE /api/v1/users/me/shortlists/{id})', async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/shortlists/${universityId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
    });
  }

  // 4. Eligibility & Budget Calculator Domain
  await test('Check Eligibility Button (POST /api/v1/eligibility/evaluate)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/eligibility/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        physics_marks: 85.0,
        chemistry_marks: 80.0,
        biology_marks: 90.0,
        english_passed: true,
        student_age: 18,
        category: 'GENERAL',
        neet_status: 'QUALIFIED',
        neet_score: 350
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.is_eligible, true);
    assert.strictEqual(json.data.pcb_passed, true);
  });

  if (universityId) {
    await test('Calculate Budget Button (POST /api/v1/calculator/estimate)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/calculator/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university_id: universityId,
          meal_plan: 'INDIAN_MESS',
          living_tier: 'STANDARD',
          include_flight_budget: true
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.total_6_year_inr > 0, 'Total 6 year INR should be greater than 0');
    });
  }

  // 5. Inquiries & Feedback Domain
  await test('Submit Inquiry Button (POST /api/v1/inquiries)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Audit Student',
        email: testUser.email,
        phone: '+919876500000',
        target_university_id: universityId,
        message: 'Could you please confirm the heating and mess facilities available for 1st-year students?',
        budget_range: '300k-500k'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    inquiryId = json.data.id;
    assert.ok(inquiryId, 'Inquiry ID should be returned');
  });

  await test('View My Inquiries Tab (GET /api/v1/inquiries/me)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/inquiries/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
  });

  await test('Book 1-on-1 Call Button (POST /api/v1/inquiries/bookings)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/inquiries/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_name: 'Audit Student',
        student_phone: '+919876500000',
        preferred_slot: new Date(Date.now() + 86400000).toISOString()
      })
    });
    assert.strictEqual(res.status, 201);
  });

  await test('Submit Platform Feedback Modal (POST /api/v1/inquiries/feedback)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/inquiries/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback_type: 'UI_UX',
        rating: 5,
        message: 'Great platform experience!'
      })
    });
    assert.strictEqual(res.status, 201);
  });

  // 6. AI Counselor Domain
  await test('AI Counselor Question Submit (POST /api/v1/ai/counselor)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/ai/counselor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What are the NMC eligibility requirements for MBBS in Russia?'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.response, 'AI response should be returned');
  });

  // 7. Admission Application & Tracker Domain
  if (universityId) {
    await test('Submit Admission Application Form (POST /api/v1/applications)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          university_id: universityId,
          student_name: 'Audit Student Updated',
          dob: '2005-06-15',
          gender: 'Female',
          phone: '+919999988888',
          email: testUser.email,
          guardian_name: 'Guardian Name',
          guardian_phone: '+919999977777',
          city_state: 'Mumbai, Maharashtra',
          board_12th: 'CBSE',
          physics_marks: 85.0,
          chemistry_marks: 88.0,
          biology_marks: 92.0,
          neet_status: 'QUALIFIED',
          neet_score: 450,
          category: 'GENERAL'
        })
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      applicationId = json.data.id;
      assert.ok(json.data.dossier_number, 'Dossier number must be generated');
      assert.ok(json.data.current_stage, 'Stage should be populated');
    });

    await test('Admission Tracker View (GET /api/v1/applications/my-dossier)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/applications/my-dossier`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.id, applicationId);
      assert.ok(json.data.current_stage);
    });
  }

  // 8. Chat & Messaging Domain
  await test('Create / Initialize Chat Thread (POST /api/v1/chats/threads)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/chats/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        subject: 'General MBBS Counseling'
      })
    });
    assert.ok(res.status === 200 || res.status === 201);
    const json = await res.json();
    chatThreadId = json.data.id;
    assert.ok(chatThreadId);
  });

  if (chatThreadId) {
    await test('Send Chat Message Button (POST /api/v1/chats/threads/{id}/messages)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/chats/threads/${chatThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message_text: 'Hello counselor, when does the autumn batch start?'
        })
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.message_text, 'Hello counselor, when does the autumn batch start?');
    });

    await test('Load Chat History (GET /api/v1/chats/threads/{id}/messages)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/chats/threads/${chatThreadId}/messages`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.items.length > 0);
    });

    await test('Mark Thread as Read (POST /api/v1/chats/threads/{id}/read)', async () => {
      const res = await fetch(`${API_BASE}/api/v1/chats/threads/${chatThreadId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      assert.strictEqual(res.status, 200);
    });
  }

  // 9. Document Vault Domain
  await test('List Vault Documents (GET /api/v1/documents)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/documents`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  // 10. Password Reset & Logout
  await test('Forgot Password Link (POST /api/v1/auth/forgot-password)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email })
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Sign Out Button (POST /api/v1/auth/logout)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.strictEqual(res.status, 200);
  });

  console.log('\n================================================================');
  console.log(`  AUDIT SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED  `);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit().catch(e => {
  console.error('Audit run crashed:', e);
  process.exit(1);
});
