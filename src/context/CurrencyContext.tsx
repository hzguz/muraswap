import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { parseAmountInput, toAmountInput } from "../lib/utils";
import { SUPPORTED_CURRENCIES } from "../lib/constants";

// AwesomeAPI response type
interface AwesomeAPIRate {
    code: string;
    codein: string;
    name: string;
    high: string;
    low: string;
    varBid: string;
    pctChange: string;
    bid: string;
    ask: string;
    timestamp: string;
    create_date: string;
}

type AwesomeAPIResponse = Record<string, AwesomeAPIRate>;

// Every rate is quoted against BRL, the API's native base.
const RATE_CURRENCIES = ['USD', 'EUR', 'GBP', 'BTC', 'JPY', 'CAD', 'AUD', 'ARS', 'CNY', 'CHF'] as const;

// Matches the API's 5-minute cache window; polling faster returns identical data.
const REFRESH_INTERVAL_MS = 60_000;

// Approximate quotes used only until the first successful fetch, so the UI has
// something plausible to render offline. Snapshot taken 2026-07-29.
const FALLBACK_RATES: Record<string, number> = {
    BRL: 1, USD: 5.13, EUR: 5.83, GBP: 6.82, BTC: 330000, JPY: 0.0313,
    CAD: 3.64, AUD: 3.56, ARS: 0.0034, CNY: 0.757, CHF: 6.25
};



export interface SavedPair {
    source: string;
    target: string;
}

const FAVORITES_KEY = 'favorites';
const SAVED_PAIRS_KEY = 'savedPairs';
const ACTIVE_PAIR_KEY = 'activePair';

const DEFAULT_PAIR: SavedPair = { source: 'BRL', target: 'USD' };

/**
 * Reads JSON from localStorage, falling back when the entry is absent, corrupt,
 * or storage is unavailable (private browsing, disabled cookies).
 */
function readStoredJSON<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) as T : fallback;
    } catch {
        return fallback;
    }
}

function writeStoredJSON(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage being unavailable must not break the conversion flow.
    }
}

/** Restores the last explicitly loaded pair, ignoring codes no longer supported. */
function readStoredPair(): SavedPair {
    const stored = readStoredJSON<Partial<SavedPair>>(ACTIVE_PAIR_KEY, {});
    const isUsable = (code: unknown): code is string =>
        typeof code === 'string' && SUPPORTED_CURRENCIES.includes(code);

    return isUsable(stored.source) && isUsable(stored.target) && stored.source !== stored.target
        ? { source: stored.source, target: stored.target }
        : DEFAULT_PAIR;
}

