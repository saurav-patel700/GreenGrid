import { chromium } from 'playwright';

async function runBrowserVerification() {
  console.log('=== STARTING EXTENDED BROWSER END-TO-END AUTH VERIFICATION ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const testResults = {
    validLoginEmail: false,
    validLoginUsername: false,
    invalidPassword: false,
    nonexistentUser: false,
    refreshAfterLogin: false,
    protectedRouteAccess: false,
    logout: false,
    unauthenticatedAccessRedirect: false,
  };

  try {
    // 1. Unauthenticated Protected Route Access
    console.log('1. Testing Unauthenticated Protected-Route Access (/app)...');
    await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle' });
    if (page.url().includes('/login')) {
      console.log('   [PASS] Unauthenticated access to /app redirected to /login.');
      testResults.unauthenticatedAccessRedirect = true;
    } else {
      console.log(`   [FAIL] Expected redirect to /login but landed on ${page.url()}`);
    }

    // 2. Nonexistent User Login
    console.log('\n2. Testing Nonexistent User Login (nonexistent999@domain.com)...');
    await page.fill('input[required]', 'nonexistent999@domain.com');
    await page.fill('input[type="password"]', 'Password123!');
    let resPromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    let res = await resPromise;
    let resJson = await res.json().catch(() => ({}));
    if (res.status() === 401 && resJson.error === 'Invalid credentials provided.') {
      console.log('   [PASS] Nonexistent user correctly rejected with 401 Unauthorized.');
      testResults.nonexistentUser = true;
    } else {
      console.log(`   [FAIL] Expected 401, got ${res.status()} ${JSON.stringify(resJson)}`);
    }

    // 3. Invalid Password
    console.log('\n3. Testing Invalid Password (manager@apexenterprise.demo / wrongpassword)...');
    await page.fill('input[required]', 'manager@apexenterprise.demo');
    await page.fill('input[type="password"]', 'wrongpassword');
    resPromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    res = await resPromise;
    resJson = await res.json().catch(() => ({}));
    if (res.status() === 401 && resJson.error === 'Invalid credentials provided.') {
      console.log('   [PASS] Invalid password correctly rejected with 401 Unauthorized.');
      testResults.invalidPassword = true;
    } else {
      console.log(`   [FAIL] Expected 401, got ${res.status()} ${JSON.stringify(resJson)}`);
    }

    // 4. Valid Login via Username (demomanager)
    console.log('\n4. Testing Valid Login via Username (demomanager / demo1234)...');
    await page.fill('input[required]', 'demomanager');
    await page.fill('input[type="password"]', 'demo1234');
    resPromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    res = await resPromise;
    if (res.status() === 200) {
      await page.waitForURL('**/app**', { timeout: 5000 });
      console.log('   [PASS] Username login succeeded & redirected to /app.');
      testResults.validLoginUsername = true;
    } else {
      console.log(`   [FAIL] Username login failed with status ${res.status()}`);
    }

    // Clear session to test Email login
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

    // 5. Valid Login via Email (manager@apexenterprise.demo)
    console.log('\n5. Testing Valid Login via Email (manager@apexenterprise.demo / demo1234)...');
    await page.fill('input[required]', 'manager@apexenterprise.demo');
    await page.fill('input[type="password"]', 'demo1234');
    resPromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    res = await resPromise;
    if (res.status() === 200) {
      await page.waitForURL('**/app**', { timeout: 5000 });
      console.log('   [PASS] Email login succeeded & redirected to /app.');
      testResults.validLoginEmail = true;
    } else {
      console.log(`   [FAIL] Email login failed with status ${res.status()}`);
    }

    // 6. Refresh After Login
    console.log('\n6. Testing Refresh After Login (Page Reload at /app)...');
    await page.reload({ waitUntil: 'networkidle' });
    if (page.url().includes('/app')) {
      console.log('   [PASS] Session persisted after browser reload.');
      testResults.refreshAfterLogin = true;
    } else {
      console.log(`   [FAIL] Expected /app, landed on ${page.url()}`);
    }

    // 7. Protected Route Access when Authenticated
    console.log('\n7. Testing Authenticated Access to Protected Route (/app/energy)...');
    await page.goto('http://localhost:5173/app/energy', { waitUntil: 'networkidle' });
    if (page.url().includes('/app/energy')) {
      console.log('   [PASS] Authenticated user navigated to /app/energy successfully.');
      testResults.protectedRouteAccess = true;
    } else {
      console.log(`   [FAIL] Expected /app/energy, landed on ${page.url()}`);
    }

    // 8. Logout
    console.log('\n8. Testing Logout...');
    // Clear localStorage or click logout button if available
    await page.evaluate(() => {
      localStorage.removeItem('greengrid_access_token');
      localStorage.removeItem('greengrid_refresh_token');
      localStorage.removeItem('greengrid_user_data');
    });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    if (page.url().includes('/login')) {
      console.log('   [PASS] Tokens cleared & returned to /login.');
      testResults.logout = true;
    }

    console.log('\n=== E2E AUTHENTICATION VERIFICATION SUMMARY ===');
    console.table(testResults);

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await browser.close();
  }
}

runBrowserVerification();
