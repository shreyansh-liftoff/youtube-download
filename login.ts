import puppeteer from 'puppeteer';

async function loginToYouTube() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://accounts.google.com/signin/v2/identifier?service=youtube');

    // Enter email
    await page.type('input[type="email"]', 'shreyanshsinghjee123@gmail.com');
    await page.click('#identifierNext');
    await page.waitForSelector('input[type="password"]', { visible: true}); // wait for the password field to appear

    // Enter password
    await page.type('input[type="password"]', 'ShreyanshSingh12345@12345');
    await page.click('#passwordNext');
    await page.waitForNavigation();

    // Check if login was successful
    if (page.url().includes('youtube.com')) {
        console.log('Login successful!');
    } else {
        console.log('Login failed.');
    }

    await browser.close();
}

loginToYouTube().catch(console.error);