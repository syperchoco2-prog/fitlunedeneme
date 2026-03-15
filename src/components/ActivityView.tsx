import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Dumbbell, Zap, Edit3, Flame, TrendingUp, CheckCircle, RotateCcw, ChevronLeft, Sparkles, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayStr, generateId } from '../utils/helpers';
import type { Workout } from '../types';

const ACTIVITIES = [
    { id: 'weights', name: 'Ağırlık (Gym)', icon: Dumbbell, calPerMin: 6, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-500' },
    { id: 'swimming', name: 'Yüzme', icon: Zap, calPerMin: 8, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-500' },
    { id: 'yoga', name: 'Yoga', icon: TrendingUp, calPerMin: 4, color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-500' },
];

const STEP_GOAL = 10000;

export default function ActivityView() {
    const { state, dispatch, showToast } = useApp();
    const { workouts, stepsLog, userProfile, selectedDate } = state;
    const isToday = selectedDate === getTodayStr();

    // Current states
    const todaySteps = stepsLog.find(s => s.date === selectedDate)?.count || 0;
    const todayWorkouts = workouts.filter(w => w.date === selectedDate);

    // Forms
    const [stepInput, setStepInput] = useState('');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [duration, setDuration] = useState('');

    const handleAddSteps = () => {
        const val = parseInt(stepInput);
        if (isNaN(val) || val <= 0) return;

        dispatch({
            type: 'SET_STEPS',
            payload: { date: selectedDate, count: todaySteps + val }
        });
        setStepInput('');
        showToast(`${val} adım başarıyla eklendi!`, 'success');
    };

    const handleAddWorkout = (activityId: string) => {
        const min = parseInt(duration);
        if (isNaN(min) || min <= 0) {
            showToast('Lütfen geçerli bir süre girin', 'error');
            return;
        }

        const act = ACTIVITIES.find(a => a.id === activityId);
        if (!act) return;

        const burnedCal = min * act.calPerMin;
        const workout: Workout = {
            id: generateId(),
            type: act.name,
            duration: min,
            calories: burnedCal,
            date: selectedDate,
        };

        dispatch({ type: 'ADD_WORKOUT', payload: workout });
        setDuration('');
        setActiveModal(null);
        showToast(`${act.name} antrenmanı eklendi. ${burnedCal} kcal yakıldı!`, 'success');
    };

    const handleRemoveWorkout = (id: string) => {
        dispatch({ type: 'REMOVE_WORKOUT', payload: id });
        showToast('Antrenman silindi', 'info');
    };

    const stepPercent = Math.min((todaySteps / STEP_GOAL) * 100, 100);
    const totalBurned = todayWorkouts.reduce((sum, w) => sum + w.calories, 0) + Math.floor(todaySteps * 0.04);

    return (
        <div className="flex-1 flex flex-col dark:bg-zinc-950 pb-28 min-h-full relative overflow-hidden transition-colors" style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f5 100%)' }}>
            {/* Header */}
            <header className="px-6 pt-12 pb-6 bg-white/80 dark:bg-zinc-900 backdrop-blur-sm shrink-0 rounded-b-[2rem] shadow-sm z-10 sticky top-0 transition-colors">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-zinc-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-widest transition-colors">{selectedDate === getTodayStr() ? 'Bugün' : selectedDate}</span>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 transition-colors">
                            Egzersiz <Zap className="text-amber-500 fill-amber-500" size={24} />
                        </h1>
                    </div>
                    <div className="text-right">
                        <span className="block text-2xl font-black text-amber-500">{totalBurned}</span>
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider transition-colors">Kcal Yakıldı</span>
                    </div>
                </div>
            </header>

            <div className="px-5 pt-6 space-y-6 overflow-y-auto">

                {/* Aylık Adım ve Mesafe Grafiği Şablonu */}
                <section className="bg-white/80 dark:bg-zinc-900 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/60 dark:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight transition-colors">Aylık İlerleme</h3>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">Mart 2026</span>
                    </div>

                    {/* Fake Bar Chart */}
                    <div className="h-32 flex items-end justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2 transition-colors">
                        {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                            <div key={i} className="w-full bg-emerald-50 dark:bg-emerald-500/10 rounded-t-md relative group flex-1 transition-colors">
                                <div className="absolute bottom-0 left-0 w-full bg-emerald-400 dark:bg-emerald-500 rounded-t-md transition-all duration-500" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold px-1 transition-colors">
                        <span>H1</span><span>H2</span><span>H3</span><span>H4</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 transition-colors">
                            <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1 transition-colors">Toplam Adım</span>
                            <span className="text-lg font-black text-zinc-900 dark:text-white transition-colors">214.500</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 transition-colors">
                            <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1 transition-colors">Toplam Mesafe</span>
                            <span className="text-lg font-black text-zinc-900 dark:text-white transition-colors">162 <span className="text-xs text-zinc-500 dark:text-zinc-500">km</span></span>
                        </div>
                    </div>
                </section>

                {/* Adımsayar (Step Counter) */}
                <section className="bg-white/80 dark:bg-zinc-900 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/60 dark:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 transition-colors">
                                <span className="text-2xl">👟</span> Günlük Adım
                            </h2>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-black text-zinc-900 dark:text-white transition-colors">{todaySteps.toLocaleString()}</span>
                            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 ml-1 transition-colors">/ {STEP_GOAL.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative mb-5 transition-colors">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stepPercent}%` }}
                            transition={{ duration: 1, type: "spring" }}
                            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                        />
                    </div>

                    {/* Adım Ekleme Input'u */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="+ Adım ekle"
                            value={stepInput}
                            onChange={e => setStepInput(e.target.value)}
                            className="flex-1 bg-zinc-50 dark:bg-[#1E2532] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-colors"
                        />
                        <button
                            onClick={handleAddSteps}
                            disabled={!stepInput}
                            className="bg-zinc-900 dark:bg-emerald-500 text-white px-5 rounded-xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                            Ekle
                        </button>
                    </div>
                </section>

                {/* Antrenman Ekleme Section */}
                <section>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 px-1 uppercase tracking-tight transition-colors">Antrenman Ekle</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {ACTIVITIES.map(act => {
                            // Dark moda özel renk ayarları için sınıfları dark mode uyumlu hale getiriyoruz
                            const darkBgClass = act.bg.replace('bg-', 'dark:bg-').replace('-50', '-500/10');
                            return (
                                <button
                                    key={act.id}
                                    onClick={() => setActiveModal(act.id)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md dark:shadow-none transition-all group`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${act.bg} ${darkBgClass} ${act.text} dark:text-${act.color.replace('bg-', '')} group-hover:scale-110 transition-all`}>
                                        <act.icon size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors">{act.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Geçmiş Antrenmanlar */}
                {todayWorkouts.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 px-1 uppercase tracking-tight transition-colors">Günün Antrenmanları</h3>
                        <div className="space-y-3">
                            <AnimatePresence>
                                {todayWorkouts.map(workout => {
                                    const actInfo = ACTIVITIES.find(a => a.name === workout.type) || ACTIVITIES[0];
                                    const Icon = actInfo.icon;
                                    const darkBgClass = actInfo.bg.replace('bg-', 'dark:bg-').replace('-50', '-500/10');
                                    return (
                                        <motion.div
                                            key={workout.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="bg-white dark:bg-zinc-900 p-4 rounded-2xl flex items-center border border-zinc-100 dark:border-zinc-800 shadow-sm gap-4 transition-colors"
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${actInfo.bg} ${darkBgClass} ${actInfo.text} dark:text-${actInfo.color.replace('bg-', '')}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-zinc-900 dark:text-white transition-colors">{workout.type}</h4>
                                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-colors">{workout.duration} dakika • {workout.calories} kcal</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveWorkout(workout.id)}
                                                className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </section>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {/* Yüzme / Yoga Modal */}
                {(activeModal === 'swimming' || activeModal === 'yoga') && (
                    <motion.div 
                        key="swim-yoga-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center"
                    >
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm transition-colors" onClick={() => setActiveModal(null)}></div>
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full bg-white dark:bg-zinc-900 rounded-t-3xl p-6 relative z-10 flex flex-col pb-10 transition-colors"
                        >
                            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 transition-colors"></div>
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-6 transition-colors">{activeModal === 'swimming' ? 'Yüzme' : 'Yoga'} Antrenmanı</h2>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider transition-colors">Süre (Dakika)</label>
                                    <input
                                        type="number"
                                        placeholder="Örn: 45"
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-[#1E2532] border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-lg font-black text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => handleAddWorkout(activeModal)}
                                disabled={!duration}
                                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-base shadow-lg dark:shadow-none hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                            >
                                Antrenmanı Kaydet
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Ağırlık (Gym) Modal */}
                {activeModal === 'weights' && (
                    <motion.div 
                        key="weights-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center"
                    >
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm transition-colors" onClick={() => setActiveModal(null)}></div>
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full h-[85vh] bg-white dark:bg-zinc-900 rounded-t-3xl p-6 relative z-10 flex flex-col transition-colors"
                        >
                            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 shrink-0 transition-colors"></div>

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white transition-colors">Gym Programı</h2>
                                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                    <RotateCcw size={16} />
                                </button>
                            </div>

                            {/* Haftanın Günleri */}
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide shrink-0">
                                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map((day, i) => (
                                    <button key={i} className={`w-12 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center font-bold transition-colors ${i === 0 ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                                        <span className="text-xs">{day}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto pb-4 space-y-3">
                                <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 transition-colors">Bugünkü Hareketler</h3>

                                {/* Fake Exercise List */}
                                <div className="p-4 bg-zinc-50 dark:bg-[#1E2532] border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center transition-colors">
                                    <div>
                                        <h4 className="font-bold text-zinc-900 dark:text-white transition-colors">Bench Press</h4>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 transition-colors">Göğüs</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-amber-500">4 x 10</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold transition-colors">Set x Tekrar</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-[#1E2532] border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center transition-colors">
                                    <div>
                                        <h4 className="font-bold text-zinc-900 dark:text-white transition-colors">Incline Dumbbell Press</h4>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 transition-colors">Üst Göğüs</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-amber-500">3 x 12</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold transition-colors">Set x Tekrar</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-[#1E2532] border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center transition-colors">
                                    <div>
                                        <h4 className="font-bold text-zinc-900 dark:text-white transition-colors">Triceps Pushdown</h4>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 transition-colors">Arka Kol</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-amber-500">4 x 12</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold transition-colors">Set x Tekrar</span>
                                    </div>
                                </div>

                                <button className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mt-4">
                                    <Plus size={18} /> Yeni Hareket Ekle
                                </button>
                            </div>

                            <div className="shrink-0 pt-4 bg-white dark:bg-zinc-900 transition-colors border-t border-zinc-100 dark:border-zinc-800">
                                <button className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                    <Sparkles size={20} className="fill-white/20" /> AI ile Hesapla ve Kaydet
                                </button>
                                <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-3 font-medium transition-colors">Yapay zeka, hareketlerinize ve kilonuza göre yaktığınız kaloriyi hesaplayacaktır.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
