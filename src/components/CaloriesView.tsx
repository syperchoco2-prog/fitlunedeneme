import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Camera, Flame, Target, Trash2, Barcode,
  Upload, X, Sparkles, CheckCircle, AlertCircle, ScanLine,
  RotateCcw, Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getWeekDays, calculateDailyCalories, getMealsForDate,
  shiftWeek,
} from '../utils/helpers';
import { mockGetBurnedCalories } from '../utils/mockServices';

// ─── Kalori Halka Grafiği ─────────────────────────────────────
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = Math.min(consumed / goal, 1);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const remaining = goal - consumed;
  const isOver = consumed > goal;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width={112} height={112} viewBox="0 0 112 112" className="-rotate-90">
          <circle cx={56} cy={56} r={r} fill="none" stroke="#f4f4f5" strokeWidth={10} />
          <motion.circle
            cx={56} cy={56} r={r} fill="none"
            stroke={isOver ? '#f97316' : '#10b981'}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center transition-colors">
          <span className="text-[22px] font-black text-zinc-900 dark:text-white leading-none transition-colors">{consumed.toLocaleString('tr-TR')}</span>
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 transition-colors">kcal</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2 transition-colors">
        {isOver
          ? <span className="text-orange-500">+{Math.abs(remaining).toLocaleString('tr-TR')} fazla</span>
          : <span>{remaining.toLocaleString('tr-TR')} kcal kaldı</span>
        }
      </p>
    </div>
  );
}

