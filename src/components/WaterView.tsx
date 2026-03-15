import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplet, Settings2, X, Sparkles, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMonthDays, getFirstDayOfMonth, getMonthLabel, getTodayStr } from '../utils/helpers';
import { mockGetWaterRecommendation } from '../utils/mockServices';

export default function WaterView() {
    const { state, dispatch, showToast } = useApp();
    const { selectedDate, waterLog, userProfile } = state;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [tempGoal, setTempGoal] = useState(String(userProfile.dailyWaterGoal));

    // Bugünkü su miktarı
    const waterEntry = waterLog.find(w => w.date === selectedDate);
    const water = waterEntry?.amount || 0;
    const goal = userProfile.dailyWaterGoal;
    const percentage = Math.min((water / goal) * 100, 100);
    const dashArray = 2 * Math.PI * 70;
    const dashOffset = dashArray - (dashArray * percentage) / 100;

    // Aylık veriler
    const monthDays = getMonthDays(selectedDate);
    const firstDayOffset = getFirstDayOfMonth(selectedDate);
    const today = getTodayStr();

    const addWater = (amount: number) => {
        dispatch({ type: 'ADD_WATER', payload: { date: selectedDate, amount } });
        if (amount > 0) {
            const newAmount = water + amount;
            if (newAmount >= goal && water < goal) {
                showToast('🎉 Günlük su hedefinize ulaştınız!', 'success');
            } else {
                showToast(`+${amount} L su eklendi`, 'success');
            }
        }
    };

    const removeWater = (amount: number) => {
        if (water <= 0) return;
        dispatch({ type: 'ADD_WATER', payload: { date: selectedDate, amount: -amount } });
        showToast(`${amount} L su çıkarıldı`, 'info');
    };

    const handleAIRecommendation = () => {
        const recommended = mockGetWaterRecommendation(userProfile.weight, userProfile.height, userProfile.activityLevel);
        setTempGoal(String(recommended));
        showToast(`AI önerisi: Günde ${recommended} L su içmeniz önerilir`, 'info');
    };

    const handleSaveSettings = () => {
        const g = parseFloat(tempGoal);
        if (isNaN(g) || g <= 0) {
            showToast('Geçerli bir hedef girin', 'error');
            return;
        }
        dispatch({ type: 'SET_WATER_GOAL', payload: g });
        showToast('Su hedefi güncellendi', 'success');
        setSettingsOpen(false);
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen" style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f5 100%)' }}>
            <header className="px-6 pt-12 pb-4 bg-white/80 backdrop-blur-sm border-b border-white/60 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Su Takibi</h1>
                    <button
                        onClick={() => { setTempGoal(String(userProfile.dailyWaterGoal)); setSettingsOpen(true); }}
                        className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                        <Settings2 size={20} />
                    </button>
                </div>

                {/* Daily Goal */}
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="#EFF6FF" strokeWidth="12" />
                            <motion.circle
                                cx="80" cy="80" r="70"
                                fill="transparent"
                                stroke={percentage >= 100 ? '#10B981' : '#3B82F6'}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={dashArray}
                                animate={{ strokeDashoffset: dashOffset }}
                                transition={{ duration: 1, type: 'spring' }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <Droplet size={28} className={`${percentage >= 100 ? 'text-emerald-500' : 'text-blue-500'} mb-1`} />
                            <span className="text-2xl font-bold text-zinc-900">{water}<span className="text-sm text-zinc-400 font-medium ml-1">L</span></span>
                            <span className="text-xs text-zinc-500 font-medium mt-1">Hedef: {goal.toFixed(1)} L</span>
                        </div>
                    </div>

                    {/* Quick Add/Remove Buttons */}
                    <div className="flex gap-3 mt-8 w-full">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addWater(0.2)}
                            className="flex flex-col items-center justify-center bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition-colors flex-1"
                        >
                            <span className="text-2xl mb-1">🥛</span>
                            <span className="text-xs font-bold text-zinc-700">0.2 L</span>
                            <span className="text-[10px] text-zinc-400">Bardak</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addWater(0.5)}
                            className="flex flex-col items-center justify-center bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition-colors flex-1"
                        >
                            <span className="text-2xl mb-1">💧</span>
                            <span className="text-xs font-bold text-zinc-700">0.5 L</span>
                            <span className="text-[10px] text-zinc-400">Pet Şişe</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addWater(1.0)}
                            className="flex flex-col items-center justify-center bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition-colors flex-1"
                        >
                            <span className="text-2xl mb-1">🚰</span>
                            <span className="text-xs font-bold text-zinc-700">1.0 L</span>
                            <span className="text-[10px] text-zinc-400">Büyük Şişe</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addWater(1.5)}
                            className="flex flex-col items-center justify-center bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition-colors flex-1"
                        >
                            <span className="text-2xl mb-1">🧊</span>
                            <span className="text-xs font-bold text-zinc-700">1.5 L</span>
                            <span className="text-[10px] text-zinc-400">Matara</span>
                        </motion.button>
                    </div>

                    {/* Geri Al Butonu */}
                    {water > 0 && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => removeWater(0.2)}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-zinc-500 text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                            <Minus size={14} /> 0.2 L Geri Al
                        </motion.button>
                    )}
                </div>
            </header>

            <div className="px-5 pt-6 space-y-5 pb-28">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/60">
                    <h3 className="text-sm font-bold text-zinc-900 mb-4">{getMonthLabel(selectedDate)} İlerlemesi</h3>
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                            <div key={d} className="text-zinc-400 text-[10px] font-semibold uppercase">{d}</div>
                        ))}
                        {/* Boş günler (ay başlangıcı offset) */}
                        {Array.from({ length: firstDayOffset }, (_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {/* Ayın günleri */}
                        {monthDays.map((day) => {
                            const dayWater = waterLog.find(w => w.date === day.date);
                            const dayAmount = dayWater?.amount || 0;
                            const dayGoal = userProfile.dailyWaterGoal;
                            const fillPercent = dayGoal > 0 ? Math.min((dayAmount / dayGoal) * 100, 100) : 0;
                            const isToday = day.date === today;
                            const isFuture = day.date > today;

                            return (
                                <motion.div whileHover={{ y: -2 }} key={day.date} className="flex flex-col items-center gap-1.5 relative group cursor-pointer">
                                    <div className={`w-7 h-9 ${isToday ? 'border-blue-500' : 'border-blue-200'} bg-blue-50/30 rounded-b-xl rounded-t-[2px] border-2 relative overflow-hidden flex items-end justify-center shadow-sm ${isFuture ? 'opacity-40' : ''}`}>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${fillPercent}%` }}
                                            transition={{ duration: 1, type: 'spring' }}
                                            className={`w-full ${fillPercent >= 100 ? 'bg-emerald-400' : 'bg-blue-400'} opacity-80`}
                                        ></motion.div>
                                        <div className="absolute top-1 right-1 w-1 h-4 bg-white/80 rounded-full"></div>
                                    </div>
                                    <span className={`text-[10px] font-medium ${isToday ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>
                                        {day.dayNum}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
                {settingsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white rounded-3xl p-6 mx-6 w-full max-w-sm shadow-2xl z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-zinc-900">Su Ayarları</h2>
                                <button onClick={() => setSettingsOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Günlük Hedef */}
                                <div>
                                    <label className="text-sm font-bold text-zinc-700 mb-2 block">Günlük Su Hedefi (Litre)</label>
                                    <input
                                        value={tempGoal}
                                        onChange={e => setTempGoal(e.target.value)}
                                        type="number"
                                        step="0.1"
                                        min="0.5"
                                        max="10"
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                </div>

                                {/* AI Önerisi */}
                                <button
                                    onClick={handleAIRecommendation}
                                    className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                    <Sparkles size={18} />
                                    <div className="text-left">
                                        <span className="text-sm font-bold block">AI Önerisi Al</span>
                                        <span className="text-[10px] text-blue-500">Boy, kilo ve aktivite seviyenize göre</span>
                                    </div>
                                </button>

                                {/* Kaydet */}
                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-600 transition-colors"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}