import { useState } from "react";
import { cn } from "../lib/utils";

interface CurrencyIconProps {
    currency: string;
    className?: string;
}

// Fiat maps to its country flag; crypto uses a vector mark for sharpness.
const BITCOIN_ICON_URL = "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg";
const FLAG_COUNTRY_CODES: Record<string, string> = {
    USD: 'us', BRL: 'br', EUR: 'eu', GBP: 'gb', JPY: 'jp', CAD: 'ca',
    AUD: 'au', ARS: 'ar', CNY: 'cn', CHF: 'ch', NZD: 'nz', SGD: 'sg'
};

function iconUrlFor(currency: string): string | null {
    if (currency === 'BTC') return BITCOIN_ICON_URL;

    const countryCode = FLAG_COUNTRY_CODES[currency];
    return countryCode ? `https://flagcdn.com/w80/${countryCode}.png` : null;
}

export function CurrencyIcon({ currency, className }: CurrencyIconProps) {
    // Tracks which currency failed rather than a plain boolean, so a previous
    // failure never suppresses a different currency's icon.
    const [failedCurrency, setFailedCurrency] = useState<string | null>(null);
    const iconUrl = iconUrlFor(currency);
    const hasImageFailed = failedCurrency === currency;

    if (iconUrl && !hasImageFailed) {
        return (
            <img
                src={iconUrl}
                // The surrounding controls already announce the currency, so the
                // icon is decorative and would otherwise be read twice.
                alt=""
                loading="lazy"
                className={cn("w-full h-full object-cover rounded-full", className)}
                onError={() => setFailedCurrency(currency)}
            />
        );
    }

    // Shown for unmapped codes and when the CDN is unreachable, so the control
    // never collapses into an empty circle.
    return (
        <div
            aria-hidden="true"
            className={cn(
                "w-full h-full flex items-center justify-center font-bold bg-white/10 rounded-full text-white/70 text-xs",
                className
            )}
        >
            {currency.slice(0, 3)}
        </div>
    );
}
