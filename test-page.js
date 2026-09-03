import puppeteer from 'puppeteer';
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    await page.goto('http://localhost:3001/dashboard/rpg-vtt');
    await page.waitForTimeout(2000);
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
