/**
 * fotmobCapture.mjs
 * يلتقط استجابة /api/data/transfers الحقيقية من FotMob عبر متصفح Chrome (CDP).
 * المتصفح يضيف ترويسة التوقيع تلقائياً، فنحصل على JSON نظيف.
 *
 * نقطة FotMob:  https://www.fotmob.com/api/data/transfers?orderBy=<o>&page=1&minFeeCurrency=EUR&popular=<bool>
 *   orderBy=amountEuro   → الأغلى (للأكبر صفقات)
 *   orderBy=transferDate → الأحدث (لصفقات اليوم/الأسبوع)
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.REO_CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ORDER_MAP = { fee: 'amountEuro', latest: 'lastModified', date: 'lastModified' };

/**
 * @param {object} o
 * @param {'fee'|'latest'} [o.view='fee']
 * @param {boolean} [o.popular=true]   true=الصفقات المهمة فقط
 * @param {number}  [o.page=1]
 */
export async function captureFotmobTransfers(o = {}) {
  const orderBy = ORDER_MAP[o.view || 'fee'] || 'amountEuro';
  const popular = o.popular === false ? 'false' : 'true';
  const pageUrl = `https://www.fotmob.com/ar/transfers${o.view === 'fee' ? '?orderBy=fee' : ''}`;
  const wantPath = `/api/data/transfers`;

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=ar'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36');

    let captured = null;
    page.on('response', async (resp) => {
      const u = resp.url();
      if (u.includes(wantPath) && u.includes(`orderBy=${orderBy}`)) {
        try { captured = await resp.json(); } catch {}
      }
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));

    // إن لم يُلتقط الترتيب المطلوب، استدعِ من سياق الصفحة (نفس الأصل + يرث التوقيع)
    if (!captured) {
      const apiUrl = `https://www.fotmob.com/api/data/transfers?orderBy=${orderBy}&page=${o.page || 1}&minFeeCurrency=EUR&popular=${popular}`;
      captured = await page.evaluate(async (url) => {
        try { const r = await fetch(url, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }
        catch { return null; }
      }, apiUrl);
    }

    return {
      ok: Boolean(captured && Array.isArray(captured.transfers)),
      orderBy,
      hits: captured?.hits ?? 0,
      maxFee: captured?.maxFee ?? 0,
      transfers: captured?.transfers || [],
    };
  } finally {
    await browser.close();
  }
}
