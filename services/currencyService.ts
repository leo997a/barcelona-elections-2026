interface ExchangeRates {
    base: string;
    date: string;
    rates: Record<string, number>;
}

const CACHE_KEY = 'rge_currency_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 2500;

// Fast fallback rates: 1 USD = rate in target currency.
// Used only when live/cached rates are unavailable so sponsor entry stays
// responsive during a broadcast.
const FALLBACK_USD_RATES: Record<string, number> = {
    USD: 1,
    AED: 3.67,
    AFN: 70,
    ALL: 92,
    AMD: 388,
    ARS: 880,
    AUD: 1.51,
    AZN: 1.7,
    BAM: 1.8,
    BDT: 117,
    BHD: 0.38,
    BRL: 5.2,
    CAD: 1.36,
    CHF: 0.9,
    CLP: 930,
    CNY: 7.25,
    COP: 3900,
    CZK: 23,
    DKK: 6.85,
    DJF: 178,
    DZD: 134,
    EGP: 47.5,
    EUR: 0.92,
    ETB: 57,
    GBP: 0.79,
    GEL: 2.7,
    GHS: 14.5,
    HKD: 7.82,
    HUF: 360,
    IDR: 16200,
    ILS: 3.7,
    INR: 83.5,
    IQD: 1310,
    JOD: 0.71,
    JPY: 157,
    KES: 130,
    KGS: 89,
    KMF: 452,
    KRW: 1380,
    KWD: 0.31,
    KZT: 445,
    LBP: 89500,
    LYD: 4.85,
    MAD: 9.95,
    MDL: 17.7,
    MRU: 39.5,
    MXN: 17,
    MYR: 4.7,
    NGN: 1500,
    NOK: 10.6,
    NZD: 1.64,
    OMR: 0.38,
    PHP: 58,
    PKR: 278,
    PLN: 3.95,
    QAR: 3.64,
    RON: 4.58,
    RUB: 91,
    SAR: 3.75,
    SDG: 600,
    SEK: 10.5,
    SGD: 1.35,
    SOS: 571,
    SYP: 13000,
    THB: 36.5,
    TND: 3.1,
    TRY: 32.2,
    TZS: 2600,
    UAH: 40,
    UZS: 12600,
    VND: 25400,
    XAF: 604,
    XOF: 604,
    YER: 250,
    ZAR: 18.3,
};

const convertWithRate = (amount: number, rate: number): number =>
    Number((amount / rate).toFixed(2));

export const currencyService = {
    getCachedRates(): ExchangeRates | null {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const parsed = JSON.parse(cached);
            const age = Date.now() - Number(parsed.timestamp || 0);
            if (age < CACHE_DURATION) return parsed.data;
        } catch (e) {
            console.error('Currency cache error', e);
        }
        return null;
    },

    async fetchFreshRates(): Promise<ExchangeRates | null> {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
                signal: controller.signal,
            });
            const data = await response.json();

            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data,
            }));

            return data;
        } catch (e) {
            console.error('Failed to fetch currency rates', e);
            return null;
        } finally {
            window.clearTimeout(timeout);
        }
    },

    async getRates(): Promise<ExchangeRates | null> {
        const cachedRates = this.getCachedRates();
        if (cachedRates) return cachedRates;
        return this.fetchFreshRates();
    },

    async refreshRates(): Promise<ExchangeRates | null> {
        return this.fetchFreshRates();
    },

    async convertToUSD(amount: number, currency: string): Promise<number> {
        const code = currency.toUpperCase() === 'OTH' ? 'USD' : currency.toUpperCase();
        if (code === 'USD') return amount;

        const cachedRate = this.getCachedRates()?.rates?.[code];
        if (cachedRate) return convertWithRate(amount, cachedRate);

        const fallbackRate = FALLBACK_USD_RATES[code];
        if (fallbackRate) {
            void this.getRates();
            return convertWithRate(amount, fallbackRate);
        }

        const ratesData = await this.getRates();
        const liveRate = ratesData?.rates?.[code];
        if (!liveRate) {
            console.warn(`Currency ${code} not found, returning raw amount.`);
            return amount;
        }

        return convertWithRate(amount, liveRate);
    },
};
