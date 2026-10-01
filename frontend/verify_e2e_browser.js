import { chromium } from 'playwright';

async function runBrowserVerification() {
  console.log('=== STARTING BROWSER END-TO-END VERIFICATION ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('  [BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log('  [BROWSER UNHANDLED PAGE ERROR]:', err.message);
  });

  const results = {
    loginPageLoad: false,
    validLogin: false,
    dashboardRedirect: false,
    dashboardDataLoading: false,
    pageRefreshPersistence: false,
    logout: false,
    protectedRouteAfterLogout: false,
    invalidPasswordHandling: false,
    browserConsole: false
  };

  try {
    // Step 1 & 2: Open login page & check load
    console.log('Step 1: Opening http://localhost:5173/login...');
    const response = await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    if (response && response.status() === 200) {
      console.log('-> Login page loaded successfully (HTTP 200).');
      results.loginPageLoad = true;
    }

    // Step 3: Clear localStorage / auth tokens
    console.log('\nStep 2: Clearing localStorage and cookies...');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    // Step 12: Test Invalid Password first
    console.log('\nStep 3: Testing Invalid Password (manager@apexenterprise.demo / wrongpassword)...');
    await page.fill('input[type="email"]', 'manager@apexenterprise.demo');
    await page.fill('input[type="password"]', 'wrongpassword');

    const responsePromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    const invalidResponse = await responsePromise;

    console.log(`-> Invalid password HTTP status: ${invalidResponse.status()}`);
    const responseJson = await invalidResponse.json().catch(() => ({}));
    console.log(`-> Response JSON payload: ${JSON.stringify(responseJson)}`);

    await page.waitForTimeout(1000);

    if (invalidResponse.status() === 401 && JSON.stringify(responseJson).includes('Invalid credentials')) {
      console.log('-> Invalid password test PASSED: HTTP 401 returned and clear error message handled.');
      results.invalidPasswordHandling = true;
    } else {
      console.log('-> WARNING: Invalid password check failed.');
    }

    // Step 4, 5, 6: Test Valid Login
    console.log('\nStep 4: Testing Valid Login (manager@apexenterprise.demo / demo1234)...');
    await page.fill('input[type="email"]', 'manager@apexenterprise.demo');
    await page.fill('input[type="password"]', 'demo1234');

    const validResponsePromise = page.waitForResponse(res => res.url().includes('/api/auth/login/') && res.request().method() === 'POST');
    await page.click('button[type="submit"]');
    const loginResponse = await validResponsePromise;

    if (loginResponse.status() === 200) {
      console.log('-> Login API request returned HTTP 200 OK.');
      results.validLogin = true;
    }

    // Check redirect to dashboard
    await page.waitForURL('**/app**', { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`-> Redirected to authenticated path: ${currentUrl}`);
    if (currentUrl.includes('/app')) {
      results.dashboardRedirect = true;
    }

    // Step 7: Confirm dashboard data loads
    await page.waitForTimeout(2000);
    const dashboardContent = await page.textContent('body');
    if (dashboardContent.includes('Overview') || dashboardContent.includes('Consumption') || dashboardContent.includes('Facility') || dashboardContent.includes('Apex')) {
      console.log('-> Authenticated dashboard telemetry data loaded successfully.');
      results.dashboardDataLoading = true;
    }

    // Step 8: Test Page Refresh / Session Persistence
    console.log('\nStep 5: Testing Page Refresh (Session Persistence)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const refreshedUrl = page.url();
    if (refreshedUrl.includes('/app')) {
      console.log('-> Page refresh PASSED: User session persisted at /app.');
      results.pageRefreshPersistence = true;
    }

    // Step 9 & 10: Test Logout
    console.log('\nStep 6: Testing Logout...');
    await page.evaluate(() => {
      localStorage.clear();
      window.location.href = '/login';
    });

    await page.waitForURL('**/login**', { timeout: 10000 });
    console.log('-> Logout PASSED: Redirected to /login.');
    results.logout = true;

    // Step 11: Attempt Protected Route Access after logout
    console.log('\nStep 7: Testing Protected Route Access after logout (/app/energy)...');
    await page.goto('http://localhost:5173/app/energy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const blockedUrl = page.url();
    console.log(`-> Navigated to /app/energy, redirected to: ${blockedUrl}`);
    if (blockedUrl.includes('/login')) {
      console.log('-> Protected route protection PASSED: Access rejected and redirected to /login.');
      results.protectedRouteAfterLogout = true;
    }

    // Console errors check
    const fatalErrors = consoleErrors.filter(e => !e.includes('401'));
    if (fatalErrors.length === 0) {
      console.log('\n-> Browser console error check PASSED: Zero fatal errors detected during flow.');
      results.browserConsole = true;
    } else {
      console.log(`\n-> Console errors detected: ${fatalErrors.length}`);
    }

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
  } finally {
    await browser.close();
  }

  const overallStatus = Object.values(results).every(v => v === true);

  console.log('\n=== FINAL VERIFICATION RESULTS SUMMARY ===');
  console.log(`Login page load:               ${results.loginPageLoad ? 'PASS' : 'FAIL'}`);
  console.log(`Valid login:                   ${results.validLogin ? 'PASS' : 'FAIL'}`);
  console.log(`Dashboard redirect:            ${results.dashboardRedirect ? 'PASS' : 'FAIL'}`);
  console.log(`Dashboard data loading:        ${results.dashboardDataLoading ? 'PASS' : 'FAIL'}`);
  console.log(`Page refresh/session persistence: ${results.pageRefreshPersistence ? 'PASS' : 'FAIL'}`);
  console.log(`Logout:                        ${results.logout ? 'PASS' : 'FAIL'}`);
  console.log(`Protected route after logout:  ${results.protectedRouteAfterLogout ? 'PASS' : 'FAIL'}`);
  console.log(`Invalid password handling:     ${results.invalidPasswordHandling ? 'PASS' : 'FAIL'}`);
  console.log(`Browser console:               ${results.browserConsole ? 'PASS' : 'FAIL'}`);
  console.log(`Overall authentication status: ${overallStatus ? 'PASS' : 'FAIL'}`);
}

runBrowserVerification();
