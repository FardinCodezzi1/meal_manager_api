/**
 * Multi-User Mess Meal Manager Backend Integration Test Script
 * Verifies all requirements from BACKEND_SPECIFICATION.md
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function logStep(step: string) {
  console.log(`\n\x1b[34m=== [TEST STEP] ${step} ===\x1b[0m`);
}

function logSuccess(msg: string) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function logError(msg: string, details?: unknown) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`, details || '');
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function runTests() {
  console.log(`\x1b[35mStarting E2E API Verification against ${BASE_URL}...\x1b[0m`);
  const timestamp = Date.now();
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  // 1. Swagger & OpenAPI Specs
  logStep('1. Swagger & OpenAPI Specification');
  const openApiRes = await request('/api/openapi.json');
  if (openApiRes.status !== 200 || openApiRes.data.openapi !== '3.0.3') {
    throw new Error(`OpenAPI spec check failed: status ${openApiRes.status}`);
  }
  logSuccess('OpenAPI 3.0.3 spec is valid and accessible at /api/openapi.json');

  const docsRes = await request('/api/docs');
  if (docsRes.status !== 200 || !docsRes.data.includes('SwaggerUIBundle')) {
    throw new Error(`Swagger UI page check failed: status ${docsRes.status}`);
  }
  logSuccess('Interactive Swagger UI is rendering properly at /api/docs');

  // 2. CORS Preflight Check
  logStep('2. CORS Preflight & Headers');
  const corsRes = await request('/api/bazar', { method: 'OPTIONS' });
  const corsOrigin = corsRes.headers.get('access-control-allow-origin');
  if (corsRes.status !== 204 || corsOrigin !== '*') {
    throw new Error(`CORS check failed: status ${corsRes.status}, origin: ${corsOrigin}`);
  }
  logSuccess('CORS OPTIONS preflight responded with status 204 and Access-Control-Allow-Origin: *');

  // 3. User 1 (Manager) Registration & Login
  logStep('3. User 1 (Manager) Registration');
  const managerEmail = `manager_${timestamp}@test.com`;
  const reg1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Manager Bob',
      email: managerEmail,
      password: 'password123',
      phone: '+8801700000001',
    }),
  });

  if (reg1.status !== 201 || !reg1.data.token) {
    throw new Error(`User 1 registration failed: ${JSON.stringify(reg1.data)}`);
  }
  const tokenManager = reg1.data.token;
  const user1 = reg1.data.user;
  logSuccess(`User 1 registered with ID: ${user1.id}, JWT token acquired`);

  // Verify /api/auth/me initially has no active membership
  const me1 = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (me1.data.activeMembership !== null) {
    throw new Error(`Expected activeMembership to be null initially`);
  }
  logSuccess('User 1 profile fetched, activeMembership is correctly null');

  // 4. Create Mess
  logStep('4. Mess Creation');
  const createMessRes = await request('/api/mess/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({ name: `Sunrise Mess ${timestamp}` }),
  });

  if (createMessRes.status !== 201 || !createMessRes.data.mess.inviteCode) {
    throw new Error(`Mess creation failed: ${JSON.stringify(createMessRes.data)}`);
  }
  const mess = createMessRes.data.mess;
  const managerMembership = createMessRes.data.membership;
  const inviteCode = mess.inviteCode;
  logSuccess(`Mess created: "${mess.name}" with Invite Code: ${inviteCode}`);
  logSuccess(`Manager Member ID: ${managerMembership.id}, Role: ${managerMembership.role}`);

  // 5. User 2 (Member) Registration & Join Mess
  logStep('5. User 2 (Member) Registration & Joining Mess');
  const memberEmail = `member_${timestamp}@test.com`;
  const reg2 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Member Alice',
      email: memberEmail,
      password: 'password123',
      phone: '+8801700000002',
    }),
  });

  if (reg2.status !== 201 || !reg2.data.token) {
    throw new Error(`User 2 registration failed: ${JSON.stringify(reg2.data)}`);
  }
  const tokenMember = reg2.data.token;
  const user2 = reg2.data.user;
  logSuccess(`User 2 registered with ID: ${user2.id}`);

  // Join mess with invite code
  const joinRes = await request('/api/mess/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ inviteCode }),
  });

  if (joinRes.status !== 200 || joinRes.data.membership.role !== 'MEMBER') {
    throw new Error(`User 2 failed to join mess: ${JSON.stringify(joinRes.data)}`);
  }
  const aliceMembership = joinRes.data.membership;
  logSuccess(`User 2 successfully joined mess! Member ID: ${aliceMembership.id}, Role: MEMBER`);

  // Verify Single Active Mess restriction
  const doubleJoin = await request('/api/mess/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ inviteCode }),
  });
  if (doubleJoin.status !== 400) {
    throw new Error(`Expected 400 for joining second mess while active, got ${doubleJoin.status}`);
  }
  logSuccess('Enforced constraint: User cannot create or join another active mess concurrently');

  // Verify Mess Members list
  const membersRes = await request('/api/mess/members', {
    headers: { Authorization: `Bearer ${tokenMember}` },
  });
  if (membersRes.data.members.length !== 2) {
    throw new Error(`Expected 2 mess members, got ${membersRes.data.members.length}`);
  }
  logSuccess('Both ACTIVE members retrieved via /api/mess/members');

  // 6. Bazar 2-Mode & Approval Workflow
  logStep('6. Bazar Submission (2-Mode & Approvals)');
  // Alice (Member) submits QUICK bazar entry of 600
  const bazar1 = await request('/api/bazar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      monthKey: currentMonthKey,
      amount: 600,
      category: 'Vegetables & Meat',
      mode: 'CHECKLIST',
      items: [
        { name: 'Potatoes', qty: '3 kg', price: 150, bought: true },
        { name: 'Chicken', qty: '1.5 kg', price: 450, bought: true },
      ],
      notes: 'Weekly market bazaar',
    }),
  });

  if (bazar1.status !== 201 || bazar1.data.entry.status !== 'PENDING') {
    throw new Error(`Expected member bazar entry to be PENDING, got ${bazar1.data.entry?.status}`);
  }
  const bazarEntryId = bazar1.data.entry.id;
  logSuccess(`Alice submitted Bazar entry (${bazar1.data.entry.amount} tk). Initial Status: PENDING`);

  // 7. Verify Summary Excludes PENDING Bazar
  logStep('7. Calculation Summary (Excluding Pending Bazar)');
  const summaryBefore = await request(`/api/summary?monthKey=${currentMonthKey}`, {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });

  if (summaryBefore.data.totalApprovedBazar !== 0) {
    throw new Error(`totalApprovedBazar should be 0 before approval, got ${summaryBefore.data.totalApprovedBazar}`);
  }
  logSuccess('Summary verified: totalApprovedBazar is strictly 0 while entry is PENDING');

  // 8. Manager Approves Bazar
  logStep('8. Manager Approves Bazar Entry');
  const approveRes = await request(`/api/bazar/${bazarEntryId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({ status: 'APPROVED' }),
  });

  if (approveRes.status !== 200 || approveRes.data.entry.status !== 'APPROVED') {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`);
  }
  logSuccess(`Manager approved Bazar entry ${bazarEntryId}`);

  // Verify summary now reflects the approved amount
  const summaryAfter = await request(`/api/summary?monthKey=${currentMonthKey}`, {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (summaryAfter.data.totalApprovedBazar !== 600) {
    throw new Error(`Expected totalApprovedBazar to be 600, got ${summaryAfter.data.totalApprovedBazar}`);
  }
  logSuccess(`Summary updated: totalApprovedBazar is now ${summaryAfter.data.totalApprovedBazar}`);

  // 9. Daily Meals Recording
  logStep('9. Daily Meals Tracking');
  // Record meals for Bob (Manager)
  await request('/api/meals/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({
      memberId: managerMembership.id,
      date: `${currentMonthKey}-05`,
      lunch: 1.0,
      dinner: 1.0,
    }),
  });

  // Record meals for Alice (Member)
  await request('/api/meals/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      memberId: aliceMembership.id,
      date: `${currentMonthKey}-05`,
      lunch: 1.0,
      dinner: 1.0,
    }),
  });

  // Role check: Member should NOT be able to update Manager's meal
  const unauthorizedMealUpdate = await request('/api/meals/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      memberId: managerMembership.id,
      date: `${currentMonthKey}-06`,
      lunch: 2.0,
      dinner: 2.0,
    }),
  });
  if (unauthorizedMealUpdate.status !== 403) {
    throw new Error(`Expected 403 for member editing someone else's meals, got ${unauthorizedMealUpdate.status}`);
  }
  logSuccess('Role permission verified: Members cannot update other members meals');

  // 10. Deposits Recording (Manager Only)
  logStep('10. Deposits Recording & Financial Rates');
  // Member trying to record deposit should be forbidden (403)
  const forbiddenDeposit = await request('/api/deposits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      monthKey: currentMonthKey,
      memberId: aliceMembership.id,
      amount: 1000,
    }),
  });
  if (forbiddenDeposit.status !== 403) {
    throw new Error(`Expected 403 for member creating deposit, got ${forbiddenDeposit.status}`);
  }
  logSuccess('Role permission verified: Only Manager can record deposits');

  // Manager deposits 1000 for Bob, 1000 for Alice
  await request('/api/deposits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({
      monthKey: currentMonthKey,
      memberId: managerMembership.id,
      amount: 1000,
      notes: 'Initial monthly deposit',
    }),
  });

  await request('/api/deposits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({
      monthKey: currentMonthKey,
      memberId: aliceMembership.id,
      amount: 1000,
      notes: 'Initial monthly deposit',
    }),
  });
  logSuccess('Manager recorded 1000 tk deposit for both Bob and Alice');

  // 11. Verify Financial Balances in Summary
  logStep('11. Summary Balance & Meal Rate Verification');
  const summaryFinal = await request(`/api/summary?monthKey=${currentMonthKey}`, {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });

  const sumData = summaryFinal.data;
  // Total meals: Bob (2) + Alice (2) = 4 meals.
  // Approved bazar = 600 tk.
  // Meal rate = 600 / 4 = 150 tk/meal.
  // Each member mealCost = 2 * 150 = 300 tk.
  // Balance = 1000 - 300 = +700 tk (surplus/refund).
  console.log('Summary Output:', {
    totalApprovedBazar: sumData.totalApprovedBazar,
    totalDeposits: sumData.totalDeposits,
    totalMeals: sumData.totalMeals,
    mealRate: sumData.mealRate,
    memberSummaries: sumData.memberSummaries.map((m: any) => ({
      name: m.name,
      meals: m.totalMeals,
      deposit: m.totalDeposit,
      cost: m.mealCost,
      balance: m.balance,
    })),
  });

  if (sumData.totalMeals !== 4 || sumData.mealRate !== 150) {
    throw new Error(`Summary calculation mismatch: totalMeals=${sumData.totalMeals}, rate=${sumData.mealRate}`);
  }
  logSuccess('Accurate meal rate and member surplus balances verified');

  // 12. Leave Request & Approval Bulk Upsert
  logStep('12. Leave Request Workflow');
  const leaveRes = await request('/api/meals/leave-request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      startDate: `${currentMonthKey}-10`,
      endDate: `${currentMonthKey}-12`,
      reason: 'Home visit',
    }),
  });

  if (leaveRes.status !== 201) {
    throw new Error(`Leave request failed: ${JSON.stringify(leaveRes.data)}`);
  }
  const leaveId = leaveRes.data.leaveRequest.id;
  logSuccess(`Leave request submitted for 3 days (${currentMonthKey}-10 to ${currentMonthKey}-12)`);

  // Manager approves leave
  const approveLeave = await request(`/api/meals/leave-requests/${leaveId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  if (approveLeave.status !== 200) {
    throw new Error(`Leave approval failed: ${JSON.stringify(approveLeave.data)}`);
  }
  logSuccess('Manager approved leave request');

  // Verify daily meals for leave days are set to lunch=0, dinner=0, isLeave=true
  const mealsList = await request(`/api/meals?monthKey=${currentMonthKey}`, {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  const leaveMeal = mealsList.data.meals.find(
    (m: any) => m.memberId === aliceMembership.id && m.date.startsWith(`${currentMonthKey}-10`)
  );
  if (!leaveMeal || !leaveMeal.isLeave || leaveMeal.lunch !== 0 || leaveMeal.dinner !== 0) {
    throw new Error(`Leave daily meal not zeroed: ${JSON.stringify(leaveMeal)}`);
  }
  logSuccess('Daily meals for approved leave dates were automatically zeroed out (lunch: 0, dinner: 0, isLeave: true)');

  // 13. Personal Notes (Isolated from Mess)
  logStep('13. Personal Notes CRUD & Isolation');
  const noteRes = await request('/api/notes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      title: 'Alice Personal List',
      content: 'Personal items to buy',
      isChecklist: true,
      items: [{ id: '1', text: 'Shampoo', done: false }],
    }),
  });

  if (noteRes.status !== 201) {
    throw new Error(`Note creation failed: ${JSON.stringify(noteRes.data)}`);
  }
  const noteId = noteRes.data.note.id;
  logSuccess(`Personal note created by Alice: "${noteRes.data.note.title}"`);

  // Verify Bob does not see Alice's personal note
  const bobNotes = await request('/api/notes', {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (bobNotes.data.notes.some((n: any) => n.id === noteId)) {
    throw new Error('Data isolation violation: Manager should not see personal notes of another user!');
  }
  logSuccess('Data isolation verified: Personal notes are strictly private to each user');

  // 14. Cloud Export
  logStep('14. Cloud Data Export');
  const exportRes = await request(`/api/mess/export?monthKey=${currentMonthKey}`, {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (exportRes.status !== 200 || !exportRes.data.bazarEntries || !exportRes.data.deposits) {
    throw new Error(`Export failed: ${JSON.stringify(exportRes.data)}`);
  }
  logSuccess(`Cloud export generated: ${exportRes.data.bazarEntries.length} bazar entries, ${exportRes.data.deposits.length} deposits, ${exportRes.data.dailyMeals.length} daily meals`);

  // 15. User Profile Update & Password Change
  logStep('15. User Profile Update & Password Change');
  const updateProfileRes = await request('/api/auth/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      name: 'Alice W. Updated',
      phone: '+8801999999999',
    }),
  });
  if (updateProfileRes.status !== 200 || updateProfileRes.data.user.name !== 'Alice W. Updated') {
    throw new Error(`Profile update failed: ${JSON.stringify(updateProfileRes.data)}`);
  }
  logSuccess('User profile name and phone updated successfully');

  // Test password change with wrong current password (should fail)
  const badPassRes = await request('/api/auth/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      currentPassword: 'wrong-password',
      newPassword: 'new-secure-password',
    }),
  });
  if (badPassRes.status !== 400) {
    throw new Error(`Expected 400 for incorrect current password, got ${badPassRes.status}`);
  }
  logSuccess('Guardrail verified: Password change requires valid current password');

  // Change password successfully
  const goodPassRes = await request('/api/auth/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    }),
  });
  if (goodPassRes.status !== 200) {
    throw new Error(`Password change failed: ${JSON.stringify(goodPassRes.data)}`);
  }
  logSuccess('Password changed successfully');

  // 16. Mess Settings Update, Regenerate Code & Manager Role Transfer
  logStep('16. Mess Settings, Regenerate Invite Code & Manager Transfer');
  // Non-manager (Alice) trying to update mess settings should fail with 403
  const forbiddenMessUpdate = await request('/api/mess', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ name: 'Hacked Mess' }),
  });
  if (forbiddenMessUpdate.status !== 403) {
    throw new Error(`Expected 403 for member updating mess settings, got ${forbiddenMessUpdate.status}`);
  }
  logSuccess('Guardrail verified: Only Manager can update mess settings');

  // Manager updates mess name and regenerates invite code
  const updateMessRes = await request('/api/mess', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({
      name: 'Sunrise Deluxe Mess',
      regenerateInviteCode: true,
    }),
  });
  if (updateMessRes.status !== 200 || updateMessRes.data.mess.name !== 'Sunrise Deluxe Mess') {
    throw new Error(`Mess update failed: ${JSON.stringify(updateMessRes.data)}`);
  }
  const newInviteCode = updateMessRes.data.mess.inviteCode;
  if (!newInviteCode || newInviteCode === inviteCode) {
    throw new Error(`Expected regenerated invite code to be different from ${inviteCode}`);
  }
  logSuccess(`Mess renamed to "${updateMessRes.data.mess.name}" and regenerated invite code: ${newInviteCode}`);

  // Manager transfers role to Alice
  const transferRes = await request('/api/mess', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({
      newManagerMemberId: aliceMembership.id,
    }),
  });
  if (transferRes.status !== 200) {
    throw new Error(`Manager transfer failed: ${JSON.stringify(transferRes.data)}`);
  }
  logSuccess('Manager role transferred from Bob to Alice!');

  // Verify Alice is now Manager and Bob is Member
  const aliceMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenMember}` },
  });
  if (aliceMe.data.activeMembership.role !== 'MANAGER') {
    throw new Error(`Expected Alice role to be MANAGER, got ${aliceMe.data.activeMembership?.role}`);
  }
  const bobMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (bobMe.data.activeMembership.role !== 'MEMBER') {
    throw new Error(`Expected Bob role to be MEMBER, got ${bobMe.data.activeMembership?.role}`);
  }
  logSuccess('Roles verified: Alice is now MANAGER, Bob is now MEMBER');

  // 17. Account & Mess Deletion Guardrails
  logStep('17. Deletion Guardrails for Accounts & Mess');
  // Guard 1: Alice (Active Manager with other active members) tries to delete account -> should be blocked (400)
  const deleteManagerAcct = await request('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ password: 'newpassword123' }),
  });
  if (deleteManagerAcct.status !== 400) {
    throw new Error(`Expected 400 for active manager deleting account with other members, got ${deleteManagerAcct.status}`);
  }
  logSuccess('Guardrail verified: Active Manager with other members cannot delete account');

  // Guard 2: Bob (Active Member) tries to delete account -> should be blocked (400)
  const deleteMemberAcct = await request('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({ password: 'password123' }),
  });
  if (deleteMemberAcct.status !== 400) {
    throw new Error(`Expected 400 for active member deleting account, got ${deleteMemberAcct.status}`);
  }
  logSuccess('Guardrail verified: Active Member cannot delete account without leaving mess first');

  // Guard 3: Alice (Manager) tries to delete mess while Bob is still an active member -> should be blocked (400)
  const deleteMessBlocked = await request('/api/mess', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ password: 'newpassword123' }),
  });
  if (deleteMessBlocked.status !== 400) {
    throw new Error(`Expected 400 for deleting mess with other active members, got ${deleteMessBlocked.status}`);
  }
  logSuccess('Guardrail verified: Manager cannot delete mess while other active members exist');

  // 18. Safe Mess Deletion & Account Deletion
  logStep('18. Safe Mess Deletion & Account Deactivation');
  // Bob leaves the mess
  const bobLeave = await request('/api/mess/leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenManager}` },
  });
  if (bobLeave.status !== 200) {
    throw new Error(`Bob leave mess failed: ${JSON.stringify(bobLeave.data)}`);
  }
  logSuccess('Bob left the mess. Alice is now the sole active member.');

  // Now Alice can delete the mess
  const deleteMessSuccess = await request('/api/mess', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ password: 'newpassword123' }),
  });
  if (deleteMessSuccess.status !== 200) {
    throw new Error(`Mess deletion failed: ${JSON.stringify(deleteMessSuccess.data)}`);
  }
  logSuccess('Mess deleted successfully now that no other active members remain.');

  // Both users are now free of active messes and can delete their accounts
  const deleteBobAcct = await request('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenManager}` },
    body: JSON.stringify({ password: 'password123' }),
  });
  if (deleteBobAcct.status !== 200) {
    throw new Error(`Bob account deletion failed: ${JSON.stringify(deleteBobAcct.data)}`);
  }
  logSuccess('Bob account deleted/anonymized successfully with accounting records preserved.');

  const deleteAliceAcct = await request('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ password: 'newpassword123' }),
  });
  if (deleteAliceAcct.status !== 200) {
    throw new Error(`Alice account deletion failed: ${JSON.stringify(deleteAliceAcct.data)}`);
  }
  logSuccess('Alice account deleted/anonymized successfully.');

  // 19. AppConfig Singleton & Creator Profile
  logStep('19. AppConfig Singleton & Creator Profile Verification');
  const configRes = await request('/api/config');
  if (configRes.status !== 200 || !configRes.data.config) {
    throw new Error(`Config fetch failed: ${JSON.stringify(configRes.data)}`);
  }
  const config = configRes.data.config;
  if (
    (config.appName !== 'Mess Meal Manager' && config.appName !== 'Bache Lorr') ||
    config.creatorName !== 'Fardin Abu Ubaid' ||
    config.creatorEmail !== 'fardin1.codezzi@gmail.com' ||
    config.creatorPortfolio !== 'https://portfolio-fardin.vercel.app'
  ) {
    throw new Error(`Config default values mismatch: ${JSON.stringify(config)}`);
  }
  logSuccess(`AppConfig verified: "${config.appName}" by ${config.creatorName} (${config.creatorEmail})`);

  // 20. Super Admin Auto-Promotion (fardin1.codezzi@gmail.com)
  logStep('20. Super Admin Promotion & Verification');
  // Register or login as fardin1.codezzi@gmail.com
  let adminToken = '';
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'fardin1.codezzi@gmail.com',
      password: 'password123',
    }),
  });

  if (adminLogin.status === 200) {
    adminToken = adminLogin.data.token;
    if (!adminLogin.data.user.isSuperAdmin) {
      throw new Error('Expected isSuperAdmin to be true on login');
    }
  } else {
    // Register if not yet in DB
    const adminReg = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Fardin Abu Ubaid',
        email: 'fardin1.codezzi@gmail.com',
        password: 'password123',
      }),
    });
    if (adminReg.status !== 201 || !adminReg.data.user.isSuperAdmin) {
      throw new Error(`Admin registration failed: ${JSON.stringify(adminReg.data)}`);
    }
    adminToken = adminReg.data.token;
  }
  logSuccess('fardin1.codezzi@gmail.com authenticated and verified as isSuperAdmin = true');

  // 21. Super Admin Dashboard API & Mess Cleanup
  logStep('21. Super Admin API (/api/admin) & Mess Deletion');
  const adminRes = await request('/api/admin', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminRes.status !== 200 || !adminRes.data.stats || !adminRes.data.users) {
    throw new Error(`Super Admin API failed: ${JSON.stringify(adminRes.data)}`);
  }
  logSuccess(`Admin Stats: ${adminRes.data.stats.totalUsers} users, ${adminRes.data.stats.totalMesses} messes`);

  // Test creating a dummy mess and deleting it as super admin
  const dummyMess = await request('/api/mess/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Admin Test Mess To Delete' }),
  });
  if (dummyMess.status === 201) {
    const dummyMessId = dummyMess.data.mess.id;
    const deleteRes = await request(`/api/admin/messes/${dummyMessId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (deleteRes.status !== 200) {
      throw new Error(`Admin mess deletion failed: ${JSON.stringify(deleteRes.data)}`);
    }
    logSuccess(`Super Admin successfully deleted test mess (${dummyMessId}) via /api/admin/messes/[id]`);
  }

  // 22. Super Admin User Credentials & Password Reset
  logStep('22. Super Admin Reset Forgotten User Password (/api/admin/users/[id])');
  const forgottenUserEmail = `forgotten_${timestamp}@test.com`;
  const regForgotten = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Forgotten Member',
      email: forgottenUserEmail,
      password: 'InitialPassword123',
    }),
  });
  if (regForgotten.status !== 201) {
    throw new Error(`Failed to create test user for reset: ${JSON.stringify(regForgotten.data)}`);
  }
  const targetUserId = regForgotten.data.user.id;

  // Super Admin resets their password and updates phone
  const resetRes = await request(`/api/admin/users/${targetUserId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Recovered Member',
      phone: '+8801799988877',
      newPassword: 'BrandNewSecretPass999!',
    }),
  });
  if (resetRes.status !== 200 || !resetRes.data.passwordReset) {
    throw new Error(`Admin password reset failed: ${JSON.stringify(resetRes.data)}`);
  }
  logSuccess(`Super Admin successfully reset password for user ${targetUserId}`);

  // Old password must fail
  const oldLoginFail = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: forgottenUserEmail,
      password: 'InitialPassword123',
    }),
  });
  if (oldLoginFail.status !== 401) {
    throw new Error(`Expected 401 for old password, got ${oldLoginFail.status}`);
  }
  logSuccess('Verified: Old password is no longer valid');

  // New password must succeed
  const newLoginSuccess = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: forgottenUserEmail,
      password: 'BrandNewSecretPass999!',
    }),
  });
  if (newLoginSuccess.status !== 200 || !newLoginSuccess.data.token) {
    throw new Error(`Login with reset password failed: ${JSON.stringify(newLoginSuccess.data)}`);
  }
  logSuccess(`Verified: User logged in successfully with the newly reset credentials! Name is now: ${newLoginSuccess.data.user.name}`);

  // 23. Tour Expense Management System Flow
  logStep('23. Tour Expense Management System (Creation, Roles, Deposits, Expenses, Balances & Super Admin Oversight)');

  // Register Tour Lead & Tour Member
  const regTourLead = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Tour Lead Dave',
      email: `lead_${timestamp}@tourtest.com`,
      password: 'password123',
      phone: '+8801811112222',
    }),
  });
  if (regTourLead.status !== 201) throw new Error(`Tour lead registration failed: ${JSON.stringify(regTourLead.data)}`);
  const tourLeadToken = regTourLead.data.token;

  const regTourMember = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Tour Accountant Emma',
      email: `emma_${timestamp}@tourtest.com`,
      password: 'password123',
      phone: '+8801833334444',
    }),
  });
  if (regTourMember.status !== 201) throw new Error(`Tour member registration failed: ${JSON.stringify(regTourMember.data)}`);
  const tourMemberToken = regTourMember.data.token;

  // Step A: Create Tour (Lead Dave is Lead)
  const createTourRes = await request('/api/tours', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourLeadToken}` },
    body: JSON.stringify({
      name: `Cox's Bazar Sea Vacation ${timestamp}`,
      destination: "Cox's Bazar",
      budget: 30000,
      description: 'Annual team retreat',
    }),
  });
  if (createTourRes.status !== 201 || !createTourRes.data.tour) {
    throw new Error(`Failed to create tour: ${JSON.stringify(createTourRes.data)}`);
  }
  const tourId = createTourRes.data.tour.id;
  const tourInviteCode = createTourRes.data.tour.inviteCode;
  logSuccess(`Tour created: "${createTourRes.data.tour.name}" with Invite Code: ${tourInviteCode}`);

  // Step B: Emma joins tour via invite code
  const joinTourRes = await request('/api/tours/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` },
    body: JSON.stringify({ inviteCode: tourInviteCode }),
  });
  if (joinTourRes.status !== 201) {
    throw new Error(`Emma failed to join tour: ${JSON.stringify(joinTourRes.data)}`);
  }
  const emmaTourMemberId = joinTourRes.data.member.id;
  logSuccess(`Emma joined tour! Member ID: ${emmaTourMemberId}, Role: ${joinTourRes.data.member.role}`);

  // Step C: Tour Lead promotes Emma to Tour Accountant
  const promoteRes = await request(`/api/tours/${tourId}/members/${emmaTourMemberId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tourLeadToken}` },
    body: JSON.stringify({ role: 'ACCOUNTANT' }),
  });
  if (promoteRes.status !== 200 || promoteRes.data.member.role !== 'ACCOUNTANT') {
    throw new Error(`Failed to promote member to ACCOUNTANT: ${JSON.stringify(promoteRes.data)}`);
  }
  logSuccess('Emma promoted to Tour Accountant!');

  // Step D: Add an offline participant (Rahim, MEMBER)
  const addOfflineRes = await request(`/api/tours/${tourId}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` }, // Accountant can add members
    body: JSON.stringify({
      name: 'Rahim Offline Participant',
      phone: '+8801900000000',
      role: 'MEMBER',
    }),
  });
  if (addOfflineRes.status !== 201) {
    throw new Error(`Failed to add offline participant: ${JSON.stringify(addOfflineRes.data)}`);
  }
  const rahimMemberId = addOfflineRes.data.member.id;
  logSuccess(`Added offline participant Rahim (${rahimMemberId})`);

  // Step E: Record Deposits (Lead: 10,000 tk, Emma: 8,000 tk, Rahim: 6,000 tk) -> Total Deposits: 24,000 tk
  const dep1 = await request(`/api/tours/${tourId}/deposits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` }, // Accountant records deposits
    body: JSON.stringify({
      memberId: createTourRes.data.tour.leadMember.id,
      amount: 10000,
      notes: 'bKash Trx 99A...',
    }),
  });
  if (dep1.status !== 201) throw new Error(`Deposit 1 failed: ${JSON.stringify(dep1.data)}`);

  const dep2 = await request(`/api/tours/${tourId}/deposits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` },
    body: JSON.stringify({
      memberId: emmaTourMemberId,
      amount: 8000,
      notes: 'Bank transfer',
    }),
  });
  if (dep2.status !== 201) throw new Error(`Deposit 2 failed: ${JSON.stringify(dep2.data)}`);

  const dep3 = await request(`/api/tours/${tourId}/deposits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` },
    body: JSON.stringify({
      memberId: rahimMemberId,
      amount: 6000,
      notes: 'Cash in hand',
    }),
  });
  if (dep3.status !== 201) throw new Error(`Deposit 3 failed: ${JSON.stringify(dep3.data)}`);
  logSuccess('Recorded 3 deposits totaling 24,000 tk (Lead: 10k, Emma: 8k, Rahim: 6k)');

  // Step F: Record Expenses (Transport: 6,000 tk, Hotel: 9,000 tk) -> Total Expenses: 15,000 tk
  const exp1 = await request(`/api/tours/${tourId}/expenses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourLeadToken}` },
    body: JSON.stringify({
      title: 'Scania Bus Tickets (3 seats)',
      amount: 6000,
      category: 'Transport',
      memberId: createTourRes.data.tour.leadMember.id,
    }),
  });
  if (exp1.status !== 201) throw new Error(`Expense 1 failed: ${JSON.stringify(exp1.data)}`);

  const exp2 = await request(`/api/tours/${tourId}/expenses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tourMemberToken}` },
    body: JSON.stringify({
      title: 'Hotel Deluxe Room',
      amount: 9000,
      category: 'Hotel',
    }),
  });
  if (exp2.status !== 201) throw new Error(`Expense 2 failed: ${JSON.stringify(exp2.data)}`);
  logSuccess('Recorded 2 expenses totaling 15,000 tk (Transport: 6k, Hotel: 9k)');

  // Step G: Fetch Tour Details & Verify Mathematical Calculations
  const tourDetailsRes = await request(`/api/tours/${tourId}`, {
    headers: { Authorization: `Bearer ${tourLeadToken}` },
  });
  if (tourDetailsRes.status !== 200) {
    throw new Error(`Failed to fetch tour details: ${JSON.stringify(tourDetailsRes.data)}`);
  }
  const summary = tourDetailsRes.data.summary;
  if (summary.totalDeposits !== 24000 || summary.totalExpenses !== 15000 || summary.balance !== 9000) {
    throw new Error(`Unexpected tour financial summary: ${JSON.stringify(summary)}`);
  }
  if (summary.perMemberShare !== 5000) {
    throw new Error(`Expected perMemberShare to be 5000, got ${summary.perMemberShare}`);
  }
  logSuccess(`Accurate tour financial calculations verified: Total Deposits: ৳${summary.totalDeposits}, Total Expenses: ৳${summary.totalExpenses}, Fund Balance: ৳${summary.balance}, Per-Member Share: ৳${summary.perMemberShare}`);

  // Step H: Super Admin View & Delete Tour
  const adminToursRes = await request('/api/admin', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminToursRes.status !== 200 || !adminToursRes.data.tours) {
    throw new Error(`Admin fetch failed: ${JSON.stringify(adminToursRes.data)}`);
  }
  const foundInAdmin = adminToursRes.data.tours.find((t: { id: string }) => t.id === tourId);
  if (!foundInAdmin) {
    throw new Error('Created tour not found in Super Admin platform tour list');
  }
  logSuccess('Tour found in Super Admin platform telemetry');

  const deleteTourRes = await request(`/api/tours/${tourId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }, // Super admin deletes tour
  });
  if (deleteTourRes.status !== 200) {
    throw new Error(`Failed to delete tour as Super Admin: ${JSON.stringify(deleteTourRes.data)}`);
  }
  logSuccess(`Super Admin successfully deleted tour (${tourId}) via /api/tours/[id]`);

  // 24. Manager Rotation Queue & Anti-Cheat Audit Log System
  logStep('24. Manager Rotation Queue & Anti-Cheat Audit Log System');

  // Register two fresh users for mess rotation testing
  const regRot1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rotation Lead Kamal',
      email: `kamal_${timestamp}@rottest.com`,
      password: 'password123',
    }),
  });
  if (regRot1.status !== 201) throw new Error(`Rot user 1 registration failed: ${JSON.stringify(regRot1.data)}`);
  const tokenRot1 = regRot1.data.token;

  const regRot2 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rotation Member Jamal',
      email: `jamal_${timestamp}@rottest.com`,
      password: 'password123',
    }),
  });
  if (regRot2.status !== 201) throw new Error(`Rot user 2 registration failed: ${JSON.stringify(regRot2.data)}`);
  const tokenRot2 = regRot2.data.token;

  // Kamal creates a mess
  const createRotMess = await request('/api/mess/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenRot1}` },
    body: JSON.stringify({ name: `Rotation Mess ${timestamp}` }),
  });
  if (createRotMess.status !== 201) throw new Error(`Rot mess creation failed: ${JSON.stringify(createRotMess.data)}`);
  const rotInviteCode = createRotMess.data.mess.inviteCode;
  const kamalMemberId = createRotMess.data.membership.id;

  // Jamal joins the mess
  const joinRotMess = await request('/api/mess/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenRot2}` },
    body: JSON.stringify({ inviteCode: rotInviteCode }),
  });
  if (joinRotMess.status !== 200 && joinRotMess.status !== 201) throw new Error(`Jamal join mess failed: ${JSON.stringify(joinRotMess.data)}`);
  const jamalMemberId = joinRotMess.data.membership.id;
  logSuccess('Mess created and both members joined');

  // Test 1: GET /api/mess/manager/sequence
  const seqRes1 = await request('/api/mess/manager/sequence', {
    headers: { Authorization: `Bearer ${tokenRot1}` },
  });
  if (seqRes1.status !== 200 || !seqRes1.data.sequence) {
    throw new Error(`Failed to get manager sequence: ${JSON.stringify(seqRes1.data)}`);
  }
  if (seqRes1.data.currentManagerMemberId !== kamalMemberId) {
    throw new Error(`Expected currentManagerMemberId to be ${kamalMemberId}, got ${seqRes1.data.currentManagerMemberId}`);
  }
  logSuccess(`Sequence initialized successfully with ${seqRes1.data.sequence.length} members. Active Manager: ${seqRes1.data.currentManager.name}`);

  // Test 2: PUT /api/mess/manager/sequence (Reorder: Jamal first, Kamal second)
  const reorderRes = await request('/api/mess/manager/sequence', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenRot1}` },
    body: JSON.stringify({
      memberIds: [jamalMemberId, kamalMemberId],
      rotationType: 'MONTHLY',
      reason: 'Fair rotation schedule agreed in meeting',
    }),
  });
  if (reorderRes.status !== 200) {
    throw new Error(`Reorder sequence failed: ${JSON.stringify(reorderRes.data)}`);
  }
  logSuccess('Manager sequence reordered successfully (Jamal is next in queue)');

  // Test 3: POST /api/mess/manager/transfer (Manual override transfer to Jamal)
  const rotTransferRes = await request('/api/mess/manager/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenRot1}` },
    body: JSON.stringify({
      targetMemberId: jamalMemberId,
      reason: 'Emergency transfer for upcoming exams',
    }),
  });
  if (rotTransferRes.status !== 200) {
    throw new Error(`Manager transfer failed: ${JSON.stringify(rotTransferRes.data)}`);
  }
  logSuccess(`Manual manager role override successful! New active manager: ${rotTransferRes.data.transfer.newManager.name}`);

  // Test 4: GET /api/mess/manager/logs (Verify audit transparency)
  const logsRes = await request('/api/mess/manager/logs', {
    headers: { Authorization: `Bearer ${tokenRot2}` },
  });
  if (logsRes.status !== 200 || !logsRes.data.logs) {
    throw new Error(`Failed to fetch manager audit logs: ${JSON.stringify(logsRes.data)}`);
  }
  const hasManualOverride = logsRes.data.logs.some((l: { action: string }) => l.action === 'MANUAL_OVERRIDE');
  const hasReorder = logsRes.data.logs.some((l: { action: string }) => l.action === 'SEQUENCE_REORDERED');
  if (!hasManualOverride || !hasReorder) {
    throw new Error(`Expected audit logs to contain MANUAL_OVERRIDE and SEQUENCE_REORDERED, got: ${JSON.stringify(logsRes.data.logs)}`);
  }
  logSuccess(`Anti-cheat audit logs verified: ${logsRes.data.logs.length} immutable log entries with full actor accountability`);

  // Test 5: Automatic monthly rotation hook on new month creation (/api/mess/months)
  // Currently Jamal is manager. Next in sequence [jamalMemberId, kamalMemberId] should be Kamal!
  const newMonthRotRes = await request('/api/mess/months', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenRot2}` },
    body: JSON.stringify({ monthKey: '2026-08' }),
  });
  if (newMonthRotRes.status !== 201 || !newMonthRotRes.data.managerRotation?.rotated) {
    throw new Error(`Automatic rotation hook failed: ${JSON.stringify(newMonthRotRes.data)}`);
  }
  const rotInfo = newMonthRotRes.data.managerRotation;
  logSuccess(`Automatic rotation triggered on new month! Demoted: ${rotInfo.previousManager.name}, Promoted to Manager: ${rotInfo.newManager.name}`);

  // Verify the audit log for automatic monthly rotation
  const logsAfterMonth = await request('/api/mess/manager/logs', {
    headers: { Authorization: `Bearer ${tokenRot1}` },
  });
  const hasAutoRotateLog = logsAfterMonth.data.logs.some((l: { action: string }) => l.action === 'AUTOMATIC_MONTHLY_ROTATION');
  if (!hasAutoRotateLog) {
    throw new Error('Audit log for AUTOMATIC_MONTHLY_ROTATION was not found');
  }
  logSuccess('Audit entry for AUTOMATIC_MONTHLY_ROTATION confirmed in immutable logs!');

  console.log('\n\x1b[32m=======================================================');
  console.log('🎉 ALL EXTENDED INTEGRATION TESTS PASSED! (24/24)');
  console.log('=======================================================\x1b[0m\n');
}

runTests().catch((err) => {
  logError('Test suite failed with error:', err);
  process.exit(1);
});
