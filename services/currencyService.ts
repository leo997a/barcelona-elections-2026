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
    SAR: 3.75,
    AED: 3.67,
    QAR: 3.64,
    KWD: 0.31,
    BHD: 0.38,
    OMR: 0.38,
    JOD: 0.71,
    EGP: 47.5,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 157,
    CAD: 1.36,
    AUD: 1.51,
    MAD: 9.95,
    DZD: 134,
    TND: 3.1,
    TRY: 32.2,
    BRL: 5.2,
    MXN: 17,
    INR: 83.5,
    IDR: 16200,
    MYR: 4.7,
    SGD: 1.35,
    CNY: 7.25,
    KRW: 1380,
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

    async getRates(): Promise<ExchangeRates | null> {
        const cachedRates = this.getCachedRates();
        if (cachedRates) return cachedRates;

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
