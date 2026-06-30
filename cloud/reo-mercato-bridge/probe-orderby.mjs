import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', args: ['--no-sandbox','--disable-setuid-sandbox','--lang=ar'] });
const page = await browser.newPage();
await page.goto('https://www.fotmob.com/ar/transfers', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
for (const ob of ['transferDate','lastModified','date','dateAdded']) {
  const res = await page.evaluate(async (ob) => {
    try { const r = await fetch(`https://www.fotmob.com/api/data/transfers?orderBy=${ob}&page=1&minFeeCurrency=EUR&popular=true`, { headers: { Accept:'application/json' } });
      if(!r.ok) return ob+': HTTP '+r.status;
      const j = await r.json(); const t=(j.transfers||[])[0];
      return `${ob}: count=${(j.transfers||[]).length} top=${t?.name} date=${(t?.transferDate||'').slice(0,10)} fee=${t?.fee?.value}`;
    } catch(e){ return ob+': ERR '+e.message; }
  }, ob);
  console.log(res);
}
await browser.close();
