import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type SupportedLocale = 'pt-BR' | 'en-US';

// Fiat is quoted to cents; BTC needs satoshi resolution.
const FIAT_DECIMALS = 2;
const BTC_DECIMALS = 8;
// Sub-unit results (e.g. BTC amounts in fiat) collapse to "0.00" at 2 decimals,
// so small magnitudes get extra digits to stay readable.
const SUB_UNIT_THRESHOLD = 1;
const SUB_UNIT_DECIMALS = 6;
/** Maximum characters the amount input accepts. */
export const MAX_AMOUNT_LENGTH = 15;

export function localeFor(language: string): SupportedLocale {
    return language === 'pt' ? 'pt-BR' : 'en-US';
}

/**
 * Parses the input mask's output. The mask emits digits plus at most one comma
 * as the decimal separator, independent of the selected currency.
 */
export function parseAmountInput(rawAmount: string): number {
    return parseFloat(rawAmount.replace(',', '.'));
}

/** Decimal places that keep a converted result legible without trailing noise. */
export function decimalsFor(currency: string, value: number): number {
    if (currency === 'BTC') return BTC_DECIMALS;
    if (value !== 0 && Math.abs(value) < SUB_UNIT_THRESHOLD) return SUB_UNIT_DECIMALS;
    return FIAT_DECIMALS;
}

/**
 * Serializes a number back into the input mask's format (digits plus a single
 * comma), so a converted result can become the next amount typed.
 */
export function toAmountInput(value: number, currency: string): string {
    const decimals = decimalsFor(currency, value);
    // Trailing zeros are stripped from the fraction only, never from the integer part.
    const text = value
        .toFixed(decimals)
        .replace(/(\.\d*?)0+$/, '$1')
        .replace(/\.$/, '')
        .replace('.', ',');

    // The mask caps length; dropping decimals is preferable to truncating digits,
    // which would silently change the number's magnitude.
    if (text.length <= MAX_AMOUNT_LENGTH) return text;
    return text.split(',')[0].slice(0, MAX_AMOUNT_LENGTH);
}

/**
 * @param decimalsSource Value the decimal count is derived from. Pass the settled
 * target when animating so the digit count does not flicker between frames.
 */
export function formatCurrencyValue(
    value: number,
    currency: string,
    locale: SupportedLocale,
    decimalsSource: number = value
): string {
    const decimals = decimalsFor(currency, decimalsSource);
    return value.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}
