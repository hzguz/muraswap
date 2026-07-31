import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { CurrencyCard } from "./CurrencyCard";
import { CurrencySelector } from "./CurrencySelector";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useCurrency } from "../context/CurrencyContext";

export function CurrencyConverter() {
    const {
        sourceCurrency,
        targetCurrency,
        amount,
        setAmount,
        convertedAmount,
        swapCurrencies
    } = useCurrency();

    const [selectorType, setSelectorType] = useState<"source" | "target" | null>(null);

    const containerVariants: Variants = {
        active: {
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            borderRadius: "0px",
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        inactive: {
            scale: 0.96,
            opacity: 1,
            filter: "blur(2px) brightness(0.85)",
            borderRadius: "1rem",
            transition: { type: "spring", stiffness: 300, damping: 30 }
        }
    };

    // Simplified Theme Logic
    const getThemeColor = (currency: string) => {
        switch (currency) {
            case 'BTC': return 'orange';
            case 'EUR': return 'blue';
            case 'GBP': return 'rose';
            case 'USD': return 'red';
            case 'BRL': return 'emerald';
            case 'JPY': return 'purple';
            case 'CAD': return 'red';
            case 'AUD': return 'orange';
            case 'ARS': return 'blue';
            case 'CNY': return 'red';
            case 'CHF': return 'red';
            default: return 'default';
        }
    };

    const getBacklightClass = (currency: string) => {
        const color = getThemeColor(currency);
        switch (color) {
            case 'orange': return 'from-orange-500/40';
            case 'blue': return 'from-blue-600/40';
            case 'rose': return 'from-rose-500/40';
            case 'red': return 'from-red-600/40';
            case 'emerald': return 'from-green-500/40';
            case 'purple': return 'from-purple-500/40';
            default: return 'from-white/20';
        }
    };

    return (
        <div className="relative w-full h-full bg-[#050505] overflow-hidden selection:bg-emerald-500/30 transition-colors duration-700">

            {/* Top Source Light (Desktop: Left Channel) */}
            <motion.div
                key={`top-${sourceCurrency}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className={`absolute top-0 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 md:w-1/2 w-full h-[600px] md:h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${getBacklightClass(sourceCurrency)} via-transparent to-transparent pointer-events-none z-0 blur-[160px]`}
            />

            {/* Bottom Target Light (Desktop: Right Channel) */}
            <motion.div
                key={`bottom-${targetCurrency}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 md:w-1/2 w-full h-[600px] md:h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] ${getBacklightClass(targetCurrency)} via-transparent to-transparent pointer-events-none z-0 blur-[160px]`}
            />

            <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none mix-blend-overlay" />

            <CurrencySelector
                isOpen={!!selectorType}
                onClose={() => setSelectorType(null)}
                type={selectorType || 'source'}
            />

            <motion.div
                variants={containerVariants}
                animate={selectorType ? "inactive" : "active"}
                className="w-full h-full flex flex-col md:flex-row relative z-0 origin-center bg-transparent"
            >
                {/* 
                  STATIC COLUMNS (Fixed)
                  Card components are stable. Internal props trigger animations.
                */}

                {/* Top Card (Source) */}
                <div className="relative z-10 w-full h-1/2 md:h-full md:w-1/2 group">
                    <CurrencyCard
                        type="source"
                        value={amount}
                        currency={sourceCurrency}
                        onValueChange={setAmount}
                        onCurrencyChange={() => setSelectorType('source')}
                        isLocked={false}
                        themeColor={getThemeColor(sourceCurrency)}
                    />
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none md:hidden">
                    <motion.button
                        animate={{ rotate: sourceCurrency === 'BRL' ? 360 : 180 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(255,255,255,0.15)" }}
                        onClick={swapCurrencies}
                        aria-label="Swap currencies"
                        className="w-14 h-14 rounded-full bg-[#0A0A0A] hover:bg-[#151515] border border-white/10 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-50 pointer-events-auto relative overflow-hidden"
                    >
                        <ArrowUpDown className="text-white/90 relative z-10" size={24} />
                    </motion.button>
                </div>

                {/* Desktop Swap */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 items-center justify-center">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full blur-xl absolute" />
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9, rotate: 180 }}
                        onClick={swapCurrencies}
                        aria-label="Swap currencies"
                        className="relative w-14 h-14 rounded-full bg-[#0A0A0A] hover:bg-[#151515] border border-white/10 flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        title="Swap Currencies"
                    >
                        <ArrowUpDown className="text-white" size={20} />
                    </motion.button>
                </div>

                {/* Bottom Card (Target) */}
                <div className="relative z-0 w-full h-1/2 md:h-full md:w-1/2 group">
                    <CurrencyCard
                        type="target"
                        value={convertedAmount}
                        currency={targetCurrency}
                        onCurrencyChange={() => setSelectorType('target')}
                        readOnly
                        themeColor={getThemeColor(targetCurrency)}
                    />
                </div>

            </motion.div>

        </div>
    );
}
