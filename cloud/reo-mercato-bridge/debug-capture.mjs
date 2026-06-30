import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--lang=ar'],
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36');
let captured = null;
page.on('response', async (resp) => {
  if (resp.url().includes('/api/data/transfers')) {
    try { captured = { url: resp.url(), json: await resp.json() }; } catch {}
  }
});
await page.goto('https://www.fotmob.com/ar/transfers?orderBy=fee', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
if (!captured) { console.log('NOT CAPTURED'); await browser.close(); process.exit(1); }
const j = captured.json;
console.log('URL:', captured.url);
console.log('topKeys:', Object.keys(j).join(', '));
const arr = j.transfers || j.signings || (Array.isArray(j) ? j : []);
console.log('transfers count:', arr.length, 'maxFee:', j.maxFee, 'hits:', j.hits);
console.log('\nSAMPLE[0] keys:', Object.keys(arr[0]||{}).join(','));
console.log(JSON.stringify(arr[0], null, 1).slice(0, 1500));
await browser.close();
