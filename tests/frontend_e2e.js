const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('🚀 Starting E2E Test...');

    // 1. Create a unique test user
    const timestamp = Date.now();
    const testUser = {
        studentId: `test_${timestamp}`,
        name: `Test User ${timestamp}`,
        password: 'password123'
    };

    console.log(`👤 Creating test user: ${testUser.studentId}`);
    try {
        await axios.post(`${API_URL}/auth/register`, testUser);
    } catch (error) {
        console.error('❌ Failed to register test user:', error.message);
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 2. Login
        console.log('🔑 Testing Login...');
        await page.goto(`${BASE_URL}/login`);
        await page.type('input[placeholder="請輸入學號"]', testUser.studentId);
        await page.type('input[placeholder="請輸入密碼"]', testUser.password);

        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);

        // Verify login success
        const welcomeText = await page.evaluate(() => document.body.innerText);
        if (!welcomeText.includes('打卡系統')) {
            throw new Error('Login failed: Dashboard not loaded');
        }
        console.log('✅ Login successful');

        // 3. Test Clock In
        console.log('⏰ Testing Clock In...');
        // Wait for buttons to load
        await page.waitForSelector('button:has(svg)');

        // Find "上班打卡" button
        const clockInBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('上班打卡'));
        });

        if (!clockInBtn) throw new Error('Clock In button not found');

        // Click Clock In
        await clockInBtn.click();

        // Wait for UI update - "上班打卡" should become disabled/grayed out
        // and "下班打卡" should become enabled
        await page.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const clockIn = buttons.find(b => b.textContent.includes('上班打卡'));
            return clockIn && clockIn.disabled;
        }, { timeout: 5000 });

        console.log('✅ Clock In successful');

        // 4. Test Clock Out
        console.log('🏁 Testing Clock Out...');
        const clockOutBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('下班打卡'));
        });

        if (!clockOutBtn) throw new Error('Clock Out button not found');

        // Click Clock Out
        await clockOutBtn.click();

        // Wait for UI update - "下班打卡" should become disabled
        await page.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const clockOut = buttons.find(b => b.textContent.includes('下班打卡'));
            return clockOut && clockOut.disabled;
        }, { timeout: 5000 });

        console.log('✅ Clock Out successful');

        // 5. Test Overview
        console.log('📅 Testing Overview Page...');
        // Click "個人總覽" link
        await page.click('a[href="/overview"]');
        await page.waitForSelector('h2'); // Calendar header

        const overviewContent = await page.evaluate(() => document.body.innerText);
        if (!overviewContent.includes('詳細資料')) {
            throw new Error('Overview page content missing');
        }
        console.log('✅ Overview Page loaded');

        // 6. Test Leaderboard
        console.log('🏆 Testing Leaderboard Page...');
        await page.click('a[href="/leaderboard"]');
        await page.waitForSelector('table');

        const leaderboardContent = await page.evaluate(() => document.body.innerText);
        if (!leaderboardContent.includes('加班時數排行榜')) {
            throw new Error('Leaderboard page content missing');
        }
        console.log('✅ Leaderboard Page loaded');

        console.log('🎉 All tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        await page.screenshot({ path: 'test_failure.png' });
        process.exit(1);
    } finally {
        await browser.close();
    }
}

runTest();
