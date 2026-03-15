
interface ExchangeRates {
    base: string;
    date: string;
    rates: Record<string, number>;
}

const CACHE_KEY = 'rge_currency_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours

export const currencyService = {
    
    // Get rates (cached or network)
    async getRates(): Promise<ExchangeRates | null> {
        // 1. Try Cache
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                const age = Date.now() - parsed.timestamp;
                if (age < CACHE_DURATION) {
                    console.log('💰 Using Cached Currency Rates');
                    return parsed.data;
                }
            }
        } catch (e) {
            console.error('Currency Cache Error', e);
        }

        // 2. Fetch Fresh
        try {
            // Using open API (No key required for base functionality on some endpoints, 
            // or we use a public mirror for demo purposes)
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            
            // Save to Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));

            console.log('💰 Fetched Fresh Currency Rates');
            return data;
        } catch (e) {
            console.error('Failed to fetch currency rates', e);
            return null;
        }
    },

    // Convert any amount to USD
    async convertToUSD(amount: number, currency: string): Promise<number> {
        if (currency.toUpperCase() === 'USD') return amount;
        
        const ratesData = await this.getRates();
        if (!ratesData || !ratesData.rates[currency.toUpperCase()]) {
            console.warn(`Currency ${currency} not found, returning raw amount.`);
            return amount; // Fallback
        }

        const rate = ratesData.rates[currency.toUpperCase()];
        // If Base is USD, then 1 USD = rate * Foreign
        // So Foreign / rate = USD
        return Number((amount / rate).toFixed(2));
    }
};
