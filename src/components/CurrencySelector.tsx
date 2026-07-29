import { X, Star, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";
import { SUPPORTED_CURRENCIES } from "../lib/constants";
import { CurrencyIcon } from "./CurrencyIcon";

interface CurrencySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    type: "source" | "target";
}

const listVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10, scale: 0.98 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 100, damping: 20, mass: 0.5 }
    }
};

export function CurrencySelector({ isOpen, onClose, type }: CurrencySelectorProps) {
    const {
        sourceCurrency,
        targetCurrency,
        favorites,
        toggleFavorite,
        savedPairs,
        savePair,
        removePair,
        isPairSaved,
        loadPair,
        setSourceCurrency: setGlobalSource,
        setTargetCurrency: setGlobalTarget
    } = useCurrency();
    const { t } = useLanguage();

    const [activeTab, setActiveTab] = useState<'currencies' | 'pairs'>('currencies');

    const [showTopGradient, setShowTopGradient] = useState(false);
    const [showBottomGradient, setShowBottomGradient] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowTopGradient(scrollTop > 10);
        setShowBottomGradient(scrollHeight - scrollTop > clientHeight + 10);
    };

    useEffect(() => {
        if (isOpen) {
            setActiveTab('currencies');
        }
        checkScroll();
        // Re-check when sortedCurrencies changes (filter update)
    }, [isOpen]); // Reset tab when opening

    // Escape closes the drawer, matching the dismiss affordance of the backdrop.
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Logic Fix: Prevent selecting the same currency.
    // If we are selecting 'source', hide the currency that is currently 'target'.
    // If we are selecting 'target', hide the currency that is currently 'source'.
    const availableCurrencies = SUPPORTED_CURRENCIES.filter(c => {
        if (type === 'source') return c !== targetCurrency;
        if (type === 'target') return c !== sourceCurrency;
        return true;
    });

    const handleSelect = (curr: string) => {
        if (type === 'source') setGlobalSource(curr);
        else setGlobalTarget(curr);
        onClose();
    };

    const handleSelectPair = (source: string, target: string) => {
        // Loading a saved pair is an explicit choice, so it persists across visits.
        loadPair(source, target);
        onClose();
    };

    // Sort: Favorites first, then Others. Within each group: Alphabetical (or default order)
    const sortedCurrencies = useMemo(() => {
        return [...availableCurrencies].sort((a, b) => {
            const isFavA = favorites.includes(a);
            const isFavB = favorites.includes(b);
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return 0; // Maintain default order otherwise
        });
    }, [availableCurrencies, favorites]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 pointer-events-auto"
                    />

                    {/* Drawer - Super Rounded & Floating */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="currency-selector-title"
                        className="fixed bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-4 z-[60] bg-[#111] md:rounded-[2rem] rounded-t-[2rem] border-t md:border border-white/10 p-0 md:p-6 pb-2 h-[70vh] md:h-[60vh] shadow-2xl origin-bottom flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4 md:mb-6 px-6 pt-6 md:pt-0 md:px-2 shrink-0">
                            <h2 id="currency-selector-title" className="text-xl font-semibold text-white tracking-tight">{t.selectCurrency}</h2>
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={18} className="text-white" />
                            </motion.button>
                        </div>

                        {/* Toggle Switch */}
                        <div className="relative flex mb-4 px-4 md:px-2">
                            <div className="relative flex w-full bg-white/5 rounded-full p-1">
                                {/* Sliding Background */}
                                <motion.div
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-lg"
                                    initial={false}
                                    animate={{
                                        left: activeTab === 'currencies' ? '4px' : 'calc(50% + 0px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />

                                <button
                                    onClick={() => setActiveTab('currencies')}
                                    role="tab"
                                    aria-selected={activeTab === 'currencies'}
                                    className={cn(
                                        "flex-1 py-3 rounded-full font-medium text-sm transition-colors relative z-10 flex items-center justify-center gap-2",
                                        activeTab === 'currencies'
                                            ? "text-black"
                                            : "text-white/50 hover:text-white/70"
                                    )}
                                >
                                    {t.selectCurrency}
                                </button>
                                <button
                                    onClick={() => setActiveTab('pairs')}
                                    role="tab"
                                    aria-selected={activeTab === 'pairs'}
                                    className={cn(
                                        "flex-1 py-3 rounded-full font-medium text-sm transition-colors relative z-10 flex items-center justify-center gap-2",
                                        activeTab === 'pairs'
                                            ? "text-black"
                                            : "text-white/50 hover:text-white/70"
                                    )}
                                >
                                    {t.savedPairs}
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Container Wrapper with Relative for Gradients */}
                        <div className="flex-1 min-h-0 relative flex flex-col">

                            {/* Top Gradient - Conditional */}
                            <AnimatePresence>
                                {showTopGradient && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#111] to-transparent z-10 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>

                            <div
                                ref={scrollRef}
                                onScroll={checkScroll}
                                className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-32 scroll-smooth" // Increased padding bottom for floating button
                            >
                                {activeTab === 'currencies' ? (
                                    <motion.div
                                        key="currencies-list"
                                        variants={listVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="grid grid-cols-1 gap-2 pb-2"
                                    >
                                        {sortedCurrencies.map((curr) => {
                                            const isFav = favorites.includes(curr);

                                            return (
                                                <motion.div
                                                    layout
                                                    variants={itemVariants}
                                                    key={curr}
                                                    className="flex items-center gap-1 rounded-[1.2rem] border border-white/5 bg-white/5 hover:bg-white/10 transition-colors pr-1"
                                                >
                                                    <button
                                                        onClick={() => handleSelect(curr)}
                                                        aria-label={`${t.selectCurrency}: ${curr} — ${t.currencies[curr] || curr}`}
                                                        className="flex-1 min-w-0 flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-[1.2rem] hover:scale-[1.01] active:scale-[0.99] transition-transform group text-left relative"
                                                    >
                                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shadow-md shrink-0">
                                                            <CurrencyIcon currency={curr} className="w-full h-full" />
                                                        </div>
                                                        <div className="flex flex-col items-start flex-1">
                                                            <span className="text-base md:text-lg font-semibold text-white tracking-tight">{curr}</span>
                                                            <span className="text-xs text-white/50 font-normal">
                                                                {t.currencies[curr] || curr}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => toggleFavorite(curr)}
                                                        aria-label={`${isFav ? 'Remove' : 'Add'} ${curr} favorite`}
                                                        aria-pressed={isFav}
                                                        className="p-3 rounded-full hover:bg-white/10 transition-colors group/star z-10 outline-none shrink-0"
                                                    >
                                                        <motion.div
                                                            key={isFav ? "fav" : "unfav"}
                                                            initial={{ scale: 0.5, opacity: 0.5 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                                        >
                                                            <Star
                                                                size={18}
                                                                className={cn(
                                                                    "transition-colors duration-300",
                                                                    isFav ? "fill-white text-white" : "text-white/20 group-hover/star:text-white/50"
                                                                )}
                                                            />
                                                        </motion.div>
                                                    </motion.button>
                                                </motion.div>
                                            )
                                        })}
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col gap-2 pb-2">
                                        {/* Empty State - Show when NO pairs saved at all */}
                                        {savedPairs.length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm py-10">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <Sparkles size={24} className="opacity-50" />
                                                </div>
                                                <p>{t.noPairsSaved}</p>
                                            </div>
                                        )}

                                        <AnimatePresence mode="popLayout">
                                            {savedPairs.map((pair) => (
                                                <motion.div
                                                    key={`${pair.source}-${pair.target}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -50 }}
                                                    layout
                                                    className="flex items-center gap-2"
                                                >
                                                    <button
                                                        onClick={() => handleSelectPair(pair.source, pair.target)}
                                                        className="flex-1 flex items-center gap-3 p-3 rounded-[1.2rem] border border-white/5 bg-white/5 hover:bg-white/10 hover:scale-[1.01] active:scale-[0.99] transition-all group text-left"
                                                    >
                                                        <div className="flex items-center -space-x-2">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md z-10 border-2 border-[#111]">
                                                                <CurrencyIcon currency={pair.source} className="w-full h-full" />
                                                            </div>
                                                            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md z-0 border-2 border-[#111]">
                                                                <CurrencyIcon currency={pair.target} className="w-full h-full" />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-start pl-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-base font-semibold text-white tracking-tight">{pair.source}</span>
                                                                <ArrowRight size={12} className="text-white/30" />
                                                                <span className="text-base font-semibold text-white tracking-tight">{pair.target}</span>
                                                            </div>
                                                            <span className="text-xs text-white/40 font-medium">
                                                                {pair.source === sourceCurrency && pair.target === targetCurrency ? t.activePair : t.loadPair}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removePair(pair.source, pair.target);
                                                        }}
                                                        aria-label={`Remove ${pair.source} to ${pair.target} pair`}
                                                        className="p-3 rounded-full hover:bg-red-500/20 hover:text-red-400 text-white/20 transition-colors shrink-0"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Gradient - Conditional */}
                            <AnimatePresence>
                                {showBottomGradient && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#111] to-transparent z-10 pointer-events-none hidden" // Hidden gradient as requested
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Fixed Save Button - Only show in Pairs tab */}
                        {activeTab === 'pairs' && !isPairSaved(sourceCurrency, targetCurrency) && (
                            <div className="absolute bottom-6 left-6 right-6 md:static md:mt-auto md:px-2 md:pb-2">
                                <button
                                    onClick={() => savePair(sourceCurrency, targetCurrency)}
                                    className="w-full p-3 md:p-4 rounded-full bg-[#292929] hover:bg-[#3a3a3a] active:scale-[0.98] transition-all flex items-center justify-center shadow-lg"
                                >
                                    <span className="text-white text-sm md:text-base font-semibold">
                                        {t.savePair}
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* Spacer Removed */}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
