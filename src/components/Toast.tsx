// ==========================================
// FitLune — Toast / Bildirim Bileşeni
// ==========================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

const iconMap = {
    success: { icon: Check, bg: 'bg-emerald-500', ring: 'ring-emerald-200' },
    error: { icon: X, bg: 'bg-red-500', ring: 'ring-red-200' },
    info: { icon: Info, bg: 'bg-blue-500', ring: 'ring-blue-200' },
};

export default function ToastContainer() {
    const { state, dispatch } = useApp();

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[360px] max-w-[90vw]">
            <AnimatePresence>
                {state.toasts.map((toast) => {
                    const config = iconMap[toast.type];
                    const IconComp = config.icon;
                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            className={`pointer-events-auto flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-3 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-800 ring-1 ${config.ring} dark:ring-opacity-20 transition-colors`}
                        >
                            <div className={`w-7 h-7 ${config.bg} rounded-full flex items-center justify-center text-white shrink-0`}>
                                <IconComp size={14} strokeWidth={3} />
                            </div>
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex-1 transition-colors">{toast.message}</span>
                            <button
                                onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}