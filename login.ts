import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import fs from 'fs';
import { fork } from 'child_process';

dotenv.config();

puppeteer.use(StealthPlugin());

async function cleanCookies(cookies: any) {
    return cookies.map((cookie: any) => {
        const { partitionKey, topLevelSite, storeId, ...filteredCookie } = cookie; // Remove extra fields
        return filteredCookie;
    });
}

async function loginToYouTube() {
    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-software-compositing',
            '--disable-extensions',
            '--disable-default-apps',
            '--enable-features=NetworkService',
            '--window-size=1920,1080'
        ]
    });
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(60000);

    // ✅ Load and set cookies before opening YouTube
    if (fs.existsSync('cookies.json')) {
        const cookiesString = fs.readFileSync('cookies.json', 'utf8');
        let cookies = JSON.parse(cookiesString);
        cookies = await cleanCookies(cookies);
        await browser.setCookie(...cookies);
    }

    // ✅ Navigate to YouTube
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

    // ✅ Check if login was successful
    const isLoggedIn = await page.evaluate(() => {
        console.log('Checking if logged in...', document.cookie);
        return document.cookie.includes('LOGIN_INFO');
    });

    if (isLoggedIn) {
        console.log('✅ Successfully logged into YouTube with cookies.');
    } else {
        console.error('❌ Login failed, try getting fresh cookies.');
    }

    // fork main process
    fork('./dist/index.js');
}

loginToYouTube().catch(console.error);