// ─── Scanner Tarama Çizgisi Animasyonu ─────────────────────────
function ScannerLine() {
  return (
    <>
      <motion.div
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_4px_rgba(16,185,129,0.8)] z-10"
        initial={{ top: '0%' }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent to-emerald-500/20"
        initial={{ top: '-8rem' }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </>
  );
}

// ─── Köşe Çerçeve Dekorasyon ────────────────────────────────────
function CornerDecor({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute w-12 h-12 border-emerald-400/80';
  const classes: Record<string, string> = {
    tl: 'top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl',
    tr: 'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl',
    bl: 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl',
    br: 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl',
  };
  return (
    <motion.div
      className={`${base} ${classes[position]}`}
      animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─── Makro Bar ───────────────────────────────────────────────────
function MacroBar({
  label, value, unit, color, max
}: { label: string; value: number; unit: string; color: string; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex-1 min-w-0 transition-colors">
      <div className="flex justify-between items-center mb-1.5 gap-1 transition-colors">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate transition-colors">{label}</span>
        <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 shrink-0 transition-colors">{value}<span className="text-zinc-500 dark:text-zinc-500 font-semibold transition-colors">{unit}</span></span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden transition-colors">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ─── Güven Rozeti ────────────────────────────────────────────────
function ConfidenceBadge({ guven }: { guven?: string }) {
  const map = {
    yuksek: { label: 'Yüksek Güven', color: 'bg-emerald-100 text-emerald-700' },
    orta: { label: 'Orta Güven', color: 'bg-amber-100 text-amber-700' },
    dusuk: { label: 'Düşük Güven', color: 'bg-red-100 text-red-600' },
  };
  const cfg = map[guven as keyof typeof map] ?? map.orta;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────
export default function CaloriesView({
  onOpenScanner,
  onOpenBarcodeScanner,
}: {
  onOpenScanner?: () => void;
  onOpenBarcodeScanner?: () => void;
}) {
  const { state, dispatch, showToast } = useApp();
  const { selectedDate, meals, userProfile } = state;

  // Meal CRUD
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const weekDays = getWeekDays(selectedDate);
  const dailyMeals = getMealsForDate(meals, selectedDate);
  const consumedCalories = calculateDailyCalories(meals, selectedDate);
  const burnedCalories = mockGetBurnedCalories(selectedDate);

  // Günlük makro toplam
  const totalProtein = dailyMeals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = dailyMeals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = dailyMeals.reduce((s, m) => s + m.fat, 0);

  // ── Öğün Sil ──────────────────────────────────────────────────
  const handleDeleteMeal = (id: string) => {
    dispatch({ type: 'REMOVE_MEAL', payload: id });
    showToast('Öğün silindi', 'info');
    setDeleteConfirm(null);
  };

  // ── Tarih Seç ─────────────────────────────────────────────────
  const handleDateSelect = (date: string) => dispatch({ type: 'SET_DATE', payload: date });
  const handlePrevWeek = () => dispatch({ type: 'SET_DATE', payload: shiftWeek(selectedDate, -1) });
  const handleNextWeek = () => dispatch({ type: 'SET_DATE', payload: shiftWeek(selectedDate, 1) });

  const ogunRenkMap: Record<string, string> = {
    'Kahvaltı': 'bg-orange-50',
    'Öğle Yemeği': 'bg-green-50',
    'Akşam Yemeği': 'bg-blue-50',
    'Atıştırmalık': 'bg-amber-50',
  };

  return (
    <>
      {/* ───── Ana İçerik ───────────────────────────────────── */}
      <div className="flex-1 dark:bg-zinc-950 flex flex-col min-h-screen pb-24 transition-colors" style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f5 100%)' }}>

        {/* Header + Tarih Seçici */}
        <header className="px-6 pt-12 pb-4 bg-white/80 dark:bg-zinc-900 backdrop-blur-sm border-b border-white/60 dark:border-zinc-800 shrink-0 transition-colors">
          <div className="flex justify-between items-center mb-5">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight transition-colors">Kalori</h1>
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-3 py-1.5 transition-colors">
              <Flame size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 transition-colors">
                {consumedCalories.toLocaleString('tr-TR')} kcal
              </span>
            </div>
          </div>

          {/* Hafta Seçici */}
          <div className="flex justify-between items-center transition-colors">
            <button onClick={handlePrevWeek} className="text-zinc-400 dark:text-zinc-500 p-1.5 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1.5">
              {weekDays.map((day) => (
                <motion.button
                  key={day.date}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDateSelect(day.date)}
                  className={`w-10 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${day.date === selectedDate
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                    : day.isToday
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                      : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  <span className="text-[9px] uppercase font-bold mb-0.5">{day.dayShort}</span>
                  <span className="text-sm font-black">{day.dayNum}</span>
                </motion.button>
              ))}
            </div>
            <button onClick={handleNextWeek} className="text-zinc-400 dark:text-zinc-500 p-1.5 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        <div className="px-5 pt-5 pb-10 space-y-4">

          {/* ─── Kalori Özet Kartı ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-zinc-900 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/60 dark:border-zinc-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              {/* Halka */}
              <div className="relative flex items-center justify-center w-28 h-28">
                <CalorieRing consumed={consumedCalories} goal={userProfile.dailyCalorieGoal} />
              </div>

              {/* Sağ taraf bilgiler */}
              <div className="flex-1 pl-5 space-y-3">
                {/* Hedef */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5 transition-colors">Günlük Hedef</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white transition-colors">{userProfile.dailyCalorieGoal.toLocaleString('tr-TR')} <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">kcal</span></p>
                </div>
                {/* Yakılan */}
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-1.5 transition-colors">
                  <Flame size={13} className="text-amber-500 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500 transition-colors">{burnedCalories} kcal yakıldı</span>
                </div>
                {/* Net */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider transition-colors">Net</p>
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 transition-colors">
                    {Math.max(0, consumedCalories - burnedCalories).toLocaleString('tr-TR')} kcal
                  </p>
                </div>
              </div>
            </div>

            {/* Makro barlar */}
            {dailyMeals.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3 mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800 transition-colors"
              >
                <MacroBar label="Protein" value={Math.round(totalProtein)} unit="g" color="bg-blue-400 dark:bg-blue-500" max={120} />
                <MacroBar label="Karb" value={Math.round(totalCarbs)} unit="g" color="bg-orange-400 dark:bg-orange-500" max={250} />
                <MacroBar label="Yağ" value={Math.round(totalFat)} unit="g" color="bg-amber-400 dark:bg-amber-500" max={70} />
              </motion.div>
            )}
          </motion.div>

          {/* ─── Hızlı Tarama Aksiyonları ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={onOpenScanner}
                className="w-full relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-emerald-500/20"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />

                <div className="relative w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Camera size={26} className="text-white" />
                  </motion.div>
                </div>

                <div className="relative text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-white text-base">AI ile Tara</span>
                    <div className="bg-white/20 rounded-full px-2 py-0.5">
                      <span className="text-[9px] font-bold text-white uppercase tracking-wide">Fitlune AI</span>
                    </div>
                  </div>
                  <span className="text-xs text-white/70 font-medium">Fotoğraf çek → kalori analizi</span>
                </div>

                <div className="relative ml-auto">
                  <ScanLine size={22} className="text-white/50" />
                </div>
              </motion.button>

              {onOpenBarcodeScanner && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={onOpenBarcodeScanner}
                  className="w-full relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-zinc-900/15"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
                    animate={{ opacity: [0.2, 0.45, 0.2] }}
                    transition={{ duration: 3.2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute -bottom-10 -right-8 w-28 h-28 rounded-full bg-white/8"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 4.5, repeat: Infinity }}
                  />

                  <div className="relative w-14 h-14 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    >
                      <Barcode size={26} className="text-white" />
                    </motion.div>
                  </div>

                  <div className="relative text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-white text-base">Barkod Tara</span>
                      <div className="bg-white/10 rounded-full px-2 py-0.5">
                        <span className="text-[9px] font-bold text-white uppercase tracking-wide">DB</span>
                      </div>
                    </div>
                    <span className="text-xs text-white/70 font-medium">Kamera aç → ürün bilgisi çek</span>
                  </div>

                  <div className="relative ml-auto">
                    <Barcode size={20} className="text-white/45" />
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ─── Öğünler Listesi ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-zinc-900 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/60 dark:border-zinc-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-zinc-900 dark:text-white transition-colors">Öğünler</h3>
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 transition-colors">{dailyMeals.length} öğün</span>
            </div>

            <div className="space-y-3">
              {dailyMeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-4xl mb-3"
                  >
                    🍽️
                  </motion.div>
                  <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500 transition-colors">Henüz öğün eklenmedi</p>
                  <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1 transition-colors">AI veya manuel ekleme ile hızlıca başla</p>
                </div>
              ) : (
                dailyMeals.map((meal, index) => {
                  const darkBgClass = ogunRenkMap[meal.name]?.replace('bg-', 'dark:bg-').replace('-50', '-500/10') || 'dark:bg-zinc-800';

                  return (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="flex items-center justify-between py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 last:pb-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 ${ogunRenkMap[meal.name] || 'bg-zinc-50'} ${darkBgClass} rounded-xl flex items-center justify-center text-xl transition-colors`}>
                          {meal.emoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-zinc-900 dark:text-white text-sm transition-colors">{meal.items.split(' (')[0]}</h4>
                            {meal.source === 'ai' && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-black bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md transition-colors">AI</span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 transition-colors">{meal.name} · {meal.time}</p>
                          {(meal.protein > 0 || meal.carbs > 0) && (
                            <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5 transition-colors">
                              P:{meal.protein}g · K:{meal.carbs}g · Y:{meal.fat}g
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-black text-zinc-900 dark:text-white text-sm transition-colors">{meal.calories}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-0.5 transition-colors">kcal</span>
                        </div>
                        {deleteConfirm === meal.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(meal.id)}
                            className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
