import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Droplet, Flame, Check, Clock, Plus, ChevronLeft, ChevronRight, Settings, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatDateDisplay, getTodayStr,
  calculateDailyCalories, getMealsForDate,
  getNextMealSuggestion, shiftDate,
} from '../utils/helpers';
import type { DailyTask } from '../types';
import NutritionDashboard from './NutritionDashboard';

export interface HomeViewProps {
  onNavigate?: (tab: string) => void;
}

function getDefaultTasks(date: string): DailyTask[] {
  return [
    { id: `task-water-${date}`, text: '2 Litre su hedefini tamamla', done: false, pts: 50, date },
    { id: `task-sugar-${date}`, text: 'Şeker ilaveli içecek tüketme', done: false, pts: 100, date },
    { id: `task-steps-${date}`, text: 'En az 5000 adım at', done: false, pts: 50, date },
  ];
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const { state, dispatch, showToast } = useApp();
  const { meals, waterLog, userProfile, dailyTasks, workouts, stepsLog } = state;
  const today = getTodayStr();
  const currentHour = new Date().getHours();

  // Gösterilen tarih (< > ile değiştirilebilir)
  const [displayDate, setDisplayDate] = React.useState<string>(today);

  const displayMeals = getMealsForDate(meals, displayDate);
  const consumedCalories = calculateDailyCalories(meals, displayDate);
  const todayWorkouts = workouts.filter(w => w.date === displayDate);
  const todaySteps = stepsLog.find(s => s.date === displayDate)?.count || 0;
  const burnedCalories = todayWorkouts.reduce((sum, w) => sum + w.calories, 0) + Math.floor(todaySteps * 0.04);

  const nextMeal = getNextMealSuggestion(currentHour, meals, displayDate);

  // Günlük görevler
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

  const [slideDir, setSlideDir] = React.useState<1 | -1>(1);

  const handlePrevDay = () => {
    setSlideDir(-1);
    setDisplayDate(prev => shiftDate(prev, -1));
  };
  const handleNextDay = () => {
    setSlideDir(1);
    setDisplayDate(prev => shiftDate(prev, 1));
  };

  // Tarih metni (fotoğraftaki gibi: BUGÜN, 10 OCAK)
  const isToday = displayDate === today;
  const dateLabel = isToday
    ? `BUGÜN, ${new Date(displayDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toUpperCase()}`
    : new Date(displayDate + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } } };

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden" style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f5 100%)' }}>

      {/* HEADER: Logo sol, ikonlar sağ */}
      <header className="px-5 pt-4 pb-2 shrink-0 flex justify-between items-center">
        <img
          src="/logo.png"
          alt="Fitlune"
          className="h-6 w-auto object-contain object-left"
          style={{ maxWidth: '110px' }}
        />
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onNavigate && onNavigate('profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#15224a]/60 hover:text-[#15224a] hover:bg-white/50 transition-colors"
          >
            <User size={20} strokeWidth={1.8} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onNavigate && onNavigate('profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#15224a]/60 hover:text-[#15224a] hover:bg-white/50 transition-colors"
          >
            <Settings size={20} strokeWidth={1.8} />
          </motion.button>
        </div>
      </header>

      {/* ANA DASHBOARD */}
      <div className="px-5 pb-2 overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDir}>
          <motion.div
            key={displayDate}
            custom={slideDir}
            initial={{ opacity: 0, x: slideDir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -40 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <NutritionDashboard
              remainingCalories={Math.max(0, userProfile.dailyCalorieGoal - consumedCalories + burnedCalories)}
              totalCalories={userProfile.dailyCalorieGoal}
              eatenCalories={consumedCalories}
              burnedCalories={burnedCalories}
              consumedProtein={displayMeals.reduce((acc, m) => acc + (m.protein || 0), 0)}
              totalProteinGoal={userProfile.dailyCalorieGoal * 0.3 / 4}
              consumedCarbs={displayMeals.reduce((acc, m) => acc + (m.carbs || 0), 0)}
              totalCarbsGoal={userProfile.dailyCalorieGoal * 0.5 / 4}
              consumedFat={displayMeals.reduce((acc, m) => acc + (m.fat || 0), 0)}
              totalFatGoal={userProfile.dailyCalorieGoal * 0.2 / 9}
              displayDate={dateLabel}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alt İçerikler (scroll edilebilir) */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-5 pb-28 flex flex-col gap-4 overflow-y-auto"
        style={{ background: 'transparent' }}
      >
        {/* KONSEPT 1: SIRADAKİ ÖĞÜN & GÜNLÜK GÖREVLER (ARALIKLARI DARALTILMIŞ) */}
        <div className="flex flex-col gap-2">
          {/* SIRADAKİ ÖĞÜN */}
          <motion.div
            variants={item}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-3xl p-4 shadow-sm border border-white/60 bg-white/70 backdrop-blur-md group cursor-pointer"
          >
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-14 h-14 bg-white/80 rounded-xl flex items-center justify-center text-3xl shadow-sm border border-zinc-200/50"
              >
                {nextMeal.emoji}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-emerald-500" />
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Sıradaki Öğün</span>
                </div>
                <h3 className="font-bold text-[#15224a] leading-tight text-[15px]">{nextMeal.mealType}</h3>
                <p className="text-xs text-zinc-500 font-medium line-clamp-1 mt-0.5">
                  {nextMeal.suggestedCal > 0
                    ? `Öneri: ${nextMeal.suggestion} (${nextMeal.suggestedCal} kcal)`
                    : nextMeal.suggestion}
                </p>
              </div>
              {nextMeal.suggestedCal > 0 && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation(); // Kart tıklamasını tekilleştir
                    // Temsili yemek ekleme payload'ı, detaylı ekleme modal'ına bağlayabiliriz,
                    // Şimdilik hızlı bir öğün eklendiğini bildirelim:
                    dispatch({
                      type: 'ADD_MEAL',
                      payload: {
                        id: Date.now().toString(),
                        mealType: nextMeal.mealType,
                        name: nextMeal.suggestion,
                        calories: nextMeal.suggestedCal,
                        protein: Math.round(nextMeal.suggestedCal * 0.2 / 4), // tahmini protein
                        carbs: Math.round(nextMeal.suggestedCal * 0.5 / 4),
                        fat: Math.round(nextMeal.suggestedCal * 0.3 / 9),
                        date: displayDate,
                        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                      }
                    });
                    showToast(`${nextMeal.mealType} eklendi! ✨`, 'success');
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl border-2 border-emerald-500 text-emerald-500 bg-white flex items-center justify-center hover:bg-emerald-50 transition-colors"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* GÜNLÜK GÖREVLER */}
          <motion.div variants={item} className="bg-white/70 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#15224a] flex items-center gap-2">
                <span>🎯</span> Günlük Görevler
              </h3>
              <span className="text-[10px] font-bold text-[#15224a]/40 bg-[#15224a]/5 px-2 py-0.5 rounded-lg">
                {todayTasks.filter(t => t.done).length}/{todayTasks.length}
              </span>
            </div>
            <div className="flex flex-col divide-y divide-zinc-100">
              {todayTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center gap-3 group cursor-pointer py-3 transition-colors hover:bg-white/40 -mx-2 px-2 rounded-xl"
                >
                  <motion.div
                    animate={{ scale: task.done ? [1, 1.25, 1] : 1 }}
                    transition={{ duration: 0.35, type: 'spring' }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${task.done ? 'bg-emerald-500 text-white' : 'border-2 border-zinc-200 group-hover:border-emerald-300'}`}
                  >
                    {task.done && <Check size={12} strokeWidth={3} />}
                  </motion.div>
                  <span className={`text-[13px] font-semibold flex-1 transition-all leading-tight ${task.done ? 'text-zinc-400 line-through' : 'text-[#15224a]/80 group-hover:text-[#15224a]'}`}>
                    {task.text}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${task.done ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {task.done ? '✓' : `+${task.pts} pt`}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* SU TAKİBİ */}
        {(() => {
          const waterAmount = waterLog.find(w => w.date === displayDate)?.amount || 0;
          const waterGoal = userProfile.dailyWaterGoal;
          const waterPct = Math.min((waterAmount / waterGoal) * 100, 100);
          const isGoalReached = waterAmount >= waterGoal;
          return (
            <motion.div
              variants={item}
              className="rounded-3xl p-5 shadow-md text-white relative overflow-hidden"
              style={{ background: isGoalReached
                ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)'
              }}
            >
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Droplet size={140} className="fill-current text-white" />
              </div>
              <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Droplet size={16} className="text-white fill-current" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-[15px] leading-tight">Su Takibi</h3>
                      <p className="text-[10px] text-white/60 font-medium mt-0.5">
                        {isGoalReached ? 'Hedefe ulaşıldı! 🎉' : 'Günlük hedefinize devam edin'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{waterAmount.toFixed(1)}</span>
                    <span className="text-sm font-bold text-white/60 ml-1">/ {waterGoal.toFixed(1)} L</span>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${waterPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-white/80 rounded-full"
                  />
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAddWater(0.25)} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white border border-white/10">
                    <Plus size={14} /> <span className="text-xs font-bold">250ml</span>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAddWater(0.5)} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white border border-white/10">
                    <Plus size={14} /> <span className="text-xs font-bold">500ml</span>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAddWater(1.5)} className="flex-1 bg-white/30 hover:bg-white/40 backdrop-blur-sm transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white border border-white/20">
                    <Plus size={14} /> <span className="text-xs font-bold">1.5L</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </motion.div>
    </div>
  );
}