export interface CurrencyContextType {
    sourceCurrency: string;
    targetCurrency: string;
    amount: string;
    /** Conversion result as a number; null when input is empty or invalid. */
    convertedAmount: number | null;
    setSourceCurrency: (c: string) => void;
    setTargetCurrency: (c: string) => void;
    setAmount: (a: string) => void;
    swapCurrencies: () => void;
    isLoading: boolean;
    lastUpdated: string | null;
    favorites: string[];
    toggleFavorite: (currency: string) => void;
    savedPairs: SavedPair[];
    savePair: (source: string, target: string) => void;
    removePair: (source: string, target: string) => void;
    isPairSaved: (source: string, target: string) => boolean;
    loadPair: (source: string, target: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    // Only a pair loaded from the saved list is restored; manually switching a
    // currency stays session-scoped, so the app never silently remembers a
    // selection the user did not choose to keep.
    const [{ source: initialSource, target: initialTarget }] = useState(readStoredPair);
    const [sourceCurrency, setSourceCurrency] = useState(initialSource);
    const [targetCurrency, setTargetCurrency] = useState(initialTarget);

    const [favorites, setFavorites] = useState<string[]>(
        () => readStoredJSON<string[]>(FAVORITES_KEY, [])
    );

    const [savedPairs, setSavedPairs] = useState<SavedPair[]>(
        () => readStoredJSON<SavedPair[]>(SAVED_PAIRS_KEY, [])
    );

    const [amount, setAmount] = useState("");
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
    const [rates, setRates] = useState<Record<string, number>>({ BRL: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Persistence Effects
    // The active pair is written by loadPair only, never by manual switching.
    useEffect(() => { writeStoredJSON(FAVORITES_KEY, favorites); }, [favorites]);
    useEffect(() => { writeStoredJSON(SAVED_PAIRS_KEY, savedPairs); }, [savedPairs]);

    const toggleFavorite = (curr: string) => {
        setFavorites(prev =>
            prev.includes(curr)
                ? prev.filter(c => c !== curr)
                : [...prev, curr]
        );
    };

    const savePair = (source: string, target: string) => {
        if (savedPairs.some(p => p.source === source && p.target === target)) return;
        setSavedPairs(prev => [...prev, { source, target }]);
    };

    const removePair = (source: string, target: string) => {
        setSavedPairs(prev => prev.filter(p => !(p.source === source && p.target === target)));

        // A deleted pair must not keep being restored on the next visit.
        const stored = readStoredJSON<Partial<SavedPair>>(ACTIVE_PAIR_KEY, {});
        if (stored.source === source && stored.target === target) {
            writeStoredJSON(ACTIVE_PAIR_KEY, {});
        }
    };

    /**
     * Activates a pair from the saved list. This is the only path that persists
     * the active selection, keeping manual currency switches session-scoped.
     */
    const loadPair = (source: string, target: string) => {
        setSourceCurrency(source);
        setTargetCurrency(target);
        writeStoredJSON(ACTIVE_PAIR_KEY, { source, target });
    };

    const isPairSaved = (source: string, target: string) => {
        return savedPairs.some(p => p.source === source && p.target === target);
    };

    // Fetch Real-Time Rates from AwesomeAPI (Free, Secure, No Key)
    // We fetch everything relative to BRL (Real) because it's the API's native base.
    useEffect(() => {
        const fetchRates = async () => {
            try {
                const pairs = RATE_CURRENCIES.map(currency => `${currency}-BRL`).join(',');
                const response = await fetch(`https://economia.awesomeapi.com.br/last/${pairs}`);

                // fetch only rejects on network failure, so HTTP errors (429, 5xx)
                // would otherwise reach the JSON parser as an error payload.
                if (!response.ok) {
                    throw new Error(`Rate request failed with status ${response.status}`);
                }

                const data: AwesomeAPIResponse = await response.json();

                // Normalize rates to be "Value in BRL" (Bid Price).
                // A missing or non-positive bid is dropped rather than stored as 0:
                // a 0 rate would silently degrade to parity and show plausible-looking
                // but wrong figures, so the previous known rate is kept instead.
                setRates(prevRates => {
                    const newRates: Record<string, number> = { ...prevRates, BRL: 1 };

                    for (const currency of RATE_CURRENCIES) {
                        const bid = parseFloat(data[`${currency}BRL`]?.bid ?? "");
                        if (Number.isFinite(bid) && bid > 0) {
                            newRates[currency] = bid;
                        }
                    }

                    return newRates;
                });

                // Report when the quote was priced, not when it was fetched: the
                // CDN serves cached responses, so those differ by minutes.
                const quotedAt = Math.max(
                    ...RATE_CURRENCIES
                        .map(currency => parseInt(data[`${currency}BRL`]?.timestamp ?? "", 10))
                        .filter(Number.isFinite)
                );
                setLastUpdated(
                    new Date(Number.isFinite(quotedAt) ? quotedAt * 1000 : Date.now())
                        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                );
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to fetch rates:", error);
                // Seed approximate rates only on the initial load. A failed refresh
                // keeps the live rates already held, since stale constants would be
                // a downgrade from real quotes fetched moments earlier.
                setRates(prevRates => (
                    Object.keys(prevRates).length > 1 ? prevRates : FALLBACK_RATES
                ));
                setIsLoading(false);
            }
        };

        fetchRates();

        // The API caches responses for 5 minutes, so polling faster than
        // REFRESH_INTERVAL_MS only re-fetches identical data. Refreshing is also
        // pointless while the tab is hidden.
        const interval = setInterval(() => {
            if (!document.hidden) fetchRates();
        }, REFRESH_INTERVAL_MS);

        // Catch up immediately when the user returns to a tab that skipped refreshes.
        const handleVisibilityChange = () => {
            if (!document.hidden) fetchRates();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Conversion Logic
    useEffect(() => {
        // The input mask always emits digits plus one comma as the decimal
        // separator, so parsing never depends on the selected currency.
        const val = parseAmountInput(amount);
        if (isNaN(val) || val === 0) {
            setConvertedAmount(null);
            return;
        }

        const sourceRate = rates[sourceCurrency];
        const targetRate = rates[targetCurrency];

        // Without both sides quoted, no honest result exists yet.
        if (!sourceRate || !targetRate) {
            setConvertedAmount(null);
            return;
        }

        const valInBRL = val * sourceRate;
        setConvertedAmount(valInBRL / targetRate);

    }, [amount, sourceCurrency, targetCurrency, rates]);

    const swapCurrencies = () => {
        setSourceCurrency(targetCurrency);
        setTargetCurrency(sourceCurrency);

        // Carry the result into the input so the swap reads as a true inversion
        // ("100 -> 19.51" becomes "19.51 -> ...") instead of re-converting the
        // original figure under the new pair. The displayed (rounded) figure is
        // carried rather than full precision, so the new input matches what the
        // user actually saw; converting back may differ slightly from the
        // original amount, which is the honest result of that rounding.
        if (convertedAmount !== null) {
            setAmount(toAmountInput(convertedAmount, targetCurrency));
        }
    };

    return (
        <CurrencyContext.Provider value={{
            sourceCurrency,
            targetCurrency,
            amount,
            setAmount,
            convertedAmount,
            setSourceCurrency,
            setTargetCurrency,
            swapCurrencies,
            isLoading,
            lastUpdated,
            favorites,
            toggleFavorite,
            savedPairs,
            savePair,
            removePair,
            isPairSaved,
            loadPair
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
}
