import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, ChevronRight, HeartPulse, Bell, Shield, LogOut, Target, Flame, X, ChevronLeft, Activity, Droplet, Award, Check, Camera, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateTDEE, calculateWaterRecommendation, calculateMacroGoals } from '../utils/helpers';
import { clearState } from '../utils/storage';

// ==================== Alt Sayfalar ====================

// Profil Ayarları Sayfası
function ProfileSettingsPage({ onBack, key }: { onBack: () => void; key?: string }) {
    const { state, dispatch, showToast } = useApp();
    const { userProfile } = state;

    const [name, setName] = useState(userProfile.name);
    const [email, setEmail] = useState(userProfile.email);

    const handleSave = () => {
        if (!name.trim() || !email.trim()) {
            showToast('Lütfen tüm alanları doldurun', 'error');
            return;
        }
        dispatch({
            type: 'UPDATE_PROFILE',
            payload: { name, email }
        });
        showToast('Profil bilgileri güncellendi!', 'success');
        onBack();
    };

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-28 absolute inset-0 z-50 overflow-hidden transition-colors"
        >
            <header className="px-6 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 sticky top-0 z-10 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Profil Ayarları</h1>
                </div>
            </header>

            <div className="px-6 pt-6 space-y-6 overflow-y-auto pb-10 flex-1">

                {/* Profil Fotoğrafı Güncelleme */}
                <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-zinc-50 dark:border-zinc-800 overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-md">
                            <img src="https://picsum.photos/seed/avatar2/150/150" alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-900 dark:bg-[#3A4354] border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-sm hover:bg-zinc-800 dark:hover:bg-[#1E2532] transition-colors">
                            <Camera size={14} className="text-white" />
                        </button>
                    </div>
                    <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Fotoğrafı Değiştir</p>
                </div>

                {/* Kişisel Bilgiler */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-5 transition-colors">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">Ad Soyad</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            type="text"
                            placeholder="Adınız Soyadınız"
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">E-Posta Adresi</label>
                        <input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type="email"
                            placeholder="ornek@email.com"
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-colors"
                        />
                    </div>
                </div>

                {/* Üyelik Bilgileri */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">Üyelik Bilgileri</h3>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-100/50 dark:border-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                                <Award size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Fitlune Pro</h4>
                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Aktif Üyelik</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold text-zinc-900 dark:text-white">Yenilenme</span>
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">12 Mayıs 2026</span>
                        </div>
                    </div>
                </div>

                <button onClick={handleSave}
                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-base shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2">
                    <Check size={20} /> Değişiklikleri Kaydet
                </button>
            </div>
        </motion.div>
    );
}

// Sağlık Bilgileri Sayfası
function HealthInfoPage({ onBack, key }: { onBack: () => void; key?: string }) {
    const { state, dispatch, showToast } = useApp();
    const { userProfile } = state;

    const [weight, setWeight] = useState(String(userProfile.weight));
    const [height, setHeight] = useState(String(userProfile.height));
    const [age, setAge] = useState(String(userProfile.age));
    const [gender, setGender] = useState(userProfile.gender);
    const [activityLevel, setActivityLevel] = useState(userProfile.activityLevel);
    const [goal, setGoal] = useState(userProfile.goal || 'maintain');

    const activityLabels: Record<string, string> = {
        sedentary: 'Masa Başı / Hareketsiz',
        light: 'Hafif Egzersiz (1-3 gün/hafta)',
        moderate: 'Orta Egzersiz (3-5 gün/hafta)',
        active: 'Ağır Egzersiz (6-7 gün/hafta)',
        very_active: 'Çok Ağır Egzersiz / Fiziksel İş',
    };

    const goalLabels: Record<string, string> = {
        lose: 'Kilo Verme',
        maintain: 'Kilo Koruma',
        gain: 'Kilo Alma',
    };

    const handleSave = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseInt(age);
        if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) {
            showToast('Lütfen geçerli bilgiler girin', 'error');
            return;
        }

        const updatedProfile = {
            weight: w,
            height: h,
            age: a,
            gender: gender as 'male' | 'female' | 'other',
            activityLevel: activityLevel as any,
            goal: goal as any,
        };

        // TDEE ve su önerisini yeniden hesapla
        const newProfile = { ...userProfile, ...updatedProfile };
        const tdee = calculateTDEE(newProfile);
        const waterGoal = calculateWaterRecommendation(w);

        dispatch({
            type: 'UPDATE_PROFILE',
            payload: {
                ...updatedProfile,
                dailyCalorieGoal: tdee,
                dailyWaterGoal: waterGoal,
            },
        });

        showToast(`Profil güncellendi! Kalori hedefi: ${tdee} kcal`, 'success');
        onBack();
    };

    // Anlık hesaplamalar (kullanıcı değerleri değiştirirken görmek için)
    const tempProfile = {
        ...userProfile,
        weight: parseFloat(weight) || userProfile.weight,
        height: parseFloat(height) || userProfile.height,
        age: parseInt(age) || userProfile.age,
        gender: gender as any,
        activityLevel: activityLevel as any,
        goal: goal as any,
    };
    const tempTDEE = calculateTDEE(tempProfile);
    const tempMacros = calculateMacroGoals(tempTDEE, tempProfile);

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-28 absolute inset-0 z-50 overflow-hidden transition-colors"
        >
            <header className="px-6 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 sticky top-0 z-10 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Sağlık Bilgileri</h1>
                </div>
            </header>

            <div className="px-6 pt-6 space-y-6 overflow-y-auto pb-10 flex-1">

                {/* AI Destekli Hesaplama Sonucu (Canlı) */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">✨</span>
                            <h3 className="font-bold text-lg tracking-tight">Günlük İhtiyacınız</h3>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-black">{tempTDEE}</span>
                            <span className="text-sm font-medium text-emerald-100">kcal / gün</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center">
                                <span className="block text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Protein</span>
                                <span className="block text-lg font-black">{tempMacros.protein}g</span>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center">
                                <span className="block text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Karbonhidrat</span>
                                <span className="block text-lg font-black">{tempMacros.carbs}g</span>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center">
                                <span className="block text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Yağ</span>
                                <span className="block text-lg font-black">{tempMacros.fat}g</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-5 transition-colors">
                    {/* Temel Bilgiler Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">Kilo (kg)</label>
                            <input value={weight} onChange={e => setWeight(e.target.value)} type="number" step="0.1"
                                className="w-full px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3A4354] dark:focus:ring-zinc-400 text-center transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">Boy (cm)</label>
                            <input value={height} onChange={e => setHeight(e.target.value)} type="number"
                                className="w-full px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3A4354] dark:focus:ring-zinc-400 text-center transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block uppercase tracking-wider">Yaş</label>
                            <input value={age} onChange={e => setAge(e.target.value)} type="number"
                                className="w-full px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3A4354] dark:focus:ring-zinc-400 text-center transition-colors" />
                        </div>
                    </div>

                    {/* Cinsiyet */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 block uppercase tracking-wider">Cinsiyet</label>
                        <div className="flex gap-2">
                            {(['male', 'female'] as const).map(g => (
                                <button key={g} onClick={() => setGender(g)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${gender === g ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                    {g === 'male' ? 'Erkek' : 'Kadın'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amacınız */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 block uppercase tracking-wider">Amacınız</label>
                        <div className="flex flex-col gap-2">
                            {Object.entries(goalLabels).map(([key, label]) => (
                                <button key={key} onClick={() => setGoal(key as any)}
                                    className={`py-3 px-4 rounded-xl text-sm font-bold text-left transition-all flex justify-between items-center ${goal === key ? 'bg-[#3A4354]/10 dark:bg-zinc-800 border-[#3A4354] dark:border-zinc-400 text-[#3A4354] dark:text-white border-2' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 border hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>
                                    {label}
                                    {goal === key && <Check size={16} className="text-[#3A4354] dark:text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Aktivite Seviyesi */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 block uppercase tracking-wider">Aktivite Seviyesi</label>
                        <div className="flex flex-col gap-2">
                            {Object.entries(activityLabels).map(([key, label]) => (
                                <button key={key} onClick={() => setActivityLevel(key as any)}
                                    className={`py-3 px-4 rounded-xl text-sm font-bold text-left transition-all flex justify-between items-center ${activityLevel === key ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-400 border-2' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 border hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>
                                    {label}
                                    {activityLevel === key && <Check size={16} className="text-blue-500 dark:text-blue-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={handleSave}
                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-base shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2">
                    <Check size={20} /> Bilgileri Kaydet
                </button>

                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center px-4 pb-8">
                    Hesaplamalar Mifflin-St Jeor formülü kullanılarak yapılmaktadır.
                </p>
            </div>
        </motion.div>
    );
}

// Bildirim Ayarları Sayfası
function NotificationsPage({ onBack, key }: { onBack: () => void; key?: string }) {
    const { state, dispatch, showToast } = useApp();
    const { appSettings } = state;

    const toggleSetting = (key: keyof typeof appSettings) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: !appSettings[key] } });
        showToast('Ayar güncellendi', 'success');
    };

    const ToggleRow = ({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) => (
        <div className="flex items-center justify-between py-4 border-b border-zinc-50 dark:border-zinc-800 last:border-0 relative w-full bg-white dark:bg-zinc-900 z-10 pl-0">
            <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm truncate">{label}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{desc}</p>
            </div>
            <button onClick={onToggle}
                className={`w-12 h-7 rounded-full flex items-center shrink-0 transition-colors ${value ? 'bg-[#3A4354]' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                <motion.div
                    animate={{ x: value ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
            </button>
        </div>
    );

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-28 absolute inset-0 z-50 transition-colors"
        >
            <header className="px-6 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Bildirimler</h1>
                </div>
            </header>
            <div className="px-6 pt-6">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors relative z-0">
                    <ToggleRow label="Bildirimler" desc="Tüm bildirimleri aç/kapat" value={appSettings.notificationsEnabled} onToggle={() => toggleSetting('notificationsEnabled')} />
                    <ToggleRow label="Su Hatırlatıcısı" desc="Düzenli su içme hatırlatması" value={appSettings.waterReminder} onToggle={() => toggleSetting('waterReminder')} />
                    <ToggleRow label="Öğün Hatırlatıcısı" desc="Öğün kaydetme hatırlatması" value={appSettings.mealReminder} onToggle={() => toggleSetting('mealReminder')} />
                </div>
            </div>
        </motion.div>
    );
}

// Görünüm (Tema) Sayfası
function ThemePage({ onBack, key }: { onBack: () => void; key?: string }) {
    const { state, dispatch, showToast } = useApp();
    const { appSettings } = state;
    const isDark = appSettings.darkMode;

    const setDark = (val: boolean) => {
        if (val === isDark) return;
        dispatch({ type: 'UPDATE_SETTINGS', payload: { darkMode: val } });
        showToast(val ? '🌙 Karanlık mod açıldı' : '☀️ Aydınlık mod açıldı', 'success');
    };

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-28 absolute inset-0 z-50 transition-colors"
        >
            <header className="px-6 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Görünüm</h1>
                </div>
            </header>

            <div className="px-5 pt-6 space-y-4">
                {/* Açıklama */}
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Uygulamanın renk temasını seçin. Değişiklik anında uygulanır.</p>

                {/* Kart Seçenekleri */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Aydınlık Mod Kartı */}
                    <button
                        onClick={() => setDark(false)}
                        className={`relative flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${!isDark
                                ? 'border-zinc-900 bg-white shadow-lg scale-[1.02]'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 opacity-60'
                            }`}
                    >
                        {!isDark && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center">
                                <Check size={11} className="text-white" strokeWidth={3} />
                            </div>
                        )}
                        {/* Önizleme */}
                        <div className="w-full h-16 rounded-2xl bg-zinc-50 border border-zinc-100 overflow-hidden flex flex-col p-2 gap-1.5">
                            <div className="h-2 w-12 bg-zinc-300 rounded-full" />
                            <div className="h-1.5 w-8 bg-zinc-200 rounded-full" />
                            <div className="mt-auto flex gap-1">
                                <div className="h-5 flex-1 bg-zinc-100 rounded-lg" />
                                <div className="h-5 flex-1 bg-emerald-100 rounded-lg" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sun size={16} className="text-amber-500" />
                            <span className="text-sm font-bold text-zinc-900">Aydınlık</span>
                        </div>
                    </button>

                    {/* Karanlık Mod Kartı */}
                    <button
                        onClick={() => setDark(true)}
                        className={`relative flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${isDark
                                ? 'border-zinc-100 bg-zinc-900 shadow-lg shadow-zinc-900/30 scale-[1.02]'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-900 opacity-60'
                            }`}
                    >
                        {isDark && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                <Check size={11} className="text-zinc-900" strokeWidth={3} />
                            </div>
                        )}
                        {/* Önizleme */}
                        <div className="w-full h-16 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex flex-col p-2 gap-1.5">
                            <div className="h-2 w-12 bg-zinc-600 rounded-full" />
                            <div className="h-1.5 w-8 bg-zinc-700 rounded-full" />
                            <div className="mt-auto flex gap-1">
                                <div className="h-5 flex-1 bg-zinc-700 rounded-lg" />
                                <div className="h-5 flex-1 bg-emerald-900/50 rounded-lg" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Moon size={16} className="text-blue-400" />
                            <span className="text-sm font-bold text-white">Karanlık</span>
                        </div>
                    </button>
                </div>

                {/* Büyük Toggle Barı */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-800 text-blue-400' : 'bg-amber-50 text-amber-500'}`}>
                            {isDark ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <div>
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">{isDark ? 'Karanlık Mod Açık' : 'Aydınlık Mod Açık'}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Dokunarak değiştir</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDark(!isDark)}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}
                    >
                        <motion.div
                            animate={{ x: isDark ? 28 : 3 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`absolute top-1 w-5 h-5 rounded-full shadow-sm transition-colors ${isDark ? 'bg-blue-400' : 'bg-white'}`}
                        />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Gizlilik Sayfası (Placeholder)
function PrivacyPage({ onBack, key }: { onBack: () => void; key?: string }) {
    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-28 absolute inset-0 z-50 transition-colors"
        >
            <header className="px-6 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Gizlilik</h1>
                </div>
            </header>
            <div className="px-6 pt-6">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center py-12 transition-colors">
                    <div className="text-4xl mb-4">🔒</div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base mb-2">Yakında</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">Gizlilik ayarları ve veri yönetimi özellikleri yakında eklenecektir.</p>
                </div>
            </div>
        </motion.div>
    );
}

// ==================== MenuItem ====================
const MenuItem = ({ icon: Icon, color, bg, darkBg, darkColor, title, desc, onClick }: any) => (
    <button onClick={onClick} className="w-full p-4 border-b border-zinc-50 dark:border-zinc-800/50 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors last:border-0 group">
        <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl ${bg} ${darkBg} flex items-center justify-center ${color} ${darkColor} group-hover:scale-105 transition-transform`}>
                <Icon size={22} strokeWidth={2.5} />
            </div>
            <div className="text-left">
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{title}</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{desc}</p>
            </div>
        </div>
        <ChevronRight size={20} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
    </button>
);

// ==================== ProfileView ====================
export default function ProfileView() {
    const { state, dispatch, showToast } = useApp();
    const { userProfile } = state;
    const [subPage, setSubPage] = useState<'main' | 'health' | 'notifications' | 'privacy' | 'profileSettings' | 'theme'>('main');
    const [logoutConfirm, setLogoutConfirm] = useState(false);
    const [editingWeight, setEditingWeight] = useState(false);
    const [tempWeight, setTempWeight] = useState(String(userProfile.weight));

    const handleLogout = () => {
        clearState();
        dispatch({ type: 'RESET_APP' });
        showToast('Çıkış yapıldı, veriler sıfırlandı', 'info');
        setLogoutConfirm(false);
    };

    const handleWeightSave = () => {
        const w = parseFloat(tempWeight);
        if (isNaN(w) || w <= 0) {
            showToast('Geçerli bir kilo girin', 'error');
            return;
        }
        dispatch({ type: 'UPDATE_PROFILE', payload: { weight: w } });
        showToast('Kilo güncellendi', 'success');
        setEditingWeight(false);
    };

    return (
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen pb-24 relative overflow-hidden transition-colors">
            {/* Alt Sayfalar */}
            <AnimatePresence>
                {subPage === 'profileSettings' && <ProfileSettingsPage key="profileSettings" onBack={() => setSubPage('main')} />}
                {subPage === 'health' && <HealthInfoPage key="health" onBack={() => setSubPage('main')} />}
                {subPage === 'notifications' && <NotificationsPage key="notifications" onBack={() => setSubPage('main')} />}
                {subPage === 'privacy' && <PrivacyPage key="privacy" onBack={() => setSubPage('main')} />}
                {subPage === 'theme' && <ThemePage key="theme" onBack={() => setSubPage('main')} />}
            </AnimatePresence>

            {/* Header / Cover */}
            <div className="relative pt-12 pb-8 px-6 bg-white dark:bg-[#1E2532] shrink-0 rounded-b-[2.5rem] shadow-sm z-10 transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Profil</h1>
                    <button
                        onClick={() => setSubPage('profileSettings')}
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-white dark:border-[#3A4354] overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-lg shadow-zinc-200/50 dark:shadow-none transition-colors">
                            <img src="https://picsum.photos/seed/avatar2/150/150" alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#3A4354] dark:bg-emerald-500 border-2 border-white dark:border-[#1E2532] rounded-full flex items-center justify-center transition-colors">
                            <Check size={12} className="text-white" strokeWidth={3} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{userProfile.name}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs mb-2">{userProfile.email}</p>
                        {userProfile.isPro && (
                            <div className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg text-[10px] font-bold shadow-sm uppercase tracking-wider">
                                ✨ Pro Üye
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-5 pt-6 space-y-5">
                {/* Bento Grid Stats */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Weight Card */}
                    <div
                        onClick={() => { setTempWeight(String(userProfile.weight)); setEditingWeight(true); }}
                        className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-[#3A4354]/50 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between relative overflow-hidden group"
                    >
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4 relative z-10 transition-colors">
                            <Target size={20} />
                        </div>
                        <div className="relative z-10">
                            {editingWeight ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        value={tempWeight}
                                        onChange={e => setTempWeight(e.target.value)}
                                        type="number"
                                        step="0.1"
                                        autoFocus
                                        className="w-16 text-2xl font-black text-zinc-900 dark:text-white bg-transparent border-b-2 border-[#3A4354] dark:border-zinc-500 focus:outline-none"
                                        onBlur={handleWeightSave}
                                        onKeyDown={e => e.key === 'Enter' && handleWeightSave()}
                                    />
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">kg</span>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-zinc-900 dark:text-white">{userProfile.weight}</span>
                                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">kg</span>
                                </div>
                            )}
                            <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Güncel Kilo</div>
                        </div>
                    </div>

                    {/* Calorie Goal Card */}
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between relative overflow-hidden group transition-colors">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 relative z-10 transition-colors">
                            <Flame size={20} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-zinc-900 dark:text-white">{userProfile.dailyCalorieGoal}</span>
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">kcal</span>
                            </div>
                            <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Günlük Hedef</div>
                        </div>
                    </div>
                </div>

                {/* Streak Card */}
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-[#3A4354] dark:to-[#1E2532] rounded-3xl p-5 shadow-md flex items-center justify-between text-white relative overflow-hidden transition-colors">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                            <Award size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">14 Günlük Seri!</h3>
                            <p className="text-xs text-zinc-400 dark:text-zinc-300 font-medium">Harika gidiyorsun, bozma!</p>
                        </div>
                    </div>
                </div>

                {/* Menu List */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-colors">
                    <MenuItem icon={Moon} color="text-[#3A4354]" bg="bg-[#3A4354]/10" darkColor="dark:text-white" darkBg="dark:bg-[#3A4354]" title="Görünüm" desc="Karanlık Mod Özelleştirmesi" onClick={() => setSubPage('theme')} />
                    <MenuItem icon={HeartPulse} color="text-rose-500" bg="bg-rose-50" darkColor="dark:text-rose-400" darkBg="dark:bg-rose-500/10" title="Sağlık Bilgileri" desc="Boy, kilo, yaş ve hedefler" onClick={() => setSubPage('health')} />
                    <MenuItem icon={Bell} color="text-blue-500" bg="bg-blue-50" darkColor="dark:text-blue-400" darkBg="dark:bg-blue-500/10" title="Bildirimler" desc="Hatırlatıcılar ve uyarılar" onClick={() => setSubPage('notifications')} />
                    <MenuItem icon={Shield} color="text-emerald-500" bg="bg-emerald-50" darkColor="dark:text-emerald-400" darkBg="dark:bg-emerald-500/10" title="Gizlilik" desc="Şifre ve veri yönetimi" onClick={() => setSubPage('privacy')} />
                </div>

                {/* Çıkış Yap */}
                {logoutConfirm ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-red-100 dark:border-red-900/30 space-y-3 transition-colors">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">Verileriniz silinecektir. Çıkış yapmak istediğinize emin misiniz?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setLogoutConfirm(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-sm transition-colors">
                                İptal
                            </button>
                            <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-md shadow-red-500/20">
                                Evet, Çıkış Yap
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setLogoutConfirm(true)}
                        className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2 text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Çıkış Yap</span>
                    </button>
                )}
            </div>
        </div>
    );
}