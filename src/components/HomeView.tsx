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
        className="flex-1 px-5 pb-28 space-y-4 overflow-y-auto"
        style={{ background: 'transparent' }}
      >
        {/* SIRADAKİ ÖĞÜN */}
        <motion.div
          variants={item}
          className="bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-sm border border-white/60 flex items-center pr-5 group cursor-pointer hover:border-white transition-colors"
        >
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-95 transition-transform">
            {nextMeal.emoji}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Clock size={11} className="text-amber-500" />
              <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Sıradaki Öğün</span>
            </div>
            <h3 className="font-bold text-[#15224a] leading-none mb-0.5 text-[14px]">{nextMeal.mealType}</h3>
            <p className="text-xs text-[#15224a]/50 font-medium line-clamp-1">
              {nextMeal.suggestedCal > 0
                ? `AI Önerisi: ${nextMeal.suggestion} (${nextMeal.suggestedCal} kcal)`
                : nextMeal.suggestion}
            </p>
          </div>
          {nextMeal.suggestedCal > 0 && (
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Plus size={18} />
            </div>
          )}
        </motion.div>

        {/* GÜNLÜK GÖREVLER */}
        <motion.div variants={item} className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/60">
          <h3 className="text-sm font-bold text-[#15224a] mb-4 flex items-center gap-2">
            <span>🎯</span> Günlük Görevler
          </h3>
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} onClick={() => handleToggleTask(task.id)} className="flex items-center gap-3 group cursor-pointer">
                <motion.div
                  animate={{ scale: task.done ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200'}`}
                >
                  {task.done && <Check size={13} strokeWidth={3} />}
                </motion.div>
                <span className={`text-sm font-medium flex-1 transition-all ${task.done ? 'text-zinc-400 line-through' : 'text-[#15224a]/80 group-hover:text-[#15224a]'}`}>
                  {task.text}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${task.done ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-600'}`}>
                  {task.done ? '✓' : `+${task.pts}`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SU TAKİBİ */}
        <motion.div variants={item} className="bg-blue-500 rounded-3xl p-5 shadow-sm text-white relative overflow-hidden flex flex-col justify-between min-h-[130px]">
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Droplet size={120} className="fill-current text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Droplet size={15} className="text-white fill-current" />
                </div>
                <h3 className="font-bold text-white">Su Takibi</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">{waterLog.find(w => w.date === displayDate)?.amount?.toFixed(1) || '0.0'}</span>
                <span className="text-sm font-bold text-blue-100 ml-1">/ {userProfile.dailyWaterGoal.toFixed(1)} L</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAddWater(0.25)} className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white">
                <Plus size={15} /> <span className="text-xs font-bold">250ml</span>
              </button>
              <button onClick={() => handleAddWater(0.5)} className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-white">
                <Plus size={15} /> <span className="text-xs font-bold">500ml</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}