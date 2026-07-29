import { motion } from "framer-motion";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Shows when the displayed rates were quoted. The API serves cached responses,
 * so a quote can be several minutes old — for a financial figure that gap is
 * worth surfacing rather than implying the number is live.
 */
export function RateStatus() {
    const { lastUpdated, isLoading } = useCurrency();
    const { t } = useLanguage();

    if (isLoading && !lastUpdated) {
        return (
            <div className="flex items-center gap-2 text-[11px] text-white/30 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                <span>{t.updating}…</span>
            </div>
        );
    }

    if (!lastUpdated) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-[11px] text-white/30 tracking-wide"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            <span>{t.updatedAt} {lastUpdated}</span>
        </motion.div>
    );
}
