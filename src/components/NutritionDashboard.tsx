import React from 'react';
import { Utensils, Flame, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface NutritionDashboardProps {
    remainingCalories: number;
    totalCalories: number;
    eatenCalories: number;
    burnedCalories: number;
    consumedProtein: number;
    totalProteinGoal: number;
    consumedCarbs: number;
    totalCarbsGoal: number;
    consumedFat: number;
    totalFatGoal: number;
    displayDate: string;
    onPrevDay: () => void;
    onNextDay: () => void;
}

export default function NutritionDashboard({
    remainingCalories,
    totalCalories,
    eatenCalories,
    burnedCalories,
    consumedProtein,
    totalProteinGoal,
    consumedCarbs,
    totalCarbsGoal,
    consumedFat,
    totalFatGoal,
    displayDate,
    onPrevDay,
    onNextDay,
}: NutritionDashboardProps) {
    const safeTotalCalories = Math.max(1, totalCalories);
    const safeProteinGoal = Math.max(1, totalProteinGoal);
    const safeCarbsGoal = Math.max(1, totalCarbsGoal);
    const safeFatGoal = Math.max(1, totalFatGoal);

    const percentageConsumed = Math.min(100, Math.max(0, (eatenCalories / safeTotalCalories) * 100));
    const proteinPercentage = Math.min(100, Math.max(0, (consumedProtein / safeProteinGoal) * 100));
    const carbsPercentage = Math.min(100, Math.max(0, (consumedCarbs / safeCarbsGoal) * 100));
    const fatPercentage = Math.min(100, Math.max(0, (consumedFat / safeFatGoal) * 100));

    // SVG viewBox: "0 0 300 168"
    // Arc center: x=150, y=153, radius=120
    // Arc goes from left (30,153) to right (270,153) — a perfect semicircle
    // The center of the arc visually is at (150, 153). Text should sit around y=70-130 within the arc.

    return (
        <div className="flex flex-col w-full font-sans">

            {/* Date Nav — sadece displayDate göster, isToday formatlaması HomeView'da yapıldı */}
            <div className="flex items-center justify-between px-4 mb-1">
                <button
                    onClick={onPrevDay}
                    className="p-2 text-[#15224a]/60 hover:text-[#15224a] active:scale-90 transition-all"
                >
                    <ChevronLeft size={22} strokeWidth={2} />
                </button>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#15224a]/50" strokeWidth={2} />
                    <span className="text-[13px] font-bold tracking-widest uppercase text-[#15224a]">
                        {displayDate}
                    </span>
                </div>
                <button
                    onClick={onNextDay}
                    className="p-2 text-[#15224a]/60 hover:text-[#15224a] active:scale-90 transition-all"
                >
                    <ChevronRight size={22} strokeWidth={2} />
                </button>
            </div>

            {/* Gauge — SVG içinde hem arc hem metin, hepsi aynı koordinat sisteminde */}
            <div className="flex flex-col items-center w-full">
                <svg
                    viewBox="0 22 300 153"
                    className="w-full max-w-[340px]"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#5558e8" />
                            <stop offset="100%" stopColor="#162d75" />
                        </linearGradient>
                        <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* İç noktalı arc */}
                    <path
                        d="M 60 148 A 90 90 0 0 1 240 148"
                        fill="none"
                        stroke="#b4bfd9"
                        strokeWidth="1.5"
                        strokeDasharray="2.5 5.5"
                        strokeLinecap="butt"
                        opacity="0.45"
                    />

                    {/* Arka plan arc */}
                    <path
                        d="M 32 148 A 118 118 0 0 1 268 148"
                        fill="none"
                        stroke="#bdc9e4"
                        strokeWidth="14"
                        strokeLinecap="round"
                    />

                    {/* İlerleme arc */}
                    <path
                        d="M 32 148 A 118 118 0 0 1 268 148"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - percentageConsumed}
                        filter="url(#arcGlow)"
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.56,0.64,1)' }}
                    />

                    {/* "Kalan" etiketi */}
                    <text
                        x="150"
                        y="96"
                        textAnchor="middle"
                        fill="#15224a"
                        fillOpacity="0.45"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        letterSpacing="2.5"
                    >
                        KALAN
                    </text>

                    {/* Ana rakam */}
                    <text
                        x="150"
                        y="140"
                        textAnchor="middle"
                        fill="#15224a"
                        fontSize="48"
                        fontWeight="500"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        letterSpacing="-1.5"
                    >
                        {Math.max(0, Math.round(remainingCalories))}
                    </text>

                    {/* kcal alt yazısı */}
                    <text
                        x="150"
                        y="158"
                        textAnchor="middle"
                        fill="#8a9ac0"
                        fontSize="10.5"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        letterSpacing="1.5"
                    >
                        / {Math.round(totalCalories)} kcal
                    </text>
                </svg>
            </div>

            {/* Yenen & Yakılan — arc alt köşelerinde */}
            <div className="flex justify-between items-center px-1 -mt-1 mb-3">
                <div className="flex items-center gap-1.5 text-[#15224a]">
                    <Utensils size={16} strokeWidth={2.2} className="opacity-70" />
                    <span className="text-[13px] font-semibold">Yenen: {Math.round(eatenCalories)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#15224a]">
                    <Flame size={16} strokeWidth={2.2} className="opacity-70" />
                    <span className="text-[13px] font-semibold">Yakılan: {Math.round(burnedCalories)}</span>
                </div>
            </div>

            {/* Macro Cards */}
            <div className="grid grid-cols-3 gap-2">
                {/* Protein */}
                <div className="bg-white/90 rounded-xl px-3 py-3 border border-white shadow-sm flex flex-col justify-between gap-2.5 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[12px] text-[#15224a] leading-none">Protein</span>
                        <span className="text-[16px] leading-none flex-shrink-0">🥩</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#15224a]/60 leading-none">
                        {Math.round(consumedProtein)} / {Math.round(totalProteinGoal)}g
                    </span>
                    <div className="w-full h-[4px] bg-[#f0dde3] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${proteinPercentage}%`,
                                background: 'linear-gradient(90deg, #8b2040, #c0405a)',
                                transition: 'width 1s ease-out'
                            }}
                        />
                    </div>
                </div>

                {/* Karbonhidrat */}
                <div className="bg-white/90 rounded-xl px-3 py-3 border border-white shadow-sm flex flex-col justify-between gap-2.5 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] text-[#15224a] leading-none">Karb.</span>
                        <span className="text-[16px] leading-none flex-shrink-0">🌾</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#15224a]/60 leading-none">
                        {Math.round(consumedCarbs)} / {Math.round(totalCarbsGoal)}g
                    </span>
                    <div className="w-full h-[4px] bg-[#dde2f0] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${carbsPercentage}%`,
                                background: 'linear-gradient(90deg, #1e3a8a, #3b5fc0)',
                                transition: 'width 1s ease-out'
                            }}
                        />
                    </div>
                </div>

                {/* Yağ */}
                <div className="bg-white/90 rounded-xl px-3 py-3 border border-white shadow-sm flex flex-col justify-between gap-2.5 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[12px] text-[#15224a] leading-none">Yağ</span>
                        <span className="text-[16px] leading-none flex-shrink-0">🫒</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#15224a]/60 leading-none">
                        {Math.round(consumedFat)} / {Math.round(totalFatGoal)}g
                    </span>
                    <div className="w-full h-[4px] bg-[#f5ecd8] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${fatPercentage}%`,
                                background: 'linear-gradient(90deg, #a07820, #d4a830)',
                                transition: 'width 1s ease-out'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
