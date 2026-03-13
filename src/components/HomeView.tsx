import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Droplet, Flame, Check, Target, Zap, Clock, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatDateDisplay, getTodayStr, getMonthDays, getFirstDayOfMonth, getMonthLabel,
  calculateDailyCalories, getMealsForDate,
  calculateDailyMacros, calculateMacroGoals,
  getNextMealSuggestion, getWeekDays, shiftWeek
} from '../utils/helpers';
import type { DailyTask } from '../types';

export interface HomeViewProps {
  onNavigate?: (tab: string) => void;
}



// ===================== Varsayılan günlük görevler =====================
function getDefaultTasks(date: string): DailyTask[] {
  return [
    { id: `task-water-${date}`, text: '2 Litre su hedefini tamamla', done: false, pts: 50, date },
    { id: `task-sugar-${date}`, text: 'Şeker ilaveli içecek tüketme', done: false, pts: 100, date },
    { id: `task-steps-${date}`, text: 'En az 5000 adım at', done: false, pts: 50, date },
  ];
}

// ===================== HomeView =====================
export default function HomeView({ onNavigate }: HomeViewProps) {
  const { state, dispatch, showToast } = useApp();
  const { selectedDate, meals, waterLog, userProfile, dailyTasks, workouts, stepsLog } = state;
  const today = getTodayStr();
  const currentHour = new Date().getHours();

  // Popup state'i
  const [historyPopupDate, setHistoryPopupDate] = React.useState<string | null>(null);

  // HomeView HER ZAMAN BUGÜNÜ GÖSTERECEK! (Kullanıcı History'den seçmiyorsa ana sayfa sabittir)
  const displayDate = today;

  // Haftalık Takvimde Hangi Haftayı Görüntülüyoruz
  const [viewDate, setViewDate] = React.useState<string>(today);

  // Ana Sayfa Verileri (Her zaman BUGÜN)
  const consumedCalories = calculateDailyCalories(meals, displayDate);
  const todayWorkouts = workouts.filter(w => w.date === displayDate);
  const todaySteps = stepsLog.find(s => s.date === displayDate)?.count || 0;

  // Eğer mock veri kalacaksa kalabilir ama gerçek veriyi hesaplayabiliriz
  const burnedCalories = todayWorkouts.reduce((sum, w) => sum + w.calories, 0) + Math.floor(todaySteps * 0.04);

  // Haftalık Takvim Günleri
  const weekDays = getWeekDays(viewDate);

  // Sıradaki Öğün
  const nextMeal = getNextMealSuggestion(currentHour, meals, displayDate);

  // Aylık ilerleme takvimi (HER ZAMAN BUGÜN'e ODAKLI)
  const monthDays = getMonthDays(displayDate);
  const firstDayOffset = getFirstDayOfMonth(displayDate);
  const monthLabel = getMonthLabel(displayDate);
  const weekDayLabels = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

  // Günlük görevler — yoksa oluştur
  const todayTasks = dailyTasks.filter(t => t.date === displayDate);
  useEffect(() => {
    if (todayTasks.length === 0) {
      const existing = dailyTasks.filter(t => t.date !== displayDate);
      dispatch({ type: 'SET_DAILY_TASKS', payload: [...existing, ...getDefaultTasks(displayDate)] });
    }
  }, [displayDate]);

  const handleToggleTask = (taskId: string) => {
    dispatch({ type: 'TOGGLE_TASK', payload: { id: taskId, date: displayDate } });
    const task = todayTasks.find(t => t.id === taskId);
    if (task && !task.done) {
      showToast(`Görev tamamlandı! +${task.pts} puan 🎉`, 'success');
    }
  };

  const handleAddWater = (amount: number) => {
    dispatch({ type: 'ADD_WATER', payload: { date: displayDate, amount } });
    showToast(`${(amount * 1000).toFixed(0)} ml su eklendi! 💧`, 'success');
  };

  // Animasyon varyantları
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 pb-28 overflow-x-hidden transition-colors">

      {/* HEADER SECTION */}
      <header className="px-6 pt-12 pb-5 bg-white dark:bg-zinc-900 shrink-0 rounded-b-[2rem] shadow-sm z-10 transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <img
              src="/logo.png"
              alt="Fitlune"
              className="h-9 w-auto object-contain object-left"
              style={{ maxWidth: '140px' }}
            />
            <span className="text-zinc-400 dark:text-zinc-500 font-semibold text-[10px] uppercase tracking-widest transition-colors">{formatDateDisplay(displayDate)}</span>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate && onNavigate('profile')}
            className="w-11 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shadow-md cursor-pointer relative transition-colors"
          >
            <img src="https://picsum.photos/seed/avatar/100/100" alt="Profile" className="w-full h-full object-cover" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full transition-colors"></div>
          </motion.div>
        </div>
      </header>

      {/* Ana İçerik */}
      <motion.div variants={container} initial="hidden" animate="show" className="px-5 pt-6 space-y-5">

        {/* HAFTALIK TAKVİM */}
        <motion.div variants={item} className="w-full">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm tracking-tight flex items-center gap-2 transition-colors">
              <CalendarIcon size={16} className="text-zinc-400 dark:text-zinc-500 transition-colors" /> {viewDate === today ? 'Bu Hafta' : getMonthLabel(viewDate)}
            </h3>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-xl p-0.5 transition-colors">
              <button onClick={() => setViewDate(shiftWeek(viewDate, -1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors shadow-sm cursor-pointer">
                <ChevronLeft size={16} strokeWidth={3} />
              </button>
              <button onClick={() => setViewDate(today)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                Bugün
              </button>
              <button onClick={() => setViewDate(shiftWeek(viewDate, 1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors shadow-sm cursor-pointer">
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center gap-2">
            {weekDays.map((day, idx) => {
              const dMeals = getMealsForDate(meals, day.date);
              const dWater = waterLog.find(w => w.date === day.date)?.amount || 0;
              const hasData = dMeals.length > 0 || dWater > 0;
              const isToday = day.isToday;
              const isPast = day.date < today;

              // Renk ve Stil Kararları (Orjinal Zümrüt / Light Tema)
              let bgColor = 'bg-white dark:bg-zinc-900';
              let borderColor = 'border-zinc-100 dark:border-zinc-800';
              let textColor = 'text-zinc-400 dark:text-zinc-500';
              let numColor = 'text-zinc-700 dark:text-zinc-300';
              let dotColor = 'bg-transparent';

              if (isToday) {
                bgColor = 'bg-emerald-500 dark:bg-white';
                borderColor = 'border-emerald-500 dark:border-white';
                textColor = 'text-emerald-100 dark:text-zinc-500';
                numColor = 'text-white dark:text-zinc-900';
                dotColor = 'bg-white dark:bg-emerald-500 opacity-80 mt-0.5';
              } else if (isPast && hasData) {
                bgColor = 'bg-emerald-50 dark:bg-zinc-800/50';
                borderColor = 'border-emerald-200 dark:border-zinc-700/50';
                textColor = 'text-emerald-500 dark:text-zinc-400';
                numColor = 'text-emerald-700 dark:text-white';
                dotColor = 'bg-emerald-500/50 dark:bg-zinc-500 rounded-full mt-0.5';
              } else if (isPast && !hasData) {
                bgColor = 'bg-zinc-50/50 dark:bg-zinc-900/50';
                textColor = 'text-zinc-300 dark:text-zinc-600';
                numColor = 'text-zinc-400 dark:text-zinc-500';
              }

              return (
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setHistoryPopupDate(day.date)}
                  className={`flex-1 flex flex-col items-center justify-center aspect-square rounded-[14px] border ${isToday ? 'border' : 'border-b-[3px]'} cursor-pointer transition-colors shadow-sm ${bgColor} ${borderColor}`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 transition-colors ${textColor}`}>{day.dayShort}</span>
                  <span className={`text-base font-black transition-colors ${numColor}`}>{day.dayNum}</span>

                  {/* Nokta göstergesi */}
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${dotColor}`}></div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* SIRADAKİ ÖĞÜN TAHMİNİ */}
        <motion.div variants={item} className="bg-white dark:bg-zinc-900 rounded-3xl p-2 shadow-sm border border-zinc-100/80 dark:border-zinc-800 flex items-center pr-5 group cursor-pointer hover:border-emerald-200 dark:hover:border-zinc-700 transition-colors">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-95 transition-transform">
            {nextMeal.emoji}
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-amber-500 dark:text-amber-400" />
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">Sıradaki Öğün</span>
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white leading-none mb-1">{nextMeal.mealType}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium line-clamp-1">
              {nextMeal.suggestedCal > 0
                ? `AI Önerisi: ${nextMeal.suggestion} (${nextMeal.suggestedCal} kcal)`
                : nextMeal.suggestion}
            </p>
          </div>
          {nextMeal.suggestedCal > 0 && (
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Plus size={20} />
            </div>
          )}
        </motion.div>

        {/* KALORİ DENGESİ */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 dark:bg-[#1E2532] rounded-3xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden transition-colors">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 text-zinc-400 dark:text-emerald-500/70 mb-6">
              <Target size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Kalan Kalori</span>
            </div>
            <div>
              <span className="text-3xl font-black text-white">{Math.max(0, userProfile.dailyCalorieGoal - consumedCalories)}</span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 ml-1">kcal</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between transition-colors">
            <div className="flex items-center gap-2 text-amber-500 mb-6">
              <Zap size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Yakılan</span>
            </div>
            <div>
              <span className="text-3xl font-black text-zinc-900 dark:text-white transition-colors">{burnedCalories}</span>
              <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500 ml-1">kcal</span>
            </div>
          </div>
        </motion.div>

        {/* MİNİ GÜNLÜK GÖREVLER */}
        <motion.div variants={item} className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100/80 dark:border-zinc-800 transition-colors">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
            <span className="text-emerald-500">🎯</span> Günlük Görevler
          </h3>
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} onClick={() => handleToggleTask(task.id)} className="flex items-center gap-3 group cursor-pointer">
                <motion.div
                  animate={{ scale: task.done ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}`}
                >
                  {task.done && <Check size={14} strokeWidth={3} />}
                </motion.div>
                <span className={`text-sm font-medium flex-1 transition-all ${task.done ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>{task.text}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${task.done ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'}`}>
                  {task.done ? '✓' : `+${task.pts}`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SU TAKİBİ WIDGET (YENİ) */}
        <motion.div variants={item} className="bg-blue-500 dark:bg-blue-600/30 rounded-3xl p-5 shadow-sm text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] transition-colors border dark:border-blue-500/20">
          <div className="absolute -right-4 -bottom-4 opacity-20 dark:opacity-10">
            <Droplet size={140} className="fill-current text-white dark:text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-blue-500/30 backdrop-blur-md flex items-center justify-center">
                  <Droplet size={16} className="text-white fill-current" />
                </div>
                <h3 className="font-bold tracking-tight text-white">Su Takibi</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">{waterLog.find(w => w.date === displayDate)?.amount?.toFixed(1) || '0.0'}</span>
                <span className="text-sm font-bold text-blue-100 dark:text-blue-200 ml-1">/ {userProfile.dailyWaterGoal.toFixed(1)} L</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAddWater(0.25)}
                className="flex-1 bg-white/20 dark:bg-blue-500/20 hover:bg-white/30 dark:hover:bg-blue-500/40 backdrop-blur-md transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white"
              >
                <Plus size={16} /> <span className="text-xs font-bold font-medium tracking-wide">250ml</span>
              </button>
              <button
                onClick={() => handleAddWater(0.5)}
                className="flex-1 bg-white/20 dark:bg-blue-500/20 hover:bg-white/30 dark:hover:bg-blue-500/40 backdrop-blur-md transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white"
              >
                <Plus size={16} /> <span className="text-xs font-bold font-medium tracking-wide">500ml</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* AYLIK İLERLEME TAKVİMİ */}
        <motion.div variants={item} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100/80 dark:border-zinc-800 transition-colors">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm tracking-tight flex items-center gap-2 transition-colors">
              <CalendarIcon size={16} className="text-blue-500" /> Aylık İlerleme
            </h3>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider transition-colors">{monthLabel}</span>
          </div>

          <div className="grid grid-cols-7 gap-y-3 gap-x-1">
            {/* Gün İsimleri */}
            {weekDayLabels.map((label, i) => (
              <div key={`label-${i}`} className="text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1 transition-colors">
                {label}
              </div>
            ))}

            {/* Boşluklar (Ayın ilk gününe kadar) */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}

            {/* Günler */}
            {monthDays.map((day) => {
              const dayMeals = getMealsForDate(meals, day.date);
              const dayWater = waterLog.find(w => w.date === day.date);
              const hasData = dayMeals.length > 0 || (dayWater && dayWater.amount > 0);
              const isPast = day.date < today;
              const isSelected = day.date === selectedDate;
              const isToday = day.isToday;

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    setHistoryPopupDate(day.date);
                  }}
                  className="flex justify-center items-center cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative
                    ${isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md scale-110 z-10' :
                      isToday ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-500/20' :
                        isPast && hasData ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700/50' :
                          'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {day.dayNum}
                    {/* Veri varsa küçük nokta */}
                    {isPast && hasData && !isSelected && (
                      <div className="absolute -bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </motion.div>

      {/* HISTORY POPUP MODAL */}
      <AnimatePresence>
        {historyPopupDate && (
          <motion.div 
            key="history-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm transition-colors" onClick={() => setHistoryPopupDate(null)}></div>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full h-[85vh] bg-white dark:bg-zinc-900 rounded-t-3xl p-6 relative z-10 flex flex-col transition-colors"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 shrink-0 transition-colors"></div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white transition-colors">{formatDateDisplay(historyPopupDate)}</h2>
                  {historyPopupDate === today && <span className="text-emerald-500 text-xs font-bold tracking-widest uppercase">Bugün</span>}
                </div>
                <button onClick={() => setHistoryPopupDate(null)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <Check size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-5 pb-10 pr-1">
                {(() => {
                  const pMeals = getMealsForDate(meals, historyPopupDate);
                  const pCal = calculateDailyCalories(meals, historyPopupDate);
                  const pWorkouts = workouts.filter(w => w.date === historyPopupDate);
                  const pSteps = stepsLog.find(s => s.date === historyPopupDate)?.count || 0;
                  const pBurn = pWorkouts.reduce((sum, w) => sum + w.calories, 0) + Math.floor(pSteps * 0.04);
                  const pWater = waterLog.find(w => w.date === historyPopupDate)?.amount || 0;

                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 transition-colors">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-500 block mb-1">Alınan</span>
                          <span className="text-xl font-black text-zinc-900 dark:text-white">{pCal} <span className="text-[10px] text-zinc-500 dark:text-zinc-500">kcal</span></span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-500/10 transition-colors">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-600 dark:text-amber-500 block mb-1">Yakılan</span>
                          <span className="text-xl font-black text-zinc-900 dark:text-white">{pBurn} <span className="text-[10px] text-zinc-500 dark:text-zinc-500">kcal</span></span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 transition-colors">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 dark:text-blue-500 block mb-1">Su</span>
                          <span className="text-xl font-black text-zinc-900 dark:text-white">{pWater.toFixed(1)} <span className="text-[10px] text-zinc-500 dark:text-zinc-500">L</span></span>
                        </div>
                      </div>

                      {pSteps > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 flex justify-between items-center transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">👟</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-300 text-sm transition-colors">Adımlar</span>
                          </div>
                          <span className="font-black text-zinc-900 dark:text-white transition-colors">{pSteps.toLocaleString()}</span>
                        </div>
                      )}

                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider pt-2">Öğünler</h3>
                      {pMeals.length > 0 ? (
                        <div className="space-y-2">
                          {pMeals.map(m => (
                            <div key={m.id} className="flex items-center p-3 border border-zinc-100 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#1E2532] shadow-sm gap-3 transition-colors">
                              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl transition-colors">{m.emoji}</div>
                              <div className="flex-1">
                                <span className="text-sm font-bold text-zinc-900 dark:text-white block leading-tight mb-0.5 transition-colors">{m.name}</span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 transition-colors">{m.items}</span>
                              </div>
                              <span className="text-sm font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg transition-colors">{m.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 border border-zinc-100 dark:border-zinc-800 border-dashed rounded-2xl text-center text-zinc-500 dark:text-zinc-600 text-sm font-medium bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors">Kayıt Bulunmuyor</div>
                      )}

                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider pt-2">Antrenmanlar</h3>
                      {pWorkouts.length > 0 ? (
                        <div className="space-y-2">
                          {pWorkouts.map(w => (
                            <div key={w.id} className="flex justify-between items-center p-3 border border-zinc-100 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#1E2532] shadow-sm transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center transition-colors"><Activity size={14} strokeWidth={3} /></div>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white transition-colors">{w.type} <span className="font-medium text-zinc-400 dark:text-zinc-500 text-xs ml-1">({w.duration}dk)</span></span>
                              </div>
                              <span className="text-sm font-black text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg transition-colors">{w.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 border border-zinc-100 dark:border-zinc-800 border-dashed rounded-2xl text-center text-zinc-500 dark:text-zinc-600 text-sm font-medium bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors">Kayıt Bulunmuyor</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}