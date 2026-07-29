import { useEffect, useRef } from "react";
import { useSpring, useMotionValue } from "framer-motion";
import { formatCurrencyValue, localeFor } from "../lib/utils";
import { useLanguage } from "../context/LanguageContext";

interface MotionNumberProps {
    value: number | null;
    className?: string;
    currency: string;
}

export function MotionNumber({ value, className, currency }: MotionNumberProps) {
    const { language } = useLanguage();
    const locale = localeFor(language);

    const target = value !== null && Number.isFinite(value) && value > 0 ? value : 0;
    const motionVal = useMotionValue(target);

    // Very fast spring: almost instant
    const spring = useSpring(motionVal, {
        stiffness: 800,
        damping: 50,
        mass: 0.1
    });

    useEffect(() => {
        motionVal.set(target);
    }, [target, motionVal]);

    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const unsubscribe = spring.on("change", (latest) => {
            if (ref.current) {
                // Clamp to prevent negative values during animation. Decimals are
                // derived from the settled target so the digit count stays stable
                // while the spring travels.
                ref.current.textContent = formatCurrencyValue(
                    Math.max(0, latest), currency, locale, target
                );
            }
        });
        return () => unsubscribe();
    }, [spring, currency, locale, target]);

    const initialFormatted = formatCurrencyValue(target, currency, locale, target);

    return <span ref={ref} className={className}>{initialFormatted}</span>;
}
